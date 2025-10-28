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
		const { services, getSchema } = context;
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
	},
};
