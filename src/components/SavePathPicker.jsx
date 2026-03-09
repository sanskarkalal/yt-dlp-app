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
          border: `1px solid ${C.border}`,
          borderRadius: 12,
          cursor: downloading ? "not-allowed" : "pointer",
          color: C.textMuted,
          fontSize: 12,
          textAlign: "left",
          transition: "border-color 0.15s",
          width: "100%",
          opacity: downloading ? 0.4 : 1,
        }}
        onMouseEnter={(e) => (e.currentTarget.style.borderColor = C.borderHover)}
        onMouseLeave={(e) => (e.currentTarget.style.borderColor = C.border)}
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
