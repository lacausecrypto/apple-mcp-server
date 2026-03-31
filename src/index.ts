#!/usr/bin/env node
/**
 * Apple MCP Server — macOS system controls as MCP tools for Claude.
 *
 * 31 domain tools exposing 303 actions across all Apple apps.
 * Each tool has an "action" parameter selecting the specific function.
 *
 * Features:
 * - Clean error messages (no temp file paths, translated error codes)
 * - Auto-launch apps on -600 error (app not running) with retry
 * - Destructive action warnings (empty_trash, delete, shutdown, etc.)
 * - Path sanitization for file operations
 * - Response caching for expensive system_profiler calls
 * - Concurrency guards for single-resource tools (Safari, Chrome)
 * - Full logging to ~/.local/occ/rag/apple-mcp.log
 *
 * Transport: stdio (for Claude CLI integration)
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

// ══════════════════════════════════════════════════════════════════
// DESTRUCTIVE ACTIONS — warn Claude before executing
// ══════════════════════════════════════════════════════════════════

const DESTRUCTIVE_ACTIONS: Record<string, Set<string>> = {
  apple_finder: new Set(["empty_trash", "delete", "eject_all"]),
  apple_system: new Set(["shutdown", "restart", "logout", "sleep", "eject_all_disks"]),
  apple_mail: new Set(["send", "mark_all_read", "move_to_trash"]),
  apple_twitter: new Set(["post", "post_draft", "reply", "like", "retweet"]),
  apple_contacts: new Set(["delete"]),
  apple_notes: new Set(["delete"]),
  apple_reminders: new Set(["delete"]),
  apple_music: new Set(["delete_playlist", "remove_from_playlist"]),
  apple_photos: new Set(["add_to_album"]),
  apple_apps: new Set(["force_quit"]),
};

function isDestructive(toolName: string, action: string): boolean {
  return DESTRUCTIVE_ACTIONS[toolName]?.has(action) ?? false;
}

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
// TOOL EXECUTION
// ══════════════════════════════════════════════════════════════════

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const action = (args?.action as string) || "";

  log("INFO", `Tool call: ${name}.${action}`);

  // Find the domain
  const domain = domains.find((d) => d.name === name);
  if (!domain) {
    log("WARN", `Unknown tool: ${name}`);
    return {
      content: [{ type: "text", text: `Unknown tool: ${name}` }],
      isError: true,
    };
  }

  // Get the action
  const actionDef = domain.actions[action];
  if (!actionDef) {
    const available = Object.keys(domain.actions).join(", ");
    return {
      content: [
        {
          type: "text",
          text: `Unknown action "${action}" for ${name}. Available: ${available}`,
        },
      ],
      isError: true,
    };
  }

  // Validate params if schema defined
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

  // Execute the action
  try {
    const result = await actionDef.handler(args ?? {});

    // Warn if this was a destructive action
    const warning = isDestructive(name, action)
      ? "\n⚠️ This was a destructive action."
      : "";

    log("INFO", `Result: ${name}.${action} → ${result.slice(0, 80)}`);

    return { content: [{ type: "text", text: result + warning }] };
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

  if (!resource) {
    throw new Error(`Unknown resource: ${uri}`);
  }

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
