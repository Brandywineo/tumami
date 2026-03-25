<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;
use App\Services\FilesystemCache;

requireRole(['client', 'both']);

header('Content-Type: application/json');
header('Cache-Control: no-store, no-cache, must-revalidate');

$zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
$sort = $_GET['sort'] ?? 'rating';
if (!in_array($sort, ['rating', 'tasks', 'fee_low'], true)) {
    $sort = 'rating';
}

$lat = isset($_GET['lat']) && $_GET['lat'] !== '' ? (float) $_GET['lat'] : null;
$lng = isset($_GET['lng']) && $_GET['lng'] !== '' ? (float) $_GET['lng'] : null;
if ($lat !== null && ($lat < -90 || $lat > 90)) {
    $lat = null;
}
if ($lng !== null && ($lng < -180 || $lng > 180)) {
    $lng = null;
}

$repo = new UserRepository($pdo);
$cache = new FilesystemCache();
$cacheTtlSeconds = 10;
$onlineWindowSeconds = 90;

$cacheKey = sprintf(
    'stream_online_runners:v2:zone=%s:sort=%s:lat=%s:lng=%s',
    $zoneId === null ? 'all' : (string) $zoneId,
    $sort,
    $lat === null ? 'none' : number_format(round($lat, 3), 3, '.', ''),
    $lng === null ? 'none' : number_format(round($lng, 3), 3, '.', '')
);

$runners = $cache->remember($cacheKey, $cacheTtlSeconds, static function () use ($repo, $zoneId, $sort, $lat, $lng, $onlineWindowSeconds): array {
    $rows = $repo->activeRunners($zoneId, $sort, $lat, $lng);

    return array_values(array_filter(array_map(static function (array $runner) use ($onlineWindowSeconds): ?array {
        $updatedAt = $runner['location_updated_at'] ?? null;
        $isOnline = false;
        if ($updatedAt) {
            $timestamp = strtotime((string) $updatedAt);
            if ($timestamp !== false) {
                $isOnline = (time() - $timestamp) <= $onlineWindowSeconds;
            }
        }

        if (!$isOnline) {
            return null;
        }

        return [
            'id' => (int) $runner['id'],
            'full_name' => (string) ($runner['full_name'] ?? 'Runner'),
            'active_zone_name' => (string) ($runner['active_zone_name'] ?? 'Unspecified'),
            'vehicle_type' => (string) ($runner['vehicle_type'] ?? 'walking'),
            'rating' => (float) ($runner['rating'] ?? 0),
            'rating_count' => (int) ($runner['rating_count'] ?? 0),
            'total_tasks_completed' => (int) ($runner['total_tasks_completed'] ?? 0),
            'radius_km' => (int) ($runner['radius_km'] ?? 0),
            'distance_km' => isset($runner['distance_km']) && $runner['distance_km'] !== null ? round((float) $runner['distance_km'], 2) : null,
            'location_updated_at' => $updatedAt,
        ];
    }, $rows)));
});

$payload = [
    'server_time' => gmdate('c'),
    'runners' => $runners,
    'count' => count($runners),
];

echo json_encode($payload, JSON_THROW_ON_ERROR);
