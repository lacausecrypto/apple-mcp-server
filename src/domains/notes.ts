import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_notes",
  description:
    "Control Apple Notes. Actions: list, create, read, search, delete, folders, move, append, count.",
  actions: {
    list: {
      description: "List recent notes (up to 20)",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Notes"\n' +
            '    set res to ""\n' +
            "    set i to 0\n" +
            "    repeat with n in notes\n" +
            "        set i to i + 1\n" +
            "        if i > 20 then exit repeat\n" +
            "        set res to res & name of n & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Notes (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No notes" : `Error: ${r.output}`;
      },
    },
    create: {
      description: "Create a new note in iCloud",
      params: z.object({
        title: z.string().describe("Note title"),
        body: z.string().optional().describe("Note body text"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const body = p.body as string | undefined;
        const content = body ? `${title}\n\n${body}` : title;
        const r = await runAppleScript(
          'tell application "Notes"\n' +
            '    tell account "iCloud"\n' +
            '        tell folder "Notes"\n' +
            `            make new note with properties {name:"${safeAS(title)}", body:"${safeAS(content)}"}\n` +
            "        end tell\n" +
            "    end tell\n" +
            "end tell",
        );
        return r.ok ? `Note created: ${title}` : `Error: ${r.output}`;
      },
    },
    read: {
      description: "Read the content of a note by title (partial match)",
      params: z.object({
        title: z.string().describe("Note title (or partial match)"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const r = await runAppleScript(
          'tell application "Notes"\n' +
            `    set matchedNotes to (notes whose name contains "${safeAS(title)}")\n` +
            "    if (count of matchedNotes) > 0 then\n" +
            "        return plaintext of item 1 of matchedNotes\n" +
            "    else\n" +
            '        return "Note not found"\n' +
            "    end if\n" +
            "end tell",
        );
        return r.ok ? r.output.slice(0, 3000) : `Error: ${r.output}`;
      },
    },
    search: {
      description: "Search notes by title or content",
      params: z.object({
        query: z.string().describe("Search query"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const q = safeAS(query);
        const r = await runAppleScript(
          'tell application "Notes"\n' +
            '    set res to ""\n' +
            `    set matched to (notes whose name contains "${q}" or plaintext contains "${q}")\n` +
            "    set i to 0\n" +
            "    repeat with n in matched\n" +
            "        set i to i + 1\n" +
            "        if i > 10 then exit repeat\n" +
            "        set res to res & name of n & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Notes found (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No notes found" : `Error: ${r.output}`;
      },
    },
    delete: {
      description: "Delete a note by title",
      params: z.object({
        title: z.string().describe("Note title (or partial match)"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const r = await runAppleScript(
          'tell application "Notes"\n' +
            `    set matched to (notes whose name contains "${safeAS(title)}")\n` +
            "    if (count of matched) > 0 then\n" +
            "        delete item 1 of matched\n" +
            "    end if\n" +
            "end tell",
        );
        return r.ok
          ? `Note deleted: ${title}`
          : `Error: ${r.output}`;
      },
    },
    folders: {
      description: "List all note folders",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Notes" to get name of every folder',
        );
        if (r.ok) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Folders: ${names.join(", ")}`;
        }
        return `Error: ${r.output}`;
      },
    },
    move: {
      description: "Move a note to a folder",
      params: z.object({
        title: z.string().describe("Note title (or partial match)"),
        folder: z.string().describe("Destination folder name"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const folder = p.folder as string;
        const r = await runAppleScript(
          'tell application "Notes"\n' +
            `    set theNote to first note whose name contains "${safeAS(title)}"\n` +
            `    move theNote to folder "${safeAS(folder)}"\n` +
            "end tell",
        );
        return r.ok
          ? `Note "${title}" moved to folder "${folder}"`
          : `Error: ${r.output}`;
      },
    },
    append: {
      description: "Append text to an existing note",
      params: z.object({
        title: z.string().describe("Note title (or partial match)"),
        text: z.string().describe("Text to append"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const text = p.text as string;
        const r = await runAppleScript(
          'tell application "Notes"\n' +
            `    set matched to (notes whose name contains "${safeAS(title)}")\n` +
            "    if (count of matched) > 0 then\n" +
            `        set body of item 1 of matched to (body of item 1 of matched) & "<br>" & "${safeAS(text)}"\n` +
            "    end if\n" +
            "end tell",
        );
        return r.ok
          ? `Text appended to note: ${title}`
          : `Error: ${r.output}`;
      },
    },
    count: {
      description: "Count total notes",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Notes" to get count of notes',
        );
        return r.ok ? `Total notes: ${r.output}` : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
