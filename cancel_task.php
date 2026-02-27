<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\CancellationService;
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
$actorId = (int) currentUserId();
$actorRole = (string) currentUserRole();

if ($taskId <= 0) {
    setFlash('error', 'Invalid task id.');
    redirect('index.php');
}

$taskRepo = new TaskRepository($pdo);
$wallet = new WalletService($pdo);
$guard = new TaskStateGuard();
$cancellation = new CancellationService($wallet);

try {
    $pdo->beginTransaction();

    $task = $taskRepo->findByIdForUpdate($taskId);
    if (!$task) {
        throw new RuntimeException('Task not found.');
    }

    $guard->assertTransitionAllowed($task, $actorId, $actorRole, 'cancelled');
    $cancellation->apply($task, $actorId);

    if (!$taskRepo->setStatus($taskId, 'cancelled', $actorId)) {
        throw new RuntimeException('Unable to cancel task.');
    }

    if ((int) ($task['runner_id'] ?? 0) > 0 && $actorId === (int) $task['runner_id']) {
        $deduct = $task['status'] === 'in_progress' ? 15 : 5;
        $stmt = $pdo->prepare('INSERT INTO runner_profiles (user_id, strike_count, reliability_score) VALUES (:user_id, 1, :reliability) ON DUPLICATE KEY UPDATE strike_count = strike_count + 1, reliability_score = GREATEST(0, reliability_score - :reliability_drop), last_strike_at = NOW()');
        $stmt->execute([
            'user_id' => $actorId,
            'reliability' => 100 - $deduct,
            'reliability_drop' => $deduct,
        ]);
    }

    $pdo->commit();
    setFlash('success', 'Task cancelled and penalties applied.');
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    setFlash('error', $e instanceof RuntimeException ? $e->getMessage() : 'Unable to cancel task.');
}

if (in_array($actorRole, ['runner', 'both'], true)) {
    redirect('dashboard_runner.php');
}

redirect('dashboard_client.php');
