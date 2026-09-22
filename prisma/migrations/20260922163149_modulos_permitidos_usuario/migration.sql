-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Usuario" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "usuario" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cedula" TEXT NOT NULL DEFAULT '',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "cargo" TEXT,
    "firmaUrl" TEXT,
    "modulosPermitidos" TEXT NOT NULL DEFAULT '[]'
);
INSERT INTO "new_Usuario" ("activo", "cargo", "cedula", "clave", "firmaUrl", "id", "nombre", "usuario") SELECT "activo", "cargo", "cedula", "clave", "firmaUrl", "id", "nombre", "usuario" FROM "Usuario";
DROP TABLE "Usuario";
ALTER TABLE "new_Usuario" RENAME TO "Usuario";
CREATE UNIQUE INDEX "Usuario_usuario_key" ON "Usuario"("usuario");
CREATE UNIQUE INDEX "Usuario_cedula_key" ON "Usuario"("cedula");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
