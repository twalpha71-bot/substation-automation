import React, { useEffect, useMemo, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { iedImages, getIedImageByModel } from '../data/iedImageRegistry';
import { MultiVendorIed } from '../types/substation';
import {
  Activity,
  GitBranch,
  Maximize2,
  Minimize2,
  RefreshCw,
  RotateCcw,
  Server,
  Shield,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

type LabViewTab =
  | 'RACK_VIEW'
  | 'TOPOLOGY'
  | 'PRP_DUAL'
  | 'HSR_RING'
  | 'PRP_HSR_COUPLING'
  | 'HSR_QUADBOX'
  | 'RSTP_RING'
  | 'VLAN_PORTS'
  | 'LIVE_TRAFFIC'
  | 'FAULT_INJECTION';

type DeviceInspectorTab =
  | 'Overview'
  | 'Hardware & Ports'
  | 'IEC 61850 Model'
  | 'DataSets'
  | 'RCBs'
  | 'GOOSE Publisher'
  | 'GOOSE Subscriber'
  | 'MMS'
  | 'Network Settings'
  | 'Diagnostics'
  | 'SCL Files';

interface SwitchPortConfig {
  portNumber: number;
  portId: string;
  switchId: 'SW-LAN-A1' | 'SW-LAN-B1';
  switchName: string;
  groupLabel: 'IED Ports (1–3)' | 'Access Ports (4–5)' | 'Trunk Ports (6–7)' | 'HSR/PRP Ring (8)';
  connectedDeviceId: string;
  connectedDeviceName: string;
  remotePort: string;
  mediaType: '100BASE-FX Multimode LC' | '1000BASE-LX Singlemode LC' | '1000BASE-T RJ45';
  speedLabel: '100 Mbps FDX' | '1 Gbps FDX';
  portMode: 'ACCESS' | 'TRUNK' | 'HYBRID' | 'PRP_HSR_RING';
  nativeVlan: number;
  allowedVlans: number[];
  rstpRole: 'Edge / PortFast' | 'Designated Forwarding' | 'Root Port' | 'Alternate Blocking';
  protocolLabel: string;
  baseTxPps: number;
  baseRxPps: number;
}

interface PortFaultOverride {
  disabled: boolean;
  disconnected: boolean;
  vlanMismatch: boolean;
  customVlan?: number;
  packetLossPercent: number;
  gooseTimeoutSim: boolean;
}

const RSP35_PORTS_LAN_A: SwitchPortConfig[] = [
  {
    portNumber: 1,
    portId: 'Gi1/1',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'IED Ports (1–3)',
    connectedDeviceId: 'SRV-SCADA-A',
    connectedDeviceName: 'SCADA Server A (Dell PowerEdge R750)',
    remotePort: 'ETH-A (Port 1)',
    mediaType: '1000BASE-LX Singlemode LC',
    speedLabel: '1 Gbps FDX',
    portMode: 'TRUNK',
    nativeVlan: 10,
    allowedVlans: [10, 20, 30, 40],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'MMS Client / SOE',
    baseTxPps: 480,
    baseRxPps: 390,
  },
  {
    portNumber: 2,
    portId: 'Gi1/2',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'IED Ports (1–3)',
    connectedDeviceId: 'WS-HMI-01',
    connectedDeviceName: 'Operator HMI WS (Dell OptiPlex 7000)',
    remotePort: 'ETH-A (Port 1)',
    mediaType: '1000BASE-T RJ45',
    speedLabel: '1 Gbps FDX',
    portMode: 'ACCESS',
    nativeVlan: 10,
    allowedVlans: [10, 30, 40],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'MMS / HMI Client',
    baseTxPps: 310,
    baseRxPps: 215,
  },
  {
    portNumber: 3,
    portId: 'Gi1/3',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'IED Ports (1–3)',
    connectedDeviceId: 'GTW-RCC-01',
    connectedDeviceName: 'Station Gateway (Moxa MGate 5216)',
    remotePort: 'ETH-A (Port 1)',
    mediaType: '1000BASE-T RJ45',
    speedLabel: '1 Gbps FDX',
    portMode: 'TRUNK',
    nativeVlan: 10,
    allowedVlans: [10, 20, 30, 40],
    rstpRole: 'Designated Forwarding',
    protocolLabel: 'IEC 61850 ↔ IEC 104',
    baseTxPps: 265,
    baseRxPps: 240,
  },
  {
    portNumber: 4,
    portId: 'Gi1/4',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'Access Ports (4–5)',
    connectedDeviceId: 'CLK-PTP-GM',
    connectedDeviceName: 'Time Server PTP (Meinberg LANTIME M400)',
    remotePort: 'ETH-A (PTP-1)',
    mediaType: '1000BASE-LX Singlemode LC',
    speedLabel: '1 Gbps FDX',
    portMode: 'PRP_HSR_RING',
    nativeVlan: 40,
    allowedVlans: [10, 20, 30, 40],
    rstpRole: 'Designated Forwarding',
    protocolLabel: 'IEEE 1588v2 PTP GM',
    baseTxPps: 95,
    baseRxPps: 95,
  },
  {
    portNumber: 5,
    portId: 'Gi1/5',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'Access Ports (4–5)',
    connectedDeviceId: 'IED-33-F03',
    connectedDeviceName: 'Siemens SIPROTEC 5 (7SJ85)',
    remotePort: 'ETH-A (ChA LC)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 133],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 142,
    baseRxPps: 118,
  },
  {
    portNumber: 6,
    portId: 'Gi1/6',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'Trunk Ports (6–7)',
    connectedDeviceId: 'IED-11-F01',
    connectedDeviceName: 'ABB Relion (REF615)',
    remotePort: 'ETH-A (X1-A LC)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 111],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 128,
    baseRxPps: 96,
  },
  {
    portNumber: 7,
    portId: 'Gi1/7',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'Trunk Ports (6–7)',
    connectedDeviceId: 'IED-132-BC',
    connectedDeviceName: 'Schneider MiCOM C264',
    remotePort: 'ETH-A (Port A)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 101],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 115,
    baseRxPps: 104,
  },
  {
    portNumber: 8,
    portId: 'Gi1/8',
    switchId: 'SW-LAN-A1',
    switchName: 'Hirschmann RSP35 (LAN A)',
    groupLabel: 'HSR/PRP Ring (8)',
    connectedDeviceId: 'IED-33-F02',
    connectedDeviceName: 'GE Multilin 850',
    remotePort: 'ETH-A (Port A)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 133],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 132,
    baseRxPps: 109,
  },
];

const RSP35_PORTS_LAN_B: SwitchPortConfig[] = [
  {
    portNumber: 1,
    portId: 'Gi2/1',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'IED Ports (1–3)',
    connectedDeviceId: 'SRV-SCADA-A',
    connectedDeviceName: 'SCADA Server A (Dell PowerEdge R750)',
    remotePort: 'ETH-B (Port 2)',
    mediaType: '1000BASE-LX Singlemode LC',
    speedLabel: '1 Gbps FDX',
    portMode: 'TRUNK',
    nativeVlan: 10,
    allowedVlans: [10, 20, 30, 40],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'MMS Client / SOE',
    baseTxPps: 480,
    baseRxPps: 390,
  },
  {
    portNumber: 2,
    portId: 'Gi2/2',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'IED Ports (1–3)',
    connectedDeviceId: 'WS-HMI-01',
    connectedDeviceName: 'Operator HMI WS (Dell OptiPlex 7000)',
    remotePort: 'ETH-B (Port 2)',
    mediaType: '1000BASE-T RJ45',
    speedLabel: '1 Gbps FDX',
    portMode: 'ACCESS',
    nativeVlan: 10,
    allowedVlans: [10, 30, 40],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'MMS / HMI Client',
    baseTxPps: 308,
    baseRxPps: 212,
  },
  {
    portNumber: 3,
    portId: 'Gi2/3',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'IED Ports (1–3)',
    connectedDeviceId: 'GTW-RCC-01',
    connectedDeviceName: 'Station Gateway (Moxa MGate 5216)',
    remotePort: 'ETH-B (Port 2)',
    mediaType: '1000BASE-T RJ45',
    speedLabel: '1 Gbps FDX',
    portMode: 'TRUNK',
    nativeVlan: 10,
    allowedVlans: [10, 20, 30, 40],
    rstpRole: 'Designated Forwarding',
    protocolLabel: 'IEC 61850 ↔ IEC 104',
    baseTxPps: 265,
    baseRxPps: 240,
  },
  {
    portNumber: 4,
    portId: 'Gi2/4',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'Access Ports (4–5)',
    connectedDeviceId: 'CLK-PTP-GM',
    connectedDeviceName: 'Time Server PTP (Meinberg LANTIME M400)',
    remotePort: 'ETH-B (PTP-2)',
    mediaType: '1000BASE-LX Singlemode LC',
    speedLabel: '1 Gbps FDX',
    portMode: 'PRP_HSR_RING',
    nativeVlan: 40,
    allowedVlans: [10, 20, 30, 40],
    rstpRole: 'Designated Forwarding',
    protocolLabel: 'IEEE 1588v2 PTP GM',
    baseTxPps: 95,
    baseRxPps: 95,
  },
  {
    portNumber: 5,
    portId: 'Gi2/5',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'Access Ports (4–5)',
    connectedDeviceId: 'IED-33-F03',
    connectedDeviceName: 'Siemens SIPROTEC 5 (7SJ85)',
    remotePort: 'ETH-B (ChB LC)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 133],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 142,
    baseRxPps: 118,
  },
  {
    portNumber: 6,
    portId: 'Gi2/6',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'Trunk Ports (6–7)',
    connectedDeviceId: 'IED-11-F01',
    connectedDeviceName: 'ABB Relion (REF615)',
    remotePort: 'ETH-B (X1-B LC)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 111],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 128,
    baseRxPps: 96,
  },
  {
    portNumber: 7,
    portId: 'Gi2/7',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'Trunk Ports (6–7)',
    connectedDeviceId: 'IED-132-BC',
    connectedDeviceName: 'Schneider MiCOM C264',
    remotePort: 'ETH-B (Port B)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 101],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 115,
    baseRxPps: 104,
  },
  {
    portNumber: 8,
    portId: 'Gi2/8',
    switchId: 'SW-LAN-B1',
    switchName: 'Hirschmann RSP35 (LAN B)',
    groupLabel: 'HSR/PRP Ring (8)',
    connectedDeviceId: 'IED-33-F02',
    connectedDeviceName: 'GE Multilin 850',
    remotePort: 'ETH-B (Port B)',
    mediaType: '100BASE-FX Multimode LC',
    speedLabel: '100 Mbps FDX',
    portMode: 'HYBRID',
    nativeVlan: 20,
    allowedVlans: [10, 20, 40, 133],
    rstpRole: 'Edge / PortFast',
    protocolLabel: 'GOOSE / MMS / PTP',
    baseTxPps: 132,
    baseRxPps: 109,
  },
];

const VLAN_DEFINITIONS = [
  {
    vlanId: 10,
    name: 'VLAN 10: SCADA / MMS',
    shortLabel: 'VLAN 10 — SCADA/MMS',
    color: '#00CFFF',
    priority: '802.1p PRI 2 (Medium)',
    protocol: 'IEC 61850-8-1 MMS (TCP Port 102)',
    subnet: '192.168.10.0/24 (10.132.10.0/24)',
    taggedPorts: ['Gi1/4', 'Gi1/6', 'Gi1/7', 'Gi2/4', 'Gi2/6', 'Gi2/7'],
    untaggedPorts: ['Gi1/5', 'Gi2/5'],
    description: 'Client/Server BRCB & URCB report delivery, dataset polling, and Select-Before-Operate (SBO) breaker control.',
  },
  {
    vlanId: 20,
    name: 'VLAN 20: GOOSE (Protection)',
    shortLabel: 'VLAN 20 — Protection GOOSE',
    color: '#22C55E',
    priority: '802.1p PRI 4 (High Critical < 3 ms)',
    protocol: 'IEC 61850-8-1 GOOSE (Ethertype 0x88B8)',
    subnet: 'Layer-2 Multicast (01-0C-CD-01-00-01..33)',
    taggedPorts: ['Gi1/1', 'Gi1/2', 'Gi1/3', 'Gi1/6', 'Gi1/7', 'Gi2/1', 'Gi2/2', 'Gi2/3', 'Gi2/7'],
    untaggedPorts: [],
    description: 'High-priority Layer-2 multicast protection tripping, breaker failure (50BF) intertrip, and bay interlocking (CILO).',
  },
  {
    vlanId: 30,
    name: 'VLAN 30: Engineering',
    shortLabel: 'VLAN 30 — Engineering & SCL',
    color: '#A855F7',
    priority: '802.1p PRI 1 (Best Effort)',
    protocol: 'HTTPS / SFTP / MMS Engineering / IEDScout',
    subnet: '192.168.30.0/24',
    taggedPorts: ['Gi1/4', 'Gi1/6', 'Gi1/7', 'Gi2/4', 'Gi2/7'],
    untaggedPorts: ['Gi1/5'],
    description: 'Isolated engineering access for DIGSI 5, PCM600, MiCOM S1 Agile, EnerVista, CID/SCD uploads, and COMTRADE fault records.',
  },
  {
    vlanId: 40,
    name: 'VLAN 40: Time Sync (SNTP/PTP)',
    shortLabel: 'VLAN 40 — Time Sync (PTP/SNTP)',
    color: '#FFB547',
    priority: '802.1p PRI 6 (Network Control / Clock)',
    protocol: 'IEEE 1588v2 PTP (0x88F7) / SNTP (UDP 123)',
    subnet: 'L2 Multicast 01-1B-19-00-00-00 / 192.168.10.100',
    taggedPorts: ['Gi1/1', 'Gi1/2', 'Gi1/3', 'Gi1/4', 'Gi1/7', 'Gi1/8', 'Gi2/1', 'Gi2/2', 'Gi2/3', 'Gi2/8'],
    untaggedPorts: ['Gi1/8', 'Gi2/8'],
    description: 'Sub-microsecond IEEE C37.238 / IEC 61850-9-3 Power Profile synchronization from Meinberg Grandmaster Clock.',
  },
];

const TOPO_EXACT_IMAGES: Record<string, string> = {
  ABB_REDBOX: iedImages.INDUSTRIAL_SWITCH,
  DELL_R750: iedImages.SCADA_SERVER,
  HMI_DUAL: iedImages.SCADA_WORKSTATION,
  MOXA_MGATE: iedImages.STATION_GATEWAY,
  MEINBERG_M400: iedImages.PTP_CLOCK,
  HIRSCHMANN_RSP35: iedImages.INDUSTRIAL_SWITCH,
  SIEMENS_7SJ85: iedImages.SIEMENS_7SJ85,
  SIEMENS_7UT86: iedImages.SIEMENS_7UT86,
  ABB_REF615: iedImages.ABB_REF615,
  ABB_RET615: iedImages.ABB_RET615,
  SCHNEIDER_C264: iedImages.SCHNEIDER_C264,
  GE_850: iedImages.GE_850,
};

const getHardwarePhoto = (key: string): string => {
  switch (key) {
    case 'SIEMENS_7SJ85':
      return iedImages.SIEMENS_7SJ85;
    case 'ABB_REF615':
      return iedImages.ABB_REF615;
    case 'SCHNEIDER_C264':
      return iedImages.SCHNEIDER_C264;
    case 'GE_MULTILIN_850':
      return iedImages.GE_850;
    case 'DIN_SWITCH':
      return iedImages.INDUSTRIAL_SWITCH;
    case 'SCADA_SERVER':
      return iedImages.SCADA_SERVER;
    case 'HMI_WS':
      return iedImages.SCADA_WORKSTATION;
    case 'STATION_GATEWAY':
      return iedImages.STATION_GATEWAY;
    case 'PTP_CLOCK':
      return iedImages.PTP_CLOCK;
    case 'HIRSCHMANN_RED25':
      return iedImages.HIRSCHMANN_RED25;
    case 'LEGACY_SAN_IED':
      return iedImages.LEGACY_SAN_IED;
    case 'HIRSCHMANN_QUADBOX':
      return iedImages.HIRSCHMANN_QUADBOX;
    default:
      return iedImages.SIEMENS_7SJ85;
  }
};

const CablePacket: React.FC<{
  path: string;
  color: string;
  active: boolean;
  duration: number;
  delay?: number;
  radius?: number;
}> = ({ path, color, active, duration, delay = 0, radius = 3.6 }) => {
  if (!active) return null;
  return (
    <g pointerEvents="none">
      <circle r={radius + 2.2} fill={color} opacity="0.28">
        <animateMotion path={path} dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
      <circle r={radius} fill={color} stroke="#ffffff" strokeWidth="0.9">
        <animateMotion path={path} dur={`${duration}s`} begin={`${delay}s`} repeatCount="indefinite" />
      </circle>
    </g>
  );
};

const PatchCordPath: React.FC<{
  id: string;
  d: string;
  plane: 'LAN_A' | 'LAN_B' | 'CROSS_A' | 'CROSS_B';
  status: 'UP' | 'DOWN' | 'DISCONNECTED';
  selected: boolean;
  highlighted: boolean;
  packetActive: boolean;
  packetColor: string;
  duration: number;
  delay?: number;
  dashed?: boolean;
  onClick?: () => void;
}> = ({
  d,
  plane,
  status,
  selected,
  highlighted,
  packetActive,
  packetColor,
  duration,
  delay = 0,
  dashed = false,
  onClick,
}) => {
  const baseColor =
    status === 'DISCONNECTED'
      ? '#64748B'
      : status === 'DOWN'
      ? '#FF5C65'
      : selected
      ? '#00F0FF'
      : plane === 'LAN_A' || plane === 'CROSS_A'
      ? '#168BFF'
      : '#EAB308';

  const coreHighlight =
    status === 'DISCONNECTED'
      ? '#94A3B8'
      : status === 'DOWN'
      ? '#FDA4AF'
      : selected || highlighted
      ? '#A5F3FC'
      : plane === 'LAN_A' || plane === 'CROSS_A'
      ? '#60C5FF'
      : '#FDE047';

  return (
    <g className={onClick ? 'cursor-pointer' : undefined} onClick={onClick}>
      <path
        d={d}
        fill="none"
        stroke="#02060D"
        strokeWidth={selected || highlighted ? 8.5 : 7}
        strokeLinecap="round"
        opacity={dashed ? 0.45 : 0.85}
      />
      {(selected || highlighted || status === 'DOWN') && (
        <path
          d={d}
          fill="none"
          stroke={status === 'DOWN' ? '#FF5C65' : '#00CFFF'}
          strokeWidth={11}
          strokeLinecap="round"
          opacity={0.28}
        />
      )}
      <path
        d={d}
        fill="none"
        stroke={baseColor}
        strokeWidth={selected || highlighted ? 5.6 : 4.6}
        strokeLinecap="round"
        strokeDasharray={status === 'DISCONNECTED' || dashed ? '6 5' : undefined}
      />
      <path
        d={d}
        fill="none"
        stroke={coreHighlight}
        strokeWidth={1.4}
        strokeLinecap="round"
        opacity={status === 'DISCONNECTED' ? 0.35 : 0.85}
        strokeDasharray={status === 'DISCONNECTED' || dashed ? '6 5' : undefined}
      />
      {onClick && <path d={d} fill="none" stroke="transparent" strokeWidth={16} />}
      <CablePacket
        path={d}
        color={packetColor}
        active={packetActive && status === 'UP'}
        duration={duration}
        delay={delay}
      />
    </g>
  );
};

export const NetworkTopologyPage: React.FC = () => {
  const {
    networkRedundancyMode,
    setNetworkRedundancyMode,
    infrastructure,
    ieds,
    gooseControlBlocks,
    faultScenarios,
    toggleFaultScenario,
    triggerGooseStateChangeBurst,
    toggleRcbEnabled,
    triggerMmsGeneralInterrogation,
  } = useSubstationStore();

  const VALID_LAB_VIEWS: LabViewTab[] = [
    'RACK_VIEW',
    'TOPOLOGY',
    'PRP_DUAL',
    'HSR_RING',
    'PRP_HSR_COUPLING',
    'HSR_QUADBOX',
    'RSTP_RING',
    'VLAN_PORTS',
    'LIVE_TRAFFIC',
    'FAULT_INJECTION',
  ];
  const NETWORK_VIEW_STORAGE_KEY = 'sas_network_topology_active_view';

  const [activeView, setActiveView] = useState<LabViewTab>(() => {
    try {
      window.localStorage.removeItem(NETWORK_VIEW_STORAGE_KEY);
      const saved = window.sessionStorage.getItem(NETWORK_VIEW_STORAGE_KEY) as LabViewTab | null;
      if (saved && VALID_LAB_VIEWS.includes(saved)) {
        return saved;
      }
    } catch {
      // Ignore storage access errors in restricted environments
    }
    return 'RACK_VIEW';
  });

  useEffect(() => {
    try {
      window.sessionStorage.setItem(NETWORK_VIEW_STORAGE_KEY, activeView);
    } catch {
      // Ignore storage write errors
    }
  }, [activeView]);

  useEffect(() => {
    return () => {
      try {
        // Clear saved sub-tab when navigating away from NETWORK (e.g., to Home),
        // while keeping it intact during a browser refresh on #/workspace/NETWORK.
        const currentHash = (window.location.hash || '').toUpperCase();
        if (!currentHash.includes('/NETWORK')) {
          window.sessionStorage.removeItem(NETWORK_VIEW_STORAGE_KEY);
        }
      } catch {
        // Ignore storage errors
      }
    };
  }, []);
  const [packetsPlaying, setPacketsPlaying] = useState<boolean>(true);
  const [packetSpeed] = useState<'SLOW' | 'NORMAL' | 'FAST'>('NORMAL');
  const [trafficFilter, setTrafficFilter] = useState<'ALL' | 'GOOSE' | 'MMS' | 'PTP'>('ALL');
  const [selectedVlan, setSelectedVlan] = useState<number | null>(null);
  const [rackZoom, setRackZoom] = useState<number>(1);
  const [showCrossRackPrp, setShowCrossRackPrp] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const [selectedSwitchPlane, setSelectedSwitchPlane] = useState<'LAN_A' | 'LAN_B'>('LAN_A');
  const [selectedPortNumber, setSelectedPortNumber] = useState<number>(1);
  const [portOverrides, setPortOverrides] = useState<Record<string, PortFaultOverride>>({});

  const [selectedDeviceKey, setSelectedDeviceKey] = useState<string>('IED-33-F03');
  const [inspectorModalOpen, setInspectorModalOpen] = useState<boolean>(false);
  const [deviceInspectorTab, setDeviceInspectorTab] = useState<DeviceInspectorTab>('Overview');

  const [hsrBreakSegment, setHsrBreakSegment] = useState<number | null>(null);
  const [hsrSelectedSegment, setHsrSelectedSegment] = useState<number>(0);
  const [hsrCutSegments, setHsrCutSegments] = useState<number[]>([]);
  const [hsrPendingSegments, setHsrPendingSegments] = useState<number[]>([2]);
  const [hsrDropdownOpen, setHsrDropdownOpen] = useState<boolean>(false);
  const [prpRed25PortAFault, setPrpRed25PortAFault] = useState<boolean>(false);
  const [prpRed25PortBFault, setPrpRed25PortBFault] = useState<boolean>(false);
  const [prpInterlinkFault, setPrpInterlinkFault] = useState<boolean>(false);
  const [hsrInterlinkFault, setHsrInterlinkFault] = useState<boolean>(false);
  const [hsrBottomInterlinkFault, setHsrBottomInterlinkFault] = useState<boolean>(false);
  const [couplingLanAFault, setCouplingLanAFault] = useState<boolean>(false);
  const [couplingLanBFault, setCouplingLanBFault] = useState<boolean>(false);
  const [couplingRedboxAFault, setCouplingRedboxAFault] = useState<boolean>(false);
  const [couplingRedboxBFault, setCouplingRedboxBFault] = useState<boolean>(false);
  const [couplingHsrCuts, setCouplingHsrCuts] = useState<number[]>([]);
  const [qb1Fault, setQb1Fault] = useState<boolean>(false);
  const [qb2Fault, setQb2Fault] = useState<boolean>(false);
  const [qbRing1Cuts, setQbRing1Cuts] = useState<number[]>([]);
  const [qbRing2Cuts, setQbRing2Cuts] = useState<number[]>([]);
  const [rstpLinkCuts, setRstpLinkCuts] = useState<number[]>([]);
  const [rstpSw1Fault, setRstpSw1Fault] = useState<boolean>(false);
  const [rstpEventLog, setRstpEventLog] = useState<
    Array<{ id: string; time: string; severity: 'INFO' | 'WARNING' | 'CRITICAL'; msg: string }>
  >([
    {
      id: 'RSTP-INIT',
      time: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      severity: 'INFO',
      msg: 'SW-1 elected Root Bridge (Pri 4096). SW-3 P8 set to Alternate/Blocking to prevent L2 loop.',
    },
  ]);
  const [hsrEventLog, setHsrEventLog] = useState<
    Array<{
      id: string;
      timestamp: string;
      segmentLabel: string;
      affectedDevices: string;
      severity: 'INFO' | 'WARNING' | 'CRITICAL';
      eventType: string;
      statusText: string;
    }>
  >([
    {
      id: 'HSR-EVT-INIT',
      timestamp: new Date().toLocaleTimeString('en-GB', { hour12: false }),
      segmentLabel: 'Segments #1–#6',
      affectedDevices: 'All 6 Ring IEDs + ABB AFS677 RedBox',
      severity: 'INFO',
      eventType: 'HSR Ring Initialized (0x892F)',
      statusText: 'RING HEALTHY — CW & CCW Redundant Paths Active',
    },
  ]);

  const HSR_NODES = [
    {
      index: 0,
      id: 'IED-33-F03',
      name: 'SIPROTEC 5 7SJ85',
      shortName: '7SJ85',
      vendor: 'Siemens',
      model: 'SIPROTEC 5 7SJ85',
      ip: '192.168.10.11',
      img: TOPO_EXACT_IMAGES.SIEMENS_7SJ85,
      hsrInterfaceNote: 'Port A ⇄ HSR ⇄ Port B',
      nativeHsr: true,
      cx: 230,
      cy: 350,
      labelSide: 'left' as const,
      portA: { x: 230, y: 396 },
      portB: { x: 267, y: 336 },
    },
    {
      index: 1,
      id: 'IED-11-F01',
      name: 'ABB Relion REF615',
      shortName: 'REF615',
      vendor: 'ABB',
      model: 'Relion REF615',
      ip: '192.168.10.12',
      img: TOPO_EXACT_IMAGES.ABB_REF615,
      hsrInterfaceNote: 'Port A ⇄ HSR ⇄ Port B',
      nativeHsr: true,
      cx: 930,
      cy: 350,
      labelSide: 'right' as const,
      portA: { x: 893, y: 336 },
      portB: { x: 930, y: 396 },
    },
    {
      index: 2,
      id: 'IED-132-BC',
      name: 'Schneider MiCOM C264',
      shortName: 'MiCOM C264',
      vendor: 'Schneider',
      model: 'MiCOM C264 (Ext. HSR Box)',
      ip: '192.168.10.13',
      img: TOPO_EXACT_IMAGES.SCHNEIDER_C264,
      hsrInterfaceNote: 'Port A ⇄ HSR ⇄ Port B',
      nativeHsr: false,
      cx: 930,
      cy: 492,
      labelSide: 'right' as const,
      portA: { x: 930, y: 450 },
      portB: { x: 890, y: 512 },
    },
    {
      index: 3,
      id: 'IED-33-F02',
      name: 'GE Multilin 850',
      shortName: 'Multilin 850',
      vendor: 'GE',
      model: 'Multilin 850',
      ip: '192.168.10.14',
      img: TOPO_EXACT_IMAGES.GE_850,
      hsrInterfaceNote: 'Port A ⇄ HSR ⇄ Port B',
      nativeHsr: true,
      cx: 775,
      cy: 564,
      labelSide: 'bottom' as const,
      portA: { x: 812, y: 558 },
      portB: { x: 738, y: 566 },
    },
    {
      index: 4,
      id: 'IED-132-T1',
      name: 'SIPROTEC 5 7UT86',
      shortName: '7UT86',
      vendor: 'Siemens',
      model: 'SIPROTEC 5 7UT86',
      ip: '192.168.10.15',
      img: TOPO_EXACT_IMAGES.SIEMENS_7UT86,
      hsrInterfaceNote: 'Port A ⇄ HSR ⇄ Port B',
      nativeHsr: true,
      cx: 385,
      cy: 564,
      labelSide: 'bottom' as const,
      portA: { x: 422, y: 566 },
      portB: { x: 348, y: 558 },
    },
    {
      index: 5,
      id: 'IED-132-T2',
      name: 'ABB Relion RET615',
      shortName: 'RET615',
      vendor: 'ABB',
      model: 'Relion RET615',
      ip: '192.168.10.16',
      img: TOPO_EXACT_IMAGES.ABB_RET615,
      hsrInterfaceNote: 'Port A ⇄ HSR ⇄ Port B',
      nativeHsr: true,
      cx: 230,
      cy: 492,
      labelSide: 'left' as const,
      portA: { x: 267, y: 512 },
      portB: { x: 230, y: 446 },
    },
  ];

  // IEC 62439-3 Clause 5: Dual-RedBox HSR Ring (Node 6 = Top RED25 #1 for Station SAN Switch, Node 7 = Bottom RED25 #2 for Legacy SAN IED)
  const HSR_SEGMENTS = [
    {
      index: 0,
      segNum: 1,
      id: 'HSR-SEG-1',
      fromIdx: 6,
      toIdx: 1,
      label: 'Segment #1 – RED25 #1 (B) ↔ REF615',
      shortDropdownLabel: 'Seg #1 – RED25 #1 ↔ REF615',
      endpointsText: 'Hirschmann RED25 #1 (HSR Port B) ↔ ABB Relion REF615 (Port A)',
      path: 'M 585 279 C 690 279, 775 336, 893 336',
      revPath: 'M 893 336 C 775 336, 690 279, 585 279',
      midX: 754,
      midY: 308,
      badgeX: 754,
      badgeY: 280,
    },
    {
      index: 1,
      segNum: 2,
      id: 'HSR-SEG-2',
      fromIdx: 1,
      toIdx: 2,
      label: 'Segment #2 – REF615 ↔ MiCOM C264',
      shortDropdownLabel: 'Seg #2 – REF615 ↔ MiCOM C264',
      endpointsText: 'ABB Relion REF615 (Port B) ↔ Schneider MiCOM C264 (Port A)',
      path: 'M 930 396 L 930 450',
      revPath: 'M 930 450 L 930 396',
      midX: 930,
      midY: 423,
      badgeX: 992,
      badgeY: 423,
    },
    {
      index: 2,
      segNum: 3,
      id: 'HSR-SEG-3',
      fromIdx: 2,
      toIdx: 3,
      label: 'Segment #3 – MiCOM C264 ↔ Multilin 850',
      shortDropdownLabel: 'Seg #3 – C264 ↔ Multilin 850',
      endpointsText: 'Schneider MiCOM C264 (Port B) ↔ GE Multilin 850 (Port A)',
      path: 'M 890 512 C 864 544, 842 558, 812 558',
      revPath: 'M 812 558 C 842 558, 864 544, 890 512',
      midX: 858,
      midY: 540,
      badgeX: 874,
      badgeY: 566,
    },
    {
      index: 3,
      segNum: 4,
      id: 'HSR-SEG-4',
      fromIdx: 3,
      toIdx: 7,
      label: 'Segment #4 – Multilin 850 ↔ RED25 #2 (B)',
      shortDropdownLabel: 'Seg #4 – Multilin 850 ↔ RED25 #2',
      endpointsText: 'GE Multilin 850 (Port B) ↔ Hirschmann RED25 #2 (HSR Port B)',
      path: 'M 738 566 C 685 566, 650 587, 585 587',
      revPath: 'M 585 587 C 650 587, 685 566, 738 566',
      midX: 672,
      midY: 578,
      badgeX: 676,
      badgeY: 550,
    },
    {
      index: 4,
      segNum: 5,
      id: 'HSR-SEG-5',
      fromIdx: 7,
      toIdx: 4,
      label: 'Segment #5 – RED25 #2 (A) ↔ 7UT86',
      shortDropdownLabel: 'Seg #5 – RED25 #2 ↔ 7UT86',
      endpointsText: 'Hirschmann RED25 #2 (HSR Port A) ↔ SIPROTEC 5 7UT86 (Port A)',
      path: 'M 584 570 C 520 570, 480 566, 422 566',
      revPath: 'M 422 566 C 480 566, 520 570, 584 570',
      midX: 486,
      midY: 568,
      badgeX: 482,
      badgeY: 594,
    },
    {
      index: 5,
      segNum: 6,
      id: 'HSR-SEG-6',
      fromIdx: 4,
      toIdx: 5,
      label: 'Segment #6 – 7UT86 ↔ RET615',
      shortDropdownLabel: 'Seg #6 – 7UT86 ↔ RET615',
      endpointsText: 'SIPROTEC 5 7UT86 (Port B) ↔ ABB Relion RET615 (Port A)',
      path: 'M 348 558 C 316 558, 294 544, 267 512',
      revPath: 'M 267 512 C 294 544, 316 558, 348 558',
      midX: 300,
      midY: 540,
      badgeX: 282,
      badgeY: 566,
    },
    {
      index: 6,
      segNum: 7,
      id: 'HSR-SEG-7',
      fromIdx: 5,
      toIdx: 0,
      label: 'Segment #7 – RET615 ↔ 7SJ85',
      shortDropdownLabel: 'Seg #7 – RET615 ↔ 7SJ85',
      endpointsText: 'ABB Relion RET615 (Port B) ↔ SIPROTEC 5 7SJ85 (Port A)',
      path: 'M 230 446 L 230 396',
      revPath: 'M 230 396 L 230 446',
      midX: 230,
      midY: 421,
      badgeX: 168,
      badgeY: 421,
    },
    {
      index: 7,
      segNum: 8,
      id: 'HSR-SEG-8',
      fromIdx: 0,
      toIdx: 6,
      label: 'Segment #8 – 7SJ85 ↔ RED25 #1 (A)',
      shortDropdownLabel: 'Seg #8 – 7SJ85 ↔ RED25 #1',
      endpointsText: 'SIPROTEC 5 7SJ85 (Port B) ↔ Hirschmann RED25 #1 (HSR Port A)',
      path: 'M 267 336 C 385 336, 470 262, 584 262',
      revPath: 'M 584 262 C 470 262, 385 336, 267 336',
      midX: 406,
      midY: 299,
      badgeX: 406,
      badgeY: 272,
    },
  ];

  // Authoritative Graph-Based BFS Connectivity & Reachability Simulation (6 IEDs + Node 6 = Top RED25 #1 + Node 7 = Bottom RED25 #2)
  const hsrSimulation = (() => {
    const numNodes = 8;
    const adj: number[][] = Array.from({ length: numNodes }, () => []);
    HSR_SEGMENTS.forEach((seg) => {
      if (!hsrCutSegments.includes(seg.index)) {
        adj[seg.fromIdx].push(seg.toIdx);
        adj[seg.toIdx].push(seg.fromIdx);
      }
    });

    const redboxAnchorNode = 6;
    const visited = new Array<boolean>(numNodes).fill(false);
    const componentOf = new Array<number>(numNodes).fill(-1);
    const components: number[][] = [];

    for (let start = 0; start < numNodes; start++) {
      if (!visited[start]) {
        const compIdx = components.length;
        const comp: number[] = [];
        const queue: number[] = [start];
        visited[start] = true;
        while (queue.length > 0) {
          const curr = queue.shift()!;
          componentOf[curr] = compIdx;
          comp.push(curr);
          for (const nxt of adj[curr]) {
            if (!visited[nxt]) {
              visited[nxt] = true;
              queue.push(nxt);
            }
          }
        }
        components.push(comp);
      }
    }

    const redboxComp = componentOf[redboxAnchorNode];
    const reachableNodeIndices = HSR_NODES.filter((n) => componentOf[n.index] === redboxComp).map((n) => n.index);
    const isolatedNodeIndices = HSR_NODES.filter((n) => componentOf[n.index] !== redboxComp).map((n) => n.index);
    const bottomRedboxReachable = componentOf[7] === redboxComp;
    const legacySanReachable = bottomRedboxReachable && !hsrInterlinkFault && !hsrBottomInterlinkFault;

    const cutCount = hsrCutSegments.length;
    const ringState: 'CLOSED' | 'OPEN' | 'PARTITIONED' =
      cutCount === 0 ? 'CLOSED' : cutCount === 1 ? 'OPEN' : 'PARTITIONED';

    const statusHeadline =
      ringState === 'CLOSED'
        ? '● RING HEALTHY — BOTH CW (GREEN) & CCW (CYAN) PATHS ACTIVE VIA RED25 #1 & #2'
        : ringState === 'OPEN'
        ? `▲ RING OPEN — SINGLE FIBER CUT (SEG #${hsrCutSegments[0] + 1}) • ALTERNATE PATH ACTIVE (0 ms)`
        : `✖ MULTIPLE FIBER FAILURES — NETWORK PARTITIONED (${cutCount} CUTS • ${isolatedNodeIndices.length} IEDs ISOLATED)`;

    return {
      adj,
      componentOf,
      components,
      redboxComp,
      reachableNodeIndices,
      isolatedNodeIndices,
      bottomRedboxReachable,
      legacySanReachable,
      cutCount,
      ringState,
      statusHeadline,
    };
  })();

  const applyHsrFiberCuts = (nextCutsInput: number[]) => {
    const nextCuts = Array.from(new Set(nextCutsInput)).sort((a, b) => a - b);
    const prevCuts = hsrCutSegments;
    const added = nextCuts.filter((c) => !prevCuts.includes(c));
    const removed = prevCuts.filter((c) => !nextCuts.includes(c));

    setHsrCutSegments(nextCuts);
    setHsrPendingSegments(nextCuts);
    setHsrBreakSegment(nextCuts.length > 0 ? nextCuts[0] : null);
    if (nextCuts.length > 0) {
      setHsrSelectedSegment(nextCuts[nextCuts.length - 1]);
    }

    const nowStr = new Date().toLocaleTimeString('en-GB', { hour12: false });
    const newEntries: typeof hsrEventLog = [];

    added.forEach((segIdx) => {
      const seg = HSR_SEGMENTS[segIdx];
      newEntries.push({
        id: `HSR-CUT-${Date.now()}-${segIdx}`,
        timestamp: nowStr,
        segmentLabel: `Segment #${seg.segNum}`,
        affectedDevices: seg.endpointsText,
        severity: nextCuts.length >= 2 ? 'CRITICAL' : 'WARNING',
        eventType: `HSR Segment #${seg.segNum} Fiber Link Down`,
        statusText:
          nextCuts.length === 1
            ? 'HSR Ring Open — Alternate Path Active (0 ms)'
            : 'Multiple Fiber Failures — Network Partition Detected',
      });
    });

    removed.forEach((segIdx) => {
      const seg = HSR_SEGMENTS[segIdx];
      newEntries.push({
        id: `HSR-RESTORE-${Date.now()}-${segIdx}`,
        timestamp: nowStr,
        segmentLabel: `Segment #${seg.segNum}`,
        affectedDevices: seg.endpointsText,
        severity: 'INFO',
        eventType: `HSR Segment #${seg.segNum} Restored`,
        statusText:
          nextCuts.length === 0
            ? 'HSR Ring Closed — Full CW/CCW Redundancy Restored'
            : nextCuts.length === 1
            ? `Single Cut Remaining (Segment #${nextCuts[0] + 1}) — Ring Open`
            : `${nextCuts.length} Cuts Remaining — Network Partitioned`,
      });
    });

    if (newEntries.length > 0) {
      setHsrEventLog((prev) => [...newEntries, ...prev].slice(0, 18));
    }
  };

  const toggleHsrSegmentCutImmediate = (segIdx: number) => {
    setHsrSelectedSegment(segIdx);
    const exists = hsrCutSegments.includes(segIdx);
    const next = exists ? hsrCutSegments.filter((x) => x !== segIdx) : [...hsrCutSegments, segIdx];
    applyHsrFiberCuts(next);
  };

  const rackIedSiemens: MultiVendorIed =
    ieds.find((i) => i.vendor === 'Siemens' && i.model.includes('7SJ85')) ||
    ieds.find((i) => i.vendor === 'Siemens') ||
    ieds[0];
  const rackIedAbb: MultiVendorIed =
    ieds.find((i) => i.vendor.includes('ABB') && i.model.includes('REF615')) ||
    ieds.find((i) => i.vendor.includes('ABB')) ||
    ieds[1] ||
    ieds[0];
  const rackIedSchneider: MultiVendorIed =
    ieds.find((i) => i.vendor.includes('Schneider') && i.model.includes('C264')) ||
    ieds.find((i) => i.vendor.includes('Schneider')) ||
    ieds[2] ||
    ieds[0];
  const rackIedGe: MultiVendorIed =
    ieds.find((i) => i.vendor.includes('GE') && i.model.includes('850')) ||
    ieds.find((i) => i.vendor.includes('GE')) ||
    ieds[3] ||
    ieds[0];

  const lanAFaultActive = Boolean(faultScenarios.find((f) => f.id === 'FLT-11')?.active);
  const lanBFaultActive = Boolean(faultScenarios.find((f) => f.id === 'FLT-12')?.active);
  const iedCommLossActive = Boolean(faultScenarios.find((f) => f.id === 'FLT-03')?.active);
  const gooseTimeoutActive = Boolean(faultScenarios.find((f) => f.id === 'FLT-04')?.active);
  const vlanMismatchActive = Boolean(faultScenarios.find((f) => f.id === 'FLT-05')?.active);
  const mmsAssocFailActive = Boolean(faultScenarios.find((f) => f.id === 'FLT-06')?.active);
  const timeSyncFailActive = Boolean(faultScenarios.find((f) => f.id === 'FLT-10')?.active);

  const packetDuration = packetSpeed === 'SLOW' ? 3.4 : packetSpeed === 'FAST' ? 1.05 : 1.9;

  const getPortOverride = (portId: string): PortFaultOverride =>
    portOverrides[portId] || {
      disabled: false,
      disconnected: false,
      vlanMismatch: false,
      packetLossPercent: 0,
      gooseTimeoutSim: false,
    };

  const updatePortOverride = (portId: string, patch: Partial<PortFaultOverride>) => {
    setPortOverrides((prev) => ({
      ...prev,
      [portId]: {
        ...getPortOverride(portId),
        ...patch,
      },
    }));
  };

  const resetAllPortFaults = () => {
    setPortOverrides({});
    ['FLT-03', 'FLT-04', 'FLT-05', 'FLT-06', 'FLT-10', 'FLT-11', 'FLT-12'].forEach((fid) => {
      const f = faultScenarios.find((sc) => sc.id === fid);
      if (f?.active) toggleFaultScenario(fid);
    });
    setHsrBreakSegment(null);
    setHsrCutSegments([]);
    setHsrPendingSegments([]);
  };

  const activeSwitchPorts = selectedSwitchPlane === 'LAN_A' ? RSP35_PORTS_LAN_A : RSP35_PORTS_LAN_B;
  const inspectedPort =
    activeSwitchPorts.find((p) => p.portNumber === selectedPortNumber) || activeSwitchPorts[0];
  const inspectedPortOverride = getPortOverride(inspectedPort.portId);

  const getEffectivePortStatus = (port: SwitchPortConfig): 'UP' | 'DOWN' | 'DISCONNECTED' => {
    const ov = getPortOverride(port.portId);
    if (ov.disconnected) return 'DISCONNECTED';
    if (ov.disabled) return 'DOWN';
    if (port.switchId === 'SW-LAN-A1' && lanAFaultActive) return 'DOWN';
    if (port.switchId === 'SW-LAN-B1' && lanBFaultActive) return 'DOWN';
    if (port.connectedDeviceId === 'IED-33-F03' && iedCommLossActive) return 'DOWN';
    return 'UP';
  };

  const planeAHealthy = !lanAFaultActive && RSP35_PORTS_LAN_A.some((p) => getEffectivePortStatus(p) === 'UP');
  const planeBHealthy =
    !lanBFaultActive &&
    networkRedundancyMode !== 'SINGLE_LAN' &&
    RSP35_PORTS_LAN_B.some((p) => getEffectivePortStatus(p) === 'UP');

  const liveMetrics = useMemo(() => {
    const activeGooseCount = gooseControlBlocks.filter((g) => g.healthy && !gooseTimeoutActive).length;
    const planeFactor = (planeAHealthy ? 0.5 : 0) + (planeBHealthy ? 0.5 : 0);
    const mmsMbps =
      planeFactor === 0 ? 0 : +(12.4 * (planeFactor >= 0.5 ? 1 : 0.5) - (mmsAssocFailActive ? 1.8 : 0)).toFixed(1);
    const gooseKbps = planeFactor === 0 ? 0 : Math.round(80 * activeGooseCount * (vlanMismatchActive ? 0.65 : 1));
    const sntpKbps = timeSyncFailActive || planeFactor === 0 ? 0 : 8;
    const rttLanA = !planeAHealthy
      ? 'TIMEOUT'
      : `${(0.34 + getPortOverride('Gi1/1').packetLossPercent * 0.04).toFixed(2)} ms`;
    const rttLanB = !planeBHealthy
      ? 'TIMEOUT'
      : `${(0.36 + getPortOverride('Gi2/1').packetLossPercent * 0.04).toFixed(2)} ms`;
    return { mmsMbps, gooseKbps, sntpKbps, rttLanA, rttLanB };
  }, [
    gooseControlBlocks,
    gooseTimeoutActive,
    planeAHealthy,
    planeBHealthy,
    mmsAssocFailActive,
    vlanMismatchActive,
    timeSyncFailActive,
    portOverrides,
  ]);

  const handleSelectDevice = (deviceKey: string, openModal = true) => {
    setSelectedDeviceKey(deviceKey);
    if (openModal) {
      setInspectorModalOpen(true);
    }
  };

  const inspectedIed: MultiVendorIed = useMemo(() => {
    if (selectedDeviceKey === 'IED-33-F03') return rackIedSiemens;
    if (selectedDeviceKey === 'IED-11-F01') return rackIedAbb;
    if (selectedDeviceKey === 'IED-132-BC') return rackIedSchneider;
    if (selectedDeviceKey === 'IED-33-F02') return rackIedGe;
    return ieds.find((i) => i.id === selectedDeviceKey) || rackIedSiemens;
  }, [selectedDeviceKey, rackIedSiemens, rackIedAbb, rackIedSchneider, rackIedGe, ieds]);

  const inspectedInfra = useMemo(() => {
    return infrastructure.find((inf) => inf.id === selectedDeviceKey) || null;
  }, [selectedDeviceKey, infrastructure]);

  const activePacketColor = (defaultPlane: 'LAN_A' | 'LAN_B') => {
    if (selectedVlan === 10 || trafficFilter === 'MMS') return '#00CFFF';
    if (selectedVlan === 20 || trafficFilter === 'GOOSE') return '#22C55E';
    if (selectedVlan === 30) return '#A855F7';
    if (selectedVlan === 40 || trafficFilter === 'PTP') return '#FFB547';
    return defaultPlane === 'LAN_A' ? '#00E5FF' : '#FACC15';
  };

  const isPortInSelectedVlan = (port: SwitchPortConfig): boolean => {
    if (selectedVlan === null) return true;
    return port.allowedVlans.includes(selectedVlan) || port.nativeVlan === selectedVlan;
  };

  return (
    <div
      className={`text-[#E9F3FF] select-none ${
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#030B18] overflow-y-auto p-4 sm:p-6'
          : 'space-y-3'
      }`}
    >
      {/* 1. PREMIUM HEADER & HORIZONTAL TOOLBAR */}
      <div className="rounded-xl bg-gradient-to-r from-[#061529] via-[#081A30] to-[#061529] border border-[#183B5E] px-3.5 py-2 shadow-[0_8px_24px_rgba(0,0,0,0.55)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-base sm:text-lg md:text-xl font-extrabold tracking-wide text-white uppercase">
                PRP / HSR NETWORK – STATION BUS COMMUNICATION
              </h1>
            </div>
            <p className="text-[11px] sm:text-xs text-[#8BB3D4] font-medium tracking-wide mt-0.5">
              IEC 61850 <span className="text-[#386186]">|</span> PRP (Dual LAN){' '}
              <span className="text-[#386186]">|</span> HSR (Ring){' '}
              <span className="text-[#386186]">|</span> GOOSE / MMS{' '}
              <span className="text-[#386186]">|</span> VLAN{' '}
              <span className="text-[#386186]">|</span> RSTP{' '}
              <span className="text-[#386186]">|</span> Live Monitor
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPacketsPlaying((p) => !p)}
              title="Click to pause or resume live packet animation"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
                planeAHealthy && planeBHealthy
                  ? 'bg-[#093524]/90 border-[#22C55E] text-[#4ADE80] shadow-[0_0_14px_rgba(34,197,94,0.3)]'
                  : planeAHealthy || planeBHealthy
                  ? 'bg-[#3B2609]/90 border-[#FFB547] text-[#FCD34D]'
                  : 'bg-[#3B0D15]/90 border-[#FF5C65] text-[#FDA4AF]'
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  planeAHealthy && planeBHealthy
                    ? 'bg-[#22C55E] animate-pulse'
                    : planeAHealthy || planeBHealthy
                    ? 'bg-[#FFB547] animate-pulse'
                    : 'bg-[#FF5C65]'
                }`}
              />
              {planeAHealthy && planeBHealthy
                ? 'LIVE COMMUNICATION'
                : planeAHealthy || planeBHealthy
                ? 'REDUNDANT FAILOVER ACTIVE'
                : 'COMMUNICATION FAULT'}
            </button>

            <button
              type="button"
              onClick={() => setActiveView('TOPOLOGY')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'TOPOLOGY'
                  ? 'bg-[#0B3B5B] border-[#00CFFF] text-white shadow-[0_0_12px_rgba(0,207,255,0.3)]'
                  : 'bg-[#051120] border-[#1E3A5F] text-[#B8D4EA] hover:border-[#00CFFF]/60'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-[#00CFFF]" />
              Topology
            </button>

            <button
              type="button"
              onClick={() => setActiveView('RACK_VIEW')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'RACK_VIEW'
                  ? 'bg-[#0B3B5B] border-[#00CFFF] text-white shadow-[0_0_12px_rgba(0,207,255,0.3)]'
                  : 'bg-[#051120] border-[#1E3A5F] text-[#B8D4EA] hover:border-[#00CFFF]/60'
              }`}
            >
              <Server className="w-3.5 h-3.5 text-[#00CFFF]" />
              Rack View
            </button>

            <button
              type="button"
              onClick={() => {
                setNetworkRedundancyMode('PRP');
                setActiveView('PRP_DUAL');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'PRP_DUAL'
                  ? 'bg-[#0B3B5B] border-[#00CFFF] text-white shadow-[0_0_12px_rgba(0,207,255,0.3)]'
                  : 'bg-[#051120] border-[#1E3A5F] text-[#B8D4EA] hover:border-[#00CFFF]/60'
              }`}
            >
              <Shield className="w-3.5 h-3.5 text-[#00CFFF]" />
              PRP View
            </button>

            <button
              type="button"
              onClick={() => {
                setNetworkRedundancyMode('HSR');
                setActiveView('HSR_RING');
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'HSR_RING'
                  ? 'bg-[#0B3B5B] border-[#00CFFF] text-white shadow-[0_0_12px_rgba(0,207,255,0.3)]'
                  : 'bg-[#051120] border-[#1E3A5F] text-[#B8D4EA] hover:border-[#00CFFF]/60'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00CFFF]" />
              HSR View
            </button>

            <button
              type="button"
              onClick={() => setActiveView('PRP_HSR_COUPLING')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'PRP_HSR_COUPLING'
                  ? 'bg-[#1D1548] border-[#C084FC] text-white shadow-[0_0_12px_rgba(192,132,252,0.4)]'
                  : 'bg-[#051120] border-[#1E3A5F] text-[#E9D5FF] hover:border-[#C084FC]/70'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-[#C084FC]" />
              PRP/HSR Coupling
            </button>

            <button
              type="button"
              onClick={() => setActiveView('HSR_QUADBOX')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'HSR_QUADBOX'
                  ? 'bg-[#08332C] border-[#34D399] text-white shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                  : 'bg-[#051120] border-[#1E3A5F] text-[#A7F3D0] hover:border-[#34D399]/70'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#34D399]" />
              HSR-HSR QuadBox
            </button>

            <button
              type="button"
              onClick={() => setActiveView('RSTP_RING')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                activeView === 'RSTP_RING'
                  ? 'bg-[#3B2609] border-[#F59E0B] text-white shadow-[0_0_12px_rgba(245,158,11,0.4)]'
                  : 'bg-[#051120] border-[#1E3A5F] text-[#FDE68A] hover:border-[#F59E0B]/70'
              }`}
            >
              <GitBranch className="w-3.5 h-3.5 text-[#F59E0B]" />
              RSTP (802.1w)
            </button>

            <button
              type="button"
              onClick={() => setIsFullscreen((f) => !f)}
              title={isFullscreen ? 'Exit Fullscreen' : 'Expand Workspace'}
              className="p-1.5 rounded-lg bg-[#051120] border border-[#1E3A5F] text-[#B8D4EA] hover:text-white hover:border-[#00CFFF]"
            >
              {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="mt-1.5 pt-1.5 border-t border-[#14304D] flex flex-wrap items-center justify-between gap-1.5">
          <div className="flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Station Bus Laboratory Views">
            {(
              [
                { id: 'RACK_VIEW', label: 'Rack View (Real)' },
                { id: 'TOPOLOGY', label: 'Network Topology' },
                { id: 'PRP_DUAL', label: 'PRP (Dual LAN)' },
                { id: 'HSR_RING', label: 'HSR (Ring)' },
                { id: 'PRP_HSR_COUPLING', label: 'PRP/HSR COUPLING' },
                { id: 'HSR_QUADBOX', label: 'HSR-HSR QUADBOX' },
                { id: 'RSTP_RING', label: 'RSTP (802.1w)' },
                { id: 'VLAN_PORTS', label: 'VLAN & Ports' },
                { id: 'LIVE_TRAFFIC', label: 'Live Traffic' },
                { id: 'FAULT_INJECTION', label: 'Fault Injection' },
              ] as { id: LabViewTab; label: string }[]
            ).map((tab) => {
              const active = activeView === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveView(tab.id)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-bold tracking-wide transition border ${
                    active
                      ? 'bg-gradient-to-b from-[#104A73] to-[#092C48] border-[#00CFFF] text-white shadow-[0_0_14px_rgba(0,207,255,0.35)]'
                      : 'bg-[#051120]/90 border-[#1A3552] text-[#9BB8D3] hover:text-white hover:border-[#2C5882]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <button
              type="button"
              onClick={() => setShowCrossRackPrp((v) => !v)}
              className={`px-2.5 py-1 rounded border font-semibold transition ${
                showCrossRackPrp
                  ? 'bg-[#0D3B5E] border-[#00CFFF] text-[#77E7FF]'
                  : 'bg-[#051120] border-[#1A3552] text-[#9BB8D3] hover:text-white'
              }`}
              title="Toggle dual-homed DANP cross-rack fiber paths showing every IED connected to both LAN A and LAN B"
            >
              {showCrossRackPrp ? 'DANP Cross-LAN Paths: ON' : 'Show DANP Dual-LAN Paths'}
            </button>

            <select
              aria-label="Filter animated protocol packets"
              value={trafficFilter}
              onChange={(e) => setTrafficFilter(e.target.value as 'ALL' | 'GOOSE' | 'MMS' | 'PTP')}
              className="rounded bg-[#051120] border border-[#1A3552] px-2 py-1 text-[11px] text-[#DCEAF5] font-semibold"
            >
              <option value="ALL">Traffic: All (MMS+GOOSE+PTP)</option>
              <option value="GOOSE">Traffic: GOOSE (VLAN 20)</option>
              <option value="MMS">Traffic: SCADA MMS (VLAN 10)</option>
              <option value="PTP">Traffic: PTPv2 Sync (VLAN 40)</option>
            </select>

            <div className="flex items-center rounded bg-[#051120] border border-[#1A3552] p-0.5">
              <button
                type="button"
                onClick={() => setRackZoom((z) => Math.max(0.85, +(z - 0.1).toFixed(2)))}
                className="p-1 text-[#9BB8D3] hover:text-white"
                title="Zoom Out Rack"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>
              <span className="px-1.5 font-mono text-[10px] text-[#00CFFF]">{Math.round(rackZoom * 100)}%</span>
              <button
                type="button"
                onClick={() => setRackZoom((z) => Math.min(1.25, +(z + 0.1).toFixed(2)))}
                className="p-1 text-[#9BB8D3] hover:text-white"
                title="Zoom In Rack"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>
              {rackZoom !== 1 && (
                <button
                  type="button"
                  onClick={() => setRackZoom(1)}
                  className="px-1 text-[10px] text-amber-300 hover:underline"
                >
                  1:1
                </button>
              )}
            </div>

            {(Object.keys(portOverrides).length > 0 ||
              lanAFaultActive ||
              lanBFaultActive ||
              iedCommLossActive ||
              gooseTimeoutActive ||
              vlanMismatchActive ||
              timeSyncFailActive) && (
              <button
                type="button"
                onClick={resetAllPortFaults}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-[#FF5C65]/20 border border-[#FF5C65] text-[#FDA4AF] font-bold hover:bg-[#FF5C65]/30"
              >
                <RotateCcw className="w-3 h-3" />
                Restore All Healthy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. MAIN WORKSPACE GRID */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-3.5 items-start">
        <div className="xl:col-span-8 min-w-0">
          {activeView === 'RACK_VIEW' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-2.5 sm:p-3.5 shadow-[0_14px_38px_rgba(0,0,0,0.65)] overflow-hidden">

              <div className="overflow-x-auto pb-1">
                <div
                  style={{
                    transform: `scale(${rackZoom})`,
                    transformOrigin: 'top center',
                    transition: 'transform 0.2s ease',
                  }}
                  className="relative min-w-[780px] grid grid-cols-2 gap-3.5 pt-1 pb-3"
                >
                  {/* RACK-A (LAN A – PRP) */}
                  <div className="relative rounded-xl bg-gradient-to-b from-[#172130] via-[#0B121C] to-[#060B12] border-2 border-[#31455E] shadow-[0_18px_45px_rgba(0,0,0,0.85)] overflow-hidden">
                    <div className="relative h-7 bg-gradient-to-b from-[#2A3748] via-[#1B2533] to-[#0E151F] border-b border-[#3B516B] flex items-center justify-around px-10">
                      <div className="relative">
                        <div className="w-16 h-2 rounded-full bg-[#FFF3D1] shadow-[0_0_18px_6px_rgba(255,196,87,0.85)]" />
                        <div className="pointer-events-none absolute -top-2 -left-10 w-36 h-14 bg-[radial-gradient(ellipse_at_top,rgba(255,200,95,0.42)_0%,transparent_72%)]" />
                      </div>
                      <div className="relative">
                        <div className="w-16 h-2 rounded-full bg-[#FFF3D1] shadow-[0_0_18px_6px_rgba(255,196,87,0.85)]" />
                        <div className="pointer-events-none absolute -top-2 -left-10 w-36 h-14 bg-[radial-gradient(ellipse_at_top,rgba(255,200,95,0.42)_0%,transparent_72%)]" />
                      </div>
                    </div>

                    <div className="pointer-events-none absolute top-7 bottom-5 left-0 w-7 bg-[#060C14] border-r border-[#1F2E42] z-10 flex flex-col justify-between overflow-hidden">
                      <svg viewBox="0 0 28 540" className="w-full h-full" preserveAspectRatio="none">
                        {[3, 7, 11, 15, 19, 23].map((x, idx) => (
                          <g key={x}>
                            <path
                              d={`M ${x} 0 L ${x} 495 Q ${x} 520 28 525`}
                              fill="none"
                              stroke={lanAFaultActive ? '#991B1B' : idx % 2 === 0 ? '#0284C7' : '#2563EB'}
                              strokeWidth="3.2"
                            />
                            <path
                              d={`M ${x} 0 L ${x} 495 Q ${x} 520 28 525`}
                              fill="none"
                              stroke="#7DD3FC"
                              strokeWidth="0.9"
                              opacity="0.7"
                            />
                          </g>
                        ))}
                        {[45, 110, 175, 240, 305, 370, 435, 485].map((y) => (
                          <rect key={y} x="1" y={y} width="25" height="5" rx="1.5" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
                        ))}
                      </svg>
                    </div>

                    <div className="pointer-events-none absolute top-7 bottom-5 right-0 w-4 bg-gradient-to-r from-[#141E2B] to-[#1F2C3D] border-l border-[#334760] z-10 flex flex-col items-center justify-around py-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-[1px] bg-[#070B10] border border-[#475E78] shadow-inner"
                        />
                      ))}
                    </div>

                    <div className="relative pl-8 pr-5 py-1.5 space-y-1.5 bg-[radial-gradient(circle_at_50%_10%,rgba(255,210,125,0.08)_0%,rgba(5,13,24,0.98)_55%)]">
                      <div className="flex items-center justify-center">
                        <div className="px-5 py-1 rounded-md bg-gradient-to-b from-[#0E2B48] to-[#07182B] border border-[#00CFFF] shadow-[0_0_15px_rgba(0,207,255,0.28)] flex items-center gap-3">
                          <span className="text-xs sm:text-sm font-black tracking-wider text-white">RACK-A</span>
                          <span className="text-xs sm:text-sm font-bold text-[#77E7FF]">(LAN A – PRP)</span>
                        </div>
                      </div>

                      <div className="relative rounded-lg bg-gradient-to-b from-[#131C29] to-[#0B111A] border border-[#2B3D54] p-2 shadow-inner">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectDevice('IED-33-F03', true)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectDevice('IED-33-F03', true)}
                            className={`group relative rounded-md bg-[#0E1622] border transition cursor-pointer p-1.5 ${
                              selectedDeviceKey === 'IED-33-F03'
                                ? 'border-[#00CFFF] shadow-[0_0_14px_rgba(0,207,255,0.35)]'
                                : 'border-[#2B3F58] hover:border-[#00CFFF]/70'
                            }`}
                          >
                            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-[#07101B] border border-[#1E324A] mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span
                                  className={`w-2 h-2 rounded-full shrink-0 ${
                                    iedCommLossActive ? 'bg-[#FF5C65]' : 'bg-[#22C55E] shadow-[0_0_6px_#22C55E]'
                                  }`}
                                />
                                <div className="truncate">
                                  <div className="text-[10px] font-bold text-white leading-tight truncate">
                                    Siemens SIPROTEC 5
                                  </div>
                                  <div className="text-[9.5px] font-bold text-[#77E7FF] leading-tight">
                                    (7SJ85)
                                  </div>
                                </div>
                              </div>
                              <span className="text-[8.5px] font-mono px-1 py-0.5 rounded bg-[#0D2840] text-[#00CFFF] border border-[#00CFFF]/40">
                                DANP A/B
                              </span>
                            </div>

                            <div className="relative h-[106px] rounded bg-[#141D28] border border-[#33475E] overflow-hidden flex items-center justify-center">
                              <img
                                src={getHardwarePhoto('SIEMENS_7SJ85')}
                                alt="Siemens SIPROTEC 5 7SJ85 Protection Relay"
                                className="w-full h-full object-contain ied-device-image object-center scale-[1.08] brightness-105 contrast-105"
                              />
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 border border-[#00CFFF]/50 text-[8.5px] font-mono text-[#77E7FF]">
                                192.168.10.11
                              </div>
                              <div className="absolute top-1.5 right-1.5 flex flex-col gap-0.5">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_5px_#22C55E]" />
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    iedCommLossActive ? 'bg-[#FF5C65] animate-ping' : 'bg-[#22C55E]'
                                  }`}
                                />
                              </div>
                              <div className="absolute bottom-1 inset-x-2 flex items-center justify-between px-1.5 py-0.5 rounded bg-[#070D14]/90 border border-[#283B52] text-[8px] font-mono">
                                <span className="text-[#38BDF8] font-bold">A:Gi1/1</span><span className="w-3 h-2 rounded-[1px] bg-[#0284C7] border border-cyan-300" /><span className="text-[#FACC15] font-bold">B:Gi2/3</span>
                              </div>
                            </div>
                          </div>

                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectDevice('IED-11-F01', true)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectDevice('IED-11-F01', true)}
                            className={`group relative rounded-md bg-[#0E1622] border transition cursor-pointer p-1.5 ${
                              selectedDeviceKey === 'IED-11-F01'
                                ? 'border-[#00CFFF] shadow-[0_0_14px_rgba(0,207,255,0.35)]'
                                : 'border-[#2B3F58] hover:border-[#00CFFF]/70'
                            }`}
                          >
                            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-[#07101B] border border-[#1E324A] mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0 bg-[#22C55E] shadow-[0_0_6px_#22C55E]" />
                                <div className="truncate">
                                  <div className="text-[10px] font-bold text-white leading-tight truncate">
                                    ABB Relion
                                  </div>
                                  <div className="text-[9.5px] font-bold text-[#77E7FF] leading-tight">
                                    (REF615)
                                  </div>
                                </div>
                              </div>
                              <span className="text-[8.5px] font-mono px-1 py-0.5 rounded bg-[#0D2840] text-[#00CFFF] border border-[#00CFFF]/40">
                                DANP A/B
                              </span>
                            </div>

                            <div className="relative h-[106px] rounded bg-[#1A2432] border border-[#33475E] overflow-hidden flex items-center justify-center">
                              <img
                                src={getHardwarePhoto('ABB_REF615')}
                                alt="ABB Relion REF615 Feeder Protection Relay"
                                className="w-full h-full object-contain ied-device-image object-center scale-[1.08] brightness-105 contrast-105"
                              />
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 border border-[#00CFFF]/50 text-[8.5px] font-mono text-[#77E7FF]">
                                192.168.10.12
                              </div>
                              <div className="absolute bottom-1 inset-x-2 flex items-center justify-between px-1.5 py-0.5 rounded bg-[#070D14]/90 border border-[#283B52] text-[8px] font-mono">
                                <span className="text-[#38BDF8] font-bold">A:Gi1/2</span><span className="w-3 h-2 rounded-[1px] bg-[#0284C7] border border-cyan-300" /><span className="text-[#FACC15] font-bold">B:LAN-B</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative rounded-lg bg-gradient-to-r from-[#0F2D69] via-[#153E8A] to-[#0E275C] border-2 border-[#3A68B8] px-2.5 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedSwitchPlane('LAN_A');
                              handleSelectDevice('SW-LAN-A1', false);
                            }}
                            className="cursor-pointer min-w-[92px]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  lanAFaultActive ? 'bg-[#FF5C65] animate-ping' : 'bg-[#22C55E] shadow-[0_0_6px_#22C55E]'
                                }`}
                              />
                              <span className="text-[11px] font-black tracking-wider text-white">
                                HIRSCHMANN
                              </span>
                            </div>
                            <div className="text-[10px] font-extrabold text-[#93C5FD] pl-3.5">
                              RSP35 <span className="text-[8.5px] font-mono text-cyan-200">(LAN A)</span>
                            </div>
                            <div className="text-[8.5px] font-mono text-slate-300 pl-3.5">192.168.10.2</div>
                          </div>

                          <div className="grid grid-cols-8 gap-1 flex-1 max-w-[235px]">
                            {RSP35_PORTS_LAN_A.map((port) => {
                              const st = getEffectivePortStatus(port);
                              const isSel =
                                selectedSwitchPlane === 'LAN_A' && selectedPortNumber === port.portNumber;
                              const vlanMatch = isPortInSelectedVlan(port);
                              return (
                                <button
                                  key={port.portId}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSwitchPlane('LAN_A');
                                    setSelectedPortNumber(port.portNumber);
                                  }}
                                  title={`${port.portId}: ${port.connectedDeviceName} (${port.protocolLabel})`}
                                  className={`relative h-9 rounded-[3px] bg-[#070E1A] border flex flex-col items-center justify-between p-0.5 transition ${
                                    isSel
                                      ? 'border-[#00F0FF] ring-2 ring-[#00F0FF]/60 scale-105 z-20'
                                      : !vlanMatch
                                      ? 'border-slate-700 opacity-35'
                                      : st === 'DOWN'
                                      ? 'border-[#FF5C65]'
                                      : 'border-[#475569] hover:border-[#00CFFF]'
                                  }`}
                                >
                                  <div className="w-full flex items-center justify-between px-0.5">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        st === 'UP'
                                          ? 'bg-[#22C55E] shadow-[0_0_4px_#22C55E]'
                                          : st === 'DOWN'
                                          ? 'bg-[#FF5C65]'
                                          : 'bg-slate-600'
                                      }`}
                                    />
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        st === 'UP' && packetsPlaying
                                          ? 'bg-[#FACC15] animate-pulse'
                                          : 'bg-slate-700'
                                      }`}
                                    />
                                  </div>
                                  <div className="w-3.5 h-3.5 rounded-[1px] bg-[#1E293B] border border-[#64748B] flex items-center justify-center">
                                    <div
                                      className={`w-2 h-2 rounded-[1px] ${
                                        st === 'DISCONNECTED'
                                          ? 'bg-[#090D16]'
                                          : 'bg-[#0284C7] shadow-[0_0_4px_#38BDF8]'
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[7.5px] font-mono text-slate-300 leading-none">
                                    P{port.portNumber}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="relative rounded-lg bg-gradient-to-b from-[#0E1622] to-[#080D15] border border-[#26384E] px-3 py-2.5">
                        <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 h-4 bg-gradient-to-b from-[#475569] via-[#1E293B] to-[#334155] border-y border-[#64748B] opacity-55" />

                        <div className="relative z-10 grid grid-cols-3 gap-2.5">
                          {[
                            {
                              id: 'SW-01',
                              title: 'SW-01',
                              sub: '(RSTP)',
                              portNum: 4,
                              ledColor: 'bg-[#22C55E]',
                              badgeColor: 'text-[#4ADE80]',
                            },
                            {
                              id: 'SW-02',
                              title: 'SW-02',
                              sub: '(Forwarding)',
                              portNum: 5,
                              ledColor: 'bg-[#22C55E]',
                              badgeColor: 'text-[#77E7FF]',
                            },
                            {
                              id: 'SW-03',
                              title: 'SW-03',
                              sub: '(Blocking)',
                              portNum: 7,
                              ledColor: 'bg-[#FFB547]',
                              badgeColor: 'text-[#FCD34D]',
                            },
                          ].map((sw) => (
                            <div
                              key={sw.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedSwitchPlane('LAN_A');
                                setSelectedPortNumber(sw.portNum);
                              }}
                              className="cursor-pointer rounded bg-gradient-to-b from-[#263241] via-[#18212D] to-[#101720] border border-[#475B73] hover:border-[#00CFFF] p-1.5 shadow-lg flex flex-col justify-between h-[82px]"
                            >
                              <div className="flex items-center justify-between border-b border-[#334559] pb-1">
                                <div>
                                  <div className="text-[10px] font-extrabold text-white leading-none">
                                    {sw.title}
                                  </div>
                                  <div className={`text-[8.5px] font-mono ${sw.badgeColor} mt-0.5`}>
                                    {sw.sub}
                                  </div>
                                </div>
                                <span className={`w-2 h-2 rounded-full ${sw.ledColor} shadow-[0_0_5px_currentColor]`} />
                              </div>

                              <div className="flex items-center justify-between px-1 my-1">
                                <div className="flex flex-col gap-1">
                                  {[1, 2, 3, 4].map((led) => (
                                    <div key={led} className="flex items-center gap-1">
                                      <span
                                        className={`w-1.5 h-1.5 rounded-full ${
                                          sw.id === 'SW-03' && led === 4
                                            ? 'bg-[#FFB547] animate-pulse'
                                            : 'bg-[#22C55E]'
                                        }`}
                                      />
                                      <span className="text-[7px] font-mono text-slate-400">L{led}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex flex-col gap-1 bg-[#0B1119] p-1 rounded border border-[#334155]">
                                  {[1, 2, 3].map((p) => (
                                    <div
                                      key={p}
                                      className="w-4 h-3 rounded-[1px] bg-[#1E293B] border border-[#64748B] flex items-center justify-center"
                                    >
                                      <div className="w-2 h-1.5 bg-[#0284C7]" />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="text-[7.5px] font-mono text-slate-400 text-center">
                                IEEE 802.1w RSTP
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectDevice('GTW-RCC-01', true)}
                        className={`cursor-pointer rounded-md bg-gradient-to-b from-[#8A99AD] via-[#68778B] to-[#4A5768] border-2 p-2 shadow-lg flex items-center justify-between gap-2 transition ${
                          selectedDeviceKey === 'GTW-RCC-01'
                            ? 'border-[#00F0FF] ring-2 ring-[#00CFFF]/50'
                            : 'border-[#94A3B8] hover:border-[#00CFFF]'
                        }`}
                      >
                        <div className="flex items-center gap-2 bg-[#1E293B] px-2 py-1 rounded border border-[#475569]">
                          <div className="grid grid-cols-2 gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shadow-[0_0_4px_#22C55E]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FACC15] animate-pulse" />
                            <span className="w-1.5 h-1.5 rounded-full bg-[#00CFFF]" />
                          </div>
                          <div className="text-left">
                            <div className="text-[10.5px] font-black text-white leading-tight">
                              Station Gateway
                            </div>
                            <div className="text-[9px] font-bold text-[#77E7FF] leading-tight">
                              (IEC 61850 / SCADA)
                            </div>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-1 bg-[#0F172A] p-1 rounded border border-[#334155]">
                          {[1, 2, 3, 4].map((p) => (
                            <div
                              key={p}
                              className="w-4 h-3.5 rounded-[1px] bg-[#1E293B] border border-[#64748B] flex items-center justify-center"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                            </div>
                          ))}
                        </div>
                      </div>

                      <svg
                        viewBox="0 0 360 405"
                        className="pointer-events-none absolute inset-0 w-full h-full z-20"
                        preserveAspectRatio="none"
                      >
                        <PatchCordPath
                          id="CORD-A-1"
                          d="M 106 164 C 106 184, 152 184, 152 204"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[0])}
                          selected={selectedSwitchPlane === 'LAN_A' && selectedPortNumber === 1}
                          highlighted={selectedDeviceKey === 'IED-33-F03' || selectedVlan === 20}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_A')}
                          duration={packetDuration}
                          delay={0.1}
                        />
                        <PatchCordPath
                          id="CORD-A-2"
                          d="M 268 164 C 268 184, 174 184, 174 204"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[1])}
                          selected={selectedSwitchPlane === 'LAN_A' && selectedPortNumber === 2}
                          highlighted={selectedDeviceKey === 'IED-11-F01' || selectedVlan === 20}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_A')}
                          duration={packetDuration}
                          delay={0.35}
                        />
                        <PatchCordPath
                          id="CORD-A-4"
                          d="M 218 220 C 218 248, 118 248, 118 278"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[3])}
                          selected={selectedSwitchPlane === 'LAN_A' && selectedPortNumber === 4}
                          highlighted={selectedDeviceKey === 'SRV-SCADA-A' || selectedVlan === 10}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_A')}
                          duration={packetDuration}
                          delay={0.2}
                        />
                        <PatchCordPath
                          id="CORD-A-5"
                          d="M 240 220 C 240 248, 222 248, 222 278"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[4])}
                          selected={selectedSwitchPlane === 'LAN_A' && selectedPortNumber === 5}
                          highlighted={selectedDeviceKey === 'WS-HMI-01' || selectedVlan === 10}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_A')}
                          duration={packetDuration}
                          delay={0.5}
                        />
                        <PatchCordPath
                          id="CORD-A-7"
                          d="M 284 220 C 296 248, 322 248, 322 278"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[6])}
                          selected={selectedSwitchPlane === 'LAN_A' && selectedPortNumber === 7}
                          highlighted={selectedVlan === 10 || selectedVlan === 20}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_A')}
                          duration={packetDuration}
                          delay={0.7}
                        />
                        <PatchCordPath
                          id="CORD-A-GTW-1"
                          d="M 118 322 C 118 354, 245 358, 245 372"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[5])}
                          selected={selectedSwitchPlane === 'LAN_A' && selectedPortNumber === 6}
                          highlighted={selectedDeviceKey === 'GTW-RCC-01'}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_A')}
                          duration={packetDuration}
                          delay={0.25}
                        />
                        <PatchCordPath
                          id="CORD-A-GTW-2"
                          d="M 222 322 C 222 354, 280 358, 280 372"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[5])}
                          selected={false}
                          highlighted={selectedDeviceKey === 'GTW-RCC-01'}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_A')}
                          duration={packetDuration}
                          delay={0.6}
                        />
                        <PatchCordPath
                          id="CORD-A-GTW-3"
                          d="M 322 322 C 322 354, 315 358, 315 372"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_A[7])}
                          selected={selectedSwitchPlane === 'LAN_A' && selectedPortNumber === 8}
                          highlighted={selectedDeviceKey === 'CLK-PTP-GM' || selectedVlan === 40}
                          packetActive={packetsPlaying}
                          packetColor="#FFB547"
                          duration={packetDuration}
                          delay={0.4}
                        />
                      </svg>
                    </div>

                    <div className="h-4 bg-[#050A12] border-t border-[#1E3A5F] flex items-center justify-around px-12">
                      <div className="w-16 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_16px_4px_rgba(0,207,255,0.85)]" />
                      <div className="w-16 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_16px_4px_rgba(0,207,255,0.85)]" />
                    </div>
                  </div>

                  {/* RACK-B (LAN B – PRP) */}
                  <div className="relative rounded-xl bg-gradient-to-b from-[#172130] via-[#0B121C] to-[#060B12] border-2 border-[#31455E] shadow-[0_18px_45px_rgba(0,0,0,0.85)] overflow-hidden">
                    <div className="relative h-7 bg-gradient-to-b from-[#2A3748] via-[#1B2533] to-[#0E151F] border-b border-[#3B516B] flex items-center justify-around px-10">
                      <div className="relative">
                        <div className="w-16 h-2 rounded-full bg-[#FFF3D1] shadow-[0_0_18px_6px_rgba(255,196,87,0.85)]" />
                        <div className="pointer-events-none absolute -top-2 -left-10 w-36 h-14 bg-[radial-gradient(ellipse_at_top,rgba(255,200,95,0.42)_0%,transparent_72%)]" />
                      </div>
                      <div className="relative">
                        <div className="w-16 h-2 rounded-full bg-[#FFF3D1] shadow-[0_0_18px_6px_rgba(255,196,87,0.85)]" />
                        <div className="pointer-events-none absolute -top-2 -left-10 w-36 h-14 bg-[radial-gradient(ellipse_at_top,rgba(255,200,95,0.42)_0%,transparent_72%)]" />
                      </div>
                    </div>

                    <div className="pointer-events-none absolute top-7 bottom-5 left-0 w-4 bg-gradient-to-r from-[#1F2C3D] to-[#141E2B] border-r border-[#334760] z-10 flex flex-col items-center justify-around py-2">
                      {Array.from({ length: 24 }).map((_, i) => (
                        <div
                          key={i}
                          className="w-2 h-2 rounded-[1px] bg-[#070B10] border border-[#475E78] shadow-inner"
                        />
                      ))}
                    </div>

                    <div className="pointer-events-none absolute top-7 bottom-5 right-0 w-7 bg-[#060C14] border-l border-[#1F2E42] z-10 flex flex-col justify-between overflow-hidden">
                      <svg viewBox="0 0 28 540" className="w-full h-full" preserveAspectRatio="none">
                        {[5, 9, 13, 17, 21, 25].map((x, idx) => (
                          <g key={x}>
                            <path
                              d={`M ${x} 0 L ${x} 495 Q ${x} 520 0 525`}
                              fill="none"
                              stroke={lanBFaultActive ? '#991B1B' : idx % 2 === 0 ? '#EAB308' : '#CA8A04'}
                              strokeWidth="3.2"
                            />
                            <path
                              d={`M ${x} 0 L ${x} 495 Q ${x} 520 0 525`}
                              fill="none"
                              stroke="#FEF08A"
                              strokeWidth="0.9"
                              opacity="0.7"
                            />
                          </g>
                        ))}
                        {[45, 110, 175, 240, 305, 370, 435, 485].map((y) => (
                          <rect key={y} x="2" y={y} width="25" height="5" rx="1.5" fill="#0F172A" stroke="#334155" strokeWidth="0.8" />
                        ))}
                      </svg>
                    </div>

                    <div className="relative pl-5 pr-8 py-1.5 space-y-1.5 bg-[radial-gradient(circle_at_50%_10%,rgba(255,210,125,0.08)_0%,rgba(5,13,24,0.98)_55%)]">
                      <div className="flex items-center justify-center">
                        <div className="px-5 py-1 rounded-md bg-gradient-to-b from-[#0E2B48] to-[#07182B] border border-[#00CFFF] shadow-[0_0_15px_rgba(0,207,255,0.28)] flex items-center gap-3">
                          <span className="text-xs sm:text-sm font-black tracking-wider text-white">RACK-B</span>
                          <span className="text-xs sm:text-sm font-bold text-[#77E7FF]">(LAN B – PRP)</span>
                        </div>
                      </div>

                      <div className="relative rounded-lg bg-gradient-to-b from-[#131C29] to-[#0B111A] border border-[#2B3D54] p-2 shadow-inner">
                        <div className="grid grid-cols-2 gap-2.5">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectDevice('IED-132-BC', true)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectDevice('IED-132-BC', true)}
                            className={`group relative rounded-md bg-[#0E1622] border transition cursor-pointer p-1.5 ${
                              selectedDeviceKey === 'IED-132-BC'
                                ? 'border-[#00CFFF] shadow-[0_0_14px_rgba(0,207,255,0.35)]'
                                : 'border-[#2B3F58] hover:border-[#00CFFF]/70'
                            }`}
                          >
                            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-[#07101B] border border-[#1E324A] mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0 bg-[#22C55E] shadow-[0_0_6px_#22C55E]" />
                                <div className="truncate">
                                  <div className="text-[10px] font-bold text-white leading-tight truncate">
                                    Schneider
                                  </div>
                                  <div className="text-[9.5px] font-bold text-[#77E7FF] leading-tight">
                                    MiCOM C264
                                  </div>
                                </div>
                              </div>
                              <span className="text-[8.5px] font-mono px-1 py-0.5 rounded bg-[#0D2840] text-[#00CFFF] border border-[#00CFFF]/40">
                                DANP A/B
                              </span>
                            </div>

                            <div className="relative h-[106px] rounded bg-[#182230] border border-[#33475E] overflow-hidden flex items-center justify-center">
                              <img
                                src={getHardwarePhoto('SCHNEIDER_C264')}
                                alt="Schneider Electric MiCOM C264 Bay Computer"
                                className="w-full h-full object-contain ied-device-image object-center scale-[1.15] brightness-105 contrast-105"
                              />
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 border border-[#00CFFF]/50 text-[8.5px] font-mono text-[#77E7FF]">
                                192.168.10.13
                              </div>
                              <div className="absolute bottom-1 inset-x-2 flex items-center justify-between px-1.5 py-0.5 rounded bg-[#070D14]/90 border border-[#283B52] text-[8px] font-mono">
                                <span className="text-[#38BDF8] font-bold">A:Gi1/3</span><span className="w-3 h-2 rounded-[1px] bg-[#0284C7] border border-cyan-300" /><span className="text-[#FACC15] font-bold">B:Gi2/1</span>
                              </div>
                            </div>
                          </div>

                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => handleSelectDevice('IED-33-F02', true)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSelectDevice('IED-33-F02', true)}
                            className={`group relative rounded-md bg-[#0E1622] border transition cursor-pointer p-1.5 ${
                              selectedDeviceKey === 'IED-33-F02'
                                ? 'border-[#00CFFF] shadow-[0_0_14px_rgba(0,207,255,0.35)]'
                                : 'border-[#2B3F58] hover:border-[#00CFFF]/70'
                            }`}
                          >
                            <div className="flex items-center justify-between px-1.5 py-1 rounded bg-[#07101B] border border-[#1E324A] mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-2 h-2 rounded-full shrink-0 bg-[#22C55E] shadow-[0_0_6px_#22C55E]" />
                                <div className="truncate">
                                  <div className="text-[10px] font-bold text-white leading-tight truncate">
                                    GE Multilin
                                  </div>
                                  <div className="text-[9.5px] font-bold text-[#77E7FF] leading-tight">
                                    850
                                  </div>
                                </div>
                              </div>
                              <span className="text-[8.5px] font-mono px-1 py-0.5 rounded bg-[#0D2840] text-[#00CFFF] border border-[#00CFFF]/40">
                                DANP A/B
                              </span>
                            </div>

                            <div className="relative h-[106px] rounded bg-[#141D28] border border-[#33475E] overflow-hidden flex items-center justify-center">
                              <img
                                src={getHardwarePhoto('GE_MULTILIN_850')}
                                alt="GE Multilin 850 Feeder Protection Relay"
                                className="w-full h-full object-contain ied-device-image object-center scale-[1.12] brightness-105 contrast-105"
                              />
                              <div className="absolute top-1.5 left-1.5 px-1.5 py-0.5 rounded bg-black/75 border border-[#00CFFF]/50 text-[8.5px] font-mono text-[#77E7FF]">
                                192.168.10.14
                              </div>
                              <div className="absolute bottom-1 inset-x-2 flex items-center justify-between px-1.5 py-0.5 rounded bg-[#070D14]/90 border border-[#283B52] text-[8px] font-mono">
                                <span className="text-[#38BDF8] font-bold">A:LAN-A</span><span className="w-3 h-2 rounded-[1px] bg-[#0284C7] border border-cyan-300" /><span className="text-[#FACC15] font-bold">B:Gi2/2</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="relative rounded-lg bg-gradient-to-r from-[#0F2D69] via-[#153E8A] to-[#0E275C] border-2 border-[#3A68B8] px-2.5 py-2 shadow-[0_6px_18px_rgba(0,0,0,0.65)]">
                        <div className="flex items-center justify-between gap-2">
                          <div
                            role="button"
                            tabIndex={0}
                            onClick={() => {
                              setSelectedSwitchPlane('LAN_B');
                              handleSelectDevice('SW-LAN-B1', false);
                            }}
                            className="cursor-pointer min-w-[92px]"
                          >
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`w-2 h-2 rounded-full ${
                                  lanBFaultActive ? 'bg-[#FF5C65] animate-ping' : 'bg-[#22C55E] shadow-[0_0_6px_#22C55E]'
                                }`}
                              />
                              <span className="text-[11px] font-black tracking-wider text-white">
                                HIRSCHMANN
                              </span>
                            </div>
                            <div className="text-[10px] font-extrabold text-[#FDE047] pl-3.5">
                              RSP35 <span className="text-[8.5px] font-mono text-amber-200">(LAN B)</span>
                            </div>
                            <div className="text-[8.5px] font-mono text-slate-300 pl-3.5">192.168.20.2</div>
                          </div>

                          <div className="grid grid-cols-8 gap-1 flex-1 max-w-[235px]">
                            {RSP35_PORTS_LAN_B.map((port) => {
                              const st = getEffectivePortStatus(port);
                              const isSel =
                                selectedSwitchPlane === 'LAN_B' && selectedPortNumber === port.portNumber;
                              const vlanMatch = isPortInSelectedVlan(port);
                              return (
                                <button
                                  key={port.portId}
                                  type="button"
                                  onClick={() => {
                                    setSelectedSwitchPlane('LAN_B');
                                    setSelectedPortNumber(port.portNumber);
                                  }}
                                  title={`${port.portId}: ${port.connectedDeviceName} (${port.protocolLabel})`}
                                  className={`relative h-9 rounded-[3px] bg-[#070E1A] border flex flex-col items-center justify-between p-0.5 transition ${
                                    isSel
                                      ? 'border-[#FACC15] ring-2 ring-[#FACC15]/60 scale-105 z-20'
                                      : !vlanMatch
                                      ? 'border-slate-700 opacity-35'
                                      : st === 'DOWN'
                                      ? 'border-[#FF5C65]'
                                      : 'border-[#475569] hover:border-[#FACC15]'
                                  }`}
                                >
                                  <div className="w-full flex items-center justify-between px-0.5">
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        st === 'UP'
                                          ? 'bg-[#22C55E] shadow-[0_0_4px_#22C55E]'
                                          : st === 'DOWN'
                                          ? 'bg-[#FF5C65]'
                                          : 'bg-slate-600'
                                      }`}
                                    />
                                    <span
                                      className={`w-1.5 h-1.5 rounded-full ${
                                        st === 'UP' && packetsPlaying
                                          ? 'bg-[#FACC15] animate-pulse'
                                          : 'bg-slate-700'
                                      }`}
                                    />
                                  </div>
                                  <div className="w-3.5 h-3.5 rounded-[1px] bg-[#1E293B] border border-[#64748B] flex items-center justify-center">
                                    <div
                                      className={`w-2 h-2 rounded-[1px] ${
                                        st === 'DISCONNECTED'
                                          ? 'bg-[#090D16]'
                                          : 'bg-[#EAB308] shadow-[0_0_4px_#FACC15]'
                                      }`}
                                    />
                                  </div>
                                  <span className="text-[7.5px] font-mono text-slate-300 leading-none">
                                    P{port.portNumber}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <div className="relative rounded-lg bg-gradient-to-b from-[#0E1622] to-[#080D15] border border-[#26384E] px-3 py-2.5">
                        <div className="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 h-4 bg-gradient-to-b from-[#475569] via-[#1E293B] to-[#334155] border-y border-[#64748B] opacity-55" />

                        <div className="relative z-10 grid grid-cols-3 gap-2.5">
                          {[
                            {
                              id: 'SW-04',
                              title: 'SW-04',
                              sub: '(LAN-B)',
                              portNum: 4,
                              ledColor: 'bg-[#22C55E]',
                              badgeColor: 'text-[#FDE047]',
                            },
                            {
                              id: 'SW-05',
                              title: 'SW-05',
                              sub: '(PTP TC)',
                              portNum: 5,
                              ledColor: 'bg-[#22C55E]',
                              badgeColor: 'text-[#FDE047]',
                            },
                            {
                              id: 'GW',
                              title: 'GW',
                              sub: '(RedBox)',
                              portNum: 8,
                              ledColor: 'bg-[#22C55E]',
                              badgeColor: 'text-[#77E7FF]',
                            },
                          ].map((sw) => (
                            <div
                              key={sw.id}
                              role="button"
                              tabIndex={0}
                              onClick={() => {
                                setSelectedSwitchPlane('LAN_B');
                                setSelectedPortNumber(sw.portNum);
                              }}
                              className="cursor-pointer rounded bg-gradient-to-b from-[#263241] via-[#18212D] to-[#101720] border border-[#475B73] hover:border-[#FACC15] p-1.5 shadow-lg flex flex-col justify-between h-[82px]"
                            >
                              <div className="flex items-center justify-between border-b border-[#334559] pb-1">
                                <div>
                                  <div className="text-[10px] font-extrabold text-white leading-none">
                                    {sw.title}
                                  </div>
                                  <div className={`text-[8.5px] font-mono ${sw.badgeColor} mt-0.5`}>
                                    {sw.sub}
                                  </div>
                                </div>
                                <span className={`w-2 h-2 rounded-full ${sw.ledColor} shadow-[0_0_5px_currentColor]`} />
                              </div>

                              <div className="flex items-center justify-between px-1 my-1">
                                <div className="flex flex-col gap-1">
                                  {[1, 2, 3, 4].map((led) => (
                                    <div key={led} className="flex items-center gap-1">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" />
                                      <span className="text-[7px] font-mono text-slate-400">L{led}</span>
                                    </div>
                                  ))}
                                </div>
                                <div className="flex flex-col gap-1 bg-[#0B1119] p-1 rounded border border-[#334155]">
                                  {[1, 2, 3].map((p) => (
                                    <div
                                      key={p}
                                      className="w-4 h-3 rounded-[1px] bg-[#1E293B] border border-[#64748B] flex items-center justify-center"
                                    >
                                      <div className="w-2 h-1.5 bg-[#EAB308]" />
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="text-[7.5px] font-mono text-slate-400 text-center">
                                IEC 62439-3 Plane B
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSelectDevice('CLK-PTP-GM', true)}
                        className={`cursor-pointer rounded-md bg-gradient-to-b from-[#7E8C9F] via-[#596678] to-[#3B4656] border-2 p-2 shadow-lg flex items-center justify-between gap-2 transition ${
                          selectedDeviceKey === 'CLK-PTP-GM'
                            ? 'border-[#00F0FF] ring-2 ring-[#00CFFF]/50'
                            : 'border-[#94A3B8] hover:border-[#FACC15]'
                        }`}
                      >
                        <div className="flex items-center gap-2 bg-[#0F172A] px-2 py-1 rounded border border-[#475569]">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              timeSyncFailActive ? 'bg-[#FF5C65] animate-ping' : 'bg-[#22C55E] shadow-[0_0_5px_#22C55E]'
                            }`}
                          />
                          <div className="text-left">
                            <div className="text-[10px] font-black text-white leading-tight">
                              Meinberg PTP GM / Bus B
                            </div>
                            <div className="text-[8.5px] font-mono text-[#FDE047] leading-tight">
                              IEEE 1588v2 • 192.168.10.100
                            </div>
                          </div>
                        </div>

                        <div className="flex-1 h-7 rounded bg-[#090E17] border border-[#334155] px-2 flex items-center justify-around">
                          {Array.from({ length: 12 }).map((_, k) => (
                            <div key={k} className="w-1 h-4 rounded-sm bg-[#1E293B]" />
                          ))}
                        </div>
                      </div>

                      <svg
                        viewBox="0 0 360 405"
                        className="pointer-events-none absolute inset-0 w-full h-full z-20"
                        preserveAspectRatio="none"
                      >
                        <PatchCordPath
                          id="CORD-B-1"
                          d="M 96 164 C 96 184, 142 184, 142 204"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[0])}
                          selected={selectedSwitchPlane === 'LAN_B' && selectedPortNumber === 1}
                          highlighted={selectedDeviceKey === 'IED-132-BC' || selectedVlan === 20}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_B')}
                          duration={packetDuration}
                          delay={0.15}
                        />
                        <PatchCordPath
                          id="CORD-B-2"
                          d="M 258 164 C 258 184, 166 184, 166 204"
                          plane="LAN_A"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[1])}
                          selected={selectedSwitchPlane === 'LAN_B' && selectedPortNumber === 2}
                          highlighted={selectedDeviceKey === 'IED-33-F02' || selectedVlan === 20}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_B')}
                          duration={packetDuration}
                          delay={0.4}
                        />
                        <PatchCordPath
                          id="CORD-B-4"
                          d="M 210 220 C 210 248, 108 248, 108 278"
                          plane="LAN_B"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[3])}
                          selected={selectedSwitchPlane === 'LAN_B' && selectedPortNumber === 4}
                          highlighted={selectedDeviceKey === 'SRV-SCADA-A' || selectedVlan === 10}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_B')}
                          duration={packetDuration}
                          delay={0.25}
                        />
                        <PatchCordPath
                          id="CORD-B-5"
                          d="M 232 220 C 232 248, 212 248, 212 278"
                          plane="LAN_B"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[4])}
                          selected={selectedSwitchPlane === 'LAN_B' && selectedPortNumber === 5}
                          highlighted={selectedDeviceKey === 'WS-HMI-01' || selectedVlan === 10}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_B')}
                          duration={packetDuration}
                          delay={0.55}
                        />
                        <PatchCordPath
                          id="CORD-B-7"
                          d="M 278 220 C 290 248, 312 248, 312 278"
                          plane="LAN_B"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[6])}
                          selected={selectedSwitchPlane === 'LAN_B' && selectedPortNumber === 7}
                          highlighted={selectedVlan === 10 || selectedVlan === 40}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_B')}
                          duration={packetDuration}
                          delay={0.75}
                        />
                        <PatchCordPath
                          id="CORD-B-BOT-1"
                          d="M 108 322 C 108 354, 195 358, 195 372"
                          plane="LAN_B"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[5])}
                          selected={selectedSwitchPlane === 'LAN_B' && selectedPortNumber === 6}
                          highlighted={selectedDeviceKey === 'CLK-PTP-GM'}
                          packetActive={packetsPlaying}
                          packetColor={activePacketColor('LAN_B')}
                          duration={packetDuration}
                          delay={0.3}
                        />
                        <PatchCordPath
                          id="CORD-B-BOT-2"
                          d="M 212 322 C 212 354, 242 358, 242 372"
                          plane="LAN_B"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[7])}
                          selected={selectedSwitchPlane === 'LAN_B' && selectedPortNumber === 8}
                          highlighted={selectedDeviceKey === 'CLK-PTP-GM' || selectedVlan === 40}
                          packetActive={packetsPlaying}
                          packetColor="#FFB547"
                          duration={packetDuration}
                          delay={0.5}
                        />
                        <PatchCordPath
                          id="CORD-B-BOT-3"
                          d="M 312 322 C 312 354, 325 358, 342 365"
                          plane="LAN_B"
                          status={getEffectivePortStatus(RSP35_PORTS_LAN_B[7])}
                          selected={false}
                          highlighted={selectedDeviceKey === 'CLK-PTP-GM'}
                          packetActive={packetsPlaying}
                          packetColor="#FFB547"
                          duration={packetDuration}
                          delay={0.65}
                        />
                      </svg>
                    </div>

                    <div className="h-4 bg-[#050A12] border-t border-[#1E3A5F] flex items-center justify-around px-12">
                      <div className="w-16 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_16px_4px_rgba(0,207,255,0.85)]" />
                      <div className="w-16 h-1.5 rounded-full bg-[#00F0FF] shadow-[0_0_16px_4px_rgba(0,207,255,0.85)]" />
                    </div>
                  </div>

                  {showCrossRackPrp && (
                    <svg
                      viewBox="0 0 780 470"
                      className="pointer-events-none absolute inset-0 w-full h-full z-30"
                      preserveAspectRatio="none"
                    >
                      <PatchCordPath
                        id="CROSS-SIEMENS-B"
                        d="M 135 182 C 260 212, 470 205, 585 228"
                        plane="CROSS_B"
                        status={planeBHealthy && !iedCommLossActive ? 'UP' : 'DOWN'}
                        selected={false}
                        highlighted={true}
                        packetActive={packetsPlaying}
                        packetColor="#FACC15"
                        duration={packetDuration * 1.15}
                        dashed={true}
                      />
                      <PatchCordPath
                        id="CROSS-ABB-B"
                        d="M 300 182 C 390 210, 500 205, 605 228"
                        plane="CROSS_B"
                        status={planeBHealthy ? 'UP' : 'DOWN'}
                        selected={false}
                        highlighted={true}
                        packetActive={packetsPlaying}
                        packetColor="#FACC15"
                        duration={packetDuration * 1.15}
                        delay={0.3}
                        dashed={true}
                      />
                      <PatchCordPath
                        id="CROSS-SCHNEIDER-A"
                        d="M 485 182 C 380 210, 290 205, 210 228"
                        plane="CROSS_A"
                        status={planeAHealthy ? 'UP' : 'DOWN'}
                        selected={false}
                        highlighted={true}
                        packetActive={packetsPlaying}
                        packetColor="#00E5FF"
                        duration={packetDuration * 1.15}
                        delay={0.2}
                        dashed={true}
                      />
                      <PatchCordPath
                        id="CROSS-GE-A"
                        d="M 650 182 C 510 215, 330 208, 225 228"
                        plane="CROSS_A"
                        status={planeAHealthy ? 'UP' : 'DOWN'}
                        selected={false}
                        highlighted={true}
                        packetActive={packetsPlaying}
                        packetColor="#00E5FF"
                        duration={packetDuration * 1.15}
                        delay={0.45}
                        dashed={true}
                      />
                    </svg>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: NETWORK TOPOLOGY (EXACT IMAGE 1 VISUAL DESIGN + CLICKABLE P1-P8 PORT LOGIC) */}
          {activeView === 'TOPOLOGY' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-3 space-y-2 shadow-[0_14px_38px_rgba(0,0,0,0.78)]">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#15314E] pb-2">
                <div>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    IEC 61850 Station-Bus Logical &amp; Physical Network Topology
                  </h2>
                  <p className="text-xs text-[#8BB3D4]">
                    Dual-Attached Nodes (DANP) connected to independent Hirschmann RSP35 Core Switches (LAN A &amp; LAN B). Click any device, cable, or switch port (P1–P8).
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2.5 py-0.5 rounded bg-[#082742] border border-[#168BFF] text-[#77E7FF] font-mono font-bold">
                    LAN A: 192.168.10.0/24
                  </span>
                  <span className="px-2.5 py-0.5 rounded bg-[#362807] border border-[#FFC400] text-[#FDE047] font-mono font-bold">
                    LAN B: 192.168.20.0/24
                  </span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <svg
                  viewBox="0 0 1024 565"
                  className="w-full h-auto min-w-[780px] select-none rounded-lg block"
                  style={{
                    background:
                      'radial-gradient(ellipse at 50% 48%, #0E2341 0%, #071324 58%, #030914 100%)',
                  }}
                >
                  <defs>
                    <linearGradient id="img1CardBg" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#0D1E34" />
                      <stop offset="100%" stopColor="#071220" />
                    </linearGradient>
                    <linearGradient id="img1SwitchBgA" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#0C2648" />
                      <stop offset="55%" stopColor="#081B34" />
                      <stop offset="100%" stopColor="#061224" />
                    </linearGradient>
                    <linearGradient id="img1SwitchBgB" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#142238" />
                      <stop offset="55%" stopColor="#0B1628" />
                      <stop offset="100%" stopColor="#060D1A" />
                    </linearGradient>
                    <filter id="img1BlueGlow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="1100" height="640">
                      <feGaussianBlur stdDeviation="3.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="img1GoldGlow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="1100" height="640">
                      <feGaussianBlur stdDeviation="3.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {(() => {
                    // Exact coordinates matching Image 1 (1024 x 565)
                    // Top Row 4 Station Devices (y = 20..120, height = 100):
                    // 1. SCADA Server A: x = 14..254 (w=240, cx=134), ETH-A=(172, 120), ETH-B=(202, 120) -> P1
                    // 2. Operator HMI WS: x = 272..508 (w=236, cx=390), ETH-A=(352, 120), ETH-B=(376, 120) -> P2
                    // 3. Station Gateway: x = 524..756 (w=232, cx=640), ETH-A=(604, 120), ETH-B=(630, 120) -> P3
                    // 4. Time Server (PTP): x = 772..1008 (w=236, cx=890), ETH-A=(852, 120), ETH-B=(882, 120) -> P4
                    const topDevices = [
                      {
                        id: 'SRV-SCADA-A',
                        title: 'SCADA Server A',
                        ip: '192.168.10.10',
                        hwModel: 'Dell PowerEdge R750',
                        role: '(MMS Client / Historian – DANP)',
                        img: TOPO_EXACT_IMAGES.DELL_R750,
                        imgBox: { x: 22, y: 50, w: 108, h: 38 },
                        cardBox: { x: 14, y: 20, w: 242, h: 100 },
                        textX: 185,
                        ethAX: 175,
                        ethBX: 204,
                        portNum: 1, // P1 on LAN A & LAN B
                        protoType: 'MMS' as const,
                      },
                      {
                        id: 'WS-HMI-01',
                        title: 'Operator HMI WS',
                        ip: '192.168.10.20',
                        hwModel: 'Dell OptiPlex 7000',
                        role: '(Dual-Screen Console – DANP)',
                        img: TOPO_EXACT_IMAGES.HMI_DUAL,
                        imgBox: { x: 280, y: 32, w: 98, h: 74 },
                        cardBox: { x: 270, y: 20, w: 238, h: 100 },
                        textX: 440,
                        ethAX: 350,
                        ethBX: 374,
                        portNum: 2, // P2 on LAN A & LAN B
                        protoType: 'MMS' as const,
                      },
                      {
                        id: 'GTW-RCC-01',
                        title: 'Station Gateway',
                        ip: '192.168.10.30',
                        hwModel: 'Moxa MGate 5216',
                        role: '(IEC 61850 ↔ IEC 104)',
                        img: TOPO_EXACT_IMAGES.MOXA_MGATE,
                        imgBox: { x: 534, y: 26, w: 84, h: 86 },
                        cardBox: { x: 522, y: 20, w: 236, h: 100 },
                        textX: 686,
                        ethAX: 604,
                        ethBX: 630,
                        portNum: 3, // P3 on LAN A & LAN B
                        protoType: 'MMS' as const,
                      },
                      {
                        id: 'CLK-PTP-GM',
                        title: 'Time Server (PTP)',
                        ip: '192.168.10.100',
                        hwModel: 'Meinberg LANTIME M400',
                        role: '(IEEE 1588v2 GM)',
                        img: TOPO_EXACT_IMAGES.MEINBERG_M400,
                        imgBox: { x: 778, y: 50, w: 104, h: 34 },
                        cardBox: { x: 772, y: 20, w: 238, h: 100 },
                        textX: 944,
                        ethAX: 852,
                        ethBX: 882,
                        portNum: 4, // P4 on LAN A & LAN B
                        protoType: 'PTP' as const,
                      },
                    ];

                    // Middle Row Switches:
                    // Left Switch (LAN A): x = 72, y = 200, w = 422, h = 96
                    // Right Switch (LAN B): x = 522, y = 200, w = 422, h = 96
                    // Top port anchors P1..P4 on LAN A: x = 278, 286, 294, 302 at y = 200
                    // Top port anchors P1..P4 on LAN B: x = 688, 696, 704, 712 at y = 200
                    // Bottom port anchors P5..P8 on LAN A: x = 278, 286, 294, 302 at y = 296
                    // Bottom port anchors P5..P8 on LAN B: x = 696, 704, 712, 720 at y = 296
                    const swATopPortX = (pNum: number) => 96 + (pNum - 1) * 27;
                    const swBTopPortX = (pNum: number) => 546 + (pNum - 1) * 27;
                    const swABotPortX = (pNum: number) => 96 + (pNum - 5) * 27;
                    const swBBotPortX = (pNum: number) => 546 + (pNum - 5) * 27;

                    // Bottom Row 4 Protection IEDs (y = 374..528, height = 154):
                    // 1. Siemens SIPROTEC 5: x = 14..252 (w=238), ETH-A=(108, 374), ETH-B=(132, 374) -> P5
                    // 2. ABB Relion REF615: x = 268..504 (w=236), ETH-A=(352, 374), ETH-B=(388, 374) -> P6
                    // 3. Schneider MiCOM C264: x = 520..756 (w=236), ETH-A=(594, 374), ETH-B=(618, 374) -> P7
                    // 4. GE Multilin 850: x = 772..1008 (w=236), ETH-A=(852, 374), ETH-B=(882, 374) -> P8
                    const bottomIeds = [
                      {
                        ied: rackIedSiemens,
                        id: 'IED-33-F03',
                        label: 'Siemens SIPROTEC 5',
                        sub: '7SJ85 (Feeder Prot)',
                        ip: '192.168.10.11',
                        vlanText: 'VLAN 20 • GOOSE/MMS',
                        img: TOPO_EXACT_IMAGES.SIEMENS_7SJ85,
                        imgBox: { x: 24, y: 388, w: 96, h: 128 },
                        cardBox: { x: 14, y: 374, w: 238, h: 154 },
                        textX: 184,
                        ethAX: 108,
                        ethBX: 132,
                        portNum: 5, // P5 on LAN A & LAN B
                      },
                      {
                        ied: rackIedAbb,
                        id: 'IED-11-F01',
                        label: 'ABB Relion REF615',
                        sub: 'REF615 (Feeder Prot)',
                        ip: '192.168.10.12',
                        vlanText: 'VLAN 20 • GOOSE/MMS',
                        img: TOPO_EXACT_IMAGES.ABB_REF615,
                        imgBox: { x: 278, y: 388, w: 98, h: 128 },
                        cardBox: { x: 268, y: 374, w: 236, h: 154 },
                        textX: 440,
                        ethAX: 350,
                        ethBX: 388,
                        portNum: 6, // P6 on LAN A & LAN B
                      },
                      {
                        ied: rackIedSchneider,
                        id: 'IED-132-BC',
                        label: 'Schneider MiCOM C264',
                        sub: 'C264 (Bay Control / GTW)',
                        ip: '192.168.10.13',
                        vlanText: 'VLAN 20 • GOOSE/MMS',
                        img: TOPO_EXACT_IMAGES.SCHNEIDER_C264,
                        imgBox: { x: 528, y: 396, w: 102, h: 112 },
                        cardBox: { x: 520, y: 374, w: 236, h: 154 },
                        textX: 692,
                        ethAX: 594,
                        ethBX: 618,
                        portNum: 7, // P7 on LAN A & LAN B
                      },
                      {
                        ied: rackIedGe,
                        id: 'IED-33-F02',
                        label: 'GE Multilin 850',
                        sub: '850 (Feeder Protection)',
                        ip: '192.168.10.14',
                        vlanText: 'VLAN 20 • GOOSE/MMS',
                        img: TOPO_EXACT_IMAGES.GE_850,
                        imgBox: { x: 780, y: 388, w: 98, h: 128 },
                        cardBox: { x: 772, y: 374, w: 236, h: 154 },
                        textX: 942,
                        ethAX: 852,
                        ethBX: 882,
                        portNum: 8, // P8 on LAN A & LAN B
                      },
                    ];

                    const shouldAnimatePort = (portCfg: SwitchPortConfig, devProto: 'MMS' | 'GOOSE' | 'PTP') => {
                      if (!packetsPlaying) return false;
                      if (selectedVlan !== null && !portCfg.allowedVlans.includes(selectedVlan)) return false;
                      if (trafficFilter === 'ALL') return true;
                      if (trafficFilter === 'PTP') return devProto === 'PTP' || portCfg.allowedVlans.includes(40);
                      if (trafficFilter === 'GOOSE') return portCfg.allowedVlans.includes(20) && portCfg.portNumber >= 5;
                      if (trafficFilter === 'MMS') return portCfg.allowedVlans.includes(10);
                      return true;
                    };

                    // Render smooth glowing cable matching Image 1 (#168BFF for LAN A, #FFC400 for LAN B)
                    const renderImage1Cable = (
                      id: string,
                      d: string,
                      plane: 'LAN_A' | 'LAN_B',
                      status: 'UP' | 'DOWN' | 'DISCONNECTED',
                      selected: boolean,
                      highlighted: boolean,
                      animate: boolean,
                      delay: number,
                      onClick: () => void
                    ) => {
                      const strokeCol =
                        status === 'DISCONNECTED'
                          ? '#475569'
                          : status === 'DOWN'
                          ? '#FF5C65'
                          : plane === 'LAN_A'
                          ? '#168BFF'
                          : '#FFC400';
                      const coreCol =
                        status === 'DISCONNECTED'
                          ? '#64748B'
                          : status === 'DOWN'
                          ? '#FDA4AF'
                          : plane === 'LAN_A'
                          ? '#5CE1FF'
                          : '#FFF078';
                      const dotCol = plane === 'LAN_A' ? '#00E5FF' : '#FFE033';

                      return (
                        <g key={id} className="cursor-pointer" onClick={onClick}>
                          {/* Subtle outer glow matching Image 1 */}
                          {status === 'UP' && (
                            <path
                              d={d}
                              fill="none"
                              stroke={strokeCol}
                              strokeWidth={selected || highlighted ? 9 : 6.5}
                              strokeLinecap="round"
                              opacity={selected || highlighted ? 0.38 : 0.22}
                            />
                          )}
                          {/* Main cable body */}
                          <path
                            d={d}
                            fill="none"
                            stroke={strokeCol}
                            strokeWidth={selected || highlighted ? 4.4 : 3.5}
                            strokeLinecap="round"
                            strokeDasharray={status === 'DISCONNECTED' ? '6 5' : undefined}
                          />
                          {/* Crisp inner highlight filament */}
                          <path
                            d={d}
                            fill="none"
                            stroke={coreCol}
                            strokeWidth={1.1}
                            strokeLinecap="round"
                            opacity={status === 'DISCONNECTED' ? 0.35 : 0.85}
                            strokeDasharray={status === 'DISCONNECTED' ? '6 5' : undefined}
                          />
                          {/* Wide transparent hit area */}
                          <path d={d} fill="none" stroke="transparent" strokeWidth={14} />

                          {/* Animated glowing packet indicator matching Image 1 */}
                          {animate && status === 'UP' && (
                            <g pointerEvents="none">
                              <circle r={6} fill={dotCol} opacity={0.35}>
                                <animateMotion
                                  path={d}
                                  dur={`${packetDuration}s`}
                                  begin={`${delay}s`}
                                  repeatCount="indefinite"
                                />
                              </circle>
                              <circle r={3.6} fill={dotCol} stroke="#FFFFFF" strokeWidth={1.1}>
                                <animateMotion
                                  path={d}
                                  dur={`${packetDuration}s`}
                                  begin={`${delay}s`}
                                  repeatCount="indefinite"
                                />
                              </circle>
                            </g>
                          )}
                        </g>
                      );
                    };

                    return (
                      <>
                        {/* ==================== 1. SMOOTH CURVED CABLES: TOP 4 DEVICES -> SWITCHES A & B (P1..P4) ==================== */}
                        {topDevices.map((st, idx) => {
                          const portA = RSP35_PORTS_LAN_A[st.portNum - 1];
                          const portB = RSP35_PORTS_LAN_B[st.portNum - 1];
                          const statusA = getEffectivePortStatus(portA);
                          const statusB = getEffectivePortStatus(portB);
                          const dstAX = swATopPortX(st.portNum);
                          const dstBX = swBTopPortX(st.portNum);

                          const pathA = `M ${(st.imgBox.x + st.imgBox.w * 0.35)} ${st.imgBox.y + st.imgBox.h} C ${(st.imgBox.x + st.imgBox.w * 0.35)} 162, ${dstAX} 158, ${dstAX} 212`;
                          const pathB = `M ${(st.imgBox.x + st.imgBox.w * 0.70)} ${st.imgBox.y + st.imgBox.h} C ${(st.imgBox.x + st.imgBox.w * 0.70)} 168, ${dstBX} 162, ${dstBX} 212`;

                          const selA =
                            selectedDeviceKey === st.id ||
                            (selectedSwitchPlane === 'LAN_A' && selectedPortNumber === st.portNum);
                          const selB =
                            selectedDeviceKey === st.id ||
                            (selectedSwitchPlane === 'LAN_B' && selectedPortNumber === st.portNum);

                          return (
                            <g key={`TOP-CABLE-GRP-${st.id}`}>
                              {renderImage1Cable(
                                `IMG1-TOP-A-${st.id}`,
                                pathA,
                                'LAN_A',
                                statusA,
                                selA,
                                selA || (selectedVlan !== null && portA.allowedVlans.includes(selectedVlan)),
                                shouldAnimatePort(portA, st.protoType),
                                idx * 0.22,
                                () => {
                                  setSelectedSwitchPlane('LAN_A');
                                  setSelectedPortNumber(st.portNum);
                                  setSelectedDeviceKey(st.id);
                                }
                              )}
                              {renderImage1Cable(
                                `IMG1-TOP-B-${st.id}`,
                                pathB,
                                'LAN_B',
                                statusB,
                                selB,
                                selB || (selectedVlan !== null && portB.allowedVlans.includes(selectedVlan)),
                                shouldAnimatePort(portB, st.protoType),
                                idx * 0.22 + 0.35,
                                () => {
                                  setSelectedSwitchPlane('LAN_B');
                                  setSelectedPortNumber(st.portNum);
                                  setSelectedDeviceKey(st.id);
                                }
                              )}
                            </g>
                          );
                        })}

                        {/* ==================== 2. SMOOTH CURVED CABLES: SWITCHES A & B (P5..P8) -> BOTTOM 4 IEDS ==================== */}
                        {bottomIeds.map((item, idx) => {
                          const portA = RSP35_PORTS_LAN_A[item.portNum - 1];
                          const portB = RSP35_PORTS_LAN_B[item.portNum - 1];
                          const statusA = getEffectivePortStatus(portA);
                          const statusB = getEffectivePortStatus(portB);
                          const srcAX = swABotPortX(item.portNum);
                          const srcBX = swBBotPortX(item.portNum);

                          const pathA = `M ${srcAX} 284 C ${srcAX} 338, ${(item.imgBox.x + item.imgBox.w * 0.35)} 332, ${(item.imgBox.x + item.imgBox.w * 0.35)} ${item.imgBox.y}`;
                          const pathB = `M ${srcBX} 284 C ${srcBX} 342, ${(item.imgBox.x + item.imgBox.w * 0.70)} 336, ${(item.imgBox.x + item.imgBox.w * 0.70)} ${item.imgBox.y}`;

                          const selA =
                            selectedDeviceKey === item.id ||
                            (selectedSwitchPlane === 'LAN_A' && selectedPortNumber === item.portNum);
                          const selB =
                            selectedDeviceKey === item.id ||
                            (selectedSwitchPlane === 'LAN_B' && selectedPortNumber === item.portNum);

                          return (
                            <g key={`BOT-CABLE-GRP-${item.id}`}>
                              {renderImage1Cable(
                                `IMG1-BOT-A-${item.id}`,
                                pathA,
                                'LAN_A',
                                statusA,
                                selA,
                                selA || (selectedVlan !== null && portA.allowedVlans.includes(selectedVlan)),
                                shouldAnimatePort(portA, 'GOOSE'),
                                idx * 0.25,
                                () => {
                                  setSelectedSwitchPlane('LAN_A');
                                  setSelectedPortNumber(item.portNum);
                                  setSelectedDeviceKey(item.id);
                                }
                              )}
                              {renderImage1Cable(
                                `IMG1-BOT-B-${item.id}`,
                                pathB,
                                'LAN_B',
                                statusB,
                                selB,
                                selB || (selectedVlan !== null && portB.allowedVlans.includes(selectedVlan)),
                                shouldAnimatePort(portB, 'GOOSE'),
                                idx * 0.25 + 0.38,
                                () => {
                                  setSelectedSwitchPlane('LAN_B');
                                  setSelectedPortNumber(item.portNum);
                                  setSelectedDeviceKey(item.id);
                                }
                              )}
                            </g>
                          );
                        })}

                        {/* ==================== 3. TOP ROW: 4 STATION DEVICE CARDS (MATCHING IMAGE 1) ==================== */}
                        {topDevices.map((st) => {
                          const portA = RSP35_PORTS_LAN_A[st.portNum - 1];
                          const portB = RSP35_PORTS_LAN_B[st.portNum - 1];
                          const statusA = getEffectivePortStatus(portA);
                          const statusB = getEffectivePortStatus(portB);
                          const upA = statusA === 'UP';
                          const upB = statusB === 'UP';
                          const isSelected = selectedDeviceKey === st.id;

                          const statusLabel =
                            st.id === 'CLK-PTP-GM'
                              ? timeSyncFailActive
                                ? '● HOLDOVER / UNSYNCED'
                                : !upA && !upB
                                ? '● OFFLINE'
                                : '● SYNC LOCKED'
                              : upA && upB
                              ? '● ONLINE (LAN A/B)'
                              : upA
                              ? '● ONLINE (LAN A ONLY)'
                              : upB
                              ? '● ONLINE (LAN B ONLY)'
                              : '● OFFLINE (COMM LOSS)';

                          const statusColor =
                            (st.id === 'CLK-PTP-GM' && timeSyncFailActive) || (!upA && !upB)
                              ? '#FF5C65'
                              : upA && upB
                              ? '#22C55E'
                              : '#FFC400';

                          return (
                            <g key={st.id}>
                              <g
                                className="cursor-pointer"
                                onClick={() => handleSelectDevice(st.id, true)}
                              >
                                
                                <image
                                  href={st.img}
                                  x={st.imgBox.x}
                                  y={st.imgBox.y}
                                  width={st.imgBox.w}
                                  height={st.imgBox.h}
                                  preserveAspectRatio="xMidYMid meet"
                                />
                                <text
                                  x={st.textX}
                                  y={39}
                                  textAnchor="middle"
                                  fill="#FFFFFF"
                                  fontSize="13.5"
                                  fontWeight="bold"
                                >
                                  {st.title}
                                </text>
                                <text
                                  x={st.textX}
                                  y={57}
                                  textAnchor="middle"
                                  fill="#00D2FF"
                                  fontSize="12"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {st.ip}
                                </text>
                                <text
                                  x={st.textX}
                                  y={73}
                                  textAnchor="middle"
                                  fill="#E2F1FF"
                                  fontSize="10"
                                  fontWeight="600"
                                >
                                  {st.hwModel}
                                </text>
                                <text
                                  x={st.textX}
                                  y={87}
                                  textAnchor="middle"
                                  fill="#9CC2E3"
                                  fontSize="9"
                                >
                                  {st.role}
                                </text>
                                <text
                                  x={st.textX}
                                  y={106}
                                  textAnchor="middle"
                                  fill={statusColor}
                                  fontSize="11"
                                  fontWeight="bold"
                                >
                                  {statusLabel}
                                </text>
                              </g>

                              {/* Visible ETH-A & ETH-B Port Anchors on Card Edge */}
                              <g
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedSwitchPlane('LAN_A');
                                  setSelectedPortNumber(st.portNum);
                                }}
                              >
                                <title>{`${st.title} ETH-A → LAN A Switch P${st.portNum} (${portA.portId})`}</title>
                                <g><rect x={(st.imgBox.x + st.imgBox.w * 0.35) - 5} y={st.imgBox.y + st.imgBox.h - 4} width={10} height={8} rx={1} fill="#07111F" stroke={upA ? '#168BFF' : '#FF5C65'} strokeWidth={1.5}/><text x={(st.imgBox.x + st.imgBox.w * 0.35)} y={st.imgBox.y + st.imgBox.h + (12)} textAnchor="middle" fontSize="8" fontWeight="bold" fill={upA ? '#168BFF' : '#FF5C65'}>ETH-A</text></g>
                              </g>
                              <g
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedSwitchPlane('LAN_B');
                                  setSelectedPortNumber(st.portNum);
                                }}
                              >
                                <title>{`${st.title} ETH-B → LAN B Switch P${st.portNum} (${portB.portId})`}</title>
                                <g><rect x={(st.imgBox.x + st.imgBox.w * 0.70) - 5} y={st.imgBox.y + st.imgBox.h - 4} width={10} height={8} rx={1} fill="#07111F" stroke={upB ? '#FFC400' : '#FF5C65'} strokeWidth={1.5}/><text x={(st.imgBox.x + st.imgBox.w * 0.70)} y={st.imgBox.y + st.imgBox.h + (12)} textAnchor="middle" fontSize="8" fontWeight="bold" fill={upB ? '#FFC400' : '#FF5C65'}>ETH-B</text></g>
                              </g>
                            </g>
                          );
                        })}

                        {/* ==================== 4. MIDDLE ROW: TWO REALISTIC HIRSCHMANN RSP35 SWITCHES (MATCHING IMAGE 1) ==================== */}
                        {[
                          {
                            plane: 'LAN_A' as const,
                            switchId: 'SW-LAN-A1',
                            x: 72,
                            y: 200,
                            w: 422,
                            h: 96,
                            title: 'HIRSCHMANN RSP35 — LAN A (PRP)',
                            ipText: '192.168.10.2',
                            vlanText: '•   VLAN 10/20/30/40   •   RSTP Root',
                            healthyText: `● HEALTHY — ${getPortOverride('Gi1/1').packetLossPercent}% PACKET LOSS (RTT ${liveMetrics.rttLanA})`,
                            faultText: '● FAULTED — LAN A SWITCH OUTAGE (FAILOVER TO LAN B)',
                            isHealthy: planeAHealthy,
                            borderCol: lanAFaultActive ? '#FF5C65' : '#00D9FF',
                            glowFilter: lanAFaultActive ? undefined : 'url(#img1BlueGlow)',
                            bgGrad: 'url(#img1SwitchBgA)',
                            ports: RSP35_PORTS_LAN_A,
                            topPortXFn: swATopPortX,
                            botPortXFn: swABotPortX,
                          },
                          {
                            plane: 'LAN_B' as const,
                            switchId: 'SW-LAN-B1',
                            x: 522,
                            y: 200,
                            w: 422,
                            h: 96,
                            title: 'HIRSCHMANN RSP35 — LAN B (PRP)',
                            ipText: '192.168.20.2',
                            vlanText: '•   VLAN 10/20/30/40   •   Isolated Plane B',
                            healthyText: `● HEALTHY — ${getPortOverride('Gi2/1').packetLossPercent}% PACKET LOSS (RTT ${liveMetrics.rttLanB})`,
                            faultText: '● FAULTED — LAN B SWITCH OUTAGE (FAILOVER TO LAN A)',
                            isHealthy: planeBHealthy,
                            borderCol: lanBFaultActive ? '#FF5C65' : '#FFC400',
                            glowFilter: lanBFaultActive ? undefined : 'url(#img1GoldGlow)',
                            bgGrad: 'url(#img1SwitchBgB)',
                            ports: RSP35_PORTS_LAN_B,
                            topPortXFn: swBTopPortX,
                            botPortXFn: swBBotPortX,
                          },
                        ].map((sw) => (
                          <g key={sw.switchId}>
                            {/* Switch Card Outer Box with Neon Cyan / Gold Border */}
                            

                            {/* Realistic Hirschmann RSP35 Photograph from Image 1 */}
                            <image
                              href={TOPO_EXACT_IMAGES.HIRSCHMANN_RSP35}
                              x={sw.x + 8}
                              y={sw.y + 12}
                              width={126}
                              height={72}
                              preserveAspectRatio="xMidYMid meet"
                              className="cursor-pointer"
                              onClick={() => setSelectedSwitchPlane(sw.plane)}
                            />

                            {/* Switch Title, IP/VLAN Line, and Healthy/Fault Status Line (matching Image 1) */}
                            <text
                              x={sw.x + 275}
                              y={sw.y + 26}
                              textAnchor="middle"
                              fill="#FFFFFF"
                              fontSize="14.5"
                              fontWeight="bold"
                            >
                              {sw.title}
                            </text>

                            {sw.plane === 'LAN_A' ? (
                              <text
                                x={sw.x + 275}
                                y={sw.y + 46}
                                textAnchor="middle"
                                fill="#D8ECFF"
                                fontSize="11"
                              >
                                <tspan fontFamily="monospace" fontWeight="bold" fill="#FFFFFF">
                                  192.168.10.2
                                </tspan>
                                <tspan>   •   VLAN 10/20/30/40   •   RSTP Root</tspan>
                              </text>
                            ) : (
                              <text
                                x={sw.x + 275}
                                y={sw.y + 46}
                                textAnchor="middle"
                                fill="#D8ECFF"
                                fontSize="11"
                              >
                                <tspan fontFamily="monospace" fontWeight="bold" fill="#FFC400">
                                  192.168.20.2
                                </tspan>
                                <tspan>   •   VLAN 10/20/30/40   •   </tspan>
                                <tspan fill="#FFC400" fontWeight="bold">
                                  Isolated Plane B
                                </tspan>
                              </text>
                            )}

                            <text
                              x={sw.x + 275}
                              y={sw.y + 67}
                              textAnchor="middle"
                              fill={sw.isHealthy ? '#22C55E' : '#FF5C65'}
                              fontSize="11.5"
                              fontWeight="bold"
                            >
                              {sw.isHealthy ? sw.healthyText : sw.faultText}
                            </text>

                            {/* Interactive Clickable P1–P8 Port Bar with Link LEDs inside the bottom of the switch card */}
                            <g transform={`translate(${sw.x + 150}, ${sw.y + 74})`}>
                              {sw.ports.map((port, pIdx) => {
                                const st = getEffectivePortStatus(port);
                                const isSel =
                                  selectedSwitchPlane === sw.plane &&
                                  selectedPortNumber === port.portNumber;
                                return (
                                  <g
                                    key={port.portId}
                                    transform={`translate(${pIdx * 31}, 0)`}
                                    className="cursor-pointer"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSwitchPlane(sw.plane);
                                      setSelectedPortNumber(port.portNumber);
                                      setSelectedDeviceKey(port.connectedDeviceId);
                                    }}
                                  >
                                    <title>{`${port.switchName} Port P${port.portNumber} (${port.portId}) ↔ ${port.connectedDeviceName} [${port.remotePort}] — Status: ${st}`}</title>
                                    <rect
                                      x={0}
                                      y={0}
                                      width={28}
                                      height={16}
                                      rx={3}
                                      fill={isSel ? '#0F385C' : '#050E1C'}
                                      stroke={
                                        isSel
                                          ? '#00E5FF'
                                          : st === 'DOWN'
                                          ? '#FF5C65'
                                          : '#264566'
                                      }
                                      strokeWidth={isSel ? 1.5 : 0.9}
                                    />
                                    <circle
                                      cx={6}
                                      cy={8}
                                      r={2.2}
                                      fill={
                                        st === 'UP'
                                          ? '#22C55E'
                                          : st === 'DOWN'
                                          ? '#FF5C65'
                                          : '#64748B'
                                      }
                                    />
                                    <text
                                      x={17}
                                      y={11}
                                      textAnchor="middle"
                                      fill={isSel ? '#00E5FF' : '#CFE6FF'}
                                      fontSize="8"
                                      fontFamily="monospace"
                                      fontWeight="bold"
                                    >
                                      P{port.portNumber}
                                    </text>
                                  </g>
                                );
                              })}
                            </g>

                            {/* Visible Physical Cable Termination Anchors on Top (P1..P4) and Bottom (P5..P8) of Switch */}
                            {sw.ports.map((port) => {
                              const isTop = port.portNumber <= 4;
                              const ax = isTop
                                ? sw.topPortXFn(port.portNumber)
                                : sw.botPortXFn(port.portNumber);
                              const ay = isTop ? sw.y + 12 : sw.y + 84;
                              const st = getEffectivePortStatus(port);
                              return (
                                <rect
                                  key={`ANCHOR-${port.portId}`}
                                  x={ax - 5}
                                  y={ay - 4}
                                  width={10}
                                  height={8}
                                  rx={1}
                                  stroke="#FFFFFF"
                                  strokeWidth={0.8}
                                  fill={
                                    st === 'UP'
                                      ? sw.plane === 'LAN_A'
                                        ? '#00E5FF'
                                        : '#FFC400'
                                      : '#FF5C65'
                                  }
                                  className="cursor-pointer"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedSwitchPlane(sw.plane);
                                    setSelectedPortNumber(port.portNumber);
                                    setSelectedDeviceKey(port.connectedDeviceId);
                                  }}
                                >
                                  <title>{`${port.portId} (P${port.portNumber}): ${port.connectedDeviceName}`}</title>
                                </rect>
                              );
                            })}
                          </g>
                        ))}

                        {/* ==================== 5. BOTTOM ROW: 4 MULTI-VENDOR PROTECTION IED CARDS (MATCHING IMAGE 1) ==================== */}
                        {bottomIeds.map((item) => {
                          const portA = RSP35_PORTS_LAN_A[item.portNum - 1];
                          const portB = RSP35_PORTS_LAN_B[item.portNum - 1];
                          const statusA = getEffectivePortStatus(portA);
                          const statusB = getEffectivePortStatus(portB);
                          const upA = statusA === 'UP';
                          const upB = statusB === 'UP';
                          const isSelected = selectedDeviceKey === item.id;

                          const iedStatusLabel =
                            upA && upB
                              ? '● DANP ONLINE'
                              : upA
                              ? '● DANP (LAN A ONLY)'
                              : upB
                              ? '● DANP (LAN B ONLY)'
                              : '● COMM LOSS';

                          const iedStatusColor =
                            upA && upB ? '#22C55E' : upA || upB ? '#FFC400' : '#FF5C65';

                          return (
                            <g key={item.id}>
                              <g
                                className="cursor-pointer"
                                onClick={() => handleSelectDevice(item.id, true)}
                              >
                                
                                <image
                                  href={item.img}
                                  x={item.imgBox.x}
                                  y={item.imgBox.y}
                                  width={item.imgBox.w}
                                  height={item.imgBox.h}
                                  preserveAspectRatio="xMidYMid meet"
                                />
                                <text
                                  x={item.textX}
                                  y={408}
                                  textAnchor="middle"
                                  fill="#FFFFFF"
                                  fontSize="13"
                                  fontWeight="bold"
                                >
                                  {item.label}
                                </text>
                                <text
                                  x={item.textX}
                                  y={428}
                                  textAnchor="middle"
                                  fill="#DCEAF5"
                                  fontSize="10.5"
                                  fontWeight="600"
                                >
                                  {item.sub}
                                </text>
                                <text
                                  x={item.textX}
                                  y={456}
                                  textAnchor="middle"
                                  fill="#00D2FF"
                                  fontSize="12.5"
                                  fontFamily="monospace"
                                  fontWeight="bold"
                                >
                                  {item.ip}
                                </text>
                                <text
                                  x={item.textX}
                                  y={484}
                                  textAnchor="middle"
                                  fill="#FFC400"
                                  fontSize="10.5"
                                  fontWeight="bold"
                                >
                                  {item.vlanText}
                                </text>
                                <text
                                  x={item.textX}
                                  y={510}
                                  textAnchor="middle"
                                  fill={iedStatusColor}
                                  fontSize="12"
                                  fontWeight="bold"
                                >
                                  {iedStatusLabel}
                                </text>
                              </g>

                              {/* Visible ETH-A & ETH-B Port Anchors on Top Edge of IED Card */}
                              <g
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedSwitchPlane('LAN_A');
                                  setSelectedPortNumber(item.portNum);
                                }}
                              >
                                <title>{`${item.label} ETH-A → LAN A Switch P${item.portNum} (${portA.portId})`}</title>
                                <g><rect x={(item.imgBox.x + item.imgBox.w * 0.35) - 5} y={item.imgBox.y - 4} width={10} height={8} rx={1} fill="#07111F" stroke={upA ? '#168BFF' : '#FF5C65'} strokeWidth={1.5}/><text x={(item.imgBox.x + item.imgBox.w * 0.35)} y={item.imgBox.y + (-8)} textAnchor="middle" fontSize="8" fontWeight="bold" fill={upA ? '#168BFF' : '#FF5C65'}>ETH-A</text></g>
                              </g>
                              <g
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedSwitchPlane('LAN_B');
                                  setSelectedPortNumber(item.portNum);
                                }}
                              >
                                <title>{`${item.label} ETH-B → LAN B Switch P${item.portNum} (${portB.portId})`}</title>
                                <g><rect x={(item.imgBox.x + item.imgBox.w * 0.70) - 5} y={item.imgBox.y - 4} width={10} height={8} rx={1} fill="#07111F" stroke={upB ? '#FFC400' : '#FF5C65'} strokeWidth={1.5}/><text x={(item.imgBox.x + item.imgBox.w * 0.70)} y={item.imgBox.y + (-8)} textAnchor="middle" fontSize="8" fontWeight="bold" fill={upB ? '#FFC400' : '#FF5C65'}>ETH-B</text></g>
                              </g>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            </div>
          )}

          {/* TAB 3: PRP (DUAL LAN) */}
          {activeView === 'PRP_DUAL' && (() => {
            const nodes = [
              { name: 'Siemens SIPROTEC 5', model: '7SJ85', ip: '192.168.10.11', photo: 'SIEMENS_7SJ85', port: 5, y: 105 },
              { name: 'ABB Relion', model: 'REF615', ip: '192.168.10.12', photo: 'ABB_REF615', port: 6, y: 280 },
              { name: 'Schneider MiCOM', model: 'C264', ip: '192.168.10.13', photo: 'SCHNEIDER_C264', port: 7, y: 455 },
            ];
            const planes = [
              { plane: 'LAN_A' as const, label: 'LAN A', color: '#00CFFF', y: 145, ports: RSP35_PORTS_LAN_A },
              { plane: 'LAN_B' as const, label: 'LAN B', color: '#FACC15', y: 395, ports: RSP35_PORTS_LAN_B },
            ];
            const redboxSwitchPort = 4;

            const status = (p: typeof planes[number], n: number) =>
              p.plane === 'LAN_B' && networkRedundancyMode === 'SINGLE_LAN'
                ? ('DOWN' as const)
                : getEffectivePortStatus(p.ports[n - 1]);

            const usable = (p: typeof planes[number], n: number) => {
              const ov = getPortOverride(p.ports[n - 1].portId);
              return status(p, n) === 'UP' && !ov.vlanMismatch && ov.packetLossPercent < 100;
            };

            const lanAUp = usable(planes[0], 1);
            const lanBUp = usable(planes[1], 1);
            const red25LinkAUp = usable(planes[0], redboxSwitchPort) && !prpRed25PortAFault;
            const red25LinkBUp = usable(planes[1], redboxSwitchPort) && !prpRed25PortBFault;
            const red25PathA = red25LinkAUp && lanAUp;
            const red25PathB = red25LinkBUp && lanBUp;
            const sanInterlinkUp = !prpInterlinkFault;
            const sanPathA = sanInterlinkUp && red25PathA;
            const sanPathB = sanInterlinkUp && red25PathB;
            const sanOnline = sanPathA || sanPathB;
            const danpBothUp = lanAUp && lanBUp;
            const danpAnyUp = lanAUp || lanBUp;

            const restoreAllPrpFaults = () => {
              if (lanAFaultActive) toggleFaultScenario('FLT-11');
              if (lanBFaultActive) toggleFaultScenario('FLT-12');
              setPrpRed25PortAFault(false);
              setPrpRed25PortBFault(false);
              setPrpInterlinkFault(false);
            };

            const activeScenarioId =
              !lanAUp && !lanBUp
                ? 8
                : prpRed25PortAFault && prpRed25PortBFault
                ? 7
                : prpInterlinkFault
                ? 6
                : prpRed25PortBFault
                ? 5
                : prpRed25PortAFault
                ? 4
                : !lanBUp
                ? 3
                : !lanAUp
                ? 2
                : 1;

            const jack = (
              x: number,
              y: number,
              p: typeof planes[number],
              n: number,
              label: string,
              forceDown = false,
              labelPos: 'top' | 'left' | 'right' | 'bottom' = 'top'
            ) => {
              const effStatus = forceDown ? 'DOWN' : status(p, n);
              const effUsable = !forceDown && usable(p, n);
              const lx = labelPos === 'left' ? x - 14 : labelPos === 'right' ? x + 14 : x;
              const ly = labelPos === 'bottom' ? y + 17 : labelPos === 'left' || labelPos === 'right' ? y + 3 : y - 10;
              const anchor = labelPos === 'left' ? 'end' : labelPos === 'right' ? 'start' : 'middle';
              return (
                <g className="cursor-pointer" onClick={() => { setSelectedSwitchPlane(p.plane); setSelectedPortNumber(n); }}>
                  <title>{p.ports[n - 1].portId} · {p.ports[n - 1].remotePort} · {effStatus}</title>
                  <rect x={x - 8} y={y - 6.5} width="16" height="13" rx="2.5" fill="#040D1A" fillOpacity="0.92" stroke={effStatus === 'UP' ? p.color : '#FF5C65'} strokeWidth="1.6" />
                  <circle cx={x} cy={y} r="2.6" fill={effUsable ? p.color : '#FF5C65'} />
                  <text
                    x={lx}
                    y={ly}
                    textAnchor={anchor}
                    fill={effStatus === 'UP' ? p.color : '#FF5C65'}
                    fontSize="8.8"
                    fontWeight="bold"
                    paintOrder="stroke"
                    stroke="#030A16"
                    strokeWidth="3"
                  >
                    {label}
                  </text>
                </g>
              );
            };

            const interlinkPath = 'M 825 404 C 865 404, 878 468, 932 468 L 1126 468 C 1146 468, 1154 460, 1154 443';
            const interlinkRevPath = 'M 1154 443 C 1154 460, 1146 468, 1126 468 L 932 468 C 878 468, 865 404, 825 404';

            return (
              <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-4 space-y-4 shadow-xl">
                {/* Header & Fault Injection Controls */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#15314E] pb-3">
                  <div>
                    <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                      IEC 62439-3 Clause 4 — Parallel Redundancy Protocol (PRP) Dual-LAN Simulator with Hirschmann RED25 (RedBox)
                    </h2>
                    <p className="text-xs text-[#8BB3D4]">
                      DANP nodes connect directly to LAN A &amp; LAN B. Legacy SAN IED connects via Hirschmann RED25 Interlink, which appends/strips the 6-byte PRP RCT (0x88FB) with 0 ms failover.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleFaultScenario('FLT-11')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                        lanAFaultActive ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#77E7FF] border-[#00CFFF]'
                      }`}
                    >
                      {lanAFaultActive ? 'Restore LAN A' : 'Fail LAN A'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleFaultScenario('FLT-12')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                        lanBFaultActive ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#FDE047] border-[#FACC15]'
                      }`}
                    >
                      {lanBFaultActive ? 'Restore LAN B' : 'Fail LAN B'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrpRed25PortAFault((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                        prpRed25PortAFault ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#FCA5A5] border-[#EF4444]/60'
                      }`}
                    >
                      {prpRed25PortAFault ? 'Restore RED25 (A)' : 'Fail RED25 (A)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrpRed25PortBFault((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                        prpRed25PortBFault ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#FCA5A5] border-[#EF4444]/60'
                      }`}
                    >
                      {prpRed25PortBFault ? 'Restore RED25 (B)' : 'Fail RED25 (B)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrpInterlinkFault((v) => !v)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition ${
                        prpInterlinkFault ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#D8B4FE] border-[#A855F7]/70'
                      }`}
                    >
                      {prpInterlinkFault ? 'Restore Interlink' : 'Fail Interlink'}
                    </button>
                    <button
                      type="button"
                      onClick={restoreAllPrpFaults}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-bold border bg-[#06281E] text-[#4ADE80] border-[#22C55E] hover:bg-[#0B3B2B] transition"
                    >
                      Restore All
                    </button>
                  </div>
                </div>

                {/* Dual-LAN + RedBox + Legacy SAN IED Topology SVG (Ports Mounted Directly On Devices) */}
                <div className="overflow-x-auto">
                  <svg viewBox="0 0 1320 565" className="w-full h-auto min-w-[960px]" aria-label="PRP Dual-LAN topology with Hirschmann RED25 RedBox and Legacy SAN IED">
                    {/* LAYER 1: HARDWARE DEVICES & LABELS */}

                    {/* Left Column: 3 DANP IEDs (Text on Left, Hardware on Right so ports sit directly on IED chassis) */}
                    {nodes.map((n) => {
                      const bothOk = planes.every((p) => usable(p, n.port) && usable(p, 1));
                      const aOk = usable(planes[0], n.port) && usable(planes[0], 1);
                      const bOk = usable(planes[1], n.port) && usable(planes[1], 1);
                      const statusText = bothOk
                        ? '✓ Dual path (LAN A & B)'
                        : aOk
                        ? '✓ LAN A active (0 ms)'
                        : bOk
                        ? '✓ LAN B active (0 ms)'
                        : '✕ Communication lost';
                      const statusColor = bothOk ? '#4ADE80' : aOk ? '#38BDF8' : bOk ? '#FACC15' : '#FF5C65';

                      return (
                        <g key={n.port}>
                          <text x="14" y={n.y - 34} fill="white" fontSize="12" fontWeight="bold">{n.name}</text>
                          <text x="14" y={n.y - 17} fill="#A5F3FC" fontSize="10.5">{n.model} — DANP (PRP)</text>
                          <text x="14" y={n.y - 1} fill="#94A3B8" fontSize="10" fontFamily="monospace">IP: {n.ip}</text>
                          <text x="14" y={n.y + 18} fill={statusColor} fontSize="9.8" fontWeight="bold">{statusText}</text>
                          <text x="14" y={n.y + 33} fill="#77E7FF" fontSize="9.2">✓ Duplicate discard at LRE</text>
                          <image href={getHardwarePhoto(n.photo)} x="164" y={n.y - 62} width="98" height="124" preserveAspectRatio="xMidYMid meet" />
                        </g>
                      );
                    })}

                    {/* Middle Column: Hirschmann RSP35 LAN A & LAN B Switches */}
                    {planes.map((p, pi) => {
                      const isA = pi === 0;
                      return (
                        <g key={`SW-BODY-${p.plane}`}>
                          <rect x="396" y={p.y - 82} width="188" height="32" rx="6" fill="#07172B" stroke={p.color} strokeWidth="1.2" opacity="0.95" />
                          <text x="490" y={p.y - 68} textAnchor="middle" fill={p.color} fontSize="11" fontWeight="bold">
                            HIRSCHMANN RSP35 — {p.label}
                          </text>
                          <text x="490" y={p.y - 55} textAnchor="middle" fill="#CBD5E1" fontSize="9.5">
                            (PRP Network – {isA ? 'A' : 'B'})
                          </text>
                          <image href={getHardwarePhoto('DIN_SWITCH')} x="404" y={p.y - 45} width="172" height="106" preserveAspectRatio="xMidYMid meet" />
                          <text x="490" y={p.y + 76} textAnchor="middle" fill={usable(p, 1) ? '#4ADE80' : '#FF5C65'} fontSize="10.5" fontWeight="bold">
                            {usable(p, 1) ? `${p.label} Active · 0 ms PRP Plane` : `${p.label} Link Down / Isolated`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Center-Right: Hirschmann RED25 (RedBox — PRP <-> SAN) */}
                    <g>
                      <rect x="708" y="198" width="150" height="34" rx="6" fill="#0A1938" stroke="#60A5FA" strokeWidth="1.3" />
                      <text x="783" y="213" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="bold">Hirschmann RED25</text>
                      <text x="783" y="226" textAnchor="middle" fill="#93C5FD" fontSize="9.5">(RedBox — PRP ↔ SAN)</text>
                      <image href={getHardwarePhoto('HIRSCHMANN_RED25')} x="722" y="242" width="124" height="196" preserveAspectRatio="xMidYMid meet" />
                      <text x="783" y="454" textAnchor="middle" fill={red25PathA && red25PathB ? '#4ADE80' : red25PathA || red25PathB ? '#FACC15' : '#FF5C65'} fontSize="10" fontWeight="bold">
                        {red25PathA && red25PathB
                          ? 'RCT Proxy Active (A & B)'
                          : red25PathA
                          ? 'RCT Proxy Active (LAN A)'
                          : red25PathB
                          ? 'RCT Proxy Active (LAN B)'
                          : 'RedBox Isolated from PRP'}
                      </text>
                    </g>

                    {/* Top-Right: SCADA / HMI Server (PRP - DANP) */}
                    <g>
                      <text x="1128" y="64" textAnchor="middle" fill="white" fontSize="13.5" fontWeight="bold">SCADA / HMI Server (PRP)</text>
                      <image href={getHardwarePhoto('SCADA_SERVER')} x="1028" y="76" width="200" height="96" preserveAspectRatio="xMidYMid meet" />
                      <text x="1128" y="192" textAnchor="middle" fill="#A5F3FC" fontSize="11.5" fontFamily="monospace">IP: 192.168.10.10 · DANP</text>
                      <text x="1128" y="209" textAnchor="middle" fill={danpAnyUp ? '#4ADE80' : '#FF5C65'} fontSize="10.5">
                        {danpAnyUp ? '✓ Receives first valid frame' : '✕ No PRP Plane Available'}
                      </text>
                      <text x="1128" y="224" textAnchor="middle" fill="#77E7FF" fontSize="10">
                        ✓ Discards duplicate (same SeqNr)
                      </text>
                    </g>

                    {/* Bottom-Right: Legacy SAN IED (Single-Attached) */}
                    <g>
                      <text x="1128" y="318" textAnchor="middle" fill="white" fontSize="13.5" fontWeight="bold">Legacy SAN IED</text>
                      <text x="1128" y="334" textAnchor="middle" fill="#D8B4FE" fontSize="10.5">(Single-Attached Node — Normal Ethernet)</text>
                      <image href={getHardwarePhoto('LEGACY_SAN_IED')} x="1026" y="346" width="204" height="114" preserveAspectRatio="xMidYMid meet" />
                      <text x="1128" y="492" textAnchor="middle" fill="#E9D5FF" fontSize="11.5" fontFamily="monospace">IP: 192.168.10.20 · SAN</text>
                      <text
                        x="1128"
                        y="509"
                        textAnchor="middle"
                        fill={sanPathA && sanPathB ? '#4ADE80' : sanPathA ? '#38BDF8' : sanPathB ? '#FACC15' : '#FF5C65'}
                        fontSize="10.5"
                        fontWeight="bold"
                      >
                        {sanPathA && sanPathB
                          ? '✓ Dual path via RED25 (LAN A & B)'
                          : sanPathA
                          ? '✓ Active via RED25 → LAN A'
                          : sanPathB
                          ? '✓ Active via RED25 → LAN B'
                          : '✕ Communication lost (SAN isolated)'}
                      </text>
                      <text x="1128" y="525" textAnchor="middle" fill="#94A3B8" fontSize="9.5">
                        Connected via RED25 Interlink · No native PRP stack
                      </text>
                    </g>

                    {/* LAYER 2: DIRECT PORT-TO-PORT PATCH CORDS */}
                    {planes.map((p, pi) => {
                      const isA = pi === 0;
                      const redboxLinkStatus = (isA ? prpRed25PortAFault : prpRed25PortBFault)
                        ? ('DOWN' as const)
                        : status(p, redboxSwitchPort);
                      const redboxLinkActive = packetsPlaying && sanInterlinkUp && (isA ? red25LinkAUp : red25LinkBUp);
                      const red25PortY = isA ? 336 : 362;
                      const scadaPortY = isA ? 114 : 140;
                      const swScadaY = p.y + 6;
                      const swRedboxY = p.y + 38;

                      return (
                        <g key={`CORDS-${p.plane}`}>
                          {/* DANP IEDs (on-device ETH-A/B at x=256) -> RSP35 (on-device P5..P7 at x=422) */}
                          {nodes.map((n, i) => {
                            const sy = n.y + (isA ? -16 : 16);
                            const dy = p.y - 6 + i * 24;
                            return (
                              <PatchCordPath
                                key={n.port}
                                id={`PRP-${p.plane}-${n.port}`}
                                d={`M 256 ${sy} C ${312 + i * 12} ${sy}, ${348 + i * 10} ${dy}, 422 ${dy}`}
                                plane={p.plane}
                                status={status(p, n.port)}
                                selected={selectedSwitchPlane === p.plane && selectedPortNumber === n.port}
                                highlighted={false}
                                packetActive={packetsPlaying && usable(p, n.port)}
                                packetColor={p.color}
                                duration={packetDuration}
                                delay={i * 0.25}
                                onClick={() => {
                                  setSelectedSwitchPlane(p.plane);
                                  setSelectedPortNumber(n.port);
                                }}
                              />
                            );
                          })}

                          {/* RSP35 (on-device P1 at x=558) -> SCADA Server (on-device LAN A/B at x=1042) */}
                          <PatchCordPath
                            id={`PRP-${p.plane}-SCADA`}
                            d={`M 558 ${swScadaY} C 645 ${swScadaY}, 660 ${scadaPortY}, 1042 ${scadaPortY}`}
                            plane={p.plane}
                            status={status(p, 1)}
                            selected={selectedSwitchPlane === p.plane && selectedPortNumber === 1}
                            highlighted={false}
                            packetActive={packetsPlaying && usable(p, 1) && (nodes.some((n) => usable(p, n.port)) || (sanInterlinkUp && (isA ? red25LinkAUp : red25LinkBUp)))}
                            packetColor={p.color}
                            duration={packetDuration}
                            delay={0.35}
                            onClick={() => {
                              setSelectedSwitchPlane(p.plane);
                              setSelectedPortNumber(1);
                            }}
                          />

                          {/* RSP35 (on-device P4 at x=558) -> Hirschmann RED25 (exact physical Port A/B at x=791) */}
                          <PatchCordPath
                            id={`PRP-${p.plane}-RED25`}
                            d={`M 558 ${swRedboxY} C 635 ${swRedboxY}, 665 ${red25PortY}, 791 ${red25PortY}`}
                            plane={p.plane}
                            status={redboxLinkStatus}
                            selected={selectedSwitchPlane === p.plane && selectedPortNumber === redboxSwitchPort}
                            highlighted={false}
                            packetActive={redboxLinkActive}
                            packetColor={p.color}
                            duration={packetDuration}
                            delay={0.5}
                            onClick={() => {
                              setSelectedSwitchPlane(p.plane);
                              setSelectedPortNumber(redboxSwitchPort);
                            }}
                          />
                        </g>
                      );
                    })}

                    {/* RED25 Interlink (825, 404) -> Legacy SAN IED Physical RJ45 (1154, 443) */}
                    <g>
                      <path d={interlinkPath} fill="none" stroke="#02060D" strokeWidth="8" strokeLinecap="round" />
                      <path
                        d={interlinkPath}
                        fill="none"
                        stroke={sanInterlinkUp ? '#C084FC' : '#FF5C65'}
                        strokeWidth="4.4"
                        strokeLinecap="round"
                        strokeDasharray={sanInterlinkUp ? undefined : '6 5'}
                      />
                      <path
                        d={interlinkPath}
                        fill="none"
                        stroke={sanInterlinkUp ? '#F3E8FF' : '#FDA4AF'}
                        strokeWidth="1.3"
                        strokeLinecap="round"
                      />
                      {packetsPlaying && sanOnline && (
                        <>
                          <circle r="4.2" fill="#E879F9">
                            <animateMotion dur={`${packetDuration}s`} repeatCount="indefinite" path={interlinkRevPath} />
                          </circle>
                          <circle r="3.6" fill="#C084FC">
                            <animateMotion dur={`${packetDuration}s`} begin={`${packetDuration * 0.5}s`} repeatCount="indefinite" path={interlinkPath} />
                          </circle>
                        </>
                      )}
                      <rect x="892" y="424" width="90" height="28" rx="5" fill="#1E1038" stroke={sanInterlinkUp ? '#C084FC' : '#FF5C65'} strokeWidth="1.2" />
                      <text x="937" y="436" textAnchor="middle" fill="#F3E8FF" fontSize="9.5" fontWeight="bold">Interlink</text>
                      <text x="937" y="448" textAnchor="middle" fill="#D8B4FE" fontSize="8.5">(SAN Ethernet)</text>
                    </g>

                    {/* LAYER 3: ON-DEVICE CLICKABLE PORT JACKS (MOUNTED DIRECTLY ON HARDWARE FACEPLATES) */}

                    {/* DANP IED Ports (On Right Edge of Each IED) */}
                    {nodes.map((n) => (
                      <g key={`IED-PORTS-${n.port}`}>
                        {planes.map((p, pi) => (
                          <g key={p.plane}>
                            {jack(256, n.y + (pi === 0 ? -16 : 16), p, n.port, pi === 0 ? 'ETH-A' : 'ETH-B', false, pi === 0 ? 'top' : 'bottom')}
                          </g>
                        ))}
                      </g>
                    ))}

                    {/* Hirschmann RSP35 Switch Ports (Mounted Directly on Switch Faceplates) */}
                    {planes.map((p, pi) => {
                      const isA = pi === 0;
                      return (
                        <g key={`SW-PORTS-${p.plane}`}>
                          {nodes.map((n, i) => (
                            <g key={n.port}>{jack(422, p.y - 6 + i * 24, p, n.port, `P${n.port}`, false, 'right')}</g>
                          ))}
                          {jack(558, p.y + 6, p, 1, 'P1', false, 'left')}
                          {jack(558, p.y + 38, p, redboxSwitchPort, 'P4', isA ? prpRed25PortAFault : prpRed25PortBFault, 'left')}
                        </g>
                      );
                    })}

                    {/* Hirschmann RED25 Ports (Exact Physical Port A, Port B & Interlink on RED25 Faceplate) */}
                    {jack(791, 336, planes[0], redboxSwitchPort, 'A', prpRed25PortAFault, 'right')}
                    {jack(791, 362, planes[1], redboxSwitchPort, 'B', prpRed25PortBFault, 'right')}
                    <g className="cursor-pointer" onClick={() => setPrpInterlinkFault((v) => !v)}>
                      <title>RED25 Interlink Port · Normal Ethernet (SAN) · {sanInterlinkUp ? 'UP' : 'DOWN'}</title>
                      <rect x="817" y="397.5" width="16" height="13" rx="2.5" fill="#040D1A" fillOpacity="0.92" stroke={sanInterlinkUp ? '#C084FC' : '#FF5C65'} strokeWidth="1.6" />
                      <circle cx="825" cy="404" r="2.6" fill={sanOnline ? '#E879F9' : '#FF5C65'} />
                      <text x="825" y="393" textAnchor="middle" fill={sanInterlinkUp ? '#E9D5FF' : '#FF5C65'} fontSize="8.5" fontWeight="bold" paintOrder="stroke" stroke="#030A16" strokeWidth="3">SAN</text>
                    </g>

                    {/* SCADA / HMI Server Ports (Mounted Directly on Left Front Bezel) */}
                    {planes.map((p, pi) => (
                      <g key={`SCADA-PORT-${p.plane}`}>
                        {jack(1042, pi === 0 ? 114 : 140, p, 1, pi === 0 ? 'LAN A' : 'LAN B', false, 'right')}
                      </g>
                    ))}

                    {/* Legacy SAN IED Port (Exact Physical Front-Panel RJ45 Jack) */}
                    <g className="cursor-pointer" onClick={() => setPrpInterlinkFault((v) => !v)}>
                      <title>Legacy SAN IED Front-Panel ETH Port · Connected to RED25 Interlink</title>
                      <rect x="1146" y="436.5" width="16" height="13" rx="2.5" fill="#040D1A" fillOpacity="0.92" stroke={sanInterlinkUp ? '#C084FC' : '#FF5C65'} strokeWidth="1.6" />
                      <circle cx="1154" cy="443" r="2.6" fill={sanOnline ? '#E879F9' : '#FF5C65'} />
                      <text x="1154" y="432" textAnchor="middle" fill={sanInterlinkUp ? '#E9D5FF' : '#FF5C65'} fontSize="8.5" fontWeight="bold" paintOrder="stroke" stroke="#030A16" strokeWidth="3">ETH</text>
                    </g>
                  </svg>
                </div>

                {/* Bottom Engineering Panels: RedBox Operation, Frame Formats, Port Mapping & Live Failure Matrix */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 text-xs">
                  {/* Panel 1: PRP Operation with RedBox & Port Mapping */}
                  <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-2.5">
                    <div className="text-[11px] font-extrabold text-[#77E7FF] uppercase tracking-wider">
                      PRP Operation with RedBox (SAN Integration)
                    </div>
                    <ol className="space-y-1 text-[11px] text-[#CBD5E1] list-decimal list-inside">
                      <li>Legacy SAN IED sends a normal Ethernet frame to RED25 (<span className="text-[#D8B4FE] font-semibold">Interlink</span>).</li>
                      <li>RED25 appends the 6-byte PRP <span className="text-[#4ADE80] font-semibold">RCT (0x88FB)</span> and duplicates the frame.</li>
                      <li>RED25 transmits copy A to <span className="text-[#00CFFF] font-semibold">LAN A</span> and copy B to <span className="text-[#FACC15] font-semibold">LAN B</span>.</li>
                      <li>SCADA/DANP receiver accepts the first valid frame and discards the duplicate (same SeqNr).</li>
                      <li>In reverse direction, RED25 strips the RCT and forwards a standard Ethernet frame to SAN IED.</li>
                    </ol>
                    <div className="pt-2 border-t border-[#15314E]">
                      <div className="text-[10.5px] font-bold text-white mb-1">Port Mapping — Hirschmann RED25</div>
                      <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-[#040E1D] p-2 rounded border border-[#173252]">
                        <span className="text-[#00CFFF] font-bold">Port A</span><span className="text-slate-300">→ RSP35 LAN A (P4)</span><span className={red25LinkAUp ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}>{red25LinkAUp ? 'PRP LAN A' : 'FAULT'}</span>
                        <span className="text-[#FACC15] font-bold">Port B</span><span className="text-slate-300">→ RSP35 LAN B (P4)</span><span className={red25LinkBUp ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}>{red25LinkBUp ? 'PRP LAN B' : 'FAULT'}</span>
                        <span className="text-[#D8B4FE] font-bold">Interlink</span><span className="text-slate-300">→ SAN IED (.10.20)</span><span className={sanInterlinkUp ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}>{sanInterlinkUp ? 'Normal ETH' : 'FAULT'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Panel 2: Ethernet Frame Formats & 48-bit RCT */}
                  <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-2.5">
                    <div className="text-[11px] font-extrabold text-[#77E7FF] uppercase tracking-wider">
                      Ethernet Frame Formats &amp; 48-Bit PRP RCT
                    </div>
                    <div>
                      <div className="text-[10px] text-[#D8B4FE] font-semibold mb-1">Normal Ethernet Frame (SAN Side ↔ RED25 Interlink)</div>
                      <div className="grid grid-cols-5 gap-1 text-center font-mono text-[9.5px]">
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">DMAC<br /><span className="text-[#8BB3D4]">6B</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">SMAC<br /><span className="text-[#8BB3D4]">6B</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">Type<br /><span className="text-[#8BB3D4]">2B</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">Payload<br /><span className="text-[#8BB3D4]">LSDU</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">FCS<br /><span className="text-[#8BB3D4]">4B</span></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#77E7FF] font-semibold mb-1">PRP Ethernet Frame (LAN A / LAN B — from RED25 &amp; DANP)</div>
                      <div className="grid grid-cols-6 gap-1 text-center font-mono text-[9.5px]">
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">DMAC<br /><span className="text-[#8BB3D4]">6B</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">SMAC<br /><span className="text-[#8BB3D4]">6B</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">Type<br /><span className="text-[#8BB3D4]">2B</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">LSDU<br /><span className="text-[#8BB3D4]">Var</span></div>
                        <div className="bg-[#2B124C] border border-[#C084FC] rounded py-1 text-[#F3E8FF] font-bold">RCT<br /><span className="text-[#D8B4FE]">6B</span></div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">FCS<br /><span className="text-[#8BB3D4]">4B</span></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-center font-mono text-[9.5px] pt-1">
                      <div className="bg-[#041226] border border-[#00CFFF]/50 rounded p-1.5">
                        <div className="text-[#77E7FF] font-bold">SeqNr</div>
                        <div className="text-slate-300">16 bits</div>
                      </div>
                      <div className="bg-[#041226] border border-[#FACC15]/50 rounded p-1.5">
                        <div className="text-[#FDE047] font-bold">LAN ID</div>
                        <div className="text-slate-300">0xA / 0xB</div>
                      </div>
                      <div className="bg-[#041226] border border-[#60A5FA]/50 rounded p-1.5">
                        <div className="text-[#93C5FD] font-bold">LSDU Size</div>
                        <div className="text-slate-300">12 bits</div>
                      </div>
                      <div className="bg-[#06281E] border border-[#22C55E] rounded p-1.5">
                        <div className="text-[#4ADE80] font-bold">0x88FB</div>
                        <div className="text-slate-300">16 bits</div>
                      </div>
                    </div>
                  </div>

                  {/* Panel 3: Failure Scenario & Expected Behaviour */}
                  <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-2">
                    <div className="text-[11px] font-extrabold text-[#77E7FF] uppercase tracking-wider">
                      Failure Scenario &amp; Expected Behaviour
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-[10px] border-collapse">
                        <thead>
                          <tr className="text-left text-[#8BB3D4] border-b border-[#18385A]">
                            <th className="py-1 pr-1">#</th>
                            <th className="py-1 pr-1">Failure Condition</th>
                            <th className="py-1 pr-1">Legacy SAN (RED25)</th>
                            <th className="py-1">DANP IEDs</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#122944]">
                          {[
                            { id: 1, cond: 'Normal Operation', san: 'Dual path (A & B)', danp: 'Dual path (A & B)', sanBad: false, danpBad: false },
                            { id: 2, cond: 'LAN A Failure', san: 'LAN B active', danp: 'LAN B active', sanBad: false, danpBad: false },
                            { id: 3, cond: 'LAN B Failure', san: 'LAN A active', danp: 'LAN A active', sanBad: false, danpBad: false },
                            { id: 4, cond: 'RED25 Port A Failure', san: 'LAN B active', danp: 'Unaffected', sanBad: false, danpBad: false },
                            { id: 5, cond: 'RED25 Port B Failure', san: 'LAN A active', danp: 'Unaffected', sanBad: false, danpBad: false },
                            { id: 6, cond: 'Interlink Failure', san: 'Comm. lost', danp: 'Unaffected', sanBad: true, danpBad: false },
                            { id: 7, cond: 'RED25 Failure (All)', san: 'Comm. lost', danp: 'Unaffected', sanBad: true, danpBad: false },
                            { id: 8, cond: 'Both LANs Failure', san: 'Comm. lost', danp: 'Comm. lost', sanBad: true, danpBad: true },
                          ].map((row) => (
                            <tr
                              key={row.id}
                              className={activeScenarioId === row.id ? 'bg-[#123055] text-white font-bold' : 'text-slate-300'}
                            >
                              <td className="py-1 pr-1 font-mono text-[#77E7FF]">{row.id}</td>
                              <td className="py-1 pr-1">{row.cond}</td>
                              <td className={`py-1 pr-1 ${row.sanBad ? 'text-[#FF5C65]' : 'text-[#4ADE80]'}`}>{row.san}</td>
                              <td className={`py-1 ${row.danpBad ? 'text-[#FF5C65]' : 'text-[#4ADE80]'}`}>{row.danp}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Live Status Strip */}
                <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 rounded-lg bg-[#061426] border border-[#18385A] text-[11px] font-mono">
                  <span className={danpBothUp && sanPathA && sanPathB ? 'text-[#4ADE80] font-bold' : danpAnyUp ? 'text-[#FACC15] font-bold' : 'text-[#FF5C65] font-bold'}>
                    ● Status: {danpBothUp && sanPathA && sanPathB ? 'Normal Operation — PRP Active (RedBox: Online)' : danpAnyUp ? 'Degraded Redundancy — Single Path Surviving (0 ms)' : 'CRITICAL — Both PRP Planes Down'}
                  </span>
                  <div className="flex flex-wrap gap-3 text-[10.5px]">
                    <span className={danpAnyUp ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}>{danpAnyUp ? '✓' : '✕'} PRP Frames Generated</span>
                    <span className={danpBothUp ? 'text-[#4ADE80]' : 'text-[#FACC15]'}>{danpBothUp ? '✓ Duplicate Discard Active' : '• Single Plane Active'}</span>
                    <span className={sanOnline ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}>{sanOnline ? '✓ SAN Connectivity via RED25' : '✕ SAN Disconnected'}</span>
                    <span className={red25PathA || red25PathB ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}>{red25PathA || red25PathB ? '✓ RCT Processing: OK' : '✕ RCT Offline'}</span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4: HSR (RING) */}
          {activeView === 'HSR_RING' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-3.5 space-y-3 shadow-xl">
              {/* Header */}
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#15314E] pb-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    IEC 62439-3 CLAUSE 5 — HSR RING WITH SAN ETHERNET SWITCH &amp; DUAL HIRSCHMANN RED25 REDBOXES
                  </h2>
                  <p className="text-xs text-[#8BB3D4]">
                    Station SAN devices connect via the Hirschmann RSP35 SAN Switch to Top RED25 #1 Interlink. Bottom RED25 #2 sits in series in the HSR Ring and couples the Legacy SAN IED via its Interlink port.
                  </p>
                </div>
                <div className="shrink-0 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHsrInterlinkFault((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      hsrInterlinkFault
                        ? 'bg-[#FF5C65] text-white border-white'
                        : 'bg-[#081A30] text-[#D8B4FE] border-[#A855F7]/70 hover:border-[#C084FC]'
                    }`}
                  >
                    {hsrInterlinkFault ? 'Restore Top Interlink' : 'Fail Top Interlink'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setHsrBottomInterlinkFault((v) => !v)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                      hsrBottomInterlinkFault
                        ? 'bg-[#FF5C65] text-white border-white'
                        : 'bg-[#081A30] text-[#F0ABFC] border-[#D946EF]/70 hover:border-[#E879F9]'
                    }`}
                  >
                    {hsrBottomInterlinkFault ? 'Restore Bottom Interlink' : 'Fail Bottom Interlink'}
                  </button>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-mono font-bold border ${
                      hsrSimulation.ringState === 'CLOSED'
                        ? 'bg-[#093524]/80 text-[#4ADE80] border-[#22C55E]'
                        : hsrSimulation.ringState === 'OPEN'
                        ? 'bg-[#3B2609]/80 text-[#FACC15] border-[#FACC15]'
                        : 'bg-[#3B0D15]/90 text-[#FF5C65] border-[#FF5C65]'
                    }`}
                  >
                    {hsrSimulation.ringState === 'CLOSED'
                      ? '● RING HEALTHY (0 CUTS)'
                      : hsrSimulation.ringState === 'OPEN'
                      ? `▲ RING OPEN (1 CUT: SEG #${hsrCutSegments[0] + 1})`
                      : `✖ PARTITIONED (${hsrCutSegments.length} CUTS • ${hsrSimulation.isolatedNodeIndices.length} ISOLATED)`}
                  </span>
                </div>
              </div>

              {/* Main HSR Diagram Canvas — Zero Device Boxes, Realistic Hardware Cutouts & On-Device Ports */}
              <div className="relative rounded-xl bg-gradient-to-b from-[#061325] via-[#040D1A] to-[#030914] border border-[#163452] p-2.5 overflow-x-auto">
                {/* Multi-Segment Fiber Cut Selector Dropdown (Top-Left, Clear of All Devices) */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '8px',
                    width: '214px',
                    zIndex: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setHsrDropdownOpen((prev) => !prev)}
                    aria-expanded={hsrDropdownOpen}
                    aria-controls="hsr-segment-cut-options"
                    style={{
                      width: '100%',
                      padding: '5px 10px',
                      borderRadius: '8px',
                      backgroundColor: '#071A30',
                      color: '#FFFFFF',
                      border: '1.5px solid #00D4FF',
                      boxShadow: '0 0 12px rgba(0, 212, 255, 0.25)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontSize: '11.5px',
                      fontWeight: 700,
                    }}
                  >
                    <span>Simulate Cut on Segment</span>
                    <span style={{ color: '#00D4FF', fontSize: '11px', fontFamily: 'monospace' }}>
                      {hsrCutSegments.length > 0 ? `[${hsrCutSegments.length}] ` : ''}{hsrDropdownOpen ? '▴' : '▾'}
                    </span>
                  </button>

                  {hsrDropdownOpen && (
                    <div
                      id="hsr-segment-cut-options"
                      style={{
                        marginTop: '5px',
                        borderRadius: '10px',
                        backgroundColor: 'rgba(7, 21, 38, 0.96)',
                        border: '1px solid #2A527A',
                        padding: '7px 8px',
                        boxShadow: '0 10px 24px rgba(0,0,0,0.65)',
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5px' }}>
                        {HSR_SEGMENTS.map((seg) => {
                          const isChecked = hsrPendingSegments.includes(seg.index);
                          const isCurrentlyCut = hsrCutSegments.includes(seg.index);
                          return (
                            <label
                              key={seg.id}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                gap: '4px',
                                padding: '2px 4px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontSize: '9.8px',
                                color: isCurrentlyCut ? '#FDA4AF' : '#E2F1FF',
                                backgroundColor: isCurrentlyCut
                                  ? 'rgba(59, 13, 21, 0.75)'
                                  : isChecked
                                  ? 'rgba(13, 43, 77, 0.7)'
                                  : 'transparent',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    setHsrPendingSegments((prev) =>
                                      prev.includes(seg.index)
                                        ? prev.filter((x) => x !== seg.index)
                                        : [...prev, seg.index].sort((a, b) => a - b)
                                    );
                                    setHsrSelectedSegment(seg.index);
                                  }}
                                  style={{ width: '12px', height: '12px', accentColor: '#00CFFF', flexShrink: 0 }}
                                />
                                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {seg.shortDropdownLabel}
                                </span>
                              </div>
                              {isCurrentlyCut && (
                                <span
                                  style={{
                                    padding: '0px 4px',
                                    borderRadius: '3px',
                                    backgroundColor: '#FF4D5E',
                                    color: '#FFFFFF',
                                    fontSize: '8px',
                                    fontWeight: 700,
                                    fontFamily: 'monospace',
                                    flexShrink: 0,
                                  }}
                                >
                                  CUT
                                </span>
                              )}
                            </label>
                          );
                        })}
                      </div>

                      <div
                        style={{
                          marginTop: '6px',
                          paddingTop: '6px',
                          borderTop: '1px solid #163250',
                          display: 'grid',
                          gridTemplateColumns: '1fr 1fr',
                          gap: '6px',
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => applyHsrFiberCuts(hsrPendingSegments)}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '6px',
                            backgroundColor: '#00A8E8',
                            color: '#FFFFFF',
                            fontWeight: 700,
                            fontSize: '10.5px',
                            border: '1px solid #38BDF8',
                          }}
                        >
                          Apply Cut(s)
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            applyHsrFiberCuts([]);
                            setHsrInterlinkFault(false);
                            setHsrBottomInterlinkFault(false);
                          }}
                          style={{
                            padding: '4px 6px',
                            borderRadius: '6px',
                            backgroundColor: '#0B1E33',
                            color: '#DCEAF5',
                            fontWeight: 600,
                            fontSize: '10.5px',
                            border: '1px solid #386186',
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* SVG HSR Architecture: TOP (4 Station SAN Devices) -> SAN Ethernet Switch -> Top RED25 #1 -> 6-IED HSR Ring -> Bottom RED25 #2 -> Legacy SAN IED */}
                <svg viewBox="0 0 1160 755" className="w-full h-auto min-w-[860px] select-none">
                  <defs>
                    <filter id="hsrCyanGlow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1260" height="860">
                      <feGaussianBlur stdDeviation="3.2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="hsrRedGlow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1260" height="860">
                      <feGaussianBlur stdDeviation="3.8" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* ================= LAYER 1: REALISTIC HARDWARE DEVICES (ZERO BOXES) ================= */}

                  {/* TOP ROW: 4 Station-Level SAN Devices */}
                  {[
                    {
                      id: 'SRV-SCADA-A',
                      title: 'SCADA Server A',
                      ip: '192.168.10.10 · SAN',
                      img: TOPO_EXACT_IMAGES.DELL_R750,
                      cx: 300,
                      imgX: 244,
                      imgY: 32,
                      imgW: 112,
                      imgH: 40,
                    },
                    {
                      id: 'WS-HMI-01',
                      title: 'Operator HMI WS',
                      ip: '192.168.10.20 · SAN',
                      img: TOPO_EXACT_IMAGES.HMI_DUAL,
                      cx: 485,
                      imgX: 444,
                      imgY: 30,
                      imgW: 82,
                      imgH: 48,
                    },
                    {
                      id: 'GTW-RCC-01',
                      title: 'Station Gateway',
                      ip: '192.168.10.30 · SAN',
                      img: TOPO_EXACT_IMAGES.MOXA_MGATE,
                      cx: 675,
                      imgX: 638,
                      imgY: 30,
                      imgW: 74,
                      imgH: 48,
                    },
                    {
                      id: 'CLK-PTP-GM',
                      title: 'Time Server (PTP)',
                      ip: '192.168.10.100 · SAN',
                      img: TOPO_EXACT_IMAGES.MEINBERG_M400,
                      cx: 860,
                      imgX: 802,
                      imgY: 36,
                      imgW: 116,
                      imgH: 36,
                    },
                  ].map((st) => (
                    <g key={`HSR-TOP-${st.id}`} className="cursor-pointer" onClick={() => handleSelectDevice(st.id, true)}>
                      <text x={st.cx} y="15" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                        {st.title}
                      </text>
                      <text x={st.cx} y="26" textAnchor="middle" fill="#00D4FF" fontSize="9.2" fontFamily="monospace" fontWeight="bold">
                        {st.ip}
                      </text>
                      <image
                        href={st.img}
                        x={st.imgX}
                        y={st.imgY}
                        width={st.imgW}
                        height={st.imgH}
                        preserveAspectRatio="xMidYMid meet"
                      />
                    </g>
                  ))}

                  {/* ROW 2: SAN Ethernet Switch (Hirschmann RSP35 — Aggregates Station SAN Devices -> Top RED25 #1) */}
                  <g className="cursor-pointer" onClick={() => handleSelectDevice('SW-LAN-A1', false)}>
                    <text x="492" y="140" textAnchor="end" fill="#FFFFFF" fontSize="11.2" fontWeight="bold">
                      SAN Ethernet Switch
                    </text>
                    <text x="492" y="153" textAnchor="end" fill="#93C5FD" fontSize="9.3">
                      Hirschmann RSP35 (Normal ETH)
                    </text>
                    <text x="492" y="166" textAnchor="end" fill="#C084FC" fontSize="9" fontFamily="monospace">
                      P1–P4: Station SAN · P5 → RED25 #1
                    </text>
                    <image
                      href={getHardwarePhoto('DIN_SWITCH')}
                      x="504"
                      y="118"
                      width="152"
                      height="68"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>

                  {/* ROW 3: Top Hirschmann RED25 #1 (In-Series Top Ring Node — Station SAN Switch ↔ HSR) */}
                  <g className="cursor-pointer" onClick={() => handleSelectDevice('IED-11-F01', false)}>
                    <text x="530" y="224" textAnchor="end" fill="#FFFFFF" fontSize="11.2" fontWeight="bold">
                      Hirschmann RED25 #1
                    </text>
                    <text x="530" y="237" textAnchor="end" fill="#93C5FD" fontSize="9.2">
                      Top RedBox (SAN Switch ↔ HSR)
                    </text>
                    <text
                      x="530"
                      y="250"
                      textAnchor="end"
                      fill={hsrInterlinkFault ? '#FF5C65' : hsrSimulation.ringState === 'CLOSED' ? '#4ADE80' : '#FACC15'}
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {hsrInterlinkFault
                        ? '✕ Top Interlink Fault'
                        : hsrSimulation.ringState === 'CLOSED'
                        ? '● HSR Proxy Active (A & B)'
                        : '▲ Single-Path Proxy Active'}
                    </text>
                    <image
                      href={getHardwarePhoto('HIRSCHMANN_RED25')}
                      x="542"
                      y="206"
                      width="76"
                      height="118"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>

                  {/* BOTTOM CENTER: Hirschmann RED25 #2 (In-Series Bottom Ring Node — HSR ↔ Legacy SAN IED) */}
                  <g className="cursor-pointer" onClick={() => setHsrBottomInterlinkFault((v) => !v)}>
                    <text x="530" y="532" textAnchor="end" fill="#FFFFFF" fontSize="11.2" fontWeight="bold">
                      Hirschmann RED25 #2
                    </text>
                    <text x="530" y="545" textAnchor="end" fill="#F0ABFC" fontSize="9.2">
                      Bottom RedBox (HSR ↔ Legacy SAN)
                    </text>
                    <text
                      x="530"
                      y="558"
                      textAnchor="end"
                      fill={
                        !hsrSimulation.bottomRedboxReachable || hsrBottomInterlinkFault
                          ? '#FF5C65'
                          : hsrSimulation.ringState === 'CLOSED'
                          ? '#4ADE80'
                          : '#FACC15'
                      }
                      fontSize="9"
                      fontWeight="bold"
                    >
                      {!hsrSimulation.bottomRedboxReachable
                        ? '✕ Isolated from Ring'
                        : hsrBottomInterlinkFault
                        ? '✕ Bottom Interlink Fault'
                        : '● VDAN Proxy Active (A & B)'}
                    </text>
                    <image
                      href={getHardwarePhoto('HIRSCHMANN_RED25')}
                      x="542"
                      y="514"
                      width="76"
                      height="118"
                      preserveAspectRatio="xMidYMid meet"
                    />
                  </g>

                  {/* BOTTOM: Legacy SAN IED Connected to Bottom RED25 #2 Interlink */}
                  <g className="cursor-pointer" onClick={() => setHsrBottomInterlinkFault((v) => !v)}>
                    <image
                      href={getHardwarePhoto('LEGACY_SAN_IED')}
                      x="510"
                      y="656"
                      width="140"
                      height="80"
                      preserveAspectRatio="xMidYMid meet"
                      opacity={hsrSimulation.legacySanReachable ? 1 : 0.65}
                    />
                    <text x="674" y="676" textAnchor="start" fill="#FFFFFF" fontSize="11.5" fontWeight="bold">
                      Legacy SAN IED
                    </text>
                    <text x="674" y="689" textAnchor="start" fill="#D8B4FE" fontSize="9.2">
                      Single-Attached (Normal Ethernet)
                    </text>
                    <text x="674" y="703" textAnchor="start" fill="#E9D5FF" fontSize="9.6" fontFamily="monospace" fontWeight="bold">
                      IP: 192.168.10.25 · SAN
                    </text>
                    <text
                      x="674"
                      y="717"
                      textAnchor="start"
                      fill={hsrSimulation.legacySanReachable ? '#4ADE80' : '#FF5C65'}
                      fontSize="9.2"
                      fontWeight="bold"
                    >
                      {hsrSimulation.legacySanReachable
                        ? '✓ Online via RED25 #2 → HSR Ring'
                        : hsrBottomInterlinkFault
                        ? '✕ Bottom Interlink Cut (SAN Offline)'
                        : hsrInterlinkFault
                        ? '✕ Top Interlink Cut (No SCADA)'
                        : '✕ Isolated (Ring Partitioned)'}
                    </text>
                  </g>

                  {/* 6 HSR Ring DANH IEDs (Zero Boxes — Realistic Hardware Cutouts) */}
                  {HSR_NODES.map((node) => {
                    const isReachable = hsrSimulation.reachableNodeIndices.includes(node.index);
                    const imgW = node.index === 2 ? 80 : 74;
                    const imgH = node.index === 2 ? 84 : 92;
                    const imgX = node.cx - imgW / 2;
                    const imgY = node.cy - imgH / 2;
                    const textX =
                      node.labelSide === 'left'
                        ? imgX - 10
                        : node.labelSide === 'right'
                        ? imgX + imgW + 10
                        : node.cx;
                    const textAnchor =
                      node.labelSide === 'left' ? 'end' : node.labelSide === 'right' ? 'start' : 'middle';
                    const textBaseY = node.labelSide === 'bottom' ? imgY + imgH + 13 : node.cy - 22;

                    return (
                      <g
                        key={`HSR-DEV-${node.id}`}
                        className="cursor-pointer"
                        onClick={() => handleSelectDevice(node.id, true)}
                      >
                        <title>
                          {`${node.name} (${node.ip}) — ${
                            isReachable
                              ? hsrSimulation.cutCount === 0
                                ? 'HSR Dual-Path Online (CW + CCW)'
                                : 'HSR Single-Path Surviving via RED25 #1'
                              : 'ISOLATED FROM REDBOX / STATION BUS'
                          }`}
                        </title>
                        <image
                          href={node.img}
                          x={imgX}
                          y={imgY}
                          width={imgW}
                          height={imgH}
                          preserveAspectRatio="xMidYMid meet"
                          opacity={isReachable ? 1 : 0.58}
                        />
                        <text x={textX} y={textBaseY} textAnchor={textAnchor} fill="#FFFFFF" fontSize="10.6" fontWeight="bold">
                          {node.name}
                        </text>
                        <text x={textX} y={textBaseY + 13} textAnchor={textAnchor} fill="#00D4FF" fontSize="9.6" fontFamily="monospace" fontWeight="bold">
                          {node.ip}
                        </text>
                        <text x={textX} y={textBaseY + 25} textAnchor={textAnchor} fill="#FACC15" fontSize="8.4" fontFamily="monospace">
                          {node.hsrInterfaceNote}
                        </text>
                        <text
                          x={textX}
                          y={textBaseY + 37}
                          textAnchor={textAnchor}
                          fill={!isReachable ? '#FF5C65' : hsrSimulation.cutCount === 0 ? '#4ADE80' : '#FACC15'}
                          fontSize="8.4"
                          fontWeight="bold"
                        >
                          {!isReachable
                            ? '✖ ISOLATED (NO REDBOX)'
                            : !node.nativeHsr
                            ? '● EXT. HSR ADAPTER OK'
                            : hsrSimulation.cutCount === 0
                            ? '● DUAL-PATH HSR OK'
                            : '▲ SURVIVING PATH OK'}
                        </text>
                      </g>
                    );
                  })}

                  {/* ================= LAYER 2: SAN SWITCH CABLES + INTERLINKS + 8 HSR RING SEGMENTS ================= */}

                  {/* Station SAN Devices (4) -> SAN Switch (P1..P4) */}
                  {[
                    { id: 'SAN-P1', d: 'M 300 72 C 300 104, 524 96, 524 134', delay: 0.1 },
                    { id: 'SAN-P2', d: 'M 485 78 C 485 104, 556 100, 556 134', delay: 0.3 },
                    { id: 'SAN-P3', d: 'M 675 78 C 675 104, 588 100, 588 134', delay: 0.5 },
                    { id: 'SAN-P4', d: 'M 860 72 C 860 104, 620 96, 620 134', delay: 0.7 },
                  ].map((lnk) => (
                    <g key={lnk.id}>
                      <path d={lnk.d} fill="none" stroke="#38BDF8" strokeWidth="2.4" opacity={0.9} />
                      {packetsPlaying && !hsrInterlinkFault && (
                        <CablePacket path={lnk.d} color="#7DD3FC" active={true} duration={packetDuration} delay={lnk.delay} radius={2.6} />
                      )}
                    </g>
                  ))}

                  {/* Interlink #1: SAN Switch P5 (620, 174) -> Top RED25 #1 SAN Port (605, 305) */}
                  {(() => {
                    const d1 = 'M 620 174 C 652 174, 652 305, 605 305';
                    const d1Rev = 'M 605 305 C 652 305, 652 174, 620 174';
                    const up = !hsrInterlinkFault;
                    return (
                      <g className="cursor-pointer" onClick={() => setHsrInterlinkFault((v) => !v)}>
                        <path d={d1} fill="none" stroke={up ? '#C084FC' : '#FF5C65'} strokeWidth="3.2" strokeDasharray={up ? undefined : '6 4'} />
                        {packetsPlaying && up && hsrSimulation.reachableNodeIndices.length > 0 && (
                          <>
                            <CablePacket path={d1} color="#E879F9" active={true} duration={packetDuration} delay={0.1} radius={2.9} />
                            <CablePacket path={d1Rev} color="#C084FC" active={true} duration={packetDuration} delay={0.6} radius={2.5} />
                          </>
                        )}
                        <rect x="656" y="218" width="106" height="24" rx="5" fill="#1E1038" stroke={up ? '#C084FC' : '#FF5C65'} strokeWidth="1.2" />
                        <text x="709" y="233" textAnchor="middle" fill="#F3E8FF" fontSize="8.6" fontWeight="bold">
                          Interlink #1 (SAN)
                        </text>
                      </g>
                    );
                  })()}

                  {/* Interlink #2: Bottom RED25 #2 SAN Port (605, 613) -> Legacy SAN IED Physical RJ45 (598, 724) */}
                  {(() => {
                    const d2 = 'M 605 613 C 660 613, 660 724, 598 724';
                    const d2Rev = 'M 598 724 C 660 724, 660 613, 605 613';
                    const up = !hsrBottomInterlinkFault;
                    return (
                      <g className="cursor-pointer" onClick={() => setHsrBottomInterlinkFault((v) => !v)}>
                        <path d={d2} fill="none" stroke={up ? '#E879F9' : '#FF5C65'} strokeWidth="3.2" strokeDasharray={up ? undefined : '6 4'} />
                        {packetsPlaying && hsrSimulation.legacySanReachable && (
                          <>
                            <CablePacket path={d2} color="#F0ABFC" active={true} duration={packetDuration} delay={0.2} radius={2.9} />
                            <CablePacket path={d2Rev} color="#C084FC" active={true} duration={packetDuration} delay={0.7} radius={2.5} />
                          </>
                        )}
                        <rect x="658" y="622" width="106" height="24" rx="5" fill="#2A103D" stroke={up ? '#E879F9' : '#FF5C65'} strokeWidth="1.2" />
                        <text x="711" y="637" textAnchor="middle" fill="#FAE8FF" fontSize="8.6" fontWeight="bold">
                          Interlink #2 (SAN)
                        </text>
                      </g>
                    );
                  })()}

                  {/* 8 Identifiable HSR Ring Fiber Segments (Top RED25 #1 + 6 IEDs + Bottom RED25 #2) */}
                  {HSR_SEGMENTS.map((seg) => {
                    const isBroken = hsrCutSegments.includes(seg.index);
                    const isSelected = hsrSelectedSegment === seg.index;
                    const endpointsConnected =
                      hsrSimulation.componentOf[seg.fromIdx] === hsrSimulation.componentOf[seg.toIdx];
                    const segCarriesTraffic = !isBroken && packetsPlaying;

                    return (
                      <g
                        key={seg.id}
                        className="cursor-pointer"
                        onClick={() => toggleHsrSegmentCutImmediate(seg.index)}
                      >
                        <title>
                          {`${seg.label} (${seg.endpointsText}) — Status: ${
                            isBroken
                              ? endpointsConnected
                                ? 'FIBER CUT (Alternate Ring Path Active)'
                                : 'FIBER CUT (Partitioned!)'
                              : 'HEALTHY (1000BASE-LX HSR Fiber)'
                          }. Click to ${isBroken ? 'restore' : 'cut'}.`}
                        </title>
                        <path d={seg.path} fill="none" stroke="transparent" strokeWidth="18" />

                        {!isBroken ? (
                          <>
                            <path
                              d={seg.path}
                              fill="none"
                              stroke={isSelected ? '#FFFFFF' : '#00E5FF'}
                              strokeWidth={isSelected ? 6.2 : 4.8}
                              opacity={0.32}
                              filter="url(#hsrCyanGlow)"
                            />
                            <path
                              d={seg.path}
                              fill="none"
                              stroke={isSelected ? '#77F2FF' : '#00E5FF'}
                              strokeWidth={isSelected ? 3.8 : 3}
                              strokeLinecap="round"
                            />
                            {/* CW A-Frame (Green) */}
                            <CablePacket
                              path={seg.path}
                              color="#22C55E"
                              active={segCarriesTraffic}
                              duration={packetDuration}
                              delay={seg.index * 0.13}
                              radius={3.1}
                            />
                            {/* CCW B-Frame (Cyan) */}
                            <CablePacket
                              path={seg.revPath}
                              color="#00E5FF"
                              active={segCarriesTraffic && hsrSimulation.ringState === 'CLOSED'}
                              duration={packetDuration * 1.08}
                              delay={seg.index * 0.13 + 0.24}
                              radius={2.7}
                            />
                          </>
                        ) : (
                          <>
                            <path
                              d={seg.path}
                              fill="none"
                              stroke="#FF4D5E"
                              strokeWidth="3.4"
                              strokeDasharray="7 5"
                              filter="url(#hsrRedGlow)"
                            />
                            <circle cx={seg.midX} cy={seg.midY} r="12" fill="#040D1A" stroke="#FF4D5E" strokeWidth="2.2" />
                            <line x1={seg.midX - 5} y1={seg.midY - 5} x2={seg.midX + 5} y2={seg.midY + 5} stroke="#FF4D5E" strokeWidth="2.5" strokeLinecap="round" />
                            <line x1={seg.midX + 5} y1={seg.midY - 5} x2={seg.midX - 5} y2={seg.midY + 5} stroke="#FF4D5E" strokeWidth="2.5" strokeLinecap="round" />
                          </>
                        )}

                        {/* Segment Callout Badge */}
                        <g transform={`translate(${seg.badgeX}, ${seg.badgeY})`}>
                          <rect
                            x="-36"
                            y="-10"
                            width="72"
                            height="20"
                            rx="5"
                            fill={isBroken ? '#3B0D15' : '#091E36'}
                            stroke={isBroken ? '#FF4D5E' : isSelected ? '#FFFFFF' : '#38BDF8'}
                            strokeWidth={isBroken || isSelected ? 1.6 : 1.1}
                          />
                          <text x="0" y="3" textAnchor="middle" fill={isBroken ? '#FDA4AF' : '#E2F1FF'} fontSize="8.8" fontWeight="bold">
                            {isBroken ? `✖ Seg #${seg.segNum}` : `Seg #${seg.segNum}`}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Center Ring Status Readout */}
                  <text x="580" y="396" textAnchor="middle" fill="#00D4FF" fontSize="14.5" fontWeight="bold" letterSpacing="0.5">
                    HSR 0x892F COUNTER-ROTATING RING
                  </text>
                  <text
                    x="580"
                    y="416"
                    textAnchor="middle"
                    fill={
                      hsrSimulation.ringState === 'CLOSED'
                        ? '#4ADE80'
                        : hsrSimulation.ringState === 'OPEN'
                        ? '#FACC15'
                        : '#FF5C65'
                    }
                    fontSize="10.6"
                    fontWeight="bold"
                  >
                    {hsrSimulation.statusHeadline}
                  </text>
                  <text x="580" y="433" textAnchor="middle" fill="#93C5FD" fontSize="9.2" fontFamily="monospace">
                    {hsrSimulation.ringState === 'CLOSED'
                      ? 'Dual RedBox (Top SAN Switch + Bottom Legacy SAN IED) • 0 ms Recovery • 8/8 Segments Healthy'
                      : hsrSimulation.ringState === 'OPEN'
                      ? 'Zero-Recovery-Time (0 ms) Surviving Path Active • 6/6 DANH IEDs & RED25 #2 Reachable'
                      : `Partitioned (${hsrSimulation.components.length} Sub-Graphs) • Reachable: ${hsrSimulation.reachableNodeIndices.length}/6 • Isolated: ${hsrSimulation.isolatedNodeIndices.length}/6`}
                  </text>

                  {/* ================= LAYER 3: ON-DEVICE CLICKABLE PORT JACKS ================= */}

                  {/* Top 4 Station SAN Device Jacks */}
                  {[
                    { x: 300, y: 72 },
                    { x: 485, y: 78 },
                    { x: 675, y: 78 },
                    { x: 860, y: 72 },
                  ].map((pt, idx) => (
                    <g key={`SAN-DEV-JACK-${idx}`}>
                      <rect x={pt.x - 6} y={pt.y - 5} width="12" height="10" rx="2" fill="#040D1A" stroke="#38BDF8" strokeWidth="1.4" />
                      <circle cx={pt.x} cy={pt.y} r="2" fill="#7DD3FC" />
                    </g>
                  ))}

                  {/* SAN Ethernet Switch On-Faceplate Ports (P1..P4 Top, P5 Uplink Bottom) */}
                  {[
                    { x: 524, y: 134, lbl: 'P1', col: '#38BDF8' },
                    { x: 556, y: 134, lbl: 'P2', col: '#38BDF8' },
                    { x: 588, y: 134, lbl: 'P3', col: '#38BDF8' },
                    { x: 620, y: 134, lbl: 'P4', col: '#38BDF8' },
                    { x: 620, y: 174, lbl: 'P5', col: !hsrInterlinkFault ? '#C084FC' : '#FF5C65' },
                  ].map((sp) => (
                    <g key={`SANSW-${sp.lbl}`} className="cursor-pointer" onClick={() => sp.lbl === 'P5' && setHsrInterlinkFault((v) => !v)}>
                      <rect x={sp.x - 6.5} y={sp.y - 5.5} width="13" height="11" rx="2" fill="#040D1A" stroke={sp.col} strokeWidth="1.4" />
                      <circle cx={sp.x} cy={sp.y} r="2" fill={sp.col} />
                      <text x={sp.x} y={sp.lbl === 'P5' ? sp.y + 15 : sp.y - 8} textAnchor="middle" fill={sp.col} fontSize="7.8" fontWeight="bold" paintOrder="stroke" stroke="#030A16" strokeWidth="2.5">
                        {sp.lbl}
                      </text>
                    </g>
                  ))}

                  {/* Top RED25 #1 On-Faceplate Ports: A (584,262), B (585,279), SAN (605,305) */}
                  {[
                    { x: 584, y: 262, label: 'A', color: '#00E5FF', down: hsrCutSegments.includes(7), segIdx: 7 },
                    { x: 585, y: 279, label: 'B', color: '#22C55E', down: hsrCutSegments.includes(0), segIdx: 0 },
                  ].map((rp) => (
                    <g key={`RED1-${rp.label}`} className="cursor-pointer" onClick={() => toggleHsrSegmentCutImmediate(rp.segIdx)}>
                      <rect x={rp.x - 6.5} y={rp.y - 5.5} width="13" height="11" rx="2" fill="#040D1A" stroke={rp.down ? '#FF5C65' : rp.color} strokeWidth="1.5" />
                      <circle cx={rp.x} cy={rp.y} r="2.2" fill={rp.down ? '#FF5C65' : rp.color} />
                      <text x={rp.x - 10} y={rp.y + 3} textAnchor="end" fill={rp.down ? '#FF5C65' : rp.color} fontSize="8" fontWeight="bold" paintOrder="stroke" stroke="#030A16" strokeWidth="2.5">
                        {rp.label}
                      </text>
                    </g>
                  ))}
                  <g className="cursor-pointer" onClick={() => setHsrInterlinkFault((v) => !v)}>
                    <rect x={605 - 6.5} y={305 - 5.5} width="13" height="11" rx="2" fill="#040D1A" stroke={!hsrInterlinkFault ? '#C084FC' : '#FF5C65'} strokeWidth="1.5" />
                    <circle cx={605} cy={305} r="2.2" fill={!hsrInterlinkFault ? '#E879F9' : '#FF5C65'} />
                  </g>

                  {/* Bottom RED25 #2 On-Faceplate Ports: A (584,570), B (585,587), SAN (605,613) */}
                  {[
                    { x: 584, y: 570, label: 'A', color: '#00E5FF', down: hsrCutSegments.includes(4), segIdx: 4 },
                    { x: 585, y: 587, label: 'B', color: '#22C55E', down: hsrCutSegments.includes(3), segIdx: 3 },
                  ].map((rp) => (
                    <g key={`RED2-${rp.label}`} className="cursor-pointer" onClick={() => toggleHsrSegmentCutImmediate(rp.segIdx)}>
                      <rect x={rp.x - 6.5} y={rp.y - 5.5} width="13" height="11" rx="2" fill="#040D1A" stroke={rp.down ? '#FF5C65' : rp.color} strokeWidth="1.5" />
                      <circle cx={rp.x} cy={rp.y} r="2.2" fill={rp.down ? '#FF5C65' : rp.color} />
                      <text x={rp.x - 10} y={rp.y + 3} textAnchor="end" fill={rp.down ? '#FF5C65' : rp.color} fontSize="8" fontWeight="bold" paintOrder="stroke" stroke="#030A16" strokeWidth="2.5">
                        {rp.label}
                      </text>
                    </g>
                  ))}
                  <g className="cursor-pointer" onClick={() => setHsrBottomInterlinkFault((v) => !v)}>
                    <rect x={605 - 6.5} y={613 - 5.5} width="13" height="11" rx="2" fill="#040D1A" stroke={!hsrBottomInterlinkFault ? '#E879F9' : '#FF5C65'} strokeWidth="1.5" />
                    <circle cx={605} cy={613} r="2.2" fill={hsrSimulation.legacySanReachable ? '#F0ABFC' : '#FF5C65'} />
                  </g>

                  {/* Legacy SAN IED On-Faceplate RJ45 Port (598, 724) */}
                  <g className="cursor-pointer" onClick={() => setHsrBottomInterlinkFault((v) => !v)}>
                    <rect x={598 - 6.5} y={724 - 5.5} width="13" height="11" rx="2" fill="#040D1A" stroke={!hsrBottomInterlinkFault ? '#E879F9' : '#FF5C65'} strokeWidth="1.5" />
                    <circle cx={598} cy={724} r="2.2" fill={hsrSimulation.legacySanReachable ? '#F0ABFC' : '#FF5C65'} />
                    <text x="598" y="744" textAnchor="middle" fill={!hsrBottomInterlinkFault ? '#F0ABFC' : '#FF5C65'} fontSize="8" fontWeight="bold" paintOrder="stroke" stroke="#030A16" strokeWidth="2.5">
                      ETH
                    </text>
                  </g>

                  {/* 6 HSR Ring IED On-Device Port A & Port B Jacks */}
                  {HSR_NODES.map((node) => {
                    const isReachable = hsrSimulation.reachableNodeIndices.includes(node.index);
                    const col = isReachable ? '#00E5FF' : '#FF5C65';
                    return (
                      <g key={`IED-HSR-PORTS-${node.id}`}>
                        {[
                          { pt: node.portA, lbl: 'A' },
                          { pt: node.portB, lbl: 'B' },
                        ].map((p) => (
                          <g key={p.lbl}>
                            <rect x={p.pt.x - 6} y={p.pt.y - 5} width="12" height="10" rx="2" fill="#040D1A" stroke={col} strokeWidth="1.4" />
                            <circle cx={p.pt.x} cy={p.pt.y} r="2" fill={col} />
                          </g>
                        ))}
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Section 7: HSR Live Monitoring Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">Ring State</div>
                  <div
                    className={`text-xs font-extrabold font-mono mt-0.5 ${
                      hsrSimulation.ringState === 'CLOSED'
                        ? 'text-[#4ADE80]'
                        : hsrSimulation.ringState === 'OPEN'
                        ? 'text-[#FACC15]'
                        : 'text-[#FF5C65]'
                    }`}
                  >
                    {hsrSimulation.ringState}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">Healthy Segments</div>
                  <div className="text-xs font-extrabold text-[#4ADE80] font-mono mt-0.5">
                    {HSR_SEGMENTS.length - hsrCutSegments.length} / {HSR_SEGMENTS.length}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">Failed Segments</div>
                  <div className={`text-xs font-extrabold font-mono mt-0.5 ${hsrCutSegments.length === 0 ? 'text-slate-400' : 'text-[#FF5C65]'}`}>
                    {hsrCutSegments.length === 0 ? '0 (None)' : `${hsrCutSegments.length} (${hsrCutSegments.map((i) => `#${i + 1}`).join(',')})`}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">Reachable IEDs</div>
                  <div className="text-xs font-extrabold text-[#00CFFF] font-mono mt-0.5">
                    {hsrSimulation.reachableNodeIndices.length} / 6 Online
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">SAN Switch → RED25 #1</div>
                  <div className={`text-xs font-extrabold font-mono mt-0.5 ${!hsrInterlinkFault ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}`}>
                    {!hsrInterlinkFault ? 'Interlink UP' : 'Interlink Cut'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">RED25 #2 → SAN IED</div>
                  <div className={`text-xs font-extrabold font-mono mt-0.5 ${hsrSimulation.legacySanReachable ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}`}>
                    {hsrSimulation.legacySanReachable ? 'Online (VDAN)' : 'Isolated'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">MMS Association</div>
                  <div className={`text-xs font-extrabold font-mono mt-0.5 ${!hsrInterlinkFault && hsrSimulation.isolatedNodeIndices.length === 0 ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}`}>
                    {hsrInterlinkFault ? '0/6 (SAN Cut)' : `${hsrSimulation.reachableNodeIndices.length}/6 Connected`}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">PTP Sync / Alarms</div>
                  <div className={`text-xs font-extrabold font-mono mt-0.5 ${!hsrInterlinkFault && !hsrBottomInterlinkFault && hsrCutSegments.length === 0 ? 'text-[#4ADE80]' : 'text-[#FACC15]'}`}>
                    {hsrInterlinkFault ? '0/6 Locked' : `${hsrSimulation.reachableNodeIndices.length}/6 Locked`} • {hsrCutSegments.length + (hsrInterlinkFault ? 1 : 0) + (hsrBottomInterlinkFault ? 1 : 0)} Alm
                  </div>
                </div>
              </div>

              {/* Section 8: HSR Fault & Recovery Event Log */}
              <div className="rounded-lg bg-[#061325] border border-[#193B5E] p-2.5 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#77E7FF]">
                    HSR Ring Fiber Fault &amp; Recovery Event Log (IEC 62439-3 Supervision)
                  </span>
                  <span className="text-[10px] font-mono text-[#8BB3D4]">
                    Showing latest {hsrEventLog.length} events
                  </span>
                </div>
                <div className="max-h-[115px] overflow-y-auto overflow-x-auto">
                  <table className="w-full text-left border-collapse font-mono text-[10px]">
                    <thead>
                      <tr className="border-b border-[#163452] text-[#8BB3D4]">
                        <th className="py-1 pr-2">Timestamp</th>
                        <th className="py-1 px-2">Segment</th>
                        <th className="py-1 px-2">Affected Endpoints</th>
                        <th className="py-1 px-2">Severity</th>
                        <th className="py-1 px-2">Event Type</th>
                        <th className="py-1 pl-2">Ring &amp; Path Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#10263F]">
                      {hsrEventLog.map((ev) => (
                        <tr key={ev.id} className="hover:bg-[#0B2038]">
                          <td className="py-1 pr-2 text-[#00CFFF] whitespace-nowrap">{ev.timestamp}</td>
                          <td className="py-1 px-2 text-white font-bold whitespace-nowrap">{ev.segmentLabel}</td>
                          <td className="py-1 px-2 text-slate-300 whitespace-nowrap">{ev.affectedDevices}</td>
                          <td className="py-1 px-2 whitespace-nowrap">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                ev.severity === 'CRITICAL'
                                  ? 'bg-[#FF5C65]/20 text-[#FF5C65]'
                                  : ev.severity === 'WARNING'
                                  ? 'bg-[#FACC15]/20 text-[#FACC15]'
                                  : 'bg-[#22C55E]/20 text-[#4ADE80]'
                              }`}
                            >
                              {ev.severity}
                            </span>
                          </td>
                          <td className="py-1 px-2 text-white whitespace-nowrap">{ev.eventType}</td>
                          <td className="py-1 pl-2 text-[#DCEAF5]">{ev.statusText}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4B: PRP / HSR COUPLING (IEC 62439-3 CLAUSE 6 — DUAL REDBOX ARCHITECTURE) */}
          {activeView === 'PRP_HSR_COUPLING' && (() => {
            const topStationDevices = [
              { id: 'SRV-SCADA-A', title: 'SCADA Server A', ip: '192.168.10.10', role: 'MMS Client · DANP', img: TOPO_EXACT_IMAGES.DELL_R750, cx: 220, imgX: 162, imgY: 32, imgW: 116, imgH: 42, ethA: { x: 196, y: 74 }, ethB: { x: 244, y: 74 } },
              { id: 'WS-HMI-01', title: 'Operator HMI WS', ip: '192.168.10.20', role: 'Dual Console · DANP', img: TOPO_EXACT_IMAGES.HMI_DUAL, cx: 500, imgX: 456, imgY: 28, imgW: 88, imgH: 50, ethA: { x: 478, y: 78 }, ethB: { x: 522, y: 78 } },
              { id: 'GTW-RCC-01', title: 'Station Gateway', ip: '192.168.10.30', role: '61850 ↔ 104 · DANP', img: TOPO_EXACT_IMAGES.MOXA_MGATE, cx: 880, imgX: 842, imgY: 28, imgW: 76, imgH: 50, ethA: { x: 860, y: 78 }, ethB: { x: 900, y: 78 } },
              { id: 'CLK-PTP-GM', title: 'Time Server (PTP)', ip: '192.168.10.100', role: 'IEEE 1588v2 GM · DANP', img: TOPO_EXACT_IMAGES.MEINBERG_M400, cx: 1160, imgX: 1102, imgY: 34, imgW: 116, imgH: 38, ethA: { x: 1136, y: 72 }, ethB: { x: 1184, y: 72 } },
            ];

            // 6 DANH IEDs + Node 6 (RED25-A) + Node 7 (RED25-B) in an 8-node closed HSR Ring
            const couplingIeds = [
              { index: 0, id: 'IED-33-F03', name: 'SIPROTEC 5 7SJ85', shortName: '7SJ85', ip: '192.168.10.11', img: TOPO_EXACT_IMAGES.SIEMENS_7SJ85, cx: 190, cy: 525, labelSide: 'left' as const, portA: { x: 190, y: 572 }, portB: { x: 228, y: 510 } },
              { index: 1, id: 'IED-11-F01', name: 'ABB Relion REF615', shortName: 'REF615', ip: '192.168.10.12', img: TOPO_EXACT_IMAGES.ABB_REF615, cx: 1190, cy: 525, labelSide: 'right' as const, portA: { x: 1152, y: 510 }, portB: { x: 1190, y: 572 } },
              { index: 2, id: 'IED-132-BC', name: 'Schneider MiCOM C264', shortName: 'MiCOM C264', ip: '192.168.10.13', img: TOPO_EXACT_IMAGES.SCHNEIDER_C264, cx: 1130, cy: 668, labelSide: 'right' as const, portA: { x: 1152, y: 626 }, portB: { x: 1090, y: 682 } },
              { index: 3, id: 'IED-33-F02', name: 'GE Multilin 850', shortName: 'Multilin 850', ip: '192.168.10.14', img: TOPO_EXACT_IMAGES.GE_850, cx: 860, cy: 702, labelSide: 'bottom' as const, portA: { x: 898, y: 696 }, portB: { x: 822, y: 696 } },
              { index: 4, id: 'IED-132-T1', name: 'SIPROTEC 5 7UT86', shortName: '7UT86', ip: '192.168.10.15', img: TOPO_EXACT_IMAGES.SIEMENS_7UT86, cx: 520, cy: 702, labelSide: 'bottom' as const, portA: { x: 558, y: 696 }, portB: { x: 482, y: 696 } },
              { index: 5, id: 'IED-132-T2', name: 'ABB Relion RET615', shortName: 'RET615', ip: '192.168.10.16', img: TOPO_EXACT_IMAGES.ABB_RET615, cx: 250, cy: 668, labelSide: 'left' as const, portA: { x: 290, y: 682 }, portB: { x: 228, y: 626 } },
            ];

            // Node 6 = RED25-A (cx=450, cy=400), Node 7 = RED25-B (cx=930, cy=400)
            const couplingRingSegs = [
              { index: 0, segNum: 1, fromIdx: 6, toIdx: 7, label: 'Seg #1 · RED25-A ↔ RED25-B', path: 'M 464 422 L 916 422', revPath: 'M 916 422 L 464 422', midX: 690, midY: 422, badgeX: 690, badgeY: 400 },
              { index: 1, segNum: 2, fromIdx: 7, toIdx: 1, label: 'Seg #2 · RED25-B ↔ REF615', path: 'M 960 442 C 1050 442, 1085 510, 1152 510', revPath: 'M 1152 510 C 1085 510, 1050 442, 960 442', midX: 1068, midY: 476, badgeX: 1088, badgeY: 448 },
              { index: 2, segNum: 3, fromIdx: 1, toIdx: 2, label: 'Seg #3 · REF615 ↔ C264', path: 'M 1190 572 C 1190 598, 1170 612, 1152 626', revPath: 'M 1152 626 C 1170 612, 1190 598, 1190 572', midX: 1176, midY: 602, badgeX: 1236, badgeY: 602 },
              { index: 3, segNum: 4, fromIdx: 2, toIdx: 3, label: 'Seg #4 · C264 ↔ Multilin 850', path: 'M 1090 682 C 1030 696, 960 696, 898 696', revPath: 'M 898 696 C 960 696, 1030 696, 1090 682', midX: 996, midY: 694, badgeX: 996, badgeY: 722 },
              { index: 4, segNum: 5, fromIdx: 3, toIdx: 4, label: 'Seg #5 · Multilin 850 ↔ 7UT86', path: 'M 822 696 L 558 696', revPath: 'M 558 696 L 822 696', midX: 690, midY: 696, badgeX: 690, badgeY: 724 },
              { index: 5, segNum: 6, fromIdx: 4, toIdx: 5, label: 'Seg #6 · 7UT86 ↔ RET615', path: 'M 482 696 C 420 696, 350 696, 290 682', revPath: 'M 290 682 C 350 696, 420 696, 482 696', midX: 384, midY: 694, badgeX: 384, badgeY: 722 },
              { index: 6, segNum: 7, fromIdx: 5, toIdx: 0, label: 'Seg #7 · RET615 ↔ 7SJ85', path: 'M 228 626 C 210 612, 190 598, 190 572', revPath: 'M 190 572 C 190 598, 210 612, 228 626', midX: 204, midY: 602, badgeX: 144, badgeY: 602 },
              { index: 7, segNum: 8, fromIdx: 0, toIdx: 6, label: 'Seg #8 · 7SJ85 ↔ RED25-A', path: 'M 228 510 C 295 510, 330 442, 420 442', revPath: 'M 420 442 C 330 442, 295 510, 228 510', midX: 312, midY: 476, badgeX: 292, badgeY: 448 },
            ];

            const lanAUp = !couplingLanAFault && !lanAFaultActive;
            const lanBUp = !couplingLanBFault && !lanBFaultActive;
            const redboxAUp = !couplingRedboxAFault;
            const redboxBUp = !couplingRedboxBFault;
            const planeACouplingUp = lanAUp && redboxAUp;
            const planeBCouplingUp = lanBUp && redboxBUp;

            // Multi-source BFS from active coupling RedBoxes (Node 6 = RED25-A, Node 7 = RED25-B)
            const adj: number[][] = Array.from({ length: 8 }, () => []);
            couplingRingSegs.forEach((seg) => {
              if (!couplingHsrCuts.includes(seg.index)) {
                const uOk = (seg.fromIdx !== 6 || redboxAUp) && (seg.fromIdx !== 7 || redboxBUp);
                const vOk = (seg.toIdx !== 6 || redboxAUp) && (seg.toIdx !== 7 || redboxBUp);
                if (uOk && vOk) {
                  adj[seg.fromIdx].push(seg.toIdx);
                  adj[seg.toIdx].push(seg.fromIdx);
                }
              }
            });

            const bfsFrom = (startNode: number) => {
              const vis = new Set<number>();
              const q = [startNode];
              vis.add(startNode);
              while (q.length > 0) {
                const cur = q.shift()!;
                for (const nxt of adj[cur]) {
                  if (!vis.has(nxt)) {
                    vis.add(nxt);
                    q.push(nxt);
                  }
                }
              }
              return vis;
            };

            const reachViaA = planeACouplingUp ? bfsFrom(6) : new Set<number>();
            const reachViaB = planeBCouplingUp ? bfsFrom(7) : new Set<number>();
            const reachableIeds = couplingIeds.filter((n) => reachViaA.has(n.index) || reachViaB.has(n.index));
            const isolatedIeds = couplingIeds.filter((n) => !reachViaA.has(n.index) && !reachViaB.has(n.index));

            const toggleCouplingSegCut = (segIdx: number) => {
              setCouplingHsrCuts((prev) =>
                prev.includes(segIdx) ? prev.filter((x) => x !== segIdx) : [...prev, segIdx].sort((a, b) => a - b)
              );
            };

            const restoreAllCoupling = () => {
              setCouplingLanAFault(false);
              setCouplingLanBFault(false);
              setCouplingRedboxAFault(false);
              setCouplingRedboxBFault(false);
              setCouplingHsrCuts([]);
              if (lanAFaultActive) toggleFaultScenario('FLT-11');
              if (lanBFaultActive) toggleFaultScenario('FLT-12');
            };

            const activeCouplingScenario =
              !planeACouplingUp && !planeBCouplingUp
                ? 7
                : couplingHsrCuts.length >= 2
                ? 6
                : (!planeACouplingUp || !planeBCouplingUp) && couplingHsrCuts.length === 1
                ? 5
                : couplingHsrCuts.length === 1
                ? 4
                : !planeBCouplingUp
                ? 3
                : !planeACouplingUp
                ? 2
                : 1;

            return (
              <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-3.5 space-y-3 shadow-xl">
                {/* Header & Interactive Fault Controls */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#15314E] pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#2A1452] border border-[#C084FC] text-[#E9D5FF] text-[10px] font-mono font-extrabold">
                        IEC 62439-3 CLAUSE 6
                      </span>
                      <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                        PRP / HSR COUPLING — DUAL REDBOX ARCHITECTURE (ZERO SINGLE POINT OF FAILURE)
                      </h2>
                    </div>
                    <p className="text-xs text-[#8BB3D4] mt-0.5">
                      Couples the PRP Dual-LAN Station Bus (LAN A &amp; LAN B) to the HSR Bay Ring via two independent Hirschmann RED25 RedBoxes (HSR-PRP Mode, NetId = 1). Click any HSR fiber segment or fault button to test N-1 &amp; dual-fault survivability.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setCouplingLanAFault((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        !lanAUp ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#77E7FF] border-[#00CFFF]'
                      }`}
                    >
                      {!lanAUp ? 'Restore LAN A' : 'Fail LAN A'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCouplingLanBFault((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        !lanBUp ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#FDE047] border-[#FACC15]'
                      }`}
                    >
                      {!lanBUp ? 'Restore LAN B' : 'Fail LAN B'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCouplingRedboxAFault((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        !redboxAUp ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#93C5FD] border-[#38BDF8]/70'
                      }`}
                    >
                      {!redboxAUp ? 'Restore RED25-A' : 'Fail RED25-A'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setCouplingRedboxBFault((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        !redboxBUp ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#FDE047] border-[#F59E0B]/70'
                      }`}
                    >
                      {!redboxBUp ? 'Restore RED25-B' : 'Fail RED25-B'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleCouplingSegCut(3)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        couplingHsrCuts.includes(3) ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#D8B4FE] border-[#C084FC]/70'
                      }`}
                    >
                      {couplingHsrCuts.includes(3) ? 'Restore HSR Seg #4' : 'Cut HSR Seg #4'}
                    </button>
                    <button
                      type="button"
                      onClick={restoreAllCoupling}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-[#06281E] text-[#4ADE80] border-[#22C55E] hover:bg-[#0B3B2B] transition"
                    >
                      Restore All
                    </button>
                  </div>
                </div>

                {/* BIG PRP + DUAL REDBOX + HSR RING ARCHITECTURE SVG */}
                <div className="rounded-xl bg-gradient-to-b from-[#061325] via-[#040D1A] to-[#030914] border border-[#163452] p-2 overflow-x-auto">
                  <svg viewBox="0 0 1380 780" className="w-full h-auto min-w-[960px] select-none" aria-label="IEC 62439-3 Clause 6 PRP to HSR Dual RedBox Coupling Network">
                    <defs>
                      <filter id="cplCyanGlow" filterUnits="userSpaceOnUse" x="-40" y="-40" width="1460" height="860">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Subtle Zone Dividers (No Device Boxes) */}
                    <rect x="14" y="10" width="1352" height="272" rx="14" fill="#071528" fillOpacity="0.35" stroke="#16395E" strokeDasharray="6 5" />
                    <text x="28" y="28" fill="#77E7FF" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                      STATION BUS — PRP DUAL-LAN (IEC 62439-3 CLAUSE 4 · RCT 0x88FB)
                    </text>

                    <rect x="14" y="302" width="1352" height="466" rx="14" fill="#071226" fillOpacity="0.35" stroke="#2D3F73" strokeDasharray="6 5" />
                    <text x="28" y="322" fill="#E9D5FF" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                      BAY / PROCESS BUS — HSR RING (IEC 62439-3 CLAUSE 5 · TAG 0x892F) COUPLED VIA DUAL REDBOX (NetId = 1)
                    </text>

                    {/* ================= LAYER 1: HARDWARE DEVICES (ZERO BOXES) ================= */}

                    {/* TOP ROW: 4 Station-Level DANP Devices */}
                    {topStationDevices.map((st) => (
                      <g key={`CPL-TOP-${st.id}`} className="cursor-pointer" onClick={() => handleSelectDevice(st.id, true)}>
                        <text x={st.cx} y="19" textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="bold">{st.title}</text>
                        <image href={st.img} x={st.imgX} y={st.imgY} width={st.imgW} height={st.imgH} preserveAspectRatio="xMidYMid meet" />
                        <text x={st.cx} y="92" textAnchor="middle" fill="#00D4FF" fontSize="9.8" fontFamily="monospace" fontWeight="bold">{st.ip}</text>
                        <text x={st.cx} y="104" textAnchor="middle" fill="#94A3B8" fontSize="8.5">{st.role}</text>
                      </g>
                    ))}

                    {/* PRP Core Switches: Hirschmann RSP35 LAN A (Left) & LAN B (Right) */}
                    <g className="cursor-pointer" onClick={() => setCouplingLanAFault((v) => !v)}>
                      <text x="250" y="186" textAnchor="end" fill="#00CFFF" fontSize="12" fontWeight="bold">HIRSCHMANN RSP35 — LAN A</text>
                      <text x="250" y="200" textAnchor="end" fill="#CBD5E1" fontSize="9.5" fontFamily="monospace">192.168.10.2 · PRP Plane A</text>
                      <text x="250" y="214" textAnchor="end" fill={lanAUp ? '#4ADE80' : '#FF5C65'} fontSize="9.5" fontWeight="bold">
                        {lanAUp ? '● LAN A ONLINE (0xA)' : '✕ LAN A SWITCH FAULT'}
                      </text>
                      <image href={getHardwarePhoto('DIN_SWITCH')} x="266" y="160" width="178" height="86" preserveAspectRatio="xMidYMid meet" opacity={lanAUp ? 1 : 0.55} />
                    </g>

                    <g className="cursor-pointer" onClick={() => setCouplingLanBFault((v) => !v)}>
                      <text x="1130" y="186" textAnchor="start" fill="#FACC15" fontSize="12" fontWeight="bold">HIRSCHMANN RSP35 — LAN B</text>
                      <text x="1130" y="200" textAnchor="start" fill="#CBD5E1" fontSize="9.5" fontFamily="monospace">192.168.20.2 · PRP Plane B</text>
                      <text x="1130" y="214" textAnchor="start" fill={lanBUp ? '#4ADE80' : '#FF5C65'} fontSize="9.5" fontWeight="bold">
                        {lanBUp ? '● LAN B ONLINE (0xB)' : '✕ LAN B SWITCH FAULT'}
                      </text>
                      <image href={getHardwarePhoto('DIN_SWITCH')} x="936" y="160" width="178" height="86" preserveAspectRatio="xMidYMid meet" opacity={lanBUp ? 1 : 0.55} />
                    </g>

                    {/* DUAL COUPLING REDBOXES: Hirschmann RED25-A (Left) & RED25-B (Right) */}
                    <g className="cursor-pointer" onClick={() => setCouplingRedboxAFault((v) => !v)}>
                      <text x="394" y="362" textAnchor="end" fill="#FFFFFF" fontSize="12" fontWeight="bold">Hirschmann RED25-A</text>
                      <text x="394" y="376" textAnchor="end" fill="#77E7FF" fontSize="9.5">RedBox A · HSR-PRP (LAN A)</text>
                      <text x="394" y="390" textAnchor="end" fill="#C084FC" fontSize="9" fontFamily="monospace">NetId = 1 · LanId = 0xA</text>
                      <text x="394" y="404" textAnchor="end" fill={planeACouplingUp ? '#4ADE80' : '#FF5C65'} fontSize="9.3" fontWeight="bold">
                        {planeACouplingUp ? '● RCT ↔ HSR Proxy OK' : !redboxAUp ? '✕ RED25-A FAULTED' : '✕ LAN A DOWN'}
                      </text>
                      <image href={getHardwarePhoto('HIRSCHMANN_RED25')} x="406" y="336" width="84" height="132" preserveAspectRatio="xMidYMid meet" opacity={redboxAUp ? 1 : 0.5} />
                    </g>

                    <g className="cursor-pointer" onClick={() => setCouplingRedboxBFault((v) => !v)}>
                      <text x="986" y="362" textAnchor="start" fill="#FFFFFF" fontSize="12" fontWeight="bold">Hirschmann RED25-B</text>
                      <text x="986" y="376" textAnchor="start" fill="#FDE047" fontSize="9.5">RedBox B · HSR-PRP (LAN B)</text>
                      <text x="986" y="390" textAnchor="start" fill="#C084FC" fontSize="9" fontFamily="monospace">NetId = 1 · LanId = 0xB</text>
                      <text x="986" y="404" textAnchor="start" fill={planeBCouplingUp ? '#4ADE80' : '#FF5C65'} fontSize="9.3" fontWeight="bold">
                        {planeBCouplingUp ? '● RCT ↔ HSR Proxy OK' : !redboxBUp ? '✕ RED25-B FAULTED' : '✕ LAN B DOWN'}
                      </text>
                      <image href={getHardwarePhoto('HIRSCHMANN_RED25')} x="890" y="336" width="84" height="132" preserveAspectRatio="xMidYMid meet" opacity={redboxBUp ? 1 : 0.5} />
                    </g>

                    {/* 6 HSR Ring DANH Protection IEDs */}
                    {couplingIeds.map((node) => {
                      const okA = reachViaA.has(node.index);
                      const okB = reachViaB.has(node.index);
                      const okAny = okA || okB;
                      const imgW = node.index === 2 ? 82 : 76;
                      const imgH = node.index === 2 ? 86 : 94;
                      const imgX = node.cx - imgW / 2;
                      const imgY = node.cy - imgH / 2;
                      const tx = node.labelSide === 'left' ? imgX - 10 : node.labelSide === 'right' ? imgX + imgW + 10 : node.cx;
                      const anchor = node.labelSide === 'left' ? 'end' : node.labelSide === 'right' ? 'start' : 'middle';
                      const ty = node.labelSide === 'bottom' ? imgY + imgH + 14 : node.cy - 20;

                      return (
                        <g key={`CPL-IED-${node.id}`} className="cursor-pointer" onClick={() => handleSelectDevice(node.id, true)}>
                          <image href={node.img} x={imgX} y={imgY} width={imgW} height={imgH} preserveAspectRatio="xMidYMid meet" opacity={okAny ? 1 : 0.55} />
                          <text x={tx} y={ty} textAnchor={anchor} fill="#FFFFFF" fontSize="11" fontWeight="bold">{node.name}</text>
                          <text x={tx} y={ty + 13} textAnchor={anchor} fill="#00D4FF" fontSize="9.8" fontFamily="monospace" fontWeight="bold">{node.ip}</text>
                          <text x={tx} y={ty + 26} textAnchor={anchor} fill={okA && okB ? '#4ADE80' : okAny ? '#FACC15' : '#FF5C65'} fontSize="8.8" fontWeight="bold">
                            {okA && okB ? '● Dual Coupled (A & B)' : okA ? '▲ Via RED25-A (LAN A)' : okB ? '▲ Via RED25-B (LAN B)' : '✖ Isolated from PRP'}
                          </text>
                        </g>
                      );
                    })}

                    {/* ================= LAYER 2: PRP CABLES, COUPLING INTERLINKS & 8 HSR RING SEGMENTS ================= */}

                    {/* Station DANP Devices -> RSP35 LAN A (Cyan) & RSP35 LAN B (Gold) */}
                    {topStationDevices.map((st, idx) => {
                      const swAPortX = 294 + idx * 36;
                      const swBPortX = 964 + idx * 36;
                      const pathA = `M ${st.ethA.x} ${st.ethA.y} C ${st.ethA.x} 130, ${swAPortX} 122, ${swAPortX} 174`;
                      const pathB = `M ${st.ethB.x} ${st.ethB.y} C ${st.ethB.x} 134, ${swBPortX} 126, ${swBPortX} 174`;
                      return (
                        <g key={`CPL-PRP-CORDS-${st.id}`}>
                          <path d={pathA} fill="none" stroke={lanAUp ? '#00CFFF' : '#FF5C65'} strokeWidth="2.4" strokeDasharray={lanAUp ? undefined : '5 4'} opacity="0.88" />
                          <path d={pathB} fill="none" stroke={lanBUp ? '#FACC15' : '#FF5C65'} strokeWidth="2.4" strokeDasharray={lanBUp ? undefined : '5 4'} opacity="0.88" />
                          {packetsPlaying && lanAUp && <CablePacket path={pathA} color="#67E8F9" active={true} duration={packetDuration} delay={idx * 0.2} radius={2.6} />}
                          {packetsPlaying && lanBUp && <CablePacket path={pathB} color="#FEF08A" active={true} duration={packetDuration} delay={idx * 0.2 + 0.35} radius={2.6} />}
                        </g>
                      );
                    })}

                    {/* Coupling Uplink A: RSP35 LAN A (P5: 422, 232) -> RED25-A Interlink (474, 356) */}
                    {(() => {
                      const dA = 'M 422 232 C 422 288, 474 290, 474 356';
                      const dARev = 'M 474 356 C 474 290, 422 288, 422 232';
                      return (
                        <g>
                          <path d={dA} fill="none" stroke={planeACouplingUp ? '#00CFFF' : '#FF5C65'} strokeWidth="4.2" strokeDasharray={planeACouplingUp ? undefined : '6 5'} />
                          {packetsPlaying && planeACouplingUp && (
                            <>
                              <CablePacket path={dA} color="#00F0FF" active={true} duration={packetDuration} delay={0.1} radius={3.3} />
                              <CablePacket path={dARev} color="#4ADE80" active={true} duration={packetDuration} delay={0.65} radius={2.8} />
                            </>
                          )}
                          <rect x="466" y="274" width="128" height="24" rx="5" fill="#07223B" stroke={planeACouplingUp ? '#00CFFF' : '#FF5C65'} strokeWidth="1.2" />
                          <text x="530" y="289" textAnchor="middle" fill="#77E7FF" fontSize="8.8" fontWeight="bold">PRP LAN A ↔ Interlink A</text>
                        </g>
                      );
                    })()}

                    {/* Coupling Uplink B: RSP35 LAN B (P5: 958, 232) -> RED25-B Interlink (906, 356) */}
                    {(() => {
                      const dB = 'M 958 232 C 958 288, 906 290, 906 356';
                      const dBRev = 'M 906 356 C 906 290, 958 288, 958 232';
                      return (
                        <g>
                          <path d={dB} fill="none" stroke={planeBCouplingUp ? '#FACC15' : '#FF5C65'} strokeWidth="4.2" strokeDasharray={planeBCouplingUp ? undefined : '6 5'} />
                          {packetsPlaying && planeBCouplingUp && (
                            <>
                              <CablePacket path={dB} color="#FDE047" active={true} duration={packetDuration} delay={0.2} radius={3.3} />
                              <CablePacket path={dBRev} color="#4ADE80" active={true} duration={packetDuration} delay={0.75} radius={2.8} />
                            </>
                          )}
                          <rect x="786" y="274" width="128" height="24" rx="5" fill="#2E2206" stroke={planeBCouplingUp ? '#FACC15' : '#FF5C65'} strokeWidth="1.2" />
                          <text x="850" y="289" textAnchor="middle" fill="#FDE047" fontSize="8.8" fontWeight="bold">PRP LAN B ↔ Interlink B</text>
                        </g>
                      );
                    })()}

                    {/* Strict Isolation Badge between LAN A & LAN B */}
                    <g>
                      <rect x="606" y="190" width="168" height="36" rx="7" fill="#0B192E" stroke="#386186" strokeDasharray="4 3" />
                      <text x="690" y="206" textAnchor="middle" fill="#F87171" fontSize="9.2" fontWeight="bold">✕ NO DIRECT LAN A ↔ LAN B LINK</text>
                      <text x="690" y="219" textAnchor="middle" fill="#94A3B8" fontSize="8.3">Strict PRP Plane Isolation (Clause 4)</text>
                    </g>

                    {/* 8 Clickable HSR Ring Fiber Segments */}
                    {couplingRingSegs.map((seg) => {
                      const isBroken = couplingHsrCuts.includes(seg.index);
                      const segCarries = !isBroken && packetsPlaying && (planeACouplingUp || planeBCouplingUp);
                      return (
                        <g key={`CPL-SEG-${seg.segNum}`} className="cursor-pointer" onClick={() => toggleCouplingSegCut(seg.index)}>
                          <title>{`${seg.label} — Click to ${isBroken ? 'restore' : 'simulate fiber cut'}`}</title>
                          <path d={seg.path} fill="none" stroke="transparent" strokeWidth="18" />
                          {!isBroken ? (
                            <>
                              <path d={seg.path} fill="none" stroke="#00E5FF" strokeWidth="5" opacity="0.28" filter="url(#cplCyanGlow)" />
                              <path d={seg.path} fill="none" stroke="#00E5FF" strokeWidth="3.2" strokeLinecap="round" />
                              <CablePacket path={seg.path} color="#22C55E" active={segCarries} duration={packetDuration} delay={seg.index * 0.14} radius={3} />
                              <CablePacket path={seg.revPath} color="#00E5FF" active={segCarries && couplingHsrCuts.length === 0} duration={packetDuration * 1.08} delay={seg.index * 0.14 + 0.25} radius={2.6} />
                            </>
                          ) : (
                            <>
                              <path d={seg.path} fill="none" stroke="#FF4D5E" strokeWidth="3.4" strokeDasharray="7 5" />
                              <circle cx={seg.midX} cy={seg.midY} r="11" fill="#040D1A" stroke="#FF4D5E" strokeWidth="2" />
                              <line x1={seg.midX - 4.5} y1={seg.midY - 4.5} x2={seg.midX + 4.5} y2={seg.midY + 4.5} stroke="#FF4D5E" strokeWidth="2.4" />
                              <line x1={seg.midX + 4.5} y1={seg.midY - 4.5} x2={seg.midX - 4.5} y2={seg.midY + 4.5} stroke="#FF4D5E" strokeWidth="2.4" />
                            </>
                          )}
                          <g transform={`translate(${seg.badgeX}, ${seg.badgeY})`}>
                            <rect x="-34" y="-10" width="68" height="19" rx="5" fill={isBroken ? '#3B0D15' : '#091E36'} stroke={isBroken ? '#FF4D5E' : '#38BDF8'} strokeWidth="1.2" />
                            <text x="0" y="3" textAnchor="middle" fill={isBroken ? '#FDA4AF' : '#E2F1FF'} fontSize="8.5" fontWeight="bold">
                              {isBroken ? `✖ Seg #${seg.segNum}` : `Seg #${seg.segNum}`}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Center HSR Ring Live Status Readout */}
                    <text x="690" y="542" textAnchor="middle" fill="#E9D5FF" fontSize="15" fontWeight="bold" letterSpacing="0.5">
                      PRP (0x88FB) ⇄ DUAL REDBOX (NetId=1) ⇄ HSR RING (0x892F)
                    </text>
                    <text
                      x="690"
                      y="564"
                      textAnchor="middle"
                      fill={
                        !planeACouplingUp && !planeBCouplingUp
                          ? '#FF5C65'
                          : isolatedIeds.length > 0
                          ? '#FF5C65'
                          : planeACouplingUp && planeBCouplingUp && couplingHsrCuts.length === 0
                          ? '#4ADE80'
                          : '#FACC15'
                      }
                      fontSize="11.5"
                      fontWeight="bold"
                    >
                      {!planeACouplingUp && !planeBCouplingUp
                        ? '✖ CRITICAL — BOTH COUPLING PATHS DOWN (PRP ISOLATED FROM HSR RING)'
                        : isolatedIeds.length > 0
                        ? `✖ HSR RING PARTITIONED (${couplingHsrCuts.length} CUTS) — ${isolatedIeds.length} IED(s) ISOLATED`
                        : planeACouplingUp && planeBCouplingUp && couplingHsrCuts.length === 0
                        ? '● FULL N-1 COUPLING ACTIVE — LAN A + LAN B + CLOSED HSR RING (0 ms RECOVERY)'
                        : `▲ SURVIVING ON REDUNDANT PATH — 6/6 HSR IEDs REACHABLE FROM SCADA (0 ms)`}
                    </text>
                    <text x="690" y="584" textAnchor="middle" fill="#93C5FD" fontSize="9.8" fontFamily="monospace">
                      Active Coupling Planes: {planeACouplingUp ? 'LAN A (RED25-A)' : '—'} {planeACouplingUp && planeBCouplingUp ? '+' : ''} {planeBCouplingUp ? 'LAN B (RED25-B)' : ''} • Reachable DANH IEDs: {reachableIeds.length}/6 • Loop Prevention: NetId Filter OK
                    </text>

                    {/* ================= LAYER 3: ON-DEVICE PORT JACKS ================= */}
                    {topStationDevices.map((st) => (
                      <g key={`CPL-ST-JACKS-${st.id}`}>
                        <rect x={st.ethA.x - 5.5} y={st.ethA.y - 4.5} width="11" height="9" rx="2" fill="#040D1A" stroke={lanAUp ? '#00CFFF' : '#FF5C65'} strokeWidth="1.4" />
                        <rect x={st.ethB.x - 5.5} y={st.ethB.y - 4.5} width="11" height="9" rx="2" fill="#040D1A" stroke={lanBUp ? '#FACC15' : '#FF5C65'} strokeWidth="1.4" />
                      </g>
                    ))}
                    {/* RED25-A & RED25-B On-Device Jacks */}
                    {[
                      { x: 474, y: 356, col: planeACouplingUp ? '#00CFFF' : '#FF5C65' },
                      { x: 464, y: 422, col: redboxAUp ? '#22C55E' : '#FF5C65' },
                      { x: 420, y: 442, col: redboxAUp ? '#00E5FF' : '#FF5C65' },
                      { x: 906, y: 356, col: planeBCouplingUp ? '#FACC15' : '#FF5C65' },
                      { x: 916, y: 422, col: redboxBUp ? '#00E5FF' : '#FF5C65' },
                      { x: 960, y: 442, col: redboxBUp ? '#22C55E' : '#FF5C65' },
                    ].map((pt, i) => (
                      <g key={`CPL-RB-J-${i}`}>
                        <rect x={pt.x - 6} y={pt.y - 5} width="12" height="10" rx="2" fill="#040D1A" stroke={pt.col} strokeWidth="1.5" />
                        <circle cx={pt.x} cy={pt.y} r="2.2" fill={pt.col} />
                      </g>
                    ))}
                    {/* 6 IED On-Device Jacks */}
                    {couplingIeds.map((n) => {
                      const ok = reachViaA.has(n.index) || reachViaB.has(n.index);
                      const col = ok ? '#00E5FF' : '#FF5C65';
                      return (
                        <g key={`CPL-IED-J-${n.id}`}>
                          <rect x={n.portA.x - 5.5} y={n.portA.y - 4.5} width="11" height="9" rx="2" fill="#040D1A" stroke={col} strokeWidth="1.4" />
                          <rect x={n.portB.x - 5.5} y={n.portB.y - 4.5} width="11" height="9" rx="2" fill="#040D1A" stroke={col} strokeWidth="1.4" />
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Bottom 3 Engineering Panels: Rules, Frame Translation & Live N-1 Failure Matrix */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-2">
                    <div className="text-[11px] font-extrabold text-[#E9D5FF] uppercase tracking-wider">
                      IEC 62439-3 Clause 6 — Dual RedBox Coupling Rules
                    </div>
                    <ul className="space-y-1 text-[11px] text-[#CBD5E1] list-disc list-inside">
                      <li><strong className="text-[#77E7FF]">RED25-A</strong> connects ONLY to <strong className="text-[#00CFFF]">PRP LAN A</strong>; <strong className="text-[#FDE047]">RED25-B</strong> connects ONLY to <strong className="text-[#FACC15]">PRP LAN B</strong>.</li>
                      <li>Both RedBoxes sit <strong>in series</strong> inside the same HSR Ring and share the same <strong className="text-[#C084FC]">NetId = 1</strong>.</li>
                      <li><strong>Loop Prevention:</strong> Each RedBox drops frames tagged with its partner RedBox&apos;s LanId/NetId so frames never bounce back across LAN A ↔ LAN B.</li>
                      <li><strong>Zero Single Point of Failure:</strong> Losing any switch, RedBox, or HSR fiber still delivers 0 ms seamless communication.</li>
                    </ul>
                  </div>

                  <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-2.5">
                    <div className="text-[11px] font-extrabold text-[#77E7FF] uppercase tracking-wider">
                      Real-Time Frame Translation (RED25-A &amp; RED25-B)
                    </div>
                    <div>
                      <div className="text-[10px] text-[#00CFFF] font-semibold mb-1">Station Bus Side — PRP Frame (6-Byte Trailing RCT)</div>
                      <div className="grid grid-cols-6 gap-1 text-center font-mono text-[9.5px]">
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">DMAC</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">SMAC</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">Type</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">LSDU</div>
                        <div className="bg-[#083344] border border-[#00CFFF] rounded py-1 text-[#77E7FF] font-bold">RCT<br />0x88FB</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">FCS</div>
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-[#E9D5FF] font-semibold mb-1">Bay Ring Side — HSR Frame (6-Byte Leading HSR Tag)</div>
                      <div className="grid grid-cols-6 gap-1 text-center font-mono text-[9.5px]">
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">DMAC</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">SMAC</div>
                        <div className="bg-[#2B124C] border border-[#C084FC] rounded py-1 text-[#F3E8FF] font-bold">HSR<br />0x892F</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">Type</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">LSDU</div>
                        <div className="bg-[#0B223D] border border-[#244A75] rounded py-1 text-white">FCS</div>
                      </div>
                    </div>
                  </div>

                  <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-2">
                    <div className="text-[11px] font-extrabold text-[#77E7FF] uppercase tracking-wider">
                      PRP/HSR Coupling — N-1 Failure Behaviour
                    </div>
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="text-left text-[#8BB3D4] border-b border-[#18385A]">
                          <th className="py-1 pr-1">#</th>
                          <th className="py-1 pr-1">Condition</th>
                          <th className="py-1">SCADA ↔ HSR IEDs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#122944]">
                        {[
                          { id: 1, cond: 'Normal Operation', res: 'Dual A & B + Closed Ring', bad: false },
                          { id: 2, cond: 'LAN A or RED25-A Fail', res: 'LAN B ↔ RED25-B (0 ms)', bad: false },
                          { id: 3, cond: 'LAN B or RED25-B Fail', res: 'LAN A ↔ RED25-A (0 ms)', bad: false },
                          { id: 4, cond: '1 HSR Fiber Cut', res: 'Surviving Ring (0 ms)', bad: false },
                          { id: 5, cond: '1 Plane + 1 HSR Cut', res: 'Still 6/6 Online (0 ms)', bad: false },
                          { id: 6, cond: '2+ HSR Fiber Cuts', res: 'Split / Partial Isolation', bad: true },
                          { id: 7, cond: 'Both Coupling Paths Down', res: 'PRP ↔ HSR Isolated', bad: true },
                        ].map((row) => (
                          <tr key={row.id} className={activeCouplingScenario === row.id ? 'bg-[#123055] text-white font-bold' : 'text-slate-300'}>
                            <td className="py-1 pr-1 font-mono text-[#77E7FF]">{row.id}</td>
                            <td className="py-1 pr-1">{row.cond}</td>
                            <td className={`py-1 ${row.bad ? 'text-[#FF5C65]' : 'text-[#4ADE80]'}`}>{row.res}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4C: HSR-HSR QUADBOX (IEC 62439-3 CLAUSE 5 — DUAL-RING INTERCONNECT) */}
          {activeView === 'HSR_QUADBOX' && (() => {
            // Ring 1 (Top Bay-1 / Station HSR Ring): Nodes 0=SCADA RedBox, 1=7SJ85, 2=REF615, 3=QB1, 4=QB2
            // Ring 2 (Bottom Bay-2 / Process HSR Ring): Nodes 3=QB1, 4=QB2, 5=C264, 6=Multilin 850, 7=7UT86, 8=RET615
            const ring1Ieds = [
              { id: 'IED-33-F03', nodeIdx: 1, name: 'SIPROTEC 5 7SJ85', ip: '192.168.10.11', img: TOPO_EXACT_IMAGES.SIEMENS_7SJ85, cx: 230, cy: 200, labelSide: 'left' as const, portA: { x: 268, y: 175 }, portB: { x: 230, y: 248 } },
              { id: 'IED-11-F01', nodeIdx: 2, name: 'ABB Relion REF615', ip: '192.168.10.12', img: TOPO_EXACT_IMAGES.ABB_REF615, cx: 1150, cy: 200, labelSide: 'right' as const, portA: { x: 1112, y: 175 }, portB: { x: 1150, y: 248 } },
            ];

            const ring2Ieds = [
              { id: 'IED-132-BC', nodeIdx: 5, name: 'Schneider MiCOM C264', ip: '192.168.10.13', img: TOPO_EXACT_IMAGES.SCHNEIDER_C264, cx: 1150, cy: 550, labelSide: 'right' as const, portA: { x: 1150, y: 506 }, portB: { x: 1110, y: 568 } },
              { id: 'IED-33-F02', nodeIdx: 6, name: 'GE Multilin 850', ip: '192.168.10.14', img: TOPO_EXACT_IMAGES.GE_850, cx: 880, cy: 642, labelSide: 'bottom' as const, portA: { x: 918, y: 636 }, portB: { x: 842, y: 636 } },
              { id: 'IED-132-T1', nodeIdx: 7, name: 'SIPROTEC 5 7UT86', ip: '192.168.10.15', img: TOPO_EXACT_IMAGES.SIEMENS_7UT86, cx: 500, cy: 642, labelSide: 'bottom' as const, portA: { x: 538, y: 636 }, portB: { x: 462, y: 636 } },
              { id: 'IED-132-T2', nodeIdx: 8, name: 'ABB Relion RET615', ip: '192.168.10.16', img: TOPO_EXACT_IMAGES.ABB_RET615, cx: 230, cy: 550, labelSide: 'left' as const, portA: { x: 268, y: 568 }, portB: { x: 230, y: 502 } },
            ];

            // Exact physical port coordinates on 4-port Hirschmann RED25-0400 QuadBox PNG (92x142 at y=314)
            // QB-1 (x=414): A1=(467,374), B1=(488,374), A2=(467,421), B2=(488,421)
            // QB-2 (x=874): A1=(927,374), B1=(948,374), A2=(927,421), B2=(948,421)
            const r1Segs = [
              { idx: 0, num: 1, u: 0, v: 2, label: 'R1-S1', path: 'M 730 92 C 920 92, 1020 175, 1112 175', rev: 'M 1112 175 C 1020 175, 920 92, 730 92', midX: 950, midY: 124 },
              { idx: 1, num: 2, u: 2, v: 4, label: 'R1-S2', path: 'M 1150 248 C 1150 326, 1025 354, 948 374', rev: 'M 948 374 C 1025 354, 1150 326, 1150 248', midX: 1086, midY: 318 },
              { idx: 2, num: 3, u: 4, v: 3, label: 'R1-S3', path: 'M 927 374 C 820 334, 595 334, 488 374', rev: 'M 488 374 C 595 334, 820 334, 927 374', midX: 708, midY: 344 },
              { idx: 3, num: 4, u: 3, v: 1, label: 'R1-S4', path: 'M 467 374 C 365 354, 230 326, 230 248', rev: 'M 230 248 C 230 326, 365 354, 467 374', midX: 294, midY: 318 },
              { idx: 4, num: 5, u: 1, v: 0, label: 'R1-S5', path: 'M 268 175 C 360 175, 460 92, 650 92', rev: 'M 650 92 C 460 92, 360 175, 268 175', midX: 430, midY: 124 },
            ];

            const r2Segs = [
              { idx: 0, num: 1, u: 3, v: 4, label: 'R2-S1', path: 'M 488 421 C 595 462, 820 462, 927 421', rev: 'M 927 421 C 820 462, 595 462, 488 421', midX: 708, midY: 452 },
              { idx: 1, num: 2, u: 4, v: 5, label: 'R2-S2', path: 'M 948 421 C 1030 436, 1150 455, 1150 506', rev: 'M 1150 506 C 1150 455, 1030 436, 948 421', midX: 1086, midY: 454 },
              { idx: 2, num: 3, u: 5, v: 6, label: 'R2-S3', path: 'M 1110 568 C 1050 620, 990 636, 918 636', rev: 'M 918 636 C 990 636, 1050 620, 1110 568', midX: 1026, midY: 616 },
              { idx: 3, num: 4, u: 6, v: 7, label: 'R2-S4', path: 'M 842 636 L 538 636', rev: 'M 538 636 L 842 636', midX: 690, midY: 636 },
              { idx: 4, num: 5, u: 7, v: 8, label: 'R2-S5', path: 'M 462 636 C 390 636, 330 620, 268 568', rev: 'M 268 568 C 330 620, 390 636, 462 636', midX: 354, midY: 616 },
              { idx: 5, num: 6, u: 8, v: 3, label: 'R2-S6', path: 'M 230 502 C 230 455, 355 436, 467 421', rev: 'M 467 421 C 355 436, 230 455, 230 502', midX: 294, midY: 454 },
            ];

            // Unified 9-Node Graph BFS from Node 0 (SCADA RedBox on Ring 1)
            const adj: number[][] = Array.from({ length: 9 }, () => []);
            const nodeAlive = (n: number) => (n !== 3 || !qb1Fault) && (n !== 4 || !qb2Fault);
            r1Segs.forEach((s) => {
              if (!qbRing1Cuts.includes(s.idx) && nodeAlive(s.u) && nodeAlive(s.v)) {
                adj[s.u].push(s.v);
                adj[s.v].push(s.u);
              }
            });
            r2Segs.forEach((s) => {
              if (!qbRing2Cuts.includes(s.idx) && nodeAlive(s.u) && nodeAlive(s.v)) {
                adj[s.u].push(s.v);
                adj[s.v].push(s.u);
              }
            });

            const reachable = new Set<number>([0]);
            const q = [0];
            while (q.length > 0) {
              const cur = q.shift()!;
              for (const nxt of adj[cur]) {
                if (!reachable.has(nxt)) {
                  reachable.add(nxt);
                  q.push(nxt);
                }
              }
            }

            const allIeds = [...ring1Ieds, ...ring2Ieds];
            const onlineCount = allIeds.filter((i) => reachable.has(i.nodeIdx)).length;
            const ring2OnlineCount = ring2Ieds.filter((i) => reachable.has(i.nodeIdx)).length;
            const bothQbsDown = qb1Fault && qb2Fault;

            const toggleR1Cut = (idx: number) => setQbRing1Cuts((p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]));
            const toggleR2Cut = (idx: number) => setQbRing2Cuts((p) => (p.includes(idx) ? p.filter((x) => x !== idx) : [...p, idx]));
            const restoreAllQb = () => {
              setQb1Fault(false);
              setQb2Fault(false);
              setQbRing1Cuts([]);
              setQbRing2Cuts([]);
            };

            return (
              <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-3.5 space-y-3 shadow-xl">
                {/* Header & Fault Controls */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#15314E] pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#08332C] border border-[#34D399] text-[#A7F3D0] text-[10px] font-mono font-extrabold">
                        IEC 62439-3 CLAUSE 5 · HIRSCHMANN QUADBOX
                      </span>
                      <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                        HSR-HSR DUAL HIRSCHMANN QUADBOX INTERCONNECT (RING 1 ↔ RING 2)
                      </h2>
                    </div>
                    <p className="text-xs text-[#8BB3D4] mt-0.5">
                      Two dedicated 4-port Hirschmann RED25-0400 QuadBoxes (A1/B1 on Ring 1 &amp; A2/B2 on Ring 2) sit in series across both HSR rings for 0 ms dual-ring redundancy with zero single point of failure. Click any fiber segment to cut.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQb1Fault((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        qb1Fault ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#6EE7B7] border-[#34D399]/70'
                      }`}
                    >
                      {qb1Fault ? 'Restore QuadBox-1' : 'Fail QuadBox-1'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setQb2Fault((v) => !v)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        qb2Fault ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#6EE7B7] border-[#34D399]/70'
                      }`}
                    >
                      {qb2Fault ? 'Restore QuadBox-2' : 'Fail QuadBox-2'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleR1Cut(0)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        qbRing1Cuts.includes(0) ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#77E7FF] border-[#00CFFF]/70'
                      }`}
                    >
                      {qbRing1Cuts.includes(0) ? 'Restore R1-S1' : 'Cut Ring-1 (S1)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleR2Cut(3)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        qbRing2Cuts.includes(3) ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#D8B4FE] border-[#C084FC]/70'
                      }`}
                    >
                      {qbRing2Cuts.includes(3) ? 'Restore R2-S4' : 'Cut Ring-2 (S4)'}
                    </button>
                    <button
                      type="button"
                      onClick={restoreAllQb}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-[#06281E] text-[#4ADE80] border-[#22C55E]"
                    >
                      Restore All
                    </button>
                  </div>
                </div>

                {/* DUAL HSR RING + DUAL 4-PORT HIRSCHMANN QUADBOX TOPOLOGY SVG */}
                <div className="rounded-xl bg-gradient-to-b from-[#061325] via-[#040D1A] to-[#030914] border border-[#163452] p-2 overflow-x-auto">
                  <svg viewBox="0 0 1380 730" className="w-full h-auto min-w-[940px] select-none" aria-label="IEC 62439-3 HSR to HSR Dual Hirschmann QuadBox Topology">
                    {/* Zone Labels */}
                    <rect x="16" y="14" width="1348" height="346" rx="14" fill="#071528" fillOpacity="0.32" stroke="#16395E" strokeDasharray="6 5" />
                    <text x="30" y="34" fill="#77E7FF" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                      HSR RING 1 — STATION / BAY-1 RING (0x892F · NetId = 1)
                    </text>

                    <rect x="16" y="422" width="1348" height="294" rx="14" fill="#071226" fillOpacity="0.32" stroke="#2D3F73" strokeDasharray="6 5" />
                    <text x="30" y="442" fill="#E9D5FF" fontSize="10.5" fontWeight="bold" fontFamily="monospace">
                      HSR RING 2 — BAY-2 / PROCESS BUS RING (0x892F · NetId = 2)
                    </text>

                    {/* Top Anchor: SCADA / Station RedBox (Node 0) */}
                    <g className="cursor-pointer" onClick={() => handleSelectDevice('SRV-SCADA-A', true)}>
                      <text x="690" y="28" textAnchor="middle" fill="#FFFFFF" fontSize="12" fontWeight="bold">SCADA / HMI Station RedBox (HSR-SAN)</text>
                      <image href={getHardwarePhoto('SCADA_SERVER')} x="626" y="36" width="128" height="62" preserveAspectRatio="xMidYMid meet" />
                      <text x="690" y="114" textAnchor="middle" fill="#00D4FF" fontSize="9.8" fontFamily="monospace" fontWeight="bold">192.168.10.10 · Ring-1 Anchor</text>
                    </g>

                    {/* DUAL 4-PORT HIRSCHMANN QUADBOX HARDWARE (Rendered before cables so cords plug cleanly into front ports) */}
                    {[
                      { id: 'QB-1', title: 'Hirschmann QuadBox-1', model: 'RED25-0400 (4-Port HSR)', sub: 'A1/B1 ↔ R1 · A2/B2 ↔ R2', x: 414, cx: 460, fault: qb1Fault, toggle: () => setQb1Fault((v) => !v), side: 'left' as const },
                      { id: 'QB-2', title: 'Hirschmann QuadBox-2', model: 'RED25-0400 (4-Port HSR)', sub: 'A1/B1 ↔ R1 · A2/B2 ↔ R2', x: 874, cx: 920, fault: qb2Fault, toggle: () => setQb2Fault((v) => !v), side: 'right' as const },
                    ].map((qb) => (
                      <g key={qb.id} className="cursor-pointer" onClick={qb.toggle}>
                        <image href={getHardwarePhoto('HIRSCHMANN_QUADBOX')} x={qb.x} y="314" width="92" height="142" preserveAspectRatio="xMidYMid meet" opacity={qb.fault ? 0.45 : 1} />
                        <text x={qb.side === 'left' ? qb.x - 10 : qb.x + 102} y="366" textAnchor={qb.side === 'left' ? 'end' : 'start'} fill="#FFFFFF" fontSize="11.5" fontWeight="bold">{qb.title}</text>
                        <text x={qb.side === 'left' ? qb.x - 10 : qb.x + 102} y="380" textAnchor={qb.side === 'left' ? 'end' : 'start'} fill="#77E7FF" fontSize="9.2" fontFamily="monospace">{qb.model}</text>
                        <text x={qb.side === 'left' ? qb.x - 10 : qb.x + 102} y="394" textAnchor={qb.side === 'left' ? 'end' : 'start'} fill="#6EE7B7" fontSize="9" fontFamily="monospace">{qb.sub}</text>
                        <text x={qb.side === 'left' ? qb.x - 10 : qb.x + 102} y="409" textAnchor={qb.side === 'left' ? 'end' : 'start'} fill={qb.fault ? '#FF5C65' : '#4ADE80'} fontSize="9.2" fontWeight="bold">
                          {qb.fault ? '✕ QUADBOX FAULTED' : '● 4-PORT HSR FORWARDING'}
                        </text>
                      </g>
                    ))}

                    {/* Ring 1 Segments */}
                    {r1Segs.map((s) => {
                      const cut = qbRing1Cuts.includes(s.idx);
                      const active = !cut && nodeAlive(s.u) && nodeAlive(s.v);
                      return (
                        <g key={s.label} className="cursor-pointer" onClick={() => toggleR1Cut(s.idx)}>
                          <title>{`${s.label} — Click to ${cut ? 'restore' : 'cut'}`}</title>
                          <path d={s.path} fill="none" stroke="transparent" strokeWidth="18" />
                          <path d={s.path} fill="none" stroke={cut ? '#FF4D5E' : '#00E5FF'} strokeWidth={cut ? 3.2 : 3.4} strokeDasharray={cut ? '7 5' : undefined} />
                          {packetsPlaying && active && (
                            <>
                              <CablePacket path={s.path} color="#22C55E" active={true} duration={packetDuration} delay={s.idx * 0.16} radius={3} />
                              <CablePacket path={s.rev} color="#00E5FF" active={qbRing1Cuts.length === 0} duration={packetDuration * 1.08} delay={s.idx * 0.16 + 0.3} radius={2.6} />
                            </>
                          )}
                          <g transform={`translate(${s.midX}, ${s.midY})`}>
                            <rect x="-28" y="-10" width="56" height="19" rx="5" fill={cut ? '#3B0D15' : '#091E36'} stroke={cut ? '#FF4D5E' : '#38BDF8'} strokeWidth="1.2" />
                            <text x="0" y="3" textAnchor="middle" fill={cut ? '#FDA4AF' : '#E2F1FF'} fontSize="8.5" fontWeight="bold">{cut ? `✖ ${s.label}` : s.label}</text>
                          </g>
                        </g>
                      );
                    })}

                    {/* Ring 2 Segments */}
                    {r2Segs.map((s) => {
                      const cut = qbRing2Cuts.includes(s.idx);
                      const active = !cut && nodeAlive(s.u) && nodeAlive(s.v) && !bothQbsDown;
                      return (
                        <g key={s.label} className="cursor-pointer" onClick={() => toggleR2Cut(s.idx)}>
                          <title>{`${s.label} — Click to ${cut ? 'restore' : 'cut'}`}</title>
                          <path d={s.path} fill="none" stroke="transparent" strokeWidth="18" />
                          <path d={s.path} fill="none" stroke={cut ? '#FF4D5E' : '#C084FC'} strokeWidth={cut ? 3.2 : 3.4} strokeDasharray={cut ? '7 5' : undefined} />
                          {packetsPlaying && active && (
                            <>
                              <CablePacket path={s.path} color="#34D399" active={true} duration={packetDuration} delay={s.idx * 0.15} radius={3} />
                              <CablePacket path={s.rev} color="#E879F9" active={qbRing2Cuts.length === 0} duration={packetDuration * 1.08} delay={s.idx * 0.15 + 0.28} radius={2.6} />
                            </>
                          )}
                          <g transform={`translate(${s.midX}, ${s.midY})`}>
                            <rect x="-28" y="-10" width="56" height="19" rx="5" fill={cut ? '#3B0D15' : '#1E1038'} stroke={cut ? '#FF4D5E' : '#C084FC'} strokeWidth="1.2" />
                            <text x="0" y="3" textAnchor="middle" fill={cut ? '#FDA4AF' : '#F3E8FF'} fontSize="8.5" fontWeight="bold">{cut ? `✖ ${s.label}` : s.label}</text>
                          </g>
                        </g>
                      );
                    })}

                    {/* On-Faceplate Clickable 4-Port Jacks on Hirschmann QuadBox-1 & QuadBox-2 (A1, B1, A2, B2) */}
                    {[
                      { id: 'QB1', baseX: 414, fault: qb1Fault, toggle: () => setQb1Fault((v) => !v) },
                      { id: 'QB2', baseX: 874, fault: qb2Fault, toggle: () => setQb2Fault((v) => !v) },
                    ].map((qb) => (
                      <g key={`PORTS-${qb.id}`} className="cursor-pointer" onClick={qb.toggle}>
                        {[
                          { x: qb.baseX + 53, y: 374, lbl: 'A1', col: qb.fault ? '#FF5C65' : '#00E5FF' },
                          { x: qb.baseX + 74, y: 374, lbl: 'B1', col: qb.fault ? '#FF5C65' : '#00E5FF' },
                          { x: qb.baseX + 53, y: 421, lbl: 'A2', col: qb.fault ? '#FF5C65' : '#C084FC' },
                          { x: qb.baseX + 74, y: 421, lbl: 'B2', col: qb.fault ? '#FF5C65' : '#C084FC' },
                        ].map((p) => (
                          <g key={p.lbl}>
                            <rect x={p.x - 5.5} y={p.y - 4.5} width="11" height="9" rx="1.8" fill="#040D1A" stroke={p.col} strokeWidth="1.4" />
                            <circle cx={p.x} cy={p.y} r="2" fill={p.col} />
                          </g>
                        ))}
                      </g>
                    ))}

                    {/* Render Ring 1 & Ring 2 IEDs (Zero Boxes) */}
                    {allIeds.map((node) => {
                      const ok = reachable.has(node.nodeIdx);
                      const imgW = 76;
                      const imgH = 92;
                      const imgX = node.cx - imgW / 2;
                      const imgY = node.cy - imgH / 2;
                      const tx = node.labelSide === 'left' ? imgX - 10 : node.labelSide === 'right' ? imgX + imgW + 10 : node.cx;
                      const anchor = node.labelSide === 'left' ? 'end' : node.labelSide === 'right' ? 'start' : 'middle';
                      const ty = node.labelSide === 'bottom' ? imgY + imgH + 14 : node.cy - 18;
                      return (
                        <g key={`QB-IED-${node.id}`} className="cursor-pointer" onClick={() => handleSelectDevice(node.id, true)}>
                          <image href={node.img} x={imgX} y={imgY} width={imgW} height={imgH} preserveAspectRatio="xMidYMid meet" opacity={ok ? 1 : 0.5} />
                          <text x={tx} y={ty} textAnchor={anchor} fill="#FFFFFF" fontSize="10.8" fontWeight="bold">{node.name}</text>
                          <text x={tx} y={ty + 13} textAnchor={anchor} fill="#00D4FF" fontSize="9.6" fontFamily="monospace" fontWeight="bold">{node.ip}</text>
                          <text x={tx} y={ty + 26} textAnchor={anchor} fill={ok ? '#4ADE80' : '#FF5C65'} fontSize="8.8" fontWeight="bold">
                            {ok ? '● ONLINE (0 ms)' : '✖ ISOLATED'}
                          </text>
                          <rect x={node.portA.x - 5.5} y={node.portA.y - 4.5} width="11" height="9" rx="2" fill="#040D1A" stroke={ok ? '#00E5FF' : '#FF5C65'} strokeWidth="1.4" />
                          <rect x={node.portB.x - 5.5} y={node.portB.y - 4.5} width="11" height="9" rx="2" fill="#040D1A" stroke={ok ? '#00E5FF' : '#FF5C65'} strokeWidth="1.4" />
                        </g>
                      );
                    })}

                    {/* Center Status Banner */}
                    <text x="708" y="388" textAnchor="middle" fill="#6EE7B7" fontSize="13" fontWeight="bold">
                      DUAL HIRSCHMANN QUADBOX (4-PORT HSR)
                    </text>
                    <text x="708" y="406" textAnchor="middle" fill={bothQbsDown || onlineCount < 6 ? '#FF5C65' : qb1Fault || qb2Fault || qbRing1Cuts.length > 0 || qbRing2Cuts.length > 0 ? '#FACC15' : '#4ADE80'} fontSize="10.5" fontWeight="bold">
                      {bothQbsDown
                        ? '✖ BOTH QUADBOXES DOWN — RING 2 ISOLATED FROM RING 1'
                        : onlineCount === 6 && !qb1Fault && !qb2Fault && qbRing1Cuts.length === 0 && qbRing2Cuts.length === 0
                        ? '● FULL DUAL-RING REDUNDANCY ACTIVE — 6/6 IEDs ONLINE (0 ms)'
                        : onlineCount === 6
                        ? '▲ SURVIVING ON BACKUP QUADBOX / ALTERNATE RING PATH — 6/6 ONLINE'
                        : `✖ PARTIAL ISOLATION — ${onlineCount}/6 IEDs REACHABLE (${ring2OnlineCount}/4 IN RING 2)`}
                    </text>
                  </svg>
                </div>

                {/* Live Summary Strip */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 text-xs">
                  <div className="p-2.5 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                    <div className="text-[10.5px] font-extrabold text-[#6EE7B7] uppercase">Hirschmann QuadBox Pair (4-Port HSR)</div>
                    <div className="text-xs font-mono text-white mt-1">
                      QB-1: <span className={qb1Fault ? 'text-[#FF5C65] font-bold' : 'text-[#4ADE80] font-bold'}>{qb1Fault ? 'FAULT' : 'ONLINE (A1/B1 + A2/B2)'}</span> • QB-2: <span className={qb2Fault ? 'text-[#FF5C65] font-bold' : 'text-[#4ADE80] font-bold'}>{qb2Fault ? 'FAULT' : 'ONLINE (A1/B1 + A2/B2)'}</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                    <div className="text-[10.5px] font-extrabold text-[#77E7FF] uppercase">Ring 1 &amp; Ring 2 Reachability</div>
                    <div className="text-xs font-mono text-white mt-1">
                      Total Reachable: <span className={onlineCount === 6 ? 'text-[#4ADE80] font-bold' : 'text-[#FF5C65] font-bold'}>{onlineCount} / 6 IEDs</span> • Ring 2: <span className={ring2OnlineCount === 4 ? 'text-[#4ADE80]' : 'text-[#FF5C65]'}>{ring2OnlineCount}/4</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                    <div className="text-[10.5px] font-extrabold text-[#E9D5FF] uppercase">Scaling Beyond 2 Rings</div>
                    <div className="text-[11px] text-[#CBD5E1] mt-1">
                      Add another 4-port Hirschmann QuadBox pair to Ring 1 to couple Bay-3, Bay-4, or Process Bus rings in a Ring-of-Rings hierarchy.
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 4D: RSTP (IEEE 802.1w) — 4-SWITCH INDUSTRIAL FIBER RING */}
          {activeView === 'RSTP_RING' && (() => {
            // 4 Hirschmann RSP35 Industrial Switches in an IEEE 802.1w RSTP Fiber Ring
            const switches = [
              { id: 0, code: 'SW-1', name: 'Hirschmann RSP35 #1', ip: '192.168.10.2', pri: 4096, mac: '00:80:63:01:00:01', x: 320, y: 175, alive: !rstpSw1Fault },
              { id: 1, code: 'SW-2', name: 'Hirschmann RSP35 #2', ip: '192.168.10.3', pri: 8192, mac: '00:80:63:02:00:02', x: 960, y: 175, alive: true },
              { id: 2, code: 'SW-3', name: 'Hirschmann RSP35 #3', ip: '192.168.10.4', pri: 32768, mac: '00:80:63:03:00:03', x: 960, y: 455, alive: true },
              { id: 3, code: 'SW-4', name: 'Hirschmann RSP35 #4', ip: '192.168.10.5', pri: 32768, mac: '00:80:63:04:00:04', x: 320, y: 455, alive: true },
            ];

            // 4 Inter-Switch 1000BASE-LX Fiber Ring Links (Cost = 20,000 per IEEE 802.1w 1 Gbps)
            const ringLinks = [
              {
                idx: 0,
                id: 'L1',
                label: 'L1: SW-1 ↔ SW-2',
                u: 0,
                v: 1,
                uPort: 'P7',
                vPort: 'P7',
                uPt: { x: 404, y: 204 },
                vPt: { x: 876, y: 204 },
                path: 'M 404 204 L 876 204',
                rev: 'M 876 204 L 404 204',
                midX: 640,
                midY: 204,
              },
              {
                idx: 1,
                id: 'L2',
                label: 'L2: SW-2 ↔ SW-3',
                u: 1,
                v: 2,
                uPort: 'P8',
                vPort: 'P7',
                uPt: { x: 992, y: 242 },
                vPt: { x: 992, y: 446 },
                path: 'M 992 242 L 992 446',
                rev: 'M 992 446 L 992 242',
                midX: 992,
                midY: 344,
              },
              {
                idx: 2,
                id: 'L3',
                label: 'L3: SW-3 ↔ SW-4',
                u: 2,
                v: 3,
                uPort: 'P8',
                vPort: 'P8',
                uPt: { x: 876, y: 484 },
                vPt: { x: 404, y: 484 },
                path: 'M 876 484 L 404 484',
                rev: 'M 404 484 L 876 484',
                midX: 640,
                midY: 484,
              },
              {
                idx: 3,
                id: 'L4',
                label: 'L4: SW-4 ↔ SW-1',
                u: 3,
                v: 0,
                uPort: 'P7',
                vPort: 'P8',
                uPt: { x: 288, y: 446 },
                vPt: { x: 288, y: 242 },
                path: 'M 288 446 L 288 242',
                rev: 'M 288 242 L 288 446',
                midX: 288,
                midY: 344,
              },
            ];

            // Step 1: Elect Root Bridge (lowest priority, tie-break by lowest switch id/MAC)
            const aliveSwitches = switches.filter((s) => s.alive);
            const rootSw = [...aliveSwitches].sort((a, b) => a.pri - b.pri || a.id - b.id)[0];

            // Step 2: Compute shortest path tree (BFS / Dijkstra with deterministic tie-breaking by Bridge ID)
            const dist = [Infinity, Infinity, Infinity, Infinity];
            const parentSw = [-1, -1, -1, -1];
            const parentLink = [-1, -1, -1, -1];
            dist[rootSw.id] = 0;

            const adj: Array<Array<{ to: number; linkIdx: number }>> = [[], [], [], []];
            ringLinks.forEach((lnk) => {
              if (!rstpLinkCuts.includes(lnk.idx) && switches[lnk.u].alive && switches[lnk.v].alive) {
                adj[lnk.u].push({ to: lnk.v, linkIdx: lnk.idx });
                adj[lnk.v].push({ to: lnk.u, linkIdx: lnk.idx });
              }
            });

            // Bellman-Ford style deterministic relaxation (cost 20000 per hop, tie-break by lower Bridge priority/ID)
            for (let iter = 0; iter < 4; iter++) {
              for (let u = 0; u < 4; u++) {
                if (dist[u] === Infinity) continue;
                for (const edge of adj[u]) {
                  const candCost = dist[u] + 20000;
                  const curP = parentSw[edge.to];
                  const better =
                    candCost < dist[edge.to] ||
                    (candCost === dist[edge.to] &&
                      curP !== -1 &&
                      (switches[u].pri < switches[curP].pri ||
                        (switches[u].pri === switches[curP].pri && switches[u].id < switches[curP].id)));
                  if (better) {
                    dist[edge.to] = candCost;
                    parentSw[edge.to] = u;
                    parentLink[edge.to] = edge.linkIdx;
                  }
                }
              }
            }

            // Step 3: Assign IEEE 802.1w Port Roles (RP / DP / AP-BLOCKING / DOWN) per link endpoint
            type RstpRole = 'RP' | 'DP' | 'AP' | 'DOWN';
            const linkRoles = ringLinks.map((lnk) => {
              const cut = rstpLinkCuts.includes(lnk.idx);
              const uAlive = switches[lnk.u].alive;
              const vAlive = switches[lnk.v].alive;
              if (cut || !uAlive || !vAlive) {
                return { uRole: 'DOWN' as RstpRole, vRole: 'DOWN' as RstpRole, forwarding: false, blocking: false, cut };
              }
              const uReach = dist[lnk.u] < Infinity;
              const vReach = dist[lnk.v] < Infinity;
              if (!uReach && !vReach) {
                return { uRole: 'DP' as RstpRole, vRole: 'DP' as RstpRole, forwarding: false, blocking: false, cut: false };
              }
              // Check if tree edge
              if (parentLink[lnk.v] === lnk.idx && parentSw[lnk.v] === lnk.u) {
                return { uRole: 'DP' as RstpRole, vRole: 'RP' as RstpRole, forwarding: true, blocking: false, cut: false };
              }
              if (parentLink[lnk.u] === lnk.idx && parentSw[lnk.u] === lnk.v) {
                return { uRole: 'RP' as RstpRole, vRole: 'DP' as RstpRole, forwarding: true, blocking: false, cut: false };
              }
              // Non-tree edge (loop closure!) -> lower (dist, pri, id) is DP (Forwarding), other is AP (BLOCKING)
              const uWins =
                dist[lnk.u] < dist[lnk.v] ||
                (dist[lnk.u] === dist[lnk.v] &&
                  (switches[lnk.u].pri < switches[lnk.v].pri ||
                    (switches[lnk.u].pri === switches[lnk.v].pri && switches[lnk.u].id < switches[lnk.v].id)));
              return uWins
                ? { uRole: 'DP' as RstpRole, vRole: 'AP' as RstpRole, forwarding: false, blocking: true, cut: false }
                : { uRole: 'AP' as RstpRole, vRole: 'DP' as RstpRole, forwarding: false, blocking: true, cut: false };
            });

            const reachableSwCount = switches.filter((s) => s.alive && dist[s.id] < Infinity).length;
            const blockingLinkIdx = linkRoles.findIndex((r) => r.blocking);
            const hasFault = rstpSw1Fault || rstpLinkCuts.length > 0;
            const isPartitioned = reachableSwCount < aliveSwitches.length;

            const logRstp = (severity: 'INFO' | 'WARNING' | 'CRITICAL', msg: string) => {
              const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
              setRstpEventLog((prev) => [{ id: `RSTP-${Date.now()}-${Math.random()}`, time, severity, msg }, ...prev].slice(0, 8));
            };

            const toggleRstpCut = (idx: number) => {
              const lnk = ringLinks[idx];
              const isCut = rstpLinkCuts.includes(idx);
              const next = isCut ? rstpLinkCuts.filter((x) => x !== idx) : [...rstpLinkCuts, idx];
              setRstpLinkCuts(next);
              if (isCut) {
                logRstp('INFO', `${lnk.label} restored — RSTP BPDU Proposal/Agreement reconverged (~15 ms).`);
              } else if (next.length === 1 && !rstpSw1Fault) {
                logRstp('WARNING', `${lnk.label} FIBER CUT — TCN BPDU sent; Alternate/Blocking port promoted to Forwarding (~15 ms).`);
              } else {
                logRstp('CRITICAL', `${lnk.label} FIBER CUT — Multiple ring breaks detected; RSTP topology partitioned!`);
              }
            };

            const toggleSw1Fault = () => {
              const next = !rstpSw1Fault;
              setRstpSw1Fault(next);
              if (next) {
                logRstp('WARNING', 'Root Bridge SW-1 FAILED — MaxAge/Hello timeout; SW-2 (Pri 8192) elected NEW Root Bridge (~28 ms).');
              } else {
                logRstp('INFO', 'SW-1 restored (Pri 4096) — Preempted Root Bridge role; SW-3 P8 returned to Alternate/Blocking.');
              }
            };

            const restoreAllRstp = () => {
              setRstpLinkCuts([]);
              setRstpSw1Fault(false);
              logRstp('INFO', 'All RSTP links & SW-1 restored — Normal 4-switch ring active (SW-1 Root, L3 SW-3 P8 Blocking).');
            };

            // Edge SAN Devices (PortFast) attached to the 4 RSTP switches
            const edgeDevices = [
              { id: 'SRV-SCADA-A', swId: 0, title: 'SCADA Server A', ip: '192.168.10.10', img: TOPO_EXACT_IMAGES.DELL_R750, x: 40, y: 120, w: 112, h: 48, line: 'M 152 146 L 236 186' },
              { id: 'WS-HMI-01', swId: 1, title: 'Operator HMI WS', ip: '192.168.10.20', img: TOPO_EXACT_IMAGES.HMI_DUAL, x: 1128, y: 112, w: 96, h: 64, line: 'M 1128 146 L 1044 186' },
              { id: 'IED-11-F01', swId: 2, title: 'ABB REF615 (SAN)', ip: '192.168.10.12', img: TOPO_EXACT_IMAGES.ABB_REF615, x: 1136, y: 424, w: 80, h: 96, line: 'M 1136 472 L 1044 472' },
              { id: 'IED-33-F03', swId: 3, title: 'SIPROTEC 7SJ85 (SAN)', ip: '192.168.10.11', img: TOPO_EXACT_IMAGES.SIEMENS_7SJ85, x: 64, y: 424, w: 80, h: 96, line: 'M 144 472 L 236 472' },
            ];

            const roleColor = (r: RstpRole) =>
              r === 'RP' ? '#22C55E' : r === 'DP' ? '#00E5FF' : r === 'AP' ? '#F59E0B' : '#FF5C65';

            return (
              <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-3.5 space-y-3 shadow-xl">
                {/* Header & Fault Controls */}
                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#15314E] pb-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-[#3B2609] border border-[#F59E0B] text-[#FDE68A] text-[10px] font-mono font-extrabold">
                        IEEE 802.1w · RSTP RING
                      </span>
                      <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                        RAPID SPANNING TREE PROTOCOL (RSTP) — 4-SWITCH SUBSTATION FIBER RING
                      </h2>
                    </div>
                    <p className="text-xs text-[#8BB3D4] mt-0.5">
                      Loop-free Layer-2 ring using standard SAN Ethernet switches. One Alternate Port (AP) stays in <strong className="text-[#F59E0B]">Blocking</strong> state to prevent broadcast storms and promotes to <strong className="text-[#4ADE80]">Forwarding</strong> in ~5–30 ms on link failure. Click any fiber link to cut.
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => toggleRstpCut(0)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        rstpLinkCuts.includes(0) ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#77E7FF] border-[#00CFFF]/70'
                      }`}
                    >
                      {rstpLinkCuts.includes(0) ? 'Restore L1' : 'Cut L1 (SW1↔SW2)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRstpCut(1)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        rstpLinkCuts.includes(1) ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#77E7FF] border-[#00CFFF]/70'
                      }`}
                    >
                      {rstpLinkCuts.includes(1) ? 'Restore L2' : 'Cut L2 (SW2↔SW3)'}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleRstpCut(3)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        rstpLinkCuts.includes(3) ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#77E7FF] border-[#00CFFF]/70'
                      }`}
                    >
                      {rstpLinkCuts.includes(3) ? 'Restore L4' : 'Cut L4 (SW4↔SW1)'}
                    </button>
                    <button
                      type="button"
                      onClick={toggleSw1Fault}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold border transition ${
                        rstpSw1Fault ? 'bg-[#FF5C65] text-white border-white' : 'bg-[#081A30] text-[#FDE68A] border-[#F59E0B]/70'
                      }`}
                    >
                      {rstpSw1Fault ? 'Restore Root SW-1' : 'Fail Root SW-1'}
                    </button>
                    <button
                      type="button"
                      onClick={restoreAllRstp}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold border bg-[#06281E] text-[#4ADE80] border-[#22C55E]"
                    >
                      Restore All
                    </button>
                  </div>
                </div>

                {/* 4-SWITCH RSTP RING TOPOLOGY SVG */}
                <div className="rounded-xl bg-gradient-to-b from-[#061325] via-[#040D1A] to-[#030914] border border-[#163452] p-2 overflow-x-auto">
                  <svg viewBox="0 0 1280 590" className="w-full h-auto min-w-[900px] select-none" aria-label="IEEE 802.1w RSTP 4-Switch Fiber Ring">
                    {/* Legend Bar inside top of SVG */}
                    <g transform="translate(360, 14)">
                      <rect x="0" y="0" width="560" height="28" rx="7" fill="#07182E" stroke="#1E3A5F" />
                      <circle cx="24" cy="14" r="4.5" fill="#22C55E" />
                      <text x="34" y="18" fill="#E2F1FF" fontSize="10" fontWeight="bold">RP: Root Port (Fwd)</text>
                      <circle cx="174" cy="14" r="4.5" fill="#00E5FF" />
                      <text x="184" y="18" fill="#E2F1FF" fontSize="10" fontWeight="bold">DP: Designated (Fwd)</text>
                      <circle cx="332" cy="14" r="4.5" fill="#F59E0B" />
                      <text x="342" y="18" fill="#FDE68A" fontSize="10" fontWeight="bold">AP: Alternate (BLOCKING)</text>
                      <circle cx="496" cy="14" r="4.5" fill="#FF5C65" />
                      <text x="506" y="18" fill="#FDA4AF" fontSize="10" fontWeight="bold">Link Cut</text>
                    </g>

                    {/* Edge SAN Device Cables (PortFast) */}
                    {edgeDevices.map((ed) => {
                      const swOk = switches[ed.swId].alive && dist[ed.swId] < Infinity;
                      return (
                        <g key={`EDGE-LNK-${ed.id}`}>
                          <path d={ed.line} fill="none" stroke={swOk ? '#38BDF8' : '#FF5C65'} strokeWidth="2.4" strokeDasharray={swOk ? undefined : '5 4'} />
                          {packetsPlaying && swOk && (
                            <CablePacket path={ed.line} color="#7DD3FC" active={true} duration={packetDuration} delay={ed.swId * 0.2} radius={2.6} />
                          )}
                        </g>
                      );
                    })}

                    {/* 4 Inter-Switch Fiber Ring Links (Clickable to Cut/Restore) */}
                    {ringLinks.map((lnk, i) => {
                      const st = linkRoles[i];
                      const strokeCol = st.cut || st.uRole === 'DOWN'
                        ? '#FF4D5E'
                        : st.blocking
                        ? '#F59E0B'
                        : '#00E5FF';
                      return (
                        <g key={lnk.id} className="cursor-pointer" onClick={() => toggleRstpCut(lnk.idx)}>
                          <title>{`${lnk.label} — Click to ${st.cut ? 'restore' : 'cut fiber'}`}</title>
                          <path d={lnk.path} fill="none" stroke="transparent" strokeWidth="22" />
                          <path
                            d={lnk.path}
                            fill="none"
                            stroke={strokeCol}
                            strokeWidth={st.blocking ? 3.2 : 4}
                            strokeDasharray={st.cut || st.uRole === 'DOWN' ? '7 6' : st.blocking ? '9 6' : undefined}
                            opacity={st.blocking ? 0.85 : 1}
                          />
                          {packetsPlaying && st.forwarding && (
                            <>
                              <CablePacket path={lnk.path} color="#22C55E" active={true} duration={packetDuration} delay={i * 0.22} radius={3.2} />
                              <CablePacket path={lnk.rev} color="#00E5FF" active={true} duration={packetDuration * 1.1} delay={i * 0.22 + 0.45} radius={2.7} />
                            </>
                          )}
                          {/* Mid-link Status Pill */}
                          <g transform={`translate(${lnk.midX}, ${lnk.midY})`}>
                            <rect
                              x="-64"
                              y="-12"
                              width="128"
                              height="24"
                              rx="6"
                              fill={st.cut || st.uRole === 'DOWN' ? '#3B0D15' : st.blocking ? '#3B2609' : '#082038'}
                              stroke={strokeCol}
                              strokeWidth="1.3"
                            />
                            <text x="0" y="4" textAnchor="middle" fill={st.cut || st.uRole === 'DOWN' ? '#FDA4AF' : st.blocking ? '#FDE68A' : '#E2F1FF'} fontSize="9.2" fontWeight="bold">
                              {st.cut
                                ? `✖ ${lnk.id} FIBER CUT`
                                : st.uRole === 'DOWN'
                                ? `✖ ${lnk.id} LINK DOWN`
                                : st.blocking
                                ? `⛔ ${lnk.id} BLOCKING (LOOP)`
                                : `● ${lnk.id} FORWARDING`}
                            </text>
                          </g>
                        </g>
                      );
                    })}

                    {/* 4 Hirschmann RSP35 Industrial Switches (Zero Device Boxes) */}
                    {switches.map((sw) => {
                      const isRoot = rootSw.id === sw.id;
                      const isReach = sw.alive && dist[sw.id] < Infinity;
                      return (
                        <g key={sw.code} className="cursor-pointer" onClick={() => sw.id === 0 && toggleSw1Fault()}>
                          <image
                            href={getHardwarePhoto('DIN_SWITCH')}
                            x={sw.x - 84}
                            y={sw.y - 16}
                            width="168"
                            height="88"
                            preserveAspectRatio="xMidYMid meet"
                            opacity={sw.alive ? 1 : 0.42}
                          />
                          {/* Root Bridge Crown Badge */}
                          {isRoot && sw.alive && (
                            <g transform={`translate(${sw.x}, ${sw.y - 32})`}>
                              <rect x="-78" y="-11" width="156" height="20" rx="5" fill="#06281E" stroke="#22C55E" strokeWidth="1.3" />
                              <text x="0" y="3" textAnchor="middle" fill="#4ADE80" fontSize="9.2" fontWeight="bold" fontFamily="monospace">
                                ★ ROOT BRIDGE (PRI {sw.pri})
                              </text>
                            </g>
                          )}
                          <text x={sw.x} y={sw.y + 84} textAnchor="middle" fill="#FFFFFF" fontSize="11.5" fontWeight="bold">
                            {sw.code} — {sw.name}
                          </text>
                          <text x={sw.x} y={sw.y + 98} textAnchor="middle" fill="#00D4FF" fontSize="9.5" fontFamily="monospace">
                            {sw.ip} · Pri {sw.pri} · Cost {dist[sw.id] === Infinity ? '∞' : dist[sw.id]}
                          </text>
                          <text x={sw.x} y={sw.y + 112} textAnchor="middle" fill={!sw.alive || !isReach ? '#FF5C65' : '#4ADE80'} fontSize="9" fontWeight="bold">
                            {!sw.alive ? '✕ SWITCH POWER FAULT' : !isReach ? '✖ ISOLATED FROM ROOT' : isRoot ? '● ROOT (ALL PORTS DP)' : '● CONVERGED (802.1w)'}
                          </text>
                        </g>
                      );
                    })}

                    {/* On-Switch Port Role Badges (RP / DP / AP) */}
                    {ringLinks.map((lnk, i) => {
                      const st = linkRoles[i];
                      const uBadgeX = lnk.idx === 0 ? lnk.uPt.x + 20 : lnk.idx === 2 ? lnk.uPt.x - 20 : lnk.uPt.x + (lnk.idx === 1 ? 26 : -26);
                      const uBadgeY = lnk.idx === 0 || lnk.idx === 2 ? lnk.uPt.y - 14 : lnk.uPt.y + (lnk.idx === 1 ? 14 : -14);
                      const vBadgeX = lnk.idx === 0 ? lnk.vPt.x - 20 : lnk.idx === 2 ? lnk.vPt.x + 20 : lnk.vPt.x + (lnk.idx === 1 ? 26 : -26);
                      const vBadgeY = lnk.idx === 0 || lnk.idx === 2 ? lnk.vPt.y - 14 : lnk.vPt.y + (lnk.idx === 1 ? -14 : 14);
                      return (
                        <g key={`ROLES-${lnk.id}`}>
                          {/* U-side jack & role pill */}
                          <rect x={lnk.uPt.x - 6} y={lnk.uPt.y - 5} width="12" height="10" rx="2" fill="#040D1A" stroke={roleColor(st.uRole)} strokeWidth="1.6" />
                          <circle cx={lnk.uPt.x} cy={lnk.uPt.y} r="2.2" fill={roleColor(st.uRole)} />
                          <rect x={uBadgeX - 18} y={uBadgeY - 8} width="36" height="15" rx="3" fill="#040D1A" stroke={roleColor(st.uRole)} strokeWidth="1.1" />
                          <text x={uBadgeX} y={uBadgeY + 2.5} textAnchor="middle" fill={roleColor(st.uRole)} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                            {st.uRole === 'AP' ? 'AP⛔' : st.uRole}
                          </text>
                          {/* V-side jack & role pill */}
                          <rect x={lnk.vPt.x - 6} y={lnk.vPt.y - 5} width="12" height="10" rx="2" fill="#040D1A" stroke={roleColor(st.vRole)} strokeWidth="1.6" />
                          <circle cx={lnk.vPt.x} cy={lnk.vPt.y} r="2.2" fill={roleColor(st.vRole)} />
                          <rect x={vBadgeX - 18} y={vBadgeY - 8} width="36" height="15" rx="3" fill="#040D1A" stroke={roleColor(st.vRole)} strokeWidth="1.1" />
                          <text x={vBadgeX} y={vBadgeY + 2.5} textAnchor="middle" fill={roleColor(st.vRole)} fontSize="8.5" fontWeight="bold" fontFamily="monospace">
                            {st.vRole === 'AP' ? 'AP⛔' : st.vRole}
                          </text>
                        </g>
                      );
                    })}

                    {/* Edge SAN Devices (Zero Boxes) */}
                    {edgeDevices.map((ed) => {
                      const ok = switches[ed.swId].alive && dist[ed.swId] < Infinity;
                      return (
                        <g key={`EDGE-DEV-${ed.id}`} className="cursor-pointer" onClick={() => handleSelectDevice(ed.id, true)}>
                          <image href={ed.img} x={ed.x} y={ed.y} width={ed.w} height={ed.h} preserveAspectRatio="xMidYMid meet" opacity={ok ? 1 : 0.48} />
                          <text x={ed.x + ed.w / 2} y={ed.y + ed.h + 14} textAnchor="middle" fill="#FFFFFF" fontSize="10.2" fontWeight="bold">{ed.title}</text>
                          <text x={ed.x + ed.w / 2} y={ed.y + ed.h + 26} textAnchor="middle" fill="#00D4FF" fontSize="9" fontFamily="monospace">{ed.ip}</text>
                          <text x={ed.x + ed.w / 2} y={ed.y + ed.h + 38} textAnchor="middle" fill={ok ? '#4ADE80' : '#FF5C65'} fontSize="8.5" fontWeight="bold">
                            {ok ? '● Edge PortFast OK' : '✖ Offline'}
                          </text>
                        </g>
                      );
                    })}

                    {/* Center RSTP Convergence Banner */}
                    <text x="640" y="328" textAnchor="middle" fill="#FDE68A" fontSize="14.5" fontWeight="bold">
                      IEEE 802.1w RSTP RING ENGINE
                    </text>
                    <text x="640" y="348" textAnchor="middle" fill={isPartitioned ? '#FF5C65' : hasFault ? '#FACC15' : '#4ADE80'} fontSize="11.2" fontWeight="bold">
                      {isPartitioned
                        ? `✖ RING PARTITIONED — ${reachableSwCount}/${aliveSwitches.length} SWITCHES REACHABLE`
                        : !hasFault
                        ? '● LOOP-FREE RING HEALTHY — SW-3 P8 BLOCKING (NO BROADCAST STORM)'
                        : rstpSw1Fault
                        ? '▲ ROOT RE-ELECTED (SW-2) — ALTERNATE PORT PROMOTED (~28 ms)'
                        : '▲ RECONVERGED ON BACKUP PATH — ALTERNATE PORT FORWARDING (~15 ms)'}
                    </text>
                    <text x="640" y="366" textAnchor="middle" fill="#93C5FD" fontSize="9.6" fontFamily="monospace">
                      Elected Root: {rootSw.code} (Pri {rootSw.pri}) • Blocking Link: {blockingLinkIdx !== -1 ? ringLinks[blockingLinkIdx].id : 'None (Open Linear Path)'} • Failover: {isPartitioned ? 'N/A' : hasFault ? '~15–28 ms' : 'Ready (< 50 ms)'}
                    </text>
                  </svg>
                </div>

                {/* Bottom 3 Engineering Panels: Comparison Table + BPDU Event Log */}
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-1.5">
                    <div className="text-[11px] font-extrabold text-[#FDE68A] uppercase">
                      PRP vs HSR vs RSTP — Substation Comparison
                    </div>
                    <table className="w-full text-[10px] border-collapse">
                      <thead>
                        <tr className="text-left text-[#8BB3D4] border-b border-[#18385A]">
                          <th className="py-1">Protocol</th>
                          <th className="py-1">Recovery</th>
                          <th className="py-1">SAN Support</th>
                          <th className="py-1">IEC 61850 Use</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#122944] text-slate-200">
                        <tr>
                          <td className="py-1 font-bold text-[#00CFFF]">PRP</td>
                          <td className="py-1 text-[#4ADE80] font-mono">0 ms</td>
                          <td className="py-1">Via RedBox</td>
                          <td className="py-1">Station Bus</td>
                        </tr>
                        <tr>
                          <td className="py-1 font-bold text-[#C084FC]">HSR</td>
                          <td className="py-1 text-[#4ADE80] font-mono">0 ms</td>
                          <td className="py-1">Via RedBox</td>
                          <td className="py-1">Bay / Process</td>
                        </tr>
                        <tr className="bg-[#2E2206]/60 font-semibold">
                          <td className="py-1 font-bold text-[#F59E0B]">RSTP</td>
                          <td className="py-1 text-[#FDE68A] font-mono">5–50 ms</td>
                          <td className="py-1 text-[#4ADE80]">Native (All)</td>
                          <td className="py-1">MMS / Legacy</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>

                  <div className="xl:col-span-2 p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F] space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-extrabold text-[#77E7FF] uppercase">
                        Live RSTP BPDU / TCN &amp; Port Role Transition Log
                      </span>
                      <span className="text-[10px] font-mono text-[#8BB3D4]">Hello: 2s · MaxAge: 6s · FwdDelay: Proposal/Agreement</span>
                    </div>
                    <div className="max-h-[96px] overflow-y-auto space-y-1 font-mono text-[10px]">
                      {rstpEventLog.map((ev) => (
                        <div key={ev.id} className="flex items-start gap-2 bg-[#040E1D] px-2 py-1 rounded border border-[#142D4A]">
                          <span className="text-[#00CFFF] shrink-0">{ev.time}</span>
                          <span className={ev.severity === 'CRITICAL' ? 'text-[#FF5C65] font-bold shrink-0' : ev.severity === 'WARNING' ? 'text-[#FACC15] font-bold shrink-0' : 'text-[#4ADE80] font-bold shrink-0'}>
                            [{ev.severity}]
                          </span>
                          <span className="text-slate-200">{ev.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* TAB 5: VLAN & PORTS */}
          {activeView === 'VLAN_PORTS' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-4 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#15314E] pb-2.5">
                <div>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    IEEE 802.1Q VLAN Segmentation &amp; Hirschmann RSP35 Switch Port Matrix
                  </h2>
                  <p className="text-xs text-[#8BB3D4]">
                    Illustrative station-bus VLAN segregation isolating critical Layer-2 Protection GOOSE (VLAN 20) from SCADA MMS (VLAN 10), Engineering (VLAN 30), and IEEE 1588v2 PTP Time Sync (VLAN 40).
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedSwitchPlane('LAN_A')}
                    className={`px-3 py-1 rounded text-xs font-bold border ${
                      selectedSwitchPlane === 'LAN_A'
                        ? 'bg-[#00CFFF] text-slate-950 border-[#00CFFF]'
                        : 'bg-[#081A30] text-slate-300 border-[#1E3A5F]'
                    }`}
                  >
                    Hirschmann RSP35 (LAN A)
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedSwitchPlane('LAN_B')}
                    className={`px-3 py-1 rounded text-xs font-bold border ${
                      selectedSwitchPlane === 'LAN_B'
                        ? 'bg-[#FACC15] text-slate-950 border-[#FACC15]'
                        : 'bg-[#081A30] text-slate-300 border-[#1E3A5F]'
                    }`}
                  >
                    Hirschmann RSP35 (LAN B)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {VLAN_DEFINITIONS.map((v) => (
                  <div
                    key={v.vlanId}
                    onClick={() => setSelectedVlan(selectedVlan === v.vlanId ? null : v.vlanId)}
                    className={`cursor-pointer p-3 rounded-lg bg-[#081A30] border transition ${
                      selectedVlan === v.vlanId ? 'border-white ring-1 ring-white' : 'border-[#1E3A5F] hover:border-[#00CFFF]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-extrabold" style={{ color: v.color }}>
                        {v.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#040B16] text-slate-300">
                        {v.priority}
                      </span>
                    </div>
                    <div className="text-[11px] text-white font-mono mt-1">{v.protocol}</div>
                    <p className="text-[11px] text-[#8BB3D4] mt-1">{v.description}</p>
                    <div className="mt-2 flex flex-wrap gap-1 text-[10px] font-mono">
                      <span className="text-slate-400">Tagged:</span>
                      {v.taggedPorts.map((tp) => (
                        <span key={tp} className="px-1.5 py-0.2 rounded bg-[#0E294B] text-[#77E7FF]">
                          {tp}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-[#1E3A5F] text-[#77E7FF] font-mono text-[11px] bg-[#071526]">
                      <th className="py-2 px-2.5">Port</th>
                      <th className="py-2 px-2.5">Connected Equipment</th>
                      <th className="py-2 px-2.5">Media / Speed</th>
                      <th className="py-2 px-2.5">802.1Q Mode</th>
                      <th className="py-2 px-2.5">PVID / Allowed VLANs</th>
                      <th className="py-2 px-2.5">RSTP State</th>
                      <th className="py-2 px-2.5">Status</th>
                      <th className="py-2 px-2.5">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132A44] font-mono text-[11px]">
                    {activeSwitchPorts.map((p) => {
                      const st = getEffectivePortStatus(p);
                      const ov = getPortOverride(p.portId);
                      return (
                        <tr
                          key={p.portId}
                          onClick={() => setSelectedPortNumber(p.portNumber)}
                          className={`cursor-pointer transition ${
                            selectedPortNumber === p.portNumber ? 'bg-[#0E2B48]' : 'hover:bg-[#081A30]'
                          }`}
                        >
                          <td className="py-2 px-2.5 font-bold text-[#00CFFF]">{p.portId}</td>
                          <td className="py-2 px-2.5 text-white font-sans font-semibold">
                            {p.connectedDeviceName}
                            <div className="text-[10px] text-slate-400 font-mono">{p.remotePort}</div>
                          </td>
                          <td className="py-2 px-2.5 text-slate-300">
                            {p.speedLabel}
                            <div className="text-[10px] text-slate-400">{p.mediaType}</div>
                          </td>
                          <td className="py-2 px-2.5 text-[#77E7FF]">{p.portMode}</td>
                          <td className="py-2 px-2.5">
                            <span className="text-[#FDE047]">
                              PVID {ov.vlanMismatch ? 999 : p.nativeVlan}
                            </span>{' '}
                            • [{p.allowedVlans.join(', ')}]
                          </td>
                          <td className="py-2 px-2.5 text-slate-300">{p.rstpRole}</td>
                          <td className="py-2 px-2.5">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                st === 'UP'
                                  ? 'bg-[#22C55E]/20 text-[#4ADE80]'
                                  : 'bg-[#FF5C65]/20 text-[#FDA4AF]'
                              }`}
                            >
                              {st}
                            </span>
                          </td>
                          <td className="py-2 px-2.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                updatePortOverride(p.portId, { disabled: !ov.disabled });
                              }}
                              className="px-2 py-0.5 rounded bg-[#102A45] border border-[#2B547E] text-[#77E7FF] hover:text-white"
                            >
                              {ov.disabled ? 'Enable' : 'Disable'}
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: LIVE TRAFFIC */}
          {activeView === 'LIVE_TRAFFIC' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-4 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#15314E] pb-2.5">
                <div>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Live IEC 61850 Station-Bus Traffic &amp; Frame Decoder (MMS / GOOSE / PTPv2)
                  </h2>
                  <p className="text-xs text-[#8BB3D4]">
                    Real-time simulated protocol stream across VLAN 10 (MMS), VLAN 20 (GOOSE), and VLAN 40 (IEEE 1588v2 PTP).
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => triggerGooseStateChangeBurst(gooseControlBlocks[0]?.id || 'GOCB-132-L1-TRIP')}
                    className="px-3 py-1.5 rounded-lg bg-[#093524] border border-[#22C55E] text-[#4ADE80] text-xs font-bold hover:bg-[#0D4730]"
                  >
                    Trigger GOOSE Event Burst (stNum+1)
                  </button>
                  <button
                    type="button"
                    onClick={() => triggerMmsGeneralInterrogation(rackIedSiemens.id)}
                    className="px-3 py-1.5 rounded-lg bg-[#0B3B5B] border border-[#00CFFF] text-[#77E7FF] text-xs font-bold hover:bg-[#104E78]"
                  >
                    Issue SCADA MMS General Interrogation (GI)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-lg bg-[#081A30] border border-[#00CFFF]/50">
                  <div className="text-[11px] font-bold text-[#00CFFF]">VLAN 10 — IEC 61850 MMS (TCP:102)</div>
                  <div className="text-xl font-black text-white font-mono mt-1">{liveMetrics.mmsMbps} Mbps</div>
                  <div className="text-[11px] text-[#8BB3D4] mt-0.5">
                    BRCB/URCB Reports • Client: 192.168.10.10 (SCADA Server A)
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#081A30] border border-[#22C55E]/50">
                  <div className="text-[11px] font-bold text-[#4ADE80]">VLAN 20 — GOOSE Multicast (0x88B8)</div>
                  <div className="text-xl font-black text-white font-mono mt-1">{liveMetrics.gooseKbps} kbps</div>
                  <div className="text-[11px] text-[#8BB3D4] mt-0.5">
                    802.1p Priority 4 • MinTime 4 ms / MaxTime 1000 ms
                  </div>
                </div>
                <div className="p-3 rounded-lg bg-[#081A30] border border-[#FFB547]/50">
                  <div className="text-[11px] font-bold text-[#FDE047]">VLAN 40 — IEEE 1588v2 PTP / SNTP</div>
                  <div className="text-xl font-black text-white font-mono mt-1">{liveMetrics.sntpKbps} kbps</div>
                  <div className="text-[11px] text-[#8BB3D4] mt-0.5">
                    GM: 192.168.10.100 (Meinberg) • Sync Interval 1 s
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#1E3A5F] bg-[#071526] text-[#77E7FF]">
                      <th className="py-2 px-2.5">Plane</th>
                      <th className="py-2 px-2.5">Source → Destination</th>
                      <th className="py-2 px-2.5">VLAN / PRI</th>
                      <th className="py-2 px-2.5">Protocol</th>
                      <th className="py-2 px-2.5">Decoded IEC 61850 / PRP Payload Summary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132A44] text-[11px]">
                    <tr className="hover:bg-[#081A30]">
                      <td className="py-2 px-2.5 text-[#00CFFF] font-bold">LAN A/B</td>
                      <td className="py-2 px-2.5 text-white">192.168.10.11 → 01-0C-CD-01-00-33</td>
                      <td className="py-2 px-2.5 text-[#4ADE80]">VLAN 20 (PRI 4)</td>
                      <td className="py-2 px-2.5 text-[#4ADE80] font-bold">GOOSE 0x88B8</td>
                      <td className="py-2 px-2.5 text-slate-300">
                        gocbRef=IED_33_F03/LLN0$GO$gcbFeeder03StatusTrip • stNum=7 sqNum=42 • RCT=0x88FB
                      </td>
                    </tr>
                    <tr className="hover:bg-[#081A30]">
                      <td className="py-2 px-2.5 text-[#00CFFF] font-bold">LAN A/B</td>
                      <td className="py-2 px-2.5 text-white">192.168.10.12 → 01-0C-CD-01-00-11</td>
                      <td className="py-2 px-2.5 text-[#4ADE80]">VLAN 20 (PRI 4)</td>
                      <td className="py-2 px-2.5 text-[#4ADE80] font-bold">GOOSE 0x88B8</td>
                      <td className="py-2 px-2.5 text-slate-300">
                        gocbRef=IED_11_F01/LLN0$GO$gcb11kVReverseBlocking • stNum=3 sqNum=215 • TAL=2000ms
                      </td>
                    </tr>
                    <tr className="hover:bg-[#081A30]">
                      <td className="py-2 px-2.5 text-[#00CFFF] font-bold">LAN A/B</td>
                      <td className="py-2 px-2.5 text-white">192.168.10.11:102 → 192.168.10.10</td>
                      <td className="py-2 px-2.5 text-[#00CFFF]">VLAN 10 (PRI 2)</td>
                      <td className="py-2 px-2.5 text-[#00CFFF] font-bold">MMS Report</td>
                      <td className="py-2 px-2.5 text-slate-300">
                        InformationReport (brcbSt01) • dsStatus: XCBR1.Pos.stVal=10 (CLOSED), q=0x0000
                      </td>
                    </tr>
                    <tr className="hover:bg-[#081A30]">
                      <td className="py-2 px-2.5 text-[#00CFFF] font-bold">LAN A/B</td>
                      <td className="py-2 px-2.5 text-white">192.168.10.13:102 → 192.168.10.30</td>
                      <td className="py-2 px-2.5 text-[#00CFFF]">VLAN 10 (PRI 2)</td>
                      <td className="py-2 px-2.5 text-[#00CFFF] font-bold">MMS → IEC 104</td>
                      <td className="py-2 px-2.5 text-slate-300">
                        MiCOM C264 Bay Report mapped to Station Gateway IOA #1001..#4012 for SLDC
                      </td>
                    </tr>
                    <tr className="hover:bg-[#081A30]">
                      <td className="py-2 px-2.5 text-[#FDE047] font-bold">LAN A/B</td>
                      <td className="py-2 px-2.5 text-white">192.168.10.100 → 01-1B-19-00-00-00</td>
                      <td className="py-2 px-2.5 text-[#FDE047]">VLAN 40 (PRI 6)</td>
                      <td className="py-2 px-2.5 text-[#FDE047] font-bold">PTPv2 Sync</td>
                      <td className="py-2 px-2.5 text-slate-300">
                        IEEE C37.238 Power Profile Domain 93 • Grandmaster Locked (±38 ns offset)
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: FAULT INJECTION */}
          {activeView === 'FAULT_INJECTION' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-4 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#15314E] pb-2.5">
                <div>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    Station-Bus Communication &amp; Redundancy Fault Injection Matrix
                  </h2>
                  <p className="text-xs text-[#8BB3D4]">
                    Inject controlled physical layer, switch port, VLAN, GOOSE, MMS, and PTP synchronization faults and observe real-time failover behavior.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={resetAllPortFaults}
                  className="px-3 py-1.5 rounded-lg bg-[#093524] border border-[#22C55E] text-[#4ADE80] text-xs font-bold"
                >
                  Clear All Injected Faults
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {faultScenarios
                  .filter(
                    (f) =>
                      f.category === 'Network & Sync' ||
                      f.category === 'Protection & GOOSE' ||
                      f.category === 'MMS & SCADA'
                  )
                  .map((fault) => (
                    <div
                      key={fault.id}
                      className={`p-3 rounded-lg border transition ${
                        fault.active
                          ? 'bg-[#3B0D15]/70 border-[#FF5C65]'
                          : 'bg-[#081A30] border-[#1E3A5F]'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-mono font-bold text-[#00CFFF]">{fault.code}</span>
                        <button
                          type="button"
                          onClick={() => toggleFaultScenario(fault.id)}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold border ${
                            fault.active
                              ? 'bg-[#FF5C65] text-white border-white'
                              : 'bg-[#040B16] text-[#77E7FF] border-[#00CFFF]/60 hover:border-[#00CFFF]'
                          }`}
                        >
                          {fault.active ? 'ACTIVE — Click to Restore' : 'Inject Fault'}
                        </button>
                      </div>
                      <div className="text-xs font-bold text-white mt-1">{fault.title}</div>
                      <div className="text-[11px] text-[#FDE047] font-mono mt-0.5">
                        Target: {fault.targetBayOrIed}
                      </div>
                      <p className="text-[11px] text-[#8BB3D4] mt-1">{fault.symptoms[0]}</p>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* RIGHT 4 COLUMNS: INTERACTIVE INSPECTION & DIAGNOSTIC PANELS */}
        <div className="xl:col-span-4 space-y-2 min-w-0 xl:max-h-[575px] xl:overflow-y-auto xl:pr-1">
          {/* PANEL 1: VLAN SEGMENTATION (IEEE 802.1Q) */}
          <div className="rounded-xl bg-gradient-to-b from-[#081A30] to-[#051120] border border-[#1B4268] p-2 shadow-lg">
            <div className="flex items-center justify-between mb-1.5">
              <h2 className="text-xs font-extrabold tracking-wider text-white uppercase">
                VLAN SEGMENTATION (IEEE 802.1Q)
              </h2>
              {selectedVlan !== null && (
                <button
                  type="button"
                  onClick={() => setSelectedVlan(null)}
                  className="text-[10px] font-mono text-[#00CFFF] hover:underline"
                >
                  Show All VLANs
                </button>
              )}
            </div>

            <svg viewBox="0 0 375 96" className="w-full h-auto select-none">
              <defs>
                <linearGradient id="trunkCylGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#1E4E79" />
                  <stop offset="45%" stopColor="#0D2744" />
                  <stop offset="100%" stopColor="#061324" />
                </linearGradient>
              </defs>

              <text x="6" y="16" fill="#B8D4EA" fontSize="9.5" fontWeight="600">
                Trunk Link carrying
              </text>
              <text x="6" y="28" fill="#B8D4EA" fontSize="9.5" fontWeight="600">
                multiplexed tagged
              </text>
              <text x="6" y="40" fill="#B8D4EA" fontSize="9.5" fontWeight="600">
                traffic
              </text>

              <path
                d="M 14 48 L 88 48 A 8 13 0 0 1 88 74 L 14 74 Z"
                fill="url(#trunkCylGrad)"
                stroke="#38BDF8"
                strokeWidth="1.2"
              />
              <ellipse cx="14" cy="61" rx="6" ry="13" fill="#0B2239" stroke="#38BDF8" strokeWidth="1.2" />
              <ellipse cx="88" cy="61" rx="6" ry="13" fill="#081C30" stroke="#77E7FF" strokeWidth="1.4" />
              <text x="51" y="90" textAnchor="middle" fill="#DCEAF5" fontSize="10" fontWeight="bold">
                Trunk Port
              </text>

              {[
                {
                  vlan: 10,
                  label: 'VLAN 10: SCADA / MMS',
                  color: '#00CFFF',
                  y: 18,
                  path: 'M 88 55 C 130 55, 135 18, 175 18 L 358 18',
                },
                {
                  vlan: 20,
                  label: 'VLAN 20: GOOSE (Protection)',
                  color: '#22C55E',
                  y: 42,
                  path: 'M 88 59 C 130 59, 135 42, 175 42 L 358 42',
                },
                {
                  vlan: 30,
                  label: 'VLAN 30: Engineering',
                  color: '#A855F7',
                  y: 66,
                  path: 'M 88 63 C 130 63, 135 66, 175 66 L 358 66',
                },
                {
                  vlan: 40,
                  label: 'VLAN 40: Time Sync (SNTP/PTP)',
                  color: '#FFB547',
                  y: 90,
                  path: 'M 88 67 C 130 67, 135 90, 175 90 L 358 90',
                },
              ].map((br, idx) => {
                const isSel = selectedVlan === br.vlan;
                const dimmed = selectedVlan !== null && !isSel;
                return (
                  <g
                    key={br.vlan}
                    className="cursor-pointer"
                    opacity={dimmed ? 0.3 : 1}
                    onClick={() => setSelectedVlan(isSel ? null : br.vlan)}
                  >
                    <path
                      d={br.path}
                      fill="none"
                      stroke={br.color}
                      strokeWidth={isSel ? 4.2 : 3}
                      strokeLinecap="round"
                    />
                    <polygon
                      points={`364,${br.y} 354,${br.y - 4.5} 354,${br.y + 4.5}`}
                      fill={br.color}
                    />
                    <text x="182" y={br.y - 6} fill={br.color} fontSize="9.5" fontWeight="bold">
                      {br.label}
                    </text>
                    <CablePacket
                      path={br.path}
                      color={br.color}
                      active={packetsPlaying}
                      duration={packetDuration}
                      delay={idx * 0.25}
                      radius={2.8}
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* PANEL 2: HIRSCHMANN RSP35 – PORT DETAILS & NETWORK PORT INSPECTOR */}
          <div className="rounded-xl bg-gradient-to-b from-[#081A30] to-[#051120] border border-[#1B4268] p-2 shadow-lg space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-extrabold tracking-wider text-white uppercase">
                HIRSCHMANN RSP35 – PORT DETAILS ({selectedSwitchPlane === 'LAN_A' ? 'LAN A' : 'LAN B'})
              </h2>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setSelectedSwitchPlane('LAN_A')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedSwitchPlane === 'LAN_A'
                      ? 'bg-[#00CFFF] text-slate-950 border-[#00CFFF]'
                      : 'bg-[#040B16] text-slate-300 border-[#1E3A5F]'
                  }`}
                >
                  LAN A
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSwitchPlane('LAN_B')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                    selectedSwitchPlane === 'LAN_B'
                      ? 'bg-[#FACC15] text-slate-950 border-[#FACC15]'
                      : 'bg-[#040B16] text-slate-300 border-[#1E3A5F]'
                  }`}
                >
                  LAN B
                </button>
              </div>
            </div>

            <div className="rounded-lg bg-gradient-to-r from-[#102E6B] via-[#174291] to-[#102A61] border border-[#4978C9] p-2 shadow-inner">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-[78px] border-r border-[#3B66B0] pr-2">
                  <div className="text-[10px] font-black text-white tracking-wider">HIRSCHMANN</div>
                  <div className="text-[9.5px] font-bold text-[#93C5FD]">RSP35</div>
                  <div className="mt-1 flex items-center gap-1 text-[8px] font-mono text-emerald-300">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E]" /> P1/P2 OK
                  </div>
                </div>

                <div className="grid grid-cols-8 gap-1 flex-1">
                  {activeSwitchPorts.map((p) => {
                    const st =
                      activeView === 'HSR_RING' && p.portNumber <= 8
                        ? hsrCutSegments.includes(p.portNumber - 1)
                          ? 'DOWN'
                          : 'UP'
                        : getEffectivePortStatus(p);
                    const isSel =
                      activeView === 'HSR_RING' && p.portNumber <= 8
                        ? hsrSelectedSegment === p.portNumber - 1
                        : selectedPortNumber === p.portNumber;
                    return (
                      <button
                        key={p.portId}
                        type="button"
                        onClick={() => {
                          setSelectedPortNumber(p.portNumber);
                          if (activeView === 'HSR_RING' && p.portNumber <= 8) {
                            setHsrSelectedSegment(p.portNumber - 1);
                          }
                        }}
                        className={`rounded p-1 bg-[#070E1A] border flex flex-col items-center transition ${
                          isSel
                            ? 'border-[#00F0FF] ring-2 ring-[#00F0FF]/60 scale-105'
                            : st === 'DOWN'
                            ? 'border-[#FF5C65]'
                            : 'border-[#475569] hover:border-[#00CFFF]'
                        }`}
                      >
                        <div className="w-full flex justify-between px-0.5 mb-0.5">
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st === 'UP' ? 'bg-[#22C55E]' : st === 'DOWN' ? 'bg-[#FF5C65]' : 'bg-slate-600'
                            }`}
                          />
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              st === 'UP' && packetsPlaying ? 'bg-[#FACC15] animate-pulse' : 'bg-slate-700'
                            }`}
                          />
                        </div>
                        <div className="w-4 h-3.5 rounded-[1px] bg-[#1E293B] border border-[#64748B]" />
                        <span className="text-[8px] font-mono text-white font-bold mt-0.5">
                          {p.portNumber}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-1 text-center text-[9.5px] leading-tight pt-0.5">
              <div className="border-t-2 border-[#00CFFF]/70 pt-1 text-[#DCEAF5]">
                <div className="font-bold">IED Ports</div>
                <div className="text-[#77E7FF] font-mono">(1–3)</div>
              </div>
              <div className="border-t-2 border-[#00CFFF]/70 pt-1 text-[#DCEAF5]">
                <div className="font-bold">Access Ports</div>
                <div className="text-[#77E7FF] font-mono">(4–5)</div>
              </div>
              <div className="border-t-2 border-[#00CFFF]/70 pt-1 text-[#DCEAF5]">
                <div className="font-bold">Trunk Ports</div>
                <div className="text-[#77E7FF] font-mono">(6–7)</div>
              </div>
              <div className="border-t-2 border-[#FFB547]/80 pt-1 text-[#DCEAF5]">
                <div className="font-bold">HSR/PRP</div>
                <div className="text-[#FDE047] font-mono">Ring (8)</div>
              </div>
            </div>

            <div className="rounded-lg bg-[#040B16] border border-[#163554] p-2 text-[10.5px] space-y-1.5">
              <div className="flex items-center justify-between border-b border-[#132B44] pb-1.5">
                <span className="font-bold text-[#77E7FF] uppercase tracking-wide">
                  {activeView === 'HSR_RING'
                    ? `Port Inspector: HSR Ring • Segment #${hsrSelectedSegment + 1} (Port A ⇄ Port B)`
                    : `Port Inspector: ${inspectedPort.switchName} • ${inspectedPort.portId}`}
                </span>
                <span
                  className={`px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold ${
                    (activeView === 'HSR_RING'
                      ? !hsrCutSegments.includes(hsrSelectedSegment)
                      : getEffectivePortStatus(inspectedPort) === 'UP')
                      ? 'bg-[#22C55E]/20 text-[#4ADE80]'
                      : 'bg-[#FF5C65]/20 text-[#FDA4AF]'
                  }`}
                >
                  {activeView === 'HSR_RING'
                    ? hsrCutSegments.includes(hsrSelectedSegment)
                      ? 'FIBER CUT'
                      : 'LINK UP'
                    : `LINK ${getEffectivePortStatus(inspectedPort)}`}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 font-mono text-[9.5px] leading-tight">
                <div className="flex justify-between">
                  <span className="text-slate-400">{activeView === 'HSR_RING' ? 'RedBox / Mode:' : 'Switch:'}</span>
                  <span className="text-white">
                    {activeView === 'HSR_RING'
                      ? 'ABB AFS677 (HSR 0x892F)'
                      : selectedSwitchPlane === 'LAN_A'
                      ? 'Hirschmann LAN A'
                      : 'Hirschmann LAN B'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">{activeView === 'HSR_RING' ? 'Ring Segment:' : 'Port:'}</span>
                  <span className="text-[#00CFFF] font-bold">
                    {activeView === 'HSR_RING' ? `HSR-SEG-#${hsrSelectedSegment + 1}` : inspectedPort.portId}
                  </span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-slate-400">Connected device:</span>
                  <span className="text-white font-semibold">
                    {activeView === 'HSR_RING'
                      ? HSR_SEGMENTS[hsrSelectedSegment]?.endpointsText
                      : `${inspectedPort.connectedDeviceName} (${inspectedPort.remotePort})`}
                  </span>
                </div>
                <div className="flex justify-between col-span-2">
                  <span className="text-slate-400">Media:</span>
                  <span className="text-[#DCEAF5]">{inspectedPort.mediaType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">VLAN:</span>
                  <span className={inspectedPortOverride.vlanMismatch ? 'text-[#FF5C65] font-bold' : 'text-[#FDE047]'}>
                    {inspectedPortOverride.vlanMismatch
                      ? '999 (MISMATCH!)'
                      : `${inspectedPort.nativeVlan} [${inspectedPort.allowedVlans.join(',')}]`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Speed:</span>
                  <span className="text-white">{inspectedPort.speedLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tx/Rx Rate:</span>
                  <span className="text-[#77E7FF]">
                    {(activeView === 'HSR_RING'
                      ? !hsrCutSegments.includes(hsrSelectedSegment)
                      : getEffectivePortStatus(inspectedPort) === 'UP')
                      ? `${inspectedPort.baseTxPps}/${inspectedPort.baseRxPps} pps`
                      : '0/0 pps (Link Down)'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Errors / Loss:</span>
                  <span
                    className={
                      (activeView === 'HSR_RING' && hsrCutSegments.includes(hsrSelectedSegment)) ||
                      inspectedPortOverride.packetLossPercent > 0 ||
                      inspectedPortOverride.vlanMismatch
                        ? 'text-[#FF5C65] font-bold'
                        : 'text-[#4ADE80]'
                    }
                  >
                    {activeView === 'HSR_RING' && hsrCutSegments.includes(hsrSelectedSegment)
                      ? '100% Loss (Fiber Cut)'
                      : inspectedPortOverride.packetLossPercent > 0
                      ? `${inspectedPortOverride.packetLossPercent}% Loss (14 CRC)`
                      : inspectedPortOverride.vlanMismatch
                      ? '802.1Q VID Drop'
                      : '0 Errors'}
                  </span>
                </div>
              </div>

              <div className="pt-1 border-t border-[#132B44] grid grid-cols-6 gap-1 text-[8.5px] font-bold">
                <button
                  type="button"
                  onClick={() =>
                    updatePortOverride(inspectedPort.portId, { disabled: !inspectedPortOverride.disabled })
                  }
                  className={`py-0.5 px-1 rounded border transition ${
                    inspectedPortOverride.disabled
                      ? 'bg-[#FF5C65] text-white border-white'
                      : 'bg-[#081A30] text-slate-200 border-[#1E3A5F] hover:border-[#00CFFF]'
                  }`}
                >
                  {inspectedPortOverride.disabled ? 'Enable Port' : 'Disable Port'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeView === 'HSR_RING') {
                      toggleHsrSegmentCutImmediate(hsrSelectedSegment);
                    } else {
                      updatePortOverride(inspectedPort.portId, {
                        disconnected: !inspectedPortOverride.disconnected,
                      });
                    }
                  }}
                  className={`py-0.5 px-1 rounded border transition ${
                    inspectedPortOverride.disconnected
                      ? 'bg-[#FF5C65] text-white border-white'
                      : 'bg-[#081A30] text-slate-200 border-[#1E3A5F] hover:border-[#00CFFF]'
                  }`}
                >
                  {inspectedPortOverride.disconnected ? 'Reconnect Fiber' : 'Unplug Fiber'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updatePortOverride(inspectedPort.portId, {
                      vlanMismatch: !inspectedPortOverride.vlanMismatch,
                    });
                    if (!vlanMismatchActive) toggleFaultScenario('FLT-05');
                  }}
                  className={`py-0.5 px-1 rounded border transition ${
                    inspectedPortOverride.vlanMismatch
                      ? 'bg-[#FFB547] text-slate-950 border-white'
                      : 'bg-[#081A30] text-slate-200 border-[#1E3A5F] hover:border-[#FFB547]'
                  }`}
                >
                  {inspectedPortOverride.vlanMismatch ? 'Fix VLAN 20' : 'VLAN Mismatch'}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    updatePortOverride(inspectedPort.portId, {
                      packetLossPercent: inspectedPortOverride.packetLossPercent > 0 ? 0 : 5,
                    })
                  }
                  className={`py-0.5 px-1 rounded border transition ${
                    inspectedPortOverride.packetLossPercent > 0
                      ? 'bg-[#FFB547] text-slate-950 border-white'
                      : 'bg-[#081A30] text-slate-200 border-[#1E3A5F] hover:border-[#FFB547]'
                  }`}
                >
                  {inspectedPortOverride.packetLossPercent > 0 ? 'Clear 5% Loss' : 'Inject 5% Loss'}
                </button>
                <button
                  type="button"
                  onClick={() => toggleFaultScenario('FLT-04')}
                  className={`py-0.5 px-1 rounded border transition ${
                    gooseTimeoutActive
                      ? 'bg-[#FF5C65] text-white border-white'
                      : 'bg-[#081A30] text-slate-200 border-[#1E3A5F] hover:border-[#FF5C65]'
                  }`}
                >
                  {gooseTimeoutActive ? 'Restore GOOSE' : 'GOOSE Timeout'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (activeView === 'HSR_RING') {
                      applyHsrFiberCuts([]);
                    } else {
                      updatePortOverride(inspectedPort.portId, {
                        disabled: false,
                        disconnected: false,
                        vlanMismatch: false,
                        packetLossPercent: 0,
                        gooseTimeoutSim: false,
                      });
                    }
                  }}
                  className="py-0.5 px-1 rounded border bg-[#093524] border-[#22C55E] text-[#4ADE80] hover:bg-[#0D4730]"
                >
                  Restore Normal
                </button>
              </div>
            </div>
          </div>

          {/* PANEL 3: DEVICE & COMMUNICATION STATUS TABLE */}
          <div className="rounded-xl bg-gradient-to-b from-[#081A30] to-[#051120] border border-[#1B4268] p-2 shadow-lg">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-extrabold tracking-wider text-white uppercase">
                DEVICE &amp; COMMUNICATION STATUS
              </h2>
              <span className="text-[10px] font-mono text-[#77E7FF]">Click row to inspect</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-[10px]">
                <thead>
                  <tr className="border-b border-[#1A3A5C] text-[#8BB3D4] font-semibold">
                    <th className="py-1.5 pr-2">Device</th>
                    <th className="py-1 px-1">Interface</th>
                    <th className="py-1 px-1">IP Address</th>
                    <th className="py-1 px-1">VLAN</th>
                    <th className="py-1 px-1">Protocol</th>
                    <th className="py-1 pl-1 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#11263E] font-mono text-[9.5px]">
                  {(activeView === 'HSR_RING'
                    ? [
                        ...HSR_NODES.map((n) => ({
                          key: n.id,
                          name: n.name,
                          iface: 'HSR A/B',
                          ip: n.ip,
                          vlan: '10/20/40',
                          proto: 'GOOSE/MMS',
                          online: hsrSimulation.reachableNodeIndices.includes(n.index),
                        })),
                        {
                          key: 'SRV-SCADA-A',
                          name: 'ABB AFS677 RedBox',
                          iface: 'SAN↔HSR',
                          ip: '192.168.10.250',
                          vlan: '10/20/30/40',
                          proto: 'HSR 0x892F',
                          online: true,
                        },
                      ]
                    : [
                        {
                          key: 'IED-33-F03',
                          name: 'SIPROTEC 5 (7SJ85)',
                          iface: 'LAN A/B',
                          ip: '192.168.10.11',
                          vlan: '20',
                          proto: 'GOOSE/MMS',
                          online: !iedCommLossActive && (planeAHealthy || planeBHealthy),
                        },
                        {
                          key: 'IED-11-F01',
                          name: 'REF615 (ABB)',
                          iface: 'LAN A/B',
                          ip: '192.168.10.12',
                          vlan: '20',
                          proto: 'GOOSE',
                          online: planeAHealthy || planeBHealthy,
                        },
                        {
                          key: 'IED-132-BC',
                          name: 'MiCOM C264',
                          iface: 'LAN A/B',
                          ip: '192.168.10.13',
                          vlan: '20',
                          proto: 'GOOSE/MMS',
                          online: planeAHealthy || planeBHealthy,
                        },
                        {
                          key: 'IED-33-F02',
                          name: 'Multilin 850',
                          iface: 'LAN A/B',
                          ip: '192.168.10.14',
                          vlan: '20',
                          proto: 'MMS',
                          online: planeAHealthy || planeBHealthy,
                        },
                        {
                          key: 'SW-LAN-A1',
                          name: 'Hirschmann RSP35',
                          iface: 'LAN A',
                          ip: '192.168.10.2',
                          vlan: '10/20/30/40',
                          proto: '—',
                          online: planeAHealthy,
                        },
                      ]
                  ).map((row) => (
                    <tr
                      key={row.key}
                      onClick={() => handleSelectDevice(row.key, row.key !== 'SW-LAN-A1')}
                      className={`cursor-pointer transition ${
                        selectedDeviceKey === row.key ? 'bg-[#0F3152]' : 'hover:bg-[#0B2239]'
                      }`}
                    >
                      <td className="py-1 pr-1.5 font-sans font-bold text-white whitespace-nowrap">
                        {row.name}
                      </td>
                      <td className="py-1 px-1 text-[#00CFFF] whitespace-nowrap">{row.iface}</td>
                      <td className="py-1 px-1 text-[#DCEAF5] whitespace-nowrap">{row.ip}</td>
                      <td className="py-1 px-1 text-[#FDE047] whitespace-nowrap">{row.vlan}</td>
                      <td className="py-1 px-1 text-[#DCEAF5] whitespace-nowrap">{row.proto}</td>
                      <td className="py-1 pl-1 text-right whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 font-sans font-bold ${
                            row.online ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                          }`}
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${
                              row.online ? 'bg-[#22C55E] shadow-[0_0_5px_#22C55E]' : 'bg-[#FF5C65]'
                            }`}
                          />
                          {row.online ? 'Online' : 'Offline'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* PANEL 4: PRP / HSR LINK HEALTH & LIVE TRAFFIC STRIP */}
          <div className="rounded-xl bg-gradient-to-b from-[#081A30] to-[#051120] border border-[#1B4268] p-2 shadow-lg space-y-2.5">
            <h2 className="text-xs font-extrabold tracking-wider text-white uppercase">
              PRP / HSR LINK HEALTH
            </h2>

            <div className="space-y-1.5 text-xs">
              <div
                onClick={() => toggleFaultScenario('FLT-11')}
                title="Click to simulate/restore LAN A switch failure"
                className="cursor-pointer rounded-lg bg-[#040C18] border border-[#163452] hover:border-[#00CFFF] px-2 py-1 grid grid-cols-12 items-center gap-1"
              >
                <span className="col-span-4 font-bold text-white">LAN A (PRP)</span>
                <span
                  className={`col-span-3 inline-flex items-center gap-1.5 font-bold ${
                    planeAHealthy ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      planeAHealthy ? 'bg-[#22C55E] shadow-[0_0_5px_#22C55E]' : 'bg-[#FF5C65]'
                    }`}
                  />
                  {planeAHealthy ? 'Healthy' : 'Faulted'}
                </span>
                <span className="col-span-3 text-[11px] text-[#DCEAF5]">
                  {planeAHealthy
                    ? `${getPortOverride('Gi1/1').packetLossPercent}% Packet Loss`
                    : '100% Loss'}
                </span>
                <span className="col-span-2 text-right font-mono text-[10.5px] text-[#8BB3D4]">
                  RTT: {liveMetrics.rttLanA}
                </span>
              </div>

              <div
                onClick={() => toggleFaultScenario('FLT-12')}
                title="Click to simulate/restore LAN B switch failure"
                className="cursor-pointer rounded-lg bg-[#040C18] border border-[#163452] hover:border-[#FACC15] px-2 py-1 grid grid-cols-12 items-center gap-1"
              >
                <span className="col-span-4 font-bold text-white">LAN B (PRP)</span>
                <span
                  className={`col-span-3 inline-flex items-center gap-1.5 font-bold ${
                    planeBHealthy ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      planeBHealthy ? 'bg-[#22C55E] shadow-[0_0_5px_#22C55E]' : 'bg-[#FF5C65]'
                    }`}
                  />
                  {planeBHealthy ? 'Healthy' : 'Faulted'}
                </span>
                <span className="col-span-3 text-[11px] text-[#DCEAF5]">
                  {planeBHealthy
                    ? `${getPortOverride('Gi2/1').packetLossPercent}% Packet Loss`
                    : '100% Loss'}
                </span>
                <span className="col-span-2 text-right font-mono text-[10.5px] text-[#8BB3D4]">
                  RTT: {liveMetrics.rttLanB}
                </span>
              </div>

              <div
                onClick={() => setActiveView('HSR_RING')}
                className="cursor-pointer rounded-lg bg-[#040C18] border border-[#163452] hover:border-[#00CFFF] px-2 py-1 grid grid-cols-12 items-center gap-1"
              >
                <span className="col-span-4 font-bold text-white">HSR Ring</span>
                <span
                  className={`col-span-3 inline-flex items-center gap-1.5 font-bold ${
                    hsrBreakSegment === null ? 'text-[#4ADE80]' : 'text-[#FACC15]'
                  }`}
                >
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hsrBreakSegment === null ? 'bg-[#22C55E] shadow-[0_0_5px_#22C55E]' : 'bg-[#FACC15]'
                    }`}
                  />
                  {hsrCutSegments.length === 0 ? 'Healthy' : hsrCutSegments.length === 1 ? 'Degraded' : 'Partitioned'}
                </span>
                <span className="col-span-3 text-[11px] text-[#DCEAF5]">
                  {hsrCutSegments.length === 0
                    ? 'Ring Closed'
                    : hsrCutSegments.length === 1
                    ? '1 Break (Surviving)'
                    : `${hsrCutSegments.length} Breaks (${hsrSimulation.isolatedNodeIndices.length} Isol.)`}
                </span>
                <span className="col-span-2 text-right font-mono text-[10.5px] text-[#8BB3D4]">
                  Failover: &lt; 50 ms
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-[#041224] border border-[#00CFFF]/40 px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#00CFFF]" />
                <span className="font-bold text-[#77E7FF]">Live Traffic :</span>
              </div>
              <div className="font-mono text-[11px] text-white flex flex-wrap items-center gap-2">
                <span>MMS {liveMetrics.mmsMbps} Mbps</span>
                <span className="text-[#386186]">|</span>
                <span className="text-[#4ADE80]">GOOSE {liveMetrics.gooseKbps} kbps</span>
                <span className="text-[#386186]">|</span>
                <span className="text-[#FDE047]">SNTP {liveMetrics.sntpKbps} kbps</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. BOTTOM 4 REALISTIC STATION DEVICE STATUS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3 pt-0.5">
        {[
          {
            id: 'SRV-SCADA-A',
            title: 'SCADA Server A',
            ip: '192.168.10.10',
            statusText: planeAHealthy || planeBHealthy ? 'Online' : 'Offline',
            healthy: planeAHealthy || planeBHealthy,
            img: getHardwarePhoto('SCADA_SERVER'),
            roleBadge: 'IEC 61850 MMS Client • BRCB/URCB',
          },
          {
            id: 'WS-HMI-01',
            title: 'Operator HMI WS',
            ip: '192.168.10.20',
            statusText: planeAHealthy || planeBHealthy ? 'Online' : 'Offline',
            healthy: planeAHealthy || planeBHealthy,
            img: getHardwarePhoto('HMI_WS'),
            roleBadge: 'Dual-Monitor SLD • Alarm & SBO',
          },
          {
            id: 'GTW-RCC-01',
            title: 'Station Gateway',
            ip: '192.168.10.30',
            statusText: planeAHealthy || planeBHealthy ? 'Online' : 'Offline',
            healthy: planeAHealthy || planeBHealthy,
            img: getHardwarePhoto('STATION_GATEWAY'),
            roleBadge: 'MMS → IEC 60870-5-104 SLDC',
          },
          {
            id: 'CLK-PTP-GM',
            title: 'Time Server (PTP)',
            ip: '192.168.10.100',
            statusText: timeSyncFailActive ? 'Holdover / Unsynced' : 'Sync: Locked',
            healthy: !timeSyncFailActive && (planeAHealthy || planeBHealthy),
            img: getHardwarePhoto('PTP_CLOCK'),
            roleBadge: 'Meinberg IEEE 1588v2 GM • ±38 ns',
          },
        ].map((card) => {
          const isSelected = selectedDeviceKey === card.id;
          return (
            <div
              key={card.id}
              role="button"
              tabIndex={0}
              onClick={() => handleSelectDevice(card.id, true)}
              onKeyDown={(e) => e.key === 'Enter' && handleSelectDevice(card.id, true)}
              className={`group cursor-pointer rounded-xl bg-gradient-to-r from-[#071629] via-[#091E36] to-[#071629] border p-2.5 flex items-center gap-3.5 transition shadow-lg ${
                isSelected
                  ? 'border-[#00F0FF] shadow-[0_0_18px_rgba(0,207,255,0.35)]'
                  : 'border-[#1B3F63] hover:border-[#00CFFF]'
              }`}
            >
              <div className="relative w-20 h-14 rounded-lg bg-[#040B14] border border-[#2B4C6F] overflow-hidden shrink-0 flex items-center justify-center">
                <img
                  src={card.img}
                  alt={card.title}
                  className="w-full h-full object-contain ied-device-image object-center group-hover:scale-105 transition"
                />
                <span
                  className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
                    card.healthy ? 'bg-[#22C55E] shadow-[0_0_6px_#22C55E]' : 'bg-[#FF5C65] animate-ping'
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs sm:text-sm font-extrabold text-white truncate">
                    {card.title}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 mt-0.5">
                  <span className="text-xs font-mono text-[#B8D4EA]">{card.ip}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold ${
                      card.healthy ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                    }`}
                  >
                    <span
                      className={`w-2 h-2 rounded-full ${
                        card.healthy ? 'bg-[#22C55E] shadow-[0_0_6px_#22C55E]' : 'bg-[#FF5C65]'
                      }`}
                    />
                    {card.statusText}
                  </span>
                </div>
                <div className="text-[10px] font-mono text-[#77E7FF] truncate mt-0.5">
                  {card.roleBadge}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. DEEP MULTI-TAB DEVICE & STATION INSPECTOR MODAL */}
      {inspectorModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6">
          <div className="w-full max-w-5xl max-h-[90vh] rounded-2xl bg-[#061426] border-2 border-[#00CFFF] shadow-[0_0_50px_rgba(0,207,255,0.3)] flex flex-col overflow-hidden">
            <div className="px-5 py-3.5 bg-gradient-to-r from-[#0A2542] via-[#081C33] to-[#0A2542] border-b border-[#1E446B] flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <img
                  src={
                    selectedDeviceKey === 'SRV-SCADA-A'
                      ? getHardwarePhoto('SCADA_SERVER')
                      : selectedDeviceKey === 'WS-HMI-01'
                      ? getHardwarePhoto('HMI_WS')
                      : selectedDeviceKey === 'GTW-RCC-01'
                      ? getHardwarePhoto('STATION_GATEWAY')
                      : selectedDeviceKey === 'CLK-PTP-GM'
                      ? getHardwarePhoto('PTP_CLOCK')
                      : selectedDeviceKey === 'IED-11-F01'
                      ? getHardwarePhoto('ABB_REF615')
                      : selectedDeviceKey === 'IED-132-BC'
                      ? getHardwarePhoto('SCHNEIDER_C264')
                      : selectedDeviceKey === 'IED-33-F02'
                      ? getHardwarePhoto('GE_MULTILIN_850')
                      : getHardwarePhoto('SIEMENS_7SJ85')
                  }
                  alt="Hardware Unit"
                  className="w-14 h-14 rounded-lg border border-[#00CFFF] object-contain ied-device-image bg-[#030A14]"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-extrabold text-white">
                      {inspectedInfra
                        ? `${inspectedInfra.name} (${inspectedInfra.model})`
                        : `${inspectedIed.vendor} ${inspectedIed.model} — ${inspectedIed.name}`}
                    </h2>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#22C55E]/20 text-[#4ADE80] border border-[#22C55E]">
                      ● ONLINE (DANP LAN A + LAN B)
                    </span>
                  </div>
                  <p className="text-xs text-[#77E7FF] font-mono mt-0.5">
                    {inspectedInfra
                      ? `IP: ${
                          selectedDeviceKey === 'SRV-SCADA-A'
                            ? '192.168.10.10 (10.132.10.200)'
                            : selectedDeviceKey === 'WS-HMI-01'
                            ? '192.168.10.20 (10.132.10.210)'
                            : selectedDeviceKey === 'GTW-RCC-01'
                            ? '192.168.10.30 (10.132.10.190)'
                            : '192.168.10.100 (10.132.10.5)'
                        } • Role: ${inspectedInfra.redundancyRole}`
                      : `Bay: ${inspectedIed.bayName} • LAN A: ${inspectedIed.ipAddressLanA} • LAN B: ${inspectedIed.ipAddressLanB} • MAC: ${inspectedIed.macAddress}`}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setInspectorModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-[#102A45] border border-[#2D5A88] text-xs font-bold text-white hover:border-[#00CFFF] flex items-center gap-1"
              >
                <X className="w-4 h-4" /> Close Inspector
              </button>
            </div>

            <div className="px-5 py-2 bg-[#040E1C] border-b border-[#163452] flex flex-wrap gap-1.5">
              {(
                [
                  'Overview',
                  'Hardware & Ports',
                  'IEC 61850 Model',
                  'DataSets',
                  'RCBs',
                  'GOOSE Publisher',
                  'GOOSE Subscriber',
                  'MMS',
                  'Network Settings',
                  'Diagnostics',
                  'SCL Files',
                ] as DeviceInspectorTab[]
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setDeviceInspectorTab(t)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition border ${
                    deviceInspectorTab === t
                      ? 'bg-[#00CFFF] text-slate-950 border-[#00CFFF]'
                      : 'bg-[#081A30] text-[#9BB8D3] border-[#1A3857] hover:text-white'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs flex-1">
              {deviceInspectorTab === 'Overview' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-3.5 rounded-xl bg-[#081A30] border border-[#1E3A5F] flex flex-col items-center">
                    <img
                      src={
                        selectedDeviceKey === 'SRV-SCADA-A'
                          ? getHardwarePhoto('SCADA_SERVER')
                          : selectedDeviceKey === 'WS-HMI-01'
                          ? getHardwarePhoto('HMI_WS')
                          : selectedDeviceKey === 'GTW-RCC-01'
                          ? getHardwarePhoto('STATION_GATEWAY')
                          : selectedDeviceKey === 'CLK-PTP-GM'
                          ? getHardwarePhoto('PTP_CLOCK')
                          : selectedDeviceKey === 'IED-11-F01'
                          ? getHardwarePhoto('ABB_REF615')
                          : selectedDeviceKey === 'IED-132-BC'
                          ? getHardwarePhoto('SCHNEIDER_C264')
                          : selectedDeviceKey === 'IED-33-F02'
                          ? getHardwarePhoto('GE_MULTILIN_850')
                          : getHardwarePhoto('SIEMENS_7SJ85')
                      }
                      alt="Device Front Panel"
                      className="w-48 h-48 object-contain ied-device-image rounded-lg border border-[#2C527A]"
                    />
                    <div className="mt-2 text-center font-bold text-white">
                      {inspectedInfra ? inspectedInfra.model : `${inspectedIed.vendor} ${inspectedIed.model}`}
                    </div>
                    <div className="text-[11px] text-[#77E7FF] font-mono">
                      {inspectedInfra ? inspectedInfra.category : inspectedIed.role}
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-3">
                    {inspectedInfra ? (
                      <div className="p-4 rounded-xl bg-[#081A30] border border-[#1E3A5F] space-y-2.5">
                        <h3 className="text-sm font-bold text-[#00CFFF]">
                          Station-Level Architecture &amp; Data Path
                        </h3>
                        <p className="text-[#DCEAF5] leading-relaxed">{inspectedInfra.description}</p>
                        {selectedDeviceKey === 'SRV-SCADA-A' && (
                          <div className="p-3 rounded-lg bg-[#040B16] border border-[#163452] space-y-1.5 font-mono text-[11px]">
                            <div className="text-[#4ADE80] font-bold">
                              Active IEC 61850 MMS Client Associations: {ieds.length} / {ieds.length} IEDs Connected (TCP Port 102)
                            </div>
                            <div className="text-[#77E7FF]">
                              Subscribed Reports: brcbSt01 (Status), brcbProt01 (Trips), urcbMeas01 (Cyclic Analog MV)
                            </div>
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => triggerMmsGeneralInterrogation(rackIedSiemens.id)}
                                className="px-3 py-1 rounded bg-[#0B3B5B] border border-[#00CFFF] text-white font-sans font-bold"
                              >
                                Trigger Global MMS General Interrogation (GI)
                              </button>
                            </div>
                          </div>
                        )}
                        {selectedDeviceKey === 'WS-HMI-01' && (
                          <div className="p-3 rounded-lg bg-[#040B16] border border-[#163452] space-y-1.5 font-mono text-[11px]">
                            <div className="text-[#00CFFF] font-bold">
                              Architecture Path: Bay IEDs → Hirschmann RSP35 (VLAN 10) → SCADA Server A (192.168.10.10) → Operator HMI WS (192.168.10.20)
                            </div>
                            <div className="text-slate-300">
                              Operator HMI WS communicates through SCADA Server A client/server architecture rather than polling every protection IED directly.
                            </div>
                          </div>
                        )}
                        {selectedDeviceKey === 'GTW-RCC-01' && (
                          <div className="p-3 rounded-lg bg-[#040B16] border border-[#163452] space-y-1.5 font-mono text-[11px]">
                            <div className="text-[#FDE047] font-bold">
                              Telecontrol Data Path: IED (IEC 61850 MMS) → Station Network (VLAN 10) → Station Gateway (192.168.10.30) → Remote Control Center (IEC 60870-5-104 TCP:2404)
                            </div>
                            <div className="text-slate-300">
                              Active Southbound: IEC 61850 MMS Client • Active Northbound: Redundant IEC 60870-5-104 Server (ASDU 10, COA 132) + Modbus TCP:502
                            </div>
                          </div>
                        )}
                        {selectedDeviceKey === 'CLK-PTP-GM' && (
                          <div className="p-3 rounded-lg bg-[#040B16] border border-[#163452] space-y-2 font-mono text-[11px]">
                            <div className="text-[#4ADE80] font-bold">
                              GNSS Reference: Locked to 11 GPS/GLONASS Satellites • Grandmaster Accuracy ±38 ns
                            </div>
                            <div className="text-[#FDE047]">
                              PTP Profile: IEC/IEEE 61850-9-3 / IEEE C37.238 Power Profile (L2 Multicast 0x88F7, VLAN 40) + SNTP Server (UDP 123)
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleFaultScenario('FLT-10')}
                              className="px-3 py-1 rounded bg-[#3B2609] border border-[#FFB547] text-[#FDE047] font-sans font-bold"
                            >
                              {timeSyncFailActive ? 'Restore GNSS Lock' : 'Simulate GNSS Holdover / Sync Loss'}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="p-4 rounded-xl bg-[#081A30] border border-[#1E3A5F] grid grid-cols-2 gap-3 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-400">Equipment ID:</span>{' '}
                          <span className="text-white font-bold">{inspectedIed.id}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Vendor / Model:</span>{' '}
                          <span className="text-[#00CFFF] font-bold">
                            {inspectedIed.vendor} {inspectedIed.model}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">LAN A IP (PRP):</span>{' '}
                          <span className="text-[#4ADE80]">{inspectedIed.ipAddressLanA} (192.168.10.x)</span>
                        </div>
                        <div>
                          <span className="text-slate-400">LAN B IP (PRP):</span>{' '}
                          <span className="text-[#FDE047]">{inspectedIed.ipAddressLanB} (192.168.20.x)</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Supported Redundancy:</span>{' '}
                          <span className="text-white">{inspectedIed.redundancySupport.join(', ')} ({inspectedIed.nodeType})</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Time Sync Protocol:</span>{' '}
                          <span className="text-[#FDE047]">{inspectedIed.timeSyncProtocol}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Firmware / SCL:</span>{' '}
                          <span className="text-white">
                            {inspectedIed.firmwareVersion} ({inspectedIed.sclEdition})
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-400">CPU / Case Temp:</span>{' '}
                          <span className="text-[#4ADE80]">
                            {inspectedIed.cpuLoadPercent}% • {inspectedIed.caseTempC.toFixed(1)} °C
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {deviceInspectorTab === 'Hardware & Ports' && (
                <div className="p-4 rounded-xl bg-[#081A30] border border-[#1E3A5F] space-y-3">
                  <h3 className="text-sm font-bold text-[#00CFFF]">
                    Physical Communication Interfaces &amp; Switch Port Termination
                  </h3>
                  <table className="w-full text-left border-collapse font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-[#1E3A5F] text-[#77E7FF]">
                        <th className="py-2">Device Port</th>
                        <th className="py-2">Redundancy Plane</th>
                        <th className="py-2">Connected Switch &amp; Port</th>
                        <th className="py-2">Media Type</th>
                        <th className="py-2">Operational State</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#132A44]">
                      <tr>
                        <td className="py-2 text-white font-bold">Port A (ChA)</td>
                        <td className="py-2 text-[#00CFFF]">PRP LAN A (0xA)</td>
                        <td className="py-2 text-white">Hirschmann RSP35 (LAN A) • Gi1/1..8</td>
                        <td className="py-2 text-slate-300">100BASE-FX / 1000BASE-LX LC</td>
                        <td className="py-2 text-[#4ADE80] font-bold">
                          {planeAHealthy ? 'UP (100% Link Quality)' : 'DOWN (Switch Fault)'}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-white font-bold">Port B (ChB)</td>
                        <td className="py-2 text-[#FDE047]">PRP LAN B (0xB)</td>
                        <td className="py-2 text-white">Hirschmann RSP35 (LAN B) • Gi2/1..8</td>
                        <td className="py-2 text-slate-300">100BASE-FX / 1000BASE-LX LC</td>
                        <td className="py-2 text-[#4ADE80] font-bold">
                          {planeBHealthy ? 'UP (100% Link Quality)' : 'DOWN (Switch Fault)'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}

              {deviceInspectorTab === 'IEC 61850 Model' && (
                <div className="space-y-3">
                  {inspectedIed.logicalDevices.map((ld) => (
                    <div key={ld.ldInst} className="p-3.5 rounded-xl bg-[#081A30] border border-[#1E3A5F] space-y-2">
                      <div className="font-bold text-[#00CFFF] font-mono">
                        Logical Device: {inspectedIed.name}/{ld.ldInst} — {ld.description}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {ld.logicalNodes.map((ln) => (
                          <div key={`${ln.lnClass}${ln.lnInst}`} className="p-2.5 rounded bg-[#040B16] border border-[#163452]">
                            <div className="font-mono font-bold text-white">
                              {ln.lnPrefix}{ln.lnClass}{ln.lnInst}{' '}
                              <span className="text-[10px] text-[#77E7FF]">({ln.description})</span>
                            </div>
                            <div className="mt-1 space-y-1 font-mono text-[10.5px]">
                              {ln.dataObjects.map((dobj) => (
                                <div key={dobj.doName} className="flex justify-between text-slate-300">
                                  <span>
                                    .{dobj.doName} [{dobj.cdc} / {dobj.fc}]
                                  </span>
                                  <span className="text-[#4ADE80]">{dobj.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deviceInspectorTab === 'DataSets' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {inspectedIed.datasets.map((ds) => (
                    <div key={ds.name} className="p-3.5 rounded-xl bg-[#081A30] border border-[#1E3A5F] space-y-2">
                      <div className="font-mono font-bold text-[#00CFFF]">
                        {ds.ldInst}/LLN0${ds.name}
                      </div>
                      <p className="text-[11px] text-[#8BB3D4]">{ds.description}</p>
                      <div className="space-y-1 font-mono text-[10.5px] bg-[#040B16] p-2 rounded border border-[#163452]">
                        {ds.fcdas.map((fcda, idx) => (
                          <div key={idx} className="text-slate-200">
                            {fcda.ldInst}/{fcda.lnClass}{fcda.lnInst}.{fcda.doName} [{fcda.fc}]
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {deviceInspectorTab === 'RCBs' && (
                <div className="space-y-2.5">
                  {inspectedIed.rcbs.map((rcb) => (
                    <div
                      key={rcb.name}
                      className="p-3.5 rounded-xl bg-[#081A30] border border-[#1E3A5F] flex flex-wrap items-center justify-between gap-2 font-mono text-[11px]"
                    >
                      <div>
                        <div className="font-bold text-white">
                          {rcb.rptId} ({rcb.buffered ? 'Buffered BRCB' : 'Unbuffered URCB'})
                        </div>
                        <div className="text-[#77E7FF]">
                          DatSet: {rcb.datSet} • IntgPd: {rcb.intgPdMs} ms • BufTime: {rcb.bufTimeMs} ms • TrgOps: [{rcb.trgOps.join(', ')}]
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleRcbEnabled(inspectedIed.id, rcb.name)}
                        className={`px-3 py-1 rounded font-sans font-bold ${
                          rcb.enabled
                            ? 'bg-[#22C55E]/20 border border-[#22C55E] text-[#4ADE80]'
                            : 'bg-[#FF5C65]/20 border border-[#FF5C65] text-[#FDA4AF]'
                        }`}
                      >
                        RptEna = {String(rcb.enabled)} (Toggle)
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {(deviceInspectorTab === 'GOOSE Publisher' || deviceInspectorTab === 'GOOSE Subscriber') && (
                <div className="space-y-3">
                  {gooseControlBlocks.map((g) => (
                    <div key={g.id} className="p-3.5 rounded-xl bg-[#081A30] border border-[#1E3A5F] space-y-1.5 font-mono text-[11px]">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[#4ADE80]">
                          {g.gocbName} (APPID {g.appId} • MAC {g.multicastMac} • VLAN {g.vlanId})
                        </span>
                        <button
                          type="button"
                          onClick={() => triggerGooseStateChangeBurst(g.id)}
                          className="px-2.5 py-1 rounded bg-[#093524] border border-[#22C55E] text-[#4ADE80] font-sans font-bold"
                        >
                          Burst Retransmission (stNum={g.stNum} → {g.stNum + 1})
                        </button>
                      </div>
                      <div className="text-slate-300">
                        Publisher: {g.publisherIedName} → Subscribers: [{g.subscriberIedIds.join(', ')}] • stNum={g.stNum} sqNum={g.sqNum}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(deviceInspectorTab === 'MMS' ||
                deviceInspectorTab === 'Network Settings' ||
                deviceInspectorTab === 'Diagnostics' ||
                deviceInspectorTab === 'SCL Files') && (
                <div className="p-4 rounded-xl bg-[#081A30] border border-[#1E3A5F] space-y-2 font-mono text-[11px]">
                  <div className="text-[#00CFFF] font-bold">
                    IEC 61850-8-1 MMS Server &amp; SCL Configuration Summary
                  </div>
                  <div className="text-slate-200">
                    OSI-AP-Title: 1,3,9999,23 • AE-Qualifier: 23 • TCP Port: 102 • Max Associations: 8 • Active Client: 192.168.10.10 (SCADA Server A)
                  </div>
                  <pre className="p-3 rounded bg-[#040B16] border border-[#163452] text-[#77E7FF] overflow-x-auto text-[10.5px]">
{`<ConnectedAP iedName="${inspectedIed.name}" apName="S1">
  <Address>
    <P type="IP">${inspectedIed.ipAddressLanA}</P>
    <P type="IP-SUBNET">${inspectedIed.subnetMask}</P>
    <P type="OSI-AP-Title">1,3,9999,23</P>
  </Address>
  <PhysConn type="RedConn">
    <P type="Plug">LC-Duplex-100BASE-FX (PRP Port A & Port B)</P>
  </PhysConn>
</ConnectedAP>`}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
