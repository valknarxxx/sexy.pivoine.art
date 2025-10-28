import { getFeaturedModels, getFeaturedVideos } from "$lib/services";
export async function load({ fetch }) {
	const [models, videos] = await Promise.all([
		getFeaturedModels(3, fetch),
		getFeaturedVideos(3, fetch),
	]);

	// Ensure data is serializable by converting to plain JSON
	return {
		models: JSON.parse(JSON.stringify(models)),
		videos: JSON.parse(JSON.stringify(videos)),
	};
}
