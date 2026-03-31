#!/usr/bin/env node
/**
 * Apple MCP Server — macOS system controls as MCP tools for Claude.
 *
 * Security layers (all enforced BEFORE execution):
 *   1. Rate limiting — max calls/minute (global + protected)
 *   2. Permission check — OPEN / PROTECTED (confirm:true) / BLOCKED
 *   3. Dry-run mode — preview all actions without executing
 *   4. Input validation — safePath, safeAS, safeSQL
 *   5. Structured audit log — every call logged as JSON line
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { getDomains, getResources, buildInputSchema } from "./registry.js";
import { log } from "./executor.js";
import { checkPermission, getPermissionSummary, isDryRun, getRateLimitConfig } from "./permissions.js";
import { audit, now, type AuditResult } from "./audit.js";
import { checkGlobalLimit, checkProtectedLimit, configureRateLimit } from "./ratelimit.js";

// ══════════════════════════════════════════════════════════════════
// SERVER SETUP
// ══════════════════════════════════════════════════════════════════

const server = new Server(
  { name: "apple-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } },
);

const domains = getDomains();
const resources = getResources();

// Configure rate limits from permissions config
const rlConfig = getRateLimitConfig();
configureRateLimit(rlConfig);

log("INFO", `Apple MCP Server starting: ${domains.length} tools, ${resources.length} resources`);
log("INFO", `Permissions:\n${getPermissionSummary()}`);

// ══════════════════════════════════════════════════════════════════
// TOOL LISTING
// ══════════════════════════════════════════════════════════════════

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: domains.map((d) => ({
    name: d.name,
    description: d.description,
    inputSchema: buildInputSchema(d),
  })),
}));

// ══════════════════════════════════════════════════════════════════
// TOOL EXECUTION — full security pipeline
// ══════════════════════════════════════════════════════════════════

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const action = (args?.action as string) || "";
  const confirm = args?.confirm === true;
  const startTs = now();
  const startMs = Date.now();

  // Helper: return error + audit
  const fail = (result: AuditResult, text: string, perm: "open" | "protected" | "blocked" = "open") => {
    audit({
      ts: startTs, tool: name, action, permission: perm,
      confirmed: confirm, dry_run: isDryRun(),
      result, duration_ms: Date.now() - startMs,
      error: text.slice(0, 200),
    });
    return { content: [{ type: "text" as const, text }], isError: true };
  };

  // ── 1. Find domain + action ──
  const domain = domains.find((d) => d.name === name);
  if (!domain) return fail("error", `Unknown tool: ${name}`);

  const actionDef = domain.actions[action];
  if (!actionDef) {
    const available = Object.keys(domain.actions).join(", ");
    return fail("error", `Unknown action "${action}" for ${name}. Available: ${available}`);
  }

  // ── 2. Rate limiting (BEFORE permission check) ──
  const globalRL = checkGlobalLimit();
  if (globalRL) return fail("rate_limited", `🚦 ${globalRL}`);

  // ── 3. Permission check ──
  const perm = checkPermission(name, action);

  if (perm.level === "blocked") {
    return fail("blocked",
      `🚫 ${name}.${action} is blocked. ${perm.reason}.\n\n` +
      `To unblock, add "${action}" to "unblocked" in ~/.config/apple-mcp/permissions.json`,
      "blocked");
  }

  if (perm.level === "protected" && !confirm) {
    audit({
      ts: startTs, tool: name, action, permission: "protected",
      confirmed: false, dry_run: isDryRun(),
      result: "protected_no_confirm", duration_ms: Date.now() - startMs,
    });
    return {
      content: [{
        type: "text" as const,
        text: `⚠️ ${name}.${action} requires confirmation.\n\n` +
          `Reason: ${perm.reason}\n\n` +
          `Call again with confirm: true to proceed.`,
      }],
    };
  }

  // Rate limit confirmed protected actions separately
  if (perm.level === "protected" && confirm) {
    const protRL = checkProtectedLimit();
    if (protRL) return fail("rate_limited", `🚦 ${protRL}`, "protected");
  }

  // ── 4. Validate params ──
  if (actionDef.params) {
    const validation = actionDef.params.safeParse(args);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return fail("error", `Invalid params: ${errors}`, perm.level);
    }
  }

  // ── 5. Dry-run mode ──
  if (isDryRun()) {
    const dryMsg = `[DRY RUN] Would execute ${name}.${action}` +
      (perm.level === "protected" ? " (confirmed)" : "") +
      ` — no action taken.`;
    audit({
      ts: startTs, tool: name, action, permission: perm.level,
      confirmed: confirm, dry_run: true,
      result: "dry_run", duration_ms: Date.now() - startMs,
      output: dryMsg,
    });
    return { content: [{ type: "text" as const, text: dryMsg }] };
  }

  // ── 6. Execute ──
  try {
    const result = await actionDef.handler(args ?? {});

    if (typeof result !== "string") {
      log("WARN", `${name}.${action} returned ${typeof result} instead of string`);
      audit({
        ts: startTs, tool: name, action, permission: perm.level,
        confirmed: confirm, dry_run: false,
        result: "ok", duration_ms: Date.now() - startMs,
        output: "(no output)",
      });
      return {
        content: [{ type: "text" as const, text: `${name}.${action} completed (no output)` }],
      };
    }

    // Success — audit and return
    audit({
      ts: startTs, tool: name, action, permission: perm.level,
      confirmed: confirm, dry_run: false,
      result: "ok", duration_ms: Date.now() - startMs,
      output: result.slice(0, 200),
    });

    log("INFO", `Result: ${name}.${action} → ${result.slice(0, 80)}`);
    return { content: [{ type: "text" as const, text: result }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", `${name}.${action} threw: ${msg}`);
    return fail("error", `Error: ${msg}`, perm.level);
  }
});

// ══════════════════════════════════════════════════════════════════
// RESOURCE LISTING + READING
// ══════════════════════════════════════════════════════════════════

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: resources.map((r) => ({
    uri: r.uri, name: r.name, description: r.description, mimeType: r.mimeType,
  })),
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const resource = resources.find((r) => r.uri === uri);
  if (!resource) throw new Error(`Unknown resource: ${uri}`);
  const content = await resource.read();
  return { contents: [{ uri, mimeType: resource.mimeType, text: content }] };
});

// ══════════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════════

const transport = new StdioServerTransport();
await server.connect(transport);
log("INFO", "Server connected via stdio");
