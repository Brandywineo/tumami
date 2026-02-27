<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Services\FraudService;
use App\Services\WalletService;

requireRole(['runner', 'both']);

$wallet = new WalletService($pdo);
$fraud = new FraudService($pdo);
$userId = (int) currentUserId();
$balances = $wallet->balances($userId);

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $amount = (float) ($_POST['amount'] ?? 0);
    $method = ($_POST['payout_method'] ?? 'mpesa') === 'bank' ? 'bank' : 'mpesa';
    $reference = trim((string) ($_POST['payout_reference'] ?? ''));

    try {
        if ($amount < 1500) {
            throw new RuntimeException('Minimum withdrawal is KES 1,500.');
        }

        if ($amount > $balances['available']) {
            throw new RuntimeException('Insufficient available balance.');
        }

        if ($fraud->isNewAccount($userId, 7)) {
            $fraud->flag($userId, null, 'withdrawal_hold', 'Attempted withdrawal within first 7 days.');
            throw new RuntimeException('Withdrawal hold active for new accounts (first 7 days).');
        }

        $openDisputesStmt = $pdo->prepare('SELECT COUNT(*) FROM tasks WHERE runner_id = :runner_id AND status = "disputed"');
        $openDisputesStmt->execute(['runner_id' => $userId]);
        if ((int) $openDisputesStmt->fetchColumn() > 0) {
            throw new RuntimeException('Resolve disputed tasks before withdrawal.');
        }

        $pdo->beginTransaction();

        $wallet->recordEntry($userId, null, 'debit', 'withdrawal', $amount, 'WITHDRAWAL_REQUEST');

        $stmt = $pdo->prepare('INSERT INTO withdrawals (user_id, amount, payout_method, payout_reference, status) VALUES (:user_id, :amount, :method, :reference, "pending")');
        $stmt->execute([
            'user_id' => $userId,
            'amount' => $amount,
            'method' => $method,
            'reference' => $reference,
        ]);

        $pdo->commit();
        setFlash('success', 'Withdrawal request submitted. It will be handled on Tue/Thu/Sat.');
        redirect('request_withdrawal.php');
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        setFlash('error', $e instanceof RuntimeException ? $e->getMessage() : 'Unable to request withdrawal.');
        redirect('request_withdrawal.php');
    }
}

$withdrawals = $pdo->prepare('SELECT * FROM withdrawals WHERE user_id = :user_id ORDER BY requested_at DESC');
$withdrawals->execute(['user_id' => $userId]);
$withdrawalRows = $withdrawals->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Request Withdrawal | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:760px;">
        <h2>Request Withdrawal</h2>
        <p>Available balance: <strong>KES <?php echo number_format($balances['available'], 2); ?></strong></p>
        <form method="post" class="card">
            <?php echo csrf_field(); ?>
            <p><label>Amount (KES)<br><input type="number" name="amount" min="1500" step="0.01" required style="width:100%;padding:10px;"></label></p>
            <p><label>Payout Method<br><select name="payout_method" style="width:100%;padding:10px;"><option value="mpesa">M-Pesa</option><option value="bank">Bank</option></select></label></p>
            <p><label>Payout Reference (phone/account)<br><input name="payout_reference" style="width:100%;padding:10px;"></label></p>
            <button class="cta-button" type="submit">Submit Withdrawal</button>
        </form>

        <h3 style="margin-top:24px;">My Withdrawal Requests</h3>
        <div class="grid">
            <?php foreach ($withdrawalRows as $row): ?>
                <article class="card">
                    <p><strong>KES <?php echo number_format((float) $row['amount'], 2); ?></strong></p>
                    <p>Status: <?php echo h($row['status']); ?></p>
                    <p>Requested: <?php echo h((string) $row['requested_at']); ?></p>
                </article>
            <?php endforeach; ?>
            <?php if (!$withdrawalRows): ?><p>No withdrawal requests yet.</p><?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
