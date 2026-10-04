// Regenerates prompt-1A-byte.md from mascot/Byte.tsx so the paste-in fallback never drifts.
//   node lovable-kit/build-kit.mjs
import { readFileSync, writeFileSync } from "node:fs";
const here = new URL(".", import.meta.url);
const byte = readFileSync(new URL("../mascot/Byte.tsx", here), "utf8").trim();
const prompt = `# Prompt 1A: add Byte (paste-in fallback)

Use this only if install-byte.sh can't be used (no GitHub connected). Paste everything below the line
into the Lovable chat as ONE message, right after Prompt 1 has finished.

---

Add our mascot, Byte. The complete component is below.

1. Create src/components/Byte.tsx containing EXACTLY the code below. Do not rewrite, reformat, restyle,
   split or "improve" it, and never edit it later.
2. Make sure framer-motion is installed.
3. Add to src/index.css:
   :root { --byte-shadow: #dfe1ee; --byte-backdrop: transparent; }
   .dark { --byte-shadow: #0d1518; --byte-backdrop: #263840; }
4. Don't place Byte anywhere yet; the next prompts say where. Never draw any other mascot art.

\`\`\`tsx
${byte}
\`\`\`
`;
writeFileSync(new URL("prompt-1A-byte.md", here), prompt);
console.log(`prompt-1A-byte.md: ${prompt.length.toLocaleString()} characters`);
