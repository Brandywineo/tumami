<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Services\WalletService;

requireLogin();
if (!isAdmin()) {
    http_response_code(403);
    exit('Forbidden');
}

$wallet = new WalletService($pdo);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $id = (int) ($_POST['withdrawal_id'] ?? 0);
    $action = $_POST['action'] ?? '';
    $note = trim((string) ($_POST['note'] ?? ''));
    $today = (int) date('N');

    try {
        if ($id <= 0) {
            throw new RuntimeException('Invalid withdrawal id.');
        }

        $pdo->beginTransaction();

        $stmt = $pdo->prepare('SELECT * FROM withdrawals WHERE id = :id FOR UPDATE');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();

        if (!$row || $row['status'] !== 'pending') {
            throw new RuntimeException('Withdrawal is not pending.');
        }

        if ($action === 'process') {
            if (!in_array($today, [2, 4, 6], true)) {
                throw new RuntimeException('Payout processing is allowed on Tue/Thu/Sat only.');
            }
            $update = $pdo->prepare('UPDATE withdrawals SET status = "processed", processed_at = NOW(), payout_reference = :reference WHERE id = :id');
            $update->execute(['id' => $id, 'reference' => $note]);
            setFlash('success', 'Withdrawal processed successfully.');
        } elseif ($action === 'reject') {
            $update = $pdo->prepare('UPDATE withdrawals SET status = "rejected", processed_at = NOW(), rejection_reason = :reason WHERE id = :id');
            $update->execute(['id' => $id, 'reason' => $note !== '' ? $note : 'Rejected by admin']);
            $wallet->recordEntry((int) $row['user_id'], null, 'credit', 'adjustment', (float) $row['amount'], 'WITHDRAWAL_REJECT_REFUND');
            setFlash('success', 'Withdrawal rejected and funds refunded.');
        } else {
            throw new RuntimeException('Invalid action.');
        }

        $pdo->commit();
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        setFlash('error', $e instanceof RuntimeException ? $e->getMessage() : 'Unable to process payout.');
    }

    redirect('admin_payouts.php');
}

$pending = $pdo->query('SELECT w.*, u.full_name, u.email FROM withdrawals w JOIN users u ON u.id = w.user_id WHERE w.status = "pending" ORDER BY w.requested_at ASC')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Payout Queue | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container">
        <h2>Payout Queue (Tue/Thu/Sat)</h2>
        <div class="grid">
            <?php foreach ($pending as $row): ?>
                <article class="card">
                    <p><strong><?php echo h($row['full_name']); ?></strong> (<?php echo h($row['email']); ?>)</p>
                    <p>KES <?php echo number_format((float) $row['amount'], 2); ?> via <?php echo h($row['payout_method']); ?></p>
                    <p>Requested: <?php echo h((string) $row['requested_at']); ?></p>
                    <form method="post" style="margin-bottom:8px;">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="withdrawal_id" value="<?php echo (int) $row['id']; ?>">
                        <input type="hidden" name="action" value="process">
                        <input name="note" placeholder="Transaction reference" style="width:100%;padding:8px; margin-bottom:8px;">
                        <button class="cta-button" type="submit">Process</button>
                    </form>
                    <form method="post">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="withdrawal_id" value="<?php echo (int) $row['id']; ?>">
                        <input type="hidden" name="action" value="reject">
                        <input name="note" placeholder="Rejection reason" style="width:100%;padding:8px; margin-bottom:8px;">
                        <button type="submit" style="background:#d63031;color:#fff;border:none;padding:10px 16px;border-radius:5px;cursor:pointer;">Reject</button>
                    </form>
                </article>
            <?php endforeach; ?>
            <?php if (!$pending): ?><p>No pending withdrawals.</p><?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
