<?php
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/env.php';

initDownloadTables();

$platform = $_GET['platform'] ?? '';
$platform = strtolower($platform);
if (!in_array($platform, ['mac', 'win', 'linux'], true)) {
	http_response_code(400);
	echo 'Invalid platform';
	exit;
}

$ip = $_SERVER['REMOTE_ADDR'] ?? null;
$ua = $_SERVER['HTTP_USER_AGENT'] ?? null;
$pdo = db();

$ins = $pdo->prepare('INSERT INTO download_events (platform, ip, user_agent) VALUES (?, ?, ?)');
$ins->execute([$platform, $ip, $ua]);

$upd = $pdo->prepare('UPDATE download_counts SET count = count + 1 WHERE platform = ?');
$upd->execute([$platform]);

$base = env('DOWNLOAD_BASE_URL', 'https://downloads.example.com/');
$targets = [
	'mac' => $base . 'codepulse-macos.dmg',
	'win' => $base . 'codepulse-windows.exe',
	'linux' => $base . 'codepulse-linux.tar.gz',
];

header('Location: ' . $targets[$platform]);
exit;