<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\FraudService;
use App\Services\TaskStateGuard;
use App\Services\WalletService;

requireLogin();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

if (!csrf_validate($_POST['_csrf'] ?? null)) {
    http_response_code(403);
    exit('Invalid CSRF token');
}

$taskId = (int) ($_POST['task_id'] ?? 0);
$status = trim((string) ($_POST['status'] ?? ''));
$actorId = (int) currentUserId();
$actorRole = (string) currentUserRole();

if ($taskId <= 0 || $status === '') {
    setFlash('error', 'Invalid task status request.');
    redirect('index.php');
}

$taskRepo = new TaskRepository($pdo);
$wallet = new WalletService($pdo);
$guard = new TaskStateGuard();
$fraud = new FraudService($pdo);

try {
    $pdo->beginTransaction();

    $task = $taskRepo->findByIdForUpdate($taskId);
    if (!$task) {
        throw new RuntimeException('Task not found.');
    }

    $guard->assertTransitionAllowed($task, $actorId, $actorRole, $status);

    if ($status === 'awaiting_confirmation' && in_array($task['category'], ['courier', 'dropoff'], true)) {
        $hasProof = $taskRepo->taskHasProof($taskId, $actorId, ['delivery', 'package_condition', 'after']);
        if (!$hasProof) {
            throw new RuntimeException('Delivery proof is required before marking this task done.');
        }
    }

    if (!$taskRepo->setStatus($taskId, $status, $actorId)) {
        throw new RuntimeException('Unable to update task status.');
    }

    if ($status === 'completed' && $task['runner_id']) {
        $wallet->releaseCompletion((int) $task['runner_id'], $taskId, (float) $task['runner_fee']);
        $fraud->evaluateRapidCompletion($task);
        $fraud->evaluateRepeatPairing($task);
    }

    $pdo->commit();
    setFlash('success', 'Task status updated to ' . $status . '.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    setFlash('error', $e instanceof RuntimeException ? $e->getMessage() : 'Unable to process task status update.');
}

if ($status === 'disputed') {
    redirect('dispute.php?task_id=' . $taskId);
}

if (in_array($status, ['in_progress', 'awaiting_confirmation'], true)) {
    redirect('dashboard_runner.php');
}

redirect('dashboard_client.php');
