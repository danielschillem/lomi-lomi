const Jimp = require("jimp");
const path = require("path");

const WHITE = 0xffffffff;
const TRANSPARENT = 0x00000000;

function rgbaFromInt(color) {
  return Jimp.intToRGBA(color);
}

function colorDistance(a, b) {
  return (
    Math.abs(a.r - b.r) + Math.abs(a.g - b.g) + Math.abs(a.b - b.b)
  );
}

function trimSolidBackground(image, tolerance = 12) {
  const width = image.bitmap.width;
  const height = image.bitmap.height;
  const bg = rgbaFromInt(image.getPixelColor(0, 0));

  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  image.scan(0, 0, width, height, function scan(x, y) {
    const pixel = rgbaFromInt(this.getPixelColor(x, y));
    if (colorDistance(pixel, bg) > tolerance) {
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  });

  if (maxX < minX || maxY < minY) {
    return image.clone();
  }

  return image.clone().crop(minX, minY, maxX - minX + 1, maxY - minY + 1);
}

async function generateIcons() {
  const assetsDir = path.join(__dirname, "assets");
  const sourcePath = path.join(__dirname, "..", "logo.png");
  const source = await Jimp.read(sourcePath);
  const trimmed = trimSolidBackground(source);

  // App logo used in auth screens.
  const appLogo = trimmed.clone().contain(1024, 1024);
  await appLogo.writeAsync(path.join(assetsDir, "logo.png"));

  // Launcher icon.
  const icon = trimmed.clone().contain(1024, 1024);
  await icon.writeAsync(path.join(assetsDir, "icon.png"));

  // Adaptive foreground (keep inside safe zone).
  const adaptive = new Jimp(1024, 1024, TRANSPARENT);
  const adaptiveFg = trimmed.clone().contain(820, 820);
  adaptive.composite(
    adaptiveFg,
    Math.floor((1024 - adaptiveFg.bitmap.width) / 2),
    Math.floor((1024 - adaptiveFg.bitmap.height) / 2),
  );
  await adaptive.writeAsync(path.join(assetsDir, "adaptive-icon.png"));

  // Splash icon.
  const splash = trimmed.clone().contain(900, 900);
  await splash.writeAsync(path.join(assetsDir, "splash-icon.png"));

  // Monochrome for Android 13 themed icons.
  const mono = new Jimp(1024, 1024, TRANSPARENT);
  const monoFg = trimmed.clone().contain(820, 820).greyscale();
  monoFg.scan(0, 0, monoFg.bitmap.width, monoFg.bitmap.height, function scan(x, y, idx) {
    const alpha = this.bitmap.data[idx + 3];
    this.bitmap.data[idx] = 255;
    this.bitmap.data[idx + 1] = 255;
    this.bitmap.data[idx + 2] = 255;
    this.bitmap.data[idx + 3] = alpha;
  });
  mono.composite(
    monoFg,
    Math.floor((1024 - monoFg.bitmap.width) / 2),
    Math.floor((1024 - monoFg.bitmap.height) / 2),
  );
  await mono.writeAsync(path.join(assetsDir, "adaptive-icon-monochrome.png"));

  console.log("Icons generated from /logo.png:");
  console.log("- assets/logo.png");
  console.log("- assets/icon.png");
  console.log("- assets/adaptive-icon.png");
  console.log("- assets/splash-icon.png");
  console.log("- assets/adaptive-icon-monochrome.png");
}

generateIcons().catch((err) => {
  console.error(err);
  process.exit(1);
});
