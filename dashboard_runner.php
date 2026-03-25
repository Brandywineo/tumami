<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

use App\Repositories\TaskRepository;
use App\Repositories\UserRepository;
use App\Services\RunnerAvailabilityService;

requireRole(['runner', 'both']);

$userId = (int) currentUserId();
$user = ['full_name' => 'Runner'];
$trackableTaskIds = [];

try {
    require __DIR__ . '/db/database.php';
    if (isset($pdo)) {
        $taskRepo = new TaskRepository($pdo);
        $userRepo = new UserRepository($pdo);
        $user = $userRepo->findById($userId) ?? $user;
        $tasks = $taskRepo->byRunner($userId);
        $trackableTaskIds = array_values(array_map(
            static fn (array $task): int => (int) $task['id'],
            array_filter($tasks, static fn (array $t): bool => in_array($t['status'], ['accepted', 'in_progress', 'awaiting_confirmation'], true))
        ));
    }
} catch (Throwable $_e) {
    // Degraded mode: keep dashboard shell available even if database is temporarily unreachable.
}
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: ''));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Runner Dashboard | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body class="dashboard-app dashboard-app--runner">
<main class="dashboard-app__shell" aria-label="Runner dashboard app screen">
    <div class="container container--mobile-dense dashboard-app__content">
        <article class="dashboard-hero card card--compact dashboard-app__hero">
            <h2 class="dashboard-title">Welcome, <?php echo h($user['full_name'] ?? 'Runner'); ?> 🛵</h2>
            <p class="dashboard-subtitle">Live map shows your icon, nearby jobs as dots, and active client as a dot.</p>
        </article>

        <article class="card live-map-card dashboard-app__map-card">
            <div class="live-map-card__header">
                <h3 style="margin:0;">Runner Live Map</h3>
                <p class="live-map-card__status" id="runner-map-status">Connecting live feed…</p>
            </div>
            <div id="runner-live-map" class="live-map live-map--app"></div>
        </article>


    </div>
</main>
<?php
$bottomNavRole = 'runner';
$bottomNavActive = 'map';
require __DIR__ . '/includes/bottom_nav.php';
?>
<script>
window.TUMAMI_IS_AUTHENTICATED = true;
window.TUMAMI_CSRF_TOKEN = <?php echo json_encode(csrf_token(), JSON_THROW_ON_ERROR); ?>;
</script>
<script src="assets/js/header.js" defer></script>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
<script>
(() => {
    const taskIds = <?php echo json_encode($trackableTaskIds, JSON_THROW_ON_ERROR); ?>;
    const mapboxToken = <?php echo json_encode($mapboxToken, JSON_THROW_ON_ERROR); ?>;
    const mapStatusEl = document.getElementById('runner-map-status');
    const availabilityStatusEl = document.getElementById('availability-status-text');
    const availabilityUpdatedEl = document.getElementById('availability-updated-at');
    const availabilityOnBtn = document.getElementById('availability-on');
    const availabilityOffBtn = document.getElementById('availability-off');

    availabilityOnBtn?.addEventListener('click', () => setAvailability(true));
    availabilityOffBtn?.addEventListener('click', () => setAvailability(false));

    let lastSentAt = 0;
    const sendIntervalMs = 5000;
    let stream = null;

    if (!mapboxToken) {
        mapStatusEl.textContent = 'Map unavailable: MAPBOX_PUBLIC_TOKEN missing.';
        return;
    }

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

    async function refreshMap() {
        try {
            const response = await fetch('stream_runner_map.php', {
                credentials: 'same-origin',
                cache: 'no-store'
            });
            if (!response.ok) {
                throw new Error('Failed to fetch map snapshot');
            }

            const payload = await response.json();
            updateRunnerMarker(payload.runner?.latitude ?? null, payload.runner?.longitude ?? null);
            setClientDot(payload.client?.latitude ?? null, payload.client?.longitude ?? null);
            setJobsDots(payload.jobs || []);
            mapStatusEl.textContent = `Live: ${payload.jobs?.length ?? 0} jobs nearby · ${new Date().toLocaleTimeString()}`;
        } catch (_error) {
            mapStatusEl.textContent = 'Connection issue, retrying…';
        } finally {
            setTimeout(refreshMap, 5000);
        }
    }

    refreshMap();

    async function setAvailability(isAvailable) {
        if (!availabilityStatusEl || !availabilityOnBtn || !availabilityOffBtn) {
            return;
        }

        availabilityOnBtn.disabled = true;
        availabilityOffBtn.disabled = true;
        availabilityStatusEl.textContent = 'Saving availability...';

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
            if (!response.ok || !payload.ok) {
                throw new Error(payload.error || 'Failed to update availability.');
            }

            availabilityStatusEl.textContent = payload.message || (isAvailable ? 'You are now discoverable.' : 'You are now hidden from new task requests.');
            availabilityUpdatedEl.textContent = payload.status?.is_online ? 'Online now' : 'Offline (location heartbeat stale)';
            availabilityOnBtn.disabled = !!payload.status?.is_available;
            availabilityOffBtn.disabled = !payload.status?.is_available;
        } catch (_error) {
            availabilityStatusEl.textContent = 'Unable to update availability. Please try again.';
            availabilityOnBtn.disabled = false;
            availabilityOffBtn.disabled = false;
        }
    }

    if (taskIds.length === 0) {
        mapStatusEl.textContent = 'Live map ready. No accepted/in-progress/awaiting-confirmation tasks yet.';
        return;
    }

    if (!navigator.geolocation) {
        mapStatusEl.textContent = 'Geolocation is not supported on this device/browser.';
        return;
    }

    async function sendLocation(lat, lng, accuracy) {
        const now = Date.now();
        if (now - lastSentAt < sendIntervalMs) return;

        lastSentAt = now;
        try {
            const response = await fetch('runner_location_update.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ task_ids: taskIds, latitude: lat, longitude: lng, accuracy: accuracy })
            });

            if (!response.ok) throw new Error('Location update failed');
mapStatusEl.textContent = 'Live sharing enabled for active tasks.';
            updateRunnerMarker(lat, lng);
        } catch (_error) {
mapStatusEl.textContent = 'Unable to send location. Check network and keep this page open.';
        }
    }

    navigator.geolocation.watchPosition(
        (position) => sendLocation(position.coords.latitude, position.coords.longitude, position.coords.accuracy ?? null),
        () => {
mapStatusEl.textContent = 'Location permission denied or unavailable. Please allow location to enable tracking.';
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
    );
})();
</script>
</body>
</html>
