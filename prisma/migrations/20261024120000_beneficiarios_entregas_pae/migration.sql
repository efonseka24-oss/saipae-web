-- AlterTable
ALTER TABLE `EstudianteSimat` ADD COLUMN `beneficiarioPae` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `EstudianteSimat_beneficiarioPae_idx` ON `EstudianteSimat`(`beneficiarioPae`);

-- CreateTable
CREATE TABLE `EntregaPae` (
    `id` VARCHAR(191) NOT NULL,
    `estudianteId` VARCHAR(191) NOT NULL,
    `fecha` DATE NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `EntregaPae_fecha_idx`(`fecha`),
    UNIQUE INDEX `EntregaPae_estudianteId_fecha_key`(`estudianteId`, `fecha`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EntregaPae` ADD CONSTRAINT `EntregaPae_estudianteId_fkey` FOREIGN KEY (`estudianteId`) REFERENCES `EstudianteSimat`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
