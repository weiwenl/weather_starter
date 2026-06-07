# Implementation Plan: Weather Map Card

## Overview

Build a fully frontend interactive map card for the Hero dashboard. All components live under `frontend/src/components/map/`. The implementation uses the already-installed `react-leaflet 4.2.1` / `leaflet 1.9.4` and integrates with `StoreContext` for reactive location data. No backend changes are needed.

The work is structured in six groups: dev setup, utility/hook layer, core map components, overlay/state UI, shell + modal wiring, and Hero integration.

---

## Tasks

- [ ] 1. Install missing dev dependencies and extend environment types
  - [ ] 1.1 Install `@types/leaflet`, `fast-check`, `vitest`, `@testing-library/react`, and `@testing-library/jest-dom` as dev dependencies in `frontend/package.json`
    - Run `npm install --save-dev @types/leaflet@^1.9.14 fast-check@^3.22.0 vitest@^3.2.4 @testing-library/react@^16.3.0 @testing-library/jest-dom@^6.6.3` inside `frontend/`
    - _Requirements: 7.1, 7.2_
  - [ ] 1.2 Extend `frontend/src/vite-env.d.ts` to declare `VITE_TILE_API_KEY`
    - Add `ImportMetaEnv` interface with `readonly VITE_TILE_API_KEY?: string`
    - _Requirements: 7.4_
  - [ ] 1.3 Add a `vitest.config.ts` (or extend `vite.config.ts`) to configure the test environment with `jsdom`, `globals: true`, and a `setupFiles` entry that imports `@testing-library/jest-dom`
    - Create `frontend/vitest.setup.ts` that calls `import '@testing-library/jest-dom'`
    - _Requirements: 7.1, 7.2_

- [ ] 2. Create `map.css` and `mapUtils.ts`
  - [ ] 2.1 Create `frontend/src/components/map/map.css`
    - Import `leaflet/dist/leaflet.css` at the top
    - Add `.map-card-shell` responsive height rules (260 px default, 200 px min-height below 768 px)
    - Add `.map-pin`, `.map-pin--default`, `.map-pin--selected` styles (size, colour, border-radius, z-index, box-shadow)
    - Override `.leaflet-tooltip` for contrast-safe weather label styling (dark background, no arrow)
    - Add `.weather-label`, `.weather-label__temp`, `.weather-label__condition` styles
    - _Requirements: 1.2, 1.5, 2.2, 3.4, 6.2_
  - [ ] 2.2 Create `frontend/src/components/map/mapUtils.ts`
    - Implement `getInitialView(locations: Location[]): { center: L.LatLngExpression; zoom: number; bounds?: L.LatLngBounds }` — single location → zoom 11; multiple → fitBounds centre + zoom 10
    - Implement `getTileUrl(): string` — reads `import.meta.env.VITE_TILE_API_KEY`; returns OSM URL when absent/empty
    - Export `OSM_ATTRIBUTION` constant
    - _Requirements: 1.4, 7.3, 7.4_
  - [ ]* 2.3 Write unit tests for `mapUtils.ts`
    - Test `getInitialView` with a single location returns `zoom: 11`
    - Test `getInitialView` with multiple locations returns a `bounds` object
    - Test `getTileUrl` returns OSM URL when env var is absent
    - _Requirements: 1.4, 7.4_

- [ ] 3. Implement `useMapTileState` hook
  - [ ] 3.1 Create `frontend/src/components/map/useMapTileState.ts`
    - Implement `useMapTileState(): MapTileState` with `loadingState: 'loading' | 'loaded' | 'error'`
    - Start a 10-second `setTimeout` on the first `onTileLoadStart` call; if no tile has loaded when it fires, set state to `'error'`
    - `onTileLoad` increments count, clears timer, sets state to `'loaded'`
    - `onTileError` is a no-op (individual errors don't change state)
    - Clean up timer in `useEffect` return
    - _Requirements: 5.1, 5.2_
  - [ ]* 3.2 Write unit tests for `useMapTileState`
    - Test: timer fires after 10 s with zero tile loads → `loadingState` becomes `'error'` (use fake timers)
    - Test: `onTileLoad` called before timeout → `loadingState` becomes `'loaded'`
    - Test: cleanup unmounts without throwing
    - _Requirements: 5.1, 5.2_

- [ ] 4. Implement `WeatherLabel` component
  - [ ] 4.1 Create `frontend/src/components/map/WeatherLabel.tsx`
    - Render `Math.round(temperature_c) + "°"` or `"--°"` when null
    - Truncate `condition` to 20 chars with `…` suffix if longer; omit entirely when null
    - Apply `weather-label`, `weather-label__temp`, `weather-label__condition` CSS classes
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 4.2 Write property test for `WeatherLabel` (Property 3)
    - **Property 3: Weather label text matches store data**
    - **Validates: Requirements 3.1, 3.2, 3.3**
    - Use `arbLocation()` / `arbWeatherSnapshot()` fast-check arbitraries
    - Assert rendered temp matches `Math.round(temperature_c)+"°"` or `"--°"`
    - Assert condition string is displayed truncated to ≤ 20 chars
    - _Requirements: 3.1, 3.2, 3.3_
  - [ ]* 4.3 Write unit tests for `WeatherLabel`
    - Test null temperature + null condition renders `"--°"` only
    - Test `temperature_c: 24.7` renders `"25°"`
    - Test condition of exactly 20 chars is not truncated
    - Test condition of 21 chars is truncated to 19 + `"…"`
    - _Requirements: 3.1, 3.2, 3.3_

- [ ] 5. Implement `TileLoadTracker` component
  - [ ] 5.1 Create `frontend/src/components/map/TileLoadTracker.tsx`
    - Render-null component that lives inside `MapContainer`
    - Use `useMap()` from react-leaflet to access the Leaflet map instance
    - Attach `map.on('tileloadstart', …)`, `map.on('tileload', …)`, `map.on('tileerror', …)` in `useEffect`
    - Detach all listeners on cleanup
    - Forward events to `onTileLoadStart`, `onTileLoad`, `onTileError` props from `useMapTileState`
    - _Requirements: 5.1, 5.2_

- [ ] 6. Implement `LocationMarker` component
  - [ ] 6.1 Create `frontend/src/components/map/LocationMarker.tsx`
    - Define `DEFAULT_ICON` and `SELECTED_ICON` as `L.divIcon` instances with `.map-pin--default` / `.map-pin--selected` HTML, correct `iconSize`, `iconAnchor`, `tooltipAnchor`
    - Render a react-leaflet `Marker` at `[location.latitude, location.longitude]`
    - Swap icon based on `isSelected`; set `zIndexOffset={isSelected ? 200 : 0}`
    - Wire `eventHandlers={{ click: () => onPinClick(location.id) }}`
    - Render a permanent `<Tooltip direction="top">` containing `<WeatherLabel weather={location.weather} />`
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.5_
  - [ ]* 6.2 Write unit tests for `LocationMarker`
    - Test selected marker has `SELECTED_ICON` and correct z-index offset
    - Test click handler fires `onPinClick` with the correct location id
    - _Requirements: 2.2, 2.3_

- [ ] 7. Implement `LeafletMapView` component
  - [ ] 7.1 Create `frontend/src/components/map/LeafletMapView.tsx`
    - Accept `LeafletMapViewProps` (locations, selectedId, onPinClick, mapRef?, variant, initialCenter?, initialZoom?)
    - Call `getInitialView(locations)` to derive `center`, `zoom`, and optional `bounds`
    - When `initialCenter`/`initialZoom` are provided (fullscreen case) they take precedence over computed values
    - Render `<MapContainer>` with computed bounds or center+zoom; set `className` based on `variant` (`h-full w-full` for both)
    - Render `<TileLayer url={getTileUrl()} attribution={OSM_ATTRIBUTION} />`
    - Render `<TileLoadTracker>` wired to `useMapTileState()`
    - Render one `<LocationMarker>` per location
    - Include a `MapRefCapture` child component that calls `useMap()` and assigns to `mapRef.current`
    - Expose `loadingState` from `useMapTileState` via a render prop or by rendering `MapLoadingOverlay` and `MapErrorOverlay` inside the view
    - _Requirements: 1.4, 1.6, 2.1, 2.4, 5.1, 5.2, 5.3, 7.2, 7.3_
  - [ ]* 7.2 Write property test for `LeafletMapView` — pin count (Property 1)
    - **Property 1: Pin count equals locations count**
    - **Validates: Requirements 2.1, 2.4**
    - Use `fc.array(arbLocation(), { minLength: 1, maxLength: 20 })`
    - Assert `container.querySelectorAll('.map-pin').length === locations.length`
    - _Requirements: 2.1, 2.4_
  - [ ]* 7.3 Write property test for `LeafletMapView` — selected pin distinction (Property 2)
    - **Property 2: Selected pin is visually distinct from all others**
    - **Validates: Requirements 2.2**
    - Chain arbitrary to pick a valid `selectedId` from generated locations
    - Assert exactly one `.map-pin--selected` and `locations.length - 1` `.map-pin--default` elements
    - _Requirements: 2.2_

- [ ] 8. Implement overlay and button components
  - [ ] 8.1 Create `frontend/src/components/map/MapLoadingOverlay.tsx`
    - Accept `{ visible: boolean }` prop; render `null` when `!visible`
    - Absolutely positioned overlay covering the map area
    - Animated skeleton shimmer matching the tile shell style
    - Set `role="status"` and `aria-label="Loading map"`
    - _Requirements: 5.1_
  - [ ] 8.2 Create `frontend/src/components/map/MapErrorOverlay.tsx`
    - Accept `{ visible: boolean }` prop; render `null` when `!visible`
    - Absolutely positioned overlay with solid dark fallback background
    - Display "Map tiles unavailable" message
    - Set `role="alert"` for immediate screen reader announcement
    - _Requirements: 5.2, 5.3_
  - [ ] 8.3 Create `frontend/src/components/map/ExpandButton.tsx`
    - Accept `{ onClick: () => void }` prop
    - Render an absolutely-positioned `<button type="button" aria-label="Expand map">` in top-right corner (`absolute top-2 right-2 z-[1000]`)
    - Style with frosted glass treatment matching the design spec
    - Include an expand SVG icon
    - _Requirements: 4.1_

- [ ] 9. Implement `FullscreenMapModal` component
  - [ ] 9.1 Create `frontend/src/components/map/FullscreenMapModal.tsx`
    - Accept `FullscreenMapModalProps` (initialCenter, initialZoom, onClose)
    - Use `ReactDOM.createPortal(content, document.body)` to escape stacking contexts
    - Render a `role="dialog" aria-modal="true" aria-label="Fullscreen map"` wrapper with `fixed inset-0 z-[9999]`
    - Render `<LeafletMapView variant="fullscreen" initialCenter={…} initialZoom={…}>` reading `locations` and `selectedId` from `useStore()`
    - On pin click: call `select(id)` then `onClose()`
    - Attach `document.addEventListener('keydown', …)` in `useEffect` to call `onClose()` on Escape key; clean up on unmount
    - Render a `<button aria-label="Close map">` with `×` / close icon
    - Implement focus trap: focus the close button on mount; restore focus to expand button on close
    - _Requirements: 4.2, 4.3, 4.4, 4.5, 4.6, 6.3_
  - [ ]* 9.2 Write unit tests for `FullscreenMapModal`
    - Test Escape keydown calls `onClose`
    - Test close button click calls `onClose`
    - Test pin click calls `select` and `onClose`
    - Test `role="dialog"` and `aria-modal="true"` are present
    - _Requirements: 4.4, 4.5, 4.6_

- [ ] 10. Implement `MapCard` and `MapEmptyState`
  - [ ] 10.1 Create `frontend/src/components/map/MapCard.tsx`
    - Import `map.css` at the top of this file
    - Render the frosted-glass section shell: `rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl` with `map-card-shell` class
    - Read `locations`, `selectedId`, and `select` from `useStore()`
    - Show `<MapEmptyState />` (inline) when `locations.length === 0`
    - Show `<LeafletMapView variant="card" mapRef={mapRef} …>` when locations exist
    - Hold a `mapRef = useRef<L.Map | null>(null)` to capture centre+zoom on expand
    - Hold `isFullscreenOpen`, `capturedCenter`, `capturedZoom` state
    - Implement `openFullscreen()`: read from `mapRef.current`, set captured values, set `isFullscreenOpen = true`
    - Render `<ExpandButton>` when locations exist; render `<FullscreenMapModal>` when `isFullscreenOpen`
    - Wrap section in `<section aria-label="Locations map">`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 4.1, 4.2, 6.1, 6.2_
  - [ ]* 10.2 Write property test for `MapCard` + expand — centre/zoom capture (Property 4)
    - **Property 4: Fullscreen modal inherits card's centre and zoom**
    - **Validates: Requirements 4.2**
    - Mock `mapRef.current` with `{ getCenter: () => center, getZoom: () => zoom }` using `arbLatLng()` and `fc.integer({ min: 1, max: 18 })`
    - Assert captured values passed to `FullscreenMapModal` match the mock
    - _Requirements: 4.2_
  - [ ]* 10.3 Write integration tests for `MapCard`
    - Mount `MapCard` inside `StoreProvider` with mocked locations; assert pins render
    - Click a pin; assert `selectedId` updates in store
    - Simulate adding a location; assert a new pin appears without reload
    - Simulate tile-error timeout; assert error overlay appears and `TileGrid` is still in DOM
    - _Requirements: 1.3, 1.6, 2.3, 2.4, 5.2_

- [ ] 11. Checkpoint — verify component tree compiles and tests pass
  - Run `tsc --noEmit` in `frontend/` to confirm no TypeScript errors across all new files
  - Run `vitest --run` to confirm all unit and property tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Integrate `MapCard` into `Hero.tsx`
  - [ ] 12.1 Add `import { MapCard } from './map/MapCard'` to `frontend/src/components/Hero.tsx`
    - Place `<MapCard />` after `<TileGrid weather={selected.weather} />` and before the `<footer>`
    - No props are needed — `MapCard` reads `locations` directly from the store
    - _Requirements: 1.1_

- [ ] 13. Final checkpoint — end-to-end verification
  - Run `tsc --noEmit` in `frontend/` to confirm zero errors after Hero integration
  - Run `vitest --run` to confirm the full test suite passes
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Each task references specific requirements for traceability
- Properties 1–4 from the design's "Correctness Properties" section are each covered by a dedicated PBT sub-task
- Unit tests and PBT are complementary — unit tests cover named examples; PBT covers the full input space
- `map.css` is imported only in `MapCard.tsx` to keep Leaflet styles scoped to the map feature
- `@types/leaflet` and `fast-check` must be installed (Task 1.1) before implementing any other task
- The Leaflet `MapContainer` must not be re-mounted on location changes — use `locations` as a reactive prop to `LeafletMapView`

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "2.2", "3.1"] },
    { "id": 2, "tasks": ["2.3", "3.2", "4.1", "5.1"] },
    { "id": 3, "tasks": ["4.2", "4.3", "6.1"] },
    { "id": 4, "tasks": ["6.2", "7.1"] },
    { "id": 5, "tasks": ["7.2", "7.3", "8.1", "8.2", "8.3"] },
    { "id": 6, "tasks": ["9.1"] },
    { "id": 7, "tasks": ["9.2", "10.1"] },
    { "id": 8, "tasks": ["10.2", "10.3"] },
    { "id": 9, "tasks": ["12.1"] }
  ]
}
```
