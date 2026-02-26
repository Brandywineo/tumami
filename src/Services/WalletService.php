<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

class WalletService
{
    public function __construct(private PDO $pdo)
    {
    }

    public function recordClientDeposit(int $clientId, int $taskId, float $amount): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, :task_id, "debit", "deposit", :amount, "completed", :reference)');
        $stmt->execute([
            'user_id' => $clientId,
            'task_id' => $taskId,
            'amount' => $amount,
            'reference' => 'TASK_FEE_LOCK',
        ]);
    }

    public function releaseCompletion(int $runnerId, int $taskId, float $runnerFee): void
    {
        $commission = round($runnerFee * 0.10, 2);
        $runnerEarning = round($runnerFee - $commission, 2);

        $this->pdo->beginTransaction();
        try {
            $runnerStmt = $this->pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, :task_id, "credit", "task_earning", :amount, "completed", :reference)');
            $runnerStmt->execute([
                'user_id' => $runnerId,
                'task_id' => $taskId,
                'amount' => $runnerEarning,
                'reference' => 'TASK_COMPLETION',
            ]);

            $platformStmt = $this->pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (1, :task_id, "credit", "commission", :amount, "completed", :reference)');
            $platformStmt->execute([
                'task_id' => $taskId,
                'amount' => $commission,
                'reference' => 'PLATFORM_COMMISSION',
            ]);

            $this->pdo->commit();
        } catch (\Throwable $e) {
            $this->pdo->rollBack();
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
