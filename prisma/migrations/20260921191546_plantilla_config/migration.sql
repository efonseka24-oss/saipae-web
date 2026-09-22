-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plantilla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "esquemaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "versionFormato" TEXT NOT NULL DEFAULT '',
    "descripcionVisitaJson" TEXT NOT NULL DEFAULT '[]',
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plantilla_esquemaId_fkey" FOREIGN KEY ("esquemaId") REFERENCES "Esquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Plantilla" ("createdAt", "descripcionVisitaJson", "esquemaId", "id", "nombre", "updatedAt", "versionFormato") SELECT "createdAt", "descripcionVisitaJson", "esquemaId", "id", "nombre", "updatedAt", "versionFormato" FROM "Plantilla";
DROP TABLE "Plantilla";
ALTER TABLE "new_Plantilla" RENAME TO "Plantilla";
CREATE UNIQUE INDEX "Plantilla_esquemaId_key" ON "Plantilla"("esquemaId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
