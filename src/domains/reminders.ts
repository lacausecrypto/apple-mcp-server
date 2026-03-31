import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_reminders",
  description:
    "Control Apple Reminders. Actions: list_lists, list, add, complete, delete, set_due, set_priority, add_note, overdue, create_list.",
  actions: {
    list_lists: {
      description: "List all reminder lists",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Reminders" to get name of every list',
        );
        if (r.ok) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Lists: ${names.join(", ")}`;
        }
        return `Error: ${r.output}`;
      },
    },
    list: {
      description:
        "List incomplete reminders (from a specific list or default list)",
      params: z.object({
        list_name: z
          .string()
          .optional()
          .describe("List name (omit for default list)"),
      }),
      handler: async (p) => {
        const listName = p.list_name as string | undefined;
        const filterClause = listName
          ? `reminders of list "${safeAS(listName)}" whose completed is false`
          : "reminders of default list whose completed is false";
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            '    set res to ""\n' +
            `    set rems to (${filterClause})\n` +
            "    repeat with r in rems\n" +
            "        set res to res & name of r & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Reminders (${lines.length}):\n${lines
            .slice(0, 20)
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No reminders" : `Error: ${r.output}`;
      },
    },
    add: {
      description: "Add a new reminder",
      params: z.object({
        text: z.string().describe("Reminder text"),
        list_name: z
          .string()
          .optional()
          .describe("List name (omit for default list)"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const listName = p.list_name as string | undefined;
        const target = listName
          ? `list "${safeAS(listName)}"`
          : "default list";
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            `    tell ${target}\n` +
            `        make new reminder with properties {name:"${safeAS(text)}"}\n` +
            "    end tell\n" +
            "end tell",
        );
        return r.ok ? `Reminder added: ${text}` : `Error: ${r.output}`;
      },
    },
    complete: {
      description: "Mark a reminder as completed (matched by name)",
      params: z.object({
        text: z.string().describe("Reminder name to complete"),
        list_name: z
          .string()
          .optional()
          .describe("List name (omit for default list)"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const listName = p.list_name as string | undefined;
        const src = listName
          ? `list "${safeAS(listName)}"`
          : "default list";
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            `    set rems to (reminders of ${src} whose name is "${safeAS(text)}")\n` +
            "    repeat with r in rems\n" +
            "        set completed of r to true\n" +
            "    end repeat\n" +
            "end tell",
        );
        return r.ok
          ? `Reminder completed: ${text}`
          : `Reminder not found: ${text}`;
      },
    },
    delete: {
      description: "Delete a reminder by name",
      params: z.object({
        text: z.string().describe("Reminder name to delete"),
        list_name: z
          .string()
          .optional()
          .describe("List name (omit for default list)"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const listName = p.list_name as string | undefined;
        const src = listName
          ? `list "${safeAS(listName)}"`
          : "default list";
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            `    set rems to (reminders of ${src} whose name is "${safeAS(text)}")\n` +
            "    repeat with r in rems\n" +
            "        delete r\n" +
            "    end repeat\n" +
            "end tell",
        );
        return r.ok
          ? `Reminder deleted: ${text}`
          : `Error: ${r.output}`;
      },
    },
    set_due: {
      description: "Set a due date on a reminder",
      params: z.object({
        text: z.string().describe("Reminder name"),
        due_date: z
          .string()
          .describe("Due date in YYYY-MM-DD format"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const dateStr = p.due_date as string;
        const parts = dateStr.split("-");
        const mmddyyyy = `${parts[1]}/${parts[2]}/${parts[0]}`;
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            `    set rems to (reminders of default list whose name contains "${safeAS(text)}")\n` +
            "    if (count of rems) > 0 then\n" +
            `        set due date of item 1 of rems to date "${safeAS(mmddyyyy)}"\n` +
            "    end if\n" +
            "end tell",
        );
        return r.ok
          ? `Due date set for "${text}": ${dateStr}`
          : `Error: ${r.output}`;
      },
    },
    set_priority: {
      description: "Set priority on a reminder (0 = none, 1-9)",
      params: z.object({
        text: z.string().describe("Reminder name"),
        priority: z
          .number()
          .min(0)
          .max(9)
          .describe("Priority (0 = none, 1-9)"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const priority = p.priority as number;
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            `    set rems to (reminders of default list whose name contains "${safeAS(text)}")\n` +
            "    if (count of rems) > 0 then\n" +
            `        set priority of item 1 of rems to ${priority}\n` +
            "    end if\n" +
            "end tell",
        );
        return r.ok
          ? `Priority set for "${text}": ${priority}`
          : `Error: ${r.output}`;
      },
    },
    add_note: {
      description: "Add a note/body to a reminder",
      params: z.object({
        text: z.string().describe("Reminder name"),
        note_text: z.string().describe("Note text to add"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const noteText = p.note_text as string;
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            `    set rems to (reminders of default list whose name contains "${safeAS(text)}")\n` +
            "    if (count of rems) > 0 then\n" +
            `        set body of item 1 of rems to "${safeAS(noteText)}"\n` +
            "    end if\n" +
            "end tell",
        );
        return r.ok
          ? `Note added to "${text}"`
          : `Error: ${r.output}`;
      },
    },
    overdue: {
      description: "List overdue reminders",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Reminders"\n' +
            '    set res to ""\n' +
            "    set rems to (reminders whose completed is false and due date is not missing value and due date < (current date))\n" +
            "    repeat with r in rems\n" +
            "        set res to res & name of r & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Overdue reminders (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No overdue reminders" : `Error: ${r.output}`;
      },
    },
    create_list: {
      description: "Create a new reminder list",
      params: z.object({
        name: z.string().describe("Name for the new list"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "Reminders" to make new list with properties {name:"${safeAS(name)}"}`,
        );
        return r.ok
          ? `List created: ${name}`
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
