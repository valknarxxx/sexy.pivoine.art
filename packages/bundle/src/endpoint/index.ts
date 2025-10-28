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
	},
};
