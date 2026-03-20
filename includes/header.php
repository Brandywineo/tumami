<?php

declare(strict_types=1);
$flash = getFlash();
?>
<header class="header">
    <div class="container header__inner">
        <div class="logo">
            <a href="index.php" class="logo__link logo__wordmark" aria-label="Tumamii home">
                <span class="logo__letter logo__letter--1">t</span>
                <span class="logo__letter logo__letter--2">u</span>
                <span class="logo__letter logo__letter--3">m</span>
                <span class="logo__letter logo__letter--4">a</span>
                <span class="logo__letter logo__letter--5">m</span>
                <span class="logo__letter logo__letter--6">i</span>
                <span class="logo__letter logo__letter--7">i</span>
                <span class="logo__letter logo__letter--8">!</span>
            </a>
        </div>
        <button
            type="button"
            class="nav-toggle"
            aria-expanded="false"
            aria-controls="site-nav"
            aria-label="Toggle navigation"
            data-nav-toggle
        >
            <span aria-hidden="true">☰</span>
        </button>
        <div class="nav-drawer-backdrop" data-nav-backdrop hidden></div>
        <nav class="nav" id="site-nav" aria-label="Main navigation" data-nav>
            <div class="nav__drawer-head">
                <div class="nav__drawer-brand">tumamii!</div>
                <button
                    type="button"
                    class="nav-close"
                    aria-label="Close navigation"
                    data-nav-close
                >
                    ✕
                </button>
            </div>
            <?php if (isAuthenticated()): ?>
                <a href="dashboard_client.php">Client Dashboard</a>
                <a href="dashboard_runner.php">Runner Dashboard</a>
                <a href="browse_tasks.php">Browse Tasks</a>
                <a href="active_runners.php">Active Runners</a>
                <a href="topup.php">Top Up</a>
                <a href="settings.php">Settings</a>
                <form method="post" action="logout.php" class="logout-form">
                    <?php echo csrf_field(); ?>
                    <button type="submit" class="logout-button">Logout</button>
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
<script>
window.TUMAMI_IS_AUTHENTICATED = <?php echo isAuthenticated() ? 'true' : 'false'; ?>;
</script>
<script src="assets/js/header.js" defer></script>
