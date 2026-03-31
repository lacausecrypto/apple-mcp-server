import { z } from "zod";
import { runAppleScript } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_volume",
  description:
    "Control macOS system volume. Actions: get, set, up, down, mute, unmute, info.",
  actions: {
    get: {
      description: "Get current volume level (0-100)",
      handler: async () => {
        const r = await runAppleScript("output volume of (get volume settings)");
        return r.ok ? `Volume: ${r.output}%` : `Error: ${r.output}`;
      },
    },
    set: {
      description: "Set volume to a specific level",
      params: z.object({
        level: z.number().min(0).max(100).describe("Volume level 0-100"),
      }),
      handler: async (p) => {
        const level = p.level as number;
        const r = await runAppleScript(`set volume output volume ${level}`);
        return r.ok ? `Volume set to ${level}%` : `Error: ${r.output}`;
      },
    },
    up: {
      description: "Increase volume by 10%",
      handler: async () => {
        const r = await runAppleScript(
          `set vol to output volume of (get volume settings)\n` +
            `set newVol to vol + 10\n` +
            `if newVol > 100 then set newVol to 100\n` +
            `set volume output volume newVol\n` +
            `return newVol`,
        );
        return r.ok ? `Volume: ${r.output}%` : `Error: ${r.output}`;
      },
    },
    down: {
      description: "Decrease volume by 10%",
      handler: async () => {
        const r = await runAppleScript(
          `set vol to output volume of (get volume settings)\n` +
            `set newVol to vol - 10\n` +
            `if newVol < 0 then set newVol to 0\n` +
            `set volume output volume newVol\n` +
            `return newVol`,
        );
        return r.ok ? `Volume: ${r.output}%` : `Error: ${r.output}`;
      },
    },
    mute: {
      description: "Mute system audio",
      handler: async () => {
        const r = await runAppleScript(
          "set volume with output muted\nreturn \"muted\"",
        );
        return r.ok ? "Audio muted" : `Error: ${r.output}`;
      },
    },
    unmute: {
      description: "Unmute system audio",
      handler: async () => {
        const r = await runAppleScript(
          "set volume without output muted\nreturn output volume of (get volume settings)",
        );
        return r.ok ? `Audio unmuted (volume: ${r.output}%)` : `Error: ${r.output}`;
      },
    },
    info: {
      description: "Get detailed audio info (volume, muted, input/output)",
      handler: async () => {
        const r = await runAppleScript(
          `set vs to get volume settings\n` +
            `return "Output: " & output volume of vs & "%, Muted: " & output muted of vs & ", Input: " & input volume of vs & "%"`,
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
