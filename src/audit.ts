/**
 * Structured Audit Log — JSON Lines format.
 *
 * Every tool call is logged as a single JSON line with:
 * - Timestamp, tool, action, permission level, confirmed flag
 * - Result status (ok, error, blocked, protected, dry_run, rate_limited)
 * - Duration in milliseconds
 * - Truncated output/error
 *
 * Log file: ~/.local/occ/rag/apple-mcp-audit.jsonl
 *
 * Queryable with standard tools:
 *   cat audit.jsonl | jq 'select(.result=="blocked")'
 *   cat audit.jsonl | jq 'select(.tool=="apple_finder")'
 *   cat audit.jsonl | jq -s 'group_by(.tool) | map({tool: .[0].tool, count: length})'
 */

import { appendFileSync } from "node:fs";
import { join } from "node:path";
import { homedir } from "node:os";

const LOG_DIR = join(homedir(), ".local/occ/rag");
const AUDIT_FILE = join(LOG_DIR, "apple-mcp-audit.jsonl");

export type AuditResult =
  | "ok"
  | "error"
  | "blocked"
  | "protected_no_confirm"
  | "dry_run"
  | "rate_limited";

export interface AuditEntry {
  ts: string;
  tool: string;
  action: string;
  permission: "open" | "protected" | "blocked";
  confirmed: boolean;
  dry_run: boolean;
  result: AuditResult;
  duration_ms: number;
  output?: string;
  error?: string;
}

/**
 * Write a structured audit entry as a JSON line.
 *
 * Never throws — failures are silently ignored (logging should not break tool execution).
 */
export function audit(entry: AuditEntry): void {
  try {
    const line = JSON.stringify(entry) + "\n";
    appendFileSync(AUDIT_FILE, line);
  } catch {
    // Can't write audit — ignore
  }
}

/**
 * Create a timestamp for audit entries (ISO 8601).
 */
export function now(): string {
  return new Date().toISOString();
}
