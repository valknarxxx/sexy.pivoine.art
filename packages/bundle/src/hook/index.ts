import { createRequire } from "module";
global.require = createRequire(import.meta.url);
import { defineHook } from "@directus/extensions-sdk";
import slugify from "@sindresorhus/slugify";
import ffmpeg from "fluent-ffmpeg";
import { awardPoints, checkAchievements } from "../endpoint/gamification.js";

async function processVideo(
	meta,
	{ schema, accountability },
	services,
	logger,
) {
	const { FilesService } = services;
	const itemId = meta.key;
	const videoPath = `/directus/uploads/${meta.payload.filename_disk}`; // Adjust path as needed
	const videoService = new FilesService({ schema, accountability }); // Replace with your collection name

	try {
		const durationInSeconds = await new Promise((resolve, reject) => {
			ffmpeg.ffprobe(videoPath, function (err, metadata) {
				if (err) {
					reject(err);
				}
				resolve(parseInt(metadata.format.duration));
			});
		});
		// Update the item with the duration
		await videoService.updateOne(itemId, { duration: durationInSeconds });
		logger.info(`Video ${itemId} duration updated to ${durationInSeconds}`);
	} catch (error) {
		logger.error(`Error processing video ${itemId}:`, error);
	}
}

export default defineHook(async ({ filter, action }, { services, logger, database, getSchema }) => {
	action("files.upload", async (meta, context) => {
		await processVideo(meta, context, services, logger);
	});

	filter(
		"users.create",
		(payload: {
			first_name: string;
			last_name: string;
			artist_name: string;
			slug: string;
		}) => {
			const artist_name = `${payload.first_name}-${new Date().getTime()}`;
			const slug = slugify(artist_name);
			const join_date = new Date();
			return { ...payload, artist_name, slug, join_date };
		},
	);

	filter(
		"users.update",
		(payload: {
			first_name: string;
			last_name: string;
			artist_name: string;
			slug: string;
		}) => {
			if (payload.artist_name) {
				const slug = slugify(payload.artist_name);
				return { ...payload, slug };
			}
			return payload;
		},
	);

	// =========================================
	// GAMIFICATION HOOKS
	// =========================================

	// Hook: Award points when recording is published
	action("items.create", async (meta, { collection, accountability }) => {
		if (collection === "sexy_recordings") {
			const { payload, key } = meta;

			// Award points if recording is published
			if (payload.status === "published" && accountability?.user) {
				try {
					await awardPoints(database, accountability.user, "RECORDING_CREATE", key);
					await checkAchievements(database, accountability.user, "recordings");
					logger.info(`Awarded RECORDING_CREATE points to user ${accountability.user}`);
				} catch (error) {
					logger.error("Failed to award recording creation points:", error);
				}
			}
		}
	});

	// Hook: Award points when recording status changes to published or featured
	action("items.update", async (meta, { collection, accountability, schema }) => {
		if (collection === "sexy_recordings") {
			const { payload, keys } = meta;

			try {
				const { ItemsService } = services;
				const recordingsService = new ItemsService("sexy_recordings", {
					schema: await getSchema(),
				});

				for (const key of keys) {
					const recording = await recordingsService.readOne(key);

					// Award points if status changed from non-published to published
					if (payload.status === "published" && recording.status !== "published" && recording.user_created) {
						await awardPoints(database, recording.user_created, "RECORDING_CREATE", key);
						await checkAchievements(database, recording.user_created, "recordings");
						logger.info(`Awarded RECORDING_CREATE points to user ${recording.user_created}`);
					}

					// Award bonus points if recording becomes featured
					if (payload.featured === true && !recording.featured && recording.user_created) {
						await awardPoints(database, recording.user_created, "RECORDING_FEATURED", key);
						await checkAchievements(database, recording.user_created, "recordings");
						logger.info(`Awarded RECORDING_FEATURED points to user ${recording.user_created}`);
					}
				}
			} catch (error) {
				logger.error("Failed to award recording update points:", error);
			}
		}
	});

	// Hook: Award points when user creates a comment on a recording
	action("comments.create", async (meta, { accountability }) => {
		if (!accountability?.user) return;

		try {
			const { payload } = meta;

			// Check if comment is on a recording
			if (payload.collection === "sexy_recordings") {
				await awardPoints(database, accountability.user, "COMMENT_CREATE");
				await checkAchievements(database, accountability.user, "social");
				logger.info(`Awarded COMMENT_CREATE points to user ${accountability.user}`);
			}
		} catch (error) {
			logger.error("Failed to award comment points:", error);
		}
	});
});
