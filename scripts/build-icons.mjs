// Favicon export — the one asset design-kit/SIGN-OFF.md lists as not yet
// generated ("a mechanical export from assets/faisca-mark-120.png").
//
// Source is design-kit/assets/faisca-logo-source.png: the identical artwork
// at 300x300 instead of 120x120, so the larger sizes are not upscaled twice.
// No cropping, no recolouring — the mark ships exactly as delivered.
//
//   npm run icons
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const SRC = "design-kit/assets/faisca-logo-source.png";
const OUT = "public";
const SIZES = [
  ["favicon-16.png", 16],
  ["favicon-32.png", 32],
  ["apple-touch-icon.png", 180],
  ["icon-512.png", 512],
];

await mkdir(OUT, { recursive: true });

for (const [name, size] of SIZES) {
  await sharp(SRC)
    .resize(size, size, { fit: "cover", kernel: "lanczos3" })
    .png({ compressionLevel: 9 })
    .toFile(`${OUT}/${name}`);
  console.log(`  ${name.padEnd(24)} ${size}x${size}`);
}

// Multi-resolution .ico for the legacy /favicon.ico request browsers make
// before they have parsed any markup.
const ico = await buildIco([16, 32, 48]);
await writeFile(`${OUT}/favicon.ico`, ico);
console.log(`  ${"favicon.ico".padEnd(24)} 16+32+48`);

await writeFile(
  `${OUT}/site.webmanifest`,
  JSON.stringify(
    {
      name: "Faisca Games",
      short_name: "Faisca",
      description: "A spark, then a game.",
      start_url: "/",
      display: "standalone",
      // --color-bg and --color-panel from design-kit/tokens.css.
      background_color: "#09090B",
      theme_color: "#121215",
      icons: [
        { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
        { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      ],
    },
    null,
    2,
  ) + "\n",
);
console.log(`  ${"site.webmanifest".padEnd(24)} —`);

/** Pack PNGs into an ICO container. */
async function buildIco(sizes) {
  const pngs = await Promise.all(
    sizes.map((s) =>
      sharp(SRC).resize(s, s, { fit: "cover", kernel: "lanczos3" }).png({ compressionLevel: 9 }).toBuffer(),
    ),
  );
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(sizes.length, 4);

  const entries = [];
  let offset = 6 + sizes.length * 16;
  sizes.forEach((s, i) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(s >= 256 ? 0 : s, 0);
    e.writeUInt8(s >= 256 ? 0 : s, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(pngs[i].length, 8);
    e.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    entries.push(e);
  });

  return Buffer.concat([header, ...entries, ...pngs]);
}
