export type ConsoleLevel = 'log' | 'info' | 'warn' | 'error' | 'debug'

export interface ConsoleLogPayload {
	id: string
	level: ConsoleLevel
	text: string
	rawArgs: unknown[]
	timestamp: number
}

class ConsoleOverlayBus extends EventTarget {
	private static EVENT_NAME = 'console-log'
	private listeners: Set<(payload: ConsoleLogPayload) => void> = new Set()

	emit(payload: ConsoleLogPayload): void {
		this.dispatchEvent(new CustomEvent(ConsoleOverlayBus.EVENT_NAME, { detail: payload }))
	}

	listen(callback: (payload: ConsoleLogPayload) => void): void {
		const handler = (e: Event) => {
			const customEvent = e as CustomEvent<ConsoleLogPayload>
			callback(customEvent.detail)
		}

		this.addEventListener(ConsoleOverlayBus.EVENT_NAME, handler)
		this.listeners.add(callback)
	}

	unlisten(callback: (payload: ConsoleLogPayload) => void): void {
		const handler = (e: Event) => {
			const customEvent = e as CustomEvent<ConsoleLogPayload>
			callback(customEvent.detail)
		}

		this.removeEventListener(ConsoleOverlayBus.EVENT_NAME, handler)
		this.listeners.delete(callback)
	}

	destroy(): void {
		this.listeners.clear()
	}
}

export const consoleOverlayBus = new ConsoleOverlayBus()
