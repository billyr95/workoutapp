"use client";

import { useEffect, useState } from "react";
import type { ProgramData, ProgramExercise, ProgramWorkout } from "@/db/schema";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
type DayType = "Rest" | "Cardio" | "Workout";
type DayDraft = { type: DayType; name: string; category: "Strength" | "Hypertrophy" };
type CommunityExercise = { id: number; name: string; sets: number; repMin: number; repMax: number; restSeconds: number | null; useCount: number };
type CommunityWorkout = { id: number; name: string; exercises: ProgramExercise[]; useCount: number };
type SavedProgram = { id: number; name: string; createdAt: string };

function emptyDays(): Record<string, DayDraft> {
  const out: Record<string, DayDraft> = {};
  for (const d of DAYS) out[d] = { type: "Rest", name: "", category: "Strength" };
  return out;
}

type GeneratedProgram = { id: number; name: string; data: ProgramData; errors: string[] };

async function generateProgram(goals: string): Promise<{ program?: GeneratedProgram; error?: string }> {
  const res = await fetch("/api/programs/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ goals }),
  });
  const json = await res.json();
  if (!res.ok) return { error: json.error ?? "Couldn't generate a program" };
  return { program: { id: json.id, name: json.name, data: json.data, errors: json.errors ?? [] } };
}

async function saveProgram(name: string, data: ProgramData): Promise<{ program?: SavedProgram; errors: string[]; error?: string }> {
  const res = await fetch("/api/programs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data }),
  });
  const json = await res.json();
  if (!res.ok) return { errors: json.errors ?? [], error: json.error ?? "Failed to save program" };
  return { program: { id: json.id, name: json.name, createdAt: json.createdAt }, errors: json.errors ?? [] };
}

// Parses an uploaded XML program file into the raw shape /api/programs validates server-side.
// Browser DOMParser never resolves external entities/DTDs, so this is safe against XXE.
function parseProgramXml(text: string): { name: string | null; data: { schedule: unknown[]; workouts: unknown[] } } {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("That file isn't valid XML.");

  const name = doc.querySelector("program")?.getAttribute("name") || null;

  const schedule = Array.from(doc.querySelectorAll("schedule > day")).map((el) => {
    const type = el.getAttribute("type");
    const workoutType = type === "Rest" ? "Rest" : type === "Cardio" ? "Cardio" : el.getAttribute("workout") ?? "";
    return { day: el.getAttribute("name") ?? "", workoutType, category: el.getAttribute("category") };
  });

  const workouts = Array.from(doc.querySelectorAll("workouts > workout")).map((wEl) => ({
    name: wEl.getAttribute("name") ?? "",
    exercises: Array.from(wEl.querySelectorAll("exercise")).map((eEl) => ({
      name: eEl.getAttribute("name") ?? "",
      sets: eEl.getAttribute("sets"),
      repMin: eEl.getAttribute("repMin"),
      repMax: eEl.getAttribute("repMax"),
      restSeconds: eEl.getAttribute("restSeconds"),
    })),
  }));

  return { name, data: { schedule, workouts } };
}

export default function NewProgramModal({
  onClose,
  onSaved,
  onLoaded,
}: {
  onClose: () => void;
  onSaved: (p: SavedProgram) => void;
  onLoaded?: () => void;
}) {
  const [tab, setTab] = useState<"build" | "xml" | "ai">("build");
  const [name, setName] = useState("");
  const [days, setDays] = useState<Record<string, DayDraft>>(emptyDays);
  const [workouts, setWorkouts] = useState<ProgramWorkout[]>([]);

  const [xmlData, setXmlData] = useState<{ schedule: unknown[]; workouts: unknown[] } | null>(null);
  const [xmlFileName, setXmlFileName] = useState("");
  const [xmlParseError, setXmlParseError] = useState("");

  const [goals, setGoals] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generated, setGenerated] = useState<GeneratedProgram | null>(null);
  const [loadingGenerated, setLoadingGenerated] = useState(false);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [result, setResult] = useState<{ program: SavedProgram; warnings: string[] } | null>(null);

  async function handleGenerate() {
    setGenerateError("");
    if (!goals.trim()) {
      setGenerateError("Describe your goals first.");
      return;
    }
    setGenerating(true);
    const res = await generateProgram(goals.trim());
    setGenerating(false);
    if (!res.program) {
      setGenerateError(res.error ?? "Couldn't generate a program");
      return;
    }
    setGenerated(res.program);
    onSaved({ id: res.program.id, name: res.program.name, createdAt: new Date().toISOString() });
  }

  async function handleLoadGenerated() {
    if (!generated) return;
    setLoadingGenerated(true);
    await fetch("/api/programs/load", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ programId: generated.id }),
    });
    setLoadingGenerated(false);
    onLoaded?.();
    onClose();
  }

  function updateDayType(day: string, type: DayType) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], type } }));
  }
  function updateDayName(day: string, workoutName: string) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], name: workoutName } }));
    setWorkouts((prev) => (prev.some((w) => w.name === workoutName) || !workoutName.trim() ? prev : [...prev, { name: workoutName, exercises: [] }]));
  }
  function updateDayCategory(day: string, category: "Strength" | "Hypertrophy") {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], category } }));
  }
  function updateWorkoutExercises(workoutName: string, exercises: ProgramExercise[]) {
    setWorkouts((prev) => prev.map((w) => (w.name === workoutName ? { ...w, exercises } : w)));
  }
  function applyTemplateToDay(day: string, template: CommunityWorkout) {
    setDays((prev) => ({ ...prev, [day]: { ...prev[day], type: "Workout", name: template.name } }));
    setWorkouts((prev) => {
      if (prev.some((w) => w.name === template.name)) {
        return prev.map((w) => (w.name === template.name ? { ...w, exercises: template.exercises } : w));
      }
      return [...prev, { name: template.name, exercises: template.exercises }];
    });
  }

  async function handleSave() {
    setSaveError("");
    if (!name.trim()) {
      setSaveError("Give the program a name first.");
      return;
    }

    let data: ProgramData | { schedule: unknown[]; workouts: unknown[] };
    if (tab === "build") {
      const schedule = DAYS.map((d) => {
        const entry = days[d];
        if (entry.type === "Rest") return { day: d, workoutType: "Rest", category: null };
        if (entry.type === "Cardio") return { day: d, workoutType: "Cardio", category: null };
        return { day: d, workoutType: entry.name.trim(), category: entry.category };
      });
      const activeNames = new Set(schedule.map((s) => s.workoutType).filter((n) => n !== "Rest" && n !== "Cardio" && n));
      data = { schedule, workouts: workouts.filter((w) => activeNames.has(w.name)) };
    } else {
      if (!xmlData) {
        setSaveError("Choose an XML file first.");
        return;
      }
      data = xmlData;
    }

    setSaving(true);
    const res = await saveProgram(name.trim(), data as ProgramData);
    setSaving(false);
    if (!res.program) {
      setSaveError(res.error ?? "Failed to save program");
      return;
    }
    setResult({ program: res.program, warnings: res.errors });
    onSaved(res.program);
  }

  async function handleFile(file: File) {
    setXmlParseError("");
    setXmlData(null);
    setXmlFileName(file.name);
    try {
      const text = await file.text();
      const parsed = parseProgramXml(text);
      setXmlData(parsed.data);
      if (parsed.name && !name.trim()) setName(parsed.name);
    } catch (err) {
      setXmlParseError(err instanceof Error ? err.message : "Couldn't parse that file.");
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center overflow-y-auto z-50 p-4">
      <div className="card w-full max-w-2xl my-8">
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xl">New Program</span>
          <button className="text-[var(--muted)] hover:text-[var(--chalk)] font-label text-sm px-1" onClick={onClose}>✕</button>
        </div>

        {result ? (
          <div>
            <p className="font-label text-sm text-[var(--olive)] mb-2">Saved &ldquo;{result.program.name}&rdquo; to your library.</p>
            {result.warnings.length > 0 && (
              <div className="mb-3">
                <p className="font-label text-[11px] text-[var(--muted)] mb-1">A few entries were skipped:</p>
                <ul className="font-label text-[11px] text-[var(--muted)] list-disc pl-4 space-y-0.5">
                  {result.warnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            <p className="font-label text-[11px] text-[var(--muted)] mb-3">
              Select it from the dropdown and hit Load whenever you want to switch to it.
            </p>
            <button className="btn !py-1.5 !px-3 !text-[11px]" onClick={onClose}>Done</button>
          </div>
        ) : (
          <>
            {tab !== "ai" && <input placeholder="Program name" value={name} onChange={(e) => setName(e.target.value)} className="mb-3" />}

            <div className="flex gap-2 mb-3.5">
              <button
                className={`btn-ghost !py-1.5 !px-3 !text-[11px] rounded flex-1 ${tab === "build" ? "!border-[var(--red)] !text-[var(--chalk)]" : ""}`}
                onClick={() => setTab("build")}
              >
                Build from scratch
              </button>
              <button
                className={`btn-ghost !py-1.5 !px-3 !text-[11px] rounded flex-1 ${tab === "xml" ? "!border-[var(--red)] !text-[var(--chalk)]" : ""}`}
                onClick={() => setTab("xml")}
              >
                Upload XML
              </button>
              <button
                className={`btn-ghost !py-1.5 !px-3 !text-[11px] rounded flex-1 ${tab === "ai" ? "!border-[var(--red)] !text-[var(--chalk)]" : ""}`}
                onClick={() => setTab("ai")}
              >
                AI Generate
              </button>
            </div>

            {tab === "ai" ? (
              <div>
                {generated ? (
                  <div>
                    <p className="font-label text-sm text-[var(--olive)] mb-1">&ldquo;{generated.name}&rdquo; is saved to your library.</p>
                    {generated.errors.length > 0 && (
                      <ul className="font-label text-[11px] text-[var(--muted)] list-disc pl-4 space-y-0.5 mb-2">
                        {generated.errors.map((w, i) => <li key={i}>{w}</li>)}
                      </ul>
                    )}
                    <div className="grid gap-2 mb-3.5 mt-2">
                      {generated.data.schedule.map((s) => {
                        const workout = generated.data.workouts.find((w) => w.name === s.workoutType);
                        return (
                          <div key={s.day} className="card !py-2.5 !px-3">
                            <div className="flex justify-between items-center">
                              <span className="font-display text-base w-24">{s.day}</span>
                              <span className="font-label text-xs text-[var(--chalk-dim)]">
                                {s.workoutType}{s.category ? ` · ${s.category}` : ""}
                              </span>
                            </div>
                            {workout && workout.exercises.length > 0 && (
                              <div className="mt-1.5 pt-1.5 border-t border-[var(--line)]">
                                {workout.exercises.map((ex) => (
                                  <div key={ex.name} className="font-label text-[11px] text-[var(--chalk-dim)]">
                                    {ex.name} — {ex.sets}×{ex.repMin}{ex.repMax !== ex.repMin ? `-${ex.repMax}` : ""}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-2">
                      <button className="btn !py-1.5 !px-3 !text-[11px]" onClick={handleLoadGenerated} disabled={loadingGenerated}>
                        {loadingGenerated ? "Loading…" : "Load This Program"}
                      </button>
                      <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={() => setGenerated(null)}>
                        Regenerate
                      </button>
                      <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={onClose}>Close</button>
                    </div>
                  </div>
                ) : (
                  <div>
                    <p className="font-label text-[11px] text-[var(--chalk-dim)] mb-2">
                      Describe your goals, equipment, experience, and how many days a week you want to train — the AI designs the full week and saves it to your library.
                    </p>
                    <textarea
                      placeholder="e.g. I want to build bigger arms and a stronger bench, 4 days a week, full gym access, no lower back issues"
                      value={goals}
                      onChange={(e) => setGoals(e.target.value)}
                      rows={4}
                      className="mb-2 resize-none"
                    />
                    {generateError && <p className="font-label text-[11px] text-[var(--red)] mb-2">{generateError}</p>}
                    <div className="flex gap-2">
                      <button className="btn !py-1.5 !px-3 !text-[11px]" onClick={handleGenerate} disabled={generating}>
                        {generating ? "Designing your program…" : "Generate Program"}
                      </button>
                      <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={onClose}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            ) : tab === "build" ? (
              <div>
                <TemplateSearch onApply={applyTemplateToDay} />
                <div className="grid gap-2 mt-3">
                  {DAYS.map((d) => (
                    <DayRow
                      key={d}
                      day={d}
                      value={days[d]}
                      exercises={workouts.find((w) => w.name === days[d].name)?.exercises ?? []}
                      onChangeType={(t) => updateDayType(d, t)}
                      onChangeName={(n) => updateDayName(d, n)}
                      onChangeCategory={(c) => updateDayCategory(d, c)}
                      onChangeExercises={(ex) => updateWorkoutExercises(days[d].name, ex)}
                      onDropTemplate={(template) => applyTemplateToDay(d, template)}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div>
                <input type="file" accept=".xml,text/xml" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} className="mb-2" />
                {xmlFileName && !xmlParseError && xmlData && (
                  <p className="font-label text-[11px] text-[var(--olive)] mb-3">
                    Parsed {xmlFileName}: {xmlData.schedule.length} scheduled day{xmlData.schedule.length === 1 ? "" : "s"}, {xmlData.workouts.length} workout{xmlData.workouts.length === 1 ? "" : "s"}.
                  </p>
                )}
                {xmlParseError && <p className="font-label text-[11px] text-[var(--red)] mb-3">{xmlParseError}</p>}

                <details className="card !bg-[var(--surface2)] mb-1">
                  <summary className="font-label text-[11px] text-[var(--chalk-dim)] cursor-pointer">XML format &amp; example</summary>
                  <div className="font-label text-[11px] text-[var(--muted)] mt-2 space-y-1.5">
                    <p><code>&lt;program name=&quot;...&quot;&gt;</code> — optional, prefills the name field above.</p>
                    <p><code>&lt;schedule&gt;</code> holds up to one <code>&lt;day&gt;</code> per weekday: <code>name</code> (Sunday…Saturday), <code>type</code> (Rest, Cardio, or Workout), <code>workout</code> (required if type=Workout, must match a workout name below), <code>category</code> (Strength or Hypertrophy).</p>
                    <p><code>&lt;workouts&gt;</code> holds <code>&lt;workout name=&quot;...&quot;&gt;</code> elements, each containing <code>&lt;exercise&gt;</code> elements with attributes <code>name</code>, <code>sets</code>, <code>repMin</code>, <code>repMax</code>, and optional <code>restSeconds</code>.</p>
                    <a href="/example-program.xml" download className="text-[var(--red)] inline-block mt-1">Download example.xml</a>
                  </div>
                </details>
              </div>
            )}

            {tab !== "ai" && (
              <>
                {saveError && <p className="font-label text-[11px] text-[var(--red)] mt-3">{saveError}</p>}
                <div className="flex gap-2 mt-3.5">
                  <button className="btn !py-1.5 !px-3 !text-[11px]" onClick={handleSave} disabled={saving}>
                    {saving ? "Saving…" : "Save Program"}
                  </button>
                  <button className="btn-ghost !py-1.5 !px-3 !text-[11px] rounded" onClick={onClose}>Cancel</button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function TemplateSearch({ onApply }: { onApply: (day: string, template: CommunityWorkout) => void }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunityWorkout[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/community/workouts?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div className="card !bg-[var(--surface2)]">
      <p className="font-label text-[11px] text-[var(--chalk-dim)] mb-2">Community workout templates — drag onto a day, or pick one below.</p>
      <input placeholder="Search workouts (e.g. Push Day)" value={query} onChange={(e) => setQuery(e.target.value)} className="mb-2" />
      <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
        {results.length === 0 && <p className="font-label text-[11px] text-[var(--muted)]">No matches yet.</p>}
        {results.map((r) => (
          <div
            key={r.id}
            draggable
            onDragStart={(e) => e.dataTransfer.setData("text/plain", JSON.stringify({ kind: "workout-template", ...r }))}
            className="flex items-center justify-between gap-2 font-label text-[11px] bg-[var(--surface)] border border-[var(--line)] rounded px-2 py-1.5 cursor-grab"
          >
            <span className="truncate">{r.name} <span className="text-[var(--muted)]">· {r.exercises.length} exercises</span></span>
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) onApply(e.target.value, r);
                e.target.value = "";
              }}
              className="!w-auto max-w-[110px] !py-0.5 !px-1 shrink-0"
            >
              <option value="" disabled>Apply to…</option>
              {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

function DayRow({
  day,
  value,
  exercises,
  onChangeType,
  onChangeName,
  onChangeCategory,
  onChangeExercises,
  onDropTemplate,
}: {
  day: string;
  value: DayDraft;
  exercises: ProgramExercise[];
  onChangeType: (t: DayType) => void;
  onChangeName: (n: string) => void;
  onChangeCategory: (c: "Strength" | "Hypertrophy") => void;
  onChangeExercises: (ex: ProgramExercise[]) => void;
  onDropTemplate: (template: CommunityWorkout) => void;
}) {
  return (
    <div
      className="card"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const dropped = JSON.parse(e.dataTransfer.getData("text/plain"));
          if (dropped.kind === "workout-template") onDropTemplate(dropped);
        } catch {}
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="font-display text-lg w-24 shrink-0">{day}</span>
        <div className="flex gap-1.5">
          {(["Rest", "Cardio", "Workout"] as DayType[]).map((t) => (
            <button
              key={t}
              className={`btn-ghost !py-1 !px-2 !text-[10px] rounded ${value.type === t ? "!border-[var(--red)] !text-[var(--chalk)]" : ""}`}
              onClick={() => onChangeType(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {value.type === "Workout" && (
        <div>
          <div className="flex gap-2 mb-2">
            <input placeholder="Workout name" value={value.name} onChange={(e) => onChangeName(e.target.value)} />
            <select value={value.category} onChange={(e) => onChangeCategory(e.target.value as "Strength" | "Hypertrophy")} className="max-w-[130px]">
              <option value="Strength">Strength</option>
              <option value="Hypertrophy">Hypertrophy</option>
            </select>
          </div>
          {value.name.trim() && <WorkoutEditor exercises={exercises} onChange={onChangeExercises} />}
        </div>
      )}
    </div>
  );
}

function WorkoutEditor({ exercises, onChange }: { exercises: ProgramExercise[]; onChange: (ex: ProgramExercise[]) => void }) {
  const [form, setForm] = useState({ name: "", sets: "", repMin: "", repMax: "", restSeconds: "" });
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CommunityExercise[]>([]);

  useEffect(() => {
    const t = setTimeout(() => {
      if (!query.trim()) {
        setResults([]);
        return;
      }
      fetch(`/api/community/exercises?q=${encodeURIComponent(query)}`)
        .then((r) => r.json())
        .then(setResults)
        .catch(() => setResults([]));
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  function addExercise(ex: ProgramExercise) {
    onChange([...exercises, ex]);
  }
  function addFromForm() {
    const sets = Number(form.sets);
    const repMin = Number(form.repMin);
    if (!form.name.trim() || !sets || !repMin) return;
    addExercise({
      name: form.name.trim(),
      sets,
      repMin,
      repMax: Number(form.repMax) || repMin,
      restSeconds: form.restSeconds ? Number(form.restSeconds) : null,
    });
    setForm({ name: "", sets: "", repMin: "", repMax: "", restSeconds: "" });
  }
  function removeExercise(i: number) {
    onChange(exercises.filter((_, idx) => idx !== i));
  }

  return (
    <div
      className="bg-[var(--surface2)] rounded p-2"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        try {
          const dropped = JSON.parse(e.dataTransfer.getData("text/plain"));
          if (dropped.kind === "exercise") addExercise(dropped);
        } catch {}
      }}
    >
      {exercises.map((ex, i) => (
        <div key={i} className="flex items-center gap-2 font-label text-[11px] mb-1">
          <span className="flex-1 truncate">{ex.name}</span>
          <span className="text-[var(--chalk-dim)]">{ex.sets}×{ex.repMin}{ex.repMax !== ex.repMin ? `-${ex.repMax}` : ""}</span>
          <span className="text-[var(--muted)] hover:text-[var(--red)] cursor-pointer px-1" onClick={() => removeExercise(i)}>✕</span>
        </div>
      ))}

      <div className="mt-1.5">
        <input placeholder="Exercise" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="!text-[11px] mb-1.5" />
        <div className="flex gap-1.5">
          <input type="number" placeholder="Sets" value={form.sets} onChange={(e) => setForm({ ...form, sets: e.target.value })} className="!text-[11px]" />
          <input type="number" placeholder="Min" value={form.repMin} onChange={(e) => setForm({ ...form, repMin: e.target.value })} className="!text-[11px]" />
          <input type="number" placeholder="Max" value={form.repMax} onChange={(e) => setForm({ ...form, repMax: e.target.value })} className="!text-[11px]" />
          <button className="btn !py-1 !px-2 !text-[10px] shrink-0" onClick={addFromForm}>Add</button>
        </div>
      </div>

      <input
        placeholder="Search community exercises…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="!text-[11px] mt-1.5"
      />
      {results.length > 0 && (
        <div className="flex flex-col gap-1 mt-1.5 max-h-28 overflow-y-auto">
          {results.map((r) => (
            <div
              key={r.id}
              draggable
              onDragStart={(e) =>
                e.dataTransfer.setData(
                  "text/plain",
                  JSON.stringify({ kind: "exercise", name: r.name, sets: r.sets, repMin: r.repMin, repMax: r.repMax, restSeconds: r.restSeconds })
                )
              }
              className="flex items-center justify-between gap-2 font-label text-[11px] bg-[var(--surface)] border border-[var(--line)] rounded px-2 py-1 cursor-grab"
            >
              <span className="truncate">{r.name} <span className="text-[var(--muted)]">· {r.sets}×{r.repMin}{r.repMax !== r.repMin ? `-${r.repMax}` : ""}</span></span>
              <button
                className="text-[var(--red)] shrink-0"
                onClick={() => addExercise({ name: r.name, sets: r.sets, repMin: r.repMin, repMax: r.repMax, restSeconds: r.restSeconds })}
              >
                + Add
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
