#!/usr/bin/env bash
# ForgeVid's PERSISTENT local development database.
#
#   npm run db:local          start (initializes on first run)
#   npm run db:local:stop     stop
#   bash scripts/db-local.sh status
#
# - Data lives OUTSIDE the repo (../forgevid-db) so git operations can't touch it.
# - Fixed port 54329: persistent, documented, and far from the throwaway e2e
#   clusters (random 49152+) and other sessions' scratch servers.
# - Trust auth on 127.0.0.1 only — a dev database, never expose it.
# To use your main PostgreSQL service instead, just point DATABASE_URL at it
# and run `npx prisma migrate deploy`.
set -euo pipefail

PORT=54329
PGDATA="${FORGEVID_PGDATA:-$(cd "$(dirname "$0")/.." && pwd)/../forgevid-db}"
LOG="$PGDATA/server.log"
DB="forgevid"

PG_BIN="${PG_BIN:-}"
if [ -z "$PG_BIN" ]; then
  for candidate in "/c/Program Files/PostgreSQL/18/bin" "/c/Program Files/PostgreSQL/17/bin" "/c/Program Files/PostgreSQL/16/bin" "/usr/lib/postgresql/16/bin" "/usr/local/bin" "/usr/bin"; do
    if [ -x "$candidate/pg_ctl" ] || [ -x "$candidate/pg_ctl.exe" ]; then PG_BIN="$candidate"; break; fi
  done
fi
[ -n "$PG_BIN" ] || { echo "FAIL: pg_ctl not found; set PG_BIN" >&2; exit 1; }

cmd="${1:-start}"
case "$cmd" in
  start)
    if [ ! -f "$PGDATA/PG_VERSION" ]; then
      echo "initializing new cluster at $PGDATA"
      mkdir -p "$PGDATA"
      "$PG_BIN/initdb" -D "$PGDATA" -U postgres -A trust -E UTF8 >/dev/null
    fi
    if "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PORT" >/dev/null 2>&1; then
      echo "already running on 127.0.0.1:$PORT"
    else
      "$PG_BIN/pg_ctl" -D "$PGDATA" -l "$LOG" \
        -o "-p $PORT -c listen_addresses=127.0.0.1" -w start >/dev/null
      echo "started on 127.0.0.1:$PORT (data: $PGDATA)"
    fi
    "$PG_BIN/psql" -U postgres -h 127.0.0.1 -p "$PORT" -d postgres -qAtc \
      "SELECT 1 FROM pg_database WHERE datname='$DB';" | grep -q 1 || \
      "$PG_BIN/psql" -U postgres -h 127.0.0.1 -p "$PORT" -d postgres -qAtc "CREATE DATABASE $DB;"
    echo "DATABASE_URL=postgresql://postgres@127.0.0.1:$PORT/$DB"
    ;;
  stop)
    "$PG_BIN/pg_ctl" -D "$PGDATA" -m fast -w stop && echo "stopped"
    ;;
  status)
    "$PG_BIN/pg_isready" -h 127.0.0.1 -p "$PORT" || true
    ;;
  *)
    echo "usage: db-local.sh [start|stop|status]" >&2; exit 2
    ;;
esac
