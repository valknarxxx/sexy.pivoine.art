import { ButtplugClientDevice } from "@sexy.pivoine.art/buttplug";

export interface User {
	id: string;
	first_name: string;
	last_name: string;
	artist_name: string;
	slug: string;
	email: string;
	description: string;
	tags: string[];
	avatar: string | File;
	password: string;
	directus_users_id?: User;
}

export interface CurrentUser extends User {
	avatar: File;
	role: {
		name: string;
	};
	policies: {
		policy: {
			name: string;
		};
	}[];
}

export interface AuthStatus {
	authenticated: boolean;
	user?: CurrentUser;
	data?: {
		refresh_token: string | null;
	};
}

export interface File {
	id: string;
	filesize: number;
	title: string;
	description: string;
	duration: number;
	directus_files_id?: File;
}

export interface Article {
	id: string;
	slug: string;
	title: string;
	excerpt: string;
	content: string;
	image: string;
	tags: string[];
	publish_date: Date;
	author: {
		first_name: string;
		last_name: string;
		avatar: string;
		description?: string;
		website?: string;
	};
	category: string;
	featured?: boolean;
}

export interface Model {
	id: string;
	slug: string;
	artist_name: string;
	description: string;
	avatar: string;
	category: string;
	tags: string[];
	join_date: Date;
	featured?: boolean;
	photos: File[];
	banner?: File;
}

export interface Video {
	id: string;
	slug: string;
	title: string;
	description: string;
	image: string;
	movie: File;
	models: User[];
	tags: string[];
	upload_date: Date;
	premium?: boolean;
	featured?: boolean;
	likes_count?: number;
	plays_count?: number;
	views_count?: number;
}

export interface Comment {
	id: string;
	comment: string;
	item: string;
	user_created: User;
	date_created: Date;
}

export interface Stats {
	videos_count: number;
	models_count: number;
	viewers_count: number;
}

export interface BluetoothDevice {
	id: string;
	name: string;
	actuatorValues: number[];
	sensorValues: number[];
	batteryLevel: number;
	isConnected: boolean;
	lastSeen: Date;
	info: ButtplugClientDevice;
}

export interface ShareContent {
	title: string;
	description: string;
	url: string;
	type: "video" | "model" | "article" | "link";
}

export interface RecordedEvent {
	timestamp: number;
	deviceIndex: number;
	deviceName: string;
	actuatorIndex: number;
	actuatorType: string;
	value: number;
}

export interface DeviceInfo {
	name: string;
	index: number;
	capabilities: string[];
}

export interface Recording {
	id: string;
	title: string;
	description?: string;
	slug: string;
	duration: number;
	events: RecordedEvent[];
	device_info: DeviceInfo[];
	user_created: string | User;
	date_created: Date;
	date_updated?: Date;
	status: "draft" | "published" | "archived";
	tags?: string[];
	linked_video?: string | Video;
	featured?: boolean;
	public?: boolean;
}

export interface VideoLikeStatus {
	liked: boolean;
}

export interface VideoPlayRecord {
	id: string;
	video_id: string;
	duration_watched?: number;
	completed: boolean;
}

export interface VideoLikeResponse {
	liked: boolean;
	likes_count: number;
}

export interface VideoPlayResponse {
	success: boolean;
	play_id: string;
	plays_count: number;
}
