<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Services\WalletService;
use App\Services\DarajaService;

requireRole(['client', 'runner', 'both']);

$userId = (int) currentUserId();
$role = (string) currentUserRole();
$dashboardUrl = $role === 'runner' ? 'dashboard_runner.php' : 'dashboard_client.php';
$wallet = new WalletService($pdo);
$daraja = new DarajaService();
$balances = $wallet->balances($userId);
$errors = [];
$darajaMessage = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $errors[] = 'Security validation failed. Please refresh and try again.';
    }

    $amount = (float) ($_POST['amount'] ?? 0);
    $phone = trim((string) ($_POST['phone_number'] ?? ''));
    if ($amount <= 0) {
        $errors[] = 'Enter a valid top-up amount.';
    }
    if ($phone === '') {
        $errors[] = 'Enter your M-Pesa phone number to receive the STK prompt.';
    }

    if ($errors === []) {
        $darajaResult = $daraja->stkPush($phone, $amount, 'TUMAMI_TOPUP', 'Tumami Wallet Top Up');

        if (!$darajaResult['ok']) {
            $errors[] = (string) ($darajaResult['error'] ?? 'Unable to initiate M-Pesa STK push.');
        } else {
            $stmt = $pdo->prepare('INSERT INTO wallet_transactions (user_id, task_id, direction, type, amount, status, reference) VALUES (:user_id, NULL, "credit", "deposit", :amount, "pending", :reference)');
            $stmt->execute([
                'user_id' => $userId,
                'amount' => $amount,
                'reference' => (string) ($darajaResult['reference'] ?? 'DARAJA_PENDING'),
            ]);

            $darajaMessage = 'M-Pesa prompt sent. Complete payment on your phone to finalize top-up.';
        }
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
        <?php if ($darajaMessage): ?><div class="card" style="border-left:4px solid #0a66c2;"><p><?php echo h($darajaMessage); ?></p></div><?php endif; ?>

        <article class="card" style="margin-bottom:14px;">
            <h3>Current Balance</h3>
            <p style="font-size:26px;"><strong>KES <?php echo number_format($balances['available'], 2); ?></strong></p>
        </article>

        <form method="post" class="card">
            <?php echo csrf_field(); ?>
            <p><label>M-Pesa Number<br><input type="tel" name="phone_number" required placeholder="2547XXXXXXXX" style="width:100%; padding:10px;" value="<?php echo h((string) ($_POST['phone_number'] ?? '')); ?>"></label></p>
            <p><label>Amount (KES)<br><input type="number" step="0.01" min="1" name="amount" required style="width:100%; padding:10px;"></label></p>
            <button class="cta-button" type="submit">Add Balance</button>
            <a href="<?php echo h($dashboardUrl); ?>" class="cta-button" style="margin-left:10px; background:#6b7280;">Back</a>
        </form>
    </div>
</section>
<?php
$bottomNavRole = $role === 'runner' ? 'runner' : 'client';
$bottomNavActive = 'wallet';
require __DIR__ . '/includes/bottom_nav.php';
?>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
