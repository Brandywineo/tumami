<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['runner', 'both']);

$taskRepo = new TaskRepository($pdo);
$zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
$tasks = $taskRepo->browsePostedForRunner((int) currentUserId(), $zoneId);
$zones = $pdo->query('SELECT id, name FROM zones WHERE is_active = 1 ORDER BY name')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Browse Tasks | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container container--mobile-dense">
        <h2>Available Tasks</h2>
        <p>Jobs in your current/service area are ranked first.</p>
        <form class="card" method="get" style="margin-bottom:20px;">
            <label>Filter by service area
                <select name="zone_id" style="padding:8px; margin:0 10px;">
                    <option value="">All areas</option>
                    <?php foreach ($zones as $zone): ?>
                        <option value="<?php echo (int) $zone['id']; ?>" <?php echo $zoneId === (int) $zone['id'] ? 'selected' : ''; ?>><?php echo h($zone['name']); ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <button class="cta-button" type="submit">Apply</button>
        </form>

        <p id="runner-jobs-feed-status" class="dashboard-app__status-chip" style="text-align:left; margin:0 0 12px;">Live jobs feed connecting…</p>

        <div class="grid" id="runner-jobs-grid">
            <?php if (!$tasks): ?><p>No posted tasks at the moment.</p><?php endif; ?>
            <?php foreach ($tasks as $task): ?>
                <article class="card">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><?php echo h($task['description']); ?></p>
                    <p><strong>Service Area:</strong> <?php echo h($task['zone_name']); ?></p>
                    <p><strong>Client Area:</strong> <?php echo h($task['client_zone_name'] ?? 'N/A'); ?></p>
                    <?php if ((int) $task['is_runner_zone'] === 1): ?><p><strong>Priority:</strong> In your area</p><?php endif; ?>
                    <p><strong>Budget:</strong> KES <?php echo number_format((float) $task['runner_fee'], 2); ?></p>
                    <p><strong>Client:</strong> <?php echo h($task['client_name']); ?></p>
                    <form method="post" action="accept_task.php">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="task_id" value="<?php echo (int) $task['id']; ?>">
                        <button class="cta-button" type="submit">Accept Task</button>
                    </form>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php
$bottomNavRole = 'runner';
$bottomNavActive = 'available_tasks';
require __DIR__ . '/includes/bottom_nav.php';
require __DIR__ . '/includes/footer.php';
?>
<script>
(() => {
    const gridEl = document.getElementById('runner-jobs-grid');
    const statusEl = document.getElementById('runner-jobs-feed-status');
    const zoneId = <?php echo json_encode($zoneId, JSON_THROW_ON_ERROR); ?>;
    let stream = null;

    const escapeHtml = (value) => String(value ?? '')
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#039;');

    const renderTaskCard = (task) => {
        const priority = Number(task.is_runner_zone) === 1 ? '<p><strong>Priority:</strong> In your area</p>' : '';

        return `
            <article class="card">
                <h3>${escapeHtml(task.title)}</h3>
                <p>${escapeHtml(task.description)}</p>
                <p><strong>Service Area:</strong> ${escapeHtml(task.zone_name)}</p>
                <p><strong>Client Area:</strong> ${escapeHtml(task.client_zone_name || 'N/A')}</p>
                ${priority}
                <p><strong>Budget:</strong> KES ${Number(task.runner_fee).toFixed(2)}</p>
                <p><strong>Client:</strong> ${escapeHtml(task.client_name)}</p>
                <form method="post" action="accept_task.php">
                    <?php echo csrf_field(); ?>
                    <input type="hidden" name="task_id" value="${task.id}">
                    <button class="cta-button" type="submit">Accept Task</button>
                </form>
            </article>
        `;
    };

    function connectFeed() {
        if (stream) {
            stream.close();
        }

        const query = zoneId !== null ? `?zone_id=${encodeURIComponent(String(zoneId))}` : '';
        stream = new EventSource(`stream_runner_jobs.php${query}`);

        stream.addEventListener('jobs', (event) => {
            const payload = JSON.parse(event.data);
            const jobs = payload.jobs || [];
            statusEl.textContent = `Live jobs: ${payload.count ?? jobs.length} · ${new Date().toLocaleTimeString()}`;

            if (jobs.length === 0) {
                gridEl.innerHTML = '<p>No posted tasks at the moment.</p>';
                return;
            }

            gridEl.innerHTML = jobs.map(renderTaskCard).join('');
        });

        stream.addEventListener('end', () => {
            statusEl.textContent = 'Refreshing jobs feed…';
            connectFeed();
        });

        stream.onerror = () => {
            statusEl.textContent = 'Jobs feed reconnecting…';
            setTimeout(connectFeed, 2000);
        };
    }

    connectFeed();
})();
</script>
</body>
</html>
