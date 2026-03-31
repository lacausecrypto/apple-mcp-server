import { z } from "zod";
import { runAppleScript, safeAS, safePath } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_photos",
  description:
    "Control Apple Photos. Actions: albums, recent, search, favorites, album_contents, export, count, create_album, add_to_album, import.",
  actions: {
    albums: {
      description: "List all photo albums",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Photos" to get name of every album',
        );
        if (r.ok && r.output) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Albums (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok ? "No albums found" : `Error: ${r.output}`;
      },
    },
    recent: {
      description: "Get info about 10 most recent photos",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Photos"\n' +
            '    set res to ""\n' +
            "    set recentItems to media items 1 thru 10\n" +
            "    repeat with item_ in recentItems\n" +
            "        set fn to filename of item_\n" +
            "        set d to date of item_\n" +
            "        set w to width of item_\n" +
            "        set h to height of item_\n" +
            '        set res to res & fn & " | " & (d as text) & " | " & w & "x" & h & return\n' +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Recent photos (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No photos found" : `Error: ${r.output}`;
      },
    },
    search: {
      description: "Search photos by keyword in name or description",
      params: z.object({
        query: z.string().describe("Search keyword"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const q = safeAS(query);
        const r = await runAppleScript(
          'tell application "Photos"\n' +
            '    set res to ""\n' +
            `    set matched to (every media item whose name contains "${q}" or description contains "${q}")\n` +
            "    set i to 0\n" +
            "    repeat with item_ in matched\n" +
            "        set i to i + 1\n" +
            "        if i > 20 then exit repeat\n" +
            "        set res to res & filename of item_ & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Photos matching "${query}" (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No photos found" : `Error: ${r.output}`;
      },
    },
    favorites: {
      description: "List favorited photos (up to 20)",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Photos"\n' +
            '    set res to ""\n' +
            "    set favs to (every media item whose favorite is true)\n" +
            "    set i to 0\n" +
            "    repeat with item_ in favs\n" +
            "        set i to i + 1\n" +
            "        if i > 20 then exit repeat\n" +
            "        set res to res & filename of item_ & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Favorited photos (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No favorited photos" : `Error: ${r.output}`;
      },
    },
    album_contents: {
      description: "List photos in a specific album (up to 20)",
      params: z.object({
        name: z.string().describe("Album name"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          'tell application "Photos"\n' +
            '    set res to ""\n' +
            `    set items_ to every media item of album "${safeAS(name)}"\n` +
            "    set i to 0\n" +
            "    repeat with item_ in items_\n" +
            "        set i to i + 1\n" +
            "        if i > 20 then exit repeat\n" +
            "        set res to res & filename of item_ & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Photos in "${name}" (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? `No photos in album "${name}"` : `Error: ${r.output}`;
      },
    },
    export: {
      description: "Export a photo to the Desktop by filename",
      params: z.object({
        filename: z.string().describe("Photo filename to export"),
      }),
      handler: async (p) => {
        const filename = p.filename as string;
        const r = await runAppleScript(
          'tell application "Photos"\n' +
            `    set matched to (every media item whose filename is "${safeAS(filename)}")\n` +
            "    if (count of matched) = 0 then\n" +
            '        return "Photo not found"\n' +
            "    end if\n" +
            "    set destFolder to POSIX file ((POSIX path of (path to desktop)))\n" +
            "    export {item 1 of matched} to destFolder\n" +
            '    return "Exported"\n' +
            "end tell",
        );
        return r.ok ? `Photo "${filename}" exported to Desktop` : `Error: ${r.output}`;
      },
      timeout: 30_000,
    },
    count: {
      description: "Get total number of photos in library",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Photos" to get count of media items',
        );
        return r.ok ? `Total photos: ${r.output}` : `Error: ${r.output}`;
      },
    },
    create_album: {
      description: "Create a new photo album",
      params: z.object({
        name: z.string().describe("Name for the new album"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "Photos" to make new album named "${safeAS(name)}"`,
        );
        return r.ok
          ? `Album "${name}" created`
          : `Error: ${r.output}`;
      },
    },
    add_to_album: {
      description: "Import a photo file into a specific album",
      params: z.object({
        path: z.string().describe("POSIX path to the photo file"),
        album: z.string().describe("Album name to add the photo to"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const album = p.album as string;
        const r = await runAppleScript(
          `tell application "Photos" to import POSIX file "${safeAS(validPath)}" into album "${safeAS(album)}"`,
        );
        return r.ok
          ? `Photo imported into album "${album}"`
          : `Error: ${r.output}`;
      },
      timeout: 30_000,
    },
    import: {
      description: "Import a photo file into the Photos library",
      params: z.object({
        path: z.string().describe("POSIX path to the photo file to import"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          `tell application "Photos" to import POSIX file "${safeAS(validPath)}"`,
        );
        return r.ok
          ? `Photo imported: ${validPath}`
          : `Error: ${r.output}`;
      },
      timeout: 30_000,
    },
  },
};

export default domain;
