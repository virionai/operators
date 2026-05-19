# App Debrief

Root-level Vite app selected for simplest command-line startup. `./run-local.sh` starts the local browser workspace at `http://127.0.0.1:5174`.

Current app behavior:

- Optional Ollama/Gemma runtime uses `http://127.0.0.1:11434/api/chat` with `gemma4:latest`.
- Deterministic fallback keeps Gemma Q&A functional when Ollama is unavailable.
- IndexedDB snapshots preserve browser-local continuity unless opened with `?fresh`.
- The seal/export flow emits a hashed local Capsule JSON handoff.

Known app limitations:

- No production Capsule v0.6 writer yet.
- Uploaded artifacts are represented in browser state; deep parsing is not implemented.
- Signing/provenance labels are local primitives until protocol signing is integrated.

Future packaging can move the app into this folder if a separate management/app repository split becomes necessary.
