/**
 * Gamification Helper Functions
 * Handles points, achievements, and user stats for recording-focused gamification system
 */

import type { Knex } from "knex";

/**
 * Point values for different actions
 */
export const POINT_VALUES = {
	RECORDING_CREATE: 50,
	RECORDING_PLAY: 10,
	RECORDING_COMPLETE: 5,
	COMMENT_CREATE: 5,
	RECORDING_FEATURED: 100,
} as const;

/**
 * Time decay constant for weighted scoring
 * λ = 0.005 means ~14% decay per month
 */
const DECAY_LAMBDA = 0.005;

/**
 * Award points to a user for a specific action
 */
export async function awardPoints(
	database: Knex,
	userId: string,
	action: keyof typeof POINT_VALUES,
	recordingId?: string,
): Promise<void> {
	const points = POINT_VALUES[action];

	await database("sexy_user_points").insert({
		user_id: userId,
		action,
		points,
		recording_id: recordingId || null,
		date_created: new Date(),
	});

	// Update cached stats
	await updateUserStats(database, userId);
}

/**
 * Calculate time-weighted score using exponential decay
 * Score = Σ (points × e^(-λ × age_in_days))
 */
export async function calculateWeightedScore(
	database: Knex,
	userId: string,
): Promise<number> {
	const now = new Date();

	const result = await database("sexy_user_points")
		.where({ user_id: userId })
		.select(
			database.raw(`
				SUM(
					points * EXP(-${DECAY_LAMBDA} * EXTRACT(EPOCH FROM (? - date_created)) / 86400)
				) as weighted_score
			`, [now]),
		);

	return result[0]?.weighted_score || 0;
}

/**
 * Update or create user stats cache
 */
export async function updateUserStats(database: Knex, userId: string): Promise<void> {
	const now = new Date();

	// Calculate raw points
	const rawPointsResult = await database("sexy_user_points")
		.where({ user_id: userId })
		.sum("points as total");
	const totalRawPoints = rawPointsResult[0]?.total || 0;

	// Calculate weighted points
	const totalWeightedPoints = await calculateWeightedScore(database, userId);

	// Get recordings count
	const recordingsResult = await database("sexy_recordings")
		.where({ user_created: userId, status: "published" })
		.count("* as count");
	const recordingsCount = recordingsResult[0]?.count || 0;

	// Get playbacks count (excluding own recordings)
	const playbacksResult = await database("sexy_recording_plays")
		.where({ user_id: userId })
		.whereNotIn("recording_id", function () {
			this.select("id").from("sexy_recordings").where("user_created", userId);
		})
		.count("* as count");
	const playbacksCount = playbacksResult[0]?.count || 0;

	// Get comments count (on recordings only)
	const commentsResult = await database("comments")
		.where({ user_created: userId, collection: "sexy_recordings" })
		.count("* as count");
	const commentsCount = commentsResult[0]?.count || 0;

	// Get achievements count
	const achievementsResult = await database("sexy_user_achievements")
		.where({ user_id: userId })
		.whereNotNull("date_unlocked")
		.count("* as count");
	const achievementsCount = achievementsResult[0]?.count || 0;

	// Upsert stats
	const existing = await database("sexy_user_stats")
		.where({ user_id: userId })
		.first();

	if (existing) {
		await database("sexy_user_stats")
			.where({ user_id: userId })
			.update({
				total_raw_points: totalRawPoints,
				total_weighted_points: totalWeightedPoints,
				recordings_count: recordingsCount,
				playbacks_count: playbacksCount,
				comments_count: commentsCount,
				achievements_count: achievementsCount,
				last_updated: now,
			});
	} else {
		await database("sexy_user_stats").insert({
			user_id: userId,
			total_raw_points: totalRawPoints,
			total_weighted_points: totalWeightedPoints,
			recordings_count: recordingsCount,
			playbacks_count: playbacksCount,
			comments_count: commentsCount,
			achievements_count: achievementsCount,
			last_updated: now,
		});
	}
}

/**
 * Check and update achievement progress for a user
 */
export async function checkAchievements(
	database: Knex,
	userId: string,
	category?: string,
): Promise<void> {
	// Get all achievements (optionally filtered by category)
	let achievementsQuery = database("sexy_achievements")
		.where({ status: "published" });

	if (category) {
		achievementsQuery = achievementsQuery.where({ category });
	}

	const achievements = await achievementsQuery;

	for (const achievement of achievements) {
		const progress = await getAchievementProgress(database, userId, achievement);

		// Check if already unlocked
		const existing = await database("sexy_user_achievements")
			.where({ user_id: userId, achievement_id: achievement.id })
			.first();

		const isUnlocked = progress >= achievement.required_count;
		const wasUnlocked = existing?.date_unlocked !== null;

		if (existing) {
			// Update progress
			await database("sexy_user_achievements")
				.where({ user_id: userId, achievement_id: achievement.id })
				.update({
					progress,
					date_unlocked: isUnlocked ? (existing.date_unlocked || new Date()) : null,
				});
		} else {
			// Insert new progress
			await database("sexy_user_achievements").insert({
				user_id: userId,
				achievement_id: achievement.id,
				progress,
				date_unlocked: isUnlocked ? new Date() : null,
			});
		}

		// Award bonus points if newly unlocked
		if (isUnlocked && !wasUnlocked && achievement.points_reward > 0) {
			await database("sexy_user_points").insert({
				user_id: userId,
				action: `ACHIEVEMENT_${achievement.code}`,
				points: achievement.points_reward,
				recording_id: null,
				date_created: new Date(),
			});

			// Refresh stats after awarding bonus
			await updateUserStats(database, userId);
		}
	}
}

/**
 * Get progress for a specific achievement
 */
async function getAchievementProgress(
	database: Knex,
	userId: string,
	achievement: any,
): Promise<number> {
	const { code } = achievement;

	// Recordings achievements
	if (code === "first_recording" || code === "recording_10" || code === "recording_50" || code === "recording_100") {
		const result = await database("sexy_recordings")
			.where({ user_created: userId, status: "published" })
			.count("* as count");
		return result[0]?.count || 0;
	}

	// Featured recording
	if (code === "featured_recording") {
		const result = await database("sexy_recordings")
			.where({ user_created: userId, status: "published", featured: true })
			.count("* as count");
		return result[0]?.count || 0;
	}

	// Playback achievements (excluding own recordings)
	if (code === "first_play" || code === "play_100" || code === "play_500") {
		const result = await database("sexy_recording_plays as rp")
			.leftJoin("sexy_recordings as r", "rp.recording_id", "r.id")
			.where({ "rp.user_id": userId })
			.where("r.user_created", "!=", userId)
			.count("* as count");
		return result[0]?.count || 0;
	}

	// Completionist achievements
	if (code === "completionist_10" || code === "completionist_100") {
		const result = await database("sexy_recording_plays")
			.where({ user_id: userId, completed: true })
			.count("* as count");
		return result[0]?.count || 0;
	}

	// Social achievements
	if (code === "first_comment" || code === "comment_50" || code === "comment_250") {
		const result = await database("comments")
			.where({ user_created: userId, collection: "sexy_recordings" })
			.count("* as count");
		return result[0]?.count || 0;
	}

	// Special: Early adopter (joined in first month)
	if (code === "early_adopter") {
		const user = await database("directus_users")
			.where({ id: userId })
			.first();

		if (user) {
			const joinDate = new Date(user.date_created);
			const platformLaunch = new Date("2025-01-01"); // Adjust to actual launch date
			const oneMonthAfterLaunch = new Date(platformLaunch);
			oneMonthAfterLaunch.setMonth(oneMonthAfterLaunch.getMonth() + 1);

			return joinDate <= oneMonthAfterLaunch ? 1 : 0;
		}
	}

	// Special: One year anniversary
	if (code === "one_year") {
		const user = await database("directus_users")
			.where({ id: userId })
			.first();

		if (user) {
			const joinDate = new Date(user.date_created);
			const oneYearAgo = new Date();
			oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

			return joinDate <= oneYearAgo ? 1 : 0;
		}
	}

	// Special: Balanced creator (50 recordings + 100 plays)
	if (code === "balanced_creator") {
		const recordings = await database("sexy_recordings")
			.where({ user_created: userId, status: "published" })
			.count("* as count");
		const plays = await database("sexy_recording_plays as rp")
			.leftJoin("sexy_recordings as r", "rp.recording_id", "r.id")
			.where({ "rp.user_id": userId })
			.where("r.user_created", "!=", userId)
			.count("* as count");

		const recordingsCount = recordings[0]?.count || 0;
		const playsCount = plays[0]?.count || 0;

		return (recordingsCount >= 50 && playsCount >= 100) ? 1 : 0;
	}

	// Special: Top 10 rank
	if (code === "top_10_rank") {
		const userStats = await database("sexy_user_stats")
			.where({ user_id: userId })
			.first();

		if (!userStats) return 0;

		const rank = await database("sexy_user_stats")
			.where("total_weighted_points", ">", userStats.total_weighted_points)
			.count("* as count");

		const userRank = (rank[0]?.count || 0) + 1;
		return userRank <= 10 ? 1 : 0;
	}

	return 0;
}

/**
 * Recalculate all weighted scores (for cron job)
 */
export async function recalculateAllWeightedScores(database: Knex): Promise<void> {
	const users = await database("sexy_user_stats").select("user_id");

	for (const user of users) {
		await updateUserStats(database, user.user_id);
	}
}
