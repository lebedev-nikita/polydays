# Run your own server

Install dependencies from the repository root with `bun install --frozen-lockfile`, then run `just build`. The exported web application and offline service worker are served by the Node.js process alongside the API.

Copy `.env.example` to `.env` and configure your Google project. Keep `.env` private. Set `BETTER_AUTH_SECRET` to a cryptographically random value of at least 32 characters, generated locally, for example with `openssl rand -hex 32`.

Use the same public HTTPS origin for `BETTER_AUTH_URL` and `WEB_ORIGIN` in production. Bind the Node process to loopback behind your existing HTTPS reverse proxy, then run:

```sh
NODE_ENV=production bun run server
```

`GET /api/health` is the readiness endpoint. The database directory must be writable and persistent. Application SQL migrations run at startup; Better Auth's initial tables are generated through the BoxDB adapter. Upgrading an existing auth schema requires an explicit migration rather than rerunning its initial generator.

## Google credentials

In [Google Auth Platform](https://console.cloud.google.com/auth/overview), configure branding and audience for your project. While the consent screen is in testing, add the owner account as a test user.

Create a **Web application** OAuth client. Add the web origin as an authorised JavaScript origin and the exact callback `${BETTER_AUTH_URL}/api/auth/callback/google` as an authorised redirect URI. Put that client's ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`; set `OWNER_EMAIL` to the verified Google account allowed to use this server. Other accounts cannot create a user or access sync.

For Android, create an **Android** OAuth client in the same project for package `app.polydays.mobile`, registering the SHA-1 certificate fingerprint of each signing key you use. The native Credential Manager request uses the web client's ID as its server audience. Register development and release signing certificates separately. See [Google's Credential Manager integration](https://developer.android.com/identity/sign-in/credential-manager-siwg) and [Better Auth's Google provider](https://www.better-auth.com/docs/authentication/google).

Rebuild Android with `EXPO_PUBLIC_API_URL` set to your public HTTPS server. Validate sign-in on the actual development and signed release builds. The server exchanges the native ID token through Better Auth; Google login is never embedded inside a WebView.

## Android distribution

Development builds use `just android`. Use [EAS Build](https://docs.expo.dev/build/introduction/) or your own signing pipeline for distribution. A local Gradle release build verifies compilation, but the generated development signing key is not a production release identity. Keep production keystores and passwords outside the repository.

The custom module is in `apps/client/modules/polydays-storage`; Expo autolinking includes its SQLite repository, Credential Manager integration, WorkManager sender and RemoteViews widget. Generate Android code with Expo prebuild. Do not edit the generated `apps/client/android` directory.

## Application releases

Always publish Android and macOS together from the same commit and version. On the configured Apple Silicon MacBook:

```sh
just release-build
# Commit the release changes, then rebuild from that commit.
just release
```

`just release` runs both builds before publishing a GitHub Release. Assets are staged in `.data/releases/<version>` with checksums and a source manifest; publishing refuses missing platform assets, changed checksums, an uncommitted tree or artifacts from another commit. A draft holds both platforms before the release becomes public.

Set the version in the root, client and macOS package manifests, Expo `app.json`, and desktop Cargo/Tauri manifests. Increase Android's `versionCode` for each release. Add the release notes at `docs/releases/<version>.md`.

The root `.env` supplies `EXPO_PUBLIC_API_URL` and four private signing settings: `POLYDAYS_ANDROID_KEYSTORE` (absolute path), `POLYDAYS_ANDROID_STORE_PASSWORD`, `POLYDAYS_ANDROID_KEY_ALIAS` and `POLYDAYS_ANDROID_KEY_PASSWORD`. Preserve the keystore in `.data/signing/` and its passwords for updates; copy them securely when changing build machines. The Gradle init script applies the release identity without editing generated Android code. Register that certificate's SHA-1 in the Google Android OAuth client.

macOS requires Rust and Xcode. The Tauri host bundles the same web export and uses a restricted native API transport; Google sign-in opens the system browser for device authorization. Session tokens remain in macOS Keychain. The current macOS artifacts are ad-hoc signed and not notarized because this machine has no Developer ID identity; downloaded copies are subject to Gatekeeper. Configure a Developer ID and Apple notarization before general macOS distribution. macOS widgets are deferred.

## Offline data and recovery

The first sign-in and initial download need a connection. Subsequent web navigation and reloads work offline after the service worker finishes installing. Browser data remains subject to browser storage retention and explicit site-data removal. Android uses a transactional SQLite repository; queued operations survive process death. Logout clears that account's local cache and asks before discarding pending work.

Keep the server database, its logical metadata and any SQLite sidecars together. For a simple cold backup, stop the Node process and copy the complete database directory to a separate destination. For continuous backups, BoxDB documents [Litestream replication and restore](https://github.com/lebedev-nikita/boxdb/blob/main/docs/replication.md). Restore into a new location and validate with the matching BoxDB CLI before serving it:

```sh
bunx --package @boxdb/cli@0.5.0 boxdb check /path/to/restored.db --full
```

The application merges device operations through its API. Database file replication is a backup mechanism and does not replace that protocol.

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

Run `just dev` for the Expo frontend, then open <https://macbook.gibbon-parrotfish.ts.net:8443>. Using the same hostname as the API allows the browser session to work across ports. The port-8443 frontend is available only while Expo is running. The root client commands explicitly load `.env`; rebuild Android and the web export after changing `EXPO_PUBLIC_API_URL`.

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

Google Cloud project `polydays-20261023` has a testing audience restricted to the owner, a Polydays name and logo, the web client described above, and separate Android clients for the local development and permanent release signing certificates. The native request uses `GOOGLE_CLIENT_ID` as its server audience; `GOOGLE_ANDROID_CLIENT_ID`, `GOOGLE_ANDROID_RELEASE_CLIENT_ID` and `GOOGLE_CLOUD_PROJECT` in `.env` record the matching Cloud resources. Publishing the app for other people and configuring public domains are separate deployment steps.

## T3 worktrees

The checked-in `t3.json` uses T3's documented `runOnWorktreeCreate` action. Its synchronous setup runs `scripts/+setup-worktree.ts` before dependency installation. It copies `.env` from `T3CODE_PROJECT_ROOT` (or Git's main checkout), sets mode `0600`, and never overwrites an existing destination. The file remains ignored by Git. The current T3 project also has these actions saved, so new worktrees do not require a manual import. Worktrees share OAuth configuration, but keep their own database files.
