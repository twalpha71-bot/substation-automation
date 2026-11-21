import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildIec104TelecontrolTable } from '../data/protocolRegistry';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Database,
  Download,
  FileCode2,
  History,
  Info,
  Layers,
  Pause,
  Pin,
  PinOff,
  Play,
  Radio,
  RotateCcw,
  Send,
  Settings,
  Terminal,
  X,
} from 'lucide-react';

type Iec104LabTab =
  | 'TOPOLOGY_LIVE'
  | 'IOA_MAPPING'
  | 'GI_SEQUENCE'
  | 'REMOTE_COMMANDS'
  | 'APCI_ANALYZER'
  | 'LOGS_DIAGNOSTICS';

type SimSpeed = 0.1 | 0.25 | 0.5 | 1 | 2 | 4;
type SimPhase = 'MMS_IN' | 'CONVERT' | 'WAN_TX';
type TestCategory = 'ALL' | 'A_UFRAME' | 'B_MMS' | 'C_CONV' | 'D_CMD' | 'E_WAN';

interface Iec61850IedSpec {
  id: 'P1' | 'P2' | 'P3' | 'P4';
  portNum: 1 | 2 | 3 | 4;
  shortName: string;
  fullName: string;
  iedName: string;
  deviceType: string;
  ip: string;
  protocol: string;
  lnRef: string;
  rcbName: string;
  dataset: string;
  signals: string;
  image: string;
  ioa: number;
  iec104Type: string;
  typeIdNum: number;
  baseValue: string;
  unit: string;
}

interface Iec104TestDef {
  num: number;
  id: string;
  name: string;
  cat: Exclude<TestCategory, 'ALL'>;
  isFault: boolean;
  safeBatch: boolean;
  expectedResult: string;
}

interface Iec104TestRuntime {
  enabled: boolean;
  status: 'IDLE' | 'PASSED' | 'FAILED';
  actualResult: string;
  timestamp: string;
}

interface TestHistoryItem {
  id: number;
  time: string;
  testName: string;
  action: 'ON' | 'OFF' | 'RUN_SAFE' | 'RESET';
  status: 'PASSED' | 'FAILED' | 'IDLE';
  detail: string;
}

interface FrameLogEntry {
  id: number;
  time: string;
  frameType: 'MMS Report' | 'I-Frame' | 'S-Frame' | 'U-Frame';
  direction: string;
  details: string;
  result: 'Success' | 'Delivered' | 'Fault' | 'Timeout';
}

const IEC61850_IEDS: Iec61850IedSpec[] = [
  {
    id: 'P1',
    portNum: 1,
    shortName: '7SA87',
    fullName: 'Siemens SIPROTEC 5 (7SA87)',
    iedName: 'IED_132_L1',
    deviceType: 'Line Distance Protection (IEC 61850)',
    ip: '10.132.10.11',
    protocol: 'IEC 61850 MMS (TCP/102)',
    lnRef: '132_L1/XCBR1.Pos.stVal',
    rcbName: 'BRCB01 (Buffered)',
    dataset: 'dsStatus',
    signals: 'XCBR1.Pos, 21P, 50/51, PTRC.Tr',
    image: 'assets/ieds/siemens-7sa87.webp',
    ioa: 1001,
    iec104Type: 'M_DP_TB_1',
    typeIdNum: 31,
    baseValue: '2 (CLOSED)',
    unit: '',
  },
  {
    id: 'P2',
    portNum: 2,
    shortName: 'RET615',
    fullName: 'ABB Relion RET615',
    iedName: 'IED_132_T1',
    deviceType: 'Transformer Differential (IEC 61850)',
    ip: '10.132.10.12',
    protocol: 'IEC 61850 MMS (TCP/102)',
    lnRef: '132_T1/MMXU1.TotW.mag.f',
    rcbName: 'URCB01 (Unbuffered)',
    dataset: 'dsMeas',
    signals: '87T, TotW, OilTemp, ATCC Tap',
    image: 'assets/ieds/abb-ret615.webp',
    ioa: 3001,
    iec104Type: 'M_ME_TF_1',
    typeIdNum: 36,
    baseValue: '27.34',
    unit: 'MW',
  },
  {
    id: 'P3',
    portNum: 3,
    shortName: 'C264',
    fullName: 'Schneider MiCOM C264',
    iedName: 'IED_132_BC',
    deviceType: 'Bay Control Unit (IEC 61850)',
    ip: '10.132.10.13',
    protocol: 'IEC 61850 MMS (TCP/102)',
    lnRef: '132_BC/XCBR1.Pos.stVal',
    rcbName: 'BRCB02 (Buffered)',
    dataset: 'dsCtrl',
    signals: 'XCBR1, CSWI1, CILO, XSWI',
    image: 'assets/ieds/schneider-c264.webp',
    ioa: 1005,
    iec104Type: 'M_DP_TB_1',
    typeIdNum: 31,
    baseValue: '2 (CLOSED)',
    unit: '',
  },
  {
    id: 'P4',
    portNum: 4,
    shortName: 'GE D60',
    fullName: 'GE Multilin D60',
    iedName: 'IED_33_F03',
    deviceType: 'Line Distance Relay (IEC 61850)',
    ip: '10.132.10.14',
    protocol: 'IEC 61850 MMS (TCP/102)',
    lnRef: '33_F03/MMXU1.A.phsA.cVal',
    rcbName: 'URCB02 (Unbuffered)',
    dataset: 'dsAnalog',
    signals: 'PhV, A.phsA/B/C, Hz, PF',
    image: 'assets/ieds/ge-d60.webp',
    ioa: 3004,
    iec104Type: 'M_ME_TF_1',
    typeIdNum: 36,
    baseValue: '142.8',
    unit: 'A',
  },
];

const IEC104_TESTS: Iec104TestDef[] = [
  // A. Link Layer & U-Frames (6)
  { num: 1, id: 'T01_TCP2404_CONN', name: 'TCP Port 2404 Socket Handshake', cat: 'A_UFRAME', isFault: false, safeBatch: true, expectedResult: 'GTW-01 (ETH1) ↔ RCC/SLDC TCP/2404 established' },
  { num: 2, id: 'T02_STARTDT', name: 'U-Frame STARTDT Act / Con', cat: 'A_UFRAME', isFault: false, safeBatch: true, expectedResult: '0x68 04 07 00 00 00 → Con 0x0B; data transfer active' },
  { num: 3, id: 'T03_STOPDT', name: 'U-Frame STOPDT Standby Mode', cat: 'A_UFRAME', isFault: true, safeBatch: false, expectedResult: 'STOPDT Act confirmed; spontaneous I-frames paused' },
  { num: 4, id: 'T04_TESTFR', name: 'U-Frame TESTFR Keep-Alive (T3=20s)', cat: 'A_UFRAME', isFault: false, safeBatch: true, expectedResult: 'TESTFR Act (0x43) → TESTFR Con (0x83) healthy' },
  { num: 5, id: 'T05_PORT2404_DOWN', name: 'TCP Port 2404 Socket Disconnected', cat: 'A_UFRAME', isFault: true, safeBatch: false, expectedResult: 'WAN TCP/2404 closed; GTW-01 buffers ASDUs locally' },
  { num: 6, id: 'T06_STARTDT_T1_TO', name: 'STARTDT Confirmation Timeout (T1=15s)', cat: 'A_UFRAME', isFault: true, safeBatch: false, expectedResult: 'No STARTDT Con within T1; link reset triggered' },

  // B. IEC 61850 Southbound MMS (6)
  { num: 7, id: 'T07_MMS_ASSOC', name: 'Multi-IED IEC 61850 MMS Association (102)', cat: 'B_MMS', isFault: false, safeBatch: true, expectedResult: 'GTW-01 MMS Client associated with P1–P4 (TCP/102)' },
  { num: 8, id: 'T08_BRCB_REPORT', name: 'BRCB Buffered Status Report (XCBR1)', cat: 'B_MMS', isFault: false, safeBatch: true, expectedResult: 'BRCB01/02 delivers buffered breaker change events' },
  { num: 9, id: 'T09_URCB_MEAS', name: 'URCB Unbuffered Analog Report (MMXU1)', cat: 'B_MMS', isFault: false, safeBatch: true, expectedResult: 'URCB01/02 streams live MW/A/kV measurements' },
  { num: 10, id: 'T10_P2_OFFLINE', name: 'Single IED Offline (P2 ABB RET615)', cat: 'B_MMS', isFault: true, safeBatch: false, expectedResult: 'P2 cable faulted; P1, P3, P4 continue MMS reporting' },
  { num: 11, id: 'T11_SWITCH_DOWN', name: 'Industrial Switch RSP35 Link Down', cat: 'B_MMS', isFault: true, safeBatch: false, expectedResult: 'RSP35 P5 → GTW-01 ETH0 down; Station Bus halted' },
  { num: 12, id: 'T12_MMS_LOST', name: 'IEC 61850 MMS Association Lost', cat: 'B_MMS', isFault: true, safeBatch: false, expectedResult: 'TCP/102 aborted; GTW-01 flags southbound invalid' },

  // C. IEC 61850 -> IEC-104 Conversion (7)
  { num: 13, id: 'T13_XCBR_M_DP_TB_1', name: 'XCBR1.Pos → M_DP_TB_1 (Type ID 31)', cat: 'C_CONV', isFault: false, safeBatch: true, expectedResult: 'Double-point breaker position encoded with CP56Time2a' },
  { num: 14, id: 'T14_MMXU_M_ME_TF_1', name: 'MMXU1 Analog → M_ME_TF_1 (Type ID 36)', cat: 'C_CONV', isFault: false, safeBatch: true, expectedResult: 'IEEE-754 short float encoded with CP56Time2a' },
  { num: 15, id: 'T15_CP56TIME2A', name: 'IEC 61850 UTC → CP56Time2a Sync', cat: 'C_CONV', isFault: false, safeBatch: true, expectedResult: '7-byte IEC-104 timestamp synchronized to PTP/SNTP' },
  { num: 16, id: 'T16_MISSING_IOA', name: 'Missing IOA Mapping Table Entry', cat: 'C_CONV', isFault: true, safeBatch: false, expectedResult: 'Gateway Step 3/4 halts: LN not mapped to any IOA' },
  { num: 17, id: 'T17_BAD_QUALITY', name: 'IEC 61850 Invalid q=0x0100 → QDS IV=1', cat: 'C_CONV', isFault: true, safeBatch: false, expectedResult: 'Gateway sets IEC-104 QDS Invalid bit (0x80)' },
  { num: 18, id: 'T18_COA_MISMATCH', name: 'Common Address Mismatch (COA ≠ 132)', cat: 'C_CONV', isFault: true, safeBatch: false, expectedResult: 'RCC rejects ASDU with unknown COA (COT=46)' },
  { num: 19, id: 'T19_GTW_OVERLOAD', name: 'Gateway GTW-01 Queue / CPU Overload', cat: 'C_CONV', isFault: true, safeBatch: false, expectedResult: 'Conversion queue saturated; spontaneous ASDUs delayed' },

  // D. General Interrogation & Remote Commands (7)
  { num: 20, id: 'T20_GI_ACT', name: 'Station GI C_IC_NA_1 (QOI=20, COT=6)', cat: 'D_CMD', isFault: false, safeBatch: true, expectedResult: 'RCC sends GI Activation; GTW-01 snapshots all IOAs' },
  { num: 21, id: 'T21_GI_CON', name: 'GI Activation Confirm (COT=7)', cat: 'D_CMD', isFault: false, safeBatch: true, expectedResult: 'GTW-01 replies C_IC_NA_1 COT=7 before IOA burst' },
  { num: 22, id: 'T22_GI_TERM', name: 'GI Termination (COT=10)', cat: 'D_CMD', isFault: false, safeBatch: true, expectedResult: 'All IOAs transmitted (COT=20) followed by COT=10' },
  { num: 23, id: 'T23_SBO_CMD', name: 'SBO Remote Command C_DC_NA_1 (Trip/Close)', cat: 'D_CMD', isFault: false, safeBatch: true, expectedResult: 'Select (S/E=1) → Confirm → Execute (S/E=0) → CSWI1' },
  { num: 24, id: 'T24_DIRECT_CMD', name: 'Direct Execute C_DC_NA_1 Command', cat: 'D_CMD', isFault: false, safeBatch: true, expectedResult: 'Direct DCO command forwarded to IEC 61850 CSWI1' },
  { num: 25, id: 'T25_GI_TIMEOUT', name: 'General Interrogation Timeout (T1)', cat: 'D_CMD', isFault: true, safeBatch: false, expectedResult: 'GI COT=10 missing within T1; GI marked failed' },
  { num: 26, id: 'T26_INTERLOCK_BLK', name: 'Interlock Blocked — Negative Con (P/N=1)', cat: 'D_CMD', isFault: true, safeBatch: false, expectedResult: 'CILO interlock active; GTW-01 returns Negative Con' },

  // E. APCI Flow Control & WAN (6)
  { num: 27, id: 'T27_NS_NR_SYNC', name: 'APCI N(S) / N(R) Sequence Verification', cat: 'E_WAN', isFault: false, safeBatch: true, expectedResult: 'Transmit N(S) and Receive N(R) counters synchronized' },
  { num: 28, id: 'T28_SFRAME_ACK', name: 'S-Frame Supervisory Ack (w=8, T2=10s)', cat: 'E_WAN', isFault: false, safeBatch: true, expectedResult: 'RCC acknowledges received I-frames with S-frame' },
  { num: 29, id: 'T29_K_WINDOW_FULL', name: 'k-Window Overflow (k=12 Unacked I-Frames)', cat: 'E_WAN', isFault: true, safeBatch: false, expectedResult: 'GTW-01 pauses I-frame TX awaiting RCC S-frame Ack' },
  { num: 30, id: 'T30_WAN_LOSS', name: 'WAN Link Loss (ETH1 → RCC/SLDC Down)', cat: 'E_WAN', isFault: true, safeBatch: false, expectedResult: 'WAN cable faulted; IEC 61850 Station Bus stays live' },
  { num: 31, id: 'T31_HIGH_LATENCY', name: 'High WAN Latency (+450 ms RTT)', cat: 'E_WAN', isFault: true, safeBatch: false, expectedResult: 'Slow WAN delivery; T2 Ack timer warning flagged' },
  { num: 32, id: 'T32_FULL_RECOVERY', name: 'Full End-to-End IEC 61850 → 104 Recovery', cat: 'E_WAN', isFault: false, safeBatch: true, expectedResult: 'All faults cleared; MMS & IEC-104 links restored' },
];

function nowTimeStr(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function samplePolyline(pts: { x: number; y: number }[], t: number): { x: number; y: number } {
  if (!pts.length) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  let total = 0;
  const lens: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const l = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    lens.push(l);
    total += l;
  }
  let target = Math.max(0, Math.min(1, t)) * total;
  for (let i = 0; i < lens.length; i++) {
    if (target <= lens[i] || i === lens.length - 1) {
      const r = lens[i] > 0 ? target / lens[i] : 0;
      return {
        x: pts[i].x + (pts[i + 1].x - pts[i].x) * r,
        y: pts[i].y + (pts[i + 1].y - pts[i].y) * r,
      };
    }
    target -= lens[i];
  }
  return pts[pts.length - 1];
}

function roundedOrthPath(pts: { x: number; y: number }[], r = 12): string {
  if (pts.length < 2) return '';
  let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const prev = pts[i - 1];
    const curr = pts[i];
    const next = pts[i + 1];
    const v1x = curr.x - prev.x;
    const v1y = curr.y - prev.y;
    const v2x = next.x - curr.x;
    const v2y = next.y - curr.y;
    const l1 = Math.hypot(v1x, v1y) || 1;
    const l2 = Math.hypot(v2x, v2y) || 1;
    const rad = Math.min(r, l1 / 2, l2 / 2);
    const p1x = curr.x - (v1x / l1) * rad;
    const p1y = curr.y - (v1y / l1) * rad;
    const p2x = curr.x + (v2x / l2) * rad;
    const p2y = curr.y + (v2y / l2) * rad;
    d += ` L ${p1x.toFixed(1)} ${p1y.toFixed(1)} Q ${curr.x.toFixed(1)} ${curr.y.toFixed(1)} ${p2x.toFixed(1)} ${p2y.toFixed(1)}`;
  }
  const last = pts[pts.length - 1];
  d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;
  return d;
}

function buildIec104TestSteps(t: Iec104TestDef, r: Iec104TestRuntime, ns: number, nr: number) {
  const active = r.enabled;
  const isF = t.isFault;
  const frameHex =
    t.id === 'T02_STARTDT' ? '68 04 07 00 00 00  →  68 04 0B 00 00 00 (STARTDT CON)' :
    t.id === 'T03_STOPDT' ? '68 04 13 00 00 00  →  68 04 23 00 00 00 (STOPDT CON)' :
    t.id === 'T04_TESTFR' ? '68 04 43 00 00 00  →  68 04 83 00 00 00 (TESTFR CON)' :
    t.id.startsWith('T20') || t.id.startsWith('T21') || t.id.startsWith('T22')
      ? '68 0E 00 00 00 00 64 01 06 00 84 00 00 00 00 14 (C_IC_NA_1 QOI=20)' :
    t.id.startsWith('T23') || t.id.startsWith('T24') || t.id === 'T26_INTERLOCK_BLK'
      ? '68 0E 02 00 00 00 2E 01 06 00 84 00 E9 17 00 81 (C_DC_NA_1 SBO/Direct)' :
    `68 15 ${(ns << 1).toString(16).padStart(4, '0').toUpperCase()} ${(nr << 1).toString(16).padStart(4, '0').toUpperCase()} 1F 01 03 00 84 00 E9 03 00 ${t.id === 'T17_BAD_QUALITY' ? '80' : '00'}`;

  return {
    path:
      t.cat === 'A_UFRAME' ? 'RCC/SLDC (10.132.20.201) ↔ WAN TCP/2404 ↔ GTW-01 (ETH1)' :
      t.cat === 'B_MMS' ? 'IEC 61850 IEDs (P1–P4) ↔ RSP35 (VLAN 10) ↔ GTW-01 (ETH0 · TCP/102)' :
      t.cat === 'C_CONV' ? 'GTW-01 MMS Client → Conversion Engine (COA 132) → IEC-104 ASDU Queue' :
      t.cat === 'D_CMD' ? 'RCC/SLDC Master → GTW-01 (C_IC/C_DC) → IEC 61850 CSWI1 / XCBR1' :
      'GTW-01 (ETH1) ↔ WAN Link ↔ RCC/SLDC Master (APCI Flow Control)',
    frameHex,
    steps: [
      {
        num: 1,
        title: 'Test Trigger & Precondition',
        color: '#38F3FF',
        detail: active
          ? `Test #${t.num} (${t.name}) toggled ON at ${r.timestamp}. Simulation injected into live pipeline.`
          : `Test #${t.num} (${t.name}) is currently IDLE. Toggle ON to execute live verification.`,
      },
      {
        num: 2,
        title: 'Southbound Station Bus (IEC 61850 MMS · TCP/102)',
        color: '#7DD3FC',
        detail:
          t.cat === 'B_MMS' && isF && active
            ? `Fault active on Station Bus: ${t.expectedResult}. Affected IED link turns dashed red.`
            : 'All healthy IEC 61850 IEDs (7SA87, RET615, C264, GE D60) stream BRCB/URCB reports via Hirschmann RSP35.',
      },
      {
        num: 3,
        title: 'Gateway GTW-01 Conversion & IOA Mapping (COA=132)',
        color: '#D8B4FE',
        detail:
          t.cat === 'C_CONV' && isF && active
            ? `Conversion anomaly injected: ${t.expectedResult}. Gateway popup highlights faulted conversion stage.`
            : 'GTW-01 maps IEC 61850 LN/DataSet → IEC-104 TypeID (31/36), translates quality (q→QDS), and stamps CP56Time2a.',
      },
      {
        num: 4,
        title: 'Northbound WAN & APCI Frame Transport (TCP/2404)',
        color: '#FDE047',
        detail:
          (t.cat === 'A_UFRAME' || t.cat === 'E_WAN') && isF && active
            ? `WAN / APCI fault active: ${t.expectedResult}. GTW-01 buffers unacknowledged ASDUs.`
            : `APCI sequence synchronized (N(S)=${ns}, N(R)=${nr}) with moving IEC-104 WAN frame delivery to RCC/SLDC.`,
      },
      {
        num: 5,
        title: isF ? 'SCADA Impact & Recovery Action' : 'RCC / SLDC Verification Result',
        color: isF && active ? '#FCA5A5' : '#4ADE80',
        detail: active
          ? `${t.expectedResult}${isF ? ' — Toggle OFF or enable Test #32 (Full Recovery) to restore healthy operation.' : ' — Verified PASS on live RCC/SLDC.'}`
          : 'Awaiting test execution — click the Toggle switch ON to observe real-time topology & frame trace.',
      },
    ],
  };
}

export const Iec104LabPage: React.FC = () => {
  const { bays, commandBreaker } = useSubstationStore();

  // Navigation & Playback (Default 0.1x slow inspection matching Modbus TCP Lab V3!)
  const [activeTab, setActiveTab] = useState<Iec104LabTab>('TOPOLOGY_LIVE');
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<SimSpeed>(0.1);

  // IEC-104 Counters & Interactive Command State
  const [nsSeq, setNsSeq] = useState<number>(48);
  const [nrSeq, setNrSeq] = useState<number>(22);
  const [giCount, setGiCount] = useState<number>(3);
  const [cmdBayId, setCmdBayId] = useState<string>(bays[0]?.id || 'BAY-132-L1');
  const [cmdAction, setCmdAction] = useState<'TRIP' | 'CLOSE'>('TRIP');
  const [cmdMode, setCmdMode] = useState<'SBO' | 'DIRECT'>('SBO');
  const [lastCmdMsg, setLastCmdMsg] = useState<string>('Idle — Ready for C_DC_NA_1 SBO/Direct command');

  // Cycle State: activeIedIdx (0..3) & cycleProgress (0..1)
  const [activeIedIdx, setActiveIedIdx] = useState<number>(0);
  const [cycleProgress, setCycleProgress] = useState<number>(0.34);

  // Hover & Pin Popups
  const [hoveredIedId, setHoveredIedId] = useState<Iec61850IedSpec['id'] | null>(null);
  const [switchHovered, setSwitchHovered] = useState<boolean>(false);
  const [gatewayPinned, setGatewayPinned] = useState<boolean>(false);
  const [gatewayManuallyClosed, setGatewayManuallyClosed] = useState<boolean>(false);

  // 32-Test Simulation Lab State
  const [testCatFilter, setTestCatFilter] = useState<TestCategory>('ALL');
  const [selectedTestId, setSelectedTestId] = useState<string>('T02_STARTDT');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);
  const [testState, setTestState] = useState<Record<string, Iec104TestRuntime>>(() => {
    const init: Record<string, Iec104TestRuntime> = {};
    IEC104_TESTS.forEach((t) => {
      init[t.id] = { enabled: false, status: 'IDLE', actualResult: 'Not executed', timestamp: '—' };
    });
    return init;
  });

  const [logs, setLogs] = useState<FrameLogEntry[]>(() => [
    { id: 1, time: nowTimeStr(), frameType: 'I-Frame', direction: 'GTW-01 → RCC/SLDC', details: 'N(S)=48 N(R)=22 · M_DP_TB_1 COA=132 IOA=1001 COT=3 CLOSED', result: 'Delivered' },
    { id: 2, time: nowTimeStr(), frameType: 'MMS Report', direction: 'IED_132_L1 → GTW-01', details: 'BRCB01 dsStatus 132_L1/XCBR1.Pos.stVal=CLOSED (q=0x0000)', result: 'Success' },
    { id: 3, time: nowTimeStr(), frameType: 'S-Frame', direction: 'RCC/SLDC → GTW-01', details: 'S (N(R)=48) Supervisory Acknowledgement', result: 'Success' },
    { id: 4, time: nowTimeStr(), frameType: 'U-Frame', direction: 'RCC/SLDC ↔ GTW-01', details: 'STARTDT ACT (0x07) → STARTDT CON (0x0B)', result: 'Success' },
  ]);

  // Derived Fault Flags from 32-Test Lab
  const isOn = (id: string) => !!testState[id]?.enabled;
  const stopdtStandby = isOn('T03_STOPDT');
  const port2404Down = isOn('T05_PORT2404_DOWN');
  const startdtTimeout = isOn('T06_STARTDT_T1_TO');
  const p2Offline = isOn('T10_P2_OFFLINE');
  const switchDown = isOn('T11_SWITCH_DOWN');
  const mmsLost = isOn('T12_MMS_LOST');
  const missingIoa = isOn('T16_MISSING_IOA');
  const badQuality = isOn('T17_BAD_QUALITY');
  const coaMismatch = isOn('T18_COA_MISMATCH');
  const gtwOverload = isOn('T19_GTW_OVERLOAD');
  const interlockBlocked = isOn('T26_INTERLOCK_BLK');
  const kWindowFull = isOn('T29_K_WINDOW_FULL');
  const wanLoss = isOn('T30_WAN_LOSS');
  const highLatency = isOn('T31_HIGH_LATENCY');

  const activeIed = IEC61850_IEDS[activeIedIdx];
  const iedOfflineNow = (activeIed.id === 'P2' && p2Offline) || mmsLost;
  const stationBusOk = !switchDown && !mmsLost;
  const mmsHealthy = stationBusOk && !iedOfflineNow;
  const convHealthy = mmsHealthy && !missingIoa && !gtwOverload;
  const wanHealthy = !port2404Down && !startdtTimeout && !wanLoss && !stopdtStandby && !kWindowFull;
  const endToEndOk = convHealthy && wanHealthy && !coaMismatch;

  // 3-Phase Smooth Animation State Machine
  const simPhase: SimPhase =
    cycleProgress < 0.24 ? 'MMS_IN' : cycleProgress < 0.72 ? 'CONVERT' : 'WAN_TX';

  const convFraction = simPhase === 'CONVERT' ? Math.max(0, Math.min(1, (cycleProgress - 0.24) / 0.48)) : simPhase === 'WAN_TX' ? 1 : 0;
  const convPct = Math.round(convFraction * 100);
  const convStep: 1 | 2 | 3 | 4 =
    convFraction < 0.25 ? 1 : convFraction < 0.5 ? 2 : convFraction < 0.75 ? 3 : 4;

  // Auto-open Gateway Popup on MMS arrival, auto-close on IEC-104 departure (unless pinned)
  const showGatewayPopup = gatewayPinned || (simPhase === 'CONVERT' && !gatewayManuallyClosed && mmsHealthy);

  useEffect(() => {
    if (simPhase === 'MMS_IN') {
      setGatewayManuallyClosed(false);
    }
  }, [simPhase]);

  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let lastTs = performance.now();
    const baseCycleMs = highLatency ? 5200 : 3200; // At 0.1x -> 32s full slow cycle!

    const tick = (now: number) => {
      const dt = Math.min(80, now - lastTs);
      lastTs = now;
      setCycleProgress((prev) => {
        const next = prev + dt / (baseCycleMs / speed);
        if (next >= 1) {
          setActiveIedIdx((i) => (i + 1) % IEC61850_IEDS.length);
          setNsSeq((n) => (n + 1) % 32767);
          setNrSeq((n) => (n + 1) % 32767);
          return next - 1;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, speed, highLatency]);

  // Live Telecontrol IOA Table from store
  const ioaTable = useMemo(() => buildIec104TelecontrolTable(bays), [bays]);

  // Append frame log on each cycle completion
  useEffect(() => {
    const ts = nowTimeStr();
    const d = IEC61850_IEDS[activeIedIdx];
    const entry: FrameLogEntry = !mmsHealthy
      ? { id: Date.now() + Math.random(), time: ts, frameType: 'MMS Report', direction: `${d.iedName} → GTW-01`, details: `TCP/102 MMS association / RSP35 fault`, result: 'Timeout' }
      : !convHealthy
      ? { id: Date.now() + Math.random(), time: ts, frameType: 'MMS Report', direction: 'GTW-01 Engine', details: missingIoa ? `Unmapped LN ${d.lnRef} (No IOA)` : 'GTW-01 conversion buffer overload', result: 'Fault' }
      : !wanHealthy
      ? { id: Date.now() + Math.random(), time: ts, frameType: 'I-Frame', direction: 'GTW-01 → RCC/SLDC', details: `WAN / TCP 2404 paused — IOA:${d.ioa} buffered`, result: 'Fault' }
      : { id: Date.now() + Math.random(), time: ts, frameType: 'I-Frame', direction: 'GTW-01 → RCC/SLDC', details: `N(S)=${nsSeq} N(R)=${nrSeq} · ${d.iec104Type} COA=${coaMismatch ? 99 : 132} IOA=${d.ioa} COT=3 Val=${d.baseValue} ${d.unit}`, result: 'Delivered' };
    setLogs((prev) => [entry, ...prev].slice(0, 40));
  }, [nsSeq]);

  // ResizeObserver Exact Port-to-Port Measurement
  const stageRef = useRef<HTMLDivElement | null>(null);
  const portRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const setPortRef = (id: string) => (el: HTMLSpanElement | null) => {
    portRefs.current[id] = el;
  };
  const [stageSize, setStageSize] = useState<{ w: number; h: number }>({ w: 1200, h: 460 });
  const [ports, setPorts] = useState<Record<string, { x: number; y: number }>>({});

  useEffect(() => {
    const measure = () => {
      const wrap = stageRef.current;
      if (!wrap) return;
      const wr = wrap.getBoundingClientRect();
      if (wr.width < 100) return;
      const next: Record<string, { x: number; y: number }> = {};
      Object.entries(portRefs.current).forEach(([k, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        next[k] = { x: r.left - wr.left + r.width / 2, y: r.top - wr.top + r.height / 2 };
      });
      setStageSize({ w: Math.round(wr.width), h: Math.round(wr.height) });
      setPorts(next);
    };
    measure();
    const t1 = window.setTimeout(measure, 120);
    const t2 = window.setTimeout(measure, 400);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && stageRef.current) ro.observe(stageRef.current);
    window.addEventListener('resize', measure);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [activeTab]);

  // Test Simulation Lab Handlers
  const handleToggleTest = (t: Iec104TestDef) => {
    const ts = nowTimeStr();
    const nextOn = !testState[t.id]?.enabled;
    if (t.id === 'T32_FULL_RECOVERY' && nextOn) {
      setTestState((prev) => {
        const copy = { ...prev };
        IEC104_TESTS.forEach((item) => {
          if (item.isFault) copy[item.id] = { enabled: false, status: 'IDLE', actualResult: 'Cleared by Recovery', timestamp: ts };
        });
        copy[t.id] = { enabled: true, status: 'PASSED', actualResult: t.expectedResult, timestamp: ts };
        return copy;
      });
    } else {
      setTestState((prev) => ({
        ...prev,
        [t.id]: {
          enabled: nextOn,
          status: nextOn ? (t.isFault ? 'FAILED' : 'PASSED') : 'IDLE',
          actualResult: nextOn ? t.expectedResult : 'Cleared / Restored',
          timestamp: ts,
        },
      }));
    }
    setTestHistory((prev) => [
      { id: Date.now() + Math.random(), time: ts, testName: t.name, action: nextOn ? 'ON' : 'OFF', status: nextOn ? (t.isFault ? 'FAILED' : 'PASSED') : 'IDLE', detail: nextOn ? t.expectedResult : 'Test disabled' },
      ...prev.slice(0, 49),
    ]);
  };

  const handleRunAllSafe = () => {
    const ts = nowTimeStr();
    setTestState((prev) => {
      const next = { ...prev };
      IEC104_TESTS.forEach((t) => {
        if (t.safeBatch) next[t.id] = { enabled: true, status: 'PASSED', actualResult: t.expectedResult, timestamp: ts };
      });
      return next;
    });
    setTestHistory((prev) => [
      { id: Date.now(), time: ts, testName: 'All Safe IEC 61850 → 104 Tests', action: 'RUN_SAFE', status: 'PASSED', detail: 'Executed all safe telecontrol tests' },
      ...prev.slice(0, 49),
    ]);
  };

  const handleResetAll = (stopOnly: boolean) => {
    const ts = nowTimeStr();
    setTestState(() => {
      const next: Record<string, Iec104TestRuntime> = {};
      IEC104_TESTS.forEach((t) => {
        next[t.id] = { enabled: false, status: 'IDLE', actualResult: stopOnly ? 'Stopped' : 'Not executed', timestamp: stopOnly ? ts : '—' };
      });
      return next;
    });
    setTestHistory((prev) => [
      { id: Date.now(), time: ts, testName: stopOnly ? 'Stop All Tests' : 'Reset All Faults', action: 'RESET', status: 'IDLE', detail: 'All test toggles reset to IDLE' },
      ...prev.slice(0, 49),
    ]);
  };

  const handleExportCsv = () => {
    const rows = [
      ['#', 'Test ID', 'Test Name', 'Category', 'State', 'Status', 'Expected Result', 'Actual Result', 'Timestamp'],
      ...IEC104_TESTS.map((t) => {
        const r = testState[t.id];
        return [String(t.num), t.id, t.name, t.cat, r.enabled ? 'ON' : 'OFF', r.status, t.expectedResult, r.actualResult, r.timestamp];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'iec104_test_simulation_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleTriggerGi = () => {
    setGiCount((c) => c + 1);
    setLogs((prev) => [
      { id: Date.now(), time: nowTimeStr(), frameType: 'I-Frame', direction: 'RCC/SLDC ↔ GTW-01', details: 'C_IC_NA_1 (QOI=20) COT=6 → COT=7 → COT=20 Burst → COT=10 Terminated', result: wanHealthy ? 'Delivered' : 'Fault' },
      ...prev.slice(0, 39),
    ]);
  };

  const handleSendCommand = () => {
    if (!wanHealthy || interlockBlocked) {
      setLastCmdMsg(interlockBlocked ? 'BLOCKED: CILO Interlock Active (Negative Con P/N=1)' : 'FAILED: WAN / TCP 2404 Link Down');
      return;
    }
    const targetState = cmdAction === 'TRIP' ? 'OPEN' : 'CLOSED';
    commandBreaker(cmdBayId, targetState);
    setLastCmdMsg(`${cmdMode} C_DC_NA_1 (${cmdAction}) → ${cmdBayId} Executed & Confirmed (COT=7→10)`);
    setLogs((prev) => [
      { id: Date.now(), time: nowTimeStr(), frameType: 'I-Frame', direction: 'RCC/SLDC → GTW-01 → IED', details: `${cmdMode} C_DC_NA_1 (${cmdAction}) → ${cmdBayId} CSWI1.Pos`, result: 'Delivered' },
      ...prev.slice(0, 39),
    ]);
  };

  const visibleTests = useMemo(
    () => (testCatFilter === 'ALL' ? IEC104_TESTS : IEC104_TESTS.filter((t) => t.cat === testCatFilter)),
    [testCatFilter]
  );

  const stagePillLabel =
    !mmsHealthy
      ? 'FAULT: IEC 61850 MMS / SWITCH DOWN'
      : simPhase === 'MMS_IN'
      ? 'STAGE 1: IEC 61850 MMS REPORT (102)'
      : simPhase === 'CONVERT'
      ? `STAGE 2: LIVE 61850→104 CONVERT (${convStep}/4)`
      : wanHealthy
      ? 'STAGE 3: IEC-104 I-FRAME WAN TX (2404)'
      : 'FAULT: IEC-104 WAN / 2404 BLOCKED';

  return (
    <div className="space-y-3 pb-8 text-[#E8F4FF]">
      {/* 1. TOP HEADER BAR */}
      <div
        className="rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5"
        style={{
          background: 'linear-gradient(90deg, #041628 0%, #07223B 52%, #041628 100%)',
          borderColor: 'rgba(56, 224, 255, 0.45)',
          boxShadow: '0 0 22px rgba(0, 212, 255, 0.14)',
        }}
      >
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
              IEC 60870-5-104 Lab V3 — Multi-IED IEC 61850 to IEC-104 Conversion
            </h1>
            <span className="rounded border border-[#38BDF8]/50 bg-[#082B47] px-2 py-0.5 font-mono text-[9.5px] font-bold text-[#7DD3FC]">
              SIMULATED TELECONTROL
            </span>
          </div>
          <p className="text-[11px] text-[#8CC5E8] mt-0.5">
            IEC 61850 Ed.2 Multi-Vendor IEDs (MMS TCP/102) → Hirschmann RSP35 → IEC-104 Gateway GTW-01 → RCC / SLDC (TCP/2404, COA=132)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold">
          <span className={`rounded-lg border px-2.5 py-1 ${wanHealthy ? 'border-[#22C55E] bg-[#062E20] text-[#4ADE80]' : 'border-[#EF4444] bg-[#3B0D15] text-[#FCA5A5]'}`}>
            ● Link State: {wanHealthy ? 'STARTDT ACTIVE' : 'LINK FAULT'}
          </span>
          <span className="rounded-lg border border-[#C084FC]/70 bg-[#2E1065]/75 px-2.5 py-1 text-[#E9D5FF]">
            IEC-104 · TCP/2404 · COA 132
          </span>
          <span className="rounded-lg border border-[#38BDF8]/50 bg-[#072038] px-2.5 py-1 text-[#7DD3FC]">
            N(S)={nsSeq} · N(R)={nrSeq}
          </span>
          <span className="rounded-lg border border-[#F59E0B]/60 bg-[#2D1D06] px-2.5 py-1 text-[#FDE047]">
            GI Cycles: {giCount}
          </span>
        </div>
      </div>

      {/* 2. TAB NAVIGATION & PLAYBACK CONTROLS (DEFAULT 0.1x) */}
      <div className="rounded-xl border border-[#174266] bg-[#051628] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['TOPOLOGY_LIVE', 'Topology & Live Data'],
              ['IOA_MAPPING', 'IOA Mapping'],
              ['GI_SEQUENCE', 'General Interrogation (GI)'],
              ['REMOTE_COMMANDS', 'Remote Commands'],
              ['APCI_ANALYZER', 'APCI / ASDU Analyzer'],
              ['LOGS_DIAGNOSTICS', 'Logs & Diagnostics'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className="rounded-lg border px-2.5 py-1 text-[11px] font-extrabold transition"
              style={
                activeTab === id
                  ? { background: 'linear-gradient(180deg,#38F3FF,#00C8EA)', borderColor: '#A8FDFF', color: '#031829', boxShadow: '0 0 12px rgba(0,229,255,0.45)' }
                  : { background: '#082038', borderColor: '#1B4B72', color: '#BAE6FD' }
              }
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10.5px]">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="inline-flex items-center gap-1 rounded-lg border border-[#22C55E] bg-[#062E20] px-2.5 py-1 font-extrabold text-[#4ADE80] hover:brightness-110 transition"
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? 'Pause' : 'Resume'}
          </button>
          {([0.1, 0.25, 0.5, 1, 2, 4] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className="rounded-lg border px-2 py-1 font-extrabold transition"
              style={
                speed === s
                  ? { background: '#00D8F5', borderColor: '#7DF9FF', color: '#021424', boxShadow: '0 0 10px rgba(0,229,255,0.5)' }
                  : { background: '#082038', borderColor: '#1B4B72', color: '#9BD0EE' }
              }
            >
              {s}x
            </button>
          ))}
          <button
            type="button"
            onClick={handleTriggerGi}
            className="rounded-lg border border-[#C084FC] bg-[#2E1065]/80 px-2.5 py-1 font-extrabold text-[#E9D5FF] hover:brightness-110 transition"
          >
            Send GI (QOI=20)
          </button>
          <button
            type="button"
            onClick={() => {
              setSpeed(0.1);
              setPlaying(true);
              setGatewayPinned(false);
              setGatewayManuallyClosed(false);
              handleResetAll(false);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-[#1B4B72] bg-[#082038] px-2.5 py-1 font-extrabold text-[#BAE6FD] hover:border-[#38F3FF] transition"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* 3. TOPOLOGY & LIVE DATA TAB */}
      {activeTab === 'TOPOLOGY_LIVE' && (
        <div className="space-y-3.5">
          {/* SYSTEM TOPOLOGY CARD */}
          <div
            className="rounded-2xl border p-3.5 relative overflow-x-auto"
            style={{
              borderColor: 'rgba(56, 224, 255, 0.45)',
              background:
                'linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px), ' +
                'linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px), ' +
                'radial-gradient(ellipse at 50% 42%, #07203B 0%, #03101F 76%)',
              backgroundSize: '28px 28px, 28px 28px, 100% 100%',
              boxShadow: '0 0 26px rgba(0, 212, 255, 0.14)',
            }}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Radio className="w-4 h-4 text-[#38F3FF]" />
                <span className="text-[13.5px] font-extrabold text-white">
                  System Topology — Multi-IED IEC 61850 MMS → IEC 60870-5-104 Conversion
                </span>
                <span className="text-[11px] font-semibold text-[#5EEAD4]">
                  (Hover any IED / Switch for Holographic Info · Click GTW-01 to Pin Conversion)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-semibold">
                <span className="inline-flex items-center gap-1.5 text-[#7DD3FC]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" /> IEC 61850 MMS (TCP/102)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#D9F99D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#84CC16] shadow-[0_0_8px_#84CC16]" /> IEC-104 I-Frame (TCP/2404)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#FCA5A5]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]" /> Fault / Timeout
                </span>
              </div>
            </div>

            <div ref={stageRef} className="min-w-[1120px] relative pt-2 pb-2">
              {/* 4 Zone Header Pills */}
              <div className="grid grid-cols-[1.05fr_1.15fr_1.15fr_1.05fr] gap-4 mb-3 relative z-10">
                <div className="rounded-lg border border-[#2563EB]/60 bg-[#082240]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#93C5FD]">
                  IEC 61850 IEDs (MMS · TCP/102)
                </div>
                <div className="rounded-lg border border-[#3B82F6]/60 bg-[#082240]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#93C5FD]">
                  STATION BUS SWITCH
                </div>
                <div className="rounded-lg border border-[#0D9488]/70 bg-[#062934]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#5EEAD4]">
                  IEC-104 GATEWAY (COA 132)
                </div>
                <div className="rounded-lg border border-[#16A34A]/60 bg-[#072923]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#86EFAC]">
                  RCC / SLDC (MASTER)
                </div>
              </div>

              {/* AUTO-OPENING / AUTO-CLOSING 495px LIVE IEC 61850 -> IEC-104 CONVERSION POPUP ABOVE GATEWAY */}
              <div
                className="absolute z-40 transition-all duration-300"
                style={{
                  left: '46.5%',
                  top: '10px',
                  width: '495px',
                  opacity: showGatewayPopup ? 1 : 0,
                  transform: showGatewayPopup ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.96)',
                  pointerEvents: showGatewayPopup ? 'auto' : 'none',
                }}
              >
                <div
                  className="rounded-2xl border-[1.5px] p-4 relative"
                  style={{
                    background:
                      'radial-gradient(ellipse 65% 45% at 20% 10%, rgba(255, 255, 255, 0.24) 0%, transparent 65%), ' +
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.19) 0%, rgba(190, 240, 255, 0.14) 50%, rgba(15, 44, 68, 0.74) 100%)',
                    backdropFilter: 'blur(24px) saturate(165%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(165%)',
                    borderColor: !convHealthy ? '#EF4444' : 'rgba(224, 252, 255, 0.86)',
                    boxShadow: !convHealthy
                      ? '0 0 28px rgba(239, 68, 68, 0.45)'
                      : '0 0 34px rgba(103, 232, 249, 0.42), inset 0 1.5px 1px rgba(255, 255, 255, 0.78)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2.5 border-b border-[#56EBFF]/25">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1 h-4 rounded-full bg-[#38F3FF]" />
                      <span className="text-[12.5px] font-extrabold text-white truncate">Live IEC 61850 → IEC-104 Conversion</span>
                      <span className="rounded border border-[#F59E0B]/70 bg-[#3B2606] px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-[#FDE047]">
                        {activeIed.shortName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="rounded-md border px-2 py-0.5 font-mono text-[9.5px] font-extrabold"
                        style={
                          !convHealthy
                            ? { background: '#3B0D15', borderColor: '#EF4444', color: '#FCA5A5' }
                            : { background: '#063326', borderColor: '#22C55E', color: '#4ADE80' }
                        }
                      >
                        {!convHealthy
                          ? 'CONV FAULT'
                          : `STEP ${convStep}/4: ${convStep === 1 ? 'MMS RX' : convStep === 2 ? 'QUALITY/TIME' : convStep === 3 ? 'IOA MAP' : '104 I-FRAME'}`}
                      </span>
                      <button type="button" onClick={() => setGatewayPinned((p) => !p)} className="p-1 rounded hover:bg-white/10 text-[#7DD3FC]">
                        {gatewayPinned ? <PinOff className="w-3.5 h-3.5 text-[#FDE047]" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button type="button" onClick={() => { setGatewayPinned(false); setGatewayManuallyClosed(true); }} className="p-1 rounded hover:bg-white/10 text-[#9BC0DF]">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 2x2 Multi-Color Conversion Cards */}
                  <div className="grid grid-cols-2 gap-2.5 font-mono text-[10.5px]">
                    <div
                      className="rounded-lg border p-2.5 transition-all"
                      style={{
                        background: convStep === 1 ? 'rgba(0, 212, 255, 0.16)' : 'rgba(8, 28, 46, 0.74)',
                        borderColor: convStep === 1 ? '#38F3FF' : 'rgba(90, 180, 220, 0.28)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#38F3FF]">1. MMS REPORT RX</span>
                        <span className={`px-1.5 rounded text-[8px] font-extrabold ${convStep === 1 ? 'bg-white text-[#031829]' : convStep > 1 ? 'bg-[#063326] text-[#4ADE80]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 1 ? 'ACTIVE' : convStep > 1 ? 'DONE' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#E0F7FF] font-bold truncate">{activeIed.iedName} · {activeIed.rcbName}</div>
                      <div className="text-[#FDE047] mt-0.5 truncate">{activeIed.lnRef}</div>
                    </div>

                    <div
                      className="rounded-lg border p-2.5 transition-all"
                      style={{
                        background: convStep === 2 ? 'rgba(192, 132, 252, 0.18)' : 'rgba(8, 28, 46, 0.74)',
                        borderColor: badQuality ? '#EF4444' : convStep === 2 ? '#C084FC' : 'rgba(90, 180, 220, 0.28)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#D8B4FE]">2. QUALITY &amp; CP56TIME</span>
                        <span className={`px-1.5 rounded text-[8px] font-extrabold ${convStep === 2 ? 'bg-[#D8B4FE] text-[#1E0836]' : convStep > 2 ? 'bg-[#063326] text-[#4ADE80]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 2 ? 'ACTIVE' : convStep > 2 ? 'DONE' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#F3E8FF] font-bold">q={badQuality ? '0x0100 INV' : '0x0000 GOOD'} → QDS={badQuality ? '0x80' : '0x00'}</div>
                      <div className="text-[#4ADE80] mt-0.5 font-extrabold">Val: {activeIed.baseValue} {activeIed.unit} · CP56Time2a</div>
                    </div>

                    <div
                      className="rounded-lg border p-2.5 transition-all"
                      style={{
                        background: convStep === 3 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(8, 28, 46, 0.74)',
                        borderColor: missingIoa || coaMismatch ? '#EF4444' : convStep === 3 ? '#FACC15' : 'rgba(90, 180, 220, 0.28)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#FDE047]">3. COA / IOA MAPPING</span>
                        <span className={`px-1.5 rounded text-[8px] font-extrabold ${convStep === 3 ? 'bg-[#FDE047] text-[#261802]' : convStep > 3 ? 'bg-[#063326] text-[#4ADE80]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 3 ? 'ACTIVE' : convStep > 3 ? 'DONE' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#FEF08A] font-bold">
                        {missingIoa ? 'ERR: Unmapped LN!' : `COA:${coaMismatch ? 99 : 132} / IOA:${activeIed.ioa}`}
                      </div>
                      <div className="text-[#7DD3FC] mt-0.5">TypeID {activeIed.typeIdNum} ({activeIed.iec104Type}) · COT:3</div>
                    </div>

                    <div
                      className="rounded-lg border p-2.5 transition-all"
                      style={{
                        background: convStep === 4 ? 'rgba(34, 197, 94, 0.18)' : 'rgba(8, 28, 46, 0.74)',
                        borderColor: gtwOverload || !wanHealthy ? '#EF4444' : convStep === 4 ? '#4ADE80' : 'rgba(90, 180, 220, 0.28)',
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#4ADE80]">4. IEC-104 I-FRAME TX</span>
                        <span className={`px-1.5 rounded text-[8px] font-extrabold ${convStep === 4 ? 'bg-[#4ADE80] text-[#032415]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 4 ? 'READY' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#DCFCE7] font-bold">APCI: 68 15 N(S)={nsSeq} N(R)={nrSeq}</div>
                      <div className="text-[#A3E635] mt-0.5 font-extrabold">Out: ETH1 → RCC/SLDC (2404)</div>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <div className="flex-1 h-2 rounded-full bg-[#061828] border border-[#1E4B6E] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-100"
                        style={{
                          width: `${convPct}%`,
                          background: 'linear-gradient(90deg, #00E5FF 0%, #C084FC 40%, #FACC15 72%, #4ADE80 100%)',
                          boxShadow: '0 0 10px rgba(0, 229, 255, 0.65)',
                        }}
                      />
                    </div>
                    <span className="font-mono text-[10px] font-extrabold text-[#7DD3FC] w-9 text-right">{convPct}%</span>
                  </div>
                </div>
                <svg viewBox="0 0 360 44" className="w-[330px] h-[44px] mx-auto block pointer-events-none">
                  <polygon points="20,0 340,0 210,44 150,44" fill="rgba(56, 232, 255, 0.11)" stroke="rgba(56, 232, 255, 0.45)" strokeWidth="1" />
                </svg>
              </div>

              {/* 4 HARDWARE COLUMNS */}
              <div className="grid grid-cols-[1.05fr_1.15fr_1.15fr_1.05fr] gap-4 items-center relative z-10 min-h-[430px]">
                {/* COLUMN 1: 4 IEC 61850 IEDs (DETAILS HIDDEN; HOVER OPENS HOLOGRAPHIC POPUP) */}
                <div className="flex flex-col justify-between gap-2.5 pl-4">
                  {IEC61850_IEDS.map((dev, idx) => {
                    const isAct = idx === activeIedIdx;
                    const isHov = hoveredIedId === dev.id;
                    const isFault = (dev.id === 'P2' && p2Offline) || mmsLost;
                    return (
                      <div
                        key={dev.id}
                        className="flex items-center justify-start relative"
                        onMouseEnter={() => setHoveredIedId(dev.id)}
                        onMouseLeave={() => setHoveredIedId((cur) => (cur === dev.id ? null : cur))}
                      >
                        <div
                          className="relative group rounded-xl border p-1.5 transition-all cursor-pointer"
                          style={{
                            width: '126px',
                            height: '92px',
                            background: isAct || isHov ? 'linear-gradient(180deg, rgba(14, 54, 82, 0.94), rgba(6, 24, 42, 0.96))' : 'rgba(7, 24, 42, 0.86)',
                            borderColor: isFault ? '#EF4444' : isHov ? '#FFFFFF' : isAct ? '#38F3FF' : 'rgba(56, 189, 248, 0.35)',
                            boxShadow: isFault ? '0 0 14px rgba(239, 68, 68, 0.45)' : isHov ? '0 0 24px rgba(165, 243, 252, 0.72)' : isAct ? '0 0 18px rgba(0, 229, 255, 0.45)' : 'none',
                          }}
                        >
                          <span
                            className="absolute -top-2 left-2 rounded px-1.5 py-0.2 font-mono text-[9px] font-extrabold border z-20"
                            style={{
                              background: isAct || isHov ? '#00D8F5' : '#08253E',
                              borderColor: isAct || isHov ? '#FFFFFF' : '#38BDF8',
                              color: isAct || isHov ? '#021424' : '#7DD3FC',
                            }}
                          >
                            {dev.id}
                          </span>
                          <img src={dev.image} alt={dev.fullName} className="w-full h-full object-contain rounded drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)] group-hover:scale-105 transition" />
                          <span
                            ref={setPortRef(`ied_${dev.id}`)}
                            className="absolute right-1 bottom-1.5 w-5 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[6.5px] font-extrabold text-[#E0F7FF] z-20"
                            style={{
                              borderColor: isFault ? '#EF4444' : '#38F3FF',
                              background: isFault ? '#3B0D15' : '#04283D',
                              boxShadow: isFault ? '0 0 8px #EF4444' : '0 0 10px #00E5FF',
                            }}
                          >
                            ETH
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* COLUMN 2: COMPACT HIRSCHMANN RSP35 SWITCH (DETAILS HIDDEN; HOVER OPENS HOLOGRAPHIC POPUP) */}
                <div className="flex flex-col items-center justify-center pt-[125px]">
                  <div
                    className="relative flex items-center justify-center cursor-pointer"
                    onMouseEnter={() => setSwitchHovered(true)}
                    onMouseLeave={() => setSwitchHovered(false)}
                  >
                    <img
                      src="assets/devices/hirschmann-rsp35.png"
                      alt="Hirschmann RSP35 Industrial Switch"
                      className="h-[148px] w-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.85)]"
                      style={{ opacity: switchDown ? 0.45 : 1 }}
                    />
                    {[
                      { num: 1, left: '22%' },
                      { num: 2, left: '36%' },
                      { num: 3, left: '50%' },
                      { num: 4, left: '64%' },
                    ].map(({ num, left }) => {
                      const isPAct = activeIed.portNum === num;
                      const isPFault = (num === 2 && p2Offline) || !stationBusOk;
                      return (
                        <span
                          key={num}
                          ref={setPortRef(`sw_p${num}`)}
                          style={{
                            left,
                            bottom: '22%',
                            borderColor: isPFault ? '#EF4444' : isPAct ? '#4ADE80' : '#38F3FF',
                            background: isPFault ? '#3B0D15' : '#04283D',
                            boxShadow: isPFault ? '0 0 8px #EF4444' : '0 0 9px #00E5FF',
                          }}
                          className="absolute w-4 h-3.5 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[8px] font-extrabold text-white z-20"
                        >
                          {num}
                        </span>
                      );
                    })}
                    <span
                      ref={setPortRef('sw_p5')}
                      className="absolute right-[10%] top-[61%] w-4 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[8px] font-extrabold text-white z-20"
                      style={{
                        borderColor: !stationBusOk ? '#EF4444' : '#38F3FF',
                        background: !stationBusOk ? '#3B0D15' : '#04283D',
                        boxShadow: !stationBusOk ? '0 0 8px #EF4444' : '0 0 10px #00E5FF',
                      }}
                    >
                      5
                    </span>
                  </div>
                </div>

                {/* COLUMN 3: IEC-104 GATEWAY GTW-01 */}
                <div className="flex flex-col items-center justify-end pt-[185px]">
                  <button
                    type="button"
                    onClick={() => {
                      setGatewayPinned((p) => !p);
                      setGatewayManuallyClosed(false);
                    }}
                    title="Click to Pin / Unpin Live IEC 61850 → IEC-104 Conversion Popup"
                    className="relative flex items-center justify-center group focus:outline-none"
                  >
                    <img src="assets/signal-chain/station-gateway.png" alt="IEC-104 Gateway GTW-01" className="h-[124px] w-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.85)] group-hover:brightness-110 transition" />
                    <span
                      ref={setPortRef('gtw_eth0')}
                      className="absolute left-[22%] top-[58%] w-5 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[6.5px] font-extrabold text-[#E0F7FF] z-20"
                      style={{ borderColor: !stationBusOk ? '#EF4444' : '#38F3FF', background: '#04283D', boxShadow: !stationBusOk ? '0 0 8px #EF4444' : '0 0 10px #00E5FF' }}
                    >
                      E0
                    </span>
                    <span
                      ref={setPortRef('gtw_eth1')}
                      className="absolute right-[21%] top-[58%] w-5 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[6.5px] font-extrabold text-[#DCFCE7] z-20"
                      style={{ borderColor: !wanHealthy ? '#EF4444' : '#4ADE80', background: '#062E20', boxShadow: !wanHealthy ? '0 0 8px #EF4444' : '0 0 10px #22C55E' }}
                    >
                      E1
                    </span>
                  </button>
                  <div className="mt-2 text-center">
                    <div className="text-[12px] font-extrabold text-white">IEC-104 Gateway GTW-01</div>
                    <div className="font-mono text-[10px] text-[#38F3FF]">ETH0: 10.132.10.200 (MMS)</div>
                    <div className="font-mono text-[10px] text-[#4ADE80]">ETH1: 10.132.20.200 (COA 132)</div>
                  </div>
                </div>

                {/* COLUMN 4: RCC / SLDC MASTER */}
                <div className="flex flex-col items-center justify-end pt-[178px]">
                  <div className="relative flex items-center justify-center">
                    <img src="assets/signal-chain/scada-hmi.png" alt="RCC SLDC Master Workstation" className="h-[130px] w-auto object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.85)]" />
                    <span
                      ref={setPortRef('rcc_wan')}
                      className="absolute left-[4%] top-[58%] w-5 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[6.5px] font-extrabold text-[#DCFCE7] z-20"
                      style={{ borderColor: !wanHealthy ? '#EF4444' : '#4ADE80', background: '#062E20', boxShadow: !wanHealthy ? '0 0 8px #EF4444' : '0 0 10px #22C55E' }}
                    >
                      WAN
                    </span>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-[12px] font-extrabold text-white">RCC / SLDC (Master)</div>
                    <div className="font-mono text-[10px] text-[#4ADE80]">10.132.20.201 · TCP/2404</div>
                    <div
                      className="mt-1 inline-block rounded border px-2 py-0.5 font-mono text-[9.5px] font-extrabold"
                      style={endToEndOk ? { background: '#062E20', borderColor: '#22C55E', color: '#4ADE80' } : { background: '#3B0D15', borderColor: '#EF4444', color: '#FCA5A5' }}
                    >
                      {endToEndOk ? `RX COA:132 IOA:${activeIed.ioa} OK` : 'RX LINK / CONV FAULT'}
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP-LAYER (z-[80]) HOLOGRAPHIC IED INFO POPUP ON HOVER */}
              {(() => {
                const hovIdx = IEC61850_IEDS.findIndex((d) => d.id === hoveredIedId);
                if (hovIdx === -1) return null;
                const dev = IEC61850_IEDS[hovIdx];
                const topOffsets = [38, 102, 166, 192];
                return (
                  <div className="absolute z-[80] pointer-events-none transition-all duration-150" style={{ left: '164px', top: `${topOffsets[hovIdx]}px`, width: '540px' }}>
                    <svg viewBox="0 0 42 250" className="absolute -left-[40px] top-4 w-[40px] h-[225px] pointer-events-none">
                      <polygon points="0,112 42,6 42,244 0,126" fill="rgba(125, 249, 255, 0.14)" stroke="rgba(175, 248, 255, 0.58)" strokeWidth="1" />
                      <line x1="0" y1="117" x2="42" y2="58" stroke="rgba(255,255,255,0.48)" strokeWidth="1" />
                      <line x1="0" y1="121" x2="42" y2="188" stroke="rgba(103,232,249,0.48)" strokeWidth="1" />
                    </svg>
                    <div
                      className="rounded-2xl border-[1.5px] p-4 relative overflow-hidden"
                      style={{
                        background:
                          'radial-gradient(ellipse 68% 48% at 18% 12%, rgba(165, 243, 252, 0.24) 0%, transparent 65%), ' +
                          'linear-gradient(145deg, rgba(16, 62, 92, 0.68) 0%, rgba(10, 42, 68, 0.76) 52%, rgba(8, 32, 54, 0.80) 100%)',
                        backdropFilter: 'blur(36px) saturate(170%)',
                        WebkitBackdropFilter: 'blur(36px) saturate(170%)',
                        borderColor: 'rgba(182, 248, 255, 0.90)',
                        boxShadow: '0 0 28px rgba(56, 232, 255, 0.52), inset 0 1.5px 2px rgba(255, 255, 255, 0.85)',
                      }}
                    >
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#A5F3FC]/35">
                        <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#E6FAFF]">
                          <span className="w-0.5 h-4 bg-[#7DF9FF] shadow-[0_0_8px_#7DF9FF]" />
                          <span>IEC 61850 Ed.2 — Device Info</span>
                        </div>
                        <div className="flex items-center gap-2.5 font-mono text-[12px] text-[#CFFAFE]/90"><span>–</span><span>□</span><span>×</span></div>
                      </div>
                      <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                        <div className="flex flex-col items-center">
                          <div className="w-[132px] h-[132px] rounded-xl border border-[#7DF9FF]/50 p-2.5 flex items-center justify-center" style={{ background: 'radial-gradient(circle, rgba(56,232,255,0.20), rgba(6,30,50,0.42))' }}>
                            <img src={dev.image} alt={dev.fullName} className="max-h-[112px] w-auto object-contain" style={{ filter: 'drop-shadow(0 0 14px rgba(103,232,249,0.72))' }} />
                          </div>
                        </div>
                        <div className="space-y-2.5 min-w-0">
                          <div className="text-[16.5px] font-extrabold text-white truncate">{dev.fullName}</div>
                          <div className="rounded-xl border border-[#A5F3FC]/42 divide-y divide-[#A5F3FC]/20 text-[11px]" style={{ background: 'rgba(8, 38, 62, 0.56)' }}>
                            {[
                              { icon: Cpu, label: 'IED Name', val: dev.iedName, col: '#FFFFFF' },
                              { icon: Radio, label: 'IP Address', val: dev.ip, col: '#38F3FF' },
                              { icon: Layers, label: 'Logical Node', val: dev.lnRef, col: '#FDE047' },
                              { icon: Activity, label: 'Report CB', val: `${dev.rcbName} (${dev.dataset})`, col: '#4ADE80' },
                              { icon: Database, label: 'IEC-104 Map', val: `COA:132 / IOA:${dev.ioa} (${dev.iec104Type})`, col: '#E879F9' },
                              { icon: AlertTriangle, label: 'Signals', val: dev.signals, col: '#7DD3FC' },
                            ].map(({ icon: Icon, label, val, col }) => (
                              <div key={label} className="grid grid-cols-[106px_1fr] items-center px-3 py-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[#E0F7FF] font-semibold"><Icon className="w-3.5 h-3.5 text-[#7DF9FF] shrink-0" /> {label}</span>
                                <span style={{ color: col }} className="font-mono font-extrabold truncate">: {val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-4 gap-2.5 mt-3.5">
                        {[['LN / DataSet', Layers], ['Live MMS', Activity], ['IOA Mapping', Settings], ['Device Info', Info]].map(([label, IconComp]) => {
                          const Icon = IconComp as React.FC<{ className?: string }>;
                          return (
                            <div key={label as string} className="rounded-xl border border-[#A5F3FC]/65 py-2.5 px-1.5 flex flex-col items-center justify-center gap-1" style={{ background: 'linear-gradient(180deg, rgba(165,243,252,0.18), rgba(12,54,84,0.48))', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)' }}>
                              <Icon className="w-4 h-4 text-[#E6FAFF]" />
                              <span className="text-[10.5px] font-bold text-white">{label as string}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* TOP-LAYER (z-[80]) HOLOGRAPHIC SWITCH INFO POPUP */}
              {switchHovered && (
                <div className="absolute z-[80] pointer-events-none transition-all duration-150" style={{ left: '42%', top: '34px', width: '500px' }}>
                  <div
                    className="rounded-2xl border-[1.5px] p-4"
                    style={{
                      background: 'radial-gradient(ellipse 68% 48% at 18% 12%, rgba(165,243,252,0.24), transparent 65%), linear-gradient(145deg, rgba(16,62,92,0.70), rgba(10,42,68,0.78) 52%, rgba(8,32,54,0.82))',
                      backdropFilter: 'blur(36px) saturate(170%)',
                      borderColor: 'rgba(182, 248, 255, 0.90)',
                      boxShadow: '0 0 28px rgba(56, 232, 255, 0.52), inset 0 1.5px 2px rgba(255, 255, 255, 0.85)',
                    }}
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#A5F3FC]/35">
                      <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#E6FAFF]">
                        <span className="w-0.5 h-4 bg-[#7DF9FF]" />
                        <span>Station Bus Switch — Device Info</span>
                      </div>
                      <span className="font-mono text-[12px] text-[#CFFAFE]/90 tracking-widest">– □ ×</span>
                    </div>
                    <div className="grid grid-cols-[120px_1fr] gap-4 items-center">
                      <div className="w-[114px] h-[114px] rounded-xl border border-[#7DF9FF]/50 p-2 flex items-center justify-center" style={{ background: 'radial-gradient(circle, rgba(56,232,255,0.20), rgba(6,30,50,0.42))' }}>
                        <img src="assets/devices/hirschmann-rsp35.png" alt="Hirschmann RSP35" className="max-h-[96px] object-contain" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[16px] font-extrabold text-white">Hirschmann RSP35</div>
                        <div className="rounded-xl border border-[#A5F3FC]/42 divide-y divide-[#A5F3FC]/20 text-[11px]" style={{ background: 'rgba(8, 38, 62, 0.56)' }}>
                          {[
                            { label: 'Mgmt IP', val: '10.132.10.10', col: '#38F3FF' },
                            { label: 'Station VLAN', val: 'VLAN 10 (IEC 61850 MMS)', col: '#FDE047' },
                            { label: 'Access Ports', val: 'P1–P4 → 7SA87, RET615, C264, D60', col: '#4ADE80' },
                            { label: 'Uplink Port', val: 'P5 (SFP) → IEC-104 GTW-01 ETH0', col: '#E879F9' },
                            { label: 'Link Status', val: stationBusOk ? 'HEALTHY · FORWARDING' : 'LINK FAULT / DOWN', col: stationBusOk ? '#4ADE80' : '#FCA5A5' },
                          ].map(({ label, val, col }) => (
                            <div key={label} className="grid grid-cols-[100px_1fr] items-center px-3 py-1.5">
                              <span className="text-[#E0F7FF] font-semibold">{label}</span>
                              <span style={{ color: col }} className="font-mono font-extrabold truncate">: {val}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* PORT-TO-PORT GLOWING SVG CABLES & MOVING PACKET BADGES */}
              {(() => {
                const ready =
                  ports.ied_P1 && ports.ied_P2 && ports.ied_P3 && ports.ied_P4 &&
                  ports.sw_p1 && ports.sw_p2 && ports.sw_p3 && ports.sw_p4 &&
                  ports.sw_p5 && ports.gtw_eth0 && ports.gtw_eth1 && ports.rcc_wan;
                if (!ready) return null;

                const W = stageSize.w;
                const H = stageSize.h;
                const swY = Math.max(ports.sw_p1.y, ports.sw_p2.y, ports.sw_p3.y, ports.sw_p4.y);
                const swX = ports.sw_p1.x;
                const bendXs = [swX - 96, swX - 78, swX - 60, swX - 42];
                const dropYs = [swY + 22, swY + 34, swY + 46, swY + 58];

                const iedRoutes = IEC61850_IEDS.map((dev, i) => {
                  const a = ports[`ied_${dev.id}`];
                  const b = ports[`sw_p${dev.portNum}`];
                  return [a, { x: bendXs[i], y: a.y }, { x: bendXs[i], y: dropYs[i] }, { x: b.x, y: dropYs[i] }, b];
                });

                const swToGtwPts = [ports.sw_p5, { x: (ports.sw_p5.x + ports.gtw_eth0.x) / 2, y: ports.sw_p5.y }, { x: (ports.sw_p5.x + ports.gtw_eth0.x) / 2, y: ports.gtw_eth0.y }, ports.gtw_eth0];
                const gtwToRccPts = [ports.gtw_eth1, { x: (ports.gtw_eth1.x + ports.rcc_wan.x) / 2, y: ports.gtw_eth1.y }, { x: (ports.gtw_eth1.x + ports.rcc_wan.x) / 2, y: ports.rcc_wan.y }, ports.rcc_wan];

                let pktPos: { x: number; y: number } | null = null;
                let pktColor = '#00E5FF';
                let pktLabel = '';

                if (simPhase === 'MMS_IN' && mmsHealthy) {
                  pktPos = samplePolyline([...iedRoutes[activeIedIdx], ...swToGtwPts], cycleProgress / 0.24);
                  pktColor = '#00E5FF';
                  pktLabel = `MMS · ${activeIed.shortName}`;
                } else if (simPhase === 'WAN_TX' && convHealthy && wanHealthy) {
                  pktPos = samplePolyline(gtwToRccPts, (cycleProgress - 0.72) / 0.28);
                  pktColor = '#A3E635';
                  pktLabel = `IEC-104 · IOA:${activeIed.ioa}`;
                }

                const midSwGtwX = (ports.sw_p5.x + ports.gtw_eth0.x) / 2;
                const midSwGtwY = Math.min(ports.sw_p5.y, ports.gtw_eth0.y) - 18;
                const midGtwRccX = (ports.gtw_eth1.x + ports.rcc_wan.x) / 2;
                const midGtwRccY = Math.min(ports.gtw_eth1.y, ports.rcc_wan.y) - 18;

                return (
                  <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 pointer-events-none z-20">
                    <defs>
                      <filter id="i104GlowCyan" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                        <feGaussianBlur stdDeviation="3.2" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="i104GlowGreen" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                        <feGaussianBlur stdDeviation="3.2" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>

                    {iedRoutes.map((pts, i) => {
                      const isPAct = i === activeIedIdx;
                      const isPFault = (i === 1 && p2Offline) || mmsLost;
                      return (
                        <path
                          key={IEC61850_IEDS[i].id}
                          d={roundedOrthPath(pts, 14)}
                          fill="none"
                          stroke={isPFault ? '#EF4444' : isPAct ? '#38F3FF' : '#0EA5E9'}
                          strokeOpacity={isPFault ? 0.95 : isPAct ? 1 : 0.65}
                          strokeWidth={isPAct ? 3.6 : 2.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={isPFault ? '7 5' : undefined}
                          filter={isPFault ? undefined : 'url(#i104GlowCyan)'}
                        />
                      );
                    })}

                    <path
                      d={roundedOrthPath(swToGtwPts, 10)}
                      fill="none"
                      stroke={stationBusOk ? '#00E5FF' : '#EF4444'}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      strokeDasharray={stationBusOk ? undefined : '7 5'}
                      filter={stationBusOk ? 'url(#i104GlowCyan)' : undefined}
                    />
                    <text x={midSwGtwX} y={midSwGtwY - 6} textAnchor="middle" fill="#BAE6FD" fontSize="10.5" fontWeight="800" fontFamily="monospace">P5 → ETH0</text>
                    <text x={midSwGtwX} y={midSwGtwY + 7} textAnchor="middle" fill="#7DD3FC" fontSize="9.5" fontWeight="700" fontFamily="monospace">(IEC 61850 MMS)</text>

                    <path
                      d={roundedOrthPath(gtwToRccPts, 10)}
                      fill="none"
                      stroke={wanHealthy ? '#22C55E' : '#EF4444'}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      strokeDasharray={wanHealthy ? undefined : '7 5'}
                      filter={wanHealthy ? 'url(#i104GlowGreen)' : undefined}
                    />
                    <text x={midGtwRccX} y={midGtwRccY - 6} textAnchor="middle" fill="#DCFCE7" fontSize="10.5" fontWeight="800" fontFamily="monospace">ETH1 → WAN</text>
                    <text x={midGtwRccX} y={midGtwRccY + 7} textAnchor="middle" fill="#86EFAC" fontSize="9.5" fontWeight="700" fontFamily="monospace">(IEC-104 TCP/2404)</text>

                    {pktPos && (
                      <g>
                        <circle cx={pktPos.x} cy={pktPos.y} r="7.5" fill={pktColor} fillOpacity="0.28" />
                        <circle cx={pktPos.x} cy={pktPos.y} r="4.8" fill="#FFFFFF" stroke={pktColor} strokeWidth="2.5" filter="url(#i104GlowCyan)" />
                        <rect
                          x={pktPos.x - (simPhase === 'WAN_TX' ? 58 : 48)}
                          y={pktPos.y - 28}
                          width={simPhase === 'WAN_TX' ? 116 : 96}
                          height="18"
                          rx="9"
                          fill={simPhase === 'WAN_TX' ? '#06331F' : '#041526'}
                          stroke={pktColor}
                          strokeWidth="1.5"
                        />
                        <text
                          x={pktPos.x}
                          y={pktPos.y - 16}
                          textAnchor="middle"
                          fill={simPhase === 'WAN_TX' ? '#D9F99D' : '#FFFFFF'}
                          fontSize="9"
                          fontWeight="800"
                          fontFamily="monospace"
                        >
                          {pktLabel}
                        </text>
                      </g>
                    )}
                  </svg>
                );
              })()}
            </div>

            {/* Bottom Active Path Bar */}
            <div className="mt-2 rounded-xl border border-[#17466B] bg-[#041424]/95 px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]">
              <div className="flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${endToEndOk ? 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]' : 'bg-[#EF4444] shadow-[0_0_8px_#EF4444]'}`} />
                <span className="font-extrabold text-[#4ADE80]">ACTIVE PATH:</span>
                <span className="text-[#E0F2FE] font-semibold">
                  {activeIed.fullName} (MMS/102) → RSP35 (Port {activeIed.portNum} → P5) → GTW-01 (ETH0 → ETH1) → RCC/SLDC (IEC-104/2404)
                </span>
              </div>
              <span
                className="rounded-lg border px-3 py-0.5 text-[10.5px] font-extrabold"
                style={endToEndOk ? { background: '#072A42', borderColor: '#38F3FF', color: '#7DD3FC' } : { background: '#3B0D15', borderColor: '#EF4444', color: '#FCA5A5' }}
              >
                {stagePillLabel}
              </span>
            </div>
          </div>

          {/* 4. COMPREHENSIVE 32-TEST INTERACTIVE SIMULATION LAB (FROSTED CYAN GLASSMORPHISM) */}
          <div
            className="i104-glass-panel relative rounded-2xl p-4 sm:p-5 space-y-3.5 overflow-hidden"
            style={{
              background:
                'radial-gradient(ellipse 46% 32% at 50% 0%, rgba(72, 238, 255, 0.28) 0%, transparent 72%), ' +
                'radial-gradient(ellipse 36% 24% at 16% 100%, rgba(0, 225, 255, 0.22) 0%, transparent 72%), ' +
                'linear-gradient(180deg, rgba(24, 78, 108, 0.78) 0%, rgba(16, 56, 82, 0.84) 52%, rgba(12, 46, 68, 0.88) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(86, 235, 255, 0.78)',
              boxShadow: '0 0 34px rgba(0, 224, 255, 0.34), inset 0 1px 1px rgba(190, 252, 255, 0.72), inset 0 -1px 1px rgba(0, 232, 255, 0.55)',
            }}
          >
            <style>{`
              .i104-glass-panel::before { content:''; position:absolute; top:0; left:10%; right:10%; height:2px; background:linear-gradient(90deg,transparent,rgba(160,250,255,.92),transparent); pointer-events:none; }
              .i104-glass-panel::after { content:''; position:absolute; bottom:0; left:12%; right:12%; height:2px; background:linear-gradient(90deg,transparent,rgba(0,232,255,.85),transparent); pointer-events:none; }
              .i104-glass-scroll::-webkit-scrollbar { width: 11px; height: 11px; }
              .i104-glass-scroll::-webkit-scrollbar-track { background: rgba(10, 42, 64, 0.72); border-left: 1px solid rgba(90, 215, 245, 0.28); }
              .i104-glass-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #42F8FF 0%, #00D8F5 100%); border-radius: 999px; border: 2px solid rgba(10, 42, 64, 0.85); box-shadow: 0 0 12px rgba(0, 240, 255, 0.9); }
            `}</style>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <svg viewBox="0 0 28 28" className="w-6 h-6 shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(0,232,255,0.85))' }} fill="none">
                    <path d="M14 2.5L24 8v12l-10 5.5L4 20V8l10-5.5z" stroke="#38F3FF" strokeWidth="1.7" />
                    <path d="M4 8l10 5.5L24 8M14 13.5v12" stroke="#38F3FF" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <h2 className="text-[15px] sm:text-[17px] font-extrabold text-white">
                    IEC 61850 → IEC-104 Test Simulation &amp; Fault Injection Lab (32 Interactive Tests)
                  </h2>
                  <span className="rounded-full border border-[#22C55E] bg-[#0A5C2E]/70 px-3 py-0.5 text-[10px] font-extrabold text-[#4ADE80]">
                    SAFE SIMULATION ONLY
                  </span>
                </div>
                <p className="text-[12px] text-[#D4EEF9] mt-1">
                  Toggle any test ON/OFF independently to verify STARTDT/STOPDT/TESTFR, MMS BRCB/URCB reports, CP56Time2a quality conversion, GI (QOI=20), SBO commands, and WAN resilience.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={handleRunAllSafe} style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.46), rgba(12,92,52,0.84))', borderColor: '#4ADE80', boxShadow: '0 0 16px rgba(34,197,94,0.5)' }} className="rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-white hover:brightness-110 transition">▶ Run All Safe Tests</button>
                <button type="button" onClick={() => handleResetAll(true)} style={{ background: 'linear-gradient(180deg, rgba(217,138,28,0.50), rgba(112,58,12,0.86))', borderColor: '#F59E0B' }} className="rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-white hover:brightness-110 transition">■ Stop All Tests</button>
                <button type="button" onClick={() => handleResetAll(false)} style={{ background: 'linear-gradient(180deg, rgba(220,56,62,0.54), rgba(128,20,28,0.86))', borderColor: '#F87171' }} className="rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-white hover:brightness-110 transition">↺ Reset All Faults</button>
                <button type="button" onClick={handleExportCsv} style={{ background: 'linear-gradient(180deg, rgba(28,116,164,0.55), rgba(12,60,94,0.84))', borderColor: 'rgba(96,205,250,0.72)' }} className="inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-[#ECF8FF] hover:brightness-110 transition"><Download className="w-3.5 h-3.5 text-[#7DD3FC]" /> Export CSV</button>
                <button type="button" onClick={() => setShowHistory((h) => !h)} style={{ background: 'linear-gradient(180deg, rgba(26,70,100,0.62), rgba(12,42,66,0.84))', borderColor: 'rgba(110,200,235,0.52)' }} className="inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-[#E2F4FF] hover:border-[#38F3FF] transition"><History className="w-3.5 h-3.5 text-[#9BD8F4]" /> History ({testHistory.length})</button>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['ALL', 'All 32 Tests'],
                  ['A_UFRAME', 'A. Link & U-Frames (6)'],
                  ['B_MMS', 'B. IEC 61850 MMS (6)'],
                  ['C_CONV', 'C. 61850→104 Conversion (7)'],
                  ['D_CMD', 'D. GI & Commands (7)'],
                  ['E_WAN', 'E. APCI & WAN (6)'],
                ] as const
              ).map(([cat, lbl]) => {
                const isAct = testCatFilter === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setTestCatFilter(cat)}
                    style={
                      isAct
                        ? { background: 'linear-gradient(180deg, #3CF4FF 0%, #00D2EC 100%)', borderColor: '#A8FDFF', color: '#031B2E', boxShadow: '0 0 18px rgba(0,234,255,0.72)' }
                        : { background: 'linear-gradient(180deg, rgba(32,82,110,0.52), rgba(18,54,78,0.62))', borderColor: 'rgba(125,215,242,0.48)', color: '#ECF8FF' }
                    }
                    className="rounded-[10px] border px-3.5 py-1.5 text-[12px] font-bold transition hover:border-[#3CF4FF]"
                  >
                    {lbl}
                  </button>
                );
              })}
            </div>

            {/* 2-COLUMN SPLIT: LEFT = 32-TEST TABLE | RIGHT = STEP-BY-STEP EXECUTION INSPECTOR */}
            <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_1fr] gap-3.5 items-start">
              {/* LEFT SIDE: 32-TEST SIMULATION TABLE */}
            <div
              style={{ border: '1.5px solid rgba(100, 224, 248, 0.62)', background: 'linear-gradient(180deg, rgba(26, 76, 104, 0.52) 0%, rgba(14, 52, 76, 0.64) 100%)' }}
              className="i104-glass-scroll overflow-x-auto max-h-[385px] overflow-y-auto rounded-xl"
            >
              <table className="w-full text-left border-collapse font-sans text-[12.5px]">
                <thead style={{ background: 'linear-gradient(180deg, rgba(64,126,158,0.68), rgba(36,86,116,0.76))', borderBottom: '1px solid rgba(120,218,245,0.38)' }} className="sticky top-0 z-10 text-[#F0FAFF] font-bold">
                  <tr>
                    <th className="py-2.5 px-3.5 w-12">#</th>
                    <th className="py-2.5 px-3.5">Test Name</th>
                    <th className="py-2.5 px-3.5 text-center w-28">Toggle</th>
                    <th className="py-2.5 px-3.5 text-center w-28">Status</th>
                    <th className="py-2.5 px-3.5">Expected Result</th>
                    <th className="py-2.5 px-3.5">Actual Result</th>
                    <th className="py-2.5 px-3.5 text-right w-28">Timestamp</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleTests.map((t) => {
                    const r = testState[t.id];
                    const isSel = selectedTestId === t.id;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTestId(t.id)}
                        style={
                          isSel
                            ? { background: 'linear-gradient(90deg, rgba(0,216,238,0.42), rgba(0,186,216,0.28), rgba(0,210,236,0.36))', boxShadow: 'inset 0 0 0 1.5px rgba(82,242,255,0.88)' }
                            : r.enabled
                            ? { background: t.isFault ? 'rgba(239,68,68,0.16)' : 'rgba(16,185,129,0.14)', borderTop: '1px solid rgba(130,210,238,0.18)' }
                            : { borderTop: '1px solid rgba(130,210,238,0.18)' }
                        }
                        className="cursor-pointer transition-colors hover:bg-[#196488]/45"
                      >
                        <td className="py-2.5 px-3.5 text-[#C4E2F2] font-medium">{t.num}</td>
                        <td className="py-2.5 px-3.5 font-bold text-white whitespace-nowrap">{t.name}</td>
                        <td className="py-2.5 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTestId(t.id);
                              handleToggleTest(t);
                            }}
                            style={{
                              background: r.enabled ? (t.isFault ? 'linear-gradient(90deg,#dc2626,#ef4444)' : 'linear-gradient(90deg,#16a34a,#22c55e)') : 'rgba(14,42,62,0.82)',
                              borderColor: r.enabled ? (t.isFault ? '#fca5a5' : '#86efac') : 'rgba(130,215,242,0.58)',
                            }}
                            className="inline-flex items-center justify-between w-[54px] h-[24px] rounded-full border-[1.5px] px-1 transition-all"
                          >
                            {r.enabled ? (<><span className="text-[9px] font-extrabold text-white pl-1.5">ON</span><span className="w-4 h-4 rounded-full bg-white shadow" /></>) : (<><span className="w-4 h-4 rounded-full bg-white shadow" /><span className="text-[9px] font-bold text-[#CBE8F6] pr-1">OFF</span></>)}
                          </button>
                        </td>
                        <td className="py-2.5 px-3.5 text-center">
                          <span
                            style={
                              r.status === 'PASSED'
                                ? { background: 'rgba(16,185,129,0.28)', borderColor: '#4ADE80', color: '#DCFCE7' }
                                : r.status === 'FAILED'
                                ? { background: 'rgba(239,68,68,0.28)', borderColor: '#F87171', color: '#FEE2E2' }
                                : { background: 'rgba(18,86,118,0.65)', borderColor: 'rgba(90,222,248,0.68)', color: '#DCF8FF' }
                            }
                            className="inline-block rounded-full border-[1.5px] px-3 py-0.5 text-[10px] font-extrabold"
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3.5 text-[#E0F3FC]">{t.expectedResult}</td>
                        <td className="py-2.5 px-3.5 text-[#D2ECF9]">{r.actualResult}</td>
                        <td className="py-2.5 px-3.5 text-right text-[#B8D8EA] whitespace-nowrap">{r.timestamp}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


              {/* RIGHT SIDE: LIVE STEP-BY-STEP TEST EXECUTION DETAILS BOX */}
              {(() => {
                const selTest = IEC104_TESTS.find((x) => x.id === selectedTestId) || IEC104_TESTS[0];
                const selRt = testState[selTest.id];
                const info = buildIec104TestSteps(selTest, selRt, nsSeq, nrSeq);
                return (
                  <div
                    style={{
                      border: '1.5px solid rgba(125, 249, 255, 0.65)',
                      background:
                        'radial-gradient(ellipse 65% 40% at 50% 0%, rgba(56, 232, 255, 0.18), transparent 72%), ' +
                        'linear-gradient(180deg, rgba(14, 52, 78, 0.78) 0%, rgba(8, 32, 52, 0.90) 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(210, 252, 255, 0.42), 0 0 22px rgba(0, 224, 255, 0.16)',
                    }}
                    className="rounded-xl p-3.5 space-y-2.5 max-h-[385px] overflow-y-auto i104-glass-scroll"
                  >
                    <div className="flex items-start justify-between gap-2 pb-2 border-b border-[#56EBFF]/30">
                      <div className="min-w-0">
                        <div className="font-mono text-[10px] font-extrabold text-[#38F3FF]">
                          STEP-BY-STEP TEST INSPECTOR · TEST #{selTest.num}
                        </div>
                        <div className="text-[14px] font-extrabold text-white leading-snug mt-0.5">
                          {selTest.name}
                        </div>
                      </div>
                      <span
                        className="shrink-0 rounded-full border-[1.5px] px-2.5 py-0.5 font-mono text-[9.5px] font-extrabold"
                        style={
                          selRt.status === 'PASSED'
                            ? { background: 'rgba(16,185,129,0.28)', borderColor: '#4ADE80', color: '#DCFCE7' }
                            : selRt.status === 'FAILED'
                            ? { background: 'rgba(239,68,68,0.28)', borderColor: '#F87171', color: '#FEE2E2' }
                            : { background: 'rgba(18,86,118,0.65)', borderColor: 'rgba(90,222,248,0.68)', color: '#DCF8FF' }
                        }
                      >
                        {selRt.enabled ? (selTest.isFault ? 'FAULT ACTIVE' : 'PASSED') : 'IDLE'}
                      </span>
                    </div>

                    <div className="rounded-lg border border-[#56EBFF]/30 bg-[#051C30]/75 px-2.5 py-1.5 font-mono text-[10px]">
                      <span className="text-[#9BD3EC] font-bold">Affected Path: </span>
                      <span className="text-[#E0F7FF]">{info.path}</span>
                    </div>

                    <div className="space-y-1.5">
                      {info.steps.map((st) => (
                        <div
                          key={st.num}
                          className="rounded-lg border border-[#56EBFF]/25 bg-[#062138]/75 px-2.5 py-2 flex items-start gap-2.5"
                        >
                          <span
                            style={{ backgroundColor: st.color, color: '#031829' }}
                            className="w-5 h-5 rounded-full shrink-0 inline-flex items-center justify-center font-mono text-[10px] font-black mt-0.5"
                          >
                            {st.num}
                          </span>
                          <div className="min-w-0">
                            <div style={{ color: st.color }} className="text-[11px] font-extrabold">
                              Step {st.num}: {st.title}
                            </div>
                            <div className="text-[11px] text-[#E0F3FC] leading-relaxed mt-0.5">
                              {st.detail}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="rounded-lg border border-[#FACC15]/45 bg-[#041424]/90 p-2 font-mono text-[10px]">
                      <div className="text-[#FDE047] font-extrabold mb-0.5">Wire Frame / APCI Hex Trace:</div>
                      <div className="text-[#A3E635] break-all">{info.frameHex}</div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {showHistory && (
              <div className="rounded-xl border border-[#38F3FF]/45 bg-[#04182B]/90 p-3 space-y-1.5">
                <div className="text-xs font-extrabold text-[#7DD3FC]">Test Execution History</div>
                {testHistory.length === 0 ? (
                  <div className="text-[11px] text-[#9BC0DF]">No test actions recorded yet.</div>
                ) : (
                  <div className="max-h-[140px] overflow-y-auto font-mono text-[10.5px] space-y-1">
                    {testHistory.map((h) => (
                      <div key={h.id} className="flex justify-between gap-2 border-b border-[#123A59] pb-1">
                        <span className="text-[#94B8D7]">{h.time}</span>
                        <span className="text-white font-bold">{h.testName} ({h.action})</span>
                        <span style={{ color: h.status === 'FAILED' ? '#FCA5A5' : '#4ADE80' }}>{h.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* SECONDARY TABS */}
      {activeTab !== 'TOPOLOGY_LIVE' && (
        <div className="rounded-2xl border border-[#1B4B72] bg-[#06182B] p-4 space-y-3">
          {activeTab === 'IOA_MAPPING' && (
            <>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-[#FDE047]" /> Gateway IEC 61850 → IEC 60870-5-104 IOA Mapping Table ({ioaTable.length} IOAs · COA=132)</h3>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead className="bg-[#0B2A46] text-[#9BC0DF] sticky top-0">
                    <tr><th className="py-2 px-2.5">IOA</th><th className="py-2 px-2.5">Type ID</th><th className="py-2 px-2.5">COT</th><th className="py-2 px-2.5">Signal Description</th><th className="py-2 px-2.5">IEC 61850 Source</th><th className="py-2 px-2.5">Live Value</th></tr>
                  </thead>
                  <tbody className="divide-y divide-[#133252]">
                    {ioaTable.map((row) => (
                      <tr key={row.ioa} className="hover:bg-[#0B2A46]/60">
                        <td className="py-1.5 px-2.5 text-[#38F3FF] font-bold">{row.ioa}</td>
                        <td className="py-1.5 px-2.5 text-[#D8B4FE]">{row.typeId}</td>
                        <td className="py-1.5 px-2.5 text-[#FDE047]">{row.cot}</td>
                        <td className="py-1.5 px-2.5 text-white font-sans font-semibold">{row.description}</td>
                        <td className="py-1.5 px-2.5 text-[#7DD3FC]">{row.sourceRef}</td>
                        <td className="py-1.5 px-2.5 text-[#4ADE80] font-bold">{row.valueText}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'GI_SEQUENCE' && (
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-white">Station General Interrogation Sequence (C_IC_NA_1, QOI=20)</h3>
                <button type="button" onClick={handleTriggerGi} className="rounded-lg border border-[#C084FC] bg-[#2E1065] px-3 py-1.5 font-extrabold text-[#E9D5FF]">Trigger Station GI Now</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 font-mono">
                {[
                  ['Step 1 · COT=6', 'RCC → GTW-01: C_IC_NA_1 Activation (QOI=20)'],
                  ['Step 2 · COT=7', 'GTW-01 → RCC: Activation Confirm'],
                  ['Step 3 · COT=20', `GTW-01 → RCC: ${ioaTable.length} IOAs Snapshot Burst`],
                  ['Step 4 · COT=10', 'GTW-01 → RCC: Activation Termination'],
                ].map(([t, d]) => (
                  <div key={t} className="rounded-xl border border-[#1E5280] bg-[#041222] p-3">
                    <div className="font-extrabold text-[#38F3FF]">{t}</div>
                    <div className="text-[#D2ECF9] mt-1">{d}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'REMOTE_COMMANDS' && (
            <div className="space-y-3 text-xs max-w-xl">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><Send className="w-4 h-4 text-[#4ADE80]" /> RCC Remote Telecontrol Command (C_DC_NA_1 → IEC 61850 CSWI1)</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <select value={cmdBayId} onChange={(e) => setCmdBayId(e.target.value)} className="rounded-lg border border-[#1E5280] bg-[#041222] p-2 font-mono text-white">
                  {bays.map((b) => <option key={b.id} value={b.id}>{b.bayCode} ({b.breakerState})</option>)}
                </select>
                <select value={cmdMode} onChange={(e) => setCmdMode(e.target.value as 'SBO' | 'DIRECT')} className="rounded-lg border border-[#1E5280] bg-[#041222] p-2 font-mono text-white">
                  <option value="SBO">SBO (Select-Before-Operate)</option>
                  <option value="DIRECT">Direct Execute</option>
                </select>
                <select value={cmdAction} onChange={(e) => setCmdAction(e.target.value as 'TRIP' | 'CLOSE')} className="rounded-lg border border-[#1E5280] bg-[#041222] p-2 font-mono text-white">
                  <option value="TRIP">TRIP (DCO=1 OFF)</option>
                  <option value="CLOSE">CLOSE (DCO=2 ON)</option>
                </select>
              </div>
              <button type="button" onClick={handleSendCommand} className="rounded-lg border border-[#22C55E] bg-[#062E20] px-4 py-2 font-extrabold text-[#4ADE80]">Send Remote Command ({cmdMode})</button>
              <div className="rounded-lg border border-[#1E5280] bg-[#041222] p-2.5 font-mono text-[#7DD3FC]">{lastCmdMsg}</div>
            </div>
          )}

          {activeTab === 'APCI_ANALYZER' && (
            <div className="space-y-2 font-mono text-xs">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><FileCode2 className="w-4 h-4 text-[#D8B4FE]" /> APCI / ASDU Hex Frame Dissector ({activeIed.fullName})</h3>
              <div className="rounded-xl border border-[#1E5280] bg-[#03101F] p-3 space-y-1.5">
                <div className="text-[#38F3FF]">IEC 61850 MMS Report: {activeIed.iedName} / {activeIed.rcbName} → {activeIed.lnRef} = {activeIed.baseValue} {activeIed.unit}</div>
                <div className="text-[#4ADE80]">IEC-104 I-Frame TX:   68 15 {(nsSeq << 1).toString(16).padStart(4, '0').toUpperCase()} {(nrSeq << 1).toString(16).padStart(4, '0').toUpperCase()} {activeIed.typeIdNum.toString(16).padStart(2, '0').toUpperCase()} 01 03 00 84 00 {activeIed.ioa.toString(16).padStart(6, '0').toUpperCase()} {badQuality ? '80' : '00'}</div>
                <div className="text-[#FDE047]">IEC-104 S-Frame Ack:  68 04 01 00 {(nsSeq << 1).toString(16).padStart(4, '0').toUpperCase()}</div>
              </div>
            </div>
          )}

          {activeTab === 'LOGS_DIAGNOSTICS' && (
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-[#38F3FF]" /> Live IEC 61850 MMS &amp; IEC-104 APCI/ASDU Stream</h3>
              <div className="max-h-[380px] overflow-y-auto space-y-1 font-mono text-[11px]">
                {logs.map((l) => (
                  <div key={l.id} className="flex flex-wrap justify-between gap-2 border-b border-[#133252] pb-1">
                    <span className="text-[#94B8D7]">{l.time}</span>
                    <span className="text-[#38F3FF] font-bold">{l.frameType}</span>
                    <span className="text-[#E0F2FE]">{l.direction}</span>
                    <span className="text-[#FDE047]">{l.details}</span>
                    <span style={{ color: l.result === 'Success' || l.result === 'Delivered' ? '#4ADE80' : '#FCA5A5' }} className="font-extrabold">{l.result}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
