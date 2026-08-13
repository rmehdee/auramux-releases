# AuraMux

A native macOS terminal for running AI coding CLIs across many long-lived
sessions. Every task gets its own tab, all of them come back after a restart,
and the ones waiting on you are marked so you can tell at a glance.

Free, currently in beta.

## Install

```
curl -fsSL https://github.com/rmehdee/auramux-releases/releases/latest/download/install.sh | bash
```

Then `open -a Aura`.

Use the command rather than downloading the DMG in a browser. AuraMux is ad-hoc
signed but not notarized yet, and macOS blocks an un-notarized app on first
launch only when the file carries the `com.apple.quarantine` attribute. Browsers
attach it, curl does not, so a build installed this way opens with no warning and
no trip to System Settings. Nothing is bypassed or stripped, the flag is simply
never applied. Notarization needs a paid Apple Developer account and is a
post-beta job.

To install somewhere other than /Applications, set `AURA_DEST` first.

## Requirements

- macOS 14 (Sonoma) or later
- Apple Silicon or Intel, universal build

## What it does

- One tab per session, renamed by double-clicking, with the git branch and a
  marker when the tree is dirty
- An amber bell on any session waiting for input, and a cyan dot on any session
  with new output since you last looked
- Autosave every 20 seconds, with every session restored on launch
- Archive sessions you are done with, then restore or delete them later
- Split view, two sessions side by side, with a draggable divider
- Seven terminal themes, switchable live with per-color brightness
- Command palette, find across 10,000 lines of scrollback per session,
  screenshot to Desktop, kill and reset
- Optional passcode lock or Touch ID. It gates the app window only and does not
  encrypt stored sessions or scrollback.
- No telemetry. The only network request it makes is a daily update check.

### Claude Code notifications

AuraMux badges any tab whose program rings the terminal bell, so a session can
be left running in the background and it will tell you when it wants you.

Claude Code only sends that signal automatically in a few terminals, and AuraMux
is not one of them, so on first launch it offers to switch it on for you. It also
detects Claude Code's fullscreen render mode, which bypasses the scrollback
entirely and would leave tabs restoring empty. Either fix is one click: AuraMux
edits `~/.claude/settings.json`, backs the file up first, keeps every other
setting, and refuses to modify a file it cannot parse.

## Why it installs as Aura

The product is AuraMux, but the application on disk is still called Aura and the
menu bar says Aura. That is deliberate. macOS ties your passcode, your Full Disk
Access grant and your saved settings to the bundle identifier and the Keychain
entry, so renaming those would have quietly reset all three. `open -a Aura`
keeps working, and so do installs pointing at the previous repository URLs.

## Updating

AuraMux checks once a day and shows a banner when a newer build exists. The
banner copies the install command for you; paste it into any terminal, including
an AuraMux tab. The installer quits the app for you, saving your sessions first,
installs, and reopens it.

Sessions, scrollback, saved themes, your passcode and your Full Disk Access grant
all carry over untouched.

### If macOS asks about modifying other applications

On macOS 15 and later, updating from inside an AuraMux tab prompts once to allow AuraMux to "modify
other applications". That is the update replacing `Aura.app`, and macOS credits it to whichever app
owns the shell you typed the command into. It takes effect after AuraMux reopens, so answering later
does not interrupt the update in progress.

The permission is broad: it covers any application, not only AuraMux. Running the update command in
**Terminal** instead avoids it entirely.

## Roadmap

AuraMux is in beta and built after hours, so nothing here carries a date. Roughly
in order of priority:

**Persistent sessions.** Today a tab restores its folder and its scrollback, but
the programs inside it stop when the app quits. The shell runs as a child of the
application, which is true of every terminal emulator. The goal is genuine detach
and reattach, so a long build or a running agent survives a restart rather than
just its output being replayed. The likely route is opt-in `tmux` integration
rather than reimplementing what `tmux` already does well.

**Notarized builds.** Removes the install command as a requirement and lets a
browser download open directly, with no security warning. Needs a paid Apple
Developer account; planned for 1.0.

**Encrypted scrollback.** Session history is written owner-only but unencrypted,
and terminal output can contain secrets. Planned: encryption at rest, plus an
opt-out and a purge control for anyone who would rather keep less on disk.

**Broader tool awareness.** AuraMux already recognises Claude Code settings that
silently break notifications or session restore, and offers to correct them. The
same treatment for other CLIs as the patterns become clear.

### Not planned

macOS only, with no Windows or Linux build. No plugin system, no scripting API, and
no AI built into the terminal itself. AuraMux is a place to run those tools well,
not another one of them.

Ideas and votes are welcome in
[Discussions](https://github.com/rmehdee/auramux-releases/discussions).

## Feedback and bug reports

**Help → Report a Bug…** inside the app pre-fills your version and macOS details,
or open an [issue](https://github.com/rmehdee/auramux-releases/issues/new)
directly.

**Help → Write a Review…** opens the
[Reviews board](https://github.com/rmehdee/auramux-releases/discussions/new?category=reviews).
If AuraMux is useful to you, that is the most helpful thing you can do for it.

---

Full details, the interface walkthrough and the FAQ:
[robinmehdee.com/auramux](https://robinmehdee.com/auramux)

Built by [Robin Mehdee](https://robinmehdee.com). © 2026
