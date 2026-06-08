# TypeScript Conventions

- Use `import type` for types and interfaces when the value is not needed at runtime.
- Keep shared request/response shapes in [frontend/src/types.ts](../frontend/src/types.ts) so frontend and backend stay aligned.
- Keep exported surface areas small and typed, especially for context values, router options, and data access helpers.
- Prefer explicit naming for domain objects and payloads instead of one-off inline object shapes when a value crosses file boundaries.
- When changing a contract, update both sides of the boundary together and prefer a narrow follow-up edit over a broad refactor.
