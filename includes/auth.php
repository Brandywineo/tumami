<?php

declare(strict_types=1);

function currentUserId(): ?int
{
    return isset($_SESSION['user_id']) ? (int) $_SESSION['user_id'] : null;
}

function currentUserRole(): ?string
{
    return $_SESSION['user_role'] ?? null;
}

function loginUser(int $userId, string $role): void
{
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_role'] = $role;
}

function logoutUser(): void
{
    $_SESSION = [];
    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
    }
    session_destroy();
}

function requireLogin(): void
{
    if (!isAuthenticated()) {
        header('Location: login.php');
        exit;
    }
}

function requireRole(array $allowedRoles): void
{
    requireLogin();
    $role = currentUserRole();
    if ($role === null || !in_array($role, $allowedRoles, true)) {
        http_response_code(403);
        exit('Forbidden');
    }
}
