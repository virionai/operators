import { existsSync, readFileSync } from "node:fs";

const files = {
  data: read("src/data.ts"),
  store: read("src/store.ts"),
  rail: read("src/components/LeftRail.tsx"),
  canvas: read("src/components/WorkspaceCanvas.tsx"),
  styles: read("src/styles.css"),
  pkg: read("package.json"),
};

const hydrationPath = "src/lib/capsuleHydration.ts";
const hydration = existsSync(hydrationPath) ? readFileSync(hydrationPath, "utf8") : "";

const checks = [
  ["package exposes capsule hydration guard", files.pkg.includes('"test:capsule-hydration"')],
  ["Attachment model can retain capsule hydration metadata", files.data.includes("capsuleHydration") && files.data.includes("hydratedFrom")],
  [
    "capsule hydration parser exists for local capsule archives",
    hydration.includes("hydrateCapsuleFile") &&
      hydration.includes("isCapsuleUpload") &&
      hydration.includes("extractZipEntries") &&
      hydration.includes("DecompressionStream"),
  ],
  [
    "hydration parser recognizes protocol paths",
    hydration.includes("manifest.json") &&
      hydration.includes("chain/events.jsonl") &&
      hydration.includes("provenance/envelope.json") &&
      hydration.includes("digestPrompt"),
  ],
  [
    "upload flow hydrates capsules instead of metadata-only previews",
    files.store.includes("hydrateCapsuleFile(file)") &&
      files.store.includes("isCapsuleUpload(file)") &&
      files.store.includes("flattenHydratedCapsuleAttachments"),
  ],
  [
    "hydrated capsule files become retrievable payload primitives",
    files.store.includes("payloadPrimitivesFromHydration") &&
      files.store.includes("mergePayloadPrimitives") &&
      files.store.includes("capsule_file_extracted"),
  ],
  [
    "hydrated capsule assets are namespaced under their capsule directory",
    files.store.includes("capsuleAssetDirectory") &&
      files.store.includes("namespacedCapsulePath") &&
      files.store.includes("source_capsule_directory") &&
      files.store.includes("original_path"),
  ],
  [
    "Command receives a digest-ready queued capsule item without auto-answering",
    files.store.includes("queueFromHydratedCapsule") &&
      files.store.includes("capsule_hydrated") &&
      files.store.includes("Hydrated capsule"),
  ],
  [
    "UI distinguishes hydrated capsules and extracted files",
    files.rail.includes("capsule-hydration") &&
      files.canvas.includes("capsuleHydration") &&
      files.styles.includes(".capsule-hydration"),
  ],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Capsule hydration guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Capsule hydration guard passed.");

function read(path) {
  return readFileSync(path, "utf8");
}
