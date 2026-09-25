# Imagen de producción para SAIPAE (Next.js + Prisma sobre MySQL).
# Se copian los node_modules completos (no build "standalone") porque en el
# arranque del contenedor se ejecuta `prisma migrate deploy`, que necesita el
# CLI de Prisma disponible en tiempo de ejecución.

FROM node:24-bookworm-slim AS deps
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ ca-certificates \
    && rm -rf /var/lib/apt/lists/*
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-bookworm-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts exige DATABASE_URL; en la compilación basta un valor de relleno
# (no se conecta). La URL real (mysql://...) llega al arrancar desde Easypanel.
ENV DATABASE_URL=mysql://compilacion:compilacion@localhost:3306/compilacion
RUN npx prisma generate
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN groupadd --system --gid 1001 nodejs \
    && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
# src y tsconfig: para los scripts que se corren desde la consola de Easypanel
# (prisma/seed.ts, prisma/importarDesdeSqlite.ts), que usan src/lib.
COPY --from=builder /app/src ./src
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json
COPY docker-entrypoint.sh ./docker-entrypoint.sh

RUN chmod +x ./docker-entrypoint.sh \
    && mkdir -p public/uploads public/generados data \
    && chown -R nextjs:nodejs /app

USER nextjs
EXPOSE 3000
ENV PORT=3000

ENTRYPOINT ["./docker-entrypoint.sh"]
