# Design Document: Weather Map Card

## Overview

The Weather Map Card adds an interactive map tile to the Hero dashboard, positioned after the existing TileGrid. Every saved location is rendered as a clickable pin with a permanent weather label (temperature + condition). The card can expand to a fullscreen overlay that inherits the current viewport centre and zoom, giving users a deeper view of their saved locations without leaving the dashboard.

The implementation is 100% frontend — no backend changes required. It uses the already-installed `react-leaflet 4.2.1` / `leaflet 1.9.4` packages and integrates with the existing `StoreContext` for reactive data.

---

## Architecture

### Component Tree

```
Hero
└── <main>
    └── .mx-auto.max-w-5xl (flex-col gap-3)
        ├── <header> (existing)
        ├── HourlyStrip (existing)
        ├── TenDayForecast (existing)
        ├── TileGrid (existing)
        ├── MapCard              ← NEW (card shell + in-card map)
        │   ├── MapEmptyState    ← shown when locations === []
        │   └── LeafletMapView   ← shown when locations.length > 0
        │       ├── MapContainer (react-leaflet)
        │       │   ├── TileLayer
        │       │   ├── TileLoadTracker  (event listener effect)
        │       │   └── LocationMarker × N
        │       │       └── Tooltip permanent (WeatherLabel)
        │       ├── MapLoadingOverlay   ← skeleton while tiles load
        │       ├── MapErrorOverlay     ← shown after 10 s all-fail
        │       └── ExpandButton        ← top-right corner
        └── FullscreenMapModal   ← NEW (React portal to document.body)
            └── LeafletMapView   ← same component, fullscreen mode
                ├── MapContainer
                │   ├── TileLayer
                │   ├── TileLoadTracker
                │   └── LocationMarker × N
                └── CloseButton
```

### Data Flow

```
StoreContext (locations, selectedId, select)
      │
      ├──► MapCard
      │       reads: locations, selectedId
      │       writes: select(id)  (via pin click)
      │
      └──► FullscreenMapModal
              reads: locations, selectedId
              writes: select(id) + closes modal (via pin click)
```

Map centre and zoom level are captured at expand-time via a `useRef` pointing to the Leaflet map instance and passed as initial-view props to the fullscreen modal. Neither the card nor the modal mutates the store beyond `select`.

---

## File Layout

```
frontend/src/components/
  map/
    MapCard.tsx              — outer tile shell + empty/loading/error states
    LeafletMapView.tsx       — reusable MapContainer composition
    LocationMarker.tsx       — single marker + tooltip
    WeatherLabel.tsx         — tooltip content (temp + condition text)
    TileLoadTracker.tsx      — tracks tileload / tileerror events
    MapLoadingOverlay.tsx    — skeleton/spinner shown while loading
    MapErrorOverlay.tsx      — error message when all tiles fail
    ExpandButton.tsx         — expand icon button (top-right)
    FullscreenMapModal.tsx   — React portal modal
    useMapTileState.ts       — hook: loading/error/timeout logic
    mapUtils.ts              — fitBounds helper, tile URL builder
    map.css                  — Leaflet CSS import + override styles
```

---

## Components and Interfaces

See detailed component specifications below.

---

## Data Models

### `LeafletMapViewProps`

```typescript
interface LeafletMapViewProps {
  locations: Location[];
  selectedId: number | null;
  onPinClick: (id: number) => void;
  mapRef?: React.MutableRefObject<L.Map | null>;
  variant: 'card' | 'fullscreen';
  initialCenter?: L.LatLngExpression;
  initialZoom?: number;
}
```

### `LocationMarkerProps`

```typescript
interface LocationMarkerProps {
  location: Location;
  isSelected: boolean;
  onPinClick: (id: number) => void;
}
```

### `FullscreenMapModalProps`

```typescript
interface FullscreenMapModalProps {
  initialCenter: L.LatLngExpression;
  initialZoom: number;
  onClose: () => void;
}
```

### `MapTileState`

```typescript
type TileLoadingState = 'loading' | 'loaded' | 'error';

interface MapTileState {
  loadingState: TileLoadingState;
  onTileLoadStart: () => void;
  onTileLoad: () => void;
  onTileError: () => void;
}
```

### `InitialMapView`

```typescript
interface InitialMapView {
  center: L.LatLngExpression;
  zoom: number;
  bounds?: L.LatLngBounds;
}
```

---

## Error Handling

### Tile Load Timeout

**Condition**: All tile requests for the visible map bounds return errors or receive no response within 10 seconds of the first `tileloadstart` event.

**Response**: `useMapTileState` transitions `loadingState` to `'error'`. `MapErrorOverlay` mounts with `role="alert"` and displays "Map tiles unavailable". The `MapLoadingOverlay` is hidden.

**Recovery**: Location pins and weather labels remain rendered over a solid dark fallback background. The rest of the dashboard (`TileGrid`, `HourlyStrip`, `TenDayForecast`) is unaffected since they are siblings of `MapCard` in the layout, not children.

### Individual Tile Errors

**Condition**: Some (but not all) tile requests fail (network hiccup, 404 for a specific tile).

**Response**: Individual `tileerror` events do not immediately change state. The 10-second timer governs the "all-fail" condition — if at least one tile loads successfully the state transitions to `'loaded'` and the timer is cancelled.

**Recovery**: Leaflet renders partial tiles; the map remains interactive.

### Missing Environment Variable

**Condition**: `VITE_TILE_API_KEY` is absent or empty at build time.

**Response**: `getTileUrl()` returns the public OpenStreetMap tile URL. No error is raised — the map renders normally using OSM tiles.

### Empty Locations Array

**Condition**: `locations` in the store is `[]` (no saved locations).

**Response**: `MapCard` renders `MapEmptyState` instead of `LeafletMapView`. No Leaflet instance is created. The expand button is not rendered.

**Recovery**: When the first location is added to the store, React re-renders `MapCard` which mounts `LeafletMapView` reactively.

---

## Correctness Properties

### Property 1: Pin count equals locations count

**Validates: Requirements 2.1, 2.4**

For any non-empty `Location[]`, the number of markers rendered equals `locations.length`.

```typescript
fc.assert(
  fc.property(
    fc.array(arbLocation(), { minLength: 1, maxLength: 20 }),
    (locations) => {
      const { container } = render(
        <LeafletMapView locations={locations} selectedId={null}
          onPinClick={() => {}} variant="card" />
      );
      return container.querySelectorAll('.map-pin').length === locations.length;
    }
  )
);
```

### Property 2: Selected pin is visually distinct from all others

**Validates: Requirements 2.2**

For any locations array and any `selectedId` within it, exactly one element has class `map-pin--selected` and `locations.length - 1` have `map-pin--default`.

```typescript
fc.assert(
  fc.property(
    fc.array(arbLocation(), { minLength: 1, maxLength: 20 }).chain((locs) =>
      fc.record({
        locations: fc.constant(locs),
        selectedId: fc.constantFrom(...locs.map((l) => l.id)),
      })
    ),
    ({ locations, selectedId }) => {
      const { container } = render(
        <LeafletMapView locations={locations} selectedId={selectedId}
          onPinClick={() => {}} variant="card" />
      );
      return (
        container.querySelectorAll('.map-pin--selected').length === 1 &&
        container.querySelectorAll('.map-pin--default').length === locations.length - 1
      );
    }
  )
);
```

### Property 3: Weather label text matches store data

**Validates: Requirements 3.1, 3.2, 3.3**

For any `WeatherSnapshot`, the label shows `Math.round(temperature_c) + "°"` or `"--°"` when null, and a condition string truncated to ≤ 20 chars.

```typescript
fc.assert(
  fc.property(arbWeatherSnapshot(), (weather) => {
    const { getByText } = render(<WeatherLabel weather={weather} />);
    const expectedTemp =
      weather.temperature_c !== null
        ? `${Math.round(weather.temperature_c)}°`
        : '--°';
    expect(getByText(expectedTemp)).toBeInTheDocument();
    if (weather.condition !== null) {
      const raw = weather.condition;
      const displayed = raw.length > 20 ? raw.slice(0, 19) + '…' : raw;
      expect(getByText(displayed)).toBeInTheDocument();
    }
  })
);
```

### Property 4: Fullscreen modal inherits card's centre and zoom

**Validates: Requirements 4.2**

For any lat/lng centre and zoom level, the values captured from `mapRef` at expand-time equal the `initialCenter` and `initialZoom` passed to `FullscreenMapModal`.

```typescript
fc.assert(
  fc.property(arbLatLng(), fc.integer({ min: 1, max: 18 }), (center, zoom) => {
    const fakeMap = { getCenter: () => center, getZoom: () => zoom } as unknown as L.Map;
    const mapRef = { current: fakeMap };
    const { result } = renderHook(() => useExpandMap(mapRef));
    act(() => result.current.openFullscreen());
    expect(result.current.capturedCenter).toEqual(center);
    expect(result.current.capturedZoom).toBe(zoom);
  })
);
```

---

## Component Specifications

### `MapCard`

**File**: `frontend/src/components/map/MapCard.tsx`

**Responsibilities**
- Renders the frosted-glass tile shell (matching `TileShell` visual style)
- Reads `locations` and `selectedId` from `useStore()`
- Shows `MapEmptyState` when `locations` is empty
- Shows `LeafletMapView` (card variant) when locations exist
- Manages `isFullscreenOpen` boolean state
- Holds a `mapRef` (`MutableRefObject<LeafletMap | null>`) to capture current centre + zoom on expand

**Props interface**
```typescript
// No external props — reads directly from StoreContext
export function MapCard(): JSX.Element
```

**Rendered structure**
```typescript
<section
  aria-label="Locations map"
  className="relative overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl"
  style={{ height: 260 }}   // default; min-height 200px below 768px via CSS
>
  {locations.length === 0
    ? <MapEmptyState />
    : <LeafletMapView
        locations={locations}
        selectedId={selectedId}
        onPinClick={(id) => select(id)}
        mapRef={mapRef}
        variant="card"
      />
  }
  {locations.length > 0 && (
    <ExpandButton onClick={openFullscreen} />
  )}
</section>

{isFullscreenOpen && (
  <FullscreenMapModal
    initialCenter={capturedCenter}
    initialZoom={capturedZoom}
    onClose={closeFullscreen}
  />
)}
```

---

### `LeafletMapView`

**File**: `frontend/src/components/map/LeafletMapView.tsx`

**Responsibilities**
- Owns the `MapContainer` instance
- Computes initial bounds / centre from `locations` via `mapUtils.fitBounds`
- Renders one `LocationMarker` per location
- Renders `TileLayer` with OSM or API-key tile URL
- Renders `TileLoadTracker` as a child effect component
- Exposes the Leaflet map instance via `mapRef` callback

**Props interface**
```typescript
interface LeafletMapViewProps {
  locations: Location[];
  selectedId: number | null;
  onPinClick: (id: number) => void;
  /** Filled by MapCard to capture centre+zoom on expand */
  mapRef?: React.MutableRefObject<L.Map | null>;
  /** 'card' constrains height via parent; 'fullscreen' fills 100vw × 100vh */
  variant: 'card' | 'fullscreen';
  initialCenter?: L.LatLngExpression;
  initialZoom?: number;
}
```

**Map initialisation logic**
```typescript
// mapUtils.ts
export function getInitialView(locations: Location[]): {
  center: L.LatLngExpression;
  zoom: number;
  bounds?: L.LatLngBounds;
} {
  if (locations.length === 1) {
    return {
      center: [locations[0].latitude, locations[0].longitude],
      zoom: 11,  // ~10-12 km radius
    };
  }
  const bounds = L.latLngBounds(
    locations.map((l) => [l.latitude, l.longitude])
  );
  return { center: bounds.getCenter(), zoom: 10, bounds };
}
```

When `bounds` is returned, `MapContainer` uses `bounds` prop instead of `center`+`zoom` so react-leaflet fits all pins. When `initialCenter`/`initialZoom` props are supplied (fullscreen case) they take precedence.

**Tile URL**
```typescript
// mapUtils.ts
export function getTileUrl(): string {
  const key = import.meta.env.VITE_TILE_API_KEY;
  return key
    ? `https://tile.openstreetmap.org/{z}/{x}/{y}.png`  // swap for keyed provider
    : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
}

export const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
```

The `TileLayer` always receives `attribution={OSM_ATTRIBUTION}` (bottom-right by default in Leaflet).

---

### `LocationMarker`

**File**: `frontend/src/components/map/LocationMarker.tsx`

**Responsibilities**
- Renders a `Marker` at `location.latitude / longitude`
- Uses a custom `DivIcon` so the pin appearance is CSS-controlled
- Applies selected vs default icon based on `isSelected`
- Clicking fires `onPinClick(location.id)`
- Renders a permanent `Tooltip` containing `<WeatherLabel />`

**Props interface**
```typescript
interface LocationMarkerProps {
  location: Location;
  isSelected: boolean;
  onPinClick: (id: number) => void;
}
```

**Custom icon approach**

Leaflet's `L.divIcon` renders arbitrary HTML. Two icon instances are created once outside the component (stable references) and swapped via the `icon` prop:

```typescript
const DEFAULT_ICON = L.divIcon({
  className: '',   // suppress leaflet-div-icon default styles
  html: `<span class="map-pin map-pin--default"></span>`,
  iconSize: [20, 20],
  iconAnchor: [10, 20],
  tooltipAnchor: [0, -22],
});

const SELECTED_ICON = L.divIcon({
  className: '',
  html: `<span class="map-pin map-pin--selected"></span>`,
  iconSize: [30, 30],   // 1.5× default
  iconAnchor: [15, 30],
  tooltipAnchor: [0, -32],
});
```

CSS in `map.css`:
```css
.map-pin {
  display: block;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  border: 2px solid rgba(255,255,255,0.9);
}
.map-pin--default {
  width: 20px; height: 20px;
  background: #3b82f6;   /* blue-500 */
  z-index: 400;
}
.map-pin--selected {
  width: 30px; height: 30px;
  background: #f59e0b;   /* amber-500 — visually distinct colour */
  z-index: 600;          /* elevated above default pins */
  box-shadow: 0 0 0 4px rgba(245,158,11,0.35);
}
```

This satisfies Requirement 2.2: selected pin differs in size (1.5×), fill colour, and stacking order — all three observable ways.

**Rendered JSX**
```typescript
<Marker
  position={[location.latitude, location.longitude]}
  icon={isSelected ? SELECTED_ICON : DEFAULT_ICON}
  zIndexOffset={isSelected ? 200 : 0}
  eventHandlers={{ click: () => onPinClick(location.id) }}
>
  <Tooltip permanent direction="top" offset={[0, -4]}>
    <WeatherLabel weather={location.weather} />
  </Tooltip>
</Marker>
```

---

### `WeatherLabel`

**File**: `frontend/src/components/map/WeatherLabel.tsx`

**Responsibilities**
- Renders temperature and condition text inside a Leaflet Tooltip
- Handles null temperature (`"--°"`) and null condition
- Truncates condition to 20 chars with ellipsis

**Props interface**
```typescript
interface WeatherLabelProps {
  weather: WeatherSnapshot;
}
```

**Implementation**
```typescript
function truncate(s: string, max = 20): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function WeatherLabel({ weather }: WeatherLabelProps) {
  const temp =
    weather.temperature_c !== null
      ? `${Math.round(weather.temperature_c)}°`
      : '--°';

  const condition =
    weather.condition !== null ? truncate(weather.condition) : null;

  return (
    <div className="weather-label">
      <span className="weather-label__temp">{temp}</span>
      {condition && (
        <span className="weather-label__condition">{condition}</span>
      )}
    </div>
  );
}
```

**Contrast-safe styling** — the tooltip uses a near-opaque dark background. Leaflet's `.leaflet-tooltip` class is overridden in `map.css`:

```css
.leaflet-tooltip {
  background: rgba(15, 15, 20, 0.88);
  border: none;
  border-radius: 6px;
  padding: 3px 7px;
  box-shadow: 0 2px 6px rgba(0,0,0,0.5);
}
.leaflet-tooltip::before { display: none; }  /* remove arrow */

.weather-label { display: flex; flex-direction: column; align-items: center; gap: 1px; }
.weather-label__temp {
  font-size: 12px; font-weight: 600;
  color: #ffffff;  /* white on #0f0f14 → contrast > 16:1 ✓ WCAG AA */
}
.weather-label__condition {
  font-size: 10px;
  color: rgba(255,255,255,0.85);  /* still > 7:1 ✓ */
}
```

White (`#ffffff`) on `rgba(15,15,20,0.88)` has a contrast ratio of approximately **16.5:1**, well above the WCAG 2.1 AA minimum of 4.5:1.

---

### `TileLoadTracker`

**File**: `frontend/src/components/map/TileLoadTracker.tsx`

**Responsibilities**
- Subscribes to Leaflet tile events on the active `TileLayer`
- Reports load/error counts up to the parent via `useMapTileState`
- Is a render-null component (no DOM output)

**Approach**

`react-leaflet` v4 exposes the map via `useMap()`. The `TileLayer` Leaflet instance is obtained via a `ref` callback on `<TileLayer>`. Tile events are attached with `layer.on(...)` in a `useEffect`.

```typescript
// TileLoadTracker is used inside MapContainer alongside TileLayer
export function TileLoadTracker({
  onTileLoad,
  onTileError,
  onTileLoadStart,
}: TileLoadTrackerProps) {
  const map = useMap();

  useEffect(() => {
    const handleLoad = () => onTileLoad();
    const handleError = () => onTileError();
    const handleStart = () => onTileLoadStart();

    map.on('tileload', handleLoad);
    map.on('tileerror', handleError);
    map.on('tileloadstart', handleStart);

    return () => {
      map.off('tileload', handleLoad);
      map.off('tileerror', handleError);
      map.off('tileloadstart', handleStart);
    };
  }, [map, onTileLoad, onTileError, onTileLoadStart]);

  return null;
}
```

---

### `useMapTileState`

**File**: `frontend/src/components/map/useMapTileState.ts`

**Responsibilities**
- Tracks `loadingState`: `'loading' | 'loaded' | 'error'`
- Starts a 10-second timeout on the first `tileloadstart` event
- If any tile loads successfully before timeout → clears timeout, sets `'loaded'`
- If timeout fires and zero tiles loaded → sets `'error'`

**Interface**
```typescript
interface MapTileState {
  loadingState: 'loading' | 'loaded' | 'error';
  onTileLoadStart: () => void;
  onTileLoad: () => void;
  onTileError: () => void;
}

export function useMapTileState(): MapTileState
```

**Logic**
```typescript
export function useMapTileState(): MapTileState {
  const [loadingState, setLoadingState] = useState<'loading' | 'loaded' | 'error'>('loading');
  const loadedCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const onTileLoadStart = useCallback(() => {
    if (timerRef.current === null) {
      timerRef.current = setTimeout(() => {
        if (loadedCountRef.current === 0) {
          setLoadingState('error');
        }
      }, 10_000);
    }
  }, []);

  const onTileLoad = useCallback(() => {
    loadedCountRef.current += 1;
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setLoadingState('loaded');
  }, []);

  const onTileError = useCallback(() => {
    // Individual tile errors don't immediately trigger error state;
    // the 10-second timer handles the "all fail" case.
  }, []);

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  return { loadingState, onTileLoadStart, onTileLoad, onTileError };
}
```

---

### `MapLoadingOverlay`

**File**: `frontend/src/components/map/MapLoadingOverlay.tsx`

Renders as an absolutely positioned overlay on top of `LeafletMapView` while `loadingState === 'loading'`. Contains an animated skeleton shimmer matching the tile shell style. Does not block pin rendering — pins appear on load regardless.

```typescript
// Props
interface MapLoadingOverlayProps { visible: boolean }
```

---

### `MapErrorOverlay`

**File**: `frontend/src/components/map/MapErrorOverlay.tsx`

Renders when `loadingState === 'error'`. Shows a user-friendly message ("Map tiles unavailable") over a solid dark fallback background. The `LocationMarker` components remain mounted so pins and weather labels are still visible. Other dashboard components (`TileGrid`, `HourlyStrip`, `TenDayForecast`) are unaffected — they live outside `MapCard`.

```typescript
interface MapErrorOverlayProps { visible: boolean }
```

---

### `ExpandButton`

**File**: `frontend/src/components/map/ExpandButton.tsx`

**Props**
```typescript
interface ExpandButtonProps { onClick: () => void }
```

Renders in the top-right corner of the card (absolutely positioned):
```typescript
<button
  type="button"
  aria-label="Expand map"
  onClick={onClick}
  className="absolute top-2 right-2 z-[1000] rounded-lg border border-white/20
             bg-black/40 p-1.5 text-white backdrop-blur-sm
             hover:bg-black/60 focus-visible:outline focus-visible:outline-2
             focus-visible:outline-white/70"
>
  <ExpandIcon className="h-4 w-4" />
</button>
```

---

### `FullscreenMapModal`

**File**: `frontend/src/components/map/FullscreenMapModal.tsx`

**Responsibilities**
- Rendered via `ReactDOM.createPortal(…, document.body)` so it escapes all stacking contexts
- Covers 100vw × 100vh with a semi-transparent backdrop
- Receives `initialCenter` and `initialZoom` from `MapCard` (captured from `mapRef` at expand time)
- Renders `LeafletMapView` in `variant="fullscreen"` mode
- On pin click: calls `select(id)` then calls `onClose()`
- Listens for `keydown` Escape to call `onClose()`
- Renders a `CloseButton` with `aria-label="Close map"`

**Props interface**
```typescript
interface FullscreenMapModalProps {
  initialCenter: L.LatLngExpression;
  initialZoom: number;
  onClose: () => void;
}
```

**Portal pattern**
```typescript
export function FullscreenMapModal(props: FullscreenMapModalProps) {
  const { select } = useStore();
  const { locations, selectedId } = useStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') props.onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [props.onClose]);

  const content = (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Fullscreen map"
      className="fixed inset-0 z-[9999] flex flex-col bg-black/80"
    >
      <div className="relative flex-1">
        <LeafletMapView
          locations={locations}
          selectedId={selectedId}
          onPinClick={(id) => { select(id); props.onClose(); }}
          variant="fullscreen"
          initialCenter={props.initialCenter}
          initialZoom={props.initialZoom}
        />
        <CloseButton onClick={props.onClose} />
      </div>
    </div>
  );

  return ReactDOM.createPortal(content, document.body);
}
```

**Capturing centre + zoom on expand (in `MapCard`)**
```typescript
const mapRef = useRef<L.Map | null>(null);

function openFullscreen() {
  if (mapRef.current) {
    setCapturedCenter(mapRef.current.getCenter());
    setCapturedZoom(mapRef.current.getZoom());
  }
  setIsFullscreenOpen(true);
}
```

`LeafletMapView` wires `mapRef` via `useMapEvents`:
```typescript
// inside LeafletMapView, as a child component of MapContainer:
function MapRefCapture({ mapRef }: { mapRef?: React.MutableRefObject<L.Map | null> }) {
  const map = useMap();
  useEffect(() => {
    if (mapRef) mapRef.current = map;
  }, [map, mapRef]);
  return null;
}
```

---

### `MapEmptyState`

Inline in `MapCard.tsx`. Renders centred placeholder text:

```typescript
<div className="flex h-full items-center justify-center">
  <p className="text-sm text-white/55">Add a location to see it on the map.</p>
</div>
```

---

## Reactive Pin Updates

Because `locations` comes from `useStore()` which is backed by React state, any call to `create()` or `remove()` in the store triggers a re-render of `MapCard` → `LeafletMapView` → the `LocationMarker` array. React-leaflet handles adding/removing `Marker` components declaratively — no page reload needed (Requirement 2.4).

---

## Integration Point in Hero.tsx

Minimal diff — add one import and one JSX line after `<TileGrid />`:

```diff
+import { MapCard } from './map/MapCard';

 export function Hero() {
   ...
   return (
     <main className="flex-1 overflow-y-auto">
       <div className="mx-auto flex max-w-5xl flex-col gap-3 p-6 lg:p-8">
         <header>...</header>
         <HourlyStrip periods={selected.weather?.forecast_periods} />
         <TenDayForecast weather={selected.weather} />
         <TileGrid weather={selected.weather} />
+        <MapCard />
         <footer>...</footer>
       </div>
     </main>
   );
 }
```

Note: `MapCard` reads `locations` from the store directly, so it does not need a `weather` prop — it renders for all saved locations, not just the selected one.

---

## Environment Variable

`VITE_TILE_API_KEY` is read via `import.meta.env.VITE_TILE_API_KEY`. When absent/empty the `getTileUrl()` helper returns the standard OpenStreetMap URL (no key required). The env var must be declared in `vite-env.d.ts` to satisfy TypeScript:

```typescript
// frontend/src/vite-env.d.ts (addition)
interface ImportMetaEnv {
  readonly VITE_TILE_API_KEY?: string;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

---

## Leaflet CSS Import

Leaflet requires its own CSS file. It is imported once in `map.css` (which is imported by `MapCard.tsx`):

```css
@import 'leaflet/dist/leaflet.css';
```

This avoids polluting `index.css` and keeps the Leaflet styles scoped to the map feature.

---

## Responsive Layout

```css
/* map.css */
.map-card-shell {
  height: 260px;
}

@media (max-width: 767px) {
  .map-card-shell {
    min-height: 200px;
    height: 200px;
  }
}
```

The fullscreen modal uses `fixed inset-0` (Tailwind) which is equivalent to `width: 100vw; height: 100vh` regardless of viewport.

---

## Correctness Properties for Property-Based Testing

The following properties are defined for PBT using `fast-check` (already a common choice in TS ecosystems). They test invariants that hold for *any* valid input drawn from the `Location[]` domain.

### Property 1 — Pin count equals locations count

**Invariant**: For any non-empty array of locations, the number of `Marker` elements rendered in the map equals `locations.length`.

```typescript
// fast-check property
fc.assert(
  fc.property(
    fc.array(arbLocation(), { minLength: 1, maxLength: 20 }),
    (locations) => {
      const { getAllByRole } = render(
        <LeafletMapView
          locations={locations}
          selectedId={null}
          onPinClick={() => {}}
          variant="card"
        />
      );
      // Each marker gets role="button" from the DivIcon
      const pins = getAllByRole('button').filter(
        (el) => el.getAttribute('aria-label')?.startsWith('Location pin')
      );
      return pins.length === locations.length;
    }
  )
);
```

**Why this matters**: Guards against off-by-one errors in the marker rendering loop and ensures removed locations drop their pins.

### Property 2 — Selected pin is visually distinct from all others

**Invariant**: For any locations array and any valid `selectedId` within that array, exactly one marker element has the `map-pin--selected` CSS class and all others have `map-pin--default`.

```typescript
fc.assert(
  fc.property(
    fc.array(arbLocation(), { minLength: 1, maxLength: 20 }).chain((locs) =>
      fc.record({
        locations: fc.constant(locs),
        selectedId: fc.constantFrom(...locs.map((l) => l.id)),
      })
    ),
    ({ locations, selectedId }) => {
      const { container } = render(
        <LeafletMapView
          locations={locations}
          selectedId={selectedId}
          onPinClick={() => {}}
          variant="card"
        />
      );
      const selected = container.querySelectorAll('.map-pin--selected');
      const defaults = container.querySelectorAll('.map-pin--default');
      return (
        selected.length === 1 &&
        defaults.length === locations.length - 1
      );
    }
  )
);
```

**Why this matters**: Ensures the selected/default styling invariant holds regardless of which location is selected and how many locations exist.

### Property 3 — Weather label text matches store data

**Invariant**: For any location with a non-null `temperature_c`, the rendered weather label text contains `Math.round(temperature_c) + "°"`. For null temperature it contains `"--°"`. For any non-null condition truncated to ≤20 chars, the label contains that truncated string.

```typescript
fc.assert(
  fc.property(
    arbLocation(),
    (location) => {
      const { getByText, queryByText } = render(
        <WeatherLabel weather={location.weather} />
      );

      // Temperature assertion
      if (location.weather.temperature_c !== null) {
        const expected = `${Math.round(location.weather.temperature_c)}°`;
        expect(getByText(expected)).toBeInTheDocument();
      } else {
        expect(getByText('--°')).toBeInTheDocument();
      }

      // Condition assertion
      if (location.weather.condition !== null) {
        const raw = location.weather.condition;
        const displayed = raw.length > 20 ? raw.slice(0, 19) + '…' : raw;
        expect(getByText(displayed)).toBeInTheDocument();
      }

      return true;
    }
  )
);
```

**Why this matters**: The label rendering logic has four branches (temp null/non-null × condition null/non-null). PBT exhaustively covers all combinations including edge cases like `temperature_c = 0`, `temperature_c = -0.4`, condition strings of exactly 20 and 21 characters.

### Property 4 — Fullscreen modal inherits card's centre and zoom

**Invariant**: The `initialCenter` and `initialZoom` props passed to `FullscreenMapModal` equal the values returned by `mapRef.current.getCenter()` and `mapRef.current.getZoom()` at the moment the expand button is clicked.

This is tested as a unit assertion rather than a randomised property, but fits naturally alongside the PBT suite:

```typescript
fc.assert(
  fc.property(
    arbLatLng(),
    fc.integer({ min: 1, max: 18 }),
    (center, zoom) => {
      // mock map ref
      const fakeMap = { getCenter: () => center, getZoom: () => zoom } as unknown as L.Map;
      const mapRef = { current: fakeMap };
      const { result } = renderHook(() => useExpandMap(mapRef));
      act(() => result.current.openFullscreen());
      expect(result.current.capturedCenter).toEqual(center);
      expect(result.current.capturedZoom).toBe(zoom);
    }
  )
);
```

---

## Accessibility

| Concern | Approach |
|---|---|
| Expand button label | `aria-label="Expand map"` |
| Close button label | `aria-label="Close map"` |
| Fullscreen modal | `role="dialog"` + `aria-modal="true"` + `aria-label="Fullscreen map"` |
| Escape key dismiss | `keydown` listener on `document` in `FullscreenMapModal` |
| Weather label contrast | White `#fff` on `rgba(15,15,20,0.88)` → ~16.5:1 ratio (≥ 4.5:1 AA) |
| Map container | Leaflet renders a `<div>` with no implicit role; wrap in `<section aria-label="Locations map">` |
| Pin keyboard focus | Each `DivIcon` element receives `tabIndex={0}` and a `keydown` handler (Enter/Space triggers click) via `eventHandlers` on `Marker` |
| Focus trap in fullscreen | `FullscreenMapModal` traps focus within the modal using a lightweight focus-trap effect; on close, focus returns to the expand button |
| Loading indicator | `role="status"` + `aria-label="Loading map"` on `MapLoadingOverlay` |
| Error message | `role="alert"` on `MapErrorOverlay` for immediate announcement |

---

## Testing Strategy

### Unit Tests

- `WeatherLabel`: render with `{ temperature_c: null, condition: null }`, `{ temperature_c: 24.7, condition: "Partly cloudy" }`, condition exactly 20 chars, condition 21 chars (truncation).
- `mapUtils.getInitialView`: single location returns zoom 11; multiple locations returns bounds.
- `mapUtils.getTileUrl`: returns OSM URL when env var absent; returns keyed URL when present.
- `useMapTileState`: timer fires after 10 s with no tile loads → state becomes `'error'`; tile load event before timeout → state becomes `'loaded'`.

### Property-Based Tests

See Properties 1–4 above using `fast-check`. Arbitraries needed:

```typescript
const arbWeatherSnapshot = (): fc.Arbitrary<WeatherSnapshot> =>
  fc.record({
    temperature_c: fc.oneof(fc.constant(null), fc.float({ min: -10, max: 45 })),
    condition: fc.oneof(fc.constant(null), fc.string({ minLength: 0, maxLength: 30 })),
    // ...other fields can be null
  });

const arbLocation = (): fc.Arbitrary<Location> =>
  fc.record({
    id: fc.integer({ min: 1 }),
    latitude: fc.float({ min: -90, max: 90 }),
    longitude: fc.float({ min: -180, max: 180 }),
    created_at: fc.constant(new Date().toISOString()),
    weather: arbWeatherSnapshot(),
  });
```

### Integration Tests

- Mount `MapCard` inside `StoreProvider` with mocked locations; assert pins render; click a pin; assert `selectedId` updates.
- Add a location to the store; assert a new pin appears without reload.
- Simulate tile error timeout; assert error overlay appears and `TileGrid` is still in DOM.
- Open fullscreen; assert modal appears; press Escape; assert modal closes.

---

## Dependencies

| Package | Version | Purpose |
|---|---|---|
| `leaflet` | `^1.9.4` | Already installed — map engine |
| `react-leaflet` | `^4.2.1` | Already installed — React bindings |
| `@types/leaflet` | `^1.9.x` | TypeScript types for Leaflet (dev dep, install if missing) |
| `fast-check` | `^3.x` | PBT library (dev dep, install for tests) |

No backend changes. No new runtime dependencies beyond the already-installed Leaflet packages (plus `@types/leaflet` as a dev dep).
