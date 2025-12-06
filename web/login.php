<?php
require_once __DIR__ . '/lib/auth.php';
require_once __DIR__ . '/lib/db.php';

ensureAdminUser();
startSession();

$error = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
	$username = $_POST['username'] ?? '';
	$password = $_POST['password'] ?? '';
	$ok = login($username, $password);
	if ($ok) {
		header('Location: /stats.php');
		exit;
	} else {
		$error = 'Identifiants invalides';
	}
}
?><!doctype html>
<html lang="fr" class="scroll-smooth">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>CodePulse – Connexion sécurisée</title>
		<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
		<link href="/assets/tailwind.generated.css" rel="stylesheet">
		<link rel="stylesheet" href="/assets/styles.css" disabled>
		<!-- GSAP -->
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
		<script defer>
			document.addEventListener('DOMContentLoaded', () => {
				gsap.from('.login-card', { y: 24, opacity: 0, duration: 0.7, ease: 'power3.out' });
				gsap.from('.login-title', { y: 10, opacity: 0, duration: 0.6, delay: 0.15, ease: 'power3.out' });
				gsap.from('.login-form label', { y: 8, opacity: 0, duration: 0.5, stagger: 0.1, delay: 0.25, ease: 'power3.out' });
				gsap.from('.login-actions > *', { y: 8, opacity: 0, duration: 0.5, stagger: 0.1, delay: 0.35, ease: 'power3.out' });
			});
		</script>
	</head>
	<body class="bg-gradient-to-b from-gray-50 to-white min-h-screen">
		<header class="py-4 border-b border-gray-200 bg-white/80 backdrop-blur">
			<div class="max-w-7xl mx-auto px-4 flex justify-between items-center">
				<div class="flex items-center gap-2">
					<div class="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold">CP</div>
					<div class="text-xl font-bold">CodePulse</div>
				</div>
				<nav class="space-x-4">
					<a class="text-gray-700 hover:text-blue-600 transition" href="/index.php">Accueil</a>
				</nav>
			</div>
		</header>

		<section class="max-w-md mx-auto py-16 px-4">
			<div class="login-card rounded-2xl border border-gray-200 bg-white shadow-lg p-6">
				<h2 class="login-title text-2xl font-bold text-gray-900 mb-1">Connexion sécurisée</h2>
				<p class="text-gray-600 mb-6">Veuillez confirmer votre identité pour accéder aux statistiques.</p>

				<?php if ($error): ?>
					<div class="bg-red-50 text-red-700 border border-red-200 p-4 rounded mb-4">
						<?= htmlspecialchars($error) ?>
					</div>
				<?php endif; ?>

				<form method="POST" class="login-form space-y-4">
					<label class="block">
						<span class="block text-sm font-medium text-gray-700">Nom d’utilisateur</span>
						<input type="text" name="username" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" autocomplete="username">
					</label>
					<label class="block">
						<span class="block text-sm font-medium text-gray-700">Mot de passe</span>
						<input type="password" name="password" required class="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500" autocomplete="current-password">
					</label>
					<div class="login-actions flex justify-between items-center pt-2">
						<button class="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition" type="submit">Se connecter</button>
						<a class="text-blue-600 hover:underline" href="/index.php">Retour</a>
					</div>
				</form>

				<div class="mt-6 flex items-center gap-2 text-sm text-gray-500">
					<svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
						<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414L9 13.414l4.707-4.707z" clip-rule="evenodd" />
					</svg>
					<span>Authentification chiffrée. Vos données restent locales.</span>
				</div>
			</div>
		</section>
	</body>
</html>