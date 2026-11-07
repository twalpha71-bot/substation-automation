import React, { useMemo, useState } from 'react';
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

  const [activeView, setActiveView] = useState<LabViewTab>('RACK_VIEW');
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
      cx: 175,
      cy: 300,
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
      cx: 485,
      cy: 292,
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
      cx: 795,
      cy: 300,
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
      cx: 795,
      cy: 458,
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
      cx: 485,
      cy: 466,
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
      cx: 175,
      cy: 458,
    },
  ];

  const HSR_SEGMENTS = [
    {
      index: 0,
      segNum: 1,
      id: 'HSR-SEG-1',
      fromIdx: 0,
      toIdx: 1,
      label: 'Segment #1 – 7SJ85 ↔ REF615',
      shortDropdownLabel: 'Segment #1 – 7SJ85 ↔ REF615',
      endpointsText: 'SIPROTEC 5 7SJ85 (Port B) ↔ ABB Relion REF615 (Port A)',
      path: 'M 268 296 L 392 292',
      revPath: 'M 392 292 L 268 296',
      midX: 330,
      midY: 294,
      badgeX: 330,
      badgeY: 244,
    },
    {
      index: 1,
      segNum: 2,
      id: 'HSR-SEG-2',
      fromIdx: 1,
      toIdx: 2,
      label: 'Segment #2 – REF615 ↔ MiCOM C264',
      shortDropdownLabel: 'Segment #2 – REF615 ↔ MiCOM C264',
      endpointsText: 'ABB Relion REF615 (Port B) ↔ Schneider MiCOM C264 (Port A)',
      path: 'M 578 292 L 702 296',
      revPath: 'M 702 296 L 578 292',
      midX: 640,
      midY: 294,
      badgeX: 640,
      badgeY: 244,
    },
    {
      index: 2,
      segNum: 3,
      id: 'HSR-SEG-3',
      fromIdx: 2,
      toIdx: 3,
      label: 'Segment #3 – MiCOM C264 ↔ Multilin 850',
      shortDropdownLabel: 'Segment #3 – MiCOM C264 ↔ Multilin 850',
      endpointsText: 'Schneider MiCOM C264 (Port B) ↔ GE Multilin 850 (Port A)',
      path: 'M 888 308 C 942 325, 942 433, 888 450',
      revPath: 'M 888 450 C 942 433, 942 325, 888 308',
      midX: 928,
      midY: 379,
      badgeX: 928,
      badgeY: 379,
    },
    {
      index: 3,
      segNum: 4,
      id: 'HSR-SEG-4',
      fromIdx: 3,
      toIdx: 4,
      label: 'Segment #4 – Multilin 850 ↔ 7UT86',
      shortDropdownLabel: 'Segment #4 – Multilin 850 ↔ 7UT86',
      endpointsText: 'GE Multilin 850 (Port B) ↔ SIPROTEC 5 7UT86 (Port A)',
      path: 'M 702 462 L 578 466',
      revPath: 'M 578 466 L 702 462',
      midX: 640,
      midY: 464,
      badgeX: 640,
      badgeY: 512,
    },
    {
      index: 4,
      segNum: 5,
      id: 'HSR-SEG-5',
      fromIdx: 4,
      toIdx: 5,
      label: 'Segment #5 – 7UT86 ↔ RET615',
      shortDropdownLabel: 'Segment #5 – 7UT86 ↔ RET615',
      endpointsText: 'SIPROTEC 5 7UT86 (Port B) ↔ ABB Relion RET615 (Port A)',
      path: 'M 392 466 L 268 462',
      revPath: 'M 268 462 L 392 466',
      midX: 330,
      midY: 464,
      badgeX: 330,
      badgeY: 512,
    },
    {
      index: 5,
      segNum: 6,
      id: 'HSR-SEG-6',
      fromIdx: 5,
      toIdx: 0,
      label: 'Segment #6 – RET615 ↔ 7SJ85 (Ring Close)',
      shortDropdownLabel: 'Segment #6 – RET615 ↔ 7SJ85 (Ring Close)',
      endpointsText: 'ABB Relion RET615 (Port B) ↔ SIPROTEC 5 7SJ85 (Port A)',
      path: 'M 82 450 C 28 433, 28 325, 82 308',
      revPath: 'M 82 308 C 28 325, 28 433, 82 450',
      midX: 42,
      midY: 379,
      badgeX: 42,
      badgeY: 379,
    },
  ];

  // Authoritative Graph-Based BFS Connectivity & Reachability Simulation
  const hsrSimulation = (() => {
    const numNodes = 6;
    const adj: number[][] = Array.from({ length: numNodes }, () => []);
    HSR_SEGMENTS.forEach((seg) => {
      if (!hsrCutSegments.includes(seg.index)) {
        adj[seg.fromIdx].push(seg.toIdx);
        adj[seg.toIdx].push(seg.fromIdx);
      }
    });

    // RedBox couples the Station Bus (SCADA, HMI, Gateway, PTP GM) into the top HSR ring (nodes 0 & 1 via RedBox HSR Port A/B; primary tap at Node 1 REF615)
    // Wait: if Segment #1 (0-1) is intact, nodes 0 and 1 are adjacent. Even if Segment #1 is cut, RedBox sits at the top interconnect (Node 1 REF615).
    const redboxAnchorNode = 1;
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

    const cutCount = hsrCutSegments.length;
    const ringState: 'CLOSED' | 'OPEN' | 'PARTITIONED' =
      cutCount === 0 ? 'CLOSED' : cutCount === 1 ? 'OPEN' : 'PARTITIONED';

    const statusHeadline =
      ringState === 'CLOSED'
        ? '● RING HEALTHY — BOTH CW (GREEN) & CCW (CYAN) PATHS HEALTHY'
        : ringState === 'OPEN'
        ? `▲ RING OPEN — SINGLE FIBER FAILURE (SEGMENT #${hsrCutSegments[0] + 1}) • ALTERNATE PATH ACTIVE (0 ms)`
        : `✖ MULTIPLE FIBER FAILURES — NETWORK PARTITIONED (${cutCount} CUTS • ${isolatedNodeIndices.length} IEDs ISOLATED)`;

    return {
      adj,
      componentOf,
      components,
      redboxComp,
      reachableNodeIndices,
      isolatedNodeIndices,
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
                    const swATopPortX = (pNum: number) => 276 + (pNum - 1) * 9;
                    const swBTopPortX = (pNum: number) => 686 + (pNum - 1) * 9;
                    const swABotPortX = (pNum: number) => 276 + (pNum - 5) * 9;
                    const swBBotPortX = (pNum: number) => 694 + (pNum - 5) * 9;

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

                          const pathA = `M ${st.ethAX} 120 C ${st.ethAX} 162, ${dstAX} 158, ${dstAX} 200`;
                          const pathB = `M ${st.ethBX} 120 C ${st.ethBX} 168, ${dstBX} 162, ${dstBX} 200`;

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

                          const pathA = `M ${srcAX} 296 C ${srcAX} 338, ${item.ethAX} 332, ${item.ethAX} 374`;
                          const pathB = `M ${srcBX} 296 C ${srcBX} 342, ${item.ethBX} 336, ${item.ethBX} 374`;

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
                                <rect
                                  x={st.cardBox.x}
                                  y={st.cardBox.y}
                                  width={st.cardBox.w}
                                  height={st.cardBox.h}
                                  rx={10}
                                  fill="url(#img1CardBg)"
                                  stroke={
                                    !upA && !upB
                                      ? '#FF5C65'
                                      : isSelected
                                      ? '#00E5FF'
                                      : '#234B73'
                                  }
                                  strokeWidth={isSelected ? 2.2 : 1.5}
                                />
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
                                <circle
                                  cx={st.ethAX}
                                  cy={120}
                                  r={3.5}
                                  fill={upA ? '#168BFF' : '#FF5C65'}
                                  stroke="#FFFFFF"
                                  strokeWidth={0.9}
                                />
                              </g>
                              <g
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedSwitchPlane('LAN_B');
                                  setSelectedPortNumber(st.portNum);
                                }}
                              >
                                <title>{`${st.title} ETH-B → LAN B Switch P${st.portNum} (${portB.portId})`}</title>
                                <circle
                                  cx={st.ethBX}
                                  cy={120}
                                  r={3.5}
                                  fill={upB ? '#FFC400' : '#FF5C65'}
                                  stroke="#FFFFFF"
                                  strokeWidth={0.9}
                                />
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
                            <rect
                              x={sw.x}
                              y={sw.y}
                              width={sw.w}
                              height={sw.h}
                              rx={10}
                              fill={sw.bgGrad}
                              stroke={sw.borderCol}
                              strokeWidth={2.4}
                              filter={sw.glowFilter}
                              className="cursor-pointer"
                              onClick={() => setSelectedSwitchPlane(sw.plane)}
                            />

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
                              const ay = isTop ? sw.y : sw.y + sw.h;
                              const st = getEffectivePortStatus(port);
                              return (
                                <circle
                                  key={`ANCHOR-${port.portId}`}
                                  cx={ax}
                                  cy={ay}
                                  r={2.8}
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
                                </circle>
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
                                <rect
                                  x={item.cardBox.x}
                                  y={item.cardBox.y}
                                  width={item.cardBox.w}
                                  height={item.cardBox.h}
                                  rx={10}
                                  fill="url(#img1CardBg)"
                                  stroke={
                                    !upA && !upB
                                      ? '#FF5C65'
                                      : isSelected
                                      ? '#00E5FF'
                                      : '#234B73'
                                  }
                                  strokeWidth={isSelected ? 2.2 : 1.5}
                                />
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
                                <circle
                                  cx={item.ethAX}
                                  cy={374}
                                  r={3.5}
                                  fill={upA ? '#168BFF' : '#FF5C65'}
                                  stroke="#FFFFFF"
                                  strokeWidth={0.9}
                                />
                              </g>
                              <g
                                className="cursor-pointer"
                                onClick={() => {
                                  setSelectedSwitchPlane('LAN_B');
                                  setSelectedPortNumber(item.portNum);
                                }}
                              >
                                <title>{`${item.label} ETH-B → LAN B Switch P${item.portNum} (${portB.portId})`}</title>
                                <circle
                                  cx={item.ethBX}
                                  cy={374}
                                  r={3.5}
                                  fill={upB ? '#FFC400' : '#FF5C65'}
                                  stroke="#FFFFFF"
                                  strokeWidth={0.9}
                                />
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
          {activeView === 'PRP_DUAL' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-4 space-y-4 shadow-xl">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#15314E] pb-3">
                <div>
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    IEC 62439-3 Clause 4 — Parallel Redundancy Protocol (PRP) Dual-LAN Simulator
                  </h2>
                  <p className="text-xs text-[#8BB3D4]">
                    DANP nodes transmit duplicate frames with a 6-byte Redundancy Control Trailer (RCT) over LAN A and LAN B simultaneously. The receiver LRE accepts the first copy and discards the duplicate with 0 ms failover time.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => toggleFaultScenario('FLT-11')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      lanAFaultActive
                        ? 'bg-[#FF5C65] text-white border-white'
                        : 'bg-[#081A30] text-[#77E7FF] border-[#00CFFF]'
                    }`}
                  >
                    {lanAFaultActive ? 'Restore LAN A (PRP Plane A)' : 'Fail LAN A Switch'}
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleFaultScenario('FLT-12')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                      lanBFaultActive
                        ? 'bg-[#FF5C65] text-white border-white'
                        : 'bg-[#081A30] text-[#FDE047] border-[#FACC15]'
                    }`}
                  >
                    {lanBFaultActive ? 'Restore LAN B (PRP Plane B)' : 'Fail LAN B Switch'}
                  </button>
                </div>
              </div>

              <svg viewBox="0 0 920 360" className="w-full h-auto min-w-[680px]">
                <rect x="20" y="105" width="190" height="150" rx="10" fill="#081A30" stroke="#00CFFF" strokeWidth="2" />
                <image href={getHardwarePhoto('SIEMENS_7SJ85')} x="30" y="118" width="70" height="95" preserveAspectRatio="xMidYMid meet" />
                <text x="150" y="142" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">Publisher DANP</text>
                <text x="150" y="158" textAnchor="middle" fill="#77E7FF" fontSize="9.5">SIPROTEC 5 7SJ85</text>
                <text x="150" y="175" textAnchor="middle" fill="#22C55E" fontSize="9" fontFamily="monospace">192.168.10.11</text>
                <rect x="32" y="218" width="166" height="26" rx="4" fill="#0D2844" stroke="#00CFFF" />
                <text x="115" y="235" textAnchor="middle" fill="#A5F3FC" fontSize="9.5" fontWeight="bold">
                  LRE: Appends SeqNr #4812 + RCT
                </text>

                <PatchCordPath
                  id="PRP-LANA-1"
                  d="M 210 145 C 290 75, 340 75, 400 75"
                  plane="LAN_A"
                  status={planeAHealthy ? 'UP' : 'DOWN'}
                  selected={false}
                  highlighted={true}
                  packetActive={packetsPlaying}
                  packetColor="#00E5FF"
                  duration={packetDuration}
                />
                <rect
                  x="400"
                  y="38"
                  width="160"
                  height="74"
                  rx="8"
                  fill={lanAFaultActive ? '#3B0D15' : '#0E2956'}
                  stroke={lanAFaultActive ? '#FF5C65' : '#00CFFF'}
                  strokeWidth="2"
                />
                <text x="480" y="62" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  LAN A (Hirschmann RSP35)
                </text>
                <text x="480" y="79" textAnchor="middle" fill="#77E7FF" fontSize="9.5" fontFamily="monospace">
                  LANId = 0xA (1010) • RTT 0.34 ms
                </text>
                <text x="480" y="96" textAnchor="middle" fill={planeAHealthy ? '#4ADE80' : '#FF5C65'} fontSize="9.5" fontWeight="bold">
                  {planeAHealthy ? 'FRAME #4812-A FORWARDED' : 'PLANE A DOWN — DROPPED'}
                </text>
                <PatchCordPath
                  id="PRP-LANA-2"
                  d="M 560 75 C 620 75, 650 145, 710 145"
                  plane="LAN_A"
                  status={planeAHealthy ? 'UP' : 'DOWN'}
                  selected={false}
                  highlighted={true}
                  packetActive={packetsPlaying}
                  packetColor="#00E5FF"
                  duration={packetDuration}
                  delay={0.4}
                />

                <PatchCordPath
                  id="PRP-LANB-1"
                  d="M 210 215 C 290 285, 340 285, 400 285"
                  plane="LAN_B"
                  status={planeBHealthy ? 'UP' : 'DOWN'}
                  selected={false}
                  highlighted={true}
                  packetActive={packetsPlaying}
                  packetColor="#FACC15"
                  duration={packetDuration}
                />
                <rect
                  x="400"
                  y="248"
                  width="160"
                  height="74"
                  rx="8"
                  fill={lanBFaultActive ? '#3B0D15' : '#0E2956'}
                  stroke={lanBFaultActive ? '#FF5C65' : '#FACC15'}
                  strokeWidth="2"
                />
                <text x="480" y="272" textAnchor="middle" fill="#FFFFFF" fontSize="11" fontWeight="bold">
                  LAN B (Hirschmann RSP35)
                </text>
                <text x="480" y="289" textAnchor="middle" fill="#FDE047" fontSize="9.5" fontFamily="monospace">
                  LANId = 0xB (1011) • RTT 0.36 ms
                </text>
                <text x="480" y="306" textAnchor="middle" fill={planeBHealthy ? '#4ADE80' : '#FF5C65'} fontSize="9.5" fontWeight="bold">
                  {planeBHealthy ? 'FRAME #4812-B FORWARDED' : 'PLANE B DOWN — DROPPED'}
                </text>
                <PatchCordPath
                  id="PRP-LANB-2"
                  d="M 560 285 C 620 285, 650 215, 710 215"
                  plane="LAN_B"
                  status={planeBHealthy ? 'UP' : 'DOWN'}
                  selected={false}
                  highlighted={true}
                  packetActive={packetsPlaying}
                  packetColor="#FACC15"
                  duration={packetDuration}
                  delay={0.45}
                />

                <rect x="710" y="105" width="190" height="150" rx="10" fill="#081A30" stroke="#22C55E" strokeWidth="2" />
                <image href={getHardwarePhoto('SCADA_SERVER')} x="720" y="120" width="75" height="75" preserveAspectRatio="xMidYMid meet" />
                <text x="842" y="142" textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="bold">Subscriber DANP</text>
                <text x="842" y="158" textAnchor="middle" fill="#77E7FF" fontSize="9.5">SCADA / ABB REF615</text>
                <text x="842" y="175" textAnchor="middle" fill="#22C55E" fontSize="9" fontFamily="monospace">192.168.10.10</text>
                <rect x="722" y="205" width="166" height="40" rx="4" fill="#092E20" stroke="#22C55E" />
                <text x="805" y="222" textAnchor="middle" fill="#4ADE80" fontSize="9" fontWeight="bold">
                  {planeAHealthy && planeBHealthy
                    ? 'Accepts 1st (LAN A) • Discards Dup (LAN B)'
                    : planeAHealthy
                    ? 'Accepts LAN A • 0 ms Failover!'
                    : planeBHealthy
                    ? 'Accepts LAN B • 0 ms Failover!'
                    : 'BOTH LANS DOWN — COMM LOSS'}
                </text>
                <text x="805" y="237" textAnchor="middle" fill="#A7F3D0" fontSize="8.5" fontFamily="monospace">
                  Zero-Time Recovery (IEC 62439-3)
                </text>
              </svg>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2.5 text-xs">
                <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[10px] font-mono text-[#77E7FF]">16-Bit Sequence Number</div>
                  <div className="text-sm font-bold text-white mt-0.5">SeqNr = 0x12CC (4812)</div>
                  <p className="text-[11px] text-[#8BB3D4] mt-1">
                    Incremented per frame so receiver LRE drop window detects and discards the second arriving copy.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[10px] font-mono text-[#77E7FF]">4-Bit LAN Identifier</div>
                  <div className="text-sm font-bold text-white mt-0.5">0xA (LAN A) / 0xB (LAN B)</div>
                  <p className="text-[11px] text-[#8BB3D4] mt-1">
                    Identifies which physical network plane carried the frame; detects cross-cabling errors immediately.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[10px] font-mono text-[#77E7FF]">12-Bit Frame Size</div>
                  <div className="text-sm font-bold text-white mt-0.5">LSDUsize = 128 Bytes</div>
                  <p className="text-[11px] text-[#8BB3D4] mt-1">
                    Length of Link Service Data Unit allowing LRE to locate the trailing 6-byte RCT inside Ethernet payload.
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[10px] font-mono text-[#77E7FF]">16-Bit PRP Ethertype Suffix</div>
                  <div className="text-sm font-bold text-[#22C55E] mt-0.5">PRPsuffix = 0x88FB</div>
                  <p className="text-[11px] text-[#8BB3D4] mt-1">
                    IEC 62439-3 PRP-1 trailer identifier stripped before passing payload to upper GOOSE/MMS layers.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: HSR (RING) */}
          {activeView === 'HSR_RING' && (
            <div className="rounded-xl bg-[#040B16] border border-[#18385A] p-3.5 space-y-3 shadow-xl">
              {/* Header */}
              <div className="flex items-start justify-between gap-2 border-b border-[#15314E] pb-1.5">
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-extrabold text-white uppercase tracking-wider">
                    IEC 62439-3 CLAUSE 5 — HIGH-AVAILABILITY SEAMLESS REDUNDANCY (HSR) RING
                  </h2>
                  <p className="text-xs text-[#8BB3D4]">
                    Separate ring topology (never mixed physically with PRP); each IED forwards counter-rotating A-frame and B-frame copies around Port A ⇄ Port B. Click any fiber segment to simulate a ring cut.
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2">
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

              {/* Main HSR Diagram Canvas Matching Reference Image */}
              <div className="relative rounded-xl bg-gradient-to-b from-[#061325] via-[#040D1A] to-[#030914] border border-[#163452] p-2.5 overflow-x-auto">
                {/* Multi-Segment Fiber Cut Selector Dropdown (Positioned top-left matching reference image) */}
                <div
                  style={{
                    position: "absolute",
                    top: "8px",
                    left: "8px",
                    width: "212px",
                    zIndex: 20,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setHsrDropdownOpen((prev) => !prev)}
                    aria-expanded={hsrDropdownOpen}
                    aria-controls="hsr-segment-cut-options"
                    style={{
                      width: "100%",
                      padding: "5px 10px",
                      borderRadius: "8px",
                      backgroundColor: "#071A30",
                      color: "#FFFFFF",
                      border: "1.5px solid #00D4FF",
                      boxShadow: "0 0 12px rgba(0, 212, 255, 0.25)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      fontSize: "11.5px",
                      fontWeight: 700,
                    }}
                  >
                    <span>Simulate Cut on Segment</span>
                    <span style={{ color: "#00D4FF", fontSize: "11px", fontFamily: "monospace" }}>
                      {hsrCutSegments.length > 0 ? `[${hsrCutSegments.length}] ` : ""}{hsrDropdownOpen ? "▴" : "▾"}
                    </span>
                  </button>

                  {hsrDropdownOpen && (
                    <div
                      id="hsr-segment-cut-options"
                      style={{
                        marginTop: "5px",
                        borderRadius: "10px",
                        backgroundColor: "rgba(7, 21, 38, 0.96)",
                        border: "1px solid #2A527A",
                        padding: "7px 8px",
                        boxShadow: "0 10px 24px rgba(0,0,0,0.65)",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", gap: "2.5px" }}>
                        {HSR_SEGMENTS.map((seg) => {
                          const isChecked = hsrPendingSegments.includes(seg.index);
                          const isCurrentlyCut = hsrCutSegments.includes(seg.index);
                          return (
                            <label
                              key={seg.id}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: "4px",
                                padding: "2px 4px",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "9.8px",
                                color: isCurrentlyCut ? "#FDA4AF" : "#E2F1FF",
                                backgroundColor: isCurrentlyCut
                                  ? "rgba(59, 13, 21, 0.75)"
                                  : isChecked
                                  ? "rgba(13, 43, 77, 0.7)"
                                  : "transparent",
                              }}
                            >
                              <div style={{ display: "flex", alignItems: "center", gap: "5px", minWidth: 0 }}>
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
                                  style={{ width: "12px", height: "12px", accentColor: "#00CFFF", flexShrink: 0 }}
                                />
                                <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {seg.shortDropdownLabel}
                                </span>
                              </div>
                              {isCurrentlyCut && (
                                <span
                                  style={{
                                    padding: "0px 4px",
                                    borderRadius: "3px",
                                    backgroundColor: "#FF4D5E",
                                    color: "#FFFFFF",
                                    fontSize: "8px",
                                    fontWeight: 700,
                                    fontFamily: "monospace",
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
                          marginTop: "6px",
                          paddingTop: "6px",
                          borderTop: "1px solid #163250",
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "6px",
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => applyHsrFiberCuts(hsrPendingSegments)}
                          style={{
                            padding: "4px 6px",
                            borderRadius: "6px",
                            backgroundColor: "#00A8E8",
                            color: "#FFFFFF",
                            fontWeight: 700,
                            fontSize: "10.5px",
                            border: "1px solid #38BDF8",
                          }}
                        >
                          Apply Cut(s)
                        </button>
                        <button
                          type="button"
                          onClick={() => applyHsrFiberCuts([])}
                          style={{
                            padding: "4px 6px",
                            borderRadius: "6px",
                            backgroundColor: "#0B1E33",
                            color: "#DCEAF5",
                            fontWeight: 600,
                            fontSize: "10.5px",
                            border: "1px solid #386186",
                          }}
                        >
                          Clear All
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Three-Tier SVG HSR Architecture: TOP (4 Station SAN Devices) -> MIDDLE (ABB AFS677 RedBox) -> BOTTOM (6-IED Hexagonal HSR Ring) */}
                <svg viewBox="0 0 960 540" className="w-full h-auto min-w-[760px] select-none">
                  <defs>
                    <filter id="hsrCyanGlow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1060" height="640">
                      <feGaussianBlur stdDeviation="3.5" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                    <filter id="hsrRedGlow" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1060" height="640">
                      <feGaussianBlur stdDeviation="4" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                      </feMerge>
                    </filter>
                  </defs>

                  {/* ================= TOP SECTION: 4 STATION-LEVEL DEVICES ================= */}
                  {[
                    {
                      id: 'SRV-SCADA-A',
                      title: 'SCADA Server A',
                      ip: '192.168.10.10',
                      model: 'Dell PowerEdge R750',
                      role: '(MMS Client / Historian – DANP)',
                      status: '● ONLINE',
                      img: TOPO_EXACT_IMAGES.DELL_R750,
                      x: 236,
                      y: 12,
                      w: 166,
                      h: 118,
                      imgX: 244,
                      imgY: 22,
                      imgW: 150,
                      imgH: 32,
                      textCenter: true,
                      sanPortX: 319,
                      redboxPortX: 335,
                      redboxPortLabel: 'SAN-1',
                    },
                    {
                      id: 'WS-HMI-01',
                      title: 'Operator HMI WS',
                      ip: '192.168.10.20',
                      model: 'Dell OptiPlex 7000',
                      role: '(Dual-Screen Console – DANP)',
                      status: '● ONLINE',
                      img: TOPO_EXACT_IMAGES.HMI_DUAL,
                      x: 414,
                      y: 12,
                      w: 166,
                      h: 118,
                      imgX: 420,
                      imgY: 22,
                      imgW: 66,
                      imgH: 48,
                      textCenter: false,
                      sanPortX: 497,
                      redboxPortX: 395,
                      redboxPortLabel: 'SAN-2',
                    },
                    {
                      id: 'GTW-RCC-01',
                      title: 'Station Gateway',
                      ip: '192.168.10.30',
                      model: 'Moxa MGate 5216',
                      role: '(IEC 61850 ↔ IEC 104)',
                      status: '● ONLINE',
                      img: TOPO_EXACT_IMAGES.MOXA_MGATE,
                      x: 592,
                      y: 12,
                      w: 166,
                      h: 118,
                      imgX: 600,
                      imgY: 22,
                      imgW: 54,
                      imgH: 56,
                      textCenter: false,
                      sanPortX: 675,
                      redboxPortX: 455,
                      redboxPortLabel: 'SAN-3',
                    },
                    {
                      id: 'CLK-PTP-GM',
                      title: 'Time Server (PTP)',
                      ip: '192.168.10.100',
                      model: 'Meinberg LANTIME M400',
                      role: '(IEEE 1588v2 GM)',
                      status: timeSyncFailActive ? '▲ HOLDOVER' : '● SYNC LOCKED',
                      img: TOPO_EXACT_IMAGES.MEINBERG_M400,
                      x: 770,
                      y: 12,
                      w: 174,
                      h: 118,
                      imgX: 776,
                      imgY: 32,
                      imgW: 72,
                      imgH: 26,
                      textCenter: false,
                      sanPortX: 857,
                      redboxPortX: 515,
                      redboxPortLabel: 'SAN-4',
                    },
                  ].map((st, idx) => {
                    const isSel = selectedDeviceKey === st.id;
                    const cablePath = `M ${st.sanPortX} ${st.y + st.h} L ${st.sanPortX} 145 L ${st.redboxPortX} 145 L ${st.redboxPortX} 166`;
                    return (
                      <g key={st.id}>
                        {/* Individual Station-Side Ethernet Link to Dedicated RedBox SAN Port */}
                        <path
                          d={cablePath}
                          fill="none"
                          stroke="#FACC15"
                          strokeWidth="2"
                          strokeDasharray="5 3"
                          opacity={0.9}
                        />
                        <circle cx={st.sanPortX} cy={st.y + st.h} r="3" fill="#FACC15" />
                        <circle cx={st.redboxPortX} cy="166" r="3.2" fill="#FACC15" />
                        <text
                          x={st.redboxPortX}
                          y="161"
                          textAnchor="middle"
                          fill="#FDE047"
                          fontSize="7.5"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {st.redboxPortLabel}
                        </text>
                        {packetsPlaying && (
                          <CablePacket
                            path={cablePath}
                            color="#FACC15"
                            active={packetsPlaying}
                            duration={packetDuration}
                            delay={idx * 0.22}
                            radius={2.6}
                          />
                        )}

                        {/* Station Device Card */}
                        <g
                          className="cursor-pointer"
                          onClick={() => handleSelectDevice(st.id, true)}
                        >
                          <rect
                            x={st.x}
                            y={st.y}
                            width={st.w}
                            height={st.h}
                            rx="9"
                            fill="#081629"
                            stroke={isSel ? '#00F0FF' : '#264E75'}
                            strokeWidth={isSel ? 2.2 : 1.4}
                          />
                          <image
                            href={st.img}
                            x={st.imgX}
                            y={st.imgY}
                            width={st.imgW}
                            height={st.imgH}
                            preserveAspectRatio="xMidYMid meet"
                          />
                          {st.textCenter ? (
                            <>
                              <text x={st.x + st.w / 2} y={st.y + 68} textAnchor="middle" fill="#FFFFFF" fontSize="10.5" fontWeight="bold">
                                {st.title}
                              </text>
                              <text x={st.x + st.w / 2} y={st.y + 81} textAnchor="middle" fill="#00D4FF" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                                {st.ip}
                              </text>
                              <text x={st.x + st.w / 2} y={st.y + 92} textAnchor="middle" fill="#DCEAF5" fontSize="8.5">
                                {st.model}
                              </text>
                              <text x={st.x + st.w / 2} y={st.y + 102} textAnchor="middle" fill="#8BB3D4" fontSize="7.8">
                                {st.role}
                              </text>
                              <text x={st.x + st.w / 2} y={st.y + 113} textAnchor="middle" fill="#4ADE80" fontSize="8.5" fontWeight="bold">
                                {st.status}
                              </text>
                            </>
                          ) : (
                            <>
                              <text x={st.x + st.w - 8} y={st.y + 24} textAnchor="end" fill="#FFFFFF" fontSize="10.2" fontWeight="bold">
                                {st.title}
                              </text>
                              <text x={st.x + st.w - 8} y={st.y + 38} textAnchor="end" fill="#00D4FF" fontSize="9.5" fontFamily="monospace" fontWeight="bold">
                                {st.ip}
                              </text>
                              <text x={st.x + st.w - 8} y={st.y + 56} textAnchor="end" fill="#DCEAF5" fontSize="8.5">
                                {st.model}
                              </text>
                              <text x={st.x + st.w / 2} y={st.y + 94} textAnchor="middle" fill="#8BB3D4" fontSize="8">
                                {st.role}
                              </text>
                              <text
                                x={st.x + st.w / 2}
                                y={st.y + 111}
                                textAnchor="middle"
                                fill={st.id === 'CLK-PTP-GM' && timeSyncFailActive ? '#FACC15' : '#4ADE80'}
                                fontSize="8.8"
                                fontWeight="bold"
                              >
                                {st.status}
                              </text>
                            </>
                          )}
                        </g>
                      </g>
                    );
                  })}

                  {/* ================= MIDDLE SECTION: ABB AFS677 REDBOX ================= */}
                  <g
                    className="cursor-pointer"
                    onClick={() => handleSelectDevice('IED-11-F01', false)}
                  >
                    <rect
                      x="228"
                      y="166"
                      width="435"
                      height="56"
                      rx="10"
                      fill="#0B1D33"
                      stroke="#FACC15"
                      strokeWidth="2.2"
                    />
                    <image
                      href={TOPO_EXACT_IMAGES.ABB_REDBOX}
                      x="240"
                      y="175"
                      width="96"
                      height="38"
                      preserveAspectRatio="xMidYMid meet"
                    />
                    <text x="348" y="191" fill="#FDE047" fontSize="11.2" fontWeight="bold">
                      ABB AFS677 RedBox (SAN ↔ HSR Interconnect)
                    </text>
                    <text x="348" y="207" fill="#DCEAF5" fontSize="8.8">
                      Connects SCADA Server A, HMI, Gateway &amp; Meinberg PTP GM into HSR Ring
                    </text>
                  </g>

                  {/* RedBox HSR Interconnect Down to Ring Node 1 (ABB Relion REF615) */}
                  <line
                    x1="485"
                    y1="222"
                    x2="485"
                    y2="246"
                    stroke="#00E5FF"
                    strokeWidth="3.5"
                    filter="url(#hsrCyanGlow)"
                  />
                  <circle cx="485" cy="222" r="3.5" fill="#FACC15" />
                  <circle cx="485" cy="246" r="3.5" fill="#00E5FF" />

                  {/* ================= BOTTOM SECTION: 6-IED HEXAGONAL HSR RING ================= */}
                  {/* Continuous Outer Glow Stadium Ring Background */}
                  {hsrSimulation.cutCount === 0 && (
                    <path
                      d="M 175 294 L 795 294 C 945 294, 945 464, 795 464 L 175 464 C 25 464, 25 294, 175 294 Z"
                      fill="none"
                      stroke="#00E5FF"
                      strokeWidth="7"
                      opacity="0.18"
                      filter="url(#hsrCyanGlow)"
                    />
                  )}

                  {/* Render All 6 Identifiable HSR Ring Fiber Segments */}
                  {HSR_SEGMENTS.map((seg) => {
                    const isBroken = hsrCutSegments.includes(seg.index);
                    const isSelected = hsrSelectedSegment === seg.index;
                    const fromNode = HSR_NODES[seg.fromIdx];
                    const toNode = HSR_NODES[seg.toIdx];

                    // Determine if communication traffic can flow across this segment
                    const endpointsConnectedViaAnyPath =
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
                              ? endpointsConnectedViaAnyPath
                                ? 'FIBER CUT (Alternate Surviving Ring Path Active)'
                                : 'FIBER CUT (No Alternate Path — Partitioned!)'
                              : 'HEALTHY (1000BASE-LX Duplex Fiber)'
                          }. Click to ${isBroken ? 'restore' : 'simulate cut'}.`}
                        </title>

                        {/* Invisible Wide Hit Target */}
                        <path d={seg.path} fill="none" stroke="transparent" strokeWidth="18" />

                        {!isBroken ? (
                          <>
                            {/* Outer Cyan Glow */}
                            <path
                              d={seg.path}
                              fill="none"
                              stroke={isSelected ? '#FFFFFF' : '#00E5FF'}
                              strokeWidth={isSelected ? 6.5 : 5}
                              opacity={0.35}
                              filter="url(#hsrCyanGlow)"
                            />
                            {/* Core Cyan HSR Ring Fiber */}
                            <path
                              d={seg.path}
                              fill="none"
                              stroke={isSelected ? '#77F2FF' : '#00E5FF'}
                              strokeWidth={isSelected ? 4 : 3.2}
                              strokeLinecap="round"
                            />
                            {/* Clockwise (CW) A-Frame Packet Animation */}
                            <CablePacket
                              path={seg.path}
                              color="#22C55E"
                              active={segCarriesTraffic}
                              duration={packetDuration}
                              delay={seg.index * 0.16}
                              radius={3.2}
                            />
                            {/* Counter-Clockwise (CCW) B-Frame Packet Animation */}
                            <CablePacket
                              path={seg.revPath}
                              color="#00E5FF"
                              active={segCarriesTraffic && hsrSimulation.ringState === 'CLOSED'}
                              duration={packetDuration * 1.08}
                              delay={seg.index * 0.16 + 0.28}
                              radius={2.8}
                            />
                          </>
                        ) : (
                          <>
                            {/* Failed Segment Red Dashed Highlighted Link Outline */}
                            <path
                              d={seg.path}
                              fill="none"
                              stroke="#FF4D5E"
                              strokeWidth="3.5"
                              strokeDasharray="7 5"
                              filter="url(#hsrRedGlow)"
                            />
                            {/* Physical Cable Gap Mask at Midpoint */}
                            <circle
                              cx={seg.midX}
                              cy={seg.midY}
                              r="13"
                              fill="#040D1A"
                              stroke="#FF4D5E"
                              strokeWidth="2.2"
                            />
                            {/* Red Fiber Cut X Marker */}
                            <line
                              x1={seg.midX - 5.5}
                              y1={seg.midY - 5.5}
                              x2={seg.midX + 5.5}
                              y2={seg.midY + 5.5}
                              stroke="#FF4D5E"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                            />
                            <line
                              x1={seg.midX + 5.5}
                              y1={seg.midY - 5.5}
                              x2={seg.midX - 5.5}
                              y2={seg.midY + 5.5}
                              stroke="#FF4D5E"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                            />
                          </>
                        )}

                        {/* Segment Callout Pointer & Badge Matching Reference Image */}
                        {seg.segNum !== 3 && seg.segNum !== 6 && (
                          <>
                            <line
                              x1={seg.midX}
                              y1={seg.midY}
                              x2={seg.badgeX}
                              y2={seg.badgeY + (seg.badgeY < seg.midY ? 12 : -12)}
                              stroke={isBroken ? '#FF4D5E' : '#00E5FF'}
                              strokeWidth="1.5"
                            />
                            <circle
                              cx={seg.midX}
                              cy={seg.midY}
                              r="3.2"
                              fill={isBroken ? '#FF4D5E' : '#FFFFFF'}
                              stroke={isBroken ? '#FFFFFF' : '#00E5FF'}
                              strokeWidth="1.2"
                            />
                          </>
                        )}

                        <g transform={`translate(${seg.badgeX}, ${seg.badgeY})`}>
                          <rect
                            x="-40"
                            y="-12"
                            width="80"
                            height="22"
                            rx="5"
                            fill={isBroken ? '#3B0D15' : '#091E36'}
                            stroke={isBroken ? '#FF4D5E' : isSelected ? '#FFFFFF' : '#38BDF8'}
                            strokeWidth={isBroken || isSelected ? 1.8 : 1.2}
                          />
                          <text
                            x="0"
                            y="3"
                            textAnchor="middle"
                            fill={isBroken ? '#FDA4AF' : '#E2F1FF'}
                            fontSize="9.5"
                            fontWeight="bold"
                          >
                            {isBroken ? `✖ Seg #${seg.segNum} CUT` : `Segment #${seg.segNum}`}
                          </text>
                        </g>
                      </g>
                    );
                  })}

                  {/* Center Ring Title & Dynamic Status Readout */}
                  <text
                    x="485"
                    y="368"
                    textAnchor="middle"
                    fill="#00D4FF"
                    fontSize="14.5"
                    fontWeight="bold"
                    letterSpacing="0.5"
                  >
                    HSR 0x892F COUNTER-ROTATING RING
                  </text>
                  <text
                    x="485"
                    y="388"
                    textAnchor="middle"
                    fill={
                      hsrSimulation.ringState === 'CLOSED'
                        ? '#4ADE80'
                        : hsrSimulation.ringState === 'OPEN'
                        ? '#FACC15'
                        : '#FF5C65'
                    }
                    fontSize="11"
                    fontWeight="bold"
                  >
                    {hsrSimulation.statusHeadline}
                  </text>
                  {hsrSimulation.ringState !== 'CLOSED' && (
                    <text
                      x="485"
                      y="404"
                      textAnchor="middle"
                      fill="#93C5FD"
                      fontSize="9.5"
                      fontFamily="monospace"
                    >
                      {hsrSimulation.ringState === 'OPEN'
                        ? `Zero-Recovery-Time (0 ms) Unidirectional Path Active • 6/6 IEDs Reachable from RedBox`
                        : `Connected Components: ${hsrSimulation.components.length} • Reachable IEDs: ${hsrSimulation.reachableNodeIndices.length}/6 • Isolated IEDs: ${hsrSimulation.isolatedNodeIndices.length}/6`}
                    </text>
                  )}

                  {/* Render All 6 HSR Ring IED Cards */}
                  {HSR_NODES.map((node) => {
                    const isReachable = hsrSimulation.reachableNodeIndices.includes(node.index);
                    const isSelected = selectedDeviceKey === node.id;
                    const leftEdgeBroken = hsrCutSegments.includes((node.index + 5) % 6);
                    const rightEdgeBroken = hsrCutSegments.includes(node.index);

                    return (
                      <g
                        key={node.id}
                        className="cursor-pointer"
                        onClick={() => handleSelectDevice(node.id, false)}
                      >
                        <title>
                          {`${node.name} (${node.ip}) — ${
                            isReachable
                              ? hsrSimulation.cutCount === 0
                                ? 'HSR Dual-Path Online (CW + CCW)'
                                : 'HSR Single-Path Surviving via RedBox'
                              : 'ISOLATED FROM REDBOX / STATION BUS (Partitioned by Multiple Fiber Cuts)'
                          }`}
                        </title>
                        <rect
                          x={node.cx - 93}
                          y={node.cy - 44}
                          width="186"
                          height="88"
                          rx="10"
                          fill={isReachable ? '#07182E' : '#260B12'}
                          stroke={
                            !isReachable
                              ? '#FF4D5E'
                              : isSelected
                              ? '#FFFFFF'
                              : hsrSimulation.cutCount > 0 && (leftEdgeBroken || rightEdgeBroken)
                              ? '#FACC15'
                              : '#00E5FF'
                          }
                          strokeWidth={isSelected || !isReachable ? 2.4 : 1.8}
                        />
                        <image
                          href={node.img}
                          x={node.cx - 84}
                          y={node.cy - 34}
                          width="56"
                          height="68"
                          preserveAspectRatio="xMidYMid meet"
                        />
                        <text
                          x={node.cx + 28}
                          y={node.cy - 14}
                          textAnchor="middle"
                          fill="#FFFFFF"
                          fontSize="10.2"
                          fontWeight="bold"
                        >
                          {node.name}
                        </text>
                        <text
                          x={node.cx + 28}
                          y={node.cy + 2}
                          textAnchor="middle"
                          fill="#00D4FF"
                          fontSize="9.8"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {node.ip}
                        </text>
                        <text
                          x={node.cx + 28}
                          y={node.cy + 19}
                          textAnchor="middle"
                          fill="#FACC15"
                          fontSize="8.6"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {node.hsrInterfaceNote}
                        </text>
                        <text
                          x={node.cx + 28}
                          y={node.cy + 33}
                          textAnchor="middle"
                          fill={
                            !isReachable
                              ? '#FF5C65'
                              : hsrSimulation.cutCount === 0
                              ? '#4ADE80'
                              : '#FACC15'
                          }
                          fontSize="7.8"
                          fontFamily="monospace"
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
                </svg>
              </div>

              {/* Section 7: HSR Live Monitoring Strip (Derived from Real BFS Graph Simulation) */}
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
                    {6 - hsrCutSegments.length} / 6{' '}
                    <span className="text-[9.5px] text-slate-300">
                      (
                      {HSR_SEGMENTS.filter((s) => !hsrCutSegments.includes(s.index))
                        .map((s) => `#${s.segNum}`)
                        .join(',') || 'None'}
                      )
                    </span>
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">Failed Segments</div>
                  <div
                    className={`text-xs font-extrabold font-mono mt-0.5 ${
                      hsrCutSegments.length === 0 ? 'text-slate-400' : 'text-[#FF5C65]'
                    }`}
                  >
                    {hsrCutSegments.length === 0
                      ? '0 (None)'
                      : `${hsrCutSegments.length} (${hsrCutSegments.map((i) => `#${i + 1}`).join(', ')})`}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">Reachable IEDs</div>
                  <div className="text-xs font-extrabold text-[#00CFFF] font-mono mt-0.5">
                    {hsrSimulation.reachableNodeIndices.length} / 6 Online
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">Isolated IEDs</div>
                  <div
                    className={`text-xs font-extrabold font-mono mt-0.5 truncate ${
                      hsrSimulation.isolatedNodeIndices.length === 0 ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                    }`}
                    title={
                      hsrSimulation.isolatedNodeIndices
                        .map((idx) => HSR_NODES[idx].shortName)
                        .join(', ') || 'None'
                    }
                  >
                    {hsrSimulation.isolatedNodeIndices.length === 0
                      ? '0 (None)'
                      : `${hsrSimulation.isolatedNodeIndices.length} (${hsrSimulation.isolatedNodeIndices
                          .map((idx) => HSR_NODES[idx].shortName)
                          .join(', ')})`}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">GOOSE Status</div>
                  <div
                    className={`text-xs font-extrabold font-mono mt-0.5 ${
                      hsrSimulation.ringState === 'CLOSED'
                        ? 'text-[#4ADE80]'
                        : hsrSimulation.ringState === 'OPEN'
                        ? 'text-[#FACC15]'
                        : 'text-[#FF5C65]'
                    }`}
                  >
                    {hsrSimulation.ringState === 'CLOSED'
                      ? 'Dual-Frame OK'
                      : hsrSimulation.ringState === 'OPEN'
                      ? 'Surviving (0 ms)'
                      : 'Partitioned'}
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">MMS Association</div>
                  <div
                    className={`text-xs font-extrabold font-mono mt-0.5 ${
                      hsrSimulation.isolatedNodeIndices.length === 0 ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                    }`}
                  >
                    {hsrSimulation.reachableNodeIndices.length}/6 Connected
                  </div>
                </div>
                <div className="p-2 rounded-lg bg-[#081A30] border border-[#1E3A5F]">
                  <div className="text-[9.5px] text-[#8BB3D4] uppercase font-bold">PTP Time Sync / Alarms</div>
                  <div
                    className={`text-xs font-extrabold font-mono mt-0.5 ${
                      hsrCutSegments.length === 0
                        ? 'text-[#4ADE80]'
                        : hsrCutSegments.length === 1
                        ? 'text-[#FACC15]'
                        : 'text-[#FF5C65]'
                    }`}
                  >
                    {hsrSimulation.reachableNodeIndices.length}/6 Locked • {hsrCutSegments.length} Alm
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
                      activeView === 'HSR_RING' && p.portNumber <= 6
                        ? hsrCutSegments.includes(p.portNumber - 1)
                          ? 'DOWN'
                          : 'UP'
                        : getEffectivePortStatus(p);
                    const isSel =
                      activeView === 'HSR_RING' && p.portNumber <= 6
                        ? hsrSelectedSegment === p.portNumber - 1
                        : selectedPortNumber === p.portNumber;
                    return (
                      <button
                        key={p.portId}
                        type="button"
                        onClick={() => {
                          setSelectedPortNumber(p.portNumber);
                          if (activeView === 'HSR_RING' && p.portNumber <= 6) {
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
