<?php

declare(strict_types=1);

return [
    'host' => getenv('DB_HOST') ?: '127.0.0.1',
    'dbname' => getenv('DB_NAME') ?: 'nat_tumami',
    'username' => getenv('DB_USER') ?: 'nat_mtume',
    'password' => getenv('DB_PASS') ?: 'Qwasa1234',
    'charset' => 'utf8mb4',
];
