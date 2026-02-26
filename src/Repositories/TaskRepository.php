<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class TaskRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function create(array $data): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO tasks (client_id, zone_id, category, title, description, runner_fee, deadline, status) VALUES (:client_id, :zone_id, :category, :title, :description, :runner_fee, :deadline, "posted")');
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function browsePosted(?int $zoneId = null): array
    {
        if ($zoneId !== null) {
            $stmt = $this->pdo->prepare('SELECT t.*, u.full_name AS client_name, z.name AS zone_name FROM tasks t JOIN users u ON u.id = t.client_id JOIN zones z ON z.id = t.zone_id WHERE t.status = "posted" AND t.zone_id = :zone_id ORDER BY t.created_at DESC');
            $stmt->execute(['zone_id' => $zoneId]);
            return $stmt->fetchAll();
        }

        $stmt = $this->pdo->query('SELECT t.*, u.full_name AS client_name, z.name AS zone_name FROM tasks t JOIN users u ON u.id = t.client_id JOIN zones z ON z.id = t.zone_id WHERE t.status = "posted" ORDER BY t.created_at DESC');
        return $stmt->fetchAll();
    }

    public function byClient(int $clientId): array
    {
        $stmt = $this->pdo->prepare('SELECT t.*, z.name AS zone_name, ru.full_name AS runner_name FROM tasks t JOIN zones z ON z.id = t.zone_id LEFT JOIN users ru ON ru.id = t.runner_id WHERE t.client_id = :client_id ORDER BY t.created_at DESC');
        $stmt->execute(['client_id' => $clientId]);

        return $stmt->fetchAll();
    }

    public function byRunner(int $runnerId): array
    {
        $stmt = $this->pdo->prepare('SELECT t.*, z.name AS zone_name, cu.full_name AS client_name FROM tasks t JOIN zones z ON z.id = t.zone_id JOIN users cu ON cu.id = t.client_id WHERE t.runner_id = :runner_id ORDER BY t.updated_at DESC, t.created_at DESC');
        $stmt->execute(['runner_id' => $runnerId]);

        return $stmt->fetchAll();
    }

    public function findById(int $taskId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM tasks WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $taskId]);
        $task = $stmt->fetch();
        return $task ?: null;
    }

    public function accept(int $taskId, int $runnerId): bool
    {
        $stmt = $this->pdo->prepare('UPDATE tasks SET runner_id = :runner_id, status = "accepted", accepted_at = NOW() WHERE id = :id AND status = "posted"');
        $stmt->execute(['runner_id' => $runnerId, 'id' => $taskId]);
        return $stmt->rowCount() > 0;
    }

    public function setStatus(int $taskId, string $status, int $actorId): bool
    {
        $allowed = ['in_progress', 'awaiting_confirmation', 'completed', 'cancelled', 'disputed'];
        if (!in_array($status, $allowed, true)) {
            return false;
        }

        $task = $this->findById($taskId);
        if (!$task) {
            return false;
        }

        $setExtra = '';
        if ($status === 'in_progress') {
            $setExtra = ', started_at = NOW()';
        } elseif ($status === 'awaiting_confirmation') {
            $setExtra = ', completion_requested_at = NOW()';
        } elseif ($status === 'cancelled') {
            $setExtra = ', cancelled_at = NOW(), cancelled_by = :actor_id';
        }

        $sql = 'UPDATE tasks SET status = :status' . $setExtra . ' WHERE id = :id';
        $stmt = $this->pdo->prepare($sql);
        $params = ['status' => $status, 'id' => $taskId];
        if ($status === 'cancelled') {
            $params['actor_id'] = $actorId;
        }
        $stmt->execute($params);

        $logStmt = $this->pdo->prepare('INSERT INTO task_status_logs (task_id, changed_by, old_status, new_status) VALUES (:task_id, :changed_by, :old_status, :new_status)');
        $logStmt->execute([
            'task_id' => $taskId,
            'changed_by' => $actorId,
            'old_status' => $task['status'],
            'new_status' => $status,
        ]);

        return true;
    }
}
