/*
  Warnings:

  - You are about to drop the column `esquemaId` on the `Pregunta` table. All the data in the column will be lost.
  - Added the required column `moduloId` to the `Pregunta` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ModuloEsquema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "esquemaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ModuloEsquema_esquemaId_fkey" FOREIGN KEY ("esquemaId") REFERENCES "Esquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Pregunta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "moduloId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "padreId" TEXT,
    "tipo" TEXT NOT NULL,
    "opciones" TEXT NOT NULL,
    "naturalezaOpciones" TEXT NOT NULL DEFAULT 'CUALITATIVA',
    "validacion" TEXT NOT NULL DEFAULT 'NINGUNA',
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "condicion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pregunta_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloEsquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pregunta_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "Pregunta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Pregunta" ("clase", "condicion", "createdAt", "id", "obligatoria", "opciones", "orden", "padreId", "texto", "tipo", "updatedAt", "validacion") SELECT "clase", "condicion", "createdAt", "id", "obligatoria", "opciones", "orden", "padreId", "texto", "tipo", "updatedAt", "validacion" FROM "Pregunta";
DROP TABLE "Pregunta";
ALTER TABLE "new_Pregunta" RENAME TO "Pregunta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ModuloEsquema_esquemaId_nombre_key" ON "ModuloEsquema"("esquemaId", "nombre");
