<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Repositories\UserRepository;
use App\Services\RunnerAvailabilityService;
use App\Services\TaskStateGuard;

requireRole(['runner', 'both']);

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

if (!csrf_validate($_POST['_csrf'] ?? null)) {
    http_response_code(403);
    exit('Invalid CSRF token');
}

$taskId = (int) ($_POST['task_id'] ?? 0);
$runnerId = (int) currentUserId();
$actorRole = (string) currentUserRole();

if ($taskId <= 0) {
    setFlash('error', 'Invalid task id.');
    redirect('browse_tasks.php');
}

$taskRepo = new TaskRepository($pdo);
$guard = new TaskStateGuard();
$availability = new RunnerAvailabilityService(new UserRepository($pdo));

try {
    $pdo->beginTransaction();

    $task = $taskRepo->findByIdForUpdate($taskId);
    if (!$task) {
        throw new RuntimeException('Task not found.');
    }

    $availabilityState = $availability->status($runnerId);
    if (!$availabilityState['is_available']) {
        throw new RuntimeException('Set your availability to ON before accepting tasks.');
    }

    $guard->assertTransitionAllowed($task, $runnerId, $actorRole, 'accepted');

    if (!$taskRepo->accept($taskId, $runnerId)) {
        throw new RuntimeException('Task is no longer available.');
    }

    $stmt = $pdo->prepare('INSERT INTO task_status_logs (task_id, changed_by, old_status, new_status) VALUES (:task_id, :changed_by, :old_status, :new_status)');
    $stmt->execute([
        'task_id' => $taskId,
        'changed_by' => $runnerId,
        'old_status' => $task['status'],
        'new_status' => 'accepted',
    ]);

    $pdo->commit();
    setFlash('success', 'Task accepted successfully.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    setFlash('error', 'Unable to accept task at the moment.');
}

redirect('dashboard_runner.php');
