-- MySQL dump 10.13  Distrib 8.0.45, for Linux (x86_64)
--
-- Host: localhost    Database: nat_tumami
-- ------------------------------------------------------
-- Server version	8.0.45-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `admin_logs`
--

DROP TABLE IF EXISTS `admin_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `admin_id` bigint unsigned NOT NULL,
  `action` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_admin_logs_admin` (`admin_id`),
  CONSTRAINT `fk_admin_logs_admin` FOREIGN KEY (`admin_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_logs`
--

LOCK TABLES `admin_logs` WRITE;
/*!40000 ALTER TABLE `admin_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `admin_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `device_sessions`
--

DROP TABLE IF EXISTS `device_sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `device_sessions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `platform` enum('web','android','ios') NOT NULL DEFAULT 'web',
  `device_label` varchar(120) DEFAULT NULL,
  `push_token` varchar(255) DEFAULT NULL,
  `last_seen_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_device_sessions_user_platform` (`user_id`,`platform`),
  CONSTRAINT `fk_device_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `device_sessions`
--

LOCK TABLES `device_sessions` WRITE;
/*!40000 ALTER TABLE `device_sessions` DISABLE KEYS */;
/*!40000 ALTER TABLE `device_sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `disputes`
--

DROP TABLE IF EXISTS `disputes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `disputes` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `opened_by` bigint unsigned NOT NULL,
  `reason` text NOT NULL,
  `status` enum('open','under_review','resolved','rejected') NOT NULL DEFAULT 'open',
  `resolution_notes` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_disputes_task` (`task_id`),
  KEY `fk_disputes_opened_by` (`opened_by`),
  KEY `idx_disputes_status` (`status`),
  CONSTRAINT `fk_disputes_opened_by` FOREIGN KEY (`opened_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_disputes_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `disputes`
--

LOCK TABLES `disputes` WRITE;
/*!40000 ALTER TABLE `disputes` DISABLE KEYS */;
/*!40000 ALTER TABLE `disputes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `runner_location_logs`
--

DROP TABLE IF EXISTS `runner_location_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `runner_location_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `runner_id` bigint unsigned NOT NULL,
  `task_id` bigint unsigned DEFAULT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `speed_kmh` decimal(6,2) DEFAULT NULL,
  `heading_deg` smallint unsigned DEFAULT NULL,
  `captured_at` datetime NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_runner_location_logs_runner_time` (`runner_id`,`captured_at`),
  KEY `idx_runner_location_logs_task_time` (`task_id`,`captured_at`),
  CONSTRAINT `fk_runner_location_logs_runner` FOREIGN KEY (`runner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_runner_location_logs_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `runner_location_logs`
--

LOCK TABLES `runner_location_logs` WRITE;
/*!40000 ALTER TABLE `runner_location_logs` DISABLE KEYS */;
/*!40000 ALTER TABLE `runner_location_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `runner_profiles`
--

DROP TABLE IF EXISTS `runner_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `runner_profiles` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `active_zone_id` bigint unsigned DEFAULT NULL,
  `accepts_adjacent_zones` tinyint(1) NOT NULL DEFAULT '1',
  `radius_km` tinyint unsigned NOT NULL DEFAULT '5',
  `vehicle_type` enum('walking','motorbike','car','van') NOT NULL DEFAULT 'walking',
  `is_available` tinyint(1) NOT NULL DEFAULT '0',
  `reliability_score` smallint unsigned NOT NULL DEFAULT '100',
  `strike_count` smallint unsigned NOT NULL DEFAULT '0',
  `last_strike_at` datetime DEFAULT NULL,
  `bio` text,
  `total_tasks_completed` int unsigned NOT NULL DEFAULT '0',
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `location_updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_id` (`user_id`),
  KEY `fk_runner_profiles_zone` (`active_zone_id`),
  CONSTRAINT `fk_runner_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_runner_profiles_zone` FOREIGN KEY (`active_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `runner_profiles`
--

LOCK TABLES `runner_profiles` WRITE;
/*!40000 ALTER TABLE `runner_profiles` DISABLE KEYS */;
INSERT INTO `runner_profiles` VALUES (1,3,NULL,1,5,'walking',1,100,0,NULL,NULL,0,-1.0969124,36.7757640,'2026-03-09 19:47:42','2026-03-02 11:58:29','2026-03-09 19:47:42'),(2,5,NULL,1,5,'walking',1,100,0,NULL,NULL,0,-1.2075411,36.8957230,'2026-03-10 05:37:16','2026-03-09 20:31:09','2026-03-10 05:37:16');
/*!40000 ALTER TABLE `runner_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_messages`
--

DROP TABLE IF EXISTS `task_messages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_messages` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `sender_id` bigint unsigned NOT NULL,
  `message` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_task_messages_user` (`sender_id`),
  KEY `idx_task_messages_task` (`task_id`,`created_at`),
  CONSTRAINT `fk_task_messages_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_messages_user` FOREIGN KEY (`sender_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_messages`
--

LOCK TABLES `task_messages` WRITE;
/*!40000 ALTER TABLE `task_messages` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_messages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_proofs`
--

DROP TABLE IF EXISTS `task_proofs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_proofs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `uploaded_by` bigint unsigned NOT NULL,
  `proof_type` enum('before','after','delivery','odometer','package_condition') NOT NULL,
  `file_path` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_task_proofs_user` (`uploaded_by`),
  KEY `idx_task_proofs_task` (`task_id`),
  CONSTRAINT `fk_task_proofs_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_proofs_user` FOREIGN KEY (`uploaded_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_proofs`
--

LOCK TABLES `task_proofs` WRITE;
/*!40000 ALTER TABLE `task_proofs` DISABLE KEYS */;
/*!40000 ALTER TABLE `task_proofs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_runner_locations`
--

DROP TABLE IF EXISTS `task_runner_locations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_runner_locations` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `runner_id` bigint unsigned NOT NULL,
  `latitude` decimal(10,7) NOT NULL,
  `longitude` decimal(10,7) NOT NULL,
  `accuracy_meters` decimal(8,2) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_task_runner_locations_task_created` (`task_id`,`created_at`),
  KEY `idx_task_runner_locations_runner_created` (`runner_id`,`created_at`),
  CONSTRAINT `fk_task_runner_locations_runner` FOREIGN KEY (`runner_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_runner_locations_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_runner_locations`
--

LOCK TABLES `task_runner_locations` WRITE;
/*!40000 ALTER TABLE `task_runner_locations` DISABLE KEYS */;
INSERT INTO `task_runner_locations` VALUES (1,1,3,-1.0968603,36.7758034,98.40,'2026-03-09 19:41:02'),(2,1,3,-1.0969083,36.7757813,98.40,'2026-03-09 19:41:08'),(3,1,3,-1.0968892,36.7757953,82.50,'2026-03-09 19:47:31'),(4,1,3,-1.0969367,36.7757052,87.60,'2026-03-09 19:47:36'),(5,1,3,-1.0969124,36.7757640,92.90,'2026-03-09 19:47:42'),(6,2,5,-1.2072394,36.8956949,19.99,'2026-03-09 20:33:36'),(7,2,5,-1.2072021,36.8957125,19.99,'2026-03-09 20:33:58'),(8,2,5,-1.2071902,36.8957105,12.78,'2026-03-09 20:34:20'),(9,3,5,-1.2076936,36.8958108,22.54,'2026-03-10 05:19:30'),(10,3,5,-1.2076500,36.8958057,13.56,'2026-03-10 05:19:43'),(11,3,5,-1.2075300,36.8956767,8.73,'2026-03-10 05:19:48'),(12,3,5,-1.2075013,36.8956741,4.34,'2026-03-10 05:19:54'),(13,3,5,-1.2075013,36.8956741,4.34,'2026-03-10 05:19:59'),(14,3,5,-1.2075013,36.8956741,4.34,'2026-03-10 05:20:04'),(15,3,5,-1.2075138,36.8956824,4.33,'2026-03-10 05:20:09'),(16,3,5,-1.2075002,36.8956802,4.23,'2026-03-10 05:20:14'),(17,3,5,-1.2074973,36.8956812,4.22,'2026-03-10 05:20:20'),(18,3,5,-1.2074950,36.8956850,6.05,'2026-03-10 05:20:26'),(19,3,5,-1.2075074,36.8957026,6.17,'2026-03-10 05:22:20'),(20,3,5,-1.2075118,36.8957071,6.09,'2026-03-10 05:22:25'),(21,3,5,-1.2075097,36.8957051,5.57,'2026-03-10 05:22:31'),(22,3,5,-1.2075066,36.8957014,6.58,'2026-03-10 05:22:40'),(23,3,5,-1.2074945,36.8956851,3.70,'2026-03-10 05:22:46'),(24,3,5,-1.2075006,36.8956874,8.22,'2026-03-10 05:22:52'),(25,3,5,-1.2074971,36.8956894,5.81,'2026-03-10 05:22:57'),(26,3,5,-1.2074576,36.8957044,13.65,'2026-03-10 05:25:13'),(27,3,5,-1.2074365,36.8956869,23.40,'2026-03-10 05:25:18'),(28,3,5,-1.2071955,36.8957177,19.76,'2026-03-10 05:34:10'),(29,3,5,-1.2074852,36.8957551,28.78,'2026-03-10 05:34:18'),(30,3,5,-1.2073221,36.8957216,13.73,'2026-03-10 05:34:29'),(31,3,5,-1.2075411,36.8957230,20.83,'2026-03-10 05:37:16');
/*!40000 ALTER TABLE `task_runner_locations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_status_logs`
--

DROP TABLE IF EXISTS `task_status_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_status_logs` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `task_id` bigint unsigned NOT NULL,
  `changed_by` bigint unsigned NOT NULL,
  `old_status` varchar(50) DEFAULT NULL,
  `new_status` varchar(50) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_task_status_logs_user` (`changed_by`),
  KEY `idx_task_status_logs_task` (`task_id`,`created_at`),
  CONSTRAINT `fk_task_status_logs_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_task_status_logs_user` FOREIGN KEY (`changed_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_status_logs`
--

LOCK TABLES `task_status_logs` WRITE;
/*!40000 ALTER TABLE `task_status_logs` DISABLE KEYS */;
INSERT INTO `task_status_logs` VALUES (1,1,3,'posted','accepted',NULL,'2026-03-09 19:13:13'),(2,1,3,'accepted','in_progress',NULL,'2026-03-09 19:15:13'),(3,2,5,'posted','accepted',NULL,'2026-03-09 20:33:31'),(4,2,5,'accepted','in_progress',NULL,'2026-03-09 20:33:40'),(5,2,5,'in_progress','awaiting_confirmation',NULL,'2026-03-09 20:34:21'),(6,3,5,'posted','accepted',NULL,'2026-03-10 05:18:57'),(7,3,5,'accepted','in_progress',NULL,'2026-03-10 05:19:11'),(8,1,3,'in_progress','awaiting_confirmation',NULL,'2026-03-10 12:12:47'),(9,3,5,'in_progress','awaiting_confirmation',NULL,'2026-03-11 18:06:03'),(10,3,5,'awaiting_confirmation','completed',NULL,'2026-03-11 18:06:22');
/*!40000 ALTER TABLE `task_status_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tasks`
--

DROP TABLE IF EXISTS `tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tasks` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `client_id` bigint unsigned NOT NULL,
  `runner_id` bigint unsigned DEFAULT NULL,
  `zone_id` bigint unsigned NOT NULL,
  `client_zone_id` bigint unsigned DEFAULT NULL,
  `pickup_zone_id` bigint unsigned DEFAULT NULL,
  `dropoff_zone_id` bigint unsigned DEFAULT NULL,
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
  `cancelled_by` bigint unsigned DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_tasks_client` (`client_id`),
  KEY `fk_tasks_zone` (`zone_id`),
  KEY `fk_tasks_client_zone` (`client_zone_id`),
  KEY `fk_tasks_pickup_zone` (`pickup_zone_id`),
  KEY `fk_tasks_dropoff_zone` (`dropoff_zone_id`),
  KEY `fk_tasks_cancelled_by` (`cancelled_by`),
  KEY `idx_tasks_status_zone` (`status`,`zone_id`),
  KEY `idx_tasks_runner_status` (`runner_id`,`status`),
  CONSTRAINT `fk_tasks_cancelled_by` FOREIGN KEY (`cancelled_by`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_client` FOREIGN KEY (`client_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_tasks_client_zone` FOREIGN KEY (`client_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_dropoff_zone` FOREIGN KEY (`dropoff_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_pickup_zone` FOREIGN KEY (`pickup_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_runner` FOREIGN KEY (`runner_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_tasks_zone` FOREIGN KEY (`zone_id`) REFERENCES `zones` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tasks`
--

LOCK TABLES `tasks` WRITE;
/*!40000 ALTER TABLE `tasks` DISABLE KEYS */;
INSERT INTO `tasks` VALUES (1,2,3,26,1,26,1,'assisted_purchase','i jeed runner','go to kiambu fetch wota and comeback','kwamae','kwangu',NULL,NULL,NULL,NULL,NULL,NULL,250.00,0.00,'awaiting_confirmation','2026-03-11 22:10:00','2026-03-09 19:13:13','2026-03-09 19:15:13',NULL,'2026-03-10 12:12:47',NULL,NULL,'2026-03-09 19:11:05','2026-03-10 12:12:47'),(2,3,5,2,23,2,45,'courier','need runner to cbd and back','go cbd take bike come back','kalitos','fremon',NULL,NULL,NULL,NULL,NULL,NULL,250.00,0.00,'awaiting_confirmation','2026-03-10 23:05:00','2026-03-09 20:33:31','2026-03-09 20:33:40',NULL,'2026-03-09 20:34:21',NULL,NULL,'2026-03-09 20:05:20','2026-03-09 20:34:21'),(3,5,5,2,14,NULL,2,'assisted_purchase','I need a runner for cbd','Please I need a parcel to be picked','Cbd','Uperhill',NULL,NULL,NULL,NULL,NULL,NULL,350.00,0.00,'completed','2026-03-11 07:54:00','2026-03-10 05:18:57','2026-03-10 05:19:11',NULL,'2026-03-11 18:06:03',NULL,NULL,'2026-03-10 04:57:30','2026-03-11 18:06:22');
/*!40000 ALTER TABLE `tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `full_name` varchar(120) NOT NULL,
  `email` varchar(150) NOT NULL,
  `phone` varchar(20) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` enum('client','runner','both') NOT NULL DEFAULT 'client',
  `is_email_verified` tinyint(1) NOT NULL DEFAULT '0',
  `is_phone_verified` tinyint(1) NOT NULL DEFAULT '0',
  `verification_level` enum('basic','id_verified','pro') NOT NULL DEFAULT 'basic',
  `rating` decimal(3,2) NOT NULL DEFAULT '0.00',
  `rating_count` int unsigned NOT NULL DEFAULT '0',
  `account_status` enum('active','suspended','banned') NOT NULL DEFAULT 'active',
  `current_zone_id` bigint unsigned DEFAULT NULL,
  `latitude` decimal(10,7) DEFAULT NULL,
  `longitude` decimal(10,7) DEFAULT NULL,
  `location_updated_at` datetime DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `phone` (`phone`),
  KEY `fk_users_current_zone` (`current_zone_id`),
  CONSTRAINT `fk_users_current_zone` FOREIGN KEY (`current_zone_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Tumami Platform','platform@tumami.local','0000000000','SYSTEM_ACCOUNT','client',1,1,'pro',0.00,0,'active',NULL,NULL,NULL,NULL,'2026-03-02 11:55:49',NULL),(2,'Brandon James','brandonmantis@gmail.com','65741181','$2y$10$Cp9KYYKKBAGZLZ9LeR63nOB430xLgQEJyM5eordh.kRKCbPdZWlSe','client',0,0,'basic',0.00,0,'active',NULL,NULL,NULL,NULL,'2026-03-02 11:57:06',NULL),(3,'kelvin moses','kevmee98@gmail.com','0793425725','$2y$10$xntH7cBSZaXHrnIfgQ4k5OYH9376qWlaqYquAyZrYZUIa6L3OgpMe','both',0,0,'basic',0.00,0,'active',NULL,NULL,NULL,NULL,'2026-03-02 11:58:29',NULL),(4,'nathan kibet','nathankibet16@gmail.com','0748493595','$2y$10$4RmCSHpwRfsW.Z3CoIBOCe/HlQshcPozYb9wtJQenaoxFsvp.8abq','client',0,0,'basic',0.00,0,'active',NULL,NULL,NULL,NULL,'2026-03-02 12:30:09',NULL),(5,'Nathan Kibet','nathankibet254@gmail.com','0758848954','$2y$10$kvyQgq17EXT6Wt/Urr80l.YUMaC7DjBMYgjgpcKnnSfCkjDNJxAGW','both',0,0,'basic',0.00,0,'active',NULL,NULL,NULL,NULL,'2026-03-09 20:31:09',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `wallet_transactions`
--

DROP TABLE IF EXISTS `wallet_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `wallet_transactions` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `task_id` bigint unsigned DEFAULT NULL,
  `direction` enum('credit','debit') NOT NULL,
  `type` enum('deposit','task_earning','commission','withdrawal','refund','penalty','adjustment') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `status` enum('pending','completed','failed') NOT NULL DEFAULT 'completed',
  `reference` varchar(120) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_wallet_transactions_task` (`task_id`),
  KEY `idx_wallet_user_created` (`user_id`,`created_at`),
  KEY `idx_wallet_type_status` (`type`,`status`),
  CONSTRAINT `fk_wallet_transactions_task` FOREIGN KEY (`task_id`) REFERENCES `tasks` (`id`) ON DELETE SET NULL,
  CONSTRAINT `fk_wallet_transactions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `wallet_transactions`
--

LOCK TABLES `wallet_transactions` WRITE;
/*!40000 ALTER TABLE `wallet_transactions` DISABLE KEYS */;
INSERT INTO `wallet_transactions` VALUES (1,2,1,'debit','deposit',250.00,'completed','TASK_FEE_LOCK','2026-03-09 19:11:05'),(2,3,2,'debit','deposit',250.00,'completed','TASK_FEE_LOCK','2026-03-09 20:05:20'),(3,5,3,'debit','deposit',350.00,'completed','TASK_FEE_LOCK','2026-03-10 04:57:30'),(4,5,NULL,'credit','deposit',16000.00,'completed','CLIENT_TOPUP','2026-03-10 15:45:16'),(5,5,NULL,'credit','deposit',1000000.00,'completed','CLIENT_TOPUP','2026-03-10 15:45:35'),(6,5,NULL,'credit','deposit',200000.00,'completed','CLIENT_TOPUP','2026-03-10 15:49:49'),(7,5,3,'credit','task_earning',315.00,'completed','TASK_COMPLETION','2026-03-11 18:06:22'),(8,1,3,'credit','commission',35.00,'completed','PLATFORM_COMMISSION','2026-03-11 18:06:22');
/*!40000 ALTER TABLE `wallet_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `withdrawals`
--

DROP TABLE IF EXISTS `withdrawals`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `withdrawals` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `user_id` bigint unsigned NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payout_method` enum('mpesa','bank') NOT NULL DEFAULT 'mpesa',
  `payout_reference` varchar(120) DEFAULT NULL,
  `status` enum('pending','processed','rejected') NOT NULL DEFAULT 'pending',
  `requested_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `processed_at` datetime DEFAULT NULL,
  `rejection_reason` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_withdrawals_user` (`user_id`),
  KEY `idx_withdrawals_status_requested` (`status`,`requested_at`),
  CONSTRAINT `fk_withdrawals_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `withdrawals`
--

LOCK TABLES `withdrawals` WRITE;
/*!40000 ALTER TABLE `withdrawals` DISABLE KEYS */;
/*!40000 ALTER TABLE `withdrawals` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `zones`
--

DROP TABLE IF EXISTS `zones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `zones` (
  `id` bigint unsigned NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `parent_id` bigint unsigned DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_zones_parent` (`parent_id`),
  CONSTRAINT `fk_zones_parent` FOREIGN KEY (`parent_id`) REFERENCES `zones` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `zones`
--

LOCK TABLES `zones` WRITE;
/*!40000 ALTER TABLE `zones` DISABLE KEYS */;
INSERT INTO `zones` VALUES (1,'Nairobi',NULL,1,'2026-03-02 11:55:49'),(2,'CBD',1,1,'2026-03-02 11:55:49'),(3,'Upper Hill',1,1,'2026-03-02 11:55:49'),(4,'Westlands',1,1,'2026-03-02 11:55:49'),(5,'Kilimani',1,1,'2026-03-02 11:55:49'),(6,'Karen',1,1,'2026-03-02 11:55:49'),(7,'Parklands',1,1,'2026-03-02 11:55:49'),(8,'Lavington',1,1,'2026-03-02 11:55:49'),(9,'Kileleshwa',1,1,'2026-03-02 11:55:49'),(10,'South B',1,1,'2026-03-02 11:55:49'),(11,'South C',1,1,'2026-03-02 11:55:49'),(12,'Lang\'ata',1,1,'2026-03-02 11:55:49'),(13,'Embakasi',1,1,'2026-03-02 11:55:49'),(14,'Donholm',1,1,'2026-03-02 11:55:49'),(15,'Pipeline',1,1,'2026-03-02 11:55:49'),(16,'Roysambu',1,1,'2026-03-02 11:55:49'),(17,'Kasarani',1,1,'2026-03-02 11:55:49'),(18,'Githurai',1,1,'2026-03-02 11:55:49'),(19,'Eastleigh',1,1,'2026-03-02 11:55:49'),(20,'Ngong Road',1,1,'2026-03-02 11:55:49'),(21,'Muthaiga',1,1,'2026-03-02 11:55:49'),(22,'Runda',1,1,'2026-03-02 11:55:49'),(23,'Industrial Area',1,1,'2026-03-02 11:55:49'),(24,'Gigiri',1,1,'2026-03-02 11:55:49'),(25,'Ruaka',1,1,'2026-03-02 11:55:49'),(26,'Kiambu',NULL,1,'2026-03-02 11:55:49'),(27,'Kiambu Town',26,1,'2026-03-02 11:55:49'),(28,'Ruiru',26,1,'2026-03-02 11:55:49'),(29,'Thika',26,1,'2026-03-02 11:55:49'),(30,'Juja',26,1,'2026-03-02 11:55:49'),(31,'Limuru',26,1,'2026-03-02 11:55:49'),(32,'Kikuyu',26,1,'2026-03-02 11:55:49'),(33,'Githunguri',26,1,'2026-03-02 11:55:49'),(34,'Kabete',26,1,'2026-03-02 11:55:49'),(35,'Wangige',26,1,'2026-03-02 11:55:49'),(36,'Karuri',26,1,'2026-03-02 11:55:49'),(37,'Banana',26,1,'2026-03-02 11:55:49'),(38,'Ndenderu',26,1,'2026-03-02 11:55:49'),(39,'Tigoni',26,1,'2026-03-02 11:55:49'),(40,'Kamakis',26,1,'2026-03-02 11:55:49'),(41,'Kahawa Sukari',1,1,'2026-03-02 11:55:49'),(42,'Kahawa West',1,1,'2026-03-02 11:55:49'),(43,'Mirema',1,1,'2026-03-02 11:55:49'),(44,'Umoja',1,1,'2026-03-02 11:55:49'),(45,'Buruburu',1,1,'2026-03-02 11:55:49'),(46,'Syokimau',1,1,'2026-03-02 11:55:49'),(47,'Mlolongo',1,1,'2026-03-02 11:55:49'),(48,'Kitengela',NULL,1,'2026-03-02 11:55:49');
/*!40000 ALTER TABLE `zones` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-03-12  6:35:23
