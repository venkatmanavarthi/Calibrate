# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Commands

```bash
bun install          # install dependencies
bun run dev          # start dev mode (Electron + Vite HMR)
bun run build        # build all three targets (main, preload, renderer)
bun run typecheck    # type-check main and renderer separately
bun run package:mac  # build + package for macOS
bun run package:win  # build + package for Windows
bun run package:linux # build + package for Linux
```

There are no tests. Type-checking (`bun run typecheck`) is the primary correctness check.

## Architecture

**Calibrate** is an Electron desktop app: tailored resume generation using the user's own AI provider keys.

### Process boundaries

- `electron/main/` — Node.js main process. Handles all filesystem, AI SDK calls, PDF export, and safeStorage. Communicates with renderer only via IPC.
- `electron/preload/index.ts` — bridges main ↔ renderer via `contextBridge`. Exposes `window.api` (typed as `WindowAPI` in `src/types/ipc.ts`).
- `src/` — React renderer process. Has no direct Node.js access; calls `window.api.*` for everything.

### IPC contract

`src/types/ipc.ts` defines `WindowAPI` — the complete set of functions the renderer can call. `src/types/models.ts` defines all domain types shared across both processes. When adding a new capability, the pattern is: add to `WindowAPI`, implement an IPC handler in `electron/main/ipc/`, register it in `electron/main/ipc/index.ts`, and expose it in `electron/preload/index.ts`.

### AI streaming

AI generation and revision are streaming operations. The main process fires `ai:chunk`, `ai:done`, and `ai:error` IPC events back to the renderer. The renderer's `GeneratorStore` (`src/stores/generator.store.ts`) accumulates chunks via `appendChunk`. Each request is identified by a `requestId` (UUID) so concurrent requests can be distinguished and cancelled.

### Storage

All data lives in Electron's `userData` directory (`app.getPath('userData')`):
- `profiles/` — one JSON file per `ExperienceProfile`
- `templates/` — one JSON file per `ResumeTemplate`
- `settings.json` — `AppSettings`
- `keyring.json` — encrypted API keys (via `electron.safeStorage`)

API keys are encrypted with `safeStorage.encryptString` when available, stored as base64 in `keyring.json`, and **never** included in profile/template export bundles.

### AI providers

`electron/main/ai/index.ts` builds the correct `LLMProvider` from `AIProvider` + `AppSettings`. Supported providers: `anthropic`, `openai`, `groq`, `gemini`, `lmstudio`. Groq and LM Studio reuse the OpenAI-compatible provider with different base URLs. All providers stream tokens; the unified `LLMProvider` interface is in `electron/main/ai/types.ts`.

After generation, `electron/main/ai/validator.ts` scans the output for proper nouns, percentages, dollar amounts, and multipliers not found in the source profile, emitting `HallucinationWarning[]`.

### PDF export

PDF is produced natively via `pdfmake` (no Puppeteer, no headless browser). `electron/main/pdf/markdown-to-pdfmake.ts` converts markdown to a pdfmake document definition. Export settings (font, margins, page size) are user-configurable and passed in `PdfExportRequest`.

### Renderer state

Four Zustand stores: `profiles.store`, `templates.store`, `settings.store`, `generator.store`. Stores call `window.api.*` to sync with main process storage; there is no local-only caching layer.

## Key constraints

- **Vite is pinned to `^5.4.x`**. `electron-vite@2.3.0` uses `splitVendorChunk` which was removed in Vite 6. Do not upgrade Vite without also upgrading `electron-vite`.
- **Do not add `"type": "module"` to `package.json`**. The main process builds as CJS via electron-vite's SSR build mode.
- AI SDK packages (`@anthropic-ai/sdk`, `openai`, `@google/generative-ai`, `marked`) are excluded from `externalizeDepsPlugin` and bundled into the main process build — this is intentional for packaged-app compatibility (see `electron.vite.config.ts`).
- `sandbox: false` is set on the BrowserWindow — this is required for `safeStorage` to work on some platforms. Context isolation is still enabled.
- The `@` alias resolves to `src/` in the renderer. It is not available in main-process code.
