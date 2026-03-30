import { test, expect } from "@playwright/test";

// ── helpers ────────────────────────────────────────────────────────────────────

/** Build a minimal JWT with exp = now + offsetSeconds. */
function makeJwt(offsetSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + offsetSeconds;
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
  const payload = btoa(JSON.stringify({ exp })).replace(/=/g, "");
  return `${header}.${payload}.fakesig`;
}

/** Inject a fake authenticated session into localStorage. */
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

// ── route guards ───────────────────────────────────────────────────────────────

test.describe("Route guards (unauthenticated)", () => {
  test("visiting /dashboard redirects to home", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("/");
  });

  test("visiting /transactions redirects to home", async ({ page }) => {
    await page.goto("/transactions");
    await expect(page).toHaveURL("/");
  });

  test("visiting /settings redirects to home", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL("/");
  });
});

test.describe("Route guards (authenticated)", () => {
  test("visiting /login when authenticated redirects to /dashboard", async ({ page }) => {
    await injectAuthSession(page);
    await page.goto("/login");
    await expect(page).toHaveURL("/dashboard");
  });

  test("visiting / when authenticated redirects to /dashboard", async ({ page }) => {
    await injectAuthSession(page);
    await page.goto("/");
    await expect(page).toHaveURL("/dashboard");
  });
});

// ── login page ─────────────────────────────────────────────────────────────────

test.describe("Login page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/login");
  });

  test("renders login form elements", async ({ page }) => {
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
    await expect(page.locator("button[type='submit']").first()).toBeVisible();
  });

  test("shows error on invalid credentials", async ({ page }) => {
    // Intercept the login API and return 401
    await page.route("**/user/login", (route) =>
      route.fulfill({ status: 401, body: JSON.stringify({ message: "Invalid credentials" }) })
    );

    await page.locator("input[type='email'], input[name='email']").first().fill("wrong@example.com");
    await page.locator("input[type='password']").first().fill("wrongpassword");
    await page.locator("button[type='submit']").first().click();

    // Some kind of error feedback should appear
    const errorEl = page.locator("[role='alert'], .text-red, .text-destructive, [class*='error']").first();
    await expect(errorEl).toBeVisible({ timeout: 5000 });
  });

  test("redirects to /dashboard on successful login", async ({ page }) => {
    const exp = Math.floor(Date.now() / 1000) + 3600;
    const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
    const payload = btoa(JSON.stringify({ exp })).replace(/=/g, "");
    const fakeToken = `${header}.${payload}.fakesig`;

    await page.route("**/user/login", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          nickname: "testuser",
          email: "test@example.com",
          preferredCurrency: "EUR",
          accessToken: fakeToken,
          refreshToken: "fake-refresh-token",
        }),
      })
    );

    // Intercept any token-refresh or profile calls the app may make after login
    await page.route("**/user/refreshToken", (route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          id: "user-1",
          nickname: "testuser",
          email: "test@example.com",
          preferredCurrency: "EUR",
          accessToken: fakeToken,
          refreshToken: "fake-refresh-token",
        }),
      })
    );

    await page.locator("input[type='email'], input[name='email']").first().fill("test@example.com");
    await page.locator("input[type='password']").first().fill("password123");
    await page.locator("button[type='submit']").first().click();

    await expect(page).toHaveURL("/dashboard", { timeout: 8000 });
  });
});

// ── signup page ────────────────────────────────────────────────────────────────

test.describe("Signup page", () => {
  test("renders signup form", async ({ page }) => {
    await page.goto("/signup");
    await expect(page.locator("input[type='email'], input[name='email']").first()).toBeVisible();
    await expect(page.locator("input[type='password']").first()).toBeVisible();
    await expect(page.locator("button[type='submit']").first()).toBeVisible();
  });
});
