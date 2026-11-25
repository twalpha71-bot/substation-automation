import { LabFaultWorkbench } from '../components/LabFaultWorkbench';
import './ModbusTcpLabPage.css';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ProtocolTroubleshootingPanel } from '../components/ProtocolTroubleshootingPanel';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildIec104TelecontrolTable } from '../data/protocolRegistry';
import {
  Activity,
  AlertTriangle,
  Cpu,
  Network,
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
  { num: 33, id: 'T33_SINGLE_POINT', name: 'Single-point protection indication (M_SP_TB_1)', cat: 'C_CONV', isFault: false, safeBatch: false, expectedResult: 'Compare the sample single-point protection indication with the double-point breaker position.' },
];
const CORE_TESTS = [
  { name: 'TCP Connection', stage: 'WAN and TCP/2404',
    recovery: 'Verify the TCP/2404 session is established, then confirm STARTDT and a new indication.',
    variants: ['T01_TCP2404_CONN', 'T05_PORT2404_DOWN', 'T04_TESTFR'] },
  { name: 'STARTDT / STOPDT', stage: 'STARTDT and APCI flow control',
    recovery: 'Confirm STARTDT Act / Con after recovery and check that I-frames resume.',
    variants: ['T02_STARTDT', 'T03_STOPDT', 'T06_STARTDT_T1_TO', 'T27_NS_NR_SYNC', 'T28_SFRAME_ACK', 'T29_K_WINDOW_FULL'] },
  { name: 'General Interrogation', stage: 'GI termination',
    recovery: 'Open General Interrogation and verify confirmation, the data burst and termination in order.',
    variants: ['T20_GI_ACT', 'T21_GI_CON', 'T22_GI_TERM', 'T25_GI_TIMEOUT'] },
  { name: 'Single / Double Point Indications', stage: 'Gateway conversion and IOA',
    recovery: 'Compare the mapped point type and position bits with the source indication and RCC display.',
    variants: ['T13_XCBR_M_DP_TB_1', 'T33_SINGLE_POINT', 'T08_BRCB_REPORT'] },
  { name: 'IOA / COA Mapping', stage: 'Gateway conversion and IOA',
    recovery: 'Compare COA, IOA and Type ID across both endpoints, then verify the correct RCC point updates.',
    variants: ['T16_MISSING_IOA', 'T18_COA_MISMATCH', 'T14_MMXU_M_ME_TF_1'] },
  { name: 'Remote Command & Interlocking', stage: 'Remote command interlock',
    recovery: 'Repeat the authorized simulated command after confirming permissives, then verify independent breaker position feedback.',
    variants: ['T23_SBO_CMD', 'T24_DIRECT_CMD', 'T26_INTERLOCK_BLK'] },
  { name: 'Link Failure & Recovery', stage: 'WAN and TCP/2404',
    recovery: 'Restore the affected link and verify fresh MMS reports, a valid IEC-104 session and an RCC update.',
    variants: ['T32_FULL_RECOVERY', 'T07_MMS_ASSOC', 'T10_P2_OFFLINE', 'T11_SWITCH_DOWN', 'T12_MMS_LOST', 'T19_GTW_OVERLOAD', 'T30_WAN_LOSS', 'T31_HIGH_LATENCY'] },
  { name: 'Data Quality & Timestamp', stage: 'Gateway conversion and IOA',
    recovery: 'Compare the source quality and timestamp with the fresh RCC indication, including CP56Time2a where configured.',
    variants: ['T15_CP56TIME2A', 'T17_BAD_QUALITY', 'T09_URCB_MEAS'] },
] as const;


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
    t.id === 'T33_SINGLE_POINT' ? 'Example Type ID: 1E (30). Compare with 1F (31) in the double-point variation.' :
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
          : `Test #${t.num} (${t.name}) is currently IDLE. Use Run Scenario to execute live verification.`,
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
          ? `${t.expectedResult}${isF ? ' — Clear Scenario or run the Full Recovery variation to restore healthy operation.' : ' — Expected result in the simulator.'}`
          : 'Use Run Scenario to view the simulated trace.',
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
  const [cycleProgress, setCycleProgress] = useState<number>(0);

  // Hover & Pin Popups
  const [iedPopup, setIedPopup] = useState<{ device: Iec61850IedSpec; top: number; rayY: number } | null>(null);
  const [iedPopupPinned, setIedPopupPinned] = useState(false);
  const iedPopupCloseTimer = useRef<ReturnType<typeof setTimeout>>();
  const iedPopupTrigger = useRef<HTMLButtonElement | null>(null);
  const iedPopupClose = useRef<HTMLButtonElement | null>(null);
  const restoreIedFocus = useRef(false);

  useEffect(() => () => clearTimeout(iedPopupCloseTimer.current), []);
  useEffect(() => {
    if (iedPopupPinned) iedPopupClose.current?.focus({ preventScroll: true });
  }, [iedPopupPinned]);
  const [switchHovered, setSwitchHovered] = useState(false);
  const [switchPinned, setSwitchPinned] = useState(false);
  const switchPopupCloseTimer = useRef<ReturnType<typeof setTimeout>>();
  const showSwitchPopup = !iedPopup && (switchHovered || switchPinned);
  useEffect(() => () => clearTimeout(switchPopupCloseTimer.current), []);

  const closeSwitchPopup = () => {
    clearTimeout(switchPopupCloseTimer.current);
    setSwitchHovered(false);
    setSwitchPinned(false);
  };

  const scheduleSwitchPopupClose = () => {
    clearTimeout(switchPopupCloseTimer.current);
    switchPopupCloseTimer.current = setTimeout(() => setSwitchHovered(false), 200);
  };
  const [gatewayPinned, setGatewayPinned] = useState<boolean>(false);
  const [gatewayManuallyClosed, setGatewayManuallyClosed] = useState<boolean>(false);

  // 32-Test Simulation Lab State
  const [coreTestIndex, setCoreTestIndex] = useState(0);
  const [selectedTestId, setSelectedTestId] = useState<string>(CORE_TESTS[0].variants[0]);
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

  // Start every architecture visit at the protocol source, not mid-conversion.
  useEffect(() => {
    if (activeTab === 'TOPOLOGY_LIVE') {
      setCycleProgress(0);
      setActiveIedIdx(p2Offline ? 1 : 0);
      setGatewayPinned(false);
      setGatewayManuallyClosed(false);
    }
  }, [activeTab]);

  // Auto-open Gateway Popup on MMS arrival, auto-close on IEC-104 departure (unless pinned)
  const showGatewayPopup = !iedPopup && !showSwitchPopup && (gatewayPinned || (simPhase === 'CONVERT' && !gatewayManuallyClosed && mmsHealthy));

  useEffect(() => {
    if (simPhase === 'MMS_IN') {
      setGatewayManuallyClosed(false);
    }
  }, [simPhase]);

  useEffect(() => {
    if (!playing || activeTab !== 'TOPOLOGY_LIVE') return;
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
  }, [playing, speed, highLatency, activeTab]);

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
      : { id: Date.now() + Math.random(), time: ts, frameType: 'I-Frame', direction: 'GTW-01 → RCC/SLDC', details: `N(S)=${nsSeq} N(R)=${nrSeq} · ${d.iec104Type} COA=${coaMismatch ? 99 : 132} IOA=${d.ioa} COT=3 Val=${d.baseValue} ${d.unit}${coaMismatch ? ' · RCC rejected Common Address' : ''}`, result: coaMismatch ? 'Fault' : 'Delivered' };
    setLogs((prev) => [entry, ...prev].slice(0, 40));
  }, [nsSeq]);

  // ResizeObserver Exact Port-to-Port Measurement
  const stageRef = useRef<HTMLDivElement | null>(null);
  const portRefs = useRef<Record<string, HTMLSpanElement | null>>({});

  const showIedPopup = (device: Iec61850IedSpec, trigger: HTMLButtonElement, pin = false) => {
    clearTimeout(iedPopupCloseTimer.current);
    if ((iedPopupPinned && !pin) || !stageRef.current) return;
    closeSwitchPopup();
    const stage = stageRef.current.getBoundingClientRect();
    const source = trigger.getBoundingClientRect();
    const sourceY = source.top - stage.top + source.height * .72;
    const top = Math.max(34, Math.min(stage.height - 382, sourceY - 155));
    iedPopupTrigger.current = trigger;
    setIedPopup({ device, top, rayY: sourceY - top });
    if (pin) setIedPopupPinned(true);
  };

  const scheduleIedPopupClose = () => {
    if (iedPopupPinned) return;
    clearTimeout(iedPopupCloseTimer.current);
    iedPopupCloseTimer.current = setTimeout(() => setIedPopup(null), 225);
  };

  const dismissIedPopup = (returnFocus = false) => {
    clearTimeout(iedPopupCloseTimer.current);
    setIedPopupPinned(false);
    setIedPopup(null);
    if (returnFocus) {
      restoreIedFocus.current = true;
      iedPopupTrigger.current?.focus({ preventScroll: true });
      restoreIedFocus.current = false;
    }
  };

  const openIedPopupTab = (tab: Iec104LabTab) => {
    dismissIedPopup();
    closeSwitchPopup();
    setActiveTab(tab);
  };
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
    const timeout = isOn('T25_GI_TIMEOUT');
    const complete = wanHealthy && !coaMismatch && !timeout;
    if (complete) setGiCount(count => count + 1);
    const details = !wanHealthy ? 'GI could not start: IEC-104 data transfer unavailable.'
      : coaMismatch ? 'GI failed: Common Address mismatch.'
        : timeout ? 'GI confirmation and data burst shown; COT=10 termination timed out.'
          : 'C_IC_NA_1 (QOI=20) COT=6 → COT=7 → COT=20 Burst → COT=10 Terminated';
    setLogs((prev) => [
      { id: Date.now(), time: nowTimeStr(), frameType: 'I-Frame', direction: 'RCC/SLDC ↔ GTW-01', details, result: complete ? 'Delivered' : 'Fault' },
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

  const troubleshootingStages = [
    {
      name: 'Southbound IEC 61850 MMS',
      blocked: !mmsHealthy,
      evidence: switchDown ? 'Station switch uplink is down.' : mmsLost ? 'The MMS association is lost.'
        : iedOfflineNow ? `${activeIed.id} is offline.` : `${activeIed.rcbName} · ${activeIed.dataset}.`,
      check: 'Check the IED and switch path, TCP/102 association, RptEna and DataSet before tracing a northbound indication.',
    },
    {
      name: 'Gateway conversion and IOA',
      blocked: missingIoa || gtwOverload,
      warning: badQuality,
      evidence: missingIoa ? 'The gateway has no IOA mapping.' : gtwOverload ? 'The simulated gateway queue is overloaded.'
        : badQuality ? 'The simulated ASDU carries the Invalid bit.' : `Configured Type ID ${activeIed.typeIdNum} · IOA ${activeIed.ioa}.`,
      check: 'Verify IOA, Type ID, quality and time-tag mapping. Trace invalid quality back to the MMS source point.',
    },
    {
      name: 'WAN and TCP/2404',
      blocked: wanLoss || port2404Down,
      warning: highLatency,
      evidence: wanLoss ? 'WAN link is down.' : port2404Down ? 'TCP/2404 is disconnected.'
        : highLatency ? 'The high-latency test is active.' : 'The simulated TCP link is available.',
      check: 'Verify the gateway and RCC addresses, WAN path and TCP/2404 before checking STARTDT.',
    },
    {
      name: 'STARTDT and APCI flow control',
      blocked: stopdtStandby || startdtTimeout || kWindowFull,
      evidence: stopdtStandby ? 'STOPDT standby is active.' : startdtTimeout ? 'STARTDT confirmation timed out.'
        : kWindowFull ? 'The send window is full.' : `Data transfer enabled · N(S) ${nsSeq} · N(R) ${nrSeq}.`,
      check: 'Use APCI / ASDU Analyzer to check STARTDT confirmation and whether the peer acknowledges outstanding I-frames.',
    },
    {
      name: 'RCC ASDU acceptance',
      blocked: coaMismatch,
      evidence: coaMismatch ? 'The injected Common Address differs from the RCC configuration.'
        : `Configured COA 132 · IOA ${activeIed.ioa}.`,
      check: 'Compare Common Address, IOA, Type ID and COT against the RCC point list.',
    },
  ];
  const coreTest = CORE_TESTS[coreTestIndex];
  const variations = coreTest.variants.map(id => IEC104_TESTS.find(test => test.id === id)!);
  const selectedTest = variations.find(test => test.id === selectedTestId) ?? variations[0];
  const selectedRuntime = testState[selectedTest.id];
  const selectedFaultActive = selectedTest.isFault && selectedRuntime.enabled;
  const affectedStages: Record<string, string> = {
    T10_P2_OFFLINE: 'Southbound IEC 61850 MMS',
    T11_SWITCH_DOWN: 'Southbound IEC 61850 MMS',
    T12_MMS_LOST: 'Southbound IEC 61850 MMS',
    T18_COA_MISMATCH: 'RCC ASDU acceptance',
    T19_GTW_OVERLOAD: 'Gateway conversion and IOA',
  };
  const affectedStage = affectedStages[selectedTest.id] ?? coreTest.stage;
  const firstIssue = troubleshootingStages.find(stage => stage.blocked)
    ?? troubleshootingStages.find(stage => stage.warning);
  const specialCheck = troubleshootingStages.find(stage => stage.name === affectedStage)?.check
    ?? (selectedTest.id === 'T25_GI_TIMEOUT' ? 'Clear the timeout variation and check that the gateway produces the GI termination.'
    : selectedTest.id === 'T26_INTERLOCK_BLK' ? 'Check authority, remote mode and interlock permissives. Clear the injected interlock fault before retrying.'
    : 'Clear this fault variation, then repeat the selected test.');
  const recoveryMessage = selectedFaultActive ? `Clear the selected fault. ${coreTest.recovery}`
    : firstIssue ? `Resolve ${firstIssue.name} first, then recheck the simulated path.`
    : `${selectedTest.isFault && selectedRuntime.actualResult === 'Cleared / Restored' ? 'Scenario cleared. ' : ''}${coreTest.recovery}`;

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

  const guidedEffects: Record<string, boolean> = {
    'T05_PORT2404_DOWN': !wanHealthy,
    'T06_STARTDT_T1_TO': !wanHealthy,
    'T10_P2_OFFLINE': activeIed.id === 'P2' && iedOfflineNow,
    'T11_SWITCH_DOWN': !mmsHealthy,
    'T12_MMS_LOST': !mmsHealthy,
    'T16_MISSING_IOA': !convHealthy,
    'T17_BAD_QUALITY': badQuality,
    'T18_COA_MISMATCH': !endToEndOk
  };
  const guidedExercises = IEC104_TESTS.filter(test => test.id in guidedEffects).map(test => ({
    id: test.id, label: test.name, expected: test.expectedResult, checks: ['Confirm the source device and transport status before checking downstream mapping.', 'Compare the first failed stage, frame/quality evidence and expected effect.', 'Clear this fault; verify the path recovers and inspect the next received value.'],
    active: isOn(test.id), observed: isOn(test.id) && guidedEffects[test.id],
    recovered: !isOn(test.id) && endToEndOk && !badQuality && !p2Offline, evidence: `Device ${activeIed.id}; MMS ${mmsHealthy}; conversion ${convHealthy}; WAN ${wanHealthy}; CA mismatch ${coaMismatch}; invalid quality ${badQuality}; N(S) ${nsSeq}`,
    inject: () => { if (!isOn(test.id)) { setSelectedTestId(test.id); setPlaying(true); setActiveIedIdx(test.id === 'T10_P2_OFFLINE' ? 1 : 0); setCycleProgress(0); setActiveTab('TOPOLOGY_LIVE'); handleToggleTest(test); } },
    clear: () => { if (isOn(test.id)) handleToggleTest(test); },
  }));
  return (
    <div className="space-y-3 pb-8 text-[#E8F4FF]">
      <LabFaultWorkbench lab="IEC104_LAB" target="Four-device protocol training architecture" exercises={guidedExercises} />
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
              ['LOGS_DIAGNOSTICS', 'Troubleshooting & Logs'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => openIedPopupTab(id)}
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
          <section aria-label="Core tests and fault variations" className="rounded-xl border border-[#1E5280] bg-[#051628] p-3 text-xs">
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] xl:items-end">
              <label className="min-w-0 space-y-1">
                <span className="block font-bold text-[#9ED8F6]">Test / Fault</span>
                <select value={coreTestIndex} onChange={event => {
                  const index = Number(event.target.value);
                  setCoreTestIndex(index);
                  setSelectedTestId(CORE_TESTS[index].variants[0]);
                }} className="w-full rounded-lg border border-[#1E5280] bg-[#082038] px-2 py-2 text-white">
                  {CORE_TESTS.map((test, index) => <option key={test.name} value={index}>{test.name}</option>)}
                </select>
              </label>
              <label className="min-w-0 space-y-1">
                <span className="block font-bold text-[#9ED8F6]">Scenario variation</span>
                <select value={selectedTest.id} onChange={event => setSelectedTestId(event.target.value)}
                  className="w-full rounded-lg border border-[#1E5280] bg-[#082038] px-2 py-2 text-white">
                  {variations.map(test => <option key={test.id} value={test.id}>{test.name}{test.isFault ? ' · Fault' : ''}</option>)}
                </select>
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={() => handleToggleTest(selectedTest)}
                  className="rounded-lg border border-[#38F3FF] bg-[#083B5E] px-3 py-2 font-bold text-white">
                  {selectedRuntime.enabled ? 'Clear Scenario' : 'Run Scenario'}
                </button>
                <button type="button" onClick={() => handleResetAll(false)}
                  className="rounded-lg border border-[#1E5280] bg-[#071C2F] px-3 py-2 font-bold text-white">Reset All Faults</button>
              </div>
            </div>
            <p className="mt-2 text-[#BAE6FD]" role="status">
              {selectedRuntime.enabled ? selectedTest.isFault ? 'Fault active' : 'Scenario active'
                : selectedRuntime.actualResult === 'Cleared / Restored' ? 'Scenario cleared' : 'Scenario idle'}
              {' · '}{IEC104_TESTS.filter(test => test.isFault && isOn(test.id)).length} active faults
            </p>
          </section>

          {/* SYSTEM TOPOLOGY CARD */}
          <div
            className="rounded-2xl border p-3.5 relative overflow-x-auto"
            style={{
              borderColor: 'rgba(56, 224, 255, 0.45)',
              background:
                'linear-gradient(rgba(56, 189, 248, 0.04) 1px, transparent 1px), ' +
                'linear-gradient(90deg, rgba(56, 189, 248, 0.04) 1px, transparent 1px), ' +
                'radial-gradient(ellipse 62% 44% at 50% 38%, rgba(28, 92, 126, 0.74) 0%, rgba(14, 52, 78, 0.86) 58%, rgba(10, 38, 58, 0.92) 100%)',
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

            <div
              ref={stageRef}
              className="min-w-[1120px] relative pt-2 pb-2"
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return;
                if (iedPopup) {
                  event.stopPropagation();
                  dismissIedPopup(iedPopupPinned);
                } else if (showSwitchPopup) {
                  event.stopPropagation();
                  closeSwitchPopup();
                }
              }}
            >
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

              {showGatewayPopup && (
                <section
                  id="lab-gateway-info"
                  aria-labelledby="lab-gateway-title"
                  className="lab-gateway-projection"
                  data-pinned={gatewayPinned}
                >
                  <div className="lab-ied-panel lab-gateway-panel" data-fault={!convHealthy}>
                    <div className="lab-gateway-bar">
                      <div className="lab-gateway-heading">
                        <span className="w-1 h-4 rounded-full bg-[#38F3FF]" />
                        <span id="lab-gateway-title">Live IEC 61850 → IEC-104 Conversion</span>
                        <span className="rounded border border-[#F59E0B]/70 bg-[#3B2606] px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-[#FDE047]">
                          {activeIed.shortName}
                        </span>
                      </div>
                      <div className="lab-gateway-controls">
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
                        <button type="button" onClick={() => setGatewayPinned((p) => !p)} aria-label={gatewayPinned ? 'Unpin conversion popup' : 'Pin conversion popup'} aria-pressed={gatewayPinned} className="p-1 rounded hover:bg-white/10 text-[#7DD3FC]">
                          {gatewayPinned ? <PinOff className="w-3.5 h-3.5 text-[#FDE047]" /> : <Pin className="w-3.5 h-3.5" />}
                        </button>
                        <button type="button" onClick={() => { setGatewayPinned(false); setGatewayManuallyClosed(true); }} aria-label="Close conversion popup" className="p-1 rounded hover:bg-white/10 text-[#9BC0DF]">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {(() => {
                      const failed = !mmsHealthy ? 1 : missingIoa ? 3 : gtwOverload || !wanHealthy || coaMismatch ? 4 : 0;
                      const arrived = mmsHealthy && (simPhase === 'CONVERT' || simPhase === 'WAN_TX');
                      const ready = arrived && convStep === 4 && convHealthy && !missingIoa;
                      const rows = [["IED", activeIed.iedName], ["Report", activeIed.rcbName], ["Object", activeIed.lnRef], ["Value", activeIed.baseValue]];
                      const value = `${activeIed.baseValue} ${activeIed.unit}`;
                      const quality = badQuality ? 'INVALID' : 'GOOD';
                      const fields = [['Type ID', activeIed.typeIdNum], ['COT / COA', `3 / ${(coaMismatch ? 99 : 132)}`], ['IOA', activeIed.ioa], ['Value / quality', `${value} / ${quality}`]];
                      const hex = (n: number) => (n & 255).toString(16).padStart(2, '0').toUpperCase();
                      const header = [activeIed.typeIdNum, 1, 3, 0, (coaMismatch ? 99 : 132) & 255, (coaMismatch ? 99 : 132) >> 8, activeIed.ioa & 255, (activeIed.ioa >> 8) & 255, (activeIed.ioa >> 16) & 255].map(hex).join(' ');
                      return <div className="space-y-2 font-mono text-[10px]" style={{overflowWrap:'anywhere'}}>
                        <div className="grid grid-cols-2 gap-2">
                          {[rows, fields].map((group, i) => <div key={i} className="rounded-lg border border-[#24506a] bg-[#081c2e] p-2 min-w-0">
                            <div className={i ? 'text-[#4ADE80] font-bold mb-1' : 'text-[#38F3FF] font-bold mb-1'}>{i ? 'OUTPUT · IEC-104' : 'INPUT · PROTOCOL'}</div>
                            {group.map(([label, data]) => <div key={String(label)} className="mb-1"><span className="text-[#9BC0DF]">{label}: </span><span className="text-white">{(i ? ready : arrived) ? data : '—'}</span></div>)}
                          </div>)}
                        </div>
                        {["Capture MMS report", "Decode value / quality", "Map object to IOA", "Encode timed ASDU"].map((label, i) => {
                          const n = i + 1;
                          const status = !arrived ? 'WAIT' : failed && n === failed && convStep >= n ? 'FAULT' : failed && n > failed ? 'BLOCKED' : convStep > n ? 'DONE' : convStep === n ? 'ACTIVE' : 'WAIT';
                          return <div key={label} className="flex justify-between gap-2 rounded border px-2 py-1" style={{borderColor: status === 'FAULT' ? '#EF4444' : status === 'ACTIVE' ? '#38F3FF' : '#24506a', color: status === 'FAULT' ? '#FCA5A5' : status === 'DONE' ? '#4ADE80' : '#D8EAF5'}}><span>{n}. {label}</span><b>{status}</b></div>;
                        })}
                        <div className="rounded border border-[#24506a] p-2 text-[#7DD3FC]">{arrived ? `MMS decoded object: ${activeIed.lnRef} (BER capture not simulated)` : 'Awaiting packet'}<div>ASDU header HEX (payload excluded): {ready ? header : '—'}</div></div>
                        <div className="text-[#9BC0DF]">Cycle reference: {nsSeq} · {failed ? 'Fault active — clear scenario and verify next cycle' : ready ? 'Encoded · awaiting delivery' : 'Waiting / processing'}</div>
                      </div>;
                    })()}

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
                  <svg viewBox="0 0 360 49" className="lab-gateway-rays" aria-hidden="true">
                    <path d="M 15 0 L 180 48 L 345 0 Z" className="lab-ied-ray-fill" />
                    <path d="M 15 0 L 180 48 L 345 0 M 180 0 V 48" className="lab-ied-ray-lines" />
                    <circle cx="180" cy="46" r="2.8" className="lab-ied-ray-source" />
                  </svg>
                </section>
              )}

              {/* 4 HARDWARE COLUMNS */}
              <div className="grid grid-cols-[1.05fr_1.15fr_1.15fr_1.05fr] gap-4 items-center relative z-10 min-h-[430px]">
                {/* COLUMN 1: 4 IEC 61850 IEDs (DETAILS HIDDEN; HOVER OPENS HOLOGRAPHIC POPUP) */}
                <div className="flex flex-col justify-between gap-2.5 pl-4">
                  {IEC61850_IEDS.map((dev, idx) => {
                    const isAct = idx === activeIedIdx;
                    const isHov = iedPopup?.device.id === dev.id;
                    const isFault = (dev.id === 'P2' && p2Offline) || mmsLost;
                    return (
                      <div
                        key={dev.id}
                        className="flex items-center justify-start relative"
                      >
                        <button
                          type="button"
                          className="lab-ied-trigger relative group p-1.5 cursor-pointer"
                          data-active={isAct}
                          data-fault={isFault}
                          aria-label={`Device info for ${dev.fullName}`}
                          aria-expanded={isHov}
                          aria-controls={isHov ? 'lab-ied-info' : undefined}
                          onMouseEnter={(event) => {
                            if (window.matchMedia('(hover: hover)').matches) showIedPopup(dev, event.currentTarget);
                          }}
                          onMouseLeave={scheduleIedPopupClose}
                          onFocus={(event) => {
                            if (!restoreIedFocus.current && event.currentTarget.matches(':focus-visible')) {
                              showIedPopup(dev, event.currentTarget);
                            }
                          }}
                          onBlur={scheduleIedPopupClose}
                          onClick={(event) => showIedPopup(dev, event.currentTarget, true)}
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
                          <img src={dev.image} alt={dev.fullName} className="lab-ied-photo h-full w-full object-contain group-hover:scale-105 transition-transform" />
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
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* COLUMN 2: COMPACT HIRSCHMANN RSP35 SWITCH (DETAILS HIDDEN; HOVER OPENS HOLOGRAPHIC POPUP) */}
                <div className="flex flex-col items-center justify-center pt-[125px]">
                  <button
                    type="button"
                    className="relative flex items-center justify-center cursor-pointer"
                    aria-label="Hirschmann RSP35 switch details"
                    aria-expanded={showSwitchPopup}
                    aria-controls={showSwitchPopup ? 'lab-switch-info' : undefined}
                    onMouseEnter={() => {
                      if (window.matchMedia('(hover: hover)').matches) {
                        clearTimeout(switchPopupCloseTimer.current);
                        setSwitchHovered(true);
                      }
                    }}
                    onMouseLeave={scheduleSwitchPopupClose}
                    onClick={() => {
                      dismissIedPopup();
                      if (switchPinned) closeSwitchPopup();
                      else setSwitchPinned(true);
                    }}
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
                  </button>
                </div>

                {/* COLUMN 3: IEC-104 GATEWAY GTW-01 */}
                <div className="flex flex-col items-center justify-end pt-[185px]">
                  <button
                    type="button"
                    onClick={() => {
                      setGatewayPinned((p) => !p);
                      dismissIedPopup();
                      closeSwitchPopup();
                      setGatewayManuallyClosed(false);
                    }}
                    aria-label="Gateway GTW-01 conversion"
                    aria-pressed={gatewayPinned}
                    aria-controls={showGatewayPopup ? 'lab-gateway-info' : undefined}
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

              {iedPopup && (
                <div
                  className="lab-ied-projection"
                  style={{ top: iedPopup.top }}
                  onMouseEnter={() => clearTimeout(iedPopupCloseTimer.current)}
                  onMouseLeave={scheduleIedPopupClose}
                >
                  <svg viewBox="0 0 54 390" className="lab-ied-rays" aria-hidden="true">
                    <path d={`M 1 ${iedPopup.rayY} L 54 61 L 54 355 Z`} className="lab-ied-ray-fill" />
                    <path d={`M 54 61 L 1 ${iedPopup.rayY} L 54 355 M 1 ${iedPopup.rayY} L 54 211`} className="lab-ied-ray-lines" />
                    <circle cx="2" cy={iedPopup.rayY} r="3" className="lab-ied-ray-source" />
                  </svg>

                  <section id="lab-ied-info" className="lab-ied-panel" aria-labelledby="lab-ied-title">
                    <div className="lab-ied-bar">
                      <span>IEC 61850 Ed.2 — Device Info</span>
                      <button
                        ref={iedPopupClose}
                        type="button"
                        className="lab-ied-close"
                        aria-label="Close device info"
                        onClick={() => dismissIedPopup(true)}
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="lab-ied-body">
                      <div className="lab-ied-relay">
                        <img src={iedPopup.device.image} alt="" />
                      </div>
                      <div className="lab-ied-details">
                        <h2 id="lab-ied-title">{iedPopup.device.fullName}</h2>
                        <dl>
                          {[
                            { icon: Cpu, label: 'IED Name', value: iedPopup.device.iedName },
                            { icon: Network, label: 'IP Address', value: iedPopup.device.ip },
                            { icon: Layers, label: 'Logical Node', value: iedPopup.device.lnRef },
                            { icon: Activity, label: 'Report CB', value: `${iedPopup.device.rcbName} (${iedPopup.device.dataset})` },
                            { icon: Database, label: 'IEC-104 Map', value: `COA:132 / IOA:${iedPopup.device.ioa} (${iedPopup.device.iec104Type})` },
                            { icon: Activity, label: 'Signals', value: iedPopup.device.signals },
                          ].map(({ icon: Icon, label, value }) => (
                            <div key={label}>
                              <dt><Icon size={19} aria-hidden="true" />{label}</dt>
                              <dd>{value}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>

                    <div className="lab-ied-actions">
                      <button type="button" onClick={() => openIedPopupTab('IOA_MAPPING')}><Layers aria-hidden="true" />IOA Mapping</button>
                      <button type="button" onClick={() => openIedPopupTab('APCI_ANALYZER')}><Activity aria-hidden="true" />Live MMS</button>
                      <button type="button" onClick={() => openIedPopupTab('LOGS_DIAGNOSTICS')}><Terminal aria-hidden="true" />Diagnostics</button>
                      <button type="button" aria-pressed={iedPopupPinned} onClick={() => setIedPopupPinned(true)}><Info aria-hidden="true" />Device Info</button>
                    </div>
                  </section>
                </div>
              )}

              {showSwitchPopup && (
                <section
                  id="lab-switch-info"
                  className="lab-switch-projection"
                  aria-labelledby="lab-switch-title"
                  data-pinned={switchPinned}
                  onMouseEnter={() => clearTimeout(switchPopupCloseTimer.current)}
                  onMouseLeave={scheduleSwitchPopupClose}
                >
                  <div className="lab-ied-panel lab-switch-panel" data-fault={!stationBusOk}>
                    <div className="lab-ied-bar">
                      <span>Station Bus Switch — Device Info</span>
                      <button type="button" className="lab-ied-close" aria-label="Close switch details" onClick={closeSwitchPopup}>
                        <X size={20} />
                      </button>
                    </div>
                    <div className="lab-ied-body">
                      <div className="lab-ied-relay">
                        <img src="assets/devices/hirschmann-rsp35.png" alt="" />
                      </div>
                      <div className="lab-ied-details">
                        <h2 id="lab-switch-title">Hirschmann RSP35</h2>
                        <dl>
                          {[
                            { label: 'Mgmt IP', val: '10.132.10.10', col: '#38F3FF' },
                            { label: 'Station VLAN', val: 'VLAN 10 (IEC 61850 MMS)', col: '#FDE047' },
                            { label: 'Access Ports', val: 'P1–P4 → 7SA87, RET615, C264, D60', col: '#4ADE80' },
                            { label: 'Uplink Port', val: 'P5 (SFP) → IEC-104 GTW-01 ETH0', col: '#E879F9' },
                            { label: 'Link Status', val: stationBusOk ? 'HEALTHY · FORWARDING' : 'LINK FAULT / DOWN', col: stationBusOk ? '#4ADE80' : '#FCA5A5' },
                          ].map(({ label, val, col }) => (
                            <div key={label}>
                              <dt>{label}</dt>
                              <dd style={{ color: col }}>{val}</dd>
                            </div>
                          ))}
                        </dl>
                      </div>
                    </div>
                  </div>
                  <svg viewBox="0 0 360 49" className="lab-gateway-rays" aria-hidden="true">
                    <path d="M 15 0 L 180 48 L 345 0 Z" className="lab-ied-ray-fill" />
                    <path d="M 15 0 L 180 48 L 345 0 M 180 0 V 48" className="lab-ied-ray-lines" />
                  </svg>
                </section>
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

          {/* Scenario troubleshooting and history */}
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
              .i104-glass-scroll::-webkit-scrollbar-track { background: #041024; border-left: 1px solid #1E4E8C; }
              .i104-glass-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #3B82F6 0%, #1D4ED8 100%); border-radius: 999px; border: 2px solid #041024; }
            `}</style>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <svg viewBox="0 0 28 28" className="w-6 h-6 shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(0,232,255,0.85))' }} fill="none">
                    <path d="M14 2.5L24 8v12l-10 5.5L4 20V8l10-5.5z" stroke="#38F3FF" strokeWidth="1.7" />
                    <path d="M4 8l10 5.5L24 8M14 13.5v12" stroke="#38F3FF" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <h2 className="text-[15px] sm:text-[17px] font-extrabold text-white">
                    Test Troubleshooting
                  </h2>
                  <span className="rounded-full border border-[#22C55E] bg-[#0A5C2E]/70 px-3 py-0.5 text-[10px] font-extrabold text-[#4ADE80]">
                    SAFE SIMULATION ONLY
                  </span>
                </div>
                <p className="text-[12px] text-[#D4EEF9] mt-1">
                  Review the selected variation and verify recovery after clearing the fault.
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

            <dl className="grid grid-cols-1 gap-2 text-xs md:grid-cols-2">
              {[
                ['First Failed Stage', firstIssue?.name ?? (selectedFaultActive ? affectedStage : 'No blocked stage detected')],
                ['Root Cause', firstIssue?.evidence ?? (selectedFaultActive ? selectedTest.expectedResult : 'No active fault detected on the simulated path.')],
                ['Corrective Action', firstIssue?.check ?? (selectedFaultActive ? specialCheck : 'Run a fault variation and inspect where the simulated path first changes.')],
                ['Recovery Verification', recoveryMessage],
              ].map(([label, value]) => (
                <div key={label} className="min-w-0 space-y-1 rounded-lg border border-[#1E4E8C] bg-[#061630]/90 p-3">
                  <dt className="font-bold text-[#9BD3EC]">{label}</dt>
                  <dd className="break-words text-[#E0F7FF]">{value}</dd>
                </div>
              ))}
            </dl>
            {selectedTest.id === 'T33_SINGLE_POINT' && (
              <p className="rounded-lg border border-[#1E4E8C] bg-[#061630]/90 p-3 text-xs text-[#E0F7FF]">
                Training example · A protection indication uses one state bit (M_SP_TB_1, Type 30).
                Breaker position uses two state bits (M_DP_TB_1, Type 31).
              </p>
            )}
            <details className="rounded-xl border border-[#56EBFF]/30 bg-[#061630]/90 p-2.5">
              <summary className="cursor-pointer text-xs font-bold text-white">Scenario trace (simulated)</summary>
              {(() => {
                const selTest = selectedTest;
                const selRt = selectedRuntime;
                const info = buildIec104TestSteps(selTest, selRt, nsSeq, nrSeq);
                return (
                  <div
                    style={{
                      border: '1.5px solid rgba(125, 249, 255, 0.65)',
                      background: 'radial-gradient(ellipse 65% 40% at 50% 0%, rgba(56, 232, 255, 0.18), transparent 72%), linear-gradient(180deg, rgba(18, 62, 90, 0.72) 0%, rgba(10, 38, 60, 0.86) 100%)',
                      boxShadow: 'inset 0 1px 0 rgba(210, 252, 255, 0.42), 0 0 22px rgba(0, 224, 255, 0.18)',
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

                    <div className="rounded-lg border border-[#56EBFF]/30 bg-[#061630]/90 px-2.5 py-1.5 font-mono text-[10px]">
                      <span className="text-[#9BD3EC] font-bold">Affected Path: </span>
                      <span className="text-[#E0F7FF]">{info.path}</span>
                    </div>

                    <div className="space-y-1.5">
                      {info.steps.map((st) => (
                        <div
                          key={st.num}
                          className="rounded-lg border border-[#56EBFF]/25 bg-[#081C3B]/90 px-2.5 py-2 flex items-start gap-2.5"
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
            </details>

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
                        <td className="py-1.5 px-2.5 text-white font-sans font-semibold">{row.signalDescription}</td>
                        <td className="py-1.5 px-2.5 text-[#7DD3FC]">{row.sourceReference}</td>
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
              <ProtocolTroubleshootingPanel
                title="IEC-104 Troubleshooting"
                target={`Simulated indication · ${activeIed.iedName} · ${activeIed.lnRef} · COA 132 · IOA ${activeIed.ioa}`}
                activeFaults={IEC104_TESTS.filter(test => test.isFault && isOn(test.id)).map(test => test.name)}
                stages={troubleshootingStages}
              />
              <div className="grid gap-2 text-xs sm:grid-cols-2">
                <div className="min-w-0 rounded-lg border border-[#1E5280] bg-[#03101F] p-3">
                  <h4 className="font-bold text-white">GI troubleshooting</h4>
                  <p className="mt-1 text-sky-100">In General Interrogation, check activation, confirmation, the data burst and termination in order.{isOn('T25_GI_TIMEOUT') ? ' GI timeout scenario is active.' : ''}</p>
                </div>
                <div className="min-w-0 rounded-lg border border-[#1E5280] bg-[#03101F] p-3">
                  <h4 className="font-bold text-white">Remote command troubleshooting</h4>
                  <p className="mt-1 text-sky-100">Compare the select/execute response, authority and interlock, then verify independent position feedback.{interlockBlocked ? ' Simulated CILO interlock is blocking the command.' : ''}</p>
                </div>
              </div>
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
