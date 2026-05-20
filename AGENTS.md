# AGENTS.md

Guidelines for agentic coding agents working in this repository.

## Project Overview

`transmission-web` is a modern Transmission BitTorrent web UI built with Vue 3 and TypeScript.

- Framework: Vue 3 with Composition API
- Language: TypeScript, strict mode enabled
- Build tool: Vite 7 with `rolldown-vite` override through pnpm
- UI: Naive UI
- State: Pinia
- Styling: UnoCSS, Less, global CSS
- Package manager: pnpm >= 10
- Node: >= 20

## Common Commands

```bash
pnpm install        # install dependencies
pnpm dev            # start Vite dev server, configured on port 5174
pnpm check          # run vue-tsc type checking
pnpm build          # type-check and build production assets into dist/
pnpm preview        # preview built assets
pnpm lint           # ESLint with auto-fix enabled
pnpm lint:fix       # same as pnpm lint
pnpm build:prod     # release-style local build with VITE_BASE_URL=/transmission/web
pnpm release:check  # validate release environment
pnpm release        # GitHub release script; expects a version argument
```

Before finishing code changes, prefer at least `pnpm check`; run `pnpm build` for changes that affect routing, build config, generated imports, or production behavior. There is currently no dedicated test framework configured.

## Project Structure

```text
src/
├── api/                    # Transmission RPC client and typed RPC methods
├── assets/                 # local icons and static assets
├── components/             # Vue components
│   ├── AppHeader/          # top toolbar and mobile action menu
│   ├── CanvasList/         # canvas-based virtual list/table implementation
│   ├── TorrentList/        # DOM-based torrent list pieces
│   ├── SiderbarView.vue/   # sidebar component directory, keep existing spelling
│   └── dialog/             # modal dialogs and settings panes
├── composables/            # reusable Composition API helpers
├── const/                  # shared constants
├── i18n/                   # Vue I18n setup and locale JSON files
├── router/                 # Vue Router routes
├── store/                  # Pinia stores
├── styles/                 # shared Less styles
├── types/                  # TypeScript domain types
├── utils/                  # general utilities
└── views/                  # route-level views
```

## Architecture Notes

- `src/api/rpc.ts` owns the Axios instance, Transmission RPC session-id retry handling, auth headers, and most domain types.
- `src/api/trpc.ts` is a thin method-name wrapper over `callRpc`; keep new RPC calls consistent with this shape.
- `src/store/setting.ts` persists settings through VueUse `useStorage`, including domain, auth mode, language, polling intervals, sidebar state, and display preferences.
- `src/store/torrent.ts` owns torrent polling data, filtering, sorting, menu option derivation, visible columns, and selection state.
- `src/components/CanvasList/` contains the high-performance canvas list path. Be careful with viewport, row height, column width, and mobile rendering assumptions.
- The app uses Vue Router history with `import.meta.env.VITE_BASE_URL || '/'`.
- Vite dev proxy sends `/transmission/rpc` to `VITE_DOMAIN`.
- Docker runtime serves static files through nginx on `PORT` default `7632` and proxies `/transmission/rpc` to `BACKEND_URL` default `http://localhost:9091`.

## Code Style

- Use Vue 3 Composition API and `<script setup>` for new Vue components unless nearby code uses another pattern.
- Prefer the existing `@/` alias for local imports.
- Semicolons are disallowed.
- Curly braces are required for control statements.
- Single quotes are preferred.
- Keep Prettier settings in mind: 2-space tabs, `printWidth: 120`, no trailing commas.
- `no-console` is disabled and `@typescript-eslint/no-explicit-any` is disabled, but prefer precise types when practical.
- `noUnusedLocals` and `noUnusedParameters` are disabled in TypeScript config; do not add unused code unless it is intentional and useful.

## Auto Imports And Generated Files

- Vue, VueUse, and Vue Router APIs are auto-imported by `unplugin-auto-import`; generated declarations live in `src/auto-imports.d.ts`.
- Naive UI components are auto-registered by `unplugin-vue-components`; generated declarations live in `components.d.ts`.
- If component or auto-import behavior changes, run the relevant dev/build command so generated declarations stay current.

## Internationalization

- Supported locales are `zh-CN` and `en-US`.
- Locale files live under `src/i18n/locales/`.
- Keep translation keys synchronized across all locale JSON files.
- Use existing key namespaces where possible: `common`, `nav`, `status`, `header`, `sidebar`, `torrentList`, `contextMenu`, `addTorrent`, `settings`, `details`, `statusBar`, `notifications`, `errors`, `time`, and `units`.
- Use `$t(...)` in templates or the project composable from `@/composables/useI18n` in scripts when it fits the surrounding code.

## UI And State Guidelines

- Preserve responsive behavior for desktop and mobile. Many workflows have separate mobile affordances, long-press handling, or canvas rendering paths.
- For torrent list changes, check both `TorrentList` and `CanvasList` paths when the behavior should be shared.
- Preserve user settings stored in localStorage/sessionStorage unless a migration is explicitly required.
- For polling or RPC changes, respect the existing `setting.polling` intervals and Transmission session-id retry flow.
- When adding visible text, add i18n keys rather than hard-coded user-facing strings.

## Build And Release Notes

- `pnpm build` runs `vue-tsc -b` before `vite build`.
- Production build output is `dist/`.
- `scripts/build.sh` sets `VITE_BASE_URL=/transmission/web` for release-style builds.
- Release scripts are documented in `scripts/README.md`; avoid changing release behavior without checking those scripts.
- Docker builds the frontend in a Node image, then serves `/app/static` with nginx.

## Working Rules For Agents

- Keep changes narrowly scoped to the requested behavior.
- Read nearby components, stores, and composables before introducing new abstractions.
- Do not rename existing directories such as `SiderbarView.vue/` unless the user explicitly asks; imports and paths may depend on the current spelling.
- Do not rewrite generated declaration files by hand.
- Do not add a test framework or large dependency just to cover a small change unless requested.
- If a command fails because of pre-existing unrelated issues, report the failure and the relevant output instead of broadening the edit.
