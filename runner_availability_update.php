<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;
use App\Services\RunnerAvailabilityService;

requireRole(['runner', 'both']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Method Not Allowed']);
    exit;
}

$token = $_SERVER['HTTP_X_CSRF_TOKEN'] ?? null;
if (!csrf_validate(is_string($token) ? $token : null)) {
    http_response_code(403);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid CSRF token']);
    exit;
}

$rawBody = file_get_contents('php://input');
$payload = json_decode($rawBody ?: '{}', true);
if (!is_array($payload) || !array_key_exists('is_available', $payload)) {
    http_response_code(422);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Missing is_available flag']);
    exit;
}

$isAvailable = filter_var($payload['is_available'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
if ($isAvailable === null) {
    http_response_code(422);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Invalid availability flag']);
    exit;
}

$service = new RunnerAvailabilityService(new UserRepository($pdo));
$status = $service->setAvailability((int) currentUserId(), $isAvailable);

header('Content-Type: application/json');
echo json_encode([
    'ok' => true,
    'status' => $status,
    'message' => $status['is_available'] ? 'You are now discoverable.' : 'You are now hidden from new task requests.',
]);
