<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

logoutUser();
setFlash('success', 'Logged out successfully.');
redirect('index.php');
