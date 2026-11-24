/**
 * حماية: بيتأكد إن DATABASE_URL بيشاور على مكان فاضي أو فيه جداول السيستم بس.
 * لو الـschema فيها جداول أو migrations تانية (زي جداول المنصة في public) بيرجع رسالة المشكلة.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";

function ownTables(): Set<string> {
  const dir = join(process.cwd(), "prisma", "migrations");
  const names = new Set<string>(["_prisma_migrations"]);
  for (const m of readdirSync(dir, { withFileTypes: true })) {
    if (!m.isDirectory()) continue;
    const sql = readFileSync(join(dir, m.name, "migration.sql"), "utf8");
    for (const [, t] of sql.matchAll(/CREATE TABLE (?:"[^"]+"\.)?"([^"]+)"/g)) names.add(t);
  }
  return names;
}

/** بيرجع رسالة المشكلة، أو null لو المكان آمن */
export async function systemDbProblem(): Promise<string | null> {
  const raw = process.env.DATABASE_URL;
  if (!raw) return "DATABASE_URL ناقص";
  const url = new URL(raw);
  const schema = url.searchParams.get("schema") || "public";
  url.searchParams.delete("schema");

  const c = new Client({ connectionString: url.toString() });
  await c.connect();
  try {
    const { rows } = await c.query<{ table_name: string }>(
      "select table_name from information_schema.tables where table_schema = $1",
      [schema],
    );
    const own = ownTables();
    const foreign = rows.map((r) => r.table_name).filter((t) => !own.has(t));
    // migrations مش بتاعتنا = الـschema دي بتاعة مشروع تاني (زي المنصة)
    if (rows.some((r) => r.table_name === "_prisma_migrations")) {
      const ours = new Set(
        readdirSync(join(process.cwd(), "prisma", "migrations"), { withFileTypes: true })
          .filter((d) => d.isDirectory())
          .map((d) => d.name),
      );
      const migs = await c.query<{ migration_name: string }>(
        `select migration_name from "${schema.replace(/"/g, '""')}"._prisma_migrations`,
      );
      for (const m of migs.rows) if (!ours.has(m.migration_name)) foreign.push(`migration ${m.migration_name}`);
    }
    if (foreign.length) {
      return (
        `DATABASE_URL بيشاور على schema "${schema}" وفيها جداول مش بتاعة السيستم (${foreign.slice(0, 5).join(", ")}${foreign.length > 5 ? "…" : ""}). ` +
          `لو دي قاعدة المنصة ضيف ?schema=social في آخر اللينك.`
      );
    }
    return null;
  } finally {
    await c.end();
  }
}
