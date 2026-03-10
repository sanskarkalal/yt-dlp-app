import { useState, useEffect, useRef } from "react";
import {
  Download,
  X,
  Clock,
  CheckCircle2,
  LogIn,
  Image as ImageIcon,
  Music,
  Video,
  Loader2,
  Bot,
  Lock,
  ClipboardPaste,
  RefreshCw,
  Sun,
  Moon,
  Instagram,
} from "lucide-react";
import { cn } from "./lib/utils";
import {
  estimateSizeRangeLabel,
  getAllowedContainers,
} from "./lib/format-utils";
import { formatDuration, isValidTime, timeToSecs } from "./lib/time-utils";
import { DARK, LIGHT, ThemeCtx } from "./theme";
import iconPng from "./assets/icon.png";
import FormatSelectors from "./components/FormatSelectors";
import ClipControls from "./components/ClipControls";
import SavePathPicker from "./components/SavePathPicker";
import DownloadActions from "./components/DownloadActions";
import HistoryDrawer from "./components/HistoryDrawer";
import {
  Badge,
  Btn,
  IconBtn,
  inputBase,
  pill,
} from "./components/ui/Primitives";

const SAVE_PATH_STORAGE_KEY = "seedhe_download_save_path";
const THEME_STORAGE_KEY = "seedhe_theme_mode";
const INSTAGRAM_DM_URL = "https://ig.me/m/sanskar.cs";

function normalizeThumbnailUrl(u) {
  if (!u || typeof u !== "string") return null;
  const s = u.replace(/&amp;/g, "&").trim();
  if (!s) return null;
  if (s.startsWith("//")) return `https:${s}`;
  if (s.startsWith("http://")) return s.replace(/^http:\/\//i, "https://");
  return s;
}

function getThumbnailCandidates(info) {
  if (!info) return null;
  const sortedThumbUrls = (
    Array.isArray(info.thumbnails) ? info.thumbnails : []
  )
    .filter((t) => t?.url)
    .sort(
      (a, b) =>
        (b.width || 0) * (b.height || 0) - (a.width || 0) * (a.height || 0),
    )
    .map((t) => t.url);

  const candidates = [info.thumbnail, ...sortedThumbUrls]
    .map(normalizeThumbnailUrl)
    .filter(Boolean);
  return [...new Set(candidates)];
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem(THEME_STORAGE_KEY);
    if (savedTheme === "light") return false;
    if (savedTheme === "dark") return true;
    return true;
  });
  const C = darkMode ? DARK : LIGHT;
  const [url, setUrl] = useState("");
  const [videoInfo, setVideoInfo] = useState(null);
  const [selectedHeight, setSelectedHeight] = useState(null);
  const [selectedCodec, setSelectedCodec] = useState(null);
  const [selectedBitrate, setSelectedBitrate] = useState(null);
  const [selectedContainer, setSelectedContainer] = useState("mp4");
  const [savePath, setSavePath] = useState("");
  const [status, setStatus] = useState("");
  const [errorStatus, setErrorStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [smoothProgress, setSmoothProgress] = useState(0);
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [done, setDone] = useState(false);
  const [cookiesOk, setCookiesOk] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [loggingIn, setLoggingIn] = useState(false);
  const [showSignOutConfirm, setShowSignOutConfirm] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [pendingUrl, setPendingUrl] = useState(null);
  const [clipStart, setClipStart] = useState("");
  const [clipEnd, setClipEnd] = useState("");
  const [thumbDone, setThumbDone] = useState(false);
  const [thumbDownloading, setThumbDownloading] = useState(false);
  const [audioOnly, setAudioOnly] = useState(false);
  const [audioQuality, setAudioQuality] = useState("192");
  const [audioTrackId, setAudioTrackId] = useState("bestaudio/best");
  const [videoAudioTrackId, setVideoAudioTrackId] = useState("auto");
  const [audioContainer, setAudioContainer] = useState("mp3");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [botDetected, setBotDetected] = useState(false);
  const [thumbnailLoadError, setThumbnailLoadError] = useState(false);
  const [thumbnailCandidateIndex, setThumbnailCandidateIndex] = useState(0);
  const [showInstaLabel, setShowInstaLabel] = useState(false);
  const [appVersion, setAppVersion] = useState("");
  const progressRef = useRef(0);
  const animFrameRef = useRef(null);

  const duration = videoInfo?.duration || 0;
  const sliderStart = timeToSecs(clipStart) ?? 0;
  const sliderEnd = timeToSecs(clipEnd) ?? duration;

  const raw = videoInfo?.rawFormats || [];
  const heights = [...new Set(raw.map((f) => f.height))].sort((a, b) => b - a);
  const codecsAtH = [
    ...new Set(
      raw.filter((f) => f.height === selectedHeight).map((f) => f.codec),
    ),
  ];
  const matchFmts = raw
    .filter((f) => f.height === selectedHeight && f.codec === selectedCodec)
    .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))
    .filter((f, i, arr) => arr.findIndex((x) => x.bitrate === f.bitrate) === i);
  const audioTracks = videoInfo?.audioTracks || [];
  const selRawFmt = raw.find(
    (f) =>
      f.height === selectedHeight &&
      f.codec === selectedCodec &&
      f.bitrate === selectedBitrate,
  );
  const allowedContainers = getAllowedContainers(selRawFmt);
  const showMp4Warning =
    !audioOnly &&
    selectedContainer === "mp4" &&
    (selectedCodec === "VP9" || selectedCodec === "AV1");
  const showMkvWarning =
    !audioOnly &&
    selectedContainer === "mkv" &&
    (selectedCodec === "H264" || selectedCodec === "H265");
  const containerWarning = showMp4Warning
    ? "Hint: MKV is usually the preferred container for this codec."
    : showMkvWarning
      ? "Hint: MP4 is usually the preferred container for H264/H265."
      : null;
  const clipStartSecs = timeToSecs(clipStart);
  const clipEndSecs = timeToSecs(clipEnd);
  const estimatedDurationSecs =
    duration > 0 && clipStartSecs != null && clipEndSecs != null
      ? Math.max(
          0,
          Math.min(duration, clipEndSecs) - Math.max(0, clipStartSecs),
        )
      : duration > 0
        ? duration
        : null;
  const bestAudioAbr = Math.max(...audioTracks.map((t) => t.abr || 0), 0);
  const estimatedAudioKbps = selRawFmt?.hasMuxedAudio ? 0 : bestAudioAbr || 128;
  const estimatedTotalKbps = (selRawFmt?.bitrate || 0) + estimatedAudioKbps;
  const estimateUncertainty = selRawFmt?.hasMuxedAudio ? 0.22 : 0.3;
  const estimatedSizeLabel = estimateSizeRangeLabel(
    estimatedTotalKbps,
    estimatedDurationSecs,
    estimateUncertainty,
  );
  const thumbnailCandidates = getThumbnailCandidates(videoInfo) || [];
  const bestThumbnailUrl = thumbnailCandidates[0] || null;
  const activeThumbnailUrl =
    thumbnailCandidates[thumbnailCandidateIndex] || null;

  useEffect(() => {
    progressRef.current = progress;
  }, [progress]);

  useEffect(() => {
    const animate = () => {
      setSmoothProgress((prev) => {
        const d = progressRef.current - prev;
        return Math.abs(d) < 0.1 ? progressRef.current : prev + d * 0.12;
      });
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  useEffect(() => {
    window.electronAPI.getCookiesStatus().then(setCookiesOk);
    window.electronAPI.getDownloadsPath().then((defaultPath) => {
      const storedPath = localStorage.getItem(SAVE_PATH_STORAGE_KEY);
      setSavePath(storedPath || defaultPath);
    });
    window.electronAPI.onCookiesStatus((ok) => setCookiesOk(ok));
    window.electronAPI.getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, darkMode ? "dark" : "light");
  }, [darkMode]);

  useEffect(() => {
    setThumbnailLoadError(false);
    setThumbnailCandidateIndex(0);
  }, [bestThumbnailUrl, videoInfo?.title]);

  useEffect(() => {
    if (
      !audioOnly &&
      allowedContainers.length > 0 &&
      !allowedContainers.includes(selectedContainer)
    ) {
      setSelectedContainer(allowedContainers[0]);
    }
  }, [audioOnly, allowedContainers, selectedContainer]);

  const fetchInfo = async (u) => {
    if (!u) return;
    setLoading(true);
    setVideoInfo(null);
    setStatus("");
    setErrorStatus("");
    setDone(false);
    setThumbDone(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setClipStart("");
    setClipEnd("");
    setBotDetected(false);
    setShowLoginPrompt(false);
    try {
      const info = await window.electronAPI.getVideoInfo(u);
      if (info.ageRestricted) {
        setPendingUrl(u);
        setShowLoginPrompt(true);
        return;
      }
      if (info.botDetected) {
        setBotDetected(true);
        setPendingUrl(u);
        return;
      }
      setVideoInfo(info);
      if (info.rawFormats?.length > 0) {
        const h = info.rawFormats[0].height;
        const codecs = [
          ...new Set(
            info.rawFormats.filter((f) => f.height === h).map((f) => f.codec),
          ),
        ];
        setSelectedHeight(h);
        setSelectedCodec(codecs[0]);
        const brs = info.rawFormats
          .filter((f) => f.height === h && f.codec === codecs[0])
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
        setSelectedBitrate(brs[0]?.bitrate ?? null);

        const firstFmt = info.rawFormats.find(
          (f) => f.height === h && f.codec === codecs[0],
        );
        setSelectedContainer(getAllowedContainers(firstFmt)[0]);
      }
      setVideoAudioTrackId("auto");
      if (info.audioTracks?.length > 0) {
        const bestTrack = [...info.audioTracks].sort(
          (a, b) => (b.abr || 0) - (a.abr || 0),
        )[0];
        if (bestTrack?.format_id) setAudioTrackId(bestTrack.format_id);

        const abr = Number(bestTrack?.abr || 0);
        const preferredQuality =
          [320, 256, 192, 128, 96].find((q) => abr >= q) || 96;
        setAudioQuality(String(preferredQuality));

        const acodec = String(bestTrack?.acodec || "").toLowerCase();
        const ext = String(bestTrack?.ext || "").toLowerCase();
        let preferredFormat = "mp3";
        if (ext === "m4a" || acodec.includes("mp4a") || acodec.includes("aac"))
          preferredFormat = "m4a";
        else if (ext === "opus" || acodec.includes("opus"))
          preferredFormat = "opus";
        else if (ext === "flac" || acodec.includes("flac"))
          preferredFormat = "flac";
        else if (ext === "wav" || acodec.includes("pcm"))
          preferredFormat = "wav";
        setAudioContainer(preferredFormat);
      }
    } catch (err) {
      if (err?.message?.includes("AGE_RESTRICTED")) {
        setPendingUrl(u);
        setShowLoginPrompt(true);
      } else {
        setErrorStatus("Error: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleYouTubeLogin = async (targetUrl = null) => {
    setLoggingIn(true);
    setShowLoginPrompt(false);
    setBotDetected(false);
    setErrorStatus("");
    try {
      const ok = await window.electronAPI.openYouTubeLogin({ fresh: true });
      if (ok) {
        setCookiesOk(true);
        const urlToFetch = targetUrl || pendingUrl;
        if (urlToFetch) await fetchInfo(urlToFetch);
        setPendingUrl(null);
      } else {
        setErrorStatus("Sign-in cancelled or failed.");
      }
    } catch (err) {
      setErrorStatus("Error: " + err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await window.electronAPI.clearCookies();
      setCookiesOk(false);
      setPendingUrl(null);
      setShowLoginPrompt(false);
      setBotDetected(false);
    } finally {
      setSigningOut(false);
      setShowSignOutConfirm(false);
    }
  };

  const pickFolder = async () => {
    const p = await window.electronAPI.selectFolder();
    if (p) {
      setSavePath(p);
      localStorage.setItem(SAVE_PATH_STORAGE_KEY, p);
    }
  };

  const startDownload = async () => {
    if (!url || !savePath) {
      setErrorStatus("Please fill in all fields");
      return;
    }
    if (!audioOnly && !selectedHeight) {
      setErrorStatus("Please select a format");
      return;
    }
    if (
      (clipStart && !isValidTime(clipStart)) ||
      (clipEnd && !isValidTime(clipEnd))
    ) {
      setErrorStatus("Invalid time format. Use MM:SS or HH:MM:SS");
      return;
    }
    if (clipStart && !clipEnd) {
      setErrorStatus("Please enter a clip end time.");
      return;
    }
    if (!clipStart && clipEnd) {
      setErrorStatus("Please enter a clip start time.");
      return;
    }

    const startS = timeToSecs(clipStart.trim());
    const endS = timeToSecs(clipEnd.trim());
    const isFullVideo = duration > 0 && startS === 0 && endS >= duration;
    const effectiveStart =
      !clipStart.trim() || isFullVideo ? null : clipStart.trim();
    const effectiveEnd = !clipEnd.trim() || isFullVideo ? null : clipEnd.trim();

    setErrorStatus("");
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setDone(false);
    setDownloading(true);
    setStatus("Starting...");
    window.electronAPI.onProgress((pct) => {
      setProgress(pct);
      setStatus("Downloading...");
    });

    try {
      const pickPreferredVideoAudioTrackId = (tracks) => {
        const list = Array.isArray(tracks) ? tracks : [];
        if (list.length === 0) return null;

        const candidates = list.filter((t) => t?.format_id);
        const isEnglish = (lang) => {
          const l = String(lang || "").toLowerCase();
          return l === "en" || l.startsWith("en-") || l === "eng";
        };
        const hasEnglishHint = (t) => {
          const note = String(t.note || "").toLowerCase();
          const label = String(t.label || "").toLowerCase();
          return (
            isEnglish(t.language) ||
            /\benglish\b/.test(note) ||
            /\benglish\b/.test(label) ||
            /\beng\b/.test(note) ||
            /\beng\b/.test(label)
          );
        };
        const scoreTrack = (t) => {
          const note = String(t.note || "").toLowerCase();
          const lang = String(t.language || "").toLowerCase();
          let score = 0;
          if (hasEnglishHint(t)) score += 1400;
          if (note.includes("original")) score += 1000;
          if (note.includes("default")) score += 700;
          if (note.includes("source")) score += 400;
          if (note.includes("dub") || note.includes("dubbed")) score -= 700;
          if (note.includes("commentary") || note.includes("descriptive"))
            score -= 400;
          if (lang === "und" || lang === "unknown" || lang === "original")
            score += 350;
          if (
            lang.startsWith("zh") ||
            lang.startsWith("cmn") ||
            lang.startsWith("yue") ||
            lang.startsWith("ja") ||
            lang.startsWith("ko")
          ) {
            score -= 500;
          }
          score += Number(t.abr || 0);
          return score;
        };

        const englishCandidates = candidates
          .filter((t) => hasEnglishHint(t))
          .sort((a, b) => scoreTrack(b) - scoreTrack(a));
        if (englishCandidates.length > 0) return englishCandidates[0].format_id;

        const scored = candidates
          .map((t) => ({ id: t.format_id, score: scoreTrack(t) }))
          .sort((a, b) => b.score - a.score);

        return scored[0]?.id || null;
      };

      const selectedExt = String(selectedContainer || "").toLowerCase();
      const rawFormats = videoInfo?.rawFormats || [];
      const preferVideoOnly = !audioOnly;
      const scopedRawFormats = preferVideoOnly
        ? rawFormats.filter((f) => !f.hasMuxedAudio)
        : rawFormats;
      const sameTuple = rawFormats.filter(
        (f) =>
          f.height === selectedHeight &&
          f.codec === selectedCodec &&
          f.bitrate === selectedBitrate,
      );
      const sameTupleScoped = scopedRawFormats.filter(
        (f) =>
          f.height === selectedHeight &&
          f.codec === selectedCodec &&
          f.bitrate === selectedBitrate,
      );
      const sameTupleExt = sameTuple.find(
        (f) => String(f.ext || "").toLowerCase() === selectedExt,
      );
      const sameTupleExtScoped = sameTupleScoped.find(
        (f) => String(f.ext || "").toLowerCase() === selectedExt,
      );
      const sameCodecExtHeight = rawFormats
        .filter(
          (f) =>
            f.height === selectedHeight &&
            f.codec === selectedCodec &&
            String(f.ext || "").toLowerCase() === selectedExt,
        )
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const sameCodecExtHeightScoped = scopedRawFormats
        .filter(
          (f) =>
            f.height === selectedHeight &&
            f.codec === selectedCodec &&
            String(f.ext || "").toLowerCase() === selectedExt,
        )
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const sameHeightExt = rawFormats
        .filter(
          (f) =>
            f.height === selectedHeight &&
            String(f.ext || "").toLowerCase() === selectedExt,
        )
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const sameHeightExtScoped = scopedRawFormats
        .filter(
          (f) =>
            f.height === selectedHeight &&
            String(f.ext || "").toLowerCase() === selectedExt,
        )
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const sameHeight = rawFormats
        .filter((f) => f.height === selectedHeight)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
      const sameHeightScoped = scopedRawFormats
        .filter((f) => f.height === selectedHeight)
        .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));

      const selRaw =
        sameTupleExtScoped ||
        sameTupleScoped[0] ||
        sameCodecExtHeightScoped[0] ||
        sameHeightExtScoped[0] ||
        sameHeightScoped[0] ||
        sameTupleExt ||
        sameTuple[0] ||
        sameCodecExtHeight[0] ||
        sameHeightExt[0] ||
        sameHeight[0];
      const preferredVideoAudioTrackId = pickPreferredVideoAudioTrackId(
        videoInfo?.audioTracks,
      );
      const effectiveVideoAudioTrackId =
        videoAudioTrackId && videoAudioTrackId !== "auto"
          ? videoAudioTrackId
          : preferredVideoAudioTrackId;
      const isManualVideoAudioTrack =
        videoAudioTrackId && videoAudioTrackId !== "auto";
      const selectedVideoTrack = (videoInfo?.audioTracks || []).find(
        (t) => t.format_id === effectiveVideoAudioTrackId,
      );
      const selectedAudioOnlyTrack = (videoInfo?.audioTracks || []).find(
        (t) => t.format_id === audioTrackId,
      );
      const videoAudioTag = selectedVideoTrack
        ? selectedVideoTrack.language
          ? `audio ${String(selectedVideoTrack.language).toUpperCase()}`
          : selectedVideoTrack.label
            ? `audio ${selectedVideoTrack.label}`
            : "audio track"
        : null;
      const audioOnlyTrackTag = selectedAudioOnlyTrack
        ? selectedAudioOnlyTrack.language
          ? `track ${String(selectedAudioOnlyTrack.language).toUpperCase()}`
          : selectedAudioOnlyTrack.label
            ? `track ${selectedAudioOnlyTrack.label}`
            : "track selected"
        : audioTrackId === "bestaudio/best"
          ? "track AUTO"
          : null;
      const forcePreferredAudioTrack =
        !audioOnly &&
        Boolean(isManualVideoAudioTrack && effectiveVideoAudioTrackId);
      const hasMuxed = audioOnly ? (selRaw?.hasMuxedAudio ?? false) : false;
      const vfid =
        selRaw?.format_id ??
        rawFormats
          ?.filter(
            (f) =>
              f.height === selectedHeight &&
              String(f.ext || "").toLowerCase() === selectedExt,
          )
          .sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0]?.format_id;
      const fmtId = vfid
        ? forcePreferredAudioTrack
          ? isManualVideoAudioTrack
            ? `${vfid}+${effectiveVideoAudioTrackId}`
            : `${vfid}+${effectiveVideoAudioTrackId}/${vfid}+bestaudio/best`
          : !audioOnly
            ? `${vfid}+bestaudio[language^=en]/${vfid}+bestaudio/best`
            : hasMuxed
              ? vfid
              : `${vfid}+bestaudio/best`
        : "bestvideo+bestaudio/best";

      const result = await window.electronAPI.download({
        url,
        formatId: fmtId,
        container: selectedContainer,
        savePath,
        height: selectedHeight,
        clipStart: effectiveStart,
        clipEnd: effectiveEnd,
        videoAudioTag: audioOnly ? null : videoAudioTag,
        audioTrackTag: audioOnly ? audioOnlyTrackTag : null,
        audioOnly,
        audioQuality,
        audioTrackId: audioOnly ? audioTrackId : null,
        audioContainer: audioOnly ? audioContainer : null,
        hasMuxedAudio: hasMuxed,
      });

      if (result?.cancelled) return;

      setProgress(100);
      setDone(true);
      setStatus(
        audioOnly ? "Audio saved" : effectiveStart ? "Clip saved" : "Done",
      );

      await window.electronAPI.addHistory({
        title: videoInfo?.title || url,
        thumbnail: bestThumbnailUrl || null,
        type: audioOnly
          ? "audio"
          : effectiveStart && effectiveEnd
            ? "clip"
            : "video",
        quality: audioOnly
          ? `${audioContainer.toUpperCase()} · ${audioQuality}kbps`
          : selectedHeight
            ? `${selectedHeight}p ${selectedContainer.toUpperCase()}`
            : null,
        filePath: result?.filePath || null,
        url,
      });
    } catch (err) {
      setStatus("");
      setErrorStatus(
        err.message.includes("cancel") ? "Cancelled" : "Error: " + err.message,
      );
    } finally {
      setDownloading(false);
    }
  };

  const cancelDownload = async () => {
    setDownloading(false);
    setProgress(0);
    setSmoothProgress(0);
    progressRef.current = 0;
    setStatus("");
    setErrorStatus("Cancelled");
    await window.electronAPI.cancelDownload();
  };

  const downloadThumbnail = async () => {
    if (!videoInfo || !savePath) return;
    setThumbDownloading(true);
    try {
      const fp = await window.electronAPI.downloadThumbnail({
        thumbnailUrl: activeThumbnailUrl || bestThumbnailUrl,
        title: videoInfo.title,
        savePath,
      });
      setThumbDone(true);
      await window.electronAPI.addHistory({
        title: videoInfo.title,
        thumbnail: bestThumbnailUrl || null,
        type: "thumbnail",
        quality: "JPG",
        filePath: fp || null,
        url,
      });
    } catch (err) {
      setErrorStatus("Error saving thumbnail: " + err.message);
    } finally {
      setThumbDownloading(false);
    }
  };

  const dlLabel = done
    ? "Downloaded"
    : audioOnly
      ? `Download ${audioContainer.toUpperCase()}`
      : clipStart && clipEnd
        ? `Download Clip · ${selectedContainer.toUpperCase()}`
        : `Download · ${selectedContainer.toUpperCase()}`;

  return (
    <ThemeCtx.Provider value={C}>
      <style>{`input::placeholder { color: ${C.textMuted}; opacity: 1; }`}</style>
      <div
        data-theme={darkMode ? "dark" : "light"}
        style={{
          height: "100vh",
          width: "100vw",
          background: C.gradBg,
          color: C.textPrimary,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: C.fontDisplay,
        }}
      >
        <HistoryDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
        />
        {showSignOutConfirm && (
          <div
            onClick={() => !signingOut && setShowSignOutConfirm(false)}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 60,
              background: C.neoMode ? "rgba(0,0,0,0.38)" : "rgba(2,6,23,0.72)",
              backdropFilter: C.neoMode ? "none" : "blur(5px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 20,
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "min(420px, 100%)",
                borderRadius: C.neoMode ? 0 : 14,
                background: C.neoMode ? "#FFF7DB" : C.surface,
                border: `${C.neoMode ? "4px" : "1px"} solid ${C.border}`,
                boxShadow: C.neoMode
                  ? "10px 10px 0px 0px #000000"
                  : "0 24px 60px rgba(0,0,0,0.45)",
                padding: 16,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                fontFamily: C.fontDisplay,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: C.neoMode ? 0 : 8,
                    background: C.neoMode ? "#FFD93D" : "rgba(245,158,11,0.15)",
                    border: `${C.neoMode ? "2px" : "1px"} solid ${
                      C.neoMode ? "#000000" : "rgba(245,158,11,0.3)"
                    }`,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Lock
                    size={13}
                    style={{ color: C.neoMode ? "#000000" : "#fbbf24" }}
                  />
                </div>
                <span
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: C.textPrimary,
                  }}
                >
                  Sign out?
                </span>
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  color: C.textFaint,
                  lineHeight: 1.55,
                }}
              >
                This will clear your saved YouTube cookies. Next sign in will
                open a fresh login flow.
              </p>
              <div
                style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}
              >
                <Btn
                  onClick={() => setShowSignOutConfirm(false)}
                  disabled={signingOut}
                  variant="ghost"
                  style={{
                    height: C.neoMode ? 38 : 34,
                    padding: "0 12px",
                    fontSize: 12,
                    textTransform: C.neoMode ? undefined : "none",
                    letterSpacing: C.neoMode ? undefined : "-0.01em",
                  }}
                >
                  Cancel
                </Btn>
                <Btn
                  onClick={handleSignOut}
                  disabled={signingOut}
                  variant="danger"
                  style={{
                    height: C.neoMode ? 38 : 34,
                    padding: "0 12px",
                    fontSize: 12,
                    textTransform: C.neoMode ? undefined : "none",
                    letterSpacing: C.neoMode ? undefined : "-0.01em",
                  }}
                >
                  {signingOut ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <X size={13} />
                  )}
                  Sign out
                </Btn>
              </div>
            </div>
          </div>
        )}

        {/* ── Ambient lighting layer ── */}
        <div
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            zIndex: 0,
            overflow: "hidden",
          }}
        >
          {/* Primary blob — top-left, large indigo pool */}
          <div
            className="blob-1"
            style={{
              position: "absolute",
              top: -200,
              left: -150,
              width: 900,
              height: 700,
              background: C.blobA,
              filter: "blur(120px)",
              willChange: "transform",
            }}
          />
          {/* Secondary blob — bottom-right */}
          <div
            className="blob-2"
            style={{
              position: "absolute",
              bottom: -180,
              right: -120,
              width: 700,
              height: 600,
              background: C.blobB,
              filter: "blur(100px)",
              willChange: "transform",
            }}
          />
          {/* Neo-brutalism halftone dot pattern */}
          {C.neoMode && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage:
                  "radial-gradient(#000000 1px, transparent 1px)",
                backgroundSize: "24px 24px",
                opacity: 0.05,
                pointerEvents: "none",
              }}
            />
          )}
          {/* Tertiary blob — center, subtle */}
          <div
            className="blob-3"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              width: 500,
              height: 400,
              background: C.blobC,
              filter: "blur(80px)",
              willChange: "transform",
            }}
          />
        </div>

        <div
          className="content-fade-in"
          style={{
            position: "relative",
            zIndex: 10,
            flex: 1,
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr auto 1fr",
              alignItems: "center",
              padding: "10px 24px",
              flexShrink: 0,
              WebkitAppRegion: "drag",
              background: "transparent",
            }}
          >
            <div />

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                userSelect: "none",
                pointerEvents: "none",
              }}
            >
              <img
                src={iconPng}
                alt=""
                style={{ width: 24, height: 24, objectFit: "contain" }}
              />
              <span
                key={darkMode ? "dark" : "light"}
                style={
                  C.neoMode
                    ? {
                        fontSize: 11,
                        fontWeight: 900,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        color: "#000000",
                        fontFamily: C.fontDisplay,
                        whiteSpace: "nowrap",
                      }
                    : {
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: "0.18em",
                        textTransform: "uppercase",
                        background: C.gradAccent,
                        backgroundSize: "200% 200%",
                        animation: `gradientPan ${C.gradAccentAnimDuration} ease infinite`,
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                        fontFamily: C.fontDisplay,
                        whiteSpace: "nowrap",
                      }
                }
              >
                Seedhe Download
              </span>
              <img
                src={iconPng}
                alt=""
                style={{ width: 24, height: 24, objectFit: "contain" }}
              />
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                justifyContent: "flex-end",
                WebkitAppRegion: "no-drag",
              }}
            >
              <IconBtn
                onClick={() => setDarkMode((p) => !p)}
                title={darkMode ? "Light mode" : "Dark mode"}
              >
                {darkMode ? <Sun size={16} /> : <Moon size={16} />}
              </IconBtn>
              <IconBtn onClick={() => setHistoryOpen(true)} title="History">
                <Clock size={16} />
              </IconBtn>
              {cookiesOk ? (
                <button
                  onClick={() => setShowSignOutConfirm(true)}
                  title="Signed in - click to sign out"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: C.radius,
                    background: C.neoMode ? "#86efac" : "rgba(16,185,129,0.1)",
                    border: C.neoMode
                      ? "2px solid #000000"
                      : "1px solid rgba(16,185,129,0.2)",
                    boxShadow: C.neoMode ? "3px 3px 0px 0px #000000" : "none",
                    color: C.neoMode ? "#000000" : "#34d399",
                    fontSize: 11,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: C.neoMode ? 0 : "50%",
                      background: C.neoMode ? "#000000" : "#34d399",
                    }}
                  />
                  Signed in
                </button>
              ) : (
                <button
                  disabled={loggingIn}
                  onClick={() => {
                    const nextUrl = url || null;
                    setPendingUrl(nextUrl);
                    setBotDetected(false);
                    setShowLoginPrompt(false);
                    handleYouTubeLogin(nextUrl);
                  }}
                  title="Click to sign in"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "5px 10px",
                    borderRadius: C.radius,
                    background: C.surfaceHigh,
                    border: `${C.neoMode ? "2px" : "1px"} solid ${C.border}`,
                    boxShadow: C.neoMode ? "3px 3px 0px 0px #000000" : "none",
                    color: C.neoMode ? C.textPrimary : C.textFaint,
                    fontSize: 11,
                    fontWeight: C.neoMode ? 700 : 400,
                    cursor: loggingIn ? "not-allowed" : "pointer",
                    opacity: loggingIn ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: C.neoMode ? 0 : "50%",
                      background: C.border,
                    }}
                  />
                  Not signed in
                </button>
              )}
            </div>
          </div>

          <div
            style={{
              height: C.neoMode ? 3 : 1,
              background: C.border,
              flexShrink: 0,
            }}
          />

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "20px 24px",
              display: "flex",
              flexDirection: "column",
              gap: 18,
            }}
            className="scrollbar-hide"
          >
            <div style={{ display: "flex", gap: 8 }}>
              <div style={{ ...pill(C), flex: 1 }}>
                <input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && fetchInfo(url)}
                  placeholder="Paste URL..."
                  style={{ ...inputBase(C) }}
                />
                {url && (
                  <button
                    onClick={() => {
                      setUrl("");
                      setVideoInfo(null);
                      setStatus("");
                      setBotDetected(false);
                      setShowLoginPrompt(false);
                      setPendingUrl(null);
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: C.textFaint,
                      display: "flex",
                      padding: 2,
                    }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <Btn
                onClick={async () => {
                  try {
                    const u = await navigator.clipboard.readText();
                    if (u) {
                      setUrl(u);
                      fetchInfo(u);
                    }
                  } catch {}
                }}
                disabled={loading || downloading}
                variant="primary"
                style={{ minWidth: 44, padding: "0 12px" }}
                title="Paste & Fetch"
              >
                {loading ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <ClipboardPaste size={15} />
                )}
              </Btn>

              <Btn
                onClick={() => {
                  if (url) fetchInfo(url);
                }}
                disabled={!url || loading || downloading}
                variant="ghost"
                style={{ minWidth: 44, padding: "0 12px" }}
                title="Refetch"
              >
                <RefreshCw size={15} />
              </Btn>
            </div>

            {!cookiesOk && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 8,
                  padding: "10px 12px",
                  borderRadius: C.radius,
                  background: C.surface,
                  border: `${C.borderW} solid ${C.border}`,
                  boxShadow: C.neoMode ? C.shadowSurface : "none",
                }}
              >
                <Lock
                  size={14}
                  style={{ color: C.textMuted, flexShrink: 0, marginTop: 1 }}
                />
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    lineHeight: 1.5,
                    color: C.textFaint,
                  }}
                >
                  Not signed in: some sites may hide higher quality streams,
                  audio language tracks, subtitles, or full format options.
                </p>
              </div>
            )}

            {botDetected && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  background: C.neoMode ? "#FFD93D" : "rgba(245,158,11,0.06)",
                  border: C.neoMode
                    ? "4px solid #000000"
                    : "1px solid rgba(245,158,11,0.18)",
                  borderRadius: C.radius,
                  boxShadow: C.neoMode ? C.shadowSurface : "none",
                }}
              >
                <Bot
                  size={15}
                  style={{ color: "#fbbf24", flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: C.neoMode ? 900 : 600,
                      color: C.neoMode ? "#000000" : "#fde68a",
                      margin: 0,
                    }}
                  >
                    Bot detection triggered
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: C.textFaint,
                      margin: "3px 0 0",
                    }}
                  >
                    YouTube thinks you're a bot. Sign in to continue.
                  </p>
                </div>
                <Btn
                  variant="ghost"
                  onClick={handleYouTubeLogin}
                  disabled={loggingIn}
                  style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                >
                  {loggingIn ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <LogIn size={13} />
                  )}{" "}
                  Sign in
                </Btn>
              </div>
            )}

            {showLoginPrompt && (
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  padding: 14,
                  background: C.surface,
                  border: `${C.borderW} solid ${C.border}`,
                  borderRadius: C.radius,
                  boxShadow: C.neoMode ? C.shadowSurface : "none",
                }}
              >
                <Lock
                  size={15}
                  style={{ color: C.textMuted, flexShrink: 0, marginTop: 2 }}
                />
                <div style={{ flex: 1 }}>
                  <p
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: C.textPrimary,
                      margin: 0,
                    }}
                  >
                    Age-restricted content
                  </p>
                  <p
                    style={{
                      fontSize: 12,
                      color: C.textFaint,
                      margin: "3px 0 0",
                    }}
                  >
                    Sign in to your YouTube account to access this video.
                  </p>
                </div>
                <Btn
                  variant="ghost"
                  onClick={handleYouTubeLogin}
                  disabled={loggingIn}
                  style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                >
                  {loggingIn ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <LogIn size={13} />
                  )}{" "}
                  Sign in
                </Btn>
              </div>
            )}

            {!videoInfo && !loading && !showLoginPrompt && !botDetected && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  flex: 1,
                  gap: 12,
                  color: C.textFaint,
                  paddingTop: 80,
                }}
              >
                <Download size={40} strokeWidth={1.2} />
                <p style={{ fontSize: 13, margin: 0 }}>
                  Paste a URL to get started
                </p>
              </div>
            )}

            {loading && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  paddingTop: 80,
                  color: C.textFaint,
                }}
              >
                <Loader2 size={18} className="animate-spin" />
                <span style={{ fontSize: 13 }}>Fetching video info...</span>
              </div>
            )}

            {videoInfo && (
              <div style={{ display: "flex", gap: 20 }}>
                <div
                  style={{
                    width: 200,
                    flexShrink: 0,
                    display: "flex",
                    flexDirection: "column",
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      borderRadius: 12,
                      overflow: "hidden",
                      background: C.surface,
                      aspectRatio: "16/9",
                      position: "relative",
                    }}
                  >
                    {activeThumbnailUrl && !thumbnailLoadError ? (
                      <img
                        src={activeThumbnailUrl}
                        alt=""
                        onError={() => {
                          const next = thumbnailCandidateIndex + 1;
                          if (next < thumbnailCandidates.length) {
                            setThumbnailCandidateIndex(next);
                          } else {
                            setThumbnailLoadError(true);
                          }
                        }}
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "cover",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6,
                          color: C.textFaint,
                          background: C.surfaceHigh,
                        }}
                      >
                        <ImageIcon size={16} />
                        <span style={{ fontSize: 11 }}>No thumbnail</span>
                      </div>
                    )}
                  </div>

                  <Btn
                    onClick={downloadThumbnail}
                    disabled={thumbDownloading || !savePath}
                    variant={thumbDone ? "success" : "primary"}
                    fullWidth
                    style={{
                      height: C.neoMode ? 38 : 32,
                      padding: C.neoMode ? "0 10px" : "0 12px",
                      fontSize: 11,
                      textTransform: C.neoMode ? undefined : "none",
                      letterSpacing: C.neoMode ? undefined : "-0.01em",
                      ...(thumbDone
                        ? {
                            textTransform: C.neoMode ? undefined : "none",
                            letterSpacing: C.neoMode ? undefined : "-0.01em",
                          }
                        : null),
                    }}
                  >
                    {thumbDownloading ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : thumbDone ? (
                      <>
                        <CheckCircle2 size={13} />
                        Thumbnail saved
                      </>
                    ) : (
                      <>
                        <ImageIcon size={13} />
                        Save thumbnail
                      </>
                    )}
                  </Btn>

                  <div>
                    <p
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        color: C.textPrimary,
                        lineHeight: 1.4,
                        margin: 0,
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {videoInfo.title}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        marginTop: 6,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 11,
                          color: C.textFaint,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {videoInfo.uploader}
                      </span>
                      {videoInfo.duration && (
                        <span
                          style={{
                            fontSize: 11,
                            color: C.textFaint,
                            flexShrink: 0,
                          }}
                        >
                          {formatDuration(videoInfo.duration)}
                        </span>
                      )}
                    </div>
                  </div>

                  {!audioOnly && selRawFmt && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {selRawFmt.width && (
                        <Badge color="violet">
                          {selRawFmt.width}×{selRawFmt.height}
                        </Badge>
                      )}
                      {selRawFmt.fps >= 60 && (
                        <Badge color="violet">{selRawFmt.fps}fps</Badge>
                      )}
                      {estimatedSizeLabel && (
                        <Badge color="ghost">~{estimatedSizeLabel}</Badge>
                      )}
                      {!selRawFmt.hasMuxedAudio && (
                        <Badge color="ghost">+audio</Badge>
                      )}
                    </div>
                  )}
                </div>

                <div
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    gap: 16,
                    minWidth: 0,
                  }}
                >
                  <FormatSelectors
                    C={C}
                    audioOnly={audioOnly}
                    setAudioOnly={setAudioOnly}
                    downloading={downloading}
                    setDone={setDone}
                    heights={heights}
                    selectedHeight={selectedHeight}
                    raw={raw}
                    setSelectedHeight={setSelectedHeight}
                    setSelectedCodec={setSelectedCodec}
                    setSelectedBitrate={setSelectedBitrate}
                    setSelectedContainer={setSelectedContainer}
                    getAllowedContainers={getAllowedContainers}
                    codecsAtH={codecsAtH}
                    selectedCodec={selectedCodec}
                    matchFmts={matchFmts}
                    selectedBitrate={selectedBitrate}
                    selectedContainer={selectedContainer}
                    allowedContainers={allowedContainers}
                    containerWarning={containerWarning}
                    videoAudioTrackId={videoAudioTrackId}
                    setVideoAudioTrackId={setVideoAudioTrackId}
                    audioContainer={audioContainer}
                    setAudioContainer={setAudioContainer}
                    audioQuality={audioQuality}
                    setAudioQuality={setAudioQuality}
                    audioTracks={audioTracks}
                    audioTrackId={audioTrackId}
                    setAudioTrackId={setAudioTrackId}
                  />

                  <ClipControls
                    C={C}
                    downloading={downloading}
                    clipStart={clipStart}
                    setClipStart={setClipStart}
                    clipEnd={clipEnd}
                    setClipEnd={setClipEnd}
                    setDone={setDone}
                    setErrorStatus={setErrorStatus}
                    duration={duration}
                    formatDuration={formatDuration}
                    sliderStart={sliderStart}
                    sliderEnd={sliderEnd}
                  />

                  <SavePathPicker
                    C={C}
                    downloading={downloading}
                    pickFolder={pickFolder}
                    savePath={savePath}
                  />

                  <DownloadActions
                    C={C}
                    downloading={downloading}
                    done={done}
                    smoothProgress={smoothProgress}
                    status={status}
                    startDownload={startDownload}
                    cancelDownload={cancelDownload}
                    savePath={savePath}
                    dlLabel={dlLabel}
                    errorStatus={errorStatus}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
        <button
          onClick={() => window.electronAPI.openExternal(INSTAGRAM_DM_URL)}
          onMouseEnter={() => setShowInstaLabel(true)}
          onMouseLeave={() => setShowInstaLabel(false)}
          onFocus={() => setShowInstaLabel(true)}
          onBlur={() => setShowInstaLabel(false)}
          title="Instagram contact"
          aria-label="Contact me on Instagram"
          style={{
            position: "fixed",
            right: 14,
            bottom: 14,
            zIndex: 35,
            WebkitAppRegion: "no-drag",
            pointerEvents: "auto",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: showInstaLabel ? 7 : 0,
            width: showInstaLabel ? 118 : 34,
            height: 34,
            padding: showInstaLabel
              ? C.neoMode
                ? "6px 10px"
                : "6px 11px"
              : "0 9px",
            borderRadius: C.radius,
            border: `${C.neoMode ? "2px" : "1px"} solid ${C.border}`,
            background: C.neoMode ? C.surface : "rgba(12,15,23,0.82)",
            boxShadow: C.neoMode
              ? "3px 3px 0px 0px #000000"
              : "0 6px 20px rgba(0,0,0,0.28)",
            color: C.textFaint,
            fontSize: 11,
            fontWeight: C.neoMode ? 700 : 500,
            backdropFilter: C.neoMode ? "none" : "blur(6px)",
            cursor: "pointer",
            appearance: "none",
            outline: "none",
            overflow: "hidden",
            transition:
              "width 220ms cubic-bezier(0.4,0,0.2,1), gap 220ms cubic-bezier(0.4,0,0.2,1), padding 220ms cubic-bezier(0.4,0,0.2,1)",
          }}
        >
          <Instagram size={13} style={{ flexShrink: 0 }} />
          <span
            style={{
              maxWidth: showInstaLabel ? 70 : 0,
              opacity: showInstaLabel ? 1 : 0,
              whiteSpace: "nowrap",
              overflow: "hidden",
              transform: showInstaLabel ? "translateX(0)" : "translateX(-4px)",
              transition:
                "max-width 220ms cubic-bezier(0.4,0,0.2,1), opacity 180ms ease, transform 220ms cubic-bezier(0.4,0,0.2,1)",
            }}
          >
            Contact me
          </span>
        </button>
        <div
          title="App version"
          style={{
            position: "fixed",
            left: 14,
            bottom: 14,
            zIndex: 35,
            WebkitAppRegion: "no-drag",
            pointerEvents: "none",
            display: "inline-flex",
            alignItems: "center",
            padding: C.neoMode ? "6px 10px" : "6px 11px",
            borderRadius: C.radius,
            border: `${C.neoMode ? "2px" : "1px"} solid ${C.border}`,
            background: C.neoMode ? C.surface : "rgba(12,15,23,0.82)",
            boxShadow: C.neoMode
              ? "3px 3px 0px 0px #000000"
              : "0 6px 20px rgba(0,0,0,0.28)",
            color: C.textFaint,
            fontSize: 11,
            fontWeight: C.neoMode ? 700 : 500,
            backdropFilter: C.neoMode ? "none" : "blur(6px)",
          }}
        >
          {`v${appVersion || "?"}`}
        </div>
      </div>
    </ThemeCtx.Provider>
  );
}
