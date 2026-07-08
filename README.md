# Capsules.run Operators

Offline local-first analyst workspace for Gemma4Good/Kaggle and Capsule handoff. Capsules.run Operators opens as a blank operational surface, uses a local model runtime when available, and preserves investigation continuity through visible ledger events. The harness is industry-agnostic: the analyst persona adapts to whatever domain the operator declares (incident response, financial analysis, legal review, supply chain, research, and so on) through the environment declaration and system prompt.

## Quick Start

Run it from this folder:

```sh
./run-local.sh
```

The script installs dependencies only when `node_modules/` is missing, then starts Vite at `http://127.0.0.1:5174`. Node `>=20` is expected.

## Model Runtime

The app speaks two wire protocols, selectable in the HUD Configure control:

- **Ollama (native API, default)**: `http://127.0.0.1:11434/api/chat` with model `gemma4:latest`. Health is checked through `/api/tags`.
- **OpenAI-compatible (chat completions)**: any endpoint that implements `POST /v1/chat/completions` — LM Studio, llama.cpp server, vLLM, or a hosted OpenAI-compatible API. Health is checked through `GET /v1/models`. An optional API key is sent as a `Bearer` token for authenticated endpoints and stays in browser-local state.

Configure includes one-click presets for Ollama (`:11434`), LM Studio (`:1234/v1`), llama.cpp (`:8080/v1`), and vLLM (`:8000/v1`). The provider is auto-detected from the endpoint path (`/v1` or `chat/completions` implies OpenAI-compatible). Prompts are sent as proper `system` + `user` chat messages on both protocols.

- The HUD reports connected, checking, disabled, or fallback status.
- The HUD Configure control can edit provider/endpoint/model/API key or explicitly use deterministic fallback.
- If the runtime is disabled or unreachable, the app uses deterministic offline analysis. No cloud model is required for the primary path.

## What This App Shows

- A rigid operational surface with persistent top HUD, workspace canvas, Gemma assistant, and bottom analysis queue.
- Local runtime status for `Ollama -> gemma4`, with endpoint/model details kept inside Configure.
- A blank malleable canvas where operators upload artifacts, add surfaces, and queue workspace context before asking Gemma.
- Workspace tabs for Workspace, Assets, Knowledge, and Events, plus a dynamic workspace creation control.
- Canvas-owned schema controls for notes, diagrams, timelines, graphs, tables, IOC boards, host maps, evidence viewers, and uploaded artifacts.
- Movable, expandable, collapsible workspace modules with traditional `_ [ ] X` window controls and drag/reorder handles.
- Highlight-to-context capture that queues selected text for the next Gemma prompt and appends a local event.
- Context Continuity view over ledger context, selected snippets, and artifact preview.
- Browser-local uploads with text/log/json/csv/markdown preview content in the continuity viewer; binary files render local metadata.
- Gemma Q&A with cancelable local inference and deterministic fallback.
- A visible Gemma workspace queue with compact item chips for notes, assets, selections, concerns, and generated component frames.
- Gemma concern artifacts render as operator-facing previews. If the queued workspace request is a graph/topology surface, the concern is created as a graph module instead of a markdown note.
- Start Here preloads the local runtime environment and available Capsule/Gemma tools so the operator can edit from a useful baseline.
- Environment declaration generates the initial Capsule payload primitives: manifest, payload directory, event chain, and provenance envelope.
- Model responses can populate Decision Gates through a `decision_gates` JSON schema; parsed gates render in the left rail with a severity chip, linked evidence, and `(meta: gemma4)` attribution. Completing or reopening a gate appends an operator-attributed ledger event (`decision_gate_completed` / `decision_gate_reopened`).
- Mermaid output renders as real diagrams on graph/mermaid canvas modules and inside markdown notes (strict security level, lazy-loaded renderer, source-view fallback on invalid syntax).
- Every ledger event records a machine-readable ISO-8601 timestamp alongside the display time, and sealed capsule chains preserve the real per-event times for audit review.
- Completing a decision gate requires a recorded reason; the note is stored on the gate (`resolution`, `resolvedAt`) and appended to the ledger event so the decision rationale travels with the capsule.
- The Events tab is a dedicated searchable ledger surface: full append-only event table with display time, recorded UTC timestamp, action, actor, and target, filterable and queueable as model context.
- The Evidence Heatmap module plots real actor-by-action event counts from the ledger instead of synthetic intensity values.
- Task toggles, tiny expandable active analysis footer, and runtime context utilization line.
- A seal/export flow that assembles a local `.capsule.json` workspace continuity artifact and hashes it locally.

## Offline Constraints

The primary path is local browser + local files + IndexedDB snapshots. The app persists state in IndexedDB and skips snapshot hydration when opened with `?fresh`. Uploaded artifacts are read by the browser for local preview only; they are not sent to a server.

Use the product language `Context Continuity`, `Investigation Continuity`, and `Events` when describing workspace memory. Internal reduction primitives are implementation detail, not a primary product surface.

## Known Limitations

- The export is a local Capsule JSON handoff with `capsule_version: "0.6-local-ui"`, not a byte-compatible Capsule v0.6 package.
- Signature and Ed25519 language is a UX/provenance primitive until the protocol writer is wired in.
- The initial workspace intentionally contains no seeded case data.
- Ollama lifecycle and model installation are operator-managed outside the app.
- This is not production forensic chain-of-custody or evidence parsing infrastructure.

## Source References

- Visual renders: `image-renders/Capsule-local-explained.png` and `image-renders/operators-ir-example.png`
- Protocol constraints: `../capsules-protocol/spec`
- Existing primitives and brand direction: `../capsule-www`
