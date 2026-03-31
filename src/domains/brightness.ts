import { runShell } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_brightness",
  description: "Control macOS display brightness. Actions: up, down.",
  actions: {
    up: {
      description: "Increase brightness by one step",
      handler: async () => {
        const r = await runShell([
          "osascript",
          "-e",
          'tell application "System Events" to key code 144',
        ]);
        return r.ok ? "Brightness increased" : `Error: ${r.output}`;
      },
    },
    down: {
      description: "Decrease brightness by one step",
      handler: async () => {
        const r = await runShell([
          "osascript",
          "-e",
          'tell application "System Events" to key code 145',
        ]);
        return r.ok ? "Brightness decreased" : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
