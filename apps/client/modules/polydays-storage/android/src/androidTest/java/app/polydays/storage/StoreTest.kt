package app.polydays.storage

import android.appwidget.AppWidgetManager
import android.content.Context
import android.content.Intent
import android.widget.TextView
import android.view.View
import android.view.ViewGroup
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Rect
import java.io.File
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
  @Test fun widgetRowsTolerateStalePositionsAfterCompletion() {
    val (store, account) = seed()
    try {
      val rows = PolydayRows.Rows(context)
      rows.onCreate()
      assertEquals(1, rows.getCount())
      store.complete(account, "widget-task")
      rows.onDataSetChanged()
      assertEquals(0, rows.getCount())
      // A launcher can still request a position from the list before notifyDataSetChanged.
      assertNull(rows.getViewAt(0))
      rows.getItemId(0)
    } finally {
      store.clear(account)
      store.setProfile(null)
    }
  }
  @Test fun allPolydaysShowsFutureTasksOnceAndCompletesThemOffline() {
    val (store, account) = seed()
    val widgetId = 77
    context.getSharedPreferences("widget", Context.MODE_PRIVATE).edit().putBoolean("all:$widgetId", false).putBoolean("menu:$widgetId", false).commit()
    try {
      val now = System.currentTimeMillis()
      val date = "2026-10-26"
      fun task(id: String, title: String, assigned: Boolean, priority: Int): JSONObject {
        val data = JSONObject(store.load(account)!!.getJSONObject("state").getJSONArray("records").getJSONObject(0).getJSONObject("document").getJSONObject("data").toString()).put("id", id).put("title", title)
        data.getJSONObject("scheduling").put("date", if (id == "old-task") "2026-10-25" else date).put("slotId", if (id == "old-task") "night" else id.substringBefore("-task"))
        return JSONObject().put("id", id).put("title", title).put("assigned", assigned).put("priority", priority).put("deadline", JSONObject.NULL).put("expiresAt", JSONObject.NULL).put("overdue", false).put("visibleFrom", 0).put("origin", "25 октября · Вечерний").put("task", data)
      }
      val morning = task("morning-task", "Подготовить план новой версии", true, 1)
      val afternoon = task("afternoon-task", "Обсудить макеты с Сашей", true, 3)
      val night = task("night-task", "Прочитать главу книги", true, 4)
      val old = task("old-task", "Разобрать фотографии", false, 2).put("overdue", true)
      val views = JSONArray()
      for ((index, slot) in listOf("morning", "afternoon", "night").withIndex()) {
        val tasks = JSONArray().put(listOf(morning, afternoon, night)[index])
        if (index == 0) tasks.put(old)
        else tasks.put(JSONObject(morning.toString()).put("assigned", false).put("visibleFrom", now + 3600000))
        views.put(JSONObject().put("id", "$date/$slot").put("date", date).put("title", listOf("Утренний", "Дневной", "Вечерний")[index]).put("time", listOf("06:00–12:00", "12:30–18:30", "19:00–02:00 · +1 день")[index]).put("subtitle", "$date · 06:00–12:00").put("from", if (index == 0) 0 else now + index * 3600000).put("until", if (index == 2) Long.MAX_VALUE else now + (index + 1) * 3600000).put("tasks", tasks))
      }
      val saved = store.load(account)!!
      assertTrue(store.compareAndSwap(account, saved.getInt("version"), saved.getJSONObject("state").toString(), JSONObject().put("generatedAt", now).put("validUntil", Long.MAX_VALUE).put("views", views).toString()))
      val current = PolydayRows.Rows(context, widgetId)
      current.onCreate()
      assertEquals(2, current.getCount())
      PolydayWidget().onReceive(context, Intent().setAction(PolydayWidget.MENU).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId))
      assertTrue(PolydayWidget.menuOpen(context, widgetId))
      assertFalse(PolydayWidget.menuOpen(context, widgetId + 1))
      InstrumentationRegistry.getInstrumentation().runOnMainSync {
        val prepared = PolydayWidget.modeViews(context, widgetId, false)
        prepared.setTextViewText(R.id.polyday_title, "Утренний")
        prepared.setTextViewText(R.id.polyday_status, "Сохранено на устройстве")
        prepared.setViewVisibility(R.id.polyday_status, View.VISIBLE)
        prepared.setTextViewText(R.id.polyday_updated, "Обновлено 22:45")
        val widget = prepared.apply(context, null) as ViewGroup
        assertEquals(View.VISIBLE, widget.findViewById<View>(R.id.polyday_mode_menu).visibility)
        val density = context.resources.displayMetrics.density
        widget.measure(View.MeasureSpec.makeMeasureSpec((250 * density).toInt(), View.MeasureSpec.EXACTLY), View.MeasureSpec.makeMeasureSpec((180 * density).toInt(), View.MeasureSpec.EXACTLY))
        widget.layout(0, 0, widget.measuredWidth, widget.measuredHeight)
        for (id in listOf(R.id.polyday_mode_current, R.id.polyday_mode_all)) {
          val option = widget.findViewById<View>(id)
          val visible = Rect()
          assertTrue(option.getGlobalVisibleRect(visible))
          assertEquals(option.height, visible.height())
          val bounds = Rect(0, 0, option.width, option.height)
          widget.offsetDescendantRectToMyCoords(option, bounds)
          assertTrue(bounds.top >= (48 * density).toInt() && bounds.bottom <= widget.height)
        }
        if (InstrumentationRegistry.getArguments().getString("keepWidgetFixture") == "true") {
          val bitmap = Bitmap.createBitmap(widget.width, widget.height, Bitmap.Config.ARGB_8888)
          widget.draw(Canvas(bitmap))
          File(context.getExternalFilesDir(null), "widget-menu-compact.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }
          bitmap.recycle()
        }
      }
      PolydayWidget().onReceive(context, Intent().setAction(PolydayWidget.MODE).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, widgetId).putExtra("all", true))
      assertFalse(PolydayWidget.menuOpen(context, widgetId))
      assertTrue(PolydayWidget.showAll(context, widgetId))
      assertFalse(PolydayWidget.showAll(context, widgetId + 1))
      val all = PolydayRows.Rows(context, widgetId)
      all.onCreate()
      assertEquals(9, all.getCount())
      InstrumentationRegistry.getInstrumentation().runOnMainSync {
        for (showAll in listOf(false, true)) {
          val widget = PolydayWidget.modeViews(context, widgetId, showAll).apply(context, null)
          val selected = widget.findViewById<TextView>(if (showAll) R.id.polyday_mode_all else R.id.polyday_mode_current)
          assertTrue(selected.contentDescription.toString().endsWith(", выбран"))
          assertEquals(View.GONE, widget.findViewById<View>(R.id.polyday_mode_menu).visibility)
        }
        val dateRow = all.getViewAt(2)!!.apply(context, null)
        assertEquals("26 окт.", dateRow.findViewById<TextView>(R.id.heading_title).text.toString())
        assertEquals("3 задачи", dateRow.findViewById<TextView>(R.id.heading_detail).text.toString())
        val futureRow = all.getViewAt(6)!!.apply(context, null)
        assertEquals("Обсудить макеты с Сашей", futureRow.findViewById<TextView>(R.id.task_title).text.toString())
      }
      store.complete(account, "afternoon-task")
      all.onDataSetChanged()
      assertEquals(8, all.getCount())
      assertEquals(1, store.load(account)!!.getJSONObject("state").getJSONArray("pending").length())
      assertEquals("afternoon", store.load(account)!!.getJSONObject("state").getJSONArray("pending").getJSONObject(0).getJSONObject("entity").getJSONObject("data").getJSONObject("scheduling").getString("slotId"))
      assertEquals(0, store.projection(account)!!.getJSONArray("views").getJSONObject(1).getJSONArray("tasks").objects().count { it.getString("id") == "afternoon-task" })
    } finally {
      if (InstrumentationRegistry.getArguments().getString("keepWidgetFixture") != "true") {
        store.clear(account)
        store.setProfile(null)
        context.getSharedPreferences("widget", Context.MODE_PRIVATE).edit().remove("all:$widgetId").remove("menu:$widgetId").apply()
      }
    }
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
