import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const AuthContext = createContext(null);
const SESSION_KEY = 'vieward_session';
const IDLE_LIMIT_MS = 20 * 60 * 1000; // 20 minutes

// Demo credentials for this build. Swap for real Firebase Auth (or your
// hospital's SSO/identity provider) before going anywhere near real
// patients — see README "Security notes before real deployment".
const DEMO_USERS = {
  admin: { pin: 'flowguard2026', name: 'Administrator', role: 'admin' },
  nurse01: { pin: 'ward2026', name: 'S. Kulkarni, RN', role: 'nurse' },
  nurse02: { pin: 'ward2026', name: 'P. Nair, RN', role: 'nurse' },
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });
  const idleTimer = useRef(null);

  const logout = useCallback(() => {
    setUser(null);
    sessionStorage.removeItem(SESSION_KEY);
  }, []);

  const login = useCallback((id, pin) => {
    const record = DEMO_USERS[id.trim().toLowerCase()];
    if (!record || record.pin !== pin.trim()) {
      return { ok: false, error: 'ID and password do not match our records.' };
    }
    const sessionUser = { id, name: record.name, role: record.role };
    setUser(sessionUser);
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(sessionUser));
    return { ok: true, role: record.role };
  }, []);

  const resetIdle = useCallback(() => {
    if (idleTimer.current) clearTimeout(idleTimer.current);
    idleTimer.current = setTimeout(logout, IDLE_LIMIT_MS);
  }, [logout]);

  useEffect(() => {
    if (!user) return undefined;
    resetIdle();
    const events = ['click', 'keydown', 'mousemove', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, resetIdle));
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetIdle));
      if (idleTimer.current) clearTimeout(idleTimer.current);
    };
  }, [user, resetIdle]);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
