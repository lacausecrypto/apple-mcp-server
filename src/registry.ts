/**
 * Domain Registry — Auto-discovers and registers all domain modules.
 *
 * Builds MCP tool definitions (name, description, inputSchema) from
 * DomainModule objects. Each domain becomes one MCP tool with an
 * "action" enum parameter.
 *
 * Adding a new domain = import it + add to ALL_DOMAINS array.
 */

import { z } from "zod";
import type { DomainModule, ResourceDef } from "./types.js";

// ══════════════════════════════════════════════════════════════════
// DOMAIN IMPORTS — add new domains here
// ══════════════════════════════════════════════════════════════════

// Phase 3 domains (first 5)
import volume from "./domains/volume.js";
import brightness from "./domains/brightness.js";
import clipboard from "./domains/clipboard.js";
import apps from "./domains/apps.js";
import sysinfo from "./domains/sysinfo.js";

// Phase 4 domains (rich apps)
import music from "./domains/music.js";
import spotify from "./domains/spotify.js";
import safari from "./domains/safari.js";
import chrome from "./domains/chrome.js";
import mail from "./domains/mail.js";
import calendar from "./domains/calendar.js";
import reminders from "./domains/reminders.js";
import notes from "./domains/notes.js";

// Phase 5 domains (system + misc)
import finder from "./domains/finder.js";

import windows from "./domains/windows.js";
import system from "./domains/system.js";
import screenshot from "./domains/screenshot.js";
import notification from "./domains/notification.js";
import keyboard from "./domains/keyboard.js";
import tts from "./domains/tts.js";
import twitter from "./domains/twitter.js";

// Phase 7 domains (URL schemes)
import facetime from "./domains/facetime.js";
import maps from "./domains/maps.js";

// Phase 8 domains (contacts, photos, messages, podcasts)
import contacts from "./domains/contacts.js";
import photos from "./domains/photos.js";
import messages from "./domains/messages.js";
import podcasts from "./domains/podcasts.js";

// Phase 9 domains (books, iWork, preview, textedit)
import books from "./domains/books.js";
import iwork from "./domains/iwork.js";
import preview from "./domains/preview.js";
import textedit from "./domains/textedit.js";

// Resources
import { getResources as _loadResources } from "./resources/index.js";

const ALL_DOMAINS: DomainModule[] = [
  volume,
  brightness,
  clipboard,
  apps,
  sysinfo,
  music,
  spotify,
  safari,
  chrome,
  mail,
  calendar,
  reminders,
  notes,
  finder,
  windows,
  system,
  screenshot,
  notification,
  keyboard,
  tts,
  twitter,
  facetime,
  maps,
  contacts,
  photos,
  messages,
  podcasts,
  books,
  iwork,
  preview,
  textedit,
];

// ══════════════════════════════════════════════════════════════════
// GETTERS
// ══════════════════════════════════════════════════════════════════

export function getDomains(): DomainModule[] {
  return ALL_DOMAINS;
}

export function getResources(): ResourceDef[] {
  return _loadResources();
}

// ══════════════════════════════════════════════════════════════════
// SCHEMA BUILDER — converts DomainModule → MCP inputSchema
// ══════════════════════════════════════════════════════════════════

/**
 * Convert a Zod schema to JSON Schema properties object.
 * Handles common types: string, number, boolean, enum.
 */
function zodToJsonSchema(schema: z.ZodType): Record<string, unknown> {
  if (schema instanceof z.ZodString) {
    return { type: "string" };
  }
  if (schema instanceof z.ZodNumber) {
    const checks = (schema as any)._def.checks || [];
    const result: Record<string, unknown> = { type: "number" };
    for (const check of checks) {
      if (check.kind === "min") result.minimum = check.value;
      if (check.kind === "max") result.maximum = check.value;
    }
    return result;
  }
  if (schema instanceof z.ZodBoolean) {
    return { type: "boolean" };
  }
  if (schema instanceof z.ZodEnum) {
    return {
      type: "string",
      enum: (schema as any)._def.values,
    };
  }
  if (schema instanceof z.ZodOptional) {
    return zodToJsonSchema((schema as any)._def.innerType);
  }
  // Fallback
  return { type: "string" };
}

/**
 * Build the MCP inputSchema for a domain tool.
 *
 * Creates a JSON Schema object with:
 * - "action": string enum of all action names (required)
 * - All unique params from all actions (optional, since each
 *   action may need different params)
 *
 * The action enum description lists what each action does,
 * so Claude knows which action to pick.
 */
export function buildInputSchema(domain: DomainModule): Record<string, unknown> {
  const actionNames = Object.keys(domain.actions);

  // Build rich description for the action enum
  const actionDescriptions = actionNames
    .map((a) => `${a}: ${domain.actions[a].description}`)
    .join("; ");

  const properties: Record<string, unknown> = {
    action: {
      type: "string",
      enum: actionNames,
      description: actionDescriptions,
    },
  };

  // Collect all unique params across all actions
  const seenParams = new Set<string>(["action"]);

  for (const actionDef of Object.values(domain.actions)) {
    if (!actionDef.params) continue;
    const shape = actionDef.params.shape as Record<string, z.ZodType>;

    for (const [key, zodSchema] of Object.entries(shape)) {
      if (seenParams.has(key)) continue;
      seenParams.add(key);

      const jsonSchema = zodToJsonSchema(zodSchema);
      // Add description from Zod if available
      const desc = (zodSchema as any)._def?.description;
      if (desc) {
        (jsonSchema as any).description = desc;
      }
      properties[key] = jsonSchema;
    }
  }

  return {
    type: "object",
    required: ["action"],
    properties,
  };
}
