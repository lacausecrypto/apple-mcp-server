/**
 * AppleScript & Shell Execution Layer
 *
 * All system commands go through this module.
 * - Temp files for AppleScript (prevents injection)
 * - execFile with array args for shell (prevents shell injection)
 * - Clean error messages (strips temp file paths, translates -600 errors)
 * - Auto-launch apps on -600 (app not running) with retry
 * - Logging to file for debugging
 * - Response caching for expensive operations
 * - Concurrency guard for single-resource tools (Safari, etc.)
 * - Path sanitization for file operations
 */

import { writeFileSync, unlinkSync, appendFileSync, existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { tmpdir, homedir } from "node:os";
import { join, resolve, normalize } from "node:path";
import { randomUUID } from "node:crypto";
import type { ExecResult } from "./types.js";

// ══════════════════════════════════════════════════════════════════
// LOGGING
// ══════════════════════════════════════════════════════════════════

const LOG_DIR = join(homedir(), ".local/occ/rag");
const LOG_FILE = join(LOG_DIR, "apple-mcp.log");

/**
 * Append a timestamped log line to the MCP log file.
 *
 * ERROR-level messages are also written to stderr.
 * Failures to write are silently ignored (e.g., if the log directory doesn't exist).
 *
 * @param level - Severity: "INFO", "WARN", or "ERROR"
 * @param msg - Human-readable message to log
 */
export function log(level: "INFO" | "WARN" | "ERROR", msg: string): void {
  const ts = new Date().toISOString().replace("T", " ").slice(0, 19);
  const line = `${ts} [${level}] ${msg}\n`;
  try {
    appendFileSync(LOG_FILE, line);
  } catch {
    // Can't log — ignore silently
  }
  if (level === "ERROR") {
    process.stderr.write(line);
  }
}

// ══════════════════════════════════════════════════════════════════
// ERROR CLEANING
// ══════════════════════════════════════════════════════════════════

// Known AppleScript error codes → human-readable messages
const AS_ERROR_MAP: Record<string, string> = {
  "-600": "App not running",
  "-1708": "App doesn't understand this command",
  "-1712": "User cancelled",
  "-1728": "Item not found",
  "-10810": "App failed to launch",
  "-1743": "Not authorized (check System Preferences > Privacy)",
  "-1719": "Invalid index",
  "-609": "Connection to app lost",
};

/**
 * Clean raw AppleScript/shell error into human-readable message.
 * Strips temp file paths, translates error codes, extracts app names.
 */
function cleanError(raw: string): { message: string; code: string | null; appName: string | null } {
  let code: string | null = null;
  let appName: string | null = null;

  // Extract error code like (-600)
  const codeMatch = raw.match(/\((-?\d+)\)\s*$/);
  if (codeMatch) {
    code = codeMatch[1];
  }

  // Extract app name from "Erreur dans AppName :" or "AppName got an error"
  // Supports multi-word names like "Google Chrome", "Apple Music"
  const appMatch =
    raw.match(/Erreur dans ([\w][\w\s-]*?)\s*:/) ||
    raw.match(/error:\s*([\w][\w\s-]*?)\s+got an error/i) ||
    raw.match(/([\w][\w\s-]*?):\s*L'application/i) ||
    raw.match(/application "([\w][\w\s-]*?)"/i);
  if (appMatch) {
    appName = appMatch[1].trim();
  }

  // Build clean message
  if (code && AS_ERROR_MAP[code]) {
    const base = AS_ERROR_MAP[code];
    if (appName) {
      return { message: `${appName}: ${base}`, code, appName };
    }
    return { message: base, code, appName };
  }

  // Strip temp file paths: /var/folders/.../apple-mcp-xxx.scpt:NN:NN:
  let cleaned = raw.replace(/\/[\w\/.-]+apple-mcp-[\w.-]+\.scpt:\d+:\d+:\s*/g, "");

  // Strip "execution error: " prefix
  cleaned = cleaned.replace(/^execution error:\s*/i, "");

  // Strip "Command failed: osascript ..." prefix
  cleaned = cleaned.replace(/^Command failed:\s*osascript\s+[\w\/.-]+\s*/g, "");

  // Limit length
  cleaned = cleaned.trim().slice(0, 200);

  return { message: cleaned || raw.slice(0, 200), code, appName };
}

// ══════════════════════════════════════════════════════════════════
// AUTO-LAUNCH APPS
// ══════════════════════════════════════════════════════════════════

/**
 * Launch an app and wait for it to be ready.
 */
async function launchApp(appName: string): Promise<boolean> {
  log("INFO", `Auto-launching ${appName}...`);
  const r = await runShell(["open", "-a", appName]);
  if (!r.ok) return false;

  // Wait up to 5s for the app to be ready
  for (let i = 0; i < 10; i++) {
    await new Promise((res) => setTimeout(res, 500));
    const check = await _execAppleScript(
      `tell application "System Events" to return (name of processes) contains "${safeAS(appName)}"`,
      3000,
    );
    if (check.ok && check.output === "true") {
      log("INFO", `${appName} launched successfully`);
      return true;
    }
  }
  return false;
}

// Apps that should be auto-launched on -600
const AUTO_LAUNCH_APPS = new Set([
  "Mail", "Calendar", "Reminders", "Notes", "Contacts",
  "Photos", "Podcasts", "Books", "Music", "Spotify",
  "Pages", "Numbers", "Keynote", "TextEdit", "Preview",
]);

// ══════════════════════════════════════════════════════════════════
// APPLESCRIPT EXECUTION — internal (no auto-launch)
// ══════════════════════════════════════════════════════════════════

function _execAppleScript(script: string, timeoutMs: number): Promise<ExecResult> {
  return new Promise((resolve) => {
    const tmp = join(tmpdir(), `apple-mcp-${randomUUID()}.scpt`);
    try {
      writeFileSync(tmp, script, "utf-8");
    } catch (err) {
      resolve({ ok: false, output: `Failed to write script: ${err}` });
      return;
    }

    execFile(
      "osascript",
      [tmp],
      { timeout: timeoutMs, encoding: "utf-8" },
      (err, stdout, stderr) => {
        try { unlinkSync(tmp); } catch { /* ignore */ }

        if (err) {
          const raw = stderr?.trim() || err.message || "Unknown error";
          resolve({ ok: false, output: raw });
          return;
        }
        resolve({ ok: true, output: (stdout || "").trim() });
      },
    );
  });
}

// ══════════════════════════════════════════════════════════════════
// APPLESCRIPT EXECUTION — public (with auto-launch + clean errors)
// ══════════════════════════════════════════════════════════════════

/**
 * Execute AppleScript via temp file with auto-launch and clean errors.
 *
 * The script is written to a temp `.scpt` file and run with `osascript`,
 * preventing shell injection. On `-600` (app not running) errors for known
 * safe apps, the app is launched automatically and the script retried once.
 *
 * @param script - Raw AppleScript source to execute
 * @param timeoutMs - Maximum execution time in milliseconds (default: 10000)
 * @returns Execution result with `ok` boolean and `output` string
 *
 * @example
 * ```ts
 * const r = await runAppleScript('tell application "Music" to get player state');
 * if (r.ok) console.log(r.output); // "playing"
 * ```
 *
 * @example
 * ```ts
 * // Long-running script with extended timeout
 * const r = await runAppleScript('tell application "Photos" to search for "beach"', 30_000);
 * ```
 */
export async function runAppleScript(
  script: string,
  timeoutMs = 10_000,
): Promise<ExecResult> {
  const result = await _execAppleScript(script, timeoutMs);

  if (result.ok) return result;

  // Clean the error
  const { message, code, appName } = cleanError(result.output);

  // Auto-launch on -600 (app not running)
  if (code === "-600" && appName && AUTO_LAUNCH_APPS.has(appName)) {
    log("INFO", `Got -600 for ${appName}, auto-launching...`);
    const launched = await launchApp(appName);
    if (launched) {
      // Retry the original script
      const retry = await _execAppleScript(script, timeoutMs);
      if (retry.ok) return retry;
      // Clean retry error too
      const retryClean = cleanError(retry.output);
      log("WARN", `Retry failed for ${appName}: ${retryClean.message}`);
      return { ok: false, output: retryClean.message };
    }
    return { ok: false, output: `${appName}: failed to launch` };
  }

  log("WARN", `AppleScript error: ${message}`);
  return { ok: false, output: message };
}

// ══════════════════════════════════════════════════════════════════
// SHELL EXECUTION
// ══════════════════════════════════════════════════════════════════

/**
 * Execute a shell command safely.
 *
 * When given an array, uses `execFile` directly (no shell, no injection).
 * When given a string with shell metacharacters (`|><&;$\``), uses `/bin/sh -c`.
 * Otherwise, splits the string on whitespace and uses `execFile`.
 *
 * @param cmd - Command as an array `["binary", "arg1", "arg2"]` or a string
 * @param timeoutMs - Maximum execution time in milliseconds (default: 10000)
 * @returns Execution result with `ok` boolean and `output` string (truncated to 300 chars on error)
 */
export function runShell(
  cmd: string | string[],
  timeoutMs = 10_000,
): Promise<ExecResult> {
  return new Promise((resolve) => {
    let binary: string;
    let args: string[];

    if (Array.isArray(cmd)) {
      binary = cmd[0];
      args = cmd.slice(1);
    } else if (/[|><&;$`\\]/.test(cmd)) {
      binary = "/bin/sh";
      args = ["-c", cmd];
    } else {
      const parts = cmd.split(/\s+/);
      binary = parts[0];
      args = parts.slice(1);
    }

    execFile(
      binary,
      args,
      { timeout: timeoutMs, encoding: "utf-8" },
      (err, stdout, stderr) => {
        if (err) {
          const msg = stderr?.trim() || err.message || "Unknown error";
          resolve({ ok: false, output: msg.slice(0, 300) });
          return;
        }
        resolve({ ok: true, output: (stdout || "").trim() });
      },
    );
  });
}

// ══════════════════════════════════════════════════════════════════
// STRING SAFETY
// ══════════════════════════════════════════════════════════════════

/**
 * Escape a string for safe interpolation inside AppleScript double-quoted strings.
 *
 * Escapes backslashes and double quotes, and strips null bytes.
 *
 * @param s - Raw string to escape
 * @returns Escaped string safe for `"..."` interpolation in AppleScript
 *
 * @example
 * ```ts
 * const query = safeAS('search for "hello"');
 * const script = `tell application "Notes" to search "${query}"`;
 * // query = 'search for \\"hello\\"'
 * ```
 */
export function safeAS(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\0/g, "");
}

/**
 * Sanitize an application name for safe shell and AppleScript use.
 *
 * Strips all characters except alphanumeric, spaces, dots, hyphens, and underscores.
 * The result is trimmed of leading/trailing whitespace.
 *
 * @param name - Raw application name
 * @returns Sanitized name containing only safe characters
 */
export function safeAppName(name: string): string {
  return name.replace(/[^a-zA-Z0-9 .\-_]/g, "").trim();
}

// ══════════════════════════════════════════════════════════════════
// PATH SANITIZATION
// ══════════════════════════════════════════════════════════════════

// Allowlist: ONLY these path prefixes are permitted for file operations.
// Everything else is rejected. This is safer than a blocklist because
// new dangerous paths are blocked by default.
const ALLOWED_PREFIXES = [
  homedir(),               // ~/  (Desktop, Documents, Downloads, etc.)
  "/tmp",                  // Temp files
  "/private/tmp",          // macOS /tmp symlink target
  "/Volumes/nvme",         // External NVMe drive
  "/Applications",         // App bundles (read-only mostly)
];

/**
 * Validate and sanitize a file path using an **allowlist** approach.
 *
 * Only paths under explicitly allowed prefixes are accepted.
 * Resolves `~`, normalizes to absolute, rejects `..` traversal.
 *
 * Allowed: ~/anything, /tmp/*, /Volumes/nvme/*, /Applications/*
 * Blocked: everything else (/System, /usr, /etc, /var, /Library, ...)
 *
 * @param inputPath - Raw file path (absolute, relative, or `~`-prefixed)
 * @returns Resolved absolute path, or `null` if not under an allowed prefix
 *
 * @example
 * ```ts
 * safePath("~/Documents/file.txt")   // "/Users/martin/Documents/file.txt"
 * safePath("/tmp/test.txt")           // "/tmp/test.txt"
 * safePath("/Volumes/nvme/projet")    // "/Volumes/nvme/projet"
 * safePath("/System/Library/Fonts")   // null (not in allowlist)
 * safePath("/etc/passwd")             // null (not in allowlist)
 * safePath("")                        // null (empty)
 * ```
 */
export function safePath(inputPath: string): string | null {
  if (!inputPath || typeof inputPath !== "string") return null;

  // Expand ~ to home
  let resolved = inputPath.startsWith("~")
    ? inputPath.replace(/^~/, homedir())
    : inputPath;

  // Resolve to absolute
  resolved = resolve(normalize(resolved));

  // Block path traversal
  if (resolved.includes("..")) return null;

  // Allowlist check — must be under an allowed prefix
  const allowed = ALLOWED_PREFIXES.some((prefix) => resolved.startsWith(prefix));
  if (!allowed) return null;

  return resolved;
}

// ══════════════════════════════════════════════════════════════════
// RESPONSE CACHE
// ══════════════════════════════════════════════════════════════════

interface CacheEntry {
  value: string;
  ts: number;
}

const _cache = new Map<string, CacheEntry>();
const _inflight = new Map<string, Promise<ExecResult>>();

/**
 * Cache a function result for a given TTL, returning the cached value on subsequent calls.
 *
 * Race-condition safe: if two calls arrive simultaneously for the same key,
 * only one executes `fn()` — the other waits and reuses the result.
 *
 * Only successful results (`ok: true`) are cached. Failed results are never cached,
 * so the next call will retry the function.
 *
 * @param key - Unique cache key (e.g., `"sysinfo.audio"`)
 * @param ttlMs - Time-to-live in milliseconds before the entry expires
 * @param fn - Async function producing the result to cache
 * @returns The cached or freshly computed `ExecResult`
 */
export async function cached(
  key: string,
  ttlMs: number,
  fn: () => Promise<ExecResult>,
): Promise<ExecResult> {
  // Check cache
  const now = Date.now();
  const entry = _cache.get(key);
  if (entry && (now - entry.ts) < ttlMs) {
    return { ok: true, output: entry.value };
  }

  // Check if already in-flight (another call is computing this key)
  const existing = _inflight.get(key);
  if (existing) {
    return existing;
  }

  // Compute and track in-flight
  const promise = fn().then((result) => {
    if (result.ok) {
      _cache.set(key, { value: result.output, ts: Date.now() });
    }
    _inflight.delete(key);
    return result;
  }).catch((err) => {
    _inflight.delete(key);
    return { ok: false, output: String(err) } as ExecResult;
  });

  _inflight.set(key, promise);
  return promise;
}

/**
 * Clear all cached execution results.
 *
 * Useful for forcing fresh data after a state change (e.g., after modifying a playlist).
 */
export function clearCache(): void {
  _cache.clear();
}

// ══════════════════════════════════════════════════════════════════
// CONCURRENCY GUARD
// ══════════════════════════════════════════════════════════════════

/**
 * Queue-based lock per resource. Each resource has a chain of promises.
 * New callers append to the chain, ensuring strict serialization.
 */
const _lockChains = new Map<string, Promise<void>>();

/**
 * Serialize access to a shared resource, preventing concurrent operations.
 *
 * Uses a promise-chain approach (not polling) that is race-condition free:
 * each caller appends to the chain for the resource, guaranteeing FIFO order.
 *
 * @param resource - Lock name identifying the shared resource (e.g., `"safari"`, `"chrome"`)
 * @param fn - Async function to execute while holding the lock
 * @returns The return value of `fn`
 */
export async function withLock<T>(resource: string, fn: () => Promise<T>): Promise<T> {
  // Get the current tail of the chain (or resolved if no chain)
  const prev = _lockChains.get(resource) ?? Promise.resolve();

  // Create a new link in the chain
  let releaseLock: () => void;
  const myLock = new Promise<void>((res) => { releaseLock = res; });

  // Append our lock BEFORE awaiting (atomic — no gap for race)
  _lockChains.set(resource, myLock);

  // Wait for the previous holder to finish
  await prev;

  try {
    return await fn();
  } finally {
    // Clean up if we're the tail
    if (_lockChains.get(resource) === myLock) {
      _lockChains.delete(resource);
    }
    releaseLock!();
  }
}

// ══════════════════════════════════════════════════════════════════
// SQL SAFETY
// ══════════════════════════════════════════════════════════════════

/**
 * Escape a string for safe inclusion in a SQLite query.
 *
 * Prevents SQL injection by:
 * - Doubling single quotes (`'` -> `''`)
 * - Stripping semicolons (prevents multi-statement execution)
 * - Stripping SQL comment markers (`--`)
 * - Stripping null bytes
 * - Limiting output to 500 characters
 *
 * @param s - Raw string to escape for SQL use
 * @returns Escaped string safe for single-quoted SQL string literals
 */
export function safeSQL(s: string): string {
  return s
    .replace(/'/g, "''")           // Escape single quotes
    .replace(/;/g, "")             // Strip semicolons (prevent multi-statement)
    .replace(/--/g, "")            // Strip line comments
    .replace(/\/\*/g, "")          // Strip block comment open
    .replace(/\*\//g, "")          // Strip block comment close
    .replace(/\b(?:UNION|INTERSECT|EXCEPT)\b/gi, "") // Strip set operators
    .replace(/\b(?:DROP|ALTER|CREATE|INSERT|UPDATE|DELETE|ATTACH|DETACH|TABLE|INDEX|TRIGGER|VIEW)\b/gi, "") // Strip DDL/DML
    .replace(/0x[0-9a-fA-F]+/g, "0") // Neutralize hex literals
    .replace(/\0/g, "")            // Strip null bytes
    .slice(0, 500);                 // Limit length
}
