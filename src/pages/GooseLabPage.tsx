import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { GooseControlBlock } from '../types/substation';
import { getIedImageByModel } from '../data/iedImageRegistry';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cpu,
  FileCode2,
  Layers,
  Network,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Settings,
  ShieldAlert,
  Sliders,
  Zap,
} from 'lucide-react';

type GooseLabTab =
  | 'ENGINEERING'
  | 'NETWORK_TOPOLOGY'
  | 'LIVE_SIMULATION'
  | 'PACKET_ANALYZER'
  | 'DIAGNOSTICS'
  | 'EVENT_TIMELINE';

interface SubscriberNodeConfig {
  iedId: string;
  iedName: string;
  shortModel: string;
  vendorModel: string;
  imgSrc: string;

}

interface GooseEventEntry {
  time: string;
  detail: string;
  severity: 'INFO' | 'WARN' | 'ERR';
}

const DEFAULT_TOPOLOGY_NODES: SubscriberNodeConfig[] = [
  {
    iedId: 'IED-132-BC',
    iedName: 'IED_132_BC',
    shortModel: 'MiCOM C264',
    vendorModel: 'Schneider MiCOM C264',
    imgSrc: 'assets/goose-lab/schneider-c264.png',

  },
  {
    iedId: 'IED-132-T1',
    iedName: 'IED_132_T1',
    shortModel: '7UT86',
    vendorModel: 'SIPROTEC 7UT86',
    imgSrc: 'assets/goose-lab/siemens-7ut86.png',

  },
  {
    iedId: 'IED-33-F03',
    iedName: 'IED_33_F03',
    shortModel: 'REF615',
    vendorModel: 'ABB REF615',
    imgSrc: 'assets/goose-lab/abb-ref615.png',

  },
  {
    iedId: 'IED-132-L2',
    iedName: 'IED_132_L2',
    shortModel: 'D60',
    vendorModel: 'GE D60',
    imgSrc: 'assets/goose-lab/ge-d60.png',

  },
];

function nowTimeMs(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

export const GooseLabPage: React.FC = () => {
  const {
    gooseControlBlocks,
    ieds,
    bays,
    networkLinks,
    triggerGooseStateChangeBurst,
    setGooseMismatchFault,
  } = useSubstationStore();

  const [selectedGocbId, setSelectedGocbId] = useState<string>(
    gooseControlBlocks[0]?.id || 'GOCB-132-L1-TRIP'
  );
  const gocb = useMemo(
    () => gooseControlBlocks.find((g) => g.id === selectedGocbId) || gooseControlBlocks[0],
    [gooseControlBlocks, selectedGocbId]
  );

  const publisherBay = bays.find(bay => bay.iedId === gocb?.publisherIedId);
  const isStatusDataset = gocb?.datSet.endsWith('$dsStatus') ?? false;
  const topologyNodes = useMemo<SubscriberNodeConfig[]>(() => {
    if (gocb?.id === 'GOCB-132-L1-TRIP') return DEFAULT_TOPOLOGY_NODES;
    return (gocb?.subscriberIedIds ?? []).flatMap(id => {
      const ied = ieds.find(entry => entry.id === id);
      if (!ied) return [];
      return [{
        iedId: id,
        iedName: ied.name,
        shortModel: ied.model,
        vendorModel: `${ied.vendor} ${ied.model}`,
        imgSrc: getIedImageByModel(ied.vendor, ied.model),

      }];
    });
  }, [gocb?.id, gocb?.subscriberIedIds, ieds]);

  const [activeTab, setActiveTab] = useState<GooseLabTab>('NETWORK_TOPOLOGY');
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<0.1 | 0.25 | 0.5 | 1 | 2 | 4>(0.1);
  const [goEna, setGoEna] = useState<boolean>(true);
  const [lanAUp, setLanAUp] = useState<boolean>(true);
  const [lanBUp, setLanBUp] = useState<boolean>(true);
  const [payloadActive, setPayloadActive] = useState(!isStatusDataset || publisherBay?.breakerState === 'CLOSED');
  const [testModeSub, setTestModeSub] = useState<boolean>(false);
  const [inspectedDeviceId, setInspectedDeviceId] = useState<string | null>(null);

  // Overrides are scoped to one control block, even when publishers share an IED.
  const [subscriptions, setSubscriptions] = useState<Record<string, Record<string, boolean>>>({});
  const subEnabledMap = gocb ? subscriptions[gocb.id] : undefined;

  useEffect(() => {
    setPayloadActive(!isStatusDataset || publisherBay?.breakerState === 'CLOSED');
  }, [gocb?.id, isStatusDataset, publisherBay?.breakerState]);

  // Shared simulation clock for stNum/sqNum progression & per-IED frame counters
  const [simSqNum, setSimSqNum] = useState<number>(12);
  const [prevStNum, setPrevStNum] = useState<number>(Math.max(1, (gocb?.stNum || 5) - 1));
  const [rxCounts, setRxCounts] = useState<Record<string, number>>({
    'IED-132-BC': 1245,
    'IED-132-T1': 1245,
    'IED-33-F03': 1245,
    'IED-132-L2': 1245,
  });
  const [events, setEvents] = useState<GooseEventEntry[]>(() => [
    { time: nowTimeMs(), detail: 'GOOSE Lab V2 initialized — PRP LAN A & LAN B redundant', severity: 'INFO' },
    ...(gocb ? [{ time: nowTimeMs(), detail: `${gocb.publisherIedId} publishing ${gocb.gocbName} (APPID ${gocb.appId}, VLAN ${gocb.vlanId})`, severity: 'INFO' as const }] : []),
  ]);

  const svgRef = useRef<SVGSVGElement | null>(null);

  const anyLanUp = lanAUp || lanBUp;
  const prpDegraded = (lanAUp && !lanBUp) || (!lanAUp && lanBUp);
  const faultMode = gocb?.mismatchFault || 'NONE';
  const isFaultFree = faultMode === 'NONE';
  const publishingActive = goEna && anyLanUp && faultMode !== 'TIMEOUT';

  // Control SVG SMIL animations on Pause/Resume
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    try {
      if (playing) svg.unpauseAnimations?.();
      else svg.pauseAnimations?.();
    } catch {
      // Non-DOM safe
    }
  }, [playing]);

  // Shared simulation timer advancing sqNum & per-IED received packet counts
  useEffect(() => {
    if (!playing || !publishingActive) return;
    const intervalMs = Math.max(250, Math.round(1000 / speed));
    const timer = window.setInterval(() => {
      setSimSqNum((q) => (q >= 999 ? 1 : q + 1));
      setRxCounts((prev) => {
        const next = { ...prev };
        topologyNodes.forEach((n) => {
          // VLAN mismatch drops frames at switch ingress before reaching IEDs
          if (faultMode !== 'VLAN_MISMATCH') {
            next[n.iedId] = (next[n.iedId] || 1200) + 1;
          }
        });
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [playing, speed, publishingActive, faultMode, topologyNodes]);

  const publisherIed = useMemo(
    () => ieds.find((x) => x.id === gocb?.publisherIedId) || ieds[0],
    [ieds, gocb?.publisherIedId]
  );

  const publisherImg = useMemo(() => {
    const m = (publisherIed?.model || '').toLowerCase();
    if (m.includes('7sa87') || !publisherIed) return 'assets/goose-lab/siemens-7sa87.png';
    if (m.includes('7ut86')) return 'assets/goose-lab/siemens-7ut86.png';
    if (m.includes('c264')) return 'assets/goose-lab/schneider-c264.png';
    if (m.includes('ref615')) return 'assets/goose-lab/abb-ref615.png';
    if (m.includes('d60')) return 'assets/goose-lab/ge-d60.png';
    return getIedImageByModel(publisherIed.vendor, publisherIed.model);
  }, [publisherIed]);

  const resolvePort = (iedId: string, plane: 'LAN_A' | 'LAN_B') => {
    const link = networkLinks.find((l) => l.sourceId === iedId && l.lanPlane === plane);
    return {
      iedPort: link?.sourcePort || 'Port not configured',
      swPort: link?.targetPort || 'Port not configured',
      swName: link?.targetId || (plane === 'LAN_A' ? 'SW-LAN-A1' : 'SW-LAN-B1'),
    };
  };

  const pubPortA = resolvePort(gocb?.publisherIedId || 'IED-132-L1', 'LAN_A');
  const pubPortB = resolvePort(gocb?.publisherIedId || 'IED-132-L1', 'LAN_B');

  const logEvent = (detail: string, severity: 'INFO' | 'WARN' | 'ERR' = 'INFO') => {
    setEvents((prev) => [{ time: nowTimeMs(), detail, severity }, ...prev].slice(0, 18));
  };

  const handlePublishState = () => {
    if (!gocb) return;
    setPrevStNum(gocb.stNum);
    triggerGooseStateChangeBurst(gocb.id);
    setSimSqNum(0);
    setPayloadActive(value => isStatusDataset ? !value : true);
    logEvent(
      `${isStatusDataset ? 'Simulated breaker status' : 'Trip'} state change published by ${gocb.publisherIedId}: stNum=${gocb.stNum + 1}, sqNum=0 (MinTime ${gocb.minTimeMs} ms burst)`,
      'WARN'
    );
  };

  const handleReset = () => {
    setPlaying(true);
    setSpeed(0.1);
    setGoEna(true);
    setLanAUp(true);
    setLanBUp(true);
    setTestModeSub(false);
    setPayloadActive(!isStatusDataset || publisherBay?.breakerState === 'CLOSED');
    setSimSqNum(12);
    if (gocb && gocb.mismatchFault !== 'NONE') {
      setGooseMismatchFault(gocb.id, 'NONE');
    }
    logEvent('GOOSE Lab V2 simulation reset to healthy PRP redundant baseline', 'INFO');
  };

  const toggleSubscriber = (node: SubscriberNodeConfig) => {
    if (!gocb) return;
    const nextVal = !(subEnabledMap?.[node.iedId] ?? gocb.subscriberIedIds.includes(node.iedId));
    setSubscriptions(previous => ({
      ...previous,
      [gocb.id]: { ...previous[gocb.id], [node.iedId]: nextVal },
    }));
    logEvent(
      `Subscriber ${node.iedName} (${node.shortModel}) subscription ${nextVal ? 'ENABLED (Accept)' : 'DISABLED (Ignore)'}`,
      nextVal ? 'INFO' : 'WARN'
    );
  };

  // Evaluate each IED's exact frame delivery, subscription match, acceptance, and application input state
  const evaluatedNodes = useMemo(() => {
    return topologyNodes.map((node) => {
      const subscribed = subEnabledMap?.[node.iedId] ?? gocb?.subscriberIedIds.includes(node.iedId) ?? false;
      const frameDelivered = publishingActive && faultMode !== 'VLAN_MISMATCH';
      const extRefBound =
        subscribed && faultMode !== 'DATASET_MISSING' && faultMode !== 'APPID_MISMATCH' && faultMode !== 'CONFREV_MISMATCH';
      const accepted = frameDelivered && subscribed && extRefBound && !testModeSub;
      const inputActive = accepted && payloadActive;

      let statusLabel = 'Ignored';
      if (!frameDelivered) {
        statusLabel = faultMode === 'VLAN_MISMATCH' ? 'VLAN Drop' : !anyLanUp ? 'Link Down' : 'No Tx';
      } else if (!subscribed) {
        statusLabel = 'Ignored';
      } else if (testModeSub) {
        statusLabel = 'Test Blocked';
      } else if (!extRefBound) {
        statusLabel = faultMode.replace('_', ' ');
      } else {
        statusLabel = 'Accepted';
      }

      return {
        ...node,
        subscribed,
        frameDelivered,
        accepted,
        inputActive,
        statusLabel,
        rxCount: rxCounts[node.iedId] || 0,
        portA: resolvePort(node.iedId, 'LAN_A'),
        portB: resolvePort(node.iedId, 'LAN_B'),
      };
    });
  }, [subEnabledMap, publishingActive, faultMode, testModeSub, payloadActive, anyLanUp, rxCounts, networkLinks, topologyNodes, gocb?.subscriberIedIds]);

  const dur = (sec: number) => `${(sec / speed).toFixed(2)}s`;
  const currentStNum = gocb?.stNum ?? 5;
  const datasetEntries = publisherIed?.datasets.find(dataset => dataset.name === gocb?.datSet.split('$').pop())?.fcdas.length;
  const goIdStr = gocb?.gocbName === 'gcbLine1ProtTrip' ? 'Line1_Trip' : gocb?.gocbName || 'Line1_Trip';

  const faultOptions: { value: GooseControlBlock['mismatchFault']; label: string }[] = [
    { value: 'NONE', label: 'Healthy — No Protocol Fault' },
    { value: 'VLAN_MISMATCH', label: 'VLAN ID Mismatch (Switch Ingress Drop)' },
    { value: 'APPID_MISMATCH', label: 'APPID Mismatch (Subscriber Filter Reject)' },
    { value: 'CONFREV_MISMATCH', label: 'confRev Mismatch (ndsCom=TRUE)' },
    { value: 'DATASET_MISSING', label: 'Missing DataSet FCDA / Invalid ExtRef' },
    { value: 'TIMEOUT', label: 'GOOSE TAL Timeout (2000 ms Expired)' },
  ];

  // Exact port-seated SVG coordinates anchored directly inside Hirschmann RSP35 RJ45/SFP cages & Rear IED Port Insets
  const PUB_A = { x: 116, y: 178 };
  const PUB_B = { x: 130, y: 178 };
  const SWA_PORTS = [
    { x: 250, y: 128 }, // RJ45 Port 1 (from Pub LAN A)
    { x: 265, y: 128 }, // RJ45 Port 2 (to IED_132_BC)
    { x: 287, y: 128 }, // RJ45 Port 3 (to IED_132_T1)
    { x: 305, y: 128 }, // RJ45 Port 4 (to IED_33_F03)
    { x: 337, y: 128 }, // SFP Port 1  (to IED_132_L2)
  ];
  const SWB_PORTS = [
    { x: 474, y: 128 }, // RJ45 Port 1 (from Pub LAN B)
    { x: 489, y: 128 }, // RJ45 Port 2 (to IED_132_BC)
    { x: 511, y: 128 }, // RJ45 Port 3 (to IED_132_T1)
    { x: 529, y: 128 }, // RJ45 Port 4 (to IED_33_F03)
    { x: 561, y: 128 }, // SFP Port 1  (to IED_132_L2)
  ];
  const SUB_ANCHORS = [
    { xA: 172, xB: 202, y: 266 }, // IED_132_BC Rear Port Inset
    { xA: 314, xB: 344, y: 266 }, // IED_132_T1 Rear Port Inset
    { xA: 456, xB: 486, y: 266 }, // IED_33_F03 Rear Port Inset
    { xA: 598, xB: 628, y: 266 }, // IED_132_L2 Rear Port Inset
  ];

  const pathPubA = `M ${PUB_A.x} ${PUB_A.y} L ${PUB_A.x} 200 Q ${PUB_A.x} 208 ${PUB_A.x + 8} 208 L ${SWA_PORTS[0].x - 8} 208 Q ${SWA_PORTS[0].x} 208 ${SWA_PORTS[0].x} 200 L ${SWA_PORTS[0].x} ${SWA_PORTS[0].y}`;
  const pathPubB = `M ${PUB_B.x} ${PUB_B.y} L ${PUB_B.x} 214 Q ${PUB_B.x} 222 ${PUB_B.x + 8} 222 L ${SWB_PORTS[0].x - 8} 222 Q ${SWB_PORTS[0].x} 222 ${SWB_PORTS[0].x} 214 L ${SWB_PORTS[0].x} ${SWB_PORTS[0].y}`;

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
            GOOSE Lab V2 — Multi-Subscriber Communication
          </h2>
          <p className="text-[11px] text-[#8BBCE0] mt-0.5">
            IEC 61850-8-1 | Publisher → Multiple Subscribers | Selective Acceptance (Configured Subscribers Only)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono font-bold">
          <span
            className="px-3 py-1 rounded-lg border flex items-center gap-1.5"
            style={{
              backgroundColor: playing && isFaultFree && goEna ? '#062E20' : '#3B0D15',
              borderColor: playing && isFaultFree && goEna ? '#22C55E' : '#EF4444',
              color: playing && isFaultFree && goEna ? '#4ADE80' : '#FCA5A5',
            }}
          >
            <span className={`w-2 h-2 rounded-full ${playing && isFaultFree ? 'bg-[#22C55E] animate-pulse' : 'bg-[#EF4444]'}`} />
            Simulation: {playing ? (isFaultFree && goEna ? 'RUNNING' : 'FAULT') : 'PAUSED'}
          </span>

          <span
            className="px-3 py-1 rounded-lg border"
            style={{
              backgroundColor: !anyLanUp ? '#3B0D15' : prpDegraded ? '#332206' : '#06263A',
              borderColor: !anyLanUp ? '#EF4444' : prpDegraded ? '#F59E0B' : '#00DFFF',
              color: !anyLanUp ? '#FCA5A5' : prpDegraded ? '#FCD34D' : '#7DD3FC',
            }}
          >
            PRP: {!anyLanUp ? 'LOST' : prpDegraded ? 'DEGRADED' : 'REDUNDANT'}
          </span>

          <button
            type="button"
            onClick={() => {
              setLanAUp((v) => {
                logEvent(`PRP LAN A switch link ${!v ? 'RESTORED (UP)' : 'FAILED (DOWN)'}`, !v ? 'INFO' : 'ERR');
                return !v;
              });
            }}
            className="px-3 py-1 rounded-lg border transition hover:brightness-110"
            style={{
              backgroundColor: lanAUp ? '#082F49' : '#3B0D15',
              borderColor: lanAUp ? '#38BDF8' : '#EF4444',
              color: lanAUp ? '#7DD3FC' : '#FCA5A5',
            }}
            title="Click to simulate PRP LAN A Failure"
          >
            LAN A: {lanAUp ? 'UP' : 'DOWN'}
          </button>

          <button
            type="button"
            onClick={() => {
              setLanBUp((v) => {
                logEvent(`PRP LAN B switch link ${!v ? 'RESTORED (UP)' : 'FAILED (DOWN)'}`, !v ? 'INFO' : 'ERR');
                return !v;
              });
            }}
            className="px-3 py-1 rounded-lg border transition hover:brightness-110"
            style={{
              backgroundColor: lanBUp ? '#3B0764' : '#3B0D15',
              borderColor: lanBUp ? '#C084FC' : '#EF4444',
              color: lanBUp ? '#F0ABFC' : '#FCA5A5',
            }}
            title="Click to simulate PRP LAN B Failure"
          >
            LAN B: {lanBUp ? 'UP' : 'DOWN'}
          </button>
        </div>
      </div>

      {/* 2. SIX SUB-NAVIGATION TABS ROW */}
      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: 'ENGINEERING', label: 'Engineering', icon: <Settings className="w-3.5 h-3.5" /> },
            { id: 'NETWORK_TOPOLOGY', label: 'Network Topology', icon: <Network className="w-3.5 h-3.5" /> },
            { id: 'LIVE_SIMULATION', label: 'Live Simulation', icon: <Activity className="w-3.5 h-3.5" /> },
            { id: 'PACKET_ANALYZER', label: 'Packet Analyzer', icon: <FileCode2 className="w-3.5 h-3.5" /> },
            { id: 'DIAGNOSTICS', label: 'Diagnostics', icon: <ShieldAlert className="w-3.5 h-3.5" /> },
            { id: 'EVENT_TIMELINE', label: 'Event Timeline', icon: <Clock className="w-3.5 h-3.5" /> },
          ] as const
        ).map((tab) => {
          const isAct = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className="px-4 py-1.5 rounded-lg border text-xs font-extrabold flex items-center gap-1.5 transition"
              style={{
                background: isAct ? 'linear-gradient(180deg, #00E5FF 0%, #00A6D6 100%)' : '#06182B',
                color: isAct ? '#02101F' : '#CFE6F7',
                borderColor: isAct ? '#38F2FF' : '#184468',
                boxShadow: isAct ? '0 0 16px rgba(0, 229, 255, 0.45)' : 'none',
              }}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3. MAIN 3-COLUMN WORKSPACE (Matches Reference Screenshot Layout) */}
      {(activeTab === 'NETWORK_TOPOLOGY' || activeTab === 'LIVE_SIMULATION') && (
        <>
          <div className="grid grid-cols-1 xl:grid-cols-[265px_minmax(0,1fr)_275px] gap-2.5 items-stretch">
            {/* LEFT COLUMN: GOOSE Publisher + GOOSE Subscribers (Configured) */}
            <div className="flex flex-col gap-2.5">
              {/* GOOSE Publisher Panel */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex items-center justify-between">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#00DFFF]" />
                    GOOSE Publisher
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setGoEna((v) => {
                        logEvent(`Publisher GoEna set to ${!v ? 'TRUE (Publishing)' : 'FALSE (Disabled)'}`, !v ? 'INFO' : 'WARN');
                        return !v;
                      });
                    }}
                    className={`px-2 py-0.5 rounded text-[9.5px] font-mono font-bold border ${
                      goEna
                        ? 'bg-[#062E20] border-[#22C55E] text-[#4ADE80]'
                        : 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]'
                    }`}
                  >
                    GoEna: {goEna ? 'ON' : 'OFF'}
                  </button>
                </div>

                <div className="p-3 space-y-2.5">
                  <select
                    value={gocb?.id}
                    onChange={(e) => setSelectedGocbId(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-[#020E1B] border border-[#1B4B72] text-[10.5px] font-mono text-[#BAE6FD]"
                  >
                    {gooseControlBlocks.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.publisherIedId} · {g.gocbName} ({g.appId})
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2.5">
                    <img
                      src={publisherImg}
                      alt={gocb?.publisherIedName}
                      className="w-16 h-24 object-contain rounded bg-[#020D19] border border-[#163D5E] p-1 shrink-0"
                    />
                    <div className="min-w-0 space-y-1">
                      <div className="font-extrabold text-white text-xs truncate">
                        {publisherIed?.name || 'IED_132_L1'}
                      </div>
                      <div className="text-[10px] text-[#9ED8F6] truncate">
                        ({publisherIed?.model || '7SA87'})
                      </div>
                      <div
                        className="text-[10.5px] font-extrabold"
                        style={{ color: publishingActive ? '#4ADE80' : '#F87171' }}
                      >
                        {publishingActive ? '+ PUBLISHING' : '✕ STOPPED'}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-1 font-mono text-[10px] border-t border-[#123952] pt-2">
                    {[
                      ['GCB', gocb?.gocbName || 'gcbLine1ProtTrip'],
                      ['DataSet', gocb?.datSet.split('$').pop() || 'DS_Line1_Trip'],
                      ['APPID', gocb?.appId || '0x0001'],
                      ['VLAN ID', `${gocb?.vlanId ?? 101} (Prio: ${gocb?.vlanPriority ?? 4})`],
                      ['MAC', gocb?.multicastMac || '01-0C-CD-01-00-01'],
                      ['confRev', `${gocb?.confRev ?? 1} · ${gocb?.minTimeMs ?? 4}/${gocb?.maxTimeMs ?? 1000}ms`],
                    ].map(([k, v]) => (
                      <div key={k} className="flex justify-between gap-2 border-b border-[#0F2C45] pb-0.5 last:border-b-0">
                        <span className="text-[#8BB3D4]">{k}</span>
                        <span className="text-white font-bold truncate">{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* GOOSE Subscribers (Configured) Panel */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg flex-1">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5 text-[#00DFFF]" />
                    GOOSE Subscribers (Configured)
                  </span>
                </div>
                <div className="p-2.5 space-y-2">
                  {evaluatedNodes.map((node) => (
                    <div
                      key={node.iedId}
                      className="flex items-center justify-between gap-2 p-2 rounded-lg border transition"
                      style={{
                        backgroundColor: node.subscribed ? '#062033' : '#031220',
                        borderColor: node.subscribed ? '#19688E' : '#12314A',
                      }}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <img
                          src={node.imgSrc}
                          alt={node.vendorModel}
                          className="w-7 h-8 object-contain shrink-0"
                        />
                        <div className="min-w-0">
                          <div className="font-bold text-white text-[10.5px] truncate">
                            {node.iedName}{' '}
                            <span className="text-[#8AD8FF] font-normal">({node.shortModel})</span>
                          </div>
                          <div
                            className="text-[9.5px] font-bold"
                            style={{ color: node.subscribed ? '#4ADE80' : '#94A3B8' }}
                          >
                            {node.subscribed ? 'Subscribed ✓' : 'Not Subscribed'}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={node.subscribed}
                        onClick={() => toggleSubscriber(node)}
                        className={`w-9 h-5 rounded-full p-0.5 transition-colors border shrink-0 ${
                          node.subscribed
                            ? 'bg-[#22C55E] border-[#86EFAC]'
                            : 'bg-[#1E293B] border-[#475569]'
                        }`}
                      >
                        <span
                          className={`block w-3.5 h-3.5 rounded-full bg-white transition-transform ${
                            node.subscribed ? 'translate-x-4' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER COLUMN: Station Bus – Real Device Topology (PRP) */}
            <div
              className="rounded-xl border overflow-hidden shadow-xl flex flex-col"
              style={{
                borderColor: '#00DFFF',
                background: 'linear-gradient(180deg, #061A2E 0%, #030F1D 100%)',
                boxShadow: '0 0 20px rgba(0, 223, 255, 0.14)',
              }}
            >
              <div className="px-4 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] via-[#052038] to-[#07304A] flex items-center justify-center gap-2">
                <Layers className="w-4 h-4 text-[#00E5FF]" />
                <span className="text-xs sm:text-sm font-extrabold text-white">
                  Station Bus – Real Device Topology (PRP)
                </span>
              </div>

              <div className="p-2 flex-1 flex items-center justify-center overflow-x-auto">
                <div className="min-w-[680px] w-full">
                  <svg
                    ref={svgRef}
                    viewBox="0 0 740 430"
                    className="w-full h-auto block select-none"
                    role="img"
                    aria-label="Station Bus Real Device PRP Topology with Publisher, Hirschmann Switches, and 4 Bay IEDs"
                  >
                    <defs>
                      <linearGradient id="rackWall" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#0C1724" />
                        <stop offset="50%" stopColor="#122130" />
                        <stop offset="100%" stopColor="#0A141F" />
                      </linearGradient>
                      <linearGradient id="dinRail" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#94A3B8" />
                        <stop offset="50%" stopColor="#475569" />
                        <stop offset="100%" stopColor="#1E293B" />
                      </linearGradient>
                      <filter id="gGlow" x="-60%" y="-60%" width="220%" height="220%">
                        <feGaussianBlur stdDeviation="2.4" result="b" />
                        <feMerge>
                          <feMergeNode in="b" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Metallic Industrial Relay Cabinet Interior */}
                    <rect x="0" y="0" width="740" height="430" rx="8" fill="url(#rackWall)" stroke="#1E3A52" strokeWidth="1.5" />
                    {/* Left & Right Vertical Rack Rails */}
                    <rect x="6" y="8" width="14" height="414" fill="#334155" stroke="#64748B" strokeWidth="1" />
                    <rect x="720" y="8" width="14" height="414" fill="#334155" stroke="#64748B" strokeWidth="1" />
                    {/* Horizontal DIN Mounting Rail behind bottom 4 relays */}
                    <rect x="20" y="310" width="700" height="22" fill="url(#dinRail)" stroke="#94A3B8" strokeWidth="0.8" />

                    {/* TOP-LEFT: Publisher IED (Siemens SIPROTEC 5 7SA87) */}
                    <image href={publisherImg} x="26" y="24" width="92" height="154" preserveAspectRatio="xMidYMid meet" style={{ cursor: "pointer" }} onClick={() => setInspectedDeviceId(publisherIed?.id || "IED-132-L1")} />
                    <text x="78" y="196" textAnchor="middle" fill="#9ED8F6" fontSize="9.5" fontWeight="700">Publisher</text>
                    <text x="78" y="209" textAnchor="middle" fill="#FFFFFF" fontSize="10" fontWeight="800" fontFamily="monospace">
                      {publisherIed?.name || 'IED_132_L1'}
                    </text>
                    <text x="78" y="221" textAnchor="middle" fill="#7DD3FC" fontSize="9">
                      ({publisherIed?.model || '7SA87'})
                    </text>
                    {/* Rear Port Inset Callout */}
                    <rect x="108" y="160" width="32" height="24" rx="3" fill="#041526" stroke="#38BDF8" strokeWidth="1" />
                    <text x="124" y="170" textAnchor="middle" fill="#38BDF8" fontSize="6.5" fontWeight="800" fontFamily="monospace">REAR</text>
                    <text x="124" y="179" textAnchor="middle" fill="#E879F9" fontSize="6.5" fontWeight="800" fontFamily="monospace">A | B</text>

                    {/* TOP-CENTER: Switch A (LAN A) & Switch B (LAN B) — Hirschmann RSP35 */}
                    <text x="276" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="800">Switch A (LAN A)</text>
                    <text x="276" y="51" textAnchor="middle" fill="#7DD3FC" fontSize="9.5">Hirschmann RSP35</text>
                    <image
                      href="assets/goose-lab/hirschmann-rsp35.png"
                      x="196"
                      y="56"
                      width="168"
                      height="92"
                      preserveAspectRatio="xMidYMid meet"
                      opacity={lanAUp ? 1 : 0.45}
                    />
                    <text x="276" y="170" textAnchor="middle" fill={lanAUp ? '#38BDF8' : '#FCA5A5'} fontSize="7.5" fontFamily="monospace">
                      {pubPortA.swName} · {pubPortA.swPort}
                    </text>

                    <text x="498" y="38" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="800">Switch B (LAN B)</text>
                    <text x="498" y="51" textAnchor="middle" fill="#E879F9" fontSize="9.5">Hirschmann RSP35</text>
                    <image
                      href="assets/goose-lab/hirschmann-rsp35.png"
                      x="420"
                      y="56"
                      width="168"
                      height="92"
                      preserveAspectRatio="xMidYMid meet"
                      opacity={lanBUp ? 1 : 0.45}
                    />
                    <text x="498" y="170" textAnchor="middle" fill={lanBUp ? '#E879F9' : '#FCA5A5'} fontSize="7.5" fontFamily="monospace">
                      {pubPortB.swName} · {pubPortB.swPort}
                    </text>

                    {/* TOP-RIGHT LEGEND BOX (Exact Reference Match) */}
                    <rect x="614" y="20" width="98" height="156" rx="7" fill="#041526" stroke="#1B4B72" strokeWidth="1.2" />
                    <text x="624" y="37" fill="#FFFFFF" fontSize="10" fontWeight="800">Legend</text>
                    <line x1="624" y1="53" x2="646" y2="53" stroke="#38BDF8" strokeWidth="3" />
                    <text x="652" y="56" fill="#DCEEFB" fontSize="8">LAN A (PRP)</text>
                    <line x1="624" y1="73" x2="646" y2="73" stroke="#C084FC" strokeWidth="3" />
                    <text x="652" y="76" fill="#DCEEFB" fontSize="8">LAN B (PRP)</text>
                    <text x="624" y="97" fill="#00E5FF" fontSize="10" fontWeight="900">»»»</text>
                    <text x="652" y="95" fill="#DCEEFB" fontSize="7.5">GOOSE Frame</text>
                    <text x="652" y="104" fill="#7DD3FC" fontSize="6.8">(Multicast 0x88B8)</text>
                    <rect x="624" y="116" width="22" height="14" rx="4" fill="#062E20" stroke="#22C55E" strokeWidth="1.2" />
                    <text x="652" y="125" fill="#4ADE80" fontSize="7.3" fontWeight="700">Subscribed</text>
                    <rect x="624" y="142" width="22" height="14" rx="4" fill="#1E293B" stroke="#64748B" strokeWidth="1.2" />
                    <text x="652" y="151" fill="#94A3B8" fontSize="7.3">Not Subscribed</text>

                    {/* PHYSICAL PRP LAN A (BLUE) & LAN B (VIOLET) PATCH CABLES */}
                    {/* Publisher -> Switch A (Blue) & Switch B (Violet) */}
                    <path id="gl-pub-a" d={pathPubA} fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="3.2" strokeDasharray={lanAUp ? undefined : '5 3'} />
                    <path id="gl-pub-b" d={pathPubB} fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="3.2" strokeDasharray={lanBUp ? undefined : '5 3'} />

                    {/* Animated GOOSE Overlay Packets + Live Data Flow Badges on Publisher -> Switch A & B */}
                    {publishingActive && lanAUp && (
                      <g>
                        <animateMotion dur={dur(2.2)} repeatCount="indefinite"><mpath href="#gl-pub-a" /></animateMotion>
                        <circle r="4.5" fill="#00E5FF" stroke="#FFFFFF" strokeWidth="1.2" filter="url(#gGlow)" />
                        <rect x="-54" y="-22" width="108" height="15" rx="7.5" fill={simSqNum === 0 ? '#3B0D15' : '#05253C'} fillOpacity="0.95" stroke={simSqNum === 0 ? '#F87171' : '#00E5FF'} strokeWidth="1.2" />
                        <text x="0" y="-12" textAnchor="middle" fill={simSqNum === 0 ? '#FECACA' : '#E0FAFF'} fontSize="7" fontWeight="800" fontFamily="monospace">
                          {simSqNum === 0 ? `TRIP BURST · st:${gocb?.stNum ?? 1}` : `GOOSE 0x88B8 · st:${gocb?.stNum ?? 1} sq:${simSqNum}`}
                        </text>
                      </g>
                    )}
                    {publishingActive && lanBUp && (
                      <g>
                        <animateMotion dur={dur(2.3)} begin="0.5s" repeatCount="indefinite"><mpath href="#gl-pub-b" /></animateMotion>
                        <circle r="4.5" fill="#D8B4FE" stroke="#FFFFFF" strokeWidth="1.2" filter="url(#gGlow)" />
                        <rect x="-54" y="7" width="108" height="15" rx="7.5" fill="#23103D" fillOpacity="0.95" stroke="#C084FC" strokeWidth="1.2" />
                        <text x="0" y="17" textAnchor="middle" fill="#F3E8FF" fontSize="6.9" fontWeight="800" fontFamily="monospace">
                          {`PRP-B · ${gocb?.appId || '0x0001'} · V${gocb?.vlanId ?? 101}`}
                        </text>
                      </g>
                    )}

                    {/* Switch A & Switch B -> 4 Bay IEDs */}
                    {evaluatedNodes.map((node, idx) => {
                      const swA = SWA_PORTS[idx + 1];
                      const swB = SWB_PORTS[idx + 1];
                      const sub = SUB_ANCHORS[idx];
                      const laneAY = 236 + idx * 4;
                      const laneBY = 250 + idx * 4;

                      const pA = `M ${swA.x} ${swA.y} L ${swA.x} ${laneAY - 6} Q ${swA.x} ${laneAY} ${sub.xA < swA.x ? swA.x - 6 : swA.x + 6} ${laneAY} L ${sub.xA < swA.x ? sub.xA + 6 : sub.xA - 6} ${laneAY} Q ${sub.xA} ${laneAY} ${sub.xA} ${laneAY + 6} L ${sub.xA} ${sub.y}`;
                      const pB = `M ${swB.x} ${swB.y} L ${swB.x} ${laneBY - 6} Q ${swB.x} ${laneBY} ${sub.xB < swB.x ? swB.x - 6 : swB.x + 6} ${laneBY} L ${sub.xB < swB.x ? sub.xB + 6 : sub.xB - 6} ${laneBY} Q ${sub.xB} ${laneBY} ${sub.xB} ${laneBY + 6} L ${sub.xB} ${sub.y}`;

                      return (
                        <g key={node.iedId}>
                          <path
                            id={`gl-a-${idx}`}
                            d={pA}
                            fill="none"
                            stroke={lanAUp ? '#38BDF8' : '#EF4444'}
                            strokeWidth="2.8"
                            strokeDasharray={lanAUp ? undefined : '5 3'}
                            opacity={node.subscribed ? 1 : 0.72}
                          />
                          <path
                            id={`gl-b-${idx}`}
                            d={pB}
                            fill="none"
                            stroke={lanBUp ? '#C084FC' : '#EF4444'}
                            strokeWidth="2.8"
                            strokeDasharray={lanBUp ? undefined : '5 3'}
                            opacity={node.subscribed ? 1 : 0.72}
                          />

                          {/* Cyan/Green/Red GOOSE Overlay Packets + Live Subscriber Decision Badges */}
                          {node.frameDelivered && lanAUp && (() => {
                            const isRejected = node.subscribed && !node.accepted;
                            const badgeColor = node.accepted ? '#4ADE80' : isRejected ? '#F87171' : '#38BDF8';
                            const badgeFill = node.accepted ? '#052E1E' : isRejected ? '#3B0D15' : '#06243A';
                            const badgeTxt = node.accepted
                              ? 'ACCEPT · ExtRef'
                              : isRejected
                                ? `DROP · ${faultMode.replace('_MISMATCH', '')}`
                                : 'L2 MCAST · IGNORE';
                            return (
                              <g>
                                <animateMotion dur={dur(2.4 + idx * 0.18)} repeatCount="indefinite">
                                  <mpath href={`#gl-a-${idx}`} />
                                </animateMotion>
                                <circle r={node.accepted ? 4.2 : 3.4} fill={badgeColor} stroke="#FFFFFF" strokeWidth="1" filter="url(#gGlow)" />
                                {(idx === 0 || idx === 2 || isRejected) && (
                                  <>
                                    <rect x="-41" y="-19" width="82" height="13.5" rx="6.8" fill={badgeFill} fillOpacity="0.94" stroke={badgeColor} strokeWidth="1.1" />
                                    <text x="0" y="-10" textAnchor="middle" fill="#F0FAFF" fontSize="6.5" fontWeight="800" fontFamily="monospace">
                                      {badgeTxt}
                                    </text>
                                  </>
                                )}
                              </g>
                            );
                          })()}
                          {node.frameDelivered && lanBUp && (
                            <circle r={node.accepted ? 4.0 : 3.2} fill={node.accepted ? '#4ADE80' : '#C084FC'} filter="url(#gGlow)">
                              <animateMotion dur={dur(2.45 + idx * 0.18)} begin="0.55s" repeatCount="indefinite">
                                <mpath href={`#gl-b-${idx}`} />
                              </animateMotion>
                            </circle>
                          )}
                        </g>
                      );
                    })}

                    {/* RJ45 / SFP Physical Plug Connectors Seated Directly in Switch A & Switch B Ports */}
                    {SWA_PORTS.map((pt, i) => (
                      <rect key={`plug-a-${i}`} x={pt.x - 3.5} y={pt.y - 4} width="7" height="8" rx="1.5" fill={lanAUp ? '#38BDF8' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                    ))}
                    {SWB_PORTS.map((pt, i) => (
                      <rect key={`plug-b-${i}`} x={pt.x - 3.5} y={pt.y - 4} width="7" height="8" rx="1.5" fill={lanBUp ? '#C084FC' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                    ))}

                    {/* BOTTOM ROW: 4 REALISTIC TRANSPARENT DIN-RAIL BAY IEDs WITH REAR PORT INSETS */}
                    {evaluatedNodes.map((node, idx) => {
                      const cx = 187 + idx * 142;
                      const x = cx - 54;
                      const sub = SUB_ANCHORS[idx];
                      const isAcc = node.accepted;
                      const isErr = node.subscribed && !node.accepted;
                      return (
                        <g key={`dev-${node.iedId}`} onClick={() => setInspectedDeviceId(node.iedId)} style={{ cursor: 'pointer' }}>
                          {/* Rear Ethernet Port Inset (PRP A & PRP B) cleanly above unobstructed front panel */}
                          <rect x={cx - 32} y="256" width="64" height="16" rx="3" fill="#041526" stroke="#1E4E74" strokeWidth="1" />
                          <circle cx={sub.xA} cy={sub.y} r="3.4" fill={lanAUp ? '#38BDF8' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                          <circle cx={sub.xB} cy={sub.y} r="3.4" fill={lanBUp ? '#C084FC' : '#EF4444'} stroke="#020B16" strokeWidth="1" />
                          <text x={cx} y="266.5" textAnchor="middle" fill="#9ED8F6" fontSize="6.5" fontWeight="800" fontFamily="monospace">PRP A | B</text>

                          {/* Unobstructed Transparent Front-Panel Hardware Image (Zero Black Box!) */}
                          <image
                            href={node.imgSrc}
                            x={x + 4}
                            y="274"
                            width="100"
                            height="88"
                            preserveAspectRatio="xMidYMid meet"
                          />
                          <text x={cx} y="375" textAnchor="middle" fill="#FFFFFF" fontSize="9.5" fontWeight="800" fontFamily="monospace">
                            {node.iedName}
                          </text>
                          <text x={cx} y="387" textAnchor="middle" fill="#9ED8F6" fontSize="8.5">
                            ({node.shortModel})
                          </text>
                          <rect
                            x={x + 8}
                            y="393"
                            width="92"
                            height="18"
                            rx="5"
                            fill={isAcc ? '#063B23' : isErr ? '#3B0D15' : '#1E293B'}
                            stroke={isAcc ? '#22C55E' : isErr ? '#EF4444' : '#64748B'}
                            strokeWidth="1"
                          />
                          <text
                            x={cx}
                            y="405"
                            textAnchor="middle"
                            fill={isAcc ? '#4ADE80' : isErr ? '#FCA5A5' : '#CBD5E1'}
                            fontSize="8.6"
                            fontWeight="800"
                          >
                            {isAcc ? 'ACCEPTED ✓' : isErr ? node.statusLabel.toUpperCase() : 'IGNORED —'}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Interactive Device & Port Inspection Panel (Opens when any device is clicked) */}
              {inspectedDeviceId && (() => {
                const isPub = inspectedDeviceId === (publisherIed?.id || 'IED-132-L1');
                const subNode = evaluatedNodes.find((n) => n.iedId === inspectedDeviceId);
                const matchedIed = ieds.find((x) => x.id === inspectedDeviceId);
                const pA = isPub ? pubPortA : subNode?.portA || resolvePort(inspectedDeviceId, 'LAN_A');
                const pB = isPub ? pubPortB : subNode?.portB || resolvePort(inspectedDeviceId, 'LAN_B');
                return (
                  <div className="border-t border-[#00DFFF] bg-[#020E1C] px-3 py-2.5 text-[10.5px]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-extrabold text-[#00E5FF]">
                        Device &amp; Port Inspector — {matchedIed?.name || subNode?.iedName || inspectedDeviceId}
                      </span>
                      <button
                        type="button"
                        onClick={() => setInspectedDeviceId(null)}
                        className="px-2 py-0.5 rounded bg-[#07243D] text-[#7DD3FC] hover:text-white font-bold"
                      >
                        Close ✕
                      </button>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 font-mono text-[9.5px]">
                      {[
                        ['Manufacturer', matchedIed?.vendor || (subNode?.vendorModel.split(' ')[0] ?? 'Not available')],
                        ['Model', matchedIed?.model || subNode?.shortModel || 'Not available'],
                        ['IED ID', matchedIed?.name || subNode?.iedName || inspectedDeviceId],
                        ['Comm Interface', '100BASE-FX / Rear Ethernet'],
                        ['PRP Capability', matchedIed?.nodeType || 'DANP (Dual-Attached)'],
                        ['LAN A Port', `${pA.iedPort} → ${pA.swName}/${pA.swPort}`],
                        ['LAN B Port', `${pB.iedPort} → ${pB.swName}/${pB.swPort}`],
                        ['Role', isPub ? 'GOOSE Publisher' : subNode?.subscribed ? 'GOOSE Subscriber' : 'Station-Bus IED (Non-Sub)'],
                        ['Subscription', isPub ? 'Publishing (GoEna=' + (goEna ? 'ON' : 'OFF') + ')' : subNode?.subscribed ? 'Subscribed' : 'Not Subscribed'],
                        ['Last GOOSE Frame', `stNum=${currentStNum}, sqNum=${simSqNum}`],
                        ['Status', isPub ? (publishingActive ? 'ACTIVE' : 'STOPPED') : subNode?.statusLabel || 'Unknown'],
                      ].map(([k, v]) => (
                        <div key={k} className="p-1.5 rounded bg-[#041628] border border-[#164463]">
                          <div className="text-[8.5px] text-[#8BB3D4] font-sans">{k}</div>
                          <div className="font-bold text-white truncate">{v}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* RIGHT COLUMN: GOOSE Message Details (Live) + Animation Control + Status Summary */}
            <div className="flex flex-col gap-2.5">
              {/* GOOSE Message Details (Live) */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-[#4ADE80]" />
                    GOOSE Message Details (Live)
                  </span>
                </div>
                <div className="p-3 space-y-1 font-mono text-[10.5px]">
                  {[
                    ['goID', goIdStr],
                    ['gocbRef', gocb?.gocbName || 'gcbLine1ProtTrip'],
                    ['datSet', gocb?.datSet.split('$').pop() || 'DS_Line1_Trip'],
                    ['stNum', String(currentStNum)],
                    ['sqNum', String(simSqNum)],
                    ['confRev', String(gocb?.confRev ?? 1)],
                    ['TAL', `${gocb?.timeAllowedToLiveMs ?? 2000} ms`],
                    ['Payload', `${gocb?.extRefs.length ? gocb.extRefs.length + 3 : 5} DataSet entries`],
                  ].map(([k, v]) => (
                    <div key={k} className="grid grid-cols-[72px_minmax(0,1fr)] gap-2 border-b border-[#0F2C45] pb-0.5 last:border-b-0">
                      <span className="text-[#8BB3D4]">{k}</span>
                      <span className="text-white font-bold truncate">: {v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Animation Control */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-[#00DFFF]" />
                    Animation Control
                  </span>
                </div>
                <div className="p-3 space-y-2">
                  <button
                    type="button"
                    onClick={handlePublishState}
                    className="w-full py-1.5 rounded-lg border border-[#F59E0B] bg-[#332005] text-[#FDE68A] font-extrabold text-xs flex items-center justify-center gap-1.5 hover:brightness-110 transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-[#FACC15]" />
                    {isStatusDataset ? 'Publish Simulated CB Status (stNum++)' : 'Publish Trip (stNum++)'}
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setPlaying((p) => !p)}
                      className="py-1.5 rounded-lg border border-[#1E5680] bg-[#072138] text-white font-bold flex items-center justify-center gap-1.5 hover:border-[#00DFFF]"
                    >
                      {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                      {playing ? 'Pause' : 'Resume'}
                    </button>
                    <button
                      type="button"
                      onClick={handleReset}
                      className="py-1.5 rounded-lg border border-[#1E5680] bg-[#072138] text-white font-bold flex items-center justify-center gap-1.5 hover:border-[#00DFFF]"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Reset
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-1">
                    <span className="text-[11px] text-[#9BC0DF] font-semibold">Speed :</span>
                    <div className="flex gap-1.5 flex-1 justify-end">
                      {([0.1, 0.25, 0.5, 1, 2, 4] as const).map((s) => (
                        <button
                          key={s}
                          type="button"
                          onClick={() => setSpeed(s)}
                          className="px-3 py-1 rounded-md border text-[11px] font-extrabold transition"
                          style={{
                            backgroundColor: speed === s ? '#00DFFF' : '#061B2E',
                            color: speed === s ? '#02101F' : '#CFE6F7',
                            borderColor: speed === s ? '#38F2FF' : '#1E4E74',
                          }}
                        >
                          {s}×
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Summary */}
              <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg flex-1">
                <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                  <span className="font-extrabold text-white flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#4ADE80]" />
                    Status Summary
                  </span>
                </div>
                <div className="p-3 space-y-1.5 text-[11px]">
                  {[
                    { label: 'GOOSE Publishing', ok: publishingActive, text: publishingActive ? 'Active' : 'Stopped' },
                    { label: 'Delivery (LAN A)', ok: lanAUp && publishingActive, text: lanAUp ? 'OK' : 'DOWN' },
                    { label: 'Delivery (LAN B)', ok: lanBUp && publishingActive, text: lanBUp ? 'OK' : 'DOWN' },
                    ...evaluatedNodes.map((n) => ({
                      label: n.iedName,
                      ok: n.accepted,
                      muted: !n.subscribed,
                      text: n.accepted ? 'Accepted' : n.subscribed ? n.statusLabel : 'Not Subscribed',
                    })),
                  ].map((row) => (
                    <div key={row.label} className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-[#DCEEFB]">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{
                            backgroundColor: row.ok ? '#22C55E' : (row as { muted?: boolean }).muted ? '#38BDF8' : '#EF4444',
                          }}
                        />
                        {row.label}
                      </span>
                      <span
                        className="font-bold"
                        style={{
                          color: row.ok ? '#4ADE80' : (row as { muted?: boolean }).muted ? '#94A3B8' : '#F87171',
                        }}
                      >
                        {row.text}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 4. BOTTOM 2-COLUMN ROW: GOOSE Transmission Timeline + Subscriber Response Table */}
          <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.12fr] gap-2.5">
            {/* Bottom Left: GOOSE Transmission Timeline */}
            <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
              <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829] flex items-center justify-between">
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#00DFFF]" />
                  GOOSE Transmission Timeline
                </span>
                <span className="font-mono text-[10px] text-[#7DD3FC]">
                  MinTime: {gocb?.minTimeMs ?? 4}ms · MaxTime: {gocb?.maxTimeMs ?? 1000}ms
                </span>
              </div>

              <div className="p-3 space-y-2 font-mono text-[10px]">
                {/* stNum Row */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-[#8BB3D4]">stNum</span>
                  <div className="grid grid-cols-[26%_74%] gap-1">
                    <div className="rounded bg-[#0A2540] border border-[#1E5680] text-center py-1 text-[#BAE6FD] font-bold">
                      {prevStNum}
                    </div>
                    <div className="rounded bg-[#063A22] border border-[#22C55E] px-2.5 py-1 text-[#4ADE80] font-extrabold">
                      {currentStNum} ({isStatusDataset ? 'CB Status' : 'Trip'})
                    </div>
                  </div>
                </div>

                {/* sqNum Row */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-[#8BB3D4]">sqNum</span>
                  <div className="flex items-center justify-between gap-1 bg-[#031222] border border-[#123952] rounded px-2 py-1 overflow-x-auto">
                    {['...', '127', '128', '129', '130'].map((n) => (
                      <span key={n} className="text-[#7B9BB8]">{n}</span>
                    ))}
                    <span className="text-[#FACC15] font-extrabold">|</span>
                    {Array.from({ length: 13 }, (_, i) => i).map((n) => (
                      <span
                        key={n}
                        className={`px-1 rounded ${
                          n === simSqNum % 13 ? 'bg-[#22C55E] text-[#02101F] font-extrabold' : 'text-[#DCEEFB]'
                        }`}
                      >
                        {n}
                      </span>
                    ))}
                  </div>
                </div>

                {/* GOOSE Tx Retransmission Pulse Line */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2">
                  <span className="text-[#8BB3D4]">GOOSE Tx</span>
                  <svg viewBox="0 0 500 26" className="w-full h-6">
                    <line x1="0" y1="13" x2="494" y2="13" stroke="#1E4E74" strokeWidth="1.5" />
                    <line x1="128" y1="0" x2="128" y2="26" stroke="#FACC15" strokeWidth="1.5" strokeDasharray="3 2" />
                    {[20, 48, 76, 104, 134, 146, 162, 184, 212, 248, 290, 340, 396, 456].map((x, idx) => (
                      <rect
                        key={x}
                        x={x}
                        y="5"
                        width="4"
                        height="16"
                        rx="1.5"
                        fill={idx >= 4 ? (publishingActive ? '#22C55E' : '#EF4444') : '#00DFFF'}
                      />
                    ))}
                  </svg>
                </div>

                {/* t (ms) Axis */}
                <div className="grid grid-cols-[62px_minmax(0,1fr)] items-center gap-2 text-[9.5px] text-[#8BB3D4]">
                  <span>t (ms)</span>
                  <div className="flex justify-between">
                    {['-50', '0', '50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '1000'].map((t) => (
                      <span key={t}>{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Right: Subscriber Response (Current State) */}
            <div className="rounded-xl border border-[#0E6A94] bg-[#041626] overflow-hidden shadow-lg">
              <div className="px-3 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] to-[#041829]">
                <span className="font-extrabold text-white flex items-center gap-1.5">
                  <Network className="w-3.5 h-3.5 text-[#00DFFF]" />
                  Subscriber Response (Current State)
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-[#082238] text-[#9ED8F6] border-b border-[#164463]">
                      <th className="py-1.5 px-3">IED</th>
                      <th className="py-1.5 px-2">Subscription</th>
                      <th className="py-1.5 px-2">Packet Rx</th>
                      <th className="py-1.5 px-2">Accept</th>
                      <th className="py-1.5 px-2">{isStatusDataset ? 'Input (CB Status)' : 'Input (Trip)'}</th>
                      <th className="py-1.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="font-mono">
                    {evaluatedNodes.map((n) => (
                      <tr key={n.iedId} className="border-b border-[#123952] last:border-b-0 hover:bg-[#072035]">
                        <td className="py-2 px-3 font-bold text-white">{n.iedName}</td>
                        <td className="py-2 px-2">
                          <span className={n.subscribed ? 'text-[#4ADE80] font-bold' : 'text-[#F87171]'}>
                            {n.subscribed ? '✓ Yes' : '✕ No'}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-[#BAE6FD]">{n.rxCount.toLocaleString()}</td>
                        <td className="py-2 px-2">
                          <span className={n.accepted ? 'text-[#38BDF8] font-bold' : 'text-[#94A3B8]'}>
                            {n.accepted ? '✓ Yes' : '— No'}
                          </span>
                        </td>
                        <td className="py-2 px-2">
                          <span className={n.inputActive ? 'text-[#4ADE80] font-bold' : 'text-[#94A3B8]'}>
                            {isStatusDataset ? (n.accepted ? (n.inputActive ? 'CLOSED' : 'OPEN') : '—') : (n.inputActive ? 'TRUE (1)' : 'FALSE (0)')}
                          </span>
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className="font-extrabold"
                            style={{
                              color: n.accepted ? '#4ADE80' : n.subscribed ? '#F87171' : '#94A3B8',
                            }}
                          >
                            {n.statusLabel}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ENGINEERING & FAULT INJECTION TAB */}
      {(activeTab === 'ENGINEERING' || activeTab === 'DIAGNOSTICS') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />
              Fault Injection &amp; Diagnostics Controls
            </h3>
            <div className="space-y-2">
              {faultOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    if (!gocb) return;
                    setGooseMismatchFault(gocb.id, opt.value);
                    logEvent(`GOOSE Fault set to: ${opt.label}`, opt.value === 'NONE' ? 'INFO' : 'ERR');
                  }}
                  className="w-full text-left px-3 py-2 rounded-lg border font-mono text-xs transition flex justify-between items-center"
                  style={{
                    backgroundColor: faultMode === opt.value ? '#08324F' : '#031220',
                    borderColor: faultMode === opt.value ? '#00DFFF' : '#163D5E',
                    color: faultMode === opt.value ? '#FFFFFF' : '#B6D4EA',
                  }}
                >
                  <span>{opt.label}</span>
                  {faultMode === opt.value && <span className="text-[#4ADE80] font-extrabold">ACTIVE</span>}
                </button>
              ))}
              <label className="flex items-center justify-between px-3 py-2 rounded-lg border border-[#163D5E] bg-[#031220] cursor-pointer">
                <span>Subscriber Test Mode (LPHD1.Sim / Test Block)</span>
                <input
                  type="checkbox"
                  checked={testModeSub}
                  onChange={(e) => {
                    setTestModeSub(e.target.checked);
                    logEvent(`Subscriber Test Mode ${e.target.checked ? 'ENABLED' : 'DISABLED'}`, 'WARN');
                  }}
                  className="accent-[#00DFFF]"
                />
              </label>
            </div>
          </div>

          <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-2.5">
            <h3 className="text-sm font-extrabold text-white">Port-to-Port PRP Physical Mapping</h3>
            <div className="space-y-2 font-mono text-[10.5px]">
              {evaluatedNodes.map((n) => (
                <div key={n.iedId} className="p-2.5 rounded-lg bg-[#020E1B] border border-[#123952] space-y-1">
                  <div className="text-white font-bold">{n.iedName} ({n.vendorModel})</div>
                  <div className="text-[#38BDF8]">
                    LAN A: {publisherIed?.name}/{pubPortA.iedPort} → {pubPortA.swName}/{pubPortA.swPort} → {n.iedName}/{n.portA.iedPort}
                  </div>
                  <div className="text-[#E879F9]">
                    LAN B: {publisherIed?.name}/{pubPortB.iedPort} → {pubPortB.swName}/{pubPortB.swPort} → {n.iedName}/{n.portB.iedPort}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* PACKET ANALYZER TAB */}
      {activeTab === 'PACKET_ANALYZER' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white">IEC 61850-8-1 GOOSE Layer-2 Frame &amp; ASN.1 BER Dissector</h3>
          <pre className="p-3 rounded-lg bg-[#020C17] border border-[#164463] font-mono text-[11px] text-[#7DD3FC] overflow-x-auto leading-relaxed">
{`Ethernet II, Src: ${publisherIed?.macAddress || '00:1B:1B:61:85:10'}, Dst: ${gocb?.multicastMac || '01-0C-CD-01-00-01'} (IEC 61850 GOOSE Multicast)
802.1Q Virtual LAN, PRI: ${gocb?.vlanPriority ?? 4}, DEI: 0, ID: ${gocb?.vlanId ?? 101}
Type: IEC 61850/GOOSE (0x88b8)
GOOSE Header:
  APPID: ${gocb?.appId || '0x0001'} | Length: 142 bytes | Reserved1: 0x0000 | Reserved2: 0x0000
goosePdu:
  gocbRef: ${gocb?.gocbRef}
  timeAllowedtoLive: ${gocb?.timeAllowedToLiveMs ?? 2000} ms
  datSet: ${gocb?.datSet}
  goID: ${goIdStr}
  t: ${new Date().toISOString()}
  stNum: ${currentStNum} | sqNum: ${simSqNum} | simulation: ${testModeSub} | confRev: ${gocb?.confRev ?? 1} | ndsCom: ${faultMode === 'CONFREV_MISMATCH'}
  numDatSetEntries: ${datasetEntries ?? '—'}`}
          </pre>
        </div>
      )}

      {/* EVENT TIMELINE TAB */}
      {activeTab === 'EVENT_TIMELINE' && (
        <div className="rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-2">
          <h3 className="text-sm font-extrabold text-white">GOOSE Lab Real-Time Event Timeline</h3>
          <div className="space-y-1.5 font-mono text-[11px]">
            {events.map((ev, i) => (
              <div key={i} className="flex gap-3 border-b border-[#123952] pb-1.5">
                <span className="text-[#7DD3FC] shrink-0">{ev.time}</span>
                <span className={ev.severity === 'ERR' ? 'text-[#FCA5A5]' : ev.severity === 'WARN' ? 'text-[#FDE68A]' : 'text-[#DCEEFB]'}>
                  {ev.detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
