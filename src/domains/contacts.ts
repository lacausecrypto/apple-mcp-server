import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_contacts",
  description:
    "Control Apple Contacts. Actions: search, get, list, create, groups, group_members, delete, update_phone, update_email.",
  actions: {
    search: {
      description: "Search contacts by name",
      params: z.object({
        query: z.string().describe("Name to search for"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const r = await runAppleScript(
          'tell application "Contacts"\n' +
            `    get name of every person whose name contains "${safeAS(query)}"\n` +
            "end tell",
        );
        if (r.ok && r.output) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Contacts matching "${query}" (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok ? "No contacts found" : `Error: ${r.output}`;
      },
    },
    get: {
      description: "Get full details of a contact by name",
      params: z.object({
        name: z.string().describe("Contact name"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          'tell application "Contacts"\n' +
            `    set matchedPersons to (every person whose name contains "${safeAS(name)}")\n` +
            "    if (count of matchedPersons) = 0 then\n" +
            '        return "Contact not found"\n' +
            "    end if\n" +
            "    set p to item 1 of matchedPersons\n" +
            '    set res to "Name: " & name of p\n' +
            "    try\n" +
            '        set res to res & return & "Organization: " & organization of p\n' +
            "    end try\n" +
            "    try\n" +
            "        set phoneList to value of every phone of p\n" +
            '        set res to res & return & "Phones: " & (phoneList as text)\n' +
            "    end try\n" +
            "    try\n" +
            "        set emailList to value of every email of p\n" +
            '        set res to res & return & "Emails: " & (emailList as text)\n' +
            "    end try\n" +
            "    try\n" +
            "        set addrList to formatted address of every address of p\n" +
            '        set res to res & return & "Addresses: " & (addrList as text)\n' +
            "    end try\n" +
            "    try\n" +
            '        set res to res & return & "Note: " & note of p\n' +
            "    end try\n" +
            "    return res\n" +
            "end tell",
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    list: {
      description: "List all contacts (first 30)",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Contacts"\n' +
            "    set allNames to name of every person\n" +
            '    set res to ""\n' +
            "    set i to 0\n" +
            "    repeat with n in allNames\n" +
            "        set i to i + 1\n" +
            "        if i > 30 then exit repeat\n" +
            "        set res to res & n & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Contacts (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok ? "No contacts found" : `Error: ${r.output}`;
      },
    },
    create: {
      description: "Create a new contact",
      params: z.object({
        first_name: z.string().describe("First name"),
        last_name: z.string().describe("Last name"),
        phone: z.string().optional().describe("Phone number"),
        email: z.string().optional().describe("Email address"),
      }),
      handler: async (p) => {
        const firstName = p.first_name as string;
        const lastName = p.last_name as string;
        const phone = p.phone as string | undefined;
        const email = p.email as string | undefined;

        let script =
          'tell application "Contacts"\n' +
          `    set newPerson to make new person with properties {first name:"${safeAS(firstName)}", last name:"${safeAS(lastName)}"}\n`;

        if (phone) {
          script +=
            `    tell newPerson\n` +
            `        make new phone at end of phones with properties {label:"mobile", value:"${safeAS(phone)}"}\n` +
            `    end tell\n`;
        }
        if (email) {
          script +=
            `    tell newPerson\n` +
            `        make new email at end of emails with properties {label:"home", value:"${safeAS(email)}"}\n` +
            `    end tell\n`;
        }

        script += "    save\n" + "end tell";

        const r = await runAppleScript(script);
        return r.ok
          ? `Contact created: ${firstName} ${lastName}`
          : `Error: ${r.output}`;
      },
    },
    groups: {
      description: "List all contact groups",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Contacts" to get name of every group',
        );
        if (r.ok && r.output) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Groups (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok ? "No groups found" : `Error: ${r.output}`;
      },
    },
    group_members: {
      description: "List members of a contact group",
      params: z.object({
        name: z.string().describe("Group name"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          'tell application "Contacts"\n' +
            `    get name of every person of group "${safeAS(name)}"\n` +
            "end tell",
        );
        if (r.ok && r.output) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Members of "${name}" (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok ? `No members in group "${name}"` : `Error: ${r.output}`;
      },
    },
    delete: {
      description: "Delete a contact by name",
      params: z.object({
        name: z.string().describe("Contact name to delete"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          'tell application "Contacts"\n' +
            `    set matched to (every person whose name contains "${safeAS(name)}")\n` +
            "    if (count of matched) > 0 then\n" +
            "        delete item 1 of matched\n" +
            "        save\n" +
            "    end if\n" +
            "end tell",
        );
        return r.ok ? `Contact "${name}" deleted` : `Error: ${r.output}`;
      },
    },
    update_phone: {
      description: "Update the phone number of a contact",
      params: z.object({
        name: z.string().describe("Contact name"),
        phone: z.string().describe("New phone number"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const phone = p.phone as string;
        const r = await runAppleScript(
          'tell application "Contacts"\n' +
            `    set p to first person whose name contains "${safeAS(name)}"\n` +
            `    set value of first phone of p to "${safeAS(phone)}"\n` +
            "    save\n" +
            "end tell",
        );
        return r.ok
          ? `Phone updated for "${name}"`
          : `Error: ${r.output}`;
      },
    },
    update_email: {
      description: "Update the email address of a contact",
      params: z.object({
        name: z.string().describe("Contact name"),
        email: z.string().describe("New email address"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const email = p.email as string;
        const r = await runAppleScript(
          'tell application "Contacts"\n' +
            `    set p to first person whose name contains "${safeAS(name)}"\n` +
            `    set value of first email of p to "${safeAS(email)}"\n` +
            "    save\n" +
            "end tell",
        );
        return r.ok
          ? `Email updated for "${name}"`
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
