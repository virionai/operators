import { readFileSync } from "node:fs";

const runtime = readFileSync("src/lib/localRuntime.ts", "utf8");
const store = readFileSync("src/store.ts", "utf8");
const gemma = readFileSync("src/components/GemmaPanel.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const pkg = readFileSync("package.json", "utf8");

const askGemmaBody = sliceBetween(store, "askGemma: async", "cancelInference:");

const checks = [
  ["package exposes runtime connection guard", pkg.includes('"test:runtime-connection"')],
  [
    "Runtime answers preserve local Ollama failure details",
    runtime.includes("errorDetail?: string") &&
      runtime.includes("runtimeErrorDetail") &&
      runtime.includes("await response.text()"),
  ],
  [
    "Runtime health aborts only on operator cancellation",
    runtime.includes("if (signal?.aborted) throw error") &&
      runtime.includes("Ollama endpoint unreachable"),
  ],
  [
    "Gemma ask preflights runtime health before request",
    askGemmaBody.includes("const preflight = await checkRuntimeHealth") &&
      askGemmaBody.indexOf("const preflight = await checkRuntimeHealth") < askGemmaBody.indexOf("const answer = await runGemmaQuestion"),
  ],
  [
    "Fallback status includes the actual runtime failure reason",
    askGemmaBody.includes("answer.errorDetail") &&
      askGemmaBody.includes("Deterministic local fallback is active"),
  ],
  [
    "Gemma panel shows reconnect affordance for fallback state",
    gemma.includes("runtime-connection-notice") &&
      gemma.includes("Reconnect Ollama") &&
      gemma.includes("checkRuntime"),
  ],
  ["Runtime notice has styling hooks", styles.includes(".runtime-connection-notice") && styles.includes(".runtime-reconnect-button")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Runtime connection guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Runtime connection guard passed.");

function sliceBetween(source, startNeedle, endNeedle) {
  const start = source.indexOf(startNeedle);
  if (start === -1) return "";
  const end = source.indexOf(endNeedle, start);
  return source.slice(start, end === -1 ? undefined : end);
}
