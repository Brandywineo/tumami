<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;

requireRole(['client', 'both']);

$userId = (int) currentUserId();
$userRepo = new UserRepository($pdo);

$user = $userRepo->findById($userId);
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: ''));
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Client Dashboard | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body class="dashboard-app dashboard-app--client">
<main class="dashboard-app__shell" aria-label="Client dashboard app screen">
    <div class="container container--mobile-dense dashboard-app__content">
        <div class="dashboard-hero card card--compact dashboard-app__hero">
            <h2 class="dashboard-title">Welcome, <?php echo h($user['full_name'] ?? 'Client'); ?> 👋</h2>
            <p class="dashboard-subtitle">Live map shows your location (blue dot) and nearby runners in real time.</p>
        </div>

        <article class="card live-map-card dashboard-app__map-card">
            <div class="live-map-card__header">
                <h3 style="margin:0;">Live Runner Map</h3>
                <p class="live-map-card__status" id="client-map-status">Connecting live feed…</p>
            </div>
            <div id="client-live-map" class="live-map live-map--app"></div>
        </article>
    </div>
</main>
<?php
$bottomNavRole = 'client';
$bottomNavActive = 'my_errands';
require __DIR__ . '/includes/bottom_nav.php';
?>
<script>
window.TUMAMI_IS_AUTHENTICATED = true;
</script>
<script src="assets/js/header.js" defer></script>
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

    if (!navigator.geolocation) {
        statusEl.textContent = 'Geolocation unavailable on this browser.';
        return;
    }

    navigator.geolocation.watchPosition(
        async (position) => {
            const now = Date.now();
            if (now - lastSentAt < 5000) return;
            lastSentAt = now;

            const latitude = position.coords.latitude;
            const longitude = position.coords.longitude;
            const accuracy = position.coords.accuracy ?? null;

            upsertClientDot(latitude, longitude);

            try {
                await fetch('client_location_update.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'same-origin',
                    body: JSON.stringify({ latitude, longitude, accuracy })
                });
            } catch (_error) {
                // Passive failure: live stream still shows latest known position.
            }
        },
        () => {
            statusEl.textContent = 'Allow location permission to show your live dot accurately.';
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );
})();
</script>
</body>
</html>
