// Pulls fenced code blocks out of an agent's Markdown output so they can be opened as files in the IDE.
const LANGS = {
  js: "javascript", javascript: "javascript", jsx: "javascript", mjs: "javascript", node: "javascript", ts: "typescript", typescript: "typescript", tsx: "typescript",
  py: "python", python: "python", html: "html", css: "css", json: "json", sh: "shell", bash: "shell", shell: "shell", zsh: "shell",
  java: "java", c: "c", cpp: "cpp", "c++": "cpp", cs: "csharp", csharp: "csharp", go: "go", rust: "rust", rs: "rust", sql: "sql",
  md: "markdown", markdown: "markdown", yaml: "yaml", yml: "yaml", php: "php", rb: "ruby", ruby: "ruby", kt: "kotlin", kotlin: "kotlin", swift: "swift", xml: "xml",
};
const EXT = { javascript: "js", typescript: "ts", python: "py", html: "html", css: "css", json: "json", shell: "sh", java: "java", c: "c", cpp: "cpp", csharp: "cs", go: "go", rust: "rs", sql: "sql", markdown: "md", yaml: "yml", php: "php", ruby: "rb", kotlin: "kt", swift: "swift", xml: "xml", plaintext: "txt" };
const BY_EXT = Object.fromEntries(Object.entries(EXT).map(([l, e]) => [e, l]));

export const languageOf = (filename) => BY_EXT[(filename.split(".").pop() || "").toLowerCase()] || "plaintext";
export const hasCode = (text) => /```[\s\S]*?```/.test(text || "");

export function extractCodeFiles(text = "") {
  const re = /```([^\n`]*)\n([\s\S]*?)```/g;
  const files = []; const used = new Set(); let m;
  while ((m = re.exec(text))) {
    const info = m[1].trim(), code = m[2].replace(/\n$/, "");
    if (!code.trim()) continue;
    const langKey = (info.split(/[\s:{]/)[0] || "").toLowerCase();
    // filename from the fence info ("js hello.js", "js:hello.js", title="x.js") or from the line just above
    const above = text.slice(0, m.index).trimEnd().split("\n").pop() || "";
    const nameRe = /([\w][\w./-]*\.[A-Za-z0-9]{1,6})\b/;
    const hit = nameRe.exec(info.slice(langKey.length)) || nameRe.exec(above.slice(-120)) || /^\s*(?:\/\/|#)\s*(?:file(?:name)?:)\s*(\S+)/i.exec(code);
    let language = LANGS[langKey] || (hit ? languageOf(hit[1]) : "plaintext");
    let name = hit ? hit[1].split("/").pop() : `${files.length ? `snippet${files.length + 1}` : "main"}.${EXT[language] || "txt"}`;
    if (hit && language === "plaintext") language = languageOf(name);
    while (used.has(name)) name = name.replace(/(\.\w+)?$/, (e) => `-${used.size}${e}`);
    used.add(name);
    files.push({ name, language, content: code, original: code });
  }
  return files;
}
