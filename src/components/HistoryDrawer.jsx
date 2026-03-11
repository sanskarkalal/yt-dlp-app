import { useEffect, useState } from "react";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  CheckCircle2,
  CheckSquare,
  Clock,
  Folder,
  Image as ImageIcon,
  Loader2,
  Music,
  Scissors,
  Square,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useC } from "../theme";
import { getHistoryUi } from "../themes/app-ui";
import { Badge, IconBtn } from "./ui/Primitives";

function timeAgo(ts) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "just now";
  const d = Date.now() - n;
  if (!Number.isFinite(d) || d < 0) return "just now";
  const m = Math.floor(d / 60000);
  const h = Math.floor(d / 3600000);
  const day = Math.floor(d / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${day}d ago`;
}

function normalizeThumbnailUrl(u) {
  if (!u || typeof u !== "string") return null;
  const s = u.replace(/&amp;/g, "&").trim();
  if (!s) return null;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http://")) return s.replace(/^http:\/\//i, "https://");
  return s;
}

export default function HistoryDrawer({ open, onClose }) {
  const C = useC();
  const H = getHistoryUi(C);
  const [history, setHistory] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState(null);
  const [brokenThumbIds, setBrokenThumbIds] = useState(new Set());

  useEffect(() => {
    if (open) window.electronAPI.getHistory().then(setHistory);
    else setSelectedIds(new Set());
  }, [open]);

  useEffect(() => {
    setBrokenThumbIds(new Set());
  }, [history]);

  const handleClearAll = async () => {
    setClearing(true);
    await window.electronAPI.clearHistory();
    setHistory([]);
    setSelectedIds(new Set());
    setClearing(false);
  };

  const handleRemoveEntry = async (e, entry) => {
    e.stopPropagation();
    await window.electronAPI.deleteHistoryEntry(entry.id);
    setHistory((p) => p.filter((x) => x.id !== entry.id));
    setSelectedIds((p) => {
      const n = new Set(p);
      n.delete(entry.id);
      return n;
    });
  };

  const handleDeleteSelected = () =>
    setConfirmDialog({ type: "bulk", count: selectedIds.size });

  const confirmDelete = async () => {
    setConfirmDialog(null);
    setBulkDeleting(true);
    for (const e of history.filter((e) => selectedIds.has(e.id))) {
      if (e.filePath) await window.electronAPI.deleteFile(e.filePath);
      await window.electronAPI.deleteHistoryEntry(e.id);
    }
    setHistory((p) => p.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
  };

  const toggleSelect = (id) =>
    setSelectedIds((p) => {
      const n = new Set(p);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });

  const toggleAll = () =>
    selectedIds.size === history.length
      ? setSelectedIds(new Set())
      : setSelectedIds(new Set(history.map((e) => e.id)));

  const typeMeta = {
    video: { label: "Video", color: "violet", Icon: Video },
    audio: { label: "Audio", color: "pink", Icon: Music },
    thumbnail: { label: "Thumb", color: "amber", Icon: ImageIcon },
    clip: { label: "Clip", color: "green", Icon: Scissors },
  };

  const allSel = history.length > 0 && selectedIds.size === history.length;

  return (
    <>
      {confirmDialog && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: H.confirmOverlayBg,
            backdropFilter: C.backdropFilterVal,
          }}
        >
          <div
            style={{
              width: 300,
              background: C.selectBg,
              border: `${C.borderW} solid ${C.border}`,
              borderRadius: C.radius,
              padding: "28px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 20,
              boxShadow: H.confirmDialogShadow,
              textAlign: "center",
              fontFamily: C.fontBody || C.fontDisplay,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: H.confirmIconRadius,
                  background: H.confirmIconBg,
                  border: H.confirmIconBorder,
                  boxShadow: H.confirmIconShadow,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Trash2 size={18} style={{ color: H.confirmIconColor }} />
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 15,
                  fontWeight: 700,
                  color: C.textPrimary,
                  textAlign: "center",
                }}
              >
                Delete {confirmDialog.count} item
                {confirmDialog.count > 1 ? "s" : ""}?
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: C.textFaint,
                  lineHeight: 1.6,
                  textAlign: "center",
                }}
              >
                This will delete the selected item
                {confirmDialog.count > 1 ? "s" : ""} and their files from disk.
              </p>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => setConfirmDialog(null)}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: C.radius,
                  fontSize: 13,
                  fontWeight: H.confirmBtnWeight,
                  textTransform: H.confirmBtnTransform,
                  letterSpacing: H.confirmBtnSpacing,
                  background: C.surfaceHigh,
                  border: `${C.borderW} solid ${C.border}`,
                  color: H.confirmCancelColor,
                  cursor: "pointer",
                  boxShadow: H.confirmCancelShadow,
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                style={{
                  flex: 1,
                  height: 38,
                  borderRadius: C.radius,
                  fontSize: 13,
                  fontWeight: H.confirmBtnWeight,
                  textTransform: H.confirmBtnTransform,
                  letterSpacing: H.confirmBtnSpacing,
                  background: H.confirmDeleteBg,
                  border: H.confirmDeleteBorder,
                  color: "#fff",
                  cursor: "pointer",
                  boxShadow: H.confirmDeleteShadow,
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: H.overlayBg,
          backdropFilter: C.backdropFilterVal,
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.25s",
        }}
      />
      <div
        style={{
          position: "fixed",
          top: 0,
          right: 0,
          height: "100%",
          zIndex: 50,
          width: 420,
          display: "flex",
          flexDirection: "column",
          background: C.historyBg,
          borderLeft: `${C.borderW} solid ${C.border}`,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? H.drawerShadowOpen : "none",
          fontFamily: C.fontBody || C.fontDisplay,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "52px 20px 14px",
            borderBottom: `${C.borderW} solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={15} style={{ color: C.textFaint }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}>
              History
            </span>
            {history.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: H.countBadgeWeight,
                  padding: "2px 6px",
                  borderRadius: H.countBadgeRadius,
                  background: H.countBadgeBg,
                  color: H.countBadgeColor,
                  border: H.countBadgeBorder,
                  boxShadow: H.countBadgeShadow,
                }}
              >
                {history.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {history.length > 0 && (
              <button
                onClick={toggleAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: H.toolbarWeight,
                  padding: "4px 10px",
                  borderRadius: H.toolbarRadius,
                  background: allSel
                    ? H.toolbarSelectedBg
                    : C.surfaceHigh,
                  border: allSel ? H.toolbarSelectedBorder : H.toolbarDefaultBorder,
                  color: allSel ? H.toolbarSelectedColor : C.textMuted,
                  boxShadow: H.toolbarShadow,
                  cursor: "pointer",
                }}
              >
                {allSel ? <CheckSquare size={12} /> : <Square size={12} />}
                {allSel ? "Deselect all" : "Select all"}
              </button>
            )}
            {selectedIds.size > 0 ? (
              <button
                onClick={handleDeleteSelected}
                disabled={bulkDeleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: H.confirmBtnWeight,
                  padding: "4px 10px",
                  borderRadius: H.toolbarRadius,
                  background: H.dangerChipBg,
                  border: H.dangerChipBorder,
                  color: H.dangerChipColor,
                  boxShadow: H.dangerChipShadow,
                  cursor: "pointer",
                }}
              >
                {bulkDeleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Delete ({selectedIds.size})
              </button>
            ) : history.length > 0 ? (
              <button
                onClick={handleClearAll}
                disabled={clearing}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: H.toolbarWeight,
                  padding: "4px 10px",
                  borderRadius: H.toolbarRadius,
                  background: C.surfaceHigh,
                  border: `${H.plainChipBorder} solid ${C.border}`,
                  color: C.textMuted,
                  boxShadow: H.toolbarShadow,
                  cursor: "pointer",
                }}
              >
                {clearing ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}
                Clear all
              </button>
            ) : null}
            <IconBtn title="Close history" onClick={onClose}>
              <X size={13} />
            </IconBtn>
          </div>
        </div>

        <ScrollArea.Root style={{ flex: 1, overflow: "hidden" }}>
          <ScrollArea.Viewport style={{ height: "100%", width: "100%" }}>
            {history.length === 0 ? (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  height: 240,
                  gap: 10,
                  color: C.textFaint,
                }}
              >
                <Clock size={28} strokeWidth={1.5} />
                <span style={{ fontSize: 13 }}>No downloads yet</span>
              </div>
            ) : (
              <div
                style={{
                  padding: "8px 10px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {history.map((entry) => {
                  const meta = typeMeta[entry.type] || typeMeta.video;
                  const isSel = selectedIds.has(entry.id);

                  return (
                    <div
                      key={entry.id}
                      onClick={() => toggleSelect(entry.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 8,
                        padding: "8px 10px",
                        borderRadius: H.entryRadius,
                        cursor: "pointer",
                        background: isSel ? C.selectionBg : C.surface,
                        border: `${H.entryBorderW} solid ${isSel ? C.selectionBorder : C.border}`,
                        boxShadow: isSel ? H.entrySelectedShadow : "none",
                        transition: H.entryTransition,
                        width: "100%",
                        boxSizing: "border-box",
                      }}
                    >
                      <div
                        style={{
                          width: 52,
                          height: 36,
                          borderRadius: H.entryThumbRadius,
                          overflow: "hidden",
                          background: C.surfaceHigh,
                          flexShrink: 0,
                          position: "relative",
                          border: H.entryThumbBorder,
                        }}
                      >
                        {normalizeThumbnailUrl(entry.thumbnail) &&
                        !brokenThumbIds.has(entry.id) ? (
                          <img
                            src={normalizeThumbnailUrl(entry.thumbnail)}
                            alt=""
                            onError={() =>
                              setBrokenThumbIds((prev) => new Set(prev).add(entry.id))
                            }
                            style={{
                              width: "100%",
                              height: "100%",
                              objectFit: "cover",
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: "100%",
                              height: "100%",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: C.textFaint,
                            }}
                          >
                            <meta.Icon size={14} />
                          </div>
                        )}
                        {isSel && (
                          <div
                            style={{
                              position: "absolute",
                              inset: 0,
                              background: C.selectionOverlay,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckCircle2 size={14} style={{ color: H.entrySelectedCheckColor }} />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, width: 0 }}>
                        <p
                          style={{
                            fontSize: 12,
                            fontWeight: 500,
                            color: C.textPrimary,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                            margin: 0,
                          }}
                        >
                          {entry.title}
                        </p>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginTop: 3,
                          }}
                        >
                          <Badge color={meta.color}>{meta.label}</Badge>
                          {entry.quality && (
                            <span
                              style={{
                                fontSize: 10,
                                color: C.textFaint,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {entry.quality}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            marginTop: 2,
                            fontSize: 10,
                            color: C.textFaint,
                          }}
                        >
                          {timeAgo(entry.ts)}
                        </div>
                      </div>
                      <div
                        style={{ display: "flex", gap: 2, flexShrink: 0 }}
                        onClick={(e) => e.stopPropagation()}
                      >
                        {entry.filePath && (
                          <IconBtn
                            title="Show in folder"
                            onClick={() =>
                              window.electronAPI.showInFolder(entry.filePath)
                            }
                          >
                            <Folder size={13} />
                          </IconBtn>
                        )}
                        <IconBtn
                          title="Remove from history"
                          onClick={(e) => handleRemoveEntry(e, entry)}
                        >
                          <X size={13} />
                        </IconBtn>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea.Viewport>
          <ScrollArea.Scrollbar
            orientation="vertical"
            style={{ width: 6, padding: 2 }}
          >
            <ScrollArea.Thumb
              style={{ background: C.borderHover, borderRadius: 99 }}
            />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>
    </>
  );
}
