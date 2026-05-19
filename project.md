# Project Control

## Current Decision

Build and document the local browser app first, using a blank workspace with optional Ollama integration.

## Status

- Management scaffold: active.
- Runtime scaffold: active.
- Documentation scaffold: current for the local app, runtime expectations, continuity naming, and local limitations.
- Visual source: accepted image renders in `image-renders/`.
- Protocol integration: modeled UX and local hash/export hooks; byte-compatible export remains a gate.
- Startup: `./run-local.sh` from `operators`, serving `http://127.0.0.1:5174`.
- Local model path: optional Ollama at `http://127.0.0.1:11434/api/chat` with `gemma4:latest`.
- Offline path: deterministic local analysis when Ollama is disabled or unreachable.
- Persistence: IndexedDB snapshots and ledger continuity in browser state.

## Known Demo Limitations

- Export is a local `.capsule.json` workspace handoff with `capsule_version: "0.6-local-ui"`, not a byte-compatible Capsule v0.6 package.
- Ollama service startup and model installation are outside the app.
- Uploaded artifacts are represented in browser state; deep file parsing is not implemented.
- Ed25519/signature labels are local provenance primitives until protocol signing is wired in.
- The default workspace is blank; artifact and scenario data should come from the operator or Gemma-generated surfaces.

## Next Mini-Project

Replace the local handoff artifact with a real Capsule v0.6 export path that uses the shared JS SDK or a browser-compatible writer bundle.
