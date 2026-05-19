import type { Attachment } from "../data";

export type RuntimeSettings = {
  enabled: boolean;
  endpoint: string;
  model: string;
};

export type RuntimeAnswer = {
  text: string;
  usedLocalModel: boolean;
  errorDetail?: string;
};

export type RuntimeHealth = {
  status: "checking" | "connected" | "fallback" | "disabled";
  detail: string;
  checkedAt: string;
};

export type FocusedCanvasContext = {
  id: string;
  kind: string;
  title: string;
  subtitle: string;
  content?: string;
  code?: string;
};

export type RuntimeQueueItem = {
  id: string;
  kind: "module" | "asset" | "selection" | "concern" | "workspace";
  label: string;
  detail: string;
  moduleId?: string;
  attachmentId?: string;
  content?: string;
  code?: string;
  schema?: unknown;
};

const DEFAULT_OFFLINE_ANSWER =
  "Offline deterministic analysis: no local model response is available. Upload artifacts or select context, then Gemma can summarize evidence, propose canvas modules, and prepare continuity notes without cloud dependency.";

const WORKSPACE_RESPONSE_CONTRACT = [
  "Response contract:",
  "1. Start with a short operator-facing summary in Markdown.",
  "2. Do not include hidden chain-of-thought. Do not label a section Operational Reasoning or Thinking.",
  "3. If a queued workspace item includes a workspace_schema, return a section named WORKSPACE UPDATE.",
  "4. For Mermaid Diagram, Graph, Knowledge Graph, Workflow, topology, or relationship-map requests, include exactly one fenced Mermaid block:",
  "```mermaid",
  "flowchart LR",
  "  A[Source] --> B[Finding]",
  "```",
  "5. Use valid Mermaid syntax only inside the Mermaid fence. Put prose outside the fence.",
  "6. For Structured Table, IOC Board, comparison grid, or vendor/component requests, include exactly one Markdown table with a header row and separator row.",
  "7. For Markdown Note or report requests, return Markdown preview content only. Do not return JSON unless a schema below explicitly asks for JSON.",
  "8. For React Component requests, return a concise component description plus a fenced tsx block.",
  "9. End with one short line: Next operator action: ...",
].join("\n");

const DECISION_GATE_RESPONSE_SCHEMA = [
  "Decision gate schema:",
  "When you identify operator decisions, containment checkpoints, validation steps, approvals, or evidence review gates, include this section:",
  "DECISION GATES",
  "```json",
  "{",
  '  "decision_gates": [',
  "    {",
  '      "text": "Verify chain provenance",',
  '      "severity": "high",',
  '      "evidence": "artifact name, selected snippet, event id, or local observation"',
  "    }",
  "  ]",
  "}",
  "```",
  "Allowed severity values: low, medium, high, critical.",
  "Return no more than five decision gates. Each gate must be actionable and evidence-linked.",
].join("\n");

const KNOWLEDGE_GRAPH_RESPONSE_SCHEMA = [
  "Knowledge graph schema:",
  "On every answer, if you discover entities, assets, actors, components, incidents, relationships, ownership, causality, access, dependency, or evidence links, include this section:",
  "KNOWLEDGE GRAPH FACTS",
  "```json",
  "{",
  '  "knowledge_facts": [',
  "    {",
  '      "source": "SpotBugs",',
  '      "relation": "affected_by",',
  '      "target": "PAT leak",',
  '      "evidence": "artifact name, selected snippet, event id, or local observation"',
  "    }",
  "  ]",
  "}",
  "```",
  "Keep facts atomic. Do not duplicate facts already stated in the same response.",
].join("\n");

function buildPrompt(
  question: string,
  attachments: Attachment[],
  snippets: string[],
  systemPrompt: string,
  queue: RuntimeQueueItem[],
  focusedModule?: FocusedCanvasContext,
) {
  return [
    "You are Gemma 4 running as a local incident-analysis layer inside Capsules.run Operators.",
    "Use concise operational reasoning. Reference evidence by artifact name.",
    "Workspace outputs are proposed, untrusted local workspace updates until the operator accepts or seals them.",
    WORKSPACE_RESPONSE_CONTRACT,
    DECISION_GATE_RESPONSE_SCHEMA,
    KNOWLEDGE_GRAPH_RESPONSE_SCHEMA,
    workspaceOutputHint(queue, focusedModule),
    systemPrompt.trim() ? `Operator system prompt: ${systemPrompt.trim()}` : "",
    focusedModule ? focusedCanvasContext(focusedModule) : "Focused canvas module: none",
    queuedContext(queue),
    "",
    `Question: ${question}`,
    "",
    `Artifacts: ${attachments.map((item) => `${item.name} (${item.status})`).join(", ")}`,
    snippets.length ? `Selected context: ${snippets.join("\n---\n")}` : "Selected context: none",
  ].join("\n");
}

function workspaceOutputHint(queue: RuntimeQueueItem[], focusedModule?: FocusedCanvasContext) {
  const wantsGraph = queue.some((item) => /graph|mermaid|diagram|topology|workflow|relationship/i.test(`${item.label} ${item.detail}`)) ||
    Boolean(focusedModule && /graph|mermaid|diagram|topology|workflow|relationship/i.test(`${focusedModule.kind} ${focusedModule.title} ${focusedModule.subtitle}`));
  const wantsTable = queue.some((item) => /table|grid|ioc board|comparison|vendor|component/i.test(`${item.label} ${item.detail}`)) ||
    Boolean(focusedModule && /table|grid|ioc|comparison/i.test(`${focusedModule.kind} ${focusedModule.title} ${focusedModule.subtitle}`));

  if (wantsTable) {
    return [
      "Current workspace output hint: the operator queued a structured table surface.",
      "Populate that surface with exactly one Markdown table.",
      "Do not describe the table instead of providing table rows.",
      "Keep prose outside the table short.",
    ].join("\n");
  }

  if (!wantsGraph) {
    return "Current workspace output hint: no graph surface is required unless the operator explicitly asks for one.";
  }

  return [
    "Current workspace output hint: the operator queued a visual topology surface.",
    "Populate that surface with a valid fenced Mermaid diagram.",
    "Prefer flowchart LR for workflows and relationship graphs.",
    "Do not describe the diagram instead of providing Mermaid source.",
  ].join("\n");
}

export async function runGemmaQuestion(
  question: string,
  settings: RuntimeSettings,
  attachments: Attachment[],
  snippets: string[],
  systemPrompt: string,
  queue: RuntimeQueueItem[],
  focusedModule: FocusedCanvasContext | undefined,
  signal: AbortSignal,
): Promise<RuntimeAnswer> {
  if (!settings.enabled || !settings.endpoint.trim()) {
    await wait(620, signal);
    return {
      text: synthesizeOfflineAnswer(question, snippets, queue, focusedModule),
      usedLocalModel: false,
      errorDetail: "Ollama disabled by operator.",
    };
  }

  try {
    const response = await fetch(settings.endpoint, {
      method: "POST",
      signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: settings.model || "gemma4:latest",
        stream: false,
        messages: [
          {
            role: "user",
            content: buildPrompt(question, attachments, snippets, systemPrompt, queue, focusedModule),
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Ollama returned ${response.status}${body ? `: ${body.slice(0, 220)}` : ""}`);
    }
    const json = (await response.json()) as { message?: { content?: string }; response?: string };
    const text = json.message?.content || json.response || DEFAULT_OFFLINE_ANSWER;
    return { text, usedLocalModel: true };
  } catch (error) {
    if (signal.aborted) throw error;
    await wait(360, signal);
    const errorDetail = runtimeErrorDetail(error);
    return {
      text: `${synthesizeOfflineAnswer(question, snippets, queue, focusedModule)}\n\nRuntime note: ${errorDetail}.`,
      usedLocalModel: false,
      errorDetail,
    };
  }
}

export async function checkRuntimeHealth(settings: RuntimeSettings, signal?: AbortSignal): Promise<RuntimeHealth> {
  if (!settings.enabled || !settings.endpoint.trim()) {
    return health("disabled", "Ollama disabled; deterministic local fallback is active.");
  }

  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 1800);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });

  try {
    const response = await fetch(tagsEndpoint(settings.endpoint), { signal: controller.signal });
    if (!response.ok) throw new Error(`Ollama returned ${response.status}`);
    const json = (await response.json()) as { models?: Array<{ name?: string }> };
    const models = json.models?.map((model) => model.name).filter(Boolean) ?? [];
    const model = settings.model || "gemma4:latest";
    const modelAvailable = models.includes(model) || models.some((name) => name?.startsWith(model.split(":")[0]));
    return modelAvailable
      ? health("connected", `${model} available through local Ollama.`)
      : health("fallback", `Ollama reachable, but ${model} was not listed locally.`);
  } catch (error) {
    if (signal?.aborted) throw error;
    return health("fallback", `${runtimeErrorDetail(error)}. Deterministic local fallback is active.`);
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

function synthesizeOfflineAnswer(
  question: string,
  snippets: string[],
  queue: RuntimeQueueItem[],
  focusedModule?: FocusedCanvasContext,
) {
  const q = question.toLowerCase();
  const selected = snippets.length
    ? `\n\nSelected context incorporated: ${snippets[snippets.length - 1].slice(0, 220)}`
    : "";
  const queued = queue.length ? `\n\nQueued workspace context: ${queue.map((item) => item.label).join(", ")}` : "";
  const focused = focusedModule
    ? `\n\nFocused canvas module: ${focusedModule.title} (${focusedModule.kind}). ${focusedModule.subtitle}`
    : "";

  if (q.includes("process")) {
    return `No process relationships are available yet. Add a log, event file, or structured artifact and ask again; the response will be grounded in the selected local evidence.${selected}${queued}${focused}`;
  }

  if (q.includes("access") || q.includes("vector")) {
    return `No access path can be inferred from an empty workspace. Add source artifacts, select relevant context, or ask Gemma to create a hypothesis surface from uploaded evidence.${selected}${queued}${focused}`;
  }

  if (q.includes("seal") || q.includes("capsule")) {
    return `The workspace can be sealed, but the current capsule will only contain local state that has been staged by the operator: artifacts, context snippets, ledger events, tasks, and generated surfaces.${selected}${queued}${focused}`;
  }

  return `${DEFAULT_OFFLINE_ANSWER}${selected}${queued}${focused}`;
}

function queuedContext(queue: RuntimeQueueItem[]) {
  if (queue.length === 0) return "Queued workspace context: none";
  return [
    "Queued workspace context, selected by the operator and waiting for this prompt:",
    ...queue.slice(0, 12).map((item) => {
      const parts = [
        `- ${item.kind}: ${item.label}`,
        `  detail: ${item.detail}`,
      ];
      if (item.content?.trim()) parts.push(`  content: ${item.content.trim().slice(0, 1600)}`);
      if (item.code?.trim()) parts.push(`  code: ${item.code.trim().slice(0, 1600)}`);
      if (item.schema) parts.push(`  workspace_schema: ${JSON.stringify(item.schema).slice(0, 2400)}`);
      return parts.join("\n");
    }),
  ].join("\n");
}

function focusedCanvasContext(module: FocusedCanvasContext) {
  const parts = [
    "Focused canvas module:",
    `- id: ${module.id}`,
    `- kind: ${module.kind}`,
    `- title: ${module.title}`,
    `- purpose: ${module.subtitle}`,
  ];
  if (module.content?.trim()) parts.push(`- markdown/content:\n${module.content.trim().slice(0, 2400)}`);
  if (module.code?.trim()) parts.push(`- code/source:\n${module.code.trim().slice(0, 2400)}`);
  return parts.join("\n");
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(id);
        reject(new DOMException("Inference cancelled", "AbortError"));
      },
      { once: true },
    );
  });
}

function tagsEndpoint(endpoint: string) {
  return endpoint.replace(/\/api\/chat\/?$/, "/api/tags");
}

function runtimeErrorDetail(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (/Failed to fetch|NetworkError|Load failed/i.test(message)) {
    return "Ollama endpoint unreachable; check that Ollama is running and that the browser can reach 127.0.0.1:11434";
  }
  return `Ollama request failed: ${message}`;
}

function health(status: RuntimeHealth["status"], detail: string): RuntimeHealth {
  return {
    status,
    detail,
    checkedAt: new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date()),
  };
}
