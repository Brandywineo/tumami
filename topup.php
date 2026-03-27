<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';

requireRole(['client', 'runner', 'both']);

redirect('wallet.php');
