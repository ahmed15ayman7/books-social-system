import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { systemDbProblem } from "./system-db-guard";

/**
 * DATABASE_URL ممكن يكون قاعدة منفصلة، أو نفس قاعدة المنصة بـschema تانية:
 *   postgresql://user:pass@host:5432/postgres?schema=outreach
 * Prisma هنا بيلمس الـschema دي بس، وجداول المنصة في public مبتتلمسش.
 */
function base() {
  // وقت الـbuild جوه Docker مفيش DATABASE_URL — الاتصال الحقيقي بيحصل وقت التشغيل بس
  const url = new URL(process.env.DATABASE_URL || "postgresql://build:build@localhost:5432/build");
  const schema = url.searchParams.get("schema") ?? undefined;
  url.searchParams.delete("schema");
  const adapter = new PrismaPg({ connectionString: url.toString() }, schema ? { schema } : undefined);
  return new PrismaClient({ adapter });
}

// الفحص بيحصل مرة واحدة قبل أول عملية على أي جدول.
// لو DATABASE_URL بيشاور على جداول المنصة، كل العمليات بتترفض قبل ما توصل للقاعدة.
let guard: Promise<string | null> | null = null;
async function ensureSafe() {
  guard ??= systemDbProblem().catch((e: Error) => {
    guard = null; // خطأ اتصال مؤقت: يتعاد المرة الجاية
    throw e;
  });
  const problem = await guard;
  if (problem) throw new Error(`قاعدة السيستم متوقفة: ${problem}`);
}

function create() {
  return base().$extends({
    query: {
      $allModels: {
        async $allOperations({ args, query }) {
          await ensureSafe();
          return query(args);
        },
      },
    },
  });
}

type Db = ReturnType<typeof create>;
const globalForPrisma = globalThis as unknown as { prisma?: Db };

/** قاعدة السيستم الجديد فقط */
export const db: Db = globalForPrisma.prisma ?? create();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export async function getSettings() {
  return db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
}
