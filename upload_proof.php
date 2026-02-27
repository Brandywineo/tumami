<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;

requireLogin();

$taskId = (int) ($_GET['task_id'] ?? $_POST['task_id'] ?? 0);
if ($taskId <= 0) {
    setFlash('error', 'Invalid task id.');
    redirect('index.php');
}

$taskRepo = new TaskRepository($pdo);
$task = $taskRepo->findById($taskId);
if (!$task) {
    setFlash('error', 'Task not found.');
    redirect('index.php');
}

$actorId = (int) currentUserId();
if ($actorId !== (int) $task['client_id'] && $actorId !== (int) ($task['runner_id'] ?? 0)) {
    http_response_code(403);
    exit('Forbidden');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $type = $_POST['proof_type'] ?? '';
    $allowedTypes = ['before', 'after', 'delivery', 'odometer', 'package_condition'];
    if (!in_array($type, $allowedTypes, true)) {
        setFlash('error', 'Invalid proof type.');
        redirect('upload_proof.php?task_id=' . $taskId);
    }

    if (!isset($_FILES['proof_file']) || $_FILES['proof_file']['error'] !== UPLOAD_ERR_OK) {
        setFlash('error', 'File upload failed.');
        redirect('upload_proof.php?task_id=' . $taskId);
    }

    $tmp = $_FILES['proof_file']['tmp_name'];
    $name = basename((string) $_FILES['proof_file']['name']);
    $ext = strtolower(pathinfo($name, PATHINFO_EXTENSION));
    if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
        setFlash('error', 'Only image proofs are allowed (jpg, png, webp).');
        redirect('upload_proof.php?task_id=' . $taskId);
    }

    $dir = __DIR__ . '/uploads/task_proofs';
    if (!is_dir($dir)) {
        mkdir($dir, 0775, true);
    }

    $filename = sprintf('task_%d_%d_%s.%s', $taskId, $actorId, bin2hex(random_bytes(6)), $ext);
    $target = $dir . '/' . $filename;

    if (!move_uploaded_file($tmp, $target)) {
        setFlash('error', 'Unable to save uploaded file.');
        redirect('upload_proof.php?task_id=' . $taskId);
    }

    $relativePath = 'uploads/task_proofs/' . $filename;
    $stmt = $pdo->prepare('INSERT INTO task_proofs (task_id, uploaded_by, proof_type, file_path) VALUES (:task_id, :uploaded_by, :proof_type, :file_path)');
    $stmt->execute([
        'task_id' => $taskId,
        'uploaded_by' => $actorId,
        'proof_type' => $type,
        'file_path' => $relativePath,
    ]);

    setFlash('success', 'Proof uploaded successfully.');
    redirect('upload_proof.php?task_id=' . $taskId);
}

$proofsStmt = $pdo->prepare('SELECT tp.*, u.full_name FROM task_proofs tp JOIN users u ON u.id = tp.uploaded_by WHERE tp.task_id = :task_id ORDER BY tp.created_at DESC');
$proofsStmt->execute(['task_id' => $taskId]);
$proofs = $proofsStmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Upload Proof | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:760px;">
        <h2>Upload Proof for Task #<?php echo (int) $taskId; ?></h2>
        <form method="post" enctype="multipart/form-data" class="card">
            <?php echo csrf_field(); ?>
            <input type="hidden" name="task_id" value="<?php echo (int) $taskId; ?>">
            <p><label>Proof Type<br>
                <select name="proof_type" style="width:100%;padding:10px;">
                    <option value="before">Before</option>
                    <option value="after">After</option>
                    <option value="delivery">Delivery</option>
                    <option value="odometer">Odometer</option>
                    <option value="package_condition">Package Condition</option>
                </select>
            </label></p>
            <p><label>Image File<br><input type="file" name="proof_file" accept="image/*" required></label></p>
            <button class="cta-button" type="submit">Upload Proof</button>
        </form>

        <h3 style="margin-top:24px;">Uploaded Proofs</h3>
        <div class="grid">
            <?php foreach ($proofs as $proof): ?>
                <article class="card">
                    <p><strong><?php echo h($proof['proof_type']); ?></strong> by <?php echo h($proof['full_name']); ?></p>
                    <p><a href="<?php echo h($proof['file_path']); ?>" target="_blank">View File</a></p>
                    <p><small><?php echo h((string) $proof['created_at']); ?></small></p>
                </article>
            <?php endforeach; ?>
            <?php if (!$proofs): ?><p>No proofs uploaded yet.</p><?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
