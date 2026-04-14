import xlsx from "xlsx";

const workbookPath = "src/excel/Levels.xlsx";
const workbook = xlsx.readFile(workbookPath);
const sheetName = workbook.SheetNames.includes("Levels") ? "Levels" : workbook.SheetNames[0];
if (!sheetName) throw new Error("No worksheet found in Levels.xlsx");

const sheet = workbook.Sheets[sheetName];
const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });
const normalize = (value) => String(value ?? "").trim().toLowerCase();

const headerRowIndex = rows.findIndex((row) => Array.isArray(row) && row.some((cell) => normalize(cell) === "id"));
if (headerRowIndex < 0) throw new Error("Header row with 'id' not found");

const headers = rows[headerRowIndex];
const columnIndex = (name) => headers.findIndex((cell) => normalize(cell) === name);

const idCol = columnIndex("id");
const difficultyCol = columnIndex("difficulty");
const inTheoryStepCol = columnIndex("intheorystep");
const stepCol = columnIndex("step");

if (idCol < 0 || difficultyCol < 0 || inTheoryStepCol < 0 || stepCol < 0) {
  throw new Error("Missing one of required columns: id, difficulty, inTheoryStep, step");
}

let updated = 0;
for (let row = headerRowIndex + 1; row < rows.length; row += 1) {
  const current = rows[row];
  if (!Array.isArray(current)) continue;

  const idValue = current[idCol];
  if (idValue === undefined || idValue === null || String(idValue).trim() === "") continue;

  const difficultyAddr = xlsx.utils.encode_cell({ r: row, c: difficultyCol });
  const inTheoryStepAddr = xlsx.utils.encode_cell({ r: row, c: inTheoryStepCol });
  const stepAddr = xlsx.utils.encode_cell({ r: row, c: stepCol });

  const formula = `IF(LOWER(${difficultyAddr})="easy",${inTheoryStepAddr}+3,IF(LOWER(${difficultyAddr})="medium",${inTheoryStepAddr}+2,IF(LOWER(${difficultyAddr})="hard",${inTheoryStepAddr}+1,"")))`;
  sheet[stepAddr] = { t: "n", f: formula };
  updated += 1;
}

xlsx.writeFile(workbook, workbookPath);
console.log(`Applied step formulas to ${updated} rows in ${workbookPath}`);
