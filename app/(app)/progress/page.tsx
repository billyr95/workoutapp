"use client";

import { useEffect, useMemo, useState } from "react";
import { useAppData } from "@/lib/useAppData";
import LoadingMark from "@/components/LoadingMark";
import { LiftPoint, buildLiftSeries, colorForLift, MAX_SELECTED_LIFTS, WeightChart, LiftProgressChart, formatDate } from "@/components/ProgressCharts";

const RANGE_OPTIONS = [
  { value: "14", label: "14 Days" },
  { value: "30", label: "30 Days" },
  { value: "60", label: "60 Days" },
  { value: "90", label: "90 Days" },
  { value: "ytd", label: "This Year" },
  { value: "365", label: "365 Days" },
  { value: "730", label: "2 Years" },
  { value: "1825", label: "5 Years" },
  { value: "all", label: "All Time" },
];
const DEFAULT_RANGE = "30";

// ISO date (YYYY-MM-DD) marking the start of the selected range, or null for "All Time".
function rangeStartDate(range: string): string | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "ytd") return `${now.getFullYear()}-01-01`;
  const d = new Date(now);
  d.setDate(d.getDate() - Number(range));
  return d.toISOString().slice(0, 10);
}

export default function ProgressPage() {
  const { data, loading, refetch } = useAppData();
  const [weightInput, setWeightInput] = useState("");
  const [measureForm, setMeasureForm] = useState({ waist: "", chest: "", leftArm: "", rightArm: "", leftThigh: "", rightThigh: "" });
  const [toast, setToast] = useState<string | null>(null);
  // null = user hasn't touched the filter yet; fall back to the most-logged lift for the initial view.
  const [selectedLifts, setSelectedLifts] = useState<string[] | null>(null);
  const [range, setRange] = useState(DEFAULT_RANGE);
  const rangeStart = rangeStartDate(range);

  const liftSeries = useMemo(() => (data ? buildLiftSeries(data.workouts, data.workoutLogs) : new Map<string, LiftPoint[]>()), [data]);
  const filteredLiftSeries = useMemo(() => {
    if (!rangeStart) return liftSeries;
    const out = new Map<string, LiftPoint[]>();
    for (const [name, points] of liftSeries) {
      const filtered = points.filter((p) => p.date >= rangeStart);
      if (filtered.length) out.set(name, filtered);
    }
    return out;
  }, [liftSeries, rangeStart]);
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

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

  const allWeights = [...data.weightLogs].sort((a, b) => a.date.localeCompare(b.date));
  const weights = rangeStart ? allWeights.filter((w) => w.date >= rangeStart) : allWeights;
  const lastM = [...data.measurements].sort((a, b) => a.date.localeCompare(b.date)).slice(-1)[0];

  function toggleLift(name: string) {
    if (effectiveSelected.includes(name)) {
      setSelectedLifts(effectiveSelected.filter((n) => n !== name));
    } else if (effectiveSelected.length < MAX_SELECTED_LIFTS) {
      setSelectedLifts([...effectiveSelected, name]);
    }
  }

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
      <WeeklyReview />

      <div className="section-label mb-3 flex items-center justify-between !gap-3">
        <span>Progress Range</span>
        <select
          value={range}
          onChange={(e) => setRange(e.target.value)}
          className="!w-auto max-w-[130px] !py-1 !px-2 !text-[11px] normal-case tracking-normal"
        >
          {RANGE_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="section-label mb-3">Weight Trend</div>
      <div className="card mb-3.5">
        <WeightChart weights={weights} hasHistory={allWeights.length >= 2} />
      </div>

      <div className="card mb-3.5">
        <div className="flex gap-2">
          <input type="number" step="0.1" placeholder="Weight (lb)" value={weightInput} onChange={(e) => setWeightInput(e.target.value)} />
          <button className="btn" onClick={saveWeight}>Log Today&apos;s Weight</button>
        </div>
      </div>

      <div className="section-label mb-3 mt-5 flex items-center justify-between !gap-3">
        <span>Lift Progress</span>
        {effectiveSelected.length > 0 && (
          <button
            className="btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded shrink-0"
            onClick={() => setSelectedLifts([])}
          >
            Clear
          </button>
        )}
      </div>
      <div className="card mb-3.5">
        <LiftProgressChart series={filteredLiftSeries} selected={effectiveSelected} />
      </div>

      <div className="section-label mb-3 mt-5">Personal Records</div>
      {data.personalRecords.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-label text-xs">No PRs logged yet.</div>
      ) : (
        <>
          <p className="font-label text-[11px] text-[var(--muted)] mb-2">Tap a lift to graph it above — pick up to {MAX_SELECTED_LIFTS}.</p>
          {data.personalRecords.map((p) => {
            const chartable = liftSeries.has(p.exerciseName);
            const active = effectiveSelected.includes(p.exerciseName);
            const color = colorForLift(p.exerciseName);
            return (
              <button
                key={p.id}
                type="button"
                disabled={!chartable}
                onClick={() => toggleLift(p.exerciseName)}
                className="card !py-3 !px-4 flex justify-between items-center mb-2 w-full text-left transition-colors disabled:cursor-default"
                style={{
                  borderColor: active ? color : "var(--line)",
                  background: active ? "color-mix(in srgb, " + color + " 10%, var(--surface))" : "var(--surface)",
                }}
              >
                <span className="font-label text-[13px] flex items-center gap-2">
                  {chartable && <span className="w-2.5 h-2.5 rounded-full inline-block shrink-0" style={{ background: color, opacity: active ? 1 : 0.35 }} />}
                  {p.exerciseName}
                </span>
                <span className="font-label text-[11px] uppercase tracking-wide text-[var(--olive)]">
                  {p.weight}lb × {p.reps} — {p.date}
                </span>
              </button>
            );
          })}
        </>
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
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-label text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

type ReviewState =
  | { status: "loading" }
  | { status: "ai"; content: string }
  | { status: "coach"; coachName: string; content: string | null; workoutDate: string | null }
  | { status: "error" };

// If the client has an active coach, their most recent note replaces the AI-generated
// review entirely — a real coach's take beats a generated one whenever one exists.
function WeeklyReview() {
  const [state, setState] = useState<ReviewState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    fetch("/api/coach/my-coaches")
      .then((res) => res.json())
      .then((relationships: { status: string; coach: { name: string }; notes: { content: string; workoutDate: string | null }[] }[]) => {
        const active = relationships.find((r) => r.status === "active");
        if (active) {
          const latest = active.notes[0];
          if (!cancelled) {
            setState({ status: "coach", coachName: active.coach.name, content: latest?.content ?? null, workoutDate: latest?.workoutDate ?? null });
          }
          return;
        }
        return fetch("/api/progress/review").then(async (res) => {
          const json = await res.json();
          if (!res.ok) throw new Error(json.error || "Couldn't load your review");
          if (!cancelled) setState({ status: "ai", content: json.content });
        });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (state.status === "error") return null;

  if (state.status === "coach") {
    return (
      <div className="card mb-3.5 !border-[var(--coach-blue-dim)]">
        <div className="section-label mb-2 !text-[var(--coach-blue)]">Your Coach — {state.coachName}</div>
        {state.content ? (
          <>
            <p className="text-[13px] leading-relaxed">{state.content}</p>
            {state.workoutDate && <p className="font-label text-[10px] text-[var(--muted)] mt-1">re: {formatDate(state.workoutDate)} workout</p>}
          </>
        ) : (
          <p className="font-label text-xs text-[var(--muted)]">No notes yet.</p>
        )}
      </div>
    );
  }

  return (
    <div className="card mb-3.5 !border-[var(--olive)]">
      <div className="section-label mb-2 !text-[var(--olive)]">Coach&apos;s Take</div>
      {state.status === "loading" ? (
        <p className="font-label text-xs text-[var(--muted)]">Reviewing your week…</p>
      ) : (
        <p className="text-[13px] leading-relaxed">{state.content}</p>
      )}
    </div>
  );
}
