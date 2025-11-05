/** @type {import('next').NextConfig} */
const nextConfig = {
	output: 'standalone',
	poweredByHeader: false,
	reactStrictMode: true,
	swcMinify: true,

	// Environment variables
	env: {
		NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'
	},

	// Rewrites for API compatibility
	async rewrites() {
		const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080'

		return [
			{
				source: '/api/:path*',
				destination: `${apiUrl}/v1/:path*`
			}
		]
	},

	// Security headers
	async headers() {
		return [
			{
				source: '/(.*)',
				headers: [
					{
						key: 'X-Frame-Options',
						value: 'DENY'
					},
					{
						key: 'X-Content-Type-Options',
						value: 'nosniff'
					},
					{
						key: 'Referrer-Policy',
						value: 'strict-origin-when-cross-origin'
					}
				]
			}
		]
	},

	// Experimental features
	experimental: {
		typedRoutes: true,
		serverActions: {
			bodySizeLimit: '5mb'
		}
	},

	// For Satori (OG Image generation) and performance
	webpack: (config, { dev, isServer }) => {
		if (!dev && isServer) {
			config.externals.push({
				canvas: 'canvas'
			})
		}

		// Optimize bundle size
		config.resolve.alias = {
			...config.resolve.alias,
			'@': require('path').resolve(__dirname, 'src')
		}

		return config
	}
}

module.exports = nextConfig
