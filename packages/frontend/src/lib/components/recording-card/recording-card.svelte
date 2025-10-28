<script lang="ts">
import { _ } from "svelte-i18n";
import { Card, CardContent, CardHeader } from "$lib/components/ui/card";
import { Button } from "$lib/components/ui/button";
import type { Recording } from "$lib/types";
import { cn } from "$lib/utils";

interface Props {
	recording: Recording;
	onPlay?: (id: string) => void;
	onDelete?: (id: string) => void;
}

let { recording, onPlay, onDelete }: Props = $props();

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getStatusColor(status: string): string {
	switch (status) {
		case "published":
			return "text-green-400 bg-green-400/20";
		case "draft":
			return "text-yellow-400 bg-yellow-400/20";
		case "archived":
			return "text-red-400 bg-red-400/20";
		default:
			return "text-gray-400 bg-gray-400/20";
	}
}
</script>

<Card
	class="group hover:shadow-lg hover:shadow-primary/10 transition-all duration-300 border-border/50 hover:border-primary/30 bg-card/50 backdrop-blur-sm"
>
	<CardHeader class="pb-3">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<div class="flex items-center gap-2 mb-2">
					<h3
						class="font-semibold text-card-foreground group-hover:text-primary transition-colors"
					>
						{recording.title}
					</h3>
					<span
						class={cn(
							"text-xs px-2 py-0.5 rounded-full",
							getStatusColor(recording.status),
						)}
					>
						{$_(`recording_card.status_${recording.status}`)}
					</span>
				</div>
				{#if recording.description}
					<p class="text-sm text-muted-foreground line-clamp-2">
						{recording.description}
					</p>
				{/if}
			</div>
		</div>
	</CardHeader>

	<CardContent class="space-y-4">
		<!-- Stats Grid -->
		<div class="grid grid-cols-3 gap-3">
			<div
				class="flex flex-col items-center p-3 rounded-lg bg-muted/30 border border-border/30"
			>
				<span class="icon-[ri--time-line] w-4 h-4 text-primary mb-1"></span>
				<span class="text-xs text-muted-foreground"
					>{$_("recording_card.duration")}</span
				>
				<span class="font-medium text-sm">{formatDuration(recording.duration)}</span>
			</div>
			<div
				class="flex flex-col items-center p-3 rounded-lg bg-muted/30 border border-border/30"
			>
				<span class="icon-[ri--pulse-line] w-4 h-4 text-accent mb-1"></span>
				<span class="text-xs text-muted-foreground">{$_("recording_card.events")}</span>
				<span class="font-medium text-sm">{recording.events.length}</span>
			</div>
			<div
				class="flex flex-col items-center p-3 rounded-lg bg-muted/30 border border-border/30"
			>
				<span class="icon-[ri--gamepad-line] w-4 h-4 text-primary mb-1"></span>
				<span class="text-xs text-muted-foreground">{$_("recording_card.devices")}</span>
				<span class="font-medium text-sm">{recording.device_info.length}</span>
			</div>
		</div>

		<!-- Device Info -->
		<div class="space-y-1">
			{#each recording.device_info.slice(0, 2) as device}
				<div
					class="flex items-center gap-2 text-xs text-muted-foreground bg-muted/20 rounded px-2 py-1"
				>
					<span class="icon-[ri--rocket-line] w-3 h-3"></span>
					<span>{device.name}</span>
					<span class="text-xs opacity-60">• {device.capabilities.join(", ")}</span>
				</div>
			{/each}
			{#if recording.device_info.length > 2}
				<div class="text-xs text-muted-foreground/60 px-2">
					+{recording.device_info.length - 2} more device{recording.device_info.length -
						2 >
					1
						? "s"
						: ""}
				</div>
			{/if}
		</div>

		<!-- Tags -->
		{#if recording.tags && recording.tags.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each recording.tags as tag}
					<span
						class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20"
					>
						{tag}
					</span>
				{/each}
			</div>
		{/if}

		<!-- Metadata -->
		<div class="flex items-center justify-between text-xs text-muted-foreground pt-2">
			<div class="flex items-center gap-3">
				<span>
					{new Date(recording.date_created).toLocaleDateString()}
				</span>
				{#if recording.public}
					<span class="flex items-center gap-1">
						<span class="icon-[ri--global-line] w-3 h-3"></span>
						{$_("recording_card.public")}
					</span>
				{:else}
					<span class="flex items-center gap-1">
						<span class="icon-[ri--lock-line] w-3 h-3"></span>
						{$_("recording_card.private")}
					</span>
				{/if}
			</div>
			{#if recording.linked_video}
				<span class="flex items-center gap-1 text-accent">
					<span class="icon-[ri--video-line] w-3 h-3"></span>
					{$_("recording_card.linked_video")}
				</span>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex gap-2 pt-2">
			{#if onPlay}
				<Button
					size="sm"
					onclick={() => onPlay?.(recording.id)}
					class="flex-1 cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
				>
					<span class="icon-[ri--play-fill] w-4 h-4 mr-1"></span>
					{$_("recording_card.play")}
				</Button>
			{/if}
			{#if onDelete}
				<Button
					size="sm"
					variant="outline"
					onclick={() => onDelete?.(recording.id)}
					class="cursor-pointer border-destructive/20 hover:bg-destructive/10 hover:text-destructive"
				>
					<span class="icon-[ri--delete-bin-line] w-4 h-4"></span>
				</Button>
			{/if}
		</div>
	</CardContent>
</Card>
