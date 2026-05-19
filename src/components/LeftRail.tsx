import { Archive, FileText, FolderOpen, GitBranch, Info, MoreVertical, Package, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { useWorkspaceStore } from "../store";

export function LeftRail() {
  const tasks = useWorkspaceStore((state) => state.tasks);
  const knowledgeFacts = useWorkspaceStore((state) => state.knowledgeFacts);
  const attachments = useWorkspaceStore((state) => state.attachments);
  const canvasModules = useWorkspaceStore((state) => state.canvasModules);
  const payloadPrimitives = useWorkspaceStore((state) => state.payloadPrimitives);
  const declaration = useWorkspaceStore((state) => state.declaration);
  const ledger = useWorkspaceStore((state) => state.ledger);
  const snippets = useWorkspaceStore((state) => state.snippets);
  const selectedAttachmentId = useWorkspaceStore((state) => state.selectedAttachmentId);
  const toggleTask = useWorkspaceStore((state) => state.toggleTask);
  const queueDecisionGateForGemma = useWorkspaceStore((state) => state.queueDecisionGateForGemma);
  const createDecisionGateSurface = useWorkspaceStore((state) => state.createDecisionGateSurface);
  const setTab = useWorkspaceStore((state) => state.setTab);
  const setGraphMode = useWorkspaceStore((state) => state.setGraphMode);
  const focusCanvasModule = useWorkspaceStore((state) => state.focusCanvasModule);
  const addContextSnippet = useWorkspaceStore((state) => state.addContextSnippet);
  const addUploadedAttachments = useWorkspaceStore((state) => state.addUploadedAttachments);
  const selectAttachment = useWorkspaceStore((state) => state.selectAttachment);
  const uploadRef = useRef<HTMLInputElement | null>(null);
  const [expandedAsset, setExpandedAsset] = useState("");
  const payloadSummary = [
    { label: "Files", value: attachments.length },
    { label: "Surfaces", value: canvasModules.length },
    { label: "Primitives", value: payloadPrimitives.length },
  ];
  const payloadTotal = payloadSummary.reduce((sum, item) => sum + item.value, 0);
  const payloadFill = Math.min(100, Math.max(8, payloadTotal * 14));
  const contextHelp = attachments.length > 0
    ? "Local artifacts are staged for inspection. Gemma can use selected context and ledger events without leaving this runtime."
    : "No evidence loaded. Stage local artifacts or ask Gemma to create the first workspace surface.";

  return (
    <aside className="left-rail" aria-label="Investigation assets" tabIndex={0}>
      <section className="rail-panel summary-panel">
        <div className="panel-heading">
          <h2>Workspace Context</h2>
          <button className="panel-info-button" type="button" aria-label={contextHelp} title={contextHelp}>
            <Info size={13} />
          </button>
        </div>
        <div className="confidence-line">
          <span>Context</span>
          <strong>{attachments.length + snippets.length}</strong>
          {Array.from({ length: 8 }, (_, index) => (
            <i className={index < Math.min(8, attachments.length + snippets.length) ? "" : "empty"} key={index} />
          ))}
        </div>
        <span className="corroborated">{ledger.length} ledger events</span>
      </section>

      <section className="rail-panel">
        <div className="panel-heading">
          <h2>Event Log</h2>
          <MoreVertical size={15} />
        </div>
        <small>{ledger.length} events</small>
        <div className="incident-table">
          <div className="incident-header">
            <span>Time</span><span>Event</span><span>Actor</span><span>Target</span>
          </div>
          {ledger.slice(-1).map((item) => (
            <button
              className="incident-row"
              key={item.id}
              type="button"
              onClick={() => {
                setTab("Events");
                setGraphMode("Event Timeline");
                addContextSnippet(`${item.time} ${item.action} ${item.actor} target:${item.target}`, "event-log");
              }}
            >
              <span>{item.time}</span>
              <strong>{item.action.replace(/_/g, " ")}</strong>
              <span>{item.actor}</span>
              <em>{item.target}</em>
            </button>
          ))}
        </div>
      </section>

      <section className="rail-panel">
        <div className="panel-heading">
          <h2>Knowledge Graph</h2>
        </div>
        <button
          className="knowledge-row"
          type="button"
          onClick={() => {
            setTab("Knowledge");
            setGraphMode("Knowledge Graph");
          }}
        >
          <GitBranch size={18} />
          <span>
            <strong>{knowledgeFacts.length ? `${knowledgeFacts.length} relationship${knowledgeFacts.length === 1 ? "" : "s"}` : "No relationships discovered"}</strong>
            <small>{knowledgeFacts.length ? knowledgeFacts.slice(-2).map((fact) => `${fact.source} ${fact.relation} ${fact.target}`).join(" · ") : "Gemma can update the graph from accepted workspace schemas."}</small>
          </span>
        </button>
      </section>

      <section className="rail-panel task-panel">
        <div className="panel-heading">
          <h2>Decision Gates</h2>
        </div>
        {tasks.length > 0 ? (
          tasks.map((task) => (
            <div className="task-row" key={task.id}>
              <input type="checkbox" checked={task.done} onChange={() => toggleTask(task.id)} aria-label={`Complete ${task.text}`} />
              <button type="button" className="task-context-button" onClick={() => queueDecisionGateForGemma(task.id)}>
                {task.text}
                {task.source === "gemma4" ? <small>(meta: gemma4)</small> : null}
              </button>
              <button type="button" className="task-queue-button" aria-label={`Queue ${task.text} for Gemma`} onClick={() => queueDecisionGateForGemma(task.id)}>
                <FileText size={14} />
              </button>
            </div>
          ))
        ) : (
          <div className="gate-empty-actions">
            <p className="rail-empty">Decision gates will be created by the operator or generated from local evidence.</p>
            <button type="button" onClick={() => createDecisionGateSurface()}>
              <FileText size={13} />
              Create gate surface
            </button>
          </div>
        )}
      </section>

      <section className="rail-panel payload-panel">
        <div className="panel-heading">
          <h2>Payload Assets</h2>
          <button type="button" className="rail-icon-button" onClick={() => uploadRef.current?.click()} aria-label="Upload payload asset">
            <Upload size={14} />
          </button>
        </div>
        <button
          type="button"
          className="payload-open-button"
          onClick={() => {
            setTab("Assets");
            setGraphMode("Workflow");
          }}
        >
          <FolderOpen size={15} />
          <span>
            <strong>Browse Assets</strong>
            <small>Open local file browser</small>
          </span>
        </button>
        <div className="payload-summary-grid" aria-label="Payload asset summary">
          {payloadSummary.map((item) => (
            <span key={item.label}>
              <b>{item.value}</b>
              {item.label}
            </span>
          ))}
        </div>
        <div className="asset-meter" aria-label={`${payloadTotal} payload assets`}>
          <i style={{ width: `${payloadFill}%` }} />
        </div>
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
        <div className="payload-primitives">
          {payloadPrimitives.map((primitive) => (
            <button
              type="button"
              key={primitive.id}
              title={`${primitive.status} · ${primitive.timestamp} · ${primitive.detail}`}
              onClick={() => addContextSnippet(`${primitive.path} ${primitive.status}: ${primitive.detail}`, "payload-assets")}
            >
              <Archive size={11} />
              {primitive.name}
            </button>
          ))}
        </div>
        {canvasModules.length > 0 ? (
          <div className="workspace-asset-list" aria-label="Workspace payload assets">
            <small>payload/workspace</small>
            {canvasModules.map((module) => (
              <button
                type="button"
                key={module.id}
                title={`payload/workspace/${module.id}.json · ${module.kind}`}
                onClick={() => {
                  setTab("Workspace");
                  focusCanvasModule(module.id);
                }}
              >
                <FileText size={11} />
                <span>{module.kind}</span>
                <strong>{module.title}</strong>
              </button>
            ))}
          </div>
        ) : null}
        {!declaration.declared ? <p className="rail-empty">Initialize the environment to mint the capsule manifest, chain, and provenance files.</p> : null}
        <div className="asset-stack">
          {attachments.map((item) => {
            const expanded = expandedAsset === item.id;
            const hydration = item.capsuleHydration;
            return (
              <button
                className={`asset-chip ${item.id === selectedAttachmentId ? "selected" : ""} ${hydration ? "capsule-hydration" : ""} ${item.hydratedFrom ? "hydrated-file" : ""}`}
                key={item.id}
                type="button"
                onClick={() => {
                  setExpandedAsset(expanded ? "" : item.id);
                  selectAttachment(item.id);
                }}
              >
                <span>{hydration ? <Archive size={13} /> : <Package size={13} />}{hydration ? "CAPSULE" : item.type}</span>
                <strong>{item.name}</strong>
                {hydration ? <em>{hydration.fileCount} extracted</em> : null}
                {item.hydratedFrom ? <em>{item.capsulePath}</em> : null}
                {expanded ? (
                  <small>
                    {hydration
                      ? `hydrated · ${hydration.fileCount} files · ${hydration.eventCount} events · digest queued`
                      : item.hydratedFrom
                        ? `extracted from capsule · ${item.status} · ${item.timestamp}`
                        : `${item.status} · ${item.timestamp} · ${item.size ? `${item.size} bytes` : "browser-local"}`}
                  </small>
                ) : null}
              </button>
            );
          })}
          {attachments.length === 0 && declaration.declared ? <p className="rail-empty">Uploaded files and Gemma-created reports will appear here as payload assets.</p> : null}
        </div>
      </section>
    </aside>
  );
}
