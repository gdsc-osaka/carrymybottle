CREATE TABLE `analytics_events` (
	`id` text PRIMARY KEY NOT NULL,
	`event_name` text NOT NULL,
	`station_id` text,
	`campus_id` text,
	`building_id` text,
	`source` text,
	`metadata_json` text,
	`environment` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "analytics_events_environment_check" CHECK(environment IN ('production', 'development'))
);
