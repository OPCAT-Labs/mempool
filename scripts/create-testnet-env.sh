#!/usr/bin/env bash
set -euo pipefail

ENV_NAME="testnet"
ENV_FILE=""

usage() {
  cat <<'USAGE'
Usage:
  scripts/create-testnet-env.sh [--env-file path]

Fills the `testnet` GitHub environment used by deploy-mempool-testnet.yml.
Values come from env vars or --env-file (see scripts/testnet.env.example).

Secrets (masked in public Actions logs):
  DEPLOY_HOST          droplet public address the runner SSHes into
  ELECTRS_API          esplora REST URL (VPC address)
  ELECTRUM_HOST        electrum server host (VPC address)
  CORE_RPC_HOST        node RPC host (VPC address)
  CORE_RPC_USERNAME    node RPC user
  CORE_RPC_PASSWORD    node RPC password
  DATABASE_PASSWORD    MariaDB password
  DEPLOY_SSH_KEY_FILE  path to the per-droplet CD private key

Optional:
  DEPLOY_KNOWN_HOSTS_FILE  pinned host keys; if unset, ssh-keyscan is run against DEPLOY_HOST

Everything else in the example file is stored as a plain variable.
Requires GitHub CLI (gh) logged in with repo access.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h|--help) usage; exit 0 ;;
    --env-file) ENV_FILE="$2"; shift 2 ;;
    *) echo "Unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

command -v gh >/dev/null 2>&1 || { echo "gh CLI is required" >&2; exit 1; }

if [[ -n "${ENV_FILE}" ]]; then
  [[ -f "${ENV_FILE}" ]] || { echo "Env file not found: ${ENV_FILE}" >&2; exit 1; }
  set -a
  # shellcheck disable=SC1090
  source "${ENV_FILE}"
  set +a
fi

REPO="${GH_REPO:-$(gh repo view --json nameWithOwner -q .nameWithOwner)}"
[[ -n "${REPO}" ]] || { echo "Unable to determine repo; set GH_REPO=owner/name" >&2; exit 1; }

SECRETS=(DEPLOY_HOST ELECTRS_API ELECTRUM_HOST CORE_RPC_HOST CORE_RPC_USERNAME CORE_RPC_PASSWORD DATABASE_PASSWORD)
VARIABLES=(DEPLOY_USER DEPLOY_DIR DEPLOY_PORT DEPLOY_HOST_NAME MEMPOOL_NETWORK MEMPOOL_BACKEND
  BACKEND_PORT FRONTEND_PORT TRACKER_API ELECTRUM_PORT ELECTRUM_TLS_ENABLED CORE_RPC_PORT
  DATABASE_HOST DATABASE_PORT DATABASE_NAME DATABASE_USERNAME DATABASE_SSL DATABASE_SSL_REJECT_UNAUTHORIZED)

missing=()
for key in "${SECRETS[@]}" "${VARIABLES[@]}" DEPLOY_SSH_KEY_FILE; do
  [[ -n "${!key:-}" ]] || missing+=("${key}")
done
if [[ ${#missing[@]} -gt 0 ]]; then
  echo "Missing required variables: ${missing[*]}" >&2
  exit 1
fi
[[ -f "${DEPLOY_SSH_KEY_FILE}" ]] || { echo "SSH key file not found: ${DEPLOY_SSH_KEY_FILE}" >&2; exit 1; }

if [[ -n "${DEPLOY_KNOWN_HOSTS_FILE:-}" ]]; then
  KNOWN_HOSTS=$(cat "${DEPLOY_KNOWN_HOSTS_FILE}")
else
  KNOWN_HOSTS=$(ssh-keyscan -p "${DEPLOY_PORT}" -t ed25519 "${DEPLOY_HOST}" 2>/dev/null)
fi
[[ -n "${KNOWN_HOSTS}" ]] || { echo "Could not collect host keys; set DEPLOY_KNOWN_HOSTS_FILE" >&2; exit 1; }

printf "Creating environment %s in %s...\n" "${ENV_NAME}" "${REPO}"
gh api -X PUT "repos/${REPO}/environments/${ENV_NAME}" >/dev/null

for name in "${VARIABLES[@]}"; do
  printf "Setting variable %s...\n" "${name}"
  gh variable set --repo "${REPO}" --env "${ENV_NAME}" "${name}" --body "${!name}" >/dev/null
done

set_secret() {
  printf "Setting secret %s...\n" "$1"
  printf '%s' "$2" | gh secret set --repo "${REPO}" --env "${ENV_NAME}" "$1" >/dev/null
}
for name in "${SECRETS[@]}"; do
  set_secret "${name}" "${!name}"
done
set_secret DEPLOY_KNOWN_HOSTS "${KNOWN_HOSTS}"
set_secret DEPLOY_SSH_KEY "$(cat "${DEPLOY_SSH_KEY_FILE}")"

# These used to be variables; drop them so the plain-text copies don't linger
for name in "${SECRETS[@]}"; do
  gh variable delete --repo "${REPO}" --env "${ENV_NAME}" "${name}" >/dev/null 2>&1 || true
done

printf "Done. Environment %s configured.\n" "${ENV_NAME}"
