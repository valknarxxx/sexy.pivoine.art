<script lang="ts">
import { _, locale } from "svelte-i18n";
import { Button } from "$lib/components/ui/button";
import { Card, CardContent } from "$lib/components/ui/card";
import { getAssetUrl } from "$lib/directus";
import Meta from "$lib/components/meta/meta.svelte";
import PeonyBackground from "$lib/components/background/peony-background.svelte";

const { data } = $props();

// Format user display name
let displayName = $derived(
	data.user.first_name && data.user.last_name
		? `${data.user.first_name} ${data.user.last_name}`
		: data.user.email?.split("@")[0] || "User",
);

// Format join date
let joinDate = $derived(
	new Date(data.user.date_created).toLocaleDateString($locale!, {
		month: "long",
		year: "numeric",
	}),
);
</script>

<Meta
	title={displayName}
	description={data.user.description || `${displayName}'s profile`}
	image={data.user.avatar ? getAssetUrl(data.user.avatar, "thumbnail") : undefined}
/>

<div
	class="relative min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5"
>
	<PeonyBackground />

	<div class="container mx-auto px-4 py-8 relative z-10">
		<!-- Profile Card -->
		<Card
			class="max-w-3xl mx-auto bg-card/90 backdrop-blur-sm border-border/50"
		>
			<CardContent class="p-6 md:p-8">
				<!-- Header with Back Button -->
				<div class="flex items-center justify-between mb-6">
					<Button
						variant="ghost"
						size="sm"
						href="/"
						class="text-muted-foreground hover:text-foreground"
					>
						<span class="icon-[ri--arrow-left-line] w-4 h-4 mr-2"></span>
						{$_("common.back")}
					</Button>

					{#if data.isOwnProfile}
						<Button variant="outline" size="sm" href="/me">
							<span class="icon-[ri--settings-3-line] w-4 h-4 mr-2"></span>
							{$_("profile.edit")}
						</Button>
					{/if}
				</div>

				<!-- Profile Content -->
				<div class="flex flex-col md:flex-row gap-6 items-start">
					<!-- Avatar -->
					<div class="flex-shrink-0">
						{#if data.user.avatar}
							<img
								src={getAssetUrl(data.user.avatar, "thumbnail")}
								alt={displayName}
								class="w-24 h-24 rounded-2xl object-cover ring-4 ring-primary/20"
							/>
						{:else}
							<div
								class="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center ring-4 ring-primary/20"
							>
								<span class="text-3xl font-bold text-primary">
									{displayName.charAt(0).toUpperCase()}
								</span>
							</div>
						{/if}
					</div>

					<!-- Info -->
					<div class="flex-1">
						<h1 class="text-3xl font-bold mb-2">{displayName}</h1>

						<div
							class="flex items-center gap-2 text-muted-foreground mb-4"
						>
							<span class="icon-[ri--calendar-line] w-4 h-4"></span>
							<span
								>{$_("profile.member_since", {
									values: { date: joinDate },
								})}</span
							>
						</div>

						{#if data.user.location}
							<div
								class="flex items-center gap-2 text-muted-foreground mb-4"
							>
								<span class="icon-[ri--map-pin-line] w-4 h-4"></span>
								<span>{data.user.location}</span>
							</div>
						{/if}

						{#if data.user.description}
							<p class="text-muted-foreground mb-4">
								{data.user.description}
							</p>
						{/if}

						<!-- Statistics -->
						<div
							class="grid grid-cols-2 gap-4 pt-4 border-t border-border/50"
						>
							<div class="text-center">
								<div class="text-2xl font-bold text-primary">
									{data.stats.comments_count}
								</div>
								<div class="text-sm text-muted-foreground">
									{$_("profile.comments")}
								</div>
							</div>
							<div class="text-center">
								<div class="text-2xl font-bold text-primary">
									{data.stats.likes_count}
								</div>
								<div class="text-sm text-muted-foreground">
									{$_("profile.likes")}
								</div>
							</div>
						</div>
					</div>
				</div>
			</CardContent>
		</Card>

		<!-- Gamification Card -->
		{#if data.gamification?.stats}
			<Card class="max-w-3xl mx-auto mt-6 bg-card/90 backdrop-blur-sm border-border/50">
				<CardContent class="p-6 md:p-8">
					<!-- Header -->
					<div class="flex items-center justify-between mb-6">
						<h2 class="text-2xl font-bold flex items-center gap-2">
							<span class="icon-[ri--trophy-line] w-6 h-6 text-primary"></span>
							{$_("gamification.stats")}
						</h2>
						<Button variant="outline" size="sm" href="/leaderboard">
							<span class="icon-[ri--bar-chart-line] w-4 h-4 mr-2"></span>
							{$_("gamification.leaderboard")}
						</Button>
					</div>

					<!-- Stats Grid -->
					<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
						<div class="text-center p-4 rounded-lg bg-accent/10">
							<div class="text-3xl font-bold text-primary">
								{Math.round(data.gamification.stats.total_weighted_points)}
							</div>
							<div class="text-sm text-muted-foreground mt-1">
								{$_("gamification.points")}
							</div>
						</div>
						<div class="text-center p-4 rounded-lg bg-accent/10">
							<div class="text-3xl font-bold text-primary">
								#{data.gamification.stats.rank}
							</div>
							<div class="text-sm text-muted-foreground mt-1">
								{$_("gamification.rank")}
							</div>
						</div>
						<div class="text-center p-4 rounded-lg bg-accent/10">
							<div class="text-3xl font-bold text-primary">
								{data.gamification.stats.recordings_count}
							</div>
							<div class="text-sm text-muted-foreground mt-1">
								{$_("gamification.recordings")}
							</div>
						</div>
						<div class="text-center p-4 rounded-lg bg-accent/10">
							<div class="text-3xl font-bold text-primary">
								{data.gamification.stats.playbacks_count}
							</div>
							<div class="text-sm text-muted-foreground mt-1">
								{$_("gamification.plays")}
							</div>
						</div>
					</div>

					<!-- Achievements -->
					{#if data.gamification.achievements?.length > 0}
						<div class="pt-6 border-t border-border/50">
							<h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
								<span class="icon-[ri--award-line] w-5 h-5 text-primary"></span>
								{$_("gamification.achievements")} ({data.gamification.achievements.length})
							</h3>
							<div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
								{#each data.gamification.achievements as achievement (achievement.id)}
									<div
										class="flex flex-col items-center gap-2 p-3 rounded-lg bg-accent/10 border border-border/30 hover:border-primary/50 transition-colors"
										title={achievement.description}
									>
										<span class="text-3xl">{achievement.icon || "🏆"}</span>
										<span class="text-xs font-medium text-center leading-tight">
											{achievement.name}
										</span>
										{#if achievement.date_unlocked}
											<span class="text-xs text-muted-foreground">
												{new Date(achievement.date_unlocked).toLocaleDateString($locale)}
											</span>
										{/if}
									</div>
								{/each}
							</div>
						</div>
					{:else}
						<div class="pt-6 border-t border-border/50 text-center text-muted-foreground">
							<span class="icon-[ri--trophy-line] w-8 h-8 mx-auto mb-2 opacity-50"></span>
							<p class="text-sm">No achievements unlocked yet</p>
						</div>
					{/if}
				</CardContent>
			</Card>
		{/if}
	</div>
</div>
