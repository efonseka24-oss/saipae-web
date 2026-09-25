-- AlterTable
ALTER TABLE "DatosEmpresa" ADD COLUMN "representanteLegalCargo" TEXT;
ALTER TABLE "DatosEmpresa" ADD COLUMN "representanteLegalNombre" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "cargo" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "firmaUrl" TEXT;

-- CreateTable
CREATE TABLE "PeticionPqrs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "radicadoEntrada" TEXT NOT NULL,
    "fechaRadicado" DATETIME NOT NULL,
    "peticionario" TEXT NOT NULL,
    "tipoPeticion" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "responsableId" TEXT NOT NULL,
    "archivoUrl" TEXT NOT NULL,
    "archivoNombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PeticionPqrs_responsableId_fkey" FOREIGN KEY ("responsableId") REFERENCES "Usuario" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "RespuestaPqrs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "peticionId" TEXT NOT NULL,
    "radicadoSalida" TEXT NOT NULL,
    "fechaRadicado" DATETIME NOT NULL,
    "texto" TEXT NOT NULL,
    "documentoUrl" TEXT,
    "documentoPdfUrl" TEXT,
    "generadoEn" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "RespuestaPqrs_peticionId_fkey" FOREIGN KEY ("peticionId") REFERENCES "PeticionPqrs" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "PeticionPqrs_radicadoEntrada_key" ON "PeticionPqrs"("radicadoEntrada");

-- CreateIndex
CREATE UNIQUE INDEX "RespuestaPqrs_peticionId_key" ON "RespuestaPqrs"("peticionId");

-- CreateIndex
CREATE UNIQUE INDEX "RespuestaPqrs_radicadoSalida_key" ON "RespuestaPqrs"("radicadoSalida");
