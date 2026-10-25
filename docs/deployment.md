# Run your own server

Install dependencies from the repository root with `bun install --frozen-lockfile`, then run `just build`. The exported web application and offline service worker are served by the Node.js process alongside the API.

Copy `.env.example` to `.env` and configure your Google project. Keep `.env` private. Set `BETTER_AUTH_SECRET` to a cryptographically random value of at least 32 characters, generated locally, for example with `openssl rand -hex 32`.

Use the same public HTTPS origin for `BETTER_AUTH_URL` and `WEB_ORIGIN` in production. Bind the Node process to loopback behind your existing HTTPS reverse proxy, then run:

```sh
NODE_ENV=production bun run server
```

`GET /api/health` is the readiness endpoint. The database directory must be writable and persistent. Application SQL migrations run at startup; Better Auth's initial tables are generated through the BoxDB adapter. Upgrading an existing auth schema requires an explicit migration rather than rerunning its initial generator.

## Google credentials

In [Google Auth Platform](https://console.cloud.google.com/auth/overview), configure branding and audience for your project. Google sign-in requests only the basic identity scopes (`openid`, `email`, `profile`); [Google documents an exception to testing-mode user allowlists for these scopes](https://developers.google.com/identity/protocols/oauth2/production-readiness/overview). If you add other Google scopes, configure the audience and test users accordingly.

Create a **Web application** OAuth client. Add the web origin as an authorised JavaScript origin and the exact callback `${BETTER_AUTH_URL}/api/auth/callback/google` as an authorised redirect URI. Put that client's ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Configure server admission as described below; Google authentication and server admission are separate checks.

For Android, create an **Android** OAuth client in the same project for package `app.polydays.mobile`, registering the SHA-1 certificate fingerprint of each signing key you use. The native Credential Manager request uses the web client's ID as its server audience. Register development and release signing certificates separately. See [Google's Credential Manager integration](https://developer.android.com/identity/sign-in/credential-manager-siwg) and [Better Auth's Google provider](https://www.better-auth.com/docs/authentication/google).

On the Android or macOS sign-in screen, enter your public HTTPS server origin in **Сервер**, then choose **Подключиться** before signing in. The address is saved on that device. To change servers, first sign out; synchronise pending changes or explicitly confirm their removal. The current address is also shown in account settings. Use an origin such as `https://polydays.example.com`, without an API path, query or credentials. Web clients also offer this setting; a separate server origin must permit the web client's origin and browser session cookies.

`EXPO_PUBLIC_API_URL` supplies the default address for a build; a saved address takes precedence. Validate sign-in on the actual development and signed release builds. The server exchanges the native ID token through Better Auth; Google login is never embedded inside a WebView.

## Account access

Set `ALLOWED_EMAILS=*` to admit any verified Google account, or use a comma-separated allowlist such as `ALLOWED_EMAILS=alice@example.com,bob@example.com`. Each account has independent tasks, schedule, history and MCP connections. This policy applies to registration, application sessions, MCP requests and connection management, including existing sessions and tokens after a server restart.

For existing installations, `OWNER_EMAIL` remains a fallback when `ALLOWED_EMAILS` is absent. An explicit `ALLOWED_EMAILS` overrides it. Without either setting, verified Google accounts are admitted. Network access is separate: users of the private Pi service still need Tailscale access.

## Android distribution

Development builds use `just android`. Use [EAS Build](https://docs.expo.dev/build/introduction/) or your own signing pipeline for distribution. A local Gradle release build verifies compilation, but the generated development signing key is not a production release identity. Keep production keystores and passwords outside the repository.

The custom module is in `apps/client/modules/polydays-storage`; Expo autolinking includes its SQLite repository, Credential Manager integration, WorkManager sender and RemoteViews widget. Generate Android code with Expo prebuild. Do not edit the generated `apps/client/android` directory.

Release size settings live in the `expo-build-properties` plugin in `apps/client/app.json` and the Cargo release profile in `apps/macos/src-tauri/Cargo.toml`. Android removes unused code/resources and omits GIF/WebP codecs; enable those codecs before adding images in those formats. Native libraries are compressed to reduce the distributed APK and extracted during installation; this can increase installed disk usage. Hermes bytecode remains uncompressed for direct loading at startup. Client and shared packages import Effect modules through `effect/<Module>` to avoid bundling the entire entry point with Metro.

## Application releases

Always publish Android and macOS together from the same commit and version. On the configured Apple Silicon MacBook:

```sh
just release-build
# Commit the release changes, then rebuild from that commit.
just release
```

`just release` runs both builds before publishing a GitHub Release. Assets are staged in `.data/releases/<version>` with checksums and a source manifest; publishing refuses missing platform assets, changed checksums, an uncommitted tree or artifacts from another commit. A draft holds both platforms before the release becomes public.

Publish the Android APK, macOS DMG and `SHA256SUMS`. The DMG contains the macOS application, so no separate application ZIP is built. Keep `release.json` locally for publishing checks; it is not uploaded to GitHub.

Release packaging disables Finder automation for macOS, so building the DMG does not open an installer window. The image retains the application and Applications link, without custom Finder icon positions.

Set the version in the root, client and macOS package manifests, Expo `app.json`, and desktop Cargo/Tauri manifests. Increase Android's `versionCode` for each release. Add the release notes at `docs/releases/<version>.md`.

The root `.env` supplies `EXPO_PUBLIC_API_URL` and four private signing settings: `POLYDAYS_ANDROID_KEYSTORE` (absolute path), `POLYDAYS_ANDROID_STORE_PASSWORD`, `POLYDAYS_ANDROID_KEY_ALIAS` and `POLYDAYS_ANDROID_KEY_PASSWORD`. Preserve the keystore in `.data/signing/` and its passwords for updates; copy them securely when changing build machines. The Gradle init script applies the release identity without editing generated Android code. Register that certificate's SHA-1 in the Google Android OAuth client.

macOS requires Rust and Xcode. The Tauri host bundles the same web export and uses a restricted native API transport; Google sign-in opens the system browser for device authorization. Session tokens remain in macOS Keychain. The current macOS artifacts are ad-hoc signed and not notarized because this machine has no Developer ID identity; downloaded copies are subject to Gatekeeper. Configure a Developer ID and Apple notarization before general macOS distribution. macOS widgets are deferred.

## Offline data and recovery

The first sign-in and initial download need a connection. Subsequent web navigation and reloads work offline after the service worker finishes installing. Browser data remains subject to browser storage retention and explicit site-data removal. Android uses a transactional SQLite repository; queued operations survive process death. Logout clears that account's local cache and asks before discarding pending work.

Keep the server database, its logical metadata and any SQLite sidecars together. For a simple cold backup, stop the Node process and copy the complete database directory to a separate destination. For continuous backups, BoxDB documents [Litestream replication and restore](https://github.com/lebedev-nikita/boxdb/blob/main/docs/replication.md). Restore into a new location and validate with the matching BoxDB CLI before serving it:

```sh
bunx --package @boxdb/cli@0.5.1 boxdb check /path/to/restored.db --full
```

The application merges device operations through its API. Database file replication is a backup mechanism and does not replace that protocol.

## Raspberry Pi service and CI/CD

The production server and bundled web client run at <https://polydays.gibbon-parrotfish.ts.net>, reachable from the tailnet. The stable Tailscale Service `svc:polydays` forwards HTTPS on port 443 to `127.0.0.1:3000` on the Pi. The device keeps its separate name `pi`; <https://pi.gibbon-parrotfish.ts.net> remains available for existing clients. Funnel is disabled. Google OAuth permits the service origin and its exact `/api/auth/callback/google` URI, alongside the existing device entries. See [MCP setup](mcp.md) for `/mcp` authorization and `/connect` connection management.

To provision another host, define the service `polydays` with `tcp:443` in the Tailscale admin console. Give the host a server tag owned by your administrator, advertise the service with the command below, then approve the host under Services. Services require a tagged host; keep SSH access valid when replacing user ownership with a tag. The configured Pi uses `tag:server` and ordinary SSH key authentication.

```sh
sudo tailscale serve --service=svc:polydays --https=443 http://127.0.0.1:3000
```

Tailscale provides the service DNS name, virtual addresses and TLS certificate. More services can share the Pi using distinct `svc:` names and backend ports. Their names do not require renaming the device or buying a domain. The address remains private; cloud clients need a separate network tunnel or public entry point.

The 64-bit Bookworm host uses Node.js from [.node-version](../.node-version), Bun 1.4.3, and BoxDB 0.5.1 with its bundled Linux ARM64 addon. The `polydays` system account owns application releases under `/opt/polydays/releases` and persistent data under `/var/lib/polydays`. `/opt/polydays/current` points to the active commit. The root-only `/etc/polydays/server.env` supplies Google credentials, account admission settings, session secret, the database path and the service HTTPS origin; development authentication is disabled. `BETTER_AUTH_URL` and `WEB_ORIGIN` use the service origin. `ADDITIONAL_ORIGINS=https://pi.gibbon-parrotfish.ts.net,https://pi.gibbon-parrotfish.ts.net:8443` keeps the previous web origins trusted during migration.

[The workflow](../.github/workflows/deploy-pi.yml) checks formatting and types, runs unit and browser tests on a GitHub-hosted Linux runner, builds the production web client, and uploads a source-and-web artifact. Only successful `main` runs deploy. A repository-specific ARM64 runner named `polydays-pi` downloads that artifact on the Pi; pull requests run checks on GitHub and never enter this deployment job. The runner uses GitHub's outbound connection, so CI needs no SSH key or separate Tailscale credential.

[The deployment script](../deploy/raspberry-pi/deploy.sh) serialises deployments, installs locked production dependencies, verifies the native BoxDB addon, stops the service for a consistent database snapshot, switches the release symlink, and checks readiness. Failed startups restore the previous code and database snapshot. The current and previous releases remain available, while database snapshots accumulate in `/var/lib/polydays/backups`; copy these to separate storage and review retention as data grows. Deployments preserve the database and private environment outside the release directory.

The systemd unit and privileged deployment helper are installed by `sudo bash deploy/raspberry-pi/bootstrap.sh`. This assumes Node.js and Bun are already installed at `/usr/local/bin` and Tailscale is connected. Bootstrap enables Tailscale DNS acceptance so the Pi can resolve MagicDNS names during deployment, and configures the persistent device HTTPS proxy. After defining and approving the service, run bootstrap with `sudo TAILSCALE_SERVICE=svc:polydays bash deploy/raspberry-pi/bootstrap.sh` to configure its proxy too. The GitHub runner is installed in `/opt/polydays/runner` as `polydays`, registered only to this repository, and managed by its `actions.runner.*` systemd service. The account may restart or stop only `polydays.service` through sudo. Changes to the privileged unit or deployment helper must be installed explicitly with the bootstrap script; application deployments cannot replace them.

```sh
ssh pi 'sudo systemctl status polydays --no-pager'
ssh pi 'sudo journalctl -u polydays -n 100 --no-pager'
ssh pi 'sudo systemctl restart polydays'
curl --fail https://polydays.gibbon-parrotfish.ts.net/api/health
```

Push to `main` to deploy automatically, or rerun **Check and deploy Raspberry Pi** on `main` from GitHub Actions. The Pi starts with its own database; moving MacBook data requires a separate consistent transfer.

## Local MacBook service

The configured server and exported web app use <https://macbook.gibbon-parrotfish.ts.net>. `gibbon-parrotfish.ts.net` is the tailnet suffix; the MacBook's device name is required. Android and the MacBook must be connected to the same tailnet, and the MacBook must be awake for sign-in and sync. Existing local data remains usable offline when the server is unavailable.

The private root `.env` uses:

```dotenv
HOST=127.0.0.1
PORT=3000
BETTER_AUTH_URL=https://macbook.gibbon-parrotfish.ts.net
WEB_ORIGIN=https://macbook.gibbon-parrotfish.ts.net:8443
EXPO_PUBLIC_API_URL=https://macbook.gibbon-parrotfish.ts.net
```

Tailscale Serve terminates HTTPS and proxies the API/export on port 443 and the Expo frontend on port 8443. These are tailnet-only endpoints; Funnel is not enabled. Both proxies are persistent:

```sh
tailscale serve --bg --https=443 http://127.0.0.1:3000
tailscale serve --bg --https=8443 http://127.0.0.1:8081
```

Run `just dev` for the Expo frontend, then open <https://macbook.gibbon-parrotfish.ts.net:8443>. Using the same hostname as the API allows the browser session to work across ports. The port-8443 frontend is available only while Expo is running. The root client commands explicitly load `.env`; rebuild to change the bundled default `EXPO_PUBLIC_API_URL`, or select another server on the sign-in screen without rebuilding.

The Google web client permits both HTTPS origins and the exact redirect `https://macbook.gibbon-parrotfish.ts.net/api/auth/callback/google`. Its existing localhost entries remain available for an independently configured loopback environment.

On the configured MacBook, `~/Library/LaunchAgents/app.polydays.server.plist` runs the production Node process at login and restarts it after an unexpected exit. It loads the root `.env`; development authentication is disabled. Logs are in `.data/logs/`. After editing `.env`, restart it with:

```sh
launchctl kickstart -k "gui/$(id -u)/app.polydays.server"
curl --fail https://macbook.gibbon-parrotfish.ts.net/api/health
```

Stop the service before starting a separate foreground server on the same port:

```sh
launchctl bootout "gui/$(id -u)/app.polydays.server"
```

To restore the login service, run `launchctl bootstrap "gui/$(id -u)" "$HOME/Library/LaunchAgents/app.polydays.server.plist"`. Rebuild the web export with `just build` after client changes.

Google Cloud project `polydays-20261023` has an external testing audience with basic identity scopes, a Polydays name and logo, the web client described above, and separate Android clients for the local development and permanent release signing certificates. The native request uses `GOOGLE_CLIENT_ID` as its server audience; `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_ANDROID_RELEASE_CLIENT_ID` and `GOOGLE_CLOUD_PROJECT` in `.env` record the matching Cloud resources. Users also need network access through Tailscale. Configuring a public domain or a cloud MCP tunnel is a separate deployment step.

## T3 worktrees

The checked-in `t3.json` uses T3's documented `runOnWorktreeCreate` action. Its synchronous setup runs `scripts/+setup-worktree.ts` before dependency installation. It copies `.env` from `T3CODE_PROJECT_ROOT` (or Git's main checkout), sets mode `0600`, and never overwrites an existing destination. The file remains ignored by Git. The current T3 project also has these actions saved, so new worktrees do not require a manual import. Worktrees share OAuth configuration, but keep their own database files.
