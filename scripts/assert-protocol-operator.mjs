import { readFileSync } from "node:fs";

const store = readFileSync("src/store.ts", "utf8");
const topHud = readFileSync("src/components/TopHud.tsx", "utf8");
const exportLib = readFileSync("src/lib/capsuleExport.ts", "utf8");
const identityLib = readFileSync("src/lib/protocolIdentity.ts", "utf8");
const pkg = readFileSync("package.json", "utf8");

const checks = [
  ["package exposes operator protocol guard", pkg.includes('"test:operator-protocol"')],
  ["store imports protocol identity helper", store.includes("createProtocolOperatorIdentity")],
  ["operator identity records Capsule protocol version", identityLib.includes("protocolVersion") && identityLib.includes('CAPSULE_PROTOCOL_VERSION = "0.6"')],
  ["operator identity includes originator signer role", identityLib.includes("signerRole") && identityLib.includes('SIGNER_ROLE = "originator"')],
  ["operator identity uses Ed25519 signer fields", identityLib.includes("signingAlgorithm") && identityLib.includes('"Ed25519"')],
  ["operator identity uses X25519 recipient fields", identityLib.includes("encryptionAlgorithm") && identityLib.includes('"X25519"')],
  ["operator identity declares ChaCha20-Poly1305 cipher", identityLib.includes("encryptionCipher") && identityLib.includes('"ChaCha20-Poly1305"')],
  ["operator identity records an allowlist public key", identityLib.includes("allowlist")],
  ["Top HUD surfaces protocol signer and encryption metadata", topHud.includes("originator") && topHud.includes("Ed25519") && topHud.includes("X25519")],
  ["Top HUD displays ChaCha20-Poly1305", topHud.includes("ChaCha20-Poly1305")],
  ["environment declaration opens operator initiation flow", topHud.includes('setOperatorMode("init")') && topHud.includes("Initiate Operator")],
  ["operator protocol panel exposes key rotation and capsule sealing", topHud.includes("Rotate keys") && topHud.includes("operator-seal-inline")],
  ["export includes v0.6 envelope signers", exportLib.includes("signers") && exportLib.includes("public_key") && exportLib.includes("signature")],
  ["export includes encryption policy metadata", exportLib.includes("key_agreement") && exportLib.includes("recipient_public_key")],
];

const failures = checks.filter(([, passed]) => !passed).map(([label]) => label);

if (failures.length) {
  console.error("Operator protocol guard failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Operator protocol guard passed.");
