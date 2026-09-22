-- CreateTable
CREATE TABLE "DatosEmpresa" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'empresa',
    "nit" TEXT NOT NULL DEFAULT '',
    "razonSocial" TEXT NOT NULL DEFAULT '',
    "nombreComercial" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "telefono" TEXT,
    "correo" TEXT,
    "sitioWeb" TEXT,
    "logoUrl" TEXT,
    "updatedAt" DATETIME NOT NULL
);
