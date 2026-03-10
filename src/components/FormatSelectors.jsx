import * as Tabs from "@radix-ui/react-tabs";
import { Music, Video } from "lucide-react";
import { FieldLabel, SelectField } from "./ui/Primitives";

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
  videoAudioTrackId,
  setVideoAudioTrackId,
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
            padding: C.neoMode ? 0 : 4,
            gap: C.neoMode ? 4 : 2,
            background: C.surface,
            border: `${C.borderW} solid ${C.border}`,
            borderRadius: C.neoMode ? 0 : 12,
            boxShadow: C.neoMode ? C.shadowSurface : "none",
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
                  borderRadius: C.neoMode ? 0 : 8,
                  fontSize: 12,
                  fontWeight: C.neoMode ? 700 : 600,
                  textTransform: C.neoMode ? "uppercase" : undefined,
                  letterSpacing: C.neoMode ? "0.05em" : undefined,
                  border: C.neoMode
                    ? (isActive ? "3px solid #000000" : "2px solid transparent")
                    : (isActive ? `1px solid ${C.borderFocus}` : "1px solid transparent"),
                  cursor: "pointer",
                  transition: C.neoMode ? "all 0.1s ease-out" : "all 0.15s",
                  background: isActive
                    ? (C.neoMode ? C.secondaryAccent : C.surfaceHigh)
                    : "transparent",
                  color: isActive
                    ? (C.neoMode ? "#000000" : C.violetLight)
                    : C.textMuted,
                  boxShadow: C.neoMode && isActive ? "4px 4px 0px 0px #000000" : "none",
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
              opts: matchFmts
                .filter((f) => f.bitrate != null)
                .map((f) => ({
                  value: String(f.bitrate),
                  label: `${f.bitrate} kbps`,
                })),
              onChange: (v) => {
                const nextBitrate = Number(v);
                if (!Number.isFinite(nextBitrate)) return;
                setSelectedBitrate(nextBitrate);
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
            color: C.textFaint,
          }}
        >
          {containerWarning}
        </div>
      )}
      {!audioOnly && audioTracks.length > 1 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            opacity: downloading ? 0.4 : 1,
            pointerEvents: downloading ? "none" : "auto",
          }}
        >
          <FieldLabel>Audio track / language</FieldLabel>
          <SelectField
            value={videoAudioTrackId}
            onValueChange={(v) => {
              setVideoAudioTrackId(v);
              setDone(false);
            }}
            options={[
              { value: "auto", label: "Auto (default/original)" },
              ...audioTracks.map((t) => ({
                value: t.format_id,
                label: t.label,
              })),
            ]}
          />
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
          {audioTracks.length > 0 && (
            <div
              style={{
                gridColumn: "span 2",
                display: "flex",
                flexDirection: "column",
                gap: 6,
              }}
            >
              <FieldLabel>Audio track / language</FieldLabel>
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
