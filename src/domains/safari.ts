import { z } from "zod";
import { runAppleScript, runShell, safeAS, withLock } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_safari",
  description:
    "Control Safari browser. Actions: open_url, current_url, current_title, list_tabs, close_tab, new_tab, reload, page_text, reading_list, js_execute, back, forward, bookmarks, history_recent, private_window, close_window, tab_count.",
  actions: {
    open_url: {
      description: "Open a URL in Safari",
      params: z.object({
        url: z.string().describe("URL to open"),
      }),
      handler: async (p) => {
        const url = p.url as string;
        const r = await runAppleScript(
          `tell application "Safari" to open location "${safeAS(url)}"`,
        );
        if (r.ok) {
          await runAppleScript('tell application "Safari" to activate');
        }
        return r.ok
          ? `Safari: ${url.slice(0, 60)}`
          : `Error: ${r.output}`;
      },
    },
    current_url: {
      description: "Get URL of the current Safari tab",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Safari" to get URL of current tab of window 1',
        );
        return r.ok ? r.output : "No tab open";
      },
    },
    current_title: {
      description: "Get title of the current Safari tab",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Safari" to get name of current tab of window 1',
        );
        return r.ok ? r.output : "No tab open";
      },
    },
    list_tabs: {
      description: "List all open Safari tabs across all windows",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Safari"\n' +
            '    set tabList to ""\n' +
            "    repeat with w in windows\n" +
            "        repeat with t in tabs of w\n" +
            '            set tabList to tabList & name of t & " | " & URL of t & return\n' +
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
          return `Safari (${lines.length} tabs):\n${lines
            .slice(0, 15)
            .map((l) => `  - ${l.slice(0, 80)}`)
            .join("\n")}`;
        }
        return "No Safari tabs open";
      },
    },
    close_tab: {
      description: "Close the current Safari tab",
      handler: async () => {
        return withLock("safari", async () => {
          const r = await runAppleScript(
            'tell application "Safari" to close current tab of window 1',
          );
          return r.ok ? "Tab closed" : `Error: ${r.output}`;
        });
      },
    },
    new_tab: {
      description: "Open a new Safari tab, optionally with a URL",
      params: z.object({
        url: z.string().optional().describe("URL to open in the new tab"),
      }),
      handler: async (p) => {
        const url = p.url as string | undefined;
        let r;
        if (url) {
          r = await runAppleScript(
            'tell application "Safari"\n' +
              "    activate\n" +
              `    tell window 1 to set current tab to (make new tab with properties {URL:"${safeAS(url)}"})\n` +
              "end tell",
          );
        } else {
          r = await runAppleScript(
            'tell application "Safari"\n' +
              "    activate\n" +
              "    tell window 1 to set current tab to (make new tab)\n" +
              "end tell",
          );
        }
        return r.ok ? "New tab opened" : `Error: ${r.output}`;
      },
    },
    reload: {
      description: "Reload the current Safari page",
      handler: async () => {
        return withLock("safari", async () => {
          const r = await runAppleScript(
            'tell application "Safari"\n' +
              "    tell window 1\n" +
              "        set theURL to URL of current tab\n" +
              "        set URL of current tab to theURL\n" +
              "    end tell\n" +
              "end tell",
          );
          return r.ok ? "Page reloaded" : `Error: ${r.output}`;
        });
      },
    },
    page_text: {
      description:
        "Get visible text of current Safari page (first 2000 chars). Requires 'Allow JavaScript from Apple Events' in Safari > Develop.",
      timeout: 15_000,
      handler: async () => {
        return withLock("safari", async () => {
          // Try JavaScript first
          const r = await runAppleScript(
            'tell application "Safari" to do JavaScript "document.body.innerText.substring(0,2000)" in current tab of window 1',
          );
          if (r.ok) {
            return r.output.slice(0, 2000);
          }
          // Fallback: get page source and strip tags
          const r2 = await runAppleScript(
            'tell application "Safari" to get source of current tab of window 1',
            15_000,
          );
          if (r2.ok && r2.output) {
            const clean = r2.output
              .replace(/<[^>]+>/g, " ")
              .replace(/\s+/g, " ")
              .trim();
            return clean.slice(0, 2000);
          }
          return "Cannot read page (enable 'Allow JavaScript from Apple Events' in Safari > Develop)";
        });
      },
    },
    reading_list: {
      description: "Add a URL to Safari Reading List",
      params: z.object({
        url: z.string().describe("URL to add to Reading List"),
      }),
      handler: async (p) => {
        const url = p.url as string;
        const r = await runAppleScript(
          `tell application "Safari" to add reading list item "${safeAS(url)}"`,
        );
        return r.ok ? "Added to Reading List" : `Error: ${r.output}`;
      },
    },
    js_execute: {
      description:
        "Execute JavaScript in the current Safari tab. Requires 'Allow JavaScript from Apple Events' in Safari > Develop.",
      params: z.object({
        code: z.string().describe("JavaScript code to execute"),
      }),
      handler: async (p) => {
        return withLock("safari", async () => {
          const code = p.code as string;
          const r = await runAppleScript(
            `tell application "Safari" to do JavaScript "${safeAS(code)}" in current tab of window 1`,
          );
          return r.ok ? (r.output || "(no return value)") : `Error: ${r.output}`;
        });
      },
    },
    back: {
      description: "Go back in browser history",
      handler: async () => {
        return withLock("safari", async () => {
          const r = await runAppleScript(
            'tell application "Safari" to do JavaScript "history.back()" in current tab of window 1',
          );
          return r.ok ? "Navigated back" : `Error: ${r.output}`;
        });
      },
    },
    forward: {
      description: "Go forward in browser history",
      handler: async () => {
        return withLock("safari", async () => {
          const r = await runAppleScript(
            'tell application "Safari" to do JavaScript "history.forward()" in current tab of window 1',
          );
          return r.ok ? "Navigated forward" : `Error: ${r.output}`;
        });
      },
    },
    bookmarks: {
      description:
        "List top-level Safari bookmarks (reads from Bookmarks.plist)",
      handler: async () => {
        const r = await runShell(
          'plutil -convert json -o - ~/Library/Safari/Bookmarks.plist 2>/dev/null | head -100',
        );
        if (r.ok && r.output) {
          return `Safari bookmarks (raw, first 100 lines):\n${r.output.slice(0, 2000)}`;
        }
        return "Could not read Safari bookmarks (file may be protected by Full Disk Access)";
      },
    },
    history_recent: {
      description: "Get recent Safari history entries (up to 15)",
      timeout: 10_000,
      handler: async () => {
        const r = await runShell(
          'sqlite3 ~/Library/Safari/History.db "SELECT h.visit_time, i.url, i.title FROM history_visits h JOIN history_items i ON h.history_item=i.id ORDER BY h.visit_time DESC LIMIT 15" 2>/dev/null',
        );
        if (r.ok && r.output) {
          return `Recent Safari history:\n${r.output}`;
        }
        return "Could not read Safari history (may require Full Disk Access permission)";
      },
    },
    private_window: {
      description: "Open a new private browsing window in Safari",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Safari"\n' +
            "    activate\n" +
            "end tell\n" +
            'tell application "System Events"\n' +
            '    keystroke "n" using {command down, shift down}\n' +
            "end tell",
        );
        return r.ok
          ? "Private window opened"
          : `Error: ${r.output}`;
      },
    },
    close_window: {
      description: "Close the front Safari window",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Safari" to close front window',
        );
        return r.ok ? "Safari window closed" : `Error: ${r.output}`;
      },
    },
    tab_count: {
      description: "Count total open tabs across all Safari windows",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Safari"\n' +
            "    set totalTabs to 0\n" +
            "    repeat with w in windows\n" +
            "        set totalTabs to totalTabs + (count of tabs of w)\n" +
            "    end repeat\n" +
            "    return totalTabs\n" +
            "end tell",
        );
        return r.ok ? `Safari: ${r.output} tab(s) open` : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
