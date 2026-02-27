<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['client', 'both']);

$taskRepo = new TaskRepository($pdo);
$tasks = $taskRepo->byClient((int) currentUserId());
$active = array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['posted', 'accepted', 'in_progress', 'awaiting_confirmation'], true));
$completed = array_filter($tasks, static fn (array $t): bool => $t['status'] === 'completed');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Client Dashboard | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container">
        <h2>Client Dashboard</h2>
        <p><a class="cta-button" href="post_task.php">Post New Task</a></p>
        <div class="grid">
            <article class="card"><h3>Active Tasks</h3><p><?php echo count($active); ?></p></article>
            <article class="card"><h3>Completed Tasks</h3><p><?php echo count($completed); ?></p></article>
            <article class="card"><h3>Total Tasks</h3><p><?php echo count($tasks); ?></p></article>
        </div>
        <h3 style="margin-top:30px;">My Tasks</h3>
        <div class="grid">
            <?php if (!$tasks): ?><p>No tasks yet.</p><?php endif; ?>
            <?php foreach ($tasks as $task): ?>
                <article class="card">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><strong>Status:</strong> <?php echo h($task['status']); ?></p>
                    <p><strong>Zone:</strong> <?php echo h($task['zone_name']); ?></p>
                    <p><strong>Runner:</strong> <?php echo h($task['runner_name'] ?? 'Unassigned'); ?></p>
                    <p><a href="task_chat.php?task_id=<?php echo (int) $task['id']; ?>">Open Chat</a> · <a href="upload_proof.php?task_id=<?php echo (int) $task['id']; ?>">Upload Proof</a></p>
                    <?php if ($task['status'] === 'awaiting_confirmation'): ?>
                        <form method="post" action="task_status.php" style="margin-bottom:8px;">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="completed">
                            <button class="cta-button" type="submit">Approve Completion</button>
                        </form>
                        <form method="post" action="task_status.php">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="disputed">
                            <button type="submit" style="background:#f39c12;color:#fff;border:none;padding:10px 16px;border-radius:5px;cursor:pointer;">Open Dispute</button>
                        </form>
                    <?php endif; ?>

                    <?php if (in_array($task['status'], ['posted', 'accepted', 'in_progress'], true)): ?>
                        <form method="post" action="cancel_task.php" style="margin-top:10px;">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <button type="submit" style="background:#d63031;color:#fff;border:none;padding:10px 16px;border-radius:5px;cursor:pointer;">Cancel Task</button>
                        </form>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
