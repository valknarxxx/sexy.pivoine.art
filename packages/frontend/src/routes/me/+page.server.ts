import { getAnalytics, getFolders, getRecordings } from "$lib/services";
import { isModel } from "$lib/directus";

export async function load({ locals, fetch }) {
	const recordings = locals.authStatus.authenticated
		? await getRecordings(fetch).catch(() => [])
		: [];

	const analytics =
		locals.authStatus.authenticated && isModel(locals.authStatus.user)
			? await getAnalytics(fetch).catch(() => null)
			: null;

	return {
		authStatus: locals.authStatus,
		folders: await getFolders(fetch),
		recordings,
		analytics,
	};
}
