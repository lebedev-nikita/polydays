package app.polydays.storage

import android.content.Context
import androidx.work.*
import org.json.JSONArray
import org.json.JSONObject
import java.net.HttpURLConnection
import java.net.URL
import java.util.concurrent.TimeUnit

class SyncWorker(context: Context, params: WorkerParameters) : Worker(context, params) {
  override fun doWork(): Result {
    val store = Store(applicationContext)
    val profile = store.profile() ?: return Result.success()
    val account = profile.getString("id")
    val credentials = Credentials.load(applicationContext) ?: return Result.success()
    val api = credentials.getString("url")
    if (api.isEmpty() || (!profile.optBoolean("dev") && credentials.getString("cookie").isEmpty())) return Result.success()
    return try {
      repeat(100) {
        if (store.profile()?.getString("id") != account) return Result.success()
        val state = store.load(account)?.getJSONObject("state") ?: return Result.success()
        val request = JSONObject().put("accountId", account).put("cursor", state.getLong("cursor")).put("operations", JSONArray(state.getJSONArray("pending").objects().take(100)))
        val connection = URL("$api/api/sync").openConnection() as HttpURLConnection
        try {
          connection.requestMethod = "POST"; connection.connectTimeout = 15000; connection.readTimeout = 20000; connection.doOutput = true; connection.instanceFollowRedirects = false
          connection.setRequestProperty("Content-Type", "application/json")
          if (profile.optBoolean("dev")) connection.setRequestProperty("x-polydays-dev", "1")
          else connection.setRequestProperty("Cookie", credentials.getString("cookie"))
          connection.outputStream.use { it.write(request.toString().toByteArray(Charsets.UTF_8)) }
          if (connection.responseCode == 401 || connection.responseCode == 403) { store.setTransportStatus("needs-login"); PolydayWidget.refresh(applicationContext); return Result.success() }
          if (connection.responseCode != 200) return Result.retry()
          val response = connection.inputStream.bufferedReader().use { JSONObject(it.readText()) }
          store.accept(account, response)
          store.setTransportStatus(null)
          PolydayWidget.refresh(applicationContext)
          if (!response.getBoolean("hasMore") && (store.load(account)?.getJSONObject("state")?.getJSONArray("pending")?.length() ?: 0) == 0) return Result.success()
        } finally { connection.disconnect() }
      }
      Result.retry()
    } catch (_: Exception) { Result.retry() }
  }
  companion object {
    fun schedule(context: Context) {
      val constraints = Constraints.Builder().setRequiredNetworkType(NetworkType.CONNECTED).build()
      val manager = WorkManager.getInstance(context)
      manager.enqueueUniqueWork("polydays-sync", ExistingWorkPolicy.APPEND_OR_REPLACE, OneTimeWorkRequestBuilder<SyncWorker>().setConstraints(constraints).setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS).build())
      manager.enqueueUniquePeriodicWork("polydays-periodic", ExistingPeriodicWorkPolicy.KEEP, PeriodicWorkRequestBuilder<SyncWorker>(15, TimeUnit.MINUTES).setConstraints(constraints).build())
    }
  }
}
