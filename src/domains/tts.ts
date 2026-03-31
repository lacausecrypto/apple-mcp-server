import { z } from "zod";
import { runShell } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_tts",
  description:
    "Text-to-speech on macOS. Actions: say, list_voices, stop.",
  actions: {
    say: {
      description: "Speak text aloud using macOS TTS",
      params: z.object({
        text: z.string().describe("Text to speak"),
        voice: z
          .string()
          .optional()
          .describe('Voice name (default: "Thomas")'),
        rate: z
          .number()
          .optional()
          .describe("Speech rate in words per minute (default: 200)"),
      }),
      handler: async (p) => {
        const text = p.text as string;
        const voice = (p.voice as string) || "Thomas";
        const rate = (p.rate as number) || 200;
        const r = await runShell([
          "say",
          "-v",
          voice,
          "-r",
          String(rate),
          text,
        ]);
        return r.ok
          ? `Said: ${text.slice(0, 80)}`
          : `Error: ${r.output}`;
      },
    },
    list_voices: {
      description: "List available TTS voices",
      handler: async () => {
        const r = await runShell(
          "say -v '?' | grep -i 'fr\\|en_' | head -20",
        );
        return r.ok ? r.output || "No voices found" : `Error: ${r.output}`;
      },
    },
    stop: {
      description: "Stop any ongoing speech",
      handler: async () => {
        await runShell(["killall", "say"]);
        return "TTS stopped";
      },
    },
  },
};

export default domain;
