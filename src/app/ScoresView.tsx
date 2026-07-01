"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Corps, Division } from "@/lib/dci";

const YEARS = [2026, 2025, 2024, 2023, 2022, 2019, 2018, 2017, 2016, 2015, 2014];

function getRankedCorps(corps: Corps[], date: string) {
  return [...corps]
    .filter((c) => c.scores[date] !== undefined)
    .sort((a, b) => (b.scores[date] ?? 0) - (a.scores[date] ?? 0));
}

function getLatestDate(dates: string[]) {
  return dates[dates.length - 1] ?? "";
}

function getDelta(corps: Corps, dates: string[]) {
  if (dates.length < 2) return null;
  const prev = corps.scores[dates[dates.length - 2]];
  const curr = corps.scores[dates[dates.length - 1]];
  if (prev === undefined || curr === undefined) return null;
  return +(curr - prev).toFixed(3);
}

function RankBadge({ rank }: { rank: number }) {
  const cls =
    rank === 1 ? "rank-gold" : rank === 2 ? "rank-silver" : rank === 3 ? "rank-bronze" : "rank-default";
  return (
    <span className={`${cls} inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold text-white shadow-lg`}>
      {rank}
    </span>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null;
  const isPositive = delta > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${
      isPositive ? "bg-green-500/15 text-green-400" : delta < 0 ? "bg-red-500/15 text-red-400" : "bg-white/5 text-white/40"
    }`}>
      {isPositive ? "+" : ""}{delta.toFixed(3)}
    </span>
  );
}

function CorpsCard({
  corps, rank, latestDate, dates, highlighted, onHover, onLeave, index,
}: {
  corps: Corps; rank: number; latestDate: string; dates: string[];
  highlighted: boolean; onHover: () => void; onLeave: () => void; index: number;
}) {
  const score = corps.scores[latestDate];
  const delta = getDelta(corps, dates);
  return (
    <div
      className={`glass-card p-4 cursor-pointer transition-all duration-300 ease-out animate-fade-in-up opacity-0 ${
        highlighted ? "ring-2 shadow-lg scale-[1.02]" : "hover:shadow-md hover:-translate-y-0.5"
      }`}
      style={{
        animationDelay: `${index * 80}ms`, animationFillMode: "forwards",
        borderColor: highlighted ? corps.color : undefined,
        boxShadow: highlighted ? `0 0 24px ${corps.color}30` : undefined,
      }}
      onMouseEnter={onHover} onMouseLeave={onLeave}
    >
      <div className="flex items-center gap-3">
        <RankBadge rank={rank} />
        <div className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
          style={{ backgroundColor: corps.color, boxShadow: `0 0 8px ${corps.color}60` }} />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-white/90 truncate">{corps.name}</div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="font-mono text-lg font-bold" style={{ color: corps.color, fontVariantNumeric: "tabular-nums" }}>
              {score?.toFixed(3)}
            </span>
            <DeltaBadge delta={delta} />
          </div>
        </div>
        {dates.length > 1 && (
          <div className="hidden sm:block w-16 h-8 opacity-60">
            <svg viewBox="0 0 64 32" className="w-full h-full">
              <polyline fill="none" stroke={corps.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                points={dates.map((d, i) => {
                  const s = corps.scores[d] ?? 0;
                  const min = Math.min(...dates.map((dd) => corps.scores[dd] ?? 100));
                  const max = Math.max(...dates.map((dd) => corps.scores[dd] ?? 0));
                  const range = max - min || 1;
                  const x = (i / (dates.length - 1)) * 60 + 2;
                  const y = 30 - ((s - min) / range) * 26;
                  return `${x},${y}`;
                }).join(" ")} />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}

function ScoreChart({ division, highlightedCorps, onCorpsHover, onCorpsLeave }: {
  division: Division; highlightedCorps: string | null;
  onCorpsHover: (name: string) => void; onCorpsLeave: () => void;
}) {
  const chartData = useMemo(() => {
    return division.dates.map((date) => {
      const entry: Record<string, string | number> = { date };
      division.corps.forEach((c) => { entry[c.name] = c.scores[date] ?? 0; });
      return entry;
    });
  }, [division]);

  if (division.dates.length === 0) return null;
  const allScores = division.corps.flatMap((c) => Object.values(c.scores));
  const minScore = Math.floor(Math.min(...allScores) - 3);
  const maxScore = Math.ceil(Math.max(...allScores) + 2);

  return (
    <div className="glass-card p-6 animate-fade-in-up opacity-0" style={{ animationDelay: "100ms", animationFillMode: "forwards" }}>
      <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-4">Score Progression</h3>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
          <XAxis dataKey="date" stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} />
          <YAxis domain={[minScore, maxScore]} stroke="rgba(255,255,255,0.3)" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 12 }} axisLine={{ stroke: "rgba(255,255,255,0.08)" }} tickFormatter={(v: number) => v.toFixed(0)} />
          <Tooltip
            contentStyle={{ background: "rgba(17,26,14,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "12px", backdropFilter: "blur(20px)", padding: "12px 16px" }}
            labelStyle={{ color: "rgba(255,255,255,0.6)", marginBottom: 8, fontSize: 12, fontWeight: 600 }}
            itemStyle={{ color: "rgba(255,255,255,0.9)", fontSize: 13, padding: "2px 0" }}
            formatter={(value: unknown) => [(Number(value)).toFixed(3), undefined]}
          />
          {division.corps.map((corps) => (
            <Line key={corps.name} type="monotone" dataKey={corps.name} stroke={corps.color}
              strokeWidth={highlightedCorps === corps.name ? 4 : 2}
              dot={{ fill: corps.color, r: highlightedCorps === corps.name ? 6 : 4, strokeWidth: 2, stroke: "#111a0e" }}
              activeDot={{ r: 8, fill: corps.color, stroke: "#fff", strokeWidth: 2 }}
              opacity={highlightedCorps === null || highlightedCorps === corps.name ? 1 : 0.2}
              style={{ filter: highlightedCorps === corps.name ? `drop-shadow(0 0 8px ${corps.color}80)` : "none", transition: "opacity 0.3s, filter 0.3s" }}
              onMouseEnter={() => onCorpsHover(corps.name)} onMouseLeave={() => onCorpsLeave()} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="glass-card p-12 text-center animate-fade-in-up opacity-0" style={{ animationFillMode: "forwards" }}>
      <div className="text-4xl mb-4">🎺</div>
      <h3 className="text-lg font-semibold text-white/70 mb-2">No {label} Scores Yet</h3>
      <p className="text-sm text-white/40 max-w-md mx-auto">
        The {label.toLowerCase()} season hasn&apos;t started yet or scores are being updated. Check back soon!
      </p>
    </div>
  );
}

function StatsBar({ division }: { division: Division }) {
  if (division.corps.length === 0) return null;
  const latestDate = getLatestDate(division.dates);
  const ranked = getRankedCorps(division.corps, latestDate);
  const topScore = ranked[0]?.scores[latestDate] ?? 0;
  const avgScore = ranked.reduce((sum, c) => sum + (c.scores[latestDate] ?? 0), 0) / ranked.length;
  const scoreDiffs = ranked.map((c, i) => i === 0 ? 0 : topScore - (c.scores[latestDate] ?? 0));
  const closestGap = Math.min(...scoreDiffs.filter((d) => d > 0));

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-fade-in-up opacity-0" style={{ animationDelay: "50ms", animationFillMode: "forwards" }}>
      {[
        { label: "Corps Competing", value: ranked.length.toString(), icon: "🎭" },
        { label: "High Score", value: topScore.toFixed(3), icon: "🏆" },
        { label: "Average", value: avgScore.toFixed(3), icon: "📊" },
        { label: "Closest Gap", value: closestGap === Infinity ? "—" : closestGap.toFixed(3), icon: "🔥" },
      ].map((stat) => (
        <div key={stat.label} className="glass-card p-4 text-center">
          <div className="text-lg mb-1">{stat.icon}</div>
          <div className="font-mono text-xl font-bold text-white/90" style={{ fontVariantNumeric: "tabular-nums" }}>{stat.value}</div>
          <div className="text-xs text-white/40 mt-1 uppercase tracking-wider">{stat.label}</div>
        </div>
      ))}
    </div>
  );
}

export default function ScoresView({ divisions }: { divisions: Division[] }) {
  const [activeDivision, setActiveDivision] = useState("world");
  const [selectedYear, setSelectedYear] = useState(2026);
  const [highlightedCorps, setHighlightedCorps] = useState<string | null>(null);

  const division = divisions.find((d) => d.slug === activeDivision) ?? divisions[0];
  const latestDate = getLatestDate(division.dates);
  const ranked = latestDate ? getRankedCorps(division.corps, latestDate) : [];

  return (
    <div className="min-h-screen" style={{ background: "var(--background)" }}>
      <header className="glass-nav sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm text-white"
                style={{ background: "linear-gradient(135deg, #1b6900, #2d8a12)" }}>DCI</div>
              <span className="font-bold text-lg tracking-tight text-white/90 hidden sm:block">Scores</span>
            </div>
            <div className="flex items-center bg-white/5 rounded-full p-1">
              {divisions.map((d) => (
                <button key={d.slug} onClick={() => setActiveDivision(d.slug)}
                  className={`px-4 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
                    activeDivision === d.slug ? "text-white shadow-lg" : "text-white/50 hover:text-white/80"
                  }`}
                  style={activeDivision === d.slug ? { background: "linear-gradient(135deg, #1b6900, #2d8a12)" } : {}}>
                  {d.label}
                </button>
              ))}
            </div>
            <select value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="bg-white/5 border border-white/10 text-white/80 text-sm rounded-xl px-3 py-2 cursor-pointer hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500/50">
              {YEARS.map((y) => (<option key={y} value={y} className="bg-[#111a0e] text-white">{y}</option>))}
            </select>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden">
        <div className="absolute inset-0 opacity-20" style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(27,105,0,0.4) 0%, transparent 60%)" }} />
        <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-12 pb-8 relative">
          <div className="animate-fade-in-up opacity-0" style={{ animationFillMode: "forwards" }}>
            <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white mb-2">
              {division.label}<span className="text-white/30 ml-3 text-3xl sm:text-4xl font-bold">{selectedYear}</span>
            </h1>
            {latestDate && (
              <p className="text-white/40 text-sm">Last updated: {latestDate}/{selectedYear} &middot; {ranked.length} corps competing</p>
            )}
          </div>
        </div>
      </section>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 pb-16 space-y-6">
        {division.corps.length === 0 ? (
          <EmptyState label={division.label} />
        ) : (
          <>
            <StatsBar division={division} />
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              <div className="lg:col-span-2 space-y-3">
                <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest mb-1">Leaderboard</h3>
                {ranked.map((corps, i) => (
                  <CorpsCard key={corps.name} corps={corps} rank={i + 1} latestDate={latestDate} dates={division.dates}
                    highlighted={highlightedCorps === corps.name}
                    onHover={() => setHighlightedCorps(corps.name)}
                    onLeave={() => setHighlightedCorps(null)} index={i} />
                ))}
              </div>
              <div className="lg:col-span-3">
                <ScoreChart division={division} highlightedCorps={highlightedCorps}
                  onCorpsHover={setHighlightedCorps} onCorpsLeave={() => setHighlightedCorps(null)} />
                <div className="glass-card mt-6 overflow-hidden animate-fade-in-up opacity-0" style={{ animationDelay: "200ms", animationFillMode: "forwards" }}>
                  <div className="p-4 border-b border-white/5">
                    <h3 className="text-sm font-semibold text-white/50 uppercase tracking-widest">Detailed Scores</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Rank</th>
                          <th className="text-left px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Corps</th>
                          {division.dates.map((d) => (
                            <th key={d} className="text-right px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">{d}</th>
                          ))}
                          <th className="text-right px-4 py-3 text-white/40 font-medium text-xs uppercase tracking-wider">Change</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ranked.map((corps, i) => {
                          const delta = getDelta(corps, division.dates);
                          return (
                            <tr key={corps.name}
                              className={`border-b border-white/[0.03] transition-colors duration-200 cursor-pointer ${
                                highlightedCorps === corps.name ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                              } ${i % 2 === 1 ? "bg-white/[0.01]" : ""}`}
                              onMouseEnter={() => setHighlightedCorps(corps.name)}
                              onMouseLeave={() => setHighlightedCorps(null)}>
                              <td className="px-4 py-3"><RankBadge rank={i + 1} /></td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: corps.color }} />
                                  <span className="font-medium text-white/90">{corps.name}</span>
                                </div>
                              </td>
                              {division.dates.map((d) => (
                                <td key={d} className="px-4 py-3 text-right font-mono font-semibold text-white/80"
                                  style={{ fontVariantNumeric: "tabular-nums" }}>
                                  {corps.scores[d]?.toFixed(3) ?? "—"}
                                </td>
                              ))}
                              <td className="px-4 py-3 text-right"><DeltaBadge delta={delta} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      <footer className="border-t border-white/5 mt-auto">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/30">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg flex items-center justify-center font-bold text-[10px] text-white"
                style={{ background: "linear-gradient(135deg, #1b6900, #2d8a12)" }}>DCI</div>
              <span>&copy; 2026 DCI Scores</span>
            </div>
            <div className="flex items-center gap-4">
              <a href="#" className="hover:text-white/60 transition-colors">Privacy Policy</a>
              <span>&middot;</span>
              <span>A redesigned experience inspired by Apple, Google, Figma, Microsoft &amp; Duolingo</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
