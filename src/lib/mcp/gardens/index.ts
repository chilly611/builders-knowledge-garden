/**
 * RKG — garden executor registry.
 * Maps a garden id to its { toolName -> executor } table. The tool DEFINITIONS
 * (schemas, descriptions) live in ../registry.ts; this file holds the runnable
 * handlers. Both are keyed by the same tool names.
 */
import type { GardenId } from "../registry";
import type { ToolCallResult } from "../jsonrpc";
import { bkgExecutors } from "./bkg";
import { tkgExecutors } from "./tkg";

export type ExecutorMap = Record<string, (args: Record<string, unknown>) => Promise<ToolCallResult>>;

export const GARDEN_EXECUTORS: Record<GardenId, ExecutorMap> = {
  bkg: bkgExecutors,
  tkg: tkgExecutors,
};

export function getExecutors(id: GardenId): ExecutorMap {
  return GARDEN_EXECUTORS[id];
}
