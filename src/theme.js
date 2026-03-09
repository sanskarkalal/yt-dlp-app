import { createContext, useContext } from "react";

export const DARK = {
  bg: "#09090f",
  surface: "#0f0f1a",
  surfaceHigh: "#151525",
  border: "rgba(255,255,255,0.07)",
  borderHover: "rgba(255,255,255,0.13)",
  borderFocus: "rgba(139,92,246,0.5)",
  textPrimary: "rgba(255,255,255,0.9)",
  textMuted: "rgba(255,255,255,0.4)",
  textFaint: "rgba(255,255,255,0.18)",
  violetLight: "#a78bfa",
  gradAccent: "linear-gradient(135deg, #7c3aed, #db2777)",
  gradSuccess: "linear-gradient(135deg, #059669, #10b981)",
  glowViolet: "0 0 24px rgba(124,58,237,0.3)",
  selectBg: "#13132a",
  historyBg: "linear-gradient(180deg,#0d0d1f 0%,#09090f 100%)",
};

export const LIGHT = {
  bg: "#fffaf5",
  surface: "#ffffff",
  surfaceHigh: "#fff1e6",
  border: "rgba(234,88,12,0.12)",
  borderHover: "rgba(234,88,12,0.25)",
  borderFocus: "rgba(249,115,22,0.5)",
  textPrimary: "#1c0f00",
  textMuted: "#78716c",
  textFaint: "#d97706",
  violetLight: "#ea580c",
  gradAccent: "linear-gradient(135deg, #ea580c, #f59e0b)",
  gradSuccess: "linear-gradient(135deg, #059669, #10b981)",
  glowViolet: "0 4px 20px rgba(249,115,22,0.2)",
  selectBg: "#ffffff",
  historyBg: "linear-gradient(180deg,#fffaf5 0%,#fff1e6 100%)",
};

export const ThemeCtx = createContext(DARK);
export const useC = () => useContext(ThemeCtx);
