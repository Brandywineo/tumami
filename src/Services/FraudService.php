<?php

declare(strict_types=1);

namespace App\Services;

use PDO;

class FraudService
{
    public function __construct(private PDO $pdo)
    {
    }

    public function flag(int $userId, ?int $taskId, string $flagType, string $details): void
    {
        $stmt = $this->pdo->prepare('INSERT INTO anti_fraud_flags (user_id, task_id, flag_type, details) VALUES (:user_id, :task_id, :flag_type, :details)');
        $stmt->execute([
            'user_id' => $userId,
            'task_id' => $taskId,
            'flag_type' => $flagType,
            'details' => $details,
        ]);
    }

    public function evaluateRapidCompletion(array $task): void
    {
        if (empty($task['started_at'])) {
            return;
        }

        $seconds = time() - strtotime((string) $task['started_at']);
        if ($seconds <= 300) {
            $runnerId = (int) ($task['runner_id'] ?? 0);
            if ($runnerId > 0) {
                $this->flag($runnerId, (int) $task['id'], 'rapid_completion', 'Task completed in under 5 minutes.');
            }
        }
    }

    public function evaluateRepeatPairing(array $task): void
    {
        $clientId = (int) $task['client_id'];
        $runnerId = (int) ($task['runner_id'] ?? 0);

        if ($runnerId <= 0) {
            return;
        }

        $stmt = $this->pdo->prepare('SELECT COUNT(*) FROM tasks WHERE client_id = :client_id AND runner_id = :runner_id AND status = "completed"');
        $stmt->execute(['client_id' => $clientId, 'runner_id' => $runnerId]);
        $count = (int) $stmt->fetchColumn();

        if ($count >= 3) {
            $this->flag($clientId, (int) $task['id'], 'repeat_pairing', 'Client-runner pairing has 3+ completed tasks.');
            $this->flag($runnerId, (int) $task['id'], 'repeat_pairing', 'Client-runner pairing has 3+ completed tasks.');
        }
    }

    public function isNewAccount(int $userId, int $days = 7): bool
    {
        $stmt = $this->pdo->prepare('SELECT created_at FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $userId]);
        $createdAt = $stmt->fetchColumn();

        if (!$createdAt) {
            return true;
        }

        return (time() - strtotime((string) $createdAt)) < ($days * 86400);
    }
}
