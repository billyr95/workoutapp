"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useAppData, AppData } from "@/lib/useAppData";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type LiftPoint = { date: string; weight: number };

// One point per workout log per exercise: the heaviest set logged that session.
function buildLiftSeries(data: AppData): Map<string, LiftPoint[]> {
  const exerciseNameById = new Map<number, string>();
  data.workouts.forEach((w) => w.exercises.forEach((e) => exerciseNameById.set(e.id, e.name)));

  const series = new Map<string, LiftPoint[]>();
  for (const log of data.workoutLogs) {
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
const MAX_SELECTED_LIFTS = SERIES_COLORS.length;

// Stable per-entity color: same lift always gets the same slot, independent of what else is selected.
function colorForLift(name: string) {
  let hash = 2166136261;
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return SERIES_COLORS[Math.abs(hash) % SERIES_COLORS.length];
}

export default function ProgressPage() {
  const { data, loading, refetch } = useAppData();
  const [weightInput, setWeightInput] = useState("");
  const [measureForm, setMeasureForm] = useState({ waist: "", chest: "", leftArm: "", rightArm: "", leftThigh: "", rightThigh: "" });
  const [toast, setToast] = useState<string | null>(null);
  // null = user hasn't touched the filter yet; fall back to the most-logged lift for the initial view.
  const [selectedLifts, setSelectedLifts] = useState<string[] | null>(null);

  const liftSeries = useMemo(() => (data ? buildLiftSeries(data) : new Map<string, LiftPoint[]>()), [data]);
  const defaultLift = useMemo(() => {
    if (liftSeries.size === 0) return null;
    const [mostLogged] = [...liftSeries.entries()].sort((a, b) => b[1].length - a[1].length);
    return mostLogged[0];
  }, [liftSeries]);
  const effectiveSelected = selectedLifts ?? (defaultLift ? [defaultLift] : []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  if (loading || !data) return <p className="font-mono text-sm text-[var(--muted)]">Loading…</p>;

  const weights = [...data.weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  const lastM = [...data.measurements].sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];
  const liftOptions = [...liftSeries.keys()].sort((a, b) => a.localeCompare(b));

  async function saveWeight() {
    const v = Number(weightInput);
    if (!v) { flash("Enter a weight"); return; }
    await fetch("/api/weight", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weight: v }),
    });
    setWeightInput("");
    await refetch();
    flash("Weight logged");
  }

  async function saveMeasurements() {
    await fetch("/api/measurements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        waist: measureForm.waist ? Number(measureForm.waist) : null,
        chest: measureForm.chest ? Number(measureForm.chest) : null,
        leftArm: measureForm.leftArm ? Number(measureForm.leftArm) : null,
        rightArm: measureForm.rightArm ? Number(measureForm.rightArm) : null,
        leftThigh: measureForm.leftThigh ? Number(measureForm.leftThigh) : null,
        rightThigh: measureForm.rightThigh ? Number(measureForm.rightThigh) : null,
      }),
    });
    await refetch();
    flash("Measurements saved");
  }

  return (
    <div>
      <div className="section-label mb-3">Weight Trend</div>
      <div className="card mb-3.5">
        <WeightChart weights={weights} />
      </div>

      <div className="card mb-3.5">
        <div className="flex gap-2">
          <input type="number" step="0.1" placeholder="Weight (lb)" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
          <button className="btn" onClick={saveWeight}>Log Today&apos;s Weight</button>
        </div>
      </div>

      <div className="section-label mb-3 mt-5 flex items-center justify-between !gap-3">
        <span>Lift Progress</span>
        <LiftFilterDropdown options={liftOptions} selected={effectiveSelected} onChange={setSelectedLifts} />
      </div>
      <div className="card mb-3.5">
        <LiftProgressChart series={liftSeries} selected={effectiveSelected} />
      </div>

      <div className="section-label mb-3 mt-5">Personal Records</div>
      {data.personalRecords.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-mono text-xs">No PRs logged yet.</div>
      ) : (
        data.personalRecords.map((p) => (
          <div key={p.id} className="card !py-3 !px-4 flex justify-between items-center mb-2">
            <span className="font-mono text-[13px]">{p.exerciseName}</span>
            <span className="font-mono text-[11px] uppercase tracking-wide text-[var(--olive)]">
              {p.weight}lb × {p.reps} — {p.date}
            </span>
          </div>
        ))
      )}

      <div className="section-label mb-3 mt-5">Measurements</div>
      <div className="card">
        <div className="flex gap-2 mb-2">
          <input type="number" step="0.1" placeholder="Waist" defaultValue={lastM?.waist ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, waist: e.target.value })} />
          <input type="number" step="0.1" placeholder="Chest" defaultValue={lastM?.chest ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, chest: e.target.value })} />
        </div>
        <div className="flex gap-2 mb-2">
          <input type="number" step="0.1" placeholder="L Arm" defaultValue={lastM?.leftArm ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, leftArm: e.target.value })} />
          <input type="number" step="0.1" placeholder="R Arm" defaultValue={lastM?.rightArm ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, rightArm: e.target.value })} />
        </div>
        <div className="flex gap-2 mb-3">
          <input type="number" step="0.1" placeholder="L Thigh" defaultValue={lastM?.leftThigh ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, leftThigh: e.target.value })} />
          <input type="number" step="0.1" placeholder="R Thigh" defaultValue={lastM?.rightThigh ?? ""} onChange={(e) => setMeasureForm({ ...measureForm, rightThigh: e.target.value })} />
        </div>
        <button className="btn-ghost w-full rounded" onClick={saveMeasurements}>Save Measurements</button>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-mono text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function WeightChart({ weights }: { weights: { date: string; weight: number }[] }) {
  if (weights.length < 2) {
    return <div className="text-center text-[var(--muted)] font-mono text-xs py-6">Log a few more weigh-ins to see your trend.</div>;
  }
  const w = 500, h = 140, pad = 20;
  const vals = weights.map((d) => d.weight);
  const min = Math.min(...vals) - 1, max = Math.max(...vals) + 1;
  const points = weights.map((d, i) => {
    const x = pad + (i / (weights.length - 1)) * (w - pad * 2);
    const y = h - pad - ((d.weight - min) / (max - min || 1)) * (h - pad * 2);
    return [x, y];
  });
  let path = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) path += ` L ${points[i][0]} ${points[i][1]}`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      <defs>
        <filter id="chalkFilter">
          <feTurbulence type="fractalNoise" baseFrequency="0.02 0.9" numOctaves={1} seed={4} result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale={3} />
        </filter>
      </defs>
      <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="#37393d" strokeWidth={1} />
      <path d={path} fill="none" stroke="#e9e4d8" strokeWidth={2} filter="url(#chalkFilter)" opacity={0.9} />
      {points.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={3} fill="#c8102e" />
      ))}
      <text x={pad} y={14} fill="#74777c" fontFamily="IBM Plex Mono" fontSize={10}>{max.toFixed(0)}</text>
      <text x={pad} y={h - pad - 4} fill="#74777c" fontFamily="IBM Plex Mono" fontSize={10}>{min.toFixed(0)}</text>
    </svg>
  );
}

function LiftFilterDropdown({
  options,
  selected,
  onChange,
}: {
  options: string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function toggle(name: string) {
    if (selected.includes(name)) {
      onChange(selected.filter((n) => n !== name));
    } else if (selected.length < MAX_SELECTED_LIFTS) {
      onChange([...selected, name]);
    }
  }

  return (
    <div className="relative font-mono" ref={ref}>
      <button
        type="button"
        className="btn-ghost rounded !py-1 !px-2.5 !text-[11px] normal-case tracking-normal flex items-center gap-1.5"
        onClick={() => setOpen((o) => !o)}
      >
        {selected.length === 0 ? "Select lifts" : `${selected.length} lift${selected.length > 1 ? "s" : ""}`}
        <span className="text-[var(--muted)]">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-10 mt-1.5 w-64 max-h-72 overflow-y-auto card !p-1.5">
          {options.length === 0 && (
            <div className="text-[11px] text-[var(--muted)] px-2 py-2">No logged lifts yet.</div>
          )}
          {options.map((name) => {
            const checked = selected.includes(name);
            const disabled = !checked && selected.length >= MAX_SELECTED_LIFTS;
            return (
              <label
                key={name}
                className={`flex items-center gap-2 px-2 py-1.5 rounded text-[12px] cursor-pointer hover:bg-[var(--surface2)] ${disabled ? "opacity-40 cursor-not-allowed" : ""}`}
              >
                <input type="checkbox" checked={checked} disabled={disabled} onChange={() => toggle(name)} className="!w-auto" />
                <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: colorForLift(name) }} />
                {name}
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
}

function LiftProgressChart({ series, selected }: { series: Map<string, LiftPoint[]>; selected: string[] }) {
  const active = selected
    .map((name) => ({ name, points: series.get(name) ?? [] }))
    .filter((s) => s.points.length > 0);

  if (active.length === 0) {
    return (
      <div className="text-center text-[var(--muted)] font-mono text-xs py-6">
        Select a lift above to see its progress over time.
      </div>
    );
  }

  const w = 500, h = 180, pad = 24;
  const allPoints = active.flatMap((s) => s.points);
  const dates = allPoints.map((p) => new Date(p.date).getTime());
  const minDate = Math.min(...dates), maxDate = Math.max(...dates);
  const dateRange = maxDate - minDate || 1;
  const weights = allPoints.map((p) => p.weight);
  const minW = Math.min(...weights) - 5, maxW = Math.max(...weights) + 5;
  const wRange = maxW - minW || 1;

  const xFor = (date: string) => pad + ((new Date(date).getTime() - minDate) / dateRange) * (w - pad * 2);
  const yFor = (weight: number) => h - pad - ((weight - minW) / wRange) * (h - pad * 2);

  return (
    <div>
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
        <line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="var(--line)" strokeWidth={1} />
        {active.map((s) => {
          const color = colorForLift(s.name);
          const pts = s.points.map((p) => [xFor(p.date), yFor(p.weight)] as const);
          let path = pts.length > 1 ? `M ${pts[0][0]} ${pts[0][1]}` : "";
          for (let i = 1; i < pts.length; i++) path += ` L ${pts[i][0]} ${pts[i][1]}`;
          return (
            <g key={s.name}>
              {pts.length > 1 && <path d={path} fill="none" stroke={color} strokeWidth={2} opacity={0.9} />}
              {pts.map(([x, y], i) => (
                <circle key={i} cx={x} cy={y} r={3.5} fill={color}>
                  <title>{`${s.name} — ${s.points[i].date}: ${s.points[i].weight}lb`}</title>
                </circle>
              ))}
            </g>
          );
        })}
        <text x={pad} y={14} fill="var(--muted)" fontFamily="IBM Plex Mono" fontSize={10}>{maxW.toFixed(0)}lb</text>
        <text x={pad} y={h - pad - 4} fill="var(--muted)" fontFamily="IBM Plex Mono" fontSize={10}>{minW.toFixed(0)}lb</text>
      </svg>
      <div className="flex flex-wrap gap-x-3 gap-y-1.5 mt-2">
        {active.map((s) => (
          <div key={s.name} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: colorForLift(s.name) }} />
            <span className="font-mono text-[11px] text-[var(--chalk-dim)]">{s.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
