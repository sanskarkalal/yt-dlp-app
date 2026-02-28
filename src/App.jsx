import { useState, useRef, useEffect } from "react";

const formatDuration = (seconds) => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0)
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

export default function App() {
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedFormat, setSelectedFormat] = useState("");
  const [selectedContainer, setSelectedContainer] = useState("mp4");
  const [savePath, setSavePath] = useState("");
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const progressRef = useRef(0);
  const animFrameRef = useRef(null);

  useEffect(() => {
    window.electronAPI.getDownloadsPath().then(setSavePath);
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

  const fetchInfo = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setStatus("Fetching video info...");
    setVideoInfo(null);
    setDone(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    try {
      const info = await window.electronAPI.getVideoInfo(url);
      setVideoInfo(info);
      if (info.formats?.length > 0)
        setSelectedFormat(info.formats[0].format_id);
      setStatus("");
    } catch (err) {
      setStatus("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const pickFolder = async () => {
    const p = await window.electronAPI.selectFolder();
    if (p) setSavePath(p);
  };

  const startDownload = async () => {
    if (!url || !selectedFormat || !savePath) {
      setStatus("Please fill in all fields");
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
      await window.electronAPI.download({
        url,
        formatId: selectedFormat,
        container: selectedContainer,
        savePath,
      });
      setProgress(100);
      setDone(true);
      setStatus("Download complete!");
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

  const selectedFormatData = videoInfo?.formats?.find(
    (f) => f.format_id === selectedFormat,
  );

  return (
    <div
      className="h-screen w-screen bg-[#0a0a0f] text-white flex flex-col overflow-hidden"
      style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -left-40 w-[500px] h-[500px] bg-violet-600/10 rounded-full blur-3xl" />
        <div className="absolute top-0 right-0 w-[400px] h-[400px] bg-pink-600/8 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/3 w-[400px] h-[300px] bg-blue-600/6 rounded-full blur-3xl" />
      </div>

      {/* macOS titlebar drag region */}
      <div
        className="h-9 w-full flex-shrink-0"
        style={{ WebkitAppRegion: "drag" }}
      />

      <div className="relative z-10 flex-1 flex flex-col px-8 pb-8 gap-5 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center shadow-lg shadow-violet-500/30 flex-shrink-0">
            <svg
              className="w-4 h-4 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-base font-semibold tracking-tight">
              YT Downloader
            </h1>
            <p className="text-[11px] text-white/30">Powered by yt-dlp</p>
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
              onClick={fetchInfo}
              disabled={loading || !url.trim()}
              className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 disabled:opacity-30 flex items-center gap-2"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #db2777)",
                boxShadow:
                  loading || !url.trim()
                    ? "none"
                    : "0 0 20px rgba(124,58,237,0.4)",
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
              ) : (
                "Fetch"
              )}
            </button>
          </div>
        </div>

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
                <div className="p-4">
                  <p className="font-semibold text-sm leading-snug line-clamp-2 text-white/90">
                    {videoInfo.title}
                  </p>
                  <p className="text-white/40 text-xs mt-1.5">
                    {videoInfo.uploader}
                  </p>
                </div>
              </div>

              {/* Format detail pills */}
              {selectedFormatData && (
                <div className="flex gap-2 flex-wrap">
                  {selectedFormatData.resolution && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-300 border border-violet-500/20 font-mono">
                      {selectedFormatData.resolution}
                    </span>
                  )}
                  {selectedFormatData.vbitrate && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-pink-500/15 text-pink-300 border border-pink-500/20 font-mono">
                      {selectedFormatData.vbitrate} kbps video
                    </span>
                  )}
                  {selectedFormatData.abitrate && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-blue-500/15 text-blue-300 border border-blue-500/20 font-mono">
                      {selectedFormatData.abitrate} kbps audio
                    </span>
                  )}
                  {selectedFormatData.fps && (
                    <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/20 font-mono">
                      {selectedFormatData.fps} fps
                    </span>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* Empty state — centred in full body */
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
            <div className="flex-1 flex flex-col gap-5 min-w-0">
              {/* Resolution + Container side by side */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                    Resolution
                  </label>
                  <div className="relative">
                    <select
                      value={selectedFormat}
                      onChange={(e) => setSelectedFormat(e.target.value)}
                      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors cursor-pointer text-white/80"
                    >
                      {videoInfo.formats.map((f) => (
                        <option
                          key={f.format_id}
                          value={f.format_id}
                          className="bg-[#1a1a2e]"
                        >
                          {f.label}
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

                <div className="space-y-2">
                  <label className="text-[11px] font-semibold uppercase tracking-widest text-white/30">
                    Container
                  </label>
                  <div className="relative">
                    <select
                      value={selectedContainer}
                      onChange={(e) => setSelectedContainer(e.target.value)}
                      className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-violet-500/50 transition-colors cursor-pointer text-white/80"
                    >
                      <option value="mp4" className="bg-[#1a1a2e]">
                        MP4
                      </option>
                      <option value="mkv" className="bg-[#1a1a2e]">
                        MKV
                      </option>
                      <option value="webm" className="bg-[#1a1a2e]">
                        WebM
                      </option>
                      <option value="mov" className="bg-[#1a1a2e]">
                        MOV
                      </option>
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

              {/* Download / Cancel */}
              <div className="flex gap-3">
                {!downloading ? (
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
                    {done ? "✓ Downloaded" : "Download"}
                  </button>
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
