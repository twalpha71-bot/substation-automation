import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import type { SignalChainFaultMode, IedFaultScenario, IedFaultInjection } from '../simulation/signalChainFaults';
export type { SignalChainFaultMode } from '../simulation/signalChainFaults';

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
  sourceDisplayVal?: string;
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
  /** Configured fast-message demo delay in milliseconds. */
  gooseTransferLatencyMs?: number;
  networkRedundancyMode: NetworkRedundancyMode;
  tracedPoint?: InstantiatedSasSignal;
  chainFaultMode: SignalChainFaultMode;
  faultModeByBay?: Partial<Record<string, SignalChainFaultMode>>;
  faultScenarios?: IedFaultScenario[];
  activeFault?: IedFaultInjection;
  faultsByIed?: Record<string, IedFaultInjection>;
  setChainFaultMode: (modeOrId: string) => void;
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

type FlowPosition = { x: number; y: number };
type PrpLan = 'A' | 'B';
type FlowLeg = {
  path: string;
  parallelPath?: string;
  lan?: PrpLan;
  label: string;
  color: string;
  duration: number;
  stop?: boolean;
  endFraction?: number;
};

const FLOW_SPEEDS = [0.25, 0.5, 0.75, 1, 2, 4] as const;
const DEFAULT_FLOW_SPEED = FLOW_SPEEDS[0];
type FlowSpeed = (typeof FLOW_SPEEDS)[number];

const LAN_COLORS: Record<PrpLan, string> = { A: '#7DD3FC', B: '#E879F9' };

const PRP_FRAME_SOURCE = '02:00:00:00:00:01'; // Simulated gateway source MAC
const PRP_FAST_MS = 1250;
const PRP_SLOW_MS = 2000;
const RECEIVER_HOLD_MS = 1000;

function buildPrpArrivals(sequence: number, lanAUp: boolean, lanBUp: boolean) {
  const firstLan: PrpLan = sequence % 2 === 0 ? 'A' : 'B';
  const frames = (['A', 'B'] as const)
    .filter((lan) => (lan === 'A' ? lanAUp : lanBUp))
    .map((lan) => ({
      lan,
      sequence,
      sourceMac: PRP_FRAME_SOURCE,
      arrival: lan === firstLan ? PRP_FAST_MS : PRP_SLOW_MS,
    }))
    .sort((a, b) => a.arrival - b.arrival);

  // Receiver history for the current simulated pair. Only frames on working LANs arrive.
  const seen = new Set<string>();
  return frames.map((frame) => {
    const key = frame.sourceMac + '/' + frame.sequence;
    const duplicate = seen.has(key);
    seen.add(key);
    return { ...frame, duplicate };
  });
}

interface SignalFlowOverlayProps {
  legs: FlowLeg[];
  playing: boolean;
  speed: FlowSpeed;
  lanAUp: boolean;
  lanBUp: boolean;
  isPrp: boolean;
  tagMismatch: boolean;
  mappedValue: string;
  receiver: FlowPosition;
  receiverPorts: Record<PrpLan, FlowPosition>;
  trayBottom: number;
  width: number;
  allocateSequence: () => number;
}

function SignalFlowOverlay({
  legs, playing, speed, lanAUp, lanBUp, isPrp, tagMismatch,
  mappedValue, receiver, receiverPorts, trayBottom, width, allocateSequence,
}: SignalFlowOverlayProps) {
  const layer = useRef<SVGGElement>(null);
  const current = useRef({ elapsed: 0, sequence: -1 });
  const [frame, setFrame] = useState(current.current);
  const pickupTime = legs.reduce((duration, leg) => duration + leg.duration, 0);
  const blocked = Boolean(legs[legs.length - 1].stop);
  const networkTime = isPrp ? PRP_SLOW_MS : PRP_FAST_MS;
  const cycleTime = pickupTime + (blocked ? 0 : networkTime + RECEIVER_HOLD_MS);

  useEffect(() => {
    if (current.current.sequence < 0) {
      current.current = { elapsed: 0, sequence: allocateSequence() };
      setFrame(current.current);
    }
    if (!playing) return;

    let request: number;
    let previous: number | undefined;
    function tick(now: number) {
      const delta = previous === undefined ? 0 : Math.min(now - previous, 64);
      previous = now;
      const elapsed = current.current.elapsed + delta * speed;
      current.current = elapsed >= cycleTime
        ? blocked
          ? { ...current.current, elapsed: cycleTime }
          : { elapsed: 0, sequence: allocateSequence() }
        : { ...current.current, elapsed };
      setFrame(current.current);
      if (!blocked || elapsed < cycleTime) request = requestAnimationFrame(tick);
    }
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [allocateSequence, blocked, cycleTime, playing, speed]);

  function cablePoint(pathId: string, fraction: number): FlowPosition | undefined {
    const path = layer.current?.ownerSVGElement?.querySelector<SVGPathElement>('#' + pathId);
    return path?.getPointAtLength(path.getTotalLength() * Math.max(0, Math.min(1, fraction)));
  }

  function pill(point: FlowPosition, label: string, color: string, lan?: PrpLan) {
    const w = label.length * 5.5 + 16;
    const x = Math.max(w / 2 + 3, Math.min(width - w / 2 - 3, point.x));
    return (
      <g data-flow-badge-lan={lan} transform={'translate(' + x + ' ' + point.y + ')'}>
        <rect x={-w / 2} y={-9} width={w} height="18" rx="8" fill="#041525" stroke={color} />
        <text y="3" textAnchor="middle" fill={color} fontSize="9" fontWeight="800" fontFamily="monospace">{label}</text>
      </g>
    );
  }

  function laneBadge(point: FlowPosition, lan: PrpLan, label: string) {
    // Track the packet horizontally on two rows above the cable tray.
    const y = trayBottom - (lan === 'A' ? 72 : 50);
    return pill({ x: point.x, y }, `LAN-${lan} · ${label}`, LAN_COLORS[lan], lan);
  }

  let legStart = 0;
  const activeLeg = legs.find((leg) => {
    if (frame.elapsed < legStart + leg.duration || leg.stop) return true;
    legStart += leg.duration;
    return false;
  });
  const legProgress = activeLeg
    ? Math.min((frame.elapsed - legStart) / activeLeg.duration, activeLeg.endFraction ?? 1)
    : 0;
  const legPosition = activeLeg ? cablePoint(activeLeg.path, legProgress) : undefined;
  const parallelPosition = activeLeg?.parallelPath ? cablePoint(activeLeg.parallelPath, legProgress) : undefined;
  const launched = !activeLeg && frame.sequence >= 0;
  const networkElapsed = frame.elapsed - pickupTime;
  const copies = launched && isPrp ? buildPrpArrivals(frame.sequence, lanAUp, lanBUp) : [];
  const received = copies.filter((copy) => copy.arrival <= networkElapsed);
  const accepted = received.find((copy) => !copy.duplicate);
  const discarded = received.find((copy) => copy.duplicate);
  const singleLan = lanAUp ? 'A' : 'B';
  const singlePoint = launched && !isPrp && networkElapsed < PRP_FAST_MS
    ? cablePoint('cable-gtw-hmi-' + singleLan.toLowerCase(), networkElapsed / PRP_FAST_MS)
    : undefined;
  const delivered = isPrp ? Boolean(accepted) : launched && networkElapsed >= PRP_FAST_MS;
  const badgeX = receiver.x;
  const resultY = trayBottom + 29;

  return (
    <g ref={layer} data-signal-flow="" data-delivered={delivered ? 1 : 0}>
      {activeLeg && legPosition && (
        <g>
          <circle data-flow-path={activeLeg.path} cx={legPosition.x} cy={legPosition.y} r="4" fill={activeLeg.color} />
          {activeLeg.lan
            ? laneBadge(legPosition, activeLeg.lan, activeLeg.label)
            : pill({ x: legPosition.x, y: legPosition.y + 14 }, activeLeg.label, activeLeg.color)}
          {parallelPosition && (
            <>
              <circle data-flow-path={activeLeg.parallelPath} cx={parallelPosition.x} cy={parallelPosition.y}
                r="4" fill={LAN_COLORS.B} stroke="#041525" />
              {laneBadge(parallelPosition, 'B', activeLeg.label)}
            </>
          )}
        </g>
      )}
      {copies.filter((copy) => copy.arrival > networkElapsed).map((copy) => {
        const point = cablePoint('cable-gtw-hmi-' + copy.lan.toLowerCase(), networkElapsed / copy.arrival);
        return point && (
          <g key={copy.lan}>
            <circle data-prp-lan={copy.lan} cx={point.x} cy={point.y}
              r="4" fill={LAN_COLORS[copy.lan]} stroke="#041525" />
            {laneBadge(point, copy.lan, `SCADA · SEQ ${copy.sequence}`)}
          </g>
        );
      })}
      {singlePoint && (
        <g>
          <circle cx={singlePoint.x} cy={singlePoint.y} r="4" fill={LAN_COLORS[singleLan]} />
          {laneBadge(singlePoint, singleLan, 'SCADA UPDATE')}
        </g>
      )}
      {received.map((copy) => {
        const age = (networkElapsed - copy.arrival) / 420;
        const port = receiverPorts[copy.lan];
        return age < 1 && (
          <circle key={copy.lan} cx={port.x} cy={port.y} r={4 + age * 9} fill="none"
            stroke={copy.duplicate ? '#FCA5A5' : '#86EFAC'} strokeWidth="2" opacity={1 - age} />
        );
      })}
      {launched && isPrp && (
        <g aria-label="SCADA receiver LRE">
          {pill({ x: badgeX, y: trayBottom + 8 },
            'SCADA LRE · SRC ' + PRP_FRAME_SOURCE + ' · SEQ ' + frame.sequence, '#BAE6FD')}
          {accepted
            ? pill({ x: badgeX, y: resultY }, 'LAN ' + accepted.lan + ' · ACCEPTED · 1 FRAME TO SCADA', '#86EFAC')
            : pill({ x: badgeX, y: resultY }, 'WAITING FOR FIRST VALID COPY', '#7DD3FC')}
          {discarded
            ? pill({ x: badgeX, y: resultY + 20 }, 'LAN ' + discarded.lan + ' · DUPLICATE DISCARDED', '#FCA5A5')
            : (!lanAUp || !lanBUp) && pill({ x: badgeX, y: resultY + 20 },
              'LAN ' + (lanAUp ? 'B' : 'A') + ' DOWN · NO COPY', '#FDE68A')}
        </g>
      )}
      {delivered && (
        <g>
          <circle cx={receiver.x} cy={receiver.y} r="4" fill={tagMismatch ? '#FCA5A5' : '#86EFAC'} />
          {pill({ x: receiver.x, y: receiver.y - 15 },
            tagMismatch ? 'HMI TAG MISMATCH' : mappedValue, tagMismatch ? '#FCA5A5' : '#86EFAC')}
        </g>
      )}
    </g>
  );
}

type GooseDemoValue = BayEquipment['breakerState'] | 'ASSERTED' | 'RESET';

interface GooseDemoFrame {
  inputHealthy: boolean;
  position: GooseDemoValue;
  stNum: number;
  sqNum: number;
  lans: Record<PrpLan, boolean>;
}

type GooseRxState = 'WAITING' | 'HEALTHY' | 'INVALID / TIMEOUT' | 'INVALID / QUALITY';

interface GooseDemoProps {
  block: GooseControlBlock;
  position: GooseDemoValue;
  showTrip: boolean;
  visible: boolean;
  inputHealthy: boolean;
  enabled: boolean;
  lanAUp: boolean;
  lanBUp: boolean;
  isPrp: boolean;
  playing: boolean;
  speed: FlowSpeed;
  transferLatencyMs: number;
  switchOutputs: Record<PrpLan, FlowPosition>;
  branchY: number;
  peers: MultiVendorIed[];
  onRxStatusChange?: (blockId: string, status: GooseRxState) => void;
}

const GOOSE_DEFAULT_TRANSFER_MS = 3;
const GOOSE_LAN_B_OFFSET_MS = 1;
const GOOSE_TRAVEL_MS: Record<PrpLan, number> = { A: 1080, B: 1200 };
const GOOSE_LAN_COLORS: Record<PrpLan, string> = { A: '#38BDF8', B: '#C084FC' };
const GOOSE_RECEIPT_HOLD_MS = 240;

function GoosePositionDemo({
  block, position, showTrip, visible, inputHealthy, enabled, lanAUp, lanBUp, isPrp, playing, speed, transferLatencyMs,
  switchOutputs, branchY, peers, onRxStatusChange,
}: GooseDemoProps) {
  const layer = useRef<SVGGElement>(null);
  const publisher = useRef({
    position, inputHealthy, stNum: block.stNum, nextSqNum: block.sqNum, retryInterval: block.maxTimeMs,
  });
  const published = useRef<GooseDemoFrame | null>(null);
  const lastReceipt = useRef<{ frame: GooseDemoFrame; lan: PrpLan; at: number } | null>(null);
  const startedAt = useRef<number | null>(null);
  const [rx, setRx] = useState<{ receipt: typeof lastReceipt.current; expired: boolean; duplicateLan?: PrpLan }>({
    receipt: null, expired: false,
  });
  const ttlMs = Math.max(1, block.timeAllowedToLiveMs);
  const minTimeMs = Math.max(1, block.minTimeMs);
  const maxTimeMs = Math.max(minTimeMs, block.maxTimeMs);

  // Transport, retransmissions and expiry run even while the drawing is paused.
  useEffect(() => {
    const start = startedAt.current ??= performance.now();
    const state = publisher.current;
    if ((inputHealthy && state.position !== position) || state.inputHealthy !== inputHealthy) {
      if (inputHealthy) state.position = position;
      state.inputHealthy = inputHealthy;
      state.stNum++;
      state.nextSqNum = 0;
      state.retryInterval = minTimeMs;
    }
    let publishTimer: number | undefined;
    let expiryTimer: number;
    const arrivals = new Set<number>();

    const scheduleExpiry = () => {
      window.clearTimeout(expiryTimer);
      const remaining = ttlMs - (performance.now() - (lastReceipt.current?.at ?? start));
      if (remaining <= 0) {
        setRx({ receipt: lastReceipt.current, expired: true });
      } else {
        expiryTimer = window.setTimeout(scheduleExpiry, Math.ceil(remaining));
      }
    };

    const publish = () => {
      const frame = {
        position: state.position, inputHealthy: state.inputHealthy, stNum: state.stNum, sqNum: state.nextSqNum++,
        lans: { A: lanAUp, B: lanBUp },
      };
      published.current = frame;

      for (const lan of ['A', 'B'] as const) {
        if (!frame.lans[lan]) continue;
        const delay = transferLatencyMs + (lan === 'B' ? GOOSE_LAN_B_OFFSET_MS : 0);
        const arrival = window.setTimeout(() => {
          arrivals.delete(arrival);
          // PRP copies have the same publisher and frame identity. Late copies
          // and older frames cannot update the receivers or refresh their TTL.
          const previous = lastReceipt.current?.frame;
          if (previous === frame) {
            setRx(current => current.receipt?.frame === frame ? { ...current, duplicateLan: lan } : current);
            return;
          }
          if (previous && (previous.stNum > frame.stNum ||
              (previous.stNum === frame.stNum && previous.sqNum >= frame.sqNum))) return;
          const receipt = { frame, lan, at: performance.now() };
          lastReceipt.current = receipt;
          setRx({ receipt, expired: false });
          scheduleExpiry();
        }, delay);
        arrivals.add(arrival);
      }

      const retry = Math.min(maxTimeMs, state.retryInterval);
      state.retryInterval = Math.min(maxTimeMs, retry * 2);
      publishTimer = window.setTimeout(publish, retry);
    };

    scheduleExpiry();
    if (enabled && (lanAUp || lanBUp)) publish();
    return () => {
      window.clearTimeout(publishTimer);
      window.clearTimeout(expiryTimer);
      arrivals.forEach((arrival) => window.clearTimeout(arrival));
    };
  }, [position, inputHealthy, enabled, lanAUp, lanBUp, transferLatencyMs, ttlMs, minTimeMs, maxTimeMs]);

  type VisualFlight = GooseDemoFrame & { sentAt: number };
  const visual = useRef({
    now: 0,
    flight: null as VisualFlight | null,
    lastAnimated: null as GooseDemoFrame | null,
    showReceiptUntil: 0,
  });
  const [view, setView] = useState(() => ({ ...visual.current }));

  useEffect(() => {
    const state = visual.current;
    if (state.flight) {
      const lans = {
        A: state.flight.lans.A && enabled && lanAUp,
        B: state.flight.lans.B && enabled && lanBUp,
      };
      state.flight = lans.A || lans.B ? { ...state.flight, lans } : null;
      setView({ ...state });
    }
    if (!playing || !visible) return;

    let request: number;
    let previous: number | undefined;
    const tick = (timestamp: number) => {
      state.now += previous === undefined ? 0 : Math.min(timestamp - previous, 64) * speed;
      previous = timestamp;
      if (state.flight) {
        const duration = state.flight.lans.B ? GOOSE_TRAVEL_MS.B : GOOSE_TRAVEL_MS.A;
        if (state.now - state.flight.sentAt >= duration) {
          state.flight = null;
          state.showReceiptUntil = state.now + GOOSE_RECEIPT_HOLD_MS;
        }
      }
      const frame = published.current;
      if (enabled && frame && frame !== state.lastAnimated && !state.flight && state.now >= state.showReceiptUntil) {
        const lans = { A: frame.lans.A && lanAUp, B: frame.lans.B && lanBUp };
        if (lans.A || lans.B) {
          state.flight = { ...frame, lans, sentAt: state.now };
          state.lastAnimated = frame;
        }
      }
      setView({ ...state });
      request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [enabled, lanAUp, lanBUp, playing, speed, visible]);

  const { receipt, expired, duplicateLan } = rx;
  const received = receipt?.frame;
  const rxState: GooseRxState = expired ? 'INVALID / TIMEOUT' : received ? received.inputHealthy ? 'HEALTHY' : 'INVALID / QUALITY' : 'WAITING';
  useEffect(() => {
    onRxStatusChange?.(block.id, rxState);
  }, [block.id, onRxStatusChange, rxState]);

  if (!visible) return null;

  const status = expired ? 'GOOSE TIMEOUT' : received ? received.inputHealthy ? 'GOOSE RX ✓' : 'GOOSE QUALITY INVALID' : 'WAITING FOR GOOSE';
  const payloadLabel = showTrip ? 'Protection Trip' : 'CB';
  const color = expired || received?.inputHealthy === false ? '#FCA5A5' : received ? '#86EFAC' : '#BAE6FD';
  const lans: PrpLan[] = isPrp || lanBUp ? ['A', 'B'] : ['A'];
  const liveLans = { A: lanAUp, B: lanBUp };
  const deviceSpacing = 226;
  const headerWidth = 178;
  const imageWidth = 174;
  const imageHeight = 148;
  const imageY = branchY + 76;
  const headerY = imageY + 45;
  const portY = imageY + 2;
  const labelY = imageY + imageHeight + 20;
  const centerX = (switchOutputs.A.x + switchOutputs.B.x) / 2;
  const age = view.flight ? view.now - view.flight.sentAt : 0;

  const lanColor = (lan: PrpLan) => liveLans[lan] ? GOOSE_LAN_COLORS[lan] : '#F87171';
  const packetPoint = (pathId: string, fraction: number) => {
    const path = layer.current?.ownerSVGElement?.querySelector<SVGPathElement>('#' + pathId);
    return path?.getPointAtLength(path.getTotalLength() * fraction);
  };

  const packetBadge = (lan: PrpLan, point: FlowPosition, y: number) => (
    <g data-goose-packet-badge={lan} transform={`translate(${point.x} ${y})`}>
      <rect x="-58" y="-8" width="116" height="16" rx="7" fill="#061C30" stroke={GOOSE_LAN_COLORS[lan]} />
      <text y="3" textAnchor="middle" fill="#E0F2FE" fontSize="8.5" fontWeight="700" fontFamily="monospace">
        {`GOOSE · LAN-${lan} · ${view.flight?.sqNum}`}
      </text>
    </g>
  );

  return (
    <g ref={layer} data-goose-position-demo="" data-goose-accepted-lan={receipt?.lan} data-goose-discarded-lan={duplicateLan}>
      {lans.map((lan) => {
        const output = switchOutputs[lan];
        const flying = view.flight?.lans[lan] && age < GOOSE_TRAVEL_MS[lan] * 0.34;
        const ingress = flying ? packetPoint('cable-ied-' + lan.toLowerCase(), age / (GOOSE_TRAVEL_MS[lan] * 0.34)) : undefined;
        return (
          <g key={lan}>
            <rect x={output.x - 4} y={output.y - 4} width="8" height="8" rx="2"
              fill="#062139" stroke={lanColor(lan)} />
            {ingress && (
              <>
                <circle cx={ingress.x} cy={ingress.y - 4} r="3.5" fill={GOOSE_LAN_COLORS[lan]} stroke="#E0F2FE" />
                {packetBadge(lan, ingress, branchY - (lan === 'A' ? 103 : 45))}
              </>
            )}
          </g>
        );
      })}
      {peers.map((peer, index) => {
        const x = centerX + (index - (peers.length - 1) / 2) * deviceSpacing;
        const image = getIedImageByModel(peer.vendor, peer.model);
        // Details sit outside the relay pair, leaving the cable and port area clear.
        const detailsSide = index < peers.length / 2 ? -1 : 1;
        const detailsX = x + detailsSide * (imageWidth / 2 + 13 + headerWidth / 2);
        return (
          <g key={peer.id} data-goose-peer={peer.id}>
            <title>{block.extRefs.filter(ref => ref.bound && ref.subscriberIedId === peer.id)
              .map(ref => `${ref.srcRef} → ${ref.intAddr}`).join(' · ') || block.gocbRef}</title>
            <image href={image} x={x - imageWidth / 2} y={imageY}
              width={imageWidth} height={imageHeight} preserveAspectRatio="xMidYMin meet"
              style={{ filter: 'drop-shadow(0 7px 8px rgba(0, 0, 0, 0.55))' }}
            />
            {lans.map((lan) => {
              const output = switchOutputs[lan];
              const side = lan === 'A' ? -1 : 1;
              const portX = x + side * 23;
              const sideX = x + side * 99;
              const bendY = branchY + (lan === 'B' ? 18 : 0);
              const pathId = `goose-status-demo-${peer.id}-${lan}`;
              const path = `M ${output.x} ${output.y + 4} V ${bendY} H ${sideX} V ${imageY - 16} H ${portX} V ${portY}`;
              const fraction = (age / GOOSE_TRAVEL_MS[lan] - 0.34) / 0.66;
              const point = view.flight?.lans[lan] && fraction >= 0 && fraction < 1
                ? packetPoint(pathId, fraction) : undefined;
              const stroke = lanColor(lan);
              return (
                <g key={lan}>
                  <path d={path} fill="none" stroke="#10324B" strokeWidth="5" />
                  <path id={pathId} d={path} fill="none" stroke={stroke} strokeWidth="2.1"
                    strokeDasharray="5 4" strokeLinejoin="round" />
                  <g data-goose-rx-port={`${peer.id}/${lan}`} transform={`translate(${portX} ${portY})`}>
                    <title>{`${peer.id} ETH-${lan} · GOOSE Layer-2 subscriber`}</title>
                    <rect x="-7" y="-6" width="14" height="12" rx="2.5" fill="#04243B" stroke={stroke} strokeWidth="1.6" />
                    <path d="M -3 0 H 3" stroke={stroke} strokeWidth="1.4" />
                    <text x="0" y="-9" textAnchor="middle" fill={stroke} fontSize="7.5" fontWeight="800">{`ETH-${lan}`}</text>
                  </g>
                  {point && (
                    <>
                      <circle cx={point.x} cy={point.y} r="4" fill={GOOSE_LAN_COLORS[lan]} stroke="#E0F2FE" />
                      {(lan === 'A' ? index === 0 : index === peers.length - 1) &&
                        packetBadge(lan, point, branchY + (lan === 'A' ? 31 : 50))}
                    </>
                  )}
                </g>
              );
            })}
            <rect x={detailsX - headerWidth / 2} y={headerY} width={headerWidth} height="53" rx="9"
              fill="#052035" stroke="#00DFFF" />
            <text x={detailsX} y={headerY + 16} textAnchor="middle" fill="#F8FAFC" fontSize="12" fontWeight="800">{peer.id}</text>
            <text x={detailsX} y={headerY + 31} textAnchor="middle" fill="#BAE6FD" fontSize="10">{peer.model}</text>
            <text x={detailsX} y={headerY + 45} textAnchor="middle" fill="#7DD3FC" fontSize="8" fontFamily="monospace">
              {isPrp ? `A ${peer.ipAddressLanA} · B ${peer.ipAddressLanB}` : peer.ipAddressLanA}
            </text>
            <text x={x} y={labelY} textAnchor="middle" fill={color} fontSize="11" fontWeight="800">{status}</text>
            <text x={x} y={labelY + 15} textAnchor="middle" fill={color} fontSize="10">
              {received ? `${expired ? 'Last' : 'Remote'} ${payloadLabel} = ${received.position}` : `Remote ${payloadLabel} = —`}
            </text>
            <text x={x} y={labelY + 29} textAnchor="middle" fill="#BAE6FD" fontSize="9" fontFamily="monospace">
              {received ? `stNum ${received.stNum} · sqNum ${received.sqNum}` : 'Status input'}
            </text>
            {receipt && !expired && <text x={x} y={labelY + 42} textAnchor="middle" fill="#7DD3FC" fontSize="8" fontFamily="monospace">
              {duplicateLan ? `LAN ${receipt.lan} accepted · LAN ${duplicateLan} duplicate discarded` : `LAN ${receipt.lan} accepted`}
            </text>}
          </g>
        );
      })}
      <g transform={`translate(${centerX - 130} ${branchY - 15})`}>
        <rect x="-256" y="-10" width="256" height="20" rx="7" fill="#04243B" stroke="#38BDF8" />
        <text x="-128" y="3.5" textAnchor="middle" fill="#BAE6FD" fontSize="9" fontFamily="monospace">
          {enabled && view.flight
            ? `GOOSE · ${payloadLabel} ${view.flight.position} · stNum ${view.flight.stNum} · sqNum ${view.flight.sqNum}`
            : enabled && received && view.now < view.showReceiptUntil
              ? `GOOSE RX · ${payloadLabel} ${received.position} · stNum ${received.stNum} · sqNum ${received.sqNum}`
              : `GOOSE L2 multicast · APPID ${block.appId} · VLAN ${block.vlanId}`}
        </text>
      </g>
    </g>
  );
}

export const SignalChainDashboard: React.FC<SignalChainDashboardProps> = ({
  activeChain,
  ied,
  ieds,
  bays,
  onSelectBay,
  networkLinks,
  gooseControlBlocks,
  gooseTransferLatencyMs = GOOSE_DEFAULT_TRANSFER_MS,
  networkRedundancyMode,
  chainFaultMode,
  faultModeByBay,
  faultScenarios,
  activeFault,
  faultsByIed,
  tracedPoint,
  setChainFaultMode,
  selectedStageIndex,
  setSelectedStageIndex,
  liveClockStr,
  onToggleBreaker,
  onTriggerTrip,
  onResetTrip,
}) => {
  const { bay } = activeChain;
  const gooseDelayMs = Number.isFinite(gooseTransferLatencyMs)
    ? Math.max(1, gooseTransferLatencyMs) : GOOSE_DEFAULT_TRANSFER_MS;
  const nextPrpSequence = useRef(1024);
  const allocateSequence = useCallback(() => {
    const sequence = nextPrpSequence.current;
    nextPrpSequence.current = (sequence + 1) % 65536;
    return sequence;
  }, []);
  const [flowRevision, setFlowRevision] = useState(0);
  const [checkedTroubleshootSteps, setCheckedTroubleshootSteps] = useState<Record<number, boolean>>({});
  const [troubleshootExpanded, setTroubleshootExpanded] = useState<boolean>(true);
  useEffect(() => {
    setCheckedTroubleshootSteps({});
    if (activeFault) setTroubleshootExpanded(true);
  }, [activeFault?.scenario.id, bay.id]);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const sceneOuterRef = useRef<HTMLDivElement | null>(null);
  const diagramWrapRef = useRef<HTMLDivElement | null>(null);
  const [fitToScreen, setFitToScreen] = useState<boolean>(true);
  const [fitScale, setFitScale] = useState<number>(1);
  const [isCompactViewport, setIsCompactViewport] = useState<boolean>(false);
  const portRefs = useRef<Record<string, HTMLSpanElement | null>>({});
  const setPortRef = (id: string) => (el: HTMLSpanElement | null) => {
    portRefs.current[id] = el;
  };
  const [diagSize, setDiagSize] = useState<{ w: number; h: number }>({ w: 1200, h: 375 });
  const [portCoords, setPortCoords] = useState<Record<string, { x: number; y: number }>>({});
  const [imgLoadTick, setImgLoadTick] = useState<number>(0);


  // Animation engine state (visual pause/resume does NOT stop underlying store simulation)
  const [playing, setPlaying] = useState<boolean>(true);
  const [speed, setSpeed] = useState<FlowSpeed>(DEFAULT_FLOW_SPEED);

  // Independent PRP & Fault Simulation toggles preserved per bay in sessionStorage
  const NET_FAULTS_STORAGE_KEY = 'sas_signal_chain_net_faults_v1';
  const [netFaultsByBay, setNetFaultsByBay] = useState<
    Record<string, { lanA: boolean; lanB: boolean; trip: boolean }>
  >(() => {
    try {
      const raw = window.sessionStorage.getItem(NET_FAULTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Ignore storage read errors
    }
    return {};
  });
  useEffect(() => {
    try {
      if (Object.keys(netFaultsByBay).length > 0) {
        window.sessionStorage.setItem(NET_FAULTS_STORAGE_KEY, JSON.stringify(netFaultsByBay));
      } else {
        window.sessionStorage.removeItem(NET_FAULTS_STORAGE_KEY);
      }
    } catch {
      // Ignore storage write errors
    }
  }, [netFaultsByBay]);
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
      { time: t, detail: `MMS: ${activeChain.reportCbName} · GOOSE: ${activeChain.gooseCbName}`, severity: 'INFO' },
      { time: t, detail: `SCADA/HMI updated — ${bay.bayCode} Breaker = ${bay.breakerState}`, severity: 'INFO' },
    ];
  });

  // Keep a transport instance mounted for every configured publisher while switching bays.
  const linksByIed = useMemo(() => {
    const map = new Map<string, NetworkLink[]>();
    for (const link of networkLinks) {
      for (const id of [link.sourceId, link.targetId]) {
        const links = map.get(id) ?? [];
        links.push(link);
        map.set(id, links);
      }
    }
    return map;
  }, [networkLinks]);
  const blocksByIed = useMemo(() => {
    const map = new Map<string, GooseControlBlock>();
    for (const block of gooseControlBlocks) {
      if (block.subscriberIedIds.length && !map.has(block.publisherIedId)) map.set(block.publisherIedId, block);
    }
    return map;
  }, [gooseControlBlocks]);
  const primaryGoose = blocksByIed.get(bay.iedId);
  const getLanState = (publisher: BayEquipment) => {
    const links = linksByIed.get(publisher.iedId) ?? [];
    const faults = netFaultsByBay[publisher.id];
    const iedOnline = publisher.quality !== 'INVALID';
    return {
      A: iedOnline && !faults?.lanA && links.find(link => link.lanPlane === 'LAN_A')?.status !== 'DOWN',
      B: iedOnline && !faults?.lanB && networkRedundancyMode !== 'SINGLE_LAN' &&
        links.find(link => link.lanPlane === 'LAN_B')?.status !== 'DOWN',
    };
  };
  const canPublishGoose = (block: GooseControlBlock, publisher: BayEquipment, mode: SignalChainFaultMode) => {
    const fault = faultsByIed?.[publisher.iedId]?.scenario;
    const blocked = fault ? (fault.mode === 'GOOSE_TIMEOUT' && fault.gooseBlockId === block.id) ||
      (fault.mode === 'DATASET_MISSING' && fault.dataset?.replace(/\$/g, '.') === block.datSet.replace(/\$/g, '.'))
      : !faultsByIed && (mode === 'GOOSE_TIMEOUT' || mode === 'DATASET_MISSING');
    return block.healthy && publisher.quality !== 'INVALID' && !blocked;
  };

  const isSingleAttached = ied?.nodeType === 'REDBOX_SAN';
  const isIedFailed = bay.quality === 'INVALID';
  const isDiFailed = chainFaultMode === 'DI_INPUT_FAIL' || !bay.dcSupplyHealthy;
  const isMmsLoss = chainFaultMode === 'MMS_DISCONNECT' || chainFaultMode === 'REPORT_DISABLED' || isIedFailed;
  const { A: lanAUp, B: lanBUp } = getLanState(bay);
  const anyLanUp = lanAUp || lanBUp;
  const redundancyDegraded = (lanAUp && !lanBUp) || (!lanAUp && lanBUp);

  const mmsHealthy = !isMmsLoss && anyLanUp && chainFaultMode !== 'DATASET_MISSING' && chainFaultMode !== 'WRONG_IEC_REF';
  const gooseDemos = bays.flatMap(publisher => {
    const block = blocksByIed.get(publisher.iedId);
    if (!block) return [];
    const peers = block.subscriberIedIds.flatMap(id => {
      const peer = ieds.find(candidate => candidate.id === id);
      return peer ? [peer] : [];
    });
    if (!peers.length) return [];
    const mode = publisher.id === bay.id ? chainFaultMode : faultModeByBay?.[publisher.id] ?? 'NONE';
    const available = getLanState(publisher);
    const links = linksByIed.get(publisher.iedId) ?? [];
    const hasVlan = (plane: 'LAN_A' | 'LAN_B') => links.some(link => link.lanPlane === plane && link.vlanList.includes(block.vlanId));
    const lans = { A: available.A && hasVlan('LAN_A'), B: available.B && hasVlan('LAN_B') };
    const injected = faultsByIed?.[publisher.iedId]?.scenario;
    const inputQualityFailed = !!injected && ['DI_INPUT_FAIL', 'BAD_QUALITY'].includes(injected.mode) &&
      block.extRefs.some(ref => ref.bound && injected.evidence === ref.srcRef);
    return [{ block, publisher, peers, mode, lans, inputQualityFailed, enabled: canPublishGoose(block, publisher, mode) && (lans.A || lans.B) }];
  });
  const selectedGoose = gooseDemos.find(demo => demo.publisher.id === bay.id);
  const showGooseDemo = !!selectedGoose;
  const gooseHealthy = selectedGoose?.enabled ?? false;
  const iec104Healthy = mmsHealthy;
  const mmsFaultMode = chainFaultMode === 'GOOSE_TIMEOUT' ? 'NONE' : chainFaultMode;
  const mmsDataGood = mmsHealthy && !isDiFailed && (tracedPoint?.quality ?? bay.quality) === 'GOOD' && mmsFaultMode === 'NONE';

  const isBreakerClosed = bay.breakerState === 'CLOSED';
  const contact52aOn = isBreakerClosed && !isDiFailed;
  const contact52bOn = bay.breakerState === 'OPEN' && !isDiFailed;

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
    const updateFitScale = () => {
      const outer = sceneOuterRef.current;
      if (!outer) return;
      const availW = Math.max(260, outer.clientWidth - 24);
      const compact = availW < 1140;
      setIsCompactViewport(compact);
      const nextScale = compact && fitToScreen ? Math.max(0.25, Math.min(1, availW / 1140)) : 1;
      setFitScale((prev) => (Math.abs(prev - nextScale) < 0.005 ? prev : nextScale));
    };
    const measurePorts = () => {
      updateFitScale();
      const wrap = diagramWrapRef.current;
      if (!wrap) return;
      const wr = wrap.getBoundingClientRect();
      const naturalW = wrap.offsetWidth || Math.round(wr.width);
      const naturalH = wrap.offsetHeight || Math.round(wr.height);
      if (naturalW < 100) return;
      const activeScale = wr.width > 0 && naturalW > 0 ? wr.width / naturalW : 1;
      const next: Record<string, { x: number; y: number }> = {};
      Object.entries(portRefs.current).forEach(([k, el]) => {
        if (!el) return;
        const r = el.getBoundingClientRect();
        next[k] = {
          x: (r.left - wr.left + r.width / 2) / activeScale,
          y: (r.top - wr.top + r.height / 2) / activeScale,
        };
      });
      setDiagSize((prev) => (prev.w === naturalW && prev.h === naturalH ? prev : { w: naturalW, h: naturalH }));
      setPortCoords((prev) => {
        const prevKeys = Object.keys(prev);
        const nextKeys = Object.keys(next);
        if (prevKeys.length !== nextKeys.length) return next;
        for (const k of nextKeys) {
          if (!prev[k] || Math.abs(prev[k].x - next[k].x) > 0.5 || Math.abs(prev[k].y - next[k].y) > 0.5) {
            return next;
          }
        }
        return prev;
      });
    };
    measurePorts();
    const t1 = window.setTimeout(measurePorts, 150);
    const t2 = window.setTimeout(measurePorts, 450);
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measurePorts) : null;
    if (ro && sceneOuterRef.current) ro.observe(sceneOuterRef.current);
    if (ro && diagramWrapRef.current) ro.observe(diagramWrapRef.current);
    window.addEventListener('resize', measurePorts);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro?.disconnect();
      window.removeEventListener('resize', measurePorts);
    };
  }, [bay.id, iedImageSrc, networkRedundancyMode, imgLoadTick, fitToScreen]);

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
          ? `Acquisition fault on ${activeChain.diChannelLabel} (INVALID)`
          : `DI module acquired ${activeChain.diChannelLabel} = ${contact52aOn ? '1' : '0'}`,
        severity: isDiFailed ? 'ERR' : 'INFO',
      },
      {
        time: formatMsTime(new Date(now + 6)),
        detail: `${activeChain.iedName} source ${activeChain.lnPart}.${activeChain.doPart}.${activeChain.daPart} = ${isDiFailed ? 'ACQUISITION INVALID' : activeChain.sourceDisplayVal ?? activeChain.displayVal}`,
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
          : `MMS (${mmsHealthy ? 'OK' : 'DOWN'}) / GOOSE (${gooseHealthy ? 'OK' : showGooseDemo ? 'BLOCKED' : 'NOT CONFIGURED'}) published`,
        severity: !anyLanUp || !mmsHealthy || (showGooseDemo && !gooseHealthy) ? 'WARN' : 'INFO',
      },
      {
        time: formatMsTime(new Date(now + 11)),
        detail: `SCADA/HMI ${mmsDataGood ? 'updated' : 'quality/stale indication'} — ${activeChain.row.signalName} = ${activeChain.displayVal} (${activeChain.overallQuality})`,
        severity: mmsFaultMode !== 'NONE' || !mmsHealthy ? 'WARN' : 'INFO',
      },
    ];
    setTimeline((prev) => [...newEntries.reverse(), ...prev].slice(0, 12));
  }, [
    bay.id,
    bay.breakerState,
    chainFaultMode,
    activeFault?.injectedAt,
    lanAFailed,
    lanBFailed,
    activeChain.lnPart,
    activeChain.doPart,
    activeChain.daPart,
  ]);

  // Increment simulated packet counters when playing and healthy
  useEffect(() => {
    if (!playing) return;
    const intervalMs = 1000 / speed;
    const id = window.setInterval(() => {
      setSimPackets((prev) => ({
        mms: mmsHealthy ? prev.mms + 10 : prev.mms,
        goose: gooseHealthy ? prev.goose + 120 : prev.goose,
        iec104: iec104Healthy ? prev.iec104 + 6 : prev.iec104,
      }));
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [playing, speed, mmsHealthy, gooseHealthy, iec104Healthy]);

  const handleReset = () => {
    setFlowRevision((revision) => revision + 1);
    setPlaying(true);
    setSpeed(DEFAULT_FLOW_SPEED);
    setLanAFailed(false);
    setLanBFailed(false);
    setInterlockTripActive(false);
    setChainFaultMode('NONE');
    setSimPackets({ mms: 1482, goose: 24892, iec104: 940 });
    setTimeline((prev) => [
      { time: formatMsTime(), detail: `Simulation reset — ${bay.bayCode} (${activeChain.iedName}); injected faults cleared, source state retained`, severity: 'INFO' },
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

  const goodStatus = { border: '#22C55E', text: '#4ADE80' };
  const warningStatus = { border: '#F59E0B', text: '#FBBF24' };
  const faultStatus = { border: '#FF5C65', text: '#FDA4AF' };
  const qualityBadgeColor =
    mmsFaultMode === 'MMS_DISCONNECT' || (!anyLanUp && !isIedFailed)
      ? { ...faultStatus, label: 'COMMUNICATION LOST' }
      : mmsDataGood
      ? { ...goodStatus, label: 'GOOD' }
      : (mmsHealthy && redundancyDegraded) || mmsFaultMode === 'BAD_QUALITY'
      ? { ...warningStatus, label: 'DEGRADED' }
      : { ...faultStatus, label: 'FAULT / INVALID' };

  const [demoGooseRx, setDemoGooseRx] = useState<Partial<Record<string, GooseRxState>>>({});
  const updateGooseRx = useCallback((blockId: string, status: GooseRxState) => {
    setDemoGooseRx(previous => previous[blockId] === status ? previous : { ...previous, [blockId]: status });
  }, []);
  const gooseRxLabel = selectedGoose ? demoGooseRx[selectedGoose.block.id] ?? 'WAITING' : 'NOT CONFIGURED';
  const gooseRxColor = gooseRxLabel === 'HEALTHY' ? goodStatus
    : gooseRxLabel.startsWith('INVALID') ? faultStatus : warningStatus;

  return (
    <div className="space-y-3">
      {/* Top Signal Chain Header Bar matching Reference */}
      <div
        className="sas-signal-chain-summary rounded-xl border px-2.5 sm:px-4 py-2 sm:py-2.5 flex flex-wrap items-center justify-between gap-2 sm:gap-3"
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
          <label className="sas-signal-bay-control inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#9ED8F6]">
            <span>Select Bay / IED:</span>
            <select
              aria-label="Select Bay / IED"
              value={bay.id}
              onChange={(e) => onSelectBay(e.target.value)}
              className="w-full sm:w-auto max-w-full px-2 py-1 rounded-lg border border-[#00DFFF] bg-[#04182B] text-white font-mono text-[10.5px] sm:text-[11px] font-bold focus:outline-none focus:ring-1 focus:ring-[#00E5FF]"
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
          <div className="inline-flex flex-wrap items-center gap-1 text-[10px] font-mono">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="px-2 py-0.5 rounded border border-[#22C55E] bg-[#062E20] text-[#4ADE80] font-bold hover:brightness-125 transition"
            >
              {playing ? 'Pause' : 'Resume'}
            </button>
            {FLOW_SPEEDS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                aria-pressed={speed === s}
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
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 text-[10px] sm:text-[11px] font-mono">
          <button
            type="button"
            onClick={() => {
              onToggleBreaker(bay.id, isBreakerClosed ? 'OPEN' : 'CLOSED');
            }}
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
            <span className="text-[#94B8D7]">MMS Quality :</span>
            <span className="font-extrabold" style={{ color: qualityBadgeColor.text }}>
              {qualityBadgeColor.label}
            </span>
          </div>

          <div
            className="px-2.5 py-1 rounded-lg border bg-[#041526] flex items-center gap-1.5"
            style={{ borderColor: gooseRxColor.border }}
          >
            <span className="text-[#94B8D7]">GOOSE RX :</span>
            <span className="font-extrabold" style={{ color: gooseRxColor.text }}>
              {gooseRxLabel}
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg border border-[#1B4B72] bg-[#041526] flex items-center gap-1.5">
            <span className="text-[#94B8D7]">Latency (MMS Sim) :</span>
            <span className="font-extrabold text-[#FACC15]">{mmsHealthy ? `${Math.max(4, Math.round(12 / speed))} ms` : 'TIMEOUT'}</span>
          </div>

          <div className="px-2.5 py-1 rounded-lg border border-[#1B4B72] bg-[#041526] flex items-center gap-1.5">
            <span className="text-[#94B8D7]" title="Configured demo transfer delay in milliseconds. LAN B adds 1 ms.">Latency (GOOSE Sim) :</span>
            <span className="font-extrabold text-[#38BDF8]">{gooseHealthy ? `${gooseDelayMs + (selectedGoose && !selectedGoose.lans.A ? GOOSE_LAN_B_OFFSET_MS : 0)} ms` : showGooseDemo ? 'BLOCKED' : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Main 6-Device Hardware Signal Chain + Physical SVG Cabling */}
      <div
        ref={sceneOuterRef}
        className={`sas-signal-chain-scene rounded-xl border p-2.5 sm:p-3 relative ${fitScale < 1 ? 'overflow-hidden' : 'overflow-x-auto'}`}
        style={{
          borderColor: '#00DFFF',
          background: 'radial-gradient(ellipse 62% 44% at 50% 38%, rgba(28, 92, 126, 0.74) 0%, rgba(14, 52, 78, 0.86) 58%, rgba(10, 38, 58, 0.92) 100%)',
          boxShadow: '0 0 24px rgba(0, 223, 255, 0.14), inset 0 0 28px rgba(0, 175, 255, 0.08)',
        }}
      >
        <style>{`
          @keyframes sasLedBlink { 0%, 100% { opacity: 1; } 50% { opacity: 0.35; } }
          .sas-led-blink { animation: sasLedBlink 0.9s infinite; }
          .sas-paused .sas-led-blink { animation-play-state: paused; }
        `}</style>

        {isCompactViewport && (
          <div className="mb-2 flex items-center justify-between gap-2 text-[10px] font-mono">
            <span className="text-[#9ED8F6]">
              {fitToScreen ? `Full 6-Device Architecture (${Math.round(fitScale * 100)}% Fit)` : '100% Zoom (Swipe Left/Right)'}
            </span>
            <button
              type="button"
              onClick={() => setFitToScreen((v) => !v)}
              className="px-2 py-0.5 rounded border border-[#00DFFF] bg-[#04182B] text-[#7DD3FC] font-bold"
            >
              {fitToScreen ? '100% Zoom' : 'Fit to Screen'}
            </button>
          </div>
        )}

        <div style={fitScale < 1 ? { height: Math.ceil(diagSize.h * fitScale), overflow: 'hidden' } : undefined}>
        <div
          ref={diagramWrapRef}
          className={`min-w-[1140px] relative ${playing ? '' : 'sas-paused'}`}
          style={fitScale < 1 ? { width: 1140, transform: `scale(${fitScale})`, transformOrigin: 'top left' } : undefined}
        >
          {/* 6 Device Columns — Side Ports Hug Exact Hardware Chassis Edges (Measured via ResizeObserver) */}
          <div className={`grid grid-cols-6 gap-2.5 items-start relative z-10 ${showGooseDemo ? 'pb-[414px]' : 'pb-[140px]'}`}>
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
                    style={{ visibility: !primaryGoose || showGooseDemo ? 'hidden' : 'visible' }}
                    title="GOOSE L2 Publisher Port (0x88B8)"
                    className="absolute -right-2 top-[42%] -translate-y-1/2 w-3.5 h-3.5 rounded-[3px] border-[1.5px] border-[#00E5FF] bg-[#04243B] shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                  />
                  {/* Dynamic Backlit LCD & Real-Time LED Indication Strip */}
                  {(() => {
                    const is86Latched = Boolean(bay.masterTripLockout ?? bay.protectionTripActive);
                    const isFaultRed = Boolean(isIedFailed || activeFault || is86Latched);
                    const isTargetAmber = !isFaultRed && Boolean(bay.protectionTripActive);
                    const lcdBg = isFaultRed ? '#7F1D1D' : isTargetAmber ? '#451A03' : '#064E3B';
                    const lcdBorder = isFaultRed ? '#EF4444' : isTargetAmber ? '#F59E0B' : '#22C55E';
                    const lcdColor = isFaultRed ? '#FEE2E2' : isTargetAmber ? '#FEF3C7' : '#D1FAE5';
                    const lcdShadow = isFaultRed
                      ? '0 0 12px rgba(239,68,68,0.75)'
                      : isTargetAmber
                      ? '0 0 10px rgba(245,158,11,0.55)'
                      : '0 0 10px rgba(34,197,94,0.45)';
                    return (
                      <>
                        <div
                          className="absolute px-2 py-1 rounded border font-mono text-[8.5px] font-extrabold leading-tight shadow-inner pointer-events-none"
                          style={{
                            top: isDefaultMiComP143 ? '31%' : '14%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: lcdBg,
                            borderColor: lcdBorder,
                            color: lcdColor,
                            minWidth: '90px',
                            boxShadow: lcdShadow,
                          }}
                        >
                          <div>{bay.bayCode}</div>
                          <div className="truncate max-w-[96px]">
                            {isIedFailed
                              ? 'IED FAIL'
                              : activeFault
                              ? activeFault.scenario.lcdText
                              : is86Latched
                              ? 'TRIP 50/51 · 86'
                              : `CB ${bay.breakerState}`}
                          </div>
                        </div>

                        {/* Real-Time LED Status Strip Mounted Directly ON the IED Faceplate */}
                        <div
                          className="absolute bottom-[6px] left-1/2 -translate-x-1/2 z-30 w-[92%] max-w-[108px] rounded border px-1.5 py-0.5 text-left font-mono text-[7.2px] leading-tight pointer-events-none"
                          style={{
                            backgroundColor: isFaultRed
                              ? 'rgba(32, 6, 12, 0.94)'
                              : isTargetAmber
                              ? 'rgba(38, 22, 4, 0.94)'
                              : 'rgba(5, 36, 22, 0.94)',
                            borderColor: lcdBorder,
                            boxShadow: lcdShadow,
                          }}
                        >
                          {isFaultRed ? (
                            <>
                              <div className="flex items-center gap-1 text-[#FCA5A5] font-extrabold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#EF4444] sas-led-blink shadow-[0_0_5px_#EF4444] shrink-0" />
                                <span className="truncate">
                                  {activeFault?.scenario.tripsBreaker || is86Latched ? 'TRIP' : 'ALARM'} · {activeFault ? activeFault.scenario.ledBadge : 'OVERCURRENT'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1 text-[#FDE68A] mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] sas-led-blink shrink-0" />
                                <span className="truncate">
                                  {is86Latched ? `86 LATCHED · CB ${bay.breakerState}` : 'QUALITY FAULT'}
                                </span>
                              </div>
                            </>
                          ) : isTargetAmber ? (
                            <>
                              <div className="flex items-center gap-1 text-[#FDE68A] font-extrabold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0" />
                                <span className="truncate">TARGET · UNRESET</span>
                              </div>
                              <div className="flex items-center gap-1 text-[#86EFAC] mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" />
                                <span className="truncate">86 RESET · CB {bay.breakerState}</span>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="flex items-center gap-1 text-[#4ADE80] font-extrabold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_5px_#22C55E] shrink-0" />
                                <span className="truncate">RUN · IED HEALTHY</span>
                              </div>
                              <div className="flex items-center gap-1 text-[#A7F3D0] mt-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" />
                                <span className="truncate">86 RESET · CB {bay.breakerState}</span>
                              </div>
                            </>
                          )}
                        </div>
                      </>
                    );
                  })()}
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
                    style={{ visibility: !primaryGoose || showGooseDemo ? 'hidden' : 'visible' }}
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
                    {bay.bayCode}: {activeChain.displayVal} {!mmsDataGood && '(STALE / QUALITY)'}
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
            const ready = ['fio_1', 'fio_2', 'di_1', 'di_2', 'di_out', 'ied_in', 'ied_a', 'ied_b',
              'swa_in', 'swa_out', 'swb_in', 'swb_out', 'gtw_a', 'gtw_b', 'gtw_mms',
              'hmi_mms', 'hmi_a', 'hmi_b', 'ied_goose', 'sw_goose'].every((port) => p[port]);
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
            const dDiIed = `M ${p.di_out.x} ${p.di_out.y} L ${p.ied_in.x} ${p.ied_in.y}`;
            const dIedLanA = ortho(p.ied_a.x, p.ied_a.y, p.swa_in.x, p.swa_in.y, laneA);
            const dIedLanB = ortho(p.ied_b.x, p.ied_b.y, p.swb_in.x, p.swb_in.y, laneB);
            const dBusGtwA = ortho(p.swa_out.x, p.swa_out.y, p.gtw_a.x, p.gtw_a.y, laneA);
            const dBusGtwB = ortho(p.swb_out.x, p.swb_out.y, p.gtw_b.x, p.gtw_b.y, laneB);
            const dGtwHmiA = ortho(p.gtw_a.x, p.gtw_a.y, p.hmi_a.x, p.hmi_a.y, laneA);
            const dGtwHmiB = ortho(p.gtw_b.x, p.gtw_b.y, p.hmi_b.x, p.hmi_b.y, laneB);
            const mmsMidY = (p.gtw_mms.y + p.hmi_mms.y) / 2;
            const dGtwHmiMms = `M ${p.gtw_mms.x} ${mmsMidY} L ${p.hmi_mms.x} ${mmsMidY}`;
            const gooseMidY = (p.ied_goose.y + p.sw_goose.y) / 2;
            const dGooseDirect = `M ${p.ied_goose.x} ${p.ied_goose.y} L ${p.sw_goose.x} ${p.sw_goose.y}`;
            const gooseDropX = Math.round((p.ied_goose.x + p.sw_goose.x) / 2);
            const dGooseDrop = `M ${gooseDropX} ${gooseMidY} L ${gooseDropX} ${gooseY} L ${p.ied_a.x} ${gooseY}`;

            const isPrp = networkRedundancyMode === 'PRP';
            const upstreamLan: PrpLan = lanAUp ? 'A' : 'B';
            const parallelUpstream = isPrp && lanAUp && lanBUp;
            const upstreamColor = LAN_COLORS[upstreamLan];
            const fieldPath = isBreakerClosed ? 'cable-hw-1' : 'cable-hw-2';
            const faultLabel = !anyLanUp ? 'STATION BUS · NO LAN AVAILABLE'
              : chainFaultMode === 'REPORT_DISABLED' ? 'MMS REPORT DISABLED'
              : chainFaultMode === 'DATASET_MISSING' ? 'DATASET MEMBER MISSING'
              : chainFaultMode === 'WRONG_IEC_REF' ? 'IEC 61850 REFERENCE ERROR'
              : 'MMS ASSOCIATION LOST';
            const flowLegs: FlowLeg[] = [
              { path: fieldPath, label: isDiFailed ? 'DI INPUT FAULT'
                : isBreakerClosed ? '52a · 110 V DC' : '52b · 110 V DC',
                color: isDiFailed ? '#FCA5A5' : '#FEF08A', duration: 1050, stop: isDiFailed },
            ];
            if (!isDiFailed) {
              flowLegs.push({
                path: 'cable-di-ied', label: isIedFailed ? 'IED DATA UNAVAILABLE'
                  : `DI1=${Number(contact52aOn)} · DI2=${Number(contact52bOn)}`,
                color: isIedFailed ? '#FCA5A5' : '#86EFAC', duration: 850, stop: isIedFailed,
              });
            }
            if (!isDiFailed && !isIedFailed) {
              flowLegs.push({
                path: 'cable-ied-' + (anyLanUp ? upstreamLan.toLowerCase() : 'a'),
                lan: mmsHealthy ? upstreamLan : undefined,
                parallelPath: mmsHealthy && parallelUpstream ? 'cable-ied-b' : undefined,
                label: mmsHealthy ? `${activeChain.lnPart}.${activeChain.doPart}.${activeChain.daPart}` : faultLabel,
                color: mmsHealthy ? upstreamColor : '#FCA5A5', duration: mmsHealthy ? 1100 : 350,
                stop: !mmsHealthy, endFraction: mmsHealthy ? 1 : 0,
              });
              if (mmsHealthy) {
                flowLegs.push({
                  path: 'cable-bus-gtw-' + upstreamLan.toLowerCase(),
                  lan: upstreamLan,
                  parallelPath: parallelUpstream ? 'cable-bus-gtw-b' : undefined,
                  label: 'MMS REPORT → GATEWAY', color: upstreamColor, duration: 1250,
                });
              }
            }
            const valueLabel = activeChain.displayVal;
            const mappedValue = valueLabel.length > 28 ? 'SCADA TAG UPDATED' : 'SCADA · ' + valueLabel;
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



                {/* 2. DEVICE 2 (DI MODULE) -> DEVICE 3 (IED) DIRECT CHASSIS-TO-CHASSIS LINK */}
                <path id="cable-di-ied" d={dDiIed} fill="none" stroke={isDiFailed || isIedFailed ? '#EF4444' : '#22C55E'} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={isDiFailed || isIedFailed ? '5 4' : undefined} />
                <text x={(p.di_out.x + p.ied_in.x) / 2} y={diMidY - 8} textAnchor="middle" fill={isDiFailed || isIedFailed ? '#FCA5A5' : '#86EFAC'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  DI BUS
                </text>


                {/* 3. DEVICE 3 (IED) [ETH-A / ETH-B] -> DEVICE 4 (STATION BUS) [A-P1 / B-P1] */}
                <path id="cable-ied-a" d={dIedLanA} fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanAUp ? undefined : '6 4'} />
                <path id="cable-ied-b" d={dIedLanB} fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanBUp ? undefined : '6 4'} />



                {/* 4. DEVICE 4 (STATION BUS) -> DEVICE 5 (GATEWAY) -> DEVICE 6 (SCADA) PRP LAN A & LAN B */}
                <path id="cable-bus-gtw-a" d={dBusGtwA} fill="none" stroke={lanAUp ? '#0EA5E9' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanAUp ? undefined : '6 4'} />
                <path id="cable-bus-gtw-b" d={dBusGtwB} fill="none" stroke={lanBUp ? '#EC4899' : '#EF4444'} strokeWidth="3.2" strokeLinejoin="round" strokeDasharray={lanBUp ? undefined : '6 4'} />
                <path id="cable-gtw-hmi-a" d={dGtwHmiA} fill="none" stroke={lanAUp && mmsHealthy ? '#0EA5E9' : '#EF4444'} strokeWidth="3.0" strokeLinejoin="round" strokeDasharray={lanAUp && mmsHealthy ? undefined : '6 4'} />
                <path id="cable-gtw-hmi-b" d={dGtwHmiB} fill="none" stroke={lanBUp && mmsHealthy ? '#EC4899' : '#EF4444'} strokeWidth="3.0" strokeLinejoin="round" strokeDasharray={lanBUp && mmsHealthy ? undefined : '6 4'} />





                {/* Gateway and SCADA chassis uplink shown as part of the hardware diagram */}
                <path id="cable-gtw-hmi-mms" d={dGtwHmiMms} fill="none" stroke={mmsHealthy && iec104Healthy ? '#22C55E' : '#EF4444'} strokeWidth="3.4" strokeLinecap="round" strokeDasharray={mmsHealthy && iec104Healthy ? undefined : '6 4'} />
                <text x={(p.gtw_mms.x + p.hmi_mms.x) / 2} y={mmsMidY - 8} textAnchor="middle" fill={mmsHealthy && iec104Healthy ? '#86EFAC' : '#FCA5A5'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  MMS/104
                </text>


                {/* 6. DEVICE 3 (IED) -> DEVICE 4 (STATION BUS) DIRECT GOOSE L2 CHASSIS-TO-CHASSIS + PEER DROP */}
                {primaryGoose && !showGooseDemo && <path id="cable-goose-direct" d={dGooseDirect} fill="none" stroke={gooseHealthy ? '#00E5FF' : '#EF4444'} strokeWidth="2.8" strokeDasharray="5 3" />}
                {primaryGoose && !showGooseDemo && <path d={dGooseDrop} fill="none" stroke={gooseHealthy ? '#00DFFF' : '#EF4444'} strokeWidth="2.2" strokeDasharray="4 3" />}
                {primaryGoose && !showGooseDemo && <circle cx={gooseDropX} cy={gooseMidY} r="3" fill={gooseHealthy ? '#00E5FF' : '#EF4444'} />}
                {primaryGoose && !showGooseDemo && <text x={gooseDropX} y={gooseMidY - 8} textAnchor="middle" fill={gooseHealthy ? '#7DD3FC' : '#FCA5A5'} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                  GOOSE L2
                </text>}
                {primaryGoose?.healthy && anyLanUp && !showGooseDemo && (
                  <circle r="4" fill="#00F0FF" filter="url(#sasGlowCyan)">
                    <animateMotion dur={animDur(1.0)} repeatCount="indefinite"><mpath href="#cable-goose-direct" /></animateMotion>
                  </circle>
                )}

                {/* Clean Non-Overlapping Cable Tray Badges */}
                <rect x={p.swa_in.x + (showGooseDemo ? -104 : 0) - 42} y={trayTop + 48} width="84" height="17" rx="4" fill="#0369A1" stroke="#38BDF8" strokeWidth="1" />
                <text x={p.swa_in.x + (showGooseDemo ? -104 : 0)} y={trayTop + 59.5} textAnchor="middle" fill="#E0F2FE" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  LAN A (PRP)
                </text>
                <rect x={p.swb_out.x + (showGooseDemo ? 104 : 0) - 42} y={trayTop + 48} width="84" height="17" rx="4" fill="#701A75" stroke="#E879F9" strokeWidth="1" />
                <text x={p.swb_out.x + (showGooseDemo ? 104 : 0)} y={trayTop + 59.5} textAnchor="middle" fill="#FAE8FF" fontSize="9" fontWeight="bold" fontFamily="monospace">
                  LAN B (PRP)
                </text>
                {gooseDemos.map(({ block, publisher, peers, mode, lans, inputQualityFailed, enabled }) => {
                  const isTripDataset = /\$dsProtTrip$/i.test(block.datSet);
                  return (
                    <GoosePositionDemo
                      key={block.id}
                      block={block}
                      position={isTripDataset ? publisher.protectionTripActive ? 'ASSERTED' : 'RESET' : publisher.breakerState}
                      showTrip={isTripDataset}
                      visible={publisher.id === bay.id}
                      inputHealthy={!inputQualityFailed && (isTripDataset || publisher.dcSupplyHealthy)}
                      enabled={enabled}
                      lanAUp={lans.A}
                      lanBUp={lans.B && (isPrp || !lans.A)}
                      isPrp={isPrp}
                      playing={playing}
                      speed={speed}
                      transferLatencyMs={gooseDelayMs}
                      switchOutputs={{
                        A: { x: (p.swa_in.x + p.swa_out.x) / 2, y: p.swa_out.y },
                        B: { x: (p.swb_in.x + p.swb_out.x) / 2, y: p.swb_out.y },
                      }}
                      branchY={trayTop + 100}
                      peers={peers}
                      onRxStatusChange={updateGooseRx}
                    />
                  );
                })}

                <SignalFlowOverlay
                  key={[bay.id, activeChain.row.catalogNumber, bay.breakerState, chainFaultMode,
                    isDiFailed, isIedFailed, lanAUp, lanBUp, networkRedundancyMode, flowRevision].join('/')}
                  legs={flowLegs}
                  playing={playing}
                  speed={speed}
                  lanAUp={lanAUp}
                  lanBUp={lanBUp}
                  isPrp={isPrp}
                  tagMismatch={chainFaultMode === 'HMI_TAG_MISMATCH'}
                  mappedValue={mappedValue}
                  receiver={p.hmi_mms}
                  receiverPorts={{ A: p.hmi_a, B: p.hmi_b }}
                  trayBottom={trayTop + 44}
                  width={W}
                  allocateSequence={allocateSequence}
                />
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
      </div>

      {/* INTERACTIVE STEP-BY-STEP FAULT TROUBLESHOOTING & ISOLATION GUIDE (Shown when a fault is active) */}
      {activeFault?.scenario.troubleshooting && (() => {
        const guide = activeFault.scenario.troubleshooting;
        const completedCount = guide.steps.filter((s) => checkedTroubleshootSteps[s.step]).length;
        const stageToIndex: Record<string, number> = {
          'Field I/O': 0,
          'Input Module': 1,
          'IED': 2,
          'Station Bus': 4,
          'Gateway': 4,
          'SCADA / HMI': 5,
        };
        return (
          <div
            className="rounded-xl border overflow-hidden shadow-[0_0_24px_rgba(239,68,68,0.2)]"
            style={{
              borderColor: '#EF4444',
              background: 'linear-gradient(180deg, rgba(36, 10, 18, 0.94) 0%, rgba(7, 22, 38, 0.96) 100%)',
            }}
          >
            <div className="px-3.5 py-2 border-b border-[#7F1D1D] bg-gradient-to-r from-[#450A14] via-[#2A0E1B] to-[#082035] flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-[#FCA5A5] shrink-0" />
                <span className="text-xs font-extrabold text-white tracking-wide uppercase">
                  Fault Finding &amp; Troubleshooting Steps — {activeFault.scenario.label}
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-[#06281E] border border-[#22C55E] text-[#4ADE80]">
                  {completedCount}/{guide.steps.length} Steps Checked
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTroubleshootExpanded((v) => !v)}
                  className="px-2.5 py-1 rounded-md border border-[#1E466E] bg-[#061A2E] text-[10.5px] font-bold text-[#BAE6FD] hover:border-[#00DFFF]"
                >
                  {troubleshootExpanded ? 'Hide Steps ▴' : 'Show Steps ▾'}
                </button>
                <button
                  type="button"
                  onClick={() => setChainFaultMode('NONE')}
                  className="px-2.5 py-1 rounded-md border border-[#22C55E] bg-[#062E20] text-[10.5px] font-extrabold text-[#4ADE80] hover:brightness-110"
                >
                  ✓ Mark Resolved &amp; Restore Healthy
                </button>
              </div>
            </div>

            {troubleshootExpanded && (
              <div className="p-3 space-y-2.5 text-[11px]">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                  <div className="lg:col-span-5 rounded-lg border border-[#7F1D1D]/70 bg-[#1B0910]/80 p-2.5 space-y-1">
                    <div className="text-[10px] font-mono font-extrabold uppercase text-[#FCA5A5]">
                      1. Fault Symptom &amp; Evidence
                    </div>
                    <div className="text-white font-semibold leading-snug">{guide.symptomSummary}</div>
                    <div className="text-[10px] font-mono text-[#FDE68A] break-all pt-0.5">
                      Ref: {activeFault.scenario.evidence}
                    </div>
                  </div>
                  <div className="lg:col-span-7 rounded-lg border border-[#1E466E] bg-[#051628]/90 p-2.5 space-y-1">
                    <div className="text-[10px] font-mono font-extrabold uppercase text-[#7DD3FC]">
                      2. Probable Root Causes (Check in Order)
                    </div>
                    <ul className="list-disc list-inside space-y-0.5 text-[#DCEEFB]">
                      {guide.probableCauses.map((cause, idx) => (
                        <li key={idx}>{cause}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 5-Step Interactive Fault Isolation Checklist */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {guide.steps.map((s) => {
                    const checked = Boolean(checkedTroubleshootSteps[s.step]);
                    return (
                      <div
                        key={s.step}
                        className="rounded-lg border p-2 flex flex-col justify-between gap-1.5 transition"
                        style={{
                          backgroundColor: checked ? 'rgba(6, 46, 32, 0.85)' : 'rgba(5, 22, 38, 0.92)',
                          borderColor: checked ? '#22C55E' : '#1E4B75',
                        }}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <label className="inline-flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() =>
                                  setCheckedTroubleshootSteps((prev) => ({ ...prev, [s.step]: !prev[s.step] }))
                                }
                                className="w-3.5 h-3.5 accent-[#22C55E]"
                              />
                              <span className={`font-mono font-extrabold text-[10.5px] ${checked ? 'text-[#4ADE80]' : 'text-[#00DFFF]'}`}>
                                STEP {s.step}
                              </span>
                            </label>
                            <button
                              type="button"
                              onClick={() => setSelectedStageIndex(stageToIndex[s.stage] ?? 2)}
                              title="Click to inspect this stage in the Signal Chain"
                              className="px-1.5 py-0.5 rounded bg-[#0A2942] border border-[#00DFFF]/50 text-[9px] font-mono font-bold text-[#7DD3FC] hover:bg-[#0E3A5E]"
                            >
                              {s.stage}
                            </button>
                          </div>
                          <div className="text-[10.5px] text-white leading-snug">{s.action}</div>
                        </div>
                        <div className="pt-1 border-t border-[#143554] space-y-0.5 font-mono text-[9.5px]">
                          <div className="text-[#FDE68A]">Tool: {s.tool}</div>
                          <div className="text-[#86EFAC]">Check: {s.expectedCheck}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Final Post-Fix Verification Bar */}
                <div className="rounded-lg border border-[#22C55E]/50 bg-[#05221B]/85 px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
                  <span className="text-[#86EFAC] font-semibold">
                    <strong className="text-white">Post-Fix Verification:</strong> {guide.verificationCheck}
                  </span>
                  <span className="font-mono text-[10px] text-[#7DD3FC]">
                    Tip: Click any stage pill (Field I/O, IED, Station Bus...) to open its live Diagnostic Inspector.
                  </span>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* MIDDLE ROW: 3 Monitoring Panels */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.45fr_1fr] gap-3">
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
              { label: activeChain.fieldIoTitle, ok: activeChain.stageStates[0] === 'OK' },
              { label: activeChain.diModuleTitle, ok: !isDiFailed },
              { label: `IED Update (${activeChain.lnPart})`, ok: !isIedFailed && activeChain.stageStates[2] === 'OK' },
              { label: `IEC 61850 DataSet (${activeChain.row.defaultDataset})`, ok: chainFaultMode !== 'DATASET_MISSING' && chainFaultMode !== 'WRONG_IEC_REF' },
              { label: 'MMS / GOOSE Publish', ok: mmsHealthy && (!showGooseDemo || gooseHealthy) },
              { label: 'SCADA/HMI Update', ok: mmsDataGood },
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
            <table className="w-full min-w-[560px] text-[10.5px] text-left border-collapse whitespace-nowrap">
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
                    val: mmsDataGood ? '0x00 (Good)' : '0x0100 (Bad)',
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
            <table className="w-full min-w-[560px] text-[10.5px] text-left border-collapse whitespace-nowrap">
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
                    status: gooseHealthy ? 'Active' : showGooseDemo ? 'Blocked' : 'Not configured',
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
              ...(faultScenarios || []).map(scenario => ({
                label: scenario.label,
                checked: activeFault?.scenario.id === scenario.id,
                disabled: false,
                onChange: (checked: boolean) => setChainFaultMode(checked ? scenario.id : 'NONE'),
              })),
              {
                label: 'Interlock / Trip Test',
                disabled: false,
                checked: interlockTripActive || bay.protectionTripActive,
                onChange: handleInterlockTripToggle,
              },
            ].map((t) => (
              <label key={t.label} className="flex items-center justify-between gap-2 cursor-pointer text-[#DCEEFB]">
                <span>{t.label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-label={t.label}
                  aria-checked={t.checked}
                  disabled={t.disabled}
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
                disabled={!!faultScenarios && !faultScenarios.some(scenario => scenario.mode === 'DI_INPUT_FAIL')}
                onClick={() => setChainFaultMode(activeFault?.scenario.mode === 'DI_INPUT_FAIL' ? 'NONE' : 'DI_INPUT_FAIL')}
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
