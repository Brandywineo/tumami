<?php

declare(strict_types=1);
$flash = getFlash();
$mobileMenuId = 'mobile-menu';
?>
<header class="header">
    <div class="container header__inner">
        <div class="logo"><a href="index.php" class="logo__link">TUMAMI</a></div>

        <?php if (isAuthenticated()): ?>
            <button class="menu-toggle" type="button" aria-controls="<?php echo h($mobileMenuId); ?>" aria-expanded="false" id="menu-toggle-btn" aria-label="Toggle navigation menu">
                <span></span><span></span><span></span>
            </button>
            <nav class="nav nav--auth" aria-label="Main navigation" id="<?php echo h($mobileMenuId); ?>">
                <a href="dashboard_client.php">Client Dashboard</a>
                <a href="dashboard_runner.php">Runner Dashboard</a>
                <a href="browse_tasks.php">Browse Tasks</a>
                <?php if (isAdmin()): ?>
                    <a href="admin_payouts.php">Admin Payouts</a>
                    <a href="admin_disputes.php">Admin Disputes</a>
                    <a href="admin_fraud_flags.php">Fraud Flags</a>
                <?php endif; ?>
                <form method="post" action="logout.php" class="logout-form">
                    <?php echo csrf_field(); ?>
                    <button type="submit">Logout</button>
                </form>
            </nav>
        <?php else: ?>
            <nav class="nav nav--guest" aria-label="Guest navigation">
                <a href="login.php">Login</a>
                <a href="register.php" class="button">Register</a>
            </nav>
        <?php endif; ?>
    </div>
</header>

<?php if ($flash): ?>
    <div class="container" style="margin-top:16px;">
        <div class="card" style="border-left:4px solid <?php echo $flash['type'] === 'error' ? '#d63031' : '#0a66c2'; ?>;">
            <?php echo h($flash['message']); ?>
        </div>
    </div>
<?php endif; ?>

<?php if (isAuthenticated()): ?>
<script>
(function () {
    const button = document.getElementById('menu-toggle-btn');
    const menu = document.getElementById('<?php echo h($mobileMenuId); ?>');

    if (!button || !menu) {
        return;
    }

    button.addEventListener('click', function () {
        const isOpen = menu.classList.toggle('is-open');
        button.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    });

    document.addEventListener('click', function (event) {
        if (!menu.contains(event.target) && !button.contains(event.target)) {
            menu.classList.remove('is-open');
            button.setAttribute('aria-expanded', 'false');
        }
    });
})();
</script>
<?php endif; ?>
