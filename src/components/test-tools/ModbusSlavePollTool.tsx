import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// Witte-Style Modbus Slave / Modbus Poll & Modpoll CLI Workbench
// Features:
//  - Classic Desktop Menu Bar (File, Connection, Setup, Display, Functions, View)
//  - 4 Modes: Split (Slave + Poll Live Loopback), Modbus Slave, Modbus Poll, Modpoll CLI
//  - Exception Injection (01/02/03/04/06/TIMEOUT) & Simulation Waves (Live Bay/Auto-Inc/Random)
//  - Display Formats: Unsigned, Signed, Hex, Binary, Float32 (ABCD)
//  - Inline FC05/FC06 Write-back to Live Substation Store + CSV Snapshot Export
// ============================================================================

type ActiveView = 'SPLIT' | 'SLAVE' | 'POLL' | 'CLI';
type BankType = 'COILS' | 'DISCRETE' | 'HOLDING' | 'INPUT';
type DisplayFmt = 'UNSIGNED' | 'SIGNED' | 'HEX' | 'BIN' | 'FLOAT32';
type ExceptionCode = 'NONE' | '01' | '02' | '03' | '04' | '06' | 'TIMEOUT';
type SimWave = 'LIVE_BAY' | 'STATIC' | 'AUTO_INC' | 'RANDOM';

interface CliLine {
  id: number;
  text: string;
  kind?: 'CMD' | 'OUT' | 'ERR' | 'OK';
}

interface PersistedState {
  activeView: ActiveView;
  slaveRunning: boolean;
  slaveId: number;
  listenIp: string;
  listenPort: number;
  bank: BankType;
  displayFmt: DisplayFmt;
  exceptionCode: ExceptionCode;
  simWave: SimWave;
  pollRunning: boolean;
  pollFc: BankType;
  pollStart: number;
  pollQty: number;
  pollRateMs: number;
  customHolding: Record<number, number>;
  customCoils: Record<number, boolean>;
}

const STORAGE_KEY = 'sas_modbus_slave_poll_pro_v2';
let memCache: PersistedState | null = null;

function loadInit(): Partial<PersistedState> {
  if (memCache) return memCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedState;
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

function saveState(st: PersistedState) {
  memCache = st;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  } catch {
    // Ignore quota errors
  }
}

const EXCEPTION_DESC: Record<ExceptionCode, string> = {
  NONE: 'None (Normal Response)',
  '01': '01 — Illegal Function',
  '02': '02 — Illegal Data Address',
  '03': '03 — Illegal Data Value',
  '04': '04 — Slave Device Failure',
  '06': '06 — Slave Device Busy',
  TIMEOUT: 'Timeout — Drop Packet (No Reply)',
};

const BANK_META: Record<BankType, { fc: number; label: string; prefix: number; writable: boolean }> = {
  COILS: { fc: 1, label: '01: Read Coils (0xxxx)', prefix: 0, writable: true },
  DISCRETE: { fc: 2, label: '02: Read Discrete Inputs (1xxxx)', prefix: 10000, writable: false },
  HOLDING: { fc: 3, label: '03: Read Holding Registers (4xxxx)', prefix: 40000, writable: true },
  INPUT: { fc: 4, label: '04: Read Input Registers (3xxxx)', prefix: 30000, writable: false },
};

function toHex4(n: number): string {
  return (n & 0xffff).toString(16).toUpperCase().padStart(4, '0');
}

function regsToFloat32(hi: number, lo: number): number {
  const buf = new ArrayBuffer(4);
  const dv = new DataView(buf);
  dv.setUint16(0, hi & 0xffff, false);
  dv.setUint16(2, lo & 0xffff, false);
  return dv.getFloat32(0, false);
}

function floatToRegs(val: number): [number, number] {
  const buf = new ArrayBuffer(4);
  const dv = new DataView(buf);
  dv.setFloat32(0, val, false);
  return [dv.getUint16(0, false), dv.getUint16(2, false)];
}

export const ModbusSlavePollTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { bays, commandBreaker } = useSubstationStore();

  const [activeView, setActiveView] = useState<ActiveView>(() => init.activeView || 'SPLIT');
  const [slaveRunning, setSlaveRunning] = useState<boolean>(() => init.slaveRunning ?? true);
  const [slaveId, setSlaveId] = useState<number>(() => init.slaveId || 1);
  const [listenIp, setListenIp] = useState<string>(() => init.listenIp || '10.132.30.200');
  const [listenPort, setListenPort] = useState<number>(() => init.listenPort || 502);
  const [bank, setBank] = useState<BankType>(() => init.bank || 'HOLDING');
  const [displayFmt, setDisplayFmt] = useState<DisplayFmt>(() => init.displayFmt || 'UNSIGNED');
  const [exceptionCode, setExceptionCode] = useState<ExceptionCode>(() => init.exceptionCode || 'NONE');
  const [simWave, setSimWave] = useState<SimWave>(() => init.simWave || 'LIVE_BAY');

  const [pollRunning, setPollRunning] = useState<boolean>(() => Boolean(init.pollRunning));
  const [pollFc, setPollFc] = useState<BankType>(() => init.pollFc || 'HOLDING');
  const [pollStart, setPollStart] = useState<number>(() => init.pollStart || 1);
  const [pollQty, setPollQty] = useState<number>(() => init.pollQty || 12);
  const [pollRateMs, setPollRateMs] = useState<number>(() => init.pollRateMs || 1000);

  const [customHolding, setCustomHolding] = useState<Record<number, number>>(() => init.customHolding || {});
  const [customCoils, setCustomCoils] = useState<Record<number, boolean>>(() => init.customCoils || {});

  const [txCount, setTxCount] = useState<number>(0);
  const [errCount, setErrCount] = useState<number>(0);
  const [lastPollStatus, setLastPollStatus] = useState<string>('Ready');
  const [tick, setTick] = useState<number>(0);
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const [editModal, setEditModal] = useState<{ addr: number; current: number; isCoil: boolean; label: string } | null>(null);
  const [editInput, setEditInput] = useState<string>('0');

  const [cliInput, setCliInput] = useState<string>('modpoll -m tcp -a 1 -r 1 -c 10 -t 4 10.132.30.200');
  const [cliLines, setCliLines] = useState<CliLine[]>([
    { id: 1, kind: 'OK', text: 'modpoll 3.10 — FieldTalk(tm) Modbus(R) Master Simulator (Integrated CLI)' },
    { id: 2, kind: 'OUT', text: 'Type a modpoll command below or click a preset button. Type "help" for syntax.' },
  ]);
  const cliSeqRef = useRef<number>(3);
  const cliScrollRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    saveState({
      activeView,
      slaveRunning,
      slaveId,
      listenIp,
      listenPort,
      bank,
      displayFmt,
      exceptionCode,
      simWave,
      pollRunning,
      pollFc,
      pollStart,
      pollQty,
      pollRateMs,
      customHolding,
      customCoils,
    });
  }, [activeView, slaveRunning, slaveId, listenIp, listenPort, bank, displayFmt, exceptionCode, simWave, pollRunning, pollFc, pollStart, pollQty, pollRateMs, customHolding, customCoils]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (cliScrollRef.current) {
      cliScrollRef.current.scrollTop = cliScrollRef.current.scrollHeight;
    }
  }, [cliLines.length]);

  const activeBay = useMemo(() => {
    const idx = Math.max(0, Math.min(bays.length - 1, slaveId - 1));
    return bays[idx] || bays[0];
  }, [bays, slaveId]);

  // Cyclic simulation & polling timer
  useEffect(() => {
    if (!pollRunning && simWave !== 'AUTO_INC' && simWave !== 'RANDOM') return;
    const timer = window.setInterval(() => {
      setTick((t) => t + 1);
      if (pollRunning) {
        setTxCount((c) => c + 1);
        if (!slaveRunning) {
          setErrCount((e) => e + 1);
          setLastPollStatus('Connection Refused (Slave Stopped)');
        } else if (exceptionCode !== 'NONE') {
          setErrCount((e) => e + 1);
          setLastPollStatus(`Exception ${EXCEPTION_DESC[exceptionCode]}`);
        } else {
          setLastPollStatus(`OK — Unit ${slaveId} (${BANK_META[pollFc].label})`);
        }
      }
    }, Math.max(300, pollRateMs));
    return () => window.clearInterval(timer);
  }, [pollRunning, pollRateMs, slaveRunning, exceptionCode, slaveId, pollFc, simWave]);

  // Compute register/coil value for a given bank and 1-based address
  const computePoint = (targetBank: BankType, addr: number): { raw: number; desc: string } => {
    if (targetBank === 'COILS') {
      if (customCoils[addr] !== undefined) return { raw: customCoils[addr] ? 1 : 0, desc: addr === 1 ? 'CB Close/Open Coil' : `Coil ${addr} (Forced)` };
      if (addr === 1) return { raw: activeBay?.breakerState === 'CLOSED' ? 1 : 0, desc: `CB Command Coil (${activeBay?.breakerId || 'CB'})` };
      if (addr === 2) return { raw: activeBay?.localRemote === 'REMOTE' ? 1 : 0, desc: '43LR Remote Enable' };
      if (addr === 3) return { raw: activeBay?.protectionTripActive ? 1 : 0, desc: '86 Trip Lockout Flag' };
      return { raw: 0, desc: `Spare Coil ${addr}` };
    }
    if (targetBank === 'DISCRETE') {
      if (addr === 1) return { raw: activeBay?.breakerState === 'CLOSED' ? 1 : 0, desc: 'CB Closed (52a)' };
      if (addr === 2) return { raw: activeBay?.breakerState === 'OPEN' ? 1 : 0, desc: 'CB Open (52b)' };
      if (addr === 3) return { raw: activeBay?.protectionTripActive ? 1 : 0, desc: '86 Master Trip' };
      if (addr === 4) return { raw: activeBay?.interlockPermissive ? 1 : 0, desc: 'CILO Permissive' };
      if (addr === 5) return { raw: activeBay?.springCharged ? 1 : 0, desc: 'Spring Charged' };
      if (addr === 6) return { raw: activeBay?.sf6PressureNormal ? 1 : 0, desc: 'SF6 Pressure Normal' };
      return { raw: 0, desc: `Discrete Input ${addr}` };
    }

    if (targetBank === 'HOLDING' && customHolding[addr] !== undefined) {
      return { raw: customHolding[addr] & 0xffff, desc: `Holding Reg ${addr} (Edited)` };
    }

    if (simWave === 'AUTO_INC') {
      return { raw: (addr * 100 + tick * 5) & 0xffff, desc: `Auto-Incrementing Reg ${addr}` };
    }
    if (simWave === 'RANDOM') {
      const pseudo = Math.abs(Math.sin(tick * 1.7 + addr * 3.1) * 4000);
      return { raw: Math.round(pseudo) & 0xffff, desc: `Simulated Jitter Reg ${addr}` };
    }

    const vKv = activeBay ? (activeBay.voltageAbKv ?? activeBay.voltageKv ?? 33) : 132;
    const iA = activeBay ? (activeBay.currentA ?? 120) : 150;
    const pMw = activeBay ? (activeBay.activePowerMw ?? 18) : 25;
    const hz = activeBay ? (activeBay.frequencyHz ?? 50) : 50;
    const [vHi, vLo] = floatToRegs(vKv);
    const [iHi, iLo] = floatToRegs(iA);

    switch (addr) {
      case 1: return { raw: Math.round(vKv * 100) & 0xffff, desc: `Voltage AB (${vKv.toFixed(2)} kV)` };
      case 2: return { raw: Math.round(iA * 10) & 0xffff, desc: `Phase A Current (${iA.toFixed(1)} A)` };
      case 3: return { raw: Math.round(pMw * 100) & 0xffff, desc: `Active Power (${pMw.toFixed(2)} MW)` };
      case 4: return { raw: Math.round(hz * 100) & 0xffff, desc: `Frequency (${hz.toFixed(2)} Hz)` };
      case 5: return { raw: activeBay?.breakerState === 'CLOSED' ? 2 : 1, desc: 'CB State (1=OPEN, 2=CLOSED)' };
      case 6: return { raw: activeBay?.opCounter ?? 120, desc: 'Breaker Op Counter' };
      case 7: return { raw: vHi, desc: 'Float32 Voltage kV (MSW)' };
      case 8: return { raw: vLo, desc: 'Float32 Voltage kV (LSW)' };
      case 9: return { raw: iHi, desc: 'Float32 Current A (MSW)' };
      case 10: return { raw: iLo, desc: 'Float32 Current A (LSW)' };
      default: return { raw: 0, desc: `Spare Register ${addr}` };
    }
  };

  const formatVal = (targetBank: BankType, addr: number, raw: number, idx: number, total: number): string => {
    if (targetBank === 'COILS' || targetBank === 'DISCRETE') {
      return raw ? '1 (ON)' : '0 (OFF)';
    }
    if (displayFmt === 'SIGNED') {
      const s = raw > 32767 ? raw - 65536 : raw;
      return String(s);
    }
    if (displayFmt === 'HEX') return `0x${toHex4(raw)}`;
    if (displayFmt === 'BIN') return raw.toString(2).padStart(16, '0');
    if (displayFmt === 'FLOAT32') {
      if (idx % 2 === 0 && idx + 1 < total) {
        const nextRaw = computePoint(targetBank, addr + 1).raw;
        const f = regsToFloat32(raw, nextRaw);
        return Number.isFinite(f) ? f.toFixed(3) : 'NaN';
      }
      return `LSW 0x${toHex4(raw)}`;
    }
    return String(raw);
  };

  const buildTableRows = (targetBank: BankType, start: number, qty: number) => {
    const safeStart = Math.max(1, Math.min(9999, start));
    const safeQty = Math.max(1, Math.min(64, qty));
    const meta = BANK_META[targetBank];
    const out = [];
    for (let i = 0; i < safeQty; i++) {
      const addr = safeStart + i;
      const { raw, desc } = computePoint(targetBank, addr);
      out.push({
        addr,
        displayAddr: String(meta.prefix + addr).padStart(5, '0'),
        raw,
        formatted: formatVal(targetBank, addr, raw, i, safeQty),
        desc,
      });
    }
    return out;
  };

  const slaveRows = useMemo(() => buildTableRows(bank, 1, 12), [bank, activeBay, customHolding, customCoils, simWave, tick, displayFmt]);
  const pollRows = useMemo(() => buildTableRows(pollFc, pollStart, pollQty), [pollFc, pollStart, pollQty, activeBay, customHolding, customCoils, simWave, tick, displayFmt]);

  const handleCommitEdit = () => {
    if (!editModal) return;
    if (editModal.isCoil) {
      const bVal = editInput === '1' || editInput.toLowerCase() === 'true' || editInput.toLowerCase() === 'on';
      setCustomCoils((prev) => ({ ...prev, [editModal.addr]: bVal }));
      if (editModal.addr === 1 && activeBay) {
        commandBreaker(activeBay.id, bVal ? 'CLOSED' : 'OPEN', 'SCADA_SBO');
      }
    } else {
      const nVal = Math.max(0, Math.min(65535, Math.round(Number(editInput) || 0)));
      setCustomHolding((prev) => ({ ...prev, [editModal.addr]: nVal }));
    }
    setEditModal(null);
  };

  const handleExportCsv = () => {
    const rows = [
      ['Address', 'Formatted Value', 'Raw Unsigned', 'Hex', 'Description'],
      ...pollRows.map((r) => [r.displayAddr, r.formatted, String(r.raw), `0x${toHex4(r.raw)}`, r.desc]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `modbus_${pollFc.toLowerCase()}_unit${slaveId}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Interactive Modpoll CLI Parser
  const runCliCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;
    const add = (text: string, kind: CliLine['kind'] = 'OUT') => {
      cliSeqRef.current += 1;
      setCliLines((prev) => [...prev.slice(-140), { id: cliSeqRef.current, text, kind }]);
    };
    add(`C:\\SAS\\Tools> ${cmd}`, 'CMD');
    const low = cmd.toLowerCase();
    if (low === 'clear' || low === 'cls') {
      setCliLines([]);
      return;
    }
    if (low === 'help' || low === '?') {
      add('Usage: modpoll -m tcp -a <unitId> -r <startRef> -c <count> -t <0|1|3|4> <hostIp>', 'OK');
      add('  -t 0 : Coils (FC01)   -t 1 : Discrete Inputs (FC02)', 'OUT');
      add('  -t 3 : Input Regs (FC04)   -t 4 : Holding Regs (FC03)', 'OUT');
      add('Example: modpoll -m tcp -a 1 -r 1 -c 8 -t 4 10.132.30.200', 'OUT');
      return;
    }
    if (!low.startsWith('modpoll')) {
      add(`'${cmd.split(' ')[0]}' is not recognized. Type "help" or start with "modpoll".`, 'ERR');
      return;
    }
    if (!slaveRunning) {
      add(`TCP connect to ${listenIp}:${listenPort} failed: Connection refused (Start Modbus Slave first).`, 'ERR');
      return;
    }
    if (exceptionCode !== 'NONE') {
      add(`Modbus Exception: ${EXCEPTION_DESC[exceptionCode]}`, 'ERR');
      return;
    }

    const argVal = (flag: string, def: number) => {
      const m = cmd.match(new RegExp(`${flag}\\s+(\\d+)`));
      return m ? Number(m[1]) : def;
    };
    const rStart = argVal('-r', 1);
    const cQty = Math.min(20, Math.max(1, argVal('-c', 8)));
    const tCode = argVal('-t', 4);
    const targetBank: BankType = tCode === 0 ? 'COILS' : tCode === 1 ? 'DISCRETE' : tCode === 3 ? 'INPUT' : 'HOLDING';
    const rows = buildTableRows(targetBank, rStart, cQty);
    add(`Protocol configuration: MODBUS/TCP, FC${BANK_META[targetBank].fc} (${BANK_META[targetBank].label})`, 'OK');
    add(`Polling slave ${argVal('-a', slaveId)} at ${listenIp}:${listenPort}...`, 'OUT');
    rows.forEach((r) => {
      add(`[${r.displayAddr}]: ${r.formatted.padEnd(14)} (0x${toHex4(r.raw)})  -- ${r.desc}`, 'OUT');
    });
  };

  return (
    <div
      className="msp-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f0f0] text-[#111827] border border-[#707070] shadow-lg overflow-hidden select-none"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .msp-app, .msp-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f0f0f0 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .msp-app * { text-shadow: none !important; }
        #root .msp-app input:not(.cli-in), #root .msp-app select {
          background: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 2px !important;
          font-size: 11.5px !important;
          color-scheme: light !important;
        }
        #root .msp-app .msp-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 9px !important;
          font-size: 11.5px !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .msp-app .msp-btn:hover:not(:disabled) { background: #e0f2fe !important; border-color: #0284c7 !important; }
        #root .msp-app .msp-btn-primary {
          background: #1d4ed8 !important;
          color: #ffffff !important;
          border: 1px solid #1e40af !important;
          padding: 3px 10px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .msp-app .msp-menu-btn {
          background: transparent !important;
          color: #111827 !important;
          border: 1px solid transparent !important;
          padding: 1px 8px !important;
          font-size: 11.5px !important;
          cursor: pointer;
        }
        #root .msp-app .msp-menu-btn:hover, #root .msp-app .msp-menu-btn.active {
          background: #1d4ed8 !important;
          color: #ffffff !important;
        }
        #root .msp-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          font-size: 11.5px !important;
        }
        #root .msp-app table thead th {
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
        #root .msp-app table tbody td {
          padding: 3px 7px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #f1f5f9 !important;
          color: #111827 !important;
          background: #ffffff !important;
        }
        #root .msp-app table tbody tr:hover td { background: #eff6ff !important; }
      `}</style>

      {/* 1. TITLE BAR */}
      <div className="h-[28px] bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white px-2.5 flex items-center justify-between shrink-0 text-[12px] font-semibold">
        <div className="flex items-center gap-2">
          <span className="bg-[#93c5fd] text-[#1e3a8a] font-black text-[10px] px-1.5 py-[1px] rounded-[2px]">MB</span>
          <span>Modbus Slave / Modbus Poll &amp; Modpoll CLI — Commissioning Simulator</span>
        </div>
        <div className="font-mono text-[11px] flex items-center gap-2">
          <span className="px-2 py-[1px] rounded text-[10px] font-bold" style={{ background: slaveRunning ? '#16a34a' : '#b91c1c' }}>
            {slaveRunning ? 'SLAVE LISTENING' : 'SLAVE STOPPED'}
          </span>
          <span>{`${listenIp}:${listenPort} · Unit ${slaveId}`}</span>
        </div>
      </div>

      {/* 2. CLASSIC MENU BAR */}
      <div className="h-[22px] bg-[#f1f5f9] border-b border-[#cbd5e1] px-1.5 flex items-center gap-1 shrink-0 relative z-30" onClick={(e) => e.stopPropagation()}>
        {(
          [
            ['File', [
              { label: 'Export Poll Snapshot (.csv)', action: handleExportCsv },
              { label: 'Reset Custom Written Values', action: () => { setCustomHolding({}); setCustomCoils({}); } },
            ]],
            ['Connection', [
              { label: slaveRunning ? 'Stop Modbus Slave' : 'Start Modbus Slave', action: () => setSlaveRunning((v) => !v) },
              { label: pollRunning ? 'Stop Modbus Poll' : 'Start Modbus Poll', action: () => setPollRunning((v) => !v) },
              { label: 'Reset Tx / Err Counters', action: () => { setTxCount(0); setErrCount(0); } },
            ]],
            ['Display', (['UNSIGNED', 'SIGNED', 'HEX', 'BIN', 'FLOAT32'] as DisplayFmt[]).map((fmt) => ({
              label: `${displayFmt === fmt ? '● ' : '   '}${fmt}`,
              action: () => setDisplayFmt(fmt),
            }))],
            ['View', [
              { label: 'Split View (Slave + Poll)', action: () => setActiveView('SPLIT') },
              { label: 'Modbus Slave Only', action: () => setActiveView('SLAVE') },
              { label: 'Modbus Poll Only', action: () => setActiveView('POLL') },
              { label: 'Modpoll CLI Terminal', action: () => setActiveView('CLI') },
            ]],
          ] as Array<[string, Array<{ label: string; action: () => void }>]>
        ).map(([mName, items]) => (
          <div key={mName} className="relative">
            <button
              type="button"
              className={`msp-menu-btn ${openMenu === mName ? 'active' : ''}`}
              onClick={() => setOpenMenu((m) => (m === mName ? null : mName))}
            >
              {mName}
            </button>
            {openMenu === mName && (
              <div className="absolute left-0 top-full w-56 bg-white border border-[#94a3b8] shadow-lg py-0.5 z-40">
                {items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    onClick={() => { setOpenMenu(null); it.action(); }}
                    className="w-full text-left px-3 py-1.5 text-[11.5px] text-[#0f172a] hover:bg-[#dbeafe]"
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. MODE TABS & GLOBAL TOOLBAR */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 shrink-0 text-[11.5px]">
        {(
          [
            ['SPLIT', 'Split (Slave + Poll)'],
            ['SLAVE', 'Modbus Slave'],
            ['POLL', 'Modbus Poll'],
            ['CLI', 'Modpoll CLI'],
          ] as Array<[ActiveView, string]>
        ).map(([vId, lbl]) => (
          <button
            key={vId}
            type="button"
            onClick={() => setActiveView(vId)}
            className={activeView === vId ? 'msp-btn-primary' : 'msp-btn'}
          >
            {lbl}
          </button>
        ))}

        <div className="w-[1px] h-5 bg-[#cbd5e1]" />

        <label className="flex items-center gap-1">
          <span className="font-semibold">Bay / Slave ID:</span>
          <select value={slaveId} onChange={(e) => setSlaveId(Number(e.target.value))} className="h-[24px] px-1.5">
            {bays.map((b, i) => (
              <option key={b.id} value={i + 1}>
                {`ID ${i + 1} — ${b.bayCode}`}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-1">
          <span className="font-semibold">Display:</span>
          <select value={displayFmt} onChange={(e) => setDisplayFmt(e.target.value as DisplayFmt)} className="h-[24px] px-1.5 font-mono">
            <option value="UNSIGNED">Unsigned</option>
            <option value="SIGNED">Signed</option>
            <option value="HEX">Hex</option>
            <option value="BIN">Binary</option>
            <option value="FLOAT32">Float32 (ABCD)</option>
          </select>
        </label>

        <button type="button" className="msp-btn ml-auto" onClick={handleExportCsv}>
          Export CSV
        </button>
      </div>

      {/* 4. MAIN WORKSPACE */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* SLAVE PANE */}
        {(activeView === 'SPLIT' || activeView === 'SLAVE') && (
          <div className={`${activeView === 'SPLIT' ? 'lg:w-1/2 border-b lg:border-b-0 lg:border-r-[3px] border-[#cbd5e1]' : 'w-full'} flex-1 flex flex-col bg-white min-h-0 overflow-hidden`}>
            <div className="bg-[#eff6ff] border-b border-[#bfdbfe] px-2.5 py-1.5 flex flex-wrap items-center gap-2 shrink-0 text-[11px]">
              <span className="font-bold text-[#1e3a8a]">Modbus Slave Simulator</span>
              <button
                type="button"
                className="msp-btn font-semibold"
                onClick={() => setSlaveRunning((v) => !v)}
              >
                {slaveRunning ? '■ Stop Slave' : '▶ Start Slave'}
              </button>
              <select value={bank} onChange={(e) => setBank(e.target.value as BankType)} className="h-[22px] px-1">
                {(Object.keys(BANK_META) as BankType[]).map((bk) => (
                  <option key={bk} value={bk}>{BANK_META[bk].label}</option>
                ))}
              </select>
              <select value={simWave} onChange={(e) => setSimWave(e.target.value as SimWave)} className="h-[22px] px-1">
                <option value="LIVE_BAY">Wave: Live Substation Bay</option>
                <option value="STATIC">Wave: Static</option>
                <option value="AUTO_INC">Wave: Auto-Increment</option>
                <option value="RANDOM">Wave: Random Jitter</option>
              </select>
              <select
                value={exceptionCode}
                onChange={(e) => setExceptionCode(e.target.value as ExceptionCode)}
                className="h-[22px] px-1 font-semibold"
                style={{ color: exceptionCode === 'NONE' ? '#15803d' : '#b91c1c' }}
              >
                {(Object.keys(EXCEPTION_DESC) as ExceptionCode[]).map((ex) => (
                  <option key={ex} value={ex}>Inject: {EXCEPTION_DESC[ex]}</option>
                ))}
              </select>
            </div>

            <div className="flex-1 overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Address</th>
                    <th style={{ width: '24%' }}>Value ({displayFmt})</th>
                    <th style={{ width: '44%' }}>Mapped Signal</th>
                    <th style={{ width: '16%' }}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {slaveRows.map((r) => (
                    <tr key={r.addr}>
                      <td className="font-mono font-bold text-[#1e3a8a]">{r.displayAddr}</td>
                      <td className="font-mono font-semibold">{r.formatted}</td>
                      <td>{r.desc}</td>
                      <td>
                        {BANK_META[bank].writable ? (
                          <button
                            type="button"
                            className="msp-btn !py-0 !px-2 !text-[10.5px]"
                            onClick={() => {
                              setEditModal({ addr: r.addr, current: r.raw, isCoil: bank === 'COILS', label: `${r.displayAddr} — ${r.desc}` });
                              setEditInput(String(r.raw));
                            }}
                          >
                            Edit
                          </button>
                        ) : (
                          <span className="text-[10.5px] text-[#64748b]">RO</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* POLL PANE */}
        {(activeView === 'SPLIT' || activeView === 'POLL') && (
          <div className={`${activeView === 'SPLIT' ? 'lg:w-1/2' : 'w-full'} flex-1 flex flex-col bg-white min-h-0 overflow-hidden`}>
            <div className="bg-[#f0fdf4] border-b border-[#bbf7d0] px-2.5 py-1.5 flex flex-wrap items-center gap-2 shrink-0 text-[11px]">
              <span className="font-bold text-[#166534]">Modbus Poll Master</span>
              <button
                type="button"
                className={pollRunning ? 'msp-btn font-semibold' : 'msp-btn-primary'}
                onClick={() => setPollRunning((v) => !v)}
              >
                {pollRunning ? '■ Stop Poll' : '▶ Start Poll'}
              </button>
              <select value={pollFc} onChange={(e) => setPollFc(e.target.value as BankType)} className="h-[22px] px-1">
                {(Object.keys(BANK_META) as BankType[]).map((bk) => (
                  <option key={bk} value={bk}>{BANK_META[bk].label}</option>
                ))}
              </select>
              <label className="flex items-center gap-1">
                <span>Start:</span>
                <input type="number" min={1} max={9999} value={pollStart} onChange={(e) => setPollStart(Math.max(1, Number(e.target.value) || 1))} className="w-[46px] h-[22px] px-1 font-mono" />
              </label>
              <label className="flex items-center gap-1">
                <span>Qty:</span>
                <input type="number" min={1} max={64} value={pollQty} onChange={(e) => setPollQty(Math.max(1, Math.min(64, Number(e.target.value) || 1)))} className="w-[42px] h-[22px] px-1 font-mono" />
              </label>
              <span className="ml-auto font-mono font-bold">
                Tx: {txCount} | <span style={{ color: errCount > 0 ? '#b91c1c' : '#15803d' }}>Err: {errCount}</span>
              </span>
            </div>

            {(!slaveRunning || exceptionCode !== 'NONE') && (
              <div className="bg-[#fef2f2] border-b border-[#fca5a5] px-2.5 py-1 font-mono text-[11px] font-bold text-[#b91c1c] shrink-0">
                {!slaveRunning ? 'Connection Error: Target Modbus Slave is STOPPED' : `Modbus Exception: ${EXCEPTION_DESC[exceptionCode]}`}
              </div>
            )}

            <div className="flex-1 overflow-auto">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '16%' }}>Address</th>
                    <th style={{ width: '24%' }}>Polled Value</th>
                    <th style={{ width: '44%' }}>Signal Name</th>
                    <th style={{ width: '16%' }}>Write</th>
                  </tr>
                </thead>
                <tbody>
                  {pollRows.map((r) => (
                    <tr key={r.addr}>
                      <td className="font-mono font-bold text-[#166534]">{r.displayAddr}</td>
                      <td className="font-mono font-semibold">
                        {!slaveRunning || exceptionCode !== 'NONE' ? '---' : r.formatted}
                      </td>
                      <td>{r.desc}</td>
                      <td>
                        {BANK_META[pollFc].writable && slaveRunning && exceptionCode === 'NONE' ? (
                          <button
                            type="button"
                            className="msp-btn !py-0 !px-2 !text-[10.5px]"
                            onClick={() => {
                              setEditModal({ addr: r.addr, current: r.raw, isCoil: pollFc === 'COILS', label: `${r.displayAddr} — ${r.desc}` });
                              setEditInput(String(r.raw));
                            }}
                          >
                            Write
                          </button>
                        ) : (
                          <span className="text-[10.5px] text-[#64748b]">{BANK_META[pollFc].writable ? 'Blocked' : 'RO'}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* MODPOLL CLI PANE */}
        {activeView === 'CLI' && (
          <div className="w-full flex-1 flex flex-col bg-[#0b1220] text-[#e2e8f0] overflow-hidden">
            <div className="bg-[#1e293b] border-b border-[#334155] px-2.5 py-1.5 flex flex-wrap items-center gap-1.5 shrink-0 text-[11px]">
              <span className="font-semibold text-[#93c5fd] mr-1">Quick Presets:</span>
              {[
                ['Read Holding (FC03)', `modpoll -m tcp -a ${slaveId} -r 1 -c 10 -t 4 ${listenIp}`],
                ['Read Input Regs (FC04)', `modpoll -m tcp -a ${slaveId} -r 1 -c 6 -t 3 ${listenIp}`],
                ['Read Coils (FC01)', `modpoll -m tcp -a ${slaveId} -r 1 -c 6 -t 0 ${listenIp}`],
                ['Read Discrete (FC02)', `modpoll -m tcp -a ${slaveId} -r 1 -c 6 -t 1 ${listenIp}`],
              ].map(([lbl, cmdStr]) => (
                <button
                  key={lbl}
                  type="button"
                  className="msp-btn !py-0.5 !px-2 !text-[10.5px]"
                  onClick={() => { setCliInput(cmdStr); runCliCommand(cmdStr); }}
                >
                  {lbl}
                </button>
              ))}
            </div>

            <div ref={cliScrollRef} className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-[1.45]">
              {cliLines.map((ln) => (
                <div
                  key={ln.id}
                  className="whitespace-pre-wrap"
                  style={{
                    color:
                      ln.kind === 'CMD'
                        ? '#38bdf8'
                        : ln.kind === 'ERR'
                        ? '#f87171'
                        : ln.kind === 'OK'
                        ? '#4ade80'
                        : '#e2e8f0',
                  }}
                >
                  {ln.text}
                </div>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runCliCommand(cliInput);
              }}
              className="border-t border-[#334155] bg-[#0f172a] px-3 py-2 flex items-center gap-2 shrink-0"
            >
              <span className="font-mono text-[12px] text-[#38bdf8] shrink-0">C:\SAS\Tools&gt;</span>
              <input
                type="text"
                value={cliInput}
                onChange={(e) => setCliInput(e.target.value)}
                className="cli-in flex-1 bg-transparent text-[#f8fafc] font-mono text-[12px] outline-none border-none"
              />
              <button type="submit" className="msp-btn-primary">Run</button>
            </form>
          </div>
        )}
      </div>

      {/* 5. STATUS BAR */}
      <div className="h-[22px] bg-[#e2e8f0] border-t border-[#94a3b8] px-2.5 flex items-center justify-between text-[11px] text-[#1e293b] shrink-0 font-mono">
        <span className="truncate">{lastPollStatus}</span>
        <span>{`Display: ${displayFmt} · Rate: ${pollRateMs} ms · Exception: ${exceptionCode}`}</span>
      </div>

      {/* EDIT / WRITE DIALOG */}
      {editModal && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[360px] bg-[#f0f0f0] border border-[#475569] shadow-xl text-[12px]">
            <div className="h-[26px] bg-[#1e3a8a] text-white px-2.5 flex items-center justify-between font-semibold">
              <span>{editModal.isCoil ? 'Force Single Coil (FC05)' : 'Write Single Register (FC06)'}</span>
              <button type="button" className="text-white cursor-pointer" onClick={() => setEditModal(null)}>✕</button>
            </div>
            <div className="p-3 space-y-2.5">
              <div className="font-semibold text-[#1e3a8a]">{editModal.label}</div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <label>New Value:</label>
                {editModal.isCoil ? (
                  <select value={editInput} onChange={(e) => setEditInput(e.target.value)} className="col-span-2 h-[24px] px-1.5">
                    <option value="1">1 (ON / CLOSE)</option>
                    <option value="0">0 (OFF / OPEN)</option>
                  </select>
                ) : (
                  <input type="number" min={0} max={65535} value={editInput} onChange={(e) => setEditInput(e.target.value)} className="col-span-2 h-[24px] px-1.5 font-mono" />
                )}
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#cbd5e1]">
                <button type="button" className="msp-btn-primary" onClick={handleCommitEdit}>Update</button>
                <button type="button" className="msp-btn" onClick={() => setEditModal(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ModbusSlavePollTool;
