# Deploying to DigitalOcean (testnet)

`.github/workflows/deploy-mempool-testnet.yml` builds backend + frontend and deploys them
to a DigitalOcean droplet with the `testnet` GitHub environment. It runs on push to
`deploy-testnet` or manually via `workflow_dispatch`.

The runner SSHes in as the service user `opcat` with a per-droplet CD key, unpacks the
build into `/home/opcat/mempool/releases/<release>`, switches the `current` symlink and
restarts the `mempool-backend` / `mempool-frontend` PM2 apps (rolling back if they do not
stay online). MariaDB runs in docker on the same droplet, published on `127.0.0.1` only.
electrs and the OPCAT Layer node are reached over the VPC.

No host addresses are kept in the repo. The public address (`DEPLOY_HOST`) and the VPC
addresses are environment secrets, so they are masked in the public Actions logs
(variables are printed in clear in each step's env header).

## One-time droplet bootstrap

Generate the CD key locally (`ssh-keygen -t ed25519`), one per droplet; the private half
only goes into the GitHub environment secret. Then, as root on the droplet:

```bash
scp scripts/bootstrap-testnet-droplet.sh root@<droplet>:/root/
{ echo "DB_PASSWORD=<db-password>"; echo "DB_ROOT_PASSWORD=<db-root-password>"; cat <cd-key>.pub; } \
  | ssh root@<droplet> bash /root/bootstrap-testnet-droplet.sh
```

This adds the CD key to `opcat`, starts MariaDB (`~/mempool-db`), installs Node 22 + PM2
for `opcat` via nvm and enables `pm2-opcat.service` so the apps come back after a reboot.

## Public web

`testnet.opcatlabs.io` is served through a Cloudflare tunnel (`cloudflared`) on the droplet
pointing at `http://127.0.0.1:<FRONTEND_PORT>`, so no inbound port or firewall tag is needed.

## GitHub environment

Fill a copy of `scripts/testnet.env.example` outside the repo, then:

```bash
scripts/create-testnet-env.sh --env-file <path>
```

| Name | Kind | Notes |
|---|---|---|
| `DEPLOY_HOST` | secret | droplet public address |
| `DEPLOY_KNOWN_HOSTS` | secret | pinned host key (`ssh-keyscan`) |
| `DEPLOY_SSH_KEY` | secret | CD private key |
| `ELECTRS_API`, `ELECTRUM_HOST`, `CORE_RPC_HOST` | secret | VPC addresses |
| `CORE_RPC_USERNAME`, `CORE_RPC_PASSWORD` | secret | node RPC credentials |
| `DATABASE_PASSWORD` | secret | MariaDB `mempool` user |
| everything else in the example | variable | ports, paths, network, DB name/user |
