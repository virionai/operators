import type { CapsuleHydratedFile, CapsuleHydration } from "../data";

type ZipEntry = {
  path: string;
  bytes: Uint8Array;
  compressedSize: number;
  uncompressedSize: number;
};

const TEXT_PATH = /\.(json|jsonl|md|txt|csv|log|yaml|yml|xml|html|ts|tsx|js|jsx)$/i;
const MAX_TEXT_PREVIEW = 96_000;

export function isCapsuleUpload(file: File) {
  return /\.capsule(?:\.json)?$/i.test(file.name) || /capsule/i.test(file.type);
}

export async function hydrateCapsuleFile(file: File): Promise<CapsuleHydration> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  const zipEntries = isZip(bytes) ? await extractZipEntries(bytes) : [];
  const files = zipEntries.length > 0 ? filesFromZipEntries(zipEntries) : filesFromJsonCapsule(file.name, bytes);
  const normalizedFiles = files.length > 0 ? files : filesFromMetadataOnly(file.name, file.size);
  const manifest = parseJsonFile(normalizedFiles, "manifest.json") || parseJsonFile(normalizedFiles, "payload/manifest.json");
  const envelope = parseJsonFile(normalizedFiles, "provenance/envelope.json");
  const chainFile = normalizedFiles.find((entry) => /(^|\/)chain\/events\.jsonl$/i.test(entry.path) || /events\.jsonl$/i.test(entry.path));
  const eventCount = chainFile?.content ? chainFile.content.split(/\r?\n/).filter((line) => line.trim()).length : 0;
  const sourceId = slugify(file.name.replace(/\.capsule(?:\.json)?$/i, "")) || `capsule-${Date.now().toString(36)}`;
  const capsuleName =
    stringFromUnknown(manifest?.capsule_id) ||
    stringFromUnknown(manifest?.investigation_id) ||
    stringFromUnknown(envelope?.capsule_id) ||
    file.name;

  const hydration: CapsuleHydration = {
    id: `hydration-${sourceId}-${Date.now().toString(36)}`,
    sourceName: file.name,
    capsuleName,
    hydratedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    fileCount: normalizedFiles.length,
    payloadCount: normalizedFiles.filter((entry) => entry.kind === "payload").length,
    eventCount,
    manifestId: stringFromUnknown(manifest?.capsule_id) || stringFromUnknown(manifest?.investigation_id),
    digestPrompt: "",
    files: normalizedFiles,
  };
  return {
    ...hydration,
    digestPrompt: buildDigestPrompt(hydration),
  };
}

export async function extractZipEntries(bytes: Uint8Array): Promise<ZipEntry[]> {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const eocdOffset = findEndOfCentralDirectory(view);
  if (eocdOffset < 0) return [];

  const totalEntries = view.getUint16(eocdOffset + 10, true);
  const centralDirectoryOffset = view.getUint32(eocdOffset + 16, true);
  const entries: ZipEntry[] = [];
  let pointer = centralDirectoryOffset;

  for (let index = 0; index < totalEntries && pointer < bytes.length; index += 1) {
    if (view.getUint32(pointer, true) !== 0x02014b50) break;
    const method = view.getUint16(pointer + 10, true);
    const compressedSize = view.getUint32(pointer + 20, true);
    const uncompressedSize = view.getUint32(pointer + 24, true);
    const nameLength = view.getUint16(pointer + 28, true);
    const extraLength = view.getUint16(pointer + 30, true);
    const commentLength = view.getUint16(pointer + 32, true);
    const localHeaderOffset = view.getUint32(pointer + 42, true);
    const path = decodeUtf8(bytes.slice(pointer + 46, pointer + 46 + nameLength));
    pointer += 46 + nameLength + extraLength + commentLength;

    if (!path || path.endsWith("/")) continue;
    const localNameLength = view.getUint16(localHeaderOffset + 26, true);
    const localExtraLength = view.getUint16(localHeaderOffset + 28, true);
    const dataOffset = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = bytes.slice(dataOffset, dataOffset + compressedSize);
    let entryBytes: Uint8Array;
    if (method === 0) {
      entryBytes = compressed;
    } else if (method === 8) {
      entryBytes = await inflateRaw(compressed);
    } else {
      continue;
    }
    entries.push({ path, bytes: entryBytes, compressedSize, uncompressedSize });
  }

  return entries;
}

function filesFromZipEntries(entries: ZipEntry[]): CapsuleHydratedFile[] {
  return entries.map((entry) => hydratedFile(entry.path, entry.bytes, entry.uncompressedSize));
}

function filesFromJsonCapsule(sourceName: string, bytes: Uint8Array): CapsuleHydratedFile[] {
  const text = decodeUtf8(bytes);
  if (!text.trim().startsWith("{")) return [];
  try {
    const capsule = JSON.parse(text) as Record<string, unknown>;
    const files: CapsuleHydratedFile[] = [
      textFile("manifest.json", {
        capsule_version: capsule.capsule_version,
        investigation_id: capsule.investigation_id,
        created_at: capsule.created_at,
        operator: capsule.operator,
        program: capsule.program,
      }),
      textFile("provenance/envelope.json", capsule.provenance ?? {}),
      textFile("chain/events.jsonl", Array.isArray(capsule.chain) ? capsule.chain.map((event) => JSON.stringify(event)).join("\n") : ""),
      textFile("payload/workspace-state.json", capsule.content ?? capsule),
    ];
    return files.filter((entry) => entry.content !== "{}" && entry.content !== "");
  } catch {
    return [textFile(`payload/${sourceName}.txt`, text)];
  }
}

function filesFromMetadataOnly(sourceName: string, size: number): CapsuleHydratedFile[] {
  return [
    {
      path: `payload/${sourceName}`,
      name: sourceName,
      kind: "payload",
      type: inferType(sourceName),
      size,
      binary: true,
      content: `Binary capsule uploaded: ${sourceName}\nSize: ${size} bytes\nPreview: archive metadata only.`,
    },
  ];
}

function hydratedFile(path: string, bytes: Uint8Array, size: number): CapsuleHydratedFile {
  const textLike = TEXT_PATH.test(path) || protocolKind(path) !== "artifact";
  return {
    path,
    name: path.split("/").pop() || path,
    kind: protocolKind(path),
    type: inferType(path),
    size,
    binary: !textLike,
    content: textLike ? decodeUtf8(bytes.slice(0, MAX_TEXT_PREVIEW)) : `Binary extracted file: ${path}\nSize: ${size} bytes`,
  };
}

function textFile(path: string, value: unknown): CapsuleHydratedFile {
  const content = typeof value === "string" ? value : JSON.stringify(value, null, 2);
  return {
    path,
    name: path.split("/").pop() || path,
    kind: protocolKind(path),
    type: inferType(path),
    size: new TextEncoder().encode(content).byteLength,
    content,
  };
}

function protocolKind(path: string): CapsuleHydratedFile["kind"] {
  if (/(^|\/)manifest\.json$/i.test(path)) return "manifest";
  if (/(^|\/)chain\//i.test(path) || /events\.jsonl$/i.test(path)) return "chain";
  if (/(^|\/)provenance\//i.test(path) || /envelope\.json$/i.test(path)) return "provenance";
  if (/(^|\/)payload\//i.test(path)) return "payload";
  return "artifact";
}

function parseJsonFile(files: CapsuleHydratedFile[], path: string) {
  const match = files.find((entry) => entry.path.toLowerCase() === path.toLowerCase());
  if (!match?.content) return undefined;
  try {
    return JSON.parse(match.content) as Record<string, unknown>;
  } catch {
    return undefined;
  }
}

function buildDigestPrompt(hydration: CapsuleHydration) {
  const previews = hydration.files
    .filter((entry) => entry.content)
    .slice(0, 8)
    .map((entry) => [`### ${entry.path}`, entry.content?.slice(0, 2400)].join("\n"))
    .join("\n\n");
  return [
    "HYDRATED CAPSULE DIGEST REQUEST",
    `Capsule: ${hydration.capsuleName}`,
    `Source archive: ${hydration.sourceName}`,
    `Extracted files: ${hydration.fileCount}`,
    `Event count: ${hydration.eventCount}`,
    `Payload files: ${hydration.payloadCount}`,
    "Digest this capsule locally. Summarize continuity, identify evidence gaps, propose decision gates, and publish knowledge graph facts when relationships are present.",
    "Use the app response schemas for DECISION GATES and KNOWLEDGE GRAPH FACTS if applicable.",
    "",
    "EXTRACTED FILE PREVIEWS",
    previews || "No text previews were extracted.",
  ].join("\n");
}

function findEndOfCentralDirectory(view: DataView) {
  const min = Math.max(0, view.byteLength - 22 - 0xffff);
  for (let offset = view.byteLength - 22; offset >= min; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) return offset;
  }
  return -1;
}

async function inflateRaw(bytes: Uint8Array) {
  const copy = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(copy).set(bytes);
  const stream = new Blob([copy]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function decodeUtf8(bytes: Uint8Array) {
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}

function isZip(bytes: Uint8Array) {
  return bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
}

function inferType(path: string) {
  const ext = path.split(".").pop()?.toUpperCase() || "FILE";
  return ext.slice(0, 8);
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 42);
}

function stringFromUnknown(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}
