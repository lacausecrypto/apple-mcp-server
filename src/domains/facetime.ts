import { z } from "zod";
import { runShell } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_facetime",
  description: "Make FaceTime calls. Actions: call (video), audio.",
  actions: {
    call: {
      description: "Start a FaceTime video call",
      params: z.object({
        contact: z.string().describe("Phone number, email, or contact name"),
      }),
      handler: async (p) => {
        const contact = p.contact as string;
        const r = await runShell(["open", `facetime://${contact}`]);
        return r.ok ? `FaceTime: ${contact}` : `Error: ${r.output}`;
      },
    },
    audio: {
      description: "Start a FaceTime audio call",
      params: z.object({
        contact: z.string().describe("Phone number, email, or contact name"),
      }),
      handler: async (p) => {
        const contact = p.contact as string;
        const r = await runShell(["open", `facetime-audio://${contact}`]);
        return r.ok ? `FaceTime Audio: ${contact}` : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
