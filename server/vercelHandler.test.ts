import type { IncomingMessage, ServerResponse } from "node:http";
import { afterEach, describe, expect, it, vi } from "vitest";
import handler from "../api/notion-sync";

const body = {
  user_id: "guest_ab12cd34ef56ab78", display_name: "Euan", career: null, xp: 1, streak: 1, completed_lessons: 1,
  certificates: 0, weakest_topic: null, last_active: "2026-10-14", study_plan: [], thm_path: null,
};
const own = { host: "cq.vercel.app", origin: "https://cq.vercel.app", "content-type": "application/json", "x-cq-sync": "1" };
function call(headers: Record<string, string>, parsed: unknown, method = "POST") {
  const req = { method, headers, body: parsed } as unknown as IncomingMessage & { body?: unknown };
  const res = { statusCode: 0, out: "", setHeader() {}, end(s?: string) { this.out = s ?? ""; } };
  return handler(req, res as unknown as ServerResponse).then(() => ({ status: res.statusCode, body: JSON.parse(res.out || "{}") }));
}
afterEach(() => vi.unstubAllGlobals());

describe("Vercel /api/notion-sync", () => {
  it("refuses other websites, text/plain and bad payloads before touching Notion", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    expect((await call({ ...own, origin: "https://evil.example" }, body)).status).toBe(403);
    expect((await call({ ...own, "content-type": "text/plain" }, JSON.stringify(body))).status).toBe(403);
    expect((await call(own, { ...body, thm_path: "https://evil.example" })).status).toBe(400);
    expect((await call(own, { ...body, study_plan: ["x".repeat(20000)] })).status).toBe(413);
    expect((await call(own, body, "GET")).status).toBe(405);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("hides Notion's error details from the caller", async () => {
    vi.stubEnv("NOTION_TOKEN", "secret_dummy");
    vi.stubEnv("NOTION_DATABASE_ID", "0123456789abcdef0123456789abcdef");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ message: "db 0123 not shared" }), { status: 500 })));
    const r = await call(own, body);
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("0123");
    vi.unstubAllEnvs();
  });
});
