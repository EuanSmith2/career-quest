// Export a static SVG of every mood for one look. Run via build.sh.
import { writeFileSync, mkdirSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { ByteRig, MOODS, type ByteLook } from "../Byte";

const id = process.argv[2] as "glasses" | "eagle" | "both";
const look: ByteLook = { glasses: id !== "eagle", eagle: id !== "glasses" };
const out = process.argv[3];
mkdirSync(out, { recursive: true });
for (const mood of MOODS) {
  const svg = renderToStaticMarkup(<ByteRig mood={mood} reduce still look={look} />)
    .replace("<svg", '<svg xmlns="http://www.w3.org/2000/svg"')
    .replace(' width="100%" height="100%"', "")
    .replace(' style="overflow:visible"', "");
  writeFileSync(`${out}/byte-${mood}.svg`, svg);
}
console.log(`exported ${MOODS.length} moods (${id})`);
