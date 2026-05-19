import { readFileSync } from "node:fs";

const store = readFileSync("src/store.ts", "utf8");
const topHud = readFileSync("src/components/TopHud.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const exportLib = readFileSync("src/lib/capsuleExport.ts", "utf8");
const identityLib = readFileSync("src/lib/protocolIdentity.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

const checks = [
  ["package exposes operator console guard", pkg.includes('"test:operator-console"')],
  [
    "operator HUD uses a compact summary instead of cramped absolute export controls",
    topHud.includes("operator-summary-card") &&
      topHud.includes("operator-package-status") &&
      !topHud.includes("className=\"seal-control\""),
  ],
  [
    "operator settings panel exposes package and key actions",
    topHud.includes("Operator Settings") &&
      topHud.includes("Rotate keys") &&
      topHud.includes("Export public keys") &&
      topHud.includes("Export private key bundle") &&
      topHud.includes("Import key bundle") &&
      topHud.includes("Download .capsule"),
  ],
  [
    "store tracks protocol capsule downloads separately from JSON diagnostics",
    store.includes("protocolPackagePayload: Uint8Array | null") &&
      store.includes("protocolPackageName: string") &&
      store.includes("exportOperatorPublicKeys") &&
      store.includes("exportOperatorPrivateKeys") &&
      store.includes("importOperatorKeyBundle"),
  ],
  [
    "capsule export builds v0.6 ZIP package entries",
    exportLib.includes("buildProtocolCapsulePackage") &&
      exportLib.includes("manifest.json") &&
      exportLib.includes("provenance/envelope.json") &&
      exportLib.includes("chain/events.jsonl") &&
      exportLib.includes("program.md"),
  ],
  [
    "operator identity can serialize and restore key bundles",
    identityLib.includes("exportProtocolOperatorPublicBundle") &&
      identityLib.includes("exportProtocolOperatorPrivateBundle") &&
      identityLib.includes("importProtocolOperatorKeyBundle"),
  ],
  [
    "operator CSS provides a clean summary and settings panel layout",
    styles.includes(".operator-summary-card") &&
      styles.includes(".operator-popover") &&
      styles.includes(".operator-action-grid") &&
      styles.includes(".operator-download-button") &&
      !styles.includes(".top-hud .operator-cell {\n  position: relative;\n  padding-right: 142px;"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Operator console guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Operator console guard passed.");
