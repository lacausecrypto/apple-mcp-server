/**
 * Permission System — Conservative by default, configurable bypass.
 *
 * Three permission levels:
 *
 *   OPEN       — Execute immediately. Read-only and safe actions.
 *   PROTECTED  — Requires `confirm: true` param. Without it, returns
 *                a preview of what would happen and asks Claude to confirm.
 *   BLOCKED    — Never executed. Returns an error message.
 *
 * Default classification:
 *   - All actions are OPEN unless listed in PROTECTED_ACTIONS or BLOCKED_ACTIONS
 *   - Destructive/irreversible actions are PROTECTED by default
 *   - Dangerous system actions (shutdown, restart) are BLOCKED by default
 *
 * Configuration:
 *   Users can override defaults via ~/.config/apple-mcp/permissions.json:
 *   {
 *     "blocked": ["shutdown", "restart"],      // actions to block (added to defaults)
 *     "unprotected": ["send", "like"],          // move from PROTECTED → OPEN
 *     "unblocked": ["restart"],                 // move from BLOCKED → PROTECTED
 *     "protected": ["play", "pause"]            // move from OPEN → PROTECTED
 *   }
 */

import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";
import { log } from "./executor.js";

// ══════════════════════════════════════════════════════════════════
// PERMISSION LEVELS
// ══════════════════════════════════════════════════════════════════

export type PermissionLevel = "open" | "protected" | "blocked";

export interface PermissionCheck {
  level: PermissionLevel;
  /** Human-readable reason for protection/blocking */
  reason: string;
}

// ══════════════════════════════════════════════════════════════════
// DEFAULT CLASSIFICATIONS
// ══════════════════════════════════════════════════════════════════

/**
 * Actions that require `confirm: true` by default.
 * Key format: "toolName.actionName" (e.g., "apple_finder.delete")
 * or just "actionName" for global match across all tools.
 */
const DEFAULT_PROTECTED = new Set([
  // Finder — file operations that modify/delete
  "apple_finder.empty_trash",
  "apple_finder.delete",
  "apple_finder.eject_all",
  "apple_finder.eject_disk",
  "apple_finder.rename",
  "apple_finder.move",
  "apple_finder.set_wallpaper",

  // Mail — sends to external
  "apple_mail.send",
  "apple_mail.mark_all_read",
  "apple_mail.move_to_trash",

  // Twitter — visible to public
  "apple_twitter.post",
  "apple_twitter.post_draft",
  "apple_twitter.reply",
  "apple_twitter.like",
  "apple_twitter.retweet",

  // Messages — sends to contacts
  "apple_messages.send",

  // Contacts — modifies data
  "apple_contacts.delete",
  "apple_contacts.update_phone",
  "apple_contacts.update_email",

  // Notes — data modification
  "apple_notes.delete",

  // Reminders — data modification
  "apple_reminders.delete",

  // Music — playlist modification
  "apple_music.delete_playlist",
  "apple_music.remove_from_playlist",

  // Calendar — event modification
  "apple_calendar.delete_event",
  "apple_calendar.modify_event",

  // Apps — force quit can lose unsaved work
  "apple_apps.force_quit",

  // System — sleep can interrupt work
  "apple_system.sleep",
  "apple_system.eject_all_disks",
]);

/**
 * Actions that are NEVER executed by default.
 * Can be moved to PROTECTED via config "unblocked" array.
 */
const DEFAULT_BLOCKED = new Set([
  "apple_system.shutdown",
  "apple_system.restart",
  "apple_system.logout",
]);

// ══════════════════════════════════════════════════════════════════
// USER CONFIG
// ══════════════════════════════════════════════════════════════════

const CONFIG_PATH = join(homedir(), ".config", "apple-mcp", "permissions.json");

interface PermissionsConfig {
  /** Additional actions to block (on top of defaults) */
  blocked?: string[];
  /** Move these from PROTECTED → OPEN (bypass confirmation) */
  unprotected?: string[];
  /** Move these from BLOCKED → PROTECTED (allow with confirmation) */
  unblocked?: string[];
  /** Move these from OPEN → PROTECTED (add confirmation) */
  protected?: string[];
  /** Dry-run mode: ALL actions return preview without executing */
  dry_run?: boolean;
  /** Rate limiting configuration */
  rate_limit?: {
    global_per_min?: number;
    protected_per_min?: number;
  };
}

let _config: PermissionsConfig = {};
let _configLoaded = false;

function loadConfig(): PermissionsConfig {
  if (_configLoaded) return _config;
  _configLoaded = true;

  if (!existsSync(CONFIG_PATH)) {
    log("INFO", "No permissions config found (using defaults)");
    return _config;
  }

  try {
    const raw = readFileSync(CONFIG_PATH, "utf-8");
    _config = JSON.parse(raw);
    log("INFO", `Permissions config loaded: ${CONFIG_PATH}`);

    if (_config.blocked?.length) {
      log("INFO", `  Blocked: ${_config.blocked.join(", ")}`);
    }
    if (_config.unprotected?.length) {
      log("INFO", `  Unprotected: ${_config.unprotected.join(", ")}`);
    }
    if (_config.unblocked?.length) {
      log("INFO", `  Unblocked: ${_config.unblocked.join(", ")}`);
    }
    if (_config.protected?.length) {
      log("INFO", `  Protected: ${_config.protected.join(", ")}`);
    }
  } catch (err) {
    log("WARN", `Failed to parse permissions config: ${err}`);
  }

  return _config;
}

// ══════════════════════════════════════════════════════════════════
// PERMISSION CHECK
// ══════════════════════════════════════════════════════════════════

/**
 * Check the permission level for a specific tool action.
 *
 * Resolution order (first match wins):
 *   1. User config overrides (blocked, unprotected, unblocked, protected)
 *   2. Default BLOCKED set
 *   3. Default PROTECTED set
 *   4. OPEN (default for everything else)
 *
 * Actions are matched by both "toolName.actionName" and bare "actionName".
 */
export function checkPermission(toolName: string, actionName: string): PermissionCheck {
  const config = loadConfig();
  const full = `${toolName}.${actionName}`;

  // Helper: check if an action is in a list (supports both full and bare names)
  const inList = (list: string[] | undefined, key: string, bare: string): boolean => {
    if (!list) return false;
    return list.includes(key) || list.includes(bare);
  };

  // 1. User config: blocked (always wins)
  if (inList(config.blocked, full, actionName)) {
    return { level: "blocked", reason: "Blocked by user config" };
  }

  // 2. User config: unprotected (override PROTECTED → OPEN)
  if (inList(config.unprotected, full, actionName)) {
    return { level: "open", reason: "" };
  }

  // 3. User config: unblocked (override BLOCKED → PROTECTED)
  if (inList(config.unblocked, full, actionName)) {
    return { level: "protected", reason: "Unblocked by user config (confirmation required)" };
  }

  // 4. User config: protected (override OPEN → PROTECTED)
  if (inList(config.protected, full, actionName)) {
    return { level: "protected", reason: "Protected by user config" };
  }

  // 5. Default BLOCKED
  if (DEFAULT_BLOCKED.has(full) || DEFAULT_BLOCKED.has(actionName)) {
    return { level: "blocked", reason: "Blocked by default (dangerous system action)" };
  }

  // 6. Default PROTECTED
  if (DEFAULT_PROTECTED.has(full) || DEFAULT_PROTECTED.has(actionName)) {
    const reasons: Record<string, string> = {
      "apple_finder.empty_trash": "Permanently deletes all items in Trash",
      "apple_finder.delete": "Moves file to Trash",
      "apple_mail.send": "Sends an email to an external recipient",
      "apple_twitter.post": "Posts a public tweet",
      "apple_twitter.reply": "Posts a public reply",
      "apple_twitter.like": "Publicly likes a tweet",
      "apple_messages.send": "Sends an iMessage to a contact",
      "apple_contacts.delete": "Permanently deletes a contact",
      "apple_notes.delete": "Permanently deletes a note",
      "apple_calendar.delete_event": "Deletes a calendar event",
      "apple_apps.force_quit": "Force quits an app (unsaved work may be lost)",
      "apple_system.sleep": "Puts the Mac to sleep",
      "apple_music.delete_playlist": "Permanently deletes a playlist",
    };
    return {
      level: "protected",
      reason: reasons[full] || "Destructive or irreversible action",
    };
  }

  // 7. Default: OPEN
  return { level: "open", reason: "" };
}

/**
 * Get a summary of the current permission configuration.
 * Useful for debugging or displaying to the user.
 */
export function getPermissionSummary(): string {
  const config = loadConfig();
  const lines: string[] = [
    `Protected actions: ${DEFAULT_PROTECTED.size} (default)`,
    `Blocked actions: ${DEFAULT_BLOCKED.size} (default)`,
  ];

  if (config.blocked?.length) {
    lines.push(`+ ${config.blocked.length} extra blocked by config`);
  }
  if (config.unprotected?.length) {
    lines.push(`- ${config.unprotected.length} unprotected by config`);
  }
  if (config.unblocked?.length) {
    lines.push(`~ ${config.unblocked.length} unblocked by config`);
  }
  if (config.protected?.length) {
    lines.push(`+ ${config.protected.length} extra protected by config`);
  }

  if (config.dry_run) {
    lines.push("DRY RUN MODE: all actions return preview without executing");
  }
  if (config.rate_limit) {
    lines.push(`Rate limit: ${config.rate_limit.global_per_min ?? 30} global/min, ${config.rate_limit.protected_per_min ?? 5} protected/min`);
  }

  lines.push(`Config: ${existsSync(CONFIG_PATH) ? CONFIG_PATH : "not found (using defaults)"}`);
  return lines.join("\n");
}

/**
 * Check if dry-run mode is enabled.
 */
export function isDryRun(): boolean {
  return loadConfig().dry_run === true;
}

/**
 * Get rate limit config (or defaults).
 */
export function getRateLimitConfig(): { global_per_min: number; protected_per_min: number } {
  const config = loadConfig();
  return {
    global_per_min: config.rate_limit?.global_per_min ?? 30,
    protected_per_min: config.rate_limit?.protected_per_min ?? 5,
  };
}
