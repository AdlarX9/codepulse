import { useState, useEffect } from 'react'

/**
 * Debounce a value to prevent excessive re-renders
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (default: 500)
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
	const [debouncedValue, setDebouncedValue] = useState<T>(value)

	useEffect(() => {
		// Set up timeout to update debounced value
		const handler = setTimeout(() => {
			setDebouncedValue(value)
		}, delay)

		// Clean up timeout if value changes or component unmounts
		return () => {
			clearTimeout(handler)
		}
	}, [value, delay])

	return debouncedValue
}
