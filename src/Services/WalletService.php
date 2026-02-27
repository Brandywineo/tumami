<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

class WalletService
{
    public function __construct(private PDO $pdo)
    {
    }

    public function recordEntry(
        int $userId,
        ?int $taskId,
        string $direction,
        string $type,
        float $amount,
        string $reference,
        string $status = 'completed'
    ): void {
        $stmt = $this->pdo->prepare(
            'INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, :task_id, :direction, :type, :amount, :status, :reference)'
        );
        $stmt->execute([
            'user_id' => $userId,
            'task_id' => $taskId,
            'direction' => $direction,
            'type' => $type,
            'amount' => round($amount, 2),
            'status' => $status,
            'reference' => $reference,
        ]);
    }

    public function recordClientDeposit(int $clientId, int $taskId, float $amount): void
    {
        $this->recordEntry($clientId, $taskId, 'debit', 'deposit', $amount, 'TASK_FEE_LOCK');
    }

    public function releaseCompletion(int $runnerId, int $taskId, float $runnerFee): void
    {
        $commission = round($runnerFee * 0.10, 2);
        $runnerEarning = round($runnerFee - $commission, 2);

        $ownsTransaction = !$this->pdo->inTransaction();

        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $this->recordEntry($runnerId, $taskId, 'credit', 'task_earning', $runnerEarning, 'TASK_COMPLETION');
            $this->recordEntry(1, $taskId, 'credit', 'commission', $commission, 'PLATFORM_COMMISSION');

            if ($ownsTransaction) {
                $this->pdo->commit();
            }
        } catch (\Throwable $e) {
            if ($ownsTransaction && $this->pdo->inTransaction()) {
                $this->pdo->rollBack();
            }
            throw $e;
        }
    }

    public function balances(int $userId): array
    {
        $stmt = $this->pdo->prepare('SELECT
            COALESCE(SUM(CASE WHEN direction = "credit" AND status = "completed" THEN amount ELSE 0 END), 0) AS total_credit,
            COALESCE(SUM(CASE WHEN direction = "debit" AND status = "completed" THEN amount ELSE 0 END), 0) AS total_debit
            FROM wallet_transactions WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch() ?: ['total_credit' => 0, 'total_debit' => 0];

        return [
            'total_credit' => (float) $row['total_credit'],
            'total_debit' => (float) $row['total_debit'],
            'available' => (float) $row['total_credit'] - (float) $row['total_debit'],
        ];
    }
}
