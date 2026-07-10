"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useAppData } from "@/lib/useAppData";

export default function ProfilePage() {
  const { data, loading, refetch } = useAppData();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  if (loading || !data) return <p className="font-mono text-sm text-[var(--muted)]">Loading…</p>;

  const u = data.user;

  async function uploadPhoto(file: File) {
    setUploading(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/profile/photo", { method: "POST", body: form });
    const json = await res.json();
    setUploading(false);
    if (!res.ok) {
      flash(json.error || "Upload failed");
      return;
    }
    await refetch();
    flash("Photo updated");
  }

  async function toggleSetting(key: "showWeight" | "showProgram" | "showMaxes" | "showWorkoutDays") {
    await fetch("/api/profile/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: !u[key] }),
    });
    await refetch();
  }

  return (
    <div>
      <div className="card mb-4 flex items-center gap-3.5">
        <button
          className="w-16 h-16 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          {u.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
          ) : (
            <span className="font-display text-2xl text-[var(--muted)]">{u.name[0]?.toUpperCase()}</span>
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) uploadPhoto(file);
            e.target.value = "";
          }}
        />
        <div className="min-w-0">
          <div className="font-display text-xl truncate">{u.name}</div>
          {u.username && <div className="font-mono text-xs text-[var(--chalk-dim)]">@{u.username}</div>}
          <button
            className="font-mono text-[10px] text-[var(--muted)] hover:text-[var(--chalk)] mt-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
        </div>
      </div>

      {u.username && (
        <Link href={`/u/${u.username}`} className="block card mb-4 text-center hover:border-[var(--chalk-dim)]">
          <span className="font-mono text-xs text-[var(--chalk)]">View my public profile →</span>
        </Link>
      )}

      <div className="section-label mb-3">Public Profile Visibility</div>
      <div className="card mb-4">
        <PrivacyToggle label="Current weight" checked={u.showWeight} onChange={() => toggleSetting("showWeight")} />
        <PrivacyToggle label="Workout program" checked={u.showProgram} onChange={() => toggleSetting("showProgram")} />
        <PrivacyToggle label="Maxes (PRs)" checked={u.showMaxes} onChange={() => toggleSetting("showMaxes")} />
        <PrivacyToggle
          label="Workout days & history"
          checked={u.showWorkoutDays}
          onChange={() => toggleSetting("showWorkoutDays")}
        />
      </div>

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

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-mono text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

function PrivacyToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5 cursor-pointer">
      <span className="font-mono text-xs text-[var(--chalk-dim)]">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="!w-auto" />
    </label>
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
