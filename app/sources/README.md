# ADAMAS source inbox (read-only)

Drop source material here for the **local-folder connector** to pull into the
Capture Inbox. Supported: `.md`, `.markdown`, `.txt`, `.text`, `.eml`.

- ADAMAS only **reads** this folder — it never modifies or deletes your files.
- Pulls are incremental: only new or changed files are re-read.
- Put a file in a domain subfolder (e.g. `finance/budget.md`) to hint its domain.
- Then in the app: **Capture Inbox → Read-only connectors → Pull**.

Example: save a meeting note as `q3-review.md` with a line like
"We decided to drop the hourly rate card. Owner: head of sales."
