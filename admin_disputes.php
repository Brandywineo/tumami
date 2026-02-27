<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\TaskRepository;
use App\Services\WalletService;

requireLogin();
if (!isAdmin()) {
    http_response_code(403);
    exit('Forbidden');
}

$wallet = new WalletService($pdo);
$taskRepo = new TaskRepository($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $disputeId = (int) ($_POST['dispute_id'] ?? 0);
    $outcome = $_POST['outcome'] ?? '';
    $notes = trim((string) ($_POST['notes'] ?? ''));

    try {
        if ($disputeId <= 0) {
            throw new RuntimeException('Invalid dispute id.');
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare('SELECT d.*, t.client_id, t.runner_id, t.runner_fee FROM disputes d JOIN tasks t ON t.id = d.task_id WHERE d.id = :id FOR UPDATE');
        $stmt->execute(['id' => $disputeId]);
        $row = $stmt->fetch();

        if (!$row || !in_array($row['status'], ['open', 'under_review'], true)) {
            throw new RuntimeException('Dispute is not open.');
        }

        $taskId = (int) $row['task_id'];
        $clientId = (int) $row['client_id'];
        $runnerId = (int) ($row['runner_id'] ?? 0);
        $fee = (float) $row['runner_fee'];

        if ($outcome === 'runner_full') {
            if ($runnerId > 0) {
                $wallet->releaseCompletion($runnerId, $taskId, $fee);
            }
        } elseif ($outcome === 'client_refund') {
            $wallet->recordEntry($clientId, $taskId, 'credit', 'refund', $fee, 'DISPUTE_CLIENT_REFUND');
        } elseif ($outcome === 'split50') {
            $runnerShare = round($fee * 0.50, 2);
            $commission = round($runnerShare * 0.10, 2);
            $runnerNet = round($runnerShare - $commission, 2);
            $clientRefund = round($fee - $runnerShare, 2);
            if ($runnerId > 0) {
                $wallet->recordEntry($runnerId, $taskId, 'credit', 'task_earning', $runnerNet, 'DISPUTE_SPLIT_RUNNER');
            }
            $wallet->recordEntry($clientId, $taskId, 'credit', 'refund', $clientRefund, 'DISPUTE_SPLIT_CLIENT_REFUND');
            $wallet->recordEntry(1, $taskId, 'credit', 'commission', $commission, 'DISPUTE_SPLIT_COMMISSION');
        } else {
            throw new RuntimeException('Invalid resolution outcome.');
        }

        $updateDispute = $pdo->prepare('UPDATE disputes SET status = "resolved", resolution_notes = :notes, updated_at = NOW() WHERE id = :id');
        $updateDispute->execute(['id' => $disputeId, 'notes' => $notes !== '' ? $notes : $outcome]);

        $task = $taskRepo->findByIdForUpdate($taskId);
        if ($task && $task['status'] === 'disputed') {
            $taskRepo->setStatus($taskId, 'completed', 1);
        }

        $pdo->commit();
        setFlash('success', 'Dispute resolved successfully.');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        setFlash('error', $e instanceof RuntimeException ? $e->getMessage() : 'Unable to resolve dispute.');
    }

    redirect('admin_disputes.php');
}

$rows = $pdo->query('SELECT d.*, t.title, t.status AS task_status, u.full_name AS opened_by_name FROM disputes d JOIN tasks t ON t.id = d.task_id JOIN users u ON u.id = d.opened_by WHERE d.status IN ("open", "under_review") ORDER BY d.created_at ASC')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Disputes | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container">
        <h2>Dispute Resolution Queue</h2>
        <div class="grid">
            <?php foreach ($rows as $row): ?>
                <article class="card">
                    <h3><?php echo h($row['title']); ?> (#<?php echo (int) $row['task_id']; ?>)</h3>
                    <p>Opened by: <?php echo h($row['opened_by_name']); ?></p>
                    <p><?php echo h($row['reason']); ?></p>
                    <form method="post">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="dispute_id" value="<?php echo (int) $row['id']; ?>">
                        <p><select name="outcome" style="width:100%;padding:8px;">
                            <option value="runner_full">Runner Full Payout</option>
                            <option value="client_refund">Client Full Refund</option>
                            <option value="split50">Split 50/50</option>
                        </select></p>
                        <p><textarea name="notes" placeholder="Resolution notes" style="width:100%;padding:8px;"></textarea></p>
                        <button class="cta-button" type="submit">Resolve</button>
                    </form>
                </article>
            <?php endforeach; ?>
            <?php if (!$rows): ?><p>No open disputes.</p><?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
