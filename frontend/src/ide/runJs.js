// Runs JavaScript in a sandboxed, origin-less iframe and returns what it logged.
export function runJavaScript(code, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const id = Math.random().toString(36).slice(2);
    const frame = document.createElement("iframe");
    frame.setAttribute("sandbox", "allow-scripts");
    frame.style.display = "none";
    let done = false;
    const finish = (result) => { if (done) return; done = true; window.removeEventListener("message", onMsg); clearTimeout(timer); frame.remove(); resolve(result); };
    const onMsg = (e) => { if (e.source === frame.contentWindow && e.data?.id === id) finish({ logs: e.data.logs, error: e.data.error }); };
    const timer = setTimeout(() => finish({ logs: [], error: `Stopped: ran longer than ${timeoutMs / 1000}s.` }), timeoutMs);
    window.addEventListener("message", onMsg);
    const src = `<script>
      const logs = []; const fmt = (a) => { try { return typeof a === "string" ? a : JSON.stringify(a, null, 2) ?? String(a); } catch { return String(a); } };
      for (const k of ["log", "info", "warn", "error"]) console[k] = (...a) => logs.push({ level: k, text: a.map(fmt).join(" ") });
      (async () => { let error = null; try { await (0, eval)(${JSON.stringify(code)}); } catch (e) { error = String(e && e.stack || e); }
        setTimeout(() => parent.postMessage({ id: ${JSON.stringify(id)}, logs, error }, "*"), 250); })();
    <\/script>`;
    frame.srcdoc = src;
    document.body.appendChild(frame);
  });
}
