package app.polydays.storage

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** The worker receives the app session, encrypted with a device-bound key. */
object Credentials {
  private const val ALIAS = "polydays-worker-session"
  @Synchronized private fun key(): SecretKey {
    val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
    (store.getKey(ALIAS, null) as? SecretKey)?.let { return it }
    return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
      init(KeyGenParameterSpec.Builder(ALIAS, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT).setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE).build())
    }.generateKey()
  }
  fun save(context: Context, url: String, cookie: String) {
    val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.ENCRYPT_MODE, key()) }
    val data = JSONObject().put("url", url).put("cookie", cookie).toString().toByteArray(Charsets.UTF_8)
    val encoded = Base64.encodeToString(cipher.iv + cipher.doFinal(data), Base64.NO_WRAP)
    check(context.getSharedPreferences("polydays-session", Context.MODE_PRIVATE).edit().putString("value", encoded).commit())
  }
  fun load(context: Context): JSONObject? {
    val value = context.getSharedPreferences("polydays-session", Context.MODE_PRIVATE).getString("value", null) ?: return null
    return try {
      val bytes = Base64.decode(value, Base64.NO_WRAP)
      val cipher = Cipher.getInstance("AES/GCM/NoPadding").apply { init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, bytes.copyOfRange(0, 12))) }
      JSONObject(String(cipher.doFinal(bytes.copyOfRange(12, bytes.size)), Charsets.UTF_8))
    } catch (_: Exception) { null }
  }
}
