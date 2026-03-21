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
$active = array_values(array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true)));
$inProgress = array_values(array_filter($tasks, static fn (array $t): bool => $t['status'] === 'in_progress'));
$balances = $walletService->balances($userId);
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: ''));

$trackableTaskIds = array_values(array_map(
    static fn (array $task): int => (int) $task['id'],
    array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['accepted', 'in_progress'], true))
));

$taskMapData = array_map(static function (array $task): array {
    return [
        'id' => (int) $task['id'],
        'title' => (string) $task['title'],
        'status' => (string) $task['status'],
        'zone_name' => (string) ($task['zone_name'] ?? ''),
        'client_name' => (string) ($task['client_name'] ?? ''),
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
    <title>Runner Dashboard | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="app-shell">
    <div class="container app-shell__container">
        <div class="app-screen">
            <div class="app-map-panel">
                <div id="runner-dashboard-map" class="app-map-canvas"></div>
                <div class="app-map-overlay">
                    <article class="map-status-card">
                        <p class="eyebrow">Runner view</p>
                        <h2>Welcome, <?php echo h($user['full_name'] ?? 'Runner'); ?> 🛵</h2>
                        <p id="runner-map-summary">Stay on one live operations screen while sharing your route.</p>
                    </article>
                </div>
            </div>

            <aside class="app-sheet">
                <div class="app-sheet__topbar">
                    <div>
                        <p class="eyebrow">Earnings</p>
                        <div class="sheet-balance">KES <?php echo number_format($balances['available'], 2); ?></div>
                    </div>
                    <a class="cta-button" href="browse_tasks.php">Find Tasks</a>
                </div>

                <div class="sheet-stats compact-form-gap">
                    <div class="sheet-stat-card"><span>Active</span><strong><?php echo count($active); ?></strong></div>
                    <div class="sheet-stat-card"><span>In Progress</span><strong><?php echo count($inProgress); ?></strong></div>
                    <div class="sheet-stat-card"><span>Nearby</span><strong><?php echo count($availableTasks); ?></strong></div>
                </div>

                <div class="app-sheet__section compact-form-gap">
                    <div class="app-sheet__section-head">
                        <h3>Live Controls</h3>
                        <span><?php echo count($trackableTaskIds); ?> trackable</span>
                    </div>
                    <button class="cta-button cta-button--block" id="start-location-sharing" type="button">Enable Location Sharing</button>
                    <p id="location-sharing-status" class="compact-form-gap"><?php echo $trackableTaskIds ? 'Ready to share for active tasks.' : 'No accepted/in-progress tasks right now.'; ?></p>
                </div>

                <div class="app-sheet__section">
                    <div class="app-sheet__section-head">
                        <h3>Assignments</h3>
                        <span><?php echo count($tasks); ?> tasks</span>
                    </div>
                    <div class="task-feed">
                        <?php if (!$tasks): ?><p>You have no assigned tasks.</p><?php endif; ?>
                        <?php foreach ($tasks as $task): ?>
                            <article class="task-feed__item<?php echo in_array($task['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true) ? ' task-feed__item--live' : ''; ?>" data-task-card-id="<?php echo (int) $task['id']; ?>">
                                <div>
                                    <h4><?php echo h($task['title']); ?></h4>
                                    <p><?php echo h($task['status']); ?> · <?php echo h($task['zone_name']); ?></p>
                                    <p>Client: <?php echo h($task['client_name']); ?></p>
                                </div>
                                <div class="task-feed__actions">
                                    <button class="cta-button cta-button--ghost focus-runner-task" type="button" data-task-id="<?php echo (int) $task['id']; ?>">Show</button>
                                    <?php if ($task['status'] === 'accepted'): ?>
                                        <form method="post" action="task_status.php">
                                            <?php echo csrf_field(); ?>
                                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                                            <input type="hidden" name="status" value="in_progress">
                                            <button class="cta-button" type="submit">Start</button>
                                        </form>
                                    <?php elseif ($task['status'] === 'in_progress'): ?>
                                        <form method="post" action="task_status.php">
                                            <?php echo csrf_field(); ?>
                                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                                            <input type="hidden" name="status" value="awaiting_confirmation">
                                            <button class="cta-button cta-button--muted" type="submit">Done</button>
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
    const taskIds = <?php echo json_encode($trackableTaskIds, JSON_THROW_ON_ERROR); ?>;
    const tasks = <?php echo json_encode($taskMapData, JSON_THROW_ON_ERROR); ?>;
    const mapboxToken = <?php echo json_encode($mapboxToken, JSON_THROW_ON_ERROR); ?>;
    const startButton = document.getElementById('start-location-sharing');
    const statusEl = document.getElementById('location-sharing-status');
    const summaryEl = document.getElementById('runner-map-summary');
    const focusButtons = document.querySelectorAll('.focus-runner-task');
    const mapHost = document.getElementById('runner-dashboard-map');

    let currentMarker = null;
    let pickupMarker = null;
    let dropoffMarker = null;
    let lastSentAt = 0;
    const sendIntervalMs = 5000;

    if (!mapboxToken) {
        mapHost.innerHTML = '<div class="map-empty-state">Map unavailable: missing MAPBOX_PUBLIC_TOKEN.</div>';
    }

    const getTheme = () => {
        const cookieTheme = document.cookie.split('; ').find((row) => row.startsWith('tumami_theme='))?.split('=')[1] || 'system';
        if (cookieTheme === 'dark') return 'dark';
        if (cookieTheme === 'light') return 'light';
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    };

    let map = null;
    if (mapboxToken) {
        mapboxgl.accessToken = mapboxToken;
        map = new mapboxgl.Map({
            container: 'runner-dashboard-map',
            style: getTheme() === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
            center: [36.8219, -1.2921],
            zoom: 12
        });
    }

    function setMarker(marker, lng, lat, color, label) {
        if (!map) {
            return marker;
        }

        if (lng === null || lat === null) {
            if (marker) {
                marker.remove();
            }
            return null;
        }

        if (!marker) {
            if (label) {
                const el = document.createElement('div');
                el.textContent = label;
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
        if (!map) {
            return;
        }

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

    function focusTask(taskId) {
        const task = tasks.find((entry) => entry.id === taskId);
        if (!task) {
            return;
        }

        document.querySelectorAll('[data-task-card-id]').forEach((card) => {
            card.classList.toggle('task-feed__item--selected', Number(card.getAttribute('data-task-card-id')) === taskId);
        });

        pickupMarker = setMarker(pickupMarker, task.pickup_longitude, task.pickup_latitude, '#2563eb');
        dropoffMarker = setMarker(dropoffMarker, task.dropoff_longitude, task.dropoff_latitude, '#059669');
        summaryEl.textContent = `${task.title} · ${task.status} · ${task.zone_name}`;
        fitTask(task);
    }

    async function sendLocation(lat, lng, accuracy) {
        const now = Date.now();
        if (now - lastSentAt < sendIntervalMs) return;
        lastSentAt = now;
        statusEl.textContent = 'Sharing live location…';

        try {
            const response = await fetch('runner_location_update.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ task_ids: taskIds, latitude: lat, longitude: lng, accuracy: accuracy })
            });

            if (!response.ok) throw new Error('Location update failed');
            statusEl.textContent = 'Location shared successfully.';
        } catch (_error) {
            statusEl.textContent = 'Unable to send location. Check your network and keep this page open.';
        }
    }

    focusButtons.forEach((button) => {
        button.addEventListener('click', () => focusTask(Number(button.getAttribute('data-task-id'))));
    });

    if (tasks[0]) {
        if (map) {
            map.on('load', () => focusTask(tasks[0].id));
        } else {
            focusTask(tasks[0].id);
        }
    }

    if (!startButton || !statusEl || taskIds.length === 0) {
        if (startButton) {
            startButton.disabled = true;
            startButton.style.opacity = '0.6';
            startButton.style.cursor = 'not-allowed';
        }
        return;
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
                currentMarker = setMarker(currentMarker, position.coords.longitude, position.coords.latitude, null, '🛵');
                if (map) {
                    map.easeTo({ center: [position.coords.longitude, position.coords.latitude], duration: 600 });
                }
                sendLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy ?? null);
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
