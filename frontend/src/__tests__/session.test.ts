import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getAccessToken,
  getRefreshToken,
  loadSessionUser,
  persistSession,
  clearSessionData,
  clearAllUserState,
  getAccessTokenExpiry,
  isAccessTokenExpiringSoon,
  touchSessionActivity,
  getLastActivityAt,
  subscribeSessionEvents,
  endSession,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_WARNING_THRESHOLD_MS,
  SESSION_REFRESH_THRESHOLD_MS,
} from "@/lib/session";
import type { AuthenticatedUserDto } from "@/types";

// ── helpers ────────────────────────────────────────────────────────────────────

/** Build a minimal JWT with a custom exp claim (in seconds). */
function makeJwt(expSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" })).replace(/=/g, "");
  const payload = btoa(JSON.stringify({ exp: expSeconds })).replace(/=/g, "");
  return `${header}.${payload}.fakesig`;
}

const MOCK_SESSION: AuthenticatedUserDto = {
  id: "user-1",
  nickname: "testuser",
  email: "test@example.com",
  preferredCurrency: "EUR",
  accessToken: makeJwt(Math.floor(Date.now() / 1000) + 3600), // expires in 1h
  refreshToken: "refresh-token-abc",
};

// ── setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

// ── constants ──────────────────────────────────────────────────────────────────

describe("session constants", () => {
  it("inactivity timeout is 15 minutes", () => {
    expect(SESSION_INACTIVITY_TIMEOUT_MS).toBe(15 * 60 * 1000);
  });

  it("warning threshold is 5 minutes", () => {
    expect(SESSION_WARNING_THRESHOLD_MS).toBe(5 * 60 * 1000);
  });

  it("refresh threshold is 2 minutes", () => {
    expect(SESSION_REFRESH_THRESHOLD_MS).toBe(2 * 60 * 1000);
  });
});

// ── localStorage helpers ───────────────────────────────────────────────────────

describe("persistSession / getters / clearSessionData", () => {
  it("stores tokens and user after persistSession", () => {
    persistSession(MOCK_SESSION);

    expect(getAccessToken()).toBe(MOCK_SESSION.accessToken);
    expect(getRefreshToken()).toBe(MOCK_SESSION.refreshToken);
    const user = loadSessionUser();
    expect(user).not.toBeNull();
    expect(user!.id).toBe("user-1");
    expect(user!.nickname).toBe("testuser");
    expect(user!.preferredCurrency).toBe("EUR");
  });

  it("returns null for tokens when storage is empty", () => {
    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(loadSessionUser()).toBeNull();
  });

  it("clearSessionData removes all auth keys", () => {
    persistSession(MOCK_SESSION);
    clearSessionData();

    expect(getAccessToken()).toBeNull();
    expect(getRefreshToken()).toBeNull();
    expect(loadSessionUser()).toBeNull();
  });

  it("clearAllUserState removes auth keys AND ui state keys", () => {
    persistSession(MOCK_SESSION);
    localStorage.setItem("language", "es");
    localStorage.setItem("balio_active_tab", "tab1");

    clearAllUserState();

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("language")).toBeNull();
    expect(localStorage.getItem("balio_active_tab")).toBeNull();
  });
});

// ── activity tracking ──────────────────────────────────────────────────────────

describe("touchSessionActivity / getLastActivityAt", () => {
  it("returns null when no activity recorded", () => {
    expect(getLastActivityAt()).toBeNull();
  });

  it("stores and retrieves last activity timestamp", () => {
    const ts = Date.now();
    touchSessionActivity(ts);
    expect(getLastActivityAt()).toBe(ts);
  });
});

// ── JWT decoding ───────────────────────────────────────────────────────────────

describe("getAccessTokenExpiry", () => {
  it("returns null when no token in storage", () => {
    expect(getAccessTokenExpiry()).toBeNull();
  });

  it("returns expiry in milliseconds from JWT exp claim", () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 3600;
    const token = makeJwt(expSeconds);
    localStorage.setItem("accessToken", token);

    expect(getAccessTokenExpiry()).toBe(expSeconds * 1000);
  });

  it("accepts a token directly as argument", () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 600;
    expect(getAccessTokenExpiry(makeJwt(expSeconds))).toBe(expSeconds * 1000);
  });

  it("returns null for a malformed token", () => {
    expect(getAccessTokenExpiry("not.a.jwt")).toBeNull();
  });
});

// ── isAccessTokenExpiringSoon ──────────────────────────────────────────────────

describe("isAccessTokenExpiringSoon", () => {
  it("returns true when no token present", () => {
    expect(isAccessTokenExpiringSoon()).toBe(true);
  });

  it("returns false when token expires far in the future", () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 3600; // 1h from now
    expect(isAccessTokenExpiringSoon(SESSION_REFRESH_THRESHOLD_MS, makeJwt(expSeconds))).toBe(false);
  });

  it("returns true when token expires within the threshold", () => {
    const expSeconds = Math.floor(Date.now() / 1000) + 60; // 1min from now
    expect(isAccessTokenExpiringSoon(SESSION_REFRESH_THRESHOLD_MS, makeJwt(expSeconds))).toBe(true);
  });

  it("returns true for an already-expired token", () => {
    const expSeconds = Math.floor(Date.now() / 1000) - 10; // expired 10s ago
    expect(isAccessTokenExpiringSoon(SESSION_REFRESH_THRESHOLD_MS, makeJwt(expSeconds))).toBe(true);
  });
});

// ── event subscriptions ────────────────────────────────────────────────────────

describe("subscribeSessionEvents / endSession", () => {
  it("listener receives 'ended' event with correct reason", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionEvents(listener);

    endSession("manual");

    expect(listener).toHaveBeenCalledOnce();
    expect(listener).toHaveBeenCalledWith({ type: "ended", reason: "manual" });

    unsubscribe();
  });

  it("unsubscribed listener is not called", () => {
    const listener = vi.fn();
    const unsubscribe = subscribeSessionEvents(listener);
    unsubscribe();

    endSession("inactivity");

    expect(listener).not.toHaveBeenCalled();
  });

  it("clears all user state on endSession", () => {
    persistSession(MOCK_SESSION);
    localStorage.setItem("language", "gal");

    const unsubscribe = subscribeSessionEvents(() => {});
    endSession("expired");
    unsubscribe();

    expect(getAccessToken()).toBeNull();
    expect(localStorage.getItem("language")).toBeNull();
  });
});
