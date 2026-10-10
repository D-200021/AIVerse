import { useEffect, useState } from "react";

// Tiny hash router for the auth screens: #/signin  #/signup  #/forgot  #/reset?token=…
const parse = () => {
  const [path, query = ""] = (window.location.hash.replace(/^#/, "") || "/signin").split("?");
  return { route: path.replace(/^\//, "") || "signin", params: Object.fromEntries(new URLSearchParams(query)) };
};
export function useHashRoute() {
  const [state, setState] = useState(parse);
  useEffect(() => { const f = () => setState(parse()); window.addEventListener("hashchange", f); return () => window.removeEventListener("hashchange", f); }, []);
  return { ...state, go: (r) => { window.location.hash = `/${r}`; } };
}
