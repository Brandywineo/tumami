-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Mar 12, 2026 at 06:37 AM
-- Server version: 8.0.45-0ubuntu0.24.04.1
-- PHP Version: 8.3.30

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `nat_tumami`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_logs`
--

CREATE TABLE `admin_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `admin_id` bigint UNSIGNED NOT NULL,
  `action` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `device_sessions`
--

CREATE TABLE `device_sessions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `platform` enum('web','android','ios') NOT NULL DEFAULT 'web',
  `device_label` varchar(120) DEFAULT NULL,
  `push_token` varchar(255) DEFAULT NULL,
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `disputes`
--

CREATE TABLE `disputes` (
  `id` bigint UNSIGNED NOT NULL,
  `task_id` bigint UNSIGNED NOT NULL,
  `opened_by` bigint UNSIGNED NOT NULL,
  `reason` text NOT NULL,
  `status` enum('open','under_review','resolved','rejected') NOT NULL DEFAULT 'open',
  `resolution_notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `runner_location_logs`
--

CREATE TABLE `runner_location_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `runner_id` bigint UNSIGNED NOT NULL,
  `task_id` bigint UNSIGNED DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `speed_kmh` decimal(6,2) DEFAULT NULL,
  `heading_deg` smallint UNSIGNED DEFAULT NULL,
  `captured_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `runner_profiles`
--

CREATE TABLE `runner_profiles` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `active_zone_id` bigint UNSIGNED DEFAULT NULL,
  `accepts_adjacent_zones` tinyint(1) NOT NULL DEFAULT '1',
  `radius_km` tinyint UNSIGNED NOT NULL DEFAULT '5',
  `vehicle_type` enum('walking','motorbike','car','van') NOT NULL DEFAULT 'walking',
  `is_available` tinyint(1) NOT NULL DEFAULT '0',
  `reliability_score` smallint UNSIGNED NOT NULL DEFAULT '100',
  `strike_count` smallint UNSIGNED NOT NULL DEFAULT '0',
  `last_strike_at` datetime DEFAULT NULL,
  `bio` text,
  `total_tasks_completed` int UNSIGNED NOT NULL DEFAULT '0',
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `location_updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `runner_profiles`
--

INSERT INTO `runner_profiles` (`id`, `user_id`, `active_zone_id`, `accepts_adjacent_zones`, `radius_km`, `vehicle_type`, `is_available`, `reliability_score`, `strike_count`, `last_strike_at`, `bio`, `total_tasks_completed`, `latitude`, `longitude`, `location_updated_at`, `created_at`, `updated_at`) VALUES
(1, 3, NULL, 1, 5, 'walking', 1, 100, 0, NULL, NULL, 0, -1.0969124, 36.7757640, '2026-03-09 19:47:42', '2026-03-02 11:58:29', '2026-03-09 19:47:42'),
(2, 5, NULL, 1, 5, 'walking', 1, 100, 0, NULL, NULL, 0, -1.2075411, 36.8957230, '2026-03-10 05:37:16', '2026-03-09 20:31:09', '2026-03-10 05:37:16');

-- --------------------------------------------------------

--
-- Table structure for table `tasks`
--

CREATE TABLE `tasks` (
  `id` bigint UNSIGNED NOT NULL,
  `client_id` bigint UNSIGNED NOT NULL,
  `runner_id` bigint UNSIGNED DEFAULT NULL,
  `zone_id` bigint UNSIGNED NOT NULL,
  `client_zone_id` bigint UNSIGNED DEFAULT NULL,
  `pickup_zone_id` bigint UNSIGNED DEFAULT NULL,
  `dropoff_zone_id` bigint UNSIGNED DEFAULT NULL,
  `category` enum('courier','assisted_purchase','dropoff','queue') NOT NULL,
  `title` varchar(255) NOT NULL,
  `description` text NOT NULL,
  `pickup_address` varchar(255) DEFAULT NULL,
  `dropoff_address` varchar(255) DEFAULT NULL,
  `client_latitude` decimal(10,7) DEFAULT NULL,
  `client_longitude` decimal(10,7) DEFAULT NULL,
  `pickup_latitude` decimal(10,7) DEFAULT NULL,
  `pickup_longitude` decimal(10,7) DEFAULT NULL,
  `dropoff_latitude` decimal(10,7) DEFAULT NULL,
  `dropoff_longitude` decimal(10,7) DEFAULT NULL,
  `runner_fee` decimal(10,2) NOT NULL,
  `platform_commission` decimal(10,2) NOT NULL DEFAULT '0.00',
  `status` enum('posted','accepted','in_progress','awaiting_confirmation','completed','disputed','cancelled') NOT NULL DEFAULT 'posted',
  `deadline` datetime DEFAULT NULL,
  `accepted_at` datetime DEFAULT NULL,
  `started_at` datetime DEFAULT NULL,
  `runner_arrived_at` datetime DEFAULT NULL,
  `completion_requested_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `cancelled_by` bigint UNSIGNED DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `tasks`
--

INSERT INTO `tasks` (`id`, `client_id`, `runner_id`, `zone_id`, `client_zone_id`, `pickup_zone_id`, `dropoff_zone_id`, `category`, `title`, `description`, `pickup_address`, `dropoff_address`, `client_latitude`, `client_longitude`, `pickup_latitude`, `pickup_longitude`, `dropoff_latitude`, `dropoff_longitude`, `runner_fee`, `platform_commission`, `status`, `deadline`, `accepted_at`, `started_at`, `runner_arrived_at`, `completion_requested_at`, `cancelled_at`, `cancelled_by`, `created_at`, `updated_at`) VALUES
(1, 2, 3, 26, 1, 26, 1, 'assisted_purchase', 'i jeed runner', 'go to kiambu fetch wota and comeback', 'kwamae', 'kwangu', NULL, NULL, NULL, NULL, NULL, NULL, 250.00, 0.00, 'awaiting_confirmation', '2026-03-11 22:10:00', '2026-03-09 19:13:13', '2026-03-09 19:15:13', NULL, '2026-03-10 12:12:47', NULL, NULL, '2026-03-09 19:11:05', '2026-03-10 12:12:47'),
(2, 3, 5, 2, 23, 2, 45, 'courier', 'need runner to cbd and back', 'go cbd take bike come back', 'kalitos', 'fremon', NULL, NULL, NULL, NULL, NULL, NULL, 250.00, 0.00, 'awaiting_confirmation', '2026-03-10 23:05:00', '2026-03-09 20:33:31', '2026-03-09 20:33:40', NULL, '2026-03-09 20:34:21', NULL, NULL, '2026-03-09 20:05:20', '2026-03-09 20:34:21'),
(3, 5, 5, 2, 14, NULL, 2, 'assisted_purchase', 'I need a runner for cbd', 'Please I need a parcel to be picked', 'Cbd', 'Uperhill', NULL, NULL, NULL, NULL, NULL, NULL, 350.00, 0.00, 'completed', '2026-03-11 07:54:00', '2026-03-10 05:18:57', '2026-03-10 05:19:11', NULL, '2026-03-11 18:06:03', NULL, NULL, '2026-03-10 04:57:30', '2026-03-11 18:06:22');

-- --------------------------------------------------------

--
-- Table structure for table `task_messages`
--

CREATE TABLE `task_messages` (
  `id` bigint UNSIGNED NOT NULL,
  `task_id` bigint UNSIGNED NOT NULL,
  `sender_id` bigint UNSIGNED NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_proofs`
--

CREATE TABLE `task_proofs` (
  `id` bigint UNSIGNED NOT NULL,
  `task_id` bigint UNSIGNED NOT NULL,
  `uploaded_by` bigint UNSIGNED NOT NULL,
  `proof_type` enum('before','after','delivery','odometer','package_condition') NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `task_runner_locations`
--

CREATE TABLE `task_runner_locations` (
  `id` bigint UNSIGNED NOT NULL,
  `task_id` bigint UNSIGNED NOT NULL,
  `runner_id` bigint UNSIGNED NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `accuracy_meters` decimal(8,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `task_runner_locations`
--

INSERT INTO `task_runner_locations` (`id`, `task_id`, `runner_id`, `latitude`, `longitude`, `accuracy_meters`, `created_at`) VALUES
(1, 1, 3, -1.0968603, 36.7758034, 98.40, '2026-03-09 19:41:02'),
(2, 1, 3, -1.0969083, 36.7757813, 98.40, '2026-03-09 19:41:08'),
(3, 1, 3, -1.0968892, 36.7757953, 82.50, '2026-03-09 19:47:31'),
(4, 1, 3, -1.0969367, 36.7757052, 87.60, '2026-03-09 19:47:36'),
(5, 1, 3, -1.0969124, 36.7757640, 92.90, '2026-03-09 19:47:42'),
(6, 2, 5, -1.2072394, 36.8956949, 19.99, '2026-03-09 20:33:36'),
(7, 2, 5, -1.2072021, 36.8957125, 19.99, '2026-03-09 20:33:58'),
(8, 2, 5, -1.2071902, 36.8957105, 12.78, '2026-03-09 20:34:20'),
(9, 3, 5, -1.2076936, 36.8958108, 22.54, '2026-03-10 05:19:30'),
(10, 3, 5, -1.2076500, 36.8958057, 13.56, '2026-03-10 05:19:43'),
(11, 3, 5, -1.2075300, 36.8956767, 8.73, '2026-03-10 05:19:48'),
(12, 3, 5, -1.2075013, 36.8956741, 4.34, '2026-03-10 05:19:54'),
(13, 3, 5, -1.2075013, 36.8956741, 4.34, '2026-03-10 05:19:59'),
(14, 3, 5, -1.2075013, 36.8956741, 4.34, '2026-03-10 05:20:04'),
(15, 3, 5, -1.2075138, 36.8956824, 4.33, '2026-03-10 05:20:09'),
(16, 3, 5, -1.2075002, 36.8956802, 4.23, '2026-03-10 05:20:14'),
(17, 3, 5, -1.2074973, 36.8956812, 4.22, '2026-03-10 05:20:20'),
(18, 3, 5, -1.2074950, 36.8956850, 6.05, '2026-03-10 05:20:26'),
(19, 3, 5, -1.2075074, 36.8957026, 6.17, '2026-03-10 05:22:20'),
(20, 3, 5, -1.2075118, 36.8957071, 6.09, '2026-03-10 05:22:25'),
(21, 3, 5, -1.2075097, 36.8957051, 5.57, '2026-03-10 05:22:31'),
(22, 3, 5, -1.2075066, 36.8957014, 6.58, '2026-03-10 05:22:40'),
(23, 3, 5, -1.2074945, 36.8956851, 3.70, '2026-03-10 05:22:46'),
(24, 3, 5, -1.2075006, 36.8956874, 8.22, '2026-03-10 05:22:52'),
(25, 3, 5, -1.2074971, 36.8956894, 5.81, '2026-03-10 05:22:57'),
(26, 3, 5, -1.2074576, 36.8957044, 13.65, '2026-03-10 05:25:13'),
(27, 3, 5, -1.2074365, 36.8956869, 23.40, '2026-03-10 05:25:18'),
(28, 3, 5, -1.2071955, 36.8957177, 19.76, '2026-03-10 05:34:10'),
(29, 3, 5, -1.2074852, 36.8957551, 28.78, '2026-03-10 05:34:18'),
(30, 3, 5, -1.2073221, 36.8957216, 13.73, '2026-03-10 05:34:29'),
(31, 3, 5, -1.2075411, 36.8957230, 20.83, '2026-03-10 05:37:16');

-- --------------------------------------------------------

--
-- Table structure for table `task_status_logs`
--

CREATE TABLE `task_status_logs` (
  `id` bigint UNSIGNED NOT NULL,
  `task_id` bigint UNSIGNED NOT NULL,
  `changed_by` bigint UNSIGNED NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `task_status_logs`
--

INSERT INTO `task_status_logs` (`id`, `task_id`, `changed_by`, `old_status`, `new_status`, `notes`, `created_at`) VALUES
(1, 1, 3, 'posted', 'accepted', NULL, '2026-03-09 19:13:13'),
(2, 1, 3, 'accepted', 'in_progress', NULL, '2026-03-09 19:15:13'),
(3, 2, 5, 'posted', 'accepted', NULL, '2026-03-09 20:33:31'),
(4, 2, 5, 'accepted', 'in_progress', NULL, '2026-03-09 20:33:40'),
(5, 2, 5, 'in_progress', 'awaiting_confirmation', NULL, '2026-03-09 20:34:21'),
(6, 3, 5, 'posted', 'accepted', NULL, '2026-03-10 05:18:57'),
(7, 3, 5, 'accepted', 'in_progress', NULL, '2026-03-10 05:19:11'),
(8, 1, 3, 'in_progress', 'awaiting_confirmation', NULL, '2026-03-10 12:12:47'),
(9, 3, 5, 'in_progress', 'awaiting_confirmation', NULL, '2026-03-11 18:06:03'),
(10, 3, 5, 'awaiting_confirmation', 'completed', NULL, '2026-03-11 18:06:22');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint UNSIGNED NOT NULL,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('client','runner','both') NOT NULL DEFAULT 'client',
  `is_email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_phone_verified` tinyint(1) NOT NULL DEFAULT '0',
  `verification_level` enum('basic','id_verified','pro') NOT NULL DEFAULT 'basic',
  `rating` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int UNSIGNED NOT NULL DEFAULT '0',
  `account_status` enum('active','suspended','banned') NOT NULL DEFAULT 'active',
  `current_zone_id` bigint UNSIGNED DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `location_updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `password_hash`, `role`, `is_email_verified`, `is_phone_verified`, `verification_level`, `rating`, `rating_count`, `account_status`, `current_zone_id`, `latitude`, `longitude`, `location_updated_at`, `created_at`, `updated_at`) VALUES
(1, 'Tumami Platform', 'platform@tumami.local', '0000000000', 'SYSTEM_ACCOUNT', 'client', 1, 1, 'pro', 0.00, 0, 'active', NULL, NULL, NULL, NULL, '2026-03-02 11:55:49', NULL),
(2, 'Brandon James', 'brandonmantis@gmail.com', '65741181', '$2y$10$Cp9KYYKKBAGZLZ9LeR63nOB430xLgQEJyM5eordh.kRKCbPdZWlSe', 'client', 0, 0, 'basic', 0.00, 0, 'active', NULL, NULL, NULL, NULL, '2026-03-02 11:57:06', NULL),
(3, 'kelvin moses', 'kevmee98@gmail.com', '0793425725', '$2y$10$xntH7cBSZaXHrnIfgQ4k5OYH9376qWlaqYquAyZrYZUIa6L3OgpMe', 'both', 0, 0, 'basic', 0.00, 0, 'active', NULL, NULL, NULL, NULL, '2026-03-02 11:58:29', NULL),
(4, 'nathan kibet', 'nathankibet16@gmail.com', '0748493595', '$2y$10$4RmCSHpwRfsW.Z3CoIBOCe/HlQshcPozYb9wtJQenaoxFsvp.8abq', 'client', 0, 0, 'basic', 0.00, 0, 'active', NULL, NULL, NULL, NULL, '2026-03-02 12:30:09', NULL),
(5, 'Nathan Kibet', 'nathankibet254@gmail.com', '0758848954', '$2y$10$kvyQgq17EXT6Wt/Urr80l.YUMaC7DjBMYgjgpcKnnSfCkjDNJxAGW', 'both', 0, 0, 'basic', 0.00, 0, 'active', NULL, NULL, NULL, NULL, '2026-03-09 20:31:09', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `wallet_transactions`
--

CREATE TABLE `wallet_transactions` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `task_id` bigint UNSIGNED DEFAULT NULL,
  `direction` enum('credit','debit') NOT NULL,
  `type` enum('deposit','task_earning','commission','withdrawal','refund','penalty','adjustment') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'completed',
  `reference` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `wallet_transactions`
--

INSERT INTO `wallet_transactions` (`id`, `user_id`, `task_id`, `direction`, `type`, `amount`, `status`, `reference`, `created_at`) VALUES
(1, 2, 1, 'debit', 'deposit', 250.00, 'completed', 'TASK_FEE_LOCK', '2026-03-09 19:11:05'),
(2, 3, 2, 'debit', 'deposit', 250.00, 'completed', 'TASK_FEE_LOCK', '2026-03-09 20:05:20'),
(3, 5, 3, 'debit', 'deposit', 350.00, 'completed', 'TASK_FEE_LOCK', '2026-03-10 04:57:30'),
(4, 5, NULL, 'credit', 'deposit', 16000.00, 'completed', 'CLIENT_TOPUP', '2026-03-10 15:45:16'),
(5, 5, NULL, 'credit', 'deposit', 1000000.00, 'completed', 'CLIENT_TOPUP', '2026-03-10 15:45:35'),
(6, 5, NULL, 'credit', 'deposit', 200000.00, 'completed', 'CLIENT_TOPUP', '2026-03-10 15:49:49'),
(7, 5, 3, 'credit', 'task_earning', 315.00, 'completed', 'TASK_COMPLETION', '2026-03-11 18:06:22'),
(8, 1, 3, 'credit', 'commission', 35.00, 'completed', 'PLATFORM_COMMISSION', '2026-03-11 18:06:22');

-- --------------------------------------------------------

--
-- Table structure for table `withdrawals`
--

CREATE TABLE `withdrawals` (
  `id` bigint UNSIGNED NOT NULL,
  `user_id` bigint UNSIGNED NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payout_method` enum('mpesa','bank') NOT NULL DEFAULT 'mpesa',
  `payout_reference` varchar(120) DEFAULT NULL,
  `status` enum('pending','processed','rejected') NOT NULL DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `zones`
--

CREATE TABLE `zones` (
  `id` bigint UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `parent_id` bigint UNSIGNED DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `zones`
--

INSERT INTO `zones` (`id`, `name`, `parent_id`, `is_active`, `created_at`) VALUES
(1, 'Nairobi', NULL, 1, '2026-03-02 11:55:49'),
(2, 'CBD', 1, 1, '2026-03-02 11:55:49'),
(3, 'Upper Hill', 1, 1, '2026-03-02 11:55:49'),
(4, 'Westlands', 1, 1, '2026-03-02 11:55:49'),
(5, 'Kilimani', 1, 1, '2026-03-02 11:55:49'),
(6, 'Karen', 1, 1, '2026-03-02 11:55:49'),
(7, 'Parklands', 1, 1, '2026-03-02 11:55:49'),
(8, 'Lavington', 1, 1, '2026-03-02 11:55:49'),
(9, 'Kileleshwa', 1, 1, '2026-03-02 11:55:49'),
(10, 'South B', 1, 1, '2026-03-02 11:55:49'),
(11, 'South C', 1, 1, '2026-03-02 11:55:49'),
(12, 'Lang\'ata', 1, 1, '2026-03-02 11:55:49'),
(13, 'Embakasi', 1, 1, '2026-03-02 11:55:49'),
(14, 'Donholm', 1, 1, '2026-03-02 11:55:49'),
(15, 'Pipeline', 1, 1, '2026-03-02 11:55:49'),
(16, 'Roysambu', 1, 1, '2026-03-02 11:55:49'),
(17, 'Kasarani', 1, 1, '2026-03-02 11:55:49'),
(18, 'Githurai', 1, 1, '2026-03-02 11:55:49'),
(19, 'Eastleigh', 1, 1, '2026-03-02 11:55:49'),
(20, 'Ngong Road', 1, 1, '2026-03-02 11:55:49'),
(21, 'Muthaiga', 1, 1, '2026-03-02 11:55:49'),
(22, 'Runda', 1, 1, '2026-03-02 11:55:49'),
(23, 'Industrial Area', 1, 1, '2026-03-02 11:55:49'),
(24, 'Gigiri', 1, 1, '2026-03-02 11:55:49'),
(25, 'Ruaka', 1, 1, '2026-03-02 11:55:49'),
(26, 'Kiambu', NULL, 1, '2026-03-02 11:55:49'),
(27, 'Kiambu Town', 26, 1, '2026-03-02 11:55:49'),
(28, 'Ruiru', 26, 1, '2026-03-02 11:55:49'),
(29, 'Thika', 26, 1, '2026-03-02 11:55:49'),
(30, 'Juja', 26, 1, '2026-03-02 11:55:49'),
(31, 'Limuru', 26, 1, '2026-03-02 11:55:49'),
(32, 'Kikuyu', 26, 1, '2026-03-02 11:55:49'),
(33, 'Githunguri', 26, 1, '2026-03-02 11:55:49'),
(34, 'Kabete', 26, 1, '2026-03-02 11:55:49'),
(35, 'Wangige', 26, 1, '2026-03-02 11:55:49'),
(36, 'Karuri', 26, 1, '2026-03-02 11:55:49'),
(37, 'Banana', 26, 1, '2026-03-02 11:55:49'),
(38, 'Ndenderu', 26, 1, '2026-03-02 11:55:49'),
(39, 'Tigoni', 26, 1, '2026-03-02 11:55:49'),
(40, 'Kamakis', 26, 1, '2026-03-02 11:55:49'),
(41, 'Kahawa Sukari', 1, 1, '2026-03-02 11:55:49'),
(42, 'Kahawa West', 1, 1, '2026-03-02 11:55:49'),
(43, 'Mirema', 1, 1, '2026-03-02 11:55:49'),
(44, 'Umoja', 1, 1, '2026-03-02 11:55:49'),
(45, 'Buruburu', 1, 1, '2026-03-02 11:55:49'),
(46, 'Syokimau', 1, 1, '2026-03-02 11:55:49'),
(47, 'Mlolongo', 1, 1, '2026-03-02 11:55:49'),
(48, 'Kitengela', NULL, 1, '2026-03-02 11:55:49');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_admin_logs_admin` (`admin_id`);

--
-- Indexes for table `device_sessions`
--
ALTER TABLE `device_sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_device_sessions_user_platform` (`user_id`,`platform`);

--
-- Indexes for table `disputes`
--
ALTER TABLE `disputes`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_disputes_task` (`task_id`),
  ADD KEY `fk_disputes_opened_by` (`opened_by`),
  ADD KEY `idx_disputes_status` (`status`);

--
-- Indexes for table `runner_location_logs`
--
ALTER TABLE `runner_location_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_runner_location_logs_runner_time` (`runner_id`,`captured_at`),
  ADD KEY `idx_runner_location_logs_task_time` (`task_id`,`captured_at`);

--
-- Indexes for table `runner_profiles`
--
ALTER TABLE `runner_profiles`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `user_id` (`user_id`),
  ADD KEY `fk_runner_profiles_zone` (`active_zone_id`);

--
-- Indexes for table `tasks`
--
ALTER TABLE `tasks`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_tasks_client` (`client_id`),
  ADD KEY `fk_tasks_zone` (`zone_id`),
  ADD KEY `fk_tasks_client_zone` (`client_zone_id`),
  ADD KEY `fk_tasks_pickup_zone` (`pickup_zone_id`),
  ADD KEY `fk_tasks_dropoff_zone` (`dropoff_zone_id`),
  ADD KEY `fk_tasks_cancelled_by` (`cancelled_by`),
  ADD KEY `idx_tasks_status_zone` (`status`,`zone_id`),
  ADD KEY `idx_tasks_runner_status` (`runner_id`,`status`);

--
-- Indexes for table `task_messages`
--
ALTER TABLE `task_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_task_messages_user` (`sender_id`),
  ADD KEY `idx_task_messages_task` (`task_id`,`created_at`);

--
-- Indexes for table `task_proofs`
--
ALTER TABLE `task_proofs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_task_proofs_user` (`uploaded_by`),
  ADD KEY `idx_task_proofs_task` (`task_id`);

--
-- Indexes for table `task_runner_locations`
--
ALTER TABLE `task_runner_locations`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_task_runner_locations_task_created` (`task_id`,`created_at`),
  ADD KEY `idx_task_runner_locations_runner_created` (`runner_id`,`created_at`);

--
-- Indexes for table `task_status_logs`
--
ALTER TABLE `task_status_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_task_status_logs_user` (`changed_by`),
  ADD KEY `idx_task_status_logs_task` (`task_id`,`created_at`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `email` (`email`),
  ADD UNIQUE KEY `phone` (`phone`),
  ADD KEY `fk_users_current_zone` (`current_zone_id`);

--
-- Indexes for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_wallet_transactions_task` (`task_id`),
  ADD KEY `idx_wallet_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_wallet_type_status` (`type`,`status`);

--
-- Indexes for table `withdrawals`
--
ALTER TABLE `withdrawals`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_withdrawals_user` (`user_id`),
  ADD KEY `idx_withdrawals_status_requested` (`status`,`requested_at`);

--
-- Indexes for table `zones`
--
ALTER TABLE `zones`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_zones_parent` (`parent_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_logs`
--
ALTER TABLE `admin_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `device_sessions`
--
ALTER TABLE `device_sessions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `disputes`
--
ALTER TABLE `disputes`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `runner_location_logs`
--
ALTER TABLE `runner_location_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `runner_profiles`
--
ALTER TABLE `runner_profiles`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `tasks`
--
ALTER TABLE `tasks`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `task_messages`
--
ALTER TABLE `task_messages`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_proofs`
--
ALTER TABLE `task_proofs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `task_runner_locations`
--
ALTER TABLE `task_runner_locations`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `task_status_logs`
--
ALTER TABLE `task_status_logs`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=11;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `withdrawals`
--
ALTER TABLE `withdrawals`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `zones`
--
ALTER TABLE `zones`
  MODIFY `id` bigint UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=49;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_logs`
--
ALTER TABLE `admin_logs`
  ADD CONSTRAINT `fk_admin_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `device_sessions`
--
ALTER TABLE `device_sessions`
  ADD CONSTRAINT `fk_device_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `disputes`
--
ALTER TABLE `disputes`
  ADD CONSTRAINT `fk_disputes_opened_by` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_disputes_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `runner_location_logs`
--
ALTER TABLE `runner_location_logs`
  ADD CONSTRAINT `fk_runner_location_logs_runner` FOREIGN KEY (`runner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_runner_location_logs_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `runner_profiles`
--
ALTER TABLE `runner_profiles`
  ADD CONSTRAINT `fk_runner_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_runner_profiles_zone` FOREIGN KEY (`active_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `tasks`
--
ALTER TABLE `tasks`
  ADD CONSTRAINT `fk_tasks_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`),
  ADD CONSTRAINT `fk_tasks_client_zone` FOREIGN KEY (`client_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_dropoff_zone` FOREIGN KEY (`dropoff_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_pickup_zone` FOREIGN KEY (`pickup_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_runner` FOREIGN KEY (`runner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_tasks_zone` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`);

--
-- Constraints for table `task_messages`
--
ALTER TABLE `task_messages`
  ADD CONSTRAINT `fk_task_messages_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_messages_user` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `task_proofs`
--
ALTER TABLE `task_proofs`
  ADD CONSTRAINT `fk_task_proofs_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_proofs_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `task_runner_locations`
--
ALTER TABLE `task_runner_locations`
  ADD CONSTRAINT `fk_task_runner_locations_runner` FOREIGN KEY (`runner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_runner_locations_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `task_status_logs`
--
ALTER TABLE `task_status_logs`
  ADD CONSTRAINT `fk_task_status_logs_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_task_status_logs_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`);

--
-- Constraints for table `users`
--
ALTER TABLE `users`
  ADD CONSTRAINT `fk_users_current_zone` FOREIGN KEY (`current_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `wallet_transactions`
--
ALTER TABLE `wallet_transactions`
  ADD CONSTRAINT `fk_wallet_transactions_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_wallet_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `withdrawals`
--
ALTER TABLE `withdrawals`
  ADD CONSTRAINT `fk_withdrawals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `zones`
--
ALTER TABLE `zones`
  ADD CONSTRAINT `fk_zones_parent` FOREIGN KEY (`parent_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
