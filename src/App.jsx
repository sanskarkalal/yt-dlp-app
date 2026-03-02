import { useState, useRef, useEffect, useCallback } from "react";
import iconPng from "./assets/icon.png";
const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

const isValidTime = (t) => /^(\d{1,2}:)?\d{1,2}:\d{2}$/.test(t.trim());

// Convert "MM:SS" or "HH:MM:SS" to seconds
const timeToSecs = (t) => {
  if (!t || !isValidTime(t)) return null;
  const parts = t.trim().split(":").map(Number);
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
};

// Convert seconds to "H:MM:SS" or "M:SS"
const secsToTime = (s) => {
  const totalSecs = Math.round(s);
  const h = Math.floor(totalSecs / 3600);
  const m = Math.floor((totalSecs % 3600) / 60);
  const sec = totalSecs % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  return `${m}:${String(sec).padStart(2, "0")}`;
};

// Dual-thumb range slider component
function RangeSlider({ min, max, startVal, endVal, onChange }) {
  const trackRef = useRef(null);
  const dragging = useRef(null); // "start" | "end" | null

  const clamp = (v) => Math.max(min, Math.min(max, v));

  const posFromEvent = (e) => {
    const rect = trackRef.current.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    return clamp(min + ((clientX - rect.left) / rect.width) * (max - min));
  };

  const onMouseDown = (thumb) => (e) => {
    e.preventDefault();
    dragging.current = thumb;
  };

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current || !trackRef.current) return;
      const val = posFromEvent(e);
      if (dragging.current === "start") {
        onChange(Math.min(val, endVal - 1), endVal);
      } else {
        onChange(startVal, Math.max(val, startVal + 1));
      }
    };
    const onUp = () => {
      dragging.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onUp);
    };
  });

  const startPct = ((startVal - min) / (max - min)) * 100;
  const endPct = ((endVal - min) / (max - min)) * 100;

  return (
    <div
      ref={trackRef}
      className="relative h-5 flex items-center select-none cursor-default"
    >
      {/* Track background */}
      <div className="absolute inset-x-0 h-1 rounded-full bg-white/10" />
      {/* Active range */}
      <div
        className="absolute h-1 rounded-full"
        style={{
          left: `${startPct}%`,
          width: `${endPct - startPct}%`,
          background: "linear-gradient(90deg, #7c3aed, #db2777)",
        }}
      />
      {/* Start thumb */}
      <div
        onMouseDown={onMouseDown("start")}
        className="absolute w-4 h-4 rounded-full border-2 border-violet-400 bg-[#0a0a0f] cursor-grab active:cursor-grabbing shadow-lg"
        style={{ left: `calc(${startPct}% - 8px)`, zIndex: 2 }}
      />
      {/* End thumb */}
      <div
        onMouseDown={onMouseDown("end")}
        className="absolute w-4 h-4 rounded-full border-2 border-pink-400 bg-[#0a0a0f] cursor-grab active:cursor-grabbing shadow-lg"
        style={{ left: `calc(${endPct}% - 8px)`, zIndex: 2 }}
      />
    </div>
  );
}

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
  // NEW
  const [audioTrackId, setAudioTrackId] = useState("bestaudio/best");
  const [audioContainer, setAudioContainer] = useState("mp3");

  const progressRef = useRef(0);
  const animFrameRef = useRef(null);

  // Derived slider values (seconds)
  const duration = videoInfo?.duration || 0;
  const sliderStart = timeToSecs(clipStart) ?? 0;
  const sliderEnd = timeToSecs(clipEnd) ?? duration;

  const handleSliderChange = useCallback((newStart, newEnd) => {
    setClipStart(secsToTime(newStart));
    setClipEnd(secsToTime(newEnd));
    setDone(false);
  }, []);

  useEffect(() => {
    window.electronAPI.getDownloadsPath().then(setSavePath);
    window.electronAPI.getCookiesStatus().then(setCookiesOk);
    window.electronAPI.onCookiesStatus((ok) => setCookiesOk(ok));
  }, []);

  useEffect(() => {
    const target = progress;
    const animate = () => {
      progressRef.current += (target - progressRef.current) * 0.08;
      setSmoothProgress(parseFloat(progressRef.current.toFixed(2)));
      if (Math.abs(progressRef.current - target) > 0.1) {
        animFrameRef.current = requestAnimationFrame(animate);
      } else {
        progressRef.current = target;
        setSmoothProgress(target);
      }
    };
    cancelAnimationFrame(animFrameRef.current);
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [progress]);

  const fetchInfo = async (urlToFetch = url) => {
    if (!urlToFetch.trim()) return;
    setLoading(true);
    setStatus("Fetching video info...");
    setVideoInfo(null);
    setDone(false);
    setThumbDone(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setShowLoginPrompt(false);
    setClipStart("");
    setClipEnd("");
    setAudioTrackId("bestaudio/best"); // reset on new fetch
    try {
      const info = await window.electronAPI.getVideoInfo(urlToFetch);
      setVideoInfo(info);
      // Auto-select first available height
      if (info.rawFormats?.length > 0) {
        const firstHeight = info.rawFormats[0].height;
        setSelectedHeight(firstHeight);
        const codecsAtHeight = [
          ...new Set(
            info.rawFormats
              .filter((f) => f.height === firstHeight)
              .map((f) => f.codec),
          ),
        ];
        setSelectedCodec(codecsAtHeight[0] || null);
        const bitratesAtHeightCodec = info.rawFormats
          .filter(
            (f) => f.height === firstHeight && f.codec === codecsAtHeight[0],
          )
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        setSelectedBitrate(bitratesAtHeightCodec[0]?.bitrate ?? null);
      }
      // Auto-select first available container (prefer mp4, else first in list)
      if (info.availableContainers?.length > 0) {
        setSelectedContainer(
          info.availableContainers.includes("mp4")
            ? "mp4"
            : info.availableContainers[0],
        );
      }
      setStatus("");
    } catch (err) {
      if (err.message.includes("AGE_RESTRICTED")) {
        setPendingUrl(urlToFetch);
        setShowLoginPrompt(true);
        setStatus("");
      } else {
        setStatus("Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeLogin = async () => {
    setLoggingIn(true);
    setShowLoginPrompt(false);
    setStatus("Waiting for YouTube sign-in...");
    try {
      const success = await window.electronAPI.openYouTubeLogin();
      if (success) {
        setCookiesOk(true);
        setStatus("Signed in! Retrying...");
        await fetchInfo(pendingUrl);
        setPendingUrl(null);
      } else {
        setStatus("Sign-in cancelled or failed.");
      }
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
    window.electronAPI.onProgress((percent) => {
      setProgress(percent);
      setStatus("Downloading...");
    });
    try {
      // Derive the download_id from selected height+codec+bitrate
      const selectedRaw = videoInfo?.rawFormats?.find(
        (f) =>
          f.height === selectedHeight &&
          f.codec === selectedCodec &&
          f.bitrate === selectedBitrate,
      );
      const resolvedFormatId =
        selectedRaw?.download_id || "bestvideo+bestaudio";

      await window.electronAPI.download({
        url,
        formatId: resolvedFormatId,
        container: selectedContainer,
        savePath,
        clipStart: clipStart.trim() || null,
        clipEnd: clipEnd.trim() || null,
        audioOnly,
        audioQuality,
        audioTrackId: audioOnly ? audioTrackId : null,
        audioContainer: audioOnly ? audioContainer : null,
      });
      setProgress(100);
      setDone(true);
      setStatus(
        audioOnly
          ? "Audio downloaded!"
          : clipStart
            ? "Clip downloaded!"
            : "Download complete!",
      );
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
    await window.electronAPI.cancelDownload();
    setDownloading(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setStatus("Download cancelled");
  };

  const downloadThumbnail = async () => {
    if (!videoInfo || !savePath) return;
    setThumbDownloading(true);
    setStatus("Saving thumbnail...");
    try {
      const thumbs = videoInfo.thumbnails || [];
      const best = thumbs
        .filter((t) => t.url)
        .sort(
          (a, b) =>
            (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
        )[0];
      const thumbnailUrl = best?.url || videoInfo.thumbnail;
      await window.electronAPI.downloadThumbnail({
        thumbnailUrl,
        title: videoInfo.title,
        savePath,
      });
      setThumbDone(true);
      setStatus("Thumbnail saved!");
    } catch (err) {
      setStatus("Error saving thumbnail: " + err.message);
    } finally {
      setThumbDownloading(false);
    }
  };

  const AuthPill = () => {
    if (cookiesOk) {
      return (
        <button
          onClick={async () => {
            await window.electronAPI.clearCookies();
            setCookiesOk(false);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors group"
          title="Signed in — click to sign out"
        >
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="text-[11px] text-emerald-400">Signed in</span>
        </button>
      );
    }
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10">
        <div className="w-1.5 h-1.5 rounded-full bg-white/20" />
        <span className="text-[11px] text-white/30">Not signed in</span>
      </div>
    );
  };

  return (
    <div
      className="h-screen w-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-pink-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-blue-600/6 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 flex-1 flex flex-col px-8 pt-4 pb-8 gap-4 overflow-y-auto scrollbar-hide">
        {/* Header */}
        <div
          className="flex items-center justify-between flex-shrink-0"
          style={{ WebkitAppRegion: "drag" }}
        >
          <div className="flex items-center gap-2 select-none">
            <img
              src={iconPng}
              alt="App Icon"
              className="w-10 h-10 object-contain select-none"
            />

            <span
              className="text-xs font-black uppercase tracking-widest"
              style={{
                background: "linear-gradient(90deg, #a78bfa, #f472b6, #fb923c)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                fontStyle: "italic",
              }}
            >
              Seedhe Download
            </span>
          </div>
          <div style={{ WebkitAppRegion: "no-drag" }}>
            <AuthPill />
          </div>
        </div>

        {/* URL Bar */}
        <div className="relative group flex-shrink-0">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-violet-500/20 to-pink-500/20 blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
          <div className="relative flex gap-2 bg-white/5 border border-white/10 rounded-xl p-1.5 backdrop-blur-sm focus-within:border-white/20 transition-colors">
            <input
              type="text"
              placeholder="Paste YouTube URL..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && fetchInfo()}
              className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-white/20 text-white"
            />
            <button
              onClick={async () => {
                if (!url.trim()) {
                  try {
                    const text = await navigator.clipboard.readText();
                    if (text.trim()) {
                      setUrl(text.trim());
                      await fetchInfo(text.trim());
                    }
                  } catch {}
                } else {
                  fetchInfo();
                }
              }}
              disabled={loading}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-30 flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                boxShadow: loading ? "none" : "0 0 20px rgba(124,58,237,0.4)",
              }}
            >
              {loading ? (
                <>
                  <svg
                    className="animate-spin w-3.5 h-3.5"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"
                    />
                  </svg>
                  Fetching
                </>
              ) : url.trim() ? (
                "Fetch"
              ) : (
                "📋 Paste"
              )}
            </button>
          </div>
        </div>

        {/* Age restriction prompt */}
        {showLoginPrompt && (
          <div className="flex-shrink-0 bg-white/5 border border-white/15 rounded-xl p-4 flex items-center gap-4">
            <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 text-lg">
              🔞
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-white/80">
                Age-restricted video
              </p>
              <p className="text-xs text-white/40 mt-0.5">
                Sign in to YouTube to access this video
              </p>
            </div>
            <button
              onClick={handleYouTubeLogin}
              className="px-4 py-2 rounded-lg text-sm font-bold transition-colors flex-shrink-0"
              style={{ background: "#ffffff", color: "#000000" }}
            >
              Sign in to YouTube
            </button>
          </div>
        )}

        {loggingIn && (
          <div className="flex-shrink-0 bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
            <svg
              className="animate-spin w-4 h-4 text-white/40"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8v8z"
              />
            </svg>
            <span className="text-sm text-white/40">
              Waiting for YouTube sign-in...
            </span>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 flex gap-8 min-h-0">
          {/* Left — video card */}
          {videoInfo ? (
            <div className="w-72 flex-shrink-0 flex flex-col gap-4">
              <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                {videoInfo.thumbnail && (
                  <div className="relative">
                    <img
                      src={videoInfo.thumbnail}
                      alt="thumbnail"
                      className="w-full h-44 object-cover"
                    />
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                      {formatDuration(videoInfo.duration)}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  </div>
                )}

                {/* NEW: Thumbnail download button — below the image */}
                <div className="px-3 pt-3 pb-0">
                  <button
                    onClick={downloadThumbnail}
                    disabled={!savePath || thumbDownloading || thumbDone}
                    title="Save thumbnail as JPG"
                    className="w-full py-2 rounded-xl font-semibold text-xs transition-all duration-300 disabled:opacity-30 flex items-center justify-center gap-1.5"
                    style={{
                      background: thumbDone
                        ? "linear-gradient(135deg, #059669, #10b981)"
                        : "linear-gradient(135deg, #d97706, #f59e0b)",
                      boxShadow:
                        thumbDone || !savePath
                          ? "none"
                          : "0 0 14px rgba(217,119,6,0.3)",
                    }}
                  >
                    {thumbDownloading ? (
                      <svg
                        className="animate-spin w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"
                        />
                      </svg>
                    ) : thumbDone ? (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Saved
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-3.5 h-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                        Save Thumbnail
                      </>
                    )}
                  </button>
                </div>

                <div className="p-4">
                  <p className="font-semibold text-sm leading-snug line-clamp-2 text-white/90">
                    {videoInfo.title}
                  </p>
                  <p className="text-white/40 text-xs mt-1.5">
                    {videoInfo.uploader}
                  </p>
                </div>
              </div>

              {!audioOnly && selectedHeight && (
                <div className="flex gap-2 flex-wrap">
                  {(() => {
                    const f = videoInfo?.rawFormats?.find(
                      (r) =>
                        r.height === selectedHeight &&
                        r.codec === selectedCodec &&
                        r.bitrate === selectedBitrate,
                    );
                    return (
                      <>
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 font-mono">
                          {f?.width && f?.height
                            ? `${f.width}×${f.height}`
                            : `${selectedHeight}p`}
                        </span>
                        {selectedCodec && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/20 font-mono">
                            {selectedCodec}
                          </span>
                        )}
                        {selectedBitrate && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-mono">
                            {selectedBitrate} kbps
                          </span>
                        )}
                        {f?.fps && (
                          <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-mono">
                            {f.fps} fps
                          </span>
                        )}
                        <span className="text-[11px] px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/20 font-mono">
                          {selectedContainer.toUpperCase()}
                        </span>
                      </>
                    );
                  })()}
                </div>
              )}

              {audioOnly && (
                <div className="flex gap-2 flex-wrap">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 font-mono">
                    {audioContainer.toUpperCase()} · {audioQuality}kbps
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-3 text-white/20">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/8 flex items-center justify-center">
                <svg
                  className="w-8 h-8"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
                </svg>
              </div>
              <p className="text-sm">
                Paste a YouTube URL above to get started
              </p>
            </div>
          )}

          {/* Right — controls */}
          {videoInfo && (
            <div className="flex-1 flex flex-col gap-4 min-w-0">
              {/* Video / Audio toggle */}
              <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-xl p-1 self-start">
                <button
                  onClick={() => {
                    setAudioOnly(false);
                    setDone(false);
                  }}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: !audioOnly
                      ? "linear-gradient(135deg, #7c3aed, #db2777)"
                      : "transparent",
                    color: !audioOnly ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  Video
                </button>
                <button
                  onClick={() => {
                    setAudioOnly(true);
                    setDone(false);
                  }}
                  className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200"
                  style={{
                    background: audioOnly
                      ? "linear-gradient(135deg, #7c3aed, #db2777)"
                      : "transparent",
                    color: audioOnly ? "white" : "rgba(255,255,255,0.4)",
                  }}
                >
                  Audio only
                </button>
              </div>

              {/* Video controls — cascading selectors */}
              {!audioOnly &&
                (() => {
                  const raw = videoInfo.rawFormats || [];

                  const heights = [...new Set(raw.map((f) => f.height))].sort(
                    (a, b) => b - a,
                  );
                  const codecsAtHeight = [
                    ...new Set(
                      raw
                        .filter((f) => f.height === selectedHeight)
                        .map((f) => f.codec),
                    ),
                  ];
                  const matchingFormats = raw
                    .filter(
                      (f) =>
                        f.height === selectedHeight &&
                        f.codec === selectedCodec,
                    )
                    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

                  const selectCls =
                    "w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors cursor-pointer text-white/80";
                  const optCls = "bg-[#1a1a2e]";
                  const Chevron = () => (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  );

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      {/* Resolution */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Resolution
                        </label>
                        <div className="relative">
                          <select
                            value={selectedHeight ?? ""}
                            className={selectCls}
                            onChange={(e) => {
                              const h = Number(e.target.value);
                              setSelectedHeight(h);
                              setDone(false);
                              const codecs = [
                                ...new Set(
                                  raw
                                    .filter((f) => f.height === h)
                                    .map((f) => f.codec),
                                ),
                              ];
                              const codec = codecs[0] || null;
                              setSelectedCodec(codec);
                              const bits = raw
                                .filter(
                                  (f) => f.height === h && f.codec === codec,
                                )
                                .sort(
                                  (a, b) => (b.bitrate || 0) - (a.bitrate || 0),
                                );
                              setSelectedBitrate(bits[0]?.bitrate ?? null);
                            }}
                          >
                            {heights.map((h) => (
                              <option key={h} value={h} className={optCls}>
                                {h}p
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </div>
                      </div>

                      {/* Codec */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Codec
                        </label>
                        <div className="relative">
                          <select
                            value={selectedCodec ?? ""}
                            className={selectCls}
                            onChange={(e) => {
                              const codec = e.target.value;
                              setSelectedCodec(codec);
                              setDone(false);
                              const bits = raw
                                .filter(
                                  (f) =>
                                    f.height === selectedHeight &&
                                    f.codec === codec,
                                )
                                .sort(
                                  (a, b) => (b.bitrate || 0) - (a.bitrate || 0),
                                );
                              setSelectedBitrate(bits[0]?.bitrate ?? null);
                            }}
                          >
                            {codecsAtHeight.map((c) => (
                              <option key={c} value={c} className={optCls}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </div>
                      </div>

                      {/* Bitrate */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Bitrate
                        </label>
                        <div className="relative">
                          <select
                            value={selectedBitrate ?? ""}
                            className={selectCls}
                            onChange={(e) => {
                              const val = e.target.value;
                              setSelectedBitrate(
                                val === "" ? null : Number(val),
                              );
                              setDone(false);
                            }}
                          >
                            {matchingFormats.length === 0 ? (
                              <option value="" className={optCls}>
                                No options
                              </option>
                            ) : (
                              matchingFormats.map((f) => (
                                <option
                                  key={f.format_id}
                                  value={f.bitrate ?? ""}
                                  className={optCls}
                                >
                                  {f.bitrate ? `${f.bitrate} kbps` : "Unknown"}
                                  {f.fps >= 60 ? ` · ${f.fps}fps` : ""}
                                  {!f.hasMuxedAudio ? " · video only" : ""}
                                </option>
                              ))
                            )}
                          </select>
                          <Chevron />
                        </div>
                      </div>

                      {/* Container */}
                      <div className="space-y-2">
                        <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                          Container
                        </label>
                        <div className="relative">
                          <select
                            value={selectedContainer}
                            className={selectCls}
                            onChange={(e) => {
                              setSelectedContainer(e.target.value);
                              setDone(false);
                            }}
                          >
                            {(
                              videoInfo.availableContainers || ["mp4", "mkv"]
                            ).map((c) => (
                              <option key={c} value={c} className={optCls}>
                                {c.toUpperCase()}
                              </option>
                            ))}
                          </select>
                          <Chevron />
                        </div>
                      </div>
                    </div>
                  );
                })()}

              {/* Audio controls */}
              {audioOnly && (
                <div className="space-y-3">
                  {/* Quality */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                      Quality
                    </label>
                    <div className="flex gap-2">
                      {["128", "192", "320"].map((q) => (
                        <button
                          key={q}
                          onClick={() => setAudioQuality(q)}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border"
                          style={{
                            background:
                              audioQuality === q
                                ? "linear-gradient(135deg, #7c3aed33, #db277733)"
                                : "rgba(255,255,255,0.03)",
                            borderColor:
                              audioQuality === q
                                ? "rgba(124,58,237,0.5)"
                                : "rgba(255,255,255,0.1)",
                            color:
                              audioQuality === q
                                ? "white"
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {q}k
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* NEW: Audio container format */}
                  <div className="space-y-2">
                    <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                      Format
                    </label>
                    <div className="flex gap-2">
                      {["mp3", "m4a", "opus", "wav"].map((c) => (
                        <button
                          key={c}
                          onClick={() => {
                            setAudioContainer(c);
                            setDone(false);
                          }}
                          className="flex-1 py-3 rounded-xl text-sm font-semibold transition-all duration-200 border"
                          style={{
                            background:
                              audioContainer === c
                                ? "linear-gradient(135deg, #7c3aed33, #db277733)"
                                : "rgba(255,255,255,0.03)",
                            borderColor:
                              audioContainer === c
                                ? "rgba(124,58,237,0.5)"
                                : "rgba(255,255,255,0.1)",
                            color:
                              audioContainer === c
                                ? "white"
                                : "rgba(255,255,255,0.4)",
                          }}
                        >
                          {c.toUpperCase()}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* NEW: Audio track selector — only if multiple tracks exist */}
                  {(videoInfo.audioTracks?.length ?? 0) > 1 && (
                    <div className="space-y-2">
                      <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                        Audio Track
                      </label>
                      <div className="relative">
                        <select
                          value={audioTrackId}
                          onChange={(e) => {
                            setAudioTrackId(e.target.value);
                            setDone(false);
                          }}
                          className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors cursor-pointer text-white/80"
                        >
                          {videoInfo.audioTracks.map((t) => (
                            <option
                              key={t.format_id}
                              value={t.format_id}
                              className="bg-[#1a1a2e]"
                            >
                              {t.label}
                            </option>
                          ))}
                        </select>
                        <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/30">
                          <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 9l-7 7-7-7"
                            />
                          </svg>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Clip section */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Clip{" "}
                  <span className="normal-case font-normal text-white/20">
                    (optional)
                  </span>
                </label>

                {/* Dual-thumb slider */}
                {duration > 0 && (
                  <div className="px-1 pt-1 pb-2">
                    <RangeSlider
                      min={0}
                      max={duration}
                      startVal={sliderStart}
                      endVal={sliderEnd}
                      onChange={handleSliderChange}
                    />
                    <div className="flex justify-between mt-1">
                      <span className="text-[10px] text-white/20 font-mono">
                        0:00
                      </span>
                      <span className="text-[10px] text-white/20 font-mono">
                        {formatDuration(duration)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Text inputs */}
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Start  0:00"
                    value={clipStart}
                    onChange={(e) => {
                      setClipStart(e.target.value);
                      setDone(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors text-white/80 placeholder:text-white/20 font-mono"
                  />
                  <input
                    type="text"
                    placeholder="End  1:30"
                    value={clipEnd}
                    onChange={(e) => {
                      setClipEnd(e.target.value);
                      setDone(false);
                    }}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500/50 transition-colors text-white/80 placeholder:text-white/20 font-mono"
                  />
                </div>
              </div>

              {/* Save Location */}
              <div className="space-y-2">
                <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Save Location
                </label>
                <div
                  onClick={pickFolder}
                  className="w-full flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-3 cursor-pointer hover:bg-white/8 hover:border-white/20 transition-all duration-200 group"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500/30 to-orange-500/30 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
                    <svg
                      className="w-4 h-4 text-amber-400"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M10 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-white/25 mb-0.5 uppercase tracking-wider">
                      Save to
                    </p>
                    <p className="text-sm text-white/70 truncate font-mono">
                      {savePath || "Click to choose folder"}
                    </p>
                  </div>
                  <svg
                    className="w-4 h-4 text-white/20 group-hover:text-white/50 transition-colors flex-shrink-0"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </div>
              </div>

              {/* Spacer */}
              <div className="flex-1" />

              {/* Progress */}
              {(downloading || done) && (
                <div className="space-y-2">
                  <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full"
                      style={{
                        width: `${smoothProgress}%`,
                        background:
                          "linear-gradient(90deg, #7c3aed, #db2777, #f59e0b)",
                        boxShadow: "0 0 12px rgba(124,58,237,0.8)",
                        transition: "width 0.1s linear",
                      }}
                    />
                    {downloading && (
                      <div
                        className="absolute inset-y-0 rounded-full animate-pulse"
                        style={{
                          width: `${smoothProgress}%`,
                          background:
                            "linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent)",
                        }}
                      />
                    )}
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-white/30">{status}</span>
                    <span className="text-xs font-mono text-white/50">
                      {smoothProgress.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {/* Download / Cancel + Thumbnail */}
              <div className="flex gap-3">
                {!downloading ? (
                  <>
                    <button
                      onClick={startDownload}
                      disabled={!savePath || done}
                      className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-all duration-300 disabled:opacity-30"
                      style={{
                        background: done
                          ? "linear-gradient(135deg, #059669, #10b981)"
                          : "linear-gradient(135deg, #7c3aed, #db2777)",
                        boxShadow:
                          !savePath || done
                            ? "none"
                            : "0 0 30px rgba(124,58,237,0.35)",
                      }}
                    >
                      {done
                        ? "✓ Downloaded"
                        : audioOnly
                          ? `Download ${audioContainer.toUpperCase()}`
                          : clipStart && clipEnd
                            ? `Download Clip · ${selectedContainer.toUpperCase()}`
                            : `Download · ${selectedContainer.toUpperCase()}`}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      disabled
                      className="flex-1 py-3.5 rounded-xl font-semibold text-sm opacity-50"
                      style={{
                        background: "linear-gradient(135deg, #7c3aed, #db2777)",
                      }}
                    >
                      Downloading...
                    </button>
                    <button
                      onClick={cancelDownload}
                      className="px-6 py-3.5 rounded-xl font-semibold text-sm transition-all duration-200"
                      style={{
                        background: "linear-gradient(135deg, #dc2626, #b91c1c)",
                        boxShadow: "0 0 20px rgba(220,38,38,0.4)",
                      }}
                    >
                      Cancel
                    </button>
                  </>
                )}
              </div>

              {!downloading && !done && status && (
                <p className="text-xs text-center text-white/30">{status}</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
