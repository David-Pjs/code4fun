// src/components/SearchPanel.tsx
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import JSZip from "jszip";

import { searchQuestions, getQuestionWithAnswers } from "../lib/stackapi"; // runtime functions
import type { SEQuestion } from "../lib/stackapi"; // <-- type-only import

import { getCachedSearch, setCachedSearch, saveLesson } from "../hooks/useDB";

function shortTime(ts: number) {
  return new Date(ts * 1000).toLocaleDateString();
}

export default function SearchPanel() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SEQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<SEQuestion | null>(null);
  const [page, setPage] = useState(1);
  const [cacheHit, setCacheHit] = useState(false);

  // cross-platform-safe timeout ref
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, []);

  async function doSearch(query: string) {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    // check cache
    try {
      const cached = await getCachedSearch(query);
      if (cached && Date.now() - cached.timestamp < 1000 * 60 * 60 * 24 * 7) {
        setResults(cached.items);
        setCacheHit(true);
        setLoading(false);
        return;
      }

      const data = await searchQuestions(query, 1, 10);
      setResults(data.items || []);
      setCacheHit(false);
      await setCachedSearch(query, data.items || []);
    } catch (e) {
      console.error("Search failed:", e);
    } finally {
      setLoading(false);
    }
  }

  function onChange(v: string) {
    setQ(v);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    debounceRef.current = setTimeout(() => {
      doSearch(v);
    }, 500);
  }

  async function openDetail(item: SEQuestion) {
    setLoading(true);
    try {
      const payload = await getQuestionWithAnswers(item.question_id);
      const pkg = { question: payload.question, answers: payload.answers };
      setPicked(pkg.question as any);
    } catch (e) {
      console.error("Failed to load question details", e);
    } finally {
      setLoading(false);
    }
  }

  async function exportLesson() {
    if (!picked) return alert("Open a question first to package as a lesson.");
    const lesson = {
      id: `lesson-${picked.question_id}-${Date.now()}`,
      title: picked.title,
      items: [{ question: picked }],
      attribution: {
        source: "Stack Overflow / Stack Exchange API",
        license: "CC BY-SA 4.0",
        link: picked.link,
      },
      createdAt: Date.now(),
    };
    await saveLesson(lesson);
    const blob = new Blob([JSON.stringify(lesson, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `${lesson.id}.litelab-lesson.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function exportZip() {
    if (!picked) return alert("Open a question first");
    const zip = new JSZip();
    zip.file("lesson.json", JSON.stringify({ id: picked.question_id, title: picked.title, link: picked.link }, null, 2));
    const content = picked.body || `<p>No body available</p>`;
    zip.file("question.html", content);
    const blob = await zip.generateAsync({ type: "blob" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `lesson-${picked.question_id}.zip`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <aside className="w-full md:w-96 p-3 panel">
      <div className="flex items-center gap-2 mb-2">
        <input
          value={q}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search StackOverflow (e.g. 'flex center div')"
          className="flex-1 px-3 py-2 rounded-md bg-[#07101a] border border-gray-700 text-sm"
        />
        <button onClick={() => doSearch(q)} className="px-3 py-2 rounded-md bg-accent text-white text-sm">
          Search
        </button>
      </div>

      <div className="text-xs text-gray-400 mb-2">{loading ? "Searching..." : cacheHit ? "Showing cached results" : "Live results"}</div>

      <div className="space-y-2 max-h-[48vh] overflow-auto">
        {results.length === 0 && !loading && <div className="text-sm text-gray-500">No results</div>}
        {results.map((r) => (
          <motion.button
            key={r.question_id}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.995 }}
            className="w-full text-left rounded-md p-2 bg-gradient-to-r from-[#07101a] to-[#081226] border border-gray-800"
            onClick={() => openDetail(r)}
          >
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-semibold text-sm">{r.title}</div>
                <div
                  className="text-xs text-gray-400 mt-1 line-clamp-2"
                  // strip tags for preview to avoid injecting HTML here
                  dangerouslySetInnerHTML={{ __html: (r.body || "")?.replace(/<[^>]+>/g, "").slice(0, 140) || "" }}
                />
                <div className="text-[11px] text-gray-500 mt-1">
                  {r.tags?.slice(0, 3).map((t) => (
                    <span key={t} className="mr-2 px-2 py-0.5 bg-[#0b1220] rounded text-xs">
                      {t}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-right text-xs">
                <div className="text-sm font-medium">{r.score} pts</div>
                <div className="text-gray-500">{shortTime(r.creation_date)}</div>
              </div>
            </div>
            <div className="text-xs text-gray-400 mt-2">Open →</div>
          </motion.button>
        ))}
      </div>

      <div className="mt-3 flex gap-2">
        <button onClick={exportLesson} className="flex-1 py-2 rounded-md bg-accent text-white text-sm">
          Save as Lesson
        </button>
        <button onClick={exportZip} className="py-2 px-3 rounded-md border border-gray-700 text-sm">
          Export ZIP
        </button>
      </div>

      {picked && (
        <div className="mt-3 text-xs text-gray-400">
          <div className="font-semibold">Packaged:</div>
          <div className="mt-1">{picked.title}</div>
          <a href={picked.link} target="_blank" rel="noreferrer" className="text-accent text-sm">
            Open on StackOverflow
          </a>
        </div>
      )}
    </aside>
  );
}
