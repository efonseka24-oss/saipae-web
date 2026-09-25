Migraciones de cuando la base era SQLite (hasta septiembre de 2026). Ya no se
aplican: el sistema pasó a MySQL y `prisma/migrations` empieza con una
migración inicial que crea todo el esquema. Se conservan solo como historial.
Los datos de una base SQLite antigua se pasan a MySQL restaurando una copia de
seguridad del panel (Administrador → Copia de seguridad).
