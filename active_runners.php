<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;

requireRole(['client', 'both']);

$zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
$sort = $_GET['sort'] ?? 'rating';
if (!in_array($sort, ['rating', 'tasks', 'fee_low'], true)) {
    $sort = 'rating';
}

$lat = isset($_GET['lat']) && $_GET['lat'] !== '' ? (float) $_GET['lat'] : null;
$lng = isset($_GET['lng']) && $_GET['lng'] !== '' ? (float) $_GET['lng'] : null;
if ($lat !== null && ($lat < -90 || $lat > 90)) {
    $lat = null;
}
if ($lng !== null && ($lng < -180 || $lng > 180)) {
    $lng = null;
}

$userRepo = new UserRepository($pdo);
$runners = $userRepo->activeRunners($zoneId, $sort, $lat, $lng);
$zones = $pdo->query('SELECT id, name FROM zones WHERE is_active = 1 ORDER BY name')->fetchAll();
$queryParams = [
    'zone_id' => $zoneId,
    'sort' => $sort,
    'lat' => $lat,
    'lng' => $lng,
];
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Active Runners | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container container--mobile-dense">
        <h2>Choose Runner</h2>
        <p>Use your current location to rank nearest active runners first.</p>
        <form class="card runner-filter-form" method="get" style="margin-bottom:20px;">
            <input type="hidden" name="lat" id="lat-field" value="<?php echo $lat !== null ? h((string) $lat) : ''; ?>">
            <input type="hidden" name="lng" id="lng-field" value="<?php echo $lng !== null ? h((string) $lng) : ''; ?>">
            <label>Area
                <select name="zone_id" style="padding:8px; margin:0 10px;">
                    <option value="">All areas</option>
                    <?php foreach ($zones as $zone): ?>
                        <option value="<?php echo (int) $zone['id']; ?>" <?php echo $zoneId === (int) $zone['id'] ? 'selected' : ''; ?>><?php echo h($zone['name']); ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <label>Sort by
                <select name="sort" style="padding:8px; margin:0 10px;">
                    <option value="rating" <?php echo $sort === 'rating' ? 'selected' : ''; ?>>Highest rating</option>
                    <option value="tasks" <?php echo $sort === 'tasks' ? 'selected' : ''; ?>>Most tasks completed</option>
                    <option value="fee_low" <?php echo $sort === 'fee_low' ? 'selected' : ''; ?>>Most reliable</option>
                </select>
            </label>
            <button class="cta-button" type="submit">Apply</button>
            <button class="cta-button" type="button" id="nearest-btn" style="margin-left:8px; background:#059669;">Use My Location</button>
        </form>

        <p id="online-runners-feed-status" class="dashboard-app__status-chip" style="text-align:left; margin:0 0 12px;">Live online runners feed connecting…</p>

        <div class="grid" id="online-runners-grid">
            <?php if (!$runners): ?><p>No active runners found for this filter.</p><?php endif; ?>
            <?php foreach ($runners as $runner): ?>
                <article class="card">
                    <h3><?php echo h($runner['full_name']); ?></h3>
                    <p><strong>Active Area:</strong> <?php echo h($runner['active_zone_name'] ?? 'Unspecified'); ?></p>
                    <p><strong>Vehicle:</strong> <?php echo h($runner['vehicle_type']); ?></p>
                    <p><strong>Rating:</strong> <?php echo number_format((float) $runner['rating'], 2); ?> (<?php echo (int) $runner['rating_count']; ?> reviews)</p>
                    <p><strong>Completed Tasks:</strong> <?php echo (int) $runner['total_tasks_completed']; ?></p>
                    <p><strong>Coverage Radius:</strong> <?php echo (int) $runner['radius_km']; ?> km</p>
                    <?php if (isset($runner['distance_km']) && $runner['distance_km'] !== null): ?>
                        <p><strong>Distance:</strong> <?php echo number_format((float) $runner['distance_km'], 2); ?> km away</p>
                    <?php endif; ?>
                    <p><a href="post_task.php" class="cta-button">Create Task</a></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php
$bottomNavRole = 'client';
$bottomNavActive = 'runners';
require __DIR__ . '/includes/bottom_nav.php';
require __DIR__ . '/includes/footer.php';
?>
<script>
(() => {
    const nearestBtn = document.getElementById('nearest-btn');
    const latField = document.getElementById('lat-field');
    const lngField = document.getElementById('lng-field');

    if (!nearestBtn || !latField || !lngField) {
        return;
    }

    nearestBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            return;
        }

        nearestBtn.disabled = true;
        nearestBtn.textContent = 'Detecting...';

        navigator.geolocation.getCurrentPosition((position) => {
            latField.value = position.coords.latitude.toFixed(7);
            lngField.value = position.coords.longitude.toFixed(7);
            nearestBtn.form.submit();
        }, () => {
            nearestBtn.disabled = false;
            nearestBtn.textContent = 'Use My Location';
        }, { enableHighAccuracy: true, timeout: 12000 });
    });

    const statusEl = document.getElementById('online-runners-feed-status');
    const gridEl = document.getElementById('online-runners-grid');
    const query = new URLSearchParams();
    const params = <?php echo json_encode($queryParams, JSON_THROW_ON_ERROR); ?>;

    if (params.zone_id !== null && params.zone_id !== '') query.set('zone_id', String(params.zone_id));
    if (params.sort) query.set('sort', String(params.sort));
    if (params.lat !== null) query.set('lat', String(params.lat));
    if (params.lng !== null) query.set('lng', String(params.lng));

    let stream = null;

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const renderRunnerCard = (runner) => {
        const distanceHtml = runner.distance_km !== null
            ? `<p><strong>Distance:</strong> ${Number(runner.distance_km).toFixed(2)} km away</p>`
            : '';

        return `
            <article class="card">
                <h3>${escapeHtml(runner.full_name)}</h3>
                <p><strong>Active Area:</strong> ${escapeHtml(runner.active_zone_name || 'Unspecified')}</p>
                <p><strong>Vehicle:</strong> ${escapeHtml(runner.vehicle_type)}</p>
                <p><strong>Rating:</strong> ${Number(runner.rating).toFixed(2)} (${runner.rating_count} reviews)</p>
                <p><strong>Completed Tasks:</strong> ${runner.total_tasks_completed}</p>
                <p><strong>Coverage Radius:</strong> ${runner.radius_km} km</p>
                ${distanceHtml}
                <p><a href="post_task.php" class="cta-button">Create Task</a></p>
            </article>
        `;
    };

    function connectFeed() {
        if (stream) {
            stream.close();
        }

        stream = new EventSource(`stream_online_runners.php?${query.toString()}`);

        stream.addEventListener('runners', (event) => {
            const payload = JSON.parse(event.data);
            const runners = payload.runners || [];
            statusEl.textContent = `Live online runners: ${payload.count ?? runners.length} · ${new Date().toLocaleTimeString()}`;

            if (runners.length === 0) {
                gridEl.innerHTML = '<p>No active runners found for this filter.</p>';
                return;
            }

            gridEl.innerHTML = runners.map(renderRunnerCard).join('');
        });

        stream.addEventListener('end', () => {
            statusEl.textContent = 'Refreshing online runners feed…';
            connectFeed();
        });

        stream.onerror = () => {
            statusEl.textContent = 'Online runners feed reconnecting…';
            setTimeout(connectFeed, 2000);
        };
    }

    connectFeed();
})();
</script>
</body>
</html>
