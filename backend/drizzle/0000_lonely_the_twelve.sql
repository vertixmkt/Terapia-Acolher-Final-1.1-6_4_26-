CREATE TABLE `assignments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`therapist_id` int NOT NULL,
	`status` enum('pendente','confirmado','cancelado') DEFAULT 'pendente',
	`compatibility_score` float DEFAULT 0,
	`match_reason` text,
	`notified_patient` boolean DEFAULT false,
	`notified_therapist` boolean DEFAULT false,
	`assigned_at` timestamp DEFAULT (now()),
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `assignments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `lead_replenishments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`therapist_id` int NOT NULL,
	`assignment_id` int NOT NULL,
	`reason` text,
	`contacted_0h` boolean DEFAULT false,
	`contacted_24h` boolean DEFAULT false,
	`contacted_72h` boolean DEFAULT false,
	`contacted_15d` boolean DEFAULT false,
	`status` enum('pending','approved','rejected') DEFAULT 'pending',
	`admin_notes` text,
	`created_at` timestamp DEFAULT (now()),
	`resolved_at` timestamp,
	CONSTRAINT `lead_replenishments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manychat_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`api_key` varchar(500),
	`flow_ns_notify_therapist` varchar(255) DEFAULT 'content20260219182249_152653',
	`flow_ns_notify_patient` varchar(255) DEFAULT 'content20260219182249_152654',
	`tag_id_new_patient` int DEFAULT 81766426,
	`tag_id_therapist_assigned` int DEFAULT 81766427,
	`cf_id_patient_name` int DEFAULT 14362950,
	`cf_id_patient_whatsapp` int DEFAULT 14362951,
	`cf_id_patient_shift` int DEFAULT 14362952,
	`cf_id_patient_reason` int DEFAULT 14362953,
	`cf_id_patient_assigned` int DEFAULT 14300039,
	`cf_id_therapist_name` int DEFAULT 14045578,
	`cf_id_therapist_whatsapp` int DEFAULT 14045579,
	`cf_id_therapist_assigned` int DEFAULT 14061515,
	`active` boolean DEFAULT true,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manychat_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `manychat_subscribers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`whatsapp` varchar(20) NOT NULL,
	`subscriber_id` varchar(255) NOT NULL,
	`name` varchar(255),
	`therapist_id` int,
	`patient_id` int,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `manychat_subscribers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matching_config` (
	`id` int AUTO_INCREMENT NOT NULL,
	`mode` enum('auto','semi','manual','pausado') DEFAULT 'auto',
	`weight_gender` int DEFAULT 100,
	`weight_shift` int DEFAULT 80,
	`weight_specialty` int DEFAULT 70,
	`weight_approach` int DEFAULT 60,
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `matching_config_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `matching_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`patient_id` int NOT NULL,
	`therapist_id` int,
	`patient_name` varchar(255),
	`therapist_name` varchar(255),
	`score` float DEFAULT 0,
	`reason` text,
	`success` boolean DEFAULT false,
	`error` text,
	`decided_at` timestamp DEFAULT (now()),
	CONSTRAINT `matching_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `patients` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`phone` varchar(20),
	`gender` enum('M','F','NB') NOT NULL,
	`preferred_gender` enum('M','F','NB','indifferent') DEFAULT 'indifferent',
	`shift` enum('manha','tarde','noite','flexivel') DEFAULT 'flexivel',
	`reason` text,
	`therapy_for` enum('normal','casal','infantil','outra_pessoa') DEFAULT 'normal',
	`child_name` varchar(255),
	`child_age` int,
	`relative_name` varchar(255),
	`relative_phone` varchar(20),
	`contact_when` varchar(100),
	`manychat_subscriber_id` varchar(255),
	`assigned_therapist_id` int,
	`assigned_at` timestamp,
	`status` enum('pendente','atribuido','arquivado') DEFAULT 'pendente',
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `patients_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `therapists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(320),
	`phone` varchar(20),
	`whatsapp` varchar(20) NOT NULL,
	`gender` enum('M','F','NB') NOT NULL,
	`approach` varchar(255) NOT NULL,
	`specialties` json DEFAULT ('[]'),
	`serves_gender` enum('M','F','NB','todos') DEFAULT 'todos',
	`serves_children` boolean DEFAULT false,
	`serves_teens` boolean DEFAULT false,
	`serves_elderly` boolean DEFAULT false,
	`serves_lgbt` boolean DEFAULT false,
	`serves_couples` boolean DEFAULT false,
	`shifts` json DEFAULT ('["manha"]'),
	`status` enum('ativo','inativo','pendente') DEFAULT 'pendente',
	`balance` int DEFAULT 0,
	`total_assignments` int DEFAULT 0,
	`last_assigned_at` timestamp,
	`manychat_subscriber_id` varchar(255),
	`has_formation` boolean DEFAULT false,
	`replenishments_used` int DEFAULT 0,
	`replenishments_max` int DEFAULT 3,
	`created_at` timestamp DEFAULT (now()),
	`updated_at` timestamp DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `therapists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks_kiwify` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` varchar(255) NOT NULL,
	`order_ref` varchar(100),
	`customer_name` varchar(255),
	`customer_email` varchar(320),
	`customer_phone` varchar(20),
	`product_name` varchar(255),
	`offer_name` varchar(255),
	`plan_name` varchar(255),
	`leads_qty` int DEFAULT 0,
	`amount` int DEFAULT 0,
	`order_status` varchar(50),
	`processing_status` enum('pending','processed','error') DEFAULT 'pending',
	`therapist_id` int,
	`raw_payload` json,
	`error_message` text,
	`created_at` timestamp DEFAULT (now()),
	`processed_at` timestamp,
	CONSTRAINT `webhooks_kiwify_id` PRIMARY KEY(`id`),
	CONSTRAINT `webhooks_kiwify_order_id_unique` UNIQUE(`order_id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks_manychat_received` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('patient_new','patient_update','therapist_update','other') DEFAULT 'other',
	`contact_name` varchar(255),
	`contact_phone` varchar(20),
	`contact_email` varchar(320),
	`manychat_subscriber_id` varchar(255),
	`gender` varchar(10),
	`preferred_gender` varchar(20),
	`shift` varchar(20),
	`reason` text,
	`therapy_for` varchar(30),
	`processing_status` enum('pending','processed','error') DEFAULT 'pending',
	`patient_id` int,
	`raw_payload` json,
	`error_message` text,
	`created_at` timestamp DEFAULT (now()),
	`processed_at` timestamp,
	CONSTRAINT `webhooks_manychat_received_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `webhooks_manychat_sent` (
	`id` int AUTO_INCREMENT NOT NULL,
	`type` enum('notify_patient','notify_therapist','set_custom_field','add_tag','other') DEFAULT 'other',
	`recipient_name` varchar(255),
	`recipient_subscriber_id` varchar(255),
	`assignment_id` int,
	`patient_id` int,
	`therapist_id` int,
	`status` enum('success','error','skipped') DEFAULT 'success',
	`payload_sent` json,
	`response_received` json,
	`error_message` text,
	`sent_at` timestamp DEFAULT (now()),
	CONSTRAINT `webhooks_manychat_sent_id` PRIMARY KEY(`id`)
);
