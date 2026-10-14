import type { IncomingMessage } from "node:http";
import { describe, expect, it } from "vitest";
import { parseSyncPayload } from "./notionSync";
import { isAllowedSyncRequest, isSameOriginSyncRequest } from "./syncGuard";

const req = (headers: Record<string, string>) => ({ headers }) as unknown as IncomingMessage;
const without = (h: Record<string, string>, key: string) => Object.fromEntries(Object.entries(h).filter(([k]) => k !== key));
const ok = {
  host: "localhost:8080",
  origin: "http://localhost:8080",
  "content-type": "application/json",
  "x-cq-sync": "1",
};

describe("isAllowedSyncRequest", () => {
  it("lets the app's own tab through", () => {
    expect(isAllowedSyncRequest(req(ok))).toBe(true);
    expect(isAllowedSyncRequest(req({ ...ok, host: "127.0.0.1:8080", origin: "http://127.0.0.1:8080" }))).toBe(true);
  });

  it("blocks another website posting from the player's browser", () => {
    expect(isAllowedSyncRequest(req({ ...ok, origin: "http://evil.example" }))).toBe(false);
    expect(isAllowedSyncRequest(req({ ...ok, origin: "null" }))).toBe(false);
    expect(isAllowedSyncRequest(req(without(ok, "origin")))).toBe(false);
  });

  it("blocks the no-preflight text/plain trick", () => {
    expect(isAllowedSyncRequest(req({ ...ok, "content-type": "text/plain;charset=UTF-8" }))).toBe(false);
    expect(isAllowedSyncRequest(req(without(ok, "x-cq-sync")))).toBe(false);
  });

  it("blocks DNS rebinding (a rebound page keeps its own hostname)", () => {
    expect(
      isAllowedSyncRequest(req({ ...ok, host: "rebind.attacker.example:8080", origin: "http://rebind.attacker.example:8080" })),
    ).toBe(false);
  });
});

describe("isSameOriginSyncRequest (Vercel)", () => {
  const prod = { ...ok, host: "career-quest.vercel.app", origin: "https://career-quest.vercel.app" };
  it("lets the deployed app's own page through", () => {
    expect(isSameOriginSyncRequest(req(prod))).toBe(true);
  });
  it("blocks other sites and the text/plain trick", () => {
    expect(isSameOriginSyncRequest(req({ ...prod, origin: "https://evil.example" }))).toBe(false);
    expect(isSameOriginSyncRequest(req({ ...prod, "content-type": "text/plain" }))).toBe(false);
    expect(isSameOriginSyncRequest(req(without(prod, "x-cq-sync")))).toBe(false);
  });
  it("is not enough on its own for local dev", () => {
    expect(isAllowedSyncRequest(req(prod))).toBe(false);
  });
});

const good = {
  user_id: "guest_ab12cd34",
  display_name: "Euan",
  career: "SOC Analyst",
  xp: 120,
  streak: 3,
  completed_lessons: 4,
  certificates: 1,
  weakest_topic: null,
  last_active: "2026-10-14",
  study_plan: ["Redo SOC Analyst · Unit 1, lesson 2 (best 50%)"],
  thm_path: "https://tryhackme.com/path/outline/soclevel1",
};

describe("parseSyncPayload", () => {
  it("accepts what the app sends", () => {
    expect(parseSyncPayload(good)).toEqual(good);
  });

  it("rejects links that aren't TryHackMe", () => {
    expect(() => parseSyncPayload({ ...good, thm_path: "https://attacker.example/phish" })).toThrow();
    expect(() => parseSyncPayload({ ...good, thm_path: "javascript:alert(1)" })).toThrow();
  });

  it("rejects wrong types, odd ids and oversized input", () => {
    expect(() => parseSyncPayload({ ...good, user_id: "../../x" })).toThrow();
    expect(() => parseSyncPayload({ ...good, xp: 1e12 })).toThrow();
    expect(() => parseSyncPayload({ ...good, xp: "999" })).toThrow();
    expect(() => parseSyncPayload({ ...good, display_name: "x".repeat(201) })).toThrow();
    expect(() => parseSyncPayload({ ...good, study_plan: Array(11).fill("a") })).toThrow();
    expect(() => parseSyncPayload({ ...good, last_active: "yesterday" })).toThrow();
    expect(() => parseSyncPayload(null)).toThrow();
  });
});
