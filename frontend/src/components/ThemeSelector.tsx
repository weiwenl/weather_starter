import { visualThemes, useTheme } from '../state/theme';
import type { VisualThemeId } from '../state/theme';
import { SunIcon } from './icons';

export function ThemeSelector() {
  const { themeId, setThemeId } = useTheme();

  return (
    <div className="theme-selector fixed right-4 top-4 z-40 flex h-10 items-center gap-2 rounded-full border px-3 shadow-lg backdrop-blur-xl">
      <SunIcon className="h-4 w-4" />
      <select
        aria-label="Visual theme"
        value={themeId}
        onChange={(event) => setThemeId(event.target.value as VisualThemeId)}
        className="theme-select cursor-pointer appearance-none bg-transparent pr-5 text-xs font-semibold uppercase tracking-[0.12em] outline-none"
      >
        {visualThemes.map((theme) => (
          <option key={theme.id} value={theme.id}>
            {theme.label}
          </option>
        ))}
      </select>
      <span className="theme-select-caret" aria-hidden="true" />
    </div>
  );
}
