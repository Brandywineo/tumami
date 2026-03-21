<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Repositories\UserRepository;
use App\Services\WalletService;

requireRole(['client', 'both']);

$userId = (int) currentUserId();
$taskRepo = new TaskRepository($pdo);
$userRepo = new UserRepository($pdo);
$walletService = new WalletService($pdo);

$user = $userRepo->findById($userId);
$tasks = $taskRepo->byClient($userId);
$balances = $walletService->balances($userId);
$active = array_values(array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['posted', 'accepted', 'in_progress', 'awaiting_confirmation'], true)));
$completed = array_values(array_filter($tasks, static fn (array $t): bool => $t['status'] === 'completed'));
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: ''));

$taskMapData = array_map(static function (array $task): array {
    return [
        'id' => (int) $task['id'],
        'title' => (string) $task['title'],
        'status' => (string) $task['status'],
        'zone_name' => (string) ($task['zone_name'] ?? ''),
        'runner_name' => $task['runner_name'] !== null ? (string) $task['runner_name'] : null,
        'runner_id' => $task['runner_id'] !== null ? (int) $task['runner_id'] : null,
        'pickup_latitude' => $task['pickup_latitude'] !== null ? (float) $task['pickup_latitude'] : null,
        'pickup_longitude' => $task['pickup_longitude'] !== null ? (float) $task['pickup_longitude'] : null,
        'dropoff_latitude' => $task['dropoff_latitude'] !== null ? (float) $task['dropoff_latitude'] : null,
        'dropoff_longitude' => $task['dropoff_longitude'] !== null ? (float) $task['dropoff_longitude'] : null,
        'client_latitude' => $task['client_latitude'] !== null ? (float) $task['client_latitude'] : null,
        'client_longitude' => $task['client_longitude'] !== null ? (float) $task['client_longitude'] : null,
    ];
}, $tasks);
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
<section class="app-shell">
    <div class="container app-shell__container">
        <div class="app-screen">
            <div class="app-map-panel">
                <div id="client-dashboard-map" class="app-map-canvas"></div>
                <div class="app-map-overlay">
                    <article class="map-status-card">
                        <p class="eyebrow">Client view</p>
                        <h2>Welcome, <?php echo h($user['full_name'] ?? 'Client'); ?> 👋</h2>
                        <p id="client-map-summary">Track runners and focus errands from a single live map.</p>
                    </article>
                </div>
            </div>

            <aside class="app-sheet">
                <div class="app-sheet__topbar">
                    <div>
                        <p class="eyebrow">Wallet</p>
                        <div class="sheet-balance">KES <?php echo number_format($balances['available'], 2); ?></div>
                    </div>
                    <a class="cta-button" href="topup.php">Add Balance</a>
                </div>

                <div class="sheet-action-row compact-form-gap">
                    <a class="cta-button cta-button--block" href="post_task.php">Post Task</a>
                    <a class="cta-button cta-button--block cta-button--muted" href="active_runners.php">Choose Runner</a>
                </div>

                <div class="sheet-stats compact-form-gap">
                    <div class="sheet-stat-card">
                        <span>Active</span>
                        <strong><?php echo count($active); ?></strong>
                    </div>
                    <div class="sheet-stat-card">
                        <span>Completed</span>
                        <strong><?php echo count($completed); ?></strong>
                    </div>
                    <div class="sheet-stat-card">
                        <span>Total</span>
                        <strong><?php echo count($tasks); ?></strong>
                    </div>
                </div>

                <div class="app-sheet__section">
                    <div class="app-sheet__section-head">
                        <h3>Task Queue</h3>
                        <span><?php echo count($tasks); ?> tasks</span>
                    </div>
                    <div class="task-feed">
                        <?php if (!$tasks): ?><p>No tasks yet.</p><?php endif; ?>
                        <?php foreach ($tasks as $task): ?>
                            <article class="task-feed__item<?php echo in_array($task['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true) ? ' task-feed__item--live' : ''; ?>" data-task-card-id="<?php echo (int) $task['id']; ?>">
                                <div>
                                    <h4><?php echo h($task['title']); ?></h4>
                                    <p><?php echo h($task['status']); ?> · <?php echo h($task['zone_name']); ?></p>
                                    <p>Runner: <?php echo h($task['runner_name'] ?? 'Unassigned'); ?></p>
                                </div>
                                <div class="task-feed__actions">
                                    <button class="cta-button cta-button--ghost focus-task-map" type="button" data-task-id="<?php echo (int) $task['id']; ?>">Show</button>
                                    <?php if ($task['runner_id'] !== null && in_array($task['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true)): ?>
                                        <button class="cta-button check-runner-location" type="button" data-task-id="<?php echo (int) $task['id']; ?>">Track</button>
                                    <?php endif; ?>
                                    <?php if ($task['status'] === 'awaiting_confirmation'): ?>
                                        <form method="post" action="task_status.php">
                                            <?php echo csrf_field(); ?>
                                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                                            <input type="hidden" name="status" value="completed">
                                            <button class="cta-button cta-button--muted" type="submit">Approve</button>
                                        </form>
                                    <?php endif; ?>
                                </div>
                            </article>
                        <?php endforeach; ?>
                    </div>
                </div>
            </aside>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
<script>
(() => {
    const mapboxToken = <?php echo json_encode($mapboxToken, JSON_THROW_ON_ERROR); ?>;
    const tasks = <?php echo json_encode($taskMapData, JSON_THROW_ON_ERROR); ?>;
    const focusButtons = document.querySelectorAll('.focus-task-map');
    const trackButtons = document.querySelectorAll('.check-runner-location');
    const summaryEl = document.getElementById('client-map-summary');
    const mapHost = document.getElementById('client-dashboard-map');

    if (!mapHost) {
        return;
    }

    if (!mapboxToken) {
        mapHost.innerHTML = '<div class="map-empty-state">Map unavailable: missing MAPBOX_PUBLIC_TOKEN.</div>';
        return;
    }

    const getTheme = () => {
        const cookieTheme = document.cookie.split('; ').find((row) => row.startsWith('tumami_theme='))?.split('=')[1] || 'system';
        if (cookieTheme === 'dark') return 'dark';
        if (cookieTheme === 'light') return 'light';
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    };

    const styleByTheme = () => getTheme() === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12';
    const firstTask = tasks.find((task) => task.runner_id !== null) || tasks[0] || null;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: 'client-dashboard-map',
        style: styleByTheme(),
        center: [36.8219, -1.2921],
        zoom: 12
    });

    let pickupMarker = null;
    let dropoffMarker = null;
    let clientMarker = null;
    let runnerMarker = null;
    let runnerPoller = null;
    let activeTaskId = firstTask ? firstTask.id : null;

    function clearRunnerPolling() {
        if (runnerPoller !== null) {
            clearInterval(runnerPoller);
            runnerPoller = null;
        }
    }

    function setMarker(marker, lng, lat, color, fallbackLabel) {
        if (lng === null || lat === null) {
            if (marker) {
                marker.remove();
            }
            return null;
        }

        if (!marker) {
            if (fallbackLabel) {
                const el = document.createElement('div');
                el.textContent = fallbackLabel;
                el.style.fontSize = '24px';
                marker = new mapboxgl.Marker(el);
            } else {
                marker = new mapboxgl.Marker({ color });
            }
            marker.setLngLat([lng, lat]).addTo(map);
            return marker;
        }

        marker.setLngLat([lng, lat]);
        return marker;
    }

    function fitTask(task) {
        const points = [
            [task.client_longitude, task.client_latitude],
            [task.pickup_longitude, task.pickup_latitude],
            [task.dropoff_longitude, task.dropoff_latitude]
        ].filter((point) => point[0] !== null && point[1] !== null);

        if (points.length === 0) {
            return;
        }

        if (points.length === 1) {
            map.flyTo({ center: points[0], zoom: 14 });
            return;
        }

        const bounds = new mapboxgl.LngLatBounds(points[0], points[0]);
        points.slice(1).forEach((point) => bounds.extend(point));
        map.fitBounds(bounds, { padding: 50, duration: 700 });
    }

    async function pollRunner(taskId) {
        clearRunnerPolling();
        const poll = async () => {
            try {
                const response = await fetch(`runner_location.php?task_id=${encodeURIComponent(taskId)}`, { credentials: 'same-origin' });
                if (!response.ok) {
                    return;
                }
                const payload = await response.json();
                runnerMarker = setMarker(runnerMarker, payload.longitude, payload.latitude, null, '🏃');
                if (payload.longitude !== null && payload.latitude !== null) {
                    summaryEl.textContent = `Runner live for task #${taskId}. Last update: ${payload.location_updated_at ?? 'unknown'}.`;
                }
            } catch (_error) {
                // ignore transient polling failures
            }
        };

        await poll();
        runnerPoller = setInterval(poll, 5000);
    }

    function focusTask(taskId, trackRunner = false) {
        const task = tasks.find((entry) => entry.id === taskId);
        if (!task) {
            return;
        }

        activeTaskId = taskId;
        document.querySelectorAll('[data-task-card-id]').forEach((card) => {
            card.classList.toggle('task-feed__item--selected', Number(card.getAttribute('data-task-card-id')) === taskId);
        });

        clientMarker = setMarker(clientMarker, task.client_longitude, task.client_latitude, '#0a66c2');
        pickupMarker = setMarker(pickupMarker, task.pickup_longitude, task.pickup_latitude, '#2563eb');
        dropoffMarker = setMarker(dropoffMarker, task.dropoff_longitude, task.dropoff_latitude, '#059669');
        summaryEl.textContent = `${task.title} · ${task.status} · ${task.zone_name}`;
        fitTask(task);

        if (trackRunner && task.runner_id !== null) {
            pollRunner(taskId);
        } else {
            clearRunnerPolling();
        }
    }

    focusButtons.forEach((button) => {
        button.addEventListener('click', () => focusTask(Number(button.getAttribute('data-task-id'))));
    });

    trackButtons.forEach((button) => {
        button.addEventListener('click', () => focusTask(Number(button.getAttribute('data-task-id')), true));
    });

    map.on('load', () => {
        if (firstTask) {
            focusTask(firstTask.id, firstTask.runner_id !== null);
        }
    });
})();
</script>
</body>
</html>
