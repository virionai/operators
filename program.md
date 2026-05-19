# Capsules.run Operators Program

Capsules.run Operators is an offline local-first intelligence operating environment for investigation, local Gemma/Ollama-assisted analysis, and portable Capsule handoff. It is the runnable Gemma4Good/Kaggle workspace, not a marketing page.

## Known Setup Context

- Project name: Capsules.run Operators.
- Purpose: demonstrate a spatial offline investigation runtime for Capsule and Gemma4Good/Kaggle.
- Primary users: security analysts, incident responders, investigators, and reviewers operating in disconnected or sensitive environments.
- PoC outcome: a command-line runnable local app that communicates local inference, provenance, investigation continuity, evidence handling, and Capsule sealing.
- Runtime environment: Vite browser app served at `http://127.0.0.1:5174` with optional Ollama chat endpoint at `http://127.0.0.1:11434/api/chat`.
- Startup: `./run-local.sh` from this folder.
- Node requirement: `>=20`.
- Default local model: `gemma4:latest`.
- Offline behavior: deterministic local analysis answers when Ollama is disabled or unreachable.
- Security posture: blank local workspace by default; the UX should model high-trust local operation and cryptographic handoff.
- App layer: Vite + React + TypeScript local workspace.

## Current Product Surface

- Top HUD: runtime identity, inference target, session state, operator provenance, and seal/export controls.
- Mode navigation: Workspace, Assets, Knowledge, and Events, with dynamic workspace creation.
- Canvas: blank malleable workspace, generated surfaces, notes, diagrams, tables, schema-driven module creation, context queuing, and context continuity viewer.
- Gemma panel: resident analyst Q&A with queued workspace context chips, concern/workspace item correlation, cancelable inference, and local fallback.
- Bottom queue: tiny expandable active analysis bar.
- Persistence: browser IndexedDB snapshots under `capsules-run-operators`.

## Documentation Status

The root README, management docs, fabric map, overview page, product config, and app/www debrief notes describe the current runnable local app and its local limitations. Keep this status in sync when runtime behavior changes.

## Strategic Gates

- Decide whether local export must become a byte-compatible `.capsule` file using the v0.6 JS SDK or remain a UX handoff artifact.
- Decide whether the Gemma 4 Kaggle demo should ship with an embedded model mock, Ollama-only runtime, or WebGPU/LiteRT option.
- Confirm competition narrative: blank portable intelligence workspace, broader forensic workstation, or packaged scenario generator.
- Confirm distribution target: checked-in build artifact, npm package, desktop wrapper, or static single-page bundle.
- Replace local signature/provenance primitives with production signing only after the Capsule writer path is implemented.
