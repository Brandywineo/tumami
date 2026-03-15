<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['client', 'both']);

$repo = new TaskRepository($pdo);
$tasks = $repo->byClient((int) currentUserId());

$activeStatuses = ['posted', 'accepted', 'in_progress', 'awaiting_confirmation'];
$activeTasks = array_values(array_filter($tasks, static fn (array $task): bool => in_array($task['status'], $activeStatuses, true)));
$completedTasks = array_values(array_filter($tasks, static fn (array $task): bool => $task['status'] === 'completed'));
$otherTasks = array_values(array_filter($tasks, static fn (array $task): bool => in_array($task['status'], ['cancelled', 'disputed'], true)));

function renderTaskItems(array $items): void
{
    if (!$items) {
        echo '<p>No tasks in this category.</p>';
        return;
    }

    foreach ($items as $task) {
        echo '<article class="card card--compact">';
        echo '<h3>' . h((string) $task['title']) . '</h3>';
        echo '<p><strong>Status:</strong> ' . h((string) $task['status']) . '</p>';
        echo '<p><strong>Area:</strong> ' . h((string) ($task['zone_name'] ?? 'N/A')) . '</p>';
        echo '<p><strong>Runner:</strong> ' . h((string) ($task['runner_name'] ?? 'Unassigned')) . '</p>';
        echo '<p><strong>Fee:</strong> KES ' . number_format((float) ($task['runner_fee'] ?? 0), 2) . '</p>';
        echo '</article>';
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Tasks | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section section--compact">
    <div class="container container--mobile-dense">
        <h2>My Tasks</h2>

        <h3 class="section-label">Active</h3>
        <div class="grid"><?php renderTaskItems($activeTasks); ?></div>

        <h3 class="section-label">Completed</h3>
        <div class="grid"><?php renderTaskItems($completedTasks); ?></div>

        <h3 class="section-label">Cancelled / Disputed</h3>
        <div class="grid"><?php renderTaskItems($otherTasks); ?></div>
    </div>
</section>
<?php
$bottomNavRole = 'client';
$bottomNavActive = 'my_errands';
require __DIR__ . '/includes/bottom_nav.php';
require __DIR__ . '/includes/footer.php';
?>
</body>
</html>
