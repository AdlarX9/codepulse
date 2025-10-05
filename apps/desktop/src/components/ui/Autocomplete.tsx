import { useState, useRef, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button } from './Button'

interface AutocompleteProps {
	value: string
	onChange: (value: string) => void
	onAdd: () => void
	suggestions: string[]
	placeholder?: string
	className?: string
}

export function Autocomplete({
	value,
	onChange,
	onAdd,
	suggestions,
	placeholder,
	className = ''
}: AutocompleteProps) {
	const [showSuggestions, setShowSuggestions] = useState(false)
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const inputRef = useRef<HTMLInputElement>(null)
	const containerRef = useRef<HTMLDivElement>(null)

	// Filtrer les suggestions basées sur la valeur
	const filteredSuggestions = suggestions.filter(s =>
		s.toLowerCase().includes(value.toLowerCase())
	)

	// Fermer les suggestions si on clique ailleurs
	useEffect(() => {
		function handleClickOutside(event: MouseEvent) {
			if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
				setShowSuggestions(false)
			}
		}
		document.addEventListener('mousedown', handleClickOutside)
		return () => document.removeEventListener('mousedown', handleClickOutside)
	}, [])

	function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.key === 'Enter') {
			e.preventDefault()
			if (selectedIndex >= 0 && filteredSuggestions[selectedIndex]) {
				selectSuggestion(filteredSuggestions[selectedIndex])
			} else {
				onAdd()
			}
		} else if (e.key === 'ArrowDown') {
			e.preventDefault()
			setSelectedIndex(prev =>
				prev < filteredSuggestions.length - 1 ? prev + 1 : prev
			)
		} else if (e.key === 'ArrowUp') {
			e.preventDefault()
			setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1))
		} else if (e.key === 'Escape') {
			setShowSuggestions(false)
			setSelectedIndex(-1)
		}
	}

	function selectSuggestion(suggestion: string) {
		onChange(suggestion)
		setShowSuggestions(false)
		setSelectedIndex(-1)
		// Trigger add automatically
		setTimeout(() => {
			onAdd()
		}, 0)
	}

	function handleInputChange(newValue: string) {
		onChange(newValue)
		setShowSuggestions(newValue.length > 0 && filteredSuggestions.length > 0)
		setSelectedIndex(-1)
	}

	return (
		<div ref={containerRef} className='relative flex gap-2 flex-1'>
			<div className='relative flex-1'>
				<input
					ref={inputRef}
					type='text'
					value={value}
					onChange={e => handleInputChange(e.target.value)}
					onKeyDown={handleKeyDown}
					onFocus={() =>
						setShowSuggestions(value.length > 0 && filteredSuggestions.length > 0)
					}
					placeholder={placeholder}
					className={`w-full px-3 py-2 bg-background border border-input rounded-md ${className}`}
				/>

				{/* Suggestions dropdown */}
				{showSuggestions && filteredSuggestions.length > 0 && (
					<div className='absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto'>
						{filteredSuggestions.map((suggestion, index) => (
							<button
								key={suggestion}
								type='button'
								onClick={() => selectSuggestion(suggestion)}
								onMouseEnter={() => setSelectedIndex(index)}
								className={`w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors ${
									index === selectedIndex ? 'bg-accent' : ''
								}`}
							>
								{suggestion}
							</button>
						))}
					</div>
				)}
			</div>

			<Button onClick={onAdd} type='button'>
				<Plus className='h-4 w-4' />
			</Button>
		</div>
	)
}
