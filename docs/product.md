# Polydays product requirements

## Interaction reference and decision rule

Todoist is the user's current application and the reference for Polydays' visual language, task-list interactions, quick entry, priorities, editing, navigation and widgets. Use its familiar conventions to resolve ordinary product and UX choices within the agreed scope. Apply the explicit Polydays requirements below when polyday scheduling, history, recurrence or other agreed behaviour differs from Todoist. This reference guides the design; it does not add all Todoist features or authorise changes to the user's Todoist data.

[Todoist reference research](research/todoist-reference.md) records verified behaviour and the Polydays mapping. Use inbox, current polyday, upcoming polydays and history as the primary destinations. Reuse compact task rows with a separate completion control, title-to-inline-editor interaction, contextual quick entry and familiar in-app keyboard controls. Additional projects, labels, subtasks, boards, a full natural-language parser and external Todoist integration are outside the agreed first-version scope.

Display priorities with the familiar P1–P4 convention: high/red, medium/orange, low/blue and none/neutral, defaulting to none. Current and overdue work obey the agreed priority-first order, with manual order within each priority, visible overdue state and the original polyday label; the same task appears only once in a given list. Preserve the agreed independent recurring occurrences, assigned-polyday history and exact deadline semantics even where Todoist behaves differently.

## Schedule and history

- A polyday is an interval between two sleeps. Users manually configure named intervals that repeat daily. "Periods" refers to polydays, not an additional concept.
- Polydays may cross midnight, for example 19:00–02:00, and use their start date for identification. Intervals cannot overlap; starts are inclusive and ends exclusive. Gaps are scheduled sleep.
- The app follows the configured schedule. Actual sleep tracking is outside scope.
- Each polyday has its own task list. Users can inspect past polydays and plan for future polydays.
- Completed tasks appear in their assigned or deadline-derived polyday, regardless of actual completion time. An untimed task can be moved to the current polyday before completion. For a deadline task, change the explicit deadline date/time to recalculate its polyday before completion.
- History has no user ratings or automatic evaluations of usefulness. A written summary is not required in version one.
- Schedule or series changes must not automatically alter past interval boundaries or task assignments. Manual editing of past interval boundaries is deferred beyond version one. Completing old tasks remains supported.
- Polyday names are shared labels for a slot: renaming applies immediately in current and future polydays, history, selection menus and widgets, including names already saved by an older client. Renaming preserves interval identities, boundaries and task assignments.
- Changes to schedule boundaries or its set of slots apply from a selected date, defaulting to tomorrow. Deleting a recurring interval asks for one destination for bulk transfer of untimed tasks. Timed tasks retain their time and redistribute into the remaining intervals; sleep-gap times appear in the preceding interval. These operations preserve past intervals.
- When schedule boundaries change, untimed tasks stay in their corresponding polyday. Timed tasks retain their exact time and belong to the polyday containing it. A time in a sleep gap is shown distinctly in the preceding polyday.
- Settings offer a fixed timezone or following local time. One active account timezone applies to all devices. In local-following mode, ask to confirm a detected timezone change before synchronising it; fixed mode retains the selected zone. Timezone changes preserve past history.
- The initial mode is a fixed timezone taken from the setup device. A confirmed timezone change immediately recalculates current and future polydays, preserving ended historical intervals.
- Future deadlines and repetitions retain their local date and clock time after a confirmed zone change. At daylight-saving transitions, move nonexistent local times to the first valid time after the gap and use the first occurrence of ambiguous local times.
- During a scheduled sleep gap, show the upcoming polyday by default and include unfinished work from the previous polyday as overdue, subject to its deadline. A deadline in a sleep gap appears distinctly in the preceding polyday, including when schedule changes place it there.

## Tasks and recurrence

- A task has one scheduling mode: unscheduled in the inbox, explicitly assigned to a polyday without an exact deadline, or scheduled by an exact deadline date and time. A deadline task's polyday is derived from that deadline; it has no independent polyday assignment.
- An optional exact time is a **deadline**, not a planned start. An unfinished task becomes overdue after the deadline passes; early completion is allowed. Without an exact deadline, an unfinished task becomes overdue when its assigned polyday ends.
- Overdue tasks retain their assigned polyday and are also visible, highlighted, in the current polyday. This is one task shown in multiple contexts, not automatic reassignment or copying.
- Only untimed tasks can be moved directly to a selected polyday. For deadline tasks, open the date/time editor instead; do not drag them into another polyday or infer a deadline date from a destination interval. Editing the exact deadline recalculates both polyday placement and overdue status. Switching away from a deadline explicitly selects a polyday or the inbox.
- Recurring tasks are required in version one: every polyday; daily in a selected polyday; selected weekdays in a selected polyday; daily at an exact time; selected weekdays at an exact time.
- Polyday-based recurrence uses the start date of the polyday for weekdays. Exact-time recurrence uses the calendar date of the deadline; a Monday 01:00 deadline may therefore appear in the polyday that started on Sunday. Series have a start date and an optional end date.
- Show every missed occurrence individually, without grouping or collapsing the series.
- Editing a recurring task changes the series and future occurrences; past occurrences keep their parameters and may be corrected separately. Completing a task completes one occurrence only.
- Task fields are a title, optional description, completion state, scheduling choice and priority. Scheduling is either inbox, a selected polyday or an exact deadline, as defined above. Priorities are none, low, medium and high.
- When editing an existing task or series, confirmed property choices save immediately without submitting the text draft. Only title and description require explicit saving; discarding their changes preserves saved properties. Rescheduling keeps the inline editor open until dismissed.
- Priority changes task order automatically; users manually reorder tasks within the same priority.
- Completing a task directly from the inbox assigns it to the current polyday so it appears in that polyday's history.
- Notifications are excluded from version one.

## Offline work and synchronisation

- After initial synchronisation, the entire history and schedule rules are available locally. Task and schedule editing, recurring-series creation and planning for arbitrary future dates work offline.
- First Google sign-in and initial loading of existing data require connectivity. Subsequent work with saved data does not.
- Synchronise changes after connectivity returns. Independent field changes merge automatically. Incompatible changes to one field, or deletion conflicting with editing, preserve both versions for the user to resolve.
- The user delegates technical synchronisation choices, with Android widgets and future macOS widgets participating. The selected [sync design](synchronisation.md) uses one durable local queue, coordinated foreground/background senders and server deduplication. Android widgets share native storage with the app and durably record offline completion without requiring an open application.
- Show whether data is saved on the device, synchronised or conflicted. Unrelated tasks continue syncing while incompatible edits await user resolution. Structural schedule/series changes must not silently merge into invalid rules.
- Foreground startup, resume and reconnect recover pending work. Closed-app background work and widget refreshes run when the OS permits; no bounded delivery or exact polyday-boundary refresh is promised. Widget views identify their represented polyday and last-update information.

## Platforms and access

- Starting with 0.1.0, every release includes installed Android and macOS applications from the same version and source commit, alongside the web application. The macOS host bundles the shared RN Web client; macOS widgets remain a later phase.
- Android widgets are required; macOS widgets are required in the future native macOS phase. Show the current polyday, its unfinished tasks and all overdue tasks individually, with priorities and deadlines. A checkbox completes a task, including offline; tapping its title opens it in the app.
- Web, Android and future macOS must share an application codebase, except for platform-specific code. Platform shells must not become independent implementations of task, schedule or recurrence rules.
- Google sign-in is required.
- One server supports independent Google accounts. Each account has its own tasks, schedule, history and MCP grants; each person can authorize multiple MCP clients. The server may admit all verified accounts or restrict access to an email allowlist. Collaborative tasks are excluded.
- Expiry of a server session stops sync but preserves local offline work. Explicit logout with unsent changes offers synchronisation first or a separate confirmation before discarding those changes.

## Technology direction

- React Native with React Native for Web is the confirmed shared-client direction. Expo is a candidate build toolchain, with native development/release builds. Widget integration, local storage and the future macOS host still need compatibility validation.
- TypeScript, Node.js, BoxDB and tRPC are confirmed. Local client storage is selected separately from server-side BoxDB, behind common storage and synchronisation contracts.
- BoxDB 0.5.1 provides native `TIME`; the server uses it for schedule boundaries.
- [Client platform research](research/client-platforms.md) records official-source evidence for React Native, RN Web, optional Expo and macOS alternatives. Storage, Google authentication and lifecycle integration need platform adapters; sharing source does not remove these responsibilities.

## Final review and implementation validation

- Use Todoist as the default reference for remaining ordinary interactions; record any unavoidable deviation that materially affects a workflow.
- Deadline tasks always use an explicit date and time. A deadline of 23 October at 01:00 belongs to the polyday starting 22 October at 19:00 and ending 23 October at 02:00. To change this placement, edit the deadline; a direct polyday-move action is unavailable.
- Preserve completed or individually rescheduled occurrences when applying a changed series rule to untouched future occurrences; expose deliberate task corrections separately from automatic series edits.
- The delegated technical sync design requires its listed platform prototypes before integrations are considered proven. Select build-tool and storage libraries against those checks; Google authentication, widget integration and future native macOS support need platform-specific validation.
- The server schema uses the verified BoxDB 0.5.1 `TIME` type. Deployment and backup/recovery implementation belong to the implementation phase, once the target environment is known.

The user approved these requirements and authorised implementation.
