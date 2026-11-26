import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// Elseta VINCI Protocol Analyser — Multi-Protocol Master/Slave Suite
// Supports IEC 60870-5-104, IEC 60870-5-101, IEC 60870-5-103, Modbus TCP,
// DNP3 (IEEE 1815), and IEC 61850 MMS with live Substation Store sync,
// Traffic / Statistics / Console tabs, Hex+ASCII Dump, Layer Dissector,
// and CSV / TXT trace export.
// ============================================================================

type VinciProtocol = 'IEC104' | 'IEC101' | 'IEC103' | 'MODBUS_TCP' | 'DNP3' | 'IEC61850_MMS';
type VinciRole = 'MASTER' | 'SLAVE';
type RightViewTab = 'TRAFFIC' | 'STATS' | 'CONSOLE';
type DirFilter = 'ALL' | 'TX' | 'RX';

interface TracePacket {
  id: number;
  time: string;
  dir: 'TX' | 'RX';
  protocol: VinciProtocol;
  bytes: number;
  summary: string;
  hex: string;
  layers: Array<{ name: string; details: string }>;
}

interface PersistedVinci {
  protocol: VinciProtocol;
  role: VinciRole;
  running: boolean;
  ip: string;
  port: number;
  pollMs: number;
  selectedBayIdx: number;
}

const STORAGE_KEY = 'sas_vinci_analyser_pro_v2';
let memCache: PersistedVinci | null = null;

function loadInit(): Partial<PersistedVinci> {
  if (memCache) return memCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedVinci;
      if (parsed && typeof parsed === 'object') {
        memCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

function saveState(st: PersistedVinci) {
  memCache = st;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  } catch {
    // Ignore quota errors
  }
}

const PROTO_DEFAULTS: Record<VinciProtocol, { label: string; port: number; ip: string; transport: string }> = {
  IEC104: { label: 'IEC 60870-5-104', port: 2404, ip: '10.132.10.250', transport: 'TCP/IP' },
  IEC101: { label: 'IEC 60870-5-101', port: 4001, ip: '10.132.10.251', transport: 'Serial/TCP' },
  IEC103: { label: 'IEC 60870-5-103', port: 4003, ip: '10.132.10.253', transport: 'RS-485/TCP' },
  MODBUS_TCP: { label: 'Modbus TCP/IP', port: 502, ip: '10.132.10.200', transport: 'TCP/IP' },
  DNP3: { label: 'DNP3 (IEEE 1815)', port: 20000, ip: '10.132.10.252', transport: 'TCP/IP' },
  IEC61850_MMS: { label: 'IEC 61850 MMS', port: 102, ip: '10.132.10.11', transport: 'ISO/TCP' },
};

function fmtTs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function hex2(n: number): string {
  return (n & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

function hexToAscii(hexStr: string): string {
  return hexStr
    .trim()
    .split(/\s+/)
    .map((h) => {
      const code = parseInt(h, 16);
      return Number.isFinite(code) && code >= 32 && code <= 126 ? String.fromCharCode(code) : '.';
    })
    .join('');
}

export const VinciProtocolTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { bays, commandBreaker } = useSubstationStore();

  const [protocol, setProtocol] = useState<VinciProtocol>(() => init.protocol || 'IEC104');
  const [role, setRole] = useState<VinciRole>(() => init.role || 'MASTER');
  const [running, setRunning] = useState<boolean>(() => Boolean(init.running));
  const [ip, setIp] = useState<string>(() => init.ip || '10.132.10.250');
  const [port, setPort] = useState<number>(() => init.port || 2404);
  const [pollMs, setPollMs] = useState<number>(() => init.pollMs || 1500);
  const [selectedBayIdx, setSelectedBayIdx] = useState<number>(() => init.selectedBayIdx || 0);

  const [rightTab, setRightTab] = useState<RightViewTab>('TRAFFIC');
  const [dirFilter, setDirFilter] = useState<DirFilter>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [packets, setPackets] = useState<TracePacket[]>([]);
  const [consoleLines, setConsoleLines] = useState<string[]>([
    `[${fmtTs()}] VINCI Protocol Analyser initialized. Select protocol & click Start to begin capture.`,
  ]);
  const [selectedPktId, setSelectedPktId] = useState<number | null>(null);

  const pktIdRef = useRef<number>(1);
  const seqRef = useRef<number>(1);
  const traceRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveState({ protocol, role, running, ip, port, pollMs, selectedBayIdx });
  }, [protocol, role, running, ip, port, pollMs, selectedBayIdx]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight;
    }
  }, [packets.length]);

  const activeBay = bays[Math.max(0, Math.min(bays.length - 1, selectedBayIdx))] || bays[0];

  const pushConsole = (msg: string) => {
    setConsoleLines((prev) => [...prev.slice(-150), `[${fmtTs()}] ${msg}`]);
  };

  const pushPacket = (
    dir: 'TX' | 'RX',
    proto: VinciProtocol,
    summary: string,
    hex: string,
    layers: Array<{ name: string; details: string }>
  ) => {
    pktIdRef.current += 1;
    const id = pktIdRef.current;
    const bytes = hex.trim() ? hex.trim().split(/\s+/).length : 0;
    setPackets((prev) => [...prev.slice(-200), { id, time: fmtTs(), dir, protocol: proto, bytes, summary, hex, layers }]);
  };

  const handleSelectProtocol = (nextProto: VinciProtocol) => {
    setProtocol(nextProto);
    setIp(PROTO_DEFAULTS[nextProto].ip);
    setPort(PROTO_DEFAULTS[nextProto].port);
    pushConsole(`Switched protocol profile to ${PROTO_DEFAULTS[nextProto].label} (${PROTO_DEFAULTS[nextProto].ip}:${PROTO_DEFAULTS[nextProto].port}).`);
  };

  // Build live protocol-specific point list for the selected Bay
  const systemPoints = useMemo(() => {
    if (!activeBay) return [];
    const base = (selectedBayIdx + 1) * 100;
    const vKv = (activeBay.voltageAbKv ?? activeBay.voltageKv ?? 0).toFixed(2);
    const iA = (activeBay.currentA ?? 0).toFixed(1);
    const pMw = (activeBay.activePowerMw ?? 0).toFixed(2);

    const addrFmt = (offset: number, suffix: string) => {
      if (protocol === 'IEC104' || protocol === 'IEC101') return `IOA ${base + offset}`;
      if (protocol === 'IEC103') return `FUN 128 / INF ${160 + offset}`;
      if (protocol === 'MODBUS_TCP') return `Reg ${40000 + offset}`;
      if (protocol === 'DNP3') return `Obj ${offset <= 3 ? '01' : '30'} Idx ${offset - 1}`;
      return `${activeBay.iedId}/${suffix}`;
    };

    return [
      {
        addr: addrFmt(1, 'XCBR1.Pos.stVal'),
        name: `Circuit Breaker (${activeBay.breakerId})`,
        value: activeBay.breakerState,
        quality: activeBay.quality,
        writable: true,
      },
      {
        addr: addrFmt(2, 'PTRC1.Tr.general'),
        name: 'Protection Trip / 86 Lockout',
        value: activeBay.protectionTripActive ? 'ACTIVE' : 'NORMAL',
        quality: activeBay.quality,
        writable: false,
      },
      {
        addr: addrFmt(3, 'LLN0.Loc.stVal'),
        name: '43LR Control Mode',
        value: activeBay.localRemote,
        quality: activeBay.quality,
        writable: false,
      },
      {
        addr: addrFmt(11, 'MMXU1.PPV.phsAB'),
        name: 'Bus Voltage AB',
        value: `${vKv} kV`,
        quality: activeBay.quality,
        writable: false,
      },
      {
        addr: addrFmt(12, 'MMXU1.A.phsA'),
        name: 'Phase A Current',
        value: `${iA} A`,
        quality: activeBay.quality,
        writable: false,
      },
      {
        addr: addrFmt(13, 'MMXU1.TotW.mag'),
        name: 'Active Power (3-Phase)',
        value: `${pMw} MW`,
        quality: activeBay.quality,
        writable: false,
      },
    ];
  }, [activeBay, selectedBayIdx, protocol]);

  const emitProtocolExchange = (reason: 'POLL' | 'COMMAND', cmdTarget?: 'OPEN' | 'CLOSED') => {
    if (!activeBay) return;
    seqRef.current = (seqRef.current % 65535) + 1;
    const s = seqRef.current;
    const ioa = (selectedBayIdx + 1) * 100 + 1;
    const bayCode = activeBay.bayCode;

    if (protocol === 'IEC104' || protocol === 'IEC101') {
      const txHex =
        reason === 'COMMAND'
          ? `68 0E ${hex2(s << 1)} 00 00 00 2E 01 06 00 84 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${cmdTarget === 'CLOSED' ? '02' : '01'}`
          : `68 0E ${hex2(s << 1)} 00 00 00 64 01 06 00 84 00 00 00 00 14`;
      const rxHex =
        reason === 'COMMAND'
          ? `68 0E 00 00 ${hex2((s + 1) << 1)} 00 2E 01 07 00 84 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${cmdTarget === 'CLOSED' ? '02' : '01'}`
          : `68 14 00 00 ${hex2((s + 1) << 1)} 00 1F 01 14 00 84 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${activeBay.breakerState === 'CLOSED' ? '02' : '01'} 10 24 0E 0B 1A 0B`;

      pushPacket('TX', protocol, reason === 'COMMAND' ? `C_DC_NA_1 Command ${bayCode} -> ${cmdTarget}` : `C_IC_NA_1 General Interrogation (CASDU=132)`, txHex, [
        { name: 'APCI Header', details: `Start=0x68, Len=14, N(S)=${s}, N(R)=0` },
        { name: 'ASDU', details: reason === 'COMMAND' ? `TypeID=46 (C_DC_NA_1), COT=6 (Act), IOA=${ioa}` : 'TypeID=100 (C_IC_NA_1), COT=6 (Act), QOI=20' },
      ]);
      pushPacket('RX', protocol, reason === 'COMMAND' ? `C_DC_NA_1 ActCon (${bayCode} = ${cmdTarget})` : `M_DP_TB_1 Response (${bayCode} CB=${activeBay.breakerState})`, rxHex, [
        { name: 'APCI Header', details: `Start=0x68, N(R)=${s + 1}` },
        { name: 'ASDU', details: reason === 'COMMAND' ? `TypeID=46, COT=7 (ActCon), IOA=${ioa}` : `TypeID=31 (M_DP_TB_1), COT=20, IOA=${ioa}, Val=${activeBay.breakerState}` },
      ]);
    } else if (protocol === 'IEC103') {
      const txHex = `68 09 09 68 53 01 07 81 09 01 FF 00 00 5F 16`;
      const rxHex = `68 0D 0D 68 08 01 01 81 09 01 80 A0 ${activeBay.breakerState === 'CLOSED' ? '02' : '01'} 12 34 00 00 8B 16`;
      pushPacket('TX', protocol, `IEC-103 GI / Poll (ASDU 7, Addr=1)`, txHex, [
        { name: 'FT1.2 Frame', details: 'Start=0x68, Control=0x53 (PRM=1, FCV=1), LinkAddr=1' },
        { name: 'ASDU 7', details: 'General Interrogation, COT=9, FUN=255, INF=0' },
      ]);
      pushPacket('RX', protocol, `IEC-103 Time-Tagged Message (${bayCode} FUN=128 INF=160)`, rxHex, [
        { name: 'FT1.2 Frame', details: 'Start=0x68, Control=0x08 (PRM=0), LinkAddr=1' },
        { name: 'ASDU 1', details: `FUN=128, INF=160 (CB Pos), DPI=${activeBay.breakerState}` },
      ]);
    } else if (protocol === 'MODBUS_TCP') {
      const unit = selectedBayIdx + 1;
      const txHex =
        reason === 'COMMAND'
          ? `${hex2(s >> 8)} ${hex2(s)} 00 00 00 06 ${hex2(unit)} 05 00 00 ${cmdTarget === 'CLOSED' ? 'FF 00' : '00 00'}`
          : `${hex2(s >> 8)} ${hex2(s)} 00 00 00 06 ${hex2(unit)} 03 00 00 00 0A`;
      const rxHex =
        reason === 'COMMAND'
          ? txHex
          : `${hex2(s >> 8)} ${hex2(s)} 00 00 00 17 ${hex2(unit)} 03 14 05 28 00 96 01 45 00 54 13 88`;
      pushPacket('TX', protocol, reason === 'COMMAND' ? `FC05 Force Coil 00001 -> ${cmdTarget} (Unit ${unit})` : `FC03 Read Holding Regs 40001..40010 (Unit ${unit})`, txHex, [
        { name: 'MBAP Header', details: `TxID=${s}, Proto=0x0000, UnitID=${unit}` },
        { name: 'Modbus PDU', details: reason === 'COMMAND' ? `FC=05, Coil=0, Value=${cmdTarget}` : 'FC=03, Start=0, Qty=10' },
      ]);
      pushPacket('RX', protocol, reason === 'COMMAND' ? `FC05 Echo Confirmed (Unit ${unit})` : `FC03 Response: 20 bytes (${bayCode})`, rxHex, [
        { name: 'MBAP Header', details: `TxID=${s}, UnitID=${unit}` },
        { name: 'Modbus PDU', details: reason === 'COMMAND' ? 'Write Confirmed' : `ByteCount=20, V=${(activeBay.voltageAbKv ?? 0).toFixed(2)}kV, I=${(activeBay.currentA ?? 0).toFixed(1)}A` },
      ]);
    } else if (protocol === 'DNP3') {
      const txHex = `05 64 0B C4 01 00 0A 00 4E 2A C0 C1 01 3C 01 06 1B 4C`;
      const rxHex = `05 64 14 44 0A 00 01 00 22 91 C0 C1 81 00 00 01 02 00 00 00 ${activeBay.breakerState === 'CLOSED' ? '81' : '01'}`;
      pushPacket('TX', protocol, `DNP3 Class 0 Integrity Poll (Dest=1, Src=10)`, txHex, [
        { name: 'Data Link Layer', details: 'Sync=0x0564, Ctrl=0xC4, Dest=1, Src=10' },
        { name: 'Application Layer', details: 'FC=0x01 (Read), Obj 60 Var 1 (Class 0 Data)' },
      ]);
      pushPacket('RX', protocol, `DNP3 Response: Binary Input Obj 01 (${bayCode}=${activeBay.breakerState})`, rxHex, [
        { name: 'Data Link Layer', details: 'Sync=0x0564, Ctrl=0x44, Dest=10, Src=1' },
        { name: 'Application Layer', details: `FC=0x81 (Response), IIN=0x0000, BI[0]=${activeBay.breakerState}` },
      ]);
    } else {
      const txHex = `03 00 00 2A 02 F0 80 01 00 01 00 61 1F A0 1D 02 01 ${hex2(s)} A4 18`;
      const rxHex = `03 00 00 2E 02 F0 80 01 00 01 00 61 23 A1 21 02 01 ${hex2(s)} A4 1C ${activeBay.breakerState === 'CLOSED' ? '80' : '40'}`;
      pushPacket('TX', protocol, reason === 'COMMAND' ? `MMS Operate ${activeBay.iedId}/CSWI1.Pos -> ${cmdTarget}` : `MMS Read ${activeBay.iedId}/XCBR1.Pos.stVal`, txHex, [
        { name: 'TPKT / COTP', details: 'ISO 8073 Class 0, TCP Port 102' },
        { name: 'IEC 61850 MMS', details: reason === 'COMMAND' ? `Service=Write (Operate), Target=${activeBay.iedId}/CSWI1$CO$Pos` : `Service=Read, Ref=${activeBay.iedId}/XCBR1$ST$Pos$stVal` },
      ]);
      pushPacket('RX', protocol, `MMS Confirmed-ResponsePDU (${bayCode}=${activeBay.breakerState})`, rxHex, [
        { name: 'TPKT / COTP', details: 'ISO 8073 DT Data' },
        { name: 'IEC 61850 MMS', details: `Result=Success, stVal=${activeBay.breakerState}, q=0000 (GOOD)` },
      ]);
    }
  };

  // Cyclic polling when running
  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      emitProtocolExchange('POLL');
    }, Math.max(500, pollMs));
    return () => window.clearInterval(timer);
  }, [running, pollMs, protocol, selectedBayIdx, activeBay]);

  const handleToggleRun = () => {
    const next = !running;
    setRunning(next);
    pushConsole(
      next
        ? `Started ${PROTO_DEFAULTS[protocol].label} ${role} session on ${ip}:${port} (poll=${pollMs}ms).`
        : `Stopped ${PROTO_DEFAULTS[protocol].label} capture.`
    );
    if (next) emitProtocolExchange('POLL');
  };

  const handleSendBreakerCmd = (target: 'OPEN' | 'CLOSED') => {
    if (!activeBay) return;
    const ok = commandBreaker(activeBay.id, target, 'SCADA_SBO');
    emitProtocolExchange('COMMAND', target);
    pushConsole(
      ok
        ? `Command ${target} executed on ${activeBay.bayCode} via ${PROTO_DEFAULTS[protocol].label}.`
        : `Command ${target} REJECTED on ${activeBay.bayCode} (Interlock / 43LR / 86 Lockout).`
    );
  };

  const handleExportCsv = () => {
    const rows = [
      ['ID', 'Time', 'Dir', 'Protocol', 'Bytes', 'Summary', 'Hex'],
      ...packets.map((p) => [String(p.id), p.time, p.dir, p.protocol, String(p.bytes), p.summary, p.hex]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vinci_${protocol.toLowerCase()}_trace.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredPackets = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return packets.filter((p) => {
      if (dirFilter !== 'ALL' && p.dir !== dirFilter) return false;
      if (q && !`${p.summary} ${p.hex} ${p.protocol}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [packets, dirFilter, searchQuery]);

  const selectedPkt = useMemo(
    () => packets.find((p) => p.id === selectedPktId) || packets[packets.length - 1] || null,
    [packets, selectedPktId]
  );

  const txCount = packets.filter((p) => p.dir === 'TX').length;
  const rxCount = packets.filter((p) => p.dir === 'RX').length;
  const totalBytes = packets.reduce((sum, p) => sum + p.bytes, 0);

  return (
    <div
      className="vinci-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f3f4f6] text-[#111827] border border-[#64748b] shadow-lg overflow-hidden select-none"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .vinci-app, .vinci-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f3f4f6 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .vinci-app * { text-shadow: none !important; }
        #root .vinci-app input, #root .vinci-app select {
          background: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 2px !important;
          font-size: 11.5px !important;
          color-scheme: light !important;
        }
        #root .vinci-app .vn-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 9px !important;
          font-size: 11.5px !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .vinci-app .vn-btn:hover:not(:disabled) { background: #e0f2fe !important; border-color: #0284c7 !important; }
        #root .vinci-app .vn-btn-primary {
          background: #0f766e !important;
          color: #ffffff !important;
          border: 1px solid #115e59 !important;
          padding: 3px 11px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .vinci-app .vn-btn-stop {
          background: #b91c1c !important;
          color: #ffffff !important;
          border: 1px solid #991b1b !important;
          padding: 3px 11px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .vinci-app .vn-menu-btn {
          background: transparent !important;
          color: #111827 !important;
          border: 1px solid transparent !important;
          padding: 1px 8px !important;
          font-size: 11.5px !important;
          cursor: pointer;
        }
        #root .vinci-app .vn-menu-btn:hover, #root .vinci-app .vn-menu-btn.active {
          background: #0f766e !important;
          color: #ffffff !important;
        }
        #root .vinci-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          font-size: 11.5px !important;
        }
        #root .vinci-app table thead th {
          background: #e2e8f0 !important;
          color: #0f172a !important;
          text-align: left;
          padding: 4px 7px !important;
          border-bottom: 1px solid #94a3b8 !important;
          border-right: 1px solid #cbd5e1 !important;
          position: sticky;
          top: 0;
          z-index: 3;
          font-weight: 600 !important;
        }
        #root .vinci-app table tbody td {
          padding: 3px 7px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #f1f5f9 !important;
          color: #111827 !important;
          background: #ffffff !important;
        }
        #root .vinci-app table tbody tr:hover td { background: #f0fdfa !important; }
      `}</style>

      {/* 1. TITLE BAR */}
      <div className="h-[28px] bg-gradient-to-r from-[#134e4a] to-[#0f766e] text-white px-2.5 flex items-center justify-between shrink-0 text-[12px] font-semibold">
        <div className="flex items-center gap-2">
          <span className="bg-[#5eead4] text-[#042f2e] font-black text-[10px] px-1.5 py-[1px] rounded-[2px]">
            VINCI
          </span>
          <span>VINCI Protocol Analyser — Multi-Protocol Master / Slave Commissioning Suite</span>
        </div>
        <div className="font-mono text-[11px] flex items-center gap-2">
          <span
            className="px-2 py-[1px] rounded text-[10px] font-bold"
            style={{ background: running ? '#16a34a' : '#64748b', color: '#ffffff' }}
          >
            {running ? 'RUNNING' : 'STOPPED'}
          </span>
          <span>{`${PROTO_DEFAULTS[protocol].label} (${role})`}</span>
        </div>
      </div>

      {/* 2. CLASSIC MENU BAR */}
      <div
        className="h-[22px] bg-[#f1f5f9] border-b border-[#cbd5e1] px-1.5 flex items-center gap-1 shrink-0 relative z-30"
        onClick={(e) => e.stopPropagation()}
      >
        {(
          [
            ['File', [
              { label: 'Export Traffic Trace (.csv)', action: handleExportCsv },
              { label: 'Clear Captured Packets', action: () => { setPackets([]); setSelectedPktId(null); } },
              { label: 'Clear Console Log', action: () => setConsoleLines([]) },
            ]],
            ['Protocol', (Object.keys(PROTO_DEFAULTS) as VinciProtocol[]).map((pk) => ({
              label: `${protocol === pk ? '● ' : '   '}${PROTO_DEFAULTS[pk].label} (Port ${PROTO_DEFAULTS[pk].port})`,
              action: () => handleSelectProtocol(pk),
            }))],
            ['Mode', [
              { label: `${role === 'MASTER' ? '● ' : '   '}Master (Client / Polling)`, action: () => setRole('MASTER') },
              { label: `${role === 'SLAVE' ? '● ' : '   '}Slave (Server / Outstation)`, action: () => setRole('SLAVE') },
            ]],
            ['View', [
              { label: 'Traffic Monitor', action: () => setRightTab('TRAFFIC') },
              { label: 'Protocol Statistics', action: () => setRightTab('STATS') },
              { label: 'System Console', action: () => setRightTab('CONSOLE') },
            ]],
          ] as Array<[string, Array<{ label: string; action: () => void }>]>
        ).map(([mName, items]) => (
          <div key={mName} className="relative">
            <button
              type="button"
              className={`vn-menu-btn ${openMenu === mName ? 'active' : ''}`}
              onClick={() => setOpenMenu((m) => (m === mName ? null : mName))}
            >
              {mName}
            </button>
            {openMenu === mName && (
              <div className="absolute left-0 top-full w-60 bg-white border border-[#94a3b8] shadow-lg py-0.5 z-40">
                {items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    onClick={() => { setOpenMenu(null); it.action(); }}
                    className="w-full text-left px-3 py-1.5 text-[11.5px] text-[#0f172a] hover:bg-[#ccfbf1]"
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. PROTOCOL CONTROL TOOLBAR */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 shrink-0 text-[11.5px]">
        <select value={protocol} onChange={(e) => handleSelectProtocol(e.target.value as VinciProtocol)} className="h-[24px] px-1.5 font-semibold">
          {(Object.keys(PROTO_DEFAULTS) as VinciProtocol[]).map((pk) => (
            <option key={pk} value={pk}>
              {PROTO_DEFAULTS[pk].label}
            </option>
          ))}
        </select>
        <select value={role} onChange={(e) => setRole(e.target.value as VinciRole)} className="h-[24px] px-1.5 font-semibold">
          <option value="MASTER">Master</option>
          <option value="SLAVE">Slave</option>
        </select>
        <label className="flex items-center gap-1">
          <span>IP:</span>
          <input value={ip} onChange={(e) => setIp(e.target.value)} className="w-[108px] h-[24px] px-1.5 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>Port:</span>
          <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value) || 2404)} className="w-[56px] h-[24px] px-1 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>Poll(ms):</span>
          <input type="number" min={500} max={10000} value={pollMs} onChange={(e) => setPollMs(Math.max(500, Number(e.target.value) || 1500))} className="w-[56px] h-[24px] px-1 font-mono" />
        </label>

        <button type="button" className={running ? 'vn-btn-stop' : 'vn-btn-primary'} onClick={handleToggleRun}>
          {running ? '■ Stop' : '▶ Start'}
        </button>
        <button type="button" className="vn-btn" onClick={() => emitProtocolExchange('POLL')}>
          Single Poll / GI
        </button>
        <button type="button" className="vn-btn ml-auto" onClick={handleExportCsv}>
          Export CSV
        </button>
      </div>

      {/* 4. MAIN SPLIT WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT: SYSTEM TAGS & COMMAND SIMULATOR */}
        <div className="w-full lg:w-[40%] flex flex-col border-b lg:border-b-0 lg:border-r-[3px] border-[#cbd5e1] bg-white min-h-0 overflow-hidden">
          <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <span className="text-[11.5px] font-bold text-[#134e4a]">System Tags ({activeBay?.bayCode})</span>
            <select
              value={selectedBayIdx}
              onChange={(e) => setSelectedBayIdx(Number(e.target.value))}
              className="h-[22px] px-1.5 max-w-[190px]"
            >
              {bays.map((b, idx) => (
                <option key={b.id} value={idx}>
                  {`${b.bayCode} — ${b.name}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '32%' }}>Address / Ref</th>
                  <th style={{ width: '38%' }}>Signal</th>
                  <th style={{ width: '30%' }}>Live Value</th>
                </tr>
              </thead>
              <tbody>
                {systemPoints.map((pt) => (
                  <tr key={pt.addr}>
                    <td className="font-mono text-[10.5px] font-bold text-[#134e4a] break-all">{pt.addr}</td>
                    <td>{pt.name}</td>
                    <td className="font-mono font-semibold">{pt.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* QUICK TELECONTROL COMMAND BAR */}
          <div className="bg-[#f8fafc] border-t border-[#cbd5e1] p-2 flex flex-wrap items-center justify-between gap-2 shrink-0 text-[11px]">
            <span className="font-semibold text-[#134e4a]">
              CB Control ({activeBay?.breakerId}: <strong>{activeBay?.breakerState}</strong>)
            </span>
            <div className="flex gap-1.5">
              <button type="button" className="vn-btn font-semibold" onClick={() => handleSendBreakerCmd('OPEN')}>
                Send OPEN
              </button>
              <button type="button" className="vn-btn-primary" onClick={() => handleSendBreakerCmd('CLOSED')}>
                Send CLOSE
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT: TRAFFIC / STATISTICS / CONSOLE + HEX/ASCII DISSECTOR */}
        <div className="flex-1 flex flex-col bg-white min-w-0 min-h-0 overflow-hidden">
          <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2 pt-1 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1">
              {(['TRAFFIC', 'STATS', 'CONSOLE'] as RightViewTab[]).map((tab) => {
                const active = rightTab === tab;
                return (
                  <button
                    key={tab}
                    type="button"
                    onClick={() => setRightTab(tab)}
                    className="px-3 py-1 text-[11.5px] font-semibold border border-b-0 rounded-t-[2px] cursor-pointer"
                    style={{
                      background: active ? '#ffffff' : '#e2e8f0',
                      color: active ? '#134e4a' : '#475569',
                      borderColor: '#cbd5e1',
                    }}
                  >
                    {tab === 'TRAFFIC' ? `Traffic (${packets.length})` : tab === 'STATS' ? 'Statistics' : 'Console'}
                  </button>
                );
              })}
            </div>

            {rightTab === 'TRAFFIC' && (
              <div className="flex items-center gap-1 pb-1">
                {(['ALL', 'TX', 'RX'] as DirFilter[]).map((df) => (
                  <button
                    key={df}
                    type="button"
                    onClick={() => setDirFilter(df)}
                    className="vn-btn !py-0 !px-1.5 !text-[10px]"
                    style={dirFilter === df ? { background: '#0f766e', color: '#ffffff' } : undefined}
                  >
                    {df}
                  </button>
                ))}
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter frames..."
                  className="h-[20px] w-[120px] px-1.5 text-[10.5px]"
                />
              </div>
            )}
          </div>

          {rightTab === 'TRAFFIC' && (
            <div ref={traceRef} className="flex-1 overflow-auto bg-white">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Time</th>
                    <th style={{ width: '8%' }}>Dir</th>
                    <th style={{ width: '14%' }}>Protocol</th>
                    <th style={{ width: '8%' }}>Len</th>
                    <th style={{ width: '54%' }}>Decoded Summary</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPackets.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-8 text-[#64748b]">
                        Click <strong>▶ Start</strong> or <strong>Single Poll / GI</strong> to capture live protocol frames.
                      </td>
                    </tr>
                  ) : (
                    filteredPackets.map((p) => {
                      const sel = selectedPkt?.id === p.id;
                      return (
                        <tr
                          key={p.id}
                          onClick={() => setSelectedPktId(p.id)}
                          className="cursor-pointer"
                          style={{ background: sel ? '#ccfbf1' : undefined }}
                        >
                          <td className="font-mono text-[10.5px]">{p.time}</td>
                          <td className="font-mono font-bold" style={{ color: p.dir === 'TX' ? '#1d4ed8' : '#15803d' }}>
                            {p.dir}
                          </td>
                          <td className="font-mono text-[10.5px]">{p.protocol}</td>
                          <td className="font-mono">{p.bytes}B</td>
                          <td className="font-medium">{p.summary}</td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {rightTab === 'STATS' && (
            <div className="flex-1 overflow-auto p-3 grid grid-cols-2 sm:grid-cols-4 gap-2.5 content-start text-[12px]">
              <div className="border border-[#cbd5e1] bg-[#f8fafc] p-2.5">
                <div className="text-[10.5px] text-[#475569]">TX Frames</div>
                <div className="text-[18px] font-bold font-mono text-[#1d4ed8]">{txCount}</div>
              </div>
              <div className="border border-[#cbd5e1] bg-[#f8fafc] p-2.5">
                <div className="text-[10.5px] text-[#475569]">RX Frames</div>
                <div className="text-[18px] font-bold font-mono text-[#15803d]">{rxCount}</div>
              </div>
              <div className="border border-[#cbd5e1] bg-[#f8fafc] p-2.5">
                <div className="text-[10.5px] text-[#475569]">Total Bytes</div>
                <div className="text-[18px] font-bold font-mono text-[#134e4a]">{totalBytes}</div>
              </div>
              <div className="border border-[#cbd5e1] bg-[#f8fafc] p-2.5">
                <div className="text-[10.5px] text-[#475569]">Transport</div>
                <div className="text-[14px] font-bold font-mono text-[#0f172a] mt-1">{PROTO_DEFAULTS[protocol].transport}</div>
              </div>
            </div>
          )}

          {rightTab === 'CONSOLE' && (
            <div className="flex-1 overflow-auto bg-[#0f172a] text-[#e2e8f0] p-2.5 font-mono text-[11px] leading-[18px]">
              {consoleLines.map((ln, idx) => (
                <div key={idx}>{ln}</div>
              ))}
            </div>
          )}

          {/* BOTTOM DUAL HEX/ASCII + LAYER DISSECTOR */}
          <div className="h-[145px] shrink-0 bg-[#f8fafc] border-t-2 border-[#94a3b8] grid grid-cols-1 md:grid-cols-2 overflow-hidden text-[11px]">
            <div className="border-b md:border-b-0 md:border-r border-[#cbd5e1] p-2 overflow-auto">
              <div className="font-bold text-[#134e4a] mb-1">Protocol Layer Dissector</div>
              {selectedPkt ? (
                <div className="space-y-1">
                  {selectedPkt.layers.map((ly, i) => (
                    <div key={i} className="bg-white border border-[#cbd5e1] px-2 py-1">
                      <span className="font-bold text-[#0f766e]">{ly.name}: </span>
                      <span className="font-mono text-[10.5px] text-[#0f172a]">{ly.details}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[#64748b]">Select a captured frame to inspect protocol layers.</div>
              )}
            </div>
            <div className="p-2 overflow-auto font-mono">
              <div className="font-sans font-bold text-[#134e4a] mb-1">Raw Hex &amp; ASCII Dump</div>
              {selectedPkt ? (
                <div className="bg-white border border-[#cbd5e1] p-2 space-y-1 text-[10.5px]">
                  <div className="text-[#0f172a] break-all"><strong>HEX:</strong> {selectedPkt.hex}</div>
                  <div className="text-[#475569] break-all"><strong>ASC:</strong> {hexToAscii(selectedPkt.hex)}</div>
                </div>
              ) : (
                <div className="font-sans text-[#64748b]">No frame selected.</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* 5. STATUS BAR */}
      <div className="h-[22px] bg-[#e2e8f0] border-t border-[#94a3b8] px-2.5 flex items-center justify-between text-[11px] text-[#1e293b] shrink-0 font-mono">
        <span>{`${PROTO_DEFAULTS[protocol].label} | ${ip}:${port} | TX:${txCount} RX:${rxCount} (${totalBytes} B)`}</span>
        <span>VINCI Protocol Analyser · Substation Commissioning Suite</span>
      </div>
    </div>
  );
};

export default VinciProtocolTool;
