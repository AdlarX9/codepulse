import { type ReactNode, useState, createContext, useContext } from 'react'

interface TabsContextValue {
	activeTab: string
	setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextValue | undefined>(undefined)

interface TabsProps {
	defaultValue: string
	children: ReactNode
	className?: string
}

export function Tabs({ defaultValue, children, className = '' }: TabsProps) {
	const [activeTab, setActiveTab] = useState(defaultValue)

	return (
		<TabsContext.Provider value={{ activeTab, setActiveTab }}>
			<div className={className}>{children}</div>
		</TabsContext.Provider>
	)
}

interface TabsListProps {
	children: ReactNode
	className?: string
}

export function TabsList({ children, className = '' }: TabsListProps) {
	return <div className={`flex space-x-1 border-b border-gray-200 ${className}`}>{children}</div>
}

interface TabsTriggerProps {
	value: string
	children: ReactNode
}

export function TabsTrigger({ value, children }: TabsTriggerProps) {
	const context = useContext(TabsContext)
	if (!context) throw new Error('TabsTrigger must be used within Tabs')

	const { activeTab, setActiveTab } = context
	const isActive = activeTab === value

	return (
		<button
			onClick={() => setActiveTab(value)}
			className={`
				px-4 py-2 font-medium text-sm transition-colors relative
				${isActive ? 'text-blue-600' : 'text-gray-600 hover:text-gray-900'}
			`}
		>
			{children}
			{isActive && <div className='absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600' />}
		</button>
	)
}

interface TabsContentProps {
	value: string
	children: ReactNode
	className?: string
}

export function TabsContent({ value, children, className = '' }: TabsContentProps) {
	const context = useContext(TabsContext)
	if (!context) throw new Error('TabsContent must be used within Tabs')

	const { activeTab } = context

	if (activeTab !== value) return null

	return <div className={`pt-4 ${className}`}>{children}</div>
}
