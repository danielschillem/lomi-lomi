const Jimp = require("jimp");
const path = require("path");

const BRAND = {
  bg: 0x0b1220ff,
  primary: 0x14b8a6ff,
  primaryDark: 0x0f766eff,
  white: 0xffffffff,
  transparent: 0x00000000,
};

function drawCircle(img, cx, cy, r, color) {
  const r2 = r * r;
  const minX = Math.max(0, Math.floor(cx - r));
  const maxX = Math.min(img.bitmap.width - 1, Math.ceil(cx + r));
  const minY = Math.max(0, Math.floor(cy - r));
  const maxY = Math.min(img.bitmap.height - 1, Math.ceil(cy + r));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - cx;
      const dy = y - cy;
      if (dx * dx + dy * dy <= r2) {
        img.setPixelColor(color, x, y);
      }
    }
  }
}

async function createLogo(size = 1024) {
  const logo = new Jimp(size, size, BRAND.transparent);
  const center = size / 2;

  drawCircle(logo, center, center, Math.floor(size * 0.42), BRAND.primary);
  drawCircle(logo, center, center, Math.floor(size * 0.32), BRAND.primaryDark);

  const font = await Jimp.loadFont(Jimp.FONT_SANS_128_WHITE);
  const textW = Jimp.measureText(font, "L");
  const textH = Jimp.measureTextHeight(font, "L", size);
  const x = Math.round(center - textW / 2);
  const y = Math.round(center - textH / 2 - size * 0.015);
  logo.print(font, x, y, "L");

  return logo;
}

async function generateIcons() {
  const assetsDir = path.join(__dirname, "assets");
  const logo = await createLogo(1024);

  await logo.writeAsync(path.join(assetsDir, "logo.png"));

  const icon = new Jimp(1024, 1024, BRAND.bg);
  const iconLogo = logo.clone().contain(760, 760, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
  icon.composite(iconLogo, Math.floor((1024 - iconLogo.bitmap.width) / 2), Math.floor((1024 - iconLogo.bitmap.height) / 2));
  await icon.writeAsync(path.join(assetsDir, "icon.png"));

  const adaptive = new Jimp(1024, 1024, BRAND.transparent);
  const adaptiveLogo = logo.clone().contain(640, 640, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
  adaptive.composite(adaptiveLogo, Math.floor((1024 - adaptiveLogo.bitmap.width) / 2), Math.floor((1024 - adaptiveLogo.bitmap.height) / 2));
  await adaptive.writeAsync(path.join(assetsDir, "adaptive-icon.png"));

  const splash = new Jimp(1024, 1024, BRAND.transparent);
  const splashLogo = logo.clone().contain(700, 700, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
  splash.composite(splashLogo, Math.floor((1024 - splashLogo.bitmap.width) / 2), Math.floor((1024 - splashLogo.bitmap.height) / 2));
  await splash.writeAsync(path.join(assetsDir, "splash-icon.png"));

  const mono = new Jimp(1024, 1024, BRAND.transparent);
  drawCircle(mono, 512, 512, 420, BRAND.white);
  await mono.writeAsync(path.join(assetsDir, "adaptive-icon-monochrome.png"));

  console.log("Brand logo and icons generated:");
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