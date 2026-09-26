-- CreateTable
CREATE TABLE `CronogramaVisita` (
    `id` VARCHAR(191) NOT NULL,
    `esquemaId` VARCHAR(191) NULL,
    `zodeId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `institucionId` VARCHAR(191) NULL,
    `sedeId` VARCHAR(191) NULL,
    `operadorId` VARCHAR(191) NULL,
    `bodegaId` VARCHAR(191) NULL,
    `fechaProgramada` DATE NOT NULL,
    `fechaRealizacion` DATE NULL,
    `observaciones` TEXT NULL,
    `interventorId` VARCHAR(191) NULL,
    `supervisorId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CronogramaVisita_fechaProgramada_idx`(`fechaProgramada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_esquemaId_fkey` FOREIGN KEY (`esquemaId`) REFERENCES `Esquema`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_zodeId_fkey` FOREIGN KEY (`zodeId`) REFERENCES `Zode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_institucionId_fkey` FOREIGN KEY (`institucionId`) REFERENCES `Institucion`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `Sede`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_operadorId_fkey` FOREIGN KEY (`operadorId`) REFERENCES `Operador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_bodegaId_fkey` FOREIGN KEY (`bodegaId`) REFERENCES `Bodega`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_interventorId_fkey` FOREIGN KEY (`interventorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CronogramaVisita` ADD CONSTRAINT `CronogramaVisita_supervisorId_fkey` FOREIGN KEY (`supervisorId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- Los usuarios que ya tienen el módulo Administrador ven también el nuevo
-- módulo Cronograma de Visitas (los demás se asignan desde Administrador).
UPDATE `Usuario`
SET `modulosPermitidos` = JSON_ARRAY_APPEND(`modulosPermitidos`, '$', 'cronograma')
WHERE JSON_VALID(`modulosPermitidos`)
  AND JSON_CONTAINS(`modulosPermitidos`, '"administrador"')
  AND NOT JSON_CONTAINS(`modulosPermitidos`, '"cronograma"');
