import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";
import { computeClientDashboardStats } from "@/lib/data";

// GET — the coach's client relationships (pending + active), each with the client's public info
// and, for active ones, dashboard stats: activity freshness, adherence, weight trend, flags.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isCoach) return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  const coachId = Number(session.user.id);

  const [relationships, allUsers, allWorkoutLogs, allCardioLogs, allSchedule, allWeightLogs, allEditLog] = await Promise.all([
    db.select().from(schema.coachRelationships),
    db.select().from(schema.users),
    db.select().from(schema.workoutLogs),
    db.select().from(schema.cardioLogs),
    db.select().from(schema.schedule),
    db.select().from(schema.weightLogs),
    db.select().from(schema.programEditLog),
  ]);
  const userById = new Map(allUsers.map((u) => [u.id, u]));

  const mine = relationships
    .filter((r) => r.coachId === coachId && r.status !== "declined")
    .map((r) => {
      const client = userById.get(r.clientId);
      const flaggedCount = allEditLog.filter((e) => e.coachId === coachId && e.clientId === r.clientId && e.flagged).length;
      const stats =
        r.status === "active" && client
          ? computeClientDashboardStats(
              client,
              allWorkoutLogs.filter((l) => l.userId === r.clientId),
              allCardioLogs.filter((c) => c.userId === r.clientId),
              allSchedule.filter((s) => s.userId === r.clientId),
              allWeightLogs.filter((w) => w.userId === r.clientId)
            )
          : null;
      return {
        id: r.id,
        status: r.status,
        invitedAt: r.invitedAt,
        client: client ? { username: client.username, name: client.name, avatarUrl: client.avatarUrl } : null,
        flaggedCount,
        ...stats,
      };
    })
    .filter((r) => r.client !== null)
    .sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));

  return NextResponse.json(mine);
}

// POST — body: { username }. Invite an existing user to become a client (creates a "pending" relationship).
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!session.user.isCoach) return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  const coachId = Number(session.user.id);

  const { username } = await req.json();
  if (typeof username !== "string" || !username.trim()) {
    return NextResponse.json({ error: "Missing username" }, { status: 400 });
  }

  const allUsers = await db.select().from(schema.users);
  const client = allUsers.find((u) => u.username === username.trim().toLowerCase());
  if (!client) return NextResponse.json({ error: "No user found with that username" }, { status: 404 });
  if (client.id === coachId) return NextResponse.json({ error: "You can't invite yourself" }, { status: 400 });

  const existing = await db.select().from(schema.coachRelationships);
  const already = existing.find((r) => r.coachId === coachId && r.clientId === client.id && r.status !== "declined");
  if (already) {
    return NextResponse.json({ error: already.status === "active" ? "Already your client" : "Invite already pending" }, { status: 409 });
  }

  await db.insert(schema.coachRelationships).values({
    coachId,
    clientId: client.id,
    status: "pending",
    invitedAt: new Date().toISOString(),
  });

  return NextResponse.json({ ok: true });
}
