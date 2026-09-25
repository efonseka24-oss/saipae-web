-- Mueve Lote para que quede entre Departamento y Zode: un Lote pertenece a un
-- Departamento y agrupa varios Zodes. Operador ya no elige Lote aparte: lo
-- hereda de su Zode. Institucion ya no elige Lote aparte: lo hereda de su
-- Municipio -> Zode -> Lote.

PRAGMA foreign_keys=OFF;

-- 1) Agregar columnas nuevas (nullable por ahora, se completan abajo).
ALTER TABLE "Lote" ADD COLUMN "departamentoId" TEXT;
ALTER TABLE "Zode" ADD COLUMN "loteId" TEXT;

-- 2) Backfill de Lote.departamentoId: a partir de cualquier institución que ya
--    apuntara a ese lote (institucion -> municipio -> zode -> departamento).
UPDATE "Lote" SET "departamentoId" = (
  SELECT z."departamentoId"
  FROM "Institucion" i
  JOIN "Municipio" m ON m."id" = i."municipioId"
  JOIN "Zode" z ON z."id" = m."zodeId"
  WHERE i."loteId" = "Lote"."id"
  LIMIT 1
) WHERE "departamentoId" IS NULL;

-- Si algún lote quedó sin institución asociada, se asigna a cualquier
-- departamento existente (dato de desarrollo; se puede corregir luego desde
-- el módulo Registro).
UPDATE "Lote" SET "departamentoId" = (SELECT "id" FROM "Departamento" LIMIT 1)
WHERE "departamentoId" IS NULL;

-- 3) Backfill de Zode.loteId: primero intenta un lote del mismo departamento
--    con el mismo nombre, luego cualquier lote de ese departamento.
UPDATE "Zode" SET "loteId" = (
  SELECT l."id" FROM "Lote" l
  WHERE l."departamentoId" = "Zode"."departamentoId" AND l."nombre" = "Zode"."nombre"
  LIMIT 1
) WHERE "loteId" IS NULL;

UPDATE "Zode" SET "loteId" = (
  SELECT l."id" FROM "Lote" l WHERE l."departamentoId" = "Zode"."departamentoId" LIMIT 1
) WHERE "loteId" IS NULL;

-- 4) Reconstruir Lote con departamentoId obligatorio + índice único compuesto.
CREATE TABLE "new_Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "departamentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Lote_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Lote" ("id","nombre","departamentoId","createdAt","updatedAt")
  SELECT "id","nombre","departamentoId","createdAt","updatedAt" FROM "Lote";
DROP TABLE "Lote";
ALTER TABLE "new_Lote" RENAME TO "Lote";
CREATE UNIQUE INDEX "Lote_departamentoId_nombre_key" ON "Lote"("departamentoId", "nombre");

-- 5) Reconstruir Zode con loteId obligatorio (reemplaza a departamentoId).
CREATE TABLE "new_Zode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Zode_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Zode" ("id","nombre","loteId","createdAt","updatedAt")
  SELECT "id","nombre","loteId","createdAt","updatedAt" FROM "Zode";
DROP TABLE "Zode";
ALTER TABLE "new_Zode" RENAME TO "Zode";
CREATE UNIQUE INDEX "Zode_loteId_nombre_key" ON "Zode"("loteId", "nombre");

-- 6) Reconstruir Institucion sin loteId (ahora se deriva vía municipio->zode->lote).
CREATE TABLE "new_Institucion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroDane" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Institucion_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Institucion" ("id","numeroDane","nombre","municipioId","createdAt","updatedAt")
  SELECT "id","numeroDane","nombre","municipioId","createdAt","updatedAt" FROM "Institucion";
DROP TABLE "Institucion";
ALTER TABLE "new_Institucion" RENAME TO "Institucion";
CREATE UNIQUE INDEX "Institucion_numeroDane_key" ON "Institucion"("numeroDane");

-- 7) Reconstruir Operador sin loteId (ahora se deriva vía zode->lote).
CREATE TABLE "new_Operador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nit" TEXT NOT NULL,
    "nombreRazonSocial" TEXT NOT NULL,
    "zodeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Operador_zodeId_fkey" FOREIGN KEY ("zodeId") REFERENCES "Zode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Operador" ("id","nit","nombreRazonSocial","zodeId","createdAt","updatedAt")
  SELECT "id","nit","nombreRazonSocial","zodeId","createdAt","updatedAt" FROM "Operador";
DROP TABLE "Operador";
ALTER TABLE "new_Operador" RENAME TO "Operador";
CREATE UNIQUE INDEX "Operador_nit_key" ON "Operador"("nit");

PRAGMA foreign_keys=ON;
