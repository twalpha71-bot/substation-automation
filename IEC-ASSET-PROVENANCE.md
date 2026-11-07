# IEC equipment visuals

Generated using the built-in image-generation tool, with transparent backgrounds, then copied into the project. No external image service, runtime API or generation key is required to use the website.

## Saved files and subjects

All new assets are bundled under `public/assets/iec/` and copied by Vite into `dist/assets/iec/`:

| File | Representative subject |
| --- | --- |
| generator.png | Industrial synchronous generator |
| tower.png | Lattice transmission tower with insulators |
| breaker.png | Outdoor three-pole HV circuit breaker and operating mechanism |
| switchgear.png | Indoor metal-clad switchgear panels |
| instrument-transformers.png | CT / CVT primary instrument transformer equipment |
| battery.png | Station battery rack with charger |
| merging-unit.png | Industrial merging unit / process-interface housing with terminals and optical ports |
| test-set.png | Portable relay secondary-injection test equipment |
| patch-panel.png | Optical LIU with LC connectors and fiber patch cords |
| disconnector.png | Outdoor three-pole center-break disconnector |
| dc-panel.png | Station DC distribution cabinet with breakers and terminals |

## Generation prompt set

The equipment subjects above were generated as separate catalog assets using these prompt specifications:

1. Generator, tower and breaker: `Use case: product-mockup. Asset: reusable equipment cutout for an IEC 61850 teaching diagram. Subject: [equipment subject]. Photorealistic engineering catalog render in three-quarter view, entire equipment visible, neutral gray/green materials, clear realistic hardware details. Isolated on true transparent background, no scenery, no people, no words, no logos, no cable labels. Generous separation from canvas edges. This is representative equipment, not an exact manufacturer's model.`
2. Switchgear, instrument transformers and battery: `Use case: product-mockup. Asset: equipment cutout for IEC 61850 educational diagrams. [equipment subject]. Photorealistic catalog render, entire equipment visible in three-quarter perspective. Neutral studio lighting, realistic proportions, true transparent background. No people, scenery, large text, brand names, watermarks or floating annotations. Representative hardware, not an exact product model.`
3. Merging unit, test set, patch panel, disconnector and DC cabinet: `Use case: product-mockup. Asset: representative physical equipment for an IEC 61850 educational diagram. Show [equipment subject]. Photorealistic clean catalog render, isolated true transparent background, complete object, three-quarter front view, accurate materials and hardware detail. No people, scenery, brands, readable text or floating diagram labels.`

The last two subject specifications were:

- `a complete outdoor 132 kV three-pole center-break disconnector assembly, six gray ribbed porcelain support insulators on a galvanized steel base, horizontal metal knife blades open in a clear V, compact operating mechanism; not a circuit breaker`
- `a floor standing gray substation 110 V DC auxiliary distribution cabinet with front door open showing orderly rows of miniature circuit breakers, fuse holders, red and black copper wiring and terminal blocks; not high voltage switchgear`

## Reused original assets

The project already supplied relay, bay-controller, industrial switch, workstation, server, gateway, clock, transformer and switchyard images. Their original files remain in `public/assets/devices/`, `public/assets/substation/` and `public/assets/academy/`. `src/data/iecEquipmentDiagrams.ts` records the exact path for each role.

These images communicate equipment classes. An image does not certify a particular vendor model's voltage rating, optical interface, redundancy protocol or IEC service support. Software objects remain logical symbols. Connections and labels are rendered separately in React/SVG so they remain selectable and readable at different zoom levels.
