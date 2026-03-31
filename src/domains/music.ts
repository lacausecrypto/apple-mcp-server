import { z } from "zod";
import { runAppleScript, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_music",
  description:
    "Control Apple Music. Actions: play, pause, stop, next, prev, restart, now_playing, shuffle_on, shuffle_off, repeat_off, repeat_one, repeat_all, play_playlist, list_playlists, set_volume, love, dislike, search, play_song, queue_next, add_to_playlist, remove_from_playlist, create_playlist, delete_playlist, get_lyrics, radio.",
  actions: {
    play: {
      description: "Start playback",
      handler: async () => {
        const r = await runAppleScript('tell application "Music" to play');
        return r.ok ? "Playing" : `Error: ${r.output}`;
      },
    },
    pause: {
      description: "Pause playback",
      handler: async () => {
        const r = await runAppleScript('tell application "Music" to pause');
        return r.ok ? "Paused" : `Error: ${r.output}`;
      },
    },
    stop: {
      description: "Stop playback",
      handler: async () => {
        const r = await runAppleScript('tell application "Music" to stop');
        return r.ok ? "Stopped" : `Error: ${r.output}`;
      },
    },
    next: {
      description: "Skip to next track",
      handler: async () => {
        const r = await runAppleScript('tell application "Music" to next track');
        return r.ok ? "Next track" : `Error: ${r.output}`;
      },
    },
    prev: {
      description: "Go to previous track",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to previous track',
        );
        return r.ok ? "Previous track" : `Error: ${r.output}`;
      },
    },
    restart: {
      description: "Restart current track from the beginning",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music"\n' +
            "    set player position to 0\n" +
            "end tell",
        );
        return r.ok ? "Restarted from beginning" : `Error: ${r.output}`;
      },
    },
    now_playing: {
      description: "Get info about the currently playing track",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music"\n' +
            "    if player state is playing or player state is paused then\n" +
            "        set t to name of current track\n" +
            "        set a to artist of current track\n" +
            "        set al to album of current track\n" +
            "        set d to duration of current track\n" +
            "        set p to player position\n" +
            "        set mins to (round (d / 60) rounding down)\n" +
            "        set pm to (round (p / 60) rounding down)\n" +
            '        return t & " — " & a & " (" & al & ") " & pm & ":" & (round (p mod 60)) & "/" & mins & "min"\n' +
            "    else\n" +
            '        return "Nothing playing"\n' +
            "    end if\n" +
            "end tell",
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    shuffle_on: {
      description: "Enable shuffle mode",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to set shuffle enabled to true',
        );
        return r.ok ? "Shuffle enabled" : `Error: ${r.output}`;
      },
    },
    shuffle_off: {
      description: "Disable shuffle mode",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to set shuffle enabled to false',
        );
        return r.ok ? "Shuffle disabled" : `Error: ${r.output}`;
      },
    },
    repeat_off: {
      description: "Disable repeat",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to set song repeat to off',
        );
        return r.ok ? "Repeat off" : `Error: ${r.output}`;
      },
    },
    repeat_one: {
      description: "Repeat current track",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to set song repeat to one',
        );
        return r.ok ? "Repeat: one track" : `Error: ${r.output}`;
      },
    },
    repeat_all: {
      description: "Repeat all tracks",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to set song repeat to all',
        );
        return r.ok ? "Repeat: all tracks" : `Error: ${r.output}`;
      },
    },
    play_playlist: {
      description: "Play a specific playlist by name",
      params: z.object({
        name: z.string().describe("Playlist name"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          'tell application "Music"\n' +
            `    play playlist "${safeAS(name)}"\n` +
            "end tell",
        );
        return r.ok
          ? `Playing playlist: ${name}`
          : `Playlist "${name}" not found`;
      },
    },
    list_playlists: {
      description: "List all playlists",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to get name of every playlist',
        );
        if (r.ok) {
          const names = r.output
            .split(",")
            .map((n) => n.trim())
            .filter(Boolean);
          return `Playlists (${names.length}):\n${names
            .slice(0, 20)
            .map((n) => `  - ${n}`)
            .join("\n")}`;
        }
        return `Error: ${r.output}`;
      },
    },
    set_volume: {
      description: "Set Music app volume (independent of system volume)",
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
          `tell application "Music" to set sound volume to ${level}`,
        );
        return r.ok ? `Music volume: ${level}%` : `Error: ${r.output}`;
      },
    },
    love: {
      description: "Mark the current track as loved",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to set loved of current track to true',
        );
        return r.ok ? "Track loved" : `Error: ${r.output}`;
      },
    },
    dislike: {
      description: "Mark the current track as disliked",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to set disliked of current track to true',
        );
        return r.ok ? "Track disliked" : `Error: ${r.output}`;
      },
    },
    search: {
      description: "Search Music library by song or artist name (returns up to 20 results)",
      params: z.object({
        query: z.string().describe("Search query (song or artist name)"),
      }),
      handler: async (p) => {
        const query = p.query as string;
        const r = await runAppleScript(
          'tell application "Music"\n' +
            `    set matchedTracks to every track whose name contains "${safeAS(query)}" or artist contains "${safeAS(query)}"\n` +
            '    set output to ""\n' +
            "    set maxCount to 20\n" +
            "    set i to 0\n" +
            "    repeat with t in matchedTracks\n" +
            "        set i to i + 1\n" +
            "        if i > maxCount then exit repeat\n" +
            '        set output to output & name of t & " — " & artist of t & return\n' +
            "    end repeat\n" +
            "    return output\n" +
            "end tell",
        );
        if (r.ok && r.output) {
          return `Search results for "${query}":\n${r.output}`;
        }
        return r.ok ? `No results for "${query}"` : `Error: ${r.output}`;
      },
    },
    play_song: {
      description: "Play a specific song by name",
      params: z.object({
        name: z.string().describe("Song name to play"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "Music" to play (first track whose name contains "${safeAS(name)}")`,
        );
        return r.ok
          ? `Now playing: ${name}`
          : `Could not find or play "${name}": ${r.output}`;
      },
    },
    queue_next: {
      description:
        "Add a song to play next. Note: Music has limited queue support via AppleScript, so this will start playing the track immediately.",
      params: z.object({
        name: z.string().describe("Song name to queue"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "Music" to play (first track whose name contains "${safeAS(name)}")`,
        );
        return r.ok
          ? `Playing "${name}" (Note: Music AppleScript does not support true queue-next; track plays immediately)`
          : `Could not find "${name}": ${r.output}`;
      },
    },
    add_to_playlist: {
      description: "Add the currently playing track to a playlist",
      params: z.object({
        playlist_name: z.string().describe("Target playlist name"),
      }),
      handler: async (p) => {
        const playlist = p.playlist_name as string;
        const r = await runAppleScript(
          'tell application "Music"\n' +
            "    set theTrack to current track\n" +
            `    duplicate theTrack to playlist "${safeAS(playlist)}"\n` +
            "end tell",
        );
        return r.ok
          ? `Added current track to "${playlist}"`
          : `Error: ${r.output}`;
      },
    },
    remove_from_playlist: {
      description: "Remove a track from a playlist by name",
      params: z.object({
        track_name: z.string().describe("Track name to remove"),
        playlist_name: z.string().describe("Playlist to remove from"),
      }),
      handler: async (p) => {
        const track = p.track_name as string;
        const playlist = p.playlist_name as string;
        const r = await runAppleScript(
          'tell application "Music"\n' +
            `    set thePlaylist to playlist "${safeAS(playlist)}"\n` +
            `    delete (first track of thePlaylist whose name contains "${safeAS(track)}")\n` +
            "end tell",
        );
        return r.ok
          ? `Removed "${track}" from "${playlist}"`
          : `Error: ${r.output}`;
      },
    },
    create_playlist: {
      description: "Create a new empty playlist",
      params: z.object({
        name: z.string().describe("Name for the new playlist"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "Music" to make new playlist with properties {name:"${safeAS(name)}"}`,
        );
        return r.ok
          ? `Created playlist: ${name}`
          : `Error: ${r.output}`;
      },
    },
    delete_playlist: {
      description: "Delete a playlist by name",
      params: z.object({
        name: z.string().describe("Playlist name to delete"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runAppleScript(
          `tell application "Music" to delete playlist "${safeAS(name)}"`,
        );
        return r.ok
          ? `Deleted playlist: ${name}`
          : `Error: ${r.output}`;
      },
    },
    get_lyrics: {
      description: "Get lyrics of the currently playing track (if available)",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to get lyrics of current track',
        );
        if (r.ok && r.output && r.output.trim()) {
          return r.output;
        }
        return r.ok
          ? "No lyrics available for the current track"
          : `Error: ${r.output}`;
      },
    },
    radio: {
      description:
        "Open Apple Music radio. Note: AppleScript has limited support for radio stations; this activates the Music app.",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "Music" to activate',
        );
        return r.ok
          ? "Music app activated (radio station selection requires manual interaction — AppleScript has limited radio support)"
          : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
