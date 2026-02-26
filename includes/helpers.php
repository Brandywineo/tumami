<?php

declare(strict_types=1);

function isAuthenticated(): bool
{
    return isset($_SESSION['user_id']);
}

function appName(): string
{
    return 'Tumami.com';
}

function currentYear(): string
{
    return date('Y');
}

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}
