# Design System

The accepted visual references are:

- `image-renders/operators-ir-example.png`
- `image-renders/Capsule-local-explained.png`

## Extracted UI Direction

The app uses a quiet operational trust surface: black background, low-contrast grid, thin ledger borders, blue/sage/amber/rose status semantics, and isolated Command gradient energy on the assistant dock and modal.

Primary typography:

- Headers, labels, telemetry, logs: Space Mono.
- Body copy and explanatory surfaces: Space Grotesk.

Core regions:

- Top HUD: runtime identity, current action, inference target, session state, operator provenance.
- Workspace: left intelligence rail, spatial canvas, floating document viewer, Command modal.
- Bottom HUD: active analysis queue and contextual awareness, not a primary compression queue.

Interactive inventory:

- Runtime toggle in the top HUD for optional local Ollama use.
- Runtime health check against local Ollama tags, with truthful connected/fallback/disabled/checking states.
- Runtime configuration popover for endpoint/model edits and Ollama default restore.
- Runtime context line uses blue, amber, and rose fill states to show context utilization without a bulky footer meter.
- Seal Capsule control that stages, hashes, and exposes the local JSON export with provenance/signing primitives.
- Operator identity control can update the operator id and rotate Ed25519/ChaCha20 primitives.
- Start Here opens an editable declaration surface preloaded with local Command/Ollama, Capsule protocol, artifact staging, persistence, and cryptographic hook capabilities.
- Workspace tabs: Workspace, Assets, Knowledge, Events, plus a dynamic workspace creation control.
- Canvas-owned schema controls for Markdown Note, Mermaid Diagram, Timeline, Graph, Table, IOC Board, Host Map, Evidence Viewer, and Upload Artifact.
- Clicking files, selected text, or workspace modules queues compact visual context chips in Command instead of auto-running inference.
- Workflow mode menu: Workflow, Knowledge Graph, Event Timeline, Context Continuity.
- Payload Assets live in the left rail with browser-local upload representation and expandable metadata.
- Capsule payload primitives are not static demo assets; they are generated when the operator declares the local environment.
- Context Continuity view with local search over recent ledger events, selected snippets, and artifact preview.
- Page-level text selection affordance: `+ Add to Context`.
- Resident overlay Command panel with Q&A, queued context chips, queued follow-up task cards, communication-plan cards, generated component frames, and cancelable inference.
- Decision Gates are schema-populated operational checkpoints. Command returns them as evidence-linked JSON, and the rail renders them as human-reviewable gates with source attribution.
- Command-detected concerns become rose-coded workspace items and matching Command queue chips so the operator can correlate chat output with canvas state. Generated concern notes render preview-only; graph-queued concerns render as graph/topology modules.
- Tiny expandable bottom queue with icon-only active local analysis tasks by default.
- Workspace modules are draggable, reorderable, expandable, collapsible, and removable. Their visible controls follow traditional `_ [ ] X` window semantics.

Important visual constraints:

- Rigid object permanence.
- No SaaS-style hero page.
- No modal-heavy interaction except Command and sealing.
- Command is a resident analysis layer, not a chatbot page.
- Capsule/protocol shapes appear as marks, seals, ledger ticks, and bounded evidence objects.
- Offline status must stay visible. Do not imply a cloud model path is required.
- Use `Context Continuity`, `Investigation Continuity`, and `Events` for memory/continuity surfaces.
