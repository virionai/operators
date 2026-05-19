export const CAPSULE_PROTOCOL_VERSION = "0.6" as const;
export const SIGNER_ROLE = "originator" as const;
export const SIGNING_ALGORITHM = "Ed25519" as const;
export const ENCRYPTION_ALGORITHM = "X25519" as const;
export const ENCRYPTION_CIPHER = "ChaCha20-Poly1305" as const;
export const KEY_AGREEMENT = "X25519+HKDF-SHA256" as const;
export const SIGNING_DOMAIN = `capsule-provenance-v${CAPSULE_PROTOCOL_VERSION}:${SIGNER_ROLE}\x00`;

export type ProtocolOperatorIdentity = {
  operatorId: string;
  protocolVersion: typeof CAPSULE_PROTOCOL_VERSION;
  signerRole: typeof SIGNER_ROLE;
  signingAlgorithm: typeof SIGNING_ALGORITHM;
  signingPublicKey: string;
  signingFingerprint: string;
  signingKeyRef: string;
  encryptionAlgorithm: typeof ENCRYPTION_ALGORITHM;
  encryptionCipher: typeof ENCRYPTION_CIPHER;
  encryptionPublicKey: string;
  encryptionFingerprint: string;
  encryptionKeyRef: string;
  keyAgreement: typeof KEY_AGREEMENT;
  allowlist: string[];
  certificateId: string;
  generatedAt: string;
  signingInputDomain: typeof SIGNING_DOMAIN;
  signingPrimitive: string;
  encryptionPrimitive: string;
  cryptoStatus: "webcrypto-ready" | "metadata-only";
};

type OperatorKeyBundle = {
  signingPrivateKey: CryptoKey;
  encryptionPrivateKey: CryptoKey;
};

export type ProtocolOperatorKeyBundle = {
  schema_version: "capsules-run-operators.operator_key_bundle.v1";
  exported_at: string;
  operator: ProtocolOperatorIdentity;
  public_keys: {
    signing_public_key: string;
    encryption_public_key: string;
  };
  private_keys?: {
    signing_private_jwk: JsonWebKey;
    encryption_private_jwk: JsonWebKey;
  };
};

export type ProtocolSignature = {
  signature: string;
  signingInputHash: string;
  signatureStatus: string;
  signed: boolean;
};

const operatorKeys = new Map<string, OperatorKeyBundle>();

export function createProtocolOperatorIdentity(operatorId: string): ProtocolOperatorIdentity {
  return buildIdentity(operatorId, randomHex(32), randomHex(32), "metadata-only");
}

export async function createProtocolOperatorIdentityWithKeys(operatorId: string): Promise<ProtocolOperatorIdentity> {
  try {
    const signingPair = await crypto.subtle.generateKey(
      { name: SIGNING_ALGORITHM },
      true,
      ["sign", "verify"],
    ) as CryptoKeyPair;
    const encryptionPair = await crypto.subtle.generateKey(
      { name: ENCRYPTION_ALGORITHM },
      true,
      ["deriveBits"],
    ) as CryptoKeyPair;

    const signingPublicKey = await exportPublicKeyHex(signingPair.publicKey);
    const encryptionPublicKey = await exportPublicKeyHex(encryptionPair.publicKey);
    const identity = await buildIdentityWithFingerprints(
      operatorId,
      signingPublicKey,
      encryptionPublicKey,
      "webcrypto-ready",
    );

    operatorKeys.set(identity.certificateId, {
      signingPrivateKey: signingPair.privateKey,
      encryptionPrivateKey: encryptionPair.privateKey,
    });

    return identity;
  } catch {
    return createProtocolOperatorIdentity(operatorId);
  }
}

export function hasProtocolSigningKey(identity: ProtocolOperatorIdentity) {
  return operatorKeys.has(identity.certificateId);
}

export function exportProtocolOperatorPublicBundle(identity: ProtocolOperatorIdentity): ProtocolOperatorKeyBundle {
  return {
    schema_version: "capsules-run-operators.operator_key_bundle.v1",
    exported_at: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    operator: normalizeProtocolOperatorIdentity(identity),
    public_keys: {
      signing_public_key: identity.signingPublicKey,
      encryption_public_key: identity.encryptionPublicKey,
    },
  };
}

export async function exportProtocolOperatorPrivateBundle(
  identity: ProtocolOperatorIdentity,
): Promise<ProtocolOperatorKeyBundle> {
  const keys = operatorKeys.get(identity.certificateId);
  if (!keys) {
    throw new Error("No private key material is loaded for this operator. Rotate keys before exporting a private bundle.");
  }

  return {
    ...exportProtocolOperatorPublicBundle(identity),
    private_keys: {
      signing_private_jwk: await crypto.subtle.exportKey("jwk", keys.signingPrivateKey),
      encryption_private_jwk: await crypto.subtle.exportKey("jwk", keys.encryptionPrivateKey),
    },
  };
}

export async function importProtocolOperatorKeyBundle(candidate: unknown): Promise<ProtocolOperatorIdentity> {
  const bundle = readKeyBundle(candidate);
  const normalized = normalizeProtocolOperatorIdentity(bundle.operator);

  if (!bundle.private_keys) {
    return normalized;
  }

  const signingPrivateKey = await crypto.subtle.importKey(
    "jwk",
    bundle.private_keys.signing_private_jwk,
    { name: SIGNING_ALGORITHM },
    true,
    ["sign"],
  );
  const encryptionPrivateKey = await crypto.subtle.importKey(
    "jwk",
    bundle.private_keys.encryption_private_jwk,
    { name: ENCRYPTION_ALGORITHM },
    true,
    ["deriveBits"],
  );
  const identity = {
    ...normalized,
    cryptoStatus: "webcrypto-ready" as const,
  };
  operatorKeys.set(identity.certificateId, {
    signingPrivateKey,
    encryptionPrivateKey,
  });

  return identity;
}

export function normalizeProtocolOperatorIdentity(
  candidate: Partial<ProtocolOperatorIdentity> | null | undefined,
  fallbackOperatorId = "LOCAL-OP",
): ProtocolOperatorIdentity {
  if (
    !candidate?.operatorId ||
    candidate.protocolVersion !== CAPSULE_PROTOCOL_VERSION ||
    !candidate.signingPublicKey ||
    !candidate.encryptionPublicKey
  ) {
    return createProtocolOperatorIdentity(candidate?.operatorId || fallbackOperatorId);
  }

  return {
    ...buildIdentity(candidate.operatorId, candidate.signingPublicKey, candidate.encryptionPublicKey, "metadata-only"),
    ...candidate,
    signerRole: SIGNER_ROLE,
    signingAlgorithm: SIGNING_ALGORITHM,
    encryptionAlgorithm: ENCRYPTION_ALGORITHM,
    encryptionCipher: ENCRYPTION_CIPHER,
    keyAgreement: KEY_AGREEMENT,
    allowlist: candidate.allowlist?.length ? candidate.allowlist : [candidate.signingPublicKey],
    signingInputDomain: SIGNING_DOMAIN,
    cryptoStatus: operatorKeys.has(candidate.certificateId || "") ? "webcrypto-ready" : "metadata-only",
  };
}

export async function signProtocolCanonicalPayload(
  identity: ProtocolOperatorIdentity,
  canonicalPayload: string,
): Promise<ProtocolSignature> {
  const input = signingInputBytes(canonicalPayload);
  const signingInputHash = await sha256HexBytes(input);
  const keys = operatorKeys.get(identity.certificateId);

  if (!keys) {
    return {
      signature: `metadata-only:${signingInputHash.slice(0, 32)}`,
      signingInputHash,
      signatureStatus: "metadata-only: regenerate protocol keys for WebCrypto Ed25519 signing",
      signed: false,
    };
  }

  const signature = await crypto.subtle.sign({ name: SIGNING_ALGORITHM }, keys.signingPrivateKey, input);
  return {
    signature: bytesToHex(new Uint8Array(signature)),
    signingInputHash,
    signatureStatus: "Ed25519 signature generated with WebCrypto using Capsule v0.6 signing input",
    signed: true,
  };
}

function buildIdentity(
  operatorId: string,
  signingPublicKey: string,
  encryptionPublicKey: string,
  cryptoStatus: ProtocolOperatorIdentity["cryptoStatus"],
): ProtocolOperatorIdentity {
  return {
    operatorId,
    protocolVersion: CAPSULE_PROTOCOL_VERSION,
    signerRole: SIGNER_ROLE,
    signingAlgorithm: SIGNING_ALGORITHM,
    signingPublicKey,
    signingFingerprint: keyFingerprint(signingPublicKey),
    signingKeyRef: `ed25519:${signingPublicKey.slice(0, 16)}`,
    encryptionAlgorithm: ENCRYPTION_ALGORITHM,
    encryptionCipher: ENCRYPTION_CIPHER,
    encryptionPublicKey,
    encryptionFingerprint: keyFingerprint(encryptionPublicKey),
    encryptionKeyRef: `x25519:${encryptionPublicKey.slice(0, 16)}`,
    keyAgreement: KEY_AGREEMENT,
    allowlist: [signingPublicKey],
    certificateId: `cert-v06-${signingPublicKey.slice(0, 8)}`,
    generatedAt: new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    signingInputDomain: SIGNING_DOMAIN,
    signingPrimitive: `${SIGNING_ALGORITHM}:${signingPublicKey.slice(0, 16)}`,
    encryptionPrimitive: `${ENCRYPTION_ALGORITHM}/${ENCRYPTION_CIPHER}:${encryptionPublicKey.slice(0, 16)}`,
    cryptoStatus,
  };
}

async function buildIdentityWithFingerprints(
  operatorId: string,
  signingPublicKey: string,
  encryptionPublicKey: string,
  cryptoStatus: ProtocolOperatorIdentity["cryptoStatus"],
) {
  const identity = buildIdentity(operatorId, signingPublicKey, encryptionPublicKey, cryptoStatus);
  return {
    ...identity,
    signingFingerprint: await sha256HexBytes(hexToBytes(signingPublicKey)),
    encryptionFingerprint: await sha256HexBytes(hexToBytes(encryptionPublicKey)),
  };
}

function signingInputBytes(canonicalPayload: string) {
  const domain = new TextEncoder().encode(SIGNING_DOMAIN);
  const payload = new TextEncoder().encode(canonicalPayload);
  const bytes = new Uint8Array(domain.length + payload.length);
  bytes.set(domain, 0);
  bytes.set(payload, domain.length);
  return bytes;
}

async function exportPublicKeyHex(key: CryptoKey) {
  const raw = await crypto.subtle.exportKey("raw", key);
  return bytesToHex(new Uint8Array(raw));
}

async function sha256HexBytes(bytes: Uint8Array) {
  const input = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const digest = await crypto.subtle.digest("SHA-256", input);
  return bytesToHex(new Uint8Array(digest));
}

function keyFingerprint(publicKey: string) {
  return publicKey.slice(0, 32);
}

function readKeyBundle(candidate: unknown): ProtocolOperatorKeyBundle {
  if (!candidate || typeof candidate !== "object") {
    throw new Error("Operator key import must be a JSON object.");
  }
  const record = candidate as Partial<ProtocolOperatorKeyBundle> & Partial<ProtocolOperatorIdentity>;
  const operator = record.operator ?? record;
  const privateKeys = record.private_keys;
  const normalized = normalizeProtocolOperatorIdentity(operator);
  const publicKeys = record.public_keys ?? {
    signing_public_key: normalized.signingPublicKey,
    encryption_public_key: normalized.encryptionPublicKey,
  };
  if (
    privateKeys &&
    (!privateKeys.signing_private_jwk || !privateKeys.encryption_private_jwk)
  ) {
    throw new Error("Private key bundle must include signing and encryption JWKs.");
  }

  return {
    schema_version: "capsules-run-operators.operator_key_bundle.v1",
    exported_at: typeof record.exported_at === "string" ? record.exported_at : new Date().toISOString().replace(/\.\d+Z$/, "Z"),
    operator: normalized,
    public_keys: publicKeys,
    private_keys: privateKeys,
  };
}

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return bytesToHex(values);
}

function bytesToHex(bytes: Uint8Array) {
  return [...bytes].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}
