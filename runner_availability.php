<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;
use App\Services\RunnerAvailabilityService;

requireRole(['runner', 'both']);

$userId = (int) currentUserId();
$userRepo = new UserRepository($pdo);
$service = new RunnerAvailabilityService($userRepo);
$user = $userRepo->findById($userId);
$status = $service->status($userId);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Runner Availability | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section section--compact">
    <div class="container container--mobile-dense" style="max-width:760px;">
        <article class="dashboard-hero card card--compact" style="margin-bottom:12px;">
            <h2 class="dashboard-title">Availability Status</h2>
            <p class="dashboard-subtitle">Manage discoverability for new tasks.</p>
        </article>

        <article class="card card--compact">
            <h3 style="margin:0 0 8px;">Hello, <?php echo h($user['full_name'] ?? 'Runner'); ?></h3>
            <p id="availability-status-text" style="margin:0 0 10px;">
                <?php if ($status['is_available']): ?>You are discoverable for new tasks.<?php else: ?>You are hidden from new task requests.<?php endif; ?>
            </p>
            <div class="button-stack">
                <button class="cta-button cta-button--block" type="button" id="availability-on" <?php echo $status['is_available'] ? 'disabled' : ''; ?>>Go Available</button>
                <button class="cta-button cta-button--block cta-button--muted" type="button" id="availability-off" <?php echo !$status['is_available'] ? 'disabled' : ''; ?>>Go Unavailable</button>
            </div>
            <p id="availability-updated-at" class="dashboard-app__status-chip" style="margin-top:8px; text-align:left;">
                <?php echo $status['is_online'] ? 'Online now' : 'Offline (location heartbeat stale)'; ?>
            </p>
        </article>
    </div>
</section>
<?php
$bottomNavRole = 'runner';
$bottomNavActive = 'settings';
require __DIR__ . '/includes/bottom_nav.php';
require __DIR__ . '/includes/footer.php';
?>
<script>
window.TUMAMI_CSRF_TOKEN = <?php echo json_encode(csrf_token(), JSON_THROW_ON_ERROR); ?>;
(() => {
    const csrfToken = window.TUMAMI_CSRF_TOKEN || '';
    const statusEl = document.getElementById('availability-status-text');
    const updatedEl = document.getElementById('availability-updated-at');
    const onBtn = document.getElementById('availability-on');
    const offBtn = document.getElementById('availability-off');

    async function setAvailability(isAvailable) {
        if (!statusEl || !onBtn || !offBtn) return;
        onBtn.disabled = true;
        offBtn.disabled = true;
        statusEl.textContent = 'Saving availability...';

        try {
            const response = await fetch('runner_availability_update.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-Token': csrfToken
                },
                credentials: 'same-origin',
                body: JSON.stringify({ is_available: isAvailable })
            });
            const payload = await response.json();
            if (!response.ok || !payload.ok) throw new Error(payload.error || 'Failed to update availability.');

            statusEl.textContent = payload.message || (isAvailable ? 'You are now discoverable.' : 'You are now hidden from new task requests.');
            updatedEl.textContent = payload.status?.is_online ? 'Online now' : 'Offline (location heartbeat stale)';
            onBtn.disabled = !!payload.status?.is_available;
            offBtn.disabled = !payload.status?.is_available;
        } catch (_error) {
            statusEl.textContent = 'Unable to update availability. Please try again.';
            onBtn.disabled = false;
            offBtn.disabled = false;
        }
    }

    onBtn?.addEventListener('click', () => setAvailability(true));
    offBtn?.addEventListener('click', () => setAvailability(false));
})();
</script>
</body>
</html>
