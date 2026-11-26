import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronDown,
  ClipboardCheck,
  Download,
  Factory,
  FileText,
  HelpCircle,
  MapPin,
  Play,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  Trash2,
  Wrench,
  X,
  Zap,
} from 'lucide-react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { getBayProtocolBreakdown } from '../data/protocolRegistry';

type Step = { title: string; why: string; actions: string[]; evidence: string };
type Phase = { title: string; description: string; steps: Step[] };

type Practical = { example: string; tools: string; procedure: string; expected: string };
const practical: Practical[] = [
  {
    "example": "132/33 kV substation: two power transformers, 33 kV feeders, bus coupler, protection IEDs, station SCADA and RCC gateway.",
    "tools": "Approved SLD, architecture drawings, signal list, vendor manuals, document register.",
    "procedure": "Cross-check the bay count and equipment IDs on SLD against IED list; identify missing feeder or control-centre interface; log revision mismatches.",
    "expected": "Every in-scope bay, IED and interface is traceable to an approved drawing and test case."
  },
  {
    "example": "33 kV feeder breaker position originates at a bay IED and is required on both HMI and RCC.",
    "tools": "SCL viewer, PACiS SCE or project SCADA database tool, spreadsheet mapping register.",
    "procedure": "Locate XCBR.Pos.stVal, quality and timestamp; confirm DataSet/RCB; trace SCADA tag and IEC 104 IOA; verify status semantics and analog engineering units.",
    "expected": "One unique source and destination mapping exists per point, with documented quality, units and control semantics."
  },
  {
    "example": "Factory setup has two test IEDs, engineering laptop, managed switch and simulated breaker contacts.",
    "tools": "Vendor relay configuration tool, IEC 61850 browser, test switch, approved FAT checklist.",
    "procedure": "Record preconditions and test stimuli; isolate physical trip/close outputs; assign witness and evidence fields; perform a dry-run of the test plan.",
    "expected": "Every procedure states stimulus, expected indication, pass/fail criterion, safety condition and record location."
  },
  {
    "example": "An SCD revision is updated just before FAT; all devices must be checked against that revision.",
    "tools": "PACiS SCE, DIGSI, PCM600, EnerVista or device-specific engineering tools; version register.",
    "procedure": "Export/backup the approved IED and SCADA projects; compare firmware, CID/SCD revisions, IP and VLAN assignments; label the baseline.",
    "expected": "Restorable configuration backups and a consistent approved version baseline are available."
  },
  {
    "example": "33 kV bay control panel arrives with an IED, DC supply, terminal blocks and labelled contacts.",
    "tools": "Approved wiring diagram, multimeter used by authorized personnel, inspection checklist.",
    "procedure": "Inspect label/terminal correspondence; check wiring continuity with circuits safely isolated; energize via approved sequence; review relay self-diagnostics.",
    "expected": "No unresolved safety-critical wiring, power or self-diagnostic defects before functional FAT."
  },
  {
    "example": "Station SCADA server connects to feeder IEDs on station LAN; redundant LANs may be provided.",
    "tools": "Managed-switch diagnostics, ping, Wireshark, IEDScout, vendor communication logs.",
    "procedure": "Verify port link and VLAN; test MMS association on TCP 102; check configured IEC 104 connection separately; inspect PRP/HSR health if installed.",
    "expected": "Required sessions establish and recover; network redundancy works within approved acceptance limits."
  },
  {
    "example": "Feeder IED XCBR.Pos changes from Open to Closed using simulated contact inputs.",
    "tools": "IEDScout or IEC 61850 client, PACiS SCE/SCADA tag browser, Wireshark.",
    "procedure": "Confirm source stVal/q/t; trigger a safe simulated input; inspect RCB report and SCADA tag; repeat for both states and invalid quality.",
    "expected": "SCADA receives correct value and quality with acceptable update and timestamp behavior per project specification."
  },
  {
    "example": "Protection IED publishes an interlock permissive to a bay controller via GOOSE.",
    "tools": "Vendor IEC 61850 engineering tool, SCD viewer, Wireshark GOOSE filter.",
    "procedure": "Check GoCB/DataSet, APPID, VLAN and confRev; simulate publisher state; inspect stNum/sqNum; verify subscriber ExtRef and safe logic response.",
    "expected": "Subscriber receives intended data and supervision flags mismatched/lost communication; no unintended trip."
  },
  {
    "example": "33 kV feeder breaker Open/Closed, Local/Remote and current measurement appear on HMI.",
    "tools": "SCADA engineering tool, HMI runtime, approved analog/binary simulator.",
    "procedure": "Stimulate each source point; compare IED and HMI; test invalid quality and stale value display; check analog scaling and units.",
    "expected": "SLD symbols and analog values match the simulated source within project-approved tolerance."
  },
  {
    "example": "Transformer alarm and feeder trip are injected as two controlled events.",
    "tools": "SCADA alarm viewer, SOE export, IED event log, NTP/SNTP status tool.",
    "procedure": "Generate alarms in known sequence; inspect priorities and acknowledgement; compare source event time and HMI time; return alarms to normal.",
    "expected": "Alarm lifecycle, severity and SOE order match the approved alarm matrix and clock accuracy limits."
  },
  {
    "example": "Remote Close requested on a feeder while earthing switch permissive is not satisfied.",
    "tools": "HMI command dialog, IED control diagnostic logs, interlocking matrix, approved test simulator.",
    "procedure": "Verify control authority and Local/Remote; simulate unsafe condition and confirm rejection; restore safe approved conditions and test control feedback only in isolated setup.",
    "expected": "Unsafe Close is rejected; permitted command sequence gives correct confirmation and independent position feedback."
  },
  {
    "example": "Feeder position is forwarded from station gateway to RCC using IEC 104.",
    "tools": "Gateway engineering tool, IEC 104 test client, SCADA point list, network capture.",
    "procedure": "Confirm IOA/Type ID/COT mapping; perform approved GI; change source indication; compare gateway and RCC values; test authorized server/gateway recovery.",
    "expected": "RCC status, quality and timestamps agree with source; defined redundancy and recovery criteria are met."
  },
  {
    "example": "Three FAT defects remain: one wrong alarm priority, one analog scaling error, one missing HMI label.",
    "tools": "FAT punch-list spreadsheet, test evidence archive, configuration change log.",
    "procedure": "Assign defect IDs and severity; correct under revision control; retest each failed case plus dependent functions; obtain witness acceptance.",
    "expected": "All blocking defects closed or formally accepted as exceptions; signed FAT release is traceable."
  },
  {
    "example": "Installed panel at site differs from FAT network drawing: fibre patch port has changed.",
    "tools": "As-built wiring/network drawings, switch port diagnostics, SAT readiness checklist.",
    "procedure": "Confirm site permits; inspect installation and fibre routes; compare installed IP/VLAN/firmware and configurations with FAT baseline.",
    "expected": "Site installation and engineering revisions are approved and safe for energization/testing."
  },
  {
    "example": "Actual 33 kV feeder breaker auxiliary contacts must reach IED, SCADA and RCC.",
    "tools": "Field test sheets, approved secondary injection/contact test arrangement, IED browser, HMI, gateway logs.",
    "procedure": "Under authorized switching/test isolation, verify each field contact and analog source; follow value through IED→HMI→gateway→RCC.",
    "expected": "Every tested field point matches approved indication and engineering units end-to-end."
  },
  {
    "example": "Station operator tests remote control, while one PRP path is temporarily unavailable.",
    "tools": "Approved switching permit, interlock matrix, HMI logs, PRP diagnostics, time-sync monitoring.",
    "procedure": "Verify authority and safety boundaries; conduct supervised control checks; perform authorized single-path recovery and time-sync checks; restore normal topology.",
    "expected": "Control interlocks remain effective; communications recover without violating defined acceptance limits."
  },
  {
    "example": "SAT handover includes approved SCD, CID, SCADA backup, point list and punch-list closure.",
    "tools": "Document control system, FAT/SAT signed reports, engineering backup archive.",
    "procedure": "Resolve or formally accept defects; export final configuration; record versions; deliver operations training and handover checklist.",
    "expected": "Customer receives signed SAT results, as-built pack, recoverable backups and outstanding-issue register."
  },
  {
    "example": "After energization, a switch port intermittently flaps and causes a SCADA communication alarm.",
    "tools": "SNMP monitoring, switch logs, alarm/SOE history, controlled change register.",
    "procedure": "Trend port alarms; correlate events with communication loss; diagnose under maintenance authorization; update documentation and regression-test changes.",
    "expected": "Stabilization issues are logged, corrective actions verified and the final archive updated."
  }
];

const phases: Phase[] = [
  { title: 'Phase 1 — Engineering Preparation (Before FAT)', description: 'Factory testing start అయ్యే ముందు approved design, IED configuration, signal list and test plan ready చేస్తాం.', steps: [
    { title: '1. Project scope and approved documents review', why: 'ఏ equipment, signals, controls, interfaces test చేయాలో ముందుగా establish చేయాలి.', actions: ['Approved SLD, architecture, control philosophy, interlocking scheme, I/O list, alarm list, network diagram collect చేయండి.', 'IED list, relay model/firmware, SCADA/HMI, gateway, time server and switch details verify చేయండి.', 'FAT scope, exclusions, customer acceptance requirements and responsible engineers agree చేయండి.'], evidence: 'Approved document register, revision list, FAT scope and test matrix' },
    { title: '2. Prepare signal and protocol mapping', why: 'Source-to-destination mapping clear లేకపోతే test result reliable కాదు.', actions: ['Each status, analog, alarm, event and command కు unique tag and source reference identify చేయండి.', 'IEC 61850 LN/DO/DA, DataSet, RCB, GOOSE subscription and IEC 104/Modbus mappings check చేయండి.', 'Scaling, units, quality, timestamp, command type and alarm priority define చేయండి.'], evidence: 'Signed signal list, point mapping sheets and protocol interface matrix' },
    { title: '3. Prepare FAT procedure and safe test setup', why: 'Test ఎలా run చేయాలి, expected result ఏమిటి అన్నది beforehand documented ఉండాలి.', actions: ['Every test కు preconditions, input stimulus, expected result, pass/fail criteria, evidence fields prepare చేయండి.', 'Lab network, IED power supplies, isolated test contacts and simulation equipment arrange చేయండి.', 'No unintended trip/close: live outputs isolate చేసి approved test permissions confirm చేయండి.'], evidence: 'FAT procedure, test equipment list, safety checklist and test readiness approval' },
    { title: '4. Backup and baseline configuration', why: 'Testing లో change అయితే original state restore చేయగలగాలి.', actions: ['IED settings, SCL files, SCADA database, HMI project, gateway and switch configuration backup తీసుకోండి.', 'Firmware, IP addresses, VLANs, application versions and checksums/revisions record చేయండి.', 'Time synchronization source and network topology baseline verify చేయండి.'], evidence: 'Configuration backup index and baseline revision record' }
  ]},
  { title: 'Phase 2 — Factory Acceptance Testing (FAT)', description: 'Factory/lab environment లో engineered functions customer-approved test cases ప్రకారం verify చేస్తాం.', steps: [
    { title: '5. Visual, wiring and power-up checks', why: 'Basic hardware faults వల్ల subsequent tests fail కాకుండా చూడాలి.', actions: ['Panel labels, terminal drawings, power supply polarity, fuses and earthing inspect చేయండి.', 'Authorized lab power-up తరువాత IED healthy LEDs, diagnostics and self-test alarms check చేయండి.', 'Physical I/O simulation wiring against approved drawings verify చేయండి.'], evidence: 'Inspection checklist, punch list and equipment health screenshots' },
    { title: '6. Network and IED communication checks', why: 'Communication healthy ఉంటేనే SCADA and protection integration tests meaningful అవుతాయి.', actions: ['IP/subnet/VLAN, switch ports, fibre links and permitted management connectivity verify చేయండి.', 'IEC 61850 MMS association/TCP 102, IEC 104/TCP 2404 or other required protocol test చేయండి.', 'PRP/HSR topology, redundant paths and alarms approved test procedure ప్రకారం verify చేయండి.'], evidence: 'Connectivity logs, switch diagnostics and packet captures' },
    { title: '7. IED data model and MMS reporting test', why: 'IED లోని correct value SCADA కి quality/timestamp తో చేరాలి.', actions: ['IEC 61850 object references, DataSets and Report Control Blocks review చేయండి.', 'Approved simulated binary/analog changes generate చేసి reports verify చేయండి.', 'SCADA source value, quality, trigger and General Interrogation/report behavior compare చేయండి.'], evidence: 'IED browser snapshots, MMS captures and point-by-point report sheet' },
    { title: '8. GOOSE publisher/subscriber functional test', why: 'Fast IED-to-IED exchange correct mapping and logic తో పని చేయాలి.', actions: ['Publisher DataSet, GoCB, APPID, VLAN, confRev and subscriber ExtRef verify చేయండి.', 'Isolated test stimulus ఇచ్చి GOOSE state change and subscriber input verify చేయండి.', 'Communication loss/invalid quality response test చేయండి; actual trip outputs safe isolation లో ఉండాలి.'], evidence: 'GOOSE capture, subscription diagnostics and signed test results' },
    { title: '9. SCADA status, analog and HMI tests', why: 'Operator display physical/source condition ని accurately represent చేయాలి.', actions: ['Breaker Open/Closed, isolator, earth switch, Local/Remote status simulate చేసి HMI verify చేయండి.', 'Analog values, engineering units, CT/PT ratios, scaling and limits check చేయండి.', 'Single-line diagram colours, indication quality, stale data and invalid status handling verify చేయండి.'], evidence: 'Signal checklist, screenshots and analog injection records' },
    { title: '10. Alarm, event and SOE tests', why: 'Fault indication and sequence of events correct order లో record కావాలి.', actions: ['Alarm priority, annunciation, ACK behavior and alarm return-to-normal verify చేయండి.', 'IED and SCADA time source, time quality, event timestamp and time-zone display compare చేయండి.', 'Multiple controlled events generate చేసి SOE order and exported logs verify చేయండి.'], evidence: 'Alarm matrix, SOE log and time synchronization test sheet' },
    { title: '11. Remote control and interlocking tests', why: 'Commands authorized conditions లో మాత్రమే operate కావాలి.', actions: ['Approved isolated setup లో Local/Remote, authority, Select-Before-Operate/Direct Operate behavior verify చేయండి.', 'Breaker close/open feedback and positive/negative command confirmations test చేయండి.', 'Interlocks, synchrocheck and permissive failures safe test simulation ద్వారా verify చేయండి; bypass చేయవద్దు.'], evidence: 'Control test sheets, interlock matrix and rejection/feedback logs' },
    { title: '12. Gateway, RCC and redundancy integration', why: 'Station-level data remote control centre కి correct addresses and quality తో చేరాలి.', actions: ['IEC 61850 to IEC 104 or required protocol mapping, IOA, Type ID, COT and quality verify చేయండి.', 'Approved gateway failover/server redundancy test చేసి continuity and alarm behavior observe చేయండి.', 'Recovery, restart and re-subscription behavior verify చేసి final regression tests run చేయండి.'], evidence: 'Gateway mapping report, failover logs and regression checklist' },
    { title: '13. FAT defect closure and factory sign-off', why: 'Open defects documented లేకుండా factory acceptance complete అని చెప్పకూడదు.', actions: ['Every failure కు defect ID, severity, root cause, owner and corrective action log చేయండి.', 'Approved changes తరువాత affected test and related regression tests repeat చేయండి.', 'Customer witness results, exceptions, as-built revisions and FAT sign-off record చేయండి.'], evidence: 'FAT report, signed test sheets, punch list and release-for-shipment record' }
  ]},
  { title: 'Phase 3 — Site Acceptance Testing (SAT)', description: 'Site లో installed equipment, actual field wiring, communications and operational interfaces verify చేస్తాం.', steps: [
    { title: '14. Site readiness and installation inspection', why: 'Factory pass అయిన system site wiring/environment వల్ల fail కావచ్చు.', actions: ['Permits, switching restrictions, approved method statements and isolation boundaries confirm చేయండి.', 'Panel installation, terminal wiring, fibre patching, network links, labels and earthing check చేయండి.', 'Site hardware and software revisions FAT-approved baseline తో compare చేయండి.'], evidence: 'SAT readiness checklist, installation inspection and configuration comparison' },
    { title: '15. Field I/O and end-to-end indication checks', why: 'Actual contacts నుంచి HMI/RCC వరకు signal chain correct గా ఉందో prove చేయాలి.', actions: ['Authorized field test points నుంచి breaker/isolator status and alarms verify చేయండి.', 'IED, SCADA, HMI and gateway/RCC indication ను same event కి compare చేయండి.', 'Analog transducer/measurement scaling, phase identification and time stamps validate చేయండి.'], evidence: 'Point-to-point field checklist, end-to-end evidence and deviations' },
    { title: '16. Site control, interlocks and communications recovery', why: 'Operational safety and resilience site conditions లో verify చేయాలి.', actions: ['Approved commissioning procedure ప్రకారం remote control and Local/Remote tests perform చేయండి.', 'Interlocks, protection interface and breaker feedback verify చేయండి; unsafe operation చేయవద్దు.', 'Authorized PRP/HSR, server/gateway failover, loss/recovery and SOE tests execute చేయండి.'], evidence: 'Witnessed SAT control sheets, network logs and approved recovery records' },
    { title: '17. SAT punch-list closure and handover', why: 'Operational team కి validated configuration, documentation and known limitations handover కావాలి.', actions: ['All test results and outstanding deviations classify చేసి corrective action/retest record చేయండి.', 'Final as-built SLD, SCD/CID, signal list, IP plan, backups, licenses and manuals handover చేయండి.', 'Customer/operator training, maintenance procedures and acceptance signatures complete చేయండి.'], evidence: 'SAT report, punch-list closure, as-built document pack and handover certificate' }
  ]},
  { title: 'Phase 4 — After Acceptance', description: 'Commissioning ముగిసిన తరువాత కూడా controlled support and change management అవసరం.', steps: [
    { title: '18. Stabilization, support and future changes', why: 'Operational reliability maintain చేయడానికి follow-up monitoring and documentation అవసరం.', actions: ['Initial operation period లో communications, alarms, SOE and redundancy health monitor చేయండి.', 'Any new engineering change కు authorization, backup, impact review and regression test follow చేయండి.', 'Lessons learned, final backups and maintenance recommendations archive చేయండి.'], evidence: 'Stabilization log, change register and final engineering archive' }
  ]}
];


type CommissioningMode = 'FAT' | 'SAT';
type WorkbenchTab = 'P2P' | 'TESTS' | 'PUNCH' | 'REPORT' | 'SOP';
type PunchCategory = 'CAT_A' | 'CAT_B' | 'CAT_C';

interface P2pCheckResult {
  key: string;
  label: string;
  signalRef: string;
  ioaOrMap: string;
  status: 'NOT_TESTED' | 'PASS' | 'FAIL';
  observedValue: string;
  timestamp: string;
  note: string;
}

interface LiveAutoTestResult {
  id: string;
  code: string;
  title: string;
  standardRef: string;
  modeScope: 'BOTH' | 'FAT' | 'SAT';
  category: string;
  description: string;
  status: 'NOT_RUN' | 'PASS' | 'FAIL';
  actualEvidence: string;
  timestamp: string;
}

interface PunchItem {
  id: string;
  category: PunchCategory;
  mode: CommissioningMode;
  bayOrIed: string;
  description: string;
  linkedTestId?: string;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  closedAt?: string;
}

const INITIAL_LIVE_AUTO_TESTS: LiveAutoTestResult[] = [
  {
    id: 'AUTO-CILO-01',
    code: 'TC-CILO-01',
    title: 'Interlocking (CILO): Earth Switch Q8 Closed Blocks CB Close',
    standardRef: 'IEC 61850-7-4 (CILO1) / Site Safety Matrix',
    modeScope: 'BOTH',
    category: 'Interlocking',
    description: 'Opens CB, closes Earth Switch (Q8), attempts SCADA SBO CB Close, and verifies CILO rejects the unsafe close command.',
    status: 'NOT_RUN',
    actualEvidence: 'Click "Run Live Test" to execute on selected bay.',
    timestamp: '—',
  },
  {
    id: 'AUTO-PROT-86',
    code: 'TC-PROT-86',
    title: 'Protection Trip (50/51) → CB Open + 86 Lockout + Alarm + 1ms SOE',
    standardRef: 'IEC 61850-7-4 (PTRC1 / PTOC1) / ISA-18.2',
    modeScope: 'BOTH',
    category: 'Protection & SOE',
    description: 'Injects simulated 50/51 trip on selected bay, verifies breaker opens, 86 trip indication latches, Critical alarm raises, and SOE logs event.',
    status: 'NOT_RUN',
    actualEvidence: 'Click "Run Live Test" to inject & verify trip chain.',
    timestamp: '—',
  },
  {
    id: 'AUTO-SBO-01',
    code: 'TC-SBO-01',
    title: 'SCADA SBO Control (CSWI1) & Independent Position Feedback (XCBR1)',
    standardRef: 'IEC 61850-7-2 (SBOw) / IEC 60870-5-104 (C_DC_NA_1)',
    modeScope: 'BOTH',
    category: 'Control & Feedback',
    description: 'Ensures REMOTE mode & healthy interlocks, toggles CB via SCADA SBO, and verifies XCBR1 position feedback + SOE confirmation.',
    status: 'NOT_RUN',
    actualEvidence: 'Click "Run Live Test" to verify SBO control cycle.',
    timestamp: '—',
  },
  {
    id: 'AUTO-43LR-01',
    code: 'TC-43LR-01',
    title: 'Control Authority (43LR LOCAL Mode Blocks Remote SCADA Command)',
    standardRef: 'IEC 61850-7-4 (LLN0.Loc) / Switching Hierarchy',
    modeScope: 'SAT',
    category: 'Authority',
    description: 'Switches bay 43LR selector to LOCAL, sends a remote SCADA SBO command, confirms rejection, and restores REMOTE mode.',
    status: 'NOT_RUN',
    actualEvidence: 'Click "Run Live Test" to verify 43LR local blocking.',
    timestamp: '—',
  },
  {
    id: 'AUTO-MMS-GI',
    code: 'TC-MMS-GI',
    title: 'IEC 61850 MMS General Interrogation (GI) & BRCB Report Health',
    standardRef: 'IEC 61850-8-1 (MMS TCP/102 / BRCB)',
    modeScope: 'BOTH',
    category: 'MMS & SCADA',
    description: 'Triggers MMS General Interrogation on selected bay IED and verifies IED commHealthy, GOOD quality, and active BRCB reporting.',
    status: 'NOT_RUN',
    actualEvidence: 'Click "Run Live Test" to run MMS GI check.',
    timestamp: '—',
  },
  {
    id: 'AUTO-GOOSE-01',
    code: 'TC-GOOSE-01',
    title: 'GOOSE Multicast Burst (0x88B8) & stNum/sqNum Supervision',
    standardRef: 'IEC 61850-8-1 (GOOSE VLAN / APPID)',
    modeScope: 'FAT',
    category: 'GOOSE',
    description: 'Publishes a GOOSE state-change burst on primary GoCB and verifies stNum increment with zero mismatch faults.',
    status: 'NOT_RUN',
    actualEvidence: 'Click "Run Live Test" to verify GOOSE publisher burst.',
    timestamp: '—',
  },
  {
    id: 'AUTO-RED-01',
    code: 'TC-RED-01',
    title: 'Station Bus Redundancy (PRP / HSR) & Time Sync Quality Audit',
    standardRef: 'IEC 62439-3 (PRP/HSR) / IEEE 1588 PTP',
    modeScope: 'SAT',
    category: 'Network & Sync',
    description: 'Audits active redundancy mode, healthy station links, IED online ratio, and confirms no unresolved network/time-sync faults.',
    status: 'NOT_RUN',
    actualEvidence: 'Click "Run Live Test" to audit redundancy & sync health.',
    timestamp: '—',
  },
];

function formatClock(): string {
  return new Date().toLocaleTimeString();
}

function escapeHtml(val: unknown): string {
  return String(val ?? '').replace(/[&<>"']/g, (ch) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch)
  );
}

function toPdfSafeText(input: unknown): string {
  return String(input ?? '')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u00b7/g, '|')
    .replace(/\u00b0/g, ' deg')
    .replace(/\u2265/g, '>=')
    .replace(/\u2264/g, '<=')
    .replace(/\u00d7/g, 'x')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function wrapPdfLines(text: string, maxChars: number): string[] {
  const clean = String(text ?? '')
    .replace(/\u2014|\u2013/g, '-')
    .replace(/\u2192/g, '->')
    .replace(/\u00b7/g, '|')
    .replace(/\u00b0/g, ' deg')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!clean) return ['-'];
  const words = clean.split(' ');
  const out: string[] = [];
  let cur = '';
  for (const w of words) {
    if (!cur) {
      cur = w;
    } else if (cur.length + 1 + w.length <= maxChars) {
      cur += ' ' + w;
    } else {
      out.push(cur);
      cur = w;
    }
  }
  if (cur) out.push(cur);
  return out;
}

interface PdfSectionInput {
  title: string;
  headers: string[];
  colWidths: number[];
  rows: string[][];
}

function buildDirectPdfBlob(params: {
  title: string;
  subtitle: string;
  metaLines: string[];
  kpis: { label: string; value: string }[];
  verdict: string;
  sections: PdfSectionInput[];
  signatures: string[];
}): Blob {
  const PAGE_W = 595.28;
  const PAGE_H = 841.89;
  const MARGIN = 36;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const BOTTOM_Y = 48;

  const pages: string[][] = [];
  let cmds: string[] = [];
  let y = PAGE_H - MARGIN;

  const startNewPage = () => {
    cmds = [];
    pages.push(cmds);
    y = PAGE_H - MARGIN;
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < BOTTOM_Y) {
      startNewPage();
    }
  };

  const drawText = (
    text: string,
    x: number,
    yPos: number,
    size: number,
    bold = false,
    rgb: [number, number, number] = [0.1, 0.16, 0.23]
  ) => {
    cmds.push(
      `BT ${rgb[0].toFixed(3)} ${rgb[1].toFixed(3)} ${rgb[2].toFixed(3)} rg /${bold ? 'F2' : 'F1'} ${size} Tf ${x.toFixed(2)} ${yPos.toFixed(2)} Td (${toPdfSafeText(text)}) Tj ET`
    );
  };

  const drawRect = (
    x: number,
    yBottom: number,
    w: number,
    h: number,
    fillRgb?: [number, number, number],
    strokeRgb?: [number, number, number]
  ) => {
    cmds.push('q');
    if (fillRgb) cmds.push(`${fillRgb[0].toFixed(3)} ${fillRgb[1].toFixed(3)} ${fillRgb[2].toFixed(3)} rg`);
    if (strokeRgb) cmds.push(`${strokeRgb[0].toFixed(3)} ${strokeRgb[1].toFixed(3)} ${strokeRgb[2].toFixed(3)} RG 0.6 w`);
    cmds.push(`${x.toFixed(2)} ${yBottom.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re ${fillRgb && strokeRgb ? 'B' : fillRgb ? 'f' : 'S'}`);
    cmds.push('Q');
  };

  startNewPage();

  // Header Banner
  const headerH = 62;
  drawRect(MARGIN, y - headerH, CONTENT_W, headerH, [0.03, 0.16, 0.29]);
  drawText(params.title, MARGIN + 12, y - 22, 13.5, true, [1, 1, 1]);
  drawText(params.subtitle, MARGIN + 12, y - 37, 9, false, [0.72, 0.9, 0.98]);
  drawText(params.metaLines.join('   |   '), MARGIN + 12, y - 51, 8, false, [0.85, 0.94, 1]);
  y -= headerH + 12;

  // KPI Boxes
  const kpiGap = 8;
  const kpiW = (CONTENT_W - kpiGap * (params.kpis.length - 1)) / params.kpis.length;
  const kpiH = 38;
  params.kpis.forEach((k, idx) => {
    const kx = MARGIN + idx * (kpiW + kpiGap);
    drawRect(kx, y - kpiH, kpiW, kpiH, [0.93, 0.96, 0.99], [0.76, 0.85, 0.91]);
    drawText(k.value, kx + 8, y - 17, 11.5, true, [0.04, 0.2, 0.34]);
    drawText(k.label, kx + 8, y - 30, 7.8, false, [0.3, 0.42, 0.52]);
  });
  y -= kpiH + 10;

  // Verdict Banner
  const verdictLines = wrapPdfLines(params.verdict, 95);
  const verdictH = 14 + verdictLines.length * 11;
  drawRect(MARGIN, y - verdictH, CONTENT_W, verdictH, [0.92, 0.96, 0.98], [0.0, 0.47, 0.66]);
  verdictLines.forEach((vl, i) => {
    drawText(vl, MARGIN + 10, y - 14 - i * 11, 8.5, true, [0.04, 0.2, 0.34]);
  });
  y -= verdictH + 14;

  // Sections & Tables
  for (const sec of params.sections) {
    ensureSpace(48);
    drawText(sec.title, MARGIN, y - 10, 10.5, true, [0.04, 0.2, 0.34]);
    y -= 16;

    const totalWeight = sec.colWidths.reduce((a, b) => a + b, 0);
    const pxWidths = sec.colWidths.map((w) => (w / totalWeight) * CONTENT_W);

    const drawTableHeader = () => {
      const hh = 17;
      drawRect(MARGIN, y - hh, CONTENT_W, hh, [0.05, 0.21, 0.34]);
      let cx = MARGIN;
      sec.headers.forEach((h, i) => {
        drawText(h, cx + 4, y - 12, 7.8, true, [1, 1, 1]);
        cx += pxWidths[i];
      });
      y -= hh;
    };

    drawTableHeader();

    const rowsToRender = sec.rows.length ? sec.rows : [['No records executed yet in this session.']];
    rowsToRender.forEach((row, rIdx) => {
      const wrappedCols =
        row.length === 1 && sec.headers.length > 1
          ? [wrapPdfLines(row[0], 96)]
          : row.map((cell, cIdx) => {
              const maxCh = Math.max(8, Math.floor((pxWidths[cIdx] - 8) / 4.3));
              return wrapPdfLines(cell, maxCh);
            });
      const maxLines = Math.max(1, ...wrappedCols.map((c) => c.length));
      const rowH = Math.max(15, maxLines * 9.5 + 6);

      if (y - rowH < BOTTOM_Y) {
        startNewPage();
        drawTableHeader();
      }

      const bg: [number, number, number] = rIdx % 2 === 1 ? [0.96, 0.98, 0.99] : [1, 1, 1];
      drawRect(MARGIN, y - rowH, CONTENT_W, rowH, bg, [0.82, 0.88, 0.92]);

      if (row.length === 1 && sec.headers.length > 1) {
        wrappedCols[0].forEach((ln, li) => {
          drawText(ln, MARGIN + 5, y - 11 - li * 9.5, 7.6, false, [0.35, 0.45, 0.55]);
        });
      } else {
        let cx = MARGIN;
        wrappedCols.forEach((linesArr, cIdx) => {
          const rawUpper = String(row[cIdx] ?? '').toUpperCase();
          const isPass = rawUpper === 'PASS' || rawUpper === 'CLOSED';
          const isFail = rawUpper === 'FAIL' || rawUpper === 'OPEN';
          const colRgb: [number, number, number] = isPass
            ? [0.02, 0.48, 0.24]
            : isFail
            ? [0.76, 0.11, 0.17]
            : [0.12, 0.18, 0.25];
          linesArr.forEach((ln, li) => {
            drawText(ln, cx + 4, y - 10.5 - li * 9.5, 7.5, isPass || isFail, colRgb);
          });
          cx += pxWidths[cIdx];
        });
      }
      y -= rowH;
    });

    y -= 12;
  }

  // Witness Signatures Block
  ensureSpace(64);
  y -= 8;
  const sigGap = 16;
  const sigW = (CONTENT_W - sigGap * (params.signatures.length - 1)) / params.signatures.length;
  params.signatures.forEach((sig, i) => {
    const sx = MARGIN + i * (sigW + sigGap);
    drawRect(sx, y - 42, sigW, 0.8, [0.35, 0.45, 0.55]);
    drawText(sig, sx, y - 53, 8, true, [0.1, 0.18, 0.26]);
    drawText('Signature & Date: _______________', sx, y - 64, 7.5, false, [0.35, 0.45, 0.55]);
  });

  // Add Page Footers
  const totalPages = pages.length;
  pages.forEach((pageCmds, idx) => {
    pageCmds.push(
      `BT 0.40 0.48 0.56 rg /F1 7.5 Tf ${MARGIN.toFixed(2)} 24.00 Td (${toPdfSafeText(`SAS Engineering Hub - Commissioning Evidence Report (Simulation Only)   |   Page ${idx + 1} of ${totalPages}`)}) Tj ET`
    );
  });

  // Assemble PDF Binary Objects
  const objects: string[] = [];
  // Obj 1: Catalog, Obj 2: Pages, Obj 3: Helvetica, Obj 4: Helvetica-Bold
  const pageObjIds: number[] = [];
  const contentObjIds: number[] = [];
  let nextObjId = 5;
  for (let i = 0; i < totalPages; i++) {
    pageObjIds.push(nextObjId++);
    contentObjIds.push(nextObjId++);
  }

  objects[1] = '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n';
  objects[2] = `2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>\nendobj\n`;
  objects[3] = '3 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n';
  objects[4] = '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n';

  for (let i = 0; i < totalPages; i++) {
    const stream = pages[i].join('\n');
    const streamBytes = new TextEncoder().encode(stream).length;
    const pId = pageObjIds[i];
    const cId = contentObjIds[i];
    objects[pId] = `${pId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${cId} 0 R >>\nendobj\n`;
    objects[cId] = `${cId} 0 obj\n<< /Length ${streamBytes} >>\nstream\n${stream}\nendstream\nendobj\n`;
  }

  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let byteOffset = 0;

  const pushStr = (s: string) => {
    const b = encoder.encode(s);
    chunks.push(b);
    byteOffset += b.length;
  };

  pushStr('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
  for (let id = 1; id < objects.length; id++) {
    offsets[id] = byteOffset;
    pushStr(objects[id]);
  }

  const xrefOffset = byteOffset;
  pushStr(`xref\n0 ${objects.length}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id < objects.length; id++) {
    pushStr(`${String(offsets[id]).padStart(10, '0')} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  return new Blob(chunks, { type: 'application/pdf' });
}



interface TestHowToGuide {
  id: string;
  code: string;
  title: string;
  preconditions: string[];
  steps: string[];
  passCriteria: string;
  faultCheckTip: string;
}

const WORKBENCH_HOW_TO_STEPS = [
  {
    step: 1,
    title: 'Select FAT or SAT Mode & Bay Under Test',
    detail:
      'Top right lo FAT (Factory) leda SAT (Site) toggle cheyandi. Tarvatha Point-to-Point (P2P) Console lo mee test cheyalsina Bay (e.g., 132-L1, 132-T1, 33-F03) select cheyandi.',
  },
  {
    step: 2,
    title: 'Verify 5-Stage End-to-End Signal Chain',
    detail:
      'Bay select cheyagane Field Switchgear → Bay IED (MMS TCP/102) → Station Bus (PRP/HSR) → Gateway (IEC-104 COA 132) → SCADA & 1ms SOE anni HEALTHY ga unnaya leda check cheyandi.',
  },
  {
    step: 3,
    title: 'Run Point-to-Point (P2P) Signal Checks',
    detail:
      'P2P table lo prathi row (CB 52a/52b, Q1, Q8, 86 Trip, SBO Control, Analog GI, OLTC Tap) pakkana unna "Operate & Verify" / "Inject Trip" / "Verify GI" button click chesi live PASS/FAIL verify cheyandi.',
  },
  {
    step: 4,
    title: 'Execute Auto-Verified Live Test Runner',
    detail:
      'Live Test Runner tab lo okkokka test card lo "Run Live Test" leda paina "Execute Full Test Suite" click cheyandi. Kindha unna Live 1ms SOE table lo exact millisecond events confirm cheyandi.',
  },
  {
    step: 5,
    title: 'Inject Live Faults & Log Punch Points',
    detail:
      'P2P tab kindha unna Fault Injection cards (e.g., IED Offline, IEC-104 Fault, 43LR LOCAL) ON chesi malli test run cheyandi — FAIL avvagane "+ Punch" click chesi Cat-A defect log cheyandi. Fault OFF chesi "Re-Test & Close" tho punch point close cheyandi.',
  },
  {
    step: 6,
    title: 'Witness Sign-Off & Export Official Report',
    detail:
      'Cat-A blockers 0 ayyaka Punch List tab lo Commissioning Engineer & Witness names enter chesi, Evidence Report tab lo Official PDF print leda CSV package download chesukondi.',
  },
];

const TEST_PROCEDURES: Record<string, TestHowToGuide> = {
  'AUTO-CILO-01': {
    id: 'AUTO-CILO-01',
    code: 'TC-CILO-01',
    title: 'Interlocking (CILO): Earth Switch Q8 Closed Blocks CB Close',
    preconditions: [
      'Bay 43LR switch REMOTE mode lo undali.',
      'Bay IED communication ONLINE & Quality GOOD ga undali.',
    ],
    steps: [
      'Circuit Breaker (CB) ni OPEN cheyandi.',
      'Bus Disconnector (Q1) ni OPEN chesi Earth Switch (Q8) ni CLOSE cheyandi.',
      'Q8 CLOSED unnapude SCADA SBO dwara CB CLOSE command pampandi.',
      'CILO interlock command ni reject chesthundo ledo verify cheyandi, tarvatha Q8 OPEN & Q1 CLOSED ki restore cheyandi.',
    ],
    passCriteria: 'Q8 closed condition lo SCADA CB CLOSE command strictly REJECT avvali; unsafe close jaragakudadu.',
    faultCheckTip: 'Test fail aithe Bay 43LR mode leda active IED comm fault undemo check cheyandi.',
  },
  'AUTO-PROT-86': {
    id: 'AUTO-PROT-86',
    code: 'TC-PROT-86',
    title: 'Protection Trip (50/51) → CB Open + 86 Lockout + Alarm + 1ms SOE',
    preconditions: [
      'Selected bay energized leda CB CLOSED condition lo undali.',
      'SCADA Alarm & 1ms SOE recorder active ga undali.',
    ],
    steps: [
      'Simulated 50/51 Phase Overcurrent protection trip inject cheyandi.',
      'Circuit Breaker ventane OPEN ayyinda & 86 Master Trip Lockout latch ayyinda check cheyandi.',
      'Unacknowledged Critical Alarm raise ayyinda mariyu Live 1ms SOE table lo trip record padinda verify cheyandi.',
      'Verify ayyaka P2P tab lo "Reset 86 / Ack Alarms" click chesi normal state ki restore cheyandi.',
    ],
    passCriteria: 'CB = OPEN, 86 Trip = ACTIVE, Active Alarm raised, mariyu SOE lo millisecond timestamp record ravali.',
    faultCheckTip: 'Trip tarvatha CB malli close cheyalante mundu 86 Lockout reset cheyali.',
  },
  'AUTO-SBO-01': {
    id: 'AUTO-SBO-01',
    code: 'TC-SBO-01',
    title: 'SCADA SBO Control (CSWI1) & Independent Position Feedback (XCBR1)',
    preconditions: [
      'Bay 43LR = REMOTE, Earth Switch Q8 = OPEN, Bus DS Q1 = CLOSED.',
      '86 Protection Lockout active lo undakudadu.',
    ],
    steps: [
      'Select-Before-Operate (SBOw) command (OPEN or CLOSE) send cheyandi.',
      'CSWI1 control confirmation & XCBR1.Pos.stVal actual feedback change verify cheyandi.',
      'Data Quality GOOD ga unda mariyu SOE lo OPERATOR_CMD record padinda check cheyandi.',
    ],
    passCriteria: 'Breaker position target state ki change ayyi Quality = GOOD tho SCADA/SOE lo confirm avvali.',
    faultCheckTip: 'SBO fail aithe active faults (IED offline / TCS / DC supply) clear chesi malli run cheyandi.',
  },
  'AUTO-43LR-01': {
    id: 'AUTO-43LR-01',
    code: 'TC-43LR-01',
    title: 'Control Authority (43LR LOCAL Mode Blocks Remote SCADA Command)',
    preconditions: [
      'Bay IED online undali.',
    ],
    steps: [
      'Bay 43LR selector switch ni LOCAL mode ki marchandi.',
      'SCADA HMI nunchi remote SBO CB command send cheyandi.',
      'Command "Blocked-by-switching-hierarchy" tho reject ayyinda verify cheyandi.',
      'Test complete ayyaka 43LR ni malli REMOTE mode ki restore cheyandi.',
    ],
    passCriteria: '43LR LOCAL lo unnappudu remote SCADA command execute avvakunda reject avvali.',
    faultCheckTip: 'Real site SAT lo local panel control matrame work avvali, remote SCADA blocked undali.',
  },
  'AUTO-MMS-GI': {
    id: 'AUTO-MMS-GI',
    code: 'TC-MMS-GI',
    title: 'IEC 61850 MMS General Interrogation (GI) & BRCB Report Health',
    preconditions: [
      'Station Bus switch & IED TCP/102 MMS association UP lo undali.',
    ],
    steps: [
      'Selected bay IED meeda MMS General Interrogation (GI) trigger cheyandi.',
      'IED commHealthy = true mariyu Bay Quality = GOOD unnaya check cheyandi.',
      'Buffered Report Control Block (BRCB) snapshot update ayyinda verify cheyandi.',
    ],
    passCriteria: 'MMS TCP/102 ONLINE & Bay Quality = GOOD undali.',
    faultCheckTip: 'P2P tab lo MMS/IED Offline fault toggle ON chesthe ee test FAIL avthundi — fault OFF chesi re-test cheyandi.',
  },
  'AUTO-GOOSE-01': {
    id: 'AUTO-GOOSE-01',
    code: 'TC-GOOSE-01',
    title: 'GOOSE Multicast Burst (0x88B8) & stNum/sqNum Supervision',
    preconditions: [
      'GOOSE Control Block (GoCB) configured with matching APPID, VLAN, confRev.',
    ],
    steps: [
      'Primary GoCB meeda GOOSE state-change burst publish cheyandi.',
      'stNum increment ayyinda mariyu sqNum reset/retransmit healthy ga unda check cheyandi.',
      'Subscriber side lo mismatchFault = NONE unnada verify cheyandi.',
    ],
    passCriteria: 'stNum increment avvali mariyu GOOSE mismatch fault NONE undali.',
    faultCheckTip: 'GOOSE Lab lo confRev/APPID mismatch inject chesthe ee test FAIL chupisthundi.',
  },
  'AUTO-RED-01': {
    id: 'AUTO-RED-01',
    code: 'TC-RED-01',
    title: 'Station Bus Redundancy (PRP / HSR) & Time Sync Quality Audit',
    preconditions: [
      'All Station Bus switches, redundant LAN A/B paths, and PTP/SNTP clock healthy.',
    ],
    steps: [
      'Active redundancy mode (PRP / HSR / RSTP) mariyu healthy network links count audit cheyandi.',
      'Anni IEDs ONLINE unnaya leda check cheyandi.',
      'Network & Sync category lo active faults 0 unnaya verify cheyandi.',
    ],
    passCriteria: '100% IEDs ONLINE, anni station links UP, mariyu zero Network/Time-Sync faults.',
    faultCheckTip: 'Network/Time-Sync fault ON chesi fail test cheyochu, tarvatha clear chesi Re-Test & Close cheyandi.',
  },
};

export const FatSatLabPage: React.FC = () => {
  const {
    bays,
    transformers,
    ieds,
    networkLinks,
    gooseControlBlocks,
    alarms,
    soeLog,
    faultScenarios,
    fatSatTests,
    networkRedundancyMode,
    selectedBayId,
    setSelectedBayId,
    commandBreaker,
    commandDisconnector,
    setBayLocalRemote,
    triggerProtectionTrip,
    resetProtectionTrip,
    resetRecloseDemo86,
    stepTransformerOltc,
    triggerGooseStateChangeBurst,
    triggerMmsGeneralInterrogation,
    toggleFaultScenario,
    runFatSatTest,
    runAllFatSatTests,
    acknowledgeAllAlarms,
  } = useSubstationStore();

  const [mode, setMode] = useState<CommissioningMode>('SAT');
  const [activeTab, setActiveTab] = useState<WorkbenchTab>('P2P');
  const [testerName, setTesterName] = useState<string>('D. Nagendra Babu (SAS Commissioning Eng.)');
  const [witnessName, setWitnessName] = useState<string>('Utility Witness / Consultant');
  const [projectRef, setProjectRef] = useState<string>('132/33/11 kV Digital Substation SAS');

  // Selected Bay for P2P & Live Auto Tests
  const activeBay = useMemo(
    () => bays.find((b) => b.id === selectedBayId) || bays[0],
    [bays, selectedBayId]
  );
  const activeBayIdx = useMemo(
    () => Math.max(0, bays.findIndex((b) => b.id === activeBay?.id)),
    [bays, activeBay]
  );
  const activeIed = useMemo(
    () => ieds.find((i) => i.id === activeBay?.iedId),
    [ieds, activeBay]
  );
  const activeTx = useMemo(
    () =>
      transformers.find(
        (t) =>
          t.hvBayId === activeBay?.id ||
          t.lvBayId === activeBay?.id ||
          t.id === activeBay?.connectedTransformerId
      ),
    [transformers, activeBay]
  );
  const proto = useMemo(
    () => (activeBay ? getBayProtocolBreakdown(activeBay, activeBayIdx) : null),
    [activeBay, activeBayIdx]
  );

  // P2P Results keyed by `${bayId}:${pointKey}`
  const [p2pResults, setP2pResults] = useState<Record<string, P2pCheckResult>>({});
  // Interactive Auto-Verified Tests
  const [autoTests, setAutoTests] = useState<LiveAutoTestResult[]>(INITIAL_LIVE_AUTO_TESTS);
  // Real-time Punch List
  const [punchList, setPunchList] = useState<PunchItem[]>([]);
  const [newPunchCat, setNewPunchCat] = useState<PunchCategory>('CAT_B');
  const [newPunchDesc, setNewPunchDesc] = useState<string>('');
  const [lastActionBanner, setLastActionBanner] = useState<{
    type: 'PASS' | 'FAIL' | 'INFO';
    text: string;
  } | null>(null);

  // How to Test Popup Modal State ('WORKBENCH' for full guide, or specific testId)
  const [howToTestModal, setHowToTestModal] = useState<string | null>(null);

  useEffect(() => {
    if (!howToTestModal) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHowToTestModal(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [howToTestModal]);

  // SOP 18-Step Accordion State
  const [openPhases, setOpenPhases] = useState<number[]>([0]);
  const togglePhase = (index: number) =>
    setOpenPhases((cur) => (cur.includes(index) ? cur.filter((n) => n !== index) : [...cur, index]));

  // Derived Live Telemetry Metrics
  const onlineIedsCount = ieds.filter((i) => i.commHealthy).length;
  const activeFaults = faultScenarios.filter((f) => f.active);
  const unackAlarmsCount = alarms.filter((a) => a.state === 'ACTIVE_UNACK').length;
  const healthyLinksCount = networkLinks.filter((l) => l.status === 'UP').length;

  // Combined Progress Stats
  const totalAutoAndStoreTests = autoTests.length + fatSatTests.length;
  const passedTestsCount =
    autoTests.filter((t) => t.status === 'PASS').length +
    fatSatTests.filter((t) => t.status === 'PASS').length;
  const failedTestsCount =
    autoTests.filter((t) => t.status === 'FAIL').length +
    fatSatTests.filter((t) => t.status === 'FAIL').length;
  const completedAutoTests = autoTests.filter((t) => t.status !== 'NOT_RUN');
  const completedStoreTests = fatSatTests.filter((t) => t.status !== 'NOT_RUN');
  const completedP2pTests = Object.values(p2pResults).filter((r) => r.status !== 'NOT_TESTED');
  const completedSuiteCount = completedAutoTests.length + completedStoreTests.length;
  const totalCompletedCount = completedSuiteCount + completedP2pTests.length;
  const allSuiteTestsCompleted = totalAutoAndStoreTests > 0 && completedSuiteCount >= totalAutoAndStoreTests;
  const openPunchItems = punchList.filter((p) => p.status === 'OPEN');
  const openCatACount = openPunchItems.filter((p) => p.category === 'CAT_A').length;

  const p2pEntriesForBay = useMemo(() => {
    if (!activeBay || !proto) return [];
    const base = [
      {
        key: 'CB_POS',
        group: 'Digital Input (52a/52b)',
        label: `Circuit Breaker Position (${activeBay.breakerId})`,
        signalRef: proto.mms.statusRef,
        ioaOrMap: proto.iec104.ioaStatus,
        liveVal: `${activeBay.breakerState} (Q:${activeBay.quality})`,
      },
      {
        key: 'DS_Q1',
        group: 'Digital Input (Q1)',
        label: 'Bus Disconnector (Q1) Position',
        signalRef: `${activeBay.iedId.replace(/-/g, '_')}/XSWI1.Pos.stVal`,
        ioaOrMap: `IOA ${1101 + activeBayIdx} (M_DP_TB_1)`,
        liveVal: activeBay.busDisconnectorState,
      },
      {
        key: 'ES_Q8',
        group: 'Digital Input (Q8)',
        label: 'Earth Switch (Q8) Position',
        signalRef: `${activeBay.iedId.replace(/-/g, '_')}/XSWI8.Pos.stVal`,
        ioaOrMap: `IOA ${1201 + activeBayIdx} (M_DP_TB_1)`,
        liveVal: activeBay.earthSwitchState,
      },
      {
        key: 'TRIP_86',
        group: 'Protection / 86 Lockout',
        label: 'Master Trip / Protection Operate (PTRC1)',
        signalRef: `${activeBay.iedId.replace(/-/g, '_')}/PTRC1.Tr.general`,
        ioaOrMap: `IOA ${1401 + activeBayIdx} (M_SP_TB_1)`,
        liveVal: activeBay.protectionTripActive ? 'TRIP ACTIVE (86)' : 'NORMAL (HEALTHY)',
      },
      {
        key: 'CTRL_SBO',
        group: 'Remote Control (SBO)',
        label: `SCADA SBO Command (${activeBay.breakerId})`,
        signalRef: `${activeBay.iedId.replace(/-/g, '_')}/CSWI1$CO$Pos$SBOw`,
        ioaOrMap: `IOA ${6001 + activeBayIdx} (C_DC_NA_1)`,
        liveVal: `${activeBay.localRemote} · CILO: ${activeBay.interlockPermissive ? 'OK' : 'LOCKED'}`,
      },
      {
        key: 'ANALOG_MW',
        group: 'Analog Telemetry (MMXU1)',
        label: 'Active Power / Current / Voltage Scaling',
        signalRef: proto.mms.measRef,
        ioaOrMap: proto.iec104.ioaMeas,
        liveVal: `${(activeBay.voltageAbKv ?? activeBay.voltageKv ?? 0).toFixed(2)} kV · ${(activeBay.currentA ?? 0).toFixed(1)} A · ${(activeBay.activePowerMw ?? 0).toFixed(2)} MW`,
      },
    ];
    if (activeTx) {
      base.push({
        key: 'OLTC_TAP',
        group: 'Transformer Control (YLTC1)',
        label: `${activeTx.id} OLTC Tap Step & Oil Temp`,
        signalRef: `${activeBay.iedId.replace(/-/g, '_')}/YLTC1.TapChg`,
        ioaOrMap: `IOA ${3501 + activeBayIdx} (C_RC_NA_1)`,
        liveVal: `Tap ${activeTx.oltcTapPosition} · OTI ${activeTx.oilTempC}°C · Load ${(activeTx.loadPercent ?? 0).toFixed(1)}%`,
      });
    }
    return base;
  }, [activeBay, activeBayIdx, activeTx, proto]);

  // Helper to log a punch item
  const addPunchItem = (
    category: PunchCategory,
    bayOrIed: string,
    description: string,
    linkedTestId?: string
  ) => {
    const id = `PL-${String(punchList.length + 1).padStart(3, '0')}`;
    const item: PunchItem = {
      id,
      category,
      mode,
      bayOrIed,
      description,
      linkedTestId,
      status: 'OPEN',
      createdAt: formatClock(),
    };
    setPunchList((prev) => [item, ...prev]);
    setLastActionBanner({ type: 'INFO', text: `Punch Point ${id} (${category.replace('_', ' ')}) logged for ${bayOrIed}.` });
  };

  // End-to-End Signal Chain Health for Selected Bay
  const signalChainNodes = useMemo(() => {
    const fieldOk = Boolean(activeBay && activeBay.dcSupplyHealthy && activeBay.tcsHealthy);
    const iedOk = Boolean(activeIed?.commHealthy && activeBay?.quality === 'GOOD');
    const busOk = healthyLinksCount > 0 && !activeFaults.some((f) => f.category === 'Network & Sync');
    const gtwOk = !activeFaults.some((f) => f.id === 'FLT-IEC104-01' || f.id === 'FLT-MODBUS-01');
    const scadaOk = iedOk && busOk;
    return [
      { name: mode === 'FAT' ? 'Test Switch / Sim Input' : 'Field Switchgear (52a/CT/VT)', ok: fieldOk, detail: activeBay ? `${activeBay.breakerId}: ${activeBay.breakerState}` : '—' },
      { name: `Bay IED (${activeBay?.iedId || 'IED'})`, ok: iedOk, detail: iedOk ? 'MMS TCP/102 ONLINE' : 'COMM FAULT / BAD Q' },
      { name: `Station Bus (${networkRedundancyMode})`, ok: busOk, detail: `${healthyLinksCount}/${networkLinks.length} Links UP` },
      { name: 'Gateway (IEC-104 COA 132)', ok: gtwOk, detail: proto ? proto.iec104.ioaStatus.split(' ')[0] + ' ' + proto.iec104.ioaStatus.split(' ')[1] : 'IOA OK' },
      { name: 'SCADA HMI & 1ms SOE', ok: scadaOk, detail: `${soeLog.length} SOE Records` },
    ];
  }, [activeBay, activeIed, healthyLinksCount, networkLinks.length, activeFaults, networkRedundancyMode, mode, proto, soeLog.length]);

  // Execute Live P2P Point Check directly on useSubstationStore
  const runP2pPointTest = (pointKey: string) => {
    if (!activeBay || !proto) return;
    const storeId = `${activeBay.id}:${pointKey}`;
    const ts = formatClock();
    const entry = p2pEntriesForBay.find((e) => e.key === pointKey);
    if (!entry) return;

    let passed = false;
    let observed = '';
    let note = '';

    if (pointKey === 'CB_POS' || pointKey === 'CTRL_SBO') {
      const target: 'OPEN' | 'CLOSED' = activeBay.breakerState === 'CLOSED' ? 'OPEN' : 'CLOSED';
      const ok = commandBreaker(activeBay.id, target, 'SCADA_SBO');
      const latestBay = useSubstationStore.getState().bays.find((b) => b.id === activeBay.id);
      passed = ok && latestBay?.breakerState === target && latestBay.quality === 'GOOD';
      observed = latestBay ? `${latestBay.breakerState} (Q:${latestBay.quality})` : 'Unknown';
      note = passed
        ? `${mode} verified: SBO ${target} confirmed on ${activeBay.breakerId} & logged in 1ms SOE.`
        : `Command rejected/failed: ${useSubstationStore.getState().lastCommandFeedback?.message || activeBay.interlockReason}`;
    } else if (pointKey === 'DS_Q1') {
      const target = activeBay.busDisconnectorState === 'CLOSED' ? 'OPEN' : 'CLOSED';
      const ok = commandDisconnector(activeBay.id, 'BUS_Q1', target);
      const latestBay = useSubstationStore.getState().bays.find((b) => b.id === activeBay.id);
      passed = ok && latestBay?.busDisconnectorState === target;
      observed = latestBay ? latestBay.busDisconnectorState : 'Unknown';
      note = passed
        ? `Q1 Bus Disconnector operated to ${target} and verified end-to-end.`
        : `Q1 operation blocked (CB must be OPEN before operating isolator).`;
    } else if (pointKey === 'ES_Q8') {
      const target = activeBay.earthSwitchState === 'CLOSED' ? 'OPEN' : 'CLOSED';
      const ok = commandDisconnector(activeBay.id, 'EARTH_Q8', target);
      const latestBay = useSubstationStore.getState().bays.find((b) => b.id === activeBay.id);
      passed = ok && latestBay?.earthSwitchState === target;
      observed = latestBay ? latestBay.earthSwitchState : 'Unknown';
      note = passed
        ? `Q8 Earth Switch operated to ${target} and verified in SCADA/SOE.`
        : `Q8 operation blocked (CB & Bus DS Q1 must be OPEN to close Earth Switch).`;
    } else if (pointKey === 'TRIP_86') {
      if (activeBay.protectionTripActive) {
        resetProtectionTrip(activeBay.id);
        if (activeBay.bayType === 'OUTGOING_FEEDER') resetRecloseDemo86(activeBay.id);
        const latestBay = useSubstationStore.getState().bays.find((b) => b.id === activeBay.id);
        passed = !latestBay?.protectionTripActive;
        observed = passed ? '86 RESET NORMAL' : 'STILL LATCHED';
        note = passed ? '86 Lockout & trip indication reset verified.' : 'Reset incomplete — clear fault first.';
      } else {
        triggerProtectionTrip(activeBay.id, '50/51 Phase Overcurrent');
        const latestBay = useSubstationStore.getState().bays.find((b) => b.id === activeBay.id);
        passed = Boolean(latestBay?.protectionTripActive && latestBay.breakerState === 'OPEN');
        observed = latestBay ? `CB:${latestBay.breakerState} · 86:${latestBay.protectionTripActive ? 'ACTIVE' : 'OFF'}` : 'Unknown';
        note = passed ? 'Trip injected: CB opened, 86 latched, Critical alarm & SOE confirmed.' : 'Trip chain verification failed.';
      }
    } else if (pointKey === 'ANALOG_MW') {
      triggerMmsGeneralInterrogation(activeBay.iedId);
      const latestBay = useSubstationStore.getState().bays.find((b) => b.id === activeBay.id);
      passed = Boolean(latestBay && latestBay.quality === 'GOOD' && activeIed?.commHealthy);
      observed = latestBay ? `${(latestBay.voltageAbKv ?? latestBay.voltageKv ?? 0).toFixed(2)} kV | ${(latestBay.currentA ?? 0).toFixed(1)} A | ${(latestBay.activePowerMw ?? 0).toFixed(2)} MW` : '—';
      note = passed
        ? `Analog scaling & MMS GI verified (${proto.iec104.ioaMeas}, Q:GOOD).`
        : `Analog quality suspect (${latestBay?.quality || 'INVALID'}) or IED offline.`;
    } else if (pointKey === 'OLTC_TAP' && activeTx) {
      const prevTap = activeTx.oltcTapPosition;
      const dir = prevTap >= activeTx.oltcMaxTap ? 'LOWER' : 'RAISE';
      stepTransformerOltc(activeTx.id, dir);
      const latestTx = useSubstationStore.getState().transformers.find((t) => t.id === activeTx.id);
      passed = Boolean(latestTx && latestTx.oltcTapPosition !== prevTap);
      observed = latestTx ? `Tap ${prevTap} → ${latestTx.oltcTapPosition} (OTI ${latestTx.oilTempC}°C)` : '—';
      note = passed ? `${activeTx.id} OLTC ${dir} step verified.` : 'OLTC step did not change.';
    }

    setP2pResults((prev) => ({
      ...prev,
      [storeId]: {
        key: pointKey,
        label: entry.label,
        signalRef: entry.signalRef,
        ioaOrMap: entry.ioaOrMap,
        status: passed ? 'PASS' : 'FAIL',
        observedValue: observed,
        timestamp: ts,
        note,
      },
    }));
    setLastActionBanner({ type: passed ? 'PASS' : 'FAIL', text: `[P2P ${entry.label}] ${note}` });
  };

  // Run Auto-Verified Live Commissioning Test
  const executeAutoTest = (testId: string) => {
    if (!activeBay) return;
    const ts = formatClock();
    let passed = false;
    let evidence = '';

    if (testId === 'AUTO-CILO-01') {
      // Ensure REMOTE, open CB, open Q1, close Q8, attempt CB Close (must be blocked!), then restore Q8 OPEN
      setBayLocalRemote(activeBay.id, 'REMOTE');
      if (activeBay.breakerState === 'CLOSED') commandBreaker(activeBay.id, 'OPEN', 'SCADA_SBO');
      if (activeBay.busDisconnectorState === 'CLOSED') commandDisconnector(activeBay.id, 'BUS_Q1', 'OPEN');
      const esClosed = commandDisconnector(activeBay.id, 'EARTH_Q8', 'CLOSED');
      const unsafeCloseAccepted = commandBreaker(activeBay.id, 'CLOSED', 'SCADA_SBO');
      const feedback = useSubstationStore.getState().lastCommandFeedback?.message || '';
      // Cleanly restore Q8 OPEN so bay is safe for next tests
      commandDisconnector(activeBay.id, 'EARTH_Q8', 'OPEN');
      commandDisconnector(activeBay.id, 'BUS_Q1', 'CLOSED');
      passed = esClosed && !unsafeCloseAccepted;
      evidence = passed
        ? `PASS on ${activeBay.bayCode}: Q8 closed → CB Close rejected by CILO ("${feedback || 'Interlock Blocked'}"). Q8/Q1 restored.`
        : `FAIL on ${activeBay.bayCode}: Unsafe close was not blocked or Q8 failed to close.`;
    } else if (testId === 'AUTO-PROT-86') {
      const beforeSoeCount = useSubstationStore.getState().soeLog.length;
      triggerProtectionTrip(activeBay.id, '50/51 Commissioning Trip Test');
      const st = useSubstationStore.getState();
      const b = st.bays.find((x) => x.id === activeBay.id);
      const hasCritAlarm = st.alarms.some((a) => a.bayId === activeBay.id && a.state !== 'CLEARED');
      const soeAdded = st.soeLog.length > beforeSoeCount;
      passed = Boolean(b && b.breakerState === 'OPEN' && b.protectionTripActive && hasCritAlarm && soeAdded);
      evidence = passed
        ? `PASS on ${activeBay.bayCode}: CB OPEN, 86 Trip Active, Alarm raised, SOE logged (${st.soeLog[0]?.timestampMs || ts}).`
        : `FAIL on ${activeBay.bayCode}: Expected CB OPEN + 86 + Alarm + SOE.`;
    } else if (testId === 'AUTO-SBO-01') {
      setBayLocalRemote(activeBay.id, 'REMOTE');
      if (activeBay.protectionTripActive) {
        resetProtectionTrip(activeBay.id);
        if (activeBay.bayType === 'OUTGOING_FEEDER') resetRecloseDemo86(activeBay.id);
      }
      if (activeBay.earthSwitchState === 'CLOSED') commandDisconnector(activeBay.id, 'EARTH_Q8', 'OPEN');
      if (activeBay.busDisconnectorState === 'OPEN') commandDisconnector(activeBay.id, 'BUS_Q1', 'CLOSED');
      const latestBefore = useSubstationStore.getState().bays.find((x) => x.id === activeBay.id);
      const target: 'OPEN' | 'CLOSED' = latestBefore?.breakerState === 'CLOSED' ? 'OPEN' : 'CLOSED';
      const ok = commandBreaker(activeBay.id, target, 'SCADA_SBO');
      const latestAfter = useSubstationStore.getState().bays.find((x) => x.id === activeBay.id);
      passed = Boolean(ok && latestAfter?.breakerState === target && latestAfter.quality === 'GOOD');
      evidence = passed
        ? `PASS on ${activeBay.bayCode}: SBO ${target} accepted → XCBR1.Pos=${latestAfter?.breakerState} (Q:${latestAfter?.quality}).`
        : `FAIL on ${activeBay.bayCode}: ${useSubstationStore.getState().lastCommandFeedback?.message || 'SBO command rejected'}.`;
    } else if (testId === 'AUTO-43LR-01') {
      setBayLocalRemote(activeBay.id, 'LOCAL');
      const target: 'OPEN' | 'CLOSED' = activeBay.breakerState === 'CLOSED' ? 'OPEN' : 'CLOSED';
      const remoteAllowed = commandBreaker(activeBay.id, target, 'SCADA_SBO');
      const msg = useSubstationStore.getState().lastCommandFeedback?.message || '';
      setBayLocalRemote(activeBay.id, 'REMOTE');
      passed = !remoteAllowed;
      evidence = passed
        ? `PASS on ${activeBay.bayCode}: 43LR=LOCAL blocked SCADA SBO ("${msg || 'Blocked-by-switching-hierarchy'}"). Restored REMOTE.`
        : `FAIL on ${activeBay.bayCode}: Remote command executed despite 43LR=LOCAL.`;
    } else if (testId === 'AUTO-MMS-GI') {
      triggerMmsGeneralInterrogation(activeBay.iedId);
      const st = useSubstationStore.getState();
      const ied = st.ieds.find((i) => i.id === activeBay.iedId);
      const b = st.bays.find((x) => x.id === activeBay.id);
      passed = Boolean(ied?.commHealthy && b?.quality === 'GOOD');
      evidence = passed
        ? `PASS on ${activeBay.iedId}: MMS TCP/102 ONLINE, GI snapshot refreshed, Bay Quality=GOOD.`
        : `FAIL on ${activeBay.iedId}: IED commHealthy=${String(ied?.commHealthy)}, Quality=${b?.quality}.`;
    } else if (testId === 'AUTO-GOOSE-01') {
      const targetGocb = gooseControlBlocks[0];
      if (targetGocb) {
        const prevSt = targetGocb.stNum;
        triggerGooseStateChangeBurst(targetGocb.id);
        const updated = useSubstationStore.getState().gooseControlBlocks.find((g) => g.id === targetGocb.id);
        passed = Boolean(updated && updated.stNum > prevSt && updated.mismatchFault === 'NONE');
        evidence = passed
          ? `PASS on ${targetGocb.gocbRef}: GOOSE burst published (stNum ${prevSt} → ${updated?.stNum}, APPID ${targetGocb.appId}, Fault: NONE).`
          : `FAIL on ${targetGocb.gocbRef}: Mismatch fault active (${updated?.mismatchFault}) or stNum unchanged.`;
      }
    } else if (testId === 'AUTO-RED-01') {
      const netFaults = activeFaults.filter((f) => f.category === 'Network & Sync');
      passed = netFaults.length === 0 && onlineIedsCount === ieds.length && healthyLinksCount === networkLinks.length;
      evidence = passed
        ? `PASS: Redundancy=${networkRedundancyMode}, IEDs=${onlineIedsCount}/${ieds.length} ONLINE, Links=${healthyLinksCount}/${networkLinks.length} UP, Zero Time/Net faults.`
        : `FAIL: ${netFaults.length} network/sync fault(s) active; IEDs ${onlineIedsCount}/${ieds.length}; Links ${healthyLinksCount}/${networkLinks.length}.`;
    }

    setAutoTests((prev) =>
      prev.map((t) =>
        t.id === testId
          ? { ...t, status: passed ? 'PASS' : 'FAIL', actualEvidence: evidence, timestamp: ts }
          : t
      )
    );
    // Auto-close any open punch item linked to this test when re-test passes!
    if (passed) {
      setPunchList((prev) =>
        prev.map((p) =>
          p.linkedTestId === testId && p.status === 'OPEN'
            ? { ...p, status: 'CLOSED', closedAt: ts }
            : p
        )
      );
    }
    setLastActionBanner({ type: passed ? 'PASS' : 'FAIL', text: evidence });
  };

  const runAllAutoAndStoreTests = () => {
    INITIAL_LIVE_AUTO_TESTS.forEach((t) => executeAutoTest(t.id));
    runAllFatSatTests();
  };


  // Direct One-Click Downloadable PDF File (Real .pdf binary — no print dialog needed)
  const downloadOfficialPdfFile = () => {
    const generatedAt = new Date().toLocaleString();
    const p2pList = Object.values(p2pResults);
    const verdict =
      openCatACount > 0 || failedTestsCount > 0
        ? `HOLD / NOT RELEASED - ${failedTestsCount} failed test(s) and ${openCatACount} open Category-A blocker punch point(s) must be resolved and re-tested.`
        : passedTestsCount === 0
        ? 'PENDING EXECUTION - Run live commissioning test cases before witness sign-off.'
        : `SIMULATOR ${mode} ACCEPTED - ${passedTestsCount}/${totalAutoAndStoreTests} test cases passed with zero Category-A blockers. (Training simulation evidence only.)`;

    const pdfBlob = buildDirectPdfBlob({
      title: `${mode} - Substation Automation System Commissioning Report`,
      subtitle: `${projectRef} | ${mode === 'FAT' ? 'Factory Acceptance Test' : 'Site Acceptance Test'}`,
      metaLines: [
        `Engineer: ${testerName}`,
        `Witness: ${witnessName}`,
        `Generated: ${generatedAt}`,
      ],
      kpis: [
        { label: 'Tests Passed', value: `${passedTestsCount} / ${totalAutoAndStoreTests}` },
        { label: 'Tests Failed', value: String(failedTestsCount) },
        { label: 'P2P Verified', value: `${p2pList.filter((p) => p.status === 'PASS').length} / ${p2pList.length}` },
        { label: 'Open Punch Points', value: `${openPunchItems.length} (${openCatACount} Cat-A)` },
      ],
      verdict,
      sections: [
        {
          title: '1. Point-to-Point (P2P) Signal Verification Evidence',
          headers: ['Signal / Point', 'IEC 61850 Reference', 'Gateway / IOA', 'Observed Value', 'Status', 'Time'],
          colWidths: [20, 22, 16, 20, 10, 12],
          rows: p2pList.map((r) => [r.label, r.signalRef, r.ioaOrMap, r.observedValue, r.status, r.timestamp]),
        },
        {
          title: '2. Functional Commissioning Test Cases (IEC 61850 / IEC-104)',
          headers: ['Code', 'Test Case', 'Standard Ref', 'Status', 'Actual Recorded Evidence', 'Time'],
          colWidths: [11, 23, 16, 9, 31, 10],
          rows: [
            ...autoTests.map((t) => [t.code, t.title, t.standardRef, t.status, t.actualEvidence, t.timestamp]),
            ...fatSatTests.map((t) => [
              t.testCode,
              t.title,
              t.standardRef,
              t.status,
              t.actualSimulatedResult || t.evidenceLog,
              t.lastExecuted || '-',
            ]),
          ],
        },
        {
          title: '3. Commissioning Punch List (Category A / B / C)',
          headers: ['ID', 'Cat', 'Mode', 'Bay / IED', 'Defect Description', 'Status', 'Time'],
          colWidths: [9, 9, 8, 13, 39, 10, 12],
          rows: punchList.map((p) => [
            p.id,
            p.category.replace('_', ' '),
            p.mode,
            p.bayOrIed,
            p.description,
            p.status,
            p.closedAt || p.createdAt,
          ]),
        },
        {
          title: '4. Recorded Millisecond Sequence of Events (SOE - Latest 20)',
          headers: ['#', 'Timestamp (ms)', 'Bay / IED', 'Event Description', 'Cause', 'Quality'],
          colWidths: [5, 22, 18, 35, 12, 8],
          rows: soeLog.slice(0, 20).map((s, idx) => [
            String(idx + 1),
            s.timestampMs,
            `${s.bayName} (${s.iedId})`,
            s.eventDescription,
            s.cause,
            s.quality,
          ]),
        },
      ],
      signatures: [
        `Commissioning Eng: ${testerName}`,
        `Utility Witness: ${witnessName}`,
        'QA / Site Manager: SAS Hub',
      ],
    });

    const url = URL.createObjectURL(pdfBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sas_${mode.toLowerCase()}_commissioning_report.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    setLastActionBanner({
      type: 'PASS',
      text: `Downloaded official ${mode} PDF report (sas_${mode.toLowerCase()}_commissioning_report.pdf).`,
    });
  };

  // Export Printable Official FAT/SAT Report PDF
  const exportOfficialPdfReport = () => {
    const generatedAt = new Date().toLocaleString();
    const p2pList = Object.values(p2pResults);
    const p2pRowsHtml = p2pList.length
      ? p2pList
          .map(
            (r) =>
              `<tr><td>${escapeHtml(r.label)}</td><td><code>${escapeHtml(r.signalRef)}</code></td><td>${escapeHtml(r.ioaOrMap)}</td><td>${escapeHtml(r.observedValue)}</td><td class="${r.status === 'PASS' ? 'pass' : 'fail'}">${escapeHtml(r.status)}</td><td>${escapeHtml(r.timestamp)}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="6">No P2P signal checks executed in this session yet.</td></tr>';

    const testRowsHtml = [
      ...autoTests.map((t) => ({
        code: t.code,
        title: t.title,
        std: t.standardRef,
        status: t.status,
        ev: t.actualEvidence,
        ts: t.timestamp,
      })),
      ...fatSatTests.map((t) => ({
        code: t.testCode,
        title: t.title,
        std: t.standardRef,
        status: t.status,
        ev: t.actualSimulatedResult || t.evidenceLog,
        ts: t.lastExecuted || '—',
      })),
    ]
      .map(
        (t) =>
          `<tr><td>${escapeHtml(t.code)}</td><td>${escapeHtml(t.title)}</td><td>${escapeHtml(t.std)}</td><td class="${t.status === 'PASS' ? 'pass' : t.status === 'FAIL' ? 'fail' : 'pending'}">${escapeHtml(t.status)}</td><td>${escapeHtml(t.ev)}</td><td>${escapeHtml(t.ts)}</td></tr>`
      )
      .join('');

    const punchRowsHtml = punchList.length
      ? punchList
          .map(
            (p) =>
              `<tr><td>${escapeHtml(p.id)}</td><td>${escapeHtml(p.category.replace('_', ' '))}</td><td>${escapeHtml(p.mode)}</td><td>${escapeHtml(p.bayOrIed)}</td><td>${escapeHtml(p.description)}</td><td class="${p.status === 'CLOSED' ? 'pass' : 'fail'}">${escapeHtml(p.status)}</td><td>${escapeHtml(p.closedAt || p.createdAt)}</td></tr>`
          )
          .join('')
      : '<tr><td colspan="7">Zero open punch points recorded.</td></tr>';

    const soeRowsHtml = soeLog
      .slice(0, 25)
      .map(
        (s, idx) =>
          `<tr><td>${idx + 1}</td><td><code>${escapeHtml(s.timestampMs)}</code></td><td>${escapeHtml(s.bayName)} (${escapeHtml(s.iedId)})</td><td>${escapeHtml(s.eventDescription)}</td><td>${escapeHtml(s.cause)}</td><td>${escapeHtml(s.quality)}</td></tr>`
      )
      .join('');

    const verdict =
      openCatACount > 0 || failedTestsCount > 0
        ? `HOLD / NOT RELEASED — ${failedTestsCount} failed test(s) and ${openCatACount} open Category-A blocker punch point(s) must be resolved and re-tested.`
        : passedTestsCount === 0
        ? 'PENDING EXECUTION — Run live commissioning test cases before witness sign-off.'
        : `SIMULATOR ${mode} ACCEPTED — ${passedTestsCount}/${totalAutoAndStoreTests} test cases passed with zero Category-A blockers. (Training simulation evidence only.)`;

    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(mode)} Commissioning Protocol Report — ${escapeHtml(projectRef)}</title><style>
      @page { size: A4 portrait; margin: 12mm; }
      * { box-sizing: border-box; }
      body { font: 10px Arial, sans-serif; color: #16283a; margin: 0; }
      header { border-bottom: 3px solid #0077a8; padding-bottom: 10px; margin-bottom: 14px; }
      h1 { margin: 0 0 4px; font-size: 16px; color: #053354; }
      h2 { font-size: 12px; color: #053354; margin: 14px 0 6px; border-bottom: 1px solid #d0e1ec; padding-bottom: 3px; break-after: avoid; }
      .meta { display: flex; flex-wrap: wrap; gap: 16px; font-size: 9.5px; color: #3d566e; margin-top: 6px; }
      .kpis { display: flex; gap: 10px; margin: 10px 0; }
      .kpi { flex: 1; background: #eef6fa; border: 1px solid #c7dce8; border-radius: 4px; padding: 7px 10px; }
      .kpi strong { font-size: 14px; display: block; color: #053354; }
      table { width: 100%; border-collapse: collapse; font-size: 8.5px; margin-top: 4px; }
      th { background: #0a3554; color: #fff; text-align: left; }
      th, td { border: 1px solid #c9dae5; padding: 4px 5px; vertical-align: top; word-break: break-word; }
      tr:nth-child(even) { background: #f5f9fc; }
      .pass { color: #057a3c; font-weight: bold; }
      .fail { color: #c41c2c; font-weight: bold; }
      .pending { color: #9c5b00; font-weight: bold; }
      .verdict { padding: 9px 11px; border-left: 4px solid #0077a8; background: #edf6fa; font-weight: bold; margin: 10px 0; }
      .sigs { display: flex; gap: 24px; margin-top: 26px; }
      .sigs div { flex: 1; border-top: 1px solid #567089; padding-top: 5px; font-size: 9px; }
    </style></head><body>
      <header>
        <h1>${escapeHtml(mode)} — Substation Automation System Commissioning Protocol Report</h1>
        <div class="meta">
          <span><b>Project:</b> ${escapeHtml(projectRef)}</span>
          <span><b>Mode:</b> ${escapeHtml(mode)} (${mode === 'FAT' ? 'Factory Acceptance' : 'Site Acceptance'})</span>
          <span><b>Commissioning Eng:</b> ${escapeHtml(testerName)}</span>
          <span><b>Witness:</b> ${escapeHtml(witnessName)}</span>
          <span><b>Generated:</b> ${escapeHtml(generatedAt)}</span>
        </div>
      </header>
      <div class="kpis">
        <div class="kpi"><strong>${passedTestsCount} / ${totalAutoAndStoreTests}</strong>Tests Passed</div>
        <div class="kpi"><strong>${failedTestsCount}</strong>Tests Failed</div>
        <div class="kpi"><strong>${p2pList.filter((p) => p.status === 'PASS').length} / ${p2pList.length}</strong>P2P Verified</div>
        <div class="kpi"><strong>${openPunchItems.length} (${openCatACount} Cat-A)</strong>Open Punch Points</div>
      </div>
      <div class="verdict">${escapeHtml(verdict)}</div>
      <h2>1. Point-to-Point (P2P) Signal Verification Evidence</h2>
      <table><thead><tr><th>Signal / Point</th><th>IEC 61850 Reference</th><th>Gateway / IOA</th><th>Observed Value</th><th>Result</th><th>Time</th></tr></thead><tbody>${p2pRowsHtml}</tbody></table>
      <h2>2. Functional Commissioning Test Cases (IEC 61850 / IEC-104)</h2>
      <table><thead><tr><th>Code</th><th>Test Case</th><th>Standard Ref</th><th>Status</th><th>Actual Recorded Evidence</th><th>Time</th></tr></thead><tbody>${testRowsHtml}</tbody></table>
      <h2>3. Commissioning Punch List (Category A / B / C)</h2>
      <table><thead><tr><th>ID</th><th>Category</th><th>Mode</th><th>Bay / IED</th><th>Defect Description</th><th>Status</th><th>Timestamp</th></tr></thead><tbody>${punchRowsHtml}</tbody></table>
      <h2>4. Recorded Millisecond Sequence of Events (SOE — Latest 25)</h2>
      <table><thead><tr><th>#</th><th>Timestamp (ms)</th><th>Bay / IED</th><th>Event Description</th><th>Cause</th><th>Quality</th></tr></thead><tbody>${soeRowsHtml}</tbody></table>
      <div class="sigs">
        <div><b>Commissioning Engineer:</b><br/>${escapeHtml(testerName)}<br/>Sign / Date: _______________</div>
        <div><b>Customer / Utility Witness:</b><br/>${escapeHtml(witnessName)}<br/>Sign / Date: _______________</div>
        <div><b>QA / Site Manager:</b><br/>Substation Automation Hub<br/>Sign / Date: _______________</div>
      </div>
    </body></html>`;

    const popup = window.open('', '_blank');
    if (!popup) {
      window.alert('Please allow pop-ups in your browser to print/save the official PDF report.');
      return;
    }
    popup.document.open();
    popup.document.write(html);
    popup.document.close();
    popup.focus();
    setTimeout(() => popup.print(), 250);
  };

  // Export CSV Package
  const exportCsvPackage = () => {
    const rows: string[][] = [
      ['Section', 'Code/ID', 'Title/Signal', 'Category/Ref', 'Status', 'Evidence / Value', 'Timestamp'],
      ...Object.values(p2pResults).map((r) => ['P2P', r.key, r.label, r.signalRef, r.status, `${r.observedValue} — ${r.note}`, r.timestamp]),
      ...autoTests.map((t) => ['LIVE_TEST', t.code, t.title, t.standardRef, t.status, t.actualEvidence, t.timestamp]),
      ...fatSatTests.map((t) => ['PROTOCOL_TEST', t.testCode, t.title, t.standardRef, t.status, t.actualSimulatedResult || t.evidenceLog, t.lastExecuted || '—']),
      ...punchList.map((p) => ['PUNCH_LIST', p.id, p.description, `${p.category} (${p.bayOrIed})`, p.status, p.mode, p.closedAt || p.createdAt]),
    ];
    const csv = rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sas_${mode.toLowerCase()}_commissioning_evidence.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Download ONLY Completed Tests (PASS / FAIL across P2P, Live Tests & Protocol Checks)
  const exportCompletedTestsCsv = () => {
    if (totalCompletedCount === 0) {
      setLastActionBanner({
        type: 'INFO',
        text: 'No completed tests yet — run P2P checks or Live Tests first, then download.',
      });
      return;
    }
    const exportedAt = new Date().toLocaleString();
    const rows: string[][] = [
      ['Project', projectRef, 'Mode', mode, 'Engineer', testerName, 'Witness', witnessName],
      ['Exported At', exportedAt, 'Total Completed', String(totalCompletedCount), 'Suite Passed', `${passedTestsCount}/${totalAutoAndStoreTests}`, 'Suite Failed', String(failedTestsCount)],
      [],
      ['Section', 'Code / ID', 'Test / Signal Name', 'Standard / Reference', 'Status', 'Actual Recorded Evidence', 'Timestamp'],
      ...completedAutoTests.map((t) => [
        'LIVE_TEST',
        t.code,
        t.title,
        t.standardRef,
        t.status,
        t.actualEvidence,
        t.timestamp,
      ]),
      ...completedStoreTests.map((t) => [
        'PROTOCOL_TEST',
        t.testCode,
        t.title,
        t.standardRef,
        t.status,
        t.actualSimulatedResult || t.evidenceLog,
        t.lastExecuted || '—',
      ]),
      ...completedP2pTests.map((r) => [
        'P2P_SIGNAL',
        r.key,
        r.label,
        `${r.signalRef} | ${r.ioaOrMap}`,
        r.status,
        `${r.observedValue} — ${r.note}`,
        r.timestamp,
      ]),
    ];
    const csv = rows
      .map((row) => row.map((cell) => `"${String(cell ?? '').replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sas_${mode.toLowerCase()}_completed_tests_${totalCompletedCount}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setLastActionBanner({
      type: 'PASS',
      text: `Downloaded ${totalCompletedCount} completed ${mode} test record(s) as CSV.`,
    });
  };

  return (
    <div className="sas-fat-sat-page space-y-4 pb-10 text-slate-100">
      {/* 1. REAL-TIME COMMISSIONING HEADER + FAT/SAT MODE SWITCH */}
      <header className="rounded-2xl border border-cyan-500/40 bg-gradient-to-br from-[#071c32] via-[#061629] to-[#04101f] p-4 sm:p-5 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-cyan-400">
              <ClipboardCheck className="w-4 h-4" />
              <span>REAL-TIME SUBSTATION COMMISSIONING WORKBENCH</span>
              <span className="rounded-full border border-emerald-400/60 bg-emerald-950/60 px-2.5 py-0.5 text-[10px] text-emerald-300">
                LIVE STORE SYNCED
              </span>
              <button
                type="button"
                onClick={() => setHowToTestModal('WORKBENCH')}
                className="inline-flex items-center gap-1 rounded-full border border-cyan-300/80 bg-cyan-500/20 hover:bg-cyan-400 hover:text-[#031424] px-2.5 py-0.5 text-[10px] font-extrabold text-cyan-200 shadow-[0_0_10px_rgba(0,229,255,0.28)] transition cursor-pointer"
              >
                <HelpCircle className="w-3 h-3" /> How to Test
              </button>
            </div>
            <h1 className="mt-1.5 text-xl sm:text-2xl font-extrabold text-white">
              {mode === 'FAT'
                ? 'FAT — Factory Acceptance Test Workbench'
                : 'SAT — Site Acceptance Test & P2P Commissioning Workbench'}
            </h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-3xl">
              {mode === 'FAT'
                ? 'Factory Mode: Verify panel IED logic, secondary fault injection, GOOSE/MMS loopback, and Gateway IOA mapping before dispatch.'
                : 'Site Mode: Execute live Point-to-Point (P2P) bay checks, CILO interlocks, 86 lockout trips, PRP/HSR redundancy, and 1ms SOE witness verification.'}
            </p>
          </div>

          {/* FAT / SAT LIVE MODE TOGGLE */}
          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <div className="inline-flex rounded-xl border border-cyan-500/50 bg-[#041222] p-1">
              <button
                type="button"
                onClick={() => setMode('FAT')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold transition ${
                  mode === 'FAT'
                    ? 'bg-cyan-400 text-[#031424] shadow-[0_0_14px_rgba(0,229,255,0.45)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Factory className="w-3.5 h-3.5" /> FAT (Factory)
              </button>
              <button
                type="button"
                onClick={() => setMode('SAT')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-extrabold transition ${
                  mode === 'SAT'
                    ? 'bg-emerald-400 text-[#031c14] shadow-[0_0_14px_rgba(52,211,153,0.45)]'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" /> SAT (Site)
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5 font-mono text-[10.5px]">
              <span className="rounded border border-cyan-700/60 bg-[#08223a] px-2 py-0.5 text-cyan-200">
                IEDs: {onlineIedsCount}/{ieds.length} ONLINE
              </span>
              <span className={`rounded border px-2 py-0.5 ${activeFaults.length ? 'border-rose-500 bg-rose-950/60 text-rose-200' : 'border-emerald-600/60 bg-emerald-950/50 text-emerald-300'}`}>
                Faults: {activeFaults.length}
              </span>
              <span className={`rounded border px-2 py-0.5 ${unackAlarmsCount ? 'border-amber-500 bg-amber-950/60 text-amber-200' : 'border-slate-700 bg-slate-900 text-slate-300'}`}>
                Unack Alarms: {unackAlarmsCount}
              </span>
            </div>
          </div>
        </div>

        {/* LIVE PROGRESS STRIP */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs">
          <div className="rounded-xl border border-emerald-600/40 bg-[#06221c] p-2.5">
            <div className="text-[10px] font-bold uppercase text-emerald-300">Passed Tests</div>
            <div className="mt-0.5 text-lg font-black text-white font-mono">
              {passedTestsCount} / {totalAutoAndStoreTests}
            </div>
          </div>
          <div className="rounded-xl border border-rose-600/40 bg-[#260b12] p-2.5">
            <div className="text-[10px] font-bold uppercase text-rose-300">Failed Tests</div>
            <div className="mt-0.5 text-lg font-black text-white font-mono">{failedTestsCount}</div>
          </div>
          <div className="rounded-xl border border-cyan-600/40 bg-[#072138] p-2.5">
            <div className="text-[10px] font-bold uppercase text-cyan-300">P2P Signals Verified</div>
            <div className="mt-0.5 text-lg font-black text-white font-mono">
              {Object.values(p2pResults).filter((r) => r.status === 'PASS').length} / {Object.values(p2pResults).length || p2pEntriesForBay.length}
            </div>
          </div>
          <div className="rounded-xl border border-amber-500/40 bg-[#261b08] p-2.5">
            <div className="text-[10px] font-bold uppercase text-amber-300">Open Punch Points</div>
            <div className="mt-0.5 text-lg font-black text-white font-mono">
              {openPunchItems.length} <span className="text-xs font-semibold text-rose-300">({openCatACount} Cat-A)</span>
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1 rounded-xl border border-cyan-700/50 bg-[#081d33] p-2.5 flex flex-col justify-between">
            <div className="text-[10px] font-bold uppercase text-cyan-200">Quick Actions</div>
            <div className="mt-1 flex gap-1.5">
              <button
                type="button"
                onClick={runAllAutoAndStoreTests}
                className="flex-1 rounded-lg bg-cyan-400 hover:bg-cyan-300 px-2 py-1 text-[11px] font-extrabold text-[#031424]"
              >
                Run All
              </button>
              <button
                type="button"
                onClick={exportCompletedTestsCsv}
                disabled={totalCompletedCount === 0}
                className={`rounded-lg border px-2 py-1 text-[11px] font-bold transition ${
                  totalCompletedCount > 0
                    ? 'border-emerald-400/80 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-400 hover:text-[#031c14]'
                    : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                }`}
                title={
                  totalCompletedCount > 0
                    ? `Download ${totalCompletedCount} Completed Tests (CSV)`
                    : 'Run tests first to enable download'
                }
              >
                <Download className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={downloadOfficialPdfFile}
                className="inline-flex items-center gap-1 rounded-lg border border-cyan-300 bg-cyan-500/20 hover:bg-cyan-400 hover:text-[#031424] px-2 py-1 text-[11px] font-extrabold text-cyan-100 transition"
                title={`Download ${mode} PDF Report`}
              >
                <FileText className="w-3.5 h-3.5" /> PDF
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* LIVE ACTION FEEDBACK BANNER */}
      {lastActionBanner && (
        <div
          role="status"
          className={`rounded-xl border px-4 py-2.5 text-xs flex flex-wrap items-center justify-between gap-2 ${
            lastActionBanner.type === 'PASS'
              ? 'border-emerald-500 bg-emerald-950/50 text-emerald-100'
              : lastActionBanner.type === 'FAIL'
              ? 'border-rose-500 bg-rose-950/60 text-rose-100'
              : 'border-cyan-500 bg-cyan-950/50 text-cyan-100'
          }`}
        >
          <span className="font-mono font-semibold">{lastActionBanner.text}</span>
          <button
            type="button"
            onClick={() => setLastActionBanner(null)}
            className="rounded bg-black/30 px-2 py-0.5 text-[11px] font-bold hover:bg-black/50"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. WORKBENCH NAVIGATION TABS */}
      <nav className="flex flex-wrap items-center gap-1.5 rounded-xl border border-cyan-800/60 bg-[#06182b] p-2">
        {(
          [
            ['P2P', 'Point-to-Point (P2P) Console', Zap],
            ['TESTS', `Live Test Runner (${passedTestsCount}/${totalAutoAndStoreTests})`, Play],
            ['PUNCH', `Punch List & Sign-Off (${openPunchItems.length})`, Wrench],
            ['REPORT', 'Evidence Report (PDF / CSV)', FileText],
            ['SOP', '18-Step SOP Guide (EN/TE)', BookOpen],
          ] as const
        ).map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-extrabold transition ${
              activeTab === id
                ? 'border-cyan-300 bg-cyan-400 text-[#031424] shadow-[0_0_12px_rgba(0,229,255,0.4)]'
                : 'border-cyan-900/80 bg-[#092038] text-cyan-100 hover:border-cyan-500/60'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {/* ==================== TAB 1: LIVE POINT-TO-POINT (P2P) SIGNAL VERIFICATION CONSOLE ==================== */}
      {activeTab === 'P2P' && activeBay && proto && (
        <section className="space-y-4">
          {/* Bay Selector + Active Bay Live Telemetry */}
          <div className="rounded-2xl border border-cyan-700/50 bg-[#071a2f] p-4 space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <label className="min-w-[240px] flex-1 max-w-md space-y-1 text-xs">
                <span className="font-bold uppercase tracking-wider text-cyan-300">
                  Select Bay Under {mode} Test
                </span>
                <select
                  value={activeBay.id}
                  onChange={(e) => setSelectedBayId(e.target.value)}
                  className="w-full rounded-lg border border-cyan-600/60 bg-[#041222] px-3 py-2 text-sm font-bold text-white"
                >
                  {bays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bayCode} — {b.name} ({b.voltageKv} kV · {b.iedId})
                    </option>
                  ))}
                </select>
              </label>

              <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                <button
                  type="button"
                  onClick={() =>
                    setBayLocalRemote(
                      activeBay.id,
                      activeBay.localRemote === 'REMOTE' ? 'LOCAL' : 'REMOTE'
                    )
                  }
                  className={`rounded-lg border px-3 py-2 font-bold ${
                    activeBay.localRemote === 'REMOTE'
                      ? 'border-emerald-500/60 bg-emerald-950/50 text-emerald-300'
                      : 'border-amber-500 bg-amber-950/60 text-amber-200'
                  }`}
                >
                  43LR: {activeBay.localRemote} (Toggle)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    resetProtectionTrip(activeBay.id);
                    if (activeBay.bayType === 'OUTGOING_FEEDER') resetRecloseDemo86(activeBay.id);
                    acknowledgeAllAlarms();
                    setLastActionBanner({
                      type: 'INFO',
                      text: `Reset 86 lockout & acknowledged alarms for ${activeBay.bayCode}.`,
                    });
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-cyan-600/60 bg-[#0a2742] px-3 py-2 font-bold text-cyan-200 hover:bg-[#10385c]"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset 86 / Ack Alarms
                </button>
              </div>
            </div>

            {/* LIVE END-TO-END SIGNAL CHAIN VISUALIZER */}
            <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
              {signalChainNodes.map((node, idx) => (
                <div
                  key={node.name}
                  className={`rounded-xl border p-2.5 text-xs ${
                    node.ok
                      ? 'border-emerald-500/50 bg-emerald-950/25'
                      : 'border-rose-500 bg-rose-950/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="font-mono text-[10px] font-bold text-slate-400">
                      STAGE {idx + 1}
                    </span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9.5px] font-extrabold ${
                        node.ok ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/30 text-rose-200'
                      }`}
                    >
                      {node.ok ? 'HEALTHY' : 'FAULT'}
                    </span>
                  </div>
                  <div className="mt-1 font-bold text-white leading-snug">{node.name}</div>
                  <div className="mt-0.5 font-mono text-[10.5px] text-cyan-200">{node.detail}</div>
                </div>
              ))}
            </div>

            {/* P2P INTERACTIVE VERIFICATION TABLE */}
            <div className="overflow-x-auto rounded-xl border border-cyan-800/60 bg-[#041222]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#09233d] text-cyan-200 uppercase text-[10.5px]">
                  <tr>
                    <th className="p-2.5">Signal / Point</th>
                    <th className="p-2.5">IEC 61850 MMS / GOOSE Ref</th>
                    <th className="p-2.5">Gateway IOA / Map</th>
                    <th className="p-2.5">Live Store Value</th>
                    <th className="p-2.5">P2P Status</th>
                    <th className="p-2.5 text-right">Live Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-950">
                  {p2pEntriesForBay.map((pt) => {
                    const res = p2pResults[`${activeBay.id}:${pt.key}`];
                    return (
                      <tr key={pt.key} className="hover:bg-[#081f36]">
                        <td className="p-2.5">
                          <div className="font-bold text-white">{pt.label}</div>
                          <div className="text-[10.5px] text-slate-400">{pt.group}</div>
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-cyan-300 break-all">
                          {pt.signalRef}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-purple-300">
                          {pt.ioaOrMap}
                        </td>
                        <td className="p-2.5 font-mono text-[11px] text-emerald-300 font-bold">
                          {pt.liveVal}
                        </td>
                        <td className="p-2.5">
                          {res ? (
                            <div>
                              <span
                                className={`inline-block rounded px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                                  res.status === 'PASS'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/50'
                                }`}
                              >
                                {res.status} · {res.timestamp}
                              </span>
                              <div className="mt-0.5 text-[10px] text-slate-300 max-w-[220px]">
                                {res.note}
                              </div>
                            </div>
                          ) : (
                            <span className="font-mono text-[10px] text-slate-400">NOT TESTED</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right whitespace-nowrap space-x-1.5">
                          <button
                            type="button"
                            onClick={() => runP2pPointTest(pt.key)}
                            className="rounded-lg bg-cyan-400 hover:bg-cyan-300 px-2.5 py-1.5 text-[11px] font-extrabold text-[#031424]"
                          >
                            {pt.key === 'ANALOG_MW'
                              ? 'Verify GI'
                              : pt.key === 'TRIP_86'
                              ? activeBay.protectionTripActive
                                ? 'Reset 86'
                                : 'Inject Trip'
                              : 'Operate & Verify'}
                          </button>
                          {res?.status === 'FAIL' && (
                            <button
                              type="button"
                              onClick={() =>
                                addPunchItem('CAT_A', activeBay.bayCode, `P2P Fail (${pt.label}): ${res.note}`)
                              }
                              className="rounded-lg border border-rose-400 bg-rose-950/70 px-2 py-1.5 text-[10.5px] font-bold text-rose-200 hover:bg-rose-900"
                            >
                              + Punch
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* LIVE FAULT INJECTION QUICK-TOGGLES (FOR REALISTIC TROUBLESHOOTING DURING P2P) */}
          <div className="rounded-2xl border border-amber-600/40 bg-[#081a2c] p-4 space-y-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-amber-300">
                <AlertTriangle className="w-4 h-4" />
                <span>Inject Live Faults to Test {mode} Failure Detection</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Toggle any fault below, then re-run P2P or Live Tests to see real-time FAIL & Punch List behavior.
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {faultScenarios.slice(0, 8).map((flt) => (
                <button
                  key={flt.id}
                  type="button"
                  onClick={() => toggleFaultScenario(flt.id)}
                  className={`rounded-xl border p-2.5 text-left text-xs transition ${
                    flt.active
                      ? 'border-rose-500 bg-rose-950/50 text-rose-100'
                      : 'border-cyan-900/70 bg-[#041222] text-slate-300 hover:border-cyan-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-bold text-cyan-300">{flt.code}</span>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[9px] font-extrabold ${
                        flt.active ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {flt.active ? 'ACTIVE' : 'OFF'}
                    </span>
                  </div>
                  <div className="mt-1 font-bold text-white truncate">{flt.title}</div>
                  <div className="text-[10px] text-slate-400 truncate">{flt.targetBayOrIed}</div>
                </button>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ==================== TAB 2: AUTO-VERIFIED LIVE TEST RUNNER + 1ms SOE ==================== */}
      {activeTab === 'TESTS' && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-cyan-700/50 bg-[#071a2f] p-3.5">
            <div>
              <h2 className="text-sm sm:text-base font-extrabold text-white">
                Auto-Verified Live Commissioning Test Suite ({mode} Mode · Bay: {activeBay?.bayCode})
              </h2>
              <p className="text-xs text-slate-300">
                Every "Run Live Test" button executes real actions on the substation simulator and auto-checks state, alarms, and 1ms SOE.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setHowToTestModal('WORKBENCH')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/70 bg-cyan-500/15 hover:bg-cyan-400 hover:text-[#031424] px-3 py-2 text-xs font-extrabold text-cyan-200 transition"
              >
                <HelpCircle className="w-3.5 h-3.5" /> How to Test
              </button>
              <button
                type="button"
                onClick={runAllAutoAndStoreTests}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 px-3.5 py-2 text-xs font-extrabold text-[#031c14]"
              >
                <Play className="w-3.5 h-3.5" /> Execute Full {mode} Test Suite
              </button>
              <button
                type="button"
                onClick={exportCompletedTestsCsv}
                disabled={totalCompletedCount === 0}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-extrabold transition ${
                  totalCompletedCount > 0
                    ? 'border-emerald-300 bg-emerald-500/20 text-emerald-200 hover:bg-emerald-400 hover:text-[#031c14] shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                    : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-3.5 h-3.5" /> Download Completed Tests ({totalCompletedCount})
              </button>
            </div>
          </div>

          {totalCompletedCount > 0 && (
            <div
              className={`rounded-xl border px-4 py-3 flex flex-wrap items-center justify-between gap-3 text-xs ${
                allSuiteTestsCompleted
                  ? 'border-emerald-400/80 bg-emerald-950/45 text-emerald-100'
                  : 'border-cyan-500/50 bg-[#072038] text-cyan-100'
              }`}
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className={`w-4 h-4 shrink-0 ${allSuiteTestsCompleted ? 'text-emerald-300' : 'text-cyan-300'}`} />
                <div>
                  <span className="font-extrabold text-white">
                    {allSuiteTestsCompleted
                      ? `All ${totalAutoAndStoreTests} ${mode} Suite Tests Completed!`
                      : `${completedSuiteCount} of ${totalAutoAndStoreTests} Suite Tests Completed`}
                  </span>
                  <span className="ml-2 font-mono text-[11px] opacity-90">
                    (Total Completed incl. P2P: {totalCompletedCount} · Passed: {passedTestsCount} · Failed: {failedTestsCount})
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={exportCompletedTestsCsv}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 px-3 py-1.5 text-xs font-extrabold text-[#031c14]"
                >
                  <Download className="w-3.5 h-3.5" /> Download Completed ({totalCompletedCount}) CSV
                </button>
                <button
                  type="button"
                  onClick={downloadOfficialPdfFile}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 text-xs font-extrabold text-[#031424]"
                >
                  <Download className="w-3.5 h-3.5" /> Download PDF Report
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {autoTests.map((tc) => (
              <div
                key={tc.id}
                className={`rounded-xl border p-4 space-y-2.5 ${
                  tc.status === 'PASS'
                    ? 'border-emerald-500/50 bg-[#061f22]'
                    : tc.status === 'FAIL'
                    ? 'border-rose-500 bg-[#230b14]'
                    : 'border-cyan-800/60 bg-[#071a2f]'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
                      <span className="rounded bg-cyan-950 px-1.5 py-0.5 text-cyan-300 font-bold">{tc.code}</span>
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-slate-300">{tc.category}</span>
                      <span className="rounded bg-indigo-950 px-1.5 py-0.5 text-indigo-300">{tc.modeScope}</span>
                    </div>
                    <h3 className="mt-1 text-sm font-extrabold text-white">{tc.title}</h3>
                    <div className="text-[10.5px] font-mono text-slate-400">{tc.standardRef}</div>
                  </div>
                  <span
                    className={`shrink-0 rounded-md px-2 py-0.5 font-mono text-[10.5px] font-extrabold ${
                      tc.status === 'PASS'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50'
                        : tc.status === 'FAIL'
                        ? 'bg-rose-500/25 text-rose-200 border border-rose-500'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tc.status}
                  </span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{tc.description}</p>

                <div className="rounded-lg border border-cyan-900/70 bg-[#041222] p-2.5 font-mono text-[11px] text-cyan-100">
                  <span className="text-slate-400">Evidence ({tc.timestamp}): </span>
                  {tc.actualEvidence}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => executeAutoTest(tc.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 px-3 py-1.5 text-xs font-extrabold text-[#031424]"
                    >
                      <Play className="w-3.5 h-3.5" /> Run Live Test
                    </button>
                    <button
                      type="button"
                      onClick={() => setHowToTestModal(tc.id)}
                      className="inline-flex items-center gap-1 rounded-full border border-cyan-400/60 bg-cyan-950/70 hover:bg-cyan-500/25 px-2.5 py-1 text-[11px] font-bold text-cyan-200 transition"
                    >
                      <HelpCircle className="w-3 h-3" /> How to Test
                    </button>
                  </div>
                  {tc.status === 'FAIL' && (
                    <button
                      type="button"
                      onClick={() =>
                        addPunchItem(
                          'CAT_A',
                          activeBay?.bayCode || 'STATION',
                          `${tc.code} Failed: ${tc.actualEvidence}`,
                          tc.id
                        )
                      }
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-400 bg-rose-950/70 px-2.5 py-1.5 text-xs font-bold text-rose-200 hover:bg-rose-900"
                    >
                      <Plus className="w-3.5 h-3.5" /> Log Cat-A Punch Point
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* STORE PROTOCOL COMPLIANCE TEST CASES */}
          <div className="rounded-2xl border border-cyan-800/60 bg-[#071a2f] p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-cyan-300 uppercase tracking-wider">
              Substation Store Protocol & Compliance Checks ({fatSatTests.length})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-cyan-900/70 bg-[#041222]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="bg-[#09233d] text-cyan-200 text-[10.5px] uppercase">
                  <tr>
                    <th className="p-2.5">Code</th>
                    <th className="p-2.5">Test Title</th>
                    <th className="p-2.5">Standard</th>
                    <th className="p-2.5">Status</th>
                    <th className="p-2.5">Simulated Result</th>
                    <th className="p-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-950">
                  {fatSatTests.map((t) => (
                    <tr key={t.id} className="hover:bg-[#081f36]">
                      <td className="p-2.5 font-mono font-bold text-cyan-300">{t.testCode}</td>
                      <td className="p-2.5 font-semibold text-white">{t.title}</td>
                      <td className="p-2.5 font-mono text-[10.5px] text-slate-400">{t.standardRef}</td>
                      <td className="p-2.5">
                        <span
                          className={`rounded px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                            t.status === 'PASS'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : t.status === 'FAIL'
                              ? 'bg-rose-500/25 text-rose-200'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="p-2.5 font-mono text-[10.5px] text-slate-300">
                        {t.actualSimulatedResult || t.evidenceLog || 'Not executed'}
                      </td>
                      <td className="p-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => runFatSatTest(t.id)}
                          className="rounded-lg border border-cyan-500/60 bg-[#0a2742] px-2.5 py-1 text-[11px] font-bold text-cyan-200 hover:bg-cyan-400 hover:text-[#031424]"
                        >
                          Run
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* LIVE 1ms SOE VERIFICATION FEED */}
          <div className="rounded-2xl border border-cyan-800/60 bg-[#071a2f] p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-extrabold text-cyan-300">
                <Activity className="w-4 h-4" /> Live Millisecond Sequence of Events (SOE — Latest 12)
              </h3>
              <span className="font-mono text-[11px] text-slate-400">Auto-updates on every test run</span>
            </div>
            <div className="max-h-60 overflow-y-auto rounded-xl border border-cyan-900/70 bg-[#041222]">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead className="bg-[#09233d] text-slate-300 sticky top-0">
                  <tr>
                    <th className="p-2">Timestamp (ms)</th>
                    <th className="p-2">Bay / IED</th>
                    <th className="p-2">Event</th>
                    <th className="p-2">Cause</th>
                    <th className="p-2">Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-cyan-950">
                  {soeLog.slice(0, 12).map((s) => (
                    <tr key={s.id}>
                      <td className="p-2 text-cyan-300 whitespace-nowrap">{s.timestampMs.split('T')[1] || s.timestampMs}</td>
                      <td className="p-2 text-white">{s.bayName} ({s.iedId})</td>
                      <td className="p-2 text-slate-200 font-sans">{s.eventDescription}</td>
                      <td className="p-2 text-amber-300">{s.cause}</td>
                      <td className="p-2 text-emerald-300">{s.quality}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ==================== TAB 3: REAL-TIME PUNCH LIST (CAT A/B/C) & WITNESS SIGN-OFF ==================== */}
      {activeTab === 'PUNCH' && (
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-8 space-y-4">
            {/* Add Punch Point Form */}
            <div className="rounded-2xl border border-cyan-800/60 bg-[#071a2f] p-4 space-y-3">
              <h2 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Wrench className="w-4 h-4 text-amber-300" /> Log New {mode} Punch Point (Defect Register)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 text-xs">
                <select
                  value={newPunchCat}
                  onChange={(e) => setNewPunchCat(e.target.value as PunchCategory)}
                  className="sm:col-span-4 rounded-lg border border-cyan-700/60 bg-[#041222] px-2.5 py-2 font-bold text-white"
                >
                  <option value="CAT_A">CAT A — Blocker (Prevents Sign-Off)</option>
                  <option value="CAT_B">CAT B — Minor (Clear Before Energization)</option>
                  <option value="CAT_C">CAT C — Cosmetic / Labeling</option>
                </select>
                <input
                  type="text"
                  value={newPunchDesc}
                  onChange={(e) => setNewPunchDesc(e.target.value)}
                  placeholder={`Describe defect on ${activeBay?.bayCode || 'Bay'} (e.g., Wrong alarm priority / IOA mismatch)...`}
                  className="sm:col-span-6 rounded-lg border border-cyan-700/60 bg-[#041222] px-3 py-2 text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newPunchDesc.trim()) return;
                    addPunchItem(newPunchCat, activeBay?.bayCode || 'STATION', newPunchDesc.trim());
                    setNewPunchDesc('');
                  }}
                  className="sm:col-span-2 rounded-lg bg-amber-400 hover:bg-amber-300 px-3 py-2 font-extrabold text-[#1f1302]"
                >
                  + Add
                </button>
              </div>
            </div>

            {/* Punch List Table */}
            <div className="rounded-2xl border border-cyan-800/60 bg-[#071a2f] p-4 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-extrabold text-cyan-300">
                  Commissioning Punch List ({punchList.length} Total · {openPunchItems.length} Open)
                </h3>
              </div>
              {punchList.length === 0 ? (
                <div className="rounded-xl border border-emerald-700/50 bg-emerald-950/30 p-5 text-center text-xs text-emerald-200">
                  Zero open punch points. All tested circuits healthy or no defects logged yet.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-cyan-900/70 bg-[#041222]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="bg-[#09233d] text-cyan-200 text-[10.5px] uppercase">
                      <tr>
                        <th className="p-2.5">ID</th>
                        <th className="p-2.5">Cat</th>
                        <th className="p-2.5">Bay / IED</th>
                        <th className="p-2.5">Description</th>
                        <th className="p-2.5">Status</th>
                        <th className="p-2.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-cyan-950">
                      {punchList.map((p) => (
                        <tr key={p.id}>
                          <td className="p-2.5 font-mono font-bold text-cyan-300">{p.id}</td>
                          <td className="p-2.5">
                            <span
                              className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${
                                p.category === 'CAT_A'
                                  ? 'bg-rose-500/25 text-rose-200 border border-rose-500'
                                  : p.category === 'CAT_B'
                                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500'
                                  : 'bg-sky-500/20 text-sky-200 border border-sky-500/50'
                              }`}
                            >
                              {p.category.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="p-2.5 font-mono text-white">{p.bayOrIed}</td>
                          <td className="p-2.5 text-slate-200">{p.description}</td>
                          <td className="p-2.5">
                            <span
                              className={`rounded px-2 py-0.5 font-mono text-[10px] font-extrabold ${
                                p.status === 'CLOSED'
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-rose-500/25 text-rose-200'
                              }`}
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="p-2.5 text-right whitespace-nowrap space-x-1">
                            {p.status === 'OPEN' ? (
                              <button
                                type="button"
                                onClick={() => {
                                  if (p.linkedTestId) {
                                    executeAutoTest(p.linkedTestId);
                                  } else {
                                    setPunchList((prev) =>
                                      prev.map((x) =>
                                        x.id === p.id ? { ...x, status: 'CLOSED', closedAt: formatClock() } : x
                                      )
                                    );
                                  }
                                }}
                                className="rounded bg-emerald-500/25 border border-emerald-400 px-2 py-1 text-[10.5px] font-bold text-emerald-200 hover:bg-emerald-500/40"
                              >
                                {p.linkedTestId ? 'Re-Test & Close' : 'Mark Closed'}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setPunchList((prev) =>
                                    prev.map((x) => (x.id === p.id ? { ...x, status: 'OPEN', closedAt: undefined } : x))
                                  )
                                }
                                className="rounded bg-slate-800 px-2 py-1 text-[10.5px] text-slate-300 hover:bg-slate-700"
                              >
                                Re-Open
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => setPunchList((prev) => prev.filter((x) => x.id !== p.id))}
                              className="rounded p-1 text-slate-400 hover:text-rose-300"
                              aria-label="Delete punch item"
                            >
                              <Trash2 className="w-3.5 h-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Witness Sign-Off Card */}
          <div className="lg:col-span-4 rounded-2xl border border-cyan-700/50 bg-[#071a2f] p-4 space-y-3 h-fit">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Witness Sign-Off & Release Readiness
            </h3>
            <div className="space-y-2.5 text-xs">
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Project Reference</span>
                <input
                  type="text"
                  value={projectRef}
                  onChange={(e) => setProjectRef(e.target.value)}
                  className="w-full rounded-lg border border-cyan-800 bg-[#041222] px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Commissioning Engineer</span>
                <input
                  type="text"
                  value={testerName}
                  onChange={(e) => setTesterName(e.target.value)}
                  className="w-full rounded-lg border border-cyan-800 bg-[#041222] px-2.5 py-1.5 text-white"
                />
              </label>
              <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Customer / Utility Witness</span>
                <input
                  type="text"
                  value={witnessName}
                  onChange={(e) => setWitnessName(e.target.value)}
                  className="w-full rounded-lg border border-cyan-800 bg-[#041222] px-2.5 py-1.5 text-white"
                />
              </label>
            </div>

            <div
              className={`rounded-xl border p-3 text-xs ${
                openCatACount > 0 || failedTestsCount > 0
                  ? 'border-rose-500 bg-rose-950/50 text-rose-100'
                  : 'border-emerald-500/60 bg-emerald-950/40 text-emerald-100'
              }`}
            >
              <div className="font-extrabold uppercase tracking-wider">
                {openCatACount > 0 || failedTestsCount > 0
                  ? 'RELEASE BLOCKED (CAT-A / FAILURES OPEN)'
                  : `READY FOR ${mode} WITNESS SIGN-OFF`}
              </div>
              <p className="mt-1 text-[11px] opacity-90">
                {openCatACount > 0 || failedTestsCount > 0
                  ? `Clear ${openCatACount} Cat-A punch point(s) and ${failedTestsCount} failed test(s) before releasing.`
                  : 'Zero Category-A blockers. Export the evidence-backed PDF/CSV protocol report below.'}
              </p>
            </div>

            <button
              type="button"
              onClick={downloadOfficialPdfFile}
              className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-cyan-400 hover:bg-cyan-300 px-3 py-2 text-xs font-extrabold text-[#031424]"
            >
              <Download className="w-4 h-4" /> Download Official {mode} PDF Report
            </button>
          </div>
        </section>
      )}

      {/* ==================== TAB 4: LIVE EVIDENCE REPORT PREVIEW & EXPORT ==================== */}
      {activeTab === 'REPORT' && (
        <section className="rounded-2xl border border-cyan-700/50 bg-[#071a2f] p-4 sm:p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-cyan-900 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-extrabold text-white">
                {mode} Commissioning Evidence Protocol Report — {projectRef}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                Tester: {testerName} · Witness: {witnessName} · Live SOE & Test Store Snapshot
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={downloadOfficialPdfFile}
                className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-400 hover:bg-cyan-300 px-3.5 py-2 text-xs font-extrabold text-[#031424] shadow-[0_0_12px_rgba(0,229,255,0.35)]"
              >
                <Download className="w-3.5 h-3.5" /> Download PDF Report
              </button>
              <button
                type="button"
                onClick={exportOfficialPdfReport}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/60 bg-[#0a2742] px-3 py-2 text-xs font-bold text-cyan-100 hover:bg-[#11395e]"
              >
                <Printer className="w-3.5 h-3.5" /> Print View
              </button>
              <button
                type="button"
                onClick={exportCompletedTestsCsv}
                disabled={totalCompletedCount === 0}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-xs font-extrabold transition ${
                  totalCompletedCount > 0
                    ? 'border-emerald-300 bg-emerald-400 hover:bg-emerald-300 text-[#031c14]'
                    : 'border-slate-700 bg-slate-900/60 text-slate-500 cursor-not-allowed'
                }`}
              >
                <Download className="w-3.5 h-3.5" /> Download Completed Tests ({totalCompletedCount})
              </button>
              <button
                type="button"
                onClick={exportCsvPackage}
                className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-500/60 bg-[#0a2742] px-3.5 py-2 text-xs font-bold text-cyan-100 hover:bg-[#11395e]"
              >
                <Download className="w-3.5 h-3.5" /> Export Full CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="rounded-xl border border-cyan-900/70 bg-[#041222] p-3.5 space-y-2">
              <h3 className="font-bold text-cyan-300 uppercase">P2P Signals Verified ({Object.keys(p2pResults).length})</h3>
              {Object.values(p2pResults).length === 0 ? (
                <p className="text-slate-400">Run checks in the P2P Console tab to populate signal evidence.</p>
              ) : (
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {Object.values(p2pResults).map((r, i) => (
                    <div key={i} className="flex items-center justify-between gap-2 border-b border-cyan-950 pb-1">
                      <span className="text-white truncate">{r.label}</span>
                      <span className={`font-mono font-bold ${r.status === 'PASS' ? 'text-emerald-300' : 'text-rose-300'}`}>
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-cyan-900/70 bg-[#041222] p-3.5 space-y-2">
              <h3 className="font-bold text-cyan-300 uppercase">Live Commissioning Tests ({passedTestsCount}/{totalAutoAndStoreTests} Passed)</h3>
              <div className="space-y-1.5 max-h-56 overflow-y-auto">
                {autoTests.map((t) => (
                  <div key={t.id} className="flex items-center justify-between gap-2 border-b border-cyan-950 pb-1">
                    <span className="text-white truncate">{t.code} — {t.title}</span>
                    <span className={`font-mono font-bold ${t.status === 'PASS' ? 'text-emerald-300' : t.status === 'FAIL' ? 'text-rose-300' : 'text-slate-400'}`}>
                      {t.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ==================== TAB 5: COMPLETE 18-STEP SOP GUIDE (EN/TE — PRESERVED) ==================== */}
      {activeTab === 'SOP' && (
        <section className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-cyan-800/60 bg-[#0a2237] p-5">
              <h2 className="text-lg font-bold text-cyan-300">FAT అంటే ఏమిటి?</h2>
              <p className="mt-2 leading-7 text-slate-300 text-sm">
                <strong>Factory Acceptance Test:</strong> Panels, IED configuration, communications, SCADA, GOOSE, alarms, controls వంటి engineered functions ని factory/lab setup లో approved test cases తో verify చేస్తాం. Shipping/site installation కు ముందు design defects గుర్తించడం ప్రధాన purpose.
              </p>
            </div>
            <div className="rounded-xl border border-cyan-800/60 bg-[#0a2237] p-5">
              <h2 className="text-lg font-bold text-cyan-300">SAT అంటే ఏమిటి?</h2>
              <p className="mt-2 leading-7 text-slate-300 text-sm">
                <strong>Site Acceptance Test:</strong> Equipment install చేసిన తరువాత actual field wiring, network, SCADA/RCC integration, control interlocks and end-to-end signals ని site లో safely verify చేస్తాం. FAT pass అయినా SAT తప్పనిసరిగా ఉండవచ్చు.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="flex items-center gap-2 text-lg font-bold text-white">
              <ClipboardCheck className="text-cyan-400" /> Starting to Ending — 18-Step Commissioning SOP
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-[#123a51]"
                onClick={() => setOpenPhases(phases.map((_, i) => i))}
              >
                Expand All
              </button>
              <button
                type="button"
                className="rounded-lg border border-cyan-700 px-3 py-1.5 text-xs font-bold text-cyan-200 hover:bg-[#123a51]"
                onClick={() => setOpenPhases([])}
              >
                Collapse All
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {phases.map((phase, i) => (
              <section key={phase.title} className="overflow-hidden rounded-xl border border-cyan-800/60 bg-[#091d31]">
                <button
                  type="button"
                  onClick={() => togglePhase(i)}
                  aria-expanded={openPhases.includes(i)}
                  className="flex w-full items-center justify-between gap-4 p-4 text-left hover:bg-[#12344a]"
                >
                  <span>
                    <span className="block text-base font-bold text-cyan-300">{phase.title}</span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-300">{phase.description}</span>
                  </span>
                  <ChevronDown className={`shrink-0 text-cyan-300 transition-transform ${openPhases.includes(i) ? 'rotate-180' : ''}`} />
                </button>
                {openPhases.includes(i) && (
                  <div className="space-y-4 border-t border-cyan-900 p-4">
                    {phase.steps.map((step) => (
                      <article key={step.title} className="rounded-xl border border-[#1b4863] bg-[#071726] p-4">
                        <h3 className="text-sm font-bold text-white md:text-base">{step.title}</h3>
                        <p className="mt-1.5 text-xs sm:text-sm leading-6 text-slate-300">
                          <span className="font-semibold text-cyan-300">Why:</span> {step.why}
                        </p>
                        <ol className="mt-2 list-decimal space-y-1.5 pl-5 text-xs sm:text-sm leading-6 text-slate-200">
                          {step.actions.map((action, j) => (
                            <li key={j}>{action}</li>
                          ))}
                        </ol>
                        {(() => {
                          const stepNumber = Number(step.title.match(/^\d+/)?.[0] ?? '0');
                          const p = practical[stepNumber - 1];
                          return p ? (
                            <div className="mt-3 space-y-1.5 rounded-lg border border-cyan-800/70 bg-[#0b2539] p-3 text-xs">
                              <div className="font-bold text-cyan-300">Practical Substation Example</div>
                              <p className="text-slate-200"><strong className="text-white">Example:</strong> {p.example}</p>
                              <p className="text-slate-200"><strong className="text-white">Tools:</strong> {p.tools}</p>
                              <p className="text-slate-200"><strong className="text-white">Procedure:</strong> {p.procedure}</p>
                              <p className="text-slate-200"><strong className="text-white">Expected:</strong> {p.expected}</p>
                            </div>
                          ) : null;
                        })()}
                        <p className="mt-3 flex items-start gap-2 rounded-lg border border-emerald-800/50 bg-[#092a2a] p-2.5 text-xs text-emerald-200">
                          <CheckCircle2 className="mt-0.5 shrink-0" size={15} />
                          <span><strong>Evidence / Output:</strong> {step.evidence}</span>
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        </section>
      )}

      {/* ==================== HOW TO TEST — STEP-BY-STEP POPUP MODAL ==================== */}
      {howToTestModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="How to Test — Step-by-Step Guide"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setHowToTestModal(null);
          }}
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 backdrop-blur-md p-3 sm:p-5"
        >
          <div className="w-full max-w-2xl max-h-[88vh] flex flex-col overflow-hidden rounded-2xl border border-cyan-400/70 bg-[#06182c]/95 shadow-[0_0_40px_rgba(0,212,255,0.28)] text-slate-100">
            {/* Modal Header */}
            <div className="flex items-center justify-between gap-3 border-b border-cyan-800/70 bg-[#092440] px-4 sm:px-5 py-3.5 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <HelpCircle className="w-5 h-5 text-cyan-300 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-300">
                    FAT / SAT Step-by-Step Testing Guide
                  </div>
                  <h2 className="text-sm sm:text-base font-extrabold text-white truncate">
                    {howToTestModal === 'WORKBENCH'
                      ? 'Complete Workbench — Step-by-Step How to Test'
                      : `${TEST_PROCEDURES[howToTestModal]?.code || ''} — ${TEST_PROCEDURES[howToTestModal]?.title || 'Test Procedure'}`}
                  </h2>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close How to Test popup"
                onClick={() => setHowToTestModal(null)}
                className="rounded-lg border border-cyan-700/70 bg-[#041426] p-1.5 text-cyan-200 hover:bg-cyan-500/20 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Switcher Pills inside Modal */}
            <div className="flex flex-wrap items-center gap-1.5 border-b border-cyan-900/70 bg-[#041324] px-4 py-2 text-[11px] shrink-0">
              <button
                type="button"
                onClick={() => setHowToTestModal('WORKBENCH')}
                className={`rounded-full border px-2.5 py-1 font-bold transition ${
                  howToTestModal === 'WORKBENCH'
                    ? 'border-cyan-300 bg-cyan-400 text-[#031424]'
                    : 'border-cyan-800 bg-[#082038] text-cyan-200 hover:border-cyan-400'
                }`}
              >
                Full Workbench (6 Steps)
              </button>
              {autoTests.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setHowToTestModal(t.id)}
                  className={`rounded-full border px-2.5 py-1 font-mono font-bold transition ${
                    howToTestModal === t.id
                      ? 'border-emerald-300 bg-emerald-400 text-[#031c14]'
                      : 'border-cyan-900 bg-[#082038] text-slate-300 hover:border-cyan-400 hover:text-white'
                  }`}
                >
                  {t.code}
                </button>
              ))}
            </div>

            {/* Modal Scrollable Body */}
            <div className="overflow-y-auto p-4 sm:p-5 space-y-3.5 text-xs sm:text-sm">
              {howToTestModal === 'WORKBENCH' ? (
                <>
                  <p className="text-xs text-cyan-200/90 leading-relaxed">
                    Real substation FAT/SAT commissioning sequence lo ee 6 steps follow ayyi live P2P verification, interlock testing, fault troubleshooting, mariyu official PDF report generate cheyandi:
                  </p>
                  <div className="space-y-2.5">
                    {WORKBENCH_HOW_TO_STEPS.map((item) => (
                      <div
                        key={item.step}
                        className="flex items-start gap-3 rounded-xl border border-cyan-800/60 bg-[#081f36] p-3"
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-400 font-mono text-xs font-black text-[#031424]">
                          {item.step}
                        </span>
                        <div className="min-w-0">
                          <div className="font-extrabold text-white text-xs sm:text-sm">
                            Step {item.step}: {item.title}
                          </div>
                          <p className="mt-1 text-xs text-slate-300 leading-relaxed">{item.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                (() => {
                  const guide = TEST_PROCEDURES[howToTestModal];
                  if (!guide) return null;
                  return (
                    <div className="space-y-3.5">
                      <div className="rounded-xl border border-cyan-800/60 bg-[#081f36] p-3">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                          Preconditions (Test Mundu Check Cheyalsinavi)
                        </div>
                        <ul className="mt-1.5 list-disc space-y-1 pl-5 text-xs text-slate-200">
                          {guide.preconditions.map((pre, idx) => (
                            <li key={idx}>{pre}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="space-y-2">
                        <div className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-300">
                          Step-by-Step Execution Procedure
                        </div>
                        {guide.steps.map((st, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2.5 rounded-xl border border-cyan-900/70 bg-[#041426] p-2.5"
                          >
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-400 font-mono text-[11px] font-black text-[#031c14] mt-0.5">
                              {idx + 1}
                            </span>
                            <span className="text-xs text-slate-200 leading-relaxed">{st}</span>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl border border-emerald-500/50 bg-emerald-950/35 p-3 text-xs">
                        <div className="font-extrabold uppercase tracking-wider text-emerald-300">
                          Expected PASS Criteria
                        </div>
                        <p className="mt-1 text-emerald-100 leading-relaxed">{guide.passCriteria}</p>
                      </div>

                      <div className="rounded-xl border border-amber-500/50 bg-amber-950/30 p-3 text-xs">
                        <div className="font-extrabold uppercase tracking-wider text-amber-300">
                          Commissioning / Fault Tip
                        </div>
                        <p className="mt-1 text-amber-100 leading-relaxed">{guide.faultCheckTip}</p>
                      </div>
                    </div>
                  );
                })()
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-cyan-900/70 bg-[#041324] px-4 py-3 shrink-0">
              <span className="text-[11px] text-slate-400">
                Press <kbd className="rounded border border-slate-600 bg-slate-800 px-1.5 py-0.5 font-mono text-[10px] text-slate-200">Esc</kbd> to close
              </span>
              <div className="flex items-center gap-2">
                {howToTestModal !== 'WORKBENCH' && (
                  <button
                    type="button"
                    onClick={() => {
                      const targetId = howToTestModal;
                      setHowToTestModal(null);
                      setActiveTab('TESTS');
                      executeAutoTest(targetId);
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 px-3.5 py-1.5 text-xs font-extrabold text-[#031c14]"
                  >
                    <Play className="w-3.5 h-3.5" /> Run This Test Now
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setHowToTestModal(null)}
                  className="rounded-lg border border-cyan-600/70 bg-[#0a2742] px-3.5 py-1.5 text-xs font-bold text-cyan-100 hover:bg-[#11395e]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
