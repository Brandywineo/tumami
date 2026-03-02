<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

requireLogin();

$userId = (int) currentUserId();
$stmt = $pdo->prepare('SELECT t.id, t.title, t.status, cu.full_name AS client_name, ru.full_name AS runner_name
                       FROM tasks t
                       JOIN users cu ON cu.id = t.client_id
                       LEFT JOIN users ru ON ru.id = t.runner_id
                       WHERE t.client_id = :user_id OR t.runner_id = :user_id
                       ORDER BY t.updated_at DESC, t.created_at DESC');
$stmt->execute(['user_id' => $userId]);
$tasks = $stmt->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chats | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section section--tight">
    <div class="container">
        <h2>Task Chats</h2>
        <div class="grid">
            <?php if (!$tasks): ?><p>You have no task chats yet.</p><?php endif; ?>
            <?php foreach ($tasks as $task): ?>
                <article class="card">
                    <h3><?php echo h($task['title']); ?></h3>
                    <p><strong>Status:</strong> <?php echo h($task['status']); ?></p>
                    <p><strong>Client:</strong> <?php echo h($task['client_name']); ?></p>
                    <p><strong>Runner:</strong> <?php echo h($task['runner_name'] ?? 'Unassigned'); ?></p>
                    <a class="cta-button" href="task_chat.php?task_id=<?php echo (int) $task['id']; ?>">Open Chat</a>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
