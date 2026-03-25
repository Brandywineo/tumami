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

function renderErrands(array $items): void
{
    if ($items === []) {
        echo '<p>No errands in this section yet.</p>';
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
<section class="section section--compact">
    <div class="container container--mobile-dense">
        <h2>Errands</h2>

        <h3 class="section-label">Active Errands</h3>
        <div class="grid"><?php renderErrands($activeErrands); ?></div>

        <h3 class="section-label">Past Errands</h3>
        <div class="grid"><?php renderErrands($pastErrands); ?></div>

        <h3 class="section-label">Active Runners Nearby</h3>
        <div class="grid">
            <?php if ($runners === []): ?>
                <p>No active runners found in your area right now.</p>
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
                    <p><a href="post_task.php" class="cta-button">Post Errand</a></p>
                </article>
            <?php endforeach; ?>
        </div>
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
