# FinCore frontend

Responsive customer and administrator banking dashboards using React, TypeScript, and Vite.

Requires Node.js 22.18+. Run `npm ci`, then `npm run dev`. Open http://localhost:5173. The API proxy defaults to http://localhost:8081; set `API_TARGET` when starting Vite to override it. Read-only demo mode works without an API.

## Commands

- `npm run build`: type-check and build production assets in `dist`.
- `npm run preview`: preview the production build.
- `npm test`: logic and HTTP boundary tests.
- `npm run test:e2e`: Playwright browser flows (install Chromium first).
- `npm run test:guide`: offline architecture guide checks.
- `npm run format:check` / `npm run format`: check/apply Prettier.

Screens live in `src/pages`, reusable UI in `src/components`, asynchronous loading in `src/hooks`, and synthetic fixtures in `src/data`. `api.ts` owns authorization headers, timeouts, and error translation. Sessions are held in memory. Financial requests preserve idempotency keys after uncertain outcomes.

See the root [README](../README.md) for setup and the [architecture guide](../architecture.html) for implementation details.
