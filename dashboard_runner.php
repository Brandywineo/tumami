<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Repositories\UserRepository;
use App\Services\WalletService;

requireRole(['runner', 'both']);

$userId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);
$userRepo = new UserRepository($pdo);
$walletService = new WalletService($pdo);

$user = $userRepo->findById($userId);
$tasks = $taskRepo->byRunner($userId);
$availableTasks = $taskRepo->browsePostedForRunner($userId);
$active = array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true));
$inProgress = array_filter($tasks, static fn (array $t): bool => $t['status'] === 'in_progress');
$balances = $walletService->balances($userId);

$trackableTaskIds = array_values(array_map(
    static fn (array $task): int => (int) $task['id'],
    array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['accepted', 'in_progress'], true))
));
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
        <article class="card" style="margin-bottom:18px;">
            <h2 style="text-align:left; margin:0;">Welcome, <?php echo h($user['full_name'] ?? 'Runner'); ?> 🛵</h2>
            <p style="margin:8px 0 0;">Track jobs, share your live location, and manage your earnings.</p>
        </article>

        <div class="grid" style="margin-bottom:18px;">
            <article class="card">
                <h3>Available Balance</h3>
                <p style="font-size:28px; margin:8px 0 14px;"><strong>KES <?php echo number_format($balances['available'], 2); ?></strong></p>
                <a href="settings.php" class="cta-button">Payout Settings</a>
            </article>
            <article class="card">
                <h3>Performance</h3>
                <p><strong>Active Jobs:</strong> <?php echo count($active); ?></p>
                <p><strong>In Progress:</strong> <?php echo count($inProgress); ?></p>
                <p><strong>Open Tasks Nearby:</strong> <?php echo count($availableTasks); ?></p>
            </article>
            <article class="card">
                <h3>Location Sharing</h3>
                <p>Tracking starts at <strong>accepted</strong>. Keep this page open while actively running tasks.</p>
                <button class="cta-button" id="start-location-sharing" type="button">Enable Location Sharing</button>
                <p id="location-sharing-status" style="margin-top:10px;"><?php echo $trackableTaskIds ? 'Ready to share for active tasks.' : 'No accepted/in-progress tasks to share right now.'; ?></p>
            </article>
        </div>

        <h3 style="margin-top:0;">My Assigned Tasks</h3>
        <div class="grid">
            <?php if (!$tasks): ?><p>You have no assigned tasks.</p><?php endif; ?>
            <?php foreach ($tasks as $task): ?>
                <article class="card">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><strong>Status:</strong> <?php echo h($task['status']); ?></p>
                    <p><strong>Client:</strong> <?php echo h($task['client_name']); ?></p>
                    <p><strong>Service Area:</strong> <?php echo h($task['zone_name']); ?></p>
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
<script>
(() => {
    const taskIds = <?php echo json_encode($trackableTaskIds, JSON_THROW_ON_ERROR); ?>;
    const startButton = document.getElementById('start-location-sharing');
    const statusEl = document.getElementById('location-sharing-status');

    if (!startButton || !statusEl || taskIds.length === 0) {
        if (startButton) {
            startButton.disabled = true;
            startButton.style.opacity = '0.6';
            startButton.style.cursor = 'not-allowed';
        }
        return;
    }

    let lastSentAt = 0;
    const sendIntervalMs = 5000;

    async function sendLocation(lat, lng, accuracy) {
        const now = Date.now();
        if (now - lastSentAt < sendIntervalMs) {
            return;
        }

        lastSentAt = now;
        statusEl.textContent = 'Sharing live location…';

        try {
            const response = await fetch('runner_location_update.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({
                    task_ids: taskIds,
                    latitude: lat,
                    longitude: lng,
                    accuracy: accuracy
                })
            });

            if (!response.ok) {
                throw new Error('Location update failed');
            }

            statusEl.textContent = 'Location shared successfully.';
        } catch (_error) {
            statusEl.textContent = 'Unable to send location. Check your network and keep this page open.';
        }
    }

    startButton.addEventListener('click', () => {
        if (!navigator.geolocation) {
            statusEl.textContent = 'Geolocation is not supported on this device/browser.';
            return;
        }

        startButton.disabled = true;
        startButton.style.opacity = '0.6';
        statusEl.textContent = 'Requesting location permission…';

        navigator.geolocation.watchPosition(
            (position) => {
                sendLocation(
                    position.coords.latitude,
                    position.coords.longitude,
                    position.coords.accuracy ?? null
                );
            },
            () => {
                statusEl.textContent = 'Location permission denied or unavailable. Please allow location to enable tracking.';
                startButton.disabled = false;
                startButton.style.opacity = '1';
            },
            { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
        );
    });
})();
</script>
</body>
</html>
