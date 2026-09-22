-- CreateTable
CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Esquema" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "Pregunta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "esquemaId" TEXT NOT NULL,
    "texto" TEXT NOT NULL,
    "clase" TEXT NOT NULL,
    "padreId" TEXT,
    "tipo" TEXT NOT NULL,
    "opciones" TEXT NOT NULL,
    "validacion" TEXT NOT NULL DEFAULT 'NINGUNA',
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "condicion" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Pregunta_esquemaId_fkey" FOREIGN KEY ("esquemaId") REFERENCES "Esquema" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Pregunta_padreId_fkey" FOREIGN KEY ("padreId") REFERENCES "Pregunta" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");

-- CreateIndex
CREATE UNIQUE INDEX "Esquema_nombre_key" ON "Esquema"("nombre");
