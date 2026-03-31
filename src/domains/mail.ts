import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_mail",
  description:
    "Control Apple Mail. Actions: unread_count, check, unread_list, send, mark_all_read, read_body, search, draft, mailboxes, move_to_trash.",
  actions: {
    unread_count: {
      description: "Get the number of unread emails in inbox",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Mail" to get unread count of inbox',
        );
        return r.ok ? `${r.output} unread emails` : `Error: ${r.output}`;
      },
    },
    check: {
      description: "Check for new mail",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Mail" to check for new mail',
        );
        return r.ok ? "Checking for new mail..." : `Error: ${r.output}`;
      },
    },
    unread_list: {
      description: "List up to 10 unread emails (sender and subject)",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Mail"\n' +
            "    set unreadMsgs to (messages of inbox whose read status is false)\n" +
            '    set res to ""\n' +
            "    set maxCount to 10\n" +
            "    set i to 0\n" +
            "    repeat with msg in unreadMsgs\n" +
            "        set i to i + 1\n" +
            "        if i > maxCount then exit repeat\n" +
            "        set s to subject of msg\n" +
            "        set sn to sender of msg\n" +
            '        set res to res & sn & " — " & s & return\n' +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Unread emails (${lines.length}):\n${lines
            .map((l) => `  - ${l.slice(0, 80)}`)
            .join("\n")}`;
        }
        return r.ok ? "No unread emails" : `Error: ${r.output}`;
      },
    },
    send: {
      description: "Send an email",
      params: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject"),
        body: z.string().describe("Email body text"),
      }),
      handler: async (p) => {
        const to = p.to as string;
        const subject = p.subject as string;
        const body = p.body as string;
        const r = await runAppleScript(
          'tell application "Mail"\n' +
            `    set newMsg to make new outgoing message with properties {subject:"${safeAS(subject)}", content:"${safeAS(body)}", visible:true}\n` +
            "    tell newMsg\n" +
            `        make new to recipient with properties {address:"${safeAS(to)}"}\n` +
            "    end tell\n" +
            "    send newMsg\n" +
            "end tell",
        );
        return r.ok ? `Email sent to ${to}` : `Error: ${r.output}`;
      },
    },
    mark_all_read: {
      description: "Mark all inbox messages as read",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Mail" to set read status of every message of inbox whose read status is false to true',
        );
        return r.ok ? "All messages marked as read" : `Error: ${r.output}`;
      },
    },
    read_body: {
      description: "Read the body of a specific email by subject",
      params: z.object({
        subject: z.string().describe("Subject to search for"),
      }),
      handler: async (p) => {
        const subject = p.subject as string;
        const r = await runAppleScript(
          'tell application "Mail"\n' +
            `    set msgs to (messages of inbox whose subject contains "${safeAS(subject)}")\n` +
            "    if (count of msgs) > 0 then\n" +
            "        return content of item 1 of msgs\n" +
            "    end if\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          return r.output.slice(0, 2000);
        }
        return r.ok ? "No matching email found" : `Error: ${r.output}`;
      },
    },
    search: {
      description: "Search emails by keyword in subject or sender",
      params: z.object({
        query: z.string().describe("Search keyword"),
        mailbox: z
          .string()
          .optional()
          .default("inbox")
          .describe('Mailbox to search (default: "inbox")'),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const mailbox = (p.mailbox as string) || "inbox";
        const q = safeAS(query);
        const mb = safeAS(mailbox);
        const r = await runAppleScript(
          'tell application "Mail"\n' +
            '    set res to ""\n' +
            "    set i to 0\n" +
            `    set msgs to (messages of mailbox "${mb}" whose subject contains "${q}" or sender contains "${q}")\n` +
            "    repeat with msg in msgs\n" +
            "        set i to i + 1\n" +
            "        if i > 10 then exit repeat\n" +
            '        set res to res & sender of msg & " — " & subject of msg & return\n' +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Search results (${lines.length}):\n${lines
            .map((l) => `  - ${l.slice(0, 80)}`)
            .join("\n")}`;
        }
        return r.ok ? "No matching emails found" : `Error: ${r.output}`;
      },
    },
    draft: {
      description: "Create a draft email (visible but not sent)",
      params: z.object({
        to: z.string().describe("Recipient email address"),
        subject: z.string().describe("Email subject"),
        body: z.string().describe("Email body text"),
      }),
      handler: async (p) => {
        const to = p.to as string;
        const subject = p.subject as string;
        const body = p.body as string;
        const r = await runAppleScript(
          'tell application "Mail"\n' +
            `    set newMsg to make new outgoing message with properties {subject:"${safeAS(subject)}", content:"${safeAS(body)}", visible:true}\n` +
            "    tell newMsg\n" +
            `        make new to recipient with properties {address:"${safeAS(to)}"}\n` +
            "    end tell\n" +
            "end tell",
        );
        return r.ok
          ? `Draft created for ${to}: ${subject}`
          : `Error: ${r.output}`;
      },
    },
    mailboxes: {
      description: "List all mailboxes",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Mail" to get name of every mailbox',
        );
        if (r.ok) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Mailboxes: ${names.join(", ")}`;
        }
        return `Error: ${r.output}`;
      },
    },
    move_to_trash: {
      description: "Move an email to trash by subject",
      params: z.object({
        subject: z.string().describe("Subject of the email to trash"),
      }),
      handler: async (p) => {
        const subject = p.subject as string;
        const r = await runAppleScript(
          'tell application "Mail"\n' +
            `    set msgs to (messages of inbox whose subject contains "${safeAS(subject)}")\n` +
            "    if (count of msgs) > 0 then\n" +
            "        delete item 1 of msgs\n" +
            "    end if\n" +
            "end tell",
        );
        return r.ok
          ? `Email moved to trash: ${subject}`
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
