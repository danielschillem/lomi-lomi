const Jimp = require("jimp");
const path = require("path");

async function generateIcons() {
  const logoPath = path.join(__dirname, "assets", "icon.png");
  const logo = await Jimp.read(logoPath);

  // -- 1) icon.png (1024x1024): logo centered on purple background, with padding
  const icon = new Jimp(1024, 1024, 0x7c3aedff); // purple
  const iconLogo = logo.clone().contain(720, 720); // scale logo to fit 720px (70% of 1024)
  icon.composite(iconLogo, (1024 - 720) / 2, (1024 - 720) / 2);
  await icon.writeAsync(path.join(__dirname, "assets", "icon.png"));
  console.log("icon.png generated (1024x1024, purple bg)");

  // -- 2) adaptive-icon.png (1024x1024): logo on TRANSPARENT bg, smaller for safe zone
  // Android adaptive icon: foreground is 108dp, safe zone is inner 72dp (66.7%)
  // So logo should be ~60% of the image to stay in safe zone
  const adaptive = new Jimp(1024, 1024, 0x00000000); // transparent
  const adaptiveLogo = logo.clone().contain(600, 600); // 58% of 1024
  adaptive.composite(adaptiveLogo, (1024 - 600) / 2, (1024 - 600) / 2);
  await adaptive.writeAsync(
    path.join(__dirname, "assets", "adaptive-icon.png"),
  );
  console.log(
    "adaptive-icon.png generated (1024x1024, transparent bg, centered)",
  );

  // -- 3) splash-icon.png (512x512): logo on transparent bg for splash screen
  const splash = new Jimp(512, 512, 0x00000000);
  const splashLogo = logo.clone().contain(400, 400);
  splash.composite(splashLogo, (512 - 400) / 2, (512 - 400) / 2);
  await splash.writeAsync(path.join(__dirname, "assets", "splash-icon.png"));
  console.log("splash-icon.png generated (512x512, transparent bg)");

  console.log("All icons generated successfully!");
}

generateIcons().catch(console.error);
