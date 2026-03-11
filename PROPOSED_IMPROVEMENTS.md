# Proposed Improvements (no code)

This document lists concrete, non-code workstreams and logic to improve stability, security, and performance. Each entry includes brief rationale, a recommended approach, and acceptance criteria.

## 1) Fix native dependency install reliability
- Rationale: Native modules (e.g., onnxruntime-node) often fail to build on user machines and in CI.
- Approach: Either vendor prebuilt binaries (for target platforms) or remove/replace native modules with pure JS or remote service fallbacks. Add `engines` in `package.json` and a CI job that runs `npm install` on Windows and macOS.
- Acceptance: Fresh clone + `npm install` completes on Windows (CI job passes).

## 2) Migrate incrementally to TypeScript
- Rationale: Strong types reduce runtime bugs, especially across IPC boundaries.
- Approach: Add TS build config and typecheck step. Start with `preload.js` and `src/utils/*` to define IPC contracts and model adapter interfaces.
- Acceptance: `npm run typecheck` passes and critical modules have type coverage.

## 3) Workerize audio processing
- Rationale: Keep renderer and main threads responsive.
- Approach: Move resampling, VAD, and heavy buffering into a Node worker or separate process. Define a small RPC (message) API for chunk/input and progress callbacks.
- Acceptance: UI remains responsive under 100% CPU on a single core while audio processing proceeds.

## 4) Add local transcription fallback
- Rationale: Reduce latency and improve privacy by enabling local transcription (whisper.cpp) with cloud fallback.
- Approach: Ship an optional helper or submodule that runs `whisper.cpp` or similar. Provide a configuration toggle in the UI.
- Acceptance: User can toggle local transcription and get comparable transcription quality offline.

## 5) Harden IPC and input validation
- Rationale: IPC surfaces are primary vectors for code injection or accidental misuse.
- Approach: Enumerate all IPC channels in `preload.js`, allow only narrow message shapes, and validate in the main process. Add unit tests for invalid/malformed messages.
- Acceptance: All channels validate inputs and fail safely on bad payloads.

## 6) Add automated tests and CI
- Rationale: Prevent regressions and ensure installs stay healthy.
- Approach: Add lightweight unit tests for `src/utils`, an integration smoke test that starts the app and checks window creation, and an install job for native deps in CI.
- Acceptance: CI pipeline runs on PRs with green checks for lint/typecheck/install.

## 7) Performance instrumentation and monitoring
- Rationale: Find hotspots in audio and inference pipelines.
- Approach: Add simple timing hooks around capture→transcribe→response flows and aggregate into logs; surface slow calls in the UI.
- Acceptance: Ability to produce a latency breakdown report per interaction.

## 8) UX and error handling improvements
- Rationale: Improve user trust and diagnosability.
- Approach: Show clear model status, retry/fallback options, and persistent error logs export.
- Acceptance: Users can see model selection, failure reason, and export logs to help debugging.

## Prioritization (starter roadmap)
- P0 (now): Fix install reliability, add CI install checks, harden IPC.
- P1 (next): Workerize audio, add local transcription option, basic telemetry.
- P2: TypeScript migration, tests, UX polish and packaging improvements.

## Minimal acceptance checklist
- Fresh clone installs on Windows
- Dev start works (`npm start`) without native build failures
- IPC channels validate payloads
- Audio processing runs in worker without UI jank


---
End of non-code improvement plan.
