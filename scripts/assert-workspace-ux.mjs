import { readFileSync } from "node:fs";

const files = {
  topHud: read("src/components/TopHud.tsx"),
  modeNav: read("src/components/ModeNav.tsx"),
  canvas: read("src/components/WorkspaceCanvas.tsx"),
  command: read("src/components/CommandPanel.tsx"),
  markdown: read("src/components/MarkdownRender.tsx"),
  rail: read("src/components/LeftRail.tsx"),
  runtime: read("src/lib/localRuntime.ts"),
  store: read("src/store.ts"),
  styles: read("src/styles.css"),
};

const checks = [
  ["Top HUD exposes Start Here declaration", files.topHud.includes("Start Here") && files.store.includes("declareEnvironment")],
  ["Start Here affordance is labeled as environment initialization", files.topHud.includes("Environment Init") && files.topHud.includes("Initialize environment") && files.topHud.includes("Initialize Environment")],
  ["Workspace declaration captures capsule name", files.topHud.includes("Capsule Name") && files.store.includes("systemPrompt")],
  ["Navigation uses Events instead of Incidents", files.modeNav.includes('"Events"') && !files.modeNav.includes('"Incidents"')],
  ["Navigation removes Entities and Ledger Events tabs", !files.modeNav.includes('"Entities"') && !files.modeNav.includes('"Ledger Events"')],
  ["Navigation removed temporary dynamic workspace plus control", files.modeNav.includes("agent-nav-button") && !files.modeNav.includes("createDynamicWorkspace") && !files.modeNav.includes("workspace-plus")],
  ["Canvas owns workspace item creation", files.canvas.includes("requestCanvasModule") && files.canvas.includes("Workspace Item Schema")],
  [
    "Command actions create real workspace products",
    files.command.includes("createDecisionGateSurface") &&
      files.command.includes("createCommunicationPlanSurface") &&
      files.command.includes("buildCommandWorkspaceFromQueue") &&
      !files.command.includes("addCanvasModule"),
  ],
  [
    "Canvas item creation queues instead of auto-asking Command",
    files.store.includes("queuedWorkspaceItems") &&
      requestCanvasModuleBody(files.store).includes("workspace_item_queued") &&
      !requestCanvasModuleBody(files.store).includes("askCommand"),
  ],
  ["Canvas module focus queues Command prompt context", files.canvas.includes("focusCanvasModule") && files.runtime.includes("Queued workspace context")],
  ["Command queue renders chips instead of raw schemas", files.command.includes("workspace-queue") && files.command.includes("Queued for Command")],
  ["Command finding correlation creates rose workspace item", files.store.includes("command-finding") && files.store.includes("queue-concern") && files.command.includes("tone-${item.tone}")],
  ["Graph-queued findings render as graph surfaces", files.store.includes("shouldRenderConcernAsGraph") && files.store.includes("titleFromCommandResponse") && files.store.includes('icon: graphRequested ? "graph"')],
  ["Command prompt includes workspace response contract", files.runtime.includes("WORKSPACE_RESPONSE_CONTRACT") && files.runtime.includes("exactly one fenced Mermaid block")],
  ["Command Mermaid responses hydrate queued graph modules", files.store.includes("extractMermaidCode") && files.store.includes("applyGeneratedCodeToQueuedModules") && files.canvas.includes("if (module.code?.trim()) return <MermaidPreview")],
  ["Command markdown and thinking controls exist", files.command.includes("Show thinking") && files.markdown.includes("hideThinkingSections")],
  ["Markdown notes render preview", files.canvas.includes("module-note-preview") && !files.canvas.includes("<textarea")],
  ["Generated concerns are preview-only", files.canvas.includes("module-note-preview-only") && files.store.includes('renderMode: graphRequested ? undefined : "preview"')],
  ["Canvas module controls use traditional window controls", files.canvas.includes("window-min") && files.canvas.includes("window-max") && files.canvas.includes("window-close")],
  ["Start Here environment preloads local infra tools", files.topHud.includes("DEFAULT_ENVIRONMENT_TOOLS") && files.topHud.includes("Capsule protocol primitives")],
  ["Payload primitives are generated on environment declaration", files.store.includes("buildPayloadPrimitives") && files.store.includes("payloadPrimitives: buildPayloadPrimitives") && files.rail.includes("payloadPrimitives.map")],
  [
    "HUD and workspace navigation have clearance",
    files.styles.includes("/* Top HUD shell reset v2 */") &&
      files.styles.includes("grid-template-rows: 112px 42px minmax(0, 1fr) 38px") &&
      files.styles.includes("height: 84px") &&
      files.styles.includes("min-height: 84px") &&
      files.styles.includes("max-height: none"),
  ],
  [
    "Attachments live in left rail",
    files.rail.includes("Payload Assets") &&
      !files.canvas.includes("attachment-lane") &&
      !files.styles.includes("attachment-lane") &&
      !files.styles.includes("attachment-list") &&
      !files.styles.includes("attachment-card"),
  ],
  ["Events are ledger-backed", files.rail.includes("ledger.slice") && !files.rail.includes("incidentEvents")],
  ["Static demo data arrays are not used by canvas", !files.canvas.includes("commandEvidence") && !files.canvas.includes("heatmapRows") && !files.canvas.includes("documentLines")],
  ["User-facing continuity language avoids pith", !files.canvas.includes("Pith") && !files.canvas.includes("pith")],
  ["Footer sits flush at bottom", files.styles.includes("bottom: 0") && files.styles.includes(".bottom-queue.expanded")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Workspace UX guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Workspace UX guard passed.");

function read(path) {
  return readFileSync(path, "utf8");
}

function requestCanvasModuleBody(source) {
  const start = source.indexOf("requestCanvasModule: async");
  const end = source.indexOf("removeQueuedWorkspaceItem:", start);
  return source.slice(start, end);
}
