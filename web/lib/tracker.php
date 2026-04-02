<?php

declare(strict_types=1);

require_once __DIR__ . '/db.php';

function tracker_get_headers(): array
{
	if (function_exists('getallheaders')) {
		$headers = getallheaders();
		if (is_array($headers)) {
			return $headers;
		}
	}

	$headers = [];
	foreach ($_SERVER as $key => $value) {
		if (!is_string($value)) {
			continue;
		}
		if (!str_starts_with($key, 'HTTP_')) {
			continue;
		}

		$name = str_replace(' ', '-', ucwords(strtolower(str_replace('_', ' ', substr($key, 5)))));
		$headers[$name] = $value;
	}

	return $headers;
}

function tracker_client_ip(): string
{
	$candidates = [
		$_SERVER['HTTP_CF_CONNECTING_IP'] ?? null,
		$_SERVER['HTTP_X_REAL_IP'] ?? null,
		$_SERVER['HTTP_X_FORWARDED_FOR'] ?? null,
		$_SERVER['REMOTE_ADDR'] ?? null,
	];

	foreach ($candidates as $candidate) {
		if (!is_string($candidate) || trim($candidate) === '') {
			continue;
		}
		$parts = array_map('trim', explode(',', $candidate));
		foreach ($parts as $ip) {
			if (filter_var($ip, FILTER_VALIDATE_IP)) {
				return $ip;
			}
		}
	}

	return '0.0.0.0';
}

function tracker_can_geolocate(string $ip): bool
{
	if (!filter_var($ip, FILTER_VALIDATE_IP)) {
		return false;
	}

	return filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE) !== false;
}

function tracker_geo_lookup(string $ip): array
{
	if (!tracker_can_geolocate($ip)) {
		return [];
	}

	$context = stream_context_create([
		'http' => [
			'timeout' => 2,
			'ignore_errors' => true,
		],
	]);

	$json = @file_get_contents('https://ipwho.is/' . rawurlencode($ip), false, $context);

	// Debugging log
	error_log("tracker_geo_lookup called with IP: $ip, Response: $json");

	if (!is_string($json) || $json === '') {
		return [];
	}

	$payload = json_decode($json, true);
	if (!is_array($payload) || !($payload['success'] ?? false)) {
		return [];
	}

	return [
		'geo_country_code' => (string) ($payload['country_code'] ?? ''),
		'geo_country' => (string) ($payload['country'] ?? ''),
		'geo_region' => (string) ($payload['region'] ?? ''),
		'geo_city' => (string) ($payload['city'] ?? ''),
		'geo_postal' => (string) ($payload['postal'] ?? ''),
		'geo_timezone' => (string) ($payload['timezone']['id'] ?? ''),
		'geo_latitude' => isset($payload['latitude']) ? (float) $payload['latitude'] : null,
		'geo_longitude' => isset($payload['longitude']) ? (float) $payload['longitude'] : null,
	];
}

function tracker_collect_context(): array
{
	$headers = tracker_get_headers();
	$ip = tracker_client_ip();
	$userAgent = (string) ($_SERVER['HTTP_USER_AGENT'] ?? '');

	$context = [
		'ip_address' => $ip,
		'fingerprint' => hash('sha256', $ip . '|' . $userAgent),
		'method' => (string) ($_SERVER['REQUEST_METHOD'] ?? ''),
		'scheme' => (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http',
		'host' => (string) ($_SERVER['HTTP_HOST'] ?? ''),
		'request_uri' => (string) ($_SERVER['REQUEST_URI'] ?? ''),
		'query_string' => (string) ($_SERVER['QUERY_STRING'] ?? ''),
		'user_agent' => $userAgent,
		'referer' => (string) ($_SERVER['HTTP_REFERER'] ?? ''),
		'accept_header' => (string) ($_SERVER['HTTP_ACCEPT'] ?? ''),
		'accept_language' => (string) ($_SERVER['HTTP_ACCEPT_LANGUAGE'] ?? ''),
		'accept_encoding' => (string) ($_SERVER['HTTP_ACCEPT_ENCODING'] ?? ''),
		'forwarded_for' => (string) ($_SERVER['HTTP_X_FORWARDED_FOR'] ?? ''),
		'remote_port' => isset($_SERVER['REMOTE_PORT']) ? (int) $_SERVER['REMOTE_PORT'] : null,
		'server_protocol' => (string) ($_SERVER['SERVER_PROTOCOL'] ?? ''),
		'headers_json' => json_encode($headers, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
	];

	return array_merge($context, tracker_geo_lookup($ip));
}

function tracker_insert_event(string $table, array $context, array $extra = []): void
{
	$pdo = db_connection();
	db_setup_tracking_tables($pdo);

	$columns = array_keys(array_merge($context, $extra));
	$fields = implode(', ', $columns);
	$placeholders = implode(', ', array_map(static fn(string $col): string => ':' . $col, $columns));

	$sql = sprintf('INSERT INTO %s (%s) VALUES (%s)', $table, $fields, $placeholders);
	$stmt = $pdo->prepare($sql);

	foreach (array_merge($context, $extra) as $key => $value) {
		$stmt->bindValue(':' . $key, $value);
	}

	$stmt->execute();
}

function track_landing_visit(): void
{
	$scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '');
	$requestPath = (string) parse_url((string) ($_SERVER['REQUEST_URI'] ?? ''), PHP_URL_PATH);

	if (!in_array(basename($scriptName), ['index.php', ''], true) && $requestPath !== '/' && $requestPath !== '/index.php') {
		// Exclude stats.php from tracking
		if (basename($scriptName) === 'stats.php') {
			return;
		}
		return;
	}

	try {
		tracker_insert_event('landing_visits', tracker_collect_context());
	} catch (Throwable $exception) {
		// Never break the landing page when analytics storage fails.
	}
}

function track_download(string $platform, string $targetUrl): void
{
	try {
		tracker_insert_event('app_downloads', tracker_collect_context(), [
			'platform' => $platform,
			'target_url' => $targetUrl,
		]);
	} catch (Throwable $exception) {
		// Never block downloads because of analytics failures.
	}
}
