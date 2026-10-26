# Project contracts

Read [CONTEXT.md](CONTEXT.md) for domain terms and [docs/product.md](docs/product.md) before changing scheduling or task behaviour. Client and server share domain logic in `packages/core`; native widgets consume prepared views and persist explicit commands.

Release Android and macOS together, using the same version and commit. Follow [release instructions](docs/deployment.md#application-releases); publish only when both platform artifacts are verified.

For every stable release (not a release candidate), merge the release branch into `origin/main`. A stable release is complete only after verifying that `origin/main` contains the release commit.

## UI design

After each user UI correction, update this section with concise, reusable conclusions. Merge related lessons into existing rules.

- Keep related short fields, such as a polyday name and its boundaries, in one compact row when space permits; preserve usable controls on narrow screens.
- Prefer spacing and alignment to separate content. Add a separator only when distinct sections are otherwise hard to distinguish; keep related form fields and repeated rows free of dividing lines, except for the thin edge-to-edge task separators in Android widgets matching the Todoist reference.
- Use the canonical names from CONTEXT.md consistently in navigation, headings, destination menus and empty states.
- Group consecutive polydays by their start date in upcoming lists, history and all-polydays widgets. Show the date and shared task summary once per group, with each polyday's name and boundaries beneath it; retain the start-date grouping for overnight intervals.
- Keep timeline headings free of explanatory copy and week navigation; load more dates when scrolling toward the end. Hide widget list choices behind a chevron beside the header title, revealing them over the task list without reserving space while closed.
- Keep interfaces minimal: show only what is necessary for the current action. Omit optional labels, explanations and repeated values; preserve accessible names when removing visual labels.
- On phones, open task details in a bottom sheet over the list without summoning the keyboard; put secondary actions in an overflow menu. Expand mobile text editing to fill the screen with only the title and description below a Back/Save header; returning to details preserves the text draft. On desktop, edit tasks in place. Put completion beside the title inside the editor on both layouts. Task links open the editor from the appropriate list, preserving its navigation. Save property choices immediately, including scheduling, priority and recurrence; only title and description require explicit saving or a discard confirmation. Keep a rescheduled task's editor open until dismissed so its text draft survives the move. Reveal an empty description on request in mobile details. Use a text Save action and back navigation for existing tasks. Save also closes an unchanged editor without writing the task or series again.
- Keep task titles visually primary. Use a compact composer with borderless title and description, a horizontal toolbar of small property controls and one submit action. Use the caret to indicate focus inside these fields; keep keyboard focus visible on buttons. Leave submission inactive until a title is entered, without showing an error when moving to properties. Use one scheduling control for the date and polyday, with an independent draft applied together; keep exact deadlines as a mode that derives the polyday. Use short menus for priority; show unset priority and secondary actions as accessible icons.
- Close task capture after a successful save and allow backdrop dismissal through the same unsaved-draft confirmation as the close button. Keep the form open when saving fails.
- Keep every input above the Android software keyboard, including sign-in, setup, settings, inline task editors and modal menus. Use keyboard-aware scrolling for full-screen forms; inline fields must belong to the outer list without an intervening ScrollView. Let modal windows resize above the keyboard without adding a second keyboard offset to their inner scrolling. Keep task submission reachable and verify focus changes, long content and keyboard reopening.
- Let each rounded surface own its border, background, shadow and clipping so their contours match; clip edge-to-edge child rows and their pressed states in panels and menus. Use consistent priority colors across menus, controls and task rows: P1 red, P2 orange, P3 blue, P4 neutral; fill only P1–P3 flags.
- Match Android widgets to the Todoist reference: a compact pale header with an accent title and circular add action, full-width task rows, lightly tinted P1–P3 completion circles, and quiet date/update information. Keep completion and task-opening targets separate.
- Use Lucide icons throughout the app and native widgets; derive Android vector drawables from the installed Lucide geometry and retain its license.
- Open web property menus as overlays without changing the task form's position or size; keep the choices within the viewport on short and narrow screens.
- Apply complete task-title shortcuts immediately to their property controls and remove the command from the title; support every priority, including P4 (none), during creation and editing.
- Place contextual metadata beside the control it explains: show an overnight end beside the end time and the calculated polyday duration below the start/end pair. Update duration while editing and hide it for invalid or equal boundaries.
- Apply polyday renames immediately across headings, selectors, history and widgets; effective dates govern interval changes. Reopen saved future intervals with their effective date and confirm when they take effect.
- Use searchable choices for timezones and a calendar for dates. Display human-readable names and localized dates instead of requiring technical identifiers or format syntax.
- In week calendars, derive the month heading and adjacent-month styling from Monday so they stay consistent across month and year boundaries; browsing preserves the selected task date.
- Use a compact switch for automatic timezone detection, with the effective timezone visible.
- Infer the underlying usability issue from annotated screenshots and fix every marked area coherently.
- Keep browser navigation free of blank frames, including first visits to a page; route loading must preserve the visible interface.
- Switch primary destinations and polydays instantly, keeping app bars stationary. Paint the destination heading and a loading indicator before preparing its lists; apply this to week changes and back navigation too.
- After UI work, explain the changes and show a screenshot of the verified result. Give each delivered screenshot a unique filename so cached previews cannot show an earlier version.

# Learning more about Effect

This repository uses the Effect Typescript library.

Before writing any Effect code, first read `node_modules/effect/AGENTS.md`
completely, and follow the links in the file when required.

If you need to learn more about particular Effect APIs and concepts that the
guide does not cover, search through the source code in `node_modules/effect/src`.
