import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// VINCI Protocol Analyser — Multi-Protocol Master/Slave Commissioning Suite
// Supports IEC 60870-5-104, IEC 60870-5-101, Modbus TCP, DNP3, and IEC 61850
// MMS with live Substation Store points, packet trace, and frame decoder.
// ============================================================================

type VinciProtocol = 'IEC104' | 'IEC101' | 'MODBUS_TCP' | 'DNP3' | 'IEC61850_MMS';
type VinciRole = 'MASTER' | 'SLAVE';

interface TracePacket {
  id: number;
  time: string;
  dir: 'TX' | 'RX';
  protocol: VinciProtocol;
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
  selectedBayIdx: number;
}

const STORAGE_KEY = 'sas_vinci_analyser_state_v1';
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

const PROTO_DEFAULTS: Record<VinciProtocol, { label: string; port: number; ip: string }> = {
  IEC104: { label: 'IEC 60870-5-104', port: 2404, ip: '10.132.10.250' },
  IEC101: { label: 'IEC 60870-5-101 (Serial/TCP)', port: 4001, ip: '10.132.10.251' },
  MODBUS_TCP: { label: 'Modbus TCP/IP', port: 502, ip: '10.132.10.200' },
  DNP3: { label: 'DNP3 (IEEE 1815)', port: 20000, ip: '10.132.10.252' },
  IEC61850_MMS: { label: 'IEC 61850 MMS', port: 102, ip: '10.132.10.11' },
};

function fmtTs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function hex2(n: number): string {
  return (n & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

export const VinciProtocolTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { bays, commandBreaker } = useSubstationStore();

  const [protocol, setProtocol] = useState<VinciProtocol>(() => init.protocol || 'IEC104');
  const [role, setRole] = useState<VinciRole>(() => init.role || 'MASTER');
  const [running, setRunning] = useState<boolean>(() => Boolean(init.running));
  const [ip, setIp] = useState<string>(() => init.ip || '10.132.10.250');
  const [port, setPort] = useState<number>(() => init.port || 2404);
  const [selectedBayIdx, setSelectedBayIdx] = useState<number>(() => init.selectedBayIdx || 0);

  const [packets, setPackets] = useState<TracePacket[]>([]);
  const [selectedPktId, setSelectedPktId] = useState<number | null>(null);
  const [seq, setSeq] = useState<number>(1);

  const traceRef = useRef<HTMLDivElement | null>(null);
  const pktIdRef = useRef<number>(1);

  useEffect(() => {
    saveState({ protocol, role, running, ip, port, selectedBayIdx });
  }, [protocol, role, running, ip, port, selectedBayIdx]);

  useEffect(() => {
    if (traceRef.current) {
      traceRef.current.scrollTop = traceRef.current.scrollHeight;
    }
  }, [packets.length]);

  const activeBay = bays[Math.max(0, Math.min(bays.length - 1, selectedBayIdx))] || bays[0];

  const pushPacket = (dir: 'TX' | 'RX', summary: string, hex: string, layers: TracePacket['layers']) => {
    pktIdRef.current += 1;
    const id = pktIdRef.current;
    setPackets((prev) => [...prev.slice(-180), { id, time: fmtTs(), dir, protocol, summary, hex, layers }]);
    setSelectedPktId((cur) => (cur === null ? id : cur));
  };

  const emitProtocolExchange = (reason: 'POLL' | 'CMD', cmdTarget?: 'OPEN' | 'CLOSED') => {
    const n = seq;
    setSeq((s) => (s % 255) + 1);
    const bayName = activeBay?.name || 'Bay 1';
    const cbState = cmdTarget || activeBay?.breakerState || 'CLOSED';
    const curA = activeBay ? activeBay.currentA.toFixed(1) : '148.0';
    const voltKv = activeBay ? activeBay.voltageAbKv.toFixed(2) : '132.40';

    if (protocol === 'IEC104' || protocol === 'IEC101') {
      const txHex =
        reason === 'CMD'
          ? `68 0E ${hex2(n << 1)} 00 00 00 2E 01 06 00 01 00 E9 03 00 ${cbState === 'CLOSED' ? '02' : '01'}`
          : `68 0E ${hex2(n << 1)} 00 00 00 64 01 06 00 01 00 00 00 00 14`;
      const rxHex =
        reason === 'CMD'
          ? `68 0E 02 00 ${hex2(n << 1)} 00 2E 01 07 00 01 00 E9 03 00 ${cbState === 'CLOSED' ? '02' : '01'}`
          : `68 18 02 00 ${hex2(n << 1)} 00 1F 01 14 00 01 00 E9 03 00 ${cbState === 'CLOSED' ? '02' : '01'} [CP56Time2a]`;
      pushPacket(
        'TX',
        reason === 'CMD' ? `C_DC_NA_1 (46) Operate ${bayName} -> ${cbState}` : `C_IC_NA_1 (100) Station GI (CA=1)`,
        txHex,
        [
          { name: 'APCI (IEC 60870-5-104)', details: `Start=0x68, Length=14, Type=I-Frame, N(S)=${n}` },
          { name: 'ASDU Header', details: `TypeID=${reason === 'CMD' ? '46 (C_DC_NA_1)' : '100 (C_IC_NA_1)'}, VSQ=1, COT=6 (Act), CA=1` },
          { name: 'Information Object', details: reason === 'CMD' ? `IOA=1001 (${bayName}), DCO=${cbState}` : 'IOA=0, QOI=20 (Station Interrogation)' },
        ]
      );
      pushPacket(
        'RX',
        reason === 'CMD' ? `C_DC_NA_1 COT=7 (ActCon+) ${bayName}=${cbState}` : `M_DP_TB_1 / M_ME_TF_1 ${bayName} Pos=${cbState}, I=${curA}A, V=${voltKv}kV`,
        rxHex,
        [
          { name: 'APCI (IEC 60870-5-104)', details: `Start=0x68, Type=I-Frame, N(R)=${n}` },
          { name: 'ASDU Header', details: `TypeID=${reason === 'CMD' ? '46 (ActCon+)' : '31 (M_DP_TB_1)'}, COT=${reason === 'CMD' ? '7' : '20'}, CA=1` },
          { name: 'Payload', details: `Bay=${bayName}, Breaker=${cbState}, Current=${curA} A, Voltage=${voltKv} kV` },
        ]
      );
      return;
    }

    if (protocol === 'MODBUS_TCP') {
      const fc = reason === 'CMD' ? '05' : '03';
      const txHex = `00 ${hex2(n)} 00 00 00 06 01 ${fc} 00 00 ${reason === 'CMD' ? (cbState === 'CLOSED' ? 'FF 00' : '00 00') : '00 08'}`;
      const rxHex = `00 ${hex2(n)} 00 00 00 13 01 ${fc} 10 33 B8 05 C8 0C 92 ...`;
      pushPacket(
        'TX',
        reason === 'CMD' ? `FC05 Force Single Coil 00001 -> ${cbState}` : `FC03 Read Holding Registers 40001..40008 (Unit 1)`,
        txHex,
        [
          { name: 'MBAP Header', details: `TransactionID=${n}, ProtocolID=0x0000, Length=6, UnitID=1` },
          { name: 'Modbus PDU', details: reason === 'CMD' ? `FC=0x05 (Write Single Coil), Addr=0x0000, Value=${cbState}` : 'FC=0x03 (Read Holding Registers), Start=0x0000, Qty=8' },
        ]
      );
      pushPacket(
        'RX',
        reason === 'CMD' ? `FC05 Confirmed (${bayName}=${cbState})` : `FC03 Response: V=${voltKv}kV, I=${curA}A, Pos=${cbState}`,
        rxHex,
        [
          { name: 'MBAP Header', details: `TransactionID=${n}, ProtocolID=0x0000, UnitID=1` },
          { name: 'Modbus PDU', details: `FC=0x${fc} OK — Voltage=${voltKv} kV, Current=${curA} A, Breaker=${cbState}` },
        ]
      );
      return;
    }

    if (protocol === 'DNP3') {
      const txHex = `05 64 0B C4 01 00 02 00 E9 21 C0 C0 ${reason === 'CMD' ? '05 0C 01 17 01 00' : '01 3C 01 06'} B4 12`;
      const rxHex = `05 64 16 44 02 00 01 00 7A 1C C0 C0 81 00 00 01 02 00 00 ${cbState === 'CLOSED' ? '81' : '01'} 4F 9A`;
      pushPacket(
        'TX',
        reason === 'CMD' ? `CROB (G12V1) Direct Operate ${bayName} -> ${cbState}` : `Integrity Poll Class 0/1/2/3 (G60V1-4)`,
        txHex,
        [
          { name: 'DNP3 Data Link Layer', details: 'Sync=0x0564, Ctrl=0xC4 (PRM=1), Dest=1, Src=2' },
          { name: 'DNP3 Transport & App Layer', details: reason === 'CMD' ? `FC=0x05 (Direct Operate), Group 12 Var 1 (CROB), State=${cbState}` : 'FC=0x01 (Read), Group 60 Var 1 (Class 0 Integrity)' },
        ]
      );
      pushPacket(
        'RX',
        reason === 'CMD' ? `DNP3 Response IIN=0x0000 (CROB Success: ${cbState})` : `DNP3 Class 0 Response: BI:0=${cbState}, AI:0=${voltKv}kV, AI:1=${curA}A`,
        rxHex,
        [
          { name: 'DNP3 Data Link Layer', details: 'Sync=0x0564, Ctrl=0x44 (Outstation), Dest=2, Src=1' },
          { name: 'DNP3 App Response', details: `FC=0x81 (Response), IIN=0x0000 (Healthy), Binary Input 0=${cbState}, Analog 0=${voltKv} kV` },
        ]
      );
      return;
    }

    // IEC 61850 MMS
    const txHex = `03 00 00 2E 02 F0 80 A0 25 02 01 ${hex2(n)} A4 20 ...`;
    const rxHex = `03 00 00 34 02 F0 80 A1 2B 02 01 ${hex2(n)} A4 26 ...`;
    pushPacket(
      'TX',
      reason === 'CMD' ? `MMS Write XCBR1$CO$Pos$Oper.ctlVal=${cbState === 'CLOSED'}` : `MMS Read ${bayName} XCBR1$ST$Pos & MMXU1$MX`,
      txHex,
      [
        { name: 'TPKT / ISO-COTP (RFC1006)', details: 'Version=3, Port=102, DT-Data TPDU' },
        { name: 'MMS Confirmed-RequestPDU', details: `InvokeID=${n}, Service=${reason === 'CMD' ? 'Write (Operate)' : 'Read (GetDataValues)'}` },
      ]
    );
    pushPacket(
      'RX',
      reason === 'CMD' ? `MMS Write-Response(+) CommandTermination+ (${cbState})` : `MMS Read-Response(+) Pos=${cbState}, I=${curA}A, V=${voltKv}kV`,
      rxHex,
      [
        { name: 'TPKT / ISO-COTP (RFC1006)', details: 'Version=3, Port=102, DT-Data TPDU' },
        { name: 'MMS Confirmed-ResponsePDU', details: `InvokeID=${n}, Success: Pos=${cbState}, Current=${curA} A, Voltage=${voltKv} kV` },
      ]
    );
  };

  // Live cyclic polling when running
  useEffect(() => {
    if (!running) return;
    const t = window.setInterval(() => {
      emitProtocolExchange('POLL');
    }, 2500);
    return () => window.clearInterval(t);
  }, [running, protocol, selectedBayIdx, activeBay]);

  const handleProtocolChange = (next: VinciProtocol) => {
    setProtocol(next);
    setIp(PROTO_DEFAULTS[next].ip);
    setPort(PROTO_DEFAULTS[next].port);
  };

  const handleToggleRun = () => {
    const next = !running;
    setRunning(next);
    if (next) {
      emitProtocolExchange('POLL');
    }
  };

  const handleCommandBreaker = (target: 'OPEN' | 'CLOSED') => {
    if (activeBay) {
      commandBreaker(activeBay.id, target, 'SCADA_SBO');
    }
    emitProtocolExchange('CMD', target);
  };

  const handleExportTrace = () => {
    const text = packets.map((p) => `${p.time} [${p.dir}] [${p.protocol}] ${p.summary}\n  HEX: ${p.hex}`).join('\n');
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vinci_${protocol.toLowerCase()}_trace.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pointRows = useMemo(() => {
    const b = activeBay;
    if (!b) return [];
    const fmtAddr = (idx: number, iecRef: string) => {
      if (protocol === 'IEC104' || protocol === 'IEC101') return `IOA ${1000 + idx}`;
      if (protocol === 'MODBUS_TCP') return `${40000 + idx}`;
      if (protocol === 'DNP3') return idx <= 2 ? `BI:${idx - 1}` : `AI:${idx - 3}`;
      return iecRef;
    };
    return [
      { addr: fmtAddr(1, 'XCBR1$ST$Pos$stVal'), name: 'Breaker Position (52)', val: b.breakerState },
      { addr: fmtAddr(2, 'PTRC1$ST$Tr$general'), name: 'Protection Trip (86)', val: b.protectionTripActive ? 'TRIP' : 'NORMAL' },
      { addr: fmtAddr(3, 'MMXU1$MX$PhV$mag.f'), name: 'Voltage AB', val: `${b.voltageAbKv.toFixed(2)} kV` },
      { addr: fmtAddr(4, 'MMXU1$MX$A$mag.f'), name: 'Phase A Current', val: `${b.currentA.toFixed(1)} A` },
      { addr: fmtAddr(5, 'MMXU1$MX$TotW$mag.f'), name: 'Active Power (P)', val: `${b.activePowerMw.toFixed(2)} MW` },
      { addr: fmtAddr(6, 'MMXU1$MX$Hz$mag.f'), name: 'System Frequency', val: `${(b.frequencyHz ?? 50).toFixed(2)} Hz` },
    ];
  }, [activeBay, protocol]);

  const selectedPkt = packets.find((p) => p.id === selectedPktId) || packets[packets.length - 1] || null;

  return (
    <div
      className="vinci-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f3f5f8] text-[#111827] border border-[#707070] shadow-lg overflow-hidden"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .vinci-app, .vinci-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f3f5f8 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .vinci-app *::-webkit-scrollbar { width: 11px !important; height: 11px !important; }
        #root .vinci-app *::-webkit-scrollbar-track { background: #f1f5f9 !important; }
        #root .vinci-app *::-webkit-scrollbar-thumb { background: #cbd5e1 !important; border: 2px solid #f1f5f9 !important; border-radius: 0 !important; }
        #root .vinci-app p, #root .vinci-app span, #root .vinci-app label, #root .vinci-app div { text-shadow: none !important; }
        #root .vinci-app button { font-family: "Segoe UI", Tahoma, sans-serif !important; box-shadow: none !important; }
        #root .vinci-app input, #root .sas-workspace-main .vinci-app input,
        #root .vinci-app select, #root .sas-workspace-main .vinci-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 3px !important;
          box-shadow: none !important;
          color-scheme: light !important;
        }
        #root .vinci-app select option { background-color: #ffffff !important; color: #111827 !important; }
        #root .vinci-app .vn-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 9px !important;
          font-size: 11.5px !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .vinci-app .vn-btn:hover:not(:disabled) { background: #e0f2fe !important; border-color: #0284c7 !important; }
        #root .vinci-app .vn-btn-primary {
          background: #0f4c81 !important;
          color: #ffffff !important;
          border: 1px solid #0c3c66 !important;
          padding: 3px 11px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .sas-app-shell .sas-workspace-main .vinci-app table,
        #root .vinci-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .vinci-app table thead th,
        #root .vinci-app table thead th {
          background: #eef2f6 !important;
          color: #1e293b !important;
          font-weight: 600 !important;
          text-align: left;
          padding: 4px 8px !important;
          border-bottom: 1px solid #cbd5e1 !important;
          border-right: 1px solid #e2e8f0 !important;
          position: sticky;
          top: 0;
          z-index: 4;
          font-size: 11.5px !important;
          text-transform: none !important;
        }
        #root .sas-app-shell .sas-workspace-main .vinci-app table tbody td,
        #root .vinci-app table tbody td {
          padding: 3px 8px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #f1f5f9 !important;
          color: #111827 !important;
          background-color: #ffffff !important;
          vertical-align: middle;
        }
        #root .sas-app-shell .sas-workspace-main .vinci-app table tbody tr.vn-sel td,
        #root .vinci-app table tbody tr.vn-sel td {
          background-color: #dbeafe !important;
        }
      `}</style>

      {/* 1. TITLE BAR */}
      <div className="h-[30px] bg-[#1e293b] text-white px-3 flex items-center justify-between shrink-0 text-[12px]">
        <div className="flex items-center gap-2 font-semibold">
          <span className="bg-[#22c55e] text-[#052e16] font-extrabold text-[10px] px-1.5 py-[1px] rounded-[2px]">VINCI</span>
          <span>VINCI Protocol Analyser — Multi-Protocol Master / Slave Commissioning Suite</span>
        </div>
        <div className="font-mono text-[11px]">
          {`${PROTO_DEFAULTS[protocol].label} · ${role} · ${running ? 'RUNNING' : 'STOPPED'}`}
        </div>
      </div>

      {/* 2. PROTOCOL & SESSION BAR */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[11.5px] shrink-0">
        <label className="font-semibold">Protocol:</label>
        <select value={protocol} onChange={(e) => handleProtocolChange(e.target.value as VinciProtocol)} className="h-[24px] px-1.5">
          {(Object.keys(PROTO_DEFAULTS) as VinciProtocol[]).map((k) => (
            <option key={k} value={k}>{PROTO_DEFAULTS[k].label}</option>
          ))}
        </select>
        <label className="font-semibold">Role:</label>
        <select value={role} onChange={(e) => setRole(e.target.value as VinciRole)} className="h-[24px] px-1.5">
          <option value="MASTER">Master / Client</option>
          <option value="SLAVE">Slave / Outstation</option>
        </select>
        <label className="font-semibold">Host:</label>
        <input value={ip} onChange={(e) => setIp(e.target.value)} className="h-[24px] w-[112px] px-1.5 font-mono" />
        <label className="font-semibold">Port:</label>
        <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value) || 2404)} className="h-[24px] w-[60px] px-1.5 font-mono" />
        <select value={selectedBayIdx} onChange={(e) => setSelectedBayIdx(Number(e.target.value))} className="h-[24px] px-1.5">
          {bays.map((b, idx) => (
            <option key={b.id} value={idx}>{b.name}</option>
          ))}
        </select>

        <button type="button" className="vn-btn-primary" onClick={handleToggleRun}>
          {running ? 'Stop Session' : 'Start Session'}
        </button>
        <button type="button" className="vn-btn" onClick={() => emitProtocolExchange('POLL')}>
          Send Poll / GI
        </button>
        <button type="button" className="vn-btn" onClick={() => handleCommandBreaker('OPEN')}>
          Cmd OPEN
        </button>
        <button type="button" className="vn-btn" onClick={() => handleCommandBreaker('CLOSED')}>
          Cmd CLOSE
        </button>
        <button type="button" className="vn-btn ml-auto" disabled={packets.length === 0} onClick={handleExportTrace}>
          Export Trace (.txt)
        </button>
      </div>

      {/* 3. MAIN SPLIT WORKSPACE */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANE: PROTOCOL POINTS */}
        <div className="w-[34%] min-w-[260px] flex flex-col border-r-[3px] border-[#cbd5e1] bg-[#ffffff] overflow-hidden">
          <div className="bg-[#eef2f6] border-b border-[#cbd5e1] px-2.5 py-1 text-[11.5px] font-semibold text-[#0f3d6e] shrink-0">
            Live Protocol Tags — {activeBay?.name || 'Bay 1'} ({PROTO_DEFAULTS[protocol].label})
          </div>
          <div className="flex-1 overflow-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '34%' }}>Address / Ref</th>
                  <th style={{ width: '40%' }}>Signal</th>
                  <th style={{ width: '26%' }}>Value</th>
                </tr>
              </thead>
              <tbody>
                {pointRows.map((r) => (
                  <tr key={r.addr}>
                    <td className="font-mono text-[11px] font-semibold">{r.addr}</td>
                    <td>{r.name}</td>
                    <td className="font-mono font-semibold">{r.val}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT COLUMN: PACKET TRACE + LAYER DECODER */}
        <div className="flex-1 flex flex-col min-w-0 bg-[#ffffff] overflow-hidden">
          <div className="bg-[#eef2f6] border-b border-[#cbd5e1] px-2.5 py-1 text-[11.5px] font-semibold flex justify-between shrink-0">
            <span className="text-[#0f3d6e]">Live Telegram / Packet Trace ({packets.length})</span>
            <button type="button" className="vn-btn !py-0 !px-2 !text-[10.5px]" onClick={() => { setPackets([]); setSelectedPktId(null); }}>
              Clear
            </button>
          </div>
          <div ref={traceRef} className="flex-1 overflow-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '16%' }}>Time</th>
                  <th style={{ width: '8%' }}>Dir</th>
                  <th style={{ width: '16%' }}>Protocol</th>
                  <th style={{ width: '60%' }}>Decoded Summary</th>
                </tr>
              </thead>
              <tbody>
                {packets.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => setSelectedPktId(p.id)}
                    className={`cursor-pointer ${selectedPkt?.id === p.id ? 'vn-sel' : ''}`}
                  >
                    <td className="font-mono text-[11px]">{p.time}</td>
                    <td className="font-mono font-bold" style={{ color: p.dir === 'TX' ? '#1d4ed8' : '#15803d' }}>
                      {p.dir}
                    </td>
                    <td className="font-mono text-[11px]">{p.protocol}</td>
                    <td>{p.summary}</td>
                  </tr>
                ))}
                {packets.length === 0 && (
                  <tr>
                    <td colSpan={4} className="text-center py-6 text-[#64748b]">
                      Click <strong>Start Session</strong> or <strong>Send Poll / GI</strong> to capture protocol frames.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* FRAME DECODER PANE */}
          <div className="h-[175px] shrink-0 bg-[#f8fafc] border-t-[3px] border-[#94a3b8] overflow-auto p-2.5 text-[11.5px]">
            <div className="font-bold text-[#0f3d6e] mb-1.5">
              Protocol Frame Dissector {selectedPkt ? `— Packet #${selectedPkt.id} (${selectedPkt.dir} ${selectedPkt.protocol})` : ''}
            </div>
            {selectedPkt ? (
              <div className="space-y-1.5">
                {selectedPkt.layers.map((l, idx) => (
                  <div key={idx} className="bg-[#ffffff] border border-[#cbd5e1] rounded px-2 py-1">
                    <div className="font-semibold text-[#0f172a]">{l.name}</div>
                    <div className="font-mono text-[11px] text-[#334155]">{l.details}</div>
                  </div>
                ))}
                <div className="bg-[#ffffff] border border-[#cbd5e1] rounded px-2 py-1 font-mono text-[11px]">
                  <strong>Raw Hex:</strong> {selectedPkt.hex}
                </div>
              </div>
            ) : (
              <div className="text-[#64748b]">Select any captured packet above to inspect its protocol layers and hex bytes.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VinciProtocolTool;
