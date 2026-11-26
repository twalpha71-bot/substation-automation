import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// IEC_TEST (V1.02) — Authentic IEC 60870-5-104 / 101 Master Test Harness
// Classic Windows desktop UI with Menu Bar, APCI Parameters (k/w/t0/t1/t2/t3),
// STARTDT/STOPDT/TESTFR, General Interrogation (C_IC_NA_1), Counter Interrogation
// (C_CI_NA_1), Clock Sync (C_CS_NA_1), Reset Process (C_RP_NA_1), SBO/Direct
// Double & Single Commands (C_DC_NA_1 / C_SC_NA_1 -> live Substation Store),
// IOA Monitor Table, Byte-by-Byte APDU Frame Decoder, and CSV/TXT Export.
// ============================================================================

type IecProtocol = 'IEC104' | 'IEC101_BAL' | 'IEC101_UNBAL';
type CmdType = 'C_DC_NA_1' | 'C_SC_NA_1';
type IoaFilter = 'ALL' | 'STATUS' | 'ANALOG' | 'COUNTER';
type LogFilter = 'ALL' | 'I' | 'U' | 'S';

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
  typeId?: string;
  cot?: string;
  ioa?: string;
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
  autoTestFr: boolean;
  kParam: number;
  wParam: number;
  t1Sec: number;
  t3Sec: number;
}

const STORAGE_KEY = 'sas_iec_test_v102_pro_v2';
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
  const [dataTransferActive, setDataTransferActive] = useState<boolean>(() => Boolean(init.connected));
  const [hostIp, setHostIp] = useState<string>(() => init.hostIp || '10.132.10.250');
  const [tcpPort, setTcpPort] = useState<number>(() => init.tcpPort || 2404);
  const [casdu, setCasdu] = useState<number>(() => init.casdu || 132);
  const [oa, setOa] = useState<number>(() => init.oa ?? 0);

  const [kParam, setKParam] = useState<number>(() => init.kParam || 12);
  const [wParam, setWParam] = useState<number>(() => init.wParam || 8);
  const [t1Sec, setT1Sec] = useState<number>(() => init.t1Sec || 15);
  const [t3Sec, setT3Sec] = useState<number>(() => init.t3Sec || 20);
  const [autoTestFr, setAutoTestFr] = useState<boolean>(() => init.autoTestFr ?? true);

  const [selectedBayIdx, setSelectedBayIdx] = useState<number>(() => init.selectedBayIdx || 0);
  const [cmdType, setCmdType] = useState<CmdType>(() => init.cmdType || 'C_DC_NA_1');
  const [cmdState, setCmdState] = useState<'OPEN' | 'CLOSED'>(() => init.cmdState || 'OPEN');
  const [cmdMode, setCmdMode] = useState<'SBO' | 'DIRECT'>(() => init.cmdMode || 'SBO');
  const [sboArmed, setSboArmed] = useState<boolean>(false);

  const [ioaFilter, setIoaFilter] = useState<IoaFilter>(() => init.ioaFilter || 'ALL');
  const [logFilter, setLogFilter] = useState<LogFilter>('ALL');
  const [search, setSearch] = useState<string>('');
  const [lastCotMode, setLastCotMode] = useState<string>('20 (Inrogen)');
  const [selectedFrameId, setSelectedFrameId] = useState<number | null>(null);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [paramsModalOpen, setParamsModalOpen] = useState<boolean>(false);

  const [txSeq, setTxSeq] = useState<number>(0);
  const [rxSeq, setRxSeq] = useState<number>(0);
  const [logs, setLogs] = useState<ApduLog[]>([
    {
      id: 1,
      time: fmtTs(),
      dir: 'SYS',
      frameType: 'SYS',
      hex: '',
      decoded: 'IEC_TEST V1.02 Ready. Click "Connect (TCP)" then "STARTDT act" to begin IEC 60870-5-104/101 session.',
    },
  ]);

  const seqRef = useRef<number>(2);
  const logRef = useRef<HTMLDivElement | null>(null);

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
      autoTestFr,
      kParam,
      wParam,
      t1Sec,
      t3Sec,
    });
  }, [protocol, connected, hostIp, tcpPort, casdu, oa, selectedBayIdx, cmdType, cmdState, cmdMode, ioaFilter, autoTestFr, kParam, wParam, t1Sec, t3Sec]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [logs.length]);

  const pushLog = (
    dir: ApduLog['dir'],
    frameType: ApduLog['frameType'],
    hex: string,
    decoded: string,
    meta?: { typeId?: string; cot?: string; ioa?: string }
  ) => {
    seqRef.current += 1;
    const id = seqRef.current;
    setLogs((prev) => [...prev.slice(-180), { id, time: fmtTs(), dir, frameType, hex, decoded, ...meta }]);
  };

  // Auto TESTFR keep-alive timer (t3)
  useEffect(() => {
    if (!connected || !autoTestFr) return;
    const timer = window.setInterval(() => {
      pushLog('TX', 'U', '68 04 43 00 00 00', `U-Frame: TESTFR act (Auto t3=${t3Sec}s keep-alive)`);
      pushLog('RX', 'U', '68 04 83 00 00 00', 'U-Frame: TESTFR con (Peer Gateway Alive)');
    }, Math.max(5000, t3Sec * 1000));
    return () => window.clearInterval(timer);
  }, [connected, autoTestFr, t3Sec]);

  const activeBay = bays[Math.max(0, Math.min(bays.length - 1, selectedBayIdx))] || bays[0];

  // Live IOA table built from Substation Store
  const ioaPoints: IoaPoint[] = useMemo(() => {
    const now = fmtCp56();
    const list: IoaPoint[] = [];
    bays.forEach((b, idx) => {
      const base = (idx + 1) * 100;
      const qual = b.quality === 'GOOD' ? 'GOOD (0x00)' : 'IV/BL (0x80)';
      list.push({
        ioa: base + 1,
        typeId: '31 (M_DP_TB_1)',
        category: 'STATUS',
        cot: lastCotMode,
        bayName: b.bayCode,
        signal: `Circuit Breaker (${b.breakerId})`,
        value: b.breakerState === 'CLOSED' ? '2 (ON / CLOSED)' : '1 (OFF / OPEN)',
        quality: qual,
        ts: now,
      });
      list.push({
        ioa: base + 2,
        typeId: '30 (M_SP_TB_1)',
        category: 'STATUS',
        cot: lastCotMode,
        bayName: b.bayCode,
        signal: 'Protection Trip / 86 Lockout',
        value: b.protectionTripActive ? '1 (TRIP ACTIVE)' : '0 (NORMAL)',
        quality: qual,
        ts: now,
      });
      list.push({
        ioa: base + 3,
        typeId: '30 (M_SP_TB_1)',
        category: 'STATUS',
        cot: lastCotMode,
        bayName: b.bayCode,
        signal: '43LR Local / Remote Selector',
        value: b.localRemote === 'REMOTE' ? '1 (REMOTE)' : '0 (LOCAL)',
        quality: qual,
        ts: now,
      });
      list.push({
        ioa: base + 11,
        typeId: '36 (M_ME_TF_1)',
        category: 'ANALOG',
        cot: '3 (Spont)',
        bayName: b.bayCode,
        signal: 'Bus Voltage AB (kV)',
        value: `${(b.voltageAbKv ?? b.voltageKv ?? 0).toFixed(2)} kV`,
        quality: qual,
        ts: now,
      });
      list.push({
        ioa: base + 12,
        typeId: '36 (M_ME_TF_1)',
        category: 'ANALOG',
        cot: '3 (Spont)',
        bayName: b.bayCode,
        signal: 'Phase A Current (A)',
        value: `${(b.currentA ?? 0).toFixed(1)} A`,
        quality: qual,
        ts: now,
      });
      list.push({
        ioa: base + 13,
        typeId: '36 (M_ME_TF_1)',
        category: 'ANALOG',
        cot: '3 (Spont)',
        bayName: b.bayCode,
        signal: 'Active Power (MW)',
        value: `${(b.activePowerMw ?? 0).toFixed(2)} MW`,
        quality: qual,
        ts: now,
      });
      list.push({
        ioa: base + 21,
        typeId: '15 (M_IT_NA_1)',
        category: 'COUNTER',
        cot: '37 (ReqCoGen)',
        bayName: b.bayCode,
        signal: 'Breaker Op Counter / Energy',
        value: `${b.opCounter ?? 120} ops / ${(b.energyImportMwh ?? 0).toFixed(1)} MWh`,
        quality: qual,
        ts: now,
      });
    });
    return list;
  }, [bays, lastCotMode]);

  const filteredPoints = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ioaPoints.filter((pt) => {
      if (ioaFilter !== 'ALL' && pt.category !== ioaFilter) return false;
      if (q && !`${pt.ioa} ${pt.bayName} ${pt.signal} ${pt.typeId} ${pt.value}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [ioaPoints, ioaFilter, search]);

  const filteredLogs = useMemo(() => {
    if (logFilter === 'ALL') return logs;
    return logs.filter((l) => l.frameType === logFilter || l.frameType === 'SYS');
  }, [logs, logFilter]);

  const selectedFrame = useMemo(
    () => logs.find((l) => l.id === selectedFrameId) || null,
    [logs, selectedFrameId]
  );

  // Protocol Actions
  const handleConnectToggle = () => {
    if (connected) {
      setConnected(false);
      setDataTransferActive(false);
      setSboArmed(false);
      pushLog('TX', 'U', '68 04 13 00 00 00', 'U-Frame: STOPDT act');
      pushLog('RX', 'U', '68 04 23 00 00 00', 'U-Frame: STOPDT con — TCP Socket Closed.');
    } else {
      setConnected(true);
      setDataTransferActive(true);
      setTxSeq(0);
      setRxSeq(0);
      pushLog(
        'SYS',
        'SYS',
        '',
        `TCP Connected to ${hostIp}:${tcpPort} (${protocol}, CASDU=${casdu}, OA=${oa}, k=${kParam}, w=${wParam}).`
      );
      pushLog('TX', 'U', '68 04 07 00 00 00', 'U-Frame: STARTDT act (Enable Data Transfer)');
      pushLog('RX', 'U', '68 04 0B 00 00 00', 'U-Frame: STARTDT con (Data Transfer ACTIVE)');
    }
  };

  const sendStartDt = () => {
    if (!connected) return;
    setDataTransferActive(true);
    pushLog('TX', 'U', '68 04 07 00 00 00', 'U-Frame: STARTDT act');
    pushLog('RX', 'U', '68 04 0B 00 00 00', 'U-Frame: STARTDT con (ACTIVE)');
  };

  const sendStopDt = () => {
    if (!connected) return;
    setDataTransferActive(false);
    pushLog('TX', 'U', '68 04 13 00 00 00', 'U-Frame: STOPDT act');
    pushLog('RX', 'U', '68 04 23 00 00 00', 'U-Frame: STOPDT con (STOPPED)');
  };

  const sendTestFr = () => {
    if (!connected) return;
    pushLog('TX', 'U', '68 04 43 00 00 00', 'U-Frame: TESTFR act (Manual Link Supervision)');
    pushLog('RX', 'U', '68 04 83 00 00 00', 'U-Frame: TESTFR con (OK < 2ms)');
  };

  const sendGeneralInterrogation = () => {
    if (!connected || !dataTransferActive) return;
    const ns = txSeq;
    const nr = rxSeq;
    const txHex = `68 0E ${hex2(ns << 1)} 00 ${hex2(nr << 1)} 00 64 01 06 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 14`;
    const rxActCon = `68 0E ${hex2(nr << 1)} 00 ${hex2((ns + 1) << 1)} 00 64 01 07 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 14`;
    const rxActTerm = `68 0E ${hex2((nr + 2) << 1)} 00 ${hex2((ns + 1) << 1)} 00 64 01 0A ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 14`;
    const sAck = `68 04 01 00 ${hex2((nr + 3) << 1)} 00`;
    setTxSeq((v) => v + 1);
    setRxSeq((v) => v + 3);
    setLastCotMode('20 (Inrogen)');
    pushLog('TX', 'I', txHex, `I-Frame: C_IC_NA_1 (Type 100) General Interrogation Act (COT=6, CASDU=${casdu}, QOI=20)`, { typeId: '100 (C_IC_NA_1)', cot: '6 (Act)', ioa: '0' });
    pushLog('RX', 'I', rxActCon, `I-Frame: C_IC_NA_1 ActCon (COT=7) — Streaming ${ioaPoints.length} IOA points`, { typeId: '100 (C_IC_NA_1)', cot: '7 (ActCon)', ioa: '0' });
    pushLog('RX', 'I', rxActTerm, `I-Frame: C_IC_NA_1 ActTerm (COT=10) — GI Complete`, { typeId: '100 (C_IC_NA_1)', cot: '10 (ActTerm)', ioa: '0' });
    pushLog('TX', 'S', sAck, `S-Frame: Supervisory ACK N(R)=${nr + 3}`);
  };

  const sendCounterInterrogation = () => {
    if (!connected || !dataTransferActive) return;
    const ns = txSeq;
    const nr = rxSeq;
    const txHex = `68 0E ${hex2(ns << 1)} 00 ${hex2(nr << 1)} 00 65 01 06 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 05`;
    const rxHex = `68 0E ${hex2(nr << 1)} 00 ${hex2((ns + 1) << 1)} 00 65 01 0A ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 05`;
    setTxSeq((v) => v + 1);
    setRxSeq((v) => v + 1);
    pushLog('TX', 'I', txHex, `I-Frame: C_CI_NA_1 (Type 101) Counter Interrogation Act (COT=6, QCC=5)`, { typeId: '101 (C_CI_NA_1)', cot: '6 (Act)', ioa: '0' });
    pushLog('RX', 'I', rxHex, `I-Frame: C_CI_NA_1 ActTerm (COT=10) — ${bays.length} Integrated Totals (M_IT_NA_1) received`, { typeId: '101 (C_CI_NA_1)', cot: '10 (ActTerm)', ioa: '0' });
  };

  const sendClockSync = () => {
    if (!connected || !dataTransferActive) return;
    const ns = txSeq;
    const nr = rxSeq;
    const nowStr = fmtCp56();
    const txHex = `68 14 ${hex2(ns << 1)} 00 ${hex2(nr << 1)} 00 67 01 06 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 1A 2C 0E 0B 1A 0B 1A`;
    const rxHex = `68 14 ${hex2(nr << 1)} 00 ${hex2((ns + 1) << 1)} 00 67 01 07 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 1A 2C 0E 0B 1A 0B 1A`;
    setTxSeq((v) => v + 1);
    setRxSeq((v) => v + 1);
    pushLog('TX', 'I', txHex, `I-Frame: C_CS_NA_1 (Type 103) Clock Synchronization Act (${nowStr})`, { typeId: '103 (C_CS_NA_1)', cot: '6 (Act)', ioa: '0' });
    pushLog('RX', 'I', rxHex, `I-Frame: C_CS_NA_1 ActCon (COT=7) — RTU/Gateway Clock Synchronized`, { typeId: '103 (C_CS_NA_1)', cot: '7 (ActCon)', ioa: '0' });
  };

  const sendResetProcess = () => {
    if (!connected || !dataTransferActive) return;
    const ns = txSeq;
    const nr = rxSeq;
    const txHex = `68 0E ${hex2(ns << 1)} 00 ${hex2(nr << 1)} 00 69 01 06 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 01`;
    const rxHex = `68 0E ${hex2(nr << 1)} 00 ${hex2((ns + 1) << 1)} 00 69 01 07 ${hex2(oa)} ${hex2(casdu)} 00 00 00 00 01`;
    setTxSeq((v) => v + 1);
    setRxSeq((v) => v + 1);
    pushLog('TX', 'I', txHex, `I-Frame: C_RP_NA_1 (Type 105) Reset Process Command (QRP=1)`, { typeId: '105 (C_RP_NA_1)', cot: '6 (Act)', ioa: '0' });
    pushLog('RX', 'I', rxHex, `I-Frame: C_RP_NA_1 ActCon (COT=7) — Gateway Buffer Reset`, { typeId: '105 (C_RP_NA_1)', cot: '7 (ActCon)', ioa: '0' });
  };

  const executeCommand = (stage: 'SELECT' | 'EXECUTE') => {
    if (!connected || !dataTransferActive || !activeBay) return;
    const ioa = (selectedBayIdx + 1) * 100 + 1;
    const typeByte = cmdType === 'C_DC_NA_1' ? 0x2e : 0x2d;
    const dcoBase = cmdType === 'C_DC_NA_1' ? (cmdState === 'CLOSED' ? 0x02 : 0x01) : (cmdState === 'CLOSED' ? 0x01 : 0x00);
    const qoc = stage === 'SELECT' ? dcoBase | 0x80 : dcoBase;
    const ns = txSeq;
    const nr = rxSeq;
    const txHex = `68 0E ${hex2(ns << 1)} 00 ${hex2(nr << 1)} 00 ${hex2(typeByte)} 01 06 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${hex2(qoc)}`;
    setTxSeq((v) => v + 1);

    if (stage === 'SELECT') {
      setSboArmed(true);
      const rxHex = `68 0E ${hex2(nr << 1)} 00 ${hex2((ns + 1) << 1)} 00 ${hex2(typeByte)} 01 07 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${hex2(qoc)}`;
      setRxSeq((v) => v + 1);
      pushLog('TX', 'I', txHex, `I-Frame: ${cmdType} SELECT (S/E=1) IOA=${ioa} (${activeBay.bayCode} -> ${cmdState})`, { typeId: cmdType, cot: '6 (Act)', ioa: String(ioa) });
      pushLog('RX', 'I', rxHex, `I-Frame: ${cmdType} ActCon (COT=7) — SBO Select Armed on ${activeBay.breakerId}`, { typeId: cmdType, cot: '7 (ActCon)', ioa: String(ioa) });
      return;
    }

    const ok = commandBreaker(activeBay.id, cmdState, 'SCADA_SBO');
    setSboArmed(false);
    setRxSeq((v) => v + (ok ? 2 : 1));
    setLastCotMode('3 (Spont)');
    pushLog('TX', 'I', txHex, `I-Frame: ${cmdType} OPERATE (S/E=0) IOA=${ioa} (${activeBay.bayCode} -> ${cmdState})`, { typeId: cmdType, cot: '6 (Act)', ioa: String(ioa) });

    if (ok) {
      const rxCon = `68 0E ${hex2(nr << 1)} 00 ${hex2((ns + 1) << 1)} 00 ${hex2(typeByte)} 01 07 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${hex2(qoc)}`;
      const rxSpont = `68 15 ${hex2((nr + 1) << 1)} 00 ${hex2((ns + 1) << 1)} 00 1F 01 03 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${hex2(cmdState === 'CLOSED' ? 2 : 1)} [CP56Time2a]`;
      pushLog('RX', 'I', rxCon, `I-Frame: ${cmdType} ActCon (COT=7) + ActTerm (COT=10) — Command Accepted`, { typeId: cmdType, cot: '7/10', ioa: String(ioa) });
      pushLog('RX', 'I', rxSpont, `I-Frame: M_DP_TB_1 (Type 31) Spontaneous Feedback (COT=3) IOA=${ioa} = ${cmdState}`, { typeId: '31 (M_DP_TB_1)', cot: '3 (Spont)', ioa: String(ioa) });
    } else {
      const rxNeg = `68 0E ${hex2(nr << 1)} 00 ${hex2((ns + 1) << 1)} 00 ${hex2(typeByte)} 01 47 ${hex2(oa)} ${hex2(casdu)} 00 ${hex2(ioa)} ${hex2(ioa >> 8)} 00 ${hex2(qoc)}`;
      pushLog('RX', 'I', rxNeg, `I-Frame: ${cmdType} NEGATIVE ActCon (P/N=1, COT=47) — Blocked by CILO/43LR/86 Lockout`, { typeId: cmdType, cot: '47 (NegCon)', ioa: String(ioa) });
    }
  };

  const handleExportIoaCsv = () => {
    const rows = [
      ['IOA', 'TypeID', 'COT', 'Bay', 'Signal', 'Value', 'Quality', 'CP56Time2a'],
      ...ioaPoints.map((p) => [String(p.ioa), p.typeId, p.cot, p.bayName, p.signal, p.value, p.quality, p.ts]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iec_test_ioa_table_casdu_${casdu}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSaveTraceTxt = () => {
    const txt = logs.map((l) => `${l.time} [${l.dir}/${l.frameType}] ${l.hex ? l.hex + ' | ' : ''}${l.decoded}`).join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `iec_test_apdu_trace_${casdu}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="iectest-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f0f0] text-[#111827] border border-[#707070] shadow-lg overflow-hidden select-none"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .iectest-app, .iectest-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f0f0f0 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .iectest-app * { text-shadow: none !important; }
        #root .iectest-app input, #root .iectest-app select {
          background: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 2px !important;
          font-size: 11.5px !important;
          color-scheme: light !important;
        }
        #root .iectest-app .it-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 9px !important;
          font-size: 11.5px !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .iectest-app .it-btn:hover:not(:disabled) { background: #e0f2fe !important; border-color: #0284c7 !important; }
        #root .iectest-app .it-btn:disabled { opacity: 0.48; cursor: default; }
        #root .iectest-app .it-btn-primary {
          background: #0f4c81 !important;
          color: #ffffff !important;
          border: 1px solid #0a365c !important;
          padding: 3px 10px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .iectest-app .it-btn-primary:hover:not(:disabled) { background: #0b3a63 !important; }
        #root .iectest-app .it-menu-btn {
          background: transparent !important;
          color: #111827 !important;
          border: 1px solid transparent !important;
          padding: 1px 8px !important;
          font-size: 11.5px !important;
          cursor: pointer;
        }
        #root .iectest-app .it-menu-btn:hover, #root .iectest-app .it-menu-btn.active {
          background: #0f4c81 !important;
          color: #ffffff !important;
        }
        #root .iectest-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          font-size: 11.5px !important;
        }
        #root .iectest-app table thead th {
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
        #root .iectest-app table tbody td {
          padding: 3px 7px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #f1f5f9 !important;
          color: #111827 !important;
          background: #ffffff !important;
        }
        #root .iectest-app table tbody tr:hover td { background: #f0f9ff !important; }
      `}</style>

      {/* 1. TITLE BAR */}
      <div className="h-[28px] bg-gradient-to-r from-[#0b355c] to-[#1e6091] text-white px-2.5 flex items-center justify-between shrink-0 text-[12px] font-semibold">
        <div className="flex items-center gap-2">
          <span className="bg-[#38bdf8] text-[#082f49] font-extrabold text-[10px] px-1.5 py-[1px] rounded-[2px]">
            IEC
          </span>
          <span>IEC_TEST (V1.02) — IEC 60870-5-104 / 101 Master Test Harness</span>
        </div>
        <div className="font-mono text-[11px] flex items-center gap-2">
          <span
            className="px-2 py-[1px] rounded text-[10px] font-bold"
            style={{
              background: connected ? (dataTransferActive ? '#16a34a' : '#d97706') : '#64748b',
              color: '#ffffff',
            }}
          >
            {connected ? (dataTransferActive ? 'STARTDT ACTIVE' : 'TCP CONNECTED (STOPDT)') : 'DISCONNECTED'}
          </span>
          <span>{`${hostIp}:${tcpPort} | CASDU ${casdu}`}</span>
        </div>
      </div>

      {/* 2. CLASSIC DESKTOP MENU BAR */}
      <div
        className="h-[22px] bg-[#f1f5f9] border-b border-[#cbd5e1] px-1.5 flex items-center gap-1 shrink-0 relative z-30"
        onClick={(e) => e.stopPropagation()}
      >
        {(
          [
            ['File', [
              { label: 'Export IOA Monitor Table (.csv)', action: handleExportIoaCsv },
              { label: 'Save APDU Hex Trace (.txt)', action: handleSaveTraceTxt },
              { label: 'Clear APDU Log', action: () => setLogs([]) },
            ]],
            ['Connection', [
              { label: connected ? 'Disconnect TCP' : 'Connect TCP (Port 2404)', action: handleConnectToggle },
              { label: 'Send STARTDT act', action: sendStartDt, disabled: !connected },
              { label: 'Send STOPDT act', action: sendStopDt, disabled: !connected },
              { label: 'Send TESTFR act', action: sendTestFr, disabled: !connected },
            ]],
            ['Commands', [
              { label: 'General Interrogation (C_IC_NA_1)', action: sendGeneralInterrogation, disabled: !connected || !dataTransferActive },
              { label: 'Counter Interrogation (C_CI_NA_1)', action: sendCounterInterrogation, disabled: !connected || !dataTransferActive },
              { label: 'Clock Synchronization (C_CS_NA_1)', action: sendClockSync, disabled: !connected || !dataTransferActive },
              { label: 'Reset Process (C_RP_NA_1)', action: sendResetProcess, disabled: !connected || !dataTransferActive },
            ]],
            ['Settings', [
              { label: 'APCI / Protocol Parameters (k, w, t1, t3)...', action: () => setParamsModalOpen(true) },
              { label: `${autoTestFr ? '✓ ' : ''}Auto TESTFR Keep-Alive (t3)`, action: () => setAutoTestFr((v) => !v) },
            ]],
          ] as Array<[string, Array<{ label: string; action: () => void; disabled?: boolean }>]>
        ).map(([mName, items]) => (
          <div key={mName} className="relative">
            <button
              type="button"
              className={`it-menu-btn ${openMenu === mName ? 'active' : ''}`}
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
                    disabled={it.disabled}
                    onClick={() => { setOpenMenu(null); it.action(); }}
                    className="w-full text-left px-3 py-1.5 text-[11.5px] text-[#0f172a] hover:bg-[#dbeafe] disabled:opacity-40"
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. CONNECTION & APCI CONTROL BAR */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 shrink-0 text-[11.5px]">
        <select value={protocol} onChange={(e) => setProtocol(e.target.value as IecProtocol)} className="h-[24px] px-1.5 font-semibold">
          <option value="IEC104">IEC 60870-5-104 (TCP/IP)</option>
          <option value="IEC101_BAL">IEC 60870-5-101 (Balanced)</option>
          <option value="IEC101_UNBAL">IEC 60870-5-101 (Unbalanced)</option>
        </select>
        <label className="flex items-center gap-1">
          <span>IP:</span>
          <input value={hostIp} onChange={(e) => setHostIp(e.target.value)} className="w-[108px] h-[24px] px-1.5 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>Port:</span>
          <input type="number" value={tcpPort} onChange={(e) => setTcpPort(Number(e.target.value) || 2404)} className="w-[56px] h-[24px] px-1 font-mono" />
        </label>
        <label className="flex items-center gap-1">
          <span>CASDU:</span>
          <input type="number" value={casdu} onChange={(e) => setCasdu(Number(e.target.value) || 1)} className="w-[52px] h-[24px] px-1 font-mono" />
        </label>

        <button type="button" className="it-btn-primary" onClick={handleConnectToggle}>
          {connected ? 'Disconnect' : 'Connect (TCP)'}
        </button>

        <div className="w-[1px] h-5 bg-[#cbd5e1]" />

        <button type="button" className="it-btn" disabled={!connected} onClick={sendStartDt}>STARTDT</button>
        <button type="button" className="it-btn" disabled={!connected} onClick={sendStopDt}>STOPDT</button>
        <button type="button" className="it-btn" disabled={!connected} onClick={sendTestFr}>TESTFR</button>
        <button type="button" className="it-btn font-semibold" disabled={!connected || !dataTransferActive} onClick={sendGeneralInterrogation}>
          GI (C_IC_NA_1)
        </button>
        <button type="button" className="it-btn" disabled={!connected || !dataTransferActive} onClick={sendCounterInterrogation}>
          CI (C_CI_NA_1)
        </button>
        <button type="button" className="it-btn" disabled={!connected || !dataTransferActive} onClick={sendClockSync}>
          Clock Sync
        </button>
        <button type="button" className="it-btn ml-auto" onClick={() => setParamsModalOpen(true)}>
          APCI Params
        </button>
      </div>

      {/* 4. MAIN SPLIT WORKSPACE: LEFT IOA MONITOR + RIGHT COMMAND PANEL & APDU LOG */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* LEFT: IOA MONITOR TABLE */}
        <div className="flex-1 flex flex-col border-b lg:border-b-0 lg:border-r-[3px] border-[#cbd5e1] bg-white min-w-0 overflow-hidden">
          <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1 flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-[11.5px] font-bold text-[#0b355c]">IOA Monitor ({filteredPoints.length})</span>
            {(['ALL', 'STATUS', 'ANALOG', 'COUNTER'] as IoaFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setIoaFilter(f)}
                className="it-btn !py-[1px] !px-2 !text-[10.5px]"
                style={ioaFilter === f ? { background: '#0f4c81', color: '#ffffff', borderColor: '#0f4c81' } : undefined}
              >
                {f}
              </button>
            ))}
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter IOA, Bay, Signal..."
              className="h-[21px] flex-1 min-w-[120px] px-2 text-[11px]"
            />
          </div>

          <div className="flex-1 overflow-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '8%' }}>IOA</th>
                  <th style={{ width: '16%' }}>TypeID</th>
                  <th style={{ width: '13%' }}>COT</th>
                  <th style={{ width: '12%' }}>Bay</th>
                  <th style={{ width: '25%' }}>Signal</th>
                  <th style={{ width: '16%' }}>Value</th>
                  <th style={{ width: '10%' }}>Quality</th>
                </tr>
              </thead>
              <tbody>
                {filteredPoints.map((pt) => (
                  <tr key={pt.ioa}>
                    <td className="font-mono font-bold text-[#0b355c]">{pt.ioa}</td>
                    <td className="font-mono text-[10.5px]">{pt.typeId}</td>
                    <td className="font-mono text-[10.5px] text-[#0369a1]">{pt.cot}</td>
                    <td className="font-semibold">{pt.bayName}</td>
                    <td>{pt.signal}</td>
                    <td className="font-mono font-semibold">{pt.value}</td>
                    <td className="font-mono text-[10.5px]" style={{ color: pt.quality.startsWith('GOOD') ? '#15803d' : '#b91c1c' }}>
                      {pt.quality}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT: CONTROL COMMAND CONSOLE + APDU HEX LOG + FRAME DECODER */}
        <div className="w-full lg:w-[46%] flex flex-col bg-[#f8fafc] min-h-0 overflow-hidden">
          {/* COMMAND PANEL */}
          <div className="p-2.5 border-b border-[#cbd5e1] bg-[#f8fafc] space-y-2 shrink-0 text-[11.5px]">
            <div className="font-bold text-[#0b355c] flex items-center justify-between">
              <span>Telecontrol Command Panel (SBO / Direct Operate)</span>
              <span className="font-mono text-[10.5px] text-[#475569]">
                Target IOA: {(selectedBayIdx + 1) * 100 + 1}
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              <select
                value={selectedBayIdx}
                onChange={(e) => { setSelectedBayIdx(Number(e.target.value)); setSboArmed(false); }}
                className="h-[24px] px-1.5 col-span-2"
              >
                {bays.map((b, i) => (
                  <option key={b.id} value={i}>
                    {`${b.bayCode} — ${b.name} (${b.breakerState})`}
                  </option>
                ))}
              </select>
              <select value={cmdType} onChange={(e) => setCmdType(e.target.value as CmdType)} className="h-[24px] px-1">
                <option value="C_DC_NA_1">C_DC_NA_1 (46)</option>
                <option value="C_SC_NA_1">C_SC_NA_1 (45)</option>
              </select>
              <select value={cmdState} onChange={(e) => setCmdState(e.target.value as 'OPEN' | 'CLOSED')} className="h-[24px] px-1 font-bold">
                <option value="OPEN">OPEN (OFF)</option>
                <option value="CLOSED">CLOSE (ON)</option>
              </select>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={cmdMode === 'SBO'} onChange={() => setCmdMode('SBO')} />
                <span>Select-Before-Operate (SBO)</span>
              </label>
              <label className="flex items-center gap-1 cursor-pointer">
                <input type="radio" checked={cmdMode === 'DIRECT'} onChange={() => { setCmdMode('DIRECT'); setSboArmed(false); }} />
                <span>Direct Execute</span>
              </label>
              <div className="ml-auto flex gap-1.5">
                {cmdMode === 'SBO' && (
                  <button
                    type="button"
                    className="it-btn font-semibold"
                    disabled={!connected || !dataTransferActive}
                    onClick={() => executeCommand('SELECT')}
                  >
                    1. Select (S/E=1)
                  </button>
                )}
                <button
                  type="button"
                  className="it-btn-primary"
                  disabled={!connected || !dataTransferActive || (cmdMode === 'SBO' && !sboArmed)}
                  onClick={() => executeCommand('EXECUTE')}
                >
                  {cmdMode === 'SBO' ? '2. Execute (S/E=0)' : 'Execute Direct'}
                </button>
              </div>
            </div>
          </div>

          {/* APDU HEX TRACE LOG */}
          <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-1.5">
              <span className="text-[11.5px] font-bold text-[#0b355c]">APDU Frame Log ({filteredLogs.length})</span>
              {(['ALL', 'I', 'U', 'S'] as LogFilter[]).map((lf) => (
                <button
                  key={lf}
                  type="button"
                  onClick={() => setLogFilter(lf)}
                  className="it-btn !py-0 !px-1.5 !text-[10px]"
                  style={logFilter === lf ? { background: '#0f4c81', color: '#ffffff' } : undefined}
                >
                  {lf}
                </button>
              ))}
            </div>
            <div className="flex gap-1">
              <button type="button" className="it-btn !py-0 !px-2 !text-[10.5px]" onClick={handleSaveTraceTxt}>Save .txt</button>
              <button type="button" className="it-btn !py-0 !px-2 !text-[10.5px]" onClick={() => setLogs([])}>Clear</button>
            </div>
          </div>

          <div ref={logRef} className="flex-1 overflow-auto bg-white p-1.5 font-mono text-[11px] leading-[17px]">
            {filteredLogs.map((l) => {
              const sel = selectedFrameId === l.id;
              return (
                <div
                  key={l.id}
                  onClick={() => setSelectedFrameId(l.id)}
                  className="px-1.5 py-[1px] cursor-pointer border-b border-[#f8fafc]"
                  style={{
                    background: sel ? '#dbeafe' : 'transparent',
                    color: l.dir === 'TX' ? '#1d4ed8' : l.dir === 'RX' ? '#15803d' : '#475569',
                  }}
                >
                  <span className="text-[#64748b] mr-1">{l.time}</span>
                  <span className="font-bold mr-1">[{l.dir}/{l.frameType}]</span>
                  {l.hex && <span className="mr-1.5 text-[#0f172a]">{l.hex}</span>}
                  <span>{l.decoded}</span>
                </div>
              );
            })}
          </div>

          {/* SELECTED APDU FRAME DISSECTOR */}
          {selectedFrame && selectedFrame.hex && (
            <div className="bg-[#f1f5f9] border-t-2 border-[#94a3b8] p-2 text-[11px] shrink-0">
              <div className="font-bold text-[#0b355c] mb-1">
                APDU Dissector — {selectedFrame.dir} {selectedFrame.frameType}-Frame ({selectedFrame.time})
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 font-mono text-[10.5px]">
                <div className="bg-white border border-[#cbd5e1] px-1.5 py-0.5">Start: <strong>0x68</strong></div>
                <div className="bg-white border border-[#cbd5e1] px-1.5 py-0.5">TypeID: <strong>{selectedFrame.typeId || selectedFrame.frameType}</strong></div>
                <div className="bg-white border border-[#cbd5e1] px-1.5 py-0.5">COT: <strong>{selectedFrame.cot || 'APCI'}</strong></div>
                <div className="bg-white border border-[#cbd5e1] px-1.5 py-0.5">IOA: <strong>{selectedFrame.ioa || '—'}</strong></div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 5. STATUS BAR */}
      <div className="h-[22px] bg-[#e2e8f0] border-t border-[#94a3b8] px-2.5 flex items-center justify-between text-[11px] text-[#1e293b] shrink-0 font-mono">
        <span>{`N(S)=${txSeq}  N(R)=${rxSeq}  |  k=${kParam}  w=${wParam}  t1=${t1Sec}s  t3=${t3Sec}s`}</span>
        <span>{`IEC_TEST V1.02 · ${protocol} · Auto-TESTFR: ${autoTestFr ? 'ON' : 'OFF'}`}</span>
      </div>

      {/* APCI PARAMETERS MODAL */}
      {paramsModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[380px] bg-[#f0f0f0] border border-[#475569] shadow-xl text-[12px]">
            <div className="h-[26px] bg-[#0b355c] text-white px-2.5 flex items-center justify-between font-semibold">
              <span>IEC 60870-5-104 APCI Parameters</span>
              <button type="button" className="text-white cursor-pointer" onClick={() => setParamsModalOpen(false)}>✕</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2 items-center">
                <label>k (Max unacked I-frames):</label>
                <input type="number" min={1} max={32767} value={kParam} onChange={(e) => setKParam(Number(e.target.value) || 12)} className="h-[22px] px-1.5 font-mono" />
                <label>w (Latest ACK threshold):</label>
                <input type="number" min={1} max={32767} value={wParam} onChange={(e) => setWParam(Number(e.target.value) || 8)} className="h-[22px] px-1.5 font-mono" />
                <label>t1 (Send/Test timeout s):</label>
                <input type="number" min={1} max={255} value={t1Sec} onChange={(e) => setT1Sec(Number(e.target.value) || 15)} className="h-[22px] px-1.5 font-mono" />
                <label>t3 (Idle TESTFR s):</label>
                <input type="number" min={5} max={255} value={t3Sec} onChange={(e) => setT3Sec(Number(e.target.value) || 20)} className="h-[22px] px-1.5 font-mono" />
                <label>Originator Address (OA):</label>
                <input type="number" min={0} max={255} value={oa} onChange={(e) => setOa(Number(e.target.value) || 0)} className="h-[22px] px-1.5 font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#cbd5e1]">
                <button type="button" className="it-btn-primary" onClick={() => setParamsModalOpen(false)}>Apply</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IecTestTool;
