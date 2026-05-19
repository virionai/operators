import { readFileSync } from "node:fs";

const css = readFileSync("src/styles.css", "utf8");

const checks = [
  ["top HUD has a single final reset section", css.includes("/* Top HUD shell reset v2 */")],
  ["desktop shell reserves enough vertical space for HUD and nav", css.includes("grid-template-rows: 112px 42px minmax(0, 1fr) 38px")],
  ["top HUD has explicit stable height", css.includes("height: 84px") && css.includes("min-height: 84px")],
  ["runtime identity no longer uses cramped 66px clipping", css.includes("max-height: none")],
  ["HUD cells use internal clipping instead of bleeding into nav", css.includes(".top-hud .hud-cell") && css.includes("overflow: hidden")],
  ["nav has explicit spacing below HUD", css.includes("padding: 6px 14px 8px")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Top HUD layout guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Top HUD layout guard passed.");
