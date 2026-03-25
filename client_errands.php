<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Repositories\UserRepository;

requireRole(['client', 'both']);

$userId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);
$userRepo = new UserRepository($pdo);

$tasks = $taskRepo->byClient($userId);
$activeStatuses = ['posted', 'accepted', 'in_progress', 'awaiting_confirmation'];
$activeErrands = array_values(array_filter($tasks, static fn (array $task): bool => in_array((string) $task['status'], $activeStatuses, true)));
$pastErrands = array_values(array_filter($tasks, static fn (array $task): bool => in_array((string) $task['status'], ['completed', 'cancelled', 'disputed'], true)));

$client = $userRepo->findById($userId);
$zoneId = isset($client['current_zone_id']) && $client['current_zone_id'] !== null ? (int) $client['current_zone_id'] : null;
$lat = isset($client['latitude']) && $client['latitude'] !== null ? (float) $client['latitude'] : null;
$lng = isset($client['longitude']) && $client['longitude'] !== null ? (float) $client['longitude'] : null;
$runners = $userRepo->activeRunners($zoneId, 'rating', $lat, $lng);

function renderErrandCards(array $items): void
{
    if ($items === []) {
        echo '<p class="list-empty">No errands in this section yet.</p>';
        return;
    }

    foreach ($items as $task) {
        echo '<article class="card card--compact">';
        echo '<h3>' . h((string) ($task['title'] ?? 'Untitled errand')) . '</h3>';
        echo '<p><strong>Status:</strong> ' . h((string) ($task['status'] ?? 'unknown')) . '</p>';
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
    <title>Errands | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section section--compact app-listing">
    <div class="container container--mobile-dense app-listing__container">
        <article class="card card--compact app-listing__hero">
            <h2 class="dashboard-title">Errands</h2>
            <p class="dashboard-subtitle">Manage your active errands and discover nearby runners from your current area.</p>
            <a href="post_task.php" class="cta-button cta-button--block">Create Errand</a>
        </article>

        <article class="card card--compact app-listing__section">
            <div class="app-listing__section-header">
                <h3>Active Errands</h3>
                <span class="app-listing__chip"><?php echo count($activeErrands); ?></span>
            </div>
            <div class="grid grid--dashboard"><?php renderErrandCards($activeErrands); ?></div>
        </article>

        <article class="card card--compact app-listing__section">
            <div class="app-listing__section-header">
                <h3>Available Runners Near You</h3>
                <span class="app-listing__chip"><?php echo count($runners); ?></span>
            </div>
            <div class="grid grid--dashboard">
                <?php if ($runners === []): ?>
                    <p class="list-empty">No active runners found in your area right now.</p>
                <?php endif; ?>
                <?php foreach ($runners as $runner): ?>
                    <article class="card card--compact">
                        <h3><?php echo h((string) ($runner['full_name'] ?? 'Runner')); ?></h3>
                        <p><strong>Area:</strong> <?php echo h((string) ($runner['active_zone_name'] ?? 'Unspecified')); ?></p>
                        <p><strong>Vehicle:</strong> <?php echo h((string) ($runner['vehicle_type'] ?? 'walking')); ?></p>
                        <p><strong>Rating:</strong> <?php echo number_format((float) ($runner['rating'] ?? 0), 2); ?> (<?php echo (int) ($runner['rating_count'] ?? 0); ?>)</p>
                        <?php if (isset($runner['distance_km']) && $runner['distance_km'] !== null): ?>
                            <p><strong>Distance:</strong> <?php echo number_format((float) $runner['distance_km'], 2); ?> km</p>
                        <?php endif; ?>
                        <p><a href="post_task.php" class="cta-button cta-button--block">Post Errand</a></p>
                    </article>
                <?php endforeach; ?>
            </div>
        </article>

        <article class="card card--compact app-listing__section">
            <div class="app-listing__section-header">
                <h3>Past Errands</h3>
                <span class="app-listing__chip"><?php echo count($pastErrands); ?></span>
            </div>
            <div class="grid grid--dashboard"><?php renderErrandCards($pastErrands); ?></div>
        </article>
    </div>
</section>
<?php
$bottomNavRole = 'client';
$bottomNavActive = 'errands';
require __DIR__ . '/includes/bottom_nav.php';
require __DIR__ . '/includes/footer.php';
?>
</body>
</html>
