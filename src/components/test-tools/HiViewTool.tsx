import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';
import { HiOsWorkspace } from './HiOsWorkspace';

// ============================================================================
// Hirschmann HiView 4.2 + Embedded HiOS-2A-09.4.03 Web GUI + SSH CLI Window
// Faithful implementation of:
//  - HiView shell (Devices | Discovery | + Embedded HiOS GUI tabs)
//  - HiDiscovery v2 12-column table + 6-item right-click menu:
//    Configure, Change Password, GUI, GUI/Add to devices, Ping, CLI
//  - HiOS-2A-09.4.03 Web GUI: Left Accordion Nav, Basic Settings -> System
//    (3 KPI cards, System data grid, LED status pills), Port, Switching (VLAN/
//    MRP-PRP), Time (PTPv2), Diagnostics -> Ports -> SFP optical DOM table
//  - Authentic black "SSH <IP> - HiView" CLI modal supporting `show sfp`,
//    `show sysinfo`, `show interface`, `show mrp`, `show ptp`, `help`
// ============================================================================

type HiOsPage = string;

interface HiOsNavNode {
  id: string;
  label: string;
  icon?: 'BASIC' | 'TIME' | 'DEVSEC' | 'NETSEC' | 'SWITCH' | 'DIAG' | 'ADV' | 'HELP';
  children?: HiOsNavNode[];
}

const HIOS_MENU_TREE: HiOsNavNode[] = [
  {
    id: 'GRP_BASIC',
    label: 'Basic Settings',
    icon: 'BASIC',
    children: [
      { id: 'SYS_SYSTEM', label: 'System' },
      {
        id: 'GRP_NET',
        label: 'Network',
        children: [
          { id: 'SYS_NETWORK', label: 'Global' },
          { id: 'SYS_NET_IPV4', label: 'IPv4' },
          { id: 'SYS_NET_IPV6', label: 'IPv6' },
          { id: 'SYS_NET_HIDISC', label: 'HiDiscovery' },
        ],
      },
      { id: 'SYS_SOFTWARE', label: 'Software' },
      { id: 'SYS_LOADSAVE', label: 'Load/Save' },
      { id: 'SYS_EXTMEM', label: 'External Memory' },
      { id: 'SYS_PORT', label: 'Port' },
      { id: 'SYS_RESTART', label: 'Restart' },
    ],
  },
  {
    id: 'GRP_TIME',
    label: 'Time',
    icon: 'TIME',
    children: [
      { id: 'TIME_BASIC', label: 'Basic Settings' },
      { id: 'TIME_SNTP', label: 'SNTP' },
      { id: 'TIME_PTP', label: 'IEEE 1588 / PTP' },
    ],
  },
  {
    id: 'GRP_DEVSEC',
    label: 'Device Security',
    icon: 'DEVSEC',
    children: [
      { id: 'DSEC_USERS', label: 'User Management' },
      { id: 'DSEC_AUTH', label: 'Authentication Lists' },
      { id: 'DSEC_MGMT', label: 'Management Access' },
      { id: 'DSEC_BANNER', label: 'Pre-login Banner' },
    ],
  },
  {
    id: 'GRP_NETSEC',
    label: 'Network Security',
    icon: 'NETSEC',
    children: [
      { id: 'NSEC_PORT', label: 'Port Security' },
      { id: 'NSEC_8021X', label: '802.1X Port Authentication' },
      { id: 'NSEC_RADIUS', label: 'RADIUS' },
      { id: 'NSEC_ACL', label: 'ACL' },
      { id: 'NSEC_DOS', label: 'DoS' },
    ],
  },
  {
    id: 'GRP_SWITCH',
    label: 'Switching',
    icon: 'SWITCH',
    children: [
      { id: 'SW_GLOBAL', label: 'Global' },
      { id: 'SW_RATE', label: 'Rate Limiter' },
      { id: 'SW_MAC', label: 'Filter for MAC Addresses' },
      { id: 'SW_IGMP', label: 'IGMP Snooping' },
      { id: 'SW_QOS', label: 'QoS/Priority' },
      { id: 'SW_VLAN', label: 'VLAN' },
      {
        id: 'GRP_L2RED',
        label: 'L2-Redundancy',
        children: [
          { id: 'SW_REDUNDANCY', label: 'MRP' },
          { id: 'SW_PRP_HSR', label: 'PRP / HSR' },
          { id: 'SW_RSTP', label: 'Spanning Tree' },
          { id: 'SW_LAG', label: 'Link Aggregation' },
        ],
      },
    ],
  },
  {
    id: 'GRP_DIAG',
    label: 'Diagnostics',
    icon: 'DIAG',
    children: [
      {
        id: 'GRP_STATCFG',
        label: 'Status Configuration',
        children: [
          { id: 'DIAG_DEVSTAT', label: 'Device Status' },
          { id: 'DIAG_SECSTAT', label: 'Security Status' },
          { id: 'DIAG_SIGCON', label: 'Signal Contact 1' },
        ],
      },
      {
        id: 'GRP_DIAGSYS',
        label: 'System',
        children: [
          { id: 'DIAG_SYSINFO', label: 'System Information' },
          { id: 'DIAG_HW', label: 'Hardware State' },
          { id: 'DIAG_CFGCHK', label: 'Configuration Check' },
          { id: 'DIAG_ARP', label: 'ARP' },
        ],
      },
      { id: 'DIAG_EMAIL', label: 'Email Notification' },
      { id: 'DIAG_SYSLOG', label: 'Syslog' },
      {
        id: 'GRP_DIAG_PORTS',
        label: 'Ports',
        children: [
          { id: 'DIAG_SFP', label: 'SFP' },
          { id: 'DIAG_TPCABLE', label: 'TP cable diagnosis' },
          { id: 'DIAG_PORT_MON', label: 'Port Monitor' },
          { id: 'DIAG_AUTODIS', label: 'Auto-Disable' },
          { id: 'DIAG_MIRROR', label: 'Port Mirroring' },
        ],
      },
      { id: 'DIAG_LLDP', label: 'LLDP' },
      { id: 'DIAG_REPORT', label: 'Report' },
    ],
  },
  {
    id: 'GRP_ADV',
    label: 'Advanced',
    icon: 'ADV',
    children: [
      { id: 'ADV_DHCP_SRV', label: 'DHCP Server' },
      { id: 'ADV_DHCP_REL', label: 'DHCP Relay' },
      { id: 'ADV_IND_PROTO', label: 'Industrial Protocols' },
      { id: 'ADV_CLI', label: 'CLI Prompt' },
    ],
  },
  {
    id: 'GRP_HELP',
    label: 'Help',
    icon: 'HELP',
    children: [
      { id: 'HELP_ONLINE', label: 'Online Help' },
      { id: 'HELP_SUPPORT', label: 'Support' },
      { id: 'HELP_ABOUT', label: 'About HiOS' },
    ],
  },
];

function findHiOsLabel(nodes: HiOsNavNode[], id: string): string {
  for (const n of nodes) {
    if (n.id === id) return n.label;
    if (n.children) {
      const hit = findHiOsLabel(n.children, id);
      if (hit) return hit;
    }
  }
  return '';
}

function filterHiOsTree(nodes: HiOsNavNode[], q: string): HiOsNavNode[] {
  if (!q) return nodes;
  const low = q.toLowerCase();
  const out: HiOsNavNode[] = [];
  for (const n of nodes) {
    const kids = n.children ? filterHiOsTree(n.children, q) : undefined;
    if (n.label.toLowerCase().includes(low) || (kids && kids.length > 0)) {
      out.push({ ...n, children: kids });
    }
  }
  return out;
}

const HiOsNavIcon: React.FC<{ kind?: HiOsNavNode['icon']; active?: boolean }> = ({ kind, active }) => {
  const stroke = active ? '#00468c' : '#475569';
  if (kind === 'BASIC') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
        <rect x="2" y="4" width="20" height="13" rx="1.5" />
        <line x1="8" y1="20" x2="16" y2="20" />
        <line x1="12" y1="17" x2="12" y2="20" />
      </svg>
    );
  }
  if (kind === 'TIME') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15.5 14" />
      </svg>
    );
  }
  if (kind === 'DEVSEC') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
        <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" />
      </svg>
    );
  }
  if (kind === 'NETSEC') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
        <rect x="5" y="11" width="14" height="9" rx="1.5" />
        <path d="M8 11V7a4 4 0 0 1 8 0v4" />
      </svg>
    );
  }
  if (kind === 'SWITCH') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
        <rect x="3" y="6" width="18" height="12" rx="1.5" />
        <line x1="7" y1="12" x2="17" y2="12" />
        <circle cx="7" cy="12" r="1" fill={stroke} />
        <circle cx="12" cy="12" r="1" fill={stroke} />
        <circle cx="17" cy="12" r="1" fill={stroke} />
      </svg>
    );
  }
  if (kind === 'DIAG') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="12" y1="8" x2="12" y2="16" />
        <line x1="8" y1="12" x2="16" y2="12" />
      </svg>
    );
  }
  if (kind === 'ADV') {
    return (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
        <polygon points="12 3 14.8 9 21 9.8 16.5 14 17.6 20.5 12 17.3 6.4 20.5 7.5 14 3 9.8 9.2 9 12 3" />
      </svg>
    );
  }
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth="2" className="shrink-0">
      <circle cx="12" cy="12" r="9" />
      <path d="M9.5 9.5a2.5 2.5 0 0 1 5 0c0 1.5-2.5 2-2.5 3.5" />
      <circle cx="12" cy="17" r="0.8" fill={stroke} />
    </svg>
  );
};

interface SwitchRecord {
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

interface SfpModule {
  port: string;
  partId: string;
  moduleType: string;
  serial: string;
  connector: string;
  supported: string;
  tempC: number;
  txMw: string;
  rxMw: string;
  txDbm: string;
  rxDbm: string;
}

interface SyslogRow {
  id: number;
  time: string;
  sev: 'INFO' | 'WARN' | 'CRIT';
  msg: string;
}

interface PersistedHiView {
  activeTabId: string;
  savedDeviceIds: string[];
  openWebIds: string[];
  urlInput: string;
  hiosPage: HiOsPage;
  ringBroken: boolean;
  igmpGlobal: boolean;
  gooseFilter: boolean;
  disabledPorts: Record<string, boolean>;
  ipOverrides: Record<string, { ip: string; netmask: string; gateway: string }>;
  pwChangedMap: Record<string, boolean>;
}

const STORAGE_KEY = 'sas_hiview_v3_state';
let memCache: PersistedHiView | null = null;

function loadInit(): Partial<PersistedHiView> {
  if (memCache) return memCache;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PersistedHiView;
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

function saveState(st: PersistedHiView) {
  memCache = st;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(st));
  } catch {
    // Ignore quota errors
  }
}

function fmtTs(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

const HiViewAppIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0">
    <rect x="1" y="1" width="14" height="14" rx="2" fill="#00468c" />
    <circle cx="8" cy="8" r="4.5" fill="#ffffff" />
    <circle cx="8" cy="8" r="2.2" fill="#00468c" />
  </svg>
);

const HirschmannHLogo = () => (
  <svg width="26" height="26" viewBox="0 0 32 32" className="shrink-0">
    <circle cx="16" cy="16" r="14" fill="none" stroke="#ffffff" strokeWidth="2" />
    <path d="M11 9 V23 M11 16 C11 13 20 13 20 16.5 V23" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

const DEFAULT_SFPS: SfpModule[] = [
  { port: '1/1', partId: 'M-SFP-LX/LC', moduleType: 'SFP', serial: 'A2123455', connector: 'LC', supported: 'Yes', tempC: 34, txMw: '0.3162', rxMw: '0.2754', txDbm: '-5.0', rxDbm: '-5.6' },
  { port: '1/2', partId: 'M-SFP-LX/LC', moduleType: 'SFP', serial: 'A2123456', connector: 'LC', supported: 'Yes', tempC: 35, txMw: '0.3098', rxMw: '0.2655', txDbm: '-5.0', rxDbm: '-5.9' },
  { port: '1/3', partId: 'M-SFP-SX/LC', moduleType: 'SFP', serial: 'A2123457', connector: 'LC', supported: 'Yes', tempC: 36, txMw: '0.2818', rxMw: '0.2399', txDbm: '-5.5', rxDbm: '-6.2' },
  { port: '1/4', partId: 'M-SFP-LX/LC', moduleType: 'SFP', serial: 'A2123458', connector: 'LC', supported: 'Yes', tempC: 35, txMw: '0.3020', rxMw: '0.2512', txDbm: '-5.2', rxDbm: '-6.0' },
];

export const HiViewTool: React.FC = () => {
  const init = useMemo(() => loadInit(), []);
  const { infrastructure, ieds } = useSubstationStore();

  const [ipOverrides, setIpOverrides] = useState<Record<string, { ip: string; netmask: string; gateway: string }>>(
    () => init.ipOverrides || {}
  );
  const [pwChangedMap, setPwChangedMap] = useState<Record<string, boolean>>(() => init.pwChangedMap || {});

  const discoveredCatalog: SwitchRecord[] = useMemo(() => {
    const matched = infrastructure.filter((d) => d.category === 'Ethernet Switch' || d.category === 'RedBox');
    const baseList =
      matched.length > 0
        ? matched.map((d, idx) => ({
            id: d.id,
            name: d.name,
            model: d.model,
            ip: d.ipAddress,
            netmask: '255.255.255.0',
            gateway: d.ipAddress.replace(/\.\d+$/, '.1'),
            mac: `94:AE:E3:AA:DE:${(0x60 + idx).toString(16).toUpperCase().padStart(2, '0')}`,
            firmware: 'HiOS-2A-09.4.03',
            redundancyRole: d.redundancyRole,
            ptpStatus: d.ptpStatus,
            status: d.status,
            passwordChanged: Boolean(pwChangedMap[d.id]),
          }))
        : [
            {
              id: 'SW-RSP35-A',
              name: 'SW-LAN-A-01',
              model: 'RSP35-1103',
              ip: '10.132.10.2',
              netmask: '255.255.255.0',
              gateway: '10.132.10.1',
              mac: '94:AE:E3:AA:DE:60',
              firmware: 'HiOS-2A-09.4.03',
              redundancyRole: 'PRP LAN-A / MRP Ring Manager',
              ptpStatus: 'PTPv2 Transparent Clock Locked',
              status: 'ONLINE' as const,
              passwordChanged: Boolean(pwChangedMap['SW-RSP35-A']),
            },
            {
              id: 'SW-RSP35-B',
              name: 'SW-LAN-B-01',
              model: 'RSP35-1103',
              ip: '10.132.20.2',
              netmask: '255.255.255.0',
              gateway: '10.132.20.1',
              mac: '94:AE:E3:AA:DE:61',
              firmware: 'HiOS-2A-09.4.03',
              redundancyRole: 'PRP LAN-B / MRP Ring Client',
              ptpStatus: 'PTPv2 Transparent Clock Locked',
              status: 'ONLINE' as const,
              passwordChanged: Boolean(pwChangedMap['SW-RSP35-B']),
            },
            {
              id: 'RB-RED25-01',
              name: 'REDBOX-01',
              model: 'RED25-0400',
              ip: '10.132.10.5',
              netmask: '255.255.255.0',
              gateway: '10.132.10.1',
              mac: '94:AE:E3:AA:DE:62',
              firmware: 'HiOS-2S-09.4.03',
              redundancyRole: 'PRP/HSR Redundancy Box',
              ptpStatus: 'PTPv2 Boundary Clock Locked',
              status: 'ONLINE' as const,
              passwordChanged: Boolean(pwChangedMap['RB-RED25-01']),
            },
          ];

    return baseList.map((sw) => {
      const ov = ipOverrides[sw.id];
      return ov ? { ...sw, ...ov } : sw;
    });
  }, [infrastructure, ipOverrides, pwChangedMap]);

  const [activeTabId, setActiveTabId] = useState<string>(() => init.activeTabId || 'DEVICES');
  const [savedDeviceIds, setSavedDeviceIds] = useState<string[]>(() => init.savedDeviceIds || []);
  const [openWebIds, setOpenWebIds] = useState<string[]>(() => init.openWebIds || []);
  const [urlInput, setUrlInput] = useState<string>(() => init.urlInput || '');
  const [hiosPage, setHiosPage] = useState<HiOsPage>(() => init.hiosPage || 'SYS_SYSTEM');
  const [navOpen, setNavOpen] = useState<Record<string, boolean>>({
    GRP_BASIC: true,
    GRP_DIAG: false,
    GRP_DIAG_PORTS: true,
  });
  const [navSearchOpen, setNavSearchOpen] = useState<boolean>(false);
  const [navSearch, setNavSearch] = useState<string>('');
  const [sntpEnabled, setSntpEnabled] = useState<boolean>(true);
  const [sntpPrimary, setSntpPrimary] = useState<string>('10.132.10.240');
  const [sntpSecondary, setSntpSecondary] = useState<string>('10.132.10.241');
  const [sntpPollSec, setSntpPollSec] = useState<number>(64);
  const [mgmtAccess, setMgmtAccess] = useState<Record<string, boolean>>({
    HTTP: false, HTTPS: true, Telnet: false, SSH: true, SNMPv1v2: false, SNMPv3: true, HiDiscovery: true,
  });
  const [dosFlags, setDosFlags] = useState<Record<string, boolean>>({
    LandAttack: true, TcpSynFin: true, Smurf: true, IcmpFrag: true, TcpNullScan: true,
  });
  const [mirrorEnabled, setMirrorEnabled] = useState<boolean>(true);
  const [mirrorSrc, setMirrorSrc] = useState<string>('1/5 (IED_132_L1)');
  const [mirrorDst, setMirrorDst] = useState<string>('1/10 (Engineering PC / Wireshark)');
  const [cableTestedAt, setCableTestedAt] = useState<string>('Ready');
  const [bannerText, setBannerText] = useState<string>('AUTHORIZED SUBSTATION AUTOMATION PERSONNEL ONLY. All HiOS/SSH sessions are logged.');

  const [discoveryScanned, setDiscoveryScanned] = useState<boolean>(false);
  const [selectedNic, setSelectedNic] = useState<string>('10.132.10.100 / 24: Realtek PCIe GBE Family Controller #1');
  const [selectedDiscId, setSelectedDiscId] = useState<string>('');
  const [blinkingId, setBlinkingId] = useState<string>('');
  const [discCtxMenu, setDiscCtxMenu] = useState<{ x: number; y: number; sw: SwitchRecord } | null>(null);

  // Modals: Configure IP, Change Password, SSH CLI Window, Ping Popup
  const [assignModalSw, setAssignModalSw] = useState<SwitchRecord | null>(null);
  const [assignIp, setAssignIp] = useState<string>('');
  const [assignMask, setAssignMask] = useState<string>('255.255.255.0');
  const [assignGw, setAssignGw] = useState<string>('');

  const [pwModalSw, setPwModalSw] = useState<SwitchRecord | null>(null);
  const [pwNew, setPwNew] = useState<string>('');
  const [pwConfirm, setPwConfirm] = useState<string>('');

  const [cliSwitch, setCliSwitch] = useState<SwitchRecord | null>(null);
  const [cliLines, setCliLines] = useState<string[]>([]);
  const [cliInput, setCliInput] = useState<string>('');

  const [pingResult, setPingResult] = useState<{ sw: SwitchRecord; lines: string[] } | null>(null);

  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [quickPopupOpen, setQuickPopupOpen] = useState<boolean>(false);
  const [statusToast, setStatusToast] = useState<string>('');
  const [nvmDirty, setNvmDirty] = useState<boolean>(false);

  const [ringBroken, setRingBroken] = useState<boolean>(() => Boolean(init.ringBroken));
  const [igmpGlobal, setIgmpGlobal] = useState<boolean>(() => init.igmpGlobal ?? true);
  const [gooseFilter, setGooseFilter] = useState<boolean>(() => init.gooseFilter ?? true);
  const [disabledPorts, setDisabledPorts] = useState<Record<string, boolean>>(() => init.disabledPorts || {});
  const [syslogs, setSyslogs] = useState<SyslogRow[]>([
    { id: 1, time: fmtTs(), sev: 'INFO', msg: 'HiView 4.2 ready. Use Discovery tab or bottom URL bar to manage Hirschmann devices.' },
  ]);

  const cliScrollRef = useRef<HTMLDivElement | null>(null);
  const cliInputRef = useRef<HTMLInputElement | null>(null);
  const logSeqRef = useRef<number>(2);

  useEffect(() => {
    saveState({
      activeTabId,
      savedDeviceIds,
      openWebIds,
      urlInput,
      hiosPage,
      ringBroken,
      igmpGlobal,
      gooseFilter,
      disabledPorts,
      ipOverrides,
      pwChangedMap,
    });
  }, [activeTabId, savedDeviceIds, openWebIds, urlInput, hiosPage, ringBroken, igmpGlobal, gooseFilter, disabledPorts, ipOverrides, pwChangedMap]);

  useEffect(() => {
    const close = () => {
      setOpenMenu(null);
      setQuickPopupOpen(false);
      setDiscCtxMenu(null);
    };
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, []);

  useEffect(() => {
    if (cliScrollRef.current) {
      cliScrollRef.current.scrollTop = cliScrollRef.current.scrollHeight;
    }
  }, [cliLines.length]);

  const pushLog = (sev: SyslogRow['sev'], msg: string) => {
    logSeqRef.current += 1;
    const id = logSeqRef.current;
    setSyslogs((prev) => [...prev.slice(-120), { id, time: fmtTs(), sev, msg }]);
    setStatusToast(msg);
    window.setTimeout(() => setStatusToast((cur) => (cur === msg ? '' : cur)), 3500);
  };

  const openSwitchWebGui = (sw: SwitchRecord, addToDevices = false) => {
    if (addToDevices) {
      setSavedDeviceIds((prev) => (prev.includes(sw.id) ? prev : [...prev, sw.id]));
    }
    setOpenWebIds((prev) => (prev.includes(sw.id) ? prev : [...prev, sw.id]));
    setUrlInput(`https://${sw.ip}`);
    setActiveTabId(`WEB:${sw.id}`);
    setHiosPage('SYS_SYSTEM');
    pushLog('INFO', `Opened HiOS Web GUI for ${sw.name} (${sw.ip})`);
  };

  const openSshCli = (sw: SwitchRecord) => {
    setCliSwitch(sw);
    setCliLines([
      'Copyright (c) 2011-2024 Hirschmann Automation and Control GmbH',
      '                     All rights reserved',
      `      ${sw.model} Release ${sw.firmware}`,
      '           (Build date 2024-04-16 13:11)',
      '',
      `System Name   : ${sw.name}`,
      `Management IP : ${sw.ip}`,
      `Subnet Mask   : ${sw.netmask}`,
      `Base MAC      : ${sw.mac}`,
      `System Time   : ${new Date().toISOString().replace('T', ' ').slice(0, 19)}`,
      '',
      'Authenticated as admin. Type "show sfp", "show sysinfo", "show mrp", "show ptp", or "help".',
    ]);
    setCliInput('');
    window.setTimeout(() => cliInputRef.current?.focus(), 40);
  };

  const runSshCommand = (raw: string) => {
    if (!cliSwitch) return;
    const cmd = raw.trim();
    const prompt = `*(${cliSwitch.model.split('-')[0]})>`;
    const next: string[] = [`${prompt}${cmd}`];
    const low = cmd.toLowerCase();

    if (low === 'exit' || low === 'quit') {
      setCliSwitch(null);
      return;
    }
    if (low === 'clear') {
      setCliLines([]);
      return;
    }
    if (low === 'help' || low === '?') {
      next.push('Commands: show sfp | show sysinfo | show interface | show mrp | show ptp | clear | exit');
    } else if (low === 'show sfp') {
      next.push('       Part ID          Module type  Temp[C/F] TxPower[dBm/mW]  RxPower[dBm/mW]');
      next.push('Intf   Serial number    Connector');
      next.push('-----  ---------------  -----------  --------- ---------------- ----------------');
      DEFAULT_SFPS.forEach((s) => {
        const f = Math.round((s.tempC * 9) / 5 + 32);
        next.push(
          `${s.port.padEnd(6)} ${s.partId.padEnd(16)} ${s.moduleType.padEnd(12)} ${`${s.tempC}/ ${f}`.padEnd(9)} ${`${s.txDbm} /${s.txMw}`.padEnd(16)} ${s.rxDbm} /${s.rxMw}`
        );
        next.push(`       ${s.serial.padEnd(16)} ${s.connector}`);
      });
    } else if (low === 'show sysinfo') {
      next.push(`System Name   : ${cliSwitch.name}`);
      next.push(`Product       : ${cliSwitch.model} (${cliSwitch.firmware})`);
      next.push(`IP / Mask     : ${cliSwitch.ip} / ${cliSwitch.netmask}`);
      next.push(`Power Supply  : PSU1=present, PSU2=${ringBroken ? 'defective' : 'present'}`);
      next.push(`Temperature   : 24 C (Limits: 0 C .. 70 C), Humidity: 54 %`);
    } else if (low === 'show interface') {
      next.push('Port   Media  Admin  Link  Speed      PVID');
      next.push('1/1    SFP    Up     Up    1000M-LX   100');
      next.push(`1/2    SFP    Up     ${ringBroken ? 'Down' : 'Up  '}  1000M-LX   100`);
      next.push('1/3    SFP    Up     Up    1000M-SX   200');
      next.push('1/4    SFP    Up     Up    1000M-LX   100');
      next.push('1/5    RJ45   Up     Up    100M-TX    200');
    } else if (low === 'show mrp') {
      next.push(`MRP Ring State : ${ringBroken ? 'OPEN (Failover Active < 8 ms)' : 'CLOSED (Redundancy Guaranteed)'}`);
      next.push(`PRP/HSR Role   : ${cliSwitch.redundancyRole}`);
    } else if (low === 'show ptp') {
      next.push(`PTPv2 Status   : ${cliSwitch.ptpStatus}`);
      next.push('Profile        : IEC 61850-9-3 Power Profile (Offset +18 ns)');
    } else if (cmd) {
      next.push(`% Invalid input detected: "${cmd}". Type "help" or "show sfp".`);
    }
    setCliLines((prev) => [...prev, ...next]);
  };

  const runPing = (sw: SwitchRecord) => {
    setPingResult({
      sw,
      lines: [
        `Pinging ${sw.ip} (${sw.name}) with 32 bytes of data:`,
        `Reply from ${sw.ip}: bytes=32 time<1ms TTL=64`,
        `Reply from ${sw.ip}: bytes=32 time<1ms TTL=64`,
        `Reply from ${sw.ip}: bytes=32 time<1ms TTL=64`,
        `Reply from ${sw.ip}: bytes=32 time<1ms TTL=64`,
        `Packets: Sent = 4, Received = 4, Lost = 0 (0% loss), Average = 0.58 ms`,
      ],
    });
    pushLog('INFO', `Ping ${sw.ip} (${sw.name}): 4/4 replies OK (<1ms).`);
  };

  const closeWebTab = (swId: string) => {
    const remaining = openWebIds.filter((id) => id !== swId);
    setOpenWebIds(remaining);
    if (activeTabId === `WEB:${swId}`) {
      setActiveTabId(remaining.length > 0 ? `WEB:${remaining[remaining.length - 1]}` : 'DEVICES');
    }
  };

  const handleOpenUrl = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const raw = urlInput.trim().replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
    const matched =
      discoveredCatalog.find((s) => s.ip === raw || s.name.toLowerCase() === raw.toLowerCase()) ||
      discoveredCatalog[0];
    if (matched) openSwitchWebGui(matched, true);
  };

  const handleScanDiscovery = () => {
    setDiscoveryScanned(true);
    if (discoveredCatalog[0]) setSelectedDiscId(discoveredCatalog[0].id);
    pushLog('INFO', `HiDiscovery v2 scan completed: ${discoveredCatalog.length} device(s) found.`);
  };

  const activeWebSwitch = activeTabId.startsWith('WEB:')
    ? discoveredCatalog.find((s) => s.id === activeTabId.slice(4)) || null
    : null;
  const savedDevices = discoveredCatalog.filter((d) => savedDeviceIds.includes(d.id));

  const activeHiOsTitle = useMemo(() => findHiOsLabel(HIOS_MENU_TREE, hiosPage) || 'System', [hiosPage]);
  const filteredNavTree = useMemo(() => filterHiOsTree(HIOS_MENU_TREE, navSearch.trim()), [navSearch]);

  const setAllNavExpanded = (open: boolean) => {
    const next: Record<string, boolean> = {};
    const walk = (nodes: HiOsNavNode[]) => {
      nodes.forEach((n) => {
        if (n.children) {
          next[n.id] = open;
          walk(n.children);
        }
      });
    };
    walk(HIOS_MENU_TREE);
    setNavOpen(next);
  };

  const renderHiOsNavNodes = (nodes: HiOsNavNode[], depth = 0): React.ReactNode => {
    return nodes.map((node) => {
      const hasKids = Boolean(node.children && node.children.length > 0);
      const isOpen = navSearch.trim().length > 0 || Boolean(navOpen[node.id]);
      const isSelected = hiosPage === node.id;
      const containsSelected = hasKids && Boolean(findHiOsLabel(node.children || [], hiosPage));

      return (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => {
              if (hasKids) {
                setNavOpen((prev) => ({ ...prev, [node.id]: !prev[node.id] }));
              } else {
                setHiosPage(node.id);
              }
            }}
            className="w-full flex items-center justify-between py-[6px] pr-3 text-left hover:bg-[#f1f5f9] cursor-pointer"
            style={{
              paddingLeft: `${12 + depth * 18}px`,
              background: isSelected ? '#e8f2fc' : 'transparent',
              color: isSelected || (depth === 0 && (isOpen || containsSelected)) ? '#00468c' : '#263238',
              fontWeight: depth === 0 || isSelected ? 600 : 400,
              fontSize: depth === 0 ? '12px' : '11.5px',
              border: 'none',
            }}
          >
            <span className="flex items-center gap-2.5 truncate">
              {depth === 0 && <HiOsNavIcon kind={node.icon} active={isOpen || containsSelected} />}
              <span className="truncate">{node.label}</span>
            </span>
            {hasKids && <span className="text-[#64748b] font-normal ml-2">{isOpen ? '−' : '+'}</span>}
          </button>
          {hasKids && isOpen && <div>{renderHiOsNavNodes(node.children!, depth + 1)}</div>}
        </div>
      );
    });
  };

  return (
    <div
      className="hiview-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f4f4f4] text-[#111827] border border-[#707070] shadow-lg overflow-hidden"
      style={{ colorScheme: 'light' }}
    >
      <style>{`
        #root .hiview-app, .hiview-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f4f4f4 !important;
          color: #111827 !important;
          color-scheme: light !important;
        }
        #root .hiview-app *::-webkit-scrollbar { width: 11px !important; height: 11px !important; }
        #root .hiview-app *::-webkit-scrollbar-track { background: #f0f0f0 !important; }
        #root .hiview-app *::-webkit-scrollbar-thumb { background: #c1c1c1 !important; border: 2px solid #f0f0f0 !important; border-radius: 0 !important; }
        #root .hiview-app p, #root .hiview-app span, #root .hiview-app label, #root .hiview-app div { text-shadow: none !important; }
        #root .hiview-app button { font-family: "Segoe UI", Tahoma, sans-serif !important; box-shadow: none !important; }
        #root .hiview-app input:not([type="checkbox"]):not(.hv-cli-input),
        #root .sas-workspace-main .hiview-app input:not([type="checkbox"]):not(.hv-cli-input),
        #root .hiview-app select,
        #root .sas-workspace-main .hiview-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #7a7a7a !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          color-scheme: light !important;
        }
        #root .hiview-app input.hv-cli-input,
        #root .sas-workspace-main .hiview-app input.hv-cli-input {
          background: transparent !important;
          background-color: transparent !important;
          color: #e5e7eb !important;
          border: none !important;
          outline: none !important;
          box-shadow: none !important;
          font-family: Consolas, "Courier New", monospace !important;
        }
        #root .hiview-app select option { background-color: #ffffff !important; color: #000000 !important; }
        #root .hiview-app input[type="checkbox"] { color-scheme: light !important; accent-color: #00468c !important; }
        #root .hiview-app .hv-menu-btn {
          padding: 3px 10px !important;
          font-size: 12px !important;
          background: transparent !important;
          border: none !important;
          color: #ffffff !important;
          cursor: pointer;
        }
        #root .hiview-app .hv-menu-btn:hover, #root .hiview-app .hv-menu-btn.active { background: #005bb5 !important; }
        #root .hiview-app .hv-drop {
          background: #ffffff !important;
          border: 1px solid #999999 !important;
          box-shadow: 2px 3px 10px rgba(0,0,0,0.28) !important;
          min-width: 190px;
          z-index: 90;
        }
        #root .hiview-app .hv-drop-item {
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          text-align: left;
          padding: 5px 12px !important;
          font-size: 12px !important;
          background: transparent !important;
          border: none !important;
          color: #111827 !important;
          cursor: pointer;
        }
        #root .hiview-app .hv-drop-item:hover:not(:disabled) { background: #dbeafe !important; }
        #root .hiview-app .hv-drop-item:disabled { color: #9ca3af !important; cursor: default; }
        #root .hiview-app .hv-btn {
          background: #ffffff !important;
          color: #111827 !important;
          border: 1px solid #94a3b8 !important;
          padding: 3px 10px !important;
          font-size: 11.5px !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .hiview-app .hv-btn-blue {
          background: #00468c !important;
          color: #ffffff !important;
          border: 1px solid #003366 !important;
          padding: 3px 11px !important;
          font-size: 11.5px !important;
          font-weight: 600 !important;
          border-radius: 2px !important;
          cursor: pointer;
        }
        #root .sas-app-shell .sas-workspace-main .hiview-app table,
        #root .hiview-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          color: #111827 !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .hiview-app table thead th,
        #root .hiview-app table thead th {
          background: #ececec !important;
          color: #111827 !important;
          font-weight: 600 !important;
          text-align: left;
          padding: 4px 7px !important;
          border-bottom: 1px solid #bdbdbd !important;
          border-right: 1px solid #dcdcdc !important;
          position: sticky;
          top: 0;
          z-index: 4;
          font-size: 11.5px !important;
          text-transform: none !important;
        }
        #root .sas-app-shell .sas-workspace-main .hiview-app table tbody td,
        #root .hiview-app table tbody td {
          padding: 3px 7px !important;
          border-bottom: 1px solid #e5e5e5 !important;
          border-right: 1px solid #f0f0f0 !important;
          color: #111827 !important;
          background-color: #ffffff !important;
          vertical-align: middle;
        }
        #root .sas-app-shell .sas-workspace-main .hiview-app table tbody tr.hv-row-sel td,
        #root .hiview-app table tbody tr.hv-row-sel td {
          background-color: #0088cc !important;
          color: #ffffff !important;
        }
      `}</style>

      {/* 1. WINDOWS TITLE BAR */}
      <div className="h-[28px] bg-[#ffffff] border-b border-[#e5e5e5] px-2 flex items-center justify-between shrink-0 text-[12px] text-[#000000]">
        <div className="flex items-center gap-1.5">
          <HiViewAppIcon />
          <span>{activeWebSwitch ? `HiView - ${activeWebSwitch.ip}` : 'HiView -'}</span>
        </div>
        <div className="flex items-center gap-3 text-[#333333] pr-1">
          <span>─</span>
          <span>□</span>
          <span>✕</span>
        </div>
      </div>

      {/* 2. DARK BELDEN BLUE MENU BAR */}
      <div className="h-[26px] bg-[#00468c] px-1 flex items-center gap-0.5 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <button type="button" className={`hv-menu-btn ${openMenu === 'File' ? 'active' : ''}`} onClick={() => setOpenMenu(openMenu === 'File' ? null : 'File')}>
            File
          </button>
          {openMenu === 'File' && (
            <div className="hv-drop absolute left-0 top-full py-0.5">
              <button type="button" className="hv-drop-item" onClick={() => { setOpenMenu(null); setSavedDeviceIds(discoveredCatalog.map((d) => d.id)); setActiveTabId('DEVICES'); }}>
                Load Substation Devices
              </button>
              <button type="button" className="hv-drop-item" onClick={() => { setOpenMenu(null); setSavedDeviceIds([]); setOpenWebIds([]); setActiveTabId('DEVICES'); }}>
                Clear Devices
              </button>
            </div>
          )}
        </div>

        <div className="relative">
          <button type="button" className={`hv-menu-btn ${openMenu === 'Devices' ? 'active' : ''}`} onClick={() => setOpenMenu(openMenu === 'Devices' ? null : 'Devices')}>
            Devices
          </button>
          {openMenu === 'Devices' && (
            <div className="hv-drop absolute left-0 top-full py-0.5">
              <button type="button" className="hv-drop-item" onClick={() => { setOpenMenu(null); setActiveTabId('DISCOVERY'); handleScanDiscovery(); }}>
                Discover Devices (HiDiscovery v2)
              </button>
              {discoveredCatalog.map((sw) => (
                <button key={sw.id} type="button" className="hv-drop-item" onClick={() => { setOpenMenu(null); openSwitchWebGui(sw, true); }}>
                  GUI — {sw.name} ({sw.ip})
                </button>
              ))}
            </div>
          )}
        </div>

        <button type="button" className="hv-menu-btn" onClick={() => pushLog('INFO', 'Preferences: HiDiscovery v2 enabled, Embedded HiOS Web Engine active.')}>
          Preferences
        </button>
        <button type="button" className="hv-menu-btn" onClick={() => pushLog('INFO', 'Hirschmann HiView 4.2 — Industrial Switch Discovery, HiOS GUI & SSH CLI.')}>
          Help
        </button>
        {statusToast && <span className="ml-auto pr-2 text-[11px] text-[#bae6fd] truncate max-w-[460px]">{statusToast}</span>}
      </div>

      {/* 3. TOP TAB STRIP */}
      <div className="bg-[#dcdcdc] border-b border-[#b5b5b5] pt-[4px] px-[4px] flex items-end gap-[2px] shrink-0 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTabId('DEVICES')}
          className="px-3 py-[3px] text-[12px] border border-b-0 cursor-pointer"
          style={{
            background: activeTabId === 'DEVICES' ? '#f4f4f4' : '#e6e6e6',
            color: activeTabId === 'DEVICES' ? '#006699' : '#333333',
            borderColor: activeTabId === 'DEVICES' ? '#0078d7 #b5b5b5 transparent #b5b5b5' : '#b5b5b5',
            borderTopWidth: activeTabId === 'DEVICES' ? '2px' : '1px',
            marginBottom: activeTabId === 'DEVICES' ? '-1px' : '0',
          }}
        >
          Devices
        </button>

        <button
          type="button"
          onClick={() => setActiveTabId('DISCOVERY')}
          className="px-3 py-[3px] text-[12px] border border-b-0 cursor-pointer"
          style={{
            background: activeTabId === 'DISCOVERY' ? '#ffffff' : '#e6e6e6',
            color: activeTabId === 'DISCOVERY' ? '#006699' : '#333333',
            borderColor: activeTabId === 'DISCOVERY' ? '#0078d7 #b5b5b5 transparent #b5b5b5' : '#b5b5b5',
            borderTopWidth: activeTabId === 'DISCOVERY' ? '2px' : '1px',
            marginBottom: activeTabId === 'DISCOVERY' ? '-1px' : '0',
          }}
        >
          Discovery
        </button>

        {openWebIds.map((swId) => {
          const sw = discoveredCatalog.find((s) => s.id === swId);
          if (!sw) return null;
          const tabKey = `WEB:${swId}`;
          const active = activeTabId === tabKey;
          return (
            <div
              key={tabKey}
              onClick={() => setActiveTabId(tabKey)}
              className="px-2.5 py-[3px] text-[12px] border border-b-0 cursor-pointer flex items-center gap-2"
              style={{
                background: active ? '#ffffff' : '#e6e6e6',
                color: active ? '#00468c' : '#333333',
                borderColor: active ? '#0078d7 #b5b5b5 transparent #b5b5b5' : '#b5b5b5',
                borderTopWidth: active ? '2px' : '1px',
                marginBottom: active ? '-1px' : '0',
              }}
            >
              <span className="font-medium">{`${sw.ip} (${sw.name})`}</span>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); closeWebTab(swId); }}
                className="text-[11px] px-1 hover:bg-[#fee2e2] hover:text-[#b91c1c] rounded"
                style={{ background: 'transparent', border: 'none' }}
              >
                ×
              </button>
            </div>
          );
        })}
      </div>

      {/* 4. MAIN WORKSPACE */}
      <div className="flex-1 min-h-0 overflow-hidden bg-[#f4f4f4]">
        {/* TAB A: DEVICES */}
        {activeTabId === 'DEVICES' && (
          <div className="h-full overflow-auto p-4">
            {savedDevices.length === 0 ? (
              <div className="h-full w-full" />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-w-4xl">
                {savedDevices.map((sw) => (
                  <div
                    key={sw.id}
                    onDoubleClick={() => openSwitchWebGui(sw)}
                    className="bg-[#ffffff] border border-[#bdbdbd] p-3 shadow-sm hover:border-[#00468c] cursor-pointer flex flex-col gap-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[13px] text-[#00468c]">{sw.name}</span>
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#dcfce7] text-[#166534]">{sw.status}</span>
                    </div>
                    <div className="text-[11.5px] text-[#334155]">{sw.model} · {sw.firmware}</div>
                    <div className="font-mono text-[11.5px] text-[#0369a1]">{sw.ip} · {sw.mac}</div>
                    <div className="pt-2 mt-1 border-t border-[#e5e5e5] flex justify-end gap-1.5">
                      <button type="button" className="hv-btn" onClick={() => openSshCli(sw)}>CLI</button>
                      <button type="button" className="hv-btn" onClick={() => runPing(sw)}>Ping</button>
                      <button type="button" className="hv-btn-blue" onClick={() => openSwitchWebGui(sw)}>GUI</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB B: DISCOVERY — Exact 12-column HiDiscovery v2 table with Right-Click Context Menu */}
        {activeTabId === 'DISCOVERY' && (
          <div className="h-full flex flex-col bg-[#ffffff] overflow-hidden">
            <div className="flex-1 overflow-auto bg-[#ffffff]">
              <table>
                <thead>
                  <tr>
                    <th style={{ width: '5%', textAlign: 'center' }}>Signal</th>
                    <th style={{ width: '8%', textAlign: 'center' }} title="Configurable">Configurable</th>
                    <th style={{ width: '8%', textAlign: 'center' }} title="Password Changed">Password ...</th>
                    <th style={{ width: '11%' }}>MAC Address</th>
                    <th style={{ width: '10%' }}>
                      <div className="flex items-center justify-between"><span>IP Address</span><span className="text-[9px]">▲</span></div>
                    </th>
                    <th style={{ width: '9%' }}>Netmask</th>
                    <th style={{ width: '8%' }}>Gateway</th>
                    <th style={{ width: '15%' }}>IPv6 Address (Link local)</th>
                    <th style={{ width: '6%' }}>Type</th>
                    <th style={{ width: '7%' }}>Product</th>
                    <th style={{ width: '6%' }}>Name</th>
                    <th style={{ width: '6%' }}>Software Version</th>
                    <th style={{ width: '1%', textAlign: 'center' }}>+</th>
                  </tr>
                </thead>
                <tbody>
                  {discoveryScanned ? (
                    discoveredCatalog.map((sw) => {
                      const sel = selectedDiscId === sw.id;
                      const blink = blinkingId === sw.id;
                      const ipv6 = `fe80::280:63ff:fe${sw.mac.slice(9, 11).toLowerCase()}:${sw.mac.slice(12, 14).toLowerCase()}${sw.mac.slice(15, 17).toLowerCase()}`;
                      const shortType = sw.model.includes('RED25') ? 'RED25' : 'RSP35';
                      return (
                        <tr
                          key={sw.id}
                          onClick={() => setSelectedDiscId(sw.id)}
                          onDoubleClick={() => openSwitchWebGui(sw, true)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setSelectedDiscId(sw.id);
                            setDiscCtxMenu({ x: e.clientX, y: e.clientY, sw });
                          }}
                          className={`cursor-pointer ${sel ? 'hv-row-sel' : ''}`}
                        >
                          <td className="text-center">
                            <input
                              type="checkbox"
                              checked={blink}
                              onChange={() => {
                                setBlinkingId(blink ? '' : sw.id);
                                if (!blink) pushLog('INFO', `Signal LEDs flashing on ${sw.name} (${sw.mac}).`);
                              }}
                            />
                          </td>
                          <td className="text-center">
                            <input type="checkbox" checked readOnly />
                          </td>
                          <td className="text-center">
                            <input type="checkbox" checked={sw.passwordChanged} readOnly />
                          </td>
                          <td className="font-mono text-[11px]">{sw.mac}</td>
                          <td className="font-mono text-[11.5px] font-semibold">{sw.ip}</td>
                          <td className="font-mono text-[11px]">{sw.netmask}</td>
                          <td className="font-mono text-[11px]">{sw.gateway}</td>
                          <td className="font-mono text-[10.5px]">{ipv6}</td>
                          <td className="font-mono text-[11px]">{shortType}</td>
                          <td className="text-[11px]">{sw.model}</td>
                          <td className="font-semibold text-[11.5px]">{sw.name}</td>
                          <td className="font-mono text-[11px]">{sw.firmware}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDiscCtxMenu({ x: e.clientX - 180, y: e.clientY, sw });
                              }}
                              title="Right-click or click for Configure / GUI / Ping / CLI"
                              className="font-bold cursor-pointer"
                              style={{ background: 'transparent', border: 'none', color: sel ? '#ffffff' : '#00468c' }}
                            >
                              ⋮
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={13} className="text-center py-20 text-[#666666] text-[12px]">
                        -
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB C: AUTHENTIC HiOS-2A-09.4.03 EMBEDDED WEB GUI (matches Figure 5 & Figure 6!) */}
        {activeWebSwitch && (
          <div className="h-full flex flex-col bg-[#eaeaea] overflow-hidden">
            {/* HiOS Blue Top Header */}
            <div className="h-[40px] bg-[#00468c] text-white px-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <HirschmannHLogo />
                <span className="text-[15px] font-normal tracking-wide">{activeHiOsTitle}</span>
              </div>
              <div className="flex items-center gap-4 text-[13px]">
                <button
                  type="button"
                  onClick={() => { setNvmDirty(false); pushLog('INFO', `${activeWebSwitch.name}: Configuration saved to NVM.`); }}
                  title={nvmDirty ? 'Unsaved changes — Click to Save to NVM' : 'Configuration Saved in NVM'}
                  className="text-white cursor-pointer hover:opacity-80 flex items-center gap-0.5"
                  style={{ background: 'transparent', border: 'none' }}
                >
                  <span>💾</span>
                  {nvmDirty && <span className="text-[#facc15] font-bold text-[12px]">*</span>}
                </button>
                <button
                  type="button"
                  onClick={() => openSshCli(activeWebSwitch)}
                  title="Open SSH CLI"
                  className="text-white cursor-pointer text-[11.5px] font-mono border border-white/50 px-1.5 py-0.5 rounded"
                  style={{ background: 'transparent' }}
                >
                  SSH CLI
                </button>
                <span title="System Alarms" className="relative cursor-pointer" onClick={() => setHiosPage('DIAG_SYSLOG')}>
                  🔔<span className="inline-block w-2 h-2 rounded-full bg-[#ef4444] align-top" />
                </span>
                <span title="Logged in as admin">👤</span>
              </div>
            </div>

            {/* HiOS Split Body: Left Accordion Menu + Right Material Cards */}
            <div className="flex-1 flex min-h-0 overflow-hidden">
              {/* Left HiOS Sidebar — Exact Hirschmann HiOS-2A-09.4.03 Navigation Tree */}
              <div className="w-[232px] shrink-0 bg-[#ffffff] border-r border-[#d4d4d4] flex flex-col overflow-hidden text-[12px]">
                <div className="px-3 py-2 border-b border-[#e5e5e5] flex items-center justify-between text-[11px] font-semibold text-[#334155] shrink-0">
                  <span className="font-mono">{activeWebSwitch.firmware}</span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      title="Search menu"
                      onClick={() => setNavSearchOpen((v) => !v)}
                      className="p-0.5 hover:bg-[#e2e8f0] rounded cursor-pointer"
                      style={{ background: 'transparent', border: 'none', color: '#475569' }}
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <circle cx="11" cy="11" r="7" />
                        <line x1="20" y1="20" x2="16.2" y2="16.2" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      title="Expand all"
                      onClick={() => setAllNavExpanded(true)}
                      className="p-0.5 hover:bg-[#e2e8f0] rounded cursor-pointer text-[11px]"
                      style={{ background: 'transparent', border: 'none', color: '#475569' }}
                    >
                      ⊞
                    </button>
                    <button
                      type="button"
                      title="Collapse all"
                      onClick={() => setAllNavExpanded(false)}
                      className="p-0.5 hover:bg-[#e2e8f0] rounded cursor-pointer text-[11px]"
                      style={{ background: 'transparent', border: 'none', color: '#475569' }}
                    >
                      ⊟
                    </button>
                  </div>
                </div>
                {navSearchOpen && (
                  <div className="px-2 py-1.5 border-b border-[#e5e5e5] bg-[#f8fafc] shrink-0">
                    <input
                      type="text"
                      value={navSearch}
                      onChange={(e) => setNavSearch(e.target.value)}
                      placeholder="Filter menu (e.g. SFP, VLAN, MRP)..."
                      className="w-full h-[22px] px-1.5 text-[11px]"
                    />
                  </div>
                )}
                <div className="flex-1 overflow-auto py-1">{renderHiOsNavNodes(filteredNavTree)}</div>
              </div>

              {/* Right HiOS Content Area — Delegated to Full Interactive HiOsWorkspace */}
              <HiOsWorkspace
                sw={activeWebSwitch}
                hiosPage={hiosPage}
                activeTitle={activeHiOsTitle}
                ringBroken={ringBroken}
                onToggleRingBreak={() => {
                  const next = !ringBroken;
                  setRingBroken(next);
                  setNvmDirty(true);
                  pushLog(
                    next ? 'CRIT' : 'INFO',
                    next
                      ? `${activeWebSwitch.name}: Fiber break on Ring Port 1/2 — MRP failover < 8 ms.`
                      : `${activeWebSwitch.name}: Ring Port 1/2 restored — MRP Ring CLOSED.`
                  );
                }}
                disabledPorts={disabledPorts}
                onTogglePort={(pid) => {
                  const k = `${activeWebSwitch.id}:${pid}`;
                  const nextDis = !disabledPorts[k];
                  setDisabledPorts((prev) => ({ ...prev, [k]: nextDis }));
                  setNvmDirty(true);
                  pushLog(nextDis ? 'WARN' : 'INFO', `${activeWebSwitch.name} Port ${pid} set ${nextDis ? 'Off' : 'On'}.`);
                }}
                syslogs={syslogs}
                onPushLog={pushLog}
                onClearLogs={() => setSyslogs([])}
                onOpenSsh={() => openSshCli(activeWebSwitch)}
                onUpdateIp={(ip, netmask, gateway) => {
                  setIpOverrides((prev) => ({ ...prev, [activeWebSwitch.id]: { ip, netmask, gateway } }));
                }}
                onMarkDirty={() => setNvmDirty(true)}
                onSaveNvm={() => {
                  setNvmDirty(false);
                  pushLog('INFO', `${activeWebSwitch.name}: Running configuration saved to NVM & ACA22.`);
                }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 5. BOTTOM DARK BELDEN BLUE BAR */}
      <div className="h-[36px] bg-[#00468c] px-2.5 flex items-center gap-2.5 shrink-0 relative" onClick={(e) => e.stopPropagation()}>
        {activeTabId === 'DISCOVERY' ? (
          <>
            <select
              value={selectedNic}
              onChange={(e) => setSelectedNic(e.target.value)}
              className="h-[23px] w-[260px] sm:w-[320px] px-1.5 text-[11.5px]"
            >
              <option value="10.132.10.100 / 24: Realtek PCIe GBE Family Controller #1">
                10.132.10.100 / 24: Realtek PCIe GBE Family Controller #1
              </option>
              <option value="10.132.20.100 / 24: Station Bus LAN-B (Intel(R) I210 Gigabit)">
                10.132.20.100 / 24: Station Bus LAN-B (Intel(R) I210 Gigabit)
              </option>
              <option value="192.168.1.96 / 24: Intel(R) Wireless-AC 9560 160MHz">
                192.168.1.96 / 24: Intel(R) Wireless-AC 9560 160MHz
              </option>
            </select>
            <button
              type="button"
              onClick={handleScanDiscovery}
              title="Search / Discover Hirschmann devices (HiDiscovery v2)"
              className="p-1 rounded hover:bg-[#005bb5] cursor-pointer flex items-center justify-center"
              style={{ background: 'transparent', border: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <polyline points="21 3 21 9 15 9" />
              </svg>
            </button>
            <span className="text-white text-[11.5px] truncate">
              The device discovery only discovers devices which support the HiDiscovery v2 protocol.
            </span>
          </>
        ) : (
          <>
            <form onSubmit={handleOpenUrl} className="flex items-center gap-2">
              <label className="text-white text-[12px]">URL:</label>
              <input
                type="text"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                placeholder="10.132.10.2"
                className="h-[22px] w-[220px] sm:w-[290px] px-1.5 text-[12px]"
              />
              <button type="submit" title="Open GUI" className="p-1 rounded hover:bg-[#005bb5] cursor-pointer" style={{ background: 'transparent', border: 'none' }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8">
                  <circle cx="12" cy="12" r="9" />
                  <ellipse cx="12" cy="12" rx="4" ry="9" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                </svg>
              </button>
            </form>
            <button
              type="button"
              title="Ping Switch"
              onClick={() => {
                const sw = activeWebSwitch || discoveredCatalog[0];
                if (sw) runPing(sw);
              }}
              className="p-1 rounded hover:bg-[#005bb5] cursor-pointer"
              style={{ background: 'transparent', border: 'none' }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2">
                <path d="M3 16 H11 M8 13 L11 16 L8 19" />
                <path d="M21 10 H13 M16 7 L13 10 L16 13" />
              </svg>
            </button>
            <div className="relative">
              <button
                type="button"
                title="Open SSH CLI"
                onClick={() => setQuickPopupOpen((v) => !v)}
                className="p-1 rounded hover:bg-[#005bb5] cursor-pointer"
                style={{ background: 'transparent', border: 'none' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.2">
                  <line x1="4" y1="9" x2="20" y2="9" />
                  <line x1="4" y1="15" x2="15" y2="15" />
                </svg>
              </button>
              {quickPopupOpen && (
                <div className="hv-drop absolute left-0 bottom-full mb-1 py-0.5">
                  <div className="px-3 py-1 text-[11px] font-bold text-[#00468c] border-b border-[#d4d4d4]">
                    Open SSH CLI
                  </div>
                  {discoveredCatalog.map((sw) => (
                    <button key={sw.id} type="button" className="hv-drop-item" onClick={() => { setQuickPopupOpen(false); openSshCli(sw); }}>
                      CLI — {sw.name} ({sw.ip})
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* EXACT 6-ITEM DISCOVERY RIGHT-CLICK CONTEXT MENU (Figure 4!) */}
      {discCtxMenu && (
        <div className="hv-drop fixed py-1" style={{ left: discCtxMenu.x, top: discCtxMenu.y }} onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            className="hv-drop-item"
            onClick={() => {
              const sw = discCtxMenu.sw;
              setDiscCtxMenu(null);
              setAssignModalSw(sw);
              setAssignIp(sw.ip);
              setAssignMask(sw.netmask);
              setAssignGw(sw.gateway);
            }}
          >
            <span>⚙</span>
            <span>Configure</span>
          </button>
          <button
            type="button"
            className="hv-drop-item"
            onClick={() => {
              const sw = discCtxMenu.sw;
              setDiscCtxMenu(null);
              setPwModalSw(sw);
              setPwNew('');
              setPwConfirm('');
            }}
          >
            <span>***</span>
            <span>Change Password</span>
          </button>
          <button
            type="button"
            className="hv-drop-item"
            onClick={() => {
              const sw = discCtxMenu.sw;
              setDiscCtxMenu(null);
              openSwitchWebGui(sw, false);
            }}
          >
            <span>🌐</span>
            <span>GUI</span>
          </button>
          <button
            type="button"
            className="hv-drop-item"
            onClick={() => {
              const sw = discCtxMenu.sw;
              setDiscCtxMenu(null);
              openSwitchWebGui(sw, true);
            }}
          >
            <span>🌐</span>
            <span>GUI/ Add to devices</span>
          </button>
          <button
            type="button"
            className="hv-drop-item"
            onClick={() => {
              const sw = discCtxMenu.sw;
              setDiscCtxMenu(null);
              runPing(sw);
            }}
          >
            <span>⇄</span>
            <span>Ping</span>
          </button>
          <button
            type="button"
            className="hv-drop-item"
            onClick={() => {
              const sw = discCtxMenu.sw;
              setDiscCtxMenu(null);
              openSshCli(sw);
            }}
          >
            <span>≡</span>
            <span>CLI</span>
          </button>
        </div>
      )}

      {/* MODAL 1: CONFIGURE IP */}
      {assignModalSw && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
          <div className="w-full max-w-[380px] bg-[#f0f0f0] border border-[#555555] shadow-xl text-[12px]">
            <div className="h-[26px] bg-[#00468c] text-white px-2.5 flex items-center justify-between">
              <span>Configure — {assignModalSw.name}</span>
              <button type="button" onClick={() => setAssignModalSw(null)} className="text-white cursor-pointer" style={{ background: 'transparent', border: 'none' }}>✕</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label>MAC Address:</label>
                <span className="col-span-2 font-mono font-semibold">{assignModalSw.mac}</span>
                <label>IP Address:</label>
                <input value={assignIp} onChange={(e) => setAssignIp(e.target.value)} className="col-span-2 h-[22px] px-1.5 font-mono" />
                <label>Netmask:</label>
                <input value={assignMask} onChange={(e) => setAssignMask(e.target.value)} className="col-span-2 h-[22px] px-1.5 font-mono" />
                <label>Gateway:</label>
                <input value={assignGw} onChange={(e) => setAssignGw(e.target.value)} className="col-span-2 h-[22px] px-1.5 font-mono" />
              </div>
              <div className="flex justify-end gap-2 pt-1.5">
                <button
                  type="button"
                  className="hv-btn-blue"
                  onClick={() => {
                    setIpOverrides((prev) => ({
                      ...prev,
                      [assignModalSw.id]: { ip: assignIp.trim(), netmask: assignMask.trim(), gateway: assignGw.trim() },
                    }));
                    pushLog('INFO', `Configured ${assignModalSw.name} IP -> ${assignIp.trim()}`);
                    setAssignModalSw(null);
                  }}
                >
                  Apply
                </button>
                <button type="button" className="hv-btn" onClick={() => setAssignModalSw(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CHANGE PASSWORD */}
      {pwModalSw && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
          <div className="w-full max-w-[360px] bg-[#f0f0f0] border border-[#555555] shadow-xl text-[12px]">
            <div className="h-[26px] bg-[#00468c] text-white px-2.5 flex items-center justify-between">
              <span>Change Password — {pwModalSw.name}</span>
              <button type="button" onClick={() => setPwModalSw(null)} className="text-white cursor-pointer" style={{ background: 'transparent', border: 'none' }}>✕</button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label>New Password:</label>
                <input type="password" value={pwNew} onChange={(e) => setPwNew(e.target.value)} className="col-span-2 h-[22px] px-1.5" />
                <label>Confirm:</label>
                <input type="password" value={pwConfirm} onChange={(e) => setPwConfirm(e.target.value)} className="col-span-2 h-[22px] px-1.5" />
              </div>
              <div className="flex justify-end gap-2 pt-1.5">
                <button
                  type="button"
                  className="hv-btn-blue"
                  onClick={() => {
                    if (!pwNew || pwNew !== pwConfirm) {
                      pushLog('WARN', 'Passwords must match and not be empty.');
                      return;
                    }
                    setPwChangedMap((prev) => ({ ...prev, [pwModalSw.id]: true }));
                    pushLog('INFO', `Password updated for ${pwModalSw.name}. Security status cleared.`);
                    setPwModalSw(null);
                  }}
                >
                  Save Password
                </button>
                <button type="button" className="hv-btn" onClick={() => setPwModalSw(null)}>Cancel</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AUTHENTIC BLACK "SSH <IP> - HiView" CLI WINDOW (Figure 7 & Figure 8!) */}
      {cliSwitch && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-3">
          <div className="w-full max-w-[680px] h-[440px] flex flex-col bg-[#000000] border-2 border-[#3b82f6] shadow-2xl overflow-hidden">
            <div className="h-[28px] bg-[#e2e8f0] text-[#000000] px-2.5 flex items-center justify-between shrink-0 text-[12px]">
              <div className="flex items-center gap-1.5 font-medium">
                <HiViewAppIcon />
                <span>{`SSH ${cliSwitch.ip} - HiView`}</span>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" className="hv-btn !py-0 !px-2 !text-[10.5px]" onClick={() => runSshCommand('show sfp')}>
                  show sfp
                </button>
                <button type="button" className="hv-btn !py-0 !px-2 !text-[10.5px]" onClick={() => runSshCommand('show sysinfo')}>
                  show sysinfo
                </button>
                <button
                  type="button"
                  onClick={() => setCliSwitch(null)}
                  className="px-2 py-0.5 hover:bg-[#dc2626] hover:text-white cursor-pointer"
                  style={{ background: 'transparent', border: 'none' }}
                >
                  ✕
                </button>
              </div>
            </div>

            <div
              ref={cliScrollRef}
              onClick={() => cliInputRef.current?.focus()}
              className="flex-1 overflow-auto bg-[#000000] text-[#e5e7eb] p-3 font-mono text-[12px] leading-[1.45] cursor-text"
            >
              {cliLines.map((line, i) => (
                <div key={i} className="whitespace-pre">{line}</div>
              ))}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  runSshCommand(cliInput);
                  setCliInput('');
                }}
                className="flex items-center mt-0.5"
              >
                <span className="text-[#ffffff] mr-1">{`*(${cliSwitch.model.split('-')[0]})>`}</span>
                <input
                  ref={cliInputRef}
                  type="text"
                  value={cliInput}
                  onChange={(e) => setCliInput(e.target.value)}
                  className="hv-cli-input flex-1 text-[12px]"
                  autoFocus
                />
              </form>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: PING RESULT */}
      {pingResult && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[440px] bg-[#f0f0f0] border border-[#555555] shadow-xl text-[12px]">
            <div className="h-[26px] bg-[#00468c] text-white px-2.5 flex items-center justify-between">
              <span>{`Ping ${pingResult.sw.ip} — HiView`}</span>
              <button type="button" onClick={() => setPingResult(null)} className="text-white cursor-pointer" style={{ background: 'transparent', border: 'none' }}>✕</button>
            </div>
            <div className="p-3 bg-[#000000] text-[#4ade80] font-mono text-[11.5px] leading-[1.45]">
              {pingResult.lines.map((l, idx) => (
                <div key={idx}>{l}</div>
              ))}
            </div>
            <div className="p-2 flex justify-end">
              <button type="button" className="hv-btn-blue" onClick={() => setPingResult(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HiViewTool;
