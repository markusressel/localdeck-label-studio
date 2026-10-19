# Contributing

Bug reports, ideas and pull requests are welcome. This page covers running the project locally and how it
is built; contributor and AI-agent guidelines for the code itself are in [AGENTS.md](AGENTS.md).

## Running locally

Requires [Node.js](https://nodejs.org/) 22 (see `.nvmrc`); the tests need 22.22.2 or newer.

```sh
npm install
npm run dev
```

Then open http://localhost:5184.

If you use [just](https://github.com/casey/just), the same tasks are available as recipes (`just --list`).

## Tasks

| Task | npm | just |
|---|---|---|
| Dev server with hot reload | `npm run dev` | `just dev` |
| Production build (to `dist/`) | `npm run build` | `just build` |
| Preview the production build | `npm run preview` | |
| Lint | `npm run lint` | `just lint` |
| Unit tests | `npm test` | `just test` |
| Coverage report | `npm run test:coverage` | `just coverage` |

Tech stack: Vue 3, Vite, plain JavaScript and CSS, Iconify, Vitest and ESLint.

Project layout:

- `src/composables/useStore.js`: global state, persistence and saved-data migrations
- `src/composables/usePrintCanvas.js`: print sheet interaction (pan, zoom, selection, drag and drop)
- `src/components/`: UI components, including the shared input components
  (`CustomSelect`, `CustomCheckbox`, `ColorPicker`, `NumberStepper`, …)
- `src/utils/`: pure helpers, for example `labelStyle.js`, which resolves per-label overrides against the
  global settings

The build uses relative asset paths (`base: './'`), so `dist/` can be hosted as-is on GitHub Pages or any
static file host.

Run `npm run lint` and `npm test` before committing: Vite builds code with undefined names without
complaint, so only the linter catches them.

## CI and deployment

- `.github/workflows/ci.yml` lints, tests (with coverage) and builds every push to `main` and every pull request.
- `.github/workflows/deploy.yml` runs the checks again and publishes `dist/` to GitHub Pages on every push
  to `main`. It needs **Settings → Pages → Source: GitHub Actions** in the repository.
- Dependabot opens weekly update PRs for npm packages and the workflows' actions.
