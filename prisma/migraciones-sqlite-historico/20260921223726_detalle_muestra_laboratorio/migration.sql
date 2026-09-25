-- CreateTable
CREATE TABLE "DetalleMuestraLaboratorio" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "laboratorioId" TEXT NOT NULL,
    "orden" INTEGER NOT NULL,
    "producto" TEXT,
    "examen" TEXT,
    "cumplimiento" TEXT,
    CONSTRAINT "DetalleMuestraLaboratorio_laboratorioId_fkey" FOREIGN KEY ("laboratorioId") REFERENCES "Laboratorio" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DetalleMuestraLaboratorio_laboratorioId_orden_key" ON "DetalleMuestraLaboratorio"("laboratorioId", "orden");
