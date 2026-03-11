import { useRef, useState } from "react";
import * as Select from "@radix-ui/react-select";
import { ChevronDown } from "lucide-react";
import { useC } from "../../theme";

const scaleFont = (C, size) => {
  const scale = Number(C?.textScale || 1);
  return Math.round(size * scale * 100) / 100;
};

// Base pill container
export const pill = (C, extra = {}) => ({
  display: "flex",
  alignItems: "center",
  gap: 8,
  height: 40,
  padding: "0 12px",
  background: C.surface,
  backdropFilter: C.backdropFilterVal,
  WebkitBackdropFilter: C.backdropFilterVal,
  border: `${C.borderW} solid ${C.border}`,
  borderRadius: C.radius,
  boxShadow: C.shadowSurface,
  animation: C.surfaceAnim,
  transition: C.neoMode
    ? "box-shadow 0.1s ease-out, border-color 0.1s ease-out"
    : "border-color 0.2s cubic-bezier(0.16,1,0.3,1), box-shadow 0.2s cubic-bezier(0.16,1,0.3,1)",
  ...extra,
});

export const inputBase = (C) => ({
  flex: 1,
  background: "transparent",
  border: "none",
  outline: "none",
  fontSize: scaleFont(C, 13),
  fontWeight: C.neoMode ? 700 : 400,
  color: C.textPrimary,
  fontFamily: C.fontBody || C.fontMono || "inherit",
  letterSpacing: "-0.01em",
});

export function FieldLabel({ children }) {
  const C = useC();
  return (
    <span
      style={{
        fontSize: scaleFont(C, 10),
        fontWeight: C.neoMode ? 700 : 600,
        textTransform: "uppercase",
        letterSpacing: "0.12em",
        color: C.neoMode ? C.textPrimary : C.textFaint,
        fontFamily: C.fontBody || C.fontMono,
        animation: C.labelAnim,
      }}
    >
      {children}
    </span>
  );
}

export function Badge({ children, color = "violet" }) {
  const C = useC();

  if (C.neoMode) {
    const neoMap = {
      violet: ["#FF6B6B", "#000000", "#000000"],
      pink:   ["#FF6B6B", "#000000", "#000000"],
      amber:  ["#FFD93D", "#000000", "#000000"],
      green:  ["#86efac", "#000000", "#000000"],
      ghost:  ["#FFFFFF", "#000000", "#000000"],
    };
    const [bg, border, text] = neoMap[color] || neoMap.ghost;
    return (
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "2px 8px",
          borderRadius: 0,
          fontSize: scaleFont(C, 10),
          fontWeight: 700,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          fontFamily: C.fontBody || C.fontMono,
          background: bg,
          border: `2px solid ${border}`,
          color: text,
          boxShadow: "2px 2px 0px 0px #000000",
        }}
      >
        {children}
      </span>
    );
  }

  const map = {
    violet: [`rgba(247,147,26,0.12)`, `rgba(247,147,26,0.28)`, C.violetLight],
    pink:   ["rgba(236,72,153,0.1)",  "rgba(236,72,153,0.22)", "#f472b6"],
    amber:  ["rgba(245,158,11,0.1)",  "rgba(245,158,11,0.22)", "#fbbf24"],
    green:  ["rgba(16,185,129,0.1)",  "rgba(16,185,129,0.22)", "#34d399"],
    ghost:  [C.surfaceHigh, C.border, C.textMuted],
  };
  const [bg, border, text] = map[color] || map.ghost;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "2px 8px",
        borderRadius: 6,
        fontSize: scaleFont(C, 10),
        fontWeight: 600,
        letterSpacing: "0.06em",
        fontFamily: C.fontBody || C.fontMono,
        background: bg,
        border: `1px solid ${border}`,
        color: text,
        animation: C.badgeAnim,
      }}
    >
      {children}
    </span>
  );
}

export function IconBtn({ onClick, disabled, title, children }) {
  const C = useC();
  const [hov, setHov] = useState(false);
  const [pressed, setPressed] = useState(false);
  const neo = C.neoMode;

  const transform = neo && !disabled
    ? (pressed ? "translate(2px, 2px)" : hov ? "translate(-1px, -1px)" : "none")
    : (hov && !disabled ? "scale(1.1)" : "scale(1)");

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
        borderRadius: C.radius,
        background: hov ? C.surfaceHigh : "transparent",
        border: neo
          ? `2px solid ${hov || pressed ? "#000000" : "transparent"}`
          : `1px solid ${hov ? C.borderHover : "transparent"}`,
        color: neo ? C.textPrimary : (hov ? C.textPrimary : C.textMuted),
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.4 : 1,
        transition: neo ? "all 0.1s ease-out" : "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        transform,
        boxShadow: neo
          ? (pressed ? "none" : hov ? "4px 4px 0px 0px #000000" : "none")
          : "none",
        animation: C.iconAnim,
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPressed(false); }}
      onMouseDown={() => neo && !disabled && setPressed(true)}
      onMouseUp={() => neo && setPressed(false)}
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
  const idleAnimationsEnabled = C.enableIdleAnimations !== false;
  const [hov, setHov] = useState(false);
  const [pressed, setPressed] = useState(false);
  const neo = C.neoMode;

  const base = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: neo ? 44 : 40,
    padding: "0 18px",
    borderRadius: C.radius,
    fontSize: scaleFont(C, 13),
    fontWeight: neo ? 700 : 600,
    fontFamily: C.fontBody || C.fontMono || C.fontDisplay,
    letterSpacing: neo ? "0.06em" : "-0.01em",
    textTransform: neo ? "uppercase" : undefined,
    width: fullWidth ? "100%" : undefined,
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? 0.45 : 1,
    transition: neo ? "all 0.1s ease-out" : "all 0.2s cubic-bezier(0.16,1,0.3,1)",
    transform: neo
      ? (disabled ? "none" : pressed ? "translate(4px, 4px)" : hov ? "translate(-2px, -2px)" : "none")
      : (hov && !disabled ? "translateY(-1px) scale(1.015)" : "translateY(0) scale(1)"),
    border: "none",
  };

  const vs = neo ? {
    // Primary: solid red, hard shadow, push on click
    primary: {
      background: C.gradAccent,
      color: "#FFFFFF",
      border: "4px solid #000000",
      boxShadow: disabled || pressed ? "none" : hov ? C.shadowSurfaceHover : C.shadowSurface,
    },
    // Success: solid green, hard shadow
    success: {
      background: C.gradSuccess,
      color: "#FFFFFF",
      border: "4px solid #000000",
      boxShadow: C.shadowSurface,
      cursor: "default",
      transform: "none",
    },
    // Danger: red with hard shadow
    danger: {
      background: "#FF6B6B",
      color: "#FFFFFF",
      border: "4px solid #000000",
      boxShadow: disabled || pressed ? "none" : hov ? "8px 8px 0px 0px #000000" : "6px 6px 0px 0px #000000",
    },
    // Ghost: white card, yellow on hover
    ghost: {
      background: hov ? C.secondaryAccent : C.surface,
      color: C.textPrimary,
      border: "4px solid #000000",
      boxShadow: disabled || pressed ? "none" : hov ? C.shadowSurfaceHover : C.shadowSurface,
    },
  } : {
    // Primary: animated gradient sweep + breathing glow
    primary: {
      background: C.gradAccent,
      backgroundSize: "200% 200%",
      animation: idleAnimationsEnabled
        ? `gradientPan ${C.gradAccentAnimDuration} ease infinite${C.btnExtraAnim}`
        : "none",
      color: "#fff",
      boxShadow: hov && !disabled ? C.shadowSurfaceHover : C.glowViolet,
    },
    // Success: completed state
    success: {
      background: C.gradSuccess,
      color: "#fff",
      cursor: "default",
      boxShadow: "0 0 0 1px rgba(16,185,129,0.35), 0 4px 12px rgba(16,185,129,0.2), inset 0 1px 0 rgba(255,255,255,0.12)",
      animation: idleAnimationsEnabled
        ? "surfaceBreath 4s ease-in-out infinite"
        : "none",
    },
    // Danger: red — persistent warning pulse
    danger: {
      background: "linear-gradient(135deg, #dc2626, #b91c1c)",
      color: "#fff",
      boxShadow: hov
        ? "0 0 0 1px rgba(220,38,38,0.5), 0 4px 20px rgba(220,38,38,0.4), inset 0 1px 0 rgba(255,255,255,0.1)"
        : "0 0 0 1px rgba(220,38,38,0.3), inset 0 1px 0 rgba(255,255,255,0.08)",
      animation: idleAnimationsEnabled
        ? "handlePulse 3s ease-in-out infinite"
        : "none",
    },
    // Ghost: glass surface
    ghost: {
      background: hov ? C.surfaceHigh : C.surface,
      backdropFilter: "blur(16px)",
      WebkitBackdropFilter: "blur(16px)",
      color: hov ? C.textPrimary : C.textMuted,
      border: `1px solid ${hov ? C.borderHover : C.border}`,
      boxShadow: hov ? C.shadowSurfaceHover : C.shadowSurface,
      animation: idleAnimationsEnabled ? "surfaceBreath 3s ease-in-out infinite" : "none",
    },
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      style={{ ...base, ...vs[variant], ...sx }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => { setHov(false); setPressed(false); }}
      onMouseDown={() => neo && !disabled && setPressed(true)}
      onMouseUp={() => neo && setPressed(false)}
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
          borderColor: C.border,
          boxShadow: hov ? C.shadowSurfaceHover : C.shadowSurface,
          transform: C.neoMode && hov ? "translate(-2px, -2px)" : "none",
          transition: C.neoMode ? "all 0.1s ease-out" : "all 0.2s cubic-bezier(0.16,1,0.3,1)",
        }}
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
      >
        <Select.Value
          placeholder={
            <span style={{ color: C.textFaint, fontSize: scaleFont(C, 13), fontFamily: C.fontBody || C.fontMono }}>
              {placeholder}
            </span>
          }
        />
        <Select.Icon style={{ color: C.textFaint, display: "flex" }}>
          <ChevronDown size={14} />
        </Select.Icon>
      </Select.Trigger>
      <Select.Portal>
        <Select.Content
          position="popper"
          sideOffset={5}
          style={{
            zIndex: 999,
            minWidth: "var(--radix-select-trigger-width)",
            background: C.selectBg,
            backdropFilter: C.backdropFilterVal,
            WebkitBackdropFilter: C.backdropFilterVal,
            border: `${C.borderW} solid ${C.border}`,
            borderRadius: C.radius,
            boxShadow: C.shadowSurfaceHover,
            overflow: "hidden",
            animation: C.surfaceAnim,
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
        padding: "7px 12px",
        borderRadius: C.neoMode ? 0 : 7,
        fontSize: scaleFont(C, 13),
        fontWeight: C.neoMode ? 700 : 400,
        letterSpacing: "-0.01em",
        fontFamily: C.fontBody || C.fontMono || C.fontDisplay,
        color: hov ? (C.neoMode ? "#000000" : C.textPrimary) : C.textMuted,
        background: hov ? (C.neoMode ? C.secondaryAccent : C.surfaceHigh) : "transparent",
        cursor: "pointer",
        outline: "none",
        transition: C.neoMode ? "all 0.1s ease-out" : "all 0.15s cubic-bezier(0.16,1,0.3,1)",
        userSelect: "none",
        borderBottom: C.neoMode && hov ? "2px solid #000000" : "none",
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
  const idleAnimationsEnabled = C.enableIdleAnimations !== false;
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

  const neo = C.neoMode;

  return (
    <div
      ref={trackRef}
      style={{
        position: "relative",
        height: 24,
        display: "flex",
        alignItems: "center",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      {/* Track */}
      <div
        style={{
          width: "100%",
          height: neo ? 6 : 3,
          background: neo ? "#000000" : C.border,
          borderRadius: neo ? 0 : 99,
          animation: C.surfaceAnim,
          border: neo ? "2px solid #000000" : "none",
        }}
      />
      {/* Active range fill */}
      <div
        style={{
          position: "absolute",
          height: neo ? 6 : 3,
          borderRadius: neo ? 0 : 99,
          background: C.gradAccent,
          backgroundSize: neo ? "auto" : "200% 200%",
          animation:
            neo || !idleAnimationsEnabled
              ? "none"
              : `gradientPan ${C.gradAccentAnimDuration} ease infinite`,
          left: `${sPct}%`,
          right: `${100 - ePct}%`,
        }}
      />
      {/* Drag handles */}
      {[
        { w: "start", p: sPct },
        { w: "end",   p: ePct },
      ].map(({ w, p }) => (
        <div
          key={w}
          onMouseDown={drag(w)}
          style={{
            position: "absolute",
            width: neo ? 16 : 14,
            height: neo ? 16 : 14,
            borderRadius: neo ? 0 : "50%",
            background: neo ? C.gradAccent : C.violetLight,
            border: neo ? "2px solid #000000" : `2px solid ${C.bg}`,
            left: `calc(${p}% - ${neo ? 8 : 7}px)`,
            zIndex: 2,
            cursor: "grab",
            boxShadow: neo ? "3px 3px 0px 0px #000000" : C.glowViolet,
            animation: idleAnimationsEnabled ? C.handleAnim : "none",
            transition: "transform 0.1s ease-out",
          }}
        />
      ))}
    </div>
  );
}
