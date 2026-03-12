<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;

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
$repo = new UserRepository($pdo);

$startedAt = time();
$maxRuntimeSeconds = 55;

while (!connection_aborted()) {
    $userStmt->execute(['id' => $userId]);
    $user = $userStmt->fetch() ?: ['latitude' => null, 'longitude' => null, 'location_updated_at' => null];

    $lat = $user['latitude'] !== null ? (float) $user['latitude'] : null;
    $lng = $user['longitude'] !== null ? (float) $user['longitude'] : null;

    $runnerRows = [];
    if ($lat !== null && $lng !== null) {
        $runnerRows = array_values(array_filter(
            $repo->activeRunners(null, 'rating', $lat, $lng),
            static fn (array $runner): bool => isset($runner['distance_km']) && $runner['distance_km'] !== null && (float) $runner['distance_km'] <= $radiusKm
        ));
    }

    $runners = array_map(static function (array $runner): array {
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

    $payload = [
        'server_time' => gmdate('c'),
        'client' => [
            'latitude' => $lat,
            'longitude' => $lng,
            'location_updated_at' => $user['location_updated_at'] ?? null,
        ],
        'runners' => $runners,
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
