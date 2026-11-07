import React, { useEffect, useMemo, useState } from 'react';
import { CcnaNetworkDiagrams } from '../components/CcnaNetworkDiagrams';
import {
  CCNA_CHAPTERS,
  CCNA_PACKET_TRACER_LABS,
  CCNA_TOPOLOGIES,
  CCNA_TROUBLESHOOTING_SCENARIOS,
  IOS_CLI_CATEGORIES,
  PACKET_FLOW_SCENARIOS,
  calculateSubnetInfo,
  type CcnaChapter,
  type CcnaPacketTracerLab,
  type CcnaTopologyItem,
  type CcnaTroubleshootingScenario,
} from '../data/ccnaAcademyData';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { useAuthStore } from '../auth/useAuthStore';
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Calculator,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Download,
  FileCode2,
  GitBranch,
  Globe,
  HelpCircle,
  Layers,
  Lightbulb,
  Lock,
  Network,
  Play,
  RefreshCw,
  Router,
  Search,
  Server,
  Shield,
  Sparkles,
  Target,
  Terminal,
  Wrench,
  Zap,
} from 'lucide-react';

type CcnaModuleId =
  | 'CCNA-M01'
  | 'CCNA-M02'
  | 'CCNA-M03'
  | 'CCNA-M04'
  | 'CCNA-M05'
  | 'CCNA-M06'
  | 'CCNA-M07';

type CcnaSubTabId = 'LESSON' | 'DIAGRAMS' | 'CLI' | 'LABS' | 'QUIZ' | 'DOWNLOADS';

interface CcnaModuleDef {
  id: CcnaModuleId;
  num: string;
  title: string;
  subtitle: string;
  chapterRange: [number, number];
  topics: {
    id: string;
    title: string;
    chapterNum: number;
    summary: string;
  }[];
  quiz: {
    q: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
}

const CCNA_MODULES: CcnaModuleDef[] = [
  {
    id: 'CCNA-M01',
    num: '01',
    title: 'Networking Fundamentals',
    subtitle: 'OSI & TCP/IP Models, Ethernet Framing, IPv4 Subnetting & ARP',
    chapterRange: [1, 6],
    topics: [
      {
        id: 'T-1.1',
        title: 'Overview & Objectives (Network Devices & Media)',
        chapterNum: 1,
        summary:
          'Understand industrial routers, Layer-2/Layer-3 switches, firewalls, fiber-optic (SMF/MMF) and copper media in enterprise and substation OT networks.',
      },
      {
        id: 'T-1.2',
        title: 'OSI 7-Layer & TCP/IP Protocol Suite',
        chapterNum: 3,
        summary:
          'Trace encapsulation from Application Data → Segment (TCP/UDP) → Packet (IP) → Frame (Ethernet MAC) → Bits, and see why GOOSE/SV map directly to Layer 2.',
      },
      {
        id: 'T-1.3',
        title: 'IPv4 Addressing, CIDR & VLSM Subnetting',
        chapterNum: 4,
        summary:
          'Calculate network IDs, broadcast addresses, usable host ranges, and /24, /26, /30 subnet masks for Bay IEDs and point-to-point router links.',
      },
      {
        id: 'T-1.4',
        title: 'Ethernet Switching, MAC Learning & ARP / ICMP',
        chapterNum: 6,
        summary:
          'Inspect how switches populate MAC address tables, how ARP resolves IPv4 to MAC, and how ping/traceroute diagnose path reachability.',
      },
    ],
    quiz: [
      {
        q: 'How many usable host IPv4 addresses are available in a /26 subnet (255.255.255.192)?',
        options: ['30', '62', '126', '254'],
        answer: 1,
        explanation: 'A /26 leaves 6 host bits: 2^6 - 2 = 64 - 2 = 62 usable host addresses.',
      },
      {
        q: 'Which table does a Layer-2 Ethernet switch inspect to make frame forwarding decisions?',
        options: [
          'IP Routing Table',
          'CAM / MAC Address Table (Source & Destination MAC)',
          'ARP Cache only',
          'OSPF Link-State Database',
        ],
        answer: 1,
        explanation:
          'A Layer-2 switch learns source MAC addresses on ingress and forwards frames based on the destination MAC address table.',
      },
    ],
  },
  {
    id: 'CCNA-M02',
    num: '02',
    title: 'Switching & VLANs',
    subtitle: '802.1Q VLAN Trunking, Inter-VLAN Routing (ROAS / SVI), STP / RSTP & EtherChannel',
    chapterRange: [7, 12],
    topics: [
      {
        id: 'T-2.1',
        title: 'VLAN Segmentation (SCADA, GOOSE, SV, Management)',
        chapterNum: 8,
        summary:
          'Segment broadcast domains using IEEE 802.1Q VLANs so high-rate Sampled Values and GOOSE multicast traffic never flood corporate or engineering ports.',
      },
      {
        id: 'T-2.2',
        title: '802.1Q Trunking, Native VLAN & Priority Tagging (802.1p)',
        chapterNum: 9,
        summary:
          'Configure 802.1Q trunk links between switches with allowed VLAN lists and 3-bit CoS/PCP priority tagging for deterministic substation QoS.',
      },
      {
        id: 'T-2.3',
        title: 'Inter-VLAN Routing (Router-on-a-Stick & Layer-3 SVI)',
        chapterNum: 10,
        summary:
          'Route traffic between isolated VLANs using 802.1Q subinterfaces (`encapsulation dot1Q`) or high-speed Layer-3 Switch Virtual Interfaces (`interface Vlan`).',
      },
      {
        id: 'T-2.4',
        title: 'Spanning Tree (STP / RSTP 802.1w) & LACP EtherChannel',
        chapterNum: 11,
        summary:
          'Prevent Layer-2 broadcast storms with Rapid PVST+, Root Bridge election, PortFast, BPDU Guard, and bundle links via IEEE 802.3ad LACP.',
      },
    ],
    quiz: [
      {
        q: 'Which IEEE standard defines VLAN tagging across Ethernet trunk links?',
        options: ['IEEE 802.1D', 'IEEE 802.1Q', 'IEEE 802.1w', 'IEEE 802.3ad'],
        answer: 1,
        explanation: 'IEEE 802.1Q inserts a 4-byte tag (TPID 0x8100, 3-bit PCP, 1-bit DEI, 12-bit VLAN ID).',
      },
      {
        q: 'What happens if BPDU Guard is enabled on an access port and someone plugs in an unauthorized switch?',
        options: [
          'The port automatically becomes a trunk',
          'The port immediately transitions to err-disabled state to protect the STP topology',
          'The switch reboots',
          'OSPF neighbors reset',
        ],
        answer: 1,
        explanation:
          'BPDU Guard places the port into err-disabled immediately upon receiving any BPDU frame.',
      },
    ],
  },
  {
    id: 'CCNA-M03',
    num: '03',
    title: 'Routing (IPv4 / IPv6)',
    subtitle: 'Packet Forwarding, Longest Prefix Match, Static & Floating Static Routes, IPv6',
    chapterRange: [13, 17],
    topics: [
      {
        id: 'T-3.1',
        title: 'Overview & Objectives',
        chapterNum: 13,
        summary:
          'Understand how routers inspect destination IP packets, consult the RIB/FIB using Longest Prefix Match, decrement TTL, and rewrite Layer-2 MAC headers at every hop.',
      },
      {
        id: 'T-3.2',
        title: 'Static Routing',
        chapterNum: 14,
        summary:
          'Configure deterministic next-hop static routes, default routes (`0.0.0.0/0`), and backup floating static routes with higher Administrative Distance (AD) for SCADA WAN failover.',
      },
      {
        id: 'T-3.3',
        title: 'Dynamic Routing (OSPF)',
        chapterNum: 16,
        summary:
          'Compare Administrative Distance (Connected=0, Static=1, eBGP=20, EIGRP=90, OSPF=110, RIP=120) and understand link-state vs distance-vector routing.',
      },
      {
        id: 'T-3.4',
        title: 'IPv6 Routing',
        chapterNum: 5,
        summary:
          'Configure 128-bit IPv6 Global Unicast (`2001:db8::/32`), Link-Local (`fe80::/10`), SLAAC, Neighbor Discovery Protocol (NDP), and `ipv6 route` static/OSPFv3 forwarding.',
      },
    ],
    quiz: [
      {
        q: 'If a router has routes to 10.10.0.0/16 (via R1), 10.10.20.0/24 (via R2), and 10.10.20.0/28 (via R3), which path is chosen for packet destination 10.10.20.9?',
        options: [
          'Via R1 (/16)',
          'Via R2 (/24)',
          'Via R3 (/28 — Longest Prefix Match)',
          'Dropped',
        ],
        answer: 2,
        explanation:
          '10.10.20.9 falls within 10.10.20.0/28 (10.10.20.0–10.10.20.15), which has the longest prefix match (/28 > /24 > /16).',
      },
      {
        q: 'What is the default Administrative Distance (AD) of an OSPF route vs a Static route in Cisco IOS?',
        options: [
          'OSPF = 90, Static = 1',
          'OSPF = 110, Static = 1',
          'OSPF = 120, Static = 0',
          'OSPF = 20, Static = 110',
        ],
        answer: 1,
        explanation: 'Static routes have AD = 1, while OSPF routes have AD = 110.',
      },
    ],
  },
  {
    id: 'CCNA-M04',
    num: '04',
    title: 'OSPF & Network Services',
    subtitle: 'OSPFv2 Single/Multi-Area, DR/BDR Election, FHRP (HSRP), DHCP, DNS, NTP & SNMP',
    chapterRange: [18, 23],
    topics: [
      {
        id: 'T-4.1',
        title: 'OSPF Neighbor Adjacency, States & Cost Metric',
        chapterNum: 18,
        summary:
          'Master OSPF Hello/Dead timers, the 7 neighbor states (Down → Init → 2-Way → ExStart → Exchange → Loading → Full), and Reference Bandwidth cost calculation.',
      },
      {
        id: 'T-4.2',
        title: 'OSPF Area 0, DR/BDR Election & Passive Interfaces',
        chapterNum: 19,
        summary:
          'Understand Router ID selection (manual > highest loopback > highest active IP), DR/BDR election on broadcast segments, and `passive-interface` security on IED subnets.',
      },
      {
        id: 'T-4.3',
        title: 'First Hop Redundancy: HSRP & VRRP Gateway Failover',
        chapterNum: 20,
        summary:
          'Provide redundant default gateways for Substation Bay Control Units and SCADA servers using HSRP (`standby ip`, `standby priority`, `standby preempt`).',
      },
      {
        id: 'T-4.4',
        title: 'Network Services: NTP,PTP, DHCP, DNS, Syslog & SNMPv3',
        chapterNum: 21,
        summary:
          'Configure network time synchronization, centralized Syslog event logging, and encrypted SNMPv3 network monitoring for switches and routers.',
      },
    ],
    quiz: [
      {
        q: 'Which parameters MUST match on two OSPF routers on the same Ethernet link for them to reach FULL adjacency?',
        options: [
          'OSPF Process ID and Hostname',
          'Area ID, Hello/Dead Timers, Subnet Mask, Authentication, and Stub Flag',
          'Router ID must be identical on both routers',
          'Interface Bandwidth setting',
        ],
        answer: 1,
        explanation:
          'OSPF neighbors must have unique Router IDs, and matching Area ID, Hello/Dead intervals, subnet mask, authentication, and area type flags.',
      },
    ],
  },
  {
    id: 'CCNA-M05',
    num: '05',
    title: 'Network Security (ACL, NAT, SSH)',
    subtitle: 'Standard & Extended ACLs, NAT/PAT, Port Security, DHCP Snooping, DAI & SSHv2',
    chapterRange: [24, 27],
    topics: [
      {
        id: 'T-5.1',
        title: 'Standard & Extended Access Control Lists (ACLs)',
        chapterNum: 24,
        summary:
          'Filter SCADA MMS (TCP/102), IEC-104 (TCP/2404), and engineering SSH (TCP/22) traffic using numbered and named Extended ACLs placed close to the source.',
      },
      {
        id: 'T-5.2',
        title: 'Layer-2 Switch Security: Port Security, DHCP Snooping & DAI',
        chapterNum: 25,
        summary:
          'Lock control-room switch ports to authorized IED MAC addresses (`switchport port-security mac-address sticky`) and block rogue DHCP/ARP spoofing.',
      },
      {
        id: 'T-5.3',
        title: 'NAT / PAT (Static NAT, Dynamic NAT, Overload)',
        chapterNum: 26,
        summary:
          'Translate private RFC 1918 IPv4 addresses using Inside Local, Inside Global, Outside Local, and Outside Global address mappings.',
      },
      {
        id: 'T-5.4',
        title: 'Device Hardening, SSHv2, AAA & Industrial Firewalls',
        chapterNum: 27,
        summary:
          'Disable Telnet, enable RSA 2048-bit SSHv2 on VTY lines, configure `enable secret`, and deploy IEC 62443 OT security zones and conduits.',
      },
    ],
    quiz: [
      {
        q: 'Where should an Extended ACL be placed according to Cisco best practices?',
        options: [
          'As close to the destination as possible',
          'As close to the traffic source as possible',
          'Only on Loopback0',
          'Only on VLAN 1',
        ],
        answer: 1,
        explanation:
          'Extended ACLs match both source and destination IP/port, so placing them closest to the source prevents unwanted traffic from consuming backbone bandwidth.',
      },
    ],
  },
  {
    id: 'CCNA-M06',
    num: '06',
    title: 'Troubleshooting Scenarios',
    subtitle: 'WAN / VPN, SDN Automation, Industrial Substation LAN & 20 Real Fault Scenarios',
    chapterRange: [28, 30],
    topics: [
      {
        id: 'T-6.1',
        title: 'WAN, DMVPN, MPLS & Redundant Control Center Links',
        chapterNum: 28,
        summary:
          'Connect remote 132/33 kV substations to Regional Load Dispatch Centers (RLDC/SLDC) over redundant MPLS/IPsec links carrying IEC 60870-5-104.',
      },
      {
        id: 'T-6.2',
        title: 'Network Automation, REST APIs, JSON & SDN Controllers',
        chapterNum: 29,
        summary:
          'Understand Control Plane vs Data Plane separation, NETCONF/RESTCONF, YANG models, and JSON configuration payloads.',
      },
      {
        id: 'T-6.3',
        title: 'Substation Industrial Ethernet (PRP, HSR & PTP Architecture)',
        chapterNum: 30,
        summary:
          'Integrate CCNA switching/routing with IEC 61850 Station Bus and Process Bus multicast filtering and IEEE 1588v2 PTP.',
      },
      {
        id: 'T-6.4',
        title: '20 Interactive CCNA Troubleshooting Scenarios',
        chapterNum: 30,
        summary:
          'Diagnose VLAN mismatches, native VLAN leaks, OSPF MTU stuck in EXSTART, ACL blocks, STP loops, and port-security err-disabled faults.',
      },
    ],
    quiz: [
      {
        q: 'Two OSPF routers are stuck in the EXSTART / EXCHANGE state. What is the most common root cause?',
        options: [
          'Wrong DNS server',
          'Interface IP MTU mismatch between the two routers',
          'Telnet is disabled',
          'PortFast is enabled',
        ],
        answer: 1,
        explanation:
          'During ExStart/Exchange, routers exchange DBD packets containing interface MTU; if MTU values mismatch, adjacency stalls in EXSTART/EXCHANGE.',
      },
    ],
  },
  {
    id: 'CCNA-M07',
    num: '07',
    title: 'Packet Tracer Labs & Topologies',
    subtitle: '10 Step-by-Step Packet Tracer Labs, 20 Network Topologies & IOS CLI Simulator',
    chapterRange: [1, 30],
    topics: [
      {
        id: 'T-7.1',
        title: '10 Guided Packet Tracer Labs (Full Device CLI & Verification)',
        chapterNum: 8,
        summary:
          'Complete hands-on labs for VLAN segmentation, Router-on-a-Stick, LACP EtherChannel, OSPF multi-area, HSRP failover, Extended ACLs, and Substation LAN.',
      },
      {
        id: 'T-7.2',
        title: '20 Interactive Network Topology Architectures',
        chapterNum: 10,
        summary:
          'Explore 20 detailed network topologies with IP addressing tables, VLAN assignments, and verification commands.',
      },
      {
        id: 'T-7.3',
        title: 'Interactive Packet Flow Animator (ARP, VLAN, Routing, OSPF)',
        chapterNum: 13,
        summary:
          'Step through hop-by-hop L2 MAC and L3 IP header rewrites across switches and routers.',
      },
      {
        id: 'T-7.4',
        title: 'Live IPv4 CIDR / VLSM Subnetting Calculator',
        chapterNum: 4,
        summary:
          'Compute network address, broadcast address, wildcard mask, and usable host range for any IPv4 prefix `/8` to `/30`.',
      },
    ],
    quiz: [
      {
        q: 'Which Cisco IOS command displays a compact summary of all interfaces, their IPv4 addresses, and Layer-1/Layer-2 status (up/up)?',
        options: [
          'show running-config',
          'show ip interface brief',
          'show version',
          'show mac address-table',
        ],
        answer: 1,
        explanation:
          '`show ip interface brief` lists every interface with its assigned IPv4 address, Status (Layer 1), and Protocol (Layer 2).',
      },
    ],
  },
];

export const CcnaAcademyPage: React.FC = () => {
  const { bilingualTeluguEnabled } = useSubstationStore();
  const { currentUserId, users, toggleCcnaChapterComplete } = useAuthStore();
  const currentUser = users.find((u) => u.id === currentUserId) || null;

  const [viewMode, setViewMode] = useState<'OVERVIEW' | 'WORKSPACE'>('OVERVIEW');
  const [activeModuleId, setActiveModuleId] = useState<CcnaModuleId>('CCNA-M03');
  const [activeSubTab, setActiveSubTab] = useState<CcnaSubTabId>('LESSON');
  const [expandedOverviewTopicId, setExpandedOverviewTopicId] = useState<string>('T-3.1');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(CCNA_CHAPTERS[0].id);

  // Guest completed chapters fallback
  const [guestCompletedChapters, setGuestCompletedChapters] = useState<string[]>([
    'CCNA-CH-01',
    'CCNA-CH-02',
    'CCNA-CH-03',
    'CCNA-CH-04',
  ]);

  const completedChapterIds = useMemo(() => {
    if (currentUser && (currentUser.progress.ccnaCompletedChapters || []).length > 0) {
      return currentUser.progress.ccnaCompletedChapters.map((n: any) => typeof n === 'number' ? `CCNA-CH-${String(n).padStart(2, '0')}` : String(n));
    }
    return guestCompletedChapters;
  }, [currentUser, guestCompletedChapters]);

  // Network Diagrams & Packet Flow state
  const [selectedTopologyId, setSelectedTopologyId] = useState<string>(CCNA_TOPOLOGIES[0].id);
  const [activeFlowScenarioId, setActiveFlowScenarioId] = useState<string>(
    PACKET_FLOW_SCENARIOS[0].id
  );
  const [flowStepIdx, setFlowStepIdx] = useState<number>(0);

  // CLI Reference & Subnet Calculator state
  const [cliSearch, setCliSearch] = useState<string>('');
  const [subnetIp, setSubnetIp] = useState<string>('192.168.10.25');
  const [subnetPrefix, setSubnetPrefix] = useState<number>(26);

  // Practice Labs & Troubleshooting state
  const [selectedLabId, setSelectedLabId] = useState<string>(CCNA_PACKET_TRACER_LABS[0].id);
  const [selectedTroubleshootId, setSelectedTroubleshootId] = useState<string>(
    CCNA_TROUBLESHOOTING_SCENARIOS[0].id
  );

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  // Consume deep-link payload if navigated from Learning Academies
  useEffect(() => {
    const dl = window.__SAS_DEEP_LINK__;
    if (dl && dl.tab === 'CCNA_ACADEMY') {
      if (dl.moduleId && CCNA_MODULES.some((m) => m.id === dl.moduleId)) {
        const mod = CCNA_MODULES.find((m) => m.id === dl.moduleId)!;
        setActiveModuleId(mod.id);
        const ch = CCNA_CHAPTERS.find((c) => c.number === mod.chapterRange[0]);
        if (ch) setSelectedChapterId(ch.id);
        setViewMode('WORKSPACE');
      }
      if (dl.subTab) {
        setActiveSubTab(dl.subTab as CcnaSubTabId);
        setViewMode('WORKSPACE');
      }
      window.__SAS_DEEP_LINK__ = null;
    }
  }, []);

  // Listen for breadcrumb click to return to overview
  useEffect(() => {
    const onResetOverview = () => setViewMode('OVERVIEW');
    window.addEventListener('sas:reset-academy-overview', onResetOverview);
    return () => window.removeEventListener('sas:reset-academy-overview', onResetOverview);
  }, []);

  const activeModule = useMemo(
    () => CCNA_MODULES.find((m) => m.id === activeModuleId) || CCNA_MODULES[0],
    [activeModuleId]
  );

  // Sync top breadcrumb suffix
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sas:breadcrumb', {
        detail: {
          suffix: viewMode === 'WORKSPACE' ? activeModule.title : null,
        },
      })
    );
  }, [viewMode, activeModule]);

  const selectedChapter: CcnaChapter = useMemo(
    () => CCNA_CHAPTERS.find((c) => c.id === selectedChapterId) || CCNA_CHAPTERS[0],
    [selectedChapterId]
  );

  const moduleChapters = useMemo(
    () =>
      CCNA_CHAPTERS.filter(
        (c) => c.number >= activeModule.chapterRange[0] && c.number <= activeModule.chapterRange[1]
      ),
    [activeModule]
  );

  const totalChaptersCount = CCNA_CHAPTERS.length; // 30
  const completedCount = completedChapterIds.length;
  const progressPct = Math.round((completedCount / totalChaptersCount) * 100);

  const openModuleWorkspace = (
    modId: CcnaModuleId,
    subTab: CcnaSubTabId = 'LESSON',
    chapterNumber?: number
  ) => {
    const mod = CCNA_MODULES.find((m) => m.id === modId) || CCNA_MODULES[0];
    setActiveModuleId(mod.id);
    setActiveSubTab(subTab);
    const targetChNum = chapterNumber || mod.chapterRange[0];
    const ch = CCNA_CHAPTERS.find((c) => c.number === targetChNum) || CCNA_CHAPTERS[0];
    setSelectedChapterId(ch.id);
    setViewMode('WORKSPACE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleChapterComplete = (chId: string) => {
    if (currentUser) {
      toggleCcnaChapterComplete(parseInt(String(chId).replace(/\D+/g, ''), 10) || 1);
    } else {
      setGuestCompletedChapters((prev) =>
        prev.includes(chId) ? prev.filter((id) => id !== chId) : [...prev, chId]
      );
    }
  };

  const subnetResult = useMemo(
    () => calculateSubnetInfo(subnetIp, subnetPrefix),
    [subnetIp, subnetPrefix]
  );

  const activeTopology: CcnaTopologyItem = useMemo(
    () => CCNA_TOPOLOGIES.find((t) => t.id === selectedTopologyId) || CCNA_TOPOLOGIES[0],
    [selectedTopologyId]
  );

  const activeFlowScenario = useMemo(
    () =>
      PACKET_FLOW_SCENARIOS.find((s) => s.id === activeFlowScenarioId) || PACKET_FLOW_SCENARIOS[0],
    [activeFlowScenarioId]
  );

  const activeLab: CcnaPacketTracerLab = useMemo(
    () => CCNA_PACKET_TRACER_LABS.find((l) => l.id === selectedLabId) || CCNA_PACKET_TRACER_LABS[0],
    [selectedLabId]
  );

  const activeTrouble: CcnaTroubleshootingScenario = useMemo(
    () =>
      CCNA_TROUBLESHOOTING_SCENARIOS.find((s) => s.id === selectedTroubleshootId) ||
      CCNA_TROUBLESHOOTING_SCENARIOS[0],
    [selectedTroubleshootId]
  );

  const handleDownloadCcnaNotes = (scope: 'CHAPTER' | 'ALL') => {
    const list = scope === 'ALL' ? CCNA_CHAPTERS : [selectedChapter];
    const lines: string[] = [
      '====================================================================',
      'SUBSTATION AUTOMATION — CCNA 200-301 & INDUSTRIAL OT NETWORKING HANDBOOK',
      `Export Scope: ${scope === 'ALL' ? 'Complete 30-Chapter Master Guide' : `Chapter ${selectedChapter.number}: ${selectedChapter.title}`}`,
      '====================================================================\n',
    ];
    list.forEach((ch) => {
      lines.push(`CHAPTER ${String(ch.number).padStart(2, '0')}: ${ch.title.toUpperCase()}`);
      lines.push(`Telugu: ${ch.titleTe}`);
      lines.push(`Explanation: ${ch.simpleExplanation}`);
      lines.push(`Substation Application: ${ch.substationApplication}`);
      lines.push('CLI Configuration:');
      lines.push(ch.cliConfigExample);
      lines.push('====================================================================\n');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      scope === 'ALL'
        ? 'CCNA_Networking_Complete_30_Chapters_Handbook.txt'
        : `CCNA_Ch${String(selectedChapter.number).padStart(2, '0')}_Notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ============================================================================
  // RENDER VIEW 1: CCNA NETWORKING ACADEMY OVERVIEW (Matching Reference Image 4 Top-Right)
  // ============================================================================
  if (viewMode === 'OVERVIEW') {
    return (
      <div className="space-y-3.5 text-[#E4F1FF]">
        {/* 1. COMPACT TOP HEADER BANNER WITH DUAL CISCO SWITCH VISUAL */}
        <section className="relative overflow-hidden rounded-2xl border border-[#22C55E]/45 bg-gradient-to-r from-[#071C30] via-[#09243B] to-[#06182A] px-4 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                CCNA Networking Academy
              </h1>
              <p className="text-xs sm:text-[13px] text-[#9ED4C2] font-medium mt-0.5">
                Routing <span className="text-[#22C55E] mx-1">•</span> Switching{' '}
                <span className="text-[#22C55E] mx-1">•</span> VLAN{' '}
                <span className="text-[#22C55E] mx-1">•</span> OSPF{' '}
                <span className="text-[#22C55E] mx-1">•</span> Security{' '}
                <span className="text-[#22C55E] mx-1">•</span> Troubleshooting
              </p>
              {bilingualTeluguEnabled && (
                <p className="text-[11px] text-[#4ADE80] mt-0.5">
                  CCNA నెట్‌వర్కింగ్ అకాడమీ — రౌటింగ్ • స్విచింగ్ • VLAN • OSPF • సెక్యూరిటీ • ల్యాబ్స్
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <img
                src="assets/academy/cisco-switches.jpg"
                width={1074}
                height={414}
                decoding="async"
                alt="Dual Cisco Industrial Rack Switches"
                className="sas-crisp-cover hidden sm:block h-14 w-36 object-contain bg-[#030D1B] rounded-xl border border-[#22C55E]/45 shadow-md"
              />
              <button
                type="button"
                onClick={() => openModuleWorkspace(activeModule.id, 'LESSON')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#00CFFF] hover:brightness-110 px-3.5 py-2 text-xs font-black text-[#031222] shadow-[0_0_16px_rgba(34,197,94,0.35)] transition"
              >
                <span>Open Lessons</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </section>

        {/* 2. SIX HORIZONTAL ICON NAVIGATION CARDS (Matching Reference Image 4 Top-Right: Routing | Switching | VLAN | OSPF | Security | Labs) */}
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
          {(
            [
              {
                label: 'Routing',
                sub: 'IPv4 / IPv6 & Static',
                modId: 'CCNA-M03' as CcnaModuleId,
                tab: 'LESSON' as CcnaSubTabId,
                icon: <Router className="w-5 h-5 text-[#00E5FF]" />,
              },
              {
                label: 'Switching',
                sub: 'Layer-2 & STP/RSTP',
                modId: 'CCNA-M02' as CcnaModuleId,
                tab: 'LESSON' as CcnaSubTabId,
                icon: <Server className="w-5 h-5 text-[#4ADE80]" />,
              },
              {
                label: 'VLAN',
                sub: '802.1Q & Trunking',
                modId: 'CCNA-M02' as CcnaModuleId,
                tab: 'LESSON' as CcnaSubTabId,
                icon: <Layers className="w-5 h-5 text-[#00E5FF]" />,
              },
              {
                label: 'OSPF',
                sub: 'Single & Multi-Area',
                modId: 'CCNA-M04' as CcnaModuleId,
                tab: 'LESSON' as CcnaSubTabId,
                icon: <Globe className="w-5 h-5 text-[#38BDF8]" />,
              },
              {
                label: 'Security',
                sub: 'ACL, NAT & SSHv2',
                modId: 'CCNA-M05' as CcnaModuleId,
                tab: 'LESSON' as CcnaSubTabId,
                icon: <Shield className="w-5 h-5 text-[#FBBF24]" />,
              },
              {
                label: 'Labs',
                sub: 'Packet Tracer & CLI',
                modId: 'CCNA-M07' as CcnaModuleId,
                tab: 'LABS' as CcnaSubTabId,
                icon: <Terminal className="w-5 h-5 text-[#C084FC]" />,
              },
            ] as const
          ).map((card) => (
            <button
              key={card.label}
              type="button"
              onClick={() => openModuleWorkspace(card.modId, card.tab)}
              className="group rounded-2xl border border-[#1E4466] hover:border-[#00CFFF] bg-gradient-to-b from-[#09213A] to-[#07182B] hover:from-[#0E2F52] hover:to-[#09213A] p-3 text-center flex flex-col items-center justify-center gap-1.5 shadow-[0_6px_20px_rgba(0,0,0,0.4)] transition"
            >
              <div className="w-10 h-10 rounded-xl bg-[#051425] border border-[#224A6D] flex items-center justify-center group-hover:scale-105 transition">
                {card.icon}
              </div>
              <div className="text-xs font-extrabold text-white">{card.label}</div>
              <div className="text-[10px] text-[#8FB6D6]">{card.sub}</div>
            </button>
          ))}
        </section>

        {/* 3. LOWER 2-COLUMN SPLIT: Left Learning Modules (7) (5 cols) | Right Selected Module Expandable Rows + Progress (7 cols) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Panel (5 cols): Learning Modules (7) */}
          <div className="lg:col-span-5 rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Learning Modules (7)
              </h2>
              <span className="text-[11px] font-semibold text-[#84B2D6]">30 Chapters</span>
            </div>

            <div className="space-y-1.5">
              {CCNA_MODULES.map((mod) => {
                const isSelected = mod.id === activeModule.id;
                return (
                  <div
                    key={mod.id}
                    className={`rounded-xl border transition px-3 py-2 flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-gradient-to-r from-[#0E3A5A] via-[#0B2C48] to-[#082036] border-[#00CFFF] shadow-[0_0_14px_rgba(0,207,255,0.25)]'
                        : 'bg-[#081C32] border-[#1B3F60] hover:border-[#00CFFF]/50'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setActiveModuleId(mod.id);
                        if (mod.topics[0]) setExpandedOverviewTopicId(mod.topics[0].id);
                      }}
                      className="flex items-center gap-2.5 min-w-0 flex-1 text-left"
                    >
                      <span
                        className={`w-7 h-7 rounded-lg font-black text-xs flex items-center justify-center shrink-0 ${
                          isSelected
                            ? 'bg-[#00CFFF] text-[#031222]'
                            : 'bg-[#051527] border border-[#00CFFF]/50 text-[#00E5FF]'
                        }`}
                      >
                        {mod.num}
                      </span>
                      <span className="text-xs sm:text-[13px] font-extrabold text-white truncate">
                        {mod.title}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => openModuleWorkspace(mod.id, 'LESSON')}
                      className="shrink-0 rounded-lg bg-[#00CFFF]/15 hover:bg-[#00CFFF] border border-[#00CFFF]/60 px-2.5 py-1 text-[10.5px] font-extrabold text-[#00E5FF] hover:text-[#031222] transition flex items-center gap-1"
                    >
                      <span>Open</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Panel (7 cols): Selected Module Expandable Topic Rows + Your Progress (Matching Reference Image 4 Top-Right) */}
          <div className="lg:col-span-7 space-y-3.5">
            <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-base font-extrabold text-white tracking-tight">
                  {activeModule.num} {activeModule.title}
                </h2>
                <button
                  type="button"
                  onClick={() => openModuleWorkspace(activeModule.id, 'LESSON')}
                  className="text-xs font-extrabold text-[#00E5FF] hover:underline flex items-center gap-1"
                >
                  <span>Open Full Module</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="space-y-2">
                {activeModule.topics.map((tp) => {
                  const isOpen = expandedOverviewTopicId === tp.id;
                  return (
                    <div
                      key={tp.id}
                      className="rounded-xl border border-[#1C4163] bg-[#061629] overflow-hidden"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedOverviewTopicId((prev) => (prev === tp.id ? '' : tp.id))
                        }
                        className="w-full px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-[#0B2440] transition"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="w-2 h-2 rounded-full bg-[#22C55E] shrink-0" />
                          <span className="text-xs sm:text-[13px] font-extrabold text-white truncate">
                            {tp.title}
                          </span>
                        </div>
                        {isOpen ? (
                          <ChevronUp className="w-4 h-4 text-[#00E5FF] shrink-0" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#8AB4D4] shrink-0" />
                        )}
                      </button>

                      {isOpen && (
                        <div className="px-3.5 pb-3 pt-1.5 border-t border-[#163450] bg-[#041120] space-y-2">
                          <p className="text-xs text-[#C4DDF2] leading-relaxed">{tp.summary}</p>
                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() =>
                                openModuleWorkspace(activeModule.id, 'LESSON', tp.chapterNum)
                              }
                              className="inline-flex items-center gap-1 rounded-lg bg-[#00CFFF] px-3 py-1 text-[11px] font-black text-[#031222]"
                            >
                              <span>Open Chapter {tp.chapterNum} Lesson</span>
                              <ArrowRight className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Dynamic Your Progress Bar (Matching Reference Image 4 Top-Right) */}
            <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#22C55E]" />
                  <h3 className="text-sm font-extrabold text-white">Your Progress</h3>
                </div>
                <span className="text-xs font-black text-[#4ADE80]">
                  {progressPct}%{' '}
                  <span className="font-semibold text-[#8FB6D6]">
                    ({completedCount} / {totalChaptersCount} Chapters)
                  </span>
                </span>
              </div>
              <div className="w-full h-3 rounded-full bg-[#04101E] border border-[#1B3D5D] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00CFFF] via-[#22C55E] to-[#4ADE80] shadow-[0_0_12px_#22C55E] transition-all duration-300"
                  style={{ width: `${Math.max(5, progressPct)}%` }}
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ============================================================================
  // RENDER VIEW 2: CCNA DETAILED 6-TAB LESSON WORKSPACE
  // ============================================================================
  const isCurrentChapterCompleted = completedChapterIds.includes(selectedChapter.id);

  return (
    <div className="space-y-3.5 text-[#E4F1FF]">
      {/* TOP MODULE BANNER */}
      <section className="rounded-2xl border border-[#22C55E]/45 bg-gradient-to-r from-[#06182C] via-[#09243B] to-[#06182C] px-4 py-3.5 flex flex-wrap items-center justify-between gap-3 shadow-lg">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setViewMode('OVERVIEW')}
              className="inline-flex items-center gap-1 rounded-lg border border-[#244D70] bg-[#061729] hover:border-[#00CFFF] px-2.5 py-1 text-[11px] font-bold text-[#B8D7F0] hover:text-white transition"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#00CFFF]" />
              <span>Overview</span>
            </button>
            <span className="rounded-md bg-[#22C55E] px-2.5 py-0.5 text-[11px] font-black uppercase text-[#031222]">
              MODULE {activeModule.num}
            </span>
            <div className="hidden sm:flex items-center gap-1">
              {CCNA_MODULES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => openModuleWorkspace(m.id, activeSubTab)}
                  className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold transition ${
                    m.id === activeModule.id
                      ? 'bg-[#22C55E]/25 border border-[#22C55E] text-[#4ADE80]'
                      : 'bg-[#061729] border border-[#1B3C59] text-[#84ACC8] hover:text-white'
                  }`}
                >
                  M{m.num}
                </button>
              ))}
            </div>
          </div>
          <h1 className="text-lg sm:text-xl font-black text-white">{activeModule.title}</h1>
          <p className="text-xs text-[#9CC4E4]">{activeModule.subtitle}</p>
        </div>

        <button
          type="button"
          onClick={() => handleToggleChapterComplete(selectedChapter.id)}
          className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition ${
            isCurrentChapterCompleted
              ? 'border-[#22C55E] bg-[#133829] text-[#4ADE80]'
              : 'border-[#00CFFF]/70 bg-[#08223C] text-white hover:bg-[#0D3156]'
          }`}
        >
          <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
          <span>{isCurrentChapterCompleted ? 'Completed' : 'Mark Complete'}</span>
        </button>
      </section>

      {/* 6 HORIZONTAL TABS: Lesson | Network Diagrams | CLI Commands | Practice Labs | Quiz | Downloads */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1B3E5E] bg-[#061628]/95 p-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'LESSON', label: 'Lesson' },
              { id: 'DIAGRAMS', label: 'Network Diagrams' },
              { id: 'CLI', label: 'CLI Commands' },
              { id: 'LABS', label: 'Practice Labs' },
              { id: 'QUIZ', label: 'Quiz' },
              { id: 'DOWNLOADS', label: 'Downloads' },
            ] as { id: CcnaSubTabId; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveSubTab(t.id)}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition ${
                activeSubTab === t.id
                  ? 'bg-[#00CFFF] text-[#031222] shadow-[0_0_12px_rgba(0,207,255,0.4)]'
                  : 'bg-[#091F38] text-[#A8C6DF] hover:text-white border border-[#1B3E5E]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <select
          value={selectedChapter.id}
          onChange={(e) => setSelectedChapterId(e.target.value)}
          className="rounded-lg border border-[#224A6D] bg-[#081C33] px-2.5 py-1 text-xs font-bold text-[#4ADE80] focus:outline-none"
        >
          {CCNA_CHAPTERS.map((c) => (
            <option key={c.id} value={c.id} className="bg-[#061525] text-white">
              Ch {String(c.number).padStart(2, '0')}: {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* TAB 1: LESSON */}
      {activeSubTab === 'LESSON' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Main Lesson Content (8 cols) */}
          <div className="lg:col-span-8 space-y-3.5">
            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
              <div className="flex items-center justify-between border-b border-[#1B3E5E] pb-2.5">
                <div>
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#4ADE80]">
                    CCNA Chapter {selectedChapter.number} of 30 • {selectedChapter.part}
                  </span>
                  <h2 className="text-base sm:text-lg font-black text-white mt-0.5">
                    {selectedChapter.title}
                  </h2>
                  {bilingualTeluguEnabled && (
                    <p className="text-xs text-[#7BEAFF] mt-0.5">{selectedChapter.titleTe}</p>
                  )}
                </div>
              </div>

              <p className="text-xs sm:text-[13px] leading-relaxed text-[#C8E0F4]">
                {selectedChapter.simpleExplanation}
              </p>

              {/* ASCII Architecture Diagram */}
              <div className="rounded-xl border border-[#1E466A] bg-[#030C18] p-3">
                <div className="text-[11px] font-extrabold text-[#00E5FF] mb-1.5">
                  Network Topology &amp; Packet Flow Schematic
                </div>
                <pre className="font-mono text-[11px] text-[#7BEAFF] overflow-x-auto">
                  {selectedChapter.asciiDiagram}
                </pre>
              </div>

              {/* Step-by-Step Packet / Protocol Operation */}
              <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3.5 space-y-2">
                <h3 className="text-xs font-extrabold text-white">
                  Step-by-Step Protocol Operation &amp; Packet Flow
                </h3>
                <ol className="space-y-1.5 text-xs text-[#DCEAF5] list-decimal list-inside">
                  {selectedChapter.packetFlowSteps.map((st, idx) => (
                    <li key={idx} className="leading-relaxed">
                      {st}
                    </li>
                  ))}
                </ol>
              </div>

              {/* Cisco IOS CLI Configuration & Verification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#1B3E5E] bg-[#030B16] p-3 space-y-1.5">
                  <div className="text-xs font-extrabold text-[#4ADE80]">
                    Cisco IOS CLI Configuration
                  </div>
                  <pre className="font-mono text-[11px] text-[#A7F3D0] overflow-x-auto">
                    {selectedChapter.cliConfigExample}
                  </pre>
                </div>

                <div className="rounded-xl border border-[#1B3E5E] bg-[#030B16] p-3 space-y-1.5">
                  <div className="text-xs font-extrabold text-[#00E5FF]">
                    Verification (`show` Command Output)
                  </div>
                  <pre className="font-mono text-[11px] text-[#7BEAFF] overflow-x-auto">
                    {selectedChapter.cliShowOutput}
                  </pre>
                </div>
              </div>

              {/* Substation Application */}
              <div className="rounded-xl border border-[#00CFFF]/40 bg-[#06182C] p-3.5 space-y-1">
                <div className="text-xs font-extrabold text-[#00E5FF]">
                  132/33 kV IEC 61850 Substation Application
                </div>
                <p className="text-xs text-[#D6E9FA] leading-relaxed">
                  {selectedChapter.substationApplication}
                </p>
              </div>
            </div>
          </div>

          {/* Right Sticky Sidebar (4 cols): Module Chapters + Key Takeaways */}
          <div className="lg:col-span-4 space-y-3.5 lg:sticky lg:top-16">
            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-2.5">
              <div className="text-sm font-extrabold text-white">
                Module {activeModule.num} Chapters ({moduleChapters.length})
              </div>
              <div className="space-y-1.5 max-h-[280px] overflow-y-auto pr-1">
                {moduleChapters.map((mc) => {
                  const active = mc.id === selectedChapter.id;
                  const done = completedChapterIds.includes(mc.id);
                  return (
                    <button
                      key={mc.id}
                      type="button"
                      onClick={() => setSelectedChapterId(mc.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left text-xs font-bold flex items-center justify-between gap-2 border transition ${
                        active
                          ? 'bg-[#0D3B5E] border-[#00CFFF] text-white'
                          : 'bg-[#051323] border-[#173654] text-[#A9C7DF] hover:text-white'
                      }`}
                    >
                      <span className="truncate">
                        Ch {String(mc.number).padStart(2, '0')}: {mc.title}
                      </span>
                      {done && <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-2.5">
              <div className="flex items-center gap-2">
                <Lightbulb className="w-4 h-4 text-[#FFB838]" />
                <span className="text-sm font-extrabold text-white">Key Takeaways &amp; Checks</span>
              </div>
              <ul className="space-y-2 text-xs text-[#D6E9FA]">
                {selectedChapter.troubleshootingChecks.map((chk) => (
                  <li key={chk} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    <span>{chk}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* All original topology and protocol data are rendered by the visual workspace. */}
      {activeSubTab === 'DIAGRAMS' && (
        <CcnaNetworkDiagrams topologyId={selectedTopologyId} onTopologyChange={setSelectedTopologyId} isTe={bilingualTeluguEnabled} />
      )}

      {/* TAB 3: CLI COMMANDS & SUBNET CALCULATOR */}
      {activeSubTab === 'CLI' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          <div className="lg:col-span-7 rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-black text-white">Cisco IOS CLI Reference</h2>
              <input
                type="text"
                value={cliSearch}
                onChange={(e) => setCliSearch(e.target.value)}
                placeholder="Search CLI commands..."
                className="rounded-lg border border-[#224A6D] bg-[#041120] px-3 py-1 text-xs text-white"
              />
            </div>
            <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
              {IOS_CLI_CATEGORIES.map((cat) => (
                <div
                  key={cat.id}
                  className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3 space-y-2"
                >
                  <div className="text-xs font-extrabold text-[#00E5FF]">{cat.title}</div>
                  {cat.commands
                    .filter(
                      (c) =>
                        !cliSearch ||
                        c.command.toLowerCase().includes(cliSearch.toLowerCase()) ||
                        c.purpose.toLowerCase().includes(cliSearch.toLowerCase())
                    )
                    .map((cmd) => (
                      <div
                        key={cmd.command}
                        className="rounded-lg bg-[#030B16] border border-[#15314B] p-2 text-xs"
                      >
                        <div className="font-mono font-bold text-[#4ADE80]">{cmd.command}</div>
                        <div className="text-[#B8D7F0] text-[11px] mt-0.5">{cmd.purpose}</div>
                      </div>
                    ))}
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-5 rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <h2 className="text-sm font-black text-white flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#00E5FF]" />
              <span>Interactive IPv4 CIDR / VLSM Subnet Calculator</span>
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] text-[#8FB6D6]">IPv4 Address</label>
                <input
                  type="text"
                  value={subnetIp}
                  onChange={(e) => setSubnetIp(e.target.value)}
                  className="w-full mt-1 rounded-lg border border-[#224A6D] bg-[#041120] px-2.5 py-1.5 font-mono text-xs text-white"
                />
              </div>
              <div>
                <label className="text-[11px] text-[#8FB6D6]">CIDR Prefix (/{subnetPrefix})</label>
                <input
                  type="range"
                  min={8}
                  max={30}
                  value={subnetPrefix}
                  onChange={(e) => setSubnetPrefix(Number(e.target.value))}
                  className="w-full mt-2"
                />
              </div>
            </div>
            <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3 space-y-1.5 font-mono text-xs">
              <div>
                <span className="text-[#8FB6D6]">Subnet Mask: </span>
                <span className="text-[#00E5FF] font-bold">{subnetResult.subnetMask}</span>
              </div>
              <div>
                <span className="text-[#8FB6D6]">Wildcard Mask: </span>
                <span className="text-white">{subnetResult.wildcardMask}</span>
              </div>
              <div>
                <span className="text-[#8FB6D6]">Network ID: </span>
                <span className="text-[#4ADE80] font-bold">{subnetResult.networkAddress}</span>
              </div>
              <div>
                <span className="text-[#8FB6D6]">Broadcast IP: </span>
                <span className="text-[#FBBF24] font-bold">{subnetResult.broadcastAddress}</span>
              </div>
              <div>
                <span className="text-[#8FB6D6]">Usable Range: </span>
                <span className="text-white">
                  {subnetResult.firstUsable} – {subnetResult.lastUsable}
                </span>
              </div>
              <div>
                <span className="text-[#8FB6D6]">Usable Hosts: </span>
                <span className="text-[#00E5FF] font-bold">{subnetResult.usableHosts}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRACTICE LABS (10 Packet Tracer Labs + 20 Troubleshooting Scenarios) */}
      {activeSubTab === 'LABS' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <h2 className="text-base font-black text-white">
              10 Guided Packet Tracer Labs (Complete Device CLI &amp; Verification)
            </h2>
            <div className="flex flex-wrap gap-1.5">
              {CCNA_PACKET_TRACER_LABS.map((lab) => (
                <button
                  key={lab.id}
                  type="button"
                  onClick={() => setSelectedLabId(lab.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold ${
                    lab.id === activeLab.id
                      ? 'bg-[#00CFFF] text-[#031222]'
                      : 'bg-[#051323] text-[#9CC4E4] border border-[#1B3E5E]'
                  }`}
                >
                  Lab #{lab.number}: {lab.title}
                </button>
              ))}
            </div>

            <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-4 space-y-3">
              <div className="text-sm font-black text-[#00E5FF]">
                Lab #{activeLab.number}: {activeLab.title}
              </div>
              <p className="text-xs text-[#C4DDF2]">{activeLab.objective}</p>
              <pre className="rounded-lg bg-[#020812] border border-[#173654] p-3 font-mono text-[11px] text-[#4ADE80] overflow-x-auto">
                {activeLab.topologyAscii}
              </pre>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeLab.deviceConfigs.map((dc) => (
                  <div
                    key={dc.deviceName}
                    className="rounded-lg bg-[#030B16] border border-[#173654] p-3 space-y-1"
                  >
                    <div className="text-xs font-extrabold text-[#00E5FF]">{dc.deviceName}</div>
                    <pre className="font-mono text-[10.5px] text-[#A7F3D0] overflow-x-auto">
                      {dc.cliCommands}
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <h2 className="text-base font-black text-white">
              20 CCNA Network Troubleshooting Scenarios
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
              <div className="lg:col-span-4 max-h-[340px] overflow-y-auto space-y-1.5">
                {CCNA_TROUBLESHOOTING_SCENARIOS.map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setSelectedTroubleshootId(sc.id)}
                    className={`w-full rounded-xl p-2.5 text-left text-xs font-bold border ${
                      sc.id === activeTrouble.id
                        ? 'bg-[#0D3556] border-[#00CFFF] text-white'
                        : 'bg-[#051323] border-[#173654] text-[#9CC4E4]'
                    }`}
                  >
                    #{sc.number} — {sc.problemTitle}
                  </button>
                ))}
              </div>
              <div className="lg:col-span-8 rounded-xl border border-[#1B3E5E] bg-[#051323] p-4 space-y-2.5 text-xs">
                <div className="text-sm font-black text-white">{activeTrouble.problemTitle}</div>
                <div className="text-[#FDA4AF]">
                  <strong>Symptom: </strong>
                  {activeTrouble.symptom}
                </div>
                <div className="text-[#FDE68A]">
                  <strong>Root Cause: </strong>
                  {activeTrouble.rootCause}
                </div>
                <pre className="rounded-lg bg-[#030B16] border border-[#173654] p-2.5 font-mono text-[11px] text-[#4ADE80] overflow-x-auto">
                  {activeTrouble.fixCommands}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: QUIZ */}
      {activeSubTab === 'QUIZ' && (
        <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-5 space-y-4">
          <h2 className="text-base font-black text-white">
            Module {activeModule.num} Quiz — {activeModule.title}
          </h2>
          {activeModule.quiz.map((qItem, qIdx) => {
            const key = `${activeModule.id}-Q${qIdx}`;
            const picked = quizAnswers[key];
            const submitted = !!quizSubmitted[key];
            return (
              <div
                key={key}
                className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-4 space-y-2.5"
              >
                <div className="text-xs sm:text-sm font-extrabold text-white">
                  Q{qIdx + 1}. {qItem.q}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {qItem.options.map((opt, oIdx) => {
                    const isPicked = picked === oIdx;
                    const isCorrect = qItem.answer === oIdx;
                    let cls = 'border-[#1C3F60] bg-[#081C33] text-[#D0E4F7]';
                    if (submitted) {
                      if (isCorrect) cls = 'border-[#22C55E] bg-[#103326] text-[#4ADE80] font-bold';
                      else if (isPicked) cls = 'border-[#FF5C65] bg-[#3A121B] text-[#FDA4AF]';
                    }
                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => {
                          setQuizAnswers((p) => ({ ...p, [key]: oIdx }));
                          setQuizSubmitted((p) => ({ ...p, [key]: true }));
                        }}
                        className={`rounded-xl border p-2.5 text-left text-xs ${cls}`}
                      >
                        {opt}
                      </button>
                    );
                  })}
                </div>
                {submitted && (
                  <div className="text-xs text-[#7BEAFF]">
                    <strong>Explanation: </strong>
                    {qItem.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 6: DOWNLOADS */}
      {activeSubTab === 'DOWNLOADS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-5 space-y-3">
            <h3 className="text-base font-black text-white">
              Download Chapter {selectedChapter.number}: {selectedChapter.title}
            </h3>
            <p className="text-xs text-[#9CC4E4]">
              Includes IOS CLI configurations, show command outputs, ASCII topology, and substation notes.
            </p>
            <button
              type="button"
              onClick={() => handleDownloadCcnaNotes('CHAPTER')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#00CFFF] px-4 py-2 text-xs font-black text-[#031222]"
            >
              <Download className="w-4 h-4" />
              <span>Download Chapter {selectedChapter.number} (.TXT)</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-5 space-y-3">
            <h3 className="text-base font-black text-white">
              Download Complete 30-Chapter CCNA &amp; Substation OT Handbook
            </h3>
            <p className="text-xs text-[#9CC4E4]">
              Complete offline guide covering all 30 chapters of CCNA 200-301 and Substation Ethernet.
            </p>
            <button
              type="button"
              onClick={() => handleDownloadCcnaNotes('ALL')}
              className="inline-flex items-center gap-2 rounded-xl bg-[#22C55E] px-4 py-2 text-xs font-black text-[#031222]"
            >
              <Download className="w-4 h-4" />
              <span>Download All 30 Chapters (.TXT)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
