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
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: 'sk.eyJ1Ijoia2VseWFuZzI1NCIsImEiOiJjbW1qaGF1ZTcxamNuMm9zNnRidXRuMXNuIn0.GlfkqzBXDj6ysfWwq2WBkA'));
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
<section class="section section--compact">
    <div class="container container--mobile-dense">
        <article class="dashboard-hero card card--compact">
            <h2 class="dashboard-title">Welcome, <?php echo h($user['full_name'] ?? 'Runner'); ?> 🛵</h2>
            <p class="dashboard-subtitle">Live map shows your icon, nearby jobs as dots, and active client as a dot.</p>
        </article>

        <article class="card live-map-card">
            <div class="live-map-card__header">
                <h3 style="margin:0;">Runner Live Map</h3>
                <p class="live-map-card__status" id="runner-map-status">Connecting live feed…</p>
            </div>
            <div id="runner-live-map" class="live-map"></div>
        </article>

        <div class="grid grid--dashboard compact-form-gap">
            <article class="card card--compact">
                <h3>Earnings</h3>
                <p class="stat-value">KES <?php echo number_format($balances['available'], 2); ?></p>
                <a href="settings.php" class="cta-button cta-button--block">Payout Settings</a>
            </article>
            <article class="card card--compact">
                <h3>Today</h3>
                <p><strong>Active Jobs:</strong> <?php echo count($active); ?></p>
                <p><strong>In Progress:</strong> <?php echo count($inProgress); ?></p>
                <p><strong>Open Nearby:</strong> <?php echo count($availableTasks); ?></p>
            </article>
            <article class="card card--compact">
                <h3>Location Sharing</h3>
                <p>Tracking starts at <strong>accepted</strong>.</p>
                <button class="cta-button cta-button--block" id="start-location-sharing" type="button">Enable Location Sharing</button>
                <p id="location-sharing-status" class="compact-form-gap"><?php echo $trackableTaskIds ? 'Ready to share for active tasks.' : 'No accepted/in-progress tasks right now.'; ?></p>
            </article>
        </div>

        <h3 class="section-label">My Assigned Tasks</h3>
        <div class="grid grid--dashboard">
            <?php if (!$tasks): ?><p>You have no assigned tasks.</p><?php endif; ?>
            <?php foreach ($tasks as $task): ?>
                <article class="card card--compact">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><strong>Status:</strong> <?php echo h($task['status']); ?></p>
                    <p><strong>Client:</strong> <?php echo h($task['client_name']); ?></p>
                    <p><strong>Area:</strong> <?php echo h($task['zone_name']); ?></p>
                    <?php if ($task['status'] === 'accepted'): ?>
                        <form method="post" action="task_status.php" class="compact-form-gap">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="in_progress">
                            <button class="cta-button cta-button--block" type="submit">Start Task</button>
                        </form>
                    <?php elseif ($task['status'] === 'in_progress'): ?>
                        <form method="post" action="task_status.php" class="compact-form-gap">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="awaiting_confirmation">
                            <button class="cta-button cta-button--block" type="submit">Mark Done</button>
                        </form>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>

        <p class="compact-form-gap"><a href="browse_tasks.php" class="cta-button cta-button--block">Browse & Accept Tasks</a></p>
    </div>
</section>
<?php
$bottomNavRole = 'runner';
$bottomNavActive = 'my_tasks';
require __DIR__ . '/includes/bottom_nav.php';
?>
<?php require __DIR__ . '/includes/footer.php'; ?>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
<script>
(() => {
    const taskIds = <?php echo json_encode($trackableTaskIds, JSON_THROW_ON_ERROR); ?>;
    const mapboxToken = <?php echo json_encode($mapboxToken, JSON_THROW_ON_ERROR); ?>;
    const startButton = document.getElementById('start-location-sharing');
    const statusEl = document.getElementById('location-sharing-status');
    const mapStatusEl = document.getElementById('runner-map-status');

    if (!startButton || !statusEl) {
        return;
    }

    let lastSentAt = 0;
    const sendIntervalMs = 5000;
    let stream = null;

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: 'runner-live-map',
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [36.8219, -1.2921],
        zoom: 12
    });

    let runnerMarker = null;
    const clientSourceId = 'active-client-dot';
    const jobsSourceId = 'jobs-dot-source';
    let sourceReady = false;

    map.on('load', () => {
        map.addSource(clientSourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
            id: 'active-client-dot-layer',
            type: 'circle',
            source: clientSourceId,
            paint: {
                'circle-radius': 5,
                'circle-color': '#2563eb',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
            }
        });

        map.addSource(jobsSourceId, {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
        });

        map.addLayer({
            id: 'jobs-dot-layer',
            type: 'circle',
            source: jobsSourceId,
            paint: {
                'circle-radius': 4,
                'circle-color': '#f97316',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 1
            }
        });

        sourceReady = true;
    });

    function updateRunnerMarker(lat, lng) {
        if (lat === null || lng === null) return;
        if (!runnerMarker) {
            const icon = document.createElement('div');
            icon.textContent = '🏃';
            icon.style.fontSize = '22px';
            icon.style.lineHeight = '22px';
            runnerMarker = new mapboxgl.Marker(icon).setLngLat([lng, lat]).addTo(map);
        } else {
            runnerMarker.setLngLat([lng, lat]);
        }
    }

    function setClientDot(lat, lng) {
        if (!sourceReady) return;
        const src = map.getSource(clientSourceId);
        if (!src) return;
        src.setData({
            type: 'FeatureCollection',
            features: (lat !== null && lng !== null)
                ? [{ type: 'Feature', geometry: { type: 'Point', coordinates: [lng, lat] }, properties: {} }]
                : []
        });
    }

    function setJobsDots(jobs) {
        if (!sourceReady) return;
        const src = map.getSource(jobsSourceId);
        if (!src) return;

        const features = (jobs || []).map((job) => ({
            type: 'Feature',
            geometry: { type: 'Point', coordinates: [job.longitude, job.latitude] },
            properties: { id: job.id, title: job.title }
        }));

        src.setData({ type: 'FeatureCollection', features });
    }

    function connectStream() {
        if (stream) stream.close();
        stream = new EventSource('stream_runner_map.php');

        stream.addEventListener('map', (event) => {
            const payload = JSON.parse(event.data);
            updateRunnerMarker(payload.runner.latitude, payload.runner.longitude);
            setClientDot(payload.client.latitude, payload.client.longitude);
            setJobsDots(payload.jobs);
            mapStatusEl.textContent = `Live: ${payload.jobs?.length ?? 0} jobs nearby · ${new Date().toLocaleTimeString()}`;
        });

        stream.addEventListener('end', () => {
            mapStatusEl.textContent = 'Refreshing live feed…';
            connectStream();
        });

        stream.onerror = () => {
            mapStatusEl.textContent = 'Connection issue, reconnecting…';
            setTimeout(connectStream, 2000);
        };
    }

    connectStream();

    if (taskIds.length === 0) {
        startButton.disabled = true;
        startButton.style.opacity = '0.6';
        startButton.style.cursor = 'not-allowed';
        return;
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
            updateRunnerMarker(lat, lng);
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
            (position) => sendLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy ?? null),
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
