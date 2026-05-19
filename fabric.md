# Fabric Map

## Topology

- `run-local.sh`: one-line startup; installs dependencies if needed and runs `npm run start`.
- `package.json`: Vite scripts; Node `>=20`; app/repo name `operators`.
- `src/main.tsx`: React entry.
- `src/App.tsx`: app shell composition.
- `src/components/TopHud.tsx`: runtime identity, editable Start Here declaration, Ollama toggle, session state, operator, seal/export.
- `src/components/ModeNav.tsx`: Workspace, Assets, Knowledge, Events, dynamic workspace creation, and workflow controls.
- `src/components/LeftRail.tsx`: workspace context, event log, knowledge graph, decision gates, uploads, and declaration-generated Capsule payload primitives.
- `src/components/WorkspaceCanvas.tsx`: blank canvas, schema-driven generated surfaces, graphs, tables, uploads, context continuity viewer, note capture, module focus queuing, preview-only generated concerns, and `_ [ ] X` module controls.
- `src/components/GemmaPanel.tsx`: resident Gemma analyst panel with Q&A, queued workspace context chips, concern correlation, and cancelable inference.
- `src/components/BottomQueue.tsx`: tiny expandable active analysis queue.
- `src/components/SelectionCapture.tsx`: page selection `+ Add to Context`.
- `src/lib/localRuntime.ts`: optional Ollama `/api/chat` bridge, workspace response contract, decision-gate schema prompt, plus deterministic offline fallback.
- `src/lib/persistence.ts`: IndexedDB snapshot load/save.
- `src/lib/capsuleExport.ts`: local Capsule JSON artifact and SHA-256 hash.
- `src/data.ts`: shared data types and intentionally empty default arrays.
- `image-renders/`: accepted visual references.

## External Context

- `../capsule-www`: existing brand primitives and command-center lessons.
- `../capsules-protocol`: Capsule v0.6 protocol, SDKs, and trust model.

## Runtime Surface

- Primary: Vite local server at `127.0.0.1:5174`.
- Optional inference: Ollama at `http://127.0.0.1:11434/api/chat`.
- Default model: `gemma4:latest`.
- Fallback: deterministic local analysis if Ollama is disabled, missing, or unreachable.
- Persistence: local IndexedDB database `capsules-run-operators`, store `snapshots`, key `workspace-state-v2`.
- Fresh session escape hatch: open with `?fresh` to skip snapshot hydration.
- Export: local `.capsule.json`, currently a hashed workspace handoff artifact rather than byte-compatible Capsule v0.6.

## Product Language

- Use `Context Continuity` for workflow/memory mode.
- Use `Investigation Continuity` for the bottom ledger surface.
- Use `Events` for the append-only event navigation surface.
