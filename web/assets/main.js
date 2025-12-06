document.addEventListener('DOMContentLoaded', () => {
	if (window.gsap) {
		gsap.from('.hero h1', { y: 20, opacity: 0, duration: 0.6 })
		gsap.from('.lead', { y: 20, opacity: 0, duration: 0.6, delay: 0.1 })
		gsap.from('.cta-group .btn', { y: 20, opacity: 0, duration: 0.6, delay: 0.2, stagger: 0.1 })
		gsap.from('.features .card', { y: 16, opacity: 0, duration: 0.4, delay: 0.3, stagger: 0.1 })
	}
})
