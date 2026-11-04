#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
# Docker's endpoint is deliberately scoped to this managed machine's local socket.
export DOCKER_HOST=unix:///var/run/docker.sock
unset DOCKER_CONTEXT DOCKER_TLS DOCKER_TLS_VERIFY DOCKER_CERT_PATH
startup_log=$(mktemp /tmp/aura-supabase-start.XXXXXX)
# Some images' BusyBox wget probes ignore NO_PROXY in this cloud machine.
# Retain the stack, then check the actual required services below instead.
if ! npx supabase start --ignore-health-check -x studio,postgres-meta,edge-runtime,logflare,vector,supavisor,imgproxy >"$startup_log" 2>&1; then
  echo "Local Supabase startup failed. Inspect the private log at $startup_log without sharing credential values." >&2
  exit 1
fi
docker exec supabase_db_Aura pg_isready -U postgres >/dev/null
curl --fail --silent http://127.0.0.1:54321/auth/v1/health >/dev/null
# This is a loopback-only health request; outbound service requests retain the proxy.
docker exec supabase_storage_Aura env -u HTTP_PROXY -u HTTPS_PROXY -u http_proxy -u https_proxy wget -q -O - http://127.0.0.1:5000/status >/dev/null
[ "$(docker inspect supabase_realtime_Aura --format '{{.State.Health.Status}}')" = healthy ]
echo 'Local database, Auth API, storage and Realtime health checks passed. Run npm run test:backend for functional validation.'
