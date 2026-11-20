import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings2,
  ShieldAlert,
  Zap,
} from 'lucide-react';
import {
  BayEquipment,
  GooseControlBlock,
  InstantiatedSasSignal,
  MultiVendorIed,
  NetworkLink,
  NetworkRedundancyMode,
} from '../types/substation';
import { getIedImageByModel } from '../data/iedImageRegistry';

export type SignalChainFaultMode =
  | 'NONE'
  | 'DI_INPUT_FAIL'
  | 'WRONG_IEC_REF'
  | 'DATASET_MISSING'
  | 'REPORT_DISABLED'
  | 'GOOSE_TIMEOUT'
  | 'MMS_DISCONNECT'
  | 'BAD_QUALITY'
  | 'HMI_TAG_MISMATCH';

export interface SignalChainActiveModel {
  row: {
    catalogNumber: number;
    signalName: string;
    category: string;
    defaultDataset: string;
    transportType: string;
  };
  bay: BayEquipment;
  vendorName: string;
  iedModel: string;
  iedName: string;
  lnPart: string;
  doPart: string;
  daPart: string;
  fc: string;
  cdcShort: string;
  gooseCbName: string;
  reportCbName: string;
  displayVal: string;
  scadaTag: string;
  stageStates: ('OK' | 'WARN' | 'ERR')[];
  overallQuality: string;
  fieldIoTitle: string;
  diModuleTitle: string;
  diChannelLabel: string;
}

interface SignalChainDashboardProps {
  activeChain: SignalChainActiveModel;
  ied?: MultiVendorIed;
  networkLinks: NetworkLink[];
  gooseControlBlocks: GooseControlBlock[];
  networkRedundancyMode: NetworkRedundancyMode;
  tracedPoint?: InstantiatedSasSignal;
  chainFaultMode: SignalChainFaultMode;
  setChainFaultMode: (mode: SignalChainFaultMode) => void;
  selectedStageIndex: number | null;
  setSelectedStageIndex: (idx: number | null) => void;
  liveClockStr: string;
  onToggleBreaker: (bayId: string, target: 'OPEN' | 'CLOSED') => boolean;
  onTriggerTrip: (bayId: string, fn?: string) => void;
  onResetTrip: (bayId: string) => void;
}

interface TimelineEntry {
  time: string;
  detail: string;
  severity: 'INFO' | 'WARN' | 'ERR';
}

function formatMsTime(d = new Date()): string {
  const pad = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

export const SignalChainDashboard: React.FC<SignalChainDashboardProps> = ({
  activeChain,
  ied,
  networkLinks,
  gooseControlBlocks,
  networkRedundancyMode,
  chainFaultMode,
  setChainFaultMode,
  selectedStageIndex,
  setSelectedStageIndex,
  liveClockStr,
  onToggleBreaker,
  onTriggerTrip,
  onResetTrip,
}) => {
  const { bay } = activeChain;
  const svgRef = useRef<SVGSVGElement | null>(null);

  // Animation engine state (visual pause/resume does NOT stop underlying store simulation)
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  // Independent PRP & Fault Simulation toggles
  const [lanAFailed, setLanAFailed] = useState<boolean>(false);
  const [lanBFailed, setLanBFailed] = useState<boolean>(false);
  const [interlockTripActive, setInterlockTripActive] = useState<boolean>(false);

  // Simulated counters (clearly labeled as Simulated in UI)
  const [simPackets, setSimPackets] = useState({
    mms: 1482,
    goose: 24892,
    iec104: 940,
  });

  // 6-stage timestamps synchronized to breaker/bay/fault events
  const [stageTimes, setStageTimes] = useState<string[]>(() => {
    const base = Date.now();
    return [0, 4, 6, 9, 10, 11].map((offset) => formatMsTime(new Date(base + offset)));
  });

  const [timeline, setTimeline] = useState<TimelineEntry[]>(() => {
    const t = formatMsTime();
    return [
      { time: t, detail: `Field contact 52a/52b synchronized (${bay.bayCode}: ${bay.breakerState})`, severity: 'INFO' },
      { time: t, detail: `DI module acquired ${activeChain.diChannelLabel}`, severity: 'INFO' },
      { time: t, detail: `${activeChain.iedName} updated ${activeChain.lnPart}.${activeChain.doPart}.${activeChain.daPart}`, severity: 'INFO' },
      { time: t, detail: `DataSet (${activeChain.row.defaultDataset}) generated`, severity: 'INFO' },
      { time: t, detail: `${activeChain.reportCbName} / ${activeChain.gooseCbName} active`, severity: 'INFO' },
      { time: t, detail: `SCADA/HMI updated — ${bay.bayCode} Breaker = ${bay.breakerState}`, severity: 'INFO' },
    ];
  });

  // Derive authoritative link and protocol states
  const bayLinks = useMemo(
    () => networkLinks.filter((l) => l.sourceId === bay.iedId || l.targetId === bay.iedId),
    [networkLinks, bay.iedId]
  );
  const storeLanAUp = bayLinks.find((l) => l.lanPlane === 'LAN_A')?.status !== 'DOWN';
  const storeLanBUp = bayLinks.find((l) => l.lanPlane === 'LAN_B')?.status !== 'DOWN';

  const isSingleAttached = ied?.nodeType === 'REDBOX_SAN';
  const isIedFailed = chainFaultMode === 'REPORT_DISABLED' || bay.quality === 'INVALID';
  const isDiFailed = chainFaultMode === 'DI_INPUT_FAIL' || !bay.dcSupplyHealthy;
  const isMmsLoss = chainFaultMode === 'MMS_DISCONNECT' || isIedFailed;
  const isGooseBlocked =
    chainFaultMode === 'GOOSE_TIMEOUT' ||
    isIedFailed ||
    gooseControlBlocks.some((g) => g.publisherIedId === bay.iedId && !g.healthy);

  const lanAUp = !lanAFailed && storeLanAUp && !isIedFailed;
  const lanBUp = !lanBFailed && storeLanBUp && !isIedFailed && networkRedundancyMode !== 'SINGLE_LAN';
  const anyLanUp = lanAUp || lanBUp;
  const redundancyDegraded = (lanAUp && !lanBUp) || (!lanAUp && lanBUp);

  const mmsHealthy = !isMmsLoss && anyLanUp && chainFaultMode !== 'DATASET_MISSING' && chainFaultMode !== 'WRONG_IEC_REF';
  const gooseHealthy = !isGooseBlocked && anyLanUp && chainFaultMode !== 'DATASET_MISSING';
  const iec104Healthy = mmsHealthy && chainFaultMode !== 'HMI_TAG_MISMATCH';

  const isBreakerClosed = bay.breakerState === 'CLOSED';
  const contact52aOn = isBreakerClosed && !isDiFailed;
  const contact52bOn = !isBreakerClosed && !isDiFailed;

  // Dynamic IED image: use Schneider MiCOM P143 asset for Schneider P143 or fallback to bay's configured model
  const iedImageSrc = useMemo(() => {
    if (
      activeChain.vendorName.toLowerCase().includes('schneider') &&
      activeChain.iedModel.toLowerCase().includes('p143')
    ) {
      return 'assets/signal-chain/protection-ied.png';
    }
    return getIedImageByModel(activeChain.vendorName, activeChain.iedModel) || 'assets/signal-chain/protection-ied.png';
  }, [activeChain.vendorName, activeChain.iedModel]);

  const isDefaultMiComP143 = iedImageSrc === 'assets/signal-chain/protection-ied.png';

  // Control SVG native SMIL animations on Pause/Resume
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (playing) {
        svg.unpauseAnimations?.();
      } else {
        svg.pauseAnimations?.();
      }
    } catch {
      // Ignore in non-DOM test environments
    }
  }, [playing]);

  // Update simulated packet counters & timeline on breaker/bay/fault transitions
  useEffect(() => {
    const now = Date.now();
    setStageTimes([0, 4, 6, 9, 10, 11].map((ms) => formatMsTime(new Date(now + ms))));

    const newEntries: TimelineEntry[] = [
      {
        time: formatMsTime(new Date(now)),
        detail: `Field contact 52a=${contact52aOn ? '1' : '0'}, 52b=${contact52bOn ? '1' : '0'} (${bay.bayCode} ${bay.breakerState})`,
        severity: isDiFailed ? 'ERR' : 'INFO',
      },
      {
        time: formatMsTime(new Date(now + 4)),
        detail: isDiFailed
          ? `DI acquisition fault on ${activeChain.diChannelLabel} (q=0x0100 Invalid)`
          : `DI module acquired ${activeChain.diChannelLabel} = ${contact52aOn ? '1' : '0'}`,
        severity: isDiFailed ? 'ERR' : 'INFO',
      },
      {
        time: formatMsTime(new Date(now + 6)),
        detail: `${activeChain.iedName} updated ${activeChain.lnPart}.${activeChain.doPart}.${activeChain.daPart} = ${activeChain.displayVal}`,
        severity: isIedFailed ? 'ERR' : 'INFO',
      },
      {
        time: formatMsTime(new Date(now + 9)),
        detail: `DataSet (${activeChain.row.defaultDataset}) ${chainFaultMode === 'DATASET_MISSING' ? 'FCDA missing!' : 'generated'}`,
        severity: chainFaultMode === 'DATASET_MISSING' ? 'ERR' : 'INFO',
      },
      {
        time: formatMsTime(new Date(now + 10)),
        detail: !anyLanUp
          ? 'PRP LAN A & LAN B down — communication path lost'
          : redundancyDegraded
          ? `PRP redundancy degraded (${lanAUp ? 'LAN A active' : 'LAN B active'}) — 0 ms failover`
          : `MMS (${mmsHealthy ? 'OK' : 'DOWN'}) / GOOSE (${gooseHealthy ? 'OK' : 'BLOCKED'}) published`,
        severity: !anyLanUp || !mmsHealthy || !gooseHealthy ? 'WARN' : 'INFO',
      },
      {
        time: formatMsTime(new Date(now + 11)),
        detail: `SCADA/HMI updated — ${bay.bayCode} Breaker = ${bay.breakerState} (${activeChain.overallQuality})`,
        severity: chainFaultMode !== 'NONE' || !anyLanUp ? 'WARN' : 'INFO',
      },
    ];
    setTimeline((prev) => [...newEntries.reverse(), ...prev].slice(0, 12));
  }, [
    bay.id,
    bay.breakerState,
    chainFaultMode,
    lanAFailed,
    lanBFailed,
    activeChain.lnPart,
    activeChain.doPart,
    activeChain.daPart,
  ]);

  // Increment simulated packet counters when playing and healthy
  useEffect(() => {
    if (!playing) return;
    const intervalMs = Math.max(250, Math.round(1000 / speed));
    const id = window.setInterval(() => {
      setSimPackets((prev) => ({
        mms: mmsHealthy ? prev.mms + Math.round(10 / speed) : prev.mms,
        goose: gooseHealthy ? prev.goose + Math.round(120 / speed) : prev.goose,
        iec104: iec104Healthy ? prev.iec104 + Math.round(6 / speed) : prev.iec104,
      }));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, speed, mmsHealthy, gooseHealthy, iec104Healthy]);

  const handleReset = () => {
    setPlaying(true);
    setSpeed(1);
    setLanAFailed(false);
    setLanBFailed(false);
    setInterlockTripActive(false);
    setChainFaultMode('NONE');
    if (bay.protectionTripActive) {
      onResetTrip(bay.id);
    }
    setSimPackets({ mms: 1482, goose: 24892, iec104: 940 });
    setTimeline((prev) => [
      { time: formatMsTime(), detail: `Simulation reset — ${bay.bayCode} (${activeChain.iedName}) healthy`, severity: 'INFO' },
      ...prev.slice(0, 8),
    ]);
  };

  const handleInterlockTripToggle = (checked: boolean) => {
    setInterlockTripActive(checked);
    if (checked) {
      onTriggerTrip(bay.id, '50/51 Overcurrent Test');
    } else {
      onResetTrip(bay.id);
    }
  };

  const animDur = (baseSec: number) => `${(baseSec / speed).toFixed(2)}s`;

  const qualityBadgeColor =
    chainFaultMode === 'NONE' && anyLanUp && bay.quality === 'GOOD'
      ? { bg: '#072E22', border: '#22C55E', text: '#4ADE80', label: 'GOOD' }
      : redundancyDegraded || chainFaultMode === 'BAD_QUALITY'
      ? { bg: '#332206', border: '#F59E0B', text: '#FBBF24', label: 'DEGRADED' }
      : { bg: '#3B0D15', border: '#FF5C65', text: '#FDA4AF', label: 'FAULT / INVALID' };

  const primaryGoose = gooseControlBlocks.find((g) => g.publisherIedId === bay.iedId);

  return (
    <div className="space-y-3">
      {/* Top Signal Chain Header Bar matching Reference */}
      <div
        className="rounded-xl border px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
        style={{
          background: 'linear-gradient(90deg, #041628 0%, #07223B 50%, #041628 100%)',
          borderColor: '#00DFFF',
          boxShadow: '0 0 20px rgba(0, 223, 255, 0.16), inset 0 0 14px rgba(0, 223, 255, 0.06)',
        }}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-sm sm:text-base font-extrabold text-white tracking-tight">
            Real-Time IEC 61850 SAS Signal Chain — {bay.bayCode}{' '}
            <span className="text-[#8AD8FF] font-semibold">({bay.name})</span>
          </h2>
          <span
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold border"
            style={{
              backgroundColor: playing && anyLanUp ? '#062E20' : '#331F06',
              borderColor: playing && anyLanUp ? '#22C55E' : '#F59E0B',
              color: playing && anyLanUp ? '#4ADE80' : '#FCD34D',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${playing && anyLanUp ? 'bg-[#22C55E] animate-pulse' : 'bg-[#F59E0B]'}`} />
            {playing ? 'SIMULATION LIVE' : 'PAUSED'}
          </span>
        </div>

        {/* Right KPI Status Pills + Quick Breaker Toggle */}
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <button
            type="button"
            onClick={() => onToggleBreaker(bay.id, isBreakerClosed ? 'OPEN' : 'CLOSED')}
            title="Click to command Breaker OPEN/CLOSED via SBO"
            className="px-2.5 py-1 rounded-lg border bg-[#041526] hover:brightness-125 transition flex items-center gap-1.5"
            style={{ borderColor: isBreakerClosed ? '#22C55E' : '#F59E0B' }}
          >
            <span className="text-[#94B8D7]">Breaker Status :</span>
            <span className="font-extrabold" style={{ color: isBreakerClosed ? '#4ADE80' : '#FBBF24' }}>
              {bay.breakerState}
            </span>
          </button>

          <div
            className="px-2.5 py-1 rounded-lg border bg-[#041526] flex items-center gap-1.5"
            style={{ borderColor: qualityBadgeColor.border }}
          >
            <span className="text-[#94B8D7]">Quality :</span>
            <span className="font-extrabold" style={{ color: qualityBadgeColor.text }}>
              {qualityBadgeColor.label}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg border border-[#1B4B72] bg-[#041526] flex items-center gap-1.5">
            <span className="text-[#94B8D7]">Latency (MMS Sim) :</span>
            <span className="font-extrabold text-[#FACC15]">{mmsHealthy ? `${Math.max(4, Math.round(12 / speed))} ms` : 'TIMEOUT'}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg border border-[#1B4B72] bg-[#041526] flex items-center gap-1.5">
            <span className="text-[#94B8D7]">Latency (GOOSE Sim) :</span>
            <span className="font-extrabold text-[#38BDF8]">{gooseHealthy ? `${Math.max(1, Math.round(3 / speed))} ms` : 'BLOCKED'}</span>
          </div>
        </div>
      </div>

      {/* Main 6-Device Hardware Signal Chain + Physical SVG Cabling */}
      <div
        className="rounded-xl border p-3 relative overflow-x-auto"
        style={{
          borderColor: '#00DFFF',
          background: 'radial-gradient(ellipse at 50% 35%, #082744 0%, #041526 68%, #020C17 100%)',
          boxShadow: '0 0 24px rgba(0, 223, 255, 0.14), inset 0 0 28px rgba(0, 175, 255, 0.08)',
        }}
      >
        <style>{`
          @keyframes sasLedBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          .sas-led-blink { animation: sasLedBlink 0.9s infinite; }
          .sas-paused .sas-led-blink { animation-play-state: paused; }
        `}</style>

        <div className={`min-w-[1120px] relative ${playing ? '' : 'sas-paused'}`}>
          {/* 6 Device Columns */}
          <div className="grid grid-cols-6 gap-2.5 items-start relative z-10 pb-20">
            {/* DEVICE 1: FIELD I/O */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(0)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[90%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Field I/O</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(Breaker Aux Contacts)</div>
              </div>
              <div className="relative w-full h-[175px] mt-2 flex items-center justify-center">
                <img
                  src="assets/signal-chain/field-io.png"
                  alt="Field I/O Marshalling Cabinet"
                  className="max-h-[168px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                />
                {/* Dynamic 52a / 52b Contact Status Overlays */}
                <div className="absolute inset-x-0 top-[34%] flex flex-col items-center gap-1.5 pointer-events-none">
                  <div
                    className="px-2 py-0.5 rounded border text-[9.5px] font-mono font-extrabold flex items-center gap-1.5 shadow-lg"
                    style={{
                      backgroundColor: contact52aOn ? 'rgba(6, 40, 24, 0.94)' : 'rgba(15, 23, 42, 0.92)',
                      borderColor: contact52aOn ? '#22C55E' : '#475569',
                      color: contact52aOn ? '#4ADE80' : '#94A3B8',
                    }}
                  >
                    <span>52a ({contact52aOn ? 'CLOSED' : 'OPEN'})</span>
                    <span className={`w-2 h-2 rounded-full ${contact52aOn ? 'bg-[#22C55E] shadow-[0_0_6px_#22C55E]' : 'bg-slate-600'}`} />
                  </div>
                  <div
                    className="px-2 py-0.5 rounded border text-[9.5px] font-mono font-extrabold flex items-center gap-1.5 shadow-lg"
                    style={{
                      backgroundColor: contact52bOn ? 'rgba(6, 40, 24, 0.94)' : 'rgba(15, 23, 42, 0.92)',
                      borderColor: contact52bOn ? '#22C55E' : '#475569',
                      color: contact52bOn ? '#4ADE80' : '#94A3B8',
                    }}
                  >
                    <span>52b ({contact52bOn ? 'CLOSED' : 'OPEN'})</span>
                    <span className={`w-2 h-2 rounded-full ${contact52bOn ? 'bg-[#22C55E] shadow-[0_0_6px_#22C55E]' : 'bg-slate-600'}`} />
                  </div>
                </div>
              </div>
              <div className="w-[92%] rounded border border-[#0D6A92] bg-[#041729]/90 px-2 py-1 text-[9.5px] font-mono text-[#BAE6FD]">
                TB X1:1–2 · {bay.dcSupplyHealthy && !isDiFailed ? '110V DC OK' : 'DC FAULT'}
              </div>
            </button>

            {/* DEVICE 2: INPUT MODULE */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(1)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[90%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Input Module</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(Remote I/O – DI Card)</div>
              </div>
              <div className="relative w-full h-[175px] mt-2 flex items-center justify-center">
                <img
                  src="assets/signal-chain/di-module.png"
                  alt="Digital Input Module"
                  className="max-h-[164px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                />
                {/* Dynamic DI Channel Status Strip */}
                <div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-1.5 shadow"
                  style={{
                    backgroundColor: isDiFailed ? 'rgba(59, 13, 21, 0.94)' : 'rgba(4, 22, 38, 0.92)',
                    borderColor: isDiFailed ? '#EF4444' : '#00DFFF',
                    color: isDiFailed ? '#FCA5A5' : '#E0F2FE',
                  }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isDiFailed ? 'bg-red-500' : 'bg-[#22C55E] sas-led-blink'}`} />
                  <span>DI1:{contact52aOn ? '1' : '0'} DI2:{contact52bOn ? '1' : '0'} · 110VDC</span>
                </div>
              </div>
              <div className="w-[92%] rounded border border-[#0D6A92] bg-[#041729]/90 px-2 py-1 text-[9.5px] font-mono text-[#BAE6FD]">
                {activeChain.diChannelLabel} · Debounce 3ms
              </div>
            </button>

            {/* DEVICE 3: PROTECTION & CONTROL IED */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(2)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[94%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Protection &amp; Control IED</div>
                <div className="text-[9.5px] text-[#9ED8F6]">
                  ({activeChain.vendorName.split(' ')[0]} {activeChain.iedModel})
                </div>
              </div>
              <div className="relative w-full h-[175px] mt-2 flex items-center justify-center">
                <img
                  src={iedImageSrc}
                  alt={`${activeChain.vendorName} ${activeChain.iedModel}`}
                  className="max-h-[164px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                />
                {/* Dynamic Backlit LCD Overlay */}
                <div
                  className="absolute px-2 py-1 rounded border font-mono text-[9.5px] font-extrabold leading-tight shadow-inner pointer-events-none"
                  style={{
                    top: isDefaultMiComP143 ? '31%' : '14%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    backgroundColor: isIedFailed ? '#7F1D1D' : '#B4D455',
                    borderColor: isIedFailed ? '#EF4444' : '#3F6212',
                    color: isIedFailed ? '#FEE2E2' : '#0F1F05',
                    minWidth: '88px',
                  }}
                >
                  <div>{bay.bayCode}</div>
                  <div>{isIedFailed ? 'IED FAIL' : bay.protectionTripActive ? 'TRIP 50/51' : `CB ${bay.breakerState}`}</div>
                </div>
              </div>
              <div className="w-[92%] rounded border border-[#0D6A92] bg-[#041729]/90 px-2 py-1 text-[9.5px] font-mono text-[#BAE6FD]">
                {activeChain.iedName} · {ied?.ipAddressLanA || '10.132.10.11'}
              </div>
            </button>

            {/* DEVICE 4: STATION BUS (PRP LAN A & LAN B) */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(4)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[94%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Station Bus</div>
                <div className="text-[9.5px] text-[#9ED8F6]">
                  (IEC 61850 Switch · {isSingleAttached ? 'RedBox SAN' : networkRedundancyMode})
                </div>
              </div>
              <div className="relative w-full h-[175px] mt-2 flex items-center justify-center">
                {/* Independent LAN A & LAN B Top Badges */}
                <div className="absolute top-0 inset-x-4 flex justify-between pointer-events-none z-10">
                  <span
                    className="px-2 py-0.5 rounded text-[9.5px] font-extrabold border shadow"
                    style={{
                      backgroundColor: lanAUp ? '#082F49' : '#3B0D15',
                      borderColor: lanAUp ? '#38BDF8' : '#EF4444',
                      color: lanAUp ? '#7DD3FC' : '#FCA5A5',
                    }}
                  >
                    LAN A {lanAUp ? 'UP' : 'DOWN'}
                  </span>
                  <span
                    className="px-2 py-0.5 rounded text-[9.5px] font-extrabold border shadow"
                    style={{
                      backgroundColor: lanBUp ? '#2E1065' : '#3B0D15',
                      borderColor: lanBUp ? '#C084FC' : '#EF4444',
                      color: lanBUp ? '#E9D5FF' : '#FCA5A5',
                    }}
                  >
                    LAN B {lanBUp ? 'UP' : 'DOWN'}
                  </span>
                </div>
                <img
                  src="assets/signal-chain/prp-switches.png"
                  alt="PRP LAN A and LAN B Switches"
                  className="max-h-[158px] w-auto object-contain mt-3 drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                />
              </div>
              <div className="w-[92%] rounded border border-[#0D6A92] bg-[#041729]/90 px-2 py-1 text-[9.5px] font-mono text-[#BAE6FD]">
                {!anyLanUp
                  ? 'ALL PATHS DOWN'
                  : redundancyDegraded
                  ? 'DEGRADED (1 LAN ACTIVE)'
                  : 'PRP DUAL-LAN HEALTHY'}
              </div>
            </button>

            {/* DEVICE 5: STATION GATEWAY */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(4)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[92%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Station Gateway</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(MMS Client &amp; IEC-104)</div>
              </div>
              <div className="relative w-full h-[175px] mt-2 flex items-center justify-center">
                <img
                  src="assets/signal-chain/station-gateway.png"
                  alt="Station Gateway"
                  className="max-h-[156px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                />
                <div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border text-[9px] font-mono font-bold flex items-center gap-1.5"
                  style={{
                    backgroundColor: iec104Healthy ? 'rgba(4, 22, 38, 0.92)' : 'rgba(59, 13, 21, 0.92)',
                    borderColor: iec104Healthy ? '#22C55E' : '#EF4444',
                    color: iec104Healthy ? '#4ADE80' : '#FCA5A5',
                  }}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${iec104Healthy ? 'bg-[#22C55E] sas-led-blink' : 'bg-red-500'}`} />
                  <span>MMS:102 · 104:2404</span>
                </div>
              </div>
              <div className="w-[92%] rounded border border-[#0D6A92] bg-[#041729]/90 px-2 py-1 text-[9.5px] font-mono text-[#BAE6FD]">
                GTW-RCC-01 · {iec104Healthy ? 'CONNECTED' : 'LINK LOSS'}
              </div>
            </button>

            {/* DEVICE 6: SCADA / HMI */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(5)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[92%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">SCADA / HMI</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(Operator Workstation)</div>
              </div>
              <div className="relative w-full h-[175px] mt-2 flex items-center justify-center">
                <img
                  src="assets/signal-chain/scada-hmi.png"
                  alt="SCADA HMI Dual Monitor Workstation"
                  className="max-h-[160px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                />
                <div
                  className="absolute bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border text-[9px] font-mono font-extrabold whitespace-nowrap shadow"
                  style={{
                    backgroundColor: mmsHealthy ? 'rgba(6, 40, 24, 0.94)' : 'rgba(59, 13, 21, 0.94)',
                    borderColor: mmsHealthy ? '#22C55E' : '#EF4444',
                    color: mmsHealthy ? '#4ADE80' : '#FCA5A5',
                  }}
                >
                  {bay.bayCode}: {mmsHealthy ? bay.breakerState : 'COMM LOST'}
                </div>
              </div>
              <div className="w-[92%] rounded border border-[#0D6A92] bg-[#041729]/90 px-2 py-1 text-[9.5px] font-mono text-[#BAE6FD] truncate">
                {activeChain.scadaTag}
              </div>
            </button>
          </div>

          {/* PHYSICAL CABLING & ANIMATED PACKET SVG LAYER */}
          <svg
            ref={svgRef}
            viewBox="0 0 1200 305"
            className="absolute inset-0 w-full h-[305px] pointer-events-none z-20"
            preserveAspectRatio="none"
          >
            <defs>
              <filter id="sasGlowGreen" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="sasGlowCyan" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Bottom Industrial Metallic Cable Tray / Raceway */}
            <rect x="20" y="254" width="1160" height="22" rx="4" fill="#1E293B" stroke="#475569" strokeWidth="1.5" />
            <line x1="20" y1="260" x2="1180" y2="260" stroke="#334155" strokeWidth="1" strokeDasharray="10 8" />
            <line x1="20" y1="270" x2="1180" y2="270" stroke="#0F172A" strokeWidth="1.5" />

            {/* 1. HARDWIRED YELLOW COPPER CONTROL CABLES (Field I/O TB -> Cable Tray -> DI Input Module) */}
            <path
              id="cable-hardwired-1"
              d="M 105 215 L 105 262 L 298 262 L 298 218"
              fill="none"
              stroke={isDiFailed ? '#EF4444' : '#FACC15'}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray={isDiFailed ? '6 4' : undefined}
            />
            <path
              id="cable-hardwired-2"
              d="M 118 215 L 118 268 L 310 268 L 310 218"
              fill="none"
              stroke={isDiFailed ? '#991B1B' : '#EAB308'}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Terminal connection dots */}
            <circle cx="105" cy="215" r="4" fill="#FACC15" stroke="#0F172A" strokeWidth="1.5" />
            <circle cx="298" cy="218" r="4" fill="#FACC15" stroke="#0F172A" strokeWidth="1.5" />

            {!isDiFailed && (
              <>
                <circle r="4.5" fill="#FEF08A" filter="url(#sasGlowGreen)">
                  <animateMotion dur={animDur(1.8)} repeatCount="indefinite">
                    <mpath href="#cable-hardwired-1" />
                  </animateMotion>
                </circle>
                <circle r="3.5" fill="#FDE047">
                  <animateMotion dur={animDur(1.8)} begin="0.9s" repeatCount="indefinite">
                    <mpath href="#cable-hardwired-1" />
                  </animateMotion>
                </circle>
              </>
            )}

            {/* 2. DI MODULE -> IED INTERNAL / BACKPLANE SIGNAL */}
            <path
              id="cable-di-ied"
              d="M 358 148 L 435 148"
              fill="none"
              stroke={isDiFailed || isIedFailed ? '#EF4444' : '#22C55E'}
              strokeWidth="3"
              strokeDasharray={isDiFailed || isIedFailed ? '5 4' : undefined}
            />
            {!isDiFailed && !isIedFailed && (
              <circle r="4" fill="#4ADE80" filter="url(#sasGlowGreen)">
                <animateMotion dur={animDur(1.1)} repeatCount="indefinite">
                  <mpath href="#cable-di-ied" />
                </animateMotion>
              </circle>
            )}

            {/* 3. IED -> STATION BUS PRP LAN A (Blue) & LAN B (Red/Violet) */}
            <path
              id="cable-ied-lana"
              d="M 548 188 L 548 258 L 664 258 L 664 212"
              fill="none"
              stroke={lanAUp ? '#38BDF8' : '#EF4444'}
              strokeWidth="3.2"
              strokeLinejoin="round"
              strokeDasharray={lanAUp ? undefined : '6 4'}
            />
            <path
              id="cable-ied-lanb"
              d="M 560 188 L 560 272 L 732 272 L 732 212"
              fill="none"
              stroke={lanBUp ? '#A855F7' : '#EF4444'}
              strokeWidth="3.2"
              strokeLinejoin="round"
              strokeDasharray={lanBUp ? undefined : '6 4'}
            />
            <circle cx="664" cy="212" r="3.5" fill={lanAUp ? '#38BDF8' : '#EF4444'} />
            <circle cx="732" cy="212" r="3.5" fill={lanBUp ? '#A855F7' : '#EF4444'} />

            {lanAUp && (
              <circle r="4" fill="#7DD3FC" filter="url(#sasGlowCyan)">
                <animateMotion dur={animDur(1.6)} repeatCount="indefinite">
                  <mpath href="#cable-ied-lana" />
                </animateMotion>
              </circle>
            )}
            {lanBUp && (
              <circle r="4" fill="#E879F9" filter="url(#sasGlowCyan)">
                <animateMotion dur={animDur(1.6)} begin="0.5s" repeatCount="indefinite">
                  <mpath href="#cable-ied-lanb" />
                </animateMotion>
              </circle>
            )}

            {/* 4. PRP LAN A (Blue) & LAN B (Red/Violet) FROM STATION BUS -> GATEWAY -> SCADA/HMI (Independent!) */}
            <path
              id="cable-prp-lana"
              d="M 678 212 L 678 260 L 892 260 L 892 208 L 892 260 L 1095 260 L 1095 215"
              fill="none"
              stroke={lanAUp ? '#0EA5E9' : '#EF4444'}
              strokeWidth="3.2"
              strokeLinejoin="round"
              strokeDasharray={lanAUp ? undefined : '6 4'}
            />
            <path
              id="cable-prp-lanb"
              d="M 746 212 L 746 271 L 912 271 L 912 208 L 912 271 L 1115 271 L 1115 215"
              fill="none"
              stroke={lanBUp ? '#EC4899' : '#EF4444'}
              strokeWidth="3.2"
              strokeLinejoin="round"
              strokeDasharray={lanBUp ? undefined : '6 4'}
            />

            {/* LAN A & LAN B Labels on Tray */}
            <rect x="615" y="226" width="76" height="16" rx="4" fill="#0369A1" stroke="#38BDF8" strokeWidth="1" />
            <text x="653" y="237" textAnchor="middle" fill="#E0F2FE" fontSize="9" fontWeight="bold" fontFamily="monospace">
              LAN A (PRP)
            </text>
            <rect x="752" y="226" width="76" height="16" rx="4" fill="#701A75" stroke="#E879F9" strokeWidth="1" />
            <text x="790" y="237" textAnchor="middle" fill="#FAE8FF" fontSize="9" fontWeight="bold" fontFamily="monospace">
              LAN B (PRP)
            </text>

            {/* MMS (Green) Packet Animation over Active Station Bus -> Gateway -> SCADA */}
            {mmsHealthy && (
              <>
                <circle r="4.5" fill="#4ADE80" filter="url(#sasGlowGreen)">
                  <animateMotion dur={animDur(2.4)} repeatCount="indefinite" path="M 555 150 L 670 150 L 885 150 L 1085 150" />
                </circle>
                <circle r="4.5" fill="#4ADE80" filter="url(#sasGlowGreen)">
                  <animateMotion dur={animDur(2.4)} begin="1.2s" repeatCount="indefinite" path="M 555 150 L 670 150 L 885 150 L 1085 150" />
                </circle>
              </>
            )}

            {/* GOOSE (Cyan) Layer-2 Multicast: IED -> Station Bus -> Peer Subscriber IEDs (NOT through Gateway!) */}
            <path
              id="cable-goose-l2"
              d="M 555 132 L 695 132 L 695 288 L 495 288"
              fill="none"
              stroke={gooseHealthy ? '#00DFFF' : '#EF4444'}
              strokeWidth="2.5"
              strokeDasharray={gooseHealthy ? '4 3' : '6 4'}
            />
            <rect x="405" y="280" width="175" height="16" rx="4" fill="#04243B" stroke={gooseHealthy ? '#00DFFF' : '#EF4444'} strokeWidth="1" />
            <text x="492" y="291" textAnchor="middle" fill={gooseHealthy ? '#7DD3FC' : '#FCA5A5'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
              {primaryGoose ? `GOOSE L2 → ${primaryGoose.subscriberIedIds.join(', ')}` : 'GOOSE L2 → Peer IEDs (VLAN 20)'}
            </text>
            {gooseHealthy && (
              <circle r="4" fill="#00E5FF" filter="url(#sasGlowCyan)">
                <animateMotion dur={animDur(1.5)} repeatCount="indefinite">
                  <mpath href="#cable-goose-l2" />
                </animateMotion>
              </circle>
            )}

            {/* PRP Blue & Violet Packets along Tray */}
            {lanAUp && (
              <circle r="3.8" fill="#38BDF8">
                <animateMotion dur={animDur(2.2)} repeatCount="indefinite">
                  <mpath href="#cable-prp-lana" />
                </animateMotion>
              </circle>
            )}
            {lanBUp && (
              <circle r="3.8" fill="#F472B6">
                <animateMotion dur={animDur(2.2)} begin="0.7s" repeatCount="indefinite">
                  <mpath href="#cable-prp-lanb" />
                </animateMotion>
              </circle>
            )}
          </svg>

          {/* Protocol Color Legend Bar */}
          <div className="mt-1 rounded-lg border border-[#0B7BA4] bg-[#041525]/95 px-4 py-2 flex flex-wrap items-center justify-center gap-x-8 gap-y-1.5 text-[11px] text-[#DCEEFB]">
            <span className="flex items-center gap-2">
              <span className="inline-block w-5 h-1 rounded bg-[#FACC15] shadow-[0_0_8px_#FACC15]" />
              <span><b>Hardwired DI</b> — 110V DC 52a/52b Copper Control</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-5 h-1 rounded bg-[#22C55E] shadow-[0_0_8px_#22C55E]" />
              <span><b>MMS Report (TCP/102)</b> — Client/Server IED ↔ SCADA &amp; Gateway</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-5 h-1 rounded bg-[#00DFFF] shadow-[0_0_8px_#00DFFF]" />
              <span><b>GOOSE (0x88B8 L2)</b> — Publisher IED → Subscriber IEDs (Not Gateway)</span>
            </span>
            <span className="flex items-center gap-2">
              <span className="inline-block w-5 h-1 rounded bg-gradient-to-r from-[#38BDF8] to-[#EC4899]" />
              <span><b>PRP Redundancy</b> — Independent LAN A (Blue) &amp; LAN B (Red/Violet)</span>
            </span>
          </div>
        </div>
      </div>

      {/* MIDDLE ROW: 3 Monitoring Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.45fr_1fr] gap-3">
        {/* Panel 1: Live Signal Trace */}
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
          <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex items-center justify-between">
            <span className="text-[11.5px] font-extrabold text-white flex items-center gap-1.5">
              <Play className="w-3.5 h-3.5 text-[#00DFFF] fill-[#00DFFF]" />
              Live Signal Trace : {activeChain.lnPart}.{activeChain.doPart}.{activeChain.daPart}
            </span>
          </div>
          <div className="p-2.5 space-y-1.5">
            {[
              { label: 'Field Contact (52a/52b)', ok: !isDiFailed },
              { label: 'DI Acquisition (Remote I/O)', ok: !isDiFailed },
              { label: `IED Update (${activeChain.lnPart})`, ok: !isIedFailed },
              { label: `IEC 61850 DataSet (${activeChain.row.defaultDataset})`, ok: chainFaultMode !== 'DATASET_MISSING' && chainFaultMode !== 'WRONG_IEC_REF' },
              { label: 'MMS / GOOSE Publish', ok: mmsHealthy || gooseHealthy },
              { label: 'SCADA/HMI Update', ok: mmsHealthy && chainFaultMode !== 'HMI_TAG_MISMATCH' },
            ].map((step, i) => (
              <div
                key={step.label}
                className="flex items-center justify-between border-b border-[#123952] pb-1.5 last:border-b-0 text-[11px]"
              >
                <span className="flex items-center gap-2 text-[#E2F1FC]">
                  {step.ok ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                  ) : (
                    <AlertTriangle className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                  )}
                  <span>
                    {i + 1}. {step.label}
                  </span>
                </span>
                <span className="font-mono text-[10.5px] text-[#8CD5F7]">{stageTimes[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Panel 2: Live IEC 61850 Data */}
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
          <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex items-center justify-between">
            <span className="text-[11.5px] font-extrabold text-white flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-[#00DFFF]" />
              Live IEC 61850 Data ({activeChain.iedName})
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10.5px] text-left border-collapse">
              <thead>
                <tr className="bg-[#092740] text-[#BAE6FD] border-b border-[#164463]">
                  <th className="py-1.5 px-2">Signal (IEC 61850)</th>
                  <th className="py-1.5 px-2">Value</th>
                  <th className="py-1.5 px-2">Quality</th>
                  <th className="py-1.5 px-2">DataSet</th>
                  <th className="py-1.5 px-2">Report/GOOSE</th>
                  <th className="py-1.5 px-2">Last Update</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[#DCEEFB]">
                {[
                  {
                    sig: `${activeChain.lnPart}.${activeChain.doPart}.${activeChain.daPart}`,
                    val: activeChain.displayVal,
                    q: qualityBadgeColor.label,
                    ds: activeChain.row.defaultDataset,
                    cb: `${activeChain.reportCbName.split(' ')[0]} / ${activeChain.gooseCbName.split(' ')[0]}`,
                    ts: stageTimes[3],
                  },
                  {
                    sig: `${activeChain.lnPart}.${activeChain.doPart}.q`,
                    val: chainFaultMode === 'NONE' && anyLanUp ? '0x00 (Good)' : '0x0100 (Bad)',
                    q: qualityBadgeColor.label,
                    ds: activeChain.row.defaultDataset,
                    cb: activeChain.reportCbName.split(' ')[0],
                    ts: stageTimes[3],
                  },
                  {
                    sig: `${activeChain.lnPart}.${activeChain.doPart}.t`,
                    val: liveClockStr,
                    q: qualityBadgeColor.label,
                    ds: activeChain.row.defaultDataset,
                    cb: activeChain.reportCbName.split(' ')[0],
                    ts: stageTimes[3],
                  },
                  {
                    sig: 'MMXU1.A.phsA.instMag',
                    val: `${bay.currentA.toFixed(1)} A`,
                    q: bay.quality,
                    ds: 'dsMeas',
                    cb: 'URCB01',
                    ts: stageTimes[2],
                  },
                  {
                    sig: 'MMXU1.PhV.phsA.instMag',
                    val: `${bay.voltageAbKv.toFixed(2)} kV`,
                    q: bay.quality,
                    ds: 'dsMeas',
                    cb: 'URCB01',
                    ts: stageTimes[2],
                  },
                ].map((r) => (
                  <tr key={r.sig} className="border-b border-[#123952] hover:bg-[#072238]">
                    <td className="py-1.5 px-2 text-white font-semibold">{r.sig}</td>
                    <td className="py-1.5 px-2 text-[#4ADE80] font-bold">{r.val}</td>
                    <td className="py-1.5 px-2" style={{ color: qualityBadgeColor.text }}>
                      {r.q}
                    </td>
                    <td className="py-1.5 px-2 text-[#93C5FD]">{r.ds}</td>
                    <td className="py-1.5 px-2 text-[#7DD3FC]">{r.cb}</td>
                    <td className="py-1.5 px-2 text-[#94B8D7]">{r.ts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel 3: Communication Monitoring (Simulated) */}
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
          <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex items-center justify-between">
            <span className="text-[11.5px] font-extrabold text-white flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-[#00DFFF]" />
              Communication Monitoring (Simulated)
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[10.5px] text-left border-collapse">
              <thead>
                <tr className="bg-[#092740] text-[#BAE6FD] border-b border-[#164463]">
                  <th className="py-1.5 px-2">Protocol</th>
                  <th className="py-1.5 px-2">Direction</th>
                  <th className="py-1.5 px-2">Status</th>
                  <th className="py-1.5 px-2">Packets (Sim)</th>
                  <th className="py-1.5 px-2">Rate (Sim)</th>
                </tr>
              </thead>
              <tbody className="font-mono text-[#DCEEFB]">
                {[
                  {
                    proto: 'MMS (TCP/102)',
                    dir: 'IED → SCADA',
                    ok: mmsHealthy,
                    status: mmsHealthy ? 'Connected' : 'Down',
                    pkts: simPackets.mms.toLocaleString(),
                    rate: mmsHealthy ? `${10 * speed} pkt/s` : '0 pkt/s',
                  },
                  {
                    proto: 'GOOSE (L2)',
                    dir: 'IED → Subscribed',
                    ok: gooseHealthy,
                    status: gooseHealthy ? 'Active' : 'Blocked',
                    pkts: simPackets.goose.toLocaleString(),
                    rate: gooseHealthy ? `${120 * speed} pkt/s` : '0 pkt/s',
                  },
                  {
                    proto: 'PRP – LAN A',
                    dir: 'Independent',
                    ok: lanAUp,
                    status: lanAUp ? 'Up' : 'Down',
                    pkts: '—',
                    rate: '—',
                  },
                  {
                    proto: 'PRP – LAN B',
                    dir: 'Independent',
                    ok: lanBUp,
                    status: lanBUp ? 'Up' : 'Down',
                    pkts: '—',
                    rate: '—',
                  },
                  {
                    proto: 'IEC-104 (TCP/2404)',
                    dir: 'Gateway → RCC',
                    ok: iec104Healthy,
                    status: iec104Healthy ? 'STARTDT Act' : 'Offline',
                    pkts: simPackets.iec104.toLocaleString(),
                    rate: iec104Healthy ? `${6 * speed} pkt/s` : '0 pkt/s',
                  },
                ].map((r) => (
                  <tr key={r.proto} className="border-b border-[#123952]">
                    <td className="py-1.5 px-2 text-white font-semibold">{r.proto}</td>
                    <td className="py-1.5 px-2 text-[#94B8D7]">{r.dir}</td>
                    <td className="py-1.5 px-2">
                      <span className="inline-flex items-center gap-1.5" style={{ color: r.ok ? '#4ADE80' : '#F87171' }}>
                        <span className={`w-2 h-2 rounded-full ${r.ok ? 'bg-[#22C55E]' : 'bg-[#EF4444]'}`} />
                        {r.status}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-[#BAE6FD]">{r.pkts}</td>
                    <td className="py-1.5 px-2 text-[#7DD3FC]">{r.rate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* BOTTOM ROW: 3 Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.6fr_0.95fr] gap-3">
        {/* Bottom Left: Real-Time Event Timeline */}
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
          <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
            <span className="text-[11.5px] font-extrabold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00DFFF]" />
              Real-Time Event Timeline
            </span>
          </div>
          <div className="p-2.5 space-y-1 max-h-[168px] overflow-y-auto font-mono text-[10px]">
            {timeline.map((ev, idx) => (
              <div key={idx} className="flex gap-2 border-b border-[#123952] pb-1 last:border-b-0">
                <span className="text-[#7DD3FC] shrink-0">{ev.time}</span>
                <span
                  className={
                    ev.severity === 'ERR'
                      ? 'text-[#FCA5A5]'
                      : ev.severity === 'WARN'
                      ? 'text-[#FDE68A]'
                      : 'text-[#DCEEFB]'
                  }
                >
                  {ev.detail}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Center: Live Communication Animation (Miniature 6-Device Chain + Controls) */}
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
          <div className="px-3 py-1.5 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex flex-wrap items-center justify-between gap-2">
            <span className="text-[11.5px] font-extrabold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-[#00DFFF]" />
              Live Communication Animation
            </span>
            <div className="flex items-center gap-1.5 text-[10.5px] font-bold">
              <button
                type="button"
                onClick={() => setPlaying((p) => !p)}
                className="px-2.5 py-0.5 rounded border border-[#22C55E] bg-[#062E20] text-[#4ADE80] hover:brightness-110 flex items-center gap-1"
              >
                {playing ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                {playing ? 'Pause' : 'Resume'}
              </button>
              {([1, 2, 4] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-2 py-0.5 rounded border transition ${
                    speed === s
                      ? 'border-[#00DFFF] bg-[#083352] text-[#00DFFF]'
                      : 'border-[#1E466E] bg-[#041526] text-[#94B8D7]'
                  }`}
                >
                  {s}×
                </button>
              ))}
              <button
                type="button"
                onClick={handleReset}
                className="px-2 py-0.5 rounded border border-[#1E466E] bg-[#041526] text-[#BAE6FD] hover:border-[#00DFFF] flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          <div className="p-3 grid grid-cols-6 gap-2 items-center">
            {[
              { img: 'assets/signal-chain/field-io.png', label: '52a/52b', ok: !isDiFailed },
              { img: 'assets/signal-chain/di-module.png', label: 'DI Module', ok: !isDiFailed },
              { img: iedImageSrc, label: activeChain.iedModel, ok: !isIedFailed },
              { img: 'assets/signal-chain/prp-switches.png', label: 'Switch (PRP) A|B', ok: anyLanUp },
              { img: 'assets/signal-chain/station-gateway.png', label: 'Gateway', ok: iec104Healthy },
              { img: 'assets/signal-chain/scada-hmi.png', label: 'SCADA / HMI', ok: mmsHealthy },
            ].map((item, idx) => (
              <div key={item.label} className="relative flex flex-col items-center text-center">
                <img
                  src={item.img}
                  alt={item.label}
                  className={`h-14 w-auto object-contain ${item.ok ? '' : 'opacity-45 grayscale'}`}
                />
                <span className="text-[9.5px] font-semibold text-[#BAE6FD] mt-1 truncate w-full">{item.label}</span>
                {idx < 5 && (
                  <span
                    className={`hidden sm:inline-block absolute -right-2.5 top-6 text-xs font-extrabold ${
                      item.ok && playing ? 'text-[#22C55E] animate-pulse' : 'text-slate-600'
                    }`}
                  >
                    »
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Right: Fault / Test Simulation */}
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
          <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
            <span className="text-[11.5px] font-extrabold text-white flex items-center gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-[#00DFFF]" />
              Fault / Test Simulation
            </span>
          </div>
          <div className="p-2.5 space-y-2 text-[11px]">
            {[
              {
                label: 'MMS Communication Loss',
                checked: chainFaultMode === 'MMS_DISCONNECT',
                onChange: (c: boolean) => setChainFaultMode(c ? 'MMS_DISCONNECT' : 'NONE'),
              },
              {
                label: 'GOOSE Blocking (VLAN)',
                checked: chainFaultMode === 'GOOSE_TIMEOUT',
                onChange: (c: boolean) => setChainFaultMode(c ? 'GOOSE_TIMEOUT' : 'NONE'),
              },
              {
                label: 'IED Failure (No Report)',
                checked: chainFaultMode === 'REPORT_DISABLED',
                onChange: (c: boolean) => setChainFaultMode(c ? 'REPORT_DISABLED' : 'NONE'),
              },
              {
                label: 'Interlock / Trip Test',
                checked: interlockTripActive || bay.protectionTripActive,
                onChange: handleInterlockTripToggle,
              },
            ].map((t) => (
              <label key={t.label} className="flex items-center justify-between gap-2 cursor-pointer text-[#DCEEFB]">
                <span>{t.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={t.checked}
                  onClick={() => t.onChange(!t.checked)}
                  className={`w-9 h-5 rounded-full p-0.5 transition-colors border ${
                    t.checked ? 'bg-[#EF4444] border-[#FCA5A5]' : 'bg-[#1E293B] border-[#475569]'
                  }`}
                >
                  <span
                    className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                      t.checked ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </label>
            ))}

            {/* Compact PRP & DI Failure Pills */}
            <div className="pt-1 border-t border-[#123952] flex flex-wrap gap-1.5 text-[9.5px]">
              <button
                type="button"
                onClick={() => setLanAFailed((v) => !v)}
                className={`px-2 py-0.5 rounded border font-bold ${
                  lanAFailed ? 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]' : 'bg-[#071F36] border-[#1E466E] text-[#7DD3FC]'
                }`}
              >
                {lanAFailed ? 'LAN A: FAULT' : 'Fail LAN A'}
              </button>
              <button
                type="button"
                onClick={() => setLanBFailed((v) => !v)}
                className={`px-2 py-0.5 rounded border font-bold ${
                  lanBFailed ? 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]' : 'bg-[#071F36] border-[#1E466E] text-[#E879F9]'
                }`}
              >
                {lanBFailed ? 'LAN B: FAULT' : 'Fail LAN B'}
              </button>
              <button
                type="button"
                onClick={() => setChainFaultMode(chainFaultMode === 'DI_INPUT_FAIL' ? 'NONE' : 'DI_INPUT_FAIL')}
                className={`px-2 py-0.5 rounded border font-bold ${
                  chainFaultMode === 'DI_INPUT_FAIL'
                    ? 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]'
                    : 'bg-[#071F36] border-[#1E466E] text-[#FDE047]'
                }`}
              >
                {chainFaultMode === 'DI_INPUT_FAIL' ? 'DI: FAULT' : 'Fail DI'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stage Diagnostic Inspector Drawer */}
      {selectedStageIndex !== null && (
        <div
          style={{ backgroundColor: '#03101F', borderColor: '#00DFFF' }}
          className="p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-[#00DFFF] shrink-0" />
            <div>
              <span className="text-[#00DFFF] font-bold">STAGE #{selectedStageIndex + 1} DIAGNOSTIC INSPECTOR: </span>
              <span className="text-white">
                {selectedStageIndex === 0 &&
                  `Field Process Interface • ${activeChain.fieldIoTitle} on ${bay.name} • 52a=${contact52aOn ? '1' : '0'}, 52b=${contact52bOn ? '1' : '0'} • Wetting: ${bay.dcSupplyHealthy && !isDiFailed ? '110V DC Healthy' : 'FAULT'}`}
                {selectedStageIndex === 1 &&
                  `DI Input Card (${activeChain.diModuleTitle} • ${activeChain.diChannelLabel}) • Opto-Debounce: 3.0 ms • State: ${isDiFailed ? 'INPUT FAULT' : 'ENERGIZED (OK)'}`}
                {selectedStageIndex === 2 &&
                  `Protection & Control IED (${activeChain.vendorName} ${activeChain.iedModel} • ${activeChain.iedName}) • Sync: ${ied?.timeSyncProtocol || 'IEEE 1588v2 PTP'} • FC: [${activeChain.fc}]`}
                {selectedStageIndex === 3 &&
                  `IEC 61850-7-4 Object: ${activeChain.iedName}/${activeChain.lnPart}.${activeChain.doPart}.${activeChain.daPart} • CDC: ${activeChain.cdcShort} • DataSet: LLN0.${activeChain.row.defaultDataset}`}
                {selectedStageIndex === 4 &&
                  `Station Bus (${networkRedundancyMode}) • LAN A: ${lanAUp ? 'UP' : 'DOWN'} (${ied?.ipAddressLanA || '10.132.10.11'}) • LAN B: ${lanBUp ? 'UP' : 'DOWN'} (${ied?.ipAddressLanB || '10.132.20.11'}) • GOOSE: ${activeChain.gooseCbName} • Report: ${activeChain.reportCbName}`}
                {selectedStageIndex === 5 &&
                  `SCADA Server A (10.132.10.200) & Operator HMI • Tag: ${activeChain.scadaTag} • Value: ${activeChain.displayVal} • Quality: ${qualityBadgeColor.label}`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSelectedStageIndex(null)}
            className="px-2 py-0.5 rounded bg-[#08223A] text-[#77E7FF] hover:text-white font-sans font-bold"
          >
            Close ✕
          </button>
        </div>
      )}
    </div>
  );
};
