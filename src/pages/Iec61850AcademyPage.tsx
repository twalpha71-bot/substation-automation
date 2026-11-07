import React, { useEffect, useMemo, useState } from 'react';
import IecEquipmentDiagram from '../components/IecEquipmentDiagram';
import {
  IEC61850_ACADEMY_CHAPTERS,
  IEC61850_LOGICAL_NODES_DICTIONARY,
  IEC61850_TREE_SIMULATOR,
  VLAN_PRIORITY_ARCHITECTURES,
  ENGINEERING_DIAGRAM_LIBRARY,
  type Iec61850AcademyChapter,
  type EngineeringDiagramItem,
} from '../data/iec61850AcademyData';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { useAuthStore } from '../auth/useAuthStore';
import {
  ArrowLeft,
  ArrowRight,
  Award,
  BookOpen,
  CheckCircle2,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Database,
  Download,
  FileCode2,
  GitBranch,
  HelpCircle,
  Info,
  Layers,
  Lightbulb,
  Maximize2,
  Minimize2,
  Monitor,
  Network,
  Play,
  Radio,
  Search,
  Shield,
  Sliders,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react';

type ModuleId = 'MOD-01' | 'MOD-02' | 'MOD-03' | 'MOD-04' | 'MOD-05' | 'MOD-06';
type SubTabId = 'LESSON' | 'DIAGRAMS' | 'EXAMPLES' | 'QUIZ' | 'NOTES' | 'DOWNLOADS';

interface AcademyModuleDef {
  id: ModuleId;
  num: string;
  title: string;
  titleTe: string;
  subtitle: string;
  bannerTags: string;
  chapterRange: [number, number];
  lessons: {
    id: string;
    code: string;
    title: string;
    duration: string;
    chapterNum: number;
    summary: string;
    takeaways: string[];
  }[];
  quiz: {
    q: string;
    options: string[];
    answer: number;
    explanation: string;
  }[];
}

const ACADEMY_MODULES: AcademyModuleDef[] = [
  {
    id: 'MOD-01',
    num: '01',
    title: 'Electrical & Substation Fundamentals',
    titleTe: 'ఎలక్ట్రికల్ & సబ్‌స్టేషన్ ప్రాథమిక అంశాలు',
    subtitle: 'Generation, Transmission, Distribution, Substation Equipment',
    bannerTags: 'Generation • Transmission • Distribution • Substation • Power System Basics',
    chapterRange: [1, 3],
    lessons: [
      {
        id: 'L-1.1',
        code: '1.1',
        title: 'Electrical Power System Overview',
        duration: '08:20',
        chapterNum: 1,
        summary:
          'An electrical power system consists of Generation, Transmission, Substation, Distribution and Consumers. It delivers reliable, high-quality power from power plants to end users through substations at different voltage levels.',
        takeaways: [
          'Power flows from Generation → Transmission → Substation → Distribution → Consumers',
          '132/33/11 kV is a standard substation configuration',
          'CTs, PTs, CBs and IEDs are core components',
          'SAS / IEC 61850 automates protection, control & monitoring',
        ],
      },
      {
        id: 'L-1.2',
        code: '1.2',
        title: 'Typical Substation (132/33/11 kV)',
        duration: '12:45',
        chapterNum: 1,
        summary:
          'A substation transforms voltage from high to lower levels and provides switching, protection and control of the power network.',
        takeaways: [
          '132 kV Incoming Line bays feed 132/33 kV Power Transformers',
          '33 kV & 11 kV GIS/AIS Switchgear distribute power to feeders',
          'Control Room houses SAS Server, Operator HMI, GPS Clock & Protection Panels',
          'Station DC Battery Bank (110V / 220V DC) ensures uninterruptible protection tripping',
        ],
      },
      {
        id: 'L-1.3',
        code: '1.3',
        title: 'Primary Equipment (CT, PT, CB, Isolator)',
        duration: '15:10',
        chapterNum: 1,
        summary:
          'Primary switchyard apparatus carries high voltage and high fault current: SF6 Circuit Breakers interrupt fault arcs, Motorized Isolators provide visible isolation, and CTs/VTs scale current and voltage for secondary IEDs.',
        takeaways: [
          'Circuit Breaker (XCBR) interrupts load and short-circuit currents in 20–40 ms',
          'Isolator / Disconnector (XSWI) operates only under no-load conditions (interlocked with CB)',
          'Protection CTs (5P20 / PX class) avoid saturation during severe through-faults',
          'Metering CTs (0.2S class) provide high accuracy at nominal load current',
        ],
      },
      {
        id: 'L-1.4',
        code: '1.4',
        title: 'Secondary System (Protection & Control)',
        duration: '11:30',
        chapterNum: 2,
        summary:
          'Secondary systems supervise primary equipment using numerical Intelligent Electronic Devices (IEDs),Bay Control Units (BCUs), trip supervision circuits, and station SCADA gateways.',
        takeaways: [
          'Protection IEDs execute PTOC (50/51), PDIS (21), PDIF (87T/87L) algorithms',
          'Bay Control Units (BCU) manage CSWI commands, CILO interlocks, and RSYN synchrocheck',
          'Trip Circuit Supervision (TCS) monitors breaker trip coil continuity continuously',
          'Separation of Main-1 and Main-2 protection eliminates single points of failure',
        ],
      },
      {
        id: 'L-1.5',
        code: '1.5',
        title: 'Conventional vs Digital Substation',
        duration: '14:05',
        chapterNum: 2,
        summary:
          'Conventional substations rely on thousands of copper multicore cables for CT/VT analog signals and DC trip wiring, whereas IEC 61850 Digital Substations replace copper with fiber-optic Process Bus (SV + GOOSE) and Station Bus (MMS).',
        takeaways: [
          '80% reduction in field copper cabling by using Merging Units (MU) & Process Bus fiber',
          'Eliminates open-CT secondary lethal hazard in the control room',
          'Continuous self-supervision of fiber links via GOOSE/SV heartbeat messages',
          'Interoperable multi-vendor engineering via standardized SCL files',
        ],
      },
      {
        id: 'L-1.6',
        code: '1.6',
        title: 'Summary & Quiz',
        duration: '08:50',
        chapterNum: 3,
        summary:
          'Review the 3-level IEC 61850 Substation Automation hierarchy (Process Level, Bay Level, Station Level) and verify your mastery with the Module 01 interactive quiz.',
        takeaways: [
          'Station Level: SCADA HMI, Gateway, Historian, Engineering Workstation',
          'Bay Level: Protection & Control IEDs (Siemens SIPROTEC 5, ABB Relion, Schneider MiCOM, GE Multilin)',
          'Process Level: Merging Units (SAMU), Circuit Breaker I/O (SCU), Primary CT/PT/CB',
          'Complete the 5-question quiz to validate Module 01 readiness',
        ],
      },
    ],
    quiz: [
      {
        q: 'What is the typical voltage transformation sequence from a regional transmission grid down to a distribution substation?',
        options: [
          '415 V → 11 kV → 33 kV → 132 kV',
          '132 kV → 33 kV → 11 kV → 415/230 V',
          '25 kV → 400 kV → 220 kV only',
          '110 V DC → 230 V AC → 11 kV',
        ],
        answer: 1,
        explanation:
          'Power is transmitted at EHV/HV (400/220/132 kV), stepped down at substations to 33 kV and 11 kV primary distribution, and finally 415/230 V for consumers.',
      },
      {
        q: 'Which primary switchyard device is capable of interrupting full short-circuit fault current (e.g., 31.5 kA or 40 kA)?',
        options: [
          'Motorized Line Isolator (89L)',
          'Maintenance Earth Switch (89E)',
          'SF6 Circuit Breaker (52 / XCBR)',
          'Capacitive Voltage Transformer (CVT)',
        ],
        answer: 2,
        explanation:
          'Only a Circuit Breaker (52 / XCBR) has an arc-quenching medium (SF6 or vacuum) rated to interrupt live load and short-circuit fault currents.',
      },
      {
        q: 'In an IEC 61850 Digital Substation, what replaces heavy multi-core copper CT/VT cables between the switchyard and control room?',
        options: [
          'RS-485 Modbus serial twisted pair',
          'Stand-Alone Merging Units (SAMU) publishing IEC 61850-9-2LE Sampled Values over fiber',
          'Coaxial RG-58 analog cables',
          'PLC 4–20 mA current loops',
        ],
        answer: 1,
        explanation:
          'Merging Units digitize CT/VT secondary waveforms in the switchyard and multicast IEC 61850-9-2LE Sampled Values (SV) over fiber-optic Process Bus.',
      },
    ],
  },
  {
    id: 'MOD-02',
    num: '02',
    title: 'IEC 61850 System & Data Model',
    titleTe: 'IEC 61850 సిస్టమ్ & డేటా మోడల్',
    subtitle: 'Logical Nodes (LN), Data Objects (DO), Data Attributes (DA)',
    bannerTags: 'Physical Device (IED) • Logical Device (LD) • Logical Nodes (LN) • DO • DA • Functional Constraints',
    chapterRange: [4, 8],
    lessons: [
      {
        id: 'L-2.1',
        code: '2.1',
        title: 'IEC 61850 System Overview',
        duration: '10:15',
        chapterNum: 4,
        summary:
          'IEC 61850 decomposes a physical Intelligent Electronic Device (IED) into a self-describing hierarchical object model: Physical Device (IED) → Logical Device (LD) → Logical Node (LN) → Data Object (DO) → Data Attribute (DA).',
        takeaways: [
          'Eliminates proprietary register numbers (like Modbus 40001) using semantic names',
          'Defined across IEC 61850-7-1, 7-2 (ACSI), 7-3 (CDC), and 7-4 (Logical Nodes)',
          'Self-describing hierarchy allows any MMS client to browse an IED directory',
          'Standardized naming ensures multi-vendor interoperability',
        ],
      },
      {
        id: 'L-2.2',
        code: '2.2',
        title: 'Logical Nodes (LN)',
        duration: '14:30',
        chapterNum: 7,
        summary:
          'A Logical Node (LN) is a functional grouping of data and services within an IED that represents a specific substation function (such as Protection, Measurement, Switchgear, or Control).',
        takeaways: [
          'LN = Functional building block',
          'Each LN has specific functions',
          'Examples: PTOC, MMXU, XCBR',
          'Defined in IEC 61850-7-4',
        ],
      },
      {
        id: 'L-2.3',
        code: '2.3',
        title: 'Data Objects (DO)',
        duration: '11:45',
        chapterNum: 6,
        summary:
          'Inside each Logical Node are standardized Data Objects (DO) defined in IEC 61850-7-4 and typed by Common Data Classes (CDC) in IEC 61850-7-3, such as Pos (Switch Position), Op (Protection Operate), Str (Start/Pickup), and PhV (Phase Voltages).',
        takeaways: [
          'Data Objects always start with an uppercase letter (e.g., Pos, Str, Op, TotW, A)',
          'Typed by Common Data Classes (SPS, DPS, MV, CMV, WYE, DPC, INC)',
          'XCBR1.Pos uses DPC (Controllable Double Point) to represent breaker state & control',
          'MMXU1.A uses WYE (3-phase vector measurement) for phase currents phsA, phsB, phsC',
        ],
      },
      {
        id: 'L-2.4',
        code: '2.4',
        title: 'Data Attributes (DA)',
        duration: '12:20',
        chapterNum: 6,
        summary:
          'Data Attributes (DA) are the leaf elements holding actual runtime values, quality flags, and timestamps (e.g., stVal, mag.f, q, t, ctlModel), categorized by Functional Constraints (FC) such as ST, MX, CO, SP, CF, and DC.',
        takeaways: [
          'stVal holds status value (boolean, coded enum DBPOS intermediate/off/on/bad)',
          'mag.f holds floating-point analog magnitude inside MV/CMV objects',
          'q (Quality, 13 bits) indicates Validity (Good/Invalid/Questionable) and Test/Blocked flags',
          't (Timestamp, 64-bit UTC) records exact event time with TimeQuality bits',
        ],
      },
      {
        id: 'L-2.5',
        code: '2.5',
        title: 'Data Model Example',
        duration: '09:50',
        chapterNum: 8,
        summary:
          'Walk through a complete real-world IEC 61850 object reference path from a 132kV Feeder Protection IED down to its circuit breaker position and overcurrent trip signal.',
        takeaways: [
          'Full path: SIPROTEC_7SJ85_LD0/XCBR1.Pos.stVal [ST]',
          'Overcurrent trip path: SIPROTEC_7SJ85_LD0/PTOC1.Op.general [ST]',
          'Three-phase current path: SIPROTEC_7SJ85_LD0/MMXU1.A.phsA.cVal.mag.f [MX]',
          'Control command path: SIPROTEC_7SJ85_LD0/CSWI1.Pos.Oper.ctlVal [CO]',
        ],
      },
      {
        id: 'L-2.6',
        code: '2.6',
        title: 'Practice Exercise',
        duration: '10:00',
        chapterNum: 7,
        summary:
          'Interactive exercise: Explore the live IED Data Model Tree (LD0 → LLN0, LPHD1, PTOC1, PDIS1, XCBR1, CSWI1, CILO1, MMXU1) and inspect Functional Constraints and DataSet bindings.',
        takeaways: [
          'Map ANSI device numbers (50/51, 21, 87, 52, 89, 25) to IEC 61850 Logical Nodes',
          'Verify FC filtering (ST vs MX vs CO) when building GOOSE and MMS DataSets',
          'Inspect how LLN0 hosts DataSets, GSEControl, and ReportControl blocks',
          'Use the Diagrams tab to test live DataSet construction interactively',
        ],
      },
      {
        id: 'L-2.7',
        code: '2.7',
        title: 'Quiz (5 Questions)',
        duration: '07:30',
        chapterNum: 8,
        summary:
          'Validate your understanding of Logical Nodes, Common Data Classes, Data Attributes, and Functional Constraints.',
        takeaways: [
          'P-group = Protection (PTOC, PDIS, PDIF, POVP, PTOF)',
          'M-group = Metering & Measurement (MMXU, MMTR, MSQI)',
          'X-group = Switchgear (XCBR, XSWI) and C-group = Control (CSWI, CILO,ATCC)',
          'Quality (q) + Timestamp (t) should always accompany stVal/mag.f in reports',
        ],
      },
    ],
    quiz: [
      {
        q: 'Which IEC 61850 Logical Node represents a time-overcurrent protection function (ANSI 51)?',
        options: ['XCBR', 'MMXU', 'PTOC', 'CSWI'],
        answer: 2,
        explanation: 'PTOC stands for Protection Time Overcurrent (IEC 61850-7-4).',
      },
      {
        q: 'In the reference "IED1_LD0/XCBR1.Pos.stVal", what does "Pos" represent?',
        options: [
          'Physical Device Name',
          'Logical Node Class',
          'Data Object (DO) of Common Data Class DPC',
          'Functional Constraint',
        ],
        answer: 2,
        explanation:
          'XCBR1 is the Logical Node instance, Pos is the Data Object (typed by DPC), and stVal is the Data Attribute.',
      },
      {
        q: 'Which Functional Constraint (FC) identifies analog measured values such as MMXU1.TotW.mag.f?',
        options: ['ST (Status)', 'MX (Measurands)', 'CO (Control)', 'CF (Configuration)'],
        answer: 1,
        explanation: 'MX (Measurands) groups analog measured values in IEC 61850-7-2.',
      },
    ],
  },
  {
    id: 'MOD-03',
    num: '03',
    title: 'SCL Files & Engineering',
    titleTe: 'SCL ఫైల్స్ & ఇంజనీరింగ్ వర్క్‌ఫ్లో',
    subtitle: 'ICD, SSD, SCD, CID Files & Configuration Process',
    bannerTags: 'IEC 61850-6 • XML Schema • ICD • SSD • IID • SCD • CID • IEDCT & SCT Workflow',
    chapterRange: [9, 12],
    lessons: [
      {
        id: 'L-3.1',
        code: '3.1',
        title: 'Introduction to SCL (IEC 61850-6)',
        duration: '11:00',
        chapterNum: 9,
        summary:
          'Substation Configuration Description Language (SCL) is an XML-based formal language defined in IEC 61850-6 that describes the primary substation single-line topology, communication network, and IED data models.',
        takeaways: [
          'Five root XML sections: <Header>, <Substation>, <Communication>, <IED>, <DataTypeTemplates>',
          'Enables seamless file exchange between System Configurator (SCT) and IED Configurators (ICT)',
          'Eliminates manual signal re-entry across different vendor tools',
          'Edition 2.0 / 2.1 adds strict schema validation and <Inputs>/<ExtRef> enhancements',
        ],
      },
      {
        id: 'L-3.2',
        code: '3.2',
        title: 'All 6 SCL File Types (ICD, SSD, IID, SCD, CID, SED)',
        duration: '13:40',
        chapterNum: 9,
        summary:
          'Understand the exact purpose and lifecycle of each of the six standardized SCL file extensions used during greenfield and brownfield digital substation projects.',
        takeaways: [
          'ICD (IED Capability Description): Unconfigured vendor IED template',
          'SSD (System Specification Description): Substation SLD & required LNs',
          'SCD (Substation Configuration Description): Master station-wide engineered file',
          'CID (Configured IED Description): Final bay-specific file deployed to the relay',
        ],
      },
      {
        id: 'L-3.3',
        code: '3.3',
        title: 'Top-Down vs Bottom-Up Engineering Workflow',
        duration: '12:15',
        chapterNum: 10,
        summary:
          'Walk through how a System Configuration Tool (SCT like DIGSI 5, PCM600, Helinks, or PACiS SCE) imports vendor ICD/IID files, binds DataSets and GOOSE/SV inputs, and exports the master SCD.',
        takeaways: [
          'ICT exports capability template (.icd) or instantiated device (.iid)',
          'SCT combines all IEDs, assigns IP/MAC/APPID/VLAN in <Communication>',
          'SCT binds subscriber <Inputs><ExtRef> to publisher GOOSE/SV DataSet entries',
          'ICT imports master .scd and compiles the target .cid / binary firmware configuration',
        ],
      },
      {
        id: 'L-3.4',
        code: '3.4',
        title: 'DataSets, Control Blocks & <ExtRef> Binding',
        duration: '14:20',
        chapterNum: 11,
        summary:
          'Examine the XML structure of <DataSet>, <FCB>, <ReportControl>, <GSEControl>, <SampledValueControl>, and subscriber <Inputs><ExtRef> in an SCD file.',
        takeaways: [
          '<FCDA> specifies ldInst, prefix, lnClass, lnInst, doName, daName, and fc',
          'GOOSE DataSets should include both stVal/general AND Quality (q) attributes',
          '<ExtRef> documents exactly which remote IED signal drives a local virtual input',
          'ConfRev increments automatically whenever a DataSet structure is modified',
        ],
      },
    ],
    quiz: [
      {
        q: 'Which SCL file contains the complete engineered configuration of the entire substation (all IEDs, network addressing, and GOOSE bindings)?',
        options: ['.ICD', '.SSD', '.SCD', '.CID'],
        answer: 2,
        explanation:
          '.SCD (Substation Configuration Description) is the master file containing the entire substation configuration.',
      },
      {
        q: 'What happens if you add or reorder an FCDA member inside a GOOSE DataSet in the System Configuration Tool?',
        options: [
          'Nothing changes',
          'ConfRev (Configuration Revision) must increment, and subscribers must be updated',
          'The IP address resets to 0.0.0.0',
          'The circuit breaker opens immediately',
        ],
        answer: 1,
        explanation:
          'Modifying a GOOSE DataSet changes its structure, requiring ConfRev to increment; otherwise subscribers flag a configuration mismatch (NdsCom).',
      },
    ],
  },
  {
    id: 'MOD-04',
    num: '04',
    title: 'Communication (MMS, GOOSE, SV)',
    titleTe: 'కమ్యూనికేషన్ ప్రోటోకాల్స్ (MMS, GOOSE, SV)',
    subtitle: 'Client/Server, Fast Protection Tripping, Sampled Values',
    bannerTags: 'MMS (TCP/102) • GOOSE (EtherType 0x88B8) • Sampled Values (0x88BA) • Retransmission Curve',
    chapterRange: [13, 19],
    lessons: [
      {
        id: 'L-4.1',
        code: '4.1',
        title: 'OSI 7-Layer Stack Mapping in IEC 61850',
        duration: '11:20',
        chapterNum: 13,
        summary:
          'Discover why MMS uses the full 7-layer TCP/IP stack (TCP Port 102) for reliable Client/Server SCADA reporting while GOOSE and Sampled Values bypass TCP/IP to map directly onto Layer-2 Ethernet for < 3 ms protection speed.',
        takeaways: [
          'MMS (ISO 9506): Uses TCP/IP Port 102 for BRCB/URCB reports, directory browsing, and SBO controls',
          'GOOSE (IEC 61850-8-1): Maps directly to Ethernet Layer 2 (EtherType 0x88B8) for < 4 ms peer-to-peer trips',
          'Sampled Values (IEC 61850-9-2): Maps directly to Layer 2 (EtherType 0x88BA) for 4000/4800 Hz CT/VT streams',
          'IEEE 802.1Q VLAN Priority tagging (802.1p PCP 4–7) guarantees deterministic QoS in switches',
        ],
      },
      {
        id: 'L-4.2',
        code: '4.2',
        title: 'MMS Client/Server, BRCB vs URCB & SBO Control',
        duration: '13:45',
        chapterNum: 14,
        summary:
          'Deep dive into Buffered vs Unbuffered Report Control Blocks (TrgOps: dchg, qchg, dupd, integrity, GI) and Select-Before-Operate with Enhanced Security (ctlModel=4) command sequences.',
        takeaways: [
          'BRCB buffers events with sequence numbers and EntryID during SCADA link loss',
          'URCB sends reports best-effort without buffering during disconnect',
          'TrgOps bitmask: dchg (data change), qchg (quality change), integrity (periodic), GI (general interrogation)',
          'SBOw (Select-Before-Operate with Enhanced Security) prevents unintended switchgear operation',
        ],
      },
      {
        id: 'L-4.3',
        code: '4.3',
        title: 'GOOSE Fast Protection & Retransmission Mechanism',
        duration: '15:30',
        chapterNum: 15,
        summary:
          'Since Layer-2 multicast has no TCP ACK, GOOSE achieves ultra-high reliability via variable-interval retransmission (MinTime T1 = 2 ms → T2 = 4 ms → T3 = 8 ms → ... → MaxTime T0 = 1000 ms) and state/sequence counters (stNum & sqNum).',
        takeaways: [
          'New state change (e.g., Trip): stNum increments by 1, sqNum resets to 0, bursts at MinTime (2 ms)',
          'Steady state heartbeat: stNum stays constant, sqNum increments at MaxTime (1000 ms)',
          'TimeAllowedToLive (TAL) = 2 × MaxTime (or 3 × MaxTime); expiry raises GOOSE Comms Lost alarm',
          'Multicast MAC range: 01-0C-CD-01-00-00 to 01-0C-CD-01-01-FF',
        ],
      },
      {
        id: 'L-4.4',
        code: '4.4',
        title: 'Sampled Values (IEC 61850-9-2LE & IEC 61869-9)',
        duration: '14:10',
        chapterNum: 17,
        summary:
          'Merging Units sample 3-phase currents and voltages at 80 samples/cycle (4000 Hz at 50 Hz) for protection and 256 samples/cycle (12,800 Hz) for power quality, publishing ASN.1 BER encoded frames with smpCnt and smpSynch.',
        takeaways: [
          '80 samples/cycle @ 50 Hz = 4,000 frames/sec (1 ASDU per frame, 250 µs interval)',
          'smpCnt cycles from 0 to 3999 every 1.000 second and resets on the 1PPS / PTP second boundary',
          'smpSynch: 0 = Not synchronized, 1 = Local clock, 2 = Global PTP/GPS synchronized',
          'Multicast MAC range: 01-0C-CD-04-00-00 to 01-0C-CD-04-01-FF',
        ],
      },
    ],
    quiz: [
      {
        q: 'When a GOOSE publisher detects a new protection trip event, how do stNum and sqNum behave?',
        options: [
          'stNum stays constant and sqNum increments by 1',
          'stNum increments by 1 and sqNum resets to 0',
          'Both stNum and sqNum reset to 0',
          'sqNum decrements to -1',
        ],
        answer: 1,
        explanation:
          'On any state change in the GOOSE DataSet, stNum increments by 1, sqNum resets to 0, and the retransmission timer drops to MinTime (T1).',
      },
      {
        q: 'What is the Ethernet EtherType and sampling rate for IEC 61850-9-2LE Protection Sampled Values in a 50 Hz grid?',
        options: [
          '0x88B8 at 1000 frames/sec',
          '0x88BA at 4000 frames/sec (80 samples/cycle)',
          '0x0800 at 50 frames/sec',
          '0x88F7 at 256 frames/sec',
        ],
        answer: 1,
        explanation:
          'Sampled Values use EtherType 0x88BA. At 50 Hz with 80 samples/cycle (1 ASDU/frame), the frame rate is 80 × 50 = 4000 frames/sec.',
      },
    ],
  },
  {
    id: 'MOD-05',
    num: '05',
    title: 'Station Bus, Process Bus & Redundancy (PRP / HSR)',
    titleTe: 'స్టేషన్ బస్, ప్రాసెస్ బస్ & రిడండెన్సీ (PRP / HSR)',
    subtitle: 'Network Architecture, Switches, Time Sync (PTP / IEEE 1588)',
    bannerTags: 'Station Bus • Process Bus • IEC 62439-3 PRP & HSR • Zero-Ms Recovery • IEEE 1588v2 PTP',
    chapterRange: [20, 24],
    lessons: [
      {
        id: 'L-5.1',
        code: '5.1',
        title: 'Station Bus vs Process Bus Architecture',
        duration: '12:00',
        chapterNum: 20,
        summary:
          'Compare the logical and physical separation between Station Bus (inter-bay GOOSE + SCADA MMS) and Process Bus (switchyard Merging Unit Sampled Values + breaker trip GOOSE).',
        takeaways: [
          'Station Bus connects Bay IEDs, BCUs, SCADA Gateways, and Operator HMIs',
          'Process Bus connects Merging Units (SAMU) and Breaker I/O (SCU) to Bay Protection IEDs',
          'VLAN + Multicast MAC filtering (IGMP / static multicast) prevents SV streams from flooding MMS ports',
          'IEC 61850-90-4 provides comprehensive substation LAN engineering guidelines',
        ],
      },
      {
        id: 'L-5.2',
        code: '5.2',
        title: 'Zero-Recovery Redundancy: PRP & HSR (IEC 62439-3)',
        duration: '14:50',
        chapterNum: 21,
        summary:
          'Why RSTP (20–50 ms recovery) is too slow for Process Bus protection, and how Parallel Redundancy Protocol (PRP) and High-availability Seamless Redundancy (HSR) achieve 0 ms packet loss.',
        takeaways: [
          'PRP (Clause 4): Dual-Attached Node (DANP) sends duplicate frames over independent LAN-A and LAN-B',
          'HSR (Clause 5): Nodes form a fiber ring; each frame travels clockwise and counter-clockwise simultaneously',
          'RedBox (Redundancy Box) connects Single-Attached Nodes (SAN) to PRP or HSR networks',
          'Zero-ms (0.0 ms) switchover guarantees zero lost GOOSE trips or SV samples during single link failure',
        ],
      },
      {
        id: 'L-5.3',
        code: '5.3',
        title: 'Time Synchronization: SNTP, IRIG-B & IEEE 1588v2 PTP',
        duration: '13:15',
        chapterNum: 23,
        summary:
          'Sub-microsecond time synchronization (< 1 µs) is mandatory for Sampled Values phase-angle alignment across Merging Units using IEEE 1588v2 Power Profile (C37.238) / IEC 61850-9-3.',
        takeaways: [
          'SNTP (1–10 ms accuracy): Sufficient only for basic station-level SCADA logging, NEVER for SV',
          'PTP IEEE 1588v2 (Sub-1 µs accuracy): Uses hardware timestamping and Transparent/Boundary Clocks',
          'At 50 Hz, a 1 ms timing error causes an 18° phase angle error (destroying differential protection 87L/87T)',
          'Redundant GPS/GNSS Grandmaster clocks with Best Master Clock Algorithm (BMCA) ensure holdover safety',
        ],
      },
    ],
    quiz: [
      {
        q: 'What is the failover recovery time of IEC 62439-3 PRP (Parallel Redundancy Protocol) when a single fiber link fails?',
        options: ['500 ms', '50 ms', '15 ms', '0 ms (Seamless zero-time recovery)'],
        answer: 3,
        explanation:
          'Because PRP transmits duplicate frames simultaneously over independent LAN A and LAN B, the receiver uses whichever arrives first and experiences 0 ms failover.',
      },
      {
        q: 'Why is IEEE 1588v2 PTP (< 1 µs accuracy) mandatory for Process Bus Merging Units instead of SNTP?',
        options: [
          'SNTP uses too much fiber bandwidth',
          'A 1 ms timing error at 50 Hz creates an 18° phase shift, causing false differential (87) trips',
          'SNTP only works on Windows servers',
          'Merging Units do not have Ethernet ports',
        ],
        answer: 1,
        explanation:
          'At 50 Hz (20 ms period = 360°), 1 ms equals 18° of phase angle error. Sub-microsecond (< 1 µs ≈ 0.018°) sync via PTP is essential for differential & phasor protection.',
      },
    ],
  },
  {
    id: 'MOD-06',
    num: '06',
    title: 'Testing, FAT / SAT & Troubleshooting',
    titleTe: 'టెస్టింగ్, FAT / SAT & ట్రబుల్‌షూటింగ్',
    subtitle: 'Relay Testing, GOOSE/SV Verification, Commissioning',
    bannerTags: 'IEC 61850-7-4 Sim & Test Mode • LPHD.Sim •Mod / Beh • OMICRON / Megger / Doble • FAT / SAT',
    chapterRange: [25, 30],
    lessons: [
      {
        id: 'L-6.1',
        code: '6.1',
        title: 'Edition 2 Test Isolation: Mod, Beh, q.test & LPHD.Sim',
        duration: '15:00',
        chapterNum: 25,
        summary:
          'Master live-substation digital relay testing without tripping energized circuit breakers using IEC 61850 Edition 2 Mode/Behaviour states (on, blocked, test, test/blocked, off) and the LPHD1.Sim flag.',
        takeaways: [
          'Mod = "test/blocked" processes test signals internally while blocking physical breaker output contacts',
          'When LPHD1.Sim = TRUE, the IED accepts simulated GOOSE/SV frames (Simulation bit = 1) and ignores real bus',
          'Normal energized IEDs (Beh = "on") ignore any GOOSE frame that has the q.test flag set',
          'Virtual Isolation replaces physical test plugs and CT shorting links during maintenance',
        ],
      },
      {
        id: 'L-6.2',
        code: '6.2',
        title: 'Wireshark Packet Analysis & Commissioning Diagnostics',
        duration: '13:30',
        chapterNum: 27,
        summary:
          'Diagnose real-world GOOSE, SV, and MMS failures using Wireshark capture filters (`ether proto 0x88b8`, `ether proto 0x88ba`, `tcp.port == 102`) and IED diagnostic attributes.',
        takeaways: [
          'GOOSE Subscriber not tripping: Check APPID, GoCBRef, DatSet, ConfRev, VLAN strip, and q.test mismatch',
          'SV "SmpSynch Lost": Check PTP Grandmaster lock, Transparent Clock switch config, and VLAN priority',
          'MMS Report not arriving: Check BRCB RptEna=TRUE, ResvTms, Client IP pre-assignment in SCD, and GI trigger',
          'Duplicate stNum or missing sqNum indicates multicast storm or switch loop',
        ],
      },
      {
        id: 'L-6.3',
        code: '6.3',
        title: 'Complete FAT & SAT Commissioning Checklist',
        duration: '12:40',
        chapterNum: 26,
        summary:
          'Step-by-step Factory Acceptance Test (FAT) and Site Acceptance Test (SAT) verification workflow for 132/33/11 kV digital substations.',
        takeaways: [
          'Stage 1: SCD Schema & CRC Verification against approved vendor ICD/CID revisions',
          'Stage 2: PRP/HSR LAN-A/LAN-B zero-packet-loss link pull test & PTP < 1 µs accuracy check',
          'Stage 3: End-to-end GOOSE trip matrix verification (< 3 ms transfer time) & SBO interlock test',
          'Stage 4: SCADA Point-to-Point MMS GI / SOE timestamp verification & Test-Mode restoration audit',
        ],
      },
    ],
    quiz: [
      {
        q: 'In an energized Edition 2 digital substation, which Logical Node mode allows an engineer to test a protection function via simulated GOOSE without operating the physical breaker output relay?',
        options: ['Mod = on', 'Mod = test/blocked', 'Mod = off', 'Mod = unconfigured'],
        answer: 1,
        explanation:
          'Mod = test/blocked (value 4) processes test-flagged GOOSE/SV messages and updates internal logic/reports while blocking physical hardware output contacts.',
      },
      {
        q: 'What is the most common reason a subscriber IED ignores a GOOSE frame even though Wireshark shows the frame arriving at the switch port?',
        options: [
          'The fiber cable is orange instead of aqua',
          'ConfRev, GoCBRef, DatSet, or APPID mismatch between publisher CID and subscriber SCD binding',
          'TCP port 102 is closed',
          'SNTP server is offline',
        ],
        answer: 1,
        explanation:
          'A GOOSE subscriber validates GoCBRef, DatSet, AppID, and ConfRev on every frame; any mismatch causes the subscriber to reject the payload.',
      },
    ],
  },
];

export const Iec61850AcademyPage: React.FC = () => {
  const { setActiveTab, bilingualTeluguEnabled } = useSubstationStore();
  const { currentUserId, users, toggleIec61850ChapterComplete } = useAuthStore();
  const currentUser = users.find((u) => u.id === currentUserId) || null;

  const [viewMode, setViewMode] = useState<'OVERVIEW' | 'MODULE_WORKSPACE'>('OVERVIEW');
  const [activeModuleId, setActiveModuleId] = useState<ModuleId>('MOD-01');
  const [activeSubTab, setActiveSubTab] = useState<SubTabId>('LESSON');
  const [selectedLessonId, setSelectedLessonId] = useState<string>('L-1.1');
  const [selectedChapterId, setSelectedChapterId] = useState<string>(IEC61850_ACADEMY_CHAPTERS[0].id);
  const [expandedLessons, setExpandedLessons] = useState<Record<string, boolean>>({
    'L-1.1': true,
    'L-1.2': true,
    'L-1.3': false,
    'L-1.4': false,
    'L-1.5': false,
    'L-1.6': false,
  });

  // Local completed chapters fallback when guest is browsing
  const [guestCompletedChapters, setGuestCompletedChapters] = useState<string[]>([
    'CH-01',
    'CH-02',
    'CH-03',
    'CH-04',
    'CH-05',
  ]);

  const completedChapterIds = useMemo(() => {
    if (currentUser && (currentUser.progress.iec61850CompletedChapters || []).length > 0) {
      return currentUser.progress.iec61850CompletedChapters;
    }
    return guestCompletedChapters;
  }, [currentUser, guestCompletedChapters]);

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<string, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<Record<string, boolean>>({});

  // Diagrams & Data Tree Lab state
  const [selectedDiagramCategory, setSelectedDiagramCategory] = useState<string>('ALL');
  const [diagramSearch, setDiagramSearch] = useState<string>('');
  const [activeDiagramId, setActiveDiagramId] = useState<string>(ENGINEERING_DIAGRAM_LIBRARY[0].id);
  const [diagramZoom, setDiagramZoom] = useState<number>(100);
  const [diagramFullscreen, setDiagramFullscreen] = useState<boolean>(false);

  // Interactive Tree Lab state
  const [selectedLnId, setSelectedLnId] = useState<string>(IEC61850_TREE_SIMULATOR[2].id);
  const [selectedDoName, setSelectedDoName] = useState<string>('Op');
  const [fcFilter, setFcFilter] = useState<string>('ALL');
  const [lnDictSearch, setLnDictSearch] = useState<string>('');

  // Relay modal preview state
  const [activeRelayVendor, setActiveRelayVendor] = useState<{
    name: string;
    model: string;
    iedCode: string;
    protocols: string;
    description: string;
    img: string;
  } | null>(null);

  // Consume deep-link payload if navigated from Learning Academies or another page
  useEffect(() => {
    const dl = window.__SAS_DEEP_LINK__;
    if (dl && dl.tab === 'IEC61850_ACADEMY') {
      if (dl.moduleId && ACADEMY_MODULES.some((m) => m.id === dl.moduleId)) {
        const mod = ACADEMY_MODULES.find((m) => m.id === dl.moduleId)!;
        setActiveModuleId(mod.id);
        setSelectedLessonId(mod.lessons[0].id);
        const ch = IEC61850_ACADEMY_CHAPTERS.find((c) => c.number === mod.chapterRange[0]);
        if (ch) setSelectedChapterId(ch.id);
        setViewMode('MODULE_WORKSPACE');
      }
      if (dl.subTab) {
        setActiveSubTab(dl.subTab as SubTabId);
        setViewMode('MODULE_WORKSPACE');
      }
      if (dl.chapterId) {
        const ch = IEC61850_ACADEMY_CHAPTERS.find((c) => c.id === dl.chapterId);
        if (ch) {
          setSelectedChapterId(ch.id);
          const matchingMod = ACADEMY_MODULES.find(
            (m) => ch.number >= m.chapterRange[0] && ch.number <= m.chapterRange[1]
          );
          if (matchingMod) {
            setActiveModuleId(matchingMod.id);
            setSelectedLessonId(matchingMod.lessons[0].id);
          }
          setViewMode('MODULE_WORKSPACE');
        }
      }
      window.__SAS_DEEP_LINK__ = null;
    }
  }, []);

  // Listen for breadcrumb click to return to overview
  useEffect(() => {
    const onResetOverview = () => {
      setViewMode('OVERVIEW');
    };
    window.addEventListener('sas:reset-academy-overview', onResetOverview);
    return () => window.removeEventListener('sas:reset-academy-overview', onResetOverview);
  }, []);

  const activeModule = useMemo(
    () => ACADEMY_MODULES.find((m) => m.id === activeModuleId) || ACADEMY_MODULES[0],
    [activeModuleId]
  );

  // Sync top header breadcrumb suffix
  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('sas:breadcrumb', {
        detail: {
          suffix: viewMode === 'MODULE_WORKSPACE' ? activeModule.title : null,
        },
      })
    );
  }, [viewMode, activeModule]);

  const activeLesson = useMemo(
    () => activeModule.lessons.find((l) => l.id === selectedLessonId) || activeModule.lessons[0],
    [activeModule, selectedLessonId]
  );

  const selectedChapter: Iec61850AcademyChapter = useMemo(() => {
    const byId = IEC61850_ACADEMY_CHAPTERS.find((c) => c.id === selectedChapterId);
    if (byId) return byId;
    const byLesson = IEC61850_ACADEMY_CHAPTERS.find((c) => c.number === activeLesson.chapterNum);
    return byLesson || IEC61850_ACADEMY_CHAPTERS[0];
  }, [selectedChapterId, activeLesson]);

  const moduleChapters = useMemo(
    () =>
      IEC61850_ACADEMY_CHAPTERS.filter(
        (c) => c.number >= activeModule.chapterRange[0] && c.number <= activeModule.chapterRange[1]
      ),
    [activeModule]
  );

  const totalChaptersCount = IEC61850_ACADEMY_CHAPTERS.length; // 30
  const completedCount = completedChapterIds.length;
  const progressPct = Math.round((completedCount / totalChaptersCount) * 100);

  const openModule = (modId: ModuleId, initialSubTab: SubTabId = 'LESSON', lessonIndex = 0) => {
    const mod = ACADEMY_MODULES.find((m) => m.id === modId) || ACADEMY_MODULES[0];
    setActiveModuleId(mod.id);
    setActiveSubTab(initialSubTab);
    const targetLesson = mod.lessons[lessonIndex] || mod.lessons[0];
    setSelectedLessonId(targetLesson.id);
    const ch = IEC61850_ACADEMY_CHAPTERS.find((c) => c.number === targetLesson.chapterNum);
    if (ch) setSelectedChapterId(ch.id);
    setViewMode('MODULE_WORKSPACE');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleToggleChapterComplete = (chapterId: string) => {
    if (currentUser) {
      toggleIec61850ChapterComplete(chapterId);
    } else {
      setGuestCompletedChapters((prev) =>
        prev.includes(chapterId) ? prev.filter((id) => id !== chapterId) : [...prev, chapterId]
      );
    }
  };

  const handleSelectLesson = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setExpandedLessons((prev) => ({ ...prev, [lessonId]: true }));
    const lesson = activeModule.lessons.find((l) => l.id === lessonId);
    if (lesson) {
      const ch = IEC61850_ACADEMY_CHAPTERS.find((c) => c.number === lesson.chapterNum);
      if (ch) setSelectedChapterId(ch.id);
    }
  };

  const handleDownloadNotes = (scope: 'CHAPTER' | 'ALL') => {
    const chaptersToExport = scope === 'ALL' ? IEC61850_ACADEMY_CHAPTERS : [selectedChapter];
    const lines: string[] = [
      '====================================================================',
      'SUBSTATION AUTOMATION — IEC 61850 DIGITAL SUBSTATION ENGINEERING NOTES',
      `Export Scope: ${scope === 'ALL' ? 'Complete 30-Chapter Master Handbook' : `Chapter ${selectedChapter.number}: ${selectedChapter.title}`}`,
      '====================================================================',
      '',
    ];
    chaptersToExport.forEach((ch) => {
      lines.push(`CHAPTER ${String(ch.number).padStart(2, '0')}: ${ch.title.toUpperCase()}`);
      lines.push(`Telugu: ${ch.titleTe}`);
      lines.push(`Summary: ${ch.summary}`);
      lines.push('Key Takeaways:');
      ch.keyTakeaways.forEach((k) => lines.push(`  • ${k}`));
      lines.push('');
      ch.sections.forEach((s) => {
        lines.push(`--- ${s.heading} ---`);
        s.paragraphs.forEach((p) => lines.push(p));
        if (s.bullets) s.bullets.forEach((b) => lines.push(`  * ${b}`));
        if (s.diagramAscii) {
          lines.push('');
          lines.push(s.diagramAscii);
        }
        lines.push('');
      });
      lines.push('====================================================================\n');
    });
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download =
      scope === 'ALL'
        ? 'IEC_61850_Complete_30_Chapters_Handbook.txt'
        : `IEC_61850_Ch${String(selectedChapter.number).padStart(2, '0')}_Notes.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredDiagrams = useMemo(() => {
    return ENGINEERING_DIAGRAM_LIBRARY.filter((d) => {
      const catOk = selectedDiagramCategory === 'ALL' || d.category === selectedDiagramCategory;
      const q = diagramSearch.trim().toLowerCase();
      const searchOk =
        !q ||
        d.title.toLowerCase().includes(q) ||
        d.subtitle.toLowerCase().includes(q) ||
        d.description.toLowerCase().includes(q);
      return catOk && searchOk;
    });
  }, [selectedDiagramCategory, diagramSearch]);

  const activeDiagram: EngineeringDiagramItem = useMemo(
    () =>
      ENGINEERING_DIAGRAM_LIBRARY.find((d) => d.id === activeDiagramId) ||
      filteredDiagrams[0] ||
      ENGINEERING_DIAGRAM_LIBRARY[0],
    [activeDiagramId, filteredDiagrams]
  );

  const selectedTreeLn = useMemo(
    () => IEC61850_TREE_SIMULATOR.find((ln) => ln.id === selectedLnId) || IEC61850_TREE_SIMULATOR[0],
    [selectedLnId]
  );

  const selectedTreeDo = useMemo(
    () =>
      selectedTreeLn.dataObjects.find((d) => d.name === selectedDoName) ||
      selectedTreeLn.dataObjects[0],
    [selectedTreeLn, selectedDoName]
  );

  const filteredDictionary = useMemo(() => {
    const q = lnDictSearch.trim().toLowerCase();
    if (!q) return IEC61850_LOGICAL_NODES_DICTIONARY;
    return IEC61850_LOGICAL_NODES_DICTIONARY.filter(
      (item) =>
        item.lnClass.toLowerCase().includes(q) ||
        item.name.toLowerCase().includes(q) ||
        item.ansiDevice.toLowerCase().includes(q) ||
        item.purpose.toLowerCase().includes(q)
    );
  }, [lnDictSearch]);

  const RELAY_SHOWCASE_ITEMS = [
    {
      name: 'Siemens',
      model: 'SIPROTEC 5',
      iedCode: '7SJ85 / 7SL87',
      protocols: 'IEC 61850 Ed.2, MMS, GOOSE, SV (9-2LE), PRP/HSR, IEEE 1588v2 PTP',
      description:
        'Modular numerical protection & bay controller engineered in DIGSI 5. Supports flexible function group engineering, cyber security (IEC 62351), and process bus Sampled Values.',
      img: 'assets/ieds/siemens-7sj85.webp',
    },
    {
      name: 'Schneider',
      model: 'MiCOM',
      iedCode: 'P143 / P443 / P643',
      protocols: 'IEC 61850 Ed.2, MMS, GOOSE, Dual-Homed PRP/HSR,IEC 60870-5-103/104',
      description:
        'High-speed feeder, distance, and transformer differential protection relay configured with Easergy Studio / MiCOM S1 Agile and Programmable Scheme Logic (PSL).',
      img: 'assets/ieds/schneider-p143.webp',
    },
    {
      name: 'ABB',
      model: 'Relion',
      iedCode: 'REF615 / RED670 / REC670',
      protocols: 'IEC 61850 Ed.2, GOOSE (<3ms), IEC 61850-9-2LE SV, PRP/HSR, Modbus TCP',
      description:
        '615/670 series protection and control IED engineered with Protection and Control IED Manager PCM600, featuring native withdrawable plug-in design and Web HMI.',
      img: 'assets/ieds/abb-ref615.webp',
    },
    {
      name: 'GE',
      model: 'Multilin',
      iedCode: 'UR 850 / F60 / T60 / L90',
      protocols: 'IEC 61850 Ed.2, Routable GOOSE, Sampled Values, PRP/HSR, DNP3 / IEC-104',
      description:
        'Universal Relay (UR) & 8 Series protection platform configured via EnerVista UR Setup, delivering high-speed FlexLogic protection and synchrophasor PMU streaming.',
      img: 'assets/ieds/ge-850.webp',
    },
  ];

  // ============================================================================
  // RENDER VIEW 1: IEC 61850 OVERVIEW DASHBOARD (Matching Reference Image 1 & 4)
  // ============================================================================
  if (viewMode === 'OVERVIEW') {
    const nextIncompleteChapter =
      IEC61850_ACADEMY_CHAPTERS.find((c) => !completedChapterIds.includes(c.id)) ||
      IEC61850_ACADEMY_CHAPTERS[0];
    const nextModule =
      ACADEMY_MODULES.find(
        (m) =>
          nextIncompleteChapter.number >= m.chapterRange[0] &&
          nextIncompleteChapter.number <= m.chapterRange[1]
      ) || ACADEMY_MODULES[0];

    return (
      <div className="space-y-3.5 text-[#E4F1FF]">
        {/* 1. COMPACT TOP BANNER (Matching Reference Image 1 `image_d8f801.jpg`) */}
        <section className="relative overflow-hidden rounded-2xl border border-[#00CFFF]/45 bg-gradient-to-r from-[#071B32] via-[#0A2644] to-[#081D35] px-4 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
          {/* Center-Right Transmission Tower Backdrop */}
          <img
            src="assets/academy/banner-towers.jpg"
            alt=""
            aria-hidden="true"
            className="pointer-events-none select-none hidden md:block absolute right-48 top-0 h-full w-[420px] object-cover opacity-55 mix-blend-screen"
            style={{
              maskImage: 'linear-gradient(to right, transparent 0%, black 25%, black 80%, transparent 100%)',
              WebkitMaskImage:
                'linear-gradient(to right, transparent 0%, black 25%, black 80%, transparent 100%)',
            }}
          />

          <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                IEC 61850 Digital Substation
              </h1>
              <p className="text-xs sm:text-[13px] text-[#9CC4E4] font-medium mt-0.5">
                Concepts <span className="text-[#00CFFF] mx-1">•</span> Communication{' '}
                <span className="text-[#00CFFF] mx-1">•</span> Modelling{' '}
                <span className="text-[#00CFFF] mx-1">•</span> Configuration{' '}
                <span className="text-[#00CFFF] mx-1">•</span> FAT/SAT
              </p>
              {bilingualTeluguEnabled && (
                <p className="text-[11px] text-[#7BEAFF] mt-0.5">
                  IEC 61850 డిజిటల్ సబ్‌స్టేషన్ — కాన్సెప్ట్స్ • కమ్యూనికేషన్ • డేటా మోడలింగ్ • SCL • FAT/SAT
                </p>
              )}
            </div>

            <div className="flex items-center gap-2.5">
              {/* Chapter Dropdown Selector */}
              <div className="relative">
                <label htmlFor="iec-chapter-select" className="sr-only">
                  Select Chapter
                </label>
                <div className="flex items-center gap-1.5 rounded-xl border border-[#254D70] bg-[#081C33]/90 px-3 py-2 text-xs font-bold text-[#DCEAF5] hover:border-[#00CFFF] transition">
                  <BookOpen className="w-3.5 h-3.5 text-[#00CFFF] shrink-0" />
                  <select
                    id="iec-chapter-select"
                    value={selectedChapterId}
                    onChange={(e) => {
                      const chId = e.target.value;
                      setSelectedChapterId(chId);
                      const ch = IEC61850_ACADEMY_CHAPTERS.find((c) => c.id === chId);
                      if (ch) {
                        const mod =
                          ACADEMY_MODULES.find(
                            (m) => ch.number >= m.chapterRange[0] && ch.number <= m.chapterRange[1]
                          ) || ACADEMY_MODULES[0];
                        openModule(mod.id, 'LESSON', 0);
                        setSelectedChapterId(ch.id);
                      }
                    }}
                    className="bg-transparent text-xs font-bold text-[#E9F5FF] focus:outline-none cursor-pointer pr-1 max-w-[140px] sm:max-w-[180px] truncate"
                  >
                    <option value="" disabled className="bg-[#071628] text-[#9CC4E4]">
                      Chapter
                    </option>
                    {IEC61850_ACADEMY_CHAPTERS.map((ch) => (
                      <option key={ch.id} value={ch.id} className="bg-[#071628] text-white">
                        Ch {String(ch.number).padStart(2, '0')}: {ch.title}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#8AB4D4] shrink-0 pointer-events-none" />
                </div>
              </div>

              {/* Open SLD Cyan Button */}
              <button
                type="button"
                onClick={() => setActiveTab('SLD')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#00A8FF] hover:brightness-110 px-3.5 py-2 text-xs font-black text-[#031222] shadow-[0_0_18px_rgba(0,217,255,0.4)] transition"
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>Open SLD</span>
              </button>
            </div>
          </div>
        </section>

        {/* 2. MIDDLE ROW: 2-COLUMN SPLIT (Left 4-Vendor Relay Showcase ~52% | Right IEC 61850 Overview Card ~48%) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
          {/* Left Panel (6 cols): 4-Vendor Industrial Protection Relays Showcase */}
          <div className="lg:col-span-6 rounded-2xl border border-[#1E4466] bg-[#07182B] p-2.5 flex flex-col justify-between shadow-[0_6px_24px_rgba(0,0,0,0.45)] relative overflow-hidden">
            <div className="relative rounded-xl overflow-hidden border border-[#1B3E5E] bg-[#051221]">
              <img
                src="assets/academy/relays-4vendor.jpg"
                width={1254}
                height={608}
                decoding="async"
                alt="Siemens SIPROTEC 5, Schneider MiCOM, ABB Relion, and GE Multilin protection relays"
                className="sas-crisp-cover w-full h-[210px] sm:h-[228px] object-contain object-center bg-[#030B17]"
              />
              {/* Interactive transparent hitboxes over the 4 relays so clicking any relay opens its technical spec sheet */}
              <div className="absolute inset-0 grid grid-cols-4">
                {RELAY_SHOWCASE_ITEMS.map((item) => (
                  <button
                    key={item.name}
                    type="button"
                    onClick={() => setActiveRelayVendor(item)}
                    title={`Inspect ${item.name} ${item.model} (${item.iedCode})`}
                    className="group relative h-full w-full focus:outline-none hover:bg-[#00CFFF]/10 transition"
                  >
                    <span className="opacity-0 group-hover:opacity-100 transition absolute top-2 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#041222]/90 border border-[#00CFFF] px-2 py-0.5 text-[10px] font-bold text-[#00E5FF] shadow-lg">
                      Inspect {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Right Panel (6 cols): IEC 61850 Overview + 4 Equal Icon Cards */}
          <div className="lg:col-span-6 rounded-2xl border border-[#1E4466] bg-gradient-to-br from-[#081D34] via-[#07182C] to-[#051222] p-4 flex flex-col justify-between shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-[#00CFFF]/20 border border-[#00CFFF] flex items-center justify-center text-[#00E5FF] font-black text-xs">
                  i
                </span>
                <h2 className="text-base sm:text-[17px] font-extrabold text-white tracking-tight">
                  IEC 61850 Overview
                </h2>
              </div>
              <p className="mt-2 text-xs sm:text-[12.5px] leading-relaxed text-[#B6D3EA]">
                IEC 61850 is the international standard for communication, data modelling and engineering
                in digital substations. Learn how modern protection, control and monitoring systems work
                using MMS, GOOSE and Sampled Values.
              </p>
            </div>

            {/* 4 Equal Horizontal Feature Cards: MMS | GOOSE | Sampled Values | SCL */}
            <div className="mt-3.5 grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                type="button"
                onClick={() => openModule('MOD-04', 'LESSON', 1)}
                className="group rounded-xl border border-[#1F496E] hover:border-[#00CFFF] bg-[#09213A]/90 hover:bg-[#0D2C4D] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition shadow-inner"
              >
                <div className="w-9 h-9 rounded-lg bg-[#06182C] border border-[#00CFFF]/40 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition">
                  <Monitor className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">MMS</div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(Client/Server)</div>
              </button>

              <button
                type="button"
                onClick={() => openModule('MOD-04', 'LESSON', 2)}
                className="group rounded-xl border border-[#1F496E] hover:border-[#FFB838] bg-[#09213A]/90 hover:bg-[#0D2C4D] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition shadow-inner"
              >
                <div className="w-9 h-9 rounded-lg bg-[#271C12] border border-[#FFB838]/55 flex items-center justify-center text-[#FFC44D] group-hover:scale-105 transition">
                  <Zap className="w-5 h-5 fill-[#FFB838]/35" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">GOOSE</div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(Fast Protection)</div>
              </button>

              <button
                type="button"
                onClick={() => openModule('MOD-04', 'LESSON', 3)}
                className="group rounded-xl border border-[#1F496E] hover:border-[#00CFFF] bg-[#09213A]/90 hover:bg-[#0D2C4D] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition shadow-inner"
              >
                <div className="w-9 h-9 rounded-lg bg-[#06182C] border border-[#00CFFF]/40 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition">
                  <Radio className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">Sampled Values</div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(Process Bus)</div>
              </button>

              <button
                type="button"
                onClick={() => openModule('MOD-03', 'LESSON', 0)}
                className="group rounded-xl border border-[#1F496E] hover:border-[#00CFFF] bg-[#09213A]/90 hover:bg-[#0D2C4D] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition shadow-inner"
              >
                <div className="w-9 h-9 rounded-lg bg-[#06182C] border border-[#00CFFF]/40 flex items-center justify-center text-[#00E5FF] group-hover:scale-105 transition">
                  <FileCode2 className="w-5 h-5" />
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">SCL</div>
                <div className="text-[10.5px] text-[#90B8D8] leading-tight">(ICD / CID / SCD)</div>
              </button>
            </div>
          </div>
        </section>

        {/* 3. LOWER ROW: 2-COLUMN SPLIT (Left Learning Modules 01–06 ~67% | Right Quick Actions + Continue Learning + Progress ~33%) */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* Left Panel (8 cols): Learning Modules (01 to 06) */}
          <div className="lg:col-span-8 rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-extrabold text-white tracking-tight">
                Learning Modules
              </h2>
              <span className="text-[11px] font-semibold text-[#84B2D6]">
                6 Structured Engineering Modules • 30 Chapters
              </span>
            </div>

            <div className="space-y-2">
              {ACADEMY_MODULES.map((mod) => {
                const modChs = IEC61850_ACADEMY_CHAPTERS.filter(
                  (c) => c.number >= mod.chapterRange[0] && c.number <= mod.chapterRange[1]
                );
                const doneInMod = modChs.filter((c) => completedChapterIds.includes(c.id)).length;
                return (
                  <button
                    key={mod.id}
                    type="button"
                    onClick={() => openModule(mod.id, 'LESSON', 0)}
                    className="group w-full rounded-xl border border-[#1B3F60] hover:border-[#00CFFF] bg-gradient-to-r from-[#092038] via-[#081C32] to-[#07172A] hover:from-[#0D2E4F] hover:to-[#09213A] px-3.5 py-2.5 flex items-center justify-between gap-3 text-left transition shadow-sm"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="w-8 h-8 rounded-lg bg-[#051527] border border-[#00CFFF]/55 text-[#00E5FF] font-black text-xs flex items-center justify-center shrink-0 shadow-[0_0_10px_rgba(0,207,255,0.2)] group-hover:bg-[#00CFFF] group-hover:text-[#031222] transition">
                        {mod.num}
                      </span>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-extrabold text-white group-hover:text-[#00E5FF] transition truncate">
                          {mod.title}
                        </div>
                        <div className="text-[11.5px] text-[#8FB6D6] truncate mt-0.5">
                          {mod.subtitle}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 shrink-0">
                      <span className="hidden sm:inline-flex items-center gap-1 rounded-full bg-[#051424] border border-[#1E4466] px-2 py-0.5 text-[10px] font-mono text-[#8AB4D4]">
                        {doneInMod}/{modChs.length} Ch
                      </span>
                      <ChevronRight className="w-4 h-4 text-[#74A2C6] group-hover:text-[#00E5FF] group-hover:translate-x-0.5 transition" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Panel (4 cols): Quick Actions + Continue Learning + Your Progress */}
          <div className="lg:col-span-4 space-y-3.5">
            {/* Quick Actions Card (Matching Reference Image 1) */}
            <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-[#FFB838] fill-[#FFB838]/40" />
                <h2 className="text-sm font-extrabold text-white tracking-tight">Quick Actions</h2>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => openModule('MOD-01', 'DIAGRAMS', 0)}
                  className="group rounded-xl border border-[#1D4366] hover:border-[#00CFFF] bg-[#09213A] hover:bg-[#0E2E4F] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#061629] border border-[#00CFFF]/40 flex items-center justify-center text-[#00E5FF]">
                    <Layers className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#E4F1FF] leading-tight">
                    Diagrams Library
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('GOOSE')}
                  className="group rounded-xl border border-[#1D4366] hover:border-[#00CFFF] bg-[#09213A] hover:bg-[#0E2E4F] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#061629] border border-[#00CFFF]/40 flex items-center justify-center text-[#00E5FF]">
                    <Sliders className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#E4F1FF] leading-tight">
                    Simulation Lab
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('SIGNALS')}
                  className="group rounded-xl border border-[#1D4366] hover:border-[#00CFFF] bg-[#09213A] hover:bg-[#0E2E4F] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#061629] border border-[#00CFFF]/40 flex items-center justify-center text-[#00E5FF]">
                    <GitBranch className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#E4F1FF] leading-tight">
                    Signal Mapping
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveTab('FATSAT')}
                  className="group rounded-xl border border-[#1D4366] hover:border-[#22C55E] bg-[#09213A] hover:bg-[#0E2E4F] p-2.5 text-center flex flex-col items-center justify-center gap-1.5 transition"
                >
                  <div className="w-9 h-9 rounded-lg bg-[#061629] border border-[#22C55E]/45 flex items-center justify-center text-[#4ADE80]">
                    <CheckSquare className="w-4 h-4" />
                  </div>
                  <span className="text-[11px] font-bold text-[#E4F1FF] leading-tight">
                    FAT / SAT Checklist
                  </span>
                </button>
              </div>
            </div>

            {/* Continue Learning Quick-Resume Card (Matching Reference Image 4 Top-Left) */}
            <div className="rounded-2xl border border-[#1E4466] bg-gradient-to-br from-[#09213A] to-[#07182B] p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="text-xs font-extrabold uppercase tracking-wider text-[#8CC2E8]">
                Continue Learning
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#00E5FF]">
                    Module {nextModule.num}: {nextModule.title}
                  </div>
                  <div className="text-xs text-[#DCEAF5] truncate mt-0.5">
                    Ch {String(nextIncompleteChapter.number).padStart(2, '0')} —{' '}
                    {nextIncompleteChapter.title}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedChapterId(nextIncompleteChapter.id);
                    openModule(nextModule.id, 'LESSON', 0);
                  }}
                  className="shrink-0 inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-[#00D9FF] to-[#0098FF] px-3 py-1.5 text-xs font-black text-[#031222] shadow-[0_0_14px_rgba(0,217,255,0.35)] hover:brightness-110 transition"
                >
                  <span>Resume</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Your Progress Card (Matching Reference Image 1) */}
            <div className="rounded-2xl border border-[#1E4466] bg-[#07182B]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-2 mb-2.5">
                <Target className="w-4 h-4 text-[#00E5FF]" />
                <h2 className="text-sm font-extrabold text-white tracking-tight">Your Progress</h2>
              </div>

              <div className="w-full h-3 rounded-full bg-[#04101E] border border-[#1B3D5D] overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#00CFFF] via-[#00E5FF] to-[#38BDF8] shadow-[0_0_12px_#00CFFF] transition-all duration-300"
                  style={{ width: `${Math.max(4, progressPct)}%` }}
                />
              </div>

              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="font-black text-white">
                  {progressPct}%{' '}
                  <span className="font-semibold text-[#8FB6D6]">
                    ({completedCount} / {totalChaptersCount} Chapters)
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => openModule('MOD-01', 'LESSON', 0)}
                  className="text-[11px] font-bold text-[#00E5FF] hover:underline"
                >
                  Start Module 01 →
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Relay Datasheet Quick Modal when clicking any of the 4 relays */}
        {activeRelayVendor && (
          <div
            role="dialog"
            aria-modal="true"
            onClick={() => setActiveRelayVendor(null)}
            className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="max-w-lg w-full rounded-2xl border border-[#00CFFF]/60 bg-[#07182C] p-5 shadow-2xl space-y-3"
            >
              <div className="flex items-center justify-between border-b border-[#1A3C5B] pb-3">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-widest text-[#00E5FF]">
                    Numerical Protection & Bay Controller IED
                  </span>
                  <h3 className="text-lg font-black text-white">
                    {activeRelayVendor.name} {activeRelayVendor.model} ({activeRelayVendor.iedCode})
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveRelayVendor(null)}
                  className="rounded-lg border border-[#254B6E] px-2.5 py-1 text-xs font-bold text-[#9CC4E4] hover:text-white"
                >
                  Close
                </button>
              </div>
              <div className="flex flex-col sm:flex-row items-center gap-4">
                <img
                  src={activeRelayVendor.img}
                  alt={activeRelayVendor.model}
                  className="w-32 h-32 object-contain rounded-xl bg-[#04101E] border border-[#1B3E5E] p-2 shrink-0"
                />
                <div className="space-y-2 text-xs text-[#C6DFEF]">
                  <p>{activeRelayVendor.description}</p>
                  <div className="rounded-lg bg-[#041120] border border-[#193B59] p-2">
                    <span className="font-bold text-[#00E5FF]">Supported Protocols: </span>
                    <span>{activeRelayVendor.protocols}</span>
                  </div>
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveRelayVendor(null);
                    setActiveTab('IED');
                  }}
                  className="rounded-xl bg-[#00CFFF] px-3.5 py-1.5 text-xs font-black text-[#031222]"
                >
                  Inspect in IED Explorer →
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER VIEW 2: MODULE WORKSPACE (Reference Image 2 for MOD-01 & Image 4 Bottom-Right for MOD-02..06)
  // ============================================================================
  const currentLessonIdx = activeModule.lessons.findIndex((l) => l.id === activeLesson.id);
  const prevLesson = currentLessonIdx > 0 ? activeModule.lessons[currentLessonIdx - 1] : null;
  const nextLesson =
    currentLessonIdx < activeModule.lessons.length - 1
      ? activeModule.lessons[currentLessonIdx + 1]
      : null;
  const currentModuleIdx = ACADEMY_MODULES.findIndex((m) => m.id === activeModule.id);
  const nextModuleObj =
    currentModuleIdx < ACADEMY_MODULES.length - 1
      ? ACADEMY_MODULES[currentModuleIdx + 1]
      : ACADEMY_MODULES[0];
  const isCurrentChapterCompleted = completedChapterIds.includes(selectedChapter.id);

  return (
    <div className="space-y-3.5 text-[#E4F1FF]">
      {/* TOP MODULE HEADER BANNER (Matching Reference Image 2 `image_d8f73f.jpg` & Image 4 Bottom-Right) */}
      <section className="relative overflow-hidden rounded-2xl border border-[#00CFFF]/45 bg-gradient-to-r from-[#06182C] via-[#09233F] to-[#081C34] px-4 py-3.5 shadow-[0_8px_28px_rgba(0,0,0,0.55)]">
        {/* Right-side Twilight Transmission Lines & Substation Banner Image */}
        <img
          src="assets/academy/module01-banner.jpg"
          alt=""
          aria-hidden="true"
          className="pointer-events-none select-none hidden md:block absolute right-0 top-0 h-full w-[52%] object-cover opacity-75"
          style={{
            maskImage: 'linear-gradient(to right, transparent 0%, black 38%, black 100%)',
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 38%, black 100%)',
          }}
        />

        <div className="relative z-10 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-1 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setViewMode('OVERVIEW')}
                className="inline-flex items-center gap-1 rounded-lg border border-[#244D70] bg-[#061729]/90 hover:border-[#00CFFF] px-2.5 py-1 text-[11px] font-bold text-[#B8D7F0] hover:text-white transition"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-[#00CFFF]" />
                <span>Overview</span>
              </button>

              <span className="inline-flex items-center rounded-md bg-[#00CFFF] px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-[#031324] shadow-[0_0_12px_rgba(0,207,255,0.45)]">
                MODULE {activeModule.num}
              </span>

              {/* Quick Module Switcher Pills (01..06) */}
              <div className="hidden sm:flex items-center gap-1 ml-1">
                {ACADEMY_MODULES.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => openModule(m.id, activeSubTab, 0)}
                    className={`px-2 py-0.5 rounded text-[10.5px] font-extrabold transition ${
                      m.id === activeModule.id
                        ? 'bg-[#00CFFF]/25 border border-[#00CFFF] text-[#00E5FF]'
                        : 'bg-[#061729]/80 border border-[#1B3C59] text-[#84ACC8] hover:text-white'
                    }`}
                  >
                    M{m.num}
                  </button>
                ))}
              </div>
            </div>

            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white drop-shadow">
              {activeModule.title}
            </h1>
            <p className="text-xs sm:text-[12.5px] text-[#A8CBE8] font-medium">
              {activeModule.bannerTags}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleToggleChapterComplete(selectedChapter.id)}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-extrabold transition shadow-md ${
                isCurrentChapterCompleted
                  ? 'border-[#22C55E] bg-[#133829]/90 text-[#4ADE80]'
                  : 'border-[#00CFFF]/70 bg-[#08223C]/90 hover:bg-[#0D3156] text-[#E4F1FF]'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-[#4ADE80]" />
              <span>{isCurrentChapterCompleted ? 'Completed' : 'Mark Complete'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* 6 HORIZONTAL NAVIGATION TABS (Matching Reference Image 2: Lesson | Diagrams | Examples | Practice Quiz | Key Notes | Downloads) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-[#1B3E5E] bg-[#061628]/95 p-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          {(
            [
              { id: 'LESSON', label: 'Lesson' },
              { id: 'DIAGRAMS', label: 'Diagrams' },
              { id: 'EXAMPLES', label: 'Examples' },
              { id: 'QUIZ', label: 'Practice Quiz' },
              { id: 'NOTES', label: 'Key Notes' },
              { id: 'DOWNLOADS', label: 'Downloads' },
            ] as { id: SubTabId; label: string }[]
          ).map((tab) => {
            const active = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveSubTab(tab.id)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-extrabold transition ${
                  active
                    ? 'bg-[#00CFFF] text-[#031222] shadow-[0_0_14px_rgba(0,207,255,0.45)]'
                    : 'bg-[#091F38] text-[#A8C6DF] hover:text-white hover:bg-[#0F2C4C] border border-[#1B3E5E]'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Chapter selector inside active module */}
        <div className="flex items-center gap-2 pr-1">
          <span className="text-[11px] text-[#88B0CE] hidden md:inline">Deep-Dive Chapter:</span>
          <select
            value={selectedChapter.id}
            onChange={(e) => setSelectedChapterId(e.target.value)}
            className="rounded-lg border border-[#224A6D] bg-[#081C33] px-2.5 py-1 text-xs font-bold text-[#00E5FF] focus:outline-none"
          >
            {IEC61850_ACADEMY_CHAPTERS.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#061525] text-white">
                Ch {String(c.number).padStart(2, '0')}: {c.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ========================================================================
          TAB 1: LESSON VIEW
          - Module 01 renders the exact 2-column layout from Reference Image 2 (`image_d8f73f.jpg`)
          - Modules 02–06 render the 3-panel layout from Reference Image 4 Bottom-Right (`image_d8f347.jpg`)
         ======================================================================== */}
      {activeSubTab === 'LESSON' && activeModule.id === 'MOD-01' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
          {/* LEFT MAIN COLUMN (~68% -> 8 cols): Expandable Lesson Cards 1.1, 1.2, 1.3..1.6 + Full Chapter Reference */}
          <div className="lg:col-span-8 space-y-3.5">
            {/* LESSON 1.1 CARD: Electrical Power System Overview (Matching Reference Image 2 top card) */}
            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                onClick={() =>
                  setExpandedLessons((prev) => ({ ...prev, 'L-1.1': !prev['L-1.1'] }))
                }
                className="w-full px-4 py-3 flex items-center justify-between gap-2 bg-gradient-to-r from-[#0B2542] to-[#081B31] border-b border-[#1B3E5E] text-left"
              >
                <span className="text-sm sm:text-[15px] font-extrabold text-white">
                  1.1 Electrical Power System Overview
                </span>
                {expandedLessons['L-1.1'] ? (
                  <ChevronUp className="w-4 h-4 text-[#00CFFF]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8AB4D4]" />
                )}
              </button>

              {expandedLessons['L-1.1'] && (
                <div className="p-4 space-y-3">
                  <p className="text-xs sm:text-[12.5px] leading-relaxed text-[#C4DDF2]">
                    An electrical power system consists of{' '}
                    <strong className="text-white">
                      Generation, Transmission, Substation, Distribution and Consumers
                    </strong>
                    . It delivers reliable, high-quality power from power plants to end users through
                    substations at different voltage levels.
                  </p>

                  {/* 5-Stage Power System Flow Visual from Reference Image 2 */}
                  <div className="rounded-xl border border-[#1E466A] bg-[#041120] p-2.5 overflow-hidden">
                    <img
                      src="assets/academy/power-system-5stage.jpg"
                      width={1596}
                      height={300}
                      decoding="async"
                      alt="Generation (11-25 kV) -> Transmission (132/220/400 kV) -> Substation (132/33/11 kV) -> Distribution (11/0.415 kV) -> Consumers (415/230 V)"
                      className="sas-crisp-cover w-full h-auto rounded-lg object-contain"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* LESSON 1.2 CARD: Typical Substation – 132/33/11 kV (Matching Reference Image 2 bottom card) */}
            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <button
                type="button"
                onClick={() =>
                  setExpandedLessons((prev) => ({ ...prev, 'L-1.2': !prev['L-1.2'] }))
                }
                className="w-full px-4 py-3 flex items-center justify-between gap-2 bg-gradient-to-r from-[#0B2542] to-[#081B31] border-b border-[#1B3E5E] text-left"
              >
                <span className="text-sm sm:text-[15px] font-extrabold text-white">
                  1.2 Typical Substation – 132/33/11 kV
                </span>
                {expandedLessons['L-1.2'] ? (
                  <ChevronUp className="w-4 h-4 text-[#00CFFF]" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-[#8AB4D4]" />
                )}
              </button>

              {expandedLessons['L-1.2'] && (
                <div className="p-4 space-y-3">
                  <p className="text-xs sm:text-[12.5px] leading-relaxed text-[#C4DDF2]">
                    A substation transforms voltage from high to lower levels and provides switching,
                    protection and control of the power network.
                  </p>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-stretch">
                    {/* Left (7 cols): Annotated 132/33/11 kV Switchyard Image */}
                    <div className="md:col-span-7 rounded-xl border border-[#1E466A] bg-[#041120] overflow-hidden flex items-center justify-center p-1.5">
                      <img
                        src="assets/academy/substation-yard-132kv.jpg"
                        width={1040}
                        height={470}
                        decoding="async"
                        alt="Annotated 132/33/11 kV Substation Yard showing 132 kV Bay, 132/33 kV Transformer, 33 kV Switchgear, and Control Room (SAS / SCADA)"
                        className="sas-crisp-cover w-full h-auto max-h-[235px] object-contain rounded-lg"
                      />
                    </div>

                    {/* Right (5 cols): Main Substation Equipment Checklist */}
                    <div className="md:col-span-5 rounded-xl border border-[#1E466A] bg-[#061527] p-3.5 flex flex-col justify-center">
                      <h3 className="text-xs sm:text-[13px] font-extrabold text-white mb-2.5">
                        Main Substation Equipment
                      </h3>
                      <ul className="space-y-2 text-xs text-[#D6E9FA]">
                        {[
                          'Power Transformer (132/33 kV)',
                          'Circuit Breakers (CB)',
                          'Isolators / Disconnectors',
                          'Current & Voltage Transformers (CT / PT)',
                          'Protection & Control IEDs',
                          'Substation Automation System (SAS)',
                        ].map((eq) => (
                          <li key={eq} className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                            <span className="font-medium leading-snug">{eq}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* LESSONS 1.3 TO 1.6 EXPANDABLE CARDS */}
            {activeModule.lessons.slice(2).map((lesson) => {
              const isOpen = !!expandedLessons[lesson.id];
              return (
                <div
                  key={lesson.id}
                  className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 overflow-hidden shadow-[0_6px_24px_rgba(0,0,0,0.45)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLessons((prev) => ({ ...prev, [lesson.id]: !prev[lesson.id] }))
                    }
                    className="w-full px-4 py-3 flex items-center justify-between gap-2 bg-gradient-to-r from-[#0B2542] to-[#081B31] border-b border-[#1B3E5E] text-left"
                  >
                    <span className="text-sm sm:text-[15px] font-extrabold text-white">
                      {lesson.code} {lesson.title}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-[#8AB4D4]">{lesson.duration}</span>
                      {isOpen ? (
                        <ChevronUp className="w-4 h-4 text-[#00CFFF]" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-[#8AB4D4]" />
                      )}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="p-4 space-y-3 text-xs sm:text-[12.5px] text-[#C4DDF2]">
                      <p className="leading-relaxed">{lesson.summary}</p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {lesson.takeaways.map((tk) => (
                          <div
                            key={tk}
                            className="rounded-lg border border-[#1B3E5E] bg-[#051323] p-2.5 flex items-start gap-2"
                          >
                            <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                            <span>{tk}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* FULL CHAPTER TECHNICAL REFERENCE (Preserving 100% of IEC61850_ACADEMY_CHAPTERS content) */}
            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1B3E5E] pb-3">
                <div>
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#00E5FF]">
                    Complete Engineering Reference • Chapter {selectedChapter.number} of 30
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    {selectedChapter.title}
                  </h3>
                  {bilingualTeluguEnabled && (
                    <p className="text-xs text-[#7BEAFF] mt-0.5">{selectedChapter.titleTe}</p>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  {moduleChapters.map((mc) => (
                    <button
                      key={mc.id}
                      type="button"
                      onClick={() => setSelectedChapterId(mc.id)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                        mc.id === selectedChapter.id
                          ? 'bg-[#00CFFF] text-[#031222]'
                          : 'bg-[#09213A] text-[#9CC4E4] hover:text-white border border-[#1F476B]'
                      }`}
                    >
                      Ch {String(mc.number).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>

              <IecEquipmentDiagram number={ENGINEERING_DIAGRAM_LIBRARY.find(d => d.id === selectedChapter.diagramId)?.number ?? 1} compact />

              {selectedChapter.sections.map((sec, idx) => (
                <div key={idx} className="space-y-2 border-b border-[#15324E] last:border-b-0 pb-3 last:pb-0">
                  <h4 className="text-xs sm:text-sm font-extrabold text-[#00E5FF]">{sec.heading}</h4>
                  {sec.paragraphs.map((p, pIdx) => (
                    <p key={pIdx} className="text-xs leading-relaxed text-[#C8E0F4]">
                      {p}
                    </p>
                  ))}
                  {sec.bullets && (
                    <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pt-1">
                      {sec.bullets.map((b, bIdx) => (
                        <li
                          key={bIdx}
                          className="rounded-lg bg-[#051322] border border-[#173654] px-2.5 py-1.5 text-[11.5px] text-[#DCEAF5] flex items-start gap-2"
                        >
                          <span className="text-[#00E5FF] font-bold">•</span>
                          <span>{b}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {sec.table && (
                    <div className="overflow-x-auto rounded-xl border border-[#1B3E5E] mt-2">
                      <table className="w-full text-left text-[11.5px]">
                        <thead className="bg-[#0A233D] text-[#00E5FF]">
                          <tr>
                            {sec.table.headers.map((h, hIdx) => (
                              <th key={hIdx} className="px-3 py-2 font-extrabold border-b border-[#1B3E5E]">
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#15314B] bg-[#051322]">
                          {sec.table.rows.map((row, rIdx) => (
                            <tr key={rIdx}>
                              {row.map((cell, cIdx) => (
                                <td key={cIdx} className="px-3 py-1.5 text-[#D2E6F7]">
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {sec.diagramAscii && (
                    <div className="space-y-2">
                      <IecEquipmentDiagram number={ENGINEERING_DIAGRAM_LIBRARY.find(d => d.id === selectedChapter.diagramId)?.number ?? 1} compact />
                      <details className="text-xs text-[#9CC4E4]"><summary className="cursor-pointer">Original technical schematic (text)</summary><pre className="rounded-xl border border-[#1B3E5E] bg-[#030C18] p-3 font-mono text-[11px] text-[#7BEAFF] overflow-x-auto">
                      {sec.diagramAscii}
                    </pre></details>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* RIGHT STICKY SIDEBAR (~32% -> 4 cols): Module Content (6 Lessons) + Key Takeaways + Next Lesson CTA */}
          <div className="lg:col-span-4 space-y-3.5 lg:sticky lg:top-16">
            {/* Card 1: Module Content (6 Lessons) */}
            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-2 mb-3">
                <BookOpen className="w-4 h-4 text-[#00E5FF]" />
                <h2 className="text-sm font-extrabold text-white">
                  Module Content ({activeModule.lessons.length} Lessons)
                </h2>
              </div>

              <div className="space-y-1.5">
                {activeModule.lessons.map((lesson) => {
                  const isSelected = lesson.id === activeLesson.id;
                  return (
                    <button
                      key={lesson.id}
                      type="button"
                      onClick={() => handleSelectLesson(lesson.id)}
                      className={`w-full rounded-xl px-3 py-2 text-left flex items-center justify-between gap-2 border transition ${
                        isSelected
                          ? 'bg-gradient-to-r from-[#0D3B5E] to-[#092844] border-[#00CFFF] text-white shadow-[0_0_12px_rgba(0,207,255,0.25)]'
                          : 'bg-[#051425] border-[#173654] text-[#A9C7DF] hover:text-white hover:border-[#00CFFF]/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            isSelected
                              ? 'bg-[#00CFFF] text-[#031222]'
                              : 'bg-[#0B233D] text-[#7FA6C4] border border-[#22496B]'
                          }`}
                        >
                          {isSelected ? <Play className="w-2.5 h-2.5 fill-current" /> : '•'}
                        </span>
                        <span className="text-xs font-bold truncate">
                          {lesson.code} {lesson.title}
                        </span>
                      </div>
                      <span className="text-[10.5px] font-mono text-[#7FA6C4] shrink-0">
                        {lesson.duration}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Key Takeaways (Matching Reference Image 2 right panel) */}
            <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="flex items-center gap-2 mb-3">
                <Lightbulb className="w-4 h-4 text-[#FFB838]" />
                <h2 className="text-sm font-extrabold text-white">Key Takeaways</h2>
              </div>

              <ul className="space-y-2.5 text-xs text-[#D6E9FA]">
                {activeLesson.takeaways.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                    <span className="leading-snug">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Bottom Gradient CTA Button: Next Lesson: IEC 61850 System & Data Model -> */}
            <button
              type="button"
              onClick={() => openModule(nextModuleObj.id, 'LESSON', 0)}
              className="w-full rounded-2xl bg-gradient-to-r from-[#00D2FF] via-[#2A8BFF] to-[#8C4BFF] hover:brightness-110 p-3.5 text-left flex items-center justify-between gap-2 shadow-[0_8px_24px_rgba(0,195,255,0.35)] transition"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="w-7 h-7 rounded-lg bg-white/15 flex items-center justify-center text-white shrink-0">
                  <Play className="w-3.5 h-3.5 fill-current" />
                </span>
                <div className="min-w-0">
                  <div className="text-[10px] font-extrabold uppercase tracking-wider text-white/85">
                    Next Module
                  </div>
                  <div className="text-xs sm:text-[13px] font-black text-white truncate">
                    Next Lesson: {nextModuleObj.title}
                  </div>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-white shrink-0" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 1B: MODULES 02–06 3-PANEL LESSON WORKSPACE
          (Matching Reference Image 4 Bottom-Right `image_d8f347.jpg`)
         ======================================================================== */}
      {activeSubTab === 'LESSON' && activeModule.id !== 'MOD-01' && (
        <div className="space-y-3.5">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-stretch">
            {/* LEFT PANEL (3 cols): Chapter Content (e.g., 2.1 to 2.7) */}
            <div className="lg:col-span-3 rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-3.5 flex flex-col justify-between shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div>
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-[#90B8D8] mb-2.5 px-1">
                  Chapter Content
                </h2>
                <div className="space-y-1.5">
                  {activeModule.lessons.map((lesson) => {
                    const active = lesson.id === activeLesson.id;
                    return (
                      <button
                        key={lesson.id}
                        type="button"
                        onClick={() => handleSelectLesson(lesson.id)}
                        className={`w-full rounded-xl px-3 py-2 text-left text-xs font-bold flex items-center justify-between gap-2 border transition ${
                          active
                            ? 'bg-gradient-to-r from-[#0E3F63] to-[#092842] border-[#00CFFF] text-white shadow-[0_0_12px_rgba(0,207,255,0.28)]'
                            : 'bg-[#051323] border-[#163450] text-[#A4C3DC] hover:text-white hover:border-[#00CFFF]/40'
                        }`}
                      >
                        <span className="truncate">
                          {lesson.code} {lesson.title}
                        </span>
                        {active && <ChevronRight className="w-3.5 h-3.5 text-[#00E5FF] shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#173654]">
                <div className="text-[10.5px] font-bold text-[#88B0CE] mb-1.5">
                  Chapters in Module {activeModule.num}
                </div>
                <div className="flex flex-wrap gap-1">
                  {moduleChapters.map((mc) => (
                    <button
                      key={mc.id}
                      type="button"
                      onClick={() => setSelectedChapterId(mc.id)}
                      className={`px-2 py-1 rounded text-[10.5px] font-bold transition ${
                        mc.id === selectedChapter.id
                          ? 'bg-[#00CFFF] text-[#031222]'
                          : 'bg-[#051323] text-[#8AB4D4] border border-[#1B3E5E] hover:text-white'
                      }`}
                    >
                      Ch {String(mc.number).padStart(2, '0')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* CENTER PANEL (6 cols): Selected Lesson Explanation + Interactive Architecture Diagram + Chapter Content */}
            <div className="lg:col-span-6 rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-4 shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="border-b border-[#1A3C5B] pb-2.5 flex items-center justify-between gap-2">
                <h2 className="text-base sm:text-lg font-black text-white">
                  {activeLesson.code} {activeLesson.title}
                </h2>
                <span className="rounded-md bg-[#051425] border border-[#1E4466] px-2 py-0.5 font-mono text-[10.5px] text-[#00E5FF]">
                  {activeLesson.duration}
                </span>
              </div>

              <p className="text-xs sm:text-[13px] leading-relaxed text-[#CAE2F7]">
                {activeLesson.summary}
              </p>

              <IecEquipmentDiagram number={ENGINEERING_DIAGRAM_LIBRARY.find(d => d.id === selectedChapter.diagramId)?.number ?? 1} compact />

              {/* Underlying Chapter Detailed Engineering Sections */}
              <div className="pt-2 border-t border-[#173654] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#00E5FF]">
                    Chapter {selectedChapter.number}: {selectedChapter.title}
                  </span>
                </div>
                {selectedChapter.sections.map((sec, idx) => (
                  <div key={idx} className="rounded-xl border border-[#163450] bg-[#051323] p-3 space-y-2">
                    <h3 className="text-xs font-extrabold text-white">{sec.heading}</h3>
                    {sec.paragraphs.map((p, pIdx) => (
                      <p key={pIdx} className="text-xs leading-relaxed text-[#C2DCF2]">
                        {p}
                      </p>
                    ))}
                    {sec.bullets && (
                      <ul className="space-y-1 pt-1">
                        {sec.bullets.map((b, bIdx) => (
                          <li key={bIdx} className="text-[11.5px] text-[#DCEAF5] flex items-start gap-2">
                            <span className="text-[#00E5FF] font-bold">•</span>
                            <span>{b}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {sec.diagramAscii && (
                      <div className="space-y-2">
                      <IecEquipmentDiagram number={ENGINEERING_DIAGRAM_LIBRARY.find(d => d.id === selectedChapter.diagramId)?.number ?? 1} compact />
                      <details className="text-xs text-[#9CC4E4]"><summary className="cursor-pointer">Original technical schematic (text)</summary><pre className="rounded-lg border border-[#1B3E5E] bg-[#030B16] p-2.5 font-mono text-[10.5px] text-[#7BEAFF] overflow-x-auto">
                        {sec.diagramAscii}
                      </pre></details>
                    </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT PANEL (3 cols): Key Takeaways + Quick Interactive Tools */}
            <div className="lg:col-span-3 rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-3.5 flex flex-col justify-between shadow-[0_6px_24px_rgba(0,0,0,0.45)]">
              <div className="space-y-3">
                <h2 className="text-xs font-extrabold uppercase tracking-wider text-white px-1">
                  Key Takeaways
                </h2>
                <ul className="space-y-2.5 text-xs text-[#D6E9FA]">
                  {activeLesson.takeaways.map((tk) => (
                    <li
                      key={tk}
                      className="rounded-xl border border-[#173654] bg-[#051323] p-2.5 flex items-start gap-2"
                    >
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                      <span className="leading-snug">{tk}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 pt-3 border-t border-[#173654] space-y-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('DIAGRAMS')}
                  className="w-full rounded-xl border border-[#00CFFF]/60 bg-[#08223C] hover:bg-[#0D2E4F] px-3 py-2 text-xs font-extrabold text-[#00E5FF] flex items-center justify-between transition"
                >
                  <span>Open 24 SVG Diagrams</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('QUIZ')}
                  className="w-full rounded-xl border border-[#22C55E]/60 bg-[#0D2E24] hover:bg-[#134234] px-3 py-2 text-xs font-extrabold text-[#4ADE80] flex items-center justify-between transition"
                >
                  <span>Take Module {activeModule.num} Quiz</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* BOTTOM LESSON NAVIGATION BAR (Matching Reference Image 4 Bottom-Right: [< Previous] Lesson Title [Next >]) */}
          <div className="rounded-xl border border-[#1F476B] bg-[#061628] px-4 py-2.5 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={!prevLesson}
              onClick={() => prevLesson && handleSelectLesson(prevLesson.id)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-extrabold transition ${
                prevLesson
                  ? 'border-[#254E73] bg-[#09213A] text-white hover:border-[#00CFFF]'
                  : 'border-[#152F47] bg-[#04101E] text-[#4E6E87] cursor-not-allowed'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            <div className="text-xs font-bold text-[#B8D7F0] truncate">
              {activeLesson.code} {activeLesson.title}
            </div>

            <button
              type="button"
              onClick={() => {
                if (nextLesson) {
                  handleSelectLesson(nextLesson.id);
                } else {
                  openModule(nextModuleObj.id, 'LESSON', 0);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#00CFFF] hover:brightness-110 px-3.5 py-1.5 text-xs font-black text-[#031222] shadow-[0_0_12px_rgba(0,207,255,0.35)] transition"
            >
              <span>{nextLesson ? 'Next' : `Next: Module ${nextModuleObj.num}`}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 2: DIAGRAMS & INTERACTIVE DATA TREE / VLAN LAB
         ======================================================================== */}
      {activeSubTab === 'DIAGRAMS' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-base font-black text-white">
                  Interactive Engineering Diagrams Library (24 Equipment Views)
                </h2>
                <p className="text-xs text-[#9CC4E4]">
                  Explore realistic equipment, communication cables, protection circuits, and IEC 61850 architectures.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-[#7FA6C4] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={diagramSearch}
                    onChange={(e) => setDiagramSearch(e.target.value)}
                    placeholder="Search 24 diagrams..."
                    className="rounded-lg border border-[#224A6D] bg-[#041120] pl-8 pr-3 py-1.5 text-xs text-white focus:border-[#00CFFF] focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-1 rounded-lg border border-[#224A6D] bg-[#041120] p-1 text-xs">
                  {[75, 100, 125].map((z) => (
                    <button
                      key={z}
                      type="button"
                      onClick={() => setDiagramZoom(z)}
                      className={`px-2 py-0.5 rounded font-mono text-[10.5px] font-bold ${
                        diagramZoom === z ? 'bg-[#00CFFF] text-[#031222]' : 'text-[#9CC4E4]'
                      }`}
                    >
                      {z}%
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setDiagramFullscreen((f) => !f)}
                    className="px-2 py-0.5 text-[#00E5FF]"
                    title="Toggle Fullscreen"
                  >
                    {diagramFullscreen ? (
                      <Minimize2 className="w-3.5 h-3.5" />
                    ) : (
                      <Maximize2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-3.5 items-start">
              {/* Diagram Selector List (4 cols) */}
              <div className="lg:col-span-3 max-h-[760px] overflow-y-auto space-y-1.5 pr-1">
                {filteredDiagrams.length === 0 && <p className="p-3 text-sm text-[#9CC4E4]">No matching diagrams. Try a device or topic name.</p>}
                {filteredDiagrams.map((d) => {
                  const active = d.id === activeDiagram.id;
                  return (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setActiveDiagramId(d.id)}
                      aria-pressed={active}
                      data-diagram-number={d.number}
                      className={`w-full rounded-xl p-2.5 text-left border transition ${
                        active
                          ? 'bg-[#0C3354] border-[#00CFFF] text-white'
                          : 'bg-[#051323] border-[#173654] text-[#A8C6DF] hover:border-[#00CFFF]/40'
                      }`}
                    >
                      <div className="text-xs font-extrabold">{d.title}</div>
                      <div className="text-[10.5px] text-[#7FA6C4] truncate mt-0.5">{d.subtitle}</div>
                    </button>
                  );
                })}
              </div>

              {/* Active SVG Diagram Canvas (8 cols) */}
              <div
                className={`lg:col-span-9 min-w-0 rounded-xl border border-[#1E466A] bg-[#030C18] p-4 space-y-3 ${
                  diagramFullscreen ? 'fixed inset-4 z-50 overflow-auto' : ''
                }`}
              >
                <div className="flex items-center justify-between border-b border-[#173654] pb-2">
                  <div>
                    <h3 className="text-sm font-black text-white">{activeDiagram.title}</h3>
                    <p className="text-[11px] text-[#88B0CE]">{activeDiagram.subtitle}</p>
                  </div>
                  {diagramFullscreen && (
                    <button
                      type="button"
                      onClick={() => setDiagramFullscreen(false)}
                      className="rounded-lg bg-[#00CFFF] px-3 py-1 text-xs font-black text-[#031222]"
                    >
                      Exit Fullscreen
                    </button>
                  )}
                </div>

<IecEquipmentDiagram number={activeDiagram.number} zoom={diagramZoom} />

                <p className="text-xs text-[#C4DDF2] leading-relaxed">{activeDiagram.description}</p>
              </div>
            </div>
          </div>

          {/* Interactive IED Data Model Tree (LD / LN / DO / DA / FC) & VLAN Priority Explorer */}
          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <h3 className="text-sm font-black text-white">
              Interactive IEC 61850 Data Model Tree Explorer (LD0 → LN → DO → DA [FC])
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Column 1: Logical Nodes */}
              <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3 space-y-1.5">
                <div className="text-xs font-extrabold text-[#00E5FF] mb-2">1. Logical Nodes (LN)</div>
                {IEC61850_TREE_SIMULATOR.map((ln) => (
                  <button
                    key={ln.id}
                    type="button"
                    onClick={() => {
                      setSelectedLnId(ln.id);
                      setSelectedDoName(ln.dataObjects[0]?.name || '');
                    }}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-bold flex items-center justify-between ${
                      ln.id === selectedTreeLn.id
                        ? 'bg-[#00CFFF] text-[#031222]'
                        : 'bg-[#081C33] text-[#B8D7F0] hover:text-white'
                    }`}
                  >
                    <span>
                      {ln.lnName} ({ln.lnClass})
                    </span>
                    <span className="font-mono text-[10px] opacity-80">{ln.iecGroup}</span>
                  </button>
                ))}
              </div>

              {/* Column 2: Data Objects (DO) */}
              <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3 space-y-1.5">
                <div className="text-xs font-extrabold text-[#00E5FF] mb-2">
                  2. Data Objects (DO in {selectedTreeLn.lnName})
                </div>
                {selectedTreeLn.dataObjects.map((doItem) => (
                  <button
                    key={doItem.name}
                    type="button"
                    onClick={() => setSelectedDoName(doItem.name)}
                    className={`w-full rounded-lg px-2.5 py-1.5 text-left text-xs font-bold flex items-center justify-between ${
                      doItem.name === selectedTreeDo?.name
                        ? 'bg-[#00CFFF] text-[#031222]'
                        : 'bg-[#081C33] text-[#B8D7F0] hover:text-white'
                    }`}
                  >
                    <span>{doItem.name}</span>
                    <span className="font-mono text-[10px]">CDC: {doItem.cdc}</span>
                  </button>
                ))}
              </div>

              {/* Column 3: Data Attributes (DA) */}
              <div className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3 space-y-1.5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-[#00E5FF]">3. Data Attributes (DA)</span>
                  <select
                    value={fcFilter}
                    onChange={(e) => setFcFilter(e.target.value)}
                    className="rounded bg-[#081C33] border border-[#224A6D] px-1.5 py-0.5 text-[10px] font-mono text-white"
                  >
                    <option value="ALL">All FC</option>
                    <option value="ST">ST</option>
                    <option value="MX">MX</option>
                    <option value="CO">CO</option>
                    <option value="CF">CF</option>
                  </select>
                </div>
                {selectedTreeDo?.attributes
                  .filter((a) => fcFilter === 'ALL' || a.fc === fcFilter)
                  .map((attr) => (
                    <div
                      key={attr.name}
                      className="rounded-lg border border-[#193B5A] bg-[#081C33] p-2 text-xs space-y-0.5"
                    >
                      <div className="flex items-center justify-between font-mono font-bold text-white">
                        <span>{attr.name}</span>
                        <span className="rounded bg-[#00CFFF]/20 text-[#00E5FF] px-1.5 text-[10px]">
                          [{attr.fc}]
                        </span>
                      </div>
                      <div className="text-[10.5px] font-mono text-[#4ADE80]">
                        Value: {attr.sampleValue} ({attr.type})
                      </div>
                      <div className="text-[10.5px] text-[#9CC4E4]">{attr.description}</div>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 3: EXAMPLES (Real Field SCL XML, GOOSE/SV Hex & Object Reference Examples)
         ======================================================================== */}
      {activeSubTab === 'EXAMPLES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3.5">
          <div className="lg:col-span-2 min-w-0">
            <IecEquipmentDiagram number={ENGINEERING_DIAGRAM_LIBRARY.find(d => d.id === selectedChapter.diagramId)?.number ?? 1} compact />
          </div>
          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-2.5">
            <h3 className="text-sm font-black text-[#00E5FF]">
              Example 1: Complete IEC 61850 Object Reference & FCDA Binding
            </h3>
            <p className="text-xs text-[#C4DDF2]">
              Production 132kV Feeder Protection IED (`IED_132_L1`) publishing an overcurrent trip and breaker status via GOOSE DataSet:
            </p>
            <pre className="rounded-xl border border-[#1B3E5E] bg-[#030B16] p-3 font-mono text-[11px] text-[#7BEAFF] overflow-x-auto">{`<DataSet name="DS_GOOSE_TRIP" desc="Fast Protection Trip & Breaker Status">
  <FCDA ldInst="LD0" prefix="" lnClass="PTOC" lnInst="1" doName="Op" daName="general" fc="ST"/>
  <FCDA ldInst="LD0" prefix="" lnClass="PTOC" lnInst="1" doName="Op" daName="q" fc="ST"/>
  <FCDA ldInst="LD0" prefix="" lnClass="XCBR" lnInst="1" doName="Pos" daName="stVal" fc="ST"/>
  <FCDA ldInst="LD0" prefix="" lnClass="XCBR" lnInst="1" doName="Pos" daName="q" fc="ST"/>
</DataSet>
<GSEControl name="GCB_TRIP" appID="IED_132_L1_TRIP" datSet="DS_GOOSE_TRIP" confRev="100" type="GOOSE"/>`}</pre>
          </div>

          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-2.5">
            <h3 className="text-sm font-black text-[#00E5FF]">
              Example 2: IEEE 802.1Q VLAN & Multicast Addressing Table
            </h3>
            <p className="text-xs text-[#C4DDF2]">
              Standardized substation LAN traffic engineering across GOOSE, Sampled Values, PTP, and MMS:
            </p>
            <div className="overflow-x-auto rounded-xl border border-[#1B3E5E]">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-[#0A233D] text-[#00E5FF]">
                  <tr>
                    <th className="px-2.5 py-2">Service</th>
                    <th className="px-2.5 py-2">VLAN ID</th>
                    <th className="px-2.5 py-2">802.1p PCP</th>
                    <th className="px-2.5 py-2">Multicast MAC / Port</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#15314B] bg-[#051322] font-mono">
                  {VLAN_PRIORITY_ARCHITECTURES.map((v) => (
                    <tr key={v.vlanId}>
                      <td className="px-2.5 py-1.5 font-sans font-bold text-white">{v.trafficType}</td>
                      <td className="px-2.5 py-1.5 text-[#00E5FF]">VLAN {v.vlanId}</td>
                      <td className="px-2.5 py-1.5 text-[#4ADE80]">PCP {v.pcpPriority}</td>
                      <td className="px-2.5 py-1.5 text-[#C4DDF2]">{v.multicastRange}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 4: PRACTICE QUIZ
         ======================================================================== */}
      {activeSubTab === 'QUIZ' && (
        <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#1B3E5E] pb-3">
            <div>
              <h2 className="text-base font-black text-white">
                Module {activeModule.num} Practice Quiz — {activeModule.title}
              </h2>
              <p className="text-xs text-[#9CC4E4]">
                Select the best engineering answer for each question to verify your mastery.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setQuizAnswers({});
                setQuizSubmitted({});
              }}
              className="rounded-lg border border-[#244D70] bg-[#081C33] px-3 py-1.5 text-xs font-bold text-[#9CC4E4] hover:text-white"
            >
              Reset Quiz
            </button>
          </div>

          <div className="space-y-4">
            {activeModule.quiz.map((qItem, qIdx) => {
              const key = `${activeModule.id}-Q${qIdx}`;
              const selected = quizAnswers[key];
              const submitted = !!quizSubmitted[key];
              return (
                <div
                  key={key}
                  className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-4 space-y-3"
                >
                  <div className="text-xs sm:text-sm font-extrabold text-white">
                    Q{qIdx + 1}. {qItem.q}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {qItem.options.map((opt, oIdx) => {
                      const isPicked = selected === oIdx;
                      const isCorrect = qItem.answer === oIdx;
                      let cls =
                        'border-[#1C3F60] bg-[#081C33] text-[#D0E4F7] hover:border-[#00CFFF]';
                      if (submitted) {
                        if (isCorrect) {
                          cls = 'border-[#22C55E] bg-[#103326] text-[#4ADE80] font-extrabold';
                        } else if (isPicked && !isCorrect) {
                          cls = 'border-[#FF5C65] bg-[#3A121B] text-[#FDA4AF]';
                        }
                      } else if (isPicked) {
                        cls = 'border-[#00CFFF] bg-[#0C3152] text-white font-bold';
                      }
                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => {
                            setQuizAnswers((p) => ({ ...p, [key]: oIdx }));
                            setQuizSubmitted((p) => ({ ...p, [key]: true }));
                          }}
                          className={`rounded-xl border p-2.5 text-left text-xs transition ${cls}`}
                        >
                          {opt}
                        </button>
                      );
                    })}
                  </div>
                  {submitted && (
                    <div className="rounded-lg border border-[#00CFFF]/40 bg-[#071D34] p-2.5 text-xs text-[#BCE0FA]">
                      <strong className="text-[#00E5FF]">Explanation: </strong>
                      {qItem.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 5: KEY NOTES & LOGICAL NODE DICTIONARY
         ======================================================================== */}
      {activeSubTab === 'NOTES' && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <h2 className="text-base font-black text-white">
              Key Engineering Notes — {selectedChapter.title}
            </h2>
            <p className="text-xs text-[#C4DDF2]">{selectedChapter.summary}</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {selectedChapter.keyTakeaways.map((tk) => (
                <div
                  key={tk}
                  className="rounded-xl border border-[#1B3E5E] bg-[#051323] p-3 flex items-start gap-2.5 text-xs text-[#E4F1FF]"
                >
                  <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0 mt-0.5" />
                  <span>{tk}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-black text-[#00E5FF]">
                IEC 61850-7-4 Logical Node & ANSI Device Cross-Reference Dictionary
              </h3>
              <input
                type="text"
                value={lnDictSearch}
                onChange={(e) => setLnDictSearch(e.target.value)}
                placeholder="Filter LN (e.g. PTOC, XCBR, 87)..."
                className="rounded-lg border border-[#224A6D] bg-[#041120] px-3 py-1 text-xs text-white"
              />
            </div>
            <div className="overflow-x-auto rounded-xl border border-[#1B3E5E]">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#0A233D] text-[#00E5FF]">
                  <tr>
                    <th className="px-3 py-2">LN Class</th>
                    <th className="px-3 py-2">ANSI Code</th>
                    <th className="px-3 py-2">Function Name</th>
                    <th className="px-3 py-2">Mandatory Data Objects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#15314B] bg-[#051322]">
                  {filteredDictionary.map((item) => (
                    <tr key={item.lnClass}>
                      <td className="px-3 py-2 font-mono font-black text-[#00E5FF]">{item.lnClass}</td>
                      <td className="px-3 py-2 font-mono text-[#4ADE80]">{item.ansiDevice}</td>
                      <td className="px-3 py-2 font-bold text-white">{item.name}</td>
                      <td className="px-3 py-2 font-mono text-[11px] text-[#B8D7F0]">
                        {item.keyDataObjects.join(', ')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================
          TAB 6: DOWNLOADS
         ======================================================================== */}
      {activeSubTab === 'DOWNLOADS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#00E5FF]">
                Chapter Study Pack
              </span>
              <h3 className="text-base font-black text-white">
                Download Chapter {selectedChapter.number}: {selectedChapter.title}
              </h3>
              <p className="text-xs text-[#9CC4E4]">
                Includes complete technical explanations, ASCII architecture diagrams, key takeaways, and bilingual notes.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadNotes('CHAPTER')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#00CFFF] px-4 py-2.5 text-xs font-black text-[#031222] hover:brightness-110 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download Chapter {selectedChapter.number} Notes (.TXT)</span>
            </button>
          </div>

          <div className="rounded-2xl border border-[#1F476B] bg-[#07192E]/95 p-5 flex flex-col justify-between gap-4">
            <div className="space-y-1.5">
              <span className="text-[10.5px] font-mono uppercase tracking-wider text-[#4ADE80]">
                Complete 30-Chapter Master Handbook
              </span>
              <h3 className="text-base font-black text-white">
                Download Full IEC 61850 Digital Substation Engineering Handbook
              </h3>
              <p className="text-xs text-[#9CC4E4]">
                Complete offline reference covering all 30 chapters (Fundamentals, Data Model, SCL, MMS/GOOSE/SV, PRP/HSR/PTP, and FAT/SAT).
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleDownloadNotes('ALL')}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#22C55E] to-[#10B981] px-4 py-2.5 text-xs font-black text-[#031222] hover:brightness-110 transition"
            >
              <Download className="w-4 h-4" />
              <span>Download All 30 Chapters Handbook (.TXT)</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
