import {
  AlertTriangle,
  Bot,
  Code2,
  FileText,
  GitBranch,
  Layers,
  MessageSquare,
  Package,
  Quote,
  RefreshCw,
  Send,
  Sparkles,
  Table2,
  WifiOff,
  X,
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { providerLabel } from "../lib/localRuntime";
import { useWorkspaceStore, type CanvasModule, type WorkspaceQueueItem } from "../store";
import { hideThinkingSections, MarkdownRender } from "./MarkdownRender";

export function CommandPanel() {
  const commandOpen = useWorkspaceStore((state) => state.commandOpen);
  const commandWorkspaceMode = useWorkspaceStore((state) => state.commandWorkspaceMode);
  const commandBusy = useWorkspaceStore((state) => state.commandBusy);
  const runtime = useWorkspaceStore((state) => state.runtime);
  const runtimeHealth = useWorkspaceStore((state) => state.runtimeHealth);
  const toggleCommand = useWorkspaceStore((state) => state.toggleCommand);
  const setCommandWorkspaceMode = useWorkspaceStore((state) => state.setCommandWorkspaceMode);
  const checkRuntime = useWorkspaceStore((state) => state.checkRuntime);
  const messages = useWorkspaceStore((state) => state.messages);
  const queuedWorkspaceItems = useWorkspaceStore((state) => state.queuedWorkspaceItems);
  const removeQueuedWorkspaceItem = useWorkspaceStore((state) => state.removeQueuedWorkspaceItem);
  const tasks = useWorkspaceStore((state) => state.tasks);
  const activeAnalysis = useWorkspaceStore((state) => state.activeAnalysis);
  const canvasModules = useWorkspaceStore((state) => state.canvasModules);
  const focusCanvasModule = useWorkspaceStore((state) => state.focusCanvasModule);
  const askCommand = useWorkspaceStore((state) => state.askCommand);
  const cancelInference = useWorkspaceStore((state) => state.cancelInference);
  const buildCommandWorkspaceFromQueue = useWorkspaceStore((state) => state.buildCommandWorkspaceFromQueue);
  const createDecisionGateSurface = useWorkspaceStore((state) => state.createDecisionGateSurface);
  const createCommunicationPlanSurface = useWorkspaceStore((state) => state.createCommunicationPlanSurface);
  const [input, setInput] = useState("");
  const [showThinking, setShowThinking] = useState(false);
  const [commandPosition, setCommandPosition] = useState(() => ({
    x: typeof window === "undefined" ? 1180 : Math.max(720, window.innerWidth - 380),
    y: 166,
  }));
  const endRef = useRef<HTMLDivElement | null>(null);
  const renderedWorkspaceModules = workspaceRenderModules(canvasModules);

  function startCommandMove(event: React.PointerEvent<HTMLElement>) {
    if (commandWorkspaceMode) return;
    if ((event.target as HTMLElement).closest("button")) return;
    const offsetX = event.clientX - commandPosition.x;
    const offsetY = event.clientY - commandPosition.y;
    const move = (moveEvent: PointerEvent) => {
      setCommandPosition({
        x: Math.min(Math.max(12, moveEvent.clientX - offsetX), window.innerWidth - 352),
        y: Math.min(Math.max(92, moveEvent.clientY - offsetY), window.innerHeight - 220),
      });
    };
    const stop = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop, { once: true });
  }

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length, queuedWorkspaceItems.length, commandOpen]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const question = input.trim();
    if (!question) return;
    setInput("");
    void askCommand(question);
  }

  return (
    <>
      {commandOpen ? (
        <aside
          className={`command-panel command-floating ${commandWorkspaceMode ? "command-workspace-view" : ""}`}
          style={commandWorkspaceMode ? undefined : { left: commandPosition.x, top: commandPosition.y }}
          aria-label="Command AI assistant"
        >
          <header onPointerDown={startCommandMove}>
            <span className="command-sigil"><Sparkles size={18} /></span>
            <div className="command-title-row">
              <h2>Command</h2>
              <button
                type="button"
                className="thinking-toggle"
                aria-pressed={showThinking}
                aria-label={showThinking ? "Hide Command thinking" : "Show Command thinking"}
                onClick={() => setShowThinking((current) => !current)}
              >
                {showThinking ? "Hide thinking" : "Show thinking"}
              </button>
            </div>
            <button className="window-control window-min" type="button" aria-label="Minimize Command" onClick={toggleCommand}>
              <span aria-hidden="true">_</span>
            </button>
            <button
              type="button"
              className="window-control window-max"
              aria-label={commandWorkspaceMode ? "Return Command to floating view" : "Open Command workspace view"}
              title={commandWorkspaceMode ? "Floating view" : "Workspace view"}
              onClick={() => setCommandWorkspaceMode(!commandWorkspaceMode)}
            >
              <span aria-hidden="true">[ ]</span>
            </button>
            <button className="window-control window-close" type="button" aria-label="Close Command" onClick={toggleCommand}>
              <span aria-hidden="true">X</span>
            </button>
          </header>

          <div className="message-stack">
            {runtimeHealth.status !== "connected" ? (
              <section className={`runtime-connection-notice status-${runtimeHealth.status}`}>
                <WifiOff size={15} />
                <span>
                  <strong>{runtimeHealth.status === "checking" ? "Checking local runtime" : "Runtime connection needs attention"}</strong>
                  <small>{runtimeHealth.detail}</small>
                </span>
                <button
                  type="button"
                  className="runtime-reconnect-button"
                  onClick={() => void checkRuntime()}
                  disabled={runtimeHealth.status === "checking"}
                >
                  <RefreshCw size={13} />
                  Reconnect {providerLabel(runtime)}
                </button>
              </section>
            ) : null}
            {messages.length > 0 ? (
              messages.map((message) => (
                <article className={`message message-${message.role}`} key={message.id}>
                  {message.role === "command" ? (
                    <MarkdownRender text={showThinking ? message.text : hideThinkingSections(message.text)} />
                  ) : (
                    <p>{message.text}</p>
                  )}
                  <time>{message.time}</time>
                </article>
              ))
            ) : (
              <article className="message message-command">
                <MarkdownRender text="Command is ready for local evidence. Ask a question, upload artifacts, or generate a canvas surface." />
              </article>
            )}
            {queuedWorkspaceItems.length > 0 ? (
              <section className="workspace-queue" aria-label="Queued workspace context">
                <header>
                  <strong>Queued for Command</strong>
                  <small>{queuedWorkspaceItems.length} item{queuedWorkspaceItems.length === 1 ? "" : "s"} waiting for your prompt</small>
                </header>
                <div className="workspace-queue-list">
                  {queuedWorkspaceItems.map((item) => (
                    <article className={`queue-chip tone-${item.tone}`} key={item.id}>
                      {queueIcon(item)}
                      <span>
                        <strong>{queueKindLabel(item)}</strong>
                        <small>{item.label}</small>
                      </span>
                      <button type="button" aria-label={`Remove ${item.label} from Command queue`} onClick={() => removeQueuedWorkspaceItem(item.id)}>
                        <X size={12} />
                      </button>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}
            {commandWorkspaceMode ? (
              <section className="agent-workspace-render" aria-label="Agent workspace rendered components">
                <header>
                  <strong>Workspace products</strong>
                  <small>{renderedWorkspaceModules.length} rendered surface{renderedWorkspaceModules.length === 1 ? "" : "s"}</small>
                </header>
                <div className="agent-workspace-grid">
                  {renderedWorkspaceModules.length > 0 ? (
                    renderedWorkspaceModules.map((module) => (
                      <article
                        role="button"
                        tabIndex={0}
                        className={`agent-render-card tone-${module.accent}`}
                        key={module.id}
                        onClick={() => focusCanvasModule(module.id)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" || event.key === " ") {
                            event.preventDefault();
                            focusCanvasModule(module.id);
                          }
                        }}
                      >
                        <span>
                          <strong>{module.title}</strong>
                          <small>{module.kind} · {module.subtitle}</small>
                        </span>
                        <MarkdownRender text={workspaceRenderPreview(module)} />
                      </article>
                    ))
                  ) : (
                    <article className="agent-render-empty">
                      <Layers size={16} />
                      <span>
                        <strong>No generated surfaces yet</strong>
                        <small>Ask Command to build a workspace item and it will render here as an operator-facing preview.</small>
                      </span>
                    </article>
                  )}
                </div>
              </section>
            ) : null}
            {commandBusy ? (
              <article className="message message-command thinking">
                <p>Hydrating selected context and running local analysis...</p>
                <button type="button" onClick={cancelInference}>Cancel</button>
              </article>
            ) : null}
            <div ref={endRef} />
          </div>

          <div className="command-cards">
            <button
              type="button"
              onClick={() => {
                createDecisionGateSurface();
              }}
            >
              <MessageSquare size={15} />
              <span>
                Queued follow-up tasks
                <small>{tasks.length} gates available</small>
              </span>
              <b>View</b>
            </button>
            <button
              type="button"
              onClick={() => {
                createCommunicationPlanSurface();
              }}
            >
              <Bot size={15} />
              <span>
                Communication plans ready
                <small>{activeAnalysis.length} analysis items</small>
              </span>
              <b>View</b>
            </button>
            <button
              type="button"
              onClick={() => {
                buildCommandWorkspaceFromQueue();
              }}
            >
              <Code2 size={15} />
              <span>
                Render canvas component
                <small>{canvasModules.length} surfaces active</small>
              </span>
              <b>Build</b>
            </button>
          </div>

          <form className="command-input" onSubmit={onSubmit}>
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask Command anything..."
              aria-label="Ask Command anything"
            />
            <button type="submit" disabled={commandBusy}>
              <Send size={17} />
            </button>
          </form>
        </aside>
      ) : null}

      <button className={`command-dock ${commandBusy ? "busy" : ""}`} type="button" onClick={toggleCommand} aria-label="Open Command">
        <Sparkles size={30} />
        <span>{activeAnalysis.length}</span>
      </button>
    </>
  );
}

function queueKindLabel(item: WorkspaceQueueItem) {
  if (item.kind === "asset") return "Asset";
  if (item.kind === "selection") return "Selection";
  if (item.kind === "concern") return "Concern";
  if (item.kind === "workspace") return "Workspace";
  if (item.icon === "note") return "Note";
  if (item.icon === "graph") return "Graph";
  if (item.icon === "table") return "Table";
  if (item.icon === "code") return "Code";
  return "Item";
}

function queueIcon(item: WorkspaceQueueItem) {
  const props = { size: 15 };
  if (item.icon === "asset") return <Package {...props} />;
  if (item.icon === "selection") return <Quote {...props} />;
  if (item.icon === "concern") return <AlertTriangle {...props} />;
  if (item.icon === "graph") return <GitBranch {...props} />;
  if (item.icon === "table") return <Table2 {...props} />;
  if (item.icon === "code") return <Code2 {...props} />;
  if (item.icon === "workspace") return <Layers {...props} />;
  return <FileText {...props} />;
}

function workspaceRenderModules(modules: CanvasModule[]) {
  const generated = modules.filter((module) =>
    /\b(command|generated|workspace|render|graph|diagram|decision|communication)\b/i.test(`${module.title} ${module.subtitle} ${module.kind}`),
  );
  return (generated.length ? generated : modules).slice(0, 6);
}

function workspaceRenderPreview(module: CanvasModule) {
  if (module.content?.trim()) return module.content.trim().slice(0, 900);
  if (module.code?.trim()) {
    if (module.kind === "mermaid" || module.kind === "graph") {
      return [
        `### ${module.title}`,
        module.subtitle,
        "",
        "Rendered graph surface is available on the workspace canvas.",
      ].join("\n");
    }
    return [
      `### ${module.title}`,
      module.subtitle,
      "",
      "Generated component source is attached to the workspace frame.",
    ].join("\n");
  }
  return `### ${module.title}\n${module.subtitle}`;
}
