// Deletes ./.data and re-seeds the fictional demo patient. Stop `npm run dev` first.
import { resetDemoData, DATA_DIR } from "../src/lib/db/demo-store";

resetDemoData()
  .then(() => console.log(`Demo data reset in ${DATA_DIR}`))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
