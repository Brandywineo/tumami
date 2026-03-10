<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\WalletService;

requireRole(['client', 'both']);

$taskRepo = new TaskRepository($pdo);
$wallet = new WalletService($pdo);
$zones = $pdo->query('SELECT id, name, parent_id FROM zones WHERE is_active = 1 ORDER BY parent_id IS NULL DESC, name')->fetchAll();
$mapboxToken = trim((string) (getenv('MAPBOX_PUBLIC_TOKEN') ?: ''));

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $errors[] = 'Security validation failed. Please refresh and try again.';
    }

    $data = [
        'client_id' => (int) currentUserId(),
        'zone_id' => (int) ($_POST['service_zone_id'] ?? 0),
        'client_zone_id' => (int) ($_POST['client_zone_id'] ?? 0) ?: null,
        'pickup_zone_id' => (int) ($_POST['pickup_zone_id'] ?? 0) ?: null,
        'dropoff_zone_id' => (int) ($_POST['dropoff_zone_id'] ?? 0) ?: null,
        'category' => $_POST['category'] ?? '',
        'title' => trim($_POST['title'] ?? ''),
        'description' => trim($_POST['description'] ?? ''),
        'pickup_address' => trim($_POST['pickup_address'] ?? '') ?: null,
        'dropoff_address' => trim($_POST['dropoff_address'] ?? '') ?: null,
        'runner_fee' => (float) ($_POST['runner_fee'] ?? 0),
        'deadline' => ($_POST['deadline'] ?? '') !== '' ? $_POST['deadline'] : null,
        'client_latitude' => ($_POST['client_latitude'] ?? '') !== '' ? (float) $_POST['client_latitude'] : null,
        'client_longitude' => ($_POST['client_longitude'] ?? '') !== '' ? (float) $_POST['client_longitude'] : null,
        'pickup_latitude' => ($_POST['pickup_latitude'] ?? '') !== '' ? (float) $_POST['pickup_latitude'] : null,
        'pickup_longitude' => ($_POST['pickup_longitude'] ?? '') !== '' ? (float) $_POST['pickup_longitude'] : null,
        'dropoff_latitude' => ($_POST['dropoff_latitude'] ?? '') !== '' ? (float) $_POST['dropoff_latitude'] : null,
        'dropoff_longitude' => ($_POST['dropoff_longitude'] ?? '') !== '' ? (float) $_POST['dropoff_longitude'] : null,
    ];

    if ($data['zone_id'] <= 0 || $data['title'] === '' || $data['description'] === '' || $data['runner_fee'] <= 0) {
        $errors[] = 'Please complete all required fields with valid values.';
    }
    if (!in_array($data['category'], ['courier', 'assisted_purchase', 'dropoff', 'queue'], true)) {
        $errors[] = 'Invalid category selected.';
    }

    if ($errors === []) {
        $taskId = $taskRepo->create($data);
        $wallet->recordClientDeposit((int) currentUserId(), $taskId, $data['runner_fee']);
        setFlash('success', 'Task posted successfully and fee reserved. Runners in the service area are prioritized.');
        redirect('dashboard_client.php');
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Post Task | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:860px;">
        <h2>Create Task</h2>
        <?php if ($errors): ?><div class="card" style="border-left:4px solid #d63031;"><?php foreach ($errors as $error): ?><p><?php echo h($error); ?></p><?php endforeach; ?></div><?php endif; ?>

        <form method="post" class="card">
            <?php echo csrf_field(); ?>
            <p><label>Title<br><input name="title" required style="width:100%;padding:10px;"></label></p>
            <p><label>Description<br><textarea name="description" required style="width:100%;padding:10px;min-height:120px;"></textarea></label></p>
            <p><label>Service Area<br><select name="service_zone_id" required style="width:100%;padding:10px;"><option value="">Select area</option><?php foreach ($zones as $zone): ?><option value="<?php echo (int) $zone['id']; ?>"><?php echo h($zone['name']); ?></option><?php endforeach; ?></select></label></p>
            <p><label>Pickup Address<br><input name="pickup_address" style="width:100%;padding:10px;"></label></p>
            <p><label>Dropoff Address<br><input name="dropoff_address" style="width:100%;padding:10px;"></label></p>
            <p><label>Category<br><select name="category" style="width:100%;padding:10px;"><option value="courier">Courier</option><option value="assisted_purchase">Assisted Purchase</option><option value="dropoff">Dropoff</option><option value="queue">Queue</option></select></label></p>
            <p><label>Runner Fee (KES)<br><input type="number" step="0.01" min="1" name="runner_fee" required style="width:100%;padding:10px;"></label></p>
            <p><label>Deadline<br><input type="datetime-local" name="deadline" style="width:100%;padding:10px;"></label></p>

            <article class="card" style="margin:20px 0;">
                <h3>Location Selection</h3>
                <p>Use current device location and map click to set exact coordinates. Click mode to choose Pickup or Dropoff pin.</p>
                <p>
                    <button class="cta-button" type="button" id="detect-location-btn">Use My Current Location</button>
                    <button class="cta-button" type="button" id="mode-pickup" style="margin-left:8px;background:#2563eb;">Set Pickup Pin</button>
                    <button class="cta-button" type="button" id="mode-dropoff" style="margin-left:8px;background:#059669;">Set Dropoff Pin</button>
                </p>
                <p id="location-map-status">Map is ready. Choose a pin mode then click on the map.</p>
                <div id="task-location-map" style="width:100%; height:420px; border-radius:10px;"></div>
            </article>

            <input type="hidden" name="client_zone_id" id="client_zone_id" value="">
            <input type="hidden" name="pickup_zone_id" id="pickup_zone_id" value="">
            <input type="hidden" name="dropoff_zone_id" id="dropoff_zone_id" value="">
            <input type="hidden" name="client_latitude" id="client_latitude" value="">
            <input type="hidden" name="client_longitude" id="client_longitude" value="">
            <input type="hidden" name="pickup_latitude" id="pickup_latitude" value="">
            <input type="hidden" name="pickup_longitude" id="pickup_longitude" value="">
            <input type="hidden" name="dropoff_latitude" id="dropoff_latitude" value="">
            <input type="hidden" name="dropoff_longitude" id="dropoff_longitude" value="">

            <button class="cta-button" type="submit">Post Task</button>
        </form>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
<script>
(() => {
    const token = <?php echo json_encode($mapboxToken, JSON_THROW_ON_ERROR); ?>;
    if (!token) {
        return;
    }

    const modePickupBtn = document.getElementById('mode-pickup');
    const modeDropoffBtn = document.getElementById('mode-dropoff');
    const detectBtn = document.getElementById('detect-location-btn');
    const statusEl = document.getElementById('location-map-status');

    const fields = {
        clientLat: document.getElementById('client_latitude'),
        clientLng: document.getElementById('client_longitude'),
        pickupLat: document.getElementById('pickup_latitude'),
        pickupLng: document.getElementById('pickup_longitude'),
        dropoffLat: document.getElementById('dropoff_latitude'),
        dropoffLng: document.getElementById('dropoff_longitude')
    };

    const cookieTheme = document.cookie
        .split('; ')
        .find((row) => row.startsWith('tumami_theme='))
        ?.split('=')[1] || 'system';
    const darkMode = cookieTheme === 'dark' || (cookieTheme === 'system' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
        container: 'task-location-map',
        style: darkMode ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/streets-v12',
        center: [36.8219, -1.2921],
        zoom: 12
    });

    let mode = 'pickup';
    let pickupMarker = null;
    let dropoffMarker = null;

    function setMode(nextMode) {
        mode = nextMode;
        modePickupBtn.style.opacity = mode === 'pickup' ? '1' : '0.7';
        modeDropoffBtn.style.opacity = mode === 'dropoff' ? '1' : '0.7';
        statusEl.textContent = mode === 'pickup' ? 'Pickup pin mode active. Click on map.' : 'Dropoff pin mode active. Click on map.';
    }

    modePickupBtn.addEventListener('click', () => setMode('pickup'));
    modeDropoffBtn.addEventListener('click', () => setMode('dropoff'));

    detectBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
            statusEl.textContent = 'Geolocation not supported.';
            return;
        }

        statusEl.textContent = 'Detecting current location…';
        navigator.geolocation.getCurrentPosition((position) => {
            const lat = position.coords.latitude;
            const lng = position.coords.longitude;
            fields.clientLat.value = lat.toFixed(7);
            fields.clientLng.value = lng.toFixed(7);
            map.flyTo({ center: [lng, lat], zoom: 14 });
            statusEl.textContent = 'Current location captured. Now click to set pickup/dropoff pins.';
        }, () => {
            statusEl.textContent = 'Unable to read location. Please allow browser permission.';
        }, { enableHighAccuracy: true, timeout: 12000 });
    });

    map.on('click', (event) => {
        const lng = event.lngLat.lng;
        const lat = event.lngLat.lat;

        if (mode === 'pickup') {
            fields.pickupLat.value = lat.toFixed(7);
            fields.pickupLng.value = lng.toFixed(7);
            if (!pickupMarker) {
                pickupMarker = new mapboxgl.Marker({ color: '#2563eb' }).setLngLat([lng, lat]).addTo(map);
            } else {
                pickupMarker.setLngLat([lng, lat]);
            }
            statusEl.textContent = 'Pickup pin placed.';
            return;
        }

        fields.dropoffLat.value = lat.toFixed(7);
        fields.dropoffLng.value = lng.toFixed(7);
        if (!dropoffMarker) {
            dropoffMarker = new mapboxgl.Marker({ color: '#059669' }).setLngLat([lng, lat]).addTo(map);
        } else {
            dropoffMarker.setLngLat([lng, lat]);
        }
        statusEl.textContent = 'Dropoff pin placed.';
    });
})();
</script>
</body>
</html>
