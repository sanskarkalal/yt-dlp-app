import { useState, useEffect, useRef, useCallback } from "react";
import iconPng from "./assets/icon.png";

function formatDuration(secs) {
  if (!secs) return "0:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Returns the best default container for a given codec
function defaultContainerForCodec(codec) {
  if (codec === "VP9" || codec === "AV1") return "webm";
  return "mp4"; // H264, H265, everything else
}

function timeToSecs(t) {
  if (!t) return null;
  const parts = t.split(":").map(Number);
  if (parts.some(isNaN)) return null;
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  return null;
}

function secsToTime(s) {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

function isValidTime(t) {
  return /^\d+:\d{2}(:\d{2})?$/.test(t.trim());
}

function formatDate(ts) {
  const d = new Date(ts);
  return (
    d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }) +
    " · " +
    d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })
  );
}

function RangeSlider({ min, max, startVal, endVal, onChange }) {
  const trackRef = useRef(null);
  const dragging = useRef(null);

  const clamp = (v) => Math.max(min, Math.min(max, v));
  const toPercent = (v) => ((v - min) / (max - min)) * 100;

  const getVal = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = (e.clientX - rect.left) / rect.width;
    return clamp(min + ratio * (max - min));
  };

  const onMouseDown = (thumb) => (e) => {
    e.preventDefault();
    dragging.current = thumb;
    const move = (ev) => {
      const v = getVal(ev);
      if (dragging.current === "start") {
        onChange(Math.min(v, endVal - 1), endVal);
      } else {
        onChange(startVal, Math.max(v, startVal + 1));
      }
    };
    const up = () => {
      dragging.current = null;
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };

  const startPct = toPercent(startVal);
  const endPct = toPercent(endVal);

  return (
    <div
      ref={trackRef}
      className="relative h-6 flex items-center cursor-pointer select-none"
    >
      {/* Track background */}
      <div className="absolute inset-x-0 h-1 rounded-full bg-white/10" />
      {/* Active range */}
      <div
        className="absolute h-1 rounded-full"
        style={{
          left: `${startPct}%`,
          width: `${endPct - startPct}%`,
          background: "linear-gradient(90deg, #7c3aed, #db2777)",
        }}
      />
      {/* Start thumb */}
      <div
        onMouseDown={onMouseDown("start")}
        className="absolute w-4 h-4 rounded-full border-2 border-violet-400 bg-[#0a0a0f] cursor-grab active:cursor-grabbing shadow-lg"
        style={{ left: `calc(${startPct}% - 8px)`, zIndex: 2 }}
      />
      {/* End thumb */}
      <div
        onMouseDown={onMouseDown("end")}
        className="absolute w-4 h-4 rounded-full border-2 border-pink-400 bg-[#0a0a0f] cursor-grab active:cursor-grabbing shadow-lg"
        style={{ left: `calc(${endPct}% - 8px)`, zIndex: 2 }}
      />
    </div>
  );
}

// ─── History Drawer ────────────────────────────────────────────────────────────
function HistoryDrawer({ open, onClose }) {
  const [history, setHistory] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (open) window.electronAPI.getHistory().then(setHistory);
    else setSelectedIds(new Set()); // clear selection when drawer closes
  }, [open]);

  const handleClearAll = async () => {
    setClearing(true);
    await window.electronAPI.clearHistory();
    setHistory([]);
    setSelectedIds(new Set());
    setClearing(false);
  };

  const handleDeleteEntry = async (entry) => {
    setDeletingId(entry.id);
    if (entry.filePath) await window.electronAPI.deleteFile(entry.filePath);
    await window.electronAPI.deleteHistoryEntry(entry.id);
    setHistory((prev) => prev.filter((e) => e.id !== entry.id));
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.delete(entry.id);
      return n;
    });
    setDeletingId(null);
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === history.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(history.map((e) => e.id)));
    }
  };

  const handleBulkDelete = async () => {
    setBulkDeleting(true);
    const toDelete = history.filter((e) => selectedIds.has(e.id));
    for (const entry of toDelete) {
      if (entry.filePath) await window.electronAPI.deleteFile(entry.filePath);
      await window.electronAPI.deleteHistoryEntry(entry.id);
    }
    setHistory((prev) => prev.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setShowConfirm(false);
    setBulkDeleting(false);
  };

  const typeBadge = (type) => {
    const map = {
      video: {
        label: "Video",
        bg: "rgba(124,58,237,0.15)",
        border: "rgba(124,58,237,0.35)",
        color: "#a78bfa",
      },
      audio: {
        label: "Audio",
        bg: "rgba(236,72,153,0.15)",
        border: "rgba(236,72,153,0.35)",
        color: "#f472b6",
      },
      thumbnail: {
        label: "Thumb",
        bg: "rgba(245,158,11,0.15)",
        border: "rgba(245,158,11,0.35)",
        color: "#fbbf24",
      },
      clip: {
        label: "Clip",
        bg: "rgba(16,185,129,0.15)",
        border: "rgba(16,185,129,0.35)",
        color: "#34d399",
      },
    };
    const s = map[type] || map.video;
    return (
      <span
        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border"
        style={{ background: s.bg, borderColor: s.border, color: s.color }}
      >
        {s.label}
      </span>
    );
  };

  const allSelected = history.length > 0 && selectedIds.size === history.length;
  const someSelected = selectedIds.size > 0;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 transition-opacity duration-300"
        style={{
          background: "rgba(0,0,0,0.5)",
          opacity: open ? 1 : 0,
          pointerEvents: open ? "auto" : "none",
        }}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="fixed top-0 right-0 h-full z-50 flex flex-col"
        style={{
          width: "440px",
          background: "linear-gradient(180deg, #0f0f1a 0%, #0a0a0f 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.08)",
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          boxShadow: open ? "-20px 0 60px rgba(0,0,0,0.6)" : "none",
        }}
      >
        {/* Drawer Header */}
        <div
          className="flex items-center justify-between px-5 flex-shrink-0"
          style={{
            borderBottom: "1px solid rgba(255,255,255,0.06)",
            paddingTop: "52px",
            paddingBottom: "14px",
          }}
        >
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-white/40"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span className="text-sm font-semibold text-white/70">History</span>
            {history.length > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full font-mono"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.3)",
                }}
              >
                {history.length}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5">
            {/* Select all toggle — only when history exists */}
            {history.length > 0 && (
              <button
                onClick={toggleSelectAll}
                className="text-[8px] font-medium px-1.5 py-0.8 rounded-lg transition-colors"
                style={{
                  background: allSelected
                    ? "rgba(124,58,237,0.2)"
                    : "rgba(255,255,255,0.05)",
                  border: `1px solid ${allSelected ? "rgba(124,58,237,0.4)" : "rgba(255,255,255,0.1)"}`,
                  color: allSelected ? "#a78bfa" : "rgba(255,255,255,0.4)",
                }}
              >
                {allSelected ? "Deselect all" : "Select all"}
              </button>
            )}
            {/* Clear all — only when nothing is selected */}
            {history.length > 0 && !someSelected && (
              <button
                onClick={handleClearAll}
                disabled={clearing}
                title="Clear all history"
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-200 disabled:opacity-40"
                style={{
                  background: "rgba(220,38,38,0.12)",
                  border: "1px solid rgba(220,38,38,0.35)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(220,38,38,0.22)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(220,38,38,0.12)";
                  e.currentTarget.style.transform = "translateY(0px)";
                }}
              >
                {clearing ? "⏳" : "🧹"}
              </button>
            )}
            {/* Delete selected button — only when items selected */}
            {someSelected && (
              <button
                onClick={() => setShowConfirm(true)}
                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-xl transition-all duration-200"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(220,38,38,0.25), rgba(185,28,28,0.25))",
                  border: "1px solid rgba(220,38,38,0.45)",
                  color: "#f87171",
                  boxShadow: "0 0 12px rgba(220,38,38,0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, rgba(220,38,38,0.4), rgba(185,28,28,0.4))";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background =
                    "linear-gradient(135deg, rgba(220,38,38,0.25), rgba(185,28,28,0.25))";
                }}
              >
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
                Delete {selectedIds.size}
              </button>
            )}
            <button
              onClick={onClose}
              title="Close"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-200"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                e.currentTarget.style.transform = "translateY(0px)";
              }}
            >
              ❌
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto scrollbar-hide px-4 py-3 space-y-3">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-white/20 pb-16">
              <svg
                className="w-10 h-10"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <p className="text-sm">No downloads yet</p>
            </div>
          ) : (
            history.map((entry) => {
              const isSelected = selectedIds.has(entry.id);
              return (
                <div
                  key={entry.id}
                  className="rounded-xl overflow-hidden"
                  style={{
                    background: isSelected
                      ? "rgba(124,58,237,0.1)"
                      : "rgba(255,255,255,0.03)",
                    border: `1px solid ${isSelected ? "rgba(124,58,237,0.35)" : "rgba(255,255,255,0.07)"}`,
                    transition: "background 0.15s, border-color 0.15s",
                  }}
                >
                  {/* Card top */}
                  <div className="flex gap-3 p-3">
                    {/* Checkbox */}
                    <div
                      onClick={() => toggleSelect(entry.id)}
                      className="flex-shrink-0 self-center cursor-pointer"
                      style={{ marginLeft: "-2px" }}
                    >
                      <div
                        className="w-4 h-4 rounded flex items-center justify-center transition-all duration-150"
                        style={{
                          background: isSelected
                            ? "linear-gradient(135deg, #7c3aed, #db2777)"
                            : "rgba(255,255,255,0.07)",
                          border: `1.5px solid ${isSelected ? "transparent" : "rgba(255,255,255,0.2)"}`,
                        }}
                      >
                        {isSelected && (
                          <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={3}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        )}
                      </div>
                    </div>

                    {entry.thumbnail ? (
                      <img
                        src={entry.thumbnail}
                        alt=""
                        className="w-20 h-12 object-cover rounded-lg flex-shrink-0"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                    ) : (
                      <div
                        className="w-20 h-12 rounded-lg flex-shrink-0 flex items-center justify-center"
                        style={{ background: "rgba(255,255,255,0.05)" }}
                      >
                        <svg
                          className="w-5 h-5 text-white/20"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      <p className="text-xs font-medium text-white/80 line-clamp-2 leading-snug">
                        {entry.title}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {typeBadge(entry.type)}
                        {entry.quality && (
                          <span className="text-[10px] text-white/25 font-mono">
                            {entry.quality}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card bottom: date + actions */}
                  <div
                    className="flex items-center justify-between px-3 py-2 gap-2"
                    style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span className="text-[10px] text-white/25 font-mono truncate">
                      {formatDate(entry.id)}
                    </span>
                    <button
                      onClick={() =>
                        window.electronAPI.showInFolder(entry.filePath)
                      }
                      title="Show in Finder / Explorer"
                      className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-lg transition-all duration-150"
                      style={{
                        background: "rgba(124,58,237,0.12)",
                        border: "1px solid rgba(124,58,237,0.25)",
                        color: "#a78bfa",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background =
                          "rgba(124,58,237,0.25)";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          "rgba(124,58,237,0.12)";
                      }}
                    >
                      <svg
                        className="w-3 h-3"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                        />
                      </svg>
                      Show
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center"
          style={{ background: "rgba(0,0,0,0.7)" }}
        >
          <div
            className="flex flex-col gap-4 p-6 rounded-2xl"
            style={{
              width: "320px",
              background: "linear-gradient(180deg, #16162a 0%, #0f0f1a 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.8)",
            }}
          >
            {/* Icon + title */}
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.3)",
                }}
              >
                <svg
                  className="w-5 h-5"
                  style={{ color: "#f87171" }}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-white/90">
                  Delete {selectedIds.size} file
                  {selectedIds.size > 1 ? "s" : ""}?
                </p>
                <p className="text-[11px] text-white/40 mt-0.5">
                  Files will be moved to trash
                </p>
              </div>
            </div>

            {/* File list preview (max 4) */}
            <div
              className="rounded-xl px-3 py-2 space-y-1.5"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {history
                .filter((e) => selectedIds.has(e.id))
                .slice(0, 4)
                .map((e) => (
                  <p key={e.id} className="text-[11px] text-white/50 truncate">
                    · {e.title}
                  </p>
                ))}
              {selectedIds.size > 4 && (
                <p className="text-[11px] text-white/30">
                  · and {selectedIds.size - 4} more...
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                style={{
                  background: "rgba(255,255,255,0.07)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  color: "rgba(255,255,255,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.12)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.07)";
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={bulkDeleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-60 flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                  boxShadow: bulkDeleting
                    ? "none"
                    : "0 0 20px rgba(220,38,38,0.4)",
                  color: "white",
                }}
              >
                {bulkDeleting ? (
                  <>
                    <svg
                      className="animate-spin w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"
                      />
                    </svg>
                    Deleting...
                  </>
                ) : (
                  "Delete"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ─── Main App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedHeight, setSelectedHeight] = useState(null);
  const [selectedCodec, setSelectedCodec] = useState(null);
  const [selectedBitrate, setSelectedBitrate] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState("mp4");
  const [savePath, setSavePath] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [cookiesOk, setCookiesOk] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [pendingUrl, setPendingUrl] = useState(null);
  const [clipStart, setClipStart] = useState("");
  const [clipEnd, setClipEnd] = useState("");
  const [thumbDone, setThumbDone] = useState(false);
  const [thumbDownloading, setThumbDownloading] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [audioQuality, setAudioQuality] = useState("192");
  const [audioTrackId, setAudioTrackId] = useState("bestaudio/best");
  const [audioContainer, setAudioContainer] = useState("mp3");
  // NEW — history only
  const [historyOpen, setHistoryOpen] = useState(false);

  const progressRef = useRef(0);
  const animFrameRef = useRef(null);

  const duration = videoInfo?.duration || 0;
  const sliderStart = timeToSecs(clipStart) ?? 0;
  const sliderEnd = timeToSecs(clipEnd) ?? duration;

  const handleSliderChange = useCallback((newStart, newEnd) => {
    setClipStart(secsToTime(newStart));
    setClipEnd(secsToTime(newEnd));
    setDone(false);
  }, []);

  useEffect(() => {
    window.electronAPI.getDownloadsPath().then(setSavePath);
    window.electronAPI.getCookiesStatus().then(setCookiesOk);
    window.electronAPI.onCookiesStatus((ok) => setCookiesOk(ok));
  }, []);

  useEffect(() => {
    const target = progress;
    const animate = () => {
      progressRef.current += (target - progressRef.current) * 0.15;
      setSmoothProgress(parseFloat(progressRef.current.toFixed(2)));
      if (Math.abs(progressRef.current - target) > 0.1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        progressRef.current = target;
        setSmoothProgress(target);
      }
    };
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [progress]);

  const fetchInfo = async (urlToFetch = url) => {
    if (!urlToFetch.trim()) return;
    setLoading(true);
    setVideoInfo(null);
    setDone(false);
    setThumbDone(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setShowLoginPrompt(false);
    setClipStart("");
    setClipEnd("");
    setAudioTrackId("bestaudio/best");
    try {
      const info = await window.electronAPI.getVideoInfo(urlToFetch);
      if (info?.ageRestricted) {
        setPendingUrl(urlToFetch);
        setShowLoginPrompt(true);
        setStatus("");
        return;
      }
      setVideoInfo(info);
      if (info.rawFormats?.length > 0) {
        const heights = [...new Set(info.rawFormats.map((f) => f.height))].sort(
          (a, b) => b - a,
        );
        const firstHeight = heights[0];
        setSelectedHeight(firstHeight);
        const codecsAtHeight = [
          ...new Set(
            info.rawFormats
              .filter((f) => f.height === firstHeight)
              .map((f) => f.codec),
          ),
        ];
        setSelectedCodec(codecsAtHeight[0] || null);
        const bitratesAtHeightCodec = info.rawFormats
          .filter(
            (f) => f.height === firstHeight && f.codec === codecsAtHeight[0],
          )
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        setSelectedBitrate(bitratesAtHeightCodec[0]?.bitrate ?? null);
        setSelectedContainer(defaultContainerForCodec(codecsAtHeight[0] || ""));
      }
    } catch (err) {
      if (err?.message?.includes("AGE_RESTRICTED")) {
        setPendingUrl(urlToFetch);
        setShowLoginPrompt(true);
        setStatus("");
      } else {
        setStatus("Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeLogin = async () => {
    setLoggingIn(true);
    setShowLoginPrompt(false);
    setStatus("Waiting for YouTube sign-in...");
    try {
      const success = await window.electronAPI.openYouTubeLogin();
      if (success) {
        setCookiesOk(true);

        await fetchInfo(pendingUrl);
        setPendingUrl(null);
      } else {
        setStatus("Sign-in cancelled or failed.");
      }
    } catch (err) {
      setStatus("Error: " + err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const pickFolder = async () => {
    const p = await window.electronAPI.selectFolder();
    if (p) setSavePath(p);
  };

  const startDownload = async () => {
    if (!url || !savePath) {
      setStatus("Please fill in all fields");
      return;
    }
    if (!audioOnly && !selectedHeight) {
      setStatus("Please select a format");
      return;
    }
    if (
      (clipStart && !isValidTime(clipStart)) ||
      (clipEnd && !isValidTime(clipEnd))
    ) {
      setStatus("Invalid time format. Use MM:SS or HH:MM:SS");
      return;
    }
    if (clipStart && !clipEnd) {
      setStatus("Please enter a clip end time.");
      return;
    }
    if (!clipStart && clipEnd) {
      setStatus("Please enter a clip start time.");
      return;
    }

    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setDone(false);
    setDownloading(true);
    setStatus("Starting download...");
    window.electronAPI.onProgress((percent) => {
      setProgress(percent);
      setStatus("Downloading...");
    });
    try {
      const selectedRaw = videoInfo?.rawFormats?.find(
        (f) =>
          f.height === selectedHeight &&
          f.codec === selectedCodec &&
          f.bitrate === selectedBitrate,
      );
      const resolvedFormatId =
        selectedRaw?.format_id ??
        (() => {
          // fallback: best format at selected height
          const fallback = videoInfo?.rawFormats
            ?.filter((f) => f.height === selectedHeight)
            .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];
          return fallback?.format_id || "bestvideo+bestaudio";
        })();

      const result = await window.electronAPI.download({
        url,
        formatId: resolvedFormatId,
        container: selectedContainer,
        savePath,
        clipStart: clipStart.trim() || null,
        clipEnd: clipEnd.trim() || null,
        audioOnly,
        audioQuality,
        audioTrackId: audioOnly ? audioTrackId : null,
        audioContainer: audioOnly ? audioContainer : null,
      });

      setProgress(100);
      setDone(true);
      setStatus(
        audioOnly
          ? "Audio downloaded!"
          : clipStart
            ? "Clip downloaded!"
            : "Download complete!",
      );

      // Save to history
      const type = audioOnly
        ? "audio"
        : clipStart && clipEnd
          ? "clip"
          : "video";
      const quality = audioOnly
        ? `${audioContainer.toUpperCase()} · ${audioQuality}kbps`
        : selectedHeight
          ? `${selectedHeight}p ${selectedContainer.toUpperCase()}`
          : null;
      await window.electronAPI.addHistory({
        title: videoInfo?.title || url,
        thumbnail: videoInfo?.thumbnail || null,
        type,
        quality,
        filePath: result?.filePath || null,
        url,
      });
    } catch (err) {
      setStatus(
        err.message.includes("cancel")
          ? "Download cancelled"
          : "Error: " + err.message,
      );
    } finally {
      setDownloading(false);
    }
  };

  const cancelDownload = async () => {
    await window.electronAPI.cancelDownload();
    setDownloading(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setStatus("Download cancelled");
  };

  const downloadThumbnail = async () => {
    if (!videoInfo || !savePath) return;
    setThumbDownloading(true);
    setStatus("Saving thumbnail...");
    try {
      const thumbs = videoInfo.thumbnails || [];
      const best = thumbs
        .filter((t) => t.url)
        .sort(
          (a, b) =>
            (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
        )[0];
      const thumbnailUrl = best?.url || videoInfo.thumbnail;
      const filePath = await window.electronAPI.downloadThumbnail({
        thumbnailUrl,
        title: videoInfo.title,
        savePath,
      });
      setThumbDone(true);
      setStatus("Thumbnail saved!");

      // Save to history
      await window.electronAPI.addHistory({
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail || null,
        type: "thumbnail",
        quality: "JPG",
        filePath: filePath || null,
        url,
      });
    } catch (err) {
      setStatus("Error saving thumbnail: " + err.message);
    } finally {
      setThumbDownloading(false);
    }
  };

  const AuthPill = () => {
    if (cookiesOk) {
      return (
        <button
          onClick={async () => {
            await window.electronAPI.clearCookies();
            setCookiesOk(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors group"
          title="Signed in — click to sign out"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-emerald-400">Signed in</span>
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        <span className="text-[11px] text-white/30">Not signed in</span>
      </div>
    );
  };

  return (
    <div
      className="h-screen w-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* NEW: History drawer */}
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />

      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-pink-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-blue-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-8 pt-4 pb-8 gap-4 overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ WebkitAppRegion: "drag" }}
        >
          <div className="flex items-center gap-2 select-none">
            <img
              src={iconPng}
              alt="App Icon"
              className="w-10 h-10 object-contain select-none"
            />
            <span
              className="text-xs font-black uppercase tracking-widest"
              style={{
                background: "linear-gradient(90deg, #a78bfa, #f472b6, #fb923c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontStyle: "italic",
              }}
            >
              Seedhe Download
            </span>
          </div>
          {/* NEW: history button + existing AuthPill, wrapped in no-drag */}
          <div
            className="flex items-center gap-2"
            style={{ WebkitAppRegion: "no-drag" }}
          >
            <button
              onClick={() => setHistoryOpen(true)}
              title="Download history"
              className="w-9 h-9 rounded-xl flex items-center justify-center text-lg transition-all duration-200"
              style={{
                background:
                  "linear-gradient(135deg, rgba(124,58,237,0.22), rgba(219,39,119,0.18))",
                border: "1px solid rgba(255,255,255,0.14)",
                boxShadow: "0 0 18px rgba(124,58,237,0.22)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 0 26px rgba(219,39,119,0.35)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0px)";
                e.currentTarget.style.boxShadow =
                  "0 0 18px rgba(124,58,237,0.22)";
              }}
            >
              🕐
            </button>
            <AuthPill />
          </div>
        </div>

        {/* URL Bar */}
        <div className="relative group flex-shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-pink-500/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
          <div className="relative flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 backdrop-blur-sm focus-within:border-white/20 transition-colors">
            <input
              type="text"
              placeholder="Paste YouTube URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchInfo()}
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/20 text-white"
            />
            {url.trim() && (
              <button
                onClick={async () => {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text.trim()) {
                      setUrl(text.trim());
                      await fetchInfo(text.trim());
                    }
                  } catch {}
                }}
                disabled={loading}
                title="Paste new URL"
                className="px-3 py-2 rounded-lg text-lg transition-all duration-200 disabled:opacity-30"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                📋
              </button>
            )}
            <button
              onClick={async () => {
                if (!url.trim()) {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text.trim()) {
                      setUrl(text.trim());
                      await fetchInfo(text.trim());
                    }
                  } catch {}
                } else {
                  fetchInfo();
                }
              }}
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-30 flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                boxShadow: loading ? "none" : "0 0 20px rgba(124,58,237,0.4)",
              }}
            >
              {loading ? (
                <svg
                  className="animate-spin w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
              ) : url.trim() ? (
                "🔎"
              ) : (
                "📋"
              )}
            </button>
          </div>
        </div>
        {/* Age restriction prompt */}
        {showLoginPrompt && (
          <div className="flex-shrink-0 bg-white/5 border border-white/15 rounded-xl p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">
              🔞
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/80">
                Age-restricted video
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Sign in to YouTube to access this video
              </p>
            </div>
            <button
              onClick={handleYouTubeLogin}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-colors flex-shrink-0"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              Sign in to YouTube
            </button>
          </div>
        )}

        {loggingIn && (
          <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <svg
              className="animate-spin w-4 h-4 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <span className="text-sm text-white/40">
              Waiting for YouTube sign-in...
            </span>
          </div>
        )}

        {/* Content area */}
        <div className="flex gap-6 flex-1">
          {/* Left — video info */}
          {videoInfo ? (
            <div className="w-72 flex-shrink-0 flex flex-col gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {videoInfo.thumbnail && (
                  <div className="relative">
                    <img
                      src={videoInfo.thumbnail}
                      alt="thumbnail"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      {formatDuration(videoInfo.duration)}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                )}

                {/* Thumbnail download button */}
                <div className="px-3 pt-3 pb-0">
                  <button
                    onClick={downloadThumbnail}
                    disabled={!savePath || thumbDownloading || thumbDone}
                    title="Save thumbnail as JPG"
                    className="w-full py-2 rounded-xl font-semibold text-xs transition-all duration-300 disabled:opacity-30 flex items-center justify-center gap-1.5"
                    style={{
                      background: thumbDone
                        ? "linear-gradient(135deg, #059669, #10b981)"
                        : "linear-gradient(135deg, #d97706, #f59e0b)",
                      boxShadow:
                        thumbDone || !savePath
                          ? "none"
                          : "0 0 14px rgba(217,119,6,0.3)",
                    }}
                  >
                    {thumbDownloading ? (
                      <svg
                        className="animate-spin w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                    ) : thumbDone ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Saved
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Save Thumbnail
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4">
                  <p className="font-semibold text-sm leading-snug line-clamp-2 text-white/90">
                    {videoInfo.title}
                  </p>
                  <p className="text-white/40 text-xs mt-1.5">
                    {videoInfo.uploader}
                  </p>
                </div>
              </div>

              {!audioOnly && selectedHeight && (
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const f = videoInfo?.rawFormats?.find(
                      (r) =>
                        r.height === selectedHeight &&
                        r.codec === selectedCodec &&
                        r.bitrate === selectedBitrate,
                    );
                    return (
                      <>
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 font-mono">
                          {f?.width && f?.height
                            ? `${f.width}×${f.height}`
                            : `${selectedHeight}p`}
                        </span>
                        {selectedCodec && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/20 font-mono">
                            {selectedCodec}
                          </span>
                        )}
                        {selectedBitrate && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-mono">
                            {selectedBitrate} kbps
                          </span>
                        )}
                        {f?.fps && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-mono">
                            {f.fps} fps
                          </span>
                        )}
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-mono">
                          {selectedContainer.toUpperCase()}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}

              {audioOnly && (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 font-mono">
                    {audioContainer.toUpperCase()} · {audioQuality}kbps
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/20">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <p className="text-sm">
                Paste a YouTube URL above to get started
              </p>
            </div>
          )}

          {/* Right — controls */}
          {videoInfo && (
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Video / Audio toggle */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 self-start">
                <button
                  onClick={() => {
                    setAudioOnly(false);
                    setDone(false);
                  }}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: !audioOnly
                      ? "linear-gradient(135deg, #7c3aed, #db2777)"
                      : "transparent",
                    color: !audioOnly ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  Video
                </button>
                <button
                  onClick={() => {
                    setAudioOnly(true);
                    setDone(false);
                  }}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: audioOnly
                      ? "linear-gradient(135deg, #7c3aed, #db2777)"
                      : "transparent",
                    color: audioOnly ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  Audio only
                </button>
              </div>

              {/* Video controls — cascading selectors */}
              {!audioOnly &&
                (() => {
                  const raw = videoInfo.rawFormats || [];

                  const heights = [...new Set(raw.map((f) => f.height))].sort(
                    (a, b) => b - a,
                  );
                  const codecsAtHeight = [
                    ...new Set(
                      raw
                        .filter((f) => f.height === selectedHeight)
                        .map((f) => f.codec),
                    ),
                  ];
                  const matchingFormats = raw
                    .filter(
                      (f) =>
                        f.height === selectedHeight &&
                        f.codec === selectedCodec,
                    )
                    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

                  const selectCls =
                    "w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors cursor-pointer text-white/80";
                  const optCls = "bg-[#1a1a2e]";
                  const Chevron = () => (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  );

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Resolution */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Resolution
                        </label>
                        <div className="relative">
                          <select
                            value={selectedHeight ? selectedHeight : ""}
                            onChange={(e) => {
                              const h = Number(e.target.value);
                              setSelectedHeight(h);
                              const codecs = [
                                ...new Set(
                                  raw
                                    .filter((f) => f.height === h)
                                    .map((f) => f.codec),
                                ),
                              ];
                              setSelectedCodec(codecs[0] || null);
                              const brs = raw
                                .filter(
                                  (f) =>
                                    f.height === h && f.codec === codecs[0],
                                )
                                .sort(
                                  (a, b) => (b.bitrate || 0) - (a.bitrate || 0),
                                );
                              setSelectedBitrate(brs[0]?.bitrate ?? null);
                              setSelectedContainer(
                                defaultContainerForCodec(codecs[0] || ""),
                              );
                              setDone(false);
                            }}
                            className={selectCls}
                          >
                            {heights.map((h) => (
                              <option key={h} value={h} className={optCls}>
                                {h}p
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </div>
                      </div>

                      {/* Codec */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Codec
                        </label>
                        <div className="relative">
                          <select
                            value={selectedCodec ?? ""}
                            onChange={(e) => {
                              setSelectedCodec(e.target.value);
                              const brs = raw
                                .filter(
                                  (f) =>
                                    f.height === selectedHeight &&
                                    f.codec === e.target.value,
                                )
                                .sort(
                                  (a, b) => (b.bitrate || 0) - (a.bitrate || 0),
                                );
                              setSelectedBitrate(brs[0]?.bitrate ?? null);
                              setSelectedContainer(
                                defaultContainerForCodec(e.target.value),
                              );
                              setDone(false);
                            }}
                            className={selectCls}
                          >
                            {codecsAtHeight.map((c) => (
                              <option key={c} value={c} className={optCls}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </div>
                      </div>

                      {/* Bitrate */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Bitrate
                        </label>
                        <div className="relative">
                          <select
                            value={selectedBitrate ?? ""}
                            onChange={(e) => {
                              setSelectedBitrate(Number(e.target.value));
                              setDone(false);
                            }}
                            className={selectCls}
                          >
                            {matchingFormats.map((f) => (
                              <option
                                key={f.format_id}
                                value={f.bitrate ?? ""}
                                className={optCls}
                              >
                                {f.bitrate ? `${f.bitrate} kbps` : "Unknown"}
                                {f.fps >= 60 ? ` · ${f.fps}fps` : ""}
                                {!f.hasMuxedAudio ? " · video only" : ""}
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </div>
                      </div>

                      {/* Container */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Container
                        </label>
                        <div className="relative">
                          <select
                            value={selectedContainer}
                            className={selectCls}
                            onChange={(e) => {
                              setSelectedContainer(e.target.value);
                              setDone(false);
                            }}
                          >
                            {(selectedCodec === "VP9" || selectedCodec === "AV1"
                              ? ["webm", "mkv"]
                              : ["mp4", "mkv"]
                            ).map((c) => (
                              <option key={c} value={c} className={optCls}>
                                {c.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Audio controls */}
              {audioOnly && (
                <div className="space-y-3">
                  {/* Quality */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                      Quality
                    </label>
                    <div className="flex gap-2">
                      {["128", "192", "320"].map((q) => (
                        <button
                          key={q}
                          onClick={() => setAudioQuality(q)}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border"
                          style={{
                            background:
                              audioQuality === q
                                ? "linear-gradient(135deg, #7c3aed33, #db277733)"
                                : "rgba(255,255,255,0.03)",
                            borderColor:
                              audioQuality === q
                                ? "rgba(124,58,237,0.5)"
                                : "rgba(255,255,255,0.1)",
                            color:
                              audioQuality === q
                                ? "white"
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {q}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Format */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                      Format
                    </label>
                    <div className="flex gap-2">
                      {["mp3", "m4a", "opus", "wav"].map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setAudioContainer(c);
                            setDone(false);
                          }}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border"
                          style={{
                            background:
                              audioContainer === c
                                ? "linear-gradient(135deg, #7c3aed33, #db277733)"
                                : "rgba(255,255,255,0.03)",
                            borderColor:
                              audioContainer === c
                                ? "rgba(124,58,237,0.5)"
                                : "rgba(255,255,255,0.1)",
                            color:
                              audioContainer === c
                                ? "white"
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {c.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Audio track selector — only if multiple tracks exist */}
                  {(videoInfo.audioTracks?.length ?? 0) > 1 && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                        Audio Track
                      </label>
                      <div className="relative">
                        <select
                          value={audioTrackId}
                          onChange={(e) => {
                            setAudioTrackId(e.target.value);
                            setDone(false);
                          }}
                          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors cursor-pointer text-white/80"
                        >
                          {videoInfo.audioTracks.map((t) => (
                            <option
                              key={t.format_id}
                              value={t.format_id}
                              className="bg-[#1a1a2e]"
                            >
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clip section */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Clip{" "}
                  <span className="normal-case font-normal text-white/20">
                    (optional)
                  </span>
                </label>

                {/* Dual-thumb slider */}
                {duration > 0 && (
                  <div className="px-1 pt-1 pb-2">
                    <RangeSlider
                      min={0}
                      max={duration}
                      startVal={sliderStart}
                      endVal={sliderEnd}
                      onChange={handleSliderChange}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/20 font-mono">
                        0:00
                      </span>
                      <span className="text-[10px] text-white/20 font-mono">
                        {formatDuration(duration)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Text inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Start  0:00"
                    value={clipStart}
                    onChange={(e) => {
                      setClipStart(e.target.value);
                      setDone(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors text-white/80 placeholder:text-white/20 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="End  1:30"
                    value={clipEnd}
                    onChange={(e) => {
                      setClipEnd(e.target.value);
                      setDone(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors text-white/80 placeholder:text-white/20 font-mono"
                  />
                </div>
              </div>

              {/* Save Location */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Save Location
                </label>
                <div
                  onClick={pickFolder}
                  className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/8 hover:border-white/20 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-amber-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/25 mb-0.5 uppercase tracking-wider">
                      Save to
                    </p>
                    <p className="text-sm text-white/70 truncate font-mono">
                      {savePath || "Click to choose folder"}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Progress */}
              {(downloading || done) && (
                <div className="space-y-2">
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${smoothProgress}%`,
                        background:
                          "linear-gradient(90deg, #7c3aed, #db2777, #f59e0b)",
                        boxShadow: "0 0 12px rgba(124,58,237,0.8)",
                        transition: "width 0.1s linear",
                      }}
                    />
                    {downloading && (
                      <div
                        className="absolute inset-y-0 rounded-full animate-pulse"
                        style={{
                          width: `${smoothProgress}%`,
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-white/30">{status}</span>
                    <span className="text-xs font-mono text-white/50">
                      {smoothProgress.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Download / Cancel + Thumbnail */}
              <div className="flex gap-3">
                {!downloading ? (
                  <>
                    <button
                      onClick={startDownload}
                      disabled={!savePath || done}
                      className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-30"
                      style={{
                        background: done
                          ? "linear-gradient(135deg, #059669, #10b981)"
                          : "linear-gradient(135deg, #7c3aed, #db2777)",
                        boxShadow:
                          !savePath || done
                            ? "none"
                            : "0 0 30px rgba(124,58,237,0.35)",
                      }}
                    >
                      {done
                        ? "✓ Downloaded"
                        : audioOnly
                          ? `Download ${audioContainer.toUpperCase()}`
                          : clipStart && clipEnd
                            ? `Download Clip · ${selectedContainer.toUpperCase()}`
                            : `Download · ${selectedContainer.toUpperCase()}`}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled
                      className="flex-1 py-3.5 rounded-xl font-semibold text-sm opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #db2777)",
                      }}
                    >
                      Downloading...
                    </button>
                    <button
                      onClick={cancelDownload}
                      className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                      style={{
                        background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                        boxShadow: "0 0 20px rgba(220,38,38,0.4)",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              {!downloading && !done && status && (
                <p className="text-xs text-center text-white/30">{status}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
