const HAND_DRAWN = {
  // Backgrounds — warm paper with notebook texture
  bg: "#fdfbf7",
  gradBg:
    "radial-gradient(#e5e0d8 1px, transparent 1px), linear-gradient(180deg, #fdfbf7 0%, #f8f4ec 100%)",
  surface: "#ffffff",
  surfaceHigh: "#fff9c4",

  // Borders — pencil lead
  border: "#2d2d2d",
  borderHover: "#2d5da1",
  borderFocus: "#2d5da1",

  // Text
  textPrimary: "#2d2d2d",
  textMuted: "rgba(45,45,45,0.75)",
  textFaint: "rgba(45,45,45,0.55)",

  // Accent system
  violetLight: "#ff4d4d",
  gradAccent: "#ff4d4d",
  gradSuccess: "#2d5da1",

  // Hard offset shadows (no blur)
  glowViolet: "4px 4px 0px 0px #2d2d2d",
  shadowSurface: "4px 4px 0px 0px #2d2d2d",
  shadowSurfaceHover: "2px 2px 0px 0px #2d2d2d",

  // Dropdowns
  selectBg: "#ffffff",
  historyBg: "#fdfbf7",

  // Decorative blobs off for paper look
  blobA: "transparent",
  blobB: "transparent",
  blobC: "transparent",

  // Typography
  gradAccentAnimDuration: "5s",
  btnExtraAnim: "",
  fontDisplay: "'Kalam', 'Patrick Hand', system-ui, cursive",
  fontMono: "'Patrick Hand', 'Kalam', system-ui, cursive",
  fontHeading: "'Kalam', 'Patrick Hand', system-ui, cursive",
  fontBody: "'Patrick Hand', 'Kalam', system-ui, cursive",
  textScale: 1.12,
  enableIdleAnimations: false,

  // Shared structure
  neoMode: false,
  radius: "255px 15px 225px 15px / 15px 225px 15px 255px",
  borderW: "3px",
  backdropFilterVal: "none",

  // Animations disabled for responsiveness
  surfaceAnim: "none",
  handleAnim: "none",
  labelAnim: "none",
  badgeAnim: "none",
  iconAnim: "none",

  // Selection
  selectionBg: "rgba(255,77,77,0.14)",
  selectionBorder: "rgba(45,45,45,0.85)",
  selectionOverlay: "rgba(45,93,161,0.24)",

  // Secondary accent
  secondaryAccent: "#2d5da1",

  // App-level style overrides so App.jsx does not need per-theme branches.
  appUi: {
    signOutOverlayBg: "rgba(45,45,45,0.22)",
    signOutOverlayBackdrop: "none",
    signOutDialogRadius: "225px 25px 205px 20px / 20px 190px 25px 220px",
    signOutDialogBg: "#fffdf7",
    signOutDialogBorderWidth: "3px",
    signOutDialogShadow: "8px 8px 0px 0px #2d2d2d",
    signOutIconRadius: "50% 40% 55% 45% / 45% 55% 40% 60%",
    signOutIconBg: "#fff9c4",
    signOutIconBorder: "3px dashed #2d2d2d",
    signOutIconColor: "#ff4d4d",

    titleUseSolidColor: true,
    titleSolidColor: "#2d2d2d",
    showHalftoneOverlay: false,
    headerDividerHeight: 2,

    themePickerTriggerBorderWidth: "3px",
    themePickerTriggerShadow: "4px 4px 0px 0px #2d2d2d",
    themePickerTriggerFontWeight: 700,
    themePickerMenuRadius: "220px 24px 180px 24px / 24px 180px 24px 220px",
    themePickerMenuBorderWidth: "3px",
    themePickerMenuShadow: "6px 6px 0px 0px #2d2d2d",
    themePickerOptionRadius: "180px 15px 170px 15px / 15px 170px 15px 180px",
    themePickerOptionBorderWidth: "2px",
    themePickerOptionFontWeight: 700,
    themePickerOptionSelectedBg: "#fff9c4",

    authSignedInBg: "#fff9c4",
    authSignedInBorder: "2px solid #2d2d2d",
    authSignedInShadow: "3px 3px 0px 0px #2d2d2d",
    authSignedInColor: "#2d2d2d",
    authSignedInDotRadius: "50%",
    authSignedInDotColor: "#ff4d4d",
    authSignedOutBorderWidth: "2px",
    authSignedOutShadow: "3px 3px 0px 0px #2d2d2d",
    authSignedOutColor: "#2d2d2d",
    authSignedOutFontWeight: 700,
    authSignedOutDotRadius: "50%",

    infoCardShadow: "4px 4px 0px 0px #2d2d2d",
    botCardBg: "#fff9c4",
    botCardBorder: "3px dashed #2d2d2d",
    botCardShadow: "4px 4px 0px 0px #2d2d2d",
    botTitleWeight: 700,
    botTitleColor: "#2d2d2d",

    thumbBtnHeight: 36,
    thumbBtnPadding: "0 12px",
    thumbBtnTextTransform: "none",
    thumbBtnLetterSpacing: "0.01em",

    floatingBorderWidth: "3px",
    floatingBg: "#ffffff",
    floatingShadow: "4px 4px 0px 0px #2d2d2d",
    floatingBackdrop: "none",
    floatingPadding: "10px 12px",
    floatingFontWeight: 700,
    contactExpandedPadding: "6px 11px",
    contactCollapsedPadding: "0 9px",
    updateProgressRadius: "14px",
    updateActionBtnHeight: 34,
    versionBadgePadding: "6px 11px",
    updateMessageWeight: 700,
  },
};

export default HAND_DRAWN;
