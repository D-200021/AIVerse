import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiCall, setAuthToken, onUnauthorized } from "../lib/api.js";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);
const KEY = "aiverse-token";
const read = () => { try { return localStorage.getItem(KEY); } catch { return null; } };
const write = (t) => { try { t ? localStorage.setItem(KEY, t) : localStorage.removeItem(KEY); } catch { /* storage unavailable */ } };

export function AuthProvider({ apiBase, children }) {
  const [status, setStatus] = useState("loading"); // loading | anon | authed | offline
  const [user, setUser] = useState(null);
  const [notice, setNotice] = useState("");

  const startSession = useCallback((token, u) => { setAuthToken(token); write(token); setUser(u); setStatus("authed"); }, []);
  const logout = useCallback((msg = "") => { setAuthToken(null); write(null); setUser(null); setStatus("anon"); setNotice(msg); }, []);

  const restore = useCallback(async () => {
    const token = read();
    if (!token) { setStatus("anon"); return; }
    setAuthToken(token); setStatus("loading");
    const r = await apiCall(apiBase, "/auth/me");
    if (r.ok) { setUser(r.data.user); setStatus("authed"); }
    else if (r.status === 0) setStatus("offline");
    else logout();
  }, [apiBase, logout]);

  useEffect(() => { onUnauthorized(() => logout("Your session ended. Please sign in again.")); restore(); }, [restore, logout]);

  const value = useMemo(() => ({
    status, user, notice, retry: restore, logout, clearNotice: () => setNotice(""),
    async signin(email, password) { const r = await apiCall(apiBase, "/auth/login", { method: "POST", body: { email, password } }); if (r.ok) startSession(r.data.token, r.data.user); return r; },
    async signup(fields) { const r = await apiCall(apiBase, "/auth/signup", { method: "POST", body: fields }); if (r.ok) startSession(r.data.token, r.data.user); return r; },
    forgot: (email) => apiCall(apiBase, "/auth/forgot-password", { method: "POST", body: { email } }),
    reset: (token, password) => apiCall(apiBase, "/auth/reset-password", { method: "POST", body: { token, password } }),
    async updateKey(geminiKey) { const r = await apiCall(apiBase, "/auth/me/gemini-key", { method: "PUT", body: { geminiKey } }); if (r.ok) setUser((u) => ({ ...u, hasGeminiKey: true })); return r; },
  }), [status, user, notice, restore, logout, startSession, apiBase]);

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}
