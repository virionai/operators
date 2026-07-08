import { readFileSync } from "node:fs";

const files = {
  canvas: read("src/components/WorkspaceCanvas.tsx"),
  command: read("src/components/CommandPanel.tsx"),
  modeNav: read("src/components/ModeNav.tsx"),
  rail: read("src/components/LeftRail.tsx"),
  store: read("src/store.ts"),
  styles: read("src/styles.css"),
};

const checks = [
  [
    "Knowledge facts render into a visual Knowledge workspace",
    files.canvas.includes("KnowledgeGraphWorkspace") &&
      files.canvas.includes("knowledgeFacts") &&
      files.styles.includes(".knowledge-graph-workspace"),
  ],
  [
    "Payload assets list retrievable workspace canvas items",
    files.rail.includes("canvasModules") &&
      files.rail.includes("focusCanvasModule") &&
      files.rail.includes("payload/workspace") &&
      files.styles.includes(".workspace-asset-list"),
  ],
  [
    "Decision gates can be created when none exist",
    files.store.includes("createDecisionGateSurface") &&
      files.rail.includes("createDecisionGateSurface") &&
      files.rail.includes("gate-empty-actions"),
  ],
  [
    "Command action cards create real workspace products",
    files.store.includes("createCommunicationPlanSurface") &&
      files.command.includes("createDecisionGateSurface") &&
      files.command.includes("createCommunicationPlanSurface") &&
      files.command.includes("buildCommandWorkspaceFromQueue"),
  ],
  [
    "Workflow dropdown is removed from the primary navigation",
    !files.modeNav.includes("workflowModes") &&
      !files.modeNav.includes("setGraphMode") &&
      !files.modeNav.includes("<Workflow"),
  ],
  [
    "Temporary dynamic workspace plus is removed from the menu group",
    !files.modeNav.includes("workspace-plus") && !files.modeNav.includes("createDynamicWorkspace"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Operational surfaces guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Operational surfaces guard passed.");

function read(path) {
  return readFileSync(path, "utf8");
}
