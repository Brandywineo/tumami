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

$userRepo = new UserRepository($pdo);
$runners = $userRepo->activeRunners($zoneId, $sort);
$zones = $pdo->query('SELECT id, name FROM zones WHERE is_active = 1 ORDER BY name')->fetchAll();
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
    <div class="container">
        <h2>Active Runners</h2>
        <p>Filter runners by job area and prioritize runners closest to where the task should be executed.</p>
        <form class="card" method="get" style="margin-bottom:20px;">
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
        </form>

        <div class="grid">
            <?php if (!$runners): ?><p>No active runners found in the selected area.</p><?php endif; ?>
            <?php foreach ($runners as $runner): ?>
                <article class="card">
                    <h3><?php echo h($runner['full_name']); ?></h3>
                    <p><strong>Active Area:</strong> <?php echo h($runner['active_zone_name'] ?? 'Unspecified'); ?></p>
                    <p><strong>Vehicle:</strong> <?php echo h($runner['vehicle_type']); ?></p>
                    <p><strong>Rating:</strong> <?php echo number_format((float) $runner['rating'], 2); ?> (<?php echo (int) $runner['rating_count']; ?> reviews)</p>
                    <p><strong>Completed Tasks:</strong> <?php echo (int) $runner['total_tasks_completed']; ?></p>
                    <p><strong>Coverage Radius:</strong> <?php echo (int) $runner['radius_km']; ?> km</p>
                    <p><strong>Adjacent Areas:</strong> <?php echo (int) $runner['accepts_adjacent_zones'] === 1 ? 'Enabled' : 'Disabled'; ?></p>
                    <p><a href="post_task.php" class="cta-button">Create Task for this Area</a></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
