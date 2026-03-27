<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;

requireLogin();

$userRepo = new UserRepository($pdo);
$user = $userRepo->findById((int) currentUserId());
if (!$user) {
    logoutUser();
    redirect('login.php');
}

$role = (string) ($user['role'] ?? 'client');
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Profile | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<section class="section section--compact app-shell-page">
    <div class="container container--mobile-dense app-shell__container">
        <article class="card card--compact app-shell__header">
            <h1 class="dashboard-title">Profile</h1>
            <p class="dashboard-subtitle"><?php echo h((string) ($user['full_name'] ?? 'User')); ?> · <?php echo h(ucfirst($role)); ?></p>
        </article>

        <article class="card card--compact app-listing__section">
            <h3 style="margin:0 0 8px;">Account</h3>
            <p><strong>Email:</strong> <?php echo h((string) ($user['email'] ?? '')); ?></p>
            <p><strong>Phone:</strong> <?php echo h((string) ($user['phone'] ?? '')); ?></p>
            <p><strong>Verification:</strong> <?php echo h((string) ($user['verification_level'] ?? 'basic')); ?></p>
        </article>

        <article class="card card--compact app-listing__section">
            <a class="cta-button cta-button--block" href="settings.php">Open Settings</a>
            <?php if ($role === 'runner' || $role === 'both'): ?>
                <a class="cta-button cta-button--block cta-button--muted" href="runner_verification.php">Runner Verification</a>
            <?php endif; ?>
            <form method="post" action="logout.php" style="margin:0;">
                <?php echo csrf_field(); ?>
                <button class="cta-button cta-button--block" type="submit" style="background:#b42318;">Logout</button>
            </form>
        </article>
    </div>
</section>
<?php
$bottomNavRole = ($role === 'runner') ? 'runner' : 'client';
$bottomNavActive = 'profile';
require __DIR__ . '/includes/bottom_nav.php';
?>
</body>
</html>
