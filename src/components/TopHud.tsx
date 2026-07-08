import { Cpu, Download, Info, KeyRound, Lock, Play, RefreshCw, Settings, ShieldCheck, Upload } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { detectProviderFromEndpoint, providerLabel, type RuntimeProvider } from "../lib/localRuntime";
import { useWorkspaceStore } from "../store";

const sealLabels = {
  idle: "Build .capsule",
  stage: "Staging",
  hash: "Hashing",
  seal: "Sealing",
  sign: "Signing",
  exported: "Package ready",
};

const RUNTIME_PRESETS: Array<{ label: string; endpoint: string; model: string; provider: RuntimeProvider }> = [
  { label: "Ollama default", endpoint: "http://127.0.0.1:11434/api/chat", model: "gemma4:latest", provider: "ollama" },
  { label: "LM Studio", endpoint: "http://127.0.0.1:1234/v1", model: "local-model", provider: "openai" },
  { label: "llama.cpp", endpoint: "http://127.0.0.1:8080/v1", model: "local-model", provider: "openai" },
  { label: "vLLM", endpoint: "http://127.0.0.1:8000/v1", model: "local-model", provider: "openai" },
];

const DEFAULT_ENVIRONMENT_TOOLS = [
  "Local runtime tools available to the assistant:",
  "- Default runtime: Ollama at http://127.0.0.1:11434/api/chat",
  "- Alternate runtimes: any OpenAI-compatible endpoint (LM Studio, llama.cpp, vLLM, hosted APIs) via Configure",
  "- Model target: gemma4:latest",
  "- Workspace item schemas: markdown, mermaid, graph, table, IOC board, host map, evidence viewer, JSON viewer, query surface, React component",
  "- Local artifact staging: browser uploads, text previews, selected snippets, queued workspace items",
  "- Capsule protocol primitives: manifest, payload chain, event ledger, provenance envelope, local seal/export hooks",
  "- Cryptographic hooks: Ed25519 originator signing, X25519 recipient identity, ChaCha20-Poly1305 envelope policy",
  "- Persistence: IndexedDB snapshot hydration, local event append, offline-only browser state",
  "- Operator workflow: queue surfaces or files for Command, then ask for evidence-linked analysis before updating the workspace",
].join("\n");

export function TopHud() {
  const runtime = useWorkspaceStore((state) => state.runtime);
  const runtimeHealth = useWorkspaceStore((state) => state.runtimeHealth);
  const tokenUsed = useWorkspaceStore((state) => state.tokenUsed);
  const tokenMax = useWorkspaceStore((state) => state.tokenMax);
  const investigationId = useWorkspaceStore((state) => state.investigationId);
  const declaration = useWorkspaceStore((state) => state.declaration);
  const declareEnvironment = useWorkspaceStore((state) => state.declareEnvironment);
  const attachments = useWorkspaceStore((state) => state.attachments);
  const canvasModules = useWorkspaceStore((state) => state.canvasModules);
  const tasks = useWorkspaceStore((state) => state.tasks);
  const ledger = useWorkspaceStore((state) => state.ledger);
  const operatorIdentity = useWorkspaceStore((state) => state.operatorIdentity);
  const sealStage = useWorkspaceStore((state) => state.sealStage);
  const sealHash = useWorkspaceStore((state) => state.sealHash);
  const sealCapsule = useWorkspaceStore((state) => state.sealCapsule);
  const exportPayload = useWorkspaceStore((state) => state.exportPayload);
  const protocolPackagePayload = useWorkspaceStore((state) => state.protocolPackagePayload);
  const protocolPackageName = useWorkspaceStore((state) => state.protocolPackageName);
  const protocolPackageHash = useWorkspaceStore((state) => state.protocolPackageHash);
  const keyExportPayload = useWorkspaceStore((state) => state.keyExportPayload);
  const keyExportName = useWorkspaceStore((state) => state.keyExportName);
  const keyImportStatus = useWorkspaceStore((state) => state.keyImportStatus);
  const updateRuntime = useWorkspaceStore((state) => state.updateRuntime);
  const checkRuntime = useWorkspaceStore((state) => state.checkRuntime);
  const updateOperatorId = useWorkspaceStore((state) => state.updateOperatorId);
  const generateOperatorPrimitives = useWorkspaceStore((state) => state.generateOperatorPrimitives);
  const exportOperatorPublicKeys = useWorkspaceStore((state) => state.exportOperatorPublicKeys);
  const exportOperatorPrivateKeys = useWorkspaceStore((state) => state.exportOperatorPrivateKeys);
  const importOperatorKeyBundle = useWorkspaceStore((state) => state.importOperatorKeyBundle);
  const lastSaved = useWorkspaceStore((state) => state.lastSaved);
  const [configureOpen, setConfigureOpen] = useState(false);
  const [endpointDraft, setEndpointDraft] = useState(runtime.endpoint);
  const [modelDraft, setModelDraft] = useState(runtime.model);
  const [providerDraft, setProviderDraft] = useState<RuntimeProvider>(runtime.provider ?? "ollama");
  const [apiKeyDraft, setApiKeyDraft] = useState(runtime.apiKey ?? "");
  const [operatorOpen, setOperatorOpen] = useState(false);
  const [operatorMode, setOperatorMode] = useState<"init" | "manage">("manage");
  const [operatorDraft, setOperatorDraft] = useState(operatorIdentity.operatorId);
  const [actionOpen, setActionOpen] = useState(false);
  const [capsuleDraft, setCapsuleDraft] = useState(declaration.capsuleName);
  const [systemDraft, setSystemDraft] = useState(declaration.systemPrompt);
  const [environmentDraft, setEnvironmentDraft] = useState(declaration.environment || DEFAULT_ENVIRONMENT_TOOLS);
  const capsuleInputRef = useRef<HTMLInputElement | null>(null);
  const keyImportInputRef = useRef<HTMLInputElement | null>(null);

  const exportHref = useMemo(() => {
    if (!exportPayload) return "";
    return URL.createObjectURL(new Blob([exportPayload], { type: "application/json" }));
  }, [exportPayload]);
  const protocolPackageHref = useMemo(() => {
    if (!protocolPackagePayload) return "";
    const bytes = protocolPackagePayload.buffer.slice(
      protocolPackagePayload.byteOffset,
      protocolPackagePayload.byteOffset + protocolPackagePayload.byteLength,
    ) as ArrayBuffer;
    return URL.createObjectURL(new Blob([bytes], { type: "application/vnd.capsule+zip" }));
  }, [protocolPackagePayload]);
  const keyExportHref = useMemo(() => {
    if (!keyExportPayload) return "";
    return URL.createObjectURL(new Blob([keyExportPayload], { type: "application/json" }));
  }, [keyExportPayload]);
  const statusTone =
    runtimeHealth.status === "connected"
      ? "green-dot"
      : runtimeHealth.status === "checking"
        ? "blue-dot"
        : runtimeHealth.status === "disabled"
          ? "amber-dot"
          : "rose-dot";
  const contextPercent = Math.round((tokenUsed / tokenMax) * 100);
  const contextTone = contextPercent > 84 ? "context-rose" : contextPercent > 68 ? "context-amber" : "context-blue";
  const modelLabel = (runtime.model || "gemma4:latest").replace(":latest", "");
  const signingKeyLabel = `${operatorIdentity.signingAlgorithm}:${operatorIdentity.signingPublicKey.slice(0, 16)}`;
  const encryptionKeyLabel = `${operatorIdentity.encryptionAlgorithm}:${operatorIdentity.encryptionPublicKey.slice(0, 16)}`;
  const allowlistLabel = `${operatorIdentity.allowlist.length} local key${operatorIdentity.allowlist.length === 1 ? "" : "s"}`;
  const protocolReady = operatorIdentity.cryptoStatus === "webcrypto-ready";
  const operatorStatusText = protocolReady ? "Ed25519 active · X25519 active" : "metadata keys · rotate to sign";
  const packageReady = Boolean(protocolPackagePayload);
  const packageStatus = packageReady
    ? `${(protocolPackageHash || sealHash).slice(0, 12)} · ${protocolPackageName || "workspace.capsule"}`
    : sealLabels[sealStage];
  const operatorDialogTitle = operatorMode === "init" ? "Initiate Operator" : "Operator Settings";
  const operatorDialogCopy = protocolReady
    ? "Local protocol keys are loaded for Capsule v0.6 signing. Building a package writes the manifest, event chain, and provenance envelope into a downloadable .capsule ZIP."
    : "Generate or rotate local keys before final packaging. Metadata-only identities can stage capsules, but signed provenance needs WebCrypto key material.";
  const actionLabel = declaration.declared ? "Current Action" : "Environment Init";
  const currentAction =
    !declaration.declared
      ? "Initialize environment"
      : attachments.length > 0 || canvasModules.length > 0
      ? "Building local investigation workspace"
      : "Local workspace ready";
  const assetContext =
    !declaration.declared
      ? "System prompt, capsule name, and local tools"
      : attachments.length > 0 || canvasModules.length > 0 || tasks.length > 0
      ? `${attachments.length} Artifact${attachments.length === 1 ? "" : "s"} / ${canvasModules.length} Surface${canvasModules.length === 1 ? "" : "s"} / ${tasks.length} Gate${tasks.length === 1 ? "" : "s"}`
      : "No artifacts staged";

  useEffect(() => {
    if (!actionOpen) return undefined;
    capsuleInputRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActionOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [actionOpen]);

  return (
    <header className="top-hud">
      <section className="hud-cell runtime-cell" aria-label="Runtime identity">
        <div className="application-title-lockup">
          <span className="application-brand">Capsules.run</span>
          <h1>Operators</h1>
        </div>
      </section>

      <section className="hud-cell action-cell" aria-label={actionLabel}>
        <span className="hud-label">{actionLabel}</span>
        <button
          className={`action-declare-button ${declaration.declared ? "declared" : ""}`}
          type="button"
          onClick={() => {
            setCapsuleDraft(declaration.capsuleName);
            setSystemDraft(declaration.systemPrompt);
            setEnvironmentDraft(declaration.environment || DEFAULT_ENVIRONMENT_TOOLS);
            setActionOpen(true);
          }}
        >
          <strong>{currentAction}</strong>
          <small>{declaration.declared ? "Asset Context" : ">> Start Here <<"}&nbsp;&nbsp; {assetContext}</small>
        </button>
        {actionOpen ? (
          <form
            className="declaration-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="declaration-title"
            onSubmit={(event) => {
              event.preventDefault();
              declareEnvironment({
                capsuleName: capsuleDraft,
                systemPrompt: systemDraft,
                environment: environmentDraft,
              });
              setActionOpen(false);
              setOperatorDraft(operatorIdentity.operatorId);
              setOperatorMode("init");
              setOperatorOpen(true);
            }}
          >
            <div className="declaration-card">
              <header>
                <div>
                  <span className="hud-label">Initialize Environment</span>
                  <h2 id="declaration-title">Start Here</h2>
                </div>
                <button type="button" onClick={() => setActionOpen(false)} aria-label="Close environment declaration">×</button>
              </header>
              <label>
                Capsule Name
                <input
                  ref={capsuleInputRef}
                  value={capsuleDraft}
                  onChange={(event) => setCapsuleDraft(event.currentTarget.value)}
                  placeholder="Local investigation capsule"
                />
              </label>
              <label>
                System Prompt
                <textarea
                  value={systemDraft}
                  onChange={(event) => setSystemDraft(event.currentTarget.value)}
                  placeholder="Tell Command how to reason, what to produce, and what to avoid."
                />
              </label>
              <label>
                Environment
                <textarea
                  value={environmentDraft}
                  onChange={(event) => setEnvironmentDraft(event.currentTarget.value)}
                  placeholder={DEFAULT_ENVIRONMENT_TOOLS}
                />
              </label>
              <button className="declaration-submit" type="submit">
                <Play size={14} />
                Initialize Environment
              </button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="hud-cell inference-cell" aria-label="Inference target">
        <span className="hud-label">Inference Target</span>
        <div className={`inference-compact status-${runtimeHealth.status}`}>
          <span className={`status-dot ${statusTone}`} />
          <span>{providerLabel(runtime)}</span>
          <span>→</span>
          <strong>{modelLabel}</strong>
          <button
            className="mini-button"
            type="button"
            aria-expanded={configureOpen}
            onClick={() => {
              setEndpointDraft(runtime.endpoint);
              setModelDraft(runtime.model);
              setProviderDraft(runtime.provider ?? detectProviderFromEndpoint(runtime.endpoint));
              setApiKeyDraft(runtime.apiKey ?? "");
              setConfigureOpen((open) => !open);
            }}
            title="Configure the local or OpenAI-compatible model endpoint"
          >
            <Settings size={13} />
          </button>
        </div>
        <div className={`runtime-context-line ${contextTone}`} title="Context color: blue normal, amber elevated, rose near saturation.">
          <i style={{ width: `${contextPercent}%` }} />
          <span>{contextPercent}%</span>
          <Info size={12} />
        </div>
        {configureOpen ? (
          <form
            className="runtime-config-popover"
            onSubmit={(event) => {
              event.preventDefault();
              updateRuntime({
                endpoint: endpointDraft.trim(),
                model: modelDraft.trim(),
                provider: providerDraft,
                apiKey: providerDraft === "openai" ? apiKeyDraft.trim() : "",
                enabled: true,
              });
              setConfigureOpen(false);
              window.setTimeout(() => void checkRuntime(), 0);
            }}
          >
            <label>
              Provider
              <select
                value={providerDraft}
                onChange={(event) => setProviderDraft(event.currentTarget.value as RuntimeProvider)}
              >
                <option value="ollama">Ollama (native API)</option>
                <option value="openai">OpenAI-compatible (chat completions)</option>
              </select>
            </label>
            <label>
              Endpoint
              <input
                value={endpointDraft}
                onChange={(event) => {
                  setEndpointDraft(event.currentTarget.value);
                  setProviderDraft(detectProviderFromEndpoint(event.currentTarget.value));
                }}
                placeholder={providerDraft === "openai" ? "http://127.0.0.1:1234/v1" : "http://127.0.0.1:11434/api/chat"}
              />
            </label>
            <label>
              Model
              <input value={modelDraft} onChange={(event) => setModelDraft(event.currentTarget.value)} />
            </label>
            {providerDraft === "openai" ? (
              <label>
                API key (optional)
                <input
                  type="password"
                  value={apiKeyDraft}
                  onChange={(event) => setApiKeyDraft(event.currentTarget.value)}
                  placeholder="Only needed for authenticated endpoints; stored in this browser only"
                  autoComplete="off"
                />
              </label>
            ) : null}
            <div className="runtime-config-meta">
              <span>{runtimeHealth.detail}</span>
              <span>Context {Math.round(tokenUsed / 1000)}K / {Math.round(tokenMax / 1000)}K</span>
            </div>
            <div>
              {RUNTIME_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => {
                    setEndpointDraft(preset.endpoint);
                    setModelDraft(preset.model);
                    setProviderDraft(preset.provider);
                  }}
                >
                  {preset.label}
                </button>
              ))}
              <button type="button" onClick={() => { updateRuntime({ enabled: false }); setConfigureOpen(false); }}>
                Use fallback
              </button>
              <button type="submit">Save + check</button>
            </div>
          </form>
        ) : null}
      </section>

      <section className="hud-cell session-cell" aria-label="Session state">
        <span className="hud-label">Session State</span>
        <div className="capsule-badge">
          <span className="status-dot green-dot" />
          Local payload active
        </div>
        <small>Session: {investigationId} · {ledger.length} event{ledger.length === 1 ? "" : "s"} · saved {lastSaved}</small>
      </section>

      <section className="hud-cell operator-cell" aria-label="Operator">
        <span className="hud-label">Operator</span>
        <div className="operator-summary-card">
          <button
            className="operator-summary-main"
            type="button"
            onClick={() => {
              setOperatorDraft(operatorIdentity.operatorId);
              setOperatorMode("manage");
              setOperatorOpen((open) => !open);
            }}
          >
            <strong>{operatorIdentity.operatorId}</strong>
            <small>originator · {operatorStatusText}</small>
          </button>
          <button
            className="operator-settings-button"
            type="button"
            aria-label="Open operator settings"
            aria-expanded={operatorOpen}
            onClick={() => {
              setOperatorDraft(operatorIdentity.operatorId);
              setOperatorMode("manage");
              setOperatorOpen((open) => !open);
            }}
          >
            <Settings size={13} />
          </button>
        </div>
        <div className={`operator-package-status ${packageReady ? "package-ready" : ""}`}>
          <span><Cpu size={12} /> {packageStatus}</span>
          {packageReady ? (
            <a className="operator-download-button" href={protocolPackageHref} download={protocolPackageName || `${investigationId}.capsule`}>
              <Download size={12} />
              .capsule
            </a>
          ) : (
            <button
              className="operator-build-compact"
              type="button"
              disabled={sealStage !== "idle" && sealStage !== "exported"}
              onClick={() => void sealCapsule()}
            >
              <Lock size={12} />
              Build
            </button>
          )}
        </div>
        {operatorOpen ? (
          <form
            className={`operator-popover operator-config-popover ${operatorMode === "init" ? "operator-init-popover" : ""}`}
            role="dialog"
            aria-modal={operatorMode === "init"}
            aria-labelledby="operator-protocol-title"
            onSubmit={(event) => {
              event.preventDefault();
              updateOperatorId(operatorDraft);
              setOperatorOpen(false);
            }}
          >
            <header className="operator-modal-header">
              <div>
                <span className="hud-label">{operatorMode === "init" ? "Next Step" : "Capsule Protocol"}</span>
                <h2 id="operator-protocol-title">{operatorDialogTitle}</h2>
              </div>
              <button type="button" aria-label="Close operator protocol" onClick={() => setOperatorOpen(false)}>×</button>
            </header>
            <p className="operator-flow-banner">{operatorDialogCopy}</p>
            <label className="operator-id-field">
              Operator ID
              <input value={operatorDraft} onChange={(event) => setOperatorDraft(event.currentTarget.value)} />
            </label>
            <section className="operator-section">
              <div className={`operator-state-strip ${protocolReady ? "operator-ready" : "operator-needs-keys"}`}>
                <span>Capsule v{operatorIdentity.protocolVersion}</span>
                <b>{operatorIdentity.signerRole}</b>
                <strong>{protocolReady ? "signing enabled" : "key rotation required"}</strong>
              </div>
              <div className="operator-key-grid">
                <div><span>Signer</span><b>{signingKeyLabel}</b></div>
                <div><span>Signer FP</span><b>{operatorIdentity.signingFingerprint.slice(0, 20)}</b></div>
                <div><span>Recipient</span><b>{encryptionKeyLabel}</b></div>
                <div><span>Cipher</span><b>{operatorIdentity.encryptionCipher}</b></div>
                <div><span>Key wrap</span><b>{operatorIdentity.keyAgreement}</b></div>
                <div><span>Allowlist</span><b>{allowlistLabel}</b></div>
                <div><span>Issued</span><b>{operatorIdentity.generatedAt}</b></div>
                <div><span>Status</span><b>{operatorIdentity.cryptoStatus === "webcrypto-ready" ? "WebCrypto key material loaded" : "metadata ready, rotate to sign"}</b></div>
              </div>
            </section>
            <section className="operator-section">
              <div className="operator-section-heading">
                <ShieldCheck size={13} />
                <span>Keyring</span>
              </div>
              <div className="operator-action-grid">
                <button type="button" onClick={() => void generateOperatorPrimitives()}>
                  <KeyRound size={13} /> Generate keys
                </button>
                <button type="button" onClick={() => void generateOperatorPrimitives()}>
                  <RefreshCw size={13} /> Rotate keys
                </button>
                <button type="button" onClick={() => void exportOperatorPublicKeys()}>
                  <Download size={13} /> Export public keys
                </button>
                <button type="button" onClick={() => void exportOperatorPrivateKeys()}>
                  <KeyRound size={13} /> Export private key bundle
                </button>
                <button type="button" onClick={() => keyImportInputRef.current?.click()}>
                  <Upload size={13} /> Import key bundle
                </button>
                <button type="submit">
                  <Settings size={13} /> Save operator
                </button>
              </div>
              <input
                ref={keyImportInputRef}
                className="operator-file-input"
                type="file"
                accept=".json,application/json"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  if (file) void importOperatorKeyBundle(file);
                  event.currentTarget.value = "";
                }}
              />
              <small className="operator-import-status">{keyImportStatus}</small>
              {keyExportPayload ? (
                <a className="operator-download-button operator-key-download" href={keyExportHref} download={keyExportName || "operator-keys.json"}>
                  <Download size={13} /> Download key JSON
                </a>
              ) : null}
            </section>
            <section className="operator-section">
              <div className="operator-section-heading">
                <Lock size={13} />
                <span>Capsule package</span>
              </div>
              <div className="operator-action-grid">
                <button
                  className="operator-seal-inline"
                  type="button"
                  disabled={sealStage !== "idle" && sealStage !== "exported"}
                  onClick={() => void sealCapsule()}
                >
                  <Lock size={13} /> {sealLabels[sealStage]}
                </button>
                {protocolPackagePayload ? (
                  <a className="operator-download-button" href={protocolPackageHref} download={protocolPackageName || `${investigationId}.capsule`}>
                    <Download size={13} /> Download .capsule
                  </a>
                ) : null}
                {exportPayload ? (
                  <a className="operator-export-link" href={exportHref} download={`${investigationId}.capsule.json`}>
                    <Download size={13} /> Download JSON diagnostic · {sealHash}
                  </a>
                ) : null}
              </div>
            </section>
          </form>
        ) : null}
      </section>
    </header>
  );
}
