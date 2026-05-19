import { readFileSync } from "node:fs";

const runtime = readFileSync("src/lib/localRuntime.ts", "utf8");
const store = readFileSync("src/store.ts", "utf8");
const rail = readFileSync("src/components/LeftRail.tsx", "utf8");

const checks = [
  ["Gemma prompt defines a decision gate schema", runtime.includes("DECISION_GATE_RESPONSE_SCHEMA") && runtime.includes("decision_gates")],
  ["Gemma prompt requests JSON decision gates", runtime.includes("DECISION GATES") && runtime.includes("severity") && runtime.includes("evidence")],
  ["Store extracts decision gates from Gemma responses", store.includes("extractDecisionGates") && store.includes("appendDecisionGateTasks")],
  ["Decision gates are stored as gemma4 operator tasks", store.includes('source: "gemma4"') && store.includes("decision_gates_generated")],
  ["Decision gate ledger event is preserved with inference event", store.includes("const artifacts = applyGemmaAnswerArtifacts") && store.includes("artifacts.ledger ?? current.ledger")],
  ["Left rail renders populated decision gates", rail.includes("tasks.map") && rail.includes("(meta: gemma4)")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Decision gate schema guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Decision gate schema guard passed.");
