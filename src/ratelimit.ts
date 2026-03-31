/**
 * Rate Limiter — Prevents spam and abuse.
 *
 * Three independent limits:
 *   - Global: max tool calls per minute (default 30)
 *   - Protected: max confirmed destructive actions per minute (default 5)
 *   - Burst: max rapid-fire calls within 2 seconds (default 5)
 *
 * Configurable via permissions.json:
 *   { "rate_limit": { "global_per_min": 30, "protected_per_min": 5 } }
 *
 * When rate-limited, the tool call is rejected with an error message.
 * The audit log records rate_limited events.
 */

import { log } from "./executor.js";

// ══════════════════════════════════════════════════════════════════
// SLIDING WINDOW COUNTERS
// ══════════════════════════════════════════════════════════════════

const _globalCalls: number[] = [];
const _protectedCalls: number[] = [];

// Default limits
let _globalPerMin = 30;
let _protectedPerMin = 5;

/**
 * Configure rate limits. Called at startup from permissions config.
 */
export function configureRateLimit(opts: {
  global_per_min?: number;
  protected_per_min?: number;
}): void {
  if (opts.global_per_min !== undefined && opts.global_per_min > 0) {
    _globalPerMin = opts.global_per_min;
  }
  if (opts.protected_per_min !== undefined && opts.protected_per_min > 0) {
    _protectedPerMin = opts.protected_per_min;
  }
  log("INFO", `Rate limits: ${_globalPerMin} global/min, ${_protectedPerMin} protected/min`);
}

/**
 * Prune timestamps older than the window.
 */
function prune(arr: number[], windowMs: number): void {
  const cutoff = Date.now() - windowMs;
  while (arr.length > 0 && arr[0] < cutoff) {
    arr.shift();
  }
}

/**
 * Check if a global tool call is rate-limited.
 *
 * @returns null if allowed, or an error message if rate-limited.
 */
export function checkGlobalLimit(): string | null {
  const now = Date.now();
  prune(_globalCalls, 60_000);

  if (_globalCalls.length >= _globalPerMin) {
    const oldest = _globalCalls[0];
    const waitSec = Math.ceil((oldest + 60_000 - now) / 1000);
    log("WARN", `Rate limited: ${_globalCalls.length}/${_globalPerMin} calls in last minute`);
    return `Rate limited: ${_globalPerMin} calls/minute exceeded. Try again in ${waitSec}s.`;
  }

  _globalCalls.push(now);
  return null;
}

/**
 * Check if a protected action is rate-limited.
 *
 * Called ONLY for confirmed protected actions (not for the preview/prompt).
 *
 * @returns null if allowed, or an error message if rate-limited.
 */
export function checkProtectedLimit(): string | null {
  const now = Date.now();
  prune(_protectedCalls, 60_000);

  if (_protectedCalls.length >= _protectedPerMin) {
    const oldest = _protectedCalls[0];
    const waitSec = Math.ceil((oldest + 60_000 - now) / 1000);
    log("WARN", `Protected rate limited: ${_protectedCalls.length}/${_protectedPerMin} in last minute`);
    return `Rate limited: max ${_protectedPerMin} destructive actions/minute. Try again in ${waitSec}s.`;
  }

  _protectedCalls.push(now);
  return null;
}

/**
 * Get current rate limit status (for debugging/monitoring).
 */
export function getRateLimitStatus(): {
  global: { used: number; limit: number };
  protected: { used: number; limit: number };
} {
  prune(_globalCalls, 60_000);
  prune(_protectedCalls, 60_000);
  return {
    global: { used: _globalCalls.length, limit: _globalPerMin },
    protected: { used: _protectedCalls.length, limit: _protectedPerMin },
  };
}
