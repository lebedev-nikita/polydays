package app.polydays.storage

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject
import java.util.UUID

/** One SQLite transaction owns local state, its durable outbox, and widget views. */
class Store(context: Context) {
  private val db = database(context)
  fun profile(): JSONObject? = get("profile")?.let(::JSONObject)
  fun setProfile(value: String?) = put("profile", value)
  fun load(account: String): JSONObject? = get("state:$account")?.let(::JSONObject)
  fun projection(account: String): JSONObject? = get("widget:$account")?.let(::JSONObject)
  fun transportStatus(): String? = get("transport-status")
  fun setTransportStatus(value: String?) = put("transport-status", value)
  fun clear(account: String) { db.beginTransaction(); try { put("state:$account", null); put("widget:$account", null); db.setTransactionSuccessful() } finally { db.endTransaction() } }
  fun compareAndSwap(account: String, expected: Int, state: String, projection: String?): Boolean {
    db.beginTransaction()
    try {
      val current = load(account)
      if ((current?.getInt("version") ?: 0) != expected || profile()?.getString("id") != account) return false
      val parsed = JSONObject(state)
      require(parsed.getString("accountId") == account)
      put("state:$account", JSONObject().put("version", expected + 1).put("state", parsed).toString())
      put("widget:$account", projection)
      db.setTransactionSuccessful()
      return true
    } finally { db.endTransaction() }
  }
  fun complete(account: String, taskId: String) {
    repeat(12) {
      if (profile()?.getString("id") != account) return
      val saved = load(account) ?: return
      val state = saved.getJSONObject("state")
      if (state.getJSONArray("conflicts").objects().any { it.getString("entityId") == "task:$taskId" }) return
      val projection = projection(account) ?: return
      val base = state.getJSONArray("pending").objects().lastOrNull { it.getJSONObject("entity").let { doc -> doc.getString("kind") == "task" && doc.getJSONObject("data").getString("id") == taskId } }?.getJSONObject("entity")
        ?: state.getJSONArray("records").objects().firstOrNull { it.getJSONObject("document").let { doc -> doc.getString("kind") == "task" && doc.getJSONObject("data").getString("id") == taskId } }?.getJSONObject("document")
      val task = base?.getJSONObject("data") ?: projection.getJSONArray("views").objects().flatMap { it.getJSONArray("tasks").objects() }.firstOrNull { it.getString("id") == taskId }?.getJSONObject("task") ?: return
      if (task.getBoolean("completed") || task.getBoolean("deleted")) return
      val completed = JSONObject(task.toString()).put("completed", true).put("completedAt", System.currentTimeMillis())
      state.getJSONArray("pending").put(JSONObject().put("id", UUID.randomUUID().toString()).put("entity", JSONObject().put("kind", "task").put("data", completed)).put("base", base ?: JSONObject.NULL).put("at", System.currentTimeMillis()))
      for (view in projection.getJSONArray("views").objects()) view.put("tasks", JSONArray(view.getJSONArray("tasks").objects().filter { it.getString("id") != taskId }))
      if (compareAndSwap(account, saved.getInt("version"), state.toString(), projection.toString())) return
    }
    error("Не удалось сохранить завершение задачи.")
  }
  fun accept(account: String, response: JSONObject) {
    repeat(20) {
      if (profile()?.getString("id") != account) return
      val saved = load(account) ?: return
      val state = saved.getJSONObject("state")
      val acknowledged = response.getJSONArray("acknowledged").let { array -> (0 until array.length()).map { array.getString(it) }.toMutableSet() }
      val conflicts = state.getJSONArray("conflicts").objects().associateBy { it.getString("id") }.toMutableMap()
      for (conflict in response.getJSONArray("conflicts").objects()) { acknowledged.add(conflict.getString("id")); conflicts[conflict.getString("id")] = conflict }
      val records = state.getJSONArray("records").objects().associateBy { entityId(it.getJSONObject("document")) }.toMutableMap()
      for (change in response.getJSONArray("changes").objects()) {
        val id = entityId(change.getJSONObject("document"))
        if ((records[id]?.getLong("revision") ?: -1) < change.getLong("revision")) records[id] = change
      }
      state.put("records", JSONArray(records.values.toList())).put("conflicts", JSONArray(conflicts.values.toList()))
        .put("pending", JSONArray(state.getJSONArray("pending").objects().filter { !acknowledged.contains(it.getString("id")) }))
        .put("cursor", maxOf(state.getLong("cursor"), response.getLong("cursor")))
      // Never replace optimistic views with a server projection while local edits remain.
      val projection = if (state.getJSONArray("pending").length() == 0 && conflicts.isEmpty()) response.optJSONObject("widget") else projection(account)
      if (compareAndSwap(account, saved.getInt("version"), state.toString(), projection?.toString())) return
    }
    error("Локальные данные заняты; синхронизация будет повторена.")
  }
  private fun get(key: String): String? = db.rawQuery("SELECT value FROM state WHERE key = ?", arrayOf(key)).use { if (it.moveToFirst()) it.getString(0) else null }
  private fun put(key: String, value: String?) {
    if (value == null) db.delete("state", "key = ?", arrayOf(key))
    else db.insertWithOnConflict("state", null, ContentValues().apply { put("key", key); put("value", value) }, SQLiteDatabase.CONFLICT_REPLACE)
  }
  companion object {
    @Volatile private var helper: SQLiteOpenHelper? = null
    @Synchronized private fun database(context: Context): SQLiteDatabase {
      if (helper == null) helper = object : SQLiteOpenHelper(context.applicationContext, "polydays.db", null, 1) {
        override fun onConfigure(db: SQLiteDatabase) { db.enableWriteAheadLogging() }
        override fun onCreate(db: SQLiteDatabase) { db.execSQL("CREATE TABLE state (key TEXT PRIMARY KEY, value TEXT NOT NULL)") }
        override fun onUpgrade(db: SQLiteDatabase, old: Int, new: Int) { error("Unsupported database version") }
      }
      return helper!!.writableDatabase
    }
  }
}
internal fun JSONArray.objects(): List<JSONObject> = (0 until length()).map { getJSONObject(it) }
internal fun entityId(doc: JSONObject) = "${doc.getString("kind")}:${doc.getJSONObject("data").getString("id")}"
