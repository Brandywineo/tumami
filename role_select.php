<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;

requireLogin();

$userId = (int) currentUserId();
$userRepo = new UserRepository($pdo);
$user = $userRepo->findById($userId);

if (!$user) {
    logoutUser();
    redirect('login.php');
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $error = 'Security validation failed. Please refresh and try again.';
    } else {
        $selectedRole = (string) ($_POST['role'] ?? '');
        if (!in_array($selectedRole, ['client', 'runner', 'both'], true)) {
            $error = 'Please choose how you want to use Tumami.';
        } else {
            $userRepo->setRole($userId, $selectedRole);
            loginUser($userId, $selectedRole);

            if ($selectedRole === 'runner' || $selectedRole === 'both') {
                redirect('runner_verification.php');
            }

            redirect('dashboard_client.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Choose Role | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body class="auth-screen">
<main class="auth-screen__main">
    <div class="auth-brand">
        <div class="auth-brand__mark">T</div>
        <span class="auth-brand__name">Tumami</span>
    </div>

    <section class="auth-card role-card">
        <h1 class="auth-card__title">How will you use Tumami?</h1>
        <p class="auth-card__subtitle">You can update this later in your profile.</p>

        <?php if ($error): ?>
            <p class="auth-alert auth-alert--error"><?php echo h($error); ?></p>
        <?php endif; ?>

        <form method="post" class="role-card__form">
            <?php echo csrf_field(); ?>

            <label class="role-option">
                <input type="radio" name="role" value="client" <?php echo (($user['role'] ?? 'client') === 'client') ? 'checked' : ''; ?>>
                <span>
                    <strong>I need errands done</strong>
                    <small>Post errands and track progress live on map.</small>
                </span>
            </label>

            <label class="role-option">
                <input type="radio" name="role" value="runner" <?php echo (($user['role'] ?? '') === 'runner') ? 'checked' : ''; ?>>
                <span>
                    <strong>I want to earn as a runner</strong>
                    <small>Accept tasks in your area and earn from deliveries.</small>
                </span>
            </label>

            <label class="role-option">
                <input type="radio" name="role" value="both" <?php echo (($user['role'] ?? '') === 'both') ? 'checked' : ''; ?>>
                <span>
                    <strong>I want both</strong>
                    <small>Switch between client and runner flows when needed.</small>
                </span>
            </label>

            <button type="submit" class="cta-button cta-button--block">Continue</button>
        </form>
    </section>
</main>
</body>
</html>
