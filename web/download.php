<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/env.php';
require_once __DIR__ . '/lib/tracker.php';

env_load(__DIR__);

$platform = strtolower(trim((string) ($_GET['platform'] ?? 'unknown')));
$allowed = ['macos', 'windows', 'debian', 'ubuntu'];
if (!in_array($platform, $allowed, true)) {
	$platform = 'unknown';
}

$defaultTarget = env_get('DOWNLOAD_BASE_URL', 'https://github.com/AdlarX9/codepulse/releases/latest');
$targetMap = [
	'macos' => env_get('DOWNLOAD_URL_MACOS', $defaultTarget),
	'windows' => env_get('DOWNLOAD_URL_WINDOWS', $defaultTarget),
	'debian' => env_get('DOWNLOAD_URL_DEBIAN', $defaultTarget),
	'ubuntu' => env_get('DOWNLOAD_URL_UBUNTU', $defaultTarget),
	'unknown' => $defaultTarget,
];

$targetUrl = $targetMap[$platform] ?? $defaultTarget;
track_download($platform, $targetUrl);

header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Location: ' . $targetUrl, true, 302);
exit;
