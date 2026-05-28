PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_installation_targets` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`building_id` text NOT NULL,
	`vote_count` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`building_id`,`campus_id`) REFERENCES `buildings`(`id`,`campus_id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_installation_targets`("id", "campus_id", "building_id", "vote_count", "created_at", "updated_at") SELECT "id", "campus_id", "building_id", "vote_count", "created_at", "updated_at" FROM `installation_targets`;--> statement-breakpoint
DROP TABLE `installation_targets`;--> statement-breakpoint
ALTER TABLE `__new_installation_targets` RENAME TO `installation_targets`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `installation_targets_campus_building_idx` ON `installation_targets` (`campus_id`,`building_id`);--> statement-breakpoint
CREATE TABLE `__new_stations` (
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
--> statement-breakpoint
INSERT INTO `__new_stations`("id", "campus_id", "building_id", "name", "description", "relative_x", "relative_y", "status", "short_link_id", "short_link_url", "is_public", "created_at", "updated_at") SELECT "id", "campus_id", "building_id", "name", "description", "relative_x", "relative_y", "status", "short_link_id", "short_link_url", "is_public", "created_at", "updated_at" FROM `stations`;--> statement-breakpoint
DROP TABLE `stations`;--> statement-breakpoint
ALTER TABLE `__new_stations` RENAME TO `stations`;--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_id_campus_idx` ON `buildings` (`id`,`campus_id`);