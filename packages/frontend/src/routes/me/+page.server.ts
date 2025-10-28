import { getFolders, getRecordings } from "$lib/services";

export async function load({ locals, fetch }) {
	const recordings = locals.authStatus.authenticated
		? await getRecordings(fetch).catch(() => [])
		: [];

	return {
		authStatus: locals.authStatus,
		folders: await getFolders(fetch),
		recordings,
	};
}
