-- Order processing states used to reserve payment/completion transitions.
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_PROCESSING';
ALTER TYPE "OrderStatus" ADD VALUE 'COMPLETING';

CREATE TYPE "DeadlineExtensionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RefundRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "RefundReason" AS ENUM ('MISSED_DEADLINE', 'WORK_NOT_DELIVERED', 'QUALITY_ISSUE', 'REQUIREMENTS_NOT_MET', 'OTHER');

-- Manual deletion and role-based hiding are separate concepts from now on.
ALTER TABLE "services" ADD COLUMN "deletedAt" TIMESTAMP(3);

-- Best-effort migration of existing soft-deleted services: an inactive service
-- owned by a current freelancer could only have been manually deleted.
UPDATE "services" AS service
SET "deletedAt" = service."updatedAt"
FROM "users" AS owner
WHERE service."freelancerId" = owner."id"
  AND service."isActive" = false
  AND owner."role" = 'FREELANCER';

-- Freeze package terms for existing and future orders.
ALTER TABLE "orders"
  ADD COLUMN "packageName" TEXT,
  ADD COLUMN "packageDescription" TEXT,
  ADD COLUMN "packageDeliveryDays" INTEGER,
  ADD COLUMN "packageRevisions" INTEGER,
  ADD COLUMN "packageFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

UPDATE "orders" AS order_row
SET
  "packageName" = package."name",
  "packageDescription" = package."description",
  "packageDeliveryDays" = package."deliveryDays",
  "packageRevisions" = package."revisions",
  "packageFeatures" = COALESCE(package."features", ARRAY[]::TEXT[])
FROM "service_packages" AS package
WHERE order_row."packageId" = package."id";

ALTER TABLE "orders"
  ALTER COLUMN "packageName" SET NOT NULL,
  ALTER COLUMN "packageDeliveryDays" SET NOT NULL,
  ALTER COLUMN "packageRevisions" SET NOT NULL;

CREATE TABLE "deadline_extension_requests" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "resolvedById" TEXT,
  "additionalDays" INTEGER NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "DeadlineExtensionStatus" NOT NULL DEFAULT 'PENDING',
  "activeKey" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  CONSTRAINT "deadline_extension_requests_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "refund_requests" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "requesterId" TEXT NOT NULL,
  "resolvedById" TEXT,
  "reason" "RefundReason" NOT NULL,
  "message" TEXT NOT NULL,
  "status" "RefundRequestStatus" NOT NULL DEFAULT 'PENDING',
  "activeKey" TEXT,
  "contextSnapshot" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resolvedAt" TIMESTAMP(3),
  "resolutionComment" TEXT,
  CONSTRAINT "refund_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "deadline_extension_requests_activeKey_key" ON "deadline_extension_requests"("activeKey");
CREATE INDEX "deadline_extension_requests_orderId_createdAt_idx" ON "deadline_extension_requests"("orderId", "createdAt");
CREATE INDEX "deadline_extension_requests_status_idx" ON "deadline_extension_requests"("status");
CREATE UNIQUE INDEX "refund_requests_activeKey_key" ON "refund_requests"("activeKey");
CREATE INDEX "refund_requests_orderId_createdAt_idx" ON "refund_requests"("orderId", "createdAt");
CREATE INDEX "refund_requests_status_idx" ON "refund_requests"("status");

ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "deadline_extension_requests" ADD CONSTRAINT "deadline_extension_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_requesterId_fkey" FOREIGN KEY ("requesterId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "refund_requests" ADD CONSTRAINT "refund_requests_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
