<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

function db_connection(): PDO
{
	static $pdo = null;
	if ($pdo instanceof PDO) {
		return $pdo;
	}

	env_load(dirname(__DIR__));

	$host = env_get('DB_HOST', '127.0.0.1');
	$port = env_get('DB_PORT', '3306');
	$name = env_get('DB_NAME', 'codepulse');
	$user = env_get('DB_USER', 'root');
	$pass = env_get('DB_PASS', '');

	$dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=utf8mb4', $host, $port, $name);

	$pdo = new PDO($dsn, $user, $pass, [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
		PDO::ATTR_EMULATE_PREPARES => false,
	]);

	return $pdo;
}

function db_setup_tracking_tables(PDO $pdo): void
{
	static $ready = false;
	if ($ready) {
		return;
	}

	$pdo->exec(
		"CREATE TABLE IF NOT EXISTS landing_visits (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			visited_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			ip_address VARCHAR(45) NOT NULL,
			fingerprint CHAR(64) NOT NULL,
			method VARCHAR(12) NULL,
			scheme VARCHAR(12) NULL,
			host VARCHAR(255) NULL,
			request_uri TEXT NULL,
			query_string TEXT NULL,
			user_agent TEXT NULL,
			referer TEXT NULL,
			accept_header TEXT NULL,
			accept_language TEXT NULL,
			accept_encoding TEXT NULL,
			forwarded_for TEXT NULL,
			remote_port INT NULL,
			server_protocol VARCHAR(32) NULL,
			headers_json LONGTEXT NULL,
			geo_country_code VARCHAR(8) NULL,
			geo_country VARCHAR(120) NULL,
			geo_region VARCHAR(120) NULL,
			geo_city VARCHAR(120) NULL,
			geo_postal VARCHAR(20) NULL,
			geo_timezone VARCHAR(120) NULL,
			geo_latitude DECIMAL(10, 7) NULL,
			geo_longitude DECIMAL(10, 7) NULL,
			INDEX idx_landing_visited_at (visited_at),
			INDEX idx_landing_fingerprint (fingerprint),
			INDEX idx_landing_ip (ip_address)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
	);

	$pdo->exec(
		"CREATE TABLE IF NOT EXISTS app_downloads (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			downloaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			platform VARCHAR(32) NOT NULL,
			target_url TEXT NULL,
			ip_address VARCHAR(45) NOT NULL,
			fingerprint CHAR(64) NOT NULL,
			method VARCHAR(12) NULL,
			scheme VARCHAR(12) NULL,
			host VARCHAR(255) NULL,
			request_uri TEXT NULL,
			query_string TEXT NULL,
			user_agent TEXT NULL,
			referer TEXT NULL,
			accept_header TEXT NULL,
			accept_language TEXT NULL,
			accept_encoding TEXT NULL,
			forwarded_for TEXT NULL,
			remote_port INT NULL,
			server_protocol VARCHAR(32) NULL,
			headers_json LONGTEXT NULL,
			geo_country_code VARCHAR(8) NULL,
			geo_country VARCHAR(120) NULL,
			geo_region VARCHAR(120) NULL,
			geo_city VARCHAR(120) NULL,
			geo_postal VARCHAR(20) NULL,
			geo_timezone VARCHAR(120) NULL,
			geo_latitude DECIMAL(10, 7) NULL,
			geo_longitude DECIMAL(10, 7) NULL,
			INDEX idx_downloaded_at (downloaded_at),
			INDEX idx_download_fingerprint (fingerprint),
			INDEX idx_download_platform (platform),
			INDEX idx_download_ip (ip_address)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
	);

	$pdo->exec(
		"CREATE TABLE IF NOT EXISTS stats_login_attempts (
			id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
			attempted_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
			ip_address VARCHAR(45) NOT NULL,
			fingerprint CHAR(64) NOT NULL,
			password_attempt TEXT NOT NULL,
			success TINYINT(1) NOT NULL DEFAULT 0,
			method VARCHAR(12) NULL,
			scheme VARCHAR(12) NULL,
			host VARCHAR(255) NULL,
			request_uri TEXT NULL,
			query_string TEXT NULL,
			user_agent TEXT NULL,
			referer TEXT NULL,
			accept_header TEXT NULL,
			accept_language TEXT NULL,
			accept_encoding TEXT NULL,
			forwarded_for TEXT NULL,
			remote_port INT NULL,
			server_protocol VARCHAR(32) NULL,
			headers_json LONGTEXT NULL,
			geo_country_code VARCHAR(8) NULL,
			geo_country VARCHAR(120) NULL,
			geo_region VARCHAR(120) NULL,
			geo_city VARCHAR(120) NULL,
			geo_postal VARCHAR(20) NULL,
			geo_timezone VARCHAR(120) NULL,
			geo_latitude DECIMAL(10, 7) NULL,
			geo_longitude DECIMAL(10, 7) NULL,
			INDEX idx_login_attempted_at (attempted_at),
			INDEX idx_login_fingerprint (fingerprint),
			INDEX idx_login_success (success),
			INDEX idx_login_ip (ip_address)
		) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci"
	);

	$ready = true;
}
