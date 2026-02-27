<?php

declare(strict_types=1);

require __DIR__ . '/includes/bootstrap.php';
require __DIR__ . '/includes/data.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tumami.com | Professional Errand Services in Nairobi</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="assets/css/global.css">
</head>
<body>
<?php require __DIR__ . '/includes/header.php'; ?>

<section class="hero">
    <div class="container">
        <h1>Get Your Errands Done in Nairobi</h1>
        <p>Hire trusted local runners for deliveries, shopping, document pickups, car errands and more.</p>

        <form class="search-box" action="search.php" method="GET">
            <input type="text" name="task" placeholder="What do you need done?" aria-label="Task search">
            <select name="zone" aria-label="Zone filter">
                <option value="">Select Area</option>
                <?php foreach ($zones as $zone): ?>
                    <option value="<?php echo h($zone); ?>"><?php echo h($zone); ?></option>
                <?php endforeach; ?>
            </select>
            <button type="submit">Search</button>
        </form>
    </div>
</section>

<section class="section">
    <div class="container">
        <h2>Popular Services</h2>
        <div class="grid">
            <?php foreach ($popularServices as $service): ?>
                <article class="card">
                    <h3><?php echo h($service['title']); ?></h3>
                    <p><?php echo h($service['description']); ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="section section--alt">
    <div class="container">
        <h2>How Tumami Works</h2>
        <div class="steps">
            <?php foreach ($howItWorks as $step): ?>
                <article class="step">
                    <h3><?php echo h($step['title']); ?></h3>
                    <p><?php echo h($step['description']); ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="section">
    <div class="container">
        <h2>Top Rated Runners</h2>
        <div class="grid">
            <?php foreach ($topRunners as $runner): ?>
                <article class="card">
                    <h3><?php echo h($runner['name']); ?> ⭐ <?php echo h($runner['rating']); ?></h3>
                    <p><?php echo h($runner['meta']); ?></p>
                </article>
            <?php endforeach; ?>
        </div>
    </div>
</section>

<section class="section section--accent">
    <div class="container">
        <h2>Corporate &amp; Business Accounts</h2>
        <p>Manage company errands with monthly billing, approvals, and detailed reporting.</p>
        <a href="corporate.php" class="cta-button">Learn More</a>
    </div>
</section>

<?php require __DIR__ . '/includes/footer.php'; ?>
</body>
</html>
