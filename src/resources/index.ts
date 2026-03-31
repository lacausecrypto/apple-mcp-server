/**
 * Resource registry — read-only data Claude can attach to context.
 */

import type { ResourceDef } from "../types.js";
import nowPlaying from "./now-playing.js";
import systemInfo from "./system-info.js";
import openTabs from "./open-tabs.js";

const ALL_RESOURCES: ResourceDef[] = [
  nowPlaying,
  systemInfo,
  ...openTabs,
];

export function getResources(): ResourceDef[] {
  return ALL_RESOURCES;
}
