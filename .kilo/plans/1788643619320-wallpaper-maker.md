# Wallpaper Maker — Implementation Plan

Single-page, fully client-side "Wallpaper Maker". Live-editable gradient wallpapers rendered on a full-viewport canvas, dark modern UI, no framework, no backend, no external dependencies. Persistence only in browser `localStorage`.

## Product decisions (confirmed with user)

- **Fresh random default**: Every new wallpaper starts with randomly generated colors + properties (mode, stops, animation, effects). There is **no curated preset gallery**.
- **Resolution**: By default set *exactly* to the current device's physical pixels (`screen.width * devicePixelRatio`, each dimension rounded to an even number). A "Use device resolution" checkmark is on by default; turning it off reveals presets + custom sliders.
- **Sets** (top bar titled **Sets**): All past wallpapers as tabs/chips, switch & re-edit anytime; "+" creates a brand-new random wallpaper; active wallpaper autosaves every change instantly to localStorage. Delete allowed except when it's the last remaining set.
- **Randomize** button (in Properties menu, bottom): rerolls colors + all properties of the active set. Always asks a confirmation dialog first (protects against misclicks wiping adjustments). Resolution section is preserved on randomize.
- **Properties** (bottom bar titled **Properties**): clicking expands a large panel; controls allowed: sliders, ranges/floats, checkmarks, plus native color pickers and regular buttons (action restriction lifted earlier for menu actions). Menu panel must have **no gradient background** (flat dark surface).
- **Aesthetic**: dark mode, modern feel, **strictly NO cyberpunk / neon look**. Dark slate surfaces, subtle 1px borders, soft rounded corners, restrained accent, system font stack.
- **Download buttons at the bottom of the Properties menu** (image + video). Not in a separate toolbar.

## File structure

```
index.html          single HTML shell
styles.css          all styling (dark theme, bars, panel, controls)
app.js              state, rendering pipeline, UI wiring, export
README.md           already exists (repo root) — leave or lightly update
```

All vanilla ES modules avoided for simplicity; use one `app.js` loaded with `defer`. No build step. Opening `index.html` directly or serving statically must work.

## State model (one serializable object per set)

```js
WallpaperConfig = {
  id, name,
  resolution: { deviceExact: true, width, height, lockAspect: true },
  layers: [ Layer ],            // 1..3, stacked. Each Layer:
  Layer = {
    enabled, blend,             // globalAlpha when composited
    mode: 'linear'|'radial'|'conic'|'blobs',
    stops: [ {color, pos} ],    // 2..8 stops; blobs reuse this color list
    angle,                      // linear / conic rotation
    center: {x,y},              // radial / conic / blobs focal %
    radius,                     // radial scale %
    blobCount, blobSize, blobSoftness, blobSpread, // blobs mode
  },
  anim: { enabled, masterSpeed, hueDriftSpeed, angleSpinSpeed,
          focalDrift: {speed, amount}, stopOsc: {speed, amount},
          sheen: {enabled, speed, strength, width},
          flow: {enabled, amount} },
  looks: { grain: {enabled, amount, size}, vignette: {enabled, strength, falloff},
           kaleido: {enabled, segments, smoothing}, ditherExport },
}
```

Plus per-app storage: `{ sets: [WallpaperConfig], activeId }`. Key: `wallpapermaker.v1`.

## Core behaviors

1. **First visit**: create one set with random config; auto-detect device resolution.
2. **"+" in Sets bar**: push new set with fresh random config, switch to it, autosave.
3. **Autosave**: any control change → update active config → re-render preview → save to localStorage (debounced ~150ms). Thumbnails (small dataURL ~120x68) stored per set for the Sets chips.
4. **Randomize** (bottom of Properties): confirm modal → reroll colors/properties of active set (resolution untouched) → render + save. If anim paused etc., state unchanged otherwise.
5. **Delete set**: allowed while sets.length > 1; deleting the active one switches to a neighbor.
6. **Rename**: double-click set chip → inline rename.

## Rendering pipeline (Canvas 2D)

- Two canvases:
  - **Preview canvas**: full-bleed behind bars; sized to viewport device pixels, CSS `100%`; uses CSS `background` nothing — gradient drawn by us. Since default aspect ≈ screen aspect, "Use device resolution" on gives 1:1 full coverage. When an overridden aspect differs from the viewport, render the full wallpaper *contained* (letterboxed) over a flat near-black backdrop so the entire design is visible.
  - **Export canvas**: offscreen at `resolution.width × resolution.height`.
- One shared **paint function** `renderWallpaper(ctx, W, H, cfg, time)` used by both preview and export so output always matches preview:
  1. Compose layers back-to-front. Per layer, `globalAlpha = blend`, set transform/translate to draw per mode:
     - `linear`: gradient at `angle`, N stops (colors/pos in px via W/H scale).
     - `radial`: gradient centered `center` with `radius`.
     - `conic`: `createConicGradient` at center rotated by `angle`.
     - `blobs`: draw `blobCount` large soft radial blobs using consecutive colors from `stops` (cycling), each with falloff + `blobSoftness`, composited with `globalCompositeOperation='lighter'` to get the **lava-lamp merging** look; blob positions wander via layered sine/noise drift at `time`.
  2. **Kaleidoscope** (when on, non-blob layers): render each layer into a wedge-symmetry pattern (rotate/reflect canvas around center for `segments`), blending seam with `smoothing`.
  3. **Flow wobble** (when on): offset stop positions / layer params by slow time-domain turbulence so colors appear to liquefy.
  4. **Sheen sweep**: moving soft diagonal light band, position = f(time).
  5. **Vignette**: radial darkening at edges.
  6. **Grain**: tile a small pre-rendered noise canvas over the whole frame with `amount` alpha (preview grain at low res is fine; export uses full-res deterministic noise seed so image and each video frame look stable).
  7. **DitherExport** (export only): add tiny ordered dither when true (mainly helps JPEG/WebP banding).
- Animation timebase: `animTime` advances only while `anim.enabled` and not exporting a still; `masterSpeed` scales all speeds; pausing freezes `animTime` so still image export matches exactly what is on screen.

## Animation features (each: check + speed/amount sliders, additive)

- Angle rotation (auto-rotates `angle` continuously)
- Hue drift (cyclically rotate hue of all stop colors over time)
- Focal movement (radial/conic/blob centers wander)
- Stop oscillation (positions "breathe")
- Sheen sweep, flow wobble (under anim/effects)
- Lava-lamp liquid merge achieved via blobs mode drift (above)

## Properties menu sections (collapsible groups, flat dark panel)

1. **Resolution**
   - Check "Use device resolution" (default on) → auto sizes.
   - When off: preset chips (4K 3840×2160, 1440p 2560×1440, 1080p 1920×1080, Ultrawide 3440×1440, Ultrawide 2560×1080, 5K 5120×2880, iPhone 1170×2532, Android 1080×2400), width & height sliders (steps of 10px, sensible clamp ~320–7680), aspect-lock checkmark so height follows width (or vice versa) by the current ratio.
2. **Layers**: layers count slider 1–3; each layer card: enabled check, blend-strength slider, mode picker (Linear / Radial / Conic / Liquid blobs).
3. **Colors** (for selected/active layer): stop count slider 2–8; each stop row: native color picker + position % slider. (For blobs mode this section drives blob colors.)
4. **Shape** (mode-dependent, active layer): angle slider (linear/conic), center X/Y % + radius % (radial/conic), and for blobs: blob count, blob size, softness, spread.
5. **Animation**: master Enabled check; global speed; per-effect checks + sliders as listed above.
6. **Looks / textures**: grain amount/size, vignette strength/falloff, kaleidoscope segments/smoothing, sheen strength/width, flow amount. Each with its own enabled check.
7. **Export**: image format (PNG/JPEG/WebP chips), video format (MP4/WebM — auto-fallback logic: detect `MediaRecorder.isTypeSupported`, fall back to WebM), video duration slider (1–60 s), fps chips (15/24/30/60), quality slider; buttons **Download Image** and **Download Video** at the very bottom, then **Randomize** (with confirm dialog).

## Export behavior

- **Image**: create export canvas, render at current `animTime` (0 phase if paused → identical to screen), `toBlob` in chosen format + quality, trigger download named `wallpaper-<W>x<H>.<ext>`.
- **Video**: real-time client-side recording. Render the export canvas at export resolution at the chosen fps/duration while the animation advances on a video clock; `canvas.captureStream(fps)` → `MediaRecorder` (mime per chosen format, fallback rules above, `videoBitsPerSecond` high for quality). During recording show a "Recording… Xs / Ys" overlay and lock the Properties inputs; on completion save blob as `wallpaper-<W>x<H>.<ext>`. Realtime note: a 5 s 4K clip takes ~5 s to produce — acceptable; if the browser can't keep the fps (dropped frames over ~10%), warn and suggest lower fps/resolution.
- Export uses the same paint function at full resolution; nothing else is upscaled.

## Sets bar UI (top, always visible)

- Title text "Sets" + horizontal row of chips (thumbnail + name), active chip highlighted; "+" chip at the right end. Hover a chip → small delete (×) affordance; double-click to rename.
- Selecting a chip loads that set as active (its own config/state) and rerenders; edits apply only to the active set and autosave.

## Dark modern theme (explicitly not cyberpunk)

- Palette: near-black blue-gray backgrounds (`#0d1014`, `#12161c`, `#1a1f27`), panels raised slightly, borders `#262d38`, text `#e6e9ee` / muted `#98a1ae`.
- Accent: a single soft, non-neon color (e.g., desaturated teal/violet) used sparingly for active states.
- Rounded 10–14px panels, subtle elevation/shadow, no glow, no neon, no gridlines, no scanlines, no chrome/acid colors. 12–14px system font (`ui-sans-serif` / system stack). Properties bottom sheet and Sets bar are flat panels (menu has **no gradient** anywhere).
- Custom-styled `<input type=color>` swatches + custom range/checkbox styling matching theme. Responsive: on narrow screens panels scroll vertically.

## Validation steps

1. Serve folder (`python3 -m http.server`) and open; verify a random colorful wallpaper appears full-screen.
2. Toggle each mode + each control and confirm the preview updates live with no console errors.
3. Confirm Properties panel opens/closes smoothly, has no gradient background, and stays readable in dark theme.
4. Randomize → confirm modal appears; cancel keeps state; confirm rerolls (resolution unchanged).
5. Resolution: device-detection numbers match screen; override to a non-native aspect → contained preview; export matches.
6. Sets: first-run auto-creates one set; edits autosave; reload page restores sets + active selection; "+" adds a random set; delete works until one remains; rename works.
7. Export: PNG/JPEG/WebP downloads at exact chosen resolution; MP4 and WebM both exported (fallback where unsupported); video shows the animated effect and honors fps/duration; image matches the paused preview exactly.
8. Banding: dither toggle visibly helps JPEG/WebP on a smooth gradient.
9. Grain/vignette/kaleidoscope/sheen/flow each toggle on/off cleanly and pause with the animation pause.
10. Mobile viewport: layout scrolls, controls usable, no horizontal overflow.

## Out of scope

- Backend, accounts, cloud storage; downloadable JSON import/export; SVG export; shareable URL state; rendering text/images/emoji over the wallpaper.
