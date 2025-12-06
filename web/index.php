<?php
require_once __DIR__ . '/lib/env.php';
require_once __DIR__ . '/lib/db.php';
require_once __DIR__ . '/lib/auth.php';

// Pas de dépendance stricte à la base sur la landing.
startSession();

$downloadBase = env('DOWNLOAD_BASE_URL', 'https://downloads.example.com/');

?><!doctype html>
<html lang="fr" class="scroll-smooth">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>CodePulse – Analyse de code augmentée</title>
		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
		<link href="/assets/tailwind.generated.css" rel="stylesheet">
		<link rel="stylesheet" href="/assets/styles.css" disabled>
		<!-- GSAP + ScrollTrigger -->
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
		<!-- Icônes -->
		<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css" crossorigin="anonymous" referrerpolicy="no-referrer">
		<!-- Script landing -->
		<script defer>
			document.addEventListener('DOMContentLoaded', () => {
				gsap.registerPlugin(ScrollTrigger);

				// Hero animations
				gsap.from('.hero-title', { y: 30, opacity: 0, duration: 0.8, ease: 'power3.out' });
				gsap.from('.hero-sub', { y: 20, opacity: 0, duration: 0.8, delay: 0.2, ease: 'power3.out' });
				gsap.from('.cta-group > a', {
					y: 10, opacity: 0, duration: 0.6, stagger: 0.1, delay: 0.35, ease: 'power3.out'
				});

				// Cards on scroll
				gsap.utils.toArray('.feature-card').forEach((card, i) => {
					gsap.from(card, {
						y: 40, opacity: 0, duration: 0.7, ease: 'power3.out',
						scrollTrigger: {
							trigger: card,
							start: 'top 80%',
						}
					});
				});

				// Trust badges
				gsap.from('.trust-item', {
					opacity: 0, y: 20, duration: 0.6, stagger: 0.1, ease: 'power2.out',
					scrollTrigger: { trigger: '#trust', start: 'top 85%' }
				});

				// Tech Grid
				gsap.utils.toArray('.tech-card').forEach((el) => {
					gsap.from(el, {
						scale: 0.96, opacity: 0, duration: 0.6, ease: 'power3.out',
						scrollTrigger: { trigger: el, start: 'top 85%' }
					});
				});

				// Security ribbon
				gsap.from('.security-ribbon', {
					y: -20, opacity: 0, duration: 0.8, ease: 'power3.out',
					scrollTrigger: { trigger: '.security-ribbon', start: 'top 90%', toggleActions: 'play none none reverse' }
				});

				// Footer reveal
				gsap.from('.footer-wrap', {
					opacity: 0, y: 20, duration: 0.7, ease: 'power2.out',
					scrollTrigger: { trigger: 'footer', start: 'top 95%' }
				});
			});
		</script>
	</head>
	<body class="bg-white text-gray-900 antialiased">
		<header class="sticky top-0 bg-white/90 backdrop-blur border-b border-gray-200 z-50">
			<div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">CP</div>
					<div class="text-xl font-bold tracking-tight">CodePulse</div>
				</div>
				<nav class="hidden md:flex items-center gap-6">
					<a href="#features" class="text-gray-700 hover:text-blue-600 transition">Fonctionnalités</a>
					<a href="#tech" class="text-gray-700 hover:text-blue-600 transition">Technologie</a>
					<a href="#downloads" class="text-gray-700 hover:text-blue-600 transition">Téléchargements</a>
					<a href="/stats.php" class="text-gray-700 hover:text-blue-600 transition">Stats</a>
				</nav>
				<div class="flex items-center gap-3">
					<a href="/login.php" class="px-3 py-2 text-sm font-semibold border border-gray-300 rounded-lg hover:bg-gray-100 transition">
						Se connecter
					</a>
					<a href="#downloads" class="hidden sm:inline-flex px-3 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">
						Télécharger
					</a>
				</div>
			</div>
		</header>

		<section class="relative overflow-hidden bg-gradient-to-b from-white to-gray-50">
			<div class="absolute inset-0 pointer-events-none">
				<div class="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-100 blur-3xl opacity-40"></div>
				<div class="absolute -bottom-20 -right-20 w-96 h-96 rounded-full bg-indigo-100 blur-3xl opacity-40"></div>
			</div>
			<div class="max-w-7xl mx-auto px-4 py-20 text-center">
				<h1 class="hero-title text-5xl md:text-6xl font-extrabold tracking-tight leading-tight">
					Analysez. Sécurisez. Accélérez.
				</h1>
				<p class="hero-sub mt-6 text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
					CodePulse passe votre code au crible pour révéler des métriques essentielles: lignes, langages, tendances de productivité. Un moteur local, rapide, pensé pour la sécurité et la transparence.
				</p>
				<div class="cta-group mt-10 flex justify-center gap-4">
					<a class="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition" href="/download.php?platform=mac">
						<i class="fa-brands fa-apple mr-2"></i> Télécharger macOS
					</a>
					<a class="px-6 py-3 bg-gray-900 text-white rounded-lg shadow hover:bg-black transition" href="/download.php?platform=win">
						<i class="fa-brands fa-windows mr-2"></i> Télécharger Windows
					</a>
					<a class="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg shadow hover:bg-gray-300 transition" href="/download.php?platform=linux">
						<i class="fa-brands fa-linux mr-2"></i> Télécharger Linux
					</a>
				</div>
				<div class="mt-12 mx-auto max-w-5xl">
					<div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-6">
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div class="feature-card p-5 rounded-xl bg-gray-50 border border-gray-200">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-lg bg-blue-600/90 text-white flex items-center justify-center">
										<i class="fa-solid fa-bolt"></i>
									</div>
									<h3 class="text-lg font-semibold">Rapidité extrême</h3>
								</div>
								<p class="mt-3 text-gray-600">Analyse des dépôts volumineux en quelques secondes grâce au moteur natif optimisé.</p>
							</div>
							<div class="feature-card p-5 rounded-xl bg-gray-50 border border-gray-200">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-lg bg-indigo-600 text-white flex items-center justify-center">
										<i class="fa-solid fa-chart-line"></i>
									</div>
									<h3 class="text-lg font-semibold">Précision et clarté</h3>
								</div>
								<p class="mt-3 text-gray-600">Statistiques fiables: répartition par langages, densité, complexité, tendances temporelles.</p>
							</div>
							<div class="feature-card p-5 rounded-xl bg-gray-50 border border-gray-200">
								<div class="flex items-center gap-3">
									<div class="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center">
										<i class="fa-solid fa-shield-halved"></i>
									</div>
									<h3 class="text-lg font-semibold">Sécurité locale</h3>
								</div>
								<p class="mt-3 text-gray-600">Vos sources ne quittent jamais votre machine. Contrôles de confidentialité intégrés et audits.</p>
							</div>
						</div>
					</div>
				</div>

				<div id="trust" class="mt-16 max-w-4xl mx-auto">
					<p class="text-gray-500 text-sm uppercase tracking-wider">Fiable pour les équipes modernes</p>
					<div class="mt-4 flex flex-wrap justify-center gap-4">
						<span class="trust-item inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700">
							<i class="fa-solid fa-lock text-green-600"></i> Zero-Trust Ready
						</span>
						<span class="trust-item inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700">
							<i class="fa-solid fa-shield-virus text-indigo-600"></i> Offline-first
						</span>
						<span class="trust-item inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700">
							<i class="fa-solid fa-key text-blue-600"></i> Encryption-at-rest
						</span>
						<span class="trust-item inline-flex items-center gap-2 px-3 py-2 rounded-full border border-gray-200 bg-white text-sm text-gray-700">
							<i class="fa-solid fa-fingerprint text-purple-600"></i> Audits & Logs
						</span>
					</div>
				</div>
			</div>
		</section>

		<section id="features" class="py-20 bg-gradient-to-b from-gray-50 to-white">
			<div class="max-w-7xl mx-auto px-4">
				<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<div class="tech-card p-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
						<h2 class="text-2xl font-bold">Mesures avancées</h2>
						<p class="mt-4 text-gray-600">
							Au-delà du simple comptage des lignes, CodePulse calcule des métriques de structure, de densité, et des courbes de productivité. Des graphiques prêts à l’emploi pour vos revues.
						</p>
						<ul class="mt-6 space-y-3 text-gray-700">
							<li class="flex items-center gap-3"><i class="fa-solid fa-check text-emerald-600"></i> Distribution par langages et modules</li>
							<li class="flex items-center gap-3"><i class="fa-solid fa-check text-emerald-600"></i> Détection de pics et régressions</li>
							<li class="flex items-center gap-3"><i class="fa-solid fa-check text-emerald-600"></i> Export des rapports (CSV/JSON)</li>
						</ul>
					</div>
					<div class="tech-card p-8 rounded-2xl border border-gray-200 bg-white shadow-sm">
						<h2 class="text-2xl font-bold">Confiance & Sécurité</h2>
						<p class="mt-4 text-gray-600">
							Conçu pour les environnements exigeants: fonctionnement local, chiffrement, et intégration avec vos politiques internes.
						</p>
						<ul class="mt-6 space-y-3 text-gray-700">
							<li class="flex items-center gap-3"><i class="fa-solid fa-lock text-blue-600"></i> Contrôles de confidentialité granulaires</li>
							<li class="flex items-center gap-3"><i class="fa-solid fa-shield text-indigo-600"></i> Pas de télémétrie par défaut</li>
							<li class="flex items-center gap-3"><i class="fa-solid fa-user-secret text-purple-600"></i> Auditable et traçable</li>
						</ul>
					</div>
				</div>

				<div id="downloads" class="mt-16">
					<div class="security-ribbon mb-6 flex items-center justify-center gap-2 text-sm text-gray-600">
						<i class="fa-solid fa-shield-halved text-emerald-600"></i>
						<span>Builds signés – vérifiés et sécurisés</span>
					</div>
					<div class="rounded-2xl border border-gray-200 bg-white shadow-sm p-8">
						<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
							<a class="group p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow transition" href="/download.php?platform=mac">
								<div class="flex items-center gap-3">
									<i class="fa-brands fa-apple text-2xl text-gray-700 group-hover:text-blue-600"></i>
									<div>
										<div class="font-semibold">macOS</div>
										<div class="text-sm text-gray-500">Apple silicon & Intel</div>
									</div>
								</div>
								<div class="mt-4 text-sm text-gray-600">DMG signé – installation en un clic.</div>
							</a>
							<a class="group p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow transition" href="/download.php?platform=win">
								<div class="flex items-center gap-3">
									<i class="fa-brands fa-windows text-2xl text-gray-700 group-hover:text-blue-600"></i>
									<div>
										<div class="font-semibold">Windows</div>
										<div class="text-sm text-gray-500">x64</div>
									</div>
								</div>
								<div class="mt-4 text-sm text-gray-600">Installer MSI – signature authentique.</div>
							</a>
							<a class="group p-6 rounded-xl border border-gray-200 hover:border-blue-500 hover:shadow transition" href="/download.php?platform=linux">
								<div class="flex items-center gap-3">
									<i class="fa-brands fa-linux text-2xl text-gray-700 group-hover:text-blue-600"></i>
									<div>
										<div class="font-semibold">Linux</div>
										<div class="text-sm text-gray-500">deb/rpm/appimage</div>
									</div>
								</div>
								<div class="mt-4 text-sm text-gray-600">Paquets vérifiés – compatibles CI.</div>
							</a>
						</div>
					</div>
				</div>

			</div>
		</section>

		<section id="tech" class="py-20 bg-gray-50">
			<div class="max-w-7xl mx-auto px-4">
				<div class="text-center mb-10">
					<h2 class="text-3xl font-bold">Architecture pensée pour les équipes</h2>
					<p class="mt-4 text-gray-600">
						Un moteur local hautes-performances, des connecteurs et une API pour automatiser vos analyses.
					</p>
				</div>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
					<div class="tech-card p-6 rounded-xl border border-gray-200 bg-white">
						<h3 class="font-semibold">Moteur natif</h3>
						<p class="mt-2 text-gray-600">Optimisé pour parcourir les dépôts massifs sans sacrifier la précision.</p>
					</div>
					<div class="tech-card p-6 rounded-xl border border-gray-200 bg-white">
						<h3 class="font-semibold">API & Automations</h3>
						<p class="mt-2 text-gray-600">Déclenchez vos audits dans vos pipelines CI/CD avec des rapports complets.</p>
					</div>
					<div class="tech-card p-6 rounded-xl border border-gray-200 bg-white">
						<h3 class="font-semibold">Confidentialité by design</h3>
						<p class="mt-2 text-gray-600">Aucune donnée envoyée sans consentement explicite, stockage local chiffré.</p>
					</div>
				</div>
			</div>
		</section>

		<footer class="bg-gray-900 text-white">
			<div class="footer-wrap max-w-7xl mx-auto px-4 py-8 flex flex-col md:flex-row justify-between items-center gap-4">
				<small class="text-gray-400">© <?php echo date('Y'); ?> CodePulse</small>
				<div class="flex items-center gap-4">
					<a href="/privacy.html" class="text-gray-300 hover:text-white transition">Confidentialité</a>
					<a href="/contact.php" class="text-gray-300 hover:text-white transition">Contact</a>
					<a href="/stats.php" class="text-gray-300 hover:text-white transition">Stats</a>
				</div>
			</div>
		</footer>
	</body>
</html>