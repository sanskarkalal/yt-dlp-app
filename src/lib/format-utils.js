export function formatBytes(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function estimateSizeRangeLabel(kbps, durationSeconds, uncertainty = 0.25) {
  if (!kbps || !durationSeconds) return null;
  const baseBytes = Math.round((Number(kbps) * 1000 * Number(durationSeconds)) / 8);
  const minBytes = Math.round(baseBytes * (1 - uncertainty));
  const maxBytes = Math.round(baseBytes * (1 + uncertainty));
  return `${formatBytes(minBytes)}-${formatBytes(maxBytes)}`;
}

export function getAllowedContainers(format) {
  if (!format) return ["mp4", "mkv"];

  const uniq = (items) => [...new Set(items.filter(Boolean))];

  const codec = format.codec;
  const ext = format.ext;

  if (codec === "H264" || codec === "H265") {
    return ["mp4", "mkv"];
  }

  if (codec === "VP9" || codec === "AV1") {
    if (ext === "webm") return uniq(["webm", "mkv", "mp4"]);
    return uniq(["mkv", "mp4"]);
  }

  if (ext === "mp4") return ["mp4", "mkv"];
  if (ext === "webm") return ["webm", "mkv", "mp4"];
  if (ext === "mkv") return ["mkv", "mp4"];

  return uniq([ext, "mkv", "mp4"]);
}
