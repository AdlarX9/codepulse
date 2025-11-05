import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
	title: 'CodePulse - Analyze Your Codebase',
	description:
		'Beautiful, privacy-first code analysis tool for macOS, Windows, and Linux. Scan your projects and get detailed insights instantly.',
	keywords: ['code analysis', 'line counter', 'developer tools', 'codebase stats'],
	authors: [{ name: 'CodePulse Team' }],
	openGraph: {
		title: 'CodePulse - Analyze Your Codebase',
		description: 'Beautiful, privacy-first code analysis tool.',
		type: 'website',
		images: ['/og-image.png']
	},
	twitter: {
		card: 'summary_large_image',
		title: 'CodePulse',
		description: 'Beautiful, privacy-first code analysis tool.',
		images: ['/og-image.png']
	}
}

export default function RootLayout({
	children
}: Readonly<{
	children: React.ReactNode
}>) {
	return (
		<html lang='en' suppressHydrationWarning>
			<body className={inter.className}>{children}</body>
		</html>
	)
}
