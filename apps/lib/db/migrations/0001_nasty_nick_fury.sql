CREATE TABLE `buildings` (
	`id` text PRIMARY KEY NOT NULL,
	`campus_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	`updated_at` text DEFAULT 'CURRENT_TIMESTAMP' NOT NULL,
	FOREIGN KEY (`campus_id`) REFERENCES `campuses`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `buildings_campus_sort_idx` ON `buildings` (`campus_id`,`sort_order`);--> statement-breakpoint
CREATE UNIQUE INDEX `buildings_campus_name_idx` ON `buildings` (`campus_id`,`name`);