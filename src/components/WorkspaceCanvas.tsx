import { Archive, Eye, FileText, FolderOpen, GitBranch, GripVertical, Maximize2, Package, Plus, Search, Upload, ZoomIn } from "lucide-react";
import { useRef, useState } from "react";
import type { Attachment, LedgerEvent } from "../data";
import { providerLabel } from "../lib/localRuntime";
import { useWorkspaceStore, type CanvasGridPlacement, type CanvasModule, type CanvasModuleKind, type PayloadPrimitive } from "../store";
import { MarkdownRender } from "./MarkdownRender";
import { MermaidDiagram } from "./MermaidDiagram";

const workspaceItems: Array<{ label: string; kind?: CanvasModuleKind; upload?: boolean }> = [
  { label: "Markdown Note", kind: "markdown" },
  { label: "Mermaid Diagram", kind: "mermaid" },
  { label: "Timeline", kind: "timeline" },
  { label: "Graph", kind: "graph" },
  { label: "Table", kind: "table" },
  { label: "IOC Board", kind: "ioc-board" },
  { label: "Host Map", kind: "host-map" },
  { label: "Evidence Viewer", kind: "evidence-viewer" },
  { label: "PDF Viewer", kind: "pdf-viewer" },
  { label: "JSON Viewer", kind: "json-viewer" },
  { label: "Query Surface", kind: "query-surface" },
  { label: "React Component", kind: "react-component" },
  { label: "Upload Artifact", upload: true },
];

const neutralGraphNodes = [
  ["Artifact", 9, 45],
  ["Context", 39, 20],
  ["Inference", 58, 66],
  ["Ledger", 79, 42],
  ["Capsule", 42, 70],
];

export function WorkspaceCanvas() {
  const activeTab = useWorkspaceStore((state) => state.activeTab);
  const graphMode = useWorkspaceStore((state) => state.graphMode);
  const modules = useWorkspaceStore((state) => state.canvasModules);
  const knowledgeFacts = useWorkspaceStore((state) => state.knowledgeFacts);
  const activeModuleId = useWorkspaceStore((state) => state.activeModuleId);
  const attachments = useWorkspaceStore((state) => state.attachments);
  const payloadPrimitives = useWorkspaceStore((state) => state.payloadPrimitives);
  const selectedAttachmentId = useWorkspaceStore((state) => state.selectedAttachmentId);
  const documentOpen = useWorkspaceStore((state) => state.documentOpen);
  const requestCanvasModule = useWorkspaceStore((state) => state.requestCanvasModule);
  const addUploadedAttachments = useWorkspaceStore((state) => state.addUploadedAttachments);
  const addContextSnippet = useWorkspaceStore((state) => state.addContextSnippet);
  const askGemma = useWorkspaceStore((state) => state.askGemma);
  const sealCapsule = useWorkspaceStore((state) => state.sealCapsule);
  const selectAttachment = useWorkspaceStore((state) => state.selectAttachment);
  const setDocumentOpen = useWorkspaceStore((state) => state.setDocumentOpen);
  const setTab = useWorkspaceStore((state) => state.setTab);
  const setGraphMode = useWorkspaceStore((state) => state.setGraphMode);
  const reorderCanvasModule = useWorkspaceStore((state) => state.reorderCanvasModule);
  const moveCanvasModuleToGrid = useWorkspaceStore((state) => state.moveCanvasModuleToGrid);
  const focusCanvasModule = useWorkspaceStore((state) => state.focusCanvasModule);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);
  const [schemaMenuOpen, setSchemaMenuOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [expanded, setExpanded] = useState(false);

  const selectedAttachment = attachments.find((item) => item.id === selectedAttachmentId) ?? attachments[0];
  const visibleModules = activeTab === "Knowledge" ? modules.filter(isKnowledgeModule) : activeTab === "Assets" ? [] : modules;

  return (
    <main
      className={`workspace-canvas ${expanded ? "expanded" : ""}`}
      aria-label="Workspace canvas"
      onClick={(event) => {
        setContextMenu(null);
        if (documentOpen && !(event.target as HTMLElement).closest(".continuity-viewer")) {
          setDocumentOpen(false);
          setGraphMode(activeTab === "Knowledge" ? "Knowledge Graph" : activeTab === "Events" ? "Event Timeline" : "Workflow");
        }
      }}
      onContextMenu={(event) => {
        event.preventDefault();
        setContextMenu({
          x: Math.min(event.clientX, window.innerWidth - 212),
          y: Math.min(event.clientY, window.innerHeight - 212),
        });
      }}
    >
      <div className="canvas-heading">
        <div>
          <h2>{activeTab === "Workspace" ? "Workspace Canvas" : `${activeTab} Surface`}</h2>
          <p>{surfaceCopy(activeTab)} • Current topology: {graphMode}</p>
        </div>
        <div className="canvas-tools" aria-label="Canvas tools">
          <div className="dropdown canvas-schema-menu">
            <button
              type="button"
              aria-expanded={schemaMenuOpen}
              onClick={() => setSchemaMenuOpen((value) => !value)}
            >
              <Plus size={13} /> Workspace Item Schema
            </button>
            {schemaMenuOpen ? (
              <div className="dropdown-menu">
                {workspaceItems.map((item) => (
                  <button
                    key={item.label}
                    type="button"
                    onClick={() => {
                      if (item.kind) void requestCanvasModule(item.kind);
                      if (item.upload) uploadRef.current?.click();
                      setSchemaMenuOpen(false);
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => setZoom((value) => (value >= 1.15 ? 0.85 : Number((value + 0.15).toFixed(2))))}
          >
            <ZoomIn size={13} /> {Math.round(zoom * 100)}%
          </button>
          <button type="button" aria-label="Maximize canvas" onClick={() => setExpanded((value) => !value)}><Maximize2 size={13} /></button>
          <input
            ref={uploadRef}
            className="sr-only"
            type="file"
            multiple
            onChange={(event) => {
              if (event.currentTarget.files) void addUploadedAttachments(event.currentTarget.files);
              event.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      <section className="canvas-grid canvas-spatial-layer" style={{ "--canvas-zoom": zoom } as React.CSSProperties}>
        {activeTab === "Knowledge" ? (
          <KnowledgeGraphWorkspace facts={knowledgeFacts} onCreateGraph={() => void requestCanvasModule("graph")} />
        ) : null}
        {activeTab === "Assets" ? (
          <AssetBrowserWorkspace
            attachments={attachments}
            payloadPrimitives={payloadPrimitives}
            canvasModules={modules}
            selectedAttachmentId={selectedAttachmentId}
            onUpload={() => uploadRef.current?.click()}
            onOpenAttachment={(attachment) => {
              selectAttachment(attachment.id);
              addContextSnippet(`${attachment.name} ${attachment.type} ${attachment.status}`, "asset-browser");
            }}
            onOpenWorkspaceAsset={(module) => {
              setTab("Workspace");
              focusCanvasModule(module.id);
            }}
            onQueuePrimitive={(primitive) => {
              addContextSnippet(`${primitive.path} ${primitive.status}: ${primitive.detail}`, "capsule-primitive");
            }}
          />
        ) : null}
        {visibleModules.length > 0 ? (
          visibleModules.map((module) => (
            <Panel
              key={module.id}
              module={module}
              active={module.id === activeModuleId}
              onDropModule={reorderCanvasModule}
              onMoveModuleToGrid={moveCanvasModuleToGrid}
              onFocusModule={focusCanvasModule}
            >
              {module.collapsed ? null : renderModule(module, graphMode, selectedAttachment?.name ?? "selected artifact")}
            </Panel>
          ))
        ) : activeTab !== "Knowledge" && activeTab !== "Assets" ? (
          <EmptyCanvas onAdd={requestCanvasModule} onUpload={() => uploadRef.current?.click()} />
        ) : null}
      </section>

      {documentOpen ? (
        <DocumentViewer attachment={selectedAttachment} onCapture={(text) => addContextSnippet(text, selectedAttachment?.name ?? "selected artifact")} />
      ) : null}

      {contextMenu ? (
        <div
          className="context-menu"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              void askGemma(`Inspect the current ${graphMode} workspace and identify the next evidence-linked action.`);
              setContextMenu(null);
            }}
          >
            Ask Gemma
          </button>
          <button type="button" onClick={() => { void requestCanvasModule("markdown"); setContextMenu(null); }}>
            Add Evidence Note
          </button>
          <button type="button" onClick={() => { void requestCanvasModule("graph"); setContextMenu(null); }}>
            Generate Graph
          </button>
          <button type="button" onClick={() => { void requestCanvasModule("query-surface"); setContextMenu(null); }}>
            Open Query Surface
          </button>
          <button type="button" onClick={() => { void sealCapsule(); setContextMenu(null); }}>
            Seal to Capsule
          </button>
        </div>
      ) : null}

    </main>
  );
}

function isKnowledgeModule(module: CanvasModule) {
  return (
    module.kind === "graph" ||
    module.kind === "mermaid" ||
    module.kind === "attack-flow" ||
    /\b(knowledge|relationship|entity|topology|graph)\b/i.test(`${module.title} ${module.subtitle}`)
  );
}

function KnowledgeGraphWorkspace({
  facts,
  onCreateGraph,
}: {
  facts: Array<{ id: string; source: string; relation: string; target: string; evidence: string }>;
  onCreateGraph: () => void;
}) {
  const nodes = knowledgeNodes(facts);
  const edges = facts.slice(0, 10);

  return (
    <section className={`knowledge-graph-workspace ${facts.length ? "populated" : "empty"}`}>
      <header>
        <div>
          <h3>Knowledge Graph</h3>
          <p>{facts.length ? `${facts.length} deduplicated relationship${facts.length === 1 ? "" : "s"} from Gemma facts` : "No graph facts accepted yet"}</p>
        </div>
        <button type="button" onClick={onCreateGraph}><GitBranch size={13} /> Graph schema</button>
      </header>
      {facts.length > 0 ? (
        <div className="kg-stage">
          <svg viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
            {edges.map((edge, index) => {
              const source = nodes.find((node) => node.label === edge.source);
              const target = nodes.find((node) => node.label === edge.target);
              if (!source || !target) return null;
              return (
                <path
                  key={`${edge.id}-${index}`}
                  d={`M${source.x} ${source.y} C${(source.x + target.x) / 2} ${source.y}, ${(source.x + target.x) / 2} ${target.y}, ${target.x} ${target.y}`}
                />
              );
            })}
          </svg>
          {nodes.map((node, index) => (
            <span className={`kg-node ${node.role}`} style={{ left: `${node.x}%`, top: `${node.y}%` }} key={`${node.label}-${index}`}>
              {node.label}
            </span>
          ))}
        </div>
      ) : (
        <div className="kg-empty-state">
          <GitBranch size={24} />
          <strong>No relationships discovered</strong>
          <p>Queue evidence or a graph surface, then ask Gemma to publish knowledge facts.</p>
        </div>
      )}
      <div className="kg-edge-list">
        {edges.length > 0 ? (
          edges.map((fact) => (
            <button type="button" key={fact.id} title={fact.evidence}>
              <strong>{fact.source}</strong>
              <span>{fact.relation}</span>
              <strong>{fact.target}</strong>
            </button>
          ))
        ) : (
          <span>Knowledge facts will appear here after Gemma returns the graph schema.</span>
        )}
      </div>
    </section>
  );
}

function AssetBrowserWorkspace({
  attachments,
  payloadPrimitives,
  canvasModules,
  selectedAttachmentId,
  onUpload,
  onOpenAttachment,
  onOpenWorkspaceAsset,
  onQueuePrimitive,
}: {
  attachments: Attachment[];
  payloadPrimitives: PayloadPrimitive[];
  canvasModules: CanvasModule[];
  selectedAttachmentId: string;
  onUpload: () => void;
  onOpenAttachment: (attachment: Attachment) => void;
  onOpenWorkspaceAsset: (module: CanvasModule) => void;
  onQueuePrimitive: (primitive: PayloadPrimitive) => void;
}) {
  const assetCount = attachments.length + payloadPrimitives.length + canvasModules.length;

  return (
    <section className="asset-browser-workspace" aria-label="Assets workspace file browser">
      <header>
        <div>
          <h3>Assets Workspace</h3>
          <p>{assetCount} retrievable local asset{assetCount === 1 ? "" : "s"} across payload, protocol, and workspace output.</p>
        </div>
        <button type="button" onClick={onUpload}>
          <Upload size={13} />
          Upload
        </button>
      </header>

      <div className="asset-browser-summary">
        <span><b>{attachments.length}</b> Uploaded files</span>
        <span><b>{canvasModules.length}</b> Workspace outputs</span>
        <span><b>{payloadPrimitives.length}</b> Capsule primitives</span>
      </div>

      <div className="asset-browser-columns">
        <section className="asset-browser-pane">
          <h4><Archive size={14} /> Capsule Package</h4>
          {payloadPrimitives.length > 0 ? (
            payloadPrimitives.map((primitive) => (
              <button className="asset-file-row primitive-file" type="button" key={primitive.id} onClick={() => onQueuePrimitive(primitive)}>
                <Archive size={14} />
                <span>
                  <strong>{primitive.name}</strong>
                  <small>Capsule primitive · {primitive.path}</small>
                </span>
                <em>{primitive.status}</em>
              </button>
            ))
          ) : (
            <p className="asset-browser-empty">Initialize the environment to generate manifest, chain, and provenance primitives.</p>
          )}
        </section>

        <section className="asset-browser-pane">
          <h4><Package size={14} /> Uploaded Evidence</h4>
          {attachments.length > 0 ? (
            attachments.map((attachment) => (
              <button
                className={`asset-file-row ${attachment.id === selectedAttachmentId ? "selected" : ""} ${attachment.capsuleHydration ? "capsule-hydration" : ""} ${attachment.hydratedFrom ? "hydrated-file" : ""}`}
                type="button"
                key={attachment.id}
                onClick={() => onOpenAttachment(attachment)}
              >
                {attachment.capsuleHydration ? <Archive size={14} /> : <FileText size={14} />}
                <span>
                  <strong>{attachment.name}</strong>
                  <small>
                    {attachment.capsuleHydration
                      ? `Hydrated capsule · ${attachment.capsuleHydration.fileCount} files extracted · ${attachment.capsuleHydration.eventCount} events`
                      : attachment.hydratedFrom
                        ? `Extracted from capsule · ${attachment.capsulePath}`
                        : `${attachment.type} · ${attachment.size ? `${attachment.size} bytes` : "browser-local"} · opens context continuity`}
                  </small>
                </span>
                <em>{attachment.status}</em>
              </button>
            ))
          ) : (
            <p className="asset-browser-empty">No uploaded files yet. Add local evidence to populate this lane.</p>
          )}
        </section>

        <section className="asset-browser-pane">
          <h4><FolderOpen size={14} /> Workspace Products</h4>
          {canvasModules.length > 0 ? (
            canvasModules.map((module) => (
              <button className="asset-file-row workspace-file" type="button" key={module.id} onClick={() => onOpenWorkspaceAsset(module)}>
                <FileText size={14} />
                <span>
                  <strong>{module.title}</strong>
                  <small>payload/workspace/{module.id}.json · {module.kind}</small>
                </span>
                <em>{module.accent}</em>
              </button>
            ))
          ) : (
            <p className="asset-browser-empty">Workspace reports and Gemma-generated surfaces will appear here as retrievable payload files.</p>
          )}
        </section>
      </div>
    </section>
  );
}

function knowledgeNodes(facts: Array<{ source: string; target: string }>) {
  const labels = [...new Set(facts.flatMap((fact) => [fact.source, fact.target]).filter(Boolean))].slice(0, 10);
  const center = { x: 50, y: 30 };
  if (labels.length === 0) return [];
  return labels.map((label, index) => {
    if (labels.length === 1) {
      return { label, x: center.x, y: center.y, role: "source" };
    }
    const angle = (Math.PI * 2 * index) / labels.length - Math.PI / 2;
    const radiusX = 36;
    const radiusY = 20;
    const isSource = facts.some((fact) => fact.source === label);
    const isTarget = facts.some((fact) => fact.target === label);
    return {
      label,
      x: Math.round(center.x + Math.cos(angle) * radiusX),
      y: Math.round(center.y + Math.sin(angle) * radiusY),
      role: isSource && isTarget ? "bridge" : isSource ? "source" : "target",
    };
  });
}

function Panel({
  module,
  active,
  onDropModule,
  onMoveModuleToGrid,
  onFocusModule,
  children,
}: {
  module: CanvasModule;
  active: boolean;
  onDropModule: (draggedId: string, targetId: string) => void;
  onMoveModuleToGrid: (id: string, grid: CanvasGridPlacement) => void;
  onFocusModule: (id: string) => void;
  children: React.ReactNode;
}) {
  const toggleCanvasModule = useWorkspaceStore((state) => state.toggleCanvasModule);
  const toggleCanvasDock = useWorkspaceStore((state) => state.toggleCanvasDock);
  const removeCanvasModule = useWorkspaceStore((state) => state.removeCanvasModule);
  const panelRef = useRef<HTMLElement | null>(null);
  const generatedConcern = module.accent === "rose" && /finding|risk|incident|concern/i.test(`${module.title} ${module.subtitle}`);

  function onPointerDown(event: React.PointerEvent<HTMLElement>) {
    event.preventDefault();
    event.stopPropagation();
    onFocusModule(module.id);
    const panel = panelRef.current;
    const layer = panel?.parentElement;
    if (!panel || !layer) return;
    const panelRect = panel.getBoundingClientRect();
    const layerRect = layer.getBoundingClientRect();
    const offsetX = event.clientX - panelRect.left;
    const offsetY = event.clientY - panelRect.top;

    panel.setPointerCapture(event.pointerId);

    const move = (moveEvent: PointerEvent) => {
      const next = {
        ...module.grid,
        x: moveEvent.clientX - layerRect.left - offsetX,
        y: moveEvent.clientY - layerRect.top - offsetY,
      };
      onMoveModuleToGrid(module.id, next);
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  return (
    <article
      ref={panelRef}
      className={`canvas-panel accent-${module.accent} ${active ? "gemma-active" : ""} ${module.docked || module.kind === "command-table" ? "panel-wide" : ""} ${module.kind === "table" ? "table-panel" : ""} ${module.collapsed ? "collapsed" : ""} ${generatedConcern ? "concern-panel" : ""}`}
      style={{
        left: module.grid?.x,
        top: module.grid?.y,
        width: module.kind === "table" && !module.docked ? undefined : module.grid?.w,
        height: module.collapsed || (module.kind === "table" && !module.docked) ? undefined : module.grid?.h,
      }}
      onClick={() => onFocusModule(module.id)}
      onDragStart={(event) => event.dataTransfer.setData("text/plain", module.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => {
        event.preventDefault();
        const draggedId = event.dataTransfer.getData("text/plain");
        if (draggedId) onDropModule(draggedId, module.id);
      }}
    >
      <header>
        <div>
          <h3>{module.title}</h3>
          <p>{module.subtitle}</p>
        </div>
        <div className="panel-action-row" onClick={(event) => event.stopPropagation()}>
          <span className="drag-handle" title="Move on workspace grid" onPointerDown={onPointerDown}><GripVertical size={14} /></span>
          <button className="window-control window-min" type="button" aria-label={`${module.collapsed ? "Restore" : "Minimize"} ${module.title}`} title={module.collapsed ? "Restore" : "Minimize"} onClick={() => toggleCanvasModule(module.id)}>
            <span aria-hidden="true">_</span>
          </button>
          <button className="window-control window-max" type="button" aria-label={`${module.docked ? "Restore size" : "Expand"} ${module.title}`} title={module.docked ? "Restore size" : "Expand"} onClick={() => toggleCanvasDock(module.id)}>
            <span aria-hidden="true">[ ]</span>
          </button>
          <button className="window-control window-close" type="button" aria-label={`Close ${module.title}`} title="Close" disabled={module.pinned} onClick={() => removeCanvasModule(module.id)}>
            <span aria-hidden="true">X</span>
          </button>
        </div>
      </header>
      {children}
    </article>
  );
}

function renderModule(module: CanvasModule, graphMode: string, selectedAttachmentName: string) {
  const { kind } = module;
  switch (kind) {
    case "attack-flow":
    case "graph":
      if (module.code?.trim()) return <MermaidPreview code={module.code} />;
      return <AttackFlow mode={graphMode} module={module} />;
    case "mermaid":
      return <MermaidPreview code={module.code || ""} />;
    case "host-impact":
    case "host-map":
      return <HostImpact />;
    case "timeline":
      return <Timeline />;
    case "heatmap":
      return <Heatmap />;
    case "command-table":
      return <CommandTable />;
    case "ioc-table":
    case "ioc-board":
      return <IocTable />;
    case "table":
      return <OperatorTable module={module} />;
    case "evidence-viewer":
    case "pdf-viewer":
    case "json-viewer":
      return <EvidenceCard selectedAttachmentName={selectedAttachmentName} kind={kind} />;
    case "query-surface":
      return <QuerySurface />;
    case "react-component":
      return <RuntimeComponent module={module} />;
    case "markdown":
      return <MarkdownNote module={module} />;
  }
}

function EmptyCanvas({ onAdd, onUpload }: { onAdd: (kind: CanvasModuleKind) => Promise<void>; onUpload: () => void }) {
  return (
    <section className="canvas-empty">
      <div>
        <h3>Blank Operational Surface</h3>
        <p>Create a surface, upload evidence, or let Gemma generate the first frame from local context.</p>
      </div>
      <div className="empty-actions">
        <button type="button" onClick={() => void onAdd("markdown")}><FileText size={14} /> Note</button>
        <button type="button" onClick={() => void onAdd("graph")}><GitBranch size={14} /> Graph</button>
        <button type="button" onClick={() => void onAdd("query-surface")}><Search size={14} /> Query</button>
        <button type="button" onClick={onUpload}><Upload size={14} /> Upload</button>
      </div>
    </section>
  );
}

function AttackFlow({ mode, module }: { mode: string; module?: CanvasModule }) {
  const ledger = useWorkspaceStore((state) => state.ledger);
  const attachments = useWorkspaceStore((state) => state.attachments);
  const generatedLabels = module?.accent === "rose" ? graphLabelsFromText(module.content || module.subtitle) : [];
  const nodes =
    generatedLabels.length > 0
      ? generatedLabels.map((label, index) => [label, 9 + index * 18, index % 2 === 0 ? 45 : 23])
      : ledger.length > 0
      ? ledger.slice(-5).map((event, index) => [event.action.replace(/_/g, " "), 8 + index * 18, index % 2 === 0 ? 45 : 22])
      : attachments.length > 0
        ? attachments.slice(0, 5).map((item, index) => [item.name, 8 + index * 18, index % 2 === 0 ? 45 : 22])
        : neutralGraphNodes;
  return (
    <div className="attack-flow">
      <svg viewBox="0 0 100 80" preserveAspectRatio="none" aria-hidden="true">
        <path d="M14 44 C28 20, 36 18, 45 24 S65 43, 80 42" />
        <path d="M34 64 C45 72, 52 70, 60 70" />
        <path d="M46 26 C45 48, 42 54, 35 64" />
        <path d="M47 28 C55 36, 58 50, 59 69" />
      </svg>
      {nodes.map(([label, x, y], index) => (
        <span className="flow-node" style={{ left: `${x}%`, top: `${y}%` }} key={`${label}-${index}`}>
          {label}
        </span>
      ))}
      <div className="flow-legend">
        <span><i className="green-dot" /> {mode}</span>
        <span><i className="amber-dot" /> Mutable</span>
        <span><i className="blue-dot" /> Local</span>
      </div>
    </div>
  );
}

function HostImpact() {
  const attachments = useWorkspaceStore((state) => state.attachments);
  const counts = {
    review: attachments.filter((item) => item.status === "review").length,
    observed: attachments.filter((item) => item.status === "observed").length,
    verified: attachments.filter((item) => item.status === "verified").length,
    sealed: attachments.filter((item) => item.status === "sealed").length,
  };
  return (
    <div className="host-impact">
      <div className="donut"><strong>{attachments.length}</strong><span>Artifacts</span></div>
      <div className="impact-legend">
        <span><i className="critical" /> Review <b>{counts.review}</b></span>
        <span><i className="high" /> Observed <b>{counts.observed}</b></span>
        <span><i className="medium" /> Verified <b>{counts.verified}</b></span>
        <span><i className="low" /> Sealed <b>{counts.sealed}</b></span>
      </div>
    </div>
  );
}

function Timeline() {
  const ledger = useWorkspaceStore((state) => state.ledger);
  const items = ledger.slice(-5).map((event, index) => [event.time, event.action.replace(/_/g, " "), ["blue", "green", "amber", "rose", "violet"][index] ?? "blue"]);
  if (items.length === 0) return <EmptyModule text="Timeline events will appear as local actions append to the ledger." />;
  return (
    <div className="timeline">
      <div className="timeline-line" />
      {items.map(([time, label, color], index) => (
        <div className="timeline-event" style={{ left: `${index * 22}%` }} key={`${time}-${label}-${index}`}>
          <i className={color} />
          <strong>{time}</strong>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}

function Heatmap() {
  const ledger = useWorkspaceStore((state) => state.ledger);
  const attachments = useWorkspaceStore((state) => state.attachments);
  if (ledger.length === 0 && attachments.length === 0) return <EmptyModule text="No activity matrix has been generated yet." />;
  const rows = (attachments.length ? attachments.map((item) => item.name) : ["ledger"]).slice(0, 5);
  const cols = ledger.slice(-5).map((event) => event.action.replace(/_/g, " ").slice(0, 9));
  const safeCols = cols.length ? cols : ["staged"];
  return (
    <div className="heatmap">
      <div className="heatmap-row header">
        <span>Host</span>
        {safeCols.map((col, index) => <span key={`${col}-${index}`}>{col}</span>)}
      </div>
      {rows.map((row, rowIndex) => (
        <div className="heatmap-row" key={`${row}-${rowIndex}`}>
          <span>{row}</span>
          {safeCols.map((_, colIndex) => {
            const value = Math.min(92, 20 + (rowIndex + 1) * 9 + (colIndex + 1) * 11);
            return (
            <i
              key={`${row}-${rowIndex}-${colIndex}`}
              style={{
                background: `linear-gradient(135deg, rgba(88,46,160,.72), rgba(201,168,123,${value / 100}))`,
              }}
            />
            );
          })}
        </div>
      ))}
      <div className="heatmap-scale"><span>Low</span><b /><b /><b /><b /><span>High</span></div>
    </div>
  );
}

function CommandTable() {
  const ledger = useWorkspaceStore((state) => state.ledger);
  if (ledger.length === 0) return <EmptyModule text="No structured evidence rows yet." />;
  return (
    <table className="mini-table">
      <thead><tr><th>Time</th><th>Actor</th><th>Action</th><th>Target</th></tr></thead>
      <tbody>
        {ledger.slice(-6).map((event) => (
          <tr key={event.id}>
            <td>{event.time}</td>
            <td>{event.actor}</td>
            <td>{event.action}</td>
            <td>{event.target}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function IocTable() {
  const attachments = useWorkspaceStore((state) => state.attachments);
  const snippets = useWorkspaceStore((state) => state.snippets);
  const rows = [
    ...attachments.map((item) => ["PAYLOAD", item.name, item.status]),
    ...snippets.slice(-3).map((snippet, index) => ["CONTEXT", snippet.slice(0, 36), `snippet-${index + 1}`]),
  ];
  if (rows.length === 0) return <EmptyModule text="No indicators extracted yet." />;
  return (
    <table className="mini-table">
      <thead><tr><th>Type</th><th>Value</th><th>Source</th></tr></thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={`${row.join("-")}-${rowIndex}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyModule({ text }: { text: string }) {
  return <div className="module-empty">{text}</div>;
}

function MermaidPreview({ code }: { code: string }) {
  return (
    <div className="mermaid-preview">
      <MermaidDiagram code={code} fallback={<MermaidLabelScatter code={code} />} />
    </div>
  );
}

function MermaidLabelScatter({ code }: { code: string }) {
  const labels = labelsFromMermaidCode(code);

  return (
    <div className="mermaid-visual">
      {labels.map((label, index) => (
        <span style={{ left: `${8 + index * 21}%`, top: `${index % 2 === 0 ? 28 : 58}%` }} key={`${label}-${index}`}>
          {label}
        </span>
      ))}
    </div>
  );
}

function labelsFromMermaidCode(code: string) {
  const labels = new Set<string>();
  for (const match of code.matchAll(/[A-Za-z0-9_.-]+\s*(?:\[([^\]]+)\]|\{([^}]+)\}|\(([^)]+)\))/g)) {
    const label = (match[1] || match[2] || match[3] || "").replace(/["'`]/g, "").trim();
    if (label) labels.add(label);
  }
  if (labels.size === 0) {
    for (const match of code.matchAll(/\b([A-Za-z][A-Za-z0-9_.-]{1,28})\b\s*(?:-->|---|-.->|==>)/g)) {
      labels.add(match[1].replace(/_/g, " "));
    }
  }
  return [...labels].slice(0, 6).filter(Boolean).length ? [...labels].slice(0, 6) : ["Artifact", "Reasoning", "Ledger", "Capsule"];
}

function DocumentViewer({ attachment, onCapture }: { attachment?: Attachment; onCapture: (text: string) => void }) {
  const documentQuery = useWorkspaceStore((state) => state.documentQuery);
  const setDocumentQuery = useWorkspaceStore((state) => state.setDocumentQuery);
  const setDocumentOpen = useWorkspaceStore((state) => state.setDocumentOpen);
  const setGraphMode = useWorkspaceStore((state) => state.setGraphMode);
  const ledger = useWorkspaceStore((state) => state.ledger);
  const snippets = useWorkspaceStore((state) => state.snippets);
  const capture = () => {
    const selection = window.getSelection()?.toString().trim();
    if (selection) onCapture(selection);
  };
  const normalizedQuery = documentQuery.trim().toLowerCase();
  const lines = continuityLinesForAttachment(attachment, ledger, snippets);
  const visibleLines = normalizedQuery ? lines.filter(([, text]) => String(text).toLowerCase().includes(normalizedQuery)) : lines;

  return (
    <aside className="document-viewer continuity-viewer" aria-label="Context continuity viewer" onClick={(event) => event.stopPropagation()}>
      <header>
        <div>
          <h3>Context Continuity</h3>
          <small>{attachment?.name ?? "no artifact selected"} · event context · {snippets.length} selected snippets</small>
        </div>
        <button
          type="button"
          aria-label="Close document viewer"
          onClick={() => {
            setDocumentOpen(false);
            setGraphMode("Workflow");
          }}
        >
          ×
        </button>
      </header>
      <label className="document-search">
        <Search size={14} />
        <input
          type="search"
          placeholder="Search event context..."
          value={documentQuery}
          onChange={(event) => setDocumentQuery(event.currentTarget.value)}
        />
        <span>P</span>
      </label>
      <pre onMouseUp={capture} onKeyUp={capture} tabIndex={0}>
        {visibleLines.map(([line, text]) => (
          <span className={String(text).includes("[ALERT]") ? "alert-line" : ""} key={line}>
            <b>{line}</b> {text}
            {"\n"}
          </span>
        ))}
        {visibleLines.length === 0 ? <span>No matching lines. Clear search to restore the artifact view.</span> : null}
      </pre>
    </aside>
  );
}

function MarkdownNote({ module }: { module: CanvasModule }) {
  const content = module.content || "";

  return (
    <div className="module-note preview-only module-note-preview-only">
      <div className="module-note-preview" aria-label="Rendered markdown note">
        <MarkdownRender text={content} />
      </div>
    </div>
  );
}

function graphLabelsFromText(text: string) {
  const candidates = text
    .split(/\r?\n/)
    .map((line) => {
      const heading = line.match(/^\s{0,3}#{1,4}\s+(.+)$/);
      if (heading) return heading[1];
      const bold = line.match(/\*\*([^*]{3,42})\*\*/);
      if (bold) return bold[1];
      const keyed = line.match(/^\s*[-*]?\s*([A-Z][A-Za-z0-9 /_-]{3,38}):/);
      if (keyed) return keyed[1];
      return "";
    })
    .map((line) => line.replace(/[`*_:[\]()]/g, "").trim())
    .filter((line) => line.length > 2 && !/source response|gemma concern/i.test(line));
  const unique = [...new Set(candidates)].slice(0, 5);
  return unique.length ? unique : ["Concern", "Evidence", "Risk", "Action", "Capsule"];
}

function OperatorTable({ module }: { module: CanvasModule }) {
  const rows = rowsFromMarkdownTable(module.content || "");
  if (rows.length > 0) {
    const [head, ...body] = rows;
    return (
      <table className="mini-table">
        <thead><tr>{head.map((cell, cellIndex) => <th key={`${cell}-${cellIndex}`}>{cell}</th>)}</tr></thead>
        <tbody>
          {body.map((row, index) => (
            <tr key={`${row.join("-")}-${index}`}>{row.map((cell, cellIndex) => <td key={`${cell}-${cellIndex}`}>{cell}</td>)}</tr>
          ))}
        </tbody>
      </table>
    );
  }
  return (
    <table className="mini-table">
      <thead><tr><th>Gate</th><th>Owner</th><th>Status</th></tr></thead>
      <tbody>
        <tr><td>Define scope</td><td>operator</td><td>open</td></tr>
        <tr><td>Add evidence</td><td>operator</td><td>open</td></tr>
        <tr><td>Review handoff</td><td>operator</td><td>ready</td></tr>
      </tbody>
    </table>
  );
}

function rowsFromMarkdownTable(markdown: string) {
  const lines = markdown.split(/\r?\n/).filter((line) => line.trim().includes("|"));
  const rows: string[][] = [];
  for (const line of lines) {
    const cells = line
      .trim()
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) continue;
    rows.push(cells);
  }
  return rows;
}

function EvidenceCard({ selectedAttachmentName, kind }: { selectedAttachmentName: string; kind: CanvasModuleKind }) {
  const label = kind === "pdf-viewer" ? "PDF mounted locally" : kind === "json-viewer" ? "Structured JSON mounted locally" : "Artifact mounted locally";
  return (
    <div className="evidence-card">
      <Eye size={18} />
      <strong>{selectedAttachmentName}</strong>
      <p>{label}. Selecting another attachment updates this evidence surface and the document viewer.</p>
    </div>
  );
}

function QuerySurface() {
  const askGemma = useWorkspaceStore((state) => state.askGemma);
  return (
    <div className="query-surface">
      <button type="button" onClick={() => void askGemma("Correlate the current artifacts and list the highest-confidence containment action.")}>
        Correlate artifacts
      </button>
      <button type="button" onClick={() => void askGemma("Extract entities from the selected artifact and map them to the active topology.")}>
        Extract entities
      </button>
      <button type="button" onClick={() => void askGemma("Generate an evidence-backed incident continuity summary for handoff.")}>
        Continuity summary
      </button>
    </div>
  );
}

function RuntimeComponent({ module }: { module: CanvasModule }) {
  const runtime = useWorkspaceStore((state) => state.runtime);
  const runtimeHealth = useWorkspaceStore((state) => state.runtimeHealth);
  return (
    <div className="runtime-component">
      <strong>{module.title === "Gemma Workspace" ? "Queued Build Workspace" : "Local Runtime Signals"}</strong>
      <div className="signal-grid">
        <span>{providerLabel(runtime)}</span><b>{runtimeHealth.status}</b>
        <span>Model</span><b>{runtime.model}</b>
        <span>Storage</span><b>IndexedDB</b>
        <span>Export</span><b>sealed JSON</b>
      </div>
      {module.content ? <MarkdownRender text={module.content} /> : <p>{runtimeHealth.detail}</p>}
    </div>
  );
}

function continuityLinesForAttachment(attachment: Attachment | undefined, ledger: LedgerEvent[], snippets: string[]): Array<[number, string]> {
  const context = [
    "CONTEXT_CONTINUITY",
    `artifact=${attachment?.name ?? "none"}`,
    `continuity_events=${ledger.length}`,
    `selected_context=${snippets.length}`,
    "",
    "RECENT_EVENT_CHAIN",
    ...ledger.slice(-6).map((event) => `${event.id} ${event.time} ${event.actor} ${event.action} -> ${event.target}`),
    "",
    "SELECTED_CONTEXT",
    ...(snippets.length ? snippets.slice(-3).map((snippet) => snippet.slice(0, 220)) : ["none"]),
    "",
    "ARTIFACT_PREVIEW",
    ...artifactPreviewLines(attachment).map(([, text]) => text),
  ];
  return context.map((line, index) => [index + 1, line]);
}

function artifactPreviewLines(attachment?: Attachment): Array<[number, string]> {
  if (attachment?.content) {
    return attachment.content.split(/\r?\n/).map((line, index) => [index + 1, line]);
  }

  return [
    [1, "No artifact preview is available."],
    [2, "Upload a local file or select captured context to hydrate this context continuity view."],
  ];
}

function surfaceCopy(activeTab: string) {
  const copy: Record<string, string> = {
    Workspace: "Dynamic investigation workspace",
    Assets: "Artifact selection, upload, and inspection",
    Knowledge: "Relationship graph and model-derived state",
    Events: "Event chronology and decision gates",
  };
  return copy[activeTab] ?? copy.Workspace;
}
