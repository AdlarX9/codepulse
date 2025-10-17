interface InputProps {
	type?: 'text' | 'email' | 'password' | 'number' | 'url'
	value: string
	onChange: (value: string) => void
	placeholder?: string
	disabled?: boolean
	className?: string
	label?: string
	error?: string
	required?: boolean
}

export function Input({
	type = 'text',
	value,
	onChange,
	placeholder,
	disabled,
	className = '',
	label,
	error,
	required
}: InputProps) {
	return (
		<div className='w-full'>
			{label && (
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					{label}
					{required && <span className='text-red-500 ml-1'>*</span>}
				</label>
			)}
			<input
				type={type}
				value={value}
				onChange={e => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				required={required}
				className={`
					block w-full px-3 py-2 border rounded-md shadow-sm
					focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
					disabled:bg-gray-100 disabled:cursor-not-allowed
					${error ? 'border-red-500' : 'border-gray-300'}
					${className}
				`}
			/>
			{error && <p className='mt-1 text-sm text-red-600'>{error}</p>}
		</div>
	)
}

interface TextareaProps {
	value: string
	onChange: (value: string) => void
	placeholder?: string
	disabled?: boolean
	className?: string
	label?: string
	error?: string
	required?: boolean
	rows?: number
}

export function Textarea({
	value,
	onChange,
	placeholder,
	disabled,
	className = '',
	label,
	error,
	required,
	rows = 4
}: TextareaProps) {
	return (
		<div className='w-full'>
			{label && (
				<label className='block text-sm font-medium text-gray-700 mb-1'>
					{label}
					{required && <span className='text-red-500 ml-1'>*</span>}
				</label>
			)}
			<textarea
				value={value}
				onChange={e => onChange(e.target.value)}
				placeholder={placeholder}
				disabled={disabled}
				required={required}
				rows={rows}
				className={`
					block w-full px-3 py-2 border rounded-md shadow-sm
					focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500
					disabled:bg-gray-100 disabled:cursor-not-allowed
					${error ? 'border-red-500' : 'border-gray-300'}
					${className}
				`}
			/>
			{error && <p className='mt-1 text-sm text-red-600'>{error}</p>}
		</div>
	)
}
