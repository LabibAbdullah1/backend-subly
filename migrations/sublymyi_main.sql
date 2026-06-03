
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


CREATE TABLE `cache` (
  `key` varchar(255) NOT NULL,
  `value` mediumtext NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `cache_locks`
--

CREATE TABLE `cache_locks` (
  `key` varchar(255) NOT NULL,
  `owner` varchar(255) NOT NULL,
  `expiration` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `chats`
--

CREATE TABLE `chats` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `message` text NOT NULL,
  `image_path` varchar(255) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `deployments`
--

CREATE TABLE `deployments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subdomain_id` bigint(20) UNSIGNED NOT NULL,
  `zip_path` varchar(255) NOT NULL,
  `zip_size` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `extracted_size` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `version` int(11) NOT NULL DEFAULT 1,
  `status` enum('queued','processing','success','error') NOT NULL DEFAULT 'queued',
  `notes` varchar(255) DEFAULT NULL,
  `admin_note` text DEFAULT NULL,
  `deployed_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `deployments`
--

INSERT INTO `deployments` (`id`, `subdomain_id`, `zip_path`, `zip_size`, `extracted_size`, `version`, `status`, `notes`, `admin_note`, `deployed_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(6, 16, 'uploads/zips/1779688368_AssignmentILTSS6.zip', 35334, 47010, 1, 'queued', 'test', NULL, NULL, '2026-05-25 05:52:48', '2026-05-25 09:22:25', '2026-05-25 09:22:25'),
(7, 17, 'uploads/zips/1779688579_Capstone_MoneyTor-TEBARUU-BANGETTTT.zip', 16859130, 62623739, 1, 'success', 'bangggg bantu akuuuuu', NULL, '2026-05-25 07:01:02', '2026-05-25 05:56:21', '2026-05-25 07:01:02', NULL),
(8, 16, 'uploads/zips/1779700945_AssignmentILTSS6.zip', 35334, 47010, 1, 'queued', 'test', NULL, NULL, '2026-05-25 09:22:25', '2026-05-25 09:26:40', '2026-05-25 09:26:40'),
(9, 16, 'uploads/zips/1779701200_well-known.zip', 2245238, 5272577, 1, 'queued', NULL, NULL, NULL, '2026-05-25 09:26:40', '2026-05-25 09:29:41', '2026-05-25 09:29:41'),
(10, 16, 'uploads/zips/1779701381_AssignmentILTSS6.zip', 35334, 47010, 1, 'queued', NULL, NULL, NULL, '2026-05-25 09:29:41', '2026-05-25 09:29:57', '2026-05-25 09:29:57'),
(11, 16, 'uploads/zips/1779701397_AssignmentILTSS6.zip', 35334, 47010, 1, 'queued', NULL, NULL, NULL, '2026-05-25 09:29:57', '2026-05-25 09:30:05', '2026-05-25 09:30:05'),
(12, 16, 'uploads/zips/1779701405_AssignmentILTSS6.zip', 35334, 47010, 1, 'queued', NULL, NULL, NULL, '2026-05-25 09:30:05', '2026-05-25 09:33:18', '2026-05-25 09:33:18'),
(16, 17, 'git_deployments/backendmoneytorxixi_1780409297.zip', 167708, 1837271, 2, 'success', 'GitHub Pull - Commit: 2fad0a8 | backend', NULL, '2026-06-02 14:08:17', '2026-06-02 14:08:17', '2026-06-02 14:08:17', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `failed_jobs`
--

CREATE TABLE `failed_jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `uuid` varchar(255) NOT NULL,
  `connection` text NOT NULL,
  `queue` text NOT NULL,
  `payload` longtext NOT NULL,
  `exception` longtext NOT NULL,
  `failed_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `rating` int(11) NOT NULL,
  `comment` text DEFAULT NULL,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `plan_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `feedback`
--

INSERT INTO `feedback` (`id`, `user_id`, `rating`, `comment`, `is_featured`, `created_at`, `updated_at`, `deleted_at`, `plan_id`) VALUES
(1, 2, 5, 'Harganya sepadan dengan fitur yang didapat. cepat dan stabil', 1, '2026-03-28 00:54:08', '2026-03-28 06:10:03', NULL, 2),
(2, 9, 5, 'sebagai user GRATISAN yang dikasi voucer, saya merasa terhomat heheh, aplikasinya udah keren banget..... trus untuk bug ada sih sedikit tapi keren langsung diatasin cepattt. \r\noverall : 9,0/10, KERENNNN', 1, '2026-03-28 07:50:50', '2026-03-28 07:52:09', NULL, 1),
(3, 9, 5, 'Proses deploy sangat gampang untuk pemula.', 0, '2026-06-01 08:24:37', '2026-06-01 08:24:37', NULL, 2);

-- --------------------------------------------------------

--
-- Table structure for table `jobs`
--

CREATE TABLE `jobs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `queue` varchar(255) NOT NULL,
  `payload` longtext NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL,
  `reserved_at` int(10) UNSIGNED DEFAULT NULL,
  `available_at` int(10) UNSIGNED NOT NULL,
  `created_at` int(10) UNSIGNED NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `jobs`
--

INSERT INTO `jobs` (`id`, `queue`, `payload`, `attempts`, `reserved_at`, `available_at`, `created_at`) VALUES
(1, 'default', '{\"uuid\":\"f1f106ae-0c80-4af1-96ab-cf0c0adad3dd\",\"displayName\":\"App\\\\Mail\\\\AdminPaymentNotification\",\"job\":\"Illuminate\\\\Queue\\\\CallQueuedHandler@call\",\"maxTries\":null,\"maxExceptions\":null,\"failOnTimeout\":false,\"backoff\":null,\"timeout\":null,\"retryUntil\":null,\"data\":{\"commandName\":\"Illuminate\\\\Mail\\\\SendQueuedMailable\",\"command\":\"O:34:\\\"Illuminate\\\\Mail\\\\SendQueuedMailable\\\":17:{s:8:\\\"mailable\\\";O:33:\\\"App\\\\Mail\\\\AdminPaymentNotification\\\":3:{s:7:\\\"payment\\\";O:45:\\\"Illuminate\\\\Contracts\\\\Database\\\\ModelIdentifier\\\":5:{s:5:\\\"class\\\";s:18:\\\"App\\\\Models\\\\Payment\\\";s:2:\\\"id\\\";i:36;s:9:\\\"relations\\\";a:3:{i:0;s:4:\\\"user\\\";i:1;s:4:\\\"plan\\\";i:2;s:9:\\\"subdomain\\\";}s:10:\\\"connection\\\";s:5:\\\"mysql\\\";s:15:\\\"collectionClass\\\";N;}s:2:\\\"to\\\";a:1:{i:0;a:2:{s:4:\\\"name\\\";N;s:7:\\\"address\\\";s:28:\\\"labibabdullahhasan@gmail.com\\\";}}s:6:\\\"mailer\\\";s:4:\\\"smtp\\\";}s:5:\\\"tries\\\";N;s:7:\\\"timeout\\\";N;s:13:\\\"maxExceptions\\\";N;s:17:\\\"shouldBeEncrypted\\\";b:0;s:10:\\\"connection\\\";N;s:5:\\\"queue\\\";N;s:12:\\\"messageGroup\\\";N;s:12:\\\"deduplicator\\\";N;s:5:\\\"delay\\\";N;s:11:\\\"afterCommit\\\";N;s:10:\\\"middleware\\\";a:0:{}s:7:\\\"chained\\\";a:0:{}s:15:\\\"chainConnection\\\";N;s:10:\\\"chainQueue\\\";N;s:19:\\\"chainCatchCallbacks\\\";N;s:3:\\\"job\\\";N;}\",\"batchId\":null},\"createdAt\":1780321031,\"delay\":null}', 0, NULL, 1780321031, 1780321031);

-- --------------------------------------------------------

--
-- Table structure for table `job_batches`
--

CREATE TABLE `job_batches` (
  `id` varchar(255) NOT NULL,
  `name` varchar(255) NOT NULL,
  `total_jobs` int(11) NOT NULL,
  `pending_jobs` int(11) NOT NULL,
  `failed_jobs` int(11) NOT NULL,
  `failed_job_ids` longtext NOT NULL,
  `options` mediumtext DEFAULT NULL,
  `cancelled_at` int(11) DEFAULT NULL,
  `created_at` int(11) NOT NULL,
  `finished_at` int(11) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `migrations`
--

CREATE TABLE `migrations` (
  `id` int(10) UNSIGNED NOT NULL,
  `migration` varchar(255) NOT NULL,
  `batch` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `migrations`
--

INSERT INTO `migrations` (`id`, `migration`, `batch`) VALUES
(1, '0001_01_01_000000_create_users_table', 1),
(2, '0001_01_01_000001_create_cache_table', 1),
(3, '0001_01_01_000002_create_jobs_table', 1),
(4, '2026_03_08_101225_create_plans_table', 1),
(5, '2026_03_08_101225_create_vouchers_table', 1),
(6, '2026_03_08_101226_create_payments_table', 1),
(7, '2026_03_08_101226_create_subdomains_table', 1),
(8, '2026_03_08_101227_create_deployments_table', 1),
(9, '2026_03_08_101227_create_user_databases_table', 1),
(10, '2026_03_08_101228_create_feedback_table', 1),
(12, '2026_03_08_111336_change_price_to_bigint_on_plans_table', 1),
(13, '2026_03_08_111337_change_amount_to_bigint_on_payments_table', 1),
(14, '2026_03_08_111937_add_midtrans_fields_to_payments_table', 1),
(15, '2026_03_08_121826_add_type_to_plans_table', 1),
(16, '2026_03_08_122508_add_is_featured_to_feedback_table', 1),
(17, '2026_03_08_141414_add_is_active_to_plans_table', 1),
(18, '2026_03_09_005037_create_notifications_table', 1),
(19, '2026_03_09_070203_add_subdomain_id_to_payments_table', 1),
(20, '2026_03_09_110000_add_plan_id_to_feedback_table', 1),
(21, '2026_03_10_000000_create_chats_table', 1),
(22, '2026_03_10_234400_add_last_seen_at_to_users_table', 1),
(23, '2026_03_27_144000_add_unique_code_to_payments_table', 2),
(24, '2026_03_27_150500_add_image_path_to_chats_table', 2),
(25, '2026_03_27_164000_create_settings_table', 2),
(26, '2026_04_08_110700_add_notes_to_deployments_table', 3),
(27, '2026_04_08_120000_add_size_columns_to_deployments_table', 4),
(29, '2026_05_21_151000_add_inactive_to_subdomains_status_enum', 6),
(30, '2026_05_27_203245_create_subdomain_envs_table', 7),
(31, '2026_05_27_210000_create_subdomain_envs_table', 8),
(32, '2026_05_27_220000_add_nodejs_fields_to_subdomains_table', 8),
(33, '2026_03_08_101228_create_reports_table', 9),
(34, '2026_05_27_230000_add_git_fields_to_subdomains_table', 9),
(35, '2026_05_27_240000_add_storage_override_to_subdomains_table', 10);

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` char(36) NOT NULL,
  `type` varchar(255) NOT NULL,
  `notifiable_type` varchar(255) NOT NULL,
  `notifiable_id` bigint(20) UNSIGNED NOT NULL,
  `data` text NOT NULL,
  `read_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `notifications`
--

INSERT INTO `notifications` (`id`, `type`, `notifiable_type`, `notifiable_id`, `data`, `read_at`, `created_at`, `updated_at`) VALUES
('33fcd872-b7ac-4c6d-9845-3474d410aed4', 'App\\Notifications\\GeneralNotification', 'App\\Models\\User', 8, '{\"message\":\"halo dear, saat ini aplikasi dalam proses pengembangan, mohon maaf atas segala ketidak nyamanan nya, \\r\\nterimakasih atas pengertiannya \\ud83d\\ude4f\"}', NULL, '2026-03-27 13:04:07', '2026-03-27 13:04:07'),
('4d1d6600-9886-4c1b-81dc-c895c9f0b8c8', 'App\\Notifications\\GeneralNotification', 'App\\Models\\User', 9, '{\"message\":\"selamat datang... silahkan gunakan kode voucer ini\\r\\n\'yatikeren\'untuk mendapatkan free subdomain\"}', NULL, '2026-03-27 04:19:58', '2026-03-27 04:19:58'),
('61ce8843-15da-4c5e-978a-acafaed5a985', 'App\\Notifications\\GeneralNotification', 'App\\Models\\User', 6, '{\"message\":\"halo dear, saat ini aplikasi dalam proses pengembangan, mohon maaf atas segala ketidak nyamanan nya, \\r\\nterimakasih atas pengertiannya \\ud83d\\ude4f\"}', NULL, '2026-03-27 13:04:07', '2026-03-27 13:04:07'),
('8522c765-8079-469c-a43a-af7325d28d17', 'App\\Notifications\\GeneralNotification', 'App\\Models\\User', 7, '{\"message\":\"halo dear, saat ini aplikasi dalam proses pengembangan, mohon maaf atas segala ketidak nyamanan nya, \\r\\nterimakasih atas pengertiannya \\ud83d\\ude4f\"}', NULL, '2026-03-27 13:04:07', '2026-03-27 13:04:07'),
('9a978ce2-84cb-442c-a842-3448bf5a2267', 'App\\Notifications\\GeneralNotification', 'App\\Models\\User', 4, '{\"message\":\"halo dear, saat ini aplikasi dalam proses pengembangan, mohon maaf atas segala ketidak nyamanan nya, \\r\\nterimakasih atas pengertiannya \\ud83d\\ude4f\"}', NULL, '2026-03-27 13:04:07', '2026-03-27 13:04:07'),
('cebdccf2-f29f-4f84-836a-91db3f252a36', 'App\\Notifications\\GeneralNotification', 'App\\Models\\User', 9, '{\"message\":\"halo dear, saat ini aplikasi dalam proses pengembangan, mohon maaf atas segala ketidak nyamanan nya, \\r\\nterimakasih atas pengertiannya \\ud83d\\ude4f\"}', NULL, '2026-03-27 13:04:07', '2026-03-27 13:04:07');

-- --------------------------------------------------------

--
-- Table structure for table `password_reset_tokens`
--

CREATE TABLE `password_reset_tokens` (
  `email` varchar(255) NOT NULL,
  `token` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `plan_id` bigint(20) UNSIGNED NOT NULL,
  `voucher_id` bigint(20) UNSIGNED DEFAULT NULL,
  `transaction_id` varchar(255) DEFAULT NULL,
  `snap_token` varchar(255) DEFAULT NULL,
  `amount` bigint(20) UNSIGNED NOT NULL,
  `unique_code` int(11) DEFAULT NULL,
  `proof_path` varchar(255) DEFAULT NULL,
  `status` enum('pending','success','failed') NOT NULL DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `subdomain_id` bigint(20) UNSIGNED DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `payments`
--

INSERT INTO `payments` (`id`, `user_id`, `plan_id`, `voucher_id`, `transaction_id`, `snap_token`, `amount`, `unique_code`, `proof_path`, `status`, `created_at`, `updated_at`, `deleted_at`, `subdomain_id`) VALUES
(5, 9, 1, NULL, 'PAY-1774627216-9', 'FREE_VOUCHER_SKIPPED', 0, NULL, NULL, 'success', '2026-03-27 16:00:16', '2026-03-27 16:07:26', NULL, NULL),
(6, 2, 2, NULL, 'PAY-1774630750-2', 'FREE_VOUCHER_SKIPPED', 0, NULL, NULL, 'success', '2026-03-27 16:59:10', '2026-05-19 03:12:13', '2026-05-19 03:12:13', 5),
(9, 2, 1, NULL, 'ADMIN-1774681761-2', 'admin-bypass', 0, NULL, NULL, 'success', '2026-03-28 07:09:21', '2026-05-19 03:17:10', '2026-05-19 03:17:10', 6),
(18, 9, 2, NULL, 'PAY-1779020760-9', NULL, 20186, 186, NULL, 'success', '2026-05-17 12:26:00', '2026-05-25 03:07:07', NULL, 17),
(19, 2, 1, NULL, 'PAY-1779160751-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 03:19:11', '2026-05-19 03:43:27', '2026-05-19 03:43:27', 7),
(20, 2, 2, NULL, 'PAY-1779162217-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 03:43:37', '2026-05-19 03:55:12', '2026-05-19 03:55:12', 8),
(21, 2, 1, 6, 'PAY-1779162972-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 03:56:12', '2026-05-19 03:58:30', '2026-05-19 03:58:30', 9),
(22, 2, 1, 6, 'PAY-1779163117-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 03:58:37', '2026-05-19 04:02:20', '2026-05-19 04:02:20', 10),
(23, 2, 1, 6, 'PAY-1779163975-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 04:12:55', '2026-05-19 04:20:13', '2026-05-19 04:20:13', 11),
(24, 2, 1, NULL, 'PAY-1779164454-2', NULL, 15310, 310, NULL, 'failed', '2026-05-19 04:20:54', '2026-05-19 04:20:59', NULL, NULL),
(25, 2, 1, 6, 'PAY-1779164558-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 04:22:38', '2026-05-19 04:25:11', '2026-05-19 04:25:11', 12),
(26, 2, 1, 6, 'PAY-1779164718-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 04:25:18', '2026-05-19 14:11:04', '2026-05-19 14:11:04', 13),
(27, 2, 1, 6, 'PAY-1779199025-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 13:57:05', '2026-05-19 14:05:03', '2026-05-19 14:05:03', 14),
(28, 2, 2, 6, 'PAY-1779199047-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 13:57:27', '2026-05-21 15:21:10', NULL, 16),
(29, 2, 1, 6, 'PAY-1779199129-2', NULL, 0, NULL, NULL, 'success', '2026-05-19 13:58:49', '2026-05-19 14:14:33', '2026-05-19 14:14:33', 15),
(30, 2, 1, NULL, 'PAY-1779269118-2', NULL, 15310, 310, NULL, 'failed', '2026-05-20 09:25:18', '2026-05-20 09:28:05', NULL, NULL),
(31, 2, 1, NULL, 'PAY-1779715783-2', NULL, 15310, 310, NULL, 'failed', '2026-05-25 13:29:43', '2026-05-26 02:15:00', NULL, NULL),
(32, 2, 1, NULL, 'PAY-1780320549-2', NULL, 15310, 310, NULL, 'failed', '2026-06-01 13:29:09', '2026-06-01 13:29:30', NULL, NULL),
(33, 2, 1, NULL, 'PAY-1780320576-2', NULL, 15310, 310, NULL, 'failed', '2026-06-01 13:29:36', '2026-06-01 13:30:11', NULL, NULL),
(34, 2, 1, NULL, 'PAY-1780320613-2', NULL, 15310, 310, NULL, 'failed', '2026-06-01 13:30:13', '2026-06-01 13:33:31', NULL, NULL),
(35, 2, 1, NULL, 'PAY-1780320813-2', NULL, 15310, 310, NULL, 'failed', '2026-06-01 13:33:33', '2026-06-01 13:37:03', NULL, NULL),
(36, 2, 2, NULL, 'PAY-1780321030-2', NULL, 20310, 310, NULL, 'failed', '2026-06-01 13:37:10', '2026-06-01 13:37:15', NULL, NULL),
(37, 2, 1, 6, 'PAY-1780321184-2', NULL, 0, NULL, NULL, 'success', '2026-06-01 13:39:44', '2026-06-01 13:40:07', NULL, 18);

-- --------------------------------------------------------

--
-- Table structure for table `plans`
--

CREATE TABLE `plans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `type` varchar(255) NOT NULL DEFAULT 'PHP',
  `is_active` tinyint(1) NOT NULL DEFAULT 0,
  `price` bigint(20) UNSIGNED NOT NULL,
  `duration_months` int(11) NOT NULL,
  `max_storage_mb` int(11) NOT NULL,
  `max_databases` int(11) NOT NULL,
  `description` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `plans`
--

INSERT INTO `plans` (`id`, `name`, `type`, `is_active`, `price`, `duration_months`, `max_storage_mb`, `max_databases`, `description`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 'Starter PHP', 'PHP', 1, 15000, 3, 50, 1, 'Perfect for simple PHP student projects, PHP Native, full version PHP, juga bisa untuk react', '2026-03-10 18:58:34', '2026-05-28 11:51:02', NULL),
(2, 'Node Basic', 'NodeJS', 1, 20000, 3, 120, 1, 'Affordable NodeJS hosting for beginners, RESTful API', '2026-03-10 18:58:34', '2026-05-28 11:50:50', NULL),
(3, 'Fullstack Pro', 'Fullstack', 1, 30000, 3, 150, 1, 'Complete support for PHP and Node.', '2026-03-10 18:58:34', '2026-03-30 07:20:33', '2026-03-30 07:20:33'),
(4, 'Laravel Hosting', 'Laravel', 1, 20000, 3, 120, 1, 'hosting Laravel suport version 12+ monolith or RESTful API', '2026-03-30 07:20:08', '2026-05-28 11:50:38', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `reports`
--

CREATE TABLE `reports` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `subject` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `status` enum('open','in_progress','resolved') NOT NULL DEFAULT 'open',
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `id` varchar(255) NOT NULL,
  `user_id` bigint(20) UNSIGNED DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` text DEFAULT NULL,
  `payload` longtext NOT NULL,
  `last_activity` int(11) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`id`, `user_id`, `ip_address`, `user_agent`, `payload`, `last_activity`) VALUES
('5xevP1a9CKZ0582jnWBoGt1qoii7bpk1EFWTrgnA', NULL, '2a03:2880:15ff:5c::', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiMmVVZXZNVTdjM0RjcGFaaVhGb2xyaEt6eU5xenlMc29kQXZoTVVPOCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjg6Imh0dHBzOi8vc3VibHktdjIuc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780465269),
('8JBSYCBRSqAYnatzgqmZe0HwDtOJp0FTObx80b2i', NULL, '2a03:2880:18ff:40::', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiV3ZSMzZOb0lkem1TZzE3TjZZWE90TkNkeXZFSlZiTld3U3ZaN29KRyI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjg6Imh0dHBzOi8vc3VibHktdjIuc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780465268),
('934VKXaLsfS1EGPa5X0kcPQiOeptcrIOMTmd31x4', NULL, '34.87.148.41', 'Mozilla/5.0 (X11; Linux x86_64) Firefox/117.0', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiekxkVFFtNkJwNm5McEszY0FNblFLbUZ3eElBRjJnY2txbE0wZEd6diI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MTg6Imh0dHA6Ly9zdWJseS5teS5pZCI7czo1OiJyb3V0ZSI7Tjt9czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1780463183),
('AatZdcNeYPIjdacZh9S8VS0imkN6D62cLFzAs4Mv', NULL, '2a03:2880:16ff:70::', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiVzBtUElmbW9mWXFxYmFnNUVEVE02dXgzeDVXS1NnS3d3WG1zaUtkWCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjg6Imh0dHBzOi8vc3VibHktdjIuc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780465569),
('asIuTFjRXkzJQTbTHvqEUK7zn4dRgaDx06zWyW2e', NULL, '2a03:2880:18ff:5b::', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiRk5DelBSOW9XQUI3MmlQREgwZFJUSjNGcFI2SmQzM0xHR0Q1WnQ1NSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjg6Imh0dHBzOi8vc3VibHktdjIuc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780465271),
('ClVdb9X0n8YIXuzFj6QeoL5Sxgb1IsMprDu05G3I', NULL, '195.88.211.210', '', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoiRFR6S2JLVkFKQ1ZGem1VN2pRZktXZ1U2N2NwT2hGdzNNbkdFbWE0ZCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1780468601),
('ff92WTEMROzuYrxERvlg7SjWu1PUbuQBBw4zYVOx', NULL, '2a03:2880:18ff:52::', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiSmdHZUFqcGwwVHFQcnFOWGEySHhXN1FLZkVQOGl0SFJ6N0ZDbXN0OSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjg6Imh0dHBzOi8vc3VibHktdjIuc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780465269),
('ntSdT9vc1bDuPLt63f8UzLcrd4fN2SkHwmZkedhj', NULL, '3.216.193.107', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/134.0.0.0 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoidmYzUXlnN29lcFd2WnIxSXlaNmpUNzY0WlJVbnZDUnJnajNuaGJUOCI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MjI6Imh0dHA6Ly93d3cuc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780465676),
('RwaYb3U9artsgb0OeuAtusM3M1047YJHZgAYwjIl', NULL, '195.88.211.210', '', 'YToyOntzOjY6Il90b2tlbiI7czo0MDoidndxbkdGVHBqMlMxNTZBZDJoS3pSczZHbGhLSGN2NjZQNUs4OGxVTCI7czo2OiJfZmxhc2giO2E6Mjp7czozOiJvbGQiO2E6MDp7fXM6MzoibmV3IjthOjA6e319fQ==', 1780468588),
('u5J9paS5zqEdFKJ3T9sChq68OjpgRSGlzGDeIaKs', NULL, '2a03:2880:17ff:48::', 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoiWVM5VHhOV0VndE9FazhSQkY3bnlqWTFzdEgwa1o0ZElQUHNlT2xWdSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mjg6Imh0dHBzOi8vc3VibHktdjIuc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780465266),
('weI5jifdaIaHVRAHYnW2cU0kOqHYH1XKlAn31816', 1, '27.121.83.6', 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Mobile Safari/537.36', 'YTo0OntzOjY6Il90b2tlbiI7czo0MDoiVkRSejIzMHlWTjg0Z0ZuaUh5V1U0MEFjSUt4b2VRUnJzZkc5S3dvUSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6Mzk6Imh0dHBzOi8vc3VibHktdjIuc3VibHkubXkuaWQvYWRtaW4vZGlzayI7czo1OiJyb3V0ZSI7czoxNjoiYWRtaW4uZGlzay5pbmRleCI7fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fXM6NTA6ImxvZ2luX3dlYl81OWJhMzZhZGRjMmIyZjk0MDE1ODBmMDE0YzdmNThlYTRlMzA5ODlkIjtpOjE7fQ==', 1780466896),
('yI4BTqOaKl5dvwiitorIY6egpbrYXkZSgFll8e8h', NULL, '124.236.100.6', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36', 'YTozOntzOjY6Il90b2tlbiI7czo0MDoidUZWOTFodkRMYlpxeWdXQVIzTnZzSnhxMlBvQWVBbUU5Z0tMMFNOQSI7czo5OiJfcHJldmlvdXMiO2E6Mjp7czozOiJ1cmwiO3M6MTk6Imh0dHBzOi8vc3VibHkubXkuaWQiO3M6NToicm91dGUiO047fXM6NjoiX2ZsYXNoIjthOjI6e3M6Mzoib2xkIjthOjA6e31zOjM6Im5ldyI7YTowOnt9fX0=', 1780464346);

-- --------------------------------------------------------

--
-- Table structure for table `settings`
--

CREATE TABLE `settings` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `settings`
--

INSERT INTO `settings` (`id`, `key`, `value`, `created_at`, `updated_at`) VALUES
(1, 'qris_image_path', 'uploads/settings/qris_1779716648.png', '2026-03-28 00:23:28', '2026-05-25 13:44:08');

-- --------------------------------------------------------

--
-- Table structure for table `subdomains`
--

CREATE TABLE `subdomains` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `full_domain` varchar(255) NOT NULL,
  `doc_root` varchar(255) NOT NULL,
  `status` enum('active','inactive','suspended','expired') NOT NULL DEFAULT 'active',
  `storage_override_mb` int(10) UNSIGNED DEFAULT NULL COMMENT 'Per-subdomain custom storage quota (MB). Overrides the plan quota if set.',
  `git_url` varchar(255) DEFAULT NULL,
  `git_branch` varchar(255) DEFAULT NULL,
  `git_token` text DEFAULT NULL,
  `git_last_commit` varchar(255) DEFAULT NULL,
  `git_connected_at` timestamp NULL DEFAULT NULL,
  `nodejs_version` varchar(255) NOT NULL DEFAULT '20',
  `nodejs_startup_file` varchar(255) NOT NULL DEFAULT 'server.js',
  `nodejs_mode` varchar(255) NOT NULL DEFAULT 'production',
  `expired_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subdomains`
--

INSERT INTO `subdomains` (`id`, `user_id`, `name`, `full_domain`, `doc_root`, `status`, `storage_override_mb`, `git_url`, `git_branch`, `git_token`, `git_last_commit`, `git_connected_at`, `nodejs_version`, `nodejs_startup_file`, `nodejs_mode`, `expired_at`, `created_at`, `updated_at`, `deleted_at`) VALUES
(1, 9, 'yatikeren', 'yatikeren.subly.my.id', '/home/sublymyi/client/yatikeren.subly.my.id', 'inactive', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-04-27 16:00:16', '2026-03-27 16:07:26', '2026-06-01 06:26:59', '2026-06-01 06:26:59'),
(4, 2, 'testingg', 'testingg.subly.my.id', '/public_html/testingg', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-04-28 07:09:21', '2026-03-28 07:09:21', '2026-05-18 15:45:38', '2026-05-18 15:45:38'),
(5, 2, 'labib', 'labib.subly.my.id', '/home/sublymyi/client/labib', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 02:36:32', '2026-05-19 02:36:32', '2026-05-19 03:12:13', '2026-05-19 03:12:13'),
(6, 2, 'siplah', 'siplah.subly.my.id', '/home/sublymyi/client/siplah', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 03:12:52', '2026-05-19 03:12:52', '2026-05-19 03:17:10', '2026-05-19 03:17:10'),
(7, 2, 'lovable', 'lovable.subly.my.id', '/home/sublymyi/client/lovable', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 03:19:30', '2026-05-19 03:19:30', '2026-05-19 03:43:27', '2026-05-19 03:43:27'),
(8, 2, 'runer', 'runer.subly.my.id', '/home/sublymyi/client/runer', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 03:44:57', '2026-05-19 03:44:57', '2026-05-19 03:55:12', '2026-05-19 03:55:12'),
(9, 2, 'terbaru', 'terbaru.subly.my.id', '/home/sublymyi/client/terbaru', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 03:56:26', '2026-05-19 03:56:26', '2026-05-19 03:58:30', '2026-05-19 03:58:30'),
(10, 2, 'terserah', 'terserah.subly.my.id', '/home/sublymyi/client/terserah', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 03:58:46', '2026-05-19 03:58:46', '2026-05-19 04:02:20', '2026-05-19 04:02:20'),
(11, 2, 'huging', 'huging.subly.my.id', '/home/sublymyi/client/huging', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 04:13:14', '2026-05-19 04:13:14', '2026-05-19 04:20:14', '2026-05-19 04:20:14'),
(12, 2, 'ambyar', 'ambyar.subly.my.id', '/home/sublymyi/client/ambyar', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 04:22:45', '2026-05-19 04:22:45', '2026-05-19 04:25:11', '2026-05-19 04:25:11'),
(13, 2, 'ambyargas', 'ambyargas.subly.my.id', '/home/sublymyi/client/ambyargas', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 04:25:29', '2026-05-19 04:25:29', '2026-05-19 14:11:21', '2026-05-19 14:11:21'),
(14, 2, 'ambyarcek', 'ambyarcek.subly.my.id', '/home/sublymyi/client/ambyarcek', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 13:57:57', '2026-05-19 13:57:57', '2026-05-19 14:05:19', '2026-05-19 14:05:19'),
(15, 2, 'guser', 'guser.subly.my.id', '/home/sublymyi/client/guser', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-08-19 14:13:52', '2026-05-19 14:13:52', '2026-05-19 14:14:38', '2026-05-19 14:14:38'),
(16, 2, 'kerenabis', 'kerenabis.subly.my.id', '/home/sublymyi/client/kerenabis', 'active', 100, 'https://github.com/LabibAbdullah1/geo-json-app', 'main', NULL, '8edda32 - feat: initialize project structure with responsive layout and map view component styles', '2026-05-27 14:48:41', '20', 'server.js', 'production', '2026-08-21 15:21:10', '2026-05-21 15:21:10', '2026-06-01 08:03:55', '2026-06-01 08:03:55'),
(17, 9, 'backendmoneytorxixi', 'backendmoneytorxixi.subly.my.id', '/home/sublymyi/client/backendmoneytorxixi', 'active', NULL, 'https://github.com/Money-TOR/Capstone_MoneyTor/tree/yati', 'yati', NULL, '2fad0a8 - backend', '2026-06-02 14:08:12', '20', 'server.js', 'production', '2026-08-25 03:07:07', '2026-05-25 03:07:07', '2026-06-03 06:08:11', NULL),
(18, 2, 'runn-test', 'runn-test.subly.my.id', '/home/sublymyi/client/runn-test', 'active', NULL, NULL, NULL, NULL, NULL, NULL, '20', 'server.js', 'production', '2026-09-01 13:40:07', '2026-06-01 13:40:07', '2026-06-01 13:40:07', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `subdomain_envs`
--

CREATE TABLE `subdomain_envs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subdomain_id` bigint(20) UNSIGNED NOT NULL,
  `key` varchar(255) NOT NULL,
  `value` text NOT NULL,
  `is_secret` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `subdomain_envs`
--

INSERT INTO `subdomain_envs` (`id`, `subdomain_id`, `key`, `value`, `is_secret`, `created_at`, `updated_at`) VALUES
(47, 17, 'PORT', 'eyJpdiI6Ill0L3AzS0NBMnNnWjdPSkFCM1ptN1E9PSIsInZhbHVlIjoib0Y0YVA4d09WTkcwVmxaQ3BQRFpTUT09IiwibWFjIjoiNjM2NDgxNWM0NGExYWNjZTEyY2NjZDhjZjM2YjI2MzYwYWZlNTdjNTZlYmE1OWY3MzczYmRiMzIxMTEyZGQ5MyIsInRhZyI6IiJ9', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(48, 17, 'DB_HOST', 'eyJpdiI6Ik9kdXNYRGZnS2dkQjk5dTdlekl0WXc9PSIsInZhbHVlIjoiTlJhMk1ZdWhWT2VvQ1NDVCtQNE1jZz09IiwibWFjIjoiYjNkMDhiZThjZDFkYjQ1MjdmZGIwYWNkNjc4MmQ2NTg3MWZlMjU2YWI2NTA3ZGUxZWM2MzY4NTEwZmEwMTM2NSIsInRhZyI6IiJ9', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(49, 17, 'DB_USER', 'eyJpdiI6InpwWlRKR1lmeUR6S1MwQkp1RVQzeVE9PSIsInZhbHVlIjoiR2wzNTFQMGZLZFZMc2hnemZXanhpdz09IiwibWFjIjoiNWEwMGNlMjc5N2FjZmQxNjgzODMzY2I1OGNkZmJkMzA4MTMwY2Y3NDlkOTU5ZDZmNzVmMDg3NTNjNjJjYTkxNyIsInRhZyI6IiJ9', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(50, 17, 'DB_PASS', 'eyJpdiI6IkF0d1Y2Y1JEM29kMFdXZ3FETTZQWVE9PSIsInZhbHVlIjoicVBYdXFDTGdNSDIvNzJzN3BVbnYwQT09IiwibWFjIjoiNjE0OGQ5ZThhMDI4NTNlOGNlNzliOTE3ZjRlMWM5NDg5MDUyZjBhYmIxYjM2MDI3MTMzZTU2YmFiNjQwZDE0NiIsInRhZyI6IiJ9', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(51, 17, 'DB_NAME', 'eyJpdiI6IlNiUGtqNWhFVGhYY3N4NzM3UG9Jd2c9PSIsInZhbHVlIjoidXNaMXlxVytYeDZsM0F5ZmNqenVFZz09IiwibWFjIjoiMTgwNzA2ZDA2YTI4ZWQ3ZjNjMmZmYjBkYzg1YmJiZmZhYmUxNDZkZGY1YzViNTJkNzAyZTg0M2I3YTkxNGY5YiIsInRhZyI6IiJ9', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(52, 17, 'JWT_SECRET', 'eyJpdiI6IjkwVVdUODBsMlV5THUwbWJvR2orT3c9PSIsInZhbHVlIjoiNTgvOFRka2tES0NGMzBBWEswb2dTaVRTbzRPdEI1ODZrYnAyTlBIRTRHQT0iLCJtYWMiOiJhNzAyNDBiM2JkYmQxY2JjMDU5MTYzZDFmOTE5Y2Q5MWYwMWVjODAxYjdlNjU5NzYwMWU5NzliNWZjNTAzMmMxIiwidGFnIjoiIn0=', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(53, 17, 'JWT_EXPIRES_IN', 'eyJpdiI6IlFPSzI0TU5XN09zdGE0VGJLeW9QS1E9PSIsInZhbHVlIjoiRHNNb2xROVBOVUtVZ0NEZ1ZpM1F5dz09IiwibWFjIjoiOGIzNWU2MWYzOWIyY2FiOTY1OWQ4M2EyZjBiYmMzOTgwNGU5ZDExNTZmMjM5MGQwMzVkYjg3NThiMDg3MWVmNSIsInRhZyI6IiJ9', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(54, 17, 'API_KEY', 'eyJpdiI6ImxPd3dHOFFSMXBXbytCMEcyejFGR3c9PSIsInZhbHVlIjoia3Z2T2N5U3F0OFN5RlVQaVRNK1VQejdFRWxLZnVkek9EME5NdVJFUW9tOVZhZnpsWFZqc2dxZEtzd0krRmFkdCIsIm1hYyI6ImUxZmEwNzViOGUzNWQ2ODFkM2FkZDBjNDNiYmFjNzM2MjM5NjhiNTNlNTdhMjViOGMxNzExYTg2NTQ1NTVjNWIiLCJ0YWciOiIifQ==', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(55, 17, 'AI_SERVICE_URL', 'eyJpdiI6IkxydmRQMjBwNkt0RGhqSDBhRExsVWc9PSIsInZhbHVlIjoiU2FJS245TktQTG43U0VRMVJ0eE5xaFhTZ05aOEZYUnhvWGZyd2h0WnozWXFadHpTaHk2S3lZaStUK1A3OFZJMFVnQk9oZzRNQlFMQWp5Tk9TZ3FzUnc9PSIsIm1hYyI6ImJkNDI0MmZlMzU2Y2FjYTJmNzJjYWVlYjYwY2E1MTgyN2ZlNTI1N2M4ODg3NmRjNTgwMjBmYzkwNmQzYmFhMDciLCJ0YWciOiIifQ==', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(56, 17, 'RECOMMENDATION_SERVICE_URL', 'eyJpdiI6InM1ek40NUNyNjFNREpsQVZnSmZzb0E9PSIsInZhbHVlIjoiSGswRmVrZ1pYY3ZJcnRMakZCTVpwbFBibG5QVVJFTlFRMlBULzZsanpQOWhSekFnRy9ZNFJPckVYaUF6Y3krMU43VTdBU3V6ZURaRTc4NmFwaEFFd1E9PSIsIm1hYyI6IjU0NmEyNzRkOGMyNTFjNGE2MDFmOWY1NDYzMmM2MWFhYWFkZjA4YmQzZTBjYzJmN2IyNzIxM2FjN2IzNmViZGQiLCJ0YWciOiIifQ==', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19'),
(57, 17, 'PREDICTION_SERVICE_URL', 'eyJpdiI6IlVrdEZ4NHl4ZmY4K3pJNGdyZ0Q0eWc9PSIsInZhbHVlIjoiVzVZNXk1blg0Wm5zaDNpeFNGTldidTBZdTBGcHBxSXFpbGhDTnVKZjBpT2JRT2wwMTZ6N0QraEpJVDFURHJUTUZzU3oxdFd2bE8xQnFTSEZ4WnkyZEE9PSIsIm1hYyI6IjQ0YzUwYWVkM2Y3ZDcxMDY5MDU5ZTc2ZTQyODE1YTFmZjQ3ZTM3MDI5Njg5YTA4Yjk3MTYyOGU0ODVjZmFjM2UiLCJ0YWciOiIifQ==', 0, '2026-06-02 14:08:19', '2026-06-02 14:08:19');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `email_verified_at` timestamp NULL DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('Admin','Client') NOT NULL DEFAULT 'Client',
  `remember_token` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL,
  `last_seen_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `email_verified_at`, `password`, `role`, `remember_token`, `created_at`, `updated_at`, `deleted_at`, `last_seen_at`) VALUES
(1, 'Administrator', 'admin@subly.my.id', '2026-03-10 18:58:20', '$2y$12$nRcgkLzM1EsN23HHII4pfehnIrUEXZZCk9rP8gEUoezEvQ84t5p3.', 'Admin', 'asysvQ6HcvJKHoWBA4P13yXl20yBmlP4H4Oek7lBwWae5msXuBxsaga9IBj6', '2026-03-10 18:58:34', '2026-06-03 06:08:13', NULL, '2026-06-03 06:08:13'),
(2, 'Labib Abdullah', 'labibabdullahhasan@gmail.com', '2026-03-10 19:01:16', '$2y$12$a4OGfyuLV28cMllD4v3em.YzBekcYManInLnjN4MPup8UJw7LOMVG', 'Client', NULL, '2026-03-10 19:01:16', '2026-06-01 14:03:14', NULL, '2026-06-01 14:03:14'),
(4, 'david', 'david_greeley@yahoo.com', '2026-03-16 07:16:12', '$2y$12$rdtkgceZaPi.nySmSFsCmeD8QV7YGGom.r/5gGnquT7CI/fw2n3u.', 'Client', NULL, '2026-03-13 08:11:59', '2026-03-13 08:14:00', NULL, '2026-03-13 08:14:00'),
(5, 'Labib Ada', 'labibabdullahada@gmail.com', '2026-03-16 07:52:43', '$2y$12$YU5yoq33y3wHqUbRLAnWk.V2nq.p80IrZw7oZHpHAJVQvaApEpTk2', 'Client', NULL, '2026-03-16 07:17:56', '2026-03-16 07:53:21', '2026-03-16 07:53:21', '2026-03-16 07:53:03'),
(6, 'mayar', 'mayar@gmail.com', NULL, '$2y$12$uwIcT79RU57VB4zxPHpIouSEkC1QkK5kSBEY.H3a0ie.7v0exYtEG', 'Client', NULL, '2026-03-17 11:26:40', '2026-04-06 03:40:17', '2026-04-06 03:40:17', '2026-03-17 11:26:42'),
(7, 'Labib', 'labibcintaibu@gmail.com', '2026-03-19 10:58:38', '$2y$12$QkOZtTzSowyCAXbQ4DYwM.wmrQ6nzYsNBaUdU.cK5xCVkUeKBQuli', 'Client', NULL, '2026-03-19 10:58:19', '2026-04-04 16:17:42', '2026-04-04 16:17:42', '2026-03-19 10:58:44'),
(8, 'MidtransTester', 'tester@subly.my.id', '2026-03-22 04:55:44', '$2y$12$VxjgFUBvIJ6bv0Q1kEgAluNaxrEVdEiMzgXxEql8mCcYGZx9wm9Sa', 'Client', 'x2aB1WjKCKD3mVgYTobpGnb6iARSy5ybfplDuDOON1g5NYNzx2yP0OK7pGDT', '2026-03-22 04:55:44', '2026-03-26 02:23:17', NULL, '2026-03-26 02:23:17'),
(9, 'Nurwahdayati', 'wahdayatinur@gmail.com', '2026-03-27 04:11:32', '$2y$12$fsuubCtm9udF38gNvQkpFuq4b2lCsGjyPpPiCPigb8ngs.81EaM36', 'Client', NULL, '2026-03-27 04:09:54', '2026-06-03 01:50:38', NULL, '2026-06-03 01:50:38'),
(10, 'John Smith', 'diwetej710@exahut.com', '2026-03-29 06:40:08', '$2y$12$Xe4Omo7gMNtssj4KNipgx.zLUljgTUo5IhAIds3ScjpQWomuC0i26', 'Client', NULL, '2026-03-29 06:39:31', '2026-03-29 06:55:08', NULL, '2026-03-29 06:55:08'),
(11, 'Refaldi Julidinsyah', 'syahrefaldi@gmail.com', NULL, '$2y$12$eELz9nGGNkkyTA8pka9qJOJxaxKyO1uwjNp4UQWRpfCyeC1CZD3IG', 'Client', NULL, '2026-04-06 07:31:34', '2026-04-06 07:35:14', '2026-04-06 07:35:14', NULL),
(12, 'Refaldi Julidinsyah', 'epalsyah17@gmail.com', NULL, '$2y$12$FlnhaqhoZ1.Tykq.RYRjvuH80ld9viEsHnrI9btmbiYdP1VLFI2fa', 'Client', NULL, '2026-04-06 07:32:16', '2026-04-06 07:38:16', '2026-04-06 07:38:16', NULL),
(13, 'Refaldi Julidinsyah', 'syahrefaldi@subly.my.id', '2026-04-06 07:37:18', '$2y$12$KYpASC4dTkqS2y7TIFg84OCKnLarP0RMFl7Nb8PihUo/JeNX2Jq4i', 'Client', NULL, '2026-04-06 07:37:18', '2026-04-06 07:42:15', NULL, '2026-04-06 07:42:15'),
(14, 'restu rosaria', 'restuuugultommmniii@gmai.com', NULL, '$2y$12$rxDSGQ9VyYzy5nI6kuRjLuqC8C/LkhJ2om7kI4ADUuMR3grgxn8BC', 'Client', NULL, '2026-04-09 02:42:46', '2026-04-18 09:31:29', '2026-04-18 09:31:29', '2026-04-09 02:43:37'),
(15, 'restu rosaria', 'restuuugultommmniii@gmail.com', '2026-04-09 02:44:34', '$2y$12$/OqK81HrUlZkEpvbniERkObtAvbJ9ImCB3SP8Rp2DFMgN6b5xkGrq', 'Client', NULL, '2026-04-09 02:44:14', '2026-04-09 03:40:17', NULL, '2026-04-09 03:40:17'),
(16, 'Starligt Princes', 'sprinces407@gmail.com', '2026-05-27 23:47:58', '$2y$12$Cwj4HQcvstQwq6YN9YjQiuQRI/1brO.0Vn4VoeLnwPU2KgJEhmj1.', 'Client', NULL, '2026-05-27 23:47:42', '2026-05-27 23:47:58', NULL, '2026-05-27 23:47:58');

-- --------------------------------------------------------

--
-- Table structure for table `user_databases`
--

CREATE TABLE `user_databases` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `subdomain_id` bigint(20) UNSIGNED NOT NULL,
  `db_name` varchar(255) NOT NULL,
  `db_user` varchar(255) NOT NULL,
  `db_password` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `user_databases`
--

INSERT INTO `user_databases` (`id`, `subdomain_id`, `db_name`, `db_user`, `db_password`, `created_at`, `updated_at`, `deleted_at`) VALUES
(2, 5, 'sublymyi_bv6no6w0', 'sublymyi_h8h6kwhd', 'eyJpdiI6IlovQjBYQ2JjSHFkSjMyeGsxMUFhVVE9PSIsInZhbHVlIjoieHRBUkRuV2JZNU16UW5qSlhsUGpub2Z5ZUhXcjFaSW5wczV6QmNsQUc3MD0iLCJtYWMiOiJhMjRiMDVlZmVkYmQwZTMxYjc0Mjg4N2U4ZjM1ODgwNmVmMGJiZTJiYWY3OWFlYWE0OWQ2ZDRkYTA2OTlkNjM1IiwidGFnIjoiIn0=', '2026-05-19 02:36:32', '2026-05-19 02:36:32', NULL),
(3, 6, 'sublymyi_xdiquvzm', 'sublymyi_ukflvbnr', 'eyJpdiI6InM4akRidmRMSE42TDU0dU5lQjJUcmc9PSIsInZhbHVlIjoiUGgwN01hbzNHR2Rtb0lQL3BrMWZxb1JQanB3WHV5bkljRGx1ZU9KR1RhUT0iLCJtYWMiOiJmMjg0YjJlZTlhMTUzYTUxNGY5ZDM4NDk1MmZhZDcyYTMwZmI5ZTllODkyOTdkYjQzODcyN2Y5MzgxNTZmMmJlIiwidGFnIjoiIn0=', '2026-05-19 03:12:52', '2026-05-19 03:12:52', NULL),
(4, 7, 'sublymyi_yl1hno27', 'sublymyi_b3lkgjmy', 'eyJpdiI6ImpqU3hsd0NLNlYxYUlZaGdDRDRNRlE9PSIsInZhbHVlIjoiN1hrQUlzcG9SSUlNVXVYVnhJY1FJbDhmN1JMdktnV2NKN0hHUDkwczN4Zz0iLCJtYWMiOiI3ZjVkMmYxYzU4MzZkNjIyNDdjNDU2NTEzNjdjNDIxN2RkMmJmNjZhZjljYTYzMDFmNzkzM2IyNzdhN2JmNzBiIiwidGFnIjoiIn0=', '2026-05-19 03:19:30', '2026-05-19 03:19:30', NULL),
(5, 8, 'sublymyi_gqeoq4pq', 'sublymyi_bdxpbao2', 'eyJpdiI6InpsZTFKQ3ZjclFwblVsU0gwRC83L2c9PSIsInZhbHVlIjoiSkZsNDEySUtmRzl2NlBINGVQaDJuV2ZHR2RxZ2dXOGhzVS9XdGdPQ2IzQT0iLCJtYWMiOiJiNGZmMjExOTcyY2U0ZDM0NjAwYTBlMTlkZmFhZmY5YjVkYzM1M2I2NzNlNGM3MjNjNDI2MzIyYWNiNzAxYjA0IiwidGFnIjoiIn0=', '2026-05-19 03:44:57', '2026-05-19 03:44:57', NULL),
(6, 9, 'sublymyi_yvz6mnkj', 'sublymyi_wbtohpbm', 'eyJpdiI6Ik93MEs2VmFrcEFJMW1TU3lISzgxTWc9PSIsInZhbHVlIjoiaFNpTW5yOU5lZUUvaUNuampmYjlFRG92aXJYZnl3TEhSY3NOdFFQbHlrUT0iLCJtYWMiOiIwYTk4ZGNlMDMyMGM3MDYyNTRjMDhmODY0YTEwN2U4ZTcxNWQ2MjI0NzEyNzIyNjFhYmMwNTM4OWFiNDhhYTU0IiwidGFnIjoiIn0=', '2026-05-19 03:56:26', '2026-05-19 03:56:26', NULL),
(7, 10, 'sublymyi_rxrwtxwo', 'sublymyi_d1mlhikv', 'eyJpdiI6InlrOWdmbUMwdGp1OTdpVThsM2hiNGc9PSIsInZhbHVlIjoiVGdaSmgzci9ObVNMU01aNG1SQndCL1V5RCtBVWVZSUJ1MGVmNm14R1NwWT0iLCJtYWMiOiI4NGRjYzNhNGVjODE3YWM0OTJkN2I4MGFjNzUyOWMyZjk1MzU2YmFkMjQzZDZhNTU4YTc5OGZkNzYwNDRhNmRhIiwidGFnIjoiIn0=', '2026-05-19 03:58:46', '2026-05-19 03:58:46', NULL),
(8, 11, 'sublymyi_wqg6ao82', 'sublymyi_yoqqzkrx', 'eyJpdiI6IkVtNllOM0YxUWdnTlJXeGRVTUpnSlE9PSIsInZhbHVlIjoiL2JGZ2ErVHJlblJUakdXMEFyZEJzcTUxWUFsTDEzSWtNazBMMCswUkg0VT0iLCJtYWMiOiI2NDhiNTliYTQ5NGUyZjlmMmQwMjkxOTgwMGIyNTM4NjNjZTYxNjc5NTk0Y2NkODM4NDI2NzIzOWVlYWE1MjA2IiwidGFnIjoiIn0=', '2026-05-19 04:13:14', '2026-05-19 04:13:14', NULL),
(9, 12, 'sublymyi_s2e9xdry', 'sublymyi_cbmxbzjh', 'eyJpdiI6ImlvSXdiVXpiVmlBRFplSHhGVlJhVkE9PSIsInZhbHVlIjoiTWxveDhKU1lXSzdLb0tMdlFJeTN1a3RVUENFRHdENVNlV3dreUZSSWp1dz0iLCJtYWMiOiIwYzI5ZDQwMDc5MTc5NGYwNDYxOTM0MDBjYTgwOTNkNGZjNzhhNWQ2ZWM2MTZiNzE5ZTFhOTBjZjllMjQ4ZTYzIiwidGFnIjoiIn0=', '2026-05-19 04:22:45', '2026-05-19 04:40:35', '2026-05-19 04:40:35'),
(14, 17, 'sublymyi_sbkgfsqh', 'sublymyi_nurwahdayati', 'eyJpdiI6InV4c1R3dXluT3dqRUo0L3NsOU5vSWc9PSIsInZhbHVlIjoicVVWNXBzbktnSHNOZjlEMXoxWkVQZz09IiwibWFjIjoiMGFkODQ5Yzg3MjgzYmZlNjQ0YTI2YjRlNWZmMGE5NTkwOWNhM2NiNmJhODY0N2Q0NjgxNzg0ZWNiMTFkNmM2NCIsInRhZyI6IiJ9', '2026-05-25 03:07:07', '2026-05-25 03:07:07', NULL),
(15, 18, 'sublymyi_5cahsjkc', 'sublymyi_rig30svg', 'eyJpdiI6IkRCMWhGOHUrY256b25MODYyVmJ1b2c9PSIsInZhbHVlIjoiMDZ4U2FBQ0N2VGliZkdWNCsrcE9Hb0dFS1RjL09GMk9jcE9nejlmU3R4MD0iLCJtYWMiOiIwZDMwZjYxMmMyZmVkOTViYjc2ZDhjMzY0ZTU2MzQ2YWM4NzkxMjk1ZjZhYjdjMTQwMTEwODkzNjdhNjkxN2EzIiwidGFnIjoiIn0=', '2026-06-01 13:40:07', '2026-06-01 13:40:07', NULL);

-- --------------------------------------------------------

--
-- Table structure for table `vouchers`
--

CREATE TABLE `vouchers` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(255) NOT NULL,
  `type` enum('fixed','percent') NOT NULL,
  `reward_amount` decimal(10,2) NOT NULL,
  `usage_limit` int(11) DEFAULT NULL,
  `expires_at` timestamp NULL DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT NULL,
  `updated_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `vouchers`
--

INSERT INTO `vouchers` (`id`, `code`, `type`, `reward_amount`, `usage_limit`, `expires_at`, `created_at`, `updated_at`) VALUES
(6, 'ambyar1', 'percent', 100.00, 3, '2026-06-05 17:00:00', '2026-05-19 03:55:51', '2026-06-01 13:39:44');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `cache`
--
ALTER TABLE `cache`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_expiration_index` (`expiration`);

--
-- Indexes for table `cache_locks`
--
ALTER TABLE `cache_locks`
  ADD PRIMARY KEY (`key`),
  ADD KEY `cache_locks_expiration_index` (`expiration`);

--
-- Indexes for table `chats`
--
ALTER TABLE `chats`
  ADD PRIMARY KEY (`id`),
  ADD KEY `chats_user_id_foreign` (`user_id`);

--
-- Indexes for table `deployments`
--
ALTER TABLE `deployments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `deployments_subdomain_id_foreign` (`subdomain_id`);

--
-- Indexes for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `failed_jobs_uuid_unique` (`uuid`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`),
  ADD KEY `feedback_user_id_foreign` (`user_id`),
  ADD KEY `feedback_plan_id_foreign` (`plan_id`);

--
-- Indexes for table `jobs`
--
ALTER TABLE `jobs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `jobs_queue_index` (`queue`);

--
-- Indexes for table `job_batches`
--
ALTER TABLE `job_batches`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `migrations`
--
ALTER TABLE `migrations`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `notifications_notifiable_type_notifiable_id_index` (`notifiable_type`,`notifiable_id`);

--
-- Indexes for table `password_reset_tokens`
--
ALTER TABLE `password_reset_tokens`
  ADD PRIMARY KEY (`email`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD KEY `payments_user_id_foreign` (`user_id`),
  ADD KEY `payments_plan_id_foreign` (`plan_id`),
  ADD KEY `payments_voucher_id_foreign` (`voucher_id`),
  ADD KEY `payments_subdomain_id_foreign` (`subdomain_id`);

--
-- Indexes for table `plans`
--
ALTER TABLE `plans`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `reports`
--
ALTER TABLE `reports`
  ADD PRIMARY KEY (`id`),
  ADD KEY `reports_user_id_foreign` (`user_id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `sessions_user_id_index` (`user_id`),
  ADD KEY `sessions_last_activity_index` (`last_activity`);

--
-- Indexes for table `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `settings_key_unique` (`key`);

--
-- Indexes for table `subdomains`
--
ALTER TABLE `subdomains`
  ADD PRIMARY KEY (`id`),
  ADD KEY `subdomains_user_id_foreign` (`user_id`);

--
-- Indexes for table `subdomain_envs`
--
ALTER TABLE `subdomain_envs`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `subdomain_envs_subdomain_id_key_unique` (`subdomain_id`,`key`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `users_email_unique` (`email`);

--
-- Indexes for table `user_databases`
--
ALTER TABLE `user_databases`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_databases_subdomain_id_foreign` (`subdomain_id`);

--
-- Indexes for table `vouchers`
--
ALTER TABLE `vouchers`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `vouchers_code_unique` (`code`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `chats`
--
ALTER TABLE `chats`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `deployments`
--
ALTER TABLE `deployments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `failed_jobs`
--
ALTER TABLE `failed_jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `jobs`
--
ALTER TABLE `jobs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `migrations`
--
ALTER TABLE `migrations`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=36;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=38;

--
-- AUTO_INCREMENT for table `plans`
--
ALTER TABLE `plans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=5;

--
-- AUTO_INCREMENT for table `reports`
--
ALTER TABLE `reports`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `settings`
--
ALTER TABLE `settings`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `subdomains`
--
ALTER TABLE `subdomains`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=19;

--
-- AUTO_INCREMENT for table `subdomain_envs`
--
ALTER TABLE `subdomain_envs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=58;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=17;

--
-- AUTO_INCREMENT for table `user_databases`
--
ALTER TABLE `user_databases`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=16;

--
-- AUTO_INCREMENT for table `vouchers`
--
ALTER TABLE `vouchers`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `chats`
--
ALTER TABLE `chats`
  ADD CONSTRAINT `chats_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `deployments`
--
ALTER TABLE `deployments`
  ADD CONSTRAINT `deployments_subdomain_id_foreign` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `feedback_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `feedback_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `payments_plan_id_foreign` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_subdomain_id_foreign` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `payments_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `payments_voucher_id_foreign` FOREIGN KEY (`voucher_id`) REFERENCES `vouchers` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `reports`
--
ALTER TABLE `reports`
  ADD CONSTRAINT `reports_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subdomains`
--
ALTER TABLE `subdomains`
  ADD CONSTRAINT `subdomains_user_id_foreign` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `subdomain_envs`
--
ALTER TABLE `subdomain_envs`
  ADD CONSTRAINT `subdomain_envs_subdomain_id_foreign` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `user_databases`
--
ALTER TABLE `user_databases`
  ADD CONSTRAINT `user_databases_subdomain_id_foreign` FOREIGN KEY (`subdomain_id`) REFERENCES `subdomains` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
