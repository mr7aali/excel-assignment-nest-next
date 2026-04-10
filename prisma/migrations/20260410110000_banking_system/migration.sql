DROP TABLE IF EXISTS "Post";
DROP TABLE IF EXISTS "User";

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionType') THEN
    CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAW', 'TRANSFER');
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TransactionStatus') THEN
    CREATE TYPE "TransactionStatus" AS ENUM ('PENDING', 'SUCCESS', 'FAILED');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS "Account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "holderName" TEXT NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0.00,
    "version" INTEGER NOT NULL DEFAULT 1,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Transaction" (
    "id" TEXT NOT NULL,
    "txId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "status" "TransactionStatus" NOT NULL DEFAULT 'PENDING',
    "amount" DECIMAL(18,2) NOT NULL,
    "fromAccountId" TEXT,
    "toAccountId" TEXT,
    "fromVersionBefore" INTEGER,
    "toVersionBefore" INTEGER,
    "fromVersionAfter" INTEGER,
    "toVersionAfter" INTEGER,
    "fromBalanceBefore" DECIMAL(18,2),
    "fromBalanceAfter" DECIMAL(18,2),
    "toBalanceBefore" DECIMAL(18,2),
    "toBalanceAfter" DECIMAL(18,2),
    "description" TEXT,
    "failureReason" TEXT,
    "idempotencyKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Account_accountId_key" ON "Account"("accountId");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_txId_key" ON "Transaction"("txId");
CREATE UNIQUE INDEX IF NOT EXISTS "Transaction_idempotencyKey_key" ON "Transaction"("idempotencyKey");

CREATE INDEX IF NOT EXISTS "Account_accountId_idx" ON "Account"("accountId");
CREATE INDEX IF NOT EXISTS "Account_holderName_idx" ON "Account"("holderName");
CREATE INDEX IF NOT EXISTS "Account_version_idx" ON "Account"("version");

CREATE INDEX IF NOT EXISTS "Transaction_type_status_createdAt_idx" ON "Transaction"("type", "status", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_fromAccountId_createdAt_idx" ON "Transaction"("fromAccountId", "createdAt");
CREATE INDEX IF NOT EXISTS "Transaction_toAccountId_createdAt_idx" ON "Transaction"("toAccountId", "createdAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Transaction_fromAccountId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_fromAccountId_fkey"
      FOREIGN KEY ("fromAccountId") REFERENCES "Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Transaction_toAccountId_fkey'
  ) THEN
    ALTER TABLE "Transaction"
      ADD CONSTRAINT "Transaction_toAccountId_fkey"
      FOREIGN KEY ("toAccountId") REFERENCES "Account"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END
$$;
