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
import type { Article, Model, Recording, Stats, User, Video } from "$lib/types";
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
			readItems("sexy_articles", {
				fields: ["*", "author.*"],
				where: { publish_date: { _lte: new Date().toISOString() } },
				sort: ["-publish_date"],
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
					filter: { upload_date: { _lte: new Date().toISOString() } },
					sort: ["-upload_date"],
				}),
			)
			.then((videos) => {
				videos.forEach((video) => {
					video.models = video.models.map((u) => u.directus_users_id!);
				});
				return videos;
			});
	});
}

export async function getVideosForModel(id, fetch?: typeof globalThis.fetch) {
	return loggedApiCall(
		"getVideosForModel",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<Video[]>(
				readItems("sexy_videos", {
					fields: ["*", "movie.*"],
					filter: {
						models: {
							directus_users_id: {
								id,
							},
						},
					},
					sort: ["-upload_date"],
				}),
			);
		},
		{ modelId: id },
	);
}

export async function getFeaturedVideos(
	limit: number,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"getFeaturedVideos",
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
						filter: {
							upload_date: { _lte: new Date().toISOString() },
							featured: true,
						},
						sort: ["-upload_date"],
						limit,
					}),
				)
				.then((videos) => {
					videos.forEach((video) => {
						video.models = video.models.map((u) => u.directus_users_id!);
					});
					return videos;
				});
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
					videos[0].models = videos[0].models.map((u) => u.directus_users_id!);

					return videos[0];
				});
		},
		{ slug },
	);
}

const modelFilter = {
	_or: [
		{
			policies: {
				policy: {
					name: {
						_eq: "Model",
					},
				},
			},
		},
		{
			role: {
				name: {
					_eq: "Model",
				},
			},
		},
	],
};

export async function getModels(fetch?: typeof globalThis.fetch) {
	return loggedApiCall("getModels", async () => {
		const directus = getDirectusInstance(fetch);
		return directus.request<Model[]>(
			readUsers({
				fields: ["*"],
				filter: modelFilter,
				sort: ["-join_date"],
			}),
		);
	});
}

export async function getFeaturedModels(
	limit = 3,
	fetch?: typeof globalThis.fetch,
) {
	return loggedApiCall(
		"getFeaturedModels",
		async () => {
			const directus = getDirectusInstance(fetch);
			return directus.request<Model[]>(
				readUsers({
					fields: ["*"],
					filter: { _and: [modelFilter, { featured: { _eq: true } }] },
					sort: ["-join_date"],
					limit,
				}),
			);
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
			return directus
				.request<Model[]>(
					readUsers({
						fields: [
							"*",
							{
								photos: [
									"*",
									{
										directus_files_id: ["*"],
									},
								],
							},
							"banner.*",
						],
						filter: { _and: [modelFilter, { slug: { _eq: slug } }] },
					}),
				)
				.then((models) => {
					if (models.length === 0) {
						throw new Error("Model not found");
					}
					models[0].photos = models[0].photos.map((p) => p.directus_files_id!);
					return models[0];
				});
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
