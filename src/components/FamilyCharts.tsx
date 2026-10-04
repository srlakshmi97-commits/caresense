"use client";

import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useT } from "@/lib/i18n/client";
import { fmtShortDay } from "@/lib/client/format";

// Single-series charts: one validated mark colour, no legend (the title names
// the series), recessive grid, text in ink tokens, hover tooltip + table view.
const MARK = "#0B7F62";
const GRID = "rgb(var(--line))";
const TICK = { fill: "rgb(var(--muted))", fontSize: 13 };

interface Row {
  label: string;
  value: number | null;
  tip: string;
}

function ChartTooltip({ active, payload }: { active?: boolean; payload?: { payload: Row }[] }) {
  if (!active || !payload?.length) return null;
  const r = payload[0].payload;
  return (
    <div className="rounded-xl border border-line bg-surface px-3 py-2 text-base text-ink shadow-lg">
      <p className="font-bold">{r.label}</p>
      <p>{r.tip}</p>
    </div>
  );
}

function ChartCard({ title, sub, rows, kind, yMax, yTicks }: { title: string; sub: string; rows: Row[]; kind: "bar" | "line"; yMax?: number; yTicks?: number[] }) {
  const t = useT();
  const [table, setTable] = useState(false);
  const hasData = rows.some((r) => r.value != null && r.value > 0);
  const interval = rows.length > 14 ? Math.ceil(rows.length / 7) - 1 : rows.length > 7 ? 1 : 0;

  return (
    <figure className="card p-5">
      <figcaption>
        <h3 className="text-xl font-bold">{title}</h3>
        <p className="text-base text-muted">{sub}</p>
      </figcaption>
      {!hasData || rows.length < 3 ? (
        <p className="mt-4 text-lg text-muted">{t("family.chartNoData")}</p>
      ) : table ? (
        <table className="mt-4 w-full text-left text-base">
          <tbody>
            {rows.map((r) => (
              <tr key={r.label} className="border-b border-line">
                <th scope="row" className="py-1.5 font-semibold">{r.label}</th>
                <td className="py-1.5">{r.tip}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="mt-4 h-56" role="img" aria-label={`${title}. ${sub}`}>
          <ResponsiveContainer width="100%" height="100%">
            {kind === "bar" ? (
              <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={interval} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} allowDecimals={false} domain={[0, yMax ?? "auto"]} ticks={yTicks} />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgb(var(--canvas))" }} />
                <Bar dataKey="value" fill={MARK} radius={[4, 4, 0, 0]} maxBarSize={36} isAnimationActive={false} />
              </BarChart>
            ) : (
              <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -18 }}>
                <CartesianGrid vertical={false} stroke={GRID} />
                <XAxis dataKey="label" tick={TICK} tickLine={false} axisLine={{ stroke: GRID }} interval={interval} />
                <YAxis tick={TICK} tickLine={false} axisLine={false} domain={[0, yMax ?? "auto"]} ticks={yTicks} />
                <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgb(var(--muted))", strokeDasharray: "3 3" }} />
                <Line dataKey="value" stroke={MARK} strokeWidth={2} dot={{ r: 4, fill: MARK, stroke: "#fff", strokeWidth: 2 }} activeDot={{ r: 6 }} connectNulls={false} isAnimationActive={false} />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
      {hasData && rows.length >= 3 && (
        <button type="button" onClick={() => setTable(!table)} className="mt-3 min-h-touch text-base font-semibold text-calm underline underline-offset-4">
          {table ? t("family.chartView") : t("family.tableView")}
        </button>
      )}
    </figure>
  );
}

export function FamilyCharts({
  name,
  painDaily,
  medsDaily,
}: {
  name: string;
  painDaily: { date: string; count: number; max: number | null }[] | null;
  medsDaily: { date: string; taken: number; scheduled: number }[] | null;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {painDaily && (
        <ChartCard
          title={t("family.chartPainFreq", { name })}
          sub={t("family.chartPainFreqSub")}
          kind="bar"
          rows={painDaily.map((d) => ({ label: fmtShortDay(d.date), value: d.count, tip: t("family.painEpisodes", { count: d.count }) }))}
        />
      )}
      {painDaily && (
        <ChartCard
          title={t("family.chartSeverity")}
          sub={t("family.chartSeveritySub")}
          kind="line"
          yMax={10}
          yTicks={[0, 2, 5, 7, 10]}
          rows={painDaily.map((d) => ({ label: fmtShortDay(d.date), value: d.max, tip: d.max == null ? "—" : t("severity.scoreLabel", { score: d.max }) }))}
        />
      )}
      {medsDaily && (
        <ChartCard
          title={t("family.chartAdherence", { name })}
          sub={t("family.chartAdherenceSub")}
          kind="bar"
          yMax={100}
          yTicks={[0, 50, 100]}
          rows={medsDaily.map((d) => ({
            label: fmtShortDay(d.date),
            value: d.scheduled ? Math.round((d.taken / d.scheduled) * 100) : null,
            tip: d.scheduled ? `${t("family.medsTaken", { taken: d.taken, total: d.scheduled })} (${Math.round((d.taken / d.scheduled) * 100)}%)` : "—",
          }))}
        />
      )}
    </div>
  );
}
