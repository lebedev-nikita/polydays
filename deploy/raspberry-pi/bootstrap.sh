#!/usr/bin/env bash
set -euo pipefail
[[ $(id -u) == 0 ]] || { echo 'Run with sudo.' >&2; exit 1; }
source_dir=$(cd "$(dirname "$0")" && pwd)
id polydays >/dev/null 2>&1 || useradd --system --create-home --home-dir /var/lib/polydays --shell /bin/bash polydays
install -d -m 755 /opt/polydays /opt/polydays/releases /usr/local/libexec
chown polydays:polydays /opt/polydays /opt/polydays/releases
install -d -m 700 -o polydays -g polydays /var/lib/polydays
install -d -m 700 /etc/polydays
install -m 755 "$source_dir/deploy.sh" /usr/local/libexec/polydays-deploy
install -m 644 "$source_dir/polydays.service" /etc/systemd/system/polydays.service
printf '%s\n' 'polydays ALL=(root) NOPASSWD: /usr/bin/systemctl restart polydays.service, /usr/bin/systemctl stop polydays.service' > /etc/sudoers.d/polydays
chmod 440 /etc/sudoers.d/polydays
visudo -cf /etc/sudoers.d/polydays
systemctl daemon-reload
systemctl enable polydays.service
printf '%s\n' 'Configure HTTPS and private DNS separately; the backend listens on the HOST/PORT from /etc/polydays/server.env.'
