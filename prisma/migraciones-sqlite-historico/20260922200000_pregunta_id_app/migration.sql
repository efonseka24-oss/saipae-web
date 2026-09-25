-- AlterTable
ALTER TABLE "Pregunta" ADD COLUMN "idApp" INTEGER;
-- CreateIndex
CREATE UNIQUE INDEX "Pregunta_idApp_key" ON "Pregunta"("idApp");
