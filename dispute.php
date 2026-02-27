<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireLogin();

$taskId = (int) ($_GET['task_id'] ?? $_POST['task_id'] ?? 0);
if ($taskId <= 0) {
    setFlash('error', 'Invalid task id.');
    redirect('index.php');
}

$taskRepo = new TaskRepository($pdo);
$task = $taskRepo->findById($taskId);
if (!$task) {
    setFlash('error', 'Task not found.');
    redirect('index.php');
}

$actorId = (int) currentUserId();
$isParticipant = $actorId === (int) $task['client_id'] || $actorId === (int) ($task['runner_id'] ?? 0);
if (!$isParticipant) {
    http_response_code(403);
    exit('Forbidden');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $reason = trim((string) ($_POST['reason'] ?? ''));
    if ($reason === '') {
        setFlash('error', 'Please provide dispute reason.');
        redirect('dispute.php?task_id=' . $taskId);
    }

    try {
        $pdo->beginTransaction();

        $taskLocked = $taskRepo->findByIdForUpdate($taskId);
        if (!$taskLocked) {
            throw new RuntimeException('Task not found.');
        }

        if (!in_array($taskLocked['status'], ['awaiting_confirmation', 'disputed'], true)) {
            throw new RuntimeException('Task is not eligible for dispute.');
        }

        if ($taskLocked['status'] !== 'disputed') {
            $taskRepo->setStatus($taskId, 'disputed', $actorId);
        }

        $stmt = $pdo->prepare('INSERT INTO disputes (task_id, opened_by, reason, status) VALUES (:task_id, :opened_by, :reason, "open")');
        $stmt->execute([
            'task_id' => $taskId,
            'opened_by' => $actorId,
            'reason' => $reason,
        ]);

        $pdo->commit();
        setFlash('success', 'Dispute submitted. Admin will review.');
        redirect('dashboard_client.php');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        setFlash('error', $e instanceof RuntimeException ? $e->getMessage() : 'Unable to open dispute.');
        redirect('dispute.php?task_id=' . $taskId);
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Open Dispute | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:720px;">
        <h2>Open Dispute for Task #<?php echo (int) $taskId; ?></h2>
        <form method="post" class="card">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="task_id" value="<?php echo (int) $taskId; ?>">
            <p><label>Reason<br><textarea name="reason" required style="width:100%;padding:10px;min-height:140px;"></textarea></label></p>
            <button class="cta-button" type="submit">Submit Dispute</button>
        </form>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
