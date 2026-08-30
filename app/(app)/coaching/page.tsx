"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import LoadingMark from "@/components/LoadingMark";
import { withMinDuration } from "@/lib/minDuration";

type ClientRelationship = {
  id: number;
  status: "pending" | "active";
  invitedAt: string;
  client: { username: string | null; name: string; avatarUrl: string | null };
};

export default function CoachingPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [relationships, setRelationships] = useState<ClientRelationship[] | null>(null);
  const [username, setUsername] = useState("");
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && !session.user.isCoach) router.replace("/");
  }, [status, session, router]);

  const refetch = () => {
    const fetchClients = fetch("/api/coach/clients").then((res) => res.json());
    withMinDuration(fetchClients).then(setRelationships);
  };

  useEffect(() => {
    if (status === "authenticated" && session.user.isCoach) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  if (status === "loading" || (status === "authenticated" && !session.user.isCoach) || relationships === null) {
    return (
      <div className="flex justify-center py-16">
        <LoadingMark className="h-10 w-auto" />
      </div>
    );
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setError(null);
    const res = await fetch("/api/coach/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username }),
    });
    const json = await res.json();
    setInviting(false);
    if (!res.ok) {
      setError(json.error || "Couldn't send invite");
      return;
    }
    setUsername("");
    refetch();
  }

  const pending = relationships.filter((r) => r.status === "pending");
  const active = relationships.filter((r) => r.status === "active");

  return (
    <div>
      <div className="section-label mb-3 !text-[var(--coach-blue)]">Coaching</div>

      <form onSubmit={invite} className="card !border-[var(--coach-blue-dim)] mb-4">
        <div className="font-label text-xs text-[var(--chalk-dim)] mb-2">Invite a client</div>
        <div className="flex gap-2">
          <input placeholder="Their username" value={username} onChange={(e) => setUsername(e.target.value.toLowerCase())} required />
          <button type="submit" className="btn !bg-[var(--coach-blue)] !text-white shrink-0" disabled={inviting}>
            {inviting ? "Inviting…" : "Invite"}
          </button>
        </div>
        {error && <p className="font-label text-xs text-[var(--red)] mt-2">{error}</p>}
      </form>

      {pending.length > 0 && (
        <>
          <div className="section-label mb-3 !text-[var(--coach-blue)]">Pending</div>
          {pending.map((r) => (
            <div key={r.id} className="card !py-3 !px-3.5 mb-2 flex items-center gap-3">
              <Avatar name={r.client.name} avatarUrl={r.client.avatarUrl} />
              <div className="min-w-0 flex-1">
                <div className="font-label text-[13px]">{r.client.name}</div>
                <div className="font-label text-[11px] text-[var(--chalk-dim)]">@{r.client.username}</div>
              </div>
              <span className="font-label text-[10px] uppercase tracking-wide text-[var(--muted)]">Waiting</span>
            </div>
          ))}
        </>
      )}

      <div className="section-label mb-3 !text-[var(--coach-blue)]">Clients</div>
      {active.length === 0 && (
        <div className="card text-center text-[var(--muted)] font-label text-xs">No active clients yet.</div>
      )}
      {active.map((r) => (
        <Link
          key={r.id}
          href={`/coaching/${r.client.username}`}
          className="card !py-3 !px-3.5 mb-2 flex items-center gap-3 hover:!border-[var(--coach-blue)]"
        >
          <Avatar name={r.client.name} avatarUrl={r.client.avatarUrl} />
          <div className="min-w-0 flex-1">
            <div className="font-label text-[13px]">{r.client.name}</div>
            <div className="font-label text-[11px] text-[var(--chalk-dim)]">@{r.client.username}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function Avatar({ name, avatarUrl }: { name: string; avatarUrl: string | null }) {
  return (
    <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <span className="font-display text-sm text-[var(--muted)]">{name[0]?.toUpperCase()}</span>
      )}
    </div>
  );
}
