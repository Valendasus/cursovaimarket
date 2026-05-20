-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN     "attachmentName" TEXT,
ADD COLUMN     "attachmentSize" INTEGER,
ADD COLUMN     "attachmentType" TEXT,
ADD COLUMN     "attachmentUrl" TEXT,
ALTER COLUMN "content" DROP NOT NULL;
