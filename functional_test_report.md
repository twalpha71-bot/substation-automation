# Automated Functional & Regression Test Report

## 1. Executive Summary & Overall Counts

| Test Suite / Verification Stage | Execution Command | Passed | Failed | Blocked | Skipped | Total | Status |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **CCNA Networking Academy Test Suite** | `node scripts/test-ccna.mjs` | 1 | 0 | 0 | 0 | 1 | **PASS** |
| **IEC 61850 Equipment & Architecture Suite** | `node scripts/test-iec.mjs` | 1 | 0 | 0 | 0 | 1 | **PASS** |
| **Comprehensive Regression Suite (12 Domains)** | `node scripts/test-regression.mjs` | 26 | 0 | 0 | 0 | 26 | **PASS** |
| **Headless Chromium Browser E2E Suite** | `python3 verify_browser_e2e.py` | 33 | 0 | 0 | 0 | 33 | **PASS** |
| **TOTAL EXECUTED CHECKS** | `npm test` + Browser E2E | **61** | **0** | **0** | **0** | **61** | **PASS (100%)** |

## 2. Bugs Discovered & Fixed During Verification

1. **Missing Lucide React Icons (`UserRound`, `UserRoundPlus`, `LogIn`, `Rocket`, `SkipForward`)**:
   - **Symptom**: Launching the production preview (`npm run preview`) in headless Chromium threw `Minified React error #130 (Element type is invalid: expected a string or a class/function but got: undefined)` on the opening page because `UserRound` and related profile icons were missing from the offline vendor icon bundle.
   - **Fix**: Added explicit vector definitions for `UserRound`, `UserRoundPlus`, `LogIn`, `Rocket`, and `SkipForward` plus a `Proxy` fallback in the offline `lucide-react` bundle.
2. **External CDN Dependency for Three.js (`r128`) in `index.html`**:
   - **Symptom**: `index.html` referenced `https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js`, which fails in offline environments.
   - **Fix**: Bundled a local offline Three.js r128 implementation at `public/assets/three.min.js` (`window.THREE`) and updated `index.html` to load `./assets/three.min.js`.
3. **Disconnected Language Selector & External Translation API Calls**:
   - **Symptom**: Clicking languages in `src/App.tsx` did not invoke `setOnlineLanguage(code)` or trigger synchronous DOM translation for non-English/Telugu languages, and `src/i18n/onlineTranslation.ts` / `api/translate.ts` relied on an external LibreTranslate endpoint while still listing `KN` (Kannada) and `ML` (Malayalam).
   - **Fix**: Built `src/i18n/offlineTranslation.ts` with 100% local offline dictionaries and terminology-safe translation across all 8 required languages (`EN`, `TE`, `TA`, `HI`, `PT`, `KO`, `FR`, `JA`), removed `KN` and `ML`, removed `.env.translation.example`, and wired `src/App.tsx` and `src/pages/AuthAndAdminPages.tsx` to update and persist `sas-display-language` synchronously.

## 3. Regression Test Breakdown by Domain (`scripts/test-regression.mjs`)

| Domain | Test Case Description | Result |
| :--- | :--- | :---: |
| **SLD** | Initializes 28 bays across 132 kV (5), 33 kV (11), and 11 kV (12) | **PASS** |
| **SLD** | Initializes 6 busbar sections (132/33/11 kV Bus A & Bus B) and 4 transformers (T1, T2, DT1, DT2) | **PASS** |
| **SLD** | Enforces `CILO1` disconnector interlocking: blocks opening `Q1`/`Q9` under load when `52` CB is `CLOSED` | **PASS** |
| **SLD** | Permits `Q1`/`Q9` disconnector operation & `Q8` earth switch interlocking when `52` CB is `OPEN` | **PASS** |
| **SLD** | Transformer OLTC tap changer `RAISE`/`LOWER` updates tap position (`1..17`) and secondary voltage | **PASS** |
| **SLD** | Dynamic Bay Engineering Editor adds and removes configurable feeder bays with IED and signals | **PASS** |
| **SCADA** | Enforces `43LR` Local/Remote hierarchy: `LOCAL` blocks `SCADA_SBO` commands and permits `LOCAL_PANEL` | **PASS** |
| **SCADA** | Protection trip raises `ACTIVE_UNACK` alarm, records 1 ms SOE events, and blocks close until `86` Lockout reset | **PASS** |
| **SCADA** | Alarm state machine supports single acknowledge, `acknowledgeAllAlarms`, and `clearClearedAlarms` | **PASS** |
| **IEC 61850** | Instantiates 1,206 SAS signals across 28 bays (from 50 SAS templates) with valid Logical Nodes and Functional Constraints | **PASS** |
| **IEC 61850** | `SCL_FILE_SAMPLES` and Academy/SCL modules provide valid XML for IEC 61850-6 SCL types (`ICD`, `IID`, `SCD`, `CID`, `SSD`) | **PASS** |
| **GOOSE** | Configures GOOSE Control Blocks with Layer-2 Multicast MAC `01-0C-CD-01-00-xx`, `APPID 0x00xx`, and `802.1Q` VLAN Priority | **PASS** |
| **GOOSE** | `triggerGooseStateChangeBurst` increments `stNum` (`+1`) and resets `sqNum` (`0`) | **PASS** |
| **GOOSE** | Supports all 5 GOOSE fault injection modes (`VLAN_MISMATCH`, `APPID_MISMATCH`, `CONFREV_MISMATCH`, `DATASET_MISSING`, `TIMEOUT`) and recovery | **PASS** |
| **MMS** | All 28 Multi-Vendor IEDs expose MMS connection state, Logical Devices, Datasets, and BRCB/URCB report control blocks | **PASS** |
| **MMS** | `toggleRcbEnabled` toggles `RptEna` (`enabled`) and `triggerMmsGeneralInterrogation` executes `GI` across active RCBs | **PASS** |
| **PRP** | Maintains isolated Dual-LAN (`LAN_A` & `LAN_B`) links across DANP IEDs and supports fault injection & FAT/SAT verification | **PASS** |
| **HSR** | Supports HSR ring redundancy mode switching and cut-through ring fault tolerance (`0x892F`, `IEC 62439-3` Clause 5) | **PASS** |
| **Bus Transfer** | Blocks live-live Bus Coupler closing in `MANUAL` mode (`CILO1` anti-paralleling interlock) | **PASS** |
| **Bus Transfer** | Executes dead-bus transfer via `requestBusTransfer` when one bus is dead and restores normal split-bus feeding | **PASS** |
| **3D Camera Controls** | Implements `ORBIT`, `PAN`, `WALK`, `FLY` camera modes, presets, focus/zoom, fullscreen, and 3D Raycaster equipment picking | **PASS** |
| **Apartment Distribution** | Couples 11 kV outgoing feeders (`BAY-11-F01..F08`) and `DT1`/`DT2` to `11/0.415 kV DT-250kVA` and apartment/residential load energization | **PASS** |
| **Navigation & Layout** | Supports all 20 workspace tabs, hash deep-linking (`#/workspace/<TAB>`), mobile drawer, and `overflow-x` protection | **PASS** |
| **Offline Translation** | Supports strictly 8 languages (`EN`, `TE`, `TA`, `HI`, `PT`, `KO`, `FR`, `JA`) and completely removes `KN` and `ML` | **PASS** |
| **Offline Translation** | Preserves 100% of technical terminology, commands, formulas, and device IDs across all 7 non-English languages | **PASS** |
| **Offline Translation** | Translates 100% of sidebar, main page headings, buttons, tables, dialogs, and engineering explanations offline | **PASS** |

## 4. Headless Chromium Browser E2E Verification (`npm run preview`)

| Page / Route | Rendered Text Length (chars) | Interactive Buttons | Tables | SVGs / 3D Canvases | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `#/workspace/HERO` | 10,509 | 101 | 0 | 58 | **PASS** |
| `#/workspace/SLD` | 7,044 | 80 | 1 | 49 | **PASS** |
| `#/workspace/SCADA` | 8,560 | 107 | 2 | 43 | **PASS** |
| `#/workspace/IED` | 8,037 | 76 | 0 | 32 | **PASS** |
| `#/workspace/IED_SIGNAL_CHAIN` | 17,888 | 44 | 1 | 48 | **PASS** |
| `#/workspace/NETWORK` | 3,608 | 77 | 1 | 42 | **PASS** |
| `#/workspace/GOOSE` | 4,184 | 43 | 1 | 35 | **PASS** |
| `#/workspace/MMS` | 4,871 | 52 | 3 | 43 | **PASS** |
| `#/workspace/MODBUS_LAB` | 7,240 | 40 | 1 | 37 | **PASS** |
| `#/workspace/IEC104_LAB` | 13,447 | 40 | 1 | 36 | **PASS** |
| `#/workspace/OPCUA_LAB` | 11,292 | 77 | 1 | 36 | **PASS** |
| `#/workspace/SIGNALS` | 17,882 | 44 | 1 | 48 | **PASS** |
| `#/workspace/FAULTS` | 5,339 | 57 | 0 | 64 | **PASS** |
| `#/workspace/FATSAT` | 4,770 | 66 | 0 | 63 | **PASS** |
| `#/workspace/IEC61850_ACADEMY` | 4,318 | 50 | 0 | 49 | **PASS** |
| `#/workspace/INTERVIEW_PREP` | 2,668 | 52 | 0 | 47 | **PASS** |
| `#/workspace/CCNA_ACADEMY` | 1,670 | 56 | 0 | 50 | **PASS** |
| `#/workspace/LEARNING` | 4,729 | 63 | 0 | 66 | **PASS** |

## 5. Responsive Viewport Verification (Headless Chromium)

| Viewport Profile | Window Size | `window.innerWidth` | `document.documentElement.scrollWidth` | Horizontal Overflow | Status |
| :--- | :---: | :---: | :---: | :---: | :---: |
| **Desktop 1920x1080** | 1920 px | 1920 px | 1905 px | None (`0 px`) | **PASS** |
| **Tablet 768x1024** | 768 px | 768 px | 753 px | None (`0 px`) | **PASS** |
| **Mobile 390x844** | 390 px | 390 px | 375 px | None (`0 px`) | **PASS** |
| **Compact Mobile 320x640** | 320 px | 320 px | 305 px | None (`0 px`) | **PASS** |
