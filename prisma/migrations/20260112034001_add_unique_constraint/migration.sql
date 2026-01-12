-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_InventorySetting" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "shop" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "minStock" INTEGER NOT NULL DEFAULT 5,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_InventorySetting" ("id", "minStock", "productId", "shop", "updatedAt", "variantId") SELECT "id", "minStock", "productId", "shop", "updatedAt", "variantId" FROM "InventorySetting";
DROP TABLE "InventorySetting";
ALTER TABLE "new_InventorySetting" RENAME TO "InventorySetting";
CREATE UNIQUE INDEX "InventorySetting_shop_variantId_key" ON "InventorySetting"("shop", "variantId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
