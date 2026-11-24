import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma here only ever touches the system's OWN database (DATABASE_URL).
// The platform database is read through lib/source-db.ts with plain `pg`.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env["DATABASE_URL"] },
});
