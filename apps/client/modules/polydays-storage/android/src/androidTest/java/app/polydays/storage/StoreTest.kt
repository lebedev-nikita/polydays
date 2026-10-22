package app.polydays.storage

import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import org.json.JSONArray
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Test
import org.junit.runner.RunWith

/** Runs in the native test process, with no React Native runtime. */
@RunWith(AndroidJUnit4::class)
class StoreTest {
  private val context = InstrumentationRegistry.getInstrumentation().targetContext
  private fun seed(): Pair<Store, String> {
    val store = Store(context)
    val account = "native-test"
    store.setProfile(JSONObject().put("id", account).put("dev", true).toString())
    store.clear(account)
    val task = JSONObject("""{"id":"widget-task","title":"Завершить без JS","description":"","priority":1,"order":1,"scheduling":{"kind":"polyday","date":"2026-10-22","slotId":"morning"},"completed":false,"completedAt":null,"deleted":false,"createdAt":1,"seriesId":null,"occurrenceDate":null}""")
    val state = JSONObject().put("accountId", account).put("records", JSONArray().put(JSONObject().put("document", JSONObject().put("kind", "task").put("data", task)).put("revision", 1))).put("pending", JSONArray()).put("conflicts", JSONArray()).put("cursor", 1)
    val projection = JSONObject().put("generatedAt", 1).put("validUntil", Long.MAX_VALUE).put("views", JSONArray().put(JSONObject().put("id", "day").put("title", "Утро").put("subtitle", "06:00–12:00").put("from", 0).put("until", Long.MAX_VALUE).put("tasks", JSONArray().put(JSONObject().put("id", task.getString("id")).put("task", task)))))
    assertTrue(store.compareAndSwap(account, 0, state.toString(), projection.toString()))
    return store to account
  }
  @Test fun widgetCompletionIsDurableAndDeduplicatedWithoutJavascript() {
    val (store, account) = seed()
    store.complete(account, "widget-task")
    Store(context).complete(account, "widget-task")
    val saved = Store(context).load(account)!!
    val pending = saved.getJSONObject("state").getJSONArray("pending")
    assertEquals(1, pending.length())
    val task = pending.getJSONObject(0).getJSONObject("entity").getJSONObject("data")
    assertTrue(task.getBoolean("completed"))
    assertEquals("morning", task.getJSONObject("scheduling").getString("slotId"))
    assertEquals(0, store.projection(account)!!.getJSONArray("views").getJSONObject(0).getJSONArray("tasks").length())
    assertFalse(store.compareAndSwap(account, 1, saved.getJSONObject("state").toString(), null))
    store.clear(account)
    store.setProfile(null)
  }
  @Test fun acknowledgementPreservesEditsCreatedDuringTheRequest() {
    val (store, account) = seed()
    store.complete(account, "widget-task")
    val before = store.load(account)!!
    val state = before.getJSONObject("state")
    val accepted = state.getJSONArray("pending").getJSONObject(0)
    val newer = JSONObject(accepted.toString()).put("id", "newer")
    newer.getJSONObject("entity").getJSONObject("data").put("title", "Новое название")
    state.getJSONArray("pending").put(newer)
    assertTrue(store.compareAndSwap(account, before.getInt("version"), state.toString(), store.projection(account).toString()))
    store.accept(account, JSONObject().put("acknowledged", JSONArray().put(accepted.getString("id"))).put("conflicts", JSONArray()).put("changes", JSONArray().put(JSONObject().put("document", accepted.getJSONObject("entity")).put("revision", 2))).put("cursor", 2).put("hasMore", false).put("widget", JSONObject.NULL))
    val pending = store.load(account)!!.getJSONObject("state").getJSONArray("pending")
    assertEquals(1, pending.length())
    assertEquals("newer", pending.getJSONObject(0).getString("id"))
    store.setProfile(null)
    assertFalse(store.compareAndSwap(account, store.load(account)!!.getInt("version"), state.toString(), null))
    store.clear(account)
  }
}
