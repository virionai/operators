import { readFileSync } from "node:fs";

const files = {
  canvas: read("src/components/WorkspaceCanvas.tsx"),
  gemma: read("src/components/GemmaPanel.tsx"),
  rail: read("src/components/LeftRail.tsx"),
  runtime: read("src/lib/localRuntime.ts"),
  store: read("src/store.ts"),
  styles: read("src/styles.css"),
};

const checks = [
  ["canvas modules have grid position state", files.store.includes("grid: CanvasGridPlacement") && files.store.includes("moveCanvasModuleToGrid")],
  ["workspace canvas renders positioned draggable modules", files.canvas.includes("canvas-spatial-layer") && files.canvas.includes("onPointerDown") && files.canvas.includes("moveCanvasModuleToGrid")],
  ["markdown notes are preview-only for operators", !files.canvas.includes("<textarea") && files.canvas.includes("module-note-preview")],
  ["Gemma response hydrates queued modules instead of duplicating concern cards", files.store.includes("hydrateQueuedModulesFromAnswer") && !files.store.includes('title: graphRequested ? "Gemma Concern Graph"') && !files.store.includes('title: graphRequested ? "Gemma Concern Graph" : "Gemma Concern"')],
  ["Mermaid surfaces hide raw source and parse edge labels", files.canvas.includes("labelsFromMermaidCode") && !files.canvas.includes("<summary>Mermaid source</summary>")],
  ["table surfaces render generated markdown tables", files.canvas.includes("rowsFromMarkdownTable") && files.store.includes("applyGeneratedContentToQueuedModules")],
  ["Gemma build accumulates queued component workspace", files.store.includes("buildGemmaWorkspaceFromQueue") && !files.gemma.includes('requestCanvasModule("react-component")')],
  ["decision gates can be queued for Gemma collaboration", files.store.includes("queueDecisionGateForGemma") && files.rail.includes("queueDecisionGateForGemma")],
  ["knowledge graph facts are parsed and deduplicated", files.store.includes("knowledgeFacts") && files.store.includes("extractKnowledgeFacts") && files.runtime.includes("KNOWLEDGE GRAPH FACTS")],
  ["Gemma panel can float and move independently", files.gemma.includes("gemma-floating") && files.gemma.includes("setGemmaPosition")],
  ["primary nav does not expose the removed workflow dropdown", !read("src/components/ModeNav.tsx").includes("workflowModes") && files.store.includes("Gemma Workspace")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Spatial workspace guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Spatial workspace guard passed.");

function read(path) {
  return readFileSync(path, "utf8");
}
