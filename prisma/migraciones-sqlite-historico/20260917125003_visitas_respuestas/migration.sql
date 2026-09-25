-- CreateTable
CREATE TABLE "Visita" (
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
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Visita_esquemaId_fkey" FOREIGN KEY ("esquemaId") REFERENCES "Esquema" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Respuesta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "visitaId" TEXT NOT NULL,
    "preguntaId" TEXT NOT NULL,
    "valor" TEXT,
    "archivoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Respuesta_visitaId_fkey" FOREIGN KEY ("visitaId") REFERENCES "Visita" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Respuesta_preguntaId_fkey" FOREIGN KEY ("preguntaId") REFERENCES "Pregunta" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Respuesta_visitaId_preguntaId_key" ON "Respuesta"("visitaId", "preguntaId");
