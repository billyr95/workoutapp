// Upserts the 10 sign-up starter programs (db/starterProgramSeeds.ts) by slug — safe to re-run
// after editing a template's data. Run with: npx tsx --env-file=.env.local scripts/seed-starter-programs.ts
import { eq } from "drizzle-orm";
import { db, schema } from "../db";
import { starterProgramSeeds } from "../db/starterProgramSeeds";

async function main() {
  for (const [i, seed] of starterProgramSeeds.entries()) {
    const [existing] = await db.select().from(schema.starterPrograms).where(eq(schema.starterPrograms.slug, seed.slug));
    if (existing) {
      await db
        .update(schema.starterPrograms)
        .set({ name: seed.name, level: seed.level, daysPerWeek: seed.daysPerWeek, data: seed.data, sortOrder: i })
        .where(eq(schema.starterPrograms.id, existing.id));
      console.log(`updated: ${seed.slug}`);
    } else {
      await db.insert(schema.starterPrograms).values({
        slug: seed.slug,
        name: seed.name,
        level: seed.level,
        daysPerWeek: seed.daysPerWeek,
        data: seed.data,
        sortOrder: i,
      });
      console.log(`inserted: ${seed.slug}`);
    }
  }
  console.log(`done — ${starterProgramSeeds.length} starter programs seeded.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
