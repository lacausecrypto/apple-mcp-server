import { z } from "zod";
import { runAppleScript, runShell, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_books",
  description:
    "Control Apple Books. Actions: library, reading_now, collections, search, open. Note: Books has limited AppleScript support — some actions may return partial results.",
  actions: {
    library: {
      description: "List books in library (first 20)",
      handler: async () => {
        // Books.app AppleScript support is limited; try getting sources first
        const r = await runAppleScript(
          'tell application "Books"\n' +
            '    set res to ""\n' +
            "    set i to 0\n" +
            "    repeat with b in every source\n" +
            "        set i to i + 1\n" +
            "        if i > 20 then exit repeat\n" +
            "        set res to res & name of b & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Books (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        if (r.ok) return "No books found or Books library is empty";
        return `Books.app has limited AppleScript support. Error: ${r.output}. Try opening Books manually.`;
      },
    },
    reading_now: {
      description: "Get currently reading book",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Books"\n' +
            "    try\n" +
            "        return name of current book\n" +
            "    on error\n" +
            '        return "No book currently open"\n' +
            "    end try\n" +
            "end tell",
        );
        return r.ok
          ? r.output
          : `Could not determine current book. Books.app has limited AppleScript support. Error: ${r.output}`;
      },
    },
    collections: {
      description: "List collections/shelves",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Books"\n' +
            "    try\n" +
            "        return name of every collection\n" +
            "    on error\n" +
            '        return "Could not list collections"\n' +
            "    end try\n" +
            "end tell",
        );
        if (r.ok && r.output && r.output !== "Could not list collections") {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Collections (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok
          ? r.output
          : `Books.app has limited AppleScript support for collections. Error: ${r.output}`;
      },
    },
    search: {
      description: "Search books by opening Books app search",
      params: z.object({
        query: z.string().describe("Search query"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const encoded = encodeURIComponent(query);
        const r = await runShell(["open", `ibooks://search?term=${encoded}`]);
        return r.ok
          ? `Opened Books search for: ${query}`
          : `Error opening search: ${r.output}`;
      },
    },
    open: {
      description: "Open Books app",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Books" to activate',
        );
        return r.ok ? "Books opened" : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
