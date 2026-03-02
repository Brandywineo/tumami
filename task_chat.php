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
<section class="section section--tight">
    <div class="container chat-page">
        <div class="chat-card">
            <div class="chat-header">
                <div>
                    <h2>Task Chat</h2>
                    <p><strong><?php echo h($task['title']); ?></strong> · <?php echo h($task['status']); ?></p>
                    <p>Client: <?php echo h($task['client_name']); ?> · Runner: <?php echo h($task['runner_name'] ?? 'Unassigned'); ?></p>
                </div>
                <a class="cta-button" href="dashboard_client.php">Back</a>
            </div>

            <div id="chat-messages" class="chat-messages" aria-live="polite"></div>

            <form id="chat-form" class="chat-compose">
                <input type="text" id="chat-input" name="message" maxlength="1000" placeholder="Type a message..." required>
                <button class="cta-button" type="submit">Send</button>
            </form>
        </div>
    </div>
</section>
<script>
(() => {
    const taskId = <?php echo (int) $taskId; ?>;
    const currentUserId = <?php echo (int) currentUserId(); ?>;
    const messagesEl = document.getElementById('chat-messages');
    const formEl = document.getElementById('chat-form');
    const inputEl = document.getElementById('chat-input');
    let lastId = 0;

    const formatTs = (value) => {
        const d = new Date(value.replace(' ', 'T'));
        return Number.isNaN(d.getTime()) ? value : d.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'});
    };

    const render = (messages) => {
        if (!Array.isArray(messages) || messages.length === 0) return;
        messages.forEach((msg) => {
            lastId = Math.max(lastId, Number(msg.id));
            const row = document.createElement('div');
            row.className = 'chat-bubble' + (Number(msg.sender_id) === currentUserId ? ' chat-bubble--me' : '');
            row.innerHTML = `<p>${msg.message}</p><small>${msg.sender_name} · ${formatTs(msg.created_at)}</small>`;
            messagesEl.appendChild(row);
        });
        messagesEl.scrollTop = messagesEl.scrollHeight;
    };

    const load = async () => {
        const response = await fetch(`api/task_messages.php?task_id=${taskId}&since_id=${lastId}`, {credentials: 'same-origin'});
        if (!response.ok) return;
        const data = await response.json();
        render(data.messages || []);
    };

    formEl.addEventListener('submit', async (e) => {
        e.preventDefault();
        const message = inputEl.value.trim();
        if (!message) return;

        const response = await fetch(`api/task_messages.php?task_id=${taskId}`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            credentials: 'same-origin',
            body: JSON.stringify({message})
        });

        if (response.ok) {
            const data = await response.json();
            render([data.message]);
            inputEl.value = '';
        }
    });

    load();
    setInterval(load, 3000);
})();
</script>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
