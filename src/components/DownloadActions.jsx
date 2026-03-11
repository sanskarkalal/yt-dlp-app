import { AlertCircle, CheckCircle2, Download, Loader2, X } from "lucide-react";
import { Btn } from "./ui/Primitives";

export default function DownloadActions({
  C,
  downloading,
  done,
  smoothProgress,
  status,
  startDownload,
  cancelDownload,
  savePath,
  dlLabel,
  errorStatus,
}) {
  const visualProgress = done ? 100 : smoothProgress;
  const idleAnimationsEnabled = C.enableIdleAnimations !== false;

  return (
    <>
      {(downloading || done) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 5,
          }}
        >
          <div
            style={{
              height: C.neoMode ? 10 : 3,
              background: C.neoMode ? "#000000" : C.surfaceHigh,
              borderRadius: C.neoMode ? 0 : 99,
              overflow: "hidden",
              border: C.neoMode ? "2px solid #000000" : "none",
            }}
          >
            <div
              style={{
                height: "100%",
                borderRadius: C.neoMode ? 0 : 99,
                transition: "width 0.15s linear",
                width: `${visualProgress}%`,
                background: done ? C.gradSuccess : C.gradAccent,
                backgroundSize: C.neoMode ? "auto" : "200% 200%",
                animation:
                  downloading && !C.neoMode && idleAnimationsEnabled
                    ? "gradientPan 1.8s ease infinite"
                    : "none",
                boxShadow: C.neoMode ? "none" : (done
                  ? "0 0 12px rgba(16,185,129,0.55), 0 0 4px rgba(16,185,129,0.3)"
                  : "0 0 12px rgba(94,106,210,0.5), 0 0 4px rgba(94,106,210,0.3)"),
              }}
            />
          </div>
          {downloading && (
            <span style={{ fontSize: 11, fontWeight: C.neoMode ? 700 : 400, color: C.textMuted }}>
              {visualProgress.toFixed(1)}%
            </span>
          )}
          {done && <span style={{ fontSize: 11, fontWeight: C.neoMode ? 700 : 400, color: C.neoMode ? C.textPrimary : "#34d399" }}>{status}</span>}
        </div>
      )}

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
            <Btn variant="ghost" disabled fullWidth style={{ flex: 1 }}>
              <Loader2 size={15} className="animate-spin" />
              Downloading...
            </Btn>
            <Btn variant="danger" onClick={cancelDownload} style={{ minWidth: 90 }}>
              <X size={14} />
              Cancel
            </Btn>
          </>
        )}
      </div>

      {errorStatus && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
            color: errorStatus.startsWith("Error") ? (C.neoMode ? "#FF6B6B" : "#f87171") : C.textFaint,
          }}
        >
          <AlertCircle
            size={13}
            style={{
              flexShrink: 0,
              color: errorStatus.startsWith("Error") ? (C.neoMode ? "#FF6B6B" : "#f87171") : C.textFaint,
            }}
          />
          {errorStatus}
        </div>
      )}
    </>
  );
}
