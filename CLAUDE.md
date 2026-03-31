# Apple MCP Server

MCP server exposing macOS system controls and Apple apps as structured tools for Claude.

## Architecture

- `src/index.ts` — MCP server (stdio transport, tool/resource handlers)
- `src/executor.ts` — AppleScript/shell execution layer (temp file pattern, auto-launch, caching, logging, security)
- `src/registry.ts` — Domain auto-registration + JSON Schema builder
- `src/types.ts` — Shared interfaces (DomainModule, ExecResult, ResourceDef)
- `src/domains/*.ts` — One file per Apple app/category (31 files)
- `src/resources/*.ts` — MCP resources (read-only data)

## Adding a new domain

1. Create `src/domains/myapp.ts` exporting a `DomainModule`
2. Import it in `src/registry.ts` and add to `ALL_DOMAINS`
3. `npm run build`

## Key patterns

- All AppleScript executed via temp file (`runAppleScript`) — never inline `-e`
- User strings escaped with `safeAS()` before AppleScript interpolation
- File paths validated with `safePath()` — blocks system paths and traversal
- SQL strings sanitized with `safeSQL()` — prevents injection in sqlite3 queries
- Expensive calls cached with `cached(key, ttlMs, fn)` — 30s TTL for system_profiler
- Concurrent access serialized with `withLock(resource, fn)` — for Safari/Chrome
- Apps auto-launched on -600 error (app not running) with one retry
- Destructive actions flagged in response with warning emoji

## Build & test

```bash
npm run build          # Compile TypeScript
npm run dev            # Watch mode
node dist/index.js     # Run server (stdio)
```

## Log file

`~/.local/occ/rag/apple-mcp.log`

## Registration

Registered in `/Volumes/nvme/projet claude/OCC 3/.mcp.json` as `"apple"` alongside `chain-orchestrator`.