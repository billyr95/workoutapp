"use client";

import { useAppData } from "@/lib/useAppData";

export default function ProfilePage() {
  const { data, loading } = useAppData();
  if (loading || !data) return <p className="font-mono text-sm text-[var(--muted)]">Loading…</p>;

  const u = data.user;

  return (
    <div>
      <div className="section-label mb-3">Goal</div>
      <div className="card mb-4">
        <div className="font-display text-xl">{u.goalText}</div>
        <div className="font-mono text-xs text-[var(--chalk-dim)] mt-1">
          {u.heightFeet}&apos;{u.heightInches}&quot; · Start {u.startingWeight}lb → Goal {u.goalWeight}lb
        </div>
      </div>

      <div className="section-label mb-3">Daily Macros</div>
      <div className="card mb-4">
        <MacroBar label="Calories" value={u.calories} scale={3000} />
        <MacroBar label="Protein" value={u.protein} scale={250} unit="g" />
        <MacroBar label="Carbs" value={u.carbs} scale={300} unit="g" />
        <MacroBar label="Fat" value={u.fat} scale={120} unit="g" />
      </div>

      <div className="section-label mb-3">Recent Cardio</div>
      {data.cardioLogs.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-mono text-xs">No cardio logged yet.</div>
      ) : (
        data.cardioLogs.slice(0, 5).map((c) => (
          <div key={c.id} className="card !py-3 !px-4 flex justify-between mb-2">
            <span className="font-mono text-xs">{c.date} · {c.type}</span>
            <span className="font-mono text-xs text-[var(--chalk-dim)]">
              {c.durationMinutes}min{c.calories ? ` · ${c.calories}cal` : ""}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function MacroBar({ label, value, scale, unit }: { label: string; value: number; scale: number; unit?: string }) {
  const pct = Math.min(100, Math.round((value / scale) * 100));
  return (
    <div className="mb-3">
      <div className="flex justify-between font-mono text-xs">
        <span className="text-[var(--chalk-dim)]">{label}</span>
        <span>{value}{unit || ""}</span>
      </div>
      <div className="h-1.5 bg-[var(--surface2)] rounded overflow-hidden my-1.5">
        <div className="h-full bg-[var(--red)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
