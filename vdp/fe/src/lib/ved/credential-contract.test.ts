import { describe, expect, it } from "vitest";

import { APP_SEED_ACCOUNTS } from "./app-seed-accounts";
import { ROLES } from "./roles";

/** Gate G.2: app vs demo credentials must not drift into each other. */
describe("credential contract", () => {
  it("APP_SEED_ACCOUNTS use vdp.local and password equals local-part", () => {
    for (const account of APP_SEED_ACCOUNTS) {
      expect(account.email).toMatch(/@vdp\.local$/);
      const localPart = account.email.split("@")[0] ?? "";
      expect(account.password).toBe(localPart);
    }
  });

  it("demo ROLES use demo.vdp.local and differ from app seed emails", () => {
    for (const role of ROLES) {
      expect(role.seedEmail).toMatch(/@demo\.vdp\.local$/);
      const app = APP_SEED_ACCOUNTS.find((a) => a.role === role.id);
      if (app) {
        expect(role.seedEmail).not.toBe(app.email);
      }
    }
  });
});
