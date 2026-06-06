import { useStore } from '../state/store';
import { CloudIcon, HomeIcon } from './icons';
import { formatTemperature, formatTime } from './format';
import type { KeyboardEvent } from 'react';
import React from 'react';
import type { Location } from '../types';

interface SidebarCardProps {
  location: Location;
  isHome: boolean;
}

export function SidebarCard({ location, isHome }: SidebarCardProps) {
  const { selectedId, select, remove } = useStore();
  const isSelected = selectedId === location.id;
  const observed = formatTime(location.weather.observed_at);
  const area =
    location.weather.area || `${location.latitude.toFixed(3)}, ${location.longitude.toFixed(3)}`;
  const condition = location.weather.condition || '-';
  const temperature = formatTemperature(location.weather.temperature_c);
  const high = formatTemperature(location.weather.forecast_high_c);
  const low = formatTemperature(location.weather.forecast_low_c);

  const onSelect = () => select(location.id);
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onSelect();
    }
  };
  const onDelete = (event: React.MouseEvent) => {
    event.stopPropagation();
    void remove(location.id);
  };
  return (
    <div className="relative w-full">
      {/* Delete button sits outside overflow-hidden so it is never clipped */}
      <button
        type="button"
        onClick={onDelete}
        aria-label="Delete location"
        className="absolute right-2 top-2 z-10 flex h-6 w-6 items-center justify-center rounded-full text-white/40 transition hover:bg-white/20 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3.5 w-3.5">
          <path d="M2.22 2.22a.75.75 0 0 1 1.06 0L8 6.94l4.72-4.72a.75.75 0 1 1 1.06 1.06L9.06 8l4.72 4.72a.75.75 0 1 1-1.06 1.06L8 9.06l-4.72 4.72a.75.75 0 0 1-1.06-1.06L6.94 8 2.22 3.28a.75.75 0 0 1 0-1.06Z" />
        </svg>
      </button>

      <div
        role="button"
        tabIndex={0}
        onClick={onSelect}
        onKeyDown={onKeyDown}
        aria-pressed={isSelected}
        className={`w-full cursor-pointer overflow-hidden rounded-2xl border text-left backdrop-blur-xl transition ${
          isSelected
            ? 'border-white/30 bg-white/20 shadow-lg shadow-black/20'
            : 'border-white/10 bg-white/[0.07] hover:bg-white/[0.12]'
        }`}
      >
        {/* pr-8 keeps the temperature clear of the delete button */}
        <div className="flex items-start justify-between gap-3 px-4 pr-8 pt-3">
          <div className="min-w-0">
            <div className="truncate text-lg font-semibold leading-tight text-white">{area}</div>
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-white/70">
              {isHome ? (
                <>
                  <span>My Location</span>
                  <span className="text-white/40">·</span>
                  <HomeIcon className="h-3 w-3" />
                  <span>Home</span>
                </>
              ) : observed ? (
                <span>{observed}</span>
              ) : (
                <span className="text-white/50">Not refreshed</span>
              )}
            </div>
          </div>
          <div className="text-3xl font-light tabular-nums text-white/90">{temperature}</div>
        </div>
        <div className="mt-3 flex items-center justify-between border-t border-white/10 px-4 py-2 text-xs">
          <div className="flex items-center gap-2 text-white/80">
            <CloudIcon className="h-4 w-4 text-white/70" />
            <span>{condition}</span>
          </div>
          <div className="text-white/60 tabular-nums">
            H:{high} L:{low}
          </div>
        </div>
      </div>
    </div>
  );
}
