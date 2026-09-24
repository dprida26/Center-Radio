#!/bin/sh
# Backup manual de la base de datos de produccion (Render, plan Free sin
# backups automaticos). Lee la DATABASE_URL desde backend/.env.local.production
# (gitignored) para no exponer la credencial en el historial de shell.
#
# Uso:
#   ./backup_produccion.sh
#
# Genera backups/produccion_YYYY-MM-DD_HHMMSS.dump (formato custom de
# pg_dump, restaurable con pg_restore). Se ejecuta contra el contenedor
# "db" del docker-compose local, que ya tiene pg_dump de la misma version
# de Postgres que usa Render.

set -eu

cd "$(dirname "$0")"

ENV_FILE="backend/.env.local.production"
if [ ! -f "$ENV_FILE" ]; then
  echo "No se encontro $ENV_FILE. Pega ahi la DATABASE_URL externa de Render (DATABASE_URL=postgresql://...) antes de correr este script." >&2
  exit 1
fi

DATABASE_URL=$(grep '^DATABASE_URL=' "$ENV_FILE" | head -n1 | cut -d'=' -f2-)
if [ -z "$DATABASE_URL" ]; then
  echo "No se encontro la variable DATABASE_URL dentro de $ENV_FILE." >&2
  exit 1
fi

mkdir -p backups
TIMESTAMP=$(date +%Y-%m-%d_%H%M%S)
OUT_FILE="backups/produccion_${TIMESTAMP}.dump"

echo "Generando backup de produccion en ${OUT_FILE} ..."
docker compose exec -T -e PGSSLMODE=require db pg_dump --format=custom --no-owner --no-privileges "$DATABASE_URL" > "$OUT_FILE"

echo "Backup completo: ${OUT_FILE} ($(du -h "$OUT_FILE" | cut -f1))"
echo
echo "Para restaurar en una base vacia:"
echo "  docker compose exec -T -e PGSSLMODE=require db pg_restore --no-owner --no-privileges -d <DATABASE_URL_DESTINO> < ${OUT_FILE}"
