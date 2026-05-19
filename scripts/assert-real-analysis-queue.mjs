import { readFileSync } from "node:fs";

const store = readFileSync("src/store.ts", "utf8");
const bottomQueue = readFileSync("src/components/BottomQueue.tsx", "utf8");

const askGemmaStart = sliceBetween(store, "askGemma: async", "try {");
const askGemmaSuccess = sliceBetween(store, "const answer = await runGemmaQuestion", "} catch");

const checks = [
  ["Gemma prompts create a dedicated active analysis task", store.includes("createAnalysisTask") && askGemmaStart.includes("activeAnalysis") && askGemmaStart.includes("analysisId")],
  ["Gemma completion updates the same task instead of first item", store.includes("completeAnalysisTask") && askGemmaSuccess.includes("analysisId") && !askGemmaSuccess.includes("index === 0")],
  ["Gemma cancellation/failure resolves the active task", store.includes("resolveAnalysisTask") && store.includes("Inference cancelled by operator.")],
  ["Analysis labels are derived from real prompt context", store.includes("analysisLabelForQuestion") && store.includes("analysisSourceForQueue")],
  ["Footer reports idle as an explicit runtime state", bottomQueue.includes("No active local analysis") && bottomQueue.includes("activeAnalysis.length")],
  [
    "Footer includes Virion demo disclosure and no warranties notice",
    bottomQueue.includes("developed by virion.ai") &&
      bottomQueue.includes("capsules.run") &&
      bottomQueue.includes("open source protocol") &&
      bottomQueue.includes("No warranties"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Real analysis queue guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Real analysis queue guard passed.");

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) return "";
  const end = source.indexOf(endNeedle, start);
  return source.slice(start, end === -1 ? undefined : end);
}
