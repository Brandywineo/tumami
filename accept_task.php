<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['runner', 'both']);

$taskId = (int) ($_GET['task_id'] ?? 0);
if ($taskId <= 0) {
    setFlash('error', 'Invalid task id.');
    redirect('browse_tasks.php');
}

$taskRepo = new TaskRepository($pdo);
if ($taskRepo->accept($taskId, (int) currentUserId())) {
    $stmt = $pdo->prepare('INSERT INTO task_status_logs (task_id, changed_by, old_status, new_status) VALUES (:task_id, :changed_by, "posted", "accepted")');
    $stmt->execute(['task_id' => $taskId, 'changed_by' => (int) currentUserId()]);
    setFlash('success', 'Task accepted successfully.');
} else {
    setFlash('error', 'Task is no longer available.');
}

redirect('dashboard_runner.php');
