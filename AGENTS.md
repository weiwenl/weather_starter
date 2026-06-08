# Weather Starter Agent Notes

Weather Starter is a monorepo weather app starter with a React/Vite frontend, a Node/Express backend, and Drizzle/SQLite persistence.

Package manager: `npm`.

- Dev server runs through Portless with a stable `.localhost` URL; do not hardcode local ports.
- Frontend requests should stay relative and go through `/api`.

## Commands

- `npm run dev` starts the combined development server.
- `npm run build` builds the frontend and compiles backend TypeScript.
- `npm test` runs Vitest for backend/API tests.
- `npm run doctor` checks health and API wiring.
- `npm run db:generate` and `npm run db:migrate` manage Drizzle migrations.

## Read Next

- [TypeScript conventions](docs/TYPESCRIPT.md)
- [Frontend conventions](docs/FRONTEND.md)
- [Backend conventions](docs/BACKEND.md)
- [Testing conventions](docs/TESTING.md)
- [Python conventions](docs/PYTHON.md)
