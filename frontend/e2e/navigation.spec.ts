import { test, expect } from "@playwright/test";

/** Inject a fake authenticated session so protected routes are accessible. */
async function injectAuthSession(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
    const payload = btoa(JSON.stringify({ exp })).replace(/=/g, "");
    const token = `${header}.${payload}.fakesig`;

    localStorage.setItem("accessToken", token);
    localStorage.setItem("refreshToken", "fake-refresh-token");
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: "user-1",
        nickname: "testuser",
        email: "test@example.com",
        preferredCurrency: "EUR",
      })
    );
    localStorage.setItem("sessionLastActivityAt", String(Date.now()));
  });
}

// ── public routes ──────────────────────────────────────────────────────────────

test.describe("Public routes (no auth)", () => {
  test("home / is accessible without auth", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page).not.toHaveURL("/dashboard");
  });

  test("/login is accessible without auth", async ({ page }) => {
    await page.goto("/login");
    await expect(page).toHaveURL("/login");
  });

  test("/signup is accessible without auth", async ({ page }) => {
    await page.goto("/signup");
    await expect(page).toHaveURL("/signup");
  });

  test("/about is accessible without auth", async ({ page }) => {
    await page.goto("/about");
    await expect(page).toHaveURL("/about");
  });
});

// ── protected routes (all should guard when unauthenticated) ───────────────────

const PROTECTED_ROUTES = [
  "/dashboard",
  "/transactions",
  "/analysis",
  "/accounts",
  "/budgets",
  "/categories",
  "/goals",
  "/settings",
];

test.describe("Protected routes redirect when unauthenticated", () => {
  for (const route of PROTECTED_ROUTES) {
    test(`${route} → redirects to /`, async ({ page }) => {
      await page.goto(route);
      await expect(page).toHaveURL("/");
    });
  }
});

// ── authenticated navigation ───────────────────────────────────────────────────

test.describe("Authenticated navigation", () => {
  test.beforeEach(async ({ page }) => {
    await injectAuthSession(page);
    // Stub any API calls the dashboard makes to avoid network errors
    await page.route("**/*", (route) => {
      if (route.request().resourceType() === "fetch" || route.request().resourceType() === "xhr") {
        route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
      } else {
        route.continue();
      }
    });
  });

  test("authenticated user can access /dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/dashboard");
  });

  test("authenticated user can access /settings", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL("/settings");
  });

  test("authenticated user can access /transactions", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page).toHaveURL("/transactions");
  });
});
