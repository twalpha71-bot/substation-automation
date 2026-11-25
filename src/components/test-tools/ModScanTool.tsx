import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// WinTECH ModScan64 / ModScan-IP — Authentic Real-Time Modbus TCP Master Poller
// Integrated with live Substation Store (bays, telemetry, breaker control)
// Supports FC01/02/03/04 polling, FC05/06 write dialog, BIN/DEC/HEX/INT/FLOAT32
// display modes, hex MBAP/PDU traffic monitor, and localStorage persistence.
// ============================================================================

type PointType = '01_COIL' | '02_INPUT_STATUS' | '03_HOLDING' | '04_INPUT_REG';
type DisplayMode = 'DEC' | 'HEX' | 'BIN' | 'INT' | 'FLOAT';

interface TrafficFrame {
  id: number;
  time: string;
  dir: 'TX' | 'RX' | 'SYS';
  hex: string;
  note: string;
}

interface ModScanPersisted {
  connected: boolean;
  ip: string;
  port: number;
  unitId: number;
  pointType: PointType;
  startAddr: number;
  length: number;
  pollMs: number;
  displayMode: DisplayMode;
  showTraffic: boolean;
  writtenCoils: Record<number, boolean>;
  writtenRegs: Record<number, number>;
}

const MODSCAN_STORAGE_KEY = 'sas_modscan64_state_v1';
let modscanMemoryCache: ModScanPersisted | null = null;

function loadInitialModScan(): Partial<ModScanPersisted> {
  if (modscanMemoryCache) return modscanMemoryCache;
  try {
    const raw = window.localStorage.getItem(MODSCAN_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ModScanPersisted;
      if (parsed && typeof parsed === 'object') {
        modscanMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage errors
  }
  return {};
}

function saveModScan(state: ModScanPersisted) {
  modscanMemoryCache = state;
  try {
    window.localStorage.setItem(MODSCAN_STORAGE_KEY, JSON.stringify(state));
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

export const ModScanTool: React.FC = () => {
  const init = useMemo(() => loadInitialModScan(), []);
  const { bays, commandBreaker } = useSubstationStore();

  const [connected, setConnected] = useState<boolean>(() => Boolean(init.connected));
  const [ip, setIp] = useState<string>(() => init.ip || '10.132.10.200');
  const [port, setPort] = useState<number>(() => init.port || 502);
  const [unitId, setUnitId] = useState<number>(() => init.unitId || 1);
  const [pointType, setPointType] = useState<PointType>(() => init.pointType || '03_HOLDING');
  const [startAddr, setStartAddr] = useState<number>(() => init.startAddr || 1);
  const [length, setLength] = useState<number>(() => init.length || 20);
  const [pollMs, setPollMs] = useState<number>(() => init.pollMs || 1000);
  const [displayMode, setDisplayMode] = useState<DisplayMode>(() => init.displayMode || 'DEC');
  const [showTraffic, setShowTraffic] = useState<boolean>(() => init.showTraffic ?? true);

  const [writtenCoils, setWrittenCoils] = useState<Record<number, boolean>>(() => init.writtenCoils || {});
  const [writtenRegs, setWrittenRegs] = useState<Record<number, number>>(() => init.writtenRegs || {});

  const [polls, setPolls] = useState<number>(0);
  const [validResponses, setValidResponses] = useState<number>(0);
  const [txId, setTxId] = useState<number>(1);
  const [traffic, setTraffic] = useState<TrafficFrame[]>([
    { id: 1, time: fmtTimeMs(), dir: 'SYS', hex: '', note: 'ModScan64 ready. Select Connection -> Connect to start Modbus TCP polling.' },
  ]);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [connectOpen, setConnectOpen] = useState<boolean>(false);
  const [writeModal, setWriteModal] = useState<{ addr: number; currentVal: number; label: string; isCoil: boolean } | null>(null);
  const [writeInputVal, setWriteInputVal] = useState<string>('0');
  const [tick, setTick] = useState<number>(() => Date.now());

  const trafficRef = useRef<HTMLDivElement | null>(null);
  const frameSeqRef = useRef<number>(2);

  useEffect(() => {
    saveModScan({
      connected,
      ip,
      port,
      unitId,
      pointType,
      startAddr,
      length,
      pollMs,
      displayMode,
      showTraffic,
      writtenCoils,
      writtenRegs,
    });
  }, [connected, ip, port, unitId, pointType, startAddr, length, pollMs, displayMode, showTraffic, writtenCoils, writtenRegs]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (trafficRef.current) {
      trafficRef.current.scrollTop = trafficRef.current.scrollHeight;
    }
  }, [traffic.length]);

  const activeBay = useMemo(() => {
    const idx = Math.max(0, Math.min(bays.length - 1, unitId - 1));
    return bays[idx] || bays[0];
  }, [bays, unitId]);

  const pushTraffic = (dir: TrafficFrame['dir'], hex: string, note: string) => {
    frameSeqRef.current += 1;
    const id = frameSeqRef.current;
    setTraffic((prev) => [...prev.slice(-150), { id, time: fmtTimeMs(), dir, hex, note }]);
  };

  // Build live Modbus register / coil values for the selected Unit ID (Bay)
  const pointRows = useMemo(() => {
    const bay = activeBay;
    const rows: Array<{ addr: number; displayAddr: string; raw: number; formatted: string; desc: string }> = [];
    const safeStart = Math.max(1, Math.min(9999, Number(startAddr) || 1));
    const safeLen = Math.max(1, Math.min(125, Number(length) || 20));
    const meta = POINT_META[pointType];

    // Live analog Float32 pairs for Holding/Input registers
    const vKv = bay ? bay.voltageAbKv : 132.0;
    const iA = bay ? bay.currentA : 150.0;
    const pMw = bay ? bay.activePowerMw : 32.5;
    const qMvar = bay ? bay.reactivePowerMvar ?? 8.4 : 8.4;
    const hz = bay ? bay.frequencyHz ?? 50.0 : 50.0;
    const [vHi, vLo] = floatToRegs(vKv);
    const [iHi, iLo] = floatToRegs(iA);
    const [pHi, pLo] = floatToRegs(pMw);
    const [qHi, qLo] = floatToRegs(qMvar);
    const [fHi, fLo] = floatToRegs(hz);

    const getRegVal = (addr: number): { raw: number; desc: string } => {
      if (pointType === '01_COIL') {
        if (writtenCoils[addr] !== undefined) return { raw: writtenCoils[addr] ? 1 : 0, desc: addr === 1 ? 'CB Close/Open Command Coil' : `User Coil ${addr}` };
        if (addr === 1) return { raw: bay?.breakerState === 'CLOSED' ? 1 : 0, desc: 'CB Close/Open Command Coil' };
        if (addr === 2) return { raw: bay?.localRemote === 'REMOTE' ? 1 : 0, desc: 'Remote Control Enable' };
        if (addr === 3) return { raw: bay?.protectionTripActive ? 1 : 0, desc: 'Trip Reset Coil' };
        return { raw: 0, desc: `Spare Coil ${addr}` };
      }
      if (pointType === '02_INPUT_STATUS') {
        if (addr === 1) return { raw: bay?.breakerState === 'CLOSED' ? 1 : 0, desc: 'CB Closed Status (52a)' };
        if (addr === 2) return { raw: bay?.breakerState === 'OPEN' ? 1 : 0, desc: 'CB Open Status (52b)' };
        if (addr === 3) return { raw: bay?.protectionTripActive ? 1 : 0, desc: 'Protection Trip Active (86)' };
        if (addr === 4) return { raw: bay?.interlockPermissive ? 1 : 0, desc: 'Interlock Permissive (CILO)' };
        if (addr === 5) return { raw: bay?.springCharged ? 1 : 0, desc: 'CB Spring Charged' };
        if (addr === 6) return { raw: bay?.sf6PressureNormal ? 1 : 0, desc: 'SF6 Gas Pressure Normal' };
        if (addr === 7) return { raw: bay?.tcsHealthy ? 1 : 0, desc: 'Trip Circuit Supervision Healthy' };
        if (addr === 8) return { raw: bay?.dcSupplyHealthy ? 1 : 0, desc: '110V DC Supply Healthy' };
        return { raw: 0, desc: `Discrete Input ${addr}` };
      }

      if (pointType === '03_HOLDING' && writtenRegs[addr] !== undefined) {
        return { raw: writtenRegs[addr] & 0xffff, desc: `Holding Register ${addr} (Written)` };
      }

      // Scaled integers + IEEE-754 Float32 pairs
      switch (addr) {
        case 1: return { raw: Math.round(vKv * 100) & 0xffff, desc: `Voltage AB (x0.01 kV = ${vKv.toFixed(2)} kV)` };
        case 2: return { raw: Math.round(iA * 10) & 0xffff, desc: `Phase A Current (x0.1 A = ${iA.toFixed(1)} A)` };
        case 3: return { raw: Math.round(pMw * 100) & 0xffff, desc: `Active Power (x0.01 MW = ${pMw.toFixed(2)} MW)` };
        case 4: return { raw: Math.round(qMvar * 100) & 0xffff, desc: `Reactive Power (x0.01 MVAr = ${qMvar.toFixed(2)} MVAr)` };
        case 5: return { raw: Math.round(hz * 100) & 0xffff, desc: `Frequency (x0.01 Hz = ${hz.toFixed(2)} Hz)` };
        case 6: return { raw: bay?.breakerState === 'CLOSED' ? 2 : 1, desc: `CB Position Code (1=OPEN, 2=CLOSED)` };
        case 7: return { raw: bay?.opCounter ?? 142, desc: 'Breaker Operation Counter' };
        case 8: return { raw: bay?.quality === 'GOOD' ? 0 : 1, desc: 'Telemetry Quality Flag (0=Good)' };
        case 9: return { raw: vHi, desc: 'IEEE-754 Float32 Voltage kV (MSW)' };
        case 10: return { raw: vLo, desc: 'IEEE-754 Float32 Voltage kV (LSW)' };
        case 11: return { raw: iHi, desc: 'IEEE-754 Float32 Current A (MSW)' };
        case 12: return { raw: iLo, desc: 'IEEE-754 Float32 Current A (LSW)' };
        case 13: return { raw: pHi, desc: 'IEEE-754 Float32 Power MW (MSW)' };
        case 14: return { raw: pLo, desc: 'IEEE-754 Float32 Power MW (LSW)' };
        case 15: return { raw: qHi, desc: 'IEEE-754 Float32 Reactive MVAr (MSW)' };
        case 16: return { raw: qLo, desc: 'IEEE-754 Float32 Reactive MVAr (LSW)' };
        case 17: return { raw: fHi, desc: 'IEEE-754 Float32 Frequency Hz (MSW)' };
        case 18: return { raw: fLo, desc: 'IEEE-754 Float32 Frequency Hz (LSW)' };
        default: return { raw: 0, desc: `Spare Register ${addr}` };
      }
    };

    for (let i = 0; i < safeLen; i++) {
      const addr = safeStart + i;
      const { raw, desc } = getRegVal(addr);
      const displayAddr = String(meta.prefix + addr).padStart(5, '0');
      let formatted = `<${String(raw).padStart(5, '0')}>`;
      if (pointType === '01_COIL' || pointType === '02_INPUT_STATUS') {
        formatted = `<${raw ? '1 (ON) ' : '0 (OFF)'}>`;
      } else if (displayMode === 'HEX') {
        formatted = `<0x${toHexWord(raw)}>`;
      } else if (displayMode === 'BIN') {
        formatted = `<${raw.toString(2).padStart(16, '0')}>`;
      } else if (displayMode === 'INT') {
        const signed = raw > 32767 ? raw - 65536 : raw;
        formatted = `<${signed >= 0 ? '+' : ''}${signed}>`;
      } else if (displayMode === 'FLOAT') {
        if (i % 2 === 0 && i + 1 < safeLen) {
          const nextRaw = getRegVal(addr + 1).raw;
          const f = regsToFloat(raw, nextRaw);
          formatted = `<${Number.isFinite(f) ? f.toFixed(3) : 'NaN'}>`;
        } else {
          formatted = `<LSW 0x${toHexWord(raw)}>`;
        }
      }
      rows.push({ addr, displayAddr, raw, formatted, desc });
    }
    return rows;
  }, [activeBay, pointType, startAddr, length, displayMode, writtenCoils, writtenRegs, tick]);

  // Cyclic Modbus TCP Polling loop
  useEffect(() => {
    if (!connected) return;
    const timer = window.setInterval(() => {
      setTick(Date.now());
      setPolls((p) => p + 1);
      setValidResponses((r) => r + 1);
      setTxId((prev) => {
        const nextTx = (prev % 65535) + 1;
        const fc = POINT_META[pointType].fc;
        const s0 = Math.max(0, (Number(startAddr) || 1) - 1);
        const qty = Math.max(1, Math.min(125, Number(length) || 20));
        const txHex = `${toHexByte(nextTx >> 8)} ${toHexByte(nextTx)} 00 00 00 06 ${toHexByte(unitId)} ${toHexByte(fc)} ${toHexByte(s0 >> 8)} ${toHexByte(s0)} ${toHexByte(qty >> 8)} ${toHexByte(qty)}`;
        const byteCount = fc <= 2 ? Math.ceil(qty / 8) : qty * 2;
        const rxLen = byteCount + 3;
        const rxHex = `${toHexByte(nextTx >> 8)} ${toHexByte(nextTx)} 00 00 ${toHexByte(rxLen >> 8)} ${toHexByte(rxLen)} ${toHexByte(unitId)} ${toHexByte(fc)} ${toHexByte(byteCount)} ... [${byteCount} data bytes]`;
        pushTraffic('TX', txHex, `FC0${fc} Read Unit=${unitId} Start=${startAddr} Qty=${qty}`);
        pushTraffic('RX', rxHex, `OK (${activeBay?.name || 'Bay ' + unitId})`);
        return nextTx;
      });
    }, Math.max(300, pollMs));
    return () => window.clearInterval(timer);
  }, [connected, pollMs, pointType, startAddr, length, unitId, activeBay]);

  const handleConnect = () => {
    setConnected(true);
    setConnectOpen(false);
    pushTraffic('SYS', '', `TCP Connected to ${ip}:${port} (Modbus TCP/IP). Polling Unit ID ${unitId} (${activeBay?.name || 'Substation Gateway'}).`);
  };

  const handleDisconnect = () => {
    setConnected(false);
    pushTraffic('SYS', '', `Disconnected from ${ip}:${port}.`);
  };

  const handleCommitWrite = () => {
    if (!writeModal) return;
    const { addr, isCoil } = writeModal;
    if (isCoil) {
      const boolVal = writeInputVal === '1' || writeInputVal.toLowerCase() === 'true' || writeInputVal.toLowerCase() === 'on';
      setWrittenCoils((prev) => ({ ...prev, [addr]: boolVal }));
      if (addr === 1 && activeBay) {
        commandBreaker(activeBay.id, boolVal ? 'CLOSED' : 'OPEN', 'SCADA_SBO');
      }
      const valHex = boolVal ? 'FF 00' : '00 00';
      const a0 = addr - 1;
      const hex = `${toHexByte(txId >> 8)} ${toHexByte(txId)} 00 00 00 06 ${toHexByte(unitId)} 05 ${toHexByte(a0 >> 8)} ${toHexByte(a0)} ${valHex}`;
      pushTraffic('TX', hex, `FC05 Write Single Coil ${String(addr).padStart(5, '0')} = ${boolVal ? 'ON (1)' : 'OFF (0)'}`);
      pushTraffic('RX', hex, `FC05 Write Confirmed (Unit ${unitId})`);
    } else {
      const numVal = Math.max(0, Math.min(65535, Number(writeInputVal) || 0));
      setWrittenRegs((prev) => ({ ...prev, [addr]: numVal }));
      const a0 = addr - 1;
      const hex = `${toHexByte(txId >> 8)} ${toHexByte(txId)} 00 00 00 06 ${toHexByte(unitId)} 06 ${toHexByte(a0 >> 8)} ${toHexByte(a0)} ${toHexByte(numVal >> 8)} ${toHexByte(numVal)}`;
      pushTraffic('TX', hex, `FC06 Write Single Register ${40000 + addr} = ${numVal} (0x${toHexWord(numVal)})`);
      pushTraffic('RX', hex, `FC06 Write Confirmed (Unit ${unitId})`);
    }
    setWriteModal(null);
  };

  return (
    <div
      className="modscan-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f0f0] text-[#000000] border border-[#707070] shadow-lg overflow-hidden"
      style={{ colorScheme: 'light' }}
    >
      {/* Ultra-high-specificity light Win32 overrides beating luminous-cyan-theme.css */}
      <style>{`
        #root .modscan-app,
        .modscan-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f0f0f0 !important;
          color: #000000 !important;
          color-scheme: light !important;
        }
        #root .modscan-app *::-webkit-scrollbar { width: 11px !important; height: 11px !important; }
        #root .modscan-app *::-webkit-scrollbar-track { background: #f0f0f0 !important; }
        #root .modscan-app *::-webkit-scrollbar-thumb { background: #c1c1c1 !important; border: 2px solid #f0f0f0 !important; border-radius: 0 !important; }
        #root .modscan-app p,
        #root .modscan-app span,
        #root .modscan-app label,
        #root .modscan-app div {
          text-shadow: none !important;
        }
        #root .modscan-app button {
          color: #000000 !important;
          font-family: "Segoe UI", Tahoma, sans-serif !important;
          box-shadow: none !important;
        }
        #root .modscan-app input,
        #root .sas-workspace-main .modscan-app input,
        #root .modscan-app select,
        #root .sas-workspace-main .modscan-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #7a7a7a !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          color-scheme: light !important;
        }
        #root .modscan-app select option {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        #root .modscan-app .ms-menu-btn {
          padding: 2px 8px !important;
          font-size: 12px !important;
          background: transparent !important;
          border: 1px solid transparent !important;
          color: #000000 !important;
        }
        #root .modscan-app .ms-menu-btn:hover,
        #root .modscan-app .ms-menu-btn.active {
          background: #cce8ff !important;
          border-color: #99d1ff !important;
        }
        #root .modscan-app .ms-drop {
          background: #f2f2f2 !important;
          border: 1px solid #888888 !important;
          box-shadow: 2px 2px 6px rgba(0,0,0,0.22) !important;
          min-width: 210px;
          z-index: 60;
        }
        #root .modscan-app .ms-drop-item {
          width: 100%;
          text-align: left;
          padding: 4px 12px !important;
          font-size: 12px !important;
          background: transparent !important;
          border: none !important;
          color: #000000 !important;
        }
        #root .modscan-app .ms-drop-item:hover:not(:disabled) {
          background: #91c9f7 !important;
        }
        #root .modscan-app .ms-drop-item:disabled {
          color: #888888 !important;
        }
        #root .modscan-app .ms-win-btn {
          background: #e1e1e1 !important;
          border: 1px solid #adadad !important;
          color: #000000 !important;
          font-size: 11.5px !important;
          padding: 2px 9px !important;
          height: 23px;
          cursor: pointer;
        }
        #root .modscan-app .ms-win-btn:hover:not(:disabled) {
          background: #e5f1fb !important;
          border-color: #0078d7 !important;
        }
        #root .modscan-app .ms-win-btn.active {
          background: #cce4f7 !important;
          border-color: #005499 !important;
          font-weight: 600 !important;
        }
        #root .modscan-app .ms-win-btn:disabled {
          opacity: 0.55;
          cursor: default;
        }
        #root .sas-app-shell .sas-workspace-main .modscan-app table,
        #root .modscan-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          color: #000000 !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .modscan-app table thead th,
        #root .modscan-app table thead th {
          background: #f4f4f4 !important;
          color: #111111 !important;
          font-weight: 600 !important;
          text-align: left;
          padding: 3px 8px !important;
          border-bottom: 1px solid #b8b8b8 !important;
          border-right: 1px solid #dcdcdc !important;
          position: sticky;
          top: 0;
          z-index: 4;
          font-size: 11.5px !important;
          text-transform: none !important;
        }
        #root .sas-app-shell .sas-workspace-main .modscan-app table tbody td,
        #root .modscan-app table tbody td {
          padding: 2px 8px !important;
          border-bottom: 1px solid #eeeeee !important;
          border-right: 1px solid #f0f0f0 !important;
          color: #000000 !important;
          background-color: #ffffff !important;
          font-family: Consolas, "Courier New", monospace !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .modscan-app table tbody tr.ms-row:hover td,
        #root .modscan-app table tbody tr.ms-row:hover td {
          background-color: #e5f3ff !important;
        }
      `}</style>

      {/* 1. WINDOWS TITLE BAR */}
      <div className="h-[27px] bg-[#ffffff] border-b border-[#dcdcdc] px-2 flex items-center justify-between shrink-0 text-[12px]">
        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center justify-center bg-[#0369a1] text-white font-bold text-[9.5px] px-1.5 py-[1px] rounded-[2px]">
            M64
          </span>
          <span>
            ModScan64 - [ModSca1{connected ? ` · ${ip}:${port} (Unit ${unitId})` : ' · Disconnected'}]
          </span>
        </div>
        <div className="flex items-center gap-3 text-[#333333] pr-1">
          <span>─</span>
          <span>□</span>
          <span>✕</span>
        </div>
      </div>

      {/* 2. MENU BAR */}
      <div
        className="h-[23px] bg-[#ffffff] border-b border-[#dcdcdc] px-1 flex items-center gap-0.5 shrink-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative">
          <button
            type="button"
            className={`ms-menu-btn ${openMenu === 'Connection' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'Connection' ? null : 'Connection')}
          >
            Connection
          </button>
          {openMenu === 'Connection' && (
            <div className="ms-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="ms-drop-item"
                onClick={() => {
                  setOpenMenu(null);
                  setConnectOpen(true);
                }}
              >
                Connect...
              </button>
              <button
                type="button"
                className="ms-drop-item"
                disabled={!connected}
                onClick={() => {
                  setOpenMenu(null);
                  handleDisconnect();
                }}
              >
                Disconnect
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className={`ms-menu-btn ${openMenu === 'Setup' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'Setup' ? null : 'Setup')}
          >
            Setup
          </button>
          {openMenu === 'Setup' && (
            <div className="ms-drop absolute left-0 top-full py-0.5">
              {(['DEC', 'HEX', 'BIN', 'INT', 'FLOAT'] as DisplayMode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  className="ms-drop-item"
                  onClick={() => {
                    setDisplayMode(m);
                    setOpenMenu(null);
                  }}
                >
                  {displayMode === m ? `✓ Display: ${m}` : `Display: ${m}`}
                </button>
              ))}
              <div className="my-0.5 border-t border-[#d4d4d4]" />
              <button
                type="button"
                className="ms-drop-item"
                onClick={() => {
                  setShowTraffic((v) => !v);
                  setOpenMenu(null);
                }}
              >
                {showTraffic ? '✓ Show Traffic' : 'Show Traffic'}
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button
            type="button"
            className={`ms-menu-btn ${openMenu === 'View' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'View' ? null : 'View')}
          >
            View
          </button>
          {openMenu === 'View' && (
            <div className="ms-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="ms-drop-item"
                onClick={() => {
                  setPolls(0);
                  setValidResponses(0);
                  setTraffic([]);
                  setOpenMenu(null);
                }}
              >
                Reset Poll Counters &amp; Traffic
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. TOOLBAR */}
      <div className="bg-[#f0f0f0] border-b border-[#b0b0b0] px-2 py-1 flex flex-wrap items-center gap-1.5 shrink-0">
        <button type="button" className="ms-win-btn" onClick={() => setConnectOpen(true)}>
          Connect...
        </button>
        <button type="button" className="ms-win-btn" disabled={!connected} onClick={handleDisconnect}>
          Disconnect
        </button>
        <div className="w-[1px] h-5 bg-[#c0c0c0] mx-1" />
        <span className="text-[11px] font-semibold">Format:</span>
        {(['DEC', 'HEX', 'BIN', 'INT', 'FLOAT'] as DisplayMode[]).map((m) => (
          <button
            key={m}
            type="button"
            className={`ms-win-btn ${displayMode === m ? 'active' : ''}`}
            onClick={() => setDisplayMode(m)}
          >
            {m}
          </button>
        ))}
        <div className="w-[1px] h-5 bg-[#c0c0c0] mx-1" />
        <button
          type="button"
          className={`ms-win-btn ${showTraffic ? 'active' : ''}`}
          onClick={() => setShowTraffic((v) => !v)}
        >
          Show Traffic
        </button>
        <button
          type="button"
          className="ms-win-btn ml-auto"
          onClick={() => {
            setPolls(0);
            setValidResponses(0);
          }}
        >
          Reset Counters
        </button>
      </div>

      {/* 4. CLASSIC MODSCAN64 CONFIGURATION HEADER PANEL */}
      <div className="bg-[#ececec] border-b-2 border-[#a8a8a8] px-3 py-2 grid grid-cols-1 md:grid-cols-3 gap-2.5 text-[12px] shrink-0">
        {/* Address / Length / Device ID */}
        <div className="grid grid-cols-2 gap-1.5 items-center">
          <label className="text-[11.5px]">Address:</label>
          <input
            type="number"
            min={1}
            max={9999}
            value={startAddr}
            onChange={(e) => setStartAddr(Math.max(1, Number(e.target.value) || 1))}
            className="h-[22px] px-1.5 text-[12px] font-mono"
          />
          <label className="text-[11.5px]">Length:</label>
          <input
            type="number"
            min={1}
            max={125}
            value={length}
            onChange={(e) => setLength(Math.max(1, Math.min(125, Number(e.target.value) || 20)))}
            className="h-[22px] px-1.5 text-[12px] font-mono"
          />
          <label className="text-[11.5px]">Device Id (Unit):</label>
          <input
            type="number"
            min={1}
            max={247}
            value={unitId}
            onChange={(e) => setUnitId(Math.max(1, Math.min(247, Number(e.target.value) || 1)))}
            className="h-[22px] px-1.5 text-[12px] font-mono"
          />
        </div>

        {/* MODBUS Point Type & Poll Rate */}
        <div className="flex flex-col justify-center gap-1.5">
          <label className="text-[11.5px] font-semibold">MODBUS Point Type:</label>
          <select
            value={pointType}
            onChange={(e) => setPointType(e.target.value as PointType)}
            className="h-[24px] px-1.5 text-[12px]"
          >
            {(Object.keys(POINT_META) as PointType[]).map((k) => (
              <option key={k} value={k}>
                {POINT_META[k].label}
              </option>
            ))}
          </select>
          <div className="flex items-center gap-2 text-[11.5px]">
            <label>Poll Rate (ms):</label>
            <select
              value={pollMs}
              onChange={(e) => setPollMs(Number(e.target.value))}
              className="h-[22px] px-1.5 text-[11.5px]"
            >
              <option value={500}>500 ms</option>
              <option value={1000}>1000 ms</option>
              <option value={2000}>2000 ms</option>
            </select>
          </div>
        </div>

        {/* Live Poll Counters & Status */}
        <div className="flex flex-col justify-center gap-1 bg-[#ffffff] border border-[#b8b8b8] px-2.5 py-1.5 font-mono text-[11.5px]">
          <div className="flex justify-between">
            <span>Number of Polls:</span>
            <strong>{polls}</strong>
          </div>
          <div className="flex justify-between">
            <span>Valid Slave Responses:</span>
            <strong>{validResponses}</strong>
          </div>
          <div
            className="mt-0.5 pt-1 border-t border-[#e5e5e5] font-bold text-[11.5px]"
            style={{ color: connected ? '#15803d' : '#b91c1c' }}
          >
            {connected
              ? `CONNECTED: ${ip}:${port} (${activeBay?.name || `Unit ${unitId}`})`
              : '** Device NOT CONNECTED! **'}
          </div>
        </div>
      </div>

      {/* 5. MAIN DATA TABLE + OPTIONAL HEX TRAFFIC SPLIT */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#ffffff]">
        <div className="flex-1 overflow-auto">
          <table>
            <thead>
              <tr>
                <th style={{ width: '14%' }}>Register / Addr</th>
                <th style={{ width: '24%' }}>Value ({displayMode})</th>
                <th style={{ width: '48%' }}>Substation Signal Mapping ({activeBay?.name || `Unit ${unitId}`})</th>
                <th style={{ width: '14%' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {pointRows.map((row) => {
                const canWrite = connected && POINT_META[pointType].writable;
                return (
                  <tr
                    key={row.addr}
                    className="ms-row cursor-pointer"
                    onDoubleClick={() => {
                      if (!canWrite) return;
                      setWriteModal({
                        addr: row.addr,
                        currentVal: row.raw,
                        label: `${row.displayAddr} — ${row.desc}`,
                        isCoil: pointType === '01_COIL',
                      });
                      setWriteInputVal(String(row.raw));
                    }}
                  >
                    <td className="font-semibold">{row.displayAddr}:</td>
                    <td style={{ color: connected ? '#0f172a' : '#888888' }}>
                      {connected ? row.formatted : '<----->'}
                    </td>
                    <td style={{ fontFamily: '"Segoe UI", sans-serif', color: '#334155' }}>{row.desc}</td>
                    <td>
                      {canWrite ? (
                        <button
                          type="button"
                          className="ms-win-btn !h-[19px] !px-2 !text-[10.5px]"
                          onClick={() => {
                            setWriteModal({
                              addr: row.addr,
                              currentVal: row.raw,
                              label: `${row.displayAddr} — ${row.desc}`,
                              isCoil: pointType === '01_COIL',
                            });
                            setWriteInputVal(String(row.raw));
                          }}
                        >
                          Write
                        </button>
                      ) : (
                        <span className="text-[10.5px] text-[#64748b]" style={{ fontFamily: '"Segoe UI", sans-serif' }}>
                          {POINT_META[pointType].writable ? 'Connect first' : 'Read-Only'}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* BOTTOM TRAFFIC PANE */}
        {showTraffic && (
          <div className="h-[150px] shrink-0 bg-[#f7f7f7] border-t-[3px] border-[#a0a0a0] flex flex-col overflow-hidden">
            <div className="bg-[#ececec] border-b border-[#cccccc] px-2 py-0.5 text-[11px] font-semibold flex justify-between">
              <span>Modbus TCP Traffic (MBAP Header + PDU Hex)</span>
              <span>{traffic.length} frame(s)</span>
            </div>
            <div ref={trafficRef} className="flex-1 overflow-auto px-2 py-1 font-mono text-[11px] leading-[1.35]">
              {traffic.map((f) => (
                <div
                  key={f.id}
                  style={{
                    color: f.dir === 'TX' ? '#1d4ed8' : f.dir === 'RX' ? '#15803d' : '#475569',
                  }}
                >
                  {`${f.time} [${f.dir}] ${f.hex ? f.hex + '  |  ' : ''}${f.note}`}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* CONNECT DIALOG */}
      {connectOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[440px] bg-[#f0f0f0] border border-[#555555] shadow-xl text-[12px]">
            <div className="h-[26px] bg-[#ffffff] border-b border-[#cccccc] px-2.5 flex items-center justify-between">
              <span>Connection Details (Remote modbusTCP Server)</span>
              <button type="button" className="ms-win-btn !h-[20px] !px-1.5" onClick={() => setConnectOpen(false)}>
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label>IP Address:</label>
                <input
                  type="text"
                  value={ip}
                  onChange={(e) => setIp(e.target.value)}
                  className="col-span-2 h-[22px] px-1.5 font-mono"
                />
                <label>Service Port:</label>
                <input
                  type="number"
                  value={port}
                  onChange={(e) => setPort(Number(e.target.value) || 502)}
                  className="col-span-2 h-[22px] px-1.5 font-mono"
                />
                <label>Bay / Unit ID:</label>
                <select
                  value={unitId}
                  onChange={(e) => setUnitId(Number(e.target.value))}
                  className="col-span-2 h-[22px] px-1.5"
                >
                  {bays.map((b, idx) => (
                    <option key={b.id} value={idx + 1}>
                      {`Unit ${idx + 1} — ${b.name} (${b.voltageKv} kV)`}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="ms-win-btn min-w-[74px]" onClick={handleConnect}>
                  OK
                </button>
                <button type="button" className="ms-win-btn min-w-[74px]" onClick={() => setConnectOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WRITE SINGLE REGISTER / COIL DIALOG */}
      {writeModal && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[380px] bg-[#f0f0f0] border border-[#555555] shadow-xl text-[12px]">
            <div className="h-[26px] bg-[#ffffff] border-b border-[#cccccc] px-2.5 flex items-center justify-between">
              <span>{writeModal.isCoil ? 'Force Single Coil (FC05)' : 'Write Single Register (FC06)'}</span>
              <button type="button" className="ms-win-btn !h-[20px] !px-1.5" onClick={() => setWriteModal(null)}>
                ✕
              </button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="font-semibold text-[#0f3d6e]">{writeModal.label}</div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label>New Value:</label>
                {writeModal.isCoil ? (
                  <select
                    value={writeInputVal}
                    onChange={(e) => setWriteInputVal(e.target.value)}
                    className="col-span-2 h-[24px] px-1.5"
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
                    className="col-span-2 h-[24px] px-1.5 font-mono"
                  />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="ms-win-btn min-w-[74px]" onClick={handleCommitWrite}>
                  Update
                </button>
                <button type="button" className="ms-win-btn min-w-[74px]" onClick={() => setWriteModal(null)}>
                  Cancel
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
