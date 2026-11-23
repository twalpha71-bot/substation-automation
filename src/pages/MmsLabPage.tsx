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
  | 'COMMAND_REJECTED'
  | 'LAN_A_DOWN'
  | 'LAN_B_DOWN'
  | 'BOTH_LANS_DOWN';

type ClientOperation = 'READ' | 'WRITE' | 'GI' | 'CONTROL' | 'REPORT';
type OutcomeCode = 'read' | 'write' | 'gi' | 'sent' | 'sent-invalid' | 'offline' | 'no-rcb'
  | 'mapping' | 'rcc-offline' | 'interlock' | 'rejected' | 'busy' | 'controlled';
type OperationOutcome = { code: OutcomeCode; detail: string };

const MMS_SCENARIOS = [
  { id: 'READ', label: 'MMS association and Read', fault: 'NONE', op: 'READ', expect: 'read',
    expected: 'An established MMS association returns the selected live value and quality.',
    checks: ['Confirm the target IED and its configured IP.', 'Verify TCP/102, then COTP/ACSE and MMS Initiate.', 'Compare the object reference, functional constraint and value in Packet Analyzer.'] },
  { id: 'REPORT', label: 'BRCB breaker status to RCC', fault: 'NONE', op: 'REPORT', expect: 'sent',
    expected: 'An enabled status BRCB publishes breaker position and starts an M_DP_NA_1 transfer with IV=0.',
    checks: ['Check RptEna and dsStatus membership under RCB.', 'Verify Type ID, CA and IOA in Protocol Conversion.', 'Resume playback if paused and verify the arriving ASDU in the RCC Receive Monitor.'] },
  { id: 'REPORT_URCB', label: 'URCB measurements to RCC', fault: 'NONE', op: 'REPORT', expect: 'sent',
    expected: 'An enabled measurement URCB publishes phase-A current and starts an M_ME_NC_1 transfer with IV=0.',
    checks: ['Check RptEna and dsMeas membership under RCB.', 'Verify the mapped current value, Type ID and IOA.', 'Resume playback if paused and confirm the same current value arrives at the RCC.'] },
  { id: 'GI', label: 'MMS General Interrogation', fault: 'NONE', op: 'GI', expect: 'gi',
    expected: 'GI refreshes enabled RCB datasets with the GI trigger enabled.',
    checks: ['Check association and RptEna.', 'Confirm TrgOps includes GI for the intended RCB.', 'Look for the MMS GI result in Packet Analyzer. An RCC IEC-104 interrogation is a separate service.'] },
  { id: 'LAN_A_DOWN', label: 'PRP LAN A down', fault: 'LAN_A_DOWN', op: 'READ', expect: 'read',
    expected: 'LAN A is down and MMS Read still succeeds through LAN B.',
    checks: ['Confirm LAN A is down and LAN B is up.', 'Verify that no second association is required for the simulated Read.', 'Clear the fault and confirm both paths recover.'] },
  { id: 'LAN_B_DOWN', label: 'PRP LAN B down', fault: 'LAN_B_DOWN', op: 'READ', expect: 'read',
    expected: 'LAN B is down and MMS Read still succeeds through LAN A.',
    checks: ['Confirm LAN B is down and LAN A is up.', 'Verify the Read result.', 'Clear the fault and confirm both paths recover.'] },
  { id: 'BOTH_LANS_DOWN', label: 'Both PRP LANs down', fault: 'BOTH_LANS_DOWN', op: 'READ', expect: 'offline',
    expected: 'MMS Read is rejected because neither station LAN is available.',
    checks: ['Check both LAN indicators.', 'Restore one independent path and confirm association recovers.', 'Repeat Read before checking reports or the gateway mapping.'] },
  { id: 'TCP_102_BLOCKED', label: 'TCP/102 blocked', fault: 'TCP_102_BLOCKED', op: 'READ', expect: 'offline',
    expected: 'MMS association cannot be established and Read is rejected.',
    checks: ['Check the IED IP and L2 path.', 'Verify the configured policy permits TCP/102 between gateway and IED.', 'Check for a TCP handshake before investigating ACSE.'] },
  { id: 'MMS_ASSOC_FAIL', label: 'MMS association rejected (ACSE)', fault: 'MMS_ASSOC_FAIL', op: 'READ', expect: 'offline',
    expected: 'The simulated TCP path is available, but ACSE rejects association and Read fails.',
    checks: ['Confirm TCP/102 is available.', 'Inspect COTP and ACSE association diagnostics.', 'Check addressing/selectors and the IED client limit, then retry.'] },
  { id: 'IED_OFFLINE', label: 'IED offline', fault: 'IED_OFFLINE', op: 'READ', expect: 'offline',
    expected: 'The destination IED is unavailable and MMS Read is rejected.',
    checks: ['Confirm the correct IED is selected.', 'Check IED power, link and IP reachability.', 'Re-establish MMS before testing RCBs.'] },
  { id: 'GATEWAY_UNAVAILABLE', label: 'Station gateway unavailable', fault: 'GATEWAY_UNAVAILABLE', op: 'READ', expect: 'offline',
    expected: 'The gateway cannot initiate MMS and cannot serve IEC-104.',
    checks: ['Check gateway health and both network interfaces.', 'Confirm the MMS client and IEC-104 server services recover.', 'Rerun Read and verify RCC reception.'] },
  { id: 'RCB_DISABLED', label: 'Reporting disabled (RptEna=0)', fault: 'RCB_DISABLED', op: 'REPORT', expect: 'no-rcb',
    expected: 'MMS Read remains available but the report is suppressed at the IED.',
    checks: ['Use Read to verify the association is healthy.', 'Inspect the point’s DataSet, RptEna and trigger options.', 'Clear the fault and confirm a report appears in Packet Analyzer.'] },
  { id: 'MAPPING_MISSING', label: 'Gateway point mapping missing', fault: 'MAPPING_MISSING', op: 'REPORT', expect: 'mapping',
    expected: 'MMS receives the report, but the gateway cannot create the corresponding IEC-104 indication.',
    checks: ['Confirm the MMS report arrived.', 'Check the selected point’s gateway reference, CA and IOA.', 'Fix the mapping and verify the matching RCC indication.'] },
  { id: 'TYPE_MISMATCH', label: 'Breaker indication type mismatch', fault: 'TYPE_MISMATCH', op: 'REPORT', expect: 'mapping',
    expected: 'The gateway rejects the breaker’s double-point value configured with a single-point Type ID.',
    checks: ['Check XCBR1.Pos.stVal and its Dbpos states.', 'Compare configured Type ID, CA and IOA at both endpoints.', 'Restore M_DP_NA_1 and confirm the RCC receives the same position.'] },
  { id: 'INVALID_QUALITY', label: 'Invalid source quality', fault: 'INVALID_QUALITY', op: 'REPORT', expect: 'sent-invalid',
    expected: 'The gateway starts an IEC-104 transfer with IV=1 for the invalid source point.',
    checks: ['Check MMS q.validity before conversion.', 'Verify the gateway propagates IV=1 instead of marking the value Good.', 'Resume playback if paused and verify Invalid in the RCC Receive Monitor.'] },
  { id: 'IEC104_DISCONNECTED', label: 'RCC TCP/2404 disconnected', fault: 'IEC104_DISCONNECTED', op: 'REPORT', expect: 'rcc-offline',
    expected: 'MMS reporting works, but there is no IEC-104 transmission to the RCC.',
    checks: ['Confirm gateway MMS reports still arrive.', 'Check the gateway/RCC TCP/2404 session and STARTDT state.', 'Restore the session and verify a fresh indication arrives.'] },
  { id: 'COMMAND_REJECTED', label: 'SBO blocked by interlock', fault: 'COMMAND_REJECTED', op: 'CONTROL', expect: 'interlock',
    expected: 'The simulated IED rejects the command and the breaker position stays unchanged.',
    checks: ['Verify both protocol sessions are up.', 'Check control authority, local/remote and interlock permissives.', 'Read the rejection reason and compare breaker position feedback before retrying.'] },
] as const satisfies readonly {
  id: string; label: string; fault: MmsFaultMode; op: ClientOperation; expect: OutcomeCode;
  expected: string; checks: readonly string[];
}[];
type MmsScenario = typeof MMS_SCENARIOS[number];

interface GatewayPointRow {
  dataSet: string;
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
  route?: string;
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
  | 'IDLE'
  | 'IED_TO_PRP'
  | 'PRP_TO_GATEWAY'
  | 'GATEWAY_CONVERSION'
  | 'IEC104_IN_FLIGHT'
  | 'RCC_POINT_UPDATED'
  | 'FAILED';

const FLOW_PATHS = {
  aIn: [[146, 120], [182, 120], [182, 114], [258, 114]],
  aOut: [[314, 114], [392, 114], [392, 120], [444, 120]],
  bIn: [[146, 140], [182, 140], [182, 198], [258, 198]],
  bOut: [[314, 198], [392, 198], [392, 140], [444, 140]],
  wan: [[554, 130], [640, 130]],
} as const;
type FlowPath = readonly (readonly [number, number])[];
const cablePath = (points: FlowPath) => points.map(([x, y], index) => `${index ? 'L' : 'M'} ${x} ${y}`).join(' ');

function packetPosition(points: FlowPath, progress: number) {
  const segments = points.slice(1).map(([x, y], i) => Math.hypot(x - points[i][0], y - points[i][1]));
  let remaining = segments.reduce((sum, length) => sum + length, 0) * progress;
  for (const [i, length] of segments.entries()) {
    if (remaining <= length) {
      const [x, y] = points[i];
      const [nextX, nextY] = points[i + 1];
      return [x + (nextX - x) * remaining / length, y + (nextY - y) * remaining / length];
    }
    remaining -= length;
  }
  return points[points.length - 1];
}

const SWITCH_PROGRESS = 0.25;
const GATEWAY_PROGRESS = 0.5;
const WAN_PROGRESS = 0.68;

function flowPhase(progress: number): Iec104FlowState {
  if (progress < SWITCH_PROGRESS) return 'IED_TO_PRP';
  if (progress < GATEWAY_PROGRESS) return 'PRP_TO_GATEWAY';
  return progress < WAN_PROGRESS ? 'GATEWAY_CONVERSION' : 'IEC104_IN_FLIGHT';
}

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
    () => bays.find((b) => b.id === selectedIed?.bayId),
    [bays, selectedIed?.bayId]
  );

  const [activeTab, setActiveTab] = useState<MmsLabTab>('PROTOCOL_CONVERSION');
  const [speed, setSpeed] = useState<0.1 | 0.25 | 0.5 | 1 | 2 | 4>(0.1);
  const [playing, setPlaying] = useState<boolean>(true);
  const [manualDisconnect, setManualDisconnect] = useState<boolean>(false);
  const [manualLanAUp, setLanAUp] = useState<boolean>(true);
  const [manualLanBUp, setLanBUp] = useState<boolean>(true);
  const [faultMode, setFaultMode] = useState<MmsFaultMode>('NONE');
  const [scenarioId, setScenarioId] = useState<MmsScenario['id']>('READ');
  const [scenarioToRun, setScenarioToRun] = useState<MmsScenario | null>(null);
  const [scenarioResult, setScenarioResult] = useState<{ id: MmsScenario['id']; passed: boolean; detail: string } | null>(null);
  const [selectedPointIdx, setSelectedPointIdx] = useState<number>(1);
  const [selectedLdInst, setSelectedLdInst] = useState<string>(
    selectedIed?.logicalDevices[0]?.ldInst || 'Application'
  );
  const [selectedNodeKey, setSelectedNodeKey] = useState<string>('');
  const [inspectedDevice, setInspectedDevice] = useState<string | null>(null);
  const [pktFilter, setPktFilter] = useState<'ALL' | 'MMS' | 'IEC-104'>('ALL');
  const [lastActivity, setLastActivity] = useState<string>(nowTimeMs());
  const sequenceRef = useRef(0);

  // Event-driven IEC-104 Gateway -> RCC transmission pipeline state
  const [inFlight104, setInFlight104] = useState<{
    id: number;
    reportName: string;
    sourceDetail: string;
    block: { service: string; detail: string } | null;
    typeId: string;
    ca: number;
    ioa: number;
    value: string;
    quality: 'Good' | 'Invalid';
    cot: number;
    ns: number;
    progress: number; // 0 -> 1 across the entire IED-to-RCC sequence
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
    typeId: '—', ca: 0, ioa: 0, value: 'Awaiting first indication',
    quality: 'Good', timestamp: '—', rxCount: 0, apciNs: 0, apciNr: 0,
    lastStage: 'Waiting for first packet',
  }));
  const pointCursorRef = useRef(0);
  const nextEventIdRef = useRef(1);
  const [flowState, setFlowState] = useState<Iec104FlowState>('IDLE');
  const [logs, setLogs] = useState<LogEntry[]>([]);

  const lanAUp = manualLanAUp && faultMode !== 'LAN_A_DOWN' && faultMode !== 'BOTH_LANS_DOWN';
  const lanBUp = manualLanBUp && faultMode !== 'LAN_B_DOWN' && faultMode !== 'BOTH_LANS_DOWN';
  const gatewayUp = faultMode !== 'GATEWAY_UNAVAILABLE';
  const mmsBlock = !selectedIed || selectedIed.mmsConnected === false || faultMode === 'IED_OFFLINE' ? 'Selected IED unavailable'
    : !gatewayUp ? 'Station gateway unavailable'
    : manualDisconnect ? 'MMS session manually disconnected'
    : !lanAUp && !lanBUp ? 'Both PRP paths unavailable'
    : faultMode === 'TCP_102_BLOCKED' ? 'TCP/102 blocked; MMS Initiate not reached'
    : faultMode === 'MMS_ASSOC_FAIL' ? 'ACSE association rejected after TCP connection' : '';
  const mmsConnected = !mmsBlock;
  // The gateway's northbound session can remain healthy while its IED link is down.
  const iec104Connected = gatewayUp && faultMode !== 'IEC104_DISCONNECTED';
  const rcbs = selectedIed?.rcbs ?? [];
  const reportingAvailable = mmsConnected && faultMode !== 'RCB_DISABLED' && rcbs.some(rcb => rcb.enabled);
  const conversionActive = reportingAvailable && iec104Connected && faultMode !== 'MAPPING_MISSING';

  const addLog = (entry: Omit<LogEntry, 'time'>) => {
    const t = nowTimeMs();
    setLastActivity(t);
    const route = entry.protocol === 'MMS'
      ? entry.kind === 'Report'
        ? `${selectedIed?.ipAddressLanA}:102 → ${MMS_LAB_NETWORK_CONFIG.gatewayMmsClientIp}`
        : `${MMS_LAB_NETWORK_CONFIG.gatewayMmsClientIp} ↔ ${selectedIed?.ipAddressLanA}:102`
      : entry.kind === 'Control'
        ? `${MMS_LAB_NETWORK_CONFIG.rccIec104ClientIp} → ${MMS_LAB_NETWORK_CONFIG.gatewayIec104ServerIp}:2404`
        : undefined;
    setLogs((prev) => [{ time: t, route, ...entry }, ...prev].slice(0, 20));
  };

  // Authoritative 5-point Gateway Mapping Table derived from selectedIed & associatedBay
  const isClosed = associatedBay?.breakerState === 'CLOSED';
  const liveCurrent = associatedBay ? associatedBay.currentA.toFixed(1) : '318.6';
  const liveVoltage = associatedBay ? associatedBay.voltageAbKv.toFixed(2) : '33.12';
  const qualFlag: 'Good' | 'Invalid' =
    faultMode === 'INVALID_QUALITY' || !mmsConnected || associatedBay?.quality !== 'GOOD' ? 'Invalid' : 'Good';

  const mappingRows: GatewayPointRow[] = useMemo(
    () => [
      {
        idx: 1,
        dataSet: 'dsStatus',
        iecRef: 'XCBR1.Pos.stVal',
        fc: 'ST',
        mmsVal: isClosed ? 'Dbpos 10 — Closed' : associatedBay?.breakerState === 'OPEN' ? 'Dbpos 01 — Open' : associatedBay?.breakerState === 'BAD' ? 'Dbpos 11 — Bad state' : 'Dbpos 00 — Intermediate',
        iec104Type: faultMode === 'TYPE_MISMATCH' ? 'M_SP_NA_1 (ERR)' : 'M_DP_NA_1',
        ca: 1,
        ioa: 1001,
        convertedVal: isClosed ? '2 — ON / CLOSED' : associatedBay?.breakerState === 'OPEN' ? '1 — OFF / OPEN' : associatedBay?.breakerState === 'BAD' ? '3 — INDETERMINATE' : '0 — INTERMEDIATE',
        quality: associatedBay?.breakerState === 'BAD' ? 'Invalid' : qualFlag,
        mapped: faultMode !== 'MAPPING_MISSING' && faultMode !== 'TYPE_MISMATCH',
      },
      {
        idx: 2,
        dataSet: 'dsProtTrip',
        iecRef: 'PTRC1.Tr.general',
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
        dataSet: 'dsMeas',
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
        dataSet: 'dsMeas',
        iecRef: 'MMXU1.PPV.phsAB.mag.f',
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
        dataSet: 'dsStatus',
        iecRef: 'XSWI1.Pos.stVal',
        fc: 'ST',
        mmsVal: associatedBay?.busDisconnectorState ?? 'Unknown',
        iec104Type: 'M_DP_NA_1',
        ca: 1,
        ioa: 1201,
        convertedVal: associatedBay?.busDisconnectorState === 'CLOSED' ? '2 — ON / CLOSED' : associatedBay?.busDisconnectorState === 'OPEN' ? '1 — OFF / OPEN' : '0 — INTERMEDIATE',
        quality: qualFlag,
        mapped: faultMode !== 'MAPPING_MISSING',
      },
    ],
    [isClosed, associatedBay?.breakerState, associatedBay?.busDisconnectorState, associatedBay?.protectionTripActive, liveCurrent, liveVoltage, qualFlag, faultMode]
  );

  const dispatchIec104Event = (row: GatewayPointRow): OperationOutcome => {
    const reject = (code: OutcomeCode, protocol: LogEntry['protocol'], service: string, detail: string): OperationOutcome => {
      setFlowState('FAILED');
      addLog({ protocol, service, details: detail, result: 'Failed', kind: 'Error' });
      return { code, detail };
    };
    if (!mmsConnected) return reject('offline', 'MMS', 'Report unavailable', mmsBlock);
    if (inFlight104) return { code: 'busy', detail: 'An IEC-104 indication is already in flight.' };

    const rcb = rcbs.find(block => block.datSet === row.dataSet && block.enabled);
    if (faultMode === 'RCB_DISABLED' || !rcb) {
      return reject('no-rcb', 'MMS', 'Report suppressed', `${row.iecRef}: no enabled RCB for ${row.dataSet}.`);
    }
    const block = !row.mapped
      ? { code: 'mapping' as const, service: 'Mapping error', detail: `${row.iecRef} has ${faultMode === 'TYPE_MISMATCH' ? 'an incompatible Type ID' : 'no gateway mapping'}. Flow stops at the gateway.` }
      : !iec104Connected
        ? { code: 'rcc-offline' as const, service: 'Transmission blocked', detail: `TCP/2404 is down. IOA ${row.ioa} will stop at the gateway.` }
        : null;
    const value = row.convertedVal.includes('CLOSED') ? 'CLOSED'
      : row.convertedVal.includes('OPEN') ? 'OPEN' : row.convertedVal;
    const ns = sequenceRef.current;
    if (!block) sequenceRef.current = (ns + 1) % 32768;
    setFlowState('IED_TO_PRP');
    setInFlight104({
      id: nextEventIdRef.current++, typeId: row.iec104Type,
      reportName: rcb.name, sourceDetail: `${row.iecRef} = ${row.mmsVal} · Quality ${row.quality}`, block,
      ca: row.ca, ioa: row.ioa, value, quality: row.quality, cot: 3, ns, progress: 0,
    });
    if (block) return { code: block.code, detail: block.detail };
    return {
      code: row.quality === 'Good' ? 'sent' : 'sent-invalid',
      detail: `${rcb.name} → ${row.iec104Type}, CA ${row.ca}, IOA ${row.ioa}, IV=${row.quality === 'Good' ? 0 : 1}. Transfer started; check the RCC monitor for arrival.`,
    };
  };

  // Telemetry can update faster than the demo clock. Read the latest sample when the timer fires.
  const dispatchPeriodicRef = useRef<() => void>(() => {});
  useEffect(() => {
    dispatchPeriodicRef.current = () => {
      const candidates = [mappingRows[0], mappingRows[2], mappingRows[3]].filter(row =>
        rcbs.some(rcb => rcb.enabled && rcb.datSet === row.dataSet && rcb.trgOps.includes('period')));
      if (!candidates.length) return;
      const row = candidates[pointCursorRef.current % candidates.length];
      pointCursorRef.current += 1;
      dispatchIec104Event(row);
    };
  });

  useEffect(() => {
    if (!playing || !reportingAvailable || !iec104Connected || inFlight104 || faultMode === 'MAPPING_MISSING') return;
    const timer = window.setInterval(() => dispatchPeriodicRef.current(), Math.min(1200, Math.max(450, Math.round(800 / speed))));
    return () => window.clearInterval(timer);
  }, [playing, speed, reportingAvailable, iec104Connected, faultMode, inFlight104?.id, selectedIed?.id]);

  useEffect(() => {
    if (!inFlight104) return;
    const beforeGateway = inFlight104.progress < GATEWAY_PROGRESS;
    const onWan = inFlight104.progress >= WAN_PROGRESS;
    if (gatewayUp && (beforeGateway ? mmsConnected : !onWan || iec104Connected)) return;
    setInFlight104(null);
    setFlowState('FAILED');
    setRccFlash(false);
    addLog({
      protocol: beforeGateway ? 'MMS' : 'IEC-104', service: 'Transfer interrupted',
      details: `IOA ${inFlight104.ioa} was not received by RCC.`, result: 'Failed', kind: 'Error',
    });
  }, [inFlight104?.id, iec104Connected, mmsConnected, gatewayUp]);

  useEffect(() => {
    if (!playing || !inFlight104) return;
    const frame = inFlight104;
    if (!gatewayUp || (frame.progress < GATEWAY_PROGRESS && !mmsConnected)
      || (frame.progress >= WAN_PROGRESS && !iec104Connected)) return;
    const duration = 3600 / speed;
    const started = performance.now() - frame.progress * duration;
    let previous = frame.progress;
    let rafId = 0;
    const step = (now: number) => {
      const progress = Math.min(1, (now - started) / duration);
      if (previous < GATEWAY_PROGRESS && progress >= GATEWAY_PROGRESS) {
        addLog({ protocol: 'MMS', service: `Report (${frame.reportName})`, details: frame.sourceDetail, result: 'Success', kind: 'Report' });
      }
      if (progress >= WAN_PROGRESS && (frame.block || !iec104Connected)) {
        setInFlight104(null);
        setFlowState('FAILED');
        addLog({
          protocol: 'IEC-104', service: frame.block?.service ?? 'Transmission blocked',
          details: frame.block?.detail ?? 'TCP/2404 went down before transmission.',
          result: 'Failed', kind: 'Error',
        });
        return;
      }
      if (flowPhase(previous) !== flowPhase(progress)) setFlowState(flowPhase(progress));
      previous = progress;
      if (progress < 1) {
        setInFlight104({ ...frame, progress });
        rafId = window.requestAnimationFrame(step);
        return;
      }
      const timestamp = nowTimeMs();
      setInFlight104(null);
      setFlowState('RCC_POINT_UPDATED');
      setRccState(previous => ({
        typeId: frame.typeId, ca: frame.ca, ioa: frame.ioa, value: frame.value, quality: frame.quality,
        timestamp, rxCount: previous.rxCount + 1, apciNs: frame.ns, apciNr: (frame.ns + 1) % 32768,
        lastStage: 'RCC Point Updated',
      }));
      setRccFlash(true);
      addLog({
        protocol: 'IEC-104', service: frame.typeId,
        details: `CA=${frame.ca}, IOA=${frame.ioa}, Val=${frame.value}, COT=${frame.cot}, IV=${frame.quality === 'Good' ? 0 : 1} (RCC RX #${frame.id})`,
        result: 'Delivered', kind: 'Report',
        route: `${MMS_LAB_NETWORK_CONFIG.gatewayIec104ServerIp}:2404 → ${MMS_LAB_NETWORK_CONFIG.rccIec104ClientIp}`,
      });
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, speed, inFlight104?.id, iec104Connected, mmsConnected, gatewayUp]);

  useEffect(() => {
    if (!rccFlash) return;
    const timer = window.setTimeout(() => setRccFlash(false), 420);
    return () => window.clearTimeout(timer);
  }, [rccFlash, rccState.rxCount]);

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


  const handleSelectIed = (id: string) => {
    const next = ieds.find(ied => ied.id === id);
    if (!next) return;
    setLocalIedId(id);
    setSelectedIedId(id);
    setSelectedLdInst(next.logicalDevices[0]?.ldInst || 'Application');
    setSelectedNodeKey('');
    setInFlight104(null);
    setFlowState('IDLE');
    setScenarioResult(null);
    setRccFlash(false);
  };

  const handleClientOp = (op: ClientOperation, point = selectedPoint): OperationOutcome => {
    const record = (code: OutcomeCode, detail: string, service: string, kind: LogEntry['kind'], protocol: LogEntry['protocol'] = 'MMS'): OperationOutcome => {
      addLog({ protocol, service, details: detail, kind, result: kind === 'Error' ? 'Failed' : 'Success' });
      return { code, detail };
    };
    if (op === 'CONTROL' && !iec104Connected) {
      return record('rcc-offline', 'RCC TCP/2404 is down; no SBO request was sent.', 'Control blocked', 'Error', 'IEC-104');
    }
    if (!mmsConnected || !selectedIed) return record('offline', mmsBlock, `${op} rejected`, 'Error');

    switch (op) {
      case 'READ': {
        const path = lanAUp && lanBUp ? 'LAN A and LAN B available' : lanAUp ? 'LAN A only' : 'LAN B only';
        return record('read', `${point.iecRef} = ${point.mmsVal} · Quality ${point.quality} · ${path}.`, 'GetDataValues', 'Read');
      }
      case 'WRITE': {
        const rcb = rcbs.find(block => block.datSet === point.dataSet);
        if (!rcb || faultMode === 'RCB_DISABLED') {
          return record('no-rcb', 'The selected report control block is unavailable for writes.', 'SetDataValues rejected', 'Error');
        }
        if (!rcb.enabled) toggleRcbEnabled(selectedIed.id, rcb.name);
        return record('write', `${rcb.name}.RptEna = TRUE${rcb.enabled ? ' (already enabled)' : ''}.`, 'SetDataValues', 'Write');
      }
      case 'GI': {
        const blocks = rcbs.filter(block => block.enabled && block.trgOps.includes('gi'));
        if (faultMode === 'RCB_DISABLED' || !blocks.length) {
          return record('no-rcb', 'No enabled RCB with the GI trigger is available.', 'General Interrogation rejected', 'Error');
        }
        triggerMmsGeneralInterrogation(selectedIed.id);
        const refreshed = mappingRows.filter(row => blocks.some(block => block.datSet === row.dataSet));
        const snapshot = refreshed.map(row => `${row.iecRef} = ${row.mmsVal}`).join('; ');
        return record('gi', `MMS GI snapshot: ${refreshed.length} lab points from ${blocks.map(block => block.datSet).join(', ')}. ${snapshot}`, 'General Interrogation', 'GI');
      }
      case 'CONTROL': {
        if (!associatedBay) return record('rejected', 'No breaker is mapped to the selected IED.', 'Control blocked', 'Error');
        if (faultMode === 'COMMAND_REJECTED') {
          return record('interlock', `Simulated CILO1 interlock rejected SBO; ${associatedBay.bayCode} remains ${associatedBay.breakerState}.`, 'C_DC_NA_1 negative confirmation', 'Error', 'IEC-104');
        }
        if (qualFlag === 'Invalid') return record('rejected', 'The selected bay quality is invalid; control was blocked.', 'SBO rejected', 'Error');
        const target = isClosed ? 'OPEN' : 'CLOSED';
        const accepted = commandBreaker(associatedBay.id, target, 'SCADA_SBO');
        if (!accepted) {
          const reason = useSubstationStore.getState().lastCommandFeedback?.message;
          return record('rejected', reason ?? `${associatedBay.bayCode} denied the breaker command.`, 'SBO negative confirmation', 'Error');
        }
        return record('controlled', `${associatedBay.bayCode} confirmed ${target} via CSWI1.Pos.SBOw / Oper.`, 'C_DC_NA_1 positive confirmation', 'Control', 'IEC-104');
      }
      case 'REPORT': return dispatchIec104Event(point);
    }
  };

  const scenario = MMS_SCENARIOS.find(item => item.id === scenarioId) ?? MMS_SCENARIOS[0];
  const runScenario = () => {
    setScenarioResult(null);
    setFaultMode(scenario.fault);
    setInFlight104(null);
    setRccFlash(false);
    setFlowState('IDLE');
    setScenarioToRun(scenario);
  };

  useEffect(() => {
    if (!scenarioToRun) return;
    const point = scenarioToRun.id === 'REPORT_URCB' ? mappingRows[2]
      : scenarioToRun.op === 'REPORT' ? mappingRows[0] : selectedPoint;
    const outcome = handleClientOp(scenarioToRun.op, point);
    const passed = outcome.code === scenarioToRun.expect
      && (scenarioToRun.fault !== 'LAN_A_DOWN' || (!lanAUp && lanBUp))
      && (scenarioToRun.fault !== 'LAN_B_DOWN' || (lanAUp && !lanBUp))
      && (scenarioToRun.fault !== 'BOTH_LANS_DOWN' || (!lanAUp && !lanBUp));
    setScenarioResult({ id: scenarioToRun.id, passed, detail: outcome.detail });
    setScenarioToRun(null);
  }, [scenarioToRun]);

  const clearScenario = () => {
    setFaultMode('NONE');
    setScenarioResult(null);
    setScenarioToRun(null);
    setInFlight104(null);
    setFlowState('IDLE');
    setRccFlash(false);
  };

  const handleReset = () => {
    clearScenario();
    setSpeed(0.1);
    setPlaying(true);
    setManualDisconnect(false);
    setLanAUp(true);
    setLanBUp(true);
    addLog({
      protocol: 'MMS', service: 'Lab reset',
      details: 'Cleared local fault overrides and reset playback to 0.1×.', result: 'Success', kind: 'Association',
    });
  };

  const currentLd =
    selectedIed?.logicalDevices.find((ld) => ld.ldInst === selectedLdInst) ||
    selectedIed?.logicalDevices[0];
  const nodes = currentLd?.logicalNodes || [];
  const selectedNode = nodes.find((ln) => `${ln.lnClass}${ln.lnInst}` === selectedNodeKey) || nodes[0];
  const brcbCount = (selectedIed?.rcbs || []).filter((r) => r.buffered && r.enabled).length;
  const urcbCount = (selectedIed?.rcbs || []).filter((r) => !r.buffered && r.enabled).length;

  const renderScenarioPanel = (compact: boolean) => (
    <section aria-labelledby="mms-scenario-heading" className={compact
      ? 'border-b border-[#0E6A94] bg-[#041626] px-3 py-2 space-y-2'
      : 'rounded-xl border border-[#0E6A94] bg-[#041626] p-4 space-y-3'}>
      <h3 id="mms-scenario-heading" className="font-extrabold text-white text-sm flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-[#F59E0B]" />
        MMS Tests, Faults &amp; Troubleshooting
      </h3>
      <div className="flex flex-wrap items-end gap-2">
        <label className="min-w-0 w-full sm:w-auto sm:max-w-full space-y-1">
          <span className="block font-bold text-[#BAE6FD]">Test or fault scenario</span>
          <select value={scenarioId} onChange={event => {
            const choice = MMS_SCENARIOS.find(item => item.id === event.target.value);
            if (choice) setScenarioId(choice.id);
          }} className="w-full sm:max-w-full px-3 py-2 rounded-lg bg-[#020E1B] border border-[#1B4B72] text-white">
            <optgroup label="Functional tests">
              {MMS_SCENARIOS.filter(item => item.fault === 'NONE').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </optgroup>
            <optgroup label="Fault scenarios">
              {MMS_SCENARIOS.filter(item => item.fault !== 'NONE').map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
            </optgroup>
          </select>
        </label>
        <button type="button" onClick={runScenario} className="px-3 py-2 rounded-lg border border-[#00DFFF] bg-[#083B5E] font-bold text-white">Run Scenario</button>
        <button type="button" onClick={clearScenario} className="px-3 py-2 rounded-lg border border-[#1E5680] bg-[#061B2E] font-bold text-[#BAE6FD]">Clear Scenario</button>
      </div>
      <div className={compact ? 'space-y-1 break-words' : 'rounded-lg border border-[#1E5680] bg-[#031220] p-3 space-y-2'}>
        <p><strong className="text-[#BAE6FD]">Active fault</strong> · {MMS_SCENARIOS.find(item => item.fault !== 'NONE' && item.fault === faultMode)?.label ?? 'None'}</p>
        <p><strong className="text-[#BAE6FD]">Expected</strong> · {scenario.expected}</p>
        {scenarioResult?.id === scenario.id && (
          <p role="status" className="break-words">
            <strong className={scenarioResult.passed ? 'text-[#4ADE80]' : 'text-[#FCA5A5]'}>{scenarioResult.passed ? 'PASS' : 'FAIL'}</strong>
            {' · '}{scenarioResult.detail}
          </p>
        )}
        {!compact && (
          <>
            <h4 className="font-bold text-white">Troubleshooting steps</h4>
            <ol className="list-decimal space-y-1 pl-5 text-[#BAE6FD]">
              {scenario.checks.map(step => <li key={step}>{step}</li>)}
            </ol>
          </>
        )}
      </div>
    </section>
  );

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
            IEC 61850-8-1 (MMS over TCP/102) | RCB (BRCB/URCB) | Read/Write | SBO Control | Gateway Protocol Conversion | Diagnostics
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

      {/* 2. EIGHT NAVIGATION TABS + ANIMATION SPEED CONTROLS */}
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
              { id: 'DIAGNOSTICS', label: 'Tests, Faults & Troubleshooting', icon: <Terminal className="w-3.5 h-3.5" /> },
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

        {/* Shared Playback & Speed Controls */}
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
          {([0.1, 0.25, 0.5, 1, 2, 4] as const).map((s) => (
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
                      setManualDisconnect(mmsConnected);
                      addLog({
                        protocol: 'MMS', service: mmsConnected ? 'Release Association' : 'MMS Initiate',
                        details: mmsConnected ? 'MMS association released by operator'
                          : manualDisconnect || !mmsBlock ? 'MMS association retry requested' : mmsBlock,
                        result: !mmsConnected && !manualDisconnect && mmsBlock ? 'Failed' : 'Success',
                        kind: 'Association',
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
                      ['CONTROL', 'Control', 'SBO'],
                      ['REPORT', 'Report', 'RCB'],
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
            <div className="flex min-w-0 flex-col gap-2.5">
              {/* System Topology — MMS Communication with Protocol Conversion */}
              <div
                className="rounded-xl border overflow-hidden shadow-xl"
                style={{
                  borderColor: '#00DFFF',
                  background: 'linear-gradient(180deg, #061A2E 0%, #030F1D 100%)',
                }}
              >
                <div className="px-4 py-2 border-b border-[#0E6A94] bg-gradient-to-r from-[#07304A] via-[#052038] to-[#07304A] flex flex-wrap items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-extrabold text-white">
                    System Topology — MMS Communication with Protocol Conversion
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px] font-mono">
                    <button
                      type="button"
                      disabled={faultMode === 'LAN_A_DOWN' || faultMode === 'BOTH_LANS_DOWN'}
                      onClick={() => setLanAUp((v) => !v)}
                      className={`px-2 py-0.5 rounded border font-bold ${lanAUp ? 'border-[#38BDF8] text-[#7DD3FC] bg-[#082F49]' : 'border-[#EF4444] text-[#FCA5A5] bg-[#3B0D15]'}`}
                    >
                      LAN A: {lanAUp ? 'UP' : 'DOWN'}
                    </button>
                    <button
                      type="button"
                      disabled={faultMode === 'LAN_B_DOWN' || faultMode === 'BOTH_LANS_DOWN'}
                      onClick={() => setLanBUp((v) => !v)}
                      className={`px-2 py-0.5 rounded border font-bold ${lanBUp ? 'border-[#C084FC] text-[#F0ABFC] bg-[#3B0764]' : 'border-[#EF4444] text-[#FCA5A5] bg-[#3B0D15]'}`}
                    >
                      LAN B: {lanBUp ? 'UP' : 'DOWN'}
                    </button>
                  </div>
                </div>

                {renderScenarioPanel(true)}

                <div className="p-2 overflow-x-auto">
                  <svg
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
                    <path id="mms-a1" d={cablePath(FLOW_PATHS.aIn)} fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanAUp ? undefined : '5 3'} />
                    <path id="mms-a2" d={cablePath(FLOW_PATHS.aOut)} fill="none" stroke={lanAUp ? '#38BDF8' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanAUp ? undefined : '5 3'} />
                    <path id="mms-b1" d={cablePath(FLOW_PATHS.bIn)} fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanBUp ? undefined : '5 3'} />
                    <path id="mms-b2" d={cablePath(FLOW_PATHS.bOut)} fill="none" stroke={lanBUp ? '#C084FC' : '#EF4444'} strokeWidth="2.8" strokeDasharray={lanBUp ? undefined : '5 3'} />

                    {/* Gateway -> RCC WAN / TCP-IP Link (Visually Distinct from PRP LAN A/B) */}
                    <path id="iec104-link" d={cablePath(FLOW_PATHS.wan)} fill="none" stroke={iec104Connected ? '#22C55E' : '#EF4444'} strokeWidth="3.2" strokeDasharray={iec104Connected ? undefined : '6 4'} />

                    {/* Port Connector Plugs */}
                    <rect x="255" y="110" width="6" height="8" rx="1" fill={lanAUp ? '#38BDF8' : '#EF4444'} />
                    <rect x="311" y="110" width="6" height="8" rx="1" fill={lanAUp ? '#38BDF8' : '#EF4444'} />
                    <rect x="255" y="194" width="6" height="8" rx="1" fill={lanBUp ? '#C084FC' : '#EF4444'} />
                    <rect x="311" y="194" width="6" height="8" rx="1" fill={lanBUp ? '#C084FC' : '#EF4444'} />

                    {/* One report cycle, mirrored on the available PRP paths before gateway conversion. */}
                    {inFlight104 && inFlight104.progress < GATEWAY_PROGRESS && (() => {
                      const progress = inFlight104.progress;
                      const firstLeg = progress < SWITCH_PROGRESS;
                      const legProgress = firstLeg ? progress / SWITCH_PROGRESS
                        : (progress - SWITCH_PROGRESS) / (GATEWAY_PROGRESS - SWITCH_PROGRESS);
                      return [
                        { lane: 'A', up: lanAUp, path: firstLeg ? FLOW_PATHS.aIn : FLOW_PATHS.aOut, color: '#38BDF8', labelOffset: -15 },
                        { lane: 'B', up: lanBUp, path: firstLeg ? FLOW_PATHS.bIn : FLOW_PATHS.bOut, color: '#C084FC', labelOffset: 17 },
                      ].filter(lane => lane.up).map(({ lane, path, color, labelOffset }) => {
                        const [x, y] = packetPosition(path, legProgress);
                        return (
                          <g key={lane} transform={`translate(${x} ${y})`} data-mms-lane={lane}>
                            <circle r="4.5" fill={color} stroke="#FFFFFF" strokeWidth="1" filter="url(#mmsGl)" />
                            <rect x="-52" y={labelOffset - 9} width="104" height="14" rx="7" fill="#061827" stroke={color} />
                            <text x="0" y={labelOffset + 1} textAnchor="middle" fill="#FFFFFF" fontSize="7" fontWeight="800">
                              LAN {lane} · {inFlight104.reportName}
                            </text>
                          </g>
                        );
                      });
                    })()}

                    {inFlight104 && inFlight104.progress >= GATEWAY_PROGRESS && inFlight104.progress < WAN_PROGRESS && (
                      <g>
                        <rect x="423" y="54" width="147" height="18" rx="6" fill="#05243A" stroke={inFlight104.block ? '#F59E0B' : '#38BDF8'} />
                        <text x="496.5" y="66" textAnchor="middle" fill="#FFFFFF" fontSize="8" fontWeight="800">
                          {inFlight104.block ? 'Gateway · checking failed stage' : 'Gateway · MMS → IEC-104 ASDU'}
                        </text>
                      </g>
                    )}

                    {inFlight104 && inFlight104.progress >= WAN_PROGRESS && iec104Connected && (() => {
                      const [px] = packetPosition(FLOW_PATHS.wan, (inFlight104.progress - WAN_PROGRESS) / (1 - WAN_PROGRESS));
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
                        ? rccState.rxCount === 0 ? rccState.value
                          : `${rccState.typeId} | CA=${rccState.ca} | IOA=${rccState.ioa} | ${rccState.value} | ${rccState.quality.toUpperCase()}`
                        : 'IEC-104 LINK DOWN — NO DATA RECEIVED'}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[#9ED8F6]">
                    <span>Stage: <b className="text-[#4ADE80]">{inFlight104 ? flowState.replace(/_/g, ' ') : flowState === 'FAILED' ? 'Flow stopped' : rccState.lastStage}</b></span>
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
                      <span data-mms-stage={flowState}>State: {flowState.replace(/_/g, ' ')}</span>
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
                    <div className="flex justify-between gap-2"><span className="text-[#8BB3D4] shrink-0">TX Status</span><b style={{ color: !iec104Connected ? '#F87171' : inFlight104 ? '#38BDF8' : '#4ADE80' }}>{!iec104Connected ? 'Failed / Down' : inFlight104 ? (flowState === 'IEC104_IN_FLIGHT' ? 'IEC-104 In-Flight' : 'Awaiting gateway TX') : flowState === 'FAILED' ? 'Blocked' : rccState.rxCount ? 'Last frame delivered' : 'Idle'}</b></div>
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
                  {logs.length === 0 && <text x="180" y="37" fill="#9ED8F6" textAnchor="middle" fontSize="10">Awaiting MMS transactions</text>}
                  {logs.slice(0, 7).reverse().map((entry, idx) => {
                    const colors = { Association: '#4ADE80', Read: '#38BDF8', Write: '#FACC15', Report: '#C084FC', Control: '#F87171', GI: '#94A3B8', Error: '#EF4444' };
                    const x = 24 + idx * 51;
                    const color = colors[entry.kind];
                    return (
                      <g key={idx}>
                        <title>{entry.time} · {entry.service} · {entry.result}</title>
                        <line x1={x} y1="28" x2={x} y2="54" stroke={color} strokeWidth="1.8" />
                        <circle cx={x} cy="28" r="4.5" fill={color} />
                        <text x={x} y="67" textAnchor="middle" fill="#8BB3D4" fontSize="7" fontFamily="monospace">{entry.time.slice(0, 8)}</text>
                      </g>
                    );
                  })}
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
                  ['Report Delivery', reportingAvailable, faultMode === 'RCB_DISABLED' ? 'Suppressed (RptEna=0)' : `BRCB:${brcbCount}, URCB:${urcbCount}`],
                  ['Last RCC Arrival', rccState.rxCount > 0, rccState.timestamp],
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
          <div className="overflow-x-auto"><table className="w-full text-left font-mono text-[11px]">
            <thead>
              <tr className="bg-[#082238] text-[#9ED8F6] border-b border-[#164463]">
                <th className="py-2 px-2">Name</th><th className="py-2 px-2">Type</th><th className="py-2 px-2">DataSet</th><th className="py-2 px-2">TrgOps</th><th className="py-2 px-2">IntgPd</th><th className="py-2 px-2">Client IP</th><th className="py-2 px-2">RptEna</th>
              </tr>
            </thead>
            <tbody>
              {(selectedIed?.rcbs || []).map((rcb) => (
                <tr key={rcb.name} className="border-b border-[#123952]">
                  <td className="py-2 px-2 text-white font-bold">{rcb.name}</td>
                  <td className="py-2 px-2 text-[#7DD3FC]">{rcb.buffered ? 'BRCB (Buffered)' : 'URCB (Unbuffered)'}</td>
                  <td className="py-2 px-2 text-[#BAE6FD]">{rcb.datSet}</td>
                  <td className="py-2 px-2">{rcb.trgOps.join(", ")}</td>
                  <td className="py-2 px-2">{rcb.intgPdMs} ms</td>
                  <td className="py-2 px-2">{rcb.clientIp}</td>
                  <td className="py-2 px-2">
                    <button
                      type="button"
                      disabled={!mmsConnected || faultMode === 'RCB_DISABLED'}
                      onClick={() => selectedIed && toggleRcbEnabled(selectedIed.id, rcb.name)}
                      className={`px-2.5 py-0.5 rounded border font-bold text-[10px] ${rcb.enabled && faultMode !== 'RCB_DISABLED' ? 'bg-[#063322] border-[#22C55E] text-[#4ADE80]' : 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]'}`}
                    >
                      {rcb.enabled && faultMode !== 'RCB_DISABLED' ? 'ENABLED' : 'DISABLED'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
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
              Execute SBO {isClosed ? 'OPEN' : 'CLOSE'} via IEC-104 (C_DC_NA_1 → CSWI1.Pos.SBOw / Oper)
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
                  <td className="py-1.5 px-2 text-[#BAE6FD]">{l.route ?? '—'}</td>
                  <td className="py-1.5 px-2 text-white">{l.service}</td>
                  <td className="py-1.5 px-2 text-[#9ED8F6]">{l.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'DIAGNOSTICS' && renderScenarioPanel(false)}
    </div>
  );
};
