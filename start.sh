#!/bin/bash
set -euo pipefail

CRON_SCHEDULE="${ASSET_HUB_CRON_SCHEDULE:-0 * * * *}"
CRON_DISABLED="${ASSET_HUB_CRON_DISABLE:-0}"
CRON_USER_ID="${ASSET_HUB_CRON_ADMIN_USER_ID:-}"
CRON_TARGET_URL="${ASSET_HUB_CRON_OVERDUE_URL:-http://127.0.0.1:3000/apps/asset-hub/api/assets/borrows/overdue}"

run_overdue() {
  if [[ -z "${CRON_USER_ID}" ]]; then
    echo "[asset-hub] overdue cron skipped: ASSET_HUB_CRON_ADMIN_USER_ID not set"
    exit 0
  fi
  curl -sS -X POST \
    -H "x-user-id: ${CRON_USER_ID}" \
    -H "Content-Length: 0" \
    "${CRON_TARGET_URL}" \
    || echo "[asset-hub] overdue cron request failed"
  exit 0
}

if [[ "${1:-}" == "overdue" ]]; then
  run_overdue
fi

setup_cron() {
  if [[ "${CRON_DISABLED}" == "1" ]]; then
    echo "[asset-hub] cron disabled via ASSET_HUB_CRON_DISABLE=1"
    return
  fi

  if [[ -z "${CRON_USER_ID}" ]]; then
    echo "[asset-hub] skip cron: ASSET_HUB_CRON_ADMIN_USER_ID is not set"
    return
  fi

  local cron_file="/etc/cron.d/asset-hub"
  echo "${CRON_SCHEDULE} root /start.sh overdue >> /var/log/cron.log 2>&1" > "${cron_file}"
  chmod 0644 "${cron_file}"
  crontab "${cron_file}"

  if command -v cron >/dev/null 2>&1; then
    cron
  elif command -v crond >/dev/null 2>&1; then
    crond
  else
    /usr/sbin/cron || true
  fi

  echo "[asset-hub] cron configured: ${CRON_SCHEDULE}"
}

setup_cron

exec node node_modules/next/dist/bin/next start -p "${PORT:-3000}"
