import { create } from "zustand";
import {
  activeAnalysis,
  attachments,
  initialMessages,
  ledgerEvents,
  operatorTasks,
  type AnalysisTask,
  type Attachment,
  type CapsuleHydration,
  type CapsuleHydratedFile,
  type LedgerEvent,
  type OperatorTask,
  type Severity,
} from "./data";
import { buildCapsuleExport, buildProtocolCapsulePackage } from "./lib/capsuleExport";
import { hydrateCapsuleFile, isCapsuleUpload } from "./lib/capsuleHydration";
import {
  checkRuntimeHealth,
  runGemmaQuestion,
  type FocusedCanvasContext,
  type RuntimeQueueItem,
  type RuntimeHealth,
  type RuntimeSettings,
} from "./lib/localRuntime";
import {
  createProtocolOperatorIdentity,
  createProtocolOperatorIdentityWithKeys,
  exportProtocolOperatorPrivateBundle,
  exportProtocolOperatorPublicBundle,
  hasProtocolSigningKey,
  importProtocolOperatorKeyBundle,
  normalizeProtocolOperatorIdentity,
  type ProtocolOperatorIdentity,
} from "./lib/protocolIdentity";

type Message = {
  id: string;
  role: "operator" | "gemma";
  text: string;
  time: string;
};

type SealStage = "idle" | "stage" | "hash" | "seal" | "sign" | "exported";

export type WorkspaceQueueItem = RuntimeQueueItem & {
  icon: "note" | "asset" | "selection" | "concern" | "workspace" | "graph" | "code" | "table";
  tone: CanvasModule["accent"];
  queuedAt: string;
};

export type CanvasModuleKind =
  | "attack-flow"
  | "host-impact"
  | "timeline"
  | "heatmap"
  | "command-table"
  | "ioc-table"
  | "markdown"
  | "mermaid"
  | "graph"
  | "table"
  | "ioc-board"
  | "host-map"
  | "evidence-viewer"
  | "pdf-viewer"
  | "json-viewer"
  | "query-surface"
  | "react-component";

export type CanvasGridPlacement = {
  x: number;
  y: number;
  w: number;
  h: number;
};

export type CanvasModule = {
  id: string;
  kind: CanvasModuleKind;
  title: string;
  subtitle: string;
  collapsed: boolean;
  docked?: boolean;
  pinned: boolean;
  accent: "blue" | "sage" | "amber" | "rose" | "violet";
  renderMode?: "editable" | "preview";
  content?: string;
  code?: string;
  grid: CanvasGridPlacement;
};

export type KnowledgeFact = {
  id: string;
  source: string;
  relation: string;
  target: string;
  evidence: string;
};

export type PayloadPrimitive = {
  id: string;
  name: string;
  path: string;
  kind: "manifest" | "payload" | "chain" | "provenance";
  status: "generated" | "sealed";
  timestamp: string;
  detail: string;
};

export type OperatorIdentity = ProtocolOperatorIdentity;

export type WorkspaceDeclaration = {
  declared: boolean;
  capsuleName: string;
  systemPrompt: string;
  environment: string;
};

type WorkspaceState = {
  investigationId: string;
  declaration: WorkspaceDeclaration;
  activeTab: string;
  graphMode: string;
  canvasModules: CanvasModule[];
  activeModuleId: string;
  selectedAttachmentId: string;
  documentOpen: boolean;
  documentQuery: string;
  gemmaOpen: boolean;
  gemmaWorkspaceMode: boolean;
  gemmaBusy: boolean;
  runtime: RuntimeSettings;
  runtimeHealth: RuntimeHealth;
  operatorIdentity: OperatorIdentity;
  messages: Message[];
  queuedWorkspaceItems: WorkspaceQueueItem[];
  attachments: Attachment[];
  payloadPrimitives: PayloadPrimitive[];
  activeAnalysis: AnalysisTask[];
  tasks: OperatorTask[];
  knowledgeFacts: KnowledgeFact[];
  ledger: LedgerEvent[];
  snippets: string[];
  tokenUsed: number;
  tokenMax: number;
  sealStage: SealStage;
  sealHash: string;
  exportPayload: string;
  protocolPackagePayload: Uint8Array | null;
  protocolPackageName: string;
  protocolPackageHash: string;
  keyExportPayload: string;
  keyExportName: string;
  keyImportStatus: string;
  lastSaved: string;
  inferenceController: AbortController | null;
  declareEnvironment: (input: Omit<WorkspaceDeclaration, "declared">) => void;
  setTab: (tab: string) => void;
  setGraphMode: (mode: string) => void;
  addCanvasModule: (kind: CanvasModuleKind) => string;
  requestCanvasModule: (kind: CanvasModuleKind) => Promise<void>;
  removeQueuedWorkspaceItem: (id: string) => void;
  removeCanvasModule: (id: string) => void;
  toggleCanvasModule: (id: string) => void;
  toggleCanvasPin: (id: string) => void;
  toggleCanvasDock: (id: string) => void;
  moveCanvasModule: (id: string, direction: "up" | "down") => void;
  moveCanvasModuleToGrid: (id: string, grid: CanvasGridPlacement) => void;
  reorderCanvasModule: (draggedId: string, targetId: string) => void;
  focusCanvasModule: (id: string) => void;
  updateCanvasModuleContent: (id: string, content: string) => void;
  commitCanvasModuleContent: (id: string) => void;
  addGeneratedComponent: () => string;
  buildGemmaWorkspaceFromQueue: () => void;
  createDecisionGateSurface: () => string;
  createCommunicationPlanSurface: () => string;
  selectAttachment: (id: string) => void;
  addUploadedAttachments: (files: FileList | File[]) => Promise<void>;
  setDocumentOpen: (open: boolean) => void;
  setDocumentQuery: (query: string) => void;
  toggleGemma: () => void;
  setGemmaWorkspaceMode: (enabled: boolean) => void;
  updateRuntime: (runtime: Partial<RuntimeSettings>) => void;
  checkRuntime: () => Promise<void>;
  updateOperatorId: (operatorId: string) => void;
  generateOperatorPrimitives: () => Promise<void>;
  exportOperatorPublicKeys: () => Promise<void>;
  exportOperatorPrivateKeys: () => Promise<void>;
  importOperatorKeyBundle: (file: File) => Promise<void>;
  toggleTask: (id: string) => void;
  queueDecisionGateForGemma: (id: string) => void;
  addContextSnippet: (snippet: string, source: string) => void;
  askGemma: (question: string) => Promise<void>;
  cancelInference: () => void;
  sealCapsule: () => Promise<void>;
  hydrateSnapshot: (snapshot: Partial<PersistedState>) => void;
};

export type PersistedState = Pick<
  WorkspaceState,
  | "messages"
  | "queuedWorkspaceItems"
  | "tasks"
  | "ledger"
  | "snippets"
  | "tokenUsed"
  | "runtime"
  | "operatorIdentity"
  | "investigationId"
  | "declaration"
  | "lastSaved"
  | "canvasModules"
  | "activeModuleId"
  | "knowledgeFacts"
  | "attachments"
  | "payloadPrimitives"
  | "selectedAttachmentId"
  | "documentOpen"
>;

const graphModes = new Set(["Workflow", "Knowledge Graph", "Event Timeline", "Context Continuity"]);
const defaultModules: CanvasModule[] = [];

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  investigationId: `workspace-${new Date().toISOString().slice(0, 10)}`,
  declaration: {
    declared: false,
    capsuleName: "",
    systemPrompt: "",
    environment: "",
  },
  activeTab: "Workspace",
  graphMode: "Workflow",
  canvasModules: defaultModules,
  activeModuleId: "",
  selectedAttachmentId: "",
  documentOpen: false,
  documentQuery: "",
  gemmaOpen: true,
  gemmaWorkspaceMode: false,
  gemmaBusy: false,
  runtime: {
    enabled: true,
    endpoint: "http://127.0.0.1:11434/api/chat",
    model: "gemma4:latest",
  },
  runtimeHealth: {
    status: "checking",
    detail: "Checking local Ollama runtime.",
    checkedAt: "now",
  },
  operatorIdentity: makeOperatorIdentity("LOCAL-OP"),
  messages: initialMessages,
  queuedWorkspaceItems: [],
  attachments,
  payloadPrimitives: [],
  activeAnalysis,
  tasks: operatorTasks,
  knowledgeFacts: [],
  ledger: ledgerEvents,
  snippets: [],
  tokenUsed: 0,
  tokenMax: 70000,
  sealStage: "idle",
  sealHash: "",
  exportPayload: "",
  protocolPackagePayload: null,
  protocolPackageName: "",
  protocolPackageHash: "",
  keyExportPayload: "",
  keyExportName: "",
  keyImportStatus: "No operator key import has run in this session.",
  lastSaved: "new",
  inferenceController: null,
  declareEnvironment: (input) =>
    set((state) => {
      const capsuleName = input.capsuleName.trim() || "Local Workspace";
      const nextId = slugify(capsuleName) || state.investigationId;
      return {
        declaration: {
          declared: true,
          capsuleName,
          systemPrompt: input.systemPrompt.trim(),
          environment: input.environment.trim(),
        },
        investigationId: nextId,
        payloadPrimitives: buildPayloadPrimitives(nextId, state.operatorIdentity.operatorId),
        ledger: appendEvent(state.ledger, "environment_declared", capsuleName, state.operatorIdentity.operatorId),
        messages: [
          ...state.messages,
          {
            id: crypto.randomUUID(),
            role: "operator",
            text: `Declared environment: ${capsuleName}\n\n${input.environment.trim() || "No environment summary provided."}`,
            time: timeLabel(),
          },
        ],
        lastSaved: "now",
      };
    }),
  setTab: (tab) =>
    set((state) => ({
      activeTab: tab,
      gemmaWorkspaceMode: false,
      graphMode:
        tab === "Knowledge"
          ? "Knowledge Graph"
          : tab === "Events"
            ? "Event Timeline"
            : tab === "Assets"
              ? "Workflow"
              : state.graphMode,
      documentOpen: false,
      ledger: appendEvent(state.ledger, "view_changed", tab),
      lastSaved: "now",
    })),
  setGraphMode: (mode) => {
    if (graphModes.has(mode)) {
      set((state) => ({
        graphMode: mode,
        documentOpen: mode === "Context Continuity",
        ledger: appendEvent(state.ledger, "topology_changed", mode),
        lastSaved: "now",
      }));
    }
  },
  addCanvasModule: (kind) => {
    const spec = moduleSpec(kind);
    const id = `${kind}-${Date.now().toString(36)}`;
    set((state) => ({
      activeTab: "Workspace",
      canvasModules: [
        {
          id,
          kind,
          title: spec.title,
          subtitle: spec.subtitle,
          collapsed: false,
          pinned: false,
          accent: spec.accent,
          content: defaultContent(kind),
          code: defaultCode(kind),
          grid: nextModuleGrid(state.canvasModules.length, kind),
        },
        ...state.canvasModules,
      ],
      activeModuleId: id,
      ledger: appendEvent(state.ledger, "module_added", spec.title),
      lastSaved: "now",
    }));
    return id;
  },
  requestCanvasModule: async (kind) => {
    const id = get().addCanvasModule(kind);
    const spec = moduleSpec(kind);
    const schema = buildWorkspaceItemSchema(kind, spec.title);
    set((state) => {
      const module = state.canvasModules.find((item) => item.id === id);
      return {
        queuedWorkspaceItems: upsertQueueItem(
          state.queuedWorkspaceItems,
          queueFromModule(module, schema),
        ),
        gemmaOpen: true,
        ledger: appendEvent(state.ledger, "workspace_item_queued", spec.title, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    });
  },
  removeQueuedWorkspaceItem: (id) =>
    set((state) => ({
      queuedWorkspaceItems: state.queuedWorkspaceItems.filter((item) => item.id !== id),
      lastSaved: "now",
    })),
  removeCanvasModule: (id) =>
    set((state) => {
      const target = state.canvasModules.find((module) => module.id === id);
      if (!target || target.pinned) return state;
      return {
        canvasModules: state.canvasModules.filter((module) => module.id !== id),
        ledger: appendEvent(state.ledger, "module_removed", target.title),
        lastSaved: "now",
      };
    }),
  toggleCanvasModule: (id) =>
    set((state) => ({
      canvasModules: state.canvasModules.map((module) =>
        module.id === id ? { ...module, collapsed: !module.collapsed } : module,
      ),
      ledger: appendEvent(state.ledger, "module_toggled", id),
      lastSaved: "now",
    })),
  toggleCanvasPin: (id) =>
    set((state) => ({
      canvasModules: state.canvasModules.map((module) =>
        module.id === id ? { ...module, pinned: !module.pinned } : module,
      ),
      ledger: appendEvent(state.ledger, "module_pin_changed", id),
      lastSaved: "now",
    })),
  toggleCanvasDock: (id) =>
    set((state) => ({
      canvasModules: state.canvasModules.map((module) =>
        module.id === id ? { ...module, docked: !module.docked } : module,
      ),
      ledger: appendEvent(state.ledger, "module_dock_changed", id, state.operatorIdentity.operatorId),
      lastSaved: "now",
    })),
  moveCanvasModule: (id, direction) =>
    set((state) => {
      const index = state.canvasModules.findIndex((module) => module.id === id);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= state.canvasModules.length) return state;
      const next = [...state.canvasModules];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      return {
        canvasModules: next,
        ledger: appendEvent(state.ledger, "module_moved", id, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    }),
  moveCanvasModuleToGrid: (id, grid) =>
    set((state) => ({
      canvasModules: state.canvasModules.map((module) =>
        module.id === id ? { ...module, grid: snapGridPlacement(grid) } : module,
      ),
      activeModuleId: id,
      lastSaved: "now",
    })),
  reorderCanvasModule: (draggedId, targetId) =>
    set((state) => {
      if (draggedId === targetId) return state;
      const dragged = state.canvasModules.find((module) => module.id === draggedId);
      const targetIndex = state.canvasModules.findIndex((module) => module.id === targetId);
      if (!dragged || targetIndex < 0) return state;
      const withoutDragged = state.canvasModules.filter((module) => module.id !== draggedId);
      withoutDragged.splice(targetIndex, 0, dragged);
      return {
        canvasModules: withoutDragged,
        ledger: appendEvent(state.ledger, "module_reordered", dragged.title, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    }),
  addGeneratedComponent: () => {
    const id = `react-component-${Date.now().toString(36)}`;
    set((state) => ({
      activeTab: "Workspace",
      canvasModules: [
        {
          id,
          kind: "react-component",
          title: "Gemma Render Surface",
          subtitle: "Generated component frame with inspectable code",
          collapsed: false,
          docked: true,
          pinned: false,
          accent: "violet",
          grid: nextModuleGrid(state.canvasModules.length, "react-component", true),
          code: [
            "export function GemmaGeneratedSurface({ ledger }) {",
            "  return <EvidenceSignalMap events={ledger.slice(-6)} mode=\"local\" />;",
            "}",
          ].join("\n"),
        },
        ...state.canvasModules,
      ],
      activeModuleId: id,
      ledger: appendEvent(state.ledger, "component_generated", "gemma-render-surface", "gemma4"),
      lastSaved: "now",
    }));
    return id;
  },
  buildGemmaWorkspaceFromQueue: () =>
    set((state) => {
      const candidates = state.queuedWorkspaceItems.filter((item) => item.kind === "module" || item.kind === "workspace" || item.icon === "code");
      const sources = candidates.length ? candidates : state.queuedWorkspaceItems.slice(0, 6);
      const id = `gemma-workspace-${Date.now().toString(36)}`;
      const module: CanvasModule = {
        id,
        kind: "react-component",
        title: "Gemma Workspace",
        subtitle: `${sources.length} queued surface${sources.length === 1 ? "" : "s"} assembled for operator review`,
        collapsed: false,
        docked: true,
        pinned: false,
        accent: "violet",
        grid: nextModuleGrid(state.canvasModules.length, "react-component", true),
        content: [
          "## Gemma Workspace",
          sources.length
            ? "Queued surfaces assembled into a build workspace. Ask Gemma to populate, reconcile, or promote these components."
            : "No queued surfaces yet. Add workspace items or select evidence, then build again.",
          "",
          ...sources.map((item) => `- **${item.label}**: ${item.detail}`),
        ].join("\n"),
        code: sources.map((item) => item.code || item.content || `${item.label}: ${item.detail}`).filter(Boolean).join("\n\n---\n\n"),
      };
      return {
        activeTab: "Workspace",
        canvasModules: [module, ...state.canvasModules],
        activeModuleId: id,
        queuedWorkspaceItems: state.queuedWorkspaceItems.filter((item) => !sources.some((source) => source.id === item.id)),
        ledger: appendEvent(state.ledger, "gemma_workspace_built", `${sources.length} surfaces`, "gemma4"),
        lastSaved: "now",
      };
    }),
  createDecisionGateSurface: () => {
    const id = `decision-gates-${Date.now().toString(36)}`;
    set((state) => {
      const module: CanvasModule = {
        id,
        kind: "table",
        title: "Decision Gate Board",
        subtitle: state.tasks.length
          ? `${state.tasks.length} evidence-linked gate${state.tasks.length === 1 ? "" : "s"}`
          : "Operator and Gemma gate schema surface",
        collapsed: false,
        docked: false,
        pinned: false,
        accent: "amber",
        renderMode: "preview",
        content: decisionGateTable(state.tasks),
        grid: nextModuleGrid(state.canvasModules.length, "table"),
      };
      return {
        activeTab: "Workspace",
        canvasModules: [module, ...state.canvasModules],
        activeModuleId: id,
        gemmaOpen: true,
        queuedWorkspaceItems: upsertQueueItem(
          state.queuedWorkspaceItems,
          queueFromModule(module, buildDecisionGateWorkspaceSchema()),
        ),
        ledger: appendEvent(state.ledger, "decision_gate_surface_created", module.title, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    });
    return id;
  },
  createCommunicationPlanSurface: () => {
    const id = `communication-plan-${Date.now().toString(36)}`;
    set((state) => {
      const module: CanvasModule = {
        id,
        kind: "markdown",
        title: "Communication Plan",
        subtitle: "Stakeholder update draft queued for Gemma",
        collapsed: false,
        docked: false,
        pinned: false,
        accent: "blue",
        renderMode: "preview",
        content: communicationPlanTemplate(state.declaration, state.attachments.length, state.tasks.length),
        grid: nextModuleGrid(state.canvasModules.length, "markdown"),
      };
      return {
        activeTab: "Workspace",
        canvasModules: [module, ...state.canvasModules],
        activeModuleId: id,
        gemmaOpen: true,
        queuedWorkspaceItems: upsertQueueItem(
          state.queuedWorkspaceItems,
          queueFromModule(module, buildCommunicationPlanSchema()),
        ),
        ledger: appendEvent(state.ledger, "communication_plan_surface_created", module.title, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    });
    return id;
  },
  focusCanvasModule: (id) =>
    set((state) => {
      const target = state.canvasModules.find((module) => module.id === id);
      if (!target) return state;
      return {
        activeModuleId: id,
        gemmaOpen: true,
        gemmaWorkspaceMode: false,
        queuedWorkspaceItems: upsertQueueItem(state.queuedWorkspaceItems, queueFromModule(target)),
        ledger: appendEvent(state.ledger, "module_queued_for_gemma", target.title, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    }),
  updateCanvasModuleContent: (id, content) =>
    set((state) => ({
      canvasModules: state.canvasModules.map((module) => (module.id === id ? { ...module, content } : module)),
      lastSaved: "now",
    })),
  commitCanvasModuleContent: (id) =>
    set((state) => {
      const target = state.canvasModules.find((module) => module.id === id);
      if (!target) return state;
      return {
        ledger: appendEvent(state.ledger, "module_content_committed", target.title, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    }),
  selectAttachment: (id) =>
    set((state) => {
      const selected = state.attachments.find((attachment) => attachment.id === id);
      return {
        selectedAttachmentId: id,
        gemmaOpen: true,
        gemmaWorkspaceMode: false,
        queuedWorkspaceItems: selected
          ? upsertQueueItem(state.queuedWorkspaceItems, queueFromAttachment(selected))
          : state.queuedWorkspaceItems,
        ledger: appendEvent(state.ledger, "artifact_selected", selected?.name ?? id),
        lastSaved: "now",
      };
    }),
  addUploadedAttachments: async (files) => {
    const uploadStamp = Date.now().toString(36);
    const batches = await Promise.all(Array.from(files).map((file, index) => buildUploadBatch(file, uploadStamp, index)));
    const incoming = batches.flatMap((batch) => batch.attachments);
    const queuedItems = batches.flatMap((batch) => batch.queueItems);
    const hydratedBatches = batches.filter((batch) => batch.hydration);
    const primitiveAdditions = hydratedBatches.flatMap((batch) => batch.payloadPrimitives);
    set((state) => {
      if (incoming.length === 0) return state;
      const topLevelFiles = batches.length;
      const extractedFiles = hydratedBatches.reduce((sum, batch) => sum + (batch.hydration?.fileCount || 0), 0);
      const uploadLabel =
        hydratedBatches.length > 0
          ? `${hydratedBatches.length} capsule${hydratedBatches.length === 1 ? "" : "s"} hydrated · ${extractedFiles} files extracted`
          : `${incoming.length} file${incoming.length === 1 ? "" : "s"}`;
      const nextQueue = queuedItems.reduce((queue, item) => upsertQueueItem(queue, item), state.queuedWorkspaceItems);
      let nextLedger = appendEvent(state.ledger, "artifacts_uploaded", `${topLevelFiles} file${topLevelFiles === 1 ? "" : "s"}`);
      for (const batch of hydratedBatches) {
        if (!batch.hydration) continue;
        const capsuleDirectory = capsuleAssetDirectory(batch.hydration);
        nextLedger = appendEvent(nextLedger, "capsule_hydrated", `${batch.hydration.capsuleName} · ${batch.hydration.fileCount} files`, state.operatorIdentity.operatorId);
        for (const file of batch.hydration.files.slice(0, 12)) {
          nextLedger = appendEvent(nextLedger, "capsule_file_extracted", namespacedCapsulePath(batch.hydration, file.path), state.operatorIdentity.operatorId);
        }
        nextLedger = appendEvent(nextLedger, "capsule_directory_ready", capsuleDirectory, state.operatorIdentity.operatorId);
      }
      return {
        attachments: [...incoming, ...state.attachments],
        selectedAttachmentId: incoming[0].id,
        documentOpen: false,
        activeTab: "Assets",
        payloadPrimitives: mergePayloadPrimitives(state.payloadPrimitives, primitiveAdditions),
        activeAnalysis: [
          {
            id: `analysis-${Date.now().toString(36)}`,
            label: hydratedBatches.length > 0 ? "Hydrated capsule ready for Gemma digest" : "Indexing uploaded artifacts",
            source: uploadLabel,
            confidence: hydratedBatches.length > 0 ? 86 : 72,
            progress: hydratedBatches.length > 0 ? 100 : 44,
            status: hydratedBatches.length > 0 ? "queued" : "active",
          },
          ...state.activeAnalysis.slice(0, 3),
        ],
        queuedWorkspaceItems: nextQueue,
        gemmaOpen: true,
        ledger: nextLedger,
        lastSaved: "now",
      };
    });
  },
  setDocumentOpen: (open) => set({ documentOpen: open }),
  setDocumentQuery: (query) => set({ documentQuery: query }),
  toggleGemma: () => set((state) => ({ gemmaOpen: !state.gemmaOpen })),
  setGemmaWorkspaceMode: (enabled) => set({ gemmaWorkspaceMode: enabled, gemmaOpen: true, documentOpen: false }),
  updateRuntime: (runtime) =>
    set((state) => ({
      runtime: { ...state.runtime, ...runtime },
      runtimeHealth: {
        status: runtime.enabled === false ? "disabled" : "checking",
        detail: runtime.enabled === false ? "Ollama disabled; deterministic local fallback is active." : "Checking local Ollama runtime.",
        checkedAt: "now",
      },
    })),
  checkRuntime: async () => {
    const runtime = get().runtime;
    set({
      runtimeHealth: {
        status: runtime.enabled ? "checking" : "disabled",
        detail: runtime.enabled ? "Checking local Ollama runtime." : "Ollama disabled; deterministic local fallback is active.",
        checkedAt: "now",
      },
    });
    const health = await checkRuntimeHealth(runtime);
    const current = get().runtime;
    if (
      current.enabled === runtime.enabled &&
      current.endpoint === runtime.endpoint &&
      current.model === runtime.model
    ) {
      set({ runtimeHealth: health });
    }
  },
  updateOperatorId: (operatorId) =>
    set((state) => {
      const nextId = operatorId.trim() || state.operatorIdentity.operatorId;
      return {
        operatorIdentity: { ...state.operatorIdentity, operatorId: nextId },
        ledger: appendEvent(state.ledger, "operator_updated", nextId, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    }),
  generateOperatorPrimitives: async () => {
    const current = get().operatorIdentity;
    const next = await createProtocolOperatorIdentityWithKeys(current.operatorId);
    set((state) => ({
      operatorIdentity: next,
      protocolPackagePayload: null,
      protocolPackageName: "",
      protocolPackageHash: "",
      ledger: appendEvent(state.ledger, "operator_protocol_keys_generated", next.certificateId, state.operatorIdentity.operatorId),
      lastSaved: "now",
    }));
  },
  exportOperatorPublicKeys: async () => {
    const identity = get().operatorIdentity;
    const payload = JSON.stringify(exportProtocolOperatorPublicBundle(identity), null, 2);
    set((state) => ({
      keyExportPayload: payload,
      keyExportName: `${safeExportName(identity.operatorId)}-public-keys.json`,
      keyImportStatus: "Public operator keys ready for download.",
      ledger: appendEvent(state.ledger, "operator_public_keys_exported", identity.certificateId, state.operatorIdentity.operatorId),
      lastSaved: "now",
    }));
  },
  exportOperatorPrivateKeys: async () => {
    const current = get().operatorIdentity;
    const identity = hasProtocolSigningKey(current)
      ? current
      : await createProtocolOperatorIdentityWithKeys(current.operatorId);
    const payload = JSON.stringify(await exportProtocolOperatorPrivateBundle(identity), null, 2);
    set((state) => ({
      operatorIdentity: identity,
      keyExportPayload: payload,
      keyExportName: `${safeExportName(identity.operatorId)}-private-key-bundle.json`,
      keyImportStatus: "Private operator key bundle ready for download.",
      ledger: appendEvent(state.ledger, "operator_private_keys_exported", identity.certificateId, state.operatorIdentity.operatorId),
      lastSaved: "now",
    }));
  },
  importOperatorKeyBundle: async (file) => {
    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const identity = await importProtocolOperatorKeyBundle(parsed);
      set((state) => ({
        operatorIdentity: identity,
        protocolPackagePayload: null,
        protocolPackageName: "",
        protocolPackageHash: "",
        keyImportStatus: `Imported ${identity.cryptoStatus === "webcrypto-ready" ? "private" : "public"} key bundle for ${identity.operatorId}.`,
        ledger: appendEvent(state.ledger, "operator_key_bundle_imported", file.name, state.operatorIdentity.operatorId),
        lastSaved: "now",
      }));
    } catch (error) {
      set({
        keyImportStatus: error instanceof Error ? error.message : "Operator key import failed.",
      });
    }
  },
  toggleTask: (id) =>
    set((state) => ({
      tasks: state.tasks.map((task) => (task.id === id ? { ...task, done: !task.done } : task)),
      ledger: appendLedger(state.ledger, taskLedgerLabel(state.tasks.find((task) => task.id === id)?.text ?? "task")),
      lastSaved: "now",
    })),
  queueDecisionGateForGemma: (id) =>
    set((state) => {
      const task = state.tasks.find((item) => item.id === id);
      if (!task) return state;
      return {
        gemmaOpen: true,
        queuedWorkspaceItems: upsertQueueItem(state.queuedWorkspaceItems, {
          id: `queue-gate-${task.id}`,
          kind: "selection",
          icon: "selection",
          tone: task.severity === "critical" || task.severity === "high" ? "rose" : task.severity === "medium" ? "amber" : "sage",
          label: task.text,
          detail: `Decision gate · ${task.severity} · ${task.evidence || "no evidence linked"}`,
          content: `Decision gate: ${task.text}\nSeverity: ${task.severity}\nSource: ${task.source}\nEvidence: ${task.evidence || "none"}\nStatus: ${task.done ? "complete" : "open"}`,
          queuedAt: timeLabel(),
        }),
        ledger: appendEvent(state.ledger, "decision_gate_queued", task.text, state.operatorIdentity.operatorId),
        lastSaved: "now",
      };
    }),
  addContextSnippet: (snippet, source) =>
    set((state) => ({
      snippets: [...state.snippets, snippet],
      tokenUsed: Math.min(state.tokenMax, state.tokenUsed + Math.max(160, Math.round(snippet.length * 1.7))),
      ledger: [
        ...state.ledger,
        {
          id: `event-${205 + state.ledger.length}`,
          time: timeLabel(),
          action: "context_added",
          target: source,
          actor: state.operatorIdentity.operatorId,
        },
      ],
      gemmaOpen: true,
      queuedWorkspaceItems: upsertQueueItem(state.queuedWorkspaceItems, queueFromSelection(snippet, source)),
      lastSaved: "now",
    })),
  askGemma: async (question) => {
    const trimmed = question.trim();
    if (!trimmed || get().gemmaBusy) return;
    const controller = new AbortController();
    const analysisId = `analysis-${Date.now().toString(36)}-${randomHex(2)}`;
    const operatorMessage: Message = {
      id: crypto.randomUUID(),
      role: "operator",
      text: trimmed,
      time: timeLabel(),
    };

    set((state) => ({
      gemmaOpen: true,
      gemmaBusy: true,
      inferenceController: controller,
      messages: [...state.messages, operatorMessage],
      activeAnalysis: [
        createAnalysisTask(analysisId, trimmed, state.queuedWorkspaceItems, state.activeModuleId),
        ...state.activeAnalysis.slice(0, 5),
      ],
    }));

    try {
      const state = get();
      const preflight = await checkRuntimeHealth(state.runtime, controller.signal);
      set((current) =>
        current.inferenceController === controller
          ? { runtimeHealth: preflight }
          : current,
      );
      const currentState = get();
      const focusedModule = focusedModuleForPrompt(currentState.canvasModules.find((module) => module.id === currentState.activeModuleId));
      const answer = await runGemmaQuestion(
        trimmed,
        currentState.runtime,
        currentState.attachments,
        currentState.snippets,
        currentState.declaration.systemPrompt,
        currentState.queuedWorkspaceItems,
        focusedModule,
        controller.signal,
      );
      set((current) => {
        const artifacts = applyGemmaAnswerArtifacts(current, answer.text);
        const ledgerBase = artifacts.ledger ?? current.ledger;
        return {
          gemmaBusy: false,
          inferenceController: null,
          runtimeHealth: {
            status: answer.usedLocalModel ? "connected" : "fallback",
            detail: answer.usedLocalModel
              ? `${current.runtime.model} answered through local Ollama.`
              : `${answer.errorDetail || "Ollama did not answer."} Deterministic local fallback is active.`,
            checkedAt: timeLabel(),
          },
          ...artifacts,
          activeAnalysis: completeAnalysisTask(current.activeAnalysis, analysisId, answer.usedLocalModel ? 93 : 84),
          ledger: appendEvent(
            ledgerBase,
            answer.usedLocalModel ? "local_inference" : "offline_analysis",
            "gemma4",
            "gemma4",
          ),
          lastSaved: "now",
        };
      });
    } catch (error) {
      set((current) => ({
        gemmaBusy: false,
        inferenceController: null,
        activeAnalysis: resolveAnalysisTask(current.activeAnalysis, analysisId, error instanceof DOMException ? "cancelled" : "failed"),
        messages: [
          ...current.messages,
          {
            id: crypto.randomUUID(),
            role: "gemma",
            text: error instanceof DOMException ? "Inference cancelled by operator." : "Inference failed locally.",
            time: timeLabel(),
          },
        ],
      }));
    }
  },
  cancelInference: () => {
    get().inferenceController?.abort();
  },
  sealCapsule: async () => {
    const currentStage = get().sealStage;
    if (currentStage !== "idle" && currentStage !== "exported") return;
    set({
      sealStage: "stage",
      exportPayload: "",
      protocolPackagePayload: null,
      protocolPackageName: "",
      protocolPackageHash: "",
    });
    await pause(360);
    set({ sealStage: "hash" });
    await pause(420);
    set({ sealStage: "seal" });
    await pause(420);
    set({ sealStage: "sign" });
    await pause(420);

    const state = get();
    const operatorIdentity = hasProtocolSigningKey(state.operatorIdentity)
      ? state.operatorIdentity
      : await createProtocolOperatorIdentityWithKeys(state.operatorIdentity.operatorId);
    const sealEvent: LedgerEvent = {
      id: `event-${205 + state.ledger.length}`,
      time: timeLabel(),
      action: "capsule_sealed",
      target: state.investigationId,
      actor: operatorIdentity.operatorId,
    };
    const sealedLedger = [...state.ledger, sealEvent];
    const artifact = await buildCapsuleExport({
      operatorIdentity,
      investigationId: state.investigationId,
      attachments: state.attachments,
      tasks: state.tasks,
      ledger: sealedLedger,
      activeAnalysis: state.activeAnalysis,
      snippets: state.snippets,
    });
    const protocolPackage = await buildProtocolCapsulePackage({
      operatorIdentity,
      investigationId: state.investigationId,
      attachments: state.attachments,
      tasks: state.tasks,
      ledger: sealedLedger,
      activeAnalysis: state.activeAnalysis,
      snippets: state.snippets,
    });
    const payload = JSON.stringify(artifact, null, 2);
    set({
      sealStage: "exported",
      exportPayload: payload,
      protocolPackagePayload: protocolPackage.bytes,
      protocolPackageName: protocolPackage.fileName,
      protocolPackageHash: protocolPackage.capsuleHash,
      sealHash: protocolPackage.capsuleHash.slice(0, 16),
      operatorIdentity,
      ledger: sealedLedger,
      lastSaved: "now",
    });
  },
  hydrateSnapshot: (snapshot) =>
    set((state) => ({
      ...snapshot,
      canvasModules: (snapshot.canvasModules || state.canvasModules).map((module, index) => ({
        ...module,
        grid: module.grid || nextModuleGrid(index, module.kind, module.docked),
      })),
      activeModuleId: snapshot.activeModuleId || state.activeModuleId,
      knowledgeFacts: snapshot.knowledgeFacts || state.knowledgeFacts,
      investigationId: snapshot.investigationId || state.investigationId,
      declaration: snapshot.declaration || state.declaration,
      operatorIdentity: normalizeProtocolOperatorIdentity(snapshot.operatorIdentity, state.operatorIdentity.operatorId),
      payloadPrimitives: snapshot.payloadPrimitives || (snapshot.declaration?.declared ? buildPayloadPrimitives(snapshot.investigationId || state.investigationId, state.operatorIdentity.operatorId) : state.payloadPrimitives),
      runtime: snapshot.runtime
        ? {
            ...state.runtime,
            endpoint: snapshot.runtime.endpoint || state.runtime.endpoint,
            model: normalizeModel(snapshot.runtime.model || state.runtime.model),
            enabled: snapshot.runtime.enabled ?? state.runtime.enabled,
          }
        : state.runtime,
    })),
}));

export function snapshotFromState(state: WorkspaceState): PersistedState {
  return {
    messages: state.messages,
    queuedWorkspaceItems: state.queuedWorkspaceItems,
    tasks: state.tasks,
    ledger: state.ledger,
    snippets: state.snippets,
    tokenUsed: state.tokenUsed,
    runtime: state.runtime,
    operatorIdentity: state.operatorIdentity,
    investigationId: state.investigationId,
    declaration: state.declaration,
    lastSaved: state.lastSaved,
    canvasModules: state.canvasModules,
    activeModuleId: state.activeModuleId,
    knowledgeFacts: state.knowledgeFacts,
    attachments: state.attachments,
    payloadPrimitives: state.payloadPrimitives,
    selectedAttachmentId: state.selectedAttachmentId,
    documentOpen: state.documentOpen,
  };
}

function appendLedger(ledger: LedgerEvent[], target: string): LedgerEvent[] {
  return appendEvent(ledger, "decision_gate_updated", target);
}

function createAnalysisTask(
  id: string,
  question: string,
  queue: WorkspaceQueueItem[],
  activeModuleId: string,
): AnalysisTask {
  return {
    id,
    label: analysisLabelForQuestion(question, queue),
    source: analysisSourceForQueue(queue, activeModuleId),
    confidence: 0,
    progress: 18,
    status: "active",
  };
}

function completeAnalysisTask(tasks: AnalysisTask[], id: string, confidence: number): AnalysisTask[] {
  return tasks.map((task) =>
    task.id === id
      ? { ...task, progress: 100, confidence, status: "complete" }
      : task.status === "active"
        ? { ...task, progress: Math.min(96, task.progress + 12) }
        : task,
  );
}

function resolveAnalysisTask(tasks: AnalysisTask[], id: string, outcome: "cancelled" | "failed"): AnalysisTask[] {
  return tasks.map((task) =>
    task.id === id
      ? {
          ...task,
          label: outcome === "cancelled" ? "Inference cancelled" : "Local analysis failed",
          confidence: 0,
          progress: 100,
          status: "complete",
        }
      : task,
  );
}

function analysisLabelForQuestion(question: string, queue: WorkspaceQueueItem[]) {
  const requestedSurface = queue[0]?.label;
  if (requestedSurface) return `Analyzing ${requestedSurface}`;
  const compact = question.replace(/\s+/g, " ").trim();
  return compact.length > 42 ? `${compact.slice(0, 39)}...` : compact || "Running local inference";
}

function analysisSourceForQueue(queue: WorkspaceQueueItem[], activeModuleId: string) {
  if (queue.length > 0) {
    const first = queue[0];
    return `${queue.length} queued item${queue.length === 1 ? "" : "s"} · ${first.kind}`;
  }
  return activeModuleId ? "focused workspace module" : "local prompt";
}

function appendEvent(ledger: LedgerEvent[], action: string, target: string, actor = "local-operator"): LedgerEvent[] {
  return [
    ...ledger,
    {
      id: `event-${205 + ledger.length}`,
      time: timeLabel(),
      action,
      target,
      actor,
    },
  ];
}

function buildPayloadPrimitives(investigationId: string, operatorId: string): PayloadPrimitive[] {
  const timestamp = timeLabel();
  return [
    {
      id: "primitive-manifest",
      name: "manifest.json",
      path: "manifest.json",
      kind: "manifest",
      status: "generated",
      timestamp,
      detail: `${investigationId} manifest generated by ${operatorId}`,
    },
    {
      id: "primitive-payload",
      name: "payload/",
      path: "payload/",
      kind: "payload",
      status: "generated",
      timestamp,
      detail: "Workspace surfaces and uploaded artifacts will be staged here.",
    },
    {
      id: "primitive-chain",
      name: "chain/events.jsonl",
      path: "chain/events.jsonl",
      kind: "chain",
      status: "generated",
      timestamp,
      detail: "Append-only event chain initialized for the declared environment.",
    },
    {
      id: "primitive-envelope",
      name: "provenance/envelope.json",
      path: "provenance/envelope.json",
      kind: "provenance",
      status: "generated",
      timestamp,
      detail: "Provenance envelope prepared for local seal/export.",
    },
  ];
}

type UploadBatch = {
  attachments: Attachment[];
  payloadPrimitives: PayloadPrimitive[];
  queueItems: WorkspaceQueueItem[];
  hydration?: CapsuleHydration;
};

async function buildUploadBatch(file: File, uploadStamp: string, index: number): Promise<UploadBatch> {
  if (isCapsuleUpload(file)) {
    try {
      const hydration = await hydrateCapsuleFile(file);
      const capsuleAttachment: Attachment = {
        id: `capsule-${uploadStamp}-${index}`,
        name: file.name,
        type: "CAPSU",
        status: "verified",
        size: file.size,
        content: capsuleHydrationPreview(hydration),
        timestamp: hydration.hydratedAt,
        capsuleHydration: hydration,
      };
      return {
        attachments: [capsuleAttachment, ...flattenHydratedCapsuleAttachments(capsuleAttachment.id, hydration)],
        payloadPrimitives: payloadPrimitivesFromHydration(hydration),
        queueItems: [queueFromHydratedCapsule(capsuleAttachment, hydration)],
        hydration,
      };
    } catch (error) {
      const attachment = await standardUploadAttachment(file, uploadStamp, index, `Capsule hydration failed: ${error instanceof Error ? error.message : "unknown error"}`);
      return { attachments: [attachment], payloadPrimitives: [], queueItems: [queueFromAttachment(attachment)] };
    }
  }

  const attachment = await standardUploadAttachment(file, uploadStamp, index);
  return { attachments: [attachment], payloadPrimitives: [], queueItems: [queueFromAttachment(attachment)] };
}

async function standardUploadAttachment(file: File, uploadStamp: string, index: number, prefix = ""): Promise<Attachment> {
  const content = await readFilePreview(file);
  return {
    id: `upload-${uploadStamp}-${index}`,
    name: file.name,
    type: inferAttachmentType(file.name),
    status: "review",
    size: file.size,
    content: prefix ? `${prefix}\n\n${content}` : content,
    timestamp: timeLabel(),
  };
}

function capsuleAssetDirectory(hydration: CapsuleHydration) {
  const source = hydration.capsuleName || hydration.sourceName || hydration.id;
  return `capsules/${slugify(source) || "imported-capsule"}`;
}

function namespacedCapsulePath(hydration: CapsuleHydration, path: string) {
  return `${capsuleAssetDirectory(hydration)}/${path.replace(/^\/+/, "")}`;
}

function namespacedHydratedContent(hydration: CapsuleHydration, file: CapsuleHydratedFile, namespacedPath: string) {
  return [
    `CAPSULE_SOURCE=${hydration.sourceName}`,
    `CAPSULE_DIRECTORY=${capsuleAssetDirectory(hydration)}`,
    `CAPSULE_PATH=${file.path}`,
    `ASSET_PATH=${namespacedPath}`,
    "",
    file.content || `Binary extracted file: ${file.path}\nSize: ${file.size} bytes`,
  ].join("\n");
}

function flattenHydratedCapsuleAttachments(parentId: string, hydration: CapsuleHydration): Attachment[] {
  return hydration.files.map((file, index) => {
    const namespacedPath = namespacedCapsulePath(hydration, file.path);
    return {
      id: `${parentId}-file-${index}-${slugify(namespacedPath) || "entry"}`,
      name: namespacedPath,
      type: file.type,
      status: file.binary ? "observed" : "verified",
      size: file.size,
      content: namespacedHydratedContent(hydration, file, namespacedPath),
      timestamp: hydration.hydratedAt,
      hydratedFrom: parentId,
      capsulePath: namespacedPath,
    };
  });
}

function payloadPrimitivesFromHydration(hydration: CapsuleHydration): PayloadPrimitive[] {
  return hydration.files
    .filter(isPrimitiveHydratedFile)
    .map((file) => {
      const namespacedPath = namespacedCapsulePath(hydration, file.path);
      return {
        id: `hydrated-${hydration.id}-${slugify(namespacedPath) || file.kind}`,
        name: namespacedPath,
        path: namespacedPath,
        kind: file.kind as PayloadPrimitive["kind"],
        status: "generated" as const,
        timestamp: hydration.hydratedAt,
        detail: `Extracted from ${hydration.sourceName} · original ${file.path} · ${formatBytes(file.size)}`,
      };
    });
}

function isPrimitiveHydratedFile(file: CapsuleHydratedFile) {
  return file.kind === "manifest" || file.kind === "payload" || file.kind === "chain" || file.kind === "provenance";
}

function mergePayloadPrimitives(existing: PayloadPrimitive[], incoming: PayloadPrimitive[]) {
  if (incoming.length === 0) return existing;
  const seen = new Set<string>();
  return [...incoming, ...existing].filter((primitive) => {
    const key = primitive.id;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function capsuleHydrationPreview(hydration: CapsuleHydration) {
  return [
    "HYDRATED_CAPSULE",
    `capsule=${hydration.capsuleName}`,
    `source=${hydration.sourceName}`,
    `files=${hydration.fileCount}`,
    `payload_files=${hydration.payloadCount}`,
    `events=${hydration.eventCount}`,
    hydration.manifestId ? `manifest=${hydration.manifestId}` : "",
    `directory=${capsuleAssetDirectory(hydration)}`,
    "",
    "EXTRACTED_FILES",
    ...hydration.files.slice(0, 18).map((file) => `${namespacedCapsulePath(hydration, file.path)} · ${file.kind} · ${formatBytes(file.size)}`),
    hydration.files.length > 18 ? `... ${hydration.files.length - 18} additional files` : "",
  ].filter(Boolean).join("\n");
}

function focusedModuleForPrompt(module: CanvasModule | undefined): FocusedCanvasContext | undefined {
  if (!module) return undefined;
  return {
    id: module.id,
    kind: module.kind,
    title: module.title,
    subtitle: module.subtitle,
    content: module.content,
    code: module.code,
  };
}

function upsertQueueItem(queue: WorkspaceQueueItem[], item: WorkspaceQueueItem): WorkspaceQueueItem[] {
  const existing = queue.findIndex((queued) => queued.id === item.id);
  if (existing === -1) return [item, ...queue].slice(0, 14);
  const next = [...queue];
  next[existing] = { ...next[existing], ...item, queuedAt: timeLabel() };
  return next;
}

function queueFromModule(module: CanvasModule | undefined, schema?: unknown): WorkspaceQueueItem {
  if (!module) {
    return {
      id: `queue-workspace-${Date.now().toString(36)}`,
      kind: "workspace",
      icon: "workspace",
      tone: "blue",
      label: "Workspace item",
      detail: "Workspace item queued for Gemma.",
      queuedAt: timeLabel(),
      schema,
    };
  }
  return {
    id: `queue-module-${module.id}`,
    kind: "module",
    icon: iconForModuleKind(module.kind),
    tone: module.accent,
    label: module.title,
    detail: module.subtitle,
    moduleId: module.id,
    content: module.content,
    code: module.code,
    schema,
    queuedAt: timeLabel(),
  };
}

function queueFromAttachment(attachment: Attachment): WorkspaceQueueItem {
  if (attachment.capsuleHydration) return queueFromHydratedCapsule(attachment, attachment.capsuleHydration);
  return {
    id: `queue-asset-${attachment.id}`,
    kind: "asset",
    icon: "asset",
    tone: attachment.status === "review" ? "rose" : attachment.status === "sealed" ? "amber" : attachment.status === "verified" ? "sage" : "blue",
    label: attachment.name,
    detail: `${attachment.type} payload asset · ${attachment.status}`,
    attachmentId: attachment.id,
    content: attachment.content,
    queuedAt: timeLabel(),
  };
}

function queueFromHydratedCapsule(attachment: Attachment, hydration: CapsuleHydration): WorkspaceQueueItem {
  return {
    id: `queue-capsule-${attachment.id}`,
    kind: "asset",
    icon: "asset",
    tone: "sage",
    label: `Hydrated capsule: ${hydration.capsuleName}`,
    detail: `${hydration.fileCount} files extracted · ${hydration.eventCount} events · ready for local digest`,
    attachmentId: attachment.id,
    content: [
      "HYDRATED CAPSULE ASSET MAP",
      `Directory: ${capsuleAssetDirectory(hydration)}`,
      "Gemma should reason over the namespaced asset paths and preserve original paths as source metadata.",
      "",
      hydration.digestPrompt,
    ].join("\n"),
    schema: {
      schema_version: "capsules-run-operators.hydrated_capsule_digest.v1",
      source_capsule: hydration.sourceName,
      capsule_name: hydration.capsuleName,
      source_capsule_directory: capsuleAssetDirectory(hydration),
      extracted_files: hydration.files.map((file) => ({
        path: namespacedCapsulePath(hydration, file.path),
        original_path: file.path,
        kind: file.kind,
        type: file.type,
        size: file.size,
      })),
      expected_output: [
        "Markdown continuity summary",
        "Decision gates JSON block when operator decisions are present",
        "Knowledge graph facts JSON block when relationships are present",
      ],
    },
    queuedAt: timeLabel(),
  };
}

function queueFromSelection(snippet: string, source: string): WorkspaceQueueItem {
  return {
    id: `queue-selection-${Date.now().toString(36)}-${randomHex(2)}`,
    kind: "selection",
    icon: "selection",
    tone: "blue",
    label: "Selected context",
    detail: source,
    content: snippet,
    queuedAt: timeLabel(),
  };
}

function applyGemmaAnswerArtifacts(
  state: WorkspaceState,
  text: string,
): Partial<Pick<WorkspaceState, "messages" | "canvasModules" | "activeModuleId" | "queuedWorkspaceItems" | "tasks" | "knowledgeFacts" | "ledger">> {
  const message = {
    id: crypto.randomUUID(),
    role: "gemma" as const,
    text,
    time: timeLabel(),
  };
  const decisionGateResult = appendDecisionGateTasks(state.tasks, extractDecisionGates(text));
  const knowledgeFacts = mergeKnowledgeFacts(state.knowledgeFacts, extractKnowledgeFacts(text));
  const baseArtifacts: Partial<Pick<WorkspaceState, "messages" | "tasks" | "knowledgeFacts" | "ledger">> = {
    messages: [...state.messages, message],
  };
  if (decisionGateResult.added > 0) {
    baseArtifacts.tasks = decisionGateResult.tasks;
    baseArtifacts.ledger = appendEvent(
      state.ledger,
      "decision_gates_generated",
      `${decisionGateResult.added} gate${decisionGateResult.added === 1 ? "" : "s"}`,
      "gemma4",
    );
  }
  if (knowledgeFacts.length !== state.knowledgeFacts.length) {
    baseArtifacts.knowledgeFacts = knowledgeFacts;
    baseArtifacts.ledger = appendEvent(
      baseArtifacts.ledger ?? state.ledger,
      "knowledge_graph_updated",
      `${knowledgeFacts.length - state.knowledgeFacts.length} fact${knowledgeFacts.length - state.knowledgeFacts.length === 1 ? "" : "s"}`,
      "gemma4",
    );
  }

  const hydration = hydrateQueuedModulesFromAnswer(state.canvasModules, state.queuedWorkspaceItems, text);
  const hydratedModules = hydration.modules;
  const hydratedQueue = hydration.queue;
  const concern = extractConcern(text);

  if (hydration.updated > 0 || !concern) {
    return hydration.updated > 0
      ? {
          ...baseArtifacts,
          canvasModules: hydratedModules,
          activeModuleId: hydration.activeId || state.activeModuleId,
          queuedWorkspaceItems: hydratedQueue,
        }
      : baseArtifacts;
  }

  const id = `gemma-finding-${Date.now().toString(36)}`;
  const graphRequested = shouldRenderConcernAsGraph(state, text);
  const mermaidCode = extractMermaidCode(text);
  const title = graphRequested ? `${titleFromGemmaResponse(text, concern)} Graph` : titleFromGemmaResponse(text, concern);
  const module: CanvasModule = {
    id,
    kind: graphRequested ? "graph" : "markdown",
    title,
    subtitle: graphRequested ? `Generated topology: ${concern}` : concern,
    collapsed: false,
    docked: graphRequested,
    pinned: false,
    accent: "rose",
    renderMode: graphRequested ? undefined : "preview",
    grid: nextModuleGrid(state.canvasModules.length, graphRequested ? "graph" : "markdown", graphRequested),
    content: formatConcernPreview(concern, text),
    code: graphRequested ? mermaidCode : undefined,
  };

  return {
    ...baseArtifacts,
    canvasModules: [module, ...hydratedModules],
    activeModuleId: id,
    queuedWorkspaceItems: upsertQueueItem(hydratedQueue, {
      id: `queue-concern-${id}`,
      kind: "concern",
      icon: graphRequested ? "graph" : "concern",
      tone: "rose",
      label: title,
      detail: concern,
      moduleId: id,
      content: module.content,
      code: module.code,
      queuedAt: timeLabel(),
    }),
  };
}

type ParsedDecisionGate = {
  text: string;
  severity: Severity;
  evidence: string;
};

function extractDecisionGates(text: string): ParsedDecisionGate[] {
  const fromJson = extractDecisionGatesFromJson(text);
  if (fromJson.length > 0) return fromJson.slice(0, 5);
  return extractDecisionGatesFromChecklist(text).slice(0, 5);
}

function extractDecisionGatesFromJson(text: string): ParsedDecisionGate[] {
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)].map((match) => match[1]);
  const candidates: ParsedDecisionGate[] = [];

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block) as unknown;
      const gates = Array.isArray(parsed)
        ? parsed
        : isRecord(parsed) && Array.isArray(parsed.decision_gates)
          ? parsed.decision_gates
          : [];
      for (const gate of gates) {
        const normalized = normalizeDecisionGate(gate);
        if (normalized) candidates.push(normalized);
      }
    } catch {
      continue;
    }
  }

  return candidates;
}

function extractDecisionGatesFromChecklist(text: string): ParsedDecisionGate[] {
  const gates: ParsedDecisionGate[] = [];
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^\s*[-*]\s*\[[ xX]?\]\s+(.+?)\s*$/);
    if (!match) continue;
    const raw = match[1].trim();
    const severityMatch = raw.match(/\b(?:severity|sev)\s*[:=]\s*(low|medium|high|critical)\b/i);
    const evidenceMatch = raw.match(/\b(?:evidence|source)\s*[:=]\s*([^;()]+)\b/i);
    gates.push({
      text: raw.replace(/\s*\((?:severity|sev|evidence|source)[^)]+\)/gi, "").trim(),
      severity: normalizeSeverity(severityMatch?.[1]),
      evidence: evidenceMatch?.[1]?.trim() || "Gemma response",
    });
  }
  return gates;
}

function normalizeDecisionGate(value: unknown): ParsedDecisionGate | null {
  if (!isRecord(value)) return null;
  const text = typeof value.text === "string" ? value.text.trim() : "";
  if (!text) return null;
  return {
    text,
    severity: normalizeSeverity(typeof value.severity === "string" ? value.severity : ""),
    evidence: typeof value.evidence === "string" && value.evidence.trim() ? value.evidence.trim() : "Gemma response",
  };
}

function appendDecisionGateTasks(tasks: OperatorTask[], gates: ParsedDecisionGate[]) {
  const existing = new Set(tasks.map((task) => normalizeTaskText(task.text)));
  const additions: OperatorTask[] = [];

  for (const gate of gates) {
    const key = normalizeTaskText(gate.text);
    if (!key || existing.has(key)) continue;
    existing.add(key);
    additions.push({
      id: `gate-${Date.now().toString(36)}-${additions.length}-${randomHex(2)}`,
      text: gate.text,
      source: "gemma4",
      severity: gate.severity,
      done: false,
      evidence: gate.evidence,
    });
  }

  return {
    tasks: [...tasks, ...additions],
    added: additions.length,
  };
}

function normalizeSeverity(value: string | undefined): Severity {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") return normalized;
  return "medium";
}

function normalizeTaskText(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractConcern(text: string) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*#\s]+/, "").trim())
    .filter(Boolean);
  const concern = lines.find((line) => /\b(concern|risk|warning|suspicious|critical|blocked|failure|failed|anomal|high confidence)\b/i.test(line));
  return concern?.slice(0, 120) ?? "";
}

function titleFromGemmaResponse(text: string, fallback: string) {
  const heading = text.match(/^\s{0,3}#{1,3}\s+(.+)$/m)?.[1];
  const bold = text.match(/\*\*([^*\n]{4,70})\*\*/)?.[1];
  const candidate = (heading || bold || fallback)
    .replace(/\b(gemma|concern|warning|risk)\b[:\s-]*/gi, "")
    .replace(/[`*_#[\]{}()]/g, "")
    .trim();
  return titleCase(candidate || "Operational Finding").slice(0, 72);
}

function titleCase(value: string) {
  return value
    .split(/\s+/)
    .map((part) => (part.length <= 3 && part === part.toUpperCase() ? part : `${part.slice(0, 1).toUpperCase()}${part.slice(1)}`))
    .join(" ");
}

function shouldRenderConcernAsGraph(state: WorkspaceState, text: string) {
  const newestQueueItem = state.queuedWorkspaceItems[0];
  const activeModule = state.canvasModules.find((module) => module.id === state.activeModuleId);
  const queuedGraphRequest = newestQueueItem
    ? newestQueueItem.icon === "graph" || /\b(graph|topology|relationship|mermaid)\b/i.test(`${newestQueueItem.label} ${newestQueueItem.detail}`)
    : false;
  const activeGraphSurface = activeModule
    ? activeModule.kind === "graph" || activeModule.kind === "mermaid" || activeModule.kind === "attack-flow"
    : false;

  return queuedGraphRequest || activeGraphSurface;
}

function formatConcernPreview(concern: string, text: string) {
  return [
    `## ${titleFromGemmaResponse(text, concern)}`,
    concern,
    "",
    "### Source response",
    text.slice(0, 1600),
  ].join("\n");
}

function hydrateQueuedModulesFromAnswer(modules: CanvasModule[], queue: WorkspaceQueueItem[], text: string) {
  const mermaidCode = extractMermaidCode(text);
  const tableMarkdown = extractMarkdownTable(text);
  const contentMarkdown = extractWorkspaceMarkdown(text);
  const updatedIds = new Set<string>();
  let activeId = "";
  let nextModules = modules;

  if (mermaidCode) {
    const result = applyGeneratedCodeToQueuedModules(nextModules, queue, mermaidCode);
    nextModules = result.modules;
    result.updatedIds.forEach((id) => updatedIds.add(id));
  }

  if (tableMarkdown || contentMarkdown) {
    const result = applyGeneratedContentToQueuedModules(nextModules, queue, tableMarkdown || contentMarkdown, text);
    nextModules = result.modules;
    result.updatedIds.forEach((id) => updatedIds.add(id));
  }

  activeId = [...updatedIds][0] || "";
  const nextQueue = updatedIds.size
    ? queue.filter((item) => !item.moduleId || !updatedIds.has(item.moduleId))
    : queue;

  return {
    modules: nextModules,
    queue: nextQueue,
    activeId,
    updated: updatedIds.size,
  };
}

function extractMermaidCode(text: string) {
  const fenced = [...text.matchAll(/```([A-Za-z0-9_-]*)\s*\n([\s\S]*?)```/g)]
    .map((match) => ({
      language: match[1].trim().toLowerCase(),
      code: normalizeMermaidCode(match[2]),
    }))
    .find((block) => block.language === "mermaid" || startsMermaid(block.code));

  if (fenced?.code) return fenced.code;

  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => startsMermaid(line));
  if (start === -1) return "";

  const code: string[] = [];
  for (let index = start; index < lines.length; index += 1) {
    const line = lines[index];
    if (index > start && !isLikelyMermaidLine(line)) break;
    code.push(line);
  }

  return normalizeMermaidCode(code.join("\n"));
}

function normalizeMermaidCode(code: string) {
  return code
    .replace(/^\s*```(?:mermaid)?/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

function extractMarkdownTable(text: string) {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  for (let index = 0; index < lines.length - 1; index += 1) {
    if (!isMarkdownTableRow(lines[index]) || !/^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(lines[index + 1])) continue;
    const table = [lines[index], lines[index + 1]];
    for (let cursor = index + 2; cursor < lines.length; cursor += 1) {
      if (!isMarkdownTableRow(lines[cursor])) break;
      table.push(lines[cursor]);
    }
    return table.join("\n");
  }
  return "";
}

function isMarkdownTableRow(line: string) {
  const trimmed = line.trim();
  return trimmed.includes("|") && trimmed.replace(/\\\|/g, "").split("|").filter((cell) => cell.trim()).length >= 2;
}

function extractWorkspaceMarkdown(text: string) {
  return text
    .replace(/```(?:json|mermaid)?[\s\S]*?```/gi, "")
    .replace(/^\s*(WORKSPACE UPDATE|DECISION GATES|KNOWLEDGE GRAPH FACTS)\s*$/gim, "")
    .trim()
    .slice(0, 3600);
}

function extractKnowledgeFacts(text: string): KnowledgeFact[] {
  const blocks = [...text.matchAll(/```json\s*([\s\S]*?)```/gi)].map((match) => match[1]);
  const facts: KnowledgeFact[] = [];

  for (const block of blocks) {
    try {
      const parsed = JSON.parse(block) as unknown;
      const values = isRecord(parsed) && Array.isArray(parsed.knowledge_facts)
        ? parsed.knowledge_facts
        : isRecord(parsed) && Array.isArray(parsed.kg_facts)
          ? parsed.kg_facts
          : [];
      for (const value of values) {
        const fact = normalizeKnowledgeFact(value);
        if (fact) facts.push(fact);
      }
    } catch {
      continue;
    }
  }

  return facts;
}

function normalizeKnowledgeFact(value: unknown): KnowledgeFact | null {
  if (!isRecord(value)) return null;
  const source = stringField(value, "source") || stringField(value, "subject") || stringField(value, "from");
  const relation = stringField(value, "relation") || stringField(value, "predicate") || stringField(value, "verb");
  const target = stringField(value, "target") || stringField(value, "object") || stringField(value, "to");
  if (!source || !relation || !target) return null;
  const evidence = stringField(value, "evidence") || "Gemma response";
  return {
    id: knowledgeFactId(source, relation, target),
    source,
    relation,
    target,
    evidence,
  };
}

function stringField(value: Record<string, unknown>, field: string) {
  const raw = value[field];
  return typeof raw === "string" ? raw.trim() : "";
}

function mergeKnowledgeFacts(current: KnowledgeFact[], incoming: KnowledgeFact[]) {
  if (incoming.length === 0) return current;
  const map = new Map(current.map((fact) => [fact.id, fact]));
  for (const fact of incoming) {
    map.set(fact.id, fact);
  }
  return [...map.values()];
}

function knowledgeFactId(source: string, relation: string, target: string) {
  return `${source}|${relation}|${target}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function startsMermaid(value: string) {
  return /^\s*(flowchart|graph|sequenceDiagram|classDiagram|stateDiagram-v2|stateDiagram|erDiagram|journey|gantt|pie|mindmap|timeline|gitGraph)\b/i.test(value);
}

function isLikelyMermaidLine(line: string) {
  const trimmed = line.trim();
  if (!trimmed) return true;
  if (startsMermaid(trimmed)) return true;
  if (/^(subgraph|end|direction|classDef|class|style|linkStyle|click|participant|actor|loop|alt|else|opt|par|and|rect|note|activate|deactivate|autonumber|section|title|dateFormat|axisFormat)\b/i.test(trimmed)) return true;
  if (/[-.=ox<>]*--[-.=ox<>]*>?/.test(trimmed)) return true;
  if (/^[A-Za-z0-9_][\w.-]*\s*(\[|\(|\{|>|\(\(|\[\[)/.test(trimmed)) return true;
  if (/^[A-Za-z0-9_][\w.-]*\s*:::\s*[\w-]+/.test(trimmed)) return true;
  if (/^%%/.test(trimmed)) return true;
  return false;
}

function applyGeneratedCodeToQueuedModules(modules: CanvasModule[], queue: WorkspaceQueueItem[], mermaidCode: string) {
  const targetIds = new Set(
    queue
      .filter((item) => item.moduleId && isGraphQueueItem(item))
      .map((item) => item.moduleId as string),
  );

  if (targetIds.size === 0) return { modules, updatedIds: new Set<string>() };

  return {
    modules: modules.map((module) =>
      targetIds.has(module.id) && (module.kind === "mermaid" || module.kind === "graph" || module.kind === "attack-flow")
      ? { ...module, code: mermaidCode, content: "" }
      : module,
    ),
    updatedIds: targetIds,
  };
}

function applyGeneratedCodeToQueue(queue: WorkspaceQueueItem[], mermaidCode: string) {
  return queue.map((item) => (item.moduleId && isGraphQueueItem(item) ? { ...item, code: mermaidCode, queuedAt: timeLabel() } : item));
}

function applyGeneratedContentToQueuedModules(modules: CanvasModule[], queue: WorkspaceQueueItem[], content: string, fullAnswer: string) {
  const componentCode = extractComponentCode(fullAnswer);
  const tableIds = new Set(
    queue
      .filter((item) => item.moduleId && isTableQueueItem(item))
      .map((item) => item.moduleId as string),
  );
  const codeIds = new Set(
    queue
      .filter((item) => item.moduleId && item.icon === "code")
      .map((item) => item.moduleId as string),
  );
  const markdownIds = new Set(
    queue
      .filter((item) => item.moduleId && !isGraphQueueItem(item) && !isTableQueueItem(item) && item.icon !== "code")
      .map((item) => item.moduleId as string),
  );
  const targetIds = new Set([...tableIds, ...codeIds, ...markdownIds]);

  if (targetIds.size === 0) return { modules, updatedIds: targetIds };

  return {
    modules: modules.map((module) => {
      if (!targetIds.has(module.id)) return module;
      if (tableIds.has(module.id)) {
        return { ...module, kind: "table" as const, content, renderMode: "preview" as const };
      }
      if (codeIds.has(module.id)) {
        return { ...module, kind: "react-component" as const, code: componentCode || content, content: extractWorkspaceMarkdown(fullAnswer), renderMode: "preview" as const };
      }
      return { ...module, content: extractWorkspaceMarkdown(fullAnswer), renderMode: "preview" as const };
    }),
    updatedIds: targetIds,
  };
}

function extractComponentCode(text: string) {
  return [...text.matchAll(/```(?:tsx|jsx|typescript|javascript|ts|js)\s*([\s\S]*?)```/gi)]?.[0]?.[1]?.trim() ?? "";
}

function findGeneratedCodeTargetId(state: WorkspaceState) {
  return state.queuedWorkspaceItems.find((item) => item.moduleId && isGraphQueueItem(item))?.moduleId ?? "";
}

function isGraphQueueItem(item: WorkspaceQueueItem) {
  return item.icon === "graph" || /\b(mermaid|diagram|graph|topology|workflow|relationship)\b/i.test(`${item.label} ${item.detail}`);
}

function isTableQueueItem(item: WorkspaceQueueItem) {
  return item.icon === "table" || /\b(table|grid|ioc board|comparison)\b/i.test(`${item.label} ${item.detail}`);
}

function iconForModuleKind(kind: CanvasModuleKind): WorkspaceQueueItem["icon"] {
  if (kind === "markdown") return "note";
  if (kind === "mermaid" || kind === "graph" || kind === "attack-flow") return "graph";
  if (kind === "table" || kind === "command-table" || kind === "ioc-board" || kind === "ioc-table") return "table";
  if (kind === "react-component") return "code";
  return "workspace";
}

function taskLedgerLabel(text: string) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function timeLabel() {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date());
}

function pause(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function normalizeModel(model: string) {
  return model === "gemma4:31b" ? "gemma4:latest" : model;
}

function makeOperatorIdentity(operatorId: string): OperatorIdentity {
  return createProtocolOperatorIdentity(operatorId);
}

function randomHex(bytes: number) {
  const values = new Uint8Array(bytes);
  crypto.getRandomValues(values);
  return [...values].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function safeExportName(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "operator";
}

function moduleSpec(kind: CanvasModuleKind): Pick<CanvasModule, "title" | "subtitle" | "accent"> {
  const specs: Record<CanvasModuleKind, Pick<CanvasModule, "title" | "subtitle" | "accent">> = {
    "attack-flow": { title: "Workflow Helix", subtitle: "Operator-defined action and evidence chain", accent: "blue" },
    "host-impact": { title: "Host Impact Overview", subtitle: "Affected systems by impact level", accent: "sage" },
    timeline: { title: "Timeline", subtitle: "Chronological view of major events", accent: "amber" },
    heatmap: { title: "Evidence Heatmap", subtitle: "Activity intensity by host", accent: "rose" },
    "command-table": { title: "Evidence Table", subtitle: "Structured rows extracted from local artifacts", accent: "blue" },
    "ioc-table": { title: "Indicator Board", subtitle: "Extracted indicators grouped by source", accent: "amber" },
    markdown: { title: "Markdown Note", subtitle: "Editable operator note surface", accent: "blue" },
    mermaid: { title: "Mermaid Diagram", subtitle: "Generated process and attack diagram", accent: "violet" },
    graph: { title: "Relationship Graph", subtitle: "Entity and evidence topology", accent: "sage" },
    table: { title: "Structured Table", subtitle: "Operator-defined comparison grid", accent: "amber" },
    "ioc-board": { title: "IOC Board", subtitle: "Indicators grouped by type and source", accent: "rose" },
    "host-map": { title: "Host Map", subtitle: "Affected systems and blast-radius view", accent: "sage" },
    "evidence-viewer": { title: "Evidence Viewer", subtitle: "Inspectable artifact preview", accent: "blue" },
    "pdf-viewer": { title: "PDF Viewer", subtitle: "Local document rendering surface", accent: "blue" },
    "json-viewer": { title: "JSON Viewer", subtitle: "Structured artifact inspection", accent: "amber" },
    "query-surface": { title: "Query Surface", subtitle: "Evidence-linked local investigation prompt", accent: "violet" },
    "react-component": { title: "Runtime Component", subtitle: "Custom rendered operational module", accent: "sage" },
  };
  return specs[kind];
}

function nextModuleGrid(index: number, kind: CanvasModuleKind, wide = false): CanvasGridPlacement {
  const columns = 3;
  const column = index % columns;
  const row = Math.floor(index / columns);
  const baseW = wide || kind === "react-component" ? 672 : 360;
  const baseH = kind === "table" || kind === "markdown" ? 260 : kind === "mermaid" || kind === "graph" ? 300 : 236;
  return snapGridPlacement({
    x: 24 + column * 396,
    y: 92 + row * 304,
    w: baseW,
    h: baseH,
  });
}

function snapGridPlacement(grid: CanvasGridPlacement): CanvasGridPlacement {
  const unit = 18;
  const snap = (value: number, min: number) => Math.max(min, Math.round(value / unit) * unit);
  return {
    x: snap(grid.x, 0),
    y: snap(grid.y, 72),
    w: snap(grid.w, 252),
    h: snap(grid.h, 120),
  };
}

function defaultContent(kind: CanvasModuleKind) {
  if (kind === "markdown") {
    return "## Operator note\nUse this surface to capture observations, questions, or local reasoning. Queue the note for Gemma when you want help shaping it.";
  }
  if (kind === "query-surface") {
    return "Ask Gemma to transform local evidence into a workspace item, decision gate, or event update.";
  }
  return "";
}

function defaultCode(kind: CanvasModuleKind) {
  if (kind === "mermaid") {
    return ["flowchart LR", "  A[Local Artifact] --> B[Gemma Reasoning]", "  B --> C[Ledger Event]", "  C --> D[Capsule Handoff]"].join("\n");
  }
  if (kind === "react-component") {
    return [
      "export function WorkspaceSignal({ events }) {",
      "  return <ProtocolSurface events={events} mode=\"local\" />;",
      "}",
    ].join("\n");
  }
  return "";
}

function buildWorkspaceItemSchema(kind: CanvasModuleKind, title: string) {
  return {
    schema_version: "capsules-run-operators.workspace_update.v1",
    actor: {
      actor_id: "ai:gemma",
      label: "Gemma",
    },
    workspace_items: [
      {
        id: `wsi_${kind}`,
        type: kind,
        title,
        body: "operator editable markdown or generated source",
        mime_type: kind === "mermaid" ? "text/vnd.mermaid" : "text/markdown",
        protocol_refs: {
          capsule_id: null,
          payload_path: `payload/workspace/${kind}.md`,
          content_index_sha256: null,
          event_target: `payload/workspace/${kind}.md`,
        },
        provenance: {
          source: "gemma",
          untrusted: true,
        },
      },
    ],
    chain_event_intents: [
      {
        kind: "mutation",
        action: "workspace_item_created",
        target: `payload/workspace/${kind}.md`,
        payload: {
          summary: `Create ${title}`,
          workspace_item_id: `wsi_${kind}`,
        },
        untrusted_payload_fields: ["payload.summary"],
      },
    ],
  };
}

function buildDecisionGateWorkspaceSchema() {
  return {
    schema_version: "capsules-run-operators.decision_gate_surface.v1",
    actor: {
      actor_id: "ai:gemma",
      label: "Gemma",
    },
    decision_gate_surface: {
      purpose: "Populate operator decision gates from local evidence and queued context.",
      output_format: "markdown_table",
      required_columns: ["Gate", "Severity", "Owner", "Status", "Evidence"],
      allowed_status: ["open", "ready", "blocked", "resolved"],
    },
    chain_event_intents: [
      {
        kind: "mutation",
        action: "decision_gate_surface_updated",
        target: "payload/workspace/decision-gates.md",
        untrusted_payload_fields: ["decision_gate_surface"],
      },
    ],
  };
}

function buildCommunicationPlanSchema() {
  return {
    schema_version: "capsules-run-operators.communication_plan.v1",
    actor: {
      actor_id: "ai:gemma",
      label: "Gemma",
    },
    communication_plan: {
      purpose: "Draft operator-reviewed stakeholder communications from local evidence only.",
      sections: ["Audience", "Current state", "Evidence", "Requested decision", "Next update"],
      output_format: "markdown",
    },
    chain_event_intents: [
      {
        kind: "mutation",
        action: "communication_plan_updated",
        target: "payload/workspace/communication-plan.md",
        untrusted_payload_fields: ["communication_plan"],
      },
    ],
  };
}

function decisionGateTable(tasks: OperatorTask[]) {
  if (tasks.length === 0) {
    return [
      "| Gate | Severity | Owner | Status | Evidence |",
      "| --- | --- | --- | --- | --- |",
      "| Define investigation scope | medium | operator | open | environment declaration |",
      "| Identify evidence needed | medium | operator | open | payload assets |",
      "| Confirm handoff criteria | low | operator | open | capsule continuity |",
    ].join("\n");
  }

  return [
    "| Gate | Severity | Owner | Status | Evidence |",
    "| --- | --- | --- | --- | --- |",
    ...tasks.map((task) =>
      [
        escapeTableCell(task.text),
        task.severity,
        task.source === "gemma4" ? "gemma4 + operator" : "operator",
        task.done ? "resolved" : "open",
        escapeTableCell(task.evidence || "local workspace"),
      ].join(" | "),
    ).map((row) => `| ${row} |`),
  ].join("\n");
}

function communicationPlanTemplate(declaration: WorkspaceDeclaration, artifactCount: number, gateCount: number) {
  return [
    "## Communication Plan",
    "",
    `**Capsule:** ${declaration.capsuleName || "undeclared local workspace"}`,
    `**Local context:** ${artifactCount} artifact${artifactCount === 1 ? "" : "s"} · ${gateCount} decision gate${gateCount === 1 ? "" : "s"}`,
    "",
    "### Audience",
    "- Incident lead",
    "- Technical stakeholders",
    "- Business owner",
    "",
    "### Current State",
    "Summarize the confirmed evidence and what remains unknown.",
    "",
    "### Requested Decision",
    "Name the operator decision required before containment, export, or handoff.",
    "",
    "### Next Update",
    "State when this capsule should be revisited or sealed.",
  ].join("\n");
}

function escapeTableCell(value: string) {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return slug ? `workspace-${slug}` : "";
}

function inferAttachmentType(name: string) {
  const ext = name.split(".").pop()?.toUpperCase() || "FILE";
  if (ext === "JSON") return "JSON";
  if (["LOG", "TXT", "CSV", "MD"].includes(ext)) return ext;
  if (["PCAP", "PCAPNG", "CAP"].includes(ext)) return "PCAP";
  if (["EVT", "EVTX"].includes(ext)) return "EVT";
  return ext.slice(0, 5);
}

async function readFilePreview(file: File) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";
  const textLike = file.type.startsWith("text/") || ["csv", "json", "log", "md", "txt", "yaml", "yml", "xml"].includes(ext);
  if (!textLike) {
    return [
      `Binary/local artifact: ${file.name}`,
      `Type: ${file.type || "application/octet-stream"}`,
      `Size: ${formatBytes(file.size)}`,
      "Preview: metadata only. Artifact remains local in browser state.",
    ].join("\n");
  }

  const text = await file.slice(0, 96_000).text();
  const truncated = file.size > 96_000 ? "\n\n[Preview truncated at 96 KB for local responsiveness.]" : "";
  return `${text}${truncated}`;
}

function formatBytes(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
