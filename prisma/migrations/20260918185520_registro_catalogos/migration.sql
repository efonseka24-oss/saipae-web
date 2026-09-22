-- CreateTable
CREATE TABLE "Departamento" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Zode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "departamentoId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Zode_departamentoId_fkey" FOREIGN KEY ("departamentoId") REFERENCES "Departamento" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Municipio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "zodeId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Municipio_zodeId_fkey" FOREIGN KEY ("zodeId") REFERENCES "Zode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Lote" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Institucion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroDane" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "municipioId" TEXT NOT NULL,
    "loteId" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Institucion_municipioId_fkey" FOREIGN KEY ("municipioId") REFERENCES "Municipio" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Institucion_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Sede" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "numeroDane" TEXT NOT NULL,
    "institucionId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Sede_institucionId_fkey" FOREIGN KEY ("institucionId") REFERENCES "Institucion" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Operador" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nit" TEXT NOT NULL,
    "nombreRazonSocial" TEXT NOT NULL,
    "zodeId" TEXT NOT NULL,
    "loteId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Operador_zodeId_fkey" FOREIGN KEY ("zodeId") REFERENCES "Zode" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Operador_loteId_fkey" FOREIGN KEY ("loteId") REFERENCES "Lote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Bodega" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "operadorId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Bodega_operadorId_fkey" FOREIGN KEY ("operadorId") REFERENCES "Operador" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Departamento_nombre_key" ON "Departamento"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Zode_departamentoId_nombre_key" ON "Zode"("departamentoId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Municipio_zodeId_nombre_key" ON "Municipio"("zodeId", "nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Lote_nombre_key" ON "Lote"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "Institucion_numeroDane_key" ON "Institucion"("numeroDane");

-- CreateIndex
CREATE UNIQUE INDEX "Sede_numeroDane_key" ON "Sede"("numeroDane");

-- CreateIndex
CREATE UNIQUE INDEX "Operador_nit_key" ON "Operador"("nit");

-- CreateIndex
CREATE UNIQUE INDEX "Bodega_operadorId_nombre_key" ON "Bodega"("operadorId", "nombre");
