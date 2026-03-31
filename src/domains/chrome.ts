import { z } from "zod";
import { runAppleScript, safeAS, withLock } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_chrome",
  description:
    "Control Google Chrome browser. Actions: open_url, current_url, current_title, list_tabs, close_tab, reload, js_execute, back, forward, new_window, new_incognito, close_window, tab_count, new_tab.",
  actions: {
    open_url: {
      description: "Open a URL in Google Chrome",
      params: z.object({
        url: z.string().describe("URL to open"),
      }),
      handler: async (p) => {
        const url = p.url as string;
        const r = await runAppleScript(
          'tell application "Google Chrome"\n' +
            "    activate\n" +
            `    open location "${safeAS(url)}"\n` +
            "end tell",
        );
        return r.ok
          ? `Chrome: ${url.slice(0, 60)}`
          : `Error: ${r.output}`;
      },
    },
    current_url: {
      description: "Get URL of the active Chrome tab",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Google Chrome" to get URL of active tab of window 1',
        );
        return r.ok ? r.output : "No Chrome tab open";
      },
    },
    current_title: {
      description: "Get title of the active Chrome tab",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Google Chrome" to get title of active tab of window 1',
        );
        return r.ok ? r.output : "No Chrome tab open";
      },
    },
    list_tabs: {
      description: "List all open Chrome tabs across all windows",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Google Chrome"\n' +
            '    set tabList to ""\n' +
            "    repeat with w in windows\n" +
            "        repeat with t in tabs of w\n" +
            '            set tabList to tabList & title of t & " | " & URL of t & return\n' +
            "        end repeat\n" +
            "    end repeat\n" +
            "    return tabList\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Chrome (${lines.length} tabs):\n${lines
            .slice(0, 15)
            .map((l) => `  - ${l.slice(0, 80)}`)
            .join("\n")}`;
        }
        return "No Chrome tabs open";
      },
    },
    close_tab: {
      description: "Close the active Chrome tab",
      handler: async () => {
        return withLock("chrome", async () => {
          const r = await runAppleScript(
            'tell application "Google Chrome" to close active tab of window 1',
          );
          return r.ok ? "Chrome tab closed" : `Error: ${r.output}`;
        });
      },
    },
    reload: {
      description: "Reload the active Chrome tab",
      handler: async () => {
        return withLock("chrome", async () => {
          const r = await runAppleScript(
            'tell application "Google Chrome" to reload active tab of window 1',
          );
          return r.ok ? "Chrome page reloaded" : `Error: ${r.output}`;
        });
      },
    },
    js_execute: {
      description: "Execute JavaScript in the active Chrome tab",
      params: z.object({
        code: z.string().describe("JavaScript code to execute"),
      }),
      handler: async (p) => {
        return withLock("chrome", async () => {
          const code = p.code as string;
          const r = await runAppleScript(
            `tell application "Google Chrome" to execute active tab of window 1 javascript "${safeAS(code)}"`,
          );
          return r.ok ? (r.output || "(no return value)") : `Error: ${r.output}`;
        });
      },
    },
    back: {
      description: "Go back in browser history",
      handler: async () => {
        return withLock("chrome", async () => {
          const r = await runAppleScript(
            'tell application "Google Chrome" to execute active tab of window 1 javascript "history.back()"',
          );
          return r.ok ? "Navigated back" : `Error: ${r.output}`;
        });
      },
    },
    forward: {
      description: "Go forward in browser history",
      handler: async () => {
        return withLock("chrome", async () => {
          const r = await runAppleScript(
            'tell application "Google Chrome" to execute active tab of window 1 javascript "history.forward()"',
          );
          return r.ok ? "Navigated forward" : `Error: ${r.output}`;
        });
      },
    },
    new_window: {
      description: "Open a new Chrome window",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Google Chrome" to make new window',
        );
        return r.ok ? "New Chrome window opened" : `Error: ${r.output}`;
      },
    },
    new_incognito: {
      description: "Open a new incognito window in Chrome",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Google Chrome"\n' +
            "    activate\n" +
            "end tell\n" +
            'tell application "System Events"\n' +
            '    keystroke "n" using {command down, shift down}\n' +
            "end tell",
        );
        return r.ok
          ? "Incognito window opened"
          : `Error: ${r.output}`;
      },
    },
    close_window: {
      description: "Close the front Chrome window",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Google Chrome" to close front window',
        );
        return r.ok ? "Chrome window closed" : `Error: ${r.output}`;
      },
    },
    tab_count: {
      description: "Count total open tabs across all Chrome windows",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Google Chrome"\n' +
            "    set totalTabs to 0\n" +
            "    repeat with w in windows\n" +
            "        set totalTabs to totalTabs + (count of tabs of w)\n" +
            "    end repeat\n" +
            "    return totalTabs\n" +
            "end tell",
        );
        return r.ok ? `Chrome: ${r.output} tab(s) open` : `Error: ${r.output}`;
      },
    },
    new_tab: {
      description: "Open a new tab in Chrome, optionally with a URL",
      params: z.object({
        url: z.string().optional().describe("URL to open in the new tab"),
      }),
      handler: async (p) => {
        const url = p.url as string | undefined;
        const script = url
          ? `tell application "Google Chrome" to tell front window to make new tab with properties {URL:"${safeAS(url)}"}`
          : 'tell application "Google Chrome" to tell front window to make new tab';
        const r = await runAppleScript(script);
        return r.ok
          ? url
            ? `New Chrome tab opened: ${url.slice(0, 60)}`
            : "New Chrome tab opened"
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
