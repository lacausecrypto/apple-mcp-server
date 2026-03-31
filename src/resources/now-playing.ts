import { runAppleScript } from "../executor.js";
import type { ResourceDef } from "../types.js";

const resource: ResourceDef = {
  uri: "apple://now-playing",
  name: "Now Playing",
  description: "Current track info from Apple Music or Spotify",
  mimeType: "text/plain",
  read: async () => {
    // Try Music first
    const music = await runAppleScript(
      'tell application "Music"\n' +
        "    if player state is playing or player state is paused then\n" +
        '        set t to name of current track\n' +
        '        set a to artist of current track\n' +
        '        set al to album of current track\n' +
        '        set d to duration of current track\n' +
        '        set p to player position\n' +
        '        return "Music: " & t & " — " & a & " (" & al & ") " & (round (p / 60) rounding down) & ":" & (round (p mod 60)) & "/" & (round (d / 60) rounding down) & "min"\n' +
        "    end if\n" +
        "end tell",
    );
    if (music.ok && music.output) return music.output;

    // Try Spotify
    const spot = await runAppleScript(
      'tell application "Spotify"\n' +
        "    if player state is playing or player state is paused then\n" +
        '        return "Spotify: " & name of current track & " — " & artist of current track & " (" & album of current track & ")"\n' +
        "    end if\n" +
        "end tell",
    );
    if (spot.ok && spot.output) return spot.output;

    return "Nothing playing";
  },
};

export default resource;
