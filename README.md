# Apple MCP Server

An MCP (Model Context Protocol) server that exposes macOS system controls and Apple apps as structured tools for Claude. Built with TypeScript and the official `@modelcontextprotocol/sdk`.

**31 tools, 303 actions, 4 resources.** Each Apple app is a single MCP tool with an `action` parameter — Claude sees the available actions and calls them directly.

Everything runs via AppleScript and shell commands. No API keys, no external services, no dependencies beyond the MCP SDK and Zod.

## Requirements

- macOS (tested on macOS 15 / Sequoia with Apple Silicon)
- Node.js 18+
- Claude CLI or any MCP-compatible client
- Some features require: "Allow JavaScript from Apple Events" enabled in Safari > Develop menu

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

Claude calls a tool like `apple_music` with `{"action": "now_playing"}`. The server dispatches to the Music domain handler, which executes AppleScript via a temp file and returns the result.

```
Claude  ──stdio──>  index.ts (dispatch)
                       │
                   registry.ts (find domain + validate params)
                       │
                   domains/music.ts (handler)
                       │
                   executor.ts (runAppleScript via temp file)
                       │
                   osascript ──> Apple Music
```

If an app isn't running, the server auto-launches it and retries once.

## Tools

31 tools covering all major Apple apps and macOS system functions. Each tool groups related actions under a single `action` parameter.

| Tool | # | Actions |
|------|---|---------|
| `apple_volume` | 7 | get, set, up, down, mute, unmute, info |
| `apple_brightness` | 2 | up, down |
| `apple_clipboard` | 3 | get, set, clear |
| `apple_apps` | 7 | open, quit, force_quit, is_running, list_running, hide, activate |
| `apple_sysinfo` | 19 | battery, disk, uptime, ip, macos_version, cpu, memory, top_processes, hostname, resolution, summary, bluetooth_devices, audio_devices, printers, displays, usb_devices, network_interfaces, serial_number, model |
| `apple_music` | 26 | play, pause, stop, next, prev, restart, now_playing, shuffle_on, shuffle_off, repeat_off, repeat_one, repeat_all, play_playlist, list_playlists, set_volume, love, dislike, search, play_song, queue_next, add_to_playlist, remove_from_playlist, create_playlist, delete_playlist, get_lyrics, radio |
| `apple_spotify` | 17 | play, pause, next, prev, now_playing, set_volume, shuffle, playpause, play_playlist, list_playlists, like, repeat_off, repeat_on, search, play_track, current_album, current_artist |
| `apple_safari` | 17 | open_url, current_url, current_title, list_tabs, close_tab, new_tab, reload, page_text, reading_list, js_execute, back, forward, bookmarks, history_recent, private_window, close_window, tab_count |
| `apple_chrome` | 14 | open_url, current_url, current_title, list_tabs, close_tab, reload, js_execute, back, forward, new_window, new_incognito, close_window, tab_count, new_tab |
| `apple_mail` | 10 | unread_count, check, unread_list, send, mark_all_read, read_body, search, draft, mailboxes, move_to_trash |
| `apple_calendar` | 8 | list, today, tomorrow, create_event, delete_event, week, date_events, modify_event |
| `apple_reminders` | 10 | list_lists, list, add, complete, delete, set_due, set_priority, add_note, overdue, create_list |
| `apple_notes` | 9 | list, create, read, search, delete, folders, move, append, count |
| `apple_finder` | 20 | open_folder, reveal, desktop_files, empty_trash, trash_count, eject_disk, eject_all, set_wallpaper, create_folder, file_info, rename, move, copy, delete, create_alias, get_selection, tags, set_tag, list_folder, disk_info |
| `apple_windows` | 14 | frontmost_app, minimize, minimize_all, maximize, left_half, right_half, fullscreen, close, hide_app, hide_others, center, resize, list_windows, switch_to |
| `apple_system` | 30 | sleep, sleep_display, restart, shutdown, logout, lock, dark_mode, dnd_on, dnd_off, caffeinate, decaffeinate, wifi_status, wifi_on, wifi_off, wifi_network, bluetooth_on, bluetooth_off, run_shortcut, list_shortcuts, open_prefs, display_settings, sound_settings, network_settings, airdrop, screen_saver, login_items, eject_all_disks, time_machine, audio_output, audio_input |
| `apple_screenshot` | 5 | full, clipboard, timed, area, window |
| `apple_notification` | 1 | send |
| `apple_keyboard` | 8 | type_text, press_key, copy, paste, undo, redo, save, select_all |
| `apple_tts` | 3 | say, list_voices, stop |
| `apple_twitter` | 11 | post, draft, save, list_drafts, post_draft, reply, like, retweet, feed, notifications, dm_check |
| `apple_facetime` | 2 | call, audio |
| `apple_maps` | 2 | open, directions |
| `apple_contacts` | 9 | search, get, list, create, groups, group_members, delete, update_phone, update_email |
| `apple_photos` | 10 | albums, recent, search, favorites, album_contents, export, count, create_album, add_to_album, import |
| `apple_messages` | 5 | recent, send, unread, conversation, search |
| `apple_podcasts` | 7 | now_playing, play, pause, next, shows, episodes, search |
| `apple_books` | 5 | library, reading_now, collections, search, open |
| `apple_iwork` | 11 | pages_create, pages_open, pages_export_pdf, numbers_create, numbers_open, numbers_export_pdf, keynote_create, keynote_open, keynote_export_pdf, keynote_start_slideshow, keynote_stop_slideshow |
| `apple_preview` | 4 | open, list_open, close, close_all |
| `apple_textedit` | 7 | create, open, get_text, set_text, save, close, list_open |

## Resources

The server also exposes MCP resources (read-only data):

| URI | Description |
|-----|-------------|
| `apple://now-playing` | Current track from Apple Music or Spotify |
| `apple://system-info` | Battery, disk, uptime, CPU load, RAM |
| `apple://open-tabs/safari` | All open Safari tabs (title + URL) |
| `apple://open-tabs/chrome` | All open Chrome tabs (title + URL) |

## Adding a new domain

1. Create `src/domains/myapp.ts`:

```typescript
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_myapp",
  description: "Control MyApp. Actions: do_thing.",
  actions: {
    do_thing: {
      description: "Does a thing",
      handler: async () => {
        const r = await runAppleScript('tell application "MyApp" to do thing');
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
  },
};
export default domain;
```

2. Import and register in `src/registry.ts`
3. `npm run build && npm test`

## Security

All execution goes through `executor.ts` which provides:

| Function | Purpose |
|----------|---------|
| `safeAS(s)` | Escapes `\` and `"` for AppleScript string interpolation |
| `safePath(p)` | Blocks `/System`, `/usr`, `/bin`, `/sbin`, `/private/var` and path traversal |
| `safeSQL(s)` | Escapes quotes, strips `;` and `--`, limits to 500 chars |
| `safeAppName(s)` | Strips shell metacharacters from app names |
| `withLock(resource, fn)` | Serializes concurrent access to Safari/Chrome tabs |
| Temp file execution | AppleScript runs via temp `.scpt` files, not `-e` flag |
| `execFile` with arrays | Shell commands use `execFile` (no shell interpolation) |

Destructive actions (`empty_trash`, `delete`, `shutdown`, `send`, etc.) are flagged in the response.

## Known limitations

- **Books and Podcasts** have very limited AppleScript support. Some actions may return generic errors.
- **Spotify** doesn't expose playlists or "like" via AppleScript. These actions use URL schemes as fallback (opens the Spotify app).
- **Safari JavaScript execution** requires "Allow JavaScript from Apple Events" in Safari > Develop menu.
- **Contacts, Photos, Calendar, Mail** need to be launched before use. The server handles this automatically (auto-launch on -600 error), but the first call may take a few extra seconds.
- **Twitter/X** actions depend on the current Safari DOM structure, which may change.

## Testing

```bash
npm run build
npm test    # 47 tests (executor safety functions + registry validation)
```

## Logging

Tool calls and errors are logged to `~/.local/occ/rag/apple-mcp.log`.

## Project structure

```
src/
  index.ts          Server entry (stdio transport, tool dispatch, destructive warnings)
  types.ts          Interfaces: ExecResult, DomainModule, DomainAction, ResourceDef
  executor.ts       Execution layer: AppleScript, shell, caching, locking, logging, safety
  registry.ts       Domain registry and JSON Schema builder
  domains/          31 domain files (one per Apple app/category)
  resources/        4 MCP resource providers
tests/
  executor.test.js  28 tests for safety functions
  registry.test.js  19 tests for domain registration and schema generation
```

## License

MIT