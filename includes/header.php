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
                <a href="logout.php">Logout</a>
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
