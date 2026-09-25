/*
  Warnings:

  - Added the required column `nombre` to the `Sede` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sede" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroDane" TEXT NOT NULL,
    "nombre" TEXT NOT NULL DEFAULT '(sin nombre, actualizar)',
    "institucionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sede_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sede" ("createdAt", "id", "institucionId", "numeroDane", "updatedAt") SELECT "createdAt", "id", "institucionId", "numeroDane", "updatedAt" FROM "Sede";
DROP TABLE "Sede";
ALTER TABLE "new_Sede" RENAME TO "Sede";
CREATE UNIQUE INDEX "Sede_numeroDane_key" ON "Sede"("numeroDane");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
