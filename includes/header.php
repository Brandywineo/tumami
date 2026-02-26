<?php

declare(strict_types=1);
?>
<header class="header">
    <div class="container header__inner">
        <div class="logo"><?php echo h(appName()); ?></div>
        <nav class="nav" aria-label="Main navigation">
            <?php if (isAuthenticated()): ?>
                <a href="dashboard_client.php">Client Dashboard</a>
                <a href="dashboard_runner.php">Runner Dashboard</a>
                <a href="logout.php">Logout</a>
            <?php else: ?>
                <a href="login.php">Login</a>
                <a href="register.php" class="button">Register</a>
            <?php endif; ?>
        </nav>
    </div>
</header>
