import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { convertLevels } from "./convert-levels.mjs";

const converters = [
  { name: "Levels.xlsx", output: "src/config/levels.json", run: convertLevels },
];

function collectExcelFiles(dirPath) {
  const files = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectExcelFiles(fullPath));
      continue;
    }
    if (entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx")) {
      files.push(fullPath);
    }
  }
  return files;
}

export function syncAllExcel(projectRoot = process.cwd()) {
  const excelDir = path.join(projectRoot, "src", "excel");

  if (fs.existsSync(excelDir)) {
    const allExcel = collectExcelFiles(excelDir).map((f) => path.basename(f));
    const handled = new Set(converters.map((c) => c.name.toLowerCase()));
    for (const fileName of allExcel) {
      if (fileName.startsWith("~$")) {
        continue;
      }
      if (!handled.has(fileName.toLowerCase())) {
        console.warn(`[excel:sync] no converter configured for ${fileName}`);
      }
    }
  }

  for (const converter of converters) {
    converter.run(projectRoot);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  syncAllExcel(process.cwd());
}
