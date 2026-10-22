# Preserve incompatible device edits for user resolution

Offline devices can independently change the same task. Merge independent field changes automatically, but preserve both versions when the same field changes incompatibly or deletion conflicts with editing, letting the user choose the result. This accepts a conflict-resolution workflow instead of silently losing one edit through automatic last-write-wins; the exact synchronisation protocol and resolution interface remain open.
