// src/components/EditorTabs.tsx
import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { SparklesIcon, PlusIcon, ChevronDownIcon } from "@heroicons/react/24/outline";
import type { Project } from "../types/project";

type Props = {
  project?: Project | null;
  onChange: (p: Project) => void;
};

type SnipKind = "html" | "css" | "js" | "all";
type Snip = { id?: string; label: string; snippet: string; kind: SnipKind; description?: string; tags?: string[] };

const STORAGE_FAVS = "editor_snippet_favs_v1";
const STORAGE_RECENT = "editor_snippet_recent_v1";

const SNIPPETS: Snip[] = [
  { label: "Section (semantic)", kind: "html", snippet: "<section>\n  <h2>Title</h2>\n  <p>Description...</p>\n</section>\n", description: "Semantic section block" },
  { label: "Header", kind: "html", snippet: "<header>\n  <nav><!-- links --></nav>\n</header>\n", description: "Top navigation header" },
  { label: "Footer", kind: "html", snippet: "<footer>\n  <p>&copy; 2025 MyCompany</p>\n</footer>\n", description: "Simple footer" },
  { label: "Button (accessible)", kind: "html", snippet: '<button class="btn" role="button">Click me</button>\n', description: "Accessible button" },
  { label: "Card", kind: "html", snippet: '<article class="card">\n  <h3>Card title</h3>\n  <p>Card body</p>\n</article>\n', description: "Basic card layout" },
  { label: "Image", kind: "html", snippet: '<img src="path/to/img.jpg" alt="description" />\n', description: "Responsive-ish image" },

  /* CSS */
  { label: "Flex row center", kind: "css", snippet: ".row-center {\n  display: flex;\n  align-items: center;\n  justify-content: center;\n}\n", description: "Basic flex centered row" },
  { label: "Flex column gap", kind: "css", snippet: ".col-gap {\n  display: flex;\n  flex-direction: column;\n  gap: 12px;\n}\n", description: "Vertical column with gap" },
  { label: "Responsive grid 3 cols", kind: "css", snippet: ".grid-3 {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  gap: 16px;\n}\n@media (max-width: 768px) {\n  .grid-3 { grid-template-columns: 1fr; }\n}\n", description: "Grid with responsive breakpoint" },
  { label: "CSS variable theme", kind: "css", snippet: ":root {\n  --bg: #fff;\n  --fg: #111;\n  --accent: #3b82f6;\n}\n", description: "Root theme variables" },
  { label: "Button primary (tailored)", kind: "css", snippet: ".btn-primary {\n  padding: 10px 14px;\n  border-radius: 10px;\n  background: linear-gradient(90deg,#3b82f6,#1e3a8a);\n  color: #fff;\n  font-weight: 700;\n}\n", description: "Styled primary button" },

  /* JS */
  { label: "querySelector + text", kind: "js", snippet: "const el = document.querySelector('.selector');\nif (el) el.textContent = 'New text';\n", description: "Find element and update text" },
  { label: "Event listener", kind: "js", snippet: "const btn = document.querySelector('.btn');\nbtn?.addEventListener('click', (e) => {\n  // handle click\n});\n", description: "Add click listener" },
  { label: "Event delegation (list)", kind: "js", snippet: "document.querySelector('.list')?.addEventListener('click', (e) => {\n  const button = (e.target as HTMLElement).closest('[data-action]');\n  if (!button) return;\n  const action = button.getAttribute('data-action');\n  // handle action\n});\n", description: "Delegate click events" },
  { label: "Fetch JSON (async)", kind: "js", snippet: "async function loadJson(url){\n  const res = await fetch(url);\n  if (!res.ok) throw new Error('Network error');\n  return await res.json();\n}\n", description: "Fetch helper" },
  { label: "Debounce utility", kind: "js", snippet: "function debounce(fn, ms = 250){\n  let t;\n  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };\n}\n", description: "Debounce function" },

  /* cross */
  { label: "Basic starter (HTML+CSS+JS)", kind: "all", snippet: "<!doctype html>\n<html>\n<head>\n  <meta charset=\"utf-8\" />\n  <meta name=\"viewport\" content=\"width=device-width,initial-scale=1\" />\n  <link rel=\"stylesheet\" href=\"styles.css\">\n  <title>App</title>\n</head>\n<body>\n  <div id=\"app\"></div>\n  <script src=\"app.js\"></script>\n</body>\n</html>\n", description: "Starter scaffold" },
];

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

/* Normalize HTML to be beginner-friendly */
function normalizeSnippetForBeginners(snippet: string, kind: SnipKind) {
  if (kind !== "html") return snippet;
  let s = snippet.trim();
  const voidTags = ["img", "input", "br", "hr", "meta", "link"];
  if (!/^\s*</.test(s)) {
    return `<div>\n  ${s.replace(/\n/g, "\n  ")}\n</div>\n`;
  }
  for (const t of voidTags) {
    const closingRe = new RegExp(`</${t}>`, "gi");
    if (closingRe.test(s)) s = s.replace(closingRe, "");
    const openRe = new RegExp(`<${t}([^>]*)>`, "i");
    s = s.replace(openRe, (m: string, attrs: string) => `<${t}${attrs || ""} />`);
  }
  const opening = s.match(/^<([a-z0-9-]+)(\s|>)/i);
  if (opening) {
    const tag = opening[1].toLowerCase();
    if (!voidTags.includes(tag)) {
      const closingPattern = new RegExp(`</${tag}>\\s*$`, "i");
      if (!closingPattern.test(s)) s = s + `\n</${tag}>\n`;
    }
  }
  return s + (s.endsWith("\n") ? "" : "\n");
}

/* Simple validators */
function validateHTML(str: string) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(str, "text/html");
    const parsererror = doc.querySelector("parsererror");
    if (parsererror) {
      return [{ level: "error", message: parsererror.textContent?.trim() || "HTML parse error" }];
    }
    return [];
  } catch (e) {
    return [{ level: "error", message: "HTML parse failed" }];
  }
}

function validateCSS(str: string) {
  const errors: { level: string; message: string }[] = [];
  // simple brace balance check
  let open = 0;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === "{") open++;
    if (str[i] === "}") open--;
    if (open < -5) { // safeguard
      errors.push({ level: "error", message: "Unexpected '}'" });
      break;
    }
  }
  if (open > 0) errors.push({ level: "error", message: "Missing closing '}'" });
  // detect obvious property mistakes (very small heuristic)
  if (/\b[A-Z]+\b/.test(str)) errors.push({ level: "warning", message: "CSS properties appear uppercase - CSS is case-sensitive for some values" });
  return errors;
}

function validateJS(str: string) {
  const errors: { level: string; message: string }[] = [];
  // quick syntax check using Function constructor (does not execute)
  try {
    // wrap in function to allow top-level statements; will throw on syntax error
    // avoid executing code: new Function only parses.
    // small precaution: don't use user code in template strings that could create giant memory usage
    const f = new Function(str);
    void f; // no-op just to reference
  } catch (e: any) {
    const msg = (e && e.message) ? String(e.message) : "JS syntax error";
    errors.push({ level: "error", message: msg });
  }
  return errors;
}

/* Types for error panel */
type LintMessage = { level: "error" | "warning"; message: string; source?: string };

/* Tab & history types */
type TabKey = "html" | "css" | "js";
type HistoryState = { html: string; css: string; js: string };

export default function EditorTabs({ project, onChange }: Props) {
  const p = project || { html: "", css: "", js: "" };

  const [html, setHtml] = useState<string>(p.html || "");
  const [css, setCss] = useState<string>(p.css || "");
  const [js, setJs] = useState<string>(p.js || "");

  const [activeTab, setActiveTab] = useState<TabKey>("html");
  const [showSnippet, setShowSnippet] = useState(false);
  const [showDocs, setShowDocs] = useState(false);
  const [query, setQuery] = useState("");
  const htmlRef = useRef<HTMLTextAreaElement | null>(null);
  const cssRef = useRef<HTMLTextAreaElement | null>(null);
  const jsRef = useRef<HTMLTextAreaElement | null>(null);

  // persisted lists
  const [favs, setFavs] = useState<Snip[]>(() => {
    try { const r = localStorage.getItem(STORAGE_FAVS); return r ? JSON.parse(r) : []; } catch { return []; }
  });
  const [recent, setRecent] = useState<Snip[]>(() => {
    try { const r = localStorage.getItem(STORAGE_RECENT); return r ? JSON.parse(r) : []; } catch { return []; }
  });

  // lint/errors for active tab
  const [errors, setErrors] = useState<LintMessage[]>([]);
  const validationTimer = useRef<number | null>(null);

  // responsive textarea min-height
  const [minTextareaHeight, setMinTextareaHeight] = useState<string>("40vh");
  useEffect(() => {
    function compute() {
      const w = window.innerWidth;
      if (w >= 1400) setMinTextareaHeight("65vh");
      else if (w >= 1024) setMinTextareaHeight("60vh");
      else if (w >= 768) setMinTextareaHeight("50vh");
      else setMinTextareaHeight("40vh");
    }
    compute();
    window.addEventListener("resize", compute);
    return () => window.removeEventListener("resize", compute);
  }, []);

  // latestRef for snapshots & stable operations
  const latestRef = useRef<HistoryState>({ html: p.html || "", css: p.css || "", js: p.js || "" });
  useEffect(() => { latestRef.current = { html, css, js }; }, [html, css, js]);

  // when parent project changes externally, update editor but only if different
  useEffect(() => {
    if (p.html !== html) setHtml(p.html || "");
    if (p.css !== css) setCss(p.css || "");
    if (p.js !== js) setJs(p.js || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [p.html, p.css, p.js]);

  /* ----------------- Debounced onChange to parent to reduce re-renders ----------------- */
  const onChangeTimer = useRef<number | null>(null);
  const flushOnChange = (immediate?: boolean) => {
    if (onChangeTimer.current) { window.clearTimeout(onChangeTimer.current); onChangeTimer.current = null; }
    if (immediate) {
      try { onChange({ html: latestRef.current.html, css: latestRef.current.css, js: latestRef.current.js }); } catch {}
    } else {
      onChangeTimer.current = window.setTimeout(() => {
        try { onChange({ html: latestRef.current.html, css: latestRef.current.css, js: latestRef.current.js }); } catch {}
        onChangeTimer.current = null;
      }, 400); // 400ms debounce
    }
  };

  // push a snapshot into history (simple implementation kept, but not shown to UI)
  const undoStack = useRef<HistoryState[]>([]);
  const redoStack = useRef<HistoryState[]>([]);
  const HISTORY_LIMIT = 60;
  function pushHistorySnapshot(s: HistoryState, replaceLatest = false) {
    try {
      if (replaceLatest && undoStack.current.length > 0) {
        undoStack.current[undoStack.current.length - 1] = s;
      } else {
        undoStack.current.push(s);
        if (undoStack.current.length > HISTORY_LIMIT) undoStack.current.shift();
      }
      redoStack.current = [];
    } catch {}
  }
  function applyHistoryState(state: HistoryState) {
    setHtml(state.html);
    setCss(state.css);
    setJs(state.js);
    latestRef.current = state;
    flushOnChange(true);
    // restore caret focus to active tab
    requestAnimationFrame(() => {
      const area = activeTab === "html" ? htmlRef.current : activeTab === "css" ? cssRef.current : jsRef.current;
      if (area) try { const pos = area.value.length; area.setSelectionRange(pos, pos); area.focus(); } catch {}
    });
  }
  function undo() {
    if (undoStack.current.length <= 1) return;
    const top = undoStack.current.pop()!;
    redoStack.current.push(top);
    const prev = undoStack.current[undoStack.current.length - 1];
    applyHistoryState(prev);
  }
  function redo() {
    const top = redoStack.current.pop();
    if (!top) return;
    undoStack.current.push(top);
    applyHistoryState(top);
  }

  /* ----------------- Composition (IME) handling ----------------- */
  const isComposing = useRef(false);
  function onCompositionStart() { isComposing.current = true; }
  function onCompositionEnd() { isComposing.current = false; }

  /* ----------------- Debounced lint/validation ----------------- */
  function scheduleValidation(tab?: TabKey) {
    if (validationTimer.current) { window.clearTimeout(validationTimer.current); validationTimer.current = null; }
    validationTimer.current = window.setTimeout(() => {
      try {
        const current = latestRef.current;
        let res: LintMessage[] = [];
        if (!tab || tab === "html") res = res.concat(validateHTML(current.html).map(r => ({ level: r.level as "error" | "warning", message: r.message, source: "HTML" })));
        if (!tab || tab === "css") res = res.concat(validateCSS(current.css).map(r => ({ level: r.level as "error" | "warning", message: r.message, source: "CSS" })));
        if (!tab || tab === "js") res = res.concat(validateJS(current.js).map(r => ({ level: r.level as "error" | "warning", message: r.message, source: "JS" })));
        setErrors(res.slice(0, 6)); // show up to 6 messages
      } catch (e) {
        setErrors([{ level: "error", message: "Validation failed" }]);
      }
    }, 600); // wait for user pause
  }

  /* ----------------- Keyboard shortcuts (composition-safe) ----------------- */
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const mac = navigator.platform.toLowerCase().includes("mac");
      const mod = mac ? e.metaKey : e.ctrlKey;
      if (isComposing.current) return;
      if (mod && e.key.toLowerCase() === "k") { e.preventDefault(); setShowSnippet(s => !s); setShowDocs(false); return; }
      if (mod && e.key === "/") { e.preventDefault(); setShowDocs(s => !s); setShowSnippet(false); return; }
      if (e.key === "Escape") { setShowSnippet(false); setShowDocs(false); return; }
      if (e.altKey && !mod) {
        if (e.key === "1") { setActiveTab("html"); e.preventDefault(); return; }
        if (e.key === "2") { setActiveTab("css"); e.preventDefault(); return; }
        if (e.key === "3") { setActiveTab("js"); e.preventDefault(); return; }
      }
      // Undo / Redo
      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (mod && !e.shiftKey && e.key.toLowerCase() === "y") { e.preventDefault(); redo(); return; }
      // Insert top snippet when panel open
      if (e.key === "Enter" && showSnippet) {
        const list = getFilteredSnippets();
        if (list.length > 0) {
          e.preventDefault();
          if (e.shiftKey) insertSnippet(list[0].snippet, list[0], { keepOpen: true });
          else insertSnippet(list[0].snippet, list[0]);
        }
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [showSnippet, showDocs, query, activeTab, html, css, js]);

  /* ----------------- Persistence helpers ----------------- */
  function saveFavs(next: Snip[]) { setFavs(next); try { localStorage.setItem(STORAGE_FAVS, JSON.stringify(next)); } catch {} }
  function saveRecent(next: Snip[]) { setRecent(next); try { localStorage.setItem(STORAGE_RECENT, JSON.stringify(next.slice(0, 8))); } catch {} }

  /* ----------------- Insert snippet (caret-preserving, normalized) ----------------- */
  function insertSnippet(snippet: string, meta?: Snip, options?: { keepOpen?: boolean }) {
    const targetKind: SnipKind = meta?.kind ?? (activeTab as SnipKind);
    if (targetKind !== (activeTab as SnipKind) && targetKind !== "all") setActiveTab(targetKind as TabKey);
    else if (targetKind === "all") setActiveTab("html");
    const normalized = normalizeSnippetForBeginners(snippet, targetKind);
    const area = (targetKind === "html" || targetKind === "all") ? htmlRef.current : targetKind === "css" ? cssRef.current : jsRef.current;
    const finalArea = area || (activeTab === "html" ? htmlRef.current : activeTab === "css" ? cssRef.current : jsRef.current);
    if (!finalArea) return;
    const start = finalArea.selectionStart ?? finalArea.value.length;
    const end = finalArea.selectionEnd ?? start;
    const before = finalArea.value.slice(0, start);
    const after = finalArea.value.slice(end);
    const newVal = before + normalized + after;
    if (targetKind === "html" || targetKind === "all") { setHtml(newVal); latestRef.current.html = newVal; }
    else if (targetKind === "css") { setCss(newVal); latestRef.current.css = newVal; }
    else { setJs(newVal); latestRef.current.js = newVal; }
    pushHistorySnapshot({ html: latestRef.current.html, css: latestRef.current.css, js: latestRef.current.js });
    const rItem: Snip = { id: uid(), label: meta?.label ?? "Generated snippet", snippet: normalized, kind: meta?.kind ?? targetKind, description: meta?.description };
    const merged = [rItem, ...recent.filter(r => r.snippet !== normalized)];
    saveRecent(merged.slice(0, 8));
    requestAnimationFrame(() => {
      try { const pos = start + normalized.length; finalArea.setSelectionRange(pos, pos); finalArea.focus(); } catch {}
    });
    if (!options?.keepOpen) setShowSnippet(false);
    setQuery("");
    // flush parent and validate immediately after insert so preview updates
    flushOnChange(true);
    scheduleValidation(targetKind === "all" ? "html" : (targetKind as TabKey));
  }

  function toggleFav(s: Snip) {
    const exists = favs.find(f => f.snippet === s.snippet);
    if (exists) saveFavs(favs.filter(f => f.snippet !== s.snippet));
    else saveFavs([{ ...s, id: uid() }, ...favs].slice(0, 30));
  }

  function getFilteredSnippets(): Snip[] {
    const q = query.trim().toLowerCase();
    const primaryKind = activeTab;
    const pool = [...SNIPPETS, ...favs];
    const scored = pool.map(s => {
      let score = 0;
      if (s.kind === primaryKind) score += 50;
      if (s.kind === "all") score += 30;
      if (favs.find(f => f.snippet === s.snippet)) score += 10;
      const hay = (s.label + " " + (s.description || "") + " " + s.snippet + " " + (s.tags || []).join(" ")).toLowerCase();
      if (!q) score += 0; else {
        if (s.label.toLowerCase().startsWith(q)) score += 20;
        if (hay.includes(q)) score += 10;
      }
      return { s, score };
    });
    const filtered = scored.filter(x => !q || x.score > 5).sort((a, b) => b.score - a.score).map(x => x.s);
    const seen = new Set<string>();
    return filtered.filter(f => { if (seen.has(f.snippet)) return false; seen.add(f.snippet); return true; });
  }

  /* ----------------- Debounced onChange triggers when user types ----------------- */
  // Schedule parent update and validation when user pauses
  function scheduleChangeAndValidate(tab?: TabKey) {
    latestRef.current = { html, css, js };
    flushOnChange(false);
    scheduleValidation(tab);
    pushHistorySnapshot({ html: latestRef.current.html, css: latestRef.current.css, js: latestRef.current.js });
  }

  /* ----------------- copy helpers, assistant, docs (kept from prior) ----------------- */
  async function copySnippet(s: Snip) { try { await navigator.clipboard.writeText(s.snippet); alert('Copied to clipboard'); } catch { alert('Copy failed'); } }

  // Assistant generator (kept simple)
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistKind, setAssistKind] = useState<SnipKind>("html");
  const [assistTitle, setAssistTitle] = useState("");
  const [assistBody, setAssistBody] = useState("");
  const [assistOptions, setAssistOptions] = useState<{ responsive?: boolean; includeButton?: boolean }>({ responsive: true, includeButton: true });
  const [assistResult, setAssistResult] = useState<Snip | null>(null);

  function runAssistantGenerate() {
    const title = assistTitle || "Component";
    const body = assistBody || "Description...";
    const kind = assistKind;
    let generated = "";
    if (kind === "html") {
      generated = `<section class="${title.toLowerCase().replace(/[^a-z0-9]+/g, '-') }">\n  <h2>${title}</h2>\n  <p>${body}</p>\n` + (assistOptions.includeButton ? `  <a class="btn" href="#">Action</a>\n` : "") + `</section>\n`;
    } else if (kind === "css") {
      generated = `.${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} {\n  padding: 16px;\n  border-radius: 8px;\n  background: linear-gradient(90deg,#fff,#f3f4f6);\n}\n`;
      if (assistOptions.responsive) generated += `@media(max-width:768px){ .${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')} { padding:12px } }\n`;
    } else if (kind === "js") {
      generated = `const el = document.querySelector('.${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}');\nif (el) el.innerHTML = \`<h2>${title}</h2><p>${body}</p>\`;\n`;
    } else {
      generated = `<!doctype html>\n<html>\n<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>\n<body>\n<section>\n  <h2>${title}</h2>\n  <p>${body}</p>\n</section>\n</body>\n</html>\n`;
    }
    const normalized = normalizeSnippetForBeginners(generated, kind);
    const s: Snip = { id: uid(), label: `${kind.toUpperCase()}: ${title}`, snippet: normalized, kind, description: "Generated by Smart Assistant" };
    setAssistResult(s);
  }

  function openFullResult(s: Snip) {
    const w = window.open("", "_blank"); if (!w) return;
    if (s.kind === "html" || s.kind === "all") {
      const doc = s.snippet.trim().startsWith("<!doctype") ? s.snippet : `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${s.snippet}</body></html>`;
      w.document.open(); w.document.write(doc); w.document.close();
    } else {
      const safe = s.snippet.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      const htmlDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Snippet</title><style>body{font-family:system-ui,ui-sans-serif;background:#0b1220;color:#e6eef6;padding:20px}pre{white-space:pre-wrap;word-wrap:break-word;background:#020202;padding:14px;border-radius:8px;border:1px solid #111;}</style></head><body><h3>${s.label}</h3><pre>${safe}</pre></body></html>`;
      w.document.open(); w.document.write(htmlDoc); w.document.close();
    }
  }

  /* Autosave initial snapshot */
  useEffect(() => {
    pushHistorySnapshot({ html: latestRef.current.html, css: latestRef.current.css, js: latestRef.current.js }, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----------------- Render UI ----------------- */
  const textareaBaseStyle: React.CSSProperties = {
    backgroundColor: "#020202",
    color: "#e6eef6",
    borderRadius: 12,
    border: "1px solid #111",
    padding: 20,
    width: "100%",
    resize: "vertical",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, 'Roboto Mono', 'Segoe UI Mono', monospace",
    fontSize: 15,
    lineHeight: 1.6,
    outline: "none",
    flex: 1,
    height: "100%",
    minHeight: minTextareaHeight,
    boxSizing: "border-box",
    maxHeight: "100vh",
  };

  const filtered = getFilteredSnippets();
  const tabClass = (t: TabKey) => `tab-btn ${activeTab === t ? "active" : ""}`;

  const searchRef = useRef<HTMLInputElement | null>(null);
  useEffect(() => { if (showSnippet) { const t = setTimeout(() => searchRef.current?.focus(), 120); return () => clearTimeout(t); } }, [showSnippet]);

  return (
    <div className="h-full flex flex-col min-h-0 editor-tabs">
      {/* toolbar */}
      <div className="flex items-center justify-between gap-2 px-3 py-2 border-b border-gray-200/6 panel-header" style={{ backgroundColor: "transparent" }}>
        <div className="flex items-center gap-3">
          <div className="editor-dots" aria-hidden>
            <span className="dot red" />
            <span className="dot yellow" />
            <span className="dot green" />
          </div>

          <nav className="flex items-center gap-1" aria-label="Editor tabs">
            <button type="button" className={tabClass("html")} onClick={() => setActiveTab("html")} title="HTML tab">
              <span className="dot-indicator html" /> HTML
            </button>
            <button type="button" className={tabClass("css")} onClick={() => setActiveTab("css")} title="CSS tab">
              <span className="dot-indicator css" /> CSS
            </button>
            <button type="button" className={tabClass("js")} onClick={() => setActiveTab("js")} title="JS tab">
              <span className="dot-indicator js" /> JS
            </button>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <button type="button" className="btn-small" onClick={() => { setShowSnippet(s => !s); setShowDocs(false); }} title="Open Smart Assistant (Ctrl/Cmd+K)" aria-expanded={showSnippet} aria-controls="snippet-panel">
            <PlusIcon className="w-4 h-4" /> <span className="hidden md:inline ml-1">Insert</span>
            <ChevronDownIcon className="w-3 h-3 ml-1 text-gray-400" />
          </button>

          <button type="button" className="btn-small" onClick={() => { setShowDocs(d => !d); setShowSnippet(false); }} title="Open quick docs (Ctrl/Cmd + /)">Docs</button>

          <div className="pill small-assist hidden sm:flex items-center gap-2 px-2 py-0.5">
            <SparklesIcon className="w-4 h-4" />
            <div className="flex items-baseline gap-2">
              <span className="text-xs">Smart Assistant</span>
              <span className="text-[10px] text-gray-400 ml-1">({navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}+K)</span>
            </div>
          </div>
        </div>
      </div>

      {/* editor area */}
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
        <div className="editor-content flex-1 min-h-0 relative" style={{ display: "flex", flexDirection: "column", alignItems: "stretch", justifyContent: "flex-start", minHeight: 0 }}>
          <AnimatePresence mode="wait">
            {activeTab === "html" && (
              <motion.textarea
                key="html"
                ref={htmlRef}
                value={html}
                onChange={(e) => {
                  setHtml(e.target.value);
                  latestRef.current.html = e.target.value;
                  if (!isComposing.current) scheduleChangeAndValidate("html");
                }}
                onBlur={() => { flushOnChange(true); scheduleValidation("html"); }}
                onCompositionStart={onCompositionStart}
                onCompositionEnd={onCompositionEnd}
                placeholder="Write your HTML here..."
                spellCheck={false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={textareaBaseStyle}
                aria-label="HTML editor"
              />
            )}

            {activeTab === "css" && (
              <motion.textarea
                key="css"
                ref={cssRef}
                value={css}
                onChange={(e) => {
                  setCss(e.target.value);
                  latestRef.current.css = e.target.value;
                  if (!isComposing.current) scheduleChangeAndValidate("css");
                }}
                onBlur={() => { flushOnChange(true); scheduleValidation("css"); }}
                onCompositionStart={onCompositionStart}
                onCompositionEnd={onCompositionEnd}
                placeholder="Write your CSS here..."
                spellCheck={false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={textareaBaseStyle}
                aria-label="CSS editor"
              />
            )}

            {activeTab === "js" && (
              <motion.textarea
                key="js"
                ref={jsRef}
                value={js}
                onChange={(e) => {
                  setJs(e.target.value);
                  latestRef.current.js = e.target.value;
                  if (!isComposing.current) scheduleChangeAndValidate("js");
                }}
                onBlur={() => { flushOnChange(true); scheduleValidation("js"); }}
                onCompositionStart={onCompositionStart}
                onCompositionEnd={onCompositionEnd}
                placeholder="Write your JavaScript here..."
                spellCheck={false}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={textareaBaseStyle}
                aria-label="JavaScript editor"
              />
            )}
          </AnimatePresence>

          {/* Inline error panel (absolute so it doesn't add whitespace). Sits near the bottom of the textarea area */}
          <div style={{
            position: "absolute",
            left: 12,
            right: 12,
            bottom: 12,
            zIndex: 40,
            pointerEvents: "auto",
            maxHeight: "28vh",
            overflow: "auto",
          }}>
            {errors.length > 0 && (
              <div style={{
                background: "linear-gradient(180deg, rgba(11,18,32,0.9), rgba(11,18,32,0.86))",
                color: "#fff",
                borderRadius: 10,
                padding: "8px 10px",
                boxShadow: "0 6px 24px rgba(0,0,0,0.45)",
                fontSize: 13,
                lineHeight: 1.3,
              }}>
                {errors.map((err, i) => (
                  <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: i < errors.length - 1 ? 8 : 0 }}>
                    <div style={{ fontWeight: 800, minWidth: 60 }}>{err.level.toUpperCase()}</div>
                    <div style={{ opacity: 0.95 }}>
                      <div style={{ fontWeight: 700 }}>{err.source ?? "Editor"}</div>
                      <div style={{ marginTop: 2 }}>{err.message}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Docs panel */}
      <AnimatePresence>
        {showDocs && (
          <motion.div id="docs-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="snippet-panel" style={{ zIndex: 70, maxWidth: 980 }} role="dialog" aria-label="Editor quick docs">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ padding: 12 }}>
                <strong>Quick Docs</strong>
                <div style={{ color: "var(--muted)", fontSize: 13 }}>Short guide to using the editor & snippets</div>
              </div>
              <div style={{ padding: 12 }}>
                <button type="button" className="btn-small" onClick={() => setShowDocs(false)}>Close</button>
              </div>
            </div>

            <div style={{ borderTop: "1px solid rgba(11,18,32,0.06)" }}>
              <div style={{ padding: 14, maxWidth: 880 }}>
                <h3 style={{ marginTop: 0 }}>Smart Assistant — Quick start & best practices</h3>
                <p style={{ margin: "6px 0", color: "var(--muted)" }}>The Smart Assistant bundles snippets, presets and a generator to make beginners 10x more productive. Use it to scaffold UI, common JS helpers, and quick CSS utilities.</p>
                <h4 style={{ marginBottom: 6 }}>Actionable workflow</h4>
                <ol style={{ paddingLeft: 18, marginTop: 6 }}>
                  <li><strong>Pick a tab</strong> — Alt+1 / Alt+2 / Alt+3 switch to HTML/CSS/JS fast.</li>
                  <li><strong>Open Assistant</strong> — Ctrl/Cmd+K or click <em>Insert</em>. Type keywords like "hero", "grid", "fetch".</li>
                  <li><strong>Use Presets</strong> — Presets contain ready-to-drop patterns. Insert once, then tweak.</li>
                  <li><strong>Fill-in Assistant</strong> — Quickly generate snippets (give it a title). Use Responsive option to include mobile styles.</li>
                  <li><strong>Multi-insert</strong> — Press Shift+Enter while panel open to insert and keep the panel open for repeating inserts.</li>
                </ol>
                <h4 style={{ marginTop: 12 }}>Shortcuts</h4>
                <ul style={{ paddingLeft: 18 }}>
                  <li><kbd>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"} + K</kbd> — Toggle Smart Snippets</li>
                  <li><kbd>Esc</kbd> — Close Smart Snippets / Docs</li>
                  <li><kbd>Alt + 1/2/3</kbd> — Switch tabs</li>
                  <li><kbd>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"} + Z</kbd> — Undo; <kbd>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"} + Shift + Z</kbd> or <kbd>{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"} + Y</kbd> — Redo</li>
                </ul>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* snippet generator + assistant */}
      <AnimatePresence>
        {showSnippet && (
          <motion.div id="snippet-panel" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.15 }} className="snippet-panel" style={{ zIndex: 60 }} role="dialog" aria-label="Smart snippets">
            <div className="snippet-top px-3 py-2 flex items-center gap-2 border-b border-gray-200/6">
              <input ref={searchRef} className="input-ghost small" placeholder={`Search snippets (${activeTab.toUpperCase()})...`} value={query} onChange={(e) => setQuery(e.target.value)} autoFocus aria-label="Search snippets" />
              <button type="button" className="btn-ghost small" onClick={() => { setQuery(""); }}>Clear</button>

              <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                <button type="button" className="btn-small" onClick={() => setAssistantOpen(a => !a)}>{assistantOpen ? "Close Assistant" : "Fill-In Assistant"}</button>
                <button type="button" className="btn-small" onClick={() => { saveFavs([]); saveRecent([]); }}>Clear All</button>
              </div>
            </div>

            <div style={{ padding: 8, paddingTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ fontSize: 12, color: "var(--muted)" }}>You are inserting into:</div>
              <div style={{ fontWeight: 700 }}>{activeTab.toUpperCase()}</div>
              <div style={{ marginLeft: "auto", color: "var(--muted)", fontSize: 12 }}>Tip: snippets prefer the tab matching their kind.</div>
            </div>

            {assistantOpen && (
              <div style={{ padding: 12, borderBottom: "1px solid rgba(11,18,32,0.06)", display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <select value={assistKind} onChange={(e) => setAssistKind(e.target.value as SnipKind)} style={{ padding: "8px 10px", borderRadius: 8 }}>
                  <option value="html">HTML</option>
                  <option value="css">CSS</option>
                  <option value="js">JS</option>
                  <option value="all">Starter</option>
                </select>

                <input value={assistTitle} onChange={(e) => setAssistTitle(e.target.value)} placeholder="Title (e.g. Hero, Card)" style={{ padding: "8px 10px", borderRadius: 8, minWidth: 180 }} />
                <input value={assistBody} onChange={(e) => setAssistBody(e.target.value)} placeholder="Short description / body" style={{ padding: "8px 10px", borderRadius: 8, minWidth: 240 }} />

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <input type="checkbox" checked={assistOptions.responsive} onChange={(e) => setAssistOptions(s => ({ ...s, responsive: e.target.checked }))} /> <span>Responsive</span>
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <input type="checkbox" checked={assistOptions.includeButton} onChange={(e) => setAssistOptions(s => ({ ...s, includeButton: e.target.checked }))} /> <span>Include CTA</span>
                  </label>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <button type="button" className="btn-small" onClick={() => runAssistantGenerate()}>Generate</button>
                  <button type="button" className="btn-small" onClick={() => { if (assistResult) { insertSnippet(assistResult.snippet, assistResult); saveFavs([assistResult, ...favs]); } }} disabled={!assistResult}>Insert</button>
                  <button type="button" className="btn-small" onClick={() => { if (assistResult) openFullResult(assistResult); }} disabled={!assistResult}>Show full result</button>
                  <button type="button" className="btn-small" onClick={() => { if (assistResult) copySnippet(assistResult); }} disabled={!assistResult}>Copy</button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, padding: 12, borderBottom: "1px solid rgba(11,18,32,0.06)", overflowX: "auto" }}>
              <div style={{ minWidth: 160 }}>
                <div style={{ fontWeight: 800 }}>Favorites</div>
                {favs.length === 0 ? <div style={{ color: "var(--muted)", marginTop: 8 }}>No favorites yet — star a snippet.</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {favs.map((f, i) => (
                      <div key={f.id || i} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontWeight: 700 }}>{f.label}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="btn-small" onClick={() => insertSnippet(f.snippet, f)}>Insert</button>
                          <button type="button" className="btn-small" onClick={() => openFullResult(f)}>Show</button>
                          <button type="button" className="btn-small" onClick={() => toggleFav(f)}>★</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ minWidth: 260 }}>
                <div style={{ fontWeight: 800 }}>Recent</div>
                {recent.length === 0 ? <div style={{ color: "var(--muted)", marginTop: 8 }}>No recent snippets.</div> : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {recent.map((r, i) => (
                      <div key={r.id || i} style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between" }}>
                        <div style={{ fontSize: 13 }}>{r.label}</div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="btn-small" onClick={() => insertSnippet(r.snippet, r)}>Insert</button>
                          <button type="button" className="btn-small" onClick={() => openFullResult(r)}>Show</button>
                          <button type="button" className="btn-small" onClick={() => toggleFav(r)}>★</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="snippet-list overflow-auto" style={{ maxHeight: "48vh", padding: 8 }}>
              {filtered.length === 0 ? (
                <div className="p-3 small-muted">No snippets found — try "header", "fetch", "flex", "debounce".</div>
              ) : (
                filtered.map((s, idx) => (
                  <div key={idx} style={{ padding: 12, marginBottom: 8, borderRadius: 10, background: "transparent", border: "1px solid rgba(11,18,32,0.04)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                      <div>
                        <div style={{ fontWeight: 800 }}>{s.label} <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 8 }}>[{s.kind.toUpperCase()}]</span></div>
                        {s.description && <div style={{ fontSize: 13, color: "var(--muted)" }}>{s.description}</div>}
                        <pre className="snippet-preview" style={{ marginTop: 8, fontSize: 12, color: "var(--muted)", whiteSpace: "pre-wrap" }}>{s.snippet.trim()}</pre>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="button" className="btn-small" onClick={() => insertSnippet(s.snippet, s)}>Insert</button>
                          <button type="button" className="btn-small" onClick={() => { openFullResult(s); }}>Show full result</button>
                        </div>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button type="button" className="btn-small" onClick={() => { toggleFav(s); }}>{favs.find(f => f.snippet === s.snippet) ? "Unstar" : "Star"}</button>
                          <button type="button" className="btn-small" onClick={() => { copySnippet(s); }}>Copy</button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
