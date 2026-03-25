<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\FilesystemCache;

requireRole(['runner', 'both']);

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

$zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
$runnerId = (int) currentUserId();
$repo = new TaskRepository($pdo);
$cache = new FilesystemCache();
$cacheTtlSeconds = 10;

$cacheKey = sprintf(
    'stream_runner_jobs:v2:runner=%d:zone=%s',
    $runnerId,
    $zoneId === null ? 'all' : (string) $zoneId
);

$jobs = $cache->remember($cacheKey, $cacheTtlSeconds, static function () use ($repo, $runnerId, $zoneId): array {
    $tasks = $repo->browsePostedForRunner($runnerId, $zoneId);

    return array_map(static function (array $task): array {
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
});

$payload = [
    'server_time' => gmdate('c'),
    'jobs' => $jobs,
    'count' => count($jobs),
];

echo json_encode($payload, JSON_THROW_ON_ERROR);
