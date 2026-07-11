import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { api, getStoredToken, storeToken } from './api';
import { AuthContext, type AuthState } from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(getStoredToken());

  const login = useCallback(async (email: string, password: string) => {
    const { data, error } = await api.POST('/v1/auth/login', { body: { email, password } });
    if (error || !data) throw new Error('Invalid email or password');
    storeToken(data.accessToken);
    setToken(data.accessToken);
  }, []);

  const logout = useCallback(() => {
    storeToken(null);
    setToken(null);
  }, []);

  const value = useMemo<AuthState>(() => ({ token, login, logout }), [token, login, logout]);

  return <AuthContext value={value}>{children}</AuthContext>;
}
