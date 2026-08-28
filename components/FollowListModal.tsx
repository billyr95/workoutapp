"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Connection = {
  id: number;
  username: string | null;
  name: string;
  avatarUrl: string | null;
  isSelf: boolean;
  isFollowing: boolean;
};

export default function FollowListModal({
  username,
  type,
  onClose,
}: {
  username: string;
  type: "followers" | "following";
  onClose: () => void;
}) {
  const [list, setList] = useState<Connection[] | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/users/${username}/${type}`)
      .then((res) => res.json())
      .then(setList);
  }, [username, type]);

  async function toggleFollow(target: Connection) {
    setBusyId(target.id);
    await fetch("/api/follow", {
      method: target.isFollowing ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: target.id }),
    });
    setList((prev) => prev && prev.map((u) => (u.id === target.id ? { ...u, isFollowing: !target.isFollowing } : u)));
    setBusyId(null);
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-start justify-center overflow-y-auto z-50 p-4" onClick={onClose}>
      <div className="card w-full max-w-sm my-8" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <span className="font-display text-xl capitalize">{type}</span>
          <button className="text-[var(--muted)] hover:text-[var(--chalk)] font-label text-sm px-1" onClick={onClose}>✕</button>
        </div>

        {list === null && <p className="font-label text-xs text-[var(--muted)]">Loading…</p>}

        {list !== null && list.length === 0 && (
          <p className="font-label text-xs text-[var(--muted)]">
            {type === "followers" ? "No followers yet." : "Not following anyone yet."}
          </p>
        )}

        {list?.map((u) => (
          <div key={u.id} className="flex items-center gap-3 py-2 first:pt-0 last:pb-0 border-b border-[var(--line)] last:border-b-0">
            <Link href={`/u/${u.username}`} onClick={onClose} className="flex items-center gap-3 min-w-0 flex-1">
              <div className="w-9 h-9 rounded-full overflow-hidden shrink-0 border border-[var(--line)] bg-[var(--surface2)] flex items-center justify-center">
                {u.avatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={u.avatarUrl} alt={u.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-display text-sm text-[var(--muted)]">{u.name[0]?.toUpperCase()}</span>
                )}
              </div>
              <div className="min-w-0">
                <div className="font-label text-[13px] truncate">{u.name}</div>
                <div className="font-label text-[11px] text-[var(--chalk-dim)] truncate">@{u.username}</div>
              </div>
            </Link>
            {!u.isSelf && (
              <button
                className={u.isFollowing ? "btn-ghost !py-1 !px-2.5 !text-[11px] normal-case tracking-normal rounded shrink-0" : "btn !py-1 !px-2.5 !text-[11px] shrink-0"}
                onClick={() => toggleFollow(u)}
                disabled={busyId === u.id}
              >
                {u.isFollowing ? "Following" : "Follow"}
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
