// Fire-and-forget-friendly fetch wrappers: the simulation must keep
// working locally even if the backend is offline, so every helper here
// swallows its own errors (logged quietly) and resolves to null instead
// of rejecting.

export async function apiGet(apiBase, path) {
  try {
    const res = await fetch(`${apiBase}${path}`);
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[backend] GET ${path} failed (working offline):`, err.message);
    return null;
  }
}

export async function apiPost(apiBase, path, body) {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[backend] POST ${path} failed (working offline):`, err.message);
    return null;
  }
}

export async function apiPut(apiBase, path, body) {
  try {
    const res = await fetch(`${apiBase}${path}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[backend] PUT ${path} failed (working offline):`, err.message);
    return null;
  }
}

export async function apiDelete(apiBase, path) {
  try {
    const res = await fetch(`${apiBase}${path}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`[backend] DELETE ${path} failed (working offline):`, err.message);
    return null;
  }
}
