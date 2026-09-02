"use client";

import { useEffect, useState } from "react";

type InviteCode = { id: number; code: string; createdAt: string; usedAt: string | null; usedBy: string | null };

export default function AdminInvitesClient() {
  const [codes, setCodes] = useState<InviteCode[] | null>(null);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/admin/coach-invites")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setCodes(json);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  async function generate() {
    setGenerating(true);
    await fetch("/api/admin/coach-invites", { method: "POST" });
    const res = await fetch("/api/admin/coach-invites");
    setCodes(await res.json());
    setGenerating(false);
    flash("Invite code generated");
  }

  async function copyLink(code: string) {
    const url = `${window.location.origin}/auth/coach-sign-up?code=${code}`;
    try {
      await navigator.clipboard.writeText(url);
      flash("Sign-up link copied");
    } catch {
      flash("Couldn't copy — copy the code manually");
    }
  }

  if (!codes) {
    return <div className="card text-center text-[var(--muted)] font-label text-xs">Loading…</div>;
  }

  return (
    <div>
      <button className="btn w-full mb-3.5" onClick={generate} disabled={generating}>
        {generating ? "Generating…" : "Generate Invite Code"}
      </button>

      {codes.length === 0 ? (
        <div className="card text-center text-[var(--muted)] font-label text-xs">No invite codes yet.</div>
      ) : (
        codes.map((c) => (
          <div key={c.id} className="card !py-3 !px-4 mb-2">
            <div className="flex justify-between items-center gap-3">
              <span className="font-label text-[13px]">{c.code}</span>
              <span className="font-label text-[11px] uppercase tracking-wide text-[var(--muted)]">
                {c.usedBy ? `Used — ${c.usedBy}` : "Unused"}
              </span>
            </div>
            {!c.usedBy && (
              <button
                type="button"
                className="btn-ghost w-full rounded mt-2 !py-1.5 !text-[11px] normal-case tracking-normal"
                onClick={() => copyLink(c.code)}
              >
                Copy Sign-Up Link
              </button>
            )}
          </div>
        ))
      )}

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-[var(--olive)] text-[#101410] font-label text-xs px-4 py-2.5 rounded-md z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
