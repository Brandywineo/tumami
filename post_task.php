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

$categoryOptions = [
    'courier' => ['label' => 'Courier', 'emoji' => '📦'],
    'assisted_purchase' => ['label' => 'Assisted Purchase', 'emoji' => '🛍️'],
    'dropoff' => ['label' => 'Dropoff', 'emoji' => '🚚'],
    'queue' => ['label' => 'Queue', 'emoji' => '⏱️'],
];

$initial = [
    'title' => (string) ($_POST['title'] ?? ''),
    'description' => (string) ($_POST['description'] ?? ''),
    'service_zone_id' => (string) ($_POST['service_zone_id'] ?? ''),
    'pickup_address' => (string) ($_POST['pickup_address'] ?? ''),
    'dropoff_address' => (string) ($_POST['dropoff_address'] ?? ''),
    'category' => (string) ($_POST['category'] ?? ''),
    'runner_fee' => (string) ($_POST['runner_fee'] ?? ''),
    'deadline' => (string) ($_POST['deadline'] ?? ''),
    'client_zone_id' => (string) ($_POST['client_zone_id'] ?? ''),
    'pickup_zone_id' => (string) ($_POST['pickup_zone_id'] ?? ''),
    'dropoff_zone_id' => (string) ($_POST['dropoff_zone_id'] ?? ''),
    'client_latitude' => (string) ($_POST['client_latitude'] ?? ''),
    'client_longitude' => (string) ($_POST['client_longitude'] ?? ''),
    'pickup_latitude' => (string) ($_POST['pickup_latitude'] ?? ''),
    'pickup_longitude' => (string) ($_POST['pickup_longitude'] ?? ''),
    'dropoff_latitude' => (string) ($_POST['dropoff_latitude'] ?? ''),
    'dropoff_longitude' => (string) ($_POST['dropoff_longitude'] ?? ''),
];

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
    if (!array_key_exists((string) $data['category'], $categoryOptions)) {
        $errors[] = 'Choose a valid errand category.';
    }

    if ($data['pickup_latitude'] === null || $data['pickup_longitude'] === null || $data['dropoff_latitude'] === null || $data['dropoff_longitude'] === null) {
        $errors[] = 'Set both pickup and dropoff pins on the map before posting.';
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
<section class="section section--compact app-shell-page">
    <div class="container container--mobile-dense" style="max-width:680px;">
        <article class="card card--compact app-shell__header">
            <h2 class="dashboard-title">Post an Errand</h2>
            <p class="dashboard-subtitle">Choose category, add details, pin map locations, then review.</p>
        </article>

        <div class="task-flow-steps" aria-label="Task creation steps">
            <span class="task-flow-step is-active" data-step-pill="1">1. Category</span>
            <span class="task-flow-step" data-step-pill="2">2. Details</span>
            <span class="task-flow-step" data-step-pill="3">3. Map</span>
            <span class="task-flow-step" data-step-pill="4">4. Review</span>
        </div>

        <?php if ($errors): ?>
            <div class="auth-alert auth-alert--error card card--compact">
                <?php foreach ($errors as $error): ?>
                    <p style="margin:0 0 6px;"><?php echo h($error); ?></p>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <form method="post" class="card card--compact task-flow-form" id="post-task-form">
            <?php echo csrf_field(); ?>

            <section data-flow-step="1" class="task-flow-panel is-active">
                <h3>Choose Category</h3>
                <p class="dashboard-subtitle">What type of errand do you need done?</p>
                <div class="task-category-grid">
                    <?php foreach ($categoryOptions as $value => $meta): ?>
                        <label class="task-category-card" data-category-card>
                            <input type="radio" name="category" value="<?php echo h($value); ?>" <?php echo $initial['category'] === $value ? 'checked' : ''; ?> required>
                            <span class="task-category-card__icon"><?php echo h($meta['emoji']); ?></span>
                            <span class="task-category-card__label"><?php echo h($meta['label']); ?></span>
                        </label>
                    <?php endforeach; ?>
                </div>
                <div class="task-flow-actions">
                    <button type="button" class="cta-button" data-flow-next>Continue</button>
                </div>
            </section>

            <section data-flow-step="2" class="task-flow-panel">
                <h3>Task Details</h3>
                <div class="task-detail-grid">
                    <label>Title
                        <input name="title" value="<?php echo h($initial['title']); ?>" required>
                    </label>
                    <label>Service Area
                        <select name="service_zone_id" required>
                            <option value="">Select area</option>
                            <?php foreach ($zones as $zone): ?>
                                <option value="<?php echo (int) $zone['id']; ?>" <?php echo $initial['service_zone_id'] === (string) $zone['id'] ? 'selected' : ''; ?>><?php echo h((string) $zone['name']); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </label>
                </div>

                <label>Description
                    <textarea name="description" required><?php echo h($initial['description']); ?></textarea>
                </label>

                <div class="task-detail-grid">
                    <label>Pickup Address
                        <input name="pickup_address" value="<?php echo h($initial['pickup_address']); ?>">
                    </label>
                    <label>Dropoff Address
                        <input name="dropoff_address" value="<?php echo h($initial['dropoff_address']); ?>">
                    </label>
                </div>

                <div class="task-detail-grid">
                    <label>Runner Fee (KES)
                        <input type="number" step="0.01" min="1" name="runner_fee" value="<?php echo h($initial['runner_fee']); ?>" required>
                    </label>
                    <label>Deadline
                        <input type="datetime-local" name="deadline" value="<?php echo h($initial['deadline']); ?>">
                    </label>
                </div>

                <div class="task-flow-actions task-flow-actions--split">
                    <button type="button" class="cta-button cta-button--muted" data-flow-back>Back</button>
                    <button type="button" class="cta-button" data-flow-next>Continue</button>
                </div>
            </section>

            <section data-flow-step="3" class="task-flow-panel">
                <h3>Location on Map</h3>
                <p class="dashboard-subtitle">Set pickup and dropoff pins. You can also detect your current location.</p>
                <div class="task-map-actions">
                    <button class="cta-button" type="button" id="detect-location-btn">Use My Location</button>
                    <button class="cta-button" type="button" id="mode-pickup">Pickup Pin</button>
                    <button class="cta-button" type="button" id="mode-dropoff">Dropoff Pin</button>
                </div>
                <p id="location-map-status" class="dashboard-subtitle">Map ready. Choose a pin mode then tap map.</p>
                <div id="task-location-map" class="task-location-map"></div>

                <div class="task-flow-actions task-flow-actions--split">
                    <button type="button" class="cta-button cta-button--muted" data-flow-back>Back</button>
                    <button type="button" class="cta-button" data-flow-next>Continue</button>
                </div>
            </section>

            <section data-flow-step="4" class="task-flow-panel">
                <h3>Review & Post</h3>
                <div class="task-review-card">
                    <p><strong>Category:</strong> <span data-review="category">-</span></p>
                    <p><strong>Title:</strong> <span data-review="title">-</span></p>
                    <p><strong>Service Area:</strong> <span data-review="service_zone_id">-</span></p>
                    <p><strong>Pickup:</strong> <span data-review="pickup_address">-</span></p>
                    <p><strong>Dropoff:</strong> <span data-review="dropoff_address">-</span></p>
                    <p><strong>Fee:</strong> KES <span data-review="runner_fee">-</span></p>
                    <p><strong>Deadline:</strong> <span data-review="deadline">Not set</span></p>
                </div>
                <div class="task-flow-actions task-flow-actions--split">
                    <button type="button" class="cta-button cta-button--muted" data-flow-back>Back</button>
                    <button class="cta-button" type="submit">Post Task</button>
                </div>
            </section>

            <input type="hidden" name="client_zone_id" id="client_zone_id" value="<?php echo h($initial['client_zone_id']); ?>">
            <input type="hidden" name="pickup_zone_id" id="pickup_zone_id" value="<?php echo h($initial['pickup_zone_id']); ?>">
            <input type="hidden" name="dropoff_zone_id" id="dropoff_zone_id" value="<?php echo h($initial['dropoff_zone_id']); ?>">
            <input type="hidden" name="client_latitude" id="client_latitude" value="<?php echo h($initial['client_latitude']); ?>">
            <input type="hidden" name="client_longitude" id="client_longitude" value="<?php echo h($initial['client_longitude']); ?>">
            <input type="hidden" name="pickup_latitude" id="pickup_latitude" value="<?php echo h($initial['pickup_latitude']); ?>">
            <input type="hidden" name="pickup_longitude" id="pickup_longitude" value="<?php echo h($initial['pickup_longitude']); ?>">
            <input type="hidden" name="dropoff_latitude" id="dropoff_latitude" value="<?php echo h($initial['dropoff_latitude']); ?>">
            <input type="hidden" name="dropoff_longitude" id="dropoff_longitude" value="<?php echo h($initial['dropoff_longitude']); ?>">
        </form>
    </div>
</section>
<?php
$bottomNavRole = 'client';
$bottomNavActive = 'errands';
require __DIR__ . '/includes/bottom_nav.php';
?>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.css" rel="stylesheet">
<script src="https://api.mapbox.com/mapbox-gl-js/v3.5.1/mapbox-gl.js"></script>
<script>
(() => {
    const form = document.getElementById('post-task-form');
    const panels = Array.from(form.querySelectorAll('[data-flow-step]'));
    const pills = Array.from(document.querySelectorAll('[data-step-pill]'));
    const nextButtons = form.querySelectorAll('[data-flow-next]');
    const backButtons = form.querySelectorAll('[data-flow-back]');
    let step = 1;

    const categoryLookup = {
        courier: 'Courier',
        assisted_purchase: 'Assisted Purchase',
        dropoff: 'Dropoff',
        queue: 'Queue'
    };

    function renderStep() {
        panels.forEach((panel) => {
            const isActive = Number(panel.getAttribute('data-flow-step')) === step;
            panel.classList.toggle('is-active', isActive);
        });

        pills.forEach((pill) => {
            const isActive = Number(pill.getAttribute('data-step-pill')) === step;
            pill.classList.toggle('is-active', isActive);
        });

        if (step === 4) {
            hydrateReview();
        }
    }

    function value(name) {
        const field = form.querySelector(`[name="${name}"]`);
        return field ? field.value.trim() : '';
    }

    function hydrateReview() {
        const pairs = ['title', 'service_zone_id', 'pickup_address', 'dropoff_address', 'runner_fee', 'deadline'];
        pairs.forEach((key) => {
            const el = form.querySelector(`[data-review="${key}"]`);
            if (!el) return;
            if (key === 'service_zone_id') {
                const select = form.querySelector('[name="service_zone_id"]');
                const option = select ? select.options[select.selectedIndex] : null;
                el.textContent = option && option.value !== '' ? option.textContent : '-';
                return;
            }
            el.textContent = value(key) || (key === 'deadline' ? 'Not set' : '-');
        });

        const categoryEl = form.querySelector('[data-review="category"]');
        if (categoryEl) {
            categoryEl.textContent = categoryLookup[value('category')] || '-';
        }
    }

    function validateStep(currentStep) {
        if (currentStep === 1) {
            return value('category') !== '';
        }

        if (currentStep === 2) {
            return value('title') !== ''
                && value('description') !== ''
                && value('service_zone_id') !== ''
                && value('runner_fee') !== '';
        }

        if (currentStep === 3) {
            return value('pickup_latitude') !== ''
                && value('pickup_longitude') !== ''
                && value('dropoff_latitude') !== ''
                && value('dropoff_longitude') !== '';
        }

        return true;
    }

    nextButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            if (!validateStep(step)) {
                alert('Please complete this step before continuing.');
                return;
            }
            step = Math.min(4, step + 1);
            renderStep();
        });
    });

    backButtons.forEach((btn) => {
        btn.addEventListener('click', () => {
            step = Math.max(1, step - 1);
            renderStep();
        });
    });

    renderStep();

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
        modePickupBtn.style.opacity = mode === 'pickup' ? '1' : '0.75';
        modeDropoffBtn.style.opacity = mode === 'dropoff' ? '1' : '0.75';
        statusEl.textContent = mode === 'pickup' ? 'Pickup pin mode active. Tap map.' : 'Dropoff pin mode active. Tap map.';
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
            statusEl.textContent = 'Current location saved. Place pickup and dropoff pins.';
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
