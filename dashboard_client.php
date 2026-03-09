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
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: ''));
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
        <p>
            <a class="cta-button" href="post_task.php">Post New Task</a>
            <a class="cta-button" href="active_runners.php" style="margin-left:12px;">View Active Runners</a>
        </p>
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
                    <p><strong>Service Area:</strong> <?php echo h($task['zone_name']); ?></p>
                    <p><strong>Client Area:</strong> <?php echo h($task['client_zone_name'] ?? 'N/A'); ?></p>
                    <p><strong>Runner:</strong> <?php echo h($task['runner_name'] ?? 'Unassigned'); ?></p>
                    <?php if ($task['runner_id'] !== null && in_array($task['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true)): ?>
                        <button
                            class="cta-button check-runner-location"
                            type="button"
                            data-task-id="<?php echo (int) $task['id']; ?>"
                            style="margin-top:8px;"
                        >Check Runner Location</button>
                    <?php endif; ?>
                    <?php if ($task['status'] === 'awaiting_confirmation'): ?>
                        <form method="post" action="task_status.php">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="completed">
                            <button class="cta-button" type="submit">Approve Completion</button>
                        </form>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>

<link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
<script>
(() => {
    const mapboxToken = <?php echo json_encode($mapboxToken, JSON_THROW_ON_ERROR); ?>;
    const buttons = document.querySelectorAll('.check-runner-location');

    if (!buttons.length) {
        return;
    }

    const modal = document.createElement('div');
    modal.style.position = 'fixed';
    modal.style.inset = '0';
    modal.style.background = 'rgba(0, 0, 0, 0.6)';
    modal.style.display = 'none';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1000';

    modal.innerHTML = `
        <div style="background:#fff; width:min(95vw, 900px); border-radius:12px; overflow:hidden;">
            <div style="padding:12px 16px; border-bottom:1px solid #ececec; display:flex; justify-content:space-between; align-items:center;">
                <h3 style="margin:0;">Runner Location</h3>
                <button id="close-tracker" class="cta-button" type="button">Close</button>
            </div>
            <div id="tracker-loading" style="padding:10px 16px;">Loading runner location…</div>
            <div id="tracker-status" style="padding:0 16px 10px; color:#555;"></div>
            <div id="task-runner-map" style="width:100%; height:460px;"></div>
        </div>
    `;

    document.body.appendChild(modal);

    const closeButton = modal.querySelector('#close-tracker');
    const loadingEl = modal.querySelector('#tracker-loading');
    const statusEl = modal.querySelector('#tracker-status');

    let map = null;
    let runnerMarker = null;
    let activeTaskId = null;
    let pollingTimer = null;

    function clearPolling() {
        if (pollingTimer !== null) {
            clearInterval(pollingTimer);
            pollingTimer = null;
        }
    }

    function closeModal() {
        clearPolling();
        modal.style.display = 'none';
        activeTaskId = null;
        statusEl.textContent = '';
        loadingEl.textContent = 'Loading runner location…';
        loadingEl.style.display = 'block';
    }

    closeButton.addEventListener('click', closeModal);
    modal.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeModal();
        }
    });

    function ensureMap() {
        if (map !== null) {
            return;
        }

        if (!mapboxToken) {
            loadingEl.textContent = 'Map is unavailable: missing MAPBOX_PUBLIC_TOKEN.';
            return;
        }

        mapboxgl.accessToken = mapboxToken;
        map = new mapboxgl.Map({
            container: 'task-runner-map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: [36.8219, -1.2921],
            zoom: 13
        });

        const iconElement = document.createElement('div');
        iconElement.textContent = '🏃';
        iconElement.style.fontSize = '30px';
        iconElement.style.lineHeight = '30px';
        runnerMarker = new mapboxgl.Marker(iconElement)
            .setLngLat([36.8219, -1.2921])
            .addTo(map);
    }

    async function loadRunnerLocation() {
        if (!activeTaskId) {
            return;
        }

        if (!navigator.onLine) {
            loadingEl.style.display = 'block';
            loadingEl.textContent = 'Loading runner location… network disconnected.';
            statusEl.textContent = 'Waiting for internet connection.';
            return;
        }

        try {
            const response = await fetch(`runner_location.php?task_id=${encodeURIComponent(activeTaskId)}`, {
                credentials: 'same-origin'
            });

            if (!response.ok) {
                throw new Error('Unable to fetch location');
            }

            const payload = await response.json();

            if (payload.latitude === null || payload.longitude === null) {
                loadingEl.style.display = 'block';
                loadingEl.textContent = 'Loading runner location…';
                statusEl.textContent = 'Runner has not shared a GPS fix yet.';
                return;
            }

            loadingEl.style.display = 'none';
            runnerMarker.setLngLat([payload.longitude, payload.latitude]);
            map.setCenter([payload.longitude, payload.latitude]);

            const freshness = payload.within_grace_period
                ? 'Live (updated within 1 minute)'
                : 'Location may be stale (older than 1 minute).';
            statusEl.textContent = `${freshness} Last update: ${payload.location_updated_at ?? 'unknown'}`;
        } catch (_error) {
            loadingEl.style.display = 'block';
            loadingEl.textContent = 'Loading runner location…';
            statusEl.textContent = 'Network issue while fetching location. Retrying automatically.';
        }
    }

    buttons.forEach((button) => {
        button.addEventListener('click', () => {
            activeTaskId = button.getAttribute('data-task-id');
            modal.style.display = 'flex';
            ensureMap();
            if (!map) {
                return;
            }

            clearPolling();
            loadRunnerLocation();
            pollingTimer = setInterval(loadRunnerLocation, 5000);
            setTimeout(() => map.resize(), 100);
        });
    });
})();
</script>
</body>
</html>
