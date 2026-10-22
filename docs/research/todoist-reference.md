# Todoist UX reference for Polydays

Checked **2026-10-22** against public official Todoist Help Center articles through `td hc search/view`. **Documented** means Todoist's published behaviour; **Polydays rule** comes from the user and [product requirements](../product.md); **proposal** is an adaptation for the parent to evaluate; **unknown** is not established by these sources. No private account data was read or changed, and no app behaviour was tested.

Todoist is the user's current app and the default UX reference and tie-breaker for future ordinary interaction decisions **within the agreed scope**. Explicit Polydays rules override it. This does not add projects, tags, subtasks, boards, AI, calendars, imports or integrations. Notifications, sleep tracking, collaboration and productivity scoring remain outside version one.

## Navigation and task interaction

| Area     | Documented Todoist behaviour                                                                                                                                                          | Proposed Polydays mapping, subject to confirmed rules                                                                                                                                                                                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inbox    | Default destination for tasks without a project; these tasks can still have dates. It is not synonymous with “unscheduled.” [Inbox][inbox]                                            | Backlog contains tasks without a polyday assignment. Reuse quick capture and later scheduling, without importing project semantics. Completing from backlog assigns the task to the current polyday.                                                                                                     |
| Today    | Shows tasks scheduled for today; date-less tasks do not appear. Overdue work can be reviewed and rescheduled. [Today][today]                                                          | Current polyday with its work and highlighted overdue tasks from earlier polydays. An overdue task remains assigned to its original polyday; this is another view of one task. During sleep gaps use the upcoming polyday by default, applying the agreed overdue rules.                                 |
| Upcoming | Dated planning across future days; add directly to a chosen day and drag or use the scheduler to change dates. List/board layouts show only the next recurrence. [Upcoming][upcoming] | Upcoming polydays, labelled by interval name and start date. Untimed tasks can be added/moved directly; deadline tasks use an explicit date/time editor and derived placement. Preserve Polydays' future planning and individual occurrence model; Todoist's next-occurrence restriction is not adopted. |
| History  | Completed tasks can be shown in projects and Reporting. Today/Upcoming completed views currently require Experimental features. [Completed tasks][completed]                          | Browse past assigned polydays, including their completed tasks, regardless of actual completion date. No scoring. Do not inherit experimental availability or Todoist's retention/plan limits.                                                                                                           |

**Documented:** A task's circle completes it; clicking/tapping the task opens its detail view. Details allow title/description editing and changes to date/time and priority. Ordinary completed tasks can be restored through the completed-task display. [Tasks][tasks], [Task view][task-view]

**Proposal:** A compact row with a separate completion control, title, priority indication and optional deadline; title opens details. Keep title, description, polyday assignment, exact deadline and priority readily editable. Reuse the interaction pattern, not Todoist's extra fields. Completion from an overdue view must update the same task/occurrence and its assigned-polyday history.

**Documented:** Quick Add opens with `Q`; typed dates/times and priority tokens are recognised, and an accidentally recognised date can be returned to plain text. On mobile the Dynamic Add button opens the composer. Global Quick Add requires Todoist's desktop app. [Quick Add][quick-add]

**Documented keyboard baseline:** `Q` opens Quick Add, `Esc` cancels/closes, `Enter` opens a focused task, `E` completes it, `1`–`4` set its priority, and typed `p1`–`p4` set priority during entry. Navigation uses sequential `G` then `I`/`T`/`U` for Inbox/Today/Upcoming; `?` shows shortcuts. [Keyboard shortcuts][keyboard]

**Proposal:** Reuse these in-app conventions for backlog/current/upcoming, plus rapid repeated entry. Add from an identified polyday into that context; backlog capture stays unscheduled unless explicitly scheduled. Natural-language input must resolve visibly to a polyday and optional exact deadline. The baseline does not commit Polydays to Todoist's full parser or global desktop shortcuts; initial Mac access is web.

## Priorities and ordering

**Documented:** Four levels, fixed names/colours, with **P4 selected by default**. Official docs describe P4 as white; exact theme-specific colour values are not specified. [Priorities][priorities]

| Todoist     | Published colour | Proposed mapping to existing Polydays values |
| ----------- | ---------------- | -------------------------------------------- |
| P1, highest | Red              | High                                         |
| P2          | Orange           | Medium                                       |
| P3          | Blue             | Low                                          |
| P4, default | White            | None; neutral completion control             |

**Documented:** Today/Upcoming use Smart ordering: date/time (or deadline when no date) → priority → deadline → manual order → creation time. Under that default, manual rearrangement requires matching due time **and** priority; overdue tasks cannot be manually sorted. A separate Manual mode permits free ordering. Priority sorting runs P1 → P4; grouping disables dragging. [Default order][default-order], [Sorting][sorting]

**Polydays rule:** Priority automatically determines order; manual rearrangement is only within the same priority. Do not import time-before-priority ordering, unrestricted Manual mode or grouping controls. The exact placement of overdue rows relative to current rows must preserve this rule and make overdue state visible.

## Dates, exact deadlines and moving tasks

**Documented:** Todoist's current **Date** field schedules when to work and can include a due time. Its separate **Deadline** field represents a fixed completion date and is available on paid plans. These are different attributes, not two names for one field. [Date/time][date-time], [Deadlines][deadlines]

**Polydays rule:** The user's optional exact time is a **deadline**, not a planned start. An unfinished timed task becomes overdue after that instant; an untimed assigned task becomes overdue when its polyday ends. Keep this model and terminology. Do not add Todoist's separate Date/Deadline pair or reinterpret the user's deadline as a work-start time.

**Documented:** Todoist supports changing dates through the scheduler or dragging in Upcoming. Those general help articles do **not** establish that every rescheduling path preserves clock time. One official integration article explicitly says Doify's “reschedule to current date” action retains an existing time; this is evidence about that action only. [Date/time][date-time], [Upcoming][upcoming], [Doify action][doify]

**Polydays rule:** A deadline task cannot be moved directly to a selected polyday. Edit its explicit deadline date and time, then derive its polyday and overdue state. For example, a deadline of **24 Oct, 01:00** belongs to the polyday starting **23 Oct, 19:00**, ending **24 Oct, 02:00**. Untimed tasks retain direct polyday selection. There is no implicit date-retargeting rule for moving a timed task; this requirement is recorded in [ADR 0009](../adr/0009-derive-deadline-task-polydays.md).

Schedule edits are a different operation: apply from the selected date, default tomorrow; preserve historical intervals. Deleting an interval bulk-transfers untimed tasks to one selected destination, while timed tasks retain their times and redistribute by interval membership, with gap times in the preceding interval. A confirmed timezone change immediately recalculates current/future polydays and preserves historical intervals. These are Polydays requirements, not Todoist findings; Google sign-in and Todoist timezone behaviour are outside this research.

## Android widgets and sync expectations

**Documented:** Todoist's Android task-list widget displays a chosen view. Tapping a title opens details; tapping its circle completes the task; `+` adds a task. It shows dates and priority colours. Compact mode removes the completion circle, requiring details to complete. The troubleshooting section identifies Android battery management as a cause of frozen widgets. [Android widget][widget]

**Documented:** Todoist allows offline task changes, including completion, and says they sync when connectivity returns. Its offline guide warns about unsynced data loss when closing/logging out/clearing data. Sync troubleshooting provides manual sync and warns against clearing unsynced local data. These docs do not specify a widget refresh bound, conflict algorithm or a durable offline completion contract specifically for widget actions. [Offline][offline], [Sync troubleshooting][sync]

**Polydays rule:** Android first: show the current polyday, its unfinished tasks and **all overdue occurrences individually**, with priorities and deadlines. Keep a working checkbox even in a compact presentation; title opens details. Completion works offline without the foreground app, durably records the displayed occurrence, and later syncs through the shared queue. Show local/synced/conflicted state in the app and polyday/date plus last-update information in the widget. All closed-app sync and widget refreshes, including at a polyday boundary, remain subject to OS execution. [Selected sync design](../synchronisation.md)

The confirmed shared RN/RN Web, TypeScript, Node.js, BoxDB and tRPC direction is unchanged; Mac initially uses web, with native Mac/widgets later. Native persistence/widget adapters still require the existing prototype checks. BoxDB `TIME` is a maintainer-planned type whose availability/value contract must be verified before use. Todoist UX evidence does not prove any chosen technical integration.

## Recurrence and completed history

**Documented:** A Todoist recurring task is one task with a moving date, not independent tasks for all occurrences. Completion advances it to a future occurrence; missed past dates do not become a backlog of separate overdue occurrences. For example, a daily task completed late advances to tomorrow. Editing the recurrence field changes the pattern; choosing a single date/time can change just the next occurrence. [Recurring dates][recurrence], [Completed tasks][completed]

**Documented:** Each recurring completion is logged in Reporting. Current experimental completed-occurrence displays record the **actual completion day**; Android does not yet display these completed recurring tasks. Such records cannot be reopened, rescheduled or reordered; an immediate Undo is available briefly. [Recurring completion][recurring-completion]

**Polydays rule:** Every missed occurrence remains individually visible; completion affects one occurrence only. History belongs to its assigned polyday, even if completed later. Series edits affect the series/future occurrences; past occurrences retain parameters and allow deliberate correction. Preserve completed and individually rescheduled occurrences when regenerating untouched future ones. Do not import skipped-occurrence behaviour, uneditable historical records or Android's missing history UI.

## Parent review: material differences and actual unknowns

- **Resolved overrides, not questions to reopen:** assigned-polyday history; every missed recurrence; exact-time deadline semantics; priority-first ordering with manual ordering only within priority; offline widget completion and OS-limited refresh. Todoist resemblance must not override these.
- **Resolved date/assignment rule:** Deadline tasks use an explicit date/time editor and derived polyday membership; only untimed tasks use direct polyday moves. Todoist's calendar-day model does not define this polyday-specific distinction.
- **Ordinary presentation decision:** Choose how overdue and current rows share the list while respecting priority order, and how quick-entry date phrases resolve to polyday labels. The mapping above is a proposal, not a new accepted screen specification.
- **Evidence gaps:** Universal Todoist time retention during rescheduling and widget-specific offline durability are not proven by the public docs reviewed. Polydays defines its own explicit date/time editing and offline widget-completion requirements; no private-account experiment is needed. Pixel layout, exact colour tokens and platform integrations were not verified.

## Sources and reproducibility

Exact CLI flags were checked with `td hc search --help` and `td hc view --help`. Search supports `--locale`, `--limit` (maximum 25), `--json` and `--ndjson`; view supports `--locale`, `--json`, `--html` and `--browser`. Used public `search` and text `view` only. Search with `--locale en` returned English results, but viewing their IDs with that locale returned `NOT_FOUND`; explicitly using the returned `en-us` locale succeeded.

```sh
/Users/nikitalebedev/.bun/bin/td hc search 'priority' --locale en-us --limit 10 --json
/Users/nikitalebedev/.bun/bin/td hc view id:205873321 --locale en-us
```

All source links below are the official article URLs returned by the CLI; all were read on the checked date.

[inbox]: https://get.todoist.help/hc/en-us/articles/360000028960-Use-the-Inbox-in-Todoist
[today]: https://get.todoist.help/hc/en-us/articles/360000030999-Plan-your-day-with-the-Today-view
[upcoming]: https://get.todoist.help/hc/en-us/articles/360000031019-Plan-your-week-with-the-Upcoming-view
[tasks]: https://get.todoist.help/hc/en-us/articles/6246569348124-Introduction-to-tasks
[task-view]: https://get.todoist.help/hc/en-us/articles/360007288380-Use-the-task-view-to-manage-tasks-in-Todoist
[quick-add]: https://get.todoist.help/hc/en-us/articles/115001745265-Use-Task-Quick-Add-in-Todoist
[keyboard]: https://get.todoist.help/hc/en-us/articles/205063212-Use-keyboard-shortcuts-in-Todoist
[priorities]: https://get.todoist.help/hc/en-us/articles/205873321-Set-a-priority-in-Todoist
[default-order]: https://get.todoist.help/hc/en-us/articles/360006365600-Default-sorting-order-in-Todoist
[sorting]: https://get.todoist.help/hc/en-us/articles/360017135159-Sort-or-group-tasks-in-Todoist
[date-time]: https://get.todoist.help/hc/en-us/articles/205325931-Schedule-a-date-and-time-for-your-Todoist-tasks
[deadlines]: https://get.todoist.help/hc/en-us/articles/17144873893276-Introduction-to-deadlines-in-Todoist
[doify]: https://get.todoist.help/hc/en-us/articles/26782884306844-Use-Doify-with-Todoist
[widget]: https://get.todoist.help/hc/en-us/articles/206408179-Use-a-Todoist-widget-on-your-Android-device
[offline]: https://get.todoist.help/hc/en-us/articles/205144561-Use-Todoist-while-offline
[sync]: https://get.todoist.help/hc/en-us/articles/360019559519-Troubleshoot-syncing-issues-in-Todoist
[recurrence]: https://get.todoist.help/hc/en-us/articles/360000636289-Introduction-to-recurring-dates
[recurring-completion]: https://get.todoist.help/hc/en-us/articles/14637048240412-Complete-a-task-with-a-recurring-date
[completed]: https://get.todoist.help/hc/en-us/articles/205847912-View-completed-tasks-in-Todoist
