<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\WalletService;

requireRole(['runner', 'both']);

$taskRepo = new TaskRepository($pdo);
$walletService = new WalletService($pdo);

$tasks = $taskRepo->byRunner((int) currentUserId());
$availableTasks = $taskRepo->browsePosted();
$active = array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true));
$balances = $walletService->balances((int) currentUserId());
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Runner Dashboard | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container">
        <h2>Runner Dashboard</h2>
        <div class="grid">
            <article class="card"><h3>Active Jobs</h3><p><?php echo count($active); ?></p></article>
            <article class="card"><h3>Available Balance</h3><p>KES <?php echo number_format($balances['available'], 2); ?></p></article>
            <article class="card"><h3>Open Tasks</h3><p><?php echo count($availableTasks); ?></p></article>
        </div>

        <h3 style="margin-top:30px;">My Assigned Tasks</h3>
        <div class="grid">
            <?php if (!$tasks): ?><p>You have no assigned tasks.</p><?php endif; ?>
            <?php foreach ($tasks as $task): ?>
                <article class="card">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><strong>Status:</strong> <?php echo h($task['status']); ?></p>
                    <p><strong>Client:</strong> <?php echo h($task['client_name']); ?></p>
                    <?php if ($task['status'] === 'accepted'): ?>
                        <form method="post" action="task_status.php">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="in_progress">
                            <button class="cta-button" type="submit">Start Task</button>
                        </form>
                    <?php elseif ($task['status'] === 'in_progress'): ?>
                        <form method="post" action="task_status.php">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="awaiting_confirmation">
                            <button class="cta-button" type="submit">Mark Done</button>
                        </form>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
        <p style="margin-top:20px;"><a href="browse_tasks.php" class="cta-button">Browse & Accept Tasks</a></p>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
