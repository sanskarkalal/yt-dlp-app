const MAXIMALISM_DOPAMINE = {
  // Backgrounds — deep cosmic base with layered pattern mesh
  bg: "#0D0D1A",
  gradBg:
    "radial-gradient(circle at 20% 20%, rgba(255,58,242,0.18) 0%, transparent 45%), radial-gradient(circle at 80% 65%, rgba(0,245,212,0.14) 0%, transparent 48%), radial-gradient(circle at 50% 50%, rgba(123,47,255,0.16) 0%, transparent 58%), repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(255,230,0,0.06) 10px, rgba(255,230,0,0.06) 20px), radial-gradient(circle, rgba(255,58,242,0.14) 1px, transparent 1px), linear-gradient(180deg, #0D0D1A 0%, #151129 100%)",
  surface: "rgba(45,27,78,0.82)",
  surfaceHigh: "rgba(60,36,102,0.9)",

  // Borders — loud clash-first system
  border: "#FF3AF2",
  borderHover: "#FFE600",
  borderFocus: "#00F5D4",

  // Text
  textPrimary: "#FFFFFF",
  textMuted: "rgba(255,255,255,0.78)",
  textFaint: "rgba(255,255,255,0.58)",

  // Accent system
  violetLight: "#FF3AF2",
  gradAccent: "linear-gradient(90deg, #FF3AF2 0%, #7B2FFF 35%, #00F5D4 70%, #FFE600 100%)",
  gradSuccess: "linear-gradient(135deg, #00F5D4 0%, #7B2FFF 60%, #FF3AF2 100%)",

  // Shadows — stacked glow + hard offsets
  glowViolet:
    "0 0 16px rgba(255,58,242,0.42), 6px 6px 0px #FFE600",
  shadowSurface:
    "0 0 18px rgba(255,58,242,0.32), 6px 6px 0px #FFE600",
  shadowSurfaceHover:
    "0 0 26px rgba(255,58,242,0.45), 8px 8px 0px #00F5D4",

  // Dropdowns
  selectBg: "rgba(36,21,64,0.95)",
  historyBg: "linear-gradient(180deg, rgba(45,27,78,0.95) 0%, rgba(13,13,26,0.98) 100%)",

  // Ambient blobs
  blobA: "radial-gradient(ellipse at center, rgba(255,58,242,0.28) 0%, transparent 70%)",
  blobB: "radial-gradient(ellipse at center, rgba(0,245,212,0.24) 0%, transparent 70%)",
  blobC: "radial-gradient(ellipse at center, rgba(255,230,0,0.2) 0%, transparent 75%)",

  // Typography
  gradAccentAnimDuration: "4s",
  btnExtraAnim: "",
  fontDisplay: "'Outfit', 'Unbounded', 'Inter', system-ui, sans-serif",
  fontMono: "'DM Sans', 'Inter', system-ui, sans-serif",
  fontHeading: "'Outfit', 'Unbounded', 'Inter', system-ui, sans-serif",
  fontBody: "'DM Sans', 'Inter', system-ui, sans-serif",
  enableIdleAnimations: false,
  textScale: 1.06,

  // Shared structure
  neoMode: false,
  radius: 24,
  borderW: "4px",
  backdropFilterVal: "blur(10px)",

  // Continuous motion
  surfaceAnim: "none",
  handleAnim: "none",
  labelAnim: "none",
  badgeAnim: "none",
  iconAnim: "none",

  // Selection
  selectionBg: "rgba(255,58,242,0.2)",
  selectionBorder: "rgba(0,245,212,0.65)",
  selectionOverlay: "rgba(255,230,0,0.28)",

  // Secondary accent
  secondaryAccent: "#00F5D4",

  // App-level overrides
  appUi: {
    signOutOverlayBg: "rgba(13,13,26,0.8)",
    signOutOverlayBackdrop: "blur(8px)",
    signOutDialogRadius: 28,
    signOutDialogBg: "rgba(45,27,78,0.96)",
    signOutDialogBorderWidth: "4px",
    signOutDialogShadow:
      "0 0 34px rgba(255,58,242,0.44), 10px 10px 0px #FFE600, 20px 20px 0px #00F5D4",
    signOutIconRadius: 12,
    signOutIconBg: "rgba(255,230,0,0.16)",
    signOutIconBorder: "3px dashed #FFE600",
    signOutIconColor: "#FFE600",

    showHalftoneOverlay: false,
    titleUseSolidColor: false,

    headerDividerHeight: 4,
    themePickerTriggerBorderWidth: "4px",
    themePickerTriggerShadow: "6px 6px 0px #FFE600, 12px 12px 0px #FF3AF2",
    themePickerTriggerFontWeight: 800,
    themePickerMenuRadius: 22,
    themePickerMenuBorderWidth: "4px",
    themePickerMenuShadow: "8px 8px 0px #00F5D4, 16px 16px 0px #FFE600",
    themePickerOptionRadius: 18,
    themePickerOptionBorderWidth: "3px",
    themePickerOptionFontWeight: 700,
    themePickerOptionSelectedBg: "linear-gradient(90deg, rgba(255,58,242,0.25), rgba(0,245,212,0.22))",

    authSignedInBg: "rgba(0,245,212,0.16)",
    authSignedInBorder: "3px solid #00F5D4",
    authSignedInShadow: "4px 4px 0px #FFE600",
    authSignedInColor: "#00F5D4",
    authSignedInDotRadius: "50%",
    authSignedInDotColor: "#00F5D4",

    authSignedOutBorderWidth: "3px",
    authSignedOutShadow: "4px 4px 0px #7B2FFF",
    authSignedOutColor: "#FFFFFF",
    authSignedOutFontWeight: 700,
    authSignedOutDotRadius: "50%",

    infoCardShadow: "6px 6px 0px #7B2FFF, 12px 12px 0px #FF3AF2",
    botCardBg: "rgba(255,230,0,0.16)",
    botCardBorder: "4px dashed #FFE600",
    botCardShadow: "6px 6px 0px #FF6B35",
    botTitleWeight: 800,
    botTitleColor: "#FFE600",

    thumbBtnHeight: 36,
    thumbBtnPadding: "0 14px",
    thumbBtnTextTransform: "uppercase",
    thumbBtnLetterSpacing: "0.06em",

    floatingBorderWidth: "4px",
    floatingBg: "rgba(36,21,64,0.95)",
    floatingShadow: "6px 6px 0px #FFE600, 12px 12px 0px #FF3AF2",
    floatingBackdrop: "blur(8px)",
    floatingPadding: "10px 12px",
    floatingFontWeight: 700,
    contactExpandedPadding: "6px 12px",
    contactCollapsedPadding: "0 9px",
    updateProgressRadius: 999,
    updateActionBtnHeight: 34,
    versionBadgePadding: "6px 12px",
    updateMessageWeight: 700,
    hideContactBelowHeight: 760,
  },
};

export default MAXIMALISM_DOPAMINE;
