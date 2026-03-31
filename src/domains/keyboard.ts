import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

/** Map modifier names to AppleScript modifier syntax. */
const modMap: Record<string, string> = {
  cmd: "command down",
  command: "command down",
  shift: "shift down",
  alt: "option down",
  option: "option down",
  ctrl: "control down",
  control: "control down",
};

/** Map special key names to macOS key codes. */
const keyCodeMap: Record<string, number> = {
  return: 36,
  enter: 36,
  escape: 53,
  esc: 53,
  tab: 48,
  space: 49,
  delete: 51,
  backspace: 51,
  up: 126,
  down: 125,
  left: 123,
  right: 124,
  f1: 122,
  f2: 120,
  f3: 99,
  f4: 118,
  f5: 96,
  f6: 97,
  f7: 98,
  f8: 100,
  f9: 101,
  f10: 109,
  f11: 103,
  f12: 111,
};

/**
 * Build an AppleScript keystroke/key-code command from a combo string.
 * Examples: "cmd+c", "cmd+shift+z", "return", "escape"
 */
function buildKeyScript(combo: string): string {
  const parts = combo.toLowerCase().split("+");
  const key = parts[parts.length - 1].trim();
  const modifiers = parts.slice(0, -1).map((m) => m.trim());

  const mods = modifiers
    .map((m) => modMap[m])
    .filter(Boolean)
    .join(", ");

  if (key in keyCodeMap) {
    let script = `tell application "System Events" to key code ${keyCodeMap[key]}`;
    if (mods) script += ` using {${mods}}`;
    return script;
  }

  let script = `tell application "System Events" to keystroke "${safeAS(key)}"`;
  if (mods) script += ` using {${mods}}`;
  return script;
}

const domain: DomainModule = {
  name: "apple_keyboard",
  description:
    "Simulate keyboard input. Actions: type_text, press_key, copy, paste, undo, redo, save, select_all.",
  actions: {
    type_text: {
      description: "Type text via simulated keystrokes",
      params: z.object({
        text: z.string().describe("Text to type"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const r = await runAppleScript(
          `tell application "System Events" to keystroke "${safeAS(text)}"`,
        );
        return r.ok ? "Text typed" : `Error: ${r.output}`;
      },
    },
    press_key: {
      description:
        'Press a key combination (e.g. "cmd+c", "cmd+shift+z", "return", "escape")',
      params: z.object({
        combo: z
          .string()
          .describe("Key combo like cmd+c, cmd+shift+z, return, escape"),
      }),
      handler: async (p) => {
        const combo = p.combo as string;
        const script = buildKeyScript(combo);
        const r = await runAppleScript(script);
        return r.ok ? `Key pressed: ${combo}` : `Error: ${r.output}`;
      },
    },
    copy: {
      description: "Copy (Cmd+C)",
      handler: async () => {
        const r = await runAppleScript(buildKeyScript("cmd+c"));
        return r.ok ? "Copied" : `Error: ${r.output}`;
      },
    },
    paste: {
      description: "Paste (Cmd+V)",
      handler: async () => {
        const r = await runAppleScript(buildKeyScript("cmd+v"));
        return r.ok ? "Pasted" : `Error: ${r.output}`;
      },
    },
    undo: {
      description: "Undo (Cmd+Z)",
      handler: async () => {
        const r = await runAppleScript(buildKeyScript("cmd+z"));
        return r.ok ? "Undone" : `Error: ${r.output}`;
      },
    },
    redo: {
      description: "Redo (Cmd+Shift+Z)",
      handler: async () => {
        const r = await runAppleScript(buildKeyScript("cmd+shift+z"));
        return r.ok ? "Redone" : `Error: ${r.output}`;
      },
    },
    save: {
      description: "Save (Cmd+S)",
      handler: async () => {
        const r = await runAppleScript(buildKeyScript("cmd+s"));
        return r.ok ? "Saved" : `Error: ${r.output}`;
      },
    },
    select_all: {
      description: "Select All (Cmd+A)",
      handler: async () => {
        const r = await runAppleScript(buildKeyScript("cmd+a"));
        return r.ok ? "All selected" : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
