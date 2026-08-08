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

Claude Code rings the terminal bell when it finishes or needs an answer, and
AuraMux turns that into a badge on the tab, so a session can be left running in
the background.

Claude Code only enables that by itself in a few terminals, so AuraMux offers to
set it up on first launch. It writes one key into `~/.claude/settings.json`,
backs the file up first, keeps every other setting, and refuses to modify a file
it cannot parse.

## Why it installs as Aura

The product is AuraMux, but the application on disk is still called Aura and the
menu bar says Aura. That is deliberate. macOS ties your passcode, your Full Disk
Access grant and your saved settings to the bundle identifier and the Keychain
entry, so renaming those would have quietly reset all three. `open -a Aura`
keeps working, and so do installs pointing at the previous repository URLs.

## Updating

AuraMux checks once a day and shows a banner when a newer build exists. The
banner copies the install command for you. Quit the app, paste it into a
terminal, and you are on the new version. Sessions, scrollback, saved themes,
your passcode and your Full Disk Access grant all carry over untouched.

The installer refuses to replace a running copy, so quitting first matters.

## Report a bug

Use **Help → Report a Bug…** inside the app, which pre-fills your version and
macOS details, or open an
[issue](https://github.com/rmehdee/auramux-releases/issues/new).

---

Full details, the interface walkthrough and the FAQ:
[robinmehdee.com/auramux](https://robinmehdee.com/auramux)

Built by [Robin Mehdee](https://robinmehdee.com). © 2026
