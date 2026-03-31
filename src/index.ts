#!/usr/bin/env node
/**
 * Apple MCP Server — macOS system controls as MCP tools for Claude.
 *
 * 31 domain tools exposing 303 actions across all Apple apps.
 *
 * Permission system (conservative by default):
 *   OPEN      → execute immediately (read-only, safe actions)
 *   PROTECTED → requires confirm: true param (destructive/irreversible)
 *   BLOCKED   → never executed (dangerous system actions)
 *
 * Configurable via ~/.config/apple-mcp/permissions.json
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
import { checkPermission, getPermissionSummary } from "./permissions.js";

// ══════════════════════════════════════════════════════════════════
// SERVER SETUP
// ══════════════════════════════════════════════════════════════════

const server = new Server(
  { name: "apple-mcp-server", version: "1.0.0" },
  { capabilities: { tools: {}, resources: {} } },
);

const domains = getDomains();
const resources = getResources();

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
// TOOL EXECUTION — with permission enforcement
// ══════════════════════════════════════════════════════════════════

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const action = (args?.action as string) || "";
  const confirm = args?.confirm === true;

  log("INFO", `Tool call: ${name}.${action}${confirm ? " (confirmed)" : ""}`);

  // ── Find domain ──
  const domain = domains.find((d) => d.name === name);
  if (!domain) {
    log("WARN", `Unknown tool: ${name}`);
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  // ── Find action ──
  const actionDef = domain.actions[action];
  if (!actionDef) {
    const available = Object.keys(domain.actions).join(", ");
    return {
      content: [{
        type: "text",
        text: `Unknown action "${action}" for ${name}. Available: ${available}`,
      }],
      isError: true,
    };
  }

  // ── Permission check (BEFORE execution) ──
  const perm = checkPermission(name, action);

  if (perm.level === "blocked") {
    log("WARN", `BLOCKED: ${name}.${action} — ${perm.reason}`);
    return {
      content: [{
        type: "text",
        text: `🚫 ${name}.${action} is blocked. ${perm.reason}.\n\nTo unblock, add "${action}" to the "unblocked" array in ~/.config/apple-mcp/permissions.json`,
      }],
      isError: true,
    };
  }

  if (perm.level === "protected" && !confirm) {
    log("INFO", `PROTECTED: ${name}.${action} — awaiting confirmation`);
    return {
      content: [{
        type: "text",
        text: `⚠️ ${name}.${action} requires confirmation.\n\nReason: ${perm.reason}\n\nTo proceed, call again with confirm: true.\nTo bypass this for future calls, add "${action}" to "unprotected" in ~/.config/apple-mcp/permissions.json`,
      }],
    };
  }

  // ── Validate params ──
  if (actionDef.params) {
    const validation = actionDef.params.safeParse(args);
    if (!validation.success) {
      const errors = validation.error.issues
        .map((i) => `${i.path.join(".")}: ${i.message}`)
        .join("; ");
      return {
        content: [{ type: "text", text: `Invalid params: ${errors}` }],
        isError: true,
      };
    }
  }

  // ── Execute ──
  try {
    const result = await actionDef.handler(args ?? {});

    if (typeof result !== "string") {
      log("WARN", `${name}.${action} returned ${typeof result} instead of string`);
      return {
        content: [{ type: "text", text: `${name}.${action} completed (no output)` }],
      };
    }

    log("INFO", `Result: ${name}.${action} → ${result.slice(0, 80)}`);
    return { content: [{ type: "text", text: result }] };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log("ERROR", `${name}.${action} threw: ${msg}`);
    return {
      content: [{ type: "text", text: `Error: ${msg}` }],
      isError: true,
    };
  }
});

// ══════════════════════════════════════════════════════════════════
// RESOURCE LISTING
// ══════════════════════════════════════════════════════════════════

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: resources.map((r) => ({
    uri: r.uri,
    name: r.name,
    description: r.description,
    mimeType: r.mimeType,
  })),
}));

// ══════════════════════════════════════════════════════════════════
// RESOURCE READING
// ══════════════════════════════════════════════════════════════════

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  const { uri } = request.params;
  const resource = resources.find((r) => r.uri === uri);
  if (!resource) throw new Error(`Unknown resource: ${uri}`);

  const content = await resource.read();
  return {
    contents: [{ uri, mimeType: resource.mimeType, text: content }],
  };
});

// ══════════════════════════════════════════════════════════════════
// START
// ══════════════════════════════════════════════════════════════════

const transport = new StdioServerTransport();
await server.connect(transport);
log("INFO", "Server connected via stdio");
