-- CreateTable
CREATE TABLE "ActaCaes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tipo" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "archivoNombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ActaCaes_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Sede" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroDane" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sede_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Sede" ("createdAt", "id", "institucionId", "nombre", "numeroDane", "updatedAt") SELECT "createdAt", "id", "institucionId", "nombre", "numeroDane", "updatedAt" FROM "Sede";
DROP TABLE "Sede";
ALTER TABLE "new_Sede" RENAME TO "Sede";
CREATE UNIQUE INDEX "Sede_numeroDane_key" ON "Sede"("numeroDane");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
