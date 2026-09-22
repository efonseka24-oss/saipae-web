-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Institucion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroDane" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "habilitadaPae" BOOLEAN NOT NULL DEFAULT true,
    "tiposRacion" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Institucion_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Institucion" ("createdAt", "id", "municipioId", "nombre", "numeroDane", "updatedAt") SELECT "createdAt", "id", "municipioId", "nombre", "numeroDane", "updatedAt" FROM "Institucion";
DROP TABLE "Institucion";
ALTER TABLE "new_Institucion" RENAME TO "Institucion";
CREATE UNIQUE INDEX "Institucion_numeroDane_key" ON "Institucion"("numeroDane");
CREATE TABLE "new_Sede" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroDane" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "habilitadaPae" BOOLEAN NOT NULL DEFAULT true,
    "tiposRacion" TEXT NOT NULL DEFAULT '[]',
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
