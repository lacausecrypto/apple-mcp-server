import { z } from "zod";

/**
 * Result from AppleScript or shell execution.
 */
export interface ExecResult {
  ok: boolean;
  output: string;
}

/**
 * A single action within a domain tool.
 *
 * Example: In the "apple_volume" tool, "set" is an action
 * with params { level: number } and a handler that calls AppleScript.
 */
export interface DomainAction {
  /** Short description of what this action does */
  description: string;
  /** Optional Zod schema for additional params (beyond "action") */
  params?: z.ZodObject<any>;
  /** Execute the action. Returns human-readable result string. */
  handler: (params: Record<string, unknown>) => Promise<string>;
  /** Override default timeout (ms) for this action */
  timeout?: number;
}

/**
 * A domain module — represents one MCP tool with multiple actions.
 *
 * Each Apple app/category maps to one DomainModule.
 * The module is registered as a single MCP tool whose "action" param
 * selects which function to call.
 */
export interface DomainModule {
  /** MCP tool name, e.g. "apple_music" */
  name: string;
  /** Description shown to Claude — should list available actions */
  description: string;
  /** Map of action name → action definition */
  actions: Record<string, DomainAction>;
}

/**
 * An MCP resource — read-only data Claude can attach to context.
 */
export interface ResourceDef {
  /** Resource URI, e.g. "apple://now-playing" */
  uri: string;
  /** Human-readable name */
  name: string;
  /** Description of what this resource provides */
  description: string;
  /** MIME type of the content */
  mimeType: string;
  /** Read the resource content */
  read: () => Promise<string>;
}
