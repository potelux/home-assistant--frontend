#!/usr/bin/env bash
# Start Home Assistant Core in Docker for frontend development (Cloud Agent / local).
# Serves Core on http://127.0.0.1:8123 with this repo mounted as frontend development_repo.

set -euo pipefail

cd "$(dirname "$0")/.."
ROOT="$PWD"
CONFIG_DIR="${ROOT}/config"
CONTAINER_NAME="ha-core"
IMAGE="ghcr.io/home-assistant/home-assistant:stable"

ensure_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "Docker is not installed. Install Docker before running Core." >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    if [ ! -S /var/run/docker.sock ]; then
      echo "Starting dockerd..." >&2
      sudo mkdir -p /etc/docker
      if [ ! -f /etc/docker/daemon.json ]; then
        printf '%s\n' '{' '  "storage-driver": "fuse-overlayfs"' '}' | sudo tee /etc/docker/daemon.json >/dev/null
      fi
      sudo dockerd >/tmp/dockerd.log 2>&1 &
      sleep 4
    fi
    sudo chmod 666 /var/run/docker.sock 2>/dev/null || true
  fi
}

seed_dev_dashboard() {
  mkdir -p "${CONFIG_DIR}/.storage"
  local dashboard_file="${CONFIG_DIR}/.storage/lovelace.dashboard_dev"
  local dashboards_file="${CONFIG_DIR}/.storage/lovelace_dashboards"
  local template_dashboard="${ROOT}/development/lovelace/dashboard_dev.storage.json"
  local template_dashboards="${ROOT}/development/lovelace/lovelace_dashboards.storage.json"

  copy_storage_file() {
    local src="$1"
    local dest="$2"
    if [ -w "$(dirname "${dest}")" ]; then
      cp "${src}" "${dest}"
    else
      sudo cp "${src}" "${dest}"
      sudo chown "$(id -u):$(id -g)" "${dest}" 2>/dev/null || true
    fi
  }

  if [ -f "${template_dashboard}" ]; then
    if [ ! -f "${dashboard_file}" ] || grep -q '"heading": "New section"' "${dashboard_file}" 2>/dev/null; then
      copy_storage_file "${template_dashboard}" "${dashboard_file}"
      echo "Seeded dev Lovelace dashboard with savant-scenes card."
    fi
  fi
  if [ -f "${template_dashboards}" ] && [ ! -f "${dashboards_file}" ]; then
    copy_storage_file "${template_dashboards}" "${dashboards_file}"
    echo "Registered dev dashboard in sidebar."
  fi
}

write_config() {
  mkdir -p "${CONFIG_DIR}"
  if [ ! -f "${CONFIG_DIR}/configuration.yaml" ]; then
    cat >"${CONFIG_DIR}/configuration.yaml" <<EOF
default_config:

frontend:
  development_repo: ${ROOT}

logger:
  default: info
  logs:
    homeassistant.components.frontend: debug
EOF
    echo "Wrote ${CONFIG_DIR}/configuration.yaml"
  fi
}

start_core() {
  docker rm -f "${CONTAINER_NAME}" 2>/dev/null || true
  docker run -d --name "${CONTAINER_NAME}" \
    -p 8123:8123 \
    -v "${CONFIG_DIR}:/config" \
    -v "${ROOT}:${ROOT}" \
    "${IMAGE}" >/dev/null
  echo "Home Assistant Core container '${CONTAINER_NAME}' started."
}

wait_for_api() {
  local tries=0
  until curl -sf "http://127.0.0.1:8123/api/onboarding" >/dev/null 2>&1 \
    || curl -sf "http://127.0.0.1:8123/api/" >/dev/null 2>&1; do
    tries=$((tries + 1))
    if [ "${tries}" -gt 60 ]; then
      echo "Timed out waiting for Core on port 8123. Check: docker logs ${CONTAINER_NAME}" >&2
      exit 1
    fi
    sleep 2
  done
}

print_status() {
  echo ""
  echo "Core URL:     http://127.0.0.1:8123"
  echo "Config:       ${CONFIG_DIR}"
  echo "Frontend dev: run 'HASS_URL=http://127.0.0.1:8123 ./script/develop' in another terminal"
  echo "             (or './script/develop_and_serve' for static serve on :8124)"
  echo ""
  if curl -sf "http://127.0.0.1:8123/api/onboarding" | grep -q '"done":false'; then
    echo "Onboarding is incomplete. Open http://127.0.0.1:8123/ in a browser to finish setup."
    echo "Or use the API flow documented in AGENTS.md (Cloud Agent section)."
  else
    echo "Core API is up. If this environment was auto-onboarded, try login: dev / devpassword123"
    echo "Dev dashboard (savant-scenes): http://127.0.0.1:8123/dashboard-dev/dev"
  fi
  echo ""
  echo "Logs: docker logs -f ${CONTAINER_NAME}"
}

ensure_docker
write_config
seed_dev_dashboard
start_core
wait_for_api
print_status
