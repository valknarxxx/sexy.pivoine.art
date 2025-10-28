import { checkAchievements } from "./gamification";

const createPolicyFilter = (policy) => ({
	_or: [
		{
			policies: {
				policy: {
					name: {
						_eq: policy,
					},
				},
			},
		},
		{
			role: {
				name: {
					_eq: policy,
				},
			},
		},
	],
});

export default {
	id: "sexy",
	handler: (router, context) => {
		const { services, getSchema, database } = context;
		const { ItemsService } = services;

		router.get("/stats", async (_req, res) => {
			const usersService = new ItemsService("directus_users", {
				schema: await getSchema(),
			});
			const modelsCount = await usersService.readByQuery({
				aggregate: {
					count: ["*"],
				},
				filter: createPolicyFilter("Model"),
			});
			const viewersCount = await usersService.readByQuery({
				aggregate: {
					count: ["*"],
				},
				filter: createPolicyFilter("Viewer"),
			});

			const videosService = new ItemsService("sexy_videos", {
				schema: await getSchema(),
			});
			const videosCount = await videosService.readByQuery({
				aggregate: {
					count: ["*"],
				},
			});

			res.json({
				models_count: modelsCount[0].count,
				viewers_count: viewersCount[0].count,
				videos_count: videosCount[0].count,
			});
		});

		// GET /sexy/models - Public endpoint to fetch models (bypasses permissions)
		router.get("/models", async (req, res) => {
			try {
				const { featured, limit } = req.query;

				// Build query using Knex to bypass permissions
				let query = database
					.select("u.*")
					.from("directus_users as u")
					.leftJoin("directus_roles as r", "u.role", "r.id")
					.where("r.name", "Model")
					.orderBy("u.id", "desc");


				if (limit) {
					query = query.limit(parseInt(limit as string));
				}

				const models = await query;

				// Fetch related photos and banner for each model
				for (const model of models) {
					// Fetch photos
					const photos = await database
						.select("df.*")
						.from("sexy_model_photos as mp")
						.leftJoin("directus_files as df", "mp.directus_files_id", "df.id")
						.where("mp.directus_users_id", model.id);

					model.photos = photos.map((p) => ({ directus_files_id: p }));

					// Fetch banner
					if (model.banner) {
						const banner = await database
							.select("*")
							.from("directus_files")
							.where("id", model.banner)
							.first();
						model.banner = banner;
					}
				}

				res.json(models);
			} catch (error: any) {
				console.error("Models endpoint error:", error);
				res.status(500).json({ error: error.message || "Failed to fetch models" });
			}
		});

		// GET /sexy/models/:slug - Get single model by slug
		router.get("/models/:slug", async (req, res) => {
			try {
				const { slug } = req.params;

				const model = await database
					.select("u.*")
					.from("directus_users as u")
					.leftJoin("directus_roles as r", "u.role", "r.id")
					.where("r.name", "Model")
					.where(database.raw("LOWER(u.first_name || ' ' || u.last_name)"), slug.toLowerCase().replace(/-/g, " "))
					.first();

				if (!model) {
					return res.status(404).json({ error: "Model not found" });
				}

				// Fetch photos
				const photos = await database
					.select("df.*")
					.from("sexy_model_photos as mp")
					.leftJoin("directus_files as df", "mp.directus_files_id", "df.id")
					.where("mp.directus_users_id", model.id);

				model.photos = photos.map((p) => ({ directus_files_id: p }));

				// Fetch banner
				if (model.banner) {
					const banner = await database
						.select("*")
						.from("directus_files")
						.where("id", model.banner)
						.first();
					model.banner = banner;
				}

				res.json(model);
			} catch (error: any) {
				console.error("Model by slug error:", error);
				res.status(500).json({ error: error.message || "Failed to fetch model" });
			}
		});

		// GET /sexy/videos - List videos
		router.get("/videos", async (req, res) => {
			try {
				const { model_id, limit } = req.query;

				let query = database
					.select("v.*")
					.from("sexy_videos as v")
					.where("v.upload_date", "<=", new Date().toISOString())
					.orderBy("v.upload_date", "desc");

				if (model_id) {
					query = query
						.leftJoin("sexy_videos_models as vm", "v.id", "vm.sexy_videos_id")
						.where("vm.directus_users_id", model_id);
				}

				if (limit) {
					query = query.limit(parseInt(limit as string));
				}

				const videos = await query;

				// Fetch models and movie for each video
				for (const video of videos) {
					// Fetch models
					const models = await database
						.select("u.*")
						.from("sexy_videos_models as vm")
						.leftJoin("directus_users as u", "vm.directus_users_id", "u.id")
						.where("vm.sexy_videos_id", video.id);

					video.models = models;

					// Fetch movie file
					if (video.movie) {
						const movie = await database
							.select("*")
							.from("directus_files")
							.where("id", video.movie)
							.first();
						video.movie = movie;
					}
				}

				res.json(videos);
			} catch (error: any) {
				console.error("Videos endpoint error:", error);
				res.status(500).json({ error: error.message || "Failed to fetch videos" });
			}
		});

		// GET /sexy/articles - List articles
		router.get("/articles", async (req, res) => {
			try {
				const { featured, limit } = req.query;

				let query = database
					.select("a.*")
					.from("sexy_articles as a")
					.where("a.publish_date", "<=", new Date().toISOString())
					.orderBy("a.publish_date", "desc");

					query = query.where("a.featured", true);

				if (limit) {
					query = query.limit(parseInt(limit as string));
				}

				const articles = await query;

				// Fetch author for each article
				for (const article of articles) {
					if (article.author) {
						const author = await database
							.select("*")
							.from("directus_users")
							.where("id", article.author)
							.first();
						article.author = author;
					}
				}

				res.json(articles);
			} catch (error: any) {
				console.error("Articles endpoint error:", error);
				res.status(500).json({ error: error.message || "Failed to fetch articles" });
			}
		});

		// GET /sexy/recordings - List user's recordings
		router.get("/recordings", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const recordingsService = new ItemsService("sexy_recordings", {
				schema: await getSchema(),
				accountability,
			});

			const { status, tags, linked_video, limit, page } = req.query;
			const filter: any = {
				user_created: {
					_eq: accountability.user,
				},
			};

			if (status) filter.status = { _eq: status };
			if (tags) filter.tags = { _contains: tags };
			if (linked_video) filter.linked_video = { _eq: linked_video };

			const recordings = await recordingsService.readByQuery({
				filter,
				limit: limit ? parseInt(limit as string) : 50,
				page: page ? parseInt(page as string) : 1,
				sort: ["-date_created"],
			});

			res.json(recordings);
		});

		// GET /sexy/recordings/:id - Get single recording
		router.get("/recordings/:id", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const recordingsService = new ItemsService("sexy_recordings", {
				schema: await getSchema(),
				accountability,
			});

			try {
				const recording = await recordingsService.readOne(req.params.id);

				// Check if user owns the recording or if it's public
				if (
					recording.user_created !== accountability.user &&
					!recording.public
				) {
					return res.status(403).json({ error: "Forbidden" });
				}

				res.json(recording);
			} catch (error) {
				res.status(404).json({ error: "Recording not found" });
			}
		});

		// POST /sexy/recordings - Create new recording
		router.post("/recordings", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const recordingsService = new ItemsService("sexy_recordings", {
				schema: await getSchema(),
				accountability,
			});

			const { title, description, duration, events, device_info, tags, linked_video, status } = req.body;

			// Validate required fields
			if (!title || !duration || !events || !device_info) {
				return res.status(400).json({
					error: "Missing required fields: title, duration, events, device_info",
				});
			}

			// Validate events structure
			if (!Array.isArray(events) || events.length === 0) {
				return res.status(400).json({ error: "Events must be a non-empty array" });
			}

			// Generate slug from title
			const slug = title
				.toLowerCase()
				.replace(/[^a-z0-9]+/g, "-")
				.replace(/^-|-$/g, "");

			try {
				const recording = await recordingsService.createOne({
					title,
					description,
					slug,
					duration,
					events,
					device_info,
					tags: tags || [],
					linked_video: linked_video || null,
					status: status || "draft",
					public: false,
				});

				res.status(201).json(recording);
			} catch (error: any) {
				console.error("Failed to create recording:", error);
				res.status(500).json({
					error: error.message || "Failed to create recording",
					details: error.toString()
				});
			}
		});

		// PATCH /sexy/recordings/:id - Update recording
		router.patch("/recordings/:id", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const recordingsService = new ItemsService("sexy_recordings", {
				schema: await getSchema(),
				accountability,
			});

			try {
				const existing = await recordingsService.readOne(req.params.id);

				// Only allow owner to update
				if (existing.user_created !== accountability.user) {
					return res.status(403).json({ error: "Forbidden" });
				}

				const { title, description, tags, status, public: isPublic, linked_video } = req.body;
				const updates: any = {};

				if (title !== undefined) {
					updates.title = title;
					updates.slug = title
						.toLowerCase()
						.replace(/[^a-z0-9]+/g, "-")
						.replace(/^-|-$/g, "");
				}
				if (description !== undefined) updates.description = description;
				if (tags !== undefined) updates.tags = tags;
				if (status !== undefined) updates.status = status;
				if (isPublic !== undefined) updates.public = isPublic;
				if (linked_video !== undefined) updates.linked_video = linked_video;

				const recording = await recordingsService.updateOne(req.params.id, updates);
				res.json(recording);
			} catch (error: any) {
				res.status(500).json({ error: error.message || "Failed to update recording" });
			}
		});

		// DELETE /sexy/recordings/:id - Delete (archive) recording
		router.delete("/recordings/:id", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const recordingsService = new ItemsService("sexy_recordings", {
				schema: await getSchema(),
				accountability,
			});

			try {
				const existing = await recordingsService.readOne(req.params.id);

				// Only allow owner to delete
				if (existing.user_created !== accountability.user) {
					return res.status(403).json({ error: "Forbidden" });
				}

				// Soft delete by setting status to archived
				await recordingsService.updateOne(req.params.id, {
					status: "archived",
				});

				res.json({ success: true });
			} catch (error: any) {
				res.status(500).json({ error: error.message || "Failed to delete recording" });
			}
		});

		// POST /sexy/videos/:id/like - Like a video
		router.post("/videos/:id/like", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const videoId = req.params.id;
			const userId = accountability.user;

			try {
				const likesService = new ItemsService("sexy_video_likes", {
					schema: await getSchema(),
					accountability,
				});

				// Check if already liked
				const existing = await likesService.readByQuery({
					filter: { video_id: videoId, user_id: userId },
					limit: 1,
				});

				if (existing.length > 0) {
					return res.status(400).json({ error: "Already liked" });
				}

				// Create like
				await likesService.createOne({
					video_id: videoId,
					user_id: userId,
				});

				// Increment likes_count
				const videosService = new ItemsService("sexy_videos", {
					schema: await getSchema(),
				});
				const video = await videosService.readOne(videoId);
				await videosService.updateOne(videoId, {
					likes_count: (video.likes_count || 0) + 1,
				});

				res.json({ liked: true, likes_count: (video.likes_count || 0) + 1 });
			} catch (error: any) {
				res.status(500).json({ error: error.message || "Failed to like video" });
			}
		});

		// DELETE /sexy/videos/:id/like - Unlike a video
		router.delete("/videos/:id/like", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			const videoId = req.params.id;
			const userId = accountability.user;

			try {
				const likesService = new ItemsService("sexy_video_likes", {
					schema: await getSchema(),
					accountability,
				});

				// Find and delete like
				const existing = await likesService.readByQuery({
					filter: { video_id: videoId, user_id: userId },
					limit: 1,
				});

				if (existing.length === 0) {
					return res.status(400).json({ error: "Not liked" });
				}

				await likesService.deleteOne(existing[0].id);

				// Decrement likes_count
				const videosService = new ItemsService("sexy_videos", {
					schema: await getSchema(),
				});
				const video = await videosService.readOne(videoId);
				await videosService.updateOne(videoId, {
					likes_count: Math.max((video.likes_count || 0) - 1, 0),
				});

				res.json({ liked: false, likes_count: Math.max((video.likes_count || 0) - 1, 0) });
			} catch (error: any) {
				res.status(500).json({ error: error.message || "Failed to unlike video" });
			}
		});

		// GET /sexy/videos/:id/like-status - Get like status for a video
		router.get("/videos/:id/like-status", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.json({ liked: false });
			}

			const videoId = req.params.id;
			const userId = accountability.user;

			try {
				const likesService = new ItemsService("sexy_video_likes", {
					schema: await getSchema(),
					accountability,
				});

				const existing = await likesService.readByQuery({
					filter: { video_id: videoId, user_id: userId },
					limit: 1,
				});

				res.json({ liked: existing.length > 0 });
			} catch (error: any) {
				res.status(500).json({ error: error.message || "Failed to get like status" });
			}
		});

		// POST /sexy/videos/:id/play - Record a video play
		router.post("/videos/:id/play", async (req, res) => {
			const accountability = req.accountability;
			const videoId = req.params.id;
			const { session_id } = req.body;

			try {
				const playsService = new ItemsService("sexy_video_plays", {
					schema: await getSchema(),
				});

				const videosService = new ItemsService("sexy_videos", {
					schema: await getSchema(),
				});

				// Record play
				const play = await playsService.createOne({
					video_id: videoId,
					user_id: accountability?.user || null,
					session_id: session_id || null,
				});

				// Increment plays_count
				const video = await videosService.readOne(videoId);
				await videosService.updateOne(videoId, {
					plays_count: (video.plays_count || 0) + 1,
				});

				res.json({ success: true, play_id: play, plays_count: (video.plays_count || 0) + 1 });
			} catch (error: any) {
				res.status(500).json({ error: error.message || "Failed to record play" });
			}
		});

		// PATCH /sexy/videos/:id/play/:playId - Update play progress
		router.patch("/videos/:id/play/:playId", async (req, res) => {
			const { playId } = req.params;
			const { duration_watched, completed } = req.body;

			try {
				const playsService = new ItemsService("sexy_video_plays", {
					schema: await getSchema(),
				});

				await playsService.updateOne(playId, {
					duration_watched,
					completed,
				});

				res.json({ success: true });
			} catch (error: any) {
				res.status(500).json({ error: error.message || "Failed to update play" });
			}
		});

		// GET /sexy/analytics - Get analytics for the authenticated user's content
		router.get("/analytics", async (req, res) => {
			const accountability = req.accountability;
			if (!accountability?.user) {
				return res.status(401).json({ error: "Unauthorized" });
			}

			try {
				const userId = accountability.user;

				// Get all videos by this user
				const videosService = new ItemsService("sexy_videos", {
					schema: await getSchema(),
				});

				const videos = await videosService.readByQuery({
					filter: {
						models: {
							directus_users_id: {
								_eq: userId,
							},
						},
					},
					fields: ["id", "title", "slug", "likes_count", "plays_count", "upload_date"],
					limit: -1,
				});

				if (videos.length === 0) {
					return res.json({
						total_videos: 0,
						total_likes: 0,
						total_plays: 0,
						videos: [],
					});
				}

				const videoIds = videos.map((v) => v.id);

				// Get play analytics
				const playsService = new ItemsService("sexy_video_plays", {
					schema: await getSchema(),
				});

				const plays = await playsService.readByQuery({
					filter: {
						video_id: {
							_in: videoIds,
						},
					},
					fields: ["video_id", "date_created", "duration_watched", "completed"],
					limit: -1,
				});

				// Get like analytics
				const likesService = new ItemsService("sexy_video_likes", {
					schema: await getSchema(),
				});

				const likes = await likesService.readByQuery({
					filter: {
						video_id: {
							_in: videoIds,
						},
					},
					fields: ["video_id", "date_created"],
					limit: -1,
				});

				// Calculate totals
				const totalLikes = videos.reduce((sum, v) => sum + (v.likes_count || 0), 0);
				const totalPlays = videos.reduce((sum, v) => sum + (v.plays_count || 0), 0);

				// Group plays by date for timeline
				const playsByDate = plays.reduce((acc, play) => {
					const date = new Date(play.date_created).toISOString().split("T")[0];
					if (!acc[date]) acc[date] = 0;
					acc[date]++;
					return acc;
				}, {});

				// Group likes by date for timeline
				const likesByDate = likes.reduce((acc, like) => {
					const date = new Date(like.date_created).toISOString().split("T")[0];
					if (!acc[date]) acc[date] = 0;
					acc[date]++;
					return acc;
				}, {});

				// Video-specific analytics
				const videoAnalytics = videos.map((video) => {
					const videoPlays = plays.filter((p) => p.video_id === video.id);
					const completedPlays = videoPlays.filter((p) => p.completed).length;
					const avgWatchTime =
						videoPlays.length > 0
							? videoPlays.reduce((sum, p) => sum + (p.duration_watched || 0), 0) /
							  videoPlays.length
							: 0;

					return {
						id: video.id,
						title: video.title,
						slug: video.slug,
						upload_date: video.upload_date,
						likes: video.likes_count || 0,
						plays: video.plays_count || 0,
						completed_plays: completedPlays,
						completion_rate: video.plays_count ? (completedPlays / video.plays_count) * 100 : 0,
						avg_watch_time: Math.round(avgWatchTime),
					};
				});

				res.json({
					total_videos: videos.length,
					total_likes: totalLikes,
					total_plays: totalPlays,
					plays_by_date: playsByDate,
					likes_by_date: likesByDate,
					videos: videoAnalytics,
				});
			} catch (error: any) {
				console.error("Analytics error:", error);
				res.status(500).json({ error: error.message || "Failed to get analytics" });
			}
		});

		// =========================================
		// GAMIFICATION ENDPOINTS
		// =========================================

		// GET /sexy/gamification/leaderboard - Get top users by weighted score
		router.get("/gamification/leaderboard", async (req, res) => {
			try {
				const limit = Math.min(parseInt(req.query.limit as string) || 100, 500);
				const offset = parseInt(req.query.offset as string) || 0;

				const leaderboard = await database("sexy_user_stats as s")
					.leftJoin("directus_users as u", "s.user_id", "u.id")
					.select(
						"u.id as user_id",
						"u.artist_name as display_name",
						"u.avatar",
						"s.total_weighted_points",
						"s.total_raw_points",
						"s.recordings_count",
						"s.playbacks_count",
						"s.achievements_count",
					)
					.orderBy("s.total_weighted_points", "desc")
					.limit(limit)
					.offset(offset);

				// Add rank to each entry
				const leaderboardWithRank = leaderboard.map((entry, index) => ({
					...entry,
					rank: offset + index + 1,
				}));

				res.json({ data: leaderboardWithRank });
			} catch (error: any) {
				console.error("Leaderboard error:", error);
				res.status(500).json({ error: error.message || "Failed to get leaderboard" });
			}
		});

		// GET /sexy/gamification/user/:id - Get gamification stats for a user
		router.get("/gamification/user/:id", async (req, res) => {
			try {
				const { id } = req.params;

				// Get user stats
				const stats = await database("sexy_user_stats")
					.where({ user_id: id })
					.first();

				// Calculate rank
				let rank = 1;
				if (stats) {
					const rankResult = await database("sexy_user_stats")
						.where("total_weighted_points", ">", stats.total_weighted_points)
						.count("* as count");
					rank = (rankResult[0]?.count || 0) + 1;
				}

				// Get unlocked achievements
				const achievements = await database("sexy_user_achievements as ua")
					.leftJoin("sexy_achievements as a", "ua.achievement_id", "a.id")
					.where({ "ua.user_id": id })
					.whereNotNull("ua.date_unlocked")
					.select(
						"a.id",
						"a.code",
						"a.name",
						"a.description",
						"a.icon",
						"a.category",
						"ua.date_unlocked",
						"ua.progress",
						"a.required_count",
					)
					.orderBy("ua.date_unlocked", "desc");

				// Get recent points
				const recentPoints = await database("sexy_user_points")
					.where({ user_id: id })
					.select("action", "points", "date_created", "recording_id")
					.orderBy("date_created", "desc")
					.limit(10);

				res.json({
					stats: stats ? { ...stats, rank } : null,
					achievements,
					recent_points: recentPoints,
				});
			} catch (error: any) {
				console.error("User gamification error:", error);
				res.status(500).json({ error: error.message || "Failed to get user gamification data" });
			}
		});

		// GET /sexy/gamification/achievements - Get all achievements
		router.get("/gamification/achievements", async (req, res) => {
			try {
				const achievements = await database("sexy_achievements")
					.where({ status: "published" })
					.select(
						"id",
						"code",
						"name",
						"description",
						"icon",
						"category",
						"required_count",
						"points_reward",
					)
					.orderBy("sort", "asc");

				res.json({ data: achievements });
			} catch (error: any) {
				console.error("Achievements error:", error);
				res.status(500).json({ error: error.message || "Failed to get achievements" });
			}
		});

		// POST /sexy/recordings/:id/play - Record a recording play (with gamification)
		router.post("/recordings/:id/play", async (req, res) => {
			const accountability = req.accountability;
			const recordingId = req.params.id;

			try {
				// Get recording to check ownership
				const recording = await database("sexy_recordings")
					.where({ id: recordingId })
					.first();

				if (!recording) {
					return res.status(404).json({ error: "Recording not found" });
				}

				// Record play
				const play = await database("sexy_recording_plays").insert({
					user_id: accountability?.user || null,
					recording_id: recordingId,
					duration_played: 0,
					completed: false,
					date_created: new Date(),
				}).returning("id");

				const playId = play[0]?.id || play[0];

				// Award points if user is authenticated and not playing own recording
				if (accountability?.user && recording.user_created !== accountability.user) {
					const { awardPoints, POINT_VALUES } = await import("./gamification");
					await awardPoints(database, accountability.user, "RECORDING_PLAY", recordingId);
					await checkAchievements(database, accountability.user, "playback");
				}

				res.json({ success: true, play_id: playId });
			} catch (error: any) {
				console.error("Recording play error:", error);
				res.status(500).json({ error: error.message || "Failed to record play" });
			}
		});

		// PATCH /sexy/recordings/:id/play/:playId - Update play progress (with gamification)
		router.patch("/recordings/:id/play/:playId", async (req, res) => {
			const { playId } = req.params;
			const { duration_played, completed } = req.body;
			const accountability = req.accountability;

			try {
				// Get existing play record
				const existingPlay = await database("sexy_recording_plays")
					.where({ id: playId })
					.first();

				if (!existingPlay) {
					return res.status(404).json({ error: "Play record not found" });
				}

				const wasCompleted = existingPlay.completed;

				// Update play record
				await database("sexy_recording_plays")
					.where({ id: playId })
					.update({
						duration_played,
						completed,
						date_updated: new Date(),
					});

				// Award completion points if newly completed
				if (completed && !wasCompleted && accountability?.user) {
					const { awardPoints } = await import("./gamification");
					await awardPoints(database, accountability.user, "RECORDING_COMPLETE", existingPlay.recording_id);
					await checkAchievements(database, accountability.user, "playback");
				}

				res.json({ success: true });
			} catch (error: any) {
				console.error("Update play error:", error);
				res.status(500).json({ error: error.message || "Failed to update play" });
			}
		});

		// GET /sexy/community-recordings - List community shared recordings
		router.get("/community-recordings", async (req, res) => {
			try {
				const limit = parseInt(req.query.limit as string) || 50;
				const offset = parseInt(req.query.offset as string) || 0;

				const recordingsService = new ItemsService("sexy_recordings", {
					schema: await getSchema(),
					accountability: null, // Public endpoint, no auth required
					knex: database,
				});

				const recordings = await recordingsService.readByQuery({
					filter: {
						status: { _eq: "published" },
						public: { _eq: true },
					},
					fields: [
						"id",
						"title",
						"description",
						"slug",
						"duration",
						"tags",
						"date_created",
						"user_created.id",
						"user_created.first_name",
						"user_created.last_name",
						"user_created.avatar",
					],
					limit,
					offset,
					sort: ["-date_created"],
				});

				res.json({ data: recordings });
			} catch (error: any) {
				console.error("List community recordings error:", error);
				res.status(500).json({ error: error.message || "Failed to list community recordings" });
			}
		});

		// POST /sexy/recordings/:id/duplicate - Duplicate a community recording to current user
		router.post("/recordings/:id/duplicate", async (req, res) => {
			try {
				const accountability = req.accountability;
				if (!accountability?.user) {
					return res.status(401).json({ error: "Authentication required" });
				}

				const recordingId = req.params.id;

				// Fetch the original recording
				const schema = await getSchema();
				const recordingsService = new ItemsService("sexy_recordings", {
					schema,
					accountability: null, // Need to read any public recording
					knex: database,
				});

				const originalRecording = await recordingsService.readOne(recordingId, {
					fields: [
						"id",
						"title",
						"description",
						"duration",
						"events",
						"device_info",
						"tags",
						"status",
						"public",
					],
				});

				// Verify it's a published, public recording
				if (originalRecording.status !== "published" || !originalRecording.public) {
					return res.status(403).json({ error: "Recording is not publicly shared" });
				}

				// Create duplicate with current user's accountability
				const userRecordingsService = new ItemsService("sexy_recordings", {
					schema,
					accountability,
					knex: database,
				});

				// Generate unique slug
				const baseSlug = originalRecording.title
					.toLowerCase()
					.replace(/[^a-z0-9]+/g, "-")
					.replace(/^-|-$/g, "");
				const timestamp = Date.now();
				const slug = `${baseSlug}-copy-${timestamp}`;

				const duplicatedRecording = await userRecordingsService.createOne({
					title: `${originalRecording.title} (Copy)`,
					description: originalRecording.description,
					slug,
					duration: originalRecording.duration,
					events: originalRecording.events,
					device_info: originalRecording.device_info,
					tags: originalRecording.tags || [],
					status: "draft",
					public: false,
					original_recording_id: recordingId,
				});

				res.status(201).json({ data: duplicatedRecording });
			} catch (error: any) {
				console.error("Duplicate recording error:", error);
				res.status(500).json({ error: error.message || "Failed to duplicate recording" });
			}
		});
	},
};
