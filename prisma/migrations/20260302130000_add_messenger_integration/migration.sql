CREATE TYPE "MessagingChannel" AS ENUM ('facebook_messenger');
CREATE TYPE "MessagingMessageDirection" AS ENUM ('inbound', 'outbound');
CREATE TYPE "MessagingMessageStatus" AS ENUM ('received', 'draft', 'sent', 'failed');

CREATE TABLE "MessengerIntegration" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "channel" "MessagingChannel" NOT NULL DEFAULT 'facebook_messenger',
  "pageId" TEXT NOT NULL,
  "pageName" TEXT NOT NULL,
  "pageAccessToken" TEXT NOT NULL,
  "reviewBeforeSend" BOOLEAN NOT NULL DEFAULT true,
  "autoReplyEnabled" BOOLEAN NOT NULL DEFAULT false,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "lastWebhookAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessengerIntegration_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessengerThread" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "channel" "MessagingChannel" NOT NULL DEFAULT 'facebook_messenger',
  "externalUserId" TEXT NOT NULL,
  "externalUserName" TEXT,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessengerThread_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MessengerMessage" (
  "id" TEXT NOT NULL,
  "orgId" TEXT NOT NULL,
  "integrationId" TEXT NOT NULL,
  "threadId" TEXT NOT NULL,
  "channel" "MessagingChannel" NOT NULL DEFAULT 'facebook_messenger',
  "direction" "MessagingMessageDirection" NOT NULL,
  "status" "MessagingMessageStatus" NOT NULL,
  "externalMessageId" TEXT,
  "body" TEXT NOT NULL,
  "aiModel" TEXT,
  "aiReason" TEXT,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "MessengerMessage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MessengerIntegration_orgId_channel_key" ON "MessengerIntegration"("orgId", "channel");
CREATE UNIQUE INDEX "MessengerIntegration_channel_pageId_key" ON "MessengerIntegration"("channel", "pageId");
CREATE INDEX "MessengerIntegration_orgId_idx" ON "MessengerIntegration"("orgId");

CREATE UNIQUE INDEX "MessengerThread_integrationId_externalUserId_key" ON "MessengerThread"("integrationId", "externalUserId");
CREATE INDEX "MessengerThread_orgId_lastMessageAt_idx" ON "MessengerThread"("orgId", "lastMessageAt");
CREATE INDEX "MessengerThread_integrationId_idx" ON "MessengerThread"("integrationId");

CREATE INDEX "MessengerMessage_orgId_createdAt_idx" ON "MessengerMessage"("orgId", "createdAt");
CREATE INDEX "MessengerMessage_threadId_createdAt_idx" ON "MessengerMessage"("threadId", "createdAt");
CREATE INDEX "MessengerMessage_integrationId_idx" ON "MessengerMessage"("integrationId");

ALTER TABLE "MessengerIntegration" ADD CONSTRAINT "MessengerIntegration_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessengerThread" ADD CONSTRAINT "MessengerThread_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessengerThread" ADD CONSTRAINT "MessengerThread_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "MessengerIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessengerMessage" ADD CONSTRAINT "MessengerMessage_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "Org"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessengerMessage" ADD CONSTRAINT "MessengerMessage_integrationId_fkey" FOREIGN KEY ("integrationId") REFERENCES "MessengerIntegration"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MessengerMessage" ADD CONSTRAINT "MessengerMessage_threadId_fkey" FOREIGN KEY ("threadId") REFERENCES "MessengerThread"("id") ON DELETE CASCADE ON UPDATE CASCADE;
