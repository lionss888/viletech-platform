import { expect, test } from "./fixtures/auth.fixture";

test.describe("app login form", () => {
  test("user@vdp.local submits form and reaches dashboard", async ({ page, loginAs }) => {
    await loginAs("user");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
