import { AlertCircle, CheckCircle2, Download, Loader2, X } from "lucide-react";

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
  Btn,
}) {
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
              height: 3,
              background: C.surfaceHigh,
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
          {downloading && (
            <span style={{ fontSize: 11, color: C.textFaint }}>
              {smoothProgress.toFixed(1)}%
            </span>
          )}
          {done && <span style={{ fontSize: 11, color: "#34d399" }}>{status}</span>}
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
            color: errorStatus.startsWith("Error") ? "#f87171" : C.textFaint,
          }}
        >
          <AlertCircle
            size={13}
            style={{
              flexShrink: 0,
              color: errorStatus.startsWith("Error") ? "#f87171" : C.textFaint,
            }}
          />
          {errorStatus}
        </div>
      )}
    </>
  );
}
