-- CreateTable
CREATE TABLE `users` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `email_verified_at` DATETIME(3) NULL,
    `password` VARCHAR(255) NOT NULL,
    `role` ENUM('Admin', 'Client') NOT NULL DEFAULT 'Client',
    `remember_token` VARCHAR(100) NULL,
    `last_seen_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `users_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `plans` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `type` VARCHAR(255) NOT NULL DEFAULT 'PHP',
    `is_active` BOOLEAN NOT NULL DEFAULT false,
    `price` BIGINT UNSIGNED NOT NULL,
    `duration_months` INTEGER NOT NULL,
    `max_storage_mb` INTEGER NOT NULL,
    `max_databases` INTEGER NOT NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subdomains` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `name` VARCHAR(255) NOT NULL,
    `full_domain` VARCHAR(255) NOT NULL,
    `doc_root` VARCHAR(255) NOT NULL,
    `status` ENUM('active', 'inactive', 'suspended', 'expired') NOT NULL DEFAULT 'active',
    `storage_override_mb` INTEGER UNSIGNED NULL,
    `git_url` VARCHAR(255) NULL,
    `git_branch` VARCHAR(255) NULL,
    `git_token` TEXT NULL,
    `git_last_commit` VARCHAR(255) NULL,
    `git_connected_at` DATETIME(3) NULL,
    `nodejs_version` VARCHAR(255) NOT NULL DEFAULT '20',
    `nodejs_startup_file` VARCHAR(255) NOT NULL DEFAULT 'server.js',
    `nodejs_mode` VARCHAR(255) NOT NULL DEFAULT 'production',
    `expired_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `subdomain_envs` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `subdomain_id` BIGINT UNSIGNED NOT NULL,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NOT NULL,
    `is_secret` BOOLEAN NOT NULL DEFAULT true,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `user_databases` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `subdomain_id` BIGINT UNSIGNED NOT NULL,
    `db_name` VARCHAR(255) NOT NULL,
    `db_user` VARCHAR(255) NOT NULL,
    `db_password` VARCHAR(255) NOT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `plan_id` BIGINT UNSIGNED NOT NULL,
    `voucher_id` BIGINT UNSIGNED NULL,
    `subdomain_id` BIGINT UNSIGNED NULL,
    `transaction_id` VARCHAR(255) NULL,
    `snap_token` VARCHAR(255) NULL,
    `amount` BIGINT UNSIGNED NOT NULL,
    `unique_code` INTEGER NULL,
    `proof_path` VARCHAR(255) NULL,
    `status` ENUM('pending', 'success', 'failed') NOT NULL DEFAULT 'pending',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `deployments` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `subdomain_id` BIGINT UNSIGNED NOT NULL,
    `zip_path` VARCHAR(255) NOT NULL,
    `zip_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `extracted_size` BIGINT UNSIGNED NOT NULL DEFAULT 0,
    `version` INTEGER NOT NULL DEFAULT 1,
    `status` ENUM('queued', 'processing', 'success', 'error') NOT NULL DEFAULT 'queued',
    `notes` VARCHAR(255) NULL,
    `admin_note` TEXT NULL,
    `deployed_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `vouchers` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(255) NOT NULL,
    `type` ENUM('fixed', 'percent') NOT NULL,
    `reward_amount` DECIMAL(10, 2) NOT NULL,
    `usage_limit` INTEGER NULL,
    `expires_at` DATETIME(3) NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `vouchers_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chats` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `is_admin` BOOLEAN NOT NULL DEFAULT false,
    `message` TEXT NOT NULL,
    `image_path` VARCHAR(255) NULL,
    `is_read` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reports` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `user_id` BIGINT UNSIGNED NOT NULL,
    `subject` VARCHAR(255) NOT NULL,
    `message` TEXT NOT NULL,
    `status` ENUM('open', 'in_progress', 'resolved') NOT NULL DEFAULT 'open',
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,
    `deleted_at` DATETIME(3) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `settings` (
    `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(255) NOT NULL,
    `value` TEXT NULL,
    `created_at` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NULL,

    UNIQUE INDEX `settings_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `subdomains` ADD CONSTRAINT `subdomains_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `subdomain_envs` ADD CONSTRAINT `subdomain_envs_subdomain_id_fkey` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `user_databases` ADD CONSTRAINT `user_databases_subdomain_id_fkey` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_plan_id_fkey` FOREIGN KEY (`plan_id`) REFERENCES `plans`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_voucher_id_fkey` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_subdomain_id_fkey` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `deployments` ADD CONSTRAINT `deployments_subdomain_id_fkey` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chats` ADD CONSTRAINT `chats_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reports` ADD CONSTRAINT `reports_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
