# Calibrate

Tailored resumes powered by your own AI keys.

Calibrate is a desktop app that uses your own AI provider keys to generate job-specific resumes from reusable profiles and templates — no subscription, no data sent to third-party servers beyond your chosen AI provider.

## Features

- Generate tailored resumes by combining a profile (your experience) with a template (formatting/style) against a job description
- Supports multiple AI providers: Anthropic, OpenAI, Google Gemini, Groq, and LM Studio (local)
- Export to PDF natively via Electron — no Puppeteer, no browser dependency
- API keys stored encrypted via Electron `safeStorage` — never included in profile or template exports
- Markdown editor with live preview for profiles and templates

## Tech Stack

- **Electron** + **electron-vite** — desktop shell and build tooling
- **React 18** + **TypeScript** — renderer UI
- **Tailwind CSS** + **shadcn/ui** (Radix UI) — styling and components
- **Zustand** — state management
- **Bun** — package manager and script runner

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed
- Node.js 20+ (for Electron compatibility)

### Install

```bash
bun install
```

### Run in development

```bash
bun run dev
```

### Build

```bash
bun run build
```

### Package for distribution

```bash
bun run package:mac    # macOS
bun run package:win    # Windows
bun run package:linux  # Linux
```

## Project Structure

```
electron/
  main/
    ai/        # AI provider integrations (Anthropic, OpenAI, Gemini, Groq, LM Studio)
    ipc/       # IPC handlers exposed to renderer
    pdf/       # PDF export via printToPDF
    security/  # safeStorage key management
    storage/   # Profiles, templates, and session persistence
src/
  components/  # Shared UI components
  pages/       # Dashboard, generator, profiles, templates, settings
  stores/      # Zustand stores
  types/       # Shared TypeScript types
```

## Notes

- Vite is pinned to `^5.4.x`. `electron-vite@2.3.0` uses `splitVendorChunk` which was removed in Vite 6+. Do not upgrade Vite without also upgrading `electron-vite`.
- The main process builds as CJS via electron-vite's SSR build. Do not add `"type": "module"` to `package.json`.
