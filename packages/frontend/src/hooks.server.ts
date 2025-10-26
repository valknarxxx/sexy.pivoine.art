import { isAuthenticated } from "$lib/services";
import { logger, generateRequestId } from "$lib/logger";
import type { Handle } from "@sveltejs/kit";

// Log startup info once
let hasLoggedStartup = false;
if (!hasLoggedStartup) {
	logger.startup();
	hasLoggedStartup = true;
}

export const handle: Handle = async ({ event, resolve }) => {
	const { cookies, locals, url, request } = event;
	const startTime = Date.now();

	// Generate unique request ID
	const requestId = generateRequestId();

	// Add request ID to locals for access in other handlers
	locals.requestId = requestId;

	// Log incoming request
	logger.request(request.method, url.pathname, {
		requestId,
		context: {
			userAgent: request.headers.get('user-agent')?.substring(0, 100),
			referer: request.headers.get('referer'),
			ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
		},
	});

	// Handle authentication
	const token = cookies.get("directus_session_token");

	if (token) {
		try {
			locals.authStatus = await isAuthenticated(token);

			if (locals.authStatus.authenticated) {
				logger.auth('Token validated', true, {
					requestId,
					userId: locals.authStatus.user?.id,
					context: {
						email: locals.authStatus.user?.email,
						role: locals.authStatus.user?.role?.name,
					},
				});
			} else {
				logger.auth('Token invalid', false, { requestId });
			}
		} catch (error) {
			logger.error('Authentication check failed', {
				requestId,
				error: error instanceof Error ? error : new Error(String(error)),
			});
			locals.authStatus = { authenticated: false };
		}
	} else {
		logger.debug('No session token found', { requestId });
		locals.authStatus = { authenticated: false };
	}

	// Resolve the request
	let response: Response;
	try {
		response = await resolve(event, {
			filterSerializedResponseHeaders: (key) => {
				return key.toLowerCase() === "content-type";
			},
		});
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error('Request handler error', {
			requestId,
			method: request.method,
			path: url.pathname,
			duration,
			error: error instanceof Error ? error : new Error(String(error)),
		});
		throw error;
	}

	// Log response
	const duration = Date.now() - startTime;
	logger.response(request.method, url.pathname, response.status, duration, {
		requestId,
		userId: locals.authStatus.authenticated ? locals.authStatus.user?.id : undefined,
		context: {
			cached: response.headers.get('x-sveltekit-page') === 'true',
		},
	});

	// Add request ID to response headers (useful for debugging)
	response.headers.set('x-request-id', requestId);

	return response;
};
