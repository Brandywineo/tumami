<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

requireRole(['client', 'both']);

if ($_SERVER['REQUEST_METHOD'] !== 'GET') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$taskId = (int) ($_GET['task_id'] ?? 0);
if ($taskId <= 0) {
    http_response_code(422);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid task id']);
    exit;
}

$clientId = (int) currentUserId();

$taskStmt = $pdo->prepare(
    'SELECT id, runner_id, status, pickup_latitude, pickup_longitude, dropoff_latitude, dropoff_longitude
     FROM tasks
     WHERE id = :task_id
       AND client_id = :client_id
     LIMIT 1'
);
$taskStmt->execute([
    'task_id' => $taskId,
    'client_id' => $clientId,
]);
$task = $taskStmt->fetch();

if (!$task) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Task not found']);
    exit;
}

if ((int) ($task['runner_id'] ?? 0) <= 0) {
    header('Content-Type: application/json');
    echo json_encode([
        'task_id' => $taskId,
        'status' => $task['status'],
        'latitude' => null,
        'longitude' => null,
        'location_updated_at' => null,
        'within_grace_period' => false,
    ]);
    exit;
}

$locationStmt = $pdo->prepare(
    'SELECT latitude, longitude, accuracy_meters, created_at
     FROM task_runner_locations
     WHERE task_id = :task_id
     ORDER BY created_at DESC, id DESC
     LIMIT 1'
);
$locationStmt->execute(['task_id' => $taskId]);
$location = $locationStmt->fetch();

$withinGracePeriod = false;
if ($location && isset($location['created_at'])) {
    $lastUpdate = strtotime((string) $location['created_at']);
    if ($lastUpdate !== false) {
        $withinGracePeriod = (time() - $lastUpdate) <= 60;
    }
}

header('Content-Type: application/json');
echo json_encode([
    'task_id' => $taskId,
    'status' => $task['status'],
    'latitude' => $location ? (float) $location['latitude'] : null,
    'longitude' => $location ? (float) $location['longitude'] : null,
    'accuracy_meters' => $location ? ($location['accuracy_meters'] !== null ? (float) $location['accuracy_meters'] : null) : null,
    'location_updated_at' => $location['created_at'] ?? null,
    'within_grace_period' => $withinGracePeriod,
    'pickup_latitude' => $task['pickup_latitude'] !== null ? (float) $task['pickup_latitude'] : null,
    'pickup_longitude' => $task['pickup_longitude'] !== null ? (float) $task['pickup_longitude'] : null,
    'dropoff_latitude' => $task['dropoff_latitude'] !== null ? (float) $task['dropoff_latitude'] : null,
    'dropoff_longitude' => $task['dropoff_longitude'] !== null ? (float) $task['dropoff_longitude'] : null,
]);
