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

        $ownsTransaction = !$this->pdo->inTransaction();

        if ($ownsTransaction) {
            $this->pdo->beginTransaction();
        }

        try {
            $existingRunnerCreditStmt = $this->pdo->prepare('SELECT id FROM wallet_transactions WHERE task_id = :task_id AND user_id = :user_id AND type = "task_earning" AND direction = "credit" AND status = "completed" LIMIT 1');
            $existingRunnerCreditStmt->execute([
                'task_id' => $taskId,
                'user_id' => $runnerId,
            ]);
            if ($existingRunnerCreditStmt->fetch()) {
                if ($ownsTransaction) {
                    $this->pdo->commit();
                }
                return;
            }

            $runnerStmt = $this->pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, :task_id, "credit", "task_earning", :amount, "completed", :reference)');
            $runnerStmt->execute([
                'user_id' => $runnerId,
                'task_id' => $taskId,
                'amount' => $runnerEarning,
                'reference' => 'TASK_COMPLETION',
            ]);

            $existingPlatformCommissionStmt = $this->pdo->prepare('SELECT id FROM wallet_transactions WHERE task_id = :task_id AND user_id = 1 AND type = "commission" AND direction = "credit" AND status = "completed" LIMIT 1');
            $existingPlatformCommissionStmt->execute(['task_id' => $taskId]);
            if (!$existingPlatformCommissionStmt->fetch()) {
                $platformStmt = $this->pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (1, :task_id, "credit", "commission", :amount, "completed", :reference)');
                $platformStmt->execute([
                    'task_id' => $taskId,
                    'amount' => $commission,
                    'reference' => 'PLATFORM_COMMISSION',
                ]);
            }

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
            COALESCE(SUM(CASE WHEN direction = "debit" AND status = "completed" THEN amount ELSE 0 END), 0) AS total_debit,
            COALESCE(SUM(CASE WHEN direction = "debit" AND status = "pending" THEN amount ELSE 0 END), 0) AS pending_debit,
            COALESCE(SUM(CASE WHEN direction = "credit" AND status = "pending" THEN amount ELSE 0 END), 0) AS pending_credit
            FROM wallet_transactions WHERE user_id = :user_id');
        $stmt->execute(['user_id' => $userId]);
        $row = $stmt->fetch() ?: ['total_credit' => 0, 'total_debit' => 0, 'pending_debit' => 0, 'pending_credit' => 0];

        $available = (float) $row['total_credit'] - (float) $row['total_debit'];
        return [
            'total_credit' => (float) $row['total_credit'],
            'total_debit' => (float) $row['total_debit'],
            'pending_debit' => (float) $row['pending_debit'],
            'pending_credit' => (float) $row['pending_credit'],
            'available' => $available,
            'withdrawable' => max(0, $available - (float) $row['pending_debit']),
        ];
    }

    public function recordPendingTopup(int $userId, float $amount, string $reference): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, NULL, "credit", "deposit", :amount, "pending", :reference)');
        $stmt->execute([
            'user_id' => $userId,
            'amount' => $amount,
            'reference' => $reference,
        ]);
    }

    public function recordPendingWithdrawal(int $userId, float $amount, string $reference): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, NULL, "debit", "withdrawal", :amount, "pending", :reference)');
        $stmt->execute([
            'user_id' => $userId,
            'amount' => $amount,
            'reference' => $reference,
        ]);
    }

    public function recentTransactions(int $userId, int $limit = 20): array
    {
        $limit = max(1, min(100, $limit));
        $stmt = $this->pdo->prepare('SELECT id, direction, type, amount, status, reference, created_at FROM wallet_transactions WHERE user_id = :user_id ORDER BY created_at DESC, id DESC LIMIT ' . $limit);
        $stmt->execute(['user_id' => $userId]);
        return $stmt->fetchAll();
    }
}
