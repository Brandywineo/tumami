<?php

declare(strict_types=1);

require __DIR__ . '/../includes/bootstrap.php';
require __DIR__ . '/../db/database.php';

use App\Repositories\UserRepository;

requireLogin();

$zoneId = isset($_GET['zone_id']) && $_GET['zone_id'] !== '' ? (int) $_GET['zone_id'] : null;
$sort = $_GET['sort'] ?? 'rating';

$repo = new UserRepository($pdo);
$runners = $repo->activeRunners($zoneId, $sort);
jsonResponse(['runners' => $runners]);
