const fs = require("fs");
const path = require("path");

exports.default = async function afterPack(context) {
  if (context.electronPlatformName !== "darwin") {
    return;
  }

  const appName = `${context.packager.appInfo.productFilename}.app`;
  const binDir = path.join(
    context.appOutDir,
    appName,
    "Contents",
    "Resources",
    "bin",
    "mac",
  );

  for (const name of ["ffmpeg", "yt-dlp"]) {
    const targetPath = path.join(binDir, name);
    if (fs.existsSync(targetPath)) {
      fs.chmodSync(targetPath, 0o755);
    }
  }
};
