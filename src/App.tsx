// src/App.tsx
import { useState, useRef, useCallback, useEffect } from "react";
import JSZip from "jszip";

import EditorTabs from "./components/EditorTabs";
import PreviewFrame from "./components/PreviewFrame";
import { useLocalProject } from "./hooks/useLocalProject";
import type { Project } from "./types/project";

/* tiny helpers */
async function readFileAsText(file: File) {
  return await new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result || ""));
    r.onerror = () => rej(r.error);
    r.readAsText(file);
  });
}

export default function App(): React.JSX.Element {
  const { project, save, reset } = useLocalProject();
  const [leftWidth, setLeftWidth] = useState<number>(0.62);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  const [viewMode, setViewMode] = useState<"split" | "editor-full" | "preview-full">("split");
  const [editorOnLeft, setEditorOnLeft] = useState(true);
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== "undefined" && window.innerWidth < 768);

  /* responsive detection */
  useEffect(() => {
    function onResize() {
      setIsMobile(window.innerWidth < 768);
    }
    window.addEventListener("resize", onResize);
    onResize();
    return () => window.removeEventListener("resize", onResize);
  }, []);

  /* drag resizer handlers */
  const onPointerDown = (e: React.PointerEvent) => {
    draggingRef.current = true;
    try { (e.target as Element).setPointerCapture(e.pointerId); } catch {}
  };
  const onPointerMove = useCallback((e: PointerEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    let x = e.clientX - rect.left;
    x = Math.max(120, Math.min(rect.width - 160, x));
    setLeftWidth(x / rect.width);
  }, []);
  const onPointerUp = useCallback(() => { draggingRef.current = false; }, []);
  useEffect(() => {
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
    };
  }, [onPointerMove, onPointerUp]);

  /* Import / Export refs & handlers */
  const htmlInputRef = useRef<HTMLInputElement | null>(null);
  const cssInputRef = useRef<HTMLInputElement | null>(null);
  const jsInputRef = useRef<HTMLInputElement | null>(null);
  const jsonInputRef = useRef<HTMLInputElement | null>(null);

  async function importHtmlFileLocal(file: File) {
    try {
      const txt = await readFileAsText(file);
      // extract inline <style> and <script> if present, otherwise put body
      const cssMatch = txt.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
      const jsMatch = txt.match(/<script[^>]*>([\s\S]*?)<\/script>/i);
      const bodyMatch = txt.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
      const html = bodyMatch ? bodyMatch[1].trim() : txt;
      const css = cssMatch ? cssMatch[1] : (project?.css || "");
      const js = jsMatch ? jsMatch[1] : (project?.js || "");
      save({ html, css, js });
      alert("HTML imported (inline <style>/<script> extracted if present).");
    } catch (e) { console.error(e); alert("Failed to import HTML."); }
  }
  async function importCssFileLocal(file: File) {
    try {
      const txt = await readFileAsText(file);
      save({ ...(project || { html: "", css: "", js: "" }), css: txt });
      alert("CSS imported.");
    } catch (e) { console.error(e); alert("Failed to import CSS."); }
  }
  async function importJsFileLocal(file: File) {
    try {
      const txt = await readFileAsText(file);
      save({ ...(project || { html: "", css: "", js: "" }), js: txt });
      alert("JS imported.");
    } catch (e) { console.error(e); alert("Failed to import JS."); }
  }
  async function importJsonFileLocal(file: File) {
    try {
      const txt = await readFileAsText(file);
      const parsed = JSON.parse(txt);
      if (parsed && parsed.code) save(parsed.code);
      else if (parsed && (parsed.html || parsed.css || parsed.js)) save({ html: parsed.html || "", css: parsed.css || "", js: parsed.js || "" });
      else throw new Error("Invalid JSON shape");
      alert("Project JSON imported.");
    } catch (e) { console.error(e); alert("Failed to import JSON."); }
  }

  function onHtmlFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) importHtmlFileLocal(f); e.currentTarget.value = ""; }
  function onCssFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) importCssFileLocal(f); e.currentTarget.value = ""; }
  function onJsFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) importJsFileLocal(f); e.currentTarget.value = ""; }
  function onJsonFile(e: React.ChangeEvent<HTMLInputElement>) { const f = e.target.files?.[0]; if (f) importJsonFileLocal(f); e.currentTarget.value = ""; }

  async function exportZip() {
    try {
      const p = project || { html: "", css: "", js: "" };
      const zip = new JSZip();
      zip.file("index.html", p.html || "");
      zip.file("styles.css", p.css || "");
      zip.file("app.js", p.js || "");
      const blob = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "project-source.zip";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch (e) {
      console.error(e);
      alert("Failed to export ZIP.");
    }
  }

  /* Editor / Preview renderers */
  const renderEditor = (
    <div className="editor-area flex-1 min-h-0 flex flex-col overflow-hidden">
      {/* Ensure EditorTabs internally can scroll; if not, EditorTabs should have overflow-auto for its code panes */}
      <div className="h-full min-h-0 overflow-auto">
        <EditorTabs project={project} onChange={(p: Project) => save(p)} />
      </div>
    </div>
  );

  const renderPreview = (
    <div className="flex-1 min-h-0 flex flex-col rounded-r-xl overflow-hidden border border-gray-200 bg-[color:var(--bg-2)]">
      <div className="h-full min-h-0 overflow-auto">
        <PreviewFrame project={project} />
      </div>
    </div>
  );

  /* button style classes (cooler styles).
     Make padding responsive so buttons are touch-friendly on phones. */
  const btnBase = "rounded-md text-sm font-semibold shadow-[0_8px_28px_rgba(0,0,0,0.12)] transform-gpu transition focus:outline-none";
  const btnSelected = "bg-white text-[var(--text)] hover:bg-[color:var(--bg-2)] hover:scale-[1.02] px-3 py-2";
  const btnUnselected = "bg-white text-[var(--text)] px-3 py-2";
  const btnDark = "bg-black text-white rounded-md text-sm font-semibold shadow-md px-3 py-2 hover:scale-105 transform transition";

  /* mobile menu state */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ---------------------------
     NEW: "Open in Browser" action
     This opens a new tab with a full-page, runnable version of the project immediately.
     --------------------------- */
  function openInBrowserFull() {
    const p = project || { html: "", css: "", js: "" };
    try {
      const fullDoc = `<!doctype html><html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>Preview - Full</title>
<style>${p.css || ""}</style>
</head><body>
${p.html || ""}
<script>
try {
${p.js || ""}
} catch(e) { console.error(e); }
document.querySelectorAll('a[href="#"]').forEach(a=>a.addEventListener('click', e=>e.preventDefault()));
</script>
</body></html>`;
      const w = window.open("", "_blank");
      if (!w) {
        alert("Popup blocked. Allow popups or try again.");
        return;
      }
      w.document.open();
      w.document.write(fullDoc);
      w.document.close();
    } catch (e) {
      console.error(e);
      alert("Failed to open preview in browser.");
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[color:var(--bg-1)] text-[var(--text)]">
      {/* NAVBAR - refined using Tailwind utilities */}
      <nav className="w-full bg-black/95 sticky top-0 z-50 border-b border-black/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12 md:h-14 gap-4">
            {/* left: logo + brand */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 md:w-11 md:h-11 rounded-lg flex items-center justify-center bg-gradient-to-b from-white/3 to-transparent ring-1 ring-white/5 shadow-xl"
                aria-hidden
              >
                <span className="text-white font-mono font-semibold text-lg select-none">&lt;/&gt;</span>
              </div>

              <div className="leading-tight">
                <div className="font-semibold text-white tracking-wide text-sm">code4fun</div>
                <div className="text-[10px] md:text-xs text-white/60 -mt-0.5">Sandbox</div>
              </div>
            </div>

            {/* desktop controls - finer spacing and compact grouping */}
            <div className="hidden md:flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button onClick={() => htmlInputRef.current?.click()} className={btnDark} title="Import HTML">Import HTML</button>
                <button onClick={() => cssInputRef.current?.click()} className={btnDark} title="Import CSS">Import CSS</button>
                <button onClick={() => jsInputRef.current?.click()} className={btnDark} title="Import JS">Import JS</button>
                <button onClick={() => jsonInputRef.current?.click()} className={btnDark} title="Import Project JSON">Import JSON</button>
                <button onClick={() => exportZip()} className={btnDark} title="Export ZIP">Export ZIP</button>
              </div>

              <div>
                <button
                  onClick={() => openInBrowserFull()}
                  className="px-3 py-2 rounded-md bg-white text-[var(--text)] shadow-md hover:bg-[color:var(--bg-2)] transition"
                  title="Open in full browser"
                >
                  Open in Browser
                </button>
              </div>
            </div>

            {/* mobile icon (hamburger) */}
            <div className="md:hidden flex items-center gap-2">
              <button
                aria-label="menu"
                onClick={() => setMobileMenuOpen(s => !s)}
                className="p-2 rounded-lg bg-black text-white shadow-lg ring-1 ring-white/6"
                title="Menu"
              >
                <svg width="18" height="12" viewBox="0 0 18 12" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                  <rect width="18" height="2" rx="1" fill="white" />
                  <rect y="5" width="18" height="2" rx="1" fill="white" />
                  <rect y="10" width="18" height="2" rx="1" fill="white" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* mobile menu panel - improved Tailwind layout */}
        {mobileMenuOpen && (
          <div className="md:hidden px-4 pb-4">
            <div className="mt-3 space-y-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setViewMode("split"); setMobileMenuOpen(false); }}
                  className={`flex-1 bg-black text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-md ${viewMode === "split" ? "ring-2 ring-white/10" : ""}`}
                >
                  Split
                </button>
                <button
                  onClick={() => { setViewMode("editor-full"); setMobileMenuOpen(false); }}
                  className={`flex-1 bg-black text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-md ${viewMode === "editor-full" ? "ring-2 ring-white/10" : ""}`}
                >
                  Terminal
                </button>
                <button
                  onClick={() => { setViewMode("preview-full"); setMobileMenuOpen(false); }}
                  className={`flex-1 bg-black text-white px-3 py-2 rounded-lg text-sm font-semibold shadow-md ${viewMode === "preview-full" ? "ring-2 ring-white/10" : ""}`}
                >
                  Preview
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => { setEditorOnLeft((s)=>!s); setMobileMenuOpen(false); }} className="flex-1 px-3 py-2 rounded-lg bg-black text-white font-semibold shadow-md">Swap</button>
                <button onClick={() => { reset(); setMobileMenuOpen(false); }} className="flex-1 px-3 py-2 rounded-lg bg-black text-white font-semibold shadow-md">Reset</button>
              </div>

              <div className="flex flex-col gap-2">
                <button onClick={() => { htmlInputRef.current?.click(); setMobileMenuOpen(false); }} className="w-full px-3 py-3 rounded-lg bg-black text-white font-semibold shadow-md">Import HTML</button>

                <button
                  onClick={() => { cssInputRef.current?.click(); setMobileMenuOpen(false); }}
                  className="w-full px-3 py-3 rounded-lg bg-black text-white font-semibold shadow-md flex items-center justify-center gap-3"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden className="opacity-90">
                    <path d="M7 2h10a2 2 0 012 2v16a2 2 0 01-2 2H7a2 2 0 01-2-2V4a2 2 0 012-2z" fill="currentColor" opacity="0.12"/>
                    <rect x="9" y="4" width="6" height="12" rx="1" fill="currentColor" />
                    <circle cx="12" cy="18" r="1" fill="currentColor" opacity="0.9" />
                  </svg>
                  Import CSS (phone)
                </button>

                <button onClick={() => { jsInputRef.current?.click(); setMobileMenuOpen(false); }} className="w-full px-3 py-3 rounded-lg bg-black text-white font-semibold shadow-md">Import JS</button>
                <button onClick={() => { jsonInputRef.current?.click(); setMobileMenuOpen(false); }} className="w-full px-3 py-3 rounded-lg bg-black text-white font-semibold shadow-md">Import JSON</button>

                {/* mobile: "Open in Browser" */}
                <button onClick={() => { openInBrowserFull(); setMobileMenuOpen(false); }} className="w-full px-3 py-3 rounded-lg bg-white text-[var(--text)] font-semibold shadow-md hover:bg-[color:var(--bg-2)]">Open in Browser</button>

                <button onClick={() => { exportZip(); setMobileMenuOpen(false); }} className="w-full px-3 py-3 rounded-lg bg-black text-white font-semibold shadow-md">Export ZIP</button>
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* spacer equal to nav height so sticky nav doesn't cover page content when scrolling */}
      <div className="h-12 md:h-14" aria-hidden />

      {/* hidden file inputs */}
      <input ref={htmlInputRef} type="file" accept=".html,text/html" style={{ display: "none" }} onChange={onHtmlFile} />
      <input ref={cssInputRef} type="file" accept=".css,text/css" style={{ display: "none" }} onChange={onCssFile} />
      <input ref={jsInputRef} type="file" accept=".js,application/javascript" style={{ display: "none" }} onChange={onJsFile} />
      <input ref={jsonInputRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={onJsonFile} />

      {/* hero + view controls */}
      <header className="px-4 sm:px-6 lg:px-8 py-5 md:py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="mb-2 md:mb-0">
            <h1 className="text-xl md:text-3xl font-extrabold text-[var(--text)] leading-tight">Build, run & learn, a sandbox for students</h1>
            <p className="mt-2 text-sm md:text-base text-gray-700 max-w-xl">Learn by doing search help, package lessons, and share projects without leaving the editor. Your workspace is private to your device.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 p-1 rounded-md bg-[color:var(--bg-2)] border border-gray-200">
              <button
                onClick={() => setViewMode("split")}
                className={`${btnBase} ${viewMode === "split" ? btnSelected : btnUnselected}`}
                aria-pressed={viewMode === "split"}
              >
                Split
              </button>
              <button
                onClick={() => setViewMode("editor-full")}
                className={`${btnBase} ${viewMode === "editor-full" ? btnSelected : btnUnselected}`}
                aria-pressed={viewMode === "editor-full"}
              >
                Terminal
              </button>
              <button
                onClick={() => setViewMode("preview-full")}
                className={`${btnBase} ${viewMode === "preview-full" ? btnSelected : btnUnselected}`}
                aria-pressed={viewMode === "preview-full"}
              >
                Preview
              </button>
            </div>

            <button
              onClick={() => setEditorOnLeft((s) => !s)}
              className={`px-3 py-2 rounded-md bg-white border text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-white/10`}
            >
              Swap
            </button>

            <button
              onClick={() => reset()}
              className={`px-3 py-2 rounded-md bg-white border text-[var(--text)] focus:outline-none focus:ring-2 focus:ring-white/10`}
            >
              Reset
            </button>
          </div>
        </div>
      </header>

      {/* main workspace */}
      <main className="flex-1 overflow-hidden px-3 sm:px-6 lg:px-8 pb-6">
        <div className="max-w-7xl mx-auto h-full flex gap-4">
          <div
            ref={containerRef}
            className={`flex-1 h-full ${isMobile ? "flex-col" : "flex-row"} flex rounded-md`}
            style={{ minHeight: isMobile ? "60vh" : 520 }}
          >
            {viewMode === "editor-full"
              ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-[color:var(--bg-2)]">
                    {renderEditor}
                  </div>
                </div>
              )
              : viewMode === "preview-full"
              ? (
                <div className="flex-1 min-h-0 flex flex-col">
                  <div className="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-[color:var(--bg-2)]">
                    {renderPreview}
                  </div>
                </div>
              )
              : editorOnLeft
              ? (
                <>
                  <div
                    className="flex flex-col min-h-0"
                    style={{
                      width: isMobile ? "100%" : `${Math.round(leftWidth * 10000) / 100}%`,
                      minWidth: isMobile ? 0 : 260,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div className="flex-1 min-h-0 overflow-hidden rounded-l-xl border border-r-0 border-gray-200 bg-[color:var(--bg-2)]" style={{ display: "flex", flexDirection: "column" }}>
                      {renderEditor}
                    </div>
                  </div>

                  {/* separator only available on lg+ so mobile won't show an awkward handle */}
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onPointerDown={onPointerDown}
                    className="hidden lg:flex items-stretch justify-center cursor-col-resize select-none"
                    style={{ width: 12 }}
                  >
                    <div className="w-1 bg-gray-300/40 rounded-full mx-auto my-4" />
                  </div>

                  <div className="flex-1 min-h-0 flex flex-col rounded-r-xl">
                    <div className="flex-1 min-h-0 rounded-r-xl overflow-hidden border border-gray-200 bg-[color:var(--bg-2)]">
                      {renderPreview}
                    </div>
                  </div>
                </>
              )
              : (
                <>
                  <div className="flex-1 min-h-0 flex flex-col rounded-l-xl">
                    <div className="flex-1 min-h-0 rounded-l-xl overflow-hidden border border-gray-200 bg-[color:var(--bg-2)]">
                      {renderPreview}
                    </div>
                  </div>

                  <div
                    role="separator"
                    aria-orientation="vertical"
                    onPointerDown={onPointerDown}
                    className="hidden lg:flex items-stretch justify-center cursor-col-resize select-none"
                    style={{ width: 12 }}
                  >
                    <div className="w-1 bg-gray-300/40 rounded-full mx-auto my-4" />
                  </div>

                  <div
                    className="flex flex-col min-h-0"
                    style={{
                      width: isMobile ? "100%" : `${Math.round(leftWidth * 10000) / 100}%`,
                      minWidth: isMobile ? 0 : 260,
                      display: "flex",
                      flexDirection: "column",
                    }}
                  >
                    <div className="flex-1 min-h-0 overflow-hidden rounded-r-xl border border-l-0 border-gray-200 bg-[color:var(--bg-2)]" style={{ display: "flex", flexDirection: "column" }}>
                      {renderEditor}
                    </div>
                  </div>
                </>
              )}
          </div>
        </div>
      </main>

      <footer className="py-4 border-t border-gray-200 text-center text-sm text-gray-500">
        © {new Date().getFullYear()} code4fun keep learning visually devs
      </footer>
    </div>
  );
}
