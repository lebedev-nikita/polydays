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
  priority-2: "#b96712"
  priority-3: "#286db4"
  priority-4: "#77736d"
  widget-priority-2: "#ae641c"
  widget-priority-3: "#3469b7"
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

The shared React Native and React Native for Web interface stays light, including in system dark mode. Android widgets carry the same flat task-list language through native resources. This records the built system; the direction contract is [Task lists](apps/client/.impeccable/surfaces/apps-client-src-app.md), with domain language in [CONTEXT.md](CONTEXT.md) and product authority in [docs/product.md](docs/product.md).

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

- **P1 red, P2 orange, P3 blue:** the shared-client priority tokens; P4 is neutral. Native widget P1 uses `accent`, P2 and P3 use their explicit `widget-priority-*` tokens, and P4 shares `priority-4`.
- **Error surface:** pale red with tomato text. **Warning surface / ink:** pale amber conflict banner and brown sleep-gap text. **Success:** green saved feedback.

**The Restrained Accent Rule.** Use tomato for action, selection and overdue cues; keep ordinary content surfaces white or warm neutral.

## Typography

**Body and interface font:** platform system sans. The frontmatter's family is React Native for Web's actual `System` expansion; native text uses its platform default. There is no custom font, display face or monospaced role.

The hierarchy is compact and sentence case, built from explicit task text sizes and the installed utility scale rather than a fixed ratio.

- **Headline:** bold screen/polyday heading, using `headline`.
- **Title:** semibold composer entry and supporting titles, using `title`; section titles also use the smaller base and large utility steps.
- **Body:** task titles use `body`; fields share its size without a separately authored line height.
- **Body small:** explanatory copy and subtitles use `body-small`.
- **Label:** field labels use semibold `label`; metadata and choice labels use the same size at regular weight, with selected choices semibold.
- **Button / mobile navigation:** explicit compact sizes; mobile active destinations become semibold. Mobile captions are single-line “Бэклог”, “Полидень”, “Планы”, “История”; full destination names remain accessible labels.

**The Compact Hierarchy Rule.** Keep task titles visually primary and metadata subordinate; preserve the short mobile captions as text scales.

## Layout

At window width **850 or greater**, the shell uses a left sidebar (244 source units) and a centred content container (maximum 850 source units). Desktop content insets are 3.5rem horizontally and 3rem above; smaller windows use 1.25rem horizontally and 1.75rem above. The wide layout has a sidebar add action; the narrow layout has a top app bar, bottom destination bar and a floating add button above it.

Interval choices form a wrapping row with 0.5rem gaps; they are not constrained to a single horizontal strip. Priority and recurrence choices also wrap. Main content scrolls with bottom padding (70 source units wide, 100 narrow) to leave room around fixed navigation and the add action. Native content is inside top and bottom safe areas.

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

### Chips / Choices

Small rectangular choices with fine borders, rather than pill tags. Interval and scheduling selection uses tomato border/text with pale tomato fill. Priority selection instead uses a warm fill and stronger neutral border (`#aaa49a`), retaining its colored flag and P1–P4 name. Recurrence choices use tomato borders and pale fill; weekday checks switch warm fill to pale tomato.

### Cards / Containers

Settings panels are white, bordered and flat, with `panel` padding and 1.25rem internal gaps. The task editor is a bordered container or the modal composer, not a card around every task. The composer is fluid up to 560 source units wide and 90% maximum height; its body scrolls between separated header and footer. Its body padding (22 source units) and gap (18) are local form values, not a new spacing scale. Modal entry uses the platform `fade` animation, with no authored duration/easing.

### Navigation

Desktop destinations have muted outline icons and dark labels; the active destination has pale tomato fill, tomato icon/text and semibold type. Pressed inactive destinations use the selection fill. A selected explicit polyday also marks the current-polyday destination active. Mobile uses the same four destinations with compact captions and centered icons. Settings and sync actions move into the top bar. Icons come from Lucide vector components, not text glyphs.

### Task rows and quick entry

Rows use a bottom separator, 0.5rem vertical padding and a source minimum height of 70. A 19-unit priority circle with a 1.7-unit stroke sits within a separate 3rem-square completion target. Completion fills the circle, adds a white check and mutes/strikes the title. The adjacent title target opens details. Descriptions truncate to one line; deadline, overdue/original-polyday, sleep-gap and recurrence metadata can wrap below the title.

Preserve priority-first order and individual rows for recurring occurrences. Overdue metadata includes the original polyday date and name. Quick entry stays open after a new task saves, clears title/description, shows saved feedback and refocuses the title. Editing an existing task closes on save.

On web, unmodified **Q** opens quick entry only for the focused screen when it is ready and its composer is closed. The handler ignores handled/repeated keys, Ctrl/Meta/Alt combinations, inputs, textareas, selects, editable content and dialog descendants. An existing deadline task initially exposes only date/time scheduling; **“Убрать дедлайн”** explicitly clears it before backlog or an untimed polyday can be selected.

### Sync feedback and Android widget

The shell pairs cloud-state icons with synced, syncing, saved-on-device, conflict or sign-in-needed state; desktop shows text, while mobile exposes the state through the sync control's accessible label. Conflicts also appear in a pale amber banner.

The native widget is a white rounded panel (20dp corners, 1dp border, 16dp padding) with represented polyday name, date and interval. Its title is 18sp bold, task text 14sp, subtitle 12sp, metadata/status 11sp. Rows have a 52dp minimum height and a separate 48dp completion control. Overdue metadata uses tomato and includes the original polyday date/name plus any deadline. Tapping task text opens details.

Widget status combines the applicable sync/sign-in/conflict/stale message with **“Обновлено HH:mm”** whenever a projection timestamp exists. Freshness remains visible alongside offline state. The shared projection prepares row order and origin labels; native resources present them. These source dimensions do not promise a launcher footprint, exact refresh cadence or future macOS behavior.

## Do's and Don'ts

### Do:

- **Do** preserve the pinned Todoist density, familiar destinations and separate completion circles.
- **Do** keep P1–P4 visually distinct and task order priority-first.
- **Do** let interval and metadata rows wrap, and retain compact mobile captions.
- **Do** retain original polyday context for overdue work and widget freshness beside sync state.
- **Do** keep the interface light when the system switches to dark mode.

### Don't:

- **Don't** replace flat task lists with decorative cards, gradients or additional display typography.
- **Don't** infer Android physical sizes from web CSS or shared utility names.
- **Don't** add hover colors, motion curves or tonal palette ramps absent from the built source.
- **Don't** expose a direct polyday move for an existing deadline before explicit deadline removal.
- **Don't** let quick-entry shortcuts capture typing, modified keys or inactive screens.
