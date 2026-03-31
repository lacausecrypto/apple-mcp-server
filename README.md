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

## Tools

| Tool | Actions | Notable protected/blocked |
|------|---------|--------------------------|
| `apple_volume` | 7 | — |
| `apple_brightness` | 2 | — |
| `apple_clipboard` | 3 | — |
| `apple_apps` | 7 | force_quit (protected) |
| `apple_sysinfo` | 19 | — |
| `apple_music` | 26 | delete_playlist, remove_from_playlist (protected) |
| `apple_spotify` | 17 | — |
| `apple_safari` | 17 | — |
| `apple_chrome` | 14 | — |
| `apple_mail` | 10 | send, mark_all_read, move_to_trash (protected) |
| `apple_calendar` | 8 | delete_event, modify_event (protected) |
| `apple_reminders` | 10 | delete (protected) |
| `apple_notes` | 9 | delete (protected) |
| `apple_finder` | 20 | empty_trash, delete, move, rename, eject (protected) |
| `apple_windows` | 14 | — |
| `apple_system` | 30 | sleep (protected); shutdown, restart, logout (blocked) |
| `apple_screenshot` | 5 | — |
| `apple_notification` | 1 | — |
| `apple_keyboard` | 8 | — |
| `apple_tts` | 3 | — |
| `apple_twitter` | 11 | post, reply, like, retweet (protected) |
| `apple_facetime` | 2 | — |
| `apple_maps` | 2 | — |
| `apple_contacts` | 9 | delete, update_phone, update_email (protected) |
| `apple_photos` | 10 | — |
| `apple_messages` | 5 | send (protected) |
| `apple_podcasts` | 7 | — |
| `apple_books` | 5 | — |
| `apple_iwork` | 11 | — |
| `apple_preview` | 4 | — |
| `apple_textedit` | 7 | — |

## Security

### What this provides

**Permission system** — Three-level access control (OPEN/PROTECTED/BLOCKED) enforced before execution. Protected actions require explicit `confirm: true`. Configurable via JSON file.

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