import { z } from "zod";
import { runAppleScript, safeAS, safePath } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_textedit",
  description:
    "Control TextEdit. Actions: create, open, get_text, set_text, save, close, list_open.",
  actions: {
    create: {
      description: "Create a new TextEdit document with optional text",
      params: z.object({
        text: z
          .string()
          .optional()
          .describe("Initial text content for the document"),
      }),
      handler: async (p) => {
        const text = p.text as string | undefined;
        const content = text ? safeAS(text) : "";
        const r = await runAppleScript(
          'tell application "TextEdit"\n' +
            "    activate\n" +
            `    make new document with properties {text:"${content}"}\n` +
            "end tell",
        );
        return r.ok ? "New TextEdit document created" : `Error: ${r.output}`;
      },
    },
    open: {
      description: "Open a file in TextEdit",
      params: z.object({
        path: z.string().describe("POSIX path to the file"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "TextEdit"\n' +
            "    activate\n" +
            `    open POSIX file "${safeAS(validPath)}"\n` +
            "end tell",
        );
        return r.ok ? `Opened in TextEdit: ${validPath}` : `Error: ${r.output}`;
      },
    },
    get_text: {
      description: "Get text of the front TextEdit document",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "TextEdit" to get text of front document',
        );
        if (r.ok) {
          return r.output ? r.output.slice(0, 3000) : "(empty document)";
        }
        return `Error: ${r.output}`;
      },
    },
    set_text: {
      description: "Set text of the front TextEdit document",
      params: z.object({
        text: z.string().describe("Text to set in the document"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const r = await runAppleScript(
          'tell application "TextEdit"\n' +
            `    set text of front document to "${safeAS(text)}"\n` +
            "end tell",
        );
        return r.ok ? "Text updated" : `Error: ${r.output}`;
      },
    },
    save: {
      description: "Save the front TextEdit document",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "TextEdit" to save front document',
        );
        return r.ok ? "Document saved" : `Error: ${r.output}`;
      },
    },
    close: {
      description: "Close the front TextEdit document",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "TextEdit" to close front document',
        );
        return r.ok ? "Document closed" : `Error: ${r.output}`;
      },
    },
    list_open: {
      description: "List open TextEdit documents",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "TextEdit" to get name of every document',
        );
        if (r.ok && r.output) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          if (names.length === 0) return "No documents open in TextEdit";
          return `TextEdit documents (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok
          ? "No documents open in TextEdit"
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
