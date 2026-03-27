CREATE TABLE "one_time_prekeys" (
	"user_id" uuid NOT NULL,
	"device_id" text DEFAULT 'primary' NOT NULL,
	"key_id" integer NOT NULL,
	"public_key" text NOT NULL,
	"is_used" boolean DEFAULT false NOT NULL,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "pk_otpk" PRIMARY KEY("user_id","device_id","key_id")
);
--> statement-breakpoint
CREATE TABLE "user_key_bundles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"device_id" text DEFAULT 'primary' NOT NULL,
	"identity_key" text NOT NULL,
	"signed_prekey_id" integer NOT NULL,
	"signed_prekey" text NOT NULL,
	"signed_prekey_signature" text NOT NULL,
	"registration_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_settings" ADD COLUMN "pin_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
ALTER TABLE "chats" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "is_encrypted" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "encrypted_payload" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "sender_device_id" text;--> statement-breakpoint
ALTER TABLE "messages" ADD COLUMN "search_vector" "tsvector";--> statement-breakpoint
ALTER TABLE "one_time_prekeys" ADD CONSTRAINT "one_time_prekeys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_key_bundles" ADD CONSTRAINT "user_key_bundles_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_otpk_user_unused" ON "one_time_prekeys" USING btree ("user_id","is_used");--> statement-breakpoint
CREATE UNIQUE INDEX "uq_user_device_key" ON "user_key_bundles" USING btree ("user_id","device_id");--> statement-breakpoint
CREATE INDEX "idx_key_bundles_user_id" ON "user_key_bundles" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_contacts_contact_id" ON "contacts" USING btree ("contact_id");--> statement-breakpoint
CREATE INDEX "idx_sessions_user_active" ON "sessions" USING btree ("user_id","is_active");--> statement-breakpoint
CREATE INDEX "idx_users_search" ON "users" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_users_active" ON "users" USING btree ("created_at") WHERE is_deleted = false;--> statement-breakpoint
CREATE INDEX "idx_chat_members_user_id" ON "chat_members" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_chat_members_active" ON "chat_members" USING btree ("chat_id") WHERE role NOT IN ('left', 'banned');--> statement-breakpoint
CREATE INDEX "idx_chats_updated_at" ON "chats" USING btree ("updated_at");--> statement-breakpoint
CREATE INDEX "idx_chats_search" ON "chats" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_chats_public" ON "chats" USING btree ("type") WHERE is_public = true;--> statement-breakpoint
CREATE INDEX "idx_messages_chat_created" ON "messages" USING btree ("chat_id","created_at");--> statement-breakpoint
CREATE INDEX "idx_messages_sender" ON "messages" USING btree ("sender_id");--> statement-breakpoint
CREATE INDEX "idx_messages_search" ON "messages" USING gin ("search_vector");--> statement-breakpoint
CREATE INDEX "idx_messages_ttl" ON "messages" USING btree ("ttl_expires_at");