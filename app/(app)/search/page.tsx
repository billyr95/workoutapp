"use client";

import { useState } from "react";
import Link from "next/link";

type Result = { username: string | null; name: string; avatarUrl: string | null };

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);

  async function runSearch(q: string) {
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    setLoading(true);
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(q.trim().toLowerCase())}`);
    setResults(await res.json());
    setSearched(true);
    setLoading(false);
  }

  return (
    <div>
      <div className="section-label mb-3">Find Users</div>
      <input
        placeholder="Search by username…"
        value={query}
        onChange={(e) => runSearch(e.target.value)}
        className="mb-4"
      />

      {loading && <p className="font-mono text-xs text-[var(--muted)]">Searching…</p>}

      {!loading && searched && results.length === 0 && (
        <div className="card text-center text-[var(--muted)] font-mono text-xs">No users found.</div>
      )}

      {results.map((r) => (
        <Link
          key={r.username}
          href={`/u/${r.username}`}
          className="card !py-3 !px-3.5 flex items-center gap-3 mb-2 hover:border-[var(--chalk-dim)]"
        >
          <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
            {r.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.avatarUrl} alt={r.name} className="w-full h-full object-cover" />
            ) : (
              <span className="font-display text-sm text-[var(--muted)]">{r.name[0]?.toUpperCase()}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="font-mono text-[13px]">@{r.username}</div>
            <div className="font-mono text-[11px] text-[var(--chalk-dim)] truncate">{r.name}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}
