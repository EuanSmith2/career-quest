/**
 * Notion sync (Prompt 4), server-side only: the integration token must never reach the browser,
 * and Notion's API doesn't allow browser (CORS) calls anyway.
 *
 * One page per player in a Notion database, found by its "Player ID" property and updated in place:
 *   Name · Career · Total XP · Streak · Lessons completed · Certificates · Weakest topic · Last active
 * plus a "Study plan" to-do list (the 3 weakest lessons + the career's TryHackMe path).
 * Missing database properties are added automatically, so any database shared with the
 * integration works.
 *
 * Framework-agnostic: plain fetch. Used by the Vite dev/preview middleware (vite.config.ts) and
 * portable to a Supabase Edge Function / Vercel function as-is.
 */

export interface NotionSyncPayload {
  user_id: string;
  display_name: string;
  career: string | null;
  xp: number;
  streak: number;
  completed_lessons: number;
  certificates: number;
  weakest_topic: string | null;
  last_active: string | null; // YYYY-MM-DD
  study_plan: string[];
  thm_path: string | null;
}

export interface NotionEnv {
  NOTION_TOKEN?: string;
  NOTION_DATABASE_ID?: string;
}

export type SyncResponse = { status: number; body: { ok: boolean; page_url?: string; error?: string } };

const API = "https://api.notion.com/v1";
const VERSION = "2022-06-28";

const PROPS: Record<string, unknown> = {
  "Player ID": { rich_text: {} },
  Career: { rich_text: {} },
  "Total XP": { number: {} },
  Streak: { number: {} },
  "Lessons completed": { number: {} },
  Certificates: { number: {} },
  "Weakest topic": { rich_text: {} },
  "Last active": { date: {} },
};

const text = (v: string) => ({ rich_text: [{ text: { content: v.slice(0, 2000) } }] });

/** Notion database IDs are 32 hex chars; accept a full URL or a dashed UUID too. */
export function normaliseDatabaseId(raw: string): string {
  const hex = raw.replace(/-/g, "").match(/[0-9a-f]{32}/i);
  return hex ? hex[0] : raw.trim();
}

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, max: number) => {
  if (typeof v !== "string" || v.length > max) throw new Error("bad string");
  return v;
};
const strOrNull = (v: unknown, max: number) => (v === null || v === undefined ? null : str(v, max));
const count = (v: unknown) => {
  if (typeof v !== "number" || !Number.isInteger(v) || v < 0 || v > 1e7) throw new Error("bad number");
  return v;
};

/**
 * Check every field before anything touches Notion: right types, sane sizes, a Player ID in the
 * shape the app makes, a real date, and a TryHackMe link only. Throws on anything else.
 */
export function parseSyncPayload(v: unknown): NotionSyncPayload {
  if (!isObj(v)) throw new Error("bad payload");
  const user_id = str(v.user_id, 32);
  if (!/^guest_[a-z0-9]{1,16}$/.test(user_id)) throw new Error("bad user_id");
  const last_active = strOrNull(v.last_active, 10);
  if (last_active !== null && !/^\d{4}-\d{2}-\d{2}$/.test(last_active)) throw new Error("bad date");
  const thm_path = strOrNull(v.thm_path, 300);
  if (thm_path !== null && !thm_path.startsWith("https://tryhackme.com/")) throw new Error("bad link");
  if (!Array.isArray(v.study_plan) || v.study_plan.length > 10) throw new Error("bad plan");
  return {
    user_id,
    display_name: str(v.display_name, 200),
    career: strOrNull(v.career, 200),
    xp: count(v.xp),
    streak: count(v.streak),
    completed_lessons: count(v.completed_lessons),
    certificates: count(v.certificates),
    weakest_topic: strOrNull(v.weakest_topic, 200),
    last_active,
    study_plan: v.study_plan.map((s) => str(s, 300)),
    thm_path,
  };
}

export async function syncToNotion(payload: NotionSyncPayload, env: NotionEnv): Promise<SyncResponse> {
  const token = env.NOTION_TOKEN?.trim();
  const rawDb = env.NOTION_DATABASE_ID?.trim();
  if (!token || !rawDb) {
    return { status: 501, body: { ok: false, error: "Notion isn't connected yet. Add NOTION_TOKEN and NOTION_DATABASE_ID (in .env.local, or the Vercel project's environment variables)." } };
  }
  const db = normaliseDatabaseId(rawDb);

  const call = async (method: string, path: string, body?: unknown) => {
    const res = await fetch(API + path, {
      method,
      headers: { Authorization: `Bearer ${token}`, "Notion-Version": VERSION, "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    if (!res.ok) {
      const msg = String(json.message ?? res.statusText);
      const hint =
        res.status === 401
          ? " Check NOTION_TOKEN."
          : res.status === 404
            ? " Share the database with your integration (••• → Connections) and check NOTION_DATABASE_ID."
            : "";
      throw Object.assign(new Error(msg + hint), { status: res.status });
    }
    return json;
  };

  try {
    // 1. make sure the database has our properties, and find its title property
    const meta = (await call("GET", `/databases/${db}`)) as { properties: Record<string, { type: string }> };
    const titleProp = Object.entries(meta.properties).find(([, p]) => p.type === "title")?.[0] ?? "Name";
    const missing = Object.fromEntries(Object.entries(PROPS).filter(([name]) => !meta.properties[name]));
    if (Object.keys(missing).length) await call("PATCH", `/databases/${db}`, { properties: missing });

    const properties: Record<string, unknown> = {
      [titleProp]: { title: [{ text: { content: payload.display_name.slice(0, 200) || "Player" } }] },
      "Player ID": text(payload.user_id),
      Career: text(payload.career ?? "Not chosen yet"),
      "Total XP": { number: payload.xp },
      Streak: { number: payload.streak },
      "Lessons completed": { number: payload.completed_lessons },
      Certificates: { number: payload.certificates },
      "Weakest topic": text(payload.weakest_topic ?? "None yet"),
      "Last active": payload.last_active ? { date: { start: payload.last_active } } : { date: null },
    };

    const plan = [
      { object: "block", type: "heading_2", heading_2: { rich_text: [{ text: { content: "Study plan" } }] } },
      ...(payload.study_plan.length ? payload.study_plan : ["Finish your first lesson in Career Quest"]).map((item) => ({
        object: "block",
        type: "to_do",
        to_do: { rich_text: [{ text: { content: item.slice(0, 2000) } }], checked: false },
      })),
      ...(payload.thm_path
        ? [
            {
              object: "block",
              type: "to_do",
              to_do: { rich_text: [{ text: { content: "Next real lab: TryHackMe path", link: { url: payload.thm_path } } }], checked: false },
            },
          ]
        : []),
      {
        object: "block",
        type: "paragraph",
        paragraph: { rich_text: [{ text: { content: `Synced from Career Quest on ${new Date().toISOString().slice(0, 10)}.` }, annotations: { italic: true, color: "gray" } }] },
      },
    ];

    // 2. upsert the player's page
    const found = (await call("POST", `/databases/${db}/query`, {
      filter: { property: "Player ID", rich_text: { equals: payload.user_id } },
      page_size: 1,
    })) as { results: { id: string; url: string }[] };

    let page: { id: string; url: string };
    if (found.results[0]) {
      page = found.results[0];
      await call("PATCH", `/pages/${page.id}`, { properties });
      // replace the old study plan
      const kids = (await call("GET", `/blocks/${page.id}/children?page_size=100`)) as { results: { id: string }[] };
      for (const k of kids.results) await call("DELETE", `/blocks/${k.id}`);
      await call("PATCH", `/blocks/${page.id}/children`, { children: plan });
    } else {
      page = (await call("POST", "/pages", { parent: { database_id: db }, icon: { emoji: "🛡️" }, properties, children: plan })) as { id: string; url: string };
    }
    return { status: 200, body: { ok: true, page_url: page.url } };
  } catch (e) {
    const err = e as Error & { status?: number };
    return { status: err.status && err.status < 500 ? 502 : 500, body: { ok: false, error: `Notion: ${err.message}` } };
  }
}
