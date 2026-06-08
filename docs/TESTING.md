# Testing Conventions

- Backend/API tests use Vitest and Supertest, with coverage centered on the Express routes in [backend/src/routes/locations.test.ts](../backend/src/routes/locations.test.ts).
- Tests that touch the database should use isolated temporary databases and should not rely on shared state.
- Keep DB-heavy test execution serialized when needed; the existing Vitest setup assumes that pattern.
- Prefer behavior-focused endpoint tests over implementation-detail checks.
