<?php
// Chargement minimal de variables d'environnement à partir de .env
function loadEnv(string $path): array {
	$vars = [];
	if (!file_exists($path)) return $vars;
	$lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
	foreach ($lines as $line) {
		if (str_starts_with(trim($line), '#')) continue;
		[$key, $val] = array_pad(explode('=', $line, 2), 2, null);
		if ($key !== null && $val !== null) {
			$vars[$key] = $val;
		}
	}
	return $vars;
}

function env(string $key, ?string $default = null): ?string {
	static $cache = null;
	if ($cache === null) {
		$cache = loadEnv(__DIR__ . '/../.env');
		// fallback à .env.example si .env absent
		$example = loadEnv(__DIR__ . '/../.env.example');
		$cache = array_merge($example, $cache);
	}
	return $cache[$key] ?? $default;
}