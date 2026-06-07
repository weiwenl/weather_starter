import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { divIcon, latLngBounds } from 'leaflet';
import type { LatLngExpression } from 'leaflet';
import { MapContainer, Marker, TileLayer, Tooltip, useMap } from 'react-leaflet';
import { useStore } from '../state/store';
import type { Location } from '../types';
import { formatTemperature } from './format';
import { CloseIcon, ExpandIcon, LocationIcon } from './icons';

const SINGAPORE_CENTER: LatLngExpression = [1.3521, 103.8198];
const MAP_TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const MAP_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

interface WeatherLocationsMapProps {
  locations: Location[];
  selectedId: number | null;
  isFullscreen?: boolean;
  onSelect: (id: number) => void;
}

function locationName(location: Location): string {
  return location.weather.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
}

function locationLabel(location: Location): string {
  return location.weather.condition || 'Weather';
}

function pinIcon(isSelected: boolean) {
  return divIcon({
    className: `weather-map-pin ${isSelected ? 'weather-map-pin--selected' : ''}`,
    html: '<span class="weather-map-pin__stem"></span><span class="weather-map-pin__dot"></span>',
    iconAnchor: [15, 30],
    iconSize: [30, 34],
    tooltipAnchor: [0, -30],
  });
}

function MapViewport({ locations, selectedId, isFullscreen = false }: Omit<WeatherLocationsMapProps, 'onSelect'>) {
  const map = useMap();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      map.invalidateSize();

      if (locations.length === 0) {
        map.setView(SINGAPORE_CENTER, 11, { animate: false });
        return;
      }

      if (locations.length === 1) {
        const [location] = locations;
        map.setView([location.latitude, location.longitude], isFullscreen ? 13 : 12, {
          animate: true,
        });
        return;
      }

      const bounds = latLngBounds(locations.map((location) => [location.latitude, location.longitude]));
      map.fitBounds(bounds, {
        animate: true,
        maxZoom: isFullscreen ? 13 : 12,
        padding: isFullscreen ? [120, 120] : [48, 48],
      });
    }, 75);

    return () => window.clearTimeout(timer);
  }, [isFullscreen, locations, map, selectedId]);

  return null;
}

function WeatherLocationsMap({
  locations,
  selectedId,
  isFullscreen = false,
  onSelect,
}: WeatherLocationsMapProps) {
  return (
    <MapContainer
      center={SINGAPORE_CENTER}
      zoom={11}
      zoomControl={isFullscreen}
      scrollWheelZoom={isFullscreen}
      dragging={isFullscreen}
      doubleClickZoom={isFullscreen}
      touchZoom={isFullscreen}
      keyboard={isFullscreen}
      className="h-full w-full"
      attributionControl={isFullscreen}
    >
      <TileLayer attribution={MAP_ATTRIBUTION} url={MAP_TILE_URL} />
      <MapViewport locations={locations} selectedId={selectedId} isFullscreen={isFullscreen} />
      {locations.map((location) => {
        const isSelected = selectedId === location.id;
        return (
          <Marker
            key={location.id}
            position={[location.latitude, location.longitude]}
            icon={pinIcon(isSelected)}
            eventHandlers={{
              click: () => onSelect(location.id),
            }}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Tooltip
              permanent
              direction="top"
              className={`weather-map-label ${isSelected ? 'weather-map-label--selected' : ''}`}
            >
              <span className="weather-map-label__content">
                <span className="weather-map-label__temperature">
                  {formatTemperature(location.weather.temperature_c)}
                </span>
                <span className="weather-map-label__condition">{locationLabel(location)}</span>
              </span>
            </Tooltip>
          </Marker>
        );
      })}
    </MapContainer>
  );
}

interface FullscreenWeatherMapProps {
  locations: Location[];
  selectedId: number | null;
  onClose: () => void;
  onSelect: (id: number) => void;
}

function FullscreenWeatherMap({ locations, selectedId, onClose, onSelect }: FullscreenWeatherMapProps) {
  const selected = locations.find((location) => location.id === selectedId) ?? locations[0];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return createPortal(
    <div className="weather-map-fullscreen fixed inset-0 z-50 bg-slate-950 text-white">
      <div className="absolute inset-0">
        <WeatherLocationsMap
          locations={locations}
          selectedId={selectedId}
          isFullscreen
          onSelect={onSelect}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex items-start justify-between gap-4 bg-gradient-to-b from-black/75 via-black/35 to-transparent p-4 sm:p-6">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/65">
            <LocationIcon className="h-3.5 w-3.5" />
            <span>Weather Map</span>
          </div>
          <h2 className="mt-2 truncate text-2xl font-light text-white sm:text-3xl">
            {selected ? locationName(selected) : 'Saved Locations'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close fullscreen map"
          title="Close map"
          className="pointer-events-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-black/35 text-white/85 backdrop-blur-xl hover:bg-white/15"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[500] bg-gradient-to-t from-black/75 via-black/35 to-transparent p-4 pt-16 sm:p-6 sm:pt-20">
        <div className="pointer-events-auto mx-auto flex max-w-4xl gap-2 overflow-x-auto rounded-2xl border border-white/15 bg-black/35 p-2 backdrop-blur-xl">
          {locations.map((location) => {
            const isSelected = location.id === selectedId;
            return (
              <button
                key={location.id}
                type="button"
                onClick={() => onSelect(location.id)}
                className={`min-w-[9rem] rounded-xl px-3 py-2 text-left transition ${
                  isSelected ? 'bg-white/20 text-white' : 'text-white/70 hover:bg-white/10'
                }`}
              >
                <span className="block truncate text-sm font-medium">{locationName(location)}</span>
                <span className="mt-1 block text-xs tabular-nums text-white/65">
                  {formatTemperature(location.weather.temperature_c)} {locationLabel(location)}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function WeatherMapCard() {
  const { locations, selectedId, select } = useStore();
  const [isFullscreen, setIsFullscreen] = useState(false);

  const selected = useMemo(
    () => locations.find((location) => location.id === selectedId) ?? locations[0],
    [locations, selectedId],
  );

  useEffect(() => {
    if (!isFullscreen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isFullscreen]);

  if (locations.length === 0) return null;

  return (
    <>
      <section className="overflow-hidden rounded-2xl border border-white/15 bg-white/[0.08] backdrop-blur-xl">
        <header className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/60">
              <LocationIcon className="h-3.5 w-3.5" />
              <span>Weather Map</span>
            </div>
            <p className="mt-1 truncate text-sm text-white/75">
              {selected ? locationName(selected) : `${locations.length} saved locations`}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            aria-label="Open fullscreen map"
            title="Open map"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.08] text-white/80 hover:bg-white/[0.14]"
          >
            <ExpandIcon className="h-4 w-4" />
          </button>
        </header>

        <button
          type="button"
          onClick={() => setIsFullscreen(true)}
          className="group relative block h-64 w-full overflow-hidden text-left sm:h-72"
          aria-label="Open fullscreen weather map"
        >
          <div className="weather-map-preview absolute inset-0">
            <WeatherLocationsMap locations={locations} selectedId={selectedId} onSelect={select} />
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/35 via-black/10 to-transparent p-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/55 bg-white/85 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-lg shadow-black/15 backdrop-blur-xl">
              <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_14px_rgba(16,185,129,0.45)]" />
              <span>{locations.length} saved {locations.length === 1 ? 'location' : 'locations'}</span>
            </div>
          </div>
        </button>
      </section>

      {isFullscreen && (
        <FullscreenWeatherMap
          locations={locations}
          selectedId={selectedId}
          onClose={() => setIsFullscreen(false)}
          onSelect={select}
        />
      )}
    </>
  );
}
