<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\WalletService;

requireRole(['runner', 'both']);

$userId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);
$walletService = new WalletService($pdo);
$tasks = $taskRepo->byRunner($userId);
$available = $taskRepo->browsePostedForRunner($userId);
$wallet = $walletService->balances($userId);

$activeStatuses = ['accepted', 'in_progress', 'awaiting_confirmation'];
$activeCount = count(array_filter($tasks, static fn (array $task): bool => in_array((string) $task['status'], $activeStatuses, true)));
$completedCount = count(array_filter($tasks, static fn (array $task): bool => (string) $task['status'] === 'completed'));
$recent = array_slice($tasks, 0, 4);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Home | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<section class="section section--compact app-listing app-shell-page">
    <div class="container container--mobile-dense app-shell__container">
        <article class="card card--compact app-shell__header">
            <p class="dashboard-subtitle" style="margin:0;">Runner workspace</p>
            <h1 class="dashboard-title">Home</h1>
        </article>

        <div class="grid app-stats-grid">
            <article class="card card--compact"><p class="dashboard-subtitle">Active Tasks</p><p class="stat-value"><?php echo $activeCount; ?></p></article>
            <article class="card card--compact"><p class="dashboard-subtitle">Available Nearby</p><p class="stat-value"><?php echo count($available); ?></p></article>
            <article class="card card--compact"><p class="dashboard-subtitle">Completed</p><p class="stat-value"><?php echo $completedCount; ?></p></article>
            <article class="card card--compact"><p class="dashboard-subtitle">Wallet</p><p class="stat-value">KES <?php echo number_format((float) ($wallet['available'] ?? 0), 2); ?></p></article>
        </div>

        <article class="card card--compact app-shell__primary-cta">
            <a href="browse_tasks.php" class="cta-button cta-button--block">Browse Available Tasks</a>
        </article>

        <article class="card card--compact app-listing__section">
            <div class="app-listing__section-header">
                <h3>Recent Tasks</h3>
                <a href="runner_tasks.php">View all</a>
            </div>
            <div class="grid grid--dashboard">
                <?php if ($recent === []): ?>
                    <p class="list-empty">No tasks yet. Set yourself online and browse tasks.</p>
                <?php endif; ?>
                <?php foreach ($recent as $task): ?>
                    <article class="card card--compact">
                        <h3><?php echo h((string) ($task['title'] ?? 'Untitled task')); ?></h3>
                        <p><strong>Status:</strong> <?php echo h((string) ($task['status'] ?? 'accepted')); ?></p>
                        <p><strong>Fee:</strong> KES <?php echo number_format((float) ($task['runner_fee'] ?? 0), 2); ?></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </article>
    </div>
</section>
<?php
$bottomNavRole = 'runner';
$bottomNavActive = 'home';
require __DIR__ . '/includes/bottom_nav.php';
?>
</body>
</html>
