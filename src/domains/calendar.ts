import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_calendar",
  description:
    "Control Apple Calendar. Actions: list, today, tomorrow, create_event, delete_event, week, date_events, modify_event.",
  actions: {
    list: {
      description: "List all calendar names",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Calendar" to get name of every calendar',
        );
        if (r.ok) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Calendars: ${names.join(", ")}`;
        }
        return `Error: ${r.output}`;
      },
    },
    today: {
      description: "List today's events across all calendars",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Calendar"\n' +
            "    set today to current date\n" +
            "    set time of today to 0\n" +
            "    set tomorrow to today + (1 * days)\n" +
            '    set res to ""\n' +
            "    repeat with cal in calendars\n" +
            "        set evts to (every event of cal whose start date >= today and start date < tomorrow)\n" +
            "        repeat with evt in evts\n" +
            "            set h to hours of (start date of evt)\n" +
            "            set mn to minutes of (start date of evt)\n" +
            '            if mn < 10 then set mn to "0" & mn\n' +
            '            set res to res & h & ":" & mn & " " & summary of evt & return\n' +
            "        end repeat\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Today (${lines.length} events):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No events today" : `Error: ${r.output}`;
      },
    },
    tomorrow: {
      description: "List tomorrow's events across all calendars",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Calendar"\n' +
            "    set today to current date\n" +
            "    set time of today to 0\n" +
            "    set tomorrow to today + (1 * days)\n" +
            "    set dayAfter to today + (2 * days)\n" +
            '    set res to ""\n' +
            "    repeat with cal in calendars\n" +
            "        set evts to (every event of cal whose start date >= tomorrow and start date < dayAfter)\n" +
            "        repeat with evt in evts\n" +
            "            set h to hours of (start date of evt)\n" +
            "            set mn to minutes of (start date of evt)\n" +
            '            if mn < 10 then set mn to "0" & mn\n' +
            '            set res to res & h & ":" & mn & " " & summary of evt & return\n' +
            "        end repeat\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Tomorrow (${lines.length} events):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No events tomorrow" : `Error: ${r.output}`;
      },
    },
    create_event: {
      description: "Create a new calendar event for today",
      params: z.object({
        title: z.string().describe("Event title"),
        cal_name: z
          .string()
          .optional()
          .default("Calendar")
          .describe("Calendar name (default: Calendar)"),
        hour: z
          .number()
          .min(0)
          .max(23)
          .optional()
          .default(9)
          .describe("Start hour (0-23, default: 9)"),
        duration: z
          .number()
          .min(0)
          .optional()
          .default(1)
          .describe("Duration in hours (default: 1)"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const calName = (p.cal_name as string) || "Calendar";
        const hour = (p.hour as number) ?? 9;
        const duration = (p.duration as number) ?? 1;
        const r = await runAppleScript(
          'tell application "Calendar"\n' +
            "    set startDate to current date\n" +
            `    set hours of startDate to ${hour}\n` +
            "    set minutes of startDate to 0\n" +
            "    set seconds of startDate to 0\n" +
            `    set endDate to startDate + (${duration} * hours)\n` +
            `    tell calendar "${safeAS(calName)}"\n` +
            `        make new event with properties {summary:"${safeAS(title)}", start date:startDate, end date:endDate}\n` +
            "    end tell\n" +
            "end tell",
        );
        return r.ok
          ? `Event created: ${title} at ${hour}h`
          : `Error: ${r.output}`;
      },
    },
    delete_event: {
      description: "Delete an event by title",
      params: z.object({
        title: z.string().describe("Event title to delete"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const r = await runAppleScript(
          'tell application "Calendar"\n' +
            "    repeat with cal in calendars\n" +
            `        set evts to (every event of cal whose summary is "${safeAS(title)}")\n` +
            "        repeat with evt in evts\n" +
            "            delete evt\n" +
            "        end repeat\n" +
            "    end repeat\n" +
            "end tell",
        );
        return r.ok
          ? `Event deleted: ${title}`
          : `Error: ${r.output}`;
      },
    },
    week: {
      description: "List events for the next 7 days across all calendars",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Calendar"\n' +
            "    set today to current date\n" +
            "    set time of today to 0\n" +
            "    set weekEnd to today + (7 * days)\n" +
            '    set res to ""\n' +
            "    repeat with cal in calendars\n" +
            "        set evts to (every event of cal whose start date >= today and start date < weekEnd)\n" +
            "        repeat with evt in evts\n" +
            "            set d to start date of evt\n" +
            "            set m to (month of d as integer)\n" +
            "            set dy to day of d\n" +
            "            set h to hours of d\n" +
            "            set mn to minutes of d\n" +
            '            if mn < 10 then set mn to "0" & mn\n' +
            '            set res to res & m & "/" & dy & " " & h & ":" & mn & " " & summary of evt & return\n' +
            "        end repeat\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Next 7 days (${lines.length} events):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No events in the next 7 days" : `Error: ${r.output}`;
      },
    },
    date_events: {
      description: "List events for a specific date",
      params: z.object({
        date: z
          .string()
          .describe("Date in YYYY-MM-DD format"),
      }),
      handler: async (p) => {
        const dateStr = p.date as string;
        const parts = dateStr.split("-");
        const mmddyyyy = `${parts[1]}/${parts[2]}/${parts[0]}`;
        const r = await runAppleScript(
          'tell application "Calendar"\n' +
            `    set targetDate to date "${safeAS(mmddyyyy)}"\n` +
            "    set nextDay to targetDate + (1 * days)\n" +
            '    set res to ""\n' +
            "    repeat with cal in calendars\n" +
            "        set evts to (every event of cal whose start date >= targetDate and start date < nextDay)\n" +
            "        repeat with evt in evts\n" +
            "            set h to hours of (start date of evt)\n" +
            "            set mn to minutes of (start date of evt)\n" +
            '            if mn < 10 then set mn to "0" & mn\n' +
            '            set res to res & h & ":" & mn & " " & summary of evt & return\n' +
            "        end repeat\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Events on ${dateStr} (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? `No events on ${dateStr}` : `Error: ${r.output}`;
      },
    },
    modify_event: {
      description: "Modify an event's start time",
      params: z.object({
        title: z.string().describe("Event title to modify"),
        hour: z
          .number()
          .min(0)
          .max(23)
          .describe("New start hour (0-23)"),
        duration: z
          .number()
          .min(0)
          .optional()
          .describe("New duration in hours (optional)"),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const hour = p.hour as number;
        const duration = p.duration as number | undefined;
        const durationScript = duration
          ? `            set end date of evt to (start date of evt) + (${duration} * hours)\n`
          : "";
        const r = await runAppleScript(
          'tell application "Calendar"\n' +
            "    repeat with cal in calendars\n" +
            `        set evts to (every event of cal whose summary is "${safeAS(title)}")\n` +
            "        repeat with evt in evts\n" +
            "            set sd to start date of evt\n" +
            `            set hours of sd to ${hour}\n` +
            "            set minutes of sd to 0\n" +
            "            set seconds of sd to 0\n" +
            "            set start date of evt to sd\n" +
            durationScript +
            "        end repeat\n" +
            "    end repeat\n" +
            "end tell",
        );
        return r.ok
          ? `Event modified: ${title} moved to ${hour}h`
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
