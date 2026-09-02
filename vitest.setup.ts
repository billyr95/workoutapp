// Some tested modules transitively import db/index.ts, which constructs its Neon client from
// DATABASE_URL at module load time (even though the specific functions under test never touch
// the DB). Load .env.local so that construction doesn't throw — same env file `tsx --env-file`
// already relies on for one-off scripts.
try {
  process.loadEnvFile(".env.local");
} catch {
  // No .env.local (e.g. CI without DB secrets) — fine as long as no test imports a DB-backed module.
}
