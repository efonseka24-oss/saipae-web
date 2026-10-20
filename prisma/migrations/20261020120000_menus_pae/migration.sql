-- CreateTable
CREATE TABLE `MenuPae` (
    `id` VARCHAR(191) NOT NULL,
    `numero` INTEGER NOT NULL,
    `loteId` VARCHAR(191) NOT NULL,
    `especialEtnico` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `MenuPae_loteId_numero_especialEtnico_key`(`loteId`, `numero`, `especialEtnico`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleMenuPae` (
    `id` VARCHAR(191) NOT NULL,
    `menuId` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `tipoAlimento` VARCHAR(191) NOT NULL,
    `nombreAlimento` VARCHAR(191) NOT NULL,
    `unidad` VARCHAR(191) NOT NULL,
    `cantidad` DOUBLE NOT NULL,

    UNIQUE INDEX `DetalleMenuPae_menuId_orden_key`(`menuId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `MenuPae` ADD CONSTRAINT `MenuPae_loteId_fkey` FOREIGN KEY (`loteId`) REFERENCES `Lote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleMenuPae` ADD CONSTRAINT `DetalleMenuPae_menuId_fkey` FOREIGN KEY (`menuId`) REFERENCES `MenuPae`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

