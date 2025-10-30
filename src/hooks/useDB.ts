// src/hooks/useDB.ts
import { openDB } from "idb";
import type { DBSchema } from "idb";

/**
 * Minimal IDB schema for LiteLab
 */
interface LiteLabDB extends DBSchema {
  searchCache: {
    key: string; // the search query
    value: { query: string; timestamp: number; items: any[] };
  };
  lessons: {
    key: string; // lesson id
    value: { id: string; createdAt: number; title: string; items: any[]; attribution?: any };
  };
}

const DB_NAME = "litelab-db";
const DB_VERSION = 1;

const dbPromise = openDB<LiteLabDB>(DB_NAME, DB_VERSION, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("searchCache")) {
      db.createObjectStore("searchCache", { keyPath: "query" });
    }
    if (!db.objectStoreNames.contains("lessons")) {
      db.createObjectStore("lessons", { keyPath: "id" });
    }
  },
});

export async function getCachedSearch(query: string) {
  const db = await dbPromise;
  return db.get("searchCache", query);
}

export async function setCachedSearch(query: string, items: any[]) {
  const db = await dbPromise;
  return db.put("searchCache", { query, items, timestamp: Date.now() });
}

export async function saveLesson(obj: { id: string; title: string; items: any[]; attribution?: any }) {
  const db = await dbPromise;
  return db.put("lessons", { id: obj.id, createdAt: Date.now(), title: obj.title, items: obj.items, attribution: obj.attribution });
}

export async function listLessons() {
  const db = await dbPromise;
  return db.getAll("lessons");
}
