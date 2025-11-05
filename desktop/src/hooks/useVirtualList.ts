import { useState, useRef } from 'react'

interface UseVirtualListOptions {
	itemHeight: number
	containerHeight: number
	overscan?: number
}

/**
 * Hook for virtualizing long lists (performance optimization)
 * @param itemCount - Total number of items
 * @param options - Virtualization options
 */
export function useVirtualList(itemCount: number, options: UseVirtualListOptions) {
	const { itemHeight, containerHeight, overscan = 3 } = options
	const [scrollTop, setScrollTop] = useState(0)
	const containerRef = useRef<HTMLDivElement>(null)

	// Calculate visible range
	const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
	const endIndex = Math.min(
		itemCount - 1,
		Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
	)

	const visibleItems = Array.from({ length: endIndex - startIndex + 1 }, (_, i) => startIndex + i)

	// Total height for scrolling
	const totalHeight = itemCount * itemHeight

	// Offset for positioning
	const offsetY = startIndex * itemHeight

	// Handle scroll
	const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
		setScrollTop(e.currentTarget.scrollTop)
	}

	return {
		containerRef,
		visibleItems,
		totalHeight,
		offsetY,
		handleScroll,
		startIndex,
		endIndex
	}
}
