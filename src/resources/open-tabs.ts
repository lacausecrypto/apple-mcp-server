import { runAppleScript } from "../executor.js";
import type { ResourceDef } from "../types.js";

const safariTabs: ResourceDef = {
  uri: "apple://open-tabs/safari",
  name: "Safari Tabs",
  description: "All open Safari tabs (title | URL)",
  mimeType: "text/plain",
  read: async () => {
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
    return r.ok && r.output ? r.output : "No Safari tabs open";
  },
};

const chromeTabs: ResourceDef = {
  uri: "apple://open-tabs/chrome",
  name: "Chrome Tabs",
  description: "All open Chrome tabs (title | URL)",
  mimeType: "text/plain",
  read: async () => {
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
    return r.ok && r.output ? r.output : "No Chrome tabs open";
  },
};

export default [safariTabs, chromeTabs];
