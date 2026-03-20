<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

requireRole(['runner', 'both']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '{}', true);
if (!is_array($payload)) {
    http_response_code(400);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$taskIds = array_values(array_filter(array_map('intval', (array) ($payload['task_ids'] ?? [])), static fn (int $id): bool => $id > 0));
$latitude = isset($payload['latitude']) ? (float) $payload['latitude'] : null;
$longitude = isset($payload['longitude']) ? (float) $payload['longitude'] : null;
$accuracy = isset($payload['accuracy']) ? (float) $payload['accuracy'] : null;

if (!$taskIds || $latitude === null || $longitude === null || $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
    http_response_code(422);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid location payload']);
    exit;
}

$runnerId = (int) currentUserId();
$taskPlaceholders = implode(',', array_fill(0, count($taskIds), '?'));

$taskStmt = $pdo->prepare(
    'SELECT id FROM tasks
     WHERE runner_id = ?
       AND id IN (' . $taskPlaceholders . ')
       AND status IN ("accepted", "in_progress")'
);
$taskStmt->execute([$runnerId, ...$taskIds]);
$authorizedTaskIds = array_map('intval', array_column($taskStmt->fetchAll(), 'id'));

if (!$authorizedTaskIds) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'No authorized active tasks found for location update']);
    exit;
}

try {
    $pdo->beginTransaction();

    $profileStmt = $pdo->prepare('UPDATE runner_profiles SET latitude = :latitude, longitude = :longitude, location_updated_at = NOW() WHERE user_id = :user_id');
    $profileStmt->execute([
        'latitude' => $latitude,
        'longitude' => $longitude,
        'user_id' => $runnerId,
    ]);

    $eventStmt = $pdo->prepare(
        'INSERT INTO task_runner_locations (task_id, runner_id, latitude, longitude, accuracy_meters)
         VALUES (:task_id, :runner_id, :latitude, :longitude, :accuracy_meters)'
    );

    foreach ($authorizedTaskIds as $taskId) {
        $eventStmt->execute([
            'task_id' => $taskId,
            'runner_id' => $runnerId,
            'latitude' => $latitude,
            'longitude' => $longitude,
            'accuracy_meters' => $accuracy,
        ]);
    }

    $pdo->commit();

    header('Content-Type: application/json');
    echo json_encode(['ok' => true, 'updated_task_ids' => $authorizedTaskIds]);
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    http_response_code(500);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Unable to store runner location']);
}
