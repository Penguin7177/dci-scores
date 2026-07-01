import { promises as fs } from "fs";
import path from "path";
import { scrapeAllDivisions, type Division } from "./scraper";

// Cache-first architecture: dciscores.com is scraped at most once, and the
// result is written to a local JSON file. Every page load reads this file —
// no live network call unless the cache is missing or the user explicitly
// refreshes (POST /api/scores).

export type ScoresCache = {
  divisions: Division[];
  updatedAt: string; // ISO timestamp of the last successful scrape
};

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "scores.json");

/** Read the cached scores, or `null` if no cache file exists yet. */
export async function readCache(): Promise<ScoresCache | null> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    return JSON.parse(raw) as ScoresCache;
  } catch {
    // File missing or unreadable/corrupt — treat as "no cache".
    return null;
  }
}

/** Scrape dciscores.com and overwrite the cache file. Best-effort write. */
export async function refreshScores(): Promise<ScoresCache> {
  const divisions = await scrapeAllDivisions();
  const cache: ScoresCache = { divisions, updatedAt: new Date().toISOString() };

  try {
    await fs.mkdir(CACHE_DIR, { recursive: true });
    await fs.writeFile(CACHE_FILE, JSON.stringify(cache, null, 2), "utf8");
  } catch {
    // On read-only filesystems (e.g. serverless) we can't persist — the fresh
    // data is still returned to the caller, we just won't have cached it.
  }

  return cache;
}

/**
 * Return cached scores, scraping once to populate the cache if it doesn't
 * exist yet. This is the fast path used on every page load.
 */
export async function getScores(): Promise<ScoresCache> {
  const cached = await readCache();
  if (cached) return cached;
  return refreshScores();
}
