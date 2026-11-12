ALTER TABLE "users" ALTER COLUMN "password" DROP NOT NULL;

CREATE TABLE "oauth_accounts" (
    "id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "oauth_accounts_provider_subject_key" ON "oauth_accounts"("provider", "subject");
CREATE UNIQUE INDEX "oauth_accounts_userId_provider_key" ON "oauth_accounts"("userId", "provider");
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "oauth_attempts" (
    "stateHash" TEXT NOT NULL,
    "browserHash" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "codeVerifier" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "redirect" TEXT NOT NULL,
    "linkUserId" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "oauth_attempts_pkey" PRIMARY KEY ("stateHash")
);
CREATE INDEX "oauth_attempts_expiresAt_idx" ON "oauth_attempts"("expiresAt");
