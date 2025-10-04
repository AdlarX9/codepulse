/**
 * Telemetry utilities for CodePulse
 * Note: Desktop app does NOT send telemetry. This is only for web download tracking.
 */

export interface TelemetryEvent {
  type: string;
  timestamp: number;
  data: Record<string, any>;
}

export class Logger {
  private prefix: string;

  constructor(prefix: string = "CodePulse") {
    this.prefix = prefix;
  }

  info(message: string, data?: any) {
    console.log(`[${this.prefix}] INFO:`, message, data || "");
  }

  warn(message: string, data?: any) {
    console.warn(`[${this.prefix}] WARN:`, message, data || "");
  }

  error(message: string, error?: any) {
    console.error(`[${this.prefix}] ERROR:`, message, error || "");
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV === "development") {
      console.debug(`[${this.prefix}] DEBUG:`, message, data || "");
    }
  }
}

export const logger = new Logger();
