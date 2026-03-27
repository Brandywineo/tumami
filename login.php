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
$forgotMessage = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $mode = (string) ($_POST['mode'] ?? 'login');

    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        $error = 'Security validation failed. Please refresh and try again.';
    } elseif ($mode === 'forgot') {
        $email = trim((string) ($_POST['forgot_email'] ?? ''));
        if ($email === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
            $error = 'Enter a valid email address to continue.';
        } else {
            $forgotMessage = 'Password reset is not self-service yet. Please contact support with your email: ' . $email;
        }
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
        <div id="login-panel" class="auth-panel is-active">
            <h1 class="auth-card__title">Welcome back</h1>
            <p class="auth-card__subtitle">Sign in to continue.</p>

            <?php if ($error): ?><p class="auth-alert auth-alert--error"><?php echo h($error); ?></p><?php endif; ?>
            <?php if ($forgotMessage): ?><p class="auth-alert auth-alert--success"><?php echo h($forgotMessage); ?></p><?php endif; ?>

            <form method="post" class="auth-form" id="login-form">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="mode" value="login">
                <label>Email
                    <input type="email" name="email" required value="<?php echo h((string) ($_POST['email'] ?? '')); ?>">
                </label>
                <label>Password
                    <div class="auth-password-wrap">
                        <input type="password" name="password" id="login-password" required>
                        <button type="button" class="auth-password-toggle" data-toggle-password>Show</button>
                    </div>
                </label>
                <button type="button" class="auth-link-button" data-show-forgot>Forgot password?</button>
                <button class="cta-button cta-button--block" type="submit" id="login-submit-btn">Sign In</button>
            </form>

            <p class="auth-card__switch">No account yet? <a href="register.php">Create one</a></p>
        </div>

        <div id="forgot-panel" class="auth-panel">
            <h1 class="auth-card__title">Forgot password?</h1>
            <p class="auth-card__subtitle">Enter your email and we'll guide recovery.</p>

            <form method="post" class="auth-form">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="mode" value="forgot">
                <label>Email
                    <input type="email" name="forgot_email" placeholder="you@example.com" required>
                </label>
                <button class="cta-button cta-button--block" type="submit">Send reset request</button>
                <button type="button" class="auth-link-button" data-show-login>Back to login</button>
            </form>
        </div>
    </section>
</main>
<script>
(() => {
    const loginPanel = document.getElementById('login-panel');
    const forgotPanel = document.getElementById('forgot-panel');
    const showForgotBtn = document.querySelector('[data-show-forgot]');
    const showLoginBtn = document.querySelector('[data-show-login]');
    const passwordInput = document.getElementById('login-password');
    const passwordToggle = document.querySelector('[data-toggle-password]');
    const submitBtn = document.getElementById('login-submit-btn');
    const form = document.getElementById('login-form');

    const showForgot = () => {
        loginPanel.classList.remove('is-active');
        forgotPanel.classList.add('is-active');
    };

    const showLogin = () => {
        forgotPanel.classList.remove('is-active');
        loginPanel.classList.add('is-active');
    };

    showForgotBtn?.addEventListener('click', showForgot);
    showLoginBtn?.addEventListener('click', showLogin);

    passwordToggle?.addEventListener('click', () => {
        if (!passwordInput) return;
        const visible = passwordInput.type === 'text';
        passwordInput.type = visible ? 'password' : 'text';
        passwordToggle.textContent = visible ? 'Show' : 'Hide';
    });

    form?.addEventListener('submit', () => {
        if (!submitBtn) return;
        submitBtn.disabled = true;
        submitBtn.textContent = 'Signing in...';
    });
})();
</script>
</body>
</html>
