<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

requireLogin();
if (!isAdmin()) {
    http_response_code(403);
    exit('Forbidden');
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        http_response_code(403);
        exit('Invalid CSRF token');
    }

    $flagId = (int) ($_POST['flag_id'] ?? 0);
    if ($flagId > 0) {
        $stmt = $pdo->prepare('UPDATE anti_fraud_flags SET is_resolved = 1, resolved_at = NOW() WHERE id = :id');
        $stmt->execute(['id' => $flagId]);
        setFlash('success', 'Fraud flag marked as resolved.');
    }

    redirect('admin_fraud_flags.php');
}

$flags = $pdo->query('SELECT aff.*, u.full_name FROM anti_fraud_flags aff JOIN users u ON u.id = aff.user_id WHERE aff.is_resolved = 0 ORDER BY aff.created_at DESC')->fetchAll();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Anti-Fraud Flags | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container">
        <h2>Anti-Fraud Flags</h2>
        <div class="grid">
            <?php foreach ($flags as $flag): ?>
                <article class="card">
                    <p><strong><?php echo h($flag['flag_type']); ?></strong> — <?php echo h($flag['full_name']); ?></p>
                    <p><?php echo h($flag['details']); ?></p>
                    <p><small><?php echo h((string) $flag['created_at']); ?></small></p>
                    <form method="post">
                        <?php echo csrf_field(); ?>
                        <input type="hidden" name="flag_id" value="<?php echo (int) $flag['id']; ?>">
                        <button class="cta-button" type="submit">Mark Resolved</button>
                    </form>
                </article>
            <?php endforeach; ?>
            <?php if (!$flags): ?><p>No active fraud flags.</p><?php endif; ?>
        </div>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
