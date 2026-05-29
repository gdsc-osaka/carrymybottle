CREATE TABLE `admin_audit_events` (
	`id` text PRIMARY KEY NOT NULL,
	`action` text NOT NULL,
	`target_type` text NOT NULL,
	`target_id` text NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`station_id` text,
	`campus_id` text,
	`building_id` text,
	`source` text,
	`metadata_json` text,
	`environment` text DEFAULT 'development' NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_campus_name_idx` ON `buildings` (`campus_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_id_campus_idx` ON `buildings` (`id`,`campus_id`);--> statement-breakpoint
CREATE TABLE `campuses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`map_image_path` text NOT NULL,
	`map_width` integer,
	`map_height` integer,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `emergency_contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`station_id` text NOT NULL,
	`issue_type` text NOT NULL,
	`message` text NOT NULL,
	`reporter_email` text NOT NULL,
	`admin_email_sent_at` integer,
	`auto_reply_sent_at` integer,
	`auto_reply_error` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `installation_comments` (
	`id` text PRIMARY KEY NOT NULL,
	`target_id` text NOT NULL,
	`comment` text NOT NULL,
	`created_at` integer NOT NULL,
	`deleted_at` integer,
	FOREIGN KEY (`target_id`) REFERENCES `installation_targets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `installation_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`building_id` text NOT NULL,
	`vote_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`building_id`,`campus_id`) REFERENCES `buildings`(`id`,`campus_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `installation_targets_campus_building_idx` ON `installation_targets` (`campus_id`,`building_id`);--> statement-breakpoint
CREATE TABLE `installation_votes` (
	`id` text PRIMARY KEY NOT NULL,
	`target_id` text NOT NULL,
	`voter_token_hash` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`target_id`) REFERENCES `installation_targets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `station_temperatures` (
	`station_id` text NOT NULL,
	`temperature_type` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `station_temperatures_pk` ON `station_temperatures` (`station_id`,`temperature_type`);--> statement-breakpoint
CREATE TABLE `stations` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`building_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`relative_x` real DEFAULT 0.5 NOT NULL,
	`relative_y` real DEFAULT 0.5 NOT NULL,
	`status` text DEFAULT 'available' NOT NULL,
	`short_link_id` text,
	`short_link_url` text,
	`is_public` integer DEFAULT true NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`building_id`,`campus_id`) REFERENCES `buildings`(`id`,`campus_id`) ON UPDATE no action ON DELETE no action
);
