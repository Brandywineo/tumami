<?php

declare(strict_types=1);

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../db/database.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$taskId = (int) ($_GET['task_id'] ?? ($_POST['task_id'] ?? 0));
$userId = (int) currentUserId();
$role = (string) currentUserRole();

if ($taskId <= 0) {
    jsonResponse(['error' => 'task_id is required'], 422);
}

$taskStmt = $pdo->prepare('SELECT id, client_id, runner_id, status FROM tasks WHERE id = :id LIMIT 1');
$taskStmt->execute(['id' => $taskId]);
$task = $taskStmt->fetch();
if (!$task) {
    jsonResponse(['error' => 'Task not found'], 404);
}

$isClient = $userId === (int) $task['client_id'];
$isRunner = $userId === (int) ($task['runner_id'] ?? 0);
if (!$isClient && !$isRunner) {
    jsonResponse(['error' => 'Forbidden'], 403);
}

if ($method === 'GET') {
    $stmt = $pdo->prepare('SELECT latitude, longitude, speed_kmh, heading_deg, captured_at
                           FROM runner_location_logs
                           WHERE task_id = :task_id
                           ORDER BY captured_at DESC
                           LIMIT 100');
    $stmt->execute(['task_id' => $taskId]);
    $points = array_reverse($stmt->fetchAll());
    jsonResponse([
        'task_id' => $taskId,
        'status' => $task['status'],
        'tracking_points' => $points,
    ]);
}

if ($method === 'POST') {
    if (!$isRunner || !in_array($role, ['runner', 'both'], true)) {
        jsonResponse(['error' => 'Only assigned runner can publish live location'], 403);
    }

    $payload = readJsonInput();
    $lat = isset($payload['latitude']) ? (float) $payload['latitude'] : (float) ($_POST['latitude'] ?? 0);
    $lng = isset($payload['longitude']) ? (float) $payload['longitude'] : (float) ($_POST['longitude'] ?? 0);
    if ($lat === 0.0 && $lng === 0.0) {
        jsonResponse(['error' => 'latitude and longitude are required'], 422);
    }

    $speed = isset($payload['speed_kmh']) ? (float) $payload['speed_kmh'] : null;
    $heading = isset($payload['heading_deg']) ? (int) $payload['heading_deg'] : null;
    $capturedAt = (string) ($payload['captured_at'] ?? date('Y-m-d H:i:s'));

    $stmt = $pdo->prepare('INSERT INTO runner_location_logs (runner_id, task_id, latitude, longitude, speed_kmh, heading_deg, captured_at)
                           VALUES (:runner_id, :task_id, :latitude, :longitude, :speed_kmh, :heading_deg, :captured_at)');
    $stmt->execute([
        'runner_id' => $userId,
        'task_id' => $taskId,
        'latitude' => $lat,
        'longitude' => $lng,
        'speed_kmh' => $speed,
        'heading_deg' => $heading,
        'captured_at' => $capturedAt,
    ]);

    $profile = $pdo->prepare('UPDATE runner_profiles SET latitude = :lat, longitude = :lng, location_updated_at = NOW() WHERE user_id = :user_id');
    $profile->execute(['lat' => $lat, 'lng' => $lng, 'user_id' => $userId]);

    jsonResponse(['ok' => true], 201);
}

jsonResponse(['error' => 'Method Not Allowed'], 405);
