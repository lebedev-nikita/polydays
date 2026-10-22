package app.polydays.storage

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.kotlin.functions.Coroutine
import androidx.credentials.CredentialManager
import androidx.credentials.GetCredentialRequest
import com.google.android.libraries.identity.googleid.GetSignInWithGoogleOption
import com.google.android.libraries.identity.googleid.GoogleIdTokenCredential
import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.os.Build

class PolydaysStorageModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("PolydaysStorage")
    AsyncFunction("pinWidget") {
      val manager = AppWidgetManager.getInstance(context())
      if (Build.VERSION.SDK_INT >= 26 && manager.isRequestPinAppWidgetSupported) {
        SyncWorker.schedule(context())
        manager.requestPinAppWidget(ComponentName(context(), PolydayWidget::class.java), null, null)
      } else false
    }

    AsyncFunction("load") { account: String -> Store(context()).load(account)?.toString() }
    AsyncFunction("compareAndSwap") { account: String, version: Int, state: String, projection: String? ->
      val saved = Store(context()).compareAndSwap(account, version, state, projection)
      if (saved) { PolydayWidget.refresh(context()); SyncWorker.schedule(context()) }
      saved
    }
    AsyncFunction("getProfile") { Store(context()).profile()?.toString() }
    AsyncFunction("setProfile") { profile: String? -> Store(context()).setProfile(profile); PolydayWidget.refresh(context()) }
    AsyncFunction("clear") { account: String -> Store(context()).clear(account); PolydayWidget.refresh(context()) }
    AsyncFunction("setCredentials") { url: String, cookie: String ->
      Credentials.save(context(), url, cookie)
      SyncWorker.schedule(context())
    }
    AsyncFunction("googleSignIn") Coroutine { clientId: String, nonce: String ->
      val activity = appContext.currentActivity ?: error("Откройте приложение для входа через Google.")
      val option = GetSignInWithGoogleOption.Builder(clientId).setNonce(nonce).build()
      val result = CredentialManager.create(activity).getCredential(activity, GetCredentialRequest.Builder().addCredentialOption(option).build())
      GoogleIdTokenCredential.createFrom(result.credential.data).idToken
    }
  }
  private fun context() = appContext.reactContext?.applicationContext ?: error("Приложение ещё не готово.")
}
