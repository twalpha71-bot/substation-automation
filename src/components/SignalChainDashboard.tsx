import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Play,
  Radio,
  Settings2,
  ShieldAlert,
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
  ieds: MultiVendorIed[];
  bays: BayEquipment[];
  onSelectBay: (bayId: string) => void;
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
  ieds,
  bays,
  onSelectBay,
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
  const diagramWrapRef = useRef<HTMLDivElement | null>(null);
  const portRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const setPortRef = (id: string) => (el: HTMLSpanElement | null) => {
    portRefs.current[id] = el;
  };
  const [diagSize, setDiagSize] = useState<{ w: number; h: number }>({ w: 1200, h: 375 });
  const [portCoords, setPortCoords] = useState<Record<string, { x: number; y: number }>>({});
  const [imgLoadTick, setImgLoadTick] = useState<number>(0);


  // Animation engine state (visual pause/resume does NOT stop underlying store simulation)
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<1 | 2 | 4>(1);

  // Independent PRP & Fault Simulation toggles preserved per bay
  const [netFaultsByBay, setNetFaultsByBay] = useState<
    Record<string, { lanA: boolean; lanB: boolean; trip: boolean }>
  >({});
  const curNetFault = netFaultsByBay[bay.id] || { lanA: false, lanB: false, trip: false };
  const lanAFailed = curNetFault.lanA;
  const lanBFailed = curNetFault.lanB;
  const interlockTripActive = curNetFault.trip;
  const setLanAFailed = (updater: boolean | ((v: boolean) => boolean)) => {
    setNetFaultsByBay((prev) => {
      const cur = prev[bay.id] || { lanA: false, lanB: false, trip: false };
      const nextVal = typeof updater === 'function' ? updater(cur.lanA) : updater;
      return { ...prev, [bay.id]: { ...cur, lanA: nextVal } };
    });
  };
  const setLanBFailed = (updater: boolean | ((v: boolean) => boolean)) => {
    setNetFaultsByBay((prev) => {
      const cur = prev[bay.id] || { lanA: false, lanB: false, trip: false };
      const nextVal = typeof updater === 'function' ? updater(cur.lanB) : updater;
      return { ...prev, [bay.id]: { ...cur, lanB: nextVal } };
    });
  };
  const setInterlockTripActive = (val: boolean) => {
    setNetFaultsByBay((prev) => {
      const cur = prev[bay.id] || { lanA: false, lanB: false, trip: false };
      return { ...prev, [bay.id]: { ...cur, trip: val } };
    });
  };

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

  useEffect(() => {
    const measurePorts = () => {
      const wrap = diagramWrapRef.current;
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
      setDiagSize({ w: Math.round(wr.width), h: Math.round(wr.height) });
      setPortCoords(next);
    };
    measurePorts();
    const t1 = window.setTimeout(measurePorts, 150);
    const t2 = window.setTimeout(measurePorts, 450);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measurePorts) : null;
    if (ro && diagramWrapRef.current) ro.observe(diagramWrapRef.current);
    window.addEventListener('resize', measurePorts);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', measurePorts);
    };
  }, [bay.id, iedImageSrc, networkRedundancyMode, imgLoadTick]);

  // Control SVG native SMIL animations on Pause/Resume
  useEffect(() => {
    [svgRef.current].forEach((svg) => {
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
    });
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
            <span className="text-[#8AD8FF] font-semibold">({bay.voltageKv} kV · {bay.name})</span>
          </h2>
          <label className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9ED8F6]">
            <span>Select Bay / IED:</span>
            <select
              aria-label="Select Bay / IED"
              value={bay.id}
              onChange={(e) => onSelectBay(e.target.value)}
              className="px-2.5 py-1 rounded-lg border border-[#00DFFF] bg-[#04182B] text-white font-mono text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#00E5FF]"
            >
              {bays.map((b) => {
                const matchedIed = ieds.find((x) => x.id === b.iedId);
                return (
                  <option key={b.id} value={b.id}>
                    {b.bayCode} ({b.voltageKv} kV) · {matchedIed?.name || b.iedId} — {matchedIed ? `${matchedIed.vendor} ${matchedIed.model}` : b.name}
                  </option>
                );
              })}
            </select>
          </label>
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
          <div className="inline-flex items-center gap-1 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="px-2 py-0.5 rounded border border-[#22C55E] bg-[#062E20] text-[#4ADE80] font-bold hover:brightness-125 transition"
            >
              {playing ? 'Pause' : 'Resume'}
            </button>
            {([1, 2, 4] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className="px-1.5 py-0.5 rounded border font-bold transition"
                style={{
                  borderColor: speed === s ? '#00DFFF' : '#1B4B72',
                  backgroundColor: speed === s ? '#00DFFF' : '#041526',
                  color: speed === s ? '#021222' : '#94B8D7',
                }}
              >
                {s}x
              </button>
            ))}
            <button
              type="button"
              onClick={handleReset}
              className="px-2 py-0.5 rounded border border-[#1B4B72] bg-[#041526] text-[#BAE6FD] font-bold hover:border-[#00DFFF] transition"
            >
              Reset
            </button>
          </div>
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

        <div ref={diagramWrapRef} className={`min-w-[1140px] relative ${playing ? '' : 'sas-paused'}`}>
          {/* 6 Device Columns — Side Ports Hug Exact Hardware Chassis Edges (Measured via ResizeObserver) */}
          <div className="grid grid-cols-6 gap-2.5 items-start relative z-10 pb-[124px]">
            {/* DEVICE 1: FIELD I/O */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(0)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[94%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Field I/O</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(Breaker Aux Contacts)</div>
                <div className="mt-1 rounded border border-[#0D6A92]/70 bg-[#041729]/90 px-1.5 py-0.5 text-[9px] font-mono text-[#BAE6FD] truncate">
                  TB X1:1–2 · {bay.dcSupplyHealthy && !isDiFailed ? '110V DC OK' : 'DC FAULT'}
                </div>
              </div>
              <div className="w-full h-[164px] mt-1 flex items-end justify-center pb-1">
                <div className="relative inline-flex items-center justify-center">
                  <img
                    src="assets/signal-chain/field-io.png"
                    alt="Field I/O Marshalling Cabinet"
                    onLoad={() => setImgLoadTick((n) => n + 1)}
                    className="max-h-[154px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                  />
                  {/* Dynamic 52a / 52b Contact Status Overlays */}
                  <div className="absolute inset-x-0 top-[28%] flex flex-col items-center gap-1.5 pointer-events-none">
                    <div
                      className="px-2 py-0.5 rounded border text-[9px] font-mono font-extrabold flex items-center gap-1.5 shadow-lg"
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
                      className="px-2 py-0.5 rounded border text-[9px] font-mono font-extrabold flex items-center gap-1.5 shadow-lg"
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
              </div>
              {/* Physical Terminal Block Port Strip */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#FDE047] mb-0.5">X1:1 (52a)</span>
                  <span ref={setPortRef('fio_1')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#FACC15] bg-[#2D2204] shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#EAB308] mb-0.5">X1:2 (52b)</span>
                  <span ref={setPortRef('fio_2')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#EAB308] bg-[#2D2204] shadow-[0_0_6px_rgba(234,179,8,0.45)]" />
                </div>
              </div>
            </button>

            {/* DEVICE 2: INPUT MODULE */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(1)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[94%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Input Module</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(Remote I/O – DI Card)</div>
                <div className="mt-1 rounded border border-[#0D6A92]/70 bg-[#041729]/90 px-1.5 py-0.5 text-[9px] font-mono text-[#BAE6FD] truncate">
                  {activeChain.diChannelLabel} · Debounce 3ms
                </div>
              </div>
              <div className="w-full h-[164px] mt-1 flex items-end justify-center pb-1">
                <div className="relative inline-flex items-center justify-center">
                  <img
                    src="assets/signal-chain/di-module.png"
                    alt="Digital Input Module"
                    onLoad={() => setImgLoadTick((n) => n + 1)}
                    className="max-h-[152px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                  />
                  {/* Right-edge Backplane Output Port Hugged Directly to DI Chassis */}
                  <span
                    ref={setPortRef('di_out')}
                    title="DI Backplane Out to IED"
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#22C55E] bg-[#06291E] shadow-[0_0_8px_rgba(34,197,94,0.75)]"
                  />
                  {/* Dynamic DI Channel Status Strip */}
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border text-[8.5px] font-mono font-bold flex items-center gap-1 shadow whitespace-nowrap"
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
              </div>
              {/* Physical DI Input Terminal Ports */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#FDE047] mb-0.5">DI-CH1</span>
                  <span ref={setPortRef('di_1')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#FACC15] bg-[#2D2204] shadow-[0_0_6px_rgba(250,204,21,0.5)]" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#EAB308] mb-0.5">DI-CH2</span>
                  <span ref={setPortRef('di_2')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#EAB308] bg-[#2D2204] shadow-[0_0_6px_rgba(234,179,8,0.45)]" />
                </div>
              </div>
            </button>

            {/* DEVICE 3: PROTECTION & CONTROL IED */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(2)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[96%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Protection &amp; Control IED</div>
                <div className="text-[9.5px] text-[#9ED8F6]">
                  ({activeChain.vendorName.split(' ')[0]} {activeChain.iedModel})
                </div>
                <div className="mt-1 rounded border border-[#0D6A92]/70 bg-[#041729]/90 px-1.5 py-0.5 text-[9px] font-mono text-[#BAE6FD] truncate">
                  {activeChain.iedName} · {ied?.ipAddressLanA || '10.132.10.11'}
                </div>
              </div>
              <div className="w-full h-[164px] mt-1 flex items-end justify-center pb-1">
                <div className="relative inline-flex items-center justify-center">
                  {/* Left-edge DI Input Port Hugged Directly to IED Chassis */}
                  <span
                    ref={setPortRef('ied_in')}
                    title="IED Binary Input Port"
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#22C55E] bg-[#06291E] shadow-[0_0_8px_rgba(34,197,94,0.75)]"
                  />
                  <img
                    src={iedImageSrc}
                    alt={`${activeChain.vendorName} ${activeChain.iedModel}`}
                    onLoad={() => setImgLoadTick((n) => n + 1)}
                    className="max-h-[152px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                  />
                  {/* Right-edge GOOSE L2 Fiber Port Hugged Directly to IED Chassis */}
                  <span
                    ref={setPortRef('ied_goose')}
                    title="GOOSE L2 Publisher Port (0x88B8)"
                    className="absolute -right-2 top-[42%] -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#00E5FF] bg-[#04243B] shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                  />
                  {/* Dynamic Backlit LCD Overlay */}
                  <div
                    className="absolute px-2 py-1 rounded border font-mono text-[9px] font-extrabold leading-tight shadow-inner pointer-events-none"
                    style={{
                      top: isDefaultMiComP143 ? '31%' : '14%',
                      left: '50%',
                      transform: 'translateX(-50%)',
                      backgroundColor: isIedFailed ? '#7F1D1D' : '#B4D455',
                      borderColor: isIedFailed ? '#EF4444' : '#3F6212',
                      color: isIedFailed ? '#FEE2E2' : '#0F1F05',
                      minWidth: '84px',
                    }}
                  >
                    <div>{bay.bayCode}</div>
                    <div>{isIedFailed ? 'IED FAIL' : bay.protectionTripActive ? 'TRIP 50/51' : `CB ${bay.breakerState}`}</div>
                  </div>
                </div>
              </div>
              {/* Physical PRP Dual-Homing Ethernet Ports */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#38BDF8] mb-0.5">ETH-A</span>
                  <span ref={setPortRef('ied_a')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#38BDF8] bg-[#082F49] shadow-[0_0_7px_rgba(56,189,248,0.65)]" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#D8B4FE] mb-0.5">ETH-B</span>
                  <span ref={setPortRef('ied_b')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#C084FC] bg-[#2E1065] shadow-[0_0_7px_rgba(192,132,252,0.65)]" />
                </div>
              </div>
            </button>

            {/* DEVICE 4: STATION BUS (PRP LAN A & LAN B) */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(4)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[96%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Station Bus</div>
                <div className="text-[9.5px] text-[#9ED8F6]">
                  (IEC 61850 Switch · {isSingleAttached ? 'RedBox SAN' : networkRedundancyMode})
                </div>
                <div className="mt-1 rounded border border-[#0D6A92]/70 bg-[#041729]/90 px-1.5 py-0.5 text-[9px] font-mono text-[#BAE6FD] truncate">
                  {!anyLanUp ? 'ALL PATHS DOWN' : redundancyDegraded ? 'DEGRADED (1 LAN)' : 'PRP DUAL-LAN HEALTHY'}
                </div>
              </div>
              <div className="relative w-full h-[164px] mt-1 flex items-end justify-center pb-1">
                {/* Independent LAN A & LAN B Top Badges */}
                <div className="absolute top-0 inset-x-2 flex justify-between pointer-events-none z-10">
                  <span
                    className="px-1.5 py-0.5 rounded text-[8.5px] font-extrabold border shadow"
                    style={{
                      backgroundColor: lanAUp ? '#082F49' : '#3B0D15',
                      borderColor: lanAUp ? '#38BDF8' : '#EF4444',
                      color: lanAUp ? '#7DD3FC' : '#FCA5A5',
                    }}
                  >
                    LAN A {lanAUp ? 'UP' : 'DOWN'}
                  </span>
                  <span
                    className="px-1.5 py-0.5 rounded text-[8.5px] font-extrabold border shadow"
                    style={{
                      backgroundColor: lanBUp ? '#2E1065' : '#3B0D15',
                      borderColor: lanBUp ? '#C084FC' : '#EF4444',
                      color: lanBUp ? '#E9D5FF' : '#FCA5A5',
                    }}
                  >
                    LAN B {lanBUp ? 'UP' : 'DOWN'}
                  </span>
                </div>
                <div className="relative inline-flex items-center justify-center">
                  {/* Left-edge GOOSE Port Hugged Directly to LAN A Switch Chassis */}
                  <span
                    ref={setPortRef('sw_goose')}
                    title="Switch LAN A GOOSE L2 Port"
                    className="absolute -left-2 top-[44%] -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#00E5FF] bg-[#04243B] shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                  />
                  <img
                    src="assets/signal-chain/prp-switches.png"
                    alt="PRP LAN A and LAN B Switches"
                    onLoad={() => setImgLoadTick((n) => n + 1)}
                    className="max-h-[140px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                  />
                </div>
              </div>
              {/* Physical RJ45 Switch Ports: LAN A (P1/P2) & LAN B (P1/P2) */}
              <div className="flex items-center justify-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col items-center">
                    <span className="text-[7.5px] font-mono font-bold text-[#38BDF8] mb-0.5">A-P1</span>
                    <span ref={setPortRef('swa_in')} className="w-3 h-3 rounded-[3px] border-[1.5px] border-[#38BDF8] bg-[#082F49] shadow-[0_0_6px_rgba(56,189,248,0.65)]" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[7.5px] font-mono font-bold text-[#0EA5E9] mb-0.5">A-P2</span>
                    <span ref={setPortRef('swa_out')} className="w-3 h-3 rounded-[3px] border-[1.5px] border-[#0EA5E9] bg-[#082F49] shadow-[0_0_6px_rgba(14,165,233,0.65)]" />
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="flex flex-col items-center">
                    <span className="text-[7.5px] font-mono font-bold text-[#C084FC] mb-0.5">B-P1</span>
                    <span ref={setPortRef('swb_in')} className="w-3 h-3 rounded-[3px] border-[1.5px] border-[#C084FC] bg-[#2E1065] shadow-[0_0_6px_rgba(192,132,252,0.65)]" />
                  </div>
                  <div className="flex flex-col items-center">
                    <span className="text-[7.5px] font-mono font-bold text-[#EC4899] mb-0.5">B-P2</span>
                    <span ref={setPortRef('swb_out')} className="w-3 h-3 rounded-[3px] border-[1.5px] border-[#EC4899] bg-[#4A044E] shadow-[0_0_6px_rgba(236,72,153,0.65)]" />
                  </div>
                </div>
              </div>
            </button>

            {/* DEVICE 5: STATION GATEWAY */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(4)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[94%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">Station Gateway</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(MMS Client &amp; IEC-104)</div>
                <div className="mt-1 rounded border border-[#0D6A92]/70 bg-[#041729]/90 px-1.5 py-0.5 text-[9px] font-mono text-[#BAE6FD] truncate">
                  GTW-RCC-01 · {iec104Healthy ? 'CONNECTED' : 'LINK LOSS'}
                </div>
              </div>
              <div className="w-full h-[164px] mt-1 flex items-end justify-center pb-1">
                <div className="relative inline-flex items-center justify-center">
                  <img
                    src="assets/signal-chain/station-gateway.png"
                    alt="Station Gateway"
                    onLoad={() => setImgLoadTick((n) => n + 1)}
                    className="max-h-[144px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                  />
                  {/* Right-edge MMS/IEC-104 Uplink Port Hugged Directly to Gateway Chassis */}
                  <span
                    ref={setPortRef('gtw_mms')}
                    title="Gateway MMS/IEC-104 Uplink Port"
                    className="absolute -right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#22C55E] bg-[#06291E] shadow-[0_0_8px_rgba(34,197,94,0.75)]"
                  />
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border text-[8.5px] font-mono font-bold flex items-center gap-1 whitespace-nowrap"
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
              </div>
              {/* Physical Gateway PRP ETH-A & ETH-B Ports */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#0EA5E9] mb-0.5">ETH-A</span>
                  <span ref={setPortRef('gtw_a')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#0EA5E9] bg-[#082F49] shadow-[0_0_6px_rgba(14,165,233,0.65)]" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#EC4899] mb-0.5">ETH-B</span>
                  <span ref={setPortRef('gtw_b')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#EC4899] bg-[#4A044E] shadow-[0_0_6px_rgba(236,72,153,0.65)]" />
                </div>
              </div>
            </button>

            {/* DEVICE 6: SCADA / HMI */}
            <button
              type="button"
              onClick={() => setSelectedStageIndex(5)}
              className="flex flex-col items-center text-center group focus:outline-none"
            >
              <div className="w-[94%] rounded-xl border border-[#00DFFF] bg-[#052035]/90 px-2 py-1.5 shadow-[0_0_12px_rgba(0,223,255,0.28)] group-hover:brightness-110 transition">
                <div className="text-[12px] font-extrabold text-white">SCADA / HMI</div>
                <div className="text-[9.5px] text-[#9ED8F6]">(Operator Workstation)</div>
                <div className="mt-1 rounded border border-[#0D6A92]/70 bg-[#041729]/90 px-1.5 py-0.5 text-[9px] font-mono text-[#BAE6FD] truncate">
                  {activeChain.scadaTag}
                </div>
              </div>
              <div className="w-full h-[164px] mt-1 flex items-end justify-center pb-1">
                <div className="relative inline-flex items-center justify-center">
                  {/* Left-edge MMS/IEC-104 Ingress Port Hugged Directly to SCADA Workstation */}
                  <span
                    ref={setPortRef('hmi_mms')}
                    title="SCADA MMS/IEC-104 Ingress Port"
                    className="absolute -left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#22C55E] bg-[#06291E] shadow-[0_0_8px_rgba(34,197,94,0.75)]"
                  />
                  <img
                    src="assets/signal-chain/scada-hmi.png"
                    alt="SCADA HMI Dual Monitor Workstation"
                    onLoad={() => setImgLoadTick((n) => n + 1)}
                    className="max-h-[146px] w-auto object-contain drop-shadow-[0_10px_14px_rgba(0,0,0,0.85)]"
                  />
                  <div
                    className="absolute bottom-1 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded border text-[8.5px] font-mono font-extrabold whitespace-nowrap shadow"
                    style={{
                      backgroundColor: mmsHealthy ? 'rgba(6, 40, 24, 0.94)' : 'rgba(59, 13, 21, 0.94)',
                      borderColor: mmsHealthy ? '#22C55E' : '#EF4444',
                      color: mmsHealthy ? '#4ADE80' : '#FCA5A5',
                    }}
                  >
                    {bay.bayCode}: {mmsHealthy ? bay.breakerState : 'COMM LOST'}
                  </div>
                </div>
              </div>
              {/* Physical SCADA PRP Redundant NIC Ports */}
              <div className="flex items-center justify-center gap-3">
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#0EA5E9] mb-0.5">NIC-A</span>
                  <span ref={setPortRef('hmi_a')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#0EA5E9] bg-[#082F49] shadow-[0_0_6px_rgba(14,165,233,0.65)]" />
                </div>
                <div className="flex flex-col items-center">
                  <span className="text-[8px] font-mono font-bold text-[#EC4899] mb-0.5">NIC-B</span>
                  <span ref={setPortRef('hmi_b')} className="w-3.5 h-3 rounded-[3px] border-[1.5px] border-[#EC4899] bg-[#4A044E] shadow-[0_0_6px_rgba(236,72,153,0.65)]" />
                </div>
              </div>
            </button>
          </div>

          {/* EXACT PORT-TO-PORT PHYSICAL CABLING & LOGIC-DRIVEN PACKET SVG LAYER */}
          {(() => {
            const p = portCoords;
            const W = diagSize.w;
            const H = diagSize.h;
            const ready = p.fio_1 && p.di_1 && p.di_out && p.ied_in && p.ied_a && p.swa_in && p.swa_out && p.swb_in && p.swb_out && p.gtw_a && p.gtw_mms && p.hmi_mms && p.hmi_a;
            if (!ready) return null;

            const baseY = Math.max(p.fio_1.y, p.di_1.y, p.ied_a.y, p.swa_in.y, p.gtw_a.y, p.hmi_a.y);
            const trayTop = baseY + 18;
            const laneA = trayTop + 14;
            const laneB = trayTop + 30;
            const gooseY = trayTop + 60;

            const ortho = (ax: number, ay: number, bx: number, by: number, yLane: number) => {
              const r = 8;
              const dir = bx >= ax ? 1 : -1;
              return `M ${ax} ${ay} L ${ax} ${yLane - r} Q ${ax} ${yLane} ${ax + dir * r} ${yLane} L ${bx - dir * r} ${yLane} Q ${bx} ${yLane} ${bx} ${yLane - r} L ${bx} ${by}`;
            };

            const dHw1 = ortho(p.fio_1.x, p.fio_1.y, p.di_1.x, p.di_1.y, laneA);
            const dHw2 = ortho(p.fio_2.x, p.fio_2.y, p.di_2.x, p.di_2.y, laneB);
            const diMidY = (p.di_out.y + p.ied_in.y) / 2;
            const dDiIed = `M ${p.di_out.x} ${diMidY} L ${p.ied_in.x} ${diMidY}`;
            const dIedLanA = ortho(p.ied_a.x, p.ied_a.y, p.swa_in.x, p.swa_in.y, laneA);
            const dIedLanB = ortho(p.ied_b.x, p.ied_b.y, p.swb_in.x, p.swb_in.y, laneB);
            const dBusGtwA = ortho(p.swa_out.x, p.swa_out.y, p.gtw_a.x, p.gtw_a.y, laneA);
            const dBusGtwB = ortho(p.swb_out.x, p.swb_out.y, p.gtw_b.x, p.gtw_b.y, laneB);
            const dGtwHmiA = ortho(p.gtw_a.x, p.gtw_a.y, p.hmi_a.x, p.hmi_a.y, laneA);
            const dGtwHmiB = ortho(p.gtw_b.x, p.gtw_b.y, p.hmi_b.x, p.hmi_b.y, laneB);
            const mmsMidY = (p.gtw_mms.y + p.hmi_mms.y) / 2;
            const dGtwHmiMms = `M ${p.gtw_mms.x} ${mmsMidY} L ${p.hmi_mms.x} ${mmsMidY}`;
            const gooseMidY = (p.ied_goose.y + p.sw_goose.y) / 2;
            const dGooseDirect = `M ${p.ied_goose.x} ${gooseMidY} L ${p.sw_goose.x} ${gooseMidY}`;
            const gooseDropX = Math.round((p.ied_goose.x + p.sw_goose.x) / 2);
            const dGooseDrop = `M ${gooseDropX} ${gooseMidY} L ${gooseDropX} ${gooseY} L ${p.ied_a.x} ${gooseY}`;

            return (
              <svg
                ref={svgRef}
                width={W}
                height={H}
                viewBox={`0 0 ${W} ${H}`}
                className="absolute inset-0 pointer-events-none z-20"
              >
                <defs>
                  <filter id="sasGlowGreen" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                  <filter id="sasGlowCyan" filterUnits="userSpaceOnUse" x="0" y="0" width={W} height={H}>
                    <feGaussianBlur stdDeviation="2.5" result="blur" />
                    <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
                  </filter>
                </defs>

                {/* Bottom Industrial Metallic Cable Tray / Raceway */}
                <rect x="16" y={trayTop} width={W - 32} height="44" rx="6" fill="#0F1E30" stroke="#334E68" strokeWidth="1.5" />
                <line x1="22" y1={laneA} x2={W - 22} y2={laneA} stroke="#1E3A5F" strokeWidth="1" strokeDasharray="8 8" />
                <line x1="22" y1={laneB} x2={W - 22} y2={laneB} stroke="#1E3A5F" strokeWidth="1" strokeDasharray="8 8" />

                {/* 1. HARDWIRED 52a / 52b COPPER CONTROL CABLES (Both Physically Wired; 110V DC Power Flow ONLY on CLOSED Contact) */}
                <path
                  id="cable-hw-1"
                  d={dHw1}
                  fill="none"
                  stroke={isDiFailed ? '#EF4444' : contact52aOn ? '#FACC15' : '#A16207'}
                  strokeOpacity={isDiFailed || contact52aOn ? 1 : 0.72}
                  strokeWidth={contact52aOn ? '3.4' : '2.4'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={isDiFailed ? '6 4' : undefined}
                />
                <path
                  id="cable-hw-2"
                  d={dHw2}
                  fill="none"
                  stroke={isDiFailed ? '#EF4444' : contact52bOn ? '#FACC15' : '#A16207'}
                  strokeOpacity={isDiFailed || contact52bOn ? 1 : 0.72}
                  strokeWidth={contact52bOn ? '3.4' : '2.4'}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeDasharray={isDiFailed ? '6 4' : undefined}
                />
                {!isDiFailed && contact52aOn && (
                  <circle r="4.2" fill="#FEF08A" filter="url(#sasGlowGreen)">
                    <animateMotion dur={animDur(1.7)} repeatCount="indefinite"><mpath href="#cable-hw-1" /></animateMotion>
                  </circle>
                )}
                {!isDiFailed && contact52bOn && (
                  <circle r="4.2" fill="#FEF08A" filter="url(#sasGlowGreen)">
                    <animateMotion dur={animDur(1.7)} repeatCount="indefinite"><mpath href="#cable-hw-2" /></animateMotion>
                  </circle>
                )}

                {/* 2. DEVICE 2 (DI MODULE) -> DEVICE 3 (IED) DIRECT CHASSIS-TO-CHASSIS LINK */}
                <path id="cable-di-ied" d={dDiIed} fill="none" stroke={isDiFailed || isIedFailed ? '#EF4444' : '#22C55E'} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={isDiFailed || isIedFailed ? '5 4' : undefined} />
                <text x={(p.di_out.x + p.ied_in.x) / 2} y={diMidY - 8} textAnchor="middle" fill={isDiFailed || isIedFailed ? '#FCA5A5' : '#86EFAC'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  DI BUS
                </text>
                {!isDiFailed && !isIedFailed && (
                  <circle r="4.2" fill="#4ADE80" filter="url(#sasGlowGreen)">
                    <animateMotion dur={animDur(1.0)} repeatCount="indefinite"><mpath href="#cable-di-ied" /></animateMotion>
                  </circle>
                )}

                {/* 3. DEVICE 3 (IED) [ETH-A / ETH-B] -> DEVICE 4 (STATION BUS) [A-P1 / B-P1] */}
                <path id="cable-ied-a" d={dIedLanA} fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanAUp ? undefined : '6 4'} />
                <path id="cable-ied-b" d={dIedLanB} fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanBUp ? undefined : '6 4'} />
                {lanAUp && (
                  <circle r="4" fill="#7DD3FC" filter="url(#sasGlowCyan)">
                    <animateMotion dur={animDur(1.5)} repeatCount="indefinite"><mpath href="#cable-ied-a" /></animateMotion>
                  </circle>
                )}
                {lanBUp && (
                  <circle r="4" fill="#E879F9" filter="url(#sasGlowCyan)">
                    <animateMotion dur={animDur(1.5)} begin="0.5s" repeatCount="indefinite"><mpath href="#cable-ied-b" /></animateMotion>
                  </circle>
                )}

                {/* 4. DEVICE 4 (STATION BUS) -> DEVICE 5 (GATEWAY) -> DEVICE 6 (SCADA) PRP LAN A & LAN B */}
                <path id="cable-bus-gtw-a" d={dBusGtwA} fill="none" stroke={lanAUp ? '#0EA5E9' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanAUp ? undefined : '6 4'} />
                <path id="cable-bus-gtw-b" d={dBusGtwB} fill="none" stroke={lanBUp ? '#EC4899' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanBUp ? undefined : '6 4'} />
                <path id="cable-gtw-hmi-a" d={dGtwHmiA} fill="none" stroke={lanAUp && mmsHealthy ? '#0EA5E9' : '#EF4444'} strokeWidth="3.0" strokeLinejoin="round" strokeDasharray={lanAUp && mmsHealthy ? undefined : '6 4'} />
                <path id="cable-gtw-hmi-b" d={dGtwHmiB} fill="none" stroke={lanBUp && mmsHealthy ? '#EC4899' : '#EF4444'} strokeWidth="3.0" strokeLinejoin="round" strokeDasharray={lanBUp && mmsHealthy ? undefined : '6 4'} />
                {lanAUp && (
                  <circle r="4" fill="#38BDF8" filter="url(#sasGlowCyan)">
                    <animateMotion dur={animDur(1.6)} repeatCount="indefinite"><mpath href="#cable-bus-gtw-a" /></animateMotion>
                  </circle>
                )}
                {lanAUp && mmsHealthy && (
                  <circle r="3.8" fill="#38BDF8">
                    <animateMotion dur={animDur(1.6)} begin="0.6s" repeatCount="indefinite"><mpath href="#cable-gtw-hmi-a" /></animateMotion>
                  </circle>
                )}
                {lanBUp && (
                  <circle r="4" fill="#F472B6" filter="url(#sasGlowCyan)">
                    <animateMotion dur={animDur(1.6)} begin="0.3s" repeatCount="indefinite"><mpath href="#cable-bus-gtw-b" /></animateMotion>
                  </circle>
                )}
                {lanBUp && mmsHealthy && (
                  <circle r="3.8" fill="#F472B6">
                    <animateMotion dur={animDur(1.6)} begin="0.9s" repeatCount="indefinite"><mpath href="#cable-gtw-hmi-b" /></animateMotion>
                  </circle>
                )}

                {/* 5. DEVICE 5 (GATEWAY) -> DEVICE 6 (SCADA/HMI) DIRECT CHASSIS-TO-CHASSIS MMS/IEC-104 LINK */}
                <path id="cable-gtw-hmi-mms" d={dGtwHmiMms} fill="none" stroke={mmsHealthy && iec104Healthy ? '#22C55E' : '#EF4444'} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={mmsHealthy && iec104Healthy ? undefined : '6 4'} />
                <text x={(p.gtw_mms.x + p.hmi_mms.x) / 2} y={mmsMidY - 8} textAnchor="middle" fill={mmsHealthy && iec104Healthy ? '#86EFAC' : '#FCA5A5'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  MMS/104
                </text>
                {mmsHealthy && iec104Healthy && (
                  <circle r="4.4" fill="#4ADE80" filter="url(#sasGlowGreen)">
                    <animateMotion dur={animDur(1.0)} repeatCount="indefinite"><mpath href="#cable-gtw-hmi-mms" /></animateMotion>
                  </circle>
                )}

                {/* 6. DEVICE 3 (IED) -> DEVICE 4 (STATION BUS) DIRECT GOOSE L2 CHASSIS-TO-CHASSIS + PEER DROP */}
                <path id="cable-goose-direct" d={dGooseDirect} fill="none" stroke={gooseHealthy ? '#00E5FF' : '#EF4444'} strokeWidth="2.8" strokeDasharray="5 3" />
                <path d={dGooseDrop} fill="none" stroke={gooseHealthy ? '#00DFFF' : '#EF4444'} strokeWidth="2.2" strokeDasharray="4 3" />
                <circle cx={gooseDropX} cy={gooseMidY} r="3" fill={gooseHealthy ? '#00E5FF' : '#EF4444'} />
                <text x={gooseDropX} y={gooseMidY - 8} textAnchor="middle" fill={gooseHealthy ? '#7DD3FC' : '#FCA5A5'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  GOOSE L2
                </text>
                {gooseHealthy && (
                  <circle r="4" fill="#00F0FF" filter="url(#sasGlowCyan)">
                    <animateMotion dur={animDur(1.0)} repeatCount="indefinite"><mpath href="#cable-goose-direct" /></animateMotion>
                  </circle>
                )}

                {/* Clean Non-Overlapping Cable Tray Badges */}
                <rect x={p.swa_in.x - 42} y={trayTop + 48} width="84" height="17" rx="4" fill="#0369A1" stroke="#38BDF8" strokeWidth="1" />
                <text x={p.swa_in.x} y={trayTop + 59.5} textAnchor="middle" fill="#E0F2FE" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  LAN A (PRP)
                </text>
                <rect x={p.swb_out.x - 42} y={trayTop + 48} width="84" height="17" rx="4" fill="#701A75" stroke="#E879F9" strokeWidth="1" />
                <text x={p.swb_out.x} y={trayTop + 59.5} textAnchor="middle" fill="#FAE8FF" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  LAN B (PRP)
                </text>
                <rect x={p.ied_a.x - 95} y={gooseY - 9} width="190" height="18" rx="4" fill="#04243B" stroke={gooseHealthy ? '#00DFFF' : '#EF4444'} strokeWidth="1" />
                <text x={p.ied_a.x} y={gooseY + 3} textAnchor="middle" fill={gooseHealthy ? '#7DD3FC' : '#FCA5A5'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  {primaryGoose ? `GOOSE L2 → ${primaryGoose.subscriberIedIds.join(', ')}` : 'GOOSE L2 → Peer IEDs (VLAN 20)'}
                </text>
              </svg>
            );
          })()}

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

      {/* BOTTOM ROW: Real-Time Event Timeline & Fault/Test Simulation */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-3">
        {/* Bottom Left: Real-Time Event Timeline */}
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
          <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
            <span className="text-[11.5px] font-extrabold text-white flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-[#00DFFF]" />
              Real-Time Event Timeline
            </span>
          </div>
          <div className="p-2.5 space-y-1 max-h-[175px] overflow-y-auto font-mono text-[10px]">
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
