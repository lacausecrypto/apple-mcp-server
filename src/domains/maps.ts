import { z } from "zod";
import { runShell } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_maps",
  description: "Open Apple Maps with a search query or directions. Actions: open, directions.",
  actions: {
    open: {
      description: "Search for a place or get directions",
      params: z.object({
        query: z.string().describe("Place name, address, or search query"),
      }),
      handler: async (p) => {
        const query = (p.query as string).replace(/ /g, "+");
        const r = await runShell(["open", `maps://?q=${query}`]);
        return r.ok ? `Maps: ${p.query}` : `Error: ${r.output}`;
      },
    },
    directions: {
      description: "Get directions between two places in Apple Maps",
      params: z.object({
        from: z.string().describe("Starting location"),
        to: z.string().describe("Destination location"),
      }),
      handler: async (p) => {
        const from = (p.from as string).replace(/ /g, "+");
        const to = (p.to as string).replace(/ /g, "+");
        const r = await runShell(["open", `maps://?saddr=${from}&daddr=${to}`]);
        return r.ok
          ? `Maps: directions from ${p.from} to ${p.to}`
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
