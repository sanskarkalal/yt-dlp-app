import { ChevronDown, FolderOpen } from "lucide-react";
import { FieldLabel } from "./ui/Primitives";

export default function SavePathPicker({
  C,
  downloading,
  pickFolder,
  savePath,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <FieldLabel>Save to</FieldLabel>
      <button
        onClick={pickFolder}
        disabled={downloading}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 40,
          padding: "0 12px",
          background: C.surface,
          border: `${C.borderW} solid ${C.border}`,
          borderRadius: C.radius,
          cursor: downloading ? "not-allowed" : "pointer",
          color: C.textMuted,
          fontSize: 12,
          fontWeight: C.neoMode ? 700 : 400,
          textAlign: "left",
          transition: C.neoMode ? "all 0.1s ease-out" : "border-color 0.15s",
          width: "100%",
          opacity: downloading ? 0.4 : 1,
          boxShadow: C.neoMode ? C.shadowSurface : "none",
        }}
        onMouseEnter={(e) => {
          if (C.neoMode) {
            e.currentTarget.style.boxShadow = C.shadowSurfaceHover;
            e.currentTarget.style.transform = "translate(-2px, -2px)";
          } else {
            e.currentTarget.style.borderColor = C.borderHover;
          }
        }}
        onMouseLeave={(e) => {
          if (C.neoMode) {
            e.currentTarget.style.boxShadow = C.shadowSurface;
            e.currentTarget.style.transform = "none";
          } else {
            e.currentTarget.style.borderColor = C.border;
          }
        }}
      >
        <FolderOpen size={15} style={{ color: C.textFaint, flexShrink: 0 }} />
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
  );
}
