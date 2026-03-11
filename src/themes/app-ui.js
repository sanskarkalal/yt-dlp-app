export function getAppUi(C) {
  const neo = Boolean(C.neoMode);

  const defaults = {
    // Sign-out dialog
    signOutOverlayBg: neo ? "rgba(0,0,0,0.38)" : "rgba(2,6,23,0.72)",
    signOutOverlayBackdrop: neo ? "none" : "blur(5px)",
    signOutDialogRadius: neo ? 0 : 14,
    signOutDialogBg: neo ? "#FFF7DB" : C.surface,
    signOutDialogBorderWidth: neo ? "4px" : "1px",
    signOutDialogShadow: neo
      ? "10px 10px 0px 0px #000000"
      : "0 24px 60px rgba(0,0,0,0.45)",
    signOutIconRadius: neo ? 0 : 8,
    signOutIconBg: neo ? "#FFD93D" : "rgba(245,158,11,0.15)",
    signOutIconBorder: neo
      ? "2px solid #000000"
      : "1px solid rgba(245,158,11,0.3)",
    signOutIconColor: neo ? "#000000" : "#fbbf24",
    signOutBtnHeight: neo ? 38 : 34,
    signOutBtnTextTransform: neo ? undefined : "none",
    signOutBtnLetterSpacing: neo ? undefined : "-0.01em",

    // Header title + ambient overlays
    showHalftoneOverlay: neo,
    titleUseSolidColor: neo,
    titleSolidColor: neo ? "#000000" : C.textPrimary,

    // Header + theme picker
    headerDividerHeight: neo ? 3 : 1,
    themePickerTriggerBorderWidth: neo ? "2px" : "1px",
    themePickerTriggerShadow: neo ? "3px 3px 0px 0px #000000" : "none",
    themePickerTriggerFontWeight: neo ? 700 : 500,
    themePickerMenuRadius: neo ? 0 : 10,
    themePickerMenuBorderWidth: neo ? "3px" : "1px",
    themePickerMenuShadow: neo
      ? "6px 6px 0px 0px #000000"
      : "0 14px 28px rgba(0,0,0,0.36)",
    themePickerOptionRadius: neo ? 0 : 8,
    themePickerOptionBorderWidth: neo ? "2px" : "1px",
    themePickerOptionFontWeight: neo ? 700 : 500,
    themePickerOptionSelectedBg: neo
      ? C.secondaryAccent
      : "rgba(247,147,26,0.14)",

    // Auth badge/button
    authSignedInBg: neo ? "#86efac" : "rgba(16,185,129,0.1)",
    authSignedInBorder: neo
      ? "2px solid #000000"
      : "1px solid rgba(16,185,129,0.2)",
    authSignedInShadow: neo ? "3px 3px 0px 0px #000000" : "none",
    authSignedInColor: neo ? "#000000" : "#34d399",
    authSignedInDotRadius: neo ? 0 : "50%",
    authSignedInDotColor: neo ? "#000000" : "#34d399",

    authSignedOutBorderWidth: neo ? "2px" : "1px",
    authSignedOutShadow: neo ? "3px 3px 0px 0px #000000" : "none",
    authSignedOutColor: neo ? C.textPrimary : C.textFaint,
    authSignedOutFontWeight: neo ? 700 : 400,
    authSignedOutDotRadius: neo ? 0 : "50%",

    // Informational cards
    infoCardShadow: neo ? C.shadowSurface : "none",
    botCardBg: neo ? "#FFD93D" : "rgba(245,158,11,0.06)",
    botCardBorder: neo
      ? "4px solid #000000"
      : "1px solid rgba(245,158,11,0.18)",
    botCardShadow: neo ? C.shadowSurface : "none",
    botTitleWeight: neo ? 900 : 600,
    botTitleColor: neo ? "#000000" : "#fde68a",
    botIconColor: "#fbbf24",

    // Thumbnail action
    thumbBtnHeight: neo ? 38 : 32,
    thumbBtnPadding: neo ? "0 10px" : "0 12px",
    thumbBtnTextTransform: neo ? undefined : "none",
    thumbBtnLetterSpacing: neo ? undefined : "-0.01em",

    // Floating panels/buttons
    floatingBorderWidth: neo ? "2px" : "1px",
    floatingBg: C.selectBg,
    floatingShadow: C.shadowSurface,
    floatingBackdrop: C.backdropFilterVal,
    floatingPadding: neo ? "10px 10px" : "10px 11px",
    floatingFontWeight: neo ? 700 : 500,
    contactExpandedPadding: neo ? "6px 10px" : "6px 11px",
    contactCollapsedPadding: "0 9px",
    updateProgressRadius: neo ? 0 : 999,
    updateActionBtnHeight: neo ? 34 : 32,
    versionBadgePadding: neo ? "6px 10px" : "6px 11px",
    updateMessageWeight: neo ? 700 : 600,
    hideContactBelowHeight: 720,
  };

  return { ...defaults, ...(C.appUi || {}) };
}

export function getHistoryUi(C) {
  const neo = Boolean(C.neoMode);

  const defaults = {
    overlayBg: neo ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.6)",
    confirmOverlayBg: neo ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.7)",
    confirmDialogShadow: neo
      ? "12px 12px 0px 0px #000000"
      : "0 32px 80px rgba(0,0,0,0.7)",
    confirmIconRadius: neo ? 0 : 12,
    confirmIconBg: neo ? "#FF6B6B" : "rgba(220,38,38,0.12)",
    confirmIconBorder: neo
      ? "3px solid #000000"
      : "1px solid rgba(220,38,38,0.2)",
    confirmIconShadow: neo ? "4px 4px 0px 0px #000000" : "none",
    confirmIconColor: neo ? "#FFFFFF" : "#f87171",
    confirmBtnWeight: neo ? 700 : 600,
    confirmBtnTransform: neo ? "uppercase" : undefined,
    confirmBtnSpacing: neo ? "0.05em" : undefined,
    confirmCancelColor: neo ? C.textPrimary : C.textMuted,
    confirmCancelShadow: neo ? "4px 4px 0px 0px #000000" : "none",
    confirmDeleteBg: neo ? "#FF6B6B" : "linear-gradient(135deg,#dc2626,#b91c1c)",
    confirmDeleteBorder: neo ? "4px solid #000000" : "none",
    confirmDeleteShadow: neo
      ? "4px 4px 0px 0px #000000"
      : "0 0 20px rgba(220,38,38,0.35)",

    drawerShadowOpen: neo ? "-8px 0 0px 0px #000000" : "-24px 0 64px rgba(0,0,0,0.5)",
    countBadgeWeight: neo ? 700 : 600,
    countBadgeRadius: neo ? 0 : 6,
    countBadgeBg: neo ? "#000000" : C.surfaceHigh,
    countBadgeColor: neo ? "#FFFFFF" : C.textFaint,
    countBadgeBorder: neo ? "2px solid #000000" : "none",
    countBadgeShadow: neo ? "2px 2px 0px 0px #000000" : "none",

    toolbarWeight: neo ? 700 : 500,
    toolbarRadius: neo ? 0 : 8,
    toolbarSelectedBg: neo ? C.secondaryAccent : "rgba(124,58,237,0.15)",
    toolbarSelectedBorder: neo ? "2px solid #000000" : "1px solid rgba(124,58,237,0.3)",
    toolbarDefaultBorder: neo ? "2px solid #000000" : `1px solid ${C.border}`,
    toolbarSelectedColor: neo ? "#000000" : C.violetLight,
    toolbarShadow: neo ? "2px 2px 0px 0px #000000" : "none",

    dangerChipBg: neo ? "#FF6B6B" : "rgba(220,38,38,0.12)",
    dangerChipBorder: neo ? "2px solid #000000" : "1px solid rgba(220,38,38,0.25)",
    dangerChipColor: neo ? "#FFFFFF" : "#f87171",
    dangerChipShadow: neo ? "2px 2px 0px 0px #000000" : "none",
    plainChipBorder: neo ? "2px" : "1px",

    entryRadius: neo ? 0 : 12,
    entryBorderW: neo ? "3px" : "1px",
    entrySelectedShadow: neo ? "4px 4px 0px 0px #000000" : "none",
    entryTransition: neo ? "all 0.1s ease-out" : "all 0.15s",
    entryThumbRadius: neo ? 0 : 8,
    entryThumbBorder: neo ? "2px solid #000000" : "none",
    entrySelectedCheckColor: neo ? "#000000" : "#a78bfa",
  };

  return { ...defaults, ...(C.historyUi || {}) };
}
