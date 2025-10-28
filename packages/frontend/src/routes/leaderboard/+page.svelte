<script lang="ts">
import { _, locale } from "svelte-i18n";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "$lib/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "$lib/components/ui/avatar";
import { getAssetUrl } from "$lib/directus";
import Meta from "$lib/components/meta/meta.svelte";
import PeonyBackground from "$lib/components/background/peony-background.svelte";

const { data } = $props();

// Format points with comma separator
function formatPoints(points: number): string {
	return Math.round(points).toLocaleString($locale || "en");
}

// Get medal emoji for top 3
function getMedalEmoji(rank: number): string {
	switch (rank) {
		case 1:
			return "🥇";
		case 2:
			return "🥈";
		case 3:
			return "🥉";
		default:
			return "";
	}
}

// Get user initials
function getUserInitials(name: string): string {
	if (!name) return "?";
	const parts = name.split(" ");
	if (parts.length >= 2) {
		return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
	}
	return name.substring(0, 2).toUpperCase();
}
</script>

<Meta title={$_("gamification.leaderboard")} description={$_("gamification.leaderboard_description")} />

<div class="relative min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5">
	<PeonyBackground />

	<div class="container mx-auto px-4 py-8 relative z-10">
		<!-- Header -->
		<div class="flex items-center justify-between mb-8">
			<div>
				<h1 class="text-4xl font-bold mb-2">{$_("gamification.leaderboard")}</h1>
				<p class="text-muted-foreground">{$_("gamification.leaderboard_subtitle")}</p>
			</div>
			<Button variant="ghost" size="sm" href="/">
				<span class="icon-[ri--arrow-left-line] w-4 h-4 mr-2"></span>
				{$_("common.back")}
			</Button>
		</div>

		<!-- Leaderboard Card -->
		<Card class="bg-card/90 backdrop-blur-sm border-border/50">
			<CardHeader>
				<CardTitle class="flex items-center gap-2">
					<span class="icon-[ri--trophy-line] w-5 h-5 text-primary"></span>
					{$_("gamification.top_players")}
				</CardTitle>
			</CardHeader>
			<CardContent>
				{#if data.leaderboard.length === 0}
					<div class="text-center py-12 text-muted-foreground">
						<span class="icon-[ri--trophy-line] w-12 h-12 mx-auto mb-4 opacity-50"></span>
						<p>{$_("gamification.no_rankings_yet")}</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each data.leaderboard as entry (entry.user_id)}
							<a
								href="/users/{entry.user_id}"
								class="flex items-center gap-4 p-4 rounded-lg hover:bg-accent/10 transition-colors group"
							>
								<!-- Rank Badge -->
								<div class="flex-shrink-0 w-14 text-center">
									{#if entry.rank <= 3}
										<span class="text-3xl">{getMedalEmoji(entry.rank)}</span>
									{:else}
										<span class="text-xl font-bold text-muted-foreground group-hover:text-foreground transition-colors">
											#{entry.rank}
										</span>
									{/if}
								</div>

								<!-- Avatar -->
								<Avatar class="h-12 w-12 ring-2 ring-accent/20 group-hover:ring-primary/40 transition-all">
									{#if entry.avatar}
										<AvatarImage src={getAssetUrl(entry.avatar, "mini")} alt={entry.display_name} />
									{/if}
									<AvatarFallback class="bg-gradient-to-br from-primary to-accent text-primary-foreground font-semibold">
										{getUserInitials(entry.display_name)}
									</AvatarFallback>
								</Avatar>

								<!-- User Info -->
								<div class="flex-1 min-w-0">
									<div class="font-semibold truncate group-hover:text-primary transition-colors">
										{entry.display_name || $_("common.anonymous")}
									</div>
									<div class="text-sm text-muted-foreground flex items-center gap-3">
										<span title={$_("gamification.recordings")}>
											<span class="icon-[ri--video-line] w-3.5 h-3.5 inline mr-1"></span>
											{entry.recordings_count}
										</span>
										<span title={$_("gamification.plays")}>
											<span class="icon-[ri--play-line] w-3.5 h-3.5 inline mr-1"></span>
											{entry.playbacks_count}
										</span>
										<span title={$_("gamification.achievements")}>
											<span class="icon-[ri--trophy-line] w-3.5 h-3.5 inline mr-1"></span>
											{entry.achievements_count}
										</span>
									</div>
								</div>

								<!-- Score -->
								<div class="text-right flex-shrink-0">
									<div class="text-2xl font-bold text-primary">
										{formatPoints(entry.total_weighted_points)}
									</div>
									<div class="text-xs text-muted-foreground">
										{$_("gamification.points")}
									</div>
								</div>

								<!-- Arrow indicator -->
								<div class="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
									<span class="icon-[ri--arrow-right-s-line] w-5 h-5 text-muted-foreground"></span>
								</div>
							</a>
						{/each}
					</div>

					<!-- Pagination -->
					{#if data.pagination.hasMore}
						<div class="mt-6 text-center">
							<Button
								variant="outline"
								href="/leaderboard?offset={data.pagination.offset + data.pagination.limit}&limit={data.pagination.limit}"
							>
								{$_("common.load_more")}
							</Button>
						</div>
					{/if}
				{/if}
			</CardContent>
		</Card>

		<!-- Info Card -->
		<Card class="mt-6 bg-card/90 backdrop-blur-sm border-border/50">
			<CardContent class="p-6">
				<h3 class="font-semibold mb-2 flex items-center gap-2">
					<span class="icon-[ri--information-line] w-4 h-4 text-primary"></span>
					{$_("gamification.how_it_works")}
				</h3>
				<p class="text-sm text-muted-foreground mb-4">
					{$_("gamification.how_it_works_description")}
				</p>
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div class="flex items-start gap-2">
						<span class="icon-[ri--video-add-line] w-5 h-5 text-primary flex-shrink-0 mt-0.5"></span>
						<div>
							<div class="font-medium">{$_("gamification.earn_by_creating")}</div>
							<div class="text-muted-foreground">{$_("gamification.earn_by_creating_desc")}</div>
						</div>
					</div>
					<div class="flex items-start gap-2">
						<span class="icon-[ri--play-circle-line] w-5 h-5 text-primary flex-shrink-0 mt-0.5"></span>
						<div>
							<div class="font-medium">{$_("gamification.earn_by_playing")}</div>
							<div class="text-muted-foreground">{$_("gamification.earn_by_playing_desc")}</div>
						</div>
					</div>
					<div class="flex items-start gap-2">
						<span class="icon-[ri--time-line] w-5 h-5 text-primary flex-shrink-0 mt-0.5"></span>
						<div>
							<div class="font-medium">{$_("gamification.stay_active")}</div>
							<div class="text-muted-foreground">{$_("gamification.stay_active_desc")}</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>
	</div>
</div>
