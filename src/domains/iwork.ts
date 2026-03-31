import { z } from "zod";
import { runAppleScript, safeAS, safePath } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_iwork",
  description:
    "Control Pages, Numbers, and Keynote. Actions: pages_create, pages_open, pages_export_pdf, numbers_create, numbers_open, numbers_export_pdf, keynote_create, keynote_open, keynote_export_pdf, keynote_start_slideshow, keynote_stop_slideshow.",
  actions: {
    pages_create: {
      description: "Create a new Pages document",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Pages"\n' +
            "    activate\n" +
            "    make new document\n" +
            "end tell",
        );
        return r.ok ? "New Pages document created" : `Error: ${r.output}`;
      },
    },
    pages_open: {
      description: "Open a file in Pages",
      params: z.object({
        path: z.string().describe("POSIX path to the file"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "Pages"\n' +
            "    activate\n" +
            `    open POSIX file "${safeAS(validPath)}"\n` +
            "end tell",
        );
        return r.ok ? `Opened in Pages: ${validPath}` : `Error: ${r.output}`;
      },
    },
    pages_export_pdf: {
      description: "Export the front Pages document to PDF",
      params: z.object({
        path: z.string().describe("POSIX path for the exported PDF"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "Pages"\n' +
            `    export front document to POSIX file "${safeAS(validPath)}" as PDF\n` +
            "end tell",
        );
        return r.ok ? `Exported PDF: ${validPath}` : `Error: ${r.output}`;
      },
    },
    numbers_create: {
      description: "Create a new Numbers spreadsheet",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Numbers"\n' +
            "    activate\n" +
            "    make new document\n" +
            "end tell",
        );
        return r.ok
          ? "New Numbers spreadsheet created"
          : `Error: ${r.output}`;
      },
    },
    numbers_open: {
      description: "Open a file in Numbers",
      params: z.object({
        path: z.string().describe("POSIX path to the file"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "Numbers"\n' +
            "    activate\n" +
            `    open POSIX file "${safeAS(validPath)}"\n` +
            "end tell",
        );
        return r.ok ? `Opened in Numbers: ${validPath}` : `Error: ${r.output}`;
      },
    },
    numbers_export_pdf: {
      description: "Export the front Numbers document to PDF",
      params: z.object({
        path: z.string().describe("POSIX path for the exported PDF"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "Numbers"\n' +
            `    export front document to POSIX file "${safeAS(validPath)}" as PDF\n` +
            "end tell",
        );
        return r.ok ? `Exported PDF: ${validPath}` : `Error: ${r.output}`;
      },
    },
    keynote_create: {
      description: "Create a new Keynote presentation",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Keynote"\n' +
            "    activate\n" +
            "    make new document\n" +
            "end tell",
        );
        return r.ok
          ? "New Keynote presentation created"
          : `Error: ${r.output}`;
      },
    },
    keynote_open: {
      description: "Open a file in Keynote",
      params: z.object({
        path: z.string().describe("POSIX path to the file"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "Keynote"\n' +
            "    activate\n" +
            `    open POSIX file "${safeAS(validPath)}"\n` +
            "end tell",
        );
        return r.ok ? `Opened in Keynote: ${validPath}` : `Error: ${r.output}`;
      },
    },
    keynote_export_pdf: {
      description: "Export the front Keynote presentation to PDF",
      params: z.object({
        path: z.string().describe("POSIX path for the exported PDF"),
      }),
      handler: async (p) => {
        const validPath = safePath(p.path as string);
        if (!validPath) return "Error: invalid or forbidden path";
        const r = await runAppleScript(
          'tell application "Keynote"\n' +
            `    export front document to POSIX file "${safeAS(validPath)}" as PDF\n` +
            "end tell",
        );
        return r.ok ? `Exported PDF: ${validPath}` : `Error: ${r.output}`;
      },
    },
    keynote_start_slideshow: {
      description: "Start slideshow of the current Keynote presentation",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Keynote"\n' +
            "    activate\n" +
            "    start front document\n" +
            "end tell",
        );
        return r.ok ? "Slideshow started" : `Error: ${r.output}`;
      },
    },
    keynote_stop_slideshow: {
      description: "Stop the current Keynote slideshow",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Keynote"\n' +
            "    stop front document\n" +
            "end tell",
        );
        return r.ok ? "Slideshow stopped" : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
