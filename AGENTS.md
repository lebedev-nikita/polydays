# Project contracts

Read [CONTEXT.md](CONTEXT.md) for domain terms and [docs/product.md](docs/product.md) before changing scheduling or task behaviour. Client and server share domain logic in `packages/core`; native widgets consume prepared views and persist explicit commands.

Release Android and macOS together, using the same version and commit. Follow [release instructions](docs/deployment.md#application-releases); publish only when both platform artifacts are verified.

## UI design

After each user UI correction, update this section with concise, reusable conclusions. Merge related lessons into existing rules.

- Keep related short fields, such as a polyday name and its boundaries, in one compact row when space permits; preserve usable controls on narrow screens.
- Prefer spacing and alignment to separate content. Add a separator only when distinct sections are otherwise hard to distinguish; keep related form fields and repeated rows free of dividing lines.
- Use the canonical names from CONTEXT.md consistently in navigation, headings, destination menus and empty states.
- Keep interfaces minimal: show only what is necessary for the current action. Omit optional labels, explanations and repeated values; preserve accessible names when removing visual labels.
- Keep task titles visually primary. Use a compact composer with borderless title and description, a horizontal toolbar of small property controls and one submit action. Use the caret to indicate focus inside these fields; keep keyboard focus visible on buttons. Leave submission inactive until a title is entered, without showing an error when moving to properties. Open date settings separately and use short menus for priority and destination; show unset priority and secondary actions as accessible icons.
- Keep task entry fields and the submit action above the software keyboard, including inside Android modal windows; verify with the native keyboard open and after reopening it.
- Place contextual metadata beside the control it explains: show an overnight end beside the end time and the calculated polyday duration below the start/end pair. Update duration while editing and hide it for invalid or equal boundaries.
- Use searchable choices for timezones and a calendar for dates. Display human-readable names and localized dates instead of requiring technical identifiers or format syntax.
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
