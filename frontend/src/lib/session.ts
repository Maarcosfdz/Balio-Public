import axios from "axios";
import type { AuthenticatedUserDto } from "@/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

const STORAGE_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  user: "user",
  lastActivityAt: "sessionLastActivityAt",
} as const;

export const SESSION_INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000;
export const SESSION_WARNING_THRESHOLD_MS = 3 * 60 * 1000;
export const SESSION_REFRESH_THRESHOLD_MS = 2 * 60 * 1000;
export const SESSION_CHECK_INTERVAL_MS = 30 * 1000;
export const SESSION_ACTIVITY_THROTTLE_MS = 15 * 1000;

export interface SessionUser {
  id: string;
  nickname: string;
  email: string;
}

export type SessionEndReason =
  | "expired"
  | "inactivity"
  | "missing_refresh_token"
  | "refresh_failed"
  | "invalid_session"
  | "manual";

type SessionEvent =
  | { type: "updated"; user: SessionUser | null }
  | { type: "ended"; reason: SessionEndReason };

const listeners = new Set<(event: SessionEvent) => void>();

let refreshPromise: Promise<AuthenticatedUserDto> | null = null;

function emit(event: SessionEvent) {
  listeners.forEach((listener) => listener(event));
}

function toSessionUser(data: Pick<AuthenticatedUserDto, "id" | "nickname" | "email">): SessionUser {
  return {
    id: data.id,
    nickname: data.nickname,
    email: data.email,
  };
}

function decodeJwtPayload(token: string): { exp?: number } | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) {
      return null;
    }

    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(window.atob(padded));
  } catch {
    return null;
  }
}

export function subscribeSessionEvents(listener: (event: SessionEvent) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getAccessToken() {
  return localStorage.getItem(STORAGE_KEYS.accessToken);
}

export function getRefreshToken() {
  return localStorage.getItem(STORAGE_KEYS.refreshToken);
}

export function loadSessionUser(): SessionUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.user);
    return raw ? (JSON.parse(raw) as SessionUser) : null;
  } catch {
    return null;
  }
}

export function getLastActivityAt() {
  const raw = localStorage.getItem(STORAGE_KEYS.lastActivityAt);
  if (!raw) {
    return null;
  }

  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : null;
}

export function touchSessionActivity(timestamp = Date.now()) {
  localStorage.setItem(STORAGE_KEYS.lastActivityAt, String(timestamp));
}

export function persistSession(data: AuthenticatedUserDto) {
  localStorage.setItem(STORAGE_KEYS.accessToken, data.accessToken);
  localStorage.setItem(STORAGE_KEYS.refreshToken, data.refreshToken);
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(toSessionUser(data)));
  touchSessionActivity();
}

export function clearSessionData() {
  localStorage.removeItem(STORAGE_KEYS.accessToken);
  localStorage.removeItem(STORAGE_KEYS.refreshToken);
  localStorage.removeItem(STORAGE_KEYS.user);
  localStorage.removeItem(STORAGE_KEYS.lastActivityAt);
}

export function endSession(reason: SessionEndReason) {
  clearSessionData();
  emit({ type: "ended", reason });
}

export function updateStoredUser(user: SessionUser) {
  localStorage.setItem(STORAGE_KEYS.user, JSON.stringify(user));
  emit({ type: "updated", user });
}

export function getAccessTokenExpiry(token = getAccessToken()) {
  if (!token) {
    return null;
  }

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return null;
  }

  return payload.exp * 1000;
}

export function isAccessTokenExpiringSoon(
  thresholdMs = SESSION_REFRESH_THRESHOLD_MS,
  token = getAccessToken()
) {
  const expiresAt = getAccessTokenExpiry(token);
  if (!expiresAt) {
    return true;
  }

  return expiresAt - Date.now() <= thresholdMs;
}

export function isRefreshInFlight() {
  return refreshPromise !== null;
}

export async function refreshSessionTokens() {
  if (refreshPromise) {
    return refreshPromise;
  }

  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    endSession("missing_refresh_token");
    throw new Error("Missing refresh token");
  }

  refreshPromise = axios
    .post<AuthenticatedUserDto>(`${API_BASE_URL}/user/refreshToken`, { refreshToken })
    .then(({ data }) => {
      persistSession(data);
      emit({ type: "updated", user: toSessionUser(data) });
      return data;
    })
    .catch((error: unknown) => {
      endSession("refresh_failed");
      throw error;
    })
    .finally(() => {
      refreshPromise = null;
    });

  return refreshPromise;
}