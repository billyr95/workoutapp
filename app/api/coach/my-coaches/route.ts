import { NextResponse } from "next/server";
import { db, schema } from "@/db";
import { auth } from "@/auth";

// GET — for a regular user: their pending + active coach relationships, each coach's notes
// for them, and the edit log of changes that coach has made to their program.
export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const clientId = Number(session.user.id);

  const [relationships, allUsers, allNotes, allEditLog, allWorkoutLogs] = await Promise.all([
    db.select().from(schema.coachRelationships),
    db.select().from(schema.users),
    db.select().from(schema.coachNotes),
    db.select().from(schema.programEditLog),
    db.select().from(schema.workoutLogs),
  ]);
  const userById = new Map(allUsers.map((u) => [u.id, u]));
  const workoutLogDateById = new Map(allWorkoutLogs.map((l) => [l.id, l.date]));

  const mine = relationships
    .filter((r) => r.clientId === clientId && r.status !== "declined")
    .map((r) => {
      const coach = userById.get(r.coachId);
      return {
        id: r.id,
        status: r.status,
        invitedAt: r.invitedAt,
        coach: coach ? { username: coach.username, name: coach.name, avatarUrl: coach.avatarUrl } : null,
        notes:
          r.status === "active"
            ? allNotes
                .filter((n) => n.coachId === r.coachId && n.clientId === clientId)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
                .map((n) => ({
                  id: n.id,
                  content: n.content,
                  createdAt: n.createdAt,
                  workoutDate: n.workoutLogId != null ? (workoutLogDateById.get(n.workoutLogId) ?? null) : null,
                }))
            : [],
        editLog:
          r.status === "active"
            ? allEditLog
                .filter((e) => e.coachId === r.coachId && e.clientId === clientId)
                .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
            : [],
      };
    })
    .filter((r) => r.coach !== null)
    .sort((a, b) => b.invitedAt.localeCompare(a.invitedAt));

  return NextResponse.json(mine);
}
