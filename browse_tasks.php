<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireRole(['runner', 'both']);

$taskRepo = new TaskRepository($pdo);
$zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
$tasks = $taskRepo->browsePosted($zoneId);
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
    <div class="container">
        <h2>Available Tasks</h2>
        <form class="card" method="get" style="margin-bottom:20px;">
            <label>Filter by zone
                <select name="zone_id" style="padding:8px; margin:0 10px;">
                    <option value="">All zones</option>
                    <?php foreach ($zones as $zone): ?>
                        <option value="<?php echo (int) $zone['id']; ?>" <?php echo $zoneId === (int) $zone['id'] ? 'selected' : ''; ?>><?php echo h($zone['name']); ?></option>
                    <?php endforeach; ?>
                </select>
            </label>
            <button class="cta-button" type="submit">Apply</button>
        </form>

        <div class="grid">
            <?php if (!$tasks): ?><p>No posted tasks at the moment.</p><?php endif; ?>
            <?php foreach ($tasks as $task): ?>
                <article class="card">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><?php echo h($task['description']); ?></p>
                    <p><strong>Zone:</strong> <?php echo h($task['zone_name']); ?></p>
                    <p><strong>Budget:</strong> KES <?php echo number_format((float) $task['runner_fee'], 2); ?></p>
                    <p><strong>Client:</strong> <?php echo h($task['client_name']); ?></p>
                    <a class="cta-button" href="accept_task.php?task_id=<?php echo (int) $task['id']; ?>">Accept Task</a>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
