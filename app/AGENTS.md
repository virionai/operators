# App Agent Notes

The runnable app currently lives at the `operators` root under `src/`. Keep the root one-command runner working.

When editing UI, compare against `../image-renders/` from this `app/` folder.

App guardrails:

- Keep local-first operation primary; do not require cloud APIs for the primary path.
- Treat Ollama/Gemma as optional local runtime support at `http://127.0.0.1:11434/api/chat`.
- Keep `gemma4:latest`, deterministic fallback behavior, IndexedDB continuity, and seal/export docs synchronized with root docs.
- Use `Context Continuity`, `Investigation Continuity`, and `Ledger Events` for visible memory surfaces.
