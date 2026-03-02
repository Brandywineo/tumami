CREATE DATABASE IF NOT EXISTS tumami CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE tumami;

CREATE TABLE users (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(150) NOT NULL UNIQUE,
    phone VARCHAR(20) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('client','runner','both') NOT NULL DEFAULT 'client',
    is_email_verified TINYINT(1) NOT NULL DEFAULT 0,
    is_phone_verified TINYINT(1) NOT NULL DEFAULT 0,
    verification_level ENUM('basic','id_verified','pro') NOT NULL DEFAULT 'basic',
    rating DECIMAL(3,2) NOT NULL DEFAULT 0.00,
    rating_count INT UNSIGNED NOT NULL DEFAULT 0,
    account_status ENUM('active','suspended','banned') NOT NULL DEFAULT 'active',
    current_zone_id BIGINT UNSIGNED NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    location_updated_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;
INSERT INTO users (id, full_name, email, phone, password_hash, role, is_email_verified, is_phone_verified, verification_level, account_status) VALUES
(1, 'Tumami Platform', 'platform@tumami.local', '0000000000', 'SYSTEM_ACCOUNT', 'client', 1, 1, 'pro', 'active');

CREATE TABLE zones (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    parent_id BIGINT UNSIGNED NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_zones_parent FOREIGN KEY (parent_id) REFERENCES zones(id) ON DELETE SET NULL
) ENGINE=InnoDB;

ALTER TABLE users
    ADD CONSTRAINT fk_users_current_zone FOREIGN KEY (current_zone_id) REFERENCES zones(id) ON DELETE SET NULL;

CREATE TABLE runner_profiles (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL UNIQUE,
    active_zone_id BIGINT UNSIGNED NULL,
    accepts_adjacent_zones TINYINT(1) NOT NULL DEFAULT 1,
    radius_km TINYINT UNSIGNED NOT NULL DEFAULT 5,
    vehicle_type ENUM('walking','motorbike','car','van') NOT NULL DEFAULT 'walking',
    is_available TINYINT(1) NOT NULL DEFAULT 0,
    reliability_score SMALLINT UNSIGNED NOT NULL DEFAULT 100,
    strike_count SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    last_strike_at DATETIME NULL,
    bio TEXT NULL,
    total_tasks_completed INT UNSIGNED NOT NULL DEFAULT 0,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    location_updated_at DATETIME NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_runner_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_runner_profiles_zone FOREIGN KEY (active_zone_id) REFERENCES zones(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE tasks (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    client_id BIGINT UNSIGNED NOT NULL,
    runner_id BIGINT UNSIGNED NULL,
    zone_id BIGINT UNSIGNED NOT NULL,
    client_zone_id BIGINT UNSIGNED NULL,
    pickup_zone_id BIGINT UNSIGNED NULL,
    dropoff_zone_id BIGINT UNSIGNED NULL,
    category ENUM('courier','assisted_purchase','dropoff','queue') NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    pickup_address VARCHAR(255) NULL,
    dropoff_address VARCHAR(255) NULL,
    client_latitude DECIMAL(10,7) NULL,
    client_longitude DECIMAL(10,7) NULL,
    pickup_latitude DECIMAL(10,7) NULL,
    pickup_longitude DECIMAL(10,7) NULL,
    dropoff_latitude DECIMAL(10,7) NULL,
    dropoff_longitude DECIMAL(10,7) NULL,
    runner_fee DECIMAL(10,2) NOT NULL,
    platform_commission DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    status ENUM('posted','accepted','in_progress','awaiting_confirmation','completed','disputed','cancelled') NOT NULL DEFAULT 'posted',
    deadline DATETIME NULL,
    accepted_at DATETIME NULL,
    started_at DATETIME NULL,
    runner_arrived_at DATETIME NULL,
    completion_requested_at DATETIME NULL,
    cancelled_at DATETIME NULL,
    cancelled_by BIGINT UNSIGNED NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_tasks_client FOREIGN KEY (client_id) REFERENCES users(id),
    CONSTRAINT fk_tasks_runner FOREIGN KEY (runner_id) REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_zone FOREIGN KEY (zone_id) REFERENCES zones(id),
    CONSTRAINT fk_tasks_client_zone FOREIGN KEY (client_zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_pickup_zone FOREIGN KEY (pickup_zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_dropoff_zone FOREIGN KEY (dropoff_zone_id) REFERENCES zones(id) ON DELETE SET NULL,
    CONSTRAINT fk_tasks_cancelled_by FOREIGN KEY (cancelled_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_tasks_status_zone (status, zone_id),
    INDEX idx_tasks_runner_status (runner_id, status)
) ENGINE=InnoDB;

CREATE TABLE task_status_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    changed_by BIGINT UNSIGNED NOT NULL,
    old_status VARCHAR(50) NULL,
    new_status VARCHAR(50) NOT NULL,
    notes VARCHAR(255) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_status_logs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_status_logs_user FOREIGN KEY (changed_by) REFERENCES users(id),
    INDEX idx_task_status_logs_task (task_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE task_proofs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    uploaded_by BIGINT UNSIGNED NOT NULL,
    proof_type ENUM('before','after','delivery','odometer','package_condition') NOT NULL,
    file_path VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_proofs_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_proofs_user FOREIGN KEY (uploaded_by) REFERENCES users(id),
    INDEX idx_task_proofs_task (task_id)
) ENGINE=InnoDB;

CREATE TABLE task_messages (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    sender_id BIGINT UNSIGNED NOT NULL,
    message TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_task_messages_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_task_messages_user FOREIGN KEY (sender_id) REFERENCES users(id),
    INDEX idx_task_messages_task (task_id, created_at)
) ENGINE=InnoDB;

CREATE TABLE wallet_transactions (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    task_id BIGINT UNSIGNED NULL,
    direction ENUM('credit','debit') NOT NULL,
    type ENUM('deposit','task_earning','commission','withdrawal','refund','penalty','adjustment') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    status ENUM('pending','completed','failed') NOT NULL DEFAULT 'completed',
    reference VARCHAR(120) NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_wallet_transactions_user FOREIGN KEY (user_id) REFERENCES users(id),
    CONSTRAINT fk_wallet_transactions_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
    INDEX idx_wallet_user_created (user_id, created_at),
    INDEX idx_wallet_type_status (type, status)
) ENGINE=InnoDB;

CREATE TABLE withdrawals (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payout_method ENUM('mpesa','bank') NOT NULL DEFAULT 'mpesa',
    payout_reference VARCHAR(120) NULL,
    status ENUM('pending','processed','rejected') NOT NULL DEFAULT 'pending',
    requested_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at DATETIME NULL,
    rejection_reason VARCHAR(255) NULL,
    CONSTRAINT fk_withdrawals_user FOREIGN KEY (user_id) REFERENCES users(id),
    INDEX idx_withdrawals_status_requested (status, requested_at)
) ENGINE=InnoDB;

CREATE TABLE disputes (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    task_id BIGINT UNSIGNED NOT NULL,
    opened_by BIGINT UNSIGNED NOT NULL,
    reason TEXT NOT NULL,
    status ENUM('open','under_review','resolved','rejected') NOT NULL DEFAULT 'open',
    resolution_notes TEXT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_disputes_task FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    CONSTRAINT fk_disputes_opened_by FOREIGN KEY (opened_by) REFERENCES users(id),
    INDEX idx_disputes_status (status)
) ENGINE=InnoDB;

CREATE TABLE admin_logs (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    admin_id BIGINT UNSIGNED NOT NULL,
    action TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_admin_logs_admin FOREIGN KEY (admin_id) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT INTO zones (id, name, parent_id) VALUES
(1, 'Nairobi', NULL),
(2, 'CBD', 1),
(3, 'Upper Hill', 1),
(4, 'Westlands', 1),
(5, 'Kilimani', 1),
(6, 'Karen', 1),
(7, 'Parklands', 1),
(8, 'Lavington', 1),
(9, 'Kileleshwa', 1),
(10, 'South B', 1),
(11, 'South C', 1),
(12, 'Lang\'ata', 1),
(13, 'Embakasi', 1),
(14, 'Donholm', 1),
(15, 'Pipeline', 1),
(16, 'Roysambu', 1),
(17, 'Kasarani', 1),
(18, 'Githurai', 1),
(19, 'Eastleigh', 1),
(20, 'Ngong Road', 1),
(21, 'Muthaiga', 1),
(22, 'Runda', 1),
(23, 'Industrial Area', 1),
(24, 'Gigiri', 1),
(25, 'Ruaka', 1),
(26, 'Kiambu', NULL),
(27, 'Kiambu Town', 26),
(28, 'Ruiru', 26),
(29, 'Thika', 26),
(30, 'Juja', 26),
(31, 'Limuru', 26),
(32, 'Kikuyu', 26),
(33, 'Githunguri', 26),
(34, 'Kabete', 26),
(35, 'Wangige', 26),
(36, 'Karuri', 26),
(37, 'Banana', 26),
(38, 'Ndenderu', 26),
(39, 'Tigoni', 26),
(40, 'Kamakis', 26),
(41, 'Kahawa Sukari', 1),
(42, 'Kahawa West', 1),
(43, 'Mirema', 1),
(44, 'Umoja', 1),
(45, 'Buruburu', 1),
(46, 'Syokimau', 1),
(47, 'Mlolongo', 1),
(48, 'Kitengela', NULL);
