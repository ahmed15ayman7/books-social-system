/** npm run popularity -- 500   (بيحدّث شهرة أقدم 500 كتاب) */
import "dotenv/config";
import { db } from "../lib/db";
import { booksNeedingStats } from "../lib/source-db";
import { fetchOne } from "../lib/popularity";

async function main() {
  const max = Number(process.argv[2] ?? 200);
  const s = await db.setting.findUnique({ where: { id: 1 } });
  const list = await booksNeedingStats(max, 30, s?.minYear ?? 2018);
  let found = 0;
  for (const [i, b] of list.entries()) {
    if (await fetchOne(b)) found++;
    if ((i + 1) % 25 === 0) console.log(`${i + 1}/${list.length} · لقينا ${found}`);
    await new Promise((r) => setTimeout(r, 300));
  }
  console.log(`done: ${list.length} books, ${found} with signal`);
  process.exit(0);
}
main();
