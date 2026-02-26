<?php
session_start();
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Tumami.com | Professional Errand Services in Nairobi</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0">

    <style>
        body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            background-color: #f7f9fc;
            color: #222;
        }

        /* HEADER */
        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 15px 40px;
            background-color: #ffffff;
            box-shadow: 0 2px 6px rgba(0,0,0,0.05);
        }

        .logo {
            font-size: 24px;
            font-weight: bold;
            color: #0a66c2;
        }

        .nav a {
            margin-left: 20px;
            text-decoration: none;
            color: #333;
            font-weight: 500;
        }

        .nav a.button {
            background-color: #0a66c2;
            color: #fff;
            padding: 8px 15px;
            border-radius: 5px;
        }

        /* HERO */
        .hero {
            text-align: center;
            padding: 70px 20px;
            background: linear-gradient(to right, #0a66c2, #004182);
            color: white;
        }

        .hero h1 {
            font-size: 42px;
            margin-bottom: 15px;
        }

        .hero p {
            font-size: 18px;
            margin-bottom: 30px;
        }

        .search-box {
            background: white;
            padding: 15px;
            border-radius: 8px;
            display: inline-flex;
            gap: 10px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.15);
        }

        .search-box input, .search-box select {
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            outline: none;
        }

        .search-box button {
            padding: 10px 20px;
            border: none;
            background-color: #0a66c2;
            color: white;
            border-radius: 5px;
            cursor: pointer;
        }

        /* CATEGORIES */
        .section {
            padding: 60px 40px;
            text-align: center;
        }

        .section h2 {
            margin-bottom: 40px;
        }

        .grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
            gap: 20px;
        }

        .card {
            background: white;
            padding: 25px;
            border-radius: 8px;
            box-shadow: 0 4px 10px rgba(0,0,0,0.05);
            text-align: left;
        }

        .card h3 {
            margin-top: 0;
        }

        /* HOW IT WORKS */
        .steps {
            display: flex;
            flex-wrap: wrap;
            gap: 30px;
            justify-content: center;
        }

        .step {
            width: 280px;
        }

        /* FOOTER */
        .footer {
            background: #0a1f33;
            color: white;
            padding: 40px;
            text-align: center;
        }

        .footer a {
            color: #aaa;
            text-decoration: none;
            margin: 0 10px;
        }

        @media(max-width: 768px){
            .hero h1 {
                font-size: 28px;
            }
        }

    </style>
</head>
<body>

<!-- HEADER -->
<div class="header">
    <div class="logo">Tumami.com</div>
    <div class="nav">
        <?php if(isset($_SESSION['user_id'])): ?>
            <a href="dashboard.php">Dashboard</a>
            <a href="logout.php">Logout</a>
        <?php else: ?>
            <a href="login.php">Login</a>
            <a href="register.php" class="button">Register</a>
        <?php endif; ?>
    </div>
</div>

<!-- HERO SECTION -->
<div class="hero">
    <h1>Get Your Errands Done in Nairobi</h1>
    <p>Hire trusted local runners for deliveries, shopping, document pickups, car errands and more.</p>

    <form class="search-box" action="search.php" method="GET">
        <input type="text" name="task" placeholder="What do you need done?">
        <select name="zone">
            <option value="">Select Area</option>
            <option>Westlands</option>
            <option>Kilimani</option>
            <option>CBD</option>
            <option>Karen</option>
        </select>
        <button type="submit">Search</button>
    </form>
</div>

<!-- FEATURED CATEGORIES -->
<div class="section">
    <h2>Popular Services</h2>
    <div class="grid">
        <div class="card">
            <h3>Document Delivery</h3>
            <p>Send contracts, letters, and parcels securely across Nairobi.</p>
        </div>
        <div class="card">
            <h3>Grocery Assistance</h3>
            <p>Have a runner shop for you while you focus on work.</p>
        </div>
        <div class="card">
            <h3>Car Errands</h3>
            <p>Take your car to the garage or car wash without leaving office.</p>
        </div>
        <div class="card">
            <h3>Queue Standing</h3>
            <p>Skip long lines at government offices and banks.</p>
        </div>
    </div>
</div>

<!-- HOW IT WORKS -->
<div class="section" style="background:#eef3f8;">
    <h2>How Tumami Works</h2>
    <div class="steps">
        <div class="step">
            <h3>1. Post a Task</h3>
            <p>Describe your errand and set your budget.</p>
        </div>
        <div class="step">
            <h3>2. Match with a Runner</h3>
            <p>Choose from verified runners near your location.</p>
        </div>
        <div class="step">
            <h3>3. Get It Done</h3>
            <p>Track progress and pay securely through the platform.</p>
        </div>
    </div>
</div>

<!-- PROMOTED RUNNERS -->
<div class="section">
    <h2>Top Rated Runners</h2>
    <div class="grid">
        <div class="card">
            <h3>James K. ⭐ 4.9</h3>
            <p>Westlands | 120 tasks completed</p>
        </div>
        <div class="card">
            <h3>Aisha M. ⭐ 4.8</h3>
            <p>Kilimani | 98 tasks completed</p>
        </div>
        <div class="card">
            <h3>Brian O. ⭐ 5.0</h3>
            <p>CBD | 210 tasks completed</p>
        </div>
    </div>
</div>

<!-- CORPORATE CTA -->
<div class="section" style="background:#0a66c2; color:white;">
    <h2>Corporate & Business Accounts</h2>
    <p>Manage company errands with monthly billing and detailed reporting.</p>
    <a href="corporate.php" style="background:white; color:#0a66c2; padding:10px 20px; border-radius:5px; text-decoration:none;">Learn More</a>
</div>

<!-- FOOTER -->
<div class="footer">
    <p>&copy; <?php echo date("Y"); ?> Tumami.com - Professional Errand Services Nairobi</p>
    <div>
        <a href="#">About</a>
        <a href="#">Terms</a>
        <a href="#">Privacy</a>
        <a href="#">Support</a>
    </div>
</div>

</body>
</html>
