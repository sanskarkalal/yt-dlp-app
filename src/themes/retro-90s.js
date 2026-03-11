const RETRO_90S = {
  // Backgrounds
  bg: "#C0C0C0",
  gradBg:
    "linear-gradient(45deg, #b8b8b8 25%, transparent 25%), linear-gradient(-45deg, #b8b8b8 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #b8b8b8 75%), linear-gradient(-45deg, transparent 75%, #b8b8b8 75%), #C0C0C0",
  surface: "#E8E8E8",
  surfaceHigh: "#FFFFCC",

  // Borders
  border: "#000000",
  borderHover: "#0000FF",
  borderFocus: "#000000",

  // Text
  textPrimary: "#000000",
  textMuted: "#404040",
  textFaint: "#606060",

  // Accent
  violetLight: "#0000FF",
  gradAccent: "linear-gradient(180deg, #1084D0 0%, #000080 100%)",
  gradSuccess: "linear-gradient(180deg, #00FF00 0%, #00AA00 100%)",

  // 90s bevel-style shadows
  glowViolet: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
  shadowSurface: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
  shadowSurfaceHover: "inset -2px -2px 0 #404040, inset 2px 2px 0 #ffffff",

  // Dropdowns
  selectBg: "#FFFFFF",
  historyBg: "#C0C0C0",

  // Ambient blobs off
  blobA: "transparent",
  blobB: "transparent",
  blobC: "transparent",

  // Typography
  gradAccentAnimDuration: "4s",
  btnExtraAnim: "",
  fontDisplay: "'Arial Black', Impact, Haettenschweiler, sans-serif",
  fontMono: "'Courier New', Courier, monospace",
  fontHeading: "'Arial Black', Impact, Haettenschweiler, sans-serif",
  fontBody: "'MS Sans Serif', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  enableIdleAnimations: false,
  textScale: 1,

  // Shared structure
  neoMode: false,
  radius: 0,
  borderW: "2px",
  backdropFilterVal: "none",
  badgeRadius: 0,
  selectItemRadius: 0,

  // Animations off by default (retro utility classes available in CSS)
  surfaceAnim: "none",
  handleAnim: "none",
  labelAnim: "none",
  badgeAnim: "none",
  iconAnim: "none",

  // Selection
  selectionBg: "rgba(0,0,255,0.12)",
  selectionBorder: "#000080",
  selectionOverlay: "rgba(0,0,255,0.28)",

  // Secondary accent
  secondaryAccent: "#FFFF00",

  appUi: {
    signOutOverlayBg: "rgba(128,128,128,0.62)",
    signOutOverlayBackdrop: "none",
    signOutDialogRadius: 0,
    signOutDialogBg: "#C0C0C0",
    signOutDialogBorderWidth: "2px",
    signOutDialogShadow:
      "inset -2px -2px 0 #808080, inset 2px 2px 0 #ffffff, inset -4px -4px 0 #404040, inset 4px 4px 0 #dfdfdf",
    signOutIconRadius: 0,
    signOutIconBg: "#FFFF00",
    signOutIconBorder: "2px solid #000000",
    signOutIconColor: "#FF0000",
    signOutBtnHeight: 34,
    signOutBtnTextTransform: "uppercase",
    signOutBtnLetterSpacing: "0.06em",

    showHalftoneOverlay: false,
    titleUseSolidColor: true,
    titleSolidColor: "#000000",
    headerDividerHeight: 4,

    themePickerTriggerBorderWidth: "2px",
    themePickerTriggerShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    themePickerTriggerFontWeight: 700,
    themePickerMenuRadius: 0,
    themePickerMenuBorderWidth: "2px",
    themePickerMenuShadow: "inset -2px -2px 0 #808080, inset 2px 2px 0 #ffffff",
    themePickerOptionRadius: 0,
    themePickerOptionBorderWidth: "2px",
    themePickerOptionFontWeight: 700,
    themePickerOptionSelectedBg: "#FFFFCC",

    authSignedInBg: "#C0C0C0",
    authSignedInBorder: "2px solid #000000",
    authSignedInShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    authSignedInColor: "#00AA00",
    authSignedInDotRadius: 0,
    authSignedInDotColor: "#00FF00",

    authSignedOutBorderWidth: "2px",
    authSignedOutShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    authSignedOutColor: "#000000",
    authSignedOutFontWeight: 700,
    authSignedOutDotRadius: 0,

    infoCardShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    botCardBg: "#FFFFCC",
    botCardBorder: "2px solid #000000",
    botCardShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    botTitleWeight: 700,
    botTitleColor: "#FF0000",
    botIconColor: "#FF0000",

    thumbBtnHeight: 32,
    thumbBtnPadding: "0 12px",
    thumbBtnTextTransform: "uppercase",
    thumbBtnLetterSpacing: "0.05em",

    floatingBorderWidth: "2px",
    floatingBg: "#C0C0C0",
    floatingShadow: "inset -2px -2px 0 #808080, inset 2px 2px 0 #ffffff",
    floatingBackdrop: "none",
    floatingPadding: "10px 11px",
    floatingFontWeight: 700,
    contactExpandedPadding: "6px 11px",
    contactCollapsedPadding: "0 9px",
    updateProgressRadius: 0,
    updateActionBtnHeight: 32,
    versionBadgePadding: "6px 11px",
    updateMessageWeight: 700,
    hideContactBelowHeight: 720,
  },

  historyUi: {
    overlayBg: "rgba(128,128,128,0.6)",
    confirmOverlayBg: "rgba(128,128,128,0.72)",
    confirmDialogShadow:
      "inset -2px -2px 0 #808080, inset 2px 2px 0 #ffffff, inset -4px -4px 0 #404040, inset 4px 4px 0 #dfdfdf",
    confirmIconRadius: 0,
    confirmIconBg: "#FFFF00",
    confirmIconBorder: "2px solid #000000",
    confirmIconShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    confirmIconColor: "#FF0000",
    confirmBtnWeight: 700,
    confirmBtnTransform: "uppercase",
    confirmBtnSpacing: "0.05em",
    confirmCancelColor: "#000000",
    confirmCancelShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",
    confirmDeleteBg: "#FF0000",
    confirmDeleteBorder: "2px solid #000000",
    confirmDeleteShadow: "inset -1px -1px 0 #800000, inset 1px 1px 0 #ff5555",

    drawerShadowOpen: "inset -2px -2px 0 #808080, inset 2px 2px 0 #ffffff",
    countBadgeWeight: 700,
    countBadgeRadius: 0,
    countBadgeBg: "#000080",
    countBadgeColor: "#FFFFFF",
    countBadgeBorder: "2px solid #000000",
    countBadgeShadow: "none",

    toolbarWeight: 700,
    toolbarRadius: 0,
    toolbarSelectedBg: "#FFFF00",
    toolbarSelectedBorder: "2px solid #000000",
    toolbarDefaultBorder: "2px solid #000000",
    toolbarSelectedColor: "#000000",
    toolbarShadow: "inset -1px -1px 0 #404040, inset 1px 1px 0 #dfdfdf",

    dangerChipBg: "#FF0000",
    dangerChipBorder: "2px solid #000000",
    dangerChipColor: "#FFFFFF",
    dangerChipShadow: "inset -1px -1px 0 #800000, inset 1px 1px 0 #ff5555",
    plainChipBorder: "2px",

    entryRadius: 0,
    entryBorderW: "2px",
    entrySelectedShadow: "inset 1px 1px 0 #404040, inset -1px -1px 0 #dfdfdf",
    entryTransition: "none",
    entryThumbRadius: 0,
    entryThumbBorder: "2px solid #000000",
    entrySelectedCheckColor: "#000080",
  },
};

export default RETRO_90S;
