ALTER TABLE "Agent" ADD COLUMN "connector" TEXT, ADD COLUMN "provider" TEXT;
CREATE UNIQUE INDEX "Agent_userId_connector_key" ON "Agent"("userId","connector");
ALTER TABLE "Task" ADD COLUMN "agentId" TEXT;
CREATE TABLE "WhatsAppSession" ("userId" TEXT PRIMARY KEY REFERENCES "User"("id") ON DELETE CASCADE,"state" TEXT NOT NULL DEFAULT 'disconnected',"mode" TEXT NOT NULL DEFAULT 'qr',"command" TEXT,"phoneEncrypted" TEXT,"credsEncrypted" TEXT,"qrEncrypted" TEXT,"pairingEncrypted" TEXT,"consent" JSONB NOT NULL DEFAULT '{}',"expiresAt" TIMESTAMP(3),"lastConnected" TIMESTAMP(3),"heartbeat" TIMESTAMP(3),"owner" TEXT,"leaseUntil" TIMESTAMP(3),"error" TEXT,"updatedAt" TIMESTAMP(3) NOT NULL);
CREATE TABLE "WhatsAppKey" ("userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"category" TEXT NOT NULL,"keyId" TEXT NOT NULL,"encrypted" TEXT NOT NULL,PRIMARY KEY("userId","category","keyId"));
CREATE TABLE "WhatsAppContact" ("userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"jid" TEXT NOT NULL,"encrypted" TEXT NOT NULL,PRIMARY KEY("userId","jid"));
CREATE TABLE "WhatsAppMessage" ("userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"messageId" TEXT NOT NULL,"jid" TEXT NOT NULL,"fromMe" BOOLEAN NOT NULL DEFAULT false,"encrypted" TEXT NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,PRIMARY KEY("userId","messageId"));
CREATE INDEX "WhatsAppMessage_userId_createdAt_idx" ON "WhatsAppMessage"("userId","createdAt");
CREATE TABLE "WhatsAppSend" ("operationId" TEXT PRIMARY KEY,"userId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,"state" TEXT NOT NULL DEFAULT 'pending',"payloadEncrypted" TEXT NOT NULL,"resultEncrypted" TEXT,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP);
