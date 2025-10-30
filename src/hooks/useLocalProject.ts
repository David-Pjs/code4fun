// src/hooks/useLocalProject.ts
import { useState, useEffect } from "react";
import type { Project } from "../types/project";

const LS_KEY = "litelab:project:v2";

export function useLocalProject() {
  const [project, setProject] = useState<Project>({ html: "<!-- start -->", css: "/* css */", js: "// js" });

  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) setProject(JSON.parse(raw));
    } catch {
      // ignore
    }
  }, []);

  function save(p: Project) {
    try {
      setProject(p);
      localStorage.setItem(LS_KEY, JSON.stringify(p));
    } catch (e) {
      console.error("Failed to save project", e);
    }
  }

  function reset() {
    const starter: Project = {
      html: `<!-- Blank starter -->\n<header>\n  <h1>My Page</h1>\n</header>\n<main>\n  <p>Edit HTML, CSS, JS and hit Run</p>\n</main>`,
      css: `:root{--accent:#38bdf8}\nbody{font-family:system-ui, sans-serif;margin:0;padding:0;background:transparent;color:inherit}`,
      js: `// Starter JS\nconsole.log('LiteLab starter ready');`,
    };
    save(starter);
  }

  return { project, save, reset };
}
