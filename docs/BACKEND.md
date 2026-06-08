# Backend Conventions

- Backend code lives under [backend/src](../backend/src) and uses Express + TypeScript + Drizzle ORM.
- Keep route handlers small and close to [backend/src/routes/locations.ts](../backend/src/routes/locations.ts).
- Keep persistence concerns in [backend/src/db.ts](../backend/src/db.ts) and schema definitions in [backend/src/schema.ts](../backend/src/schema.ts).
- Keep the weather provider logic in [backend/src/weather.ts](../backend/src/weather.ts).
- When changing persisted data, update the Drizzle schema and generate migrations instead of editing the SQLite database directly.
- Follow existing API error behavior: return JSON with a `detail` field and use the established HTTP statuses for validation, not-found, and upstream failures.
