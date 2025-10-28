import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async ({ fetch, url, locals }) => {
	// Guard: Redirect to login if not authenticated
	if (!locals.authStatus.authenticated) {
		throw redirect(302, "/login");
	}

	try {
		const limit = parseInt(url.searchParams.get("limit") || "100");
		const offset = parseInt(url.searchParams.get("offset") || "0");

		const response = await fetch(
			`/api/sexy/gamification/leaderboard?limit=${limit}&offset=${offset}`,
		);

		if (!response.ok) {
			throw new Error("Failed to fetch leaderboard");
		}

		const data = await response.json();

		return {
			leaderboard: data.data || [],
			pagination: {
				limit,
				offset,
				hasMore: data.data?.length === limit,
			},
		};
	} catch (error) {
		console.error("Leaderboard load error:", error);
		return {
			leaderboard: [],
			pagination: {
				limit: 100,
				offset: 0,
				hasMore: false,
			},
		};
	}
};
