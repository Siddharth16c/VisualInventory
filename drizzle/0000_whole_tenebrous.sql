CREATE TABLE `account` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`month_year` text NOT NULL,
	`total_revenue` real NOT NULL,
	`total_cost` real NOT NULL,
	`profit` real NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `bills` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`bill_number` text NOT NULL,
	`business_name` text NOT NULL,
	`print_format` text NOT NULL,
	`pdf_blob` blob,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `brands` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`vertical_id` integer NOT NULL,
	FOREIGN KEY (`vertical_id`) REFERENCES `verticals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `business_config` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`address` text,
	`contact` text,
	`email` text,
	`website` text,
	`gstin` text,
	`is_active` integer DEFAULT false NOT NULL,
	`enabled_features` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `business_config_name_unique` ON `business_config` (`name`);--> statement-breakpoint
CREATE TABLE `costs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`cost_type` text NOT NULL,
	`business_type` text NOT NULL,
	`cost_factor_id` integer,
	`order_id` integer,
	`amount` real NOT NULL,
	`description` text,
	`date` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_name` text NOT NULL,
	`category` text NOT NULL,
	`product_id` integer,
	`brand_id` integer,
	`vertical_id` integer,
	`packing_unit_id` integer,
	`variant_param1_id` integer,
	`variant_param2_id` integer,
	`variant_param3_id` integer,
	`p_unit` integer DEFAULT 1 NOT NULL,
	`P_unit_per_parcel` integer DEFAULT 1 NOT NULL,
	`stock_parcels` integer DEFAULT 0 NOT NULL,
	`stock_units` integer DEFAULT 0 NOT NULL,
	`retail_price_unit` real DEFAULT 0 NOT NULL,
	`retail_price_container` real DEFAULT 0 NOT NULL,
	`wholesale_price_unit` real DEFAULT 0 NOT NULL,
	`wholesale_price_container` real DEFAULT 0 NOT NULL,
	`mrp` real DEFAULT 0 NOT NULL,
	`metadata` text,
	`createdAt` text NOT NULL,
	`updatedAt` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`brand_id`) REFERENCES `brands`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vertical_id`) REFERENCES `verticals`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`packing_unit_id`) REFERENCES `packing_units`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_param1_id`) REFERENCES `variant_params_1`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_param2_id`) REFERENCES `variant_params_2`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`variant_param3_id`) REFERENCES `variant_params_3`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `marketing_catalogues` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`item_ids` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`item_id` integer NOT NULL,
	`item_name` text NOT NULL,
	`qty` integer NOT NULL,
	`unit_price` real NOT NULL,
	`discount` real NOT NULL,
	`total` real NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`prospect_name` text NOT NULL,
	`order_date` text NOT NULL,
	`pricing_mode` text NOT NULL,
	`status` text NOT NULL,
	`subtotal` real DEFAULT 0 NOT NULL,
	`tax_amount` real DEFAULT 0 NOT NULL,
	`discount_amount` real DEFAULT 0 NOT NULL,
	`grand_total` real DEFAULT 0 NOT NULL,
	`paid_amount` real DEFAULT 0 NOT NULL,
	`due_amount` real DEFAULT 0 NOT NULL,
	`payment_status` text NOT NULL,
	`notes` text,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `packing_units` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`unit_name` text NOT NULL,
	`multiplier` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `product_media` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` integer NOT NULL,
	`media_role` text NOT NULL,
	`data` blob NOT NULL,
	`filename` text NOT NULL,
	`mime_type` text NOT NULL,
	`createdAt` text NOT NULL,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`category` text NOT NULL,
	`vertical_id` integer NOT NULL,
	FOREIGN KEY (`vertical_id`) REFERENCES `verticals`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `products_name_unique` ON `products` (`name`);--> statement-breakpoint
CREATE TABLE `prospects` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospectname` text NOT NULL,
	`area_town` text NOT NULL,
	`contact` text NOT NULL,
	`business_type` text NOT NULL,
	`route_id` integer,
	`notes` text,
	`createdAt` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `travel_records` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`travel_date` text NOT NULL,
	`route_id` integer NOT NULL,
	`route_name` text,
	`is_ideal` integer NOT NULL,
	`notes` text
);
--> statement-breakpoint
CREATE TABLE `variant_params_1` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`product_id` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `variant_params_2` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`product_id` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `variant_params_3` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`product_id` integer,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `verticals` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `verticals_name_unique` ON `verticals` (`name`);--> statement-breakpoint
CREATE TABLE `visits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`prospect_id` integer NOT NULL,
	`visit_date` text NOT NULL,
	`route_id` integer,
	`outcome` text,
	`notes` text,
	FOREIGN KEY (`prospect_id`) REFERENCES `prospects`(`id`) ON UPDATE no action ON DELETE no action
);
