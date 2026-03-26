<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Flows\Auth\RegistrationFlow;
use App\Repositories\UserRepository;

if (isAuthenticated()) {
    redirect('role_select.php');
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $errors[] = 'Security validation failed. Please refresh and try again.';
    } else {
        $_POST['role'] = 'client';
        $flow = new RegistrationFlow(new UserRepository($pdo));
        $result = $flow->register($_POST);

        if (!$result['ok']) {
            $errors = $result['errors'];
        } else {
            loginUser((int) $result['user_id'], 'client');
            unset($_SESSION['_csrf_token']);
            setFlash('success', 'Welcome to Tumami. Select how you want to use the app.');
            redirect('role_select.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Sign Up | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body class="auth-screen">
<main class="auth-screen__main">
    <div class="auth-brand">
        <div class="auth-brand__mark">T</div>
        <span class="auth-brand__name">Tumami</span>
    </div>

    <section class="auth-card">
        <h1 class="auth-card__title">Create your account</h1>
        <p class="auth-card__subtitle">Join Tumami and get errands done fast.</p>

        <?php if ($errors): ?>
            <div class="auth-alert auth-alert--error">
                <?php foreach ($errors as $error): ?>
                    <p style="margin:0 0 6px;"><?php echo h($error); ?></p>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>

        <form method="post" class="auth-form">
            <?php echo csrf_field(); ?>
            <label>Full name
                <input type="text" name="full_name" required value="<?php echo h((string) ($_POST['full_name'] ?? '')); ?>">
            </label>
            <label>Email
                <input type="email" name="email" required value="<?php echo h((string) ($_POST['email'] ?? '')); ?>">
            </label>
            <label>Phone number
                <input type="text" name="phone" required value="<?php echo h((string) ($_POST['phone'] ?? '')); ?>">
            </label>
            <label>Password
                <input type="password" name="password" required>
            </label>
            <button class="cta-button cta-button--block" type="submit">Create Account</button>
        </form>

        <p class="auth-card__switch">Already have an account? <a href="login.php">Sign in</a></p>
    </section>
</main>
</body>
</html>
