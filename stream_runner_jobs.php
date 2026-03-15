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

$zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
$runnerId = (int) currentUserId();
$repo = new TaskRepository($pdo);

$startedAt = time();
$maxRuntimeSeconds = 55;

while (!connection_aborted()) {
    $tasks = $repo->browsePostedForRunner($runnerId, $zoneId);

    $jobs = array_map(static function (array $task): array {
        return [
            'id' => (int) $task['id'],
            'title' => (string) $task['title'],
            'description' => (string) $task['description'],
            'zone_name' => (string) ($task['zone_name'] ?? ''),
            'client_zone_name' => (string) ($task['client_zone_name'] ?? ''),
            'runner_fee' => (float) $task['runner_fee'],
            'client_name' => (string) ($task['client_name'] ?? 'Client'),
            'is_runner_zone' => (int) ($task['is_runner_zone'] ?? 0),
        ];
    }, $tasks);

    $payload = [
        'server_time' => gmdate('c'),
        'jobs' => $jobs,
        'count' => count($jobs),
    ];

    echo "event: jobs\n";
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
