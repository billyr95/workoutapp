import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

// Turns "jane.doe+lifts@gmail.com" into a valid, unique username for a first-time Google sign-in.
async function usernameFromEmail(email: string): Promise<string> {
  const base = (email.split("@")[0].toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 16) || "user").padEnd(3, "0");
  const existing = await db.select().from(schema.users);
  if (!existing.some((u) => u.username === base)) return base;
  let candidate = base;
  do {
    candidate = `${base}${Math.floor(1000 + Math.random() * 9000)}`.slice(0, 20);
  } while (existing.some((u) => u.username === candidate));
  return candidate;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/auth/sign-in" },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email));
        if (!user || !user.passwordHash) return null;

        const valid = await compare(password, user.passwordHash);
        if (!valid) return null;

        return { id: String(user.id), email: user.email, name: user.name, username: user.username, isCoach: user.isCoach, isAdmin: user.isAdmin };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      const [existing] = await db.select().from(schema.users).where(eq(schema.users.email, user.email));
      if (existing) return true;

      const username = await usernameFromEmail(user.email);
      const [newUser] = await db
        .insert(schema.users)
        .values({
          name: user.name || username,
          username,
          email: user.email,
          avatarUrl: user.image ?? null,
          heightFeet: 0,
          heightInches: 0,
          startingWeight: 0,
          goalWeight: 0,
          goalText: "",
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
        })
        .returning();

      // New accounts auto-follow the app owner so they can see how it all works.
      const [billy] = await db.select().from(schema.users).where(eq(schema.users.username, "billsner"));
      if (billy) {
        await db.insert(schema.follows).values({
          followerId: newUser.id,
          followingId: billy.id,
          createdAt: new Date().toISOString(),
        });
      }
      return true;
    },
    async jwt({ token, user, account }) {
      if (account?.provider === "google" && token.email) {
        const [dbUser] = await db.select().from(schema.users).where(eq(schema.users.email, token.email));
        if (dbUser) {
          token.userId = String(dbUser.id);
          token.username = dbUser.username;
          token.isCoach = dbUser.isCoach;
          token.isAdmin = dbUser.isAdmin;
        }
        return token;
      }
      if (user) {
        token.userId = user.id;
        token.username = (user as { username: string | null }).username;
        token.isCoach = (user as { isCoach: boolean }).isCoach;
        token.isAdmin = (user as { isAdmin: boolean }).isAdmin;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.username = (token.username as string | null) ?? null;
        session.user.isCoach = (token.isCoach as boolean) ?? false;
        session.user.isAdmin = (token.isAdmin as boolean) ?? false;
      }
      return session;
    },
  },
});
