import { type ReactNode } from 'react'

interface SidebarProps {
	children: ReactNode
}

export function Sidebar({ children }: SidebarProps) {
	return (
		<aside className='w-64 bg-gray-50 border-r text-gray-900 flex-shrink-0 flex flex-col'>
			{children}
		</aside>
	)
}

interface SidebarHeaderProps {
	children: ReactNode
}

export function SidebarHeader({ children }: SidebarHeaderProps) {
	return <div className='p-4 border-b border-gray-200'>{children}</div>
}

interface SidebarBodyProps {
	children: ReactNode
}

export function SidebarBody({ children }: SidebarBodyProps) {
	return <nav className='flex-1 overflow-y-auto p-4'>{children}</nav>
}

interface SidebarFooterProps {
	children: ReactNode
}

export function SidebarFooter({ children }: SidebarFooterProps) {
	return <div className='p-4 border-t border-gray-200'>{children}</div>
}

interface SidebarItemProps {
	icon?: ReactNode
	label: string
	active?: boolean
	onClick?: () => void
	badge?: string | number
}

export function SidebarItem({ icon, label, active, onClick, badge }: SidebarItemProps) {
	return (
		<button
			onClick={onClick}
			className={`
				w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1
				${active ? 'bg-blue-400 text-white' : 'text-gray-900 hover:bg-gray-100 hover:text-black'}
			`}
		>
			{icon && <span className='flex-shrink-0'>{icon}</span>}
			<span className='flex-1 text-left text-sm font-medium'>{label}</span>
			{badge !== undefined && (
				<span className='px-2 py-0.5 text-xs font-medium bg-gray-200 rounded-full'>
					{badge}
				</span>
			)}
		</button>
	)
}

interface SidebarSectionProps {
	title: string
	children: ReactNode
}

export function SidebarSection({ title, children }: SidebarSectionProps) {
	return (
		<div className='mb-6'>
			<h3 className='text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-3'>
				{title}
			</h3>
			{children}
		</div>
	)
}
