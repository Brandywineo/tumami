<?php

declare(strict_types=1);
$flash = getFlash();
?>
<header class="header">
    <div class="container header__inner">
        <div class="logo"><a href="index.php" style="text-decoration:none;color:inherit;"><?php echo h(appName()); ?></a></div>
        <nav class="nav" aria-label="Main navigation">
            <?php if (isAuthenticated()): ?>
                <a href="dashboard_client.php">Client Dashboard</a>
                <a href="dashboard_runner.php">Runner Dashboard</a>
                <a href="browse_tasks.php">Browse Tasks</a>
                <?php if (isAdmin()): ?>
                    <a href="admin_payouts.php">Admin Payouts</a>
                    <a href="admin_disputes.php">Admin Disputes</a>
                    <a href="admin_fraud_flags.php">Fraud Flags</a>
                <?php endif; ?>
                <form method="post" action="logout.php" style="display:inline-block; margin-left:20px;">
                    <?php echo csrf_field(); ?>
                    <button type="submit" style="background:none;border:none;color:#333;font-weight:500;cursor:pointer;padding:0;">Logout</button>
                </form>
            <?php else: ?>
                <a href="login.php">Login</a>
                <a href="register.php" class="button">Register</a>
            <?php endif; ?>
        </nav>
    </div>
</header>
<?php if ($flash): ?>
    <div class="container" style="margin-top:16px;">
        <div class="card" style="border-left:4px solid <?php echo $flash['type'] === 'error' ? '#d63031' : '#0a66c2'; ?>;">
            <?php echo h($flash['message']); ?>
        </div>
    </div>
<?php endif; ?>
