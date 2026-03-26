<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Flows\Auth\LoginFlow;
use App\Repositories\UserRepository;

if (isAuthenticated()) {
    $role = currentUserRole();
    redirect($role === 'runner' ? 'dashboard_runner.php' : 'dashboard_client.php');
}

$error = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $error = 'Security validation failed. Please refresh and try again.';
    } else {
        $flow = new LoginFlow(new UserRepository($pdo));
        $result = $flow->authenticate((string) ($_POST['email'] ?? ''), (string) ($_POST['password'] ?? ''));

        if (!$result['ok']) {
            $error = $result['error'];
        } else {
            $user = $result['user'];
            loginUser((int) $user['id'], $user['role']);
            unset($_SESSION['_csrf_token']);
            setFlash('success', 'Welcome back.');
            redirect($user['role'] === 'runner' ? 'dashboard_runner.php' : 'dashboard_client.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body class="auth-screen">
<main class="auth-screen__main">
    <div class="auth-brand">
        <div class="auth-brand__mark">T</div>
        <span class="auth-brand__name">Tumami</span>
    </div>

    <section class="auth-card">
        <h1 class="auth-card__title">Welcome back</h1>
        <p class="auth-card__subtitle">Sign in to continue.</p>

        <?php if ($error): ?><p class="auth-alert auth-alert--error"><?php echo h($error); ?></p><?php endif; ?>

        <form method="post" class="auth-form">
            <?php echo csrf_field(); ?>
            <label>Email
                <input type="email" name="email" required value="<?php echo h((string) ($_POST['email'] ?? '')); ?>">
            </label>
            <label>Password
                <input type="password" name="password" required>
            </label>
            <button class="cta-button cta-button--block" type="submit">Sign In</button>
        </form>

        <p class="auth-card__switch">No account yet? <a href="register.php">Create one</a></p>
    </section>
</main>
</body>
</html>
