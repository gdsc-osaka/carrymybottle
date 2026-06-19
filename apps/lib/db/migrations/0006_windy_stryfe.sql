CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`category` text NOT NULL,
	`name` text,
	`message` text NOT NULL,
	`reporter_email` text NOT NULL,
	`admin_email_sent_at` integer,
	`auto_reply_sent_at` integer,
	`auto_reply_error` text,
	`created_at` integer NOT NULL,
	`deleted_at` integer
);
