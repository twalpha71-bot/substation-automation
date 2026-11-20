import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildModbusRegistersForBay, ModbusRegisterEntry } from '../data/protocolRegistry';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  FileCode2,
  Layers,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  Settings,
  ShieldAlert,
  Sliders,
  Terminal,
  Zap,
} from 'lucide-react';

type ModbusLabTab =
  | 'TOPOLOGY_LIVE'
  | 'REGISTER_BROWSER'
  | 'POLLING_CONFIG'
  | 'REGISTER_MAPPING'
  | 'PROTOCOL_CONVERSION'
  | 'PACKET_ANALYZER'
  | 'FAULT_INJECTION'
  | 'LOGS_DIAGNOSTICS';

type ModbusFaultMode =
  | 'NONE'
  | 'EX_01_ILLEGAL_FUNCTION'
  | 'EX_02_ILLEGAL_ADDRESS'
  | 'EX_03_ILLEGAL_VALUE'
  | 'SERVER_TIMEOUT'
  | 'WRONG_UNIT_ID'
  | 'SCALING_ERROR'
  | 'GATEWAY_CONV_FAIL'
  | 'IEC104_LINK_FAIL';

type WordOrder = 'ABCD' | 'CDAB';

type PipelinePhase =
  | 'IDLE'
  | 'MODBUS_REQ_IN_FLIGHT'
  | 'MODBUS_RESP_IN_FLIGHT'
  | 'GATEWAY_CONVERTING'
  | 'IEC104_IN_FLIGHT'
  | 'RCC_RECEIVED'
  | 'RCC_POINT_UPDATED'
  | 'FAILED';

interface GatewayModbusPoint {
  registerAddress: number;
  pduOffsetHex: string;
  functionCode: string;
  fcShort: '03' | '04' | '06';
  parameterName: string;
  dataType: ModbusRegisterEntry['dataType'];
  rawRegisterValue: number;
  rawHexWords: string;
  scalingFactor: number;
  engineeringValue: string;
  unit: string;
  iec61850SourceRef: string;
  mappedToIec104: boolean;
  iec104TypeId: string;
  ca: number;
  ioa: number;
  derivedQuality: 'GOOD' | 'INVALID' | 'QUESTIONABLE';
  mappingStatus: 'Mapped' | 'Unmapped (Local Only)' | 'Conversion Fault';
}

interface CommLogEntry {
  id: number;
  time: string;
  protocol: 'Modbus TCP' | 'Gateway' | 'IEC-104';
  direction: string;
  details: string;
  result: 'Success' | 'Delivered' | 'Exception' | 'Timeout' | 'Failed';
}

interface TimelineEvent {
  id: number;
  time: string;
  stage: 'REQ' | 'RESP' | 'CONV' | 'TX104' | 'RCC' | 'ERR';
  label: string;
}

const MODBUS_LAB_NET = {
  switchName: 'Hirschmann RSP35',
  switchIp: '192.168.100.10',
  gatewayName: 'SAS Gateway GTW-01',
  gatewayModbusClientIp: '10.132.10.200',
  gatewayIec104ServerIp: '10.132.20.200',
  rccName: 'RCC / SCADA',
  rccIec104ClientIp: '10.132.20.201',
  modbusPort: 502,
  iec104Port: 2404,
  commonAddress: 132,
} as const;

const HW_ASSETS = {
  METER: 'assets/devices/schneider-ion7650.png',
  SWITCH: 'assets/devices/hirschmann-rsp35.png',
  GATEWAY: 'assets/signal-chain/station-gateway.png',
  RCC: 'assets/signal-chain/scada-hmi.png',
} as const;

function nowTimeMs(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function encodeRegisterHex(
  dataType: ModbusRegisterEntry['dataType'],
  numericValue: number,
  rawInt: number,
  wordOrder: WordOrder
): string {
  if (dataType === 'UINT16') {
    const u16 = Math.max(0, Math.min(65535, Math.round(rawInt)));
    return `0x${u16.toString(16).padStart(4, '0').toUpperCase()}`;
  }
  const buf = new ArrayBuffer(4);
  const view = new DataView(buf);
  if (dataType === 'UINT32') {
    view.setUint32(0, Math.max(0, Math.round(rawInt)), false);
  } else {
    view.setFloat32(0, Number.isFinite(numericValue) ? numericValue : 0, false);
  }
  const hi = view.getUint16(0, false).toString(16).padStart(4, '0').toUpperCase();
  const lo = view.getUint16(2, false).toString(16).padStart(4, '0').toUpperCase();
  return wordOrder === 'ABCD' ? `0x${hi} 0x${lo}` : `0x${lo} 0x${hi}`;
}

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

export const ModbusTcpLabPage: React.FC = () => {
  const { bays, setSelectedBayId } = useSubstationStore();

  const defaultFeederBay = useMemo(
    () =>
      bays.find((b) => b.bayCode === '33-F03') ||
      bays.find((b) => b.voltageKv === 33) ||
      bays[0],
    [bays]
  );

  const [meterBayId, setMeterBayId] = useState<string>(defaultFeederBay?.id || '');
  const activeBay = useMemo(
    () => bays.find((b) => b.id === meterBayId) || defaultFeederBay,
    [bays, meterBayId, defaultFeederBay]
  );

  // Navigation & Playback Controls (Default 0.5x; does NOT alter pollIntervalMs)
  const [activeTab, setActiveTab] = useState<ModbusLabTab>('TOPOLOGY_LIVE');
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(0.5);
  const [playing, setPlaying] = useState<boolean>(true);
  const [pollingActive, setPollingActive] = useState<boolean>(true);

  // Modbus Client Configuration
  const [functionCode, setFunctionCode] = useState<'03' | '04' | '06'>('04');
  const [startRegInput, setStartRegInput] = useState<number>(30001);
  const [quantityInput, setQuantityInput] = useState<number>(2);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(1000);
  const [timeoutMs, setTimeoutMs] = useState<number>(1000);
  const [unitIdOverride, setUnitIdOverride] = useState<number | null>(null);
  const [wordOrder, setWordOrder] = useState<WordOrder>('ABCD');

  // Protocol Conversion Controls
  const [conversionEnabled, setConversionEnabled] = useState<boolean>(true);
  const [targetProtocol, setTargetProtocol] = useState<'IEC-104' | 'IEC-61850-MMS'>('IEC-104');
  const [selectedRegAddr, setSelectedRegAddr] = useState<number>(30001);
  const [activeExercise, setActiveExercise] = useState<string>('VOLTAGE_KV');

  // Fault Injection & Packet Dissector Mode
  const [faultMode, setFaultMode] = useState<ModbusFaultMode>('NONE');
  const [dissectorFrame, setDissectorFrame] = useState<'REQUEST' | 'RESPONSE'>('RESPONSE');
  const [logFilter, setLogFilter] = useState<'ALL' | 'Modbus TCP' | 'Gateway' | 'IEC-104'>('ALL');
  const [inspectedDevice, setInspectedDevice] = useState<'METER' | 'SWITCH' | 'GATEWAY' | 'RCC' | null>(null);
  const [inspectedPort, setInspectedPort] = useState<PortInspectionInfo | null>(null);

  // Actual DOM element refs for physical Ethernet port anchors + SVG overlay container
  const topologyContainerRef = useRef<HTMLDivElement | null>(null);
  const meterEth1Ref = useRef<HTMLButtonElement | null>(null);
  const switchP1Ref = useRef<HTMLButtonElement | null>(null);
  const switchP5Ref = useRef<HTMLButtonElement | null>(null);
  const gatewayEth1Ref = useRef<HTMLButtonElement | null>(null);
  const gatewayEth2Ref = useRef<HTMLButtonElement | null>(null);
  const rccEthRef = useRef<HTMLButtonElement | null>(null);

  const [cableGeom, setCableGeom] = useState<{
    width: number;
    height: number;
    trayY: number;
    cable1: PortPoint[]; // Meter ETH1 -> Switch Port 1
    cable2: PortPoint[]; // Switch Port 5 -> Gateway ETH1
    cable3: PortPoint[]; // Gateway ETH2 -> RCC ETH Interface (via Routed WAN Uplink)
    wanCenter: PortPoint;
  } | null>(null);

  const measurePortTopology = () => {
    const container = topologyContainerRef.current;
    const m1 = meterEth1Ref.current;
    const s1 = switchP1Ref.current;
    const s5 = switchP5Ref.current;
    const g1 = gatewayEth1Ref.current;
    const g2 = gatewayEth2Ref.current;
    const r1 = rccEthRef.current;
    if (!container || !m1 || !s1 || !s5 || !g1 || !g2 || !r1) return;

    const cRect = container.getBoundingClientRect();
    if (cRect.width < 100 || cRect.height < 100) return;

    const centerOf = (el: HTMLElement): PortPoint => {
      const rect = el.getBoundingClientRect();
      return {
        x: rect.left - cRect.left + rect.width / 2,
        y: rect.top - cRect.top + rect.height / 2,
      };
    };

    const pM1 = centerOf(m1);
    const pS1 = centerOf(s1);
    const pS5 = centerOf(s5);
    const pG1 = centerOf(g1);
    const pG2 = centerOf(g2);
    const pR1 = centerOf(r1);

    // Clean orthogonal cable tray routed cleanly beneath the hardware port row (90-degree bends, zero device overlap)
    const trayY = Math.max(pM1.y, pS1.y, pS5.y, pG1.y, pG2.y, pR1.y) + 24;

    const cable1: PortPoint[] = [
      pM1,
      { x: pM1.x, y: trayY },
      { x: pS1.x, y: trayY },
      pS1,
    ];
    const cable2: PortPoint[] = [
      pS5,
      { x: pS5.x, y: trayY },
      { x: pG1.x, y: trayY },
      pG1,
    ];
    const cable3: PortPoint[] = [
      pG2,
      { x: pG2.x, y: trayY },
      { x: pR1.x, y: trayY },
      pR1,
    ];
    const wanCenter: PortPoint = {
      x: (pG2.x + pR1.x) / 2,
      y: trayY,
    };

    setCableGeom({
      width: cRect.width,
      height: cRect.height,
      trayY,
      cable1,
      cable2,
      cable3,
      wanCenter,
    });
  };

  useEffect(() => {
    if (activeTab !== 'TOPOLOGY_LIVE') return;
    const container = topologyContainerRef.current;
    if (!container) return;

    const rafMeasure = () => window.requestAnimationFrame(measurePortTopology);
    rafMeasure();
    const t1 = window.setTimeout(measurePortTopology, 120);
    const t2 = window.setTimeout(measurePortTopology, 380);

    const ro = new ResizeObserver(() => {
      measurePortTopology();
    });
    ro.observe(container);
    window.addEventListener('resize', measurePortTopology);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', measurePortTopology);
    };
  }, [activeTab]);

  // Counters & Diagnostics
  const [pollCount, setPollCount] = useState<number>(142);
  const [timeoutCount, setTimeoutCount] = useState<number>(0);
  const [exceptionCount, setExceptionCount] = useState<number>(0);
  const [lastResponseMs, setLastResponseMs] = useState<number>(14);
  const [phase, setPhase] = useState<PipelinePhase>('RCC_POINT_UPDATED');
  const [rccFlash, setRccFlash] = useState<boolean>(false);

  const [inFlight, setInFlight] = useState<{
    txId: number;
    stage: 'MODBUS_REQ_IN_FLIGHT' | 'MODBUS_RESP_IN_FLIGHT' | 'IEC104_IN_FLIGHT';
    progress: number;
    regAddr: number;
    fc: '03' | '04' | '06';
    qty: number;
    rawHex: string;
    decodedVal: string;
    unit: string;
    iec104TypeId: string;
    ca: number;
    ioa: number;
    mappedToIec104: boolean;
    quality: 'GOOD' | 'INVALID' | 'QUESTIONABLE';
  } | null>(null);

  const [rccState, setRccState] = useState<{
    typeId: string;
    ca: number;
    ioa: number;
    value: string;
    quality: 'GOOD' | 'INVALID' | 'QUESTIONABLE';
    timestamp: string;
    rxCount: number;
    lastStage: string;
  }>(() => ({
    typeId: 'M_ME_NC_1',
    ca: MODBUS_LAB_NET.commonAddress,
    ioa: 2001,
    value: '33.00 kV',
    quality: 'GOOD',
    timestamp: nowTimeMs(),
    rxCount: 142,
    lastStage: 'RCC Point Updated',
  }));

  const [logs, setLogs] = useState<CommLogEntry[]>(() => [
    {
      id: 4,
      time: nowTimeMs(),
      protocol: 'IEC-104',
      direction: `${MODBUS_LAB_NET.gatewayIec104ServerIp}:2404 → ${MODBUS_LAB_NET.rccIec104ClientIp}`,
      details: `ASDU M_ME_NC_1 | CA=${MODBUS_LAB_NET.commonAddress} | IOA=2001 | 33.00 kV | GOOD`,
      result: 'Delivered',
    },
    {
      id: 3,
      time: nowTimeMs(),
      protocol: 'Gateway',
      direction: 'GTW-01 Internal Mapper',
      details: 'Reg 30001 (FLOAT32 ×0.01) → IEC-104 IOA 2001 (M_ME_NC_1)',
      result: 'Success',
    },
    {
      id: 2,
      time: nowTimeMs(),
      protocol: 'Modbus TCP',
      direction: '10.132.30.61:502 → 10.132.10.200',
      details: 'TID=0x008E | UID=11 | FC 04 Resp | Reg 30001 = 33.00 kV',
      result: 'Success',
    },
    {
      id: 1,
      time: nowTimeMs(),
      protocol: 'Modbus TCP',
      direction: '10.132.10.200 → 10.132.30.61:502',
      details: 'TID=0x008E | UID=11 | FC 04 Req | Start 30001 (0x0000) Qty 2',
      result: 'Success',
    },
  ]);

  const [timeline, setTimeline] = useState<TimelineEvent[]>(() => [
    { id: 1, time: nowTimeMs(), stage: 'REQ', label: 'Poll 30001' },
    { id: 2, time: nowTimeMs(), stage: 'RESP', label: '33.00 kV' },
    { id: 3, time: nowTimeMs(), stage: 'CONV', label: 'IOA 2001' },
    { id: 4, time: nowTimeMs(), stage: 'TX104', label: 'M_ME_NC_1' },
    { id: 5, time: nowTimeMs(), stage: 'RCC', label: 'RX #142' },
  ]);

  const nextLogIdRef = useRef<number>(10);
  const nextTxIdRef = useRef<number>(143);
  const pointCursorRef = useRef<number>(0);
  const processedTxIdsRef = useRef<Set<number>>(new Set());

  // Derived Unit ID from bay list (33-F03 defaults to Unit ID 11 when found)
  const configuredUnitId = useMemo(() => {
    if (!activeBay) return 11;
    if (activeBay.bayCode === '33-F03') return 11;
    const idx = bays.findIndex((b) => b.id === activeBay.id);
    return idx >= 0 ? (idx % 14) + 1 : 11;
  }, [bays, activeBay]);

  const activeUnitId = unitIdOverride ?? configuredUnitId;
  const scalingMultiplier = faultMode === 'SCALING_ERROR' ? 10 : 1;

  const registers = useMemo(() => {
    if (!activeBay) return [];
    return buildModbusRegistersForBay(activeBay, configuredUnitId, scalingMultiplier);
  }, [activeBay, configuredUnitId, scalingMultiplier]);

  // Derived health flags (distinguish TCP Timeout / Wrong Unit ID from Modbus Exceptions!)
  const isModbusException =
    faultMode === 'EX_01_ILLEGAL_FUNCTION' ||
    faultMode === 'EX_02_ILLEGAL_ADDRESS' ||
    faultMode === 'EX_03_ILLEGAL_VALUE';
  const isModbusTimeout = faultMode === 'SERVER_TIMEOUT' || faultMode === 'WRONG_UNIT_ID';
  const isModbusHealthy = !isModbusException && !isModbusTimeout;
  const isGatewayConvOk =
    conversionEnabled && isModbusHealthy && faultMode !== 'GATEWAY_CONV_FAIL';
  const isIec104Connected = faultMode !== 'IEC104_LINK_FAIL';

  const derivedQuality: 'GOOD' | 'INVALID' | 'QUESTIONABLE' = !isModbusHealthy
    ? 'INVALID'
    : faultMode === 'SCALING_ERROR' || faultMode === 'GATEWAY_CONV_FAIL'
    ? 'QUESTIONABLE'
    : 'GOOD';

  // Authoritative Modbus -> IEC-104 Gateway Mapping derived from protocolRegistry registers
  // Note: Reg 40003 (Meter Status & Demand Reset Word) is intentionally local-only (unmapped to IEC-104)
  const gatewayPoints: GatewayModbusPoint[] = useMemo(() => {
    const ioaBase = 2001;
    return registers.map((reg, idx) => {
      const fcShort: '03' | '04' | '06' = reg.functionCode.startsWith('03')
        ? '03'
        : reg.functionCode.startsWith('06')
        ? '06'
        : '04';
      const numericVal = parseFloat(reg.scaledEngineeringValue);
      const rawHexWords = encodeRegisterHex(
        reg.dataType,
        Number.isFinite(numericVal) ? numericVal : reg.rawRegisterValue,
        reg.rawRegisterValue,
        wordOrder
      );
      const mappedToIec104 = reg.registerAddress !== 40003;
      const iec104TypeId =
        reg.registerAddress === 40001
          ? 'M_IT_NA_1'
          : mappedToIec104
          ? 'M_ME_NC_1'
          : '—';
      const mappingStatus: GatewayModbusPoint['mappingStatus'] = !mappedToIec104
        ? 'Unmapped (Local Only)'
        : faultMode === 'GATEWAY_CONV_FAIL'
        ? 'Conversion Fault'
        : 'Mapped';

      return {
        registerAddress: reg.registerAddress,
        pduOffsetHex: reg.pduOffsetHex,
        functionCode: reg.functionCode,
        fcShort,
        parameterName: reg.parameterName,
        dataType: reg.dataType,
        rawRegisterValue: reg.rawRegisterValue,
        rawHexWords,
        scalingFactor: reg.scalingFactor,
        engineeringValue: reg.scaledEngineeringValue,
        unit: reg.unit,
        iec61850SourceRef: reg.iec61850SourceRef,
        mappedToIec104,
        iec104TypeId,
        ca: MODBUS_LAB_NET.commonAddress,
        ioa: mappedToIec104 ? ioaBase + idx : 0,
        derivedQuality,
        mappingStatus,
      };
    });
  }, [registers, wordOrder, faultMode, derivedQuality]);

  const selectedReg = useMemo(
    () => gatewayPoints.find((r) => r.registerAddress === selectedRegAddr) || gatewayPoints[0],
    [gatewayPoints, selectedRegAddr]
  );

  const meterServerIp = registers[0]?.serverIp || '10.132.30.61';

  // Helper loggers declared BEFORE any effects or dispatchers (zero TDZ risk)
  const appendLog = (entry: Omit<CommLogEntry, 'id' | 'time'>) => {
    const id = nextLogIdRef.current++;
    const time = nowTimeMs();
    setLogs((prev) => [{ id, time, ...entry }, ...prev].slice(0, 30));
  };

  const appendTimeline = (stage: TimelineEvent['stage'], label: string) => {
    const id = nextLogIdRef.current++;
    setTimeline((prev) => [...prev, { id, time: nowTimeMs(), stage, label }].slice(-12));
  };

  // Start a single Modbus Poll -> Gateway Conversion -> IEC-104 RCC cycle
  const launchPollCycle = (targetPoint?: GatewayModbusPoint) => {
    const pt = targetPoint || selectedReg || gatewayPoints[0];
    if (!pt) return;

    const txId = nextTxIdRef.current++;
    setPollCount(txId);
    setPhase('MODBUS_REQ_IN_FLIGHT');
    const qty = pt.dataType === 'UINT16' ? 1 : 2;

    appendLog({
      protocol: 'Modbus TCP',
      direction: `${MODBUS_LAB_NET.gatewayModbusClientIp} → ${meterServerIp}:${MODBUS_LAB_NET.modbusPort}`,
      details: `TID=0x${txId.toString(16).padStart(4, '0').toUpperCase()} | UID=${activeUnitId} | FC ${pt.fcShort} Req | Start ${pt.registerAddress} (${pt.pduOffsetHex}) Qty ${qty}`,
      result: 'Success',
    });
    appendTimeline('REQ', `FC${pt.fcShort} ${pt.registerAddress}`);

    setInFlight({
      txId,
      stage: 'MODBUS_REQ_IN_FLIGHT',
      progress: 0,
      regAddr: pt.registerAddress,
      fc: pt.fcShort,
      qty,
      rawHex: pt.rawHexWords,
      decodedVal: `${pt.engineeringValue} ${pt.unit}`,
      unit: pt.unit,
      iec104TypeId: pt.iec104TypeId,
      ca: pt.ca,
      ioa: pt.ioa,
      mappedToIec104: pt.mappedToIec104,
      quality: pt.derivedQuality,
    });
  };

  // Periodic poll scheduler (respects pollingActive, playing, and pollIntervalMs — speed does NOT mutate pollIntervalMs)
  useEffect(() => {
    if (!playing || !pollingActive || inFlight || gatewayPoints.length === 0) return;
    const tid = window.setTimeout(() => {
      const cycleRegs = [30001, 30003, 30005, 30007, 30009, 30015];
      const addr = cycleRegs[pointCursorRef.current % cycleRegs.length];
      pointCursorRef.current += 1;
      const pt = gatewayPoints.find((g) => g.registerAddress === addr) || gatewayPoints[0];
      launchPollCycle(pt);
    }, pollIntervalMs);
    return () => window.clearTimeout(tid);
  }, [playing, pollingActive, inFlight, pollIntervalMs, gatewayPoints, faultMode, activeUnitId, conversionEnabled]);

  // Smooth requestAnimationFrame packet motion across the 3 physical stages
  // Default speed = 0.5x (readable motion; Pause freezes in place without corrupting state)
  useEffect(() => {
    if (!playing || !inFlight) return;
    let rafId = 0;
    let lastTs = performance.now();
    const baseSegmentMs = inFlight.stage === 'IEC104_IN_FLIGHT' ? 1400 : 1500;
    const durationMs = baseSegmentMs / speed;

    const step = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;

      setInFlight((cur) => {
        if (!cur) return null;
        const nextP = cur.progress + dt / durationMs;
        if (nextP < 1) {
          return { ...cur, progress: nextP };
        }

        // Stage transition when segment reaches 1.0
        if (cur.stage === 'MODBUS_REQ_IN_FLIGHT') {
          // Check TCP Timeout / Wrong Unit ID (no Modbus exception response!)
          if (faultMode === 'SERVER_TIMEOUT' || faultMode === 'WRONG_UNIT_ID') {
            if (!processedTxIdsRef.current.has(cur.txId * 10 + 1)) {
              processedTxIdsRef.current.add(cur.txId * 10 + 1);
              setTimeoutCount((c) => c + 1);
              setPhase('FAILED');
              appendLog({
                protocol: 'Modbus TCP',
                direction: `${MODBUS_LAB_NET.gatewayModbusClientIp} ✕ ${meterServerIp}:502`,
                details:
                  faultMode === 'WRONG_UNIT_ID'
                    ? `No reply — Incorrect Unit ID ${activeUnitId} (Expected ${configuredUnitId})`
                    : `TCP Timeout (> ${timeoutMs} ms) — No response from ${meterServerIp}:502 (Not a Modbus Exception)`,
                result: 'Timeout',
              });
              appendTimeline('ERR', faultMode === 'WRONG_UNIT_ID' ? 'Bad UID' : 'TCP Timeout');
            }
            return null;
          }

          // Otherwise Meter sends Response (either normal or Modbus Exception 0x01/0x02/0x03)
          setPhase('MODBUS_RESP_IN_FLIGHT');
          setLastResponseMs(11 + (cur.txId % 9));
          return { ...cur, stage: 'MODBUS_RESP_IN_FLIGHT', progress: 0 };
        }

        if (cur.stage === 'MODBUS_RESP_IN_FLIGHT') {
          if (
            faultMode === 'EX_01_ILLEGAL_FUNCTION' ||
            faultMode === 'EX_02_ILLEGAL_ADDRESS' ||
            faultMode === 'EX_03_ILLEGAL_VALUE'
          ) {
            if (!processedTxIdsRef.current.has(cur.txId * 10 + 2)) {
              processedTxIdsRef.current.add(cur.txId * 10 + 2);
              const exCode =
                faultMode === 'EX_01_ILLEGAL_FUNCTION'
                  ? '0x01 Illegal Function'
                  : faultMode === 'EX_02_ILLEGAL_ADDRESS'
                  ? '0x02 Illegal Data Address'
                  : '0x03 Illegal Data Value';
              const exFc = `0x${(parseInt(cur.fc, 10) + 0x80).toString(16).toUpperCase()}`;
              setExceptionCount((c) => c + 1);
              setPhase('FAILED');
              appendLog({
                protocol: 'Modbus TCP',
                direction: `${meterServerIp}:502 → ${MODBUS_LAB_NET.gatewayModbusClientIp}`,
                details: `Exception PDU ${exFc} | ${exCode} | Reg ${cur.regAddr}`,
                result: 'Exception',
              });
              appendTimeline('ERR', exCode.slice(0, 12));
            }
            return null;
          }

          // Normal Modbus Response arrived at Gateway
          if (!processedTxIdsRef.current.has(cur.txId * 10 + 2)) {
            processedTxIdsRef.current.add(cur.txId * 10 + 2);
            appendLog({
              protocol: 'Modbus TCP',
              direction: `${meterServerIp}:502 → ${MODBUS_LAB_NET.gatewayModbusClientIp}`,
              details: `TID=0x${cur.txId.toString(16).padStart(4, '0').toUpperCase()} | FC ${cur.fc} Resp | ${cur.rawHex} → ${cur.decodedVal}`,
              result: 'Success',
            });
            appendTimeline('RESP', cur.decodedVal);
          }

          // Gateway Protocol Conversion check
          setPhase('GATEWAY_CONVERTING');
          if (!conversionEnabled || !cur.mappedToIec104 || faultMode === 'GATEWAY_CONV_FAIL') {
            if (!processedTxIdsRef.current.has(cur.txId * 10 + 3)) {
              processedTxIdsRef.current.add(cur.txId * 10 + 3);
              const reason = !conversionEnabled
                ? 'Conversion Disabled'
                : !cur.mappedToIec104
                ? `Reg ${cur.regAddr} Unmapped (Local Only)`
                : 'Gateway Conversion Engine Fault';
              setPhase(faultMode === 'GATEWAY_CONV_FAIL' ? 'FAILED' : 'IDLE');
              appendLog({
                protocol: 'Gateway',
                direction: 'GTW-01 Protocol Mapper',
                details: `${reason} — Not forwarded to RCC`,
                result: faultMode === 'GATEWAY_CONV_FAIL' ? 'Failed' : 'Success',
              });
              appendTimeline(faultMode === 'GATEWAY_CONV_FAIL' ? 'ERR' : 'CONV', !cur.mappedToIec104 ? 'Local Only' : 'Conv Halt');
            }
            return null;
          }

          // IEC-104 Link Check
          if (faultMode === 'IEC104_LINK_FAIL') {
            if (!processedTxIdsRef.current.has(cur.txId * 10 + 3)) {
              processedTxIdsRef.current.add(cur.txId * 10 + 3);
              setPhase('FAILED');
              appendLog({
                protocol: 'IEC-104',
                direction: `${MODBUS_LAB_NET.gatewayIec104ServerIp}:2404 ✕ ${MODBUS_LAB_NET.rccIec104ClientIp}`,
                details: `TCP/2404 Down — ASDU ${cur.iec104TypeId} IOA=${cur.ioa} buffered at Gateway`,
                result: 'Failed',
              });
              appendTimeline('ERR', '104 Down');
            }
            return null;
          }

          if (!processedTxIdsRef.current.has(cur.txId * 10 + 3)) {
            processedTxIdsRef.current.add(cur.txId * 10 + 3);
            appendLog({
              protocol: 'Gateway',
              direction: 'GTW-01 Protocol Mapper',
              details: `Reg ${cur.regAddr} (${cur.decodedVal}) → ${cur.iec104TypeId} CA=${cur.ca} IOA=${cur.ioa}`,
              result: 'Success',
            });
            appendTimeline('CONV', `IOA ${cur.ioa}`);
          }

          setPhase('IEC104_IN_FLIGHT');
          appendTimeline('TX104', cur.iec104TypeId);
          return { ...cur, stage: 'IEC104_IN_FLIGHT', progress: 0 };
        }

        // Stage 3: IEC-104 Packet arrives at RCC/SCADA (idempotent single-increment RX counter)
        if (cur.stage === 'IEC104_IN_FLIGHT') {
          if (!processedTxIdsRef.current.has(cur.txId * 10 + 4)) {
            processedTxIdsRef.current.add(cur.txId * 10 + 4);
            const rxTime = nowTimeMs();
            setPhase('RCC_RECEIVED');
            setRccState((prev) => ({
              typeId: cur.iec104TypeId,
              ca: cur.ca,
              ioa: cur.ioa,
              value: cur.decodedVal,
              quality: cur.quality,
              timestamp: rxTime,
              rxCount: prev.rxCount + 1,
              lastStage: 'RCC Point Updated',
            }));
            setRccFlash(true);
            window.setTimeout(() => {
              setPhase('RCC_POINT_UPDATED');
              setRccFlash(false);
            }, 380);
            appendLog({
              protocol: 'IEC-104',
              direction: `${MODBUS_LAB_NET.gatewayIec104ServerIp}:2404 → ${MODBUS_LAB_NET.rccIec104ClientIp}`,
              details: `ASDU ${cur.iec104TypeId} | CA=${cur.ca} | IOA=${cur.ioa} | ${cur.decodedVal} | ${cur.quality} (ACK OK)`,
              result: 'Delivered',
            });
            appendTimeline('RCC', `IOA ${cur.ioa} OK`);
          }
          return null;
        }

        return null;
      });

      rafId = window.requestAnimationFrame(step);
    };

    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, speed, inFlight?.txId, inFlight?.stage, faultMode, conversionEnabled, timeoutMs, activeUnitId, configuredUnitId, meterServerIp]);

  const exercises = [
    {
      id: 'VOLTAGE_KV',
      title: 'Exercise 1: Poll 33 kV Feeder Voltage (Reg 30001)',
      reg: 30001,
      fc: '04' as const,
      qty: 2,
      desc: 'Read FLOAT32 Input Register 30001 (PDU 0x0000) with scaling ×0.01 → IEC-104 IOA 2001.',
    },
    {
      id: 'CURRENT_A',
      title: 'Exercise 2: Poll Three-Phase Currents (Reg 30003–30007)',
      reg: 30003,
      fc: '04' as const,
      qty: 2,
      desc: 'Read Input Registers 30003/30005/30007 (scaling ×0.1 A) and inspect ABCD vs CDAB word order.',
    },
    {
      id: 'POWER_MW_MVAR',
      title: 'Exercise 3: Poll Active & Reactive Power (Reg 30009–30011)',
      reg: 30009,
      fc: '04' as const,
      qty: 2,
      desc: 'Verify Active Power MW (IOA 2005) and Reactive Power MVAr (IOA 2006) match SLD feeder load.',
    },
    {
      id: 'FREQ_ENERGY',
      title: 'Exercise 4: Poll Net Energy MWh (Reg 40001, FC 03)',
      reg: 40001,
      fc: '03' as const,
      qty: 2,
      desc: 'Switch to Function Code 03 (Holding Register) for UINT32 Energy Import → IEC-104 M_IT_NA_1.',
    },
  ];

  const handleReset = () => {
    setSpeed(0.5);
    setPlaying(true);
    setPollingActive(true);
    setFaultMode('NONE');
    setConversionEnabled(true);
    setUnitIdOverride(null);
    setWordOrder('ABCD');
    setInFlight(null);
    setPhase('RCC_POINT_UPDATED');
  };

  // Packet position sampled strictly along ResizeObserver-measured orthogonal physical Ethernet cables
  const getPacketCoords = (): { x: number; y: number; angleDeg: number } | null => {
    if (!inFlight || !cableGeom) return null;
    const p = Math.max(0, Math.min(1, inFlight.progress));

    if (inFlight.stage === 'MODBUS_REQ_IN_FLIGHT') {
      // Request: Gateway ETH1 -> Switch Port 5 -> Switch Port 1 -> Meter ETH1
      const reqRoute: PortPoint[] = [
        ...[...cableGeom.cable2].reverse(),
        ...[...cableGeom.cable1].reverse(),
      ];
      return samplePolyline(reqRoute, p);
    }
    if (inFlight.stage === 'MODBUS_RESP_IN_FLIGHT') {
      // Response: Meter ETH1 -> Switch Port 1 -> Switch Port 5 -> Gateway ETH1 (same physical cables)
      const respRoute: PortPoint[] = [
        ...cableGeom.cable1,
        ...cableGeom.cable2,
      ];
      return samplePolyline(respRoute, p);
    }
    // IEC-104: Gateway ETH2 -> Routed WAN Uplink -> RCC Ethernet Interface
    return samplePolyline(cableGeom.cable3, p);
  };

  const pktPos = getPacketCoords();

  const portInfoMap: Record<
    'METER_ETH1' | 'SW_P1' | 'SW_P5' | 'GW_ETH1' | 'GW_ETH2' | 'RCC_ETH',
    PortInspectionInfo
  > = {
    METER_ETH1: {
      title: `PowerLogic ION7650 (${activeBay?.bayCode || '33-F03'}) — Rear ETH1`,
      connectedDevice: MODBUS_LAB_NET.switchName,
      remotePort: 'Port 1',
      protocol: 'Modbus TCP (Server)',
      tcpPort: '502',
      linkStatus: isModbusTimeout ? 'DOWN' : 'UP',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    SW_P1: {
      title: `${MODBUS_LAB_NET.switchName} — Port 1`,
      connectedDevice: `PowerLogic ION7650 (${meterServerIp})`,
      remotePort: 'Rear ETH1',
      protocol: 'Modbus TCP',
      tcpPort: '502',
      linkStatus: isModbusTimeout ? 'DOWN' : 'UP',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    SW_P5: {
      title: `${MODBUS_LAB_NET.switchName} — Port 5`,
      connectedDevice: `${MODBUS_LAB_NET.gatewayName} (${MODBUS_LAB_NET.gatewayModbusClientIp})`,
      remotePort: 'ETH1',
      protocol: 'Modbus TCP',
      tcpPort: '502',
      linkStatus: isModbusTimeout ? 'DOWN' : 'UP',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    GW_ETH1: {
      title: `${MODBUS_LAB_NET.gatewayName} — ETH1`,
      connectedDevice: MODBUS_LAB_NET.switchName,
      remotePort: 'Port 5',
      protocol: 'Modbus TCP (Client)',
      tcpPort: '502',
      linkStatus: isModbusTimeout ? 'DOWN' : 'UP',
      speedDuplex: 'Simulated 100BASE-TX Full-Duplex',
    },
    GW_ETH2: {
      title: `${MODBUS_LAB_NET.gatewayName} — ETH2 (Telecontrol Uplink)`,
      connectedDevice: `${MODBUS_LAB_NET.rccName} via Routed WAN (${MODBUS_LAB_NET.rccIec104ClientIp})`,
      remotePort: 'RCC Ethernet Interface',
      protocol: 'IEC 60870-5-104 (Server)',
      tcpPort: '2404',
      linkStatus: isIec104Connected ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated Routed WAN / Ethernet Link',
    },
    RCC_ETH: {
      title: `${MODBUS_LAB_NET.rccName} — Ethernet Interface`,
      connectedDevice: `${MODBUS_LAB_NET.gatewayName} via Routed WAN (${MODBUS_LAB_NET.gatewayIec104ServerIp})`,
      remotePort: 'ETH2',
      protocol: 'IEC 60870-5-104 (Master Client)',
      tcpPort: '2404',
      linkStatus: isIec104Connected ? 'UP' : 'DOWN',
      speedDuplex: 'Simulated Routed WAN / Ethernet Link',
    },
  };

  const exceptionCodeHex =
    faultMode === 'EX_01_ILLEGAL_FUNCTION'
      ? '0x01 (Illegal Function)'
      : faultMode === 'EX_02_ILLEGAL_ADDRESS'
      ? '0x02 (Illegal Data Address)'
      : faultMode === 'EX_03_ILLEGAL_VALUE'
      ? '0x03 (Illegal Data Value)'
      : 'None (Normal Response)';

  const filteredLogs = useMemo(
    () => (logFilter === 'ALL' ? logs : logs.filter((l) => l.protocol === logFilter)),
    [logs, logFilter]
  );

  const tabs: { id: ModbusLabTab; label: string }[] = [
    { id: 'TOPOLOGY_LIVE', label: 'Topology & Live Data' },
    { id: 'REGISTER_BROWSER', label: 'Register Browser' },
    { id: 'POLLING_CONFIG', label: 'Polling Configuration' },
    { id: 'REGISTER_MAPPING', label: 'Register Mapping' },
    { id: 'PROTOCOL_CONVERSION', label: 'Protocol Conversion' },
    { id: 'PACKET_ANALYZER', label: 'Packet Analyzer' },
    { id: 'FAULT_INJECTION', label: 'Fault Injection' },
    { id: 'LOGS_DIAGNOSTICS', label: 'Logs & Diagnostics' },
  ];

  const faultButtons: { id: ModbusFaultMode; label: string; category: string }[] = [
    { id: 'NONE', label: 'Normal Communication (0x00)', category: 'Healthy' },
    { id: 'EX_01_ILLEGAL_FUNCTION', label: 'Illegal Function (0x01)', category: 'Modbus Exception' },
    { id: 'EX_02_ILLEGAL_ADDRESS', label: 'Illegal Data Address (0x02)', category: 'Modbus Exception' },
    { id: 'EX_03_ILLEGAL_VALUE', label: 'Illegal Data Value (0x03)', category: 'Modbus Exception' },
    { id: 'SERVER_TIMEOUT', label: 'TCP Timeout (No Reply)', category: 'Transport Fault' },
    { id: 'WRONG_UNIT_ID', label: 'Incorrect Unit ID', category: 'Addressing Fault' },
    { id: 'SCALING_ERROR', label: 'Register Scaling Error (10×)', category: 'Decoding Fault' },
    { id: 'GATEWAY_CONV_FAIL', label: 'Gateway Conversion Failure', category: 'Gateway Fault' },
    { id: 'IEC104_LINK_FAIL', label: 'IEC-104 Comm Failure (2404)', category: 'Telecontrol Fault' },
  ];

  if (!activeBay || !selectedReg) {
    return (
      <div className="p-6 text-slate-300 bg-[#030B18] rounded-xl border border-[#1B4B72]">
        Loading Modbus TCP Lab V2 substation telemetry...
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
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-base sm:text-lg font-extrabold tracking-wide text-white">
              Modbus TCP Lab V2 — Real Device Communication &amp; Protocol Conversion
            </h2>
            <span className="px-2 py-0.5 rounded bg-[#082038] border border-[#1E5280] text-[#7DD3FC] font-mono text-[10px] font-bold">
              SIMULATED TRAFFIC
            </span>
          </div>
          <p className="text-[11px] text-[#9BC0DF] mt-0.5">
            33 kV Energy Meter → Industrial Ethernet Switch → Station Gateway → SCADA
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span
            style={{
              backgroundColor: playing ? '#06291E' : '#2B1F08',
              borderColor: playing ? '#22C55E' : '#EAB308',
              color: playing ? '#4ADE80' : '#FDE047',
            }}
            className="rounded-lg border px-2.5 py-1"
          >
            ● Simulation: {playing ? 'LIVE' : 'PAUSED'}
          </span>
          <span
            style={{
              backgroundColor: isModbusHealthy ? '#06291E' : '#3B0D15',
              borderColor: isModbusHealthy ? '#22C55E' : '#EF4444',
              color: isModbusHealthy ? '#4ADE80' : '#FCA5A5',
            }}
            className="rounded-lg border px-2.5 py-1"
          >
            Modbus Poll: {isModbusHealthy ? 'HEALTHY' : isModbusTimeout ? 'TIMEOUT' : 'EXCEPTION'}
          </span>
          <span
            style={{
              backgroundColor: !isModbusTimeout ? '#082038' : '#3B0D15',
              borderColor: !isModbusTimeout ? '#00CFFF' : '#EF4444',
              color: !isModbusTimeout ? '#77E7FF' : '#FCA5A5',
            }}
            className="rounded-lg border px-2.5 py-1 font-mono"
          >
            TCP/502: {!isModbusTimeout ? 'CONNECTED' : 'TIMEOUT'}
          </span>
          <span className="rounded-lg border border-[#1E5280] bg-[#082038] px-2.5 py-1 font-mono text-[#BAE6FD]">
            Poll Interval: {pollIntervalMs} ms
          </span>
          <span className="rounded-lg border border-[#F97316] bg-[#2B1608] px-2.5 py-1 font-mono text-[#FDBA74]">
            Polls: #{pollCount}
          </span>
        </div>
      </div>

      {/* 2. NAVIGATION TABS & PLAYBACK CONTROLS (0.5x Default) */}
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

      {/* 3. PRIMARY WORKSPACE: TOPOLOGY & LIVE DATA */}
      {activeTab === 'TOPOLOGY_LIVE' && (
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
          {/* LEFT CONTROL COLUMN (3 cols on 1920x1080) */}
          <div className="xl:col-span-3 space-y-3 min-w-0">
            {/* Energy Meter Information */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Cpu className="w-4 h-4 text-[#F97316]" />
                  <span>Energy Meter Info</span>
                </div>
                <span
                  style={{ color: isModbusTimeout ? '#F87171' : '#4ADE80' }}
                  className="font-mono text-[10px] font-bold"
                >
                  ● {isModbusTimeout ? 'OFFLINE' : 'ONLINE'}
                </span>
              </div>

              <div className="flex items-center gap-2.5 bg-[#04101E] border border-[#15395A] rounded-lg p-2">
                <img
                  src={HW_ASSETS.METER}
                  alt="Schneider Electric PowerLogic ION7650"
                  className="w-16 h-16 object-contain shrink-0"
                />
                <div className="min-w-0 flex-1 space-y-0.5 text-[10.5px]">
                  <div className="font-extrabold text-white truncate">PowerLogic ION7650</div>
                  <div className="text-[#9BC0DF] font-mono">Bay: {activeBay.bayCode}</div>
                  <div className="text-[#38BDF8] font-mono">IP: {meterServerIp}</div>
                  <div className="text-[#FDBA74] font-mono">Unit ID: {activeUnitId} · TCP/502</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 font-mono text-[10.5px]">
                <div className="rounded bg-[#04101E] border border-[#15395A] px-2 py-1">
                  <div className="text-[9.5px] text-[#8BB3D4]">Voltage V_AB</div>
                  <div className="font-bold text-[#4ADE80]">{(activeBay.voltageAbKv * scalingMultiplier).toFixed(2)} kV</div>
                </div>
                <div className="rounded bg-[#04101E] border border-[#15395A] px-2 py-1">
                  <div className="text-[9.5px] text-[#8BB3D4]">Current I_A</div>
                  <div className="font-bold text-[#38BDF8]">{(activeBay.currentA * scalingMultiplier).toFixed(1)} A</div>
                </div>
                <div className="rounded bg-[#04101E] border border-[#15395A] px-2 py-1">
                  <div className="text-[9.5px] text-[#8BB3D4]">Active Power</div>
                  <div className="font-bold text-[#FDBA74]">{(activeBay.activePowerMw * scalingMultiplier).toFixed(2)} MW</div>
                </div>
                <div className="rounded bg-[#04101E] border border-[#15395A] px-2 py-1">
                  <div className="text-[9.5px] text-[#8BB3D4]">Frequency</div>
                  <div className="font-bold text-[#E2E8F0]">{activeBay.frequencyHz.toFixed(2)} Hz</div>
                </div>
              </div>
            </div>

            {/* Modbus Client Configuration */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center gap-1.5 font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5">
                <Settings className="w-4 h-4 text-[#00CFFF]" />
                <span>Modbus Client Configuration</span>
              </div>

              <div>
                <label className="block text-[10px] text-[#9BC0DF] mb-1">Energy Meter / Feeder</label>
                <select
                  value={activeBay.id}
                  onChange={(e) => {
                    setMeterBayId(e.target.value);
                    setSelectedBayId(e.target.value);
                    setUnitIdOverride(null);
                  }}
                  style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                  className="w-full rounded-lg border px-2 py-1 text-[11px] font-bold"
                >
                  {bays.map((b, i) => (
                    <option key={b.id} value={b.id}>
                      UID {b.bayCode === '33-F03' ? 11 : (i % 14) + 1} · {b.bayCode} ({b.name})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="block text-[10px] text-[#9BC0DF] mb-0.5">Function Code</label>
                  <select
                    value={functionCode}
                    onChange={(e) => setFunctionCode(e.target.value as '03' | '04' | '06')}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FDBA74' }}
                    className="w-full rounded border px-1.5 py-1 text-[11px] font-mono font-bold"
                  >
                    <option value="04">FC 04 (Input)</option>
                    <option value="03">FC 03 (Holding)</option>
                    <option value="06">FC 06 (Write)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#9BC0DF] mb-0.5">Unit ID</label>
                  <input
                    type="number"
                    min={1}
                    max={247}
                    value={activeUnitId}
                    onChange={(e) => {
                      const val = Math.max(1, Math.min(247, Number(e.target.value) || 1));
                      setUnitIdOverride(val);
                      if (val !== configuredUnitId) setFaultMode('WRONG_UNIT_ID');
                      else if (faultMode === 'WRONG_UNIT_ID') setFaultMode('NONE');
                    }}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                    className="w-full rounded border px-2 py-1 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9BC0DF] mb-0.5">Start Reg</label>
                  <input
                    type="number"
                    value={startRegInput}
                    onChange={(e) => {
                      const v = Number(e.target.value) || 30001;
                      setStartRegInput(v);
                      const match = gatewayPoints.find((g) => g.registerAddress === v);
                      if (match) setSelectedRegAddr(v);
                    }}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                    className="w-full rounded border px-2 py-1 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9BC0DF] mb-0.5">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={quantityInput}
                    onChange={(e) => setQuantityInput(Math.max(1, Math.min(16, Number(e.target.value) || 2)))}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                    className="w-full rounded border px-2 py-1 text-[11px] font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#9BC0DF] mb-0.5">Poll Interval</label>
                  <select
                    value={pollIntervalMs}
                    onChange={(e) => setPollIntervalMs(Number(e.target.value))}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                    className="w-full rounded border px-1.5 py-1 text-[11px] font-mono"
                  >
                    <option value={500}>500 ms</option>
                    <option value={1000}>1000 ms</option>
                    <option value={2000}>2000 ms</option>
                    <option value={5000}>5000 ms</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#9BC0DF] mb-0.5">Timeout</label>
                  <select
                    value={timeoutMs}
                    onChange={(e) => setTimeoutMs(Number(e.target.value))}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#FFFFFF' }}
                    className="w-full rounded border px-1.5 py-1 text-[11px] font-mono"
                  >
                    <option value={500}>500 ms</option>
                    <option value={1000}>1000 ms</option>
                    <option value={3000}>3000 ms</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setPollingActive((p) => !p)}
                  style={{
                    backgroundColor: pollingActive ? '#3B0D15' : '#06291E',
                    borderColor: pollingActive ? '#EF4444' : '#22C55E',
                    color: pollingActive ? '#FCA5A5' : '#4ADE80',
                  }}
                  className="rounded-lg border py-1.5 text-[11px] font-extrabold"
                >
                  {pollingActive ? 'Stop Polling' : 'Start Polling'}
                </button>
                <button
                  type="button"
                  onClick={() => launchPollCycle(selectedReg)}
                  style={{ backgroundColor: '#F97316', color: '#03101E' }}
                  className="flex items-center justify-center gap-1 rounded-lg py-1.5 text-[11px] font-extrabold shadow"
                >
                  <RefreshCw className="w-3 h-3" /> Manual Poll
                </button>
              </div>
            </div>

            {/* Protocol Conversion Panel */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Sliders className="w-4 h-4 text-[#4ADE80]" />
                  <span>Protocol Conversion</span>
                </div>
                <button
                  type="button"
                  onClick={() => setConversionEnabled((v) => !v)}
                  style={{
                    backgroundColor: conversionEnabled ? '#06291E' : '#3B0D15',
                    borderColor: conversionEnabled ? '#22C55E' : '#EF4444',
                    color: conversionEnabled ? '#4ADE80' : '#FCA5A5',
                  }}
                  className="rounded border px-2 py-0.5 text-[10px] font-extrabold"
                >
                  {conversionEnabled ? 'ENABLED' : 'DISABLED'}
                </button>
              </div>

              <div className="space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-[#9BC0DF]">Target Protocol</span>
                  <select
                    value={targetProtocol}
                    onChange={(e) => setTargetProtocol(e.target.value as 'IEC-104' | 'IEC-61850-MMS')}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#4ADE80' }}
                    className="rounded border px-2 py-0.5 text-[10.5px] font-mono font-bold"
                  >
                    <option value="IEC-104">IEC 60870-5-104 (2404)</option>
                    <option value="IEC-61850-MMS">IEC 61850 MMS (102)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9BC0DF]">FLOAT32 Word Order</span>
                  <select
                    value={wordOrder}
                    onChange={(e) => setWordOrder(e.target.value as WordOrder)}
                    style={{ backgroundColor: '#04101E', borderColor: '#1E5280', color: '#7DD3FC' }}
                    className="rounded border px-2 py-0.5 text-[10.5px] font-mono font-bold"
                  >
                    <option value="ABCD">ABCD (Big-Endian)</option>
                    <option value="CDAB">CDAB (Word-Swapped)</option>
                  </select>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[#9BC0DF]">Gateway Status</span>
                  <span style={{ color: isGatewayConvOk ? '#4ADE80' : '#F87171' }} className="font-mono font-bold">
                    {isGatewayConvOk ? 'ACTIVE (9/10 Mapped)' : 'HALTED / FAULT'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('REGISTER_MAPPING')}
                  className="w-full rounded-lg border border-[#1E5280] bg-[#082038] py-1 text-[10.5px] font-bold text-[#7DD3FC] hover:border-[#38BDF8]"
                >
                  View Full Gateway Point Mapping →
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT / CENTRAL MAIN COLUMN (9 cols on 1920x1080) */}
          <div className="xl:col-span-9 space-y-3 min-w-0">
            {/* 4-DEVICE REALISTIC HARDWARE TOPOLOGY */}
            <div
              style={{
                backgroundColor: '#051324',
                borderColor: '#1B4B72',
                boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
              }}
              className="rounded-xl border p-3 space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-extrabold text-white text-xs sm:text-[13px]">
                  <Layers className="w-4 h-4 text-[#00CFFF]" />
                  <span>System Topology — Modbus TCP Polling &amp; IEC 60870-5-104 Conversion</span>
                </div>
                <div className="flex flex-wrap items-center gap-2 font-mono text-[10px]">
                  <span className="text-[#38BDF8]">● Cyan: Modbus Req (TCP/502)</span>
                  <span className="text-[#22C55E]">● Green: Modbus Resp (TCP/502)</span>
                  <span className="text-[#4ADE80]">● Bright Green: IEC-104 (TCP/2404)</span>
                </div>
              </div>

              <div
                ref={topologyContainerRef}
                className="relative w-full rounded-lg border border-[#14395C] bg-[#030D1A] px-3 pt-3 pb-14 overflow-hidden"
              >
                {/* 4-DEVICE REALISTIC HARDWARE ROW WITH ACTUAL DOM PORT ANCHOR REFS */}
                <div className="relative z-10 grid grid-cols-4 gap-3 items-end">
                  {/* DEVICE 1: Schneider PowerLogic ION7650 + Rear ETH1 Inset */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-full rounded-md border border-[#F97316] bg-[#071D34] px-2 py-1 text-center mb-2">
                      <div className="text-[10.5px] font-extrabold text-white truncate">33 kV Energy Meter</div>
                      <div className="text-[9px] font-mono text-[#FDBA74] truncate">Modbus TCP Server (502)</div>
                    </div>

                    <div
                      onClick={() => setInspectedDevice('METER')}
                      className="relative flex items-end justify-center cursor-pointer"
                    >
                      <img
                        src={HW_ASSETS.METER}
                        alt="Schneider Electric PowerLogic ION7650"
                        onLoad={measurePortTopology}
                        className="h-[118px] w-auto object-contain select-none"
                      />
                      {/* Realistic Rear ETH1 Port Inset mounted at right rear edge of ION7650 */}
                      <button
                        ref={meterEth1Ref}
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectedPort(portInfoMap.METER_ETH1);
                        }}
                        title="Click to inspect Meter Rear ETH1 (Modbus TCP/502)"
                        className="ml-1 mb-1 flex flex-col items-center rounded border border-[#F97316] bg-[#0A1E33] px-1.5 py-1 hover:border-[#38BDF8] transition"
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full mb-0.5"
                          style={{ backgroundColor: isModbusTimeout ? '#EF4444' : '#4ADE80' }}
                        />
                        <span className="w-3.5 h-2.5 rounded-[2px] border border-[#38BDF8] bg-[#020B16] block" />
                        <span className="text-[8px] font-mono font-bold text-[#FDBA74] mt-0.5 leading-none">ETH1</span>
                      </button>
                    </div>

                    <div className="mt-10 text-center">
                      <div className="text-[11px] font-extrabold text-white">PowerLogic ION7650</div>
                      <div className="text-[9.5px] font-mono font-bold text-[#38BDF8]">
                        {meterServerIp} · UID {activeUnitId}
                      </div>
                      <div className="text-[9px] font-mono text-[#FDBA74]">Bay {activeBay.bayCode} · Rear ETH1</div>
                    </div>
                  </div>

                  {/* DEVICE 2: Hirschmann RSP35 Industrial Ethernet Switch (Actual Front RJ45 Port 1 & Port 5) */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-full rounded-md border border-[#00CFFF] bg-[#071D34] px-2 py-1 text-center mb-2">
                      <div className="text-[10.5px] font-extrabold text-white truncate">Industrial Switch</div>
                      <div className="text-[9px] font-mono text-[#7DD3FC] truncate">Hirschmann RSP35 · Station Bus</div>
                    </div>

                    <div
                      onClick={() => setInspectedDevice('SWITCH')}
                      className="relative flex flex-col items-center justify-end h-[118px] w-full cursor-pointer"
                    >
                      <div className="relative inline-flex items-center justify-center">
                        <img
                          src={HW_ASSETS.SWITCH}
                          alt="Hirschmann RSP35 Industrial Ethernet Switch"
                          onLoad={measurePortTopology}
                          className="h-[88px] w-auto object-contain select-none"
                        />
                        {/* Visible RJ45 Port 1 anchor aligned on left front copper port */}
                        <button
                          ref={switchP1Ref}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPort(portInfoMap.SW_P1);
                          }}
                          title="Hirschmann RSP35 — Port 1 (Connected to PowerLogic ION7650 ETH1)"
                          style={{ left: '34%', bottom: '12%' }}
                          className="absolute flex flex-col items-center group"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full mb-0.5"
                            style={{ backgroundColor: isModbusTimeout ? '#EF4444' : '#4ADE80' }}
                          />
                          <span className="w-3.5 h-3 rounded-[2px] border-2 border-[#38BDF8] bg-[#04182B] group-hover:bg-[#0EA5E9] transition block" />
                          <span className="text-[7.5px] font-mono font-extrabold text-[#7DD3FC] bg-[#020B16]/90 px-1 rounded mt-0.5 leading-tight">
                            P1
                          </span>
                        </button>

                        {/* Visible RJ45 Port 5 anchor aligned on right front copper port */}
                        <button
                          ref={switchP5Ref}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPort(portInfoMap.SW_P5);
                          }}
                          title="Hirschmann RSP35 — Port 5 (Connected to SAS Gateway GTW-01 ETH1)"
                          style={{ left: '66%', bottom: '12%' }}
                          className="absolute flex flex-col items-center group"
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full mb-0.5"
                            style={{ backgroundColor: isModbusTimeout ? '#EF4444' : '#4ADE80' }}
                          />
                          <span className="w-3.5 h-3 rounded-[2px] border-2 border-[#38BDF8] bg-[#04182B] group-hover:bg-[#0EA5E9] transition block" />
                          <span className="text-[7.5px] font-mono font-extrabold text-[#7DD3FC] bg-[#020B16]/90 px-1 rounded mt-0.5 leading-tight">
                            P5
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-10 text-center">
                      <div className="text-[11px] font-extrabold text-white">{MODBUS_LAB_NET.switchName}</div>
                      <div className="text-[9.5px] font-mono font-bold text-[#7DD3FC]">{MODBUS_LAB_NET.switchIp}</div>
                      <div className="text-[9px] font-mono text-[#94A3B8]">Port 1 (Meter) ↔ Port 5 (Gateway)</div>
                    </div>
                  </div>

                  {/* DEVICE 3: Industrial SAS Gateway GTW-01 (Actual Front ETH1 & ETH2 Connectors) */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-full rounded-md border border-[#38BDF8] bg-[#071D34] px-2 py-1 text-center mb-2">
                      <div className="text-[10.5px] font-extrabold text-white truncate">Station Gateway</div>
                      <div className="text-[9px] font-mono text-[#7DD3FC] truncate">Modbus Client ↔ IEC-104 Server</div>
                    </div>

                    <div
                      onClick={() => setInspectedDevice('GATEWAY')}
                      className="relative flex flex-col items-center justify-end h-[118px] w-full cursor-pointer"
                    >
                      <div className="relative inline-flex items-center justify-center">
                        <img
                          src={HW_ASSETS.GATEWAY}
                          alt="Industrial SAS Gateway GTW-01"
                          onLoad={measurePortTopology}
                          className="h-[112px] w-auto object-contain select-none"
                        />
                        {/* Gateway ETH1 (Modbus Client 10.132.10.200) */}
                        <button
                          ref={gatewayEth1Ref}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPort(portInfoMap.GW_ETH1);
                          }}
                          title="SAS Gateway GTW-01 — ETH1 (Modbus TCP Client 10.132.10.200)"
                          style={{ left: '22%', bottom: '18%' }}
                          className="absolute flex flex-col items-center group"
                        >
                          <span className="w-3.5 h-3 rounded-[2px] border-2 border-[#38BDF8] bg-[#04182B] group-hover:bg-[#0EA5E9] transition block" />
                          <span className="text-[7.5px] font-mono font-extrabold text-[#7DD3FC] bg-[#020B16]/90 px-1 rounded mt-0.5 leading-tight">
                            ETH1
                          </span>
                        </button>

                        {/* Gateway ETH2 (IEC-104 Server 10.132.20.200) */}
                        <button
                          ref={gatewayEth2Ref}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPort(portInfoMap.GW_ETH2);
                          }}
                          title="SAS Gateway GTW-01 — ETH2 (IEC-104 Server 10.132.20.200)"
                          style={{ left: '52%', bottom: '18%' }}
                          className="absolute flex flex-col items-center group"
                        >
                          <span
                            className="w-3.5 h-3 rounded-[2px] border-2 bg-[#021A10] group-hover:bg-[#22C55E] transition block"
                            style={{ borderColor: isIec104Connected ? '#22C55E' : '#EF4444' }}
                          />
                          <span className="text-[7.5px] font-mono font-extrabold text-[#86EFAC] bg-[#020B16]/90 px-1 rounded mt-0.5 leading-tight">
                            ETH2
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-10 text-center">
                      <div className="text-[11px] font-extrabold text-white">{MODBUS_LAB_NET.gatewayName}</div>
                      <div className="text-[9px] font-mono font-bold text-[#38BDF8]">
                        ETH1: {MODBUS_LAB_NET.gatewayModbusClientIp}
                      </div>
                      <div className="text-[9px] font-mono font-bold text-[#4ADE80]">
                        ETH2: {MODBUS_LAB_NET.gatewayIec104ServerIp}
                      </div>
                    </div>
                  </div>

                  {/* DEVICE 4: RCC / SCADA Workstation (Labeled Ethernet Interface / WAN Uplink) */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="w-full rounded-md border border-[#22C55E] bg-[#071D34] px-2 py-1 text-center mb-2">
                      <div className="text-[10.5px] font-extrabold text-white truncate">RCC / SCADA</div>
                      <div className="text-[9px] font-mono text-[#86EFAC] truncate">IEC 60870-5-104 Client (2404)</div>
                    </div>

                    <div
                      onClick={() => setInspectedDevice('RCC')}
                      className="relative flex flex-col items-center justify-end h-[118px] w-full cursor-pointer"
                    >
                      <div className="relative inline-flex items-center justify-center">
                        <img
                          src={HW_ASSETS.RCC}
                          alt="RCC SCADA Operator Workstation"
                          onLoad={measurePortTopology}
                          className="h-[112px] w-auto object-contain select-none"
                        />
                        {/* RCC Network Interface / Uplink Port */}
                        <button
                          ref={rccEthRef}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setInspectedPort(portInfoMap.RCC_ETH);
                          }}
                          title="RCC / SCADA — Ethernet Interface (IEC 60870-5-104 Client 10.132.20.201)"
                          style={{ left: '12%', bottom: '8%' }}
                          className="absolute flex flex-col items-center group"
                        >
                          <span
                            className="w-3.5 h-3 rounded-[2px] border-2 bg-[#021A10] transition block"
                            style={{
                              borderColor: isIec104Connected ? '#4ADE80' : '#EF4444',
                              boxShadow: rccFlash ? '0 0 10px #4ADE80' : undefined,
                            }}
                          />
                          <span className="text-[7.5px] font-mono font-extrabold text-[#86EFAC] bg-[#020B16]/90 px-1 rounded mt-0.5 leading-tight">
                            RCC ETH
                          </span>
                        </button>
                      </div>
                    </div>

                    <div className="mt-10 text-center">
                      <div className="text-[11px] font-extrabold text-white">{MODBUS_LAB_NET.rccName}</div>
                      <div className="text-[9.5px] font-mono font-bold text-[#86EFAC]">
                        {MODBUS_LAB_NET.rccIec104ClientIp}
                      </div>
                      <div className="text-[9px] font-mono text-[#94A3B8]">Routed WAN · TCP/2404</div>
                    </div>
                  </div>
                </div>

                {/* RESIZEOBSERVER-MEASURED SVG ORTHOGONAL CABLE & PACKET OVERLAY */}
                {cableGeom && (
                  <svg
                    width={cableGeom.width}
                    height={cableGeom.height}
                    viewBox={`0 0 ${cableGeom.width} ${cableGeom.height}`}
                    className="absolute inset-0 z-20 pointer-events-none"
                    aria-hidden="true"
                  >
                    <defs>
                      <filter id="mbPktGlow" x="-40%" y="-40%" width="180%" height="180%">
                        <feGaussianBlur stdDeviation="2.6" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Cable 1: Meter Rear ETH1 -> Switch Port 1 (Shared physical Ethernet cable for Req & Resp) */}
                    <path
                      d={buildOrthogonalPath(cableGeom.cable1)}
                      fill="none"
                      stroke={isModbusTimeout ? '#EF4444' : '#38BDF8'}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeDasharray={isModbusTimeout ? '6 4' : undefined}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setInspectedPort(portInfoMap.SW_P1)}
                    />

                    {/* Cable 2: Switch Port 5 -> Gateway ETH1 (Shared physical Ethernet cable for Req & Resp) */}
                    <path
                      d={buildOrthogonalPath(cableGeom.cable2)}
                      fill="none"
                      stroke={isModbusTimeout ? '#EF4444' : '#38BDF8'}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeDasharray={isModbusTimeout ? '6 4' : undefined}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setInspectedPort(portInfoMap.SW_P5)}
                    />

                    {/* Cable 3: Gateway ETH2 -> Routed WAN -> RCC Ethernet Interface (IEC 60870-5-104 TCP/2404) */}
                    <path
                      d={buildOrthogonalPath(cableGeom.cable3)}
                      fill="none"
                      stroke={isIec104Connected && conversionEnabled ? '#22C55E' : '#EF4444'}
                      strokeWidth="3.2"
                      strokeLinejoin="round"
                      strokeDasharray={!isIec104Connected || !conversionEnabled ? '6 4' : undefined}
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setInspectedPort(portInfoMap.GW_ETH2)}
                    />

                    {/* Routed WAN / Control-Center Network badge on Gateway ETH2 -> RCC path */}
                    <g
                      className="pointer-events-auto cursor-pointer"
                      onClick={() => setInspectedPort(portInfoMap.GW_ETH2)}
                    >
                      <rect
                        x={cableGeom.wanCenter.x - 54}
                        y={cableGeom.wanCenter.y - 10}
                        width="108"
                        height="20"
                        rx="10"
                        fill="#05261A"
                        stroke={isIec104Connected ? '#22C55E' : '#EF4444'}
                        strokeWidth="1.2"
                      />
                      <text
                        x={cableGeom.wanCenter.x}
                        y={cableGeom.wanCenter.y + 3.5}
                        textAnchor="middle"
                        fill={isIec104Connected ? '#86EFAC' : '#FCA5A5'}
                        fontSize="8.2"
                        fontFamily="monospace"
                        fontWeight="800"
                      >
                        WAN · IEC-104:2404
                      </text>
                    </g>

                    {/* Moving Packet Indicator + Directional Arrow Strictly Locked to Measured Cable Path */}
                    {inFlight && pktPos && (
                      <g>
                        <g transform={`translate(${pktPos.x.toFixed(1)}, ${pktPos.y.toFixed(1)}) rotate(${pktPos.angleDeg.toFixed(1)})`}>
                          <circle
                            r="6.5"
                            fill={
                              inFlight.stage === 'MODBUS_REQ_IN_FLIGHT'
                                ? '#00E5FF'
                                : inFlight.stage === 'MODBUS_RESP_IN_FLIGHT'
                                ? isModbusException
                                  ? '#EF4444'
                                  : '#22C55E'
                                : '#4ADE80'
                            }
                            stroke="#FFFFFF"
                            strokeWidth="1.3"
                            filter="url(#mbPktGlow)"
                          />
                          <polygon points="3.5,0 -2.5,-3 -2.5,3" fill="#02101D" />
                        </g>

                        {/* Dynamic Protocol Callout Tag */}
                        {(() => {
                          const boxW = inFlight.stage === 'IEC104_IN_FLIGHT' ? 210 : 196;
                          const boxX = Math.max(8, Math.min(cableGeom.width - boxW - 8, pktPos.x - boxW / 2));
                          const boxY = Math.max(6, pktPos.y - 42);
                          const isReq = inFlight.stage === 'MODBUS_REQ_IN_FLIGHT';
                          const isResp = inFlight.stage === 'MODBUS_RESP_IN_FLIGHT';
                          const strokeC = isReq
                            ? '#38BDF8'
                            : isResp
                            ? isModbusException
                              ? '#EF4444'
                              : '#22C55E'
                            : '#4ADE80';
                          const fillC = isReq
                            ? '#04243B'
                            : isResp
                            ? isModbusException
                              ? '#3B0D15'
                              : '#06291E'
                            : '#052E16';
                          const line1 = isReq
                            ? `Modbus TCP Request | FC${inFlight.fc} | TCP/502`
                            : isResp
                            ? isModbusException
                              ? `Modbus Exception | ${exceptionCodeHex.slice(0, 14)}`
                              : 'Modbus TCP Response | Register Data | TCP/502'
                            : `IEC-104 TCP/2404 | ${inFlight.iec104TypeId} | CA=${inFlight.ca}`;
                          const line2 = isReq
                            ? `TID 0x${inFlight.txId.toString(16).padStart(4, '0').toUpperCase()} · UID ${activeUnitId} · Reg ${inFlight.regAddr}`
                            : isResp
                            ? `${inFlight.rawHex} → ${inFlight.decodedVal}`
                            : `IOA ${inFlight.ioa} · ${inFlight.decodedVal} · ${inFlight.quality} · In-Flight`;

                          return (
                            <g>
                              <rect
                                x={boxX}
                                y={boxY}
                                width={boxW}
                                height="28"
                                rx="5"
                                fill={fillC}
                                stroke={strokeC}
                                strokeWidth="1.2"
                              />
                              <text
                                x={boxX + boxW / 2}
                                y={boxY + 11.5}
                                textAnchor="middle"
                                fill={isReq ? '#7DD3FC' : '#86EFAC'}
                                fontSize="8"
                                fontWeight="800"
                                fontFamily="monospace"
                              >
                                {line1}
                              </text>
                              <text
                                x={boxX + boxW / 2}
                                y={boxY + 22.5}
                                textAnchor="middle"
                                fill="#FFFFFF"
                                fontSize="7.6"
                                fontFamily="monospace"
                              >
                                {line2}
                              </text>
                            </g>
                          );
                        })()}
                      </g>
                    )}
                  </svg>
                )}

                {/* Bottom Engineering Status Strip inside Topology Container */}
                <div className="absolute bottom-2 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 rounded border border-[#163F63] bg-[#041526]/95 px-3 py-1 font-mono text-[9.5px]">
                  <span className="text-[#9BC0DF] font-bold">
                    PIPELINE: <b className="text-white">{phase}</b> | SPEED: {speed}× (Poll {pollIntervalMs} ms) | Click any port/cable to inspect
                  </span>
                  <span className="text-[#4ADE80] font-bold">
                    RCC RX #{rccState.rxCount} · {rccState.typeId} IOA={rccState.ioa} ({rccState.value})
                  </span>
                </div>
              </div>

              {/* Port / Cable Inspection Popup */}
              {inspectedPort && (
                <div className="rounded-lg border border-[#38BDF8] bg-[#061C31] px-3.5 py-2.5 text-[11px] shadow-lg">
                  <div className="flex items-center justify-between border-b border-[#164463] pb-1.5 mb-2">
                    <span className="font-extrabold text-white">{inspectedPort.title}</span>
                    <button
                      type="button"
                      onClick={() => setInspectedPort(null)}
                      className="rounded border border-[#1E5280] bg-[#04101E] px-2 py-0.5 text-[10px] font-bold text-[#7DD3FC]"
                    >
                      Close
                    </button>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 font-mono text-[10.5px]">
                    <div><span className="text-[#8BB3D4]">Connected Device:</span> <b className="text-white">{inspectedPort.connectedDevice}</b></div>
                    <div><span className="text-[#8BB3D4]">Remote Port:</span> <b className="text-[#7DD3FC]">{inspectedPort.remotePort}</b></div>
                    <div><span className="text-[#8BB3D4]">Protocol:</span> <b className="text-[#FDBA74]">{inspectedPort.protocol}</b></div>
                    <div><span className="text-[#8BB3D4]">TCP Port:</span> <b className="text-white">{inspectedPort.tcpPort}</b></div>
                    <div>
                      <span className="text-[#8BB3D4]">Link Status:</span>{' '}
                      <b style={{ color: inspectedPort.linkStatus === 'UP' ? '#4ADE80' : '#F87171' }}>
                        {inspectedPort.linkStatus}
                      </b>
                    </div>
                    <div><span className="text-[#8BB3D4]">Speed/Duplex:</span> <b className="text-slate-200">{inspectedPort.speedDuplex}</b></div>
                  </div>
                </div>
              )}

              {/* Optional Device Inspector Drawer when user clicks any of the 4 devices */}
              {inspectedDevice && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[#0EA5E9] bg-[#061C31] px-3 py-2 text-[11px]">
                  <div className="font-mono text-[#BAE6FD]">
                    {inspectedDevice === 'METER' &&
                      `Device Inspector · Schneider PowerLogic ION7650 (${activeBay.bayCode}) · Modbus TCP Server ${meterServerIp}:502 · Unit ID ${activeUnitId} · Rear ETH1 → RSP35 Port 1`}
                    {inspectedDevice === 'SWITCH' &&
                      `Device Inspector · ${MODBUS_LAB_NET.switchName} · Mgmt IP ${MODBUS_LAB_NET.switchIp} · Port 1 (Meter) ↔ Port 5 (Station Gateway) · 100BASE-TX Full Duplex`}
                    {inspectedDevice === 'GATEWAY' &&
                      `Device Inspector · ${MODBUS_LAB_NET.gatewayName} · ETH1 Modbus Client (${MODBUS_LAB_NET.gatewayModbusClientIp}:502) ↔ ETH2 IEC-104 Server (${MODBUS_LAB_NET.gatewayIec104ServerIp}:2404)`}
                    {inspectedDevice === 'RCC' &&
                      `Device Inspector · ${MODBUS_LAB_NET.rccName} · IEC 60870-5-104 Master (${MODBUS_LAB_NET.rccIec104ClientIp}:2404) · Last RX: ${rccState.typeId} CA=${rccState.ca} IOA=${rccState.ioa} (${rccState.value})`}
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedDevice(null)}
                    className="rounded border border-[#1E5280] bg-[#04101E] px-2 py-0.5 text-[10px] font-bold text-[#7DD3FC]"
                  >
                    Close
                  </button>
                </div>
              )}

              {/* Live RCC Receive Monitor Bar */}
              <div
                style={{
                  backgroundColor: rccFlash ? '#063B23' : '#031524',
                  borderColor: !isIec104Connected ? '#EF4444' : rccFlash ? '#4ADE80' : '#166534',
                }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-1.5 font-mono text-[10.5px] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span
                    style={{ backgroundColor: !isIec104Connected ? '#EF4444' : '#4ADE80' }}
                    className="inline-block w-2 h-2 rounded-full"
                  />
                  <span className="font-bold text-[#86EFAC]">RCC RECEIVE MONITOR (IEC-104 TCP/2404):</span>
                  <span className="text-white font-bold">
                    {!isIec104Connected
                      ? 'TCP/2404 DISCONNECTED — QUEUED AT GATEWAY'
                      : `${rccState.typeId} | CA=${rccState.ca} | IOA=${rccState.ioa} | ${rccState.value} | ${rccState.quality}`}
                  </span>
                </div>
                <div className="text-[#9BC0DF]">
                  RX Count: <b className="text-[#4ADE80]">{rccState.rxCount}</b> · TS: <b className="text-white">{rccState.timestamp}</b>
                </div>
              </div>
            </div>

            {/* LIVE PROTOCOL CONVERSION MONITOR (3 Unclipped Responsive Panels) */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Activity className="w-4 h-4 text-[#4ADE80]" />
                  <span>Live Protocol Conversion Monitor — Modbus TCP → Gateway → IEC-104</span>
                </div>
                <span className="rounded border border-[#1E5280] bg-[#04101E] px-2 py-0.5 font-mono text-[10px] font-bold text-[#7DD3FC]">
                  Stage: {phase}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {/* Panel 1: Modbus TCP Incoming */}
                <div className="min-w-0 rounded-lg border border-[#164463] bg-[#03101E] p-2.5 space-y-1">
                  <div className="flex items-center justify-between border-b border-[#123652] pb-1 text-[10.5px] font-extrabold text-[#7DD3FC]">
                    <span>1. Modbus TCP Incoming</span>
                    <span className="font-mono text-[9.5px] text-[#38BDF8]">TCP/502</span>
                  </div>
                  {[
                    ['Transaction ID', `0x${pollCount.toString(16).padStart(4, '0').toUpperCase()} (#${pollCount})`, '#BAE6FD'],
                    ['Function Code', `FC ${selectedReg.fcShort} (${selectedReg.functionCode.split(' ')[1]?.replace(/[()]/g, '') || 'Input'})`, '#FDBA74'],
                    ['Register / PDU', `${selectedReg.registerAddress} (${selectedReg.pduOffsetHex})`, '#FFFFFF'],
                    ['Raw Hex', selectedReg.rawHexWords, '#FDE047'],
                    ['Decoded Value', isModbusHealthy ? `${selectedReg.engineeringValue} ${selectedReg.unit}` : faultMode, isModbusHealthy ? '#4ADE80' : '#F87171'],
                    ['Frame Status', isModbusTimeout ? 'TCP Timeout' : isModbusException ? exceptionCodeHex : '0x00 OK', isModbusHealthy ? '#4ADE80' : '#F87171'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between gap-2 text-[10.5px]">
                      <span className="text-[#8BB3D4] shrink-0">{k}</span>
                      <span style={{ color: c }} className="font-mono font-bold text-right break-all min-w-0" title={v}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Panel 2: Gateway Processing */}
                <div className="min-w-0 rounded-lg border border-[#0EA5E9] bg-[#041A2E] p-2.5 space-y-1">
                  <div className="flex items-center justify-between border-b border-[#123652] pb-1 text-[10.5px] font-extrabold text-[#38BDF8]">
                    <span>2. Gateway Processing</span>
                    <span className="font-mono text-[9.5px] text-[#9ED8F6]">{MODBUS_LAB_NET.gatewayIec104ServerIp}</span>
                  </div>
                  {[
                    ['Selected Reg', `${selectedReg.registerAddress} · ${selectedReg.parameterName.slice(0, 22)}`, '#FFFFFF'],
                    ['Data Type / Order', `${selectedReg.dataType.split(' ')[0]} · ${wordOrder}`, '#BAE6FD'],
                    ['Scaling Factor', `×${selectedReg.scalingFactor}${faultMode === 'SCALING_ERROR' ? ' (10× ERR)' : ''}`, faultMode === 'SCALING_ERROR' ? '#FBBF24' : '#E2E8F0'],
                    ['Point Mapping', selectedReg.mappedToIec104 ? `IOA ${selectedReg.ioa} (CA ${selectedReg.ca})` : 'Unmapped (Local)', selectedReg.mappedToIec104 ? '#4ADE80' : '#FBBF24'],
                    ['Target Protocol', targetProtocol === 'IEC-104' ? `IEC-104 (${selectedReg.iec104TypeId})` : 'IEC 61850 MMS', '#38BDF8'],
                    ['Derived Quality', selectedReg.derivedQuality, selectedReg.derivedQuality === 'GOOD' ? '#4ADE80' : '#F87171'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between gap-2 text-[10.5px]">
                      <span className="text-[#8BB3D4] shrink-0">{k}</span>
                      <span style={{ color: c }} className="font-mono font-bold text-right break-all min-w-0" title={v}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Panel 3: IEC-104 Outgoing */}
                <div className="min-w-0 rounded-lg border border-[#166534] bg-[#021810] p-2.5 space-y-1">
                  <div className="flex items-center justify-between border-b border-[#14532D] pb-1 text-[10.5px] font-extrabold text-[#4ADE80]">
                    <span>3. IEC-104 Outgoing</span>
                    <span className="font-mono text-[9.5px] text-[#86EFAC]">{MODBUS_LAB_NET.rccIec104ClientIp}:2404</span>
                  </div>
                  {[
                    ['ASDU Type ID', rccState.typeId, '#FFFFFF'],
                    ['CA / IOA', `CA=${rccState.ca} / IOA=${rccState.ioa}`, '#86EFAC'],
                    ['Converted Value', rccState.value, '#4ADE80'],
                    ['Quality', rccState.quality, rccState.quality === 'GOOD' ? '#4ADE80' : '#F87171'],
                    ['TX State', !isIec104Connected ? 'TCP/2404 Down' : inFlight?.stage === 'IEC104_IN_FLIGHT' ? 'In-Flight' : 'Delivered (ACK)', !isIec104Connected ? '#F87171' : '#4ADE80'],
                    ['RCC Receive', `${rccState.lastStage} (#${rccState.rxCount})`, '#4ADE80'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between gap-2 text-[10.5px]">
                      <span className="text-[#8BB3D4] shrink-0">{k}</span>
                      <span style={{ color: c }} className="font-mono font-bold text-right break-all min-w-0" title={v}>
                        {v}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* LIVE REGISTER MONITOR (Compact Table below Topology & Conversion) */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-1.5">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Database className="w-4 h-4 text-[#F97316]" />
                  <span>Live Register Monitor — {activeBay.bayCode} ({activeBay.name})</span>
                </div>
                <span className="font-mono text-[10px] text-[#FDBA74]">
                  Click any row to inspect MBAP/PDU &amp; Gateway Conversion · Word Order: {wordOrder}
                </span>
              </div>

              <div className="overflow-x-auto max-h-[250px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead style={{ backgroundColor: '#0A2540' }} className="text-[#9BC0DF] font-bold sticky top-0">
                    <tr>
                      <th className="py-1.5 px-2">Register</th>
                      <th className="py-1.5 px-2">Parameter</th>
                      <th className="py-1.5 px-2">Type</th>
                      <th className="py-1.5 px-2">Raw Hex</th>
                      <th className="py-1.5 px-2">Decoded Value</th>
                      <th className="py-1.5 px-2">Unit</th>
                      <th className="py-1.5 px-2">IEC-104 Map</th>
                      <th className="py-1.5 px-2">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132E4A] font-mono">
                    {gatewayPoints.map((pt) => {
                      const sel = pt.registerAddress === selectedReg.registerAddress;
                      return (
                        <tr
                          key={pt.registerAddress}
                          onClick={() => {
                            setSelectedRegAddr(pt.registerAddress);
                            setStartRegInput(pt.registerAddress);
                            setFunctionCode(pt.fcShort);
                          }}
                          style={{ backgroundColor: sel ? 'rgba(249, 115, 22, 0.16)' : '#04101E' }}
                          className="cursor-pointer hover:bg-[#0B2540]"
                        >
                          <td className="py-1.5 px-2 font-bold text-[#FDBA74]">
                            {pt.registerAddress} <span className="text-[9.5px] text-slate-400">({pt.pduOffsetHex})</span>
                          </td>
                          <td className="py-1.5 px-2 font-sans font-bold text-white">{pt.parameterName}</td>
                          <td className="py-1.5 px-2 text-slate-300">{pt.dataType.split(' ')[0]}</td>
                          <td className="py-1.5 px-2 text-[#FACC15]">{pt.rawHexWords}</td>
                          <td
                            style={{ color: isModbusHealthy ? '#4ADE80' : '#F87171' }}
                            className="py-1.5 px-2 font-extrabold"
                          >
                            {isModbusTimeout ? 'TIMEOUT' : isModbusException ? faultMode.slice(0, 5) : pt.engineeringValue}
                          </td>
                          <td className="py-1.5 px-2 text-[#BAE6FD]">{pt.unit}</td>
                          <td className="py-1.5 px-2 text-[10px]">
                            {pt.mappedToIec104 ? (
                              <span className="text-[#38BDF8]">{pt.iec104TypeId} / {pt.ioa}</span>
                            ) : (
                              <span className="text-slate-400">Unmapped</span>
                            )}
                          </td>
                          <td className="py-1.5 px-2">
                            <span
                              style={{
                                color:
                                  pt.derivedQuality === 'GOOD'
                                    ? '#4ADE80'
                                    : pt.derivedQuality === 'QUESTIONABLE'
                                    ? '#FBBF24'
                                    : '#F87171',
                              }}
                              className="font-bold"
                            >
                              ● {pt.derivedQuality}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: REGISTER BROWSER */}
      {activeTab === 'REGISTER_BROWSER' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
            <div className="font-extrabold text-white text-sm flex items-center gap-2">
              <Database className="w-4 h-4 text-[#F97316]" />
              <span>Complete Modbus TCP Register Browser — {activeBay.bayCode} (Unit ID {activeUnitId})</span>
            </div>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="text-[#9BC0DF]">FLOAT32 Word Order:</span>
              {(['ABCD', 'CDAB'] as const).map((wo) => (
                <button
                  key={wo}
                  type="button"
                  onClick={() => setWordOrder(wo)}
                  style={{
                    backgroundColor: wordOrder === wo ? '#00CFFF' : '#04101E',
                    color: wordOrder === wo ? '#02101D' : '#9BC0DF',
                  }}
                  className="rounded border border-[#1E5280] px-2 py-0.5 font-bold"
                >
                  {wo}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead style={{ backgroundColor: '#0A2540' }} className="text-[#9BC0DF] font-bold">
                <tr>
                  <th className="py-2 px-2">Register</th>
                  <th className="py-2 px-2">PDU Offset</th>
                  <th className="py-2 px-2">Function Code</th>
                  <th className="py-2 px-2">Parameter</th>
                  <th className="py-2 px-2">Data Type</th>
                  <th className="py-2 px-2">Raw Dec</th>
                  <th className="py-2 px-2">Raw Hex ({wordOrder})</th>
                  <th className="py-2 px-2">Scaling</th>
                  <th className="py-2 px-2">Engineering Value</th>
                  <th className="py-2 px-2">IEC 61850 Reference</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132E4A] font-mono">
                {gatewayPoints.map((pt) => (
                  <tr
                    key={pt.registerAddress}
                    onClick={() => setSelectedRegAddr(pt.registerAddress)}
                    style={{
                      backgroundColor: pt.registerAddress === selectedReg.registerAddress ? 'rgba(249,115,22,0.16)' : '#04101E',
                    }}
                    className="cursor-pointer hover:bg-[#0B2540]"
                  >
                    <td className="py-2 px-2 font-bold text-[#FDBA74]">{pt.registerAddress}</td>
                    <td className="py-2 px-2 text-slate-300">{pt.pduOffsetHex}</td>
                    <td className="py-2 px-2 text-[#77E7FF]">{pt.functionCode}</td>
                    <td className="py-2 px-2 font-sans font-bold text-white">{pt.parameterName}</td>
                    <td className="py-2 px-2 text-slate-300">{pt.dataType}</td>
                    <td className="py-2 px-2 text-[#FACC15]">{pt.rawRegisterValue}</td>
                    <td className="py-2 px-2 text-[#7DD3FC]">{pt.rawHexWords}</td>
                    <td className="py-2 px-2 text-slate-300">×{pt.scalingFactor}</td>
                    <td className="py-2 px-2 font-bold text-[#4ADE80]">{pt.engineeringValue} {pt.unit}</td>
                    <td className="py-2 px-2 text-[10px] text-[#38BDF8]">{pt.iec61850SourceRef}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: POLLING CONFIGURATION & PRACTICAL METERING EXERCISES */}
      {activeTab === 'POLLING_CONFIG' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2 flex items-center gap-2">
              <Settings className="w-4 h-4 text-[#F97316]" />
              <span>Modbus TCP Client Polling Parameters</span>
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-[#9BC0DF] mb-1">Server IP (Meter)</label>
                <input readOnly value={meterServerIp} className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2.5 py-1.5 font-mono text-[#38BDF8]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#9BC0DF] mb-1">Client IP (Gateway)</label>
                <input readOnly value={MODBUS_LAB_NET.gatewayModbusClientIp} className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2.5 py-1.5 font-mono text-[#7DD3FC]" />
              </div>
              <div>
                <label className="block text-[11px] text-[#9BC0DF] mb-1">Poll Interval (ms)</label>
                <select value={pollIntervalMs} onChange={(e) => setPollIntervalMs(Number(e.target.value))} className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2.5 py-1.5 font-mono text-white">
                  <option value={500}>500 ms</option>
                  <option value={1000}>1000 ms (Default)</option>
                  <option value={2000}>2000 ms</option>
                  <option value={5000}>5000 ms</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#9BC0DF] mb-1">Response Timeout (ms)</label>
                <select value={timeoutMs} onChange={(e) => setTimeoutMs(Number(e.target.value))} className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2.5 py-1.5 font-mono text-white">
                  <option value={500}>500 ms</option>
                  <option value={1000}>1000 ms</option>
                  <option value={3000}>3000 ms</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPollingActive((p) => !p)} className="flex-1 rounded-lg border border-[#22C55E] bg-[#06291E] py-2 font-extrabold text-[#4ADE80]">
                {pollingActive ? 'Stop Cyclic Polling' : 'Start Cyclic Polling'}
              </button>
              <button type="button" onClick={() => launchPollCycle(selectedReg)} className="flex-1 rounded-lg bg-[#F97316] py-2 font-extrabold text-[#03101E]">
                Issue Manual Poll (TCP/502)
              </button>
            </div>
          </div>

          <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-2.5">
            <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
              Practical Metering Exercises (Preserved Register Map)
            </h3>
            {exercises.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => {
                  setActiveExercise(ex.id);
                  setSelectedRegAddr(ex.reg);
                  setStartRegInput(ex.reg);
                  setFunctionCode(ex.fc);
                  setQuantityInput(ex.qty);
                  const pt = gatewayPoints.find((g) => g.registerAddress === ex.reg);
                  if (pt) launchPollCycle(pt);
                }}
                style={{
                  backgroundColor: activeExercise === ex.id ? '#112E4B' : '#04101E',
                  borderColor: activeExercise === ex.id ? '#F97316' : '#163856',
                }}
                className="w-full text-left p-2.5 rounded-lg border transition"
              >
                <div className="font-bold text-white text-xs">{ex.title}</div>
                <div className="text-[11px] text-[#9BC0DF] mt-0.5">{ex.desc}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: GATEWAY REGISTER MAPPING */}
      {activeTab === 'REGISTER_MAPPING' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white">
              Gateway Point Mapping — Modbus TCP (502) → IEC 60870-5-104 (2404)
            </h3>
            <span className="font-mono text-[11px] text-[#86EFAC]">
              Gateway {MODBUS_LAB_NET.gatewayIec104ServerIp} → RCC {MODBUS_LAB_NET.rccIec104ClientIp} · CA={MODBUS_LAB_NET.commonAddress}
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-[11px]">
              <thead style={{ backgroundColor: '#0A2540' }} className="text-[#9BC0DF] font-bold">
                <tr>
                  <th className="py-2 px-2">Modbus Reg</th>
                  <th className="py-2 px-2">FC</th>
                  <th className="py-2 px-2">Data Type</th>
                  <th className="py-2 px-2">Raw Val</th>
                  <th className="py-2 px-2">Scaling</th>
                  <th className="py-2 px-2">Eng. Value</th>
                  <th className="py-2 px-2">IEC-104 Type</th>
                  <th className="py-2 px-2">CA</th>
                  <th className="py-2 px-2">IOA</th>
                  <th className="py-2 px-2">Derived Quality</th>
                  <th className="py-2 px-2">Mapping Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132E4A] font-mono">
                {gatewayPoints.map((pt) => (
                  <tr key={pt.registerAddress} className="bg-[#04101E] hover:bg-[#0B2540]">
                    <td className="py-2 px-2 font-bold text-[#FDBA74]">{pt.registerAddress}</td>
                    <td className="py-2 px-2 text-[#77E7FF]">FC {pt.fcShort}</td>
                    <td className="py-2 px-2 text-slate-300">{pt.dataType.split(' ')[0]}</td>
                    <td className="py-2 px-2 text-[#FACC15]">{pt.rawRegisterValue}</td>
                    <td className="py-2 px-2 text-slate-300">×{pt.scalingFactor}</td>
                    <td className="py-2 px-2 font-bold text-[#4ADE80]">{pt.engineeringValue} {pt.unit}</td>
                    <td className="py-2 px-2 text-[#38BDF8]">{pt.iec104TypeId}</td>
                    <td className="py-2 px-2 text-white">{pt.mappedToIec104 ? pt.ca : '—'}</td>
                    <td className="py-2 px-2 text-white">{pt.mappedToIec104 ? pt.ioa : '—'}</td>
                    <td className="py-2 px-2" style={{ color: pt.derivedQuality === 'GOOD' ? '#4ADE80' : '#F87171' }}>
                      {pt.derivedQuality}
                    </td>
                    <td className="py-2 px-2 font-bold" style={{ color: pt.mappingStatus === 'Mapped' ? '#4ADE80' : pt.mappingStatus === 'Conversion Fault' ? '#F87171' : '#94A3B8' }}>
                      {pt.mappingStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 5: PROTOCOL CONVERSION DETAILS */}
      {activeTab === 'PROTOCOL_CONVERSION' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
            Gateway Protocol Conversion &amp; Quality Derivation Engine
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-lg border border-[#164463] bg-[#04101E] p-3 space-y-1.5">
              <div className="font-extrabold text-[#FDBA74]">Stage 1 — Modbus TCP Polling (Port 502)</div>
              <p className="text-[#9BC0DF] text-[11px]">
                Gateway ({MODBUS_LAB_NET.gatewayModbusClientIp}) acts as Modbus Client polling PowerLogic ION7650 ({meterServerIp}, Unit ID {activeUnitId}).
              </p>
              <div className="font-mono text-[11px] text-white">
                Active Reg: {selectedReg.registerAddress} · Raw: {selectedReg.rawHexWords}
              </div>
            </div>
            <div className="rounded-lg border border-[#0EA5E9] bg-[#041A2E] p-3 space-y-1.5">
              <div className="font-extrabold text-[#38BDF8]">Stage 2 — Scaling &amp; Quality Derivation</div>
              <p className="text-[#9BC0DF] text-[11px]">
                Modbus has no native IEC 61850 quality attribute. Gateway derives <b className="text-white">{derivedQuality}</b> from TCP reachability, exception status, and scaling integrity.
              </p>
              <div className="font-mono text-[11px] text-[#4ADE80]">
                Decoded: {selectedReg.engineeringValue} {selectedReg.unit} (Order: {wordOrder})
              </div>
            </div>
            <div className="rounded-lg border border-[#166534] bg-[#021810] p-3 space-y-1.5">
              <div className="font-extrabold text-[#4ADE80]">Stage 3 — IEC 60870-5-104 Telecontrol (Port 2404)</div>
              <p className="text-[#9BC0DF] text-[11px]">
                Mapped registers are encapsulated into IEC-104 ASDUs and sent from {MODBUS_LAB_NET.gatewayIec104ServerIp}:2404 to RCC ({MODBUS_LAB_NET.rccIec104ClientIp}).
              </p>
              <div className="font-mono text-[11px] text-[#86EFAC]">
                {selectedReg.mappedToIec104 ? `${selectedReg.iec104TypeId} · CA=${selectedReg.ca} · IOA=${selectedReg.ioa}` : 'Unmapped local register'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: WIRESHARK-STYLE MODBUS PACKET ANALYZER */}
      {activeTab === 'PACKET_ANALYZER' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
            <div className="flex items-center gap-2 font-extrabold text-white text-sm">
              <Terminal className="w-4 h-4 text-[#00CFFF]" />
              <span>Wireshark-Style Modbus TCP (MBAP + PDU) Frame Analyzer — TCP/502</span>
            </div>
            <div className="flex items-center gap-1.5">
              {(['REQUEST', 'RESPONSE'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setDissectorFrame(f)}
                  style={{
                    backgroundColor: dissectorFrame === f ? '#00CFFF' : '#04101E',
                    color: dissectorFrame === f ? '#02101D' : '#9BC0DF',
                  }}
                  className="rounded border border-[#1E5280] px-3 py-1 font-mono text-[11px] font-extrabold"
                >
                  {f === 'REQUEST' ? 'Modbus Request (GW → Meter)' : 'Modbus Response (Meter → GW)'}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-lg bg-[#020913] border border-[#193E63] p-3.5 font-mono text-[11.5px] leading-relaxed space-y-1.5">
            <div className="text-[#94A3B8]">
              ▾ Ethernet II, Src: {dissectorFrame === 'REQUEST' ? '00:90:E8:GT:W0:01 (GTW-01)' : '00:80:F4:IO:N7:65 (ION7650)'} → Dst: {dissectorFrame === 'REQUEST' ? '00:80:F4:IO:N7:65 (ION7650)' : '00:90:E8:GT:W0:01 (GTW-01)'}, Type: IPv4 (0x0800)
            </div>
            <div className="text-[#7DD3FC]">
              ▾ Internet Protocol Version 4, Src: {dissectorFrame === 'REQUEST' ? MODBUS_LAB_NET.gatewayModbusClientIp : meterServerIp} → Dst: {dissectorFrame === 'REQUEST' ? meterServerIp : MODBUS_LAB_NET.gatewayModbusClientIp}, Protocol: TCP (6)
            </div>
            <div className="text-[#FDBA74]">
              ▾ Transmission Control Protocol, Src Port: {dissectorFrame === 'REQUEST' ? '54112' : '502'} → Dst Port: {dissectorFrame === 'REQUEST' ? '502' : '54112'}, Flags: [PSH, ACK]
            </div>
            <div className="text-[#00CFFF] font-bold">▾ Modbus/TCP MBAP Header (7 Bytes)</div>
            <div className="pl-5 text-slate-200">
              Transaction Identifier: {pollCount} (0x{pollCount.toString(16).padStart(4, '0').toUpperCase()}) · Protocol Identifier: 0x0000 (Modbus) · Length: {dissectorFrame === 'REQUEST' ? 6 : isModbusException ? 3 : 3 + (selectedReg.dataType === 'UINT16' ? 2 : 4)} bytes · Unit Identifier: {activeUnitId}
            </div>
            <div className="text-[#4ADE80] font-bold">
              ▾ Modbus Protocol Data Unit (PDU) — {dissectorFrame}
            </div>
            {dissectorFrame === 'REQUEST' ? (
              <div className="pl-5 text-slate-200">
                Function Code: 0x{selectedReg.fcShort} ({selectedReg.functionCode}) · Starting Address: {selectedReg.pduOffsetHex} (Reg {selectedReg.registerAddress}) · Register Quantity: {selectedReg.dataType === 'UINT16' ? 1 : 2}
              </div>
            ) : isModbusTimeout ? (
              <div className="pl-5 text-[#F87171]">
                [NO RESPONSE RECEIVED — TCP TIMEOUT &gt; {timeoutMs} ms. Note: A TCP timeout is a transport failure, NOT a Modbus Exception frame.]
              </div>
            ) : isModbusException ? (
              <div className="pl-5 text-[#F87171]">
                Exception Function Code: 0x{(parseInt(selectedReg.fcShort, 10) + 0x80).toString(16).toUpperCase()} · Exception Code: {exceptionCodeHex}
              </div>
            ) : (
              <div className="pl-5 text-slate-200">
                Function Code: 0x{selectedReg.fcShort} · Byte Count: {selectedReg.dataType === 'UINT16' ? 2 : 4} · Register Bytes ({wordOrder}): {selectedReg.rawHexWords} · Decoded Value: {selectedReg.engineeringValue} {selectedReg.unit}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: FAULT INJECTION */}
      {activeTab === 'FAULT_INJECTION' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex items-center justify-between border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FFB547]" />
              <span>Modbus TCP &amp; Protocol Conversion Fault Injection</span>
            </h3>
            <span className="font-mono text-[11px] text-[#FDBA74]">Active Scenario: {faultMode}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {faultButtons.map((fb) => {
              const active = faultMode === fb.id;
              return (
                <button
                  key={fb.id}
                  type="button"
                  onClick={() => {
                    setFaultMode(fb.id);
                    if (fb.id === 'WRONG_UNIT_ID') setUnitIdOverride(configuredUnitId === 11 ? 99 : 11);
                    else setUnitIdOverride(null);
                  }}
                  style={{
                    backgroundColor: active ? (fb.id === 'NONE' ? '#06291E' : '#3B0D15') : '#04101E',
                    borderColor: active ? (fb.id === 'NONE' ? '#22C55E' : '#EF4444') : '#163856',
                  }}
                  className="p-3 rounded-lg border text-left transition hover:border-[#38BDF8]"
                >
                  <div className="text-[10px] font-mono text-[#9BC0DF]">{fb.category}</div>
                  <div className="font-extrabold text-white text-xs mt-0.5">{fb.label}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 8: LOGS & DIAGNOSTICS */}
      {activeTab === 'LOGS_DIAGNOSTICS' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white">Full Protocol Message Log</h3>
            <div className="flex gap-1.5">
              {(['ALL', 'Modbus TCP', 'Gateway', 'IEC-104'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setLogFilter(f)}
                  style={{
                    backgroundColor: logFilter === f ? '#00CFFF' : '#04101E',
                    color: logFilter === f ? '#02101D' : '#9BC0DF',
                  }}
                  className="rounded border border-[#1E5280] px-2.5 py-1 text-[10.5px] font-bold"
                >
                  {f}
                </button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-[11px] font-mono">
              <thead style={{ backgroundColor: '#0A2540' }} className="text-[#9BC0DF] sticky top-0">
                <tr>
                  <th className="py-1.5 px-2">Time</th>
                  <th className="py-1.5 px-2">Protocol</th>
                  <th className="py-1.5 px-2">Source → Destination</th>
                  <th className="py-1.5 px-2">Transaction Details</th>
                  <th className="py-1.5 px-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132E4A]">
                {filteredLogs.map((l) => (
                  <tr key={l.id} className="bg-[#04101E]">
                    <td className="py-1.5 px-2 text-[#7DD3FC]">{l.time}</td>
                    <td className="py-1.5 px-2 font-bold" style={{ color: l.protocol === 'IEC-104' ? '#4ADE80' : l.protocol === 'Gateway' ? '#38BDF8' : '#FDBA74' }}>{l.protocol}</td>
                    <td className="py-1.5 px-2 text-[#BAE6FD]">{l.direction}</td>
                    <td className="py-1.5 px-2 text-white">{l.details}</td>
                    <td className="py-1.5 px-2 font-bold" style={{ color: l.result === 'Success' || l.result === 'Delivered' ? '#4ADE80' : '#F87171' }}>{l.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. BOTTOM THREE COMPACT PANELS: COMMUNICATION TIMELINE, MESSAGE LOG, LIVE DIAGNOSTICS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* Communication Timeline (3 cols) */}
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="lg:col-span-3 rounded-xl border p-3 space-y-2 min-w-0">
          <div className="flex items-center gap-1.5 font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5">
            <Radio className="w-3.5 h-3.5 text-[#00CFFF]" />
            <span>Communication Timeline</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {timeline.slice(-8).map((ev) => {
              const c =
                ev.stage === 'REQ'
                  ? '#38BDF8'
                  : ev.stage === 'RESP'
                  ? '#22C55E'
                  : ev.stage === 'CONV'
                  ? '#FDBA74'
                  : ev.stage === 'TX104' || ev.stage === 'RCC'
                  ? '#4ADE80'
                  : '#F87171';
              return (
                <div
                  key={ev.id}
                  style={{ borderColor: c }}
                  className="rounded border bg-[#04101E] px-2 py-1 font-mono text-[10px]"
                >
                  <span style={{ color: c }} className="font-extrabold">{ev.stage}</span>{' '}
                  <span className="text-white">{ev.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message Log (6 cols) */}
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="lg:col-span-6 rounded-xl border p-3 space-y-2 min-w-0">
          <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5">
            <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
              <FileCode2 className="w-3.5 h-3.5 text-[#FDBA74]" />
              <span>Message Log (Latest)</span>
            </div>
            <span className="font-mono text-[10px] text-[#9BC0DF]">Modbus TCP (502) &amp; IEC-104 (2404)</span>
          </div>
          <div className="overflow-x-auto max-h-[135px] overflow-y-auto">
            <table className="w-full text-left border-collapse text-[10.5px] font-mono">
              <tbody className="divide-y divide-[#132E4A]">
                {logs.slice(0, 6).map((l) => (
                  <tr key={l.id}>
                    <td className="py-1 pr-2 text-[#7DD3FC] whitespace-nowrap">{l.time}</td>
                    <td className="py-1 pr-2 font-bold whitespace-nowrap" style={{ color: l.protocol === 'IEC-104' ? '#4ADE80' : l.protocol === 'Gateway' ? '#38BDF8' : '#FDBA74' }}>
                      {l.protocol}
                    </td>
                    <td className="py-1 pr-2 text-slate-200 truncate max-w-[280px]" title={l.details}>
                      {l.details}
                    </td>
                    <td className="py-1 text-right font-bold whitespace-nowrap" style={{ color: l.result === 'Success' || l.result === 'Delivered' ? '#4ADE80' : '#F87171' }}>
                      {l.result}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Diagnostics (3 cols) */}
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="lg:col-span-3 rounded-xl border p-3 space-y-1.5 min-w-0">
          <div className="flex items-center gap-1.5 font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5">
            <Zap className="w-3.5 h-3.5 text-[#4ADE80]" />
            <span>Live Diagnostics</span>
          </div>
          {[
            ['Modbus TCP (502)', !isModbusTimeout ? 'Connected' : 'Timeout', !isModbusTimeout ? '#4ADE80' : '#F87171'],
            ['Polling Status', pollingActive ? `Active (${pollIntervalMs} ms)` : 'Stopped', pollingActive ? '#4ADE80' : '#FBBF24'],
            ['Response Time', isModbusTimeout ? '—' : `${lastResponseMs} ms`, '#7DD3FC'],
            ['Timeouts / Exceptions', `${timeoutCount} / ${exceptionCount}`, timeoutCount + exceptionCount > 0 ? '#F87171' : '#4ADE80'],
            ['Gateway Mapping', isGatewayConvOk ? 'Active (9/10)' : 'Fault/Off', isGatewayConvOk ? '#4ADE80' : '#F87171'],
            ['IEC-104 (2404)', isIec104Connected ? 'Connected' : 'Disconnected', isIec104Connected ? '#4ADE80' : '#F87171'],
            ['RCC Point RX', `#${rccState.rxCount} (${derivedQuality})`, derivedQuality === 'GOOD' ? '#4ADE80' : '#FBBF24'],
          ].map(([k, v, c]) => (
            <div key={k} className="flex justify-between gap-2 text-[10.5px]">
              <span className="text-[#9BC0DF]">{k}</span>
              <span style={{ color: c }} className="font-mono font-bold">{v}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
