-- AlterTable
ALTER TABLE "direct_messages" ADD COLUMN "clientMessageId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "direct_messages_conversationId_senderId_clientMessageId_key"
ON "direct_messages"("conversationId", "senderId", "clientMessageId");
