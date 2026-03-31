import { runShell } from "../executor.js";
import type { ResourceDef } from "../types.js";

const resource: ResourceDef = {
  uri: "apple://system-info",
  name: "System Info",
  description: "Battery, disk, uptime, CPU load, RAM",
  mimeType: "text/plain",
  read: async () => {
    const [batt, disk, up, load, mem] = await Promise.all([
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
      `Load: ${load.output}`,
      `RAM: ${memGB} GB`,
    ].join("\n");
  },
};

export default resource;
