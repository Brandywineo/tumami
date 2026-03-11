<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Services\WalletService;

requireRole(['client', 'both']);

$userId = (int) currentUserId();
$wallet = new WalletService($pdo);
$balances = $wallet->balances($userId);
$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $errors[] = 'Security validation failed. Please refresh and try again.';
    }

    $amount = (float) ($_POST['amount'] ?? 0);
    if ($amount <= 0) {
        $errors[] = 'Enter a valid top-up amount.';
    }

    if ($errors === []) {
        $stmt = $pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, NULL, "credit", "deposit", :amount, "completed", :reference)');
        $stmt->execute([
            'user_id' => $userId,
            'amount' => $amount,
            'reference' => 'CLIENT_TOPUP',
        ]);

        setFlash('success', 'Wallet topped up successfully.');
        redirect('dashboard_client.php');
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Top Up Wallet | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:640px;">
        <h2>Top Up Wallet</h2>
        <?php if ($errors): ?><div class="card" style="border-left:4px solid #d63031;"><?php foreach ($errors as $error): ?><p><?php echo h($error); ?></p><?php endforeach; ?></div><?php endif; ?>

        <article class="card" style="margin-bottom:14px;">
            <h3>Current Balance</h3>
            <p style="font-size:26px;"><strong>KES <?php echo number_format($balances['available'], 2); ?></strong></p>
        </article>

        <form method="post" class="card">
            <?php echo csrf_field(); ?>
            <p><label>Amount (KES)<br><input type="number" step="0.01" min="1" name="amount" required style="width:100%; padding:10px;"></label></p>
            <button class="cta-button" type="submit">Add Balance</button>
            <a href="dashboard_client.php" class="cta-button" style="margin-left:10px; background:#6b7280;">Back</a>
        </form>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
