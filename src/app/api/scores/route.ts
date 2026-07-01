import { NextResponse } from "next/server";
import { getAllDivisions } from "@/lib/dci";

// Cache the scraped result at the route level; re-scrape at most every 5 minutes.
export const revalidate = 300;

export async function GET() {
  const divisions = await getAllDivisions();
  return NextResponse.json({ divisions });
}
