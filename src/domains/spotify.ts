import { z } from "zod";
import { runAppleScript, safeAS, runShell } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_spotify",
  description:
    "Control Spotify. Actions: play, pause, next, prev, now_playing, set_volume, shuffle, playpause, play_playlist, list_playlists, like, repeat_off, repeat_on, search, play_track, current_album, current_artist.",
  actions: {
    play: {
      description: "Start Spotify playback",
      handler: async () => {
        const r = await runAppleScript('tell application "Spotify" to play');
        return r.ok ? "Spotify: playing" : `Error: ${r.output}`;
      },
    },
    pause: {
      description: "Pause Spotify playback",
      handler: async () => {
        const r = await runAppleScript('tell application "Spotify" to pause');
        return r.ok ? "Spotify: paused" : `Error: ${r.output}`;
      },
    },
    next: {
      description: "Skip to next track on Spotify",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to next track',
        );
        return r.ok ? "Spotify: next track" : `Error: ${r.output}`;
      },
    },
    prev: {
      description: "Go to previous track on Spotify",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to previous track',
        );
        return r.ok ? "Spotify: previous track" : `Error: ${r.output}`;
      },
    },
    now_playing: {
      description: "Get info about the currently playing Spotify track",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify"\n' +
            "    if player state is playing or player state is paused then\n" +
            "        set t to name of current track\n" +
            "        set a to artist of current track\n" +
            "        set al to album of current track\n" +
            '        return t & " — " & a & " (" & al & ")"\n' +
            "    else\n" +
            '        return "Nothing playing on Spotify"\n' +
            "    end if\n" +
            "end tell",
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    set_volume: {
      description: "Set Spotify volume",
      params: z.object({
        level: z
          .number()
          .min(0)
          .max(100)
          .describe("Volume level 0-100"),
      }),
      handler: async (p) => {
        const level = p.level as number;
        const r = await runAppleScript(
          `tell application "Spotify" to set sound volume to ${level}`,
        );
        return r.ok ? `Spotify volume: ${level}%` : `Error: ${r.output}`;
      },
    },
    shuffle: {
      description: "Toggle shuffle mode on Spotify",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to set shuffling to not shuffling',
        );
        return r.ok ? "Spotify: shuffle toggled" : `Error: ${r.output}`;
      },
    },
    playpause: {
      description: "Toggle play/pause on Spotify",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to playpause',
        );
        return r.ok ? "Spotify: play/pause toggled" : `Error: ${r.output}`;
      },
    },
    play_playlist: {
      description:
        "Search for a playlist by name in Spotify (opens Spotify search)",
      params: z.object({
        name: z.string().describe("Playlist name to search for"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const encoded = encodeURIComponent(name);
        const r = await runShell(["open", `spotify:search:${encoded}`]);
        return r.ok
          ? `Spotify search opened for playlist: ${name}`
          : `Error: ${r.output}`;
      },
    },
    list_playlists: {
      description:
        "Open your Spotify playlists collection (AppleScript cannot list playlists directly)",
      handler: async () => {
        const r = await runShell(["open", "spotify:collection:playlists"]);
        return r.ok
          ? "Opened Spotify playlists collection. Note: Spotify AppleScript doesn't support listing playlists programmatically."
          : `Error: ${r.output}`;
      },
    },
    like: {
      description:
        "Like/save the current track (note: limited support via AppleScript)",
      handler: async () => {
        return "Spotify doesn't expose like/save via AppleScript. Use the Spotify app or keyboard shortcut to save the current track.";
      },
    },
    repeat_off: {
      description: "Set Spotify repeat mode to off",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to set repeating to false',
        );
        return r.ok ? "Spotify: repeat off" : `Error: ${r.output}`;
      },
    },
    repeat_on: {
      description: "Set Spotify repeat mode to on",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to set repeating to true',
        );
        return r.ok ? "Spotify: repeat on" : `Error: ${r.output}`;
      },
    },
    search: {
      description: "Search Spotify for a query (opens Spotify search)",
      params: z.object({
        query: z.string().describe("Search query"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const encoded = query.replace(/ /g, "%20");
        const r = await runShell(["open", `spotify:search:${encoded}`]);
        return r.ok
          ? `Spotify search opened for: ${query}`
          : `Error: ${r.output}`;
      },
    },
    play_track: {
      description: "Play a specific Spotify track by URI",
      params: z.object({
        uri: z
          .string()
          .describe(
            'Spotify track URI (e.g. "spotify:track:4iV5W9uYEdYUVa79Axb7Rh")',
          ),
      }),
      handler: async (p) => {
        const uri = p.uri as string;
        const r = await runAppleScript(
          `tell application "Spotify" to play track "${safeAS(uri)}"`,
        );
        return r.ok ? `Spotify: playing track ${uri}` : `Error: ${r.output}`;
      },
    },
    current_album: {
      description: "Get the album name of the currently playing Spotify track",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to get album of current track',
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    current_artist: {
      description: "Get the artist of the currently playing Spotify track",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Spotify" to get artist of current track',
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
