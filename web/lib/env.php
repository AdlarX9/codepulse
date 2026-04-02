<?php

declare(strict_types=1);

function env_load(string $baseDir): void
{
	static $loaded = false;
	if ($loaded) {
		return;
	}

	$envPath = rtrim($baseDir, '/\\') . '/.env';
	if (!is_readable($envPath)) {
		$loaded = true;
		return;
	}

	$lines = file($envPath, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
	if ($lines === false) {
		$loaded = true;
		return;
	}

	foreach ($lines as $line) {
		$line = trim($line);
		if ($line === '' || str_starts_with($line, '#')) {
			continue;
		}

		$parts = explode('=', $line, 2);
		if (count($parts) !== 2) {
			continue;
		}

		$key = trim($parts[0]);
		$value = trim($parts[1]);
		if ($key === '') {
			continue;
		}

		if ((str_starts_with($value, '"') && str_ends_with($value, '"')) || (str_starts_with($value, "'") && str_ends_with($value, "'"))) {
			$value = substr($value, 1, -1);
		}

		if (getenv($key) === false) {
			putenv($key . '=' . $value);
		}
		if (!array_key_exists($key, $_ENV)) {
			$_ENV[$key] = $value;
		}
	}

	$loaded = true;
}

function env_get(string $key, ?string $default = null): ?string
{
	$value = $_ENV[$key] ?? getenv($key);
	if ($value === false || $value === null || $value === '') {
		return $default;
	}

	return (string) $value;
}
