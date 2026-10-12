import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import * as authApi from "../lib/auth";
import type { AuthUser } from "../types/auth";

type AuthContextType = {
  user: AuthUser | null;
  /** True only during the initial "is there already a session?" check on
   * app load — not re-used as a general-purpose loading flag for every
   * login attempt, since the sign-in form manages its own submit state. */
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (
    name: string,
    email: string,
    password: string,
    passwordConfirmation: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi
      .getCurrentUser()
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    await authApi.login(email, password);
    // A second round trip rather than trusting /login's own (empty, 204)
    // response — this is also where role info first becomes available,
    // and AuthGate needs that to decide whether this login belongs here.
    setUser(await authApi.getCurrentUser());
  }, []);

  const register = useCallback(
    async (
      name: string,
      email: string,
      password: string,
      passwordConfirmation: string,
    ) => {
      await authApi.register(name, email, password, passwordConfirmation);
      // Same reasoning as login() — a second round trip rather than
      // trusting /register's own (empty, 204) response.
      setUser(await authApi.getCurrentUser());
    },
    [],
  );

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
