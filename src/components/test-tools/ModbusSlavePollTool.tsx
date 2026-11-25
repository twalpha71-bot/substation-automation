import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// Modbus Slave / Poll & Modpoll CLI — Commissioning Simulator Workbench
// Includes: (1) Modbus Slave Simulator with Auto-Inc/Jitter & Exception Injection
//           (2) Modbus Poll Master Table (Tx/Err counters & inline FC05/FC06)
//           (3) Interactive modpoll CLI terminal with real command parser
// ============================================================================

type ActiveView = 'SLAVE' | 'POLL' | 'CLI';
type BankType = 'COILS' | 'DISCRETE' | 'HOLDING' | 'INPUT';
type ExceptionCode = 'NONE' | '01' | '02' | '03' | '04' | '06' | 'TIMEOUT';
type SimWave = 'STATIC' | 'LIVE_BAY' | 'AUTO_INC' | 'RANDOM';

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

const STORAGE_KEY = 'sas_modbus_slave_poll_v1';
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

export const ModbusSlavePollTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { bays, commandBreaker } = useSubstationStore();

  const [activeView, setActiveView] = useState<ActiveView>(() => init.activeView || 'SLAVE');
  const [slaveRunning, setSlaveRunning] = useState<boolean>(() => init.slaveRunning ?? true);
  const [slaveId, setSlaveId] = useState<number>(() => init.slaveId || 1);
  const [listenIp, setListenIp] = useState<string>(() => init.listenIp || '10.132.10.200');
  const [listenPort, setListenPort] = useState<number>(() => init.listenPort || 502);
  const [bank, setBank] = useState<BankType>(() => init.bank || 'HOLDING');
  const [exceptionCode, setExceptionCode] = useState<ExceptionCode>(() => init.exceptionCode || 'NONE');
  const [simWave, setSimWave] = useState<SimWave>(() => init.simWave || 'LIVE_BAY');

  const [pollRunning, setPollRunning] = useState<boolean>(() => Boolean(init.pollRunning));
  const [pollFc, setPollFc] = useState<BankType>(() => init.pollFc || 'HOLDING');
  const [pollStart, setPollStart] = useState<number>(() => init.pollStart || 1);
  const [pollQty, setPollQty] = useState<number>(() => init.pollQty || 12);
  const [pollRateMs, setPollRateMs] = useState<number>(() => init.pollRateMs || 1000);

  const [customHolding, setCustomHolding] = useState<Record<number, number>>(() => init.customHolding || {});
  const [customCoils, setCustomCoils] = useState<Record<number, boolean>>(() => init.customCoils || {});

  const [simStep, setSimStep] = useState<number>(0);
  const [txCount, setTxCount] = useState<number>(0);
  const [errCount, setErrCount] = useState<number>(0);
  const [lastPollStatus, setLastPollStatus] = useState<string>('Idle');

  const [cliInput, setCliInput] = useState<string>('modpoll -m tcp -a 1 -r 1 -c 8 -t 4 10.132.10.200');
  const [cliLines, setCliLines] = useState<CliLine[]>([
    { id: 1, text: 'modpoll 3.10 - FieldTalk(tm) Modbus(R) Master Simulator (Substation Commissioning CLI)', kind: 'OUT' },
    { id: 2, text: 'Type "help" or click a preset command below to poll or write to the active Modbus Slave.', kind: 'OUT' },
  ]);

  const cliEndRef = useRef<HTMLDivElement | null>(null);
  const cliSeqRef = useRef<number>(3);

  useEffect(() => {
    saveState({
      activeView,
      slaveRunning,
      slaveId,
      listenIp,
      listenPort,
      bank,
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
  }, [
    activeView,
    slaveRunning,
    slaveId,
    listenIp,
    listenPort,
    bank,
    exceptionCode,
    simWave,
    pollRunning,
    pollFc,
    pollStart,
    pollQty,
    pollRateMs,
    customHolding,
    customCoils,
  ]);

  useEffect(() => {
    if (cliEndRef.current) {
      cliEndRef.current.scrollTop = cliEndRef.current.scrollHeight;
    }
  }, [cliLines.length]);

  const activeBay = useMemo(() => {
    const idx = Math.max(0, Math.min(bays.length - 1, slaveId - 1));
    return bays[idx] || bays[0];
  }, [bays, slaveId]);

  // Simulation heartbeat for Slave AUTO_INC / RANDOM / LIVE_BAY
  useEffect(() => {
    if (!slaveRunning) return;
    const t = window.setInterval(() => {
      setSimStep((s) => s + 1);
    }, 1000);
    return () => window.clearInterval(t);
  }, [slaveRunning]);

  // Compute register / coil value for any bank + 1-based address
  const readPoint = (bType: BankType, addr: number): { val: number; alias: string } => {
    const bay = activeBay;
    if (bType === 'COILS') {
      if (customCoils[addr] !== undefined) {
        return { val: customCoils[addr] ? 1 : 0, alias: addr === 1 ? 'CB Command Coil' : `Coil_${addr}` };
      }
      if (addr === 1) return { val: bay?.breakerState === 'CLOSED' ? 1 : 0, alias: 'CB Command Coil' };
      if (addr === 2) return { val: bay?.localRemote === 'REMOTE' ? 1 : 0, alias: 'Remote Mode Enable' };
      if (addr === 3) return { val: bay?.protectionTripActive ? 1 : 0, alias: 'Trip Reset Coil' };
      return { val: 0, alias: `Coil_${addr}` };
    }
    if (bType === 'DISCRETE') {
      if (addr === 1) return { val: bay?.breakerState === 'CLOSED' ? 1 : 0, alias: 'CB_52a_Closed' };
      if (addr === 2) return { val: bay?.breakerState === 'OPEN' ? 1 : 0, alias: 'CB_52b_Open' };
      if (addr === 3) return { val: bay?.protectionTripActive ? 1 : 0, alias: 'Prot_86_Trip' };
      if (addr === 4) return { val: bay?.interlockPermissive ? 1 : 0, alias: 'Interlock_OK' };
      if (addr === 5) return { val: bay?.springCharged ? 1 : 0, alias: 'Spring_Charged' };
      if (addr === 6) return { val: bay?.sf6PressureNormal ? 1 : 0, alias: 'SF6_Normal' };
      return { val: 0, alias: `DI_${addr}` };
    }

    if (bType === 'HOLDING' && customHolding[addr] !== undefined) {
      return { val: customHolding[addr] & 0xffff, alias: `HR_${addr} (Manual)` };
    }

    const baseVals: Record<number, { v: number; alias: string }> = {
      1: { v: Math.round((bay?.voltageAbKv ?? 132.2) * 100), alias: 'Voltage_AB_x0.01kV' },
      2: { v: Math.round((bay?.currentA ?? 148.5) * 10), alias: 'Current_PhA_x0.1A' },
      3: { v: Math.round((bay?.activePowerMw ?? 32.1) * 100), alias: 'ActivePower_x0.01MW' },
      4: { v: Math.round((bay?.reactivePowerMvar ?? 8.4) * 100), alias: 'ReactivePower_x0.01MVAr' },
      5: { v: Math.round((bay?.frequencyHz ?? 50.0) * 100), alias: 'Frequency_x0.01Hz' },
      6: { v: bay?.breakerState === 'CLOSED' ? 2 : 1, alias: 'CB_Pos_Code' },
      7: { v: bay?.opCounter ?? 142, alias: 'CB_OpCounter' },
      8: { v: bay?.quality === 'GOOD' ? 0 : 1, alias: 'Quality_Flag' },
    };

    const base = baseVals[addr] || { v: addr * 10, alias: `${bType === 'HOLDING' ? 'HR' : 'IR'}_${addr}` };
    if (simWave === 'AUTO_INC') {
      return { val: (base.v + simStep) & 0xffff, alias: base.alias };
    }
    if (simWave === 'RANDOM') {
      const jitter = ((simStep * 37 + addr * 13) % 19) - 9;
      return { val: Math.max(0, base.v + jitter) & 0xffff, alias: base.alias };
    }
    return { val: base.v & 0xffff, alias: base.alias };
  };

  // Modbus Poll cyclic loop
  useEffect(() => {
    if (!pollRunning) return;
    const t = window.setInterval(() => {
      setTxCount((c) => c + 1);
      if (!slaveRunning || exceptionCode === 'TIMEOUT') {
        setErrCount((e) => e + 1);
        setLastPollStatus('Timeout Error — No response from Slave');
        return;
      }
      if (exceptionCode !== 'NONE') {
        setErrCount((e) => e + 1);
        setLastPollStatus(`Modbus Exception ${EXCEPTION_DESC[exceptionCode]}`);
        return;
      }
      setLastPollStatus(`OK — Poll FC0${BANK_META[pollFc].fc} Slave ${slaveId} (${pollQty} pts)`);
    }, Math.max(300, pollRateMs));
    return () => window.clearInterval(t);
  }, [pollRunning, pollRateMs, slaveRunning, exceptionCode, pollFc, slaveId, pollQty]);

  const slaveRows = useMemo(() => {
    const meta = BANK_META[bank];
    return Array.from({ length: 16 }, (_, i) => {
      const addr = i + 1;
      const pt = readPoint(bank, addr);
      return { addr, ref: String(meta.prefix + addr).padStart(5, '0'), val: pt.val, alias: pt.alias };
    });
  }, [bank, activeBay, simWave, simStep, customHolding, customCoils]);

  const pollRows = useMemo(() => {
    const meta = BANK_META[pollFc];
    const start = Math.max(1, pollStart);
    const qty = Math.max(1, Math.min(50, pollQty));
    return Array.from({ length: qty }, (_, i) => {
      const addr = start + i;
      const pt = readPoint(pollFc, addr);
      return { addr, ref: String(meta.prefix + addr).padStart(5, '0'), val: pt.val, alias: pt.alias };
    });
  }, [pollFc, pollStart, pollQty, activeBay, simWave, simStep, customHolding, customCoils]);

  const writePoint = (bType: BankType, addr: number, val: number) => {
    if (bType === 'COILS') {
      const b = val !== 0;
      setCustomCoils((prev) => ({ ...prev, [addr]: b }));
      if (addr === 1 && activeBay) {
        commandBreaker(activeBay.id, b ? 'CLOSED' : 'OPEN', 'SCADA_SBO');
      }
    } else if (bType === 'HOLDING') {
      setCustomHolding((prev) => ({ ...prev, [addr]: Math.max(0, Math.min(65535, val)) }));
    }
  };

  // Interactive modpoll CLI command parser
  const runCliCommand = (rawCmd: string) => {
    const cmd = rawCmd.trim();
    if (!cmd) return;
    const push = (text: string, kind: CliLine['kind'] = 'OUT') => {
      cliSeqRef.current += 1;
      const id = cliSeqRef.current;
      setCliLines((prev) => [...prev.slice(-160), { id, text, kind }]);
    };

    push(`$ ${cmd}`, 'CMD');
    if (cmd === 'clear' || cmd === 'cls') {
      setCliLines([]);
      return;
    }
    if (cmd === 'help' || cmd === 'modpoll -h') {
      push('Usage: modpoll -m tcp -a <slaveId> -r <startRef> -c <count> -t <type> <host> [writeVal]');
      push('  -t 0 : Coils (FC01 / FC05)          -t 1 : Discrete Inputs (FC02)');
      push('  -t 3 : Input Registers (FC04)       -t 4 : Holding Registers (FC03 / FC06)');
      push('Example Read : modpoll -m tcp -a 1 -r 1 -c 8 -t 4 10.132.10.200');
      push('Example Write: modpoll -m tcp -a 1 -r 1 -t 4 10.132.10.200 13250');
      return;
    }

    if (!cmd.startsWith('modpoll')) {
      push(`Unknown command "${cmd.split(' ')[0]}". Try "modpoll ..." or "help".`, 'ERR');
      return;
    }

    if (!slaveRunning || exceptionCode === 'TIMEOUT') {
      push(`Protocol configuration: MODBUS/TCP, FC3 -> Reply time-out! (Slave stopped or Timeout injected)`, 'ERR');
      return;
    }
    if (exceptionCode !== 'NONE') {
      push(`Slave threw Modbus Exception ${EXCEPTION_DESC[exceptionCode]}!`, 'ERR');
      return;
    }

    const tokens = cmd.split(/\s+/);
    const getArg = (flag: string, def: string) => {
      const idx = tokens.indexOf(flag);
      return idx >= 0 && tokens[idx + 1] ? tokens[idx + 1] : def;
    };
    const rStart = Math.max(1, Number(getArg('-r', '1')) || 1);
    const count = Math.max(1, Math.min(32, Number(getArg('-c', '8')) || 8));
    const tFlag = getArg('-t', '4');
    const aFlag = Number(getArg('-a', String(slaveId))) || 1;
    const bankMap: Record<string, BankType> = { '0': 'COILS', '1': 'DISCRETE', '3': 'INPUT', '4': 'HOLDING' };
    const bType = bankMap[tFlag] || 'HOLDING';

    // Check if trailing numeric write value is supplied after host IP
    const lastTok = tokens[tokens.length - 1];
    const prevTok = tokens[tokens.length - 2] || '';
    const isWrite = /^\d+$/.test(lastTok) && /\d+\.\d+\.\d+\.\d+/.test(prevTok);

    if (isWrite) {
      const wVal = Number(lastTok);
      if (!BANK_META[bType].writable) {
        push(`Error: Type -t ${tFlag} (${bType}) is read-only.`, 'ERR');
        return;
      }
      writePoint(bType, rStart, wVal);
      push(`Protocol configuration: MODBUS/TCP, Slave=${aFlag}, Ref=${rStart}`, 'OUT');
      push(`Written 1 reference: [${rStart}] = ${wVal}`, 'OK');
      return;
    }

    push(`Protocol configuration: MODBUS/TCP, Slave=${aFlag}, Type=${BANK_META[bType].label}`, 'OUT');
    push(`-- Polling slave ${aFlag} (start=${rStart}, count=${count}) --`, 'OK');
    for (let i = 0; i < count; i++) {
      const addr = rStart + i;
      const pt = readPoint(bType, addr);
      push(`[${addr}]: ${pt.val}   (${pt.alias})`, 'OUT');
    }
  };

  return (
    <div
      className="mbsp-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f2f5] text-[#111827] border border-[#707070] shadow-lg overflow-hidden"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .mbsp-app,
        .mbsp-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f0f2f5 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .mbsp-app *::-webkit-scrollbar { width: 11px !important; height: 11px !important; }
        #root .mbsp-app *::-webkit-scrollbar-track { background: #f1f5f9 !important; }
        #root .mbsp-app *::-webkit-scrollbar-thumb { background: #cbd5e1 !important; border: 2px solid #f1f5f9 !important; border-radius: 0 !important; }
        #root .mbsp-app p, #root .mbsp-app span, #root .mbsp-app label, #root .mbsp-app div { text-shadow: none !important; }
        #root .mbsp-app button { font-family: "Segoe UI", Tahoma, sans-serif !important; box-shadow: none !important; }
        #root .mbsp-app input, #root .sas-workspace-main .mbsp-app input,
        #root .mbsp-app select, #root .sas-workspace-main .mbsp-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 3px !important;
          box-shadow: none !important;
          color-scheme: light !important;
        }
        #root .mbsp-app select option { background-color: #ffffff !important; color: #111827 !important; }
        #root .mbsp-app .mb-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 10px !important;
          font-size: 12px !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .mbsp-app .mb-btn:hover { background: #e0f2fe !important; border-color: #0284c7 !important; }
        #root .mbsp-app .mb-btn-primary {
          background: #0f4c81 !important;
          color: #ffffff !important;
          border: 1px solid #0c3c66 !important;
          padding: 3px 11px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .sas-app-shell .sas-workspace-main .mbsp-app table,
        #root .mbsp-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .mbsp-app table thead th,
        #root .mbsp-app table thead th {
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
        #root .sas-app-shell .sas-workspace-main .mbsp-app table tbody td,
        #root .mbsp-app table tbody td {
          padding: 3px 8px !important;
          border-bottom: 1px solid #e2e8f0 !important;
          border-right: 1px solid #f1f5f9 !important;
          color: #111827 !important;
          background-color: #ffffff !important;
          vertical-align: middle;
        }
      `}</style>

      {/* 1. TITLE BAR */}
      <div className="h-[30px] bg-[#1e3a5f] text-white px-3 flex items-center justify-between shrink-0 text-[12px]">
        <div className="flex items-center gap-2 font-semibold">
          <span className="bg-[#38bdf8] text-[#082f49] font-extrabold text-[10px] px-1.5 py-[1px] rounded-[2px]">MB</span>
          <span>Modbus Slave / Modbus Poll / Modpoll CLI Workbench</span>
        </div>
        <div className="font-mono text-[11px]">
          {`Slave ${slaveId} (${listenIp}:${listenPort}) · ${slaveRunning ? 'LISTENING' : 'STOPPED'}`}
        </div>
      </div>

      {/* 2. MODE TABS & GLOBAL SLAVE STATUS */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 pt-1.5 flex flex-wrap items-center gap-1.5 shrink-0">
        {(['SLAVE', 'POLL', 'CLI'] as ActiveView[]).map((v) => {
          const active = activeView === v;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setActiveView(v)}
              className="px-3.5 py-1 text-[12px] font-semibold border border-b-0 rounded-t-[4px] cursor-pointer"
              style={{
                background: active ? '#ffffff' : '#e2e8f0',
                color: active ? '#0f3d6e' : '#475569',
                borderColor: '#cbd5e1',
              }}
            >
              {v === 'SLAVE' ? '1. Modbus Slave Simulator' : v === 'POLL' ? '2. Modbus Poll (Master)' : '3. Modpoll CLI'}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2 pb-1 text-[11.5px]">
          <span
            className="px-2 py-0.5 rounded font-bold text-[11px]"
            style={{
              background: slaveRunning ? '#dcfce7' : '#fee2e2',
              color: slaveRunning ? '#166534' : '#991b1b',
            }}
          >
            {slaveRunning ? 'SLAVE ONLINE' : 'SLAVE STOPPED'}
          </span>
          <button
            type="button"
            className="mb-btn"
            onClick={() => setSlaveRunning((r) => !r)}
          >
            {slaveRunning ? 'Stop Slave' : 'Start Slave'}
          </button>
        </div>
      </div>

      {/* 3. TAB 1: MODBUS SLAVE SIMULATOR */}
      {activeView === 'SLAVE' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#ffffff]">
          <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-3 py-2 flex flex-wrap items-center gap-3 text-[12px] shrink-0">
            <div className="flex items-center gap-1.5">
              <label className="font-semibold">Listen IP:</label>
              <input value={listenIp} onChange={(e) => setListenIp(e.target.value)} className="h-[24px] w-[115px] px-1.5 font-mono" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="font-semibold">Port:</label>
              <input type="number" value={listenPort} onChange={(e) => setListenPort(Number(e.target.value) || 502)} className="h-[24px] w-[60px] px-1.5 font-mono" />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="font-semibold">Slave ID:</label>
              <select value={slaveId} onChange={(e) => setSlaveId(Number(e.target.value))} className="h-[24px] px-1.5">
                {bays.map((b, idx) => (
                  <option key={b.id} value={idx + 1}>{`ID ${idx + 1} (${b.name})`}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="font-semibold">Bank:</label>
              <select value={bank} onChange={(e) => setBank(e.target.value as BankType)} className="h-[24px] px-1.5">
                {(Object.keys(BANK_META) as BankType[]).map((k) => (
                  <option key={k} value={k}>{BANK_META[k].label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="font-semibold">Simulation:</label>
              <select value={simWave} onChange={(e) => setSimWave(e.target.value as SimWave)} className="h-[24px] px-1.5">
                <option value="LIVE_BAY">Live Substation Bay</option>
                <option value="AUTO_INC">Auto-Increment (+1/s)</option>
                <option value="RANDOM">Random Jitter</option>
                <option value="STATIC">Static</option>
              </select>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="font-semibold text-[#991b1b]">Inject Exception:</label>
              <select value={exceptionCode} onChange={(e) => setExceptionCode(e.target.value as ExceptionCode)} className="h-[24px] px-1.5">
                {(Object.keys(EXCEPTION_DESC) as ExceptionCode[]).map((ex) => (
                  <option key={ex} value={ex}>{EXCEPTION_DESC[ex]}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Modbus Ref</th>
                  <th style={{ width: '26%' }}>Signal Alias</th>
                  <th style={{ width: '18%' }}>Decimal Value</th>
                  <th style={{ width: '16%' }}>Hex</th>
                  <th style={{ width: '26%' }}>Override / Edit Value</th>
                </tr>
              </thead>
              <tbody>
                {slaveRows.map((r) => (
                  <tr key={r.addr}>
                    <td className="font-mono font-semibold">{r.ref}</td>
                    <td>{r.alias}</td>
                    <td className="font-mono font-semibold">{r.val}</td>
                    <td className="font-mono text-[#475569]">{`0x${(r.val & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`}</td>
                    <td>
                      {BANK_META[bank].writable ? (
                        bank === 'COILS' ? (
                          <button
                            type="button"
                            className="mb-btn !py-[1px] !px-2.5"
                            onClick={() => writePoint('COILS', r.addr, r.val ? 0 : 1)}
                          >
                            {r.val ? 'Set OFF (0)' : 'Set ON (1)'}
                          </button>
                        ) : (
                          <input
                            type="number"
                            value={r.val}
                            onChange={(e) => writePoint('HOLDING', r.addr, Number(e.target.value) || 0)}
                            className="h-[22px] w-[110px] px-1.5 font-mono text-[11.5px]"
                          />
                        )
                      ) : (
                        <span className="text-[11px] text-[#64748b]">Read-Only Input Bank</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB 2: MODBUS POLL MASTER */}
      {activeView === 'POLL' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#ffffff]">
          <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-3 py-2 flex flex-wrap items-center gap-2.5 text-[12px] shrink-0">
            <button
              type="button"
              className="mb-btn-primary"
              onClick={() => setPollRunning((r) => !r)}
            >
              {pollRunning ? 'Stop Polling' : 'Start Polling'}
            </button>
            <select value={pollFc} onChange={(e) => setPollFc(e.target.value as BankType)} className="h-[24px] px-1.5">
              {(Object.keys(BANK_META) as BankType[]).map((k) => (
                <option key={k} value={k}>{BANK_META[k].label}</option>
              ))}
            </select>
            <label>Start:</label>
            <input type="number" min={1} value={pollStart} onChange={(e) => setPollStart(Math.max(1, Number(e.target.value) || 1))} className="h-[24px] w-[62px] px-1.5 font-mono" />
            <label>Qty:</label>
            <input type="number" min={1} max={50} value={pollQty} onChange={(e) => setPollQty(Math.max(1, Math.min(50, Number(e.target.value) || 10)))} className="h-[24px] w-[54px] px-1.5 font-mono" />
            <label>Scan (ms):</label>
            <select value={pollRateMs} onChange={(e) => setPollRateMs(Number(e.target.value))} className="h-[24px] px-1.5">
              <option value={500}>500</option>
              <option value={1000}>1000</option>
              <option value={2000}>2000</option>
            </select>

            <div className="ml-auto flex items-center gap-3 font-mono text-[11.5px]">
              <span><strong>Tx:</strong> {txCount}</span>
              <span style={{ color: errCount > 0 ? '#b91c1c' : '#166534' }}><strong>Err:</strong> {errCount}</span>
              <span className="font-semibold" style={{ color: lastPollStatus.startsWith('OK') ? '#15803d' : lastPollStatus === 'Idle' ? '#475569' : '#b91c1c' }}>
                {lastPollStatus}
              </span>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table>
              <thead>
                <tr>
                  <th style={{ width: '14%' }}>Address</th>
                  <th style={{ width: '28%' }}>Alias</th>
                  <th style={{ width: '20%' }}>Polled Value</th>
                  <th style={{ width: '16%' }}>Hex</th>
                  <th style={{ width: '22%' }}>Quick Write</th>
                </tr>
              </thead>
              <tbody>
                {pollRows.map((r) => {
                  const hasErr = !slaveRunning || exceptionCode !== 'NONE';
                  return (
                    <tr key={r.addr}>
                      <td className="font-mono font-semibold">{r.ref}</td>
                      <td>{r.alias}</td>
                      <td className="font-mono font-semibold" style={{ color: hasErr ? '#b91c1c' : '#0f172a' }}>
                        {hasErr ? '--- (ERR)' : r.val}
                      </td>
                      <td className="font-mono text-[#475569]">
                        {hasErr ? '----' : `0x${(r.val & 0xffff).toString(16).toUpperCase().padStart(4, '0')}`}
                      </td>
                      <td>
                        {BANK_META[pollFc].writable && !hasErr ? (
                          <button
                            type="button"
                            className="mb-btn !py-[1px] !px-2"
                            onClick={() => writePoint(pollFc, r.addr, pollFc === 'COILS' ? (r.val ? 0 : 1) : r.val + 10)}
                          >
                            {pollFc === 'COILS' ? 'Toggle Coil (FC05)' : '+10 Write (FC06)'}
                          </button>
                        ) : (
                          <span className="text-[11px] text-[#64748b]">{hasErr ? 'Unavailable' : 'Read-Only'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB 3: MODPOLL CLI */}
      {activeView === 'CLI' && (
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#0f172a] text-[#e2e8f0]">
          <div className="bg-[#1e293b] border-b border-[#334155] px-3 py-1.5 flex flex-wrap items-center gap-1.5 shrink-0">
            <span className="text-[11px] font-semibold text-[#94a3b8]">Presets:</span>
            {[
              { lbl: 'Read Holding (FC03)', cmd: `modpoll -m tcp -a ${slaveId} -r 1 -c 8 -t 4 ${listenIp}` },
              { lbl: 'Read Discrete (FC02)', cmd: `modpoll -m tcp -a ${slaveId} -r 1 -c 6 -t 1 ${listenIp}` },
              { lbl: 'Read Coils (FC01)', cmd: `modpoll -m tcp -a ${slaveId} -r 1 -c 4 -t 0 ${listenIp}` },
              { lbl: 'Write HR 40001 = 13250', cmd: `modpoll -m tcp -a ${slaveId} -r 1 -t 4 ${listenIp} 13250` },
              { lbl: 'Help', cmd: 'help' },
            ].map((p) => (
              <button
                key={p.lbl}
                type="button"
                onClick={() => {
                  setCliInput(p.cmd);
                  runCliCommand(p.cmd);
                }}
                className="px-2 py-0.5 text-[11px] rounded border border-[#475569] bg-[#0f172a] text-[#e2e8f0] hover:bg-[#334155] cursor-pointer"
              >
                {p.lbl}
              </button>
            ))}
          </div>

          <div ref={cliEndRef} className="flex-1 overflow-auto p-3 font-mono text-[12px] leading-[1.45]">
            {cliLines.map((l) => (
              <div
                key={l.id}
                className="whitespace-pre-wrap"
                style={{
                  color:
                    l.kind === 'CMD'
                      ? '#38bdf8'
                      : l.kind === 'ERR'
                      ? '#f87171'
                      : l.kind === 'OK'
                      ? '#4ade80'
                      : '#e2e8f0',
                }}
              >
                {l.text}
              </div>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              runCliCommand(cliInput);
            }}
            className="bg-[#1e293b] border-t border-[#334155] p-2 flex items-center gap-2 shrink-0"
          >
            <span className="font-mono text-[#38bdf8] text-[12px] font-bold">$</span>
            <input
              type="text"
              value={cliInput}
              onChange={(e) => setCliInput(e.target.value)}
              className="flex-1 h-[26px] px-2 font-mono text-[12px]"
            />
            <button type="submit" className="mb-btn-primary">
              Execute
            </button>
          </form>
        </div>
      )}
    </div>
  );
};

export default ModbusSlavePollTool;
