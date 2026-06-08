# Frontend Conventions

- The frontend is a React 18 + Vite + Tailwind app under [frontend/src](../frontend/src).
- Keep application-wide state in the existing context providers in [frontend/src/state](../frontend/src/state) instead of introducing unrelated global state.
- The theme system is split between [frontend/src/state/theme.tsx](../frontend/src/state/theme.tsx) and [frontend/src/index.css](../frontend/src/index.css); update both when adding or changing themes.
- Frontend API calls should stay relative and go through [frontend/src/api.ts](../frontend/src/api.ts).
- Preserve the current user flow: locations are added through the form and rendered in the dashboard/sidebar rather than bypassing the existing state layer.
