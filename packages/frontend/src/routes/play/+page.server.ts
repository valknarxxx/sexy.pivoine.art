import { getRecording } from "$lib/services";

export async function load({ locals, url, fetch }) {
	const recordingId = url.searchParams.get("recording");

	let recording = null;
	if (recordingId && locals.authStatus.authenticated) {
		try {
			recording = await getRecording(recordingId, fetch);
		} catch (error) {
			console.error("Failed to load recording:", error);
		}
	}

	return {
		authStatus: locals.authStatus,
		recording,
	};
}
