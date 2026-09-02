"use client";

import { useId, useState } from "react";

export type LiftPoint = { date: string; weight: number };
type Exercise = { id: number; name: string };
type Workout = { id: number; exercises: Exercise[] };
type SetLog = { exerciseId: number; weight: number };
type WorkoutLog = { date: string; sets: SetLog[] };

// One point per workout log per exercise: the heaviest set logged that session.
export function buildLiftSeries(workouts: Workout[], workoutLogs: WorkoutLog[]): Map<string, LiftPoint[]> {
  const exerciseNameById = new Map<number, string>();
  workouts.forEach((w) => w.exercises.forEach((e) => exerciseNameById.set(e.id, e.name)));

  const series = new Map<string, LiftPoint[]>();
  for (const log of workoutLogs) {
    const topByExercise = new Map<number, number>();
    for (const s of log.sets) {
      const cur = topByExercise.get(s.exerciseId);
      if (cur === undefined || s.weight > cur) topByExercise.set(s.exerciseId, s.weight);
    }
    for (const [exerciseId, weight] of topByExercise) {
      const name = exerciseNameById.get(exerciseId);
      if (!name) continue;
      if (!series.has(name)) series.set(name, []);
      series.get(name)!.push({ date: log.date, weight });
    }
  }
  for (const points of series.values()) points.sort((a, b) => a.date.localeCompare(b.date));
  return series;
}

const SERIES_COLORS = [
  "var(--series-1)",
  "var(--series-2)",
  "var(--series-3)",
  "var(--series-4)",
  "var(--series-5)",
  "var(--series-6)",
  "var(--series-7)",
  "var(--series-8)",
];
export const MAX_SELECTED_LIFTS = SERIES_COLORS.length;

// Stable per-entity color: same lift always gets the same slot, independent of what else is selected.
export function colorForLift(name: string) {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return SERIES_COLORS[Math.abs(hash) % SERIES_COLORS.length];
}

export function formatDate(iso: string, withYear = false) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", withYear ? { month: "short", day: "numeric", year: "numeric" } : { month: "short", day: "numeric" });
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

// Catmull-Rom → cubic Bezier: turns straight-segment points into one flowing curve through
// every point (tension 1/6, the standard conversion), instead of the angular polyline before.
export function smoothPath(points: readonly (readonly [number, number])[]): string {
  if (points.length === 0) return "";
  if (points.length < 3) {
    return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  }
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i === 0 ? 0 : i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2 < points.length ? i + 2 : i + 1];
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C ${c1x} ${c1y}, ${c2x} ${c2y}, ${p2[0]} ${p2[1]}`;
  }
  return d;
}

// Evenly spaced label indices across an array (always includes first + last), capped at `max` labels.
function tickIndices(length: number, max = 5) {
  const count = Math.min(max, length);
  const idxs = Array.from({ length: count }, (_, i) => Math.round((i * (length - 1)) / Math.max(1, count - 1)));
  return [...new Set(idxs)];
}

type Hover = { x: number; y: number; title: string; subtitle?: string };

function ChartTooltip({ x, y, w, h, title, subtitle }: { x: number; y: number; w: number; h: number; title: string; subtitle?: string }) {
  return (
    <div
      className="pointer-events-none absolute bg-[var(--surface2)] border border-[var(--line)] rounded px-2 py-1.5 font-label text-[11px] whitespace-nowrap shadow-lg z-10"
      style={{ left: `${clamp((x / w) * 100, 6, 94)}%`, top: `${(y / h) * 100}%`, transform: "translate(-50%, calc(-100% - 10px))" }}
    >
      <div className="text-[var(--chalk)] font-semibold">{title}</div>
      {subtitle && <div className="text-[var(--muted)] mt-0.5">{subtitle}</div>}
    </div>
  );
}

export function WeightChart({ weights, hasHistory }: { weights: { date: string; weight: number }[]; hasHistory: boolean }) {
  const [hover, setHover] = useState<Hover | null>(null);
  const [pinned, setPinned] = useState(false);

  if (weights.length < 2) {
    return (
      <div className="text-center text-[var(--muted)] font-label text-xs py-6">
        {hasHistory ? "No weigh-ins in this range — try a wider range." : "Log a few more weigh-ins to see your trend."}
      </div>
    );
  }
  const w = 500, h = 156, pad = 20;
  const vals = weights.map((d) => d.weight);
  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
  const mid = (min + max) / 2;
  const plotBottom = h - pad;
  const yForWeight = (weight: number) => plotBottom - ((weight - min) / (max - min || 1)) * (h - pad * 2);
  const points = weights.map((d, i) => {
    const x = pad + (i / (weights.length - 1)) * (w - pad * 2);
    return [x, yForWeight(d.weight)] as const;
  });
  const path = smoothPath(points);
  const areaPath = `${path} L ${points[points.length - 1][0]} ${plotBottom} L ${points[0][0]} ${plotBottom} Z`;

  function show(x: number, y: number, weight: number, date: string) {
    setHover({ x, y, title: `${weight}lb`, subtitle: formatDate(date, true) });
  }
  function hide() {
    if (!pinned) setHover(null);
  }
  function togglePin(x: number, y: number, weight: number, date: string) {
    const title = `${weight}lb`;
    const subtitle = formatDate(date, true);
    setPinned((wasPinned) => {
      if (wasPinned && hover?.title === title && hover?.subtitle === subtitle) {
        setHover(null);
        return false;
      }
      setHover({ x, y, title, subtitle });
      return true;
    });
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        onClick={() => {
          if (pinned) { setPinned(false); setHover(null); }
        }}
      >
        <defs>
          <filter id="chalkFilter">
            <feTurbulence type="fractalNoise" baseFrequency="0.02 0.9" numOctaves={1} seed={4} result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} />
          </filter>
          <linearGradient id="weightAreaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--red)" stopOpacity={0.22} />
            <stop offset="100%" stopColor="var(--red)" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[min, mid, max].map((v, i) => {
          const y = yForWeight(v);
          return (
            <g key={i}>
              <line x1={pad} y1={y} x2={w - pad} y2={y} stroke="var(--line)" strokeWidth={1} />
              <text x={pad} y={y - 4} fill="var(--muted)" fontFamily="Manrope" fontSize={10}>{Math.round(v)}lb</text>
            </g>
          );
        })}
        <path d={areaPath} fill="url(#weightAreaFill)" stroke="none" />
        <path d={path} fill="none" stroke="var(--chalk)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" filter="url(#chalkFilter)" opacity={0.9} />
        {points.map(([x, y], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={4} fill="var(--red)" stroke="var(--surface)" strokeWidth={2} />
            <circle
              cx={x}
              cy={y}
              r={10}
              fill="transparent"
              className="cursor-pointer"
              tabIndex={0}
              role="button"
              aria-label={`${weights[i].weight} pounds on ${formatDate(weights[i].date, true)}`}
              onMouseEnter={(e) => { e.stopPropagation(); show(x, y, weights[i].weight, weights[i].date); }}
              onMouseLeave={hide}
              onFocus={(e) => { e.stopPropagation(); show(x, y, weights[i].weight, weights[i].date); }}
              onBlur={hide}
              onClick={(e) => { e.stopPropagation(); togglePin(x, y, weights[i].weight, weights[i].date); }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); togglePin(x, y, weights[i].weight, weights[i].date); }
              }}
            />
          </g>
        ))}
        {tickIndices(weights.length).map((i) => {
          const anchor = i === 0 ? "start" : i === weights.length - 1 ? "end" : "middle";
          return (
            <text key={i} x={points[i][0]} y={h - pad + 14} fill="var(--muted)" fontFamily="Manrope" fontSize={9} textAnchor={anchor}>
              {formatDate(weights[i].date)}
            </text>
          );
        })}
      </svg>
      {hover && <ChartTooltip x={hover.x} y={hover.y} w={w} h={h} title={hover.title} subtitle={hover.subtitle} />}
    </div>
  );
}

export type SessionSetGroup = { name: string; sets: { setNumber: number; weight: number; reps: number }[] };

type SetPoint = { x: number; y: number; weight: number; reps: number };
type SetLine = { name: string; color: string; pts: SetPoint[] };

// Every set from one logged session, grouped by exercise and connected as a line per exercise —
// set-by-set shape within a workout (warm-ups vs. working sets), with an optional second session
// overlaid (dashed, hollow points) so two sessions of the same workout can be compared set-for-set.
export function SessionSetsChart({
  groups,
  compareGroups,
  primaryLabel = "This session",
  compareLabel = "Compare",
}: {
  groups: SessionSetGroup[];
  compareGroups?: SessionSetGroup[];
  primaryLabel?: string;
  compareLabel?: string;
}) {
  const [hover, setHover] = useState<(Hover & { compare?: boolean }) | null>(null);
  const [pinned, setPinned] = useState(false);
  const gradientPrefix = useId();

  const compareByName = new Map((compareGroups ?? []).map((g) => [g.name, g]));
  const visibleGroups = groups
    .map((primary) => ({ primary, compare: compareByName.get(primary.name) ?? null }))
    .filter(({ primary, compare }) => primary.sets.length > 0 || (compare?.sets.length ?? 0) > 0);

  const allWeights = visibleGroups.flatMap(({ primary, compare }) => [...primary.sets, ...(compare?.sets ?? [])].map((s) => s.weight));
  if (allWeights.length === 0) {
    return <div className="text-center text-[var(--muted)] font-label text-xs py-6">No sets logged for this session.</div>;
  }

  const h = 196, padTop = 16, padBottom = 32, padLeft = 32, padRight = 16;
  const slotW = 30, groupGap = 28;

  const primaryLines: SetLine[] = [];
  const compareLines: SetLine[] = [];
  const groupLabels: { x: number; text: string }[] = [];

  const maxW = Math.max(...allWeights) * 1.1 || 1;
  const midW = maxW / 2;
  const plotBottom = h - padBottom;
  const yFor = (weight: number) => plotBottom - (weight / maxW) * (h - padTop - padBottom);

  let x = padLeft;
  visibleGroups.forEach(({ primary, compare }, gi) => {
    if (gi > 0) x += groupGap;
    const color = colorForLift(primary.name);
    const slotCount = Math.max(primary.sets.length, compare?.sets.length ?? 0, 1);
    const startX = x;
    if (primary.sets.length > 0) {
      primaryLines.push({
        name: primary.name,
        color,
        pts: primary.sets.map((s) => ({ x: startX + (s.setNumber - 1) * slotW, y: yFor(s.weight), weight: s.weight, reps: s.reps })),
      });
    }
    if (compare && compare.sets.length > 0) {
      compareLines.push({
        name: compare.name,
        color,
        pts: compare.sets.map((s) => ({ x: startX + (s.setNumber - 1) * slotW, y: yFor(s.weight), weight: s.weight, reps: s.reps })),
      });
    }
    const endX = startX + (slotCount - 1) * slotW;
    groupLabels.push({ x: (startX + endX) / 2, text: primary.name });
    x = endX;
  });
  const contentWidth = x + padRight;
  const w = Math.max(500, contentWidth);

  function show(pt: SetPoint, name: string, setNumber: number, isCompare: boolean) {
    const label = isCompare ? compareLabel : primaryLabel;
    setHover({ x: pt.x, y: pt.y, title: `${pt.weight}lb × ${pt.reps}`, subtitle: `${name} · Set ${setNumber} · ${label}`, compare: isCompare });
  }
  function hide() {
    if (!pinned) setHover(null);
  }
  function togglePin(pt: SetPoint, name: string, setNumber: number, isCompare: boolean) {
    const label = isCompare ? compareLabel : primaryLabel;
    const title = `${pt.weight}lb × ${pt.reps}`;
    const subtitle = `${name} · Set ${setNumber} · ${label}`;
    setPinned((wasPinned) => {
      if (wasPinned && hover?.title === title && hover?.subtitle === subtitle) {
        setHover(null);
        return false;
      }
      setHover({ x: pt.x, y: pt.y, title, subtitle, compare: isCompare });
      return true;
    });
  }

  function renderPoints(line: SetLine, lineIndex: number, isCompare: boolean) {
    return line.pts.map((pt, i) => (
      <g key={i}>
        {isCompare ? (
          <circle cx={pt.x} cy={pt.y} r={4} fill="var(--surface)" stroke={line.color} strokeWidth={2} />
        ) : (
          <circle cx={pt.x} cy={pt.y} r={4} fill={line.color} stroke="var(--surface)" strokeWidth={2} />
        )}
        <circle
          cx={pt.x}
          cy={pt.y}
          r={10}
          fill="transparent"
          className="cursor-pointer"
          tabIndex={0}
          role="button"
          aria-label={`${line.name} set ${i + 1}: ${pt.weight} pounds by ${pt.reps} reps${isCompare ? ` (${compareLabel})` : ""}`}
          onMouseEnter={(e) => { e.stopPropagation(); show(pt, line.name, i + 1, isCompare); }}
          onMouseLeave={hide}
          onFocus={(e) => { e.stopPropagation(); show(pt, line.name, i + 1, isCompare); }}
          onBlur={hide}
          onClick={(e) => { e.stopPropagation(); togglePin(pt, line.name, i + 1, isCompare); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") { e.preventDefault(); e.stopPropagation(); togglePin(pt, line.name, i + 1, isCompare); }
          }}
        />
      </g>
    ));
  }

  return (
    <div className="relative">
      <div className="overflow-x-auto">
        <div style={{ width: w }}>
          <svg
            viewBox={`0 0 ${w} ${h}`}
            className="w-full h-auto"
            onClick={() => {
              if (pinned) { setPinned(false); setHover(null); }
            }}
          >
            <defs>
              {primaryLines.map((line, i) => (
                <linearGradient key={line.name} id={`${gradientPrefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={line.color} stopOpacity={0.18} />
                  <stop offset="100%" stopColor={line.color} stopOpacity={0} />
                </linearGradient>
              ))}
            </defs>
            {[0, midW, maxW].map((v, i) => (
              <g key={i}>
                <line x1={padLeft} y1={yFor(v)} x2={w - padRight} y2={yFor(v)} stroke="var(--line)" strokeWidth={1} />
                <text x={padLeft} y={yFor(v) - 4} fill="var(--muted)" fontFamily="Manrope" fontSize={10}>{Math.round(v)}lb</text>
              </g>
            ))}
            {compareLines.map((line) => {
              const path = smoothPath(line.pts.map((p) => [p.x, p.y] as const));
              return <path key={line.name} d={path} fill="none" stroke={line.color} strokeWidth={2} strokeDasharray="4 3" strokeLinecap="round" opacity={0.55} />;
            })}
            {primaryLines.map((line, i) => {
              const path = smoothPath(line.pts.map((p) => [p.x, p.y] as const));
              const areaPath = line.pts.length > 1 ? `${path} L ${line.pts[line.pts.length - 1].x} ${plotBottom} L ${line.pts[0].x} ${plotBottom} Z` : "";
              return (
                <g key={line.name}>
                  {line.pts.length > 1 && <path d={areaPath} fill={`url(#${gradientPrefix}-${i})`} stroke="none" />}
                  <path d={path} fill="none" stroke={line.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />
                </g>
              );
            })}
            {compareLines.map((line, i) => <g key={i}>{renderPoints(line, i, true)}</g>)}
            {primaryLines.map((line, i) => <g key={i}>{renderPoints(line, i, false)}</g>)}
            {groupLabels.map((l, i) => (
              <text key={i} x={l.x} y={h - padBottom + 16} textAnchor="middle" fill="var(--muted)" fontFamily="Manrope" fontSize={9}>{l.text}</text>
            ))}
          </svg>
        </div>
      </div>
      {hover && <ChartTooltip x={hover.x} y={hover.y} w={w} h={h} title={hover.title} subtitle={hover.subtitle} />}
      {compareLines.length > 0 && (
        <div className="flex items-center gap-3 mt-2 font-label text-[10px] text-[var(--muted)]">
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 border-t-2 border-[var(--chalk-dim)]" /> {primaryLabel}</span>
          <span className="flex items-center gap-1.5"><span className="inline-block w-3 border-t-2 border-dashed border-[var(--muted)]" /> {compareLabel}</span>
        </div>
      )}
    </div>
  );
}

export function LiftProgressChart({ series, selected }: { series: Map<string, LiftPoint[]>; selected: string[] }) {
  const [hover, setHover] = useState<Hover | null>(null);
  const [pinned, setPinned] = useState(false);
  const gradientPrefix = useId();

  const active = selected
    .map((name) => ({ name, points: series.get(name) ?? [] }))
    .filter((s) => s.points.length > 0);

  if (active.length === 0) {
    return (
      <div className="text-center text-[var(--muted)] font-label text-xs py-6">
        {selected.length === 0 ? "Select a lift above to see its progress over time." : "No data for the selected lift(s) in this range — try a wider range."}
      </div>
    );
  }

  const w = 500, h = 196, pad = 24, padRight = pad + 34;
  const allPoints = active.flatMap((s) => s.points);
  const dates = allPoints.map((p) => new Date(p.date).getTime());
  const minDate = Math.min(...dates), maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate;
  const weights = allPoints.map((p) => p.weight);
  const minW = Math.min(...weights) - 5, maxW = Math.max(...weights) + 5;
  const midW = (minW + maxW) / 2;
  const wRange = maxW - minW || 1;
  const plotCenterX = pad + (w - pad - padRight) / 2;

  // A single point (or every point sharing one date) has no real date range to place along —
  // center it in the plot instead of collapsing to the left edge, where it used to sit right
  // on top of the y-axis grid labels.
  const xFor = (date: string) =>
    dateRange === 0 ? plotCenterX : pad + ((new Date(date).getTime() - minDate) / dateRange) * (w - pad - padRight);
  const yFor = (weight: number) => h - pad - ((weight - minW) / wRange) * (h - pad * 2);
  const xForTime = (t: number) => (dateRange === 0 ? plotCenterX : pad + ((t - minDate) / dateRange) * (w - pad - padRight));

  function show(x: number, y: number, weight: number, name: string, date: string) {
    setHover({ x, y, title: `${weight}lb`, subtitle: `${name} · ${formatDate(date, true)}` });
  }
  function hide() {
    if (!pinned) setHover(null);
  }
  function togglePin(x: number, y: number, weight: number, name: string, date: string) {
    const title = `${weight}lb`;
    const subtitle = `${name} · ${formatDate(date, true)}`;
    setPinned((wasPinned) => {
      if (wasPinned && hover?.title === title && hover?.subtitle === subtitle) {
        setHover(null);
        return false;
      }
      setHover({ x, y, title, subtitle });
      return true;
    });
  }

  // A zero date range means every point shares one date — one tick, not five identical ones.
  const tickCount = dateRange === 0 ? 1 : Math.min(5, allPoints.length);
  const axisTicks = Array.from({ length: tickCount }, (_, i) => minDate + (dateRange * i) / Math.max(1, tickCount - 1));

  // Sparing end-of-line labels: place the last value for each series, skipping any
  // that would land too close (vertically) to one already placed.
  const endLabels: { x: number; y: number; text: string }[] = [];
  const placedY: number[] = [];
  for (const s of [...active].sort((a, b) => yFor(a.points[a.points.length - 1].weight) - yFor(b.points[b.points.length - 1].weight))) {
    const lastPoint = s.points[s.points.length - 1];
    const y = yFor(lastPoint.weight);
    if (placedY.some((py) => Math.abs(py - y) < 13)) continue;
    placedY.push(y);
    endLabels.push({ x: xFor(lastPoint.date), y, text: `${lastPoint.weight}lb` });
  }

  return (
    <div className="relative">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="w-full h-auto"
        onClick={() => {
          if (pinned) { setPinned(false); setHover(null); }
        }}
      >
        <defs>
          {active.map((s, i) => {
            const color = colorForLift(s.name);
            return (
              <linearGradient key={s.name} id={`${gradientPrefix}-${i}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={color} stopOpacity={0.18} />
                <stop offset="100%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            );
          })}
        </defs>
        {[minW, midW, maxW].map((v, i) => (
          <line key={i} x1={pad} y1={yFor(v)} x2={w - pad} y2={yFor(v)} stroke="var(--line)" strokeWidth={1} />
        ))}
        {active.map((s, seriesIndex) => {
          const color = colorForLift(s.name);
          const pts = s.points.map((p) => [xFor(p.date), yFor(p.weight)] as const);
          const path = smoothPath(pts);
          const areaPath = pts.length > 1 ? `${path} L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z` : "";
          return (
            <g key={s.name}>
              {pts.length > 1 && <path d={areaPath} fill={`url(#${gradientPrefix}-${seriesIndex})`} stroke="none" />}
              {pts.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} />}
              {pts.map(([x, y], i) => (
                <g key={i}>
                  <circle cx={x} cy={y} r={4} fill={color} stroke="var(--surface)" strokeWidth={2} />
                  <circle
                    cx={x}
                    cy={y}
                    r={10}
                    fill="transparent"
                    className="cursor-pointer"
                    tabIndex={0}
                    role="button"
                    aria-label={`${s.name} ${formatDate(s.points[i].date, true)}: ${s.points[i].weight} pounds`}
                    onMouseEnter={(e) => { e.stopPropagation(); show(x, y, s.points[i].weight, s.name, s.points[i].date); }}
                    onMouseLeave={hide}
                    onFocus={(e) => { e.stopPropagation(); show(x, y, s.points[i].weight, s.name, s.points[i].date); }}
                    onBlur={hide}
                    onClick={(e) => { e.stopPropagation(); togglePin(x, y, s.points[i].weight, s.name, s.points[i].date); }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        e.stopPropagation();
                        togglePin(x, y, s.points[i].weight, s.name, s.points[i].date);
                      }
                    }}
                  />
                </g>
              ))}
            </g>
          );
        })}
        {axisTicks.map((t, i) => {
          const anchor = i === 0 ? "start" : i === axisTicks.length - 1 ? "end" : "middle";
          return (
            <text key={i} x={xForTime(t)} y={h - pad + 14} fill="var(--muted)" fontFamily="Manrope" fontSize={9} textAnchor={anchor}>
              {formatDate(new Date(t).toISOString().slice(0, 10))}
            </text>
          );
        })}
        {[minW, midW, maxW].map((v, i) => (
          <text key={i} x={pad} y={yFor(v) - 4} fill="var(--muted)" fontFamily="Manrope" fontSize={10}>{Math.round(v)}lb</text>
        ))}
        {endLabels.map((l, i) => (
          <text key={i} x={l.x + 8} y={l.y + 3} fill="var(--chalk-dim)" fontFamily="Manrope" fontSize={10}>{l.text}</text>
        ))}
      </svg>
      {hover && <ChartTooltip x={hover.x} y={hover.y} w={w} h={h} title={hover.title} subtitle={hover.subtitle} />}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
        {active.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: colorForLift(s.name) }} />
            <span className="font-label text-[11px] text-[var(--chalk-dim)]">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
