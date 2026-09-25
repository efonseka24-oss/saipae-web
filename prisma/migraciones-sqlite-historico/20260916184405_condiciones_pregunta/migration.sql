/*
  Warnings:

  - You are about to drop the column `condicion` on the `Pregunta` table. All the data in the column will be lost.

*/
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
    "generarSubPreguntasAuto" TEXT NOT NULL DEFAULT 'NINGUNA',
    "saltarSiRespuesta" TEXT,
    "saltarHastaPreguntaId" TEXT,
    "saltarRellenarCon" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pregunta_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloEsquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pregunta_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "Pregunta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "Pregunta_saltarHastaPreguntaId_fkey" FOREIGN KEY ("saltarHastaPreguntaId") REFERENCES "Pregunta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Pregunta" ("clase", "createdAt", "id", "moduloId", "naturalezaOpciones", "obligatoria", "opciones", "orden", "padreId", "texto", "tipo", "updatedAt", "validacion") SELECT "clase", "createdAt", "id", "moduloId", "naturalezaOpciones", "obligatoria", "opciones", "orden", "padreId", "texto", "tipo", "updatedAt", "validacion" FROM "Pregunta";
DROP TABLE "Pregunta";
ALTER TABLE "new_Pregunta" RENAME TO "Pregunta";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
