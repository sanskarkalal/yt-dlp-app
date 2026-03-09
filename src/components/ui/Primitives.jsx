import { useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { useC } from "../../theme";

export const pill = (C, extra = {}) => ({
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

export const inputBase = (C) => ({
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: 13,
  color: C.textPrimary,
  fontFamily: "inherit",
});

export function FieldLabel({ children }) {
  const C = useC();
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

export function Badge({ children, color = "violet" }) {
  const C = useC();
  const map = {
    violet: ["rgba(139,92,246,0.12)", "rgba(139,92,246,0.25)", "#a78bfa"],
    pink: ["rgba(236,72,153,0.12)", "rgba(236,72,153,0.25)", "#f472b6"],
    amber: ["rgba(245,158,11,0.12)", "rgba(245,158,11,0.25)", "#fbbf24"],
    green: ["rgba(16,185,129,0.12)", "rgba(16,185,129,0.25)", "#34d399"],
    ghost: [C.surfaceHigh, C.border, C.textMuted],
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

export function IconBtn({ onClick, disabled, title, children }) {
  const C = useC();
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

export function Btn({
  children,
  onClick,
  disabled,
  variant = "primary",
  fullWidth,
  style: sx,
  title,
}) {
  const C = useC();
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
      title={title}
      style={{ ...base, ...vs[variant], ...sx }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {children}
    </button>
  );
}

export function SelectField({
  value,
  onValueChange,
  options,
  placeholder,
  disabled,
}) {
  const C = useC();
  const [hov, setHov] = useState(false);
  const safeOptions = (options || []).filter((opt) => {
    if (opt == null) return false;
    const v = opt.value;
    return v != null && String(v) !== "";
  });
  return (
    <Select.Root
      value={value != null ? String(value) : ""}
      onValueChange={onValueChange}
      disabled={disabled}
    >
      <Select.Trigger
        style={{
          ...pill(C),
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
            background: C.selectBg,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            boxShadow: "0 16px 48px rgba(0,0,0,0.6)",
            overflow: "hidden",
          }}
        >
          <Select.Viewport
            style={{ padding: 4, maxHeight: 180, overflowY: "auto" }}
          >
            {safeOptions.map((opt) => (
              <SelectItem key={`${String(opt.value)}-${String(opt.label)}`} value={String(opt.value)}>
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
  const C = useC();
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

export function RangeSlider({
  duration,
  startSecs,
  endSecs,
  onStartChange,
  onEndChange,
  disabled,
}) {
  const C = useC();
  const trackRef = useRef(null);
  const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
  const sPct = duration > 0 ? (startSecs / duration) * 100 : 0;
  const ePct = duration > 0 ? (endSecs / duration) * 100 : 100;
  const toTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = Math.floor(s % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
    }
    return `${m}:${String(sec).padStart(2, "0")}`;
  };
  const drag = (which) => (e) => {
    if (disabled) return;
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
          background: C.border,
          borderRadius: 99,
        }}
      />
      <div
        style={{
          position: "absolute",
          height: 3,
          borderRadius: 99,
          background: C.gradAccent,
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
            background: C.violetLight,
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
