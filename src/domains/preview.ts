import { z } from "zod";
import { runAppleScript, safeAS, safePath } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_preview",
  description:
    "Control Preview app. Actions: open, list_open, close, close_all. Note: Preview has limited AppleScript support.",
  actions: {
    open: {
      description: "Open a file in Preview",
      params: z.object({
        path: z.string().describe("POSIX path to the file to open"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "Preview"\n' +
            `    open POSIX file "${safeAS(validPath)}"\n` +
            "    activate\n" +
            "end tell",
        );
        return r.ok ? `Opened in Preview: ${validPath}` : `Error: ${r.output}`;
      },
    },
    list_open: {
      description: "List currently open documents in Preview",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Preview" to get name of every document',
        );
        if (r.ok && r.output) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          if (names.length === 0) return "No documents open in Preview";
          return `Preview documents (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok
          ? "No documents open in Preview"
          : `Error: ${r.output}`;
      },
    },
    close: {
      description: "Close the front document in Preview",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Preview" to close front document',
        );
        return r.ok ? "Front document closed" : `Error: ${r.output}`;
      },
    },
    close_all: {
      description: "Close all documents in Preview",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Preview" to close every document',
        );
        return r.ok ? "All Preview documents closed" : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
