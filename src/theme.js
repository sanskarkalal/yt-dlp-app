import { createContext, useContext } from "react";
import BITCOIN_DEFI from "./themes/bitcoin-defi";
import HAND_DRAWN from "./themes/hand-drawn";
import MAXIMALISM_DOPAMINE from "./themes/maximalism-dopamine";
import NEO_BRUTALISM from "./themes/neo-brutalism";
import RETRO_90S from "./themes/retro-90s";
import VAPORWAVE_OUTRUN from "./themes/vaporwave-outrun";

export const DEFAULT_THEME_ID = "bitcoin-defi";

// Add new themes here by importing tokens and appending to this list.
export const THEMES = [
  {
    id: "bitcoin-defi",
    label: "Bitcoin DeFi",
    dataTheme: "bitcoin-defi",
    icon: "bitcoin",
    tokens: BITCOIN_DEFI,
  },
  {
    id: "hand-drawn",
    label: "Hand Drawn",
    dataTheme: "hand-drawn",
    icon: "palette",
    tokens: HAND_DRAWN,
  },
  {
    id: "maximalism-dopamine",
    label: "Maximalism",
    dataTheme: "maximalism-dopamine",
    icon: "palette",
    tokens: MAXIMALISM_DOPAMINE,
  },
  {
    id: "neo-brutalism",
    label: "Neo Brutalism",
    dataTheme: "neo-brutalism",
    icon: "square",
    tokens: NEO_BRUTALISM,
  },
  {
    id: "retro-90s",
    label: "Retro",
    dataTheme: "retro-90s",
    icon: "palette",
    tokens: RETRO_90S,
  },
  {
    id: "vaporwave-outrun",
    label: "Vaporwave Outrun",
    dataTheme: "vaporwave-outrun",
    icon: "palette",
    tokens: VAPORWAVE_OUTRUN,
  },
];

const themeById = Object.fromEntries(THEMES.map((t) => [t.id, t]));

export function getThemeById(themeId) {
  return themeById[themeId] || themeById[DEFAULT_THEME_ID];
}

export function normalizeThemeId(themeId) {
  if (themeById[themeId]) return themeId;

  // Backward compatibility with previous storage values.
  if (themeId === "dark") return "bitcoin-defi";
  if (themeId === "light") return "neo-brutalism";

  return DEFAULT_THEME_ID;
}

export const ThemeCtx = createContext(getThemeById(DEFAULT_THEME_ID).tokens);
export const useC = () => useContext(ThemeCtx);

// Backwards-compatible exports for any direct imports.
export {
  BITCOIN_DEFI,
  HAND_DRAWN,
  MAXIMALISM_DOPAMINE,
  NEO_BRUTALISM,
  RETRO_90S,
  VAPORWAVE_OUTRUN,
};
