import { describe, expect, it } from "vitest";
import { mockApi } from "./mock";

describe("mock API hardening", () => {
  it("makes crypto-random player IDs in the shape the Notion sync accepts", async () => {
    await mockApi.signOut();
    const s = await mockApi.startGuest("Euan");
    expect(s.user_id).toMatch(/^guest_[0-9a-f]{16}$/);
  });

  it("updateProfile only touches editable fields and caps the name", async () => {
    await mockApi.startGuest("Euan");
    const before = await mockApi.getProfile();
    const p = await mockApi.updateProfile({ display_name: "x".repeat(50), xp: 999999, hearts: 99 } as never);
    expect(p.display_name).toHaveLength(24);
    expect(p.xp).toBe(before.xp);
    expect(p.hearts).toBe(before.hearts);
  });

  it("sign-out leaves nothing for the next person on this browser", async () => {
    const first = await mockApi.startGuest("First");
    await mockApi.signOut();
    expect(await mockApi.getSession()).toBeNull();
    const second = await mockApi.startGuest("Second");
    expect(second.user_id).not.toBe(first.user_id);
    const p = await mockApi.getProfile();
    expect(p.user_id).toBe(second.user_id);
    expect(p.display_name).toBe("Second");
    expect(p.xp).toBe(0);
  });
});
