<?php
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/db.php';

startSession();
if (!isAuthenticated()) {
	header('Location: /login.php');
	exit;
}

$pdo = db();
$counts = $pdo->query('SELECT platform, count FROM download_counts')->fetchAll();
$events = $pdo->query('SELECT platform, ip, user_agent, created_at FROM download_events ORDER BY id DESC LIMIT 50')->fetchAll();

?><!doctype html>
<html lang="fr" class="scroll-smooth">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>CodePulse – Tableau de bord</title>
		<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
		<link href="/assets/tailwind.generated.css" rel="stylesheet">
		<link rel="stylesheet" href="/assets/styles.css" disabled>
		<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
		<!-- GSAP + ScrollTrigger -->
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
		<script defer>
			document.addEventListener('DOMContentLoaded', () => {
				gsap.registerPlugin(ScrollTrigger);
				gsap.from('.header-wrap', { y: -10, opacity: 0, duration: 0.6, ease: 'power2.out' });
				gsap.from('.stat-title', { y: 12, opacity: 0, duration: 0.7, ease: 'power3.out' });
				gsap.utils.toArray('.panel').forEach((p) => {
					gsap.from(p, {
						y: 30, opacity: 0, duration: 0.6, ease: 'power3.out',
						scrollTrigger: { trigger: p, start: 'top 85%' }
					});
				});
			});
		</script>
	</head>
	<body class="bg-gray-50 text-gray-900">
		<header class="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200 z-50">
			<div class="header-wrap max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">CP</div>
					<div class="text-xl font-bold tracking-tight">CodePulse</div>
				</div>
				<nav class="space-x-4">
					<a href="/index.php" class="text-gray-700 hover:text-blue-600 transition">Accueil</a>
					<a href="/logout.php" class="text-gray-700 hover:text-blue-600 transition">Logout</a>
				</nav>
			</div>
		</header>

		<section class="max-w-7xl mx-auto px-4 py-12">
			<div class="flex items-center justify-between">
				<h2 class="stat-title text-2xl md:text-3xl font-bold text-gray-900">Statistiques de téléchargements</h2>
				<div class="text-sm text-gray-600 hidden md:flex items-center gap-2">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 2a8 8 0 018 8 8 8 0 11-8-8zm3.707 6.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L9 13.414l4.707-4.707z" clip-rule="evenodd" />
					</svg>
					<span>Données consolidées & auditées</span>
				</div>
			</div>

			<div class="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
				<div class="panel bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
					<canvas id="downloadsChart" height="120"></canvas>
				</div>
				<div class="panel bg-white p-6 rounded-2xl border border-gray-200 shadow-sm">
					<h3 class="text-xl font-semibold text-gray-900 mb-4">Derniers événements</h3>
					<div class="overflow-auto rounded-lg border border-gray-200">
						<table class="table-auto w-full text-left">
							<thead class="bg-gray-50">
								<tr class="border-b">
									<th class="py-2 px-3 text-sm text-gray-600">Plateforme</th>
									<th class="py-2 px-3 text-sm text-gray-600">IP</th>
									<th class="py-2 px-3 text-sm text-gray-600">User-Agent</th>
									<th class="py-2 px-3 text-sm text-gray-600">Date</th>
								</tr>
							</thead>
							<tbody>
								<?php foreach ($events as $ev): ?>
								<tr class="border-b hover:bg-gray-50">
									<td class="py-2 px-3 text-gray-700"><?= htmlspecialchars($ev['platform']) ?></td>
									<td class="py-2 px-3 text-gray-700"><?= htmlspecialchars($ev['ip'] ?? '') ?></td>
									<td class="py-2 px-3 text-gray-700 font-mono text-xs md:text-sm"><?= htmlspecialchars($ev['user_agent'] ?? '') ?></td>
									<td class="py-2 px-3 text-gray-700"><?= htmlspecialchars($ev['created_at']) ?></td>
								</tr>
								<?php endforeach; ?>
							</tbody>
						</table>
					</div>
				</div>
			</div>

			<div class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="panel p-5 rounded-xl bg-white border border-gray-200">
					<div class="text-sm text-gray-500">macOS</div>
					<div class="text-2xl font-semibold text-blue-600">
						<?php
						$mac = 0;
						foreach ($counts as $c) { if (($c['platform'] ?? '') === 'mac') { $mac = (int)$c['count']; break; } }
						echo number_format($mac);
						?>
					</div>
					<div class="text-sm text-gray-500 mt-1">Total téléchargements</div>
				</div>
				<div class="panel p-5 rounded-xl bg-white border border-gray-200">
					<div class="text-sm text-gray-500">Windows</div>
					<div class="text-2xl font-semibold text-indigo-600">
						<?php
						$win = 0;
						foreach ($counts as $c) { if (($c['platform'] ?? '') === 'win') { $win = (int)$c['count']; break; } }
						echo number_format($win);
						?>
					</div>
					<div class="text-sm text-gray-500 mt-1">Total téléchargements</div>
				</div>
				<div class="panel p-5 rounded-xl bg-white border border-gray-200">
					<div class="text-sm text-gray-500">Linux</div>
					<div class="text-2xl font-semibold text-emerald-600">
						<?php
						$linux = 0;
						foreach ($counts as $c) { if (($c['platform'] ?? '') === 'linux') { $linux = (int)$c['count']; break; } }
						echo number_format($linux);
						?>
					</div>
					<div class="text-sm text-gray-500 mt-1">Total téléchargements</div>
				</div>
			</div>
		</section>

		<script>
			const data = <?php echo json_encode($counts); ?>;
			const labels = data.map(d => d.platform);
			const values = data.map(d => Number(d.count));
			const ctx = document.getElementById('downloadsChart').getContext('2d');

			const gradient = ctx.createLinearGradient(0, 0, 0, 300);
			gradient.addColorStop(0, 'rgba(59, 130, 246, 0.6)');
			gradient.addColorStop(1, 'rgba(59, 130, 246, 0.1)');

			new Chart(ctx, {
				type: 'bar',
				data: {
					labels,
					datasets: [{
						label: 'Téléchargements',
						data: values,
						backgroundColor: ['#3B82F6','#6366F1','#10B981'],
						borderRadius: 8
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						y: {
							beginAtZero: true,
							grid: { color: 'rgba(0,0,0,0.05)' }
						},
						x: {
							grid: { display: false }
						}
					},
					plugins: {
						legend: { display: false },
						tooltip: { mode: 'index', intersect: false }
					}
				}
			});
		</script>
	</body>
</html>