import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// GET — every flagged program edit across all of this coach's clients, newest first — a direct
// shortcut to what needs review instead of having to open each client and scroll their history.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isCoach) return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  const coachId = Number(session.user.id);

  const [allEditLog, allUsers] = await Promise.all([db.select().from(schema.programEditLog), db.select().from(schema.users)]);
  const userById = new Map(allUsers.map((u) => [u.id, u]));

  const flagged = allEditLog
    .filter((e) => e.coachId === coachId && e.flagged)
    .map((e) => {
      const client = userById.get(e.clientId);
      return {
        id: e.id,
        summary: e.summary,
        flagNote: e.flagNote,
        createdAt: e.createdAt,
        client: client ? { username: client.username, name: client.name, avatarUrl: client.avatarUrl } : null,
      };
    })
    .filter((e): e is typeof e & { client: NonNullable<(typeof e)["client"]> } => e.client !== null)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return NextResponse.json(flagged);
}
