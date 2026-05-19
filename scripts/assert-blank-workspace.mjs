import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const root = process.cwd();
const srcDir = join(root, "src");
const forbidden = [
  "ransomware",
  "BlackByte",
  "SRV-07",
  "DC-01",
  "FILE-02",
  "j.smith",
  "mimikatz",
  "backupadmin",
  "badupdates",
  "185.220.101.45",
  "32ab6",
  "incident-2026-05-19",
  "IR-42A",
  "0.6-demo-ui",
  "demo hook",
];

function walk(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return walk(path);
    return path;
  });
}

const failures = [];
for (const file of walk(srcDir)) {
  if (!/\.(ts|tsx)$/.test(file)) continue;
  const text = readFileSync(file, "utf8");
  for (const term of forbidden) {
    const index = text.toLowerCase().indexOf(term.toLowerCase());
    if (index === -1) continue;
    const line = text.slice(0, index).split("\n").length;
    failures.push(`${relative(root, file)}:${line} contains "${term}"`);
  }
}

if (failures.length) {
  console.error("Blank workspace guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Blank workspace guard passed: no old demo incident fixtures in src.");
