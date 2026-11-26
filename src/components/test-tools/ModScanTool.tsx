import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// WinTECH ModScan64 / ModScan-IP — Authentic Windows MDI Desktop Poller
// Multiple Document Interface (ModSca1, ModSca2, ...), Tile V/H, Cascade,
// Maximize, per-window Point Type / Unit ID / Address / Display Mode
// (BIN/DEC/INT/HEX/FLOAT/SWAPPED_FLOAT), live MBAP/PDU traffic monitor,
// FC05/FC06 write dialog, and live Substation Store integration.
// ============================================================================

type PointType = '01_COIL' | '02_INPUT_STATUS' | '03_HOLDING' | '04_INPUT_REG';
type DisplayMode = 'BIN' | 'DEC' | 'INT' | 'HEX' | 'FLOAT' | 'SWAPPED_FLOAT';
type MdiLayout = 'TILE_V' | 'TILE_H' | 'CASCADE' | 'MAXIMIZED';
type ChildViewMode = 'DATA' | 'TRAFFIC' | 'SPLIT';

interface TrafficFrame {
  id: number;
  time: string;
  dir: 'TX' | 'RX' | 'SYS';
  hex: string;
  note: string;
}

interface MdiChildDoc {
  id: string;
  title: string;
  unitId: number;
  pointType: PointType;
  startAddr: number;
  length: number;
  displayMode: DisplayMode;
  viewMode: ChildViewMode;
  polls: number;
  validResponses: number;
  minimized: boolean;
}

interface ModScanMdiPersisted {
  connected: boolean;
  connType: 'TCP' | 'SERIAL';
  ip: string;
  port: number;
  pollMs: number;
  timeoutMs: number;
  mdiLayout: MdiLayout;
  activeDocId: string;
  docs: MdiChildDoc[];
  writtenCoils: Record<string, boolean>;
  writtenRegs: Record<string, number>;
}

const MODSCAN_MDI_STORAGE_KEY = 'sas_modscan64_mdi_v2';
let modscanMdiCache: ModScanMdiPersisted | null = null;

const DEFAULT_DOCS: MdiChildDoc[] = [
  {
    id: 'doc-1',
    title: 'ModSca1',
    unitId: 1,
    pointType: '03_HOLDING',
    startAddr: 1,
    length: 18,
    displayMode: 'DEC',
    viewMode: 'SPLIT',
    polls: 0,
    validResponses: 0,
    minimized: false,
  },
  {
    id: 'doc-2',
    title: 'ModSca2',
    unitId: 2,
    pointType: '04_INPUT_REG',
    startAddr: 1,
    length: 18,
    displayMode: 'FLOAT',
    viewMode: 'DATA',
    polls: 0,
    validResponses: 0,
    minimized: false,
  },
];

function loadInitialModScan(): Partial<ModScanMdiPersisted> {
  if (modscanMdiCache) return modscanMdiCache;
  try {
    const raw = window.localStorage.getItem(MODSCAN_MDI_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ModScanMdiPersisted;
      if (parsed && typeof parsed === 'object' && Array.isArray(parsed.docs) && parsed.docs.length > 0) {
        modscanMdiCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

function saveModScan(state: ModScanMdiPersisted) {
  modscanMdiCache = state;
  try {
    window.localStorage.setItem(MODSCAN_MDI_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore quota errors
  }
}

function fmtTimeMs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function toHexByte(n: number): string {
  return (n & 0xff).toString(16).toUpperCase().padStart(2, '0');
}

function toHexWord(n: number): string {
  return (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function floatToRegs(val: number): [number, number] {
  const buf = new ArrayBuffer(4);
  const dv = new DataView(buf);
  dv.setFloat32(0, val, false);
  return [dv.getUint16(0, false), dv.getUint16(2, false)];
}

function regsToFloat(hi: number, lo: number): number {
  const buf = new ArrayBuffer(4);
  const dv = new DataView(buf);
  dv.setUint16(0, hi & 0xffff, false);
  dv.setUint16(2, lo & 0xffff, false);
  return dv.getFloat32(0, false);
}

const POINT_META: Record<PointType, { fc: number; label: string; prefix: number; writable: boolean }> = {
  '01_COIL': { fc: 1, label: '01: COIL STATUS', prefix: 0, writable: true },
  '02_INPUT_STATUS': { fc: 2, label: '02: INPUT STATUS', prefix: 10000, writable: false },
  '03_HOLDING': { fc: 3, label: '03: HOLDING REGISTER', prefix: 40000, writable: true },
  '04_INPUT_REG': { fc: 4, label: '04: INPUT REGISTER', prefix: 30000, writable: false },
};

const DISPLAY_LABELS: Record<DisplayMode, string> = {
  BIN: 'Binary',
  DEC: 'Decimal',
  INT: 'Integer',
  HEX: 'Hexadecimal',
  FLOAT: 'Floating Pt (ABCD)',
  SWAPPED_FLOAT: 'Swapped FP (CDAB)',
};

export const ModScanTool: React.FC = () => {
  const init = useMemo(() => loadInitialModScan(), []);
  const { bays, commandBreaker } = useSubstationStore();

  const [connected, setConnected] = useState<boolean>(() => Boolean(init.connected));
  const [connType, setConnType] = useState<'TCP' | 'SERIAL'>(() => init.connType || 'TCP');
  const [ip, setIp] = useState<string>(() => init.ip || '10.132.30.200');
  const [port, setPort] = useState<number>(() => init.port || 502);
  const [pollMs, setPollMs] = useState<number>(() => init.pollMs || 1000);
  const [timeoutMs, setTimeoutMs] = useState<number>(() => init.timeoutMs || 2000);
  const [mdiLayout, setMdiLayout] = useState<MdiLayout>(() => init.mdiLayout || 'TILE_V');
  const [docs, setDocs] = useState<MdiChildDoc[]>(() =>
    init.docs && init.docs.length > 0 ? init.docs : DEFAULT_DOCS
  );
  const [activeDocId, setActiveDocId] = useState<string>(() => init.activeDocId || 'doc-1');

  const [writtenCoils, setWrittenCoils] = useState<Record<string, boolean>>(() => init.writtenCoils || {});
  const [writtenRegs, setWrittenRegs] = useState<Record<string, number>>(() => init.writtenRegs || {});

  const [showToolbar, setShowToolbar] = useState<boolean>(true);
  const [showStatusBar, setShowStatusBar] = useState<boolean>(true);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState<boolean>(false);
  const [aboutOpen, setAboutOpen] = useState<boolean>(false);
  const [writeModal, setWriteModal] = useState<{
    docId: string;
    unitId: number;
    addr: number;
    currentVal: number;
    label: string;
    isCoil: boolean;
  } | null>(null);
  const [writeInputVal, setWriteInputVal] = useState<string>('0');
  const [tick, setTick] = useState<number>(() => Date.now());
  const [trafficByDoc, setTrafficByDoc] = useState<Record<string, TrafficFrame[]>>(() => ({
    'doc-1': [
      {
        id: 1,
        time: fmtTimeMs(),
        dir: 'SYS',
        hex: '',
        note: 'ModScan64 MDI Ready. Select Connection -> Connect... to start Modbus TCP/IP polling.',
      },
    ],
  }));

  const txIdRef = useRef<number>(1);
  const frameSeqRef = useRef<number>(2);
  const docCounterRef = useRef<number>(docs.length + 1);

  const activeDoc = useMemo(
    () => docs.find((d) => d.id === activeDocId) || docs[0],
    [docs, activeDocId]
  );

  useEffect(() => {
    saveModScan({
      connected,
      connType,
      ip,
      port,
      pollMs,
      timeoutMs,
      mdiLayout,
      activeDocId: activeDoc?.id || '',
      docs,
      writtenCoils,
      writtenRegs,
    });
  }, [connected, connType, ip, port, pollMs, timeoutMs, mdiLayout, activeDoc, docs, writtenCoils, writtenRegs]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  const updateDoc = (docId: string, patch: Partial<MdiChildDoc>) => {
    setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, ...patch } : d)));
  };

  const pushDocTraffic = (docId: string, dir: TrafficFrame['dir'], hex: string, note: string) => {
    frameSeqRef.current += 1;
    const id = frameSeqRef.current;
    setTrafficByDoc((prev) => {
      const list = prev[docId] || [];
      return {
        ...prev,
        [docId]: [...list.slice(-120), { id, time: fmtTimeMs(), dir, hex, note }],
      };
    });
  };

  const handleNewMdiWindow = () => {
    const num = docCounterRef.current++;
    const newId = `doc-${Date.now()}-${num}`;
    const nextUnit = ((docs.length) % Math.max(1, bays.length)) + 1;
    const newDoc: MdiChildDoc = {
      id: newId,
      title: `ModSca${num}`,
      unitId: nextUnit,
      pointType: docs.length % 2 === 0 ? '03_HOLDING' : '04_INPUT_REG',
      startAddr: 1,
      length: 16,
      displayMode: 'DEC',
      viewMode: 'DATA',
      polls: 0,
      validResponses: 0,
      minimized: false,
    };
    setDocs((prev) => [...prev, newDoc]);
    setActiveDocId(newId);
    if (mdiLayout === 'MAXIMIZED') setMdiLayout('TILE_V');
  };

  const handleCloseDoc = (docId: string) => {
    setDocs((prev) => {
      const next = prev.filter((d) => d.id !== docId);
      if (next.length === 0) return prev; // Keep at least 1 MDI window open
      if (activeDocId === docId) setActiveDocId(next[0].id);
      return next;
    });
  };

  const handleResetCounters = () => {
    setDocs((prev) => prev.map((d) => ({ ...d, polls: 0, validResponses: 0 })));
    if (activeDoc) {
      pushDocTraffic(activeDoc.id, 'SYS', '', 'Poll & Valid Response counters reset to 0.');
    }
  };

  // Compute live Modbus point rows for any MDI child document
  const buildRowsForDoc = (doc: MdiChildDoc) => {
    const bayIdx = Math.max(0, Math.min(bays.length - 1, doc.unitId - 1));
    const bay = bays[bayIdx] || bays[0];
    const safeStart = Math.max(1, Math.min(9999, Number(doc.startAddr) || 1));
    const safeLen = Math.max(1, Math.min(125, Number(doc.length) || 20));
    const meta = POINT_META[doc.pointType];

    const vKv = bay ? (bay.voltageAbKv ?? bay.voltageKv ?? 33.0) : 132.0;
    const iA = bay ? (bay.currentA ?? 145.0) : 150.0;
    const pMw = bay ? (bay.activePowerMw ?? 24.5) : 32.5;
    const qMvar = bay ? (bay.reactivePowerMvar ?? 6.2) : 8.4;
    const hz = bay ? (bay.frequencyHz ?? 50.0) : 50.0;
    const [vHi, vLo] = floatToRegs(vKv);
    const [iHi, iLo] = floatToRegs(iA);
    const [pHi, pLo] = floatToRegs(pMw);
    const [qHi, qLo] = floatToRegs(qMvar);
    const [fHi, fLo] = floatToRegs(hz);

    const getRegVal = (addr: number): { raw: number; desc: string } => {
      const key = `${doc.unitId}:${addr}`;
      if (doc.pointType === '01_COIL') {
        if (writtenCoils[key] !== undefined) {
          return { raw: writtenCoils[key] ? 1 : 0, desc: addr === 1 ? 'CB Close/Open Command Coil' : `User Coil ${addr}` };
        }
        if (addr === 1) return { raw: bay?.breakerState === 'CLOSED' ? 1 : 0, desc: 'CB Close/Open Command Coil' };
        if (addr === 2) return { raw: bay?.localRemote === 'REMOTE' ? 1 : 0, desc: 'Remote Control Enable (43LR)' };
        if (addr === 3) return { raw: bay?.protectionTripActive ? 1 : 0, desc: '86 Trip Lockout Reset Coil' };
        return { raw: 0, desc: `Spare Coil ${addr}` };
      }
      if (doc.pointType === '02_INPUT_STATUS') {
        if (addr === 1) return { raw: bay?.breakerState === 'CLOSED' ? 1 : 0, desc: 'CB Closed Status (52a)' };
        if (addr === 2) return { raw: bay?.breakerState === 'OPEN' ? 1 : 0, desc: 'CB Open Status (52b)' };
        if (addr === 3) return { raw: bay?.protectionTripActive ? 1 : 0, desc: 'Protection Trip Active (86)' };
        if (addr === 4) return { raw: bay?.interlockPermissive ? 1 : 0, desc: 'Interlock Permissive (CILO)' };
        if (addr === 5) return { raw: bay?.springCharged ? 1 : 0, desc: 'CB Spring Charged' };
        if (addr === 6) return { raw: bay?.sf6PressureNormal ? 1 : 0, desc: 'SF6 Gas Pressure Normal' };
        if (addr === 7) return { raw: bay?.tcsHealthy ? 1 : 0, desc: 'Trip Circuit Supervision (TCS)' };
        if (addr === 8) return { raw: bay?.dcSupplyHealthy ? 1 : 0, desc: '110V DC Auxiliary Healthy' };
        return { raw: 0, desc: `Discrete Input ${addr}` };
      }
      if (doc.pointType === '03_HOLDING' && writtenRegs[key] !== undefined) {
        return { raw: writtenRegs[key] & 0xffff, desc: `Holding Register ${addr} (Written)` };
      }
      switch (addr) {
        case 1: return { raw: Math.round(vKv * 100) & 0xffff, desc: `Voltage AB (x0.01 kV = ${vKv.toFixed(2)} kV)` };
        case 2: return { raw: Math.round(iA * 10) & 0xffff, desc: `Phase A Current (x0.1 A = ${iA.toFixed(1)} A)` };
        case 3: return { raw: Math.round(pMw * 100) & 0xffff, desc: `Active Power (x0.01 MW = ${pMw.toFixed(2)} MW)` };
        case 4: return { raw: Math.round(qMvar * 100) & 0xffff, desc: `Reactive Power (x0.01 MVAr = ${qMvar.toFixed(2)} MVAr)` };
        case 5: return { raw: Math.round(hz * 100) & 0xffff, desc: `Frequency (x0.01 Hz = ${hz.toFixed(2)} Hz)` };
        case 6: return { raw: bay?.breakerState === 'CLOSED' ? 2 : 1, desc: 'CB Position Code (1=OPEN, 2=CLOSED)' };
        case 7: return { raw: bay?.opCounter ?? 142, desc: 'Breaker Operation Counter' };
        case 8: return { raw: bay?.quality === 'GOOD' ? 0 : 1, desc: 'Telemetry Quality (0=Good)' };
        case 9: return { raw: vHi, desc: 'Float32 Voltage kV (MSW)' };
        case 10: return { raw: vLo, desc: 'Float32 Voltage kV (LSW)' };
        case 11: return { raw: iHi, desc: 'Float32 Current A (MSW)' };
        case 12: return { raw: iLo, desc: 'Float32 Current A (LSW)' };
        case 13: return { raw: pHi, desc: 'Float32 Active Power MW (MSW)' };
        case 14: return { raw: pLo, desc: 'Float32 Active Power MW (LSW)' };
        case 15: return { raw: qHi, desc: 'Float32 Reactive MVAr (MSW)' };
        case 16: return { raw: qLo, desc: 'Float32 Reactive MVAr (LSW)' };
        case 17: return { raw: fHi, desc: 'Float32 Frequency Hz (MSW)' };
        case 18: return { raw: fLo, desc: 'Float32 Frequency Hz (LSW)' };
        default: return { raw: 0, desc: `Spare Register ${addr}` };
      }
    };

    const rows: Array<{ addr: number; displayAddr: string; raw: number; formatted: string; desc: string }> = [];
    for (let i = 0; i < safeLen; i++) {
      const addr = safeStart + i;
      const { raw, desc } = getRegVal(addr);
      const displayAddr = String(meta.prefix + addr).padStart(5, '0');
      let formatted = `<${String(raw).padStart(5, '0')}>`;
      if (doc.pointType === '01_COIL' || doc.pointType === '02_INPUT_STATUS') {
        formatted = `<${raw ? '1' : '0'}>`;
      } else if (doc.displayMode === 'HEX') {
        formatted = `<${toHexWord(raw)}H>`;
      } else if (doc.displayMode === 'BIN') {
        formatted = `<${raw.toString(2).padStart(16, '0')}>`;
      } else if (doc.displayMode === 'INT') {
        const signed = raw > 32767 ? raw - 65536 : raw;
        formatted = `<${signed}>`;
      } else if (doc.displayMode === 'FLOAT' || doc.displayMode === 'SWAPPED_FLOAT') {
        if (i % 2 === 0 && i + 1 < safeLen) {
          const nextRaw = getRegVal(addr + 1).raw;
          const f = doc.displayMode === 'FLOAT' ? regsToFloat(raw, nextRaw) : regsToFloat(nextRaw, raw);
          formatted = `<${Number.isFinite(f) ? f.toFixed(3) : 'NaN'}>`;
        } else {
          formatted = `<-- 0x${toHexWord(raw)}>`;
        }
      }
      rows.push({ addr, displayAddr, raw, formatted, desc });
    }
    return { bay, rows };
  };

  // Cyclic Modbus TCP Polling across ALL open non-minimized MDI Child Windows
  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => {
      setTick(Date.now());
      setDocs((prevDocs) =>
        prevDocs.map((d) => {
          if (d.minimized) return d;
          const nextTx = (txIdRef.current % 65535) + 1;
          txIdRef.current = nextTx;
          const fc = POINT_META[d.pointType].fc;
          const s0 = Math.max(0, (Number(d.startAddr) || 1) - 1);
          const qty = Math.max(1, Math.min(125, Number(d.length) || 20));
          const txHex = `${toHexByte(nextTx >> 8)} ${toHexByte(nextTx)} 00 00 00 06 ${toHexByte(d.unitId)} ${toHexByte(fc)} ${toHexByte(s0 >> 8)} ${toHexByte(s0)} ${toHexByte(qty >> 8)} ${toHexByte(qty)}`;
          const byteCount = fc <= 2 ? Math.ceil(qty / 8) : qty * 2;
          const rxLen = byteCount + 3;
          const rxHex = `${toHexByte(nextTx >> 8)} ${toHexByte(nextTx)} 00 00 ${toHexByte(rxLen >> 8)} ${toHexByte(rxLen)} ${toHexByte(d.unitId)} ${toHexByte(fc)} ${toHexByte(byteCount)} ... [${byteCount} bytes]`;
          pushDocTraffic(d.id, 'TX', txHex, `FC0${fc} Unit=${d.unitId} Start=${d.startAddr} Qty=${qty}`);
          pushDocTraffic(d.id, 'RX', rxHex, `Valid Slave Response (${byteCount} bytes)`);
          return { ...d, polls: d.polls + 1, validResponses: d.validResponses + 1 };
        })
      );
    }, Math.max(300, pollMs));
    return () => window.clearInterval(timer);
  }, [connected, pollMs]);

  const handleConnect = () => {
    setConnected(true);
    setConnectOpen(false);
    docs.forEach((d) => {
      pushDocTraffic(
        d.id,
        'SYS',
        '',
        `Connected (${connType === 'TCP' ? `${ip}:${port}` : 'COM1 9600,N,8,1'}). Polling Unit ${d.unitId} every ${pollMs}ms.`
      );
    });
  };

  const handleDisconnect = () => {
    setConnected(false);
    docs.forEach((d) => {
      pushDocTraffic(d.id, 'SYS', '', `Disconnected from ${ip}:${port}.`);
    });
  };

  const handleCommitWrite = () => {
    if (!writeModal) return;
    const { docId, unitId, addr, isCoil } = writeModal;
    const key = `${unitId}:${addr}`;
    const bayIdx = Math.max(0, Math.min(bays.length - 1, unitId - 1));
    const targetBay = bays[bayIdx];
    const tx = (txIdRef.current % 65535) + 1;
    txIdRef.current = tx;

    if (isCoil) {
      const boolVal =
        writeInputVal === '1' || writeInputVal.toLowerCase() === 'true' || writeInputVal.toLowerCase() === 'on';
      setWrittenCoils((prev) => ({ ...prev, [key]: boolVal }));
      if (addr === 1 && targetBay) {
        commandBreaker(targetBay.id, boolVal ? 'CLOSED' : 'OPEN', 'SCADA_SBO');
      }
      const valHex = boolVal ? 'FF 00' : '00 00';
      const a0 = addr - 1;
      const hex = `${toHexByte(tx >> 8)} ${toHexByte(tx)} 00 00 00 06 ${toHexByte(unitId)} 05 ${toHexByte(a0 >> 8)} ${toHexByte(a0)} ${valHex}`;
      pushDocTraffic(docId, 'TX', hex, `FC05 Force Single Coil ${String(addr).padStart(5, '0')} = ${boolVal ? 'ON (1)' : 'OFF (0)'}`);
      pushDocTraffic(docId, 'RX', hex, `FC05 Confirmed (Unit ${unitId})`);
    } else {
      const numVal = Math.max(0, Math.min(65535, Math.round(Number(writeInputVal) || 0)));
      setWrittenRegs((prev) => ({ ...prev, [key]: numVal }));
      const a0 = addr - 1;
      const hex = `${toHexByte(tx >> 8)} ${toHexByte(tx)} 00 00 00 06 ${toHexByte(unitId)} 06 ${toHexByte(a0 >> 8)} ${toHexByte(a0)} ${toHexByte(numVal >> 8)} ${toHexByte(numVal)}`;
      pushDocTraffic(docId, 'TX', hex, `FC06 Write Single Register ${String(40000 + addr).padStart(5, '0')} = ${numVal} (0x${toHexWord(numVal)})`);
      pushDocTraffic(docId, 'RX', hex, `FC06 Confirmed (Unit ${unitId})`);
    }
    setWriteModal(null);
  };

  const handleSaveTrafficLog = () => {
    if (!activeDoc) return;
    const frames = trafficByDoc[activeDoc.id] || [];
    const text = frames.map((f) => `${f.time} [${f.dir}] ${f.hex ? f.hex + ' | ' : ''}${f.note}`).join('\n');
    const blob = new Blob([text || 'No traffic captured yet.'], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.title.toLowerCase()}_modbus_traffic.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportActiveCsv = () => {
    if (!activeDoc) return;
    const { rows } = buildRowsForDoc(activeDoc);
    const lines = [
      ['Address', 'Display Value', 'Raw Decimal', 'Hex', 'Signal Description'].join(','),
      ...rows.map((r) =>
        [r.displayAddr, r.formatted, String(r.raw), `0x${toHexWord(r.raw)}`, r.desc]
          .map((c) => `"${c.replace(/"/g, '""')}"`)
          .join(',')
      ),
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeDoc.title.toLowerCase()}_unit${activeDoc.unitId}_snapshot.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalPolls = docs.reduce((acc, d) => acc + d.polls, 0);
  const totalValid = docs.reduce((acc, d) => acc + d.validResponses, 0);
  const visibleDocs = mdiLayout === 'MAXIMIZED' && activeDoc ? [activeDoc] : docs.filter((d) => !d.minimized);
  const minimizedDocs = docs.filter((d) => d.minimized);

  // Reference tick so memoized data updates on every poll cycle
  void tick;

  return (
    <div
      className="modscan-mdi-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#808080] text-[#000000] border border-[#404040] shadow-lg overflow-hidden select-none"
      style={{ colorScheme: 'light' }}
    >
      {/* Classic Windows Win32 MDI Theme Scoped Styles */}
      <style>{`
        #root .modscan-mdi-app,
        .modscan-mdi-app {
          font-family: "Segoe UI", Tahoma, MS Sans Serif, sans-serif !important;
          color: #000000 !important;
          color-scheme: light !important;
        }
        #root .modscan-mdi-app * {
          text-shadow: none !important;
        }
        #root .modscan-mdi-app *::-webkit-scrollbar { width: 14px !important; height: 14px !important; }
        #root .modscan-mdi-app *::-webkit-scrollbar-track { background: #e8e8e8 !important; }
        #root .modscan-mdi-app *::-webkit-scrollbar-thumb {
          background: #c0c0c0 !important;
          border: 1px solid #808080 !important;
          border-radius: 0 !important;
        }
        #root .modscan-mdi-app input,
        #root .modscan-mdi-app select {
          background: #ffffff !important;
          color: #000000 !important;
          border-top: 1px solid #808080 !important;
          border-left: 1px solid #808080 !important;
          border-right: 1px solid #ffffff !important;
          border-bottom: 1px solid #ffffff !important;
          box-shadow: inset 1px 1px 0 #404040 !important;
          border-radius: 0 !important;
          font-size: 11.5px !important;
          color-scheme: light !important;
        }
        #root .modscan-mdi-app .win-btn {
          background: #f0f0f0 !important;
          color: #000000 !important;
          border-top: 1px solid #ffffff !important;
          border-left: 1px solid #ffffff !important;
          border-right: 1px solid #808080 !important;
          border-bottom: 1px solid #808080 !important;
          box-shadow: inset -1px -1px 0 #a0a0a0 !important;
          border-radius: 0 !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
          cursor: pointer;
        }
        #root .modscan-mdi-app .win-btn:hover:not(:disabled) {
          background: #e2effb !important;
        }
        #root .modscan-mdi-app .win-btn:active:not(:disabled),
        #root .modscan-mdi-app .win-btn.is-pressed {
          background: #d0e4f7 !important;
          border-top: 1px solid #808080 !important;
          border-left: 1px solid #808080 !important;
          border-right: 1px solid #ffffff !important;
          border-bottom: 1px solid #ffffff !important;
          box-shadow: none !important;
        }
        #root .modscan-mdi-app .win-btn:disabled {
          color: #808080 !important;
          cursor: default;
        }
        #root .modscan-mdi-app .win-menu-btn {
          background: transparent !important;
          color: #000000 !important;
          border: 1px solid transparent !important;
          padding: 1px 7px !important;
          font-size: 11.5px !important;
          border-radius: 0 !important;
          cursor: pointer;
        }
        #root .modscan-mdi-app .win-menu-btn:hover,
        #root .modscan-mdi-app .win-menu-btn.active {
          background: #316ac5 !important;
          color: #ffffff !important;
        }
        #root .modscan-mdi-app .win-dropdown {
          background: #f0f0f0 !important;
          border-top: 1px solid #ffffff !important;
          border-left: 1px solid #ffffff !important;
          border-right: 2px solid #404040 !important;
          border-bottom: 2px solid #404040 !important;
          min-width: 190px;
          z-index: 60;
        }
        #root .modscan-mdi-app .win-drop-item {
          width: 100%;
          text-align: left;
          padding: 4px 18px 4px 12px !important;
          font-size: 11.5px !important;
          background: transparent !important;
          color: #000000 !important;
          border: 0 !important;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        #root .modscan-mdi-app .win-drop-item:hover:not(:disabled) {
          background: #316ac5 !important;
          color: #ffffff !important;
        }
        #root .modscan-mdi-app .win-drop-item:disabled {
          color: #808080 !important;
          cursor: default;
        }
        #root .modscan-mdi-app .mdi-child {
          background: #f0f0f0 !important;
          border-top: 2px solid #ffffff !important;
          border-left: 2px solid #ffffff !important;
          border-right: 2px solid #404040 !important;
          border-bottom: 2px solid #404040 !important;
          box-shadow: 2px 2px 6px rgba(0, 0, 0, 0.35);
        }
        #root .modscan-mdi-app .mdi-data-row:hover {
          background-color: #e6f2ff !important;
        }
      `}</style>

      {/* 1. CLASSIC WINDOWS APPLICATION TITLE BAR */}
      <div className="h-[26px] bg-gradient-to-r from-[#0a246a] via-[#1c4b9e] to-[#a6caf0] text-white px-2 flex items-center justify-between shrink-0 text-[12px] font-bold">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="inline-flex items-center justify-center bg-[#facc15] text-[#0f172a] font-black text-[9.5px] px-1 py-[0.5px] border border-[#1e293b]">
            M64
          </span>
          <span className="truncate">
            ModScan64 - [{activeDoc?.title || 'ModSca1'}]
            {connected ? ` (${connType === 'TCP' ? `${ip}:${port}` : 'COM1'})` : ' (Disconnected)'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className="win-btn !px-1.5 !py-0 !text-[10px] font-bold">_</span>
          <span className="win-btn !px-1.5 !py-0 !text-[10px] font-bold">□</span>
          <span className="win-btn !px-1.5 !py-0 !text-[10px] font-bold">✕</span>
        </div>
      </div>

      {/* 2. CLASSIC WINDOWS MDI MENU BAR */}
      <div
        className="h-[22px] bg-[#f0f0f0] border-b border-[#b0b0b0] px-1 flex items-center gap-0.5 shrink-0 relative z-40"
        onClick={(e) => e.stopPropagation()}
      >
        {(
          [
            ['File', [
              { label: 'New Window (Ctrl+N)', action: handleNewMdiWindow },
              { label: `Close ${activeDoc?.title || 'Window'}`, action: () => activeDoc && handleCloseDoc(activeDoc.id), disabled: docs.length <= 1 },
              { sep: true },
              { label: 'Save Traffic Log (.txt)...', action: handleSaveTrafficLog },
              { label: 'Export Active Registers (.csv)...', action: handleExportActiveCsv },
            ]],
            ['Connection', [
              { label: 'Connect...', action: () => setConnectOpen(true) },
              { label: 'Disconnect', action: handleDisconnect, disabled: !connected },
              { sep: true },
              { label: 'Reset Poll Counters', action: handleResetCounters },
            ]],
            ['Setup', [
              ...(['BIN', 'DEC', 'INT', 'HEX', 'FLOAT', 'SWAPPED_FLOAT'] as DisplayMode[]).map((m) => ({
                label: `${activeDoc?.displayMode === m ? '● ' : '   '}Display: ${DISPLAY_LABELS[m]}`,
                action: () => activeDoc && updateDoc(activeDoc.id, { displayMode: m }),
              })),
              { sep: true },
              { label: `${activeDoc?.viewMode === 'DATA' ? '● ' : '   '}Show Data Only`, action: () => activeDoc && updateDoc(activeDoc.id, { viewMode: 'DATA' }) },
              { label: `${activeDoc?.viewMode === 'TRAFFIC' ? '● ' : '   '}Show Traffic Only`, action: () => activeDoc && updateDoc(activeDoc.id, { viewMode: 'TRAFFIC' }) },
              { label: `${activeDoc?.viewMode === 'SPLIT' ? '● ' : '   '}Split Data & Traffic`, action: () => activeDoc && updateDoc(activeDoc.id, { viewMode: 'SPLIT' }) },
            ]],
            ['View', [
              { label: `${showToolbar ? '✓ ' : '   '}Toolbar`, action: () => setShowToolbar((v) => !v) },
              { label: `${showStatusBar ? '✓ ' : '   '}Status Bar`, action: () => setShowStatusBar((v) => !v) },
            ]],
            ['Window', [
              { label: 'New MDI Child Window', action: handleNewMdiWindow },
              { sep: true },
              { label: `${mdiLayout === 'TILE_V' ? '● ' : '   '}Tile Vertically`, action: () => setMdiLayout('TILE_V') },
              { label: `${mdiLayout === 'TILE_H' ? '● ' : '   '}Tile Horizontally`, action: () => setMdiLayout('TILE_H') },
              { label: `${mdiLayout === 'CASCADE' ? '● ' : '   '}Cascade`, action: () => setMdiLayout('CASCADE') },
              { label: `${mdiLayout === 'MAXIMIZED' ? '● ' : '   '}Maximize Active`, action: () => setMdiLayout('MAXIMIZED') },
              { sep: true },
              ...docs.map((d, idx) => ({
                label: `${activeDoc?.id === d.id ? '✓ ' : '   '}${idx + 1} ${d.title} (Unit ${d.unitId})`,
                action: () => {
                  updateDoc(d.id, { minimized: false });
                  setActiveDocId(d.id);
                },
              })),
            ]],
            ['Help', [
              { label: 'About ModScan64...', action: () => setAboutOpen(true) },
            ]],
          ] as Array<[string, Array<{ label?: string; action?: () => void; disabled?: boolean; sep?: boolean }>]>
        ).map(([menuName, items]) => (
          <div key={menuName} className="relative">
            <button
              type="button"
              className={`win-menu-btn ${openMenu === menuName ? 'active' : ''}`}
              onClick={() => setOpenMenu((m) => (m === menuName ? null : menuName))}
            >
              {menuName}
            </button>
            {openMenu === menuName && (
              <div className="win-dropdown absolute left-0 top-full py-0.5">
                {items.map((it, idx) =>
                  it.sep ? (
                    <div key={`sep-${idx}`} className="my-0.5 border-t border-[#808080] border-b border-b-white" />
                  ) : (
                    <button
                      key={it.label}
                      type="button"
                      disabled={it.disabled}
                      className="win-drop-item"
                      onClick={() => {
                        setOpenMenu(null);
                        it.action?.();
                      }}
                    >
                      <span>{it.label}</span>
                    </button>
                  )
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. CLASSIC WINDOWS 3D ICON TOOLBAR */}
      {showToolbar && (
        <div className="bg-[#f0f0f0] border-b border-[#808080] px-1.5 py-1 flex flex-wrap items-center gap-1 shrink-0">
          <button type="button" className="win-btn font-semibold" onClick={handleNewMdiWindow} title="New MDI Child Document">
            📄 New
          </button>
          <button
            type="button"
            className={`win-btn font-semibold ${connected ? 'is-pressed' : ''}`}
            onClick={() => (connected ? handleDisconnect() : setConnectOpen(true))}
          >
            {connected ? '🔌 Disconnect' : '⚡ Connect'}
          </button>
          <button type="button" className="win-btn" onClick={handleResetCounters} title="Reset Poll Counters">
            ↺ Reset Ctrs
          </button>

          <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-0.5" />

          {/* Display Mode Quick Buttons (Classic ModScan64 Toolbar) */}
          {(
            [
              ['BIN', 'BIN'],
              ['DEC', 'DEC'],
              ['INT', 'INT'],
              ['HEX', 'HEX'],
              ['FLOAT', 'FLT'],
              ['SWAPPED_FLOAT', 'S-FLT'],
            ] as Array<[DisplayMode, string]>
          ).map(([modeKey, shortLbl]) => (
            <button
              key={modeKey}
              type="button"
              className={`win-btn font-mono font-bold ${activeDoc?.displayMode === modeKey ? 'is-pressed' : ''}`}
              onClick={() => activeDoc && updateDoc(activeDoc.id, { displayMode: modeKey })}
              title={DISPLAY_LABELS[modeKey]}
            >
              {shortLbl}
            </button>
          ))}

          <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-0.5" />

          {/* Data / Traffic / Split View Buttons */}
          <button
            type="button"
            className={`win-btn ${activeDoc?.viewMode === 'DATA' ? 'is-pressed' : ''}`}
            onClick={() => activeDoc && updateDoc(activeDoc.id, { viewMode: 'DATA' })}
          >
            Data
          </button>
          <button
            type="button"
            className={`win-btn ${activeDoc?.viewMode === 'TRAFFIC' ? 'is-pressed' : ''}`}
            onClick={() => activeDoc && updateDoc(activeDoc.id, { viewMode: 'TRAFFIC' })}
          >
            Traffic
          </button>
          <button
            type="button"
            className={`win-btn ${activeDoc?.viewMode === 'SPLIT' ? 'is-pressed' : ''}`}
            onClick={() => activeDoc && updateDoc(activeDoc.id, { viewMode: 'SPLIT' })}
          >
            Split
          </button>

          <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-0.5" />

          {/* MDI Window Arrangement Buttons */}
          <button
            type="button"
            className={`win-btn ${mdiLayout === 'TILE_V' ? 'is-pressed' : ''}`}
            onClick={() => setMdiLayout('TILE_V')}
            title="Tile MDI Windows Vertically"
          >
            Tile V
          </button>
          <button
            type="button"
            className={`win-btn ${mdiLayout === 'TILE_H' ? 'is-pressed' : ''}`}
            onClick={() => setMdiLayout('TILE_H')}
            title="Tile MDI Windows Horizontally"
          >
            Tile H
          </button>
          <button
            type="button"
            className={`win-btn ${mdiLayout === 'CASCADE' ? 'is-pressed' : ''}`}
            onClick={() => setMdiLayout('CASCADE')}
            title="Cascade MDI Windows"
          >
            Cascade
          </button>
          <button
            type="button"
            className={`win-btn ${mdiLayout === 'MAXIMIZED' ? 'is-pressed' : ''}`}
            onClick={() => setMdiLayout('MAXIMIZED')}
            title="Maximize Active Child Window"
          >
            Max
          </button>
        </div>
      )}

      {/* 4. CLASSIC WINDOWS MDI CLIENT WORKSPACE (#808080) */}
      <div className="flex-1 bg-[#808080] p-1.5 overflow-auto relative min-h-0 flex flex-col">
        <div
          className={
            mdiLayout === 'CASCADE'
              ? 'relative flex-1 min-h-[420px]'
              : mdiLayout === 'TILE_H'
              ? 'flex-1 grid grid-cols-1 gap-1.5 min-h-0'
              : mdiLayout === 'MAXIMIZED'
              ? 'flex-1 flex flex-col min-h-0'
              : visibleDocs.length >= 2
              ? 'flex-1 grid grid-cols-1 lg:grid-cols-2 gap-1.5 min-h-0'
              : 'flex-1 grid grid-cols-1 gap-1.5 min-h-0'
          }
        >
          {visibleDocs.map((doc, docIdx) => {
            const isActive = activeDoc?.id === doc.id;
            const { bay, rows } = buildRowsForDoc(doc);
            const docTraffic = trafficByDoc[doc.id] || [];
            const meta = POINT_META[doc.pointType];

            const cascadeStyle: React.CSSProperties | undefined =
              mdiLayout === 'CASCADE'
                ? {
                    position: 'absolute',
                    top: `${docIdx * 28}px`,
                    left: `${docIdx * 28}px`,
                    width: 'calc(100% - 64px)',
                    height: 'calc(100% - 64px)',
                    zIndex: isActive ? 30 : 10 + docIdx,
                  }
                : undefined;

            return (
              <div
                key={doc.id}
                onMouseDown={() => setActiveDocId(doc.id)}
                style={cascadeStyle}
                className="mdi-child flex flex-col min-h-[260px] overflow-hidden"
              >
                {/* MDI CHILD TITLE BAR */}
                <div
                  className={`h-[22px] px-1.5 flex items-center justify-between text-[11.5px] font-bold shrink-0 ${
                    isActive
                      ? 'bg-gradient-to-r from-[#0a246a] to-[#a6caf0] text-white'
                      : 'bg-gradient-to-r from-[#808080] to-[#c0c0c0] text-[#e0e0e0]'
                  }`}
                >
                  <span className="truncate">
                    {doc.title} — Unit {doc.unitId} ({bay?.bayCode || `Bay ${doc.unitId}`}) · {meta.label}
                  </span>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <button
                      type="button"
                      className="win-btn !px-1 !py-0 !text-[9.5px] !leading-[14px] font-bold"
                      title="Minimize"
                      onClick={(e) => {
                        e.stopPropagation();
                        updateDoc(doc.id, { minimized: true });
                      }}
                    >
                      _
                    </button>
                    <button
                      type="button"
                      className="win-btn !px-1 !py-0 !text-[9.5px] !leading-[14px] font-bold"
                      title={mdiLayout === 'MAXIMIZED' ? 'Restore' : 'Maximize'}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDocId(doc.id);
                        setMdiLayout((l) => (l === 'MAXIMIZED' ? 'TILE_V' : 'MAXIMIZED'));
                      }}
                    >
                      {mdiLayout === 'MAXIMIZED' ? '❐' : '□'}
                    </button>
                    <button
                      type="button"
                      disabled={docs.length <= 1}
                      className="win-btn !px-1 !py-0 !text-[9.5px] !leading-[14px] font-bold"
                      title="Close Window"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCloseDoc(doc.id);
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                {/* AUTHENTIC MODSCAN64 CHILD HEADER CONFIGURATION PANEL */}
                <div className="bg-[#f0f0f0] border-b border-[#808080] px-2 py-1.5 grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-2 text-[11px] shrink-0">
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <label className="flex items-center gap-1">
                      <span className="font-semibold">Address:</span>
                      <input
                        type="number"
                        min={1}
                        max={9999}
                        value={doc.startAddr}
                        onChange={(e) => updateDoc(doc.id, { startAddr: Math.max(1, Number(e.target.value) || 1) })}
                        className="w-[54px] h-[20px] px-1 font-mono"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="font-semibold">Length:</span>
                      <input
                        type="number"
                        min={1}
                        max={125}
                        value={doc.length}
                        onChange={(e) => updateDoc(doc.id, { length: Math.max(1, Math.min(125, Number(e.target.value) || 1)) })}
                        className="w-[46px] h-[20px] px-1 font-mono"
                      />
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="font-semibold">Device Id:</span>
                      <select
                        value={doc.unitId}
                        onChange={(e) => updateDoc(doc.id, { unitId: Number(e.target.value) })}
                        className="h-[20px] px-1 font-mono max-w-[130px]"
                      >
                        {bays.map((b, i) => (
                          <option key={b.id} value={i + 1}>
                            {i + 1} ({b.bayCode})
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1">
                      <span className="font-semibold">MODBUS Point Type:</span>
                      <select
                        value={doc.pointType}
                        onChange={(e) => updateDoc(doc.id, { pointType: e.target.value as PointType })}
                        className="h-[20px] px-1 font-semibold"
                      >
                        {(Object.keys(POINT_META) as PointType[]).map((pt) => (
                          <option key={pt} value={pt}>
                            {POINT_META[pt].label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  {/* CLASSIC MODSCAN64 RIGHT COUNTERS */}
                  <div className="flex items-center gap-3 font-mono text-[11px] bg-[#e8e8e8] border border-[#a0a0a0] px-2 py-0.5 self-center">
                    <span>
                      Number of Polls: <strong>{doc.polls}</strong>
                    </span>
                    <span>
                      Valid Slave Responses: <strong className="text-[#006400]">{doc.validResponses}</strong>
                    </span>
                  </div>
                </div>

                {/* MDI CHILD BODY: DATA REGISTER LIST + OPTIONAL TRAFFIC MONITOR */}
                <div className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden">
                  {!connected && (
                    <div className="bg-[#fff5f5] border-b border-[#fca5a5] px-2.5 py-1 font-mono text-[11.5px] font-bold text-[#c00000] shrink-0">
                      ** Device NOT CONNECTED! ** — Select Connection -&gt; Connect... to begin polling {ip}:{port}
                    </div>
                  )}

                  {/* REGISTER / COIL DATA VIEW */}
                  {(doc.viewMode === 'DATA' || doc.viewMode === 'SPLIT') && (
                    <div className="flex-1 overflow-auto p-1.5 font-mono text-[12px] leading-[19px] bg-white">
                      {rows.map((r) => {
                        const canWrite = connected && meta.writable;
                        return (
                          <div
                            key={r.addr}
                            onDoubleClick={() => {
                              if (!canWrite) return;
                              setWriteModal({
                                docId: doc.id,
                                unitId: doc.unitId,
                                addr: r.addr,
                                currentVal: r.raw,
                                label: `${doc.title} · ${r.displayAddr} — ${r.desc}`,
                                isCoil: doc.pointType === '01_COIL',
                              });
                              setWriteInputVal(String(r.raw));
                            }}
                            className={`mdi-data-row flex items-center justify-between gap-2 px-1.5 border-b border-[#f1f5f9] ${
                              canWrite ? 'cursor-pointer' : ''
                            }`}
                            title={canWrite ? 'Double-click to Write (FC05/FC06)' : 'Read-Only or Disconnected'}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-bold text-[#000080] shrink-0">{r.displayAddr}:</span>
                              <span className="font-bold text-[#000000] min-w-[96px] shrink-0">{r.formatted}</span>
                              <span className="text-[#475569] text-[11px] truncate" style={{ fontFamily: '"Segoe UI", sans-serif' }}>
                                {r.desc}
                              </span>
                            </div>
                            {canWrite && (
                              <button
                                type="button"
                                className="win-btn !px-1.5 !py-0 !text-[10px] shrink-0"
                                onClick={() => {
                                  setWriteModal({
                                    docId: doc.id,
                                    unitId: doc.unitId,
                                    addr: r.addr,
                                    currentVal: r.raw,
                                    label: `${doc.title} · ${r.displayAddr} — ${r.desc}`,
                                    isCoil: doc.pointType === '01_COIL',
                                  });
                                  setWriteInputVal(String(r.raw));
                                }}
                              >
                                Write
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* TRAFFIC MONITOR PANE */}
                  {(doc.viewMode === 'TRAFFIC' || doc.viewMode === 'SPLIT') && (
                    <div
                      className={`${
                        doc.viewMode === 'SPLIT' ? 'h-[115px] border-t-2 border-[#808080]' : 'flex-1'
                      } shrink-0 bg-[#fafafa] flex flex-col overflow-hidden`}
                    >
                      <div className="bg-[#e8e8e8] border-b border-[#b8b8b8] px-2 py-0.5 text-[10.5px] font-semibold flex justify-between">
                        <span>Modbus TCP Traffic — {doc.title} (MBAP + PDU Hex)</span>
                        <span>{docTraffic.length} frame(s)</span>
                      </div>
                      <div className="flex-1 overflow-auto px-2 py-1 font-mono text-[11px] leading-[16px]">
                        {docTraffic.map((f) => (
                          <div
                            key={f.id}
                            style={{
                              color: f.dir === 'TX' ? '#0000c0' : f.dir === 'RX' ? '#007000' : '#555555',
                            }}
                          >
                            {`${f.time} [${f.dir}] ${f.hex ? f.hex + ' | ' : ''}${f.note}`}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* MINIMIZED MDI CHILD ICON BAR (CLASSIC WIN32 BOTTOM TRAY) */}
        {minimizedDocs.length > 0 && (
          <div className="pt-1.5 flex flex-wrap gap-1.5 shrink-0">
            {minimizedDocs.map((d) => (
              <button
                key={d.id}
                type="button"
                className="win-btn font-bold flex items-center gap-1.5"
                onClick={() => {
                  updateDoc(d.id, { minimized: false });
                  setActiveDocId(d.id);
                }}
              >
                <span>📄 {d.title} (U{d.unitId})</span>
                <span>❐</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 5. CLASSIC WINDOWS STATUS BAR */}
      {showStatusBar && (
        <div className="h-[22px] bg-[#f0f0f0] border-t border-[#808080] px-1.5 flex items-center gap-2 text-[11px] shrink-0">
          <span className="flex-1 truncate border-r border-[#a0a0a0] pr-2">
            {connected
              ? `Polling ${connType === 'TCP' ? `${ip}:${port}` : 'COM1'} (${pollMs} ms) · ${docs.length} MDI Window(s)`
              : 'Ready — Disconnected'}
          </span>
          <span className="border-r border-[#a0a0a0] pr-2 font-mono">
            Active: {activeDoc?.title || '-'} ({activeDoc ? DISPLAY_LABELS[activeDoc.displayMode] : '-'})
          </span>
          <span className="border-r border-[#a0a0a0] pr-2 font-mono">
            Total Polls: {totalPolls} | Valid: {totalValid}
          </span>
          <span className="font-mono font-bold text-[#000080]">NUM</span>
        </div>
      )}

      {/* CONNECT DIALOG (CLASSIC WINTECH CONNECTION DETAILS) */}
      {connectOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[430px] bg-[#f0f0f0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-r-[#404040] border-b-[#404040] shadow-xl text-[12px]">
            <div className="h-[24px] bg-gradient-to-r from-[#0a246a] to-[#a6caf0] text-white px-2 flex items-center justify-between font-bold text-[11.5px]">
              <span>Connection Details</span>
              <button type="button" className="win-btn !px-1.5 !py-0 !text-[10px]" onClick={() => setConnectOpen(false)}>
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Connect Using:</label>
                <select
                  value={connType}
                  onChange={(e) => setConnType(e.target.value as 'TCP' | 'SERIAL')}
                  className="col-span-2 h-[22px] px-1"
                >
                  <option value="TCP">Remote modbusTCP Server</option>
                  <option value="SERIAL">Direct Connection to COM1 (RTU)</option>
                </select>

                <label className="font-semibold">IP Address:</label>
                <input
                  type="text"
                  disabled={connType !== 'TCP'}
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="col-span-2 h-[22px] px-1.5 font-mono"
                />

                <label className="font-semibold">Service Port:</label>
                <input
                  type="number"
                  disabled={connType !== 'TCP'}
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value) || 502)}
                  className="col-span-2 h-[22px] px-1.5 font-mono"
                />

                <label className="font-semibold">Poll Rate (ms):</label>
                <input
                  type="number"
                  min={300}
                  max={10000}
                  value={pollMs}
                  onChange={(e) => setPollMs(Math.max(300, Number(e.target.value) || 1000))}
                  className="col-span-2 h-[22px] px-1.5 font-mono"
                />

                <label className="font-semibold">Timeout (ms):</label>
                <input
                  type="number"
                  min={500}
                  max={10000}
                  value={timeoutMs}
                  onChange={(e) => setTimeoutMs(Math.max(500, Number(e.target.value) || 2000))}
                  className="col-span-2 h-[22px] px-1.5 font-mono"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#c0c0c0]">
                <button type="button" className="win-btn min-w-[74px] font-bold" onClick={handleConnect}>
                  OK
                </button>
                <button type="button" className="win-btn min-w-[74px]" onClick={() => setConnectOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WRITE SINGLE REGISTER (FC06) / FORCE COIL (FC05) DIALOG */}
      {writeModal && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[380px] bg-[#f0f0f0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-r-[#404040] border-b-[#404040] shadow-xl text-[12px]">
            <div className="h-[24px] bg-gradient-to-r from-[#0a246a] to-[#a6caf0] text-white px-2 flex items-center justify-between font-bold text-[11.5px]">
              <span>{writeModal.isCoil ? 'Force Single Coil (FC05)' : 'Write Register (FC06)'}</span>
              <button type="button" className="win-btn !px-1.5 !py-0 !text-[10px]" onClick={() => setWriteModal(null)}>
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="font-bold text-[#0a246a] text-[11.5px]">{writeModal.label}</div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Device Id:</label>
                <span className="col-span-2 font-mono font-bold">{writeModal.unitId}</span>
                <label className="font-semibold">New Value:</label>
                {writeModal.isCoil ? (
                  <select
                    value={writeInputVal}
                    onChange={(e) => setWriteInputVal(e.target.value)}
                    className="col-span-2 h-[22px] px-1"
                  >
                    <option value="1">1 (ON / CLOSE)</option>
                    <option value="0">0 (OFF / OPEN)</option>
                  </select>
                ) : (
                  <input
                    type="number"
                    min={0}
                    max={65535}
                    value={writeInputVal}
                    onChange={(e) => setWriteInputVal(e.target.value)}
                    className="col-span-2 h-[22px] px-1.5 font-mono"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#c0c0c0]">
                <button type="button" className="win-btn min-w-[74px] font-bold" onClick={handleCommitWrite}>
                  Update
                </button>
                <button type="button" className="win-btn min-w-[74px]" onClick={() => setWriteModal(null)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT MODSCAN64 DIALOG */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[360px] bg-[#f0f0f0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-r-[#404040] border-b-[#404040] shadow-xl text-[12px]">
            <div className="h-[24px] bg-gradient-to-r from-[#0a246a] to-[#a6caf0] text-white px-2 flex items-center justify-between font-bold text-[11.5px]">
              <span>About ModScan64</span>
              <button type="button" className="win-btn !px-1.5 !py-0 !text-[10px]" onClick={() => setAboutOpen(false)}>
                ✕
              </button>
            </div>
            <div className="p-3.5 space-y-2 text-[11.5px]">
              <div className="font-bold text-[#0a246a] text-[13px]">ModScan64 / ModScan-IP (Windows MDI Edition)</div>
              <p>Modbus TCP/IP &amp; RTU Master Commissioning Simulator synced with the live 132/33/11 kV Substation Store.</p>
              <p className="font-mono text-[11px] text-[#334155]">
                Supports: FC01, FC02, FC03, FC04, FC05, FC06 · BIN/DEC/INT/HEX/FLOAT32 (ABCD &amp; CDAB) · Multi-Window MDI.
              </p>
              <div className="flex justify-end pt-2">
                <button type="button" className="win-btn min-w-[74px] font-bold" onClick={() => setAboutOpen(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModScanTool;
