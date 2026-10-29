#!/usr/bin/env bash
# Smoke test of the local stack (E01/US-005). Usage: scripts/smoke.sh  (after `docker compose --profile dev up -d`)
set -euo pipefail
BASE=${BASE:-http://127.0.0.1:8090}
MAILPIT=${MAILPIT:-http://127.0.0.1:8025}
fail() { echo "FAIL: $*" >&2; exit 1; }

wait_for() { for _ in $(seq 1 60); do curl -fs -o /dev/null "$1" && return 0; sleep 1; done; fail "$1 not reachable"; }
wait_for "$BASE/api/health"

# 1. The SPA through nginx and /api/health through nginx
curl -fsS "$BASE/" | grep -q '<la-root>' || fail "the SPA is not served at $BASE/"
curl -fsS "$BASE/api/health" | grep -q '"status":"ok"' || fail "/api/health does not answer ok through nginx"
echo "ok  SPA and /api/health through nginx"

# 2. A SPA route reloaded in the browser gets index.html
curl -fsS "$BASE/rooms" | grep -q '<la-root>' || fail "/rooms does not fall back to index.html"
[ "$(curl -s -o /dev/null -w '%{http_code}' "$BASE/missing.js")" = 404 ] || fail "a missing asset must be a 404"
echo "ok  SPA fallback (and 404 for missing assets)"

# 3. Mailpit (dev profile) receives mail sent from the api container to SMTP_HOST:SMTP_PORT
curl -fsS "$MAILPIT/api/v1/info" >/dev/null || fail "Mailpit is not up (docker compose --profile dev up -d)"
curl -fsS -X DELETE "$MAILPIT/api/v1/messages" >/dev/null
docker compose exec -T api bash -c '
  exec 3<>/dev/tcp/${SMTP_HOST}/${SMTP_PORT}
  for line in "HELO api" "MAIL FROM:<limpiapp@localhost>" "RCPT TO:<smoke@example.com>" "DATA" \
              "Subject: LimpiApp smoke" "" "smoke" "." "QUIT"; do printf "%s\r\n" "$line" >&3; sleep 0.2; done
  cat <&3 >/dev/null' || fail "the api container cannot talk SMTP to \$SMTP_HOST"
for _ in $(seq 1 10); do
  curl -fsS "$MAILPIT/api/v1/messages" | grep -q 'LimpiApp smoke' && { echo "ok  mail from the api container reaches Mailpit"; exit 0; }
  sleep 1
done
fail "the smoke mail did not reach Mailpit"
