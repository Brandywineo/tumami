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

$active = array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['posted', 'accepted', 'in_progress', 'awaiting_confirmation'], true));
$completed = array_filter($tasks, static fn (array $t): bool => $t['status'] === 'completed');
$awaitingConfirmation = array_filter($tasks, static fn (array $t): bool => $t['status'] === 'awaiting_confirmation');
$recentTasks = array_slice($tasks, 0, 8);
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: 'sk.eyJ1Ijoia2VseWFuZzI1NCIsImEiOiJjbW1qaGF1ZTcxamNuMm9zNnRidXRuMXNuIn0.GlfkqzBXDj6ysfWwq2WBkA'));
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
<section class="section section--compact">
    <div class="container container--mobile-dense">
        <div class="dashboard-hero card card--compact">
            <h2 class="dashboard-title">Welcome, <?php echo h($user['full_name'] ?? 'Client'); ?> 👋</h2>
            <p class="dashboard-subtitle">Live map shows your location (blue dot) and nearby runners in real time.</p>
        </div>

        <article class="card live-map-card">
            <div class="live-map-card__header">
                <h3 style="margin:0;">Live Runner Map</h3>
                <p class="live-map-card__status" id="client-map-status">Connecting live feed…</p>
            </div>
            <div id="client-live-map" class="live-map"></div>
        </article>

        <div class="grid grid--dashboard compact-form-gap">
            <article class="card card--compact">
                <h3>Wallet</h3>
                <p class="stat-value">KES <?php echo number_format($balances['available'], 2); ?></p>
                <a class="cta-button cta-button--block" href="topup.php">Add Balance</a>
            </article>
            <article class="card card--compact">
                <h3>Quick Actions</h3>
                <div class="button-stack">
                    <a class="cta-button cta-button--block" href="post_task.php">Post Task</a>
                    <a class="cta-button cta-button--block cta-button--muted" href="active_runners.php">Choose Runner</a>
                </div>
            </article>
            <article class="card card--compact">
                <h3>Snapshot</h3>
                <p><strong>Active:</strong> <?php echo count($active); ?></p>
                <p><strong>Awaiting:</strong> <?php echo count($awaitingConfirmation); ?></p>
                <p><strong>Completed:</strong> <?php echo count($completed); ?></p>
            </article>
        </div>

        <h3 class="section-label">Live & Recent Tasks</h3>
        <div class="grid grid--dashboard">
            <?php if (!$recentTasks): ?><p>No tasks yet.</p><?php endif; ?>
            <?php foreach ($recentTasks as $task): ?>
                <article class="card card--compact">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><strong>Status:</strong> <?php echo h($task['status']); ?></p>
                    <p><strong>Area:</strong> <?php echo h($task['zone_name']); ?></p>
                    <p><strong>Runner:</strong> <?php echo h($task['runner_name'] ?? 'Unassigned'); ?></p>
                    <?php if ($task['status'] === 'awaiting_confirmation'): ?>
                        <form method="post" action="task_status.php" class="compact-form-gap">
                            <?php echo csrf_field(); ?>
                            <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                            <input type="hidden" name="status" value="completed">
                            <button class="cta-button cta-button--block" type="submit">Approve Completion</button>
                        </form>
                    <?php endif; ?>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php
$bottomNavRole = 'client';
$bottomNavActive = 'my_errands';
require __DIR__ . '/includes/bottom_nav.php';
?>
<?php require __DIR__ . '/includes/footer.php'; ?>

<link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
<script>
(() => {
    const mapboxToken = <?php echo json_encode($mapboxToken, JSON_THROW_ON_ERROR); ?>;
    const statusEl = document.getElementById('client-map-status');
    const containerId = 'client-live-map';

    if (!mapboxToken) {
        statusEl.textContent = 'Map unavailable: MAPBOX_PUBLIC_TOKEN missing.';
        return;
    }

    const getTheme = () => {
        const cookieTheme = document.cookie
            .split('; ')
            .find((row) => row.startsWith('tumami_theme='))
            ?.split('=')[1] || 'system';
        if (cookieTheme === 'dark') return 'dark';
        if (cookieTheme === 'light') return 'light';
        return (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
    };

    mapboxgl.accessToken = mapboxToken;
    const map = new mapboxgl.Map({
        container: containerId,
        style: getTheme() === 'dark' ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
        center: [36.8219, -1.2921],
        zoom: 12
    });

    const runnerMarkers = new Map();
    const clientSourceId = 'client-location';
    let sourceReady = false;
    let stream = null;
    let lastSentAt = 0;

    map.on('load', () => {
        map.addSource(clientSourceId, {
            type: 'geojson',
            data: {
                type: 'FeatureCollection',
                features: []
            }
        });

        map.addLayer({
            id: 'client-dot',
            type: 'circle',
            source: clientSourceId,
            paint: {
                'circle-radius': 6,
                'circle-color': '#3b82f6',
                'circle-stroke-color': '#ffffff',
                'circle-stroke-width': 2
            }
        });

        sourceReady = true;
    });

    function upsertClientDot(latitude, longitude) {
        if (!sourceReady || latitude === null || longitude === null) return;

        const src = map.getSource(clientSourceId);
        if (!src) return;

        src.setData({
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                geometry: { type: 'Point', coordinates: [longitude, latitude] },
                properties: {}
            }]
        });
    }

    function upsertRunnerMarkers(runners) {
        const seen = new Set();

        runners.forEach((runner) => {
            if (runner.latitude === null || runner.longitude === null) return;
            const id = Number(runner.id);
            seen.add(id);

            let marker = runnerMarkers.get(id);
            if (!marker) {
                const icon = document.createElement('div');
                icon.textContent = '🏃';
                icon.style.fontSize = '20px';
                icon.style.lineHeight = '20px';

                marker = new mapboxgl.Marker(icon)
                    .setLngLat([runner.longitude, runner.latitude])
                    .setPopup(new mapboxgl.Popup({ offset: 16 }).setHTML(`<strong>${runner.name}</strong><br>${runner.distance_km ?? '-'} km away`))
                    .addTo(map);
                runnerMarkers.set(id, marker);
            } else {
                marker.setLngLat([runner.longitude, runner.latitude]);
            }
        });

        runnerMarkers.forEach((marker, id) => {
            if (!seen.has(id)) {
                marker.remove();
                runnerMarkers.delete(id);
            }
        });
    }

    function connectStream() {
        if (stream) {
            stream.close();
        }

        stream = new EventSource('stream_client_map.php');

        stream.addEventListener('map', (event) => {
            const payload = JSON.parse(event.data);
            upsertClientDot(payload.client.latitude, payload.client.longitude);
            upsertRunnerMarkers(payload.runners || []);
            statusEl.textContent = `Live: ${payload.runners?.length ?? 0} runners nearby · ${new Date().toLocaleTimeString()}`;
        });

        stream.addEventListener('end', () => {
            statusEl.textContent = 'Refreshing live feed…';
            connectStream();
        });

        stream.onerror = () => {
            statusEl.textContent = 'Connection issue, reconnecting…';
            setTimeout(connectStream, 2000);
        };
    }

    connectStream();

    if (navigator.geolocation) {
        navigator.geolocation.watchPosition((position) => {
            const lat = Number(position.coords.latitude);
            const lng = Number(position.coords.longitude);

            upsertClientDot(lat, lng);
            const now = Date.now();
            if (now - lastSentAt < 5000) return;
            lastSentAt = now;

            fetch('client_location_update.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ latitude: lat, longitude: lng })
            }).catch(() => {
                // Keep map running even if temporary network issue.
            });
        }, () => {
            statusEl.textContent = 'Location denied. Showing map without your live blue dot.';
        }, { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 });
    }
})();
</script>
</body>
</html>
