-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "correo" TEXT;
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
    "ordenPanel" INTEGER NOT NULL DEFAULT 0,
    "generarSubPreguntasAuto" TEXT NOT NULL DEFAULT 'NINGUNA',
    "fuenteOpciones" TEXT NOT NULL DEFAULT 'NINGUNA',
    "saltarSiRespuesta" TEXT,
    "saltarHastaPreguntaId" TEXT,
    "saltarRellenarCon" TEXT,
    "idApp" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pregunta_moduloId_fkey" FOREIGN KEY ("moduloId") REFERENCES "ModuloEsquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pregunta_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "Pregunta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION,
    CONSTRAINT "Pregunta_saltarHastaPreguntaId_fkey" FOREIGN KEY ("saltarHastaPreguntaId") REFERENCES "Pregunta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);
INSERT INTO "new_Pregunta" ("clase", "createdAt", "generarSubPreguntasAuto", "id", "idApp", "moduloId", "naturalezaOpciones", "obligatoria", "opciones", "orden", "padreId", "saltarHastaPreguntaId", "saltarRellenarCon", "saltarSiRespuesta", "texto", "tipo", "updatedAt", "validacion") SELECT "clase", "createdAt", "generarSubPreguntasAuto", "id", "idApp", "moduloId", "naturalezaOpciones", "obligatoria", "opciones", "orden", "padreId", "saltarHastaPreguntaId", "saltarRellenarCon", "saltarSiRespuesta", "texto", "tipo", "updatedAt", "validacion" FROM "Pregunta";
DROP TABLE "Pregunta";
ALTER TABLE "new_Pregunta" RENAME TO "Pregunta";
CREATE UNIQUE INDEX "Pregunta_idApp_key" ON "Pregunta"("idApp");
CREATE TABLE "new_Visita" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "esquemaId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL,
    "operador" TEXT,
    "municipio" TEXT,
    "institucion" TEXT,
    "sede" TEXT,
    "zodes" TEXT,
    "lote" TEXT,
    "nit" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'EN_PROGRESO',
    "informeGeneradoEn" DATETIME,
    "idEnvioApp" TEXT,
    "usuarioId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visita_esquemaId_fkey" FOREIGN KEY ("esquemaId") REFERENCES "Esquema" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Visita_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Visita" ("createdAt", "esquemaId", "estado", "fecha", "id", "idEnvioApp", "informeGeneradoEn", "institucion", "lote", "municipio", "nit", "operador", "sede", "updatedAt", "zodes") SELECT "createdAt", "esquemaId", "estado", "fecha", "id", "idEnvioApp", "informeGeneradoEn", "institucion", "lote", "municipio", "nit", "operador", "sede", "updatedAt", "zodes" FROM "Visita";
DROP TABLE "Visita";
ALTER TABLE "new_Visita" RENAME TO "Visita";
CREATE UNIQUE INDEX "Visita_idEnvioApp_key" ON "Visita"("idEnvioApp");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
-- CreateIndex
CREATE UNIQUE INDEX "Usuario_correo_key" ON "Usuario"("correo");

-- El orden del panel parte igual al orden actual de la encuesta.
UPDATE "Pregunta" SET "ordenPanel" = "orden";

-- Preguntas ya existentes que ahora toman sus opciones del módulo Registro o
-- de los usuarios del panel. Pasan a selección y no cuentan en estadísticas.
UPDATE "Pregunta" SET "fuenteOpciones" = 'MUNICIPIO', "tipo" = 'SELECCION_MULTIPLE', "validacion" = 'NINGUNA', "naturalezaOpciones" = 'NO_APLICA', "opciones" = '[]'
  WHERE "padreId" IS NULL AND "texto" = 'MUNICIPIO:';
UPDATE "Pregunta" SET "fuenteOpciones" = 'INSTITUCION', "tipo" = 'SELECCION_MULTIPLE', "validacion" = 'NINGUNA', "naturalezaOpciones" = 'NO_APLICA', "opciones" = '[]'
  WHERE "padreId" IS NULL AND "texto" LIKE 'NOMBRE DE LA INSTITUCI%N EDUCATIVA%';
UPDATE "Pregunta" SET "fuenteOpciones" = 'SEDE', "tipo" = 'SELECCION_MULTIPLE', "validacion" = 'NINGUNA', "naturalezaOpciones" = 'NO_APLICA', "opciones" = '[]'
  WHERE "padreId" IS NULL AND "texto" LIKE 'NOMBRE DE LA SEDE EDUCA%';
UPDATE "Pregunta" SET "fuenteOpciones" = 'USUARIO', "tipo" = 'SELECCION_MULTIPLE', "validacion" = 'NINGUNA', "naturalezaOpciones" = 'NO_APLICA', "opciones" = '[]'
  WHERE "padreId" IS NULL AND "texto" = 'ESCRIBA EL CORREO ELECTRONICO DEL INTERVENTOR:';
