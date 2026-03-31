import { z } from "zod";
import { runAppleScript, runShell, safeAS, safeAppName } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_apps",
  description:
    "Manage macOS applications. Actions: open, quit, force_quit, is_running, list_running, hide, activate.",
  actions: {
    open: {
      description: "Open/launch an application",
      params: z.object({
        name: z.string().describe("Application name (e.g. Safari, Finder, Slack)"),
      }),
      handler: async (p) => {
        const name = safeAppName(p.name as string);
        const r = await runAppleScript(
          `tell application "${safeAS(name)}" to activate\nreturn "${safeAS(name)} opened"`,
        );
        return r.ok ? `${name} opened` : `Error: ${r.output}`;
      },
    },
    quit: {
      description: "Quit an application gracefully",
      params: z.object({
        name: z.string().describe("Application name to quit"),
      }),
      handler: async (p) => {
        const name = safeAppName(p.name as string);
        const r = await runAppleScript(
          `tell application "${safeAS(name)}" to quit`,
        );
        return r.ok ? `${name} quit` : `Error: ${r.output}`;
      },
    },
    force_quit: {
      description: "Force quit an unresponsive application",
      params: z.object({
        name: z.string().describe("Application name to force quit"),
      }),
      handler: async (p) => {
        const name = safeAppName(p.name as string);
        const r = await runShell(["killall", name]);
        return r.ok ? `${name} force quit` : `Error: ${r.output}`;
      },
    },
    is_running: {
      description: "Check if an application is currently running",
      params: z.object({
        name: z.string().describe("Application name to check"),
      }),
      handler: async (p) => {
        const name = safeAppName(p.name as string);
        const r = await runAppleScript(
          `tell application "System Events" to return (name of processes) contains "${safeAS(name)}"`,
        );
        if (!r.ok) return `Error: ${r.output}`;
        return r.output === "true" ? `${name} is running` : `${name} is not running`;
      },
    },
    list_running: {
      description: "List all currently running applications",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "System Events"\n` +
            `  set appList to name of every process whose background only is false\n` +
            `  set AppleScript's text item delimiters to ", "\n` +
            `  return appList as text\n` +
            `end tell`,
        );
        return r.ok ? `Running apps: ${r.output}` : `Error: ${r.output}`;
      },
    },
    hide: {
      description: "Hide an application",
      params: z.object({
        name: z.string().describe("Application name to hide"),
      }),
      handler: async (p) => {
        const name = safeAppName(p.name as string);
        const r = await runAppleScript(
          `tell application "System Events" to set visible of process "${safeAS(name)}" to false`,
        );
        return r.ok ? `${name} hidden` : `Error: ${r.output}`;
      },
    },
    activate: {
      description: "Bring an application to the front without launching a new window",
      params: z.object({
        name: z.string().describe("Application name to activate"),
      }),
      handler: async (p) => {
        const name = safeAppName(p.name as string);
        const r = await runAppleScript(
          `tell application "${safeAS(name)}" to activate`,
        );
        return r.ok ? `${name} activated` : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
