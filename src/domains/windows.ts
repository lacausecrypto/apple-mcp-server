import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

/** AppleScript snippet that sets screenW and screenH variables. */
const screenSizeScript =
  `tell application "Finder" to set _b to bounds of window of desktop\n` +
  `set screenW to item 3 of _b\n` +
  `set screenH to item 4 of _b\n`;

const domain: DomainModule = {
  name: "apple_windows",
  description:
    "Manage macOS windows: move, resize, minimize, fullscreen. Actions: frontmost_app, minimize, minimize_all, maximize, left_half, right_half, fullscreen, close, hide_app, hide_others, center, resize, list_windows, switch_to.",
  actions: {
    frontmost_app: {
      description: "Get the name of the frontmost application",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to get name of first process whose frontmost is true',
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    minimize: {
      description: "Minimize the front window of the frontmost app",
      handler: async () => {
        const appR = await runAppleScript(
          'tell application "System Events" to get name of first process whose frontmost is true',
        );
        if (!appR.ok) return `Error: ${appR.output}`;
        const app = appR.output;
        const r = await runAppleScript(
          `tell application "${safeAS(app)}" to set miniaturized of front window to true`,
        );
        return r.ok ? `${app} minimized` : `Error: ${r.output}`;
      },
    },
    minimize_all: {
      description: "Minimize all windows of all applications",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "System Events"\n` +
            `  set appList to name of every process whose background only is false\n` +
            `  repeat with appName in appList\n` +
            `    try\n` +
            `      tell application appName to set miniaturized of every window to true\n` +
            `    end try\n` +
            `  end repeat\n` +
            `end tell`,
        );
        return r.ok ? "All windows minimized" : `Error: ${r.output}`;
      },
    },
    maximize: {
      description: "Maximize the front window to fill the screen",
      handler: async () => {
        const r = await runAppleScript(
          screenSizeScript +
            `set winH to screenH - 25\n` +
            `tell application "System Events"\n` +
            `  set proc to first process whose frontmost is true\n` +
            `  tell proc\n` +
            `    set position of front window to {0, 25}\n` +
            `    set size of front window to {screenW, winH}\n` +
            `  end tell\n` +
            `end tell`,
        );
        return r.ok ? "Window maximized" : `Error: ${r.output}`;
      },
    },
    left_half: {
      description: "Move front window to the left half of the screen",
      handler: async () => {
        const r = await runAppleScript(
          screenSizeScript +
            `set halfW to (screenW div 2)\n` +
            `set winH to screenH - 25\n` +
            `tell application "System Events"\n` +
            `  set proc to first process whose frontmost is true\n` +
            `  tell proc\n` +
            `    set position of front window to {0, 25}\n` +
            `    set size of front window to {halfW, winH}\n` +
            `  end tell\n` +
            `end tell`,
        );
        return r.ok ? "Window moved to left half" : `Error: ${r.output}`;
      },
    },
    right_half: {
      description: "Move front window to the right half of the screen",
      handler: async () => {
        const r = await runAppleScript(
          screenSizeScript +
            `set halfW to (screenW div 2)\n` +
            `set winH to screenH - 25\n` +
            `tell application "System Events"\n` +
            `  set proc to first process whose frontmost is true\n` +
            `  tell proc\n` +
            `    set position of front window to {halfW, 25}\n` +
            `    set size of front window to {halfW, winH}\n` +
            `  end tell\n` +
            `end tell`,
        );
        return r.ok ? "Window moved to right half" : `Error: ${r.output}`;
      },
    },
    fullscreen: {
      description: "Toggle fullscreen for the front window",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to keystroke "f" using {command down, control down}',
        );
        return r.ok ? "Fullscreen toggled" : `Error: ${r.output}`;
      },
    },
    close: {
      description: "Close the front window of the frontmost app",
      handler: async () => {
        const appR = await runAppleScript(
          'tell application "System Events" to get name of first process whose frontmost is true',
        );
        if (!appR.ok) return `Error: ${appR.output}`;
        const app = appR.output;
        const r = await runAppleScript(
          `tell application "${safeAS(app)}" to close front window`,
        );
        return r.ok ? `Window closed (${app})` : `Error: ${r.output}`;
      },
    },
    hide_app: {
      description: "Hide a specific application",
      params: z.object({
        name: z.string().describe("Application name to hide"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "System Events" to set visible of process "${safeAS(name)}" to false`,
        );
        return r.ok ? `${name} hidden` : `Error: ${r.output}`;
      },
    },
    hide_others: {
      description: "Hide all applications except the frontmost",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to set visible of every process whose frontmost is false to false',
        );
        return r.ok ? "Other apps hidden" : `Error: ${r.output}`;
      },
    },
    center: {
      description: "Center the front window on screen",
      handler: async () => {
        const r = await runAppleScript(
          screenSizeScript +
            `tell application "System Events"\n` +
            `  set proc to first process whose frontmost is true\n` +
            `  set winSize to size of front window of proc\n` +
            `  set winW to item 1 of winSize\n` +
            `  set winH to item 2 of winSize\n` +
            `  set newX to (screenW - winW) / 2\n` +
            `  set newY to (screenH - winH) / 2\n` +
            `  set position of front window of proc to {newX, newY}\n` +
            `end tell`,
        );
        return r.ok ? "Window centered" : `Error: ${r.output}`;
      },
    },
    resize: {
      description: "Resize the front window to a specific width and height",
      params: z.object({
        width: z.number().describe("Desired window width in pixels"),
        height: z.number().describe("Desired window height in pixels"),
      }),
      handler: async (p) => {
        const width = p.width as number;
        const height = p.height as number;
        const r = await runAppleScript(
          `tell application "System Events"\n` +
            `  set proc to first process whose frontmost is true\n` +
            `  set size of front window of proc to {${width}, ${height}}\n` +
            `end tell`,
        );
        return r.ok
          ? `Window resized to ${width}x${height}`
          : `Error: ${r.output}`;
      },
    },
    list_windows: {
      description: "List all windows of the frontmost application",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "System Events"\n` +
            `  set proc to first process whose frontmost is true\n` +
            `  set winNames to name of every window of proc\n` +
            `  set AppleScript's text item delimiters to ", "\n` +
            `  return winNames as text\n` +
            `end tell`,
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    switch_to: {
      description: "Bring a specific application to the front",
      params: z.object({
        name: z.string().describe("Application name to activate"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "${safeAS(name)}" to activate`,
        );
        return r.ok ? `${name} activated` : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
