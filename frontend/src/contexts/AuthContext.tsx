import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AuthenticatedUserDto, LoginParamsDto, UserDto } from "@/types";
import { authService } from "@/backend/authService";

// ── Tipos del contexto ──
interface User {
  id: string;
  nickname: string;
  email: string;
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

// ── Helpers de localStorage ──
const persistSession = (data: AuthenticatedUserDto) => {
  localStorage.setItem("accessToken", data.accessToken);
  localStorage.setItem("refreshToken", data.refreshToken);
  localStorage.setItem(
    "user",
    JSON.stringify({ id: data.id, nickname: data.nickname, email: data.email })
  );
};

const clearSession = () => {
  localStorage.removeItem("accessToken");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("user");
};

const loadUser = (): User | null => {
  try {
    const raw = localStorage.getItem("user");
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// ── Provider ──
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Rehidratar sesión desde localStorage al montar
  useEffect(() => {
    const stored = loadUser();
    const token = localStorage.getItem("accessToken");
    if (stored && token) {
      setUser(stored);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (params: LoginParamsDto) => {
    const data = await authService.login(params);
    persistSession(data);
    setUser({ id: data.id, nickname: data.nickname, email: data.email });
  }, []);

  const signUp = useCallback(async (params: UserDto) => {
    const data = await authService.signUp(params);
    persistSession(data);
    setUser({ id: data.id, nickname: data.nickname, email: data.email });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      // Ignorar errores en logout (token expirado, etc.)
    } finally {
      clearSession();
      setUser(null);
    }
  }, []);

  const updateUser = useCallback((updated: User) => {
    setUser(updated);
    localStorage.setItem("user", JSON.stringify(updated));
  }, []);

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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
