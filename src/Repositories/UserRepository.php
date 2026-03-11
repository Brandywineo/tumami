<?php

declare(strict_types=1);

namespace App\Repositories;

use PDO;

class UserRepository
{
    public function __construct(private PDO $pdo)
    {
    }

    public function create(string $fullName, string $email, string $phone, string $passwordHash, string $role): int
    {
        $stmt = $this->pdo->prepare('INSERT INTO users (full_name, email, phone, password_hash, role) VALUES (:full_name, :email, :phone, :password_hash, :role)');
        $stmt->execute([
            'full_name' => $fullName,
            'email' => $email,
            'phone' => $phone,
            'password_hash' => $passwordHash,
            'role' => $role,
        ]);

        $userId = (int) $this->pdo->lastInsertId();
        if (in_array($role, ['runner', 'both'], true)) {
            $profileStmt = $this->pdo->prepare('INSERT INTO runner_profiles (user_id, is_available) VALUES (:user_id, 1)');
            $profileStmt->execute(['user_id' => $userId]);
        }

        return $userId;
    }



    public function findById(int $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE id = :id LIMIT 1');
        $stmt->execute(['id' => $id]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function updatePasswordHash(int $userId, string $passwordHash): void
    {
        $stmt = $this->pdo->prepare('UPDATE users SET password_hash = :password_hash WHERE id = :id LIMIT 1');
        $stmt->execute([
            'password_hash' => $passwordHash,
            'id' => $userId,
        ]);
    }

    public function findByEmail(string $email): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM users WHERE email = :email LIMIT 1');
        $stmt->execute(['email' => $email]);
        $user = $stmt->fetch();

        return $user ?: null;
    }

    public function activeRunners(?int $zoneId = null, string $sort = 'rating', ?float $latitude = null, ?float $longitude = null): array
    {
        $where = 'rp.is_available = 1';
        $params = [];
        if ($zoneId !== null) {
            $where .= ' AND (rp.active_zone_id = :zone_id OR u.current_zone_id = :zone_id)';
            $params['zone_id'] = $zoneId;
        }

        $hasDistance = $latitude !== null && $longitude !== null;

        $distanceSql = 'NULL AS distance_km';
        if ($hasDistance) {
            $distanceSql = '(6371 * ACOS(
                COS(RADIANS(:lat)) * COS(RADIANS(COALESCE(rp.latitude, u.latitude))) * COS(RADIANS(COALESCE(rp.longitude, u.longitude)) - RADIANS(:lng)) +
                SIN(RADIANS(:lat)) * SIN(RADIANS(COALESCE(rp.latitude, u.latitude)))
            )) AS distance_km';
            $params['lat'] = $latitude;
            $params['lng'] = $longitude;
            $where .= ' AND COALESCE(rp.latitude, u.latitude) IS NOT NULL AND COALESCE(rp.longitude, u.longitude) IS NOT NULL';
        }

        $order = match ($sort) {
            'tasks' => 'rp.total_tasks_completed DESC, u.rating DESC',
            'fee_low' => 'rp.reliability_score DESC, u.rating DESC',
            default => 'u.rating DESC, u.rating_count DESC, rp.total_tasks_completed DESC',
        };

        if ($hasDistance) {
            $order = 'distance_km ASC, ' . $order;
        }

        $sql = 'SELECT
            u.id,
            u.full_name,
            u.rating,
            u.rating_count,
            u.current_zone_id,
            z.name AS active_zone_name,
            rp.vehicle_type,
            rp.radius_km,
            rp.total_tasks_completed,
            rp.reliability_score,
            rp.accepts_adjacent_zones,
            rp.location_updated_at,
            ' . $distanceSql . '
        FROM users u
        JOIN runner_profiles rp ON rp.user_id = u.id
        LEFT JOIN zones z ON z.id = COALESCE(rp.active_zone_id, u.current_zone_id)
        WHERE ' . $where . '
        ORDER BY ' . $order;

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute($params);

        return $stmt->fetchAll();
    }
}
