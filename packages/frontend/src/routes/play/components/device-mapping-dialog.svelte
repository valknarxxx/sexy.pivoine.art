<script lang="ts">
import { _ } from "svelte-i18n";
import * as Dialog from "$lib/components/ui/dialog";
import Button from "$lib/components/ui/button/button.svelte";
import type { BluetoothDevice, DeviceInfo } from "$lib/types";

interface Props {
	open: boolean;
	recordedDevices: DeviceInfo[];
	connectedDevices: BluetoothDevice[];
	onConfirm: (mappings: Map<string, BluetoothDevice>) => void;
	onCancel: () => void;
}

let { open, recordedDevices, connectedDevices, onConfirm, onCancel }: Props = $props();

// Device mappings: recorded device name -> connected device
let mappings = $state<Map<string, BluetoothDevice>>(new Map());

// Check if a connected device is compatible with a recorded device
function isCompatible(recordedDevice: DeviceInfo, connectedDevice: BluetoothDevice): boolean {
	const connectedActuators = connectedDevice.info.messageAttributes.ScalarCmd.map(
		cmd => cmd.ActuatorType
	);

	// Check if all required actuator types from recording exist on connected device
	return recordedDevice.capabilities.every(requiredType =>
		connectedActuators.includes(requiredType)
	);
}

// Get compatible devices for a recorded device
function getCompatibleDevices(recordedDevice: DeviceInfo): BluetoothDevice[] {
	return connectedDevices.filter(device => isCompatible(recordedDevice, device));
}

// Auto-map devices on open
$effect(() => {
	if (open && recordedDevices.length > 0 && connectedDevices.length > 0) {
		const newMappings = new Map<string, BluetoothDevice>();

		recordedDevices.forEach(recordedDevice => {
			// Try to find exact name match first
			let match = connectedDevices.find(d => d.name === recordedDevice.name);

			// If no exact match, find first compatible device
			if (!match) {
				const compatible = getCompatibleDevices(recordedDevice);
				if (compatible.length > 0) {
					match = compatible[0];
				}
			}

			if (match) {
				newMappings.set(recordedDevice.name, match);
			}
		});

		mappings = newMappings;
	}
});

function handleConfirm() {
	// Validate that all devices are mapped
	const allMapped = recordedDevices.every(rd => mappings.has(rd.name));
	if (!allMapped) {
		return;
	}
	onConfirm(mappings);
}

function handleDeviceSelect(recordedDeviceName: string, deviceId: string) {
	if (!deviceId) return;

	const device = connectedDevices.find(d => d.id === deviceId);
	if (device) {
		const newMappings = new Map(mappings);
		newMappings.set(recordedDeviceName, device);
		mappings = newMappings;
	}
}

const allDevicesMapped = $derived(
	recordedDevices.every(rd => mappings.has(rd.name))
);
</script>

<Dialog.Root {open}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Map Devices for Playback</Dialog.Title>
			<Dialog.Description>
				Assign your connected devices to match the recorded devices. Only compatible devices are shown.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
			{#each recordedDevices as recordedDevice}
				{@const compatibleDevices = getCompatibleDevices(recordedDevice)}
				{@const currentMapping = mappings.get(recordedDevice.name)}

				<div class="flex items-center gap-4 p-4 bg-muted/30 rounded-lg border border-border/50">
					<div class="flex-1">
						<div class="flex items-center gap-2 mb-2">
							<span class="icon-[ri--router-line] w-5 h-5 text-primary"></span>
							<h3 class="font-semibold text-card-foreground">{recordedDevice.name}</h3>
						</div>
						<div class="flex flex-wrap gap-1">
							{#each recordedDevice.capabilities as capability}
								<span class="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
									{capability}
								</span>
							{/each}
						</div>
					</div>

					<div class="w-px h-12 bg-border"></div>

					<div class="flex-1">
						{#if compatibleDevices.length === 0}
							<div class="flex items-center gap-2 text-destructive">
								<span class="icon-[ri--error-warning-line] w-5 h-5"></span>
								<span class="text-sm">No compatible devices</span>
							</div>
						{:else}
							<select
								class="w-full px-3 py-2 rounded-md border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
								value={currentMapping?.id || ''}
								onchange={(e) => handleDeviceSelect(recordedDevice.name, e.currentTarget.value)}
							>
								<option value="" disabled>Select device...</option>
								{#each compatibleDevices as device}
									<option value={device.id}>
										{device.name}
										{#if device.name === recordedDevice.name}(exact match){/if}
									</option>
								{/each}
							</select>
						{/if}
					</div>
				</div>
			{/each}

			{#if recordedDevices.length === 0}
				<div class="text-center py-8 text-muted-foreground">
					No devices in this recording
				</div>
			{/if}
		</div>

		<Dialog.Footer class="flex gap-2">
			<Button variant="outline" onclick={onCancel} class="cursor-pointer">
				Cancel
			</Button>
			<Button
				onclick={handleConfirm}
				disabled={!allDevicesMapped}
				class="cursor-pointer bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
			>
				{#if !allDevicesMapped}
					<span class="icon-[ri--error-warning-line] w-4 h-4 mr-2"></span>
					Map All Devices
				{:else}
					<span class="icon-[ri--play-fill] w-4 h-4 mr-2"></span>
					Start Playback
				{/if}
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
