import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { getIedImageByModel } from '../data/iedImageRegistry';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  FileCode2,
  FolderTree,
  Layers,
  Pause,
  Play,
  Radio,
  RefreshCw,
  RotateCcw,
  Server,
  ShieldAlert,
  Sliders,
  Terminal,
  Zap,
} from 'lucide-react';

type MmsLabTab =
  | 'MMS_CLIENT_SERVER'
  | 'DATA_MODEL'
  | 'RCBS'
  | 'GI'
  | 'CONTROL'
  | 'PROTOCOL_CONVERSION'
  | 'PACKET_ANALYZER'
  | 'DIAGNOSTICS';

type MmsFaultMode =
  | 'NONE'
  | 'TCP_102_BLOCKED'
  | 'MMS_ASSOC_FAIL'
  | 'IED_OFFLINE'
  | 'GATEWAY_UNAVAILABLE'
  | 'RCB_DISABLED'
  | 'MAPPING_MISSING'
  | 'TYPE_MISMATCH'
  | 'INVALID_QUALITY'
  | 'IEC104_DISCONNECTED'
  | 'COMMAND_REJECTED';

interface GatewayPointRow {
  idx: number;
  iecRef: string;
  fc: 'ST' | 'MX' | 'CO';
  mmsVal: string;
  iec104Type: string;
  ca: number;
  ioa: number;
  convertedVal: string;
  quality: 'Good' | 'Invalid';
  mapped: boolean;
}

interface LogEntry {
  time: string;
  protocol: 'MMS' | 'IEC-104';
  service: string;
  details: string;
  result: 'Success' | 'Delivered' | 'Failed';
  kind: 'Association' | 'Read' | 'Write' | 'Report' | 'Control' | 'GI' | 'Error';
}

function nowTimeMs(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

// Single authoritative network addressing configuration for MMS Lab V2 (unique IPs per device)
const MMS_LAB_NETWORK_CONFIG = {
  gatewayMmsClientIp: '10.132.10.200',
  gatewayIec104ServerIp: '10.132.20.200',
  rccIec104ClientIp: '10.132.20.201', // Simulated RCC client IP (unique from Gateway 10.132.20.200)
  mmsTcpPort: 102,
  iec104TcpPort: 2404,
} as const;

type Iec104FlowState =
  | 'MMS_RECEIVED'
  | 'MAPPING_COMPLETED'
  | 'ASDU_CREATED'
  | 'IEC104_IN_FLIGHT'
  | 'RCC_RECEIVED'
  | 'RCC_POINT_UPDATED'
  | 'FAILED';

export const MmsLabPage: React.FC = () => {
  const {
    ieds,
    bays,
    networkLinks,
    selectedIedId,
    setSelectedIedId,
    toggleRcbEnabled,
    triggerMmsGeneralInterrogation,
    commandBreaker,
  } = useSubstationStore();

  // Default to IED_33_TF1 (ABB Relion RET615) matching reference screenshot, falling back to selectedIedId
  const defaultIed = useMemo(
    () =>
      ieds.find((i) => i.name.includes('33_TF1') || i.id.includes('33-TF1')) ||
      ieds.find((i) => i.id === selectedIedId) ||
      ieds[0],
    [ieds, selectedIedId]
  );

  const [localIedId, setLocalIedId] = useState<string>(defaultIed?.id || 'IED-33-TF1');
  const selectedIed = useMemo(
    () => ieds.find((i) => i.id === localIedId) || defaultIed,
    [ieds, localIedId, defaultIed]
  );
  const associatedBay = useMemo(
    () => bays.find((b) => b.id === selectedIed?.bayId) || bays[0],
    [bays, selectedIed?.bayId]
  );

  const [activeTab, setActiveTab] = useState<MmsLabTab>('PROTOCOL_CONVERSION');
  // Mandatory default animation speed = 0.5x
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(0.5);
  const [playing, setPlaying] = useState<boolean>(true);
  const [manualDisconnect, setManualDisconnect] = useState<boolean>(false);
  const [lanAUp, setLanAUp] = useState<boolean>(true);
  const [lanBUp, setLanBUp] = useState<boolean>(true);
  const [faultMode, setFaultMode] = useState<MmsFaultMode>('NONE');
  const [selectedPointIdx, setSelectedPointIdx] = useState<number>(1);
  const [selectedLdInst, setSelectedLdInst] = useState<string>(
    selectedIed?.logicalDevices[0]?.ldInst || 'Application'
  );
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>('');
  const [inspectedDevice, setInspectedDevice] = useState<string | null>(null);
  const [pktFilter, setPktFilter] = useState<'ALL' | 'MMS' | 'IEC-104'>('ALL');
  const [lastActivity, setLastActivity] = useState<string>(nowTimeMs());
  const [seqCounter, setSeqCounter] = useState<number>(42);

  // Event-driven IEC-104 Gateway -> RCC transmission pipeline state
  const [inFlight104, setInFlight104] = useState<{
    id: number;
    typeId: string;
    ca: number;
    ioa: number;
    value: string;
    quality: 'Good' | 'Invalid';
    cot: number;
    ns: number;
    progress: number; // 0 -> 1 along Gateway -> RCC cable
    stage: 'MMS_RX' | 'GW_MAPPED' | 'ASDU_CREATED' | 'IEC104_SENT' | 'RCC_RECEIVED' | 'RCC_UPDATED';
  } | null>(null);
  const [rccFlash, setRccFlash] = useState<boolean>(false);
  const [rccState, setRccState] = useState<{
    typeId: string;
    ca: number;
    ioa: number;
    value: string;
    quality: 'Good' | 'Invalid';
    timestamp: string;
    rxCount: number;
    apciNs: number;
    apciNr: number;
    lastStage: string;
  }>(() => ({
    typeId: 'M_DP_NA_1',
    ca: 1,
    ioa: 1001,
    value: 'CLOSED',
    quality: 'Good',
    timestamp: nowTimeMs(),
    rxCount: 148,
    apciNs: 42,
    apciNr: 42,
    lastStage: 'RCC Point Updated',
  }));
  const pointCursorRef = useRef<number>(0);
  const nextEventIdRef = useRef<number>(1);
  const processedEventIdsRef = useRef<Set<number>>(new Set());
  const [flowState, setFlowState] = useState<Iec104FlowState>('RCC_POINT_UPDATED');

  const [logs, setLogs] = useState<LogEntry[]>(() => [
    { time: nowTimeMs(), protocol: 'IEC-104', service: 'M_ME_NC_1', details: 'IOA=1101, Value=318.6 A', result: 'Delivered', kind: 'Report' },
    { time: nowTimeMs(), protocol: 'MMS', service: 'Report (URCB)', details: 'MMXU1.A.phsA.mag.f = 318.6 A', result: 'Success', kind: 'Report' },
    { time: nowTimeMs(), protocol: 'IEC-104', service: 'M_DP_NA_1', details: 'IOA=1001, DPI=2 (CLOSED)', result: 'Delivered', kind: 'Report' },
    { time: nowTimeMs(), protocol: 'MMS', service: 'Report (BRCB)', details: 'XCBR1.Pos.stVal = 1 (CLOSED)', result: 'Success', kind: 'Report' },
  ]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const anyLanUp = lanAUp || lanBUp;
  const mmsConnected =
    !manualDisconnect &&
    anyLanUp &&
    selectedIed?.mmsConnected !== false &&
    faultMode !== 'TCP_102_BLOCKED' &&
    faultMode !== 'MMS_ASSOC_FAIL' &&
    faultMode !== 'IED_OFFLINE' &&
    faultMode !== 'GATEWAY_UNAVAILABLE';

  const iec104Connected =
    mmsConnected &&
    faultMode !== 'IEC104_DISCONNECTED' &&
    faultMode !== 'GATEWAY_UNAVAILABLE';

  const conversionActive =
    iec104Connected && faultMode !== 'MAPPING_MISSING' && faultMode !== 'TYPE_MISMATCH';

  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (playing) svg.unpauseAnimations?.();
      else svg.pauseAnimations?.();
    } catch {
      // Non-DOM fallback
    }
  }, [playing]);

  const addLog = (entry: Omit<LogEntry, 'time'>) => {
    const t = nowTimeMs();
    setLastActivity(t);
    setLogs((prev) => [{ time: t, ...entry }, ...prev].slice(0, 20));
  };

  // Authoritative 5-point Gateway Mapping Table derived from selectedIed & associatedBay
  const isClosed = associatedBay?.breakerState === 'CLOSED';
  const liveCurrent = associatedBay ? associatedBay.currentA.toFixed(1) : '318.6';
  const liveVoltage = associatedBay ? associatedBay.voltageAbKv.toFixed(2) : '33.12';
  const qualFlag: 'Good' | 'Invalid' =
    faultMode === 'INVALID_QUALITY' || !mmsConnected ? 'Invalid' : 'Good';

  const mappingRows: GatewayPointRow[] = useMemo(
    () => [
      {
        idx: 1,
        iecRef: 'XCBR1.Pos.stVal',
        fc: 'ST',
        mmsVal: isClosed ? 'TRUE (1) — Closed' : 'FALSE (0) — Open',
        iec104Type: faultMode === 'TYPE_MISMATCH' ? 'M_SP_NA_1 (ERR)' : 'M_DP_NA_1',
        ca: 1,
        ioa: 1001,
        convertedVal: isClosed ? '2 — ON / CLOSED' : '1 — OFF / OPEN',
        quality: qualFlag,
        mapped: faultMode !== 'MAPPING_MISSING' && faultMode !== 'TYPE_MISMATCH',
      },
      {
        idx: 2,
        iecRef: 'PTRC1.Op.general',
        fc: 'ST',
        mmsVal: associatedBay?.protectionTripActive ? 'TRUE (1)' : 'FALSE (0)',
        iec104Type: 'M_SP_NA_1',
        ca: 1,
        ioa: 1002,
        convertedVal: associatedBay?.protectionTripActive ? '1 (TRIP)' : '0 (NORMAL)',
        quality: qualFlag,
        mapped: faultMode !== 'MAPPING_MISSING',
      },
      {
        idx: 3,
        iecRef: 'MMXU1.A.phsA.mag.f',
        fc: 'MX',
        mmsVal: `${liveCurrent} A`,
        iec104Type: 'M_ME_NC_1',
        ca: 1,
        ioa: 1101,
        convertedVal: `${liveCurrent} A`,
        quality: qualFlag,
        mapped: faultMode !== 'MAPPING_MISSING',
      },
      {
        idx: 4,
        iecRef: 'MMXU1.U.phsA.mag.f',
        fc: 'MX',
        mmsVal: `${liveVoltage} kV`,
        iec104Type: 'M_ME_NC_1',
        ca: 1,
        ioa: 1102,
        convertedVal: `${liveVoltage} kV`,
        quality: qualFlag,
        mapped: faultMode !== 'MAPPING_MISSING',
      },
      {
        idx: 5,
        iecRef: 'CSWI1.Pos.stVal',
        fc: 'ST',
        mmsVal: isClosed ? 'ON (2)' : 'OFF (1)',
        iec104Type: 'M_SP_NA_1',
        ca: 1,
        ioa: 1201,
        convertedVal: isClosed ? '1 (CLOSED)' : '0 (OPEN)',
        quality: qualFlag,
        mapped: faultMode !== 'MAPPING_MISSING',
      },
    ],
    [isClosed, associatedBay?.protectionTripActive, liveCurrent, liveVoltage, qualFlag, faultMode]
  );

  // Dispatch an event-driven MMS Report -> Gateway Mapping -> IEC-104 ASDU -> RCC packet
  const dispatchIec104Event = (row: GatewayPointRow) => {
    if (!mmsConnected) return;
    const tNow = nowTimeMs();
    setLastActivity(tNow);
    setSeqCounter((c) => c + 1);

    // Step 1: MMS_RECEIVED
    setFlowState('MMS_RECEIVED');
    if (faultMode === 'RCB_DISABLED') {
      setFlowState('FAILED');
      addLog({
        protocol: 'MMS',
        service: 'Report Suppressed',
        details: `${row.iecRef} blocked (BRCB/URCB RptEna=0)`,
        result: 'Failed',
        kind: 'Error',
      });
      return;
    }

    // Step 2: MAPPING_COMPLETED check
    if (!row.mapped || faultMode === 'MAPPING_MISSING' || faultMode === 'TYPE_MISMATCH') {
      setFlowState('FAILED');
      addLog({
        protocol: 'IEC-104',
        service: 'Mapping Error',
        details: `Gateway failed to map ${row.iecRef} (${faultMode})`,
        result: 'Failed',
        kind: 'Error',
      });
      return;
    }

    setFlowState('MAPPING_COMPLETED');
    // Step 3-4: ASDU_CREATED & TCP/2404 Session Check
    setFlowState('ASDU_CREATED');
    if (!iec104Connected) {
      setFlowState('FAILED');
      addLog({
        protocol: 'IEC-104',
        service: `${row.iec104Type} Queued`,
        details: `TCP/2404 disconnected — IOA=${row.ioa} not delivered to RCC`,
        result: 'Failed',
        kind: 'Error',
      });
      return;
    }

    const shortVal = row.convertedVal.includes('CLOSED')
      ? 'CLOSED'
      : row.convertedVal.includes('OPEN')
      ? 'OPEN'
      : row.convertedVal;

    const eventId = nextEventIdRef.current++;
    setFlowState('IEC104_IN_FLIGHT');
    setInFlight104({
      id: eventId,
      typeId: row.iec104Type,
      ca: row.ca,
      ioa: row.ioa,
      value: shortVal,
      quality: row.quality,
      cot: 3, // Spontaneous
      ns: seqCounter + 1,
      progress: 0,
      stage: 'IEC104_SENT',
    });
  };

  // Shared periodic report scheduler (respects Pause & Speed; default 0.5x)
  useEffect(() => {
    if (!playing || !mmsConnected || inFlight104) return;
    const delayMs = Math.max(450, Math.round(1400 / speed));
    const tid = window.setTimeout(() => {
      const candidates = [mappingRows[0], mappingRows[2], mappingRows[3]];
      const row = candidates[pointCursorRef.current % candidates.length];
      pointCursorRef.current += 1;
      dispatchIec104Event(row);
    }, delayMs);
    return () => window.clearTimeout(tid);
  }, [playing, speed, mmsConnected, iec104Connected, faultMode, inFlight104, mappingRows]);

  // Smooth requestAnimationFrame motion for the in-flight green IEC-104 packet (0.5x = half speed; Pause freezes in place)
  useEffect(() => {
    if (!playing || !inFlight104) return;
    let rafId = 0;
    let lastTs = performance.now();
    // Base 1x travel duration = 1800ms -> at 0.5x = 3600ms (clearly readable)
    const durationMs = 1800 / speed;

    const step = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      setInFlight104((cur) => {
        if (!cur) return null;
        const nextP = cur.progress + dt / durationMs;
        if (nextP >= 1) {
          // Idempotent guard: each unique eventId is processed at most once (prevents StrictMode/re-render double increments)
          if (!processedEventIdsRef.current.has(cur.id)) {
            processedEventIdsRef.current.add(cur.id);
            const rxTime = nowTimeMs();
            setFlowState('RCC_RECEIVED');
            setRccState((prev) => ({
              typeId: cur.typeId,
              ca: cur.ca,
              ioa: cur.ioa,
              value: cur.value,
              quality: cur.quality,
              timestamp: rxTime,
              rxCount: prev.rxCount + 1,
              apciNs: cur.ns,
              apciNr: cur.ns,
              lastStage: 'RCC Point Updated',
            }));
            setRccFlash(true);
            window.setTimeout(() => {
              setFlowState('RCC_POINT_UPDATED');
              setRccFlash(false);
            }, 420);
            setLogs((prev) => [
              {
                time: rxTime,
                protocol: 'IEC-104',
                service: cur.typeId,
                details: `CA=${cur.ca}, IOA=${cur.ioa}, Val=${cur.value}, COT=${cur.cot} (RCC RX #${cur.id})`,
                result: 'Delivered',
                kind: 'Report',
              },
              ...prev,
            ].slice(0, 20));
          }
          return null;
        }
        return { ...cur, progress: nextP };
      });
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, speed, inFlight104?.id]);

  const selectedPoint = mappingRows.find((r) => r.idx === selectedPointIdx) || mappingRows[0];

  // Dynamic transparent front-panel hardware asset for selected IED
  const serverIedImg = useMemo(
    () => (selectedIed ? getIedImageByModel(selectedIed.vendor, selectedIed.model) : 'assets/ieds/abb-ret615.webp'),
    [selectedIed]
  );

  const resolvePort = (iedId: string, plane: 'LAN_A' | 'LAN_B') => {
    const link = networkLinks.find((l) => l.sourceId === iedId && l.lanPlane === plane);
    return {
      iedPort: link?.sourcePort || 'Port not configured',
      swPort: link?.targetPort || 'Port not configured',
      swName: link?.targetId || (plane === 'LAN_A' ? 'SW-LAN-A1' : 'SW-LAN-B1'),
    };
  };
  const iedPortA = resolvePort(selectedIed?.id || 'IED-33-TF1', 'LAN_A');
  const iedPortB = resolvePort(selectedIed?.id || 'IED-33-TF1', 'LAN_B');

  // At 0.5x default speed, a 4s 1x animation takes 8.0s (smooth, readable for students)
  const dur = (base1xSec: number) => `${(base1xSec / speed).toFixed(2)}s`;

  const handleSelectIed = (id: string) => {
    setLocalIedId(id);
    setSelectedIedId(id);
    const next = ieds.find((x) => x.id === id);
    if (next) {
      setSelectedLdInst(next.logicalDevices[0]?.ldInst || 'Application');
      setSelectedNodeKey('');
      addLog({
        protocol: 'MMS',
        service: 'Initiate (TCP/102)',
        details: `Associated with ${next.name} (${next.ipAddressLanA})`,
        result: 'Success',
        kind: 'Association',
      });
    }
  };

  const handleClientOp = (op: 'READ' | 'WRITE' | 'GI' | 'CONTROL' | 'REPORT') => {
    if (!mmsConnected) {
      addLog({
        protocol: 'MMS',
        service: `${op} Rejected`,
        details: `MMS association with ${selectedIed?.name} is disconnected`,
        result: 'Failed',
        kind: 'Error',
      });
      return;
    }
    if (op === 'READ') {
      addLog({
        protocol: 'MMS',
        service: 'GetDataValues',
        details: `${selectedPoint.iecRef} = ${selectedPoint.mmsVal}`,
        result: 'Success',
        kind: 'Read',
      });
    } else if (op === 'WRITE') {
      addLog({
        protocol: 'MMS',
        service: 'SetDataValues',
        details: `Updated BRCB TrgOps on ${selectedIed?.name}`,
        result: 'Success',
        kind: 'Write',
      });
    } else if (op === 'GI') {
      if (selectedIed) triggerMmsGeneralInterrogation(selectedIed.id);
      addLog({
        protocol: 'MMS',
        service: 'General Interrogation',
        details: `GI=TRUE sent to ${selectedIed?.name} → 5 points reported`,
        result: 'Success',
        kind: 'GI',
      });
      if (iec104Connected) {
        addLog({
          protocol: 'IEC-104',
          service: 'C_IC_NA_1 (Type 100)',
          details: `Gateway forwarded GI snapshot (CA=1) to RCC`,
          result: 'Delivered',
          kind: 'GI',
        });
      }
    } else if (op === 'CONTROL') {
      if (faultMode === 'COMMAND_REJECTED') {
        addLog({
          protocol: 'IEC-104',
          service: 'C_DC_NA_1 (COT=47)',
          details: `Command rejected by CILO1 interlock on ${associatedBay?.bayCode}`,
          result: 'Failed',
          kind: 'Error',
        });
        return;
      }
      const nextTarget = isClosed ? 'OPEN' : 'CLOSED';
      if (associatedBay) commandBreaker(associatedBay.id, nextTarget, 'SCADA_SBO');
      addLog({
        protocol: 'IEC-104',
        service: 'C_DC_NA_1 (SBO)',
        details: `RCC → Gateway → ${selectedIed?.name} CSWI1.Pos.Oper (${nextTarget})`,
        result: 'Delivered',
        kind: 'Control',
      });
    } else if (op === 'REPORT') {
      addLog({
        protocol: 'MMS',
        service: 'Report (BRCB01)',
        details: `${selectedPoint.iecRef} = ${selectedPoint.mmsVal} (q=${selectedPoint.quality})`,
        result: 'Success',
        kind: 'Report',
      });
      dispatchIec104Event(selectedPoint);
    }
  };

  const handleReset = () => {
    setSpeed(0.5);
    setPlaying(true);
    setManualDisconnect(false);
    setLanAUp(true);
    setLanBUp(true);
    setFaultMode('NONE');
    addLog({
      protocol: 'MMS',
      service: 'Session Reset',
      details: `Restored MMS (TCP/102) & IEC-104 (TCP/2404) at 0.5× speed`,
      result: 'Success',
      kind: 'Association',
    });
  };

  const currentLd =
    selectedIed?.logicalDevices.find((ld) => ld.ldInst === selectedLdInst) ||
    selectedIed?.logicalDevices[0];
  const nodes = currentLd?.logicalNodes || [];
  const selectedNode = nodes.find((ln) => `${ln.lnClass}${ln.lnInst}` === selectedNodeKey) || nodes[0];
  const brcbCount = (selectedIed?.rcbs || []).filter((r) => r.buffered && r.enabled).length;
  const urcbCount = (selectedIed?.rcbs || []).filter((r) => !r.buffered && r.enabled).length;

  const faultList: { id: MmsFaultMode; label: string }[] = [
    { id: 'NONE', label: 'Healthy — All Links & Conversions Normal' },
    { id: 'TCP_102_BLOCKED', label: 'TCP/102 Blocked (Firewall / Socket Timeout)' },
    { id: 'MMS_ASSOC_FAIL', label: 'MMS Association Failure (ACSE Reject)' },
    { id: 'IED_OFFLINE', label: 'IED Offline (No TCP/102 Response)' },
    { id: 'GATEWAY_UNAVAILABLE', label: 'Station Gateway Unavailable' },
    { id: 'RCB_DISABLED', label: 'BRCB/URCB Reporting Disabled (RptEna=0)' },
    { id: 'MAPPING_MISSING', label: 'Gateway Point Mapping Missing' },
    { id: 'TYPE_MISMATCH', label: 'IEC 61850 → IEC-104 Data Type Mismatch' },
    { id: 'INVALID_QUALITY', label: 'Invalid Source Quality (q=0x0100 → IV=1)' },
    { id: 'IEC104_DISCONNECTED', label: 'IEC-104 TCP/2404 Disconnected (RCC Loss)' },
    { id: 'COMMAND_REJECTED', label: 'Control Command Rejected (CILO1 Interlock)' },
  ];

  return (
    <div style={{ backgroundColor: '#020B16', color: '#E2F1FC' }} className="space-y-2.5 pb-4 text-xs select-none">
      {/* 1. TOP HEADER BAR MATCHING REFERENCE */}
      <div
        className="rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(90deg, #041628 0%, #07223B 55%, #041628 100%)',
          borderColor: '#0E6A94',
          boxShadow: '0 4px 18px rgba(0, 0, 0, 0.45)',
        }}
      >
        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            MMS Lab V2 — IEC 61850 Client–Server &amp; Protocol Conversion (MMS → IEC 60870-5-104)
          </h2>
          <p className="text-[11px] text-[#8BBCE0] mt-0.5">
            IEC 61850-8-1 (MMS over TCP/102) | RCB (BRCB/URCB) | Read/Write | Control (SBO/Direct) | Gateway Protocol Conversion | Diagnostics
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[10.5px] font-mono font-bold">
          <span
            className="px-2.5 py-1 rounded-lg border flex items-center gap-1.5"
            style={{
              backgroundColor: playing ? '#062E20' : '#332005',
              borderColor: playing ? '#22C55E' : '#F59E0B',
              color: playing ? '#4ADE80' : '#FCD34D',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${playing ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B]'}`} />
            Simulation: {playing ? 'LIVE' : 'PAUSED'}
          </span>

          <span
            className="px-2.5 py-1 rounded-lg border"
            style={{
              backgroundColor: mmsConnected ? '#062E20' : '#3B0D15',
              borderColor: mmsConnected ? '#22C55E' : '#EF4444',
              color: mmsConnected ? '#4ADE80' : '#FCA5A5',
            }}
          >
            MMS Association: {mmsConnected ? 'CONNECTED' : 'DISCONNECTED'}
          </span>

          <span
            className="px-2.5 py-1 rounded-lg border"
            style={{
              backgroundColor: iec104Connected ? '#06263A' : '#3B0D15',
              borderColor: iec104Connected ? '#00DFFF' : '#EF4444',
              color: iec104Connected ? '#7DD3FC' : '#FCA5A5',
            }}
          >
            IEC-104: {iec104Connected ? 'CONNECTED' : 'OFFLINE'}
          </span>

          <span className="px-2 py-1 rounded-lg border border-[#1B4B72] bg-[#041526] text-[#BAE6FD]">TCP:102</span>
          <span className="px-2 py-1 rounded-lg border border-[#1B4B72] bg-[#041526] text-[#BAE6FD]">TCP:2404</span>
        </div>
      </div>

      {/* 2. EIGHT NAVIGATION TABS + ANIMATION SPEED CONTROLS (DEFAULT 0.5x) */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              { id: 'MMS_CLIENT_SERVER', label: 'MMS Client / Server', icon: <Server className="w-3.5 h-3.5" /> },
              { id: 'DATA_MODEL', label: 'IEC 61850 Data Model', icon: <FolderTree className="w-3.5 h-3.5" /> },
              { id: 'RCBS', label: 'Report Control Blocks (BRCB / URCB)', icon: <Database className="w-3.5 h-3.5" /> },
              { id: 'GI', label: 'General Interrogation (GI)', icon: <RefreshCw className="w-3.5 h-3.5" /> },
              { id: 'CONTROL', label: 'Control (Select / Operate)', icon: <Sliders className="w-3.5 h-3.5" /> },
              { id: 'PROTOCOL_CONVERSION', label: 'Protocol Conversion', icon: <Layers className="w-3.5 h-3.5" /> },
              { id: 'PACKET_ANALYZER', label: 'Packet Analyzer', icon: <FileCode2 className="w-3.5 h-3.5" /> },
              { id: 'DIAGNOSTICS', label: 'Logs & Diagnostics', icon: <Terminal className="w-3.5 h-3.5" /> },
            ] as const
          ).map((t) => {
            const act = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                className="px-3 py-1.5 rounded-lg border text-[11px] font-extrabold flex items-center gap-1.5 transition"
                style={{
                  background: act ? 'linear-gradient(180deg, #00E5FF 0%, #00A6D6 100%)' : '#06182B',
                  color: act ? '#02101F' : '#CFE6F7',
                  borderColor: act ? '#38F2FF' : '#184468',
                  boxShadow: act ? '0 0 14px rgba(0, 229, 255, 0.42)' : 'none',
                }}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Shared Playback & Speed Controls (0.5x Default!) */}
        <div className="flex items-center gap-1.5 text-[10.5px] font-bold">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="px-2.5 py-1 rounded-md border flex items-center gap-1"
            style={{
              borderColor: playing ? '#22C55E' : '#F59E0B',
              backgroundColor: playing ? '#063322' : '#332005',
              color: playing ? '#4ADE80' : '#FCD34D',
            }}
          >
            {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
            {playing ? 'Pause' : 'Resume'}
          </button>
          {([0.5, 1, 2, 4] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className="px-2 py-1 rounded-md border transition"
              style={{
                backgroundColor: speed === s ? '#00DFFF' : '#061B2E',
                color: speed === s ? '#02101F' : '#CFE6F7',
                borderColor: speed === s ? '#38F2FF' : '#1E4E74',
              }}
            >
              {s}×
            </button>
          ))}
          <button
            type="button"
            onClick={handleReset}
            className="px-2 py-1 rounded-md border border-[#1E4E74] bg-[#061B2E] text-[#BAE6FD] hover:border-[#00DFFF] flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" /> Reset
          </button>
        </div>
      </div>

      {/* 3. MAIN 3-COLUMN WORKSPACE (Protocol Conversion & MMS Client/Server Views) */}
      {(activeTab === 'PROTOCOL_CONVERSION' || activeTab === 'MMS_CLIENT_SERVER' || activeTab === 'GI') && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[270px_minmax(0,1fr)_310px] gap-2.5 items-stretch">
            {/* LEFT COLUMN: MMS Server (IED) + Selector + Association Status + Operations */}
            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-[#00DFFF]" />
                  MMS Server (IED)
                </div>
                <div className="p-3 flex items-center gap-3">
                  <img
                    src={serverIedImg}
                    alt={`${selectedIed?.vendor} ${selectedIed?.model}`}
                    className="w-20 h-20 object-contain shrink-0 drop-shadow-[0_6px_10px_rgba(0,0,0,0.75)]"
                  />
                  <div className="min-w-0 flex-1 space-y-0.5 font-mono text-[10px]">
                    <div className="font-extrabold text-[10.5px]" style={{ color: mmsConnected ? '#4ADE80' : '#F87171' }}>
                      ● {mmsConnected ? 'MMS SERVER ONLINE' : 'MMS OFFLINE'}
                    </div>
                    <div className="flex justify-between"><span className="text-[#8BB3D4]">IED</span><b className="text-white truncate">{selectedIed?.name}</b></div>
                    <div className="flex justify-between"><span className="text-[#8BB3D4]">Model</span><b className="text-white truncate">{selectedIed?.model}</b></div>
                    <div className="flex justify-between"><span className="text-[#8BB3D4]">IP</span><b className="text-[#4ADE80]">{selectedIed?.ipAddressLanA}</b></div>
                    <div className="flex justify-between"><span className="text-[#8BB3D4]">TCP Port</span><b className="text-white">102</b></div>
                    <div className="flex justify-between"><span className="text-[#8BB3D4]">Role</span><b className="text-[#7DD3FC]">MMS Server</b></div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                  Select Target IED / MMS Server
                </div>
                <div className="p-2.5 space-y-2">
                  <select
                    value={selectedIed?.id}
                    onChange={(e) => handleSelectIed(e.target.value)}
                    className="w-full px-2 py-1.5 rounded-lg bg-[#020E1B] border border-[#1B4B72] text-[10.5px] font-mono text-white"
                  >
                    {ieds.map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.name} — {i.vendor} {i.model} ({i.ipAddressLanA})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => {
                      setManualDisconnect((v) => {
                        addLog({
                          protocol: 'MMS',
                          service: !v ? 'Release Association' : 'MMS Initiate',
                          details: `${selectedIed?.name} TCP/102 ${!v ? 'disconnected' : 're-associated'}`,
                          result: !v ? 'Failed' : 'Success',
                          kind: 'Association',
                        });
                        return !v;
                      });
                    }}
                    className="w-full py-1.5 rounded-lg border font-bold text-[11px] transition"
                    style={{
                      backgroundColor: mmsConnected ? '#3B0D15' : '#063322',
                      borderColor: mmsConnected ? '#EF4444' : '#22C55E',
                      color: mmsConnected ? '#FCA5A5' : '#4ADE80',
                    }}
                  >
                    {mmsConnected ? '✕ Disconnect MMS Association' : '✓ Connect MMS Association'}
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                  MMS Association Status
                </div>
                <div className="p-2.5 space-y-1.5 font-mono text-[10px]">
                  <div
                    className="py-1 px-2 rounded border text-center font-extrabold"
                    style={{
                      backgroundColor: mmsConnected ? '#063322' : '#3B0D15',
                      borderColor: mmsConnected ? '#22C55E' : '#EF4444',
                      color: mmsConnected ? '#4ADE80' : '#FCA5A5',
                    }}
                  >
                    {mmsConnected ? '✓ ASSOCIATED (ISO COTP OK)' : '✕ NOT ASSOCIATED'}
                  </div>
                  {[
                    ['Client IP', `${MMS_LAB_NETWORK_CONFIG.gatewayMmsClientIp} (Gateway)`],
                    ['Server IP', selectedIed?.ipAddressLanA || '10.132.10.22'],
                    ['TCP Port', '102'],
                    ['Association ID', '0x0001'],
                    ['PDU Size', '65,536 Bytes'],
                    ['Keep Alive', mmsConnected ? 'Active (10 s)' : 'Stopped'],
                    ['Last Activity', lastActivity],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-[#0F2C45] pb-0.5 last:border-b-0">
                      <span className="text-[#8BB3D4]">{k}</span>
                      <span className="text-white font-bold">{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                  MMS Operations (Client)
                </div>
                <div className="p-2 grid grid-cols-5 gap-1 text-[9.5px] font-bold">
                  {(
                    [
                      ['READ', 'Read', 'GetData'],
                      ['WRITE', 'Write', 'SetData'],
                      ['GI', 'GI', 'Gen.Int.'],
                      ['CONTROL', 'Control', 'SBO/Dir'],
                      ['REPORT', 'Report', 'BRCB'],
                    ] as const
                  ).map(([op, lbl, sub]) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => handleClientOp(op)}
                      className="py-1.5 px-1 rounded-lg border border-[#1E5680] bg-[#062038] hover:border-[#00E5FF] text-center transition"
                    >
                      <div className="text-white">{lbl}</div>
                      <div className="text-[8px] text-[#7DD3FC] font-normal">{sub}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: System Topology + Live Data Flow Protocol Conversion Monitor */}
            <div className="flex flex-col gap-2.5">
              {/* System Topology — MMS Communication with Protocol Conversion */}
              <div
                className="rounded-xl border overflow-hidden shadow-xl"
                style={{
                  borderColor: '#00DFFF',
                  background: 'linear-gradient(180deg, #061A2E 0%, #030F1D 100%)',
                }}
              >
                <div className="px-4 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] via-[#052038] to-[#07304A] flex items-center justify-between">
                  <span className="text-xs sm:text-sm font-extrabold text-white">
                    System Topology — MMS Communication with Protocol Conversion
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <button
                      type="button"
                      onClick={() => setLanAUp((v) => !v)}
                      className={`px-2 py-0.5 rounded border font-bold ${lanAUp ? 'border-[#38BDF8] text-[#7DD3FC] bg-[#082F49]' : 'border-[#EF4444] text-[#FCA5A5] bg-[#3B0D15]'}`}
                    >
                      LAN A: {lanAUp ? 'UP' : 'DOWN'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setLanBUp((v) => !v)}
                      className={`px-2 py-0.5 rounded border font-bold ${lanBUp ? 'border-[#C084FC] text-[#F0ABFC] bg-[#3B0764]' : 'border-[#EF4444] text-[#FCA5A5] bg-[#3B0D15]'}`}
                    >
                      LAN B: {lanBUp ? 'UP' : 'DOWN'}
                    </button>
                  </div>
                </div>

                <div className="p-2 overflow-x-auto">
                  <svg
                    ref={svgRef}
                    viewBox="0 0 820 345"
                    className="w-full min-w-[680px] h-auto block select-none"
                    role="img"
                    aria-label="MMS Client-Server and IEC 60870-5-104 Gateway Protocol Conversion Topology"
                  >
                    <defs>
                      <radialGradient id="mmsBg" cx="50%" cy="40%" r="62%">
                        <stop offset="0%" stopColor="#092E52" stopOpacity="0.85" />
                        <stop offset="72%" stopColor="#041526" stopOpacity="0.96" />
                        <stop offset="100%" stopColor="#020B16" stopOpacity="1" />
                      </radialGradient>
                      <filter id="mmsGl" x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur stdDeviation="2.4" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    <rect x="0" y="0" width="820" height="345" rx="8" fill="url(#mmsBg)" />

                    {/* Top 4 Role Badges */}
                    {[
                      { x: 18, w: 128, t1: 'Protection IED', t2: '(MMS Server)' },
                      { x: 204, w: 158, t1: 'Switch A (LAN A - PRP)', t2: 'Hirschmann RSP35' },
                      { x: 422, w: 146, t1: 'Station Gateway', t2: '(Protocol Conversion)' },
                      { x: 632, w: 168, t1: 'RCC / Control Center', t2: '(IEC 60870-5-104 Client)' },
                    ].map((b) => (
                      <g key={b.t1}>
                        <rect x={b.x} y="10" width={b.w} height="34" rx="8" fill="#052138" stroke="#00DFFF" strokeWidth="1.2" />
                        <text x={b.x + b.w / 2} y="24" textAnchor="middle" fill="#FFFFFF" fontSize="9.8" fontWeight="800">{b.t1}</text>
                        <text x={b.x + b.w / 2} y="37" textAnchor="middle" fill="#9ED8F6" fontSize="8.5">{b.t2}</text>
                      </g>
                    ))}

                    {/* 1. PROTECTION IED (ABB Relion RET615 or selected IED) */}
                    <g onClick={() => setInspectedDevice('IED')} style={{ cursor: 'pointer' }}>
                      <image href={serverIedImg} x="22" y="74" width="112" height="114" preserveAspectRatio="xMidYMid meet" />
                      {/* Rear Port Inset */}
                      <rect x="130" y="108" width="24" height="44" rx="3" fill="#041526" stroke="#38BDF8" strokeWidth="1" />
                      <circle cx="142" cy="120" r="3.5" fill={lanAUp ? '#38BDF8' : '#EF4444'} />
                      <circle cx="142" cy="140" r="3.5" fill={lanBUp ? '#C084FC' : '#EF4444'} />
                      <text x="78" y="203" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800">{selectedIed?.model || 'Relion RET615'}</text>
                      <text x="78" y="215" textAnchor="middle" fill="#9ED8F6" fontSize="8.8" fontFamily="monospace">({selectedIed?.name})</text>
                      <text x="78" y="227" textAnchor="middle" fill="#38BDF8" fontSize="8.8" fontFamily="monospace">IP: {selectedIed?.ipAddressLanA}</text>
                    </g>

                    {/* 2. SWITCH A (LAN A) & SWITCH B (LAN B) — Hirschmann RSP35 */}
                    <g onClick={() => setInspectedDevice('SW_A')} style={{ cursor: 'pointer' }}>
                      <text x="283" y="57" textAnchor="middle" fill="#38BDF8" fontSize="8.5" fontFamily="monospace">192.168.100.10</text>
                      <image href="assets/devices/hirschmann-rsp35.png" x="218" y="62" width="130" height="70" preserveAspectRatio="xMidYMid meet" opacity={lanAUp ? 1 : 0.45} />
                    </g>
                    <g onClick={() => setInspectedDevice('SW_B')} style={{ cursor: 'pointer' }}>
                      <image href="assets/devices/hirschmann-rsp35.png" x="218" y="146" width="130" height="70" preserveAspectRatio="xMidYMid meet" opacity={lanBUp ? 1 : 0.45} />
                      <text x="283" y="227" textAnchor="middle" fill="#FFFFFF" fontSize="9.2" fontWeight="800">Switch B (LAN B - PRP)</text>
                      <text x="283" y="238" textAnchor="middle" fill="#E879F9" fontSize="8.3" fontFamily="monospace">192.168.101.10</text>
                    </g>

                    {/* 3. STATION GATEWAY */}
                    <g onClick={() => setInspectedDevice('GATEWAY')} style={{ cursor: 'pointer' }}>
                      <image href="assets/signal-chain/station-gateway.png" x="430" y="76" width="132" height="106" preserveAspectRatio="xMidYMid meet" opacity={faultMode === 'GATEWAY_UNAVAILABLE' ? 0.4 : 1} />
                      <text x="496" y="198" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800">SAS Gateway (GTW-RCC-01)</text>
                      <text x="496" y="210" textAnchor="middle" fill="#9ED8F6" fontSize="8.2">MMS Client ↔ IEC-104 Server</text>
                      <text x="496" y="222" textAnchor="middle" fill="#38BDF8" fontSize="8" fontFamily="monospace">MMS: {MMS_LAB_NETWORK_CONFIG.gatewayMmsClientIp}</text>
                      <text x="496" y="233" textAnchor="middle" fill="#4ADE80" fontSize="8" fontFamily="monospace">104: {MMS_LAB_NETWORK_CONFIG.gatewayIec104ServerIp}</text>
                    </g>

                    {/* 4. RCC / CONTROL CENTER */}
                    <g onClick={() => setInspectedDevice('RCC')} style={{ cursor: 'pointer' }}>
                      <image href="assets/signal-chain/scada-hmi.png" x="634" y="74" width="166" height="114" preserveAspectRatio="xMidYMid meet" opacity={iec104Connected ? 1 : 0.55} />
                      <text x="717" y="203" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800">RCC / SCADA</text>
                      <text x="717" y="215" textAnchor="middle" fill="#9ED8F6" fontSize="8.4">IEC 60870-5-104 Client</text>
                      <text x="717" y="227" textAnchor="middle" fill="#4ADE80" fontSize="8.5" fontFamily="monospace">IP: {MMS_LAB_NETWORK_CONFIG.rccIec104ClientIp}</text>
                    </g>

                    {/* PHYSICAL PRP LAN A (BLUE) & LAN B (VIOLET) CABLES — SEATED IN SWITCH PORTS */}
                    <path id="mms-a1" d="M 146 120 L 182 120 L 182 114 L 258 114" fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanAUp ? undefined : '5 3'} />
                    <path id="mms-a2" d="M 314 114 L 392 114 L 392 120 L 444 120" fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanAUp ? undefined : '5 3'} />
                    <path id="mms-b1" d="M 146 140 L 182 140 L 182 198 L 258 198" fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanBUp ? undefined : '5 3'} />
                    <path id="mms-b2" d="M 314 198 L 392 198 L 392 140 L 444 140" fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanBUp ? undefined : '5 3'} />

                    {/* Gateway -> RCC WAN / TCP-IP Link (Visually Distinct from PRP LAN A/B) */}
                    <path id="iec104-link" d="M 554 130 L 640 130" fill="none" stroke={iec104Connected ? '#22C55E' : '#EF4444'} strokeWidth="3.2" strokeDasharray={iec104Connected ? undefined : '6 4'} />

                    {/* Port Connector Plugs */}
                    <rect x="255" y="110" width="6" height="8" rx="1" fill={lanAUp ? '#38BDF8' : '#EF4444'} />
                    <rect x="311" y="110" width="6" height="8" rx="1" fill={lanAUp ? '#38BDF8' : '#EF4444'} />
                    <rect x="255" y="194" width="6" height="8" rx="1" fill={lanBUp ? '#C084FC' : '#EF4444'} />
                    <rect x="311" y="194" width="6" height="8" rx="1" fill={lanBUp ? '#C084FC' : '#EF4444'} />

                    {/* ANIMATED MMS PACKETS (TCP/102, 0.5x Default Speed!) */}
                    {mmsConnected && lanAUp && (
                      <>
                        <circle r="4.5" fill="#00E5FF" filter="url(#mmsGl)">
                          <animateMotion dur={dur(3.2)} repeatCount="indefinite" path="M 146 120 L 182 120 L 182 114 L 392 114 L 392 120 L 444 120" />
                        </circle>
                        <circle r="3.8" fill="#7DD3FC">
                          <animateMotion dur={dur(3.2)} begin="1.6s" repeatCount="indefinite" path="M 444 120 L 392 120 L 392 114 L 182 114 L 182 120 L 146 120" />
                        </circle>
                      </>
                    )}
                    {mmsConnected && lanBUp && (
                      <circle r="4.2" fill="#00E5FF" filter="url(#mmsGl)">
                        <animateMotion dur={dur(3.4)} begin="0.8s" repeatCount="indefinite" path="M 146 140 L 182 140 L 182 198 L 392 198 L 392 140 L 444 140" />
                      </circle>
                    )}

                    {/* EVENT-DRIVEN ANIMATED IEC-104 PACKET WITH LIVE LABEL (Gateway -> RCC, NEVER on LAN A/B) */}
                    {inFlight104 && iec104Connected && (() => {
                      const px = 554 + (640 - 554) * inFlight104.progress;
                      return (
                        <g>
                          <circle cx={px} cy={130} r="6.5" fill="#4ADE80" filter="url(#mmsGl)" stroke="#ECFDF5" strokeWidth="1.2" />
                          <rect x={px - 44} y={96} width="88" height="24" rx="5" fill="#052E16" stroke="#22C55E" strokeWidth="1.1" />
                          <text x={px} y={106.5} textAnchor="middle" fill="#86EFAC" fontSize="7.4" fontWeight="800" fontFamily="monospace">
                            {inFlight104.typeId}
                          </text>
                          <text x={px} y={116} textAnchor="middle" fill="#FFFFFF" fontSize="7.2" fontFamily="monospace">
                            IOA {inFlight104.ioa} · {inFlight104.value}
                          </text>
                        </g>
                      );
                    })()}

                    {/* RCC Live Receive Indicator LED */}
                    <circle
                      cx="644"
                      cy="130"
                      r={rccFlash ? 7 : 4.5}
                      fill={rccFlash ? '#4ADE80' : iec104Connected ? '#22C55E' : '#EF4444'}
                      filter={rccFlash ? 'url(#mmsGl)' : undefined}
                      stroke="#020B16"
                      strokeWidth="1.2"
                    />

                    {/* Protocol Conversion Flow Ribbon */}
                    <rect x="64" y="256" width="142" height="36" rx="8" fill="#04192C" stroke={mmsConnected ? '#00DFFF' : '#EF4444'} strokeWidth="1.3" />
                    <text x="135" y="272" textAnchor="middle" fill="#7DD3FC" fontSize="9.5" fontWeight="800">IEC 61850 MMS</text>
                    <text x="135" y="285" textAnchor="middle" fill="#BAE6FD" fontSize="8.5" fontFamily="monospace">(TCP/102)</text>

                    <line x1="206" y1="274" x2="292" y2="274" stroke={mmsConnected ? '#00DFFF' : '#EF4444'} strokeWidth="2" strokeDasharray="4 3" />

                    <rect x="292" y="252" width="236" height="44" rx="9" fill="#052338" stroke={conversionActive ? '#00E5FF' : '#EF4444'} strokeWidth="1.5" />
                    <text x="410" y="268" textAnchor="middle" fill="#FFFFFF" fontSize="9.8" fontWeight="800">Protocol Conversion (Gateway)</text>
                    <text x="410" y="281" textAnchor="middle" fill="#4ADE80" fontSize="8.6" fontFamily="monospace">MMS (IEC 61850) ⇄ IEC 60870-5-104</text>
                    <text x="410" y="292" textAnchor="middle" fill="#9ED8F6" fontSize="7.8">(Information Model Mapping · Speed {speed}×)</text>

                    <line x1="528" y1="274" x2="614" y2="274" stroke={iec104Connected ? '#22C55E' : '#EF4444'} strokeWidth="2" strokeDasharray="4 3" />

                    <rect x="614" y="256" width="146" height="36" rx="8" fill="#05261A" stroke={iec104Connected ? '#22C55E' : '#EF4444'} strokeWidth="1.3" />
                    <text x="687" y="272" textAnchor="middle" fill="#4ADE80" fontSize="9.5" fontWeight="800">IEC 60870-5-104</text>
                    <text x="687" y="285" textAnchor="middle" fill="#86EFAC" fontSize="8.5" fontFamily="monospace">(TCP/2404)</text>

                    {/* Legend Strip */}
                    <rect x="16" y="308" width="788" height="28" rx="7" fill="#041525" stroke="#0E6A94" strokeWidth="1" />
                    <text x="28" y="325" fill="#9ED8F6" fontSize="9" fontWeight="800">Legend :</text>
                    <line x1="82" y1="322" x2="108" y2="322" stroke="#38BDF8" strokeWidth="2.8" /><text x="114" y="325" fill="#DCEEFB" fontSize="8.8">LAN A (PRP)</text>
                    <line x1="196" y1="322" x2="222" y2="322" stroke="#C084FC" strokeWidth="2.8" /><text x="228" y="325" fill="#DCEEFB" fontSize="8.8">LAN B (PRP)</text>
                    <circle cx="318" cy="322" r="4" fill="#00E5FF" /><text x="328" y="325" fill="#DCEEFB" fontSize="8.8">MMS Traffic (TCP/102)</text>
                    <circle cx="468" cy="322" r="4" fill="#4ADE80" /><text x="478" y="325" fill="#DCEEFB" fontSize="8.8">IEC-104 Traffic (TCP/2404)</text>
                    <circle cx="638" cy="322" r="4" fill="#22C55E" /><text x="648" y="325" fill="#DCEEFB" fontSize="8.8">Active Comm ({speed}×)</text>
                  </svg>
                </div>

                {/* Compact Live RCC Receive Monitor (Updates ONLY on confirmed IEC-104 RX arrival) */}
                <div
                  className="mx-2 mb-2 rounded-lg border px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] transition-colors"
                  style={{
                    backgroundColor: rccFlash ? '#063B23' : '#031524',
                    borderColor: rccFlash ? '#4ADE80' : iec104Connected ? '#166534' : '#EF4444',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`w-2.5 h-2.5 rounded-full ${rccFlash ? 'bg-[#4ADE80] scale-125' : iec104Connected ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`}
                    />
                    <span className="font-extrabold text-white">RCC RECEIVE MONITOR (IEC-104 TCP/2404):</span>
                    <span className="text-[#4ADE80] font-bold">
                      {iec104Connected
                        ? `${rccState.typeId} | CA=${rccState.ca} | IOA=${rccState.ioa} | ${rccState.value} | ${rccState.quality.toUpperCase()}`
                        : 'IEC-104 LINK DOWN — NO DATA RECEIVED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[#9ED8F6]">
                    <span>Stage: <b className="text-[#4ADE80]">{inFlight104 ? 'IEC-104 In-Flight' : rccState.lastStage}</b></span>
                    <span>Rx Count: <b className="text-white">{rccState.rxCount}</b></span>
                    <span>APCI N(S)/N(R): <b className="text-[#7DD3FC]">{rccState.apciNs}/{rccState.apciNr}</b></span>
                    <span>TS: <b className="text-[#BAE6FD]">{rccState.timestamp}</b></span>
                  </div>
                </div>

                {/* Clickable Device Inspector Drawer */}
                {inspectedDevice && (
                  <div className="border-t border-[#00DFFF] bg-[#020E1C] px-3 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10px]">
                    <div>
                      <span className="text-[#00E5FF] font-extrabold">DEVICE INSPECTOR ({inspectedDevice}): </span>
                      <span className="text-white">
                        {inspectedDevice === 'IED' &&
                          `${selectedIed?.vendor} ${selectedIed?.model} (${selectedIed?.name}) · IP ${selectedIed?.ipAddressLanA} · LAN A: ${iedPortA.iedPort}→${iedPortA.swPort} · LAN B: ${iedPortB.iedPort}→${iedPortB.swPort}`}
                        {inspectedDevice === 'SW_A' && 'Hirschmann RSP35 · PRP LAN A Switch · 192.168.100.10 · VLAN 10/101'}
                        {inspectedDevice === 'SW_B' && 'Hirschmann RSP35 · PRP LAN B Switch · 192.168.101.10 · Independent Plane'}
                        {inspectedDevice === 'GATEWAY' && `Station Telecontrol Gateway GTW-RCC-01 · MMS Client (${MMS_LAB_NETWORK_CONFIG.gatewayMmsClientIp}:102) ↔ IEC-104 Server (${MMS_LAB_NETWORK_CONFIG.gatewayIec104ServerIp}:2404)`}
                        {inspectedDevice === 'RCC' && `Regional Control Center / SCADA Client · ${MMS_LAB_NETWORK_CONFIG.rccIec104ClientIp} · IEC 60870-5-104 Master`}
                      </span>
                    </div>
                    <button type="button" onClick={() => setInspectedDevice(null)} className="px-2 py-0.5 rounded bg-[#07243D] text-[#7DD3FC] font-sans font-bold">Close ✕</button>
                  </div>
                )}
              </div>

              {/* Live Data Flow — Protocol Conversion Monitor (Unclipped 3-Stage Responsive Grid) */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex flex-wrap items-center justify-between gap-2">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-[#00DFFF]" />
                    Live Data Flow — Protocol Conversion Monitor
                  </span>
                  <div className="flex items-center gap-2 font-mono text-[10px]">
                    <span
                      className="px-2 py-0.5 rounded border font-bold"
                      style={{
                        backgroundColor: flowState === 'FAILED' ? '#3B0D15' : flowState === 'IEC104_IN_FLIGHT' ? '#082F49' : '#063322',
                        borderColor: flowState === 'FAILED' ? '#EF4444' : flowState === 'IEC104_IN_FLIGHT' ? '#38BDF8' : '#22C55E',
                        color: flowState === 'FAILED' ? '#FCA5A5' : flowState === 'IEC104_IN_FLIGHT' ? '#7DD3FC' : '#4ADE80',
                      }}
                    >
                      State: {flowState.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[#7DD3FC]">Speed {speed}×</span>
                  </div>
                </div>

                <div className="p-2.5 grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Stage 1: IEC 61850 MMS (Incoming) */}
                  <div className="min-w-0 rounded-lg border border-[#164463] bg-[#020E1B] p-2.5 space-y-1 font-mono text-[10px]">
                    <div className="text-[10.5px] font-sans font-extrabold text-[#7DD3FC] border-b border-[#123952] pb-1">
                      1. IEC 61850 MMS (Incoming)
                    </div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">IED ID</span><b className="text-white truncate">{selectedIed?.name}</b></div>
                    <div className="flex justify-between gap-2" title={selectedPoint.iecRef}><span className="text-[#8BB3D4] shrink-0">Object Ref</span><b className="text-[#7DD3FC] break-all text-right">{selectedPoint.iecRef}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">FC</span><b className="text-white">{selectedPoint.fc}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">MMS Value</span><b className="text-[#4ADE80] text-right">{selectedPoint.mmsVal}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">Quality</span><b style={{ color: selectedPoint.quality === 'Good' ? '#4ADE80' : '#F87171' }}>● {selectedPoint.quality}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">Timestamp</span><b className="text-[#BAE6FD]">{lastActivity}</b></div>
                  </div>

                  {/* Stage 2: Gateway Mapping & Conversion */}
                  <div className="min-w-0 rounded-lg border border-[#00DFFF]/70 bg-[#041B2E] p-2.5 space-y-1 font-mono text-[10px]">
                    <div className="text-[10.5px] font-sans font-extrabold text-white border-b border-[#164463] pb-1">
                      2. Gateway Conversion (GTW-RCC-01)
                    </div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">Mapping</span><b style={{ color: selectedPoint.mapped ? '#4ADE80' : '#F87171' }}>{selectedPoint.mapped ? '✓ Valid' : '✕ Error'}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">Internal Pt</span><b className="text-white">GTW_PT_{selectedPoint.ioa}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">IEC-104 Type</span><b className="text-[#7DD3FC]">{selectedPoint.iec104Type}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">CA / IOA</span><b className="text-white">CA={selectedPoint.ca} · IOA={selectedPoint.ioa}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">Converted</span><b className="text-[#4ADE80] text-right">{selectedPoint.convertedVal}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">Server IP</span><b className="text-[#BAE6FD]">{MMS_LAB_NETWORK_CONFIG.gatewayIec104ServerIp}:2404</b></div>
                  </div>

                  {/* Stage 3: IEC 60870-5-104 (Outgoing -> RCC) */}
                  <div className="min-w-0 rounded-lg border border-[#166534] bg-[#021410] p-2.5 space-y-1 font-mono text-[10px]">
                    <div className="text-[10.5px] font-sans font-extrabold text-[#4ADE80] border-b border-[#14532D] pb-1">
                      3. IEC 60870-5-104 (To RCC)
                    </div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">RCC Client</span><b className="text-white">{MMS_LAB_NETWORK_CONFIG.rccIec104ClientIp}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">Last RX Type</span><b className="text-[#4ADE80]">{rccState.typeId}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">CA / IOA</span><b className="text-white">CA={rccState.ca} · IOA={rccState.ioa}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">RX Value</span><b className="text-[#4ADE80]">{rccState.value}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">TX Status</span><b style={{ color: !iec104Connected ? '#F87171' : inFlight104 ? '#38BDF8' : '#4ADE80' }}>{!iec104Connected ? 'Failed / Down' : inFlight104 ? 'IEC-104 In-Flight' : 'Sent'}</b></div>
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">RCC Status</span><b style={{ color: !iec104Connected ? '#F87171' : inFlight104 ? '#FBBF24' : '#4ADE80' }}>{!iec104Connected ? 'No RX' : inFlight104 ? 'Awaiting RX' : `${rccState.lastStage} (#${rccState.rxCount})`}</b></div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Gateway Point Mapping + Conversion Details */}
            <div className="flex flex-col gap-2.5">
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                  Gateway Point Mapping — IEC 61850 → IEC-104
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[10px] font-mono text-left">
                    <thead>
                      <tr className="bg-[#082238] text-[#9ED8F6] border-b border-[#164463]">
                        <th className="py-1.5 px-1.5">#</th>
                        <th className="py-1.5 px-1.5">IEC 61850 Ref</th>
                        <th className="py-1.5 px-1">FC</th>
                        <th className="py-1.5 px-1.5">IEC-104</th>
                        <th className="py-1.5 px-1">IOA</th>
                        <th className="py-1.5 px-1.5">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappingRows.map((row) => (
                        <tr
                          key={row.idx}
                          onClick={() => setSelectedPointIdx(row.idx)}
                          className={`border-b border-[#123952] cursor-pointer transition ${
                            selectedPointIdx === row.idx ? 'bg-[#093252]' : 'hover:bg-[#062036]'
                          }`}
                        >
                          <td className="py-1.5 px-1.5 text-[#7DD3FC]">{row.idx}</td>
                          <td className="py-1.5 px-1.5 text-white font-bold">{row.iecRef}</td>
                          <td className="py-1.5 px-1 text-[#9ED8F6]">{row.fc}</td>
                          <td className="py-1.5 px-1.5 text-[#BAE6FD]">{row.iec104Type}</td>
                          <td className="py-1.5 px-1 text-white">{row.ioa}</td>
                          <td className="py-1.5 px-1.5 font-bold" style={{ color: row.mapped ? '#4ADE80' : '#F87171' }}>
                            {row.mapped ? '✓ Mapped' : '✕ Fault'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg flex-1">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                  Conversion Details — Selected Point
                </div>
                <div className="p-3 space-y-1.5 font-mono text-[10.5px]">
                  {[
                    ['IEC 61850', `${selectedPoint.iecRef} (FC=${selectedPoint.fc})`],
                    ['MMS Value', selectedPoint.mmsVal],
                    ['IEC-104 Mapping', selectedPoint.iec104Type],
                    ['Common Address (CA)', String(selectedPoint.ca)],
                    ['Info Object Addr (IOA)', String(selectedPoint.ioa)],
                    ['Converted Value', selectedPoint.convertedVal],
                    ['Quality', selectedPoint.quality === 'Good' ? 'Good (IV=0, NT=0, SB=0, BL=0)' : 'Invalid (IV=1)'],
                    ['Last Update', lastActivity],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[120px_minmax(0,1fr)] gap-2 border-b border-[#0F2C45] pb-1 last:border-b-0">
                      <span className="text-[#8BB3D4]">{k} :</span>
                      <span className="text-white font-bold break-all">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. BOTTOM 3-PANEL ROW: MMS Transaction Timeline + Message Log + Live Diagnostics */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.25fr_0.95fr] gap-2.5">
            {/* MMS Transaction Timeline */}
            <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
              <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                MMS Transaction Timeline (Live)
              </div>
              <div className="p-3 space-y-2">
                <div className="flex flex-wrap gap-3 text-[9.5px] text-[#9ED8F6]">
                  <span><b className="text-[#4ADE80]">●</b> Association</span>
                  <span><b className="text-[#38BDF8]">●</b> Read</span>
                  <span><b className="text-[#FACC15]">●</b> Write</span>
                  <span><b className="text-[#C084FC]">●</b> Report</span>
                  <span><b className="text-[#F87171]">●</b> Control</span>
                  <span><b className="text-[#94A3B8]">●</b> GI</span>
                </div>
                <svg viewBox="0 0 360 72" className="w-full h-[72px]">
                  <line x1="12" y1="54" x2="348" y2="54" stroke="#1E4E74" strokeWidth="1.5" />
                  {[
                    { x: 24, y: 24, c: '#4ADE80', t: 't-18s' },
                    { x: 76, y: 28, c: '#38BDF8', t: 't-15s' },
                    { x: 128, y: 22, c: '#FACC15', t: 't-12s' },
                    { x: 180, y: 20, c: '#C084FC', t: 't-9s' },
                    { x: 232, y: 26, c: '#38BDF8', t: 't-6s' },
                    { x: 284, y: 22, c: '#F87171', t: 't-3s' },
                    { x: 332, y: 18, c: '#4ADE80', t: 'Now' },
                  ].map((pt) => (
                    <g key={pt.x}>
                      <line x1={pt.x} y1={pt.y} x2={pt.x} y2="54" stroke={pt.c} strokeWidth="1.8" />
                      <circle cx={pt.x} cy={pt.y} r="4.5" fill={pt.c} />
                      <text x={pt.x} y="67" textAnchor="middle" fill="#8BB3D4" fontSize="8" fontFamily="monospace">{pt.t}</text>
                    </g>
                  ))}
                </svg>
              </div>
            </div>

            {/* MMS / IEC-104 Message Log */}
            <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
              <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                MMS / IEC-104 Message Log (Latest)
              </div>
              <div className="max-h-[142px] overflow-y-auto">
                <table className="w-full text-[10px] font-mono text-left">
                  <thead>
                    <tr className="bg-[#082238] text-[#9ED8F6] border-b border-[#164463]">
                      <th className="py-1 px-2">Time</th>
                      <th className="py-1 px-2">Protocol</th>
                      <th className="py-1 px-2">Service / ASDU</th>
                      <th className="py-1 px-2">Details</th>
                      <th className="py-1 px-2">Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.slice(0, 6).map((l, idx) => (
                      <tr key={idx} className="border-b border-[#123952] last:border-b-0">
                        <td className="py-1 px-2 text-[#7DD3FC]">{l.time}</td>
                        <td className="py-1 px-2 font-bold" style={{ color: l.protocol === 'MMS' ? '#FACC15' : '#4ADE80' }}>{l.protocol}</td>
                        <td className="py-1 px-2 text-white">{l.service}</td>
                        <td className="py-1 px-2 text-[#BAE6FD] truncate max-w-[170px]">{l.details}</td>
                        <td className="py-1 px-2 font-bold" style={{ color: l.result === 'Failed' ? '#F87171' : '#4ADE80' }}>
                          {l.result === 'Failed' ? '✕' : '✓'} {l.result}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Live Diagnostics */}
            <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
              <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] font-extrabold text-white">
                Live Diagnostics
              </div>
              <div className="p-3 space-y-1.5 font-mono text-[10.5px]">
                {[
                  ['MMS Association (TCP/102)', mmsConnected, mmsConnected ? 'Connected (ACSE: OK)' : 'Disconnected'],
                  ['IEC-104 Connection (TCP/2404)', iec104Connected, iec104Connected ? 'Connected (Active)' : 'Offline'],
                  ['Protocol Conversion', conversionActive, conversionActive ? 'Running (5 Points)' : 'Fault / Halted'],
                  ['Report Delivery', mmsConnected && faultMode !== 'RCB_DISABLED', `BRCB:${brcbCount}, URCB:${urcbCount}`],
                  ['Last Conversion', conversionActive, `${lastActivity} (${liveCurrent} A)`],
                ].map(([lbl, ok, val]) => (
                  <div key={String(lbl)} className="flex items-center justify-between gap-2">
                    <span className="flex items-center gap-1.5 text-[#DCEEFB] truncate">
                      {ok ? <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" /> : <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />}
                      {lbl}
                    </span>
                    <span className="font-bold shrink-0" style={{ color: ok ? '#4ADE80' : '#F87171' }}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {/* DATA MODEL BROWSER TAB */}
      {activeTab === 'DATA_MODEL' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
          <div className="space-y-2">
            <h3 className="font-extrabold text-white text-xs">Logical Devices ({selectedIed?.name})</h3>
            {(selectedIed?.logicalDevices || []).map((ld) => (
              <button
                key={ld.ldInst}
                type="button"
                onClick={() => { setSelectedLdInst(ld.ldInst); setSelectedNodeKey(''); }}
                className={`w-full text-left p-2 rounded-lg border font-mono text-xs ${currentLd?.ldInst === ld.ldInst ? 'bg-[#08324F] border-[#00DFFF] text-white' : 'bg-[#031220] border-[#163D5E] text-[#9ED8F6]'}`}
              >
                {selectedIed?.name}{ld.ldInst}
              </button>
            ))}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-white text-xs">Logical Nodes ({nodes.length})</h3>
            {nodes.map((ln) => {
              const k = `${ln.lnClass}${ln.lnInst}`;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSelectedNodeKey(k)}
                  className={`w-full text-left p-2 rounded-lg border font-mono text-xs ${selectedNode && `${selectedNode.lnClass}${selectedNode.lnInst}` === k ? 'bg-[#08324F] border-[#00DFFF] text-white' : 'bg-[#031220] border-[#163D5E] text-[#BAE6FD]'}`}
                >
                  {k} — <span className="text-[#8BB3D4] font-sans">{ln.description}</span>
                </button>
              );
            })}
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-white text-xs">Data Objects &amp; Attributes</h3>
            {(selectedNode?.dataObjects || []).map((doItem) => (
              <div key={doItem.doName} className="p-2 rounded-lg bg-[#031220] border border-[#163D5E] font-mono text-[10.5px]">
                <div className="flex justify-between"><b className="text-white">{doItem.doName} [{doItem.fc}]</b><span className="text-[#4ADE80]">{doItem.value}</span></div>
                <div className="text-[#8BB3D4] text-[9.5px]">CDC: {doItem.cdc} · q: {doItem.q}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* BRCB / URCB REPORTING LAB TAB */}
      {activeTab === 'RCBS' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-white text-sm">Report Control Blocks (BRCB / URCB) — {selectedIed?.name}</h3>
            <button type="button" onClick={() => handleClientOp('GI')} className="px-3 py-1 rounded-lg bg-[#063322] border border-[#22C55E] text-[#4ADE80] font-bold text-xs">
              Trigger General Interrogation (GI)
            </button>
          </div>
          <table className="w-full text-left font-mono text-[11px]">
            <thead>
              <tr className="bg-[#082238] text-[#9ED8F6] border-b border-[#164463]">
                <th className="py-2 px-2">Name</th><th className="py-2 px-2">Type</th><th className="py-2 px-2">DataSet</th><th className="py-2 px-2">IntgPd</th><th className="py-2 px-2">Client IP</th><th className="py-2 px-2">RptEna</th>
              </tr>
            </thead>
            <tbody>
              {(selectedIed?.rcbs || []).map((rcb) => (
                <tr key={rcb.name} className="border-b border-[#123952]">
                  <td className="py-2 px-2 text-white font-bold">{rcb.name}</td>
                  <td className="py-2 px-2 text-[#7DD3FC]">{rcb.buffered ? 'BRCB (Buffered)' : 'URCB (Unbuffered)'}</td>
                  <td className="py-2 px-2 text-[#BAE6FD]">{rcb.datSet}</td>
                  <td className="py-2 px-2">{rcb.intgPdMs} ms</td>
                  <td className="py-2 px-2">{rcb.clientIp}</td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      onClick={() => selectedIed && toggleRcbEnabled(selectedIed.id, rcb.name)}
                      className={`px-2.5 py-0.5 rounded border font-bold text-[10px] ${rcb.enabled ? 'bg-[#063322] border-[#22C55E] text-[#4ADE80]' : 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]'}`}
                    >
                      {rcb.enabled ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* REVERSE CONTROL COMMANDS (IEC-104 -> MMS) TAB */}
      {activeTab === 'CONTROL' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
          <h3 className="font-extrabold text-white text-sm">Reverse Control Path: RCC (IEC-104) → Station Gateway → {selectedIed?.name} (MMS SBO)</h3>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-xs text-[#BAE6FD]">
              Selected Bay: <b className="text-white">{associatedBay?.bayCode}</b> · Breaker Position: <b style={{ color: isClosed ? '#4ADE80' : '#FBBF24' }}>{associatedBay?.breakerState}</b>
            </span>
            <button
              type="button"
              onClick={() => handleClientOp('CONTROL')}
              className="px-4 py-1.5 rounded-lg bg-[#083B5E] border border-[#00DFFF] text-white font-extrabold text-xs hover:brightness-110"
            >
              Execute SBO {isClosed ? 'OPEN' : 'CLOSE'} via IEC-104 (C_DC_NA_1 → CSWI1.Pos.Oper)
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[10.5px]">
            <div className="p-2.5 rounded bg-[#020E1B] border border-[#164463]">
              <div className="text-[#4ADE80] font-bold">1. RCC IEC-104 Command</div>
              <div>Type 46 (C_DC_NA_1) · IOA 2001 · S/E=1 (Select) → S/E=0 (Execute)</div>
            </div>
            <div className="p-2.5 rounded bg-[#020E1B] border border-[#164463]">
              <div className="text-[#00E5FF] font-bold">2. Gateway Translation</div>
              <div>Validates Authority &amp; maps IOA 2001 → {selectedIed?.name}/CSWI1.Pos.SBOw</div>
            </div>
            <div className="p-2.5 rounded bg-[#020E1B] border border-[#164463]">
              <div className="text-[#FACC15] font-bold">3. IED Execution &amp; Feedback</div>
              <div>CILO1 Check → BO1 Coil → XCBR1.Pos.stVal BRCB Report → RCC Update</div>
            </div>
          </div>
        </div>
      )}

      {/* SIMULATED PACKET ANALYZER TAB */}
      {activeTab === 'PACKET_ANALYZER' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-extrabold text-white text-sm">Simulated Packet Analyzer — MMS (TCP/102) &amp; IEC-104 (TCP/2404)</h3>
            <div className="flex gap-1.5">
              {(['ALL', 'MMS', 'IEC-104'] as const).map((f) => (
                <button key={f} type="button" onClick={() => setPktFilter(f)} className={`px-2.5 py-1 rounded border text-[10.5px] font-bold ${pktFilter === f ? 'bg-[#00DFFF] text-[#02101F] border-[#00DFFF]' : 'bg-[#041526] text-[#9ED8F6] border-[#1E4E74]'}`}>
                  {f}
                </button>
              ))}
            </div>
          </div>
          <table className="w-full text-left font-mono text-[10.5px]">
            <thead>
              <tr className="bg-[#082238] text-[#9ED8F6] border-b border-[#164463]">
                <th className="py-1.5 px-2">Timestamp</th><th className="py-1.5 px-2">Protocol</th><th className="py-1.5 px-2">Src → Dst</th><th className="py-1.5 px-2">Service / APCI</th><th className="py-1.5 px-2">Decoded Payload (Simulated)</th>
              </tr>
            </thead>
            <tbody>
              {logs.filter((l) => pktFilter === 'ALL' || l.protocol === pktFilter).map((l, i) => (
                <tr key={i} className="border-b border-[#123952]">
                  <td className="py-1.5 px-2 text-[#7DD3FC]">{l.time}</td>
                  <td className="py-1.5 px-2 font-bold" style={{ color: l.protocol === 'MMS' ? '#FACC15' : '#4ADE80' }}>{l.protocol}</td>
                  <td className="py-1.5 px-2 text-[#BAE6FD]">{l.protocol === 'MMS' ? `${selectedIed?.ipAddressLanA}:102 → ${MMS_LAB_NETWORK_CONFIG.gatewayMmsClientIp}` : `${MMS_LAB_NETWORK_CONFIG.gatewayIec104ServerIp}:2404 → ${MMS_LAB_NETWORK_CONFIG.rccIec104ClientIp}`}</td>
                  <td className="py-1.5 px-2 text-white">{l.service}</td>
                  <td className="py-1.5 px-2 text-[#9ED8F6]">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* LOGS & FAULT INJECTION DIAGNOSTICS TAB */}
      {activeTab === 'DIAGNOSTICS' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
          <h3 className="font-extrabold text-white text-sm flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
            MMS &amp; IEC-104 Protocol Conversion Fault Injection
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
            {faultList.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFaultMode(f.id);
                  addLog({
                    protocol: f.id.includes('104') ? 'IEC-104' : 'MMS',
                    service: 'Fault Injection',
                    details: f.label,
                    result: f.id === 'NONE' ? 'Success' : 'Failed',
                    kind: f.id === 'NONE' ? 'Association' : 'Error',
                  });
                }}
                className="p-2.5 rounded-lg border text-left font-mono text-[10.5px] transition flex justify-between items-center"
                style={{
                  backgroundColor: faultMode === f.id ? (f.id === 'NONE' ? '#063322' : '#3B0D15') : '#031220',
                  borderColor: faultMode === f.id ? (f.id === 'NONE' ? '#22C55E' : '#EF4444') : '#163D5E',
                  color: faultMode === f.id ? '#FFFFFF' : '#B6D4EA',
                }}
              >
                <span>{f.label}</span>
                {faultMode === f.id && <span className="font-extrabold text-[9.5px]">{f.id === 'NONE' ? 'OK' : 'ACTIVE'}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
