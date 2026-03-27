<?php

declare(strict_types=1);

$role = $bottomNavRole ?? null;
$activeItem = $bottomNavActive ?? '';

if (!isAuthenticated() || !is_string($role) || $role === '') {
    return;
}

$items = [];
$settingsDrawerItems = [];

if ($role === 'client') {
    $items = [
        ['id' => 'home', 'label' => 'Home', 'href' => 'home_client.php'],
        ['id' => 'errands', 'label' => 'Errands', 'href' => 'client_errands.php'],
        ['id' => 'map', 'label' => 'Map', 'href' => 'dashboard_client.php'],
        ['id' => 'wallet', 'label' => 'Wallet', 'href' => 'wallet.php'],
        ['id' => 'profile', 'label' => 'Profile', 'href' => 'profile.php'],
    ];

    $settingsDrawerItems = [
        ['label' => 'Home', 'href' => 'home_client.php'],
        ['label' => 'Client Map', 'href' => 'dashboard_client.php'],
        ['label' => 'Errands', 'href' => 'client_errands.php'],
        ['label' => 'Runner Map', 'href' => 'dashboard_runner.php'],
        ['label' => 'Browse Tasks', 'href' => 'browse_tasks.php'],
        ['label' => 'Active Runners', 'href' => 'active_runners.php'],
        ['label' => 'Wallet', 'href' => 'wallet.php'],
        ['label' => 'Profile Settings', 'href' => 'settings.php'],
        ['label' => 'Runner Filters', 'href' => 'active_runners.php'],
        ['label' => 'Map Settings', 'href' => 'settings.php#map-settings'],
    ];
} elseif ($role === 'runner') {
    $items = [
        ['id' => 'home', 'label' => 'Home', 'href' => 'home_runner.php'],
        ['id' => 'tasks', 'label' => 'Tasks', 'href' => 'runner_tasks.php'],
        ['id' => 'map', 'label' => 'Map', 'href' => 'dashboard_runner.php'],
        ['id' => 'wallet', 'label' => 'Wallet', 'href' => 'wallet.php'],
        ['id' => 'profile', 'label' => 'Profile', 'href' => 'profile.php'],
    ];

    $settingsDrawerItems = [
        ['label' => 'Home', 'href' => 'home_runner.php'],
        ['label' => 'Runner Map', 'href' => 'dashboard_runner.php'],
        ['label' => 'Tasks', 'href' => 'runner_tasks.php'],
        ['label' => 'Client Map', 'href' => 'dashboard_client.php'],
        ['label' => 'Browse Tasks', 'href' => 'browse_tasks.php'],
        ['label' => 'Active Runners', 'href' => 'active_runners.php'],
        ['label' => 'Wallet', 'href' => 'wallet.php'],
        ['label' => 'Profile Settings', 'href' => 'settings.php'],
        ['label' => 'Verification', 'href' => 'runner_verification.php'],
        ['label' => 'Runner Availability', 'href' => 'runner_availability.php'],
        ['label' => 'Map Settings', 'href' => 'settings.php#map-settings'],
    ];
}
?>
<nav class="bottom-nav" aria-label="Mobile quick navigation" data-bottom-nav>
    <?php foreach ($items as $item): ?>
        <a class="bottom-nav__item <?php echo $activeItem === $item['id'] ? 'is-active' : ''; ?> <?php echo $item['id'] === 'map' ? 'bottom-nav__item--map' : ''; ?>" href="<?php echo h($item['href']); ?>">
            <span class="bottom-nav__label"><?php echo h($item['label']); ?></span>
        </a>
    <?php endforeach; ?>
</nav>

<div class="settings-drawer" data-settings-drawer hidden>
    <div class="settings-drawer__backdrop" data-settings-drawer-close></div>
    <aside class="settings-drawer__panel" role="dialog" aria-modal="true" aria-label="Settings menu" tabindex="-1">
        <div class="settings-drawer__header">
            <h3>Settings</h3>
            <button type="button" class="settings-drawer__close" data-settings-drawer-close aria-label="Close settings drawer">&times;</button>
        </div>
        <div class="settings-drawer__body">
            <?php foreach ($settingsDrawerItems as $drawerItem): ?>
                <a class="settings-drawer__link" href="<?php echo h($drawerItem['href']); ?>"><?php echo h($drawerItem['label']); ?></a>
            <?php endforeach; ?>
            <form method="post" action="logout.php" class="settings-drawer__logout-form">
                <?php echo csrf_field(); ?>
                <button type="submit" class="settings-drawer__logout-button">Logout</button>
            </form>
        </div>
    </aside>
</div>
