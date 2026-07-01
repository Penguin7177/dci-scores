import { getAllDivisions } from "@/lib/dci";
import ScoresView from "./ScoresView";

// Scrape + cache the live scores server-side; re-scrape at most every 5 minutes.
export const revalidate = 300;

export default async function HomePage() {
  const divisions = await getAllDivisions();
  return <ScoresView divisions={divisions} />;
}
