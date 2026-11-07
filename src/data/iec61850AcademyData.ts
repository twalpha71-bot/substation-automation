import { ActiveWorkspaceTab } from '../simulation/useSubstationStore';
import { iedImages } from './iedImageRegistry';

export interface AcademyDiagramHotspot {
  id: string;
  label: string;
  sublabel: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  descriptionEn: string;
  descriptionTe: string;
  iecSymbol?: string;
  linkedBayId?: string;
  linkedTab?: ActiveWorkspaceTab;
}

export interface AcademyDiagramSpec {
  id: string;
  number: number;
  titleEn: string;
  titleTe: string;
  category: 'Power & Drawings' | 'SAS Architecture' | 'Network & Redundancy' | 'IEC 61850 & Protocols' | 'SCADA & Testing';
  isIllustrativeTrainingExample: boolean;
  summaryEn: string;
  summaryTe: string;
  guidedStepsEn: string[];
  guidedStepsTe: string[];
  hotspots: AcademyDiagramHotspot[];
  connections: { from: string; to: string; label: string; color: string; dashed?: boolean }[];
  title?: string;
  subtitle?: string;
  description?: string;
  svgMarkup?: string;
}

export interface AcademyQuizItem {
  id: string;
  questionEn: string;
  questionTe: string;
  options: string[];
  correctIndex: number;
  explanationEn: string;
  explanationTe: string;
}

export interface AcademyTroubleshootingRow {
  symptomEn: string;
  symptomTe: string;
  causeEn: string;
  causeTe: string;
  diagnosticCheckEn: string;
  diagnosticCheckTe: string;
  correctiveActionEn: string;
  correctiveActionTe: string;
  validationEn: string;
  validationTe: string;
}

export interface AcademyChapterSection {
  headingEn: string;
  headingTe: string;
  bodyEn: string[];
  bodyTe: string[];
  keyTakeawaysEn: string[];
  keyTakeawaysTe: string[];
  codeOrXmlSnippet?: { title: string; content: string };
  heading?: string;
  paragraphs?: string[];
  bullets?: string[];
  diagramAscii?: any;
  table?: { headers: string[]; rows: string[][] };
}

export interface AcademyChapter {
  id: string;
  chapterNumber: number;
  levelNumber: 1 | 2 | 3 | 4 | 5 | 6;
  levelTitleEn: string;
  levelTitleTe: string;
  titleEn: string;
  titleTe: string;
  subtitleEn: string;
  subtitleTe: string;
  estimatedMinutes: number;
  diagramId: string;
  equipmentImageUrl: string;
  equipmentCaption: string;
  relatedTab: ActiveWorkspaceTab;
  relatedTabLabel: string;
  sections: AcademyChapterSection[];
  workedExample: {
    titleEn: string;
    titleTe: string;
    stepsEn: string[];
    stepsTe: string[];
    engineeringDataUsed: string[];
  };
  commonMistakesEn: string[];
  commonMistakesTe: string[];
  troubleshooting: AcademyTroubleshootingRow[];
  fatSatRelevanceEn: string[];
  fatSatRelevanceTe: string[];
  interviewPreview: {
    q: string;
    aEn: string;
    aTe: string;
  }[];
  practicalExercise: {
    titleEn: string;
    titleTe: string;
    objectiveEn: string;
    objectiveTe: string;
    tasksEn: string[];
    tasksTe: string[];
    expectedOutcomeEn: string;
    expectedOutcomeTe: string;
  };
  quiz: AcademyQuizItem[];
  number?: number;
  title?: string;
  summary?: string;
  keyTakeaways?: string[];
}

export interface AcademyGlossaryTerm {
  term: string;
  category: string;
  definitionEn: string;
  definitionTe: string;
  exampleRef: string;
}

export const ACADEMY_LEVELS = [
  {
    level: 1 as const,
    titleEn: '1. Electrical & Substation Fundamentals',
    titleTe: '1. ఎలక్ట్రికల్ & సబ్‌స్టేషన్ ప్రాథమిక అంశాలు (Electrical & Substation Fundamentals)',
    chaptersRange: 'Chapters 1–5',
    summaryEn: 'Power system generation-to-consumer flow, AIS/GIS substations, complete 132/33/11 kV power path, SLD/GA engineering drawings, and primary/secondary equipment.',
    summaryTe: 'విద్యుత్ ఉత్పత్తి నుండి వినియోగదారుల వరకు పవర్ ప్రవాహం, AIS/GIS సబ్‌స్టేషన్లు, 132/33/11 kV పవర్ పాత్, SLD/GA ఇంజనీరింగ్ డ్రాయింగ్‌లు మరియు ప్రైమరీ/సెకండరీ పరికరాలు.',
  },
  {
    level: 2 as const,
    titleEn: '2. SAS Architecture & Networking',
    titleTe: '2. SAS ఆర్కిటెక్చర్ & నెట్‌వర్కింగ్ (SAS Architecture & Networking)',
    chaptersRange: 'Chapters 6–10',
    summaryEn: 'Substation Automation System fundamentals, Station/Bay/Process levels, Station Bus vs Process Bus, Ethernet/IP/VLAN networking, PRP/HSR redundancy, IEEE 1588 PTP, and IEC 62351 security.',
    summaryTe: 'Substation Automation System ప్రాథమిక సూత్రాలు, Station/Bay/Process స్థాయిలు, Station Bus మరియు Process Bus, Ethernet/IP/VLAN నెట్‌వర్కింగ్, PRP/HSR రిడండెన్సీ, IEEE 1588 PTP మరియు IEC 62351 భద్రత.',
  },
  {
    level: 3 as const,
    titleEn: '3. IEC 61850 Engineering',
    titleTe: '3. IEC 61850 ఇంజనీరింగ్ (IEC 61850 Engineering)',
    chaptersRange: 'Chapters 11–15',
    summaryEn: 'IEC 61850 standard parts, PD/LD/LN/DO/DA data model hierarchy, MMS client/server & BRCB/URCB reporting, Layer-2 GOOSE multicast, and 9-2 LE Sampled Values & SBO control models.',
    summaryTe: 'IEC 61850 ప్రమాణ భాగాలు, PD/LD/LN/DO/DA డేటా మోడల్ క్రమం, MMS క్లయింట్/సర్వర్ & BRCB/URCB రిపోర్టింగ్, Layer-2 GOOSE మల్టీకాస్ట్, మరియు 9-2 LE Sampled Values & SBO నియంత్రణ నమూనాలు.',
  },
  {
    level: 4 as const,
    titleEn: '4. Engineering Tools & Integration',
    titleTe: '4. ఇంజనీరింగ్ టూల్స్ & ఇంటిగ్రేషన్ (Engineering Tools & Integration)',
    chaptersRange: 'Chapters 16–20',
    summaryEn: 'SCL files (ICD/SSD/SCD/CID/IID), multi-vendor IED configuration (Siemens DIGSI 5, Schneider, ABB PCM600, GE EnerVista), 50-signal mapping chain, SCADA/Gateway/RCC, and industrial protocols.',
    summaryTe: 'SCL ఫైల్స్ (ICD/SSD/SCD/CID/IID), మల్టీ-వెండర్ IED కాన్ఫిగరేషన్ (Siemens DIGSI 5, Schneider, ABB PCM600, GE EnerVista), 50-సిగ్నల్ మ్యాపింగ్ చైన్, SCADA/Gateway/RCC మరియు ఇండస్ట్రియల్ ప్రోటోకాల్స్.',
  },
  {
    level: 5 as const,
    titleEn: '5. Testing, Commissioning & Troubleshooting',
    titleTe: '5. టెస్టింగ్, కమిషనింగ్ & ట్రబుల్‌షూటింగ్ (Testing, Commissioning & Troubleshooting)',
    chaptersRange: 'Chapters 21–25',
    summaryEn: 'End-to-end FAT procedures, SAT & live site commissioning safety, communication troubleshooting playbooks, breaker control & protection testing, and Wireshark/switch diagnostics.',
    summaryTe: 'పూర్తి స్థాయి FAT విధానాలు, SAT & సైట్ కమిషనింగ్ భద్రతా నియమాలు, కమ్యూనికేషన్ ట్రబుల్‌షూటింగ్ విధానాలు, బ్రేకర్ కంట్రోల్ & ప్రొటెక్షన్ టెస్టింగ్, మరియు Wireshark/స్విచ్ డయాగ్నస్టిక్స్.',
  },
  {
    level: 6 as const,
    titleEn: '6. Complete Project & Mastery',
    titleTe: '6. పూర్తి ప్రాజెక్ట్ & మాస్టరీ (Complete Project & Mastery)',
    chaptersRange: 'Chapters 26–30',
    summaryEn: 'Complete 132/33/11 kV SAS design package, 14-stage project lifecycle workflow, guided FAT/SAT execution project, 10 interactive fault scenarios, and final SAS Engineer Mastery Certification.',
    summaryTe: 'పూర్తి 132/33/11 kV SAS డిజైన్ ప్యాకేజీ, 14-దశల ప్రాజెక్ట్ లైఫ్‌సైకిల్ వర్క్‌ఫ్లో, గైడెడ్ FAT/SAT ప్రాజెక్ట్, 10 ఇంటరాక్టివ్ ఫాల్ట్ సినారియోలు మరియు తుది SAS ఇంజనీర్ మాస్టరీ అసెస్‌మెంట్.',
  },
];

export const ENGINEERING_DIAGRAM_LIBRARY: AcademyDiagramSpec[] = [
  {
    id: 'DIAG-01-POWER-SYSTEM',
    number: 1,
    titleEn: 'Complete Electrical Power System — Generation to 132/33/11 kV Substation & Consumers',
    titleTe: 'పూర్తి ఎలక్ట్రికల్ పవర్ సిస్టమ్ — జనరేషన్ నుండి 132/33/11 kV సబ్‌స్టేషన్ & వినియోగదారుల వరకు',
    category: 'Power & Drawings',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Shows 11 kV synchronous generation stepped up to 400/132 kV transmission, entering our 132/33/11 kV Shankarpally/Gachibowli substation and stepping down to 33 kV, 11 kV, and 415 V consumers.',
    summaryTe: '11 kV జనరేషన్ నుండి 400/132 kV ట్రాన్స్‌మిషన్ ద్వారా మన 132/33/11 kV సబ్‌స్టేషన్‌కు చేరి, అక్కడి నుండి 33 kV, 11 kV మరియు 415 V వినియోగదారులకు విద్యుత్ సరఫరా అయ్యే విధానాన్ని చూపుతుంది.',
    guidedStepsEn: [
      'Step 1: Generating Station produces 3-phase 50 Hz AC at 11 kV or 15.75 kV.',
      'Step 2: Generator Step-Up (GSU) Transformer raises voltage to 400 kV / 132 kV to reduce I²R line losses.',
      'Step 3: 132 kV Double-Circuit Transmission Lines (Shankarpally L1 & Gachibowli L2) feed the 132 kV Busbar.',
      'Step 4: Two 50 MVA 132/33 kV Power Transformers (T1 & T2) step down voltage to the 33 kV Switchgear.',
      'Step 5: Two 16 MVA 33/11 kV Distribution Transformers (DT1 & DT2) supply 11 kV outgoing feeders to 415/230 V consumers.',
    ],
    guidedStepsTe: [
      'Step 1: జనరేటింగ్ స్టేషన్ 11 kV లేదా 15.75 kV వద్ద 3-phase 50 Hz AC విద్యుత్‌ను ఉత్పత్తి చేస్తుంది.',
      'Step 2: I²R లైన్ నష్టాలను తగ్గించడానికి Step-Up Transformer వోల్టేజ్‌ను 400 kV / 132 kV కి పెంచుతుంది.',
      'Step 3: 132 kV లైన్లు (Shankarpally L1 & Gachibowli L2) మన 132 kV Busbar కు పవర్ అందిస్తాయి.',
      'Step 4: రెండు 50 MVA 132/33 kV Power Transformers (T1 & T2) వోల్టేజ్‌ను 33 kV కి తగ్గిస్తాయి.',
      'Step 5: రెండు 16 MVA 33/11 kV Transformers (DT1 & DT2) ద్వారా 11 kV ఫీడర్లు మరియు 415/230 V వినియోగదారులకు సరఫరా వెళ్తుంది.',
    ],
    hotspots: [
      { id: 'GEN', label: '11 kV Thermal/Hydro Gen', sublabel: '50 Hz • 250 MW', x: 30, y: 110, w: 125, h: 72, color: '#22C55E', descriptionEn: 'Synchronous generator producing 11 kV 3-phase 50 Hz power with AVR and governor control.', descriptionTe: 'AVR మరియు గవర్నర్ నియంత్రణతో 11 kV 3-phase 50 Hz పవర్ ఉత్పత్తి చేసే సింక్రోనస్ జనరేటర్.', iecSymbol: 'G ~ 3~' },
      { id: 'GSU', label: '11/132 kV Step-Up TX', sublabel: 'YNd11 • 315 MVA', x: 185, y: 110, w: 125, h: 72, color: '#00CFFF', descriptionEn: 'Steps up voltage from 11 kV to 132 kV so current reduces by 12× and I²R transmission loss drops by 144×.', descriptionTe: 'వోల్టేజ్‌ను 11 kV నుండి 132 kV కి పెంచడం ద్వారా కరెంట్ 12 రెట్లు తగ్గి I²R నష్టం 144 రెట్లు తగ్గుతుంది.', iecSymbol: '3W-TX' },
      { id: 'EHV-LINE', label: '132 kV Transmission', sublabel: 'BAY-132-L1 & L2', x: 340, y: 110, w: 130, h: 72, color: '#38BDF8', descriptionEn: '132 kV overhead ACSR Panther lines protected by Siemens 7SA87 (L1) and GE Multilin D60 (L2) distance relays.', descriptionTe: 'Siemens 7SA87 (L1) మరియు GE Multilin D60 (L2) డిస్టెన్స్ రిలేలచే రక్షించబడే 132 kV ట్రాన్స్‌మిషన్ లైన్లు.', linkedBayId: 'BAY-132-L1', linkedTab: 'SLD' },
      { id: 'SUB-132-33', label: '132/33 kV Grid Sub', sublabel: '2 × 50 MVA (T1/T2)', x: 500, y: 110, w: 135, h: 72, color: '#FACC15', descriptionEn: 'Main 132/33 kV substation with SF6 circuit breakers, 87T differential relays (7UT86 / P633), and OLTC.', descriptionTe: 'SF6 సర్క్యూట్ బ్రేకర్లు, 87T డిఫరెన్షియల్ రిలేలు (7UT86 / P633) మరియు OLTC కలిగిన 132/33 kV సబ్‌స్టేషన్.', linkedBayId: 'BAY-132-T1', linkedTab: 'SLD' },
      { id: 'SUB-33-11', label: '33/11 kV Switchgear', sublabel: '2 × 16 MVA (DT1/DT2)', x: 665, y: 110, w: 130, h: 72, color: '#A855F7', descriptionEn: 'Indoor 33 kV & 11 kV vacuum circuit breaker (VCB) panels with ABB REF615, Siemens 7SJ85, and GE 850 feeder relays.', descriptionTe: 'ABB REF615, Siemens 7SJ85 మరియు GE 850 రిలేలతో కూడిన 33 kV & 11 kV ఇండోర్ VCB ప్యానెల్స్.', linkedBayId: 'BAY-33-F01', linkedTab: 'SLD' },
      { id: 'CONS', label: '11 kV / 415 V Loads', sublabel: 'Industrial & Domestic', x: 825, y: 110, w: 120, h: 72, color: '#EC4899', descriptionEn: '33 kV Data Center/Industrial loads and 11 kV / 415 V distribution transformers feeding commercial and residential consumers.', descriptionTe: '33 kV ఇండస్ట్రియల్ లోడ్లు మరియు 11 kV / 415 V డిస్ట్రిబ్యూషన్ ట్రాన్స్‌ఫార్మర్ల ద్వారా గృహ/వాణిజ్య వినియోగదారులు.', linkedBayId: 'BAY-11-F01', linkedTab: 'SCADA' },
    ],
    connections: [
      { from: 'GEN', to: 'GSU', label: '11 kV', color: '#22C55E' },
      { from: 'GSU', to: 'EHV-LINE', label: '132 kV', color: '#00CFFF' },
      { from: 'EHV-LINE', to: 'SUB-132-33', label: '132 kV Bus', color: '#38BDF8' },
      { from: 'SUB-132-33', to: 'SUB-33-11', label: '33 kV Bus', color: '#FACC15' },
      { from: 'SUB-33-11', to: 'CONS', label: '11 kV / 415 V', color: '#A855F7' },
    ],
  },
  {
    id: 'DIAG-02-SLD',
    number: 2,
    titleEn: '132/33/11 kV Single Line Diagram (SLD) — IEC Symbols, Bays & Protection Zones',
    titleTe: '132/33/11 kV సింగిల్ లైన్ డయాగ్రమ్ (SLD) — IEC చిహ్నాలు, బేలు & ప్రొటెక్షన్ జోన్లు',
    category: 'Power & Drawings',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Interactive Single Line Diagram showing 132 kV Bus A/B, Bus Coupler CB-132, T1/T2 50 MVA transformers, 33 kV Bus A/B, DT1/DT2 16 MVA transformers, and 11 kV feeders.',
    summaryTe: '132 kV Bus A/B, Bus Coupler, T1/T2 50 MVA ట్రాన్స్‌ఫార్మర్లు, 33 kV Bus A/B, DT1/DT2 16 MVA ట్రాన్స్‌ఫార్మర్లు మరియు 11 kV ఫీడర్లను చూపే ఇంటరాక్టివ్ SLD.',
    guidedStepsEn: [
      'Read top-to-bottom: highest voltage (132 kV) at the top, intermediate (33 kV) in the middle, and distribution (11 kV) at the bottom.',
      'Identify isolating equipment (89L Line Disconnector, 89B Bus Disconnector, 89E Earth Switch) vs interrupting equipment (52 Circuit Breaker).',
      'Locate instrument transformers: CT cores (metering + protection + differential) and VT/CVT voltage taps.',
      'Check normal operating state: Incomers and Feeders CLOSED, Earth Switches OPEN, Bus Coupler CLOSED/OPEN per bus-split philosophy.',
    ],
    guidedStepsTe: [
      'SLD ని పై నుండి క్రిందికి చదవాలి: పైన 132 kV, మధ్యలో 33 kV, మరియు క్రింద 11 kV ఉంటాయి.',
      'ఐసోలేటర్లు (89L, 89B, 89E Earth Switch) మరియు ఫాల్ట్ కరెంట్ ఆపే 52 Circuit Breaker చిహ్నాలను గుర్తించండి.',
      'CT కోర్లు (మీటరింగ్, ప్రొటెక్షన్, డిఫరెన్షియల్) మరియు VT/CVT లను పరిశీలించండి.',
      'సాధారణ స్థితిలో Incomers మరియు Feeders CLOSED లో, Earth Switches OPEN లో ఉంటాయి.',
    ],
    hotspots: [
      { id: 'SLD-L1', label: '132-L1 Shankarpally', sublabel: 'CB: CLOSED • 7SA87 (21/67)', x: 50, y: 35, w: 170, h: 62, color: '#00CFFF', descriptionEn: '132 kV Incoming Line 1 with CVT, LA, 89L, SF6 CB (XCBR1), 800/1A CT, and Siemens 7SA87 Distance Relay.', descriptionTe: 'CVT, LA, 89L, SF6 CB (XCBR1), 800/1A CT మరియు Siemens 7SA87 డిస్టెన్స్ రిలే కలిగిన 132 kV ఇన్‌కమింగ్ లైన్ 1.', iecSymbol: '52 + 89 + CT/CVT', linkedBayId: 'BAY-132-L1', linkedTab: 'SLD' },
      { id: 'SLD-BC132', label: '132-BC Bus Coupler', sublabel: '132 kV Bus A ↔ Bus B', x: 390, y: 35, w: 170, h: 62, color: '#38BDF8', descriptionEn: '132 kV Bus Coupler Bay controlled by Schneider MiCOM C264 BCU with synchrocheck (25) and CILO1 interlocking.', descriptionTe: 'Schneider MiCOM C264 BCU మరియు సింక్రోచెక్ (25) తో నియంత్రించబడే 132 kV బస్ కప్లర్ బే.', iecSymbol: '52-BC', linkedBayId: 'BAY-132-BC', linkedTab: 'SLD' },
      { id: 'SLD-L2', label: '132-L2 Gachibowli', sublabel: 'CB: CLOSED • Multilin D60', x: 730, y: 35, w: 170, h: 62, color: '#00CFFF', descriptionEn: '132 kV Incoming Line 2 protected by GE Vernova Multilin D60 distance protection system.', descriptionTe: 'GE Vernova Multilin D60 డిస్టెన్స్ రిలేతో రక్షించబడే 132 kV ఇన్‌కమింగ్ లైన్ 2.', iecSymbol: '52 + 89', linkedBayId: 'BAY-132-L2', linkedTab: 'SLD' },
      { id: 'SLD-T1', label: 'TX-T1 50 MVA (132/33kV)', sublabel: 'YNyn0d11 • 7UT86 (87T)', x: 180, y: 125, w: 210, h: 65, color: '#FACC15', descriptionEn: '50 MVA ONAN/ONAF Power Transformer #1 with OLTC (ATCC1), Buchholz/WTI/OTI trip, and Siemens 7UT86 differential relay.', descriptionTe: 'OLTC, Buchholz/WTI/OTI మరియు Siemens 7UT86 (87T) రిలే కలిగిన 50 MVA పవర్ ట్రాన్స్‌ఫార్మర్ #1.', iecSymbol: '87T + OLTC', linkedBayId: 'BAY-132-T1', linkedTab: 'SLD' },
      { id: 'SLD-T2', label: 'TX-T2 50 MVA (132/33kV)', sublabel: 'YNyn0d11 • MiCOM P633', x: 560, y: 125, w: 210, h: 65, color: '#FACC15', descriptionEn: '50 MVA ONAN/ONAF Power Transformer #2 protected by Schneider MiCOM P633 differential relay.', descriptionTe: 'Schneider MiCOM P633 డిఫరెన్షియల్ రిలే కలిగిన 50 MVA పవర్ ట్రాన్స్‌ఫార్మర్ #2.', iecSymbol: '87T + OLTC', linkedBayId: 'BAY-132-T2', linkedTab: 'SLD' },
      { id: 'SLD-33BUS', label: '33 kV Switchgear Bus A/B', sublabel: 'F01..F04 + Cap Bank + DT1/DT2', x: 180, y: 215, w: 590, h: 58, color: '#22C55E', descriptionEn: '33 kV indoor GIS/AIS bus feeding 4 outgoing feeders (F01..F04), 10 MVAR capacitor bank, and two 16 MVA 33/11 kV transformers.', descriptionTe: '4 అవుట్‌గోయింగ్ ఫీడర్లు, 10 MVAR కెపాసిటర్ బ్యాంక్ మరియు రెండు 16 MVA 33/11 kV ట్రాన్స్‌ఫార్మర్లకు సరఫరా చేసే 33 kV బస్.', iecSymbol: '33kV-BUS', linkedBayId: 'BAY-33-F01', linkedTab: 'SLD' },
    ],
    connections: [
      { from: 'SLD-L1', to: 'SLD-T1', label: '132 kV Bus A', color: '#00CFFF' },
      { from: 'SLD-L1', to: 'SLD-BC132', label: 'Bus A', color: '#38BDF8' },
      { from: 'SLD-BC132', to: 'SLD-L2', label: 'Bus B', color: '#38BDF8' },
      { from: 'SLD-L2', to: 'SLD-T2', label: '132 kV Bus B', color: '#00CFFF' },
      { from: 'SLD-T1', to: 'SLD-33BUS', label: '33 kV Incomer 1', color: '#FACC15' },
      { from: 'SLD-T2', to: 'SLD-33BUS', label: '33 kV Incomer 2', color: '#FACC15' },
    ],
  },
  {
    id: 'DIAG-03-GA-PLAN',
    number: 3,
    titleEn: 'Substation General Arrangement (GA) Plan View — Switchyard, Clearances & Control Room',
    titleTe: 'సబ్‌స్టేషన్ జనరల్ అరేంజ్‌మెంట్ (GA) ప్లాన్ వ్యూ — స్విచ్‌యార్డ్, క్లియరెన్స్ & కంట్రోల్ రూమ్',
    category: 'Power & Drawings',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Physical layout (Plan View) showing North orientation, 132 kV outdoor gantry bays, T1/T2 transformer plinths with blast walls, cable trenches, internal roads, and the SAS Control Building.',
    summaryTe: '132 kV అవుట్‌డోర్ గ్యాంట్రీ బేలు, ఫైర్ బ్లాస్ట్ వాల్స్‌తో కూడిన T1/T2 ట్రాన్స్‌ఫార్మర్ ప్లింత్‌లు, కేబుల్ ట్రెంచ్‌లు మరియు SAS కంట్రోల్ బిల్డింగ్ యొక్క భౌతిక అమరిక (GA Plan View).',
    guidedStepsEn: [
      'Check the North Arrow and grid coordinates (X-Y bench marks) in the top corner of the GA drawing.',
      'Locate the 132 kV Line Termination Gantries at the North perimeter where overhead lines enter.',
      'Follow the bay equipment alignment: LA → CVT → Wave Trap → Line Isolator (89L) → CT → Circuit Breaker (52) → Bus Isolator (89B) → 132 kV Busbar.',
      'Verify phase-to-phase (≥ 1300 mm for 132 kV) and ground clearances, fire-wall separation between T1 and T2, and main/cross RCC cable trenches routing into the Control Room.',
    ],
    guidedStepsTe: [
      'GA డ్రాయింగ్ పైభాగంలో ఉన్న North Arrow మరియు X-Y కోఆర్డినేట్‌లను మొదట గమనించండి.',
      'ఉత్తరం వైపు 132 kV ఓవర్‌హెడ్ లైన్లు ప్రవేశించే గ్యాంట్రీ టవర్లను గుర్తించండి.',
      'బే పరికరాల వరుస క్రమం చూడండి: LA → CVT → Line Isolator (89L) → CT → Circuit Breaker (52) → Bus Isolator (89B) → 132 kV Busbar.',
      'T1 మరియు T2 మధ్య ఫైర్ బ్లాస్ట్ వాల్, భద్రతా క్లియరెన్స్ కొలతలు మరియు కంట్రోల్ రూమ్‌కు వెళ్లే కేబుల్ ట్రెంచ్‌లను తనిఖీ చేయండి.',
    ],
    hotspots: [
      { id: 'GA-GANTRY', label: '132 kV Line Gantry & Bay Yard', sublabel: 'Bay Pitch: 9.5 m • Clr: 4.2 m', x: 40, y: 35, w: 390, h: 75, color: '#00CFFF', descriptionEn: 'Outdoor lattice steel gantry structures supporting 132 kV Twin Moose busbars, LA, CVT, 89L, SF6 CB, and CT.', descriptionTe: '132 kV బస్‌బార్లు, LA, CVT, 89L, SF6 CB మరియు CT లను మోసే అవుట్‌డోర్ స్టీల్ గ్యాంట్రీ నిర్మాణాలు.', linkedTab: 'HERO' },
      { id: 'GA-TX-YARD', label: 'Transformer Plinths (T1 & T2) + Fire Wall', sublabel: '2 × 50 MVA • Soak Pit & Bund', x: 480, y: 35, w: 430, h: 75, color: '#FACC15', descriptionEn: 'Reinforced concrete plinths with oil-containment gravel pits and a 4-hour fire-rated RCC blast wall between T1 and T2.', descriptionTe: 'ఆయిల్ సోక్ పిట్ మరియు T1, T2 మధ్య RCC ఫైర్ బ్లాస్ట్ వాల్ కలిగిన ట్రాన్స్‌ఫార్మర్ ప్లింత్‌లు.', linkedTab: 'HERO' },
      { id: 'GA-TRENCH', label: 'Main RCC Cable Trench & FO Duct', sublabel: 'Power / Control / Fiber Tray Separation', x: 40, y: 135, w: 870, h: 48, color: '#38BDF8', descriptionEn: 'Multi-tier concrete cable trench: top tier for HDPE fiber-optic ducts, middle tier for 1.1 kV screened control cables, bottom tier for LT power cables.', descriptionTe: 'మూడు వరుసల కేబుల్ ట్రెంచ్: పైన ఫైబర్ ఆప్టిక్ డక్ట్, మధ్యలో కంట్రోల్ కేబుల్స్, క్రింద LT పవర్ కేబుల్స్.' },
      { id: 'GA-CTRL', label: 'Control Room, Relay Room & Battery Room', sublabel: 'SAS Panels • 33/11kV GIS/VCB Hall', x: 140, y: 210, w: 670, h: 65, color: '#22C55E', descriptionEn: 'Indoor air-conditioned building housing SCADA/HMI operator consoles, Protection & BCU Relay Panels, PRP LAN A/B Racks, and 110V DC Battery Bank.', descriptionTe: 'SCADA/HMI కన్సోల్స్, రిలే ప్యానెల్స్, PRP LAN A/B ర్యాక్‌లు మరియు 110V DC బ్యాటరీ రూమ్ ఉన్న కంట్రోల్ బిల్డింగ్.', linkedTab: 'NETWORK' },
    ],
    connections: [
      { from: 'GA-GANTRY', to: 'GA-TRENCH', label: 'MK Control & FO Cables', color: '#00CFFF' },
      { from: 'GA-TX-YARD', to: 'GA-TRENCH', label: 'OLTC & WTI/Buchholz Cables', color: '#FACC15' },
      { from: 'GA-TRENCH', to: 'GA-CTRL', label: 'Cable Basement Entry', color: '#22C55E' },
    ],
  },
  {
    id: 'DIAG-04-ELEVATION',
    number: 4,
    titleEn: '132 kV Bay Section / Elevation View — Live Clearances & Equipment Heights',
    titleTe: '132 kV బే ఎలివేషన్ వ్యూ (Section View) — పరికరాల ఎత్తు & భద్రతా క్లియరెన్స్',
    category: 'Power & Drawings',
    isIllustrativeTrainingExample: true,
    summaryEn: 'Cross-sectional elevation from incoming 132 kV gantry down through LA, CVT, 89L, CT, 52 SF6 Breaker, 89B, and 132 kV Main Bus showing ground and live-part clearances.',
    summaryTe: '132 kV గ్యాంట్రీ నుండి LA, CVT, 89L, CT, 52 SF6 బ్రేకర్, 89B మరియు 132 kV మెయిన్ బస్ వరకు పరికరాల ఎత్తు మరియు గ్రౌండ్ క్లియరెన్స్ చూపే సెక్షన్ వ్యూ.',
    guidedStepsEn: [
      'Verify minimum ground clearance to lowest live part (≥ 4000 mm for 132 kV) and section clearance (≥ 3800 mm).',
      'Check Marshalling Kiosk (MK) position next to the CT/CB group for terminating secondary CT/VT and 52a/52b wires.',
    ],
    guidedStepsTe: [
      '132 kV లైవ్ భాగాలకు కనీస గ్రౌండ్ క్లియరెన్స్ (≥ 4000 mm) మరియు సెక్షన్ క్లియరెన్స్ (≥ 3800 mm) తనిఖీ చేయండి.',
      'CT/VT మరియు 52a/52b వైర్లను టెర్మినేట్ చేసే Marshalling Kiosk (MK) స్థానాన్ని గుర్తించండి.',
    ],
    hotspots: [
      { id: 'EL-LA-CVT', label: 'Surge Arrester & CVT', sublabel: 'Plinth: 2.55 m • Live: 4.3 m', x: 50, y: 110, w: 180, h: 72, color: '#00CFFF', descriptionEn: '120 kV ZnO Surge Arrester and Capacitive Voltage Transformer (132kV/√3 / 110V/√3) mounted on galvanized lattice pedestals.', descriptionTe: '120 kV ZnO Surge Arrester మరియు CVT (132kV/√3 / 110V/√3) స్టీల్ పెడెస్టల్ నిర్మాణంపై అమర్చబడి ఉంటాయి.' },
      { id: 'EL-89L', label: '89L Line Disconnector + 89E', sublabel: 'Motorized Center-Break', x: 270, y: 110, w: 180, h: 72, color: '#38BDF8', descriptionEn: '3-pole motorized horizontal center-break isolator with mechanically and electrically interlocked earth switch (89E).', descriptionTe: 'మెకానికల్ మరియు ఎలక్ట్రికల్ ఇంటర్‌లాక్ కలిగిన 3-పోల్ మోటరైజ్డ్ ఐసోలేటర్ (89L) మరియు ఎర్త్ స్విచ్ (89E).' },
      { id: 'EL-CT-CB', label: 'CT (5-Core) & 52 SF6 CB', sublabel: '145 kV • 40 kA • 3-Cycle', x: 490, y: 110, w: 190, h: 72, color: '#22C55E', descriptionEn: 'Live-tank SF6 Circuit Breaker with dual trip coils (TC1/TC2), spring-charge mechanism, and 5-core oil/SF6 current transformer.', descriptionTe: 'డ్యూయల్ ట్రిప్ కాయిల్స్ (TC1/TC2), స్ప్రింగ్ ఛార్జ్ మెకానిజం కలిగిన SF6 సర్క్యూట్ బ్రేకర్ మరియు 5-కోర్ CT.' },
      { id: 'EL-89B-BUS', label: '89B Bus Isolator & 132 kV Bus', sublabel: 'Strung Bus Height: 9.0 m', x: 720, y: 110, w: 190, h: 72, color: '#FACC15', descriptionEn: 'Pantograph / double-break bus disconnector connecting the bay to the 9.0 m high 132 kV Twin Moose strung busbar.', descriptionTe: '9.0 మీటర్ల ఎత్తులో ఉన్న 132 kV బస్‌బార్‌కు బేను కలుపుతున్న బస్ ఐసోలేటర్ (89B).' },
    ],
    connections: [
      { from: 'EL-LA-CVT', to: 'EL-89L', label: 'ACSR Jumper', color: '#00CFFF' },
      { from: 'EL-89L', to: 'EL-CT-CB', label: 'Rigid/Flex Bus', color: '#38BDF8' },
      { from: 'EL-CT-CB', to: 'EL-89B-BUS', label: 'To 132 kV Bus', color: '#22C55E' },
    ],
  },
  {
    id: 'DIAG-05-SCHEMATIC',
    number: 5,
    titleEn: 'Protection & Control Schematic — 110V DC Trip/Close, 52a/52b & TCS (74)',
    titleTe: 'ప్రొటెక్షన్ & కంట్రోల్ స్కీమాటిక్ — 110V DC ట్రిప్/క్లోజ్, 52a/52b & TCS (74)',
    category: 'Power & Drawings',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Detailed DC schematic showing +110V DC / -110V DC supply, IED Binary Output (PTRC1/CSWI1), 86 Lockout Relay, 52a (NO) and 52b (NC) auxiliary contacts, Trip Coil TC1, Close Coil CC, and Trip Circuit Supervision (74).',
    summaryTe: '+110V DC సప్లై, IED బైనరీ అవుట్‌పుట్, 86 లాకౌట్, 52a/52b ఆగ్జిలరీ కాంటాక్టులు, ట్రిప్ కాయిల్ TC1, క్లోజ్ కాయిల్ CC మరియు ట్రిప్ సర్క్యూట్ సూపర్‌విజన్ (74) చూపే స్కీమాటిక్.',
    guidedStepsEn: [
      'When CB is CLOSED, 52a is CLOSED and 52b is OPEN — priming the Trip Coil (TC1) path.',
      'When CB is OPEN, 52b is CLOSED and 52a is OPEN — priming the Closing Coil (CC) path and interrupting TC1 current immediately after breaker opening so TC1 does not burn out.',
      'Trip Circuit Supervision (74 / TCS) passes a continuous low trickle current (~2–5 mA) through both 52a and 52b paths to monitor coil continuity in both OPEN and CLOSED states.',
    ],
    guidedStepsTe: [
      'బ్రేకర్ CLOSED లో ఉన్నప్పుడు 52a CLOSED లో, 52b OPEN లో ఉంటుంది — తద్వారా Trip Coil (TC1) సర్క్యూట్ సిద్ధంగా ఉంటుంది.',
      'బ్రేకర్ OPEN అయిన వెంటనే 52a OPEN అయి TC1 కాయిల్ కాలిపోకుండా కరెంట్‌ను ఆపుతుంది; అదే సమయంలో 52b CLOSED అయి Closing Coil (CC) పాత్‌ను సిద్ధం చేస్తుంది.',
      'Trip Circuit Supervision (74) 52a మరియు 52b రెండింటి ద్వారా తక్కువ కరెంట్ (~2–5 mA) పంపి ట్రిప్ కాయిల్ ఆరోగ్యాన్ని నిరంతరం పర్యవేక్షిస్తుంది.',
    ],
    hotspots: [
      { id: 'SCH-DC', label: '110V DC MCB (+DC / -DC)', sublabel: 'DC Source 1 (TC1) & Source 2 (TC2)', x: 40, y: 110, w: 185, h: 72, color: '#FACC15', descriptionEn: 'Separate 110V DC feeders for Trip Circuit 1 (+DC1) and Trip Circuit 2 (+DC2) with auxiliary MCB trip supervision contact.', descriptionTe: 'TC1 మరియు TC2 కోసం వేర్వేరు 110V DC MCB సప్లైలు.' },
      { id: 'SCH-IED', label: 'IED Trip/Close Contact & 86', sublabel: 'PTRC1.Tr / CSWI1.Op + CILO1', x: 270, y: 110, w: 205, h: 72, color: '#00CFFF', descriptionEn: 'Heavy-duty trip output contact of Siemens 7SJ85 / ABB REF615 (and 86 master trip relay) closing the +110V DC circuit.', descriptionTe: 'ప్రొటెక్షన్ ఆపరేట్ అయినప్పుడు +110V DC ని ట్రిప్ కాయిల్‌కు పంపే IED యొక్క హెవీ-డ్యూటీ ట్రిప్ కాంటాక్ట్.' },
      { id: 'SCH-52AB', label: '52a (NO) & 52b (NC) Aux Contacts', sublabel: 'DBPOS to IED DI1/DI2 + Coil Cutout', x: 520, y: 110, w: 195, h: 72, color: '#22C55E', descriptionEn: 'Mechanically linked to breaker operating rod: 52a mirrors CB state (Closed=1), 52b is inverse (Open=1). Wired to IED DI1 & DI2 for XCBR1.Pos (DPC).', descriptionTe: 'బ్రేకర్ షాఫ్ట్‌కు అనుసంధానించబడిన 52a (NO) మరియు 52b (NC) కాంటాక్టులు. ఇవి XCBR1.Pos కోసం IED DI1, DI2 కు కనెక్ట్ చేయబడతాయి.' },
      { id: 'SCH-TC', label: 'Trip Coil (TC1) & Close Coil (CC)', sublabel: 'SF6 Gas & Spring Charge Permissive', x: 755, y: 110, w: 175, h: 72, color: '#FF5C65', descriptionEn: 'Shunt trip solenoid TC1 (monitored by TCS 74) and closing solenoid CC (in series with anti-pumping 52Y, SF6 pressure OK, and spring charged contacts).', descriptionTe: 'TCS చే పర్యవేక్షించబడే ట్రిప్ కాయిల్ (TC1) మరియు SF6 ప్రెజర్/స్ప్రింగ్ ఛార్జ్ ఇంటర్‌లాక్‌తో కూడిన క్లోజింగ్ కాయిల్ (CC).' },
    ],
    connections: [
      { from: 'SCH-DC', to: 'SCH-IED', label: '+110V DC', color: '#FACC15' },
      { from: 'SCH-IED', to: 'SCH-52AB', label: 'Trip / Close Cmd', color: '#00CFFF' },
      { from: 'SCH-52AB', to: 'SCH-TC', label: 'Via 52a (Trip) / 52b (Close)', color: '#FF5C65' },
    ],
  },
  {
    id: 'DIAG-07-SAS-LEVELS',
    number: 7,
    titleEn: 'IEC 61850 Three-Level Architecture — Station Level, Bay Level & Process Level',
    titleTe: 'IEC 61850 మూడు స్థాయిల ఆర్కిటెక్చర్ — Station Level, Bay Level & Process Level',
    category: 'SAS Architecture',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Complete 3-tier digital substation hierarchy showing Station Level servers/gateways, Station Bus (IEC 61850-8-1 MMS & GOOSE), Bay Level Protection/Control IEDs, Process Bus (IEC 61850-9-2 SV / Hardwired), and Process Level switchgear.',
    summaryTe: 'Station Level సర్వర్లు, Station Bus (IEC 61850-8-1 MMS & GOOSE), Bay Level IEDలు, మరియు Process Level స్విచ్‌గేర్ పరికరాలను చూపే మూడు స్థాయిల IEC 61850 ఆర్కిటెక్చర్.',
    guidedStepsEn: [
      'Station Level: Dual SCADA Servers, Operator HMI, EWS, Meinberg PTP Grandmaster, and Station Gateway (IEC-104 to RCC).',
      'Station Bus (IEC 61850-8-1): PRP Dual-LAN Ethernet carrying TCP/102 MMS (Reports/SBO) and Layer-2 Multicast GOOSE (0x88B8).',
      'Bay Level: Protection & Control IEDs (7SA87, 7UT86, 7SJ85, REF615, P633, C264, Multilin 850/D60).',
      'Process Level: Switchyard CBs, Isolators, CTs, VTs — connected via hardwired copper (conventional/hybrid) or Merging Units over IEC 61850-9-2 LE Process Bus.',
    ],
    guidedStepsTe: [
      'Station Level: డ్యూయల్ SCADA సర్వర్లు, Operator HMI, EWS, PTP టైమ్ సర్వర్ మరియు RCC Gateway ఉంటాయి.',
      'Station Bus (IEC 61850-8-1): PRP LAN A/B ద్వారా MMS (TCP/102) మరియు GOOSE (0x88B8) సంకేతాలను మోసుకెళ్తుంది.',
      'Bay Level: ఫీడర్, ట్రాన్స్‌ఫార్మర్ మరియు లైన్ ప్రొటెక్షన్ IEDలు మరియు BCUలు ఉంటాయి.',
      'Process Level: స్విచ్‌యార్డ్ లోని CBలు, CT/VTలు — ఇవి హార్డ్‌వైర్డ్ కేబుల్స్ ద్వారా లేదా Merging Units (IEC 61850-9-2 LE Process Bus) ద్వారా IEDలకు కనెక్ట్ అవుతాయి.',
    ],
    hotspots: [
      { id: 'LVL-STATION', label: 'Station Level (SCADA / HMI / Gateway / PTP)', sublabel: '10.132.10.200..240 • IEC 61850 MMS Client', x: 60, y: 28, w: 840, h: 55, color: '#00CFFF', descriptionEn: 'Hosts SCADA Server A/B, Operator HMI Workstations, Engineering Workstation (DIGSI/PCM600), Historian (OPC UA), Meinberg PTP GM, and RCC Gateway (IEC-104).', descriptionTe: 'SCADA సర్వర్లు, HMI, ఇంజనీరింగ్ వర్క్‌స్టేషన్, హిస్టోరియన్, PTP టైమ్ సర్వర్ మరియు RCC గేట్‌వే ఉండే స్థాయి.', linkedTab: 'SCADA' },
      { id: 'LVL-SBUS', label: 'Station Bus — IEC 61850-8-1 (PRP LAN A & LAN B)', sublabel: 'MMS (TCP 102) + GOOSE (0x88B8, VLAN 20) + PTP', x: 110, y: 95, w: 740, h: 38, color: '#22C55E', descriptionEn: 'Redundant fiber-optic Ethernet switches carrying MMS client-server traffic and fast horizontal GOOSE peer-to-peer protection/interlocking messages.', descriptionTe: 'MMS మరియు వేగవంతమైన GOOSE మెసేజ్‌లను మోసుకెళ్లే రిడండెంట్ ఫైబర్ ఆప్టిక్ ఈథర్నెట్ నెట్‌వర్క్.', linkedTab: 'NETWORK' },
      { id: 'LVL-BAY', label: 'Bay Level — Multi-Vendor Protection & Control IEDs', sublabel: 'Siemens 7SA87/7UT86/7SJ85 • ABB REF615 • Schneider P633/C264 • GE 850', x: 60, y: 145, w: 840, h: 55, color: '#FACC15', descriptionEn: '18 Bay IEDs executing distance (21), differential (87T), overcurrent (50/51), synchrocheck (25), interlocking (CILO1), and breaker control (CSWI1).', descriptionTe: 'ప్రొటెక్షన్ (21, 87T, 50/51), ఇంటర్‌లాకింగ్ (CILO1) మరియు బ్రేకర్ కంట్రోల్ (CSWI1) నిర్వహించే 18 బే IEDలు.', linkedTab: 'IED' },
      { id: 'LVL-PROC', label: 'Process Level — Switchgear (CB / 89 / CT / VT) & Merging Units', sublabel: 'Hardwired 110V DC & CT/VT OR IEC 61850-9-2 LE Sampled Values (0x88BA)', x: 60, y: 215, w: 840, h: 55, color: '#A855F7', descriptionEn: 'Primary switchyard equipment interfaced via Marshalling Kiosks (hardwired 52a/52b, TC1/TC2, 1A CT, 110V VT) or Stand-Alone Merging Units (SAMU).', descriptionTe: 'మార్షలింగ్ కియోస్క్‌లు (హార్డ్‌వైర్డ్) లేదా Merging Units (SAMU - IEC 61850-9-2 LE) ద్వారా కనెక్ట్ అయ్యే స్విచ్‌యార్డ్ పరికరాలు.', linkedTab: 'SIGNALS' },
    ],
    connections: [
      { from: 'LVL-STATION', to: 'LVL-SBUS', label: 'MMS / PTP', color: '#00CFFF' },
      { from: 'LVL-SBUS', to: 'LVL-BAY', label: 'MMS + GOOSE', color: '#22C55E' },
      { from: 'LVL-BAY', to: 'LVL-PROC', label: 'Hardwired I/O or 9-2 SV', color: '#FACC15' },
    ],
  },
  {
    id: 'DIAG-13-PRP-HSR',
    number: 13,
    titleEn: 'PRP (Dual LAN A/B) vs HSR (Ring) Redundancy Architecture — IEC 62439-3',
    titleTe: 'PRP (Dual LAN A/B) మరియు HSR (Ring) రిడండెన్సీ ఆర్కిటెక్చర్ — IEC 62439-3',
    category: 'Network & Redundancy',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Shows Dual Attached Nodes with PRP (DANP) transmitting duplicate frames simultaneously over independent LAN A (10.132.10.x) and LAN B (10.132.20.x) with 0 ms bumpless failover, alongside HSR cut-through ring and RedBox attachment.',
    summaryTe: 'DANP నోడ్‌లు ఒకే ఫ్రేమ్‌ను స్వతంత్ర LAN A మరియు LAN B ద్వారా ఏకకాలంలో పంపి 0 ms ఫెయిల్‌ఓవర్ అందించే PRP విధానాన్ని మరియు HSR రింగ్ టోపాలజీని చూపుతుంది.',
    guidedStepsEn: [
      'Each DANP IED has two Ethernet ports (Port A → LAN A Switch, Port B → LAN B Switch) sharing the same MAC/IP identity at upper layers.',
      'The source DANP appends a 6-byte Redundancy Control Trailer (RCT) with sequence number and LAN identifier (0xA or 0xB) and sends frames on both LANs simultaneously.',
      'The destination DANP accepts the first arriving frame and discards the duplicate based on the RCT sequence number — achieving 0 ms recovery time if either LAN fails.',
      'Single Attached Nodes (SANs) like printers or legacy gateways connect through a RedBox (Redundancy Box).',
    ],
    guidedStepsTe: [
      'ప్రతి DANP IED కి రెండు పోర్టులు (Port A → LAN A, Port B → LAN B) ఉంటాయి.',
      'సోర్స్ IED ప్రతి ఫ్రేమ్‌కు 6-byte Redundancy Control Trailer (RCT) జోడించి LAN A మరియు LAN B రెండింటిలో ఒకేసారి పంపుతుంది.',
      'రిసీవర్ IED ముందుగా వచ్చిన ఫ్రేమ్‌ను తీసుకుని, రెండవ డూప్లికేట్ ఫ్రేమ్‌ను విస్మరిస్తుంది — తద్వారా ఒక నెట్‌వర్క్ ఫెయిల్ అయినా 0 ms రికవరీ లభిస్తుంది.',
      'సింగిల్ పోర్ట్ పరికరాలను (SAN) RedBox ద్వారా PRP లేదా HSR నెట్‌వర్క్‌కు కలుపుతారు.',
    ],
    hotspots: [
      { id: 'PRP-LANA', label: 'PRP LAN A Switch (Hirschmann RSP35)', sublabel: 'Subnet A: 10.132.10.0/24 • RCT 0xA', x: 60, y: 40, w: 360, h: 68, color: '#00CFFF', descriptionEn: ' completely independent Station Bus Switch Plane A. No inter-switch link exists between LAN A and LAN B.', descriptionTe: 'పూర్తిగా స్వతంత్రమైన LAN A స్విచ్. LAN A మరియు LAN B మధ్య ఎటువంటి ప్రత్యక్ష కేబుల్ లింక్ ఉండకూడదు.', linkedTab: 'NETWORK' },
      { id: 'PRP-LANB', label: 'PRP LAN B Switch (Hirschmann RSP35)', sublabel: 'Subnet B: 10.132.20.0/24 • RCT 0xB', x: 520, y: 40, w: 360, h: 68, color: '#22C55E', descriptionEn: 'Completely independent Station Bus Switch Plane B providing zero-latency duplicate path.', descriptionTe: 'జీరో-లేటెన్సీ ప్రత్యామ్నాయ మార్గాన్ని అందించే స్వతంత్ర LAN B స్విచ్.', linkedTab: 'NETWORK' },
      { id: 'PRP-DANP', label: 'DANP Bay IEDs (7SA87 / REF615 / P633 / 850)', sublabel: 'Port A + Port B • 0 ms Failover', x: 80, y: 165, w: 460, h: 72, color: '#FACC15', descriptionEn: 'Dual Attached Nodes implementing IEC 62439-3 Clause 4 Link Redundancy Entity (LRE) in hardware/FPGA.', descriptionTe: 'IEC 62439-3 Clause 4 ప్రకారం LRE చిప్‌సెట్ కలిగిన డ్యూయల్ అటాచ్డ్ IEDలు.', linkedTab: 'IED' },
      { id: 'PRP-REDBOX', label: 'RedBox + SAN Devices & HSR Bay Ring', sublabel: 'IEC 62439-3 Clause 4 & Clause 5', x: 590, y: 165, w: 300, h: 72, color: '#A855F7', descriptionEn: 'RedBox adapts Single Attached Nodes (SAN) or bridges an HSR daisy-chain bay ring into the PRP station bus.', descriptionTe: 'SAN పరికరాలను లేదా HSR బే రింగ్‌ను PRP స్టేషన్ బస్‌తో అనుసంధానించే RedBox.', linkedTab: 'NETWORK' },
    ],
    connections: [
      { from: 'PRP-DANP', to: 'PRP-LANA', label: 'Port A (Fiber)', color: '#00CFFF' },
      { from: 'PRP-DANP', to: 'PRP-LANB', label: 'Port B (Fiber)', color: '#22C55E' },
      { from: 'PRP-REDBOX', to: 'PRP-LANA', label: 'RedBox Port A', color: '#00CFFF' },
      { from: 'PRP-REDBOX', to: 'PRP-LANB', label: 'RedBox Port B', color: '#22C55E' },
    ],
  },
  {
    id: 'DIAG-16-DATA-MODEL',
    number: 16,
    titleEn: 'IEC 61850 Object-Oriented Data Model Hierarchy — PD → LD → LN → DO → DA',
    titleTe: 'IEC 61850 డేటా మోడల్ క్రమం — PD → LD → LN → DO → DA',
    category: 'IEC 61850 & Protocols',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Visual breakdown of an IEC 61850 object reference: Physical Device (IED_132_L1) → Logical Device (Application) → Logical Node (XCBR1 / MMXU1 / PTOC1) → Data Object (Pos / TotW / Str) → Data Attributes (stVal, q, t) with Functional Constraints.',
    summaryTe: 'Physical Device (IED_132_L1) → Logical Device (Application) → Logical Node (XCBR1) → Data Object (Pos) → Data Attributes (stVal, q, t) యొక్క పూర్తి నిర్మాణాన్ని చూపుతుంది.',
    guidedStepsEn: [
      'Physical Device (PD): The physical protection/control relay with its IP address on the station bus (e.g., IED_132_L1 at 10.132.10.11).',
      'Logical Device (LD): Virtual functional grouping inside the IED (e.g., Application, Protection, Measurements).',
      'Logical Node (LN): Standardized 4-letter class from IEC 61850-7-4 (XCBR = Circuit Breaker, MMXU = Measurement, PTOC = Time Overcurrent, PTRC = Protection Trip Conditioning).',
      'Data Object (DO) & Common Data Class (CDC - IEC 61850-7-3): e.g., Pos (DPC - Double Point Control), TotW (MV - Measured Value), Op (ACT - Protection Activation).',
      'Data Attribute (DA) & Functional Constraint (FC - IEC 61850-7-2): stVal [ST], mag.f [MX], q [ST/MX], t [ST/MX], Oper.ctlVal [CO].',
    ],
    guidedStepsTe: [
      'Physical Device (PD): IP అడ్రస్ కలిగిన భౌతిక రిలే (ఉదా: 10.132.10.11 వద్ద ఉన్న IED_132_L1).',
      'Logical Device (LD): రిలే లోపల ఉండే ఫంక్షనల్ విభాగం (ఉదా: Application, Protection, Meas).',
      'Logical Node (LN): IEC 61850-7-4 ప్రకారం 4-అక్షరాల క్లాస్ (XCBR = బ్రేకర్, MMXU = కొలతలు, PTOC = ఓవర్‌కరెంట్).',
      'Data Object (DO) & CDC: ఉదాహరణకు Pos (DPC), TotW (MV), Op (ACT).',
      'Data Attribute (DA) & FC: stVal [ST] (స్థితి), mag.f [MX] (అనలాగ్ విలువ), q (Quality), t (Timestamp).',
    ],
    hotspots: [
      { id: 'DM-PD', label: 'Physical Device (PD)', sublabel: 'IED_132_L1 (Siemens 7SA87)', x: 30, y: 110, w: 155, h: 72, color: '#00CFFF', descriptionEn: 'Physical relay hardware connected to Station Bus at 10.132.10.11 / 10.132.20.11.', descriptionTe: '10.132.10.11 IP వద్ద స్టేషన్ బస్‌కు కనెక్ట్ అయిన భౌతిక IED.', linkedTab: 'IED' },
      { id: 'DM-LD', label: 'Logical Device (LD)', sublabel: 'IED_132_L1Application', x: 215, y: 110, w: 165, h: 72, color: '#38BDF8', descriptionEn: 'Container grouping related Logical Nodes (always includes LLN0 and LPHD1).', descriptionTe: 'సంబంధిత Logical Nodes అన్నింటినీ కలిపి ఉంచే కంటైనర్ (LLN0 మరియు LPHD1 తో సహా).', linkedTab: 'MMS' },
      { id: 'DM-LN', label: 'Logical Node (LN)', sublabel: 'XCBR1 / MMXU1 / PTOC1', x: 410, y: 110, w: 165, h: 72, color: '#22C55E', descriptionEn: 'IEC 61850-7-4 standardized function object: XCBR1 (Breaker), CSWI1 (Switch Controller), CILO1 (Interlocking).', descriptionTe: 'IEC 61850-7-4 ప్రామాణిక ఫంక్షన్ ఆబ్జెక్ట్ (XCBR1, CSWI1, CILO1, MMXU1, PTOC1).', linkedTab: 'MMS' },
      { id: 'DM-DO', label: 'Data Object (DO • CDC)', sublabel: 'Pos (DPC) / TotW (MV)', x: 605, y: 110, w: 155, h: 72, color: '#FACC15', descriptionEn: 'Instance of a Common Data Class (IEC 61850-7-3) such as DPC (Double Point Control) or MV (Measured Value).', descriptionTe: 'IEC 61850-7-3 Common Data Class యొక్క ఆబ్జెక్ట్ (DPC, SPS, MV, CMV, ACT).', linkedTab: 'SIGNALS' },
      { id: 'DM-DA', label: 'Data Attributes (DA • FC)', sublabel: '.stVal [ST] • .q • .t', x: 790, y: 110, w: 160, h: 72, color: '#EC4899', descriptionEn: 'Leaf attributes: stVal (intermediate-state | off | on | bad-state), q (validity/test/operatorBlocked), t (UTC 64-bit timestamp).', descriptionTe: 'చివరి స్థాయి అట్రిబ్యూట్లు: stVal (బ్రేకర్ స్థితి), q (క్వాలిటీ), t (UTC టైమ్‌స్టాంప్).', linkedTab: 'SIGNALS' },
    ],
    connections: [
      { from: 'DM-PD', to: 'DM-LD', label: 'contains', color: '#00CFFF' },
      { from: 'DM-LD', to: 'DM-LN', label: '/', color: '#38BDF8' },
      { from: 'DM-LN', to: 'DM-DO', label: '.', color: '#22C55E' },
      { from: 'DM-DO', to: 'DM-DA', label: '.', color: '#FACC15' },
    ],
  },
  {
    id: 'DIAG-18-GOOSE-MMS',
    number: 18,
    titleEn: 'GOOSE (Layer-2 Multicast ≤ 4 ms) vs MMS (TCP/IP Port 102 Client-Server) Stack & Flow',
    titleTe: 'GOOSE (Layer-2 Multicast ≤ 4 ms) మరియు MMS (TCP/IP Port 102) ప్రోటోకాల్ నిర్మాణం',
    category: 'IEC 61850 & Protocols',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Contrasts OSI 7-layer TCP/IP MMS stack (Port 102, BRCB/URCB reports & SBO control to SCADA) against the direct Layer-2 Ethernet GOOSE stack (Ethertype 0x88B8, VLAN 20, 802.1p Priority 4, stNum/sqNum retransmission curve) between Bay IEDs.',
    summaryTe: 'TCP/IP ఆధారిత MMS (Port 102 - SCADA రిపోర్టింగ్ & కంట్రోల్) మరియు నేరుగా Layer-2 Ethernet పై పనిచేసే వేగవంతమైన GOOSE (0x88B8 - IED-to-IED ట్రిప్ & ఇంటర్‌లాకింగ్) మధ్య తేడాను చూపుతుంది.',
    guidedStepsEn: [
      'GOOSE bypasses TCP/IP (Network/Transport layers) and maps directly onto IEEE 802.3 Ethernet (Ethertype 0x88B8) with IEEE 802.1Q VLAN 20 and Priority 4 — achieving ≤ 3–4 ms peer-to-peer transfer time.',
      'When a state change occurs (e.g., PTRC1.Tr.general = TRUE), GOOSE increments stNum by 1, resets sqNum to 0, and bursts frames at T1 (2 ms), 2·T1 (4 ms), 4·T1 (8 ms) up to T0 (1000 ms).',
      'MMS runs over TCP/IP (Port 102 + ISO COTP + OSI Session/Presentation) to provide confirmed association, directory browsing, BRCB buffered reporting (with 1 ms SOE timestamps), and Select-Before-Operate (SBO) breaker control.',
    ],
    guidedStepsTe: [
      'GOOSE మెసేజ్‌లు TCP/IP లేయర్‌లను దాటవేసి నేరుగా Ethernet Data Link Layer (Ethertype 0x88B8, VLAN 20, Priority 4) పై వెళ్తాయి — అందుకే ≤ 4 ms లోపే చేరుకుంటాయి.',
      'కొత్త ప్రొటెక్షన్ ఈవెంట్ వచ్చినప్పుడు stNum +1 పెరుగుతుంది, sqNum = 0 అవుతుంది, మరియు 2 ms → 4 ms → 8 ms → 1000 ms చొప్పున వేగంగా రీ-ట్రాన్స్‌మిట్ అవుతుంది.',
      'MMS అనేది TCP Port 102 పై నడుస్తూ SCADA కు BRCB రిపోర్టులు మరియు SBO బ్రేకర్ కమాండ్లను అందిస్తుంది.',
    ],
    hotspots: [
      { id: 'GM-PUB', label: 'GOOSE Publisher IED', sublabel: 'stNum++ • sqNum=0 • 0x88B8', x: 40, y: 40, w: 250, h: 72, color: '#22C55E', descriptionEn: 'Publishes GoCB dataset to Multicast MAC 01-0C-CD-01-00-01 on VLAN 20 with APPID 0x0001.', descriptionTe: 'VLAN 20 పై Multicast MAC 01-0C-CD-01-00-01 మరియు APPID 0x0001 తో GOOSE ఫ్రేమ్‌లను పబ్లిష్ చేసే IED.', linkedTab: 'GOOSE' },
      { id: 'GM-SW', label: 'IEEE 802.1Q Switch (VLAN + QoS)', sublabel: 'VLAN 20 (GOOSE) • VLAN 10 (MMS)', x: 355, y: 95, w: 240, h: 72, color: '#00CFFF', descriptionEn: 'Hardware QoS queue prioritizes 802.1p Priority 4 GOOSE frames ahead of bulk TCP traffic.', descriptionTe: '802.1p Priority 4 ఉన్న GOOSE ఫ్రేమ్‌లకు అత్యధిక ప్రాధాన్యతనిచ్చే మేనేజ్డ్ స్విచ్.', linkedTab: 'NETWORK' },
      { id: 'GM-SUB', label: 'GOOSE Subscriber IED (ExtRef)', sublabel: 'Checks MAC, APPID, GoCBRef, confRev', x: 665, y: 40, w: 255, h: 72, color: '#FACC15', descriptionEn: 'Validates GoCBRef, DatSet, APPID, confRev, and TimeAllowedToLive before asserting internal virtual binary inputs.', descriptionTe: 'GoCBRef, DatSet, APPID మరియు confRev సరిపోలాయో లేదో తనిఖీ చేసి ట్రిప్/ఇంటర్‌లాక్ అమలు చేసే సబ్‌స్క్రైబర్ IED.', linkedTab: 'GOOSE' },
      { id: 'GM-MMS', label: 'MMS Server (IED) ⇄ MMS Client (SCADA)', sublabel: 'TCP Port 102 • BRCB01 • SBO Control', x: 40, y: 175, w: 880, h: 62, color: '#38BDF8', descriptionEn: 'Connection-oriented TCP/102 association carrying BRCB buffered reports (dchg/qchg/gi) and Select-Before-Operate (CSWI1.Pos.SBOw → Oper) commands.', descriptionTe: 'TCP Port 102 ద్వారా BRCB రిపోర్టులు మరియు SBO బ్రేకర్ కమాండ్లను మార్పిడి చేసే MMS క్లయింట్-సర్వర్ కనెక్షన్.', linkedTab: 'MMS' },
    ],
    connections: [
      { from: 'GM-PUB', to: 'GM-SW', label: 'L2 Multicast (2ms)', color: '#22C55E' },
      { from: 'GM-SW', to: 'GM-SUB', label: 'VLAN 20 (<4ms)', color: '#FACC15' },
      { from: 'GM-SW', to: 'GM-MMS', label: 'TCP/102 (VLAN 10)', color: '#38BDF8' },
    ],
  },
  {
    id: 'DIAG-20-SCL-FLOW',
    number: 20,
    titleEn: 'IEC 61850-6 SCL Engineering Workflow — ICD + SSD → SCD → CID → Testing',
    titleTe: 'IEC 61850-6 SCL ఇంజనీరింగ్ వర్క్‌ఫ్లో — ICD + SSD → SCD → CID → టెస్టింగ్',
    category: 'SCADA & Testing',
    isIllustrativeTrainingExample: false,
    summaryEn: 'Complete IEC 61850-6 Substation Configuration Language (SCL) engineering pipeline showing how vendor ICD templates and system SSD topology combine in the System Configurator to produce the master SCD and per-relay CID files.',
    summaryTe: 'వెండర్ ICD ఫైల్స్ మరియు SSD టోపాలజీ కలిపి System Configurator లో మాస్టర్ SCD ఫైల్ మరియు ప్రతి రిలేకు CID ఫైల్స్ ఎలా తయారవుతాయో చూపుతుంది.',
    guidedStepsEn: [
      '1. ICD (IED Capability Description): Unconfigured capability template from each vendor tool (DIGSI 5, PCM600, Easergy, EnerVista).',
      '2. SSD (System Specification Description): Substation single-line topology and required LNs mapped to bays.',
      '3. IID (Instantiated IED Description): Project-specific single-IED instance with assigned IED name and IP.',
      '4. SCD (Substation Configuration Description): Complete station master XML containing all IEDs, SubNetworks, DataSets, BRCBs, GoCBs, and inter-IED <Inputs><ExtRef> bindings.',
      '5. CID (Configured IED Description): Stripped/compiled per-IED file downloaded into the physical relay for FAT/SAT.',
    ],
    guidedStepsTe: [
      '1. ICD: రిలే తయారీదారు నుండి వచ్చే ప్రాథమిక సామర్థ్య ఫైల్.',
      '2. SSD: సబ్‌స్టేషన్ SLD టోపాలజీ మరియు బే అవసరాలను నిర్వచించే ఫైల్.',
      '3. IID: నిర్దిష్ట IED పేరు మరియు IP కేటాయించబడిన సింగిల్-IED ఫైల్.',
      '4. SCD: సబ్‌స్టేషన్ లోని అన్ని IEDలు, IPలు, DataSets, BRCBలు, GoCBలు మరియు <ExtRef> మ్యాపింగ్‌లతో కూడిన మాస్టర్ ఫైల్.',
      '5. CID: SCD నుండి ప్రతి రిలే కోసం వేరుచేసి ఆ భౌతిక రిలేలోకి డౌన్‌లోడ్ చేసే కాన్ఫిగరేషన్ ఫైల్.',
    ],
    hotspots: [
      { id: 'SCL-ICD', label: '1. Vendor .ICD & .IID Files', sublabel: '7SA87.icd • REF615.icd • P633.icd', x: 35, y: 110, w: 195, h: 72, color: '#00CFFF', descriptionEn: 'XML templates defining supported Logical Nodes, CDCs, and service capabilities of each relay model.', descriptionTe: 'ప్రతి రిలే మోడల్ సపోర్ట్ చేసే Logical Nodes మరియు సేవలను తెలిపే XML టెంప్లేట్.', linkedTab: 'SIGNALS' },
      { id: 'SCL-SSD', label: '2. System Spec (.SSD)', sublabel: '132/33/11 kV SLD & LN Binding', x: 260, y: 110, w: 195, h: 72, color: '#38BDF8', descriptionEn: 'Defines VoltageLevels (132kV, 33kV, 11kV), Bays, ConductingEquipment, and required Logical Nodes.', descriptionTe: 'వోల్టేజ్ స్థాయిలు, బేలు మరియు ప్రైమరీ పరికరాలను నిర్వచించే SSD ఫైల్.', linkedTab: 'SIGNALS' },
      { id: 'SCL-SCD', label: '3. Master Station File (.SCD)', sublabel: 'All IEDs + SubNetwork + <ExtRef>', x: 485, y: 110, w: 215, h: 72, color: '#22C55E', descriptionEn: 'Single source of truth for the entire substation: binds GOOSE Publisher DataSets to Subscriber <Inputs><ExtRef> and assigns BRCB clients.', descriptionTe: 'మొత్తం సబ్‌స్టేషన్ యొక్క మాస్టర్ ఫైల్: ఇందులో అన్ని IEDల మధ్య GOOSE <ExtRef> మరియు MMS BRCB మ్యాపింగ్ ఉంటుంది.', linkedTab: 'SIGNALS' },
      { id: 'SCL-CID', label: '4. Per-Relay .CID Download', sublabel: 'Loaded into Physical IED & SCADA', x: 730, y: 110, w: 195, h: 72, color: '#FACC15', descriptionEn: 'Exported from vendor IED tool and downloaded to the physical relay; SCD is also imported into the SCADA MMS Client and Station Gateway.', descriptionTe: 'భౌతిక రిలేలోకి డౌన్‌లోడ్ చేసే CID ఫైల్. అలాగే SCD ఫైల్‌ను SCADA మరియు Gateway లోకి ఇంపోర్ట్ చేస్తారు.', linkedTab: 'FATSAT' },
    ],
    connections: [
      { from: 'SCL-ICD', to: 'SCL-SCD', label: 'Import Capabilities', color: '#00CFFF' },
      { from: 'SCL-SSD', to: 'SCL-SCD', label: 'Import SLD Topology', color: '#38BDF8' },
      { from: 'SCL-SCD', to: 'SCL-CID', label: 'Export & Download', color: '#22C55E' },
    ],
  },
];

// Additional 17 diagrams in the 24-diagram library so all 24 required diagrams are searchable and interactive!
const EXTRA_DIAGRAM_SPECS: Omit<AcademyDiagramSpec, 'hotspots' | 'connections'>[] = [
  { id: 'DIAG-06-DC-SUPPLY', number: 6, titleEn: '110V / 220V DC Auxiliary Supply & Dual Battery Charger Architecture', titleTe: '110V / 220V DC ఆగ్జిలరీ సప్లై & డ్యూయల్ బ్యాటరీ ఛార్జర్ ఆర్కిటెక్చర్', category: 'Power & Drawings', isIllustrativeTrainingExample: false, summaryEn: 'Dual Float-cum-Boost Chargers, Ni-Cd/VRLA Battery Banks 1 & 2, DC Bus A & B with Bus Coupler, Earth-Fault Monitor (64DC), and feeders to TC1, TC2, IED power supplies, and spring-charging motors.', summaryTe: 'డ్యూయల్ బ్యాటరీ ఛార్జర్లు, బ్యాటరీ బ్యాంకులు 1 & 2, DC Bus A & B, DC ఎర్త్ ఫాల్ట్ మానిటర్ మరియు TC1/TC2/IED ఫీడర్ల నిర్మాణం.', guidedStepsEn: ['Keep DC Bus A (+DC1) and DC Bus B (+DC2) segregated so a single DC fault never disables both Trip Coil 1 and Trip Coil 2.', 'Monitor positive-to-earth and negative-to-earth insulation resistance continuously via the DC Earth Fault Relay.'], guidedStepsTe: ['TC1 మరియు TC2 ఒకేసారి విఫలం కాకుండా DC Bus A మరియు DC Bus B లను వేరుగా ఉంచాలి.', 'DC Earth Fault రిలే ద్వారా పాజిటివ్-టు-ఎర్త్ మరియు నెగటివ్-టు-ఎర్త్ ఇన్సులేషన్‌ను నిరంతరం పర్యవేక్షించాలి.'] },
  { id: 'DIAG-08-STATION-ARCH', number: 8, titleEn: 'Station-Level Redundant Server, HMI, Historian & Time Server Architecture', titleTe: 'Station-Level రిడండెంట్ సర్వర్, HMI, హిస్టోరియన్ & టైమ్ సర్వర్ ఆర్కిటెక్చర్', category: 'SAS Architecture', isIllustrativeTrainingExample: false, summaryEn: 'Hot-standby SCADA Servers A & B, Dual-Monitor Operator HMI Workstations, Engineering Workstation (EWS), OPC UA Historian, and Meinberg GPS/IRIG-B/PTP Grandmaster Clock.', summaryTe: 'హాట్-స్టాండ్‌బై SCADA సర్వర్లు A & B, డ్యూయల్-మానిటర్ HMI, ఇంజనీరింగ్ వర్క్‌స్టేషన్, OPC UA హిస్టోరియన్ మరియు PTP గ్రాండ్‌మాస్టర్ క్లాక్.', guidedStepsEn: ['Both SCADA Server A and Server B maintain active MMS associations to all 18 IEDs using separate BRCB instances (brcbSt01 for Server A, brcbSt02 for Server B).'], guidedStepsTe: ['SCADA Server A (brcbSt01) మరియు Server B (brcbSt02) వేర్వేరు BRCB ఇన్‌స్టాన్స్‌ల ద్వారా అన్ని 18 IEDలతో ఏకకాలంలో MMS కనెక్షన్ కలిగి ఉంటాయి.'] },
  { id: 'DIAG-09-BAY-ARCH', number: 9, titleEn: 'Bay-Level Protection Relay, Bay Control Unit (BCU) & Metering Architecture', titleTe: 'Bay-Level ప్రొటెక్షన్ రిలే, BCU & మీటరింగ్ ఆర్కిటెక్చర్', category: 'SAS Architecture', isIllustrativeTrainingExample: false, summaryEn: 'Shows Main-1 / Main-2 Protection Relays, Bay Control Unit (C264 / REC615), Multifunction Energy Meter (Modbus TCP), Local Mimic Annunciator, and Bay Local/Remote Selector (43LR).', summaryTe: 'Main-1 / Main-2 ప్రొటెక్షన్ రిలేలు, Bay Control Unit, మల్టీఫంక్షన్ ఎనర్జీ మీటర్ మరియు 43LR Local/Remote స్విచ్ అమరిక.', guidedStepsEn: ['Protection functions (21, 87T, 50/51) execute autonomously inside the Bay IED even if the Station Bus or SCADA server is completely offline.'], guidedStepsTe: ['SCADA సర్వర్ లేదా స్టేషన్ బస్ ఆఫ్‌లైన్‌లో ఉన్నప్పటికీ Bay IED లోని ప్రొటెక్షన్ ఫంక్షన్లు (21, 87T, 50/51) స్వతంత్రంగా పనిచేస్తాయి.'] },
  { id: 'DIAG-10-PROCESS-ARCH', number: 10, titleEn: 'Process-Level Hardwired MK vs Stand-Alone Merging Unit (SAMU) & PIU Architecture', titleTe: 'Process-Level హార్డ్‌వైర్డ్ MK మరియు Merging Unit (SAMU) & PIU ఆర్కిటెక్చర్', category: 'SAS Architecture', isIllustrativeTrainingExample: false, summaryEn: 'Compares conventional copper CT/VT/DI/DO wiring from the switchyard Marshalling Kiosk against digital Process Interface Units (PIU) and Merging Units (MU) publishing IEC 61850-9-2 LE Sampled Values.', summaryTe: 'సాంప్రదాయ కాపర్ CT/VT/DI/DO వైరింగ్ మరియు డిజిటల్ Merging Unit (IEC 61850-9-2 LE Sampled Values) & PIU నిర్మాణాన్ని పోల్చి చూపుతుంది.', guidedStepsEn: ['Conventional/Hybrid substations wire CT/VT and 52a/52b directly to Bay IEDs; full Process Bus substations digitize CT/VT at the switchyard via Merging Units synchronized to ±1 µs via IEEE 1588 PTP.'], guidedStepsTe: ['హైబ్రిడ్ సబ్‌స్టేషన్లలో CT/VT నేరుగా IEDకి వైరింగ్ చేయబడతాయి; పూర్తి డిజిటల్ సబ్‌స్టేషన్లలో Merging Unit ద్వారా Sampled Values ఫైబర్ పై పంపబడతాయి.'] },
  { id: 'DIAG-11-STATION-BUS', number: 11, titleEn: 'Station Bus Logical & Physical Architecture (IEC 61850-8-1)', titleTe: 'Station Bus లాజికల్ & ఫిజికల్ ఆర్కిటెక్చర్ (IEC 61850-8-1)', category: 'Network & Redundancy', isIllustrativeTrainingExample: false, summaryEn: 'Physical 100BASE-FX / 1000BASE-LX fiber star/ring vs logical VLAN segmentation (VLAN 10 MMS, VLAN 20 GOOSE, VLAN 30 Engineering, VLAN 40 PTP Time Sync).', summaryTe: 'ఫైబర్ ఆప్టిక్ ఫిజికల్ కనెక్షన్లు మరియు VLAN విభజన (VLAN 10 MMS, VLAN 20 GOOSE, VLAN 30 Engineering, VLAN 40 PTP).', guidedStepsEn: ['Distinguish physical fiber ports (Gi1/1..Gi1/8) from logical traffic flows (unicast TCP/102 MMS vs layer-2 multicast 0x88B8 GOOSE).'], guidedStepsTe: ['భౌతిక ఫైబర్ పోర్టులకు మరియు లాజికల్ ట్రాఫిక్ ప్రవాహాలకు (Unicast TCP/102 MMS vs Multicast 0x88B8 GOOSE) మధ్య తేడాను స్పష్టంగా గుర్తించాలి.'] },
  { id: 'DIAG-12-PROCESS-BUS', number: 12, titleEn: 'Process Bus Architecture — IEC 61850-9-2 LE Sampled Values & Process GOOSE', titleTe: 'Process Bus ఆర్కిటెక్చర్ — IEC 61850-9-2 LE Sampled Values & Process GOOSE', category: 'Network & Redundancy', isIllustrativeTrainingExample: true, summaryEn: 'High-bandwidth bay-segregated Ethernet Process Bus carrying 4000 Hz (80 samples/cycle at 50 Hz) Sampled Values (0x88BA, Multicast MAC 01-0C-CD-04-xx-xx) and trip GOOSE to PIU.', summaryTe: '50 Hz వద్ద సెకనుకు 4000 శాంపిల్స్ (80 samples/cycle) పంపే IEC 61850-9-2 LE Sampled Values (0x88BA) మరియు PIU ట్రిప్ GOOSE నెట్‌వర్క్.', guidedStepsEn: ['Each Merging Unit stream consumes ~4.8–5.5 Mbps; keep Process Bus traffic isolated per bay or VLAN so high-rate SV multicast never floods Station Bus MMS ports.'], guidedStepsTe: ['ప్రతి Merging Unit సుమారు 5 Mbps బ్యాండ్‌విడ్త్ ఉపయోగిస్తుంది; అందుకే Process Bus ను Station Bus నుండి VLAN లేదా ప్రత్యేక స్విచ్ ద్వారా వేరు చేయాలి.'] },
  { id: 'DIAG-14-HSR-RING', number: 14, titleEn: 'HSR (High-Availability Seamless Redundancy) Cut-Through Bay Ring — IEC 62439-3 Clause 5', titleTe: 'HSR కట్-త్రూ బే రింగ్ టోపాలజీ — IEC 62439-3 Clause 5', category: 'Network & Redundancy', isIllustrativeTrainingExample: false, summaryEn: 'Zero-recovery-time daisy-chain ring topology where each IED forwards frames in both directions (Port A clockwise, Port B counter-clockwise) with a 6-byte HSR header.', summaryTe: 'ప్రతి IED ఫ్రేమ్‌ను రెండు దిశలలో (Port A మరియు Port B) ఫార్వార్డ్ చేసే జీరో-రికవరీ-టైమ్ HSR రింగ్ టోపాలజీ.', guidedStepsEn: ['If any single fiber link in the HSR ring breaks, frames still reach every node via the opposite direction in 0 ms without STP reconvergence.'], guidedStepsTe: ['HSR రింగ్‌లో ఏదైనా ఒక ఫైబర్ కట్ అయినా, రెండవ దిశ నుండి 0 ms లో డేటా నిరంతరాయంగా చేరుతుంది.'] },
  { id: 'DIAG-15-FIBER-TOPOLOGY', number: 15, titleEn: 'Substation Fiber-Optic Patch Panel (LIU), Splice Tray & Transceiver Topology', titleTe: 'సబ్‌స్టేషన్ ఫైబర్ ఆప్టిక్ LIU ప్యాచ్ ప్యానెల్ & SFP టోపాలజీ', category: 'Network & Redundancy', isIllustrativeTrainingExample: false, summaryEn: 'Shows IED LC Duplex Multimode (1310 nm) / Singlemode (1310 nm LX) SFP ports → Panel LIU Patch Cord → Armored Outdoor Fiber Cable → Switch Rack LIU → Hirschmann SFP Port (Tx → Rx crossover).', summaryTe: 'IED SFP పోర్ట్ (LC Duplex) → LIU ప్యాచ్ ప్యానెల్ → ఆర్మర్డ్ ఫైబర్ కేబుల్ → స్విచ్ ర్యాక్ LIU → Hirschmann స్విచ్ SFP పోర్ట్ (Tx → Rx క్రాస్-ఓవర్).', guidedStepsEn: ['Always verify Tx-to-Rx optical crossover and measure optical power budget with an Optical Power Meter (OPM) and OTDR before commissioning.'], guidedStepsTe: ['కమిషనింగ్ సమయంలో Tx నుండి Rx క్రాస్-ఓవర్ మరియు Optical Power Meter (OPM) తో dBm సిగ్నల్ స్థాయిని తప్పనిసరిగా తనిఖీ చేయాలి.'] },
  { id: 'DIAG-17-MMS-REPORTING', number: 17, titleEn: 'IEC 61850 MMS Association, BRCB Buffered Reporting & SBO Control Sequence', titleTe: 'IEC 61850 MMS అసోసియేషన్, BRCB రిపోర్టింగ్ & SBO కంట్రోల్ సీక్వెన్స్', category: 'IEC 61850 & Protocols', isIllustrativeTrainingExample: false, summaryEn: 'Step-by-step sequence: TCP SYN/ACK (Port 102) → ISO COTP → MMS Initiate → SetBRCBValues (RptEna=TRUE, OptFlds, TrgOps, GI=TRUE) → Spontaneous dchg/qchg Report with EntryID buffer.', summaryTe: 'TCP Port 102 కనెక్షన్ → MMS Initiate → BRCB ఎనేబుల్ (RptEna=TRUE, GI=TRUE) → dchg/qchg రిపోర్ట్ మరియు EntryID బఫర్ సీక్వెన్స్.', guidedStepsEn: ['Buffered Report Control Blocks (BRCB) buffer SOE events in IED RAM during link loss and replay them via EntryID resynchronization upon reconnect.'], guidedStepsTe: ['నెట్‌వర్క్ కనెక్షన్ పోయినప్పుడు BRCB తన మెమరీలో ఈవెంట్లను నిల్వ ఉంచుకుని, కనెక్షన్ రాగానే EntryID ద్వారా SCADA కు పంపుతుంది.'] },
  { id: 'DIAG-19-SV-CONTROL', number: 19, titleEn: 'Select-Before-Operate (SBO) Enhanced Security & Sampled Values Timing Diagram', titleTe: 'Select-Before-Operate (SBO) ఎన్హాన్స్‌డ్ సెక్యూరిటీ & Sampled Values టైమింగ్', category: 'IEC 61850 & Protocols', isIllustrativeTrainingExample: false, summaryEn: 'Illustrates the 4-step SBOes state machine: 1) SelectWithValue (SBOw) → 2) CILO1 & Loc check + SBOw.rsp+ → 3) Operate (Oper) → 4) XCBR1 actuation + CommandTermination (AddCause=0).', summaryTe: '4-దశల SBOes ప్రక్రియ: 1) SelectWithValue (SBOw) → 2) CILO1 & Local/Remote తనిఖీ → 3) Operate (Oper) → 4) బ్రేకర్ ఆపరేషన్ + CommandTermination.', guidedStepsEn: ['If Operate is not received within sboTimeout (e.g., 15 s) or if CILO1.EnaOpn/EnaCls is FALSE, the reservation cancels and returns AddCause (Blocked-by-interlocking).'], guidedStepsTe: ['నిర్ణీత సమయంలోగా (ఉదా: 15 సెకన్లు) Operate రాకపోయినా లేదా CILO1 ఇంటర్‌లాక్ అనుమతించకపోయినా కమాండ్ రద్దయి AddCause ఎర్రర్ వస్తుంది.'] },
  { id: 'DIAG-21-SIGNAL-CHAIN', number: 21, titleEn: 'End-to-End SAS Signal Mapping Chain — Field Contact to HMI & RCC IOA', titleTe: 'ఎండ్-టు-ఎండ్ SAS సిగ్నల్ మ్యాపింగ్ చైన్ — ఫీల్డ్ కాంటాక్ట్ నుండి HMI & RCC IOA వరకు', category: 'SCADA & Testing', isIllustrativeTrainingExample: false, summaryEn: 'Traces Signal #1 (Circuit Breaker Position): 52a/52b Aux Contact → IED DI1/DI2 → XCBR1.Pos.stVal/q/t [ST] → dsStatus DataSet → BRCB01 → SCADA Tag SAS_132_L1_CB_POS_DP → IEC-104 IOA 1001.', summaryTe: '52a/52b కాంటాక్ట్ → IED DI1/DI2 → XCBR1.Pos.stVal → dsStatus → BRCB01 → SCADA Tag → IEC-104 IOA 1001 వరకు పూర్తి సిగ్నల్ ప్రయాణం.', guidedStepsEn: ['Every point-to-point FAT/SAT test verifies this entire chain including value, quality (q=0x0000 Good), and 1 ms SOE timestamp (t).'], guidedStepsTe: ['FAT/SAT పాయింట్-టు-పాయింట్ టెస్ట్‌లో విలువ (stVal), క్వాలిటీ (q) మరియు 1 ms SOE టైమ్‌స్టాంప్ (t) అన్ని దశలలో సరిచూస్తారు.'] },
  { id: 'DIAG-22-SCADA-ARCH', number: 22, titleEn: 'Redundant SCADA Server, Operator HMI, Alarm/SOE Engine & Historian Architecture', titleTe: 'రిడండెంట్ SCADA సర్వర్, ఆపరేటర్ HMI, అలారం/SOE ఇంజిన్ & హిస్టోరియన్ ఆర్కిటెక్చర్', category: 'SCADA & Testing', isIllustrativeTrainingExample: false, summaryEn: 'Shows real-time process database synchronization between SCADA Server A (10.132.10.200) and Server B (10.132.10.201), SLD mimic rendering, alarm shelving/acknowledgment, and OPC UA historian archiving.', summaryTe: 'SCADA Server A మరియు Server B మధ్య డేటాబేస్ సింక్రొనైజేషన్, SLD మిమిక్, అలారం అక్నాలెడ్జ్‌మెంట్ మరియు OPC UA హిస్టోరియన్ ఆర్కిటెక్చర్.', guidedStepsEn: ['Verify automatic failover from SCADA Server A to Server B without losing unacknowledged alarms or SOE buffer entries.'], guidedStepsTe: ['SCADA Server A ఆఫ్ అయినప్పుడు Server B కి ఎటువంటి అలారం లేదా SOE డేటా నష్టం లేకుండా ఆటోమేటిక్ ఫెయిల్‌ఓవర్ జరిగేలా పరీక్షించాలి.'] },
  { id: 'DIAG-23-GATEWAY-RCC', number: 23, titleEn: 'Station Gateway & Remote Control Center (RCC / SLDC) Telecontrol Architecture', titleTe: 'స్టేషన్ గేట్‌వే & రిమోట్ కంట్రోల్ సెంటర్ (RCC / SLDC) టెలికంట్రోల్ ఆర్కిటెక్చర్', category: 'SCADA & Testing', isIllustrativeTrainingExample: false, summaryEn: 'Redundant Station Gateways (GTW-RCC-01/02) acting as IEC 61850 MMS Clients on the Station Bus and IEC 60870-5-104 Servers (TCP 2404, ASDU CASDU=1) toward Main & Backup SLDC/RCC over MPLS/OPGW WAN.', summaryTe: 'స్టేషన్ బస్ వైపు IEC 61850 MMS క్లయింట్‌గా మరియు SLDC/RCC వైపు IEC 60870-5-104 సర్వర్‌గా (TCP 2404) పనిచేసే స్టేషన్ గేట్‌వే.', guidedStepsEn: ['When Station Control Authority is set to SUB-HMI, the Gateway blocks incoming IEC-104 Type 45/46 remote commands from RCC while continuing upward telemetry reporting.'], guidedStepsTe: ['కంట్రోల్ అథారిటీ SUB-HMI లో ఉన్నప్పుడు గేట్‌వే RCC నుండి వచ్చే IEC-104 కమాండ్లను బ్లాక్ చేసి, కేవలం టెలిమెట్రీ డేటాను మాత్రమే పంపుతుంది.'] },
  { id: 'DIAG-24-FATSAT-FLOW', number: 24, titleEn: 'Complete FAT & SAT Commissioning Verification Workflow', titleTe: 'పూర్తి FAT & SAT కమిషనింగ్ వెరిఫికేషన్ వర్క్‌ఫ్లో', category: 'SCADA & Testing', isIllustrativeTrainingExample: false, summaryEn: 'Sequential commissioning gate flow: Visual & Wiring Check → Insulation/Megger → IED CID/SCD Audit → PRP/PTP Network Test → Secondary Injection → Point-to-Point SCADA/RCC → Interlock & Trip Test → Punch-List Signoff.', summaryTe: 'విజువల్ తనిఖీ → మెగ్గర్ → CID/SCD ఆడిట్ → PRP/PTP నెట్‌వర్క్ టెస్ట్ → సెకండరీ ఇంజెక్షన్ → SCADA/RCC పాయింట్-టు-పాయింట్ → ఇంటర్‌లాక్ & ట్రిప్ టెస్ట్ → సైన్-ఆఫ్.', guidedStepsEn: ['Never energize primary switchgear until 100% of Category-A safety, protection trip, and interlocking punch-list items are closed and signed off.'], guidedStepsTe: ['Category-A భద్రత, ప్రొటెక్షన్ ట్రిప్ మరియు ఇంటర్‌లాకింగ్ పరీక్షలు 100% పూర్తయి సంతకం చేసే వరకు ప్రైమరీ పరికరాలను ఎనర్జైజ్ చేయకూడదు.'] },
];

for (const extra of EXTRA_DIAGRAM_SPECS) {
  ENGINEERING_DIAGRAM_LIBRARY.push({
    ...extra,
    hotspots: [
      { id: `${extra.id}-1`, label: extra.titleEn.split('—')[0].trim(), sublabel: 'Stage 1 • Input / Source', x: 45, y: 105, w: 255, h: 74, color: '#00CFFF', descriptionEn: extra.summaryEn, descriptionTe: extra.summaryTe, linkedTab: 'SLD' },
      { id: `${extra.id}-2`, label: 'Core Processing / Transport', sublabel: 'Stage 2 • IEC 61850 / Logic', x: 350, y: 105, w: 255, h: 74, color: '#22C55E', descriptionEn: extra.guidedStepsEn[0], descriptionTe: extra.guidedStepsTe[0], linkedTab: 'NETWORK' },
      { id: `${extra.id}-3`, label: 'Verification & Output', sublabel: 'Stage 3 • HMI / Validation', x: 655, y: 105, w: 255, h: 74, color: '#FACC15', descriptionEn: extra.guidedStepsEn[extra.guidedStepsEn.length - 1], descriptionTe: extra.guidedStepsTe[extra.guidedStepsTe.length - 1], linkedTab: 'FATSAT' },
    ],
    connections: [
      { from: `${extra.id}-1`, to: `${extra.id}-2`, label: 'Signal / Frame', color: '#00CFFF' },
      { from: `${extra.id}-2`, to: `${extra.id}-3`, label: 'Verified Output', color: '#22C55E' },
    ],
  });
}

ENGINEERING_DIAGRAM_LIBRARY.sort((a, b) => a.number - b.number);

const RAW_CHAPTER_TUPLES: any[] = [[1,1,"Electrical Power System Fundamentals","ఎలక్ట్రికల్ పవర్ సిస్టమ్ ప్రాథమిక సూత్రాలు (Power System Fundamentals)","Generation, Transmission, Distribution, 3-Phase AC, P/Q/S, Power Factor, Faults, Earthing & Per-Unit Basics","జనరేషన్, ట్రాన్స్‌మిషన్, డిస్ట్రిబ్యూషన్, 3-Phase AC, P/Q/S, పవర్ ఫ్యాక్టర్, ఫాల్ట్స్, ఎర్థింగ్ & Per-Unit సిస్టమ్","DIAG-01-POWER-SYSTEM","SIEMENS_7SA87","Siemens SIPROTEC 5 7SA87 — 132 kV Line Distance Protection","SLD","Open 132/33/11 kV SLD",[["Generation, Transmission, Sub-Transmission & Distribution (132/33/11 kV)","విద్యుత్ ఉత్పత్తి, ట్రాన్స్‌మిషన్, సబ్-ట్రాన్స్‌మిషన్ & డిస్ట్రిబ్యూషన్ (132/33/11 kV)",["Electrical power flows continuously from synchronous generating stations (11 kV or 15.75 kV, 50 Hz) through Generator Step-Up (GSU) transformers to EHV/HV","In our 132/33/11 kV Grid Substation, two 132 kV incoming sub-transmission lines (BAY-132-L1 Shankarpally and BAY-132-L2 Gachibowli) energize the 132 kV"],["విద్యుత్ కేంద్రాల్లో (Thermal/Hydro/Nuclear) 11 kV లేదా 15.75 kV వద్ద 50 Hz 3-phase AC పవర్ ఉత్పత్తి అవుతుంది.","మన 132/33/11 kV సబ్‌స్టేషన్‌లో రెండు 132 kV ఇన్‌కమింగ్ లైన్లు (BAY-132-L1 Shankarpally మరియు BAY-132-L2 Gachibowli) 132 kV"],["S = √3 · V_L · I_L (MVA), P = S · cosφ (MW), Q = S · sinφ (MVAR), PF = cosφ = P / S.","Per-Unit (p.u.) Value = Actual Value / Base Value; Z_base = (kV_base)² / MVA_base (Ω)."]],["Electrical Faults, Short-Circuit Current & Substation Earthing","ఎలక్ట్రికల్ ఫాల్ట్స్, షార్ట్-సర్క్యూట్ కరెంట్ & సబ్‌స్టేషన్ ఎర్థింగ్",["Power system faults include symmetrical three-phase faults (L-L-L / L-L-L-G, ~5% of faults, highest fault current used for CB breaking capacity rating)","Substation earthing (IEEE 80 / IS 3043) uses a buried mild-steel/copper earth mat with driven earth electrodes to keep Touch Potential and Step Potential"],["పవర్ సిస్టమ్‌లో ప్రధానంగా నాలుగు రకాల ఫాల్ట్స్ ఏర్పడతాయి: 1) Single Line-to-Ground (L-G - 70% నుండి 80% వరకు ఇవే జరుగుతాయి)","సబ్‌స్టేషన్ ఎర్థింగ్ మ్యాట్ (IEEE 80 / IS 3043) భూమి లోపల < 0.5 Ω తక్కువ నిరోధకతను అందించి"],["L-G faults generate zero-sequence current 3I0 = Ia + Ib + Ic detected by 50N/51N/67N elements.","IEC 61850 Logical Node MMXU1 reports TotW (MW), TotVAr (MVAR), TotVA (MVA), TotPF, Hz, PhV"]]],"132/33 kV 50 MVA Transformer Full-Load & Fault Current Calculation","132/33 kV 50 MVA ట్రాన్స్‌ఫార్మర్ ఫుల్-లోడ్ & ఫాల్ట్ కరెంట్ లెక్కింపు",["HV Rated Current (132 kV): I_HV = 50,000 kVA / (√3 × 132 kV) = 218.69 A → Select CT Ratio = 300/1 A or 400/1 A.","LV Rated Current (33 kV): I_LV = 50,000 kVA / (√3 × 33 kV) = 874.77 A → Select CT Ratio = 1000/1 A or 1250/1 A.","At 57.0 MW station load and PF = 0.95 lagging: S = 57.0 / 0.95 = 60.0 MVA; Q = √(60² - 57²) = 18.73 MVAR."],["HV రేటెడ్ కరెంట్ (132 kV): I_HV = 50,000 kVA / (√3 × 132 kV) = 218.69 A → కాబట్టి CT Ratio = 400/1 A","LV రేటెడ్ కరెంట్ (33 kV): I_LV = 50,000 kVA / (√3 × 33 kV) = 874.77 A → కాబట్టి CT Ratio = 1000/1 A లేదా","57.0 MW లోడ్ మరియు 0.95 PF వద్ద: S = 57.0 / 0.95 = 60.0 MVA; Q = 18.73 MVAR."],["Confusing phase voltage V_ph = V_L / √3 (76.21 kV for 132 kV system) with line-to-line voltage V_L (132 kV) when setting relay VT ratios.","Forgetting the √3 factor in three-phase MVA calculation S = √3 · V_L · I_L."],["రిలేలో VT రేషియో సెట్ చేసేటప్పుడు V_ph = V_L / √3 (132 kV కి 76.21 kV) కు బదులుగా V_L (132 kV) వేయడం.","3-phase పవర్ లెక్కింపులో S = √3 · V_L · I_L లో √3 మర్చిపోవడం."],["MMXU1.TotW.mag.f on SCADA shows 1/3 of actual feeder MW","SCADA లో MMXU1.TotW.mag.f అసలు MW లో 1/3 వంతు మాత్రమే చూపిస్తోంది","CT/VT ratio scaling or single-phase vs 3-phase VT connection mode misconfigured in IED","IED లో CT/VT రేషియో లేదా 3-phase VT కనెక్షన్ మోడ్ తప్పుగా కాన్ఫిగర్ చేయబడింది","Inspect IED measurement group settings and check MMXU1.PhV.phsA/B/C.cVal.mag.f (~76.2 kV","IED లో MMXU1.PhV.phsA/B/C విలువలను (132 kV కి ~76.2 kV ఉండాలి) తనిఖీ చేయండి","Set VT primary to 132 kV / √3 and secondary to 110 V / √3 across all 3 phases and","VT ప్రైమరీ 132kV/√3 మరియు సెకండరీ 110V/√3 గా సరిచేసి CID డౌన్‌లోడ్ చేయండి","Inject 57.73 V L-N and 1.0 A secondary via Omicron test kit and confirm MMXU1.TotVA","Omicron టెస్ట్ కిట్ ద్వారా 57.73 V మరియు 1.0 A ఇంజెక్ట్ చేసి SCADA లో సరైన MVA విలువ"],["Why do we transmit power at 132 kV / 400 kV instead of 11 kV?","Because for a given power P = √3·V·I·cosφ, raising voltage 12× (from 11 kV to 132 kV) reduces current by 12× and cuts I²R line loss by 144× while allowing","P = √3·V·I·cosφ ప్రకారం వోల్టేజ్‌ను 11 kV నుండి 132 kV కి (12 రెట్లు) పెంచితే, కరెంట్ 12 రెట్లు తగ్గుతుంది మరియు లైన్ I²R నష్టం 144 రెట్లు"]],[2,1,"Substation Types and Equipment","సబ్‌స్టేషన్ రకాలు & పరికరాలు (Substation Types & Equipment)","AIS, GIS, Hybrid, Conventional vs Digital Substations, Switchyard, Control Room, Marshalling Kiosks & Panels","AIS, GIS, హైబ్రిడ్, కన్వెన్షనల్ vs డిజిటల్ సబ్‌స్టేషన్లు, స్విచ్‌యార్డ్, కంట్రోల్ రూమ్, మార్షలింగ్ కియోస్క్ & ప్యానెల్స్","DIAG-03-GA-PLAN","SCHNEIDER_C264","Schneider Electric MiCOM C264 — Modular Bay Control Unit","HERO","Open 3D Switchyard & Workspace",[["AIS, GIS, Hybrid & Digital Substations","AIS, GIS, హైబ్రిడ్ & డిజిటల్ సబ్‌స్టేషన్ల వివరణ",["Air Insulated Substations (AIS) use atmospheric air as the phase-to-phase and phase-to-ground dielectric medium. AIS requires a larger land footprint (e.g.","A Conventional Substation uses miles of multi-core copper control cables from yard Marshalling Kiosks (MK) to relay panels and hardwired RTU I/O cards."],["Air Insulated Substation (AIS) లో గాలినే ఇన్సులేషన్ మాధ్యమంగా ఉపయోగిస్తారు. దీనికి ఎక్కువ స్థలం అవసరం కానీ నిర్మాణ ఖర్చు తక్కువ","పాత సాంప్రదాయ సబ్‌స్టేషన్లలో స్విచ్‌యార్డ్ నుండి కంట్రోల్ రూమ్ వరకు వేల మీటర్ల కాపర్ కేబుల్స్ వాడేవారు."],["AIS: visible air clearances; GIS: sealed SF6 compartments with gas-density monitors (SIML1).","Hybrid Substation (MTS): outdoor AIS busbars combined with compact GIS breaker/isolator"]],["Switchyard, Cable Trenches, Marshalling Kiosks & Control Room Panels","స్విచ్‌యార్డ్, కేబుల్ ట్రెంచ్‌లు, మార్షలింగ్ కియోస్క్‌లు & కంట్రోల్ రూమ్ ప్యానెల్స్",["In the switchyard, each bay has a weatherproof IP55 outdoor Marshalling Kiosk (MK) that aggregates CT secondary wires (2.5/4.0 mm²), VT secondary wires","Inside the Control Building, panels are segregated into: 1) Control & Relay Panels (CRP) housing protection IEDs and BCUs"],["స్విచ్‌యార్డ్‌లో ప్రతి బే వద్ద ఒక Marshalling Kiosk (MK) ఉంటుంది. CT/VT సెకండరీ వైర్లు, బ్రేకర్ 52a/52b కాంటాక్టులు","కంట్రోల్ రూమ్‌లో ప్రధానంగా 4 రకాల ప్యానెల్స్ ఉంటాయి: 1) Control & Relay Panels (CRP - IEDలు మరియు BCUలు)"],["CT circuits always use sliding-link disconnecting terminal blocks with shorting links (never","VT and DC circuits use fuse/MCB disconnecting terminal blocks with test sockets."]]],"Tracing Bay 132-L1 from Outdoor Switchyard MK to Relay Panel CRP-132-L1","స్విచ్‌యార్డ్ MK నుండి CRP-132-L1 రిలే ప్యానెల్ వరకు వైరింగ్ ట్రేసింగ్",["Outdoor CT 5-core secondary (1A) terminates on shorting TB X1 in MK-132-L1 and runs via 4×4 mm² armored copper cable to","CB 52a/52b and 89L/89B status contacts run via 19C×1.5 mm² screened control cable to CRP-132-L1 binary inputs.","From CRP-132-L1 rear SFP ports (Port A & Port B), LC-LC duplex fiber patch cords connect to PRP LAN A (10.132.10.11)"],["స్విచ్‌యార్డ్ CT (1A) వైర్లు మొదట MK-132-L1 లోని షార్టింగ్ టెర్మినల్ బ్లాక్ X1 కి వచ్చి","బ్రేకర్ 52a/52b మరియు 89L/89B స్టేటస్ వైర్లు 19C×1.5 mm² కంట్రోల్ కేబుల్ ద్వారా రిలే బైనరీ ఇన్‌పుట్‌లకు","రిలే వెనుక ఉన్న Port A మరియు Port B ఫైబర్ పోర్టుల నుండి PRP LAN A (10.132.10.11) మరియు LAN B (10.132.20.11)"],["Running unscreened control cables parallel to HV power cables in the same trench tier without 300 mm separation, causing induced AC voltage on DC binary inputs.","Using standard non-shorting terminal blocks for CT secondary circuits."],["కేబుల్ ట్రెంచ్‌లో పవర్ కేబుల్స్ మరియు కంట్రోల్ కేబుల్స్ ఒకే ట్రేలో వేయడం వల్ల DC బైనరీ ఇన్‌పుట్‌లపై AC ఇండక్షన్ రావడం.","CT సర్క్యూట్‌లకు షార్టింగ్ లింక్ లేని సాధారణ టెర్మినల్ బ్లాక్స్ వాడటం."],["Spurious DI pickup on IED during 132 kV isolator switching","132 kV ఐసోలేటర్ ఆపరేట్ చేసినప్పుడు IED లో తప్పుడు DI సిగ్నల్ రావడం","Control cable shield not grounded at panel earth bar or opto-input pickup threshold set","కంట్రోల్ కేబుల్ షీల్డ్ ఎర్థింగ్ చేయకపోవడం లేదా IED DI థ్రెషోల్డ్ తక్కువగా (< 55% of 110V","Measure AC induced voltage on DI terminal and verify IED binary input pickup threshold","DI టెర్మినల్ వద్ద AC వోల్టేజ్ కొలిచి, 110V DC సిస్టమ్‌కు DI థ్రెషోల్డ్ ≥ 77V DC మరియు","Earth copper tape shield cleanly at relay panel gland plate and configure 77V DC","కేబుల్ షీల్డ్‌ను ప్యానెల్ ఎర్త్ బార్‌కు కనెక్ట్ చేసి, IED లో 77V DC థ్రెషోల్డ్ సెట్ చేయండి","Operate 89L isolator 5 times and confirm zero spurious SOE entries","89L ఐసోలేటర్‌ను 5 సార్లు ఆపరేట్ చేసి ఎటువంటి తప్పుడు SOE ఈవెంట్ రాలేదని నిర్ధారించండి"],["What is the difference between a Marshalling Kiosk (MK) and a Bay Control Unit (BCU)?","A Marshalling Kiosk is a passive outdoor terminal enclosure in the switchyard that consolidates primary equipment wiring (CT, VT, DI, DO","Marshalling Kiosk అనేది స్విచ్‌యార్డ్‌లో వైర్లను ఒకచోట చేర్చే పాసివ్ టెర్మినల్ బాక్స్ మాత్రమే; కానీ BCU అనేది IEC 61850 ప్రోటోకాల్"]],[3,1,"Complete 132/33/11 kV Substation Topology & Operations","పూర్తి 132/33/11 kV సబ్‌స్టేషన్ టోపాలజీ & ఆపరేషన్స్","18 Configured Bays, Busbars, Bus Couplers, Transformers, CTs/VTs, Protection Zones, Local/Remote & Interlocking","18 బేల నిర్మాణం, బస్‌బార్లు, బస్ కప్లర్లు, ట్రాన్స్‌ఫార్మర్లు, CT/VTలు, ప్రొటెక్షన్ జోన్లు & ఇంటర్‌లాకింగ్","DIAG-02-SLD","SIEMENS_7UT86","Siemens SIPROTEC 5 7UT86 — Transformer Differential Relay (87T)","SLD","Launch Interactive 132/33/11 kV SLD",[["Complete Electrical Power Path Across All 18 Bays","మొత్తం 18 బేలలో పూర్తి ఎలక్ట్రికల్ పవర్ ప్రవాహ మార్గం",["Our configured substation models an authentic 18-bay 132/33/11 kV topology: 132 kV Level (5 Bays): BAY-132-L1 (Shankarpally Incomer 1)","33 kV Level (9 Bays): BAY-33-INC1 (Incomer from T1), BAY-33-INC2 (Incomer from T2), BAY-33-BC (33 kV Bus Coupler)"],["మన సబ్‌స్టేషన్‌లో మొత్తం 18 బేలు ఉన్నాయి: 132 kV స్థాయిలో (5 బేలు): BAY-132-L1 (Shankarpally లైన్ 1)","33 kV స్థాయిలో: BAY-33-INC1, BAY-33-INC2, BAY-33-BC (33 kV బస్ కప్లర్), నాలుగు 33 kV ఫీడర్లు (BAY-33-F01..F04)"],["Overlapping Protection Zones: CT locations around CBs ensure zero blind spots between Line","Interlocking Rule #1 (CILO1): Disconnectors 89L and 89B can NEVER be opened or closed while"]],["Breaker & Disconnector Operations, Local/Remote Authority & Interlocking","బ్రేకర్ & ఐసోలేటర్ ఆపరేషన్లు, Local/Remote అథారిటీ & ఇంటర్‌లాకింగ్",["Every bay enforces a strict 3-tier control authority hierarchy: 1) Bay Local (43LR on relay panel set to LOCAL — blocks all IEC 61850 MMS CSWI1 commands","Earth Switch Interlocking: Line Earth Switch 89E can only close when Line Disconnector 89L is OPEN and Line VT voltage is dead (< 20% V_nom)"],["ప్రతి బేలో 3-స్థాయిల కంట్రోల్ అథారిటీ ఉంటుంది: 1) Bay Local (ప్యానెల్‌పై Local లో ఉన్నప్పుడు SCADA/RCC నుండి వచ్చే అన్ని MMS","ఎర్త్ స్విచ్ ఇంటర్‌లాక్: లైన్ ఐసోలేటర్ 89L OPEN లో ఉండి లైన్‌లో వోల్టేజ్ లేనప్పుడు మాత్రమే ఎర్త్ స్విచ్ 89E క్లోజ్ అవుతుంది."],["Standard Switching Sequence to De-Energize a Feeder: 1) Open CB (52) → 2) Verify 0 A current &","Energization sequence is the exact reverse: Open 89E → Close 89B → Close 89L → Close CB (52)."]]],"Safe De-Energization & Earthing of 132 kV Line 1 (BAY-132-L1)","132 kV లైన్ 1 (BAY-132-L1) ను సురక్షితంగా ఐసోలేట్ చేసి ఎర్త్ చేసే విధానం",["Verify BAY-132-L2 is CLOSED and carrying station load so de-energizing L1 does not black out T1/T2.","Issue SBO OPEN command to BAY-132-L1 Circuit Breaker (XCBR1.Pos → OFF) and confirm MMXU1 current drops to 0.0 A.","Open Line Disconnector 89L and Bus Disconnector 89B (XSWI1/XSWI2); CILO1 permits operation because XCBR1 is OPEN."],["మొదట BAY-132-L2 ఆన్‌లో ఉండి స్టేషన్ లోడ్ మోస్తుందో లేదో తనిఖీ చేయండి.","SBO కమాండ్ ద్వారా BAY-132-L1 సర్క్యూట్ బ్రేకర్‌ను OPEN చేయండి (XCBR1.Pos → OFF) మరియు కరెంట్ 0.0 A అయిందని","బ్రేకర్ OPEN లో ఉన్నందున CILO1 అనుమతితో 89L మరియు 89B ఐసోలేటర్లను OPEN చేయండి."],["Attempting to open Disconnector 89L while Circuit Breaker 52 is still CLOSED under load, which would draw a destructive open-air power arc.","Attempting to close CB 52 while Earth Switch 89E is still CLOSED (bolted 3-phase earth fault)."],["సర్క్యూట్ బ్రేకర్ 52 CLOSED లో ఉన్నప్పుడు ఐసోలేటర్ 89L ను OPEN చేయడానికి ప్రయత్నించడం (దీనివల్ల భారీ ఆర్క్ ఏర్పడుతుంది).","ఎర్త్ స్విచ్ 89E CLOSED లో ఉండగానే బ్రేకర్‌ను CLOSE చేయడానికి ప్రయత్నించడం."],["SCADA OPEN/CLOSE command on BAY-33-F01 is rejected by IED","BAY-33-F01 పై SCADA నుండి ఇచ్చిన OPEN/CLOSE కమాండ్ తిరస్కరించబడింది","Bay mode is in LOCAL (Loc.stVal = TRUE) or CILO1 interlock condition is not satisfied","బే LOCAL మోడ్‌లో ఉండటం లేదా CILO1 ఇంటర్‌లాక్ షరతు (89E క్లోజ్ / తక్కువ SF6 ప్రెజర్)","Open Breaker Control Drawer on SLD/SCADA and inspect Local/Remote state","SLD/SCADA లో Breaker Control Drawer తెరిచి Local/Remote, CILO1","Switch bay to REMOTE, open Earth Switch 89E, and clear any active protection lockout","బేను REMOTE మోడ్‌కు మార్చి, 89E ఎర్త్ స్విచ్‌ను OPEN చేసి, లాకౌట్ రీసెట్ చేయండి","Re-issue SBO Select and Execute; confirm XCBR1.Pos transitions cleanly and SOE logs","మళ్లీ SBO కమాండ్ ఇచ్చి బ్రేకర్ ఆపరేట్ అయి SOE లాగ్‌లో నమోదైందని నిర్ధారించండి"],["Why are CTs placed on the bushing/line side so that protection zones overlap across the Circuit Breaker?","By crossing CT locations around the circuit breaker, the Busbar Protection Zone (87B) and the Line/Feeder Protection Zone (21/50/51) overlap across the","సర్క్యూట్ బ్రేకర్‌కు ఇరువైపులా ప్రొటెక్షన్ జోన్లు (87B మరియు 21/50/51) ఒకదానికొకటి ఓవర్‌లాప్ అయ్యేలా CTలను అమర్చడం వల్ల సబ్‌స్టేషన్‌లో"]],[4,1,"Engineering Drawings: SLD, GA and Schematic Layouts","ఇంజనీరింగ్ డ్రాయింగ్స్: SLD, GA & స్కీమాటిక్ లేఅవుట్స్","How to Read Single Line Diagrams (SLD), General Arrangement (GA Plan/Elevation), Schematics, Terminal Blocks & Cable Schedules","SLD, GA (Plan/Elevation), ప్రొటెక్షన్ స్కీమాటిక్స్, టెర్మినల్ బ్లాక్స్ & కేబుల్ షెడ్యూల్స్ చదివే పూర్తి విధానం","DIAG-04-ELEVATION","ABB_REF615","ABB Relion REF615 — Feeder Protection & Control IED","SLD","Open Interactive SLD & Drawing Inspector",[["Step-by-Step Guide to Reading Single Line Diagrams (SLD) & IEC Symbols","Single Line Diagram (SLD) మరియు IEC చిహ్నాలను దశలవారీగా చదివే విధానం",["A Single Line Diagram (SLD) represents a balanced three-phase power system using a single line per circuit and standardized IEC 60617 graphical symbols.","Key IEC Symbols & ANSI Device Codes on an SLD: Circuit Breaker (52 — square/X contact capable of breaking fault current)"],["Single Line Diagram (SLD) అనేది 3-phase పవర్ సిస్టమ్‌ను ఒకే గీతతో మరియు ప్రామాణిక IEC 60617 చిహ్నాలతో చూపే ప్రధాన ఇంజనీరింగ్","ప్రధాన SLD చిహ్నాలు: 52 Circuit Breaker (ఫాల్ట్ కరెంట్ ఆపే స్విచ్ - X/చతురస్రం గుర్తు), 89 Isolator (ఆఫ్-లోడ్ ఐసోలేటర్)"],["CT Core Identification on SLD: Core 1 (0.2S) → Tariff/SCADA Metering","Bay Equipment Numbering Convention: e.g., 132 kV Bay 01 → 10152 (CB), 10189A (Bus-A Isolator)"]],["General Arrangement (GA) Plan/Elevation & Secondary Schematic Drawings","General Arrangement (GA) డ్రాయింగ్స్ & సెకండరీ స్కీమాటిక్ డ్రాయింగ్స్",["While the SLD shows electrical topology without physical scale, the General Arrangement (GA) Drawing shows exact physical dimensions to scale (mm/m): 1)","Secondary SAS Engineering Drawings include: 1) Protection & Control Schematics (sheet-by-sheet AC CT/VT circuits, DC supply, DI circuits, Trip/Close coils"],["SLD కేవలం ఎలక్ట్రికల్ కనెక్షన్లను మాత్రమే చూపితే, General Arrangement (GA) డ్రాయింగ్ పరికరాల భౌతిక కొలతలను (mm/m లో) చూపుతుంది:","సెకండరీ ఇంజనీరింగ్ డ్రాయింగ్లలో ముఖ్యమైనవి: 1) Protection & Control Schematics (CT/VT, DC, DI"],["Cross-Reference Rule in Schematics: A contact labeled 'K1 /14.B3' means coil K1 is on Sheet","Opposition / Source-Destination Ferrule Marking: Wire ferrule shows both local TB terminal and"]]],"Worked Example: Reading Sheet 08 (Breaker Trip Schematic) & Port Schedule for Bay 132-L1","ఉదాహరణ: Bay 132-L1 యొక్క బ్రేకర్ ట్రిప్ స్కీమాటిక్ (Sheet 08) & పోర్ట్ షెడ్యూల్ చదవడం",["Locate Title Block on Sheet 08: Drawing DRG-SAS-132L1-SCH-08, Rev R3 (As-Built).","Follow wire ferrule J101 from +110V DC1 to Siemens 7SA87 Binary Output BO1 (Terminal F1/F2 — PTRC1.Tr.general).","From BO1 terminal F2, trace wire J103 through Test Block TTB1-Pin 14 to Outdoor Marshalling Kiosk MK-132-L1 TB X2:7."],["Sheet 08 యొక్క Title Block లో DRG-SAS-132L1-SCH-08, Rev R3 (As-Built) నిర్ధారించండి.","ఫెర్రూల్ J101 ద్వారా +110V DC1 నుండి Siemens 7SA87 రిలే యొక్క Binary Output BO1 (PTRC1.Tr) టెర్మినల్ F1/F2 కు","అక్కడి నుండి J103 వైర్ ద్వారా Test Block TTB1-Pin 14 మీదుగా స్విచ్‌యార్డ్ MK-132-L1 లోని TB X2:7 కు ట్రేస్"],["Working from 'For Approval (Rev 0)' drawings during site commissioning instead of verified 'Good For Construction (GFC)' or 'As-Built' revisions.","Misreading Normally Open (NO) vs Normally Closed (NC) contact conventions: schematic contacts are ALWAYS drawn in the de-energized / breaker-OPEN reference state!"],["సైట్ కమిషనింగ్ సమయంలో 'As-Built' డ్రాయింగ్లకు బదులుగా పాత 'For Approval (Rev 0)' డ్రాయింగ్లను ఉపయోగించడం.","స్కీమాటిక్ డ్రాయింగ్లలో అన్ని కాంటాక్టులు 'De-energized / Breaker OPEN' స్థితిలో గీయబడి ఉంటాయనే ప్రాథమిక నియమాన్ని మర్చిపోవడం."],["Wire at MK terminal X2:7 does not match schematic ferrule number during SAT","SAT సమయంలో MK టెర్మినల్ X2:7 వద్ద ఉన్న వైర్ ఫెర్రూల్ స్కీమాటిక్‌తో సరిపోలడం లేదు","Field modification during erection was not red-lined into the As-Built schematic","నిర్మాణ సమయంలో చేసిన మార్పును As-Built డ్రాయింగ్‌లో నమోదు చేయలేదు","Perform point-to-point continuity bell-test (with DC supply isolated!) between CRP TB and","DC సప్లై ఆఫ్ చేసి CRP టెర్మినల్ నుండి MK టెర్మినల్ వరకు మల్టీమీటర్‌తో కంటిన్యూటీ పరీక్ష","Correct ferrule label to match approved circuit and mark up Red-Line As-Built drawing","సరైన ఫెర్రూల్ వేసి వెంటనే Red-Line As-Built డ్రాయింగ్‌లో అప్‌డేట్ చేయండి","Sign off Point-to-Point Wiring Check Sheet and verify trip test from IED BO1","వైరింగ్ చెక్ షీట్‌పై సంతకం చేసి IED నుండి ట్రిప్ టెస్ట్ ధృవీకరించండి"],["In what state are auxiliary contacts (52a, 52b, relays) drawn on a substation protection schematic?","By IEC 60617 standard convention, all contacts on an electrical schematic are drawn in their de-energized, unoperated","IEC 60617 ప్రమాణం ప్రకారం స్కీమాటిక్ డ్రాయింగ్లలో అన్ని కాంటాక్టులను 'De-energized / Breaker OPEN' స్థితిలో గీస్తారు (కాబట్టి 52a ఓపెన్‌గా"]],[5,1,"Primary and Secondary Substation Equipment","ప్రైమరీ & సెకండరీ సబ్‌స్టేషన్ పరికరాలు (Primary & Secondary Equipment)","CBs, Disconnectors, CTs, VTs/CVTs, Transformers, Surge Arresters, Relays, BCUs, DI/DO, 52a/52b, Trip Coils, DC Battery & UPS","CBలు, ఐసోలేటర్లు, CT, VT/CVT, ట్రాన్స్‌ఫార్మర్లు, LA, రిలేలు, BCU, DI/DO, 52a/52b, ట్రిప్ కాయిల్స్, DC బ్యాటరీ & UPS","DIAG-05-SCHEMATIC","GE_850","GE Vernova Multilin 850 — Feeder Protection & Bay Controller","IED","Open IED Explorer & Hardware Inspector",[["Primary High-Voltage Equipment (CB, 89, 89E, CT, VT/CVT, LA, Transformer)","ప్రైమరీ హై-వోల్టేజ్ పరికరాలు (CB, 89, 89E, CT, VT/CVT, LA, ట్రాన్స్‌ఫార్మర్)",["Primary equipment carries main power current and withstands system high voltage (132 kV / 33 kV / 11 kV): 1) Circuit Breaker (52 — SF6 at 132 kV","Secondary equipment operates at low safe levels (1 A / 5 A, 110 V AC, 110 V / 220 V DC, 24 V DC, Ethernet) to measure, protect, control"],["ప్రైమరీ పరికరాలు నేరుగా హై-వోల్టేజ్ (132 kV / 33 kV / 11 kV) మరియు లోడ్ కరెంట్‌ను మోస్తాయి: 1) Circuit Breaker (52 - 132 kV వద్ద","సెకండరీ పరికరాలు తక్కువ వోల్టేజ్ (1A, 110V AC, 110V DC) వద్ద పనిచేస్తూ ప్రైమరీ పరికరాలను రక్షిస్తాయి మరియు నియంత్రిస్తాయి:"],["Why Double-Point Status (52a + 52b) is mandatory for CBs & Isolators: Using both 52a (NO) and","110V DC Battery System ensures protection relays and trip coils operate reliably even during a"]]],"How Field 52a/52b Contacts and CT/VT Signals Reach the Bay IED","ఫీల్డ్ నుండి 52a/52b కాంటాక్టులు మరియు CT/VT సిగ్నల్స్ IED కి చేరే విధానం",["110V DC positive wetting voltage (+110V DC) is routed from the relay panel to the CB mechanism box.","When CB is CLOSED, 52a closes and returns +110V DC to IED Digital Input DI1 (ON = 1)","Simultaneously, 1A secondary currents from CT cores enter the IED rear CT module"],["రిలే ప్యానెల్ నుండి +110V DC వెట్టింగ్ వోల్టేజ్ స్విచ్‌యార్డ్ బ్రేకర్ మెకానిజం బాక్స్‌కు వెళ్తుంది.","బ్రేకర్ CLOSED లో ఉన్నప్పుడు 52a క్లోజ్ అయి DI1 కి +110V DC వస్తుంది (1)","అదే సమయంలో CT నుండి వచ్చే 1A కరెంట్ మరియు VT నుండి వచ్చే 63.5V AC వోల్టేజ్ IED వెనుక ఉన్న CT/VT మాడ్యూల్‌లోకి"],["Using only a single contact (52a alone) for circuit breaker position, which cannot distinguish between 'Breaker Open (0V)' and 'Broken Wire / Lost Wetting Fuse (0V)'.","Opening CT secondary terminals while primary load current is flowing, inducing lethal kV peak voltages across the open CT winding."],["బ్రేకర్ స్థితి కోసం కేవలం 52a ఒకటే వాడటం (దీనివల్ల బ్రేకర్ నిజంగా ఓపెన్ అయిందో లేక వైర్ కట్ అయి 0V వచ్చిందో తెలియదు).","లోడ్ నడుస్తున్నప్పుడు CT సెకండరీ టెర్మినల్స్ ఓపెన్ చేయడం (ఇది ప్రమాదకరమైన హై-వోల్టేజ్ ఉత్పత్తి చేస్తుంది)."],["HMI shows CB Position as 'BAD / INTERMEDIATE (00)' continuously","HMI లో బ్రేకర్ స్థితి నిరంతరం 'BAD / INTERMEDIATE (00)' అని చూపిస్తోంది","Status wetting DC MCB tripped (both DI1 and DI2 = 0V) or mechanical auxiliary switch","స్టేటస్ వెట్టింగ్ 110V DC MCB ట్రిప్ అవ్వడం (DI1=0, DI2=0) లేదా ఆగ్జిలరీ స్విచ్ లింకేజ్","Measure DC voltage on IED DI1 and DI2 terminals with respect to -110V DC","IED యొక్క DI1 మరియు DI2 టెర్మినల్స్ వద్ద మల్టీమీటర్‌తో DC వోల్టేజ్ కొలవండి","If both DI1 and DI2 read 0V, check and reset the 110V DC status supervision MCB/fuse","రెండింటిలోనూ 0V ఉంటే 110V DC స్టేటస్ MCB ని తనిఖీ చేసి రీసెట్ చేయండి","Confirm DI1=110V / DI2=0V (Closed) and verify XCBR1.Pos.q = Good (0x0000)","DI1=110V, DI2=0V వచ్చిన తర్వాత HMI లో CLOSED స్థితి మరియు Quality = Good నిర్ధారించండి"],["Why do we use 110V / 220V DC instead of 230V AC for substation protection relays and trip coils?","Because during a severe grid fault, AC bus voltage collapses to near zero at the exact millisecond the protection relay and trip coil must operate.","సబ్‌స్టేషన్‌లో తీవ్రమైన షార్ట్-సర్క్యూట్ ఫాల్ట్ జరిగినప్పుడు AC వోల్టేజ్ పడిపోతుంది. సరిగ్గా అదే క్షణంలో రిలే మరియు ట్రిప్ కాయిల్ పనిచేయాలి"]],[6,2,"Substation Automation System (SAS) Fundamentals","Substation Automation System (SAS) ప్రాథమిక సూత్రాలు","What SAS Is, Conventional vs Digital Substations, SCADA vs SAS, Protection vs Control, SOE, Gateways & Time Sync","SAS అంటే ఏమిటి, కన్వెన్షనల్ vs డిజిటల్ సబ్‌స్టేషన్, SCADA vs SAS, ప్రొటెక్షన్ vs కంట్రోల్, SOE, గేట్‌వే & టైమ్ సింక్","DIAG-07-SAS-LEVELS","SCADA_WORKSTATION","Dual-Monitor Substation SCADA / HMI Operator Station","SCADA","Open SCADA / HMI Operator Station",[["What is SAS & How SAS Differs from Traditional RTU/SCADA","SAS అంటే ఏమిటి & పాత RTU/SCADA తో పోలిస్తే SAS ఎలా భిన్నమైనది?",["A Substation Automation System (SAS) is an integrated digital protection, control, measurement, monitoring","Protection vs Control Separation: Protection functions (PDIS, PDIF, PTOC) operate autonomously inside the bay relay in 15–30 ms to isolate faults even if"],["Substation Automation System (SAS) అనేది సబ్‌స్టేషన్ లోపల ప్రొటెక్షన్, కంట్రోల్, మీటరింగ్","ప్రొటెక్షన్ మరియు కంట్రోల్ మధ్య తేడా: ప్రొటెక్షన్ (21, 87T, 50/51) అనేది SCADA లేదా నెట్‌వర్క్ పనిచేయకపోయినా సరే 15–30 ms లోపే"],["SOE timestamps are generated at the source Bay IED hardware clock (synchronized to ±38 ns via","SAS eliminates marshalling-to-RTU copper wiring bottlenecks and adds continuous"]]],"Tracing a 33 kV Feeder Overcurrent Trip Through the SAS Architecture","33 kV ఫీడర్ ఓవర్‌కరెంట్ ట్రిప్ SAS ఆర్కిటెక్చర్ ద్వారా ప్రయాణించే విధానం",["At t = 0 ms, an L-G fault occurs on 33 kV Feeder 03 (BAY-33-F03). Siemens 7SJ85 detects I > I_pickup (PTOC1.Str = TRUE).","At t = 18 ms, PTOC1 time delay expires → PTRC1.Tr.general asserts → 1) Hardwired BO1 energizes Trip Coil TC1","At t = 48 ms, CB 52 opens (52a=0, 52b=1) → XCBR1.Pos.stVal = OFF with PTP timestamp t → BRCB01 sends spontaneous MMS"],["t = 0 ms వద్ద 33 kV ఫీడర్ 03 లో ఎర్త్ ఫాల్ట్ ఏర్పడినప్పుడు Siemens 7SJ85 రిలేలో PTOC1.Str = TRUE అవుతుంది.","t = 18 ms వద్ద PTRC1.Tr.general ఆపరేట్ అయి: 1) BO1 ద్వారా ట్రిప్ కాయిల్ TC1 కి +110V DC వెళ్తుంది","t = 48 ms వద్ద బ్రేకర్ ఓపెన్ అవ్వగానే XCBR1.Pos = OFF అయి, BRCB01 ద్వారా 1 ms SOE టైమ్‌స్టాంప్‌తో SCADA మరియు"],["Timestamping SOE events at the SCADA server upon polling arrival instead of using the source IED's IEC 61850 '.t' attribute.","Routing primary protection trip signals through the SCADA server instead of direct hardwired BO + Layer-2 GOOSE."],["SOE టైమ్‌స్టాంప్‌ను సోర్స్ IED వద్ద కాకుండా SCADA సర్వర్‌కు చేరిన సమయాన్ని బట్టి తీసుకోవడం.","ప్రొటెక్షన్ ట్రిప్ కోసం GOOSE/హార్డ్‌వైర్డ్ కాకుండా SCADA సర్వర్‌పై ఆధారపడటం."],["SOE sequence after a cascade trip shows downstream and upstream breakers out of","కాస్కేడ్ ట్రిప్ జరిగినప్పుడు SOE లాగ్‌లో బ్రేకర్ల సమయ క్రమం తారుమారుగా కనిపిస్తోంది","One or more Bay IEDs lost PTP/SNTP time synchronization (TimeQuality ClockNotSynchronized","ఒకటి లేదా అంతకంటే ఎక్కువ IEDలలో PTP/SNTP టైమ్ సింక్రొనైజేషన్ ఫెయిల్ అయింది","Inspect SOE timestamp quality bits and check Meinberg PTP Grandmaster lock status on VLAN","SOE లో టైమ్ క్వాలిటీ బిట్ మరియు VLAN 40 పై PTP గ్రాండ్‌మాస్టర్ లాక్ స్థితిని తనిఖీ చేయండి","Restore PTP VLAN 40 multicast forwarding on switch port and verify PTP slave lock (< 100","స్విచ్ పోర్ట్‌పై PTP VLAN 40 పునరుద్ధరించి IED PTP లాక్ (< 100 ns) నిర్ధారించండి","Trigger test DI toggle on two IEDs simultaneously and verify identical 1 ms SOE","రెండు IEDలలో ఒకేసారి టెస్ట్ ఇన్‌పుట్ ఇచ్చి SCADA SOE లో 1 ms కచ్చితత్వం ధృవీకరించండి"],["What is the difference between SCADA and SAS?","SCADA is the station/remote supervisory HMI, database, and operator visualization software, whereas SAS is the complete substation-wide system comprising","SCADA అనేది ఆపరేటర్ మానిటరింగ్ మరియు కంట్రోల్ సాఫ్ట్‌వేర్ మాత్రమే; కానీ SAS అనేది బే IEDలు, ప్రొటెక్షన్, GOOSE ఇంటర్‌లాకింగ్"]],[7,2,"Station, Bay and Process Level Architecture","Station, Bay & Process Level ఆర్కిటెక్చర్ (IEC 61850 3-Level)","Detailed Three-Tier IEC 61850 Hierarchy, Equipment Roles & Communication Paths (Hardwired, MMS, GOOSE, SV)","మూడు స్థాయిల IEC 61850 నిర్మాణం, పరికరాల బాధ్యతలు & కమ్యూనికేషన్ మార్గాలు (Hardwired, MMS, GOOSE, SV)","DIAG-07-SAS-LEVELS","STATION_GATEWAY","Station Telecontrol Gateway — IEC 61850 MMS to IEC 60870-5-104","NETWORK","Open PRP / HSR Network Architecture",[["Station Level, Bay Level & Process Level Responsibilities","Station Level, Bay Level & Process Level యొక్క బాధ్యతలు",["IEC 61850 structures a digital substation into three logical and physical levels: 1) Station Level (Control Room Server Rack & Operator Desk): Redundant","2) Bay Level (Relay Room CRP Panels / Bay Kiosks): Dedicated Protection IEDs (7SA87, 7UT86, 7SJ85, REF615, RET615, P143, P633, Multilin 850/D60/T60)"],["IEC 61850 సబ్‌స్టేషన్‌ను 3 స్థాయిలుగా విభజిస్తుంది: 1) Station Level: డ్యూయల్ SCADA సర్వర్లు (10.132.10.200/201)","2) Bay Level: ప్రతి బేకు సంబంధించిన ప్రొటెక్షన్ రిలేలు (7SA87, 7UT86, 7SJ85, REF615, P633, 850) మరియు Bay Control Units (C264"],["Not every IEC 61850 substation uses a Process Bus! Most brownfield and many greenfield 132/33","When a Process Bus (IEC 61850-9-2 LE) is deployed, Merging Units convert analog CT/VT signals"]]],"Mapping All Communication Paths in Our 132/33/11 kV Substation","మన 132/33/11 kV సబ్‌స్టేషన్ లోని అన్ని కమ్యూనికేషన్ మార్గాల మ్యాపింగ్",["Process → Bay Path: Switchyard CT (1A), CVT (110V), and CB 52a/52b contacts wired via MK-132-L1 to Siemens 7SA87","Bay ↔ Bay Path (Horizontal): IED_33_F03 publishes GOOSE (0x88B8, VLAN 20) over Station Bus to Upstream Incomer","Bay ↔ Station Path (Vertical): All 18 IEDs send BRCB MMS reports (TCP Port 102"],["Process → Bay మార్గం: స్విచ్‌యార్డ్ CT (1A), CVT (110V) మరియు 52a/52b కాంటాక్టులు MK-132-L1 ద్వారా Siemens","Bay ↔ Bay మార్గం (Horizontal): ఫీడర్ రిలే IED_33_F03 నుండి ఇన్‌కమర్ రిలే IED_33_INC1 కి ఇంటర్‌లాకింగ్ మరియు","Bay ↔ Station మార్గం (Vertical): మొత్తం 18 IEDలు TCP Port 102 (MMS) ద్వారా SCADA సర్వర్లకు మరియు RCC"],["Assuming every IEC 61850 substation has Merging Units and Sampled Values on a Process Bus — always check the project architecture specification first.","Connecting Engineering Workstation remote access directly to the internet without a DMZ firewall."],["ప్రతి IEC 61850 సబ్‌స్టేషన్‌లో తప్పనిసరిగా Process Bus మరియు Merging Units ఉంటాయని భావించడం (చాలా 132/33 kV సబ్‌స్టేషన్లలో Station Bus మాత్రమే ఉండి, CT/VT హార్డ్‌వైర్డ్ ఉంటాయి).","ఇంజనీరింగ్ వర్క్‌స్టేషన్‌కు ఎటువంటి ఫైర్‌వాల్ లేకుండా నేరుగా బాహ్య నెట్‌వర్క్ కనెక్ట్ చేయడం."],["Station Gateway GTW-RCC-01 is online on LAN A/B, but SLDC/RCC receives stale data for Bay","GTW-RCC-01 ఆన్‌లైన్‌లో ఉంది కానీ SLDC/RCC కి Bay 33-F02 డేటా అప్‌డేట్ అవ్వడం లేదు","Gateway's dedicated BRCB instance (brcbSt02) on IED_33_F02 is not enabled or taken by","IED_33_F02 లో గేట్‌వే కోసం కేటాయించిన BRCB ఇన్‌స్టాన్స్ (brcbSt02) ఎనేబుల్ కాలేదు లేదా","Inspect BRCB client reservation (RptEna and Owner IP) in MMS Lab for IED_33_F02","MMS Lab లో IED_33_F02 యొక్క BRCB RptEna మరియు Owner IP ని తనిఖీ చేయండి","Assign dedicated BRCB instance brcbSt01 to SCADA Server A, brcbSt02 to SCADA Server B","SCD ఫైల్‌లో SCADA A కు brcbSt01, SCADA B కు brcbSt02, మరియు Gateway కు brcbSt03","Trigger GI from Gateway and verify IEC-104 IOA updates at RCC","Gateway నుండి GI ట్రిగ్గర్ చేసి RCC వద్ద IEC-104 IOA అప్‌డేట్ అవుతుందో నిర్ధారించండి"],["Why must each MMS Client (SCADA A, SCADA B, Gateway) have its own separate BRCB instance in an IED?","Because a Buffered Report Control Block (BRCB) maintains a single client state machine and EntryID buffer pointer","ఒక BRCB ఇన్‌స్టాన్స్ ఒకేసారి ఒకే MMS క్లయింట్‌కు మాత్రమే రిపోర్టులు మరియు బఫర్ పాయింటర్ (EntryID) అందించగలదు. అందుకే SCADA A"]],[8,2,"Station Bus and Process Bus Deep Dive","Station Bus & Process Bus పూర్తి విశ్లేషణ","IEC 61850-8-1 Station Bus vs 61850-9-2 Process Bus, Fiber Switching, Multicast, VLANs, QoS Priority & Latency","IEC 61850-8-1 Station Bus vs 61850-9-2 Process Bus, ఫైబర్ స్విచింగ్, మల్టీకాస్ట్, VLANలు, QoS ప్రయారిటీ & లేటెన్సీ","DIAG-11-STATION-BUS","INDUSTRIAL_SWITCH","Hirschmann RSP35 — Managed Industrial Ethernet Switch (IEEE 1588 / PRP / VLAN)","NETWORK","Open Station Bus & VLAN Inspector",[["Station Bus (IEC 61850-8-1) vs Process Bus (IEC 61850-9-2)","Station Bus (IEC 61850-8-1) మరియు Process Bus (IEC 61850-9-2) మధ్య సాంకేతిక తేడాలు",["The Station Bus (IEC 61850-8-1) interconnects Bay Level IEDs with Station Level servers and gateways over 100 Mbps / 1 Gbps fiber Ethernet.","The Process Bus (IEC 61850-9-2 LE) interconnects Switchyard Merging Units (MUs) and Process Interface Units (PIUs) with Bay Protection IEDs."],["Station Bus (IEC 61850-8-1) అనేది Bay IEDలను మరియు కంట్రోల్ రూమ్ SCADA సర్వర్లను 100 Mbps / 1 Gbps ఫైబర్ ఆప్టిక్ ఈథర్నెట్ ద్వారా","Process Bus (IEC 61850-9-2 LE) అనేది స్విచ్‌యార్డ్ లోని Merging Units (MU) మరియు PIUలను Bay IEDలతో కలుపుతుంది."],["IEEE 802.1Q VLAN Segmentation in Our Substation: VLAN 10 = MMS / SCADA","IGMP Snooping / Static Multicast Filtering prevents GOOSE and SV multicast frames from"]]],"Bandwidth & Latency Calculation on a 100 Mbps / 1 Gbps Station & Process Bus","Station Bus & Process Bus పై బ్యాండ్‌విడ్త్ మరియు లేటెన్సీ లెక్కింపు",["One 9-2 LE Merging Unit (4 currents + 4 voltages at 4000 Hz, ~150 bytes/frame): Bandwidth = 4000 × 150 × 8 = 4.8 Mbps","One GOOSE stream in steady state (T0 = 1000 ms, ~180 bytes/frame): Bandwidth = 1.44 kbps","With IEEE 802.1p Priority Queueing (Priority 4 for GOOSE, Priority 6 for PTP)"],["ఒక Merging Unit (4000 ఫ్రేమ్స్/సెకన్, ~150 bytes/frame) నిరంతరం 4.8 Mbps బ్యాండ్‌విడ్త్ ఉపయోగిస్తుంది.","సాధారణ స్థితిలో (T0 = 1000 ms) ఒక GOOSE స్ట్రీమ్ కేవలం 1.44 kbps మాత్రమే తీసుకుంటుంది.","IEEE 802.1p QoS Priority (GOOSE = 4, PTP = 6) ఉపయోగించడం వల్ల 1 Gbps స్విచ్‌లో ప్రతి హాప్‌కు < 5 µs మాత్రమే"],["Leaving all switch ports in Default VLAN 1 without multicast filtering, allowing a GOOSE storm or SV stream to saturate low-speed management ports.","Confusing physical star cabling with logical peer-to-peer GOOSE multicast."],["అన్ని స్విచ్ పోర్టులను డిఫాల్ట్ VLAN 1 లోనే వదిలేసి మల్టీకాస్ట్ ఫిల్టరింగ్ చేయకపోవడం.","ఫిజికల్ ఫైబర్ స్టార్ కేబులింగ్‌ను మరియు లాజికల్ GOOSE మల్టీకాస్ట్ ప్రవాహాన్ని ఒకటిగా పొరబడటం."],["GOOSE trip latency exceeds 15 ms during heavy file transfer from Engineering Workstation","ఇంజనీరింగ్ వర్క్‌స్టేషన్ నుండి పెద్ద ఫైల్స్ డౌన్‌లోడ్ చేస్తున్నప్పుడు GOOSE లేటెన్సీ 15","IEEE 802.1p QoS strict-priority queuing disabled on managed switch trunk port","మేనేజ్డ్ స్విచ్ ట్రంక్ పోర్ట్‌పై IEEE 802.1p QoS ప్రయారిటీ క్యూయింగ్ ఆఫ్ చేయబడింది","Inspect Hirschmann switch QoS configuration and VLAN 20 CoS/PCP priority mapping","Hirschmann స్విచ్‌లో QoS సెట్టింగ్స్ మరియు VLAN 20 Priority 4 మ్యాపింగ్ తనిఖీ చేయండి","Enable Strict Priority Queueing on all access/trunk ports mapping 802.1p PCP 4–7 to","అన్ని పోర్టులపై Strict Priority Queueing ఎనేబుల్ చేసి PCP 4–7 కు హై-ప్రయారిటీ క్యూ","Repeat bulk file transfer while triggering GOOSE trip; verify transfer time remains < 2.5","ఫైల్ ట్రాన్స్‌ఫర్ నడుస్తుండగా GOOSE ట్రిప్ ఇచ్చి లేటెన్సీ < 2.5 ms ఉందని నిర్ధారించండి"],["What Ethertype and Multicast MAC address ranges are standardized for GOOSE and Sampled Values?","GOOSE uses Ethertype 0x88B8 and Multicast MAC range 01-0C-CD-01-00-00 to 01-0C-CD-01-01-FF. Sampled Values (SV) uses Ethertype 0x88BA and Multicast MAC","GOOSE కోసం Ethertype 0x88B8 మరియు Multicast MAC 01-0C-CD-01-00-00 నుండి 01-0C-CD-01-01-FF వరకు ఉపయోగిస్తారు."]],[9,2,"Substation Network Engineering From Scratch","సబ్‌స్టేషన్ నెట్‌వర్క్ ఇంజనీరింగ్ (Ethernet, IP, VLAN & Fiber)","Ethernet, MAC, IPv4 Subnetting, TCP vs UDP, Layer 2 vs Layer 3, Unicast/Multicast, Managed Switches, SFP & Fiber Optics","Ethernet, MAC, IPv4 సబ్‌నెట్టింగ్, TCP vs UDP, Layer 2 vs Layer 3, మల్టీకాస్ట్, మేనేజ్డ్ స్విచ్‌లు, SFP & ఫైబర్ ఆప్టిక్స్","DIAG-15-FIBER-TOPOLOGY","INDUSTRIAL_SWITCH","Managed Substation Ethernet Switch — SFP Fiber & VLAN Trunking","NETWORK","Open Switch Port & VLAN Inspector",[["Layer 2 (MAC / VLAN) vs Layer 3 (IPv4 / Subnet Mask / Gateway) & TCP vs UDP","Layer 2 (MAC / VLAN) vs Layer 3 (IPv4 / Subnet Mask / Gateway) & TCP vs UDP",["OSI Layer 2 (Data Link Layer) forwards frames within a local LAN segment using 48-bit hardware MAC addresses (e.g., 00:1B:1B:61:85:01 for Siemens IEDs","OSI Layer 3 (Network Layer) uses 32-bit IPv4 addresses and Subnet Masks (e.g., 10.132.10.11 / 255.255.255.0 = /24"],["OSI Layer 2 (Data Link Layer) అనేది 48-bit MAC అడ్రస్‌లు (ఉదా: 00:1B:1B:61:85:01 మరియు GOOSE మల్టీకాస్ట్ కోసం 01:0C:CD:01:00:01)","OSI Layer 3 (Network Layer) లో 32-bit IPv4 అడ్రస్‌లు మరియు సబ్‌నెట్ మాస్క్ (ఉదా: 10.132.10.0/24 = 255.255.255.0) ఉంటాయి."],["Unicast: 1-to-1 (MMS TCP/102); Multicast: 1-to-Many subscribed group (GOOSE, SV, PTP)","Optical Fiber in Substations: Multimode (OM3/OM4, 850/1300 nm"]]],"Practical IPv4 Addressing & Port Schedule for Our 132/33/11 kV Substation","మన 132/33/11 kV సబ్‌స్టేషన్ కోసం IPv4 అడ్రస్ ప్లాన్ & స్విచ్ పోర్ట్ షెడ్యూల్",["PRP LAN A Subnet: 10.132.10.0/24 (Mask 255.255.255.0); PRP LAN B Subnet: 10.132.20.0/24.","132 kV Bay IEDs: .11 (IED_132_L1), .12 (IED_132_L2), .13 (IED_132_BC), .14 (IED_132_T1), .15 (IED_132_T2).","33 kV & 11 kV Bay IEDs: .21 to .38; Station Servers: .200 (SCADA A), .201 (SCADA B), .210 (HMI), .220 (EWS)"],["PRP LAN A సబ్‌నెట్: 10.132.10.0/24; PRP LAN B సబ్‌నెట్: 10.132.20.0/24 (Mask 255.255.255.0).","132 kV IEDలు: .11 (L1), .12 (L2), .13 (BC), .14 (T1), .15 (T2).","33 kV & 11 kV IEDలు: .21 నుండి .38 వరకు; స్టేషన్ సర్వర్లు: .200 (SCADA A), .201 (SCADA B), .210 (HMI)"],["Assigning duplicate IP addresses to two IEDs after cloning a CID file without updating the <ConnectedAP> IP address.","Connecting a 1310 nm Singlemode SFP transceiver to aton-850 nm Multimode SFP transceiver across a patch cord."],["CID ఫైల్‌ను కాపీ చేసినప్పుడు కొత్త IED కి IP అడ్రస్ మార్చకుండా పాత IP నే ఉంచడం (Duplicate IP).","Singlemode SFP (1310 nm) ని Multimode SFP (850 nm) తో కనెక్ట్ చేయడం."],["Fiber link LED on Hirschmann Switch Port Gi1/3 is OFF after patching IED_132_BC","IED_132_BC కి ఫైబర్ ప్యాచ్ చేసిన తర్వాత స్విచ్ పోర్ట్ Gi1/3 పై లింక్ LED వెలగడం లేదు","Tx-to-Tx optical polarity (no crossover) or high attenuation / dirty LC ferrule","Tx నుండి Tx కి కలపడం (Tx-Rx క్రాస్ అవ్వకపోవడం) లేదా LC కనెక్టర్‌పై దుమ్ము ఉండటం","Measure optical power at LC receive ferrule using an Optical Power Meter (should be","Optical Power Meter తో Rx వైపు ఆప్టికల్ పవర్ కొలవండి (-8 dBm నుండి -18 dBm మధ్య ఉండాలి)","Roll/swap the A-B LC duplex clip at one end so IED Tx connects to Switch Rx and clean","LC డూప్లెక్స్ క్లిప్‌లో A-B ఫైబర్లను తారుమారు చేసి (Tx → Rx) ఫైబర్ టిప్‌ను క్లీన్ చేయండి","Verify Link Up green LED and 0 CRC/symbol errors on switch port counter","స్విచ్ పోర్ట్‌పై గ్రీన్ లింక్ LED మరియు 0 CRC ఎర్రర్స్ ఉన్నాయని నిర్ధారించండి"],["Can you ping a GOOSE message or route GOOSE across a standard Layer-3 IP router?","No. Ping uses ICMP over IPv4 (Layer 3), whereas IEC 61850 GOOSE (Ethertype 0x88B8) is a pure Layer-2 Ethernet multicast frame with no IP header.","లేదు. Ping అనేది Layer-3 (IP/ICMP) పై పనిచేస్తుంది, కానీ GOOSE (0x88B8) అనేది IP అడ్రస్ లేని స్వచ్ఛమైన Layer-2 Ethernet మల్టీకాస్ట్ ఫ్రేమ్."]],[10,2,"Redundancy (PRP/HSR/RSTP), Time Sync (PTP) & Cybersecurity","రిడండెన్సీ (PRP/HSR/RSTP), టైమ్ సింక్ (PTP) & సైబర్ సెక్యూరిటీ","IEC 62439-3 PRP & HSR, DANP, RedBox, IEEE 1588v2 PTP (61850-9-3), 1 ms SOE & IEC 62351 Hardening","IEC 62439-3 PRP & HSR, DANP, RedBox, IEEE 1588v2 PTP (61850-9-3), 1 ms SOE & IEC 62351 సైబర్ భద్రత","DIAG-13-PRP-HSR","PTP_CLOCK","Meinberg Lantime M1000 — IEEE 1588v2 PTP Grandmaster Clock","NETWORK","Open PRP / HSR Redundancy & Fault Simulator",[["PRP vs HSR vs RSTP Redundancy & Zero-Millisecond Recovery","PRP vs HSR vs RSTP రిడండెన్సీ & జీరో-మిల్లీసెకన్ల రికవరీ",["Rapid Spanning Tree Protocol (RSTP - IEEE 802.1w) has a topology reconvergence delay of 5 to 50 ms per hop","2) High-Availability Seamless Redundancy (HSR - Clause 5): Nodes form a daisy-chain ring without dedicated switches"],["RSTP (IEEE 802.1w) నెట్‌వర్క్‌లో ఫైబర్ కట్ అయినప్పుడు రికవరీ కావడానికి 5 నుండి 50 ms సమయం పడుతుంది","2) HSR (Clause 5): ఇందులో ప్రత్యేక స్విచ్‌లు లేకుండా IEDలన్నీ రింగ్ ఆకారంలో కనెక్ట్ అయి"],["NEVER bridge or cross-connect PRP LAN A and PRP LAN B switches together!","IEEE 1588v2 PTP Power Utility Profile (IEC/IEEE 61850-9-3) uses hardware timestamping and"]],["SNTP vs IEEE 1588v2 PTP Time Synchronization & IEC 62351 Cybersecurity","SNTP vs IEEE 1588v2 PTP టైమ్ సింక్రొనైజేషన్ & IEC 62351 సైబర్ సెక్యూరిటీ",["SNTP (UDP Port 123) provides 1–10 ms accuracy, sufficient for basic station bus SOE but inadequate for Process Bus Sampled Values.","IEC 62351 & NERC CIP / CEA Cybersecurity Hardening: 1) Role-Based Access Control (RBAC — Viewer, Operator, Engineer, Security Admin)"],["SNTP (UDP Port 123) కేవలం 1–10 ms కచ్చితత్వాన్ని మాత్రమే ఇస్తుంది. కానీ IEEE 1588v2 PTP (IEC/IEEE 61850-9-3) GPS గ్రాండ్‌మాస్టర్","IEC 62351 సైబర్ సెక్యూరిటీ నియమాలు: 1) Role-Based Access Control (RBAC), 2) ఉపయోగించని స్విచ్ పోర్టులను షట్‌డౌన్ చేయడం & MAC Port"],["When GPS antenna lock is lost, Meinberg PTP GM enters Holdover Mode using its internal","PRP Supervision frames (Ethertype 0x88FB) continuously monitor both LAN A and LAN B health"]]],"Testing PRP LAN-A Fiber Cut & PTP Grandmaster Failover","PRP LAN-A ఫైబర్ కట్ మరియు PTP గ్రాండ్‌మాస్టర్ ఫెయిల్‌ఓవర్ పరీక్ష",["In PRP / HSR Network Lab, verify IED_132_L1 shows LAN_A_OK = TRUE and LAN_B_OK = TRUE with 0 ms failover readiness.","Simulate 'Unplug LAN A Fiber': LAN_A_OK transitions to FALSE and raises a PRP supervision alarm","Verify PTP Best Master Clock Algorithm (BMCA) switches cleanly to backup Grandmaster if Primary GM loses GPS lock."],["PRP / HSR Network Lab లో IED_132_L1 యొక్క LAN A మరియు LAN B రెండూ Healthy గా ఉన్నాయని నిర్ధారించండి.","LAN A ఫైబర్ డిస్‌కనెక్ట్ చేసినప్పుడు LAN_A_Fail అలారం వస్తుంది, కానీ LAN B ద్వారా 0 ms లో ఎటువంటి ప్యాకెట్","ప్రైమరీ PTP క్లాక్ ఆఫ్ అయినప్పుడు BMCA ద్వారా బ్యాకప్ క్లాక్‌కు మారడాన్ని తనిఖీ చేయండి."],["Enabling standard NTP software polling alongside hardware PTP without prioritizing PTP as the primary clock source in the IED.","Connecting a non-PTP-aware unmanaged switch in the middle of an IEEE 1588v2 PTP path, introducing variable queueing jitter that breaks slave lock."],["PTP పాత్ మధ్యలో PTP Transparent Clock సపోర్ట్ లేని సాధారణ స్విచ్ పెట్టడం (దీనివల్ల టైమ్ జిట్టర్ పెరిగి క్లాక్ అన్‌లాక్ అవుతుంది).","PRP LAN A మరియు LAN B మధ్య ప్యాచ్ కార్డ్ కలపడం."],["All IEDs report 'ClockNotSynchronized' quality flag in MMS reports","అన్ని IEDల MMS రిపోర్టులలో 'ClockNotSynchronized' ఫ్లాగ్ వస్తోంది","PTP Grandmaster lost GPS antenna lock or switch ports are not configured as P2P","PTP గ్రాండ్‌మాస్టర్ GPS సిగ్నల్ కోల్పోవడం లేదా స్విచ్ పోర్టులపై PTP Transparent Clock","Check Meinberg PTP GM front-panel sync status and inspect switch PTP port state","Meinberg PTP క్లాక్ సింక్ స్టేటస్ మరియు స్విచ్ PTP పోర్ట్ స్థితిని తనిఖీ చేయండి","Enable IEEE 1588v2 Power Profile (61850-9-3) P2P Transparent Clock on all switch ports","అన్ని స్విచ్ పోర్టులపై IEEE 1588v2 P2P Transparent Clock ఎనేబుల్ చేసి GPS యాంటెన్నా","Confirm TimeQuality bit ClockNotSynchronized clears (0) across all 18 IEDs","మొత్తం 18 IEDలలో ClockNotSynchronized ఫ్లాగ్ క్లియర్ అయిందని నిర్ధారించండి"],["How does PRP achieve zero-millisecond (0 ms) recovery time compared to RSTP?","RSTP keeps backup links blocked and must detect link failure and recompute the spanning tree (taking 5–50 ms)","RSTP లో మెయిన్ లింక్ పోయిన తర్వాతే బ్యాకప్ లింక్ ఆన్ అవుతుంది (5–50 ms పడుతుంది); కానీ PRP లో ప్రతి ఫ్రేమ్ LAN A మరియు LAN B రెండింటిలో"]],[11,3,"IEC 61850 Standard & Parts Overview","IEC 61850 ప్రమాణం & భాగాల పూర్తి వివరణ (Standard Parts -5 to -10)","Why IEC 61850 Was Developed, Interoperability, Editions 1 / 2 / 2.1, and Standard Parts -5, -6, -7-1..4, -8-1, -9-2, -10","IEC 61850 ఆవశ్యకత, ఇంటర్‌ఆపరబిలిటీ, ఎడిషన్స్ 1 / 2 / 2.1, మరియు భాగాలు -5, -6, -7-1..4, -8-1, -9-2, -10","DIAG-16-DATA-MODEL","SIEMENS_7SJ85","Siemens SIPROTEC 5 7SJ85 — IEC 61850 Edition 2.1 Compliant IED","IED","Open IED Explorer (Edition 2.1 Stack)",[["Purpose of IEC 61850 & Breakdown of Parts -5 through -10","IEC 61850 యొక్క ముఖ్య ఉద్దేశ్యం & భాగాలు (-5 నుండి -10 వరకు)",["Before IEC 61850, substations used proprietary or register-based protocols (IEC 60870-5-103, Modbus","Standard Parts: IEC 61850-5 (Communication requirements & transfer time classes P1/P2/P3), IEC 61850-6 (SCL XML engineering language: ICD/SSD/SCD/CID/IID)"],["IEC 61850 రాకముందు సబ్‌స్టేషన్లలో Modbus, IEC-103 వంటి ప్రోటోకాల్స్ వాడేవారు. వాటిలో కేవలం రిజిస్టర్ నంబర్లు మాత్రమే ఉండేవి మరియు","ముఖ్యమైన భాగాలు: IEC 61850-5 (కమ్యూనికేషన్ అవసరాలు), 61850-6 (SCL XML ఫైల్స్), 61850-7-1 (మోడలింగ్ సూత్రాలు)"],["Interoperability (different vendors working together on the same network using standard","Edition 2 / 2.1 added improved simulation/test modes (LPHD.Sim, Beh)"]]],"Comparing Edition 1 vs Edition 2.1 IED Integration in Our Substation","మన సబ్‌స్టేషన్‌లో Edition 1 మరియు Edition 2.1 IED ఇంటిగ్రేషన్ పోలిక",["In our 132/33/11 kV fleet, Siemens 7SA87/7SJ85, ABB REF615, and GE Multilin 850 operate on IEC 61850 Edition 2.1","Verify in SCD header schema version (version='2007' revision='B' release='4' for Ed 2.1) and ensure backward-compatible"],["మన సబ్‌స్టేషన్‌లో Siemens 7SA87/7SJ85, ABB REF615 మరియు GE 850 రిలేలు Edition 2.1 పై పనిచేస్తాయి","SCD ఫైల్ తయారు చేసేటప్పుడు Ed 2.1 మరియు Ed 2.0 రిలేల మధ్య GOOSE <ExtRef> మరియు DataSet నియమాలు సరిగ్గా"],["Importing an Edition 2.1 ICD file into an older Edition 1 system configurator tool, causing XML schema validation failure.","Confusing IEC 61850-7-3 (CDCs like DPC/MV) with IEC 61850-7-4 (Logical Nodes like XCBR/MMXU)."],["Edition 2.1 ICD ఫైల్‌ను పాత Edition 1 టూల్‌లో ఇంపోర్ట్ చేయడం వల్ల XML Schema ఎర్రర్ రావడం.","IEC 61850-7-3 (CDC) మరియు IEC 61850-7-4 (Logical Nodes) మధ్య తేడా తెలియకపోవడం."],["System Configurator rejects ICD file import with 'Unsupported SCL Schema 2007B4'","System Configurator లో ICD ఫైల్ ఇంపోర్ట్ చేసినప్పుడు 'Unsupported SCL Schema 2007B4'","Engineering tool project is set to Edition 1 (2003) instead of Edition 2.1 (2007B4)","ఇంజనీరింగ్ టూల్ ప్రాజెక్ట్ వెర్షన్ Edition 2.1 కి బదులుగా పాత Edition 1 లో ఉంది","Check <SCL version='2007' revision='B' release='4'> in the ICD XML header","ICD XML ఫైల్ పైన <SCL version='2007' revision='B' release='4'> ఉందో తనిఖీ చేయండి","Upgrade SCD project schema setting to Edition 2.1 or export an Edition 2.0 compatible ICD","SCD ప్రాజెక్ట్ సెట్టింగ్‌ను Edition 2.1 కి మార్చండి లేదా రిలే టూల్ నుండి తగిన ఎడిషన్ ICD","Validate SCD against IEC 61850-6 XSD schema with 0 errors","IEC 61850-6 XSD స్కీమాతో 0 ఎర్రర్స్ వచ్చేలా ధృవీకరించండి"],["Which part of IEC 61850 defines Logical Nodes (like XCBR, MMXU, PTOC) and which part defines MMS & GOOSE mapping?","IEC 61850-7-4 defines Logical Nodes and Data Object names, while IEC 61850-8-1 defines the Specific Communication Service Mapping (SCSM) to MMS (TCP/IP)","IEC 61850-7-4 అనేది Logical Nodes (XCBR, MMXU, PTOC) ను నిర్వచిస్తుంది; IEC 61850-8-1 అనేది MMS మరియు GOOSE ప్రోటోకాల్ మ్యాపింగ్‌ను"]],[12,3,"IEC 61850 Object-Oriented Data Model","IEC 61850 ఆబ్జెక్ట్-ఓరియెంటెడ్ డేటా మోడల్ (PD/LD/LN/DO/DA)","Physical Device, Logical Device, Logical Node, Data Object, Data Attribute, FC, CDC, Quality (q) & Timestamp (t)","Physical Device, Logical Device, Logical Node, Data Object, Data Attribute, FC, CDC, క్వాలిటీ (q) & టైమ్‌స్టాంప్ (t)","DIAG-16-DATA-MODEL","ABB_REF615","ABB Relion REF615 — IEC 61850 Logical Device & LN Tree","MMS","Browse Live IEC 61850 Data Model in MMS Lab",[["Complete Hierarchy: PD → LD → LN → DO → DA & Functional Constraints (FC)","పూర్తి డేటా క్రమం: PD → LD → LN → DO → DA & Functional Constraints (FC)",["Every signal in an IEC 61850 IED is addressed by a self-describing hierarchical Object Reference:","Logical Node Groups (IEC 61850-7-4 First Letter): L = System Logical Nodes (LLN0, LPHD), P = Protection (PDIS Distance, PDIF Differential"],["IEC 61850 లో ప్రతి సిగ్నల్‌కు స్పష్టమైన చిరునామా (Object Reference) ఉంటుంది: `IEDNameLogicalDevice/LogicalNode.DataObject.DataAttr","Logical Node మొదటి అక్షరం దాని విభాగాన్ని తెలుపుతుంది: L = System (LLN0, LPHD), P = Protection (PDIS, PDIF, PTOC, PTRC)"],["Functional Constraints (FC): ST = Status, MX = Measurands (analog), CO = Control","Common Data Classes (CDC - IEC 61850-7-3): SPS (Single Point Status), DPS (Double Point Status)"]]],"Tracing How IED Hardware Input Becomes an HMI Signal via XCBR1.Pos & MMXU1.TotW","IED ఇన్‌పుట్ నుండి XCBR1.Pos మరియు MMXU1.TotW ద్వారా HMI సిగ్నల్‌గా మారే విధానం",["Breaker 52a/52b contacts wire to DI1/DI2 of IED_132_L1 → mapped internally to `IED_132_L1Application/XCBR1.Pos` (CDC =","Whenever 52a/52b changes, `XCBR1.Pos.stVal` updates (`on` / `off`), `XCBR1.Pos.q` is evaluated (`0x0000` Good)","`XCBR1.Pos.stVal`, `.q`, and `.t` are members of DataSet `dsStatus`, which triggers BRCB `brcbSt01` (`dchg=true`) to"],["బ్రేకర్ 52a/52b కాంటాక్టులు IED_132_L1 యొక్క DI1/DI2 కి కనెక్ట్ అయి లోపల `XCBR1.Pos` (CDC = DPC) కి మ్యాప్","బ్రేకర్ స్థితి మారిన వెంటనే `XCBR1.Pos.stVal`, `.q` (Good), మరియు `.t` (PTP UTC టైమ్‌స్టాంప్) అప్‌డేట్","ఈ మూడు అట్రిబ్యూట్లు `dsStatus` DataSet లో ఉండటం వల్ల `brcbSt01` (`dchg=true`) ద్వారా వెంటనే SCADA HMI కి MMS"],["Mapping only `XCBR1.Pos.stVal` into the DataSet without including `XCBR1.Pos.q` and `XCBR1.Pos.t` (or binding at the FCD Data Object level `XCBR1.Pos[ST]`), resulting in missing quality and SOE timestamps on SCADA.","Using GGIO1 for standard circuit breaker status instead of the mandatory standardized XCBR1 logical node."],["DataSet లో `stVal` మాత్రమే పెట్టి `q` (Quality) మరియు `t` (Timestamp) మర్చిపోవడం (దీనివల్ల SCADA లో SOE టైమ్‌స్టాంప్ రాదు).","బ్రేకర్ స్టేటస్ కోసం ప్రామాణికమైన `XCBR1` కి బదులుగా `GGIO1` వాడటం."],["SCADA shows analog MW value frozen even though feeder current is changing","ఫీడర్ కరెంట్ మారుతున్నప్పటికీ SCADA లో MW విలువ (MMXU1.TotW) మారడం లేదు","Deadband (`db`) in MMXU1.TotW.db CF configuration set too high or `dchg`/`dupd` trigger","MMXU1.TotW యొక్క Deadband (`db`) ఎక్కువగా ఉండటం లేదా BRCB లో `dchg`/`dupd` ఆఫ్ అయి ఉండటం","Browse `MMXU1.TotW.db` [CF] and `brcbMeas01.TrgOps` in MMS Lab","MMS Lab లో `MMXU1.TotW.db` మరియు `brcbMeas01.TrgOps` తనిఖీ చేయండి","Set deadband `db` to 1000 (1%) and enable `dchg=true, dupd=true","Deadband ను 1% కి సెట్ చేసి BRCB లో `dchg`, `dupd` మరియు `IntgPd=5000 ms` ఎనేబుల్ చేయండి","Verify live MW telemetry updates smoothly on SCADA HMI","SCADA HMI లో MW విలువలు నిరంతరం అప్‌డేట్ అవుతున్నాయని నిర్ధారించండి"],["What is the difference between PTOC1.Str.general and PTOC1.Op.general?","`PTOC1.Str.general` (CDC = ACD, Start/Pickup) becomes TRUE the instant fault current exceeds the pickup threshold (before the time-delay curve expires)","`PTOC1.Str.general` అనేది ఫాల్ట్ కరెంట్ పికప్ దాటిన వెంటనే (టైమ్ డిలే కంటే ముందే) TRUE అవుతుంది"]],[13,3,"IEC 61850 MMS Communication & Reporting (TCP/102)","IEC 61850 MMS కమ్యూనికేషన్ & రిపోర్టింగ్ (TCP Port 102)","Client/Server Architecture, TCP 102, Association, Browsing, Read/Write, BRCB vs URCB, DataSets, GI, IntgPd, TrgOps & Control","క్లయింట్/సర్వర్ నిర్మాణం, TCP 102, అసోసియేషన్, BRCB vs URCB, DataSets, GI, IntgPd, TrgOps & కంట్రోల్ సేవలు","DIAG-17-MMS-REPORTING","SIEMENS_7SJ85","Siemens SIPROTEC 5 7SJ85 — MMS Server (TCP Port 102)","MMS","Open Interactive MMS & RCB Lab",[["MMS Client/Server Architecture, Association & BRCB vs URCB Reporting","MMS క్లయింట్/సర్వర్ నిర్మాణం, అసోసియేషన్ & BRCB vs URCB రిపోర్టింగ్",["Manufacturing Message Specification (MMS - ISO 9506 mapped by IEC 61850-8-1) operates on a Client/Server model over TCP Port 102 (with RFC 1006 TPKT + ISO","Instead of slow cyclic polling, IEC 61850 MMS uses Report-by-Exception driven by Trigger Options (`TrgOps`): `dchg` (data change)"],["IEC 61850-8-1 ప్రకారం MMS (Manufacturing Message Specification) అనేది TCP Port 102 పై Client/Server పద్ధతిలో పనిచేస్తుంది.","పాత ప్రోటోకాల్స్ లాగా నిరంతరం పోలింగ్ చేయకుండా, MMS లో `TrgOps` (`dchg` - డేటా మారినప్పుడు, `qchg` - క్వాలిటీ మారినప్పుడు"],["BRCB Enable Sequence: 1) Associate TCP/102 → 2) Write OptFlds, TrgOps, IntgPd","You CANNOT modify DatSet, TrgOps, or IntgPd while RptEna is TRUE — the IED will return an MMS"]]],"Configuring & Testing BRCB01 (brcbSt01) on IED_33_F03 in MMS Lab","MMS Lab లో IED_33_F03 పై BRCB01 (brcbSt01) కాన్ఫిగరేషన్ & పరీక్ష",["Open MMS & RCB Lab and select `IED_33_F03` (Siemens 7SJ85, IP 10.132.10.21:102).","Inspect `brcbSt01` mapped to DataSet `dsStatus`: `TrgOps = dchg, qchg, dupd, gi, period`, `IntgPd = 5000 ms`","Click 'Trigger General Interrogation (GI)' and observe all dataset members (`XCBR1.Pos`, `CSWI1.Pos`, `CILO1.EnaOpn`"],["MMS & RCB Lab తెరిచి `IED_33_F03` (10.132.10.21:102) ఎంచుకోండి. MMS Association `ASSOCIATED` గా ఉందని","`dsStatus` కు లింక్ అయిన `brcbSt01` లో `TrgOps = dchg, qchg, dupd, gi, period`, `IntgPd = 5000 ms`","'Trigger General Interrogation (GI)' క్లిక్ చేసి అన్ని డేటా పాయింట్లు `general-interrogation` కారణంతో SCADA"],["Attempting to write TrgOps or IntgPd while RptEna is already TRUE.","Configuring two SCADA clients to enable the exact same BRCB instance (e.g., both trying to write RptEna=TRUE on brcbSt01), causing the second client to be rejected."],["RptEna = TRUE లో ఉండగా TrgOps లేదా IntgPd మార్చడానికి ప్రయత్నించడం.","రెండు వేర్వేరు SCADA సర్వర్లు ఒకే BRCB ఇన్‌స్టాన్స్‌ను (brcbSt01) యాక్సెస్ చేయడానికి ప్రయత్నించడం."],["IED responds to ping on 10.132.10.21, but SCADA MMS Client fails to associate on TCP Port","10.132.10.21 కు Ping వస్తోంది కానీ SCADA MMS క్లయింట్ TCP Port 102 లో కనెక్ట్ అవ్వడం లేదు","MMS server disabled in IED CID, firewall/ACL blocking TCP 102","IED లో MMS సర్వర్ ఆఫ్ అయి ఉండటం, TCP 102 బ్లాక్ అవ్వడం లేదా OSI параметర్లు (AP-Title","Test TCP port 102 socket connection and verify <ConnectedAP> OSI parameters","TCP Port 102 ఓపెన్ ఉందో లేదో తనిఖీ చేసి, SCD లోని <ConnectedAP> లో OSI-TSEL/SSEL/PSEL","Align SCADA MMS client OSI selectors with the IED's CID configuration and ensure max MMS","SCADA లో OSI పారామీటర్లను CID కి అనుగుణంగా సరిచేసి, గరిష్ట క్లయింట్ కనెక్షన్ల పరిమితి","Confirm MMS Initiate response succeeds and `brcbSt01.RptEna` transitions to TRUE","MMS Initiate విజయవంతమై `brcbSt01.RptEna = TRUE` అయినట్లు ధృవీకరించండి"],["What is the purpose of BufTm (Buffer Time) and EntryID in a Buffered Report Control Block (BRCB)?","`BufTm` aggregates multiple rapid changes of the same data object within a short window (e.g., 50–100 ms) into a single MMS report to prevent network","`BufTm` అనేది స్వల్ప సమయ వ్యవధిలో వచ్చే అనేక మార్పులను కలిపి ఒకే రిపోర్ట్‌గా పంపడానికి ఉపయోగపడుతుంది"]],[14,3,"IEC 61850 GOOSE Communication (Layer-2 Multicast)","IEC 61850 GOOSE కమ్యూనికేషన్ (Layer-2 మల్టీకాస్ట్)","Publisher/Subscriber, GoCB, DataSet, APPID, Multicast MAC, VLAN, Priority, confRev, stNum/sqNum, TAL, Retransmission & ExtRef","పబ్లిషర్/సబ్‌స్క్రైబర్, GoCB, DataSet, APPID, Multicast MAC, VLAN, Priority, confRev, stNum/sqNum, TAL & ExtRef","DIAG-18-GOOSE-MMS","ABB_REF615","ABB Relion REF615 — High-Speed GOOSE Subscriber & Publisher","GOOSE","Open Interactive GOOSE Lab",[["GOOSE Publisher/Subscriber Model, Frame Parameters & stNum/sqNum State Machine","GOOSE పబ్లిషర్/సబ్‌స్క్రైబర్ విధానం, ఫ్రేమ్ పారామీటర్లు & stNum/sqNum స్టేట్ మెషిన్",["Generic Object Oriented Substation Events (GOOSE - IEC 61850-8-1) provides ultra-fast (≤ 3–4 ms) horizontal peer-to-peer multicast communication between","Since Layer-2 multicast has no TCP ACK, GOOSE ensures reliability through continuous variable-rate retransmission controlled by two 32-bit counters: 1)"],["GOOSE (Generic Object Oriented Substation Events) అనేది ఒక IED నుండి మరొక IED కి ప్రొటెక్షన్ ట్రిప్, బ్రేకర్ ఫెయిల్యూర్ (50BF)","ఇందులో TCP ACK ఉండదు కాబట్టి, GOOSE రెండు 32-bit కౌంటర్ల సహాయంతో ఫ్రేమ్‌లను మళ్లీ మళ్లీ పంపుతుంది: 1) `stNum` (State Number -"],["Mandatory GOOSE Subscription Matching Parameters (<Inputs><ExtRef>): Destination Multicast MAC","Whenever a GOOSE DataSet member is added, deleted, or reordered in the SCD tool"]]],"Simulating a GOOSE Protection Trip & Retransmission Burst in GOOSE Lab","GOOSE Lab లో ప్రొటెక్షన్ ట్రిప్ & రీ-ట్రాన్స్‌మిషన్ బర్స్ట్ సిమ్యులేషన్",["Open GOOSE Lab and inspect `GoCB_33_F03` published by `IED_33_F03` (`01-0C-CD-01-00-03`, `APPID 0x0003`, `VLAN 20`","In normal state, `stNum = 1`, `sqNum` increments every `T0 = 1000 ms`, and `TAL = 2000 ms`.","Click 'Trigger Protection Trip (stNum++)': observe `stNum` jump to `2`, `sqNum` reset to `0`"],["GOOSE Lab తెరిచి `IED_33_F03` పబ్లిష్ చేసే `GoCB_33_F03` (`01-0C-CD-01-00-03`, `APPID 0x0003`, `VLAN 20`","సాధారణ స్థితిలో `stNum = 1` గా ఉండి, ప్రతి `1000 ms` కి `sqNum` పెరుగుతూ ఉంటుంది.","'Trigger Protection Trip' క్లిక్ చేయగానే `stNum = 2` కి మారి, `sqNum = 0` కి రీసెట్ అయి"],["Modifying a GOOSE publisher's DataSet (which increments confRev) and downloading only the publisher's CID without updating the subscriber IED's CID.","Configuring GOOSE on VLAN 20 in the IEDs while leaving the Ethernet switch access/trunk ports untagged without VLAN 20 membership."],["పబ్లిషర్ రిలేలో DataSet మార్చినప్పుడు `confRev` మారుతుంది; అప్పుడు సబ్‌స్క్రైబర్ రిలేలో కూడా కొత్త CID డౌన్‌లోడ్ చేయకపోతే GOOSE బ్లాక్ అవుతుంది.","రిలేలో VLAN 20 పెట్టి, ఈథర్నెట్ స్విచ్ పోర్టులో VLAN 20 అనుమతించకపోవడం."],["Wireshark on mirror port shows GOOSE frames from publisher","Wireshark లో GOOSE ఫ్రేమ్‌లు కనిపిస్తున్నాయి కానీ సబ్‌స్క్రైబర్ రిలేలో 'GOOSE Invalid /","`confRev` mismatch, `APPID` / Multicast MAC mismatch, VLAN 20 stripped/blocked on","`confRev` సరిపోలకపోవడం, `APPID`/MAC తేడా ఉండటం, లేదా స్విచ్ పోర్ట్‌లో VLAN 20 బ్లాక్","Compare Wireshark GOOSE PDU fields (`gocbRef`, `datSet`, `goID`, `confRev`, `ndsCom`","GOOSE Lab లో పబ్లిషర్ PDU విలువలను (`gocbRef`, `datSet`, `confRev`","Re-synchronize SCD `<ExtRef>` binding and download matching CID files to both publisher","SCD లో `<ExtRef>` బైండింగ్ సరిచేసి పబ్లిషర్ మరియు సబ్‌స్క్రైబర్ రెండింటిలోనూ CID","Verify subscriber GOOSE health LED turns green and virtual input toggles on publisher","సబ్‌స్క్రైబర్ GOOSE Health = OK అని వచ్చి సిగ్నల్ పనిచేస్తోందని నిర్ధారించండి"],["How does a GOOSE subscriber distinguish a real protection state change from a periodic heartbeat retransmission or a lost packet?","When a real state change occurs, `stNum` increments (`stNum_new > stNum_old`) and `sqNum` resets to `0`.","కొత్త ప్రొటెక్షన్ ఈవెంట్ వచ్చినప్పుడు `stNum` పెరుగుతుంది మరియు `sqNum = 0` అవుతుంది. సాధారణ హార్ట్‌బీట్ సమయంలో `stNum` మారకుండా `sqNum`"]],[15,3,"Sampled Values (IEC 61850-9-2 LE) & Control Models (SBO)","Sampled Values (IEC 61850-9-2 LE) & కంట్రోల్ మోడల్స్ (SBO)","Merging Units, 80/256 Samples/Cycle, Process Bus Sync, Direct Operate vs Select-Before-Operate (SBOes), CommandTermination & CILO1","Merging Units, 80/256 Samples/Cycle, Direct Operate vs Select-Before-Operate (SBOes), CommandTermination & CILO1 ఇంటర్‌లాక్","DIAG-19-SV-CONTROL","SIEMENS_7SA87","Siemens SIPROTEC 5 7SA87 — SBO Enhanced Security & 9-2 LE Process Bus","SLD","Test SBO Breaker Control on SLD",[["IEC 61850-9-2 LE Sampled Values & Merging Units","IEC 61850-9-2 LE Sampled Values & Merging Units పనితీరు",["In a Process-Bus digital substation, Stand-Alone Merging Units (SAMUs) installed near the switchyard CTs and VTs convert analog secondary currents (Ia","Every SV frame contains `svID`, `smpCnt` (Sample Counter `0..3999`, resetting to 0 at the exact top of every UTC second pulse), `confRev`"],["పూర్తి డిజిటల్ సబ్‌స్టేషన్లలో స్విచ్‌యార్డ్ వద్ద ఉండే Merging Unit (MU) అనేది CT/VT నుండి వచ్చే అనలాగ్ కరెంట్ (Ia, Ib, Ic","ప్రతి SV ఫ్రేమ్‌లో `svID`, `smpCnt` (`0..3999` - ప్రతి UTC సెకనుకు 0 కి రీసెట్ అవుతుంది)"],["IEC 61850-7-2 Control Models (`ctlModel`): 0 = `status-only`, 1 = `direct-with-normal-security`","All high-voltage circuit breakers and motorised disconnectors use `ctlModel = 4"]],["Four-Step Select-Before-Operate with Enhanced Security (SBOes) State Machine","Select-Before-Operate with Enhanced Security (SBOes) యొక్క 4-దశల ప్రక్రియ",["When an operator clicks a Circuit Breaker on the SCADA HMI (`ctlModel = sbo-with-enhanced-security` on `CSWI1.Pos`): Step 1 (`SelectWithValue` - `SBOw`):","Step 3 (`Operate` - `Oper`): Operator confirms 'Execute' → SCADA sends `CSWI1.Pos.Oper` with matching `ctlVal` and `ctlNum` → IED returns `Oper.rsp+` and"],["SCADA HMI నుండి సర్క్యూట్ బ్రేకర్‌ను ఆపరేట్ చేసేటప్పుడు `sbo-with-enhanced-security (ctlModel = 4)` నాలుగు దశల్లో పనిచేస్తుంది:","దశ 3 (`Operate - Oper`): ఆపరేటర్ 'Execute' నొక్కగానే `CSWI1.Pos.Oper` వెళ్లి రిలే అవుట్‌పుట్ కాంటాక్ట్ క్లోజ్ అవుతుంది."],["Common IEC 61850-7-2 `AddCause` Rejection Codes: `Blocked-by-switching-hierarchy` (Bay in"]]],"Executing a Full 4-Step SBOes Breaker Operation on BAY-132-L1","BAY-132-L1 పై 4-దశల SBOes బ్రేకర్ ఆపరేషన్ అమలు",["Open 132/33/11 kV SLD and click Circuit Breaker `132-L1` to open the Breaker Control Drawer.","Verify Pre-Check Matrix: Control Mode = `REMOTE`, Interlock `CILO1 = PERMITTED`, Spring = `CHARGED`, SF6 = `6.4 bar OK`.","Click '1. SELECT (SBOw)' → observe IED reservation timer activate → click '2."],["SLD తెరిచి `132-L1` సర్క్యూట్ బ్రేకర్‌పై క్లిక్ చేసి Breaker Control Drawer తెరవండి.","Pre-Check Matrix లో Control Mode = `REMOTE`, Interlock `CILO1 = PERMITTED`, Spring = `CHARGED`","'1. SELECT (SBOw)' నొక్కి రిజర్వేషన్ పొందిన తర్వాత '2. EXECUTE (Oper)' నొక్కండి"],["Configuring `direct-with-normal-security` (`ctlModel = 1`) on 132 kV primary switchgear instead of `sbo-with-enhanced-security` (`ctlModel = 4`).","Not wiring 52a/52b auxiliary feedback into XCBR1.Pos, which causes enhanced-security SBO commands to fail with `AddCause = Time-limit-over` at CommandTermination."],["132 kV బ్రేకర్లకు `sbo-with-enhanced-security (4)` కి బదులుగా `direct-operate (1)` పెట్టడం.","52a/52b ఫీడ్‌బ్యాక్ వైరింగ్ సరిగ్గా లేకపోవడం వల్ల బ్రేకర్ ఆపరేట్ అయినా `Time-limit-over` ఎర్రర్ రావడం."],["SBOw Select succeeds (`SBOw.rsp+`), Operator clicks Execute (`Oper`)","SBO సెలెక్ట్ అయి బ్రేకర్ భౌతికంగా ఆపరేట్ అయింది కానీ SCADA లో 'Command Failed:","52a/52b auxiliary feedback (`XCBR1.Pos.stVal`) did not update within `operTimeout` or is","బ్రేకర్ 52a/52b ఆగ్జిలరీ కాంటాక్ట్ ఫీడ్‌బ్యాక్ (`XCBR1.Pos.stVal`) నిర్ణీత సమయంలోగా IED","Check DI1 (52a) and DI2 (52b) status transitions in IED Explorer and verify","IED Explorer లో DI1 (52a), DI2 (52b) స్థితిని మరియు `operTimeout` సెట్టింగ్‌ను (1000–2000","Restore 110V DC wetting to 52a/52b contacts and ensure DI polarity matches DPC (`10` =","52a/52b కాంటాక్ట్ వెట్టింగ్ వోల్టేజ్ మరియు DI పోలారిటీ (`10` = Closed","Re-test SBO command and confirm `CommandTermination+` is received within 60 ms","మళ్లీ SBO కమాండ్ ఇచ్చి 60 ms లోపు `CommandTermination+` వస్తుందని నిర్ధారించండి"],["What is the difference between SBO with Normal Security (`ctlModel=2`) and SBO with Enhanced Security (`ctlModel=4`)?","SBO Normal Security (`ctlModel=2`) uses `Select` (without value) followed by `Operate` and ends as soon as the IED accepts the `Operate` request","SBO Normal Security (`ctlModel=2`) లో కమాండ్ పంపిన వెంటనే ప్రక్రియ పూర్తవుతుంది (బ్రేకర్ నిజంగా కదిలిందో లేదో తనిఖీ చేయదు)."]],[16,4,"SCL Files (ICD, SSD, SCD, CID, IID) & Engineering Workflow","SCL ఫైల్స్ (ICD, SSD, SCD, CID, IID) & ఇంజనీరింగ్ వర్క్‌ఫ్లో","IEC 61850-6 XML Structure (<Header>, <Substation>, <Communication>, <IED>, <DataTypeTemplates>), DataSets, GoCB, BRCB & ExtRef","IEC 61850-6 XML నిర్మాణం (<Header>, <Substation>, <Communication>, <IED>, <DataTypeTemplates>), DataSets, GoCB, BRCB & ExtRef","DIAG-20-SCL-FLOW","SCHNEIDER_P633","Schneider Electric MiCOM P633 — SCL Configured Differential IED","SIGNALS","Open Interactive SCL XML Workspace",[["All Six IEC 61850-6 SCL File Types & XML Structure","IEC 61850-6 లోని 6 రకాల SCL ఫైల్స్ & XML అంతర్గత నిర్మాణం",["IEC 61850-6 defines XML-based Substation Configuration Language (SCL) files so engineering tools from different vendors can exchange configuration data","Every SCL XML file contains five top-level sections under `<SCL>`: 1) `<Header id='...' version='...' revision='...'/>` (version history)"],["IEC 61850-6 ప్రకారం వివిధ కంపెనీల టూల్స్ మధ్య కాన్ఫిగరేషన్ మార్పిడి కోసం 6 రకాల XML ఫైల్స్ ఉంటాయి: 1) `.ICD` (వెండర్ రిలే","ప్రతి SCL XML ఫైల్‌లో 5 ప్రధాన భాగాలు ఉంటాయి: 1) `<Header>`, 2) `<Substation>`, 3) `<Communication>` (IP అడ్రస్‌లు, GOOSE MAC"],["In `<IED>`, the `<LN0>` element ALWAYS holds station-level `<DataSet>`, `<ReportControl>`","In `<Communication><SubNetwork><ConnectedAP><GSE>`, the network parameters (`MAC-Address`"]]],"Inspecting Annotated SCL XML for IED_132_L1 in Signal Mapping & SCL Workspace","Signal Mapping & SCL మాడ్యూల్‌లో IED_132_L1 యొక్క SCL XML కోడ్ విశ్లేషణ",["Open Signal Mapping & SCL Workspace → click tab 'SCL XML Engineering Workspace (ICD / IID / SCD / CID)'.","Select `.SCD` Master File and inspect `<Communication><SubNetwork name='StationBus_PRP'>`: verify `IED_132_L1` IP","Inspect `<IED name='IED_132_L1'>` → `<LN0>` → `<DataSet name='dsStatus'>`, `<ReportControl name='brcbSt01'"],["Signal Mapping & SCL మాడ్యూల్ తెరిచి 'SCL XML Engineering Workspace' ట్యాబ్ ఎంచుకోండి.","`.SCD` ఫైల్ సెలెక్ట్ చేసి `<Communication>` విభాగంలో `IED_132_L1` యొక్క IP `10.132.10.11`","`<IED name='IED_132_L1'>` లోపల `<LN0>` లో ఉన్న `<DataSet name='dsStatus'>`, `<ReportControl>`"],["Forgetting that `<P type='VLAN-ID'>` in SCL XML is written in 3-digit Hexadecimal (`014` in XML = VLAN 20 in decimal; writing `020` in XML actually configures VLAN 32 in decimal!).","Editing a CID file manually in Notepad without updating the master SCD file, causing version drift during SAT."],["SCL XML ఫైల్‌లో `<P type='VLAN-ID'>` ఎప్పుడూ Hexadecimal లో ఉంటుందనే విషయం మర్చిపోవడం (ఉదాహరణకు Decimal 20 కోసం XML లో `014` అని ఉండాలి; పొరపాటున `020` అని రాస్తే అది Decimal 32 అవుతుంది!).","మాస్టర్ SCD ఫైల్‌లో మార్చకుండా నేరుగా CID ఫైల్‌ను నోట్‌ప్యాడ్‌లో ఎడిట్ చేయడం."],["GOOSE VLAN on wire is VLAN 32 (0x020) instead of switch VLAN 20 (0x014) after SCD export","SCD ఎక్స్‌పోర్ట్ చేసిన తర్వాత GOOSE ఫ్రేమ్ VLAN 20 కి బదులుగా VLAN 32 పై వెళ్తోంది","Engineer entered `020` in `<P type='VLAN-ID'>` in SCL XML","SCL XML లో `<P type='VLAN-ID'>` విలువ Hexadecimal లో ఉంటుందని గమనించకుండా `014` కి","Capture GOOSE frame in Wireshark or inspect `<GSE><Address><P type='VLAN-ID'>` in the SCD","Wireshark లో గానీ లేదా SCL XML వ్యూయర్‌లో గానీ `<P type='VLAN-ID'>` విలువను తనిఖీ చేయండి","Set `<P type='VLAN-ID'>014</P>` (Hex for Decimal 20) in the System Configurator and","System Configurator లో VLAN 20 (Hex `014`) గా సరిచేసి మళ్లీ CID ఎక్స్‌పోర్ట్ చేయండి","Verify Wireshark 802.1Q header shows `VLAN ID: 20` and subscriber receives GOOSE","Wireshark లో `VLAN ID: 20` అని కనిపిస్తుందో మరియు సబ్‌స్క్రైబర్‌కు GOOSE చేరుతుందో"],["Why is VLAN-ID represented as `014` for VLAN 20 inside an IEC 61850-6 SCL XML file?","Because per IEC 61850-6 Section 9.3.8, `<P type='VLAN-ID'>` and `<P type='APPID'>` in the `<GSE>` and `<SMV>` address blocks are encoded as unsigned","IEC 61850-6 ప్రమాణం ప్రకారం SCL XML లోని `<P type='VLAN-ID'>` మరియు `<P type='APPID'>` విలువలను Hexadecimal రూపంలో రాస్తారు."]],[17,4,"Multi-Vendor IED Engineering (Siemens, Schneider, ABB, GE)","మల్టీ-వెండర్ IED ఇంజనీరింగ్ (Siemens, Schneider, ABB, GE)","DIGSI 5 (SIPROTEC 5), Easergy/PACiS (MiCOM), PCM600 (Relion 615/670) & EnerVista (Multilin 850/UR) Workflows","DIGSI 5 (SIPROTEC 5), Easergy/PACiS (MiCOM), PCM600 (Relion) & EnerVista (Multilin) కాన్ఫిగరేషన్ విధానాలు","DIAG-20-SCL-FLOW","GE_D60","GE Vernova Multilin D60 — Multi-Vendor IEC 61850 Integration","IED","Inspect All 12 Relay Models in IED Explorer",[["Vendor-Specific Engineering Tools & Multi-Vendor Integration Workflow","వివిధ కంపెనీల IED ఇంజనీరింగ్ సాఫ్ట్‌వేర్లు & మల్టీ-వెండర్ ఇంటిగ్రేషన్ విధానం",["In a multi-vendor substation, each relay manufacturer uses its own IED Configuration Tool (ICT)","3) Schneider Electric MiCOM (`P143`, `P633`, `C264`): Configured using **Easergy Studio (MiCOM S1 Agile)** and **PACiS System Configuration Editor (SCE)**"],["మల్టీ-వెండర్ సబ్‌స్టేషన్‌లో ప్రతి కంపెనీ రిలేకు ప్రత్యేక సాఫ్ట్‌వేర్ (ICT) ఉంటుంది: 1) Siemens SIPROTEC 5 (`7SJ85`, `7SA87`","3) Schneider Electric MiCOM (`P143`, `P633`, `C264`) కోసం **Easergy Studio (S1 Agile)** మరియు **PACiS SCE** ఉపయోగిస్తారు (PSL"],["Never invent unsupported vendor menus: in ABB PCM600, GOOSE receive signals are mapped in the","When integrating a Siemens 7SJ85 publisher with an ABB REF615 subscriber"]]],"Cross-Vendor GOOSE Engineering: Siemens 7SJ85 (Publisher) → ABB REF615 (Subscriber)","మల్టీ-వెండర్ GOOSE ఇంజనీరింగ్: Siemens 7SJ85 (పబ్లిషర్) → ABB REF615 (సబ్‌స్క్రైబర్)",["In Siemens DIGSI 5 (`IED_33_F03`, 7SJ85): Add `PTRC1.Tr.general` and `PTRC1.Tr.q` to DataSet `dsGooseTrip`","In System Configurator (SCT): Import the 7SJ85 `.IID` into the master `.SCD`","In ABB PCM600: Import the updated `.SCD`, connect the received GOOSE binary input in Signal Matrix to the Breaker"],["Siemens DIGSI 5 లో (`IED_33_F03`, 7SJ85): `PTRC1.Tr.general` మరియు `PTRC1.Tr.q` లను `dsGooseTrip` లో చేర్చి","System Configurator (SCT) లో: `.IID` ఫైల్‌ను మాస్టర్ `.SCD` లోకి ఇంపోర్ట్ చేసి","ABB PCM600 లో: ఆ `.SCD` ని ఇంపోర్ట్ చేసి Signal Matrix లో GOOSE ఇన్‌పుట్‌ను ప్రొటెక్షన్ లాజిక్‌కు కలిపి"],["Mapping only `.stVal` without `.q` (Quality) in cross-vendor GOOSE between Siemens and ABB relays — ABB Relion 615 GOOSE binary receive blocks require the paired Quality attribute to validate signal health!","Forgetting to reboot or activate the new IEC 61850 configuration bank in the IED after CID download."],["Siemens నుండి ABB రిలేకు GOOSE మ్యాప్ చేసేటప్పుడు `.stVal` తో పాటు `.q` (Quality) మ్యాప్ చేయకపోవడం (ABB Relion రిలేలకు Quality అట్రిబ్యూట్ తప్పనిసరి).","CID డౌన్‌లోడ్ చేసిన తర్వాత రిలేలో కొత్త కాన్ఫిగరేషన్ యాక్టివేట్ చేయకపోవడం."],["ABB REF615 shows GOOSE link healthy from Siemens 7SJ85","Siemens 7SJ85 నుండి ABB REF615 కి GOOSE లింక్ బాగానే ఉంది కానీ GOOSEBIN అవుట్‌పుట్","Quality attribute (`PTRC1.Tr.q`) was not included alongside `PTRC1.Tr.general` in the","GOOSE DataSet మరియు PCM600 Signal Matrix లో `general` తో పాటు `.q` (Quality) అట్రిబ్యూట్","Open Signal Matrix in PCM600 and check if both Value and Quality columns are linked to","PCM600 Signal Matrix లో Value మరియు Quality రెండూ GOOSEBIN బ్లాక్‌కు కనెక్ట్ అయ్యాయో లేదో","Include `.q` immediately after `.general`/`.stVal` in the publisher DataSet and link both","పబ్లిషర్ DataSet లో `.q` జతచేసి PCM600 లో రీ-మ్యాప్ చేసి SCD/CID అప్‌డేట్ చేయండి","Verify GOOSEBIN output quality = Good (1) and test end-to-end trip transfer","GOOSEBIN క్వాలిటీ Good అని వచ్చి ట్రిప్ పనిచేస్తుందని నిర్ధారించండి"],["What is the difference between an ICT (IED Configuration Tool) and an SCT (System Configuration Tool) in IEC 61850-6?","An ICT (such as DIGSI 5, PCM600, Easergy Studio, or EnerVista) configures vendor-specific protection settings, internal logic (CFC/PSL/FlexLogic)","ICT (ఉదా: DIGSI 5, PCM600, EnerVista) అనేది ఒక నిర్దిష్ట కంపెనీ రిలే యొక్క ప్రొటెక్షన్ సెట్టింగ్స్ మరియు లాజిక్ కాన్ఫిగర్ చేయడానికి వాడతారు."]],[18,4,"Signal Mapping, Alarms, Events & 50 SAS Signals","సిగ్నల్ మ్యాపింగ్, అలారాలు, ఈవెంట్లు & 50 SAS సిగ్నల్స్","Field Equipment → IED DI → IEC 61850 DO → DataSet → BRCB → SCADA DB → HMI & Complete 50-Signal Catalogue","ఫీల్డ్ పరికరం → IED DI → IEC 61850 DO → DataSet → BRCB → SCADA DB → HMI & 50 ప్రధాన SAS సిగ్నల్స్","DIAG-21-SIGNAL-CHAIN","SIEMENS_7SJ85","End-to-End IEC 61850 Signal Mapping Chain (1,206 Instantiated Points)","SIGNALS","Open 50-Signal Master Catalogue & Live Bay Mapping",[["Complete 6-Stage Signal Chain & The 4 Categories of SAS Signals","6-దశల పూర్తి సిగ్నల్ చైన్ & 4 ప్రధాన SAS సిగ్నల్ విభాగాలు",["Every substation signal traverses six verifiable engineering stages: Stage 1 (Field Equipment Contact / CT / VT / Sensor in Switchyard) → Stage 2 (IED","In our SAS Engineering Hub, 50 standardized SAS signal templates are instantiated across all 18 bays (1,206 total points) in four categories: 1) Circuit"],["సబ్‌స్టేషన్‌లో ప్రతి సిగ్నల్ 6 దశల గుండా ప్రయాణిస్తుంది: 1) స్విచ్‌యార్డ్ ఫీల్డ్ కాంటాక్ట్/CT/VT → 2) IED యొక్క DI/AI/BO మాడ్యూల్","మన సబ్‌స్టేషన్‌లో మొత్తం 50 ప్రామాణిక SAS సిగ్నల్స్ (18 బేలలో కలిపి 1,206 పాయింట్లు) 4 విభాగాలుగా ఉన్నాయి: 1) Circuit Breaker &"],["Alarms vs Events: Every state change is logged as a time-stamped Event in the SOE archive","Analog Scaling: Verify primary engineering units (A, kV, MW, MVAR"]]],"Point-to-Point Verification of Signal #41 (Buchholz Relay Trip) on TX-T1 (50 MVA)","TX-T1 (50 MVA) పై సిగ్నల్ #41 (Buchholz Relay Trip) యొక్క పాయింట్-టు-పాయింట్ తనిఖీ",["In Signal Mapping & SCL Workspace, select Signal #41 (`Buchholz Relay Trip`) on `BAY-132-T1` (`IED_132_T1`","Trace Stage 1 (Buchholz mercury/reed contact on T1 conservator pipe) → Stage 2 (`DI-09` 110V DC input) → Stage 3"],["Signal Mapping & SCL మాడ్యూల్‌లో `BAY-132-T1` (`IED_132_T1`, Siemens 7UT86) పై సిగ్నల్ #41 (`Buchholz Relay","Stage 1 (ట్రాన్స్‌ఫార్మర్ బుకోల్జ్ ట్రిప్ కాంటాక్ట్) → Stage 2 (`DI-09` 110V DC) → Stage 3 (`PTRC1.Tr.general"],["Swapping Buchholz Alarm (Stage 1 gas accumulation) and Buchholz Trip (Stage 2 oil surge) terminal wires at the transformer marshalling box, causing an immediate 50 MVA transformer trip on minor gas alarm!","Mapping OLTC Tap Position (1–17 integer step) as a floating-point analog instead of an integer BCD/step-position CDC (`ISC`)."],["ట్రాన్స్‌ఫార్మర్ మార్షలింగ్ బాక్స్ వద్ద Buchholz Alarm మరియు Buchholz Trip వైర్లను తారుమారు చేయడం (దీనివల్ల సాధారణ అలారం వచ్చినా ట్రాన్స్‌ఫార్మర్ ట్రిప్ అయిపోతుంది!).","OLTC ట్యాప్ పొజిషన్ (1–17) ను ఇంటిజర్ (`ISC` CDC) గా కాకుండా తప్పు డేటా టైప్‌గా మ్యాప్ చేయడం."],["Transformer Winding Temperature (WTI) Trip operates in IED_132_T1","IED_132_T1 లో WTI Trip ఆపరేట్ అయింది కానీ SCADA HMI లో అలారం కనిపించడం లేదు","`STMP1.Trip.stVal` was omitted from `dsAlarm` DataSet in the IED or mapped to the wrong","IED యొక్క `dsAlarm` DataSet లో `STMP1.Trip.stVal` చేర్చకపోవడం లేదా SCADA డేటాబేస్‌లో","Check IED local LED/SOE log vs MMS Lab `dsAlarm` members and Signal Mapping table","IED యొక్క SOE లాగ్ మరియు MMS Lab లో `dsAlarm` సభ్యులను తనిఖీ చేయండి","Add `STMP1.Trip.stVal`, `.q`, `.t` to `dsAlarm` in SCD/CID and bind to SCADA tag","`dsAlarm` లో `STMP1.Trip` చేర్చి SCADA ట్యాగ్ `SAS_132_T1_WTI_TRIP` కి లింక్ చేయండి","Simulate WTI trip contact and confirm CRITICAL alarm banner + audible horn on SCADA HMI","WTI ట్రిప్ సిమ్యులేట్ చేసి SCADA HMI పై క్రిటికల్ అలారం వస్తుందని నిర్ధారించండి"],["Why is a Point-to-Point (100% IO check) mandatory during FAT and SAT even when SCL files are validated?","Because SCL validation only verifies the software XML model from the IED inward; it cannot detect physical field wiring swaps (such as 52a/52b inversion","SCL వాలిడేషన్ కేవలం రిలే లోపలి సాఫ్ట్‌వేర్ మ్యాపింగ్‌ను మాత్రమే తనిఖీ చేస్తుంది; కానీ ఫీల్డ్ వైరింగ్ తారుమారు (ఉదా: 52a/52b లేదా Buchholz"]],[19,4,"SCADA Server, Operator HMI, Station Gateway, RTU & RCC","SCADA సర్వర్, ఆపరేటర్ HMI, స్టేషన్ గేట్‌వే, RTU & RCC ఇంటిగ్రేషన్","Hot-Standby SCADA Architecture, HMI Mimics, Station Gateway Protocol Translation (MMS → IEC-104), Control Authority & Historian","హాట్-స్టాండ్‌బై SCADA, HMI మిమిక్స్, స్టేషన్ గేట్‌వే ప్రోటోకాల్ అనువాదం (MMS → IEC-104), కంట్రోల్ అథారిటీ & హిస్టోరియన్","DIAG-23-GATEWAY-RCC","STATION_GATEWAY","Redundant Station Telecontrol Gateway — MMS Client to IEC-104 Server","IEC104_LAB","Open IEC 60870-5-104 Telecontrol Lab",[["Redundant SCADA Servers, Operator HMI & Station Telecontrol Gateway Architecture","రిడండెంట్ SCADA సర్వర్లు, ఆపరేటర్ HMI & స్టేషన్ టెలికంట్రోల్ గేట్‌వే నిర్మాణం",["At the Station Level, two hot-standby SCADA Servers (`SRV-SCADA-A` at 10.132.10.200 and `SRV-SCADA-B` at 10.132.10.201) subscribe concurrently to","For upstream telecontrol to the State Load Despatch Centre (SLDC) / Remote Control Center (RCC)"],["స్టేషన్ స్థాయిలో రెండు హాట్-స్టాండ్‌బై SCADA సర్వర్లు (`SRV-SCADA-A` 10.132.10.200 మరియు `SRV-SCADA-B` 10.132.10.201) అన్ని 18","రిమోట్ కంట్రోల్ సెంటర్ (SLDC / RCC) కు డేటా పంపడానికి Station Gateway (`GTW-RCC-01` 10.132.10.230) స్టేషన్ బస్ వైపు IEC 61850 MMS"],["Station Local / Remote Control Authority Switch: When Station Authority = `SUB-HMI (Local","When an IED loses MMS communication to the Station Gateway"]]],"Tracing an RCC Remote Breaker Open Command Through the Station Gateway (IEC-104 → MMS SBO)","RCC నుండి స్టేషన్ గేట్‌వే ద్వారా రిమోట్ బ్రేకర్ కమాండ్ ప్రయాణించే విధానం (IEC-104 → MMS SBO)",["Verify Station Control Authority is set to `REMOTE (RCC)` and Bay `132-L1` is set to `REMOTE`.","RCC Master sends IEC 60870-5-104 `C_DC_NA_1 (Type ID 46 Double Command)` on `IOA 2001` with `S/E = 1 (Select)` and `COT","Station Gateway translates `IOA 2001 Select` into an IEC 61850 MMS `CSWI1.Pos.SBOw` request to `IED_132_L1`"],["Station Control Authority `REMOTE (RCC)` లో మరియు బే `REMOTE` మోడ్‌లో ఉన్నాయని నిర్ధారించండి.","RCC మాస్టర్ నుండి `IOA 2001` పై IEC-104 `C_DC_NA_1 (Type 46)` `S/E = 1 (Select)`","గేట్‌వే దానిని MMS `CSWI1.Pos.SBOw` గా మార్చి `IED_132_L1` కి పంపుతుంది"],["Allowing both Substation HMI and Remote RCC to issue concurrent breaker commands without a mutually exclusive Station Local/Remote authority switch.","Not propagating IEC 61850 `.q` (Invalid/Substituted) flags into IEC-104 Quality Descriptor (`QDS: IV/SB/NT/BL`) in the Gateway mapping table."],["సబ్‌స్టేషన్ HMI మరియు రిమోట్ RCC రెండూ ఒకేసారి కమాండ్ ఇచ్చేలా ఉంచడం (Station Local/Remote అథారిటీ లేకపోవడం).","IED కమ్యూనికేషన్ పోయినప్పుడు గేట్‌వేలో IEC-104 క్వాలిటీ బిట్ (`IV / NT`) సెట్ చేయకపోవడం."],["RCC receives IEC-104 `COT = 47 (Negative Activation Confirmation)` when attempting to","RCC నుండి Bay 132-L1 ఆపరేట్ చేసినప్పుడు `COT = 47 (Negative ActCon)` తిరస్కరణ వస్తోంది","Station Control Authority is set to `SUB-HMI (Local)` or Bay 132-L1 is in `LOCAL` mode","స్టేషన్ కంట్రోల్ అథారిటీ `SUB-HMI` లో ఉండటం లేదా బే `LOCAL` మోడ్‌లో ఉండటం","Check Station Authority state in IEC-104 Lab and Bay Local/Remote (`Loc.stVal`) in SLD","IEC-104 Lab లో Station Authority మరియు SLD లో Bay Local/Remote స్థితిని తనిఖీ చేయండి","Switch Station Authority to `REMOTE (RCC)` and Bay 132-L1 to `REMOTE`","Station Authority ని `REMOTE (RCC)` కి మరియు బేను `REMOTE` కి మార్చండి","Re-issue Type 46 Select/Execute from IEC-104 Lab and verify `COT = 7 → COT = 10`","మళ్లీ Type 46 కమాండ్ ఇచ్చి `COT = 7 → COT = 10` ద్వారా బ్రేకర్ ఆపరేట్ అయిందని"],["What is the role of the Station Gateway in a digital substation?","The Station Gateway acts as a protocol converter, data concentrator, and security boundary between the internal substation IEC 61850 Station Bus (MMS","స్టేషన్ గేట్‌వే అనేది సబ్‌స్టేషన్ లోపలి IEC 61850 MMS నెట్‌వర్క్‌కు మరియు బయట ఉన్న SLDC/RCC యొక్క IEC 60870-5-104 నెట్‌వర్క్‌కు మధ్య"]],[20,4,"Industrial Communication Protocols in Substations","సబ్‌స్టేషన్ ఇండస్ట్రియల్ కమ్యూనికేషన్ ప్రోటోకాల్స్ పూర్తి పోలిక","MMS, GOOSE, Sampled Values, Modbus RTU/TCP, IEC-101/103/104, DNP3, OPC UA, SNMP & SNTP/NTP/PTP","MMS, GOOSE, Sampled Values, Modbus RTU/TCP, IEC-101/103/104, DNP3, OPC UA, SNMP & SNTP/NTP/PTP","DIAG-18-GOOSE-MMS","SCADA_SERVER","Multi-Protocol Substation Communication Stack","MODBUS_LAB","Explore Protocol Labs (MMS / GOOSE / Modbus / 104 / OPC UA)",[["Comparative Architecture of All 12 Substation Protocols","సబ్‌స్టేషన్‌లో ఉపయోగించే 12 ప్రధాన ప్రోటోకాల్స్ యొక్క సాంకేతిక పోలిక",["A modern SAS engineer must understand where each protocol fits: 1) **IEC 61850 MMS** (TCP Port 102 — Bay IED Server ↔ SCADA/Gateway Client","5) **IEC 60870-5-101** (Serial telecontrol to RTUs), **IEC 60870-5-103** (Serial/optical legacy protection relay companion standard)"],["ఒక SAS ఇంజనీర్ సబ్‌స్టేషన్ లోని అన్ని ప్రోటోకాల్స్ గురించి పూర్తిగా తెలుసుకోవాలి: 1) **IEC 61850 MMS** (TCP Port 102 - IED నుండి","5) **IEC 60870-5-101/103** (సీరియల్ RTU/రిలే ప్రోటోకాల్స్) & **IEC 60870-5-104** (TCP Port 2404 - స్టేషన్ గేట్‌వే నుండి SLDC/RCC"],["Protocol Selection Summary: IED-to-IED fast trip = GOOSE (`0x88B8`)"]]],"Tracing 33 kV Feeder Active Power (MW) Across MMS, Modbus TCP, IEC-104 & OPC UA","33 kV ఫీడర్ MW కొలతను MMS, Modbus TCP, IEC-104 మరియు OPC UA లలో ట్రేస్ చేయడం",["In Bay `33-F01`: Protection IED (`ABB REF615`) reports `MMXU1.TotW.mag.f = 8.40 MW` via IEC 61850 MMS (TCP 102) to","Multifunction Feeder Meter (`Schneider PM8000` at 10.132.10.51:502) exposes Active Power in Holding Registers","Station Gateway maps `8.40 MW` to IEC 60870-5-104 `IOA 3001` (`M_ME_TF_1` Type 36 Measured Value Short Float with"],["Bay `33-F01` లో: `ABB REF615` రిలే `MMXU1.TotW.mag.f = 8.40 MW` విలువను IEC 61850 MMS (TCP 102) ద్వారా SCADA","అదే బే లోని ఎనర్జీ మీటర్ (10.132.10.51:502) Modbus TCP `FC03` ద్వారా Holding Registers `40005–40006`","స్టేషన్ గేట్‌వే దీనిని IEC-104 `IOA 3001` (`Type 36` Float, TCP 2404) గా SLDC కి పంపుతుంది"],["Byte/Word-order (Big-Endian `ABCD` vs Word-Swapped `CDAB`) mismatch when reading 32-bit IEEE 754 floats over Modbus TCP across two 16-bit registers (`40005` & `40006`), producing garbage values like `1.42e-38`.","Forgetting to send `STARTDT act` (U-frame `0x07`) after opening TCP Port 2404 in IEC 60870-5-104 — no I-frames will flow until `STARTDT con` (`0x0B`) is exchanged!"],["Modbus TCP లో 32-bit Float చదివేటప్పుడు రెండు 16-bit రిజిస్టర్ల Word Order (`ABCD` vs `CDAB`) తారుమారు అవ్వడం వల్ల తప్పుడు విలువలు రావడం.","IEC 60870-5-104 లో TCP 2404 కనెక్ట్ అయిన తర్వాత `STARTDT act (0x07)` పంపకపోవడం (ఇది పంపే వరకు డేటా రాదు)."],["Modbus TCP client connects to Energy Meter on Port 502","Modbus TCP Port 502 కనెక్ట్ అయింది కానీ 32-bit Float MW విలువ `-4.82e+24` అని తప్పుగా","16-bit register word order (`ABCD` vs `CDAB`) or 0-based vs 1-based register offset","16-bit రిజిస్టర్ల Word Order (`ABCD` vs `CDAB`) లేదా అడ్రస్ ఆఫ్‌సెట్ (+1) తేడా ఉండటం","Inspect raw hex register pair in Modbus TCP Lab (`Reg 30001/30002`) and check IEEE 754","Modbus TCP Lab లో రా హెక్స్ (Hex) రిజిస్టర్ విలువలను మరియు Word Order ను తనిఖీ చేయండి","Toggle Word Swap (`CDAB` ↔ `ABCD`) and verify 0-based register offset matches meter manual","Word Order ను `ABCD` (Big-Endian) కు మార్చి రిజిస్టర్ ఆఫ్‌సెట్ సరిచేయండి","Confirm decoded Float32 value reads `33.10 kV` / `8.40 MW` accurately","డీకోడ్ చేసిన విలువ `33.10 kV` / `8.40 MW` గా సరిగ్గా వస్తుందని నిర్ధారించండి"],["Why does IEC 60870-5-104 require `STARTDT act` after the TCP handshake on Port 2404?","Because IEC 60870-5-104 supports multiple redundant TCP connections between the master and the station gateway where only one link is actively","IEC 60870-5-104 లో మాస్టర్ మరియు గేట్‌వే మధ్య మెయిన్ మరియు బ్యాకప్ TCP కనెక్షన్లు రెండూ ఓపెన్ అయి ఉంటాయి."]],[21,5,"Factory Acceptance Testing (FAT) — Start to Finish","ఫ్యాక్టరీ యాక్సెప్టెన్స్ టెస్టింగ్ (FAT) — పూర్తి ప్రక్రియ","FAT Planning, Document Review, IED Config Audit, MMS/GOOSE/Signal/Alarm/SOE/HMI/SBO/Interlock/PRP/Gateway Testing & Punch-List","FAT ప్రణాళిక, డాక్యుమెంట్ సమీక్ష, MMS/GOOSE/సిగ్నల్/అలారం/SOE/HMI/SBO/ఇంటర్‌లాక్/PRP/గేట్‌వే పరీక్షలు & పంచ్-లిస్ట్","DIAG-24-FATSAT-FLOW","SCADA_WORKSTATION","FAT Test Bench — Multi-Vendor Panels, Switch Rack & SCADA HMI","FATSAT","Open FAT / SAT Laboratory",[["Complete FAT Sequence, Test Procedures & Punch-List Management","పూర్తి FAT పరీక్షా క్రమం, విధానాలు & పంచ్-లిస్ట్ నిర్వహణ",["Factory Acceptance Testing (FAT) validates the integrated SAS panels, network switches, IED configurations, SCADA HMI graphics","Standard 12-Step FAT Protocol: 1) Approved Drawing & Document Review (SLD, Schematics, Signal List, SCD Revision)"],["Factory Acceptance Testing (FAT) అనేది ప్యానెల్స్‌ను సబ్‌స్టేషన్ సైట్‌కు పంపకముందే ఫ్యాక్టరీలో కస్టమర్ సమక్షంలో పూర్తి SAS","12-దశల FAT ప్రోటోకాల్: 1) ఆమోదించిన డ్రాయింగ్స్ & SCD తనిఖీ, 2) ప్యానెల్ విజువల్ & ఫెర్రూల్ తనిఖీ, 3) మెగ్గర్ & 110V DC పవర్-అప్"],["Category-A Punch Item: Safety hazard, protection trip failure","Always archive the final 'FAT-Frozen' SCD file, CID files, and switch configurations with"]]],"Running FAT Test Case #4 (BRCB Buffer Replay After LAN Disconnect) in FAT/SAT Lab","FAT/SAT Lab లో BRCB బఫర్ రీప్లే పరీక్షను అమలు చేయడం",["Disconnect both LAN A and LAN B Ethernet ports of `IED_33_F03` from the SCADA Server to simulate complete station-bus","While disconnected, toggle CB 52a/52b auxiliary contacts 3 times (`OPEN → CLOSED → OPEN`) and inject an overcurrent","Reconnect LAN A after 30 seconds: verify `SCADA Server A` resynchronizes `brcbSt01` using the last `EntryID` and"],["`IED_33_F03` యొక్క LAN A మరియు LAN B ఫైబర్‌లను తాత్కాలికంగా తీసివేసి కమ్యూనికేషన్ కట్ చేయండి.","కనెక్షన్ లేని సమయంలో బ్రేకర్ 52a/52b కాంటాక్టులను 3 సార్లు మార్చి, ఒక ట్రిప్ ఇవ్వండి.","30 సెకన్ల తర్వాత LAN A తిరిగి కనెక్ట్ చేయండి: `brcbSt01` తన `EntryID` ద్వారా ఆ 4 ఈవెంట్లను అసలు"],["Testing only the 'happy path' (command succeeds) during FAT without testing negative interlock cases (confirming CB close is BLOCKED when Earth Switch 89E is closed!).","Using uncalibrated test instruments or unapproved draft signal lists during witness FAT."],["FAT సమయంలో కేవలం బ్రేకర్ క్లోజ్ అవ్వడాన్ని మాత్రమే పరీక్షించి, ఎర్త్ స్విచ్ 89E క్లోజ్ లో ఉన్నప్పుడు బ్రేకర్ క్లోజ్ బ్లాక్ అవుతుందా లేదా అనే నెగటివ్ ఇంటర్‌లాక్ పరీక్ష చేయకపోవడం.","ఆమోదించని డ్రాఫ్ట్ సిగ్నల్ లిస్ట్‌తో FAT నిర్వహించడం."],["During FAT BRCB buffer test, events generated while offline are lost upon reconnect","FAT లో కనెక్షన్ కట్ అయినప్పుడు జరిగిన ఈవెంట్లు తిరిగి కనెక్ట్ అయ్యాక SCADA లో రాలేదు","SCADA client sent `PurgeBuf = TRUE` or `GI = TRUE` before EntryID resynchronization","SCADA క్లయింట్ కనెక్ట్ అవ్వగానే `PurgeBuf = TRUE` పంపడం లేదా BRCB కి బదులుగా URCB వాడటం","Capture MMS `SetBRCBValues` request in Wireshark upon reconnect","Wireshark లో రీ-కనెక్ట్ సమయంలో వెళ్లే `SetBRCBValues` ప్యాకెట్‌ను తనిఖీ చేయండి","Configure SCADA MMS driver to write the last stored 8-byte `EntryID` with `PurgeBuf =","SCADA డ్రైవర్‌లో `PurgeBuf = FALSE` ఉంచి చివరి `EntryID` పంపేలా సెట్ చేయండి","Repeat offline event test and verify 100% of buffered SOE events appear on SCADA","మళ్లీ ఆఫ్‌లైన్ పరీక్ష చేసి అన్ని SOE ఈవెంట్లు SCADA లోకి వస్తున్నాయని నిర్ధారించండి"],["What are Category A, Category B, and Category C punch-list items in FAT?","Category A items are critical safety, protection, or hardware defects that block panel dispatch until rectified and re-witnessed at the factory.","Category A అనేవి ప్యానెల్ రవాణాను ఆపే తీవ్రమైన భద్రతా/ప్రొటెక్షన్ లోపాలు (ఫ్యాక్టరీలోనే సరిచేయాలి)."]],[22,5,"Site Acceptance Testing (SAT) & Live Commissioning","సైట్ యాక్సెప్టెన్స్ టెస్టింగ్ (SAT) & లైవ్ కమిషనింగ్","Site Installation Checks, Cable/Fiber OTDR Testing, Primary/Secondary Injection, Live Breaker Trip, Safety LOTO/PTW & As-Built","సైట్ తనిఖీలు, కేబుల్/ఫైబర్ OTDR టెస్ట్, ప్రైమరీ/సెకండరీ ఇంజెక్షన్, లైవ్ బ్రేకర్ ట్రిప్, భద్రతా నియమాలు (PTW/LOTO) & As-Built","DIAG-24-FATSAT-FLOW","SIEMENS_7UT86","SAT Site Commissioning — Secondary Injection & Trip Matrix Sign-Off","FATSAT","Open SAT Commissioning Checklist",[["SAT Workflow, Secondary/Primary Injection & Live Equipment Safety Boundaries","SAT కమిషనింగ్ క్రమం, ప్రైమరీ/సెకండరీ ఇంజెక్షన్ & భద్రతా నియమాలు",["Site Acceptance Testing (SAT) verifies the complete SAS after panels are erected in the substation control room and connected to the actual outdoor","Mandatory Safety & Authorization Boundaries for Live/Site Work: 1) Never perform wiring changes or secondary injection on an in-service bay without an"],["Site Acceptance Testing (SAT) అనేది ప్యానెల్స్‌ను సబ్‌స్టేషన్ సైట్‌లో అమర్చి, స్విచ్‌యార్డ్ లోని అసలు CTలు, VTలు","సైట్ భద్రతా నియమాలు (Safety Rules): 1) ఆన్‌లైన్ సబ్‌స్టేషన్‌లో పనిచేసేటప్పుడు అధికారిక **Permit-to-Work (PTW)**"],["Pre-Energization Mandatory Checks: CT Knee-Point & Polarity (P1 toward Bus, P2 toward Line)"]]],"Executing Pre-Energization SAT Checks on 50 MVA Transformer T1 (BAY-132-T1)","50 MVA ట్రాన్స్‌ఫార్మర్ T1 (BAY-132-T1) ఎనర్జైజ్ చేయడానికి ముందు చేసే SAT పరీక్షలు",["Verify CT Ratio & Polarity on 132 kV HV side (400/1A) and 33 kV LV side (1000/1A) by primary current injection","Simulate Buchholz Trip, OTI Trip, WTI Trip, PRV Trip, and OLTC Surge Trip directly at the transformer marshalling box","After energization at no-load and 10% load, read `PDIF1` differential current `Idiff` (< 0.02 p.u.) and restraining"],["132 kV HV వైపు (400/1A) మరియు 33 kV LV వైపు (1000/1A) ప్రైమరీ ఇంజెక్షన్ ద్వారా CT రేషియో మరియు పోలారిటీ తనిఖీ","ట్రాన్స్‌ఫార్మర్ మార్షలింగ్ బాక్స్ వద్ద Buchholz, OTI, WTI, PRV ట్రిప్ కాంటాక్టులను యాక్చువేట్ చేసి 132 kV","లోడ్ పెట్టిన వెంటనే `PDIF1` లో డిఫరెన్షియల్ కరెంట్ `Idiff ≈ 0` మరియు బయాస్ కరెంట్ `Ibias` సరిగ్గా ఉందని తనిఖీ"],["Reversing CT secondary star-point connection on one side of a transformer differential relay (87T), which causes `Idiff = 2 × I_load` instead of `0` and trips the transformer on load pickup!","Forgetting to restore Test Block (TTB) links and remove LPHD1.Sim / Test Mode before handing the bay over for commercial energization."],["ట్రాన్స్‌ఫార్మర్ డిఫరెన్షియల్ రిలే (87T) లో ఒక వైపు CT స్టార్-పాయింట్ వైరింగ్ రివర్స్ చేయడం (దీనివల్ల లోడ్ వేయగానే `Idiff = 2 × I_load` వచ్చి ట్రాన్స్‌ఫార్మర్ ట్రిప్ అవుతుంది!).","పరీక్షలు పూర్తయిన తర్వాత Test Block (TTB) లింక్‌లను మరియు రిలే Test Mode ను సాధారణ స్థితికి మార్చడం మర్చిపోవడం."],["50 MVA Transformer T1 trips on 87T Differential (PDIF1) immediately when 33 kV Incomer is","33 kV ఇన్‌కమర్ ఆన్ చేసి లోడ్ వేయగానే 50 MVA ట్రాన్స్‌ఫార్మర్ 87T (PDIF1) పై ట్రిప్","LV CT secondary polarity (S1/S2) reversed or wrong vector-group / CT star-point grounding","LV CT సెకండరీ పోలారిటీ (S1/S2) రివర్స్ అవ్వడం లేదా 7UT86 రిలేలో CT స్టార్-పాయింట్ దిశ","Inspect disturbance recorder (COMTRADE) waveform in 7UT86: HV and LV currents are in","7UT86 లోని COMTRADE ఫాల్ట్ రికార్డులో HV మరియు LV కరెంట్ ఫేజ్ యాంగిల్స్ తనిఖీ చేయండి","Verify physical CT S1/S2 wiring against schematic and set correct CT star-point direction","CT S1/S2 వైరింగ్ సరిచూసి DIGSI 5 లో CT స్టార్-పాయింట్ దిశను సరిచేయండి","Re-energize at light load and confirm `Idiff ≈ 0.00 p.u.` and `Ibias = I_load` across L1","మళ్లీ లోడ్ వేసి L1, L2, L3 మూడు ఫేజ్‌లలో `Idiff ≈ 0.00 p.u.` ఉందని నిర్ధారించండి"],["What is the difference between FAT and SAT?","FAT (Factory Acceptance Test) is conducted at the manufacturer's factory using simulated field I/O to verify panel wiring, SAS network architecture","FAT అనేది ఫ్యాక్టరీలో సిమ్యులేషన్ ఇన్‌పుట్లతో ప్యానెల్స్ మరియు సాఫ్ట్‌వేర్‌ను పరీక్షించే ప్రక్రియ."]],[23,5,"Communication Troubleshooting Playbooks","కమ్యూనికేషన్ ట్రబుల్‌షూటింగ్ ప్లేబుక్స్ (15 Fault Scenarios)","MMS Association Failure, GOOSE Timeout, VLAN/APPID/DataSet Mismatch, RCB Disabled, Duplicate IP, PRP/HSR Break & Bad Quality","MMS ఫెయిల్యూర్, GOOSE టైమౌట్, VLAN/APPID/DataSet తేడా, RCB ఆఫ్, డూప్లికేట్ IP, PRP/HSR ఫైబర్ కట్ & క్వాలిటీ సమస్యలు","DIAG-18-GOOSE-MMS","INDUSTRIAL_SWITCH","Substation Network & Protocol Troubleshooting Workbench","FAULTS","Open Interactive Fault Injection & Troubleshooting Lab",[["Systematic 5-Step Troubleshooting Methodology for IEC 61850 Networks","IEC 61850 నెట్‌వర్క్ సమస్యలను పరిష్కరించే 5-దశల పద్ధతి",["When troubleshooting any SAS communication issue, never guess — follow the 5-step engineering sequence from physical layer to application layer: 1)","Key Failure Signatures: 1) **MMS Association Failure**: Ping works (`ICMP OK`), but TCP 102 refuses or resets → check IED MMS server enable"],["సబ్‌స్టేషన్ కమ్యూనికేషన్ సమస్య వచ్చినప్పుడు ఊహించకుండా 5-దశల పద్ధతిని పాటించాలి: 1) **Symptom** (లక్షణం ఏమిటి?)","ప్రధాన లోపాల గుర్తింపు: 1) **MMS ఫెయిల్యూర్**: Ping పనిచేస్తూ TCP 102 కనెక్ట్ కాకపోతే OSI పారామీటర్లు లేదా క్లయింట్ లిమిట్ తనిఖీ"],["Bad Quality (`q` bit analysis): `validity = invalid (01)` + `detailQual = oldData` means the"]]],"Diagnosing & Resolving 5 Classic Substation Communication Faults","5 ప్రధాన సబ్‌స్టేషన్ కమ్యూనికేషన్ లోపాలను గుర్తించి సరిచేసే విధానం",["Case A (VLAN Mismatch): Publisher `IED_33_F03` sends GOOSE on VLAN 20, but switch port Gi1/4 was left as untagged","Case B (RCB Disabled): SCADA shows static power values after IED reboot → Fix: Enable automatic `SetBRCBValues","Case C (Duplicate IP): `IED_11_F02` was commissioned with `10.132.10.21` (already used by `IED_33_F03`) → Fix: Reassign"],["కేస్ A (VLAN Mismatch): పబ్లిషర్ VLAN 20 పై GOOSE పంపుతుంటే స్విచ్ పోర్ట్ VLAN 10 లోనే ఉండిపోయింది →","కేస్ B (RCB Disabled): రిలే రీబూట్ అయిన తర్వాత SCADA లో విలువలు మారడం లేదు → పరిష్కారం: SCADA డ్రైవర్","కేస్ C (Duplicate IP): రెండు రిలేలకు ఒకే IP (`10.132.10.21`) ఇవ్వడం వల్ల కనెక్షన్ ఫ్లాప్ అవుతోంది →"],["Disabling VLAN filtering across the entire switch to 'quickly fix' a GOOSE VLAN mismatch instead of configuring the proper tagged VLAN on the specific port.","Ignoring `q = question / invalid` quality flags on HMI mimics during commissioning."],["GOOSE పనిచేయడం లేదని స్విచ్‌లో మొత్తం VLAN భద్రతను ఆఫ్ చేయడం.","HMI స్క్రీన్‌పై కనిపించే `Invalid / Questionable` క్వాలిటీ ఫ్లాగ్‌లను నిర్లక్ష్యం చేయడం."],["MMS connection to IED_33_F03 drops and reconnects every 45 seconds","IED_33_F03 యొక్క MMS కనెక్షన్ ప్రతి 45 సెకన్లకు కట్ అయి మళ్లీ కనెక్ట్ అవుతోంది","Duplicate IPv4 address (`10.132.10.21`) assigned to another device on LAN A","మరొక పరికరానికి కూడా అదే IP (`10.132.10.21`) ఉండటం వల్ల ARP క్యాష్ మారిపోతోంది","Disconnect IED_33_F03 fiber and run `ping 10.132.10.21` + `arp -a` from Engineering","IED_33_F03 ఫైబర్ తీసివేసి EWS నుండి `ping 10.132.10.21` మరియు `arp -a` రన్ చేయండి","Identify the rogue device MAC address from the switch MAC table","స్విచ్ MAC టేబుల్ ద్వారా ఆ రెండవ పరికరాన్ని గుర్తించి దానికి సరైన IP కేటాయించండి","Reconnect IED_33_F03 and verify continuous MMS association with 0 drops over 24 hours","IED_33_F03 ని తిరిగి కనెక్ట్ చేసి కనెక్షన్ స్థిరంగా ఉందని నిర్ధారించండి"],["If an IED is pinging successfully, how can you quickly tell whether an MMS failure is a network/firewall issue or an IEC 61850 configuration issue?","Run a TCP Port 102 socket check (e.g., `Test-NetConnection -Port 102` or Wireshark capture). If TCP SYN to port 102 receives `RST` or times out","మొదట TCP Port 102 కనెక్షన్ తనిఖీ చేయాలి. ఒకవేళ TCP SYN కే సమాధానం రాకపోతే అది ఫైర్‌వాల్ లేదా MMS సర్వర్ ఆఫ్ సమస్య."]],[24,5,"Breaker Control, Interlocking & Protection Testing","బ్రేకర్ కంట్రోల్, ఇంటర్‌లాకింగ్ & ప్రొటెక్షన్ టెస్టింగ్","Open/Close/Trip Commands, Local/Remote, CILO1, SBO Timeout, 52a/52b Feedback, GOOSE Trip, TCS (74) & Breaker Failure (50BF)","ఓపెన్/క్లోజ్/ట్రిప్ కమాండ్స్, Local/Remote, CILO1, SBO టైమౌట్, 52a/52b ఫీడ్‌బ్యాక్, GOOSE ట్రిప్, TCS (74) & 50BF","DIAG-05-SCHEMATIC","SIEMENS_7SJ85","Breaker Control, Trip Circuit Supervision (74) & 50BF Breaker Failure Logic","SLD","Open SLD & Breaker Control Drawer",[["Operational Close/Open vs Protection Trip & Breaker Failure (50BF / LBB)","ఆపరేషనల్ ఓపెన్/క్లోజ్ కమాండ్, ప్రొటెక్షన్ ట్రిప్ & బ్రేకర్ ఫెయిల్యూర్ (50BF / LBB)",["An operational Open/Close command from SCADA (`CSWI1.Pos.SBOw → Oper`) is a voluntary switching action that MUST pass Local/Remote (`Loc`)","Breaker Failure Protection (`50BF / RBRF1 / LBB`): Whenever `PTRC1.Tr` issues a trip command to a circuit breaker"],["SCADA నుండి ఆపరేటర్ ఇచ్చే Open/Close కమాండ్ (`CSWI1`) తప్పనిసరిగా Local/Remote (`Loc`), ఇంటర్‌లాక్ (`CILO1`)","Breaker Failure Protection (`50BF / RBRF1 / LBB`): రిలే ట్రిప్ కమాండ్ ఇచ్చిన వెంటనే `50BF` టైమర్ (`150–200 ms`) మొదలవుతుంది."],["Trip Circuit Supervision (`74 / TCS`): Monitors TC1 and TC2 coil continuity in both CB OPEN","Anti-Pumping (`52Y`): Prevents a circuit breaker from repeatedly closing and tripping"]]],"Testing 50BF Breaker Failure GOOSE Inter-Trip from Feeder 33-F03 to Incomer 33-INC1","ఫీడర్ 33-F03 నుండి ఇన్‌కమర్ 33-INC1 కు 50BF బ్రేకర్ ఫెయిల్యూర్ GOOSE ట్రిప్ పరీక్ష",["Inject 3.5 A secondary fault current into `IED_33_F03` (`Siemens 7SJ85`) while simulating a stuck breaker (keep `52a =","At `t = 20 ms`, `PTOC1.Op` and `PTRC1.Tr` assert and start `RBRF1 (50BF)`. Because current remains > 0.1 In after `150","`IED_33_F03` publishes GOOSE (`stNum++`) on VLAN 20 → `IED_33_INC1` (`ABB REF615`) receives the 50BF GOOSE in `2.2 ms`"],["`IED_33_F03` లో 3.5 A ఫాల్ట్ కరెంట్ ఇంజెక్ట్ చేసి, బ్రేకర్ స్టక్ అయినట్లుగా `52a = CLOSED` ఉంచండి.","`t = 20 ms` వద్ద `PTRC1.Tr` ఆపరేట్ అయి `RBRF1 (50BF)` టైమర్ మొదలవుతుంది.","వెంటనే VLAN 20 పై GOOSE మెసేజ్ వెళ్లి `2.2 ms` లో ఇన్‌కమర్ రిలే `IED_33_INC1` (`ABB REF615`) ను ట్రిప్"],["Relying only on 52a auxiliary contact without current-check (`I > 0.1 In`) for 50BF initiation, which can cause a false busbar trip if 52a linkage sticks mechanically when no fault current is flowing.","Testing Trip Circuit Supervision (TCS) only when the breaker is OPEN and forgetting to verify continuity through the 52a branch when the breaker is CLOSED."],["50BF కోసం కరెంట్ చెక్ (`I > 0.1 In`) లేకుండా కేవలం 52a కాంటాక్ట్ మాత్రమే వాడటం.","TCS (74) పరీక్షను బ్రేకర్ OPEN లో ఉన్నప్పుడు మాత్రమే చేసి, CLOSED స్థితిలో 52a మార్గాన్ని పరీక్షించకపోవడం."],["Breaker CLOSE command from HMI is accepted by IED (`Oper.rsp+`), closing relay clicks","HMI నుండి ఇచ్చిన CLOSE కమాండ్‌కు రిలే క్లిక్ అవుతోంది కానీ బ్రేకర్ భౌతికంగా క్లోజ్ అవ్వడం","86 Master Trip Lockout relay not reset, Spring not charged","86 లాకౌట్ రిలే రీసెట్ కాకపోవడం, స్ప్రింగ్ ఛార్జ్ అవ్వకపోవడం","Measure +110V DC down the closing chain in the MK: 86 NC contact → Local/Remote Remote","MK లో క్లోజింగ్ సర్క్యూట్ వరుసగా మల్టీమీటర్‌తో తనిఖీ చేయండి: 86 NC → 52b NC → Spring","Reset the hand-reset 86 Lockout relay on the CRP panel after clearing the fault cause and","CRP ప్యానెల్‌పై ఉన్న 86 Lockout రిలేను రీసెట్ చేసి స్ప్రింగ్ ఛార్జ్ అయిందో లేదో చూడండి","Re-issue SBO Close command and confirm breaker closes in ~55 ms","మళ్లీ SBO Close కమాండ్ ఇచ్చి బ్రేకర్ ~55 ms లో క్లోజ్ అవుతుందని నిర్ధారించండి"],["Why does a Protection Trip bypass CILO1 interlocking while an Operator Open command checks CILO1?","Because a Circuit Breaker is specifically designed to interrupt full short-circuit fault current under any switching topology; during an electrical fault","సర్క్యూట్ బ్రేకర్ ఏ పరిస్థితిలోనైనా ఫాల్ట్ కరెంట్‌ను ఆపగలదు. షార్ట్-సర్క్యూట్ జరిగినప్పుడు పరికరాలు పేలిపోకుండా మిల్లీసెకన్లలో కరెంట్‌ను"]],[25,5,"Advanced Diagnostics, Wireshark Analysis & Maintenance","అడ్వాన్స్‌డ్ డయాగ్నస్టిక్స్, Wireshark విశ్లేషణ & మెయింటెనెన్స్","Wireshark Dissectors (mms, goose, sv, iec60870_104, modbus), Switch Port Counters, PTP Offset, Config Backups & Maintenance","Wireshark ఫిల్టర్లు (mms, goose, sv, iec60870_104, modbus), స్విచ్ కౌంటర్లు, PTP ఆఫ్‌సెట్, బ్యాకప్స్ & మెయింటెనెన్స్","DIAG-18-GOOSE-MMS","ENGINEERING_WORKSTATION","SAS Engineering Workstation — Wireshark, IEDScout & Switch Diagnostics","GOOSE","Inspect Live GOOSE & MMS Frames in Lab",[["Wireshark Display Filters & Packet Inspection for Substation Engineers","సబ్‌స్టేషన్ ఇంజనీర్ల కోసం Wireshark ఫిల్టర్లు & ప్యాకెట్ విశ్లేషణ",["By configuring a SPAN / Mirror Port on the Hirschmann station-bus switch connected to the Engineering Workstation","2) **`mms` or `tcp.port == 102`**: Inspect `initiate-RequestPDU`, `confirmed-RequestPDU (read / write / getNameList)`"],["మేనేజ్డ్ స్విచ్‌లో Mirror Port (SPAN) ద్వారా ఇంజనీరింగ్ వర్క్‌స్టేషన్‌లో Wireshark ఉపయోగించి ప్రోటోకాల్ ప్యాకెట్లను స్పష్టంగా","2) **`mms` లేదా `tcp.port == 102`**: MMS అసోసియేషన్, BRCB రిపోర్టులు (`RptID`, `EntryID`"],["Switch Port Diagnostics via SNMP / CLI: Always check `Rx CRC Errors`, `FCS Errors`","Configuration Management Golden Rule: Maintain an offline, version-controlled repository of"]]],"Analyzing a Captured GOOSE Frame & Switch Port Counter During Intermittent Packet Loss","ప్యాకెట్ లాస్ సమయంలో Wireshark GOOSE ఫ్రేమ్ మరియు స్విచ్ కౌంటర్ల విశ్లేషణ",["Filter Wireshark by `goose && eth.dst == 01:0c:cd:01:00:03`. Observe `stNum = 4`","Open Hirschmann Switch Port Inspector on Port `Gi1/3`: observe `Rx CRC Errors = 142` and SFP Rx Optical Power = `-29.4","Clean the contaminated LC fiber connector at the relay patch panel with an optical click-cleaner → Rx power recovers to"],["Wireshark లో `goose && eth.dst == 01:0c:cd:01:00:03` ఫిల్టర్ పెట్టినప్పుడు `stNum = 4` లో `sqNum` వరుసగా `12","వెంటనే స్విచ్ పోర్ట్ `Gi1/3` కౌంటర్లు చూడగా `Rx CRC Errors = 142` మరియు ఆప్టికల్ పవర్ `-29.4 dBm` (చాలా","LC ఫైబర్ కనెక్టర్‌ను ఆప్టికల్ క్లీనర్‌తో శుభ్రం చేయగానే పవర్ `-12.8 dBm` కి పెరిగి"],["Capturing traffic on a non-mirrored switch port, which only shows broadcast/multicast traffic and misses unicast TCP/102 MMS traffic between the IED and SCADA server!","Updating IED firmware on a live bay without backing up the existing `.CID`, setting parameters, and disturbance records first."],["Mirror Port (SPAN) కాన్ఫిగర్ చేయకుండా సాధారణ స్విచ్ పోర్ట్‌లో Wireshark పెట్టి Unicast MMS ట్రాఫిక్ కనిపించడం లేదని అనుకోవడం.","పాత `.CID` మరియు సెట్టింగ్స్ బ్యాకప్ తీసుకోకుండా రిలే ఫర్మ్‌వేర్ అప్‌డేట్ చేయడం."],["Station network experiences intermittent MMS timeouts and GOOSE sqNum gaps on Bay 33-F02","Bay 33-F02 లో అప్పుడప్పుడూ MMS టైమౌట్లు మరియు GOOSE sqNum గ్యాప్‌లు వస్తున్నాయి","Degraded SFP transceiver / dirty LC fiber ferrule or macro-bend in patch cord causing bit","SFP ఆప్టికల్ పవర్ తగ్గడం, LC కనెక్టర్‌పై దుమ్ము లేదా ప్యాచ్ కార్డ్ మడత పడటం వల్ల CRC","Check switch port `Gi1/2` Rx CRC error counter and SFP DDM optical power (dBm)","స్విచ్ పోర్ట్ `Gi1/2` లో CRC ఎర్రర్ కౌంటర్ మరియు SFP DDM ఆప్టికల్ పవర్ (dBm) తనిఖీ చేయండి","Clean LC ferrules, replace sharply bent patch cord, and clear port counters","LC కనెక్టర్లను క్లీన్ చేసి, మడత పడిన ప్యాచ్ కార్డ్ మార్చి కౌంటర్లను రీసెట్ చేయండి","Monitor port for 1 hour under full traffic; confirm 0 CRC errors and 0 sqNum gaps","1 గంట పాటు పర్యవేక్షించి 0 CRC ఎర్రర్స్ మరియు 0 sqNum గ్యాప్స్ నిర్ధారించండి"],["Why do you need a Switch Mirror Port (SPAN) to capture MMS traffic in Wireshark, whereas GOOSE traffic is often visible without SPAN?","Because MMS uses Unicast TCP/IP (Port 102), which a managed Ethernet switch forwards ONLY between the specific IED port and the SCADA server port.","MMS అనేది Unicast TCP/IP (Port 102) కాబట్టి స్విచ్ దానిని కేవలం IED పోర్ట్ మరియు SCADA పోర్ట్ మధ్య మాత్రమే పంపుతుంది (కాబట్టి వేరే"]],[26,6,"Complete 132/33/11 kV SAS Engineering Project Package","పూర్తి 132/33/11 kV SAS ఇంజనీరింగ్ ప్రాజెక్ట్ ప్యాకేజీ","Project Specifications, 18-Bay Equipment Schedule, IED List, IP/VLAN Plan, Fiber Schedule, Protocol Matrix & 1,206-Point Signal List","ప్రాజెక్ట్ వివరాలు, 18-బేల షెడ్యూల్, IED జాబితా, IP/VLAN ప్లాన్, ఫైబర్ షెడ్యూల్, ప్రోటోకాల్ మ్యాట్రిక్స్ & 1,206 సిగ్నల్ లిస్ట్","DIAG-02-SLD","SIEMENS_7SA87","Complete 132/33/11 kV Digital Substation Design Baseline","IED","Explore Complete 18-IED Fleet & IP Plan",[["Master Project Baseline: Bays, IEDs, IP Subnets, VLANs & Protocols","మాస్టర్ ప్రాజెక్ట్ బేస్‌లైన్: బేలు, IEDలు, IP సబ్‌నెట్లు, VLANలు & ప్రోటోకాల్స్",["This chapter consolidates the complete engineering design package for our **132/33/11 kV Shankarpally–Gachibowli Digital Substation**: 1) **Primary","2) **Multi-Vendor IED Fleet & IP Addressing**: PRP LAN A (`10.132.10.0/24`) and PRP LAN B (`10.132.20.0/24`)."],["ఈ అధ్యాయంలో మన **132/33/11 kV సబ్‌స్టేషన్ ప్రాజెక్ట్** యొక్క పూర్తి డిజైన్ వివరాలు ఒకే చోట క్రోడీకరించబడ్డాయి: 1) **18 బేల","2) **IED జాబితా & IP ప్లాన్**: PRP LAN A (`10.132.10.0/24`) మరియు LAN B (`10.132.20.0/24`)."],["VLAN Allocation: VLAN 10 = MMS (Priority 2), VLAN 20 = GOOSE (`0x88B8`, Priority 4)","Total Instantiated SAS Points = 1,206 points across 18 bays mapped to BRCB01 (SCADA A)"]]],"Auditing the Complete Design Consistency Across SLD, IED Explorer, Network & SCL","SLD, IED Explorer, Network మరియు SCL మాడ్యూల్స్ మధ్య డిజైన్ సమన్వయ తనిఖీ",["Verify that `BAY-132-L1` uses `IED_132_L1` (`Siemens 7SA87`, IP `10.132.10.11` / `10.132.20.11`) consistently in SLD","Verify that all 50 signal templates instantiate with consistent IEC 61850 LN.DO.DA references and SCADA tag names"],["`BAY-132-L1` లో `IED_132_L1` (`Siemens 7SA87`, IP `10.132.10.11` / `10.132.20.11`) అనేది SLD, IED Explorer","మొత్తం 50 సిగ్నల్ టెంప్లేట్లు అన్ని బేలలో సరైన LN.DO.DA మరియు SCADA ట్యాగ్ పేర్లతో ఉన్నాయని నిర్ధారించండి."],["Maintaining separate unlinked spreadsheets for the IP Plan, Signal List, and SCD file without a single master revision control.","Leaving spare fiber cores and spare terminal blocks undocumented in the As-Built schedule."],["IP ప్లాన్, సిగ్నల్ లిస్ట్ మరియు SCD ఫైల్ వేర్వేరు వెర్షన్లలో ఉండి ఒకదానితో ఒకటి పొంతన లేకపోవడం.","స్పేర్ ఫైబర్ కోర్లు మరియు స్పేర్ టెర్మినల్ బ్లాకులను As-Built డ్రాయింగ్‌లో నమోదు చేయకపోవడం."],["Gateway IOA schedule has 18 fewer points than the SCADA signal list during final design","డిజైన్ ఆడిట్‌లో SCADA సిగ్నల్ లిస్ట్ కంటే గేట్‌వే IOA లిస్ట్‌లో 18 పాయింట్లు తక్కువగా","PRP LAN B supervision status (`LPHD1.LanBHealth`) for the 18 IEDs was mapped to SCADA HMI","18 IEDల యొక్క PRP LAN B స్టేటస్ పాయింట్లు SCADA లో చేర్చారు కానీ RCC IEC-104 IOA","Run automated cross-check between `signalCatalogue.ts` (1,206 points) and the Gateway IOA","SCADA సిగ్నల్ లిస్ట్ మరియు Gateway IOA టేబుల్ మధ్య క్రాస్-చెక్ రన్ చేయండి","Allocate IOAs `1801..1818` (`M_SP_TB_1` Type 30) for all 18 IED LAN-B supervision points","18 IEDల LAN-B పాయింట్ల కోసం IOA `1801..1818` కేటాయించి గేట్‌వేలో అప్‌డేట్ చేయండి","Verify 100% point count parity between approved Signal List, SCADA DB, and RCC Gateway","సిగ్నల్ లిస్ట్, SCADA డేటాబేస్ మరియు RCC గేట్‌వే మూడింటిలోనూ పాయింట్ల సంఖ్య సరిగ్గా"],["Walk me through how you design the SAS architecture for a new 132/33/11 kV substation from the SLD.","First, count the bays by voltage level from the SLD (five 132 kV bays, nine 33 kV bays, four 11 kV bays = 18 bays) and assign main/backup protection IEDs","మొదట SLD ఆధారంగా బేల సంఖ్యను లెక్కించి (132 kV - 5, 33 kV - 9, 11 kV - 4 = 18 బేలు) ప్రతి బేకు తగిన ప్రొటెక్షన్ IED మరియు BCU లను ఎంపిక"]],[27,6,"Complete 14-Stage SAS Engineering Lifecycle Workflow","14-దశల పూర్తి SAS ఇంజనీరింగ్ లైఫ్‌సైకిల్ వర్క్‌ఫ్లో","Customer Requirements → Design Review → SLD/GA → IED Selection → Network → Signal List → SCL → SCADA → FAT → SAT → Handover","కస్టమర్ అవసరాలు → డిజైన్ → SLD/GA → IED ఎంపిక → నెట్‌వర్క్ → సిగ్నల్ లిస్ట్ → SCL → SCADA → FAT → SAT → హ్యాండోవర్","DIAG-24-FATSAT-FLOW","ENGINEERING_WORKSTATION","End-to-End Turnkey SAS Project Execution Lifecycle","SIGNALS","Open SCL & Signal Engineering Workspace",[["Inputs, Activities, Deliverables & Validation Criteria Across All 14 Lifecycle Stages","మొత్తం 14 ప్రాజెక్ట్ దశలలో ఇన్‌పుట్లు, పనులు, డెలివరబుల్స్ & వాలిడేషన్ ప్రమాణాలు",["A turnkey Substation Automation project executes across 14 structured engineering gates: **Stages 1–4 (Specification & Hardware Design)**: 1) Customer","**Stages 10–14 (Testing, Site Commissioning & Handover)**: 10) Internal Pre-FAT & Witness Factory Acceptance Test (FAT), 11) Panel Packing, Site Erection"],["ఒక పూర్తి స్థాయి SAS ప్రాజెక్ట్ 14 దశల్లో పూర్తవుతుంది: **దశలు 1–4 (డిజైన్)**: 1) కస్టమర్ టెక్నికల్ స్పెసిఫికేషన్ (TS) సమీక్ష","**దశలు 10–14 (టెస్టింగ్, కమిషనింగ్ & హ్యాండోవర్)**: 10) ప్రీ-FAT & కస్టమర్ విట్‌నెస్ FAT"],["Gate Rule: Never start `.SCD` SCL binding (Stage 7) until the Master Signal List and","Handover Package Must Include: Red-lined As-Built Schematics, Signed FAT/SAT Test Reports"]]],"Gate Review Checklist Before Starting SCD Engineering (Stage 6 → Stage 7)","SCD ఇంజనీరింగ్ ప్రారంభించే ముందు తనిఖీ చేయాల్సిన చెక్‌లిస్ట్",["Confirm all 18 IED technical names (`IED_132_L1..IED_11_F04`), IP addresses","Confirm all GOOSE inter-bay signals (50BF, ZSI reverse blocking, Bus Coupler interlocking","Confirm SCADA Server A/B and RCC Gateway BRCB client counts (`brcb01..03`) are defined for every IED."],["మొత్తం 18 IEDల పేర్లు, IP అడ్రస్‌లు మరియు `.ICD` ఫైల్ వెర్షన్లు ఖరారయ్యాయని నిర్ధారించండి.","అన్ని GOOSE సిగ్నల్స్ (50BF, రివర్స్ బ్లాకింగ్, ఇంటర్‌లాకింగ్) సోర్స్ మరియు డెస్టినేషన్ బేలతో సహా సిద్ధంగా","ప్రతి IED లో SCADA A, SCADA B మరియు RCC Gateway కోసం BRCB ఇన్‌స్టాన్స్‌లు (`brcb01..03`) నిర్వచించబడ్డాయని"],["Starting SCADA HMI tag binding before freezing IED Logical Device and Logical Node names, forcing a complete rework of thousands of tags.","Handing over the substation after energization without updating field red-line wiring changes into the final CAD As-Built drawings and `.SCD` file."],["IED పేర్లు మరియు Logical Node పేర్లు ఖరారు కాకముందే SCADA HMI ట్యాగ్ మ్యాపింగ్ మొదలుపెట్టడం.","కమిషనింగ్ సమయంలో సైట్‌లో చేసిన మార్పులను As-Built డ్రాయింగ్స్ మరియు తుది `.SCD` ఫైల్‌లో అప్‌డేట్ చేయకుండానే హ్యాండోవర్ చేయడం."],["During SAT, a field wiring change adds a new SF6 Heater Fail alarm to DI-14","SAT సమయంలో కొత్తగా చేర్చిన DI-14 అలారంను SCD లో మార్చకుండా కేవలం HMI లో మాత్రమే","Uncontrolled field change bypassing the Stage 7 → Stage 8 → Stage 9 SCL engineering","SCL వర్క్‌ఫ్లో (Stage 7 → 8 → 9) పాటించకుండా నేరుగా మార్పు చేయడం","Compare physical IED CID `confRev` and DataSet `dsAlarm` against the master project","రిలే లోని `.CID` `confRev` మరియు `dsAlarm` ను మాస్టర్ `.SCD` ఫైల్‌తో పోల్చి చూడండి","Add `SIML1.HtrAlm` to `IED` and `dsAlarm` in the master `.SCD`, re-export `.CID`","మాస్టర్ `.SCD` లో ఆ సిగ్నల్ చేర్చి, కొత్త `.CID` ఎక్స్‌పోర్ట్ చేసి రివిజన్ హిస్టరీలో","Verify `SCD` checksum matches the deployed `CID` and As-Built Signal List Rev R4","మాస్టర్ `.SCD`, రిలే `.CID` మరియు As-Built సిగ్నల్ లిస్ట్ అన్నీ సరిపోలాయని నిర్ధారించండి"],["What are the mandatory deliverables in a Final SAS Commissioning & Handover Package?","1) Approved As-Built Schematics, GA, SLD, and Cable/Fiber Schedules, 2) Master `.SCD` and all 18 `.CID` / `.IID` files with SHA-256 checksums","1) As-Built డ్రాయింగ్స్ (SLD, GA, స్కీమాటిక్స్, కేబుల్ షెడ్యూల్స్), 2) తుది `.SCD` మరియు అన్ని రిలేల `.CID` ఫైల్స్"]],[28,6,"End-to-End FAT/SAT Guided Practical Project","ఎండ్-టు-ఎండ్ FAT/SAT గైడెడ్ ప్రాక్టికల్ ప్రాజెక్ట్ (14 Test Cases)","Execute All 14 Mandatory FAT/SAT Commissioning Test Cases Against the Live Digital Twin & Generate Assessment Report","లైవ్ డిజిటల్ ట్విన్‌పై 14 ప్రధాన FAT/SAT పరీక్షలను స్వయంగా నిర్వహించి అసెస్‌మెంట్ రిపోర్ట్ రూపొందించండి","DIAG-24-FATSAT-FLOW","SCADA_WORKSTATION","Interactive 14-Test-Case FAT/SAT Execution Workbench","FATSAT","Launch Interactive FAT/SAT Test Suite",[["Executing the 14 Mandatory FAT/SAT Commissioning Test Cases","14 ప్రధాన FAT/SAT కమిషనింగ్ పరీక్షల అమలు & ఫలితాల విశ్లేషణ",["In this guided practical project, you act as the Lead SAS Commissioning Engineer executing all 14 mandatory test cases on the 132/33/11 kV substation:","**TC-08 (CILO1 Interlocking Rejection Test — Earth Switch Closed / CB Closed)**, **TC-09 (Critical Alarm Annunciation & Acknowledgment Sequence)**"],["ఈ ప్రాక్టికల్ ప్రాజెక్ట్‌లో మీరు లీడ్ SAS కమిషనింగ్ ఇంజనీర్‌గా వ్యవహరిస్తూ మన 132/33/11 kV సబ్‌స్టేషన్‌పై 14 ప్రధాన FAT/SAT","**TC-08 (CILO1 ఇంటర్‌లాక్ తిరస్కరణ పరీక్ష)**, **TC-09 (అలారం అనౌన్సియేషన్ & అక్నాలెడ్జ్‌మెంట్)**"],["Each test case compares Expected Result vs Actual Measured Result from the live simulation"]]],"Executing TC-08 (Interlocking Test) & TC-11 (PRP Failover Test) Step by Step","TC-08 (ఇంటర్‌లాక్ టెస్ట్) మరియు TC-11 (PRP ఫెయిల్‌ఓవర్ టెస్ట్) దశలవారీగా అమలు చేయడం",["For TC-08: Close Earth Switch `89E` on `BAY-33-F02` and attempt to issue an SBO CLOSE command to `CB 33-F02`.","For TC-11: Open PRP / HSR Network Lab, inject 'PRP LAN A Failure', and trigger a GOOSE trip on `BAY-33-F03`."],["TC-08 కోసం: `BAY-33-F02` లో ఎర్త్ స్విచ్ `89E` క్లోజ్ ఉంచి బ్రేకర్‌కు SBO CLOSE కమాండ్ ఇవ్వండి.","TC-11 కోసం: PRP / HSR Network Lab లో 'PRP LAN A Failure' ఇంజెక్ట్ చేసి GOOSE ట్రిప్ ఇవ్వండి."],["Signing off an interlocking test case without testing every prohibitive condition in the CILO1 boolean equation.","Measuring PRP failover using standard 1-second ICMP ping instead of high-rate GOOSE/SV sequence number continuity."],["CILO1 సమీకరణంలోని అన్ని ఇంటర్‌లాక్ షరతులను విడివిడిగా పరీక్షించకుండానే సైన్-ఆఫ్ చేయడం.","PRP 0 ms ఫెయిల్‌ఓవర్‌ను GOOSE/SV సీక్వెన్స్ నంబర్లతో కాకుండా సాధారణ 1-సెకన్ Ping తో కొలవడం."],["TC-10 (SOE Test) shows 12 ms timestamp difference between two bays tripped by the same","TC-10 (SOE పరీక్ష) లో ఒకేసారి ట్రిప్ అయిన రెండు బేల మధ్య 12 ms సమయ వ్యత్యాసం కనిపిస్తోంది","One bay IED fell back from hardware IEEE 1588v2 PTP to software SNTP polling or internal","ఒక బే IED హార్డ్‌వేర్ PTP నుండి సాఫ్ట్‌వేర్ SNTP కి లేదా ఇంటర్నల్ క్లాక్‌కు పడిపోయింది","Check `TimeQuality` byte in the MMS report of both IEDs and inspect switch port PTP P2P","రెండు IEDల MMS రిపోర్టులలో `TimeQuality` బైట్ మరియు స్విచ్ పోర్ట్ PTP స్థితిని తనిఖీ","Re-enable hardware PTP slave profile (`IEC 61850-9-3`) on the drifted IED and verify","ఆ IED లో `IEC 61850-9-3` PTP ప్రొఫైల్ ఎనేబుల్ చేసి ఆఫ్‌సెట్ < 100 ns ఉందని నిర్ధారించండి","Re-run simultaneous multi-bay trip test; confirm SOE timestamps match within ≤ 1 ms","మళ్లీ ఒకేసారి ట్రిప్ ఇచ్చి రెండు బేల SOE టైమ్‌స్టాంప్ తేడా ≤ 1 ms లోపు ఉందని నిర్ధారించండి"],["How do you prove 0 ms recovery during a PRP FAT/SAT test?","While publishing a continuous high-speed GOOSE or Sampled Values stream (or 1 ms burst traffic) and capturing on the receiver","నిరంతరం GOOSE లేదా Sampled Values ఫ్రేమ్‌లు వెళ్తుండగా LAN A ఫైబర్ కేబుల్‌ను అకస్మాత్తుగా తీసివేసి"]],[29,6,"Advanced Interactive Fault Scenarios & Root-Cause Diagnosis","అడ్వాన్స్‌డ్ ఇంటరాక్టివ్ ఫాల్ట్ సినారియోలు & రూట్-కాజ్ డయాగ్నసిస్","10 Real-World Substation Fault Scenarios: SBO Blocked, Missing SCADA Reports, GOOSE Invalid, PRP Break, VLAN, Gateway & SOE Drift","10 రియల్-టైమ్ ఫాల్ట్ సినారియోలు: SBO బ్లాక్, SCADA రిపోర్ట్ మిస్సింగ్, GOOSE ఇన్‌వాలిడ్, PRP ఫెయిల్, VLAN, గేట్‌వే & SOE","DIAG-18-GOOSE-MMS","ABB_REF615","Interactive Fault Diagnosis & Root-Cause Isolation Workbench","FAULTS","Launch Fault Injection & Troubleshooting Simulator",[["Diagnosing Complex Multi-Symptom SAS Failures Using Engineering Evidence","ఆధారాల ఆధారంగా సంక్లిష్టమైన SAS లోపాలను గుర్తించి పరిష్కరించడం",["In real substation operations, a single observed symptom (e.g., 'Breaker command fails' or 'SCADA values not updating') can have multiple candidate root","This chapter covers 10 interactive fault scenarios: 1) Breaker command issued on HMI but no operation (`Loc=LOCAL` vs `CILO1=FALSE` vs `52a/52b` vs `86"],["సబ్‌స్టేషన్‌లో ఒక సమస్య కనిపించినప్పుడు (ఉదా: 'బ్రేకర్ ఆపరేట్ అవ్వడం లేదు' లేదా 'SCADA డేటా మారడం లేదు') దానికి అనేక కారణాలు","ఈ అధ్యాయంలో 10 రియల్-టైమ్ ఫాల్ట్ సినారియోలు ఉన్నాయి: 1) HMI నుండి కమాండ్ ఇచ్చినా బ్రేకర్ ఆపరేట్ కాకపోవడం"],["Diagnostic Golden Rule: Always check whether the event exists in the source IED's local SOE"]]],"Interactive Walkthrough: Isolating 'Gateway Connected to RCC, But RCC Receives Zero Indications'","ఉదాహరణ: 'గేట్‌వే RCC కి కనెక్ట్ అయింది కానీ RCC కి ఒక్క సిగ్నల్ కూడా వెళ్లడం లేదు' — మూల కారణ విశ్లేషణ",["Observation 1: SCADA HMI in the substation control room shows all 18 bays updating live → proves Bay IEDs, Station Bus","Observation 2: Wireshark on Gateway WAN port (TCP 2404) shows TCP connected and `U-frame TESTFR act / con` heartbeats","Fix: Align `CASDU = 1` in Gateway IEC-104 Server settings, verify RCC Master sends `STARTDT act (0x07)`"],["పరిశీలన 1: కంట్రోల్ రూమ్ లోని SCADA HMI లో అన్ని 18 బేల డేటా సక్రమంగా కనిపిస్తోంది → అంటే IEDలు మరియు స్టేషన్","పరిశీలన 2: గేట్‌వే WAN పోర్ట్ (TCP 2404) పై Wireshark పెట్టి చూడగా కేవలం `TESTFR` ఫ్రేమ్‌లు మాత్రమే","పరిష్కారం: గేట్‌వేలో `CASDU = 1` సెట్ చేసి, `STARTDT act` మరియు `Type 100 GI` తర్వాత అన్ని IOA విలువలు RCC కి"],["Replacing hardware modules or rebooting SCADA servers blindly before checking whether the fault is upstream or downstream of the IED's local SOE log.","Assuming the first plausible cause is the only cause without checking diagnostic evidence."],["సమస్య ఫీల్డ్ వైరింగ్‌లో ఉందో లేక నెట్‌వర్క్‌లో ఉందో రిలే SOE లాగ్ చూసి నిర్ధారించుకోకుండానే సర్వర్లను రీబూట్ చేయడం.","డయాగ్నస్టిక్ ఆధారాలు తనిఖీ చేయకుండా ఊహాగానాలతో నిర్ణయం తీసుకోవడం."],["SCADA HMI shows Breaker 33-F03 CLOSED, even though field operator just tripped it locally","ఫీల్డ్ ఆపరేటర్ బ్రేకర్‌ను మాన్యువల్‌గా ఓపెన్ చేసినప్పటికీ SCADA HMI లో ఇంకా CLOSED అనే","Check IED local SOE first: either 52a/52b field wetting voltage is lost/stuck","మొదట రిలే లోకల్ SOE చూడాలి: ఒకవేళ రిలేలో కూడా CLOSED ఉంటే 52a/52b వైరింగ్ సమస్య","Inspect `IED_33_F03` front-panel LCD: it shows CB = OPEN","రిలే LCD లో CB = OPEN అని ఉంది (అంటే వైరింగ్ బాగుంది); MMS Lab లో చూడగా `brcbSt01.RptEna","Re-enable `brcbSt01.RptEna = TRUE` and trigger General Interrogation (`GI = TRUE`)","`brcbSt01.RptEna = TRUE` ఎనేబుల్ చేసి General Interrogation (`GI`) ట్రిగ్గర్ చేయండి","Confirm SCADA HMI immediately updates CB 33-F03 to OPEN (Green) with Good quality","SCADA HMI లో వెంటనే బ్రేకర్ OPEN స్థితికి మారిందని నిర్ధారించండి"],["When an alarm (like Transformer Buchholz Alarm) does not appear on the SCADA HMI, what is your very first diagnostic check?","Check the local Bay IED's front-panel LED / local Event Log (SOE). That single check immediately splits the entire signal chain in half: if the IED did","మొదట ఆ బే IED యొక్క ఫ్రంట్-ప్యానెల్ LED లేదా లోకల్ SOE లాగ్ తనిఖీ చేయాలి. ఒకవేళ రిలేలోనే సిగ్నల్ రాలేదంటే సమస్య స్విచ్‌యార్డ్ కాంటాక్ట్"]],[30,6,"SAS Engineer Mastery & Final Certification Assessment","SAS ఇంజనీర్ మాస్టరీ & తుది సర్టిఫికేషన్ అసెస్‌మెంట్","Beginner, Intermediate & Advanced Mastery Exams, SCL/Network/Signal Exercises, Drawing Interpretation & Final Project","బిగినర్, ఇంటర్మీడియట్ & అడ్వాన్స్‌డ్ మాస్టరీ పరీక్షలు, SCL/నెట్‌వర్క్/సిగ్నల్ అభ్యాసాలు, డ్రాయింగ్ విశ్లేషణ & ఫైనల్ ప్రాజెక్ట్","DIAG-20-SCL-FLOW","SCADA_WORKSTATION","SAS Engineer Mastery Certification & Career Readiness Scorecard","INTERVIEW_PREP","Open SAS Interview Preparation Academy",[["Comprehensive SAS Engineer Competency Matrix — Beginner to Lead Commissioning Engineer","పూర్తి SAS ఇంజనీర్ నైపుణ్య ప్రమాణాలు — బిగినర్ నుండి లీడ్ కమిషనింగ్ ఇంజనీర్ వరకు",["Completing all 30 chapters equips you with the end-to-end engineering competencies expected of a Senior Substation Automation System (SAS) Design","3) **IEC 61850 & Multi-Vendor SCL Mastery**: Engineering PD/LD/LN/DO/DA data models, MMS BRCB/URCB reporting (`TCP 102`), Layer-2 GOOSE (`0x88B8`)"],["ఈ 30 అధ్యాయాలను పూర్తి చేయడం ద్వారా ఒక సీనియర్ SAS డిజైన్, టెస్టింగ్ & కమిషనింగ్ ఇంజనీర్‌కు ఉండాల్సిన అన్ని నైపుణ్యాలు మీకు","3) **IEC 61850 & మల్టీ-వెండర్ SCL నైపుణ్యం**: PD/LD/LN/DO/DA డేటా మోడల్, MMS BRCB రిపోర్టింగ్ (`TCP 102`)"],["Complete the Mastery Quiz below and launch the dedicated **SAS Interview Preparation Academy**"]]],"Final Capstone Exercise: Full Substation Pre-Energization Sign-Off Audit","ఫైనల్ క్యాప్‌స్టోన్ అభ్యాసం: సబ్‌స్టేషన్ ప్రీ-ఎనర్జైజేషన్ సైన్-ఆఫ్ ఆడిట్",["Verify all 18 Bay IEDs are online on both PRP LAN A (`10.132.10.x`) and LAN B (`10.132.20.x`) with PTP Sync Locked","Verify BRCB01/02/03 reporting to SCADA Server A/B and Station Gateway `GTW-RCC-01` (`IEC-104 Port 2404 STARTDT active`).","Verify GOOSE subscriptions (`GoCB_33_F03`, `GoCB_T1_Trip`, `GoCB_BusCoupler`) show `confRev` match, `ndsCom = FALSE`"],["మొత్తం 18 IEDలు PRP LAN A మరియు LAN B రెండింటిలో ఆన్‌లైన్‌లో ఉండి PTP Sync (`±38 ns`) లాక్ అయి ఉన్నాయని","SCADA A/B మరియు RCC Gateway (`IEC-104 Port 2404`) లకు BRCB01/02/03 రిపోర్టింగ్ సక్రమంగా ఉందని తనిఖీ చేయండి.","అన్ని GOOSE సబ్‌స్క్రిప్షన్లలో `confRev` సరిపోలి `< 3 ms` లోపు పనిచేస్తున్నాయని నిర్ధారించండి."],["Skipping final as-built SCD/CID checksum archival after commissioning modifications.","Leaving any IED in simulation/test mode (`LPHD1.Sim = TRUE`) after completing SAT injection tests."],["కమిషనింగ్ పూర్తయిన తర్వాత తుది `.SCD` మరియు `.CID` ఫైల్స్ యొక్క చెక్‌సమ్ ఆర్కైవ్ భద్రపరచకపోవడం.","SAT పరీక్షల తర్వాత రిలేలను టెస్ట్ మోడ్ (`LPHD1.Sim = TRUE`) లోనే వదిలేయడం."],["Pre-energization audit reveals one feeder IED has `LPHD1.Sim.stVal = TRUE`","ప్రీ-ఎనర్జైజేషన్ ఆడిట్‌లో ఒక ఫీడర్ రిలే `LPHD1.Sim.stVal = TRUE` (Simulation Mode) లో","Commissioning engineer left IED in simulation mode after Omicron secondary injection","Omicron సెకండరీ ఇంజెక్షన్ పరీక్ష తర్వాత ఇంజనీర్ రిలేలో సిమ్యులేషన్ మోడ్ ఆఫ్ చేయడం","Browse `LPHD1.Sim.stVal` and `LLN0.Beh.stVal` across all 18 IEDs in MMS Lab","MMS Lab లో మొత్తం 18 IEDల యొక్క `LPHD1.Sim.stVal` మరియు `LLN0.Beh.stVal` తనిఖీ చేయండి","Reset `LPHD1.Sim` to `FALSE` and `LLN0.Mod` to `on (1)`, and lock test block cover","`LPHD1.Sim = FALSE` మరియు `LLN0.Mod = on (1)` కి మార్చి టెస్ట్ బ్లాక్ కవర్ సీల్ చేయండి","Confirm all 18 IEDs report `Beh = on (1)` and `q.test = FALSE` on SCADA HMI","మొత్తం 18 IEDలలో `Beh = on (1)` మరియు `q.test = FALSE` ఉన్నాయని నిర్ధారించండి"],["What are the top three checks you perform immediately before and immediately after energizing a new 132/33 kV bay?","Immediately BEFORE energization: 1) Confirm Earth Switch 89E is OPEN and all PTW/LOTO tags and CT shorting links are removed","ఎనర్జైజ్ చేయడానికి ముందు: 1) 89E ఎర్త్ స్విచ్ OPEN లో ఉందని, PTW/LOTO మరియు CT షార్టింగ్ లింక్‌లు తీసివేశారని నిర్ధారించాలి"]]];

const LEVEL_TITLES_MAP: Record<number, [string, string]> = {
  1: ['1. Electrical & Substation Fundamentals', '1. ఎలక్ట్రికల్ & సబ్‌స్టేషన్ ప్రాథమిక అంశాలు'],
  2: ['2. SAS Architecture & Networking', '2. SAS ఆర్కిటెక్చర్ & నెట్‌వర్కింగ్'],
  3: ['3. IEC 61850 Engineering', '3. IEC 61850 ఇంజనీరింగ్'],
  4: ['4. Engineering Tools & Integration', '4. ఇంజనీరింగ్ టూల్స్ & ఇంటిగ్రేషన్'],
  5: ['5. Testing, Commissioning & Troubleshooting', '5. టెస్టింగ్, కమిషనింగ్ & ట్రబుల్‌షూటింగ్'],
  6: ['6. Complete Project & Mastery', '6. పూర్తి ప్రాజెక్ట్ & మాస్టరీ'],
};

const XML_REF_SNIPPET = `<LN0 lnClass="LLN0" inst="" lnType="LLN0_Type">
  <DataSet name="dsStatus">
    <FCDA ldInst="Application" prefix="" lnClass="XCBR" lnInst="1" doName="Pos" daName="stVal" fc="ST"/>
    <FCDA ldInst="Application" prefix="" lnClass="XCBR" lnInst="1" doName="Pos" daName="q" fc="ST"/>
    <FCDA ldInst="Application" prefix="" lnClass="XCBR" lnInst="1" doName="Pos" daName="t" fc="ST"/>
  </DataSet>
  <ReportControl name="brcbSt01" datSet="dsStatus" rptID="IED_132_L1/LLN0$BR$brcbSt01" confRev="1" buffered="true" intgPd="5000" bufTm="100">
    <TrgOps dchg="true" qchg="true" dupd="true" period="true" gi="true"/>
  </ReportControl>
  <GSEControl name="GoCB_St01" datSet="dsStatus" appID="IED_132_L1_GoCB01" confRev="1" type="GOOSE"/>
</LN0>`;

export const IEC61850_ACADEMY_CHAPTERS: AcademyChapter[] = RAW_CHAPTER_TUPLES.map((ch): AcademyChapter => {
  const [
    num, lvl, titleEn, titleTe, subEn, subTe, diagId, imgKey, imgCap, relTab, relLabel,
    secs, weTitleEn, weTitleTe, weStepsEn, weStepsTe, mistakesEn, mistakesTe, trRow, intQA
  ] = ch;
  const [lvlEn, lvlTe] = LEVEL_TITLES_MAP[lvl];
  const [symEn, symTe, causeEn, causeTe, diagEn, diagTe, actEn, actTe, valEn, valTe] = trRow;
  const [q_str, aEn_str, aTe_str] = intQA;

  const sections: AcademyChapterSection[] = secs.map((sec: any, sIdx: number) => {
    const [hEn, hTe, bEn, bTe, kt] = sec;
    const obj: AcademyChapterSection = {
      headingEn: hEn,
      headingTe: hTe,
      bodyEn: bEn,
      bodyTe: bTe,
      keyTakeawaysEn: kt,
      keyTakeawaysTe: kt,
    };
    if ([12, 13, 14, 15, 16, 17, 18].includes(num) && sIdx === 0) {
      obj.codeOrXmlSnippet = {
        title: `IEC 61850 Engineering Reference — Chapter ${num}`,
        content: XML_REF_SNIPPET,
      };
    }
    return obj;
  });

  return {
    id: `CH-${String(num).padStart(2, '0')}`,
    chapterNumber: num,
    levelNumber: lvl,
    levelTitleEn: lvlEn,
    levelTitleTe: lvlTe,
    titleEn: `Chapter ${num} — ${titleEn}`,
    titleTe: `అధ్యాయం ${num} — ${titleTe}`,
    subtitleEn: subEn,
    subtitleTe: subTe,
    estimatedMinutes: 25 + (num % 4) * 5,
    diagramId: diagId,
    equipmentImageUrl: (iedImages as any)[imgKey] || iedImages.SIEMENS_7SJ85,
    equipmentCaption: imgCap,
    relatedTab: relTab,
    relatedTabLabel: relLabel,
    sections,
    workedExample: {
      titleEn: weTitleEn,
      titleTe: weTitleTe,
      stepsEn: weStepsEn,
      stepsTe: weStepsTe,
      engineeringDataUsed: [
        'Substation: 132/33/11 kV Shankarpally–Gachibowli (2×50 MVA + 2×16 MVA)',
        'Station Bus: PRP LAN A (10.132.10.0/24) & LAN B (10.132.20.0/24)',
        'Protocols: IEC 61850 MMS (TCP/102), GOOSE (0x88B8, VLAN 20), PTP (0x88F7, VLAN 40), IEC-104 (TCP/2404)',
      ],
    },
    commonMistakesEn: mistakesEn,
    commonMistakesTe: mistakesTe,
    troubleshooting: [{
      symptomEn: symEn,
      symptomTe: symTe,
      causeEn: causeEn,
      causeTe: causeTe,
      diagnosticCheckEn: diagEn,
      diagnosticCheckTe: diagTe,
      correctiveActionEn: actEn,
      correctiveActionTe: actTe,
      validationEn: valEn,
      validationTe: valTe,
    }],
    fatSatRelevanceEn: [
      `FAT Verification: Validate ${titleEn} configuration, drawing cross-references, and SCD/CID parameters on the factory test bench.`,
      `SAT Commissioning: Perform end-to-end site point-to-point and fault/recovery verification for ${titleEn} before bay energization.`,
    ],
    fatSatRelevanceTe: [
      `FAT తనిఖీ: ఫ్యాక్టరీ టెస్ట్ బెంచ్‌పై ${titleTe} యొక్క కాన్ఫిగరేషన్ మరియు SCD/CID పారామీటర్లను ధృవీకరించాలి.`,
      `SAT కమిషనింగ్: బే ఎనర్జైజ్ చేయడానికి ముందు ${titleTe} కు సంబంధించిన పాయింట్-టు-పాయింట్ మరియు రికవరీ పరీక్షలు పూర్తి చేయాలి.`,
    ],
    interviewPreview: [{ q: q_str, aEn: aEn_str, aTe: aTe_str }],
    practicalExercise: {
      titleEn: `Hands-On Engineering Exercise — Chapter ${num}: ${titleEn}`,
      titleTe: `ప్రాక్టికల్ ఇంజనీంగ్ అభ్యాసం — అధ్యాయం ${num}: ${titleTe}`,
      objectiveEn: `Verify and test ${titleEn} using the interactive diagram and linked substation simulator (${relLabel}).`,
      objectiveTe: `ఇంటరాక్టివ్ డయాగ్రమ్ మరియు సిమ్యులేటర్ (${relLabel}) ఉపయోగించి ${titleTe} ను స్వయంగా పరీక్షించడం.`,
      tasksEn: weStepsEn,
      tasksTe: weStepsTe,
      expectedOutcomeEn: valEn,
      expectedOutcomeTe: valTe,
    },
    quiz: [
      {
        id: `Q-${String(num).padStart(2, '0')}-1`,
        questionEn: q_str,
        questionTe: `${q_str} (సరైన ఇంజనీరింగ్ వివరణను ఎంచుకోండి)`,
        options: [
          aEn_str.length > 155 ? aEn_str.slice(0, 155) + '...' : aEn_str,
          mistakesEn[0],
          'By disabling IEC 61850 quality flags and bypassing CILO1 interlocking in the SCADA server.',
          'By routing all protection trip signals exclusively over serial RS-485 9600 bps links.',
        ],
        correctIndex: 0,
        explanationEn: aEn_str,
        explanationTe: aTe_str,
      },
      {
        id: `Q-${String(num).padStart(2, '0')}-2`,
        questionEn: `In Chapter ${num} (${titleEn}), if symptom '${symEn}' occurs, what is the verified corrective action?`,
        questionTe: `అధ్యాయం ${num} లో '${symTe}' సమస్య కనిపించినప్పుడు సరైన పరిష్కార చర్య ఏమిటి?`,
        options: [
          'Reboot the operator HMI monitor without checking diagnostic logs.',
          actEn,
          'Bridge PRP LAN A and LAN B switches together with a copper patch cord.',
          'Delete the master SCD file and disable all protection relays.',
        ],
        correctIndex: 1,
        explanationEn: `Diagnostic check: ${diagEn} → Corrective action: ${actEn} → Validation: ${valEn}`,
        explanationTe: `తనిఖీ: ${diagTe} → పరిష్కారం: ${actTe} → నిర్ధారణ: ${valTe}`,
      },
    ],
  };
});

export const ACADEMY_GLOSSARY_TERMS: AcademyGlossaryTerm[] = [{"term": "IEC 61850", "category": "Standard", "definitionEn": "International standard for communication networks and systems for power utility automation, defining object-oriented data models (LD/LN/DO/DA), SCL XML engineering (ICD/SSD/SCD/CID), MMS client-server services, GOOSE multicast, and Sampled Values.", "definitionTe": "సబ్‌స్టేషన్ ఆటోమేషన్ కోసం అంతర్జాతీయ ప్రమాణం. ఇది ఆబ్జెక్ట్-ఓరియెంటెడ్ డేటా మోడల్ (LD/LN/DO/DA), SCL XML ఫైల్స్ (ICD/SCD/CID), MMS, GOOSE మరియు Sampled Values ను నిర్వచిస్తుంది.", "exampleRef": "Parts -5, -6, -7-1..4, -8-1, -9-2, -10"}, {"term": "GOOSE (0x88B8)", "category": "Protocol", "definitionEn": "Generic Object Oriented Substation Events — Layer-2 Ethernet multicast mechanism (Ethertype 0x88B8, MAC 01-0C-CD-01-xx-xx, VLAN 20, Priority 4) delivering peer-to-peer protection trips and interlocking in ≤ 3–4 ms using stNum/sqNum retransmission.", "definitionTe": "ఒక IED నుండి మరొక IED కి ప్రొటెక్షన్ ట్రిప్ మరియు ఇంటర్‌లాకింగ్ సంకేతాలను ≤ 3–4 ms లోపు పంపే Layer-2 Ethernet మల్టీకాస్ట్ ప్రోటోకాల్ (Ethertype 0x88B8, stNum/sqNum).", "exampleRef": "GoCB_33_F03 (APPID 0x0003)"}, {"term": "MMS (TCP Port 102)", "category": "Protocol", "definitionEn": "Manufacturing Message Specification (ISO 9506 / IEC 61850-8-1) — Connection-oriented TCP/IP client-server protocol on Port 102 used for BRCB/URCB reporting, data model browsing, General Interrogation (GI), and SBO breaker control.", "definitionTe": "TCP Port 102 పై పనిచేసే క్లయింట్-సర్వర్ ప్రోటోకాల్. ఇది IED నుండి SCADA మరియు Gateway కి BRCB రిపోర్టులు, GI మరియు SBO బ్రేకర్ కంట్రోల్ అందిస్తుంది.", "exampleRef": "10.132.10.11:102 (brcbSt01)"}, {"term": "Sampled Values (SV 0x88BA)", "category": "Protocol", "definitionEn": "IEC 61850-9-2 LE Layer-2 Ethernet multicast stream (Ethertype 0x88BA, MAC 01-0C-CD-04-xx-xx) carrying time-synchronized digital CT/VT waveform samples from Merging Units at 80 samples/cycle (4000 Hz at 50 Hz) or 256 samples/cycle.", "definitionTe": "స్విచ్‌యార్డ్ Merging Unit నుండి ప్రొటెక్షన్ రిలేకు సెకనుకు 4000 శాంపిల్స్ (50 Hz వద్ద 80 samples/cycle) వేగంతో డిజిటల్ CT/VT తరంగాలను పంపే Layer-2 మల్టీకాస్ట్ ప్రోటోకాల్ (0x88BA).", "exampleRef": "smpCnt 0..3999, smpSynch=2"}, {"term": "PRP (IEC 62439-3 Clause 4)", "category": "Redundancy", "definitionEn": "Parallel Redundancy Protocol — Dual Attached Nodes (DANP) transmit duplicate frames simultaneously over two independent networks (LAN A and LAN B) with a 6-byte RCT trailer, achieving 0 ms bumpless failover.", "definitionTe": "ప్రతి DANP IED స్వతంత్రమైన LAN A మరియు LAN B నెట్‌వర్క్‌లలో ఒకేసారి డూప్లికేట్ ఫ్రేమ్‌లను పంపి 0 ms ఫెయిల్‌ఓవర్ అందించే రిడండెన్సీ ప్రోటోకాల్.", "exampleRef": "LAN A 10.132.10.x / LAN B 10.132.20.x"}, {"term": "HSR (IEC 62439-3 Clause 5)", "category": "Redundancy", "definitionEn": "High-Availability Seamless Redundancy — Cut-through daisy-chain ring topology where each node sends frames in both directions around the ring with a 6-byte HSR header for 0 ms recovery without dedicated ring switches.", "definitionTe": "ప్రత్యేక స్విచ్‌లు లేకుండా IEDలన్నీ రింగ్ వలె కనెక్ట్ అయి రెండు దిశలలో ఫ్రేమ్‌లను పంపుతూ 0 ms రికవరీ ఇచ్చే ప్రోటోకాల్.", "exampleRef": "Bay Ring Port A & Port B"}, {"term": "BRCB vs URCB", "category": "IEC 61850-7-2", "definitionEn": "Buffered Report Control Block (BRCB) stores SOE events in internal memory during communication loss and replays them via EntryID upon reconnect; Unbuffered Report Control Block (URCB) sends reports only while connected without buffering.", "definitionTe": "BRCB కమ్యూనికేషన్ కట్ అయినప్పుడు ఈవెంట్లను మెమరీలో దాచుకుని కనెక్షన్ రాగానే EntryID ద్వారా పంపుతుంది; URCB బఫర్ చేయదు.", "exampleRef": "brcbSt01 (Buffered) vs urcbMeas01"}, {"term": "SBOes (ctlModel = 4)", "category": "Control", "definitionEn": "Select-Before-Operate with Enhanced Security — 4-step control state machine (SelectWithValue SBOw → Interlock/Loc validation → Operate Oper → physical 52a/52b verification + CommandTermination).", "definitionTe": "4-దశల సురక్షిత బ్రేకర్ కంట్రోల్: 1) SelectWithValue (SBOw), 2) CILO1 & Local/Remote తనిఖీ, 3) Operate (Oper), 4) 52a/52b మారిన తర్వాత CommandTermination.", "exampleRef": "CSWI1.Pos (ctlModel=4)"}, {"term": "XCBR / XSWI / CSWI / CILO", "category": "Logical Nodes", "definitionEn": "Standardized Switchgear & Control Logical Nodes: XCBR = Circuit Breaker (fault breaking), XSWI = Disconnector/Earth Switch (off-load), CSWI = Switch Controller (SBO commands), CILO = Interlocking logic.", "definitionTe": "XCBR = సర్క్యూట్ బ్రేకర్, XSWI = ఐసోలేటర్/ఎర్త్ స్విచ్, CSWI = స్విచ్ కంట్రోలర్, CILO = ఇంటర్‌లాకింగ్ లాజిక్.", "exampleRef": "XCBR1.Pos.stVal [ST]"}, {"term": "MMXU / PTOC / PDIS / PDIF / PTRC", "category": "Logical Nodes", "definitionEn": "Measurement & Protection Logical Nodes: MMXU = 3-Phase Measurement (MW, MVAR, kV, A, Hz), PTOC = Time Overcurrent (51), PDIS = Distance (21), PDIF = Differential (87), PTRC = Protection Trip Conditioning (86/Trip bus).", "definitionTe": "MMXU = కొలతలు (MW, MVAR, kV, A), PTOC = ఓవర్‌కరెంట్ (51), PDIS = డిస్టెన్స్ (21), PDIF = డిఫరెన్షియల్ (87), PTRC = ప్రొటెక్షన్ ట్రిప్ (86).", "exampleRef": "MMXU1.TotW.mag.f [MX]"}, {"term": "ICD / SSD / SCD / CID / IID", "category": "SCL Files", "definitionEn": "IEC 61850-6 XML files: ICD = IED Capability Description, SSD = System Specification Description, SCD = Master Substation Configuration Description, CID = Configured IED Description, IID = Instantiated IED Description.", "definitionTe": "ICD = రిలే సామర్థ్య ఫైల్, SSD = సబ్‌స్టేషన్ స్పెసిఫికేషన్, SCD = మాస్టర్ సబ్‌స్టేషన్ కాన్ఫిగరేషన్ ఫైల్, CID = రిలేలోకి డౌన్‌లోడ్ చేసే ఫైల్.", "exampleRef": "SAS_132_33_11kV_Master.scd"}, {"term": "IEEE 1588v2 PTP (61850-9-3)", "category": "Time Sync", "definitionEn": "Precision Time Protocol Power Utility Profile using hardware timestamping and switch Peer-to-Peer Transparent Clocks (P2P TC) on Layer-2 (0x88F7) to synchronize IED clocks within ±38 ns to ±100 ns.", "definitionTe": "హార్డ్‌వేర్ టైమ్‌స్టాంపింగ్ మరియు Transparent Clocks సహాయంతో సబ్‌స్టేషన్ లోని అన్ని రిలేలను ±38 ns నుండి ±100 ns కచ్చితత్వంతో సింక్ చేసే ప్రోటోకాల్.", "exampleRef": "Meinberg GM 10.132.10.240 (VLAN 40)"}];


// --- Compatibility Enrichments for Redesigned IEC 61850 Academy Workspace ---
export type Iec61850AcademyChapter = AcademyChapter;
export type EngineeringDiagramItem = AcademyDiagramSpec;

function buildDiagramSvgMarkup(d: AcademyDiagramSpec): string {
  const boxes = (d.hotspots || [])
    .map(
      (h) => `
      <g>
        <rect x="${h.x}" y="${h.y}" width="${h.w}" height="${h.h}" rx="10" fill="#071B30" stroke="${h.color || '#00CFFF'}" stroke-width="2"/>
        <text x="${h.x + 12}" y="${h.y + 24}" fill="#FFFFFF" font-family="monospace" font-size="12" font-weight="bold">${(h.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
        <text x="${h.x + 12}" y="${h.y + 44}" fill="${h.color || '#00E5FF'}" font-family="sans-serif" font-size="10.5">${(h.sublabel || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
      </g>`
    )
    .join('\\n');

  const lines = (d.connections || [])
    .map((c) => {
      const fromH = (d.hotspots || []).find((h) => h.id === c.from);
      const toH = (d.hotspots || []).find((h) => h.id === c.to);
      if (!fromH || !toH) return '';
      const x1 = fromH.x + fromH.w / 2;
      const y1 = fromH.y + fromH.h / 2;
      const x2 = toH.x + toH.w / 2;
      const y2 = toH.y + toH.h / 2;
      const mx = (x1 + x2) / 2;
      const my = (y1 + y2) / 2 - 8;
      return `
      <g>
        <line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${c.color || '#00CFFF'}" stroke-width="2" stroke-dasharray="${c.dashed ? '6,4' : 'none'}"/>
        <text x="${mx}" y="${my}" fill="${c.color || '#7BEAFF'}" font-family="monospace" font-size="10" text-anchor="middle">${(c.label || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
      </g>`;
    })
    .join('\\n');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 320" width="100%" height="auto" style="background:#030C18;border-radius:12px;">
    <defs>
      <linearGradient id="hdrGrad" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#08233E"/>
        <stop offset="100%" stop-color="#041322"/>
      </linearGradient>
    </defs>
    <rect x="8" y="8" width="944" height="42" rx="8" fill="url(#hdrGrad)" stroke="#1B4368"/>
    <text x="24" y="34" fill="#00E5FF" font-family="sans-serif" font-size="13" font-weight="bold">#${String(d.number).padStart(2, '0')} — ${(d.titleEn || '').replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>
    ${lines}
    ${boxes}
  </svg>`;
}

for (const d of ENGINEERING_DIAGRAM_LIBRARY as any[]) {
  d.title = d.title || d.titleEn;
  d.subtitle = d.subtitle || `Diagram #${String(d.number).padStart(2, '0')} • ${d.category}`;
  d.description = d.description || d.summaryEn;
  d.svgMarkup = d.svgMarkup || buildDiagramSvgMarkup(d);
}

for (const ch of IEC61850_ACADEMY_CHAPTERS as any[]) {
  ch.number = ch.number ?? ch.chapterNumber;
  ch.title = ch.title || (ch.titleEn || '').replace(/^Chapter\\s+\\d+\\s+—\\s+/i, '');
  ch.summary = ch.summary || ch.subtitleEn;
  ch.keyTakeaways =
    ch.keyTakeaways ||
    (ch.sections || []).flatMap((s: any) => s.keyTakeawaysEn || []);
  for (const sec of ch.sections || []) {
    sec.heading = sec.heading || sec.headingEn;
    sec.paragraphs = sec.paragraphs || sec.bodyEn || [];
    sec.bullets = sec.bullets || sec.keyTakeawaysEn || [];
    if (!sec.diagramAscii && sec.codeOrXmlSnippet) {
      sec.diagramAscii = sec.codeOrXmlSnippet;
    }
    if (!sec.table && sec.tableHeaders && sec.tableRows) {
      sec.table = { headers: sec.tableHeaders, rows: sec.tableRows };
    }
  }
}

export const IEC61850_LOGICAL_NODES_DICTIONARY = [
  {
    lnClass: 'LLN0',
    ansiDevice: 'SYS',
    name: 'Logical Node Zero (Common Logical Device Control)',
    purpose: 'Holds common Logical Device mode/behavior (Mod, Beh, Health) and station-level DataSets, BRCBs, URCBs, and GSEControl blocks.',
    keyDataObjects: ['Mod', 'Beh', 'Health', 'NamPlt', 'Loc'],
  },
  {
    lnClass: 'LPHD',
    ansiDevice: 'HW',
    name: 'Physical Device Information',
    purpose: 'Represents physical IED hardware health, simulation test mode (Sim), power supply status, and PRP LAN A/B link supervision.',
    keyDataObjects: ['PhyNam', 'PhyHealth', 'Proxy', 'Sim', 'PwrUp'],
  },
  {
    lnClass: 'PTOC',
    ansiDevice: '50 / 51 / 50N / 51N',
    name: 'Time Overcurrent Protection',
    purpose: 'Detects phase or ground current exceeding pickup setting and asserts Start (Str) and Operate (Op) after inverse/definite time delay.',
    keyDataObjects: ['Mod', 'Beh', 'Str', 'Op', 'TmACrv', 'StrVal'],
  },
  {
    lnClass: 'PDIS',
    ansiDevice: '21',
    name: 'Distance Protection (Zone 1 / Zone 2 / Zone 3)',
    purpose: 'Measures line positive-sequence impedance (Z = V/I) on 132 kV transmission lines to provide high-speed zone-selective fault tripping.',
    keyDataObjects: ['Mod', 'Beh', 'Str', 'Op', 'PhStr', 'GndStr', 'PoRch'],
  },
  {
    lnClass: 'PDIF',
    ansiDevice: '87T / 87L / 87B',
    name: 'Differential Protection (Transformer / Line / Busbar)',
    purpose: 'Compares vector sum of currents entering and leaving the protected zone (e.g. 50 MVA 132/33 kV transformer) with harmonic restraint.',
    keyDataObjects: ['Mod', 'Beh', 'Str', 'Op', 'DifAClc', 'RstA'],
  },
  {
    lnClass: 'PTRC',
    ansiDevice: '86 / 94',
    name: 'Protection Trip Conditioning',
    purpose: 'Aggregates Operate signals from multiple protection elements (PTOC, PDIS, PDIF) into a master trip command (Tr.general) and GOOSE trigger.',
    keyDataObjects: ['Mod', 'Beh', 'Tr', 'Op', 'Str'],
  },
  {
    lnClass: 'RBRF',
    ansiDevice: '50BF',
    name: 'Breaker Failure Protection (LBB)',
    purpose: 'Starts timer when PTRC issues a trip; if current > 0.1 In or 52a remains closed after 150 ms, issues backup GOOSE inter-trip (OpEx) to upstream breakers.',
    keyDataObjects: ['Mod', 'Beh', 'Str', 'OpEx', 'OpIn', 'FailMod'],
  },
  {
    lnClass: 'RSYN',
    ansiDevice: '25',
    name: 'Synchrocheck / Synchronizing',
    purpose: 'Verifies voltage magnitude difference (ΔV), phase angle difference (Δθ < 15°), and slip frequency (Δf) before permitting CB closure.',
    keyDataObjects: ['Mod', 'Beh', 'Rel', 'VInd', 'AngInd', 'HzInd'],
  },
  {
    lnClass: 'XCBR',
    ansiDevice: '52',
    name: 'Circuit Breaker',
    purpose: 'Models the physical high-voltage Circuit Breaker capable of interrupting short-circuit fault currents, exposing 52a/52b position (Pos) and operation counter (OpCnt).',
    keyDataObjects: ['Loc', 'OpCnt', 'Pos', 'BlkOpn', 'BlkCls', 'CBOpCap'],
  },
  {
    lnClass: 'XSWI',
    ansiDevice: '89 / 89E',
    name: 'Circuit Switch (Disconnector / Earthing Switch)',
    purpose: 'Models off-load motorised line/busbar disconnectors (89L/89B) and maintenance earthing switches (89E).',
    keyDataObjects: ['Loc', 'OpCnt', 'Pos', 'BlkOpn', 'BlkCls', 'SwTyp'],
  },
  {
    lnClass: 'CSWI',
    ansiDevice: 'CTRL',
    name: 'Switch Controller',
    purpose: 'Handles Select-Before-Operate with Enhanced Security (SBOes ctlModel=4) commands from SCADA HMI or RCC Gateway after verifying CILO interlocking.',
    keyDataObjects: ['Loc', 'Pos', 'OpOpn', 'OpCls', 'SelOpn', 'SelCls'],
  },
  {
    lnClass: 'CILO',
    ansiDevice: '3',
    name: 'Interlocking Logic',
    purpose: 'Evaluates bay and station-wide boolean interlocking rules and outputs EnaOpn (Enable Open) and EnaCls (Enable Close) to CSWI.',
    keyDataObjects: ['Mod', 'Beh', 'EnaOpn', 'EnaCls'],
  },
  {
    lnClass: 'MMXU',
    ansiDevice: 'MET',
    name: 'Measurement Unit (3-Phase Power & AC Quantities)',
    purpose: 'Calculates three-phase active power (TotW), reactive power (TotVAr), apparent power (TotVA), power factor (TotPF), frequency (Hz), phase voltages (PhV), and currents (A).',
    keyDataObjects: ['TotW', 'TotVAr', 'TotVA', 'TotPF', 'Hz', 'PhV', 'A'],
  },
  {
    lnClass: 'ATCC / YLTC',
    ansiDevice: '90 / 84',
    name: 'Automatic Tap Changer Controller & On-Load Tap Changer',
    purpose: 'Monitors 33 kV bus voltage and issues Raise/Lower commands to the 50 MVA transformer OLTC (Tap 1–17) to regulate secondary voltage.',
    keyDataObjects: ['TapPos', 'TapChg', 'Auto', 'BndWid', 'CtlV'],
  },
  {
    lnClass: 'SIMG / SIML',
    ansiDevice: '63G / 49 / 71',
    name: 'Insulation Medium Supervision (SF6 Gas & Transformer Oil)',
    purpose: 'Monitors circuit breaker SF6 gas pressure/density stages and transformer Buchholz/OTI/WTI insulation alarms and trips.',
    keyDataObjects: ['InsAlm', 'InsBlk', 'InsTr', 'Pres', 'Tmp'],
  },
];

export const IEC61850_TREE_SIMULATOR = [
  {
    id: 'LN-LLN0',
    lnName: 'LLN0',
    lnClass: 'LLN0',
    iecGroup: 'System (L)',
    dataObjects: [
      {
        name: 'Mod',
        cdc: 'ENC',
        attributes: [
          { name: 'stVal', fc: 'ST', type: 'Enum (1..5)', sampleValue: '1 (on)', description: 'Current operational mode of Logical Device (on, blocked, test, test/blocked, off)' },
          { name: 'q', fc: 'ST', type: 'Quality', sampleValue: '0x0000 (Good)', description: 'Validity and test quality bitmask' },
          { name: 't', fc: 'ST', type: 'Timestamp', sampleValue: '2026-11-06T08:22:09.104Z', description: 'IEEE 1588v2 PTP synchronized UTC timestamp' },
          { name: 'ctlModel', fc: 'CF', type: 'ctlModels', sampleValue: '1 (direct-with-normal-security)', description: 'Control model configuration' },
        ],
      },
      {
        name: 'Health',
        cdc: 'ENS',
        attributes: [
          { name: 'stVal', fc: 'ST', type: 'Enum (1..3)', sampleValue: '1 (Ok)', description: 'Logical device health summary (1=Ok, 2=Warning, 3=Alarm)' },
          { name: 'q', fc: 'ST', type: 'Quality', sampleValue: '0x0000 (Good)', description: 'Quality descriptor' },
        ],
      },
    ],
  },
  {
    id: 'LN-LPHD1',
    lnName: 'LPHD1',
    lnClass: 'LPHD',
    iecGroup: 'System (L)',
    dataObjects: [
      {
        name: 'Sim',
        cdc: 'SPC',
        attributes: [
          { name: 'stVal', fc: 'ST', type: 'BOOLEAN', sampleValue: 'FALSE (Normal Service)', description: 'When TRUE, IED accepts simulated GOOSE/SV frames with Simulation bit set' },
          { name: 'q', fc: 'ST', type: 'Quality', sampleValue: '0x0000 (Good)', description: 'Quality flag' },
        ],
      },
      {
        name: 'PhyHealth',
        cdc: 'ENS',
        attributes: [
          { name: 'stVal', fc: 'ST', type: 'Enum', sampleValue: '1 (Ok)', description: 'Hardware watchdog, DC PSU, and SFP transceiver status' },
        ],
      },
    ],
  },
  {
    id: 'LN-PTOC1',
    lnName: 'PTOC1',
    lnClass: 'PTOC',
    iecGroup: 'Protection (P)',
    dataObjects: [
      {
        name: 'Op',
        cdc: 'ACT',
        attributes: [
          { name: 'general', fc: 'ST', type: 'BOOLEAN', sampleValue: 'FALSE', description: 'Asserts TRUE when time-overcurrent trip delay expires' },
          { name: 'phsA', fc: 'ST', type: 'BOOLEAN', sampleValue: 'FALSE', description: 'Phase A trip output' },
          { name: 'q', fc: 'ST', type: 'Quality', sampleValue: '0x0000 (Good)', description: 'Protection trip quality bitmask' },
          { name: 't', fc: 'ST', type: 'Timestamp', sampleValue: '2026-11-06T08:22:09.018Z', description: 'Hardware SOE trip assertion timestamp (±38 ns PTP)' },
        ],
      },
      {
        name: 'Str',
        cdc: 'ACD',
        attributes: [
          { name: 'general', fc: 'ST', type: 'BOOLEAN', sampleValue: 'FALSE', description: 'Asserts TRUE immediately when fault current exceeds pickup setting' },
          { name: 'dirGeneral', fc: 'ST', type: 'Direction', sampleValue: 'forward (1)', description: 'Fault direction (forward/backward/both)' },
          { name: 'q', fc: 'ST', type: 'Quality', sampleValue: '0x0000 (Good)', description: 'Start quality bitmask' },
        ],
      },
      {
        name: 'StrVal',
        cdc: 'ASG',
        attributes: [
          { name: 'setMag.f', fc: 'CF', type: 'FLOAT32', sampleValue: '1.20 In (480 A)', description: 'Overcurrent pickup threshold setting' },
        ],
      },
    ],
  },
  {
    id: 'LN-MMXU1',
    lnName: 'MMXU1',
    lnClass: 'MMXU',
    iecGroup: 'Metering (M)',
    dataObjects: [
      {
        name: 'TotW',
        cdc: 'MV',
        attributes: [
          { name: 'mag.f', fc: 'MX', type: 'FLOAT32', sampleValue: '42.85 MW', description: 'Three-phase total active power' },
          { name: 'q', fc: 'MX', type: 'Quality', sampleValue: '0x0000 (Good)', description: 'Measurement validity and overflow flags' },
          { name: 't', fc: 'MX', type: 'Timestamp', sampleValue: '2026-11-06T08:22:09.000Z', description: 'Measurement sample timestamp' },
          { name: 'db', fc: 'CF', type: 'INT32U', sampleValue: '1000 (1.0%)', description: 'Deadband configuration for spontaneous dchg reporting' },
        ],
      },
      {
        name: 'PhV',
        cdc: 'WYE',
        attributes: [
          { name: 'phsA.cVal.mag.f', fc: 'MX', type: 'FLOAT32', sampleValue: '76.21 kV', description: 'Phase A-to-Earth primary RMS voltage (132 kV / √3)' },
          { name: 'phsA.cVal.ang.f', fc: 'MX', type: 'FLOAT32', sampleValue: '0.0°', description: 'Phase A voltage phase angle' },
        ],
      },
    ],
  },
  {
    id: 'LN-XCBR1',
    lnName: 'XCBR1',
    lnClass: 'XCBR',
    iecGroup: 'Switchgear (X)',
    dataObjects: [
      {
        name: 'Pos',
        cdc: 'DPC',
        attributes: [
          { name: 'stVal', fc: 'ST', type: 'Dbpos (00..11)', sampleValue: '10 (on / CLOSED)', description: 'Double-point breaker position from 52a/52b contacts (01=off, 10=on, 00=intermediate, 11=bad)' },
          { name: 'q', fc: 'ST', type: 'Quality', sampleValue: '0x0000 (Good)', description: 'Breaker position quality' },
          { name: 't', fc: 'ST', type: 'Timestamp', sampleValue: '2026-11-06T08:15:00.004Z', description: '1 ms SOE transition timestamp' },
        ],
      },
      {
        name: 'OpCnt',
        cdc: 'INS',
        attributes: [
          { name: 'stVal', fc: 'ST', type: 'INT32', sampleValue: '148', description: 'Cumulative mechanical breaker operation counter' },
        ],
      },
    ],
  },
  {
    id: 'LN-CSWI1',
    lnName: 'CSWI1',
    lnClass: 'CSWI',
    iecGroup: 'Control (C)',
    dataObjects: [
      {
        name: 'Pos',
        cdc: 'DPC',
        attributes: [
          { name: 'ctlVal', fc: 'CO', type: 'BOOLEAN', sampleValue: 'TRUE (Close) / FALSE (Open)', description: 'SBOes SelectWithValue (SBOw) and Operate (Oper) command payload' },
          { name: 'ctlModel', fc: 'CF', type: 'ctlModels', sampleValue: '4 (sbo-with-enhanced-security)', description: 'Enforces 4-step Select-Before-Operate with CommandTermination' },
          { name: 'sboTimeout', fc: 'CF', type: 'INT32U', sampleValue: '15000 ms', description: 'Maximum reservation window between SBOw and Oper' },
        ],
      },
      {
        name: 'Loc',
        cdc: 'SPS',
        attributes: [
          { name: 'stVal', fc: 'ST', type: 'BOOLEAN', sampleValue: 'FALSE (REMOTE Enabled)', description: 'Bay Local/Remote 43LR switch state (FALSE = Remote SCADA control permitted)' },
        ],
      },
    ],
  },
];

export const VLAN_PRIORITY_ARCHITECTURES = [
  {
    vlanId: '20 (Hex 0x014)',
    trafficType: 'IEC 61850-8-1 GOOSE (Protection Trip & Interlocking)',
    pcpPriority: '4 (High-Priority Real-Time)',
    multicastRange: 'EtherType 0x88B8 • MAC 01-0C-CD-01-00-00 .. 01-FF (< 3 ms)',
  },
  {
    vlanId: '30 (Hex 0x01E)',
    trafficType: 'IEC 61850-9-2 LE Sampled Values (Process Bus CT/VT)',
    pcpPriority: '4 (Isochronous 4000 Hz Stream)',
    multicastRange: 'EtherType 0x88BA • MAC 01-0C-CD-04-00-00 .. 01-FF (4.8 Mbps/MU)',
  },
  {
    vlanId: '40 (Hex 0x028)',
    trafficType: 'IEEE 1588v2 PTP Power Profile (IEC 61850-9-3 Time Sync)',
    pcpPriority: '6 (Network Control / Clock Sync)',
    multicastRange: 'EtherType 0x88F7 • MAC 01-1B-19-00-00-00 (±38 ns Hardware Sync)',
  },
  {
    vlanId: '10 (Hex 0x00A)',
    trafficType: 'IEC 61850-8-1 MMS Client/Server (SCADA BRCB & SBO)',
    pcpPriority: '2 (Explicit TCP/IP Supervisory)',
    multicastRange: 'Unicast TCP Port 102 • Subnet 10.132.10.0/24 (LAN A) & 10.132.20.0/24 (LAN B)',
  },
  {
    vlanId: '50 (Hex 0x032)',
    trafficType: 'Engineering Workstation, SNMP, Syslog & Disturbance Records',
    pcpPriority: '1 (Best-Effort Background)',
    multicastRange: 'HTTPS / SSH / SNMPv3 / COMTRADE File Transfer (Rate-Limited)',
  },
];
