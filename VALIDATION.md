# Validation — 7 November 2026

## Shared thunder-brand update checks passed

- TypeScript check and production build passed.
- Browser verified that the lightning animation advances over time and that electrical arcs become visible during the strike.
- The same title and animation were verified in the opening page, sign-in dialog, and seven representative workspace sections: IEC 61850, CCNA, Interview Preparation, SCADA, IED Explorer, PRP/HSR, and Learning Academies. The shared application sidebar supplies the same component to all remaining workspace routes.
- Mobile workspace header keeps the brand visible with the sidebar closed, at both 390 px and 320 px widths, without overlap with account controls or horizontal overflow.
- Reduced-motion mode disables the animation and hides arcs. The browser document title begins with Substation Automation.
- No browser page errors recorded. Preview screenshots capture a fixed animation frame only in the test browser; shipped animations are not paused.

## Opening-page neon update checks passed

- Production build completed successfully.
- Browser-measured desktop dimensions: search 500 × 41 px; entry button 200 × 30 px.
- Both animated angle values change over time; separate animation names, speeds and opposite keyframe directions are configured.
- The complete button label fits its 200 px control.
- At 390 px viewport width, search is 350 × 41 px and button remains 200 × 30 px; no horizontal page overflow.
- Reduced-motion mode disables both animations while retaining colored borders.
- Search-result navigation, entry-button navigation and guest profile menu verified with no browser page errors.

## Profile update checks passed

- `npm run typecheck`, `npm run build`, and all existing `npm test` checks passed after the profile update.
- Actual production JavaScript and CSS rendered in a clean, isolated browser with embedded local images and opening video.
- Guest menu contains the three requested actions; member menu contains the four profile sections plus sign-out.
- Opening-page sign-in dialog, sign-up and account creation, sign-in after sign-out, and session restoration verified.
- All four menu actions open the corresponding existing profile section. Saving a changed name updates both the menu name and avatar initials.
- Continue as Guest opens the workspace; the same guest menu is available there. No browser page errors recorded.
- Arrow key / End navigation, Escape with focus return, and outside-click dismissal verified.
- Opening page and dropdown fit 390 px and 320 px widths without document overflow or branding overlap.
- Preview account is test-only; the shipped project has no seeded user account.

## IEC 61850 update

- 24 distinct equipment scenes mapped to all 24 original library topics; all 30 chapters resolve to their associated scene.
- Automated graph checks cover endpoint integrity, asset availability, separate PRP LANs, closed HSR ring, logical data links and service/media distinctions.
- Existing IEC library and CCNA data files are retained unchanged; original summaries and learning content remain.
- Production rendering is checked with local embedded assets, avoiding dependency on network access for preview capture. The shipped Vite app uses normal local asset URLs.
- These views show representative equipment and connection groups, not detailed terminal wiring or certified installation drawings. Product-specific ports, fiber optics, protection settings, time profiles and physical clearances require project engineering.

## IEC browser checks passed

- All 24 scene selections: every equipment image loaded, device selection and cable inspection worked, no page errors recorded.
- Search with results and no results, 100/125% zoom, fullscreen open/close, and connection highlighting start/stop.
- Equipment views present in Lesson and Examples tabs.
- At 390 px mobile width, document width remained 390 px; equipment canvases scroll independently.
- Desktop production screenshots captured at 1920 × 1240.
- All 41 original source files remain; both `iec61850AcademyData.ts` and `ccnaAcademyData.ts` are byte-for-byte identical to the uploaded ZIP.

## Earlier CCNA checks

- `npm run typecheck` — no TypeScript errors after correcting the two existing account-administration errors.
- `npm test` — validates all 20 topology graphs and their link endpoints, all 11 authored protocol scenarios, direct ARP/ICMP ordering, forward/reverse packet directions, ARP broadcast fan-out, and four copper/console pin mappings.
- `npm run build` — production output generated in `dist/`.
- Browser inspection of all 20 topology selections: expected titles, devices and links rendered; no browser errors recorded.
- Browser inspection of all 11 protocol-library selections: correct scenario and step counts retained.
- PC-to-PC walkthrough: manual steps, automatic completion, pause, reset, zoom, reset view, expanded view, speed selection, and console-cable inspector checked.
- Desktop visual review at 1680 pixels wide and mobile review at 390 pixels wide. The mobile document remains 390 pixels wide, while diagrams, steps and addressing tables have their own horizontal scrolling.
- All 41 original source files remain present. `src/data/ccnaAcademyData.ts` is byte-for-byte identical to the uploaded archive, preserving the topology, lesson, lab and protocol data.

## Preview

The included preview is an actual browser render of the final production JavaScript and CSS, paused during the ICMP Echo Request stage. For the final screenshot capture, the built assets and device images were embedded into a temporary local HTML copy so no network access was required. This did not change the shipped application.

## Scope and remaining notes

The diagram functionality was exercised in the browser. The rest of the application's source and public assets were retained; a complete functional audit of every unrelated substation workspace and authentication flow was outside this update.

The build emits Vite's bundle-size advisory because the existing application is large. It does not prevent the build. The existing 3D substation workspace still loads its Three.js dependency from its original CDN.

The new packet flow is an educational model. Only the direct-PC scenario explicitly models a complete ARP plus ICMP exchange. Other views reuse the original authored protocol scenarios or provide a clearly labeled physical-link walkthrough; they do not claim to validate real connectivity.

## Cabling references

- [Cisco: Specifications for Ethernet 100BaseTX and 10BaseT Cables](https://www.cisco.com/c/en/us/support/docs/routers/10000-series-routers/46792-ethbase.html) — verifies the two-pair Fast Ethernet crossover mapping.
- [Cisco: Transceivers, Module Connectors, and Cable Specifications](https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst6500/hardware/Chassis_Installation/Cat6500/6500_ins/0bcabcon.html) — Ethernet crossover and rollover connector references.
- [Cisco: Cable Specifications](https://www.cisco.com/en/US/docs/cable/cmts/ubr10012/installation/guide/u10k_cbl.html) — confirms the rollover reversal of pins 1–8.

## IEC communication references

- [ABB SMU615 engineering guide — vertical and horizontal communication](https://techdoc.relays.protection-control.abb/r/SMU615-IEC-61850-Engineering-Guide/1.0/en-US/Vertical-and-horizontal-communication)
- [ABB SMU615 product guide — communication](https://techdoc.relays.protection-control.abb/r/SMU615-Product-Guide/1.0/en-US/Communication)
- [Siemens SIPROTEC 5 process bus manual](https://cache.industry.siemens.com/dl/files/460/109742460/att_1150300/v1/SIP5_Processbus_V09.60_Manual_C054-E_en.pdf)
- [OMICRON — IEC 61850 process bus communication](https://www.omicronenergy.com/en/news/details/iec-61850-process-bus-communication-decrypted/)

The supplied learning text is preserved rather than comprehensively re-audited. New physical views distinguish Layer 2 GOOSE/SV, TCP MMS, routed telecontrol and logical engineering relationships.
