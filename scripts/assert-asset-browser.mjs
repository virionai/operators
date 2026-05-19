import { readFileSync } from "node:fs";

const leftRail = readFileSync("src/components/LeftRail.tsx", "utf8");
const canvas = readFileSync("src/components/WorkspaceCanvas.tsx", "utf8");
const css = readFileSync("src/styles.css", "utf8");
const pkg = readFileSync("package.json", "utf8");

const checks = [
  ["package exposes asset browser guard", pkg.includes('"test:asset-browser"')],
  ["left rail payload panel has browse CTA", leftRail.includes("Browse Assets") && leftRail.includes('setTab("Assets")')],
  ["payload panel summarizes counts instead of only raw protocol paths", leftRail.includes("payloadSummary") && leftRail.includes("asset-meter")],
  ["Assets tab renders a dedicated file browser workspace", canvas.includes("AssetBrowserWorkspace") && canvas.includes('activeTab === "Assets"')],
  ["asset browser includes Capsule primitive files", canvas.includes("payloadPrimitives.map") && canvas.includes("Capsule primitive")],
  ["asset browser includes workspace outputs as retrievable payload files", canvas.includes("canvasModules.map") && canvas.includes("payload/workspace")],
  ["asset browser queues uploaded files without forcing context continuity", canvas.includes("selectAttachment") && !canvas.includes("setDocumentOpen(true)") && storeSelectAttachmentDoesNotForceViewer()],
  ["asset browser has UI styling hooks", css.includes(".asset-browser-workspace") && css.includes(".payload-summary-grid")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Asset browser guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Asset browser guard passed.");

function storeSelectAttachmentDoesNotForceViewer() {
  const store = readFileSync("src/store.ts", "utf8");
  const start = store.indexOf("selectAttachment:");
  const end = store.indexOf("addUploadedAttachments:", start);
  const body = store.slice(start, end);
  return !body.includes("documentOpen: true") && !body.includes('activeTab: "Assets"');
}
