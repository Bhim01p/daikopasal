import { readFileSync, writeFileSync, existsSync } from "node:fs";
const products = JSON.parse(readFileSync("backend/seed/products.json", "utf8"));
const saved = new Map();
for (const p of products) {
  const url = p.imageSourceUrl || p.image;
  if (
    !saved.has(url) &&
    p.image.startsWith("/assets/") &&
    existsSync("frontend/public" + p.image)
  )
    saved.set(url, p.image);
  if (!saved.has(url)) {
    const parsed = new URL(url);
    if (
      ![
        "i01.appmifile.com",
        "i02.appmifile.com",
        "cdsassets.apple.com",
      ].includes(parsed.hostname)
    )
      throw Error("Unexpected asset host");
    const target =
      "/assets/" + p.id + (parsed.pathname.endsWith(".png") ? ".png" : ".jpg");
    if (existsSync("frontend/public" + target)) {
      saved.set(url, target);
      p.imageSourceUrl = url;
      p.image = target;
      continue;
    }
    const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw Error("Asset fetch failed: " + p.id);
    const data = Buffer.from(await response.arrayBuffer());
    if (data.length > 15000000) throw Error("Asset too large");
    const png = data[0] === 137 && data[1] === 80 && data[2] === 78;
    const jpg = data[0] === 255 && data[1] === 216;
    if (!png && !jpg) throw Error("Unexpected image format: " + p.id);
    const path = "/assets/" + p.id + (png ? ".png" : ".jpg");
    writeFileSync("frontend/public" + path, data);
    saved.set(url, path);
    console.log(p.id + ": saved " + Math.round(data.length / 1024) + " KB");
  }
  p.imageSourceUrl = url;
  p.image = saved.get(url);
}
writeFileSync(
  "backend/seed/products.json",
  JSON.stringify(products, null, 2) + "\n",
);
let home = readFileSync("frontend/src/pages/ReferenceHome.tsx", "utf8");
for (const [url, path] of saved) home = home.replaceAll(url, path);
writeFileSync("frontend/src/pages/ReferenceHome.tsx", home);
