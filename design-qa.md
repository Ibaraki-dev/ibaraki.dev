# Design QA — 2026-10-17

Target: /Users/ryo/.codex/generated_images/01a14831-1fb5-7b93-b209-ac569cdf2033/exec-070a7e4c-e398-4504-befc-c74f577e5cd1.png
Target native 1487×1058; desktop viewport 1440×1024, normalized side-by-side at 900×640 each in docs/design/comparison.png.
Evidence: docs/design/desktop.png, docs/design/mobile.png (390px viewport, full page). Local http://127.0.0.1:4321/; settled WebGL state; current event #21.

- Typography: large bold wordmark, single descriptive Japanese subtitle, small utility navigation; slogans removed.
- Layout: white hero with sculpture right, horizontal event strip, three archive rows, compact footer. Mobile stacks without horizontal overflow (390/390).
- Color: warm white and charcoal; source SVG colors on physical materials. Rendered material is less glass-like than concept, with a deliberate solid surface and bevels; P3 visual difference, no functional impact.
- Image: actual SVG geometry, 12 pieces, no white backplate; dynamic WebGL rather than generated screenshot. Preserves official shape instead of concept distortions.
- Copy: actual #21 venue and dates; archive and policy links preserved, public materials moved to archive. Adds all-events link for discoverability.

Iterations: removed long homepage sections; matched main hierarchy and dividers; corrected SVG material color and geometry orientation; replaced deprecated createShapes; tuned lighting; enlarged desktop wordmark and event typography; disabled dev toolbar.
Interactions: Event navigation works; year2025 returns3 records; impossible keyword shows empty state. Console errors: none. WebGL data-ready true. Mobile no horizontal overflow. Reduced motion/context loss handled in source; OS preference not toggled in browser QA.

Final result: passed

## Rich material / typography revision
Reference unchanged. Latest side-by-side: docs/design/rich-comparison.png (same normalization as above); runtime desktop1440×1024: rich-desktop.png; mobile390×844: rich-mobile.png. Production build inspected at localhost:4322.
Typography: self-hosted Inter Variable and Noto Sans JP Variable; heavier wordmark, Japanese weight650, optical tracking, consistent numeric/date styles. Layout: original compact structure retained, organizer navigation retained. Color/image: replaced flat pastel shading with studio light panels, thicker bevelled geometry, physical transmission, VSM shadows and a fading floor reflection. Copy unchanged.
Motion: staggered3.4-second assembly with ease-in/out; damped pointer rotation; stops at rest. Static fallback/reduced-motion still supported. Mobile omits transmission and floor reflection to avoid observed blank canvas; mobile screenshot verifies actual 3D rendering, not fallback. Width390 has no horizontal overflow. Organizer navigation verified. No production-preview console errors. Type check0 errors/warnings/hints.
Remaining visual difference: live physically rendered geometry is more regular and less dramatically refractive than the generated concept; no pixel-identical claim. Font shapes also reflect the real Inter font rather than generated lettering.
Final result: passed

## Stronger gloss follow-up
User requested more visible gloss after the first rich revision. Changed viewing angle to -0.30rad, gave individual pieces small independent angles, and positioned two narrow studio strips in the faces' reflection directions. Adjusted depth54 and per-piece scale. Large blue/red/green faces now show visible reflected bands; bevels and sides show different brightness. Screenshot comparison: docs/design/gloss-comparison.png, desktop1440×1024 and mobile390×844. Mobile rendering verified after desktop→mobile resize; no overflow, WebGL ready. Reference still uses more dramatic refraction; actual implementation retains original source geometry.
Final result: passed

## Spacing / backward tilt refinement
Per new user direction, settled logo X=-0.24rad. Shared event/archive rail verified at x401.273px. Uniform56px archive rows, aligned trailing dates/arrows, consistent8px spacing rhythm. Mobile homepage and organizer layouts reviewed. Public screenshot tilt-spacing-live.png verifies final pose and typography; latest user direction supersedes reference pose. Final result: passed

## Dark mode extension
User-requested extension of approved layout. Dark desktop and mobile organizer screenshots inspected. Typography/spacing remain aligned; muted text, form controls, CTA and WebGL use matching dark palette. Manual switching, reload persistence, route persistence, and return to system verified. Final result: passed

## Colored glass and supporting copy
Changed the small supporting line below ibaraki.dev to 茨城でつくる。つながる。 (16–22px, weight500). User supplied a dark glass reference; retained approved compact layout and backward tilt. Split face/bevel physical materials, removed metal from faces, increased transmission, added front/back contour highlights and restrained internal color gradients. Colored specular response prevents broad silver washout; stronger fading floor reflection. Desktop light/dark inspected. Reference remains more dramatically refractive, with stronger light scattering than this real-time implementation; do not claim an exact match. Mobile retains the existing non-transmissive compatibility rendering. Type check passed.

## Icon system
Installed @lucide/astro 1.58.0. Shared decorative SVG component uses 1.6px strokes, 14–20px optical sizes and currentColor. Icons added to navigation, time/place metadata, archive search/year controls, external links, organizer links and footer. Labels retained and SVGs hidden from accessibility tree. No client-side icon runtime. Desktop homepage and mobile homepage/archive/organizers inspected; mobile has no horizontal overflow. Search empty result verified. Astro check: zero errors/warnings/hints. Build passed (existing Three.js size advisory remains).

## Icon theme switch
Replaced textual theme select with Monitor/Sun/Moon Lucide buttons. Accessible names, native tooltips, aria-pressed and keyboard focus outline; selected background works in both themes. Verified dark switching + reload persistence, mobile light switching, and automatic selection. Mobile390px has no horizontal overflow. Navigation/control separation24px desktop; compact two-row mobile header retained. Typecheck clean.

## Organizer copy and navigation cleanup
Removed two redundant introductory/source notes and the bottom guideline link. Display name now Kawamata. Added verified GitHub destinations kawamataryo and yamash723, preserving X/connpass. Added guideline navigation with current-page state. Desktop and390px organizer layouts inspected;320px guideline page has no overflow. Menu guideline navigation verified. Astro check clean; build passed.

## Glass / reflection rebuild — 2026-10-17
Source: /Users/ryo/.codex/attachments/c03eb942-8bfc-47e4-a553-3ea8ea5e24ef/codex-clipboard-7ce9abf7-44b6-4006-adc5-77bcd9f24ce8.png (1487×1058).
Evidence: docs/design/glass-final-desktop.png at1487×1058 CSS pixels; docs/design/glass-final-mobile.png at390×844. Full comparison glass-full-final.png normalizes both full views to900×640. Focused comparison glass-focused-final.png compares reference crop(790,140,650,610) and rendered crop(880,105,540,550), fitted to650×610. Dark theme, assembled/resting state. Intentional differences: latest wordmark/subtitle, navigation, event content, original logo paths and backward tilt supersede the old reference's copy/layout/geometry.

Comparison history:
- P1: prior opaque-looking faces and almost absent floor reflection. Rebuilt dielectric shell, attenuation color, internal scattering, visible front/rear contours, and planar ground reflection. The original mobile reflection/transmission omission is removed.
- P2: first shell study looked frosted; migrated to high-transmission white dielectric plus pigment absorption, then added internal low-frequency color variation. Evidence glass-study-2.png, glass-study-3.png, glass-study-4.png.
- P2: overbright studio panels produced white edge slabs and broad bloom. Narrowed back panels, reduced bevel clearcoat/specular intensity and bloom. Final screenshot shows colored edges and readable dark centers.
- P2: reflection repeated hard outlines and cut off at canvas bounds. Added distance-dependent25-tap blur, subtle floor streak distortion, chroma-preserving reflection, and edge masks. Final reflections fade into the background.

Required surfaces: typography/wordmark and current small subtitle preserved; no new copy. Layout gains70px desktop glass area and60px mobile area to fit floor reflection; main grid and nav remain intact. Tokens/themes preserve page background, with weaker bloom on light. Asset fidelity retains supplied brand shapes and required animated WebGL; thick bevels reduced and colors tuned toward reference. Source has more photographic surface detail and broader caustics than this art-directed real-time approximation (P3, no pixel-identical claim). Current implementation keeps sharper contour definition instead of full path-traced surface scattering.

Validation: Astro check0 errors/warnings/hints; build passed (existing Three.js chunk warning). Desktop1487×1058 and mobile390×844 rendered with no overflow; loader releases with data-ready=true; light/dark theme controls update canvas. Browser warning/error log empty. Reduced-motion/static fallback and idle render suspension remain in source.
Final result: passed

## Dynamic entrance refinement
User requested greater launch distance and pleasing speed. Increased launch offsets, added curved paths and rotational convergence, and replaced slow symmetric easing with critically damped travel/settle. The loader now emits logo-reveal; motion waits for reveal instead of consuming its early frames behind the loading overlay. Captured48 real browser frames (docs/design/assembly/), confirmed waiting→assembling→settled and exact final layout. Contact sheet: docs/design/assembly-sequence.png. Timing-preserving GIF: docs/design/assembly-preview.gif. Overall entrance takes about2.2 seconds after the lead-in, with no bounce. Idle rendering still stops; hidden/offscreen clock pauses. Typecheck clean.
Final result: passed
