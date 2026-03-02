<?php

declare(strict_types=1);

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../db/database.php';

use App\Repositories\TaskRepository;
use App\Services\WalletService;

requireLogin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$role = (string) currentUserRole();
$userId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);

if ($method === 'GET') {
    $scope = $_GET['scope'] ?? 'open';
    if ($scope === 'mine') {
        $tasks = in_array($role, ['runner', 'both'], true) ? $taskRepo->byRunner($userId) : $taskRepo->byClient($userId);
        jsonResponse(['tasks' => $tasks]);
    }

    $zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
    if (in_array($role, ['runner', 'both'], true)) {
        jsonResponse(['tasks' => $taskRepo->browsePostedForRunner($userId, $zoneId)]);
    }
    jsonResponse(['tasks' => $taskRepo->browsePosted($zoneId)]);
}

if ($method === 'POST') {
    if (!in_array($role, ['client', 'both'], true)) {
        jsonResponse(['error' => 'Only clients can create tasks'], 403);
    }

    $payload = readJsonInput();
    $data = [
        'client_id' => $userId,
        'zone_id' => (int) ($payload['service_zone_id'] ?? 0),
        'client_zone_id' => isset($payload['client_zone_id']) ? (int) $payload['client_zone_id'] : null,
        'pickup_zone_id' => isset($payload['pickup_zone_id']) ? (int) $payload['pickup_zone_id'] : null,
        'dropoff_zone_id' => isset($payload['dropoff_zone_id']) ? (int) $payload['dropoff_zone_id'] : null,
        'category' => (string) ($payload['category'] ?? ''),
        'title' => trim((string) ($payload['title'] ?? '')),
        'description' => trim((string) ($payload['description'] ?? '')),
        'pickup_address' => trim((string) ($payload['pickup_address'] ?? '')) ?: null,
        'dropoff_address' => trim((string) ($payload['dropoff_address'] ?? '')) ?: null,
        'runner_fee' => (float) ($payload['runner_fee'] ?? 0),
        'deadline' => ($payload['deadline'] ?? null) ?: null,
        'client_latitude' => isset($payload['client_latitude']) ? (float) $payload['client_latitude'] : null,
        'client_longitude' => isset($payload['client_longitude']) ? (float) $payload['client_longitude'] : null,
        'pickup_latitude' => isset($payload['pickup_latitude']) ? (float) $payload['pickup_latitude'] : null,
        'pickup_longitude' => isset($payload['pickup_longitude']) ? (float) $payload['pickup_longitude'] : null,
        'dropoff_latitude' => isset($payload['dropoff_latitude']) ? (float) $payload['dropoff_latitude'] : null,
        'dropoff_longitude' => isset($payload['dropoff_longitude']) ? (float) $payload['dropoff_longitude'] : null,
    ];

    if ($data['zone_id'] <= 0 || $data['title'] === '' || $data['description'] === '' || $data['runner_fee'] <= 0) {
        jsonResponse(['error' => 'Required fields missing'], 422);
    }
    if (!in_array($data['category'], ['courier', 'assisted_purchase', 'dropoff', 'queue'], true)) {
        jsonResponse(['error' => 'Invalid category'], 422);
    }

    $wallet = new WalletService($pdo);
    $taskId = $taskRepo->create($data);
    $wallet->recordClientDeposit($userId, $taskId, $data['runner_fee']);

    jsonResponse(['task_id' => $taskId], 201);
}

jsonResponse(['error' => 'Method Not Allowed'], 405);
