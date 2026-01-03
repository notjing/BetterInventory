-- CreateTable
CREATE TABLE "InventorySetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 1,
    "updatedAt" DATETIME NOT NULL
);
