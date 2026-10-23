#!/usr/bin/env bash
set -Eeuo pipefail

revision=${1:?Usage: deploy.sh <commit SHA> < release.tar.gz}
[[ $revision =~ ^[0-9a-f]{40}$ ]] || { echo 'Invalid commit SHA.' >&2; exit 1; }
root=/opt/polydays
exec 9>"$root/deploy.lock"
flock -w 600 9
stage=$(mktemp -d "$root/releases/$revision.XXXXXX")
trap 'rm -rf "$stage"' EXIT
tar -xzf - -C "$stage" --no-same-owner
test -s "$stage/apps/client/dist/index.html"
test -d "$stage/db/migrations"
test -s "$stage/apps/server/src/+server.ts"
cd "$stage"
/usr/local/bin/bun install --frozen-lockfile --production --ignore-scripts
/usr/local/bin/node --input-type=module -e '
  import { BoxDB } from "@boxdb/client";
  const db = await BoxDB.open(":memory:");
  await db.execute("SELECT 1");
  await db.close();
'
printf '%s\n' "$revision" > REVISION
previous=$(readlink -f "$root/current" || true)
release="$root/releases/$revision"
if [[ -e $release ]]; then
  release="$stage"
else
  mv "$stage" "$release"
fi
cd "$release"
trap - EXIT
state=/var/lib/polydays
backup=

activate() {
  ln -sfn "$1" "$root/current.next"
  mv -Tf "$root/current.next" "$root/current"
}

healthy() {
  for ((attempt = 0; attempt < 30; attempt++)); do
    if curl --fail --silent --max-time 2 http://127.0.0.1:3000/api/health >/dev/null; then
      return 0
    fi
    sleep 1
  done
  return 1
}
rollback() {
  trap - ERR
  echo "Deployment failed: $revision" >&2
  sudo -n /usr/bin/systemctl stop polydays.service
  if [[ -n $backup ]]; then
    rm -f "$state"/polydays.db*
    cp -a "$backup"/polydays.db* "$state/"
  fi
  if [[ -n $previous && -d $previous ]]; then
    activate "$previous"
    sudo -n /usr/bin/systemctl restart polydays.service
    healthy || echo 'Previous release is also unhealthy; inspect journalctl -u polydays.' >&2
  else
    sudo -n /usr/bin/systemctl stop polydays.service
    rm -f "$root/current"
  fi
  exit 1
}
trap rollback ERR
sudo -n /usr/bin/systemctl stop polydays.service
if [[ -f $state/polydays.db ]]; then
  mkdir -p "$state/backups"
  snapshot=$(mktemp -d "$state/backups/$(date -u +%Y%m%dT%H%M%SZ)-$revision.XXXXXX")
  cp -a "$state"/polydays.db* "$snapshot/"
  backup=$snapshot
fi
activate "$release"
if ! sudo -n /usr/bin/systemctl restart polydays.service || ! healthy; then
  rollback
fi
trap - ERR
echo "Deployed $revision"

# Retain the active and previous releases for rollback; remove older build artifacts.
find "$root/releases" -mindepth 1 -maxdepth 1 -type d -print0 |
  while IFS= read -r -d '' directory; do
    if [[ $directory != "$release" && $directory != "$previous" ]]; then
      rm -rf "$directory"
    fi
  done
