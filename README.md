<img src="assets/icon.svg" width="64" height="64" alt="">

# Polydays

A personal task planner for daily wake intervals. One React Native application runs on Android, the web and a macOS Tauri host. Tasks, recurring work, completed history and schedule rules remain available offline.

Requires Bun 1.4+, Node.js 22.18+, Vite+ (`vp`) and [Just](https://just.systems/). BoxDB's published native client supports macOS ARM64 and Linux x64 with glibc 2.35+.

```sh
bun install --frozen-lockfile
just dev
```

Open <http://localhost:8081> and choose **Открыть пространство разработки**. This explicit local mode uses an isolated development account; it is unavailable when the server runs in production or binds beyond loopback.

If the local Polydays service is already running, `just dev` reuses its backend and starts only the Expo frontend. Sign in with Google in that case. Stopping development leaves the existing service running. On the configured MacBook, use <https://macbook.gibbon-parrotfish.ts.net:8443> for this frontend; both devices must be connected to the tailnet.

For Google sign-in, configure the private root `.env`, run `just build`, then `bun run server` and open your configured HTTPS URL. The MacBook service is already running at <https://macbook.gibbon-parrotfish.ts.net>. See [local server and Google setup](docs/deployment.md). T3's **Setup worktree** action copies the root `.env` with private permissions before installing dependencies; an existing worktree `.env` is preserved.

In the web app, press **Q** outside a text field to add a task. Tasks with an exact deadline are rescheduled by editing their date and time; **Убрать дедлайн** explicitly switches them to the inbox or an untimed polyday.

```sh
just check       # Formatting, lint and both TypeScript projects
just test        # Domain, synchronisation, BoxDB and HTTP tests
just e2e         # Production web build and two-browser offline test
just android     # Install a native development build on a connected emulator/device
just native-check # Android build and native storage/outbox instrumentation tests
```

Android builds require JDK 21, Android SDK 37, Build Tools 37.0.0, NDK 27.1.12297006 and `ANDROID_HOME`. Client commands load `EXPO_PUBLIC_API_URL` from the root `.env`; the configured MacBook address is embedded when building. Without that variable, Android falls back to the emulator's `http://10.0.2.2:3000`. Expo Go cannot load the custom storage, Google credential and widget module.

Android settings include **Добавить виджет**. Its checkboxes save completion offline without a running React application. Background delivery and refresh depend on Android scheduling; the widget displays its represented date and update state.

See [deployment and Google setup](docs/deployment.md), [product rules](docs/product.md), [design system](DESIGN.md) and [synchronisation contracts](docs/synchronisation.md). Shared domain code lives in `packages/core`, the offline protocol in `packages/sync`, and platform adapters in `apps/client/src/data` and `apps/client/modules/polydays-storage`. The Node.js server uses BoxDB 0.5.1 and native `TIME` columns.

Every release includes Android and macOS packages. Run `just release` on the configured MacBook to build, verify and publish both together; see [release instructions](docs/deployment.md#application-releases). The macOS WidgetKit extension is a later stage. Google sign-in requires your OAuth configuration; local tests do not substitute for a real provider round trip.
