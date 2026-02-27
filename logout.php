<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    exit('Method Not Allowed');
}

if (!csrf_validate($_POST['_csrf'] ?? null)) {
    http_response_code(403);
    exit('Invalid CSRF token');
}

logoutUser();
setFlash('success', 'Logged out successfully.');
redirect('index.php');
