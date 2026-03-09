<?php

declare(strict_types=1);

const THEME_LIGHT = 'light';
const THEME_DARK = 'dark';
const THEME_SYSTEM = 'system';

function availableThemes(): array
{
    return [THEME_LIGHT, THEME_DARK, THEME_SYSTEM];
}

function resolveThemeFromInput(?string $theme): string
{
    if ($theme !== null && in_array($theme, availableThemes(), true)) {
        return $theme;
    }

    return THEME_SYSTEM;
}

function currentThemePreference(): string
{
    $cookie = $_COOKIE['tumami_theme'] ?? null;

    return resolveThemeFromInput(is_string($cookie) ? $cookie : null);
}

function saveThemePreference(string $theme): void
{
    $safeTheme = resolveThemeFromInput($theme);
    setcookie('tumami_theme', $safeTheme, [
        'expires' => time() + (86400 * 365),
        'path' => '/',
        'secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off',
        'httponly' => false,
        'samesite' => 'Lax',
    ]);
    $_COOKIE['tumami_theme'] = $safeTheme;
}
