import { redirect } from "@sveltejs/kit";
import { getAnalytics, getFolders, getRecordings } from "$lib/services";
import { isModel } from "$lib/directus";

export async function load({ locals, fetch }) {
	// Redirect to login if not authenticated
	if (!locals.authStatus.authenticated) {
		throw redirect(302, "/login");
	}

	const recordings = await getRecordings(fetch).catch(() => []);

	const analytics = isModel(locals.authStatus.user)
		? await getAnalytics(fetch).catch(() => null)
		: null;

	const folders = await getFolders(fetch).catch(() => []);

	return {
		authStatus: locals.authStatus,
		folders,
		recordings,
		analytics,
	};
}
