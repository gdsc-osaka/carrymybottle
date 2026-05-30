PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_station_temperatures` (
	`station_id` text NOT NULL,
	`temperature_type` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`station_id`, `temperature_type`),
	FOREIGN KEY (`station_id`) REFERENCES `stations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_station_temperatures`("station_id", "temperature_type", "created_at") SELECT "station_id", "temperature_type", "created_at" FROM `station_temperatures`;--> statement-breakpoint
DROP TABLE `station_temperatures`;--> statement-breakpoint
ALTER TABLE `__new_station_temperatures` RENAME TO `station_temperatures`;--> statement-breakpoint
PRAGMA foreign_keys=ON;