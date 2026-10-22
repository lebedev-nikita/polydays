package app.polydays.storage

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.widget.RemoteViews
import android.widget.RemoteViewsService
import org.json.JSONObject
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.concurrent.Executors

class PolydayWidget : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, ids: IntArray) { refresh(context); SyncWorker.schedule(context) }
  override fun onReceive(context: Context, intent: Intent) {
    super.onReceive(context, intent)
    if (intent.action != ACTION) return
    val account = intent.getStringExtra("account") ?: return
    if (Store(context).profile()?.getString("id") != account) return
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
  companion object {
    const val ACTION = "app.polydays.storage.WIDGET_TASK"
    private val executor = Executors.newSingleThreadExecutor()
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
        val root = RemoteViews(context.packageName, R.layout.polydays_widget)
        root.setTextViewText(R.id.polyday_title, view?.getString("title") ?: "Polydays")
        root.setTextViewText(R.id.polyday_subtitle, view?.getString("subtitle") ?: "Откройте приложение и настройте расписание")
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
        root.setTextViewText(R.id.polyday_status, listOf(status, freshness).filter { it.isNotEmpty() }.joinToString(" · "))
        val open = context.packageManager.getLaunchIntentForPackage(context.packageName)
        if (open != null) root.setOnClickPendingIntent(R.id.polyday_header, PendingIntent.getActivity(context, id, open, PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE))
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
  override fun onGetViewFactory(intent: Intent): RemoteViewsFactory = Rows(applicationContext)
  private class Rows(private val context: Context) : RemoteViewsFactory {
    private var tasks = emptyList<JSONObject>()
    override fun onCreate() { onDataSetChanged() }
    override fun onDestroy() {}
    override fun onDataSetChanged() {
      val store = Store(context)
      tasks = store.profile()?.getString("id")?.let { PolydayWidget.view(store, it)?.getJSONArray("tasks")?.objects()?.filter { task -> task.optLong("visibleFrom", 0) <= System.currentTimeMillis() } } ?: emptyList()
    }
    override fun getCount() = tasks.size
    override fun getViewAt(position: Int): RemoteViews {
      val task = tasks[position]
      val row = RemoteViews(context.packageName, R.layout.polydays_widget_row)
      val deadline = if (task.isNull("deadline")) "" else task.getString("deadline")
      val overdue = task.optBoolean("overdue") || (!task.isNull("expiresAt") && task.getLong("expiresAt") < System.currentTimeMillis())
      row.setTextViewText(R.id.task_title, task.getString("title"))
      val origin = task.optString("origin", task.getJSONObject("task").getJSONObject("scheduling").optString("date", ""))
      row.setTextViewText(R.id.task_meta, listOf(if (overdue) "Просрочено" else "", if (overdue) origin else "", deadline).filter { it.isNotEmpty() }.joinToString(" · "))
      row.setTextColor(R.id.task_meta, Color.parseColor(if (overdue) "#b9382e" else "#66645f"))
      row.setImageViewResource(R.id.task_check, when(task.getInt("priority")) { 1 -> R.drawable.polydays_priority_1; 2 -> R.drawable.polydays_priority_2; 3 -> R.drawable.polydays_priority_3; else -> R.drawable.polydays_priority_4 })
      val base = Intent().putExtra("task", task.getString("id"))
      row.setOnClickFillInIntent(R.id.task_text, Intent(base).putExtra("complete", false))
      row.setOnClickFillInIntent(R.id.task_check, Intent(base).putExtra("complete", true))
      row.setContentDescription(R.id.task_check, "Завершить: " + task.getString("title"))
      return row
    }
    override fun getLoadingView(): RemoteViews? = null
    override fun getViewTypeCount() = 1
    override fun getItemId(position: Int) = tasks[position].getString("id").hashCode().toLong()
    override fun hasStableIds() = true
  }
}
