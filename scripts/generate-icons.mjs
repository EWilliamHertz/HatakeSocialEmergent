import sharp from "sharp";
import { mkdirSync } from "fs";

mkdirSync("public/icons", { recursive: true });

const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
const source = "public/logo.png";

for (const size of sizes) {
  await sharp(source)
    .resize(size, size)
    .toFile(`public/icons/icon-${size}x${size}.png`);
  console.log(`✅ Generated ${size}x${size}`);
}
console.log("🎉 All icons generated!");
