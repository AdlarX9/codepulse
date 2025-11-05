'use client'

import { Code2, BarChart3, Shield, Zap, Download, User } from 'lucide-react'
import Header from '@/components/Header'

export default function Home() {
	const downloadUrl = (platform: string) => `/api/download?platform=${platform}&version=latest`

	return (
		<div className='min-h-screen bg-gradient-to-b from-gray-50 to-gray-100'>
			{/* Header */}
			<Header />

			{/* Hero Section */}
			<section className='container mx-auto px-4 py-20 md:py-32'>
				<div className='max-w-4xl mx-auto text-center'>
					<h1 className='text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent'>
						Analyze Your Codebase
						<br />
						Like Never Before
					</h1>
					<p className='text-xl md:text-2xl text-gray-600 mb-8'>
						Beautiful, privacy-first code analysis for developers.
						<br />
						Fast, powerful, and completely offline.
					</p>

					{/* Download Buttons */}
					<div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
						<a href={downloadUrl('mac')}>
							<button className='bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-md font-medium flex items-center gap-2'>
								<Download className='h-5 w-5' />
								Download for macOS
							</button>
						</a>
						<a href={downloadUrl('win')}>
							<button className='border border-gray-300 bg-white hover:bg-gray-50 px-8 py-3 rounded-md font-medium flex items-center gap-2'>
								<Download className='h-5 w-5' />
								Download for Windows
							</button>
						</a>
						<a href={downloadUrl('linux')}>
							<button className='border border-gray-300 bg-white hover:bg-gray-50 px-8 py-3 rounded-md font-medium flex items-center gap-2'>
								<Download className='h-5 w-5' />
								Download for Linux
							</button>
						</a>
					</div>
				</div>
			</section>

			{/* Features Section */}
			<section className='container mx-auto px-4 py-16'>
				<div className='max-w-6xl mx-auto'>
					<h2 className='text-3xl md:text-4xl font-bold text-center mb-12'>
						Why Choose CodePulse?
					</h2>

					<div className='grid md:grid-cols-2 lg:grid-cols-4 gap-8'>
						{[
							{
								icon: BarChart3,
								title: 'Deep Analytics',
								description:
									'Comprehensive code analysis with detailed metrics and insights'
							},
							{
								icon: Shield,
								title: 'Privacy First',
								description:
									'All analysis happens locally on your machine, keeping your code private'
							},
							{
								icon: Zap,
								title: 'Lightning Fast',
								description:
									'Optimized scanning engine that processes thousands of files quickly'
							},
							{
								icon: Code2,
								title: 'Language Support',
								description:
									'Supports 50+ programming languages with accurate parsing'
							}
						].map((feature, index) => (
							<div
								key={index}
								className='bg-white rounded-lg border shadow-sm text-center h-full p-6'
							>
								<div className='w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4'>
									<feature.icon className='h-6 w-6 text-blue-600' />
								</div>
								<h3 className='text-xl font-semibold mb-2'>{feature.title}</h3>
								<p className='text-sm text-gray-600'>{feature.description}</p>
							</div>
						))}
					</div>
				</div>
			</section>

			{/* 4 Dashboards Showcase */}
			<section className='container mx-auto px-4 py-16 bg-white'>
				<div className='max-w-6xl mx-auto'>
					<h2 className='text-3xl md:text-4xl font-bold text-center mb-4'>
						4 Powerful Dashboards
					</h2>
					<p className='text-center text-gray-600 mb-12 text-lg'>
						Get a complete view of your codebase with Notion-like analytics
					</p>

					<div className='grid md:grid-cols-2 gap-6'>
						<div className='p-8 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white'>
							<div className='text-5xl font-bold opacity-50 mb-4'>01</div>
							<h3 className='text-2xl font-bold mb-2'>Overview</h3>
							<p className='opacity-90'>
								Global state, languages, file structure at a glance
							</p>
						</div>
						<div className='p-8 rounded-2xl bg-gradient-to-br from-green-500 to-green-600 text-white'>
							<div className='text-5xl font-bold opacity-50 mb-4'>02</div>
							<h3 className='text-2xl font-bold mb-2'>Evolution</h3>
							<p className='opacity-90'>
								Track growth, commits, and activity trends over time
							</p>
						</div>
						<div className='p-8 rounded-2xl bg-gradient-to-br from-purple-500 to-purple-600 text-white'>
							<div className='text-5xl font-bold opacity-50 mb-4'>03</div>
							<h3 className='text-2xl font-bold mb-2'>Quality & Productivity</h3>
							<p className='opacity-90'>
								Code quality score, complexity, and recommendations
							</p>
						</div>
						<div className='p-8 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white'>
							<div className='text-5xl font-bold opacity-50 mb-4'>04</div>
							<h3 className='text-2xl font-bold mb-2'>Contributors</h3>
							<p className='opacity-90'>
								Leaderboard, contributions, and team dynamics
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Gamification Section */}
			<section className='container mx-auto px-4 py-16'>
				<div className='max-w-6xl mx-auto'>
					<h2 className='text-3xl md:text-4xl font-bold text-center mb-4'>
						Stay Motivated with Gamification
					</h2>
					<p className='text-center text-gray-600 mb-12 text-lg'>
						Streaks, challenges, and badges to keep you coding daily
					</p>

					<div className='grid md:grid-cols-3 gap-6'>
						<div className='bg-gradient-to-br from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6 text-center'>
							<div className='text-5xl mb-4'>🔥</div>
							<h3 className='text-xl font-semibold mb-2'>Commit Streaks</h3>
							<p className='text-gray-600 text-sm'>
								Track your daily coding consistency and build momentum
							</p>
						</div>
						<div className='bg-gradient-to-br from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6 text-center'>
							<div className='text-5xl mb-4'>🎯</div>
							<h3 className='text-xl font-semibold mb-2'>Weekly Challenges</h3>
							<p className='text-gray-600 text-sm'>
								Complete challenges and push yourself to improve
							</p>
						</div>
						<div className='bg-gradient-to-br from-yellow-50 to-amber-50 border-2 border-yellow-200 rounded-xl p-6 text-center'>
							<div className='text-5xl mb-4'>🏆</div>
							<h3 className='text-xl font-semibold mb-2'>Unlock Badges</h3>
							<p className='text-gray-600 text-sm'>
								Earn achievements and showcase your progress
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className='container mx-auto px-4 py-16'>
				<div className='max-w-4xl mx-auto text-center'>
					<div className='bg-white rounded-lg border shadow-sm p-8 md:p-12'>
						<h3 className='text-3xl md:text-4xl font-bold mb-4'>
							Ready to Get Started?
						</h3>
						<p className='text-lg text-gray-600 mb-6'>
							Download CodePulse Desktop and start analyzing your codebase today. No
							account required for basic features.
						</p>
						<div className='flex flex-col sm:flex-row gap-4 justify-center'>
							<a href='/auth/signup'>
								<button className='bg-blue-600 text-white hover:bg-blue-700 px-8 py-3 rounded-md font-medium flex items-center gap-2'>
									<User className='h-5 w-5' />
									Create Account for Sync
								</button>
							</a>
							<a href={downloadUrl('mac')}>
								<button className='border border-gray-300 bg-white hover:bg-gray-50 px-8 py-3 rounded-md font-medium flex items-center gap-2'>
									<Download className='h-5 w-5' />
									Download Desktop App
								</button>
							</a>
						</div>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className='border-t bg-white mt-16'>
				<div className='container mx-auto px-4 py-8'>
					<div className='flex flex-col md:flex-row items-center justify-between gap-4'>
						<div className='flex items-center gap-2'>
							<img src='/logo.png' className='h-10 w-auto' />
							<span className='font-semibold'>CodePulse</span>
						</div>
						<div className='flex items-center gap-6 text-sm text-gray-600'>
							<a href='/privacy' className='hover:text-gray-900 transition'>
								Privacy Policy
							</a>
							<a href='/contact' className='hover:text-gray-900 transition'>
								Contact
							</a>
						</div>
					</div>
				</div>
			</footer>
		</div>
	)
}
