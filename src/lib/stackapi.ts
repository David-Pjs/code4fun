// src/lib/stackapi.ts
export interface SEQuestion {
  question_id: number;
  title: string;
  link: string;
  is_answered: boolean;
  score: number;
  creation_date: number;
  tags: string[];
  owner?: { display_name?: string; link?: string; user_id?: number };
  body?: string; // HTML if requested
}

const BASE = "https://api.stackexchange.com/2.3";

async function fetchStack(path: string, params: Record<string,string|number|boolean> = {}) {
  const url = new URL(`${BASE}/${path}`);
  params["site"] = "stackoverflow";
  params["filter"] = params["filter"] || "default";
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, String(v)));
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Stack API ${res.status}`);
  return res.json();
}

/**
 * Search questions (title/body) with advanced search
 * returns items[]
 */
export async function searchQuestions(q: string, page=1, pagesize=10) {
  if (!q || !q.trim()) return { items: [], has_more:false };
  const data = await fetchStack("search/advanced", { q, page, pagesize, order: "desc", sort: "relevance", filter: "!-*f(6rc.lF)" });
  // filter chosen returns main fields but not body; we do separate call for body if needed
  return data as { items: SEQuestion[]; has_more: boolean; quota_remaining?: number };
}

/**
 * Get full question (with body + accepted answer) — use filter to include answers and body
 */
export async function getQuestionWithAnswers(question_id: number) {
  // include answers and body with an inclusive filter
  // using filter=withbody is simple; use a custom filter for production
  const data = await fetchStack(`questions/${question_id}`, { filter: "withbody", page:1, pagesize:1, order:"desc" });
  // Next fetch answers
  const answers = await fetchStack(`questions/${question_id}/answers`, { filter: "withbody", page:1, pagesize:10, order:"desc", sort:"votes" });
  return { question: data.items?.[0] as SEQuestion, answers: answers.items as SEQuestion[] };
}
