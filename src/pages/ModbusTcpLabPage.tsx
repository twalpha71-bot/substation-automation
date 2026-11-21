import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildModbusRegistersForBay } from '../data/protocolRegistry';
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
  Settings,
  Sliders,
  Terminal,
  X,
} from 'lucide-react';

type ModbusLabTab =
  | 'TOPOLOGY_LIVE'
  | 'REGISTER_BROWSER'
  | 'POLLING_CONFIG'
  | 'REGISTER_MAPPING'
  | 'PROTOCOL_CONVERSION'
  | 'PACKET_ANALYZER'
  | 'LOGS_DIAGNOSTICS';

type WordOrder = 'ABCD' | 'CDAB';
type SimSpeed = 0.1 | 0.25 | 0.5 | 1 | 2 | 4;
type SimPhase = 'REQ' | 'RESP' | 'CONVERT' | 'WAN_TX';
type TestCategory = 'ALL' | 'A_CONN' | 'B_FC' | 'C_FRAME' | 'D_CONV' | 'E_WAN';

interface IedDeviceSpec {
  id: 'P1' | 'P2' | 'P3' | 'P4';
  portNum: 1 | 2 | 3 | 4;
  shortName: string;
  fullName: string;
  deviceType: string;
  ip: string;
  unitId: number;
  protocol: string;
  registerRange: string;
  signals: string;
  image: string;
  defaultFc: '03' | '04';
  sampleReg: number;
  sampleLabel: string;
  sampleUnit: string;
  baseValue: number;
  ioa: number;
  iecType: string;
}

interface ModbusTestDef {
  num: number;
  id: string;
  name: string;
  cat: Exclude<TestCategory, 'ALL'>;
  isFault: boolean;
  safeBatch: boolean;
  expectedResult: string;
}

interface ModbusTestRuntime {
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

interface CommLogEntry {
  id: number;
  time: string;
  protocol: 'Modbus TCP' | 'Gateway' | 'IEC-104';
  direction: string;
  details: string;
  result: 'Success' | 'Delivered' | 'Exception' | 'Timeout' | 'Failed';
}

const IED_DEVICES: IedDeviceSpec[] = [
  {
    id: 'P1',
    portNum: 1,
    shortName: 'ION7650',
    fullName: 'Schneider PowerLogic ION7650',
    deviceType: 'Revenue & Power Quality Meter',
    ip: '10.132.30.61',
    unitId: 1,
    protocol: 'Modbus TCP (Port 502)',
    registerRange: '30001 – 30099 / 40001 – 40040',
    signals: 'V_LL, I_A, P_MW, Q_MVAr, kWh',
    image: 'assets/devices/schneider-ion7650.png',
    defaultFc: '04',
    sampleReg: 30001,
    sampleLabel: '33 kV Bus Voltage V_LL',
    sampleUnit: 'kV',
    baseValue: 33.04,
    ioa: 2101,
    iecType: 'M_ME_NC_1',
  },
  {
    id: 'P2',
    portNum: 2,
    shortName: 'P3F30',
    fullName: 'Schneider Easergy P3F30',
    deviceType: 'Feeder Protection Relay (IED)',
    ip: '10.132.30.62',
    unitId: 2,
    protocol: 'Modbus TCP (Port 502)',
    registerRange: '30101 – 30199 / 40101 – 40140',
    signals: 'PF, I_PhA/B/C, 50/51, CB_Pos',
    image: 'assets/devices/schneider-easergy.jpg',
    defaultFc: '04',
    sampleReg: 30105,
    sampleLabel: 'Feeder Power Factor',
    sampleUnit: 'PF',
    baseValue: 0.95,
    ioa: 2103,
    iecType: 'M_ME_NC_1',
  },
  {
    id: 'P3',
    portNum: 3,
    shortName: 'RET615',
    fullName: 'ABB Relion RET615',
    deviceType: 'Transformer Differential Relay',
    ip: '10.132.30.63',
    unitId: 3,
    protocol: 'Modbus TCP (Port 502)',
    registerRange: '30201 – 30299 / 40201 – 40240',
    signals: 'Oil Temp, Winding Temp, Tap, 87T',
    image: 'assets/ieds/abb-ret615.webp',
    defaultFc: '04',
    sampleReg: 30209,
    sampleLabel: 'TR1 Top Oil Temperature',
    sampleUnit: '°C',
    baseValue: 54.2,
    ioa: 2105,
    iecType: 'M_ME_NC_1',
  },
  {
    id: 'P4',
    portNum: 4,
    shortName: '7SJ85',
    fullName: 'Siemens SIPROTEC 5 (7SJ85)',
    deviceType: 'Protection Relay (IED)',
    ip: '10.132.30.64',
    unitId: 4,
    protocol: 'Modbus TCP (Port 502)',
    registerRange: '30001 – 39999 / 40001 – 40120',
    signals: 'V, I, P, Q, F, Status',
    image: 'assets/ieds/siemens-7sj85.webp',
    defaultFc: '04',
    sampleReg: 30301,
    sampleLabel: 'Feeder Active Power',
    sampleUnit: 'MW',
    baseValue: 18.42,
    ioa: 2107,
    iecType: 'M_ME_NC_1',
  },
];

const MODBUS_TESTS: ModbusTestDef[] = [
  // A. Connection & Polling (6)
  { num: 1, id: 'T01_TCP_HANDSHAKE', name: 'TCP Port 502 Handshake', cat: 'A_CONN', isFault: false, safeBatch: true, expectedResult: 'GTW-01 ↔ IED TCP/502 SYN/SYN-ACK/ACK established' },
  { num: 2, id: 'T02_ROUND_ROBIN', name: 'Multi-IED Round-Robin Polling (P1→P4)', cat: 'A_CONN', isFault: false, safeBatch: true, expectedResult: 'Sequential cyclic polling across ION7650, P3F30, RET615, 7SJ85' },
  { num: 3, id: 'T03_PORT502_CLOSED', name: 'TCP Port 502 Connection Refused', cat: 'A_CONN', isFault: true, safeBatch: false, expectedResult: 'Modbus TCP socket refused; all Station Bus links faulted' },
  { num: 4, id: 'T04_SWITCH_DOWN', name: 'Industrial Switch RSP35 Link Down', cat: 'A_CONN', isFault: true, safeBatch: false, expectedResult: 'RSP35 Port 5 → GTW-01 ETH0 down; polling halted' },
  { num: 5, id: 'T05_P2_OFFLINE', name: 'Single IED Offline (P2 Easergy P3F30)', cat: 'A_CONN', isFault: true, safeBatch: false, expectedResult: 'P2 cable faulted (Timeout); P1, P3, P4 continue polling' },
  { num: 6, id: 'T06_AUTO_RECONNECT', name: 'Automatic TCP Reconnect & Recovery', cat: 'A_CONN', isFault: false, safeBatch: true, expectedResult: 'All TCP/502 sockets & switch uplinks restored cleanly' },

  // B. Function Codes & Exceptions (8)
  { num: 7, id: 'T07_FC03_HOLDING', name: 'FC03 Read Holding Registers (40001–40020)', cat: 'B_FC', isFault: false, safeBatch: true, expectedResult: 'FC03 response returns valid holding register words' },
  { num: 8, id: 'T08_FC04_INPUT', name: 'FC04 Read Input Registers (30001–30310)', cat: 'B_FC', isFault: false, safeBatch: true, expectedResult: 'FC04 response returns live analog FLOAT32 telemetry' },
  { num: 9, id: 'T09_FC02_DISCRETE', name: 'FC01/FC02 Coils & Discrete Inputs (CB)', cat: 'B_FC', isFault: false, safeBatch: true, expectedResult: 'Breaker 52a/52b binary status bits read cleanly' },
  { num: 10, id: 'T10_FC06_WRITE_SINGLE', name: 'FC06 Write Single Register (Setpoint)', cat: 'B_FC', isFault: false, safeBatch: true, expectedResult: 'FC06 echo confirms single register write applied' },
  { num: 11, id: 'T11_FC16_WRITE_MULTI', name: 'FC16 Write Multiple Registers (Batch)', cat: 'B_FC', isFault: false, safeBatch: true, expectedResult: 'FC16 writes contiguous register block & returns count' },
  { num: 12, id: 'T12_EX01_ILLEGAL_FC', name: 'Exception 0x01 — Illegal Function Code', cat: 'B_FC', isFault: true, safeBatch: false, expectedResult: 'IED returns 0x84 / 0x01; Gateway flags Illegal Function' },
  { num: 13, id: 'T13_EX02_ILLEGAL_ADDR', name: 'Exception 0x02 — Illegal Data Address', cat: 'B_FC', isFault: true, safeBatch: false, expectedResult: 'IED returns 0x84 / 0x02; unallocated register rejected' },
  { num: 14, id: 'T14_EX03_ILLEGAL_VAL', name: 'Exception 0x03 — Illegal Data Value', cat: 'B_FC', isFault: true, safeBatch: false, expectedResult: 'IED returns 0x86 / 0x03; out-of-range write blocked' },

  // C. Byte Order, Framing & Integrity (6)
  { num: 15, id: 'T15_FLOAT_ABCD', name: 'IEEE-754 FLOAT32 Big-Endian (ABCD)', cat: 'C_FRAME', isFault: false, safeBatch: true, expectedResult: '2×16-bit registers decode accurately to IEEE-754 float' },
  { num: 16, id: 'T16_WORD_SWAP_FAULT', name: 'Word-Swapped FLOAT32 (CDAB) Mismatch', cat: 'C_FRAME', isFault: true, safeBatch: false, expectedResult: 'Gateway Step 2/4 detects corrupted CDAB word-order value' },
  { num: 17, id: 'T17_TID_MISMATCH', name: 'MBAP Transaction ID (TID) Mismatch', cat: 'C_FRAME', isFault: true, safeBatch: false, expectedResult: 'Stale/mismatched MBAP TID discarded by GTW-01' },
  { num: 18, id: 'T18_UNIT_ID_MISMATCH', name: 'Unit ID (Slave Address) Mismatch', cat: 'C_FRAME', isFault: true, safeBatch: false, expectedResult: 'Wrong Unit ID (250) ignored; Modbus response dropped' },
  { num: 19, id: 'T19_HIGH_LATENCY', name: 'High Polling Latency (+450 ms RTT)', cat: 'C_FRAME', isFault: true, safeBatch: false, expectedResult: 'Elevated RTT flagged in diagnostics; delayed poll cycle' },
  { num: 20, id: 'T20_RESP_TIMEOUT', name: 'Modbus Response Timeout (3000 ms)', cat: 'C_FRAME', isFault: true, safeBatch: false, expectedResult: 'No response within timeout; retry & timeout alarm raised' },

  // D. Gateway Conversion & IEC-104 Mapping (6)
  { num: 21, id: 'T21_CONV_M_ME_NC_1', name: 'Modbus → IEC-104 M_ME_NC_1 (Float)', cat: 'D_CONV', isFault: false, safeBatch: true, expectedResult: 'GTW-01 encodes IEEE-754 value into Type ID 13 (COT=3)' },
  { num: 22, id: 'T22_CONV_M_SP_TB_1', name: 'Modbus → IEC-104 M_SP_TB_1 (Breaker)', cat: 'D_CONV', isFault: false, safeBatch: true, expectedResult: 'Binary CB status mapped with CP56Time2a timestamp' },
  { num: 23, id: 'T23_SCALING_DEADBAND', name: 'Scaling Factor & Deadband Filter (±0.5%)', cat: 'D_CONV', isFault: false, safeBatch: true, expectedResult: 'GTW-01 applies ×1.0 scale & suppresses micro-jitter' },
  { num: 24, id: 'T24_MISSING_IOA', name: 'Missing IOA Mapping Table Entry', cat: 'D_CONV', isFault: true, safeBatch: false, expectedResult: 'Gateway Step 3/4 halts: Register not mapped to any IOA' },
  { num: 25, id: 'T25_BAD_QDS', name: 'QDS Bad Quality / Overflow (IV=1, OV=1)', cat: 'D_CONV', isFault: true, safeBatch: false, expectedResult: 'IEC-104 QDS flagged INVALID (0x81); RCC marks bad quality' },
  { num: 26, id: 'T26_GTW_OVERLOAD', name: 'Gateway GTW-01 Buffer / CPU Overload', cat: 'D_CONV', isFault: true, safeBatch: false, expectedResult: 'GTW-01 conversion engine stalled; ASDU queue drops' },

  // E. WAN & RCC SCADA IEC-104 (6)
  { num: 27, id: 'T27_104_STARTDT', name: 'IEC-104 STARTDT Act / Con (TCP/2404)', cat: 'E_WAN', isFault: false, safeBatch: true, expectedResult: 'WAN TCP/2404 U-frame STARTDT confirmed with RCC/SCADA' },
  { num: 28, id: 'T28_104_COT3_SPONT', name: 'IEC-104 Spontaneous COT=3 Delivery', cat: 'E_WAN', isFault: false, safeBatch: true, expectedResult: 'RCC/SCADA receives M_ME_NC_1 ASDU & updates IOA' },
  { num: 29, id: 'T29_104_GI_COT20', name: 'IEC-104 General Interrogation (COT=20)', cat: 'E_WAN', isFault: false, safeBatch: true, expectedResult: 'Full IOA snapshot (2101–2107) synchronized to RCC' },
  { num: 30, id: 'T30_WAN_LINK_LOSS', name: 'WAN Link Loss (ETH1 → RCC Down)', cat: 'E_WAN', isFault: true, safeBatch: false, expectedResult: 'WAN cable faulted; Station Bus Modbus polling continues' },
  { num: 31, id: 'T31_PORT2404_BLOCKED', name: 'IEC-104 Port 2404 Firewall Blocked', cat: 'E_WAN', isFault: true, safeBatch: false, expectedResult: 'TCP/2404 dropped; GTW-01 buffers ASDUs locally' },
  { num: 32, id: 'T32_FULL_RECOVERY', name: 'Full End-to-End Pipeline Recovery', cat: 'E_WAN', isFault: false, safeBatch: true, expectedResult: 'All Modbus, Gateway & IEC-104 faults cleared and healthy' },
];

function nowTimeStr(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

function float32ToHexWords(val: number, order: WordOrder): { hi: string; lo: string; rawBytes: string } {
  const buf = new ArrayBuffer(4);
  const dv = new DataView(buf);
  dv.setFloat32(0, val, false);
  const w1 = dv.getUint16(0, false).toString(16).toUpperCase().padStart(4, '0');
  const w2 = dv.getUint16(2, false).toString(16).toUpperCase().padStart(4, '0');
  const hi = order === 'ABCD' ? w1 : w2;
  const lo = order === 'ABCD' ? w2 : w1;
  const b0 = dv.getUint8(0).toString(16).toUpperCase().padStart(2, '0');
  const b1 = dv.getUint8(1).toString(16).toUpperCase().padStart(2, '0');
  const b2 = dv.getUint8(2).toString(16).toUpperCase().padStart(2, '0');
  const b3 = dv.getUint8(3).toString(16).toUpperCase().padStart(2, '0');
  return { hi, lo, rawBytes: `${b3} ${b2} ${b1} ${b0}` };
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

export const ModbusTcpLabPage: React.FC = () => {
  const { bays } = useSubstationStore();
  const activeBay = useMemo(
    () => bays.find((b) => b.bayCode === '33-F03') || bays.find((b) => b.voltageKv === 33) || bays[0],
    [bays]
  );

  // Navigation & Playback (Default 0.1x as explicitly requested for slow, clear inspection!)
  const [activeTab, setActiveTab] = useState<ModbusLabTab>('TOPOLOGY_LIVE');
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<SimSpeed>(0.1);
  const [wordOrder, setWordOrder] = useState<WordOrder>('ABCD');
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(2000);
  const [selectedFc, setSelectedFc] = useState<'03' | '04' | '06'>('04');
  const [tidCounter, setTidCounter] = useState<number>(7);

  // Continuous cycle state: activeIedIdx (0..3) and progress (0..1)
  const [activeIedIdx, setActiveIedIdx] = useState<number>(1); // Start on P2 (P3F30) matching reference
  const [cycleProgress, setCycleProgress] = useState<number>(0.48);

  // Interactive Popups (Instant Hover-Above-Device IED Popup + Auto-Opening Gateway Popup)
  const [selectedIedPopup, setSelectedIedPopup] = useState<IedDeviceSpec['id'] | null>(null);
  const [switchHovered, setSwitchHovered] = useState<boolean>(false);
  const [gatewayPinned, setGatewayPinned] = useState<boolean>(false);
  const [gatewayManuallyClosed, setGatewayManuallyClosed] = useState<boolean>(false);

  // Test Simulation & Fault Injection Lab (32 Interactive Tests with ON/OFF Switches)
  const [testCatFilter, setTestCatFilter] = useState<TestCategory>('ALL');
  const [selectedTestId, setSelectedTestId] = useState<string>('T02_ROUND_ROBIN');
  const [showHistory, setShowHistory] = useState<boolean>(false);
  const [testHistory, setTestHistory] = useState<TestHistoryItem[]>([]);
  const [testState, setTestState] = useState<Record<string, ModbusTestRuntime>>(() => {
    const init: Record<string, ModbusTestRuntime> = {};
    MODBUS_TESTS.forEach((t) => {
      init[t.id] = { enabled: false, status: 'IDLE', actualResult: 'Not executed', timestamp: '—' };
    });
    return init;
  });

  const [logs, setLogs] = useState<CommLogEntry[]>(() => [
    { id: 1, time: nowTimeStr(), protocol: 'IEC-104', direction: 'GTW-01 (ETH1) → RCC', details: 'M_ME_NC_1 CA=132 IOA=2103 COT=3 Val=0.95 PF', result: 'Delivered' },
    { id: 2, time: nowTimeStr(), protocol: 'Gateway', direction: 'GTW-01 Engine', details: 'Decoded FLOAT32 (ABCD) 0x3F73 0x5014 → IOA:2103', result: 'Success' },
    { id: 3, time: nowTimeStr(), protocol: 'Modbus TCP', direction: 'P3F30 (UID 2) → GTW-01', details: 'TID=0x0007 FC04 Reg 30105 (2 words) OK', result: 'Success' },
    { id: 4, time: nowTimeStr(), protocol: 'Modbus TCP', direction: 'GTW-01 → P3F30 (502)', details: 'TID=0x0007 FC04 Read Input Registers', result: 'Success' },
  ]);

  // Derived Fault Flags from 32-Test Lab (100% live protocol logic!)
  const isTestOn = (id: string) => !!testState[id]?.enabled;
  const port502Closed = isTestOn('T03_PORT502_CLOSED');
  const switchDown = isTestOn('T04_SWITCH_DOWN');
  const p2Offline = isTestOn('T05_P2_OFFLINE');
  const ex01 = isTestOn('T12_EX01_ILLEGAL_FC');
  const ex02 = isTestOn('T13_EX02_ILLEGAL_ADDR');
  const ex03 = isTestOn('T14_EX03_ILLEGAL_VAL');
  const wordSwapFault = isTestOn('T16_WORD_SWAP_FAULT');
  const tidMismatch = isTestOn('T17_TID_MISMATCH');
  const unitIdMismatch = isTestOn('T18_UNIT_ID_MISMATCH');
  const highLatency = isTestOn('T19_HIGH_LATENCY');
  const respTimeout = isTestOn('T20_RESP_TIMEOUT');
  const missingIoa = isTestOn('T24_MISSING_IOA');
  const badQds = isTestOn('T25_BAD_QDS');
  const gtwOverload = isTestOn('T26_GTW_OVERLOAD');
  const wanLinkLoss = isTestOn('T30_WAN_LINK_LOSS');
  const port2404Blocked = isTestOn('T31_PORT2404_BLOCKED');

  const activeIed = IED_DEVICES[activeIedIdx];
  const iedOfflineNow = (activeIed.id === 'P2' && p2Offline) || port502Closed;
  const stationBusOk = !port502Closed && !switchDown;
  const modbusHealthy = stationBusOk && !iedOfflineNow && !respTimeout && !unitIdMismatch && !tidMismatch && !ex01 && !ex02 && !ex03;
  const conversionHealthy = modbusHealthy && !missingIoa && !gtwOverload;
  const wanHealthy = !wanLinkLoss && !port2404Blocked;
  const endToEndHealthy = conversionHealthy && wanHealthy;

  // Derived Phase from cycleProgress (0..1)
  const simPhase: SimPhase =
    cycleProgress < 0.22
      ? 'REQ'
      : cycleProgress < 0.44
      ? 'RESP'
      : cycleProgress < 0.80
      ? 'CONVERT'
      : 'WAN_TX';

  // Conversion sub-step (1..4) and percentage (0..100) during CONVERT phase (0.44..0.80)
  const convFraction = simPhase === 'CONVERT' ? Math.max(0, Math.min(1, (cycleProgress - 0.44) / 0.36)) : simPhase === 'WAN_TX' ? 1 : 0;
  const convPct = Math.round(convFraction * 100);
  const convStep: 1 | 2 | 3 | 4 =
    convFraction < 0.25 ? 1 : convFraction < 0.5 ? 2 : convFraction < 0.75 ? 3 : 4;

  // Auto-open Gateway Popup ONLY when packet arrives at Gateway (CONVERT phase), auto-close when packet departs (WAN_TX / REQ / RESP) unless pinned!
  const showGatewayPopup = gatewayPinned || (simPhase === 'CONVERT' && !gatewayManuallyClosed && stationBusOk && !iedOfflineNow && !respTimeout);

  // Reset manual close lock when a new conversion cycle starts
  useEffect(() => {
    if (simPhase === 'REQ') {
      setGatewayManuallyClosed(false);
    }
  }, [simPhase]);

  // Smooth RAF Animation Engine (at 0.1x: ~32s full cycle, ~11.5s slow live conversion inside Gateway!)
  useEffect(() => {
    if (!playing) return;
    let rafId = 0;
    let lastTs = performance.now();
    const baseCycleMs = highLatency ? 5200 : 3200; // at 0.1x -> 32,000 ms (or 52,000 ms with high latency)

    const tick = (now: number) => {
      const dt = Math.min(80, now - lastTs);
      lastTs = now;
      setCycleProgress((prev) => {
        const delta = dt / (baseCycleMs / speed);
        const next = prev + delta;
        if (next >= 1) {
          setActiveIedIdx((idx) => (idx + 1) % IED_DEVICES.length);
          setTidCounter((t) => (t + 1) % 65535 || 1);
          return next - 1;
        }
        return next;
      });
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [playing, speed, highLatency]);

  // Live register data from bay registry
  const bayRegisters = useMemo(() => {
    if (!activeBay) return [];
    return buildModbusRegistersForBay(activeBay);
  }, [activeBay]);

  // Live telemetry value for active IED (with subtle real-time jitter & word-swap corruption if faulted)
  const liveValue = useMemo(() => {
    const jitter = Math.sin(tidCounter * 0.9 + activeIedIdx) * (activeIed.baseValue * 0.004);
    const clean = Number((activeIed.baseValue + jitter).toFixed(2));
    return wordSwapFault ? Number((clean * 412.7).toFixed(2)) : clean;
  }, [activeIed, tidCounter, activeIedIdx, wordSwapFault]);

  const effectiveOrder: WordOrder = wordSwapFault ? 'CDAB' : wordOrder;
  const hexWords = useMemo(() => float32ToHexWords(activeIed.baseValue, effectiveOrder), [activeIed.baseValue, effectiveOrder]);
  const tidHex = `0x${tidCounter.toString(16).toUpperCase().padStart(4, '0')}`;

  // ResizeObserver exact port-to-port SVG coordinate measurement
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
        next[k] = {
          x: r.left - wr.left + r.width / 2,
          y: r.top - wr.top + r.height / 2,
        };
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

  // Append live log entry whenever a cycle advances
  useEffect(() => {
    const ts = nowTimeStr();
    const d = IED_DEVICES[activeIedIdx];
    const entry: CommLogEntry = !stationBusOk || (d.id === 'P2' && p2Offline)
      ? { id: Date.now() + Math.random(), time: ts, protocol: 'Modbus TCP', direction: `GTW-01 → ${d.shortName} (${d.ip})`, details: `TID=${tidHex} Port 502 unreachable / Switch down`, result: 'Timeout' }
      : ex01 || ex02 || ex03
      ? { id: Date.now() + Math.random(), time: ts, protocol: 'Modbus TCP', direction: `${d.shortName} → GTW-01`, details: `Exception ${ex01 ? '0x01 Illegal Function' : ex02 ? '0x02 Illegal Address' : '0x03 Illegal Value'}`, result: 'Exception' }
      : !conversionHealthy
      ? { id: Date.now() + Math.random(), time: ts, protocol: 'Gateway', direction: 'GTW-01 Engine', details: missingIoa ? `Unmapped register ${d.sampleReg} (No IOA)` : 'GTW-01 buffer overload — ASDU dropped', result: 'Failed' }
      : !wanHealthy
      ? { id: Date.now() + Math.random(), time: ts, protocol: 'IEC-104', direction: 'GTW-01 (ETH1) → RCC', details: `WAN / TCP 2404 down — IOA:${d.ioa} buffered`, result: 'Failed' }
      : { id: Date.now() + Math.random(), time: ts, protocol: 'IEC-104', direction: 'GTW-01 (ETH1) → RCC', details: `${d.iecType} CA:132 IOA:${d.ioa} COT:3 Val=${liveValue} ${d.sampleUnit} (${badQds ? 'QDS:0x81 IV' : 'QDS:0x00'})`, result: 'Delivered' };
    setLogs((prev) => [entry, ...prev].slice(0, 40));
  }, [tidCounter]);

  // Test Simulation Lab Handlers
  const handleToggleTest = (t: ModbusTestDef) => {
    const ts = nowTimeStr();
    const nextOn = !testState[t.id]?.enabled;

    if ((t.id === 'T06_AUTO_RECONNECT' || t.id === 'T32_FULL_RECOVERY') && nextOn) {
      setTestState((prev) => {
        const copy = { ...prev };
        MODBUS_TESTS.forEach((item) => {
          if (item.isFault) {
            copy[item.id] = { enabled: false, status: 'IDLE', actualResult: 'Cleared by Recovery', timestamp: ts };
          }
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
      {
        id: Date.now() + Math.random(),
        time: ts,
        testName: t.name,
        action: nextOn ? 'ON' : 'OFF',
        status: nextOn ? (t.isFault ? 'FAILED' : 'PASSED') : 'IDLE',
        detail: nextOn ? t.expectedResult : 'Test disabled',
      },
      ...prev.slice(0, 49),
    ]);
  };

  const handleRunAllSafeTests = () => {
    const ts = nowTimeStr();
    setTestState((prev) => {
      const next = { ...prev };
      MODBUS_TESTS.forEach((t) => {
        if (t.safeBatch) {
          next[t.id] = { enabled: true, status: 'PASSED', actualResult: t.expectedResult, timestamp: ts };
        }
      });
      return next;
    });
    setTestHistory((prev) => [
      { id: Date.now(), time: ts, testName: 'All Safe Modbus/IEC-104 Tests', action: 'RUN_SAFE', status: 'PASSED', detail: 'Executed all non-destructive protocol verification tests' },
      ...prev.slice(0, 49),
    ]);
  };

  const handleResetAllTests = (stopOnly: boolean) => {
    const ts = nowTimeStr();
    setTestState(() => {
      const next: Record<string, ModbusTestRuntime> = {};
      MODBUS_TESTS.forEach((t) => {
        next[t.id] = { enabled: false, status: 'IDLE', actualResult: stopOnly ? 'Stopped' : 'Not executed', timestamp: stopOnly ? ts : '—' };
      });
      return next;
    });
    setTestHistory((prev) => [
      { id: Date.now(), time: ts, testName: stopOnly ? 'Stop All Tests' : 'Reset All Faults', action: 'RESET', status: 'IDLE', detail: 'All simulation toggles returned to IDLE' },
      ...prev.slice(0, 49),
    ]);
  };

  const handleExportCsv = () => {
    const rows = [
      ['#', 'Test ID', 'Test Name', 'Category', 'State', 'Status', 'Expected Result', 'Actual Result', 'Timestamp'],
      ...MODBUS_TESTS.map((t) => {
        const r = testState[t.id];
        return [String(t.num), t.id, t.name, t.cat, r.enabled ? 'ON' : 'OFF', r.status, t.expectedResult, r.actualResult, r.timestamp];
      }),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modbus_tcp_test_simulation_results.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const visibleTests = useMemo(
    () => (testCatFilter === 'ALL' ? MODBUS_TESTS : MODBUS_TESTS.filter((t) => t.cat === testCatFilter)),
    [testCatFilter]
  );

  const stagePillLabel =
    !stationBusOk || iedOfflineNow
      ? 'FAULT: STATION BUS / IED OFFLINE'
      : simPhase === 'REQ'
      ? 'STAGE 1: MODBUS REQ (TCP/502)'
      : simPhase === 'RESP'
      ? 'STAGE 2: MODBUS RESP (TCP/502)'
      : simPhase === 'CONVERT'
      ? `STAGE 3: LIVE CONVERT (${convStep}/4)`
      : wanHealthy
      ? 'STAGE 4: IEC-104 WAN TX (2404)'
      : 'FAULT: WAN / TCP 2404 BLOCKED';

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
              Modbus TCP Lab V2 — Real Device Communication &amp; Protocol Conversion
            </h1>
            <span className="rounded border border-[#38BDF8]/50 bg-[#082B47] px-2 py-0.5 font-mono text-[9.5px] font-bold text-[#7DD3FC]">
              SIMULATED TRAFFIC
            </span>
          </div>
          <p className="text-[11px] text-[#8CC5E8] mt-0.5">
            Multi-IED Station Bus (TCP/502) → Hirschmann RSP35 → SAS Gateway GTW-01 (Live Conversion) → RCC / SCADA (IEC-104 TCP/2404)
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px] font-bold">
          <span className={`rounded-lg border px-2.5 py-1 ${playing ? 'border-[#22C55E] bg-[#062E20] text-[#4ADE80]' : 'border-[#F59E0B] bg-[#332206] text-[#FDE047]'}`}>
            ● Simulation: {playing ? 'LIVE' : 'PAUSED'}
          </span>
          <span className={`rounded-lg border px-2.5 py-1 ${modbusHealthy ? 'border-[#22C55E] bg-[#062E20] text-[#4ADE80]' : 'border-[#EF4444] bg-[#3B0D15] text-[#FCA5A5]'}`}>
            Modbus Poll: {modbusHealthy ? 'HEALTHY' : 'FAULT'}
          </span>
          <span className={`rounded-lg border px-2.5 py-1 ${stationBusOk ? 'border-[#38BDF8] bg-[#082F49] text-[#7DD3FC]' : 'border-[#EF4444] bg-[#3B0D15] text-[#FCA5A5]'}`}>
            TCP/502: {stationBusOk ? 'CONNECTED' : 'DOWN'}
          </span>
          <span className="rounded-lg border border-[#38BDF8]/40 bg-[#072038] px-2.5 py-1 text-[#BAE6FD]">
            Poll Cycle: {pollIntervalMs} ms
          </span>
          <span className={`rounded-lg border px-2.5 py-1 ${wanHealthy ? 'border-[#F59E0B] bg-[#2D1D06] text-[#FDE047]' : 'border-[#EF4444] bg-[#3B0D15] text-[#FCA5A5]'}`}>
            IEC-104: 2404
          </span>
        </div>
      </div>

      {/* 2. TAB NAVIGATION & PLAYBACK CONTROLS (DEFAULT 0.1x) */}
      <div className="rounded-xl border border-[#174266] bg-[#051628] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              ['TOPOLOGY_LIVE', 'Topology & Live Data'],
              ['REGISTER_BROWSER', 'Register Browser'],
              ['POLLING_CONFIG', 'Polling Configuration'],
              ['REGISTER_MAPPING', 'Register Mapping'],
              ['PROTOCOL_CONVERSION', 'Protocol Conversion'],
              ['PACKET_ANALYZER', 'Packet Analyzer'],
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
            onClick={() => {
              setSpeed(0.1);
              setPlaying(true);
              setGatewayPinned(false);
              setGatewayManuallyClosed(false);
              handleResetAllTests(false);
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
            {/* Topology Header & Color Legend */}
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <Radio className="w-4 h-4 text-[#38F3FF]" />
                <span className="text-[13.5px] font-extrabold text-white">
                  System Topology — Multi-IED Modbus TCP Polling &amp; IEC 60870-5-104 Conversion
                </span>
                <span className="text-[11px] font-semibold text-[#5EEAD4]">
                  (Hover any IED for Holographic Info · Click GTW-01 to Pin Conversion)
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3 text-[10.5px] font-semibold">
                <span className="inline-flex items-center gap-1.5 text-[#7DD3FC]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF]" /> Modbus Req (TCP/502)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#86EFAC]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E] shadow-[0_0_8px_#22C55E]" /> Modbus Resp (TCP/502)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#D9F99D]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#84CC16] shadow-[0_0_8px_#84CC16]" /> IEC-104 (TCP/2404)
                </span>
                <span className="inline-flex items-center gap-1.5 text-[#FCA5A5]">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444] shadow-[0_0_8px_#EF4444]" /> Fault / Timeout
                </span>
              </div>
            </div>

            {/* 4-COLUMN HARDWARE STAGE WITH RESIZE-OBSERVER PORT-TO-PORT SVG */}
            <div ref={stageRef} className="min-w-[1120px] relative pt-2 pb-2">
              {/* Zone Column Header Pills */}
              <div className="grid grid-cols-[1.05fr_1.1fr_1.2fr_1.05fr] gap-4 mb-3 relative z-10">
                <div className="rounded-lg border border-[#2563EB]/60 bg-[#082240]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#93C5FD]">
                  STATION BUS IEDs (VLAN 10 · TCP/502)
                </div>
                <div className="rounded-lg border border-[#3B82F6]/60 bg-[#082240]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#93C5FD]">
                  INDUSTRIAL SWITCH
                </div>
                <div className="rounded-lg border border-[#0D9488]/70 bg-[#062934]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#5EEAD4]">
                  STATION GATEWAY
                </div>
                <div className="rounded-lg border border-[#16A34A]/60 bg-[#072923]/85 py-1.5 text-center font-mono text-[11px] font-extrabold text-[#86EFAC]">
                  RCC / SCADA (WAN)
                </div>
              </div>

              {/* AUTO-OPENING / AUTO-CLOSING LIVE PROTOCOL CONVERSION POPUP ABOVE GATEWAY (EXACT REFERENCE image_0eab44.jpg) */}
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
                      'linear-gradient(135deg, rgba(255, 255, 255, 0.19) 0%, rgba(190, 240, 255, 0.14) 50%, rgba(15, 44, 68, 0.72) 100%)',
                    backdropFilter: 'blur(22px) saturate(160%)',
                    WebkitBackdropFilter: 'blur(22px) saturate(160%)',
                    borderColor: !conversionHealthy ? '#EF4444' : 'rgba(224, 252, 255, 0.85)',
                    boxShadow: !conversionHealthy
                      ? '0 0 28px rgba(239, 68, 68, 0.45)'
                      : '0 0 34px rgba(103, 232, 249, 0.42), inset 0 1.5px 1px rgba(255, 255, 255, 0.78), inset 0 -1px 1px rgba(125, 249, 255, 0.5)',
                  }}
                >
                  {/* Popup Header */}
                  <div className="flex items-center justify-between gap-2 pb-2 mb-2 border-b border-[#56EBFF]/25">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="w-1 h-4 rounded-full bg-[#38F3FF]" />
                      <span className="text-[12px] font-extrabold text-white truncate">Live Protocol Conversion &amp; Mapping</span>
                      <span className="rounded border border-[#F59E0B]/70 bg-[#3B2606] px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-[#FDE047]">
                        {activeIed.shortName}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="rounded-md border px-2 py-0.5 font-mono text-[9px] font-extrabold"
                        style={
                          !conversionHealthy
                            ? { background: '#3B0D15', borderColor: '#EF4444', color: '#FCA5A5' }
                            : { background: '#063326', borderColor: '#22C55E', color: '#4ADE80' }
                        }
                      >
                        {!conversionHealthy
                          ? 'CONV FAULT'
                          : `STEP ${convStep}/4: ${convStep === 1 ? 'PAYLOAD' : convStep === 2 ? 'DECODE' : convStep === 3 ? 'IOA MAP' : 'ASDU READY'}`}
                      </span>
                      <button
                        type="button"
                        onClick={() => setGatewayPinned((p) => !p)}
                        title={gatewayPinned ? 'Unpin Popup' : 'Pin Popup Open'}
                        className="p-1 rounded hover:bg-white/10 text-[#7DD3FC]"
                      >
                        {gatewayPinned ? <PinOff className="w-3.5 h-3.5 text-[#FDE047]" /> : <Pin className="w-3.5 h-3.5" />}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setGatewayPinned(false);
                          setGatewayManuallyClosed(true);
                        }}
                        title="Close Popup"
                        className="p-1 rounded hover:bg-white/10 text-[#9BC0DF]"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* 2x2 Multi-Color Step Cards */}
                  <div className="grid grid-cols-2 gap-2.5 font-mono text-[10.5px]">
                    {/* Step 1: Payload Capture (Cyan) */}
                    <div
                      className="rounded-lg border p-2 transition-all"
                      style={{
                        background: convStep === 1 ? 'rgba(0, 212, 255, 0.16)' : 'rgba(8, 28, 46, 0.72)',
                        borderColor: ex01 || ex02 || ex03 || tidMismatch ? '#EF4444' : convStep === 1 ? '#38F3FF' : 'rgba(90, 180, 220, 0.28)',
                        boxShadow: convStep === 1 ? '0 0 14px rgba(0, 229, 255, 0.30)' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#38F3FF]">1. PAYLOAD CAPTURE</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold ${convStep === 1 ? 'bg-white text-[#031829]' : convStep > 1 ? 'bg-[#063326] text-[#4ADE80]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 1 ? 'ACTIVE' : convStep > 1 ? 'DONE' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#E0F7FF] font-bold">
                        {activeIed.shortName} (UID {unitIdMismatch ? 250 : activeIed.unitId}) · TID {tidHex} FC{selectedFc}
                      </div>
                      <div className="text-[#FDE047] mt-0.5 truncate">
                        {ex01 ? 'ERR: EX 0x01 Illegal FC' : ex02 ? 'ERR: EX 0x02 Illegal Addr' : ex03 ? 'ERR: EX 0x03 Illegal Val' : `Hex: ${activeIed.sampleReg} → 0x${hexWords.hi} 0x${hexWords.lo}`}
                      </div>
                    </div>

                    {/* Step 2: Byte/Word Decode (Violet) */}
                    <div
                      className="rounded-lg border p-2 transition-all"
                      style={{
                        background: convStep === 2 ? 'rgba(192, 132, 252, 0.18)' : 'rgba(8, 28, 46, 0.72)',
                        borderColor: wordSwapFault ? '#F59E0B' : convStep === 2 ? '#C084FC' : 'rgba(90, 180, 220, 0.28)',
                        boxShadow: convStep === 2 ? '0 0 14px rgba(192, 132, 252, 0.32)' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#D8B4FE]">2. BYTE/WORD DECODE</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold ${convStep === 2 ? 'bg-[#D8B4FE] text-[#1E0836]' : convStep > 2 ? 'bg-[#063326] text-[#4ADE80]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 2 ? 'ACTIVE' : convStep > 2 ? 'DONE' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#F3E8FF] font-bold">
                        FLOAT32 ({effectiveOrder}) · {wordSwapFault ? 'SWAP ERR' : 'IEEE-754 Valid'}
                      </div>
                      <div className={`mt-0.5 font-extrabold ${wordSwapFault ? 'text-[#FCA5A5]' : 'text-[#4ADE80]'}`}>
                        Val: {liveValue} {activeIed.sampleUnit}
                      </div>
                    </div>

                    {/* Step 3: Scaling & IOA Map (Amber) */}
                    <div
                      className="rounded-lg border p-2 transition-all"
                      style={{
                        background: convStep === 3 ? 'rgba(250, 204, 21, 0.16)' : 'rgba(8, 28, 46, 0.72)',
                        borderColor: missingIoa || badQds ? '#EF4444' : convStep === 3 ? '#FACC15' : 'rgba(90, 180, 220, 0.28)',
                        boxShadow: convStep === 3 ? '0 0 14px rgba(250, 204, 21, 0.28)' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#FDE047]">3. SCALING &amp; IOA MAP</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold ${convStep === 3 ? 'bg-[#FDE047] text-[#261802]' : convStep > 3 ? 'bg-[#063326] text-[#4ADE80]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 3 ? 'ACTIVE' : convStep > 3 ? 'DONE' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#FEF08A] font-bold">
                        {missingIoa ? 'ERR: IOA Unmapped!' : `Map: CA:132 / IOA:${activeIed.ioa}`}
                      </div>
                      <div className="text-[#7DD3FC] mt-0.5">
                        {liveValue} {activeIed.sampleUnit} (×1.0) · QDS: {badQds ? 'IV (0x81)' : 'GOOD (0x00)'}
                      </div>
                    </div>

                    {/* Step 4: IEC-104 ASDU Ready (Emerald) */}
                    <div
                      className="rounded-lg border p-2 transition-all"
                      style={{
                        background: convStep === 4 ? 'rgba(34, 197, 94, 0.18)' : 'rgba(8, 28, 46, 0.72)',
                        borderColor: gtwOverload || !wanHealthy ? '#EF4444' : convStep === 4 ? '#4ADE80' : 'rgba(90, 180, 220, 0.28)',
                        boxShadow: convStep === 4 ? '0 0 14px rgba(34, 197, 94, 0.34)' : undefined,
                      }}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-[#4ADE80]">4. IEC-104 ASDU READY</span>
                        <span className={`px-1.5 py-0.2 rounded text-[8px] font-extrabold ${convStep === 4 ? 'bg-[#4ADE80] text-[#032415]' : 'bg-[#122B40] text-[#94A3B8]'}`}>
                          {convStep === 4 ? 'READY' : 'WAIT'}
                        </span>
                      </div>
                      <div className="text-[#DCFCE7] font-bold truncate">
                        {activeIed.iecType} / COT:3 · 68 0E {hexWords.rawBytes}
                      </div>
                      <div className="text-[#A3E635] mt-0.5 font-extrabold">
                        Out: ETH1 → RCC ({liveValue} {activeIed.sampleUnit})
                      </div>
                    </div>
                  </div>

                  {/* Multi-Color Progress Bar */}
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
                {/* Holographic Trapezoidal Beam Connector down to SAS Gateway GTW-01 */}
                <svg viewBox="0 0 360 44" className="w-[320px] h-[44px] mx-auto block pointer-events-none">
                  <polygon
                    points="20,0 340,0 210,44 150,44"
                    fill="rgba(56, 232, 255, 0.11)"
                    stroke="rgba(56, 232, 255, 0.45)"
                    strokeWidth="1"
                  />
                </svg>
              </div>

              {/* 4 HARDWARE COLUMNS — EXACT PORT-TO-PORT RJ45 ALIGNMENT */}
              <div className="grid grid-cols-[1.05fr_1.15fr_1.15fr_1.05fr] gap-4 items-center relative z-10 min-h-[430px]">
                {/* COLUMN 1: 4 STACKED REALISTIC IEDs (DETAILS HIDDEN; HOVER SHOWS WHITE-FROSTED POPUP BESIDE DEVICE) */}
                <div className="flex flex-col justify-between gap-2.5 pl-4">
                  {IED_DEVICES.map((dev, idx) => {
                    const isAct = idx === activeIedIdx;
                    const isHov = selectedIedPopup === dev.id;
                    const isFault = (dev.id === 'P2' && p2Offline) || port502Closed;
                    return (
                      <div
                        key={dev.id}
                        className="flex items-center justify-start relative"
                        onMouseEnter={() => setSelectedIedPopup(dev.id)}
                        onMouseLeave={() => setSelectedIedPopup((cur) => (cur === dev.id ? null : cur))}
                      >
                        <div
                          className="relative group rounded-xl border p-1.5 transition-all cursor-pointer"
                          style={{
                            width: '126px',
                            height: '92px',
                            background: isAct || isHov
                              ? 'linear-gradient(180deg, rgba(14, 54, 82, 0.94), rgba(6, 24, 42, 0.96))'
                              : 'rgba(7, 24, 42, 0.86)',
                            borderColor: isFault ? '#EF4444' : isHov ? '#FFFFFF' : isAct ? '#38F3FF' : 'rgba(56, 189, 248, 0.35)',
                            boxShadow: isFault
                              ? '0 0 14px rgba(239, 68, 68, 0.45)'
                              : isHov
                              ? '0 0 24px rgba(255, 255, 255, 0.72)'
                              : isAct
                              ? '0 0 18px rgba(0, 229, 255, 0.45)'
                              : 'none',
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
                          <img
                            src={dev.image}
                            alt={dev.fullName}
                            className="w-full h-full object-contain rounded drop-shadow-[0_6px_10px_rgba(0,0,0,0.8)] group-hover:scale-105 transition"
                          />
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

                {/* COLUMN 2: REALISTIC HIRSCHMANN RSP35 INDUSTRIAL SWITCH (DETAILS HIDDEN; HOVER OPENS HOLOGRAPHIC POPUP) */}
                <div className="flex flex-col items-center justify-center pt-[125px]">
                  <div
                    className="relative flex items-center justify-center cursor-pointer"
                    onMouseEnter={() => setSwitchHovered(true)}
                    onMouseLeave={() => setSwitchHovered(false)}
                  >
                    <img
                      src="assets/devices/hirschmann-rsp35.png"
                      alt="Hirschmann RSP35 Industrial Ethernet Switch"
                      className="h-[148px] w-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.85)]"
                      style={{ opacity: switchDown ? 0.45 : 1 }}
                    />
                    {/* Ports 1-4 Seated Directly Over RSP35 Front RJ45 Sockets (1, 2, 3, 4) */}
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

                    {/* Port 5 SFP Uplink Seated Directly on RSP35 Right SFP Port */}
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

                {/* COLUMN 3: REALISTIC SAS GATEWAY GTW-01 */}
                <div className="flex flex-col items-center justify-end pt-[185px]">
                  <button
                    type="button"
                    onClick={() => {
                      setGatewayPinned((p) => !p);
                      setGatewayManuallyClosed(false);
                    }}
                    title="Click to Pin / Unpin Live Protocol Conversion Popup"
                    className="relative flex items-center justify-center group focus:outline-none"
                  >
                    <img
                      src="assets/signal-chain/station-gateway.png"
                      alt="SAS Gateway GTW-01"
                      className="h-[124px] w-auto object-contain drop-shadow-[0_12px_18px_rgba(0,0,0,0.85)] group-hover:brightness-110 transition"
                    />
                    <span
                      ref={setPortRef('gtw_eth0')}
                      className="absolute left-[22%] top-[58%] w-5 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[6.5px] font-extrabold text-[#E0F7FF] z-20"
                      style={{
                        borderColor: !stationBusOk ? '#EF4444' : '#38F3FF',
                        background: '#04283D',
                        boxShadow: !stationBusOk ? '0 0 8px #EF4444' : '0 0 10px #00E5FF',
                      }}
                    >
                      E0
                    </span>
                    <span
                      ref={setPortRef('gtw_eth1')}
                      className="absolute right-[21%] top-[58%] w-5 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[6.5px] font-extrabold text-[#DCFCE7] z-20"
                      style={{
                        borderColor: !wanHealthy ? '#EF4444' : '#4ADE80',
                        background: '#062E20',
                        boxShadow: !wanHealthy ? '0 0 8px #EF4444' : '0 0 10px #22C55E',
                      }}
                    >
                      E1
                    </span>
                  </button>
                  <div className="mt-2 text-center">
                    <div className="text-[12px] font-extrabold text-white">SAS Gateway GTW-01</div>
                    <div className="font-mono text-[10px] text-[#38F3FF]">ETH0: 10.132.30.200</div>
                    <div className="font-mono text-[10px] text-[#4ADE80]">ETH1: 10.132.20.200</div>
                  </div>
                </div>

                {/* COLUMN 4: REALISTIC RCC / SCADA */}
                <div className="flex flex-col items-center justify-end pt-[178px]">
                  <div className="relative flex items-center justify-center">
                    <img
                      src="assets/signal-chain/scada-hmi.png"
                      alt="RCC SCADA Dual Monitor Workstation"
                      className="h-[130px] w-auto object-contain drop-shadow-[0_14px_18px_rgba(0,0,0,0.85)]"
                    />
                    <span
                      ref={setPortRef('rcc_wan')}
                      className="absolute left-[4%] top-[58%] w-5 h-4 rounded-[3px] border-[1.5px] flex items-center justify-center font-mono text-[6.5px] font-extrabold text-[#DCFCE7] z-20"
                      style={{
                        borderColor: !wanHealthy ? '#EF4444' : '#4ADE80',
                        background: '#062E20',
                        boxShadow: !wanHealthy ? '0 0 8px #EF4444' : '0 0 10px #22C55E',
                      }}
                    >
                      WAN
                    </span>
                  </div>
                  <div className="mt-2 text-center">
                    <div className="text-[12px] font-extrabold text-white">RCC / SCADA</div>
                    <div className="font-mono text-[10px] text-[#4ADE80]">10.132.20.201</div>
                    <div
                      className="mt-1 inline-block rounded border px-2 py-0.5 font-mono text-[9.5px] font-extrabold"
                      style={
                        endToEndHealthy
                          ? { background: '#062E20', borderColor: '#22C55E', color: '#4ADE80' }
                          : { background: '#3B0D15', borderColor: '#EF4444', color: '#FCA5A5' }
                      }
                    >
                      {endToEndHealthy ? `RX IOA:${activeIed.ioa} OK` : 'RX LINK / CONV FAULT'}
                    </div>
                  </div>
                </div>
              </div>

              {/* TOP-LAYER (z-[80] ABOVE ALL CABLES!) EXACT REFERENCE HOLOGRAPHIC GLASS POPUP (image_0f9e88.jpg) */}
              {(() => {
                const hovIdx = IED_DEVICES.findIndex((d) => d.id === selectedIedPopup);
                if (hovIdx === -1) return null;
                const dev = IED_DEVICES[hovIdx];
                const topOffsets = [38, 102, 166, 192];
                return (
                  <div
                    className="absolute z-[80] pointer-events-none transition-all duration-150"
                    style={{
                      left: '164px',
                      top: `${topOffsets[hovIdx]}px`,
                      width: '540px',
                    }}
                  >
                    {/* Glowing Holographic Projection Rays from Hovered IED to Popup Left Edge */}
                    <svg viewBox="0 0 42 250" className="absolute -left-[40px] top-4 w-[40px] h-[225px] pointer-events-none">
                      <polygon
                        points="0,112 42,6 42,244 0,126"
                        fill="rgba(125, 249, 255, 0.14)"
                        stroke="rgba(175, 248, 255, 0.58)"
                        strokeWidth="1"
                      />
                      <line x1="0" y1="117" x2="42" y2="58" stroke="rgba(255,255,255,0.48)" strokeWidth="1" />
                      <line x1="0" y1="121" x2="42" y2="188" stroke="rgba(103,232,249,0.48)" strokeWidth="1" />
                    </svg>

                    <div
                      className="rounded-2xl border-[1.5px] p-4 relative overflow-hidden"
                      style={{
                        background:
                          'radial-gradient(ellipse 68% 48% at 18% 12%, rgba(165, 243, 252, 0.24) 0%, transparent 65%), ' +
                          'radial-gradient(ellipse 55% 40% at 85% 90%, rgba(56, 224, 255, 0.18) 0%, transparent 65%), ' +
                          'linear-gradient(145deg, rgba(16, 62, 92, 0.68) 0%, rgba(10, 42, 68, 0.76) 52%, rgba(8, 32, 54, 0.80) 100%)',
                        backdropFilter: 'blur(36px) saturate(170%)',
                        WebkitBackdropFilter: 'blur(36px) saturate(170%)',
                        borderColor: 'rgba(182, 248, 255, 0.90)',
                        boxShadow:
                          '0 0 28px rgba(56, 232, 255, 0.52), 0 0 60px rgba(0, 210, 255, 0.22), ' +
                          'inset 0 1.5px 2px rgba(255, 255, 255, 0.85), inset 0 -1px 2px rgba(56, 232, 255, 0.55), inset 0 0 34px rgba(56, 232, 255, 0.14)',
                      }}
                    >
                      {/* Window Bar matching image_0f9e88.jpg (| Modbus TCP — Device Info   - [] x) */}
                      <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#A5F3FC]/35">
                        <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#E6FAFF] tracking-wide">
                          <span className="w-0.5 h-4 bg-[#7DF9FF] shadow-[0_0_8px_#7DF9FF]" />
                          <span>Modbus TCP — Device Info</span>
                        </div>
                        <div className="flex items-center gap-2.5 font-mono text-[12px] text-[#CFFAFE]/90">
                          <span>–</span>
                          <span>□</span>
                          <span>×</span>
                        </div>
                      </div>

                      {/* Body: Holographic Wireframe-Glow IED Preview Left + Multi-Color Glass Table Right */}
                      <div className="grid grid-cols-[140px_1fr] gap-4 items-center">
                        <div className="flex flex-col items-center justify-center">
                          <div
                            className="w-[132px] h-[132px] rounded-xl border border-[#7DF9FF]/50 p-2.5 flex items-center justify-center"
                            style={{
                              background: 'radial-gradient(circle, rgba(56, 232, 255, 0.20), rgba(6, 30, 50, 0.42))',
                              boxShadow: '0 0 24px rgba(56, 232, 255, 0.34), inset 0 0 18px rgba(125, 249, 255, 0.18)',
                            }}
                          >
                            <img
                              src={dev.image}
                              alt={dev.fullName}
                              className="max-h-[112px] w-auto object-contain"
                              style={{ filter: 'drop-shadow(0 0 14px rgba(103, 232, 249, 0.72))' }}
                            />
                          </div>
                          <div className="mt-2 w-24 h-1.5 rounded-full bg-[#38F3FF]/45 blur-[3px]" />
                        </div>

                        <div className="space-y-2.5 min-w-0">
                          <div className="text-[16.5px] font-extrabold text-white tracking-tight truncate drop-shadow-[0_0_10px_rgba(103,232,249,0.45)]">
                            {dev.fullName}
                          </div>
                          <div
                            className="rounded-xl border border-[#A5F3FC]/42 divide-y divide-[#A5F3FC]/20 text-[11px]"
                            style={{ background: 'rgba(8, 38, 62, 0.56)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.22)' }}
                          >
                            {[
                              { icon: Cpu, label: 'Device Type', val: dev.deviceType, col: '#FFFFFF' },
                              { icon: Radio, label: 'IP Address', val: dev.ip, col: '#38F3FF' },
                              { icon: Layers, label: 'Unit ID', val: String(dev.unitId), col: '#FDE047' },
                              { icon: Activity, label: 'Protocol', val: dev.protocol, col: '#4ADE80' },
                              { icon: Database, label: 'Registers', val: dev.registerRange, col: '#E879F9' },
                              { icon: AlertTriangle, label: 'Signals', val: dev.signals, col: '#7DD3FC' },
                            ].map(({ icon: Icon, label, val, col }) => (
                              <div key={label} className="grid grid-cols-[108px_1fr] items-center px-3 py-1.5">
                                <span className="inline-flex items-center gap-1.5 text-[#E0F7FF] font-semibold">
                                  <Icon className="w-3.5 h-3.5 text-[#7DF9FF] shrink-0" /> {label}
                                </span>
                                <span style={{ color: col }} className="font-mono font-extrabold truncate">: {val}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Bottom 4 Translucent Holographic Glass Action Tiles matching image_0f9e88.jpg */}
                      <div className="grid grid-cols-4 gap-2.5 mt-3.5">
                        {[
                          ['Register Map', Layers],
                          ['Live Values', Activity],
                          ['Configuration', Settings],
                          ['Device Info', Info],
                        ].map(([label, IconComp]) => {
                          const Icon = IconComp as React.FC<{ className?: string }>;
                          return (
                            <div
                              key={label as string}
                              className="rounded-xl border border-[#A5F3FC]/65 py-2.5 px-1.5 flex flex-col items-center justify-center gap-1"
                              style={{
                                background: 'linear-gradient(180deg, rgba(165, 243, 252, 0.18), rgba(12, 54, 84, 0.48))',
                                boxShadow: '0 0 14px rgba(56, 232, 255, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.55)',
                              }}
                            >
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

              {/* TOP-LAYER (z-[80]) HOLOGRAPHIC SWITCH INFO POPUP (ON HOVER OVER HIRSCHMANN RSP35) */}
              {switchHovered && (
                <div
                  className="absolute z-[80] pointer-events-none transition-all duration-150"
                  style={{ left: '42%', top: '34px', width: '500px' }}
                >
                  <div
                    className="rounded-2xl border-[1.5px] p-4 relative overflow-hidden"
                    style={{
                      background:
                        'radial-gradient(ellipse 68% 48% at 18% 12%, rgba(165, 243, 252, 0.24) 0%, transparent 65%), ' +
                        'linear-gradient(145deg, rgba(16, 62, 92, 0.70) 0%, rgba(10, 42, 68, 0.78) 52%, rgba(8, 32, 54, 0.82) 100%)',
                      backdropFilter: 'blur(36px) saturate(170%)',
                      WebkitBackdropFilter: 'blur(36px) saturate(170%)',
                      borderColor: 'rgba(182, 248, 255, 0.90)',
                      boxShadow:
                        '0 0 28px rgba(56, 232, 255, 0.52), 0 0 60px rgba(0, 210, 255, 0.22), ' +
                        'inset 0 1.5px 2px rgba(255, 255, 255, 0.85), inset 0 -1px 2px rgba(56, 232, 255, 0.55)',
                    }}
                  >
                    <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-[#A5F3FC]/35">
                      <div className="flex items-center gap-2 text-[12.5px] font-bold text-[#E6FAFF]">
                        <span className="w-0.5 h-4 bg-[#7DF9FF] shadow-[0_0_8px_#7DF9FF]" />
                        <span>Industrial Switch — Device Info</span>
                      </div>
                      <div className="flex items-center gap-2.5 font-mono text-[12px] text-[#CFFAFE]/90">
                        <span>–</span><span>□</span><span>×</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-[124px_1fr] gap-4 items-center">
                      <div
                        className="w-[118px] h-[118px] rounded-xl border border-[#7DF9FF]/50 p-2 flex items-center justify-center"
                        style={{ background: 'radial-gradient(circle, rgba(56,232,255,0.20), rgba(6,30,50,0.42))' }}
                      >
                        <img
                          src="assets/devices/hirschmann-rsp35.png"
                          alt="Hirschmann RSP35"
                          className="max-h-[100px] w-auto object-contain"
                          style={{ filter: 'drop-shadow(0 0 12px rgba(103,232,249,0.72))' }}
                        />
                      </div>
                      <div className="space-y-2 min-w-0">
                        <div className="text-[16px] font-extrabold text-white">Hirschmann RSP35</div>
                        <div className="rounded-xl border border-[#A5F3FC]/42 divide-y divide-[#A5F3FC]/20 text-[11px]" style={{ background: 'rgba(8, 38, 62, 0.56)' }}>
                          {[
                            { label: 'Device Type', val: 'Managed Industrial Ethernet Switch', col: '#FFFFFF' },
                            { label: 'Mgmt IP', val: '10.132.30.10', col: '#38F3FF' },
                            { label: 'Station VLAN', val: 'VLAN 10 (Modbus TCP/502)', col: '#FDE047' },
                            { label: 'Access Ports', val: 'P1–P4 → IEDs (100BASE-TX)', col: '#4ADE80' },
                            { label: 'Uplink Port', val: 'P5 (SFP) → GTW-01 ETH0', col: '#E879F9' },
                            { label: 'Switch Status', val: stationBusOk ? 'HEALTHY · FORWARDING' : 'LINK FAULT / DOWN', col: stationBusOk ? '#4ADE80' : '#FCA5A5' },
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

                            {/* PORT-TO-PORT GLOWING SVG CABLES & ANIMATED PACKETS */}
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

                const iedRoutes = IED_DEVICES.map((dev, i) => {
                  const a = ports[`ied_${dev.id}`];
                  const b = ports[`sw_p${dev.portNum}`];
                  return [a, { x: bendXs[i], y: a.y }, { x: bendXs[i], y: dropYs[i] }, { x: b.x, y: dropYs[i] }, b];
                });

                const swToGtwPts = [ports.sw_p5, { x: (ports.sw_p5.x + ports.gtw_eth0.x) / 2, y: ports.sw_p5.y }, { x: (ports.sw_p5.x + ports.gtw_eth0.x) / 2, y: ports.gtw_eth0.y }, ports.gtw_eth0];
                const gtwToRccPts = [ports.gtw_eth1, { x: (ports.gtw_eth1.x + ports.rcc_wan.x) / 2, y: ports.gtw_eth1.y }, { x: (ports.gtw_eth1.x + ports.rcc_wan.x) / 2, y: ports.rcc_wan.y }, ports.rcc_wan];

                // Active packet position along full port-to-port path
                const actIedPts = iedRoutes[activeIedIdx];
                const reqFullPts = [...[...swToGtwPts].reverse(), ...[...actIedPts].reverse()];
                const respFullPts = [...actIedPts, ...swToGtwPts];

                let pktPos: { x: number; y: number } | null = null;
                let pktColor = '#00E5FF';
                let pktLabel = '';

                if (simPhase === 'REQ' && stationBusOk) {
                  const frac = cycleProgress / 0.22;
                  pktPos = samplePolyline(reqFullPts, frac);
                  pktColor = '#00E5FF';
                  pktLabel = `REQ FC${selectedFc}`;
                } else if (simPhase === 'RESP' && stationBusOk && !iedOfflineNow && !respTimeout) {
                  const frac = (cycleProgress - 0.22) / 0.22;
                  pktPos = samplePolyline(respFullPts, frac);
                  pktColor = ex01 || ex02 || ex03 ? '#EF4444' : '#22C55E';
                  pktLabel = ex01 || ex02 || ex03 ? 'EX ERR' : `${liveValue} ${activeIed.sampleUnit}`;
                } else if (simPhase === 'WAN_TX' && conversionHealthy && wanHealthy) {
                  const frac = (cycleProgress - 0.80) / 0.20;
                  pktPos = samplePolyline(gtwToRccPts, frac);
                  pktColor = '#A3E635';
                  pktLabel = `IEC-104 · IOA:${activeIed.ioa}`;
                }

                const midSwGtwX = (ports.sw_p5.x + ports.gtw_eth0.x) / 2;
                const midSwGtwY = Math.min(ports.sw_p5.y, ports.gtw_eth0.y) - 18;
                const midGtwRccX = (ports.gtw_eth1.x + ports.rcc_wan.x) / 2;
                const midGtwRccY = Math.min(ports.gtw_eth1.y, ports.rcc_wan.y) - 18;

                return (
                  <svg
                    width={W}
                    height={H}
                    viewBox={`0 0 ${W} ${H}`}
                    className="absolute inset-0 pointer-events-none z-20"
                  >
                    <defs>
                      <filter id="mbGlowCyan" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                        <feGaussianBlur stdDeviation="3.2" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                      <filter id="mbGlowGreen" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                        <feGaussianBlur stdDeviation="3.2" result="b" />
                        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
                      </filter>
                    </defs>

                    {/* 4 IED -> RSP35 Cables */}
                    {iedRoutes.map((pts, i) => {
                      const isPAct = i === activeIedIdx;
                      const isPFault = (i === 1 && p2Offline) || port502Closed;
                      return (
                        <path
                          key={IED_DEVICES[i].id}
                          d={roundedOrthPath(pts, 14)}
                          fill="none"
                          stroke={isPFault ? '#EF4444' : isPAct ? '#38F3FF' : '#0EA5E9'}
                          strokeOpacity={isPFault ? 0.95 : isPAct ? 1 : 0.65}
                          strokeWidth={isPAct ? 3.6 : 2.6}
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeDasharray={isPFault ? '7 5' : undefined}
                          filter={isPFault ? undefined : 'url(#mbGlowCyan)'}
                        />
                      );
                    })}

                    {/* RSP35 Port 5 -> GTW-01 ETH0 Cable */}
                    <path
                      d={roundedOrthPath(swToGtwPts, 10)}
                      fill="none"
                      stroke={stationBusOk ? '#00E5FF' : '#EF4444'}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      strokeDasharray={stationBusOk ? undefined : '7 5'}
                      filter={stationBusOk ? 'url(#mbGlowCyan)' : undefined}
                    />
                    <text x={midSwGtwX} y={midSwGtwY - 6} textAnchor="middle" fill="#BAE6FD" fontSize="10.5" fontWeight="800" fontFamily="monospace">
                      P5 → ETH0
                    </text>
                    <text x={midSwGtwX} y={midSwGtwY + 7} textAnchor="middle" fill="#7DD3FC" fontSize="9.5" fontWeight="700" fontFamily="monospace">
                      (TCP/502)
                    </text>

                    {/* GTW-01 ETH1 -> RCC/SCADA WAN Cable */}
                    <path
                      d={roundedOrthPath(gtwToRccPts, 10)}
                      fill="none"
                      stroke={wanHealthy ? '#22C55E' : '#EF4444'}
                      strokeWidth="3.8"
                      strokeLinecap="round"
                      strokeDasharray={wanHealthy ? undefined : '7 5'}
                      filter={wanHealthy ? 'url(#mbGlowGreen)' : undefined}
                    />
                    <text x={midGtwRccX} y={midGtwRccY - 6} textAnchor="middle" fill="#DCFCE7" fontSize="10.5" fontWeight="800" fontFamily="monospace">
                      ETH1 → WAN
                    </text>
                    <text x={midGtwRccX} y={midGtwRccY + 7} textAnchor="middle" fill="#86EFAC" fontSize="9.5" fontWeight="700" fontFamily="monospace">
                      (IEC-104 TCP/2404)
                    </text>

                    {/* Live Animated Packet Dot + Tag */}
                    {pktPos && (
                      <g>
                        <circle cx={pktPos.x} cy={pktPos.y} r="7.5" fill={pktColor} fillOpacity="0.28" />
                        <circle cx={pktPos.x} cy={pktPos.y} r="4.8" fill="#FFFFFF" stroke={pktColor} strokeWidth="2.5" filter="url(#mbGlowCyan)" />
                        <rect
                          x={pktPos.x - (simPhase === 'WAN_TX' ? 56 : 40)}
                          y={pktPos.y - 28}
                          width={simPhase === 'WAN_TX' ? 112 : 80}
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
                <span className={`w-2.5 h-2.5 rounded-full ${endToEndHealthy ? 'bg-[#22C55E] shadow-[0_0_8px_#22C55E]' : 'bg-[#EF4444] shadow-[0_0_8px_#EF4444]'}`} />
                <span className="font-extrabold text-[#4ADE80]">ACTIVE PATH:</span>
                <span className="text-[#E0F2FE] font-semibold">
                  {activeIed.fullName.split(' ').slice(1).join(' ')} (ETH) → RSP35 (Port {activeIed.portNum} → P5) → GTW-01 (ETH0 → ETH1) → RCC/SCADA (2404)
                </span>
              </div>
              <span
                className="rounded-lg border px-3 py-0.5 text-[10.5px] font-extrabold"
                style={
                  endToEndHealthy
                    ? { background: '#072A42', borderColor: '#38F3FF', color: '#7DD3FC' }
                    : { background: '#3B0D15', borderColor: '#EF4444', color: '#FCA5A5' }
                }
              >
                {stagePillLabel}
              </span>
            </div>
          </div>

          {/* 4. COMPREHENSIVE 32-TEST INTERACTIVE SIMULATION & FAULT INJECTION LAB (FROSTED CYAN GLASSMORPHISM) */}
          <div
            className="mb-glass-panel relative rounded-2xl p-4 sm:p-5 space-y-3.5 overflow-hidden"
            style={{
              background:
                'radial-gradient(ellipse 46% 32% at 50% 0%, rgba(72, 238, 255, 0.28) 0%, transparent 72%), ' +
                'radial-gradient(ellipse 36% 24% at 16% 100%, rgba(0, 225, 255, 0.22) 0%, transparent 72%), ' +
                'radial-gradient(ellipse 38% 24% at 78% 100%, rgba(0, 225, 255, 0.22) 0%, transparent 72%), ' +
                'linear-gradient(180deg, rgba(24, 78, 108, 0.78) 0%, rgba(16, 56, 82, 0.84) 52%, rgba(12, 46, 68, 0.88) 100%)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1.5px solid rgba(86, 235, 255, 0.78)',
              boxShadow:
                '0 0 34px rgba(0, 224, 255, 0.34), inset 0 1px 1px rgba(190, 252, 255, 0.72), inset 0 -1px 1px rgba(0, 232, 255, 0.55)',
            }}
          >
            <style>{`
              .mb-glass-panel::before { content:''; position:absolute; top:0; left:10%; right:10%; height:2px; background:linear-gradient(90deg,transparent,rgba(160,250,255,.92),transparent); pointer-events:none; }
              .mb-glass-panel::after { content:''; position:absolute; bottom:0; left:12%; right:12%; height:2px; background:linear-gradient(90deg,transparent,rgba(0,232,255,.85),transparent); pointer-events:none; }
              .mb-glass-scroll::-webkit-scrollbar { width: 11px; height: 11px; }
              .mb-glass-scroll::-webkit-scrollbar-track { background: rgba(10, 42, 64, 0.72); border-left: 1px solid rgba(90, 215, 245, 0.28); }
              .mb-glass-scroll::-webkit-scrollbar-thumb { background: linear-gradient(180deg, #42F8FF 0%, #00D8F5 100%); border-radius: 999px; border: 2px solid rgba(10, 42, 64, 0.85); box-shadow: 0 0 12px rgba(0, 240, 255, 0.9); }
            `}</style>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <svg viewBox="0 0 28 28" className="w-6 h-6 shrink-0" style={{ filter: 'drop-shadow(0 0 8px rgba(0,232,255,0.85))' }} fill="none">
                    <path d="M14 2.5L24 8v12l-10 5.5L4 20V8l10-5.5z" stroke="#38F3FF" strokeWidth="1.7" />
                    <path d="M4 8l10 5.5L24 8M14 13.5v12" stroke="#38F3FF" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <h2 className="text-[15px] sm:text-[17px] font-extrabold text-white">
                    Modbus TCP &amp; IEC-104 Test Simulation Lab (32 Interactive Tests)
                  </h2>
                  <span className="rounded-full border border-[#22C55E] bg-[#0A5C2E]/70 px-3 py-0.5 text-[10px] font-extrabold text-[#4ADE80] shadow-[0_0_12px_rgba(34,197,94,0.45)]">
                    SAFE SIMULATION ONLY
                  </span>
                </div>
                <p className="text-[12px] text-[#D4EEF9] mt-1">
                  Toggle any test ON/OFF independently to verify TCP/502 polling, Exception codes (0x01–0x03), IEEE-754 ABCD/CDAB byte order, GTW-01 IOA mapping, and IEC-104 WAN delivery.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleRunAllSafeTests}
                  style={{ background: 'linear-gradient(180deg, rgba(34,197,94,0.46), rgba(12,92,52,0.84))', borderColor: '#4ADE80', boxShadow: '0 0 16px rgba(34,197,94,0.5)' }}
                  className="rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-white hover:brightness-110 transition"
                >
                  ▶ Run All Safe Tests
                </button>
                <button
                  type="button"
                  onClick={() => handleResetAllTests(true)}
                  style={{ background: 'linear-gradient(180deg, rgba(217,138,28,0.50), rgba(112,58,12,0.86))', borderColor: '#F59E0B', boxShadow: '0 0 14px rgba(245,158,11,0.45)' }}
                  className="rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-white hover:brightness-110 transition"
                >
                  ■ Stop All Tests
                </button>
                <button
                  type="button"
                  onClick={() => handleResetAllTests(false)}
                  style={{ background: 'linear-gradient(180deg, rgba(220,56,62,0.54), rgba(128,20,28,0.86))', borderColor: '#F87171', boxShadow: '0 0 14px rgba(239,68,68,0.48)' }}
                  className="rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-white hover:brightness-110 transition"
                >
                  ↺ Reset All Faults
                </button>
                <button
                  type="button"
                  onClick={handleExportCsv}
                  style={{ background: 'linear-gradient(180deg, rgba(28,116,164,0.55), rgba(12,60,94,0.84))', borderColor: 'rgba(96,205,250,0.72)' }}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-[#ECF8FF] hover:brightness-110 transition"
                >
                  <Download className="w-3.5 h-3.5 text-[#7DD3FC]" /> Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory((h) => !h)}
                  style={{ background: 'linear-gradient(180deg, rgba(26,70,100,0.62), rgba(12,42,66,0.84))', borderColor: 'rgba(110,200,235,0.52)' }}
                  className="inline-flex items-center gap-1.5 rounded-[10px] border-[1.5px] px-3.5 py-1.5 text-[11.5px] font-extrabold text-[#E2F4FF] hover:border-[#38F3FF] transition"
                >
                  <History className="w-3.5 h-3.5 text-[#9BD8F4]" /> History ({testHistory.length})
                </button>
              </div>
            </div>

            {/* Category Filter Tabs */}
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  ['ALL', 'All 32 Tests'],
                  ['A_CONN', 'A. Connection & Polling (6)'],
                  ['B_FC', 'B. Function Codes & Exceptions (8)'],
                  ['C_FRAME', 'C. Byte Order & Framing (6)'],
                  ['D_CONV', 'D. Gateway & IOA Mapping (6)'],
                  ['E_WAN', 'E. WAN & IEC-104 SCADA (6)'],
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

            {/* Glass Table */}
            <div
              style={{
                border: '1.5px solid rgba(100, 224, 248, 0.62)',
                background: 'linear-gradient(180deg, rgba(26, 76, 104, 0.52) 0%, rgba(14, 52, 76, 0.64) 100%)',
              }}
              className="mb-glass-scroll overflow-x-auto max-h-[385px] overflow-y-auto rounded-xl"
            >
              <table className="w-full text-left border-collapse font-sans text-[12.5px]">
                <thead
                  style={{
                    background: 'linear-gradient(180deg, rgba(64, 126, 158, 0.68) 0%, rgba(36, 86, 116, 0.76) 100%)',
                    borderBottom: '1px solid rgba(120, 218, 245, 0.38)',
                  }}
                  className="sticky top-0 z-10 text-[#F0FAFF] font-bold"
                >
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
                            ? {
                                background: 'linear-gradient(90deg, rgba(0,216,238,0.42), rgba(0,186,216,0.28), rgba(0,210,236,0.36))',
                                boxShadow: 'inset 0 0 0 1.5px rgba(82,242,255,0.88)',
                              }
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
                              background: r.enabled
                                ? t.isFault
                                  ? 'linear-gradient(90deg, #dc2626, #ef4444)'
                                  : 'linear-gradient(90deg, #16a34a, #22c55e)'
                                : 'rgba(14, 42, 62, 0.82)',
                              borderColor: r.enabled ? (t.isFault ? '#fca5a5' : '#86efac') : 'rgba(130, 215, 242, 0.58)',
                            }}
                            className="inline-flex items-center justify-between w-[54px] h-[24px] rounded-full border-[1.5px] px-1 transition-all"
                          >
                            {r.enabled ? (
                              <>
                                <span className="text-[9px] font-extrabold text-white pl-1.5">ON</span>
                                <span className="w-4 h-4 rounded-full bg-white shadow" />
                              </>
                            ) : (
                              <>
                                <span className="w-4 h-4 rounded-full bg-white shadow" />
                                <span className="text-[9px] font-bold text-[#CBE8F6] pr-1">OFF</span>
                              </>
                            )}
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
          {activeTab === 'REGISTER_BROWSER' && (
            <>
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Database className="w-4 h-4 text-[#38F3FF]" /> Live Modbus Register Browser ({bayRegisters.length} Registers · {activeBay?.bayCode || '33-F03'})
              </h3>
              <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead className="bg-[#0B2A46] text-[#9BC0DF] sticky top-0">
                    <tr>
                      <th className="py-2 px-2.5">Address</th>
                      <th className="py-2 px-2.5">FC</th>
                      <th className="py-2 px-2.5">Parameter</th>
                      <th className="py-2 px-2.5">DataType</th>
                      <th className="py-2 px-2.5">Value</th>
                      <th className="py-2 px-2.5">Unit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#133252]">
                    {bayRegisters.map((reg) => (
                      <tr key={reg.address} className="hover:bg-[#0B2A46]/60">
                        <td className="py-1.5 px-2.5 text-[#38F3FF] font-bold">{reg.address}</td>
                        <td className="py-1.5 px-2.5 text-[#FDE047]">{reg.functionCode}</td>
                        <td className="py-1.5 px-2.5 text-white font-sans font-semibold">{reg.name}</td>
                        <td className="py-1.5 px-2.5 text-[#D8B4FE]">{reg.dataType}</td>
                        <td className="py-1.5 px-2.5 text-[#4ADE80] font-bold">{String(reg.value)}</td>
                        <td className="py-1.5 px-2.5 text-[#9BC0DF]">{reg.unit}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'POLLING_CONFIG' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="rounded-xl border border-[#1E5280] bg-[#041222] p-3.5 space-y-2">
                <div className="font-extrabold text-[#38F3FF] flex items-center gap-1.5"><Sliders className="w-4 h-4" /> Polling Parameters</div>
                <label className="block text-[#9BC0DF]">Function Code
                  <select value={selectedFc} onChange={(e) => setSelectedFc(e.target.value as '03' | '04' | '06')} className="mt-1 w-full rounded border border-[#1E5280] bg-[#082038] p-1.5 font-mono text-white">
                    <option value="04">FC04 — Read Input Registers</option>
                    <option value="03">FC03 — Read Holding Registers</option>
                    <option value="06">FC06 — Write Single Register</option>
                  </select>
                </label>
                <label className="block text-[#9BC0DF]">FLOAT32 Word Order
                  <select value={wordOrder} onChange={(e) => setWordOrder(e.target.value as WordOrder)} className="mt-1 w-full rounded border border-[#1E5280] bg-[#082038] p-1.5 font-mono text-white">
                    <option value="ABCD">ABCD (Big-Endian Standard)</option>
                    <option value="CDAB">CDAB (Word-Swapped)</option>
                  </select>
                </label>
                <label className="block text-[#9BC0DF]">Poll Interval (ms)
                  <input type="number" value={pollIntervalMs} onChange={(e) => setPollIntervalMs(Math.max(250, Number(e.target.value) || 1000))} className="mt-1 w-full rounded border border-[#1E5280] bg-[#082038] p-1.5 font-mono text-white" />
                </label>
              </div>
              <div className="md:col-span-2 rounded-xl border border-[#1E5280] bg-[#041222] p-3.5 space-y-2">
                <div className="font-extrabold text-[#4ADE80]">Configured Station Bus IEDs (VLAN 10)</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 font-mono text-[11px]">
                  {IED_DEVICES.map((d) => (
                    <div key={d.id} className="rounded-lg border border-[#174266] bg-[#071D34] p-2.5">
                      <div className="font-extrabold text-white">{d.id} · {d.fullName}</div>
                      <div className="text-[#38F3FF]">IP: {d.ip} · Unit ID: {d.unitId}</div>
                      <div className="text-[#FDE047]">Reg {d.sampleReg} → IOA {d.ioa} ({d.iecType})</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'REGISTER_MAPPING' && (
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><Layers className="w-4 h-4 text-[#FDE047]" /> Modbus TCP → IEC 60870-5-104 IOA Mapping Table</h3>
              <table className="w-full text-left border-collapse font-mono text-[11.5px]">
                <thead className="bg-[#0B2A46] text-[#9BC0DF]">
                  <tr><th className="py-2 px-3">IED</th><th className="py-2 px-3">IP / UID</th><th className="py-2 px-3">Modbus Reg</th><th className="py-2 px-3">Parameter</th><th className="py-2 px-3">IEC-104 Type</th><th className="py-2 px-3">CA / IOA</th></tr>
                </thead>
                <tbody className="divide-y divide-[#133252]">
                  {IED_DEVICES.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 px-3 text-white font-bold">{d.fullName}</td>
                      <td className="py-2 px-3 text-[#38F3FF]">{d.ip} / {d.unitId}</td>
                      <td className="py-2 px-3 text-[#FDE047]">{d.sampleReg}</td>
                      <td className="py-2 px-3 text-[#E0F2FE]">{d.sampleLabel}</td>
                      <td className="py-2 px-3 text-[#4ADE80]">{d.iecType}</td>
                      <td className="py-2 px-3 text-[#D8B4FE]">CA:132 / IOA:{d.ioa}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === 'PROTOCOL_CONVERSION' && (
            <div className="space-y-2 font-mono text-xs">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><Cpu className="w-4 h-4 text-[#38F3FF]" /> Live Gateway Conversion Inspector ({activeIed.fullName})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#38F3FF]/40 bg-[#041628] p-3 space-y-1">
                  <div className="text-[#38F3FF] font-extrabold">Ingress: Modbus TCP (ETH0 · 10.132.30.200:502)</div>
                  <div>MBAP Header: TID={tidHex} PID=0x0000 LEN=0x0007 UID=0x0{activeIed.unitId}</div>
                  <div className="text-[#FDE047]">PDU: FC{selectedFc} Reg={activeIed.sampleReg} Words=0x{hexWords.hi} 0x{hexWords.lo} ({effectiveOrder})</div>
                </div>
                <div className="rounded-xl border border-[#4ADE80]/40 bg-[#041E19] p-3 space-y-1">
                  <div className="text-[#4ADE80] font-extrabold">Egress: IEC 60870-5-104 (ETH1 · 10.132.20.200:2404)</div>
                  <div>ASDU: {activeIed.iecType} · COT=3 (Spontaneous) · CA=132 · IOA={activeIed.ioa}</div>
                  <div className="text-[#A3E635]">Payload: 68 0E 0E 00 00 00 0D 01 03 00 84 00 {hexWords.rawBytes} {badQds ? '81' : '00'}</div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'PACKET_ANALYZER' && (
            <div className="space-y-2 font-mono text-xs">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><FileCode2 className="w-4 h-4 text-[#D8B4FE]" /> MBAP / PDU &amp; IEC-104 APDU Dissector</h3>
              <div className="rounded-xl border border-[#1E5280] bg-[#03101F] p-3 space-y-1.5">
                <div className="text-[#38F3FF]">Modbus TCP Request:  {tidHex.slice(2)} 00 00 00 06 0{activeIed.unitId} {selectedFc} 00 00 00 02</div>
                <div className="text-[#4ADE80]">Modbus TCP Response: {tidHex.slice(2)} 00 00 00 07 0{activeIed.unitId} {selectedFc} 04 {hexWords.hi.slice(0, 2)} {hexWords.hi.slice(2)} {hexWords.lo.slice(0, 2)} {hexWords.lo.slice(2)}</div>
                <div className="text-[#FDE047]">IEC-104 I-Frame TX:  68 0E 0E 00 00 00 0D 01 03 00 84 00 {hexWords.rawBytes} {badQds ? '81' : '00'}</div>
              </div>
            </div>
          )}

          {activeTab === 'LOGS_DIAGNOSTICS' && (
            <div className="space-y-2">
              <h3 className="text-sm font-extrabold text-white flex items-center gap-2"><Terminal className="w-4 h-4 text-[#38F3FF]" /> Live Modbus TCP / Gateway / IEC-104 Logs</h3>
              <div className="max-h-[380px] overflow-y-auto space-y-1 font-mono text-[11px]">
                {logs.map((l) => (
                  <div key={l.id} className="flex flex-wrap justify-between gap-2 border-b border-[#133252] pb-1">
                    <span className="text-[#94B8D7]">{l.time}</span>
                    <span className="text-[#38F3FF] font-bold">{l.protocol}</span>
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
