/**
 * Server-side logging utility for sexy.pivoine.art
 * Provides structured logging with context and request tracing
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
	timestamp: string;
	level: LogLevel;
	message: string;
	context?: Record<string, unknown>;
	requestId?: string;
	userId?: string;
	path?: string;
	method?: string;
	duration?: number;
	error?: Error;
}

class Logger {
	private isDev = process.env.NODE_ENV === 'development';
	private serviceName = 'sexy.pivoine.art';

	private formatLog(ctx: LogContext): string {
		const { timestamp, level, message, context, requestId, userId, path, method, duration, error } = ctx;

		const parts = [
			`[${timestamp}]`,
			`[${level.toUpperCase()}]`,
			requestId ? `[${requestId}]` : null,
			method && path ? `${method} ${path}` : null,
			message,
			userId ? `user=${userId}` : null,
			duration !== undefined ? `${duration}ms` : null,
		].filter(Boolean);

		let logString = parts.join(' ');

		if (context && Object.keys(context).length > 0) {
			logString += ' ' + JSON.stringify(context);
		}

		if (error) {
			logString += `\n  Error: ${error.message}\n  Stack: ${error.stack}`;
		}

		return logString;
	}

	private log(level: LogLevel, message: string, meta: Partial<LogContext> = {}) {
		const timestamp = new Date().toISOString();
		const logContext: LogContext = {
			timestamp,
			level,
			message,
			...meta,
		};

		const formattedLog = this.formatLog(logContext);

		switch (level) {
			case 'debug':
				if (this.isDev) console.debug(formattedLog);
				break;
			case 'info':
				console.info(formattedLog);
				break;
			case 'warn':
				console.warn(formattedLog);
				break;
			case 'error':
				console.error(formattedLog);
				break;
		}
	}

	debug(message: string, meta?: Partial<LogContext>) {
		this.log('debug', message, meta);
	}

	info(message: string, meta?: Partial<LogContext>) {
		this.log('info', message, meta);
	}

	warn(message: string, meta?: Partial<LogContext>) {
		this.log('warn', message, meta);
	}

	error(message: string, meta?: Partial<LogContext>) {
		this.log('error', message, meta);
	}

	// Request logging helper
	request(
		method: string,
		path: string,
		meta: Partial<LogContext> = {}
	) {
		this.info('→ Request received', { method, path, ...meta });
	}

	response(
		method: string,
		path: string,
		status: number,
		duration: number,
		meta: Partial<LogContext> = {}
	) {
		const level = status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info';
		this.log(level, `← Response ${status}`, { method, path, duration, ...meta });
	}

	// Authentication logging
	auth(action: string, success: boolean, meta: Partial<LogContext> = {}) {
		this.info(`🔐 Auth: ${action} ${success ? 'success' : 'failed'}`, meta);
	}

	// Startup logging
	startup() {
		const env = {
			NODE_ENV: process.env.NODE_ENV,
			PUBLIC_API_URL: process.env.PUBLIC_API_URL,
			PUBLIC_URL: process.env.PUBLIC_URL,
			PUBLIC_UMAMI_ID: process.env.PUBLIC_UMAMI_ID ? '***set***' : 'not set',
			LETTERSPACE_API_URL: process.env.LETTERSPACE_API_URL || 'not set',
			PORT: process.env.PORT || '3000',
			HOST: process.env.HOST || '0.0.0.0',
		};

		console.log('\n' + '='.repeat(60));
		console.log('🍑 sexy.pivoine.art - Server Starting 💜');
		console.log('='.repeat(60));
		console.log('\n📋 Environment Configuration:');
		Object.entries(env).forEach(([key, value]) => {
			console.log(`  ${key}: ${value}`);
		});
		console.log('\n' + '='.repeat(60) + '\n');
	}
}

// Singleton instance
export const logger = new Logger();

// Generate request ID
export function generateRequestId(): string {
	return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
