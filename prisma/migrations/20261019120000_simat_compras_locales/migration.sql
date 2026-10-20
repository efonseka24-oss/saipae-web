-- CreateTable
CREATE TABLE `EstudianteSimat` (
    `id` VARCHAR(191) NOT NULL,
    `idSimat` VARCHAR(191) NOT NULL,
    `numeroDocumento` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `institucionId` VARCHAR(191) NOT NULL,
    `sedeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `EstudianteSimat_idSimat_key`(`idSimat`),
    INDEX `EstudianteSimat_numeroDocumento_idx`(`numeroDocumento`),
    INDEX `EstudianteSimat_nombre_idx`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CompraLocal` (
    `id` VARCHAR(191) NOT NULL,
    `zodeId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `operadorId` VARCHAR(191) NULL,
    `fechaCompra` DATE NOT NULL,
    `proveedorNombre` VARCHAR(191) NOT NULL,
    `proveedorDocumento` VARCHAR(191) NOT NULL,
    `tipoProveedor` VARCHAR(191) NOT NULL,
    `numeroFactura` VARCHAR(191) NULL,
    `observaciones` TEXT NULL,
    `archivoUrl` VARCHAR(191) NULL,
    `archivoNombre` VARCHAR(500) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `CompraLocal_fechaCompra_idx`(`fechaCompra`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleCompraLocal` (
    `id` VARCHAR(191) NOT NULL,
    `compraId` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `producto` VARCHAR(191) NOT NULL,
    `cantidad` DOUBLE NOT NULL,
    `unidad` VARCHAR(191) NOT NULL,
    `valorUnitario` DOUBLE NOT NULL,

    UNIQUE INDEX `DetalleCompraLocal_compraId_orden_key`(`compraId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `EstudianteSimat` ADD CONSTRAINT `EstudianteSimat_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstudianteSimat` ADD CONSTRAINT `EstudianteSimat_institucionId_fkey` FOREIGN KEY (`institucionId`) REFERENCES `Institucion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `EstudianteSimat` ADD CONSTRAINT `EstudianteSimat_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `Sede`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraLocal` ADD CONSTRAINT `CompraLocal_zodeId_fkey` FOREIGN KEY (`zodeId`) REFERENCES `Zode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraLocal` ADD CONSTRAINT `CompraLocal_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CompraLocal` ADD CONSTRAINT `CompraLocal_operadorId_fkey` FOREIGN KEY (`operadorId`) REFERENCES `Operador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleCompraLocal` ADD CONSTRAINT `DetalleCompraLocal_compraId_fkey` FOREIGN KEY (`compraId`) REFERENCES `CompraLocal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;


-- Los usuarios que ya tienen el módulo Administrador ven también los nuevos
-- módulos SIMAT y Compras Locales (los demás se asignan desde Administrador).
UPDATE `Usuario`
SET `modulosPermitidos` = JSON_ARRAY_APPEND(`modulosPermitidos`, '$', 'simat')
WHERE JSON_VALID(`modulosPermitidos`)
  AND JSON_CONTAINS(`modulosPermitidos`, '"administrador"')
  AND NOT JSON_CONTAINS(`modulosPermitidos`, '"simat"');

UPDATE `Usuario`
SET `modulosPermitidos` = JSON_ARRAY_APPEND(`modulosPermitidos`, '$', 'comprasLocales')
WHERE JSON_VALID(`modulosPermitidos`)
  AND JSON_CONTAINS(`modulosPermitidos`, '"administrador"')
  AND NOT JSON_CONTAINS(`modulosPermitidos`, '"comprasLocales"');
