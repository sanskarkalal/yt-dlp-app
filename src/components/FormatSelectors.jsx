import * as Tabs from "@radix-ui/react-tabs";
import { Music, Video } from "lucide-react";

export default function FormatSelectors({
  C,
  audioOnly,
  setAudioOnly,
  downloading,
  setDone,
  heights,
  selectedHeight,
  raw,
  setSelectedHeight,
  setSelectedCodec,
  setSelectedBitrate,
  setSelectedContainer,
  getAllowedContainers,
  codecsAtH,
  selectedCodec,
  matchFmts,
  selectedBitrate,
  selectedContainer,
  allowedContainers,
  containerWarning,
  FieldLabel,
  SelectField,
  audioContainer,
  setAudioContainer,
  audioQuality,
  setAudioQuality,
  audioTracks,
  audioTrackId,
  setAudioTrackId,
}) {
  return (
    <>
      <Tabs.Root
        value={audioOnly ? "audio" : "video"}
        onValueChange={(v) => {
          if (downloading) return;
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
            opacity: downloading ? 0.4 : 1,
            pointerEvents: downloading ? "none" : "auto",
          }}
        >
          {[
            { v: "video", l: "Video", I: Video },
            { v: "audio", l: "Audio only", I: Music },
          ].map(({ v, l, I }) => {
            const isActive = (v === "audio") === audioOnly;
            return (
              <Tabs.Trigger
                key={v}
                value={v}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 600,
                  border: isActive
                    ? `1px solid ${C.borderFocus}`
                    : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.15s",
                  background: isActive ? C.surfaceHigh : "transparent",
                  color: isActive ? C.violetLight : C.textMuted,
                }}
              >
                <I size={13} />
                {l}
              </Tabs.Trigger>
            );
          })}
        </Tabs.List>
      </Tabs.Root>

      {!audioOnly && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            opacity: downloading ? 0.4 : 1,
            pointerEvents: downloading ? "none" : "auto",
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
                  ...new Set(raw.filter((f) => f.height === h).map((f) => f.codec)),
                ];
                setSelectedCodec(cs[0]);

                const brs = raw
                  .filter((f) => f.height === h && f.codec === cs[0])
                  .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                setSelectedBitrate(brs[0]?.bitrate ?? null);

                const nextFmt = raw.find((f) => f.height === h && f.codec === cs[0]);
                const nextContainers = getAllowedContainers(nextFmt);
                setSelectedContainer(nextContainers[0]);
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
                  .filter((f) => f.height === selectedHeight && f.codec === v)
                  .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
                setSelectedBitrate(brs[0]?.bitrate ?? null);

                const nextFmt = raw.find(
                  (f) => f.height === selectedHeight && f.codec === v,
                );
                const nextContainers = getAllowedContainers(nextFmt);
                setSelectedContainer(nextContainers[0]);
                setDone(false);
              },
            },
            {
              label: "Bitrate",
              value: selectedBitrate != null ? String(selectedBitrate) : "",
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
              opts: allowedContainers.map((c) => ({
                value: c,
                label: c.toUpperCase(),
              })),
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
              <SelectField value={value} onValueChange={onChange} options={opts} />
            </div>
          ))}
        </div>
      )}
      {!audioOnly && containerWarning && (
        <div
          style={{
            marginTop: 10,
            fontSize: 12,
            color: "#f59e0b",
          }}
        >
          {containerWarning}
        </div>
      )}

      {audioOnly && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 12,
            opacity: downloading ? 0.4 : 1,
            pointerEvents: downloading ? "none" : "auto",
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
              options={["mp3", "m4a", "opus", "wav", "flac"].map((f) => ({
                value: f,
                label: f.toUpperCase(),
              }))}
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
              options={["320", "256", "192", "128", "96"].map((q) => ({
                value: q,
                label: `${q} kbps`,
              }))}
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
    </>
  );
}
