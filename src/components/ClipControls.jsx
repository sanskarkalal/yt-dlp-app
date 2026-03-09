import { Scissors, X } from "lucide-react";
import { FieldLabel, RangeSlider, inputBase, pill } from "./ui/Primitives";

export default function ClipControls({
  C,
  downloading,
  clipStart,
  setClipStart,
  clipEnd,
  setClipEnd,
  setDone,
  setErrorStatus,
  duration,
  formatDuration,
  sliderStart,
  sliderEnd,
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
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
              setDone(false);
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
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div
          style={{
            ...pill(C),
            flex: 1,
            opacity: downloading ? 0.4 : 1,
            pointerEvents: downloading ? "none" : "auto",
          }}
        >
          <Scissors size={13} style={{ color: C.textFaint }} />
          <input
            value={clipStart}
            onChange={(e) => {
              setClipStart(e.target.value);
              setDone(false);
              setErrorStatus("");
            }}
            placeholder="0:00"
            style={{ ...inputBase(C), fontSize: 12 }}
          />
        </div>
        <span style={{ color: C.textFaint, fontSize: 12 }}>{"->"}</span>
        <div
          style={{
            ...pill(C),
            flex: 1,
            opacity: downloading ? 0.4 : 1,
            pointerEvents: downloading ? "none" : "auto",
          }}
        >
          <input
            value={clipEnd}
            onChange={(e) => {
              setClipEnd(e.target.value);
              setDone(false);
              setErrorStatus("");
            }}
            placeholder={formatDuration(duration) || "0:00"}
            style={{ ...inputBase(C), fontSize: 12 }}
          />
        </div>
      </div>
      {duration > 0 && (
        <RangeSlider
          duration={duration}
          startSecs={sliderStart}
          endSecs={sliderEnd || duration}
          disabled={downloading}
          onStartChange={(v) => {
            setClipStart(v);
            setDone(false);
          }}
          onEndChange={(v) => {
            setClipEnd(v);
            setDone(false);
            if (!clipStart) setClipStart("0:00");
          }}
        />
      )}
    </div>
  );
}
