-- CreateTable
CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "usuarioId" TEXT,
    "usuario" TEXT NOT NULL,
    "nombre" TEXT,
    "tipo" TEXT NOT NULL,
    "modulo" TEXT,
    "accion" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "metodo" TEXT,
    "ruta" TEXT,
    "estado" INTEGER,
    "exito" BOOLEAN NOT NULL DEFAULT true,
    "ip" TEXT,
    "agente" TEXT
);

-- CreateIndex
CREATE INDEX "Auditoria_fecha_idx" ON "Auditoria"("fecha");

-- CreateIndex
CREATE INDEX "Auditoria_usuarioId_idx" ON "Auditoria"("usuarioId");

-- CreateIndex
CREATE INDEX "Auditoria_tipo_idx" ON "Auditoria"("tipo");
