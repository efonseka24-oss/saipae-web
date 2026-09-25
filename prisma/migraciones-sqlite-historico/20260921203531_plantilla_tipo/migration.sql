-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plantilla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'VISITA',
    "versionFormato" TEXT NOT NULL DEFAULT '',
    "descripcionVisitaJson" TEXT NOT NULL DEFAULT '[]',
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Plantilla" ("configJson", "createdAt", "descripcionVisitaJson", "id", "nombre", "updatedAt", "versionFormato") SELECT "configJson", "createdAt", "descripcionVisitaJson", "id", "nombre", "updatedAt", "versionFormato" FROM "Plantilla";
DROP TABLE "Plantilla";
ALTER TABLE "new_Plantilla" RENAME TO "Plantilla";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
