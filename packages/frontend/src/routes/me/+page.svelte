<script lang="ts">
import { _ } from "svelte-i18n";
import { Button } from "$lib/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "$lib/components/ui/card";
import {
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger,
} from "$lib/components/ui/tabs";
import { Input } from "$lib/components/ui/input";
import { Label } from "$lib/components/ui/label";
import PeonyBackground from "$lib/components/background/peony-background.svelte";
import { onMount } from "svelte";
import { goto, invalidateAll } from "$app/navigation";
import { getAssetUrl, isModel } from "$lib/directus";
import * as Alert from "$lib/components/ui/alert";
import { toast } from "svelte-sonner";
import { deleteRecording, removeFile, updateProfile, uploadFile } from "$lib/services";
import { Textarea } from "$lib/components/ui/textarea";
import Meta from "$lib/components/meta/meta.svelte";
import { TagsInput } from "$lib/components/ui/tags-input";
import {
	displaySize,
	FileDropZone,
	MEGABYTE,
} from "$lib/components/ui/file-drop-zone";
import * as Avatar from "$lib/components/ui/avatar";
import RecordingCard from "$lib/components/recording-card/recording-card.svelte";

const { data } = $props();

let recordings = $state(data.recordings);

let activeTab = $state("settings");

let firstName = $state(data.authStatus.user!.first_name);
let lastName = $state(data.authStatus.user!.last_name);
let artistName = $state(data.authStatus.user!.artist_name);
let description = $state(data.authStatus.user!.description);
let tags = $state(data.authStatus.user!.tags);

let email = $state(data.authStatus.user!.email);
let password = $state("");
let confirmPassword = $state("");

let showPassword = $state(false);
let showConfirmPassword = $state(false);

let isProfileLoading = $state(false);
let isProfileError = $state(false);
let profileError = $state("");

let isSecurityLoading = $state(false);
let isSecurityError = $state(false);
let securityError = $state("");

async function handleProfileSubmit(e: Event) {
	e.preventDefault();
	try {
		isProfileLoading = true;
		isProfileError = false;
		profileError = "";

		let avatarId = undefined;

		if (!avatar?.id && data.authStatus.user!.avatar?.id) {
			await removeFile(data.authStatus.user!.avatar.id);
		}

		if (avatar?.file) {
			const formData = new FormData();
			formData.append(
				"folder",
				data.folders.find((f) => f.name === "avatars")!.id,
			);
			formData.append("file", avatar.file!);
			const result = await uploadFile(formData);
			avatarId = result.id;
		}

		await updateProfile({
			first_name: firstName,
			last_name: lastName,
			artist_name: artistName,
			description,
			tags,
			avatar: avatarId,
		});
		toast.success($_("me.settings.toast_update"));
		invalidateAll();
	} catch (err: any) {
		profileError = err.message;
		isProfileError = true;
	} finally {
		isProfileLoading = false;
	}
}

async function handleSecuritySubmit(e: Event) {
	e.preventDefault();
	try {
		if (password !== confirmPassword) {
			throw new Error($_("me.settings.password_error"));
		}
		isSecurityLoading = true;
		isSecurityError = false;
		securityError = "";
		await updateProfile({
			email,
			password,
		});
		toast.success($_("me.settings.toast_update"));
		invalidateAll();
		password = confirmPassword = "";
	} catch (err: any) {
		securityError = err.message;
		isSecurityError = true;
	} finally {
		isSecurityLoading = false;
	}
}

let avatar = $state<{
	id?: string;
	url: string;
	name: string;
	size: number;
	file?: File;
}>();

async function handleFilesUpload(files: File[]) {
	const file = files[0];
	avatar = {
		name: file.name,
		size: file.size,
		url: URL.createObjectURL(file),
		file,
	};
}

async function handleAvatarRemove() {
	if (avatar!.id) {
		avatar = undefined;
	} else {
		setExistingAvatar();
	}
}

function setExistingAvatar() {
	if (data.authStatus.user!.avatar) {
		avatar = {
			id: data.authStatus.user!.avatar.id,
			url: getAssetUrl(data.authStatus.user!.avatar.id, "mini")!,
			name: data.authStatus.user!.artist_name,
			size: data.authStatus.user!.avatar.filesize,
		};
	} else {
		avatar = undefined;
	}
}

async function handleDeleteRecording(id: string) {
	if (!confirm($_("me.recordings.delete_confirm"))) {
		return;
	}

	try {
		await deleteRecording(id);
		recordings = recordings.filter((r) => r.id !== id);
		toast.success($_("me.recordings.delete_success"));
	} catch (error) {
		toast.error($_("me.recordings.delete_error"));
	}
}

function handlePlayRecording(id: string) {
	// Navigate to play page with recording ID
	goto(`/play?recording=${id}`);
}

onMount(() => {
	if (data.authStatus.authenticated) {
		setExistingAvatar();
		return;
	}
	goto("/login");
});
</script>

<Meta
    title={$_("me.title")}
    description={$_("me.welcome", {
        values: { name: data.authStatus.user!.artist_name },
    })}
/>

<div
    class="relative min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 overflow-hidden"
>
    <PeonyBackground />
    <div class="container mx-auto px-4 py-8">
        <!-- Header -->
        <div class="mb-8">
            <div class="flex items-center justify-between mb-8">
                <div>
                    <h1
                        class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent mb-3"
                    >
                        {$_("me.title")}
                    </h1>
                    <p class="text-lg text-muted-foreground">
                        {$_("me.welcome", {
                            values: { name: data.authStatus.user!.artist_name },
                        })}
                    </p>
                </div>
                {#if isModel(data.authStatus.user!)}
                    <Button
                        href={`/models/${data.authStatus.user!.slug}`}
                        variant="outline"
                        class="border-primary/20 hover:bg-primary/10"
                        >{$_("me.view_profile")}</Button
                    >
                {/if}
            </div>
        </div>

        <!-- Dashboard Tabs -->
        <Tabs bind:value={activeTab} class="w-full">
            <TabsList class="grid w-full {data.analytics ? 'grid-cols-3' : 'grid-cols-2'} max-w-2xl mb-8">
                <TabsTrigger value="settings" class="flex items-center gap-2">
                    <span class="icon-[ri--settings-4-line] w-4 h-4"></span>
                    {$_("me.settings.title")}
                </TabsTrigger>
                <TabsTrigger value="recordings" class="flex items-center gap-2">
                    <span class="icon-[ri--play-list-2-line] w-4 h-4"></span>
                    {$_("me.recordings.title")}
                </TabsTrigger>
                {#if data.analytics}
                    <TabsTrigger value="analytics" class="flex items-center gap-2">
                        <span class="icon-[ri--line-chart-line] w-4 h-4"></span>
                        Analytics
                    </TabsTrigger>
                {/if}
            </TabsList>

            <!-- Settings Tab -->
            <TabsContent value="settings" class="space-y-6">
                <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <!-- Profile Settings -->
                    <Card class="bg-card/50 border-primary/20">
                        <CardHeader>
                            <CardTitle>{$_("me.settings.profile_title")}</CardTitle>
                            <CardDescription>{$_("me.settings.profile_subtitle")}</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-4">
                            <form onsubmit={handleProfileSubmit} class="space-y-4">
                                <div class="space-y-2">
                                    <Label for="avatar">{$_("me.settings.avatar")}</Label>
                                    <FileDropZone
                                        id="avatar"
                                        fileCount={0}
                                        maxFiles={1}
                                        maxFileSize={2 * MEGABYTE}
                                        onUpload={handleFilesUpload}
                                        accept="image/*"
                                    />
                                    {#if avatar}
                                        <div class="flex place-items-center justify-between gap-2">
                                            <div class="flex place-items-center gap-2">
                                                <div class="relative size-9 overflow-clip">
                                                    <img
                                                        src={avatar.url}
                                                        alt={avatar.name}
                                                        class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 overflow-clip"
                                                    />
                                                </div>
                                                <div class="flex flex-col">
                                                    <span>{avatar.name}</span>
                                                    <span class="text-muted-foreground text-xs"
                                                        >{displaySize(avatar.size)}</span
                                                    >
                                                </div>
                                            </div>
                                            <div class="gap-2">
                                                <Button
                                                    variant="outline"
                                                    size="icon"
                                                    onclick={handleAvatarRemove}
                                                    class="cursor-pointer"
                                                    ><span class="icon-[ri--delete-bin-line]"
                                                    ></span></Button
                                                >
                                            </div>
                                        </div>
                                    {/if}
                                </div>
                                <!-- Name Fields -->
                                <div class="grid grid-cols-2 gap-4">
                                    <div class="space-y-2">
                                        <Label for="firstName">{$_("me.settings.first_name")}</Label
                                        >
                                        <Input
                                            id="firstName"
                                            placeholder={$_("me.settings.first_name_placeholder")}
                                            bind:value={firstName}
                                            required
                                            class="bg-background/50 border-primary/20 focus:border-primary"
                                        />
                                    </div>
                                    <div class="space-y-2">
                                        <Label for="lastName">{$_("me.settings.last_name")}</Label>
                                        <Input
                                            id="lastName"
                                            placeholder={$_("me.settings.last_name_placeholder")}
                                            bind:value={lastName}
                                            required
                                            class="bg-background/50 border-primary/20 focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div class="space-y-2">
                                    <Label for="artistName">{$_("me.settings.artist_name")}</Label>
                                    <Input
                                        id="artistName"
                                        placeholder={$_("me.settings.artist_name_placeholder")}
                                        bind:value={artistName}
                                        required
                                        class="bg-background/50 border-primary/20 focus:border-primary"
                                    />
                                </div>
                                <div class="space-y-2">
                                    <Label for="description">{$_("me.settings.description")}</Label>
                                    <Textarea
                                        id="description"
                                        bind:value={description}
                                        placeholder={$_("me.settings.description_placeholder")}
                                        class="bg-background/50 border-primary/20 focus:border-primary"
                                        rows={3}
                                    />
                                </div>
                                <div class="space-y-2">
                                    <Label for="tags">{$_("me.settings.tags")}</Label>
                                    <TagsInput
                                        id="tags"
                                        bind:value={tags}
                                        placeholder={$_("me.settings.tags_placeholder")}
                                        class="bg-background/50 border-primary/20 focus:border-primary"
                                    />
                                </div>
                                {#if isProfileError}
                                    <div class="grid w-full items-start gap-4">
                                        <Alert.Root variant="destructive">
                                            <Alert.Title class="items-center flex"
                                                ><span
                                                    class="icon-[ri--alert-line] inline-block w-4 h-4 mr-1"
                                                ></span>{$_("me.settings.error")}</Alert.Title
                                            >
                                            <Alert.Description>{profileError}</Alert.Description>
                                        </Alert.Root>
                                    </div>
                                {/if}
                                <Button
                                    type="submit"
                                    class="cursor-pointer w-full bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                                    disabled={isProfileLoading}
                                >
                                    {#if isProfileLoading}
                                        <div
                                            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
                                        ></div>
                                        {$_("me.settings.updating_profile")}
                                    {:else}
                                        {$_("me.settings.update_profile")}
                                    {/if}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    <!-- Privacy Settings -->
                    <Card class="bg-card/50 border-primary/20">
                        <CardHeader>
                            <CardTitle>{$_("me.settings.privacy_title")}</CardTitle>
                            <CardDescription>{$_("me.settings.privacy_subtitle")}</CardDescription>
                        </CardHeader>
                        <CardContent class="space-y-4">
                            <form onsubmit={handleSecuritySubmit} class="space-y-4">
                                <!-- Email -->
                                <div class="space-y-2">
                                    <Label for="email">{$_("me.settings.email")}</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        placeholder={$_("me.settings.email_placeholder")}
                                        bind:value={email}
                                        required
                                        class="bg-background/50 border-primary/20 focus:border-primary"
                                    />
                                </div>

                                <!-- Password -->
                                <div class="space-y-2">
                                    <Label for="password">{$_("me.settings.password")}</Label>
                                    <div class="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder={$_("me.settings.password_placeholder")}
                                            bind:value={password}
                                            required
                                            class="bg-background/50 border-primary/20 focus:border-primary pr-10"
                                        />
                                        <button
                                            type="button"
                                            onclick={() => (showPassword = !showPassword)}
                                            class="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {#if showPassword}
                                                <span class="icon-[ri--eye-off-line] w-4 h-4"
                                                ></span>
                                            {:else}
                                                <span class="icon-[ri--eye-line] w-4 h-4"></span>
                                            {/if}
                                        </button>
                                    </div>
                                </div>

                                <!-- Confirm Password -->
                                <div class="space-y-2">
                                    <Label for="confirmPassword"
                                        >{$_("me.settings.confirm_password")}</Label
                                    >
                                    <div class="relative">
                                        <Input
                                            id="confirmPassword"
                                            type={showConfirmPassword ? "text" : "password"}
                                            placeholder={$_(
                                                "me.settings.confirm_password_placeholder",
                                            )}
                                            bind:value={confirmPassword}
                                            required
                                            class="bg-background/50 border-primary/20 focus:border-primary pr-10"
                                        />
                                        <button
                                            type="button"
                                            onclick={() =>
                                                (showConfirmPassword = !showConfirmPassword)}
                                            class="cursor-pointer absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                        >
                                            {#if showConfirmPassword}
                                                <span class="icon-[ri--eye-off-line] w-4 h-4"
                                                ></span>
                                            {:else}
                                                <span class="icon-[ri--eye-line] w-4 h-4"></span>
                                            {/if}
                                        </button>
                                    </div>
                                </div>
                                {#if isSecurityError}
                                    <div class="grid w-full items-start gap-4">
                                        <Alert.Root variant="destructive">
                                            <Alert.Title class="items-center flex"
                                                ><span
                                                    class="icon-[ri--alert-line] inline-block w-4 h-4 mr-1"
                                                ></span>{$_("me.settings.error")}</Alert.Title
                                            >
                                            <Alert.Description>{securityError}</Alert.Description>
                                        </Alert.Root>
                                    </div>
                                {/if}
                                <Button
                                    variant="outline"
                                    type="submit"
                                    class="cursor-pointer w-full border-primary/20 hover:bg-primary/10"
                                    disabled={isSecurityLoading}
                                >
                                    {#if isSecurityLoading}
                                        <div
                                            class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
                                        ></div>
                                        {$_("me.settings.updating_security")}
                                    {:else}
                                        {$_("me.settings.update_security")}
                                    {/if}
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>
            </TabsContent>

            <!-- Recordings Tab -->
            <TabsContent value="recordings" class="space-y-6">
                <div class="mb-6 flex justify-between items-center">
                    <div>
                        <h2 class="text-2xl font-bold text-card-foreground">
                            {$_("me.recordings.title")}
                        </h2>
                        <p class="text-muted-foreground">
                            {$_("me.recordings.description")}
                        </p>
                    </div>
                    <Button
                        href="/play"
                        class="cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    >
                        <span class="icon-[ri--play-line] w-4 h-4 mr-2"></span>
                        {$_("me.recordings.go_to_play")}
                    </Button>
                </div>

                {#if recordings.length === 0}
                    <Card class="bg-card/50 border-primary/20">
                        <CardContent class="py-12">
                            <div class="flex flex-col items-center justify-center text-center">
                                <div
                                    class="mb-4 p-4 rounded-full bg-muted/30 border border-border/30"
                                >
                                    <span
                                        class="icon-[ri--play-list-2-line] w-12 h-12 text-muted-foreground"
                                    ></span>
                                </div>
                                <h3 class="text-xl font-semibold mb-2">
                                    {$_("me.recordings.no_recordings")}
                                </h3>
                                <p class="text-muted-foreground mb-6 max-w-md">
                                    {$_("me.recordings.no_recordings_description")}
                                </p>
                                <Button
                                    href="/play"
                                    class="cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                                >
                                    <span class="icon-[ri--play-line] w-4 h-4 mr-2"></span>
                                    {$_("me.recordings.go_to_play")}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                {:else}
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {#each recordings as recording (recording.id)}
                            <RecordingCard
                                {recording}
                                onPlay={handlePlayRecording}
                                onDelete={handleDeleteRecording}
                            />
                        {/each}
                    </div>
                {/if}
            </TabsContent>

            <!-- Analytics Tab -->
            {#if data.analytics}
                <TabsContent value="analytics" class="space-y-6">
                    <div class="mb-6">
                        <h2 class="text-2xl font-bold text-card-foreground">
                            Analytics Dashboard
                        </h2>
                        <p class="text-muted-foreground">
                            Track your content performance and audience engagement
                        </p>
                    </div>

                    <!-- Overview Stats -->
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <Card class="bg-card/50 border-primary/20">
                            <CardHeader>
                                <CardTitle class="flex items-center gap-2">
                                    <span class="icon-[ri--video-line] w-5 h-5 text-primary"></span>
                                    Total Videos
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p class="text-3xl font-bold">{data.analytics.total_videos}</p>
                            </CardContent>
                        </Card>
                        <Card class="bg-card/50 border-primary/20">
                            <CardHeader>
                                <CardTitle class="flex items-center gap-2">
                                    <span class="icon-[ri--heart-fill] w-5 h-5 text-primary"></span>
                                    Total Likes
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p class="text-3xl font-bold">{data.analytics.total_likes.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                        <Card class="bg-card/50 border-primary/20">
                            <CardHeader>
                                <CardTitle class="flex items-center gap-2">
                                    <span class="icon-[ri--play-fill] w-5 h-5 text-primary"></span>
                                    Total Plays
                                </CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p class="text-3xl font-bold">{data.analytics.total_plays.toLocaleString()}</p>
                            </CardContent>
                        </Card>
                    </div>

                    <!-- Video Performance Table -->
                    <Card class="bg-card/50 border-primary/20">
                        <CardHeader>
                            <CardTitle>Video Performance</CardTitle>
                            <CardDescription>Detailed metrics for each video</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div class="overflow-x-auto">
                                <table class="w-full">
                                    <thead>
                                        <tr class="border-b border-border">
                                            <th class="text-left p-3">Title</th>
                                            <th class="text-right p-3">Likes</th>
                                            <th class="text-right p-3">Plays</th>
                                            <th class="text-right p-3">Completion Rate</th>
                                            <th class="text-right p-3">Avg Watch Time</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {#each data.analytics.videos as video}
                                            <tr class="border-b border-border/50 hover:bg-primary/5 transition-colors">
                                                <td class="p-3">
                                                    <a href="/videos/{video.slug}" class="hover:text-primary transition-colors">
                                                        {video.title}
                                                    </a>
                                                </td>
                                                <td class="text-right p-3 font-medium">
                                                    {video.likes}
                                                </td>
                                                <td class="text-right p-3 font-medium">
                                                    {video.plays}
                                                </td>
                                                <td class="text-right p-3">
                                                    <span class="inline-flex items-center px-2 py-1 rounded-full text-xs {video.completion_rate >= 70 ? 'bg-green-500/20 text-green-500' : video.completion_rate >= 40 ? 'bg-yellow-500/20 text-yellow-500' : 'bg-red-500/20 text-red-500'}">
                                                        {video.completion_rate.toFixed(1)}%
                                                    </span>
                                                </td>
                                                <td class="text-right p-3 text-muted-foreground">
                                                    {Math.floor(video.avg_watch_time / 60)}:{(video.avg_watch_time % 60).toString().padStart(2, '0')}
                                                </td>
                                            </tr>
                                        {/each}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            {/if}
        </Tabs>
    </div>
</div>
