import type { CareerQuestApi } from "./client";
import { mockApi } from "./mock";

// The ONE line the backend swaps: implement CareerQuestApi in ./real.ts, then
// `import { realApi } from "./real"` and export it here instead.
export const api: CareerQuestApi = mockApi;

export type { CareerQuestApi } from "./client";
export * from "./types";
