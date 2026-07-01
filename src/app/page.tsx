import { getScores } from "@/lib/cache";
import ScoresView from "./ScoresView";

// Read the cached scores file directly on the server. If the cache doesn't
// exist yet, `getScores` scrapes dciscores.com once to populate it. Because we
// read from disk (and may scrape), this page renders at request time.
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const { divisions, updatedAt } = await getScores();
  return <ScoresView divisions={divisions} updatedAt={updatedAt} />;
}
