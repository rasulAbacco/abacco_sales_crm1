-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "empId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isAlive" BOOLEAN DEFAULT true,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SalesLead" (
    "id" SERIAL NOT NULL,
    "client" TEXT NOT NULL,
    "email" TEXT,
    "cc" TEXT,
    "empId" TEXT,
    "phone" TEXT,
    "country" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "response" TEXT,
    "leadType" TEXT,
    "Result" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "leadStatus" TEXT NOT NULL DEFAULT 'New',
    "userId" INTEGER,
    "leadDetailsId" INTEGER,

    CONSTRAINT "SalesLead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LeadDetails" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3),
    "client" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "cc" TEXT,
    "empId" TEXT,
    "phone" TEXT,
    "subject" TEXT,
    "body" TEXT,
    "response" TEXT,
    "leadType" TEXT,
    "leadStatus" TEXT DEFAULT 'New',
    "brand" TEXT,
    "country" TEXT,
    "salesperson" TEXT,
    "result" TEXT,
    "companyName" TEXT,
    "meetingNotes" TEXT,
    "followUpDate" TIMESTAMP(3),
    "day" TEXT,
    "followUpHistory" JSONB,
    "dealValue" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" TIMESTAMP(3) NOT NULL,
    "active" BOOLEAN DEFAULT true,
    "isFollowedUp" BOOLEAN NOT NULL DEFAULT false,
    "userId" INTEGER,

    CONSTRAINT "LeadDetails_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailAccount" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "empId" TEXT,
    "email" TEXT NOT NULL,
    "provider" TEXT,
    "imapHost" TEXT,
    "imapPort" INTEGER,
    "imapUser" TEXT,
    "imapSecure" BOOLEAN DEFAULT true,
    "smtpHost" TEXT,
    "smtpPort" INTEGER,
    "smtpUser" TEXT,
    "smtpSecure" BOOLEAN DEFAULT true,
    "encryptedPass" TEXT,
    "oauthClientId" TEXT,
    "oauthClientSecret" TEXT,
    "refreshToken" TEXT,
    "accessToken" TEXT,
    "tokenExpiry" TIMESTAMP(3),
    "authType" TEXT NOT NULL DEFAULT 'password',
    "verified" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastFullSyncAt" TIMESTAMP(3),
    "lastSyncAt" TIMESTAMP(3),
    "lastUid" INTEGER DEFAULT 0,

    CONSTRAINT "EmailAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailMessage" (
    "id" SERIAL NOT NULL,
    "emailAccountId" INTEGER NOT NULL,
    "conversationId" INTEGER,
    "leadDetailId" INTEGER,
    "salesLeadId" INTEGER,
    "subject" TEXT,
    "fromEmail" TEXT NOT NULL,
    "toEmail" TEXT NOT NULL,
    "ccEmail" TEXT,
    "body" TEXT,
    "bodyHtml" TEXT,
    "direction" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "threadId" TEXT,
    "messageId" TEXT,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "isRead" BOOLEAN DEFAULT false,
    "isStarred" BOOLEAN DEFAULT false,
    "folder" TEXT DEFAULT 'inbox',
    "isDraft" BOOLEAN NOT NULL DEFAULT false,
    "isSpam" BOOLEAN NOT NULL DEFAULT false,
    "isTrash" BOOLEAN NOT NULL DEFAULT false,
    "hasBody" BOOLEAN NOT NULL DEFAULT false,
    "uid" INTEGER,
    "hideInbox" BOOLEAN DEFAULT false,
    "hideTrash" BOOLEAN DEFAULT false,

    CONSTRAINT "EmailMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Conversation" (
    "id" SERIAL NOT NULL,
    "accountId" INTEGER NOT NULL,
    "subject" TEXT,
    "fromEmail" TEXT,
    "toEmail" TEXT,
    "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unread" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attachment" (
    "id" SERIAL NOT NULL,
    "messageId" INTEGER NOT NULL,
    "filename" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "storageUrl" TEXT,
    "data" BYTEA,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cid" TEXT,
    "hash" TEXT,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tag" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "empId" TEXT,
    "name" TEXT NOT NULL,
    "color" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationTag" (
    "conversationId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "ConversationTag_pkey" PRIMARY KEY ("conversationId","tagId")
);

-- CreateTable
CREATE TABLE "MessageTag" (
    "messageId" INTEGER NOT NULL,
    "tagId" INTEGER NOT NULL,

    CONSTRAINT "MessageTag_pkey" PRIMARY KEY ("messageId","tagId")
);

-- CreateTable
CREATE TABLE "ScheduledMessage" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "empId" TEXT,
    "accountId" INTEGER NOT NULL,
    "conversationId" INTEGER,
    "toEmail" TEXT NOT NULL,
    "subject" TEXT,
    "bodyHtml" TEXT NOT NULL,
    "sendAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "attachments" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isFollowedUp" BOOLEAN DEFAULT false,

    CONSTRAINT "ScheduledMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_empId_key" ON "User"("empId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "EmailAccount_email_key" ON "EmailAccount"("email");

-- CreateIndex
CREATE INDEX "EmailMessage_uid_idx" ON "EmailMessage"("uid");

-- CreateIndex
CREATE UNIQUE INDEX "EmailMessage_emailAccountId_messageId_key" ON "EmailMessage"("emailAccountId", "messageId");

-- AddForeignKey
ALTER TABLE "SalesLead" ADD CONSTRAINT "SalesLead_leadDetailsId_fkey" FOREIGN KEY ("leadDetailsId") REFERENCES "LeadDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SalesLead" ADD CONSTRAINT "SalesLead_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LeadDetails" ADD CONSTRAINT "LeadDetails_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailAccount" ADD CONSTRAINT "EmailAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_emailAccountId_fkey" FOREIGN KEY ("emailAccountId") REFERENCES "EmailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_leadDetailId_fkey" FOREIGN KEY ("leadDetailId") REFERENCES "LeadDetails"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmailMessage" ADD CONSTRAINT "EmailMessage_salesLeadId_fkey" FOREIGN KEY ("salesLeadId") REFERENCES "SalesLead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attachment" ADD CONSTRAINT "Attachment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tag" ADD CONSTRAINT "Tag_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConversationTag" ADD CONSTRAINT "ConversationTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTag" ADD CONSTRAINT "MessageTag_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "EmailMessage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MessageTag" ADD CONSTRAINT "MessageTag_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES "Tag"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_accountId_fkey" FOREIGN KEY ("accountId") REFERENCES "EmailAccount"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScheduledMessage" ADD CONSTRAINT "ScheduledMessage_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
