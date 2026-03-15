<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['runner', 'both']);

ignore_user_abort(true);
set_time_limit(0);

header('Content-Type: text/event-stream');
header('Cache-Control: no-cache, no-store, must-revalidate');
header('Connection: keep-alive');
header('X-Accel-Buffering: no');

$runnerId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);

$profileStmt = $pdo->prepare('SELECT latitude, longitude, location_updated_at FROM runner_profiles WHERE user_id = :id LIMIT 1');
$clientStmt = $pdo->prepare('SELECT latitude, longitude FROM users WHERE id = :client_id LIMIT 1');

$startedAt = time();
$maxRuntimeSeconds = 55;

while (!connection_aborted()) {
    $profileStmt->execute(['id' => $runnerId]);
    $runnerProfile = $profileStmt->fetch() ?: ['latitude' => null, 'longitude' => null, 'location_updated_at' => null];

    $availableTasks = $taskRepo->browsePostedForRunner($runnerId);
    $jobs = [];
    foreach ($availableTasks as $task) {
        $lat = null;
        $lng = null;

        if ($task['pickup_latitude'] !== null && $task['pickup_longitude'] !== null) {
            $lat = (float) $task['pickup_latitude'];
            $lng = (float) $task['pickup_longitude'];
        } elseif ($task['client_latitude'] !== null && $task['client_longitude'] !== null) {
            $lat = (float) $task['client_latitude'];
            $lng = (float) $task['client_longitude'];
        } elseif ($task['dropoff_latitude'] !== null && $task['dropoff_longitude'] !== null) {
            $lat = (float) $task['dropoff_latitude'];
            $lng = (float) $task['dropoff_longitude'];
        }

        if ($lat === null || $lng === null) {
            continue;
        }

        $jobs[] = [
            'id' => (int) $task['id'],
            'title' => (string) $task['title'],
            'latitude' => $lat,
            'longitude' => $lng,
            'zone_name' => (string) ($task['zone_name'] ?? ''),
            'runner_fee' => (float) $task['runner_fee'],
        ];
    }

    $activeTaskStmt = $pdo->prepare(
        'SELECT id, client_id, client_latitude, client_longitude
         FROM tasks
         WHERE runner_id = :runner_id
           AND status IN ("accepted", "in_progress", "awaiting_confirmation")
         ORDER BY updated_at DESC, created_at DESC
         LIMIT 1'
    );
    $activeTaskStmt->execute(['runner_id' => $runnerId]);
    $activeTask = $activeTaskStmt->fetch();

    $liveClientLatitude = null;
    $liveClientLongitude = null;
    if ($activeTask && isset($activeTask['client_id'])) {
        $clientStmt->execute(['client_id' => (int) $activeTask['client_id']]);
        $client = $clientStmt->fetch();

        if ($client && $client['latitude'] !== null && $client['longitude'] !== null) {
            $liveClientLatitude = (float) $client['latitude'];
            $liveClientLongitude = (float) $client['longitude'];
        }
    }

    $payload = [
        'server_time' => gmdate('c'),
        'runner' => [
            'latitude' => $runnerProfile['latitude'] !== null ? (float) $runnerProfile['latitude'] : null,
            'longitude' => $runnerProfile['longitude'] !== null ? (float) $runnerProfile['longitude'] : null,
            'location_updated_at' => $runnerProfile['location_updated_at'] ?? null,
        ],
        'jobs' => $jobs,
        'client' => [
            'latitude' => $liveClientLatitude ?? ($activeTask && $activeTask['client_latitude'] !== null ? (float) $activeTask['client_latitude'] : null),
            'longitude' => $liveClientLongitude ?? ($activeTask && $activeTask['client_longitude'] !== null ? (float) $activeTask['client_longitude'] : null),
            'task_id' => $activeTask ? (int) $activeTask['id'] : null,
        ],
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
