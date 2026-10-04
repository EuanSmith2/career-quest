// Export a static SVG of every mood to ../svg/ (pitch deck, Notion, favicon). Run:
//   npx esbuild export-rig.tsx --bundle --platform=node --jsx=automatic --format=cjs --outfile=/tmp/x.cjs && node /tmp/x.cjs ../svg
import { writeFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { ByteRig, MOODS } from "../Byte";

for (const mood of MOODS) {
  const svg = renderToStaticMarkup(<ByteRig mood={mood} reduce still />)
    .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    .replace(' width="100%" height="100%"', "")
    .replace(' style="overflow:visible"', "");
  writeFileSync(`${process.argv[2] ?? "../svg"}/byte-${mood}.svg`, svg);
}
console.log(`exported ${MOODS.length} moods`);
