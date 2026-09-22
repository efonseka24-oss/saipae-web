-- AlterTable
ALTER TABLE "Visita" ADD COLUMN "idEnvioApp" TEXT;
-- CreateIndex
CREATE UNIQUE INDEX "Visita_idEnvioApp_key" ON "Visita"("idEnvioApp");
