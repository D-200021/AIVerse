// Bundles Monaco locally (no CDN) with its web workers, so the IDE works offline.
import * as monaco from "monaco-editor";
import { loader } from "@monaco-editor/react";
import editorWorker from "monaco-editor/editor/editor.worker.js?worker";
import jsonWorker from "monaco-editor/language/json/json.worker.js?worker";
import cssWorker from "monaco-editor/language/css/css.worker.js?worker";
import htmlWorker from "monaco-editor/language/html/html.worker.js?worker";
import tsWorker from "monaco-editor/language/typescript/ts.worker.js?worker";

self.MonacoEnvironment = {
  getWorker(_, label) {
    if (label === "json") return new jsonWorker();
    if (label === "css" || label === "scss" || label === "less") return new cssWorker();
    if (label === "html" || label === "handlebars" || label === "razor") return new htmlWorker();
    if (label === "typescript" || label === "javascript") return new tsWorker();
    return new editorWorker();
  },
};
loader.config({ monaco });

monaco.editor.defineTheme("aiverse", {
  base: "vs", inherit: true,
  rules: [{ token: "comment", foreground: "6b5878", fontStyle: "italic" }, { token: "keyword", foreground: "6e1423" }, { token: "string", foreground: "2e7d4f" }, { token: "number", foreground: "b45f06" }],
  colors: { "editor.background": "#fffdf5", "editor.foreground": "#1a1320", "editorLineNumber.foreground": "#a899b5", "editor.lineHighlightBackground": "#f4e9c7", "editorCursor.foreground": "#6e1423", "editor.selectionBackground": "#ffd93d88" },
});
export default monaco;
