<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\WalletService;

requireRole(['client', 'both']);

$taskRepo = new TaskRepository($pdo);
$wallet = new WalletService($pdo);
$zones = $pdo->query('SELECT id, name FROM zones WHERE is_active = 1 ORDER BY name')->fetchAll();

$errors = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $data = [
        'client_id' => (int) currentUserId(),
        'zone_id' => (int) ($_POST['zone_id'] ?? 0),
        'category' => $_POST['category'] ?? '',
        'title' => trim($_POST['title'] ?? ''),
        'description' => trim($_POST['description'] ?? ''),
        'runner_fee' => (float) ($_POST['runner_fee'] ?? 0),
        'deadline' => $_POST['deadline'] !== '' ? $_POST['deadline'] : null,
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
        setFlash('success', 'Task posted successfully and fee reserved.');
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
    <div class="container" style="max-width:760px;">
        <h2>Post a New Task</h2>
        <?php if ($errors): ?><div class="card" style="border-left:4px solid #d63031;"><?php foreach ($errors as $error): ?><p><?php echo h($error); ?></p><?php endforeach; ?></div><?php endif; ?>
        <form method="post" class="card">
            <p><label>Title<br><input name="title" required style="width:100%;padding:10px;"></label></p>
            <p><label>Description<br><textarea name="description" required style="width:100%;padding:10px;min-height:120px;"></textarea></label></p>
            <p><label>Zone<br><select name="zone_id" required style="width:100%;padding:10px;"><?php foreach ($zones as $zone): ?><option value="<?php echo (int) $zone['id']; ?>"><?php echo h($zone['name']); ?></option><?php endforeach; ?></select></label></p>
            <p><label>Category<br><select name="category" style="width:100%;padding:10px;"><option value="courier">Courier</option><option value="assisted_purchase">Assisted Purchase</option><option value="dropoff">Dropoff</option><option value="queue">Queue</option></select></label></p>
            <p><label>Runner Fee (KES)<br><input type="number" step="0.01" min="1" name="runner_fee" required style="width:100%;padding:10px;"></label></p>
            <p><label>Deadline<br><input type="datetime-local" name="deadline" style="width:100%;padding:10px;"></label></p>
            <button class="cta-button" type="submit">Post Task</button>
        </form>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
