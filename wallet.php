<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Services\WalletService;
use App\Services\DarajaService;

requireRole(['client', 'runner', 'both']);

$userId = (int) currentUserId();
$wallet = new WalletService($pdo);
$daraja = new DarajaService();
$balances = $wallet->balances($userId);
$transactions = $wallet->recentTransactions($userId, 25);

$flow = (string) ($_GET['flow'] ?? 'topup');
if (!in_array($flow, ['topup', 'withdraw'], true)) {
    $flow = 'topup';
}

$errors = [];
$success = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $errors[] = 'Security validation failed. Please refresh and try again.';
    }

    $action = (string) ($_POST['action'] ?? '');
    $amount = (float) ($_POST['amount'] ?? 0);
    $phone = trim((string) ($_POST['phone_number'] ?? ''));

    if ($amount <= 0) {
        $errors[] = 'Enter a valid amount.';
    }

    if ($phone === '') {
        $errors[] = 'Enter your M-Pesa number.';
    }

    if ($errors === []) {
        if ($action === 'topup') {
            $darajaResult = $daraja->stkPush($phone, $amount, 'TUMAMI_TOPUP', 'Tumami Wallet Top Up');
            if (!$darajaResult['ok']) {
                $errors[] = (string) ($darajaResult['error'] ?? 'Unable to initiate M-Pesa STK push.');
            } else {
                $wallet->recordPendingTopup($userId, $amount, (string) ($darajaResult['reference'] ?: 'DARAJA_TOPUP_PENDING'));
                $success = 'Top up request sent. Confirm the STK prompt on your phone.';
                $flow = 'topup';
            }
        }

        if ($action === 'withdraw') {
            if ($amount > (float) $balances['withdrawable']) {
                $errors[] = 'Insufficient withdrawable balance. Clear pending withdrawals or lower amount.';
            } else {
                $darajaResult = $daraja->b2cWithdraw($phone, $amount, 'Tumami wallet withdrawal');
                if (!$darajaResult['ok']) {
                    $errors[] = (string) ($darajaResult['error'] ?? 'Unable to initiate withdrawal request.');
                } else {
                    $wallet->recordPendingWithdrawal($userId, $amount, (string) ($darajaResult['reference'] ?: 'DARAJA_WITHDRAW_PENDING'));
                    $success = 'Withdrawal request submitted. We will update wallet status after Daraja callback.';
                    $flow = 'withdraw';
                }
            }
        }

        $balances = $wallet->balances($userId);
        $transactions = $wallet->recentTransactions($userId, 25);
    }
}

function walletTypeLabel(string $type): string
{
    return match ($type) {
        'deposit' => 'Wallet Top Up',
        'withdrawal' => 'Wallet Withdrawal',
        'task_earning' => 'Task Earning',
        'commission' => 'Platform Commission',
        default => ucfirst(str_replace('_', ' ', $type)),
    };
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wallet | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<section class="section section--compact app-shell-page">
    <div class="container container--mobile-dense app-shell__container" style="max-width:620px;">
        <article class="card card--compact wallet-hero">
            <p class="wallet-hero__label">Available Balance</p>
            <p class="wallet-hero__amount">KES <?php echo number_format((float) $balances['available'], 2); ?></p>
            <div class="wallet-hero__meta">
                <span>Withdrawable: KES <?php echo number_format((float) $balances['withdrawable'], 2); ?></span>
                <span>Pending In: KES <?php echo number_format((float) $balances['pending_credit'], 2); ?></span>
                <span>Pending Out: KES <?php echo number_format((float) $balances['pending_debit'], 2); ?></span>
            </div>
        </article>

        <?php if ($errors): ?>
            <article class="card card--compact auth-alert auth-alert--error">
                <?php foreach ($errors as $error): ?>
                    <p style="margin:0 0 6px;"><?php echo h($error); ?></p>
                <?php endforeach; ?>
            </article>
        <?php endif; ?>

        <?php if ($success): ?>
            <article class="card card--compact auth-alert auth-alert--success"><p style="margin:0;"><?php echo h($success); ?></p></article>
        <?php endif; ?>

        <article class="card card--compact">
            <div class="wallet-tabs">
                <a class="wallet-tab <?php echo $flow === 'topup' ? 'is-active' : ''; ?>" href="wallet.php?flow=topup">Top Up</a>
                <a class="wallet-tab <?php echo $flow === 'withdraw' ? 'is-active' : ''; ?>" href="wallet.php?flow=withdraw">Withdraw</a>
            </div>

            <form method="post" class="wallet-form">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="action" value="<?php echo h($flow); ?>">

                <label>M-Pesa Number
                    <input type="tel" name="phone_number" required placeholder="2547XXXXXXXX" value="<?php echo h((string) ($_POST['phone_number'] ?? '')); ?>">
                </label>
                <label>Amount (KES)
                    <input type="number" step="0.01" min="1" name="amount" required value="<?php echo h((string) ($_POST['amount'] ?? '')); ?>">
                </label>

                <?php if ($flow === 'topup'): ?>
                    <p class="wallet-form__hint">You will receive an STK push prompt on your phone.</p>
                <?php else: ?>
                    <p class="wallet-form__hint">Withdrawal uses Daraja B2C and remains pending until callback confirmation.</p>
                <?php endif; ?>

                <button class="cta-button cta-button--block" type="submit"><?php echo $flow === 'topup' ? 'Request Top Up' : 'Request Withdrawal'; ?></button>
            </form>
        </article>

        <article class="card card--compact app-listing__section">
            <div class="app-listing__section-header">
                <h3>Recent Transactions</h3>
                <span class="app-listing__chip"><?php echo count($transactions); ?></span>
            </div>

            <div class="wallet-transactions">
                <?php if ($transactions === []): ?>
                    <p class="list-empty">No wallet transactions yet.</p>
                <?php endif; ?>

                <?php foreach ($transactions as $transaction): ?>
                    <?php
                        $isCredit = (string) $transaction['direction'] === 'credit';
                        $status = (string) ($transaction['status'] ?? 'pending');
                        $statusClass = $status === 'completed' ? 'task-status--completed' : ($status === 'pending' ? 'task-status--posted' : 'task-status--cancelled');
                    ?>
                    <article class="wallet-tx-card">
                        <div>
                            <p class="wallet-tx-card__title"><?php echo h(walletTypeLabel((string) $transaction['type'])); ?></p>
                            <p class="wallet-tx-card__meta"><?php echo h((string) ($transaction['created_at'] ?? '')); ?> · Ref: <?php echo h((string) ($transaction['reference'] ?? '-')); ?></p>
                        </div>
                        <div class="wallet-tx-card__amount <?php echo $isCredit ? 'is-credit' : 'is-debit'; ?>">
                            <?php echo $isCredit ? '+' : '-'; ?> KES <?php echo number_format((float) $transaction['amount'], 2); ?>
                        </div>
                        <span class="task-status-chip <?php echo h($statusClass); ?>"><?php echo h(ucfirst($status)); ?></span>
                    </article>
                <?php endforeach; ?>
            </div>
        </article>
    </div>
</section>
<?php
$bottomNavRole = currentUserRole() === 'runner' ? 'runner' : 'client';
$bottomNavActive = 'wallet';
require __DIR__ . '/includes/bottom_nav.php';
?>
</body>
</html>
