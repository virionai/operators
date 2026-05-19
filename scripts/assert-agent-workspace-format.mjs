import { readFileSync } from "node:fs";

const css = readFileSync("src/styles.css", "utf8");
const gemmaPanel = readFileSync("src/components/GemmaPanel.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");

const workspaceBlock = sliceBetween(css, "/* Gemma workspace formatting reset */", "/* End Gemma workspace formatting reset */");
const legacyWorkspaceBlock = sliceBetween(css, ".gemma-workspace-view .agent-workspace-render {", "}");

const checks = [
  ["package exposes agent workspace format guard", pkg.includes('"test:agent-workspace"')],
  [
    "workspace product count comes from rendered products",
    gemmaPanel.includes("renderedWorkspaceModules.length") &&
      !gemmaPanel.includes("canvasModules.length} rendered surface"),
  ],
  [
    "agent workspace no longer stretches across many grid rows",
    workspaceBlock.includes(".gemma-workspace-view .agent-workspace-render") &&
      workspaceBlock.includes("align-self: start") &&
      workspaceBlock.includes("max-height: min(62vh, 620px)") &&
      !legacyWorkspaceBlock.includes("grid-row: 1 / span 12") &&
      !legacyWorkspaceBlock.includes("align-self: stretch"),
  ],
  [
    "agent workspace cards are content-sized and internally scrollable",
    workspaceBlock.includes(".gemma-workspace-view .agent-render-card") &&
      workspaceBlock.includes("min-height: 0") &&
      workspaceBlock.includes(".gemma-workspace-view .agent-render-card .markdown-render") &&
      workspaceBlock.includes("max-height: 240px"),
  ],
  [
    "message grid aligns workspace products at the top",
    workspaceBlock.includes(".gemma-workspace-view .message-stack") &&
      workspaceBlock.includes("align-items: start") &&
      workspaceBlock.includes("align-content: start"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Agent workspace format guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Agent workspace format guard passed.");

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) return "";
  const end = source.indexOf(endNeedle, start);
  return source.slice(start, end === -1 ? undefined : end);
}
