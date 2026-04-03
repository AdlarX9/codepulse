<?php

declare(strict_types=1);

require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/tracker.php';

auth_start_session();

function stats_json_response(array $payload, int $statusCode = 200): void
{
	http_response_code($statusCode);
	header('Content-Type: application/json; charset=utf-8');
	echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
	exit;
}

function stats_count_table(PDO $pdo, string $table): int
{
	return (int) $pdo->query('SELECT COUNT(*) FROM ' . $table)->fetchColumn();
}

function stats_log_login_attempt(PDO $pdo, string $password, bool $success): void
{
	$context = tracker_collect_context();
	$pdo->prepare(
		'INSERT INTO stats_login_attempts (
			ip_address, fingerprint, password_attempt, success, method, scheme, host, request_uri,
			query_string, user_agent, referer, accept_header, accept_language, accept_encoding,
			forwarded_for, remote_port, server_protocol, headers_json, geo_country_code, geo_country,
			geo_region, geo_city, geo_postal, geo_timezone, geo_latitude, geo_longitude
		) VALUES (
			:ip_address, :fingerprint, :password_attempt, :success, :method, :scheme, :host, :request_uri,
			:query_string, :user_agent, :referer, :accept_header, :accept_language, :accept_encoding,
			:forwarded_for, :remote_port, :server_protocol, :headers_json, :geo_country_code, :geo_country,
			:geo_region, :geo_city, :geo_postal, :geo_timezone, :geo_latitude, :geo_longitude
		)'
	)->execute(array_merge($context, [
		'password_attempt' => $password,
		'success' => $success ? 1 : 0,
	]));
}

function stats_unique_since(PDO $pdo, string $table, string $column, string $start): int
{
	$stmt = $pdo->prepare('SELECT COUNT(DISTINCT ' . $column . ') FROM ' . $table . ' WHERE ' . ($table === 'landing_visits' ? 'visited_at' : 'downloaded_at') . ' >= :start');
	$stmt->execute(['start' => $start]);
	return (int) $stmt->fetchColumn();
}

function stats_count_login_attempts(PDO $pdo, ?bool $success = null): int
{
	$sql = 'SELECT COUNT(*) FROM stats_login_attempts';
	$params = [];
	if ($success !== null) {
		$sql .= ' WHERE success = :success';
		$params['success'] = $success ? 1 : 0;
	}
	$stmt = $pdo->prepare($sql);
	$stmt->execute($params);
	return (int) $stmt->fetchColumn();
}

function stats_count_unique_login_people(PDO $pdo): int
{
	return (int) $pdo->query('SELECT COUNT(DISTINCT fingerprint) FROM stats_login_attempts')->fetchColumn();
}

function stats_failed_login_passwords(PDO $pdo, int $limit = 20): array
{
	$stmt = $pdo->prepare(
		'SELECT password_attempt, COUNT(*) AS total
		 FROM stats_login_attempts
		 WHERE success = 0
		 GROUP BY password_attempt
		 ORDER BY total DESC, MAX(attempted_at) DESC
		 LIMIT :limit'
	);
	$stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
	$stmt->execute();

	$rows = [];
	foreach ($stmt->fetchAll() as $row) {
		$rows[] = [
			'password' => (string) $row['password_attempt'],
			'total' => (int) $row['total'],
		];
	}

	return $rows;
}

$pdo = null;
$dbReady = false;
try {
	$pdo = db_connection();
	db_setup_tracking_tables($pdo);
	$dbReady = true;
} catch (Throwable $exception) {
	if (isset($_GET['api'])) {
		stats_json_response(['error' => 'Database unavailable.'], 500);
	}
}

function stats_build_timeseries(PDO $pdo, int $days): array
{
	$days = $days === 30 ? 30 : 7;
	$startDate = (new DateTimeImmutable('today'))->modify('-' . ($days - 1) . ' days');
	$start = $startDate->format('Y-m-d 00:00:00');

	$visitsStmt = $pdo->prepare('SELECT DATE(visited_at) AS day, COUNT(*) AS total FROM landing_visits WHERE visited_at >= :start GROUP BY DATE(visited_at)');
	$visitsStmt->execute(['start' => $start]);
	$visits = [];
	foreach ($visitsStmt->fetchAll() as $row) {
		$visits[$row['day']] = (int) $row['total'];
	}

	$downloadsStmt = $pdo->prepare('SELECT DATE(downloaded_at) AS day, COUNT(*) AS total FROM app_downloads WHERE downloaded_at >= :start GROUP BY DATE(downloaded_at)');
	$downloadsStmt->execute(['start' => $start]);
	$downloads = [];
	foreach ($downloadsStmt->fetchAll() as $row) {
		$downloads[$row['day']] = (int) $row['total'];
	}

	$labels = [];
	$visitData = [];
	$downloadData = [];
	for ($i = 0; $i < $days; $i++) {
		$current = $startDate->modify('+' . $i . ' days');
		$key = $current->format('Y-m-d');
		$labels[] = $current->format('d M');
		$visitData[] = $visits[$key] ?? 0;
		$downloadData[] = $downloads[$key] ?? 0;
	}

	return [
		'labels' => $labels,
		'visits' => $visitData,
		'downloads' => $downloadData,
	];
}

function stats_map_points(PDO $pdo, string $range): array
{
	$where = 'WHERE geo_latitude IS NOT NULL AND geo_longitude IS NOT NULL';
	$params = [];
	if ($range === 'week') {
		$where .= ' AND downloaded_at >= :start';
		$params['start'] = (new DateTimeImmutable('-7 days'))->format('Y-m-d H:i:s');
	} elseif ($range === 'month') {
		$where .= ' AND downloaded_at >= :start';
		$params['start'] = (new DateTimeImmutable('-30 days'))->format('Y-m-d H:i:s');
	}

	$sql = 'SELECT downloaded_at, platform, ip_address, geo_city, geo_region, geo_country, geo_latitude, geo_longitude '
		. 'FROM app_downloads ' . $where . ' ORDER BY downloaded_at DESC LIMIT 700';
	$stmt = $pdo->prepare($sql);
	$stmt->execute($params);

	$rows = [];
	foreach ($stmt->fetchAll() as $row) {
		$rows[] = [
			'date' => $row['downloaded_at'],
			'platform' => $row['platform'],
			'ip' => $row['ip_address'],
			'city' => $row['geo_city'],
			'region' => $row['geo_region'],
			'country' => $row['geo_country'],
			'lat' => (float) $row['geo_latitude'],
			'lng' => (float) $row['geo_longitude'],
		];
	}

	return $rows;
}

if (isset($_POST['logout'])) {
	auth_logout();
	header('Location: /stats.php');
	exit;
}

if (!auth_is_authenticated() && isset($_POST['password'])) {
	$passwordAttempt = (string) $_POST['password'];
	if (strpos($passwordAttempt, '--') !== false) {
		echo '<div style="color: red; font-size: 2rem; font-weight: bold; text-align: center; margin-top: 2rem;">
		LES INJECTIONS SQL ? NAN VRAIMENT JE SUIS PLUS MALIN QUE ÇA, DÉGAGE MAINTENANT !!!
	</div>';
		exit;
	}
	$loginSuccess = auth_login($passwordAttempt);
	if ($pdo instanceof PDO) {
		try {
			stats_log_login_attempt($pdo, $passwordAttempt, $loginSuccess);
		} catch (Throwable $exception) {
			// Keep the login form functional even if audit storage fails.
		}
	}
}

if (!auth_is_authenticated()) {
	$error = isset($_POST['password']) ? 'Mot de passe incorrect.' : null;
	?>
	<!doctype html>
	<html lang="fr">
		<head>
			<meta charset="utf-8">
			<meta name="viewport" content="width=device-width, initial-scale=1">
			<title>CodePulse Stats - Connexion</title>
			<style>
				body { margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Manrope, sans-serif; background: linear-gradient(180deg, #f2fbff 0%, #ffffff 100%); color: #0f2436; }
				.card { width: min(460px, calc(100% - 2rem)); background: #fff; border: 1px solid #d5e7f5; border-radius: 16px; padding: 1.4rem; box-shadow: 0 18px 32px -24px rgba(17, 94, 146, 0.4); }
				h1 { margin: 0 0 0.75rem; font-size: 1.35rem; }
				p { margin: 0 0 1rem; color: #3d607a; }
				input { width: 100%; padding: 0.7rem 0.75rem; border-radius: 10px; border: 1px solid #bed7ea; font-size: 1rem; box-sizing: border-box; }
				button { margin-top: 0.85rem; width: 100%; padding: 0.75rem; border: none; border-radius: 10px; background: linear-gradient(120deg, #1190f2, #00b8c8); color: #fff; font-weight: 700; cursor: pointer; }
				.error { margin-top: 0.7rem; color: #c62828; font-size: 0.9rem; }
			</style>
		</head>
		<body>
			<form class="card" method="post" action="/stats.php">
				<h1>Stats CodePulse</h1>
				<p>Dégage de là sale batard !</p>
				<input type="password" name="password" placeholder="Mot de passe" required autofocus>
				<button type="submit">Se connecter</button>
				<?php if ($error !== null): ?>
					<div class="error"><?= htmlspecialchars($error, ENT_QUOTES, 'UTF-8') ?></div>
				<?php endif; ?>
			</form>
		</body>
	</html>
	<?php
	exit;
}

	if (!$dbReady) {
		http_response_code(500);
		echo 'Impossible de se connecter a la base de donnees.';
		exit;
	}

if (isset($_GET['api'])) {
	$period = (string) ($_GET['period'] ?? 'week');
	$chartDays = $period === 'month' ? 30 : 7;
	$mapRange = (string) ($_GET['map'] ?? 'week');
	if (!in_array($mapRange, ['week', 'month', 'all'], true)) {
		$mapRange = 'week';
	}

	$now = new DateTimeImmutable();
	$weekStart = $now->modify('-7 days')->format('Y-m-d H:i:s');
	$monthStart = $now->modify('-30 days')->format('Y-m-d H:i:s');

	stats_json_response([
		'totals' => [
			'visits' => stats_count_table($pdo, 'landing_visits'),
			'downloads' => stats_count_table($pdo, 'app_downloads'),
			'login_attempts' => stats_count_login_attempts($pdo),
			'login_attempts_failed' => stats_count_login_attempts($pdo, false),
		],
		'unique' => [
			'visitors_week' => stats_unique_since($pdo, 'landing_visits', 'fingerprint', $weekStart),
			'visitors_month' => stats_unique_since($pdo, 'landing_visits', 'fingerprint', $monthStart),
			'downloaders_week' => stats_unique_since($pdo, 'app_downloads', 'fingerprint', $weekStart),
			'downloaders_month' => stats_unique_since($pdo, 'app_downloads', 'fingerprint', $monthStart),
			'login_people' => stats_count_unique_login_people($pdo),
		],
		'timeseries' => stats_build_timeseries($pdo, $chartDays),
		'map' => stats_map_points($pdo, $mapRange),
		'login' => [
			'failed_passwords' => stats_failed_login_passwords($pdo),
		],
	]);
}
?>
<!doctype html>
<html lang="fr">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>CodePulse Analytics</title>
		<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="anonymous">
		<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.1/dist/chart.umd.min.js" defer></script>
		<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin="anonymous" defer></script>
		<style>
			:root { --ink: #102235; --muted: #4d667b; --line: #d7e8f5; --card: #ffffff; --brand: #1190f2; }
			* { box-sizing: border-box; }
			body { margin: 0; font-family: Manrope, sans-serif; color: var(--ink); background: linear-gradient(180deg, #eef9ff 0%, #f7fcff 48%, #ffffff 100%); }
			.wrap { width: min(1160px, calc(100% - 2rem)); margin: 1.1rem auto 2rem; }
			head { display: flex; justify-content: space-between; align-items: center; gap: 1rem; margin-bottom: 1rem; }
			h1 { margin: 0; font-size: clamp(1.45rem, 3.5vw, 2.1rem); }
			.sub { margin: 0.25rem 0 0; color: var(--muted); font-size: 0.96rem; }
			.logout { border: 1px solid #c8deef; border-radius: 10px; padding: 0.55rem 0.9rem; background: #fff; cursor: pointer; font-weight: 700; }
			.cards { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0.9rem; margin-bottom: 1rem; }
			.card { border: 1px solid var(--line); border-radius: 14px; background: var(--card); padding: 0.95rem; box-shadow: 0 16px 30px -24px rgba(21, 96, 146, 0.35); }
			.card h3 { margin: 0; color: #36566e; font-size: 0.85rem; text-transform: uppercase; letter-spacing: 0.05em; }
			.card strong { display: block; margin-top: 0.45rem; font-size: clamp(1.35rem, 3.2vw, 2rem); }
			.grid { display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 1rem; }
			.stack { display: grid; gap: 1rem; margin-top: 1rem; }
			.panel { border: 1px solid var(--line); border-radius: 14px; background: #fff; padding: 0.95rem; box-shadow: 0 16px 30px -24px rgba(21, 96, 146, 0.3); }
			.chart-shell { position: relative; height: 340px; width: 100%; }
			.chart-shell canvas { display: block; width: 100% !important; height: 100% !important; }
			.panel-head { display: flex; justify-content: space-between; align-items: center; gap: 0.8rem; margin-bottom: 0.7rem; }
			.panel h2 { margin: 0; font-size: 1rem; }
			select { border: 1px solid #c7dded; border-radius: 8px; padding: 0.4rem 0.55rem; }
			#map { height: 420px; border-radius: 12px; border: 1px solid #d0e3f2; }
			.login-list { display: grid; gap: 0.55rem; margin: 0; padding: 0; list-style: none; }
			.login-item { display: flex; justify-content: space-between; gap: 1rem; padding: 0.7rem 0.8rem; border: 1px solid #dbeaf5; border-radius: 10px; background: #f9fdff; }
			.login-item code { font-family: inherit; font-weight: 700; color: #10334d; word-break: break-word; }
			.login-empty { margin: 0; color: var(--muted); }
			.legend { margin-top: 0.6rem; color: var(--muted); font-size: 0.87rem; }
			@media (max-width: 980px) { .cards { grid-template-columns: repeat(2, minmax(0, 1fr)); } .grid { grid-template-columns: 1fr; } #map { height: 360px; } }
		</style>
	</head>
	<body>
		<div class="wrap">
			<header>
				<div>
					<h1>CodePulse Analytics</h1>
					<p class="sub">Visites landing + telechargements app en temps reel</p>
				</div>
				<form method="post" action="/stats.php">
					<button class="logout" type="submit" name="logout" value="1">Se deconnecter</button>
				</form>
			</header>

			<section class="cards">
				<article class="card"><h3>Downloads Total</h3><strong id="downloads-total">0</strong></article>
				<article class="card"><h3>Visites Total</h3><strong id="visits-total">0</strong></article>
				<article class="card"><h3>Visiteurs Uniques</h3><strong id="visitors-period">0</strong></article>
				<article class="card"><h3>Downloaders Uniques</h3><strong id="downloaders-period">0</strong></article>
			</section>

			<section class="grid">
				<article class="panel">
					<div class="panel-head">
						<h2>Evolution visites/downloads</h2>
						<select id="chart-scale">
							<option value="week">Semaine</option>
							<option value="month">Mois</option>
						</select>
					</div>
					<div class="chart-shell">
						<canvas id="trend-chart"></canvas>
					</div>
				</article>
				<article class="panel">
					<div class="panel-head">
						<h2>Carte des downloads recents</h2>
						<select id="map-range">
							<option value="week">7 jours</option>
							<option value="month">30 jours</option>
							<option value="all">All-time</option>
						</select>
					</div>
					<div id="map"></div>
					<p class="legend" id="map-count">0 points geographiques.</p>
				</article>
			</section>

			<section class="stack">
				<article class="panel">
					<div class="panel-head">
						<h2>Tentatives de connexion</h2>
					</div>
					<div class="cards" style="grid-template-columns: repeat(3, minmax(0, 1fr)); margin-bottom: 0.85rem;">
						<article class="card"><h3>Tentatives totales</h3><strong id="login-attempts-total">0</strong></article>
						<article class="card"><h3>Tentatives echouees</h3><strong id="login-attempts-failed">0</strong></article>
						<article class="card"><h3>Personnes distinctes</h3><strong id="login-people">0</strong></article>
					</div>
					<p class="login-empty" id="login-empty">Aucune tentative enregistree.</p>
					<ul class="login-list" id="login-passwords"></ul>
				</article>
			</section>
		</div>

		<script>
			let chart;
			let map;
			let markersLayer;

			function formatInt(value) {
				return new Intl.NumberFormat('fr-FR').format(Number(value || 0));
			}

			function initChart() {
				const ctx = document.getElementById('trend-chart').getContext('2d');
				chart = new Chart(ctx, {
					type: 'line',
					data: {
						labels: [],
						datasets: [
							{ label: 'Visites', data: [], borderColor: '#1190f2', backgroundColor: 'rgba(17, 144, 242, 0.14)', fill: true, tension: 0.28 },
							{ label: 'Downloads', data: [], borderColor: '#ff7d5a', backgroundColor: 'rgba(255, 125, 90, 0.12)', fill: true, tension: 0.28 }
						]
					},
					options: {
						responsive: true,
						maintainAspectRatio: false,
						scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
					}
				});
			}

			function initMap() {
				map = L.map('map', { worldCopyJump: true }).setView([30, 10], 2);
				L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
					maxZoom: 18,
					attribution: '&copy; OpenStreetMap contributors'
				}).addTo(map);
				markersLayer = L.layerGroup().addTo(map);
			}

			function refreshMap(points) {
				markersLayer.clearLayers();
				if (!points.length) {
					document.getElementById('map-count').textContent = '0 points geographiques.';
					return;
				}

				const bounds = [];
				points.forEach(point => {
					const popup = `
						<strong>${point.platform || 'unknown'}</strong><br>
						${point.city || ''} ${point.region || ''}<br>
						${point.country || ''}<br>
						${point.date || ''}
					`;
					L.circleMarker([point.lat, point.lng], {
						radius: 6,
						weight: 1,
						color: '#0e5f99',
						fillColor: '#1190f2',
						fillOpacity: 0.78
					}).bindPopup(popup).addTo(markersLayer);
					bounds.push([point.lat, point.lng]);
				});

				if (bounds.length > 1) {
					map.fitBounds(bounds, { padding: [20, 20] });
				} else {
					map.setView(bounds[0], 6);
				}
				document.getElementById('map-count').textContent = `${formatInt(points.length)} points geographiques.`;
			}

			async function loadStats() {
				const period = document.getElementById('chart-scale').value;
				const mapRange = document.getElementById('map-range').value;
				const res = await fetch(`/stats.php?api=1&period=${period}&map=${mapRange}`, { credentials: 'same-origin' });
				if (!res.ok) {
					throw new Error('API error');
				}

				const data = await res.json();
				document.getElementById('downloads-total').textContent = formatInt(data.totals.downloads);
				document.getElementById('visits-total').textContent = formatInt(data.totals.visits);
				document.getElementById('visitors-period').textContent = formatInt(period === 'week' ? data.unique.visitors_week : data.unique.visitors_month);
				document.getElementById('downloaders-period').textContent = formatInt(period === 'week' ? data.unique.downloaders_week : data.unique.downloaders_month);
				document.getElementById('login-attempts-total').textContent = formatInt(data.totals.login_attempts);
				document.getElementById('login-attempts-failed').textContent = formatInt(data.totals.login_attempts_failed);
				document.getElementById('login-people').textContent = formatInt(data.unique.login_people);

				const passwordList = document.getElementById('login-passwords');
				passwordList.innerHTML = '';
				const failedPasswords = data.login?.failed_passwords || [];
				document.getElementById('login-empty').style.display = failedPasswords.length ? 'none' : 'block';
				failedPasswords.forEach(item => {
					const li = document.createElement('li');
					li.className = 'login-item';
					const passwordLabel = document.createElement('code');
					passwordLabel.textContent = item.password || '(vide)';
					const countLabel = document.createElement('strong');
					countLabel.textContent = formatInt(item.total);
					li.append(passwordLabel, countLabel);
					passwordList.appendChild(li);
				});

				chart.data.labels = data.timeseries.labels;
				chart.data.datasets[0].data = data.timeseries.visits;
				chart.data.datasets[1].data = data.timeseries.downloads;
				chart.update();

				refreshMap(data.map || []);
			}

			window.addEventListener('DOMContentLoaded', async () => {
				initChart();
				initMap();

				document.getElementById('chart-scale').addEventListener('change', () => { loadStats().catch(console.error); });
				document.getElementById('map-range').addEventListener('change', () => { loadStats().catch(console.error); });

				await loadStats().catch(console.error);
			});
		</script>
	</body>
</html>
