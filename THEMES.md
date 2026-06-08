# Weather Starter Themes

This file records the theme directions discussed for Weather Starter, along with their descriptions and design considerations.

These are the 15 visual directions we can add to Weather Starter. If a theme already exists in the codebase, keep it here as a reference instead of duplicating it.

## Theme List

| Theme                | Description                                                                                 | Design Considerations                                                                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clear Morning        | A crisp, optimistic daily-weather dashboard that feels fresh without being playful.         | Color: sky blue, white, lemon, soft green. Typography: clean geometric sans. Cards: white, subtle border, light shadow. Density: medium, airy.                         |
| Storm Watch          | A serious forecast interface for alerts, radar, and changing conditions.                    | Color: charcoal, warning amber, rain blue, red accents. Typography: condensed sans for data emphasis. Cards: dark panels, sharp contrast. Density: high.               |
| Coastal Briefing     | A calm seaside-inspired look for surf, wind, and tide-adjacent weather.                     | Color: teal, foam white, coral, navy accents. Typography: humanist sans. Cards: flat with thin dividers. Density: medium.                                              |
| Alpine Air           | A cool, precise mountain-weather style with strong readability.                             | Color: glacier blue, pine green, snow white, graphite. Typography: Swiss-style sans. Cards: squared, restrained shadows. Density: medium-high.                         |
| Sunset Gradient      | A warm, expressive theme for casual users checking daily and weekly weather.                | Color: peach, magenta, violet, deep indigo. Typography: rounded sans. Cards: translucent glass, soft borders. Density: low-medium.                                     |
| Metro Forecast       | A utility-first dashboard for commuters and quick scanning.                                 | Color: asphalt gray, transit yellow, signal green, clear blue. Typography: compact system sans. Cards: tight tiles, strong dividers. Density: high.                    |
| Weather Desk         | A professional meteorology-console feel for charts, stats, and comparisons.                 | Color: off-white, ink, cyan, orange highlights. Typography: tabular sans or mono for numbers. Cards: bordered modules. Density: high.                                  |
| Soft Rain            | A gentle, quiet interface suited to slow mornings and lifestyle weather.                    | Color: mist gray, lavender-blue, sage, pale cream. Typography: soft humanist sans. Cards: muted backgrounds, minimal shadow. Density: low.                             |
| Solar Pop            | A bright, friendly theme that makes weather feel lively and approachable.                   | Color: yellow, cyan, grass green, tomato red. Typography: rounded display for headings, simple sans for data. Cards: colorful headers, 8px radius. Density: medium.    |
| Night Radar          | A dark, technical look centered on maps, conditions, and alert visibility.                  | Color: near-black, electric cyan, lime, violet accents. Typography: narrow sans with tabular numerals. Cards: dark glass, glowing active states. Density: medium-high. |
| Editorial Weather    | A magazine-like weather experience with elegant hierarchy and spacious composition.         | Color: ivory, black, muted blue, rust. Typography: serif headings with sans body. Cards: minimal, image-forward sections. Density: low.                                |
| Agricultural Outlook | A practical rural-weather theme focused on rain, frost, wind, and planning.                 | Color: field green, wheat, clay, clear blue. Typography: sturdy sans. Cards: solid panels, clear labels. Density: medium-high.                                         |
| Aviation Clearances  | A precise aviation-inspired interface emphasizing visibility, wind, pressure, and timing.   | Color: white, runway black, safety orange, instrument blue. Typography: technical sans/mono mix. Cards: grid modules, compact labels. Density: high.                   |
| Aurora Forecast      | A premium, atmospheric theme for night skies, moon phases, and celestial conditions.        | Color: deep green, midnight, pale cyan, soft pink. Typography: elegant sans with light weights. Cards: dark translucent surfaces. Density: medium.                     |
| Minimal Current      | A stripped-down, fast-loading weather app focused on the current condition and next action. | Color: black, white, one weather-driven accent. Typography: system sans. Cards: almost none, mostly inline sections. Density: low-medium.                              |

## Notes

- The current implementation should keep theme IDs and CSS variables aligned when adding or changing a theme.
- The strongest candidates discussed for a polished starter app were Clear Morning, Metro Forecast, and Weather Desk.
- Themes should be treated as design directions, not just color palettes; typography, card density, and surface treatment matter too.
