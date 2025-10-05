/** @type {import('next').NextConfig} */
const nextConfig = {
	reactStrictMode: true,
	swcMinify: true,
	images: {
		domains: ['images.unsplash.com']
	},
	experimental: {
		serverActions: {
			bodySizeLimit: '2mb'
		}
	}
}

module.exports = nextConfig
