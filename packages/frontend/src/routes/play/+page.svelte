<script lang="ts">
import { _ } from "svelte-i18n";
import Meta from "$lib/components/meta/meta.svelte";
import {
	ButtplugClient,
	ButtplugMessage,
	ButtplugWasmClientConnector,
	DeviceList,
	SensorReadCmd,
	StopDeviceCmd,
	SensorReading,
	ScalarCmd,
	ScalarSubcommand,
	ButtplugDeviceMessage,
	ButtplugClientDevice,
	SensorType,
} from "@sexy.pivoine.art/buttplug";
import Button from "$lib/components/ui/button/button.svelte";
import { onMount } from "svelte";
import { goto } from "$app/navigation";
import DeviceCard from "$lib/components/device-card/device-card.svelte";
import RecordingSaveDialog from "./components/recording-save-dialog.svelte";
import type { BluetoothDevice, RecordedEvent, DeviceInfo } from "$lib/types";
import { toast } from "svelte-sonner";

const client = new ButtplugClient("Sexy.Art");
let connected = $state(client.connected);
let scanning = $state(false);
let devices = $state<BluetoothDevice[]>([]);

// Recording state
let isRecording = $state(false);
let recordingStartTime = $state<number | null>(null);
let recordedEvents = $state<RecordedEvent[]>([]);
let showSaveDialog = $state(false);
let recordingDuration = $state(0);

// Playback state
let isPlaying = $state(false);
let playbackProgress = $state(0);
let playbackStartTime = $state<number | null>(null);
let playbackTimeoutId = $state<number | null>(null);
let currentEventIndex = $state(0);

async function init() {
	const connector = new ButtplugWasmClientConnector();
	// await ButtplugWasmClientConnector.activateLogging("info");
	await client.connect(connector);
	client.on("deviceadded", onDeviceAdded);
	client.on("deviceremoved", (msg: ButtplugDeviceMessage) =>
		devices.splice(msg.DeviceIndex, 1),
	);
	client.on("scanningfinished", () => (scanning = false));
	connector.on("message", handleMessages);
	connected = client.connected;
}

async function startScanning() {
	await client.startScanning();
	scanning = true;
}

async function onDeviceAdded(
	msg: ButtplugDeviceMessage,
	dev: ButtplugClientDevice,
) {
	const device = convertDevice(dev);
	devices.push(device);

	const cmds = device.info.messageAttributes.SensorReadCmd;

	cmds?.forEach(async (cmd) => {
		await client.sendDeviceMessage(
			{ index: device.info.index },
			new SensorReadCmd(device.info.index, cmd.Index, cmd.SensorType),
		);
	});
}

async function handleMessages(messages: ButtplugMessage[]) {
	messages.forEach(async (msg) => {
		await handleMessage(msg);
	});
}

async function handleMessage(msg: ButtplugMessage) {
	if (msg instanceof SensorReading) {
		const device = devices[msg.DeviceIndex];
		if (msg.SensorType === SensorType.Battery) {
			device.batteryLevel = msg.Data[0];
		}
		device.sensorValues[msg.Index] = msg.Data[0];
		device.lastSeen = new Date();
	} else if (msg instanceof DeviceList) {
		devices = client.devices.map(convertDevice);
	}
}

async function handleChange(
	device: BluetoothDevice,
	scalarIndex: number,
	value: number,
) {
	const vibrateCmd = device.info.messageAttributes.ScalarCmd[scalarIndex];
	await client.sendDeviceMessage(
		{ index: device.info.index },
		new ScalarCmd(
			[
				new ScalarSubcommand(
					vibrateCmd.Index,
					(device.actuatorValues[scalarIndex] = value),
					vibrateCmd.ActuatorType,
				),
			],
			device.info.index,
		),
	);

	// Capture event if recording
	if (isRecording && recordingStartTime) {
		captureEvent(device, scalarIndex, value);
	}
}

function startRecording() {
	if (devices.length === 0) {
		return;
	}
	isRecording = true;
	recordingStartTime = performance.now();
	recordedEvents = [];
	recordingDuration = 0;
}

function stopRecording() {
	isRecording = false;
	if (recordedEvents.length > 0) {
		recordingDuration = recordedEvents[recordedEvents.length - 1].timestamp;
		showSaveDialog = true;
	}
}

function captureEvent(
	device: BluetoothDevice,
	scalarIndex: number,
	value: number,
) {
	if (!recordingStartTime) return;

	const timestamp = performance.now() - recordingStartTime;
	const scalarCmd = device.info.messageAttributes.ScalarCmd[scalarIndex];

	recordedEvents.push({
		timestamp,
		deviceIndex: device.info.index,
		deviceName: device.name,
		actuatorIndex: scalarIndex,
		actuatorType: scalarCmd.ActuatorType,
		value: (value / scalarCmd.StepCount) * 100, // Normalize to 0-100
	});
}

async function handleStop(device: BluetoothDevice) {
	await client.sendDeviceMessage(
		{ index: device.info.index },
		new StopDeviceCmd(device.info.index),
	);
	device.actuatorValues = device.info.messageAttributes.ScalarCmd.map(() => 0);
}

function convertDevice(device: ButtplugClientDevice): BluetoothDevice {
	console.log(device);
	return {
		id: device.index as string,
		name: device.name as string,
		batteryLevel: 0,
		isConnected: true,
		lastSeen: new Date(),
		sensorValues: device.messageAttributes.SensorReadCmd
			? device.messageAttributes.SensorReadCmd.map(() => 0)
			: [],
		actuatorValues: device.messageAttributes.ScalarCmd.map(() => 0),
		info: device,
	};
}

async function handleSaveRecording(data: {
	title: string;
	description: string;
	tags: string[];
}) {
	const deviceInfo: DeviceInfo[] = devices.map((d) => ({
		name: d.name,
		index: d.info.index,
		capabilities: d.info.messageAttributes.ScalarCmd.map((cmd) => cmd.ActuatorType),
	}));

	try {
		const response = await fetch("/api/sexy/recordings", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				title: data.title,
				description: data.description,
				duration: recordingDuration,
				events: recordedEvents,
				device_info: deviceInfo,
				tags: data.tags,
				status: "draft",
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		toast.success("Recording saved successfully!");
		showSaveDialog = false;
		recordedEvents = [];
		recordingDuration = 0;

		// Optionally navigate to dashboard
		// goto("/me?tab=recordings");
	} catch (error) {
		console.error("Failed to save recording:", error);
		toast.error("Failed to save recording. Please try again.");
	}
}

function handleCancelSave() {
	showSaveDialog = false;
	recordedEvents = [];
	recordingDuration = 0;
}

// Playback functions
function startPlayback() {
	if (!data.recording || devices.length === 0) {
		toast.error("Please connect devices before playing recording");
		return;
	}

	isPlaying = true;
	playbackStartTime = performance.now();
	playbackProgress = 0;
	currentEventIndex = 0;
	scheduleNextEvent();
}

function stopPlayback() {
	isPlaying = false;
	if (playbackTimeoutId !== null) {
		clearTimeout(playbackTimeoutId);
		playbackTimeoutId = null;
	}
	playbackProgress = 0;
	currentEventIndex = 0;

	// Stop all devices
	devices.forEach((device) => handleStop(device));
}

function pausePlayback() {
	isPlaying = false;
	if (playbackTimeoutId !== null) {
		clearTimeout(playbackTimeoutId);
		playbackTimeoutId = null;
	}
}

function resumePlayback() {
	if (!data.recording) return;

	isPlaying = true;
	playbackStartTime = performance.now() - playbackProgress;
	scheduleNextEvent();
}

function scheduleNextEvent() {
	if (!data.recording || !isPlaying || !playbackStartTime) return;

	const events = data.recording.events;
	if (currentEventIndex >= events.length) {
		stopPlayback();
		toast.success("Playback finished");
		return;
	}

	const event = events[currentEventIndex];
	const currentTime = performance.now() - playbackStartTime;
	const delay = event.timestamp - currentTime;

	if (delay <= 0) {
		// Execute event immediately
		executeEvent(event);
		currentEventIndex++;
		scheduleNextEvent();
	} else {
		// Schedule event
		playbackTimeoutId = setTimeout(() => {
			executeEvent(event);
			currentEventIndex++;
			playbackProgress = event.timestamp;
			scheduleNextEvent();
		}, delay) as unknown as number;
	}
}

function executeEvent(event: RecordedEvent) {
	// Find matching device by name
	const device = devices.find(d => d.name === event.deviceName);
	if (!device) {
		console.warn(`Device not found: ${event.deviceName}`);
		return;
	}

	// Find matching actuator
	const scalarCmd = device.info.messageAttributes.ScalarCmd.find(
		cmd => cmd.ActuatorType === event.actuatorType
	);
	if (!scalarCmd) {
		console.warn(`Actuator not found: ${event.actuatorType} on ${device.name}`);
		return;
	}

	// Convert normalized value (0-100) back to device scale
	const deviceValue = (event.value / 100) * scalarCmd.StepCount;

	// Send command to device
	client.sendDeviceMessage(
		{ index: device.info.index },
		new ScalarCmd(
			[
				new ScalarSubcommand(
					scalarCmd.Index,
					deviceValue,
					scalarCmd.ActuatorType,
				),
			],
			device.info.index,
		),
	);

	// Update UI
	const scalarIndex = device.info.messageAttributes.ScalarCmd.indexOf(scalarCmd);
	if (scalarIndex !== -1) {
		device.actuatorValues[scalarIndex] = deviceValue;
	}
}

function seek(percentage: number) {
	if (!data.recording) return;

	const targetTime = (percentage / 100) * data.recording.duration;
	playbackProgress = targetTime;

	// Find the event index at this time
	currentEventIndex = data.recording.events.findIndex(e => e.timestamp >= targetTime);
	if (currentEventIndex === -1) {
		currentEventIndex = data.recording.events.length;
	}

	if (isPlaying) {
		if (playbackTimeoutId !== null) {
			clearTimeout(playbackTimeoutId);
		}
		playbackStartTime = performance.now() - targetTime;
		scheduleNextEvent();
	}
}

const { data } = $props();

onMount(() => {
	if (data.authStatus.authenticated) {
		init();
		return;
	}
	goto("/login");
});
</script>

<Meta title={$_("play.title")} description={$_("play.description")} />

<div
    class="relative min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/5 overflow-hidden"
>
    <!-- Global Plasma Background -->
    <div class="absolute inset-0 pointer-events-none">
        <div
            class="absolute top-40 left-1/4 w-80 h-80 bg-gradient-to-r from-primary/16 via-accent/20 to-primary/12 rounded-full blur-3xl animate-blob-slow"
        ></div>
        <div
            class="absolute bottom-40 right-1/4 w-96 h-96 bg-gradient-to-r from-accent/16 via-primary/20 to-accent/12 rounded-full blur-3xl animate-blob-slow animation-delay-5000"
        ></div>
        <div
            class="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-r from-primary/14 via-accent/18 to-primary/10 rounded-full blur-2xl animate-blob-reverse animation-delay-2500"
        ></div>
    </div>

    <div class="container mx-auto py-20 relative px-4">
        <div class="max-w-4xl mx-auto">
            <!-- Header -->
            <div class="text-center mb-12">
                <h1
                    class="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent"
                >
                    {$_("play.title")}
                </h1>
                <p class="text-lg text-muted-foreground mb-10">
                    {$_("play.description")}
                </p>
                <div class="flex justify-center gap-4 items-center">
                    <Button
                        size="lg"
                        disabled={!connected || scanning}
                        onclick={startScanning}
                        class="cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
                    >
                        {#if scanning}
                            <div
                                class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2"
                            ></div>
                            {$_("play.scanning")}
                        {:else}
                            {$_("play.scan")}
                        {/if}
                    </Button>

                    {#if devices.length > 0 && !data.recording}
                        {#if !isRecording}
                            <Button
                                size="lg"
                                variant="outline"
                                onclick={startRecording}
                                class="cursor-pointer border-primary/30 hover:bg-primary/10"
                            >
                                <span class="icon-[ri--record-circle-line] w-5 h-5 mr-2"></span>
                                Start Recording
                            </Button>
                        {:else}
                            <Button
                                size="lg"
                                onclick={stopRecording}
                                class="cursor-pointer bg-red-500 hover:bg-red-600 text-white"
                            >
                                <span class="icon-[ri--stop-circle-fill] w-5 h-5 mr-2 animate-pulse"></span>
                                Stop Recording ({recordedEvents.length} events)
                            </Button>
                        {/if}
                    {/if}
                </div>
            </div>

            <!-- Playback Controls (only shown when recording is loaded) -->
            {#if data.recording}
                <div class="bg-card/50 border border-primary/20 rounded-lg p-6 backdrop-blur-sm">
                    <div class="mb-4">
                        <h2 class="text-xl font-semibold text-card-foreground mb-2">
                            {data.recording.title}
                        </h2>
                        {#if data.recording.description}
                            <p class="text-sm text-muted-foreground">
                                {data.recording.description}
                            </p>
                        {/if}
                    </div>

                    <!-- Progress Bar -->
                    <div class="mb-4">
                        <div class="flex items-center gap-3 mb-2">
                            <span class="text-sm text-muted-foreground min-w-[50px]">
                                {Math.floor(playbackProgress / 1000 / 60)}:{(Math.floor(playbackProgress / 1000) % 60).toString().padStart(2, '0')}
                            </span>
                            <div class="flex-1 h-2 bg-muted rounded-full overflow-hidden cursor-pointer relative"
                                 onclick={(e) => {
                                    const rect = e.currentTarget.getBoundingClientRect();
                                    const percentage = ((e.clientX - rect.left) / rect.width) * 100;
                                    seek(percentage);
                                 }}>
                                <div class="absolute inset-0 bg-gradient-to-r from-primary to-accent transition-all duration-150"
                                     style="width: {(playbackProgress / data.recording.duration) * 100}%"></div>
                            </div>
                            <span class="text-sm text-muted-foreground min-w-[50px] text-right">
                                {Math.floor(data.recording.duration / 1000 / 60)}:{(Math.floor(data.recording.duration / 1000) % 60).toString().padStart(2, '0')}
                            </span>
                        </div>
                    </div>

                    <!-- Playback Buttons -->
                    <div class="flex gap-2 justify-center">
                        <Button
                            size="lg"
                            variant="outline"
                            onclick={stopPlayback}
                            disabled={!isPlaying && playbackProgress === 0}
                            class="cursor-pointer border-primary/30 hover:bg-primary/10"
                        >
                            <span class="icon-[ri--stop-fill] w-5 h-5"></span>
                        </Button>
                        {#if !isPlaying}
                            <Button
                                size="lg"
                                onclick={playbackProgress > 0 ? resumePlayback : startPlayback}
                                disabled={devices.length === 0}
                                class="cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 min-w-[120px]"
                            >
                                <span class="icon-[ri--play-fill] w-5 h-5 mr-2"></span>
                                {playbackProgress > 0 ? 'Resume' : 'Play'}
                            </Button>
                        {:else}
                            <Button
                                size="lg"
                                onclick={pausePlayback}
                                class="cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 min-w-[120px]"
                            >
                                <span class="icon-[ri--pause-fill] w-5 h-5 mr-2"></span>
                                Pause
                            </Button>
                        {/if}
                    </div>

                    <!-- Recording Info -->
                    <div class="mt-4 pt-4 border-t border-border/50 grid grid-cols-3 gap-4 text-center">
                        <div>
                            <p class="text-xs text-muted-foreground">Events</p>
                            <p class="text-sm font-medium">{data.recording.events.length}</p>
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">Devices</p>
                            <p class="text-sm font-medium">{data.recording.device_info.length}</p>
                        </div>
                        <div>
                            <p class="text-xs text-muted-foreground">Status</p>
                            <p class="text-sm font-medium capitalize">{data.recording.status}</p>
                        </div>
                    </div>
                </div>
            {/if}
        </div>
    </div>
    <div class="container mx-auto px-4 py-12">
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {#if devices}
                {#each devices as device}
                    <DeviceCard
                        {device}
                        onChange={(scalarIndex, val) => handleChange(device, scalarIndex, val)}
                        onStop={() => handleStop(device)}
                    />
                {/each}
            {/if}
        </div>

        {#if devices?.length === 0}
            <div class="text-center py-12">
                <p class="text-muted-foreground text-lg mb-4">
                    {$_("play.no_results")}
                </p>
            </div>
        {/if}
    </div>

    <!-- Recording Save Dialog -->
    <RecordingSaveDialog
        open={showSaveDialog}
        events={recordedEvents}
        deviceInfo={devices.map((d) => ({
            name: d.name,
            index: d.info.index,
            capabilities: d.info.messageAttributes.ScalarCmd.map((cmd) => cmd.ActuatorType),
        }))}
        duration={recordingDuration}
        onSave={handleSaveRecording}
        onCancel={handleCancelSave}
    />
</div>
