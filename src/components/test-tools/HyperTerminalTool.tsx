import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// HyperTerminal — Serial (RS-232 COM) / Telnet / SSH Console CLI Terminal
// Authentic VT100 commissioning console for Hirschmann Switch CLI, RTU/Gateway
// diagnostics, and IED serial maintenance integrated with live Substation Store.
// ============================================================================

type ConnMode = 'COM1' | 'COM3' | 'TCP_TELNET' | 'SSH';
type TargetDevice = 'SWITCH_HIOS' | 'RTU_GATEWAY' | 'IED_SERIAL';
type ThemeColor = 'GREEN' | 'AMBER' | 'WHITE';

interface TermLine {
  id: number;
  text: string;
  kind?: 'CMD' | 'OUT' | 'ERR' | 'OK' | 'SYS';
}

interface PersistedHyper {
  connected: boolean;
  connMode: ConnMode;
  targetDevice: TargetDevice;
  baudRate: number;
  hostIp: string;
  tcpPort: number;
  themeColor: ThemeColor;
  localEcho: boolean;
}

const STORAGE_KEY = 'sas_hyper_terminal_state_v1';
let memCache: PersistedHyper | null = null;

function loadInit(): Partial<PersistedHyper> {
  if (memCache) return memCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedHyper;
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

function saveState(st: PersistedHyper) {
  memCache = st;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  } catch {
    // Ignore quota errors
  }
}

function fmtElapsed(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(h)}:${p(m)}:${p(s)}`;
}

export const HyperTerminalTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { bays, ieds, alarms } = useSubstationStore();

  const [connected, setConnected] = useState<boolean>(() => Boolean(init.connected));
  const [connMode, setConnMode] = useState<ConnMode>(() => init.connMode || 'COM1');
  const [targetDevice, setTargetDevice] = useState<TargetDevice>(() => init.targetDevice || 'SWITCH_HIOS');
  const [baudRate, setBaudRate] = useState<number>(() => init.baudRate || 115200);
  const [hostIp, setHostIp] = useState<string>(() => init.hostIp || '10.132.10.2');
  const [tcpPort, setTcpPort] = useState<number>(() => init.tcpPort || 23);
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => init.themeColor || 'GREEN');
  const [localEcho, setLocalEcho] = useState<boolean>(() => init.localEcho ?? true);

  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [cmdInput, setCmdInput] = useState<string>('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [lines, setLines] = useState<TermLine[]>([
    { id: 1, text: 'HyperTerminal Private Edition — VT100 / ANSI Substation Console', kind: 'SYS' },
    { id: 2, text: 'Select COM port or TCP/Telnet and click Connect to open a live console session.', kind: 'SYS' },
  ]);

  const termRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const seqRef = useRef<number>(3);

  useEffect(() => {
    saveState({ connected, connMode, targetDevice, baudRate, hostIp, tcpPort, themeColor, localEcho });
  }, [connected, connMode, targetDevice, baudRate, hostIp, tcpPort, themeColor, localEcho]);

  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines.length]);

  useEffect(() => {
    if (!connected) {
      setElapsedSec(0);
      return;
    }
    const t = window.setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => window.clearInterval(t);
  }, [connected]);

  const promptStr = useMemo(() => {
    if (targetDevice === 'SWITCH_HIOS') return 'SW-LAN-A-01# ';
    if (targetDevice === 'RTU_GATEWAY') return 'SAS-GW-01> ';
    return 'IED_132_L1:> ';
  }, [targetDevice]);

  const pushLines = (entries: Array<{ text: string; kind?: TermLine['kind'] }>) => {
    setLines((prev) => {
      const next = [...prev];
      entries.forEach((e) => {
        seqRef.current += 1;
        next.push({ id: seqRef.current, text: e.text, kind: e.kind || 'OUT' });
      });
      return next.slice(-260);
    });
  };

  const handleConnect = () => {
    setConnected(true);
    const linkInfo =
      connMode === 'COM1' || connMode === 'COM3'
        ? `${connMode} (${baudRate} bps, 8-N-1, Flow=None)`
        : `${connMode} -> ${hostIp}:${tcpPort}`;
    const banner =
      targetDevice === 'SWITCH_HIOS'
        ? [
            { text: `--- Connected via ${linkInfo} ---`, kind: 'SYS' as const },
            { text: 'Hirschmann Operating System (HiOS-2A-09.0.04) — RSP35-1103', kind: 'OK' as const },
            { text: 'Logged in as admin (Privileged EXEC). Type "help" for commands.', kind: 'OUT' as const },
          ]
        : targetDevice === 'RTU_GATEWAY'
        ? [
            { text: `--- Connected via ${linkInfo} ---`, kind: 'SYS' as const },
            { text: 'Substation SAS Gateway / RTU Console (IEC 61850 <-> IEC 104 / Modbus)', kind: 'OK' as const },
            { text: 'Type "show bays", "show ieds", "show alarms", or "help".', kind: 'OUT' as const },
          ]
        : [
            { text: `--- Connected via ${linkInfo} ---`, kind: 'SYS' as const },
            { text: 'IED Serial Maintenance Port (RS-232 Front Service Interface)', kind: 'OK' as const },
            { text: 'Type "AT", "status", "version", or "help".', kind: 'OUT' as const },
          ];
    pushLines(banner);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  };

  const handleDisconnect = () => {
    setConnected(false);
    pushLines([{ text: '--- Session Disconnected ---', kind: 'SYS' }]);
  };

  const executeCommand = (raw: string) => {
    const cmd = raw.trim();
    if (!connected) {
      pushLines([{ text: 'Not connected. Click Connect first.', kind: 'ERR' }]);
      return;
    }
    if (localEcho) {
      pushLines([{ text: `${promptStr}${cmd}`, kind: 'CMD' }]);
    }
    if (!cmd) return;

    setCmdHistory((prev) => [cmd, ...prev.filter((c) => c !== cmd)].slice(0, 40));
    setHistIdx(-1);

    const low = cmd.toLowerCase();

    if (low === 'clear' || low === 'cls') {
      setLines([]);
      return;
    }

    if (low === 'help' || low === '?') {
      pushLines([
        { text: 'Available Substation Console Commands:', kind: 'OK' },
        { text: '  show sysinfo        - Device hardware, firmware, uptime & PSU status' },
        { text: '  show interface      - Managed switch ports, SFP optical Rx & link status' },
        { text: '  show mrp / show ptp - MRP/PRP redundancy & IEEE 1588 PTPv2 sync status' },
        { text: '  show bays           - Live substation bays (Breaker state, kV, A, MW)' },
        { text: '  show ieds           - Live IED IP table & MMS/GOOSE communication health' },
        { text: '  show alarms         - Active unacknowledged substation alarms' },
        { text: '  ping <ip>           - ICMP echo test to any substation IED/Gateway IP' },
        { text: '  save / AT / version - Save NVM config, serial AT check, firmware version' },
        { text: '  clear               - Clear terminal screen' },
      ]);
      return;
    }

    if (low === 'at') {
      pushLines([{ text: 'OK', kind: 'OK' }]);
      return;
    }

    if (low === 'version' || low === 'show version' || low === 'show sysinfo') {
      pushLines([
        { text: 'System Name   : SW-LAN-A-01 / SAS-GW-01', kind: 'OK' },
        { text: 'Hardware      : Hirschmann RSP35-1103 / 132kV Station Bus' },
        { text: 'Firmware      : HiOS-2A-09.0.04 (IEC 61850-9-3 PTPv2)' },
        { text: `Uptime        : 42 days, 11:18:${String(elapsedSec % 60).padStart(2, '0')}` },
        { text: 'Power Supply  : PSU1=OK (110V DC), PSU2=OK (110V DC), Temp=38.4 C' },
      ]);
      return;
    }

    if (low.startsWith('show interface') || low === 'show ports') {
      pushLines([
        { text: 'Port   Media   Admin   Link   Speed       PVID  Optical Rx', kind: 'OK' },
        { text: '1/1    SFP     Up      Up     1000M-LX    100   -8.8 dBm  (MRP Ring A)' },
        { text: '1/2    SFP     Up      Up     1000M-LX    100   -9.2 dBm  (MRP Ring B)' },
        { text: '1/3    SFP     Up      Up     1000M-LX    200   -9.6 dBm  (PRP Interlink)' },
        { text: '1/4    SFP     Up      Up     1000M-LX    100   -10.0 dBm (PTP GM Clock)' },
        { text: '1/5    RJ45    Up      Up     100M-TX     200   N/A       (IED_132_L1)' },
        { text: '1/6    RJ45    Up      Up     100M-TX     200   N/A       (IED_132_L2)' },
      ]);
      return;
    }

    if (low === 'show mrp' || low === 'show redundancy') {
      pushLines([
        { text: 'MRP Ring Manager : ACTIVE (Ring State: CLOSED / Healthy)', kind: 'OK' },
        { text: 'Ring Ports       : 1/1 (Forwarding), 1/2 (Blocking)' },
        { text: 'PRP Redundancy   : IEC 62439-3 LAN-A / LAN-B Active (0 ms recovery)' },
      ]);
      return;
    }

    if (low === 'show ptp' || low === 'show time') {
      pushLines([
        { text: 'IEEE 1588 PTPv2  : LOCKED (IEC 61850-9-3 Power Profile)', kind: 'OK' },
        { text: 'Grandmaster ID   : 00-80-63-FF-FE-10-42-01 (Clock Class 6 — GPS)' },
        { text: 'Offset / Delay   : +18 ns / 142 ns' },
      ]);
      return;
    }

    if (low === 'show bays') {
      pushLines([
        { text: 'Bay Name                 kV    CB State   Current(A)   Active(MW)', kind: 'OK' },
        ...bays.map((b) => ({
          text: `${b.name.padEnd(24).slice(0, 24)} ${String(b.voltageKv).padEnd(5)} ${b.breakerState.padEnd(10)} ${b.currentA.toFixed(1).padEnd(12)} ${b.activePowerMw.toFixed(2)}`,
        })),
      ]);
      return;
    }

    if (low === 'show ieds') {
      pushLines([
        { text: 'IED Name        Vendor / Model               LAN-A IP        MMS     GOOSE', kind: 'OK' },
        ...ieds.map((i) => ({
          text: `${i.name.padEnd(15)} ${(i.vendor + ' ' + i.model).padEnd(28).slice(0, 28)} ${i.ipAddressLanA.padEnd(15)} ${i.mmsConnected ? 'OK  ' : 'DOWN'}    ${i.gooseHealthy ? 'OK' : 'FAULT'}`,
        })),
      ]);
      return;
    }

    if (low === 'show alarms') {
      const active = alarms.filter((a) => a.state !== 'CLEARED').slice(0, 8);
      if (active.length === 0) {
        pushLines([{ text: 'No active unacknowledged alarms.', kind: 'OK' }]);
      } else {
        pushLines([
          { text: `Active Alarms (${active.length}):`, kind: 'OK' },
          ...active.map((a) => ({
            text: `[${a.severity}] ${a.bayName} — ${a.signalName} (${a.valueText})`,
            kind: a.severity === 'CRITICAL' ? ('ERR' as const) : ('OUT' as const),
          })),
        ]);
      }
      return;
    }

    if (low.startsWith('ping ')) {
      const target = cmd.slice(5).trim();
      const known = ieds.find((i) => i.ipAddressLanA === target || i.ipAddressLanB === target);
      pushLines([
        { text: `Pinging ${target}${known ? ` (${known.name})` : ''} with 32 bytes of data:` },
        { text: `Reply from ${target}: bytes=32 time<1ms TTL=64`, kind: 'OK' },
        { text: `Reply from ${target}: bytes=32 time<1ms TTL=64`, kind: 'OK' },
        { text: `Reply from ${target}: bytes=32 time<1ms TTL=64`, kind: 'OK' },
        { text: `Packets: Sent = 3, Received = 3, Lost = 0 (0% loss)`, kind: 'OK' },
      ]);
      return;
    }

    if (low === 'save' || low === 'copy running-config startup-config') {
      pushLines([{ text: 'Saving running configuration to NVM... Done [OK].', kind: 'OK' }]);
      return;
    }

    pushLines([{ text: `% Unknown command "${cmd}". Type "help" for available commands.`, kind: 'ERR' }]);
  };

  const handleExportLog = () => {
    const txt = lines.map((l) => l.text).join('\n');
    const blob = new Blob([txt], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `hyperterminal_${connMode.toLowerCase()}_capture.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const fgHex = themeColor === 'GREEN' ? '#4ade80' : themeColor === 'AMBER' ? '#fbbf24' : '#f1f5f9';

  return (
    <div
      className="hyper-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f0f0] text-[#111827] border border-[#707070] shadow-lg overflow-hidden"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .hyper-app, .hyper-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f0f0f0 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .hyper-app p, #root .hyper-app span, #root .hyper-app label, #root .hyper-app div { text-shadow: none !important; }
        #root .hyper-app button { font-family: "Segoe UI", Tahoma, sans-serif !important; box-shadow: none !important; }
        #root .hyper-app input:not(.ht-term-input),
        #root .sas-workspace-main .hyper-app input:not(.ht-term-input),
        #root .hyper-app select,
        #root .sas-workspace-main .hyper-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          border-radius: 3px !important;
          box-shadow: none !important;
          color-scheme: light !important;
        }
        #root .hyper-app select option { background-color: #ffffff !important; color: #111827 !important; }
        #root .hyper-app input.ht-term-input,
        #root .sas-workspace-main .hyper-app input.ht-term-input {
          background: transparent !important;
          background-color: transparent !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          font-family: Consolas, "Courier New", monospace !important;
        }
        #root .hyper-app .ht-btn {
          background: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 9px !important;
          font-size: 11.5px !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
        #root .hyper-app .ht-btn:hover:not(:disabled) { background: #e0f2fe !important; border-color: #0284c7 !important; }
        #root .hyper-app .ht-btn-primary {
          background: #0f4c81 !important;
          color: #ffffff !important;
          border: 1px solid #0c3c66 !important;
          padding: 3px 10px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 3px !important;
          cursor: pointer;
        }
      `}</style>

      {/* 1. TITLE BAR */}
      <div className="h-[28px] bg-[#1e293b] text-white px-3 flex items-center justify-between shrink-0 text-[12px]">
        <div className="flex items-center gap-2 font-semibold">
          <span className="bg-[#38bdf8] text-[#082f49] font-extrabold text-[10px] px-1.5 py-[1px] rounded-[2px]">COM</span>
          <span>HyperTerminal — Serial / RS-232 / Telnet / SSH Substation Console</span>
        </div>
        <div className="font-mono text-[11px]">
          {connected ? `CONNECTED (${fmtElapsed(elapsedSec)})` : 'DISCONNECTED'}
        </div>
      </div>

      {/* 2. CONNECTION SETTINGS TOOLBAR */}
      <div className="bg-[#f8fafc] border-b border-[#cbd5e1] px-2.5 py-1.5 flex flex-wrap items-center gap-2 text-[11.5px] shrink-0">
        <label className="font-semibold">Port:</label>
        <select value={connMode} onChange={(e) => setConnMode(e.target.value as ConnMode)} className="h-[24px] px-1.5">
          <option value="COM1">COM1 (RS-232 Console)</option>
          <option value="COM3">COM3 (USB-to-Serial)</option>
          <option value="TCP_TELNET">TCP/IP (Telnet)</option>
          <option value="SSH">TCP/IP (SSHv2)</option>
        </select>

        {connMode === 'COM1' || connMode === 'COM3' ? (
          <>
            <label className="font-semibold">Baud:</label>
            <select value={baudRate} onChange={(e) => setBaudRate(Number(e.target.value))} className="h-[24px] px-1.5 font-mono">
              <option value={9600}>9600</option>
              <option value={19200}>19200</option>
              <option value={38400}>38400</option>
              <option value={115200}>115200</option>
            </select>
          </>
        ) : (
          <>
            <input value={hostIp} onChange={(e) => setHostIp(e.target.value)} className="h-[24px] w-[110px] px-1.5 font-mono" />
            <input type="number" value={tcpPort} onChange={(e) => setTcpPort(Number(e.target.value) || 23)} className="h-[24px] w-[54px] px-1.5 font-mono" />
          </>
        )}

        <label className="font-semibold">Target:</label>
        <select value={targetDevice} onChange={(e) => setTargetDevice(e.target.value as TargetDevice)} className="h-[24px] px-1.5">
          <option value="SWITCH_HIOS">Hirschmann Switch (HiOS)</option>
          <option value="RTU_GATEWAY">SAS Gateway / RTU</option>
          <option value="IED_SERIAL">IED Front Serial Port</option>
        </select>

        {!connected ? (
          <button type="button" className="ht-btn-primary" onClick={handleConnect}>
            Connect
          </button>
        ) : (
          <button type="button" className="ht-btn" onClick={handleDisconnect}>
            Disconnect
          </button>
        )}

        <div className="ml-auto flex items-center gap-1.5">
          <select value={themeColor} onChange={(e) => setThemeColor(e.target.value as ThemeColor)} className="h-[24px] px-1.5 text-[11px]">
            <option value="GREEN">Phosphor Green</option>
            <option value="AMBER">Classic Amber</option>
            <option value="WHITE">Crisp White</option>
          </select>
          <button type="button" className="ht-btn" onClick={handleExportLog}>
            Capture (.txt)
          </button>
          <button type="button" className="ht-btn" onClick={() => setLines([])}>
            Clear
          </button>
        </div>
      </div>

      {/* 3. QUICK COMMISSIONING COMMANDS BAR */}
      <div className="bg-[#eef2f6] border-b border-[#cbd5e1] px-2.5 py-1 flex flex-wrap items-center gap-1.5 text-[11px] shrink-0">
        <span className="font-semibold text-[#334155]">Quick CLI:</span>
        {['show sysinfo', 'show interface', 'show mrp', 'show ptp', 'show bays', 'show ieds', 'show alarms', 'ping 10.132.10.11', 'help'].map((c) => (
          <button
            key={c}
            type="button"
            className="ht-btn !py-[1px] !px-2 !text-[10.5px] font-mono"
            onClick={() => executeCommand(c)}
          >
            {c}
          </button>
        ))}
      </div>

      {/* 4. VT100 TERMINAL SCREEN */}
      <div
        ref={termRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-auto bg-[#0a0f14] p-3 font-mono text-[12.5px] leading-[1.48] cursor-text"
        style={{ color: fgHex }}
      >
        {lines.map((l) => (
          <div
            key={l.id}
            className="whitespace-pre-wrap break-words"
            style={{
              color:
                l.kind === 'ERR'
                  ? '#f87171'
                  : l.kind === 'SYS'
                  ? '#38bdf8'
                  : l.kind === 'CMD'
                  ? '#ffffff'
                  : fgHex,
            }}
          >
            {l.text}
          </div>
        ))}

        {connected && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              executeCommand(cmdInput);
              setCmdInput('');
            }}
            className="flex items-center mt-0.5"
          >
            <span className="font-bold mr-1" style={{ color: '#ffffff' }}>
              {promptStr}
            </span>
            <input
              ref={inputRef}
              type="text"
              value={cmdInput}
              onChange={(e) => setCmdInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'ArrowUp' && cmdHistory.length > 0) {
                  e.preventDefault();
                  const next = Math.min(cmdHistory.length - 1, histIdx + 1);
                  setHistIdx(next);
                  setCmdInput(cmdHistory[next]);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = histIdx - 1;
                  if (next < 0) {
                    setHistIdx(-1);
                    setCmdInput('');
                  } else {
                    setHistIdx(next);
                    setCmdInput(cmdHistory[next]);
                  }
                }
              }}
              className="ht-term-input flex-1 text-[12.5px]"
              style={{ color: fgHex, caretColor: fgHex }}
              autoFocus
            />
          </form>
        )}
      </div>

      {/* 5. CLASSIC HYPERTERMINAL STATUS BAR */}
      <div className="h-[24px] bg-[#e2e8f0] border-t border-[#94a3b8] px-3 flex items-center justify-between text-[11px] font-mono text-[#1e293b] shrink-0">
        <span>{connected ? `Connected ${fmtElapsed(elapsedSec)}` : 'Disconnected'}</span>
        <div className="flex items-center gap-4">
          <span>VT100 / ANSI</span>
          <span>{connMode === 'COM1' || connMode === 'COM3' ? `${connMode} ${baudRate} 8-N-1` : `${connMode} ${hostIp}:${tcpPort}`}</span>
          <label className="flex items-center gap-1 cursor-pointer">
            <input type="checkbox" checked={localEcho} onChange={(e) => setLocalEcho(e.target.checked)} />
            <span>Echo</span>
          </label>
        </div>
      </div>
    </div>
  );
};

export default HyperTerminalTool;
