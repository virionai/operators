import { readFileSync } from "node:fs";

const css = readFileSync("src/styles.css", "utf8");
const leftRail = readFileSync("src/components/LeftRail.tsx", "utf8");
const pkg = readFileSync("package.json", "utf8");

const containmentBlock = sliceBetween(css, "/* Left rail containment reset */", "/* End left rail containment reset */");

const checks = [
  ["package exposes left rail containment guard", pkg.includes('"test:left-rail"')],
  [
    "left rail is bounded and scrolls internally",
    containmentBlock.includes(".left-rail") &&
      containmentBlock.includes("overflow-y: scroll") &&
      containmentBlock.includes("overflow-x: hidden") &&
      containmentBlock.includes("overscroll-behavior: contain"),
  ],
  [
    "left rail exposes a visible and keyboard-accessible scrollbar",
    leftRail.includes("tabIndex={0}") &&
      containmentBlock.includes("scrollbar-width: thin") &&
      containmentBlock.includes("scrollbar-color") &&
      containmentBlock.includes(".left-rail::-webkit-scrollbar") &&
      containmentBlock.includes(".left-rail:focus-visible"),
  ],
  [
    "rail panels and long rows cannot widen the column",
    containmentBlock.includes(".rail-panel") &&
      containmentBlock.includes("min-width: 0") &&
      containmentBlock.includes(".incident-row > *") &&
      containmentBlock.includes(".task-context-button"),
  ],
  [
    "payload and asset lists clip long capsule paths predictably",
    containmentBlock.includes(".payload-primitives button") &&
      containmentBlock.includes(".workspace-asset-list button") &&
      containmentBlock.includes(".asset-chip") &&
      containmentBlock.includes("text-overflow: ellipsis"),
  ],
  [
    "responsive rail does not force desktop internal scrolling",
    containmentBlock.includes("@media (max-width: 1180px)") &&
      containmentBlock.includes("max-height: none") &&
      containmentBlock.includes("overflow: visible"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Left rail containment guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Left rail containment guard passed.");

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) return "";
  const end = source.indexOf(endNeedle, start);
  return source.slice(start, end === -1 ? undefined : end);
}
