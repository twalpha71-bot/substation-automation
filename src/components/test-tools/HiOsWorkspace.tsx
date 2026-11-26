import React, { useEffect, useMemo, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// Hirschmann HiOS-2A-09.4.03 — Full Interactive Embedded Switch Web-GUI Engine
// Every sidebar menu item provides real stateful editing, tables, add/delete,
// VLAN per-port tagging matrix (T/U/-), ACL/User/MAC editors, TDR cable test,
// live DOM SFP readings, config consistency audit, and XML config export.
// ============================================================================

export interface HiViewSwitchRecord {
  id: string;
  name: string;
  model: string;
  ip: string;
  netmask: string;
  gateway: string;
  mac: string;
  firmware: string;
  redundancyRole: string;
  ptpStatus: string;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  passwordChanged: boolean;
}

export interface HiOsSyslogRow {
  id: number;
  time: string;
  sev: 'INFO' | 'WARN' | 'CRIT';
  msg: string;
}

export type PortTagMode = 'T' | 'U' | '-';

export interface HiOsVlanRow {
  vid: number;
  name: string;
  priority: number;
  ports: Record<string, PortTagMode>;
}

export const DEFAULT_HIOS_VLANS: HiOsVlanRow[] = [
  {
    vid: 1, name: 'MGMT', priority: 0,
    ports: { '1/1': 'U', '1/2': 'U', '1/3': '-', '1/4': '-', '1/5': '-', '1/6': '-', '1/7': '-', '1/8': '-' },
  },
  {
    vid: 100, name: 'STATION_MMS', priority: 2,
    ports: { '1/1': 'T', '1/2': 'T', '1/3': 'T', '1/4': 'T', '1/5': 'U', '1/6': 'U', '1/7': 'U', '1/8': 'U' },
  },
  {
    vid: 200, name: 'GOOSE_TRIP', priority: 4,
    ports: { '1/1': 'T', '1/2': 'T', '1/3': 'T', '1/4': '-', '1/5': 'T', '1/6': 'T', '1/7': 'T', '1/8': 'T' },
  },
  {
    vid: 300, name: 'PROCESS_SV', priority: 4,
    ports: { '1/1': 'T', '1/2': 'T', '1/3': 'T', '1/4': 'T', '1/5': '-', '1/6': '-', '1/7': '-', '1/8': '-' },
  },
];

interface HiOsWorkspaceProps {
  sw: HiViewSwitchRecord;
  hiosPage: string;
  activeTitle: string;
  ringBroken: boolean;
  onToggleRingBreak: () => void;
  disabledPorts: Record<string, boolean>;
  onTogglePort: (portId: string) => void;
  vlans: HiOsVlanRow[];
  onChangeVlans: (next: HiOsVlanRow[]) => void;
  syslogs: HiOsSyslogRow[];
  onPushLog: (sev: 'INFO' | 'WARN' | 'CRIT', msg: string) => void;
  onClearLogs: () => void;
  onOpenSsh: () => void;
  onUpdateIp: (ip: string, mask: string, gw: string) => void;
  onMarkDirty: () => void;
  onSaveNvm: () => void;
}

interface AclRule {
  id: number;
  action: 'Permit' | 'Deny';
  src: string;
  dst: string;
  proto: string;
  desc: string;
  enabled: boolean;
}

interface UserRow {
  username: string;
  role: 'Administrator' | 'Operator' | 'Auditor' | 'Guest';
  active: boolean;
  snmpv3: string;
}

interface StaticMacRow {
  id: number;
  mac: string;
  vlan: number;
  ports: string;
  desc: string;
}

const PORT_IDS = ['1/1', '1/2', '1/3', '1/4', '1/5', '1/6', '1/7', '1/8'];

export const HiOsWorkspace: React.FC<HiOsWorkspaceProps> = ({
  sw,
  hiosPage,
  activeTitle,
  ringBroken,
  onToggleRingBreak,
  disabledPorts,
  onTogglePort,
  vlans,
  onChangeVlans,
  syslogs,
  onPushLog,
  onClearLogs,
  onOpenSsh,
  onUpdateIp,
  onMarkDirty,
  onSaveNvm,
}) => {
  const [liveSec, setLiveSec] = useState<number>(0);
  const [selectedFrontPort, setSelectedFrontPort] = useState<string | null>(null);
  const [psu2Fault, setPsu2Fault] = useState<boolean>(false);
  const [sfpLowRx, setSfpLowRx] = useState<boolean>(false);

  useEffect(() => {
    const timer = window.setInterval(() => setLiveSec((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);

  const liveCpuPct = 18 + ((liveSec * 3) % 9);
  const liveTempC = 31 + ((liveSec >> 2) % 3);
  const livePtpNs = 14 + ((liveSec * 5) % 9);
  const liveUptimeStr = useMemo(() => {
    const total = 42 * 86400 + 7 * 3600 + 18 * 60 + liveSec;
    const d = Math.floor(total / 86400);
    const h = Math.floor((total % 86400) / 3600);
    const m = Math.floor((total % 3600) / 60);
    const s = total % 60;
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d}d ${p(h)}h ${p(m)}m ${p(s)}s`;
  }, [liveSec]);

  const frontPortMeta: Record<string, { media: 'SFP' | 'RJ45'; speed: string; vlan: string; neighbor: string; baseMbps: number }> = {
    '1/1': { media: 'SFP', speed: '1000M-LX', vlan: '10,20,100', neighbor: 'SW-LAN-B-01 (Ring P1)', baseMbps: 142.4 },
    '1/2': { media: 'SFP', speed: '1000M-LX', vlan: '10,20,100', neighbor: 'RED25-REDBOX-01 (Ring P2)', baseMbps: 118.9 },
    '1/3': { media: 'SFP', speed: '1000M-SX', vlan: '50 (SV)', neighbor: 'MU-132-L1 (Process Bus)', baseMbps: 215.6 },
    '1/4': { media: 'SFP', speed: '1000M-LX', vlan: '10,20', neighbor: 'Uplink Station Core', baseMbps: 164.2 },
    '1/5': { media: 'RJ45', speed: '100M-FD', vlan: '10,20', neighbor: 'IED_132_L1 (SIPROTEC 5)', baseMbps: 12.8 },
    '1/6': { media: 'RJ45', speed: '100M-FD', vlan: '10,20', neighbor: 'IED_132_T1 (REL670)', baseMbps: 11.4 },
    '1/7': { media: 'RJ45', speed: '100M-FD', vlan: '10,20', neighbor: 'GTW-01 (IEC-104)', baseMbps: 18.2 },
    '1/8': { media: 'RJ45', speed: '1000M-FD', vlan: '100 (Mgmt)', neighbor: 'Engineering PC (HiView)', baseMbps: 6.5 },
  };

  const { ieds } = useSubstationStore();

  // Basic Settings -> System
  const [sysName, setSysName] = useState(sw.name);
  const [sysLocation, setSysLocation] = useState('132kV Substation Control Room — Panel A1');
  const [sysContact, setSysContact] = useState('Hirschmann Automation & SAS Team');
  const [tempUpper, setTempUpper] = useState(70);
  const [tempLower, setTempLower] = useState(0);
  const [humUpper, setHumUpper] = useState(95);

  // Basic Settings -> Network
  const [netIp, setNetIp] = useState(sw.ip);
  const [netMask, setNetMask] = useState(sw.netmask);
  const [netGw, setNetGw] = useState(sw.gateway);
  const [mgmtVlan, setMgmtVlan] = useState(1);
  const [ipAssignMode, setIpAssignMode] = useState<'Local' | 'BOOTP' | 'DHCP'>('Local');
  const [hiDiscMode, setHiDiscMode] = useState<'Read/Write' | 'Read Only' | 'Off'>('Read/Write');

  // Basic Settings -> Port
  const [portAliases, setPortAliases] = useState<Record<string, string>>({
    '1/1': 'MRP Ring Primary (Fiber)',
    '1/2': 'MRP Ring Secondary (Fiber)',
    '1/3': 'PRP Interlink Fiber',
    '1/4': 'PTP Grandmaster Clock',
    '1/5': 'IED_132_L1 (SIPROTEC 7SA87)',
    '1/6': 'IED_132_L2 (Multilin D60)',
    '1/7': 'IED_132_BC (MiCOM C264)',
    '1/8': 'IED_132_T1 (SIPROTEC 7UT86)',
  });
  const [portPvids, setPortPvids] = useState<Record<string, number>>({
    '1/1': 1, '1/2': 1, '1/3': 100, '1/4': 100, '1/5': 200, '1/6': 200, '1/7': 200, '1/8': 200,
  });

  // Basic Settings -> External Memory (ACA22)
  const [acaAutoLoad, setAcaAutoLoad] = useState(true);
  const [acaAutoSave, setAcaAutoSave] = useState(true);
  const [acaSwUpdate, setAcaSwUpdate] = useState(false);

  // Time -> Basic / SNTP / PTP
  const [tzOffset, setTzOffset] = useState('UTC+05:30 (IST)');
  const [sntpOn, setSntpOn] = useState(true);
  const [sntpMode, setSntpMode] = useState<'Unicast' | 'Broadcast'>('Unicast');
  const [sntpPrimary, setSntpPrimary] = useState('10.132.10.240');
  const [sntpSecondary, setSntpSecondary] = useState('10.132.10.241');
  const [sntpPoll, setSntpPoll] = useState(64);

  const [ptpOn, setPtpOn] = useState(true);
  const [ptpProfile, setPtpProfile] = useState('IEC 61850-9-3 Power Profile');
  const [ptpMode, setPtpMode] = useState<'P2P Transparent Clock' | 'E2E Transparent Clock' | 'Boundary Clock'>('P2P Transparent Clock');
  const [ptpDomain, setPtpDomain] = useState(0);
  const [ptpPorts, setPtpPorts] = useState<Record<string, boolean>>({
    '1/1': true, '1/2': true, '1/3': true, '1/4': true, '1/5': true, '1/6': true, '1/7': true, '1/8': true,
  });

  // Device Security
  const [users, setUsers] = useState<UserRow[]>([
    { username: 'admin', role: 'Administrator', active: true, snmpv3: 'SHA / AES-128' },
    { username: 'sas_eng', role: 'Operator', active: true, snmpv3: 'SHA / AES-128' },
    { username: 'user', role: 'Guest', active: false, snmpv3: 'None' },
  ]);
  const [newUsername, setNewUsername] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRow['role']>('Operator');
  const [mgmtProto, setMgmtProto] = useState<Record<string, boolean>>({
    'HTTP (80)': false,
    'HTTPS (443)': true,
    'Telnet (23)': false,
    'SSH (22)': true,
    'SNMPv1/v2c': false,
    'SNMPv3': true,
    'HiDiscovery v2': true,
  });
  const [bannerOn, setBannerOn] = useState(true);
  const [bannerText, setBannerText] = useState('AUTHORIZED SUBSTATION AUTOMATION PERSONNEL ONLY. All HiOS/SSH sessions are audited.');

  // Network Security
  const [portSecMax, setPortSecMax] = useState<Record<string, number>>({ '1/5': 1, '1/6': 1, '1/7': 1, '1/8': 1 });
  const [radiusIp, setRadiusIp] = useState('10.132.10.245');
  const [radiusPort, setRadiusPort] = useState(1812);
  const [acls, setAcls] = useState<AclRule[]>([
    { id: 10, action: 'Permit', src: '10.132.10.0/24', dst: 'TCP 102', proto: 'TCP', desc: 'IEC 61850 MMS Station Bus', enabled: true },
    { id: 20, action: 'Permit', src: '10.132.10.100/32', dst: 'TCP 443, 22', proto: 'TCP', desc: 'Engineering PC HiView / SSH', enabled: true },
    { id: 99, action: 'Deny', src: 'Any', dst: 'TCP 23', proto: 'TCP', desc: 'Block Cleartext Telnet', enabled: true },
  ]);
  const [newAclAction, setNewAclAction] = useState<'Permit' | 'Deny'>('Permit');
  const [newAclSrc, setNewAclSrc] = useState('10.132.10.0/24');
  const [newAclDst, setNewAclDst] = useState('TCP 502');
  const [newAclDesc, setNewAclDesc] = useState('Modbus TCP Gateway');
  const [dosFlags, setDosFlags] = useState<Record<string, boolean>>({
    'Land Attack': true, 'TCP SYN/FIN': true, 'Smurf Attack': true, 'ICMP Fragment': true, 'TCP Null Scan': true,
  });

  // Switching -> Global / Rate / MAC / IGMP / QoS / VLAN / Redundancy
  const [agingSec, setAgingSec] = useState(300);
  const [flowCtrlGlobal, setFlowCtrlGlobal] = useState(false);
  const [bcastLimit, setBcastLimit] = useState(10);
  const [mcastLimit, setMcastLimit] = useState(25);
  const [igmpOn, setIgmpOn] = useState(true);
  const [igmpQuerier, setIgmpQuerier] = useState(true);
  const [igmpFastLeave, setIgmpFastLeave] = useState(true);
  const [qosMap, setQosMap] = useState<Record<number, number>>({ 0: 1, 1: 1, 2: 3, 3: 3, 4: 6, 5: 6, 6: 7, 7: 7 });

  const [staticMacs, setStaticMacs] = useState<StaticMacRow[]>([
    { id: 1, mac: '01:0C:CD:01:00:01', vlan: 200, ports: '1/1, 1/5, 1/6, 1/7', desc: 'GOOSE Trip Bus 132kV' },
    { id: 2, mac: '01:0C:CD:01:00:02', vlan: 200, ports: '1/1, 1/7, 1/8', desc: 'GOOSE Interlocking CILO' },
  ]);
  const [newMacAddr, setNewMacAddr] = useState('01:0C:CD:01:00:03');
  const [newMacVlan, setNewMacVlan] = useState(200);
  const [newMacPorts, setNewMacPorts] = useState('1/1, 1/5, 1/8');

  const setVlans = (updater: HiOsVlanRow[] | ((prev: HiOsVlanRow[]) => HiOsVlanRow[])) => {
    const next = typeof updater === 'function' ? updater(vlans) : updater;
    onChangeVlans(next);
  };
  const [newVid, setNewVid] = useState(400);
  const [newVlanName, setNewVlanName] = useState('PRP_SYNC');
  const [newVlanPrio, setNewVlanPrio] = useState(4);

  const [mrpRole, setMrpRole] = useState<'Ring Manager' | 'Ring Client'>('Ring Manager');
  const [mrpRecovery, setMrpRecovery] = useState<'< 10 ms (Fast)' | '200 ms' | '500 ms'>('< 10 ms (Fast)');
  const [rstpPrio, setRstpPrio] = useState(32768);

  // Diagnostics
  const [sfpJitter, setSfpJitter] = useState(0);
  const [cableTestedAt, setCableTestedAt] = useState('Not run yet');
  const [mirrorOn, setMirrorOn] = useState(true);
  const [mirrorSrc, setMirrorSrc] = useState('1/5');
  const [mirrorDst, setMirrorDst] = useState('1/8');
  const [mirrorDir, setMirrorDir] = useState<'TX & RX' | 'RX Only' | 'TX Only'>('TX & RX');
  const [smtpHost, setSmtpHost] = useState('10.132.10.248');
  const [smtpTo, setSmtpTo] = useState('sas-ops@substation.local');

  // Advanced
  const [indProtos, setIndProtos] = useState<Record<string, boolean>>({
    'IEC 61850 MMS (TCP 102)': true,
    'Modbus TCP (TCP 502)': true,
    'PROFINET IO': false,
    'EtherNet/IP': false,
  });
  const [dhcpSrvOn, setDhcpSrvOn] = useState(false);
  const [dhcpRelayOn, setDhcpRelayOn] = useState(false);
  const [cliPrompt, setCliPrompt] = useState(`*(${sw.model.split('-')[0]})>`);

  // Dynamic Security Warnings Count (matches real HiOS Security Status KPI!)
  const securityWarnings = useMemo(() => {
    let w = 0;
    if (!sw.passwordChanged) w += 2;
    if (mgmtProto['HTTP (80)']) w += 1;
    if (mgmtProto['Telnet (23)']) w += 1;
    if (mgmtProto['SNMPv1/v2c']) w += 1;
    return w;
  }, [sw.passwordChanged, mgmtProto]);

  const cycleVlanPort = (vid: number, portId: string) => {
    const order: PortTagMode[] = ['T', 'U', '-'];
    setVlans((prev) =>
      prev.map((v) => {
        if (v.vid !== vid) return v;
        const cur = v.ports[portId] || '-';
        const next = order[(order.indexOf(cur) + 1) % order.length];
        return { ...v, ports: { ...v.ports, [portId]: next } };
      })
    );
    onMarkDirty();
  };

  const handleExportXml = () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<HiOSConfig device="${sysName}" firmware="${sw.firmware}" ip="${netIp}">\n  <VLANs count="${vlans.length}">\n${vlans
      .map((v) => `    <VLAN id="${v.vid}" name="${v.name}" priority="${v.priority}"/>`)
      .join('\n')}\n  </VLANs>\n  <PTPv2 enabled="${ptpOn}" profile="${ptpProfile}" domain="${ptpDomain}"/>\n  <SNTP enabled="${sntpOn}" primary="${sntpPrimary}" secondary="${sntpSecondary}"/>\n</HiOSConfig>`;
    const blob = new Blob([xml], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${sysName}_config.xml`;
    a.click();
    URL.revokeObjectURL(url);
    onPushLog('INFO', `${sysName}: Exported configuration XML (${sysName}_config.xml).`);
  };

  const handleApplyCurrent = () => {
    onMarkDirty();
    if (hiosPage === 'SYS_NETWORK' || hiosPage === 'SYS_NET_IPV4') {
      onUpdateIp(netIp, netMask, netGw);
    }
    onPushLog('INFO', `${sysName}: Applied changes on [${activeTitle}]. Click floppy icon to save to NVM.`);
  };

  const sfpRows = [
    { port: '1/1', partId: 'M-SFP-LX/LC', serial: 'A2123455', conn: 'LC', temp: 34 + (sfpJitter % 2), txMw: '0.3162', rxMw: '0.2754', txDbm: '-5.0', rxDbm: '-5.6' },
    { port: '1/2', partId: 'M-SFP-LX/LC', serial: 'A2123456', conn: 'LC', temp: 35 + (sfpJitter % 2), txMw: '0.3098', rxMw: ringBroken ? '0.0001' : '0.2655', txDbm: '-5.0', rxDbm: ringBroken ? '-40.0 (LOS)' : '-5.9' },
    { port: '1/3', partId: 'M-SFP-SX/LC', serial: 'A2123457', conn: 'LC', temp: 36, txMw: '0.2818', rxMw: '0.2399', txDbm: '-5.5', rxDbm: '-6.2' },
    { port: '1/4', partId: 'M-SFP-LX/LC', serial: 'A2123458', conn: 'LC', temp: 35, txMw: '0.3020', rxMw: '0.2512', txDbm: '-5.2', rxDbm: '-6.0' },
  ];

  return (
    <div className="flex-1 overflow-auto p-3.5 space-y-3 bg-[#eaeaea] relative pb-16">
      {/* LIVE REAL-TIME HIRSCHMANN RSP35 / RED25 FRONT-PANEL HARDWARE CHASSIS */}
      <div className="bg-[#1b2430] text-[#e2e8f0] border-2 border-[#475569] rounded-[3px] shadow-md overflow-hidden">
        <div className="bg-[#0f172a] border-b border-[#334155] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            {(() => {
              const knownVendors = ['Hirschmann', 'Siemens', 'ABB', 'GE', 'Cisco', 'Moxa', 'Schneider'];
              const matchedVendor = knownVendors.find((v) => sw.model.toLowerCase().startsWith(v.toLowerCase()));
              const brandLabel = matchedVendor ? matchedVendor.toUpperCase() : 'HIRSCHMANN';
              const modelLabel = matchedVendor ? sw.model.slice(matchedVendor.length).trim() || sw.model : sw.model;
              return (
                <>
                  <span className="font-extrabold tracking-wider text-[#38bdf8]">{brandLabel}</span>
                  <span className="font-mono font-bold text-white">{modelLabel}</span>
                </>
              );
            })()}
            <span className="text-[#94a3b8]">|</span>
            <span className="font-mono text-[#4ade80]">Uptime: {liveUptimeStr}</span>
            <span className="text-[#94a3b8]">|</span>
            <span className="font-mono text-[#bae6fd]">CPU: {liveCpuPct}% · Temp: {liveTempC}°C · PTP: +{livePtpNs} ns</span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={onToggleRingBreak}
              className="px-2 py-0.5 rounded-[2px] text-[10.5px] font-bold cursor-pointer border"
              style={{
                background: ringBroken ? '#dc2626' : '#1e293b',
                color: '#ffffff',
                borderColor: ringBroken ? '#f87171' : '#475569',
              }}
            >
              {ringBroken ? 'Restore Fiber 1/2' : 'Sim Fiber Break (1/2)'}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !psu2Fault;
                setPsu2Fault(next);
                onPushLog(next ? 'CRIT' : 'INFO', next ? `${sw.name}: Power Supply 2 (PSU2) DC input lost — Signal Contact 1 OPEN.` : `${sw.name}: Power Supply 2 (PSU2) restored OK.`);
              }}
              className="px-2 py-0.5 rounded-[2px] text-[10.5px] font-bold cursor-pointer border"
              style={{
                background: psu2Fault ? '#dc2626' : '#1e293b',
                color: '#ffffff',
                borderColor: psu2Fault ? '#f87171' : '#475569',
              }}
            >
              {psu2Fault ? 'Restore PSU2' : 'Sim PSU2 Fail'}
            </button>
            <button
              type="button"
              onClick={() => {
                const next = !sfpLowRx;
                setSfpLowRx(next);
                onPushLog(next ? 'WARN' : 'INFO', next ? `${sw.name}: SFP Port 1/1 Rx optical power low (-19.8 dBm warning threshold).` : `${sw.name}: SFP Port 1/1 Rx optical power normal (-5.6 dBm).`);
              }}
              className="px-2 py-0.5 rounded-[2px] text-[10.5px] font-bold cursor-pointer border"
              style={{
                background: sfpLowRx ? '#d97706' : '#1e293b',
                color: '#ffffff',
                borderColor: sfpLowRx ? '#fbbf24' : '#475569',
              }}
            >
              {sfpLowRx ? 'Clear SFP Warn' : 'Sim SFP Low Rx'}
            </button>
          </div>
        </div>

        {/* PHYSICAL LEDs + CLICKABLE PORTS */}
        <div className="px-3 py-2.5 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2.5 bg-[#0f172a] border border-[#334155] px-2.5 py-1.5 rounded-[2px]">
            {[
              { label: 'P1', color: '#22c55e', title: 'PSU 1: 110V DC Present' },
              { label: 'P2', color: psu2Fault ? '#ef4444' : '#22c55e', title: psu2Fault ? 'PSU 2: FAILED' : 'PSU 2: 110V DC Present' },
              { label: 'STATUS', color: ringBroken || psu2Fault ? '#ef4444' : sfpLowRx ? '#f59e0b' : '#22c55e', title: 'Device Overall Status' },
              { label: 'RM', color: ringBroken ? '#f59e0b' : '#22c55e', title: ringBroken ? 'MRP Ring OPEN (Failover)' : 'MRP Ring Manager Active' },
              { label: 'ACA', color: '#22c55e', title: 'ACA22 USB Backup Ready' },
            ].map((led) => (
              <div key={led.label} title={led.title} className="flex flex-col items-center gap-0.5">
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block"
                  style={{ background: led.color, boxShadow: `0 0 7px ${led.color}` }}
                />
                <span className="font-mono text-[9px] text-[#cbd5e1]">{led.label}</span>
              </div>
            ))}
          </div>

          <div className="flex-1 flex flex-wrap items-center gap-1.5">
            {PORT_IDS.map((pid, idx) => {
              const meta = frontPortMeta[pid];
              const isDis = Boolean(disabledPorts[`${sw.id}:${pid}`]);
              const isDown = isDis || (ringBroken && pid === '1/2');
              const isWarn = sfpLowRx && pid === '1/1';
              const isSel = selectedFrontPort === pid;
              const actBlink = !isDown && (liveSec + idx) % 2 === 0;
              return (
                <button
                  key={pid}
                  type="button"
                  onClick={() => setSelectedFrontPort((cur) => (cur === pid ? null : pid))}
                  title={`Click to inspect Port ${pid} (${meta.media} ${meta.speed} — ${meta.neighbor})`}
                  className="px-2 py-1 rounded-[2px] border flex flex-col items-center min-w-[54px] cursor-pointer transition"
                  style={{
                    background: isSel ? '#0369a1' : meta.media === 'SFP' ? '#1e293b' : '#0f172a',
                    borderColor: isSel ? '#38bdf8' : isDown ? '#ef4444' : isWarn ? '#f59e0b' : '#475569',
                  }}
                >
                  <div className="flex items-center gap-1 mb-0.5">
                    <span
                      className="w-2 h-2 rounded-full inline-block"
                      style={{
                        background: isDown ? '#ef4444' : isWarn ? '#f59e0b' : '#22c55e',
                        boxShadow: isDown ? 'none' : `0 0 5px ${isWarn ? '#f59e0b' : '#22c55e'}`,
                      }}
                    />
                    <span
                      className="w-1.5 h-1.5 rounded-full inline-block"
                      style={{ background: actBlink ? '#facc15' : '#334155' }}
                    />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-white">{pid}</span>
                  <span className="font-mono text-[8.5px] text-[#94a3b8]">{meta.media}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CLICKED PORT LIVE INSPECTOR DRAWER */}
        {selectedFrontPort && frontPortMeta[selectedFrontPort] && (() => {
          const pm = frontPortMeta[selectedFrontPort];
          const isDis = Boolean(disabledPorts[`${sw.id}:${selectedFrontPort}`]);
          const isDown = isDis || (ringBroken && selectedFrontPort === '1/2');
          const rxMbps = isDown ? 0 : +(pm.baseMbps + ((liveSec * 7) % 15) * 0.4).toFixed(1);
          const txMbps = isDown ? 0 : +(pm.baseMbps * 0.85 + ((liveSec * 5) % 11) * 0.3).toFixed(1);
          const rxDbm = sfpLowRx && selectedFrontPort === '1/1' ? '-19.8 dBm (LOW WARN)' : '-5.6 dBm (OK)';
          return (
            <div className="bg-[#0f172a] border-t border-[#334155] px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex flex-wrap items-center gap-3 font-mono">
                <span className="font-bold text-[#38bdf8]">Port {selectedFrontPort}</span>
                <span className="text-[#e2e8f0]">Link: <strong style={{ color: isDown ? '#f87171' : '#4ade80' }}>{isDown ? 'DOWN' : `UP (${pm.speed})`}</strong></span>
                <span className="text-[#cbd5e1]">Neighbor: <strong>{pm.neighbor}</strong></span>
                <span className="text-[#cbd5e1]">
                  VLANs:{' '}
                  {(() => {
                    const activeForPort = vlans
                      .filter((v) => v.ports[selectedFrontPort] && v.ports[selectedFrontPort] !== '-')
                      .map((v) => `${v.vid}(${v.ports[selectedFrontPort]})`);
                    return activeForPort.length > 0 ? activeForPort.join(', ') : 'None';
                  })()}
                </span>
                <span className="text-[#4ade80]">Rx: {rxMbps} Mbps | Tx: {txMbps} Mbps</span>
                {pm.media === 'SFP' && (
                  <span style={{ color: sfpLowRx && selectedFrontPort === '1/1' ? '#fbbf24' : '#bae6fd' }}>
                    DOM Rx: {rxDbm}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => onTogglePort(selectedFrontPort)}
                  className="px-2 py-0.5 rounded-[2px] text-[10.5px] font-bold cursor-pointer"
                  style={{
                    background: isDis ? '#16a34a' : '#dc2626',
                    color: '#ffffff',
                    border: 'none',
                  }}
                >
                  {isDis ? 'Enable Port' : 'Disable Port'}
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedFrontPort(null)}
                  className="px-2 py-0.5 rounded-[2px] text-[10.5px] bg-[#334155] text-white cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          );
        })()}
      </div>
      {/* 1. BASIC SETTINGS -> SYSTEM */}
      {hiosPage === 'SYS_SYSTEM' && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <div className="rounded p-3 text-white flex items-center gap-3 shadow-sm" style={{ background: ringBroken ? '#ef4444' : '#16a34a' }}>
              <span className="text-[22px]">ⓘ</span>
              <div>
                <div className="text-[11px] opacity-90">Device status</div>
                <div className="text-[18px] font-bold">{ringBroken ? '1' : 'OK'}</div>
              </div>
            </div>
            <div className="rounded p-3 text-white flex items-center gap-3 shadow-sm" style={{ background: securityWarnings > 0 ? '#ef4444' : '#16a34a' }}>
              <span className="text-[22px]">🛡</span>
              <div>
                <div className="text-[11px] opacity-90">Security status</div>
                <div className="text-[18px] font-bold">{securityWarnings > 0 ? String(securityWarnings) : 'OK'}</div>
              </div>
            </div>
            <div className="rounded p-3 text-white flex items-center gap-3 shadow-sm" style={{ background: ringBroken ? '#ef4444' : '#16a34a' }}>
              <span className="text-[22px]">⊞</span>
              <div>
                <div className="text-[11px] opacity-90">Signal contact 1 status</div>
                <div className="text-[18px] font-bold">{ringBroken ? '1' : 'OK'}</div>
              </div>
            </div>
          </div>

          <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4">
            <div className="text-[14px] font-semibold text-[#1e293b] mb-3">System data</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-[12px]">
              <div className="bg-[#f1f5f9] border-b border-[#94a3b8] px-2.5 py-1">
                <div className="text-[10px] text-[#64748b]">System name</div>
                <input value={sysName} onChange={(e) => { setSysName(e.target.value); onMarkDirty(); }} className="w-full !border-0 !bg-transparent px-0 text-[12px] font-medium" />
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#94a3b8] px-2.5 py-1">
                <div className="text-[10px] text-[#64748b]">Location</div>
                <input value={sysLocation} onChange={(e) => { setSysLocation(e.target.value); onMarkDirty(); }} className="w-full !border-0 !bg-transparent px-0 text-[12px] font-medium" />
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#94a3b8] px-2.5 py-1">
                <div className="text-[10px] text-[#64748b]">Contact person</div>
                <input value={sysContact} onChange={(e) => { setSysContact(e.target.value); onMarkDirty(); }} className="w-full !border-0 !bg-transparent px-0 text-[12px] font-medium" />
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1.5">
                <div className="text-[10px] text-[#64748b]">Device type</div>
                <div className="font-medium text-[#0f172a] truncate">{sw.model} ({sw.firmware})</div>
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1.5">
                <div className="text-[10px] text-[#64748b]">Power supply 1</div>
                <div className="font-medium text-[#15803d]">present</div>
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1.5">
                <div className="text-[10px] text-[#64748b]">Power supply 2</div>
                <div className="font-medium" style={{ color: ringBroken ? '#b91c1c' : '#15803d' }}>{ringBroken ? 'defective' : 'present'}</div>
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1.5">
                <div className="text-[10px] text-[#64748b]">Uptime</div>
                <div className="font-mono font-medium">14d 06h 37m 12s</div>
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1.5">
                <div className="text-[10px] text-[#64748b]">Temperature [°C]</div>
                <div className="font-mono font-medium">24</div>
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#94a3b8] px-2.5 py-1">
                <div className="text-[10px] text-[#64748b]">Upper temp. limit [°C]</div>
                <input type="number" value={tempUpper} onChange={(e) => setTempUpper(Number(e.target.value))} className="w-full !border-0 !bg-transparent px-0 font-mono text-[12px]" />
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#94a3b8] px-2.5 py-1">
                <div className="text-[10px] text-[#64748b]">Lower temp. limit [°C]</div>
                <input type="number" value={tempLower} onChange={(e) => setTempLower(Number(e.target.value))} className="w-full !border-0 !bg-transparent px-0 font-mono text-[12px]" />
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#cbd5e1] px-2.5 py-1.5">
                <div className="text-[10px] text-[#64748b]">Humidity [%]</div>
                <div className="font-mono font-medium">54</div>
              </div>
              <div className="bg-[#f1f5f9] border-b border-[#94a3b8] px-2.5 py-1">
                <div className="text-[10px] text-[#64748b]">Upper humidity limit [%]</div>
                <input type="number" value={humUpper} onChange={(e) => setHumUpper(Number(e.target.value))} className="w-full !border-0 !bg-transparent px-0 font-mono text-[12px]" />
              </div>
            </div>
          </div>

          <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-3.5">
            <div className="text-[13.5px] font-semibold text-[#1e293b] mb-2">LED status</div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: ringBroken ? '#ef4444' : '#16a34a' }}>Status</span>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold text-[#422006]" style={{ background: '#facc15' }}>Power</span>
              <span className="px-3 py-0.5 rounded-full text-[11px] font-bold text-white" style={{ background: acaAutoSave ? '#16a34a' : '#94a3b8' }}>ACA</span>
            </div>
          </div>
        </>
      )}

      {/* 2. BASIC SETTINGS -> NETWORK (GLOBAL / IPV4 / IPV6 / HIDISCOVERY) */}
      {(hiosPage === 'SYS_NETWORK' || hiosPage === 'SYS_NET_IPV4' || hiosPage === 'SYS_NET_IPV6' || hiosPage === 'SYS_NET_HIDISC') && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px] border-b border-[#e5e5e5] pb-1.5">
            Basic Settings → Network → {activeTitle}
          </div>
          {(hiosPage === 'SYS_NETWORK' || hiosPage === 'SYS_NET_IPV4') && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl">
              <div>
                <label className="block text-[11px] text-[#64748b] mb-0.5">IPv4 Assignment Mode</label>
                <select value={ipAssignMode} onChange={(e) => { setIpAssignMode(e.target.value as 'Local' | 'BOOTP' | 'DHCP'); onMarkDirty(); }} className="w-full h-[26px] px-2">
                  <option value="Local">Local (Static)</option>
                  <option value="BOOTP">BOOTP</option>
                  <option value="DHCP">DHCP</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] mb-0.5">Management VLAN ID</label>
                <input type="number" value={mgmtVlan} onChange={(e) => { setMgmtVlan(Number(e.target.value) || 1); onMarkDirty(); }} className="w-full h-[26px] px-2 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] mb-0.5">IPv4 Address</label>
                <input value={netIp} onChange={(e) => { setNetIp(e.target.value); onMarkDirty(); }} className="w-full h-[26px] px-2 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] mb-0.5">Netmask</label>
                <input value={netMask} onChange={(e) => { setNetMask(e.target.value); onMarkDirty(); }} className="w-full h-[26px] px-2 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] mb-0.5">Gateway Address</label>
                <input value={netGw} onChange={(e) => { setNetGw(e.target.value); onMarkDirty(); }} className="w-full h-[26px] px-2 font-mono" />
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b] mb-0.5">Base MAC Address</label>
                <div className="h-[26px] flex items-center font-mono text-[#334155]">{sw.mac}</div>
              </div>
            </div>
          )}
          {hiosPage === 'SYS_NET_IPV6' && (
            <div className="space-y-2">
              <div><strong>IPv6 Management:</strong> Enabled (Link-Local Auto-Config)</div>
              <div><strong>Link-Local Address:</strong> <span className="font-mono">fe80::280:63ff:fe10:420a/64</span></div>
              <div><strong>Duplicate Address Detection (DAD):</strong> Passed</div>
            </div>
          )}
          {hiosPage === 'SYS_NET_HIDISC' && (
            <div className="space-y-2.5 max-w-md">
              <div>
                <label className="block text-[11px] text-[#64748b] mb-0.5">HiDiscovery v2 Protocol Access</label>
                <select value={hiDiscMode} onChange={(e) => { setHiDiscMode(e.target.value as 'Read/Write' | 'Read Only' | 'Off'); onMarkDirty(); }} className="w-full h-[26px] px-2">
                  <option value="Read/Write">Read/Write (Allow IP Assignment)</option>
                  <option value="Read Only">Read Only (Discovery Only)</option>
                  <option value="Off">Off (Disabled)</option>
                </select>
              </div>
              <button type="button" className="hv-btn-blue" onClick={() => onPushLog('INFO', `${sysName}: Signal LEDs blinking for 5 seconds.`)}>
                Signal Device LEDs
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. BASIC SETTINGS -> PORT */}
      {hiosPage === 'SYS_PORT' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-3.5 space-y-2">
          <div className="font-semibold text-[#00468c] text-[14px]">Basic Settings → Port Configuration</div>
          <table>
            <thead>
              <tr>
                <th>Port</th>
                <th>Name / Alias</th>
                <th>Media</th>
                <th>Port On</th>
                <th>Link</th>
                <th>Speed / Duplex</th>
                <th>PVID</th>
              </tr>
            </thead>
            <tbody>
              {PORT_IDS.map((pid, idx) => {
                const adminUp = !disabledPorts[`${sw.id}:${pid}`];
                const linkUp = adminUp && !(ringBroken && pid === '1/2');
                return (
                  <tr key={pid}>
                    <td className="font-mono font-semibold">{pid}</td>
                    <td>
                      <input
                        value={portAliases[pid] || ''}
                        onChange={(e) => { setPortAliases((p) => ({ ...p, [pid]: e.target.value })); onMarkDirty(); }}
                        className="w-full h-[22px] px-1.5 text-[11.5px]"
                      />
                    </td>
                    <td>{idx < 4 ? 'SFP Fiber' : 'RJ45 Copper'}</td>
                    <td className="text-center">
                      <input type="checkbox" checked={adminUp} onChange={() => onTogglePort(pid)} />
                    </td>
                    <td style={{ color: linkUp ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{linkUp ? 'Up' : 'Down'}</td>
                    <td className="font-mono text-[11px]">{idx < 4 ? '1000M-LX FD' : '100M-TX FD'}</td>
                    <td>
                      <input
                        type="number"
                        value={portPvids[pid] || 1}
                        onChange={(e) => { setPortPvids((p) => ({ ...p, [pid]: Number(e.target.value) || 1 })); onMarkDirty(); }}
                        className="w-[56px] h-[22px] px-1 font-mono text-[11.5px]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. SOFTWARE / LOAD-SAVE / EXTERNAL MEMORY / RESTART */}
      {hiosPage === 'SYS_SOFTWARE' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Basic Settings → Software</div>
          <table>
            <thead><tr><th>Slot</th><th>Image Version</th><th>Build Date</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Running</td><td className="font-mono font-semibold">{sw.firmware}</td><td className="font-mono">2024-04-16 13:11</td><td style={{ color: '#15803d', fontWeight: 600 }}>Active</td></tr>
              <tr><td>Stored (Backup)</td><td className="font-mono">HiOS-2A-09.0.04</td><td className="font-mono">2023-09-12 09:40</td><td>Verified</td></tr>
              <tr><td>Bootcode</td><td className="font-mono">09.4.00</td><td className="font-mono">2024-04-16</td><td>OK</td></tr>
            </tbody>
          </table>
          <div className="flex gap-2">
            <button type="button" className="hv-btn" onClick={() => onPushLog('INFO', `${sysName}: SHA-256 signature verified for Running & Backup firmware.`)}>Verify Signature</button>
            <button type="button" className="hv-btn-blue" onClick={() => onPushLog('WARN', `${sysName}: Backup firmware selected for next Cold Start.`)}>Restore Backup</button>
          </div>
        </div>
      )}

      {hiosPage === 'SYS_LOADSAVE' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Basic Settings → Load/Save Configuration Profiles</div>
          <table>
            <thead><tr><th>Storage</th><th>Profile</th><th>Active</th><th>Fingerprint</th><th>Action</th></tr></thead>
            <tbody>
              <tr>
                <td>NVM (Internal)</td><td className="font-mono">config.xml</td><td style={{ color: '#15803d', fontWeight: 600 }}>Yes</td><td className="font-mono">7F4A-9B12-C803</td>
                <td><button type="button" className="hv-btn-blue" onClick={onSaveNvm}>Save to NVM</button></td>
              </tr>
              <tr>
                <td>External (ACA22)</td><td className="font-mono">config.xml</td><td>Backup</td><td className="font-mono">7F4A-9B12-C803</td>
                <td><button type="button" className="hv-btn" onClick={handleExportXml}>Export XML</button></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'SYS_EXTMEM' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2.5 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Basic Settings → External Memory (ACA22-USB-C)</div>
          <div><strong>Device Status:</strong> <span style={{ color: '#15803d', fontWeight: 600 }}>Present &amp; Writable</span></div>
          <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={acaAutoLoad} onChange={(e) => { setAcaAutoLoad(e.target.checked); onMarkDirty(); }} /><span>Config Priority (Auto-Load from ACA on Boot)</span></label>
          <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={acaAutoSave} onChange={(e) => { setAcaAutoSave(e.target.checked); onMarkDirty(); }} /><span>Auto-Save Config to ACA on NVM Write</span></label>
          <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={acaSwUpdate} onChange={(e) => { setAcaSwUpdate(e.target.checked); onMarkDirty(); }} /><span>Software Auto-Update from ACA</span></label>
        </div>
      )}

      {hiosPage === 'SYS_RESTART' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Basic Settings → Restart</div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="hv-btn-blue" onClick={() => onPushLog('WARN', `${sysName}: Cold Start triggered — HiOS rebooting (~18s).`)}>Cold Start</button>
            <button type="button" className="hv-btn" onClick={() => onPushLog('INFO', `${sysName}: Dynamic MAC Address Table (FDB) cleared.`)}>Reset MAC Table</button>
            <button type="button" className="hv-btn" onClick={() => onPushLog('INFO', `${sysName}: Port traffic & error counters reset to zero.`)}>Reset Port Counters</button>
          </div>
        </div>
      )}

      {/* 5. TIME -> BASIC / SNTP / IEEE 1588 PTP */}
      {hiosPage === 'TIME_BASIC' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Time → Basic Settings</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div><strong>System Time (UTC):</strong> <span className="font-mono">{new Date().toISOString().replace('T', ' ').slice(0, 19)} UTC</span></div>
            <div><strong>Active Source:</strong> {ptpOn ? 'IEEE 1588 PTPv2' : sntpOn ? 'SNTP Client' : 'Local RTC'}</div>
            <div>
              <label className="block text-[11px] text-[#64748b]">Local Timezone</label>
              <select value={tzOffset} onChange={(e) => setTzOffset(e.target.value)} className="w-full h-[26px] px-2">
                <option value="UTC+05:30 (IST)">UTC+05:30 (IST — India)</option>
                <option value="UTC+00:00 (UTC)">UTC+00:00 (UTC)</option>
                <option value="UTC+01:00 (CET)">UTC+01:00 (CET)</option>
              </select>
            </div>
          </div>
          <button type="button" className="hv-btn-blue" onClick={() => onPushLog('INFO', `${sysName}: System clock set from Engineering PC.`)}>Set Time from PC</button>
        </div>
      )}

      {hiosPage === 'TIME_SNTP' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Time → SNTP Client</div>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 font-semibold cursor-pointer">
              <input type="checkbox" checked={sntpOn} onChange={(e) => { setSntpOn(e.target.checked); onMarkDirty(); }} />
              <span>Operation Enabled</span>
            </label>
            <span className="px-2 py-0.5 rounded text-[11px] font-bold" style={{ background: sntpOn ? '#dcfce7' : '#e2e8f0', color: sntpOn ? '#166534' : '#475569' }}>
              {sntpOn ? 'State: Synchronized (Stratum 1 — GPS)' : 'State: Disabled'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
            <div>
              <label className="block text-[11px] text-[#64748b]">Client Mode</label>
              <select value={sntpMode} onChange={(e) => setSntpMode(e.target.value as 'Unicast' | 'Broadcast')} className="w-full h-[26px] px-2">
                <option value="Unicast">Unicast</option>
                <option value="Broadcast">Broadcast</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b]">Request Interval [s]</label>
              <input type="number" value={sntpPoll} onChange={(e) => setSntpPoll(Number(e.target.value) || 64)} className="w-full h-[26px] px-2 font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b]">SNTP Server 1 (Primary)</label>
              <input value={sntpPrimary} onChange={(e) => setSntpPrimary(e.target.value)} className="w-full h-[26px] px-2 font-mono" />
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b]">SNTP Server 2 (Secondary)</label>
              <input value={sntpSecondary} onChange={(e) => setSntpSecondary(e.target.value)} className="w-full h-[26px] px-2 font-mono" />
            </div>
          </div>
          <button type="button" className="hv-btn-blue" onClick={() => onPushLog('INFO', `${sysName}: SNTP sync request sent to ${sntpPrimary} -> Offset +0.4 ms OK.`)}>Sync Now</button>
        </div>
      )}

      {hiosPage === 'TIME_PTP' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Time → IEEE 1588 / PTPv2</div>
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input type="checkbox" checked={ptpOn} onChange={(e) => { setPtpOn(e.target.checked); onMarkDirty(); }} />
            <span>PTPv2 Operation Enabled</span>
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-[#64748b]">PTP Profile</label>
              <select value={ptpProfile} onChange={(e) => setPtpProfile(e.target.value)} className="w-full h-[26px] px-2">
                <option>IEC 61850-9-3 Power Profile</option>
                <option>IEEE C37.238-2017 Power Profile</option>
                <option>Default E2E Profile</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b]">Clock Mode</label>
              <select value={ptpMode} onChange={(e) => setPtpMode(e.target.value as 'P2P Transparent Clock' | 'E2E Transparent Clock' | 'Boundary Clock')} className="w-full h-[26px] px-2">
                <option>P2P Transparent Clock</option>
                <option>E2E Transparent Clock</option>
                <option>Boundary Clock</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-[#64748b]">PTP Domain (0–127)</label>
              <input type="number" min={0} max={127} value={ptpDomain} onChange={(e) => setPtpDomain(Number(e.target.value) || 0)} className="w-full h-[26px] px-2 font-mono" />
            </div>
          </div>
          <div className="bg-[#f8fafc] border border-[#cbd5e1] rounded p-2.5 font-mono text-[11.5px]">
            Grandmaster: 00-80-63-FF-FE-10-42-01 (Class 6 — GPS) · Sync: <strong style={{ color: ptpOn ? '#15803d' : '#64748b' }}>{ptpOn ? 'LOCKED (+18 ns)' : 'OFF'}</strong> · Mean Path Delay: 142 ns
          </div>
          <div>
            <div className="font-semibold mb-1 text-[11.5px]">Per-Port PTPv2 Enable:</div>
            <div className="flex flex-wrap gap-3">
              {PORT_IDS.map((pid) => (
                <label key={pid} className="flex items-center gap-1 font-mono cursor-pointer">
                  <input type="checkbox" checked={Boolean(ptpPorts[pid])} onChange={(e) => setPtpPorts((p) => ({ ...p, [pid]: e.target.checked }))} />
                  <span>{pid}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 6. DEVICE SECURITY */}
      {hiosPage === 'DSEC_USERS' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Device Security → User Management</div>
          <div className="flex flex-wrap items-center gap-2">
            <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="New username..." className="h-[25px] px-2 w-[150px]" />
            <select value={newUserRole} onChange={(e) => setNewUserRole(e.target.value as UserRow['role'])} className="h-[25px] px-2">
              <option>Administrator</option><option>Operator</option><option>Auditor</option><option>Guest</option>
            </select>
            <button
              type="button"
              className="hv-btn-blue"
              onClick={() => {
                if (!newUsername.trim()) return;
                setUsers((p) => [...p, { username: newUsername.trim(), role: newUserRole, active: true, snmpv3: 'SHA / AES-128' }]);
                onPushLog('INFO', `${sysName}: Created user "${newUsername.trim()}" (${newUserRole}).`);
                setNewUsername('');
                onMarkDirty();
              }}
            >
              + Add User
            </button>
          </div>
          <table>
            <thead><tr><th>User Name</th><th>Role</th><th>Status</th><th>SNMPv3</th><th>Action</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.username}>
                  <td className="font-semibold">{u.username}</td>
                  <td>{u.role}</td>
                  <td style={{ color: u.active ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{u.active ? 'Active' : 'Locked'}</td>
                  <td>{u.snmpv3}</td>
                  <td className="flex gap-1.5">
                    <button
                      type="button"
                      className="hv-btn"
                      onClick={() => {
                        setUsers((p) => p.map((x) => (x.username === u.username ? { ...x, active: !x.active } : x)));
                        onMarkDirty();
                      }}
                    >
                      {u.active ? 'Lock' : 'Unlock'}
                    </button>
                    {u.username !== 'admin' && (
                      <button
                        type="button"
                        className="hv-btn"
                        onClick={() => { setUsers((p) => p.filter((x) => x.username !== u.username)); onMarkDirty(); }}
                      >
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'DSEC_AUTH' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Device Security → Authentication Lists</div>
          <table>
            <thead><tr><th>Application</th><th>Policy 1</th><th>Fallback Policy 2</th><th>Status</th></tr></thead>
            <tbody>
              <tr><td>Web Interface (HTTPS)</td><td>RADIUS</td><td>Local Database</td><td style={{ color: '#15803d', fontWeight: 600 }}>Active</td></tr>
              <tr><td>CLI (SSH / Serial)</td><td>RADIUS</td><td>Local Database</td><td style={{ color: '#15803d', fontWeight: 600 }}>Active</td></tr>
              <tr><td>802.1X Port Auth</td><td>RADIUS</td><td>Reject</td><td style={{ color: '#15803d', fontWeight: 600 }}>Active</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'DSEC_MGMT' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Device Security → Management Access</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.keys(mgmtProto).map((k) => (
              <label key={k} className="flex items-center gap-2 font-semibold cursor-pointer">
                <input type="checkbox" checked={mgmtProto[k]} onChange={(e) => { setMgmtProto((p) => ({ ...p, [k]: e.target.checked })); onMarkDirty(); }} />
                <span>{k}</span>
              </label>
            ))}
          </div>
          <div className="text-[11.5px] text-[#475569]">
            Active Security Warnings on System Dashboard: <strong>{securityWarnings}</strong> (disable HTTP, Telnet, SNMPv1/v2c &amp; change default password for 0 warnings).
          </div>
        </div>
      )}

      {hiosPage === 'DSEC_BANNER' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2.5 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Device Security → Pre-login Banner</div>
          <label className="flex items-center gap-2 font-semibold cursor-pointer">
            <input type="checkbox" checked={bannerOn} onChange={(e) => setBannerOn(e.target.checked)} />
            <span>Display Pre-login Banner on Web GUI &amp; SSH</span>
          </label>
          <textarea rows={3} value={bannerText} onChange={(e) => { setBannerText(e.target.value); onMarkDirty(); }} className="w-full p-2 border border-[#94a3b8] bg-white text-black font-mono text-[11.5px]" />
        </div>
      )}

      {/* 7. NETWORK SECURITY */}
      {hiosPage === 'NSEC_PORT' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Network Security → Port Security</div>
          <table>
            <thead><tr><th>Port</th><th>Connected IED</th><th>Max Dynamic MACs</th><th>Violation Action</th></tr></thead>
            <tbody>
              {(['1/5', '1/6', '1/7', '1/8'] as const).map((pid) => (
                <tr key={pid}>
                  <td className="font-mono font-semibold">{pid}</td>
                  <td>{portAliases[pid]}</td>
                  <td>
                    <input type="number" min={1} max={64} value={portSecMax[pid] || 1} onChange={(e) => setPortSecMax((p) => ({ ...p, [pid]: Number(e.target.value) || 1 }))} className="w-[60px] h-[22px] px-1 font-mono" />
                  </td>
                  <td>Trap + Discard</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'NSEC_8021X' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Network Security → 802.1X Port Authentication</div>
          <table>
            <thead><tr><th>Port</th><th>Control Mode</th><th>PAE State</th><th>Re-Auth [s]</th></tr></thead>
            <tbody>
              <tr><td className="font-mono">1/5 - 1/8</td><td>Force-Authorized (IED Static)</td><td style={{ color: '#15803d', fontWeight: 600 }}>Authorized</td><td className="font-mono">3600</td></tr>
              <tr><td className="font-mono">1/10</td><td>Auto (Engineering PC)</td><td style={{ color: '#15803d', fontWeight: 600 }}>Authenticated</td><td className="font-mono">3600</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'NSEC_RADIUS' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Network Security → RADIUS Server</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div><label className="block text-[11px] text-[#64748b]">Primary Server IP</label><input value={radiusIp} onChange={(e) => setRadiusIp(e.target.value)} className="w-full h-[26px] px-2 font-mono" /></div>
            <div><label className="block text-[11px] text-[#64748b]">UDP Auth Port</label><input type="number" value={radiusPort} onChange={(e) => setRadiusPort(Number(e.target.value) || 1812)} className="w-full h-[26px] px-2 font-mono" /></div>
          </div>
          <button type="button" className="hv-btn-blue" onClick={() => onPushLog('INFO', `${sysName}: RADIUS Access-Request to ${radiusIp}:${radiusPort} -> Access-Accept OK.`)}>Test RADIUS Reachability</button>
        </div>
      )}

      {hiosPage === 'NSEC_ACL' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Network Security → Access Control Lists (ACL)</div>
          <div className="flex flex-wrap items-center gap-2">
            <select value={newAclAction} onChange={(e) => setNewAclAction(e.target.value as 'Permit' | 'Deny')} className="h-[25px] px-2">
              <option>Permit</option><option>Deny</option>
            </select>
            <input value={newAclSrc} onChange={(e) => setNewAclSrc(e.target.value)} placeholder="Source CIDR" className="h-[25px] px-2 w-[130px] font-mono" />
            <input value={newAclDst} onChange={(e) => setNewAclDst(e.target.value)} placeholder="Dest Port" className="h-[25px] px-2 w-[100px] font-mono" />
            <input value={newAclDesc} onChange={(e) => setNewAclDesc(e.target.value)} placeholder="Description" className="h-[25px] px-2 flex-1 min-w-[120px]" />
            <button
              type="button"
              className="hv-btn-blue"
              onClick={() => {
                const nextId = Math.max(0, ...acls.map((a) => a.id)) + 10;
                setAcls((p) => [...p, { id: nextId, action: newAclAction, src: newAclSrc, dst: newAclDst, proto: 'TCP', desc: newAclDesc, enabled: true }]);
                onPushLog('INFO', `${sysName}: Added ACL Rule #${nextId} (${newAclAction} ${newAclSrc} -> ${newAclDst}).`);
                onMarkDirty();
              }}
            >
              + Add Rule
            </button>
          </div>
          <table>
            <thead><tr><th>Rule</th><th>Action</th><th>Source</th><th>Destination</th><th>Description</th><th>Delete</th></tr></thead>
            <tbody>
              {acls.map((r) => (
                <tr key={r.id}>
                  <td className="font-mono font-semibold">{r.id}</td>
                  <td style={{ color: r.action === 'Permit' ? '#15803d' : '#b91c1c', fontWeight: 700 }}>{r.action}</td>
                  <td className="font-mono">{r.src}</td>
                  <td className="font-mono">{r.dst}</td>
                  <td>{r.desc}</td>
                  <td><button type="button" className="hv-btn" onClick={() => { setAcls((p) => p.filter((x) => x.id !== r.id)); onMarkDirty(); }}>Remove</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'NSEC_DOS' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2.5 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Network Security → Denial of Service (DoS) Protection</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {Object.keys(dosFlags).map((k) => (
              <label key={k} className="flex items-center gap-2 font-semibold cursor-pointer">
                <input type="checkbox" checked={dosFlags[k]} onChange={(e) => { setDosFlags((p) => ({ ...p, [k]: e.target.checked })); onMarkDirty(); }} />
                <span>{k}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* 8. SWITCHING -> VLAN (FULL INTERACTIVE T/U/- MATRIX + ADD/DELETE!) */}
      {hiosPage === 'SW_VLAN' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e5e5e5] pb-2">
            <span className="font-semibold text-[#00468c] text-[14px]">Switching → VLAN (802.1Q Static Matrix)</span>
            <span className="text-[11px] text-[#475569]">Click any port cell to cycle: <strong>T</strong> (Tagged) → <strong>U</strong> (Untagged) → <strong>-</strong> (None)</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <input type="number" min={2} max={4094} value={newVid} onChange={(e) => setNewVid(Number(e.target.value) || 400)} className="h-[25px] w-[75px] px-1.5 font-mono" placeholder="VID" />
            <input value={newVlanName} onChange={(e) => setNewVlanName(e.target.value)} className="h-[25px] w-[140px] px-2" placeholder="VLAN Name" />
            <select value={newVlanPrio} onChange={(e) => setNewVlanPrio(Number(e.target.value))} className="h-[25px] px-2">
              {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => <option key={p} value={p}>Priority {p}</option>)}
            </select>
            <button
              type="button"
              className="hv-btn-blue"
              onClick={() => {
                if (vlans.some((v) => v.vid === newVid)) {
                  onPushLog('WARN', `VLAN ${newVid} already exists.`);
                  return;
                }
                const emptyPorts: Record<string, PortTagMode> = {};
                PORT_IDS.forEach((pid) => { emptyPorts[pid] = pid === '1/1' || pid === '1/2' ? 'T' : '-'; });
                setVlans((p) => [...p, { vid: newVid, name: newVlanName.trim() || `VLAN_${newVid}`, priority: newVlanPrio, ports: emptyPorts }]);
                onPushLog('INFO', `${sysName}: Created VLAN ${newVid} (${newVlanName}).`);
                setNewVid(newVid + 10);
                onMarkDirty();
              }}
            >
              + Add VLAN
            </button>
          </div>

          <div className="overflow-auto">
            <table>
              <thead>
                <tr>
                  <th>VID</th>
                  <th>Name</th>
                  <th>802.1p</th>
                  {PORT_IDS.map((pid) => <th key={pid} style={{ textAlign: 'center' }}>{pid}</th>)}
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {vlans.map((v) => (
                  <tr key={v.vid}>
                    <td className="font-mono font-bold">{v.vid}</td>
                    <td className="font-semibold">{v.name}</td>
                    <td className="font-mono">{v.priority}</td>
                    {PORT_IDS.map((pid) => {
                      const mode = v.ports[pid] || '-';
                      return (
                        <td key={pid} className="text-center">
                          <button
                            type="button"
                            onClick={() => cycleVlanPort(v.vid, pid)}
                            className="w-[26px] h-[20px] rounded font-mono font-bold text-[11px] cursor-pointer"
                            style={{
                              background: mode === 'T' ? '#dbeafe' : mode === 'U' ? '#dcfce7' : '#f1f5f9',
                              color: mode === 'T' ? '#1d4ed8' : mode === 'U' ? '#166534' : '#64748b',
                              border: '1px solid #cbd5e1',
                            }}
                          >
                            {mode}
                          </button>
                        </td>
                      );
                    })}
                    <td>
                      {v.vid !== 1 ? (
                        <button type="button" className="hv-btn" onClick={() => { setVlans((p) => p.filter((x) => x.vid !== v.vid)); onMarkDirty(); }}>Delete</button>
                      ) : (
                        <span className="text-[10.5px] text-[#64748b]">Default</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 9. SWITCHING -> GLOBAL / RATE / MAC / IGMP / QOS / REDUNDANCY */}
      {hiosPage === 'SW_GLOBAL' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Switching → Global</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div><label className="block text-[11px] text-[#64748b]">MAC Aging Time [s]</label><input type="number" value={agingSec} onChange={(e) => setAgingSec(Number(e.target.value) || 300)} className="w-full h-[26px] px-2 font-mono" /></div>
            <label className="flex items-center gap-2 font-semibold cursor-pointer pt-4"><input type="checkbox" checked={flowCtrlGlobal} onChange={(e) => setFlowCtrlGlobal(e.target.checked)} /><span>802.3x Flow Control Global</span></label>
          </div>
        </div>
      )}

      {hiosPage === 'SW_RATE' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Switching → Rate Limiter (Storm Control)</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg">
            <div><label className="block text-[11px] text-[#64748b]">Broadcast Threshold [%]</label><input type="number" min={1} max={100} value={bcastLimit} onChange={(e) => setBcastLimit(Number(e.target.value) || 10)} className="w-full h-[26px] px-2 font-mono" /></div>
            <div><label className="block text-[11px] text-[#64748b]">Multicast Threshold [%] (GOOSE/SV)</label><input type="number" min={1} max={100} value={mcastLimit} onChange={(e) => setMcastLimit(Number(e.target.value) || 25)} className="w-full h-[26px] px-2 font-mono" /></div>
          </div>
        </div>
      )}

      {hiosPage === 'SW_MAC' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Switching → Filter for MAC Addresses (FDB &amp; Static GOOSE Multicast)</div>
          <div className="flex flex-wrap gap-2">
            <input value={newMacAddr} onChange={(e) => setNewMacAddr(e.target.value)} className="h-[25px] w-[150px] px-2 font-mono" placeholder="01:0C:CD:01:00:03" />
            <input type="number" value={newMacVlan} onChange={(e) => setNewMacVlan(Number(e.target.value) || 200)} className="h-[25px] w-[70px] px-2 font-mono" />
            <input value={newMacPorts} onChange={(e) => setNewMacPorts(e.target.value)} className="h-[25px] w-[130px] px-2 font-mono" placeholder="1/1, 1/5" />
            <button
              type="button"
              className="hv-btn-blue"
              onClick={() => {
                setStaticMacs((p) => [...p, { id: Date.now(), mac: newMacAddr, vlan: newMacVlan, ports: newMacPorts, desc: 'Static GOOSE Filter' }]);
                onPushLog('INFO', `${sysName}: Added static multicast MAC ${newMacAddr} (VLAN ${newMacVlan}).`);
                onMarkDirty();
              }}
            >
              + Add Static MAC
            </button>
          </div>
          <table>
            <thead><tr><th>MAC Address</th><th>VLAN</th><th>Type</th><th>Egress Ports</th><th>Description</th><th>Action</th></tr></thead>
            <tbody>
              {staticMacs.map((m) => (
                <tr key={m.id}>
                  <td className="font-mono font-semibold">{m.mac}</td>
                  <td className="font-mono">{m.vlan}</td>
                  <td>Static Multicast</td>
                  <td className="font-mono">{m.ports}</td>
                  <td>{m.desc}</td>
                  <td><button type="button" className="hv-btn" onClick={() => setStaticMacs((p) => p.filter((x) => x.id !== m.id))}>Delete</button></td>
                </tr>
              ))}
              {ieds.slice(0, 4).map((i, idx) => (
                <tr key={i.id}><td className="font-mono">{i.macAddress}</td><td className="font-mono">100</td><td>Learned</td><td className="font-mono">{`1/${5 + idx}`}</td><td>{i.name}</td><td className="text-[#64748b] text-[11px]">Dynamic</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'SW_IGMP' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2.5 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Switching → IGMP Snooping</div>
          <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={igmpOn} onChange={(e) => setIgmpOn(e.target.checked)} /><span>Global IGMP Snooping (v2 / v3) Enabled</span></label>
          <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={igmpQuerier} onChange={(e) => setIgmpQuerier(e.target.checked)} /><span>IGMP Querier Active (VLAN 100 / 200)</span></label>
          <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={igmpFastLeave} onChange={(e) => setIgmpFastLeave(e.target.checked)} /><span>Fast Leave Enabled</span></label>
        </div>
      )}

      {hiosPage === 'SW_QOS' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Switching → QoS / 802.1p Priority Mapping</div>
          <table>
            <thead><tr><th>802.1p Priority</th><th>Assigned Traffic Queue</th><th>Scheduler</th><th>Substation Traffic Class</th></tr></thead>
            <tbody>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((prio) => (
                <tr key={prio}>
                  <td className="font-mono font-bold">Priority {prio}</td>
                  <td>
                    <select value={qosMap[prio]} onChange={(e) => { setQosMap((p) => ({ ...p, [prio]: Number(e.target.value) })); onMarkDirty(); }} className="h-[22px] px-1.5">
                      {[0, 1, 2, 3, 4, 5, 6, 7].map((q) => <option key={q} value={q}>Queue {q}</option>)}
                    </select>
                  </td>
                  <td>{qosMap[prio] >= 6 ? 'Strict Priority' : 'Weighted Fair (WRR)'}</td>
                  <td>{prio >= 6 ? 'PTPv2 / MRP Control' : prio >= 4 ? 'IEC 61850 GOOSE & SV' : prio >= 2 ? 'IEC 61850 MMS / IEC 104' : 'Best Effort / Mgmt'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {(hiosPage === 'SW_REDUNDANCY' || hiosPage === 'SW_PRP_HSR' || hiosPage === 'SW_RSTP' || hiosPage === 'SW_LAG') && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="flex items-center justify-between border-b border-[#e5e5e5] pb-2">
            <span className="font-semibold text-[#00468c] text-[14px]">Switching → L2-Redundancy → {activeTitle}</span>
            {hiosPage === 'SW_REDUNDANCY' && (
              <button type="button" className="hv-btn-blue" onClick={onToggleRingBreak}>
                {ringBroken ? 'Restore Ring Port 1/2' : 'Simulate Ring Fiber Break'}
              </button>
            )}
          </div>
          {hiosPage === 'SW_REDUNDANCY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl">
              <div>
                <label className="block text-[11px] text-[#64748b]">MRP Role</label>
                <select value={mrpRole} onChange={(e) => setMrpRole(e.target.value as 'Ring Manager' | 'Ring Client')} className="w-full h-[26px] px-2">
                  <option>Ring Manager</option><option>Ring Client</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-[#64748b]">Recovery Profile</label>
                <select value={mrpRecovery} onChange={(e) => setMrpRecovery(e.target.value as '< 10 ms (Fast)' | '200 ms' | '500 ms')} className="w-full h-[26px] px-2">
                  <option>&lt; 10 ms (Fast)</option><option>200 ms</option><option>500 ms</option>
                </select>
              </div>
              <div><strong>Ring Port 1 / Port 2:</strong> 1/1 (Forwarding) / 1/2 ({ringBroken ? 'Link Down' : 'Blocking'})</div>
              <div><strong>Ring State:</strong> <strong style={{ color: ringBroken ? '#b91c1c' : '#15803d' }}>{ringBroken ? 'OPEN (Failover Active)' : 'CLOSED (Redundancy Healthy)'}</strong></div>
            </div>
          )}
          {hiosPage === 'SW_PRP_HSR' && (
            <div className="space-y-1.5">
              <div><strong>Protocol:</strong> IEC 62439-3 Parallel Redundancy Protocol (PRP)</div>
              <div><strong>Switch Role:</strong> {sw.redundancyRole}</div>
              <div><strong>Switchover Time:</strong> 0 ms (Zero-packet-loss bumpless)</div>
            </div>
          )}
          {hiosPage === 'SW_RSTP' && (
            <div className="space-y-2 max-w-sm">
              <div><label className="block text-[11px] text-[#64748b]">Bridge Priority (0–61440)</label><input type="number" step={4096} value={rstpPrio} onChange={(e) => setRstpPrio(Number(e.target.value) || 32768)} className="w-full h-[26px] px-2 font-mono" /></div>
              <div><strong>Status:</strong> RSTP Disabled on MRP Ring Ports 1/1 &amp; 1/2</div>
            </div>
          )}
          {hiosPage === 'SW_LAG' && <div><strong>LACP Trunks:</strong> 0 active (PRP uses separate LAN-A / LAN-B planes)</div>}
        </div>
      )}

      {/* 10. DIAGNOSTICS */}
      {hiosPage === 'DIAG_SFP' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#00468c] text-[14px]">Diagnostics → Ports → SFP (Optical DOM)</span>
            <button type="button" className="hv-btn" onClick={() => { setSfpJitter((j) => j + 1); onPushLog('INFO', `${sysName}: Refreshed SFP Digital Optical Monitoring (DOM) telemetry.`); }}>Refresh DOM</button>
          </div>
          <table>
            <thead>
              <tr><th>Port</th><th>Module type</th><th>Serial number</th><th>Connector</th><th>Temp [°C]</th><th>Tx [mW]</th><th>Rx [mW]</th><th>Tx [dBm]</th><th>Rx [dBm]</th></tr>
            </thead>
            <tbody>
              {sfpRows.map((s) => (
                <tr key={s.port}>
                  <td className="font-mono font-semibold">{s.port}</td>
                  <td className="font-mono">{s.partId}</td>
                  <td className="font-mono">{s.serial}</td>
                  <td>{s.conn}</td>
                  <td className="font-mono">{s.temp}</td>
                  <td className="font-mono">{s.txMw}</td>
                  <td className="font-mono">{s.rxMw}</td>
                  <td className="font-mono">{s.txDbm}</td>
                  <td className="font-mono" style={{ color: s.rxDbm.includes('LOS') ? '#b91c1c' : '#15803d', fontWeight: 600 }}>{s.rxDbm}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'DIAG_TPCABLE' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#00468c] text-[14px]">Diagnostics → Ports → TP Cable Diagnosis (TDR)</span>
            <button type="button" className="hv-btn-blue" onClick={() => { setCableTestedAt(`Passed at ${new Date().toTimeString().slice(0, 8)}`); onPushLog('INFO', `${sysName}: TDR cable diagnosis completed on ports 1/5–1/8.`); }}>Run TDR Test</button>
          </div>
          <div className="text-[11.5px] text-[#475569]">Last Test: <strong>{cableTestedAt}</strong></div>
          <table>
            <thead><tr><th>Port</th><th>Connected IED</th><th>Pair 1-2</th><th>Pair 3-6</th><th>Length</th><th>Result</th></tr></thead>
            <tbody>
              <tr><td className="font-mono">1/5</td><td>IED_132_L1</td><td>Normal</td><td>Normal</td><td className="font-mono">18 m</td><td style={{ color: '#15803d', fontWeight: 600 }}>OK</td></tr>
              <tr><td className="font-mono">1/6</td><td>IED_132_L2</td><td>Normal</td><td>Normal</td><td className="font-mono">24 m</td><td style={{ color: '#15803d', fontWeight: 600 }}>OK</td></tr>
              <tr><td className="font-mono">1/7</td><td>IED_132_BC</td><td>Normal</td><td>Normal</td><td className="font-mono">31 m</td><td style={{ color: '#15803d', fontWeight: 600 }}>OK</td></tr>
              <tr><td className="font-mono">1/8</td><td>IED_132_T1</td><td>Normal</td><td>Normal</td><td className="font-mono">27 m</td><td style={{ color: '#15803d', fontWeight: 600 }}>OK</td></tr>
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'DIAG_PORT_MON' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-3.5 space-y-2">
          <div className="font-semibold text-[#00468c] text-[14px]">Diagnostics → Ports → Port Monitor</div>
          <table>
            <thead><tr><th>Port</th><th>Link</th><th>Rx Packets</th><th>Tx Packets</th><th>CRC Errors</th><th>Utilization</th></tr></thead>
            <tbody>
              {PORT_IDS.map((pid, idx) => {
                const up = !disabledPorts[`${sw.id}:${pid}`] && !(ringBroken && pid === '1/2');
                return (
                  <tr key={pid}>
                    <td className="font-mono font-semibold">{pid}</td>
                    <td style={{ color: up ? '#15803d' : '#b91c1c', fontWeight: 600 }}>{up ? 'Up' : 'Down'}</td>
                    <td className="font-mono">{up ? (142500 + idx * 1920).toLocaleString() : '0'}</td>
                    <td className="font-mono">{up ? (141200 + idx * 1740).toLocaleString() : '0'}</td>
                    <td className="font-mono">0</td>
                    <td className="font-mono">{up ? `${(1.2 + idx * 0.3).toFixed(1)} %` : '0.0 %'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'DIAG_MIRROR' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Diagnostics → Ports → Port Mirroring (Wireshark Capture)</div>
          <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={mirrorOn} onChange={(e) => setMirrorOn(e.target.checked)} /><span>Port Mirroring Operation Enabled</span></label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-2xl">
            <div><label className="block text-[11px] text-[#64748b]">Source Port</label><select value={mirrorSrc} onChange={(e) => setMirrorSrc(e.target.value)} className="w-full h-[26px] px-2">{PORT_IDS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="block text-[11px] text-[#64748b]">Destination (Sniffer) Port</label><select value={mirrorDst} onChange={(e) => setMirrorDst(e.target.value)} className="w-full h-[26px] px-2">{PORT_IDS.map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
            <div><label className="block text-[11px] text-[#64748b]">Direction</label><select value={mirrorDir} onChange={(e) => setMirrorDir(e.target.value as 'TX & RX' | 'RX Only' | 'TX Only')} className="w-full h-[26px] px-2"><option>TX &amp; RX</option><option>RX Only</option><option>TX Only</option></select></div>
          </div>
        </div>
      )}

      {hiosPage === 'DIAG_ARP' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-3.5 space-y-2">
          <div className="font-semibold text-[#00468c] text-[14px]">Diagnostics → System → ARP Table ({ieds.length} IEDs)</div>
          <table>
            <thead><tr><th>IP Address</th><th>MAC Address</th><th>Port</th><th>Substation IED</th></tr></thead>
            <tbody>
              {ieds.map((i, idx) => (
                <tr key={i.id}><td className="font-mono">{i.ipAddressLanA}</td><td className="font-mono">{i.macAddress}</td><td className="font-mono">{`1/${5 + (idx % 4)}`}</td><td>{i.name} ({i.model})</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'DIAG_LLDP' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-3.5 space-y-2">
          <div className="font-semibold text-[#00468c] text-[14px]">Diagnostics → LLDP Topology Table</div>
          <table>
            <thead><tr><th>Local Port</th><th>Remote System</th><th>Remote Port</th><th>Remote IP</th><th>Chassis MAC</th></tr></thead>
            <tbody>
              <tr><td className="font-mono">1/1</td><td className="font-semibold">SW-LAN-B-01</td><td className="font-mono">1/1</td><td className="font-mono">10.132.20.2</td><td className="font-mono">94:AE:E3:AA:DE:61</td></tr>
              {ieds.slice(0, 4).map((i, idx) => (
                <tr key={i.id}><td className="font-mono">{`1/${5 + idx}`}</td><td className="font-semibold">{i.name}</td><td className="font-mono">ETH-A</td><td className="font-mono">{i.ipAddressLanA}</td><td className="font-mono">{i.macAddress}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {hiosPage === 'DIAG_SYSLOG' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-3.5 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#00468c] text-[14px]">Diagnostics → Syslog ({syslogs.length} entries)</span>
            <button type="button" className="hv-btn" onClick={onClearLogs}>Clear Log</button>
          </div>
          <div className="font-mono text-[11.5px] space-y-1 max-h-[300px] overflow-auto">
            {syslogs.map((l) => (
              <div key={l.id} style={{ color: l.sev === 'CRIT' ? '#b91c1c' : l.sev === 'WARN' ? '#b45309' : '#0f172a' }}>
                {`${l.time} [${l.sev}] ${l.msg}`}
              </div>
            ))}
          </div>
        </div>
      )}

      {(hiosPage === 'DIAG_DEVSTAT' || hiosPage === 'DIAG_SECSTAT' || hiosPage === 'DIAG_SIGCON' || hiosPage === 'DIAG_SYSINFO' || hiosPage === 'DIAG_HW' || hiosPage === 'DIAG_CFGCHK' || hiosPage === 'DIAG_EMAIL' || hiosPage === 'DIAG_AUTODIS' || hiosPage === 'DIAG_REPORT') && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Diagnostics → {activeTitle}</div>
          {hiosPage === 'DIAG_EMAIL' ? (
            <div className="space-y-2 max-w-lg">
              <div><label className="block text-[11px] text-[#64748b]">SMTP Server</label><input value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} className="w-full h-[26px] px-2 font-mono" /></div>
              <div><label className="block text-[11px] text-[#64748b]">Alert Recipient</label><input value={smtpTo} onChange={(e) => setSmtpTo(e.target.value)} className="w-full h-[26px] px-2 font-mono" /></div>
              <button type="button" className="hv-btn-blue" onClick={() => onPushLog('INFO', `${sysName}: Test email alert sent to ${smtpTo} via ${smtpHost}.`)}>Send Test Email</button>
            </div>
          ) : hiosPage === 'DIAG_CFGCHK' ? (
            <div className="space-y-1.5">
              <div><strong>Configuration Consistency Audit:</strong></div>
              <div>• Security Warnings: <strong>{securityWarnings}</strong></div>
              <div>• MRP Ring Status: <strong style={{ color: ringBroken ? '#b91c1c' : '#15803d' }}>{ringBroken ? 'OPEN (Conflict/Fault)' : 'CLOSED (OK)'}</strong></div>
              <div>• VLAN / GOOSE Integrity: <strong style={{ color: '#15803d' }}>Passed ({vlans.length} VLANs configured)</strong></div>
            </div>
          ) : (
            <div className="space-y-1.5">
              <div><strong>Switch:</strong> {sysName} ({sw.model}) · <strong>Firmware:</strong> {sw.firmware}</div>
              <div><strong>CPU / Memory Load:</strong> 14 % / 38 % · <strong>PSU1/PSU2:</strong> OK / {ringBroken ? 'Fault' : 'OK'}</div>
              <div><strong>Auto-Disable / Trap Monitoring:</strong> Active (Link Flap, Overload, BPDU Guard)</div>
            </div>
          )}
        </div>
      )}

      {/* 11. ADVANCED & HELP */}
      {hiosPage === 'ADV_IND_PROTO' && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-2.5 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">Advanced → Industrial Protocols</div>
          <div className="space-y-2">
            {Object.keys(indProtos).map((k) => (
              <label key={k} className="flex items-center gap-2 font-semibold cursor-pointer">
                <input type="checkbox" checked={indProtos[k]} onChange={(e) => { setIndProtos((p) => ({ ...p, [k]: e.target.checked })); onMarkDirty(); }} />
                <span>{k}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {(hiosPage === 'ADV_DHCP_SRV' || hiosPage === 'ADV_DHCP_REL' || hiosPage === 'ADV_CLI' || hiosPage === 'HELP_ONLINE' || hiosPage === 'HELP_SUPPORT' || hiosPage === 'HELP_ABOUT') && (
        <div className="bg-[#ffffff] border border-[#d4d4d4] rounded shadow-sm p-4 space-y-3 text-[12px]">
          <div className="font-semibold text-[#00468c] text-[14px]">{activeTitle}</div>
          {hiosPage === 'ADV_DHCP_SRV' && (
            <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={dhcpSrvOn} onChange={(e) => setDhcpSrvOn(e.target.checked)} /><span>DHCP Server Enabled (Pool 10.132.10.150–199)</span></label>
          )}
          {hiosPage === 'ADV_DHCP_REL' && (
            <label className="flex items-center gap-2 font-semibold cursor-pointer"><input type="checkbox" checked={dhcpRelayOn} onChange={(e) => setDhcpRelayOn(e.target.checked)} /><span>DHCP Relay Agent (Option 82) Enabled</span></label>
          )}
          {hiosPage === 'ADV_CLI' && (
            <div className="space-y-2 max-w-sm">
              <div><label className="block text-[11px] text-[#64748b]">CLI Prompt String</label><input value={cliPrompt} onChange={(e) => setCliPrompt(e.target.value)} className="w-full h-[26px] px-2 font-mono" /></div>
              <button type="button" className="hv-btn-blue" onClick={onOpenSsh}>Launch SSH CLI Window</button>
            </div>
          )}
          {(hiosPage === 'HELP_ONLINE' || hiosPage === 'HELP_SUPPORT' || hiosPage === 'HELP_ABOUT') && (
            <div className="space-y-1.5">
              <div><strong>Hirschmann Operating System:</strong> {sw.firmware}</div>
              <div><strong>Hardware:</strong> {sw.model} ({sysName})</div>
              <div><strong>Copyright:</strong> Hirschmann Automation and Control GmbH (Belden)</div>
            </div>
          )}
        </div>
      )}

      {/* AUTHENTIC FLOATING BLUE HiOS ACTION BUTTONS (✓ Set/Apply & ↻ Refresh — matches Figure 5!) */}
      <div className="fixed bottom-[54px] right-6 flex flex-col gap-2 z-30">
        <button
          type="button"
          onClick={handleApplyCurrent}
          title="Set / Apply changes"
          className="w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-white text-[15px] font-bold cursor-pointer"
          style={{ background: '#3898ec', border: 'none' }}
        >
          ✓
        </button>
        <button
          type="button"
          onClick={() => { setSfpJitter((j) => j + 1); onPushLog('INFO', `${sysName}: Refreshed [${activeTitle}] telemetry.`); }}
          title="Refresh page"
          className="w-9 h-9 rounded-full shadow-lg flex items-center justify-center text-white text-[15px] font-bold cursor-pointer"
          style={{ background: '#3898ec', border: 'none' }}
        >
          ↻
        </button>
      </div>
    </div>
  );
};

export default HiOsWorkspace;
