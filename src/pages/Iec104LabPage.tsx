import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildIec104TelecontrolTable, Iec104IoaEntry } from '../data/protocolRegistry';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Layers,
  Monitor,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  ShieldAlert,
  Terminal,
  Zap,
} from 'lucide-react';

type Iec104LabTab =
  | 'TOPOLOGY_LIVE'
  | 'IOA_MAPPING'
  | 'GI_SEQUENCE'
  | 'REMOTE_COMMANDS'
  | 'APCI_ANALYZER'
  | 'FAULT_SIMULATION'
  | 'LOGS_DIAGNOSTICS';

type Iec104FaultMode =
  | 'NONE'
  | 'TCP_2404_DOWN'
  | 'STARTDT_FAIL'
  | 'GI_TIMEOUT'
  | 'UNKNOWN_COA'
  | 'UNKNOWN_IOA'
  | 'NEG_CMD_CON'
  | 'SEQ_NUM_ERROR'
  | 'T1_TIMEOUT'
  | 'T3_TIMEOUT';

type FrameFormat = 'I-Frame' | 'S-Frame' | 'U-Frame';
type ControlMode = 'SBO' | 'DIRECT';

interface PortPoint {
  x: number;
  y: number;
}

interface PortInspectionInfo {
  title: string;
  connectedDevice: string;
  remotePort: string;
  protocol: string;
  tcpPort: string;
  linkStatus: 'UP' | 'DOWN';
  speedDuplex: string;
}

interface Iec104FrameLog {
  id: number;
  time: string;
  format: FrameFormat;
  dir: 'RCC → RTU' | 'RTU → RCC' | 'RCC → RTU → IED';
  apciText: string;
  summary: string;
  rawHex: string;
  typeId?: number;
  vsq?: string;
  cot?: number;
  coa?: number;
  ioa?: number;
  quality?: string;
  ns?: number;
  nr?: number;
}

interface InFlightPacket {
  id: number;
  format: FrameFormat;
  direction: 'RTU_TO_RCC' | 'RCC_TO_RTU';
  progress: number;
  label1: string;
  label2: string;
  ns?: number;
  nr?: number;
}

const IEC104_NET = {
  rtuName: 'RTU / Station Gateway',
  rtuModel: 'Schneider MiCOM C264 / Moxa MGate 5216',
  rtuIp: '10.132.10.190',
  switchName: 'Hirschmann RSP35',
  switchIp: '192.168.100.10',
  gatewayName: 'IEC-104 Gateway',
  gatewayIp: '10.132.10.190',
  rccName: 'RCC / SLDC (Master)',
  rccIp: '172.16.104.10',
  tcpPort: 2404,
  coa: 132,
  coaHex: '0x0084',
  originatorAddr: 1,
  t1Sec: 15,
  t2Sec: 10,
  t3Sec: 20,
  kParam: 12,
  wParam: 8,
} as const;

const HW_ASSETS = {
  RTU: 'assets/ieds/schneider-c264.webp',
  RTU_FALLBACK: 'assets/goose-lab/schneider-c264.png',
  SWITCH: 'assets/devices/hirschmann-rsp35.png',
  GATEWAY: 'assets/signal-chain/station-gateway.png',
  RCC: 'assets/signal-chain/scada-hmi.png',
} as const;

function nowTimeMs(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function buildOrthogonalPath(pts: PortPoint[]): string {
  if (pts.length === 0) return '';
  return pts.map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`).join(' ');
}

function samplePolyline(pts: PortPoint[], progress: number): { x: number; y: number; angleDeg: number } | null {
  if (pts.length < 2) return null;
  const clamped = Math.max(0, Math.min(1, progress));
  const segLens: number[] = [];
  let total = 0;
  for (let i = 0; i < pts.length - 1; i++) {
    const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
    segLens.push(len);
    total += len;
  }
  if (total <= 0.001) return { x: pts[0].x, y: pts[0].y, angleDeg: 0 };
  let target = clamped * total;
  for (let i = 0; i < segLens.length; i++) {
    if (target <= segLens[i] || i === segLens.length - 1) {
      const ratio = segLens[i] > 0 ? target / segLens[i] : 0;
      const a = pts[i];
      const b = pts[i + 1];
      const angleDeg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
        angleDeg,
      };
    }
    target -= segLens[i];
  }
  const last = pts[pts.length - 1];
  return { x: last.x, y: last.y, angleDeg: 0 };
}

function encodeIFrameHex(ns: number, nr: number, typeId: number, cot: number, coa: number, ioa: number, valByte = 0x02): string {
  const b = (n: number) => (n & 0xff).toString(16).padStart(2, '0').toUpperCase();
  const nsShifted = (ns & 0x7fff) << 1;
  const nrShifted = (nr & 0x7fff) << 1;
  const c1 = nsShifted & 0xff;
  const c2 = (nsShifted >> 8) & 0xff;
  const c3 = nrShifted & 0xff;
  const c4 = (nrShifted >> 8) & 0xff;
  const bytes = [
    0x68,
    0x0e,
    c1,
    c2,
    c3,
    c4,
    typeId,
    0x01, // VSQ = 1
    cot,
    IEC104_NET.originatorAddr,
    coa & 0xff,
    (coa >> 8) & 0xff,
    ioa & 0xff,
    (ioa >> 8) & 0xff,
    (ioa >> 16) & 0xff,
    valByte,
  ];
  return bytes.map(b).join(' ');
}

function encodeSFrameHex(nr: number): string {
  const b = (n: number) => (n & 0xff).toString(16).padStart(2, '0').toUpperCase();
  const nrShifted = (nr & 0x7fff) << 1;
  return [0x68, 0x04, 0x01, 0x00, nrShifted & 0xff, (nrShifted >> 8) & 0xff].map(b).join(' ');
}

export const Iec104LabPage: React.FC = () => {
  const { bays, commandBreaker } = useSubstationStore();

  // Navigation & Playback Controls (Default 0.5x; does NOT alter T1/T2/T3 protocol timers)
  const [activeTab, setActiveTab] = useState<Iec104LabTab>('TOPOLOGY_LIVE');
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(0.5);
  const [playing, setPlaying] = useState<boolean>(true);

  // IEC-104 Protocol State
  const [linkState, setLinkState] = useState<'STARTDT_ACTIVE' | 'STOPDT_STANDBY'>('STARTDT_ACTIVE');
  const [faultMode, setFaultMode] = useState<Iec104FaultMode>('NONE');
  const [txSeqNs, setTxSeqNs] = useState<number>(48);
  const [rxSeqNr, setRxSeqNr] = useState<number>(22);
  const [txFramesTotal, setTxFramesTotal] = useState<number>(148);
  const [rxFramesTotal, setRxFramesTotal] = useState<number>(122);
  const [giCount, setGiCount] = useState<number>(3);
  const [giStatus, setGiStatus] = useState<'Completed (QOI=20)' | 'In Progress' | 'Timeout (T1)' | 'Idle'>('Completed (QOI=20)');
  const [giStep, setGiStep] = useState<0 | 1 | 2 | 3 | 4>(4);

  // IOA & Command State
  const [selectedIoa, setSelectedIoa] = useState<number>(1001);
  const [commandTargetBayId, setCommandTargetBayId] = useState<string>(bays[0]?.id || 'BAY-132-L1');
  const [cmdAction, setCmdAction] = useState<'TRIP' | 'CLOSE'>('TRIP');
  const [controlMode, setControlMode] = useState<ControlMode>('SBO');
  const [interlockOk, setInterlockOk] = useState<boolean>(true);
  const [lastCommandText, setLastCommandText] = useState<string>('None');
  const [commandTraceStep, setCommandTraceStep] = useState<string>('Idle — Select bay IOA & issue C_DC_NA_1');
  const [lastUpdateTs, setLastUpdateTs] = useState<string>(nowTimeMs());

  // Packet Inspection & Port Inspection Popup
  const [selectedFrameId, setSelectedFrameId] = useState<number>(4);
  const [logFilter, setLogFilter] = useState<'ALL' | FrameFormat>('ALL');
  const [inspectedPort, setInspectedPort] = useState<PortInspectionInfo | null>(null);
  const [inFlight, setInFlight] = useState<InFlightPacket | null>(null);

  const [frameLog, setFrameLog] = useState<Iec104FrameLog[]>(() => [
    {
      id: 5,
      time: '14:20:03.005',
      format: 'S-Frame',
      dir: 'RCC → RTU',
      apciText: 'S (N(R)=48)',
      summary: 'Supervisory Acknowledgement (Receiver Ready)',
      rawHex: encodeSFrameHex(48),
      nr: 48,
    },
    {
      id: 4,
      time: '14:20:02.662',
      format: 'I-Frame',
      dir: 'RTU → RCC',
      apciText: 'N(S)=48 N(R)=22',
      summary: 'M_DP_TB_1 (TypeID=31), COT=3, COA=132, IOA=1001, Val=2 (CLOSED)',
      rawHex: encodeIFrameHex(48, 22, 31, 3, 132, 1001, 0x02),
      typeId: 31,
      vsq: '0x01 (1 obj)',
      cot: 3,
      coa: 132,
      ioa: 1001,
      quality: 'GOOD (IV=0, NT=0, SB=0, BL=0)',
      ns: 48,
      nr: 22,
    },
    {
      id: 3,
      time: '14:20:02.450',
      format: 'I-Frame',
      dir: 'RCC → RTU',
      apciText: 'N(S)=21 N(R)=47',
      summary: 'C_IC_NA_1 (TypeID=100), COT=6, COA=132, IOA=0, QOI=20 — General Interrogation',
      rawHex: encodeIFrameHex(21, 47, 100, 6, 132, 0, 0x14),
      typeId: 100,
      vsq: '0x01 (1 obj)',
      cot: 6,
      coa: 132,
      ioa: 0,
      quality: 'QOI=20 (Station Interrogation)',
      ns: 21,
      nr: 47,
    },
    {
      id: 2,
      time: '14:20:01.118',
      format: 'U-Frame',
      dir: 'RTU → RCC',
      apciText: 'STARTDT CON',
      summary: '0x68 0x04 0x0B 0x00 0x00 0x00 — Start Data Transfer Confirmation',
      rawHex: '68 04 0B 00 00 00',
    },
    {
      id: 1,
      time: '14:20:01.104',
      format: 'U-Frame',
      dir: 'RCC → RTU',
      apciText: 'STARTDT ACT',
      summary: '0x68 0x04 0x07 0x00 0x00 0x00 — Start Data Transfer Activation',
      rawHex: '68 04 07 00 00 00',
    },
  ]);

  // DOM Refs for ResizeObserver port-to-port SVG overlay
  const topoContainerRef = useRef<HTMLDivElement | null>(null);
  const rtuEthRef = useRef<HTMLButtonElement | null>(null);
  const swP1Ref = useRef<HTMLButtonElement | null>(null);
  const swP5Ref = useRef<HTMLButtonElement | null>(null);
  const gwEth1Ref = useRef<HTMLButtonElement | null>(null);
  const gwEth2Ref = useRef<HTMLButtonElement | null>(null);
  const rccEthRef = useRef<HTMLButtonElement | null>(null);

  const [cableGeom, setCableGeom] = useState<{
    width: number;
    height: number;
    trayY: number;
    c1: PortPoint[]; // RTU ETH1 -> Switch P1
    c2: PortPoint[]; // Switch P5 -> Gateway ETH1
    c3: PortPoint[]; // Gateway ETH2 -> WAN -> RCC ETH
    wanMid: PortPoint;
  } | null>(null);

  const nextIdRef = useRef<number>(20);
  const cursorRef = useRef<number>(0);
  const processedPktIdsRef = useRef<Set<number>>(new Set());

  // Preserve all 36 configured IOAs from existing protocolRegistry
  const ioaEntries: Iec104IoaEntry[] = useMemo(() => buildIec104TelecontrolTable(bays), [bays]);
  const selectedEntry = useMemo(
    () => ioaEntries.find((e) => e.ioa === selectedIoa) || ioaEntries[0],
    [ioaEntries, selectedIoa]
  );
  const targetBay = useMemo(
    () => bays.find((b) => b.id === commandTargetBayId) || bays[0],
    [bays, commandTargetBayId]
  );
  const selectedFrame = useMemo(
    () => frameLog.find((f) => f.id === selectedFrameId) || frameLog[0],
    [frameLog, selectedFrameId]
  );
  const filteredFrames = useMemo(
    () => (logFilter === 'ALL' ? frameLog : frameLog.filter((f) => f.format === logFilter)),
    [frameLog, logFilter]
  );

  // Derived protocol health flags
  const isTcpUp = faultMode !== 'TCP_2404_DOWN';
  const isDataTransferActive =
    isTcpUp &&
    linkState === 'STARTDT_ACTIVE' &&
    faultMode !== 'STARTDT_FAIL' &&
    faultMode !== 'T1_TIMEOUT' &&
    faultMode !== 'T3_TIMEOUT';
  const isFullyHealthy = faultMode === 'NONE' && linkState === 'STARTDT_ACTIVE';

  // Helper to append frames (declared BEFORE any effects or handlers — zero TDZ)
  const appendFrame = (entry: Omit<Iec104FrameLog, 'id' | 'time'>) => {
    const id = nextIdRef.current++;
    const time = nowTimeMs();
    setLastUpdateTs(time);
    setFrameLog((prev) => [{ id, time, ...entry }, ...prev].slice(0, 32));
    setSelectedFrameId(id);
  };

  const launchPacket = (
    format: FrameFormat,
    direction: 'RTU_TO_RCC' | 'RCC_TO_RTU',
    label1: string,
    label2: string,
    ns?: number,
    nr?: number
  ) => {
    const id = nextIdRef.current++;
    setInFlight({ id, format, direction, progress: 0, label1, label2, ns, nr });
  };

  // Measure DOM port anchors via ResizeObserver
  const measureTopology = () => {
    const c = topoContainerRef.current;
    const rtu = rtuEthRef.current;
    const s1 = swP1Ref.current;
    const s5 = swP5Ref.current;
    const g1 = gwEth1Ref.current;
    const g2 = gwEth2Ref.current;
    const rcc = rccEthRef.current;
    if (!c || !rtu || !s1 || !s5 || !g1 || !g2 || !rcc) return;

    const cr = c.getBoundingClientRect();
    if (cr.width < 100 || cr.height < 100) return;

    const ctr = (el: HTMLElement): PortPoint => {
      const r = el.getBoundingClientRect();
      return {
        x: r.left - cr.left + r.width / 2,
        y: r.top - cr.top + r.height / 2,
      };
    };

    const pRtu = ctr(rtu);
    const pS1 = ctr(s1);
    const pS5 = ctr(s5);
    const pG1 = ctr(g1);
    const pG2 = ctr(g2);
    const pRcc = ctr(rcc);
    const trayY = Math.max(pRtu.y, pS1.y, pS5.y, pG1.y, pG2.y, pRcc.y) + 20;

    setCableGeom({
      width: cr.width,
      height: cr.height,
      trayY,
      c1: [pRtu, { x: pRtu.x, y: trayY }, { x: pS1.x, y: trayY }, pS1],
      c2: [pS5, { x: pS5.x, y: trayY }, { x: pG1.x, y: trayY }, pG1],
      c3: [pG2, { x: pG2.x, y: trayY }, { x: pRcc.x, y: trayY }, pRcc],
      wanMid: { x: (pG2.x + pRcc.x) / 2, y: trayY },
    });
  };

  useEffect(() => {
    if (activeTab !== 'TOPOLOGY_LIVE') return;
    const c = topoContainerRef.current;
    if (!c) return;
    window.requestAnimationFrame(measureTopology);
    const t1 = window.setTimeout(measureTopology, 120);
    const t2 = window.setTimeout(measureTopology, 360);
    const ro = new ResizeObserver(() => measureTopology());
    ro.observe(c);
    window.addEventListener('resize', measureTopology);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', measureTopology);
    };
  }, [activeTab]);

  // Periodic background IEC-104 spontaneous I-Frame -> S-Frame Ack animation (0.5x default speed)
  useEffect(() => {
    if (!playing || !isDataTransferActive || inFlight || ioaEntries.length === 0) return;
    const delayMs = Math.max(600, Math.round(1600 / speed));
    const tid = window.setTimeout(() => {
      const idx = cursorRef.current % Math.min(12, ioaEntries.length);
      cursorRef.current += 1;
      const entry = ioaEntries[idx];
      const nextNs = faultMode === 'SEQ_NUM_ERROR' ? txSeqNs + 5 : txSeqNs + 1;
      const typeNum = parseInt(entry.typeId, 10) || 31;
      const coaUsed = faultMode === 'UNKNOWN_COA' ? 255 : IEC104_NET.coa;
      const ioaUsed = faultMode === 'UNKNOWN_IOA' ? 9999 : entry.ioa;

      launchPacket(
        'I-Frame',
        'RTU_TO_RCC',
        `I-Frame | N(S)=${nextNs} N(R)=${rxSeqNr} | TypeID=${typeNum}`,
        `COA=${coaUsed} · IOA=${ioaUsed} · ${entry.valueText}`,
        nextNs,
        rxSeqNr
      );
    }, delayMs);
    return () => window.clearTimeout(tid);
  }, [playing, speed, isDataTransferActive, inFlight, ioaEntries, txSeqNs, rxSeqNr, faultMode]);

  // Smooth requestAnimationFrame packet motion along exact measured orthogonal paths
  useEffect(() => {
    if (!playing || !inFlight) return;
    let rafId = 0;
    let lastTs = performance.now();
    const durationMs = 1900 / speed; // 0.5x = 3800ms clearly readable

    const step = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      setInFlight((cur) => {
        if (!cur) return null;
        const nextP = cur.progress + dt / durationMs;
        if (nextP < 1) return { ...cur, progress: nextP };

        // Packet arrived at destination endpoint (idempotent guard)
        if (!processedPktIdsRef.current.has(cur.id)) {
          processedPktIdsRef.current.add(cur.id);
          if (cur.format === 'I-Frame' && cur.direction === 'RTU_TO_RCC') {
            const newNs = cur.ns ?? txSeqNs + 1;
            setTxSeqNs(newNs);
            setTxFramesTotal((t) => t + 1);

            if (faultMode === 'SEQ_NUM_ERROR') {
              appendFrame({
                format: 'I-Frame',
                dir: 'RTU → RCC',
                apciText: `N(S)=${newNs} (OUT OF SEQ)`,
                summary: `Sequence Number Error detected by RCC — Expected N(S)=${txSeqNs + 1}, got ${newNs}`,
                rawHex: encodeIFrameHex(newNs, rxSeqNr, 31, 3, IEC104_NET.coa, selectedEntry?.ioa || 1001),
                typeId: 31,
                cot: 3,
                coa: IEC104_NET.coa,
                ioa: selectedEntry?.ioa || 1001,
                quality: 'INVALID (SEQ ERR)',
                ns: newNs,
                nr: rxSeqNr,
              });
              return null;
            }

            if (faultMode === 'UNKNOWN_COA' || faultMode === 'UNKNOWN_IOA') {
              const cotErr = faultMode === 'UNKNOWN_COA' ? 46 : 47;
              appendFrame({
                format: 'I-Frame',
                dir: 'RTU → RCC',
                apciText: `N(S)=${newNs} N(R)=${rxSeqNr}`,
                summary:
                  faultMode === 'UNKNOWN_COA'
                    ? `COT=46 Unknown Common Address (COA=255 rejected)`
                    : `COT=47 Unknown Information Object Address (IOA=9999 rejected)`,
                rawHex: encodeIFrameHex(newNs, rxSeqNr, 31, cotErr, faultMode === 'UNKNOWN_COA' ? 255 : 132, faultMode === 'UNKNOWN_IOA' ? 9999 : 1001),
                typeId: 31,
                cot: cotErr,
                coa: faultMode === 'UNKNOWN_COA' ? 255 : 132,
                ioa: faultMode === 'UNKNOWN_IOA' ? 9999 : 1001,
                quality: 'INVALID',
                ns: newNs,
                nr: rxSeqNr,
              });
              return null;
            }

            // Valid I-Frame received by RCC -> schedule S-Frame supervisory ACK back to RTU
            const curEntry = ioaEntries[(cursorRef.current - 1 + ioaEntries.length) % ioaEntries.length] || selectedEntry;
            const typeNum = parseInt(curEntry?.typeId || '31', 10) || 31;
            appendFrame({
              format: 'I-Frame',
              dir: 'RTU → RCC',
              apciText: `N(S)=${newNs} N(R)=${rxSeqNr}`,
              summary: `${curEntry?.typeId || 'M_DP_TB_1'}, COT=3 (Spontaneous), COA=132, IOA=${curEntry?.ioa || 1001}, Val=${curEntry?.valueText || 'CLOSED'}`,
              rawHex: encodeIFrameHex(newNs, rxSeqNr, typeNum, 3, IEC104_NET.coa, curEntry?.ioa || 1001),
              typeId: typeNum,
              vsq: '0x01 (1 obj)',
              cot: 3,
              coa: IEC104_NET.coa,
              ioa: curEntry?.ioa || 1001,
              quality: 'GOOD (IV=0, NT=0, SB=0, BL=0)',
              ns: newNs,
              nr: rxSeqNr,
            });

            // Immediately return S-Frame supervisory ACK (RCC -> RTU)
            const sId = nextIdRef.current++;
            return {
              id: sId,
              format: 'S-Frame',
              direction: 'RCC_TO_RTU',
              progress: 0,
              label1: `S-Frame ACK | N(R)=${newNs + 1}`,
              label2: 'Supervisory Ack (No ASDU Data)',
              nr: newNs + 1,
            };
          }

          if (cur.format === 'S-Frame') {
            setRxFramesTotal((r) => r + 1);
            appendFrame({
              format: 'S-Frame',
              dir: 'RCC → RTU',
              apciText: `S (N(R)=${cur.nr ?? txSeqNs + 1})`,
              summary: 'Supervisory Acknowledgement (Receiver Ready)',
              rawHex: encodeSFrameHex(cur.nr ?? txSeqNs + 1),
              nr: cur.nr ?? txSeqNs + 1,
            });
          }
        }
        return null;
      });
      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, speed, inFlight?.id, faultMode, txSeqNs, rxSeqNr, ioaEntries, selectedEntry]);

  // U-Frame Link Layer Control Handlers
  const handleSendUFrame = (uType: 'STARTDT' | 'STOPDT' | 'TESTFR') => {
    if (!isTcpUp) {
      appendFrame({
        format: 'U-Frame',
        dir: 'RCC → RTU',
        apciText: `${uType} FAILED`,
        summary: 'TCP Port 2404 socket disconnected — Cannot transmit U-Frame',
        rawHex: '—',
      });
      return;
    }

    if (uType === 'STARTDT') {
      launchPacket('U-Frame', 'RCC_TO_RTU', 'U-Frame | STARTDT ACT (0x07)', 'RCC → RTU · Activate Data Transfer');
      if (faultMode === 'STARTDT_FAIL' || faultMode === 'T1_TIMEOUT') {
        appendFrame({
          format: 'U-Frame',
          dir: 'RCC → RTU',
          apciText: 'STARTDT ACT (NO CON)',
          summary: `STARTDT ACT sent — No STARTDT CON received within T1 (${IEC104_NET.t1Sec} s)`,
          rawHex: '68 04 07 00 00 00',
        });
        return;
      }
      setLinkState('STARTDT_ACTIVE');
      setRxFramesTotal((r) => r + 1);
      setTxFramesTotal((t) => t + 1);
      appendFrame({
        format: 'U-Frame',
        dir: 'RTU → RCC',
        apciText: 'STARTDT CON (0x0B)',
        summary: 'STARTDT ACT (0x07) → STARTDT CON (0x0B) — Data Transfer Active',
        rawHex: '68 04 0B 00 00 00',
      });
    } else if (uType === 'STOPDT') {
      setLinkState('STOPDT_STANDBY');
      launchPacket('U-Frame', 'RCC_TO_RTU', 'U-Frame | STOPDT ACT (0x13)', 'RCC → RTU · Stop Data Transfer');
      appendFrame({
        format: 'U-Frame',
        dir: 'RTU → RCC',
        apciText: 'STOPDT CON (0x23)',
        summary: 'STOPDT ACT (0x13) → STOPDT CON (0x23) — Link Standby (No I-Frames)',
        rawHex: '68 04 23 00 00 00',
      });
    } else {
      launchPacket('U-Frame', 'RCC_TO_RTU', 'U-Frame | TESTFR ACT (0x43)', 'Keep-Alive Supervision (T3)');
      if (faultMode === 'T3_TIMEOUT') {
        appendFrame({
          format: 'U-Frame',
          dir: 'RCC → RTU',
          apciText: 'TESTFR TIMEOUT (T3)',
          summary: `TESTFR ACT sent — No TESTFR CON received (T3=${IEC104_NET.t3Sec}s expired)`,
          rawHex: '68 04 43 00 00 00',
        });
        return;
      }
      appendFrame({
        format: 'U-Frame',
        dir: 'RTU → RCC',
        apciText: 'TESTFR CON (0x83)',
        summary: 'TESTFR ACT (0x43) → TESTFR CON (0x83) — Link Keep-Alive OK',
        rawHex: '68 04 83 00 00 00',
      });
    }
  };

  // Accurate 4-Step Station General Interrogation (GI) Sequence
  const handleTriggerGi = () => {
    if (!isDataTransferActive) {
      setGiStatus('Idle');
      appendFrame({
        format: 'I-Frame',
        dir: 'RCC → RTU',
        apciText: 'GI BLOCKED',
        summary: 'Cannot start General Interrogation — Link is not in STARTDT ACTIVE state',
        rawHex: '—',
      });
      return;
    }

    setGiStatus('In Progress');
    setGiStep(1);
    const reqNr = rxSeqNr + 1;
    setRxSeqNr(reqNr);
    launchPacket('I-Frame', 'RCC_TO_RTU', 'C_IC_NA_1 (TypeID=100) | COT=6', 'Station General Interrogation (QOI=20)');
    appendFrame({
      format: 'I-Frame',
      dir: 'RCC → RTU',
      apciText: `N(S)=${reqNr} N(R)=${txSeqNs}`,
      summary: 'Step 1/4: C_IC_NA_1 (TypeID=100), COT=6 (Activation), COA=132, IOA=0, QOI=20',
      rawHex: encodeIFrameHex(reqNr, txSeqNs, 100, 6, IEC104_NET.coa, 0, 0x14),
      typeId: 100,
      vsq: '0x01 (1 obj)',
      cot: 6,
      coa: IEC104_NET.coa,
      ioa: 0,
      quality: 'QOI=20',
      ns: reqNr,
      nr: txSeqNs,
    });

    if (faultMode === 'GI_TIMEOUT' || faultMode === 'T1_TIMEOUT') {
      window.setTimeout(() => {
        setGiStatus('Timeout (T1)');
        setGiStep(1);
        appendFrame({
          format: 'I-Frame',
          dir: 'RTU → RCC',
          apciText: 'GI TIMEOUT',
          summary: `General Interrogation failed — No COT=7/COT=10 received within T1 (${IEC104_NET.t1Sec}s)`,
          rawHex: '—',
        });
      }, 650);
      return;
    }

    // Step 2: Activation Confirmation (COT=7)
    window.setTimeout(() => {
      setGiStep(2);
      setTxSeqNs((n) => n + 1);
      appendFrame({
        format: 'I-Frame',
        dir: 'RTU → RCC',
        apciText: `N(S)=${txSeqNs + 1} N(R)=${reqNr + 1}`,
        summary: 'Step 2/4: C_IC_NA_1 (TypeID=100), COT=7 (Activation Confirmation), COA=132, QOI=20',
        rawHex: encodeIFrameHex(txSeqNs + 1, reqNr + 1, 100, 7, IEC104_NET.coa, 0, 0x14),
        typeId: 100,
        cot: 7,
        coa: IEC104_NET.coa,
        ioa: 0,
      });
    }, 450);

    // Step 3: Interrogated Objects (COT=20)
    window.setTimeout(() => {
      setGiStep(3);
      setTxSeqNs((n) => n + 1);
      launchPacket('I-Frame', 'RTU_TO_RCC', `GI Data (${ioaEntries.length} IOAs) | COT=20`, 'Interrogated by Station (COA=132)');
      appendFrame({
        format: 'I-Frame',
        dir: 'RTU → RCC',
        apciText: `N(S)=${txSeqNs + 2} N(R)=${reqNr + 1}`,
        summary: `Step 3/4: ${ioaEntries.length} Information Objects transmitted with COT=20 (Interrogated by station)`,
        rawHex: encodeIFrameHex(txSeqNs + 2, reqNr + 1, 31, 20, IEC104_NET.coa, 1001, 0x02),
        typeId: 31,
        cot: 20,
        coa: IEC104_NET.coa,
        ioa: 1001,
      });
    }, 950);

    // Step 4: Activation Termination (COT=10) -> only now mark GI Completed!
    window.setTimeout(() => {
      setGiStep(4);
      setGiCount((c) => c + 1);
      setGiStatus('Completed (QOI=20)');
      setTxSeqNs((n) => n + 1);
      setTxFramesTotal((t) => t + 3);
      appendFrame({
        format: 'I-Frame',
        dir: 'RTU → RCC',
        apciText: `N(S)=${txSeqNs + 3} N(R)=${reqNr + 1}`,
        summary: 'Step 4/4: C_IC_NA_1 (TypeID=100), COT=10 (Activation Termination) — GI Sequence Completed',
        rawHex: encodeIFrameHex(txSeqNs + 3, reqNr + 1, 100, 10, IEC104_NET.coa, 0, 0x14),
        typeId: 100,
        cot: 10,
        coa: IEC104_NET.coa,
        ioa: 0,
      });
    }, 1500);
  };

  // Remote Command Execution (C_DC_NA_1, TypeID=46) with distinct Control Ack vs Physical Breaker Feedback
  const handleRemoteCommand = (action: 'TRIP' | 'CLOSE') => {
    if (!targetBay) return;
    const bayIdx = Math.max(0, bays.indexOf(targetBay));
    const cmdIoa = 6001 + bayIdx;
    const dcoText = action === 'CLOSE' ? 'DCO=2 (ON)' : 'DCO=1 (OFF)';
    const desiredBreakerState = action === 'CLOSE' ? 'CLOSED' : 'OPEN';

    if (!isDataTransferActive) {
      setCommandTraceStep('Blocked — STARTDT not active or TCP/2404 disconnected');
      return;
    }

    setCommandTraceStep(`1/4 RCC → Gateway: C_DC_NA_1 (${controlMode}) IOA=${cmdIoa} ${dcoText} sent...`);
    launchPacket('I-Frame', 'RCC_TO_RTU', `C_DC_NA_1 (TypeID=46) | ${dcoText}`, `${controlMode} · COA=132 · IOA=${cmdIoa}`);
    const nextNr = rxSeqNr + 1;
    setRxSeqNr(nextNr);

    appendFrame({
      format: 'I-Frame',
      dir: 'RCC → RTU → IED',
      apciText: `N(S)=${nextNr} N(R)=${txSeqNs}`,
      summary: `C_DC_NA_1 (TypeID=46, COT=6 Act, ${controlMode}), COA=132, IOA=${cmdIoa}, ${dcoText} → ${targetBay.bayCode}`,
      rawHex: encodeIFrameHex(nextNr, txSeqNs, 46, 6, IEC104_NET.coa, cmdIoa, action === 'CLOSE' ? 0x02 : 0x01),
      typeId: 46,
      cot: 6,
      coa: IEC104_NET.coa,
      ioa: cmdIoa,
    });

    if (!interlockOk || faultMode === 'NEG_CMD_CON') {
      window.setTimeout(() => {
        const reason = !interlockOk ? 'Bay Interlock Active (CILO1.EnaOpn/Cls=FALSE)' : 'Negative Command Confirmation Fault';
        setCommandTraceStep(`Rejected (P/N=1 Negative ActCon): ${reason} — Breaker state unchanged`);
        setLastCommandText(`REJECTED (${targetBay.bayCode} ${dcoText})`);
        appendFrame({
          format: 'I-Frame',
          dir: 'RTU → RCC',
          apciText: `N(S)=${txSeqNs + 1} N(R)=${nextNr + 1}`,
          summary: `C_DC_NA_1 COT=7 (Negative Confirmation P/N=1) — ${reason}`,
          rawHex: encodeIFrameHex(txSeqNs + 1, nextNr + 1, 46, 0x47, IEC104_NET.coa, cmdIoa, 0x00),
          typeId: 46,
          cot: 7,
          coa: IEC104_NET.coa,
          ioa: cmdIoa,
          quality: 'NEGATIVE CON (P/N=1)',
        });
      }, 600);
      return;
    }

    // Step 2: Command Activation Confirmation (COT=7) — NOT yet physical breaker change!
    window.setTimeout(() => {
      setCommandTraceStep(`2/4 Gateway → RCC: COT=7 Positive ActCon (${controlMode}) — Forwarding MMS CSWI1.Pos.Oper to Bay IED...`);
      appendFrame({
        format: 'I-Frame',
        dir: 'RTU → RCC',
        apciText: `N(S)=${txSeqNs + 1} N(R)=${nextNr + 1}`,
        summary: `C_DC_NA_1 COT=7 (Positive ActCon) — Command accepted by Gateway (awaiting physical breaker feedback)`,
        rawHex: encodeIFrameHex(txSeqNs + 1, nextNr + 1, 46, 7, IEC104_NET.coa, cmdIoa, action === 'CLOSE' ? 0x02 : 0x01),
        typeId: 46,
        cot: 7,
        coa: IEC104_NET.coa,
        ioa: cmdIoa,
      });
    }, 550);

    // Step 3-4: Physical Breaker Operating & Spontaneous M_DP_TB_1 Feedback
    window.setTimeout(() => {
      commandBreaker(targetBay.id, desiredBreakerState);
      setTxSeqNs((n) => n + 2);
      setTxFramesTotal((t) => t + 2);
      setLastCommandText(`${targetBay.bayCode} ${dcoText} → ${desiredBreakerState}`);
      setCommandTraceStep(
        `4/4 Confirmed: Bay IED XCBR1.Pos=${desiredBreakerState} → Spontaneous M_DP_TB_1 (IOA=${1001 + bayIdx}) & COT=10 ActTerm sent to RCC`
      );
      launchPacket('I-Frame', 'RTU_TO_RCC', `M_DP_TB_1 Feedback | IOA=${1001 + bayIdx}`, `${targetBay.bayCode} Breaker ${desiredBreakerState}`);
      appendFrame({
        format: 'I-Frame',
        dir: 'RTU → RCC',
        apciText: `N(S)=${txSeqNs + 2} N(R)=${nextNr + 1}`,
        summary: `M_DP_TB_1 (TypeID=31, COT=3) IOA=${1001 + bayIdx} Feedback=${desiredBreakerState} + C_DC_NA_1 COT=10 ActTerm`,
        rawHex: encodeIFrameHex(txSeqNs + 2, nextNr + 1, 31, 3, IEC104_NET.coa, 1001 + bayIdx, action === 'CLOSE' ? 0x02 : 0x01),
        typeId: 31,
        cot: 3,
        coa: IEC104_NET.coa,
        ioa: 1001 + bayIdx,
      });
    }, 1250);
  };

  const handleReset = () => {
    setSpeed(0.5);
    setPlaying(true);
    setLinkState('STARTDT_ACTIVE');
    setFaultMode('NONE');
    setInterlockOk(true);
    setInFlight(null);
    setGiStatus('Completed (QOI=20)');
    setGiStep(4);
    setCommandTraceStep('Idle — Select bay IOA & issue C_DC_NA_1');
  };

  // Compute exact packet position along the ResizeObserver-measured physical cables
  const pktPos = useMemo(() => {
    if (!inFlight || !cableGeom) return null;
    const fullForward: PortPoint[] = [...cableGeom.c1, ...cableGeom.c2, ...cableGeom.c3];
    const route = inFlight.direction === 'RTU_TO_RCC' ? fullForward : [...fullForward].reverse();
    return samplePolyline(route, inFlight.progress);
  }, [inFlight, cableGeom]);

  const portMap: Record<'RTU_ETH' | 'SW_P1' | 'SW_P5' | 'GW_ETH1' | 'GW_ETH2' | 'RCC_ETH', PortInspectionInfo> = {
    RTU_ETH: {
      title: `${IEC104_NET.rtuName} — ETH1`,
      connectedDevice: IEC104_NET.switchName,
      remotePort: 'Port 1',
      protocol: 'Station LAN (IEC 61850 / Modbus / IEC-104)',
      tcpPort: '2404',
      linkStatus: isTcpUp ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    SW_P1: {
      title: `${IEC104_NET.switchName} — Port 1`,
      connectedDevice: `${IEC104_NET.rtuName} (${IEC104_NET.rtuIp})`,
      remotePort: 'ETH1',
      protocol: 'Station LAN Ethernet',
      tcpPort: '2404',
      linkStatus: isTcpUp ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    SW_P5: {
      title: `${IEC104_NET.switchName} — Port 5`,
      connectedDevice: `${IEC104_NET.gatewayName} (${IEC104_NET.gatewayIp})`,
      remotePort: 'ETH1',
      protocol: 'Station LAN Ethernet',
      tcpPort: '2404',
      linkStatus: isTcpUp ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    GW_ETH1: {
      title: `${IEC104_NET.gatewayName} — ETH1 (Station LAN)`,
      connectedDevice: IEC104_NET.switchName,
      remotePort: 'Port 5',
      protocol: 'IEC 61850 MMS / Modbus TCP Southbound',
      tcpPort: '102 / 502',
      linkStatus: isTcpUp ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    GW_ETH2: {
      title: `${IEC104_NET.gatewayName} — ETH2 (Telecontrol WAN Uplink)`,
      connectedDevice: `${IEC104_NET.rccName} via Routed MPLS WAN (${IEC104_NET.rccIp})`,
      remotePort: 'RCC Ethernet Interface',
      protocol: 'IEC 60870-5-104 (Controlled Station)',
      tcpPort: '2404',
      linkStatus: isTcpUp ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated Routed MPLS WAN / Ethernet',
    },
    RCC_ETH: {
      title: `${IEC104_NET.rccName} — Ethernet Interface`,
      connectedDevice: `${IEC104_NET.gatewayName} via Routed MPLS WAN (${IEC104_NET.gatewayIp})`,
      remotePort: 'ETH2',
      protocol: 'IEC 60870-5-104 (Controlling Station)',
      tcpPort: '2404',
      linkStatus: isTcpUp ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated Routed MPLS WAN / Ethernet',
    },
  };

  const tabs: { id: Iec104LabTab; label: string }[] = [
    { id: 'TOPOLOGY_LIVE', label: 'Topology & Live Data' },
    { id: 'IOA_MAPPING', label: 'IOA Mapping' },
    { id: 'GI_SEQUENCE', label: 'General Interrogation (GI)' },
    { id: 'REMOTE_COMMANDS', label: 'Remote Commands' },
    { id: 'APCI_ANALYZER', label: 'APCI / ASDU Analyzer' },
    { id: 'FAULT_SIMULATION', label: 'Fault & Simulation' },
    { id: 'LOGS_DIAGNOSTICS', label: 'Logs & Diagnostics' },
  ];

  const faultList: { id: Iec104FaultMode; label: string; group: string }[] = [
    { id: 'NONE', label: 'Normal — TCP/2404 Connected & STARTDT Active', group: 'Healthy' },
    { id: 'TCP_2404_DOWN', label: 'Fault 1: TCP Port 2404 Socket Disconnected', group: 'Transport' },
    { id: 'STARTDT_FAIL', label: 'Fault 2: STARTDT Confirmation Timeout (T1)', group: 'U-Frame' },
    { id: 'GI_TIMEOUT', label: 'Fault 3: General Interrogation Timeout (COT=10)', group: 'GI Sequence' },
    { id: 'UNKNOWN_COA', label: 'Fault 4: Unknown Common Address (COT=46)', group: 'ASDU Error' },
    { id: 'UNKNOWN_IOA', label: 'Fault 5: Unknown IOA Exception (COT=47)', group: 'ASDU Error' },
    { id: 'NEG_CMD_CON', label: 'Fault 6: Negative Command Confirmation (P/N=1)', group: 'Command' },
    { id: 'SEQ_NUM_ERROR', label: 'Fault 7: Sequence Number N(S)/N(R) Error', group: 'APCI' },
    { id: 'T1_TIMEOUT', label: 'Fault 8: T1 APDU Ack Timeout (15 s)', group: 'Timer' },
    { id: 'T3_TIMEOUT', label: 'Fault 9: T3 Test Frame Timeout (20 s)', group: 'Timer' },
  ];

  if (!targetBay || !selectedEntry) {
    return (
      <div className="p-6 text-slate-300 bg-[#030B18] rounded-xl border border-[#1B4B72]">
        Loading IEC 60870-5-104 Lab V2 telemetry...
      </div>
    );
  }

  return (
    <div style={{ backgroundColor: '#030B18', color: '#E9F3FF' }} className="space-y-3 pb-6 text-xs select-none overflow-x-hidden">
      {/* 1. HEADER BAR */}
      <div
        style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }}
        className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 shadow-lg"
      >
        <div className="min-w-0">
          <h2 className="text-base sm:text-lg font-extrabold tracking-wide text-white">
            IEC 60870-5-104 Lab V2 — RTU, Gateway &amp; RCC Communication
          </h2>
          <p className="text-[11px] text-[#9BC0DF] mt-0.5">
            Station Gateway / RTU ↔ Remote Control Center (RCC / SLDC) · I-/S-/U-Frames · IOA Mapping · General Interrogation &amp; Remote Commands
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span
            style={{
              backgroundColor: isFullyHealthy ? '#06291E' : '#3B0D15',
              borderColor: isFullyHealthy ? '#22C55E' : '#EF4444',
              color: isFullyHealthy ? '#4ADE80' : '#FCA5A5',
            }}
            className="rounded-lg border px-2.5 py-1"
          >
            ● Link State: {isFullyHealthy ? 'STARTDT ACTIVE' : faultMode !== 'NONE' ? faultMode : 'STOPDT STANDBY'}
          </span>
          <span className="rounded-lg border border-[#A855F7] bg-[#241038] px-2.5 py-1 font-mono text-[#D8B4FE]">
            IEC-104 · TCP/2404 · COA {IEC104_NET.coa}
          </span>
          <span className="rounded-lg border border-[#1E5280] bg-[#082038] px-2.5 py-1 font-mono text-[#77E7FF]">
            N(S)={txSeqNs} · N(R)={rxSeqNr}
          </span>
          <span className="rounded-lg border border-[#0EA5E9] bg-[#061C31] px-2.5 py-1 font-mono text-[#BAE6FD]">
            Speed: {speed}×
          </span>
        </div>
      </div>

      {/* 2. NAVIGATION TABS & PLAYBACK CONTROLS */}
      <div
        style={{ backgroundColor: '#061526', borderColor: '#173E61' }}
        className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2"
      >
        <div className="flex flex-wrap items-center gap-1.5">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                style={{
                  backgroundColor: active ? '#00A8E8' : '#081D33',
                  borderColor: active ? '#38BDF8' : '#183F62',
                  color: active ? '#02101D' : '#C8E2F8',
                }}
                className="rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold transition hover:border-[#38BDF8]"
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            style={{
              backgroundColor: playing ? '#06291E' : '#2B1F08',
              borderColor: playing ? '#22C55E' : '#EAB308',
              color: playing ? '#4ADE80' : '#FDE047',
            }}
            className="flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-bold"
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Resume'}
          </button>

          <div className="flex items-center rounded-lg border border-[#184064] bg-[#04101E] p-0.5 font-mono text-[10.5px]">
            {([0.5, 1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                style={{
                  backgroundColor: speed === s ? '#00CFFF' : 'transparent',
                  color: speed === s ? '#02101D' : '#9BC0DF',
                }}
                className="rounded px-2 py-0.5 font-extrabold transition"
              >
                {s}×
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 rounded-lg border border-[#1D4D75] bg-[#081F36] px-2.5 py-1 text-[11px] font-bold text-[#BAE6FD] hover:border-[#38BDF8]"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* TAB 1: TOPOLOGY & LIVE DATA (EXACT REFERENCE IMAGE LAYOUT) */}
      {activeTab === 'TOPOLOGY_LIVE' && (
        <div className="space-y-3">
          {/* TOP 3-PANEL ROW: Station RTU | Central 4-Device Topology | RCC / SLDC */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
            {/* LEFT: Station Gateway / RTU (Controlled) — 3 cols */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="xl:col-span-3 rounded-xl border p-3 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs truncate">
                  <Server className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span className="truncate">Station Gateway / RTU (Controlled)</span>
                </div>
                <span className="px-2 py-0.5 rounded bg-[#241038] border border-[#A855F7] text-[#D8B4FE] font-mono text-[9.5px] font-bold shrink-0">
                  COA = {IEC104_NET.coa}
                </span>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 flex flex-col items-center justify-center rounded-lg border border-[#173C5E] bg-[#040E1A] p-2">
                  <img
                    src={HW_ASSETS.RTU}
                    onError={(e) => {
                      if (e.currentTarget.src !== HW_ASSETS.RTU_FALLBACK) e.currentTarget.src = HW_ASSETS.RTU_FALLBACK;
                    }}
                    alt="Schneider MiCOM C264 Station RTU"
                    className="h-[112px] w-auto object-contain"
                  />
                  <span className="text-[9px] font-mono text-[#BAE6FD] mt-1 text-center leading-tight">
                    Moxa MGate 5216 / MiCOM C264
                  </span>
                </div>
                <div className="col-span-7 space-y-1 text-[10.5px]">
                  <div style={{ color: isFullyHealthy ? '#4ADE80' : '#F87171' }} className="font-extrabold text-[11px]">
                    ● {isFullyHealthy ? 'CONTROLLED STATION ONLINE' : 'TELECONTROL FAULT'}
                  </div>
                  {[
                    ['Role', 'Controlled (Slave)', '#FFFFFF'],
                    ['Gateway IP', IEC104_NET.rtuIp, '#38BDF8'],
                    ['Common Addr', `${IEC104_NET.coa} (${IEC104_NET.coaHex})`, '#D8B4FE'],
                    ['Southbound', 'IEC 61850 / Modbus', '#BAE6FD'],
                    ['Northbound', 'IEC-104 (TCP/2404)', '#4ADE80'],
                    ['Mapped IOAs', `${ioaEntries.length} Active IOAs`, '#FFFFFF'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between gap-1 border-b border-[#122E49] pb-0.5 last:border-0">
                      <span className="text-[#8BB3D4]">{k}</span>
                      <span style={{ color: c }} className="font-mono font-bold text-right truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: System Topology — IEC 60870-5-104 Communication (6 cols) */}
            <div style={{ backgroundColor: '#051324', borderColor: '#1B4B72' }} className="xl:col-span-6 rounded-xl border p-3 flex flex-col justify-between min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Layers className="w-4 h-4 text-[#00CFFF]" />
                  <span>System Topology — IEC 60870-5-104 Communication</span>
                </div>
                <span className="rounded border border-[#0EA5E9] bg-[#061C31] px-2.5 py-0.5 font-mono text-[10px] font-bold text-[#7DD3FC]">
                  I / S / U - Frames (IEC 60870-5-104)
                </span>
              </div>

              <div
                ref={topoContainerRef}
                className="relative w-full rounded-lg border border-[#14395C] bg-[#030D1A] px-2.5 pt-3 pb-12 overflow-hidden"
              >
                <div className="relative z-10 grid grid-cols-4 gap-2 items-end">
                  {/* Device 1: RTU / Station Gateway */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative h-[92px] flex items-end justify-center">
                      <img
                        src={HW_ASSETS.RTU}
                        onError={(e) => {
                          if (e.currentTarget.src !== HW_ASSETS.RTU_FALLBACK) e.currentTarget.src = HW_ASSETS.RTU_FALLBACK;
                        }}
                        onLoad={measureTopology}
                        alt="RTU Station Gateway"
                        className="h-[88px] w-auto object-contain"
                      />
                      <button
                        ref={rtuEthRef}
                        type="button"
                        onClick={() => setInspectedPort(portMap.RTU_ETH)}
                        title="RTU ETH1"
                        className="ml-0.5 mb-1 flex flex-col items-center rounded border border-[#38BDF8] bg-[#04182B] px-1 py-0.5"
                      >
                        <span className="w-2.5 h-2 rounded-[1.5px] border border-[#7DD3FC] bg-[#020B16] block" />
                        <span className="text-[7px] font-mono font-bold text-[#7DD3FC] leading-none mt-0.5">ETH1</span>
                      </button>
                    </div>
                    <div className="mt-7 text-center leading-tight">
                      <div className="text-[10px] font-extrabold text-white truncate">RTU / Station GW</div>
                      <div className="text-[8.5px] font-mono text-[#38BDF8]">{IEC104_NET.rtuIp}</div>
                      <div className="text-[8px] font-mono text-[#D8B4FE]">COA: {IEC104_NET.coa}</div>
                    </div>
                  </div>

                  {/* Device 2: Hirschmann RSP35 */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative h-[92px] flex items-end justify-center">
                      <div className="relative inline-flex items-center">
                        <img
                          src={HW_ASSETS.SWITCH}
                          onLoad={measureTopology}
                          alt="Hirschmann RSP35"
                          className="h-[72px] w-auto object-contain"
                        />
                        <button
                          ref={swP1Ref}
                          type="button"
                          onClick={() => setInspectedPort(portMap.SW_P1)}
                          style={{ left: '31%', bottom: '10%' }}
                          className="absolute flex flex-col items-center"
                        >
                          <span className="w-3 h-2.5 rounded-[1.5px] border border-[#38BDF8] bg-[#04182B] block" />
                          <span className="text-[7px] font-mono font-bold text-[#7DD3FC] bg-[#020B16]/90 px-0.5 rounded">P1</span>
                        </button>
                        <button
                          ref={swP5Ref}
                          type="button"
                          onClick={() => setInspectedPort(portMap.SW_P5)}
                          style={{ left: '64%', bottom: '10%' }}
                          className="absolute flex flex-col items-center"
                        >
                          <span className="w-3 h-2.5 rounded-[1.5px] border border-[#38BDF8] bg-[#04182B] block" />
                          <span className="text-[7px] font-mono font-bold text-[#7DD3FC] bg-[#020B16]/90 px-0.5 rounded">P5</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-7 text-center leading-tight">
                      <div className="text-[10px] font-extrabold text-white truncate">{IEC104_NET.switchName}</div>
                      <div className="text-[8.5px] font-mono text-[#7DD3FC]">Station LAN</div>
                      <div className="text-[8px] font-mono text-[#94A3B8]">{IEC104_NET.switchIp}</div>
                    </div>
                  </div>

                  {/* Device 3: IEC-104 Gateway */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative h-[92px] flex items-end justify-center">
                      <div className="relative inline-flex items-center">
                        <img
                          src={HW_ASSETS.GATEWAY}
                          onLoad={measureTopology}
                          alt="IEC-104 Gateway"
                          className="h-[86px] w-auto object-contain"
                        />
                        <button
                          ref={gwEth1Ref}
                          type="button"
                          onClick={() => setInspectedPort(portMap.GW_ETH1)}
                          style={{ left: '20%', bottom: '16%' }}
                          className="absolute flex flex-col items-center"
                        >
                          <span className="w-3 h-2.5 rounded-[1.5px] border border-[#38BDF8] bg-[#04182B] block" />
                          <span className="text-[7px] font-mono font-bold text-[#7DD3FC] bg-[#020B16]/90 px-0.5 rounded">E1</span>
                        </button>
                        <button
                          ref={gwEth2Ref}
                          type="button"
                          onClick={() => setInspectedPort(portMap.GW_ETH2)}
                          style={{ left: '52%', bottom: '16%' }}
                          className="absolute flex flex-col items-center"
                        >
                          <span
                            className="w-3 h-2.5 rounded-[1.5px] border bg-[#021A10] block"
                            style={{ borderColor: isTcpUp ? '#22C55E' : '#EF4444' }}
                          />
                          <span className="text-[7px] font-mono font-bold text-[#86EFAC] bg-[#020B16]/90 px-0.5 rounded">E2</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-7 text-center leading-tight">
                      <div className="text-[10px] font-extrabold text-white truncate">{IEC104_NET.gatewayName}</div>
                      <div className="text-[8.5px] font-mono text-[#4ADE80]">TCP/2404 Server</div>
                      <div className="text-[8px] font-mono text-[#94A3B8]">WAN Uplink</div>
                    </div>
                  </div>

                  {/* Device 4: RCC / SLDC (Master) */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative h-[92px] flex items-end justify-center">
                      <div className="relative inline-flex items-center">
                        <img
                          src={HW_ASSETS.RCC}
                          onLoad={measureTopology}
                          alt="RCC SLDC Workstation"
                          className="h-[88px] w-auto object-contain"
                        />
                        <button
                          ref={rccEthRef}
                          type="button"
                          onClick={() => setInspectedPort(portMap.RCC_ETH)}
                          style={{ left: '10%', bottom: '8%' }}
                          className="absolute flex flex-col items-center"
                        >
                          <span
                            className="w-3 h-2.5 rounded-[1.5px] border bg-[#021A10] block"
                            style={{ borderColor: isTcpUp ? '#4ADE80' : '#EF4444' }}
                          />
                          <span className="text-[7px] font-mono font-bold text-[#86EFAC] bg-[#020B16]/90 px-0.5 rounded">ETH</span>
                        </button>
                      </div>
                    </div>
                    <div className="mt-7 text-center leading-tight">
                      <div className="text-[10px] font-extrabold text-white truncate">{IEC104_NET.rccName}</div>
                      <div className="text-[8.5px] font-mono text-[#86EFAC]">{IEC104_NET.rccIp}</div>
                      <div className="text-[8px] font-mono text-[#94A3B8]">Controlling Master</div>
                    </div>
                  </div>
                </div>

                {/* RESIZEOBSERVER SVG CABLE & BIDIRECTIONAL I/S/U FRAME OVERLAY */}
                {cableGeom && (
                  <svg
                    width={cableGeom.width}
                    height={cableGeom.height}
                    viewBox={`0 0 ${cableGeom.width} ${cableGeom.height}`}
                    className="absolute inset-0 z-20 pointer-events-none"
                  >
                    <path
                      d={buildOrthogonalPath(cableGeom.c1)}
                      fill="none"
                      stroke={isTcpUp ? '#38BDF8' : '#EF4444'}
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                      strokeDasharray={isTcpUp ? undefined : '5 4'}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setInspectedPort(portMap.SW_P1)}
                    />
                    <path
                      d={buildOrthogonalPath(cableGeom.c2)}
                      fill="none"
                      stroke={isTcpUp ? '#38BDF8' : '#EF4444'}
                      strokeWidth="2.8"
                      strokeLinejoin="round"
                      strokeDasharray={isTcpUp ? undefined : '5 4'}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setInspectedPort(portMap.SW_P5)}
                    />
                    <path
                      d={buildOrthogonalPath(cableGeom.c3)}
                      fill="none"
                      stroke={isTcpUp ? '#22C55E' : '#EF4444'}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeDasharray={isTcpUp ? undefined : '5 4'}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setInspectedPort(portMap.GW_ETH2)}
                    />

                    {/* Routed MPLS WAN Pill */}
                    <g className="pointer-events-auto cursor-pointer" onClick={() => setInspectedPort(portMap.GW_ETH2)}>
                      <rect
                        x={cableGeom.wanMid.x - 42}
                        y={cableGeom.wanMid.y - 9}
                        width="84"
                        height="18"
                        rx="9"
                        fill="#05261A"
                        stroke={isTcpUp ? '#22C55E' : '#EF4444'}
                        strokeWidth="1.1"
                      />
                      <text
                        x={cableGeom.wanMid.x}
                        y={cableGeom.wanMid.y + 3}
                        textAnchor="middle"
                        fill={isTcpUp ? '#86EFAC' : '#FCA5A5'}
                        fontSize="7.5"
                        fontFamily="monospace"
                        fontWeight="800"
                      >
                        WAN · 2404
                      </text>
                    </g>

                    {/* Bidirectional Animated I/S/U Frame Packet */}
                    {inFlight && pktPos && (
                      <g>
                        <g transform={`translate(${pktPos.x.toFixed(1)}, ${pktPos.y.toFixed(1)}) rotate(${pktPos.angleDeg.toFixed(1)})`}>
                          <circle
                            r="6"
                            fill={
                              inFlight.format === 'I-Frame'
                                ? '#00E5FF'
                                : inFlight.format === 'S-Frame'
                                ? '#22C55E'
                                : '#FACC15'
                            }
                            stroke="#FFFFFF"
                            strokeWidth="1.2"
                          />
                          <polygon points="3.2,0 -2.2,-2.6 -2.2,2.6" fill="#02101D" />
                        </g>
                        {(() => {
                          const bw = 188;
                          const bx = Math.max(6, Math.min(cableGeom.width - bw - 6, pktPos.x - bw / 2));
                          const by = Math.max(4, pktPos.y - 38);
                          const c =
                            inFlight.format === 'I-Frame'
                              ? '#38BDF8'
                              : inFlight.format === 'S-Frame'
                              ? '#22C55E'
                              : '#FACC15';
                          return (
                            <g>
                              <rect x={bx} y={by} width={bw} height="26" rx="4" fill="#04192C" stroke={c} strokeWidth="1.1" />
                              <text x={bx + bw / 2} y={by + 10.5} textAnchor="middle" fill={c} fontSize="7.4" fontFamily="monospace" fontWeight="800">
                                {inFlight.label1}
                              </text>
                              <text x={bx + bw / 2} y={by + 21} textAnchor="middle" fill="#FFFFFF" fontSize="7" fontFamily="monospace">
                                {inFlight.label2}
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    )}
                  </svg>
                )}

                {/* Legend Footer inside Topology */}
                <div className="absolute bottom-1.5 left-2.5 right-2.5 z-10 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-[#9BC0DF] bg-[#041526]/95 border border-[#15395A] rounded px-2.5 py-1">
                  <span>Legend: <b className="text-[#38BDF8]">━ Ethernet</b> · <b className="text-[#00E5FF]">▶ I-Frame (Data)</b> · <b className="text-[#4ADE80]">▶ S-Frame (Ack)</b> · <b className="text-[#FACC15]">▶ U-Frame (STARTDT/TESTFR)</b></span>
                  <span className="text-[#7DD3FC]">Click port/cable to inspect</span>
                </div>
              </div>

              {inspectedPort && (
                <div className="mt-2 rounded-lg border border-[#38BDF8] bg-[#061C31] px-3 py-2 text-[10.5px]">
                  <div className="flex justify-between items-center border-b border-[#164463] pb-1 mb-1">
                    <b className="text-white">{inspectedPort.title}</b>
                    <button type="button" onClick={() => setInspectedPort(null)} className="text-[#7DD3FC] font-bold">Close</button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-0.5 font-mono text-[10px]">
                    <div><span className="text-[#8BB3D4]">Remote:</span> <b className="text-white">{inspectedPort.connectedDevice} ({inspectedPort.remotePort})</b></div>
                    <div><span className="text-[#8BB3D4]">Protocol:</span> <b className="text-[#7DD3FC]">{inspectedPort.protocol}</b></div>
                    <div><span className="text-[#8BB3D4]">Link:</span> <b style={{ color: inspectedPort.linkStatus === 'UP' ? '#4ADE80' : '#F87171' }}>{inspectedPort.linkStatus}</b> ({inspectedPort.speedDuplex})</div>
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT: Remote Control Center (RCC / SLDC) — 3 cols */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="xl:col-span-3 rounded-xl border p-3 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs truncate">
                  <Monitor className="w-4 h-4 text-[#4ADE80] shrink-0" />
                  <span className="truncate">Remote Control Center (RCC / SLDC)</span>
                </div>
              </div>

              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 flex flex-col items-center justify-center rounded-lg border border-[#173C5E] bg-[#040E1A] p-2">
                  <img
                    src={HW_ASSETS.RCC}
                    alt="SLDC RCC EMS Master"
                    className="h-[112px] w-auto object-contain"
                  />
                  <span className="text-[9px] font-mono text-[#86EFAC] mt-1 text-center leading-tight">
                    SLDC / RCC EMS Master
                  </span>
                </div>
                <div className="col-span-7 space-y-1 text-[10.5px]">
                  <div style={{ color: isFullyHealthy ? '#4ADE80' : '#F87171' }} className="font-extrabold text-[11px]">
                    ● {isFullyHealthy ? 'RCC MASTER CONNECTED' : 'RCC LINK DEGRADED'}
                  </div>
                  {[
                    ['Role', 'Controlling (Master)', '#FFFFFF'],
                    ['RCC IP', IEC104_NET.rccIp, '#38BDF8'],
                    ['T1 / T2 / T3', `${IEC104_NET.t1Sec}s / ${IEC104_NET.t2Sec}s / ${IEC104_NET.t3Sec}s`, '#FFFFFF'],
                    ['k / w', `${IEC104_NET.kParam} / ${IEC104_NET.wParam}`, '#BAE6FD'],
                    ['GI Cycles', `#${giCount} ${giStatus.split(' ')[0]}`, '#4ADE80'],
                    ['Selected IOA', `${selectedEntry.ioa} (${selectedEntry.valueText.slice(0, 10)})`, '#FFFFFF'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between gap-1 border-b border-[#122E49] pb-0.5 last:border-0">
                      <span className="text-[#8BB3D4]">{k}</span>
                      <span style={{ color: c }} className="font-mono font-bold text-right truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM 3-COLUMN ROW: Left Controls | Center IOA Table + Frame Stream | Right Live Diagnostics */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* LEFT CONTROLS (3 cols) */}
            <div className="xl:col-span-3 space-y-3 min-w-0">
              {/* 1. U-Frame Link Layer & GI */}
              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
                <h3 className="text-xs font-extrabold text-white border-b border-[#163B5C] pb-1.5">
                  1. U-Frame Link Layer &amp; General Interrogation (GI)
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  <button type="button" onClick={() => handleSendUFrame('STARTDT')} className="py-1.5 rounded-lg bg-[#06291E] border border-[#22C55E] text-[#4ADE80] font-extrabold text-[10.5px]">
                    STARTDT ACT
                  </button>
                  <button type="button" onClick={() => handleSendUFrame('STOPDT')} className="py-1.5 rounded-lg bg-[#2B1608] border border-[#F97316] text-[#FDBA74] font-extrabold text-[10.5px]">
                    STOPDT ACT
                  </button>
                  <button type="button" onClick={() => handleSendUFrame('TESTFR')} className="py-1.5 rounded-lg bg-[#082038] border border-[#00CFFF] text-[#77E7FF] font-extrabold text-[10.5px]">
                    TESTFR ACT
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleTriggerGi}
                  style={{ backgroundColor: '#9333EA', color: '#FFFFFF' }}
                  className="w-full py-2 rounded-lg font-extrabold text-[11px] flex items-center justify-center gap-1.5 shadow"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Send Station General Interrogation (C_IC_NA_1, QOI=20)
                </button>
              </div>

              {/* 2. RCC Remote Command Execution */}
              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5">
                  <h3 className="text-xs font-extrabold text-white">2. RCC Remote Command (C_DC_NA_1)</h3>
                  <select
                    value={controlMode}
                    onChange={(e) => setControlMode(e.target.value as ControlMode)}
                    className="rounded border border-[#1E5280] bg-[#04101E] px-1.5 py-0.5 font-mono text-[10px] text-[#7DD3FC]"
                  >
                    <option value="SBO">SBO</option>
                    <option value="DIRECT">Direct</option>
                  </select>
                </div>
                <select
                  value={targetBay.id}
                  onChange={(e) => setCommandTargetBayId(e.target.value)}
                  style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                  className="w-full rounded-lg border px-2 py-1.5 text-[11px] font-bold"
                >
                  {bays.slice(0, 12).map((b, idx) => (
                    <option key={b.id} value={b.id}>
                      IOA {6001 + idx} — {b.bayCode} ({b.breakerState})
                    </option>
                  ))}
                </select>
                <div className="flex items-center justify-between text-[10.5px]">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={cmdAction === 'TRIP'} onChange={() => setCmdAction('TRIP')} />
                    <span className="text-[#FCA5A5] font-bold">Trip (DCO=1 OFF)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" checked={cmdAction === 'CLOSE'} onChange={() => setCmdAction('CLOSE')} />
                    <span className="text-[#4ADE80] font-bold">Close (DCO=2 ON)</span>
                  </label>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoteCommand(cmdAction)}
                  className="w-full py-1.5 rounded-lg bg-[#06291E] border border-[#22C55E] text-[#4ADE80] font-extrabold text-[11px] flex items-center justify-center gap-1.5 hover:brightness-110"
                >
                  <Send className="w-3 h-3" /> Send Remote Command ({controlMode})
                </button>
                <div className="rounded bg-[#04101E] border border-[#15395A] px-2 py-1 font-mono text-[9.5px] text-[#9BC0DF]">
                  {commandTraceStep}
                </div>
              </div>

              {/* 3. Fault Simulation Quick Selector */}
              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-1.5">
                <h3 className="text-xs font-extrabold text-white border-b border-[#163B5C] pb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#FFB547]" />
                  <span>3. IEC-104 Fault Simulation</span>
                </h3>
                <div className="space-y-1">
                  {faultList.slice(0, 5).map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setFaultMode(f.id)}
                      style={{
                        backgroundColor: faultMode === f.id ? (f.id === 'NONE' ? '#06291E' : '#3B0D15') : '#04101E',
                        borderColor: faultMode === f.id ? (f.id === 'NONE' ? '#22C55E' : '#EF4444') : '#163856',
                      }}
                      className="w-full text-left px-2 py-1 rounded border text-[10px] font-bold text-white"
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: 36-IOA MAPPING TABLE + LIVE APCI/ASDU FRAME STREAM (6 cols) */}
            <div className="xl:col-span-6 space-y-3 min-w-0">
              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-1.5">
                  <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                    <Database className="w-4 h-4 text-[#D8B4FE]" />
                    <span>Gateway IEC 61850 / Modbus → IEC 60870-5-104 IOA Mapping Table (COA = 132)</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#7DD3FC]">Total: {ioaEntries.length} IOAs (Active: {ioaEntries.length})</span>
                </div>
                <div className="overflow-x-auto max-h-[210px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[10.5px]">
                    <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 text-[#9BC0DF] font-bold">
                      <tr>
                        <th className="py-1.5 px-2">IOA</th>
                        <th className="py-1.5 px-2">Type ID</th>
                        <th className="py-1.5 px-2">COT</th>
                        <th className="py-1.5 px-2">Signal Description</th>
                        <th className="py-1.5 px-2">Source (IEC 61850 / Modbus)</th>
                        <th className="py-1.5 px-2">Live Value</th>
                        <th className="py-1.5 px-2">Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#132E4A] font-mono">
                      {ioaEntries.map((row) => {
                        const sel = row.ioa === selectedEntry.ioa;
                        return (
                          <tr
                            key={row.ioa}
                            onClick={() => setSelectedIoa(row.ioa)}
                            style={{ backgroundColor: sel ? 'rgba(168, 85, 247, 0.18)' : '#04101E' }}
                            className="cursor-pointer hover:bg-[#0B2540]"
                          >
                            <td className="py-1.5 px-2 font-extrabold text-[#D8B4FE]">{row.ioa}</td>
                            <td className="py-1.5 px-2 text-[#77E7FF]">{row.typeId}</td>
                            <td className="py-1.5 px-2 text-slate-300 text-[9.5px]">{row.cot.split('/')[0]}</td>
                            <td className="py-1.5 px-2 font-sans font-bold text-white">{row.signalDescription}</td>
                            <td className="py-1.5 px-2 text-[9.5px] text-[#38BDF8]">{row.sourceReference}</td>
                            <td className="py-1.5 px-2 font-bold text-[#4ADE80]">{row.valueText}</td>
                            <td className="py-1.5 px-2 text-[9.5px]" style={{ color: isFullyHealthy ? '#4ADE80' : '#F87171' }}>
                              {isFullyHealthy ? '✓ GOOD' : 'INVALID'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5">
                  <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                    <Terminal className="w-4 h-4 text-[#00CFFF]" />
                    <span>Live IEC-104 APCI / ASDU Frame Stream (I-Frames, S-Frames, U-Frames)</span>
                  </div>
                  <span className="font-mono text-[10px] text-[#77E7FF]">Start Byte: 0x68 · Port: 2404</span>
                </div>
                <div className="overflow-x-auto max-h-[195px] overflow-y-auto">
                  <table className="w-full text-left border-collapse text-[10.5px] font-mono">
                    <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 text-[#9BC0DF]">
                      <tr>
                        <th className="py-1 px-2">Time</th>
                        <th className="py-1 px-2">Frame</th>
                        <th className="py-1 px-2">Dir</th>
                        <th className="py-1 px-2">APCI N(S)/N(R)</th>
                        <th className="py-1 px-2">ASDU / Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#132E4A]">
                      {frameLog.slice(0, 10).map((f) => (
                        <tr
                          key={f.id}
                          onClick={() => {
                            setSelectedFrameId(f.id);
                            setActiveTab('APCI_ANALYZER');
                          }}
                          className="bg-[#04101E] hover:bg-[#0B2540] cursor-pointer"
                        >
                          <td className="py-1 px-2 text-slate-400 whitespace-nowrap">{f.time}</td>
                          <td className="py-1 px-2 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                                f.format === 'I-Frame'
                                  ? 'bg-[#082038] text-[#77E7FF]'
                                  : f.format === 'U-Frame'
                                  ? 'bg-[#241038] text-[#D8B4FE]'
                                  : 'bg-[#06291E] text-[#4ADE80]'
                              }`}
                            >
                              {f.format}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-[#FACC15] whitespace-nowrap">{f.dir}</td>
                          <td className="py-1 px-2 text-[#BAE6FD] whitespace-nowrap">{f.apciText}</td>
                          <td className="py-1 px-2 text-white truncate max-w-[260px]" title={f.summary}>{f.summary}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT: LIVE DIAGNOSTICS (3 cols) */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="xl:col-span-3 rounded-xl border p-3 space-y-2 min-w-0">
              <div className="flex items-center gap-1.5 font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5">
                <Activity className="w-4 h-4 text-[#4ADE80]" />
                <span>Live Diagnostics</span>
              </div>
              <div className="space-y-1.5 text-[10.5px]">
                {[
                  ['IEC-104 Link Status', isFullyHealthy ? 'STARTDT ACTIVE' : faultMode !== 'NONE' ? faultMode : 'STOPDT STANDBY', isFullyHealthy ? '#4ADE80' : '#F87171'],
                  ['TCP Connection', isTcpUp ? `Connected (${IEC104_NET.rccIp}:2404)` : 'Disconnected (2404)', isTcpUp ? '#4ADE80' : '#F87171'],
                  ['Controlling Station', `RCC Master (${IEC104_NET.rccIp})`, '#7DD3FC'],
                  ['Controlled Station', `RTU/GW (${IEC104_NET.rtuIp})`, '#BAE6FD'],
                  ['Common Address', `${IEC104_NET.coa} (${IEC104_NET.coaHex})`, '#D8B4FE'],
                  ['Tx / Rx Frames', `${txFramesTotal} / ${rxFramesTotal}`, '#FFFFFF'],
                  ['N(S) / N(R)', `${txSeqNs} / ${rxSeqNr}`, '#77E7FF'],
                  ['GI Status', giStatus, giStatus.startsWith('Completed') ? '#4ADE80' : '#FBBF24'],
                  ['Last Command', lastCommandText, '#FDBA74'],
                  ['T1 / T2 / T3 Timers', faultMode === 'T1_TIMEOUT' ? 'T1 EXPIRED' : faultMode === 'T3_TIMEOUT' ? 'T3 EXPIRED' : '15s / 10s / 20s OK', faultMode === 'T1_TIMEOUT' || faultMode === 'T3_TIMEOUT' ? '#F87171' : '#4ADE80'],
                  ['Comm. Quality', isFullyHealthy ? 'GOOD (No Errors)' : 'DEGRADED / FAULT', isFullyHealthy ? '#4ADE80' : '#F87171'],
                  ['Last Update', lastUpdateTs, '#9BC0DF'],
                ].map(([k, v, c]) => (
                  <div key={k} className="flex justify-between gap-2 border-b border-[#122E49] pb-1 last:border-0">
                    <span className="text-[#9BC0DF] shrink-0">{k}</span>
                    <span style={{ color: c }} className="font-mono font-bold text-right break-all">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: FULL 36-IOA MAPPING & INSPECTOR */}
      {activeTab === 'IOA_MAPPING' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="xl:col-span-8 rounded-xl border p-4 space-y-2">
            <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
              All {ioaEntries.length} Configured IEC 60870-5-104 IOAs (COA = {IEC104_NET.coa})
            </h3>
            <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
              <table className="w-full text-left border-collapse text-[11px] font-mono">
                <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 text-[#9BC0DF]">
                  <tr>
                    <th className="py-2 px-2">IOA</th>
                    <th className="py-2 px-2">Type ID</th>
                    <th className="py-2 px-2">COT</th>
                    <th className="py-2 px-2">Signal Description</th>
                    <th className="py-2 px-2">Source</th>
                    <th className="py-2 px-2">Value</th>
                    <th className="py-2 px-2">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#132E4A]">
                  {ioaEntries.map((r) => (
                    <tr
                      key={r.ioa}
                      onClick={() => setSelectedIoa(r.ioa)}
                      style={{ backgroundColor: r.ioa === selectedEntry.ioa ? 'rgba(168,85,247,0.2)' : '#04101E' }}
                      className="cursor-pointer hover:bg-[#0B2540]"
                    >
                      <td className="py-1.5 px-2 font-bold text-[#D8B4FE]">{r.ioa}</td>
                      <td className="py-1.5 px-2 text-[#77E7FF]">{r.typeId}</td>
                      <td className="py-1.5 px-2 text-slate-300">{r.cot}</td>
                      <td className="py-1.5 px-2 font-sans font-bold text-white">{r.signalDescription}</td>
                      <td className="py-1.5 px-2 text-[#38BDF8]">{r.sourceReference}</td>
                      <td className="py-1.5 px-2 font-bold text-[#4ADE80]">{r.valueText}</td>
                      <td className="py-1.5 px-2 text-[#4ADE80]">Mapped</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="xl:col-span-4 rounded-xl border p-4 space-y-2">
            <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
              Selected IOA Configuration — IOA {selectedEntry.ioa}
            </h3>
            {[
              ['Information Object Address', String(selectedEntry.ioa)],
              ['Common Address (COA)', `${selectedEntry.commonAddress} (${IEC104_NET.coaHex})`],
              ['ASDU Type ID', selectedEntry.typeId],
              ['Type Description', selectedEntry.typeDescription],
              ['Cause of Transmission', selectedEntry.cot],
              ['Bay Code', selectedEntry.bayCode],
              ['Signal Description', selectedEntry.signalDescription],
              ['Southbound Protocol', selectedEntry.sourceProtocol],
              ['Source Reference', selectedEntry.sourceReference],
              ['Live Value', selectedEntry.valueText],
              ['Quality Descriptor', isFullyHealthy ? selectedEntry.quality : 'INVALID (IV=1)'],
              ['Timestamp', selectedEntry.timestamp],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-2 border-b border-[#122E49] pb-1 text-[11px]">
                <span className="text-[#9BC0DF]">{k}</span>
                <span className="font-mono font-bold text-white text-right break-all">{v}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: GENERAL INTERROGATION (GI) SEQUENCE */}
      {activeTab === 'GI_SEQUENCE' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white">Station General Interrogation (C_IC_NA_1, TypeID=100, QOI=20)</h3>
            <button type="button" onClick={handleTriggerGi} className="rounded-lg bg-[#9333EA] px-3.5 py-1.5 font-extrabold text-white text-xs">
              Execute 4-Step GI Sequence
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              [1, 'Step 1: Activation', 'RCC → RTU: C_IC_NA_1 (COT=6, QOI=20)'],
              [2, 'Step 2: ActCon', 'RTU → RCC: C_IC_NA_1 (COT=7 Activation Confirmation)'],
              [3, 'Step 3: Interrogated Data', `RTU → RCC: ${ioaEntries.length} IOAs transmitted with COT=20`],
              [4, 'Step 4: ActTerm', 'RTU → RCC: C_IC_NA_1 (COT=10 Activation Termination)'],
            ].map(([num, title, desc]) => {
              const done = giStep >= (num as number);
              return (
                <div
                  key={String(num)}
                  style={{
                    backgroundColor: done ? '#06291E' : '#04101E',
                    borderColor: done ? '#22C55E' : '#163856',
                  }}
                  className="rounded-lg border p-3 space-y-1"
                >
                  <div className="font-extrabold text-white text-xs">{title}</div>
                  <div className="font-mono text-[10.5px] text-[#9BC0DF]">{desc}</div>
                  <div className="font-mono text-[10px] font-bold" style={{ color: done ? '#4ADE80' : '#94A3B8' }}>
                    {done ? '✓ COMPLETED' : 'PENDING'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 4: REMOTE COMMANDS */}
      {activeTab === 'REMOTE_COMMANDS' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
            Remote Command Execution (C_DC_NA_1, TypeID=46) — Control vs Breaker Feedback Separation
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="block text-[11px] text-[#9BC0DF]">Target Bay Command IOA (6001–6012)</label>
              <select
                value={targetBay.id}
                onChange={(e) => setCommandTargetBayId(e.target.value)}
                className="w-full rounded-lg border border-[#1E5280] bg-[#04101E] px-3 py-2 text-xs font-bold text-white"
              >
                {bays.slice(0, 12).map((b, idx) => (
                  <option key={b.id} value={b.id}>
                    IOA {6001 + idx} — {b.bayCode} ({b.name}) · Breaker: {b.breakerState}
                  </option>
                ))}
              </select>
              <div className="flex gap-3 items-center text-xs">
                <span className="text-[#9BC0DF]">Control Mode:</span>
                {(['SBO', 'DIRECT'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setControlMode(m)}
                    className={`px-3 py-1 rounded border font-mono font-bold ${controlMode === m ? 'bg-[#00CFFF] text-[#02101D] border-[#38BDF8]' : 'bg-[#04101E] text-[#9BC0DF] border-[#1E5280]'}`}
                  >
                    {m === 'SBO' ? 'Select-Before-Operate' : 'Direct Execute'}
                  </button>
                ))}
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={interlockOk} onChange={(e) => setInterlockOk(e.target.checked)} />
                <span className="text-[#BAE6FD]">Bay Interlocking Permissive Healthy (CILO1.EnaOpn / EnaCls = TRUE)</span>
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => handleRemoteCommand('TRIP')} className="py-2 rounded-lg bg-[#3B0D15] border border-[#EF4444] text-[#FCA5A5] font-extrabold">
                  Send Trip (DCO=1 OFF)
                </button>
                <button type="button" onClick={() => handleRemoteCommand('CLOSE')} className="py-2 rounded-lg bg-[#06291E] border border-[#22C55E] text-[#4ADE80] font-extrabold">
                  Send Close (DCO=2 ON)
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-[#164463] bg-[#04101E] p-3.5 space-y-2 font-mono text-[11px]">
              <div className="font-extrabold text-[#7DD3FC]">End-to-End Command Trace</div>
              <div className="text-slate-300">RCC → Gateway/RTU → IEC 61850 CSWI1.Pos.Oper → Bay IED → XCBR1 Breaker Feedback</div>
              <div className="p-2 rounded bg-[#020913] border border-[#163B5C] text-[#4ADE80]">{commandTraceStep}</div>
              <div className="text-[10.5px] text-[#9BC0DF]">
                Current Breaker State ({targetBay.bayCode}): <b className="text-white">{targetBay.breakerState}</b>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: WIRESHARK-STYLE APCI / ASDU PACKET ANALYZER */}
      {activeTab === 'APCI_ANALYZER' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-[#00CFFF]" />
            <span>Wireshark-Style IEC 60870-5-104 APCI / ASDU Packet Analyzer</span>
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="rounded-lg bg-[#020913] border border-[#193E63] p-3 space-y-1.5">
              <div className="text-[#FDBA74] font-bold">▾ APCI (Application Protocol Control Information)</div>
              <div className="pl-3 text-slate-200">Start Byte: 0x68 · Frame Format: {selectedFrame.format}</div>
              <div className="pl-3 text-slate-200">Direction: {selectedFrame.dir} · APCI Control: {selectedFrame.apciText}</div>
              <div className="pl-3 text-slate-200">N(S): {selectedFrame.ns ?? 'N/A'} · N(R): {selectedFrame.nr ?? 'N/A'}</div>
              <div className="text-[#4ADE80] font-bold mt-2">▾ ASDU (Application Service Data Unit)</div>
              <div className="pl-3 text-slate-200">
                {selectedFrame.format === 'I-Frame'
                  ? `Type ID: ${selectedFrame.typeId ?? 31} · VSQ: ${selectedFrame.vsq ?? '0x01'} · COT: ${selectedFrame.cot ?? 3} · OA: ${IEC104_NET.originatorAddr} · COA: ${selectedFrame.coa ?? 132} · IOA: ${selectedFrame.ioa ?? 1001}`
                  : 'No ASDU payload (Supervisory / Unnumbered control frame only)'}
              </div>
              <div className="pl-3 text-[#7DD3FC]">Details: {selectedFrame.summary}</div>
            </div>
            <div className="rounded-lg bg-[#020913] border border-[#193E63] p-3 space-y-2">
              <div className="text-[#D8B4FE] font-bold">Raw Hexadecimal Frame Bytes (TCP/2404)</div>
              <div className="p-2.5 rounded bg-[#07192C] border border-[#1E5280] text-[#4ADE80] tracking-wider break-all">
                {selectedFrame.rawHex}
              </div>
              <div className="text-[#9BC0DF] text-[10.5px]">
                Click any row in the Live Frame Stream or Logs tab to decode its exact APCI/ASDU bytes here.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: FAULT & SIMULATION */}
      {activeTab === 'FAULT_SIMULATION' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FFB547]" />
              <span>IEC 60870-5-104 Fault Injection Matrix</span>
            </h3>
            <span className="font-mono text-xs text-[#FDBA74]">Active Fault: {faultMode}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {faultList.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFaultMode(f.id)}
                style={{
                  backgroundColor: faultMode === f.id ? (f.id === 'NONE' ? '#06291E' : '#3B0D15') : '#04101E',
                  borderColor: faultMode === f.id ? (f.id === 'NONE' ? '#22C55E' : '#EF4444') : '#163856',
                }}
                className="p-3 rounded-lg border text-left transition hover:border-[#38BDF8]"
              >
                <div className="text-[10px] font-mono text-[#9BC0DF]">{f.group}</div>
                <div className="font-extrabold text-white text-xs mt-0.5">{f.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 7: LOGS & DIAGNOSTICS */}
      {activeTab === 'LOGS_DIAGNOSTICS' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white">Complete IEC-104 APCI / ASDU Frame Log</h3>
            <div className="flex gap-1.5">
              {(['ALL', 'I-Frame', 'S-Frame', 'U-Frame'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLogFilter(f)}
                  className={`px-2.5 py-1 rounded border text-[10.5px] font-bold ${logFilter === f ? 'bg-[#00CFFF] text-[#02101D] border-[#38BDF8]' : 'bg-[#04101E] text-[#9BC0DF] border-[#1E5280]'}`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[360px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 text-[#9BC0DF]">
                <tr>
                  <th className="py-1.5 px-2">Time</th>
                  <th className="py-1.5 px-2">Format</th>
                  <th className="py-1.5 px-2">Direction</th>
                  <th className="py-1.5 px-2">APCI</th>
                  <th className="py-1.5 px-2">Summary</th>
                  <th className="py-1.5 px-2">Raw Hex</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132E4A]">
                {filteredFrames.map((f) => (
                  <tr
                    key={f.id}
                    onClick={() => {
                      setSelectedFrameId(f.id);
                      setActiveTab('APCI_ANALYZER');
                    }}
                    className="bg-[#04101E] hover:bg-[#0B2540] cursor-pointer"
                  >
                    <td className="py-1.5 px-2 text-slate-400">{f.time}</td>
                    <td className="py-1.5 px-2 font-bold text-[#77E7FF]">{f.format}</td>
                    <td className="py-1.5 px-2 text-[#FACC15]">{f.dir}</td>
                    <td className="py-1.5 px-2 text-[#BAE6FD]">{f.apciText}</td>
                    <td className="py-1.5 px-2 text-white">{f.summary}</td>
                    <td className="py-1.5 px-2 text-[#4ADE80]">{f.rawHex}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
