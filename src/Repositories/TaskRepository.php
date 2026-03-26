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
        $stmt = $this->pdo->prepare('INSERT INTO tasks (
            client_id,
            zone_id,
            client_zone_id,
            pickup_zone_id,
            dropoff_zone_id,
            category,
            title,
            description,
            pickup_address,
            dropoff_address,
            runner_fee,
            deadline,
            client_latitude,
            client_longitude,
            pickup_latitude,
            pickup_longitude,
            dropoff_latitude,
            dropoff_longitude,
            status
        ) VALUES (
            :client_id,
            :zone_id,
            :client_zone_id,
            :pickup_zone_id,
            :dropoff_zone_id,
            :category,
            :title,
            :description,
            :pickup_address,
            :dropoff_address,
            :runner_fee,
            :deadline,
            :client_latitude,
            :client_longitude,
            :pickup_latitude,
            :pickup_longitude,
            :dropoff_latitude,
            :dropoff_longitude,
            "posted"
        )');
        $stmt->execute($data);

        return (int) $this->pdo->lastInsertId();
    }

    public function browsePosted(?int $zoneId = null): array
    {
        if ($zoneId !== null) {
            $stmt = $this->pdo->prepare('SELECT t.*, u.full_name AS client_name, z.name AS zone_name, cz.name AS client_zone_name FROM tasks t JOIN users u ON u.id = t.client_id JOIN zones z ON z.id = t.zone_id LEFT JOIN zones cz ON cz.id = t.client_zone_id WHERE t.status = "posted" AND t.zone_id = :zone_id ORDER BY t.created_at DESC');
            $stmt->execute(['zone_id' => $zoneId]);
            return $stmt->fetchAll();
        }

        $stmt = $this->pdo->query('SELECT t.*, u.full_name AS client_name, z.name AS zone_name, cz.name AS client_zone_name FROM tasks t JOIN users u ON u.id = t.client_id JOIN zones z ON z.id = t.zone_id LEFT JOIN zones cz ON cz.id = t.client_zone_id WHERE t.status = "posted" ORDER BY t.created_at DESC');
        return $stmt->fetchAll();
    }

    public function browsePostedForRunner(int $runnerId, ?int $zoneId = null): array
    {
        $runnerStmt = $this->pdo->prepare('SELECT active_zone_id, accepts_adjacent_zones, is_available FROM runner_profiles WHERE user_id = :user_id LIMIT 1');
        $runnerStmt->execute(['user_id' => $runnerId]);
        $runner = $runnerStmt->fetch() ?: ['active_zone_id' => null, 'accepts_adjacent_zones' => 1, 'is_available' => 0];

        if ((int) ($runner['is_available'] ?? 0) !== 1) {
            return [];
        }

        $params = [];
        $where = 't.status = "posted"';
        if ($zoneId !== null) {
            $where .= ' AND t.zone_id = :zone_id';
            $params['zone_id'] = $zoneId;
        }

        $sql = 'SELECT
            t.*,
            u.full_name AS client_name,
            z.name AS zone_name,
            cz.name AS client_zone_name,
            CASE WHEN rp.active_zone_id IS NOT NULL AND t.zone_id = rp.active_zone_id THEN 1 ELSE 0 END AS is_runner_zone,
            CASE WHEN rp.active_zone_id IS NOT NULL AND pz.parent_id = rz.parent_id AND rp.accepts_adjacent_zones = 1 THEN 1 ELSE 0 END AS is_adjacent_zone
        FROM tasks t
        JOIN users u ON u.id = t.client_id
        JOIN zones z ON z.id = t.zone_id
        LEFT JOIN zones cz ON cz.id = t.client_zone_id
        LEFT JOIN runner_profiles rp ON rp.user_id = :runner_id
        LEFT JOIN zones pz ON pz.id = t.zone_id
        LEFT JOIN zones rz ON rz.id = rp.active_zone_id
        WHERE ' . $where . '
        ORDER BY is_runner_zone DESC, is_adjacent_zone DESC, t.created_at DESC';

        $params['runner_id'] = $runnerId;
        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }

    public function byClient(int $clientId): array
    {
        $stmt = $this->pdo->prepare('SELECT
            t.*,
            z.name AS zone_name,
            cz.name AS client_zone_name,
            ru.full_name AS runner_name
        FROM tasks t
        JOIN zones z ON z.id = t.zone_id
        LEFT JOIN zones cz ON cz.id = t.client_zone_id
        LEFT JOIN users ru ON ru.id = t.runner_id
        WHERE t.client_id = :client_id
        ORDER BY
            CASE t.status
                WHEN "posted" THEN 1
                WHEN "accepted" THEN 2
                WHEN "in_progress" THEN 3
                WHEN "awaiting_confirmation" THEN 4
                WHEN "completed" THEN 5
                WHEN "cancelled" THEN 6
                WHEN "disputed" THEN 7
                ELSE 8
            END ASC,
            t.created_at DESC');
        $stmt->execute(['client_id' => $clientId]);

        return $stmt->fetchAll();
    }

    public function byRunner(int $runnerId): array
    {
        $stmt = $this->pdo->prepare('SELECT t.*, z.name AS zone_name, cz.name AS client_zone_name, cu.full_name AS client_name FROM tasks t JOIN zones z ON z.id = t.zone_id LEFT JOIN zones cz ON cz.id = t.client_zone_id JOIN users cu ON cu.id = t.client_id WHERE t.runner_id = :runner_id ORDER BY t.updated_at DESC, t.created_at DESC');
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


    public function findByIdForUpdate(int $taskId): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM tasks WHERE id = :id FOR UPDATE');
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
