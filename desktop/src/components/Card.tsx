import { useMainContext } from '@/navigation/MainContext'
import { HTMLAttributes, forwardRef } from 'react'

export const Card = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => <div ref={ref} className={className} {...props} />
)

Card.displayName = 'Card'

export const CardHeader = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => {
		const { cn } = useMainContext()
		return (
			<div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />
		)
	}
)

CardHeader.displayName = 'CardHeader'

export const CardTitle = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLHeadingElement>>(
	({ className, ...props }, ref) => {
		const { cn } = useMainContext()
		return (
			<h3
				ref={ref}
				className={cn('text-2xl font-semibold leading-none tracking-tight', className)}
				{...props}
			/>
		)
	}
)

CardTitle.displayName = 'CardTitle'

export const CardDescription = forwardRef<
	HTMLParagraphElement,
	HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => {
	const { cn } = useMainContext()
	return <p ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />
})

CardDescription.displayName = 'CardDescription'

export const CardContent = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
	({ className, ...props }, ref) => {
		const { cn } = useMainContext()
		return (
			<div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
		)
	}
)

CardContent.displayName = 'CardContent'
