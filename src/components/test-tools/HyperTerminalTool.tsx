import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// Hilgraeve HyperTerminal Private Edition — Authentic Windows VT100 Console
// Serial RS-232 (COM1/COM2/COM3) / TCP Winsock / SSH Console CLI Terminal
// Synced with live Substation Store (Bays, IEDs, Alarms, SOE, Network Links)
// Supports Hirschmann Switch CLI, RTU/Gateway Console, and IED Serial Port,
// Connection Properties dialog, Capture Text (.txt), Command Macros & History.
// ============================================================================

type ConnMode = 'COM1' | 'COM2' | 'COM3' | 'TCP_TELNET' | 'SSH';
type TargetDevice = 'SWITCH_HIOS' | 'RTU_GATEWAY' | 'IED_SERIAL';
type ThemeColor = 'GREEN' | 'AMBER' | 'WHITE' | 'PAPER';
type ParityType = 'N' | 'E' | 'O';
type FlowControl = 'None' | 'Hardware' | 'Xon/Xoff';

interface TermLine {
  id: number;
  text: string;
  kind?: 'CMD' | 'OUT' | 'ERR' | 'OK' | 'SYS';
}

interface PersistedHyper {
  sessionName: string;
  connected: boolean;
  connMode: ConnMode;
  targetDevice: TargetDevice;
  baudRate: number;
  dataBits: 7 | 8;
  parity: ParityType;
  stopBits: 1 | 2;
  flowControl: FlowControl;
  hostIp: string;
  tcpPort: number;
  themeColor: ThemeColor;
  localEcho: boolean;
  showTimestamps: boolean;
}

const STORAGE_KEY = 'sas_hyper_terminal_pro_v2';
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

function fmtClock(): string {
  return new Date().toTimeString().split(' ')[0];
}

const DEVICE_MACROS: Record<TargetDevice, Array<{ label: string; cmd: string }>> = {
  SWITCH_HIOS: [
    { label: 'show sysinfo', cmd: 'show sysinfo' },
    { label: 'show interface', cmd: 'show interface' },
    { label: 'show vlan', cmd: 'show vlan' },
    { label: 'show prp', cmd: 'show prp' },
    { label: 'show ptp', cmd: 'show ptp' },
    { label: 'show sfp', cmd: 'show sfp' },
    { label: 'show lldp', cmd: 'show lldp' },
  ],
  RTU_GATEWAY: [
    { label: 'status', cmd: 'status' },
    { label: 'show iec104', cmd: 'show iec104' },
    { label: 'show ieds', cmd: 'show ieds' },
    { label: 'show bays', cmd: 'show bays' },
    { label: 'show alarms', cmd: 'show alarms' },
    { label: 'show soe', cmd: 'show soe' },
    { label: 'clock', cmd: 'clock' },
  ],
  IED_SERIAL: [
    { label: 'id', cmd: 'id' },
    { label: 'status', cmd: 'status' },
    { label: 'meas', cmd: 'meas' },
    { label: 'events', cmd: 'events' },
    { label: 'self-test', cmd: 'self-test' },
    { label: 'set-remote', cmd: 'set-remote' },
  ],
};

export const HyperTerminalTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { bays, ieds, alarms, soeLog, networkLinks, setBayLocalRemote, resetProtectionTrip } = useSubstationStore();

  const [sessionName, setSessionName] = useState<string>(() => init.sessionName || 'Substation_Console.ht');
  const [connected, setConnected] = useState<boolean>(() => Boolean(init.connected));
  const [connMode, setConnMode] = useState<ConnMode>(() => init.connMode || 'COM1');
  const [targetDevice, setTargetDevice] = useState<TargetDevice>(() => init.targetDevice || 'SWITCH_HIOS');
  const [baudRate, setBaudRate] = useState<number>(() => init.baudRate || 115200);
  const [dataBits, setDataBits] = useState<7 | 8>(() => init.dataBits || 8);
  const [parity, setParity] = useState<ParityType>(() => init.parity || 'N');
  const [stopBits, setStopBits] = useState<1 | 2>(() => init.stopBits || 1);
  const [flowControl, setFlowControl] = useState<FlowControl>(() => init.flowControl || 'None');
  const [hostIp, setHostIp] = useState<string>(() => init.hostIp || '10.132.10.2');
  const [tcpPort, setTcpPort] = useState<number>(() => init.tcpPort || 23);
  const [themeColor, setThemeColor] = useState<ThemeColor>(() => init.themeColor || 'GREEN');
  const [localEcho, setLocalEcho] = useState<boolean>(() => init.localEcho ?? true);
  const [showTimestamps, setShowTimestamps] = useState<boolean>(() => Boolean(init.showTimestamps));

  const [capturing, setCapturing] = useState<boolean>(false);
  const [capturedLines, setCapturedLines] = useState<string[]>([]);
  const [elapsedSec, setElapsedSec] = useState<number>(0);
  const [cmdInput, setCmdInput] = useState<string>('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [propsOpen, setPropsOpen] = useState<boolean>(false);

  const [lines, setLines] = useState<TermLine[]>([
    { id: 1, text: 'HyperTerminal Private Edition 7.0 — VT100 / ANSI Substation Console', kind: 'SYS' },
    { id: 2, text: 'Ready. Configure COM/TCP properties or click Call (Connect) to start console session.', kind: 'SYS' },
  ]);

  const termRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const seqRef = useRef<number>(3);

  useEffect(() => {
    saveState({
      sessionName,
      connected,
      connMode,
      targetDevice,
      baudRate,
      dataBits,
      parity,
      stopBits,
      flowControl,
      hostIp,
      tcpPort,
      themeColor,
      localEcho,
      showTimestamps,
    });
  }, [sessionName, connected, connMode, targetDevice, baudRate, dataBits, parity, stopBits, flowControl, hostIp, tcpPort, themeColor, localEcho, showTimestamps]);

  useEffect(() => {
    const close = () => setOpenMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

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
    if (targetDevice === 'SWITCH_HIOS') return '(RSP35-LAN-A)# ';
    if (targetDevice === 'RTU_GATEWAY') return 'gtw-132kv> ';
    return `IED[${bays[0]?.iedId || 'IED_132_L1'}]> `;
  }, [targetDevice, bays]);

  const appendLines = (entries: Array<{ text: string; kind?: TermLine['kind'] }>) => {
    const tsPrefix = showTimestamps ? `[${fmtClock()}] ` : '';
    const built = entries.map((e) => {
      seqRef.current += 1;
      return { id: seqRef.current, text: `${tsPrefix}${e.text}`, kind: e.kind || 'OUT' };
    });
    setLines((prev) => [...prev.slice(-300), ...built]);
    if (capturing) {
      setCapturedLines((prev) => [...prev, ...built.map((b) => b.text)]);
    }
  };

  const handleConnect = () => {
    setConnected(true);
    const linkInfo = connMode.startsWith('COM')
      ? `${connMode} (${baudRate} bps, ${dataBits}-${parity}-${stopBits}, Flow=${flowControl})`
      : `${connMode} ${hostIp}:${tcpPort}`;
    const banner: Array<{ text: string; kind?: TermLine['kind'] }> = [
      { text: `--- Connected via ${linkInfo} ---`, kind: 'OK' },
    ];
    if (targetDevice === 'SWITCH_HIOS') {
      banner.push({ text: 'Hirschmann RSP35-1103 Industrial Switch — HiOS-2A-09.4.03 Console', kind: 'SYS' });
      banner.push({ text: 'Type "help" or click any Quick Command macro above.', kind: 'SYS' });
    } else if (targetDevice === 'RTU_GATEWAY') {
      banner.push({ text: 'Substation Automation Gateway (IEC 61850 <-> IEC 60870-5-104) Maintenance CLI', kind: 'SYS' });
      banner.push({ text: 'Type "status", "show iec104", "show ieds", "show alarms", or "help".', kind: 'SYS' });
    } else {
      banner.push({ text: `Protection IED Front-Port RS-232 Maintenance (${bays[0]?.iedId || 'IED_132_L1'})`, kind: 'SYS' });
      banner.push({ text: 'Type "id", "status", "meas", "events", "self-test", or "help".', kind: 'SYS' });
    }
    appendLines(banner);
    window.setTimeout(() => inputRef.current?.focus(), 40);
  };

  const handleDisconnect = () => {
    setConnected(false);
    appendLines([{ text: '--- Session Disconnected (Carrier Lost) ---', kind: 'ERR' }]);
  };

  const handleSendBreak = () => {
    if (!connected) return;
    appendLines([{ text: '^C <BREAK SIGNAL SENT — Returning to EXEC prompt>', kind: 'SYS' }]);
  };

  const handleDownloadCapture = () => {
    const content = (capturedLines.length > 0 ? capturedLines : lines.map((l) => l.text)).join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sessionName.replace(/\.[^.]+$/, '')}_capture.txt`;
    a.click();
    URL.revokeObjectURL(url);
    appendLines([{ text: `Saved terminal capture log (${content.split('\n').length} lines).`, kind: 'OK' }]);
  };

  const handleCopyAll = async () => {
    try {
      await navigator.clipboard.writeText(lines.map((l) => l.text).join('\n'));
      appendLines([{ text: 'Copied terminal buffer to clipboard.', kind: 'OK' }]);
    } catch {
      appendLines([{ text: 'Clipboard access blocked by browser.', kind: 'ERR' }]);
    }
  };

  const executeCommand = (raw: string) => {
    const cmd = raw.trim();
    if (!connected) {
      appendLines([{ text: 'Not connected. Click "Call (Connect)" first.', kind: 'ERR' }]);
      return;
    }
    if (localEcho) {
      appendLines([{ text: `${promptStr}${cmd}`, kind: 'CMD' }]);
    }
    if (!cmd) return;

    setCmdHistory((prev) => [cmd, ...prev.slice(0, 40)]);
    setHistIdx(-1);

    const low = cmd.toLowerCase();
    if (low === 'clear' || low === 'cls') {
      setLines([]);
      return;
    }
    if (low === 'exit' || low === 'logout' || low === 'quit') {
      handleDisconnect();
      return;
    }

    const out: Array<{ text: string; kind?: TermLine['kind'] }> = [];
    const onlineIeds = ieds.filter((i) => i.commHealthy).length;
    const upLinks = networkLinks.filter((l) => l.status === 'UP').length;
    const activeAlarms = alarms.filter((a) => a.state !== 'CLEARED');
    const firstBay = bays[0];

    if (low === 'help' || low === '?') {
      if (targetDevice === 'SWITCH_HIOS') {
        out.push({ text: 'HiOS Commands: show sysinfo | show interface | show vlan | show prp | show ptp | show sfp | show lldp | ping <ip> | save | clear | exit', kind: 'OK' });
      } else if (targetDevice === 'RTU_GATEWAY') {
        out.push({ text: 'Gateway Commands: status | show iec104 | show ieds | show bays | show alarms | show soe | clock | ping <ip> | clear | exit', kind: 'OK' });
      } else {
        out.push({ text: 'IED Serial Commands: id | status | meas | events | self-test | set-remote | set-local | trip-reset | clear | exit', kind: 'OK' });
      }
    } else if (low.startsWith('ping ')) {
      const target = cmd.slice(5).trim() || hostIp;
      out.push({ text: `Pinging ${target} with 32 bytes of data:` });
      out.push({ text: `Reply from ${target}: bytes=32 time<1ms TTL=64`, kind: 'OK' });
      out.push({ text: `Reply from ${target}: bytes=32 time<1ms TTL=64`, kind: 'OK' });
      out.push({ text: `Reply from ${target}: bytes=32 time<1ms TTL=64`, kind: 'OK' });
      out.push({ text: `Packets: Sent=3, Received=3, Lost=0 (0% loss)`, kind: 'OK' });
    } else if (targetDevice === 'SWITCH_HIOS') {
      if (low === 'show sysinfo') {
        out.push({ text: 'Product      : Hirschmann RSP35-1103 (HiOS-2A-09.4.03)' });
        out.push({ text: `Management IP: ${hostIp} / 255.255.255.0` });
        out.push({ text: `Station Links: ${upLinks}/${networkLinks.length} UP | IEDs Reachable: ${onlineIeds}/${ieds.length}`, kind: 'OK' });
        out.push({ text: 'Power Supply : PSU1=OK (110V DC), PSU2=OK (110V DC), Temp=31 C' });
      } else if (low === 'show interface') {
        out.push({ text: 'Port   Media   Admin  Link  Speed      VLANs' });
        out.push({ text: '1/1    SFP-LX  Up     Up    1000M-FD   10,20,100' });
        out.push({ text: '1/2    SFP-LX  Up     Up    1000M-FD   10,20,100' });
        out.push({ text: '1/3    SFP-SX  Up     Up    1000M-FD   50 (ProcessBus)' });
        out.push({ text: '1/5    RJ45    Up     Up    100M-FD    10,20 (Bay IED)' });
      } else if (low === 'show vlan') {
        out.push({ text: 'VLAN  Name               Members' });
        out.push({ text: '10    StationBus_MMS     1/1,1/2,1/5,1/6' });
        out.push({ text: '20    GOOSE_Protection   1/1-1/5' });
        out.push({ text: '50    ProcessBus_SV      1/3,1/4' });
        out.push({ text: '100   Management         1/1,1/2,1/8' });
      } else if (low === 'show prp' || low === 'show mrp') {
        out.push({ text: `PRP/HSR Status : ACTIVE — ${upLinks}/${networkLinks.length} redundant links UP`, kind: 'OK' });
        out.push({ text: 'MRP Ring State : CLOSED (Recovery < 8 ms)' });
      } else if (low === 'show ptp') {
        out.push({ text: 'IEEE 1588 PTPv2: LOCKED (IEC 61850-9-3 Power Profile, Offset +16 ns)', kind: 'OK' });
      } else if (low === 'show sfp') {
        out.push({ text: 'Port  Part ID       Temp   TxPower    RxPower' });
        out.push({ text: '1/1   M-SFP-LX/LC   34 C   -5.0 dBm   -5.6 dBm' });
        out.push({ text: '1/2   M-SFP-LX/LC   35 C   -5.1 dBm   -5.8 dBm' });
      } else if (low === 'show lldp') {
        out.push({ text: '1/1 -> SW-LAN-B-01 (10.132.20.2) | 1/5 -> IED_132_L1 (10.132.10.11)' });
      } else if (low === 'save') {
        out.push({ text: 'Configuration saved to Non-Volatile Memory (NVM) & ACA22 USB.', kind: 'OK' });
      } else {
        out.push({ text: `% Unknown HiOS command: "${cmd}". Type "help".`, kind: 'ERR' });
      }
    } else if (targetDevice === 'RTU_GATEWAY') {
      if (low === 'status') {
        out.push({ text: `Gateway Uptime: 42d 07h 18m | IEC 61850 Clients: ${onlineIeds}/${ieds.length} ONLINE`, kind: 'OK' });
        out.push({ text: `Active Alarms : ${activeAlarms.length} | SOE Buffer: ${soeLog.length} events` });
      } else if (low === 'show iec104') {
        out.push({ text: 'IEC 60870-5-104 Server : Listening on TCP 2404 (CASDU=132, k=12, w=8)', kind: 'OK' });
        out.push({ text: 'RCC Master Session     : STARTDT ACTIVE (10.132.10.250)' });
      } else if (low === 'show ieds') {
        ieds.slice(0, 8).forEach((i) => {
          out.push({ text: `${i.name.padEnd(16)} ${i.ipAddressLanA.padEnd(15)} ${i.vendor.padEnd(12)} ${i.commHealthy ? 'ONLINE' : 'OFFLINE'}`, kind: i.commHealthy ? 'OK' : 'ERR' });
        });
      } else if (low === 'show bays') {
        bays.slice(0, 8).forEach((b) => {
          out.push({ text: `${b.bayCode.padEnd(10)} CB:${b.breakerState.padEnd(7)} 43LR:${b.localRemote.padEnd(7)} ${(b.voltageAbKv ?? b.voltageKv ?? 0).toFixed(1)}kV ${(b.activePowerMw ?? 0).toFixed(1)}MW` });
        });
      } else if (low === 'show alarms') {
        if (activeAlarms.length === 0) {
          out.push({ text: 'No active alarms in substation gateway.', kind: 'OK' });
        } else {
          activeAlarms.slice(0, 8).forEach((a) => {
            out.push({ text: `[${a.severity}] ${a.bayName} — ${a.message} (${a.state})`, kind: 'ERR' });
          });
        }
      } else if (low === 'show soe') {
        soeLog.slice(0, 8).forEach((s) => {
          out.push({ text: `${s.timestampMs.split('T')[1] || s.timestampMs}  ${s.bayName.padEnd(14)} ${s.eventDescription}` });
        });
      } else if (low === 'clock') {
        out.push({ text: `UTC System Time: ${new Date().toISOString()} (PTP Grandmaster Synced)`, kind: 'OK' });
      } else {
        out.push({ text: `% Unknown Gateway command: "${cmd}". Type "help".`, kind: 'ERR' });
      }
    } else {
      // IED_SERIAL
      if (low === 'id') {
        out.push({ text: `IED ID: ${firstBay?.iedId || 'IED_132_L1'} | Bay: ${firstBay?.name || '132 kV Line 1'} | CT: ${firstBay?.ctRatio || '800/1A'} | VT: ${firstBay?.vtRatio || '132kV/110V'}`, kind: 'OK' });
      } else if (low === 'status') {
        out.push({ text: `CB=${firstBay?.breakerState} | Q1=${firstBay?.busDisconnectorState} | Q8=${firstBay?.earthSwitchState} | 43LR=${firstBay?.localRemote} | 86Trip=${firstBay?.protectionTripActive ? 'ACTIVE' : 'NORMAL'}` });
      } else if (low === 'meas') {
        out.push({ text: `Vab=${(firstBay?.voltageAbKv ?? 132).toFixed(2)} kV | Ia=${(firstBay?.currentA ?? 0).toFixed(1)} A | P=${(firstBay?.activePowerMw ?? 0).toFixed(2)} MW | Freq=${(firstBay?.frequencyHz ?? 50).toFixed(2)} Hz`, kind: 'OK' });
      } else if (low === 'events') {
        soeLog.slice(0, 6).forEach((s) => out.push({ text: `${s.timestampMs.split('T')[1] || s.timestampMs}  ${s.eventDescription}` }));
      } else if (low === 'self-test') {
        out.push({ text: 'Relay Self-Diagnostics: Watchdog=OK, ADC=OK, RAM/Flash CRC=OK, 110V DC=OK', kind: 'OK' });
      } else if (low === 'set-remote' && firstBay) {
        setBayLocalRemote(firstBay.id, 'REMOTE');
        out.push({ text: `${firstBay.bayCode}: 43LR set to REMOTE.`, kind: 'OK' });
      } else if (low === 'set-local' && firstBay) {
        setBayLocalRemote(firstBay.id, 'LOCAL');
        out.push({ text: `${firstBay.bayCode}: 43LR set to LOCAL.`, kind: 'OK' });
      } else if (low === 'trip-reset' && firstBay) {
        resetProtectionTrip(firstBay.id);
        out.push({ text: `${firstBay.bayCode}: 86 Master Trip Lockout reset.`, kind: 'OK' });
      } else {
        out.push({ text: `% Unknown IED command: "${cmd}". Type "help".`, kind: 'ERR' });
      }
    }

    appendLines(out);
  };

  const termPalette = useMemo(() => {
    if (themeColor === 'AMBER') return { bg: '#100a00', fg: '#ffb000', cmd: '#fde047', err: '#ff5555', ok: '#fbbf24', sys: '#d97706' };
    if (themeColor === 'WHITE') return { bg: '#090d14', fg: '#e5e7eb', cmd: '#38bdf8', err: '#f87171', ok: '#4ade80', sys: '#94a3b8' };
    if (themeColor === 'PAPER') return { bg: '#ffffff', fg: '#111827', cmd: '#1d4ed8', err: '#b91c1c', ok: '#15803d', sys: '#475569' };
    return { bg: '#040c06', fg: '#33ff66', cmd: '#a7f3d0', err: '#ff6b6b', ok: '#4ade80', sys: '#22c55e' };
  }, [themeColor]);

  return (
    <div
      className="ht-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f0f0] text-[#000000] border border-[#606060] shadow-lg overflow-hidden select-none"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .ht-app, .ht-app {
          font-family: "Segoe UI", Tahoma, MS Sans Serif, sans-serif !important;
          background: #f0f0f0 !important;
          color: #000000 !important;
          color-scheme: light !important;
        }
        #root .ht-app * { text-shadow: none !important; }
        #root .ht-app input:not(.ht-cli-input), #root .ht-app select {
          background: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #808080 !important;
          border-radius: 0 !important;
          font-size: 11.5px !important;
          color-scheme: light !important;
        }
        #root .ht-app .ht-btn {
          background: #f0f0f0 !important;
          color: #000000 !important;
          border-top: 1px solid #ffffff !important;
          border-left: 1px solid #ffffff !important;
          border-right: 1px solid #808080 !important;
          border-bottom: 1px solid #808080 !important;
          padding: 2px 8px !important;
          font-size: 11px !important;
          cursor: pointer;
        }
        #root .ht-app .ht-btn:hover:not(:disabled) { background: #e2effb !important; }
        #root .ht-app .ht-btn:disabled { color: #808080 !important; cursor: default; }
        #root .ht-app .ht-btn.is-active {
          background: #d0e4f7 !important;
          border-top: 1px solid #808080 !important;
          border-left: 1px solid #808080 !important;
          border-right: 1px solid #ffffff !important;
          border-bottom: 1px solid #ffffff !important;
        }
        #root .ht-app .ht-menu-btn {
          background: transparent !important;
          color: #000000 !important;
          border: 1px solid transparent !important;
          padding: 1px 7px !important;
          font-size: 11.5px !important;
          cursor: pointer;
        }
        #root .ht-app .ht-menu-btn:hover, #root .ht-app .ht-menu-btn.active {
          background: #0a246a !important;
          color: #ffffff !important;
        }
      `}</style>

      {/* 1. CLASSIC WINDOWS TITLE BAR */}
      <div className="h-[26px] bg-gradient-to-r from-[#0a246a] via-[#1c4b9e] to-[#a6caf0] text-white px-2 flex items-center justify-between shrink-0 text-[12px] font-bold">
        <div className="flex items-center gap-1.5">
          <span className="bg-[#facc15] text-[#0f172a] font-black text-[9.5px] px-1 border border-[#1e293b]">HT</span>
          <span>{`${sessionName} - HyperTerminal`}</span>
        </div>
        <div className="font-mono text-[11px] flex items-center gap-2">
          <span>{connected ? `Connected ${fmtElapsed(elapsedSec)}` : 'Disconnected'}</span>
        </div>
      </div>

      {/* 2. CLASSIC HYPERTERMINAL MENU BAR */}
      <div
        className="h-[22px] bg-[#f0f0f0] border-b border-[#b0b0b0] px-1 flex items-center gap-0.5 shrink-0 relative z-30"
        onClick={(e) => e.stopPropagation()}
      >
        {(
          [
            ['File', [
              { label: 'New Connection / Properties...', action: () => setPropsOpen(true) },
              { label: 'Save Session Capture (.txt)...', action: handleDownloadCapture },
              { label: 'Clear Terminal Screen', action: () => setLines([]) },
            ]],
            ['Edit', [
              { label: 'Copy All Terminal Output', action: handleCopyAll },
              { label: `${localEcho ? '✓ ' : '   '}Local Echo Typed Characters`, action: () => setLocalEcho((v) => !v) },
              { label: `${showTimestamps ? '✓ ' : '   '}Show Line Timestamps`, action: () => setShowTimestamps((v) => !v) },
            ]],
            ['View', [
              { label: `${themeColor === 'GREEN' ? '● ' : '   '}Phosphor Green (VT100)`, action: () => setThemeColor('GREEN') },
              { label: `${themeColor === 'AMBER' ? '● ' : '   '}Phosphor Amber`, action: () => setThemeColor('AMBER') },
              { label: `${themeColor === 'WHITE' ? '● ' : '   '}Crisp White on Dark`, action: () => setThemeColor('WHITE') },
              { label: `${themeColor === 'PAPER' ? '● ' : '   '}Classic Paper (Black on White)`, action: () => setThemeColor('PAPER') },
            ]],
            ['Call', [
              { label: 'Call (Connect)', action: handleConnect, disabled: connected },
              { label: 'Disconnect', action: handleDisconnect, disabled: !connected },
              { label: 'Send Break (Ctrl+Break)', action: handleSendBreak, disabled: !connected },
            ]],
            ['Transfer', [
              { label: capturing ? 'Stop Capture Text' : 'Start Capture Text...', action: () => setCapturing((v) => !v) },
              { label: 'Download Captured Text (.txt)', action: handleDownloadCapture },
            ]],
          ] as Array<[string, Array<{ label: string; action: () => void; disabled?: boolean }>]>
        ).map(([mName, items]) => (
          <div key={mName} className="relative">
            <button
              type="button"
              className={`ht-menu-btn ${openMenu === mName ? 'active' : ''}`}
              onClick={() => setOpenMenu((m) => (m === mName ? null : mName))}
            >
              {mName}
            </button>
            {openMenu === mName && (
              <div className="absolute left-0 top-full w-56 bg-[#f0f0f0] border-t border-l border-white border-r-2 border-b-2 border-r-[#404040] border-b-[#404040] shadow-lg py-0.5 z-40">
                {items.map((it) => (
                  <button
                    key={it.label}
                    type="button"
                    disabled={it.disabled}
                    onClick={() => { setOpenMenu(null); it.action(); }}
                    className="w-full text-left px-3 py-1 text-[11.5px] text-black hover:bg-[#316ac5] hover:text-white disabled:text-[#808080]"
                  >
                    {it.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 3. CLASSIC 3D ICON TOOLBAR */}
      <div className="bg-[#f0f0f0] border-b border-[#808080] px-1.5 py-1 flex flex-wrap items-center gap-1.5 shrink-0 text-[11px]">
        <button type="button" className={`ht-btn font-bold ${connected ? 'is-active' : ''}`} onClick={connected ? handleDisconnect : handleConnect}>
          {connected ? '☎ Disconnect' : '☎ Call (Connect)'}
        </button>
        <button type="button" className="ht-btn" onClick={() => setPropsOpen(true)}>
          ⚙ Properties
        </button>
        <button type="button" className={`ht-btn ${capturing ? 'is-active font-bold' : ''}`} onClick={() => setCapturing((v) => !v)}>
          {capturing ? '● Capturing...' : '⏺ Capture Text'}
        </button>
        <button type="button" className="ht-btn" onClick={handleDownloadCapture}>
          💾 Save Log
        </button>
        <button type="button" className="ht-btn" disabled={!connected} onClick={handleSendBreak}>
          ⚡ Break
        </button>
        <button type="button" className="ht-btn" onClick={() => setLines([])}>
          Clear
        </button>

        <div className="w-[2px] h-5 border-l border-[#808080] border-r border-white mx-0.5" />

        <label className="flex items-center gap-1">
          <span className="font-semibold">Target:</span>
          <select value={targetDevice} onChange={(e) => setTargetDevice(e.target.value as TargetDevice)} className="h-[21px] px-1 font-semibold">
            <option value="SWITCH_HIOS">Hirschmann Switch (HiOS CLI)</option>
            <option value="RTU_GATEWAY">Station RTU / Gateway Console</option>
            <option value="IED_SERIAL">Protection IED (RS-232 Front Port)</option>
          </select>
        </label>

        <label className="flex items-center gap-1">
          <span className="font-semibold">Port:</span>
          <select value={connMode} onChange={(e) => setConnMode(e.target.value as ConnMode)} className="h-[21px] px-1 font-mono">
            <option value="COM1">COM1 (RS-232)</option>
            <option value="COM2">COM2 (RS-232)</option>
            <option value="COM3">COM3 (USB-Serial)</option>
            <option value="TCP_TELNET">TCP/IP (Telnet)</option>
            <option value="SSH">SSH (TCP 22)</option>
          </select>
        </label>
      </div>

      {/* 4. QUICK COMMAND MACROS BAR */}
      <div className="bg-[#e8e8e8] border-b border-[#a0a0a0] px-2 py-1 flex flex-wrap items-center gap-1 shrink-0 text-[10.5px]">
        <span className="font-bold text-[#0a246a] mr-1">Quick Macros:</span>
        {DEVICE_MACROS[targetDevice].map((m) => (
          <button
            key={m.cmd}
            type="button"
            className="ht-btn font-mono !py-0 !px-2 !text-[10.5px]"
            onClick={() => {
              if (!connected) handleConnect();
              window.setTimeout(() => executeCommand(m.cmd), connected ? 0 : 20);
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* 5. AUTHENTIC VT100 TERMINAL VIEWPORT */}
      <div
        ref={termRef}
        onClick={() => inputRef.current?.focus()}
        className="flex-1 overflow-auto p-3 font-mono text-[12.5px] leading-[1.45] cursor-text select-text"
        style={{ background: termPalette.bg, color: termPalette.fg }}
      >
        {lines.map((ln) => (
          <div
            key={ln.id}
            className="whitespace-pre-wrap"
            style={{
              color:
                ln.kind === 'CMD'
                  ? termPalette.cmd
                  : ln.kind === 'ERR'
                  ? termPalette.err
                  : ln.kind === 'OK'
                  ? termPalette.ok
                  : ln.kind === 'SYS'
                  ? termPalette.sys
                  : termPalette.fg,
            }}
          >
            {ln.text}
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
            <span className="mr-1 font-bold" style={{ color: termPalette.cmd }}>
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
                  const nextIdx = Math.min(cmdHistory.length - 1, histIdx + 1);
                  setHistIdx(nextIdx);
                  setCmdInput(cmdHistory[nextIdx]);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const nextIdx = histIdx - 1;
                  if (nextIdx < 0) {
                    setHistIdx(-1);
                    setCmdInput('');
                  } else {
                    setHistIdx(nextIdx);
                    setCmdInput(cmdHistory[nextIdx]);
                  }
                }
              }}
              className="ht-cli-input flex-1 bg-transparent border-0 outline-none font-mono text-[12.5px]"
              style={{ color: termPalette.fg, caretColor: termPalette.fg }}
              autoFocus
            />
          </form>
        )}
      </div>

      {/* 6. CLASSIC WINDOWS HYPERTERMINAL STATUS BAR */}
      <div className="h-[22px] bg-[#f0f0f0] border-t border-[#808080] px-1.5 flex items-center gap-2 text-[11px] font-mono shrink-0">
        <span className="border-r border-[#a0a0a0] pr-2 min-w-[130px]">
          {connected ? `Connected ${fmtElapsed(elapsedSec)}` : 'Disconnected'}
        </span>
        <span className="border-r border-[#a0a0a0] pr-2">VT100</span>
        <span className="border-r border-[#a0a0a0] pr-2 flex-1 truncate">
          {connMode.startsWith('COM')
            ? `${connMode} ${baudRate} ${dataBits}-${parity}-${stopBits} (${flowControl})`
            : `${connMode} ${hostIp}:${tcpPort}`}
        </span>
        <span className="border-r border-[#a0a0a0] pr-2" style={{ color: capturing ? '#b91c1c' : '#808080', fontWeight: capturing ? 700 : 400 }}>
          Capture
        </span>
        <span className="text-[#808080]">SCROLL</span>
        <span className="text-[#000000]">NUM</span>
      </div>

      {/* CONNECTION PROPERTIES DIALOG */}
      {propsOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[420px] bg-[#f0f0f0] border-t-2 border-l-2 border-white border-r-2 border-b-2 border-r-[#404040] border-b-[#404040] shadow-xl text-[12px]">
            <div className="h-[24px] bg-gradient-to-r from-[#0a246a] to-[#a6caf0] text-white px-2 flex items-center justify-between font-bold text-[11.5px]">
              <span>{`${sessionName} Properties`}</span>
              <button type="button" className="ht-btn !px-1.5 !py-0 !text-[10px]" onClick={() => setPropsOpen(false)}>✕</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="font-semibold">Session Name:</label>
                <input value={sessionName} onChange={(e) => setSessionName(e.target.value)} className="col-span-2 h-[22px] px-1.5" />

                <label className="font-semibold">Connect Using:</label>
                <select value={connMode} onChange={(e) => setConnMode(e.target.value as ConnMode)} className="col-span-2 h-[22px] px-1">
                  <option value="COM1">COM1</option>
                  <option value="COM2">COM2</option>
                  <option value="COM3">COM3</option>
                  <option value="TCP_TELNET">TCP/IP (Winsock / Telnet)</option>
                  <option value="SSH">SSH (TCP 22)</option>
                </select>

                {connMode.startsWith('COM') ? (
                  <>
                    <label className="font-semibold">Bits per second:</label>
                    <select value={baudRate} onChange={(e) => setBaudRate(Number(e.target.value))} className="col-span-2 h-[22px] px-1 font-mono">
                      {[9600, 19200, 38400, 57600, 115200].map((b) => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                    <label className="font-semibold">Data / Parity / Stop:</label>
                    <div className="col-span-2 flex gap-1.5">
                      <select value={dataBits} onChange={(e) => setDataBits(Number(e.target.value) as 7 | 8)} className="h-[22px] px-1 flex-1 font-mono">
                        <option value={8}>8</option>
                        <option value={7}>7</option>
                      </select>
                      <select value={parity} onChange={(e) => setParity(e.target.value as ParityType)} className="h-[22px] px-1 flex-1 font-mono">
                        <option value="N">None (N)</option>
                        <option value="E">Even (E)</option>
                        <option value="O">Odd (O)</option>
                      </select>
                      <select value={stopBits} onChange={(e) => setStopBits(Number(e.target.value) as 1 | 2)} className="h-[22px] px-1 flex-1 font-mono">
                        <option value={1}>1</option>
                        <option value={2}>2</option>
                      </select>
                    </div>
                    <label className="font-semibold">Flow Control:</label>
                    <select value={flowControl} onChange={(e) => setFlowControl(e.target.value as FlowControl)} className="col-span-2 h-[22px] px-1">
                      <option value="None">None</option>
                      <option value="Hardware">Hardware (RTS/CTS)</option>
                      <option value="Xon/Xoff">Xon / Xoff</option>
                    </select>
                  </>
                ) : (
                  <>
                    <label className="font-semibold">Host Address:</label>
                    <input value={hostIp} onChange={(e) => setHostIp(e.target.value)} className="col-span-2 h-[22px] px-1.5 font-mono" />
                    <label className="font-semibold">Port Number:</label>
                    <input type="number" value={tcpPort} onChange={(e) => setTcpPort(Number(e.target.value) || 23)} className="col-span-2 h-[22px] px-1.5 font-mono" />
                  </>
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#c0c0c0]">
                <button type="button" className="ht-btn font-bold min-w-[70px]" onClick={() => setPropsOpen(false)}>
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

export default HyperTerminalTool;
