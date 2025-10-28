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
	</div>
</div>
