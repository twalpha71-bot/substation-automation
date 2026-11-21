import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Cpu,
  Info,
  Network,
  Pause,
  Play,
  RotateCcw,
  Settings,
  ShieldAlert,
  X,
  Zap,
} from 'lucide-react';
import {
  BayEquipment,
  GooseControlBlock,
  MultiVendorIed,
  NetworkLink,
  NetworkRedundancyMode,
} from '../types/substation';
import { getIedImageByModel } from '../data/iedImageRegistry';

export interface LiveCommAnimationProps {
  bay: BayEquipment;
  ied?: MultiVendorIed;
  ieds: MultiVendorIed[];
  networkLinks: NetworkLink[];
  vendorName: string;
  iedModel: string;
  iedName: string;
  iedImageSrc: string;
  scadaTag: string;
  networkRedundancyMode: NetworkRedundancyMode;
  primaryGoose?: GooseControlBlock;
  playing: boolean;
  setPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  speed: 1 | 2 | 4;
  setSpeed: React.Dispatch<React.SetStateAction<1 | 2 | 4>>;
  onReset: () => void;
  isDiFailed: boolean;
  isIedFailed: boolean;
  lanAUp: boolean;
  lanBUp: boolean;
  mmsHealthy: boolean;
  gooseHealthy: boolean;
  iec104Healthy: boolean;
  onSelectStage?: (index: number) => void;
}

interface PortOverride {
  srcPortA?: string;
  swPortA?: string;
  srcPortB?: string;
  swPortB?: string;
}

interface ResolvedPortPair {
  iedId: string;
  iedName: string;
  lanA: {
    configured: boolean;
    iedPort: string;
    switchName: string;
    switchPort: string;
    linkStatus: 'UP' | 'DOWN' | 'DEGRADED' | 'UNCONFIGURED';
  };
  lanB: {
    configured: boolean;
    iedPort: string;
    switchName: string;
    switchPort: string;
    linkStatus: 'UP' | 'DOWN' | 'DEGRADED' | 'UNCONFIGURED';
  };
}

// Compact shared SVG coordinate system (viewBox 0 0 1200 342) matching reference proportions
const LAYOUT = {
  viewWidth: 1200,
  viewHeight: 342,
  trayTop: 226,
  trayHeight: 30,
  lanes: {
    hardwiredA: 235,
    hardwiredB: 244,
    prpLanA: 235,
    prpLanB: 249,
  },
  devices: {
    fieldIo: { id: 'dev-field-io', x: 24, y: 56, w: 152, h: 156 },
    diModule: { id: 'dev-di-module', x: 214, y: 58, w: 148, h: 154 },
    ied: { id: 'dev-protection-ied', x: 400, y: 56, w: 172, h: 154 },
    stationBus: { id: 'dev-station-bus', x: 614, y: 62, w: 164, h: 148 },
    gateway: { id: 'dev-station-gateway', x: 824, y: 64, w: 160, h: 146 },
    scadaHmi: { id: 'dev-scada-hmi', x: 1016, y: 58, w: 168, h: 152 },
  },
  ports: {
    field52a: { x: 88, y: 210 },
    field52b: { x: 104, y: 210 },
    diIn1: { x: 266, y: 210 },
    diIn2: { x: 282, y: 210 },
    diOut: { x: 356, y: 136 },
    iedDiIn: { x: 406, y: 136 },
    iedLanA: { x: 540, y: 206 },
    iedLanB: { x: 560, y: 206 },
    swLanAIn: { x: 648, y: 208 },
    swLanAOut: { x: 666, y: 208 },
    swLanBIn: { x: 724, y: 208 },
    swLanBOut: { x: 742, y: 208 },
    gtwLanA: { x: 888, y: 206 },
    gtwLanB: { x: 918, y: 206 },
    hmiLanA: { x: 1084, y: 208 },
    hmiLanB: { x: 1114, y: 208 },
  },
} as const;

function resolveIedPorts(
  iedId: string,
  iedName: string,
  networkLinks: NetworkLink[],
  override?: PortOverride
): ResolvedPortPair {
  const linkA = networkLinks.find((l) => l.sourceId === iedId && l.lanPlane === 'LAN_A');
  const linkB = networkLinks.find((l) => l.sourceId === iedId && l.lanPlane === 'LAN_B');

  const hasA = Boolean(linkA || (override?.srcPortA && override?.swPortA));
  const hasB = Boolean(linkB || (override?.srcPortB && override?.swPortB));

  return {
    iedId,
    iedName,
    lanA: {
      configured: hasA,
      iedPort: override?.srcPortA || linkA?.sourcePort || 'Port not configured',
      switchName: linkA?.targetId || 'SW-LAN-A1',
      switchPort: override?.swPortA || linkA?.targetPort || 'Port not configured',
      linkStatus: hasA ? linkA?.status || 'UP' : 'UNCONFIGURED',
    },
    lanB: {
      configured: hasB,
      iedPort: override?.srcPortB || linkB?.sourcePort || 'Port not configured',
      switchName: linkB?.targetId || 'SW-LAN-B1',
      switchPort: override?.swPortB || linkB?.targetPort || 'Port not configured',
      linkStatus: hasB ? linkB?.status || 'UP' : 'UNCONFIGURED',
    },
  };
}

export const LiveCommunicationAnimation: React.FC<LiveCommAnimationProps> = ({
  bay,
  ied,
  ieds,
  networkLinks,
  vendorName,
  iedModel,
  iedName,
  iedImageSrc,
  scadaTag,
  networkRedundancyMode,
  primaryGoose,
  playing,
  setPlaying,
  speed,
  setSpeed,
  onReset,
  isDiFailed,
  isIedFailed,
  lanAUp,
  lanBUp,
  mmsHealthy,
  gooseHealthy,
  iec104Healthy,
  onSelectStage,
}) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  // Collapsed by default to preserve the clean six-device reference layout
  const [gooseNetworkExpanded, setGooseNetworkExpanded] = useState<boolean>(false);
  const [inspectedSubscriberId, setInspectedSubscriberId] = useState<string | null>(null);
  const [portOverrides, setPortOverrides] = useState<Record<string, PortOverride>>({});
  const [editingPortIedId, setEditingPortIedId] = useState<string | null>(null);
  const [draftPort, setDraftPort] = useState<PortOverride>({});

  // Pause/Resume freezes only visual SVG packet animations (underlying simulation keeps running)
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

  const dur = (baseSec: number) => `${(baseSec / speed).toFixed(2)}s`;

  // Always match the exact selected bay's IED vendor/model image
  const resolvedIedImg = useMemo(() => {
    if (ied) {
      if (ied.vendor.toLowerCase().includes('schneider') && ied.model.toLowerCase().includes('p143')) {
        return 'assets/signal-chain/protection-ied.png';
      }
      return getIedImageByModel(ied.vendor, ied.model);
    }
    return iedImageSrc || getIedImageByModel(vendorName, iedModel);
  }, [ied, vendorName, iedModel, iedImageSrc]);

  const isBreakerClosed = bay.breakerState === 'CLOSED';
  const contact52aOn = isBreakerClosed && !isDiFailed;
  const contact52bOn = !isBreakerClosed && !isDiFailed;
  const isSingleAttached = ied?.nodeType === 'REDBOX_SAN' || ied?.nodeType === 'SAN';

  const pubPorts = useMemo(
    () => resolveIedPorts(bay.iedId, iedName, networkLinks, portOverrides[bay.iedId]),
    [bay.iedId, iedName, networkLinks, portOverrides]
  );

  const subscriberRecords = useMemo(() => {
    if (!primaryGoose || !primaryGoose.subscriberIedIds?.length) return [];
    return primaryGoose.subscriberIedIds.map((subId) => {
      const matchedIed = ieds.find((x) => x.id === subId || x.name === subId);
      const displayName = matchedIed?.name || subId.replace(/-/g, '_');
      const ports = resolveIedPorts(subId, displayName, networkLinks, portOverrides[subId]);
      const imgSrc = matchedIed
        ? getIedImageByModel(matchedIed.vendor, matchedIed.model)
        : 'assets/signal-chain/protection-ied.png';
      return {
        subId,
        ied: matchedIed,
        displayName,
        vendor: matchedIed?.vendor || 'Configured Peer IED',
        model: matchedIed?.model || 'Not available',
        nodeType: matchedIed?.nodeType || 'DANP',
        imgSrc,
        ports,
      };
    });
  }, [primaryGoose, ieds, networkLinks, portOverrides]);

  const hasGooseSubscribers = subscriberRecords.length > 0;
  const anyLanUp = lanAUp || lanBUp;
  const redundancyDegraded = (lanAUp && !lanBUp) || (!lanAUp && lanBUp);

  const gooseLanAActive = hasGooseSubscribers && gooseHealthy && lanAUp && !isIedFailed;
  const gooseLanBActive = hasGooseSubscribers && gooseHealthy && lanBUp && !isIedFailed && !isSingleAttached;
  const gooseAnyActive = gooseLanAActive || gooseLanBActive;

  // Clean orthogonal paths in two non-overlapping horizontal lanes
  const P = LAYOUT.ports;
  const L = LAYOUT.lanes;

  const pathHwA = `M ${P.field52a.x} ${P.field52a.y} L ${P.field52a.x} ${L.hardwiredA - 7} Q ${P.field52a.x} ${L.hardwiredA} ${P.field52a.x + 7} ${L.hardwiredA} L ${P.diIn1.x - 7} ${L.hardwiredA} Q ${P.diIn1.x} ${L.hardwiredA} ${P.diIn1.x} ${L.hardwiredA - 7} L ${P.diIn1.x} ${P.diIn1.y}`;
  const pathHwB = `M ${P.field52b.x} ${P.field52b.y} L ${P.field52b.x} ${L.hardwiredB - 7} Q ${P.field52b.x} ${L.hardwiredB} ${P.field52b.x + 7} ${L.hardwiredB} L ${P.diIn2.x - 7} ${L.hardwiredB} Q ${P.diIn2.x} ${L.hardwiredB} ${P.diIn2.x} ${L.hardwiredB - 7} L ${P.diIn2.x} ${P.diIn2.y}`;
  const pathDiToIed = `M ${P.diOut.x} ${P.diOut.y} L ${P.iedDiIn.x} ${P.iedDiIn.y}`;

  // Physical PRP LAN A (Blue, Upper Lane) & LAN B (Violet, Lower Lane) — completely independent
  const pathIedLanA = `M ${P.iedLanA.x} ${P.iedLanA.y} L ${P.iedLanA.x} ${L.prpLanA - 7} Q ${P.iedLanA.x} ${L.prpLanA} ${P.iedLanA.x + 7} ${L.prpLanA} L ${P.swLanAIn.x - 7} ${L.prpLanA} Q ${P.swLanAIn.x} ${L.prpLanA} ${P.swLanAIn.x} ${L.prpLanA - 7} L ${P.swLanAIn.x} ${P.swLanAIn.y}`;
  const pathBusLanAToGtw = `M ${P.swLanAOut.x} ${P.swLanAOut.y} L ${P.swLanAOut.x} ${L.prpLanA - 7} Q ${P.swLanAOut.x} ${L.prpLanA} ${P.swLanAOut.x + 7} ${L.prpLanA} L ${P.gtwLanA.x - 7} ${L.prpLanA} Q ${P.gtwLanA.x} ${L.prpLanA} ${P.gtwLanA.x} ${L.prpLanA - 7} L ${P.gtwLanA.x} ${P.gtwLanA.y}`;
  const pathBusLanAToHmi = `M ${P.swLanAOut.x} ${P.swLanAOut.y} L ${P.swLanAOut.x} ${L.prpLanA - 7} Q ${P.swLanAOut.x} ${L.prpLanA} ${P.swLanAOut.x + 7} ${L.prpLanA} L ${P.hmiLanA.x - 7} ${L.prpLanA} Q ${P.hmiLanA.x} ${L.prpLanA} ${P.hmiLanA.x} ${L.prpLanA - 7} L ${P.hmiLanA.x} ${P.hmiLanA.y}`;

  const pathIedLanB = `M ${P.iedLanB.x} ${P.iedLanB.y} L ${P.iedLanB.x} ${L.prpLanB - 7} Q ${P.iedLanB.x} ${L.prpLanB} ${P.iedLanB.x + 7} ${L.prpLanB} L ${P.swLanBIn.x - 7} ${L.prpLanB} Q ${P.swLanBIn.x} ${L.prpLanB} ${P.swLanBIn.x} ${L.prpLanB - 7} L ${P.swLanBIn.x} ${P.swLanBIn.y}`;
  const pathBusLanBToGtw = `M ${P.swLanBOut.x} ${P.swLanBOut.y} L ${P.swLanBOut.x} ${L.prpLanB - 7} Q ${P.swLanBOut.x} ${L.prpLanB} ${P.swLanBOut.x + 7} ${L.prpLanB} L ${P.gtwLanB.x - 7} ${L.prpLanB} Q ${P.gtwLanB.x} ${L.prpLanB} ${P.gtwLanB.x} ${L.prpLanB - 7} L ${P.gtwLanB.x} ${P.gtwLanB.y}`;
  const pathBusLanBToHmi = `M ${P.swLanBOut.x} ${P.swLanBOut.y} L ${P.swLanBOut.x} ${L.prpLanB - 7} Q ${P.swLanBOut.x} ${L.prpLanB} ${P.swLanBOut.x + 7} ${L.prpLanB} L ${P.hmiLanB.x - 7} ${L.prpLanB} Q ${P.hmiLanB.x} ${L.prpLanB} ${P.hmiLanB.x} ${L.prpLanB - 7} L ${P.hmiLanB.x} ${P.hmiLanB.y}`;

  // MMS Application-Layer Overlay riding ON the active physical Ethernet path
  const activeMmsY = lanAUp ? L.prpLanA : L.prpLanB;
  const activeMmsIedX = lanAUp ? P.iedLanA.x : P.iedLanB.x;
  const activeMmsGtwX = lanAUp ? P.gtwLanA.x : P.gtwLanB.x;
  const activeMmsHmiX = lanAUp ? P.hmiLanA.x : P.hmiLanB.x;
  const pathMmsToGtw = `M ${activeMmsIedX} ${P.iedLanA.y} L ${activeMmsIedX} ${activeMmsY} L ${activeMmsGtwX} ${activeMmsY} L ${activeMmsGtwX} ${P.gtwLanA.y}`;
  const pathMmsToHmi = `M ${activeMmsIedX} ${P.iedLanA.y} L ${activeMmsIedX} ${activeMmsY} L ${activeMmsHmiX} ${activeMmsY} L ${activeMmsHmiX} ${P.hmiLanA.y}`;

  const inspectedSub = subscriberRecords.find((s) => s.subId === inspectedSubscriberId) || null;

  const openPortEditor = (targetIedId: string) => {
    setEditingPortIedId(targetIedId);
    setDraftPort(portOverrides[targetIedId] || {});
  };

  const savePortOverride = () => {
    if (!editingPortIedId) return;
    setPortOverrides((prev) => ({ ...prev, [editingPortIedId]: { ...draftPort } }));
    setEditingPortIedId(null);
  };

  return (
    <div
      className="rounded-xl border overflow-hidden shadow-xl"
      style={{
        borderColor: '#00DFFF',
        background: 'linear-gradient(180deg, #04192E 0%, #031222 100%)',
        boxShadow: '0 0 22px rgba(0, 223, 255, 0.16), inset 0 0 18px rgba(0, 180, 255, 0.06)',
      }}
    >
      {/* Clean Compact Header Bar */}
      <div
        className="px-4 py-2 border-b flex flex-wrap items-center justify-between gap-2"
        style={{
          borderColor: '#0E6A94',
          background: 'linear-gradient(90deg, #062842 0%, #04192D 60%, #062842 100%)',
        }}
      >
        <div className="flex items-center gap-2.5 flex-wrap">
          <Zap className="w-4 h-4 text-[#FACC15] fill-[#FACC15]" />
          <span className="text-sm font-extrabold text-white tracking-wide">
            Live Communication Animation
          </span>
          <span className="text-[11px] font-mono text-[#7DD3FC] px-2 py-0.5 rounded bg-[#031424] border border-[#0E6A94]">
            {bay.bayCode} · {iedName} · {isSingleAttached ? 'RedBox SAN' : networkRedundancyMode}
          </span>
          {redundancyDegraded && (
            <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-[#332206] border border-[#F59E0B] text-[#FCD34D]">
              PRP DEGRADED ({lanAUp ? 'LAN A ONLY' : 'LAN B ONLY'})
            </span>
          )}
          {!anyLanUp && (
            <span className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded bg-[#3B0D15] border border-[#EF4444] text-[#FCA5A5]">
              BOTH PRP PATHS DOWN
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-bold">
          <button
            type="button"
            onClick={() => setPlaying((p) => !p)}
            className="px-3 py-1 rounded-md border flex items-center gap-1.5 transition hover:brightness-110"
            style={{
              borderColor: playing ? '#22C55E' : '#F59E0B',
              backgroundColor: playing ? '#063322' : '#332005',
              color: playing ? '#4ADE80' : '#FCD34D',
            }}
          >
            {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            {playing ? 'Pause' : 'Resume'}
          </button>

          {([1, 2, 4] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSpeed(s)}
              className={`px-2.5 py-1 rounded-md border transition ${
                speed === s
                  ? 'border-[#00DFFF] bg-[#083B5E] text-[#00E5FF] shadow-[0_0_8px_rgba(0,223,255,0.35)]'
                  : 'border-[#1E4E74] bg-[#041729] text-[#94B8D7] hover:border-[#38BDF8]'
              }`}
            >
              {s}×
            </button>
          ))}

          <button
            type="button"
            onClick={onReset}
            className="px-2.5 py-1 rounded-md border border-[#1E4E74] bg-[#041729] text-[#BAE6FD] hover:border-[#00DFFF] flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        </div>
      </div>

      {/* Compact Six-Device Shared-Coordinate SVG Canvas */}
      <div className="w-full overflow-x-auto px-2 pt-2 pb-1">
        <div className="min-w-[960px] w-full">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${LAYOUT.viewWidth} ${LAYOUT.viewHeight}`}
            className="w-full h-auto block select-none"
            role="img"
            aria-label={`Live Communication Animation for ${bay.bayCode} (${iedName})`}
          >
            <defs>
              <radialGradient id="lcaCleanBg" cx="50%" cy="38%" r="60%">
                <stop offset="0%" stopColor="#092E52" stopOpacity="0.85" />
                <stop offset="72%" stopColor="#041526" stopOpacity="0.96" />
                <stop offset="100%" stopColor="#020B16" stopOpacity="1" />
              </radialGradient>
              <linearGradient id="lcaCleanTray" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="35%" stopColor="#1E293B" />
                <stop offset="100%" stopColor="#0F172A" />
              </linearGradient>
              <filter id="lcaCleanGlow" x="-60%" y="-60%" width="220%" height="220%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <rect x="0" y="0" width="1200" height="342" rx="10" fill="url(#lcaCleanBg)" />

            {/* 6 Device Header Pills */}
            {[
              { x: 18, w: 164, title: 'Field I/O', sub: '(Breaker Aux Contacts)', stage: 0 },
              { x: 206, w: 164, title: 'DI Module', sub: '(Remote I/O – DI Card)', stage: 1 },
              { x: 392, w: 188, title: 'Protection & Control IED', sub: `(${ied?.vendor || vendorName.split(' ')[0]} ${ied?.model || iedModel})`, stage: 2 },
              { x: 608, w: 176, title: 'Station Bus', sub: `(IEC 61850 Switch – ${isSingleAttached ? 'RedBox' : networkRedundancyMode})`, stage: 4 },
              { x: 818, w: 172, title: 'Station Gateway', sub: '(MMS Client & IEC-104)', stage: 4 },
              { x: 1014, w: 172, title: 'SCADA / HMI', sub: '(Operator Workstation)', stage: 5 },
            ].map((h) => (
              <g
                key={h.title}
                onClick={() => onSelectStage?.(h.stage)}
                style={{ cursor: onSelectStage ? 'pointer' : 'default' }}
              >
                <rect x={h.x} y="10" width={h.w} height="38" rx="10" fill="#052138" stroke="#00DFFF" strokeWidth="1.35" />
                <text x={h.x + h.w / 2} y="26" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="800">
                  {h.title}
                </text>
                <text x={h.x + h.w / 2} y="39" textAnchor="middle" fill="#9ED8F6" fontSize="9.2" fontWeight="600">
                  {h.sub}
                </text>
              </g>
            ))}

            {/* Industrial Metallic Cable Tray */}
            <rect x="16" y={LAYOUT.trayTop} width="1168" height={LAYOUT.trayHeight} rx="4" fill="url(#lcaCleanTray)" stroke="#475569" strokeWidth="1.4" />
            {[60, 200, 340, 480, 620, 760, 900, 1040, 1140].map((bx) => (
              <rect key={bx} x={bx} y={LAYOUT.trayTop - 3} width="9" height={LAYOUT.trayHeight + 6} rx="2" fill="#475569" stroke="#1E293B" strokeWidth="1" />
            ))}

            {/* 6 Large Photorealistic Hardware Devices */}
            {/* 1. Field I/O */}
            <g id={LAYOUT.devices.fieldIo.id} onClick={() => onSelectStage?.(0)} style={{ cursor: 'pointer' }}>
              <image href="assets/signal-chain/field-io.png" x={LAYOUT.devices.fieldIo.x} y={LAYOUT.devices.fieldIo.y} width={LAYOUT.devices.fieldIo.w} height={LAYOUT.devices.fieldIo.h} preserveAspectRatio="xMidYMid meet" />
              <rect x="52" y="110" width="96" height="18" rx="4" fill={contact52aOn ? '#062E1E' : '#0F172A'} stroke={contact52aOn ? '#22C55E' : '#475569'} strokeWidth="1.1" />
              <text x="92" y="122" textAnchor="middle" fill={contact52aOn ? '#4ADE80' : '#94A3B8'} fontSize="9.2" fontWeight="800" fontFamily="monospace">52a ({contact52aOn ? 'CLOSED' : 'OPEN'})</text>
              <circle cx="138" cy="119" r="3.6" fill={contact52aOn ? '#22C55E' : '#334155'} />
              <rect x="52" y="133" width="96" height="18" rx="4" fill={contact52bOn ? '#062E1E' : '#0F172A'} stroke={contact52bOn ? '#22C55E' : '#475569'} strokeWidth="1.1" />
              <text x="92" y="145" textAnchor="middle" fill={contact52bOn ? '#4ADE80' : '#94A3B8'} fontSize="9.2" fontWeight="800" fontFamily="monospace">52b ({contact52bOn ? 'CLOSED' : 'OPEN'})</text>
              <circle cx="138" cy="142" r="3.6" fill={contact52bOn ? '#22C55E' : '#334155'} />
            </g>

            {/* 2. DI Module */}
            <g id={LAYOUT.devices.diModule.id} onClick={() => onSelectStage?.(1)} style={{ cursor: 'pointer' }}>
              <image href="assets/signal-chain/di-module.png" x={LAYOUT.devices.diModule.x} y={LAYOUT.devices.diModule.y} width={LAYOUT.devices.diModule.w} height={LAYOUT.devices.diModule.h} preserveAspectRatio="xMidYMid meet" opacity={isDiFailed ? 0.5 : 1} />
              <rect x="236" y="191" width="104" height="15" rx="3" fill={isDiFailed ? '#3B0D15' : '#041728'} stroke={isDiFailed ? '#EF4444' : '#00DFFF'} />
              <text x="288" y="201.5" textAnchor="middle" fill={isDiFailed ? '#FCA5A5' : '#4ADE80'} fontSize="8.5" fontWeight="800" fontFamily="monospace">
                {isDiFailed ? 'DI FAULT · 0V' : `DI1:${contact52aOn ? 1 : 0} DI2:${contact52bOn ? 1 : 0} OK`}
              </text>
            </g>

            {/* 3. Protection & Control IED (Model-Accurate Front-Panel Asset!) */}
            <g id={LAYOUT.devices.ied.id} onClick={() => onSelectStage?.(2)} style={{ cursor: 'pointer' }}>
              <image
                href={resolvedIedImg}
                x={LAYOUT.devices.ied.x}
                y={LAYOUT.devices.ied.y}
                width={LAYOUT.devices.ied.w}
                height={LAYOUT.devices.ied.h - 14}
                preserveAspectRatio="xMidYMid meet"
                opacity={isIedFailed ? 0.5 : 1}
              />
              {/* Clean Status Bar Below IED Front Panel (works cleanly across Siemens, ABB, GE & Schneider models) */}
              <rect x="418" y="190" width="136" height="16" rx="3" fill={isIedFailed ? '#7F1D1D' : '#04192C'} stroke={isIedFailed ? '#EF4444' : '#00DFFF'} strokeWidth="1" />
              <text x="486" y="201" textAnchor="middle" fill={isIedFailed ? '#FEE2E2' : '#4ADE80'} fontSize="8.6" fontWeight="800" fontFamily="monospace">
                {isIedFailed ? `${bay.bayCode} · IED FAIL` : `${bay.bayCode} · CB ${bay.breakerState}`}
              </text>
            </g>

            {/* 4. Station Bus (Independent PRP LAN A & LAN B Switches) */}
            <g id={LAYOUT.devices.stationBus.id} onClick={() => onSelectStage?.(4)} style={{ cursor: 'pointer' }}>
              <rect x="628" y="52" width="56" height="16" rx="4" fill={lanAUp ? '#0369A1' : '#7F1D1D'} stroke={lanAUp ? '#38BDF8' : '#EF4444'} />
              <text x="656" y="63" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="800">LAN A</text>
              <rect x="706" y="52" width="56" height="16" rx="4" fill={lanBUp ? '#7E22CE' : '#7F1D1D'} stroke={lanBUp ? '#E879F9' : '#EF4444'} />
              <text x="734" y="63" textAnchor="middle" fill="#FFF" fontSize="9" fontWeight="800">LAN B</text>
              <image href="assets/signal-chain/prp-switches.png" x={LAYOUT.devices.stationBus.x} y={LAYOUT.devices.stationBus.y + 7} width={LAYOUT.devices.stationBus.w} height={LAYOUT.devices.stationBus.h - 9} preserveAspectRatio="xMidYMid meet" opacity={anyLanUp ? 1 : 0.45} />
            </g>

            {/* 5. Station Gateway */}
            <g id={LAYOUT.devices.gateway.id} onClick={() => onSelectStage?.(4)} style={{ cursor: 'pointer' }}>
              <image href="assets/signal-chain/station-gateway.png" x={LAYOUT.devices.gateway.x} y={LAYOUT.devices.gateway.y} width={LAYOUT.devices.gateway.w} height={LAYOUT.devices.gateway.h} preserveAspectRatio="xMidYMid meet" opacity={iec104Healthy ? 1 : 0.55} />
              <rect x="848" y="190" width="112" height="16" rx="3" fill={iec104Healthy ? '#041728' : '#3B0D15'} stroke={iec104Healthy ? '#22C55E' : '#EF4444'} />
              <text x="904" y="201" textAnchor="middle" fill={iec104Healthy ? '#4ADE80' : '#FCA5A5'} fontSize="8.3" fontWeight="800" fontFamily="monospace">
                {iec104Healthy ? 'MMS:102 · 104:2404' : 'MMS DISCONNECTED'}
              </text>
            </g>

            {/* 6. SCADA / HMI */}
            <g id={LAYOUT.devices.scadaHmi.id} onClick={() => onSelectStage?.(5)} style={{ cursor: 'pointer' }}>
              <image href="assets/signal-chain/scada-hmi.png" x={LAYOUT.devices.scadaHmi.x} y={LAYOUT.devices.scadaHmi.y} width={LAYOUT.devices.scadaHmi.w} height={LAYOUT.devices.scadaHmi.h} preserveAspectRatio="xMidYMid meet" opacity={mmsHealthy ? 1 : 0.55} />
              <rect x="1034" y="190" width="132" height="16" rx="3" fill={mmsHealthy ? '#062E1E' : '#3B0D15'} stroke={mmsHealthy ? '#22C55E' : '#EF4444'} />
              <text x="1100" y="201" textAnchor="middle" fill={mmsHealthy ? '#4ADE80' : '#FCA5A5'} fontSize="8.4" fontWeight="800" fontFamily="monospace">
                {mmsHealthy ? `${bay.bayCode}: ${bay.breakerState}` : 'SCADA: COMM LOST'}
              </text>
            </g>

            {/* PHYSICAL CABLES (Clean Rounded Orthogonal Routing, Zero Clutter Arrows) */}
            {/* Yellow Hardwired DC */}
            <path id="c-hw-a" d={pathHwA} fill="none" stroke={isDiFailed ? '#EF4444' : '#FACC15'} strokeWidth="3.2" strokeLinecap="round" strokeDasharray={isDiFailed ? '6 4' : undefined} />
            <path d={pathHwB} fill="none" stroke={isDiFailed ? '#991B1B' : '#EAB308'} strokeWidth="2.2" strokeLinecap="round" strokeDasharray={isDiFailed ? '6 4' : undefined} />
            <path id="c-di-ied" d={pathDiToIed} fill="none" stroke={isDiFailed || isIedFailed ? '#EF4444' : '#FACC15'} strokeWidth="2.6" strokeDasharray={isDiFailed || isIedFailed ? '5 3' : undefined} />
            {[P.field52a, P.diIn1, P.diOut, P.iedDiIn].map((pt, idx) => (
              <circle key={`hw-pt-${idx}`} cx={pt.x} cy={pt.y} r="3.2" fill={isDiFailed ? '#EF4444' : '#FACC15'} stroke="#0F172A" strokeWidth="1" />
            ))}
            {!isDiFailed && (
              <circle r="4.2" fill="#FEF08A" filter="url(#lcaCleanGlow)">
                <animateMotion dur={dur(1.6)} repeatCount="indefinite"><mpath href="#c-hw-a" /></animateMotion>
              </circle>
            )}
            {!isDiFailed && !isIedFailed && (
              <circle r="3.6" fill="#FEF08A" filter="url(#lcaCleanGlow)">
                <animateMotion dur={dur(0.95)} repeatCount="indefinite"><mpath href="#c-di-ied" /></animateMotion>
              </circle>
            )}

            {/* Blue Physical PRP LAN A (Upper Lane y=235) */}
            <path id="c-ied-a" d={pathIedLanA} fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="3" strokeDasharray={lanAUp ? undefined : '6 4'} />
            <path id="c-bus-a-gtw" d={pathBusLanAToGtw} fill="none" stroke={lanAUp ? '#0EA5E9' : '#EF4444'} strokeWidth="3" strokeDasharray={lanAUp ? undefined : '6 4'} />
            <path id="c-bus-a-hmi" d={pathBusLanAToHmi} fill="none" stroke={lanAUp ? '#0EA5E9' : '#EF4444'} strokeWidth="3" strokeDasharray={lanAUp ? undefined : '6 4'} />
            {[P.iedLanA, P.swLanAIn, P.swLanAOut, P.gtwLanA, P.hmiLanA].map((pt, idx) => (
              <circle key={`la-pt-${idx}`} cx={pt.x} cy={pt.y} r="3.2" fill={lanAUp ? '#38BDF8' : '#EF4444'} stroke="#0F172A" strokeWidth="1" />
            ))}
            {lanAUp && (
              <>
                <circle r="3.8" fill="#7DD3FC" filter="url(#lcaCleanGlow)">
                  <animateMotion dur={dur(1.5)} repeatCount="indefinite"><mpath href="#c-ied-a" /></animateMotion>
                </circle>
                <circle r="3.8" fill="#38BDF8" filter="url(#lcaCleanGlow)">
                  <animateMotion dur={dur(2.2)} repeatCount="indefinite"><mpath href="#c-bus-a-hmi" /></animateMotion>
                </circle>
              </>
            )}

            {/* Violet Physical PRP LAN B (Lower Lane y=249 — Independent from LAN A) */}
            {!isSingleAttached && (
              <>
                <path id="c-ied-b" d={pathIedLanB} fill="none" stroke={lanBUp ? '#D946EF' : '#EF4444'} strokeWidth="3" strokeDasharray={lanBUp ? undefined : '6 4'} />
                <path id="c-bus-b-gtw" d={pathBusLanBToGtw} fill="none" stroke={lanBUp ? '#C026D3' : '#EF4444'} strokeWidth="3" strokeDasharray={lanBUp ? undefined : '6 4'} />
                <path id="c-bus-b-hmi" d={pathBusLanBToHmi} fill="none" stroke={lanBUp ? '#C026D3' : '#EF4444'} strokeWidth="3" strokeDasharray={lanBUp ? undefined : '6 4'} />
                {[P.iedLanB, P.swLanBIn, P.swLanBOut, P.gtwLanB, P.hmiLanB].map((pt, idx) => (
                  <circle key={`lb-pt-${idx}`} cx={pt.x} cy={pt.y} r="3.2" fill={lanBUp ? '#E879F9' : '#EF4444'} stroke="#0F172A" strokeWidth="1" />
                ))}
                {lanBUp && (
                  <>
                    <circle r="3.8" fill="#F0ABFC" filter="url(#lcaCleanGlow)">
                      <animateMotion dur={dur(1.6)} begin="0.35s" repeatCount="indefinite"><mpath href="#c-ied-b" /></animateMotion>
                    </circle>
                    <circle r="3.8" fill="#E879F9" filter="url(#lcaCleanGlow)">
                      <animateMotion dur={dur(2.3)} begin="0.6s" repeatCount="indefinite"><mpath href="#c-bus-b-hmi" /></animateMotion>
                    </circle>
                  </>
                )}
              </>
            )}

            {/* PROTOCOL OVERLAY PACKETS (Riding ON Physical LAN A/B Cables — NOT Separate Wires!) */}
            {/* Green MMS Overlay (IED <-> Station Bus <-> Gateway / SCADA) */}
            {mmsHealthy && (
              <>
                <circle r="4.6" fill="#4ADE80" filter="url(#lcaCleanGlow)">
                  <animateMotion dur={dur(2.1)} repeatCount="indefinite" path={pathMmsToGtw} />
                </circle>
                <circle r="4.6" fill="#22C55E" filter="url(#lcaCleanGlow)">
                  <animateMotion dur={dur(2.6)} begin="0.8s" repeatCount="indefinite" path={pathMmsToHmi} />
                </circle>
              </>
            )}

            {/* Cyan GOOSE Overlay (IED -> Station Bus LAN A & LAN B only; NEVER toward Gateway) */}
            {gooseLanAActive && (
              <circle r="4.4" fill="#00E5FF" filter="url(#lcaCleanGlow)">
                <animateMotion dur={dur(1.25)} begin="0.2s" repeatCount="indefinite"><mpath href="#c-ied-a" /></animateMotion>
              </circle>
            )}
            {gooseLanBActive && (
              <circle r="4.4" fill="#00E5FF" filter="url(#lcaCleanGlow)">
                <animateMotion dur={dur(1.25)} begin="0.7s" repeatCount="indefinite"><mpath href="#c-ied-b" /></animateMotion>
              </circle>
            )}

            {/* Compact Tray Labels */}
            <rect x="122" y="264" width="128" height="20" rx="6" fill="#04192C" stroke={isDiFailed ? '#EF4444' : '#FACC15'} strokeWidth="1" />
            <text x="186" y="277" textAnchor="middle" fill={isDiFailed ? '#FCA5A5' : '#FEF08A'} fontSize="8.8" fontWeight="800" fontFamily="monospace">Hardwired DI · 110V</text>

            <rect x="598" y="264" width="76" height="20" rx="6" fill={lanAUp ? '#0369A1' : '#7F1D1D'} stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="1" />
            <text x="636" y="277" textAnchor="middle" fill="#E0F2FE" fontSize="8.8" fontWeight="800" fontFamily="monospace">LAN A (PRP)</text>

            <rect x="700" y="264" width="76" height="20" rx="6" fill={lanBUp ? '#701A75' : '#7F1D1D'} stroke={lanBUp ? '#E879F9' : '#EF4444'} strokeWidth="1" />
            <text x="738" y="277" textAnchor="middle" fill="#FAE8FF" fontSize="8.8" fontWeight="800" fontFamily="monospace">LAN B (PRP)</text>

            <rect x="928" y="264" width="174" height="20" rx="6" fill="#04192C" stroke={mmsHealthy ? '#22C55E' : '#EF4444'} strokeWidth="1" />
            <text x="1015" y="277" textAnchor="middle" fill={mmsHealthy ? '#4ADE80' : '#FCA5A5'} fontSize="8.8" fontWeight="800" fontFamily="monospace">
              {mmsHealthy ? 'MMS Overlay (TCP/102)' : 'MMS Disconnected'}
            </text>

            {/* Compact Protocol Legend Bar */}
            <rect x="16" y="296" width="1168" height="34" rx="8" fill="#041525" stroke="#0B7BA4" strokeWidth="1.2" />
            <text x="34" y="317" fill="#9ED8F6" fontSize="10.2" fontWeight="800">Legend :</text>
            <line x1="92" y1="313" x2="120" y2="313" stroke="#FACC15" strokeWidth="3" /><text x="128" y="317" fill="#E2F1FC" fontSize="9.8">Hardwired DI (DC)</text>
            <line x1="252" y1="313" x2="280" y2="313" stroke="#38BDF8" strokeWidth="3" /><text x="288" y="317" fill="#E2F1FC" fontSize="9.8">PRP LAN A (Physical)</text>
            <line x1="428" y1="313" x2="456" y2="313" stroke="#D946EF" strokeWidth="3" /><text x="464" y="317" fill="#E2F1FC" fontSize="9.8">PRP LAN B (Physical)</text>
            <circle cx="614" cy="313" r="4.5" fill="#4ADE80" /><text x="626" y="317" fill="#E2F1FC" fontSize="9.8">MMS Overlay (TCP/102)</text>
            <circle cx="786" cy="313" r="4.5" fill="#00E5FF" /><text x="798" y="317" fill="#E2F1FC" fontSize="9.8">GOOSE Overlay (L2 0x88B8 · Pub → Sub IEDs)</text>
          </svg>
        </div>
      </div>

      {/* SEPARATE EXPANDABLE SECTION: "GOOSE Subscriber Network" (Collapsed by default!) */}
      <div className="border-t border-[#0E6A94] bg-[#031324] px-4 py-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setGooseNetworkExpanded((v) => !v)}
            className="flex items-center gap-2 text-xs font-extrabold text-white hover:text-[#00E5FF] transition"
          >
            <Network className="w-4 h-4 text-[#00E5FF]" />
            <span>GOOSE Subscriber Network</span>
            <span
              className="px-2 py-0.5 rounded-full text-[9.5px] font-mono font-bold border"
              style={{
                backgroundColor: !hasGooseSubscribers ? '#0A1E33' : gooseAnyActive ? '#062E20' : '#3B0D15',
                borderColor: !hasGooseSubscribers ? '#1E4E74' : gooseAnyActive ? '#22C55E' : '#EF4444',
                color: !hasGooseSubscribers ? '#94B8D7' : gooseAnyActive ? '#4ADE80' : '#FCA5A5',
              }}
            >
              {!hasGooseSubscribers
                ? 'No Configured Subscriber'
                : gooseAnyActive
                ? `${subscriberRecords.length} Subscriber${subscriberRecords.length > 1 ? 's' : ''} · ${primaryGoose?.appId} VLAN ${primaryGoose?.vlanId}`
                : 'Blocked / Unavailable'}
            </span>
            {gooseNetworkExpanded ? <ChevronUp className="w-4 h-4 text-[#7DD3FC]" /> : <ChevronDown className="w-4 h-4 text-[#7DD3FC]" />}
          </button>

          <span className="text-[10px] font-mono text-[#7DD3FC]">
            {gooseNetworkExpanded ? 'Showing Publisher → PRP Switches → Subscriber IEDs port mapping' : 'Expand for port-to-port GOOSE subscriber topology'}
          </span>
        </div>

        {gooseNetworkExpanded && (
          <div className="mt-3 space-y-3 pb-1">
            {!hasGooseSubscribers ? (
              <div className="rounded-lg border border-[#1B4B72] bg-[#04182B] p-3 text-xs text-[#94B8D7] flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-[#38BDF8] shrink-0" />
                  <span>
                    <b>No configured GOOSE subscriber</b> for <code>{iedName}</code>. Publisher ports:{' '}
                    <code>LAN A: {pubPorts.lanA.iedPort}</code> / <code>LAN B: {pubPorts.lanB.iedPort}</code>.
                  </span>
                </span>
                {(!pubPorts.lanA.configured || !pubPorts.lanB.configured) && (
                  <button
                    type="button"
                    onClick={() => openPortEditor(bay.iedId)}
                    className="px-2 py-0.5 rounded border border-[#F59E0B] bg-[#332206] text-[#FCD34D] text-[10px] font-bold flex items-center gap-1"
                  >
                    <Settings className="w-3 h-3" /> Configure Ports
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Publisher -> Switches Summary Strip */}
                <div className="rounded-lg border border-[#164463] bg-[#020E1B] px-3 py-2 flex flex-wrap items-center justify-between gap-2 font-mono text-[10.5px]">
                  <div className="flex items-center gap-2">
                    <img src={resolvedIedImg} alt={iedModel} className="h-9 w-9 object-contain" />
                    <div>
                      <div className="text-white font-bold">
                        Publisher: {iedName} <span className="text-[#9ED8F6] font-normal">({ied?.vendor || vendorName} {ied?.model || iedModel})</span>
                      </div>
                      <div className="text-[#7DD3FC] text-[9.5px]">
                        GoCBRef: {primaryGoose?.gocbRef} · DataSet: {primaryGoose?.datSet}
                      </div>
                    </div>
                  </div>
                  <div className="text-[9.5px] space-y-0.5 text-right">
                    <div className="text-[#38BDF8]">
                      LAN A: {pubPorts.lanA.iedPort} → {pubPorts.lanA.switchName}/{pubPorts.lanA.switchPort} ({lanAUp ? 'UP' : 'DOWN'})
                    </div>
                    <div className="text-[#E879F9]">
                      LAN B: {pubPorts.lanB.iedPort} → {pubPorts.lanB.switchName}/{pubPorts.lanB.switchPort} ({lanBUp && !isSingleAttached ? 'UP' : 'DOWN'})
                    </div>
                  </div>
                </div>

                {/* Configured Subscriber IED Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {subscriberRecords.map((sub) => {
                    const subLanAOk = gooseLanAActive && sub.ports.lanA.linkStatus !== 'DOWN';
                    const subLanBOk = gooseLanBActive && sub.ports.lanB.linkStatus !== 'DOWN';
                    const subHealthy = subLanAOk || subLanBOk;
                    const confRevOk = primaryGoose?.mismatchFault !== 'CONFREV_MISMATCH';

                    return (
                      <div
                        key={sub.subId}
                        onClick={() => setInspectedSubscriberId(sub.subId)}
                        className="rounded-xl border p-3 cursor-pointer transition hover:brightness-110 flex gap-3 items-start"
                        style={{
                          backgroundColor: '#04182B',
                          borderColor:
                            inspectedSubscriberId === sub.subId
                              ? '#00E5FF'
                              : subHealthy
                              ? '#0E6A94'
                              : '#EF4444',
                        }}
                      >
                        <div className="w-16 shrink-0 flex flex-col items-center">
                          <img
                            src={sub.imgSrc}
                            alt={`${sub.vendor} ${sub.model}`}
                            className={`h-16 w-16 object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.75)] ${
                              subHealthy ? '' : 'opacity-50 grayscale'
                            }`}
                          />
                          <span className="mt-1 text-[8.5px] font-mono px-1.5 py-0.5 rounded bg-[#031222] border border-[#1B4B72] text-[#7DD3FC]">
                            {sub.nodeType}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0 space-y-1 text-[10.5px]">
                          <div className="flex flex-wrap items-center justify-between gap-1">
                            <div>
                              <span className="font-extrabold text-white text-xs">{sub.displayName}</span>{' '}
                              <span className="text-[#9ED8F6]">({sub.vendor} {sub.model})</span>
                            </div>
                            <span
                              className="px-2 py-0.5 rounded-full text-[9px] font-extrabold border"
                              style={{
                                backgroundColor: subHealthy ? '#062E20' : '#3B0D15',
                                borderColor: subHealthy ? '#22C55E' : '#EF4444',
                                color: subHealthy ? '#4ADE80' : '#FCA5A5',
                              }}
                            >
                              {subHealthy
                                ? subLanAOk && subLanBOk
                                  ? 'PRP A+B ACTIVE'
                                  : `DEGRADED (${subLanAOk ? 'LAN A' : 'LAN B'})`
                                : 'BLOCKED / TIMEOUT'}
                            </span>
                          </div>

                          <div className="space-y-0.5 font-mono text-[9.5px] bg-[#020E1B] rounded p-1.5 border border-[#123952]">
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[#38BDF8] truncate">
                                LAN A: {iedName}/{pubPorts.lanA.iedPort} → {pubPorts.lanA.switchName}/{pubPorts.lanA.switchPort} → {sub.displayName}/{sub.ports.lanA.iedPort}
                              </span>
                              <span className={subLanAOk ? 'text-[#4ADE80] font-bold' : 'text-[#F87171] font-bold'}>
                                {lanAUp ? 'UP' : 'DOWN'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <span className="text-[#E879F9] truncate">
                                LAN B: {iedName}/{pubPorts.lanB.iedPort} → {pubPorts.lanB.switchName}/{pubPorts.lanB.switchPort} → {sub.displayName}/{sub.ports.lanB.iedPort}
                              </span>
                              <span className={subLanBOk ? 'text-[#4ADE80] font-bold' : 'text-[#F87171] font-bold'}>
                                {lanBUp && !isSingleAttached ? 'UP' : 'DOWN'}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[9.5px] text-[#94B8D7]">
                            <span>
                              stNum: <b className="text-white">{primaryGoose?.stNum ?? 'N/A'}</b> · sqNum:{' '}
                              <b className="text-white">{primaryGoose?.sqNum ?? 'N/A'}</b> · ConfRev:{' '}
                              <b className={confRevOk ? 'text-[#4ADE80]' : 'text-[#F87171]'}>
                                {primaryGoose?.confRev ?? 'N/A'} ({confRevOk ? 'OK' : 'Mismatch'})
                              </b>
                            </span>
                            {(!sub.ports.lanA.configured || !sub.ports.lanB.configured) && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openPortEditor(sub.subId);
                                }}
                                className="px-1.5 py-0.5 rounded border border-[#F59E0B] bg-[#332206] text-[#FCD34D] text-[9px] font-bold"
                              >
                                Configure Port
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* GOOSE Configuration Inspector Drawer */}
            {inspectedSub && primaryGoose && (
              <div className="rounded-lg border border-[#00E5FF] bg-[#020E1C] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-extrabold text-[#00E5FF]">
                    <Cpu className="w-4 h-4" />
                    <span>GOOSE Configuration Inspector — {iedName} → {inspectedSub.displayName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectedSubscriberId(null)}
                    className="px-2 py-0.5 rounded bg-[#07243D] text-[#7DD3FC] hover:text-white text-xs font-bold flex items-center gap-1"
                  >
                    <X className="w-3.5 h-3.5" /> Close
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 font-mono text-[10px]">
                  {[
                    ['Publisher IED', `${iedName} (${ied?.model || iedModel})`],
                    ['Subscriber IED', `${inspectedSub.displayName} (${inspectedSub.model})`],
                    ['Source Interfaces', `A: ${pubPorts.lanA.iedPort} | B: ${pubPorts.lanB.iedPort}`],
                    ['Destination Interfaces', `A: ${inspectedSub.ports.lanA.iedPort} | B: ${inspectedSub.ports.lanB.iedPort}`],
                    ['Switch Ports', `${pubPorts.lanA.switchName}:${pubPorts.lanA.switchPort} | ${pubPorts.lanB.switchName}:${pubPorts.lanB.switchPort}`],
                    ['GoCBRef', primaryGoose.gocbRef || 'Not configured'],
                    ['DataSet Reference', primaryGoose.datSet || 'Not configured'],
                    ['APPID', primaryGoose.appId || 'Not configured'],
                    ['VLAN ID / Priority', `${primaryGoose.vlanId ?? 'Not configured'} / P${primaryGoose.vlanPriority ?? 'N/A'}`],
                    ['Multicast MAC', primaryGoose.multicastMac || 'Not configured'],
                    ['ConfRev', String(primaryGoose.confRev ?? 'Not available')],
                    ['stNum / sqNum', `${primaryGoose.stNum ?? 'N/A'} / ${primaryGoose.sqNum ?? 'N/A'}`],
                    ['TimeAllowedToLive', primaryGoose.timeAllowedToLiveMs ? `${primaryGoose.timeAllowedToLiveMs} ms` : 'Not available'],
                    ['Subscription Status', gooseAnyActive ? (redundancyDegraded ? 'DEGRADED (1 LAN)' : 'ACTIVE (PRP A+B)') : 'BLOCKED / UNAVAILABLE'],
                    ['Last Frame Timestamp', primaryGoose.lastTxTimestamp || 'Not available'],
                  ].map(([label, val]) => (
                    <div key={label} className="p-2 rounded bg-[#041628] border border-[#164463]">
                      <div className="text-[9px] text-[#8BB3D4] font-sans">{label}</div>
                      <div className="font-bold text-white break-all mt-0.5">{val}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Inline Port Configuration Editor (Only shown when user clicks Configure Port) */}
      {editingPortIedId && (
        <div className="border-t border-[#F59E0B] bg-[#1A1305] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2 font-mono">
            <ShieldAlert className="w-4 h-4 text-[#FBBF24]" />
            <span className="font-bold text-[#FDE68A]">Configure Ports for {editingPortIedId}:</span>
            <input
              type="text"
              placeholder="IED LAN A Port"
              value={draftPort.srcPortA || ''}
              onChange={(e) => setDraftPort((d) => ({ ...d, srcPortA: e.target.value }))}
              className="px-2 py-1 rounded bg-[#041526] border border-[#1E4E74] text-white text-[11px] w-36"
            />
            <input
              type="text"
              placeholder="SW-LAN-A Port"
              value={draftPort.swPortA || ''}
              onChange={(e) => setDraftPort((d) => ({ ...d, swPortA: e.target.value }))}
              className="px-2 py-1 rounded bg-[#041526] border border-[#1E4E74] text-white text-[11px] w-36"
            />
            <input
              type="text"
              placeholder="IED LAN B Port"
              value={draftPort.srcPortB || ''}
              onChange={(e) => setDraftPort((d) => ({ ...d, srcPortB: e.target.value }))}
              className="px-2 py-1 rounded bg-[#041526] border border-[#1E4E74] text-white text-[11px] w-36"
            />
            <input
              type="text"
              placeholder="SW-LAN-B Port"
              value={draftPort.swPortB || ''}
              onChange={(e) => setDraftPort((d) => ({ ...d, swPortB: e.target.value }))}
              className="px-2 py-1 rounded bg-[#041526] border border-[#1E4E74] text-white text-[11px] w-36"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={savePortOverride}
              className="px-3 py-1 rounded bg-[#063322] border border-[#22C55E] text-[#4ADE80] font-bold flex items-center gap-1"
            >
              <CheckCircle2 className="w-3.5 h-3.5" /> Save Ports
            </button>
            <button
              type="button"
              onClick={() => setEditingPortIedId(null)}
              className="px-2.5 py-1 rounded bg-[#071F36] border border-[#1E4E74] text-[#94B8D7] font-bold"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
