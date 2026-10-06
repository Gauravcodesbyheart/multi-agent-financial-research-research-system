ALTER TABLE "document_chunks" ADD COLUMN "embedding" jsonb;--> statement-breakpoint
ALTER TABLE "document_chunks" ADD COLUMN "embedding_model" varchar(100);--> statement-breakpoint
ALTER TABLE "documents" ADD COLUMN "embedding_status" varchar(50) DEFAULT 'pending' NOT NULL;--> statement-breakpoint
UPDATE "document_chunks" SET "page_number" = NULL;