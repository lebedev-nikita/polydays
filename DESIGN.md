---
name: Polydays
description: Familiar Todoist task lists organised around personal wake intervals.
colors:
  canvas: "#ffffff"
  sidebar: "#faf9f7"
  ink: "#202020"
  muted: "#666666"
  line: "#e8e8e8"
  accent: "#dc3424"
  accent-hover: "#b82b21"
  neutral-hover: "#eeeeee"
  selected: "#ffefe5"
  priority-1: "#d1453b"
  priority-2: "#c77700"
  priority-3: "#246fe0"
  priority-4: "#808080"
  widget-ink: "#252421"
  widget-muted: "#66645f"
  widget-line: "#e9e7e2"
  widget-accent: "#b9382e"
  widget-priority-2: "#ae641c"
  widget-priority-3: "#3469b7"
  widget-priority-4: "#77736d"
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
    fontSize: "20px"
    fontWeight: 600
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
  description:
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif'
    fontSize: "13px"
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
    padding: "0.5rem 0.75rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-hover}"
  button-secondary:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.ink}"
    typography: "{typography.button}"
    rounded: "{rounded.md}"
    padding: "0.5rem 0.75rem"
  button-secondary-hover:
    backgroundColor: "{colors.neutral-hover}"
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
  composer:
    backgroundColor: "{colors.canvas}"
    rounded: "{rounded.xl}"
    width: "100%"
  property:
    textColor: "{colors.muted}"
    rounded: "{rounded.md}"
    padding: "0 0.5rem"
  property-expanded:
    backgroundColor: "{colors.selected}"
---

# Design System: Polydays

## Overview

**Creative North Star: "Familiar Todoist task lists organised around personal wake intervals."**

Polydays uses the user's pinned Todoist canon: compact task rows, warm white content, pale warm navigation, restrained tomato accents and system sans typography. Familiar navigation and separate completion circles keep repeated capture and completion direct.

The shared React Native and React Native for Web interface stays light, including in system dark mode. The macOS host bundles the shared RN Web client; macOS widgets remain deferred. Android widgets retain their separate native palette and dimensions. The direction contract is [Task lists](apps/client/.impeccable/surfaces/apps-client-src-app.md), with domain language in [CONTEXT.md](CONTEXT.md) and product authority in [docs/product.md](docs/product.md). Interface icons are Lucide vectors.

**Key Characteristics:**

- Compact, priority-first task lists with separate completion and details targets.
- Flat white surfaces, warm navigation and fine separators.
- Tomato selection and action cues; P1–P4 remain distinct.
- Collapsible desktop navigation and compact mobile destinations.
- Repeated inline/modal capture with progressive schedule, priority and recurrence controls.

## Colors

The palette is warm and quiet; color identifies action, selection, priority and status.

### Primary

- **Tomato (`accent`):** primary actions, active navigation, overdue metadata, caret and web focus outline.
- **Pale tomato (`selected`):** selected navigation, scheduling choices and text selection.

### Neutral

- **White (`canvas`):** content, fields, panels and composer.
- **Warm sidebar (`sidebar`):** desktop navigation, secondary buttons, priority selection and subdued grouped content.
- **Dark ink (`ink`), muted ink (`muted`), fine line (`line`):** primary text, supporting text and thin separators respectively.
- **Neutral priority (`priority-4`):** P4 circles and input placeholders.

### Priority and status

- **P1 red, P2 orange, P3 blue, P4 neutral:** shared-client priority circles and flags. Unfinished P1–P3 circles use their priority color with the source alpha suffix `18`; P4 stays transparent.
- **Error surface:** pale red with tomato text. **Warning surface / ink:** pale amber conflict banner and brown sleep-gap text. **Success:** green saved feedback.
- **Hover:** primary buttons deepen to `accent-hover`; secondary buttons and sidebar utilities use `neutral-hover`. Row tools, property controls, priority options and search results use warm sidebar hover fills; date shortcuts use pale tomato.
- **Android widget:** white background, `widget-ink`, `widget-muted` and `widget-line`; P1 and overdue text use `widget-accent`, with separate `widget-priority-2` through `widget-priority-4`. These native resources do not inherit the shared-client palette.

The tomato accent follows the pinned Todoist direction.

**The Restrained Accent Rule.** Use tomato for action, selection and overdue cues; keep ordinary content surfaces white or warm neutral.

## Typography

**Body and interface font:** platform system sans. The frontmatter's family is React Native for Web's actual `System` expansion; native text uses its platform default. There is no custom font, display face or monospaced role.

The hierarchy is compact and sentence case, built from explicit task text sizes and the installed utility scale rather than a fixed ratio.

- **Headline:** bold screen/polyday heading, using `headline`.
- **Title:** semibold borderless task-title input, using `title`; supporting titles retain utility sizes, including 1.25rem/1.75rem on device authorization.
- **Body:** task titles use `body`; fields share its size without a separately authored line height.
- **Body small:** explanatory copy and subtitles use `body-small`.
- **Description:** the task editor uses `description` (13px). List-row descriptions remain 0.75rem with 1.25rem leading and truncate to one line.
- **Label:** field labels use semibold `label`; metadata and choice labels use the same size at regular weight, with selected choices semibold.
- **Button / mobile navigation:** explicit compact sizes; mobile active destinations become semibold. Mobile captions are single-line “Бэклог”, “Полидень”, “Планы”, “История”; full destination names remain accessible labels.

**The Compact Hierarchy Rule.** Keep task titles visually primary and metadata subordinate; preserve the short mobile captions as text scales.

## Layout

At window width **850 or greater**, the shell uses a collapsible left sidebar (280 source units), a top toolbar (3rem) and a centred content container (maximum 1000 source units). Content insets are 3.5rem horizontally (56 CSS px at a 16px web root) and 1.75rem above. Smaller windows use 1.25rem horizontally and the same top inset, with a top app bar, bottom destination bar and floating add action. Collapsing the desktop sidebar leaves a restore control in the toolbar.

The installed `md` utility breakpoint is **768 CSS px**, independently of the shell breakpoint: shared buttons become 36px minimum height there, and row actions use desktop visibility rules. Below it, shared buttons use 2.75rem (44 CSS px at the default web root). These are CSS/source values, not native physical-size guarantees.

Interval choices form a wrapping row with 0.5rem gaps; they are not constrained to a single horizontal strip. Property and recurrence controls also wrap; the priority disclosure is vertical. Main content scrolls with bottom padding (70 source units wide, 100 narrow) to leave room around fixed navigation and the add action. Native content is inside top and bottom safe areas.

The browser device authorization screen uses a `ScrollView` with growing, centred content and outer padding (24 source units). Its full-width white panel has a local maximum width (410 source pixels), a fine border, `rounded.xl` corners, `spacing.8` padding (2rem) and `spacing.6` gaps. Short viewports scroll vertically so the heading and both actions remain reachable. These are source layout values, not measured native dimensions or new system tokens.

The frontmatter retains source `rem` values. On web these resolve against the browser root; NativeWind's installed Metro default inlines rem at 14 and this app supplies no override. Native font scaling can change text and row height. Widget XML dimensions below are explicitly dp/sp.

## Elevation & Depth

Task lists and panels are flat at rest. Borders and pale fills separate content. Floating add actions and undo notices use the installed NativeWind large shadow; composer, details, search and shortcut overlays use the extra-large shadow over a black backdrop at 30% opacity. These presets are recorded in the sidecar without claiming identical native rendering. Modal entry uses the platform `fade` animation; no custom duration or easing is authored.

**The Flat Task Surface Rule.** Keep task rows and ordinary panels free of decorative lift; reserve the existing shadows for overlays, floating add actions and notices.

## Shapes

Controls have small rounded corners (`rounded.md`), panels, inline editors and property disclosures slightly broader corners (`rounded.lg`), and modal surfaces broader corners again (`rounded.xl`). The floating add action uses `rounded.2xl`. Completion controls and selected calendar dates are round. Ordinary fields, choice borders and separators use a thin one-unit stroke.

## Components

### Buttons

Compact, semibold actions. Primary buttons use tomato with white text; secondary buttons use warm sidebar, dark ink and a fine border. Both use the frontmatter padding and responsive minimum heights from Layout. Hover uses the explicit button variants; primary press opacity is 80%, secondary press fill returns to warm sidebar. Disabled buttons are noninteractive at 40% opacity. No animated press transition is authored.

Web controls use the global tomato focus-visible outline (2px, offset 3px), except title, description and search inputs, which suppress that outline and retain the tomato caret. Native controls retain platform interaction behavior.

### Inputs / Fields

Shared labelled fields are white and finely bordered, with small corners, dark text and neutral-priority placeholders. Labels sit above with a 0.375rem gap. Minimum height is 3rem, or 6rem when multiline. Focus uses the global outline without an authored border change. Task title, description and search inputs are borderless, with muted placeholders and the caret-only focus treatment above. Errors use the pale-red alert; saved feedback is green.

### Browser device authorization

The [device authorization screen](apps/client/src/app/device.tsx) retains the shared `Field`, primary and secondary `Button`, and `ErrorMessage`. A semibold title identifies Mac sign-in; supporting copy asks users to approve only a sign-in they initiated, followed by the labelled code, account email, primary “Разрешить вход” and secondary “Отклонить”. Both actions disable while busy or when the code is empty; the field becomes noneditable while busy. Invalid or expired codes direct the user to restart sign-in on Mac; other request failures ask them to check the code and retry. Unauthenticated visitors see the shared sign-in screen.

A polite live `Text` stays mounted beneath the heading, initially empty. Approval or denial updates it with the outcome and next step in regular ink body text, while the form and actions disappear. This persistent announcement and the scrolling layout are part of the built browser interaction.

### Chips / Choices

Small rounded rectangles with fine borders. Interval and scheduling selection uses tomato border/text with pale tomato fill. Property controls have a 32px minimum height, an icon and muted label; `aria-expanded` reflects the open disclosure. Expanded controls use a tomato border and pale fill. Priority choices are vertical 36px-minimum rows with colored flags, P1–P4 names, warm selected fill and a tomato check. Recurrence choices wrap and use tomato borders with pale fill; weekday checkboxes switch warm fill to pale tomato.

### Cards / Containers

Settings panels are white, bordered and flat, with `panel` padding and 1.25rem internal gaps. Inline capture/edit uses a bordered container in the list. The composer is fluid up to 550 source units wide and 90% maximum height, aligned near the top with 3.5rem top padding below `md` and 7rem above it. Its form body scrolls with 16-unit padding and 10-unit gaps; a separated footer uses 1rem horizontal and 0.75rem vertical padding. The compact composer begins with the title input, without a separate heading bar.

### Navigation

Desktop destinations have muted outline icons, dark 14px labels and a 36px minimum height; the active destination has pale tomato fill, tomato icon/text and semibold type. Pressed inactive destinations use the selection fill. A selected explicit polyday also marks the current-polyday destination active. Sidebar utilities expose add, search, collapse, shortcut help and sync. Mobile retains four compact destinations with centered icons; search, settings and sync sit in the top bar. Upcoming/history provide previous/next-week links and a seven-date strip whose links start the displayed week at that date. Today uses a tomato circle.

### Task rows and quick entry

Rows use a bottom separator and a 54-unit minimum height. The title target has 0.5rem vertical padding and a 3rem minimum height. A 19-unit priority circle with a 1.7-unit stroke sits within a separate completion target, 3rem high and 2.75rem wide below `md`, 2rem wide above it. Completion fills the circle, adds a white check and mutes/strikes the title. The adjacent title target opens details. Descriptions truncate to one line; deadline, overdue/original-polyday, sleep-gap and recurrence metadata wrap below.

At `md` and above, edit/schedule/more actions appear on row hover or focus within; below it, edit/more remain visible. Tools use 2rem squares and warm hover fills. The inline more menu offers P1–P4 and deletion. The schedule action opens inline editing directly at its schedule disclosure. Completion uses checkbox semantics and `aria-checked`; menu triggers expose `aria-expanded`.

Preserve priority-first order and individual rows for recurring occurrences. Overdue metadata includes the original polyday date and name. Quick entry stays open after a new task saves, clears title/description, shows saved feedback and refocuses the title. Editing an existing task closes on save.

### Task creation and intermediate states

The empty composer focuses title, shows an optional description, collapsed schedule/priority/recurrence controls and a footer with destination, cancel and disabled add action. A nonblank title enables add; saving changes its label and disables it. Inline entry adds the Enter/Esc/p1–p4 hint. Typing a standalone `p1`–`p4` token followed by a space sets priority and removes that token from the title.

Only one property panel opens at a time. Schedule reveals backlog, untimed polyday and exact date/time modes. Non-backlog modes show Today/Tomorrow shortcuts, a Monday-first six-week calendar with month navigation and an editable date field. Selected dates use a tomato circle with white type; unselected today is tomato text. Polyday mode adds named interval choices; deadline mode adds the time field and explains derived polyday placement. An existing deadline task initially exposes only date/time mode; **“Убрать дедлайн”** explicitly clears it before backlog or an untimed polyday can be selected.

Priority opens the P1–P4 menu; choosing a value closes it and refocuses title. Recurrence reveals one-off, every polyday, selected polyday or exact-time choices, with interval/time, weekdays, start date and optional end date as applicable. Empty weekdays mean daily. New capture and series editing expose recurrence; an individual occurrence edit does not. Series editing starts from the effective rule for tomorrow, opens recurrence first and applies changes from tomorrow, preserving past/completed work.

### Details, search and keyboard scope

Task details are a transparent-modal route with an 800-unit maximum-width surface, 90% maximum height and 8% top inset. A location header and close control sit above completion, reorder-within-priority and delete tools. The shared form edits the task; recurring tasks can switch to series editing. Escape dismisses an open property panel first, including when focus is in the details header or toolbar, then closes the modal. Backdrop and explicit close controls dismiss directly.

Search and shortcut help use 640-unit maximum-width overlays, 85% maximum height and 12% top inset. Search autofocuses its field, matches all query words against title/description, excludes deleted tasks and offers an including-completed checkbox. It searches saved tasks plus occurrences expanded through the next 30 days, reports the full match count politely and renders at most 100 results. Results retain priority, polyday/date or backlog context and open details. Empty results offer a short retry hint.

On web, **Q**, **/**, **⌘/Ctrl K** and **?** open capture, search or shortcut help only for the focused, ready shell with these overlays closed. Handled/repeated keys, Alt and editable/dialog targets are ignored; Ctrl/Meta are accepted only for K. **E** toggles completion and **1–4** sets priority only while a task link in that list is focused. Form Escape closes its open property panel first, then the form; list Escape closes its own menu. Search/help Escape closes its overlay. Radio, checkbox, selected-date and expanded-panel attributes describe their current states.

### Undo notices

List completion/reopening and list/details deletion show a polite dark-ink notice with Undo and Close for 8 seconds. It sits above mobile navigation, or at desktop bottom-right with a 440-unit maximum width. Undo failure replaces it with a short retry message. Quick-entry success remains a separate green message in the form.

### Sync feedback and Android widget

The shell pairs cloud-state icons with synced, syncing, saved-on-device, conflict or sign-in-needed state; desktop shows text, while mobile exposes the state through the sync control's accessible label. Conflicts also appear in a pale amber banner.

The native widget is a white rounded panel (20dp corners, 1dp border, 16dp padding) with represented polyday name, date and interval. Its title is 18sp bold, task text 14sp, subtitle 12sp, metadata/status 11sp. Rows have a 52dp minimum height and a separate 48dp completion control. Overdue metadata uses tomato and includes the original polyday date/name plus any deadline. Tapping task text opens details.

Widget status combines the applicable sync/sign-in/conflict/stale message with **“Обновлено HH:mm”** whenever a projection timestamp exists. Freshness remains visible alongside offline state. Priority vector assets are 20dp with a 1.7 viewport-unit stroke and retain the separate widget colors above. The shared projection prepares row order and origin labels; native resources present them. These dimensions do not promise a launcher footprint, exact refresh cadence or future macOS behavior.

## Do's and Don'ts

### Do:

- **Do** preserve the pinned Todoist density, familiar destinations and separate completion circles.
- **Do** keep P1–P4 visually distinct and task order priority-first.
- **Do** let interval and metadata rows wrap, and retain compact mobile captions.
- **Do** retain original polyday context for overdue work and widget freshness beside sync state.
- **Do** keep the interface light when the system switches to dark mode.
- **Do** retain progressive property disclosures, panel-first Escape and visible mobile row actions.

### Don't:

- **Don't** replace flat task lists with decorative cards, gradients or additional display typography.
- **Don't** infer Android physical sizes from web CSS or shared utility names.
- **Don't** invent motion curves or tonal ramps; use the documented source hover states.
- **Don't** expose a direct polyday move for an existing deadline before explicit deadline removal.
- **Don't** let shell or row shortcuts capture typing or inactive contexts; reserve Ctrl/Meta K for search.
- **Don't** apply shared-client colors or CSS dimensions to native widget resources.
