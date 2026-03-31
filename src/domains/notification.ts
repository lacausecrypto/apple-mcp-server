import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_notification",
  description:
    "Send macOS notifications. Actions: send.",
  actions: {
    send: {
      description: "Send a notification",
      params: z.object({
        title: z.string().describe("Notification title"),
        message: z.string().optional().describe("Notification body text"),
        sound: z
          .string()
          .optional()
          .describe('Sound name (default: "default")'),
      }),
      handler: async (p) => {
        const title = p.title as string;
        const message = (p.message as string) || "";
        const sound = (p.sound as string) || "default";
        let script = `display notification "${safeAS(message)}" with title "${safeAS(title)}"`;
        if (sound) {
          script += " " + `sound name "${safeAS(sound)}"`;
        }
        const r = await runAppleScript(script);
        return r.ok ? "Notification sent" : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
