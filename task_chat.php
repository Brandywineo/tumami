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
if ($actorId !== (int) $task['client_id'] && $actorId !== (int) ($task['runner_id'] ?? 0) && !isAdmin()) {
    http_response_code(403);
    exit('Forbidden');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $message = trim((string) ($_POST['message'] ?? ''));
    if ($message !== '') {
        $stmt = $pdo->prepare('INSERT INTO task_messages (task_id, sender_id, message) VALUES (:task_id, :sender_id, :message)');
        $stmt->execute([
            'task_id' => $taskId,
            'sender_id' => $actorId,
            'message' => $message,
        ]);
    }

    redirect('task_chat.php?task_id=' . $taskId);
}

$stmt = $pdo->prepare('SELECT tm.*, u.full_name FROM task_messages tm JOIN users u ON u.id = tm.sender_id WHERE tm.task_id = :task_id ORDER BY tm.created_at ASC');
$stmt->execute(['task_id' => $taskId]);
$messages = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Task Chat | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:800px;">
        <h2>Task Chat #<?php echo (int) $taskId; ?></h2>

        <div class="chat-layout">
            <div class="chat-header">Conversation</div>
            <div class="chat-messages">
                <?php foreach ($messages as $msg): ?>
                    <?php $isOwn = (int) $msg['sender_id'] === $actorId; ?>
                    <div class="chat-row <?php echo $isOwn ? 'chat-row--own' : ''; ?>">
                        <article class="chat-bubble">
                            <div class="chat-name"><?php echo h((string) $msg['full_name']); ?></div>
                            <p class="chat-text"><?php echo nl2br(h((string) $msg['message'])); ?></p>
                            <small class="chat-time"><?php echo h((string) $msg['created_at']); ?></small>
                        </article>
                    </div>
                <?php endforeach; ?>
                <?php if (!$messages): ?>
                    <div class="chat-row">
                        <article class="chat-bubble">
                            <div class="chat-name">System</div>
                            <p class="chat-text">No messages yet. Start the conversation.</p>
                        </article>
                    </div>
                <?php endif; ?>
            </div>

            <form method="post" class="chat-form">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="task_id" value="<?php echo (int) $taskId; ?>">
                <textarea name="message" required placeholder="Type a message..."></textarea>
                <button class="cta-button" type="submit">Send</button>
            </form>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
