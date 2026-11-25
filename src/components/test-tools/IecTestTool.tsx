import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// IEC_TEST (V1.02) — IEC 60870-5-104 / 101 Test Master Harness
// Real-time APCI U/S/I-frame simulation, STARTDT/STOPDT/TESTFR, General
// Interrogation (C_IC_NA_1), Clock Sync (C_CS_NA_1), SBO/Direct Double Command
// (C_DC_NA_1 -> live Substation Store), IOA Monitor, and APDU Hex Log.
// ============================================================================

type IecProtocol = 'IEC104' | 'IEC101_BAL' | 'IEC101_UNBAL';
type CmdType = 'C_DC_NA_1' | 'C_SC_NA_1';
type IoaFilter = 'ALL' | 'STATUS' | 'ANALOG' | 'COUNTER';

interface IoaPoint {
  ioa: number;
  typeId: string;
  category: 'STATUS' | 'ANALOG' | 'COUNTER';
  cot: string;
  bayName: string;
  signal: string;
  value: string;
  quality: string;
  ts: string;
}

interface ApduLog {
  id: number;
  time: string;
  dir: 'TX' | 'RX' | 'SYS';
  frameType: 'U' | 'S' | 'I' | 'SYS';
  hex: string;
  decoded: string;
}

interface PersistedIecTest {
  protocol: IecProtocol;
  connected: boolean;
  hostIp: string;
  tcpPort: number;
  casdu: number;
  oa: number;
  selectedBayIdx: number;
  cmdType: CmdType;
  cmdState: 'OPEN' | 'CLOSED';
  cmdMode: 'SBO' | 'DIRECT';
  ioaFilter: IoaFilter;
}

const STORAGE_KEY = 'sas_iec_test_v102_state_v1';
let memCache: PersistedIecTest | null = null;

function loadInit(): Partial<PersistedIecTest> {
  if (memCache) return memCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedIecTest;
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

function saveState(st: PersistedIecTest) {
  memCache = st;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  } catch {
    // Ignore quota errors
  }
}

function fmtTs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function fmtCp56(d = new Date()): string {
  return d.toISOString().replace('T', ' ').replace('Z', '');
}

function hex2(n: number): string {
  return (n & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

export const IecTestTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { bays, commandBreaker } = useSubstationStore();

  const [protocol, setProtocol] = useState<IecProtocol>(() => init.protocol || 'IEC104');
  const [connected, setConnected] = useState<boolean>(() => Boolean(init.connected));
  const [hostIp, setHostIp] = useState<string>(() => init.hostIp || '10.132.10.250');
  const [tcpPort, setTcpPort] = useState<number>(() => init.tcpPort || 2404);
  const [casdu, setCasdu] = useState<number>(() => init.casdu || 1);
  const [oa, setOa] = useState<number>(() => init.oa ?? 0);

  const [selectedBayIdx, setSelectedBayIdx] = useState<number>(() => init.selectedBayIdx || 0);
  const [cmdType, setCmdType] = useState<CmdType>(() => init.cmdType || 'C_DC_NA_1');
  const [cmdState, setCmdState] = useState<'OPEN' | 'CLOSED'>(() => init.cmdState || 'OPEN');
  const [cmdMode, setCmdMode] = useState<'SBO' | 'DIRECT'>(() => init.cmdMode || 'SBO');
  const [sboArmed, setSboArmed] = useState<boolean>(false);

  const [ioaFilter, setIoaFilter] = useState<IoaFilter>(() => init.ioaFilter || 'ALL');
  const [search, setSearch] = useState<string>('');
  const [points, setPoints] = useState<IoaPoint[]>([]);
  const [nsSeq, setNsSeq] = useState<number>(0);
  const [nrSeq, setNrSeq] = useState<number>(0);
  const [logs, setLogs] = useState<ApduLog[]>([
    {
      id: 1,
      time: fmtTs(),
      dir: 'SYS',
      frameType: 'SYS',
      hex: '',
      decoded: 'IEC_TEST V1.02 ready. Click Connect (STARTDT act) to establish IEC 60870-5-104 link on port 2404.',
    },
  ]);

  const logPaneRef = useRef<HTMLDivElement | null>(null);
  const logSeqRef = useRef<number>(2);

  useEffect(() => {
    saveState({
      protocol,
      connected,
      hostIp,
      tcpPort,
      casdu,
      oa,
      selectedBayIdx,
      cmdType,
      cmdState,
      cmdMode,
      ioaFilter,
    });
  }, [protocol, connected, hostIp, tcpPort, casdu, oa, selectedBayIdx, cmdType, cmdState, cmdMode, ioaFilter]);

  useEffect(() => {
    if (logPaneRef.current) {
      logPaneRef.current.scrollTop = logPaneRef.current.scrollHeight;
    }
  }, [logs.length]);

  const pushLog = (dir: ApduLog['dir'], frameType: ApduLog['frameType'], hex: string, decoded: string) => {
    logSeqRef.current += 1;
    const id = logSeqRef.current;
    setLogs((prev) => [...prev.slice(-180), { id, time: fmtTs(), dir, frameType, hex, decoded }]);
  };

  // Build IOA snapshot from live Substation Store bays
  const buildSnapshotPoints = (cotLabel: string): IoaPoint[] => {
    const now = fmtCp56();
    const list: IoaPoint[] = [];
    bays.forEach((b, idx) => {
      const base = (idx + 1) * 1000;
      const q = b.quality === 'GOOD' ? '0x00 (GOOD)' : '0x80 (IV)';
      list.push(
        {
          ioa: base + 1,
          typeId: 'M_DP_TB_1 (31)',
          category: 'STATUS',
          cot: cotLabel,
          bayName: b.name,
          signal: 'Circuit Breaker Position (52)',
          value: b.breakerState === 'CLOSED' ? 'ON (2)' : 'OFF (1)',
          quality: q,
          ts: now,
        },
        {
          ioa: base + 2,
          typeId: 'M_SP_TB_1 (30)',
          category: 'STATUS',
          cot: cotLabel,
          bayName: b.name,
          signal: 'Protection Trip Active (86)',
          value: b.protectionTripActive ? 'ON (1)' : 'OFF (0)',
          quality: q,
          ts: now,
        },
        {
          ioa: base + 3,
          typeId: 'M_SP_TB_1 (30)',
          category: 'STATUS',
          cot: cotLabel,
          bayName: b.name,
          signal: 'Interlock Permissive',
          value: b.interlockPermissive ? 'ON (1)' : 'OFF (0)',
          quality: q,
          ts: now,
        },
        {
          ioa: base + 101,
          typeId: 'M_ME_TF_1 (36)',
          category: 'ANALOG',
          cot: cotLabel,
          bayName: b.name,
          signal: 'Bus Voltage AB',
          value: `${b.voltageAbKv.toFixed(2)} kV`,
          quality: q,
          ts: now,
        },
        {
          ioa: base + 102,
          typeId: 'M_ME_TF_1 (36)',
          category: 'ANALOG',
          cot: cotLabel,
          bayName: b.name,
          signal: 'Phase A Current',
          value: `${b.currentA.toFixed(1)} A`,
          quality: q,
          ts: now,
        },
        {
          ioa: base + 103,
          typeId: 'M_ME_TF_1 (36)',
          category: 'ANALOG',
          cot: cotLabel,
          bayName: b.name,
          signal: 'Active Power (P)',
          value: `${b.activePowerMw.toFixed(2)} MW`,
          quality: q,
          ts: now,
        },
        {
          ioa: base + 104,
          typeId: 'M_ME_TF_1 (36)',
          category: 'ANALOG',
          cot: cotLabel,
          bayName: b.name,
          signal: 'System Frequency',
          value: `${(b.frequencyHz ?? 50).toFixed(2)} Hz`,
          quality: q,
          ts: now,
        },
        {
          ioa: base + 201,
          typeId: 'M_IT_TB_1 (37)',
          category: 'COUNTER',
          cot: cotLabel,
          bayName: b.name,
          signal: 'Import Energy Totalizer',
          value: `${(b.energyImportMwh ?? 1240).toFixed(1)} MWh`,
          quality: q,
          ts: now,
        }
      );
    });
    return list;
  };

  // Auto-populate points if restored connected on refresh
  useEffect(() => {
    if (connected && points.length === 0 && bays.length > 0) {
      setPoints(buildSnapshotPoints('20 (Inrogen)'));
    }
  }, [connected, bays.length]);

  // Periodic TESTFR keepalive when connected
  useEffect(() => {
    if (!connected) return;
    const t = window.setInterval(() => {
      pushLog('TX', 'U', '68 04 43 00 00 00', 'U-Frame: TESTFR act (t3 keepalive)');
      pushLog('RX', 'U', '68 04 83 00 00 00', 'U-Frame: TESTFR con (Link Alive)');
    }, 15000);
    return () => window.clearInterval(t);
  }, [connected]);

  const handleConnect = () => {
    setConnected(true);
    setNsSeq(0);
    setNrSeq(0);
    pushLog('SYS', 'SYS', '', `TCP Connected to ${hostIp}:${tcpPort} (${protocol}, CASDU=${casdu}, OA=${oa})`);
    pushLog('TX', 'U', '68 04 07 00 00 00', 'U-Frame: STARTDT act');
    pushLog('RX', 'U', '68 04 0B 00 00 00', 'U-Frame: STARTDT con — Data Transfer Active');
    setPoints(buildSnapshotPoints('20 (Inrogen)'));
  };

  const handleDisconnect = () => {
    pushLog('TX', 'U', '68 04 13 00 00 00', 'U-Frame: STOPDT act');
    pushLog('RX', 'U', '68 04 23 00 00 00', 'U-Frame: STOPDT con — Disconnected');
    setConnected(false);
    setSboArmed(false);
  };

  const handleGeneralInterrogation = () => {
    if (!connected) return;
    const nextNs = nsSeq + 1;
    const nextNr = nrSeq + 3;
    setNsSeq(nextNs);
    setNrSeq(nextNr);
    const caLo = hex2(casdu);
    const caHi = hex2(casdu >> 8);
    pushLog(
      'TX',
      'I',
      `68 0E ${hex2(nextNs << 1)} 00 ${hex2(nrSeq << 1)} 00 64 01 06 ${hex2(oa)} ${caLo} ${caHi} 00 00 00 14`,
      `I-Frame: C_IC_NA_1 (Type 100) COT=6 (Act) CA=${casdu} QOI=20 (Station Interrogation)`
    );
    pushLog(
      'RX',
      'I',
      `68 0E ${hex2((nrSeq + 1) << 1)} 00 ${hex2((nextNs) << 1)} 00 64 01 07 ${hex2(oa)} ${caLo} ${caHi} 00 00 00 14`,
      `I-Frame: C_IC_NA_1 (Type 100) COT=7 (ActCon) CA=${casdu}`
    );
    const snap = buildSnapshotPoints('20 (Inrogen)');
    setPoints(snap);
    pushLog(
      'RX',
      'I',
      `68 3C ... [${snap.length} IOAs]`,
      `I-Frame: Received ${snap.length} Information Objects (M_DP_TB_1, M_SP_TB_1, M_ME_TF_1) COT=20`
    );
    pushLog(
      'RX',
      'I',
      `68 0E ${hex2(nextNr << 1)} 00 ${hex2(nextNs << 1)} 00 64 01 0A ${hex2(oa)} ${caLo} ${caHi} 00 00 00 14`,
      `I-Frame: C_IC_NA_1 (Type 100) COT=10 (ActTerm) CA=${casdu} — GI Complete`
    );
    pushLog('TX', 'S', `68 04 01 00 ${hex2(nextNr << 1)} 00`, `S-Frame: Supervisory ACK N(R)=${nextNr}`);
  };

  const handleClockSync = () => {
    if (!connected) return;
    const nextNs = nsSeq + 1;
    setNsSeq(nextNs);
    const now = fmtCp56();
    pushLog(
      'TX',
      'I',
      `68 14 ${hex2(nextNs << 1)} 00 ${hex2(nrSeq << 1)} 00 67 01 06 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 [CP56Time2a]`,
      `I-Frame: C_CS_NA_1 (Type 103) COT=6 (Act) Clock Sync -> ${now} UTC`
    );
    pushLog(
      'RX',
      'I',
      `68 14 ${hex2((nrSeq + 1) << 1)} 00 ${hex2(nextNs << 1)} 00 67 01 07 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 [CP56Time2a]`,
      `I-Frame: C_CS_NA_1 (Type 103) COT=7 (ActCon) Clock Synchronized`
    );
    setNrSeq((r) => r + 1);
  };

  const handleTestFr = () => {
    if (!connected) return;
    pushLog('TX', 'U', '68 04 43 00 00 00', 'U-Frame: TESTFR act');
    pushLog('RX', 'U', '68 04 83 00 00 00', 'U-Frame: TESTFR con');
  };

  const targetBay = bays[Math.max(0, Math.min(bays.length - 1, selectedBayIdx))] || bays[0];
  const targetIoa = (Math.max(0, selectedBayIdx) + 1) * 1000 + 501;

  const handleSendControl = (phase: 'SELECT' | 'EXECUTE') => {
    if (!connected || !targetBay) return;
    const nextNs = nsSeq + 1;
    setNsSeq(nextNs);
    const typeNum = cmdType === 'C_DC_NA_1' ? 46 : 45;
    const dcoByte = (phase === 'SELECT' ? 0x80 : 0x00) | (cmdState === 'CLOSED' ? 0x02 : 0x01);
    pushLog(
      'TX',
      'I',
      `68 0E ${hex2(nextNs << 1)} 00 ${hex2(nrSeq << 1)} 00 ${hex2(typeNum)} 01 06 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(targetIoa)} ${hex2(targetIoa >> 8)} 00 ${hex2(dcoByte)}`,
      `I-Frame: ${cmdType} (${typeNum}) COT=6 IOA=${targetIoa} (${targetBay.name}) ${phase} -> ${cmdState}`
    );

    if (phase === 'SELECT') {
      setSboArmed(true);
      setNrSeq((r) => r + 1);
      pushLog(
        'RX',
        'I',
        `68 0E ${hex2((nrSeq + 1) << 1)} 00 ${hex2(nextNs << 1)} 00 ${hex2(typeNum)} 01 07 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(targetIoa)} ${hex2(targetIoa >> 8)} 00 ${hex2(dcoByte)}`,
        `I-Frame: ${cmdType} (${typeNum}) COT=7 (ActCon+) SBO Selected — Ready for Execute`
      );
      return;
    }

    const ok = commandBreaker(targetBay.id, cmdState, 'SCADA_SBO');
    setSboArmed(false);
    setNrSeq((r) => r + 2);
    if (ok) {
      pushLog(
        'RX',
        'I',
        `68 0E ${hex2((nrSeq + 1) << 1)} 00 ${hex2(nextNs << 1)} 00 ${hex2(typeNum)} 01 07 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(targetIoa)} ${hex2(targetIoa >> 8)} 00 ${hex2(dcoByte)}`,
        `I-Frame: ${cmdType} (${typeNum}) COT=7 (ActCon+) & COT=10 (ActTerm) -> ${targetBay.name} ${cmdState}`
      );
      setPoints(buildSnapshotPoints('3 (Spont)'));
      pushLog(
        'RX',
        'I',
        `68 15 ... [M_DP_TB_1 IOA=${(selectedBayIdx + 1) * 1000 + 1}]`,
        `I-Frame: Spontaneous M_DP_TB_1 (31) COT=3 IOA=${(selectedBayIdx + 1) * 1000 + 1} -> ${cmdState === 'CLOSED' ? 'ON (2)' : 'OFF (1)'}`
      );
    } else {
      pushLog(
        'RX',
        'I',
        `68 0E ${hex2((nrSeq + 1) << 1)} 00 ${hex2(nextNs << 1)} 00 ${hex2(typeNum)} 01 47 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(targetIoa)} ${hex2(targetIoa >> 8)} 00 ${hex2(dcoByte)}`,
        `I-Frame: ${cmdType} (${typeNum}) COT=7 P/N=1 (Negative ActCon — Interlock/Local blocked)`
      );
    }
  };

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return points.filter((p) => {
      if (ioaFilter !== 'ALL' && p.category !== ioaFilter) return false;
      if (q && !`${p.ioa} ${p.typeId} ${p.bayName} ${p.signal} ${p.value}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [points, ioaFilter, search]);

  return (
    <div
      className="iectest-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f2f5] text-[#111827] border border-[#707070] shadow-lg overflow-hidden"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .iectest-app,
        .iectest-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f0f2f5 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .iectest-app *::-webkit-scrollbar { width: 11px !important; height: 11px !important; }
        #root .iectest-app *::-webkit-scrollbar-track { background: #f1f5f9 !important; }
        #root .iectest-app *::-webkit-scrollbar-thumb { background: #cbd5e1 !important; border: 2px solid #f1f5f9 !important; border-radius: 0 !important; }
        #root .iectest-app p, #root .iectest-app span, #root .iectest-app label, #root .iectest-app div { text-shadow: none !important; }
        #root .iectest-app button { font-family: "Segoe UI", Tahoma, sans-serif !important; box-shadow: none !important; }
        #root .iectest-app input, #root .sas-workspace-main .iectest-app input,
        #root .iectest-app select, #root .sas-workspace-main .iectest-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 3px !important;
          box-shadow: none !important;
          color-scheme: light !important;
        }
        #root .iectest-app select option { background-color: #ffffff !important; color: #111827 !important; }
        #root .iectest-app .it-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 9px !important;
          font-size: 11.5px !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .iectest-app .it-btn:hover:not(:disabled) { background: #e0f2fe !important; border-color: #0284c7 !important; }
        #root .iectest-app .it-btn:disabled { opacity: 0.5; cursor: default; }
        #root .iectest-app .it-btn-primary {
          background: #0f4c81 !important;
          color: #ffffff !important;
          border: 1px solid #0c3c66 !important;
          padding: 3px 10px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .sas-app-shell .sas-workspace-main .iectest-app table,
        #root .iectest-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .iectest-app table thead th,
        #root .iectest-app table thead th {
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
        #root .sas-app-shell .sas-workspace-main .iectest-app table tbody td,
        #root .iectest-app table tbody td {
          padding: 3px 8px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #f1f5f9 !important;
          color: #111827 !important;
          background-color: #ffffff !important;
          vertical-align: middle;
        }
      `}</style>

      {/* 1. TITLE BAR */}
      <div className="h-[30px] bg-[#0f3d6e] text-white px-3 flex items-center justify-between shrink-0 text-[12px]">
        <div className="flex items-center gap-2 font-semibold">
          <span className="bg-[#facc15] text-[#422006] font-extrabold text-[10px] px-1.5 py-[1px] rounded-[2px]">104</span>
          <span>IEC_TEST (V1.02) — IEC 60870-5-104 / 101 Master Test Harness</span>
        </div>
        <div className="font-mono text-[11px]">
          {connected ? `STARTDT ACTIVE · ${hostIp}:${tcpPort} · N(S)=${nsSeq} N(R)=${nrSeq}` : 'DISCONNECTED'}
        </div>
      </div>

      {/* 2. CONNECTION & PROTOCOL BAR */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[11.5px] shrink-0">
        <select value={protocol} onChange={(e) => setProtocol(e.target.value as IecProtocol)} className="h-[24px] px-1.5">
          <option value="IEC104">IEC 60870-5-104 (TCP/IP)</option>
          <option value="IEC101_BAL">IEC 60870-5-101 (Balanced)</option>
          <option value="IEC101_UNBAL">IEC 60870-5-101 (Unbalanced)</option>
        </select>
        <label className="font-semibold">RTU IP:</label>
        <input value={hostIp} onChange={(e) => setHostIp(e.target.value)} className="h-[24px] w-[115px] px-1.5 font-mono" />
        <label className="font-semibold">Port:</label>
        <input type="number" value={tcpPort} onChange={(e) => setTcpPort(Number(e.target.value) || 2404)} className="h-[24px] w-[58px] px-1.5 font-mono" />
        <label className="font-semibold">CASDU:</label>
        <input type="number" value={casdu} onChange={(e) => setCasdu(Number(e.target.value) || 1)} className="h-[24px] w-[48px] px-1.5 font-mono" />
        <label className="font-semibold">OA:</label>
        <input type="number" value={oa} onChange={(e) => setOa(Number(e.target.value) || 0)} className="h-[24px] w-[44px] px-1.5 font-mono" />

        {!connected ? (
          <button type="button" className="it-btn-primary" onClick={handleConnect}>
            Connect (STARTDT)
          </button>
        ) : (
          <button type="button" className="it-btn" onClick={handleDisconnect}>
            Disconnect (STOPDT)
          </button>
        )}

        <div className="w-[1px] h-5 bg-[#cbd5e1]" />

        <button type="button" className="it-btn" disabled={!connected} onClick={handleGeneralInterrogation}>
          General Interrogation (C_IC_NA_1)
        </button>
        <button type="button" className="it-btn" disabled={!connected} onClick={handleClockSync}>
          Clock Sync (C_CS_NA_1)
        </button>
        <button type="button" className="it-btn" disabled={!connected} onClick={handleTestFr}>
          TESTFR act
        </button>
      </div>

      {/* 3. CONTROL COMMAND BAR (C_DC_NA_1 / C_SC_NA_1) */}
      <div className="bg-[#eef2f6] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[11.5px] shrink-0">
        <span className="font-bold text-[#0f3d6e]">Command:</span>
        <select value={selectedBayIdx} onChange={(e) => setSelectedBayIdx(Number(e.target.value))} className="h-[23px] px-1.5">
          {bays.map((b, idx) => (
            <option key={b.id} value={idx}>{`IOA ${(idx + 1) * 1000 + 501} — ${b.name}`}</option>
          ))}
        </select>
        <select value={cmdType} onChange={(e) => setCmdType(e.target.value as CmdType)} className="h-[23px] px-1.5">
          <option value="C_DC_NA_1">C_DC_NA_1 (46) Double Cmd</option>
          <option value="C_SC_NA_1">C_SC_NA_1 (45) Single Cmd</option>
        </select>
        <select value={cmdMode} onChange={(e) => setCmdMode(e.target.value as 'SBO' | 'DIRECT')} className="h-[23px] px-1.5">
          <option value="SBO">Select Before Operate (SBO)</option>
          <option value="DIRECT">Direct Execute</option>
        </select>
        <select value={cmdState} onChange={(e) => setCmdState(e.target.value as 'OPEN' | 'CLOSED')} className="h-[23px] px-1.5">
          <option value="OPEN">OPEN (OFF = 1)</option>
          <option value="CLOSED">CLOSE (ON = 2)</option>
        </select>
        {cmdMode === 'SBO' && (
          <button type="button" className="it-btn" disabled={!connected} onClick={() => handleSendControl('SELECT')}>
            1. Select (S/E=1)
          </button>
        )}
        <button
          type="button"
          className="it-btn-primary"
          disabled={!connected || (cmdMode === 'SBO' && !sboArmed)}
          onClick={() => handleSendControl('EXECUTE')}
        >
          {cmdMode === 'SBO' ? '2. Execute (S/E=0)' : 'Execute Command'}
        </button>
        {sboArmed && <span className="text-[#15803d] font-bold">● SBO Selected</span>}
      </div>

      {/* 4. IOA MONITOR TABLE */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#ffffff]">
        <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1 flex items-center gap-2 shrink-0 text-[11.5px]">
          <span className="font-semibold text-[#0f3d6e]">Information Objects (IOAs: {filteredPoints.length})</span>
          <select value={ioaFilter} onChange={(e) => setIoaFilter(e.target.value as IoaFilter)} className="h-[22px] px-1.5 text-[11px]">
            <option value="ALL">All Types</option>
            <option value="STATUS">Status (M_SP / M_DP)</option>
            <option value="ANALOG">Measured Float (M_ME_TF_1)</option>
            <option value="COUNTER">Counters (M_IT_TB_1)</option>
          </select>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter IOA, Bay, Signal..."
            className="h-[22px] w-[200px] px-2 text-[11px]"
          />
        </div>

        <div className="flex-1 overflow-auto">
          <table>
            <thead>
              <tr>
                <th style={{ width: '9%' }}>IOA</th>
                <th style={{ width: '16%' }}>Type ID</th>
                <th style={{ width: '12%' }}>COT</th>
                <th style={{ width: '18%' }}>Bay</th>
                <th style={{ width: '21%' }}>Signal Name</th>
                <th style={{ width: '12%' }}>Value</th>
                <th style={{ width: '12%' }}>Quality (QDS)</th>
              </tr>
            </thead>
            <tbody>
              {filteredPoints.map((pt) => (
                <tr key={pt.ioa}>
                  <td className="font-mono font-semibold">{pt.ioa}</td>
                  <td className="font-mono text-[11px]">{pt.typeId}</td>
                  <td className="font-mono text-[11px]">{pt.cot}</td>
                  <td className="font-medium">{pt.bayName}</td>
                  <td>{pt.signal}</td>
                  <td className="font-mono font-semibold">{pt.value}</td>
                  <td className="font-mono text-[11px] text-[#15803d]">{pt.quality}</td>
                </tr>
              ))}
              {filteredPoints.length === 0 && (
                <tr>
                  <td colSpan={7} className="text-center py-6 text-[#64748b]">
                    Click <strong>Connect (STARTDT)</strong> and <strong>General Interrogation (C_IC_NA_1)</strong> to populate IEC 104 IOAs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 5. APDU / ASDU HEX & DECODED LOG */}
        <div className="h-[165px] shrink-0 bg-[#f7f7f7] border-t-[3px] border-[#94a3b8] flex flex-col overflow-hidden">
          <div className="bg-[#eef2f6] border-b border-[#cbd5e1] px-2.5 py-0.5 text-[11px] font-semibold flex justify-between">
            <span>APCI / ASDU Frame Monitor (IEC 60870-5-104 Hex &amp; Decoded)</span>
            <button type="button" className="it-btn !py-0 !px-2 !text-[10.5px]" onClick={() => setLogs([])}>
              Clear Log
            </button>
          </div>
          <div ref={logPaneRef} className="flex-1 overflow-auto px-2 py-1 font-mono text-[11px] leading-[1.38]">
            {logs.map((l) => (
              <div
                key={l.id}
                style={{
                  color: l.dir === 'TX' ? '#1d4ed8' : l.dir === 'RX' ? '#15803d' : '#475569',
                }}
              >
                {`${l.time} [${l.dir}/${l.frameType}] ${l.hex ? l.hex + '  |  ' : ''}${l.decoded}`}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default IecTestTool;
