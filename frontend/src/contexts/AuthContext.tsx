import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useTranslation } from "react-i18next";
import type { AuthenticatedUserDto, LoginParamsDto, UserDto } from "@/types";
import { authService } from "@/backend/authService";
import { bankService } from "@/backend/bankService";
import { ROUTES } from "@/config/routes";
import { ToastBanner } from "@/components/ui/toast-banner";
import {
  clearSessionData,
  endSession,
  getAccessToken,
  getLastActivityAt,
  getRefreshToken,
  isAccessTokenExpiringSoon,
  isRefreshInFlight,
  loadSessionUser,
  persistSession,
  refreshSessionTokens,
  SESSION_ACTIVITY_THROTTLE_MS,
  SESSION_CHECK_INTERVAL_MS,
  SESSION_INACTIVITY_TIMEOUT_MS,
  SESSION_WARNING_THRESHOLD_MS,
  type SessionEndReason,
  type SessionUser,
  subscribeSessionEvents,
  touchSessionActivity,
  updateStoredUser,
} from "@/lib/session";

// ── Context types ──
interface User {
  id: string;
  nickname: string;
  email: string;
  preferredCurrency: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (params: LoginParamsDto) => Promise<void>;
  signUp: (params: UserDto) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function toUser(data: Pick<AuthenticatedUserDto, "id" | "nickname" | "email" | "preferredCurrency">): User {
  return { id: data.id, nickname: data.nickname, email: data.email, preferredCurrency: data.preferredCurrency ?? "EUR" };
}

function fromSessionUser(user: SessionUser | null): User | null {
  return user ? { id: user.id, nickname: user.nickname, email: user.email, preferredCurrency: user.preferredCurrency ?? "EUR" } : null;
}

function SessionToast({
  reason,
  warningVisible,
  warningMinutesLeft,
  onClose,
  onLogin,
  onStayActive,
}: {
  reason: SessionEndReason | null;
  warningVisible: boolean;
  warningMinutesLeft: number;
  onClose: () => void;
  onLogin: () => void;
  onStayActive: () => void;
}) {
  const { t } = useTranslation();

  if (reason && reason !== "manual") {
    const messageKey = reason === "inactivity"
      ? "auth.sessionExpiredInactive"
      : "auth.sessionExpiredMessage";

    return (
      <ToastBanner
        tone="error"
        title={t("auth.sessionExpiredTitle")}
        message={t(messageKey)}
        action={{
          label: t("auth.sessionExpiredAction"),
          onClick: onLogin,
        }}
        onClose={onClose}
      />
    );
  }

  if (!warningVisible) {
    return null;
  }

  return (
    <ToastBanner
      tone="warning"
      title={t("auth.sessionWarningTitle")}
      message={t("auth.sessionWarningMessage", { minutes: warningMinutesLeft })}
      action={{
        label: t("auth.sessionWarningAction"),
        onClick: onStayActive,
        className: "btn-login-hover !mt-3 !rounded-lg !px-4 !py-2 !text-sm !font-semibold",
      }}
      onClose={onClose}
    />
  );
}

// ── Provider ──
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionNoticeReason, setSessionNoticeReason] = useState<SessionEndReason | null>(null);
  const [warningDismissed, setWarningDismissed] = useState(false);
  const [warningVisible, setWarningVisible] = useState(false);
  const [warningMinutesLeft, setWarningMinutesLeft] = useState(0);
  const lastActivityHandledAtRef = useRef(0);
  const activityHandlerRef = useRef<() => void>(() => {});

  const dismissWarning = useCallback(() => {
    setWarningDismissed(true);
    setWarningVisible(false);
  }, []);

  const keepSessionAlive = useCallback(() => {
    activityHandlerRef.current();
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeSessionEvents((event) => {
      if (event.type === "updated") {
        setUser(fromSessionUser(event.user));
        setWarningDismissed(false);
        setWarningVisible(false);
        return;
      }

      setUser(null);
      if (event.reason !== "manual") {
        setSessionNoticeReason(event.reason);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    let ignore = false;

    const rehydrateSession = async () => {
      const storedUser = loadSessionUser();
      const accessToken = getAccessToken();
      const refreshToken = getRefreshToken();
      const lastActivityAt = getLastActivityAt();

      if (!storedUser && !accessToken && !refreshToken) {
        if (!ignore) {
          setIsLoading(false);
        }
        return;
      }

      if (!storedUser || !refreshToken) {
        endSession("invalid_session");
        if (!ignore) {
          setIsLoading(false);
        }
        return;
      }

      if (lastActivityAt && Date.now() - lastActivityAt >= SESSION_INACTIVITY_TIMEOUT_MS) {
        endSession("inactivity");
        if (!ignore) {
          setIsLoading(false);
        }
        return;
      }

      try {
        if (!accessToken || isAccessTokenExpiringSoon(undefined, accessToken)) {
          const data = await refreshSessionTokens();
          if (!ignore) {
            setUser(toUser(data));
          }
        } else if (!ignore) {
          setUser(fromSessionUser(storedUser));
        }
      } catch {
        if (!ignore) {
          setUser(null);
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    };

    void rehydrateSession();

    return () => {
      ignore = true;
    };
  }, []);

  const login = useCallback(async (params: LoginParamsDto) => {
    const data = await authService.login(params);
    persistSession(data);
    setSessionNoticeReason(null);
    setWarningDismissed(false);
    setWarningVisible(false);
    setUser(toUser(data));
    void bankService.syncStale(15).catch(() => {});
  }, []);

  const signUp = useCallback(async (params: UserDto) => {
    const data = await authService.signUp(params);
    persistSession(data);
    setSessionNoticeReason(null);
    setWarningDismissed(false);
    setWarningVisible(false);
    setUser(toUser(data));
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignore logout errors (token expired, etc.)
    } finally {
      clearSessionData();
      setSessionNoticeReason(null);
      setWarningDismissed(false);
      setWarningVisible(false);
      setUser(null);
      window.location.assign(ROUTES.HOME);
    }
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    updateStoredUser(updated);
  }, []);

  useEffect(() => {
    if (!user) {
      return;
    }

    let inactivityTimeoutId: number | undefined;
    let warningTimeoutId: number | undefined;

    const hideWarning = () => {
      setWarningVisible(false);
      setWarningMinutesLeft(0);
    };

    const expireForInactivity = () => {
      hideWarning();
      endSession("inactivity");
    };

    const scheduleInactivityTimeout = () => {
      window.clearTimeout(inactivityTimeoutId);
      window.clearTimeout(warningTimeoutId);

      const lastActivityAt = getLastActivityAt() ?? Date.now();
      const remainingMs = SESSION_INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt);

      if (remainingMs <= 0) {
        expireForInactivity();
        return;
      }

      if (remainingMs <= SESSION_WARNING_THRESHOLD_MS) {
        if (!warningDismissed) {
          setWarningMinutesLeft(Math.max(1, Math.ceil(remainingMs / 60_000)));
          setWarningVisible(true);
        }
      } else {
        hideWarning();
        warningTimeoutId = window.setTimeout(() => {
          const nextLastActivityAt = getLastActivityAt() ?? Date.now();
          const nextRemainingMs = SESSION_INACTIVITY_TIMEOUT_MS - (Date.now() - nextLastActivityAt);
          if (nextRemainingMs <= 0) {
            expireForInactivity();
            return;
          }
          if (!warningDismissed) {
            setWarningMinutesLeft(Math.max(1, Math.ceil(nextRemainingMs / 60_000)));
            setWarningVisible(true);
          }
        }, remainingMs - SESSION_WARNING_THRESHOLD_MS);
      }

      inactivityTimeoutId = window.setTimeout(expireForInactivity, remainingMs);
    };

    const refreshIfNeeded = async () => {
      if (document.visibilityState === "hidden" || isRefreshInFlight()) {
        return;
      }

      const accessToken = getAccessToken();
      if (accessToken && !isAccessTokenExpiringSoon(undefined, accessToken)) {
        return;
      }

      try {
        await refreshSessionTokens();
      } catch {
        // El cierre visible se gestiona desde el emisor de sesión.
      }
    };

    const handleActivity = () => {
      const now = Date.now();
      const lastActivityAt = getLastActivityAt() ?? now;

      if (now - lastActivityAt >= SESSION_INACTIVITY_TIMEOUT_MS) {
        expireForInactivity();
        return;
      }

      if (now - lastActivityHandledAtRef.current < SESSION_ACTIVITY_THROTTLE_MS) {
        return;
      }

      lastActivityHandledAtRef.current = now;
      touchSessionActivity(now);
      setWarningDismissed(false);
      scheduleInactivityTimeout();
      void refreshIfNeeded();
    };

    activityHandlerRef.current = handleActivity;

    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") {
        return;
      }

      const lastActivityAt = getLastActivityAt();
      if (lastActivityAt && Date.now() - lastActivityAt >= SESSION_INACTIVITY_TIMEOUT_MS) {
        expireForInactivity();
        return;
      }

      setWarningDismissed(false);
      scheduleInactivityTimeout();
      void refreshIfNeeded();
    };

    if (!getLastActivityAt()) {
      touchSessionActivity();
    }

    scheduleInactivityTimeout();
    void refreshIfNeeded();

    const intervalId = window.setInterval(() => {
      const lastActivityAt = getLastActivityAt();
      if (lastActivityAt && Date.now() - lastActivityAt >= SESSION_INACTIVITY_TIMEOUT_MS) {
        expireForInactivity();
        return;
      }

      const remainingMs = lastActivityAt
        ? SESSION_INACTIVITY_TIMEOUT_MS - (Date.now() - lastActivityAt)
        : SESSION_INACTIVITY_TIMEOUT_MS;

      if (remainingMs <= SESSION_WARNING_THRESHOLD_MS && !warningDismissed) {
        setWarningMinutesLeft(Math.max(1, Math.ceil(remainingMs / 60_000)));
        setWarningVisible(true);
      }

      void refreshIfNeeded();
    }, SESSION_CHECK_INTERVAL_MS);

    const activityEvents: Array<keyof WindowEventMap> = [
      "pointerdown",
      "keydown",
      "scroll",
      "touchstart",
      "focus",
    ];

    activityEvents.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, { passive: true });
    });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      activityHandlerRef.current = () => {};
      hideWarning();
      window.clearTimeout(warningTimeoutId);
      window.clearTimeout(inactivityTimeoutId);
      window.clearInterval(intervalId);
      activityEvents.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [user, warningDismissed]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      login,
      signUp,
      logout,
      updateUser,
    }),
    [user, isLoading, login, signUp, logout, updateUser]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      <SessionToast
        reason={sessionNoticeReason}
        warningVisible={warningVisible}
        warningMinutesLeft={warningMinutesLeft}
        onClose={() => {
          if (sessionNoticeReason) {
            setSessionNoticeReason(null);
            return;
          }

          dismissWarning();
        }}
        onLogin={() => {
          window.location.assign(ROUTES.HOME);
        }}
        onStayActive={keepSessionAlive}
      />
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
