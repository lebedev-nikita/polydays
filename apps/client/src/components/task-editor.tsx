import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentRef,
  type RefObject,
} from "react";
import {
  Modal,
  Keyboard,
  Platform,
  Pressable,
  ScrollView,
  type ScrollViewProps,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import {
  X,
  Flag,
  Repeat2,
  CalendarDays,
  Plus,
  ArrowUp,
  ArrowLeft,
  Inbox,
  Check,
  ArrowDown,
  Trash2,
  MoreVertical,
  ChevronRight,
  AlignLeft,
  Pencil,
} from "lucide-react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { documents } from "@polydays/sync";
import * as Crypto from "expo-crypto";
import {
  activeVersion,
  addDays,
  dateAt,
  polydaysOn,
  ruleForDate,
  systemNow,
  parseTaskTitle,
  type Recurrence,
  type Scheduling,
  type Series,
  type Task,
} from "@polydays/core";
import { useApp } from "./provider";
import { Button, ErrorMessage, colors, priorityName } from "./primitives";
import { message } from "../data/store";
import { DateControl } from "./schedule-controls";
import { TimeField } from "./time-field";
import { normalizeTimeInput } from "./time-input";
import { timeZoneLabel } from "./schedule-options";
import { KeyboardAvoidingView } from "./keyboard";
import { PropertyMenu } from "./property-menu";
import { TaskScheduleMenu } from "./task-schedule-menu";
import { TaskCompletion } from "./task-completion";

const days = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
export type TaskFormProps = {
  readonly initialPanel?: "schedule";
  readonly scheduling: Scheduling;
  readonly task?: Task;
  readonly onClose: () => void;
  readonly editSeries?: boolean;
  readonly closeRequest?: RefObject<(() => void) | null>;
  readonly maxHeight?: number;
  readonly onSwitchSeries?: () => void;
  readonly inline?: boolean;
  readonly sheet?: boolean;
  readonly textEditing?: boolean;
  readonly onEditText?: () => void;
  readonly onFinishTextEditing?: () => void;
  readonly onComplete?: () => Promise<void>;
  readonly changeRequest?: RefObject<((action: () => void) => void) | null>;
  readonly onDelete?: () => Promise<void>;
  readonly onReorder?: (direction: -1 | 1) => Promise<void>;
};

export function TaskComposer({
  visible,
  onClose,
  scheduling,
}: {
  visible: boolean;
  onClose: () => void;
  scheduling: Scheduling;
}) {
  const closeRequest = useRef<(() => void) | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const mobile = width < 600;
  const maxHeight = height - (mobile ? insets.top + insets.bottom + 24 : 64);
  // Restore web focus before a task in the underlying list can be opened.
  if (Platform.OS === "web" && !visible) return null;
  return (
    <Modal
      accessibilityLabel="Новая задача"
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={() => closeRequest.current?.()}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: mobile ? "flex-end" : "center",
          backgroundColor: "rgba(0, 0, 0, 0.3)",
          paddingHorizontal: mobile ? 8 : 16,
          paddingTop: mobile ? insets.top + 24 : 32,
          paddingBottom: mobile ? insets.bottom + 8 : 32,
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Закрыть добавление задачи"
          onPress={() => closeRequest.current?.()}
          style={{ position: "absolute", inset: 0 }}
        />
        <View
          className="w-full max-w-[560px]"
          style={{
            maxHeight,
            flexShrink: 1,
            borderRadius: mobile ? 24 : 16,
          }}
        >
          {visible && (
            <TaskForm
              scheduling={scheduling}
              onClose={onClose}
              closeRequest={closeRequest}
              maxHeight={maxHeight}
            />
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Inline fields belong to the list's keyboard-aware scroll view. A nested
// ScrollView would hide them from its focused-input tracking.
function InlineFormContent({ children, contentContainerStyle }: ScrollViewProps) {
  return <View style={contentContainerStyle}>{children}</View>;
}

export function TaskForm({
  initialPanel,
  scheduling,
  task,
  onClose,
  editSeries = false,
  closeRequest,
  maxHeight,
  onSwitchSeries,
  inline = false,
  sheet = false,
  textEditing = false,
  onEditText,
  onFinishTextEditing,
  onComplete,
  changeRequest,
  onDelete,
  onReorder,
}: TaskFormProps) {
  const { store, calendar, series, now } = useApp();
  const FormContent = inline ? InlineFormContent : ScrollView;
  const titleRef = useRef<ComponentRef<typeof TextInput>>(null);
  const formRef = useRef<ComponentRef<typeof View>>(null);
  const descriptionRef = useRef<ComponentRef<typeof TextInput>>(null);
  const titleId = useId();
  const zone = calendar ? activeVersion(calendar, now).timeZone : "UTC";
  const today = dateAt(now, zone);
  const sourceSeries = editSeries ? series.find((item) => item.id === task?.seriesId) : undefined;
  const seriesRule = sourceSeries
    ? (ruleForDate(sourceSeries, addDays(today, 1)) ?? sourceSeries.rules[0])
    : undefined;
  const [title, setTitle] = useState(seriesRule?.title ?? task?.title ?? "");
  const [description, setDescription] = useState(
    seriesRule?.description ?? task?.description ?? "",
  );
  const [priority, setPriority] = useState<1 | 2 | 3 | 4>(
    seriesRule?.priority ?? task?.priority ?? 4,
  );
  const initial = task?.scheduling ?? scheduling;
  const [kind, setKind] = useState<Scheduling["kind"]>(initial.kind);
  const [date, setDate] = useState(initial.kind === "backlog" ? today : initial.date);
  const initialSlots = calendar ? activeVersion(calendar, now).slots : [];
  const [slotId, setSlotId] = useState(
    seriesRule?.recurrence.kind === "polyday"
      ? seriesRule.recurrence.slotId
      : initial.kind === "polyday"
        ? initial.slotId
        : (initialSlots[0]?.id ?? ""),
  );
  const [time, setTime] = useState(
    seriesRule?.recurrence.kind === "time"
      ? seriesRule.recurrence.time
      : initial.kind === "deadline"
        ? initial.time
        : "09:00",
  );
  const [repeat, setRepeat] = useState<"none" | "every-polyday" | "polyday" | "time">(
    seriesRule?.recurrence.kind ?? "none",
  );
  const [weekdays, setWeekdays] = useState<ReadonlyArray<number>>(
    seriesRule && seriesRule.recurrence.kind !== "every-polyday"
      ? seriesRule.recurrence.weekdays
      : [],
  );
  const [startDate, setStartDate] = useState(
    seriesRule?.startDate ?? (initial.kind === "backlog" ? today : initial.date),
  );
  const [endDate, setEndDate] = useState(seriesRule?.endDate ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDescription, setShowDescription] = useState(!!task?.description);
  const [openProperty, setOpenProperty] = useState<
    "schedule" | "priority" | "repeat" | "actions" | null
  >(initialPanel ?? null);
  const propertySnapshot = useRef({
    kind,
    date,
    slotId,
    time,
    repeat,
    weekdays,
    startDate,
    endDate,
  });
  const shortcut = useRef<"priority" | "schedule" | null>(null);
  const openPanel = (panel: typeof openProperty) => {
    if (sheet) Keyboard.dismiss();
    if (openProperty === panel) {
      setOpenProperty(null);
      return;
    }
    propertySnapshot.current = { kind, date, slotId, time, repeat, weekdays, startDate, endDate };
    shortcut.current = null;
    setOpenProperty(panel);
  };
  const dismissPanel = () => {
    if (openProperty === "repeat") {
      const previous = propertySnapshot.current;
      setKind(previous.kind);
      setDate(previous.date);
      setSlotId(previous.slotId);
      setTime(previous.time);
      setRepeat(previous.repeat);
      setWeekdays(previous.weekdays);
      setStartDate(previous.startDate);
      setEndDate(previous.endDate);
    }
    setOpenProperty(null);
    shortcut.current = null;
    if (!sheet) titleRef.current?.focus();
  };
  const finishChoice = () => {
    if (shortcut.current) setTitle((value) => value.replace(/(?:!!|#)$/, "").trimEnd());
    shortcut.current = null;
    setOpenProperty(null);
    if (!sheet) titleRef.current?.focus();
  };
  useEffect(() => {
    if (!inline) return;
    const frame = requestAnimationFrame(() => titleRef.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [inline]);
  const [titleHeight, setTitleHeight] = useState(40);
  const [descriptionHeight, setDescriptionHeight] = useState(36);
  const { width: formWidth } = useWindowDimensions();
  useLayoutEffect(() => {
    if (Platform.OS !== "web") return;
    const input = titleRef.current as unknown as HTMLTextAreaElement | null;
    if (!input) return;
    const previousHeight = input.style.height;
    input.style.height = "auto";
    const height = Math.min(140, Math.max(40, input.scrollHeight));
    input.style.height = previousHeight;
    setTitleHeight(height);
  }, [title, formWidth, openProperty]);
  useLayoutEffect(() => {
    if (Platform.OS !== "web") return;
    const input = descriptionRef.current as unknown as HTMLTextAreaElement | null;
    if (!input) return;
    const previousHeight = input.style.height;
    input.style.height = "auto";
    const height = Math.min(112, Math.max(36, input.scrollHeight));
    input.style.height = previousHeight;
    setDescriptionHeight(height);
  }, [description, formWidth, openProperty]);
  const [confirmClose, setConfirmClose] = useState(false);
  const [confirmSwitch, setConfirmSwitch] = useState(false);
  const [touched, setTouched] = useState<ReadonlyArray<string>>([]);
  const saving = useRef(false);
  const propertyWrites = useRef(Promise.resolve());
  const pendingProperties = useRef(0);
  const snapshot = JSON.stringify({
    title,
    description,
  });
  const original = useRef(snapshot);
  const dirty = task ? original.current !== snapshot : !!(title || description);
  const pendingLeave = useRef(onClose);
  const requestLeave = (action: () => void, switching = false) => {
    if (saving.current) return;
    pendingLeave.current = action;
    setConfirmSwitch(switching);
    if (dirty) setConfirmClose(true);
    else action();
  };
  const requestClose = () => {
    if (saving.current) return;
    if (openProperty) return dismissPanel();
    if (textEditing && onFinishTextEditing) {
      Keyboard.dismiss();
      titleRef.current?.blur();
      descriptionRef.current?.blur();
      onFinishTextEditing();
      return;
    }
    requestLeave(onClose);
  };
  useEffect(() => {
    if (!closeRequest) return;
    closeRequest.current = requestClose;
    return () => {
      closeRequest.current = null;
    };
  });
  useEffect(() => {
    if (!changeRequest) return;
    changeRequest.current = requestLeave;
    return () => {
      changeRequest.current = null;
    };
  });
  useEffect(() => {
    if ((!inline && !sheet) || Platform.OS !== "web") return;
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      event.preventDefault();
      requestClose();
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  });
  const runAction = async (action: () => Promise<void>) => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (cause) {
      setError(message(cause));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  // Property commands preserve the saved text; the text fields remain a separate draft.
  const saveProperties = (
    patch: {
      priority?: Task["priority"];
      scheduling?: Scheduling;
      recurrence?: Recurrence;
      startDate?: string;
      endDate?: string | null;
    },
    apply: () => void,
  ) => {
    if (!task) {
      apply();
      return;
    }
    pendingProperties.current++;
    saving.current = true;
    setBusy(true);
    setError(null);
    propertyWrites.current = propertyWrites.current.then(async () => {
      try {
        const local = store.getSnapshot().local;
        const all = local ? documents(local) : [];
        const currentSeries =
          all
            .filter((item) => item.kind === "series")
            .find((item) => item.data.id === sourceSeries?.id)?.data ?? sourceSeries;
        const currentRule = currentSeries
          ? (ruleForDate(currentSeries, addDays(today, 1)) ?? currentSeries.rules[0])
          : undefined;
        if (currentSeries && currentRule) {
          const { scheduling: _, ...properties } = patch;
          const rule = { ...currentRule, ...properties, effectiveDate: addDays(today, 1) };
          await store.save(
            {
              kind: "series",
              data: {
                ...currentSeries,
                rules: [
                  ...currentSeries.rules.filter((item) => item.effectiveDate < rule.effectiveDate),
                  rule,
                ],
              },
            },
            { kind: "series", data: currentSeries },
          );
        } else {
          const currentTask =
            all.filter((item) => item.kind === "task").find((item) => item.data.id === task.id)
              ?.data ?? task;
          await store.save(
            {
              kind: "task",
              data: {
                ...currentTask,
                priority: patch.priority ?? currentTask.priority,
                scheduling: patch.scheduling ?? currentTask.scheduling,
              },
            },
            { kind: "task", data: currentTask },
          );
        }
        apply();
      } catch (cause) {
        setError(message(cause));
      } finally {
        pendingProperties.current--;
        if (!pendingProperties.current) {
          saving.current = false;
          setBusy(false);
        }
      }
    });
  };
  const choosePriority = (value: Task["priority"]) =>
    saveProperties({ priority: value }, () => {
      setPriority(value);
      finishChoice();
    });
  const errors: Record<string, string> = {};
  if (!title.trim()) errors.title = "Введите название задачи.";
  const checkDate = (key: string, value: string) => {
    if (!validDate(value)) errors[key] = "Выберите дату в календаре.";
  };
  if (repeat === "none" && kind !== "backlog") checkDate("date", date);
  if (repeat !== "none") {
    checkDate("startDate", startDate);
    if (endDate) checkDate("endDate", endDate);
    if (endDate && !errors.endDate && !errors.startDate && endDate < startDate)
      errors.endDate = "Окончание серии должно быть не раньше начала.";
  }
  const normalizedTime = normalizeTimeInput(time);
  if (((repeat === "none" && kind === "deadline") || repeat === "time") && normalizedTime === null)
    errors.time = "Введите время от 00:00 до 23:59.";
  const slotDate =
    repeat !== "none"
      ? editSeries && startDate < addDays(today, 1)
        ? addDays(today, 1)
        : startDate
      : date;
  const validSlotDate = validDate(slotDate);
  const slots =
    calendar && validSlotDate
      ? polydaysOn(calendar, slotDate).map((day) => ({
          id: day.slotId,
          name: day.name,
          start: day.startTime,
          end: day.endTime,
        }))
      : initialSlots;
  if ((repeat === "none" && kind === "polyday") || repeat === "polyday") {
    if (validSlotDate && !slots.some((slot) => slot.id === slotId))
      errors.slotId = "Выберите полидень из расписания на эту дату.";
  }
  const touch = (key: string) =>
    setTouched((previous) => (previous.includes(key) ? previous : [...previous, key]));
  const fieldError = (key: string) => (touched.includes(key) ? errors[key] : undefined);
  const submit = async () => {
    if (!calendar || saving.current) return;
    if (task && !dirty) {
      onClose();
      return;
    }
    const invalid = Object.keys(errors).filter((key) => !task || key === "title");
    if (invalid.length) {
      setTouched(invalid);
      setError("Проверьте отмеченные поля.");
      if (invalid.some((key) => key !== "title"))
        openPanel(repeat !== "none" ? "repeat" : "schedule");
      if (errors.title) titleRef.current?.focus();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError(null);
    try {
      if (!title.trim()) throw new Error("Введите название задачи.");
      if (normalizedTime !== null) setTime(normalizedTime);
      const when: Scheduling =
        kind === "backlog"
          ? { kind }
          : kind === "polyday"
            ? { kind, date, slotId }
            : { kind, date, time: normalizedTime ?? time };
      if (repeat !== "none") {
        if (!task && endDate && endDate < startDate)
          throw new Error("Окончание серии должно быть не раньше начала.");
        const recurrence: Recurrence =
          repeat === "every-polyday"
            ? { kind: repeat }
            : repeat === "polyday"
              ? { kind: repeat, slotId, weekdays }
              : { kind: repeat, time: normalizedTime ?? time, weekdays };
        const rule = {
          priority,
          recurrence,
          startDate,
          endDate: endDate || null,
          ...(sourceSeries ? seriesRule : {}),
          effectiveDate: sourceSeries ? addDays(today, 1) : startDate,
          title: title.trim(),
          description,
        };
        const next: Series = {
          id: sourceSeries?.id ?? Crypto.randomUUID(),
          rules: [
            ...(sourceSeries?.rules.filter((item) => item.effectiveDate < rule.effectiveDate) ??
              []),
            rule,
          ],
          deleted: false,
          createdAt: sourceSeries?.createdAt ?? systemNow(),
        };
        await store.save(
          { kind: "series", data: next },
          sourceSeries ? { kind: "series", data: sourceSeries } : undefined,
        );
      } else {
        const next: Task = {
          id: task?.id ?? Crypto.randomUUID(),
          priority,
          order: task?.order ?? systemNow(),
          scheduling: when,
          completed: task?.completed ?? false,
          completedAt: task?.completedAt ?? null,
          deleted: task?.deleted ?? false,
          createdAt: task?.createdAt ?? systemNow(),
          seriesId: task?.seriesId ?? null,
          occurrenceDate: task?.occurrenceDate ?? null,
          ...task,
          title: title.trim(),
          description,
        };
        await store.save(
          { kind: "task", data: next },
          task ? { kind: "task", data: task } : undefined,
        );
      }
      onClose();
    } catch (cause) {
      setError(message(cause));
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const dateLabel = (value: string) =>
    value === today
      ? "Сегодня"
      : value === addDays(today, 1)
        ? "Завтра"
        : validDate(value)
          ? formatDate(value)
          : "Выберите дату";
  const scheduleLabel =
    kind === "backlog"
      ? "Входящие"
      : kind === "deadline"
        ? `${dateLabel(date)}, ${normalizedTime ?? time}`
        : `${dateLabel(date)} · ${slots.find((slot) => slot.id === slotId)?.name ?? "Полидень"}`;
  const repeatLabel =
    repeat === "none"
      ? "Один раз"
      : repeat === "every-polyday"
        ? "Каждый полидень"
        : `${weekdays.length ? weekdays.map((day) => days[day - 1]).join(", ") : "Ежедневно"} · ${repeat === "time" ? time : (slots.find((slot) => slot.id === slotId)?.name ?? "Полидень")}`;
  const panel = openProperty === "repeat";
  const acceptPanel = () => {
    const keys = ["startDate", "endDate", "slotId", "time"];
    const invalid = keys.filter((key) => errors[key]);
    if (invalid.length) {
      setTouched((previous) => [...new Set([...previous, ...invalid])]);
      return;
    }
    if (normalizedTime !== null) setTime(normalizedTime);
    saveProperties(
      repeat === "none"
        ? {}
        : {
            recurrence:
              repeat === "every-polyday"
                ? { kind: repeat }
                : repeat === "polyday"
                  ? { kind: repeat, slotId, weekdays }
                  : { kind: repeat, time: normalizedTime ?? time, weekdays },
            startDate,
            endDate: endDate || null,
          },
      () => {
        setOpenProperty(null);
        if (!sheet) titleRef.current?.focus();
      },
    );
  };
  const applyScheduling = (next: Scheduling) => {
    setKind(next.kind);
    if (next.kind !== "backlog") setDate(next.date);
    if (next.kind === "polyday") setSlotId(next.slotId);
    if (next.kind === "deadline") setTime(next.time);
  };
  const saveButton = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        busy
          ? "Сохраняем…"
          : editSeries
            ? "Сохранить серию"
            : task
              ? "Сохранить"
              : "Добавить задачу"
      }
      accessibilityState={{ disabled: busy || !title.trim() || confirmClose }}
      disabled={busy || !title.trim() || confirmClose}
      onPress={() => {
        void submit();
      }}
      className={
        task
          ? "min-h-12 min-w-20 items-center justify-center rounded-lg px-2 active:bg-selected"
          : `h-11 w-11 items-center justify-center rounded-lg ${busy || !title.trim() ? "bg-selected" : "bg-accent active:opacity-80"}`
      }
    >
      <View>
        {task ? (
          <Text
            className="text-sm font-semibold"
            style={{ color: busy || !title.trim() || confirmClose ? colors.muted : colors.accent }}
          >
            {busy ? "Сохраняем…" : "Сохранить"}
          </Text>
        ) : (
          <ArrowUp
            size={22}
            color={busy || !title.trim() ? colors.accent : "white"}
            strokeWidth={2.2}
          />
        )}
      </View>
    </Pressable>
  );
  const completion =
    task && onComplete && !editSeries ? (
      <TaskCompletion
        task={{ ...task, priority }}
        large={sheet}
        disabled={busy}
        onPress={() =>
          requestLeave(() => {
            void runAction(onComplete);
          })
        }
      />
    ) : null;
  const descriptionVisible = showDescription || !!description;
  const titleFields = (
    <View className={`min-w-0 flex-1 gap-1.5 ${sheet ? "" : "pr-9"}`}>
      <TextInput
        ref={titleRef}
        onFocus={onEditText}
        accessibilityLabel="Название задачи"
        aria-invalid={!!fieldError("title")}
        aria-describedby={fieldError("title") ? `${titleId}-error` : undefined}
        placeholder="Название задачи"
        placeholderTextColor="#77736d"
        underlineColorAndroid="transparent"
        autoFocus={!sheet}
        multiline
        submitBehavior="submit"
        blurOnSubmit={Platform.OS === "web" ? true : undefined}
        returnKeyType="done"
        value={title}
        maxLength={1000}
        onChangeText={(value) => {
          const parsed = parseTaskTitle(value);
          if (parsed.priority !== null) {
            setTitle(parsed.title);
            choosePriority(parsed.priority);
            shortcut.current = null;
            setOpenProperty(null);
            return;
          }
          setTitle(value);
          const trigger = /(?:^|\s)!!$/.test(value)
            ? "priority"
            : /(?:^|\s)#$/.test(value)
              ? "schedule"
              : null;
          if (trigger) {
            shortcut.current = trigger;
            setOpenProperty(trigger);
          } else if (shortcut.current) {
            shortcut.current = null;
            setOpenProperty(null);
          }
        }}
        onSubmitEditing={() => {
          void submit();
        }}
        numberOfLines={1}
        onContentSizeChange={
          Platform.OS === "web"
            ? undefined
            : (event) =>
                setTitleHeight(Math.min(140, Math.max(40, event.nativeEvent.contentSize.height)))
        }
        style={{
          height: titleHeight,
          fontSize: textEditing ? 20 : 18,
          lineHeight: textEditing ? 28 : 24,
        }}
        className="composer-field min-h-10 py-1 text-lg font-semibold leading-6 text-ink"
      />
      {fieldError("title") && (
        <Text
          nativeID={`${titleId}-error`}
          accessibilityRole="alert"
          className="text-sm text-accent"
        >
          {errors.title}
        </Text>
      )}
    </View>
  );
  const descriptionField = (
    <TextInput
      ref={descriptionRef}
      onFocus={onEditText}
      accessibilityLabel="Описание · необязательно"
      placeholder="Описание"
      placeholderTextColor={colors.muted}
      underlineColorAndroid="transparent"
      multiline
      numberOfLines={1}
      maxLength={20000}
      textAlignVertical="top"
      value={description}
      onChangeText={setDescription}
      onContentSizeChange={
        Platform.OS === "web"
          ? undefined
          : (event) =>
              setDescriptionHeight(
                Math.min(112, Math.max(36, event.nativeEvent.contentSize.height)),
              )
      }
      style={{
        height: descriptionHeight,
        fontSize: textEditing ? 16 : 14,
        lineHeight: textEditing ? 24 : 20,
      }}
      className="composer-field min-h-9 max-h-28 py-1 text-sm leading-5 text-ink"
    />
  );
  // Mount each shell with its final NativeWind styles when changing panels.
  return (
    <View
      key={panel ? "recurrence" : "task"}
      ref={formRef}
      testID={task ? "task-editor" : undefined}
      className={
        sheet
          ? "flex-1 min-h-0"
          : panel
            ? `overflow-hidden border border-line bg-white ${inline ? "" : "shadow-xl"}`
            : ""
      }
      style={{
        flexShrink: 1,
        minHeight: 0,
        maxHeight,
        borderRadius: sheet ? 0 : inline ? 12 : formWidth < 600 ? 24 : 16,
      }}
    >
      {panel && !inline && formWidth < 600 && (
        <View className="mt-2 h-1 w-9 self-center rounded-full bg-line" />
      )}
      {panel ? (
        <>
          <View className="flex-row items-center gap-2 px-3 py-2">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Отменить настройки"
              onPress={dismissPanel}
              className="h-12 w-12 items-center justify-center rounded-full active:bg-sidebar"
            >
              <ArrowLeft size={21} color={colors.ink} />
            </Pressable>
            <Text accessibilityRole="header" className="text-xl font-semibold text-ink">
              Повторение
            </Text>
          </View>
          <FormContent
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 12, gap: 12 }}
          >
            <View className="gap-3">
              <View
                accessibilityRole="radiogroup"
                accessibilityLabel="Правило повторения"
                className="flex-row flex-wrap gap-2"
              >
                {(
                  [
                    { value: "none", label: "Один раз" },
                    { value: "every-polyday", label: "Каждый полидень" },
                    { value: "polyday", label: "В выбранном полидне" },
                    { value: "time", label: "В точное время" },
                  ] as const
                )
                  .filter((item) => !editSeries || item.value !== "none")
                  .map((item) => (
                    <Pressable
                      accessibilityRole="radio"
                      aria-checked={repeat === item.value}
                      key={item.value}
                      onPress={() => {
                        if (
                          repeat === "none" &&
                          item.value !== "none" &&
                          kind !== "backlog" &&
                          validDate(date)
                        )
                          setStartDate(date);
                        setRepeat(item.value);
                      }}
                      className={`min-h-12 justify-center rounded-md border px-3 ${repeat === item.value ? "border-transparent bg-selected" : "border-transparent bg-sidebar"}`}
                    >
                      <Text className="text-sm text-ink">{item.label}</Text>
                    </Pressable>
                  ))}
              </View>

              {repeat === "polyday" && (
                <View className="gap-2">
                  <SlotChoices slots={slots} value={slotId} onChange={setSlotId} />
                  <ErrorMessage>{fieldError("slotId")}</ErrorMessage>
                </View>
              )}
              {repeat === "time" && (
                <View className="gap-2">
                  <View className="flex-row flex-wrap items-center gap-3">
                    <TimeField
                      hideLabel
                      label="Время дедлайна"
                      accessibilityLabel="Время дедлайна"
                      value={time}
                      onChange={setTime}
                      submitted={touched.includes("time")}
                    />
                    {zone !== Intl.DateTimeFormat().resolvedOptions().timeZone && (
                      <Text className="shrink text-xs text-muted">{timeZoneLabel(zone, now)}</Text>
                    )}
                  </View>
                </View>
              )}
              {(repeat === "polyday" || repeat === "time") && (
                <View className="gap-2">
                  <Text className="text-sm text-muted">
                    {weekdays.length ? "Дни недели" : "Каждый день"}
                  </Text>
                  {weekdays.length > 0 && (
                    <Button secondary onPress={() => setWeekdays([])}>
                      Каждый день
                    </Button>
                  )}
                  <View className="flex-row flex-wrap gap-1">
                    {days.map((name, index) => (
                      <Pressable
                        key={name}
                        accessibilityLabel={name}
                        accessibilityRole="checkbox"
                        aria-checked={weekdays.includes(index + 1)}
                        onPress={() =>
                          setWeekdays(
                            weekdays.includes(index + 1)
                              ? weekdays.filter((item) => item !== index + 1)
                              : [...weekdays, index + 1],
                          )
                        }
                        className={`h-12 min-w-12 items-center justify-center rounded-md px-2 ${weekdays.includes(index + 1) ? "bg-selected" : "bg-sidebar"}`}
                      >
                        <Text className="text-xs text-ink">{name}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              )}
              {repeat !== "none" && (
                <>
                  <DateControl
                    label="Начало серии"
                    value={startDate}
                    onChange={(value) => {
                      setStartDate(value);
                      touch("startDate");
                    }}
                    today={today}
                    error={fieldError("startDate")}
                  />
                  <DateControl
                    label="Окончание серии"
                    accessibilityLabel="Окончание серии · необязательно"
                    value={endDate}
                    onChange={(value) => {
                      setEndDate(value);
                      touch("endDate");
                    }}
                    today={today}
                    clearable
                    error={fieldError("endDate")}
                  />
                </>
              )}
              {editSeries && (
                <Text className="text-xs leading-5 text-muted">
                  Изменения применятся с завтрашнего дня.
                </Text>
              )}
            </View>
          </FormContent>
          <View className="items-end px-5 pb-5 pt-2">
            <ErrorMessage>{error}</ErrorMessage>
            <Button disabled={busy} onPress={acceptPanel}>
              Готово
            </Button>
          </View>
        </>
      ) : (
        <>
          {openProperty === "schedule" && calendar && (
            <TaskScheduleMenu
              anchor={formRef}
              calendar={calendar}
              today={today}
              now={now}
              defaultSlotId={slotId}
              value={
                kind === "backlog"
                  ? { kind }
                  : kind === "polyday"
                    ? { kind, date, slotId }
                    : { kind, date, time }
              }
              width={Math.min(344, formWidth - 32)}
              maxHeight={maxHeight ?? 640}
              onDismiss={dismissPanel}
              onConfirm={(next) => {
                saveProperties({ scheduling: next }, () => {
                  applyScheduling(next);
                  finishChoice();
                });
              }}
              onRepeat={
                !task || editSeries
                  ? (next, selectedDate) => {
                      applyScheduling(next);
                      if (repeat === "none") setStartDate(selectedDate);
                      if (shortcut.current) setTitle((value) => value.replace(/#$/, "").trimEnd());
                      shortcut.current = null;
                      setOpenProperty("repeat");
                    }
                  : undefined
              }
            />
          )}
          {openProperty === "priority" && (
            <PropertyMenu
              anchor={formRef}
              width={Math.min(320, formWidth - 40)}
              maxHeight={Math.min(288, (maxHeight ?? 640) / 2)}
              onDismiss={sheet ? dismissPanel : undefined}
              label="Приоритет"
              dismissLabel="Закрыть выбор приоритета"
            >
              <View accessibilityRole="radiogroup" accessibilityLabel="Приоритет">
                {([1, 2, 3, 4] as const).map((value) => (
                  <PickerRow
                    key={value}
                    icon={Flag}
                    label={priorityName(value)}
                    color={colors.priorities[value]}
                    filled={value !== 4}
                    selected={value === priority}
                    onPress={() => choosePriority(value)}
                    radio
                  />
                ))}
              </View>
            </PropertyMenu>
          )}
          {openProperty === "actions" && (
            <PropertyMenu
              anchor={formRef}
              width={Math.min(320, formWidth - 32)}
              maxHeight={360}
              onDismiss={dismissPanel}
              label="Действия с задачей"
              dismissLabel="Закрыть действия с задачей"
            >
              {onEditText && (
                <PickerRow
                  icon={Pencil}
                  label="Изменить задачу"
                  onPress={() => {
                    setOpenProperty(null);
                    onEditText();
                    requestAnimationFrame(() => titleRef.current?.focus());
                  }}
                />
              )}
              {onReorder &&
                !editSeries &&
                ([-1, 1] as const).map((direction) => (
                  <PickerRow
                    key={direction}
                    icon={direction === -1 ? ArrowUp : ArrowDown}
                    label={
                      direction === -1
                        ? "Поднять задачу внутри приоритета"
                        : "Опустить задачу внутри приоритета"
                    }
                    onPress={() => {
                      void runAction(() => onReorder(direction));
                      setOpenProperty(null);
                    }}
                  />
                ))}
              {onSwitchSeries && (
                <PickerRow
                  icon={Repeat2}
                  label={editSeries ? "Вернуться к повторению" : "Изменить всю серию"}
                  onPress={() => {
                    setOpenProperty(null);
                    requestLeave(onSwitchSeries, true);
                  }}
                />
              )}
              {onDelete && !editSeries && (
                <PickerRow
                  icon={Trash2}
                  label="Удалить задачу"
                  color={colors.accent}
                  onPress={() => {
                    setOpenProperty(null);
                    requestLeave(() => {
                      void runAction(onDelete);
                    });
                  }}
                />
              )}
            </PropertyMenu>
          )}
          <View
            className={
              sheet
                ? "min-h-0 flex-1"
                : `overflow-hidden border border-line bg-white ${inline ? "" : "shadow-xl"}`
            }
            style={{
              flexShrink: 1,
              borderRadius: sheet ? 0 : inline ? 12 : formWidth < 600 ? 24 : 16,
            }}
          >
            {!sheet && !inline && formWidth < 600 && (
              <View className="mt-2 h-1 w-9 self-center rounded-full bg-line" />
            )}
            {!sheet && (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Закрыть"
                onPress={requestClose}
                disabled={busy}
                className="absolute right-2 top-2 z-10 h-12 w-12 items-center justify-center rounded-full"
                style={openProperty ? { display: "none" } : undefined}
              >
                {task ? (
                  <ArrowLeft size={21} color={colors.muted} />
                ) : (
                  <X size={19} color={colors.muted} />
                )}
              </Pressable>
            )}
            {sheet ? (
              <>
                {!textEditing && <View className="mt-2 h-1 w-6 self-center rounded-full bg-line" />}
                <View className="min-h-14 flex-row items-center justify-between px-3">
                  {textEditing ? (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Назад к задаче"
                        onPress={requestClose}
                        disabled={busy || confirmClose}
                        className="h-12 w-12 shrink-0 items-center justify-center rounded-full active:bg-selected"
                      >
                        <ArrowLeft size={23} color={colors.muted} />
                      </Pressable>
                      <Text
                        accessibilityRole="header"
                        numberOfLines={1}
                        className="min-w-0 flex-1 text-base font-semibold text-ink"
                      >
                        {editSeries ? "Изменить серию" : "Изменить задачу"}
                      </Text>
                      {saveButton}
                    </>
                  ) : (
                    <>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Место задачи · ${scheduleLabel}`}
                        disabled={busy || editSeries}
                        onPress={() => openPanel("schedule")}
                        className="min-h-12 min-w-0 flex-1 flex-row items-center gap-2 px-2"
                      >
                        {kind === "backlog" ? (
                          <Inbox size={18} color={colors.accent} />
                        ) : (
                          <CalendarDays size={18} color={colors.accent} />
                        )}
                        <Text
                          numberOfLines={1}
                          className="min-w-0 shrink text-sm font-semibold text-muted"
                        >
                          {editSeries
                            ? "Серия задач"
                            : kind === "backlog"
                              ? "Входящие"
                              : (slots.find((slot) => slot.id === slotId)?.name ?? "Полидень")}
                        </Text>
                        {!editSeries && <ChevronRight size={17} color={colors.muted} />}
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel="Действия с задачей"
                        onPress={() => openPanel("actions")}
                        disabled={busy}
                        className="h-12 w-12 shrink-0 items-center justify-center rounded-full active:bg-selected"
                      >
                        <MoreVertical size={21} color={colors.muted} />
                      </Pressable>
                    </>
                  )}
                </View>
                <FormContent
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingHorizontal: 8, paddingBottom: 16 }}
                >
                  <View className="overflow-hidden rounded-xl" style={{ gap: 2 }}>
                    <View
                      className="flex-row items-start bg-white px-2"
                      style={{ paddingVertical: textEditing ? 0 : 8 }}
                    >
                      {completion}
                      {titleFields}
                    </View>
                    {(descriptionVisible || textEditing) && (
                      <View
                        className="flex-row items-start bg-white pl-6 pr-4"
                        style={{ paddingVertical: textEditing ? 6 : 8 }}
                      >
                        {textEditing ? (
                          <View className="mr-2.5 h-9 justify-center">
                            <AlignLeft size={22} color={colors.muted} />
                          </View>
                        ) : (
                          <View className="w-8" />
                        )}
                        <View className="min-w-0 flex-1">{descriptionField}</View>
                      </View>
                    )}
                    {!textEditing && !editSeries && repeat === "none" && (
                      <DetailRow
                        icon={CalendarDays}
                        label={kind === "backlog" ? "Когда выполнить" : scheduleLabel}
                        accessibilityLabel={`Когда выполнить · ${scheduleLabel}`}
                        color={kind === "backlog" ? colors.muted : colors.accent}
                        onPress={() => openPanel("schedule")}
                      />
                    )}
                    {!textEditing && (
                      <DetailRow
                        icon={Flag}
                        label={priority === 4 ? "Без приоритета" : `Приоритет ${priority}`}
                        accessibilityLabel={`Приоритет · ${priorityName(priority)}`}
                        color={colors.priorities[priority]}
                        filled={priority !== 4}
                        onPress={() => openPanel("priority")}
                      />
                    )}
                    {!textEditing &&
                      (!descriptionVisible ||
                        repeat !== "none" ||
                        editSeries ||
                        onSwitchSeries) && (
                        <View className="flex-row flex-wrap gap-2 bg-white p-3">
                          {!descriptionVisible && (
                            <Pressable
                              accessibilityRole="button"
                              accessibilityLabel="Добавить описание"
                              onPress={() => {
                                setShowDescription(true);
                                requestAnimationFrame(() => descriptionRef.current?.focus());
                              }}
                              className="min-h-11 flex-row items-center gap-2 rounded-xl bg-sidebar px-3"
                            >
                              <AlignLeft size={19} color={colors.muted} />
                              <Text className="text-sm text-muted">Описание</Text>
                            </Pressable>
                          )}
                          {(repeat !== "none" || editSeries) && (
                            <Chip
                              icon={Repeat2}
                              label={repeatLabel}
                              accessibilityLabel={`Повторение · ${repeatLabel}`}
                              onPress={() => openPanel("repeat")}
                            />
                          )}
                          {onSwitchSeries && !editSeries && (
                            <Chip
                              icon={Repeat2}
                              label="Вся серия"
                              accessibilityLabel="Изменить всю серию"
                              onPress={() => requestLeave(onSwitchSeries, true)}
                            />
                          )}
                        </View>
                      )}
                  </View>
                </FormContent>
              </>
            ) : (
              <FormContent
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={{
                  paddingHorizontal: 20,
                  paddingTop: 16,
                  paddingBottom: 8,
                  gap: 4,
                }}
              >
                <View className="flex-row items-start">
                  {completion}
                  {titleFields}
                </View>
                <View style={completion ? { paddingLeft: 48 } : undefined}>{descriptionField}</View>
                {task?.seriesId && !editSeries && (
                  <Text className="text-xs text-muted">Только это повторение</Text>
                )}
              </FormContent>
            )}
            <ErrorMessage>
              {error === "Проверьте отмеченные поля." && !Object.keys(errors).length ? null : error}
            </ErrorMessage>
            {confirmClose ? (
              <View className="gap-3 border-t border-line bg-sidebar px-5 py-4">
                <Text accessibilityRole="alert" className="text-sm text-ink">
                  {confirmSwitch
                    ? "Перейти без сохранения изменений?"
                    : task
                      ? "Закрыть без сохранения изменений?"
                      : "Закрыть и удалить черновик?"}
                </Text>
                <View className="flex-row flex-wrap justify-end gap-2">
                  <Button secondary onPress={() => setConfirmClose(false)}>
                    Продолжить
                  </Button>
                  <Button secondary onPress={() => pendingLeave.current()}>
                    Не сохранять
                  </Button>
                </View>
              </View>
            ) : !textEditing ? (
              <View className="flex-row items-center gap-2 px-5 pb-3">
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  style={{ flex: 1 }}
                  contentContainerStyle={{ gap: 4, alignItems: "center", paddingVertical: 4 }}
                >
                  {!sheet && !editSeries && repeat === "none" && (
                    <Chip
                      icon={kind === "backlog" ? Inbox : CalendarDays}
                      label={scheduleLabel}
                      accessibilityLabel={`Когда выполнить · ${scheduleLabel}`}
                      color={kind === "backlog" ? colors.muted : colors.accent}
                      onPress={() => openPanel("schedule")}
                      wide
                    />
                  )}
                  {!sheet && (
                    <>
                      <Chip
                        icon={Flag}
                        label={priority === 4 ? "" : `P${priority}`}
                        accessibilityLabel={`Приоритет · ${priorityName(priority)}`}
                        color={colors.priorities[priority]}
                        filled={priority !== 4}
                        onPress={() => openPanel("priority")}
                      />
                      {repeat !== "none" && (
                        <Chip
                          icon={Repeat2}
                          label={repeatLabel}
                          accessibilityLabel={`Повторение · ${repeatLabel}`}
                          onPress={() => openPanel("repeat")}
                        />
                      )}
                      {(!task || editSeries) && repeat === "none" && (
                        <Chip
                          icon={Plus}
                          label=""
                          accessibilityLabel="Настроить повторение"
                          onPress={() => openPanel("repeat")}
                        />
                      )}
                      {onReorder &&
                        !editSeries &&
                        ([-1, 1] as const).map((direction) => (
                          <Chip
                            key={direction}
                            icon={direction === -1 ? ArrowUp : ArrowDown}
                            label=""
                            accessibilityLabel={
                              direction === -1
                                ? "Поднять задачу внутри приоритета"
                                : "Опустить задачу внутри приоритета"
                            }
                            onPress={() => {
                              void runAction(() => onReorder(direction));
                            }}
                          />
                        ))}
                      {onDelete && !editSeries && (
                        <Chip
                          icon={Trash2}
                          label=""
                          accessibilityLabel="Удалить задачу"
                          onPress={() =>
                            requestLeave(() => {
                              void runAction(onDelete);
                            })
                          }
                        />
                      )}
                      {onSwitchSeries && (
                        <Chip
                          icon={Repeat2}
                          label={editSeries ? "К повторению" : "Вся серия"}
                          accessibilityLabel={
                            editSeries ? "Вернуться к повторению" : "Изменить всю серию"
                          }
                          onPress={() => requestLeave(onSwitchSeries, true)}
                        />
                      )}
                    </>
                  )}
                  {sheet && (
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Закрыть"
                      disabled={busy}
                      onPress={requestClose}
                      className="h-11 w-11 items-center justify-center rounded-lg active:bg-selected"
                    >
                      <ArrowLeft size={21} color={colors.muted} />
                    </Pressable>
                  )}
                </ScrollView>
                {saveButton}
              </View>
            ) : null}
          </View>
        </>
      )}
    </View>
  );
}

function DetailRow({
  icon: Icon,
  label,
  accessibilityLabel,
  color = colors.muted,
  filled = false,
  onPress,
}: {
  icon: typeof Flag;
  label: string;
  accessibilityLabel: string;
  color?: string;
  filled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="min-h-14 flex-row items-center gap-4 bg-white px-6 py-3 active:bg-sidebar"
    >
      <Icon size={22} color={color} fill={filled ? color : "none"} strokeWidth={1.8} />
      <Text className="min-w-0 flex-1 text-base text-ink">{label}</Text>
    </Pressable>
  );
}

function Chip({
  icon: Icon,
  label,
  accessibilityLabel,
  onPress,
  color = colors.muted,
  filled = false,
  wide = false,
}: {
  icon: typeof Flag;
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  color?: string;
  filled?: boolean;
  wide?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="min-h-11 min-w-11 items-center justify-center rounded-md active:bg-sidebar"
    >
      <View className="min-h-8 flex-row items-center gap-1.5 rounded-md border border-line px-2">
        <Icon size={16} color={color} fill={filled ? color : "none"} strokeWidth={1.7} />
        {!!label && (
          <Text
            numberOfLines={1}
            className={wide ? "max-w-60 text-xs" : "max-w-28 text-xs"}
            style={{ color }}
          >
            {label}
          </Text>
        )}
      </View>
    </Pressable>
  );
}

function PickerRow({
  icon: Icon,
  label,
  onPress,
  color = colors.muted,
  selected = false,
  radio = false,
  filled = false,
}: {
  icon: typeof Flag;
  label: string;
  onPress: () => void;
  color?: string;
  selected?: boolean;
  radio?: boolean;
  filled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole={radio ? "radio" : "button"}
      aria-checked={radio ? selected : undefined}
      onPress={onPress}
      className="min-h-12 flex-row items-center gap-3 px-4 py-3 active:bg-selected"
    >
      <Icon size={21} color={color} fill={filled ? color : "none"} strokeWidth={1.7} />
      <Text className="min-w-0 flex-1 text-base text-ink">{label}</Text>
      {selected && <Check size={17} color={colors.accent} />}
    </Pressable>
  );
}

export function SlotChoices({
  slots,
  value,
  onChange,
}: {
  slots: ReadonlyArray<{ id: string; name: string; start: string; end: string }>;
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Полидень" className="gap-2">
      {slots.map((slot) => (
        <Pressable
          key={slot.id}
          accessibilityRole="radio"
          aria-checked={slot.id === value}
          onPress={() => onChange(slot.id)}
          className={`min-h-12 flex-row items-center justify-between rounded-md border px-3 ${slot.id === value ? "border-transparent bg-selected" : "border-transparent bg-sidebar"}`}
        >
          <Text className="min-w-0 flex-1 text-sm text-ink">{slot.name}</Text>
          <Text className="text-xs text-muted">
            {slot.start}–{slot.end}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("ru", { day: "numeric", month: "long", timeZone: "UTC" }).format(
    new Date(`${value}T12:00:00Z`),
  );

function validDate(value: string): boolean {
  try {
    return /^\d{4}-\d{2}-\d{2}$/.test(value) && addDays(value, 0) === value;
  } catch {
    return false;
  }
}
