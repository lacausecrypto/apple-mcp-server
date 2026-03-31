import { z } from "zod";
import { runAppleScript, runShell, safeAS } from "../executor.js";
import type { DomainModule } from "../types.js";

/** Map human-readable pane names to System Preferences bundle IDs. */
const paneMap: Record<string, string> = {
  wifi: "com.apple.preference.network",
  network: "com.apple.preference.network",
  bluetooth: "com.apple.preferences.Bluetooth",
  sound: "com.apple.preference.sound",
  display: "com.apple.preference.displays",
  keyboard: "com.apple.preference.keyboard",
  trackpad: "com.apple.preference.trackpad",
  battery: "com.apple.preference.battery",
  security: "com.apple.preference.security",
  notifications: "com.apple.preference.notifications",
  general: "com.apple.preference.general",
};

const domain: DomainModule = {
  name: "apple_system",
  description:
    "System controls: sleep, restart, shutdown, lock, dark mode, DND, caffeinate, wifi, bluetooth, shortcuts, prefs, audio, screen saver, AirDrop, login items, Time Machine, audio devices. Actions: sleep, sleep_display, restart, shutdown, logout, lock, dark_mode, dnd_on, dnd_off, caffeinate, decaffeinate, wifi_status, wifi_on, wifi_off, wifi_network, bluetooth_on, bluetooth_off, run_shortcut, list_shortcuts, open_prefs, display_settings, sound_settings, network_settings, airdrop, screen_saver, login_items, eject_all_disks, time_machine, audio_output, audio_input.",
  actions: {
    sleep: {
      description: "Put the Mac to sleep",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to sleep',
        );
        return r.ok ? "Mac sleeping" : `Error: ${r.output}`;
      },
    },
    sleep_display: {
      description: "Turn off the display (sleep display only)",
      handler: async () => {
        const r = await runShell(["pmset", "displaysleepnow"]);
        return r.ok ? "Display sleeping" : `Error: ${r.output}`;
      },
    },
    restart: {
      description: "Restart the Mac",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to restart',
        );
        return r.ok ? "Restarting..." : `Error: ${r.output}`;
      },
    },
    shutdown: {
      description: "Shut down the Mac",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to shut down',
        );
        return r.ok ? "Shutting down..." : `Error: ${r.output}`;
      },
    },
    logout: {
      description: "Log out the current user",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to log out',
        );
        return r.ok ? "Logging out..." : `Error: ${r.output}`;
      },
    },
    lock: {
      description: "Lock the screen",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to keystroke "q" using {command down, control down}',
        );
        return r.ok ? "Screen locked" : `Error: ${r.output}`;
      },
    },
    dark_mode: {
      description: "Toggle dark mode on/off",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "System Events"\n` +
            `  tell appearance preferences\n` +
            `    set dark mode to not dark mode\n` +
            `    if dark mode then\n` +
            `      return "Dark mode enabled"\n` +
            `    else\n` +
            `      return "Light mode enabled"\n` +
            `    end if\n` +
            `  end tell\n` +
            `end tell`,
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    dnd_on: {
      description: "Enable Do Not Disturb",
      handler: async () => {
        const r = await runAppleScript(
          'do shell script "defaults -currentHost write com.apple.notificationcenterui doNotDisturb -boolean true && killall NotificationCenter 2>/dev/null; true"',
        );
        return r.ok ? "Do Not Disturb enabled" : `Error: ${r.output}`;
      },
    },
    dnd_off: {
      description: "Disable Do Not Disturb",
      handler: async () => {
        const r = await runAppleScript(
          'do shell script "defaults -currentHost write com.apple.notificationcenterui doNotDisturb -boolean false && killall NotificationCenter 2>/dev/null; true"',
        );
        return r.ok ? "Do Not Disturb disabled" : `Error: ${r.output}`;
      },
    },
    caffeinate: {
      description: "Prevent Mac from sleeping for N minutes (default 60)",
      params: z.object({
        minutes: z
          .number()
          .optional()
          .describe("Minutes to stay awake (default 60)"),
      }),
      handler: async (p) => {
        const minutes = (p.minutes as number) || 60;
        const seconds = minutes * 60;
        // Kill any existing caffeinate first
        await runShell(["killall", "caffeinate"]);
        const r = await runShell(`caffeinate -d -t ${seconds} &`);
        return r.ok
          ? `Mac staying awake for ${minutes} min`
          : `Error: ${r.output}`;
      },
    },
    decaffeinate: {
      description: "Stop caffeinate (allow sleep again)",
      handler: async () => {
        const r = await runShell(["killall", "caffeinate"]);
        return r.ok ? "Caffeinate stopped" : "Already stopped";
      },
    },
    wifi_status: {
      description: "Get Wi-Fi power status",
      handler: async () => {
        const r = await runShell([
          "networksetup",
          "-getairportpower",
          "en0",
        ]);
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    wifi_on: {
      description: "Turn Wi-Fi on",
      handler: async () => {
        const r = await runShell([
          "networksetup",
          "-setairportpower",
          "en0",
          "on",
        ]);
        return r.ok ? "Wi-Fi enabled" : `Error: ${r.output}`;
      },
    },
    wifi_off: {
      description: "Turn Wi-Fi off",
      handler: async () => {
        const r = await runShell([
          "networksetup",
          "-setairportpower",
          "en0",
          "off",
        ]);
        return r.ok ? "Wi-Fi disabled" : `Error: ${r.output}`;
      },
    },
    wifi_network: {
      description: "Get the current Wi-Fi network name",
      handler: async () => {
        const r = await runShell([
          "networksetup",
          "-getairportnetwork",
          "en0",
        ]);
        return r.ok
          ? r.output.replace("Current Wi-Fi Network: ", "Wi-Fi: ")
          : `Error: ${r.output}`;
      },
    },
    bluetooth_on: {
      description: "Turn Bluetooth on",
      handler: async () => {
        const r = await runShell(
          "blueutil --power 1 2>/dev/null || defaults write /Library/Preferences/com.apple.Bluetooth ControllerPowerState -int 1",
        );
        return r.ok
          ? "Bluetooth enabled"
          : "Error (blueutil not installed?)";
      },
    },
    bluetooth_off: {
      description: "Turn Bluetooth off",
      handler: async () => {
        const r = await runShell(
          "blueutil --power 0 2>/dev/null || defaults write /Library/Preferences/com.apple.Bluetooth ControllerPowerState -int 0",
        );
        return r.ok ? "Bluetooth disabled" : `Error: ${r.output}`;
      },
    },
    run_shortcut: {
      description: "Run a macOS Shortcut by name",
      params: z.object({
        name: z.string().describe("Name of the Shortcut to run"),
      }),
      handler: async (p) => {
        const name = p.name as string;
        const r = await runShell(["shortcuts", "run", name], 30_000);
        return r.ok
          ? `Shortcut '${name}' executed`
          : `Error: ${r.output.slice(0, 100)}`;
      },
      timeout: 30_000,
    },
    list_shortcuts: {
      description: "List all available macOS Shortcuts",
      handler: async () => {
        const r = await runShell(["shortcuts", "list"]);
        if (r.ok && r.output) {
          const names = r.output.split("\n").filter(Boolean);
          return `Shortcuts (${names.length}):\n${names.slice(0, 30).map((n) => "  - " + n).join("\n")}`;
        }
        return r.ok ? "No shortcuts found" : `Error: ${r.output}`;
      },
    },
    open_prefs: {
      description: "Open System Preferences (optionally a specific pane)",
      params: z.object({
        pane: z
          .string()
          .optional()
          .describe(
            "Pane name: wifi, bluetooth, sound, display, keyboard, trackpad, battery, security, notifications, general",
          ),
      }),
      handler: async (p) => {
        const pane = p.pane as string | undefined;
        if (pane) {
          const paneId = paneMap[pane.toLowerCase()] || pane;
          const r = await runShell([
            "open",
            `x-apple.systempreferences:${paneId}`,
          ]);
          return r.ok ? "Preferences opened" : `Error: ${r.output}`;
        }
        const r = await runShell(["open", "x-apple.systempreferences:"]);
        return r.ok ? "Preferences opened" : `Error: ${r.output}`;
      },
    },
    display_settings: {
      description: "Open Display preferences (Night Shift, resolution, etc.)",
      handler: async () => {
        const r = await runShell([
          "open",
          "x-apple.systempreferences:com.apple.preference.displays",
        ]);
        return r.ok
          ? "Display preferences opened"
          : `Error: ${r.output}`;
      },
    },
    sound_settings: {
      description: "Open Sound preferences (output/input devices, volume)",
      handler: async () => {
        const r = await runShell([
          "open",
          "x-apple.systempreferences:com.apple.preference.sound",
        ]);
        return r.ok
          ? "Sound preferences opened"
          : `Error: ${r.output}`;
      },
    },
    network_settings: {
      description: "Open Network preferences",
      handler: async () => {
        const r = await runShell([
          "open",
          "x-apple.systempreferences:com.apple.preference.network",
        ]);
        return r.ok
          ? "Network preferences opened"
          : `Error: ${r.output}`;
      },
    },
    airdrop: {
      description: "Open AirDrop window",
      handler: async () => {
        const r = await runShell([
          "open",
          "/System/Library/CoreServices/Finder.app/Contents/Applications/AirDrop.app",
        ]);
        return r.ok ? "AirDrop window opened" : `Error: ${r.output}`;
      },
    },
    screen_saver: {
      description: "Start the screen saver",
      handler: async () => {
        const r = await runShell(["open", "-a", "ScreenSaverEngine"]);
        return r.ok ? "Screen saver started" : `Error: ${r.output}`;
      },
    },
    login_items: {
      description: "List login items (apps that start at login)",
      handler: async () => {
        const r = await runAppleScript(
          'tell application "System Events" to get name of every login item',
        );
        if (r.ok && r.output) {
          const items = r.output.split(", ").filter(Boolean);
          return `Login items (${items.length}):\n${items.map((i) => "  - " + i).join("\n")}`;
        }
        return r.ok ? "No login items" : `Error: ${r.output}`;
      },
    },
    eject_all_disks: {
      description: "Force-unmount all external disks",
      handler: async () => {
        const r = await runShell(["diskutil", "unmountDisk", "force", "all"]);
        return r.ok ? "All disks ejected" : `Error: ${r.output}`;
      },
    },
    time_machine: {
      description: "Get Time Machine backup status",
      handler: async () => {
        const r = await runShell(["tmutil", "status"]);
        return r.ok ? `Time Machine status:\n${r.output}` : `Error: ${r.output}`;
      },
    },
    audio_output: {
      description: "Get the current default audio output device",
      handler: async () => {
        const r = await runShell(
          'system_profiler SPAudioDataType 2>/dev/null | grep -B1 "Default Output Device: Yes" | head -1',
        );
        return r.ok && r.output
          ? `Audio output: ${r.output.trim()}`
          : r.ok
            ? "Could not determine audio output device"
            : `Error: ${r.output}`;
      },
    },
    audio_input: {
      description: "Get the current default audio input device",
      handler: async () => {
        const r = await runShell(
          'system_profiler SPAudioDataType 2>/dev/null | grep -B1 "Default Input Device: Yes" | head -1',
        );
        return r.ok && r.output
          ? `Audio input: ${r.output.trim()}`
          : r.ok
            ? "Could not determine audio input device"
            : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
