import { createContext, useContext } from "react";

// ── DARK · Bitcoin DeFi Aesthetic ──────────────────────────────────────────
export const DARK = {
  // Backgrounds
  bg: "#030304",
  gradBg: "radial-gradient(ellipse at top center, #0F0F1A 0%, #030304 50%, #010102 100%)",
  surface: "#0F1115",
  surfaceHigh: "#161B24",

  // Borders — orange-tinted
  border: "rgba(247,147,26,0.18)",
  borderHover: "rgba(247,147,26,0.45)",
  borderFocus: "rgba(247,147,26,0.75)",

  // Text
  textPrimary: "#FFFFFF",
  textMuted: "#94A3B8",
  textFaint: "rgba(255,255,255,0.3)",

  // Accent — Bitcoin fire palette
  violetLight: "#F7931A",
  gradAccent: "linear-gradient(135deg, #EA580C 0%, #F7931A 50%, #FFD600 100%)",
  gradSuccess: "linear-gradient(135deg, #059669, #10b981)",

  // Glow / shadows
  glowViolet: "0 0 20px rgba(247,147,26,0.55), 0 0 42px rgba(234,88,12,0.28), inset 0 1px 0 rgba(255,255,255,0.1)",
  shadowSurface: "0 0 0 1px rgba(247,147,26,0.1), 0 2px 24px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.04)",
  shadowSurfaceHover: "0 0 0 1px rgba(247,147,26,0.32), 0 6px 32px rgba(234,88,12,0.22), 0 0 64px rgba(247,147,26,0.08), inset 0 1px 0 rgba(255,255,255,0.06)",

  // Dropdowns
  selectBg: "#0F1115",
  historyBg: "linear-gradient(180deg, #0F1115 0%, #030304 100%)",

  // Blobs
  blobA: "radial-gradient(ellipse, rgba(247,147,26,0.24) 0%, transparent 70%)",
  blobB: "radial-gradient(ellipse, rgba(234,88,12,0.14) 0%, transparent 70%)",
  blobC: "radial-gradient(ellipse, rgba(255,214,0,0.1) 0%, transparent 70%)",

  // Typography
  gradAccentAnimDuration: "5s",
  btnExtraAnim: "",
  fontDisplay: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  fontMono: "'JetBrains Mono', 'Fira Code', monospace",

  // ── Shared structural tokens ──
  neoMode: false,
  radius: 10,
  borderW: "1px",
  backdropFilterVal: "blur(16px)",

  // Animations
  surfaceAnim: "surfaceBreath 3.5s ease-in-out infinite",
  handleAnim: "handlePulse 2s ease-in-out infinite",
  labelAnim: "surfaceBreath 6s ease-in-out infinite",
  badgeAnim: "handlePulse 4s ease-in-out infinite",
  iconAnim: "surfaceBreath 5s ease-in-out infinite",

  // Selection colors (history drawer)
  selectionBg: "rgba(124,58,237,0.1)",
  selectionBorder: "rgba(124,58,237,0.25)",
  selectionOverlay: "rgba(124,58,237,0.35)",

  // Secondary accent (tabs, highlights)
  secondaryAccent: "#FFD600",
};

// ── LIGHT · Neo-Brutalism Aesthetic ────────────────────────────────────────
// Cream canvas · Pure black structure · Hot red + vivid yellow + soft violet
// Hard offset shadows · Thick borders · Zero blur · Mechanical interactions
export const LIGHT = {
  // Backgrounds — warm paper canvas
  bg: "#FFFDF5",
  gradBg: "#FFFDF5",
  surface: "#FFFFFF",
  surfaceHigh: "#FFD93D",   // yellow — the neo-brutalism highlight surface

  // Borders — hard pure black, always
  border: "#000000",
  borderHover: "#000000",
  borderFocus: "#000000",

  // Text — pure black ink
  textPrimary: "#000000",
  textMuted: "rgba(0,0,0,0.65)",
  textFaint: "rgba(0,0,0,0.4)",

  // Accent — Hot Red primary, no gradients
  violetLight: "#FF6B6B",
  gradAccent: "#FF6B6B",           // solid red — no gradient panning
  gradSuccess: "#16a34a",

  // Shadows — hard offset blocks, zero blur
  glowViolet: "4px 4px 0px 0px #000000",
  shadowSurface: "6px 6px 0px 0px #000000",
  shadowSurfaceHover: "10px 10px 0px 0px #000000",

  // Dropdowns
  selectBg: "#FFFFFF",
  historyBg: "#FFFDF5",

  // Blobs — none, neo-brutalism uses flat texture
  blobA: "transparent",
  blobB: "transparent",
  blobC: "transparent",

  // Typography
  gradAccentAnimDuration: "5s",
  btnExtraAnim: "",
  fontDisplay: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  fontMono: "'Space Grotesk', 'Inter', system-ui, sans-serif",

  // ── Shared structural tokens ──
  neoMode: true,
  radius: 0,
  borderW: "4px",
  backdropFilterVal: "none",

  // Animations — all off; interactions are mechanical (translate), not glowing
  surfaceAnim: "none",
  handleAnim: "none",
  labelAnim: "none",
  badgeAnim: "none",
  iconAnim: "none",

  // Selection colors — yellow with hard border
  selectionBg: "#FFD93D",
  selectionBorder: "#000000",
  selectionOverlay: "rgba(255,217,61,0.55)",

  // Secondary accent (tabs active, ghost hover)
  secondaryAccent: "#FFD93D",
};

export const ThemeCtx = createContext(DARK);
export const useC = () => useContext(ThemeCtx);
