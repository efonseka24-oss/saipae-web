-- CreateTable
CREATE TABLE `Usuario` (
    `id` VARCHAR(191) NOT NULL,
    `usuario` VARCHAR(191) NOT NULL,
    `clave` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `cedula` VARCHAR(191) NOT NULL DEFAULT '',
    `activo` BOOLEAN NOT NULL DEFAULT true,
    `cargo` VARCHAR(191) NULL,
    `firmaUrl` VARCHAR(191) NULL,
    `correo` VARCHAR(191) NULL,
    `modulosPermitidos` VARCHAR(2000) NOT NULL DEFAULT '[]',

    UNIQUE INDEX `Usuario_usuario_key`(`usuario`),
    UNIQUE INDEX `Usuario_cedula_key`(`cedula`),
    UNIQUE INDEX `Usuario_correo_key`(`correo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DatosEmpresa` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'empresa',
    `nit` VARCHAR(191) NOT NULL DEFAULT '',
    `razonSocial` VARCHAR(191) NOT NULL DEFAULT '',
    `nombreComercial` VARCHAR(191) NULL,
    `direccion` VARCHAR(500) NULL,
    `ciudad` VARCHAR(191) NULL,
    `telefono` VARCHAR(191) NULL,
    `correo` VARCHAR(191) NULL,
    `sitioWeb` VARCHAR(191) NULL,
    `logoUrl` VARCHAR(191) NULL,
    `membreteUrl` VARCHAR(191) NULL,
    `representanteLegalNombre` VARCHAR(191) NULL,
    `representanteLegalCargo` VARCHAR(191) NULL,
    `fechaInicioInterventoria` DATETIME(3) NULL,
    `fechaFinInterventoria` DATETIME(3) NULL,
    `fechaInicioPae` DATETIME(3) NULL,
    `fechaFinPae` DATETIME(3) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Esquema` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Esquema_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Plantilla` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL DEFAULT 'VISITA',
    `versionFormato` VARCHAR(191) NOT NULL DEFAULT '',
    `descripcionVisitaJson` VARCHAR(8000) NOT NULL DEFAULT '[]',
    `configJson` MEDIUMTEXT NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ModuloEsquema` (
    `id` VARCHAR(191) NOT NULL,
    `esquemaId` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NULL,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `ModuloEsquema_esquemaId_nombre_key`(`esquemaId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Pregunta` (
    `id` VARCHAR(191) NOT NULL,
    `moduloId` VARCHAR(191) NOT NULL,
    `texto` TEXT NOT NULL,
    `clase` VARCHAR(191) NOT NULL,
    `padreId` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `opciones` TEXT NOT NULL,
    `naturalezaOpciones` VARCHAR(191) NOT NULL DEFAULT 'CUALITATIVA',
    `validacion` VARCHAR(191) NOT NULL DEFAULT 'NINGUNA',
    `obligatoria` BOOLEAN NOT NULL DEFAULT true,
    `orden` INTEGER NOT NULL DEFAULT 0,
    `ordenPanel` INTEGER NOT NULL DEFAULT 0,
    `generarSubPreguntasAuto` VARCHAR(191) NOT NULL DEFAULT 'NINGUNA',
    `fuenteOpciones` VARCHAR(191) NOT NULL DEFAULT 'NINGUNA',
    `saltarSiRespuesta` TEXT NULL,
    `saltarHastaPreguntaId` VARCHAR(191) NULL,
    `saltarRellenarCon` TEXT NULL,
    `idApp` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Pregunta_idApp_key`(`idApp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Departamento` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Departamento_nombre_key`(`nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Lote` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `departamentoId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Lote_departamentoId_nombre_key`(`departamentoId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Zode` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `loteId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Zode_loteId_nombre_key`(`loteId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Municipio` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `zodeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Municipio_zodeId_nombre_key`(`zodeId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Institucion` (
    `id` VARCHAR(191) NOT NULL,
    `numeroDane` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `habilitadaPae` BOOLEAN NOT NULL DEFAULT true,
    `tiposRacion` VARCHAR(2000) NOT NULL DEFAULT '[]',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Institucion_numeroDane_key`(`numeroDane`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Sede` (
    `id` VARCHAR(191) NOT NULL,
    `numeroDane` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `institucionId` VARCHAR(191) NOT NULL,
    `habilitadaPae` BOOLEAN NOT NULL DEFAULT true,
    `tiposRacion` VARCHAR(2000) NOT NULL DEFAULT '[]',
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Sede_numeroDane_key`(`numeroDane`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Operador` (
    `id` VARCHAR(191) NOT NULL,
    `nit` VARCHAR(191) NOT NULL,
    `nombreRazonSocial` VARCHAR(191) NOT NULL,
    `zodeId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Operador_nit_key`(`nit`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Bodega` (
    `id` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NOT NULL,
    `operadorId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Bodega_operadorId_nombre_key`(`operadorId`, `nombre`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ActaCaes` (
    `id` VARCHAR(191) NOT NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `institucionId` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `archivoUrl` VARCHAR(191) NOT NULL,
    `archivoNombre` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Laboratorio` (
    `id` VARCHAR(191) NOT NULL,
    `zodeId` VARCHAR(191) NOT NULL,
    `municipioId` VARCHAR(191) NOT NULL,
    `institucionId` VARCHAR(191) NOT NULL,
    `sedeId` VARCHAR(191) NOT NULL,
    `operadorId` VARCHAR(191) NULL,
    `esquemaId` VARCHAR(191) NOT NULL,
    `fechaTomaMuestra` DATETIME(3) NOT NULL,
    `nombreLaboratorio` VARCHAR(191) NOT NULL,
    `resultado` VARCHAR(191) NOT NULL,
    `fechaResultado` DATETIME(3) NOT NULL,
    `observaciones` TEXT NULL,
    `archivoUrl` VARCHAR(191) NOT NULL,
    `archivoNombre` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `DetalleMuestraLaboratorio` (
    `id` VARCHAR(191) NOT NULL,
    `laboratorioId` VARCHAR(191) NOT NULL,
    `orden` INTEGER NOT NULL,
    `producto` VARCHAR(191) NULL,
    `examen` VARCHAR(191) NULL,
    `cumplimiento` VARCHAR(191) NULL,

    UNIQUE INDEX `DetalleMuestraLaboratorio_laboratorioId_orden_key`(`laboratorioId`, `orden`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Visita` (
    `id` VARCHAR(191) NOT NULL,
    `esquemaId` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL,
    `operador` VARCHAR(191) NULL,
    `municipio` VARCHAR(191) NULL,
    `institucion` VARCHAR(191) NULL,
    `sede` VARCHAR(191) NULL,
    `zodes` VARCHAR(191) NULL,
    `lote` VARCHAR(191) NULL,
    `nit` VARCHAR(191) NULL,
    `estado` VARCHAR(191) NOT NULL DEFAULT 'EN_PROGRESO',
    `informeGeneradoEn` DATETIME(3) NULL,
    `idEnvioApp` VARCHAR(191) NULL,
    `usuarioId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Visita_idEnvioApp_key`(`idEnvioApp`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Respuesta` (
    `id` VARCHAR(191) NOT NULL,
    `visitaId` VARCHAR(191) NOT NULL,
    `preguntaId` VARCHAR(191) NOT NULL,
    `valor` TEXT NULL,
    `archivoUrl` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `Respuesta_visitaId_preguntaId_key`(`visitaId`, `preguntaId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PeticionPqrs` (
    `id` VARCHAR(191) NOT NULL,
    `radicadoEntrada` VARCHAR(191) NOT NULL,
    `fechaRadicado` DATETIME(3) NOT NULL,
    `peticionario` VARCHAR(191) NOT NULL,
    `tipoPeticion` VARCHAR(191) NOT NULL,
    `asunto` TEXT NOT NULL,
    `responsableId` VARCHAR(191) NOT NULL,
    `archivoUrl` VARCHAR(191) NOT NULL,
    `archivoNombre` VARCHAR(500) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PeticionPqrs_radicadoEntrada_key`(`radicadoEntrada`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `RespuestaPqrs` (
    `id` VARCHAR(191) NOT NULL,
    `peticionId` VARCHAR(191) NOT NULL,
    `radicadoSalida` VARCHAR(191) NOT NULL,
    `fechaRadicado` DATETIME(3) NOT NULL,
    `texto` MEDIUMTEXT NOT NULL,
    `documentoUrl` VARCHAR(191) NULL,
    `documentoPdfUrl` VARCHAR(191) NULL,
    `generadoEn` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `RespuestaPqrs_peticionId_key`(`peticionId`),
    UNIQUE INDEX `RespuestaPqrs_radicadoSalida_key`(`radicadoSalida`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `Auditoria` (
    `id` VARCHAR(191) NOT NULL,
    `fecha` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `usuarioId` VARCHAR(191) NULL,
    `usuario` VARCHAR(191) NOT NULL,
    `nombre` VARCHAR(191) NULL,
    `tipo` VARCHAR(191) NOT NULL,
    `modulo` VARCHAR(191) NULL,
    `accion` VARCHAR(191) NOT NULL,
    `descripcion` TEXT NOT NULL,
    `metodo` VARCHAR(191) NULL,
    `ruta` VARCHAR(500) NULL,
    `estado` INTEGER NULL,
    `exito` BOOLEAN NOT NULL DEFAULT true,
    `ip` VARCHAR(191) NULL,
    `agente` VARCHAR(300) NULL,

    INDEX `Auditoria_fecha_idx`(`fecha`),
    INDEX `Auditoria_usuarioId_idx`(`usuarioId`),
    INDEX `Auditoria_tipo_idx`(`tipo`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `_EsquemaToPlantilla` (
    `A` VARCHAR(191) NOT NULL,
    `B` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `_EsquemaToPlantilla_AB_unique`(`A`, `B`),
    INDEX `_EsquemaToPlantilla_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `ModuloEsquema` ADD CONSTRAINT `ModuloEsquema_esquemaId_fkey` FOREIGN KEY (`esquemaId`) REFERENCES `Esquema`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pregunta` ADD CONSTRAINT `Pregunta_moduloId_fkey` FOREIGN KEY (`moduloId`) REFERENCES `ModuloEsquema`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Pregunta` ADD CONSTRAINT `Pregunta_padreId_fkey` FOREIGN KEY (`padreId`) REFERENCES `Pregunta`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Pregunta` ADD CONSTRAINT `Pregunta_saltarHastaPreguntaId_fkey` FOREIGN KEY (`saltarHastaPreguntaId`) REFERENCES `Pregunta`(`id`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `Lote` ADD CONSTRAINT `Lote_departamentoId_fkey` FOREIGN KEY (`departamentoId`) REFERENCES `Departamento`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Zode` ADD CONSTRAINT `Zode_loteId_fkey` FOREIGN KEY (`loteId`) REFERENCES `Lote`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Municipio` ADD CONSTRAINT `Municipio_zodeId_fkey` FOREIGN KEY (`zodeId`) REFERENCES `Zode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Institucion` ADD CONSTRAINT `Institucion_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Sede` ADD CONSTRAINT `Sede_institucionId_fkey` FOREIGN KEY (`institucionId`) REFERENCES `Institucion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Operador` ADD CONSTRAINT `Operador_zodeId_fkey` FOREIGN KEY (`zodeId`) REFERENCES `Zode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Bodega` ADD CONSTRAINT `Bodega_operadorId_fkey` FOREIGN KEY (`operadorId`) REFERENCES `Operador`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ActaCaes` ADD CONSTRAINT `ActaCaes_institucionId_fkey` FOREIGN KEY (`institucionId`) REFERENCES `Institucion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laboratorio` ADD CONSTRAINT `Laboratorio_zodeId_fkey` FOREIGN KEY (`zodeId`) REFERENCES `Zode`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laboratorio` ADD CONSTRAINT `Laboratorio_municipioId_fkey` FOREIGN KEY (`municipioId`) REFERENCES `Municipio`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laboratorio` ADD CONSTRAINT `Laboratorio_institucionId_fkey` FOREIGN KEY (`institucionId`) REFERENCES `Institucion`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laboratorio` ADD CONSTRAINT `Laboratorio_sedeId_fkey` FOREIGN KEY (`sedeId`) REFERENCES `Sede`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laboratorio` ADD CONSTRAINT `Laboratorio_operadorId_fkey` FOREIGN KEY (`operadorId`) REFERENCES `Operador`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Laboratorio` ADD CONSTRAINT `Laboratorio_esquemaId_fkey` FOREIGN KEY (`esquemaId`) REFERENCES `Esquema`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `DetalleMuestraLaboratorio` ADD CONSTRAINT `DetalleMuestraLaboratorio_laboratorioId_fkey` FOREIGN KEY (`laboratorioId`) REFERENCES `Laboratorio`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visita` ADD CONSTRAINT `Visita_esquemaId_fkey` FOREIGN KEY (`esquemaId`) REFERENCES `Esquema`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Visita` ADD CONSTRAINT `Visita_usuarioId_fkey` FOREIGN KEY (`usuarioId`) REFERENCES `Usuario`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Respuesta` ADD CONSTRAINT `Respuesta_visitaId_fkey` FOREIGN KEY (`visitaId`) REFERENCES `Visita`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `Respuesta` ADD CONSTRAINT `Respuesta_preguntaId_fkey` FOREIGN KEY (`preguntaId`) REFERENCES `Pregunta`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PeticionPqrs` ADD CONSTRAINT `PeticionPqrs_responsableId_fkey` FOREIGN KEY (`responsableId`) REFERENCES `Usuario`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `RespuestaPqrs` ADD CONSTRAINT `RespuestaPqrs_peticionId_fkey` FOREIGN KEY (`peticionId`) REFERENCES `PeticionPqrs`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EsquemaToPlantilla` ADD CONSTRAINT `_EsquemaToPlantilla_A_fkey` FOREIGN KEY (`A`) REFERENCES `Esquema`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_EsquemaToPlantilla` ADD CONSTRAINT `_EsquemaToPlantilla_B_fkey` FOREIGN KEY (`B`) REFERENCES `Plantilla`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
