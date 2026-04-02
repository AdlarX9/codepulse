<?php

declare(strict_types=1);

require_once __DIR__ . '/env.php';

function auth_start_session(): void
{
	if (session_status() === PHP_SESSION_ACTIVE) {
		return;
	}

	$secure = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off');
	session_name('CODEPULSE_STATS');
	session_set_cookie_params([
		'lifetime' => 0,
		'path' => '/',
		'domain' => '',
		'secure' => $secure,
		'httponly' => true,
		'samesite' => 'Lax',
	]);
	session_start();
}

function auth_is_authenticated(): bool
{
	auth_start_session();
	return ($_SESSION['stats_auth'] ?? false) === true;
}

function auth_validate_password(string $input): bool
{
	env_load(dirname(__DIR__));

	$hash = env_get('STATS_PASSWORD_HASH');
	if ($hash !== null && $hash !== '') {
		return password_verify($input, $hash);
	}

	$plain = env_get('STATS_PASSWORD');
	if ($plain === null || $plain === '') {
		return false;
	}

	return hash_equals($plain, $input);
}

function auth_login(string $password): bool
{
	if (!auth_validate_password($password)) {
		return false;
	}

	auth_start_session();
	$_SESSION['stats_auth'] = true;
	$_SESSION['stats_auth_at'] = time();
	return true;
}

function auth_logout(): void
{
	auth_start_session();
	$_SESSION = [];
	if (ini_get('session.use_cookies')) {
		$params = session_get_cookie_params();
		setcookie(session_name(), '', time() - 3600, $params['path'], $params['domain'], (bool) $params['secure'], (bool) $params['httponly']);
	}
	session_destroy();
}
