CREATE TABLE "document_processing_jobs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"document_id" uuid NOT NULL,
	"status" varchar(50) DEFAULT 'queued' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"max_attempts" integer DEFAULT 3 NOT NULL,
	"next_attempt_at" timestamp DEFAULT now() NOT NULL,
	"locked_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "document_processing_jobs_document_id_unique" UNIQUE("document_id")
);
--> statement-breakpoint
ALTER TABLE "document_processing_jobs" ADD CONSTRAINT "document_processing_jobs_document_id_documents_id_fk" FOREIGN KEY ("document_id") REFERENCES "public"."documents"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "document_processing_jobs_status_next_attempt_idx" ON "document_processing_jobs" USING btree ("status","next_attempt_at");--> statement-breakpoint
INSERT INTO "document_processing_jobs" ("document_id", "status", "attempts", "max_attempts", "next_attempt_at", "created_at", "updated_at")
SELECT "id", 'queued', 0, 3, now(), now(), now()
FROM "documents"
WHERE COALESCE("is_seeded", false) = false
  AND "processing_status" IN ('pending', 'processing', 'indexed', 'partial')
  AND "content" IS NOT NULL
ON CONFLICT ("document_id") DO NOTHING;