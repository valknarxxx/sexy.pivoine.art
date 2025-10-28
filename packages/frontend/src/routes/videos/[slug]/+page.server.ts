import { error } from "@sveltejs/kit";
import { getCommentsForVideo, getVideoBySlug, getVideoLikeStatus } from "$lib/services.js";

export async function load({ fetch, params, locals }) {
	const video = await getVideoBySlug(params.slug, fetch);
	const comments = await getCommentsForVideo(video.id, fetch);

	let likeStatus = { liked: false };
	if (locals.authStatus.authenticated) {
		try {
			likeStatus = await getVideoLikeStatus(video.id, fetch);
		} catch (error) {
			console.error("Failed to get like status:", error);
		}
	}

	try {
		return {
			video,
			comments,
			authStatus: locals.authStatus,
			likeStatus
		};
	} catch {
		error(404, "Video not found");
	}
}
