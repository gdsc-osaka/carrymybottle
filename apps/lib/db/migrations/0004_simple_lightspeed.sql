PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_stations` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`building_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`relative_x` real NOT NULL,
	`relative_y` real NOT NULL,
	`status` text NOT NULL,
	`short_link_id` text,
	`short_link_url` text,
	`is_public` integer DEFAULT 1 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`building_id`) REFERENCES `buildings`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "stations_relative_x_check" CHECK(relative_x BETWEEN 0 AND 1),
	CONSTRAINT "stations_relative_y_check" CHECK(relative_y BETWEEN 0 AND 1),
	CONSTRAINT "stations_status_check" CHECK(status IN ('available', 'stopped', 'broken'))
);
--> statement-breakpoint
INSERT INTO `__new_stations`("id", "campus_id", "building_id", "name", "description", "relative_x", "relative_y", "status", "short_link_id", "short_link_url", "is_public", "created_at", "updated_at") SELECT "id", "campus_id", "building_id", "name", "description", "relative_x", "relative_y", "status", "short_link_id", "short_link_url", "is_public", "created_at", "updated_at" FROM `stations`;--> statement-breakpoint
DROP TABLE `stations`;--> statement-breakpoint
ALTER TABLE `__new_stations` RENAME TO `stations`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `stations_short_link_url_unique` ON `stations` (`short_link_url`);