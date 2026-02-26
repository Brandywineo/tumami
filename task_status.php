<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\WalletService;

requireLogin();

$taskId = (int) ($_GET['task_id'] ?? 0);
$status = $_GET['status'] ?? '';
$actorId = (int) currentUserId();

if ($taskId <= 0 || $status === '') {
    setFlash('error', 'Invalid task status request.');
    redirect('index.php');
}

$taskRepo = new TaskRepository($pdo);
$wallet = new WalletService($pdo);
$task = $taskRepo->findById($taskId);

if (!$task) {
    setFlash('error', 'Task not found.');
    redirect('index.php');
}

$isRunnerAction = in_array($status, ['in_progress', 'awaiting_confirmation'], true);
$isClientCompletion = $status === 'completed';

if ($isRunnerAction && (int) $task['runner_id'] !== $actorId) {
    setFlash('error', 'Only assigned runner can perform this action.');
    redirect('dashboard_runner.php');
}

if ($isClientCompletion && (int) $task['client_id'] !== $actorId) {
    setFlash('error', 'Only client can approve completion.');
    redirect('dashboard_client.php');
}

if ($taskRepo->setStatus($taskId, $status, $actorId)) {
    if ($status === 'completed' && $task['runner_id']) {
        $wallet->releaseCompletion((int) $task['runner_id'], $taskId, (float) $task['runner_fee']);
    }
    setFlash('success', 'Task status updated to ' . $status . '.');
} else {
    setFlash('error', 'Unable to update task status.');
}

redirect($isRunnerAction ? 'dashboard_runner.php' : 'dashboard_client.php');
