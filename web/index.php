<?php
require_once __DIR__ . '/lib/tracker.php';

track_landing_visit();

$host = $_SERVER['HTTP_HOST'] ?? 'alexis-larose.com';
$scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'https';
$canonical = $scheme . '://' . $host . ($_SERVER['REQUEST_URI'] ?? '/');
?>
<!doctype html>
<html lang="en" class="scroll-smooth">
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>CodePulse | Beautiful Code Analytics for Fast-Moving Teams</title>
		<meta name="description" content="CodePulse helps teams visualize code quality, evolution, contributor impact, and project health in one modern desktop analytics hub.">
		<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
		<meta name="keywords" content="CodePulse, code analytics, repository insights, dashboard, developer productivity, code quality, git evolution, contributors">
		<meta name="author" content="Alexis Larose">
		<meta name="theme-color" content="#eaf6ff">
		<link rel="canonical" href="<?= htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8') ?>">

		<link rel="icon" type="image/png" href="/favicon-96x96.png?v=20260402" sizes="96x96" />
		<link rel="icon" type="image/svg+xml" href="/favicon.svg?v=20260402" />
		<link rel="shortcut icon" href="/favicon.ico?v=20260402" />
		<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=20260402" />
		<meta name="apple-mobile-web-app-title" content="Codepulse" />
		<link rel="manifest" href="/site.webmanifest?v=20260402" />

		<meta property="og:type" content="website">
		<meta property="og:site_name" content="CodePulse">
		<meta property="og:title" content="CodePulse | Beautiful Code Analytics for Fast-Moving Teams">
		<meta property="og:description" content="Track quality, evolution, and contributor insights in a polished desktop app built for developers.">
		<meta property="og:image" content="/assets/logo.png">
		<meta property="og:url" content="<?= htmlspecialchars($canonical, ENT_QUOTES, 'UTF-8') ?>">

		<meta name="twitter:card" content="summary_large_image">
		<meta name="twitter:title" content="CodePulse | Beautiful Code Analytics for Fast-Moving Teams">
		<meta name="twitter:description" content="A modern desktop analytics hub for code quality, project evolution, and contributor visibility.">
		<meta name="twitter:image" content="/assets/logo.png">

		<link rel="preconnect" href="https://fonts.googleapis.com">
		<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
		<link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;700;800&family=Space+Grotesk:wght@500;700&display=swap" rel="stylesheet">

		<link href="/assets/tailwind.generated.css" rel="stylesheet">
		<link href="/styles.css" rel="stylesheet">

		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>
		<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js" crossorigin="anonymous" referrerpolicy="no-referrer"></script>

		<script type="application/ld+json">
			{
				"@context": "https://schema.org",
				"@type": "SoftwareApplication",
				"name": "CodePulse",
				"applicationCategory": "DeveloperApplication",
				"operatingSystem": "macOS, Windows, Linux",
				"description": "CodePulse turns repositories into clear insights for quality, evolution, and contributor performance.",
				"image": "/assets/logo.png",
				"offers": {
					"@type": "Offer",
					"price": "0",
					"priceCurrency": "USD"
				}
			}
		</script>
	</head>
	<body>
		<main>
			<section class="hero" id="top">
				<div class="hero-blob blob-a" aria-hidden="true"></div>
				<div class="hero-blob blob-b" aria-hidden="true"></div>
				<div class="container hero-grid">
					<div>
						<span class="section-kicker hero-kicker">New Release Ready</span>
						<h1 class="hero-title">
							CodePulse, the
							<span class="gradient-word">signal layer</span>
							for your codebase.
						</h1>
						<p class="hero-lead">
							From repository chaos to decision-ready insights. CodePulse gives your team a premium view of quality, progress, and contributor impact in minutes.
						</p>
						<div class="hero-actions">
							<a href="#download" class="btn btn-primary">Download CodePulse</a>
							<a href="#product" class="btn btn-secondary">See Product Preview</a>
						</div>
					</div>

					<aside class="hero-side-card" aria-label="Key benefits">
						<div class="hero-side-top">
							<div class="logo-wrap">
								<img src="/assets/logo.png" alt="CodePulse logo" width="34" height="34">
							</div>
							<div>
								<p class="hero-side-eyebrow">Built for software teams</p>
								<p class="hero-side-title">Command your codebase</p>
							</div>
						</div>
						<ul class="hero-side-list">
							<li><span class="dot"></span>Track quality trends before they become incidents</li>
							<li><span class="dot"></span>Understand repo evolution with instant visual context</li>
							<li><span class="dot"></span>Highlight ownership and contribution at a glance</li>
						</ul>
					</aside>
				</div>
			</section>

			<section class="section" id="download">
				<div class="container">
					<span class="section-kicker reveal">Downloads</span>
					<h2 class="reveal" style="font-family:'Space Grotesk', sans-serif; font-size:clamp(1.8rem, 4.1vw, 2.8rem); margin:1rem 0 0.7rem; letter-spacing:-0.02em;">Install CodePulse on your favorite OS</h2>
					<p class="reveal" style="max-width:52rem; margin:0 0 1.7rem; color:var(--muted); line-height:1.65;">Grab the latest build and start exploring your repositories instantly. Every package points to our latest stable release.</p>

					<div class="grid-2">
						<article class="download-card reveal">
							<h3>macOS</h3>
							<p>Optimized for Apple Silicon and Intel Macs.</p>
							<a class="download-link" href="/download.php?platform=macos" rel="noopener noreferrer">Download for macOS</a>
						</article>

						<article class="download-card reveal">
							<h3>Windows</h3>
							<p>Installer package for modern Windows environments.</p>
							<a class="download-link" href="/download.php?platform=windows" rel="noopener noreferrer">Download for Windows</a>
						</article>

						<article class="download-card reveal">
							<h3>Linux Debian</h3>
							<p>Deb package for Debian-based distributions.</p>
							<a class="download-link" href="/download.php?platform=debian" rel="noopener noreferrer">Download for Debian</a>
						</article>

						<article class="download-card reveal">
							<h3>Linux Ubuntu</h3>
							<p>Ubuntu-ready package for quick setup.</p>
							<a class="download-link" href="/download.php?platform=ubuntu" rel="noopener noreferrer">Download for Ubuntu</a>
						</article>
					</div>
				</div>
			</section>

			<section class="section" id="product" style="padding-top:4.6rem;">
				<div class="container">
					<span class="section-kicker reveal">Product Preview</span>
					<h2 class="reveal" style="font-family:'Space Grotesk', sans-serif; font-size:clamp(1.8rem, 4.1vw, 2.8rem); margin:1rem 0 0.7rem; letter-spacing:-0.02em;">A polished analytics workspace your team will actually use</h2>
					<p class="reveal" style="max-width:54rem; margin:0; color:var(--muted); line-height:1.65;">You will add two screenshots soon. This section is already prepared to showcase them in a premium, conversion-focused layout.</p>

					<div class="showcase-grid">
						<article class="shot reveal">
							<span class="label">Home Dashboard</span>
							<h3>Executive project pulse</h3>
							<p>Surface global metrics, language coverage, and trend snapshots in one clean command center.</p>
							<div class="shot-media-wrap" id="home-screenshot-slot">
								<img class="shot-media" src="/assets/home.png" alt="CodePulse Home dashboard screenshot" loading="lazy" decoding="async">
							</div>
						</article>

						<article class="shot reveal">
							<span class="label">Overview Dashboard</span>
							<h3>Granular repository insights</h3>
							<p>Dive into line distributions, language breakdowns, and file-level exploration to guide better refactors.</p>
							<div class="shot-media-wrap" id="overview-screenshot-slot">
								<img class="shot-media" src="/assets/overview.png" alt="CodePulse Overview dashboard screenshot" loading="lazy" decoding="async">
							</div>
						</article>
					</div>
				</div>
			</section>
		</main>

		<footer>
			<div class="container footer-wrap">
				<p style="margin:0; font-size:0.9rem; color:#5b7891;">CodePulse by Alexis Larose. Built for developer teams who move fast.</p>
				<div class="footer-links">
					<a class="footer-link" href="https://alexis-larose.com" target="_blank" rel="noopener noreferrer">Visit alexis-larose.com</a>
					<a class="footer-link" href="https://github.com/AdlarX9/codepulse" target="_blank" rel="noopener noreferrer">View GitHub Project</a>
				</div>
			</div>
		</footer>

		<script src="/assets/main.js" defer></script>
	</body>
</html>