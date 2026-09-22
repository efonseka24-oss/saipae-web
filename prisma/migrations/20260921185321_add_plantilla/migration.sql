-- CreateTable
CREATE TABLE "Plantilla" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "esquemaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "versionFormato" TEXT NOT NULL DEFAULT '',
    "descripcionVisitaJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Plantilla_esquemaId_fkey" FOREIGN KEY ("esquemaId") REFERENCES "Esquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Plantilla_esquemaId_key" ON "Plantilla"("esquemaId");
