const NEO_BRUTALISM = {
  // Backgrounds — warm paper canvas
  bg: "#FFFDF5",
  gradBg: "#FFFDF5",
  surface: "#FFFFFF",
  surfaceHigh: "#FFD93D",

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
  gradAccent: "#FF6B6B",
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
  fontHeading: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  fontBody: "'Space Grotesk', 'Inter', system-ui, sans-serif",
  enableIdleAnimations: true,

  // Shared structural tokens
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

export default NEO_BRUTALISM;
