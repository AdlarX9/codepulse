import { consoleOverlayBus, ConsoleLevel } from './lib/consoleOverlayBus'

// Check activation: DEV or VITE_CONSOLE_OVERLAY=true
const isEnabled = import.meta.env.DEV || import.meta.env.VITE_CONSOLE_OVERLAY === 'true'

if (isEnabled) {
	const levels: ConsoleLevel[] = ['log', 'info', 'warn', 'error', 'debug']
	const original = {
		log: console.log,
		info: console.info,
		warn: console.warn,
		error: console.error,
		debug: console.debug
	}

	levels.forEach(level => {
		console[level] = (...args: unknown[]) => {
			original[level](...args)
			consoleOverlayBus.emit({
				id: crypto.randomUUID(),
				level,
				text: serializeArgs(args),
				rawArgs: args,
				timestamp: Date.now()
			})
		}
	})

	// Global toggle API
	;(window as any).__consoleOverlay = {
		toggle(enabled: boolean) {
			if (enabled) {
				Object.assign(console, original)
			} else {
				levels.forEach(level => {
					console[level] = original[level]
				})
			}
		}
	}
}

function serializeArgs(args: unknown[]): string {
	try {
		const json = JSON.stringify(args, (_key, value) => {
			if (value instanceof Error) {
				return {
					name: value.name,
					message: value.message,
					stack: value.stack
				}
			}
			return value
		})
		return json.length > 2000 ? json.slice(0, 2000) + '...' : json
	} catch {
		return String(args)
	}
}
