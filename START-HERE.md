# Substation Automation — Profile menus + IEC 61850 + CCNA updates

This ZIP is the modified original React project. The original sidebar, workspaces, lessons, CLI reference, labs, quizzes, downloads, all 20 topology datasets and all 11 authored protocol scenarios are retained.

## Run the website

1. Extract the ZIP completely.
2. Open a terminal **inside the extracted `Substation_Automation_Updated` folder**, where `package.json` is located.
3. Install a current Node.js LTS release if Node/npm is not already installed.
4. Run:

```sh
npm ci
npm run dev
```

Open the local address printed in the terminal. Add `/#ccna-diagrams` to go directly to the updated screen, for example `http://localhost:5173/#ccna-diagrams`.

The ordinary home address still opens the original landing page. Navigate to **CCNA Networking Academy → Networking Fundamentals → Open Full Module → Network Diagrams**.

If npm reports that `package.json` is missing, the terminal is in the wrong folder. Open the extracted project folder before running npm. If it reports a missing `dev` script, verify you are using this project's `package.json`.

## Build and checks

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

The included `dist/` directory is the production build. Serve it through an HTTP server or deploy its contents to static hosting. Opening `dist/index.html` by double-clicking it is not supported by the app's JavaScript modules.

## Shared animated title

The **Substation Automation** title now uses one shared brand component on the opening page, every workspace sidebar, the mobile workspace header, and sign-in/sign-up/password-reset panels. Its lightning symbol has a repeating 5.8-second strike animation with a subtle tilt, warm glow and small electrical arcs. The title typography and cyan-to-purple gradient are consistent at each display size. The browser title and lightning favicon use the same name and gold symbol.

Reduced-motion mode keeps a stationary gold symbol without electrical arcs. The earlier independent neon borders, 500 × 41 px search bar and 200 × 30 px entry button are preserved.

The latest captures are `preview/Thunder-Opening-preview.png`, `preview/Thunder-Workspace-preview.png` and `preview/Thunder-Mobile-preview.png`. Static captures show a frame from the animation; the website animates continuously.

## Opening-page sizes and animated borders

- Search bar: **500 × 41 CSS pixels** on desktop. It shrinks to the available width on narrow screens while keeping its 41 px height.
- Go To Substation Automation button: **200 × 30 CSS pixels**, including the border, with the complete label visible.
- Both controls have independent animated multicolor neon borders. The search ring rotates clockwise in 5 seconds; the button ring rotates counterclockwise in 3.2 seconds.
- The animation decorates the border only. Search suggestions, keyboard focus, profile controls and navigation continue to work. Reduced-motion preferences show stationary multicolor borders.
- `preview/Opening-Neon-preview.png` is the latest opening-page preview; `preview/Opening-Neon-mobile-preview.png` shows the narrow-screen layout. Earlier profile screenshots document that menu update before this control-size change.

## Profile menus and opening page

The opening page now has a notification bell and profile button in the top-right corner. The workspace uses the same profile menu.

- Guests see **Guest User**, **Sign In**, **Sign Up**, and **Continue as Guest**.
- Signed-in users see their own name, Student/Admin role, email, uploaded avatar or computed initials, and **My Profile**, **Learning Progress**, **Edit Profile**, **Change Password**, and **Sign Out**.
- Sign-in and sign-up open over the current page. A successful sign-in on the opening page keeps that page visible; a profile action opens the corresponding workspace page.
- Continue as Guest enters the workspace from the opening page and closes the menu inside the workspace.
- Menus support outside-click dismissal, Escape, arrow keys, Home/End and visible keyboard focus. Authentication dialogs keep keyboard focus inside while open.
- Responsive menus fit 320 px and 390 px mobile screens. Notifications remain connected to existing announcements and alarms.
- Existing account storage and profile editing behavior are reused. No fixed user account was added. The Alex Morgan account in the signed-in preview was created only in an isolated test browser and is not included as application data.

See `preview/Profile-Opening-Page-preview.png`, `preview/Profile-Signed-In-menu.png` and `preview/Profile-Mobile-preview.png` for actual browser captures.

## IEC 61850 equipment views

Open `http://localhost:5173/#iec-diagrams`, or use **IEC 61850 Digital Substation → Module → Diagrams**.

- All 24 diagram topics now have individual equipment layouts, local device images and numbered connections.
- Select equipment to inspect its role and connected cables. Select a numbered connection or schedule row for its medium, service and termination.
- Power conductors, CT/VT secondary wiring, DC/control wiring, optical Ethernet, copper Ethernet, routed WAN and logical relationships have distinct styles.
- The connection schedule lists both endpoints and the carried service. Highlighting emphasizes cable routes; it is not live packet traffic.
- PRP uses isolated LAN A/B paths. HSR is a closed ring with HSR-capable roles. Process-bus views include instrument transformers, merging units, protection IEDs, binary interfaces and clock distribution.
- Search, zoom and fullscreen remain available. Every chapter's Lesson and Examples views now includes its corresponding equipment scene. Original text schematics remain available in expandable references where present.
- The original data-model tree, VLAN explorer, quizzes, downloads, sidebar and learning content remain. All previous CCNA changes are included.
- Hardware photographs supplied with the project are reused; 11 missing equipment types use generated representative renders. These are teaching views, not exact vendor configurations or installation drawings. Logical SCL/data objects intentionally remain document symbols.

The new inspection labels are in English; existing English/Telugu learning content is retained. See `IEC-ASSET-PROVENANCE.md` for bundled asset paths and generation prompts.

## Updated CCNA diagram workspace

- Screenshot-inspired navy/cyan layout: topology list, hardware canvas, addressing, cable pinout, summary, and packet-flow timeline.
- Realistic desktop asset and existing photographic switch asset; detailed hardware illustrations for the remaining device types.
- Every topology uses its original devices, positions, interface links and addressing rows. Select devices or cables to inspect them.
- All address columns, including gateway and VLAN, are available by scrolling the addressing table horizontally.
- Topology 2 shows separate Ethernet and rollover-console paths. The console cable is for management and does not carry Ethernet ARP/ICMP traffic.
- Copper straight-through, 100BASE-TX crossover, legacy gigabit crossover and rollover pin mappings; media-specific explanations for fiber, serial and wireless.
- Start/resume, pause, next step, reset, speed, zoom and expanded view. Use Escape to close expanded view. Zoomed diagrams can be scrolled horizontally.
- PC-to-PC ARP request → ARP reply → ICMP echo request → ICMP echo reply, with packet fields, illustrative MAC addresses, cache state and event log.
- Expand **Protocol scenario library** to access all 11 original authored scenarios. Selecting one also selects its matching topology.

This is an educational animation, not a live network emulator. Topologies without an authored protocol scenario offer a physical-link walkthrough and retain their configuration/routing notes. The animation does not validate arbitrary CLI configuration or infer successful ping across unconfigured networks.

The topology titles, subtitles and routing summaries follow the original English/Telugu toggle. New control labels are in English.

## Included preview

`preview/IEC61850-Equipment-preview.png` and `preview/IEC61850-Process-Bus-preview.png` show the new IEC views. `preview/CCNA-Network-Diagrams-preview.png` shows the actual updated application. `VALIDATION.md` records the checks and supporting references.

## Supporting fixes

- Restored the existing mobile drawer's slide-out behavior by removing a CSS rule that overrode its transform.
- Fixed two pre-existing TypeScript issues in account administration: the account-status literal type and a missing store-action binding.
- Included `package-lock.json` for repeatable installs and `npm test` for the new network-model checks.

## Device asset

`public/assets/ccna/desktop.png` was generated with the built-in image-generation tool and bundled locally. The original switch asset is reused from `public/assets/devices/industrial-ethernet-switch.png`.

Generation prompt: “Use case: product-mockup. Asset type: transparent PNG device illustration for a dark navy CCNA network diagram. A single realistic desktop computer set, front three-quarter view: slim black widescreen monitor on left with luminous abstract blue wave wallpaper, black upright computer tower on right, small keyboard and mouse beneath. Clean photorealistic product render, crisp hardware details, subtle cyan rim light. Entire set fits within canvas with very little outer padding, landscape composition. True transparent background. No desk, no floor, no text, no logos, no labels, no network wires, no surrounding UI.”
