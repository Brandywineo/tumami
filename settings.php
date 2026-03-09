<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Flows\UserSettings\PasswordFlow;
use App\Repositories\UserRepository;

requireLogin();

$userRepo = new UserRepository($pdo);
$passwordFlow = new PasswordFlow($userRepo);
$userId = (int) currentUserId();
$user = $userRepo->findById($userId);

if (!$user) {
    logoutUser();
    redirect('login.php');
}

$themeError = null;
$passwordError = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    if (!csrf_validate($_POST['_csrf'] ?? null)) {
        setFlash('error', 'Security validation failed. Please refresh and try again.');
        redirect('settings.php');
    }

    $action = (string) ($_POST['action'] ?? '');

    if ($action === 'theme') {
        $theme = resolveThemeFromInput((string) ($_POST['theme'] ?? THEME_SYSTEM));
        saveThemePreference($theme);
        setFlash('success', 'Theme preference updated.');
        redirect('settings.php');
    }

    if ($action === 'password') {
        $result = $passwordFlow->changePassword(
            $userId,
            (string) ($_POST['current_password'] ?? ''),
            (string) ($_POST['new_password'] ?? ''),
            (string) ($_POST['confirm_password'] ?? '')
        );

        if (!$result['ok']) {
            $passwordError = $result['error'];
        } else {
            unset($_SESSION['_csrf_token']);
            setFlash('success', 'Password updated successfully.');
            redirect('settings.php');
        }
    }
}

$currentTheme = currentThemePreference();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>User Settings | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:740px;">
        <h2>User Settings</h2>

        <article class="card" style="margin-bottom:20px;">
            <h3>Theme preference</h3>
            <?php if ($themeError): ?><p style="color:#d63031"><?php echo h($themeError); ?></p><?php endif; ?>
            <form method="post">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="action" value="theme">
                <p><label>Select theme<br>
                    <select name="theme" style="width:100%;padding:10px;">
                        <option value="system" <?php echo $currentTheme === 'system' ? 'selected' : ''; ?>>System</option>
                        <option value="light" <?php echo $currentTheme === 'light' ? 'selected' : ''; ?>>Light</option>
                        <option value="dark" <?php echo $currentTheme === 'dark' ? 'selected' : ''; ?>>Dark</option>
                    </select>
                </label></p>
                <button class="cta-button" type="submit">Save Theme</button>
            </form>
        </article>

        <article class="card">
            <h3>Change password</h3>
            <?php if ($passwordError): ?><p style="color:#d63031"><?php echo h($passwordError); ?></p><?php endif; ?>
            <form method="post">
                <?php echo csrf_field(); ?>
                <input type="hidden" name="action" value="password">
                <p><label>Current password<br><input type="password" name="current_password" required style="width:100%;padding:10px;"></label></p>
                <p><label>New password<br><input type="password" name="new_password" required style="width:100%;padding:10px;"></label></p>
                <p><label>Confirm new password<br><input type="password" name="confirm_password" required style="width:100%;padding:10px;"></label></p>
                <button class="cta-button" type="submit">Change Password</button>
            </form>
        </article>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
