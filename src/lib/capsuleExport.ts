import type { AnalysisTask, Attachment, LedgerEvent, OperatorTask } from "../data";
import {
  ENCRYPTION_CIPHER,
  KEY_AGREEMENT,
  signProtocolCanonicalPayload,
  type ProtocolOperatorIdentity,
} from "./protocolIdentity";

export type CapsuleExportInput = {
  operatorIdentity: ProtocolOperatorIdentity;
  investigationId: string;
  attachments: Attachment[];
  tasks: OperatorTask[];
  ledger: LedgerEvent[];
  activeAnalysis: AnalysisTask[];
  snippets: string[];
};

export type ProtocolCapsulePackage = {
  bytes: Uint8Array;
  fileName: string;
  capsuleId: string;
  capsuleHash: string;
  manifest: Record<string, unknown>;
  envelope: Record<string, unknown>;
  fileCount: number;
};

export async function buildCapsuleExport(input: CapsuleExportInput) {
  const createdAt = new Date().toISOString();
  const firstEventHash = await sha256Hex(JSON.stringify(sortKeys(input.ledger[0] ?? { genesis: input.investigationId })));
  const entryHash = await sha256Hex(JSON.stringify(sortKeys(input.ledger.at(-1) ?? { entry: input.investigationId })));
  const contentIndexHash = await sha256Hex(JSON.stringify(sortKeys({
    attachments: input.attachments.map((attachment) => attachment.name),
    tasks: input.tasks.map((task) => task.text),
    snippets: input.snippets.length,
  })));
  const manifestHash = await sha256Hex(JSON.stringify(sortKeys({
    investigation_id: input.investigationId,
    originator_public_key: input.operatorIdentity.signingPublicKey,
    content_index_hash: contentIndexHash,
    first_event_hash: firstEventHash,
  })));
  const capsuleId = `capsule-${input.operatorIdentity.signingPublicKey.slice(0, 12)}-${firstEventHash.slice(0, 12)}`;
  const unsignedEnvelope = {
    version: input.operatorIdentity.protocolVersion,
    capsule_id: capsuleId,
    first_event_hash: firstEventHash,
    entry_hash: entryHash,
    manifest_hash: manifestHash,
    content_index_hash: contentIndexHash,
    encrypted_blob_hash: null,
    cipher: "none",
    signed_at: createdAt,
  };
  const canonicalEnvelope = JSON.stringify(sortKeys(unsignedEnvelope));
  const signature = await signProtocolCanonicalPayload(input.operatorIdentity, canonicalEnvelope);
  const envelope = {
    ...unsignedEnvelope,
    signers: [
      {
        role: input.operatorIdentity.signerRole,
        public_key: input.operatorIdentity.signingPublicKey,
        signature: signature.signature,
      },
    ],
  };
  const envelopeHash = await sha256Hex(JSON.stringify(sortKeys(envelope)));
  const payload = {
    capsule_version: input.operatorIdentity.protocolVersion,
    created_at: createdAt,
    investigation_id: input.investigationId,
    operator: {
      id: input.operatorIdentity.operatorId,
      protocol_role: input.operatorIdentity.signerRole,
      signer: input.operatorIdentity.signingAlgorithm,
      signer_public_key: input.operatorIdentity.signingPublicKey,
      signer_fingerprint: input.operatorIdentity.signingFingerprint,
      encryption_recipient: input.operatorIdentity.encryptionPublicKey,
      encryption_fingerprint: input.operatorIdentity.encryptionFingerprint,
      allowlist: input.operatorIdentity.allowlist,
    },
    program: {
      title: "Capsules.run Operators Workspace Continuity",
      posture: "local-first, offline-capable, operator-controlled",
    },
    content: {
      attachments: input.attachments,
      active_analysis: input.activeAnalysis,
      tasks: input.tasks,
      selected_context: input.snippets,
    },
    chain: input.ledger,
    trust_boundary:
      "This artifact exports local workspace state with Capsule v0.6 envelope semantics. ZIP packing and encrypted content.enc emission remain the next Node SDK integration gate.",
  };

  return {
    ...payload,
    provenance: {
      protocol_version: input.operatorIdentity.protocolVersion,
      envelope_hash: envelopeHash,
      signer: input.operatorIdentity.operatorId,
      signed_at: createdAt,
      signing_input_hash: signature.signingInputHash,
      signature_status: signature.signatureStatus,
      envelope,
      encryption: {
        available_cipher: ENCRYPTION_CIPHER,
        envelope_cipher: envelope.cipher,
        key_agreement: KEY_AGREEMENT,
        recipient_public_key: input.operatorIdentity.encryptionPublicKey,
        recipient_fingerprint: input.operatorIdentity.encryptionFingerprint,
        status: "operator encryption identity ready; plaintext UI export uses cipher=none until encrypted SDK packing is selected",
      },
    },
  };
}

export async function buildProtocolCapsulePackage(input: CapsuleExportInput): Promise<ProtocolCapsulePackage> {
  const createdAt = new Date().toISOString().replace(/\.\d+Z$/, "Z");
  const events = await buildChainEvents(input.ledger, input.operatorIdentity.operatorId, input.investigationId, createdAt);
  const firstEventHash = events[0].hash;
  const entryHash = events.at(-1)?.hash ?? firstEventHash;
  const eventsJsonl = `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
  const files = new Map<string, Uint8Array>();

  files.set("program.md", utf8([
    "# Capsules.run Operators Workspace",
    "",
    `Capsule: ${input.investigationId}`,
    "Posture: local-first, operator-controlled, Capsule v0.6 plain package.",
    "",
    "This package was exported from Capsules.run Operators for protocol load-screen testing.",
  ].join("\n")));
  files.set("agents.md", utf8([
    "# Agents",
    "",
    `- Operator: ${input.operatorIdentity.operatorId}`,
    "- Workspace: Capsules.run Operators",
    "- Local inference target: the configured local or OpenAI-compatible model endpoint",
  ].join("\n")));
  files.set("chain/events.jsonl", utf8(eventsJsonl));
  files.set("payload/workspace-state.json", utf8(JSON.stringify({
    schema_version: "capsules-run-operators.workspace_payload.v1",
    exported_at: createdAt,
    investigation_id: input.investigationId,
    operator: {
      id: input.operatorIdentity.operatorId,
      role: input.operatorIdentity.signerRole,
      signing_public_key: input.operatorIdentity.signingPublicKey,
      encryption_public_key: input.operatorIdentity.encryptionPublicKey,
    },
    attachments: input.attachments,
    active_analysis: input.activeAnalysis,
    tasks: input.tasks,
    selected_context: input.snippets,
  }, null, 2)));

  for (const attachment of input.attachments.slice(0, 24)) {
    if (!attachment.content) continue;
    files.set(
      `payload/artifacts/${safePathSegment(attachment.name)}.txt`,
      utf8(attachment.content),
    );
  }

  const contentIndex = await buildContentIndex(files);
  const capsuleId = await computeCapsuleId(input.operatorIdentity.signingPublicKey, firstEventHash);
  const manifest = {
    format: {
      version: input.operatorIdentity.protocolVersion,
      container: "zip",
      canonicalization: "JCS-RFC8785",
      hash_algorithm: "SHA-256",
    },
    id: capsuleId,
    originator: {
      public_key: input.operatorIdentity.signingPublicKey,
      label: input.operatorIdentity.operatorId,
    },
    participants: [
      {
        role: input.operatorIdentity.signerRole,
        label: input.operatorIdentity.operatorId,
        public_key: input.operatorIdentity.signingPublicKey,
      },
    ],
    first_event_hash: firstEventHash,
    content_index: contentIndex,
    skill_trust: {},
    encryption: null,
    created_at: createdAt,
  };
  const manifestHash = await sha256HexBytes(canonicalBytes(manifest));
  const unsignedEnvelope = {
    version: input.operatorIdentity.protocolVersion,
    capsule_id: capsuleId,
    first_event_hash: firstEventHash,
    entry_hash: entryHash,
    manifest_hash: manifestHash,
    content_index_hash: contentIndex.index_hash,
    encrypted_blob_hash: null,
    cipher: "none",
    signed_at: createdAt,
  };
  const signature = await signProtocolCanonicalPayload(input.operatorIdentity, canonicalJson(unsignedEnvelope));
  const envelope = {
    ...unsignedEnvelope,
    signers: [
      {
        role: input.operatorIdentity.signerRole,
        public_key: input.operatorIdentity.signingPublicKey,
        signature: signature.signature,
      },
    ],
  };

  files.set("manifest.json", canonicalBytes(manifest));
  files.set("provenance/envelope.json", canonicalBytes(envelope));

  const bytes = packZip(files);
  const capsuleHash = await sha256HexBytes(bytes);

  return {
    bytes,
    fileName: `${safePathSegment(input.investigationId || "operators-workspace")}.capsule`,
    capsuleId,
    capsuleHash,
    manifest,
    envelope,
    fileCount: files.size,
  };
}

async function sha256Hex(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function buildChainEvents(
  ledger: LedgerEvent[],
  operatorId: string,
  investigationId: string,
  createdAt: string,
) {
  const sourceEvents = ledger.length > 0
    ? ledger
    : [{ id: "event-001", time: createdAt, action: "workspace_exported", target: investigationId, actor: operatorId }];
  const events: Array<Record<string, unknown> & { hash: string }> = [];
  let previousHash = "00".repeat(32);

  for (const [index, event] of sourceEvents.entries()) {
    const bareEvent = {
      seq: index + 1,
      event_id: event.id || `evt_${String(index + 1).padStart(3, "0")}`,
      actor: event.actor || operatorId,
      kind: event.action === "capsule_sealed" ? "provenance" : "observation",
      action: event.action || "ledger_event",
      target: event.target || investigationId,
      timestamp: normalizeTimestamp(event.at || event.time, createdAt),
      payload: {
        source: "capsules-run-operators",
        observed_time: event.time,
      },
      untrusted_payload_fields: [],
      prev_hash: previousHash,
    };
    const hash = await hashEvent(bareEvent);
    events.push({ ...bareEvent, hash });
    previousHash = hash;
  }

  return events;
}

async function hashEvent(event: Record<string, unknown> & { prev_hash: string }) {
  return sha256HexBytes(concatBytes(hexToBytes(event.prev_hash), canonicalBytes(event)));
}

async function computeCapsuleId(originatorPublicKey: string, firstEventHash: string) {
  return sha256HexBytes(concatBytes(
    utf8("capsule-id-v0.6\x00"),
    hexToBytes(originatorPublicKey),
    hexToBytes(firstEventHash),
  ));
}

async function buildContentIndex(files: Map<string, Uint8Array>) {
  const entries = [...files.entries()]
    .filter(([path]) => path !== "manifest.json" && path !== "provenance/envelope.json" && path !== "content.enc")
    .map(([path, bytes]) => ({ path, sha256: "" as string, bytes }));
  const filesWithHashes = [];
  for (const entry of entries) {
    filesWithHashes.push({ path: entry.path, sha256: await sha256HexBytes(entry.bytes) });
  }
  filesWithHashes.sort((a, b) => a.path.localeCompare(b.path));
  return {
    files: filesWithHashes,
    index_hash: await sha256HexBytes(canonicalBytes(filesWithHashes)),
  };
}

async function sha256HexBytes(bytes: Uint8Array) {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToHex(new Uint8Array(digest));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, sortKeys(child)]),
  );
}

function canonicalJson(value: unknown) {
  return JSON.stringify(sortKeys(value));
}

function canonicalBytes(value: unknown) {
  return utf8(canonicalJson(value));
}

function normalizeTimestamp(value: string, fallback: string) {
  return Number.isNaN(Date.parse(value)) ? fallback : new Date(value).toISOString().replace(/\.\d+Z$/, "Z");
}

function safePathSegment(value: string) {
  return (value || "capsule")
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "capsule";
}

function utf8(value: string) {
  return new TextEncoder().encode(value);
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function concatBytes(...parts: Uint8Array[]) {
  const output = new Uint8Array(parts.reduce((total, part) => total + part.byteLength, 0));
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.byteLength;
  }
  return output;
}

function packZip(files: Map<string, Uint8Array>) {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;
  const entries = [...files.entries()].sort(([a], [b]) => a.localeCompare(b));

  for (const [path, bytes] of entries) {
    assertZipPath(path);
    const name = utf8(path);
    const checksum = crc32(bytes);
    const localHeader = new Uint8Array(30 + name.length);
    const localView = new DataView(localHeader.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 10, true);
    localView.setUint16(6, 0, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 33, true);
    localView.setUint32(14, checksum, true);
    localView.setUint32(18, bytes.length, true);
    localView.setUint32(22, bytes.length, true);
    localView.setUint16(26, name.length, true);
    localView.setUint16(28, 0, true);
    localHeader.set(name, 30);
    localParts.push(localHeader, bytes);

    const centralHeader = new Uint8Array(46 + name.length);
    const centralView = new DataView(centralHeader.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 0x031e, true);
    centralView.setUint16(6, 10, true);
    centralView.setUint16(8, 0, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 33, true);
    centralView.setUint32(16, checksum, true);
    centralView.setUint32(20, bytes.length, true);
    centralView.setUint32(24, bytes.length, true);
    centralView.setUint16(28, name.length, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, 0, true);
    centralView.setUint32(42, offset, true);
    centralHeader.set(name, 46);
    centralParts.push(centralHeader);

    offset += localHeader.length + bytes.length;
  }

  const centralDirectory = concatBytes(...centralParts);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralDirectory.length, true);
  endView.setUint32(16, offset, true);
  endView.setUint16(20, 0, true);

  return concatBytes(...localParts, centralDirectory, end);
}

function assertZipPath(path: string) {
  if (!path || path.includes("\0") || path.startsWith("/") || /^[A-Za-z]:[\\/]/.test(path)) {
    throw new Error(`Unsafe capsule ZIP path: ${path}`);
  }
  for (const segment of path.split(/[\\/]/)) {
    if (!segment || segment === "..") throw new Error(`Unsafe capsule ZIP path: ${path}`);
  }
}

const CRC32_TABLE = new Uint32Array(256).map((_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc = CRC32_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}
