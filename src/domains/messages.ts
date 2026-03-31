import { z } from "zod";
import { writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { runAppleScript, runShell, safeAS, safeSQL } from "../executor.js";
import type { DomainModule } from "../types.js";

import { homedir } from "node:os";
const CHAT_DB = join(homedir(), "Library/Messages/chat.db");

const domain: DomainModule = {
  name: "apple_messages",
  description:
    "Control Apple Messages / iMessage. Actions: recent, send, unread, conversation, search.",
  actions: {
    recent: {
      description: "Get the 10 most recent conversations",
      handler: async () => {
        const r = await runShell([
          "sqlite3", CHAT_DB,
          "SELECT c.chat_identifier, m.text FROM message m JOIN chat_message_join cmj ON m.ROWID=cmj.message_id JOIN chat c ON cmj.chat_id=c.ROWID WHERE m.text IS NOT NULL ORDER BY m.date DESC LIMIT 10",
        ]);
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Recent conversations (${lines.length}):\n${lines
            .map((l) => `  - ${l.slice(0, 120)}`)
            .join("\n")}`;
        }
        return r.ok ? "No recent messages" : `Error: ${r.output}`;
      },
    },
    send: {
      description: "Send an iMessage to a contact",
      params: z.object({
        to: z.string().describe("Phone number or email of recipient"),
        text: z.string().describe("Message text to send"),
      }),
      handler: async (p) => {
        const to = p.to as string;
        const text = p.text as string;

        // Write message text to temp file to avoid AS quoting issues
        const tmpFile = join(tmpdir(), `apple-mcp-msg-${randomUUID()}.txt`);
        writeFileSync(tmpFile, text, "utf-8");

        const r = await runAppleScript(
          `set msgContent to read POSIX file "${safeAS(tmpFile)}" as «class utf8»\n` +
            'tell application "Messages"\n' +
            "    set targetService to 1st account whose service type = iMessage\n" +
            `    set targetBuddy to participant "${safeAS(to)}" of targetService\n` +
            "    send msgContent to targetBuddy\n" +
            "end tell",
        );

        // Cleanup temp file
        try {
          const { unlinkSync } = await import("node:fs");
          unlinkSync(tmpFile);
        } catch {
          // ignore cleanup errors
        }

        return r.ok ? `Message sent to ${to}` : `Error: ${r.output}`;
      },
    },
    unread: {
      description: "Count unread messages",
      handler: async () => {
        const r = await runShell([
          "sqlite3", CHAT_DB,
          "SELECT COUNT(*) FROM message WHERE is_read=0 AND is_from_me=0",
        ]);
        return r.ok ? `Unread messages: ${r.output}` : `Error: ${r.output}`;
      },
    },
    conversation: {
      description: "Read messages from a specific contact",
      params: z.object({
        contact: z.string().describe("Phone number or email (chat_identifier)"),
        limit: z
          .number()
          .optional()
          .describe("Number of messages to retrieve (default 10)"),
      }),
      handler: async (p) => {
        const contact = p.contact as string;
        const limit = (p.limit as number | undefined) ?? 10;
        // Use parameterized-style quoting for the contact value
        const safeContact = safeSQL(contact);
        const r = await runShell([
          "sqlite3", CHAT_DB,
          `SELECT CASE WHEN m.is_from_me=1 THEN 'Me' ELSE c.chat_identifier END || ': ' || m.text FROM message m JOIN chat_message_join cmj ON m.ROWID=cmj.message_id JOIN chat c ON cmj.chat_id=c.ROWID WHERE c.chat_identifier='${safeContact}' AND m.text IS NOT NULL ORDER BY m.date DESC LIMIT ${limit}`,
        ]);
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Conversation with ${contact} (${lines.length} messages):\n${lines
            .map((l) => `  ${l.slice(0, 200)}`)
            .join("\n")}`;
        }
        return r.ok
          ? `No messages found for ${contact}`
          : `Error: ${r.output}`;
      },
    },
    search: {
      description: "Search messages by keyword",
      params: z.object({
        query: z.string().describe("Keyword to search for in messages"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const safeQuery = safeSQL(query);
        const r = await runShell([
          "sqlite3",
          CHAT_DB,
          `SELECT c.chat_identifier, m.text FROM message m JOIN chat_message_join cmj ON m.ROWID=cmj.message_id JOIN chat c ON cmj.chat_id=c.ROWID WHERE m.text LIKE '%${safeQuery}%' ORDER BY m.date DESC LIMIT 10`,
        ]);
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Messages matching "${query}" (${lines.length}):\n${lines
            .map((l) => `  - ${l.slice(0, 150)}`)
            .join("\n")}`;
        }
        return r.ok ? `No messages matching "${query}"` : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
