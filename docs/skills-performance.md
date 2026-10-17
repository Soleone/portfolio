# Skills map loading

## What loads

The skill outline comes from `content/skills.md` and is embedded in the statically generated page. There is no separate skills JSON/API request, remote model, texture, or font download for the graph itself. Its textures are generated locally.

The interactive map does download Three.js, React Three Fiber, and controls. It also needs JavaScript execution, a WebGL context, geometry uploads, and shader compilation. A fast page followed by a slower map can therefore reflect both network and device performance, not necessarily bad Wi-Fi.

## Optimizations

- Keep Three.js color conversion inside the dynamically loaded scene. Merely viewing the page no longer downloads Three.js core.
- Start loading the scene when it comes within 1,000 px of the viewport. Mount the renderer only within 200 px, and retain the existing offscreen rendering pause.
- Calculate the public map layout at build time, rather than running the 260-step force layout on every visitor's device. The development outliner still calculates layouts locally as it is edited.
- Share three unit geometries across all 142 nodes instead of creating separate spheres, hit targets, and field shells. Dimensions, tessellation, and interactions are unchanged.
- Lazy-load project preview images and defer video downloads until playback. These otherwise compete with the graphics scripts, even though they are outside the skills section.

## Local production measurements

| Measurement | Before | After |
| --- | ---: | ---: |
| Initial compressed JavaScript, before approaching skills | 372,919 B | 272,385 B |
| Compressed JavaScript including the loaded map | 526,456 B | 521,784 B |
| Initial geometry buffer uploads | 4,367,996 B | 119,932 B |
| WebGL buffers created | 1,170 | 18 |
| Compressed HTML | 40,423 B | 46,182 B |
| Cold map-ready time, throttled median | 5,463 ms | 5,216 ms |
| Long-task duration through map readiness, throttled median | 1,961 ms | 1,664 ms |

The HTML increase pays for serialized layout coordinates. Most graphics JavaScript is deferred, not eliminated.

Timing measurements used three cold navigations to `/#skills` per version, a local production build, Chromium with software WebGL, disabled browser cache, 4× CPU throttling, 150 ms latency, and 200,000 B/s download throughput. Images and videos were blocked in both versions to isolate graphics/script startup. These are comparative lab results, not predictions for a visitor in Laos. An unthrottled single run was approximately 1.3 seconds in both versions, within normal variation.

Buffer measurements instrumented WebGL `createBuffer` and `bufferData` through the first rendered map frame. This measures initial uploads, not total GPU memory or per-frame draw calls. Geometry sharing does not reduce draw-call count.

## Regression checks

- At the page top, no scene or graphics chunk should load. Approaching within 1,000 px should fetch the scene without creating its renderer yet.
- Desktop and mobile should retain the same map, search, selection, and keyboard navigation without horizontal overflow.
- Scrolling away should stop draw calls; returning should resume them.
- Without WebGL, the flat skills list and navigation should still work.
- The development `/skills` preview should update after edits without saving changes to disk.
- Project preview images should have `loading="lazy"`; videos should have `preload="none"` and still play on hover.

Build, TypeScript, browser interactions, and the checks above passed. Repository-wide lint still reports the existing arbitrary-radius errors in `components/portfolio/project-card.tsx`, unchanged by these performance edits.
