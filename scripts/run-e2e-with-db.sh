#!/usr/bin/env bash
# Spin up a THROWAWAY PostgreSQL on a RANDOM free port, run the e2e suite
# against it, and tear everything down — even on failure.
#
# Why the random port: a fixed port (55432) once collided with another Claude
# session's scratch server running in parallel; the suite transparently used
# the wrong instance. Random high ports make concurrent sessions safe.
#
#   npm run verify:e2e:db          (bash scripts/run-e2e-with-db.sh)
#   PG_BIN=/path/to/bin overrides autodiscovery.
set -euo pipefail

# Windows npm invokes this script through WSL. A Windows PostgreSQL executable
# can start from WSL, but pg_ctl cannot reliably observe its readiness and may
# wait forever. Prefer an ephemeral Docker database when Docker is available;
# the native pg_ctl path below remains the fallback for Linux/macOS.
DOCKER=""
if command -v docker >/dev/null 2>&1; then
  DOCKER="$(command -v docker)"
elif [ -x "/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe" ]; then
  DOCKER="/mnt/c/Program Files/Docker/Docker/resources/bin/docker.exe"
fi
if [ -n "$DOCKER" ] && "$DOCKER" info >/dev/null 2>&1; then
  CONTAINER="forgevid-e2e-pg-${RANDOM}-$$"
  docker_cleanup() {
    "$DOCKER" rm -f "$CONTAINER" >/dev/null 2>&1 || true
  }
  trap docker_cleanup EXIT

  "$DOCKER" run -d --rm \
    --name "$CONTAINER" \
    -e POSTGRES_USER=postgres \
    -e POSTGRES_PASSWORD=forgevid_e2e \
    -e POSTGRES_DB=forgevid_e2e \
    -p 127.0.0.1::5432 \
    postgres:16-alpine >/dev/null

  PORT="$("$DOCKER" port "$CONTAINER" 5432/tcp | head -n 1 | sed 's/.*://')"
  if [ -z "$PORT" ]; then
    echo "FAIL: Docker did not publish the scratch PostgreSQL port." >&2
    exit 1
  fi

  for _ in $(seq 1 60); do
    if "$DOCKER" exec "$CONTAINER" pg_isready -U postgres -d forgevid_e2e >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  if ! "$DOCKER" exec "$CONTAINER" pg_isready -U postgres -d forgevid_e2e >/dev/null 2>&1; then
    echo "FAIL: scratch PostgreSQL container did not become ready." >&2
    exit 1
  fi

  echo "scratch postgres container on 127.0.0.1:$PORT"
  export DATABASE_URL="postgresql://postgres:forgevid_e2e@127.0.0.1:$PORT/forgevid_e2e"
  npx --no-install prisma migrate deploy
  npx --no-install tsx scripts/verify-e2e.ts
  exit 0
fi

PG_BIN="${PG_BIN:-}"
if [ -z "$PG_BIN" ]; then
  for candidate in \
    "/mnt/c/Program Files/PostgreSQL/18/bin" \
    "/mnt/c/Program Files/PostgreSQL/17/bin" \
    "/mnt/c/Program Files/PostgreSQL/16/bin" \
    "/c/Program Files/PostgreSQL/18/bin" \
    "/c/Program Files/PostgreSQL/17/bin" \
    "/c/Program Files/PostgreSQL/16/bin" \
    "/usr/lib/postgresql/18/bin" \
    "/usr/lib/postgresql/17/bin" \
    "/usr/lib/postgresql/16/bin" \
    "/usr/local/bin" \
    "/usr/bin"; do
    if [ -x "$candidate/pg_ctl" ] || [ -x "$candidate/pg_ctl.exe" ]; then PG_BIN="$candidate"; break; fi
  done
fi
if [ -z "$PG_BIN" ]; then
  echo "FAIL: pg_ctl not found. Install PostgreSQL or set PG_BIN." >&2
  exit 1
fi
PG_EXE=""
if [ ! -x "$PG_BIN/pg_ctl" ] && [ -x "$PG_BIN/pg_ctl.exe" ]; then
  PG_EXE=".exe"
fi

PGDATA="$(mktemp -d "${TMPDIR:-/tmp}/forgevid-e2e-pg.XXXXXX")"
LOG="$PGDATA/server.log"
DB="forgevid_e2e"

cleanup() {
  "$PG_BIN/pg_ctl$PG_EXE" -D "$PGDATA" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$PGDATA" || true
}
trap cleanup EXIT

"$PG_BIN/initdb$PG_EXE" -D "$PGDATA" -U postgres -A trust -E UTF8 >/dev/null

# Pick a random free port; if the start fails (port raced away), try another.
PORT=""
for _ in 1 2 3 4 5; do
  candidate=$(( (RANDOM % 14000) + 49152 ))
  if "$PG_BIN/pg_ctl$PG_EXE" -D "$PGDATA" -l "$LOG" \
      -o "-p $candidate -c listen_addresses=127.0.0.1" -w start >/dev/null 2>&1; then
    PORT="$candidate"
    break
  fi
done
if [ -z "$PORT" ]; then
  echo "FAIL: could not start scratch postgres (see $LOG)" >&2
  exit 1
fi
echo "scratch postgres on 127.0.0.1:$PORT (data: $PGDATA)"

# The suite must run against THIS instance and no other: assert emptiness.
"$PG_BIN/psql$PG_EXE" -U postgres -h 127.0.0.1 -p "$PORT" -d postgres -qAtc "CREATE DATABASE $DB;"

export DATABASE_URL="postgresql://postgres@127.0.0.1:$PORT/$DB"
npx --no-install prisma migrate deploy
npx --no-install tsx scripts/verify-e2e.ts
