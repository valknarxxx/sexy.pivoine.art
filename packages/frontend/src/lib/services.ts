import { getDirectusInstance } from "$lib/directus";
import {
	readItems,
	registerUser,
	updateMe,
	readMe,
	registerUserVerify,
	readUsers,
	passwordRequest,
	passwordReset,
	customEndpoint,
	readFolders,
	deleteFile,
	uploadFiles,
	createComment,
	readComments,
	aggregate,
} from "@directus/sdk";
import type { Analytics, Article, Model, Recording, Stats, User, Video, VideoLikeStatus, VideoLikeResponse, VideoPlayResponse } from "$lib/types";
import { PUBLIC_URL } from "$env/static/public";
import { logger } from "$lib/logger";

// Helper to log API calls
async function loggedApiCall<T>(
	operationName: string,
	operation: () => Promise<T>,
	context?: Record<string, unknown>
): Promise<T> {
	const startTime = Date.now();

	try {
		logger.debug(`🔄 API: ${operationName}`, { context });
		const result = await operation();
		const duration = Date.now() - startTime;
		logger.info(`✅ API: ${operationName} succeeded`, { duration, context });
		return result;
	} catch (error) {
		const duration = Date.now() - startTime;
		logger.error(`❌ API: ${operationName} failed`, {
			duration,
			context,
			error: error instanceof Error ? error : new Error(String(error)),
		});
		throw error;
	}
}

const userFields = [
	"*",
	{
		avatar: ["*"],
		policies: ["*", { policy: ["name", "id"] }],
		role: ["*", { policies: [{ policy: ["name", "id"] }] }],
	},
];

export async function isAuthenticated(token: string) {
	return loggedApiCall(
		"isAuthenticated",
		async () => {
			try {
				const directus = getDirectusInstance(fetch);
				directus.setToken(token);
				const user = await directus.request(
					readMe({
						fields: userFields,
					}),
				);
				return { authenticated: true, user };
			} catch {
				return { authenticated: false };
			}
		},
		{ hasToken: !!token },
	);
}

export async function register(
	email: string,
	password: string,
	firstName: string,
	lastName: string,
) {
	return loggedApiCall(
		"register",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request(
				registerUser(email, password, {
					verification_url: `${PUBLIC_URL || "http://localhost:3000"}/signup/verify`,
					first_name: firstName,
					last_name: lastName,
				}),
			);
		},
		{ email, firstName, lastName },
	);
}

export async function verify(token: string, fetch?: typeof globalThis.fetch) {
	return loggedApiCall(
		"verify",
		async () => {
			const directus = fetch
				? getDirectusInstance((args) => fetch(args, { redirect: "manual" }))
				: getDirectusInstance(fetch);
			return directus.request(registerUserVerify(token));
		},
		{ hasToken: !!token },
	);
}

export async function login(email: string, password: string) {
	return loggedApiCall(
		"login",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.login({ email, password });
		},
		{ email },
	);
}

export async function logout() {
	return loggedApiCall("logout", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.logout();
	});
}

export async function requestPassword(email: string) {
	return loggedApiCall(
		"requestPassword",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request(
				passwordRequest(email, `${PUBLIC_URL || "http://localhost:3000"}/password/reset`),
			);
		},
		{ email },
	);
}

export async function resetPassword(token: string, password: string) {
	return loggedApiCall(
		"resetPassword",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request(passwordReset(token, password));
		},
		{ hasToken: !!token },
	);
}

export async function getArticles(fetch?: typeof globalThis.fetch) {
	return loggedApiCall("getArticles", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.request<Article[]>(
			customEndpoint({
				method: "GET",
				path: "/sexy/articles",
			}),
		);
	});
}

export async function getArticleBySlug(
	slug: string,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"getArticleBySlug",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus
				.request<Article[]>(
					readItems("sexy_articles", {
						fields: ["*", "author.*"],
						filter: { slug: { _eq: slug } },
					}),
				)
				.then((articles) => {
					if (articles.length === 0) {
						throw new Error("Article not found");
					}
					return articles[0];
				});
		},
		{ slug },
	);
}

export async function getVideos(fetch?: typeof globalThis.fetch) {
	return loggedApiCall("getVideos", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.request<Video[]>(
			customEndpoint({
				method: "GET",
				path: "/sexy/videos",
			}),
		);
	});
}

export async function getVideosForModel(id, fetch?: typeof globalThis.fetch) {
	return loggedApiCall(
		"getVideosForModel",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<Video[]>(
				customEndpoint({
					method: "GET",
					path: `/sexy/videos?model_id=${id}`,
				}),
			);
		},
		{ modelId: id },
	);
}

export async function getFeaturedVideos(
	limit: number,
	fetchFn: typeof globalThis.fetch = globalThis.fetch,
) {
	return loggedApiCall(
		"getFeaturedVideos",
		async () => {
			const url = `${PUBLIC_URL}/api/sexy/videos?featured=true&limit=${limit}`;
			const response = await fetchFn(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch featured videos: ${response.statusText}`);
			}
			return (await response.json()) as Video[];
		},
		{ limit },
	);
}

export async function getVideoBySlug(
	slug: string,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"getVideoBySlug",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus
				.request<Video[]>(
					readItems("sexy_videos", {
						fields: [
							"*",
							{
								models: [
									"*",
									{
										directus_users_id: ["*"],
									},
								],
							},
							"movie.*",
						],
						filter: { slug },
					}),
				)
				.then((videos) => {
					if (videos.length === 0) {
						throw new Error("Video not found");
					}
					// Handle models array - filter out null/undefined and map to user objects
					if (Array.isArray(videos[0].models)) {
						videos[0].models = videos[0].models
							.filter((u) => u && u.directus_users_id)
							.map((u) => u.directus_users_id!);
					} else {
						videos[0].models = [];
					}

					return videos[0];
				});
		},
		{ slug },
	);
}

export async function getModels(fetch?: typeof globalThis.fetch) {
	return loggedApiCall("getModels", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.request<Model[]>(
			customEndpoint({
				method: "GET",
				path: "/sexy/models",
			}),
		);
	});
}

export async function getFeaturedModels(
	limit = 3,
	fetchFn: typeof globalThis.fetch = globalThis.fetch,
) {
	return loggedApiCall(
		"getFeaturedModels",
		async () => {
			const url = `${PUBLIC_URL}/api/sexy/models?featured=true&limit=${limit}`;
			const response = await fetchFn(url);
			if (!response.ok) {
				throw new Error(`Failed to fetch featured models: ${response.statusText}`);
			}
			return (await response.json()) as Model[];
		},
		{ limit },
	);
}

export async function getModelBySlug(
	slug: string,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"getModelBySlug",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<Model>(
				customEndpoint({
					method: "GET",
					path: `/sexy/models/${slug}`,
				}),
			);
		},
		{ slug },
	);
}

export async function updateProfile(user: Partial<User>) {
	return loggedApiCall(
		"updateProfile",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<User>(updateMe(user as never));
		},
		{ userId: user.id },
	);
}

export async function getStats(fetch?: typeof globalThis.fetch) {
	return loggedApiCall("getStats", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.request<Stats>(
			customEndpoint({
				path: "/sexy/stats",
			}),
		);
	});
}

export async function getFolders(fetch?: typeof globalThis.fetch) {
	return loggedApiCall("getFolders", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.request(readFolders());
	});
}

export async function removeFile(id: string) {
	return loggedApiCall(
		"removeFile",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request(deleteFile(id));
		},
		{ fileId: id },
	);
}

export async function uploadFile(data: FormData) {
	return loggedApiCall("uploadFile", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.request(uploadFiles(data));
	});
}

export async function createCommentForVideo(item: string, comment: string) {
	return loggedApiCall(
		"createCommentForVideo",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request(
				createComment({
					collection: "sexy_videos",
					item,
					comment,
				}),
			);
		},
		{ videoId: item, commentLength: comment.length },
	);
}

export async function getCommentsForVideo(
	item: string,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"getCommentsForVideo",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request(
				readComments({
					fields: ["*", { user_created: ["*"] }],
					filter: { collection: "sexy_videos", item },
					sort: ["-date_created"],
				}),
			);
		},
		{ videoId: item },
	);
}

export async function countCommentsForModel(
	user_created: string,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"countCommentsForModel",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus
				.request<[{ count: number }]>(
					aggregate("directus_comments", {
						aggregate: {
							count: "*",
						},
						query: {
							filter: { user_created },
						},
					}),
				)
				.then((result) => result[0].count);
		},
		{ userId: user_created },
	);
}

export async function getItemsByTag(
	category: "video" | "article" | "model",
	tag: string,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"getItemsByTag",
		async () => {
			switch (category) {
				case "video":
					return getVideos(fetch);
				case "model":
					return getModels(fetch);
				case "article":
					return getArticles(fetch);
			}
		},
		{ category, tag },
	);
}

export async function getRecordings(fetch?: typeof globalThis.fetch) {
	return loggedApiCall(
		"getRecordings",
		async () => {
			const directus = getDirectusInstance(fetch);
			const response = await directus.request<Recording[]>(
				customEndpoint({
					method: "GET",
					path: "/sexy/recordings",
				}),
			);
			return response;
		},
		{},
	);
}

export async function createRecording(
	recording: {
		title: string;
		description?: string;
		duration: number;
		events: unknown[];
		device_info: unknown[];
		tags?: string[];
		status?: string;
	},
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"createRecording",
		async () => {
			const directus = getDirectusInstance(fetch);
			const response = await directus.request<Recording>(
				customEndpoint({
					method: "POST",
					path: "/sexy/recordings",
					body: JSON.stringify(recording),
					headers: {
						"Content-Type": "application/json",
					},
				}),
			);
			return response;
		},
		{ title: recording.title, eventCount: recording.events.length },
	);
}

export async function deleteRecording(id: string) {
	return loggedApiCall(
		"deleteRecording",
		async () => {
			const directus = getDirectusInstance();
			await directus.request(
				customEndpoint({
					method: "DELETE",
					path: `/sexy/recordings/${id}`,
				}),
			);
		},
		{ id },
	);
}

export async function getRecording(id: string, fetch?: typeof globalThis.fetch) {
	return loggedApiCall(
		"getRecording",
		async () => {
			const directus = getDirectusInstance(fetch);
			const response = await directus.request<Recording>(
				customEndpoint({
					method: "GET",
					path: `/sexy/recordings/${id}`,
				}),
			);
			return response;
		},
		{ id },
	);
}

export async function likeVideo(videoId: string) {
	return loggedApiCall(
		"likeVideo",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<VideoLikeResponse>(
				customEndpoint({
					method: "POST",
					path: `/sexy/videos/${videoId}/like`,
				})
			);
		},
		{ videoId }
	);
}

export async function unlikeVideo(videoId: string) {
	return loggedApiCall(
		"unlikeVideo",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<VideoLikeResponse>(
				customEndpoint({
					method: "DELETE",
					path: `/sexy/videos/${videoId}/like`,
				})
			);
		},
		{ videoId }
	);
}

export async function getVideoLikeStatus(videoId: string, fetch?: typeof globalThis.fetch) {
	return loggedApiCall(
		"getVideoLikeStatus",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<VideoLikeStatus>(
				customEndpoint({
					method: "GET",
					path: `/sexy/videos/${videoId}/like-status`,
				})
			);
		},
		{ videoId }
	);
}

export async function recordVideoPlay(videoId: string, sessionId?: string) {
	return loggedApiCall(
		"recordVideoPlay",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<VideoPlayResponse>(
				customEndpoint({
					method: "POST",
					path: `/sexy/videos/${videoId}/play`,
					body: JSON.stringify({ session_id: sessionId }),
					headers: { "Content-Type": "application/json" },
				})
			);
		},
		{ videoId }
	);
}

export async function updateVideoPlay(
	videoId: string,
	playId: string,
	durationWatched: number,
	completed: boolean
) {
	return loggedApiCall(
		"updateVideoPlay",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request(
				customEndpoint({
					method: "PATCH",
					path: `/sexy/videos/${videoId}/play/${playId}`,
					body: JSON.stringify({
						duration_watched: durationWatched,
						completed,
					}),
					headers: { "Content-Type": "application/json" },
				})
			);
		},
		{ videoId, playId, durationWatched, completed }
	);
}

export async function getAnalytics(fetch?: typeof globalThis.fetch) {
	return loggedApiCall(
		"getAnalytics",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<Analytics>(
				customEndpoint({
					method: "GET",
					path: "/sexy/analytics",
				})
			);
		},
		{}
	);
}
