#!/usr/bin/env bash
set -euo pipefail

# One-time setup of a DigitalOcean droplet for deploy-mempool-testnet.yml.
# Run as root on the droplet, with the DB passwords and the CD public key on stdin:
#
#   scp scripts/bootstrap-testnet-droplet.sh root@<droplet>:/root/
#   { echo "DB_PASSWORD=..."; echo "DB_ROOT_PASSWORD=..."; cat <cd-key>.pub; } \
#     | ssh root@<droplet> bash /root/bootstrap-testnet-droplet.sh
#
# Idempotent: re-running keeps the existing DB data, key and node install.

SERVICE_USER="opcat"
HOME_DIR="/home/${SERVICE_USER}"
NVM_VERSION="v0.40.3"

id -u "${SERVICE_USER}" >/dev/null 2>&1 || { echo "User ${SERVICE_USER} does not exist" >&2; exit 1; }

read -r DB_LINE
read -r DB_ROOT_LINE
read -r CD_PUBKEY
[[ "${DB_LINE}" == DB_PASSWORD=?* && "${DB_ROOT_LINE}" == DB_ROOT_PASSWORD=?* ]] || { echo "bad DB password lines" >&2; exit 1; }
[[ "${CD_PUBKEY}" == ssh-ed25519\ * ]] || { echo "bad CD public key" >&2; exit 1; }

# CD key for the service user
grep -qxF "${CD_PUBKEY}" "${HOME_DIR}/.ssh/authorized_keys" || echo "${CD_PUBKEY}" >> "${HOME_DIR}/.ssh/authorized_keys"

# MariaDB in docker, published on loopback only
DB_DIR="${HOME_DIR}/mempool-db"
install -d -o "${SERVICE_USER}" -g "${SERVICE_USER}" -m 700 "${DB_DIR}"
if [ ! -f "${DB_DIR}/.env" ]; then
  (umask 077; printf '%s\n%s\n' "${DB_LINE}" "${DB_ROOT_LINE}" > "${DB_DIR}/.env")
fi
cat > "${DB_DIR}/docker-compose.yml" <<'YML'
services:
  mariadb:
    image: mariadb:10.11
    container_name: mempool-db
    restart: unless-stopped
    ports:
      - "127.0.0.1:23306:3306"
    environment:
      MARIADB_DATABASE: mempool
      MARIADB_USER: mempool
      MARIADB_PASSWORD: ${DB_PASSWORD}
      MARIADB_ROOT_PASSWORD: ${DB_ROOT_PASSWORD}
    volumes:
      - ./data:/var/lib/mysql
YML
chown -R "${SERVICE_USER}:${SERVICE_USER}" "${DB_DIR}"
docker compose version >/dev/null 2>&1 || { apt-get update -qq && apt-get install -y -qq docker-compose-plugin; }
sudo -iu "${SERVICE_USER}" bash -c 'cd ~/mempool-db && docker compose up -d'

# Node 22 (what CI tests on) + pm2 for the service user (the workflow loads ~/.nvm)
sudo -iu "${SERVICE_USER}" NVM_VERSION="${NVM_VERSION}" bash -c '
  set -e
  [ -s ~/.nvm/nvm.sh ] || curl -fsSL "https://raw.githubusercontent.com/nvm-sh/nvm/${NVM_VERSION}/install.sh" | bash
  . ~/.nvm/nvm.sh
  nvm install 22
  nvm alias default 22
  command -v pm2 >/dev/null || npm install -g pm2'

# Resurrect pm2 apps on boot as the service user
NODE_BIN=$(sudo -iu "${SERVICE_USER}" bash -c '. ~/.nvm/nvm.sh; dirname "$(which node)"')
env PATH="${PATH}:${NODE_BIN}" "${NODE_BIN}/pm2" startup systemd -u "${SERVICE_USER}" --hp "${HOME_DIR}"

docker ps --filter name=mempool-db --format '{{.Names}} {{.Status}} {{.Ports}}'
echo "Bootstrap done."
