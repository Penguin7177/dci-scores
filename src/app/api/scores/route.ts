import { NextResponse } from "next/server";
import { getScores, refreshScores } from "@/lib/cache";

// This route reads/writes a local file cache, so it must run at request time
// rather than being prerendered/cached at build.
export const dynamic = "force-dynamic";

// GET: return the cached scores (scraping once to populate if the cache is
// empty). Fast — no live call to dciscores.com on the common path.
export async function GET() {
  const cache = await getScores();
  return NextResponse.json(cache);
}

// POST: force a re-scrape from dciscores.com and update the cache file. This is
// what the "Refresh Scores" button triggers.
export async function POST() {
  const cache = await refreshScores();
  return NextResponse.json(cache);
}
