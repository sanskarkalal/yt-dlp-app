import { useState, useEffect, useRef } from "react";
import * as Tabs from "@radix-ui/react-tabs";
import * as Select from "@radix-ui/react-select";
import * as ScrollArea from "@radix-ui/react-scroll-area";
import {
  Download,
  X,
  FolderOpen,
  Clock,
  CheckCircle2,
  ChevronDown,
  LogIn,
  Image as ImageIcon,
  Scissors,
  Music,
  Video,
  Loader2,
  Bot,
  Lock,
  Folder,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  ClipboardPaste,
} from "lucide-react";
import { cn } from "./lib/utils";
import iconPng from "./assets/icon.png";

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
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
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isValidTime(t) {
  return /^\d{1,2}:\d{2}(:\d{2})?$/.test(t);
}
function timeToSecs(t) {
  if (!t) return null;
  const p = t.split(":").map(Number);
  if (p.length === 2) return p[0] * 60 + p[1];
  if (p.length === 3) return p[0] * 3600 + p[1] * 60 + p[2];
  return null;
}
function formatDuration(s) {
  if (!s) return "";
  const h = Math.floor(s / 3600),
    m = Math.floor((s % 3600) / 60),
    sec = s % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
}
function timeAgo(ts) {
  const d = Date.now() - ts,
    m = Math.floor(d / 60000),
    h = Math.floor(d / 3600000),
    day = Math.floor(d / 86400000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  if (h < 24) return `${h}h ago`;
  return `${day}d ago`;
}

// ─── Shared style helpers ─────────────────────────────────────────────────────
const pill = (extra = {}) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 40,
  padding: "0 12px",
  background: C.surface,
  border: `1px solid ${C.border}`,
  borderRadius: 12,
  transition: "border-color 0.15s",
  ...extra,
});

const inputBase = {
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 13,
  color: C.textPrimary,
  fontFamily: "inherit",
};

// ─── Primitives ───────────────────────────────────────────────────────────────
function FieldLabel({ children }) {
  return (
    <span
      style={{
        fontSize: 10,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: C.textFaint,
      }}
    >
      {children}
    </span>
  );
}

function Badge({ children, color = "violet" }) {
  const map = {
    violet: ["rgba(139,92,246,0.12)", "rgba(139,92,246,0.25)", "#a78bfa"],
    pink: ["rgba(236,72,153,0.12)", "rgba(236,72,153,0.25)", "#f472b6"],
    amber: ["rgba(245,158,11,0.12)", "rgba(245,158,11,0.25)", "#fbbf24"],
    green: ["rgba(16,185,129,0.12)", "rgba(16,185,129,0.25)", "#34d399"],
    ghost: ["rgba(255,255,255,0.05)", "rgba(255,255,255,0.09)", C.textMuted],
  };
  const [bg, border, text] = map[color] || map.ghost;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: 10,
        fontWeight: 600,
        background: bg,
        border: `1px solid ${border}`,
        color: text,
      }}
    >
      {children}
    </span>
  );
}

function IconBtn({ onClick, disabled, title, children }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
        borderRadius: 10,
        background: hov ? C.surfaceHigh : "transparent",
        border: "1px solid transparent",
        color: hov ? C.textPrimary : C.textMuted,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: "all 0.15s",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  fullWidth,
  style: sx,
}) {
  const [hov, setHov] = useState(false);
  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    padding: "0 18px",
    borderRadius: 12,
    fontSize: 13,
    fontWeight: 600,
    width: fullWidth ? "100%" : undefined,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.4 : 1,
    transition: "all 0.15s",
    border: "none",
  };
  const vs = {
    primary: {
      background: C.gradAccent,
      color: "#fff",
      boxShadow:
        hov && !disabled ? "0 0 28px rgba(124,58,237,0.45)" : C.glowViolet,
    },
    success: { background: C.gradSuccess, color: "#fff", cursor: "default" },
    danger: {
      background: "linear-gradient(135deg,#dc2626,#b91c1c)",
      color: "#fff",
      boxShadow: hov ? "0 0 20px rgba(220,38,38,0.4)" : "none",
    },
    ghost: {
      background: hov ? C.surfaceHigh : C.surface,
      color: C.textMuted,
      border: `1px solid ${C.border}`,
    },
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{ ...base, ...vs[variant], ...sx }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

function SelectField({ value, onValueChange, options, placeholder, disabled }) {
  const [hov, setHov] = useState(false);
  return (
    <Select.Root
      value={value != null ? String(value) : ""}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        style={{
          ...pill(),
          width: "100%",
          cursor: "pointer",
          justifyContent: "space-between",
          borderColor: hov ? C.borderHover : C.border,
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <Select.Value
          placeholder={
            <span style={{ color: C.textFaint }}>{placeholder}</span>
          }
        />
        <Select.Icon style={{ color: C.textFaint, display: "flex" }}>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={4}
          style={{
            zIndex: 999,
            minWidth: "var(--radix-select-trigger-width)",
            background: "#13132a",
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <Select.Viewport
            style={{ padding: 4, maxHeight: 180, overflowY: "auto" }}
          >
            {options.map((opt) => (
              <SelectItem key={String(opt.value)} value={String(opt.value)}>
                {opt.label}
              </SelectItem>
            ))}
          </Select.Viewport>
        </Select.Content>
      </Select.Portal>
    </Select.Root>
  );
}

function SelectItem({ value, children }) {
  const [hov, setHov] = useState(false);
  return (
    <Select.Item
      value={value}
      style={{
        display: "flex",
        alignItems: "center",
        padding: "8px 12px",
        borderRadius: 8,
        fontSize: 13,
        color: hov ? C.textPrimary : C.textMuted,
        background: hov ? C.surfaceHigh : "transparent",
        cursor: "pointer",
        outline: "none",
        transition: "all 0.1s",
        userSelect: "none",
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <Select.ItemText>{children}</Select.ItemText>
    </Select.Item>
  );
}

// ─── Range Slider ─────────────────────────────────────────────────────────────
function RangeSlider({
  duration,
  startSecs,
  endSecs,
  onStartChange,
  onEndChange,
}) {
  const trackRef = useRef(null);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sPct = duration > 0 ? (startSecs / duration) * 100 : 0;
  const ePct = duration > 0 ? (endSecs / duration) * 100 : 100;
  const toTime = (s) => {
    const h = Math.floor(s / 3600),
      m = Math.floor((s % 3600) / 60),
      sec = Math.floor(s % 60);
    if (h > 0)
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    return `${m}:${String(sec).padStart(2, "0")}`;
  };
  const drag = (which) => (e) => {
    e.preventDefault();
    const move = (me) => {
      if (!trackRef.current) return;
      const r = trackRef.current.getBoundingClientRect();
      const pct = clamp((me.clientX - r.left) / r.width, 0, 1);
      const sec = Math.round(pct * duration);
      if (which === "start") onStartChange(toTime(clamp(sec, 0, endSecs - 1)));
      else onEndChange(toTime(clamp(sec, startSecs + 1, duration)));
    };
    const up = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
  };
  return (
    <div
      ref={trackRef}
      style={{
        position: "relative",
        height: 20,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <div
        style={{
          width: "100%",
          height: 3,
          background: "rgba(255,255,255,0.06)",
          borderRadius: 99,
        }}
      />
      <div
        style={{
          position: "absolute",
          height: 3,
          borderRadius: 99,
          background: "linear-gradient(90deg,#7c3aed,#a855f7)",
          left: `${sPct}%`,
          right: `${100 - ePct}%`,
        }}
      />
      {[
        { w: "start", p: sPct },
        { w: "end", p: ePct },
      ].map(({ w, p }) => (
        <div
          key={w}
          onMouseDown={drag(w)}
          style={{
            position: "absolute",
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: "#a78bfa",
            border: `2px solid ${C.bg}`,
            left: `calc(${p}% - 7px)`,
            zIndex: 2,
            cursor: "grab",
            boxShadow: "0 0 8px rgba(139,92,246,0.6)",
          }}
        />
      ))}
    </div>
  );
}

// ─── History Drawer ───────────────────────────────────────────────────────────
function HistoryDrawer({ open, onClose }) {
  const [history, setHistory] = useState([]);
  const [clearing, setClearing] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  useEffect(() => {
    if (open) window.electronAPI.getHistory().then(setHistory);
    else setSelectedIds(new Set());
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
    setHistory((p) => p.filter((e) => e.id !== entry.id));
    setSelectedIds((p) => {
      const n = new Set(p);
      n.delete(entry.id);
      return n;
    });
    setDeletingId(null);
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
  const bulkDelete = async () => {
    setBulkDeleting(true);
    for (const e of history.filter((e) => selectedIds.has(e.id))) {
      if (e.filePath) await window.electronAPI.deleteFile(e.filePath);
      await window.electronAPI.deleteHistoryEntry(e.id);
    }
    setHistory((p) => p.filter((e) => !selectedIds.has(e.id)));
    setSelectedIds(new Set());
    setBulkDeleting(false);
  };
  const typeMeta = {
    video: { label: "Video", color: "violet", Icon: Video },
    audio: { label: "Audio", color: "pink", Icon: Music },
    thumbnail: { label: "Thumb", color: "amber", Icon: ImageIcon },
    clip: { label: "Clip", color: "green", Icon: Scissors },
  };
  const allSel = history.length > 0 && selectedIds.size === history.length;

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
          background: "rgba(0,0,0,0.6)",
          backdropFilter: "blur(4px)",
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
          background: "linear-gradient(180deg,#0d0d1f 0%,#09090f 100%)",
          borderLeft: `1px solid ${C.border}`,
          transform: open ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
          boxShadow: open ? "-24px 0 64px rgba(0,0,0,0.5)" : "none",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "52px 20px 14px",
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Clock size={15} style={{ color: C.textFaint }} />
            <span
              style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary }}
            >
              History
            </span>
            {history.length > 0 && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 600,
                  padding: "2px 6px",
                  borderRadius: 6,
                  background: "rgba(255,255,255,0.05)",
                  color: C.textFaint,
                }}
              >
                {history.length}
              </span>
            )}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            {history.length > 0 && (
              <button
                onClick={toggleAll}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 500,
                  padding: "4px 8px",
                  borderRadius: 8,
                  background: allSel
                    ? "rgba(124,58,237,0.15)"
                    : "rgba(255,255,255,0.04)",
                  border: `1px solid ${allSel ? "rgba(124,58,237,0.3)" : C.border}`,
                  color: allSel ? C.violetLight : C.textMuted,
                  cursor: "pointer",
                }}
              >
                {allSel ? <CheckSquare size={12} /> : <Square size={12} />}
                {allSel ? "Deselect all" : "Select all"}
              </button>
            )}
            {selectedIds.size > 0 ? (
              <button
                onClick={bulkDelete}
                disabled={bulkDeleting}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  fontSize: 11,
                  fontWeight: 600,
                  padding: "4px 10px",
                  borderRadius: 8,
                  background: "rgba(220,38,38,0.15)",
                  border: "1px solid rgba(220,38,38,0.3)",
                  color: "#f87171",
                  cursor: "pointer",
                }}
              >
                {bulkDeleting ? (
                  <Loader2 size={12} className="animate-spin" />
                ) : (
                  <Trash2 size={12} />
                )}{" "}
                Delete ({selectedIds.size})
              </button>
            ) : history.length > 0 ? (
              <IconBtn
                onClick={handleClearAll}
                disabled={clearing}
                title="Clear all"
              >
                {clearing ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <Trash2 size={15} />
                )}
              </IconBtn>
            ) : null}
            <IconBtn onClick={onClose}>
              <X size={15} />
            </IconBtn>
          </div>
        </div>
        {/* List */}
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
                  padding: 12,
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                }}
              >
                {history.map((entry) => {
                  const meta = typeMeta[entry.type] || typeMeta.video,
                    isSel = selectedIds.has(entry.id);
                  return (
                    <div
                      key={entry.id}
                      onClick={() => toggleSelect(entry.id)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: 10,
                        borderRadius: 12,
                        cursor: "pointer",
                        background: isSel
                          ? "rgba(124,58,237,0.1)"
                          : "rgba(255,255,255,0.02)",
                        border: `1px solid ${isSel ? "rgba(124,58,237,0.25)" : C.border}`,
                        transition: "all 0.15s",
                      }}
                      className="history-entry"
                    >
                      <div
                        style={{
                          width: 52,
                          height: 36,
                          borderRadius: 8,
                          overflow: "hidden",
                          background: C.surfaceHigh,
                          flexShrink: 0,
                          position: "relative",
                        }}
                      >
                        {entry.thumbnail ? (
                          <img
                            src={entry.thumbnail}
                            alt=""
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
                              background: "rgba(124,58,237,0.35)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            <CheckCircle2
                              size={14}
                              style={{ color: "#a78bfa" }}
                            />
                          </div>
                        )}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
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
                            marginTop: 4,
                          }}
                        >
                          <Badge color={meta.color}>{meta.label}</Badge>
                          {entry.quality && (
                            <span style={{ fontSize: 10, color: C.textFaint }}>
                              {entry.quality}
                            </span>
                          )}
                          <span
                            style={{
                              fontSize: 10,
                              color: "rgba(255,255,255,0.1)",
                              marginLeft: "auto",
                            }}
                          >
                            {timeAgo(entry.id)}
                          </span>
                        </div>
                      </div>
                      <div
                        className="entry-actions"
                        style={{ display: "flex", gap: 2 }}
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
                          title="Delete"
                          disabled={deletingId === entry.id}
                          onClick={() => handleDeleteEntry(entry)}
                        >
                          {deletingId === entry.id ? (
                            <Loader2 size={13} className="animate-spin" />
                          ) : (
                            <X size={13} />
                          )}
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
              style={{ background: "rgba(255,255,255,0.1)", borderRadius: 99 }}
            />
          </ScrollArea.Scrollbar>
        </ScrollArea.Root>
      </div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [botDetected, setBotDetected] = useState(false);
  const progressRef = useRef(0);
  const animFrameRef = useRef(null);

  const duration = videoInfo?.duration || 0;
  const sliderStart = timeToSecs(clipStart) ?? 0;
  const sliderEnd = timeToSecs(clipEnd) ?? duration;

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);
  useEffect(() => {
    const animate = () => {
      setSmoothProgress((prev) => {
        const d = progressRef.current - prev;
        return Math.abs(d) < 0.1 ? progressRef.current : prev + d * 0.12;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);
  useEffect(() => {
    window.electronAPI.getCookiesStatus().then(setCookiesOk);
    window.electronAPI.getDownloadsPath().then(setSavePath);
    window.electronAPI.onCookiesStatus((ok) => setCookiesOk(ok));
  }, []);

  const fetchInfo = async (u) => {
    if (!u) return;
    setLoading(true);
    setVideoInfo(null);
    setStatus("");
    setDone(false);
    setClipStart("");
    setClipEnd("");
    setBotDetected(false);
    setShowLoginPrompt(false);
    try {
      const info = await window.electronAPI.getVideoInfo(u);
      if (info.ageRestricted) {
        setPendingUrl(u);
        setShowLoginPrompt(true);
        return;
      }
      if (info.botDetected) {
        setBotDetected(true);
        setPendingUrl(u);
        return;
      }
      setVideoInfo(info);
      if (info.rawFormats?.length > 0) {
        const h = info.rawFormats[0].height;
        const codecs = [
          ...new Set(
            info.rawFormats.filter((f) => f.height === h).map((f) => f.codec),
          ),
        ];
        setSelectedHeight(h);
        setSelectedCodec(codecs[0]);
        const brs = info.rawFormats
          .filter((f) => f.height === h && f.codec === codecs[0])
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        setSelectedBitrate(brs[0]?.bitrate ?? null);
        setSelectedContainer(
          info.rawFormats.find((f) => f.height === h && f.codec === codecs[0])
            ?.ext || "mp4",
        );
      }
    } catch (err) {
      if (err?.message?.includes("AGE_RESTRICTED")) {
        setPendingUrl(u);
        setShowLoginPrompt(true);
      } else setStatus("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeLogin = async () => {
    setLoggingIn(true);
    setShowLoginPrompt(false);
    setBotDetected(false);
    setStatus("Waiting for YouTube sign-in...");
    try {
      const ok = await window.electronAPI.openYouTubeLogin();
      if (ok) {
        setCookiesOk(true);
        await fetchInfo(pendingUrl);
        setPendingUrl(null);
      } else setStatus("Sign-in cancelled or failed.");
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
    window.electronAPI.onProgress((pct) => {
      setProgress(pct);
      setStatus("Downloading...");
    });
    try {
      const selRaw = videoInfo?.rawFormats?.find(
        (f) =>
          f.height === selectedHeight &&
          f.codec === selectedCodec &&
          f.bitrate === selectedBitrate,
      );
      const vfid =
        selRaw?.format_id ??
        videoInfo?.rawFormats
          ?.filter((f) => f.height === selectedHeight)
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.format_id;
      const fmtId = vfid
        ? selRaw?.hasMuxedAudio
          ? vfid
          : `${vfid}+bestaudio/best`
        : "bestvideo+bestaudio/best";
      const result = await window.electronAPI.download({
        url,
        formatId: fmtId,
        container: selectedContainer,
        savePath,
        height: selectedHeight,
        clipStart: clipStart.trim() || null,
        clipEnd: clipEnd.trim() || null,
        audioOnly,
        audioQuality,
        audioTrackId: audioOnly ? audioTrackId : null,
        audioContainer: audioOnly ? audioContainer : null,
      });
      if (result?.cancelled) return;
      setProgress(100);
      setDone(true);
      setStatus(
        audioOnly
          ? "Audio downloaded!"
          : clipStart
            ? "Clip downloaded!"
            : "Download complete!",
      );
      await window.electronAPI.addHistory({
        title: videoInfo?.title || url,
        thumbnail: videoInfo?.thumbnail || null,
        type: audioOnly ? "audio" : clipStart && clipEnd ? "clip" : "video",
        quality: audioOnly
          ? `${audioContainer.toUpperCase()} · ${audioQuality}kbps`
          : selectedHeight
            ? `${selectedHeight}p ${selectedContainer.toUpperCase()}`
            : null,
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
    setDownloading(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setStatus("Download cancelled");
    await window.electronAPI.cancelDownload();
  };

  const downloadThumbnail = async () => {
    if (!videoInfo || !savePath) return;
    setThumbDownloading(true);
    setStatus("Saving thumbnail...");
    try {
      const best = (videoInfo.thumbnails || [])
        .filter((t) => t.url)
        .sort(
          (a, b) =>
            (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
        )[0];
      const fp = await window.electronAPI.downloadThumbnail({
        thumbnailUrl: best?.url || videoInfo.thumbnail,
        title: videoInfo.title,
        savePath,
      });
      setThumbDone(true);
      setStatus("Thumbnail saved!");
      await window.electronAPI.addHistory({
        title: videoInfo.title,
        thumbnail: videoInfo.thumbnail || null,
        type: "thumbnail",
        quality: "JPG",
        filePath: fp || null,
        url,
      });
    } catch (err) {
      setStatus("Error saving thumbnail: " + err.message);
    } finally {
      setThumbDownloading(false);
    }
  };

  const raw = videoInfo?.rawFormats || [];
  const heights = [...new Set(raw.map((f) => f.height))].sort((a, b) => b - a);
  const codecsAtH = [
    ...new Set(
      raw.filter((f) => f.height === selectedHeight).map((f) => f.codec),
    ),
  ];
  const matchFmts = raw
    .filter((f) => f.height === selectedHeight && f.codec === selectedCodec)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
    .filter((f, i, arr) => arr.findIndex((x) => x.bitrate === f.bitrate) === i);
  const audioTracks = videoInfo?.audioTracks || [];
  const selRawFmt = raw.find(
    (f) =>
      f.height === selectedHeight &&
      f.codec === selectedCodec &&
      f.bitrate === selectedBitrate,
  );

  const dlLabel = done
    ? "Downloaded"
    : audioOnly
      ? `Download ${audioContainer.toUpperCase()}`
      : clipStart && clipEnd
        ? `Download Clip · ${selectedContainer.toUpperCase()}`
        : `Download · ${selectedContainer.toUpperCase()}`;

  return (
    <div
      style={{
        height: "100vh",
        width: "100vw",
        background: C.bg,
        color: C.textPrimary,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        fontFamily: "'DM Sans',system-ui,sans-serif",
      }}
    >
      <HistoryDrawer open={historyOpen} onClose={() => setHistoryOpen(false)} />

      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -120,
            left: -80,
            width: 500,
            height: 400,
            background:
              "radial-gradient(ellipse,rgba(124,58,237,0.08) 0%,transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: 0,
            right: -60,
            width: 400,
            height: 350,
            background:
              "radial-gradient(ellipse,rgba(219,39,119,0.06) 0%,transparent 70%)",
          }}
        />
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 24px",
            flexShrink: 0,
            WebkitAppRegion: "drag",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              userSelect: "none",
            }}
          >
            <img
              src={iconPng}
              alt=""
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                background: C.gradAccent,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontStyle: "italic",
              }}
            >
              Seedhe Download
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              WebkitAppRegion: "no-drag",
            }}
          >
            <IconBtn onClick={() => setHistoryOpen(true)} title="History">
              <Clock size={16} />
            </IconBtn>
            {cookiesOk ? (
              <button
                onClick={async () => {
                  await window.electronAPI.clearCookies();
                  setCookiesOk(false);
                }}
                title="Signed in — click to sign out"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.2)",
                  color: "#34d399",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "#34d399",
                  }}
                />
                Signed in
              </button>
            ) : (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 10px",
                  borderRadius: 8,
                  background: "rgba(255,255,255,0.03)",
                  border: `1px solid ${C.border}`,
                  color: C.textFaint,
                  fontSize: 11,
                }}
              >
                <div
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "rgba(255,255,255,0.15)",
                  }}
                />
                Not signed in
              </div>
            )}
          </div>
        </div>

        <div style={{ height: 1, background: C.border, flexShrink: 0 }} />

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: "20px 24px",
            display: "flex",
            flexDirection: "column",
            gap: 18,
          }}
          className="scrollbar-hide"
        >
          {/* URL bar */}
          <div style={{ display: "flex", gap: 8 }}>
            <div style={{ ...pill(), flex: 1 }}>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchInfo(url)}
                placeholder="Paste YouTube URL..."
                style={{ ...inputBase }}
              />
              {url && (
                <button
                  onClick={() => {
                    setUrl("");
                    setVideoInfo(null);
                    setStatus("");
                    setBotDetected(false);
                    setShowLoginPrompt(false);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: C.textFaint,
                    display: "flex",
                    padding: 2,
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <Btn
              onClick={async () => {
                let u = url;
                if (!u) {
                  try {
                    u = await navigator.clipboard.readText();
                    setUrl(u);
                  } catch {}
                }
                if (u) fetchInfo(u);
              }}
              disabled={loading}
              variant="primary"
              style={{ minWidth: 110, gap: 6 }}
            >
              {loading ? (
                <Loader2 size={15} className="animate-spin" />
              ) : url ? (
                "Fetch"
              ) : (
                <>
                  <ClipboardPaste size={14} /> Paste & Fetch
                </>
              )}
            </Btn>
          </div>

          {/* Bot detected */}
          {botDetected && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 14,
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.18)",
                borderRadius: 12,
              }}
            >
              <Bot
                size={15}
                style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#fde68a",
                    margin: 0,
                  }}
                >
                  Bot detection triggered
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: C.textFaint,
                    margin: "3px 0 0",
                  }}
                >
                  YouTube thinks you're a bot. Sign in to continue.
                </p>
              </div>
              <Btn
                variant="ghost"
                onClick={handleYouTubeLogin}
                disabled={loggingIn}
                style={{ height: 32, padding: "0 12px", fontSize: 12 }}
              >
                {loggingIn ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LogIn size={13} />
                )}{" "}
                Sign in
              </Btn>
            </div>
          )}

          {/* Age restricted */}
          {showLoginPrompt && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 12,
                padding: 14,
                background: C.surface,
                border: `1px solid ${C.border}`,
                borderRadius: 12,
              }}
            >
              <Lock
                size={15}
                style={{ color: C.textMuted, flexShrink: 0, marginTop: 2 }}
              />
              <div style={{ flex: 1 }}>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: C.textPrimary,
                    margin: 0,
                  }}
                >
                  Age-restricted content
                </p>
                <p
                  style={{
                    fontSize: 12,
                    color: C.textFaint,
                    margin: "3px 0 0",
                  }}
                >
                  Sign in to your YouTube account to access this video.
                </p>
              </div>
              <Btn
                variant="ghost"
                onClick={handleYouTubeLogin}
                disabled={loggingIn}
                style={{ height: 32, padding: "0 12px", fontSize: 12 }}
              >
                {loggingIn ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <LogIn size={13} />
                )}{" "}
                Sign in
              </Btn>
            </div>
          )}

          {/* Empty state */}
          {!videoInfo && !loading && !showLoginPrompt && !botDetected && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                flex: 1,
                gap: 12,
                color: C.textFaint,
                paddingTop: 80,
              }}
            >
              <Download size={40} strokeWidth={1.2} />
              <p style={{ fontSize: 13, margin: 0 }}>
                Paste a YouTube URL to get started
              </p>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 10,
                paddingTop: 80,
                color: C.textFaint,
              }}
            >
              <Loader2 size={18} className="animate-spin" />
              <span style={{ fontSize: 13 }}>Fetching video info...</span>
            </div>
          )}

          {/* Main UI */}
          {videoInfo && (
            <div style={{ display: "flex", gap: 20 }}>
              {/* Thumbnail col */}
              <div
                style={{
                  width: 200,
                  flexShrink: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div
                  style={{
                    borderRadius: 12,
                    overflow: "hidden",
                    background: C.surface,
                    aspectRatio: "16/9",
                    position: "relative",
                  }}
                  className="thumb-wrap"
                >
                  {videoInfo.thumbnail && (
                    <img
                      src={videoInfo.thumbnail}
                      alt=""
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  )}
                  <button
                    onClick={downloadThumbnail}
                    disabled={thumbDownloading || !savePath}
                    className="thumb-overlay"
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.65)",
                      opacity: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#fff",
                      cursor: "pointer",
                      border: "none",
                      transition: "opacity 0.2s",
                    }}
                  >
                    {thumbDownloading ? (
                      <Loader2 size={15} className="animate-spin" />
                    ) : thumbDone ? (
                      <>
                        <CheckCircle2 size={15} style={{ color: "#34d399" }} />
                        Saved
                      </>
                    ) : (
                      <>
                        <ImageIcon size={15} />
                        Save thumbnail
                      </>
                    )}
                  </button>
                </div>
                <div>
                  <p
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: C.textPrimary,
                      lineHeight: 1.4,
                      margin: 0,
                      display: "-webkit-box",
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {videoInfo.title}
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginTop: 6,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: C.textFaint,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {videoInfo.uploader}
                    </span>
                    {videoInfo.duration && (
                      <span
                        style={{
                          fontSize: 11,
                          color: "rgba(255,255,255,0.12)",
                          flexShrink: 0,
                        }}
                      >
                        {formatDuration(videoInfo.duration)}
                      </span>
                    )}
                  </div>
                </div>
                {!audioOnly && selRawFmt && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {selRawFmt.width && (
                      <Badge color="violet">
                        {selRawFmt.width}×{selRawFmt.height}
                      </Badge>
                    )}
                    {selRawFmt.fps >= 60 && (
                      <Badge color="violet">{selRawFmt.fps}fps</Badge>
                    )}
                    {!selRawFmt.hasMuxedAudio && (
                      <Badge color="ghost">+audio</Badge>
                    )}
                  </div>
                )}
              </div>

              {/* Controls col */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  minWidth: 0,
                }}
              >
                {/* Video/Audio tabs */}
                <Tabs.Root
                  value={audioOnly ? "audio" : "video"}
                  onValueChange={(v) => {
                    setAudioOnly(v === "audio");
                    setDone(false);
                  }}
                >
                  <Tabs.List
                    style={{
                      display: "inline-flex",
                      padding: 4,
                      gap: 2,
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                    }}
                  >
                    {[
                      { v: "video", l: "Video", I: Video },
                      { v: "audio", l: "Audio only", I: Music },
                    ].map(({ v, l, I }) => (
                      <Tabs.Trigger
                        key={v}
                        value={v}
                        className="tab-trigger"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 14px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: "none",
                          cursor: "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        <I size={13} />
                        {l}
                      </Tabs.Trigger>
                    ))}
                  </Tabs.List>
                </Tabs.Root>

                {/* Video format grid */}
                {!audioOnly && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    {[
                      {
                        label: "Resolution",
                        value: selectedHeight ? String(selectedHeight) : "",
                        opts: heights.map((h) => ({
                          value: h,
                          label: `${h}p`,
                        })),
                        onChange: (v) => {
                          const h = Number(v);
                          setSelectedHeight(h);
                          const cs = [
                            ...new Set(
                              raw
                                .filter((f) => f.height === h)
                                .map((f) => f.codec),
                            ),
                          ];
                          setSelectedCodec(cs[0]);
                          const brs = raw
                            .filter((f) => f.height === h && f.codec === cs[0])
                            .sort(
                              (a, b) => (b.bitrate || 0) - (a.bitrate || 0),
                            );
                          setSelectedBitrate(brs[0]?.bitrate ?? null);
                          setSelectedContainer(
                            raw.find((f) => f.height === h && f.codec === cs[0])
                              ?.ext || "mp4",
                          );
                          setDone(false);
                        },
                      },
                      {
                        label: "Codec",
                        value: selectedCodec || "",
                        opts: codecsAtH.map((c) => ({ value: c, label: c })),
                        onChange: (v) => {
                          setSelectedCodec(v);
                          const brs = raw
                            .filter(
                              (f) =>
                                f.height === selectedHeight && f.codec === v,
                            )
                            .sort(
                              (a, b) => (b.bitrate || 0) - (a.bitrate || 0),
                            );
                          setSelectedBitrate(brs[0]?.bitrate ?? null);
                          setSelectedContainer(
                            raw.find(
                              (f) =>
                                f.height === selectedHeight && f.codec === v,
                            )?.ext || "mp4",
                          );
                          setDone(false);
                        },
                      },
                      {
                        label: "Bitrate",
                        value:
                          selectedBitrate != null
                            ? String(selectedBitrate)
                            : "",
                        opts: matchFmts.map((f) => ({
                          value: f.bitrate ?? "",
                          label: f.bitrate ? `${f.bitrate} kbps` : "Unknown",
                        })),
                        onChange: (v) => {
                          setSelectedBitrate(Number(v));
                          setDone(false);
                        },
                      },
                      {
                        label: "Container",
                        value: selectedContainer,
                        opts: (
                          videoInfo.availableContainers || ["mp4", "mkv"]
                        ).map((c) => ({ value: c, label: c.toUpperCase() })),
                        onChange: (v) => {
                          setSelectedContainer(v);
                          setDone(false);
                        },
                      },
                    ].map(({ label, value, opts, onChange }) => (
                      <div
                        key={label}
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <FieldLabel>{label}</FieldLabel>
                        <SelectField
                          value={value}
                          onValueChange={onChange}
                          options={opts}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Audio format grid */}
                {audioOnly && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 12,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <FieldLabel>Format</FieldLabel>
                      <SelectField
                        value={audioContainer}
                        onValueChange={(v) => {
                          setAudioContainer(v);
                          setDone(false);
                        }}
                        options={["mp3", "m4a", "opus", "wav", "flac"].map(
                          (f) => ({ value: f, label: f.toUpperCase() }),
                        )}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <FieldLabel>Quality</FieldLabel>
                      <SelectField
                        value={audioQuality}
                        onValueChange={(v) => {
                          setAudioQuality(v);
                          setDone(false);
                        }}
                        options={["320", "256", "192", "128", "96"].map(
                          (q) => ({ value: q, label: `${q} kbps` }),
                        )}
                      />
                    </div>
                    {audioTracks.length > 1 && (
                      <div
                        style={{
                          gridColumn: "span 2",
                          display: "flex",
                          flexDirection: "column",
                          gap: 6,
                        }}
                      >
                        <FieldLabel>Audio track</FieldLabel>
                        <SelectField
                          value={audioTrackId}
                          onValueChange={(v) => {
                            setAudioTrackId(v);
                            setDone(false);
                          }}
                          options={[
                            {
                              value: "bestaudio/best",
                              label: "Best available",
                            },
                            ...audioTracks.map((t) => ({
                              value: t.format_id,
                              label: t.label,
                            })),
                          ]}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Clip */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 8 }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <FieldLabel>Clip (optional)</FieldLabel>
                    {(clipStart || clipEnd) && (
                      <button
                        onClick={() => {
                          setClipStart("");
                          setClipEnd("");
                        }}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 11,
                          color: C.textFaint,
                          display: "flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <X size={11} />
                        Clear
                      </button>
                    )}
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div style={{ ...pill(), flex: 1 }}>
                      <Scissors size={13} style={{ color: C.textFaint }} />
                      <input
                        value={clipStart}
                        onChange={(e) => setClipStart(e.target.value)}
                        placeholder="0:00"
                        style={{ ...inputBase, fontSize: 12 }}
                      />
                    </div>
                    <span style={{ color: C.textFaint, fontSize: 12 }}>→</span>
                    <div style={{ ...pill(), flex: 1 }}>
                      <input
                        value={clipEnd}
                        onChange={(e) => setClipEnd(e.target.value)}
                        placeholder={formatDuration(duration) || "0:00"}
                        style={{ ...inputBase, fontSize: 12 }}
                      />
                    </div>
                  </div>
                  {duration > 0 && (
                    <RangeSlider
                      duration={duration}
                      startSecs={sliderStart}
                      endSecs={sliderEnd || duration}
                      onStartChange={setClipStart}
                      onEndChange={setClipEnd}
                    />
                  )}
                </div>

                {/* Save path */}
                <div
                  style={{ display: "flex", flexDirection: "column", gap: 6 }}
                >
                  <FieldLabel>Save to</FieldLabel>
                  <button
                    onClick={pickFolder}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      height: 40,
                      padding: "0 12px",
                      background: C.surface,
                      border: `1px solid ${C.border}`,
                      borderRadius: 12,
                      cursor: "pointer",
                      color: C.textMuted,
                      fontSize: 12,
                      textAlign: "left",
                      transition: "border-color 0.15s",
                      width: "100%",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.borderColor = C.borderHover)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.borderColor = C.border)
                    }
                  >
                    <FolderOpen
                      size={15}
                      style={{ color: C.textFaint, flexShrink: 0 }}
                    />
                    <span
                      style={{
                        flex: 1,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {savePath || "Choose folder..."}
                    </span>
                    <ChevronDown
                      size={13}
                      style={{
                        color: C.textFaint,
                        flexShrink: 0,
                        transform: "rotate(-90deg)",
                      }}
                    />
                  </button>
                </div>

                {/* Progress bar */}
                {(downloading || done) && (
                  <div
                    style={{ display: "flex", flexDirection: "column", gap: 6 }}
                  >
                    <div
                      style={{
                        height: 3,
                        background: "rgba(255,255,255,0.05)",
                        borderRadius: 99,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          height: "100%",
                          borderRadius: 99,
                          transition: "width 0.15s linear",
                          width: `${smoothProgress}%`,
                          background: done ? C.gradSuccess : C.gradAccent,
                          boxShadow: done
                            ? "0 0 10px rgba(16,185,129,0.5)"
                            : C.glowViolet,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span style={{ fontSize: 11, color: C.textFaint }}>
                        {status}
                      </span>
                      <span
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          color: C.textFaint,
                        }}
                      >
                        {smoothProgress.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )}

                {/* Download / Cancel */}
                <div style={{ display: "flex", gap: 8, paddingTop: 2 }}>
                  {!downloading ? (
                    <Btn
                      variant={done ? "success" : "primary"}
                      onClick={startDownload}
                      disabled={!savePath || done}
                      fullWidth
                    >
                      {done ? (
                        <>
                          <CheckCircle2 size={15} />
                          Downloaded
                        </>
                      ) : (
                        <>
                          <Download size={15} />
                          {dlLabel}
                        </>
                      )}
                    </Btn>
                  ) : (
                    <>
                      <Btn
                        variant="ghost"
                        disabled
                        fullWidth
                        style={{ flex: 1 }}
                      >
                        <Loader2 size={15} className="animate-spin" />
                        Downloading...
                      </Btn>
                      <Btn
                        variant="danger"
                        onClick={cancelDownload}
                        style={{ minWidth: 90 }}
                      >
                        <X size={14} />
                        Cancel
                      </Btn>
                    </>
                  )}
                </div>

                {/* Status msg */}
                {!downloading && !done && status && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: C.textFaint,
                    }}
                  >
                    <AlertCircle size={13} style={{ flexShrink: 0 }} />
                    {status}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
