<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['client', 'both']);

$userId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);
$tasks = $taskRepo->byClient($userId);

$statusLabels = [
    'posted' => 'Posted',
    'accepted' => 'Accepted',
    'in_progress' => 'In Progress',
    'awaiting_confirmation' => 'Awaiting Confirmation',
    'completed' => 'Completed',
    'cancelled' => 'Cancelled',
    'disputed' => 'Disputed',
];

$statusClasses = [
    'posted' => 'task-status--posted',
    'accepted' => 'task-status--accepted',
    'in_progress' => 'task-status--in-progress',
    'awaiting_confirmation' => 'task-status--awaiting',
    'completed' => 'task-status--completed',
    'cancelled' => 'task-status--cancelled',
    'disputed' => 'task-status--cancelled',
];

$stageIndex = [
    'posted' => 0,
    'accepted' => 1,
    'in_progress' => 2,
    'awaiting_confirmation' => 3,
    'completed' => 4,
];

$activeCount = count(array_filter($tasks, static fn (array $task): bool => in_array((string) $task['status'], ['posted', 'accepted', 'in_progress', 'awaiting_confirmation'], true)));
$completedCount = count(array_filter($tasks, static fn (array $task): bool => (string) $task['status'] === 'completed'));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Errands | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<section class="section section--compact app-shell-page">
    <div class="container container--mobile-dense app-shell__container">
        <article class="card card--compact app-shell__header">
            <h1 class="dashboard-title">My Errands</h1>
            <p class="dashboard-subtitle">Incomplete errands are listed first. Older errands appear lower.</p>
        </article>

        <div class="grid app-stats-grid">
            <article class="card card--compact"><p class="dashboard-subtitle">Total</p><p class="stat-value"><?php echo count($tasks); ?></p></article>
            <article class="card card--compact"><p class="dashboard-subtitle">Incomplete</p><p class="stat-value"><?php echo $activeCount; ?></p></article>
            <article class="card card--compact"><p class="dashboard-subtitle">Completed</p><p class="stat-value"><?php echo $completedCount; ?></p></article>
            <article class="card card--compact"><a href="post_task.php" class="cta-button cta-button--block">New Errand</a></article>
        </div>

        <article class="card card--compact app-listing__section">
            <div class="task-feed" aria-live="polite">
                <?php if ($tasks === []): ?>
                    <p class="list-empty">No errands yet. Tap “New Errand” to create your first one.</p>
                <?php endif; ?>

                <?php foreach ($tasks as $task): ?>
                    <?php
                        $status = (string) ($task['status'] ?? 'posted');
                        $statusLabel = $statusLabels[$status] ?? ucfirst($status);
                        $statusClass = $statusClasses[$status] ?? 'task-status--posted';
                        $currentStage = $stageIndex[$status] ?? -1;
                        $createdAt = isset($task['created_at']) && $task['created_at'] ? date('M j, Y g:i A', strtotime((string) $task['created_at'])) : 'Recently';
                    ?>
                    <article class="task-feed__card">
                        <div class="task-feed__row">
                            <div class="task-feed__body">
                                <p class="task-feed__title"><?php echo h((string) ($task['title'] ?? 'Untitled errand')); ?></p>
                                <p class="task-feed__meta"><?php echo h((string) ($task['zone_name'] ?? 'No area')); ?> · <?php echo h($createdAt); ?></p>
                                <?php if (!empty($task['runner_name'])): ?>
                                    <p class="task-feed__meta">Runner: <?php echo h((string) $task['runner_name']); ?></p>
                                <?php endif; ?>
                            </div>
                            <span class="task-feed__amount">KES <?php echo number_format((float) ($task['runner_fee'] ?? 0), 2); ?></span>
                        </div>

                        <div class="task-feed__footer">
                            <span class="task-status-chip <?php echo h($statusClass); ?>"><?php echo h($statusLabel); ?></span>
                        </div>

                        <?php if ($currentStage >= 0): ?>
                            <div class="task-progress">
                                <?php for ($i = 0; $i < 5; $i++): ?>
                                    <span class="task-progress__bar <?php echo $i <= $currentStage ? 'is-active' : ''; ?>"></span>
                                <?php endfor; ?>
                            </div>
                        <?php endif; ?>
                    </article>
                <?php endforeach; ?>
            </div>
        </article>
    </div>
</section>
<?php
$bottomNavRole = 'client';
$bottomNavActive = 'errands';
require __DIR__ . '/includes/bottom_nav.php';
?>
</body>
</html>
