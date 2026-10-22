# Implementation contracts

Verified **2026-10-22, 18:39 UTC** using live npm metadata, official documentation, published package contents and the local BoxDB checkout. These are implementation inputs; native builds and end-to-end Google authentication were not run. Examples below are reduced API examples or explicitly marked application sketches.

## Versions and setup

Read-only command used, outside any package root: `npm view <package> version dist-tags peerDependencies engines --json`. No packages were installed for this research.

- Expo **58.0.17**, Expo Router **58.0.25**, Expo Modules Core **58.0.24**, Expo SQLite **58.0.13**, SecureStore **58.0.2**, Network **58.0.4**. [Expo metadata](https://registry.npmjs.org/expo/58.0.17), [Router metadata](https://registry.npmjs.org/expo-router/58.0.25).
- Registry latest: React/React DOM **19.3.1**, RN **0.88.0**, RN Web **0.21.4**. However, `expo@58.0.17/bundledNativeModules.json` selects **React/DOM 19.3.0**, **RN 0.88.0**, **RN Web ~0.21.4**, Router `~58.0.25`, screens `~4.30.0`, safe-area-context `~5.10.1`. Use Expo's matrix rather than independently selecting every latest package. [Published Expo archive](https://registry.npmjs.org/expo/-/expo-58.0.17.tgz), [SDK matrix](https://docs.expo.dev/versions/latest/#each-expo-sdk-version-depends-on-a-react-native-version).
- Better Auth and `@better-auth/expo`: **1.7.12**; the Expo plugin peers on Better Auth/core `^1.7.12`. BoxDB client and Better Auth adapter: **0.5.0**; adapter peers are `@boxdb/client ^0.5.0` and `better-auth ^1.7.7`, so `1.7.12` satisfies them. [Auth metadata](https://registry.npmjs.org/better-auth/1.7.12), [Expo plugin metadata](https://registry.npmjs.org/@better-auth/expo/1.7.12), [adapter metadata](https://registry.npmjs.org/@boxdb/better-auth-adapter/0.5.0).
- TypeScript **7.0.2**, Effect **4.0.5**, tRPC client/server **11.19.0**, Vite+ **1.3.0**, create-expo-app **5.0.0**, create-expo-module **58.0.3**. Effect's `rc` tag currently resolves to **4.0.0-rc.118**, distinct from stable latest; the installed skill's `effect@rc` instruction must not be interpreted as “latest stable.” Read the selected installed Effect package's `AGENTS.md` before writing its code. [TypeScript](https://registry.npmjs.org/typescript/7.0.2), [Effect tags](https://registry.npmjs.org/-/package/effect/dist-tags), [tRPC](https://registry.npmjs.org/@trpc/server/11.19.0), [Vite+](https://registry.npmjs.org/vite-plus/1.3.0).

Use the approved Bun/TypeScript/Node/tRPC/Effect stack. **Metro is the concrete exception to Vite+ for the Expo application**, including web: Expo CLI bundles with Metro during `expo start` and `expo export`. Vite+ can cover supported shared/server tooling. [Metro guide](https://docs.expo.dev/guides/customizing-metro/).

Expo's current quick start explicitly uses `--template default@sdk-58`: the no-template command still creates SDK 57 during transition. This application needs a custom native build regardless of Expo Go's transition support. [Router quick start](https://docs.expo.dev/router/introduction/).

```sh
# Setup commands for the implementing agent; not executed by this research.
bunx create-expo-app@5.0.0 --template default@sdk-58
# From the client package:
bunx expo install expo-router react-dom react-native-web @expo/metro-runtime
bunx expo install expo-secure-store expo-network expo-linking expo-web-browser expo-constants
bunx expo install --check
bunx expo start --web
bunx expo export --platform web
```

## Shared Router application and offline web

`package.json.main` is `expo-router/entry`; route files live under `src/app`, with `_layout.tsx` as the root layout. Add the `expo-router` config plugin, application scheme and typed routes. Keep framework filenames required by Router even though standalone project entry points use `+` names. [Router installation](https://docs.expo.dev/router/installation/).

```tsx
// src/app/_layout.tsx
import { Stack } from "expo-router";
export default function RootLayout() {
  return <Stack />;
}
```

Use shared RN components and platform storage/authentication adapters outside the route directory. Keep native-module loading in `.android.ts`/`.native.ts` and browser implementations in `.web.ts`; importing the native binding at shared module scope would execute it during web rendering. Platform files are a documented React Native mechanism. [Platform-specific code](https://reactnative.dev/docs/platform-specific-code).

Offline data and an offline application shell are separate requirements. Expo requires explicit service-worker setup for cached web assets; `expo export` alone does not establish offline startup. Verify a previously opened production export while the network is disabled, including a deep link and an upgrade. Browser IndexedDB can implement the shared persistence contract without requiring SQLite WASM/COOP/COEP. Expo SQLite's web setup requires WASM configuration and cross-origin isolation; do not assume those headers are compatible with Google popup authentication. [Expo PWA](https://docs.expo.dev/guides/progressive-web-apps/), [Expo SQLite web](https://docs.expo.dev/versions/latest/sdk/sqlite/#web-setup), [Google COOP requirements](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid#cross_origin_opener_policy).

## BoxDB 0.5.0: server installation, types and adapter

Authoritative local source: `/Users/nikitalebedev/.t3/worktrees/lightdb/t3-e6bbfb28`, commit **13c580ea9f699934082bc25caf299271e2efb69d**, package versions **0.5.0**. Read `packages/typescript/README.md`, `packages/better-auth-adapter/README.md`, `docs/temporal.md`, package manifests and native loader. This supersedes the earlier 0.4.3 assumptions.

The published name is **`@boxdb/client`**. Its npm archive actually contains `native/darwin-arm64/boxdb.node` and `native/linux-x64/boxdb.node`; no Rust compiler, install script or extra download is needed on supported hosts. Runtime requires Node **22.18+**; published prebuild support is macOS ARM64 (11+) or Linux x64/glibc 2.35+. Browsers, Android, Windows, Intel macOS, Linux ARM64 and Alpine/musl are outside that release's support. The package's broad `os`/`cpu` fields are less specific than its loader. Keep it in the Node server, never the shared client bundle. [Pinned client guide](https://github.com/lebedev-nikita/boxdb/blob/13c580ea9f699934082bc25caf299271e2efb69d/packages/typescript/README.md), [registry metadata](https://registry.npmjs.org/@boxdb/client/0.5.0).

```ts
import { BoxDB } from "@boxdb/client";
import { betterAuth } from "better-auth";
import { betterAuthAdapter } from "@boxdb/better-auth-adapter";
import { expo } from "@better-auth/expo";

const db = await BoxDB.open("polydays.db", { busyTimeoutMs: 5_000 });
export const auth = betterAuth({
  database: betterAuthAdapter(db),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: ["polydays://", "https://app.example.com"],
  plugins: [expo()],
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_WEB_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
  },
});
// The server owns db and closes it during shutdown.
```

This combines the documented adapter, Expo plugin and Google provider APIs; the example domain is a placeholder. Validate configuration before startup. The adapter borrows the connection. Its `createSchema` creates an **initial** schema, not incremental migrations; review and apply schema changes separately. [Pinned adapter guide](https://github.com/lebedev-nikita/boxdb/blob/13c580ea9f699934082bc25caf299271e2efb69d/packages/better-auth-adapter/README.md), [Expo integration](https://better-auth.com/docs/integrations/expo), [Google provider](https://better-auth.com/docs/authentication/google).

Bound query syntax is ``await db.query`SELECT ... WHERE id = ${id}` ``; dynamic identifiers use `db.identifier()`. Results are `unknown[]`/`unknown`, with **no result-type generic**: validate at the database boundary. Integers, row IDs and write counts return **bigint**; explicitly encode them for JSON. Use `tx = await db.begin()`, execute through `tx`, then explicitly `await tx.commit()` and dispose/rollback on failure. Root requests wait behind an active transaction, so awaiting a root query inside one's own transaction can deadlock until timeout. Default transaction lifetime is five seconds. Use binary storage for concurrent connections. [Client query/transaction contracts](https://github.com/lebedev-nikita/boxdb/blob/13c580ea9f699934082bc25caf299271e2efb69d/packages/typescript/README.md).

**TIME exists now.** It means time of day without date/zone; bind `HH:MM:SS[.fraction]`, receive canonical `HH:MM:SS.ffffff` as a TypeScript string. Hours are 00–23; `24:00:00` is rejected. INSTANT normalizes offsets to UTC; TIME/DATETIME reject offsets. Named account timezones remain application data. TIME supports comparison/indexing but not temporal arithmetic, `extract` or `date_trunc`; UTC INSTANT calendar arithmetic does not implement IANA-zone daylight-saving rules. [Pinned temporal guide](https://github.com/lebedev-nikita/boxdb/blob/13c580ea9f699934082bc25caf299271e2efb69d/docs/temporal.md).

```sql
CREATE TABLE clock_examples (
  id TEXT PRIMARY KEY,
  local_time TIME NOT NULL,
  recorded_at INSTANT NOT NULL
);
```

Polydays inference: native TIME can store recurring wall-clock boundaries, with an account timezone stored separately; resolve actual polyday instances in shared domain code. Android's system SQLite does **not** gain BoxDB's typed engine by using the same SQL column spelling. Use ordinary SQLite TEXT/INTEGER representations locally and explicit wire encodings. [BoxDB storage contracts](https://github.com/lebedev-nikita/boxdb/blob/13c580ea9f699934082bc25caf299271e2efb69d/docs/storage.md), [project terminology](../../CONTEXT.md).

## Android local module, SQLite and widget

Create the local module from the client package with `bunx create-expo-module@58.0.3 --local`; local modules live in `modules/`. Declare only supported platforms and the fully qualified Kotlin class in `expo-module.config.json`, e.g. `{"platforms":["android"],"android":{"modules":["expo.modules.polydays.PolydaysModule"]}}`. Build with `bunx expo run:android`; native changes require rebuilding. Generated native-project changes must survive prebuild through module resources/manifest or a config plugin. [Module setup](https://docs.expo.dev/modules/get-started/), [module config](https://docs.expo.dev/modules/module-config/), [custom native code](https://docs.expo.dev/workflow/customizing/).

An Expo Kotlin `Module` uses `override fun definition() = ModuleDefinition { Name("Polydays") ... }`. Use `AsyncFunction` for database I/O. Suspend APIs require the exact form `AsyncFunction("name") Coroutine { ... }`; their coroutine scope ends with the module. A WorkManager worker therefore needs its own native repository, not a retained Expo module or running JS runtime. [Expo module API](https://docs.expo.dev/modules/module-api/).

Android compatibility checked:

- Expo SDK 58: Android **7/API 24+**, compile SDK **37**, target SDK **36**. Published RN `0.88.0` catalog specifies AGP **9.2.1**, Kotlin **2.2.0**, Build Tools **37.0.0**, NDK **27.1.12297006**; Expo's current bare template uses Gradle **9.4.1**. Inherit the generated project's resolved values rather than copying current Android documentation's unrelated Kotlin example. [SDK matrix](https://docs.expo.dev/versions/latest/#support-for-android-and-ios-versions), [published RN source](https://registry.npmjs.org/react-native/-/react-native-0.88.0.tgz), [bare template](https://registry.npmjs.org/expo-template-bare-minimum/-/expo-template-bare-minimum-58.0.26.tgz).
- Latest stable Glance is **1.2.0**; the dependency example on its release page uses **1.3.0-alpha02**, so do not copy that alpha unintentionally. Use `androidx.glance:glance-appwidget:1.2.0`, enable Compose and apply `org.jetbrains.kotlin.plugin.compose` at the **same version as the project's Kotlin plugin**. Glance composables differ from Compose UI composables. [Glance releases](https://developer.android.com/jetpack/androidx/releases/glance), [Compose compiler setup](https://developer.android.com/develop/ui/compose/setup-compose-dependencies-and-compiler), [Glance UI](https://developer.android.com/develop/ui/compose/glance/build-ui).
- Latest stable WorkManager is **2.12.0**, with **minSdk 24**. `androidx.work:work-runtime-ktx:2.12.0` supplies CoroutineWorker support. These documented minimums align with Expo 58; this is compatibility evidence, not a completed Gradle resolution/build. [WorkManager releases](https://developer.android.com/jetpack/androidx/releases/work).

Use one native SQLite repository accessed by the Expo bridge, widget callbacks and workers. Open/create/migrate with `SQLiteOpenHelper` off the UI thread. For every offline edit, atomically update task data, append an idempotent explicit command and refresh the prepared widget view. This is a Polydays design inference; SQLite transaction APIs and helper lifecycle are documented. [Android SQLite guide](https://developer.android.com/training/data-storage/sqlite), [SQLiteDatabase transaction API](<https://developer.android.com/reference/android/database/sqlite/SQLiteDatabase#beginTransaction()>).

Widget actions can call `ActionCallback.onAction` without opening the app. App-specific sketch; `repository` and `enqueueSync` must be implemented:

```kotlin
class CompleteTaskAction : ActionCallback {
  override suspend fun onAction(
    context: Context, glanceId: GlanceId, parameters: ActionParameters
  ) {
    val id = parameters[ActionParameters.Key<String>("taskId")] ?: return
    repository(context).setCompletedAndAppendOutbox(id, true)
    PolydaysWidget().update(context, glanceId)
    enqueueSync(context)
  }
}
// In Glance content:
// Button("Complete", actionRunCallback<CompleteTaskAction>(
//   actionParametersOf(ActionParameters.Key<String>("taskId") to task.id)))
```

Use `actionStartActivity` for opening the task/rescheduling UI, not an activity-launch trampoline inside a callback. Provide a `GlanceAppWidgetReceiver`, manifest app-widget receiver entry, provider XML and initial layout resource. Do not rely on process-memory widget state. [Widget actions](https://developer.android.com/develop/ui/compose/glance/user-interaction), [widget setup](https://developer.android.com/develop/ui/compose/glance/create-app-widget), [widget state](https://developer.android.com/develop/ui/compose/glance/glance-app-widget).

Refresh after local mutations and after sync; `PolydaysWidget().updateAll(context)` is a suspend extension callable from a CoroutineWorker. Enqueue constrained one-time network work for outbox sync; periodic work's minimum is **15 minutes** with OS-controlled timing, and provider `updatePeriodMillis` has a **30-minute** floor. Neither promises exact polyday-boundary refresh. Widget navigation can read cached prepared polydays while offline. [Widget updates](https://developer.android.com/develop/ui/compose/glance/glance-app-widget), [work scheduling](https://developer.android.com/develop/background-work/background-tasks/persistent/getting-started/define-work).

Native worker transport needs an explicit contract: Kotlin cannot invoke the TypeScript tRPC client without JS. It may speak the documented tRPC HTTP protocol (unbatched JSON mutations use POST; nested names use dots), or use a thin JSON endpoint calling the same sync service. Keep wire values plain JSON and verify session ownership server-side. [tRPC HTTP specification](https://trpc.io/docs/rpc).

## Google native identity → Better Auth session

Use Android Credential Manager rather than embedding Google's authorization UI. Stable artifacts verified from Google Maven metadata: **credentials 1.6.0**, **credentials-play-services-auth 1.6.0**, **googleid 1.2.1**. Metadata's latest/release field for credentials is an alpha; select stable deliberately. [Credentials releases](https://developer.android.com/jetpack/androidx/releases/credentials), [Google ID metadata](https://dl.google.com/dl/android/maven2/com/google/android/libraries/identity/googleid/googleid/maven-metadata.xml).

Official API sequence, reduced to a suspend function's body; `activity`, `webClientId` and a fresh `nonce` are inputs:

```kotlin
val option = GetSignInWithGoogleOption.Builder(webClientId)
  .setNonce(nonce).build()
val request = GetCredentialRequest.Builder()
  .addCredentialOption(option).build()
val result = CredentialManager.create(activity)
  .getCredential(context = activity, request = request)
val credential = result.credential
require(credential is CustomCredential &&
  credential.type == GoogleIdTokenCredential.TYPE_GOOGLE_ID_TOKEN_CREDENTIAL)
val token = GoogleIdTokenCredential.createFrom(credential.data).idToken
```

The server client ID is the **Web OAuth client ID**, even though the calling application is Android. Register the Android package/signing certificate in the same Google project. The button API above does not require implementing the authorized-account bottom-sheet retry flow. Catch cancellation and credential/parsing failures; return the ID token to JS, not a locally invented application session. [Official implementation](https://developer.android.com/identity/sign-in/credential-manager-siwg-implementation).

Native client initialization uses `createAuthClient` from `better-auth/react` with `expoClient({ scheme: "polydays", storagePrefix: "polydays", storage: SecureStore })`; import the plugin from `@better-auth/expo/client` and SecureStore from `expo-secure-store`. Then:

```ts
await authClient.signIn.social({
  provider: "google",
  idToken: { token, nonce },
});
// Native tRPC headers callback:
const cookie = await authClient.getCookie();
return cookie ? { Cookie: cookie } : {};
```

ID-token sign-in does not redirect. The published `better-auth@1.7.12` social-sign-in schema makes `nonce` and `accessToken` optional: an access token is not required just to pass a Google ID token. Use the same nonce supplied to Credential Manager. Google provider `clientId` also accepts an array for multiple accepted audiences; its first entry is still the authorization-code client paired with the single secret. With Android requesting the Web client audience, that Web ID alone can cover native ID-token verification and the browser code flow. [Google provider](https://better-auth.com/docs/authentication/google), [published route schema](https://registry.npmjs.org/better-auth/-/better-auth-1.7.12.tgz).

The Expo plugin stores native session cookies in SecureStore and documents `getCookie()` for tRPC/custom fetch; it does not automatically authenticate every independent HTTP client. Browser requests instead use browser-managed cookies (credentials/CORS as appropriate). A Kotlin worker cannot assume it can read the Expo plugin's SecureStore encoding: implement a deliberate native credential handoff or leave its outbox pending until foreground authentication. Local offline account access is separate from an unexpired server session; preserve edits and surface reauthentication when sync is rejected. [Expo session/custom-fetch integration](https://better-auth.com/docs/integrations/expo).

## Credentials and native verification prerequisites

- Credentials still needed for real sign-in: configured Google Web client ID/secret, Android package/signing registration, registered browser callback URL (`/api/auth/callback/google`), server auth secret/base URL and actual web trusted origin. No credentials or private accounts were read. Native client IDs are public configuration; secrets stay server-side. [Google configuration](https://better-auth.com/docs/authentication/google).
- Local read-only inspection found Node **26.12.1**, Bun **1.4.3**, JDK **21.0.1**, `adb`, `sdkmanager` and `just`. Installed SDK inventory includes Platform **37.0**, NDK **27.1.12297006**, Build Tools **35/36** and Google-enabled emulator images. **Build Tools 37.0.0 was absent from that inventory**, so the implementing agent should resolve/install the generated project's required tools before native validation. The SDK CLI itself reports `sdkmanager` deprecated in favor of `android sdk`. No SDK install or emulator/build was performed.
- Remaining checks: generated Gradle dependency resolution and debug build; real Credential Manager → Better Auth → authenticated sync; widget completion with the app process absent; worker auth expiry; persisted outbox recovery; offline exported web startup. These are explicit unverified behaviours, not facts established by documentation.
