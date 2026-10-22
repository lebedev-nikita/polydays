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

## Offline data and recovery

The first sign-in and initial download need a connection. Subsequent web navigation and reloads work offline after the service worker finishes installing. Browser data remains subject to browser storage retention and explicit site-data removal. Android uses a transactional SQLite repository; queued operations survive process death. Logout clears that account's local cache and asks before discarding pending work.

Keep the server database, its logical metadata and any SQLite sidecars together. For a simple cold backup, stop the Node process and copy the complete database directory to a separate destination. For continuous backups, BoxDB documents [Litestream replication and restore](https://github.com/lebedev-nikita/boxdb/blob/main/docs/replication.md). Restore into a new location and validate with the matching BoxDB CLI before serving it:

```sh
bunx --package @boxdb/cli@0.5.0 boxdb check /path/to/restored.db --full
```

The application merges device operations through its API. Database file replication is a backup mechanism and does not replace that protocol.
