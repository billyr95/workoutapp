"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useAppData } from "@/lib/useAppData";
import LoadingMark from "@/components/LoadingMark";
import ThemeToggle from "@/components/ThemeToggle";
import { formatDate } from "@/components/ProgressCharts";

export default function ProfilePage() {
  const { data, loading, refetch } = useAppData();
  const { data: session } = useSession();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [goalForm, setGoalForm] = useState<{ goalText?: string; heightFeet?: string; heightInches?: string; startingWeight?: string; goalWeight?: string }>({});
  const [savingGoal, setSavingGoal] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  async function deleteAccount() {
    setDeleting(true);
    const res = await fetch("/api/account", { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      flash("Couldn't delete your account — try again");
      return;
    }
    await signOut({ callbackUrl: "/auth/sign-in" });
  }

  if (loading || !data) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

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

  async function saveGoal() {
    setSavingGoal(true);
    await fetch("/api/profile/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        goalText: goalForm.goalText ?? u.goalText,
        heightFeet: Number(goalForm.heightFeet ?? u.heightFeet),
        heightInches: Number(goalForm.heightInches ?? u.heightInches),
        startingWeight: Number(goalForm.startingWeight ?? u.startingWeight),
        goalWeight: Number(goalForm.goalWeight ?? u.goalWeight),
      }),
    });
    setSavingGoal(false);
    await refetch();
    flash("Goal updated");
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
          {u.username && <div className="font-label text-xs text-[var(--chalk-dim)]">@{u.username}</div>}
          <button
            className="font-label text-[10px] text-[var(--muted)] hover:text-[var(--chalk)] mt-1"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading…" : "Change photo"}
          </button>
        </div>
      </div>

      {u.username && (
        <Link href={`/u/${u.username}`} className="block card mb-4 text-center hover:border-[var(--chalk-dim)]">
          <span className="font-label text-xs text-[var(--chalk)]">View my public profile →</span>
        </Link>
      )}

      {session?.user?.isCoach && (
        <Link href="/coaching" className="block card mb-4 text-center !border-[var(--coach-blue-dim)] hover:!border-[var(--coach-blue)]">
          <span className="font-label text-xs text-[var(--coach-blue)]">Coaching Dashboard →</span>
        </Link>
      )}

      {session?.user?.isAdmin && (
        <Link href="/admin/invites" className="block card mb-4 text-center hover:border-[var(--chalk-dim)]">
          <span className="font-label text-xs text-[var(--chalk)]">Coach Invite Codes →</span>
        </Link>
      )}

      <CoachSection />

      <div className="section-label mb-3">Appearance</div>
      <div className="card mb-4">
        <ThemeToggle />
      </div>

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
        <div className="mb-2">
          <input
            placeholder="Goal (e.g. Build muscle, lose fat)"
            defaultValue={u.goalText}
            onChange={(e) => setGoalForm({ ...goalForm, goalText: e.target.value })}
          />
        </div>
        <div className="flex gap-2 mb-2">
          <input
            type="number"
            placeholder="Height (ft)"
            defaultValue={u.heightFeet}
            onChange={(e) => setGoalForm({ ...goalForm, heightFeet: e.target.value })}
          />
          <input
            type="number"
            placeholder="Height (in)"
            defaultValue={u.heightInches}
            onChange={(e) => setGoalForm({ ...goalForm, heightInches: e.target.value })}
          />
        </div>
        <div className="flex gap-2 mb-3">
          <input
            type="number"
            step="0.1"
            placeholder="Starting weight (lb)"
            defaultValue={u.startingWeight}
            onChange={(e) => setGoalForm({ ...goalForm, startingWeight: e.target.value })}
          />
          <input
            type="number"
            step="0.1"
            placeholder="Goal weight (lb)"
            defaultValue={u.goalWeight}
            onChange={(e) => setGoalForm({ ...goalForm, goalWeight: e.target.value })}
          />
        </div>
        <button className="btn-ghost w-full rounded" onClick={saveGoal} disabled={savingGoal}>
          {savingGoal ? "Saving…" : "Save Goal"}
        </button>
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
        <div className="card text-center text-[var(--muted)] font-label text-xs">No cardio logged yet.</div>
      ) : (
        data.cardioLogs.slice(0, 5).map((c) => (
          <div key={c.id} className="card !py-3 !px-4 flex justify-between mb-2">
            <span className="font-label text-xs">{c.date} · {c.type}</span>
            <span className="font-label text-xs text-[var(--chalk-dim)]">
              {c.durationMinutes}min{c.calories ? ` · ${c.calories}cal` : ""}
            </span>
          </div>
        ))
      )}

      <div className="section-label mb-3 mt-5 !text-[var(--red)]">Danger Zone</div>
      <div className="card !border-[var(--red-dim)]">
        {!confirmingDelete ? (
          <button className="btn-ghost w-full rounded !text-[var(--red)] !border-[var(--red-dim)]" onClick={() => setConfirmingDelete(true)}>
            Delete Account
          </button>
        ) : (
          <>
            <p className="text-[13px] leading-relaxed mb-3">
              This permanently deletes your account and everything in it — workouts, logs, programs, weigh-ins, coaching
              history. There&apos;s no undoing this.
            </p>
            <div className="flex gap-2">
              <button className="btn-ghost flex-1 rounded" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                Cancel
              </button>
              <button
                className="btn flex-1 !bg-[var(--red)] !border-[var(--red)]"
                onClick={deleteAccount}
                disabled={deleting}
              >
                {deleting ? "Deleting…" : "Yes, Delete Everything"}
              </button>
            </div>
          </>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-label text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}

type CoachRelationship = {
  id: number;
  status: "pending" | "active";
  coach: { username: string | null; name: string; avatarUrl: string | null };
  notes: { id: number; content: string; createdAt: string; workoutDate: string | null }[];
  editLog: { id: number; summary: string; createdAt: string; flagged: boolean; flagNote: string | null }[];
};

function CoachSection() {
  const [relationships, setRelationships] = useState<CoachRelationship[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const refetch = () => {
    fetch("/api/coach/my-coaches")
      .then((res) => res.json())
      .then(setRelationships);
  };

  useEffect(() => {
    refetch();
  }, []);

  async function respond(id: number, accept: boolean) {
    setBusyId(id);
    await fetch(`/api/coach/invites/${id}/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accept }),
    });
    setBusyId(null);
    refetch();
  }

  async function flag(logId: number) {
    setBusyId(logId);
    await fetch(`/api/coach/edit-log/${logId}/flag`, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    setBusyId(null);
    refetch();
  }

  if (!relationships || relationships.length === 0) return null;

  const pending = relationships.filter((r) => r.status === "pending");
  const active = relationships.filter((r) => r.status === "active");

  return (
    <>
      {pending.map((r) => (
        <div key={r.id} className="card !border-[var(--coach-blue-dim)] mb-4">
          <div className="section-label mb-2 !text-[var(--coach-blue)]">Coach Invite</div>
          <p className="text-[13px] mb-3"><strong>{r.coach.name}</strong> (@{r.coach.username}) wants to coach you.</p>
          <div className="flex gap-2">
            <button className="btn !bg-[var(--coach-blue)] !text-white flex-1" onClick={() => respond(r.id, true)} disabled={busyId === r.id}>Accept</button>
            <button className="btn-ghost rounded flex-1" onClick={() => respond(r.id, false)} disabled={busyId === r.id}>Decline</button>
          </div>
        </div>
      ))}

      {active.map((r) => (
        <div key={r.id} className="card !border-[var(--coach-blue-dim)] mb-4">
          <div className="section-label mb-2 !text-[var(--coach-blue)]">Your Coach — {r.coach.name}</div>

          {r.notes.length > 0 && (
            <div className="mb-3">
              {r.notes.map((n) => (
                <div key={n.id} className="border-t border-[var(--line)] pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
                  <p className="text-[13px] leading-relaxed">{n.content}</p>
                  {n.workoutDate && <p className="font-label text-[10px] text-[var(--muted)] mt-0.5">re: {formatDate(n.workoutDate)} workout</p>}
                </div>
              ))}
            </div>
          )}

          {r.editLog.length > 0 && (
            <div>
              <div className="font-label text-[11px] text-[var(--chalk-dim)] mb-1.5">Program changes</div>
              {r.editLog.map((e) => (
                <div key={e.id} className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="font-label text-[12px] text-[var(--chalk-dim)]">{e.summary}</span>
                  {e.flagged ? (
                    <span className="font-label text-[10px] uppercase tracking-wide text-[var(--red)] shrink-0">Flagged</span>
                  ) : (
                    <button
                      className="font-label text-[10px] uppercase tracking-wide text-[var(--muted)] hover:text-[var(--red)] shrink-0"
                      onClick={() => flag(e.id)}
                      disabled={busyId === e.id}
                    >
                      Flag
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </>
  );
}

function PrivacyToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5 cursor-pointer">
      <span className="font-label text-xs text-[var(--chalk-dim)]">{label}</span>
      <input type="checkbox" checked={checked} onChange={onChange} className="!w-auto" />
    </label>
  );
}

function MacroBar({ label, value, scale, unit }: { label: string; value: number; scale: number; unit?: string }) {
  const pct = Math.min(100, Math.round((value / scale) * 100));
  return (
    <div className="mb-3">
      <div className="flex justify-between font-label text-xs">
        <span className="text-[var(--chalk-dim)]">{label}</span>
        <span>{value}{unit || ""}</span>
      </div>
      <div className="h-1.5 bg-[var(--surface2)] rounded overflow-hidden my-1.5">
        <div className="h-full bg-[var(--red)]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
