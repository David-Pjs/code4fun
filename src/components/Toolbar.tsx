// src/components/Toolbar.tsx
import React, { useRef, useState } from "react";
import { PlayIcon, ArrowDownTrayIcon, ArrowUpTrayIcon, ArrowPathIcon, DocumentArrowDownIcon } from "@heroicons/react/24/solid";
import { motion, AnimatePresence } from "framer-motion";

interface ToolbarProps {
  onRun: () => void;
  onSave?: () => void;
  onReset?: () => void;
  onExportCode?: (kind: "html" | "css" | "js" | "json" | "zip") => void;
  onImportFile?: (kind: "html" | "css" | "js" | "json", file: File) => void;
  onOpenTab?: () => void;
  autoRun?: boolean;
  onToggleAutoRun?: (v: boolean) => void;
  capWidth?: boolean;
  onToggleCapWidth?: (v: boolean) => void;
  className?: string;
}

export default function Toolbar({
  onRun,
  onSave,
  onReset,
  onExportCode,
  onImportFile,
  onOpenTab,
  autoRun = false,
  onToggleAutoRun,
  capWidth = false,
  onToggleCapWidth,
  className = ""
}: ToolbarProps) {
  const [importOpen, setImportOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);

  const htmlRef = useRef<HTMLInputElement | null>(null);
  const cssRef = useRef<HTMLInputElement | null>(null);
  const jsRef = useRef<HTMLInputElement | null>(null);
  const jsonRef = useRef<HTMLInputElement | null>(null);

  function handleFile(kind: "html" | "css" | "js" | "json", ev?: React.ChangeEvent<HTMLInputElement>) {
    const file = ev?.target?.files?.[0];
    if (!file) return;
    onImportFile?.(kind, file);
    if (ev) ev.currentTarget.value = "";
    setImportOpen(false);
  }

  return (
    <header className={`w-full ${className} bg-panel/80 backdrop-blur-md border-b border-gray-800`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* left: brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-emerald-400 flex items-center justify-center shadow-md">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M3 12h18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                <path d="M6 6h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
                <path d="M6 18h8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.95"/>
              </svg>
            </div>
            <div className="leading-none">
              <div className="font-semibold text-sm md:text-base">LiteLab</div>
              <div className="text-[11px] text-gray-400 -mt-0.5">Offline sandbox</div>
            </div>
          </div>

          {/* center: optional place for breadcrumbs (left empty to match your screenshot) */}
          <div className="hidden md:flex items-center justify-center flex-1">
            {/* empty for centered spacing like your mock */}
          </div>

          {/* right: controls */}
          <div className="flex items-center gap-2">
            {/* Run */}
            <button onClick={onRun} className="flex items-center gap-2 bg-accent px-3 py-1.5 rounded-lg text-sm font-semibold shadow-sm hover:brightness-105 transition">
              <PlayIcon className="w-4 h-4 text-black" /> <span className="text-black">Run</span>
            </button>

            {/* Save */}
            {onSave && (
              <button onClick={onSave} className="flex items-center gap-2 bg-surface px-3 py-1.5 rounded-lg text-sm border border-gray-700 hover:bg-surface-2 transition">
                <DocumentArrowDownIcon className="w-4 h-4 text-gray-200" /> <span className="text-gray-200">Save</span>
              </button>
            )}

            {/* Reset */}
            {onReset && (
              <button onClick={onReset} className="flex items-center gap-2 bg-rose-900/20 px-3 py-1.5 rounded-lg text-sm border border-rose-800 text-rose-300 hover:bg-rose-900/30 transition">
                <ArrowPathIcon className="w-4 h-4 text-rose-300" /> Reset
              </button>
            )}

            {/* Import dropdown */}
            <div className="relative">
              <button onClick={() => { setImportOpen(b => !b); setExportOpen(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-gray-700 text-sm hover:bg-surface-2 transition">
                <ArrowUpTrayIcon className="w-4 h-4 text-gray-200" /> Import
              </button>
              <AnimatePresence>
                {importOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="absolute right-0 mt-2 w-48 rounded-md bg-panel border border-gray-800 shadow-lg z-40">
                    <div className="py-1">
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => htmlRef.current?.click()}>Import .html</button>
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => cssRef.current?.click()}>Import .css</button>
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => jsRef.current?.click()}>Import .js</button>
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => jsonRef.current?.click()}>Import .json</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* hidden file inputs */}
              <input ref={htmlRef} type="file" accept=".html,text/html" style={{ display: "none" }} onChange={(e) => handleFile("html", e)} />
              <input ref={cssRef} type="file" accept=".css,text/css" style={{ display: "none" }} onChange={(e) => handleFile("css", e)} />
              <input ref={jsRef} type="file" accept=".js,application/javascript" style={{ display: "none" }} onChange={(e) => handleFile("js", e)} />
              <input ref={jsonRef} type="file" accept=".json,application/json" style={{ display: "none" }} onChange={(e) => handleFile("json", e)} />
            </div>

            {/* Export dropdown */}
            <div className="relative">
              <button onClick={() => { setExportOpen(b => !b); setImportOpen(false); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-surface border border-gray-700 text-sm hover:bg-surface-2 transition">
                <ArrowDownTrayIcon className="w-4 h-4 text-gray-200" /> Export
              </button>
              <AnimatePresence>
                {exportOpen && (
                  <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.12 }} className="absolute right-0 mt-2 w-56 rounded-md bg-panel border border-gray-800 shadow-lg z-40">
                    <div className="py-1">
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => onExportCode?.("html")}>Export .html</button>
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => onExportCode?.("css")}>Export .css</button>
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => onExportCode?.("js")}>Export .js</button>
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => onExportCode?.("json")}>Export .json</button>
                      <div className="border-t border-gray-800 my-1" />
                      <button className="w-full text-left px-3 py-2 hover:bg-[#0b1220]" onClick={() => onExportCode?.("zip")}>Export ZIP (all)</button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* small toggles */}
            <div className="flex items-center gap-2 ml-2">
              <label className="inline-flex items-center gap-2 px-2 py-1 rounded text-sm bg-surface border border-gray-700">
                <input className="form-checkbox h-4 w-4" type="checkbox" checked={capWidth} onChange={(e) => onToggleCapWidth?.(e.target.checked)} />
                <span className="text-xs text-gray-300">Cap width</span>
              </label>

              <label className="inline-flex items-center gap-2 px-2 py-1 rounded text-sm bg-surface border border-gray-700">
                <input className="form-checkbox h-4 w-4" type="checkbox" checked={autoRun} onChange={(e) => onToggleAutoRun?.(e.target.checked)} />
                <span className="text-xs text-gray-300">Auto-run</span>
              </label>

              {onOpenTab && (
                <button onClick={onOpenTab} className="px-3 py-1.5 rounded-lg border border-gray-700 text-sm bg-surface hover:bg-surface-2">
                  Open Tab
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
