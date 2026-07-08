# Capsules.run Operators Agent Notes

This workspace is a PrePoC-style product scaffold plus a runnable local app. Future agents should keep `README.md`, `program.md`, `design.md`, `product-narrative.md`, `project.md`, `fabric.md`, `Overview.html`, and `product.conf` current when the runtime, UX, or protocol integration changes.

Operational rules:

- Preserve local-first behavior. Do not add required cloud services to the primary path.
- Keep `./run-local.sh` as the one-line startup from this folder.
- Document Ollama/Gemma as optional local runtime support, not a required cloud dependency. OpenAI-compatible endpoints (LM Studio, llama.cpp, vLLM, hosted APIs) are equally supported through the same Configure control; keep both protocols working when touching `src/lib/localRuntime.ts`.
- Keep visible protocol claims aligned with `../capsules-protocol/spec`.
- Do not claim byte-compatible Capsule v0.6 export until the writer integration exists.
- Use `Context Continuity`, `Investigation Continuity`, or `Ledger Events` for user-facing memory language. Do not present Pith or compression as the primary product.
- Treat `image-renders/` as accepted visual reference material unless the user supplies newer renders.
- Current known limitation: export is a hashed local handoff artifact until the Capsule v0.6 writer and production signing path are integrated.
