# Writes index.html + FOR-CLAUDE.md for one look into the dist folder.
import html, sys
L, D = sys.argv[1], sys.argv[2]
NAME = {"glasses": "Byte in Glasses", "eagle": "Eagle Byte", "both": "Eagle Byte in Glasses"}[L]
PROP = {"glasses": "{{ glasses: true }}", "eagle": "{{ eagle: true }}", "both": "{{ eagle: true, glasses: true }}"}[L]
ORIG = "https://claude.ai/artifact/5tRyCrdsTvdQmcxXJZRP93"
base = open("../../demo/index.html").read().replace("<title>Byte Playground</title>", f"<title>{NAME}</title>")
extra = """
<style>
  .top { display: grid; gap: 6px; }
  .looks { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; max-width: 640px; }
  .look {
    display: grid; justify-items: center; gap: 2px; padding: 10px 8px 8px; text-align: center;
    border: 2px solid var(--border); border-bottom-width: 4px; border-radius: 12px;
    color: var(--fg); text-decoration: none; font-weight: 800; font-size: 14px; line-height: 18px;
  }
  .look em { display: block; font-style: normal; font-weight: 700; font-size: 12px; color: var(--muted-fg); }
  a.look:hover { border-color: var(--blue-border); }
  a.look:focus-visible { outline: 3px solid var(--blue); outline-offset: 2px; }
  .look.on { background: var(--blue-soft); border-color: var(--blue-border); color: var(--selected-fg); }
  @media (max-width: 520px) { .looks { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
"""
src = open(f"{D}/Byte.tsx").read()
section = f"""
<style>
  .for-claude {{ max-width: 1040px; margin: 48px auto 0; display: grid; gap: 12px; }}
  .for-claude ul {{ margin: 0; padding-left: 20px; display: grid; gap: 4px; }}
  .for-claude a {{ color: var(--selected-fg); overflow-wrap: anywhere; }}
  .for-claude details {{ border: 2px solid var(--border); border-radius: 16px; overflow: hidden; }}
  .for-claude summary {{ cursor: pointer; padding: 12px 16px; font-weight: 800; }}
  .for-claude pre {{ margin: 0; padding: 16px; max-height: 420px; overflow: auto; background: var(--code-bg); font: 400 12.5px/1.5 ui-monospace, "SF Mono", Menlo, monospace; }}
</style>
<section class="for-claude" id="for-claude">
  <div class="eyebrow">Career Quest hand-off · experimental look</div>
  <h2>For Claude</h2>
  <p class="note">This is a look test. The production mascot is still the original Byte at <a href="{ORIG}">{ORIG}</a>. To use this look instead, ask your Claude to read <code>FOR-CLAUDE.md</code> from this artifact.</p>
  <ul class="note">
    <li><code>Byte.tsx</code>: drop-in replacement for the original. Same API, plus a <code>look</code> prop. This page uses <code>look={html.escape(PROP)}</code></li>
    <li><code>byte.css</code>: the same two CSS variables as the original</li>
    <li><code>svg/byte-&lt;mood&gt;.svg</code>: stills of every mood in this look</li>
  </ul>
  <details>
    <summary>Source for Claude: Byte.tsx</summary>
    <pre>{html.escape(src)}</pre>
  </details>
</section>
"""
open(f"{D}/index.html", "w").write(base.replace('<div id="root"></div>', extra + '<div id="root"></div>') + section)

open(f"{D}/FOR-CLAUDE.md", "w").write(f"""# {NAME}: instructions for Claude

An **experimental look** for Byte, the Career Quest mascot. The original Byte ({ORIG}) is the fallback
and is unchanged. Use this one only if the team picked it.

## Files on this artifact
| path | what |
|---|---|
| `Byte.tsx` | Drop-in replacement for the original `src/components/Byte.tsx`. Same API and moods, plus a `look` prop. |
| `byte.css` | Same two CSS variables as the original. Append to `src/index.css` if not already there. |
| `svg/byte-<mood>.svg` | Stills of every mood in this look. |

## Use
```tsx
<Byte mood="correct" look={PROP} />
```
`look` is optional: `{{ glasses?: boolean; eagle?: boolean }}`. With no `look`, the component draws the original Byte,
so swapping the file is safe. To switch every Byte in the app, define the look once
(e.g. `export const BYTE_LOOK = {PROP[1:-1]}`) and pass it everywhere, or set it as the default in `Byte.tsx`'s props.

Everything else (moods, `useLipSync`, `followPointer`, where each mood goes) is as in the original's `FOR-CLAUDE.md`.
Never redraw or restyle the mascot by hand.
""")
print("page", L)
