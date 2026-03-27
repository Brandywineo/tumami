<?php

declare(strict_types=1);

$role = $bottomNavRole ?? null;
$activeItem = $bottomNavActive ?? '';

if (!isAuthenticated() || !is_string($role) || $role === '') {
    return;
}

$items = [];
if ($role === 'client') {
    $items = [
        ['id' => 'home', 'label' => 'Home', 'href' => 'home_client.php'],
        ['id' => 'errands', 'label' => 'Errands', 'href' => 'client_errands.php'],
        ['id' => 'map', 'label' => 'Map', 'href' => 'dashboard_client.php'],
        ['id' => 'wallet', 'label' => 'Wallet', 'href' => 'wallet.php'],
        ['id' => 'profile', 'label' => 'Profile', 'href' => 'profile.php'],
    ];

} elseif ($role === 'runner') {
    $items = [
        ['id' => 'home', 'label' => 'Home', 'href' => 'home_runner.php'],
        ['id' => 'tasks', 'label' => 'Tasks', 'href' => 'runner_tasks.php'],
        ['id' => 'map', 'label' => 'Map', 'href' => 'dashboard_runner.php'],
        ['id' => 'wallet', 'label' => 'Wallet', 'href' => 'wallet.php'],
        ['id' => 'profile', 'label' => 'Profile', 'href' => 'profile.php'],
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
