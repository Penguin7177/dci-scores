import * as cheerio from "cheerio";

// Live scores are scraped from dciscores.com. The score data is embedded in the
// page HTML (there is no JSON API): each division page renders a grid of date
// columns, and every corps in a column carries a Bootstrap popover with its
// name (`title`) and a `data-content` string like:
//   "Rank: 1<br>(75.650)&nbsp;<span class='positive_delta'>1.600</span>"
// The parenthesized number is the score for that date; the span is the delta.

export type Corps = {
  name: string;
  shortName: string;
  color: string;
  scores: Record<string, number>; // date string -> score
};

export type Division = {
  label: string;
  slug: string;
  year: number;
  dates: string[];
  corps: Corps[];
};

type DivisionConfig = {
  label: string;
  slug: string; // slug used by the frontend (matches the old hardcoded data)
  path: string; // path segment on dciscores.com
};

const DIVISION_CONFIGS: DivisionConfig[] = [
  { label: "World Class", slug: "world", path: "world-class" },
  { label: "Open Class", slug: "open", path: "open-class" },
  { label: "All-Age", slug: "allage", path: "all-age" },
];

// dciscores.com doesn't expose corps colors, so we assign a stable palette in
// the order corps first appear (i.e. by rank on the earliest date).
const PALETTE = [
  "#3B82F6", "#EF4444", "#10B981", "#F59E0B", "#8B5CF6",
  "#EC4899", "#06B6D4", "#F97316", "#6366F1", "#14B8A6",
  "#DC2626", "#7C3AED", "#0EA5E9", "#84CC16", "#E11D48",
];

const BASE_URL = "https://www.dciscores.com";
const REVALIDATE_SECONDS = 300; // re-scrape at most every 5 minutes
const FALLBACK_YEAR = 2026;

function shortName(name: string): string {
  const words = name.split(/\s+/).filter(Boolean);
  if (words.length <= 1) return name.slice(0, 3).toUpperCase();
  return words
    .map((w) => w[0])
    .join("")
    .slice(0, 4)
    .toUpperCase();
}

function parseDivision(html: string, config: DivisionConfig): Division {
  const $ = cheerio.load(html);

  // Year is rendered in the page heading, e.g. "<h3>World Class 2026</h3>".
  const heading = $("h3").first().text();
  const yearMatch = heading.match(/(20\d{2})/);
  const year = yearMatch ? Number(yearMatch[1]) : FALLBACK_YEAR;

  const dates: string[] = [];
  // Insertion order = first-seen (rank) order, which drives color assignment.
  const corpsMap = new Map<string, Corps>();

  // Each date column contains a `.show-date` label followed by the corps
  // popovers for that date, all under the same flex-column container.
  $(".show-date").each((_, el) => {
    const date = $(el).text().trim();
    if (!date) return;
    if (!dates.includes(date)) dates.push(date);

    $(el)
      .parent()
      .find(".corps-icon-overlay")
      .each((__, overlay) => {
        const name = ($(overlay).attr("title") || "").trim();
        const dataContent = $(overlay).attr("data-content") || "";
        // First parenthesized number is the score for this date.
        const scoreMatch = dataContent.match(/\(([\d.]+)/);
        if (!name || !scoreMatch) return;

        const score = Number.parseFloat(scoreMatch[1]);
        if (!Number.isFinite(score)) return;

        let corps = corpsMap.get(name);
        if (!corps) {
          corps = {
            name,
            shortName: shortName(name),
            color: PALETTE[corpsMap.size % PALETTE.length],
            scores: {},
          };
          corpsMap.set(name, corps);
        }
        corps.scores[date] = score;
      });
  });

  return {
    label: config.label,
    slug: config.slug,
    year,
    dates,
    corps: [...corpsMap.values()],
  };
}

function emptyDivision(config: DivisionConfig): Division {
  return { label: config.label, slug: config.slug, year: FALLBACK_YEAR, dates: [], corps: [] };
}

async function getDivision(config: DivisionConfig): Promise<Division> {
  try {
    const res = await fetch(`${BASE_URL}/${config.path}`, {
      headers: {
        // dciscores.com serves an empty shell to clients without a browser UA.
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
      },
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) return emptyDivision(config);
    return parseDivision(await res.text(), config);
  } catch {
    // Network/parse failure: degrade to an empty division so the page still renders.
    return emptyDivision(config);
  }
}

export async function getAllDivisions(): Promise<Division[]> {
  return Promise.all(DIVISION_CONFIGS.map(getDivision));
}
