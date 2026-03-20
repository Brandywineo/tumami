<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;
use App\Services\FilesystemCache;

requireRole(['client', 'both']);

ignore_user_abort(true);
set_time_limit(0);

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

$userId = (int) currentUserId();
$radiusKm = isset($_GET['radius_km']) ? max(1, min(25, (int) $_GET['radius_km'])) : 8;

$userStmt = $pdo->prepare('SELECT latitude, longitude, location_updated_at FROM users WHERE id = :id LIMIT 1');
$activeTaskStmt = $pdo->prepare(
    'SELECT id, status, runner_id, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude
     FROM tasks
     WHERE client_id = :client_id
       AND status IN ("accepted", "in_progress", "awaiting_confirmation")
     ORDER BY updated_at DESC, created_at DESC
     LIMIT 1'
);
$runnerLocationStmt = $pdo->prepare(
    'SELECT latitude, longitude, created_at
     FROM task_runner_locations
     WHERE task_id = :task_id
     ORDER BY created_at DESC, id DESC
     LIMIT 1'
);
$runnerProfileStmt = $pdo->prepare('SELECT latitude, longitude, location_updated_at FROM runner_profiles WHERE user_id = :runner_id LIMIT 1');
$repo = new UserRepository($pdo);
$cache = new FilesystemCache();
$cacheTtlSeconds = 10;

$startedAt = time();
$maxRuntimeSeconds = 55;

while (!connection_aborted()) {
    $userStmt->execute(['id' => $userId]);
    $user = $userStmt->fetch() ?: ['latitude' => null, 'longitude' => null, 'location_updated_at' => null];

    $lat = $user['latitude'] !== null ? (float) $user['latitude'] : null;
    $lng = $user['longitude'] !== null ? (float) $user['longitude'] : null;

    $activeTaskStmt->execute(['client_id' => $userId]);
    $activeTask = $activeTaskStmt->fetch() ?: null;

    $mode = $activeTask ? 'active_task' : 'discovery';
    $runnerRows = [];
    $activeTaskRunner = null;

    if ($mode === 'active_task') {
        $runnerId = (int) ($activeTask['runner_id'] ?? 0);
        if ($runnerId > 0) {
            $runnerLocationStmt->execute(['task_id' => (int) $activeTask['id']]);
            $taskRunnerLocation = $runnerLocationStmt->fetch() ?: null;

            $runnerProfileStmt->execute(['runner_id' => $runnerId]);
            $runnerProfile = $runnerProfileStmt->fetch() ?: null;

            $activeTaskRunner = [
                'id' => $runnerId,
                'latitude' => $taskRunnerLocation
                    ? (float) $taskRunnerLocation['latitude']
                    : ($runnerProfile && $runnerProfile['latitude'] !== null ? (float) $runnerProfile['latitude'] : null),
                'longitude' => $taskRunnerLocation
                    ? (float) $taskRunnerLocation['longitude']
                    : ($runnerProfile && $runnerProfile['longitude'] !== null ? (float) $runnerProfile['longitude'] : null),
                'location_updated_at' => $taskRunnerLocation['created_at'] ?? ($runnerProfile['location_updated_at'] ?? null),
            ];
        }
    } elseif ($lat !== null && $lng !== null) {
        $cacheKey = sprintf(
            'stream_client_map:runners:v1:radius=%d:lat=%0.3f:lng=%0.3f',
            $radiusKm,
            round($lat, 3),
            round($lng, 3)
        );

        $runners = $cache->remember($cacheKey, $cacheTtlSeconds, static function () use ($repo, $lat, $lng, $radiusKm): array {
            $runnerRows = array_values(array_filter(
                $repo->activeRunners(null, 'rating', $lat, $lng),
                static fn (array $runner): bool => isset($runner['distance_km']) && $runner['distance_km'] !== null && (float) $runner['distance_km'] <= $radiusKm
            ));

            return array_map(static function (array $runner): array {
                return [
                    'id' => (int) $runner['id'],
                    'name' => (string) ($runner['full_name'] ?? 'Runner'),
                    'latitude' => isset($runner['latitude']) && $runner['latitude'] !== null ? (float) $runner['latitude'] : null,
                    'longitude' => isset($runner['longitude']) && $runner['longitude'] !== null ? (float) $runner['longitude'] : null,
                    'distance_km' => isset($runner['distance_km']) && $runner['distance_km'] !== null ? round((float) $runner['distance_km'], 2) : null,
                    'vehicle_type' => (string) ($runner['vehicle_type'] ?? 'walking'),
                    'location_updated_at' => $runner['location_updated_at'] ?? null,
                ];
            }, $runnerRows);
        });
    }

    $runners ??= [];

    $payload = [
        'server_time' => gmdate('c'),
        'mode' => $mode,
        'client' => [
            'latitude' => $lat,
            'longitude' => $lng,
            'location_updated_at' => $user['location_updated_at'] ?? null,
        ],
        'runners' => $runners,
        'active_task' => $activeTask ? [
            'id' => (int) $activeTask['id'],
            'status' => (string) $activeTask['status'],
            'pickup_latitude' => $activeTask['pickup_latitude'] !== null ? (float) $activeTask['pickup_latitude'] : null,
            'pickup_longitude' => $activeTask['pickup_longitude'] !== null ? (float) $activeTask['pickup_longitude'] : null,
            'dropoff_latitude' => $activeTask['dropoff_latitude'] !== null ? (float) $activeTask['dropoff_latitude'] : null,
            'dropoff_longitude' => $activeTask['dropoff_longitude'] !== null ? (float) $activeTask['dropoff_longitude'] : null,
            'runner' => $activeTaskRunner,
        ] : null,
    ];

    echo 'event: map' . "\n";
    echo 'data: ' . json_encode($payload, JSON_THROW_ON_ERROR) . "\n\n";

    if (function_exists('ob_get_level') && ob_get_level() > 0) {
        @ob_flush();
    }
    flush();

    if ((time() - $startedAt) >= $maxRuntimeSeconds) {
        echo "event: end\n";
        echo "data: {}\n\n";
        if (function_exists('ob_get_level') && ob_get_level() > 0) {
            @ob_flush();
        }
        flush();
        break;
    }

    sleep(2);
}
