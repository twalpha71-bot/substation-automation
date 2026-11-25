import React, { useEffect, useMemo, useState } from 'react';
import {
  Network,
  Play,
  Square,
  Download,
  Trash2,
  Search,
  ChevronRight,
  ChevronDown,
  Zap,
  AlertTriangle,
  Filter,
  FileDown,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { useSubstationStore } from '../simulation/useSubstationStore';

interface GooseMeta {
  srcMac: string;
  dstMac: string;
  vlanId: number;
  vlanPcp: number;
  appId: string;
  gocbRef: string;
  datSet: string;
  goID: string;
  stNum: number;
  sqNum: number;
  confRev: number;
  talMs: number;
  simulation: boolean;
  ndsCom: boolean;
  prpLan: 'LAN_A' | 'LAN_B';
  prpSeqNr: number;
  allData: Array<{ name: string; type: string; value: string }>;
  isStateChange: boolean;
}

interface TcpMeta {
  srcIp: string;
  dstIp: string;
  srcPort: number;
  dstPort: number;
  layerSummary: string;
  fields: Array<{ label: string; value: string; filterExpr?: string }>;
}

interface ExpertFlag {
  level: 'ERROR' | 'WARN' | 'NOTE';
  code: string;
  message: string;
}

type Packet = {
  no: number;
  time: string;
  tsMs: number;
  deltaMs: number;
  source: string;
  destination: string;
  protocol: string;
  length: number;
  info: string;
  details: string;
  hex: string;
  rawBytes?: number[];
  goose?: GooseMeta;
  tcp?: TcpMeta;
  expert?: ExpertFlag;
};

const btn: React.CSSProperties = {
  border: '1px solid #27738d',
  borderRadius: 6,
  padding: '6px 10px',
  background: '#0b354c',
  color: '#e5f6ff',
  cursor: 'pointer',
  fontSize: 11.5,
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
};

const panel: React.CSSProperties = {
  border: '1.5px solid rgba(86,235,255,0.68)',
  borderRadius: 14,
  padding: 12,
  boxShadow:
    '0 0 22px rgba(0,224,255,0.20), inset 0 1px 1px rgba(190,252,255,0.52), inset 0 -1px 1px rgba(0,232,255,0.34)',
};

const normMac = (mac: string) => mac.toLowerCase().replace(/-/g, ':').trim();

const macToBytes = (m: string): number[] => {
  const parts = normMac(m)
    .split(':')
    .map((x) => parseInt(x, 16) || 0);
  while (parts.length < 6) parts.push(0);
  return parts.slice(0, 6);
};

const ipToBytes = (ip: string): number[] => {
  const parts = ip.split('.').map((x) => Math.max(0, Math.min(255, parseInt(x, 10) || 0)));
  while (parts.length < 4) parts.push(0);
  return parts.slice(0, 4);
};

const formatHexDump = (bytes: number[]): string => {
  const lines: string[] = [];
  for (let offset = 0; offset < bytes.length; offset += 16) {
    const chunk = bytes.slice(offset, offset + 16);
    const hexPart = chunk.map((b) => b.toString(16).padStart(2, '0').toUpperCase()).join(' ').padEnd(47, ' ');
    const asciiPart = chunk.map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : '.')).join('');
    lines.push(`${offset.toString(16).padStart(4, '0')}  ${hexPart}  ${asciiPart}`);
  }
  return lines.join('\n');
};

// ASN.1 BER (Basic Encoding Rules) TLV helpers for 100% Wireshark-valid IEC 61850-8-1 GOOSE PDUs
const berLength = (len: number): number[] => {
  if (len < 0x80) return [len];
  if (len <= 0xff) return [0x81, len];
  return [0x82, (len >> 8) & 0xff, len & 0xff];
};

const berTlv = (tag: number, value: number[]): number[] => [tag, ...berLength(value.length), ...value];

const berVisibleString = (tag: number, text: string): number[] =>
  berTlv(tag, Array.from(new TextEncoder().encode(text)));

const berUint = (tag: number, num: number): number[] => {
  const n = Math.max(0, Math.floor(num));
  if (n === 0) return berTlv(tag, [0x00]);
  const bytes: number[] = [];
  let v = n;
  while (v > 0) {
    bytes.unshift(v & 0xff);
    v = Math.floor(v / 256);
  }
  // Keep unsigned value positive in ASN.1 two's complement
  if (bytes[0] >= 0x80) bytes.unshift(0x00);
  return berTlv(tag, bytes);
};

const berBool = (tag: number, flag: boolean): number[] => berTlv(tag, [flag ? 0x01 : 0x00]);

const berUtcTime = (tag: number, tsMs: number): number[] => {
  const sec = Math.floor(tsMs / 1000);
  const frac = Math.round(((tsMs % 1000) / 1000) * 0x1000000) & 0xffffff;
  return berTlv(tag, [
    (sec >>> 24) & 0xff,
    (sec >>> 16) & 0xff,
    (sec >>> 8) & 0xff,
    sec & 0xff,
    (frac >>> 16) & 0xff,
    (frac >>> 8) & 0xff,
    frac & 0xff,
    0x0a, // TimeQuality: synchronized, ~1ms accuracy
  ]);
};

const encodeGooseDataItem = (item: { name: string; type: string; value: string }): number[] => {
  const t = item.type.toUpperCase();
  const v = item.value.toUpperCase();
  if (t.includes('BOOLEAN')) {
    return berBool(0x83, v.includes('TRUE'));
  }
  if (t.includes('BIT-STRING(2)')) {
    // 2-bit Dbpos: CLOSED=10 (0x80), OPEN=01 (0x40), 6 unused trailing bits
    const byteVal = v.includes('CLOSED') || v.startsWith('10') ? 0x80 : 0x40;
    return berTlv(0x84, [0x06, byteVal]);
  }
  if (t.includes('BIT-STRING(13)')) {
    // 13-bit IEC 61850 Quality: Good=0x0000, Invalid=0x4000, 3 unused trailing bits
    const hi = v.includes('GOOD') || v.includes('0X0000') ? 0x00 : 0x40;
    return berTlv(0x84, [0x03, hi, 0x00]);
  }
  return berVisibleString(0x8a, item.value);
};

// Build 100% IEC 61850-8-1 compliant Ethernet II + 802.1Q VLAN + ASN.1 BER GOOSE (0x88B8) + PRP RCT (0x88FB)
const buildGooseFrameBytes = (g: GooseMeta, tsMs = Date.now()): number[] => {
  const appIdNum = parseInt(g.appId.replace(/^0x/i, ''), 16) || 1;
  const tci = ((g.vlanPcp & 0x7) << 13) | (g.vlanId & 0x0fff);

  const allDataContent = g.allData.flatMap(encodeGooseDataItem);
  const goosePduContent: number[] = [
    ...berVisibleString(0x80, g.gocbRef),
    ...berUint(0x81, g.talMs),
    ...berVisibleString(0x82, g.datSet),
    ...berVisibleString(0x83, g.goID),
    ...berUtcTime(0x84, tsMs),
    ...berUint(0x85, g.stNum),
    ...berUint(0x86, g.sqNum),
    ...berBool(0x87, g.simulation),
    ...berUint(0x88, g.confRev),
    ...berBool(0x89, g.ndsCom),
    ...berUint(0x8a, g.allData.length),
    ...berTlv(0xab, allDataContent),
  ];

  const goosePduTlv = berTlv(0x61, goosePduContent);
  const gooseLen = 8 + goosePduTlv.length; // 8-byte GOOSE header + ASN.1 goosePdu TLV
  const prpLanCode = g.prpLan === 'LAN_A' ? 0xa0 : 0xb0;
  const prpLsduSize = gooseLen + 6;
  const prpSizeField = (prpLanCode << 8) | (prpLsduSize & 0x0fff);

  return [
    ...macToBytes(g.dstMac),
    ...macToBytes(g.srcMac),
    0x81,
    0x00, // 802.1Q VLAN TPID
    (tci >> 8) & 0xff,
    tci & 0xff,
    0x88,
    0xb8, // IEC 61850 GOOSE EtherType
    (appIdNum >> 8) & 0xff,
    appIdNum & 0xff,
    (gooseLen >> 8) & 0xff,
    gooseLen & 0xff,
    g.simulation ? 0x80 : 0x00,
    0x00,
    0x00,
    0x00,
    ...goosePduTlv,
    // IEC 62439-3 PRP Redundancy Control Trailer (RCT)
    (g.prpSeqNr >> 8) & 0xff,
    g.prpSeqNr & 0xff,
    (prpSizeField >> 8) & 0xff,
    prpSizeField & 0xff,
    0x88,
    0xfb, // PRP Suffix
  ];
};

// Build realistic Ethernet II + IPv4 + TCP frame bytes (for MMS 102, IEC-104 2404, Modbus 502)
const buildTcpFrameBytes = (tcp: TcpMeta, payloadStr: string): number[] => {
  const payload = Array.from(new TextEncoder().encode(payloadStr)).slice(0, 110);
  const ipTotalLen = 20 + 20 + payload.length;
  const eth = [0x00, 0x1b, 0x1b, 0x20, 0x00, 0xc8, 0x00, 0x1b, 0x1b, 0x10, 0x00, 0x11, 0x08, 0x00];
  const ipv4 = [
    0x45,
    0x00,
    (ipTotalLen >> 8) & 0xff,
    ipTotalLen & 0xff,
    0x12,
    0x34,
    0x40,
    0x00,
    0x40,
    0x06, // TCP
    0x00,
    0x00,
    ...ipToBytes(tcp.srcIp),
    ...ipToBytes(tcp.dstIp),
  ];
  const tcpHdr = [
    (tcp.srcPort >> 8) & 0xff,
    tcp.srcPort & 0xff,
    (tcp.dstPort >> 8) & 0xff,
    tcp.dstPort & 0xff,
    0x00,
    0x00,
    0x00,
    0x01,
    0x00,
    0x00,
    0x00,
    0x01,
    0x50,
    0x18, // PSH, ACK
    0xfa,
    0xf0,
    0x00,
    0x00,
    0x00,
    0x00,
  ];
  return [...eth, ...ipv4, ...tcpHdr, ...payload];
};

// Export genuine Libpcap binary file (.pcap) compatible with desktop Wireshark
function exportPacketsToPcap(packets: Packet[]) {
  const chunks: Uint8Array[] = [];

  // 24-byte Global PCAP Header (Little-Endian)
  const gh = new ArrayBuffer(24);
  const gv = new DataView(gh);
  gv.setUint32(0, 0xa1b2c3d4, true); // magic_number
  gv.setUint16(4, 2, true); // version_major
  gv.setUint16(6, 4, true); // version_minor
  gv.setInt32(8, 0, true); // thiszone
  gv.setUint32(12, 0, true); // sigfigs
  gv.setUint32(16, 65535, true); // snaplen
  gv.setUint32(20, 1, true); // network = LINKTYPE_ETHERNET (1)
  chunks.push(new Uint8Array(gh));

  for (const p of packets) {
    const frame =
      p.goose
        ? buildGooseFrameBytes(p.goose, p.tsMs || Date.now())
        : p.rawBytes && p.rawBytes.length >= 14
        ? p.rawBytes
        : p.tcp
        ? buildTcpFrameBytes(p.tcp, `${p.protocol} ${p.info}`)
        : buildTcpFrameBytes(
            { srcIp: '10.132.10.11', dstIp: '10.132.10.200', srcPort: 50000, dstPort: 102, layerSummary: p.protocol, fields: [] },
            `${p.protocol} ${p.info}`
          );

    const tsSec = Math.floor((p.tsMs || Date.now()) / 1000);
    const tsUsec = ((p.tsMs || Date.now()) % 1000) * 1000;

    const ph = new ArrayBuffer(16);
    const pv = new DataView(ph);
    pv.setUint32(0, tsSec, true);
    pv.setUint32(4, tsUsec, true);
    pv.setUint32(8, frame.length, true);
    pv.setUint32(12, frame.length, true);
    chunks.push(new Uint8Array(ph));
    chunks.push(new Uint8Array(frame));
  }

  const blob = new Blob(chunks, { type: 'application/vnd.tcpdump.pcap' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `sas-iec61850-capture-${new Date().toISOString().slice(11, 19).replace(/:/g, '')}.pcap`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1200);
}

// Real Wireshark-style Display Filter Evaluator (supports &&, ||, !, ==, !=, >, <, >=, <=, contains)
function evaluateSingleClause(rawClause: string, p: Packet): { ok: boolean; valid: boolean } {
  let clause = rawClause.trim();
  if (!clause) return { ok: true, valid: true };

  let negate = false;
  if (clause.startsWith('!')) {
    negate = true;
    clause = clause.slice(1).trim();
  }
  const lower = clause.toLowerCase();

  // Bare protocol & expert keywords
  if (['goose', 'mms', 'modbus', 'iec104', 'sntp'].includes(lower)) {
    const match = p.protocol.toLowerCase() === lower;
    return { ok: negate ? !match : match, valid: true };
  }
  if (lower === 'vlan') {
    const match = Boolean(p.goose);
    return { ok: negate ? !match : match, valid: true };
  }
  if (lower === 'prp') {
    const match = Boolean(p.goose?.prpLan);
    return { ok: negate ? !match : match, valid: true };
  }
  if (lower === 'expert.warn' || lower === 'expert.error' || lower === 'goose.anomaly') {
    const match = Boolean(p.expert && (lower === 'expert.error' ? p.expert.level === 'ERROR' : true));
    return { ok: negate ? !match : match, valid: true };
  }

  // Expression: field op value
  const exprMatch = clause.match(/^([a-zA-Z0-9_.]+)\s*(==|!=|>=|<=|>|<|contains)\s*(.+)$/);
  if (exprMatch) {
    const field = exprMatch[1].toLowerCase();
    const op = exprMatch[2].toLowerCase();
    const rawVal = exprMatch[3].trim().replace(/^["']|["']$/g, '');
    const valLower = rawVal.toLowerCase();
    const numVal = valLower.startsWith('0x') ? parseInt(valLower, 16) : Number(rawVal);

    const compareNum = (actual: number | undefined): boolean => {
      if (actual === undefined || Number.isNaN(numVal)) return false;
      if (op === '==') return actual === numVal;
      if (op === '!=') return actual !== numVal;
      if (op === '>') return actual > numVal;
      if (op === '<') return actual < numVal;
      if (op === '>=') return actual >= numVal;
      if (op === '<=') return actual <= numVal;
      return false;
    };

    const compareStr = (actual: string | undefined): boolean => {
      if (actual === undefined) return false;
      const a = actual.toLowerCase();
      if (op === '==') return a === valLower;
      if (op === '!=') return a !== valLower;
      if (op === 'contains') return a.includes(valLower);
      return false;
    };

    const compareBool = (actual: boolean | undefined): boolean => {
      if (actual === undefined) return false;
      const expected = valLower === 'true' || valLower === '1';
      if (op === '==') return actual === expected;
      if (op === '!=') return actual !== expected;
      return false;
    };

    let matched = false;
    switch (field) {
      case 'goose.stnum':
        matched = compareNum(p.goose?.stNum);
        break;
      case 'goose.sqnum':
        matched = compareNum(p.goose?.sqNum);
        break;
      case 'goose.confrev':
        matched = compareNum(p.goose?.confRev);
        break;
      case 'goose.tal':
      case 'goose.timeallowedtolive':
        matched = compareNum(p.goose?.talMs);
        break;
      case 'goose.appid': {
        const pktApp = p.goose ? parseInt(p.goose.appId.replace(/^0x/i, ''), 16) : undefined;
        matched = !Number.isNaN(numVal) ? compareNum(pktApp) : compareStr(p.goose?.appId);
        break;
      }
      case 'goose.gocbref':
        matched = compareStr(p.goose?.gocbRef);
        break;
      case 'goose.datset':
        matched = compareStr(p.goose?.datSet);
        break;
      case 'goose.goid':
        matched = compareStr(p.goose?.goID);
        break;
      case 'goose.simulation':
      case 'goose.test':
        matched = compareBool(p.goose?.simulation);
        break;
      case 'goose.ndscom':
        matched = compareBool(p.goose?.ndsCom);
        break;
      case 'prp.lan':
        matched = compareStr(p.goose?.prpLan);
        break;
      case 'vlan.id':
        matched = compareNum(p.goose?.vlanId);
        break;
      case 'vlan.priority':
        matched = compareNum(p.goose?.vlanPcp);
        break;
      case 'eth.dst':
        matched = compareStr(p.goose ? normMac(p.goose.dstMac) : normMac(p.destination));
        break;
      case 'eth.src':
        matched = compareStr(p.goose ? normMac(p.goose.srcMac) : normMac(p.source));
        break;
      case 'tcp.port':
        matched = compareNum(p.tcp?.dstPort) || compareNum(p.tcp?.srcPort);
        break;
      case 'ip.addr':
        matched = compareStr(p.tcp?.srcIp) || compareStr(p.tcp?.dstIp);
        break;
      case 'frame.len':
        matched = compareNum(p.length);
        break;
      case 'frame.number':
        matched = compareNum(p.no);
        break;
      default:
        return { ok: false, valid: false };
    }
    return { ok: negate ? !matched : matched, valid: true };
  }

  const hay = `${p.protocol} ${p.source} ${p.destination} ${p.info} ${p.goose?.gocbRef || ''} ${p.goose?.appId || ''} ${p.goose?.dstMac || ''} ${p.expert?.code || ''}`.toLowerCase();
  const hit = hay.includes(lower);
  return { ok: negate ? !hit : hit, valid: true };
}

function evaluateDisplayFilter(expr: string, p: Packet): { ok: boolean; valid: boolean } {
  const trimmed = expr.trim();
  if (!trimmed) return { ok: true, valid: true };

  const orBranches = trimmed.split('||');
  let overallValid = true;
  let overallMatch = false;

  for (const branch of orBranches) {
    const andClauses = branch.split('&&');
    let branchMatch = true;
    for (const c of andClauses) {
      const res = evaluateSingleClause(c, p);
      if (!res.valid) overallValid = false;
      if (!res.ok) branchMatch = false;
    }
    if (branchMatch) overallMatch = true;
  }

  return { ok: overallMatch, valid: overallValid };
}

const QUICK_FILTERS = [
  { label: 'goose', expr: 'goose' },
  { label: 'State Change (sqNum==0)', expr: 'goose.sqNum == 0' },
  { label: 'Anomalies / Expert', expr: 'goose.anomaly' },
  { label: 'Sim Bit (simulation==true)', expr: 'goose.simulation == true' },
  { label: 'APPID 0x0001', expr: 'goose.appid == 0x0001' },
  { label: 'PRP LAN_A', expr: 'prp.lan == LAN_A' },
  { label: 'MMS (tcp.port==102)', expr: 'tcp.port == 102' },
  { label: 'IEC-104 (tcp.port==2404)', expr: 'tcp.port == 2404' },
];

type CaptureSnapshot = {
  capturing: boolean;
  packets: Packet[];
  filter: string;
  proto: string;
  selected: number | null;
};

const STORAGE_KEY = 'sas_wireshark_capture_state_v3';
const MAX_STORED_PACKETS = 500;

const captureEngine = (() => {
  let capturing = false;
  let packets: Packet[] = [];
  let filter = '';
  let proto = 'ALL';
  let selected: number | null = null;
  let count = 0;
  let prpSeqCounter = 4100;
  let iec104SendSeq = 12;
  let modbusTxId = 100;
  let lastPacketTs = Date.now();
  let initialized = false;
  const soeSeen = new Set<string>();
  const alarmSeen = new Map<string, string>();
  const gcbState = new Map<string, { stNum: number; sqNum: number }>();
  const listeners = new Set<() => void>();
  let keepaliveTimer: ReturnType<typeof setInterval> | null = null;
  let storeUnsub: (() => void) | null = null;
  let saveTimer: ReturnType<typeof setTimeout> | null = null;

  try {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        if (Array.isArray(parsed.packets)) packets = parsed.packets.slice(-MAX_STORED_PACKETS);
        if (typeof parsed.capturing === 'boolean') capturing = parsed.capturing;
        if (typeof parsed.filter === 'string') filter = parsed.filter;
        if (typeof parsed.proto === 'string') proto = parsed.proto;
        if (typeof parsed.selected === 'number' || parsed.selected === null) selected = parsed.selected;
        if (typeof parsed.count === 'number') count = parsed.count;
        else if (packets.length > 0) count = packets[packets.length - 1].no;
        if (Array.isArray(parsed.gcbState)) {
          for (const [k, v] of parsed.gcbState) {
            if (typeof k === 'string' && v && typeof v.stNum === 'number' && typeof v.sqNum === 'number') {
              gcbState.set(k, v);
            }
          }
        }
      }
    }
  } catch {
    // Ignore storage read errors
  }

  const persistNow = () => {
    if (typeof window === 'undefined') return;
    const buildPayload = (limit: number) =>
      JSON.stringify({
        capturing,
        packets: packets.slice(-limit).map((p) => ({ ...p, rawBytes: undefined })),
        filter,
        proto,
        selected,
        count,
        gcbState: Array.from(gcbState.entries()),
      });
    try {
      window.localStorage.setItem(STORAGE_KEY, buildPayload(MAX_STORED_PACKETS));
    } catch {
      try {
        window.localStorage.setItem(STORAGE_KEY, buildPayload(150));
      } catch {
        // Ignore quota errors
      }
    }
  };

  const schedulePersist = () => {
    if (saveTimer) return;
    saveTimer = setTimeout(() => {
      saveTimer = null;
      persistNow();
    }, 300);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', persistNow);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') persistNow();
    });
  }

  const notify = () => {
    schedulePersist();
    listeners.forEach((fn) => fn());
  };

  const push = (
    source: string,
    destination: string,
    protocol: string,
    info: string,
    details: string,
    opts?: { goose?: GooseMeta; tcp?: TcpMeta; expert?: ExpertFlag }
  ) => {
    const now = Date.now();
    const deltaMs = packets.length === 0 ? 0 : Math.max(1, now - lastPacketTs);
    lastPacketTs = now;
    const no = ++count;
    const d = new Date(now);
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    const time = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
    const payload = `${protocol} | ${source} > ${destination} | ${info}`;
    const rawBytes = opts?.goose
      ? buildGooseFrameBytes(opts.goose, now)
      : opts?.tcp
      ? buildTcpFrameBytes(opts.tcp, payload)
      : Array.from(new TextEncoder().encode(payload)).slice(0, 160);
    const hex = formatHexDump(rawBytes);

    packets = [
      ...packets,
      {
        no,
        time,
        tsMs: now,
        deltaMs,
        source,
        destination,
        protocol,
        length: Math.max(64, rawBytes.length),
        info,
        details,
        hex,
        rawBytes,
        goose: opts?.goose,
        tcp: opts?.tcp,
        expert: opts?.expert,
      },
    ].slice(-1500);
    notify();
  };

  const pushGooseFrame = (
    gcbIndex: number,
    isStateChange: boolean,
    reason?: string,
    anomaly?: 'SIM_BIT' | 'SEQ_GAP' | 'CONFREV_MISMATCH' | 'NDSCOM'
  ) => {
    const { gooseControlBlocks, bays, ieds } = useSubstationStore.getState();
    const gcb = gooseControlBlocks[gcbIndex % Math.max(1, gooseControlBlocks.length)];
    if (!gcb) return;

    const pubIed = ieds.find((i) => i.id === gcb.publisherIedId);
    const bay = bays.find((b) => b.iedId === gcb.publisherIedId) || bays[0];
    const prev = gcbState.get(gcb.id) || { stNum: gcb.stNum || 1, sqNum: gcb.sqNum || 0 };

    const nextSt = isStateChange ? prev.stNum + 1 : prev.stNum;
    const nextSq = anomaly === 'SEQ_GAP' ? prev.sqNum + 4 : isStateChange ? 0 : prev.sqNum + 1;
    gcbState.set(gcb.id, { stNum: nextSt, sqNum: nextSq });

    const simBit = anomaly === 'SIM_BIT' ? true : gcb.testMode;
    const ndsCom = anomaly === 'NDSCOM' ? true : gcb.ndsCom;
    const confRev = anomaly === 'CONFREV_MISMATCH' ? gcb.confRev + 1 : gcb.confRev;
    const prpLan: 'LAN_A' | 'LAN_B' = count % 2 === 0 ? 'LAN_A' : 'LAN_B';
    const prpSeqNr = ++prpSeqCounter % 65535;

    const allData: GooseMeta['allData'] = [
      { name: 'PTRC1.Tr.general', type: 'BOOLEAN', value: bay?.protectionTripActive ? 'TRUE' : 'FALSE' },
      { name: 'XCBR1.Pos.stVal', type: 'BIT-STRING(2)', value: bay?.breakerState === 'CLOSED' ? '10 (CLOSED)' : '01 (OPEN)' },
      { name: 'XCBR1.Pos.q', type: 'BIT-STRING(13)', value: bay?.quality === 'GOOD' ? '0x0000 (Good)' : '0x0100 (Invalid)' },
      { name: 'CILO1.EnaCls', type: 'BOOLEAN', value: bay?.interlockPermissive ? 'TRUE' : 'FALSE' },
    ];

    const meta: GooseMeta = {
      srcMac: pubIed?.macAddress || '00:1B:1B:10:00:11',
      dstMac: normMac(gcb.multicastMac),
      vlanId: gcb.vlanId,
      vlanPcp: gcb.vlanPriority,
      appId: gcb.appId,
      gocbRef: gcb.gocbRef,
      datSet: gcb.datSet,
      goID: gcb.gocbName,
      stNum: nextSt,
      sqNum: nextSq,
      confRev,
      talMs: gcb.timeAllowedToLiveMs,
      simulation: simBit,
      ndsCom,
      prpLan,
      prpSeqNr,
      allData,
      isStateChange,
    };

    let expert: ExpertFlag | undefined;
    if (anomaly === 'SIM_BIT') {
      expert = { level: 'WARN', code: 'GOOSE_SIM_BIT', message: 'Simulation flag (Test Mode) is TRUE — verify LPHD1.Sim before accepting' };
    } else if (anomaly === 'SEQ_GAP') {
      expert = { level: 'ERROR', code: 'GOOSE_SEQ_GAP', message: `Dropped GOOSE frames detected (sqNum jumped from ${prev.sqNum} to ${nextSq})` };
    } else if (anomaly === 'CONFREV_MISMATCH') {
      expert = { level: 'ERROR', code: 'CONFREV_MISMATCH', message: `confRev=${confRev} does not match subscriber SCD expected confRev=${gcb.confRev}` };
    } else if (anomaly === 'NDSCOM') {
      expert = { level: 'ERROR', code: 'GOOSE_NDSCOM', message: 'ndsCom=TRUE — Publisher GoCB requires commissioning (DataSet unlinked)' };
    } else if (isStateChange) {
      expert = { level: 'NOTE', code: 'STNUM_CHANGE', message: `State change burst (stNum=${nextSt}, sqNum=0)` };
    }

    const tag = anomaly
      ? `ANOMALY: ${anomaly}`
      : isStateChange
      ? `STATE CHANGE${reason ? ` (${reason})` : ''}`
      : 'Retransmission';
    const info = `goID=${meta.goID} · stNum=${nextSt}, sqNum=${nextSq} · APPID=${meta.appId} · VLAN=${meta.vlanId} · ${prpLan} [${tag}]`;
    const details = [
      `gocbRef: ${meta.gocbRef}`,
      `datSet: ${meta.datSet}`,
      `stNum: ${nextSt} | sqNum: ${nextSq} | confRev: ${confRev} | TAL: ${meta.talMs} ms`,
      `PRP RCT: ${prpLan} | SeqNr: ${prpSeqNr} | Suffix: 0x88FB`,
    ].join('\n');

    push(gcb.publisherIedName || gcb.publisherIedId, meta.dstMac, 'GOOSE', info, details, { goose: meta, expert });
  };

  const pushMmsFrame = (src: string, dst: string, summary: string, ref: string, val: string) => {
    const tcp: TcpMeta = {
      srcIp: '10.132.10.16',
      dstIp: '10.132.10.200',
      srcPort: 102,
      dstPort: 54102,
      layerSummary: 'ISO 8073 COTP -> MMS (IEC 61850-8-1) Unconfirmed-PDU (InformationReport)',
      fields: [
        { label: 'TPKT Version / Length', value: 'v3 (RFC 1006)' },
        { label: 'COTP PDU Type', value: 'DT Data (0x0f)' },
        { label: 'MMS Service', value: 'unconfirmed-PDU (InformationReport)' },
        { label: 'RptID / OptFlds', value: 'brcbStatus01 · seq-num, time-stamp, reason-for-inclusion' },
        { label: 'Object Reference', value: ref, filterExpr: `mms` },
        { label: 'Reported Value', value: val },
      ],
    };
    push(src, dst, 'MMS', summary, `${ref} = ${val}`, { tcp });
  };

  const pushIec104Frame = () => {
    iec104SendSeq = (iec104SendSeq + 2) % 32768;
    const isUFrame = iec104SendSeq % 4 === 0;
    const tcp: TcpMeta = {
      srcIp: '10.132.10.210',
      dstIp: '10.200.50.10',
      srcPort: 2404,
      dstPort: 49210,
      layerSummary: isUFrame ? 'IEC 60870-5-104 APCI (U-Frame TESTFR)' : 'IEC 60870-5-104 APCI (I-Frame) + ASDU',
      fields: isUFrame
        ? [
            { label: 'Start Byte', value: '0x68' },
            { label: 'APCI Format', value: 'U-Frame (TESTFR act / con)' },
            { label: 'TCP Port', value: '2404', filterExpr: 'tcp.port == 2404' },
          ]
        : [
            { label: 'APCI Format', value: `I-Frame · Tx=${iec104SendSeq}, Rx=${iec104SendSeq - 2}` },
            { label: 'ASDU Type ID', value: '31 (M_DP_TB_1 — Double-point info w/ CP56Time2a)' },
            { label: 'Cause of Transmission (COT)', value: '3 (Spontaneous) / 20 (Interrogated by station)' },
            { label: 'Common Address (COA)', value: '132 (0x0084)' },
            { label: 'IOA', value: '1001 (33-F03 CB Position)' },
          ],
    };
    push(
      'Station Gateway (10.132.10.210)',
      'RCC Control Centre (10.200.50.10)',
      'IEC104',
      isUFrame ? 'U-Frame: TESTFR act / con (TCP/2404)' : `I-Frame (Tx=${iec104SendSeq}): TypeID=31 M_DP_TB_1 · COA=132 · IOA=1001`,
      tcp.layerSummary,
      { tcp }
    );
  };

  const pushModbusFrame = () => {
    modbusTxId = (modbusTxId + 1) % 65535;
    const tcp: TcpMeta = {
      srcIp: '10.132.10.210',
      dstIp: '10.132.30.51',
      srcPort: 51822,
      dstPort: 502,
      layerSummary: 'Modbus/TCP MBAP Header + Function Code 0x04 (Read Input Registers)',
      fields: [
        { label: 'Transaction Identifier', value: `${modbusTxId}` },
        { label: 'Protocol Identifier', value: '0x0000 (Modbus)' },
        { label: 'Unit Identifier', value: '1 (Feeder MFM)' },
        { label: 'Function Code', value: '0x04 (Read Input Registers)' },
        { label: 'Reference / Count', value: 'Reg 30001 · Word Count = 12 (V, I, P, Q, PF)' },
      ],
    };
    push(
      'Station Gateway',
      'Feeder MFM (10.132.30.51)',
      'Modbus',
      `Query TxID=${modbusTxId} · Unit=1 · FC=04 Read Input Registers (30001..30012)`,
      tcp.layerSummary,
      { tcp }
    );
  };

  const syncFromStore = () => {
    const { soeLog: soe, alarms, gooseControlBlocks } = useSubstationStore.getState();
    if (!initialized) {
      soe.forEach((e) => soeSeen.add(e.id));
      alarms.forEach((a) => alarmSeen.set(a.id, a.state));
      gooseControlBlocks.forEach((g) => gcbState.set(g.id, { stNum: g.stNum, sqNum: g.sqNum }));
      initialized = true;
      return;
    }
    if (!capturing) return;

    const fresh = soe.filter((e) => !soeSeen.has(e.id)).reverse();
    for (const e of fresh) {
      soeSeen.add(e.id);
      const isGoose = /GOOSE|TRIP|PROTECTION|BREAKER|LOCKOUT/i.test(e.cause + ' ' + e.eventDescription);
      if (isGoose && gooseControlBlocks.length > 0) {
        const idx = Math.max(
          0,
          gooseControlBlocks.findIndex((g) => g.publisherIedId === e.iedId)
        );
        pushGooseFrame(idx, true, e.valueChange || e.cause);
        continue;
      }
      if (/IEC.?104|RCC/i.test(e.eventDescription)) {
        pushIec104Frame();
      } else if (/Modbus|register/i.test(e.eventDescription)) {
        pushModbusFrame();
      } else {
        pushMmsFrame(
          e.iedId || e.bayName,
          'SCADA Server (10.132.10.200)',
          `MMS Report: ${e.eventDescription} · ${e.valueChange}`,
          e.sourceRef,
          e.valueChange
        );
      }
    }

    for (const a of alarms) {
      const prior = alarmSeen.get(a.id);
      if (prior !== a.state) {
        alarmSeen.set(a.id, a.state);
        pushMmsFrame(
          a.iedId || a.bayName,
          'SCADA Server (10.132.10.200)',
          `MMS Alarm Report: ${a.signalName} = ${a.state}`,
          a.iec61850Ref,
          `${a.state} (${a.severity})`
        );
      }
    }
  };

  const startTimers = () => {
    if (!storeUnsub) {
      syncFromStore();
      storeUnsub = useSubstationStore.subscribe(() => {
        syncFromStore();
      });
    }
    if (!keepaliveTimer) {
      keepaliveTimer = setInterval(() => {
        const slot = count % 5;
        if (slot === 0 || slot === 2) {
          pushGooseFrame(Math.floor(count / 2), false);
        } else if (slot === 1) {
          pushMmsFrame(
            'IED_33_F03 (10.132.10.16)',
            'SCADA Server (10.132.10.200)',
            'MMS InformationReport · BRCB01 (dsStatus Integrity Poll)',
            'IED_33_F03/LLN0$BR$brcbStatus01',
            'XCBR1.Pos.stVal=CLOSED, q=0x0000'
          );
        } else if (slot === 3) {
          pushIec104Frame();
        } else {
          pushModbusFrame();
        }
      }, 1450);
    }
  };

  const stopTimers = () => {
    if (keepaliveTimer) {
      clearInterval(keepaliveTimer);
      keepaliveTimer = null;
    }
    if (storeUnsub) {
      storeUnsub();
      storeUnsub = null;
    }
  };

  return {
    getSnapshot: (): CaptureSnapshot => ({ capturing, packets, filter, proto, selected }),
    subscribe: (fn: () => void) => {
      listeners.add(fn);
      return () => {
        listeners.delete(fn);
      };
    },
    toggleCapturing: () => {
      capturing = !capturing;
      if (capturing) {
        const { soeLog: soe, alarms, gooseControlBlocks } = useSubstationStore.getState();
        soe.forEach((e) => soeSeen.add(e.id));
        alarms.forEach((a) => alarmSeen.set(a.id, a.state));
        gooseControlBlocks.forEach((g) => {
          if (!gcbState.has(g.id)) gcbState.set(g.id, { stNum: g.stNum, sqNum: g.sqNum });
        });
        initialized = true;
        startTimers();
      } else {
        stopTimers();
      }
      notify();
    },
    triggerGooseTestBurst: () => {
      pushGooseFrame(0, true, '50/51 Trip Burst');
      setTimeout(() => pushGooseFrame(0, false), 110);
      setTimeout(() => pushGooseFrame(0, false), 260);
    },
    triggerAnomalyDemo: () => {
      const types: Array<'SIM_BIT' | 'SEQ_GAP' | 'CONFREV_MISMATCH' | 'NDSCOM'> = [
        'SEQ_GAP',
        'SIM_BIT',
        'CONFREV_MISMATCH',
        'NDSCOM',
      ];
      const chosen = types[count % types.length];
      pushGooseFrame(0, false, undefined, chosen);
    },
    clear: () => {
      packets = [];
      selected = null;
      count = 0;
      persistNow();
      notify();
    },
    setFilter: (v: string) => {
      filter = v;
      notify();
    },
    setProto: (v: string) => {
      proto = v;
      notify();
    },
    setSelected: (v: number | null) => {
      selected = v;
      notify();
    },
  };
})();

if (captureEngine.getSnapshot().capturing) {
  setTimeout(() => {
    if (captureEngine.getSnapshot().capturing) {
      captureEngine.toggleCapturing();
      captureEngine.toggleCapturing();
    }
  }, 50);
}

export function WiresharkAnalyzerPage() {
  const [snap, setSnap] = useState<CaptureSnapshot>(() => captureEngine.getSnapshot());
  const [openLayers, setOpenLayers] = useState<Record<string, boolean>>({
    eth: true,
    vlan: true,
    gooseHdr: true,
    goosePdu: true,
    allData: true,
    prp: true,
    tcp: true,
    app: true,
  });

  useEffect(() => {
    setSnap(captureEngine.getSnapshot());
    return captureEngine.subscribe(() => setSnap(captureEngine.getSnapshot()));
  }, []);

  const { capturing, packets, filter, proto, selected } = snap;

  // Live Protocol Hierarchy & Expert Anomaly Stats
  const stats = useMemo(() => {
    const counts = { GOOSE: 0, MMS: 0, IEC104: 0, Modbus: 0, SNTP: 0, anomalies: 0, bursts: 0 };
    for (const p of packets) {
      if (p.protocol in counts) counts[p.protocol as keyof typeof counts]++;
      if (p.expert?.level === 'ERROR' || p.expert?.level === 'WARN') counts.anomalies++;
      if (p.goose?.isStateChange) counts.bursts++;
    }
    return counts;
  }, [packets]);

  const { filtered, filterValid } = useMemo(() => {
    let valid = true;
    const out = packets.filter((p) => {
      if (proto !== 'ALL' && p.protocol !== proto) return false;
      const res = evaluateDisplayFilter(filter, p);
      if (!res.valid) valid = false;
      return res.ok;
    });
    if (packets.length === 0 && filter.trim()) {
      const probe = evaluateDisplayFilter(filter, {
        no: 1,
        time: '00:00:00.000',
        tsMs: Date.now(),
        deltaMs: 0,
        source: '',
        destination: '',
        protocol: 'GOOSE',
        length: 128,
        info: '',
        details: '',
        hex: '',
      });
      valid = probe.valid;
    }
    return { filtered: out, filterValid: valid };
  }, [packets, proto, filter]);

  const current = packets.find((p) => p.no === selected) || filtered[filtered.length - 1];
  const toggleLayer = (key: string) => setOpenLayers((prev) => ({ ...prev, [key]: !prev[key] }));

  // Mini I/O Graph bars (last 28 filtered packets' deltaMs or burst spikes)
  const ioBars = useMemo(() => {
    const recent = filtered.slice(-28);
    return recent.map((p) => ({
      no: p.no,
      isBurst: Boolean(p.goose?.isStateChange),
      isAnomaly: p.expert?.level === 'ERROR' || p.expert?.level === 'WARN',
      height: p.goose?.isStateChange ? 26 : p.expert ? 24 : p.protocol === 'GOOSE' ? 16 : 11,
      proto: p.protocol,
    }));
  }, [filtered]);

  const exportCsv = () => {
    const rows = [
      ['No', 'Time', 'DeltaMs', 'Source', 'Destination', 'Protocol', 'Length', 'Expert', 'Info'],
      ...filtered.map((p) => [
        String(p.no),
        p.time,
        String(p.deltaMs),
        p.source,
        p.destination,
        p.protocol,
        String(p.length),
        p.expert ? `${p.expert.level}:${p.expert.code}` : '',
        p.info,
      ]),
    ];
    const data = rows.map((row) => row.map((v) => `"${v.replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\uFEFF' + data], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sas-simulated-packet-capture.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const applyFilterChip = (expr: string) => {
    captureEngine.setFilter(expr);
  };

  const FilterInlineBtn: React.FC<{ expr: string; title?: string }> = ({ expr, title }) => (
    <button
      type="button"
      onClick={() => applyFilterChip(expr)}
      title={title || `Apply as Filter: ${expr}`}
      style={{
        marginLeft: 6,
        border: '1px solid #1e5b7a',
        borderRadius: 4,
        padding: '0px 5px',
        background: '#06263a',
        color: '#38bdf8',
        fontSize: 9.5,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      <Filter size={9} /> Filter
    </button>
  );

  return (
    <section
      style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr)', gap: 10, color: '#e5f6ff', minHeight: '80vh' }}
    >
      {/* Header + Live Protocol Hierarchy & I/O Sparkline */}
      <header
        className="sas-wireshark-panel"
        style={{ ...panel, display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, alignItems: 'center' }}
      >
        <div>
          <h1 style={{ fontSize: 20, color: '#00dcff', fontWeight: 800, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Network /> Wireshark Pro — IEC 61850 GOOSE, MMS, IEC-104 &amp; PRP Analyzer
          </h1>
          <p style={{ fontSize: 11.5, color: '#9dbbcf' }}>
            Persistent capture · Binary .PCAP export (opens in real Wireshark) · Expert Anomaly Detection · PRP RCT · Click-to-Filter Dissection
          </p>
        </div>

        {/* Protocol Hierarchy Counters + Mini I/O Graph */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, fontFamily: 'monospace', fontSize: 11 }}>
          <button
            type="button"
            onClick={() => applyFilterChip('goose')}
            style={{ ...btn, padding: '3px 8px', background: '#0b362b', borderColor: '#22c55e', color: '#86efac' }}
          >
            GOOSE: {stats.GOOSE}
          </button>
          <button
            type="button"
            onClick={() => applyFilterChip('mms')}
            style={{ ...btn, padding: '3px 8px', background: '#0c2845', borderColor: '#38bdf8', color: '#7dd3fc' }}
          >
            MMS: {stats.MMS}
          </button>
          <button
            type="button"
            onClick={() => applyFilterChip('iec104')}
            style={{ ...btn, padding: '3px 8px', background: '#241740', borderColor: '#a855f7', color: '#d8b4fe' }}
          >
            104: {stats.IEC104}
          </button>
          <button
            type="button"
            onClick={() => applyFilterChip('modbus')}
            style={{ ...btn, padding: '3px 8px', background: '#382110', borderColor: '#f97316', color: '#fdba74' }}
          >
            Modbus: {stats.Modbus}
          </button>
          <button
            type="button"
            onClick={() => applyFilterChip('goose.anomaly')}
            style={{
              ...btn,
              padding: '3px 8px',
              background: stats.anomalies > 0 ? '#450d17' : '#082032',
              borderColor: stats.anomalies > 0 ? '#ef4444' : '#275975',
              color: stats.anomalies > 0 ? '#fca5a5' : '#94a3b8',
            }}
          >
            <AlertTriangle size={12} /> Anomalies: {stats.anomalies}
          </button>
          <div
            title="Live I/O Traffic Sparkline (Yellow = GOOSE Burst, Red = Anomaly)"
            style={{
              display: 'inline-flex',
              alignItems: 'flex-end',
              gap: 2,
              height: 28,
              padding: '2px 6px',
              borderRadius: 6,
              border: '1px solid #1e4b66',
              background: '#041422',
            }}
          >
            <Activity size={12} style={{ color: '#00dcff', alignSelf: 'center', marginRight: 3 }} />
            {ioBars.length === 0 ? (
              <span style={{ fontSize: 9.5, color: '#64748b', alignSelf: 'center' }}>I/O Idle</span>
            ) : (
              ioBars.map((b) => (
                <span
                  key={b.no}
                  style={{
                    width: 3,
                    height: b.height,
                    borderRadius: 1,
                    background: b.isAnomaly ? '#ef4444' : b.isBurst ? '#facc15' : b.proto === 'GOOSE' ? '#22c55e' : '#38bdf8',
                  }}
                />
              ))
            )}
          </div>
          <strong style={{ color: capturing ? '#22c55e' : '#ffb547' }}>
            {capturing ? '● CAPTURING' : '■ STOPPED'}
          </strong>
        </div>
      </header>

      {/* Controls + Display Filter Bar */}
      <div className="sas-wireshark-panel" style={{ ...panel, display: 'grid', gap: 8 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 7 }}>
          <button style={btn} onClick={() => captureEngine.toggleCapturing()}>
            {capturing ? <><Square size={13} /> Stop</> : <><Play size={13} /> Start Capture</>}
          </button>
          <button
            style={{ ...btn, borderColor: '#22c55e', background: '#073624', color: '#86efac', fontWeight: 700 }}
            onClick={() => captureEngine.triggerGooseTestBurst()}
            title="Emit GOOSE state-change burst (stNum+1, sqNum=0 -> 1 -> 2)"
          >
            <Zap size={13} /> GOOSE Burst
          </button>
          <button
            style={{ ...btn, borderColor: '#f59e0b', background: '#3a2208', color: '#fde68a', fontWeight: 700 }}
            onClick={() => captureEngine.triggerAnomalyDemo()}
            title="Inject GOOSE anomaly (Sequence Gap, Sim Bit, ConfRev Mismatch, or ndsCom)"
          >
            <ShieldAlert size={13} /> Inject Anomaly
          </button>
          <button style={btn} onClick={() => captureEngine.clear()}>
            <Trash2 size={13} /> Clear
          </button>
          <button
            style={{ ...btn, borderColor: '#00dfff', background: '#072d44', color: '#7dd3fc', fontWeight: 700 }}
            onClick={() => exportPacketsToPcap(filtered)}
            disabled={filtered.length === 0}
            title="Export standard binary .pcap file that opens directly in desktop Wireshark"
          >
            <FileDown size={13} /> Export .PCAP
          </button>
          <button style={btn} onClick={exportCsv} disabled={filtered.length === 0}>
            <Download size={13} /> CSV
          </button>

          <Search size={15} />
          <input
            aria-label="Wireshark display filter"
            placeholder="Filter: goose.sqNum == 0 || tcp.port == 102 || goose.anomaly"
            value={filter}
            onChange={(e) => captureEngine.setFilter(e.target.value)}
            style={{
              ...btn,
              flex: 1,
              minWidth: 210,
              fontFamily: 'monospace',
              borderColor: !filter.trim() ? '#27738d' : filterValid ? '#22c55e' : '#ef4444',
              background: !filter.trim() ? '#072233' : filterValid ? '#062b1f' : '#3a1019',
            }}
          />
          {filter && (
            <button style={btn} onClick={() => captureEngine.setFilter('')}>
              Reset
            </button>
          )}
          <select aria-label="Protocol" value={proto} onChange={(e) => captureEngine.setProto(e.target.value)} style={btn}>
            {['ALL', 'GOOSE', 'MMS', 'Modbus', 'IEC104', 'SNTP'].map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
          <span style={{ fontSize: 11.5, color: '#9bbad0', fontFamily: 'monospace' }}>
            {filtered.length}/{packets.length}
          </span>
        </div>

        {/* 1-Click Quick Display Filter Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span style={{ color: '#7dd3fc', fontWeight: 700 }}>Quick Filters:</span>
          {QUICK_FILTERS.map((qf) => {
            const active = filter.trim() === qf.expr;
            return (
              <button
                key={qf.label}
                type="button"
                onClick={() => captureEngine.setFilter(active ? '' : qf.expr)}
                style={{
                  border: `1px solid ${active ? '#00e5ff' : '#1f5370'}`,
                  borderRadius: 999,
                  padding: '2.5px 8px',
                  background: active ? '#00d4ff' : '#062033',
                  color: active ? '#021222' : '#bae6fd',
                  fontFamily: 'monospace',
                  fontWeight: 700,
                  cursor: 'pointer',
                  fontSize: 10.5,
                }}
              >
                {qf.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Packet List Table */}
      <div
        className="sas-wireshark-panel"
        style={{ ...panel, overflowX: 'auto', height: 'min(40vh,420px)', overflowY: 'auto', padding: 0 }}
      >
        <table style={{ borderCollapse: 'collapse', width: '100%', textAlign: 'left', fontSize: 11.5, fontFamily: 'monospace' }}>
          <thead style={{ position: 'sticky', top: 0, background: '#10334b', zIndex: 1 }}>
            <tr>
              {['No.', 'Time', 'Δ ms', 'Source', 'Destination', 'Protocol', 'Len', 'Info'].map((x) => (
                <th key={x} style={{ padding: '8px 9px', borderBottom: '1px solid #27738d', whiteSpace: 'nowrap' }}>
                  {x}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => {
              const isChange = p.goose?.isStateChange;
              const isErr = p.expert?.level === 'ERROR';
              const isWarn = p.expert?.level === 'WARN';
              return (
                <tr
                  key={p.no}
                  onClick={() => captureEngine.setSelected(p.no)}
                  style={{
                    cursor: 'pointer',
                    background:
                      selected === p.no
                        ? '#126181'
                        : isErr
                        ? '#4a1019'
                        : isWarn
                        ? '#422809'
                        : isChange
                        ? '#3b1c12'
                        : p.protocol === 'GOOSE'
                        ? '#0d362d'
                        : p.protocol === 'MMS'
                        ? '#102842'
                        : p.protocol === 'IEC104'
                        ? '#1d1433'
                        : p.protocol === 'Modbus'
                        ? '#2b1e14'
                        : 'transparent',
                    color: isErr ? '#fecaca' : isWarn || isChange ? '#fde68a' : '#e5f6ff',
                    fontWeight: isErr || isWarn || isChange ? 700 : 400,
                    borderBottom: '1px solid #17394e',
                  }}
                >
                  {[p.no, p.time, `+${p.deltaMs}`, p.source, p.destination, p.protocol, p.length, p.info].map((v, i) => (
                    <td key={i} style={{ padding: '6.5px 9px', whiteSpace: i === 7 ? 'normal' : 'nowrap' }}>
                      {v}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!filtered.length && (
          <p style={{ padding: 18, color: '#93b4c9' }}>
            {packets.length === 0
              ? 'Press Start Capture, GOOSE Burst, or Inject Anomaly to inspect live IEC 61850 GOOSE, MMS, IEC-104, Modbus & PRP frames.'
              : 'No captured packets match the current display filter.'}
          </p>
        )}
      </div>

      {/* Packet Dissection Tree + Hex / ASCII Preview */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,340px),1fr))', gap: 12 }}>
        <div className="sas-wireshark-panel" style={{ ...panel, minHeight: 220, fontFamily: 'monospace', fontSize: 11.5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, gap: 8, flexWrap: 'wrap' }}>
            <h2 style={{ color: '#00dfff', fontWeight: 700, fontFamily: 'sans-serif', fontSize: 13 }}>
              Packet Details (Dissection Tree · Click Filter to Isolate)
            </h2>
            {current?.goose && (
              <button
                type="button"
                onClick={() => applyFilterChip(`goose.gocbRef == "${current.goose!.gocbRef}"`)}
                style={{ ...btn, padding: '2px 8px', fontSize: 10.5, borderColor: '#38bdf8', color: '#7dd3fc' }}
              >
                <Filter size={11} /> Follow GOOSE Stream
              </button>
            )}
          </div>

          {current?.expert && (
            <div
              style={{
                marginBottom: 8,
                padding: '6px 9px',
                borderRadius: 6,
                border: `1px solid ${current.expert.level === 'ERROR' ? '#ef4444' : current.expert.level === 'WARN' ? '#f59e0b' : '#38bdf8'}`,
                background: current.expert.level === 'ERROR' ? '#3d0e16' : current.expert.level === 'WARN' ? '#382208' : '#082538',
                color: current.expert.level === 'ERROR' ? '#fecaca' : current.expert.level === 'WARN' ? '#fde68a' : '#bae6fd',
                fontSize: 11,
              }}
            >
              <strong>[Expert {current.expert.level} · {current.expert.code}]</strong> {current.expert.message}
            </div>
          )}

          {current?.goose ? (
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ color: '#bae6fd' }}>
                Frame {current.no}: {current.length} bytes on wire · Time {current.time} (Δ +{current.deltaMs} ms)
              </div>

              {/* Ethernet II */}
              <div>
                <button type="button" onClick={() => toggleLayer('eth')} style={{ background: 'none', border: 0, color: '#7dd3fc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.eth ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  Ethernet II, Src: {current.goose.srcMac}, Dst: {current.goose.dstMac}
                </button>
                {openLayers.eth && (
                  <div style={{ paddingLeft: 18, color: '#cbd5e1' }}>
                    <div>
                      Destination: {current.goose.dstMac} (GOOSE Multicast)
                      <FilterInlineBtn expr={`eth.dst == ${current.goose.dstMac}`} />
                    </div>
                    <div>
                      Source: {current.goose.srcMac} ({current.source})
                      <FilterInlineBtn expr={`eth.src == ${current.goose.srcMac}`} />
                    </div>
                    <div>Type: 802.1Q Virtual LAN (0x8100)</div>
                  </div>
                )}
              </div>

              {/* 802.1Q VLAN */}
              <div>
                <button type="button" onClick={() => toggleLayer('vlan')} style={{ background: 'none', border: 0, color: '#fde047', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.vlan ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  802.1Q Virtual LAN, PRI: {current.goose.vlanPcp}, ID: {current.goose.vlanId}
                </button>
                {openLayers.vlan && (
                  <div style={{ paddingLeft: 18, color: '#cbd5e1' }}>
                    <div>
                      vlan.priority = {current.goose.vlanPcp} | vlan.id = {current.goose.vlanId}
                      <FilterInlineBtn expr={`vlan.id == ${current.goose.vlanId}`} />
                    </div>
                    <div>Encapsulated Type: IEC 61850 GOOSE (0x88b8)</div>
                  </div>
                )}
              </div>

              {/* GOOSE Header */}
              <div>
                <button type="button" onClick={() => toggleLayer('gooseHdr')} style={{ background: 'none', border: 0, color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.gooseHdr ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  GOOSE Header — APPID: {current.goose.appId}
                </button>
                {openLayers.gooseHdr && (
                  <div style={{ paddingLeft: 18, color: '#cbd5e1' }}>
                    <div>
                      goose.appid: {current.goose.appId}
                      <FilterInlineBtn expr={`goose.appid == ${current.goose.appId}`} />
                    </div>
                    <div>Reserved 1: {current.goose.simulation ? '0x8000 (Simulation=TRUE)' : '0x0000'} | Reserved 2: 0x0000</div>
                  </div>
                )}
              </div>

              {/* goosePdu */}
              <div>
                <button type="button" onClick={() => toggleLayer('goosePdu')} style={{ background: 'none', border: 0, color: '#38bdf8', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.goosePdu ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  goosePdu (stNum={current.goose.stNum}, sqNum={current.goose.sqNum})
                </button>
                {openLayers.goosePdu && (
                  <div style={{ paddingLeft: 18, color: '#e2f1ff' }}>
                    <div>
                      gocbRef: {current.goose.gocbRef}
                      <FilterInlineBtn expr={`goose.gocbRef == "${current.goose.gocbRef}"`} />
                    </div>
                    <div>timeAllowedtoLive: {current.goose.talMs} ms | datSet: {current.goose.datSet}</div>
                    <div style={{ color: current.goose.sqNum === 0 ? '#fde047' : '#86efac', fontWeight: 700 }}>
                      stNum: {current.goose.stNum} | sqNum: {current.goose.sqNum}
                      <FilterInlineBtn expr={`goose.stNum == ${current.goose.stNum}`} />
                    </div>
                    <div>
                      simulation: {String(current.goose.simulation)} | confRev: {current.goose.confRev} | ndsCom: {String(current.goose.ndsCom)}
                    </div>
                  </div>
                )}
              </div>

              {/* allData */}
              <div>
                <button type="button" onClick={() => toggleLayer('allData')} style={{ background: 'none', border: 0, color: '#c084fc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.allData ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  allData: {current.goose.allData.length} items
                </button>
                {openLayers.allData && (
                  <div style={{ paddingLeft: 18, color: '#e9d5ff' }}>
                    {current.goose.allData.map((item, idx) => (
                      <div key={idx}>
                        Data[{idx}] {item.name} ({item.type}): <b style={{ color: '#ffffff' }}>{item.value}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* IEC 62439-3 PRP Trailer */}
              <div>
                <button type="button" onClick={() => toggleLayer('prp')} style={{ background: 'none', border: 0, color: '#f472b6', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.prp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  Parallel Redundancy Protocol (PRP RCT · Suffix 0x88FB)
                </button>
                {openLayers.prp && (
                  <div style={{ paddingLeft: 18, color: '#fbcfe8' }}>
                    <div>
                      LanId: {current.goose.prpLan} ({current.goose.prpLan === 'LAN_A' ? '0xA' : '0xB'}) | SeqNr: {current.goose.prpSeqNr}
                      <FilterInlineBtn expr={`prp.lan == ${current.goose.prpLan}`} />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : current?.tcp ? (
            <div style={{ display: 'grid', gap: 4 }}>
              <div style={{ color: '#bae6fd' }}>
                Frame {current.no}: {current.length} bytes on wire · Time {current.time} (Δ +{current.deltaMs} ms)
              </div>
              <div>
                <button type="button" onClick={() => toggleLayer('tcp')} style={{ background: 'none', border: 0, color: '#7dd3fc', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.tcp ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  IPv4 / TCP — {current.tcp.srcIp}:{current.tcp.srcPort} → {current.tcp.dstIp}:{current.tcp.dstPort}
                </button>
                {openLayers.tcp && (
                  <div style={{ paddingLeft: 18, color: '#cbd5e1' }}>
                    <div>
                      Src IP: {current.tcp.srcIp} → Dst IP: {current.tcp.dstIp}
                      <FilterInlineBtn expr={`ip.addr == ${current.tcp.dstIp}`} />
                    </div>
                    <div>
                      TCP Ports: {current.tcp.srcPort} → {current.tcp.dstPort}
                      <FilterInlineBtn expr={`tcp.port == ${current.tcp.dstPort === 102 || current.tcp.dstPort === 2404 || current.tcp.dstPort === 502 ? current.tcp.dstPort : current.tcp.srcPort}`} />
                    </div>
                  </div>
                )}
              </div>
              <div>
                <button type="button" onClick={() => toggleLayer('app')} style={{ background: 'none', border: 0, color: '#4ade80', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, padding: 0, fontFamily: 'monospace', fontWeight: 700 }}>
                  {openLayers.app ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  {current.tcp.layerSummary}
                </button>
                {openLayers.app && (
                  <div style={{ paddingLeft: 18, color: '#e2f1ff' }}>
                    {current.tcp.fields.map((f, idx) => (
                      <div key={idx}>
                        {f.label}: <b style={{ color: '#ffffff' }}>{f.value}</b>
                        {f.filterExpr && <FilterInlineBtn expr={f.filterExpr} />}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : current ? (
            <>
              <p>Frame {current.no} · {current.length} bytes · {current.time} (Δ +{current.deltaMs} ms)</p>
              <p>Source: {current.source} → Destination: {current.destination} ({current.protocol})</p>
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#b4d9e9', marginTop: 8 }}>{current.details}</pre>
            </>
          ) : (
            <p style={{ color: '#8aa9bc' }}>Select any packet to inspect Ethernet / VLAN / GOOSE / PRP / MMS / IEC-104 / Modbus layers.</p>
          )}
        </div>

        <div className="sas-wireshark-panel" style={{ ...panel, minHeight: 220 }}>
          <h2 style={{ color: '#00dfff', fontWeight: 700, marginBottom: 8, fontSize: 13 }}>
            Hex / ASCII Wire Byte View (802.1Q + 0x88B8 + PRP 0x88FB)
          </h2>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 11, color: '#9bd8ed', overflowWrap: 'anywhere', lineHeight: 1.45 }}>
            {current?.hex || 'No packet selected'}
          </pre>
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#dff4ff' }}>
        Simulation capture derived from live substation model. Exported <code>.pcap</code> uses standard Libpcap Ethernet framing so you can open it directly in desktop Wireshark.
        Supported filters: <code>goose</code>, <code>goose.stNum</code>, <code>goose.sqNum == 0</code>, <code>goose.appid</code>, <code>goose.simulation == true</code>, <code>goose.anomaly</code>, <code>prp.lan == LAN_A</code>, <code>vlan.id</code>, <code>tcp.port == 102</code>, <code>ip.addr</code>.
      </p>
    </section>
  );
}
