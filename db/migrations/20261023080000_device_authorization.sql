-- migrate:up
CREATE TABLE IF NOT EXISTS "deviceCode" (
  "id" TEXT PRIMARY KEY NOT NULL,
  "deviceCode" TEXT NOT NULL,
  "userCode" TEXT NOT NULL,
  "userId" TEXT,
  "expiresAt" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "lastPolledAt" TEXT,
  "pollingInterval" INTEGER,
  "clientId" TEXT,
  "scope" TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS "deviceCode_deviceCode_idx" ON "deviceCode" ("deviceCode");
CREATE UNIQUE INDEX IF NOT EXISTS "deviceCode_userCode_idx" ON "deviceCode" ("userCode");

-- migrate:down
DROP TABLE "deviceCode";
