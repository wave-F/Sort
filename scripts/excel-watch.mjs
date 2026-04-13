import path from "node:path";
import process from "node:process";
import chokidar from "chokidar";
import { syncAllExcel } from "./excel-sync.mjs";

const projectRoot = process.cwd();
const watchPath = path.join(projectRoot, "src", "excel");

let pendingTimer = null;
let syncing = false;

function scheduleSync(reason) {
  if (pendingTimer) {
    clearTimeout(pendingTimer);
  }

  pendingTimer = setTimeout(() => {
    if (syncing) {
      scheduleSync(reason);
      return;
    }
    syncing = true;
    try {
      console.log(`[excel:watch] change detected (${reason}), syncing...`);
      syncAllExcel(projectRoot);
      console.log("[excel:watch] sync complete");
    } catch (error) {
      console.error("[excel:watch] sync failed:", error);
    } finally {
      syncing = false;
    }
  }, 180);
}

syncAllExcel(projectRoot);

const watcher = chokidar.watch(path.join(watchPath, "**/*.xlsx"), {
  ignoreInitial: true,
  awaitWriteFinish: { stabilityThreshold: 250, pollInterval: 50 },
});

watcher.on("add", (file) => scheduleSync(`add ${path.basename(file)}`));
watcher.on("change", (file) => scheduleSync(`change ${path.basename(file)}`));
watcher.on("unlink", (file) => scheduleSync(`remove ${path.basename(file)}`));
watcher.on("error", (error) => console.error("[excel:watch] watcher error:", error));
