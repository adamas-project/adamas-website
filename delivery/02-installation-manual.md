# Stage 2 — Installation Manual (idiot-proof)

Goal: a vault machine running in the client's office, fully local, in half a day.
Written to be executed literally, step by step — or read aloud over screen share to a
non-technical person (remote/US mode).

> `[HERMES]` marks the slots where the actual Hermes agent is installed/configured.
> TODO (founder): fill those steps from the real Hermes docs — nobody else can.
> Until then, the manual installs the open v1 stack (works standalone): macOS +
> Ollama (local AI runtime) + Obsidian (vault UI) + the Decision Ledger Standard layout.

## 1. Hardware order list (send at Stage 0; client buys, client owns)

- [ ] Mac Mini, Apple M4, **24 GB or 32 GB** unified memory, **512 GB** storage min.
- [ ] External SSD ≥ 1 TB (backup target, e.g. Samsung T7 class).
- [ ] Ethernet cable to the office router/switch (no Wi-Fi for the vault if avoidable).
- [ ] Any HDMI monitor + USB keyboard/mouse for setup day (can be borrowed; the machine
      runs headless afterwards).

## 2. First boot (15 min) — remote mode: read this aloud to the client

- [ ] Connect monitor, keyboard, mouse, Ethernet, power. Press the power button.
- [ ] macOS setup assistant: language/region as appropriate; **create a local account**
      named `vault` with a strong password (write it on the credentials sheet, nowhere
      else). **Skip/decline:** Apple ID ("Set Up Later"), Siri, Screen Time, Analytics.
- [ ] System Settings → General → Software Update → install pending updates → reboot.
- [ ] System Settings → Privacy & Security → **FileVault → Turn On** (store the recovery
      key on the credentials sheet). Disk encryption is non-negotiable.
- [ ] System Settings → Energy → **Prevent automatic sleeping when display is off: ON**.
- [ ] Remote mode only: System Settings → General → Sharing → enable **Screen Sharing**,
      allow only the `vault` user. You take over from here; client can step away.
      (Disable this again at handover — checklist §6.)

## 3. Install the engine (30 min)

Open Terminal (Cmd+Space → "Terminal") and run, one line at a time:

```bash
# 1. Command-line tools + Homebrew (package manager)
xcode-select --install            # confirm the dialog; wait until done
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
# follow the "Next steps" lines Homebrew prints (adds brew to PATH)

# 2. Local AI runtime + vault UI
brew install ollama
brew install --cask obsidian

# 3. Start the runtime as a background service and pull the working model
brew services start ollama
ollama pull qwen2.5:32b          # default for 32GB machines; use qwen2.5:14b on 24GB
                                  # (verify current best local model at install time)

# 4. Smoke test — must answer coherently and show GPU/Metal usage
ollama run qwen2.5:32b "Summarize in one sentence why recording the reasoning behind business decisions matters."
```

- [ ] Smoke test passed (coherent answer, no errors).
- [ ] `[HERMES]` Install and license the Hermes agent here; point it at the Ollama
      endpoint (`http://localhost:11434`) or its own runtime per its docs.

## 4. Create the vault (20 min)

```bash
mkdir -p ~/Vault/{ledger/{hiring,sales,product,finance,ops},inbox,assets,sources,_system}
curl -o ~/Vault/_system/decision-ledger-standard.schema.json \
  https://adamas-project.com/downloads/decision-ledger-standard.schema.json
curl -o ~/Vault/_system/entry-template.md \
  https://adamas-project.com/downloads/decision-ledger-entry-template.md
```

- [ ] Open Obsidian → "Open folder as vault" → `~/Vault`.
- [ ] Obsidian settings: turn **off** all sync/publish (local only); enable the Templates
      core plugin → folder `_system`; Files & Links → default location for new notes:
      "same folder as current".
- [ ] Folder meaning: `inbox/` = raw material in (transcripts, exports, notes);
      `ledger/<domain>/` = one file per confirmed decision (`SAL-021_short-title.md`);
      `assets/` = generated documents; `sources/` = archived raw material after processing.
- [ ] Create the first ledger entry NOW, from the engagement itself (e.g.
      `ops/OPS-001_adopt-decision-ledger.md`: context = the audit findings; decision =
      run ADAMAS; trade-offs = cost, weekly review discipline). The system is never
      empty at handover, and the client sees the method on their own decision first.

## 5. Backups (15 min) — do not skip

- [ ] Plug in the external SSD → System Settings → Time Machine → add SSD as backup
      destination → **encrypt backups: ON** (passphrase on the credentials sheet).
- [ ] Run the first backup; verify it completes.
- [ ] Calendar reminder for the client: check the Time Machine icon monthly.

## 6. Lockdown & exit criteria

- [ ] Firewall ON (System Settings → Network → Firewall).
- [ ] No port forwarding, no inbound exposure; the vault serves the LAN only.
- [ ] Remote mode: **Screen Sharing OFF again**; demonstrate it's off, on camera.
- [ ] Credentials sheet completed (account password, FileVault key, backup passphrase) —
      handed to the client only; you keep no copy after handover.
- [ ] Photo/screenshot of the running setup for the engagement folder (and, with
      permission, the case study).
