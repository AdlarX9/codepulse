import { useState, useEffect } from 'react'

/**
 * Hook for persisting state in localStorage
 * @param key - localStorage key
 * @param initialValue - Initial value if not found in localStorage
 */
export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
	// Get initial value from localStorage or use initialValue
	const [storedValue, setStoredValue] = useState<T>(() => {
		try {
			const item = window.localStorage.getItem(key)
			return item ? JSON.parse(item) : initialValue
		} catch (error) {
			console.error(`Error loading localStorage key "${key}":`, error)
			return initialValue
		}
	})

	// Update localStorage when value changes
	useEffect(() => {
		try {
			window.localStorage.setItem(key, JSON.stringify(storedValue))
		} catch (error) {
			console.error(`Error saving localStorage key "${key}":`, error)
		}
	}, [key, storedValue])

	return [storedValue, setStoredValue]
}
