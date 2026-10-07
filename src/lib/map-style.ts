// Set NEXT_PUBLIC_MAP_STYLE_URL (and optionally _DARK) to a hosted style that includes your key,
// e.g. https://api.maptiler.com/maps/streets-v2/style.json?key=YOUR_KEY
const LIGHT_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL;
const DARK_URL = process.env.NEXT_PUBLIC_MAP_STYLE_URL_DARK || LIGHT_URL;

const FREE = {
  light: "https://tiles.openfreemap.org/styles/positron",
  dark: "https://tiles.openfreemap.org/styles/dark",
};

export function mapStyle(theme: "light" | "dark"): string {
  return (theme === "dark" ? DARK_URL : LIGHT_URL) || FREE[theme];
}
