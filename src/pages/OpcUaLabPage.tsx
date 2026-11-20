import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { buildOpcUaAddressSpace, OpcUaNodeEntry } from '../data/protocolRegistry';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Database,
  FileCode2,
  FolderTree,
  Layers,
  Lock,
  Monitor,
  Pause,
  Play,
  RefreshCw,
  RotateCcw,
  Send,
  Server,
  Settings,
  ShieldAlert,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

type OpcUaTab =
  | 'TOPOLOGY_LIVE'
  | 'ADDRESS_SPACE'
  | 'SUBSCRIPTIONS'
  | 'READ_WRITE'
  | 'SECURITY_CERTS'
  | 'CLIENT_CONFIG'
  | 'DIAGNOSTICS_LOGS'
  | 'FAULT_SIMULATION';

type OpcUaFaultMode =
  | 'NONE'
  | 'SERVER_DISCONNECTED'
  | 'ETH_LINK_FAILURE'
  | 'CERT_REJECTED'
  | 'POLICY_MISMATCH'
  | 'INVALID_CREDENTIALS'
  | 'BAD_NODE_ID'
  | 'BAD_NOT_WRITABLE'
  | 'SUBSCRIPTION_TIMEOUT'
  | 'SESSION_TIMEOUT';

type ClientConnStage = 'Disconnected' | 'Connecting' | 'SecureChannel' | 'Session' | 'Active';

interface PortPoint {
  x: number;
  y: number;
}

interface OpcUaLogEntry {
  id: number;
  time: string;
  service:
    | 'OpenSecureChannel'
    | 'CreateSession'
    | 'ActivateSession'
    | 'Browse'
    | 'Read'
    | 'Write'
    | 'CreateSubscription'
    | 'CreateMonitoredItems'
    | 'Publish'
    | 'DataChange'
    | 'CloseSession';
  direction: 'Client → Server' | 'Server → Client';
  details: string;
  statusCode: string;
  result: 'Success' | 'Delivered' | 'Rejected' | 'Failed';
}

interface OpcUaSubscription {
  id: string;
  publishingIntervalMs: number;
  samplingIntervalMs: number;
  queueSize: number;
  monitoringMode: 'Reporting' | 'Sampling' | 'Disabled';
  active: boolean;
  notifications: number;
}

interface InFlightOpcPacket {
  id: number;
  direction: 'SERVER_TO_CLIENT' | 'CLIENT_TO_SERVER';
  kind: 'DATACHANGE' | 'READ_WRITE' | 'SESSION';
  progress: number;
  label1: string;
  label2: string;
}

const HISTORIAN_EMBEDDED_FALLBACK = 'data:image/webp;base64,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';

const OPC_HW = {
  SCADA_SERVER: 'assets/signal-chain/scada-hmi.png',
  SWITCH: 'assets/devices/hirschmann-rsp35.png',
  HISTORIAN_CLIENT: 'assets/devices/historian-workstation.png',
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
      return {
        x: a.x + (b.x - a.x) * ratio,
        y: a.y + (b.y - a.y) * ratio,
        angleDeg: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI,
      };
    }
    target -= segLens[i];
  }
  return { x: pts[0].x, y: pts[0].y, angleDeg: 0 };
}

export const OpcUaLabPage: React.FC = () => {
  const { bays, commandBreaker } = useSubstationStore();

  // Navigation & Playback Controls (Default 0.5x)
  const [activeTab, setActiveTab] = useState<OpcUaTab>('TOPOLOGY_LIVE');
  const [speed, setSpeed] = useState<0.5 | 1 | 2 | 4>(0.5);
  const [playing, setPlaying] = useState<boolean>(true);

  // Server Configuration State (Simulated)
  const [serverRunning, setServerRunning] = useState<boolean>(true);
  const [serverEndpoint, setServerEndpoint] = useState<string>('opc.tcp://10.132.10.200:4840');
  const [applicationUri, setApplicationUri] = useState<string>('urn:sas:scada:server');
  const [namespaceUri, setNamespaceUri] = useState<string>('urn:sas:iec61850:substation');
  const [serverName, setServerName] = useState<string>('SCADA / OPC UA Server A');
  const [serverPolicy, setServerPolicy] = useState<'Basic256Sha256' | 'Aes128_Sha256_RsaOaep' | 'None'>('Basic256Sha256');
  const [serverMode, setServerMode] = useState<'Sign & Encrypt' | 'Sign' | 'None'>('Sign & Encrypt');
  const [serverAuthMode, setServerAuthMode] = useState<'Username / Password' | 'X.509 Certificate' | 'Anonymous'>('Username / Password');

  // Client Configuration & Connection State Machine
  const [clientEndpoint, setClientEndpoint] = useState<string>('opc.tcp://10.132.10.200:4840');
  const [clientPolicy, setClientPolicy] = useState<'Basic256Sha256' | 'Aes128_Sha256_RsaOaep' | 'None'>('Basic256Sha256');
  const [clientMode, setClientMode] = useState<'Sign & Encrypt' | 'Sign' | 'None'>('Sign & Encrypt');
  const [clientUsername, setClientUsername] = useState<string>('sas_client');
  const [clientPassword, setClientPassword] = useState<string>('Substation@2026');
  const [clientCertTrusted, setClientCertTrusted] = useState<boolean>(true);
  const [connStage, setConnStage] = useState<ClientConnStage>('Active');
  const [sessionId] = useState<string>('ns=1;i=9B4A-48F1');

  // Fault Injection & Filters
  const [faultMode, setFaultMode] = useState<OpcUaFaultMode>('NONE');
  const [filterMode, setFilterMode] = useState<'ALL' | '132' | '33' | '11' | 'BREAKER' | 'ANALOG'>('ALL');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    ROOT: true,
    SUB: true,
    '132kV': true,
    '33kV': false,
    '11kV': false,
  });

  // Subscriptions & Monitored Items
  const [subscriptions, setSubscriptions] = useState<OpcUaSubscription[]>([
    {
      id: 'Sub_01',
      publishingIntervalMs: 500,
      samplingIntervalMs: 250,
      queueSize: 10,
      monitoringMode: 'Reporting',
      active: true,
      notifications: 142,
    },
  ]);
  const [monitoredMap, setMonitoredMap] = useState<Record<string, boolean>>({});
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null);

  // Selected Node & Read/Write State
  const [selectedNodeId, setSelectedNodeId] = useState<string>('ns=2;s=SAS.132kV.132_L1.CB.Pos.ctlVal');
  const [writeDesiredVal, setWriteDesiredVal] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [interlockPermissive, setInterlockPermissive] = useState<boolean>(true);
  const [rwFeedback, setRwFeedback] = useState<string>('Ready — Select a writable command node (*.ctlVal) or Read any signal node.');
  const [showCertModal, setShowCertModal] = useState<boolean>(false);

  // Live Packet & Message Log
  const [inFlight, setInFlight] = useState<InFlightOpcPacket | null>(null);
  const [logs, setLogs] = useState<OpcUaLogEntry[]>(() => [
    {
      id: 4,
      time: nowTimeMs(),
      service: 'DataChange',
      direction: 'Server → Client',
      details: 'Sub_01 Publish: 6 MonitoredItems updated (V, I, P, CB, Freq)',
      statusCode: 'Good (0x00000000)',
      result: 'Delivered',
    },
    {
      id: 3,
      time: nowTimeMs(),
      service: 'CreateSubscription',
      direction: 'Client → Server',
      details: 'Sub_01 · PublishingInterval=500 ms · QueueSize=10',
      statusCode: 'Good (0x00000000)',
      result: 'Success',
    },
    {
      id: 2,
      time: nowTimeMs(),
      service: 'CreateSession',
      direction: 'Client → Server',
      details: 'Session ns=1;i=9B4A-48F1 (sas_client)',
      statusCode: 'Good (0x00000000)',
      result: 'Success',
    },
    {
      id: 1,
      time: nowTimeMs(),
      service: 'OpenSecureChannel',
      direction: 'Client → Server',
      details: 'Basic256Sha256 · Sign & Encrypt · X.509 Trust Verified (Simulated)',
      statusCode: 'Good (0x00000000)',
      result: 'Success',
    },
  ]);

  // DOM Refs for ResizeObserver port-to-port SVG overlay
  const topoWrapRef = useRef<HTMLDivElement | null>(null);
  const srvPortRef = useRef<HTMLDivElement | null>(null);
  const swP1Ref = useRef<HTMLDivElement | null>(null);
  const swP5Ref = useRef<HTMLDivElement | null>(null);
  const cliPortRef = useRef<HTMLDivElement | null>(null);

  const [geom, setGeom] = useState<{
    w: number;
    h: number;
    c1: PortPoint[]; // SCADA Server ETH -> Switch P1
    c2: PortPoint[]; // Switch P5 -> Historian Client ETH
  } | null>(null);

  const nextIdRef = useRef<number>(20);
  const cursorRef = useRef<number>(0);

  // Build OPC UA Address Space directly from existing shared substation bays + add dedicated writable command nodes (*.CB.Pos.ctlVal)
  // Engineering accuracy: Breaker status (*.XCBR1.Pos.stVal) is strictly CurrentRead; control commands use separate *.CB.Pos.ctlVal!
  const addressSpaceNodes: OpcUaNodeEntry[] = useMemo(() => {
    const base = buildOpcUaAddressSpace(bays).map((n) =>
      n.nodeId.endsWith('XCBR1.Pos.stVal') ? { ...n, accessLevel: 'CurrentRead' as const } : n
    );
    const nowStr = nowTimeMs();
    const cmdNodes: OpcUaNodeEntry[] = bays.slice(0, 8).map((bay) => ({
      nodeId: `ns=2;s=SAS.${bay.voltageKv}kV.${bay.bayCode.replace(/-/g, '_')}.CB.Pos.ctlVal`,
      browseName: `2:CB_Pos_ctlVal`,
      displayName: `${bay.bayCode} Breaker Command (Writable Control)`,
      nodeClass: 'Variable',
      bayCode: bay.bayCode,
      dataType: 'Boolean',
      accessLevel: 'CurrentRead | CurrentWrite',
      sourceProtocol: 'IEC 61850 MMS Control (CSWI1.Pos.Oper)',
      sourceIecRef: `${bay.iedId.replace(/-/g, '_')}Application/CSWI1.Pos.Oper.ctlVal`,
      valueText: bay.breakerState,
      statusCode: bay.quality === 'GOOD' ? 'Good (0x00000000)' : 'Bad (0x80000000)',
      sourceTimestamp: nowStr,
      serverTimestamp: nowStr,
    }));
    const freqNode: OpcUaNodeEntry = {
      nodeId: 'ns=2;s=SAS.Station.MMXU1.Hz',
      browseName: '2:Station_Frequency_Hz',
      displayName: 'Station System Frequency (Hz)',
      nodeClass: 'Variable',
      bayCode: 'STATION',
      dataType: 'Double',
      accessLevel: 'CurrentRead',
      sourceProtocol: 'IEC 61850 MMS (TCP/102)',
      sourceIecRef: 'STATION_MEAS/MMXU1.Hz.mag.f',
      valueText: `${(bays[0]?.frequencyHz ?? 50.01).toFixed(2)} Hz`,
      statusCode: 'Good (0x00000000)',
      sourceTimestamp: nowStr,
      serverTimestamp: nowStr,
    };
    return [...cmdNodes, ...base, freqNode];
  }, [bays]);

  const filteredNodes = useMemo(() => {
    return addressSpaceNodes.filter((n) => {
      if (filterMode === 'ALL') return true;
      if (filterMode === '132' || filterMode === '33' || filterMode === '11') {
        return n.nodeId.includes(`SAS.${filterMode}kV.`);
      }
      if (filterMode === 'BREAKER') return n.nodeId.includes('Pos.');
      if (filterMode === 'ANALOG') return n.nodeId.includes('MMXU1');
      return true;
    });
  }, [addressSpaceNodes, filterMode]);

  const selectedNode = useMemo(
    () => addressSpaceNodes.find((n) => n.nodeId === selectedNodeId) || addressSpaceNodes[0],
    [addressSpaceNodes, selectedNodeId]
  );

  // Derived connection & security validation
  const policyMatches = serverPolicy === clientPolicy && serverMode === clientMode && faultMode !== 'POLICY_MISMATCH';
  const certValid = clientCertTrusted && faultMode !== 'CERT_REJECTED';
  const credsValid = clientUsername.trim().length > 0 && clientPassword.length >= 4 && faultMode !== 'INVALID_CREDENTIALS';
  const ethUp = faultMode !== 'ETH_LINK_FAILURE';
  const serverUp = serverRunning && faultMode !== 'SERVER_DISCONNECTED';
  const sessionHealthy =
    serverUp &&
    ethUp &&
    policyMatches &&
    certValid &&
    credsValid &&
    connStage === 'Active' &&
    faultMode !== 'SESSION_TIMEOUT' &&
    faultMode !== 'SUBSCRIPTION_TIMEOUT';

  const effectiveStatusCode = !serverUp
    ? 'BadServerHalted (0x800E0000)'
    : !ethUp
    ? 'BadCommunicationError (0x80050000)'
    : !certValid
    ? 'BadCertificateUntrusted (0x801A0000)'
    : !policyMatches
    ? 'BadSecurityPolicyRejected (0x80550000)'
    : !credsValid
    ? 'BadUserAccessDenied (0x801F0000)'
    : faultMode === 'SESSION_TIMEOUT'
    ? 'BadSessionIdInvalid (0x80250000)'
    : faultMode === 'SUBSCRIPTION_TIMEOUT'
    ? 'BadSubscriptionIdInvalid (0x80280000)'
    : faultMode === 'BAD_NODE_ID'
    ? 'BadNodeIdUnknown (0x80340000)'
    : 'Good (0x00000000)';

  const monitoredCount = useMemo(() => {
    const activeEntries = addressSpaceNodes.filter((n) => monitoredMap[n.nodeId] !== false);
    return activeEntries.length;
  }, [addressSpaceNodes, monitoredMap]);

  // Helpers declared BEFORE any effects (zero TDZ)
  const appendLog = (entry: Omit<OpcUaLogEntry, 'id' | 'time'>) => {
    const id = nextIdRef.current++;
    setLogs((prev) => [{ id, time: nowTimeMs(), ...entry }, ...prev].slice(0, 35));
  };

  const launchPacket = (
    direction: 'SERVER_TO_CLIENT' | 'CLIENT_TO_SERVER',
    kind: 'DATACHANGE' | 'READ_WRITE' | 'SESSION',
    label1: string,
    label2: string
  ) => {
    if (!ethUp || !serverUp) return;
    const id = nextIdRef.current++;
    setInFlight({ id, direction, kind, progress: 0, label1, label2 });
  };

  const measureTopology = () => {
    const w = topoWrapRef.current;
    const s = srvPortRef.current;
    const p1 = swP1Ref.current;
    const p5 = swP5Ref.current;
    const c = cliPortRef.current;
    if (!w || !s || !p1 || !p5 || !c) return;
    const cr = w.getBoundingClientRect();
    if (cr.width < 100 || cr.height < 80) return;
    const ctr = (el: HTMLElement): PortPoint => {
      const r = el.getBoundingClientRect();
      return { x: r.left - cr.left + r.width / 2, y: r.top - cr.top + r.height / 2 };
    };
    const pSrv = ctr(s);
    const pSw1 = ctr(p1);
    const pSw5 = ctr(p5);
    const pCli = ctr(c);
    const trayY = Math.max(pSrv.y, pSw1.y, pSw5.y, pCli.y) + 18;
    setGeom({
      w: cr.width,
      h: cr.height,
      c1: [pSrv, { x: pSrv.x, y: trayY }, { x: pSw1.x, y: trayY }, pSw1],
      c2: [pSw5, { x: pSw5.x, y: trayY }, { x: pCli.x, y: trayY }, pCli],
    });
  };

  useEffect(() => {
    if (activeTab !== 'TOPOLOGY_LIVE') return;
    const w = topoWrapRef.current;
    if (!w) return;
    window.requestAnimationFrame(measureTopology);
    const t1 = window.setTimeout(measureTopology, 120);
    const t2 = window.setTimeout(measureTopology, 360);
    const ro = new ResizeObserver(() => measureTopology());
    ro.observe(w);
    window.addEventListener('resize', measureTopology);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      ro.disconnect();
      window.removeEventListener('resize', measureTopology);
    };
  }, [activeTab]);

  // Periodic OPC UA DataChange Publish notifications (driven by active subscription & 0.5x default speed)
  useEffect(() => {
    const activeSub = subscriptions.find((s) => s.active && s.monitoringMode === 'Reporting');
    if (!playing || !sessionHealthy || !activeSub || inFlight || filteredNodes.length === 0) return;
    const delayMs = Math.max(500, Math.round(activeSub.publishingIntervalMs * 2 / speed));
    const tid = window.setTimeout(() => {
      const node = filteredNodes[cursorRef.current % Math.min(8, filteredNodes.length)];
      cursorRef.current += 1;
      launchPacket(
        'SERVER_TO_CLIENT',
        'DATACHANGE',
        `Publish (DataChange) · ${activeSub.id}`,
        `${node.browseName.replace('2:', '')} = ${node.valueText}`
      );
      setHighlightedNodeId(node.nodeId);
      window.setTimeout(() => setHighlightedNodeId(null), 550);
      setSubscriptions((prev) =>
        prev.map((s) => (s.id === activeSub.id ? { ...s, notifications: s.notifications + 1 } : s))
      );
      appendLog({
        service: 'DataChange',
        direction: 'Server → Client',
        details: `${activeSub.id} · ${node.nodeId} = ${node.valueText}`,
        statusCode: 'Good (0x00000000)',
        result: 'Delivered',
      });
    }, delayMs);
    return () => window.clearTimeout(tid);
  }, [playing, speed, sessionHealthy, subscriptions, inFlight, filteredNodes]);

  // Smooth requestAnimationFrame packet motion along ResizeObserver-measured cables
  useEffect(() => {
    if (!playing || !inFlight) return;
    let rafId = 0;
    let lastTs = performance.now();
    const durMs = 1700 / speed; // 0.5x = 3400ms readable speed

    const step = (now: number) => {
      const dt = now - lastTs;
      lastTs = now;
      setInFlight((cur) => {
        if (!cur) return null;
        const nextP = cur.progress + dt / durMs;
        if (nextP >= 1) return null;
        return { ...cur, progress: nextP };
      });
      rafId = window.requestAnimationFrame(step);
    };
    rafId = window.requestAnimationFrame(step);
    return () => window.cancelAnimationFrame(rafId);
  }, [playing, speed, inFlight?.id]);

  // Client Connect Sequence: Disconnected -> Connecting -> SecureChannel -> Session -> Active
  const handleConnectClient = () => {
    if (!serverUp || !ethUp) {
      setConnStage('Disconnected');
      appendLog({
        service: 'OpenSecureChannel',
        direction: 'Client → Server',
        details: `Failed to reach ${clientEndpoint}`,
        statusCode: effectiveStatusCode,
        result: 'Failed',
      });
      return;
    }
    setConnStage('Connecting');
    launchPacket('CLIENT_TO_SERVER', 'SESSION', 'OpenSecureChannel', `${clientPolicy} · ${clientMode}`);
    window.setTimeout(() => {
      if (!certValid || !policyMatches) {
        setConnStage('Disconnected');
        appendLog({
          service: 'OpenSecureChannel',
          direction: 'Client → Server',
          details: !certValid ? 'Client X.509 certificate rejected by Server Trust List' : 'Security policy/mode mismatch',
          statusCode: !certValid ? 'BadCertificateUntrusted (0x801A0000)' : 'BadSecurityPolicyRejected (0x80550000)',
          result: 'Rejected',
        });
        return;
      }
      setConnStage('SecureChannel');
      appendLog({
        service: 'OpenSecureChannel',
        direction: 'Client → Server',
        details: `${clientPolicy} (${clientMode}) SecureChannel opened`,
        statusCode: 'Good (0x00000000)',
        result: 'Success',
      });
      window.setTimeout(() => {
        if (!credsValid) {
          setConnStage('Disconnected');
          appendLog({
            service: 'ActivateSession',
            direction: 'Client → Server',
            details: `Authentication rejected for user "${clientUsername}"`,
            statusCode: 'BadUserAccessDenied (0x801F0000)',
            result: 'Rejected',
          });
          return;
        }
        setConnStage('Session');
        appendLog({
          service: 'CreateSession',
          direction: 'Client → Server',
          details: `Session ${sessionId} created & activated`,
          statusCode: 'Good (0x00000000)',
          result: 'Success',
        });
        window.setTimeout(() => {
          setConnStage('Active');
        }, 350);
      }, 450);
    }, 450);
  };

  const handleDisconnectClient = () => {
    setConnStage('Disconnected');
    setInFlight(null);
    appendLog({
      service: 'CloseSession',
      direction: 'Client → Server',
      details: `Session ${sessionId} closed cleanly`,
      statusCode: 'Good (0x00000000)',
      result: 'Success',
    });
  };

  // OPC UA Read Operation
  const handleReadNode = () => {
    if (!sessionHealthy) {
      setRwFeedback(`Read failed: ${effectiveStatusCode}`);
      return;
    }
    if (faultMode === 'BAD_NODE_ID') {
      setRwFeedback(`Read failed: BadNodeIdUnknown (0x80340000) for ${selectedNode.nodeId}`);
      appendLog({
        service: 'Read',
        direction: 'Client → Server',
        details: `Read ${selectedNode.nodeId} failed`,
        statusCode: 'BadNodeIdUnknown (0x80340000)',
        result: 'Failed',
      });
      return;
    }
    launchPacket('CLIENT_TO_SERVER', 'READ_WRITE', `OPC UA Read`, selectedNode.browseName.replace('2:', ''));
    setRwFeedback(`Read OK · ${selectedNode.nodeId} = ${selectedNode.valueText} (StatusCode: Good 0x00000000)`);
    appendLog({
      service: 'Read',
      direction: 'Client → Server',
      details: `Read ${selectedNode.nodeId} → ${selectedNode.valueText}`,
      statusCode: 'Good (0x00000000)',
      result: 'Success',
    });
  };

  // OPC UA Write Operation (Enforces CurrentWrite, Interlocks & Separates Command Node from Status Node!)
  const handleWriteNode = () => {
    if (!sessionHealthy) {
      setRwFeedback(`Write failed: ${effectiveStatusCode}`);
      return;
    }
    if (faultMode === 'BAD_NOT_WRITABLE' || !selectedNode.accessLevel.includes('CurrentWrite')) {
      setRwFeedback(
        `Write rejected: BadNotWritable (0x803B0000) — "${selectedNode.nodeId}" is Read-Only. Select a writable command node (*.CB.Pos.ctlVal) for breaker control.`
      );
      appendLog({
        service: 'Write',
        direction: 'Client → Server',
        details: `Write rejected on read-only node ${selectedNode.nodeId}`,
        statusCode: 'BadNotWritable (0x803B0000)',
        result: 'Rejected',
      });
      return;
    }
    if (!interlockPermissive) {
      setRwFeedback(`Write rejected: BadConditionNotSatisfied — Bay interlocking permissive blocked on ${selectedNode.bayCode}.`);
      appendLog({
        service: 'Write',
        direction: 'Client → Server',
        details: `Interlock blocked command on ${selectedNode.nodeId}`,
        statusCode: 'BadUserAccessDenied (0x801F0000)',
        result: 'Rejected',
      });
      return;
    }

    launchPacket('CLIENT_TO_SERVER', 'READ_WRITE', `OPC UA Write`, `${selectedNode.bayCode} → ${writeDesiredVal}`);
    const targetBay = bays.find((b) => b.bayCode === selectedNode.bayCode);
    if (targetBay) {
      commandBreaker(targetBay.id, writeDesiredVal);
      setRwFeedback(
        `Write OK (Good 0x00000000) · ${selectedNode.nodeId} = ${writeDesiredVal} → SCADA forwarded MMS CSWI1.Pos.Oper → ${targetBay.bayCode} Breaker ${writeDesiredVal}`
      );
      appendLog({
        service: 'Write',
        direction: 'Client → Server',
        details: `Write ${selectedNode.nodeId} = ${writeDesiredVal} (Authorized + Interlock OK)`,
        statusCode: 'Good (0x00000000)',
        result: 'Success',
      });
    }
  };

  const handleReset = () => {
    setSpeed(0.5);
    setPlaying(true);
    setServerRunning(true);
    setFaultMode('NONE');
    setClientCertTrusted(true);
    setServerPolicy('Basic256Sha256');
    setClientPolicy('Basic256Sha256');
    setServerMode('Sign & Encrypt');
    setClientMode('Sign & Encrypt');
    setConnStage('Active');
    setInFlight(null);
  };

  // Sample exact packet position along ResizeObserver-measured cables
  const pktPos = useMemo(() => {
    if (!inFlight || !geom) return null;
    const fwd: PortPoint[] = [...geom.c1, ...geom.c2];
    const route = inFlight.direction === 'SERVER_TO_CLIENT' ? fwd : [...fwd].reverse();
    return samplePolyline(route, inFlight.progress);
  }, [inFlight, geom]);

  const tabs: { id: OpcUaTab; label: string }[] = [
    { id: 'TOPOLOGY_LIVE', label: 'Topology & Live Data' },
    { id: 'ADDRESS_SPACE', label: 'Address Space Browser' },
    { id: 'SUBSCRIPTIONS', label: 'Subscriptions' },
    { id: 'READ_WRITE', label: 'Read / Write' },
    { id: 'SECURITY_CERTS', label: 'Security & Certificates' },
    { id: 'CLIENT_CONFIG', label: 'Client Configuration' },
    { id: 'DIAGNOSTICS_LOGS', label: 'Diagnostics & Logs' },
    { id: 'FAULT_SIMULATION', label: 'Fault & Simulation' },
  ];

  const faultScenarios: { id: OpcUaFaultMode; label: string; group: string }[] = [
    { id: 'NONE', label: 'Normal Operation (Recovery)', group: 'Healthy' },
    { id: 'SERVER_DISCONNECTED', label: 'Server Disconnected / Halted', group: 'Server' },
    { id: 'ETH_LINK_FAILURE', label: 'Ethernet Link Failure (Switch)', group: 'Network' },
    { id: 'CERT_REJECTED', label: 'X.509 Certificate Rejected', group: 'Security' },
    { id: 'POLICY_MISMATCH', label: 'Security Policy Mismatch', group: 'Security' },
    { id: 'INVALID_CREDENTIALS', label: 'Invalid Client Credentials', group: 'Auth' },
    { id: 'BAD_NODE_ID', label: 'BadNodeIdUnknown (0x80340000)', group: 'Address Space' },
    { id: 'BAD_NOT_WRITABLE', label: 'BadNotWritable (0x803B0000)', group: 'Access' },
    { id: 'SUBSCRIPTION_TIMEOUT', label: 'Subscription Timeout', group: 'PubSub' },
    { id: 'SESSION_TIMEOUT', label: 'Session Timeout', group: 'Session' },
  ];

  if (!selectedNode) {
    return (
      <div className="p-6 text-slate-300 bg-[#030B18] rounded-xl border border-[#1B4B72]">
        Loading OPC UA Lab V2 address space...
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
              OPC UA Lab V2 — Complete Setup &amp; Data Exchange
            </h2>
            <span className="px-2 py-0.5 rounded bg-[#082038] border border-[#1E5280] text-[#7DD3FC] font-mono text-[10px] font-bold">
              SIMULATED SERVER
            </span>
          </div>
          <p className="text-[11px] text-[#9BC0DF] mt-0.5">
            SCADA OPC UA Server ↔ Industrial Network ↔ OPC UA Client (Historian / Analytics) | Secure, Standardized, Real-Time Data
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-bold">
          <span
            style={{
              backgroundColor: sessionHealthy ? '#06291E' : '#3B0D15',
              borderColor: sessionHealthy ? '#22C55E' : '#EF4444',
              color: sessionHealthy ? '#4ADE80' : '#FCA5A5',
            }}
            className="rounded-lg border px-2.5 py-1"
          >
            ● OPC UA Session: {sessionHealthy ? 'ACTIVE' : connStage.toUpperCase()}
          </span>
          <span className="rounded-lg border border-[#1E5280] bg-[#082038] px-2.5 py-1 font-mono text-[#7DD3FC]">
            Endpoint: {serverEndpoint}
          </span>
          <span className="rounded-lg border border-[#22C55E] bg-[#06291E] px-2.5 py-1 font-mono text-[#4ADE80]">
            Security: {serverPolicy}
          </span>
          <span className="rounded-lg border border-[#1E5280] bg-[#082038] px-2.5 py-1 font-mono text-[#BAE6FD]">
            Mode: {serverMode}
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

      {/* TAB 1: TOPOLOGY & LIVE DATA (EXACT REFERENCE IMAGE LAYOUT) */}
      {activeTab === 'TOPOLOGY_LIVE' && (
        <div className="space-y-3">
          {/* TOP 3-PANEL ROW: OPC UA Server (SCADA) | Central 3-Device Topology | OPC UA Client (Historian) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-stretch">
            {/* LEFT: OPC UA Server (SCADA) — 3 cols */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="xl:col-span-3 rounded-xl border p-3 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Server className="w-4 h-4 text-[#00CFFF]" />
                  <span>OPC UA Server (SCADA)</span>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 flex flex-col items-center justify-center rounded-lg border border-[#173C5E] bg-[#040E1A] p-2">
                  <img src={OPC_HW.SCADA_SERVER} alt="SCADA OPC UA Server A" className="h-[96px] w-auto object-contain" />
                  <span className="text-[9px] font-mono text-[#BAE6FD] mt-1 text-center leading-tight">{serverName}</span>
                </div>
                <div className="col-span-7 space-y-1 text-[10px]">
                  <div style={{ color: serverUp ? '#4ADE80' : '#F87171' }} className="font-extrabold text-[10.5px]">
                    ● {serverUp ? 'SERVER RUNNING' : 'SERVER STOPPED'}
                  </div>
                  {[
                    ['Endpoint', serverEndpoint.replace('opc.tcp://', ''), '#7DD3FC'],
                    ['Namespace', 'ns=2 (iec61850)', '#BAE6FD'],
                    ['Policy', serverPolicy, '#FFFFFF'],
                    ['Mode', serverMode, '#4ADE80'],
                    ['Cert', certValid ? 'Valid (X.509 Sim)' : 'Rejected', certValid ? '#4ADE80' : '#F87171'],
                    ['App URI', applicationUri, '#9BC0DF'],
                  ].map(([k, v, c]) => (
                    <div key={k} className="flex justify-between gap-1 border-b border-[#122E49] pb-0.5 last:border-0">
                      <span className="text-[#8BB3D4]">{k}</span>
                      <span style={{ color: c }} className="font-mono font-bold text-right truncate">{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER: System Topology — OPC UA Communication Setup (6 cols) */}
            <div style={{ backgroundColor: '#051324', borderColor: '#1B4B72' }} className="xl:col-span-6 rounded-xl border p-3 flex flex-col justify-between min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Layers className="w-4 h-4 text-[#00CFFF]" />
                  <span>System Topology — OPC UA Communication Setup</span>
                </div>
                <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
                  <span className="rounded border border-[#0EA5E9] bg-[#061C31] px-2 py-0.5 text-[#7DD3FC]">
                    Publish (DataChange) →
                  </span>
                  <span className="rounded border border-[#22C55E] bg-[#06291E] px-2 py-0.5 text-[#86EFAC]">
                    ← Read / Write
                  </span>
                </div>
              </div>

              <div
                ref={topoWrapRef}
                className="relative w-full rounded-lg border border-[#14395C] bg-[#030D1A] px-3 pt-3 pb-11 overflow-hidden"
              >
                <div className="relative z-10 grid grid-cols-3 gap-3 items-end">
                  {/* Device A: SCADA / HMI (OPC UA Server) */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative h-[96px] flex items-end justify-center">
                      <div className="relative inline-flex items-center">
                        <img src={OPC_HW.SCADA_SERVER} onLoad={measureTopology} alt="SCADA OPC UA Server" className="h-[90px] w-auto object-contain" />
                        <div
                          ref={srvPortRef}
                          style={{ right: '10%', bottom: '8%' }}
                          className="absolute flex flex-col items-center"
                        >
                          <span className="w-3 h-2.5 rounded-[2px] border border-[#38BDF8] bg-[#04182B] block" />
                          <span className="text-[7px] font-mono font-bold text-[#7DD3FC] bg-[#020B16]/90 px-1 rounded">ETH1</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-7 text-center leading-tight">
                      <div className="text-[10.5px] font-extrabold text-white">SCADA / HMI</div>
                      <div className="text-[8.5px] font-mono text-[#7DD3FC]">(OPC UA Server)</div>
                      <div className="text-[8.5px] font-mono font-bold text-[#38BDF8]">10.132.10.200:4840</div>
                    </div>
                  </div>

                  {/* Device B: Hirschmann RSP35 */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative h-[96px] flex items-end justify-center">
                      <div className="relative inline-flex items-center">
                        <img src={OPC_HW.SWITCH} onLoad={measureTopology} alt="Hirschmann RSP35" className="h-[74px] w-auto object-contain" />
                        <div ref={swP1Ref} style={{ left: '30%', bottom: '10%' }} className="absolute flex flex-col items-center">
                          <span className="w-3 h-2.5 rounded-[2px] border border-[#38BDF8] bg-[#04182B] block" />
                          <span className="text-[7px] font-mono font-bold text-[#7DD3FC] bg-[#020B16]/90 px-1 rounded">P1</span>
                        </div>
                        <div ref={swP5Ref} style={{ left: '64%', bottom: '10%' }} className="absolute flex flex-col items-center">
                          <span className="w-3 h-2.5 rounded-[2px] border border-[#38BDF8] bg-[#04182B] block" />
                          <span className="text-[7px] font-mono font-bold text-[#7DD3FC] bg-[#020B16]/90 px-1 rounded">P5</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-7 text-center leading-tight">
                      <div className="text-[10.5px] font-extrabold text-white">Hirschmann RSP35</div>
                      <div className="text-[8.5px] font-mono text-[#94A3B8]">(Station LAN · P1 ↔ P5)</div>
                      <div className="text-[8.5px] font-mono font-bold text-[#7DD3FC]">192.168.100.10</div>
                    </div>
                  </div>

                  {/* Device C: Historian / Analytics (OPC UA Client) */}
                  <div className="flex flex-col items-center min-w-0">
                    <div className="relative h-[96px] flex items-end justify-center">
                      <div className="relative inline-flex items-center">
                        <img
                          src={OPC_HW.HISTORIAN_CLIENT}
                          onError={(e) => {
                            if (e.currentTarget.src !== HISTORIAN_EMBEDDED_FALLBACK) {
                              e.currentTarget.src = HISTORIAN_EMBEDDED_FALLBACK;
                            }
                          }}
                          onLoad={measureTopology}
                          alt="Historian Analytics OPC UA Client"
                          className="h-[90px] w-auto object-contain"
                        />
                        <div ref={cliPortRef} style={{ left: '10%', bottom: '8%' }} className="absolute flex flex-col items-center">
                          <span className="w-3 h-2.5 rounded-[2px] border border-[#4ADE80] bg-[#021A10] block" />
                          <span className="text-[7px] font-mono font-bold text-[#86EFAC] bg-[#020B16]/90 px-1 rounded">ETH1</span>
                        </div>
                      </div>
                    </div>
                    <div className="mt-7 text-center leading-tight">
                      <div className="text-[10.5px] font-extrabold text-white">Historian / Analytics</div>
                      <div className="text-[8.5px] font-mono text-[#86EFAC]">(OPC UA Client)</div>
                      <div className="text-[8.5px] font-mono font-bold text-[#4ADE80]">10.132.10.220</div>
                    </div>
                  </div>
                </div>

                {/* RESIZEOBSERVER PORT-TO-PORT SVG CABLE & PACKET OVERLAY */}
                {geom && (
                  <svg width={geom.w} height={geom.h} viewBox={`0 0 ${geom.w} ${geom.h}`} className="absolute inset-0 z-20 pointer-events-none">
                    <path
                      d={buildOrthogonalPath(geom.c1)}
                      fill="none"
                      stroke={ethUp && serverUp ? '#38BDF8' : '#EF4444'}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeDasharray={ethUp && serverUp ? undefined : '6 4'}
                    />
                    <path
                      d={buildOrthogonalPath(geom.c2)}
                      fill="none"
                      stroke={ethUp && sessionHealthy ? '#22C55E' : '#EF4444'}
                      strokeWidth="3"
                      strokeLinejoin="round"
                      strokeDasharray={ethUp && sessionHealthy ? undefined : '6 4'}
                    />
                    {inFlight && pktPos && (
                      <g>
                        <g transform={`translate(${pktPos.x.toFixed(1)}, ${pktPos.y.toFixed(1)}) rotate(${pktPos.angleDeg.toFixed(1)})`}>
                          <circle
                            r="6"
                            fill={inFlight.direction === 'SERVER_TO_CLIENT' ? '#00E5FF' : '#4ADE80'}
                            stroke="#FFFFFF"
                            strokeWidth="1.2"
                          />
                          <polygon points="3.2,0 -2.2,-2.6 -2.2,2.6" fill="#02101D" />
                        </g>
                        {(() => {
                          const bw = 186;
                          const bx = Math.max(6, Math.min(geom.w - bw - 6, pktPos.x - bw / 2));
                          const by = Math.max(4, pktPos.y - 38);
                          const c = inFlight.direction === 'SERVER_TO_CLIENT' ? '#38BDF8' : '#4ADE80';
                          return (
                            <g>
                              <rect x={bx} y={by} width={bw} height="26" rx="4" fill="#04192C" stroke={c} strokeWidth="1.1" />
                              <text x={bx + bw / 2} y={by + 10.5} textAnchor="middle" fill={c} fontSize="7.5" fontFamily="monospace" fontWeight="800">
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

                <div className="absolute bottom-1.5 left-3 right-3 z-10 flex flex-wrap items-center justify-between gap-2 text-[9px] font-mono text-[#9BC0DF] bg-[#041526]/95 border border-[#15395A] rounded px-2.5 py-1">
                  <span>Flow: Protection IED → IEC 61850 MMS → SCADA Server → OPC UA (4840) → Historian Client</span>
                  <span className="text-[#4ADE80]">Speed: {speed}× · Stage: {connStage}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: OPC UA Client (Historian / Analytics) — 3 cols */}
            <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="xl:col-span-3 rounded-xl border p-3 flex flex-col justify-between min-w-0">
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5 mb-2">
                <div className="flex items-center gap-1.5 font-extrabold text-white text-xs">
                  <Monitor className="w-4 h-4 text-[#4ADE80]" />
                  <span>OPC UA Client (Historian / Analytics)</span>
                </div>
              </div>
              <div className="grid grid-cols-12 gap-2 items-center">
                <div className="col-span-5 flex flex-col items-center justify-center rounded-lg border border-[#173C5E] bg-[#040E1A] p-2">
                  <img
                    src={OPC_HW.HISTORIAN_CLIENT}
                    onError={(e) => {
                      if (e.currentTarget.src !== HISTORIAN_EMBEDDED_FALLBACK) {
                        e.currentTarget.src = HISTORIAN_EMBEDDED_FALLBACK;
                      }
                    }}
                    alt="Historian Analytics Client"
                    className="h-[96px] w-auto object-contain"
                  />
                  <span className="text-[9px] font-mono text-[#86EFAC] mt-1 text-center leading-tight">Historian / Analytics</span>
                </div>
                <div className="col-span-7 space-y-1 text-[10px]">
                  <div style={{ color: sessionHealthy ? '#4ADE80' : '#F87171' }} className="font-extrabold text-[10.5px]">
                    ● {sessionHealthy ? 'CLIENT CONNECTED' : connStage.toUpperCase()}
                  </div>
                  {[
                    ['Client IP', '10.132.10.220', '#7DD3FC'],
                    ['Session ID', sessionId, '#BAE6FD'],
                    ['Keep Alive', '5,000 ms', '#FFFFFF'],
                    ['Subscriptions', `${subscriptions.length} (${monitoredCount} Items)`, '#4ADE80'],
                    ['DataChange', sessionHealthy ? 'Receiving (Live)' : 'Halted', sessionHealthy ? '#4ADE80' : '#F87171'],
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

          {/* BOTTOM 4-SECTION GRID MATCHING REFERENCE IMAGE */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* LEFT (3 cols): Server Config + Client Connection */}
            <div className="xl:col-span-3 space-y-3 min-w-0">
              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5">
                  <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <Settings className="w-3.5 h-3.5 text-[#00CFFF]" /> OPC UA Server Configuration
                  </span>
                </div>
                <div className="space-y-1.5 text-[10.5px]">
                  <div>
                    <label className="text-[9.5px] text-[#8BB3D4]">Endpoint URL</label>
                    <input
                      value={serverEndpoint}
                      onChange={(e) => setServerEndpoint(e.target.value)}
                      className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2 py-1 font-mono text-[10.5px] text-white"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="text-[9.5px] text-[#8BB3D4]">Security Policy</label>
                      <select
                        value={serverPolicy}
                        onChange={(e) => setServerPolicy(e.target.value as 'Basic256Sha256' | 'Aes128_Sha256_RsaOaep' | 'None')}
                        className="w-full rounded border border-[#1E5280] bg-[#04101E] px-1.5 py-1 font-mono text-[10px] text-white"
                      >
                        <option value="Basic256Sha256">Basic256Sha256</option>
                        <option value="Aes128_Sha256_RsaOaep">Aes128_Sha256</option>
                        <option value="None">None</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[9.5px] text-[#8BB3D4]">Authentication</label>
                      <select
                        value={serverAuthMode}
                        onChange={(e) => setServerAuthMode(e.target.value as 'Username / Password' | 'X.509 Certificate' | 'Anonymous')}
                        className="w-full rounded border border-[#1E5280] bg-[#04101E] px-1.5 py-1 font-mono text-[10px] text-white"
                      >
                        <option value="Username / Password">User / Pass</option>
                        <option value="X.509 Certificate">X.509 Cert</option>
                        <option value="Anonymous">Anonymous</option>
                      </select>
                    </div>
                  </div>
                  <div
                    style={{
                      backgroundColor: serverUp ? '#06291E' : '#3B0D15',
                      borderColor: serverUp ? '#22C55E' : '#EF4444',
                      color: serverUp ? '#4ADE80' : '#FCA5A5',
                    }}
                    className="rounded border px-2 py-1 text-center font-mono text-[10px] font-bold"
                  >
                    {serverUp ? '✓ Simulated Server: Running' : '✕ Simulated Server: Stopped'}
                  </div>
                  <div className="grid grid-cols-3 gap-1">
                    <button
                      type="button"
                      onClick={() => setServerRunning((r) => !r)}
                      className="rounded border border-[#1E5280] bg-[#082038] py-1 text-[10px] font-bold text-[#7DD3FC]"
                    >
                      {serverRunning ? 'Stop' : 'Start'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setServerRunning(false);
                        window.setTimeout(() => setServerRunning(true), 400);
                      }}
                      className="rounded border border-[#1E5280] bg-[#082038] py-1 text-[10px] font-bold text-[#BAE6FD]"
                    >
                      Restart
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCertModal((v) => !v)}
                      className="rounded border border-[#1E5280] bg-[#082038] py-1 text-[10px] font-bold text-[#4ADE80]"
                    >
                      View Cert
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
                <div className="font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5">
                  OPC UA Client Connection (Historian)
                </div>
                <div className="space-y-1.5 text-[10.5px]">
                  <input
                    value={clientEndpoint}
                    onChange={(e) => setClientEndpoint(e.target.value)}
                    className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2 py-1 font-mono text-[10.5px] text-white"
                  />
                  <div className="grid grid-cols-2 gap-1.5">
                    <select
                      value={clientPolicy}
                      onChange={(e) => setClientPolicy(e.target.value as 'Basic256Sha256' | 'Aes128_Sha256_RsaOaep' | 'None')}
                      className="rounded border border-[#1E5280] bg-[#04101E] px-1.5 py-1 font-mono text-[10px] text-white"
                    >
                      <option value="Basic256Sha256">Basic256Sha256</option>
                      <option value="Aes128_Sha256_RsaOaep">Aes128_Sha256</option>
                      <option value="None">None</option>
                    </select>
                    <select
                      value={clientMode}
                      onChange={(e) => setClientMode(e.target.value as 'Sign & Encrypt' | 'Sign' | 'None')}
                      className="rounded border border-[#1E5280] bg-[#04101E] px-1.5 py-1 font-mono text-[10px] text-white"
                    >
                      <option value="Sign & Encrypt">Sign &amp; Encrypt</option>
                      <option value="Sign">Sign</option>
                      <option value="None">None</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-3 gap-1 pt-0.5">
                    <button type="button" onClick={handleConnectClient} className="rounded border border-[#22C55E] bg-[#06291E] py-1 text-[10px] font-extrabold text-[#4ADE80]">
                      Connect
                    </button>
                    <button type="button" onClick={handleDisconnectClient} className="rounded border border-[#EF4444] bg-[#3B0D15] py-1 text-[10px] font-extrabold text-[#FCA5A5]">
                      Disconnect
                    </button>
                    <button type="button" onClick={handleReadNode} className="rounded border border-[#0EA5E9] bg-[#082038] py-1 text-[10px] font-extrabold text-[#7DD3FC]">
                      Test
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CENTER (6 cols): Address Space Tree + Monitored Items + Live Message Flow */}
            <div className="xl:col-span-6 space-y-3 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                {/* Address Space Hierarchy (5 cols) */}
                <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="md:col-span-5 rounded-xl border p-3 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-1.5 font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5">
                    <FolderTree className="w-3.5 h-3.5 text-[#FACC15]" />
                    <span>Address Space (Root → Objects)</span>
                  </div>
                  <div className="max-h-[225px] overflow-y-auto font-mono text-[10px] space-y-1 pr-1">
                    <div className="text-[#FACC15] font-bold">▾ Objects / Substation_132_33kV (ns=2)</div>
                    {(['132kV', '33kV', '11kV'] as const).map((vl) => {
                      const open = !!expandedNodes[vl];
                      const vlNodes = addressSpaceNodes.filter((n) => n.nodeId.includes(`SAS.${vl}.`)).slice(0, 8);
                      return (
                        <div key={vl} className="pl-2">
                          <button
                            type="button"
                            onClick={() => setExpandedNodes((p) => ({ ...p, [vl]: !p[vl] }))}
                            className="flex items-center gap-1 text-[#7DD3FC] font-bold hover:text-white"
                          >
                            {open ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            <span>{vl} Switchyard ({vlNodes.length} nodes)</span>
                          </button>
                          {open && (
                            <div className="pl-3 mt-0.5 space-y-0.5">
                              {vlNodes.map((n) => (
                                <button
                                  key={n.nodeId}
                                  type="button"
                                  onClick={() => setSelectedNodeId(n.nodeId)}
                                  style={{
                                    backgroundColor: n.nodeId === selectedNode.nodeId ? '#0B2F4D' : 'transparent',
                                    color: n.accessLevel.includes('CurrentWrite') ? '#4ADE80' : '#E2E8F0',
                                  }}
                                  className="block w-full text-left px-1.5 py-0.5 rounded truncate hover:bg-[#082238]"
                                  title={n.nodeId}
                                >
                                  • {n.bayCode}.{n.browseName.replace('2:', '')}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Monitored Items & Live Data (7 cols) */}
                <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="md:col-span-7 rounded-xl border p-3 space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-1 border-b border-[#163B5C] pb-1.5">
                    <span className="font-extrabold text-white text-xs">Monitored Items (Sub_01, 500 ms)</span>
                    <div className="flex gap-1">
                      {(['ALL', '132', '33', 'BREAKER', 'ANALOG'] as const).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFilterMode(f)}
                          className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${filterMode === f ? 'bg-[#00CFFF] text-[#02101D]' : 'bg-[#04101E] text-[#9BC0DF]'}`}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="overflow-x-auto max-h-[220px] overflow-y-auto">
                    <table className="w-full text-left border-collapse font-mono text-[10px]">
                      <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 text-[#9BC0DF]">
                        <tr>
                          <th className="py-1 px-1.5">Display Name</th>
                          <th className="py-1 px-1.5">Type</th>
                          <th className="py-1 px-1.5">Value</th>
                          <th className="py-1 px-1.5">Quality</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#132E4A]">
                        {filteredNodes.slice(0, 12).map((n) => {
                          const hi = highlightedNodeId === n.nodeId;
                          return (
                            <tr
                              key={n.nodeId}
                              onClick={() => setSelectedNodeId(n.nodeId)}
                              style={{
                                backgroundColor: hi
                                  ? 'rgba(34,197,94,0.22)'
                                  : n.nodeId === selectedNode.nodeId
                                  ? 'rgba(0,207,255,0.14)'
                                  : '#04101E',
                              }}
                              className="cursor-pointer hover:bg-[#0B2540] transition-colors"
                            >
                              <td className="py-1 px-1.5 font-sans font-bold text-white truncate max-w-[140px]" title={n.nodeId}>
                                {n.displayName}
                              </td>
                              <td className="py-1 px-1.5 text-slate-300">{n.dataType}</td>
                              <td className="py-1 px-1.5 font-extrabold text-[#4ADE80]">{n.valueText}</td>
                              <td className="py-1 px-1.5" style={{ color: sessionHealthy ? '#4ADE80' : '#F87171' }}>
                                {sessionHealthy ? 'Good' : 'Bad'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              {/* Live OPC UA Message Flow & Logs */}
              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-1.5">
                <div className="flex items-center justify-between border-b border-[#163B5C] pb-1.5">
                  <span className="font-extrabold text-white text-xs flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-[#00CFFF]" /> Live OPC UA Message Flow &amp; Logs
                  </span>
                  <span className="font-mono text-[9.5px] text-[#7DD3FC]">TCP/4840 · Service Audit</span>
                </div>
                <div className="overflow-x-auto max-h-[145px] overflow-y-auto">
                  <table className="w-full text-left border-collapse font-mono text-[10px]">
                    <tbody className="divide-y divide-[#132E4A]">
                      {logs.slice(0, 7).map((l) => (
                        <tr key={l.id} className="bg-[#04101E]">
                          <td className="py-1 px-1.5 text-slate-400 whitespace-nowrap">{l.time}</td>
                          <td className="py-1 px-1.5 font-bold text-[#7DD3FC] whitespace-nowrap">{l.service}</td>
                          <td className="py-1 px-1.5 text-[#FACC15] whitespace-nowrap">{l.direction}</td>
                          <td className="py-1 px-1.5 text-white truncate max-w-[230px]" title={l.details}>{l.details}</td>
                          <td className="py-1 px-1.5 font-bold text-right whitespace-nowrap" style={{ color: l.result === 'Success' || l.result === 'Delivered' ? '#4ADE80' : '#F87171' }}>
                            {l.result}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* RIGHT (3 cols): Read / Write (Selected Node) + Live Diagnostics */}
            <div className="xl:col-span-3 space-y-3 min-w-0">
              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-2">
                <div className="font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5">
                  Read / Write (Selected Node)
                </div>
                <div className="space-y-1 text-[10.5px]">
                  <div className="flex justify-between gap-2">
                    <span className="text-[#8BB3D4]">NodeId</span>
                    <span className="font-mono font-bold text-[#7DD3FC] text-right break-all">{selectedNode.nodeId}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#8BB3D4]">Access</span>
                    <span className="font-mono font-bold" style={{ color: selectedNode.accessLevel.includes('CurrentWrite') ? '#4ADE80' : '#FBBF24' }}>
                      {selectedNode.accessLevel}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="text-[#8BB3D4]">Current Value</span>
                    <span className="font-mono font-extrabold text-[#4ADE80]">{selectedNode.valueText}</span>
                  </div>
                </div>
                <div className="flex gap-1.5 items-center">
                  <select
                    value={writeDesiredVal}
                    onChange={(e) => setWriteDesiredVal(e.target.value as 'OPEN' | 'CLOSED')}
                    className="flex-1 rounded border border-[#1E5280] bg-[#04101E] px-2 py-1 font-mono text-[10.5px] text-white"
                  >
                    <option value="OPEN">OPEN (Trip)</option>
                    <option value="CLOSED">CLOSED (Close)</option>
                  </select>
                  <button type="button" onClick={handleReadNode} className="rounded border border-[#0EA5E9] bg-[#082038] px-2.5 py-1 font-extrabold text-[#7DD3FC]">
                    Read
                  </button>
                  <button type="button" onClick={handleWriteNode} className="rounded border border-[#22C55E] bg-[#06291E] px-2.5 py-1 font-extrabold text-[#4ADE80]">
                    Write
                  </button>
                </div>
                <div className="rounded bg-[#04101E] border border-[#15395A] px-2 py-1 font-mono text-[9.5px] text-[#9BC0DF]">
                  {rwFeedback}
                </div>
              </div>

              <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-3 space-y-1.5">
                <div className="font-extrabold text-white text-xs border-b border-[#163B5C] pb-1.5 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-[#4ADE80]" /> Live Diagnostics
                </div>
                {[
                  ['OPC UA Session', sessionHealthy ? `Active (${sessionId})` : connStage, sessionHealthy ? '#4ADE80' : '#F87171'],
                  ['Subscriptions', `${subscriptions.length} (${monitoredCount} Items)`, '#7DD3FC'],
                  ['Publishing Int.', `${subscriptions[0]?.publishingIntervalMs ?? 500} ms`, '#FFFFFF'],
                  ['Security Policy', `${serverPolicy} (${serverMode})`, policyMatches ? '#4ADE80' : '#F87171'],
                  ['Certificate', certValid ? 'Valid (X.509 Sim)' : 'Rejected', certValid ? '#4ADE80' : '#F87171'],
                  ['StatusCode', effectiveStatusCode.split(' ')[0], sessionHealthy ? '#4ADE80' : '#F87171'],
                ].map(([k, v, c]) => (
                  <div key={k} className="flex justify-between gap-2 text-[10.5px] border-b border-[#122E49] pb-0.5 last:border-0">
                    <span className="text-[#9BC0DF]">{k}</span>
                    <span style={{ color: c }} className="font-mono font-bold text-right truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ADDRESS SPACE BROWSER */}
      {activeTab === 'ADDRESS_SPACE' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
            Complete OPC UA Address Space — IEC 61850 Signal Mapping ({addressSpaceNodes.length} Nodes)
          </h3>
          <div className="overflow-x-auto max-h-[420px] overflow-y-auto">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 text-[#9BC0DF]">
                <tr>
                  <th className="py-2 px-2">NodeId</th>
                  <th className="py-2 px-2">DisplayName</th>
                  <th className="py-2 px-2">DataType</th>
                  <th className="py-2 px-2">AccessLevel</th>
                  <th className="py-2 px-2">Value</th>
                  <th className="py-2 px-2">IEC 61850 / MMS Source</th>
                  <th className="py-2 px-2">StatusCode</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132E4A]">
                {addressSpaceNodes.map((n) => (
                  <tr key={n.nodeId} onClick={() => setSelectedNodeId(n.nodeId)} className="bg-[#04101E] hover:bg-[#0B2540] cursor-pointer">
                    <td className="py-1.5 px-2 text-[#7DD3FC]">{n.nodeId}</td>
                    <td className="py-1.5 px-2 font-sans font-bold text-white">{n.displayName}</td>
                    <td className="py-1.5 px-2 text-slate-300">{n.dataType}</td>
                    <td className="py-1.5 px-2" style={{ color: n.accessLevel.includes('CurrentWrite') ? '#4ADE80' : '#FBBF24' }}>{n.accessLevel}</td>
                    <td className="py-1.5 px-2 font-bold text-[#4ADE80]">{n.valueText}</td>
                    <td className="py-1.5 px-2 text-[#BAE6FD]">{n.sourceIecRef}</td>
                    <td className="py-1.5 px-2 text-[#4ADE80]">{sessionHealthy ? n.statusCode : effectiveStatusCode}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: SUBSCRIPTIONS */}
      {activeTab === 'SUBSCRIPTIONS' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white">OPC UA Subscriptions &amp; Monitored Items</h3>
            <button
              type="button"
              onClick={() => {
                const id = `Sub_0${subscriptions.length + 1}`;
                setSubscriptions((p) => [
                  ...p,
                  { id, publishingIntervalMs: 500, samplingIntervalMs: 250, queueSize: 10, monitoringMode: 'Reporting', active: true, notifications: 0 },
                ]);
                appendLog({ service: 'CreateSubscription', direction: 'Client → Server', details: `Created ${id} (500 ms)`, statusCode: 'Good (0x00000000)', result: 'Success' });
              }}
              className="rounded-lg bg-[#06291E] border border-[#22C55E] px-3 py-1 font-extrabold text-[#4ADE80]"
            >
              + Create Subscription
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {subscriptions.map((sub) => (
              <div key={sub.id} className="rounded-lg border border-[#164463] bg-[#04101E] p-3 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between items-center">
                  <b className="text-[#7DD3FC]">{sub.id}</b>
                  <button
                    type="button"
                    onClick={() => setSubscriptions((p) => p.filter((x) => x.id !== sub.id))}
                    className="text-[#FCA5A5] text-[10px] font-bold"
                  >
                    Delete
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>Publishing: <b>{sub.publishingIntervalMs} ms</b></div>
                  <div>Sampling: <b>{sub.samplingIntervalMs} ms</b></div>
                  <div>Queue Size: <b>{sub.queueSize}</b></div>
                  <div>Notifications: <b className="text-[#4ADE80]">{sub.notifications}</b></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: READ / WRITE */}
      {activeTab === 'READ_WRITE' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
            OPC UA Read / Write Operations (Strict Read-Only Protection &amp; Separate Writable Command Nodes)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2.5">
              <label className="block text-[11px] text-[#9BC0DF]">Select Target OPC UA Node</label>
              <select
                value={selectedNode.nodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                className="w-full rounded-lg border border-[#1E5280] bg-[#04101E] px-3 py-2 font-mono text-xs text-white"
              >
                {addressSpaceNodes.map((n) => (
                  <option key={n.nodeId} value={n.nodeId}>
                    {n.nodeId} [{n.accessLevel.includes('CurrentWrite') ? 'RW' : 'RO'}]
                  </option>
                ))}
              </select>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input type="checkbox" checked={interlockPermissive} onChange={(e) => setInterlockPermissive(e.target.checked)} />
                <span className="text-[#BAE6FD]">Substation Bay Interlock Permissive Healthy</span>
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={handleReadNode} className="flex-1 py-2 rounded-lg border border-[#0EA5E9] bg-[#082038] font-extrabold text-[#7DD3FC]">
                  Execute OPC UA Read
                </button>
                <button type="button" onClick={handleWriteNode} className="flex-1 py-2 rounded-lg border border-[#22C55E] bg-[#06291E] font-extrabold text-[#4ADE80]">
                  Execute OPC UA Write ({writeDesiredVal})
                </button>
              </div>
            </div>
            <div className="rounded-lg border border-[#164463] bg-[#04101E] p-3 font-mono text-[11px] space-y-1.5">
              <div className="text-[#7DD3FC] font-bold">Operation Result</div>
              <div className="text-[#4ADE80]">{rwFeedback}</div>
              <div className="text-slate-400 text-[10px]">
                Engineering Rule: Analog measurements and XCBR1.Pos.stVal status nodes are strictly CurrentRead (rejecting writes with BadNotWritable 0x803B0000). Authorized breaker commands execute through *.CB.Pos.ctlVal.
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SECURITY & CERTIFICATES */}
      {activeTab === 'SECURITY_CERTS' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#4ADE80]" />
              <span>Security &amp; X.509 Application Certificates (Simulated Trust Store)</span>
            </h3>
            <button
              type="button"
              onClick={() => setClientCertTrusted((t) => !t)}
              className={`px-3 py-1 rounded-lg border font-extrabold text-xs ${clientCertTrusted ? 'bg-[#3B0D15] border-[#EF4444] text-[#FCA5A5]' : 'bg-[#06291E] border-[#22C55E] text-[#4ADE80]'}`}
            >
              {clientCertTrusted ? 'Move Client Cert to Rejected' : 'Trust Client Certificate'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
            <div className="rounded-lg border border-[#164463] bg-[#04101E] p-3 space-y-1">
              <div className="text-[#7DD3FC] font-bold">Server Application Certificate (Simulated)</div>
              <div>Subject: CN=SCADA-OPCUA-SERVER-A, O=SAS Engineering Hub</div>
              <div>URI: {applicationUri}</div>
              <div>Policy: {serverPolicy} · Mode: {serverMode}</div>
              <div>Expiry: 2028-12-31 (Valid — Simulated)</div>
            </div>
            <div className="rounded-lg border border-[#164463] bg-[#04101E] p-3 space-y-1">
              <div className="text-[#86EFAC] font-bold">Client Application Certificate (Historian)</div>
              <div>Subject: CN=HISTORIAN-CLIENT-01, IP=10.132.10.220</div>
              <div>Trust Store Status: <b style={{ color: certValid ? '#4ADE80' : '#F87171' }}>{certValid ? 'TRUSTED' : 'REJECTED (BadCertificateUntrusted)'}</b></div>
              <div>Auth Mode: {serverAuthMode}</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: CLIENT CONFIGURATION */}
      {activeTab === 'CLIENT_CONFIG' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">
            Historian / Analytics OPC UA Client Configuration — Stage: {connStage}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-[#9BC0DF]">Username</label>
              <input value={clientUsername} onChange={(e) => setClientUsername(e.target.value)} className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2.5 py-1.5 font-mono text-white" />
            </div>
            <div>
              <label className="text-[11px] text-[#9BC0DF]">Password</label>
              <input type="password" value={clientPassword} onChange={(e) => setClientPassword(e.target.value)} className="w-full rounded border border-[#1E5280] bg-[#04101E] px-2.5 py-1.5 font-mono text-white" />
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={handleConnectClient} className="px-4 py-2 rounded-lg border border-[#22C55E] bg-[#06291E] font-extrabold text-[#4ADE80]">
              Connect (SecureChannel → Session → Active)
            </button>
            <button type="button" onClick={handleDisconnectClient} className="px-4 py-2 rounded-lg border border-[#EF4444] bg-[#3B0D15] font-extrabold text-[#FCA5A5]">
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* TAB 7: DIAGNOSTICS & LOGS */}
      {activeTab === 'DIAGNOSTICS_LOGS' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <h3 className="text-sm font-extrabold text-white border-b border-[#163B5C] pb-2">Complete OPC UA Service Event Log</h3>
          <div className="overflow-x-auto max-h-[380px] overflow-y-auto">
            <table className="w-full text-left border-collapse font-mono text-[11px]">
              <thead style={{ backgroundColor: '#0A2540' }} className="sticky top-0 text-[#9BC0DF]">
                <tr>
                  <th className="py-1.5 px-2">Time</th>
                  <th className="py-1.5 px-2">Service</th>
                  <th className="py-1.5 px-2">Direction</th>
                  <th className="py-1.5 px-2">Details</th>
                  <th className="py-1.5 px-2">StatusCode</th>
                  <th className="py-1.5 px-2">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#132E4A]">
                {logs.map((l) => (
                  <tr key={l.id} className="bg-[#04101E]">
                    <td className="py-1.5 px-2 text-slate-400">{l.time}</td>
                    <td className="py-1.5 px-2 font-bold text-[#7DD3FC]">{l.service}</td>
                    <td className="py-1.5 px-2 text-[#FACC15]">{l.direction}</td>
                    <td className="py-1.5 px-2 text-white">{l.details}</td>
                    <td className="py-1.5 px-2 text-[#BAE6FD]">{l.statusCode}</td>
                    <td className="py-1.5 px-2 font-bold" style={{ color: l.result === 'Success' || l.result === 'Delivered' ? '#4ADE80' : '#F87171' }}>{l.result}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: FAULT & SIMULATION */}
      {activeTab === 'FAULT_SIMULATION' && (
        <div style={{ backgroundColor: '#07192C', borderColor: '#1B4B72' }} className="rounded-xl border p-4 space-y-3">
          <div className="flex justify-between items-center border-b border-[#163B5C] pb-2">
            <h3 className="text-sm font-extrabold text-white flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-[#FFB547]" /> OPC UA Fault Injection Scenarios
            </h3>
            <span className="font-mono text-xs text-[#FDBA74]">Active: {faultMode}</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {faultScenarios.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => {
                  setFaultMode(f.id);
                  if (f.id === 'NONE') setConnStage('Active');
                  else if (f.id === 'SERVER_DISCONNECTED' || f.id === 'ETH_LINK_FAILURE' || f.id === 'SESSION_TIMEOUT') {
                    setConnStage('Disconnected');
                    setInFlight(null);
                  }
                }}
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

      {/* Optional Certificate Quick Modal */}
      {showCertModal && (
        <div className="rounded-xl border border-[#38BDF8] bg-[#061C31] p-3 font-mono text-[11px] flex flex-wrap items-center justify-between gap-2">
          <div>
            <b className="text-[#4ADE80]">X.509 v3 Certificate (Simulated):</b> CN=SCADA-OPCUA-SERVER-A · {applicationUri} · Policy={serverPolicy} ({serverMode}) · Trust={certValid ? 'TRUSTED' : 'REJECTED'}
          </div>
          <button type="button" onClick={() => setShowCertModal(false)} className="rounded border border-[#1E5280] bg-[#04101E] px-2.5 py-0.5 text-[#7DD3FC] font-bold">
            Close
          </button>
        </div>
      )}
    </div>
  );
};
