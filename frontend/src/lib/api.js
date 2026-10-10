// Fetch wrappers. The simulation helpers (apiGet/apiPost/...) resolve to null on
// failure so the office keeps running; apiCall() exposes the error message for the
// auth screens. Every request carries the signed-in user's token.
let authToken = null;
let unauthorizedHandler = null;
export const setAuthToken = (t) => { authToken = t || null; };
export const onUnauthorized = (fn) => { unauthorizedHandler = fn; };

export async function apiCall(apiBase, path, { method = "GET", body } = {}) {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      method,
      headers: { ...(body ? { "Content-Type": "application/json" } : {}), ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (res.status === 401 && authToken && unauthorizedHandler) unauthorizedHandler();
    return { ok: res.ok, status: res.status, data, error: res.ok ? null : data?.error || `Request failed (${res.status})` };
  } catch (err) {
    return { ok: false, status: 0, data: {}, error: "Can't reach the server. Is the backend running?" };
  }
}

async function quiet(apiBase, path, opts) {
  const r = await apiCall(apiBase, path, opts);
  if (!r.ok) console.warn(`[backend] ${opts?.method || "GET"} ${path} failed:`, r.error);
  return r.ok ? r.data : null;
}
export const apiGet = (b, p) => quiet(b, p);
export const apiPost = (b, p, body) => quiet(b, p, { method: "POST", body });
export const apiPut = (b, p, body) => quiet(b, p, { method: "PUT", body });
export const apiDelete = (b, p) => quiet(b, p, { method: "DELETE" });
