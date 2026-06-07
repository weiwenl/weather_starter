# Requirements Document

## Introduction

The Weather Map Card is a new dashboard card for the Weather Starter application that renders an interactive map showing all saved locations as pins. Each pin displays a compact weather label (temperature and/or condition). The card sits alongside the existing tile grid in the Hero view and can expand to a fullscreen overlay for deeper map exploration. The feature mirrors the Apple Weather app's map card interaction model.

## Glossary

- **Map_Card**: The compact map card component rendered within the Hero dashboard scroll area.
- **Fullscreen_Map**: The expanded, fullscreen map overlay triggered from the Map_Card.
- **Location_Pin**: A map marker placed at a saved location's latitude/longitude coordinates.
- **Weather_Label**: A small callout anchored to a Location_Pin showing temperature and/or weather condition text.
- **Selected_Location**: The location whose `id` matches `selectedId` in the application store.
- **Saved_Locations**: The array of `Location` objects held in the application store, each containing `latitude`, `longitude`, and a `WeatherSnapshot`.
- **Tile_Provider**: The third-party map tile service that supplies raster or vector map tiles.
- **Map_Library**: The frontend mapping library used to render the interactive map (e.g., Leaflet, MapLibre GL JS).

---

## Requirements

### Requirement 1: Map Card in Dashboard

**User Story:** As a user, I want to see a map card in the dashboard, so that I can view all my saved locations spatially alongside other weather data.

#### Acceptance Criteria

1. THE Map_Card SHALL render within the Hero component's scroll area, positioned after the TileGrid section.
2. THE Map_Card SHALL match the visual style of existing dashboard tiles — rounded corners, frosted-glass background (`bg-white/[0.08]`, `backdrop-blur-xl`), and a consistent border (`border-white/15`).
3. WHEN the Saved_Locations list is empty, THE Map_Card SHALL display a placeholder message indicating that no locations have been added.
4. WHEN the Saved_Locations list contains at least one entry, THE Map_Card SHALL render a map that supports pan and zoom interactions, centred on the bounding box of all Saved_Locations; IF the list contains exactly one entry, THEN the map SHALL default to a zoom level that shows approximately a 10–12 km radius around that location.
5. THE Map_Card SHALL have a fixed default height of 260px.
6. WHEN the Map_Card renders with at least one Saved_Location, THE Map_Card SHALL display one Location_Pin marker for each Saved_Location within the map canvas.

---

### Requirement 2: Location Pins

**User Story:** As a user, I want to see a pin for each saved location on the map, so that I can quickly identify where each location is.

#### Acceptance Criteria

1. WHEN the Map_Card renders, THE Map_Card SHALL place one Location_Pin on the map for each entry in Saved_Locations at the coordinates given by `location.latitude` and `location.longitude`.
2. IF `selectedId` in the application store matches a Location_Pin's location `id`, THEN that Location_Pin SHALL differ from all other Location_Pins in at least two of the following observable ways: rendered size at least 1.5× the default, a different fill colour, or an elevated stacking order above other pins.
3. WHEN a Location_Pin is clicked, THE Map_Card SHALL update the store's `selectedId` to the corresponding location's `id`.
4. WHEN a location is added to Saved_Locations, THE Map_Card SHALL add a corresponding Location_Pin to the map without requiring a page reload; WHEN a location is removed from Saved_Locations, THE Map_Card SHALL remove the corresponding Location_Pin from the map without requiring a page reload.

---

### Requirement 3: Weather Labels on Pins

**User Story:** As a user, I want each pin to show a small weather label, so that I can compare conditions across locations at a glance.

#### Acceptance Criteria

1. THE Weather_Label SHALL be permanently visible above its Location_Pin without requiring hover or click interaction; THE Weather_Label SHALL display the rounded integer temperature in degrees Celsius (e.g., "24°") sourced from `location.weather.temperature_c`.
2. IF `location.weather.condition` is non-null, THEN THE Weather_Label SHALL display the condition string truncated to a maximum of 20 characters (with an ellipsis if truncated) below the temperature value.
3. IF `location.weather.temperature_c` is null, THEN THE Weather_Label SHALL display "--°" in place of the numeric temperature; IF `location.weather.condition` is non-null and temperature is null, THEN THE Weather_Label SHALL still display the condition string.
4. THE Weather_Label SHALL achieve a minimum contrast ratio of 4.5:1 for normal text against its immediate background (per WCAG 2.1 AA).
5. WHILE the map is being panned or zoomed, THE Weather_Label SHALL remain anchored to its Location_Pin without detaching or drifting.

---

### Requirement 4: Fullscreen Map Expansion

**User Story:** As a user, I want to expand the map to fullscreen, so that I can explore location positions in more detail.

#### Acceptance Criteria

1. THE Map_Card SHALL display an expand button with an accessible label (e.g., `aria-label="Expand map"`) in its top-right corner.
2. WHEN the expand button is activated, THE Fullscreen_Map SHALL open as a modal overlay covering the full viewport; THE Fullscreen_Map SHALL enter with the same centre coordinates and zoom level that were active in the Map_Card at the moment of activation.
3. WHILE the Fullscreen_Map is open, THE Fullscreen_Map SHALL display all Location_Pins at the same `latitude`/`longitude` coordinates, with the same selected/unselected visual distinction, and all Weather_Labels showing the same temperature and condition values as the Map_Card.
4. THE Fullscreen_Map SHALL display a close button with an accessible label (e.g., `aria-label="Close map"`) that, when activated, dismisses the overlay and returns the user to the dashboard.
5. WHEN the Fullscreen_Map is open and a Location_Pin is clicked, THE Fullscreen_Map SHALL update the store's `selectedId` to the corresponding location's `id` and close the overlay, returning the user to the dashboard view.
6. WHEN the Fullscreen_Map is open and the Escape key is pressed, THE Fullscreen_Map SHALL close the overlay.

---

### Requirement 5: Map Tile Loading and Error Handling

**User Story:** As a user, I want the map to communicate loading and error states, so that I am never left with a blank or broken UI.

#### Acceptance Criteria

1. WHILE map tiles are loading, THE Map_Card SHALL display a loading indicator (skeleton or spinner) in place of the map content; WHEN tile loading completes, THE Map_Card SHALL replace the loading indicator with the rendered map.
2. IF all tile requests for the currently visible map bounds return errors or time out within 10 seconds, THEN THE Map_Card SHALL display a user-facing error message stating that the map is unavailable; WHEN the tile error state is active, THE TileGrid, HourlyStrip, and TenDayForecast components SHALL remain fully rendered and interactive.
3. IF all tile requests fail, THEN THE Map_Card SHALL render a solid fallback background within the map canvas area and continue to display Location_Pins at the coordinates given by `location.latitude` and `location.longitude`, with Weather_Labels visible above each pin.

---

### Requirement 6: Responsive Layout

**User Story:** As a user, I want the map card to work correctly at different screen sizes, so that the dashboard remains usable on smaller viewports.

#### Acceptance Criteria

1. THE Map_Card SHALL occupy the full width of the Hero content column (matching the TileGrid's `max-w-5xl` container) at all viewport widths.
2. WHEN the viewport width is below 768px, THE Map_Card SHALL maintain a minimum height of 200px to preserve usability.
3. THE Fullscreen_Map SHALL fill 100% of the viewport width and height on all supported screen sizes.

---

### Requirement 7: Map Library Integration

**User Story:** As a developer, I want the map rendered with an open-source mapping library, so that there are no hidden licensing costs and the library integrates cleanly with React/TypeScript.

#### Acceptance Criteria

1. THE Map_Library SHALL be integrated as a frontend npm dependency without requiring any backend changes.
2. THE Map_Library SHALL support React component wrappers or hooks compatible with React 18 and TypeScript.
3. THE Map_Card SHALL display the Tile_Provider's required attribution text in the bottom-right corner of the map canvas; THE Fullscreen_Map SHALL also display the same attribution text in the same position.
4. WHERE the `VITE_TILE_API_KEY` environment variable is absent or empty, THE Map_Card SHALL fall back to OpenStreetMap tiles so that the feature works out of the box without any API key configuration.
