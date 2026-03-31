import { z } from "zod";
import { runAppleScript, runShell, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_podcasts",
  description:
    "Control Apple Podcasts. Actions: now_playing, play, pause, next, shows, episodes, search.",
  actions: {
    now_playing: {
      description: "Get info about the currently playing podcast episode",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Podcasts"\n' +
            "    if player state is playing or player state is paused then\n" +
            "        set epName to name of current track\n" +
            "        set showName to show of current track\n" +
            "        set dur to duration of current track\n" +
            "        set mins to (round (dur / 60) rounding down)\n" +
            '        return epName & " — " & showName & " (" & mins & " min)"\n' +
            "    else\n" +
            '        return "Nothing playing"\n' +
            "    end if\n" +
            "end tell",
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    play: {
      description: "Start or resume podcast playback",
      handler: async () => {
        const r = await runAppleScript('tell application "Podcasts" to play');
        return r.ok ? "Playing" : `Error: ${r.output}`;
      },
    },
    pause: {
      description: "Pause podcast playback",
      handler: async () => {
        const r = await runAppleScript('tell application "Podcasts" to pause');
        return r.ok ? "Paused" : `Error: ${r.output}`;
      },
    },
    next: {
      description: "Skip to the next episode",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Podcasts" to next track',
        );
        return r.ok ? "Next episode" : `Error: ${r.output}`;
      },
    },
    shows: {
      description: "List subscribed podcast shows",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Podcasts" to get name of every show',
        );
        if (r.ok && r.output) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Subscribed shows (${names.length}):\n${names
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return r.ok ? "No subscribed shows" : `Error: ${r.output}`;
      },
    },
    episodes: {
      description: "List recent episodes of a subscribed show",
      params: z.object({
        name: z.string().describe("Show name"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          'tell application "Podcasts"\n' +
            '    set res to ""\n' +
            `    set eps to episodes of show "${safeAS(name)}"\n` +
            "    set i to 0\n" +
            "    repeat with ep in eps\n" +
            "        set i to i + 1\n" +
            "        if i > 15 then exit repeat\n" +
            "        set res to res & name of ep & return\n" +
            "    end repeat\n" +
            "    return res\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          const lines = r.output
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean);
          return `Episodes of "${name}" (${lines.length}):\n${lines
            .map((l) => `  - ${l}`)
            .join("\n")}`;
        }
        return r.ok
          ? `No episodes found for "${name}"`
          : `Error: ${r.output}`;
      },
    },
    search: {
      description: "Search for podcasts (opens Podcasts app search)",
      params: z.object({
        query: z.string().describe("Search query"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const encoded = encodeURIComponent(query);
        const r = await runShell(
          `open "podcasts://search?term=${encoded}"`,
        );
        return r.ok
          ? `Opened Podcasts search for "${query}"`
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
