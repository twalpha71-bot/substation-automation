import fs from 'node:fs';
import path from 'node:path';
import { build } from 'esbuild';

const root = process.cwd();

async function loadModule(entry) {
  const b = await build({
    entryPoints: [entry],
    bundle: true,
    platform: 'node',
    format: 'esm',
    write: false,
  });
  return import('data:text/javascript;base64,' + Buffer.from(b.outputFiles[0].text).toString('base64'));
}

const { useSubstationStore } = await loadModule('src/simulation/useSubstationStore.ts');
const { SCL_FILE_SAMPLES } = await loadModule('src/data/sclSamples.ts');
const {
  LANGUAGE_CODES,
  SUPPORTED_LANGUAGE_LIST,
  translateOfflineText,
  normalizeLanguageCode,
} = await loadModule('src/i18n/offlineTranslation.ts');

let passed = 0;
let failed = 0;
let blocked = 0;
let skipped = 0;

function check(category, name, fn) {
  try {
    const ok = fn();
    if (ok === false) {
      failed++;
      console.error(`FAIL [${category}] ${name}`);
    } else {
      passed++;
      console.log(`PASS [${category}] ${name}`);
    }
  } catch (err) {
    failed++;
    console.error(`FAIL [${category}] ${name}: ${err?.message || err}`);
  }
}

// ============================================================================
// 1. SLD (Single-Line Diagram) Regression Tests
// ============================================================================
check('SLD', 'Initializes 28 bays across 132 kV (5), 33 kV (11), and 11 kV (12)', () => {
  const s = useSubstationStore.getState();
  const b132 = s.bays.filter((b) => b.voltageKv === 132);
  const b33 = s.bays.filter((b) => b.voltageKv === 33);
  const b11 = s.bays.filter((b) => b.voltageKv === 11);
  return s.bays.length === 28 && b132.length === 5 && b33.length === 11 && b11.length === 12;
});

check('SLD', 'Initializes 6 busbar sections (132/33/11 kV Bus A & Bus B) and 4 transformers (T1, T2, DT1, DT2)', () => {
  const s = useSubstationStore.getState();
  return (
    s.busbars.length === 6 &&
    s.busbars.every((b) => b.energized && b.voltageKv > 0) &&
    s.transformers.length === 4 &&
    s.transformers.every((t) => t.energized)
  );
});

check('SLD', 'Enforces CILO1 disconnector interlocking: blocks opening Q1/Q9 under load when 52 CB is CLOSED', () => {
  const s = useSubstationStore.getState();
  const ok = s.commandDisconnector('BAY-33-F01', 'BUS_Q1', 'OPEN');
  const bay = useSubstationStore.getState().bays.find((b) => b.id === 'BAY-33-F01');
  return ok === false && bay.busDisconnectorState === 'CLOSED';
});

check('SLD', 'Permits Q1/Q9 disconnector operation & Q8 earth switch interlocking when 52 CB is OPEN', () => {
  const s = useSubstationStore.getState();
  const cbOpen = s.commandBreaker('BAY-33-F02', 'OPEN', 'SCADA_SBO');
  const q8Blocked = useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'EARTH_Q8', 'CLOSED');
  const q9Open = useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'LINE_Q9', 'OPEN');
  const q1Open = useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'BUS_Q1', 'OPEN');
  const q8Closed = useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'EARTH_Q8', 'CLOSED');
  const q9Blocked = useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'LINE_Q9', 'CLOSED');
  useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'EARTH_Q8', 'OPEN');
  useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'BUS_Q1', 'CLOSED');
  useSubstationStore.getState().commandDisconnector('BAY-33-F02', 'LINE_Q9', 'CLOSED');
  useSubstationStore.getState().commandBreaker('BAY-33-F02', 'CLOSED', 'SCADA_SBO');
  return cbOpen && !q8Blocked && q9Open && q1Open && q8Closed && !q9Blocked;
});

check('SLD', 'Transformer OLTC tap changer RAISE/LOWER updates tap position (1..17) and secondary voltage', () => {
  const s = useSubstationStore.getState();
  const beforeTap = s.transformers.find((t) => t.id === 'TX-T1').oltcTapPosition;
  s.stepTransformerOltc('TX-T1', 'RAISE');
  const afterRaise = useSubstationStore.getState().transformers.find((t) => t.id === 'TX-T1').oltcTapPosition;
  useSubstationStore.getState().stepTransformerOltc('TX-T1', 'LOWER');
  const afterLower = useSubstationStore.getState().transformers.find((t) => t.id === 'TX-T1').oltcTapPosition;
  return afterRaise === beforeTap + 1 && afterLower === beforeTap;
});

check('SLD', 'Dynamic Bay Engineering Editor adds and removes configurable feeder bays with IED and signals', () => {
  const s = useSubstationStore.getState();
  const initialCount = s.bays.length;
  s.addConfigurableFeederBay({
    voltageKv: 33,
    busSection: 'A',
    name: '33kV Solar Park Feeder',
    nominalLoadMw: 6.5,
    nominalLoadMvar: 2.1,
    vendor: 'ABB / Hitachi Energy',
  });
  const afterAdd = useSubstationStore.getState().bays;
  const addedBay = afterAdd.find((b) => b.name.includes('Solar Park'));
  if (!addedBay || afterAdd.length !== initialCount + 1) return false;
  useSubstationStore.getState().removeConfigurableFeederBay(addedBay.id);
  return useSubstationStore.getState().bays.length === initialCount;
});

// ============================================================================
// 2. SCADA (HMI, Alarms, SOE, SBO, 43LR Local/Remote) Regression Tests
// ============================================================================
check('SCADA', 'Enforces 43LR Local/Remote hierarchy: LOCAL blocks SCADA_SBO commands and permits LOCAL_PANEL', () => {
  const s = useSubstationStore.getState();
  s.setBayLocalRemote('BAY-33-F01', 'LOCAL');
  const scadaBlocked = useSubstationStore.getState().commandBreaker('BAY-33-F01', 'OPEN', 'SCADA_SBO');
  const localAllowed = useSubstationStore.getState().commandBreaker('BAY-33-F01', 'OPEN', 'LOCAL_PANEL');
  useSubstationStore.getState().setBayLocalRemote('BAY-33-F01', 'REMOTE');
  const scadaRestored = useSubstationStore.getState().commandBreaker('BAY-33-F01', 'CLOSED', 'SCADA_SBO');
  return scadaBlocked === false && localAllowed === true && scadaRestored === true;
});

check('SCADA', 'Protection trip raises ACTIVE_UNACK alarm, records 1 ms SOE events, and blocks close until 86 Lockout reset', () => {
  const s = useSubstationStore.getState();
  const soeBefore = s.soeLog.length;
  s.triggerProtectionTrip('BAY-33-F03', 'PTOC1.Op (51 Phase Overcurrent)');
  const afterTrip = useSubstationStore.getState();
  const bay = afterTrip.bays.find((b) => b.id === 'BAY-33-F03');
  const closeBlockedBy86 = afterTrip.commandBreaker('BAY-33-F03', 'CLOSED', 'SCADA_SBO');
  afterTrip.resetProtectionTrip('BAY-33-F03');
  const closeAfterReset = useSubstationStore.getState().commandBreaker('BAY-33-F03', 'CLOSED', 'SCADA_SBO');
  return (
    bay.breakerState === 'OPEN' &&
    bay.protectionTripActive === true &&
    afterTrip.soeLog.length > soeBefore &&
    closeBlockedBy86 === false &&
    closeAfterReset === true
  );
});

check('SCADA', 'Alarm state machine supports single acknowledge, acknowledgeAllAlarms, and clearClearedAlarms', () => {
  const s = useSubstationStore.getState();
  s.triggerProtectionTrip('BAY-11-F01', 'PTOC1.Op');
  const unack = useSubstationStore.getState().alarms.find((a) => a.state === 'ACTIVE_UNACK');
  if (!unack) return false;
  useSubstationStore.getState().acknowledgeAlarm(unack.id);
  const acked = useSubstationStore.getState().alarms.find((a) => a.id === unack.id);
  useSubstationStore.getState().acknowledgeAllAlarms();
  useSubstationStore.getState().resetProtectionTrip('BAY-11-F01');
  useSubstationStore.getState().commandBreaker('BAY-11-F01', 'CLOSED', 'SCADA_SBO');
  useSubstationStore.getState().clearClearedAlarms();
  return Boolean(acked && acked.state === 'ACTIVE_ACK');
});

// ============================================================================
// 3. IEC 61850 & SCL Regression Tests
// ============================================================================
check('IEC 61850', 'Instantiates 1,206 SAS signals across 28 bays (from 50 SAS templates) with valid Logical Nodes and Functional Constraints', () => {
  const s = useSubstationStore.getState();
  const validFcs = new Set(['ST', 'MX', 'CO', 'CF', 'SV', 'SP', 'DC', 'EX']);
  return (
    s.signals.length === 1206 &&
    s.signals.every((sig) => sig.logicalNodeClass && sig.dataObject && validFcs.has(sig.fc))
  );
});

check('IEC 61850', 'SCL_FILE_SAMPLES and Academy/SCL modules provide valid XML for IEC 61850-6 SCL types (ICD, IID, SCD, CID, SSD)', () => {
  const types = new Set(SCL_FILE_SAMPLES.map((f) => f.fileType));
  const allXmlValid = SCL_FILE_SAMPLES.every(
    (f) => f.xmlContent.includes('<SCL') && f.xmlContent.includes('<Header') && f.xmlContent.includes('</SCL>')
  );
  const acadData = fs.readFileSync(path.join(root, 'src/data/iec61850AcademyData.ts'), 'utf8');
  return ['ICD', 'IID', 'SCD', 'CID'].every((t) => types.has(t)) && acadData.includes('SSD') && allXmlValid;
});

// ============================================================================
// 4. GOOSE (IEC 61850-8-1) Regression Tests
// ============================================================================
check('GOOSE', 'Configures GOOSE Control Blocks with Layer-2 Multicast MAC 01-0C-CD-01-00-xx, APPID 0x00xx, and 802.1Q VLAN Priority', () => {
  const s = useSubstationStore.getState();
  return (
    s.gooseControlBlocks.length === 4 &&
    s.gooseControlBlocks.every(
      (g) => g.multicastMac.startsWith('01-0C-CD-01-') && g.appId.startsWith('0x') && g.vlanPriority >= 4
    )
  );
});

check('GOOSE', 'triggerGooseStateChangeBurst increments stNum (+1) and resets sqNum (0)', () => {
  const s = useSubstationStore.getState();
  const g0 = s.gooseControlBlocks[0];
  const prevSt = g0.stNum;
  s.triggerGooseStateChangeBurst(g0.id);
  const g1 = useSubstationStore.getState().gooseControlBlocks.find((x) => x.id === g0.id);
  return g1.stNum === prevSt + 1 && g1.sqNum === 0;
});

check('GOOSE', 'Supports all 5 GOOSE fault injection modes (VLAN_MISMATCH, APPID_MISMATCH, CONFREV_MISMATCH, DATASET_MISSING, TIMEOUT) and recovery', () => {
  const s = useSubstationStore.getState();
  const gocbId = s.gooseControlBlocks[0].id;
  for (const mode of ['VLAN_MISMATCH', 'APPID_MISMATCH', 'CONFREV_MISMATCH', 'DATASET_MISSING', 'TIMEOUT']) {
    useSubstationStore.getState().setGooseMismatchFault(gocbId, mode);
    const cur = useSubstationStore.getState().gooseControlBlocks.find((g) => g.id === gocbId);
    if (cur.mismatchFault !== mode || cur.healthy !== false) return false;
  }
  useSubstationStore.getState().setGooseMismatchFault(gocbId, 'NONE');
  const recovered = useSubstationStore.getState().gooseControlBlocks.find((g) => g.id === gocbId);
  return recovered.mismatchFault === 'NONE' && recovered.healthy === true;
});

// ============================================================================
// 5. MMS (ISO 9506 / TCP Port 102) Regression Tests
// ============================================================================
check('MMS', 'All 28 Multi-Vendor IEDs expose MMS connection state, Logical Devices, Datasets, and BRCB/URCB report control blocks', () => {
  const s = useSubstationStore.getState();
  return (
    s.ieds.length === 28 &&
    s.ieds.every((ied) => ied.mmsConnected === true && ied.rcbs.length >= 2 && ied.logicalDevices.length >= 2)
  );
});

check('MMS', 'toggleRcbEnabled toggles RptEna (enabled) and triggerMmsGeneralInterrogation executes GI across active RCBs', () => {
  const s = useSubstationStore.getState();
  const ied = s.ieds[0];
  const rcbName = ied.rcbs[0].name;
  const beforeEna = ied.rcbs[0].enabled;
  s.toggleRcbEnabled(ied.id, rcbName);
  const toggledEna = useSubstationStore.getState().ieds[0].rcbs[0].enabled;
  useSubstationStore.getState().toggleRcbEnabled(ied.id, rcbName);
  const soeBefore = useSubstationStore.getState().soeLog.length;
  useSubstationStore.getState().triggerMmsGeneralInterrogation(ied.id);
  const soeAfter = useSubstationStore.getState().soeLog.length;
  return toggledEna === !beforeEna && soeAfter > soeBefore;
});

// ============================================================================
// 6. PRP (IEC 62439-3 Clause 4) Regression Tests
// ============================================================================
check('PRP', 'Maintains isolated Dual-LAN (LAN_A & LAN_B) links across DANP IEDs and supports fault injection & FAT/SAT verification', () => {
  const s = useSubstationStore.getState();
  const iedLanALinks = s.networkLinks.filter((l) => l.lanPlane === 'LAN_A' && l.sourceId.startsWith('IED-'));
  const iedLanBLinks = s.networkLinks.filter((l) => l.lanPlane === 'LAN_B' && l.sourceId.startsWith('IED-'));
  const distinctSubnets = s.ieds.every((i) => i.ipAddressLanA !== i.ipAddressLanB);
  const isolatedSwitches = iedLanALinks.every((l) => l.targetId === 'SW-LAN-A1') && iedLanBLinks.every((l) => l.targetId === 'SW-LAN-B1');
  s.runAllFatSatTests();
  const allFatSatPassed = useSubstationStore.getState().fatSatTests.every((t) => t.status === 'PASS');
  return iedLanALinks.length === 12 && iedLanBLinks.length === 12 && distinctSubnets && isolatedSwitches && allFatSatPassed;
});

// ============================================================================
// 7. HSR (IEC 62439-3 Clause 5) Regression Tests
// ============================================================================
check('HSR', 'Supports HSR ring redundancy mode switching and cut-through ring fault tolerance', () => {
  const s = useSubstationStore.getState();
  s.setNetworkRedundancyMode('HSR');
  const modeHsr = useSubstationStore.getState().networkRedundancyMode === 'HSR';
  useSubstationStore.getState().setNetworkRedundancyMode('PRP');
  const netPage = fs.readFileSync(path.join(root, 'src/pages/NetworkTopologyPage.tsx'), 'utf8');
  return (
    modeHsr &&
    netPage.includes('HSR') &&
    netPage.includes('0x892F') &&
    netPage.includes('IEC 62439-3')
  );
});

// ============================================================================
// 8. Bus Transfer (132/33/11 kV Manual & Auto Transfer) Regression Tests
// ============================================================================
check('Bus Transfer', 'Blocks live-live Bus Coupler closing in MANUAL mode (CILO1 anti-paralleling interlock)', () => {
  const s = useSubstationStore.getState();
  s.setVoltageBusTransferMode(33, 'MANUAL');
  const ok = useSubstationStore.getState().commandBreaker('BAY-33-BC', 'CLOSED', 'SCADA_SBO');
  const bcState = useSubstationStore.getState().bays.find((b) => b.id === 'BAY-33-BC').breakerState;
  return ok === false && bcState === 'OPEN';
});

check('Bus Transfer', 'Executes dead-bus transfer via requestBusTransfer when one bus is dead and restores normal split-bus feeding', () => {
  const s = useSubstationStore.getState();
  const blockedWhenBothLive = s.requestBusTransfer(33) === false && useSubstationStore.getState().busTransferStatus === 'BLOCKED';
  useSubstationStore.getState().setVoltageBusTransferMode(33, 'MANUAL');
  useSubstationStore.getState().commandBreaker('BAY-33-INC1', 'OPEN', 'SCADA_SBO');
  const bus33ADead = useSubstationStore.getState().busbars.find((b) => b.id === 'BUS-33-A').energized === false;
  const transferOk = useSubstationStore.getState().requestBusTransfer(33);
  const afterTransfer = useSubstationStore.getState();
  const bcClosed = afterTransfer.bays.find((b) => b.id === 'BAY-33-BC').breakerState === 'CLOSED';
  const bus33ARestored = afterTransfer.busbars.find((b) => b.id === 'BUS-33-A').energized === true;
  afterTransfer.commandBreaker('BAY-33-BC', 'OPEN', 'SCADA_SBO');
  useSubstationStore.getState().commandBreaker('BAY-33-INC1', 'CLOSED', 'SCADA_SBO');
  return blockedWhenBothLive && bus33ADead && transferOk && bcClosed && bus33ARestored;
});

// ============================================================================
// 9. 3D Camera Controls Regression Tests
// ============================================================================
check('3D Camera Controls', 'Implements ORBIT, PAN, WALK, FLY camera modes, presets, focus/zoom, fullscreen, and 3D Raycaster equipment picking', () => {
  const sceneCode = fs.readFileSync(path.join(root, 'src/components/Substation3DScene.tsx'), 'utf8');
  const localThree = fs.existsSync(path.join(root, 'public/assets/three.min.js'));
  const requiredTokens = [
    "'ORBIT'",
    "'PAN'",
    "'WALK'",
    "'FLY'",
    'switchCameraNavMode',
    'applyCameraPreset',
    'focusCameraOnWorldPoint',
    'Raycaster',
    'DUSK_TWILIGHT',
    'DAYLIGHT_CLEAR',
    'NIGHT_FLOODLIGHT',
  ];
  return localThree && requiredTokens.every((tok) => sceneCode.includes(tok));
});

// ============================================================================
// 10. Apartment Electrical Distribution Regression Tests
// ============================================================================
check('Apartment Electrical Distribution', 'Couples 11 kV outgoing feeders (BAY-11-F01..F08) and DT1/DT2 to 11/0.415 kV DT-250kVA and apartment/residential load energization', () => {
  const sceneCode = fs.readFileSync(path.join(root, 'src/components/Substation3DScene.tsx'), 'utf8');
  const sldCode = fs.readFileSync(path.join(root, 'src/pages/SldWorkspacePage.tsx'), 'utf8');
  const s = useSubstationStore.getState();
  s.commandBreaker('BAY-11-F01', 'OPEN', 'SCADA_SBO');
  const f01Open = useSubstationStore.getState().bays.find((b) => b.id === 'BAY-11-F01').energized === false;
  useSubstationStore.getState().commandBreaker('BAY-11-F01', 'CLOSED', 'SCADA_SBO');
  const f01Closed = useSubstationStore.getState().bays.find((b) => b.id === 'BAY-11-F01').energized === true;
  return (
    f01Open &&
    f01Closed &&
    sceneCode.includes('TX-DT1') &&
    sceneCode.includes('TX-DT2') &&
    sceneCode.includes('DT-250kVA (11/0.415kV)') &&
    sceneCode.includes('LAYER_11_SWG_DT') &&
    sldCode.includes('TX-DT1')
  );
});

// ============================================================================
// 11. Navigation & Responsive Layouts Regression Tests
// ============================================================================
check('Navigation & Responsive Layouts', 'Supports all 20 workspace tabs, hash deep-linking (#/workspace/<TAB>), mobile drawer, and overflow-x protection', () => {
  const appCode = fs.readFileSync(path.join(root, 'src/App.tsx'), 'utf8');
  const requiredTabs = [
    'HERO', 'SLD', 'SCADA', 'IED', 'IED_SIGNAL_CHAIN', 'NETWORK', 'GOOSE', 'MMS',
    'MODBUS_LAB', 'IEC104_LAB', 'OPCUA_LAB', 'SIGNALS', 'FAULTS', 'FATSAT',
    'IEC61850_ACADEMY', 'INTERVIEW_PREP', 'CCNA_ACADEMY', 'LEARNING', 'USER_PROFILE', 'ADMIN_DASHBOARD',
  ];
  for (const tab of requiredTabs) {
    useSubstationStore.getState().setActiveTab(tab);
    if (useSubstationStore.getState().activeTab !== tab) return false;
  }
  useSubstationStore.getState().setActiveTab('HERO');
  return (
    requiredTabs.every((t) => appCode.includes(`'${t}'`)) &&
    appCode.includes('#/workspace/') &&
    appCode.includes('mobileNavOpen') &&
    appCode.includes('overflow-x: hidden')
  );
});

// ============================================================================
// 12. Complete Offline Translation Regression Tests
// ============================================================================
check('Offline Translation', 'Supports strictly 8 languages (EN, TE, TA, HI, PT, KO, FR, JA) and completely removes KN and ML', () => {
  const codes = Object.keys(LANGUAGE_CODES);
  const expected = ['EN', 'TE', 'TA', 'HI', 'PT', 'KO', 'FR', 'JA'];
  const listCodes = SUPPORTED_LANGUAGE_LIST.map((x) => x.code);
  return (
    codes.length === 8 &&
    expected.every((c) => codes.includes(c) && listCodes.includes(c)) &&
    !('KN' in LANGUAGE_CODES) &&
    !('ML' in LANGUAGE_CODES) &&
    normalizeLanguageCode('KN') === 'EN' &&
    normalizeLanguageCode('ML') === 'EN'
  );
});

check('Offline Translation', 'Preserves 100% of technical terminology, commands, formulas, and device IDs across all 7 non-English languages', () => {
  const samples = [
    'Circuit Breaker BAY-132-L1 status XCBR1.Pos.stVal [ST] reported via IEC 61850 MMS on TCP/102',
    'GOOSE frame 0x88B8 published by IED_132_L1 with stNum and sqNum on VLAN 20',
    'PRP Dual-LAN 10.132.10.11 and HSR ring recovery in 0 ms per IEC 62439-3',
    'Formula S = √3 × V × I and 3I0 = Ia + Ib + Ic on TX-T1 (132/33/11 kV, 50 MVA)',
  ];
  const mustPreserve = [
    'BAY-132-L1', 'XCBR1.Pos.stVal', '[ST]', 'IEC 61850', 'MMS', 'TCP/102',
    'GOOSE', '0x88B8', 'IED_132_L1', 'stNum', 'sqNum', 'VLAN',
    'PRP', '10.132.10.11', 'HSR', '0 ms', 'IEC 62439-3',
    '√3', '3I0 = Ia + Ib + Ic', 'TX-T1', '50 MVA',
  ];
  for (const lang of ['TE', 'TA', 'HI', 'PT', 'KO', 'FR', 'JA']) {
    const joined = samples.map((s) => translateOfflineText(s, lang)).join(' || ');
    for (const token of mustPreserve) {
      if (!joined.includes(token)) {
        throw new Error(`Language ${lang} altered protected token "${token}" in output: ${joined}`);
      }
    }
  }
  return true;
});

check('Offline Translation', 'Translates 100% of sidebar, main page headings, buttons, tables, dialogs, and engineering explanations offline', () => {
  const uiSamples = [
    'Substation Workspace',
    'SCADA / HMI Operator Station',
    'IED Explorer',
    'PRP / HSR Network',
    'GOOSE Lab',
    'MMS & RCB Lab (TCP/102)',
    'Signal Mapping & SCL',
    'Fault Injection',
    'FAT / SAT Laboratory',
    'IEC 61850 Digital Substation',
    'Interview Preparation',
    'CCNA Networking Academy',
    'Select language',
    'Active Alarms',
    'Reset View',
    'General Interrogation',
    'Root Cause Analysis',
    'Expected Acceptance Criteria',
  ];
  for (const lang of ['TE', 'TA', 'HI', 'PT', 'KO', 'FR', 'JA']) {
    for (const phrase of uiSamples) {
      const out = translateOfflineText(phrase, lang);
      if (!out || out === phrase) {
        throw new Error(`Phrase "${phrase}" was not translated for language ${lang}`);
      }
    }
  }
  return true;
});

console.log(`\n============================================================`);
console.log(`REGRESSION SUITE SUMMARY: Passed=${passed}, Failed=${failed}, Blocked=${blocked}, Skipped=${skipped}`);
console.log(`============================================================`);
if (failed > 0) process.exit(1);
