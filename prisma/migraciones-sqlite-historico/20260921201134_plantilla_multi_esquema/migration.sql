-- CreateTable (relación muchos-a-muchos Esquema <-> Plantilla)
CREATE TABLE "_EsquemaToPlantilla" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_EsquemaToPlantilla_A_fkey" FOREIGN KEY ("A") REFERENCES "Esquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_EsquemaToPlantilla_B_fkey" FOREIGN KEY ("B") REFERENCES "Plantilla" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Migra la relación 1:1 anterior (Plantilla.esquemaId) hacia la nueva tabla puente
INSERT INTO "_EsquemaToPlantilla" ("A", "B") SELECT "esquemaId", "id" FROM "Plantilla" WHERE "esquemaId" IS NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "_EsquemaToPlantilla_AB_unique" ON "_EsquemaToPlantilla"("A", "B");

-- CreateIndex
CREATE INDEX "_EsquemaToPlantilla_B_index" ON "_EsquemaToPlantilla"("B");

-- RedefineTables (quita la columna esquemaId de Plantilla)
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Plantilla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "versionFormato" TEXT NOT NULL DEFAULT '',
    "descripcionVisitaJson" TEXT NOT NULL DEFAULT '[]',
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Plantilla" ("createdAt", "descripcionVisitaJson", "id", "nombre", "updatedAt", "versionFormato", "configJson") SELECT "createdAt", "descripcionVisitaJson", "id", "nombre", "updatedAt", "versionFormato", "configJson" FROM "Plantilla";
DROP TABLE "Plantilla";
ALTER TABLE "new_Plantilla" RENAME TO "Plantilla";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
