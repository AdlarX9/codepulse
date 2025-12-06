<?php
require_once __DIR__ . '/env.php';

function db(): PDO {
	static $pdo = null;
	if ($pdo) return $pdo;
	$host = env('DB_HOST', 'localhost');
	$port = env('DB_PORT', '3306');
	$name = env('DB_NAME', 'codepulse');
	$user = env('DB_USER', 'codepulse');
	$pass = env('DB_PASS', 'secret');
	$dsn = "mysql:host=$host;port=$port;dbname=$name;charset=utf8mb4";
	$pdo = new PDO($dsn, $user, $pass, [
		PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
		PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
	]);
	return $pdo;
}

function ensureAdminUser(): void {
	$username = env('ADMIN_USER', 'admin');
	$password = env('ADMIN_PASS', 'admin');
	$pdo = db();
	$pdo->exec('CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, username VARCHAR(100) UNIQUE, password_hash VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
	$stmt = $pdo->prepare('SELECT id FROM users WHERE username = ?');
	$stmt->execute([$username]);
	if (!$stmt->fetch()) {
		$hash = password_hash($password, PASSWORD_DEFAULT);
		$ins = $pdo->prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)');
		$ins->execute([$username, $hash]);
	}
}

function initDownloadTables(): void {
	$pdo = db();
	$pdo->exec('CREATE TABLE IF NOT EXISTS download_events (id BIGINT AUTO_INCREMENT PRIMARY KEY, platform ENUM("mac","win","linux") NOT NULL, ip VARCHAR(64), user_agent VARCHAR(255), created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)');
	$pdo->exec('CREATE TABLE IF NOT EXISTS download_counts (platform ENUM("mac","win","linux") PRIMARY KEY, count BIGINT NOT NULL DEFAULT 0)');
	$pdo->exec("INSERT IGNORE INTO download_counts (platform, count) VALUES ('mac',0),('win',0),('linux',0)");
}