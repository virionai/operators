import { readFileSync } from "node:fs";

const store = readFileSync("src/store.ts", "utf8");
const modeNav = readFileSync("src/components/ModeNav.tsx", "utf8");
const gemmaPanel = readFileSync("src/components/GemmaPanel.tsx", "utf8");
const topHud = readFileSync("src/components/TopHud.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const bottomQueue = readFileSync("src/components/BottomQueue.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");
const expandedFooterBlock = sliceBetween(styles, ".bottom-queue.expanded {", "}");

const checks = [
  ["package exposes final UI additions guard", pkg.includes('"test:final-ui"')],
  [
    "Gemma has workspace mode state",
    store.includes("gemmaWorkspaceMode: boolean") &&
      store.includes("setGemmaWorkspaceMode") &&
      store.includes("gemmaWorkspaceMode: false"),
  ],
  [
    "Navigation exposes Agent without temporary dynamic workspace plus",
    modeNav.includes("agent-nav-button") &&
      modeNav.includes("setGemmaWorkspaceMode(true)") &&
      modeNav.includes("setGemmaWorkspaceMode(false)") &&
      !modeNav.includes("workspace-plus"),
  ],
  [
    "Gemma panel is resizable and starts compact",
    gemmaPanel.includes("gemma-workspace-view") &&
      styles.includes("resize: both") &&
      styles.includes("width: 304px") &&
      styles.includes("height: min(44vh, 520px)"),
  ],
  [
    "Gemma workspace view renders workspace products in chat",
    gemmaPanel.includes("agent-workspace-render") &&
      gemmaPanel.includes("Workspace products") &&
      gemmaPanel.includes("workspaceRenderPreview"),
  ],
  [
    "Blank operational surface defaults near thirty percent width",
    styles.includes(".canvas-spatial-layer .canvas-empty") &&
      styles.includes("width: clamp(286px, 30%, 440px)"),
  ],
  [
    "Runtime identity displays Operators as the application title",
    topHud.includes("<h1>Operators</h1>") &&
      topHud.includes("application-title-lockup") &&
      !topHud.includes("runtime-local-badge"),
  ],
  [
    "Footer disclosure carries application and protocol versions",
    bottomQueue.includes("Operators v0.1.0 Capsules-protocol v0.6.") &&
      !bottomQueue.includes("v0.6.0 Local"),
  ],
  [
    "Footer disclosure is visibly larger",
    bottomQueue.includes("This harness was developed by virion.ai") &&
      styles.includes("font-size: 11px") &&
      styles.includes("font-size: 12px"),
  ],
  [
    "Expanded footer fits content instead of reserving empty space",
    expandedFooterBlock.includes("height: auto") &&
      !expandedFooterBlock.includes("height: 122px"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Final UI additions guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Final UI additions guard passed.");

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) return "";
  const end = source.indexOf(endNeedle, start);
  return source.slice(start, end === -1 ? undefined : end);
}
