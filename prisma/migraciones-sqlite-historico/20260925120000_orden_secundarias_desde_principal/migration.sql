-- Las preguntas secundarias no tienen orden propio: toman el de su pregunta
-- principal + 1, + 2, ... conservando el orden que ya tenían entre ellas
-- (lo mismo que hace src/lib/ordenSecundarias.ts al guardar).
CREATE TEMP TABLE "_OrdenSecundaria" AS
SELECT h."id" AS "id",
       p."orden" + ROW_NUMBER() OVER (PARTITION BY h."padreId" ORDER BY h."orden", h."createdAt", h."id") AS "orden"
FROM "Pregunta" h
JOIN "Pregunta" p ON p."id" = h."padreId";

UPDATE "Pregunta"
SET "orden" = (SELECT o."orden" FROM "_OrdenSecundaria" o WHERE o."id" = "Pregunta"."id")
WHERE "id" IN (SELECT "id" FROM "_OrdenSecundaria");

DROP TABLE "_OrdenSecundaria";
