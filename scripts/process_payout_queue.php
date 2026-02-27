<?php

declare(strict_types=1);

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../db/database.php';

use App\Services\WalletService;

$today = (int) date('N');
if (!in_array($today, [2, 4, 6], true)) {
    echo "Payout queue runs on Tue/Thu/Sat only.\n";
    exit(0);
}

$wallet = new WalletService($pdo);
$pending = $pdo->query('SELECT * FROM withdrawals WHERE status = "pending" ORDER BY requested_at ASC')->fetchAll();

foreach ($pending as $row) {
    $pdo->beginTransaction();
    try {
        $update = $pdo->prepare('UPDATE withdrawals SET status = "processed", processed_at = NOW(), payout_reference = :reference WHERE id = :id');
        $update->execute([
            'id' => (int) $row['id'],
            'reference' => 'BATCH_' . date('Ymd_His'),
        ]);

        $pdo->commit();
        echo 'Processed withdrawal #' . (int) $row['id'] . PHP_EOL;
    } catch (Throwable $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }

        $reject = $pdo->prepare('UPDATE withdrawals SET status = "rejected", processed_at = NOW(), rejection_reason = :reason WHERE id = :id');
        $reject->execute([
            'id' => (int) $row['id'],
            'reason' => 'Batch failure: ' . substr($e->getMessage(), 0, 200),
        ]);

        $wallet->recordEntry((int) $row['user_id'], null, 'credit', 'adjustment', (float) $row['amount'], 'BATCH_REJECT_REFUND');
        echo 'Rejected withdrawal #' . (int) $row['id'] . PHP_EOL;
    }
}

if ($pending === []) {
    echo "No pending withdrawals.\n";
}
