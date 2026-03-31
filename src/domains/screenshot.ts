import { z } from "zod";
import { runShell, safePath } from "../executor.js";
import type { DomainModule } from "../types.js";

const defaultPath = "~/Desktop/screenshot.png";

const domain: DomainModule = {
  name: "apple_screenshot",
  description:
    "Take screenshots on macOS. Actions: full, clipboard, timed, area, window.",
  actions: {
    full: {
      description: "Take a full screenshot and save to file",
      params: z.object({
        path: z
          .string()
          .optional()
          .describe("Save path (default: ~/Desktop/screenshot.png)"),
      }),
      handler: async (p) => {
        const p_path = (p.path as string) || "";
        const finalPath = safePath(p_path) || safePath(defaultPath);
        if (!finalPath) return "Error: invalid or forbidden path";
        const r = await runShell(["screencapture", "-x", finalPath]);
        return r.ok ? `Screenshot saved: ${finalPath}` : `Error: ${r.output}`;
      },
    },
    clipboard: {
      description: "Take a screenshot and copy to clipboard",
      handler: async () => {
        const r = await runShell(["screencapture", "-x", "-c"]);
        return r.ok
          ? "Screenshot copied to clipboard"
          : `Error: ${r.output}`;
      },
    },
    timed: {
      description: "Take a screenshot after a delay",
      params: z.object({
        seconds: z
          .number()
          .optional()
          .describe("Delay in seconds (default 5)"),
        path: z
          .string()
          .optional()
          .describe("Save path (default: ~/Desktop/screenshot.png)"),
      }),
      handler: async (p) => {
        const seconds = (p.seconds as number) || 5;
        const p_path = (p.path as string) || "";
        const finalPath = safePath(p_path) || safePath(defaultPath);
        if (!finalPath) return "Error: invalid or forbidden path";
        const r = await runShell([
          "screencapture",
          "-x",
          "-T",
          String(seconds),
          finalPath,
        ]);
        return r.ok
          ? `Screenshot in ${seconds}s: ${finalPath}`
          : `Error: ${r.output}`;
      },
    },
    area: {
      description:
        "Take a screenshot of a selected area (interactive — user draws rectangle)",
      params: z.object({
        path: z
          .string()
          .optional()
          .describe(
            "Save path (default: ~/Desktop/screenshot_area.png)",
          ),
      }),
      handler: async (p) => {
        const p_path = (p.path as string) || "";
        const finalPath = safePath(p_path) || safePath("~/Desktop/screenshot_area.png");
        if (!finalPath) return "Error: invalid or forbidden path";
        const r = await runShell(["screencapture", "-i", finalPath]);
        return r.ok
          ? `Area screenshot saved: ${finalPath}`
          : `Error: ${r.output}`;
      },
    },
    window: {
      description: "Take a screenshot of the frontmost window",
      params: z.object({
        path: z
          .string()
          .optional()
          .describe(
            "Save path (default: ~/Desktop/screenshot_window.png)",
          ),
      }),
      handler: async (p) => {
        const p_path = (p.path as string) || "";
        const finalPath = safePath(p_path) || safePath("~/Desktop/screenshot_window.png");
        if (!finalPath) return "Error: invalid or forbidden path";
        const r = await runShell(["screencapture", "-w", finalPath]);
        return r.ok
          ? `Window screenshot saved: ${finalPath}`
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
