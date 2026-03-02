<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

requireLogin();

$taskId = (int) ($_GET['task_id'] ?? 0);
if ($taskId <= 0) {
    http_response_code(422);
    exit('Task id is required.');
}

$stmt = $pdo->prepare('SELECT t.id, t.title, t.status, t.client_id, t.runner_id, cu.full_name AS client_name, ru.full_name AS runner_name
                       FROM tasks t
                       JOIN users cu ON cu.id = t.client_id
                       LEFT JOIN users ru ON ru.id = t.runner_id
                       WHERE t.id = :id LIMIT 1');
$stmt->execute(['id' => $taskId]);
$task = $stmt->fetch();
if (!$task) {
    http_response_code(404);
    exit('Task not found.');
}

$userId = (int) currentUserId();
if ($userId !== (int) $task['client_id'] && $userId !== (int) ($task['runner_id'] ?? 0)) {
    http_response_code(403);
    exit('Forbidden');
}

$isAssignedRunner = $userId === (int) ($task['runner_id'] ?? 0) && in_array((string) currentUserRole(), ['runner', 'both'], true);
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Live Tracking | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section section--tight">
    <div class="container" style="max-width:860px;">
        <h2>Live Tracking</h2>
        <div class="card">
            <p><strong><?php echo h($task['title']); ?></strong> · <?php echo h($task['status']); ?></p>
            <p>Client: <?php echo h($task['client_name']); ?> · Runner: <?php echo h($task['runner_name'] ?? 'Unassigned'); ?></p>
            <?php if ($isAssignedRunner): ?>
                <button class="cta-button" id="share-location">Start Sharing My Live Location</button>
            <?php endif; ?>
        </div>

        <div class="card" style="margin-top:12px;">
            <h3>Runner movement (latest points)</h3>
            <div id="track-feed"></div>
        </div>
    </div>
</section>
<script>
(() => {
    const taskId = <?php echo (int) $taskId; ?>;
    const canShare = <?php echo $isAssignedRunner ? 'true' : 'false'; ?>;
    const feed = document.getElementById('track-feed');
    const shareBtn = document.getElementById('share-location');
    let timer;

    const render = (points = []) => {
        if (!points.length) {
            feed.innerHTML = '<p>No live location points yet.</p>';
            return;
        }
        feed.innerHTML = points.map((p) => `<p>📍 ${Number(p.latitude).toFixed(6)}, ${Number(p.longitude).toFixed(6)} · ${p.captured_at}</p>`).join('');
    };

    const fetchPoints = async () => {
        const res = await fetch(`api/task_locations.php?task_id=${taskId}`, {credentials: 'same-origin'});
        if (!res.ok) return;
        const data = await res.json();
        render(data.tracking_points || []);
    };

    const publishLocation = () => {
        if (!navigator.geolocation) return;
        navigator.geolocation.getCurrentPosition(async (position) => {
            await fetch(`api/task_locations.php?task_id=${taskId}`, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                credentials: 'same-origin',
                body: JSON.stringify({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                    speed_kmh: position.coords.speed ? position.coords.speed * 3.6 : null,
                    captured_at: new Date().toISOString().slice(0, 19).replace('T', ' ')
                })
            });
            fetchPoints();
        });
    };

    if (shareBtn) {
        shareBtn.addEventListener('click', () => {
            publishLocation();
            clearInterval(timer);
            timer = setInterval(publishLocation, 15000);
            shareBtn.textContent = 'Sharing live location...';
            shareBtn.disabled = true;
        });
    }

    fetchPoints();
    setInterval(fetchPoints, 5000);
})();
</script>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
