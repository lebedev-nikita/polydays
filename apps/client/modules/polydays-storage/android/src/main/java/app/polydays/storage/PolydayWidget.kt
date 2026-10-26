package app.polydays.storage

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class PolydayWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { refresh(context); SyncWorker.schedule(context) }
  override fun onAppWidgetOptionsChanged(context: Context, manager: AppWidgetManager, id: Int, options: android.os.Bundle) { refresh(context) }
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action == REFRESH) { refresh(context); SyncWorker.schedule(context); return }
    if (intent.action == MODE || intent.action == MENU) {
      val id = intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, AppWidgetManager.INVALID_APPWIDGET_ID)
      if (id == AppWidgetManager.INVALID_APPWIDGET_ID) return
      val preferences = context.getSharedPreferences("widget", Context.MODE_PRIVATE).edit()
      if (intent.action == MODE) preferences.putBoolean("all:$id", intent.getBooleanExtra("all", false)).putBoolean("menu:$id", false)
      else preferences.putBoolean("menu:$id", !menuOpen(context, id))
      preferences.apply()
      refresh(context)
      return
    }
    if (intent.action != ACTION) return
    val account = intent.getStringExtra("account") ?: return
    if (Store(context).profile()?.getString("id") != account) return
    val destination = intent.getStringExtra("destination")
    if (destination != null) {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
      launch.action = Intent.ACTION_VIEW
      launch.data = Uri.parse(destination)
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      context.startActivity(launch)
      return
    }
    val task = intent.getStringExtra("task") ?: return
    if (!intent.getBooleanExtra("complete", false)) {
      val launch = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
      launch.action = Intent.ACTION_VIEW
      launch.data = Uri.parse("polydays://task/${Uri.encode(task)}")
      launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
      context.startActivity(launch)
      return
    }
    val pending = goAsync()
    executor.execute {
      try { Store(context).complete(account, task); refresh(context); SyncWorker.schedule(context) }
      finally { pending.finish() }
    }
  }
  override fun onDeleted(context: Context, ids: IntArray) {
    val preferences = context.getSharedPreferences("widget", Context.MODE_PRIVATE).edit()
    ids.forEach { preferences.remove("all:$it").remove("menu:$it") }
    preferences.apply()
  }
  companion object {
    const val ACTION = "app.polydays.storage.WIDGET_TASK"
    const val REFRESH = "app.polydays.storage.WIDGET_REFRESH"
    const val MODE = "app.polydays.storage.WIDGET_MODE"
    const val MENU = "app.polydays.storage.WIDGET_MENU"
    fun showAll(context: Context, id: Int): Boolean = context.getSharedPreferences("widget", Context.MODE_PRIVATE).getBoolean("all:$id", false)
    internal fun menuOpen(context: Context, id: Int): Boolean = context.getSharedPreferences("widget", Context.MODE_PRIVATE).getBoolean("menu:$id", false)
    internal fun modeViews(context: Context, id: Int, all: Boolean): RemoteViews {
      val root = RemoteViews(context.packageName, R.layout.polydays_widget)
      val expanded = menuOpen(context, id)
      root.setViewVisibility(R.id.polyday_mode_menu, if (expanded) View.VISIBLE else View.GONE)
      val width = AppWidgetManager.getInstance(context).getAppWidgetOptions(id).getInt(AppWidgetManager.OPTION_APPWIDGET_MIN_WIDTH, 300)
      root.setInt(R.id.polyday_title, "setMaxWidth", ((maxOf(width, 250) - 154) * context.resources.displayMetrics.density).toInt())
      val menu = Intent(context, PolydayWidget::class.java).setAction(MENU)
        .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).setData(Uri.parse("polydays-widget://menu/$id"))
      root.setOnClickPendingIntent(R.id.polyday_selector, PendingIntent.getBroadcast(context, id, menu, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      root.setContentDescription(R.id.polyday_selector, "Выбрать список: " + (if (all) "Все полидни" else "Текущий полидень") + if (expanded) ", меню открыто" else "")
      for ((control, selected) in listOf(R.id.polyday_mode_current to !all, R.id.polyday_mode_all to all)) {
        root.setTextColor(control, Color.parseColor(if (selected) "#B9382E" else "#66645F"))
        root.setInt(control, "setBackgroundResource", if (selected) R.drawable.polydays_widget_mode else R.drawable.polydays_widget_pressed)
        root.setContentDescription(control, (if (control == R.id.polyday_mode_all) "Все полидни" else "Текущий полидень") + if (selected) ", выбран" else "")
        val mode = Intent(context, PolydayWidget::class.java).setAction(MODE)
          .putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).putExtra("all", control == R.id.polyday_mode_all)
          .setData(Uri.parse("polydays-widget://mode/$id/$control"))
        root.setOnClickPendingIntent(control, PendingIntent.getBroadcast(context, id, mode, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
      }
      return root
    }
    private val executor = Executors.newSingleThreadExecutor()
    internal fun subtitle(value: String): String {
      val parts = value.split(" · ", limit = 2)
      if (parts.size != 2) return value
      val date = runCatching { SimpleDateFormat("yyyy-MM-dd", Locale.ROOT).apply { isLenient = false }.parse(parts[0]) }.getOrNull() ?: return value
      return SimpleDateFormat("d MMM", Locale("ru")).format(date) + " · " + parts[1]
    }
    fun view(store: Store, account: String): JSONObject? {
      val projection = store.projection(account) ?: return null
      val now = System.currentTimeMillis()
      val views = projection.getJSONArray("views").objects()
      return views.firstOrNull { it.getLong("from") <= now && now < it.getLong("until") } ?: views.lastOrNull()
    }
    fun refresh(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val store = Store(context)
      val account = store.profile()?.getString("id")
      val view = account?.let { view(store, it) }
      for (id in manager.getAppWidgetIds(ComponentName(context, PolydayWidget::class.java))) {
        val all = showAll(context, id)
        val root = modeViews(context, id, all)
        root.setTextViewText(R.id.polyday_title, if (all) "Все полидни" else view?.getString("title") ?: "Polydays")
        root.setTextViewText(R.id.polyday_subtitle, view?.getString("subtitle")?.let(::subtitle) ?: "Откройте приложение")
        root.setViewVisibility(R.id.polyday_subtitle, if (all) View.GONE else View.VISIBLE)
        val state = account?.let { store.load(it)?.getJSONObject("state") }
        val projection = account?.let { store.projection(it) }
        val updated = projection?.optLong("generatedAt") ?: 0
        val status = when {
          store.transportStatus() == "needs-login" -> "Войдите снова для синхронизации"
          (state?.getJSONArray("conflicts")?.length() ?: 0) > 0 -> "Есть конфликт · откройте приложение"
          (state?.getJSONArray("pending")?.length() ?: 0) > 0 -> "Сохранено на устройстве"
          projection != null && projection.getLong("validUntil") < System.currentTimeMillis() -> "Откройте для обновления полидней"
          updated > 0 -> ""
          else -> "Войдите в приложение"
        }
        val freshness = if (updated > 0) "Обновлено " + SimpleDateFormat("HH:mm", Locale.getDefault()).format(Date(updated)) else ""
        root.setTextViewText(R.id.polyday_updated, freshness)
        root.setViewVisibility(R.id.polyday_updated, if (freshness.isEmpty()) View.GONE else View.VISIBLE)
        root.setTextViewText(R.id.polyday_status, status)
        root.setViewVisibility(R.id.polyday_status, if (status.isEmpty()) View.GONE else View.VISIBLE)
        val open = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (open != null) {
          fun launch(uri: String) = PendingIntent.getActivity(context, id, Intent(open).apply {
            action = Intent.ACTION_VIEW
            data = Uri.parse(uri)
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
          }, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE)
          root.setOnClickPendingIntent(R.id.polyday_empty, launch(if (all) "polydays://upcoming" else "polydays://current"))
          root.setOnClickPendingIntent(R.id.polyday_add, launch("polydays://current?addTask=1"))
        }
        val refresh = Intent(context, PolydayWidget::class.java).setAction(REFRESH)
        root.setOnClickPendingIntent(R.id.polyday_refresh, PendingIntent.getBroadcast(context, id, refresh, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
        val service = Intent(context, PolydayRows::class.java).putExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, id).apply { data = Uri.parse("polydays-widget://rows/$id") }
        root.setRemoteAdapter(R.id.polyday_list, service)
        root.setEmptyView(R.id.polyday_list, R.id.polyday_empty)
        val template = Intent(context, PolydayWidget::class.java).setAction(ACTION).putExtra("account", account).apply { data = Uri.parse("polydays-widget://action/$id") }
        root.setPendingIntentTemplate(R.id.polyday_list, PendingIntent.getBroadcast(context, id, template, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_MUTABLE))
        manager.updateAppWidget(id, root)
        manager.notifyAppWidgetViewDataChanged(id, R.id.polyday_list)
      }
    }
  }
}

class PolydayRows : RemoteViewsService() {
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = Rows(applicationContext, intent.getIntExtra(AppWidgetManager.EXTRA_APPWIDGET_ID, 0))
  internal data class Row(val id: String, val title: String = "", val detail: String = "", val destination: String? = null, val task: JSONObject? = null, val dateHeading: Boolean = false)
  internal class Rows(private val context: Context, private val widgetId: Int = 0) : RemoteViewsFactory {
    private var rows = emptyList<Row>()
    override fun onCreate() { onDataSetChanged() }
    override fun onDestroy() {}
    override fun onDataSetChanged() {
      val store = Store(context)
      val account = store.profile()?.getString("id")
      val current = account?.let { PolydayWidget.view(store, it) }
      val now = System.currentTimeMillis()
      val currentTasks = current?.getJSONArray("tasks")?.objects()?.filter { it.optLong("visibleFrom", 0) <= now } ?: emptyList()
      if (!PolydayWidget.showAll(context, widgetId) || current == null) {
        rows = currentTasks.map { Row(it.getString("id"), task = it) }
        return
      }
      if (!current.has("date")) {
        rows = listOf(Row("upgrade", "Откройте приложение", "Обновите данные полидней", "polydays://current"))
        return
      }
      val date = current.getString("date")
      val days = store.projection(account!!)!!.getJSONArray("views").objects().filter { it.optString("date") == date }
      val assignedIds = days.flatMap { it.getJSONArray("tasks").objects().filter { task -> task.optBoolean("assigned") } }.map { it.getString("id") }.toSet()
      val overdue = currentTasks.filter { !assignedIds.contains(it.getString("id")) }
      rows = buildList {
        if (overdue.isNotEmpty()) {
          add(Row("overdue", "Просрочено", "${overdue.size} · из прошлых суток"))
          addAll(overdue.map { Row(it.getString("id"), task = it) })
        }
        add(Row("date:$date", PolydayWidget.subtitle("$date · ").substringBefore(" · "), "${assignedIds.size} ${taskWord(assignedIds.size)}", dateHeading = true))
        for (day in days) {
          val tasks = day.getJSONArray("tasks").objects().filter { it.optBoolean("assigned") }
          val detail = day.getString("time") + if (tasks.isEmpty()) " · Нет задач" else ""
          val path = day.getString("id").split("/")
          val destination = "polydays://day/${Uri.encode(path[0])}/${Uri.encode(path[1])}"
          add(Row("heading:${day.getString("id")}", day.getString("title"), detail, destination))
          addAll(tasks.map { Row(it.getString("id"), task = it) })
        }
      }
    }
    private fun taskWord(count: Int): String = when { count % 100 in 11..14 -> "задач"; count % 10 == 1 -> "задача"; count % 10 in 2..4 -> "задачи"; else -> "задач" }
    override fun getCount() = rows.size
    override fun getViewAt(position: Int): RemoteViews? {
      val item = rows.getOrNull(position) ?: return null
      val task = item.task
      if (task == null) {
        val heading = RemoteViews(context.packageName, R.layout.polydays_widget_heading)
        heading.setTextViewText(R.id.heading_title, item.title)
        heading.setTextViewText(R.id.heading_detail, item.detail)
        heading.setTextViewTextSize(R.id.heading_title, android.util.TypedValue.COMPLEX_UNIT_SP, if (item.dateHeading) 15f else 13f)
        heading.setOnClickFillInIntent(R.id.heading_row, Intent().apply { if (item.destination != null) putExtra("destination", item.destination) })
        return heading
      }
      val row = RemoteViews(context.packageName, R.layout.polydays_widget_row)
      val deadline = if (task.isNull("deadline")) "" else task.getString("deadline")
      val overdue = task.optBoolean("overdue") || (!task.isNull("expiresAt") && task.getLong("expiresAt") < System.currentTimeMillis())
      row.setTextViewText(R.id.task_title, task.getString("title"))
      val origin = task.optString("origin", task.getJSONObject("task").getJSONObject("scheduling").optString("date", ""))
      row.setTextViewText(R.id.task_meta, listOf(if (overdue) "Просрочено" else "", if (overdue) origin else "", deadline).filter { it.isNotEmpty() }.joinToString(" · "))
      row.setViewVisibility(R.id.task_meta, if (overdue || deadline.isNotEmpty()) View.VISIBLE else View.GONE)
      row.setTextColor(R.id.task_meta, Color.parseColor(if (overdue) "#b9382e" else "#66645f"))
      row.setImageViewResource(R.id.task_check, when(task.getInt("priority")) { 1 -> R.drawable.polydays_priority_1; 2 -> R.drawable.polydays_priority_2; 3 -> R.drawable.polydays_priority_3; else -> R.drawable.polydays_priority_4 })
      val base = Intent().putExtra("task", task.getString("id"))
      row.setOnClickFillInIntent(R.id.task_text, Intent(base).putExtra("complete", false))
      row.setOnClickFillInIntent(R.id.task_check, Intent(base).putExtra("complete", true))
      row.setContentDescription(R.id.task_check, "Завершить: " + task.getString("title"))
      return row
    }
    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount() = 2
    override fun getItemId(position: Int) = rows.getOrNull(position)?.id?.hashCode()?.toLong() ?: 0L
    override fun hasStableIds() = true
  }
}
