<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

requireRole(['client', 'both']);

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

$latitude = isset($payload['latitude']) ? (float) $payload['latitude'] : null;
$longitude = isset($payload['longitude']) ? (float) $payload['longitude'] : null;

if ($latitude === null || $longitude === null || $latitude < -90 || $latitude > 90 || $longitude < -180 || $longitude > 180) {
    http_response_code(422);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid location payload']);
    exit;
}

$userId = (int) currentUserId();
$stmt = $pdo->prepare('UPDATE users SET latitude = :latitude, longitude = :longitude, location_updated_at = NOW() WHERE id = :id LIMIT 1');
$stmt->execute([
    'latitude' => $latitude,
    'longitude' => $longitude,
    'id' => $userId,
]);

header('Content-Type: application/json');
echo json_encode(['ok' => true]);
