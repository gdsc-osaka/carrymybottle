PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_buildings`("id", "campus_id", "name", "sort_order", "created_at", "updated_at") SELECT "id", "campus_id", "name", "sort_order", "created_at", "updated_at" FROM `buildings`;--> statement-breakpoint
DROP TABLE `buildings`;--> statement-breakpoint
ALTER TABLE `__new_buildings` RENAME TO `buildings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `buildings_campus_sort_idx` ON `buildings` (`campus_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_campus_name_idx` ON `buildings` (`campus_id`,`name`);--> statement-breakpoint
CREATE TABLE `__new_campuses` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`map_image_path` text NOT NULL,
	`map_width` integer,
	`map_height` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_campuses`("id", "name", "map_image_path", "map_width", "map_height", "created_at", "updated_at") SELECT "id", "name", "map_image_path", "map_width", "map_height", "created_at", "updated_at" FROM `campuses`;--> statement-breakpoint
DROP TABLE `campuses`;--> statement-breakpoint
ALTER TABLE `__new_campuses` RENAME TO `campuses`;