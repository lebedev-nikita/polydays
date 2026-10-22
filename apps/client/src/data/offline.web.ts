export function prepareOffline() {
  if (!__DEV__ && "serviceWorker" in navigator)
    void navigator.serviceWorker.register("/sw.js").catch(() => {
      /* The app remains usable online if the browser forbids service workers. */
    });
}
