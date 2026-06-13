-- ============================================
-- Lixscout Database Schema
-- Hostinger MySQL
-- ============================================

-- Tabel: email claims (diskon 5%)
CREATE TABLE IF NOT EXISTS `claims` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `discount_percent` INT DEFAULT 5,
  `claimed_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  `has_reviewed` TINYINT(1) DEFAULT 0,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  INDEX `idx_email` (`email`),
  INDEX `idx_reviewed` (`has_reviewed`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel: customer reviews
CREATE TABLE IF NOT EXISTS `reviews` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `claim_id` INT,
  `email` VARCHAR(255),
  `rating` TINYINT NOT NULL CHECK (`rating` BETWEEN 1 AND 5),
  `review_text` TEXT,
  `reviewer_name` VARCHAR(100) DEFAULT 'Traveler',
  `is_approved` TINYINT(1) DEFAULT 1,
  `created_at` DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`claim_id`) REFERENCES `claims`(`id`) ON DELETE SET NULL,
  INDEX `idx_approved` (`is_approved`),
  INDEX `idx_rating` (`rating`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Tabel: admin settings (buat manage kupon event nanti)
CREATE TABLE IF NOT EXISTS `settings` (
  `setting_key` VARCHAR(100) PRIMARY KEY,
  `setting_value` TEXT,
  `updated_at` DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Default settings
INSERT INTO `settings` (`setting_key`, `setting_value`) VALUES
('discount_percent', '5'),
('event_coupon_active', '0'),
('event_coupon_code', ''),
('event_coupon_discount', '10')
ON DUPLICATE KEY UPDATE `setting_key` = `setting_key`;
