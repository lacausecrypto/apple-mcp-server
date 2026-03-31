import { z } from "zod";
import { runAppleScript, runShell, safeAS, safePath } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_finder",
  description:
    "Manage Finder: files, folders, trash, wallpaper, disks, tags. Actions: open_folder, reveal, desktop_files, empty_trash, trash_count, eject_disk, eject_all, set_wallpaper, create_folder, file_info, rename, move, copy, delete, create_alias, get_selection, tags, set_tag, list_folder, disk_info.",
  actions: {
    open_folder: {
      description: "Open a folder in Finder",
      params: z.object({
        path: z.string().describe("Path to the folder to open"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const r = await runShell(["open", p_path]);
        return r.ok ? `Folder opened: ${p_path}` : `Error: ${r.output}`;
      },
    },
    reveal: {
      description: "Reveal a file in Finder",
      params: z.object({
        path: z.string().describe("Path to the file to reveal"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const r = await runShell(["open", "-R", p_path]);
        return r.ok ? "File revealed in Finder" : `Error: ${r.output}`;
      },
    },
    desktop_files: {
      description: "List files on the desktop",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "Finder"\n` +
            `  set res to ""\n` +
            `  repeat with f in items of desktop\n` +
            `    set res to res & name of f & "\n"\n` +
            `  end repeat\n` +
            `  return res\n` +
            `end tell`,
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Desktop (${lines.length} items):\n${lines.map((l) => "  - " + l).join("\n")}`;
        }
        return r.ok ? "Desktop is empty" : `Error: ${r.output}`;
      },
    },
    empty_trash: {
      description: "Empty the Trash",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Finder" to empty trash',
        );
        return r.ok ? "Trash emptied" : `Error: ${r.output}`;
      },
    },
    trash_count: {
      description: "Count items in the Trash",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Finder" to get count of items of trash',
        );
        return r.ok ? `${r.output} items in Trash` : `Error: ${r.output}`;
      },
    },
    eject_disk: {
      description: "Eject a specific disk",
      params: z.object({
        name: z.string().describe("Name of the disk to eject"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "Finder" to eject disk "${safeAS(name)}"`,
        );
        return r.ok ? `Disk ejected: ${name}` : `Error: ${r.output}`;
      },
    },
    eject_all: {
      description: "Eject all mounted disks",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Finder" to eject every disk',
        );
        return r.ok ? "All disks ejected" : `Error: ${r.output}`;
      },
    },
    set_wallpaper: {
      description: "Set the desktop wallpaper",
      params: z.object({
        path: z.string().describe("POSIX path to the image file"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          `tell application "System Events" to tell every desktop to set picture to POSIX file "${safeAS(p_path)}"`,
        );
        return r.ok ? "Wallpaper changed" : `Error: ${r.output}`;
      },
    },
    create_folder: {
      description: "Create a new folder",
      params: z.object({
        name: z.string().describe("Name of the new folder"),
        location: z
          .string()
          .optional()
          .describe("Location (default: desktop)"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const location = (p.location as string) || "desktop";
        const r = await runAppleScript(
          `tell application "Finder" to make new folder at ${location} with properties {name:"${safeAS(name)}"}`,
        );
        return r.ok ? `Folder created: ${name}` : `Error: ${r.output}`;
      },
    },
    file_info: {
      description: "Get info about a file (size, type, modification date)",
      params: z.object({
        path: z.string().describe("Path to the file"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const stat = await runShell(`stat -f "%N %z bytes %Sm" "${safeAS(p_path)}"`);
        const type = await runShell(`file "${safeAS(p_path)}"`);
        return [
          stat.ok ? stat.output : `stat error: ${stat.output}`,
          type.ok ? type.output : `type error: ${type.output}`,
        ].join("\n");
      },
    },
    rename: {
      description: "Rename a file or folder",
      params: z.object({
        path: z.string().describe("Path to the file to rename"),
        new_name: z.string().describe("New name for the file"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const newName = p.new_name as string;
        const r = await runAppleScript(
          `tell application "Finder" to set name of (POSIX file "${safeAS(p_path)}" as alias) to "${safeAS(newName)}"`,
        );
        return r.ok ? `Renamed to: ${newName}` : `Error: ${r.output}`;
      },
    },
    move: {
      description: "Move a file or folder to a new location",
      params: z.object({
        path: z.string().describe("Path to the file to move"),
        destination: z.string().describe("Destination folder path"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const dest = p.destination as string;
        const r = await runAppleScript(
          `tell application "Finder" to move (POSIX file "${safeAS(p_path)}" as alias) to (POSIX file "${safeAS(dest)}" as alias)`,
        );
        return r.ok ? `Moved to: ${dest}` : `Error: ${r.output}`;
      },
    },
    copy: {
      description: "Copy a file or folder to a new location",
      params: z.object({
        path: z.string().describe("Path to the file to copy"),
        destination: z.string().describe("Destination folder path"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const dest = p.destination as string;
        const r = await runAppleScript(
          `tell application "Finder" to duplicate (POSIX file "${safeAS(p_path)}" as alias) to (POSIX file "${safeAS(dest)}" as alias)`,
        );
        return r.ok ? `Copied to: ${dest}` : `Error: ${r.output}`;
      },
    },
    delete: {
      description: "Move a file or folder to the Trash",
      params: z.object({
        path: z.string().describe("Path to the file to delete"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          `tell application "Finder" to delete (POSIX file "${safeAS(p_path)}" as alias)`,
        );
        return r.ok ? `Moved to Trash: ${p_path}` : `Error: ${r.output}`;
      },
    },
    create_alias: {
      description: "Create a Finder alias (symlink-like shortcut)",
      params: z.object({
        path: z.string().describe("Path to the original file"),
        destination: z.string().describe("Folder where the alias will be created"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const dest = p.destination as string;
        const r = await runAppleScript(
          `tell application "Finder" to make alias file to (POSIX file "${safeAS(p_path)}" as alias) at (POSIX file "${safeAS(dest)}" as alias)`,
        );
        return r.ok ? `Alias created in: ${dest}` : `Error: ${r.output}`;
      },
    },
    get_selection: {
      description: "Get the currently selected files in Finder",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "Finder"\n` +
            `  set sel to selection\n` +
            `  if (count of sel) is 0 then return "No selection"\n` +
            `  set res to ""\n` +
            `  repeat with f in sel\n` +
            `    set res to res & POSIX path of (f as alias) & "\n"\n` +
            `  end repeat\n` +
            `  return res\n` +
            `end tell`,
        );
        if (r.ok && r.output && r.output !== "No selection") {
          const lines = r.output.split("\n").map((l) => l.trim()).filter(Boolean);
          return `Selected (${lines.length}):\n${lines.map((l) => "  - " + l).join("\n")}`;
        }
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    tags: {
      description: "Get Finder tags of a file",
      params: z.object({
        path: z.string().describe("Path to the file"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const r = await runShell(`mdls -name kMDItemUserTags "${safeAS(p_path)}"`);
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    set_tag: {
      description: "Set a Finder tag on a file",
      params: z.object({
        path: z.string().describe("Path to the file"),
        tag: z.string().describe("Tag name to set"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const tag = p.tag as string;
        const r = await runShell(`xattr -w com.apple.metadata:_kMDItemUserTags '("${safeAS(tag)}")' "${safeAS(p_path)}"`);
        return r.ok ? `Tag "${tag}" set on: ${p_path}` : `Error: ${r.output}`;
      },
    },
    list_folder: {
      description: "List contents of a folder (up to 30 entries)",
      params: z.object({
        path: z.string().describe("Path to the folder"),
      }),
      handler: async (p) => {
        const p_path = safePath(p.path as string);
        if (!p_path) return "Error: invalid or forbidden path";
        const r = await runShell(`ls -la "${safeAS(p_path)}" | head -30`);
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    disk_info: {
      description: "Get info about mounted volumes and disks",
      handler: async () => {
        const df = await runShell("df -h");
        const diskutil = await runShell("diskutil list");
        return [
          "=== Disk Usage ===",
          df.ok ? df.output : `Error: ${df.output}`,
          "",
          "=== Disk List ===",
          diskutil.ok ? diskutil.output : `Error: ${diskutil.output}`,
        ].join("\n");
      },
    },
  },
};

export default domain;
