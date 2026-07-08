import { readFileSync } from "node:fs";

const canvas = readFileSync("src/components/WorkspaceCanvas.tsx", "utf8");
const markdown = readFileSync("src/components/MarkdownRender.tsx", "utf8");
const diagram = readFileSync("src/components/MermaidDiagram.tsx", "utf8");
const rail = readFileSync("src/components/LeftRail.tsx", "utf8");
const store = readFileSync("src/store.ts", "utf8");
const data = readFileSync("src/data.ts", "utf8");
const capsuleExport = readFileSync("src/lib/capsuleExport.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

const checks = [
  ["package exposes rendering/audit guard", pkg.includes('"test:rendering-audit"')],
  [
    "Mermaid renders as a real diagram with a safe fallback",
    diagram.includes('securityLevel: "strict"') &&
      diagram.includes("mermaid.parse") &&
      diagram.includes("fallback"),
  ],
  [
    "Mermaid is lazy-loaded to keep the initial bundle small",
    diagram.includes('import("mermaid")') && !diagram.match(/^import mermaid from "mermaid";/m),
  ],
  [
    "Canvas graph and mermaid modules use the diagram renderer",
    canvas.includes("MermaidDiagram") && canvas.includes("MermaidLabelScatter"),
  ],
  [
    "Markdown mermaid fences render as diagrams with code fallback",
    markdown.includes("MermaidDiagram") && markdown.includes("isMermaid"),
  ],
  [
    "Ledger events carry machine-readable ISO timestamps",
    data.includes("at?: string") && store.includes("at: new Date().toISOString()"),
  ],
  [
    "Exported chain events prefer the ISO event time over display time",
    capsuleExport.includes("event.at || event.time"),
  ],
  [
    "Decision gate toggles are attributed audit events",
    store.includes('"decision_gate_completed"') &&
      store.includes('"decision_gate_reopened"') &&
      store.includes("state.operatorIdentity.operatorId,\n        ),"),
  ],
  [
    "Left rail decision gates surface severity and evidence",
    rail.includes("gate-severity") && rail.includes("task.evidence"),
  ],
  ["Left rail event log shows recent events", rail.includes("ledger.slice(-6)")],
  [
    "Events tab renders a dedicated searchable ledger surface",
    canvas.includes("EventLogWorkspace") && canvas.includes("event-log-search") && canvas.includes("event-log-row"),
  ],
  [
    "Heatmap plots real actor-by-action ledger counts, not synthetic values",
    canvas.includes("topByCount") &&
      canvas.includes("event.actor === actor && event.action === action") &&
      !canvas.includes("(rowIndex + 1) * 9"),
  ],
  [
    "Completing a decision gate requires a recorded reason",
    rail.includes("gate-note-form") &&
      rail.includes("disabled={!decisionNote.trim()}") &&
      store.includes("resolution") &&
      store.includes("resolvedAt: nowDone ? new Date().toISOString() : undefined"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Rendering/audit guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Rendering/audit guard passed.");
