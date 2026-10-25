---
name: Polydays
description: Familiar Todoist task lists organised around personal wake intervals.
colors:
  canvas: "#ffffff"
  sidebar: "#faf9f6"
  ink: "#252421"
  muted: "#66645f"
  line: "#e9e7e2"
  accent: "#b9382e"
  selected: "#f9e9e4"
  priority-1: "#c73529"
  priority-2: "#b85f00"
  priority-3: "#286db4"
  priority-4: "#66645f"
  widget-priority-4: "#949494"
  error-surface: "#fff0ed"
  warning-surface: "#fff5df"
  warning-ink: "#76501b"
  success: "#317043"
typography:
  headline:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "26px"
    fontWeight: 700
    lineHeight: "2rem"
  title:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: "1.75rem"
  body:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "22px"
  body-small:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: "1.25rem"
  label:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: "1rem"
  button:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "14px"
    fontWeight: 600
  nav-mobile:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "11px"
rounded:
  md: "0.375rem"
  lg: "0.5rem"
  xl: "0.75rem"
  2xl: "1rem"
  full: "9999px"
spacing:
  "1": "0.25rem"
  "1.5": "0.375rem"
  "2": "0.5rem"
  "2.5": "0.625rem"
  "3": "0.75rem"
  "4": "1rem"
  "5": "1.25rem"
  "6": "1.5rem"
  "7": "1.75rem"
  "8": "2rem"
  "12": "3rem"
  "14": "3.5rem"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.canvas}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.625rem 1rem"
  button-secondary-active:
    backgroundColor: "{colors.sidebar}"
  field:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  navigation:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
  navigation-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
  choice:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "0 0.75rem"
  choice-selected:
    backgroundColor: "{colors.selected}"
    textColor: "{colors.accent}"
  panel:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.lg}"
    padding: "1.25rem"
  task-row:
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    padding: "0.5rem 0"
  composer:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    width: "100%"
---

# Design System: Polydays

## Overview

**Creative North Star: "Familiar Todoist task lists organised around personal wake intervals."**

Polydays uses the user's pinned Todoist canon: compact task rows, warm white content, pale warm navigation, restrained tomato accents and system sans typography. Familiar navigation and separate completion circles keep repeated capture and completion direct.

The shared React Native and React Native for Web interface stays light, including in system dark mode. The macOS host bundles the shared RN Web client, reusing its components and tokens; macOS widgets remain deferred. Android widgets carry the same flat task-list language through native resources. This records the built system; the direction contract is [Task lists](apps/client/.impeccable/surfaces/apps-client-src-app.md), with domain language in [CONTEXT.md](CONTEXT.md) and product authority in [docs/product.md](docs/product.md).

**Key Characteristics:**

- Compact, priority-first task lists with separate completion and details targets.
- Flat white surfaces, warm navigation and fine separators.
- Tomato selection and action cues; P1–P4 remain distinct.
- Responsive navigation, wrapping interval choices and contextual quick entry.

## Colors

The palette is warm and quiet; color identifies action, selection, priority and status.

### Primary

- **Tomato (`accent`):** primary actions, active navigation, overdue metadata, caret and web focus outline.
- **Pale tomato (`selected`):** selected navigation, scheduling choices and text selection.

### Neutral

- **White (`canvas`):** content, fields, panels and composer.
- **Warm sidebar (`sidebar`):** desktop navigation, secondary pressed buttons and subdued grouped content.
- **Dark ink (`ink`), muted ink (`muted`), fine line (`line`):** primary text, supporting text and thin separators respectively.
- **Neutral priority (`priority-4`):** P4 circles and input placeholders.

### Priority and status

- **P1 red, P2 orange, P3 blue:** shared-client and native widget completion circles use the same priority tokens. Widget P1–P3 have faint tinted fills; widget P4 uses the unfilled `widget-priority-4` outline.
- **Error surface:** pale red with tomato text. **Warning surface / ink:** pale amber conflict banner and brown sleep-gap text. **Success:** green saved feedback.

**The Restrained Accent Rule.** Use tomato for action, selection and overdue cues; keep ordinary content surfaces white or warm neutral.

## Typography

**Body and interface font:** platform system sans. The frontmatter's family is React Native for Web's actual `System` expansion; native text uses its platform default. There is no custom font, display face or monospaced role in the shared client.

The hierarchy is compact and sentence case, built from explicit task text sizes and the installed utility scale rather than a fixed ratio.

- **Headline:** bold screen/polyday heading, using `headline`.
- **Title:** semibold supporting titles use `title`; composer entry uses the smaller large utility step. Section titles also use the base and large utility steps.
- **Body:** task titles use `body`; fields share its size without a separately authored line height.
- **Body small:** explanatory copy and subtitles use `body-small`.
- **Label:** field labels use semibold `label`; metadata and choice labels use the same size at regular weight, with selected choices semibold.
- **Button / mobile navigation:** explicit compact sizes; mobile active destinations become semibold. Mobile captions are single-line “Входящие”, “Полидень”, “Планы”, “История”; full destination names remain accessible labels.

**The Compact Hierarchy Rule.** Keep task titles visually primary and metadata subordinate; preserve the short mobile captions as text scales.

Server-rendered OAuth and connection pages use the same system sans stack, with local CSS sizes: body (15px/1.5), bold wordmark (24px), heading (22px/1.3), connection title (16px), semibold actions (14px) and supporting account/scope text (13px). The MCP address alone uses the browser's monospace `code` face (13px).

## Layout

At window width **850 or greater**, the shell uses a left sidebar (244 source units) and a centred content container (maximum 850 source units). Desktop content insets are 3.5rem horizontally and 3rem above; smaller windows use 1.25rem horizontally and 1.75rem above. The wide layout has a sidebar add action; the narrow layout has a top app bar, bottom destination bar and a floating add button above it.

Interval choices form a wrapping row with 0.5rem gaps; they are not constrained to a single horizontal strip. Priority and recurrence choices also wrap. Main content scrolls with bottom padding (70 source units wide, 100 narrow) to leave room around fixed navigation and the add action. Native content is inside top and bottom safe areas.

The browser device authorization screen uses a `ScrollView` with growing, centred content and outer padding (24 source units). Its full-width white panel has a local maximum width (410 source pixels), a fine border, `rounded.xl` corners, `spacing.8` padding (2rem) and `spacing.6` gaps. Short viewports scroll vertically so the heading and both actions remain reachable. These are source layout values, not measured native dimensions or new system tokens.

Server-rendered OAuth login, consent and connection management share a centred, fluid white card (maximum 440px including padding and border) on the warm `sidebar` background. The card has a fine border, 12px corners, 32px padding and no shadow; the page has a minimum height of 100dvh and 24px outer padding. At viewport widths of 480px or less, outer padding becomes 16px and card padding 24px. Content grows vertically in normal document flow. These are local CSS pixel values, independent of the shared client's rem scale.

The frontmatter retains source `rem` values. On web these resolve against the browser root; NativeWind's installed Metro default inlines rem at 14 and this app supplies no override. Explicit source pixels and React Native dimensions describe style inputs, not measured physical pixels or universal Android dp guarantees. Native font scaling can change text and row height. Widget XML dimensions below are explicitly dp/sp.

## Elevation & Depth

Task lists and panels are flat at rest. Borders and pale fills separate content. Only the floating add action and composer use the installed NativeWind large/extra-large shadows; the composer also has a black backdrop at 30% opacity. These preset shadows are recorded in the sidecar, without claiming identical native rendering.

**The Flat Task Surface Rule.** Keep task rows and ordinary panels free of decorative lift; reserve the existing shadow treatments for the floating add action and modal composer.

## Shapes

Controls have small rounded corners (`rounded.md`), panels and task-detail containers slightly broader corners (`rounded.lg`), and the composer broader corners again (`rounded.xl`). The floating add action uses `rounded.2xl`. Completion circles are fully round. Ordinary fields, choice borders and separators use a thin one-unit stroke.

## Components

### Buttons

Compact, semibold actions. Primary buttons use tomato with white text; secondary buttons use white, dark ink and a fine border. Both use the frontmatter padding and a source minimum height of 3rem. Primary press opacity is 80%; secondary press fill becomes warm sidebar. Disabled buttons are noninteractive at 40% opacity. Source supplies no distinct hover recolor or animated press transition.

Web interactive controls use the global tomato focus-visible outline (2px, offset 3px). Native controls retain their platform interaction behavior; the web outline is not a native focus-ring specification.

### Inputs / Fields

White, finely bordered fields with small corners, dark text and neutral-priority placeholders. Labels sit above with a 0.375rem gap. Fields have a source minimum height of 3rem, or 6rem for multiline descriptions. Web caret is tomato; focus uses the global outline without an authored border change. Errors appear in the shared pale-red alert container; saved feedback is green.

Schedule rows group the name, start, end and delete action with spacing; a separator divides the schedule from its settings. In narrow containers, the time controls wrap together beneath the name. Each time field is 96 source units wide, scaled with native font size, and uses tabular numerals, a numeric keyboard and selection on focus. Whole hours and compact input such as `730` normalize to `07:30` on blur or save. Invalid times show a field-level message after blur or submit; a compact `+1 день` beside the end label identifies intervals crossing midnight. Muted duration text below the start/end pair updates while editing, includes overnight intervals and stays hidden for invalid or equal boundaries.

Timezone and effective-date settings use compact choices. The timezone shows a city and its current UTC offset, expands to a searchable list, and has a separate automatic-detection switch. Dates use localized text with today/tomorrow context and expand to a Monday-first calendar; previous dates are disabled. These settings sit alongside one another when space permits and wrap into a single column on narrow screens.

### Server selection

The shared sign-in screen includes a labelled server-origin field and a secondary connect/check action. The saved origin takes precedence over the build default and persists on the device. Editing it disables sign-in until the address is applied or restored. Invalid addresses show a field error; an unreachable server leaves the setting editable. The panel scrolls on short screens. Account settings show the active server and direct users to sign out before switching, retaining the existing pending-change confirmation.

### Browser device authorization

The [device authorization screen](apps/client/src/app/device.tsx) retains the shared `Field`, primary and secondary `Button`, and `ErrorMessage`. A semibold title identifies Mac sign-in; supporting copy asks users to approve only a sign-in they initiated, followed by the labelled code, account email, primary “Разрешить вход” and secondary “Отклонить”. Both actions disable while busy or when the code is empty; the field becomes noneditable while busy. Invalid or expired codes direct the user to restart sign-in on Mac; other request failures ask them to check the code and retry. Unauthenticated visitors see the shared sign-in screen.

A polite live `Text` stays mounted beneath the heading, initially empty. Approval or denial updates it with the outcome and next step in regular ink body text, while the form and actions disappear. This persistent announcement and the scrolling layout are part of the built browser interaction.

### OAuth and connections

The server-rendered [OAuth pages](apps/server/src/oauth-pages.ts) preserve the compact warm white/tomato auth world. A tomato vector mark and bold Polydays wordmark lead the card; a footer link returns to the app. Login offers Google sign-in. Consent identifies the requesting client, lists the requested permissions in plain language, shows the account email, and stacks the primary approval above a bordered white denial action. Connection management shows a warm address block that wraps long URLs, followed by flat connection sections with a fine top border, client name, muted scope summary and secondary revoke action; the empty state stays inside the same card.

These local buttons fill the card width, have a 44px minimum height, 10px 16px padding and 6px corners. Primary uses tomato/white; secondary uses white/ink with the fine border. Hover retains these colors, with no authored animation or separate press treatment. Links and buttons retain the tomato focus-visible outline (2px, offset 3px).

During a request, all buttons disable at 65% opacity with a wait cursor, and the initiating label becomes “Подождите…”. A persistent polite alert below the content remains visually absent when empty; failures give it the pale-red error surface, tomato text, 12px padding and 6px corners. Transport and unreadable-response failures provide Russian recovery instructions; failure restores the initiating label and enables the buttons for retry. These local pending/error states do not replace the shared client's button states.

### Chips / Choices

Small rectangular choices with fine borders, rather than pill tags. Interval and scheduling selection uses tomato border/text with pale tomato fill. The task composer uses small outlined toolbar controls within touch targets of at least 44 source units. Unset priority and secondary actions use icons with accessible names. Priority flags use filled red, orange and blue for P1–P3 and a neutral outline for P4 in both the toolbar and menu. The menu pairs each flag with its P1–P4 name and a check marking selection. Recurrence choices use tomato borders and pale fill; weekday checks switch warm fill to pale tomato.

### Cards / Containers

Each rounded surface owns its border, background, shadow and content clipping. Groups with edge-to-edge rows clip the rows and pressed fills to that contour, including date settings and property menus.

Settings panels are white, bordered and flat, with `panel` padding and 1.25rem internal gaps. The task editor owns its border and matching corner radius in both the inline editor and the modal composer. The composer is fluid up to 560 source units wide. Below 600 source units it floats above the keyboard with rounded corners, a small handle and safe-area padding. Borderless title and description inputs sit above a horizontally scrolling property toolbar; the submit arrow stays fixed beside it. A single scheduling control shows the date and polyday together. Its menu keeps a separate draft, with a week strip, an expandable Monday-first calendar and the polydays available on the selected date. Week headings and adjacent-month styling use Monday’s month; browsing preserves the selected task date. Confirm accepts the pair; dismissal discards it. Overnight intervals show their actual end date. Exact deadlines are a separate mode and derive their polyday; removing a deadline explicitly returns to polyday selection. On web, property menus overlay the page without moving the form and stay within the viewport. Native scheduling uses a bottom panel. Priority keeps its short vertical menu. Recurrence opens separately, with labelled series boundaries and contextual timezone information. Task dates allow historical corrections; schedule dates retain their minimum date. Modal entry uses the platform `fade` animation, with no authored duration/easing.

### Navigation

Desktop destinations have muted outline icons and dark labels; the active destination has pale tomato fill, tomato icon/text and semibold type. Pressed inactive destinations use the selection fill. A selected explicit polyday also marks the current-polyday destination active. Primary destinations and selected polydays open with their heading and controls immediately. A tomato activity indicator occupies the list area while its contents are prepared after the first painted frame; week changes and back navigation follow the same rule. Leaving a screen cancels pending preparation. Mobile uses the same four destinations with compact captions and centered icons. Settings and sync actions move into the top bar. Icons come from Lucide vector components, not text glyphs.

### Task rows and quick entry

Rows use a bottom separator, 0.5rem vertical padding and a source minimum height of 70. A 19-unit priority circle with a 1.7-unit stroke sits within a separate 3rem-square completion target. Unfinished P1–P3 circles have a faint priority-colored fill; P4 remains unfilled. Completion fills the circle, adds a white check and mutes/strikes the title. The adjacent title target opens a compact inline editor in the same row, keeping surrounding tasks and navigation visible. Descriptions truncate to one line; deadline, overdue/original-polyday, sleep-gap and recurrence metadata can wrap below the title.

Preserve priority-first order and individual rows for recurring occurrences. Overdue metadata includes the original polyday date and name. Quick entry closes after a successful save. Pressing its backdrop requests dismissal with the same unsaved-draft confirmation as the close button; failed saves leave the form open. Editing an existing task collapses its editor on save. Inline editors use a flat border and 12-unit corners, keep the completion circle beside the form, and expose reorder and delete as compact toolbar actions. Switching tasks or closing with unsaved edits asks before discarding the draft. Existing task links reveal this editor in the corresponding list.

On web, unmodified **Q** opens quick entry only for the focused screen when it is ready and its composer is closed. The handler ignores handled/repeated keys, Ctrl/Meta/Alt combinations, inputs, textareas, selects, editable content and dialog descendants. Typing `!!` or `#` at the end of a title opens priority or scheduling choices; selecting a choice removes the trigger. An existing deadline task initially exposes only date/time scheduling; **“Убрать дедлайн”** explicitly clears it before inbox or an untimed polyday can be selected.

### Sync feedback and Android widget

The shell pairs cloud-state icons with synced, syncing, saved-on-device, conflict or sign-in-needed state; desktop shows text, while mobile exposes the state through the sync control's accessible label. Conflicts also appear in a pale amber banner.

The native widget follows the Todoist reference: a flat white panel with clipped corners (24dp), no border and no outer padding. Its warm `sidebar` header (48dp high) holds the represented polyday name in medium-weight system sans (16sp), Lucide `RefreshCw` and a white Lucide `Plus` on a circular tomato action surface. Refresh and add each have a separate 48dp-square target. Native vector drawables retain Lucide's 24-unit geometry, two-unit strokes and rounded caps/joins; completion controls use Lucide `Circle` geometry with the priority treatments below. The source is the installed `lucide-react-native` 0.577.0 package, with its license bundled in `res/raw/lucide_license.txt`. The panel clips edge-to-edge content and tomato pressed ripples to its contour.

Full-width rows have a minimum height (54dp), thin edge-to-edge separators (1dp) and a separate completion target (48dp square). Task titles use dark ink (14sp), with up to two lines before truncation. Completion vectors have a 24dp size and 24-unit viewport, with 20-unit-diameter circles; P1–P3 use a two-unit stroke and faint priority fills, while P4 remains transparent with a thinner outline (1.3 units). Overdue/deadline metadata is subordinate (11sp), right-aligned and hidden when empty. Overdue metadata uses tomato and retains the original polyday date/name plus any deadline; ordinary deadline text is muted.

The quiet footer pairs a localized date and interval with **“Обновлено HH:mm”** (both 10sp); freshness appears whenever a projection timestamp exists. Sign-in, conflict, saved-on-device or stale-projection status appears separately below it in tomato (11sp), hidden when empty, so status never replaces freshness. The title and empty state open the current polyday; add opens its composer through `polydays://current?addTask=1`, preserving current-polyday scheduling. Refresh updates the local widget and schedules sync. Task text routes to the inline editor in its task list; the separate completion action persists locally and schedules sync, including offline.

The shared projection remains authoritative for the represented polyday, row order and origin labels; native resources present the prepared view. These source dimensions do not promise a launcher footprint, exact refresh cadence or future macOS behavior.

## Do's and Don'ts

### Do:

- **Do** preserve the pinned Todoist density, familiar destinations and separate completion circles.
- **Do** keep P1–P4 visually distinct and task order priority-first.
- **Do** let interval and metadata rows wrap, and retain compact mobile captions.
- **Do** retain original polyday context for overdue work; keep widget freshness in the quiet footer and actionable status separately visible.
- **Do** keep the interface light when the system switches to dark mode.

### Don't:

- **Don't** replace flat task lists with decorative cards, gradients or additional display typography.
- **Don't** infer Android physical sizes from web CSS or shared utility names.
- **Don't** add hover colors, motion curves or tonal palette ramps absent from the built source.
- **Don't** expose a direct polyday move for an existing deadline before explicit deadline removal.
- **Don't** let quick-entry shortcuts capture typing, modified keys or inactive screens.
