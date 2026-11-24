/** npm run db:seed — صف الإعدادات */
import "dotenv/config";
import { db } from "../lib/db";

async function main() {
  await db.setting.upsert({ where: { id: 1 }, update: {}, create: { id: 1 } });
  console.log("seed done");
}
main().finally(() => db.$disconnect());
