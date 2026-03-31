import { runShell, runAppleScript, cached } from "../executor.js";
import type { DomainModule } from "../types.js";

const domain: DomainModule = {
  name: "apple_sysinfo",
  description:
    "Read macOS system information. Actions: battery, disk, uptime, ip, macos_version, cpu, memory, top_processes, hostname, resolution, summary, bluetooth_devices, audio_devices, printers, displays, usb_devices, network_interfaces, serial_number, model.",
  actions: {
    battery: {
      description: "Get battery level and charging status",
      handler: async () => {
        const r = await runShell("pmset -g batt");
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    disk: {
      description: "Get disk space usage",
      handler: async () => {
        const r = await runShell("df -h / /Volumes/nvme 2>/dev/null | grep -v Filesystem");
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    uptime: {
      description: "Get system uptime",
      handler: async () => {
        const r = await runShell("uptime");
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    ip: {
      description: "Get all IP addresses (local, public, tailscale)",
      handler: async () => {
        const local = await runShell(
          "ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo 'N/A'",
        );
        const pub = await runShell(
          "curl -s --max-time 5 ifconfig.me 2>/dev/null || echo 'N/A'",
        );
        const ts = await runShell(
          "tailscale ip -4 2>/dev/null || echo 'N/A'",
        );
        return `Local: ${local.output}\nPublic: ${pub.output}\nTailscale: ${ts.output}`;
      },
    },
    macos_version: {
      description: "Get macOS version and build",
      handler: async () => {
        const r = await runShell("sw_vers");
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    cpu: {
      description: "Get CPU info and current usage",
      handler: async () => {
        const info = await runShell("sysctl -n machdep.cpu.brand_string");
        const cores = await runShell("sysctl -n hw.ncpu");
        const load = await runShell("sysctl -n vm.loadavg");
        return `CPU: ${info.output}\nCores: ${cores.output}\nLoad: ${load.output}`;
      },
    },
    memory: {
      description: "Get RAM usage",
      handler: async () => {
        const total = await runShell("sysctl -n hw.memsize");
        const r = await runShell(
          "vm_stat | head -5",
        );
        const totalGB = total.ok
          ? (parseInt(total.output) / 1073741824).toFixed(1)
          : "?";
        return `Total RAM: ${totalGB} GB\n${r.output}`;
      },
    },
    top_processes: {
      description: "Get top 5 CPU-consuming processes",
      handler: async () => {
        const r = await runShell("ps aux | sort -nrk 3 | head -6");
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    hostname: {
      description: "Get computer name and hostname",
      handler: async () => {
        const name = await runShell("scutil --get ComputerName");
        const host = await runShell("hostname");
        return `Name: ${name.output}\nHostname: ${host.output}`;
      },
    },
    resolution: {
      description: "Get screen resolution",
      handler: async () => {
        const r = await runAppleScript(
          `tell application "Finder" to get bounds of window of desktop`,
        );
        return r.ok ? `Screen: ${r.output}` : `Error: ${r.output}`;
      },
    },
    summary: {
      description: "Get a complete system summary (battery, disk, CPU, RAM, uptime)",
      handler: async () => {
        const [batt, disk, up, cpu, mem] = await Promise.all([
          runShell("pmset -g batt | tail -1"),
          runShell("df -h / | tail -1"),
          runShell("uptime"),
          runShell("sysctl -n vm.loadavg"),
          runShell("sysctl -n hw.memsize"),
        ]);
        const memGB = mem.ok
          ? (parseInt(mem.output) / 1073741824).toFixed(0)
          : "?";
        return [
          `Battery: ${batt.output}`,
          `Disk: ${disk.output}`,
          `Uptime: ${up.output}`,
          `Load: ${cpu.output}`,
          `RAM: ${memGB} GB total`,
        ].join("\n");
      },
    },
    bluetooth_devices: {
      description: "List paired/connected Bluetooth devices",
      handler: async () => {
        const r = await cached("sysinfo.bluetooth", 30000, () =>
          runShell(
            'system_profiler SPBluetoothDataType 2>/dev/null | grep -A2 "Connected:"',
          )
        );
        return r.ok ? (r.output || "No Bluetooth data") : `Error: ${r.output}`;
      },
    },
    audio_devices: {
      description: "List audio input and output devices",
      handler: async () => {
        const r = await cached("sysinfo.audio", 30000, () =>
          runShell("system_profiler SPAudioDataType")
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    printers: {
      description: "List configured printers",
      handler: async () => {
        const r = await runShell("lpstat -a 2>/dev/null || echo 'No printers'");
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    displays: {
      description: "List connected displays with resolution info",
      handler: async () => {
        const r = await cached("sysinfo.displays", 30000, () =>
          runShell(
            'system_profiler SPDisplaysDataType | grep -E "Display Type|Resolution|Main Display"',
          )
        );
        return r.ok ? (r.output || "No display data") : `Error: ${r.output}`;
      },
    },
    usb_devices: {
      description: "List connected USB devices",
      handler: async () => {
        const r = await cached("sysinfo.usb", 30000, () =>
          runShell(
            'system_profiler SPUSBDataType | grep -E "Product ID|Vendor ID|Serial|Speed" | head -30',
          )
        );
        return r.ok ? (r.output || "No USB devices") : `Error: ${r.output}`;
      },
    },
    network_interfaces: {
      description: "List network interfaces and their IP addresses",
      handler: async () => {
        const r = await cached("sysinfo.network", 30000, () =>
          runShell(
            'ifconfig | grep -E "^[a-z]|inet " | head -30',
          )
        );
        return r.ok ? r.output : `Error: ${r.output}`;
      },
    },
    serial_number: {
      description: "Get the Mac serial number",
      handler: async () => {
        const r = await runShell(
          'system_profiler SPHardwareDataType | grep "Serial Number"',
        );
        return r.ok ? r.output.trim() : `Error: ${r.output}`;
      },
    },
    model: {
      description: "Get the Mac model identifier and name",
      handler: async () => {
        const r = await runShell(
          'system_profiler SPHardwareDataType | grep "Model"',
        );
        return r.ok ? r.output.trim() : `Error: ${r.output}`;
      },
    },
  },
};

export default domain;
