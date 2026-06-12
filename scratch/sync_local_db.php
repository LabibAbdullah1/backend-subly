<?php
try {
    $pdo = new PDO("mysql:host=127.0.0.1;dbname=sublymyi_main;charset=utf8", "root", "121212");
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    echo "Altering feedback and testimonials tables...\n";
    $pdo->exec("DROP TABLE IF EXISTS `testimonials`");
    $pdo->exec("DROP TABLE IF EXISTS `feedback`");

    $createFeedback = "
    CREATE TABLE `feedback` (
      `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      `user_id` bigint(20) UNSIGNED NOT NULL,
      `subdomain_id` bigint(20) UNSIGNED NULL DEFAULT NULL,
      `rating` int(11) NOT NULL,
      `title` varchar(255) NOT NULL DEFAULT '',
      `comment` text DEFAULT NULL,
      `status` enum('pending','approved','featured','rejected') NOT NULL DEFAULT 'pending',
      `admin_note` text DEFAULT NULL,
      `is_featured` tinyint(1) NOT NULL DEFAULT 0,
      `plan_id` bigint(20) UNSIGNED DEFAULT NULL,
      `created_at` timestamp NULL DEFAULT NULL,
      `updated_at` timestamp NULL DEFAULT NULL,
      `deleted_at` timestamp NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      UNIQUE KEY `feedback_subdomain_id_unique` (`subdomain_id`),
      CONSTRAINT `feedback_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
      CONSTRAINT `feedback_subdomain_id_foreign` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($createFeedback);
    echo "Table 'feedback' created successfully.\n";

    echo "Recreating notifications table...\n";
    $pdo->exec("DROP TABLE IF EXISTS `notifications`");

    $createNotifications = "
    CREATE TABLE `notifications` (
      `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
      `user_id` bigint(20) UNSIGNED NULL DEFAULT NULL,
      `title` varchar(255) NOT NULL,
      `message` text NOT NULL,
      `is_read` tinyint(1) NOT NULL DEFAULT 0,
      `created_at` datetime(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
      `updated_at` datetime(3) NULL DEFAULT NULL,
      PRIMARY KEY (`id`),
      CONSTRAINT `notifications_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";
    $pdo->exec($createNotifications);
    echo "Table 'notifications' created successfully.\n";

    echo "Database sync complete!\n";
} catch (PDOException $e) {
    echo "Migration failed: " . $e->getMessage() . "\n";
}
