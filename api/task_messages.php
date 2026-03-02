<?php

declare(strict_types=1);

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../db/database.php';

requireLogin();

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$taskId = (int) ($_GET['task_id'] ?? ($_POST['task_id'] ?? 0));
$userId = (int) currentUserId();

if ($taskId <= 0) {
    jsonResponse(['error' => 'task_id is required'], 422);
}

$taskStmt = $pdo->prepare('SELECT id, client_id, runner_id FROM tasks WHERE id = :id LIMIT 1');
$taskStmt->execute(['id' => $taskId]);
$task = $taskStmt->fetch();
if (!$task) {
    jsonResponse(['error' => 'Task not found'], 404);
}

if ($userId !== (int) $task['client_id'] && $userId !== (int) ($task['runner_id'] ?? 0)) {
    jsonResponse(['error' => 'Forbidden'], 403);
}

if ($method === 'GET') {
    $sinceId = isset($_GET['since_id']) ? (int) $_GET['since_id'] : 0;
    $sql = 'SELECT tm.id, tm.task_id, tm.sender_id, u.full_name AS sender_name, tm.message, tm.created_at
            FROM task_messages tm
            JOIN users u ON u.id = tm.sender_id
            WHERE tm.task_id = :task_id';
    $params = ['task_id' => $taskId];
    if ($sinceId > 0) {
        $sql .= ' AND tm.id > :since_id';
        $params['since_id'] = $sinceId;
    }
    $sql .= ' ORDER BY tm.id ASC LIMIT 200';

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    jsonResponse(['messages' => $stmt->fetchAll()]);
}

if ($method === 'POST') {
    $payload = readJsonInput();
    $message = trim((string) ($payload['message'] ?? ($_POST['message'] ?? '')));
    if ($message === '') {
        jsonResponse(['error' => 'Message is required'], 422);
    }

    $stmt = $pdo->prepare('INSERT INTO task_messages (task_id, sender_id, message) VALUES (:task_id, :sender_id, :message)');
    $stmt->execute([
        'task_id' => $taskId,
        'sender_id' => $userId,
        'message' => $message,
    ]);

    $id = (int) $pdo->lastInsertId();
    $msgStmt = $pdo->prepare('SELECT tm.id, tm.task_id, tm.sender_id, u.full_name AS sender_name, tm.message, tm.created_at
                              FROM task_messages tm
                              JOIN users u ON u.id = tm.sender_id
                              WHERE tm.id = :id LIMIT 1');
    $msgStmt->execute(['id' => $id]);

    jsonResponse(['message' => $msgStmt->fetch()], 201);
}

jsonResponse(['error' => 'Method Not Allowed'], 405);
