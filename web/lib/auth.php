<?php
require_once __DIR__ . '/env.php';
require_once __DIR__ . '/db.php';

function startSession(): void {
	if (session_status() === PHP_SESSION_NONE) {
		$secret = env('SESSION_SECRET', 'change-me');
		session_name('codepulse_sess');
		session_set_cookie_params([
			'lifetime' => 0,
			'path' => '/',
			'secure' => false,
			'httponly' => true,
			'samesite' => 'Lax',
		]);
		session_start();
		if (!isset($_SESSION['csrf'])) {
			$_SESSION['csrf'] = bin2hex(random_bytes(16));
		}
	}
}

function isAuthenticated(): bool {
	startSession();
	return !empty($_SESSION['user']);
}

function login(string $username, string $password): bool {
	startSession();
	$pdo = db();
	$stmt = $pdo->prepare('SELECT * FROM users WHERE username = ?');
	$stmt->execute([$username]);
	$user = $stmt->fetch();
	if ($user && password_verify($password, $user['password_hash'])) {
		$_SESSION['user'] = [ 'id' => $user['id'], 'username' => $user['username'] ];
		return true;
	}
	return false;
}

function logout(): void {
	startSession();
	$_SESSION = [];
	if (ini_get('session.use_cookies')) {
		$params = session_get_cookie_params();
		setcookie(session_name(), '', time() - 42000, $params['path'], $params['domain'], $params['secure'], $params['httponly']);
	}
	session_destroy();
}