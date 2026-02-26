<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/db/database.php';

use App\Repositories\UserRepository;

if (isAuthenticated()) {
    redirect('dashboard_client.php');
}

$errors = [];

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $fullName = trim($_POST['full_name'] ?? '');
    $email = strtolower(trim($_POST['email'] ?? ''));
    $phone = trim($_POST['phone'] ?? '');
    $role = $_POST['role'] ?? 'client';
    $password = $_POST['password'] ?? '';

    if ($fullName === '' || $email === '' || $phone === '' || $password === '') {
        $errors[] = 'All fields are required.';
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $errors[] = 'Invalid email address.';
    }
    if (!in_array($role, ['client', 'runner', 'both'], true)) {
        $errors[] = 'Invalid role selected.';
    }

    if ($errors === []) {
        $repo = new UserRepository($pdo);
        if ($repo->findByEmail($email)) {
            $errors[] = 'Email already registered.';
        } else {
            $userId = $repo->create($fullName, $email, $phone, password_hash($password, PASSWORD_DEFAULT), $role);
            loginUser($userId, $role);
            setFlash('success', 'Welcome to Tumami. Your account has been created.');
            redirect($role === 'runner' ? 'dashboard_runner.php' : 'dashboard_client.php');
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Register | Tumami</title>
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>
<section class="section">
    <div class="container" style="max-width:680px;">
        <h2>Create your account</h2>
        <?php if ($errors): ?>
            <div class="card" style="border-left:4px solid #d63031; margin-bottom:16px;">
                <?php foreach ($errors as $error): ?>
                    <p><?php echo h($error); ?></p>
                <?php endforeach; ?>
            </div>
        <?php endif; ?>
        <form class="card" method="post">
            <p><label>Full name<br><input type="text" name="full_name" required style="width:100%;padding:10px;"></label></p>
            <p><label>Email<br><input type="email" name="email" required style="width:100%;padding:10px;"></label></p>
            <p><label>Phone<br><input type="text" name="phone" required style="width:100%;padding:10px;"></label></p>
            <p><label>Role<br>
                <select name="role" style="width:100%;padding:10px;">
                    <option value="client">Client</option>
                    <option value="runner">Runner</option>
                    <option value="both">Both</option>
                </select>
            </label></p>
            <p><label>Password<br><input type="password" name="password" required style="width:100%;padding:10px;"></label></p>
            <button class="cta-button" type="submit">Register</button>
        </form>
    </div>
</section>
<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
