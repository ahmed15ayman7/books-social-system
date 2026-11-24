/** فحص قاعدة السيستم قبل الـmigrations (docker-entrypoint.sh) */
import "dotenv/config";
import { systemDbProblem } from "../lib/system-db-guard";

systemDbProblem()
  .then((problem) => {
    if (problem) {
      console.error(problem);
      process.exit(2);
    }
    console.log("system db ok");
  })
  .catch((e) => {
    console.error(`فحص قاعدة السيستم فشل: ${(e as Error).message}`);
    process.exit(1);
  });
