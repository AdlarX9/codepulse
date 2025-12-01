'use client'

import Link from 'next/link'

export default function Header() {
	return (
		<header className='border-b bg-white'>
			<div className='container mx-auto px-4 py-4 flex items-center justify-between'>
				<Link href='/' className='flex items-center gap-2'>
					<img src='/logo.png' className='h-12 w-auto' />
					<span className='text-2xl font-bold'>CodePulse</span>
				</Link>
			</div>
		</header>
	)
}
