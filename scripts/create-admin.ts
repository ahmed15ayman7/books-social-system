/** npm run create-admin -- email@domain.com "كلمة السر" "الاسم" */
import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { systemDbProblem } from "../lib/system-db-guard";

async function main() {
  const [email, password, name = ""] = process.argv.slice(2);
  if (!email || !password || password.length < 8) {
    console.error('الاستخدام: npm run create-admin -- email "password (8+)" "name"');
    process.exit(1);
  }
  const problem = await systemDbProblem();
  if (problem) {
    console.error(problem);
    process.exit(2);
  }
  const passwordHash = await bcrypt.hash(password, 12);
  await db.adminUser.upsert({
    where: { email: email.toLowerCase() },
    update: { passwordHash, name },
    create: { email: email.toLowerCase(), passwordHash, name },
  });
  console.log(`admin ready: ${email}`);
}
main().finally(() => db.$disconnect());
