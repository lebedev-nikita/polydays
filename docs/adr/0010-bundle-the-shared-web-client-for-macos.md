# Bundle the shared client for macOS

Ship Android and macOS together starting with 0.1.0. The macOS Tauri host bundles the existing React Native for Web export, preserving one implementation of tasks, scheduling and offline sync rather than adopting a different React Native macOS version. A restricted native transport connects only to the configured HTTPS API; Better Auth's first-party device authorization opens the system browser and stores the resulting session in macOS Keychain. macOS widgets remain a separate native extension, deferred beyond this release.

React Native for Web inserts styles at runtime. Keep the explicit inline-style policy while disabling Tauri’s additional CSP nonce/hash injection for `style-src` only; script restrictions, local-only IPC and the API endpoint allowlist remain enforced.
