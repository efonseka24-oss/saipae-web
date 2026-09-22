#!/bin/sh
set -e

npx prisma migrate deploy

exec node_modules/.bin/next start -p "${PORT:-3000}"
