-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "publicAddress" TEXT NOT NULL,
    "nonce" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_publicAddress_key" ON "users"("publicAddress");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
