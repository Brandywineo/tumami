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
        ['id' => 'my_errands', 'label' => 'My Errands', 'href' => 'dashboard_client.php'],
        ['id' => 'runners', 'label' => 'Runners', 'href' => 'active_runners.php'],
        ['id' => 'wallet', 'label' => 'Wallet', 'href' => 'topup.php'],
        ['id' => 'settings', 'label' => 'Settings', 'href' => '#'],
    ];

    $settingsDrawerItems = [
        ['label' => 'Client Dashboard', 'href' => 'dashboard_client.php'],
        ['label' => 'Runner Dashboard', 'href' => 'dashboard_runner.php'],
        ['label' => 'Browse Tasks', 'href' => 'browse_tasks.php'],
        ['label' => 'Active Runners', 'href' => 'active_runners.php'],
        ['label' => 'Top Up Wallet', 'href' => 'topup.php'],
        ['label' => 'Profile Settings', 'href' => 'settings.php'],
        ['label' => 'Runner Filters', 'href' => 'active_runners.php'],
        ['label' => 'Map Settings', 'href' => 'settings.php#map-settings'],
    ];
} elseif ($role === 'runner') {
    $items = [
        ['id' => 'my_tasks', 'label' => 'My Tasks', 'href' => 'dashboard_runner.php'],
        ['id' => 'available_tasks', 'label' => 'Available Tasks', 'href' => 'browse_tasks.php'],
        ['id' => 'wallet', 'label' => 'Wallet', 'href' => 'topup.php'],
        ['id' => 'settings', 'label' => 'Settings', 'href' => '#'],
    ];

    $settingsDrawerItems = [
        ['label' => 'Client Dashboard', 'href' => 'dashboard_client.php'],
        ['label' => 'Runner Dashboard', 'href' => 'dashboard_runner.php'],
        ['label' => 'Browse Tasks', 'href' => 'browse_tasks.php'],
        ['label' => 'Active Runners', 'href' => 'active_runners.php'],
        ['label' => 'Top Up Wallet', 'href' => 'topup.php'],
        ['label' => 'Profile Settings', 'href' => 'settings.php'],
        ['label' => 'Runner Filters', 'href' => 'settings.php#runner-filters'],
        ['label' => 'Map Settings', 'href' => 'settings.php#map-settings'],
    ];
}
?>
<nav class="bottom-nav" aria-label="Mobile quick navigation" data-bottom-nav>
    <?php foreach ($items as $item): ?>
        <?php if ($item['id'] === 'settings'): ?>
            <button
                class="bottom-nav__item <?php echo $activeItem === 'settings' ? 'is-active' : ''; ?>"
                type="button"
                data-settings-drawer-open
            >
                <span class="bottom-nav__label"><?php echo h($item['label']); ?></span>
            </button>
        <?php else: ?>
            <a class="bottom-nav__item <?php echo $activeItem === $item['id'] ? 'is-active' : ''; ?>" href="<?php echo h($item['href']); ?>">
                <span class="bottom-nav__label"><?php echo h($item['label']); ?></span>
            </a>
        <?php endif; ?>
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
