document.addEventListener('DOMContentLoaded', () => {
	const blobs = document.querySelectorAll('.hero-blob')
	if (window.gsap && window.ScrollTrigger) {
		gsap.registerPlugin(ScrollTrigger)

		gsap.from('.hero-kicker', {
			y: 14,
			opacity: 0,
			duration: 0.55,
			ease: 'power2.out'
		})

		gsap.from('.hero-title', {
			y: 22,
			opacity: 0,
			duration: 0.72,
			delay: 0.06,
			ease: 'power3.out'
		})

		gsap.from('.hero-lead', {
			y: 18,
			opacity: 0,
			duration: 0.6,
			delay: 0.14,
			ease: 'power2.out'
		})

		gsap.from('.hero-actions .btn', {
			y: 16,
			opacity: 0,
			duration: 0.48,
			delay: 0.2,
			stagger: 0.1,
			ease: 'power2.out'
		})

		gsap.from('.hero-side-card', {
			y: 26,
			opacity: 0,
			duration: 0.7,
			delay: 0.16,
			ease: 'power3.out'
		})

		gsap.utils.toArray('.reveal').forEach(element => {
			gsap.to(element, {
				opacity: 1,
				y: 0,
				duration: 0.55,
				ease: 'power2.out',
				scrollTrigger: {
					trigger: element,
					start: 'top 86%',
					once: true
				}
			})
		})

		blobs.forEach((blob, index) => {
			gsap.to(blob, {
				y: index === 0 ? 18 : -16,
				x: index === 0 ? -12 : 10,
				duration: index === 0 ? 4.8 : 5.6,
				repeat: -1,
				yoyo: true,
				ease: 'sine.inOut'
			})
		})
	} else {
		document.querySelectorAll('.reveal').forEach(element => {
			element.style.opacity = '1'
			element.style.transform = 'translateY(0)'
		})
	}
})
