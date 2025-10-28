import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ params, locals, fetch }) => {
	// Guard: Redirect to login if not authenticated
	if (!locals.authStatus.authenticated) {
		throw redirect(302, "/login");
	}

	const { id } = params;

	try {
		// Fetch user profile data from Directus
		const userResponse = await fetch(`/api/users/${id}?fields=id,first_name,last_name,email,description,avatar,date_created,location`);

		if (!userResponse.ok) {
			throw redirect(404, "/");
		}

		const userData = await userResponse.json();
		const user = userData.data;

		// Fetch user's comments count
		const commentsResponse = await fetch(`/api/comments?filter[user_created][_eq]=${id}&aggregate[count]=*`);
		const commentsData = await commentsResponse.json();
		const commentsCount = commentsData.data?.[0]?.count || 0;

		// Fetch user's video likes count
		const likesResponse = await fetch(`/api/items/sexy_video_likes?filter[user_id][_eq]=${id}&aggregate[count]=*`);
		const likesData = await likesResponse.json();
		const likesCount = likesData.data?.[0]?.count || 0;

		// Fetch gamification data
		const gamificationResponse = await fetch(`/api/sexy/gamification/user/${id}`);
		let gamification = null;
		if (gamificationResponse.ok) {
			gamification = await gamificationResponse.json();
		}

		return {
			user,
			stats: {
				comments_count: commentsCount,
				likes_count: likesCount,
			},
			gamification,
			isOwnProfile: locals.authStatus.user?.id === id,
		};
	} catch (error) {
		console.error("Failed to load user profile:", error);
		throw redirect(404, "/");
	}
};
