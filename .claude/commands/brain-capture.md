---
description: Capture a thought/note/paste into the brain's inbox (fast, lossless)
argument-hint: [the thing to capture]
---

Read `brain/CLAUDE.md` first if you haven't this session.

Capture the following into the second brain's inbox, losslessly and fast:

$ARGUMENTS

Steps:
1. Write a new note to `brain/00_inbox/<YYYY-MM-DD-HHmm>_<short-slug>.md`.
2. Add frontmatter: `type: capture`, `created: <ISO datetime>`, `source: manual`,
   and a `project:` guess (`adamas` | `clients/<name>` | `personal` | blank) plus tags.
3. Put the raw content in the body verbatim — do not summarize or lose anything.
4. If it obviously contains a decision, note that so `/brain-review` logs it later.
5. Reply with the path you wrote and your one-line filing guess. Do not file it
   into its final home yet — that happens in `/brain-review`.
