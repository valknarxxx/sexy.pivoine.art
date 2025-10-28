<script lang="ts">
import { _ } from "svelte-i18n";
import * as Dialog from "$lib/components/ui/dialog";
import { Button } from "$lib/components/ui/button";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import { Textarea } from "$lib/components/ui/textarea";
import { TagsInput } from "$lib/components/ui/tags-input";
import type { RecordedEvent, DeviceInfo } from "$lib/types";

interface Props {
	open: boolean;
	events: RecordedEvent[];
	deviceInfo: DeviceInfo[];
	duration: number;
	onSave: (data: {
		title: string;
		description: string;
		tags: string[];
	}) => Promise<void>;
	onCancel: () => void;
}

let { open, events, deviceInfo, duration, onSave, onCancel }: Props = $props();

let title = $state("");
let description = $state("");
let tags = $state<string[]>([]);
let isSaving = $state(false);

function formatDuration(ms: number): string {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function handleSave() {
	if (!title.trim()) return;

	isSaving = true;
	try {
		await onSave({ title: title.trim(), description: description.trim(), tags });
		// Reset form
		title = "";
		description = "";
		tags = [];
	} finally {
		isSaving = false;
	}
}

function handleCancel() {
	title = "";
	description = "";
	tags = [];
	onCancel();
}
</script>

<Dialog.Root {open} onOpenChange={(isOpen) => !isOpen && handleCancel()}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Save Recording</Dialog.Title>
			<Dialog.Description>
				Save your recording to view and play it later from your dashboard
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Recording Stats -->
			<div class="grid grid-cols-3 gap-4">
				<div
					class="flex flex-col items-center p-4 rounded-lg bg-muted/30 border border-border/30"
				>
					<span class="icon-[ri--time-line] w-5 h-5 text-primary mb-2"></span>
					<span class="text-xs text-muted-foreground mb-1">Duration</span>
					<span class="font-semibold">{formatDuration(duration)}</span>
				</div>
				<div
					class="flex flex-col items-center p-4 rounded-lg bg-muted/30 border border-border/30"
				>
					<span class="icon-[ri--pulse-line] w-5 h-5 text-accent mb-2"></span>
					<span class="text-xs text-muted-foreground mb-1">Events</span>
					<span class="font-semibold">{events.length}</span>
				</div>
				<div
					class="flex flex-col items-center p-4 rounded-lg bg-muted/30 border border-border/30"
				>
					<span class="icon-[ri--gamepad-line] w-5 h-5 text-primary mb-2"></span>
					<span class="text-xs text-muted-foreground mb-1">Devices</span>
					<span class="font-semibold">{deviceInfo.length}</span>
				</div>
			</div>

			<!-- Device Info -->
			<div class="space-y-2">
				<Label>Devices Used</Label>
				{#each deviceInfo as device}
					<div
						class="flex items-center gap-2 text-sm bg-muted/20 rounded px-3 py-2"
					>
						<span class="icon-[ri--rocket-line] w-4 h-4"></span>
						<span class="font-medium">{device.name}</span>
						<span class="text-muted-foreground text-xs">
							• {device.capabilities.join(", ")}
						</span>
					</div>
				{/each}
			</div>

			<!-- Form Fields -->
			<div class="space-y-4">
				<div class="space-y-2">
					<Label for="title">Title *</Label>
					<Input
						id="title"
						bind:value={title}
						placeholder="My awesome pattern"
						required
						class="bg-background/50 border-primary/20 focus:border-primary"
					/>
				</div>

				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						bind:value={description}
						placeholder="Describe your recording..."
						rows={3}
						class="bg-background/50 border-primary/20 focus:border-primary"
					/>
				</div>

				<div class="space-y-2">
					<Label for="tags">Tags</Label>
					<TagsInput
						id="tags"
						bind:value={tags}
						placeholder="Add tags..."
						class="bg-background/50 border-primary/20 focus:border-primary"
					/>
				</div>
			</div>
		</div>

		<Dialog.Footer>
			<Button
				variant="outline"
				onclick={handleCancel}
				disabled={isSaving}
				class="cursor-pointer"
			>
				Cancel
			</Button>
			<Button
				onclick={handleSave}
				disabled={!title.trim() || isSaving}
				class="cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
			>
				{#if isSaving}
					<div
						class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
					></div>
					Saving...
				{:else}
					<span class="icon-[ri--save-line] w-4 h-4 mr-2"></span>
					Save Recording
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
