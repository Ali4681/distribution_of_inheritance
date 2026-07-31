ALTER TABLE "properties" RENAME COLUMN "estimated_value" TO "total_shares";

ALTER TABLE "properties"
ALTER COLUMN "total_shares" TYPE INTEGER
USING GREATEST(1, COALESCE(ROUND("total_shares"), 2400))::INTEGER;

UPDATE "properties" SET "total_shares" = 2400 WHERE "total_shares" IS NULL;

ALTER TABLE "properties"
ALTER COLUMN "total_shares" SET DEFAULT 2400,
ALTER COLUMN "total_shares" SET NOT NULL;
