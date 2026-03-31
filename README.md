# Apple MCP Server

An MCP server that exposes macOS system controls and Apple apps as structured tools for Claude. Built with TypeScript and the official `@modelcontextprotocol/sdk`.

**31 tools, 303 actions, 4 resources.** Each Apple app is a single MCP tool with an `action` parameter.

## Requirements

- macOS (tested on macOS 15 with Apple Silicon)
- Node.js 18+
- Claude CLI or any MCP-compatible client
- Some features require "Allow JavaScript from Apple Events" in Safari > Develop

## Setup

```bash
git clone https://github.com/lacausecrypto/apple-mcp-server.git
cd apple-mcp-server
npm install
npm run build
```

Register in your MCP config (`~/.claude/.mcp.json` or project `.mcp.json`):

```json
{
  "mcpServers": {
    "apple": {
      "command": "node",
      "args": ["/absolute/path/to/apple-mcp-server/dist/index.js"]
    }
  }
}
```

## How it works

```
Claude calls apple_music with {action: "now_playing"}
  → index.ts checks permissions (OPEN → proceed)
  → dispatches to domains/music.ts handler
  → handler calls runAppleScript() in executor.ts
  → AppleScript written to temp file, executed via osascript
  → result returned to Claude: "Bohemian Rhapsody — Queen (3:21/5min)"
```

## Permission System

Actions are classified into three levels. **Conservative by default** — destructive actions require explicit confirmation.

### OPEN (default)

Read-only and safe actions execute immediately. No confirmation needed.

```
Claude: apple_volume.get → "Volume: 56%"
Claude: apple_music.now_playing → "Bohemian Rhapsody — Queen"
Claude: apple_sysinfo.battery → "95%; charging"
```

### PROTECTED (27 actions)

Destructive or irreversible actions return a preview and require `confirm: true` to execute.

```
Claude: apple_finder.empty_trash
→ "⚠️ apple_finder.empty_trash requires confirmation.
   Reason: Permanently deletes all items in Trash
   To proceed, call again with confirm: true."

Claude: apple_finder.empty_trash with confirm: true
→ "Trash emptied"
```

Protected actions include: file delete/move/rename, send email/iMessage, post/like/reply on Twitter, delete contacts/notes/reminders/events, force quit apps, system sleep.

### BLOCKED (3 actions)

Never executed. Returns an error with instructions to unblock.

```
Claude: apple_system.shutdown
→ "🚫 apple_system.shutdown is blocked.
   Blocked by default (dangerous system action)."
```

Blocked by default: `shutdown`, `restart`, `logout`.

### Configuration

Override defaults via `~/.config/apple-mcp/permissions.json`:

```json
{
  "blocked": ["empty_trash"],
  "unprotected": ["like", "send"],
  "unblocked": ["restart"],
  "protected": ["play", "pause"]
}
```

| Key | Effect |
|-----|--------|
| `blocked` | Add actions to BLOCKED (on top of defaults) |
| `unprotected` | Move from PROTECTED → OPEN (skip confirmation) |
| `unblocked` | Move from BLOCKED → PROTECTED (allow with confirmation) |
| `protected` | Move from OPEN → PROTECTED (add confirmation) |

Actions can be specified as `"actionName"` (global) or `"apple_tool.actionName"` (specific).

### Rate Limiting

Prevents spam and abuse. Two independent sliding-window counters:

- **Global**: max 30 tool calls per minute (all actions)
- **Protected**: max 5 confirmed destructive actions per minute

When exceeded, the call is rejected with a wait time. Configurable:

```json
{ "rate_limit": { "global_per_min": 60, "protected_per_min": 10 } }
```

### Dry-Run Mode

Preview every action without executing. Useful for testing what Claude would do:

```json
{ "dry_run": true }
```

```
Claude: apple_finder.delete(path: "~/old.pdf", confirm: true)
→ "[DRY RUN] Would execute apple_finder.delete (confirmed) — no action taken."
```

All actions return previews. Nothing is executed. The audit log records `dry_run` events.

### Audit Log

Every tool call is logged as a structured JSON line in `~/.local/occ/rag/apple-mcp-audit.jsonl`:

```json
{"ts":"2026-03-31T18:36:49Z","tool":"apple_volume","action":"get","permission":"open","confirmed":false,"dry_run":false,"result":"ok","duration_ms":104,"output":"Volume: 56%"}
{"ts":"2026-03-31T18:36:52Z","tool":"apple_finder","action":"empty_trash","permission":"protected","confirmed":false,"dry_run":false,"result":"protected_no_confirm","duration_ms":0}
```

Queryable with jq:

```bash
# All blocked calls
cat apple-mcp-audit.jsonl | jq 'select(.result=="blocked")'

# Calls per tool
cat apple-mcp-audit.jsonl | jq -s 'group_by(.tool) | map({tool: .[0].tool, count: length})'

# Average duration per tool
cat apple-mcp-audit.jsonl | jq -s 'group_by(.tool) | map({tool: .[0].tool, avg_ms: (map(.duration_ms) | add / length)})'
```

## Tools

| Tool | # | Actions | Protected/Blocked |
|------|---|---------|-------------------|
| `apple_volume` | 7 | `get` `set` `up` `down` `mute` `unmute` `info` | — |
| `apple_brightness` | 2 | `up` `down` | — |
| `apple_clipboard` | 3 | `get` `set` `clear` | — |
| `apple_apps` | 7 | `open` `quit` `is_running` `list_running` `hide` `activate` `force_quit` | `force_quit` |
| `apple_sysinfo` | 19 | `battery` `disk` `uptime` `ip` `macos_version` `cpu` `memory` `top_processes` `hostname` `resolution` `summary` `bluetooth_devices` `audio_devices` `printers` `displays` `usb_devices` `network_interfaces` `serial_number` `model` | — |
| `apple_music` | 26 | `play` `pause` `stop` `next` `prev` `restart` `now_playing` `shuffle_on` `shuffle_off` `repeat_off` `repeat_one` `repeat_all` `play_playlist` `list_playlists` `set_volume` `love` `dislike` `search` `play_song` `queue_next` `add_to_playlist` `create_playlist` `get_lyrics` `radio` `remove_from_playlist` `delete_playlist` | `delete_playlist` `remove_from_playlist` |
| `apple_spotify` | 17 | `play` `pause` `next` `prev` `now_playing` `set_volume` `shuffle` `playpause` `play_playlist` `list_playlists` `like` `repeat_off` `repeat_on` `search` `play_track` `current_album` `current_artist` | — |
| `apple_safari` | 17 | `open_url` `current_url` `current_title` `list_tabs` `close_tab` `new_tab` `reload` `page_text` `reading_list` `js_execute` `back` `forward` `bookmarks` `history_recent` `private_window` `close_window` `tab_count` | — |
| `apple_chrome` | 14 | `open_url` `current_url` `current_title` `list_tabs` `close_tab` `reload` `js_execute` `back` `forward` `new_window` `new_incognito` `close_window` `tab_count` `new_tab` | — |
| `apple_mail` | 10 | `unread_count` `check` `unread_list` `read_body` `search` `draft` `mailboxes` `send` `mark_all_read` `move_to_trash` | `send` `mark_all_read` `move_to_trash` |
| `apple_calendar` | 8 | `list` `today` `tomorrow` `create_event` `week` `date_events` `delete_event` `modify_event` | `delete_event` `modify_event` |
| `apple_reminders` | 10 | `list_lists` `list` `add` `complete` `set_due` `set_priority` `add_note` `overdue` `create_list` `delete` | `delete` |
| `apple_notes` | 9 | `list` `create` `read` `search` `folders` `move` `append` `count` `delete` | `delete` |
| `apple_finder` | 20 | `open_folder` `reveal` `desktop_files` `trash_count` `create_folder` `file_info` `copy` `get_selection` `tags` `set_tag` `list_folder` `disk_info` `empty_trash` `delete` `move` `rename` `eject_disk` `eject_all` `set_wallpaper` `create_alias` | `empty_trash` `delete` `move` `rename` `eject_disk` `eject_all` `set_wallpaper` |
| `apple_windows` | 14 | `frontmost_app` `minimize` `minimize_all` `maximize` `left_half` `right_half` `fullscreen` `close` `hide_app` `hide_others` `center` `resize` `list_windows` `switch_to` | — |
| `apple_system` | 30 | `sleep_display` `lock` `dark_mode` `dnd_on` `dnd_off` `caffeinate` `decaffeinate` `wifi_status` `wifi_on` `wifi_off` `wifi_network` `bluetooth_on` `bluetooth_off` `run_shortcut` `list_shortcuts` `open_prefs` `display_settings` `sound_settings` `network_settings` `airdrop` `screen_saver` `login_items` `time_machine` `audio_output` `audio_input` `sleep` `eject_all_disks` `shutdown` `restart` `logout` | `sleep` `eject_all_disks` · Blocked: `shutdown` `restart` `logout` |
| `apple_screenshot` | 5 | `full` `clipboard` `timed` `area` `window` | — |
| `apple_notification` | 1 | `send` | — |
| `apple_keyboard` | 8 | `type_text` `press_key` `copy` `paste` `undo` `redo` `save` `select_all` | — |
| `apple_tts` | 3 | `say` `list_voices` `stop` | — |
| `apple_twitter` | 11 | `draft` `save` `list_drafts` `feed` `notifications` `dm_check` `post` `post_draft` `reply` `like` `retweet` | `post` `post_draft` `reply` `like` `retweet` |
| `apple_facetime` | 2 | `call` `audio` | — |
| `apple_maps` | 2 | `open` `directions` | — |
| `apple_contacts` | 9 | `search` `get` `list` `create` `groups` `group_members` `delete` `update_phone` `update_email` | `delete` `update_phone` `update_email` |
| `apple_photos` | 10 | `albums` `recent` `search` `favorites` `album_contents` `export` `count` `create_album` `add_to_album` `import` | — |
| `apple_messages` | 5 | `recent` `unread` `conversation` `search` `send` | `send` |
| `apple_podcasts` | 7 | `now_playing` `play` `pause` `next` `shows` `episodes` `search` | — |
| `apple_books` | 5 | `library` `reading_now` `collections` `search` `open` | — |
| `apple_iwork` | 11 | `pages_create` `pages_open` `pages_export_pdf` `numbers_create` `numbers_open` `numbers_export_pdf` `keynote_create` `keynote_open` `keynote_export_pdf` `keynote_start_slideshow` `keynote_stop_slideshow` | — |
| `apple_preview` | 4 | `open` `list_open` `close` `close_all` | — |
| `apple_textedit` | 7 | `create` `open` `get_text` `set_text` `save` `close` `list_open` | — |

## Security

### What this provides

**Permission system** — Three-level access control (OPEN/PROTECTED/BLOCKED) enforced before execution. Protected actions require `confirm: true`. Configurable via JSON file.

**Rate limiting** — Sliding-window counters: 30 calls/min global, 5 protected/min. Prevents abuse loops.

**Dry-run mode** — All actions return previews without executing. Safe testing of what Claude would do.

**Structured audit log** — Every call logged as JSON line (tool, action, permission, result, duration). Queryable with jq.

**Input validation** — Not sandboxing. The server validates inputs before passing them to AppleScript or shell:

| Function | What it does |
|----------|-------------|
| `safePath()` | **Allowlist**: only permits paths under `~/`, `/tmp`, `/Volumes/nvme`, `/Applications`. Everything else rejected. |
| `safeAS()` | Escapes `\` and `"` for AppleScript string interpolation. Prevents script injection inside quoted strings. |
| `safeSQL()` | Escapes quotes, strips `;`, `--`, `/* */`, UNION, DDL keywords, hex literals. Used for iMessage sqlite3 queries. |
| `safeAppName()` | Strips shell metacharacters from app names. |

**Concurrency** — `withLock()` serializes Safari and Chrome tab operations to prevent race conditions.

**Execution safety** — AppleScript runs via temp `.scpt` files (not `-e` flag). Shell commands use `execFile` with array arguments (no shell interpolation).

**Auto-launch** — Apps that aren't running are launched automatically on `-600` error and retried once.

**Logging** — All tool calls, permission checks, and errors logged to `~/.local/occ/rag/apple-mcp.log`.

### What this does NOT provide

- **No sandboxing.** The Node process runs with your full user privileges. It can do anything you can do.
- **No network isolation.** The server communicates via stdio (local only), but the actions it executes (email, tweets, etc.) reach the internet.
- **No encryption.** Log files and the permission config are plain text.
- **No authentication on the MCP transport.** Any process that can connect to stdio can call tools.
- **safePath is an allowlist, not a jail.** It prevents operations on system paths, but `~/` is allowed — which includes `~/Library`, `~/.ssh`, etc.

**This is suitable for personal use on your own Mac.** It is not designed for multi-user environments or adversarial contexts.

## Resources

| URI | Description |
|-----|-------------|
| `apple://now-playing` | Current track from Apple Music or Spotify |
| `apple://system-info` | Battery, disk, uptime, CPU load, RAM |
| `apple://open-tabs/safari` | All open Safari tabs |
| `apple://open-tabs/chrome` | All open Chrome tabs |

## Adding a new domain

1. Create `src/domains/myapp.ts` (see existing domains for pattern)
2. Import and register in `src/registry.ts`
3. If destructive, add to `DEFAULT_PROTECTED` in `src/permissions.ts`
4. `npm run build && npm test`

## Testing

```bash
npm run build
npm test    # 135 tests (executor + registry + permissions)
```

## Known limitations

- **Books and Podcasts** have limited AppleScript support. Some actions return generic errors.
- **Spotify** doesn't expose playlists or "like" via AppleScript. Uses URL schemes as fallback.
- **Safari JS execution** requires "Allow JavaScript from Apple Events" in Safari > Develop.
- **Twitter/X** actions depend on the current DOM structure, which may change.
- **safePath** allows all of `~/` — including sensitive directories like `~/.ssh` and `~/Library`.

## Logging

`~/.local/occ/rag/apple-mcp.log`

## Project structure

```
src/
  index.ts          Server entry, permission enforcement, tool dispatch
  permissions.ts    Three-level permission system with config file
  types.ts          Interfaces: ExecResult, DomainModule, DomainAction, ResourceDef
  executor.ts       Execution layer: AppleScript, shell, caching, locking, safety
  registry.ts       Domain registry and JSON Schema builder
  domains/          31 domain files (one per Apple app/category)
  resources/        4 MCP resource providers
tests/
  executor.test.js  Safety function tests
  registry.test.js  Domain registration tests
  permissions.test.js  Permission system tests
```

## License

MIT