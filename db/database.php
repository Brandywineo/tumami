<?php

declare(strict_types=1);

require_once __DIR__ . '/../includes/bootstrap.php';

use App\Database\Connection;

if (!function_exists('db_get_pdo')) {
    function db_get_pdo(): PDO
    {
        static $pdo = null;

        if ($pdo instanceof PDO) {
            return $pdo;
        }

        $config = require __DIR__ . '/../config/database.php';
        $connection = new Connection($config);
        $pdo = $connection->getPdo();

        return $pdo;
    }
}

$pdo = db_get_pdo();
