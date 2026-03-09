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
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:560px;">
        <h2>Login</h2>
        <?php if ($error): ?><div class="card" style="border-left:4px solid #d63031; margin-bottom:16px;"><?php echo h($error); ?></div><?php endif; ?>
        <form class="card" method="post">
            <?php echo csrf_field(); ?>
            <p><label>Email<br><input type="email" name="email" required style="width:100%;padding:10px;"></label></p>
            <p><label>Password<br><input type="password" name="password" required style="width:100%;padding:10px;"></label></p>
            <button class="cta-button" type="submit">Login</button>
        </form>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
