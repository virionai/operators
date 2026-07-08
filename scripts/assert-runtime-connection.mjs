import { readFileSync } from "node:fs";

const runtime = readFileSync("src/lib/localRuntime.ts", "utf8");
const store = readFileSync("src/store.ts", "utf8");
const command = readFileSync("src/components/CommandPanel.tsx", "utf8");
const styles = readFileSync("src/styles.css", "utf8");
const pkg = readFileSync("package.json", "utf8");

const askCommandBody = sliceBetween(store, "askCommand: async", "cancelInference:");

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
    "Command ask preflights runtime health before request",
    askCommandBody.includes("const preflight = await checkRuntimeHealth") &&
      askCommandBody.indexOf("const preflight = await checkRuntimeHealth") < askCommandBody.indexOf("const answer = await runCommandQuestion"),
  ],
  [
    "Fallback status includes the actual runtime failure reason",
    askCommandBody.includes("answer.errorDetail") &&
      askCommandBody.includes("Deterministic local fallback is active"),
  ],
  [
    "Command panel shows reconnect affordance for fallback state",
    command.includes("runtime-connection-notice") &&
      command.includes("Reconnect {providerLabel(runtime)}") &&
      command.includes("checkRuntime"),
  ],
  [
    "Runtime supports OpenAI-compatible providers with optional API key",
    runtime.includes("chat/completions") &&
      runtime.includes("detectProviderFromEndpoint") &&
      runtime.includes("Authorization") &&
      runtime.includes("choices"),
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
