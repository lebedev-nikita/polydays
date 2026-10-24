# Offline state, widgets and synchronisation

Technical design selected within the user's delegation, pending final review of the overall design. Widgets show current and overdue work, allow offline completion and open task details in the app. [Platform evidence](research/widgets-and-sync.md) separates documented constraints from prototype checks; none of the integrations below has been prototyped yet.

## Shared rules and platform responsibilities

The TypeScript domain core owns polyday selection, task assignment, recurrence, deadline/timezone behaviour, priority ordering and conflict rules. React Native, RN Web and the Node.js server share that core and versioned command/data contracts. Native widget layouts, storage, credentials and background execution are platform adapters, rather than separate task applications.

On Android, one native SQLite repository serves the React Native bridge, widget handlers and background workers, with one migration authority. Web uses IndexedDB behind the same application storage contract. Server state remains in BoxDB. A later macOS app and WidgetKit extension need coordinated native storage in an App Group; their concrete libraries are deferred to that phase.

## Durable operations

- Persist each acknowledged local edit and its pending operation atomically. Every operation carries a stable account, operation identity, target identity, base revision and command payload.
- Foreground and native background senders drain the same queue with coordination. Retrying after a lost acknowledgement uses the same operation identity; the server deduplicates it.
- Commit server changes and operation acknowledgements together. Commit received changes, conflicts and the download cursor together on the client, preserving pending local edits.
- A task occurrence has stable identity independent of the polyday displayed when an operation is eventually delivered. A delayed widget action must affect the displayed occurrence that was tapped.
- A native widget handler atomically persists an explicit completion value and pending operation before reporting success. Repeated delivery reuses its persisted operation identity; avoid retry-sensitive toggle commands. This path works without the React application being mounted.
- A failed local write reports failure instead of showing an acknowledged edit. Expired sessions pause authenticated transport while preserving local work; workers request reauthentication through application state, not by opening Google UI themselves.

## Conflicts

Merge independent field edits. Preserve incompatible same-field edits and delete/edit conflicts for explicit user resolution, as required by [ADR 0003](adr/0003-preserve-conflicting-device-edits.md). A resolution is itself a versioned operation; receiving an older acknowledgement must not clear newer local work.

Treat changes to an interval set, timezone policy or recurrence rule as coherent structural operations. Validate their combined result and surface a conflict when automatic merging would overlap intervals, invalidate assignment or overwrite incompatible rules. Unrelated task sync continues. Widget/native code transports these operations and prepared results; it does not independently regenerate recurrence or choose conflict winners.

A task's scheduling choice is also coherent: inbox, an explicitly selected polyday for an untimed task, or an exact deadline date/time from which the core derives placement. Do not merge incompatible edits into a task with both an independent polyday assignment and a deadline. Native widgets complete a stable task identity; rescheduling uses the application's appropriate polyday selector or date/time editor.

## Widget data and background work

The common core prepares widget views with explicit task/occurrence identities, account and schedule versions, polyday/date labels, timestamps and validity ranges. Native code can select a prepared range and apply narrow pending completion state without reimplementing the recurrence engine. The app regenerates prepared data after offline schedule edits; the server can return prepared views during native sync.

Prepared future views have a finite horizon. If it expires, retain clearly dated cached information and direct the user to open the app for regeneration rather than pretending the old list is current. The foreground app retains full offline history and planning capability.

Android local changes request a widget refresh and enqueue network-constrained persistent work. Foreground startup, resume and reconnect also recover pending work. Workers retry queued operations and obtain remote updates when the OS permits. Local display updates do not require a server connection.

Background scheduling is opportunistic: neither remote changes nor a polyday boundary have a guaranteed closed-app refresh deadline. Display the represented polyday/range and last-update information from the start. A future macOS widget can prepare WidgetKit timelines and process AppIntents through the shared native repository, subject to the platform's execution/reload limits. No perpetual foreground service, exact alarm or battery exemption is selected.

Prototype checks must cover process death around local commits and acknowledgements, duplicate delivery, concurrent app/widget/worker access, offline completion, two-device conflicts, migration, logout, stale projections, boundaries and actual Android power-management behaviour. The evidence note lists the full checks.

Application and widget sync requests include the account ID captured with their local queue. The server compares it with the authenticated session before reading or writing, rejecting a request if the browser session changed accounts. The ID is an assertion, not a way to choose another account. Requests from older clients without this field remain supported.
