import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_clipboard",
  description: "Read and write the macOS clipboard. Actions: get, set, clear.",
  actions: {
    get: {
      description: "Get current clipboard content as text",
      handler: async () => {
        const r = await runAppleScript("the clipboard as text");
        return r.ok ? r.output || "(empty)" : `Error: ${r.output}`;
      },
    },
    set: {
      description: "Set clipboard content",
      params: z.object({
        text: z.string().describe("Text to copy to clipboard"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const r = await runAppleScript(
          `set the clipboard to "${safeAS(text)}"`,
        );
        return r.ok
          ? `Copied to clipboard (${text.length} chars)`
          : `Error: ${r.output}`;
      },
    },
    clear: {
      description: "Clear the clipboard",
      handler: async () => {
        const r = await runAppleScript('set the clipboard to ""');
        return r.ok ? "Clipboard cleared" : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
