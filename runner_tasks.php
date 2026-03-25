<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['runner', 'both']);

$runnerId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);

$runnerTasks = $taskRepo->byRunner($runnerId);
$activeStatuses = ['accepted', 'in_progress', 'awaiting_confirmation'];
$activeTasks = array_values(array_filter($runnerTasks, static fn (array $task): bool => in_array((string) $task['status'], $activeStatuses, true)));
$availableTasks = $taskRepo->browsePostedForRunner($runnerId);

function renderRunnerTaskCards(array $items, bool $showAccept = false): void
{
    if ($items === []) {
        echo '<p class="list-empty">No tasks in this section yet.</p>';
        return;
    }

    foreach ($items as $task) {
        echo '<article class="card card--compact">';
        echo '<h3>' . h((string) ($task['title'] ?? 'Untitled task')) . '</h3>';
        echo '<p><strong>Status:</strong> ' . h((string) ($task['status'] ?? 'posted')) . '</p>';
        echo '<p><strong>Area:</strong> ' . h((string) ($task['zone_name'] ?? 'N/A')) . '</p>';
        if (isset($task['client_name'])) {
            echo '<p><strong>Client:</strong> ' . h((string) $task['client_name']) . '</p>';
        }
        echo '<p><strong>Fee:</strong> KES ' . number_format((float) ($task['runner_fee'] ?? 0), 2) . '</p>';

        if ($showAccept) {
            echo '<form method="post" action="accept_task.php">';
            echo csrf_field();
            echo '<input type="hidden" name="task_id" value="' . (int) $task['id'] . '">';
            echo '<button class="cta-button cta-button--block" type="submit">Accept Task</button>';
            echo '</form>';
        }

        echo '</article>';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tasks | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section section--compact app-listing">
    <div class="container container--mobile-dense app-listing__container">
        <article class="card card--compact app-listing__hero">
            <h2 class="dashboard-title">Tasks</h2>
            <p class="dashboard-subtitle">Track your active work and pick nearby available tasks quickly.</p>
            <a href="browse_tasks.php" class="cta-button cta-button--block">Browse Available Tasks</a>
        </article>

        <article class="card card--compact app-listing__section">
            <div class="app-listing__section-header">
                <h3>Active Tasks</h3>
                <span class="app-listing__chip"><?php echo count($activeTasks); ?></span>
            </div>
            <div class="grid grid--dashboard"><?php renderRunnerTaskCards($activeTasks); ?></div>
        </article>

        <article class="card card--compact app-listing__section">
            <div class="app-listing__section-header">
                <h3>Available Tasks</h3>
                <span class="app-listing__chip"><?php echo count($availableTasks); ?></span>
            </div>
            <div class="grid grid--dashboard"><?php renderRunnerTaskCards($availableTasks, true); ?></div>
        </article>
    </div>
</section>
<?php
$bottomNavRole = 'runner';
$bottomNavActive = 'tasks';
require __DIR__ . '/includes/bottom_nav.php';
require __DIR__ . '/includes/footer.php';
?>
</body>
</html>
