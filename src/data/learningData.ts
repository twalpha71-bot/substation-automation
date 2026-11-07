import { LearningModule } from '../types/substation';

export const LEARNING_MODULES: LearningModule[] = [
  {
    id: 'MOD-01',
    moduleNumber: 1,
    title: 'Substation Primary Architecture (132/33/11 kV)',
    level: 'Beginner',
    summaryEn: 'Understand how 132 kV transmission lines, 50 MVA power transformers, double-section busbars with bus couplers, and 33/11 kV distribution switchgear form a reliable substation topology.',
    summaryTe: '132 kV Transmission Lines, 50 MVA Power Transformers, Bus Coupler ఉన్న Two-Section Busbars, మరియు 33/11 kV Switchgear కలిసి ఒక సురక్షితమైన Substation Topology ఎలా ఏర్పరుస్తాయో వివరంగా తెలుసుకోండి.',
    keyConcepts: [
      {
        heading: 'Two-Section Busbar with Bus Coupler (CB-132, CB-33, CB-11)',
        explanationEn: 'Dividing the busbar into Section A and Section B via a Bus Coupler breaker allows half the substation to remain in service during maintenance or busbar faults. Normally, Incomer 1 feeds Bus A, Incomer 2 feeds Bus B, and the Bus Coupler remains OPEN (2-out-of-3 scheme) to limit short-circuit fault current.',
        explanationTe: 'Busbar ను Section A మరియు Section B గా విభజించి మధ్యలో Bus Coupler Circuit Breaker ఉంచడం వల్ల ఒక వైపు Maintenance ఉన్నప్పుడు మరో వైపు నిరంతరాయంగా పనిచేస్తుంది. సాధారణంగా Incomer 1 -> Bus A, Incomer 2 -> Bus B కి సరఫరా ఇస్తాయి; Fault Current పరిమితి కోసం Bus Coupler OPEN లో ఉంటుంది (2-out-of-3 Interlocking Scheme).',
        technicalTakeaway: 'Never parallel two independent incoming transformers through a closed Bus Coupler unless permitted by short-circuit MVA rating and synch-check (CSWI25).',
      },
      {
        heading: 'CTs, CVTs/VTs, Disconnectors (Q1/Q9) & Earth Switches (Q8)',
        explanationEn: 'Circuit Breakers (XCBR) interrupt fault and load current. Disconnectors/Isolators (XSWI Q1/Q9) provide visible off-load isolation and must only operate when the breaker is OPEN. Earth Switches (Q8) safely ground de-energized line or feeder sections for maintenance.',
        explanationTe: 'Circuit Breaker (XCBR) Load మరియు Fault Current ను ఆపగలదు. కానీ Disconnector/Isolator (XSWI Q1/Q9) కేవలం Breaker OPEN లో ఉన్నప్పుడు మాత్రమే ఆపరేట్ చేయాలి (No-Load Isolation). Earth Switch (Q8) లైన్ లోని మిగిలిన చార్జ్ ని భూమికి (Ground) కలిపి సిబ్బందికి భద్రత కల్పిస్తుంది.',
        technicalTakeaway: 'Interlocking (CILO1) strictly prevents closing Earth Switch Q8 when Q1/Q9 or CB is CLOSED.',
      },
    ],
    interactiveExercise: {
      prompt: 'Open the Interactive SLD tab, trip or open 33-INC1 (Transformer T1 33 kV Incomer), and observe how CB-33 Bus Coupler interlocking changes from BLOCKED to PERMISSIVE OK.',
      actionHint: 'Go to SLD Workspace → Click 33-INC1 → Open Breaker → Click CB-33 → Close Bus Coupler.',
      targetTab: 'SLD',
    },
    quizQuestions: [
      {
        question: 'Why is the 33 kV Bus Coupler (CB-33) interlocked under a 2-out-of-3 scheme with Incomer 1 and Incomer 2?',
        options: [
          'To reduce auxiliary DC battery consumption',
          'To prevent paralleling two 50 MVA transformers and exceeding the 33 kV switchgear short-circuit breaking capacity',
          'Because IEC 61850 does not support three closed breakers on a busbar',
          'To disable OLTC automatic voltage regulation',
        ],
        correctIndex: 1,
        explanationEn: 'Paralleling T1 and T2 halves the equivalent source impedance, nearly doubling the 33 kV fault current beyond the switchgear kA rating.',
        explanationTe: 'T1 మరియు T2 సమాంతరంగా (Parallel) కలిపితే Source Impedance సగానికి తగ్గి, Fault Current రెట్టింపు అవుతుంది. అందుకే 2-out-of-3 Interlock వాడుతారు.',
      },
    ],
    interviewQuestions: [
      {
        q: 'What is the switching sequence to isolate a 132 kV Line Bay for maintenance?',
        aEn: '1) Verify remote end breaker open or transfer load. 2) Open local Circuit Breaker (52). 3) Visually/electrically confirm CB is OPEN. 4) Open Busbar Disconnector (89B/Q1) then Line Disconnector (89L/Q9). 5) Verify line is dead via CVT voltage indication, then close Line Earth Switch (89E/Q8).',
        aTe: '1) ముందుగా Circuit Breaker (52) ని OPEN చేయాలి. 2) CB OPEN అని నిర్ధారించాక Bus Isolator (Q1) మరియు Line Isolator (Q9) OPEN చేయాలి. 3) CVT ద్వారా లైన్ Dead అని చూసుకున్నాక మాత్రమే Earth Switch (Q8) CLOSE చేయాలి.',
      },
    ],
  },
  {
    id: 'MOD-02',
    moduleNumber: 2,
    title: 'Protection & Control Engineering (ANSI 50/51, 87T, 21, 50BF)',
    level: 'Intermediate',
    summaryEn: 'Master numerical protection coordination across 132 kV Distance (PDIS), 132/33 kV Transformer Differential (PDIF), 33/11 kV Overcurrent/Earth Fault (PTOC), and Breaker Failure (RBRF).',
    summaryTe: '132 kV Distance Protection (PDIS), Transformer Differential (PDIF 87T), Overcurrent/Earth Fault (PTOC 50/51), మరియు Breaker Failure (RBRF 50BF) ఎలా సమన్వయంతో పనిచేస్తాయో నేర్చుకోండి.',
    keyConcepts: [
      {
        heading: 'Transformer Differential (87T — PDIF1) & Restricted Earth Fault (64REF — PDIF2)',
        explanationEn: 'Differential protection compares HV and LV currents compensated for transformer ratio and vector group (YNyn0d1 / Dyn11). Second-harmonic restraint prevents mal-operation during magnetizing inrush, while 5th-harmonic restraint blocks tripping during over-excitation.',
        explanationTe: 'Transformer Differential (87T — PDIF1) HV మరియు LV వైపు CT కరెంట్లను పోల్చి చూస్తుంది. ట్రాన్స్‌ఫార్మర్ చార్జ్ చేసేటప్పుడు వచ్చే Magnetizing Inrush కరెంట్ వల్ల తప్పుగా Trip అవ్వకుండా 2nd Harmonic Restraint ఉపయోగపడుతుంది.',
        technicalTakeaway: 'When 87T or Buchholz/PRD operates, both HV and LV circuit breakers must trip simultaneously via hardwired 86T and GOOSE intertrip.',
      },
      {
        heading: 'Breaker Failure Protection (50BF — RBRF1)',
        explanationEn: 'If a protection trip (`PTRC1.Tr.general`) is issued but current continues flowing above threshold after 60 ms, `RBRF1.OpIn` issues a retrip to the local breaker; if still un-cleared at 150 ms, `RBRF1.OpEx` publishes a high-priority GOOSE trip to all adjacent breakers on that bus section.',
        explanationTe: 'Relay Trip కమాండ్ ఇచ్చిన తర్వాత కూడా Circuit Breaker తెరుచుకోకపోతే (Stuck Breaker), 60 ms కి Retrip ఇస్తుంది, మరియు 150 ms కి `RBRF1.OpEx` ద్వారా ఆ Bus Section లోని మిగతా అన్ని Breakers ని GOOSE ద్వారా Trip చేస్తుంది.',
        technicalTakeaway: 'RBRF relies on high-speed GOOSE (< 4 ms transmission) for busbar zone tripping.',
      },
    ],
    interactiveExercise: {
      prompt: 'Go to Fault Injection tab and trigger F13 (Transformer T1 Differential 87T Trip). Observe both CB-132-T1 and CB-33-INC1 trip simultaneously.',
      actionHint: 'Fault Injection → Activate F13-TX-PROT-TRIP → Inspect SLD & SOE.',
      targetTab: 'FAULTS',
    },
    quizQuestions: [
      {
        question: 'Which IEC 61850 Logical Node aggregates individual protection trips (PTOC, PDIS, PDIF) into a master breaker trip output?',
        options: ['XCBR1', 'CSWI1', 'PTRC1', 'MMXU1'],
        correctIndex: 2,
        explanationEn: 'PTRC (Protection Trip Conditioning) aggregates operate signals from PTOC/PDIS/PDIF into PTRC1.Tr.general.',
        explanationTe: 'PTRC (Protection Trip Conditioning) అనేది అన్ని రక్షణ ఫంక్షన్ల (PTOC, PDIS, PDIF) యొక్క Trip సంకేతాలను కలిపి Master Trip (`PTRC1.Tr.general`) గా ఇస్తుంది.',
      },
    ],
    interviewQuestions: [
      {
        q: 'What is the difference between Protection Pickup (Str / ACD) and Protection Operate (Op / ACT)?',
        aEn: 'Pickup (`Str`, Common Data Class `ACD`) asserts immediately when fault current exceeds the threshold and includes directionality (`dirGeneral`). Operate (`Op`, Common Data Class `ACT`) asserts only after the configured time-delay curve (IDMT or definite time) expires to trip the breaker.',
        aTe: 'Fault కరెంట్ పరిమితి దాటిన వెంటనే Pickup (`Str` - ACD) వస్తుంది. నిర్ణీత సమయం (Time Delay) పూర్తయ్యాక Breaker ని Trip చేయడానికి Operate (`Op` - ACT) సిగ్నల్ వస్తుంది.',
      },
    ],
  },
  {
    id: 'MOD-03',
    moduleNumber: 3,
    title: 'IEC 61850 Data Modelling (IED → LD → LN → DO → DA → FC)',
    level: 'Intermediate',
    summaryEn: 'Decode the hierarchical object model of IEC 61850-7-4 and 7-3: Logical Devices, Logical Nodes, Data Objects, Common Data Classes (CDC), Data Attributes, and Functional Constraints.',
    summaryTe: 'IEC 61850 Object Hierarchy: Physical Device (IED) → Logical Device (LD) → Logical Node (LN) → Data Object (DO) → Data Attribute (DA) మరియు Functional Constraints (FC) గురించి పూర్తిగా అర్థం చేసుకోండి.',
    keyConcepts: [
      {
        heading: 'Hierarchical Object Reference Anatomy',
        explanationEn: 'Consider `IED_33_F01Application/XCBR1.Pos.stVal [ST]`. Here `IED_33_F01` is the IED name, `Application` is the Logical Device (`ldInst`), `XCBR1` is the Logical Node, `Pos` is the Data Object (CDC = `DPC`), and `stVal` is the Data Attribute with Functional Constraint `ST` (Status).',
        explanationTe: '`IED_33_F01Application/XCBR1.Pos.stVal [ST]` లో: `IED_33_F01` అనేది Relay పేరు, `Application` అనేది Logical Device, `XCBR1` అనేది Circuit Breaker Logical Node, `Pos` అనేది Data Object, మరియు `stVal` అనేది Status Data Attribute.',
        technicalTakeaway: 'Never confuse a Data Object (`Pos`) with a leaf Data Attribute (`stVal`, `q`, `t`).',
      },
      {
        heading: 'Functional Constraints (ST, MX, CO, CF, DC, SP)',
        explanationEn: 'Functional Constraints filter which attributes belong to a service or dataset: `ST` = Status, `MX` = Measurands (analog), `CO` = Control operations (`SBOw`, `Oper`, `Cancel`), `CF` = Configuration (`ctlModel`, `sboTimeout`), `DC` = Description.',
        explanationTe: 'Functional Constraints (FC) అనేవి డేటా స్వభావాన్ని తెలుపుతాయి: `ST` (Status), `MX` (Measurements), `CO` (Control Commands), `CF` (Configuration).',
        technicalTakeaway: 'A Dataset FCDA always specifies the Functional Constraint (`fc="ST"` or `fc="MX"`) so the report/GOOSE includes only the intended attributes.',
      },
    ],
    interactiveExercise: {
      prompt: 'Open the IED Explorer tab, select any relay, and inspect its Logical Devices, Logical Nodes, Data Objects, and leaf attributes.',
      actionHint: 'IED Explorer → Select IED_132_L1 → Logical Nodes tab.',
      targetTab: 'IED',
    },
    quizQuestions: [
      {
        question: 'In IEC 61850-7-3, what is the Common Data Class (CDC) of `MMXU1.A.phsA` (Phase A Current)?',
        options: ['SPS (Single Point Status)', 'DPC (Double Point Control)', 'CMV (Complex Measured Value)', 'ACT (Protection Activation)'],
        correctIndex: 2,
        explanationEn: 'Phase currents and voltages in MMXU are Complex Measured Values (CMV) with magnitude (`cVal.mag.f`) and angle (`cVal.ang.f`).',
        explanationTe: 'MMXU లోని Phase Current మరియు Voltage లు Complex Measured Value (CMV) రకానికి చెందుతాయి (వీటిలో Magnitude `cVal.mag.f` మరియు Angle `cVal.ang.f` ఉంటాయి).',
      },
    ],
    interviewQuestions: [
      {
        q: 'Why should circuit breaker OPEN and CLOSED indications not be modelled as two independent XCBR nodes?',
        aEn: 'One physical 3-pole circuit breaker corresponds to one `XCBR` instance (`XCBR1`). Its position is a 2-bit Double-Point status (`XCBR1.Pos.stVal` of type `Dbpos`: `00` intermediate, `01` open, `10` closed, `11` bad). Single-point open/closed tags in legacy SCADA are derived from this `Dbpos` or auxiliary `GGIO` contacts.',
        aTe: 'ఒక Circuit Breaker కి ఒకే `XCBR1` Logical Node ఉంటుంది. దాని స్థితి `XCBR1.Pos.stVal` లో 2-bit `Dbpos` (`01`=Open, `10`=Closed, `00`=Intermediate, `11`=Bad) గా ఉంటుంది.',
      },
    ],
  },
  {
    id: 'MOD-04',
    moduleNumber: 4,
    title: 'GOOSE & MMS Communications Engineering',
    level: 'Advanced',
    summaryEn: 'Contrast Layer-2 multicast GOOSE (Ethertype 0x88B8) for < 4 ms peer-to-peer protection/interlocking with TCP/IP Port 102 Client/Server MMS for SCADA reporting and SBO control.',
    summaryTe: 'వేగవంతమైన రక్షణ కోసం వాడే Layer-2 Multicast GOOSE (Ethertype 0x88B8, < 4 ms) మరియు SCADA కమ్యూనికేషన్ కోసం వాడే TCP/IP Port 102 MMS మధ్య తేడాలను తెలుసుకోండి.',
    keyConcepts: [
      {
        heading: 'GOOSE State Machine (`stNum` & `sqNum`) and Retransmission Curve',
        explanationEn: 'GOOSE maps directly onto Ethernet Layer 2 bypassing TCP/IP overhead. During steady state, frames repeat at `MaxTime` (e.g. 1000 ms) with `sqNum` incrementing. On a data change in the linked DataSet, `stNum` increments by 1, `sqNum` resets to 0, and frames burst at `MinTime` (e.g. 4 ms → 8 ms → 16 ms → 1000 ms).',
        explanationTe: 'GOOSE అనేది TCP/IP లేకుండా నేరుగా Ethernet Layer-2 పై ప్రయాణిస్తుంది. ఏదైనా Trip లేదా Status మారిన వెంటనే `stNum` 1 పెరుగుతుంది, `sqNum` 0 కి రీసెట్ అవుతుంది, మరియు మెసేజ్ 4 ms వేగంతో (MinTime) వెంటవెంటనే పంపబడుతుంది.',
        technicalTakeaway: 'Subscribers detect lost or stale GOOSE streams using `timeAllowedToLive` (TAL) and `confRev` validation.',
      },
      {
        heading: 'Buffered (BRCB) vs Unbuffered (URCB) MMS Report Control Blocks',
        explanationEn: 'Buffered RCBs (`BRCB`) store Sequence-of-Events (`dchg`, `qchg`) in relay RAM during a SCADA connection loss and replay them via `EntryID` upon reconnection. Unbuffered RCBs (`URCB`) stream cyclic analog measurements (`MMXU`) without buffering.',
        explanationTe: 'SCADA కమ్యూనికేషన్ కట్ అయినప్పుడు కూడా జరిగిన Trip/Status మార్పులను Relay మెమరీలో దాచి ఉంచి, కనెక్షన్ రాగానే పంపేది Buffered RCB (BRCB). సాధారణ Analog Measurements కోసం Unbuffered RCB (URCB) వాడుతారు.',
        technicalTakeaway: 'Always assign status/protection datasets to BRCBs and cyclic metering datasets to URCBs.',
      },
    ],
    interactiveExercise: {
      prompt: 'Open the GOOSE Lab, click "Simulate State Change (Trip Burst)" on GOCB-33-F03-CILO, and watch stNum increment, sqNum reset to 0, and the Wireshark hex dissector update.',
      actionHint: 'GOOSE Lab → Select GOCB-33-F03-CILO → Trigger State Change.',
      targetTab: 'GOOSE',
    },
    quizQuestions: [
      {
        question: 'What happens to `stNum` and `sqNum` in a GOOSE frame immediately when a circuit breaker trips?',
        options: [
          'stNum resets to 0 and sqNum increments by 1',
          'stNum increments by 1 and sqNum resets to 0',
          'Both stNum and sqNum increment by 1',
          'confRev increments by 1',
        ],
        correctIndex: 1,
        explanationEn: 'A state change in any FCDA of the GOOSE dataset increments stNum (State Number) by 1 and resets sqNum (Sequence Number) to 0.',
        explanationTe: 'GOOSE Dataset లోని ఏ సిగ్నల్ మారినా `stNum` 1 పెరుగుతుంది మరియు `sqNum` 0 కి రీసెట్ అవుతుంది.',
      },
    ],
    interviewQuestions: [
      {
        q: 'Why does GOOSE use multicast MAC addresses in the range 01-0C-CD-01-00-00 to 01-0C-CD-01-01-FF?',
        aEn: 'IEC 61850-8-1 Annex A reserves the IEEE OUI prefix `01-0C-CD` with `01` for GOOSE, `02` for GSSE, and `04` for Sampled Values (SV), allowing Ethernet switches and NIC hardware filters to identify and prioritize Layer-2 substation multicast frames.',
        aTe: 'IEC 61850-8-1 ప్రకారం GOOSE కోసం `01-0C-CD-01-xx-xx` మరియు Sampled Values (SV) కోసం `01-0C-CD-04-xx-xx` Multicast MAC అడ్రస్ శ్రేణి కేటాయించబడింది.',
      },
    ],
  },
  {
    id: 'MOD-05',
    moduleNumber: 5,
    title: 'SCL Engineering Workflow (ICD → IID → SCD → CID)',
    level: 'Advanced',
    summaryEn: 'Understand the IEC 61850-6 XML engineering lifecycle across vendor IED tools and system configurators.',
    summaryTe: 'IEC 61850-6 లోని XML ఫైల్స్ (ICD, IID, SCD, CID) ఉపయోగించి వివిధ కంపెనీల Relays ని ఎలా కాన్ఫిగర్ చేస్తారో తెలుసుకోండి.',
    keyConcepts: [
      {
        heading: 'Top-Down vs Bottom-Up SCL Engineering',
        explanationEn: 'Each relay starts as an unconfigured `.icd` template. In the vendor tool, engineers configure protection settings and export an `.iid`. The System Configurator imports all `.iid`/`.icd` files, binds GOOSE `<Inputs><ExtRef>` and IP/VLAN parameters, and exports the station master `.scd`, from which individual `.cid` files are loaded into each IED.',
        explanationTe: 'ప్రతి Relay కి తయారీదారు ఇచ్చే టెంప్లేట్ `.icd`. దానిని ప్రోజెక్ట్ ప్రకారం మార్చి `.iid` గా ఎగుమతి చేస్తారు. అన్ని IED లను కలిపి System Configurator లో GOOSE మరియు IP లు జతచేసి `.scd` (Master File) తయారు చేస్తారు. చివరిగా ప్రతి Relay లోకి దాని `.cid` ఫైల్ డౌన్‌లోడ్ చేస్తారు.',
        technicalTakeaway: 'Incrementing a DataSet structure changes `confRev`, requiring both publisher and subscriber CID files to be updated.',
      },
    ],
    interactiveExercise: {
      prompt: 'Open Signal Mapping & SCL tab, switch to the SCL Engineering Viewer, and compare the XML structure of ICD, IID, SCD, and CID files.',
      actionHint: 'Signal Mapping & SCL → SCL XML Workspace tab.',
      targetTab: 'SIGNALS',
    },
    quizQuestions: [
      {
        question: 'Which SCL file contains the complete substation topology, communication subnetwork, and all cross-vendor GOOSE `<ExtRef>` bindings?',
        options: ['ICD', 'SSD', 'SCD', 'CID'],
        correctIndex: 2,
        explanationEn: 'The SCD (Substation Configuration Description) holds the complete station configuration across all IEDs.',
        explanationTe: 'SCD (Substation Configuration Description) ఫైల్ లో సబ్‌స్టేషన్ లోని అన్ని IED లు, Network మరియు GOOSE ExtRef వివరాలు ఉంటాయి.',
      },
    ],
    interviewQuestions: [
      {
        q: 'What is an `<ExtRef>` element in an SCL file?',
        aEn: '`<ExtRef>` (External Reference) inside a subscriber IED’s `<Inputs>` section binds an external publisher’s GOOSE or SV data attribute (`iedName`, `ldInst`, `lnClass`, `doName`, `daName`, `srcCBName`) to an internal logical node input (`intAddr`).',
        aTe: 'ఒక Relay (Publisher) పంపే GOOSE సిగ్నల్ ని మరొక Relay (Subscriber) లోపలి వేరియబుల్ (`intAddr`) కి జత చేయడానికి వాడే XML ట్యాగ్ `<ExtRef>`.',
      },
    ],
  },
  {
    id: 'MOD-06',
    moduleNumber: 6,
    title: 'PRP, HSR & IEEE 1588 PTPv2 Substation Networking',
    level: 'Advanced',
    summaryEn: 'Design zero-recovery-time redundant station buses using IEC 62439-3 Parallel Redundancy Protocol (PRP) and High-availability Seamless Redundancy (HSR).',
    summaryTe: 'సబ్‌స్టేషన్ నెట్‌వర్క్ లో ఒక కేబుల్ తెగిపోయినా 0 ms లోపు కమ్యూనికేషన్ కొనసాగేలా చేసే PRP (LAN A / LAN B) మరియు HSR Ring టెక్నాలజీని అర్థం చేసుకోండి.',
    keyConcepts: [
      {
        heading: 'PRP (LAN A + LAN B) vs HSR Ring Topology',
        explanationEn: 'In PRP, each Dual Attached Node (DANP) sends duplicate frames with a Redundancy Control Trailer (RCT) simultaneously onto two independent switches (LAN A and LAN B). In HSR, DANH relays form a daisy-chain ring without dedicated switches, forwarding frames in both directions.',
        explanationTe: 'PRP లో ప్రతి Relay (DANP) రెండు వేర్వేరు స్విచ్‌లకు (LAN-A మరియు LAN-B) ఒకేసారి డేటా పంపుతుంది. ఒక స్విచ్ ఆగిపోయినా రెండో దాని ద్వారా 0 ms ఆలస్యంతో డేటా చేరుతుంది. HSR లో స్విచ్‌లు లేకుండా Relays అన్నీ ఒక Ring లాగా కనెక్ట్ అవుతాయి.',
        technicalTakeaway: 'Single Attached Nodes (SAN) require a RedBox to participate on a PRP or HSR network.',
      },
    ],
    interactiveExercise: {
      prompt: 'Open Network Topology tab, switch between PRP, HSR, Dual LAN, and Single LAN modes, and simulate a LAN-A switch outage.',
      actionHint: 'Network & Redundancy → Toggle PRP/HSR & test link diagnostic drawer.',
      targetTab: 'NETWORK',
    },
    quizQuestions: [
      {
        question: 'What is the worst-case network recovery time of IEC 62439-3 PRP or HSR during a single fiber link break?',
        options: ['50 ms', '15 ms', '0 ms (bumpless zero recovery time)', '2000 ms'],
        correctIndex: 2,
        explanationEn: 'Because every frame is transmitted simultaneously over two independent paths, the receiver simply uses the surviving path with 0 ms recovery time.',
        explanationTe: 'రెండు మార్గాల్లో ఒకేసారి ప్యాకెట్లు వెళ్తాయి కాబట్టి ఒక కేబుల్ కట్ అయినా 0 ms (Zero Recovery Time) తో పనిచేస్తుంది.',
      },
    ],
    interviewQuestions: [
      {
        q: 'Why is SNTP insufficient for IEC 61850 Sampled Values and high-precision SOE compared to IEEE 1588v2 PTP?',
        aEn: 'SNTP provides millisecond accuracy (~1–10 ms), whereas IEEE 1588v2 PTP with hardware timestamping and Transparent/Boundary Clocks (IEC/IEEE 61850-9-3 Power Profile) achieves sub-microsecond (< 1 µs) synchronization required for synchrophasors and SV.',
        aTe: 'SNTP కేవలం ~1–10 ms ఖచ్చితత్వాన్ని మాత్రమే ఇస్తుంది. కానీ IEEE 1588v2 PTP (Power Profile) హార్డ్‌వేర్ టైమ్‌స్టాంపింగ్ ద్వారా 1 మైక్రోసెకను (< 1 µs) కంటే మెరుగైన ఖచ్చితత్వాన్ని ఇస్తుంది.',
      },
    ],
  },
  {
    id: 'MOD-07-PROTOCOLS',
    moduleNumber: 7,
    title: 'Industrial Communication Protocols for Substation Automation (MMS, GOOSE, Modbus TCP, IEC-104, OPC UA, PTP/SNTP)',
    level: 'Advanced',
    summaryEn:
      'Complete Beginner, Intermediate, and Advanced engineering guide to all six protocols in this 132/33/11 kV substation: IEC 61850 MMS (TCP/102), IEC 61850 GOOSE (0x88B8), Modbus TCP (TCP/502), IEC 60870-5-104 (TCP/2404), OPC UA (TCP/4840), and SNTP/PTP Time Sync.',
    summaryTe:
      'ఈ 132/33/11 kV సబ్‌స్టేషన్‌లో ఉపయోగించే 6 ప్రధాన ప్రోటోకాల్స్ (IEC 61850 MMS, GOOSE, Modbus TCP, IEC-104, OPC UA, మరియు SNTP/PTP టైమ్ సింక్రొనైజేషన్) యొక్క పూర్తి వివరణ (Beginner, Intermediate & Advanced స్థాయిలలో).',
    keyConcepts: [
      {
        heading: '1. Beginner Level — What, Why & Where Each Protocol is Used',
        explanationEn:
          '• IEC 61850 MMS (TCP Port 102): Client/Server protocol between Bay IEDs (MMS Servers) and SCADA Server A (MMS Client) for BRCB/URCB reporting, measurements, and SBO breaker control.\n• IEC 61850 GOOSE (EtherType 0x88B8): High-speed (< 3 ms) Layer-2 Ethernet multicast between IEDs for protection trips (PTRC), breaker failure (50BF), and bay interlocking (CILO).\n• Modbus TCP (TCP Port 502): Client/Server register polling between 33/11 kV Feeder Energy Meters (Servers, Unit ID 1–14) and the Station Gateway / SCADA.\n• IEC 60870-5-104 (TCP Port 2404): Wide-area telecontrol protocol linking the Station Gateway (Controlled Station, COA=132) to the Remote Control Center (SLDC / RCC Controlling Station).\n• OPC UA (opc.tcp://10.132.10.200:4840): Secure architecture linking SCADA Server A (OPC UA Server) to the Enterprise Historian & Analytics engine.\n• SNTP / NTP / PTP (UDP/123 & L2 0x88F7): Distributes GPS/GLONASS time from the Meinberg LANTIME M400 Grandmaster to all IEDs and switches.',
        explanationTe:
          '• IEC 61850 MMS (TCP Port 102): IEDs మరియు SCADA Server మధ్య రిపోర్టింగ్ (BRCB/URCB) మరియు బ్రేకర్ కంట్రోల్ (SBO) కోసం ఉపయోగిస్తారు.\n• IEC 61850 GOOSE (EtherType 0x88B8): ఒక IED నుండి మరొక IED కి అత్యంత వేగంగా (< 3 ms) ప్రొటెక్షన్ ట్రిప్ మరియు ఇంటర్‌లాకింగ్ సంకేతాలను Layer-2 Multicast ద్వారా పంపడానికి ఉపయోగిస్తారు.\n• Modbus TCP (TCP Port 502): 33/11 kV ఫీడర్ ఎనర్జీ మీటర్ల నుండి వోల్టేజ్, కరెంట్, MW, MWh రిజిస్టర్లను రీడ్ చేయడానికి ఉపయోగిస్తారు.\n• IEC 60870-5-104 (TCP Port 2404): సబ్‌స్టేషన్ గేట్‌వే (COA 132) నుండి రిమోట్ కంట్రోల్ సెంటర్ (RCC / SLDC) కి డేటా మరియు కమాండ్లను పంపడానికి ఉపయోగిస్తారు.\n• OPC UA (TCP Port 4840): SCADA సర్వర్ నుండి హిస్టోరియన్ (Historian) కి సురక్షితంగా డేటా పంపడానికి ఉపయోగిస్తారు.',
        technicalTakeaway: 'Each protocol serves a specific tier: Process/Bay (GOOSE), Station Bus (MMS, Modbus TCP, PTP/SNTP), WAN Telecontrol (IEC-104), and Enterprise Historian (OPC UA).',
      },
      {
        heading: '2. Intermediate Level — Roles, Packet Flow & Configuration Parameters',
        explanationEn:
          '• MMS Flow: SCADA Client opens TCP:102 ISO COTP association → enables BRCB (RptEna=TRUE) → triggers General Interrogation (GI) → receives spontaneous InformationReports.\n• GOOSE Flow: Publisher IED multicasts Layer-2 802.1Q VLAN 20 frames (01-0C-CD-01-00-xx); on state change, stNum increments, sqNum resets to 0, and MinTime (4 ms) burst retransmission starts.\n• Modbus TCP Flow: Client sends 7-byte MBAP Header + 5-byte PDU (FC 03/04, Start Register, Word Count) → Meter replies with raw 16/32-bit registers scaled to engineering units.\n• IEC-104 Flow: RCC sends STARTDT ACT (U-Frame) → Gateway replies STARTDT CON → I-Frames carry ASDUs (TypeID 31 M_DP_TB_1 for breaker pos, TypeID 36 M_ME_TF_1 for MW, TypeID 46 C_DC_NA_1 for commands) identified by COA=132 and IOA.\n• OPC UA Flow: Client validates X.509v3 certificate → opens SecureChannel & Session → browses Namespace ns=2 → creates Subscription & MonitoredItems for DataChange callbacks.',
        explanationTe:
          '• MMS లో TCP Port 102 ద్వారా అసోసియేషన్ ఏర్పడి BRCB/URCB రిపోర్టులు వస్తాయి.\n• GOOSE లో స్టేట్ మారినప్పుడు stNum పెరుగుతుంది మరియు sqNum=0 అవుతుంది.\n• Modbus TCP లో MBAP హెడర్ మరియు Function Codes 03/04 ద్వారా రిజిస్టర్ రీడింగ్ జరుగుతుంది.\n• IEC-104 లో STARTDT ACT/CON తర్వాత I-Frames ద్వారా IOA డేటా RCC కి చేరుతుంది.\n• OPC UA లో X.509 సర్టిఫికేట్ తనిఖీ తర్వాత MonitoredItems ద్వారా హిస్టోరియన్ అప్‌డేట్ అవుతుంది.',
        technicalTakeaway: 'Never confuse Layer-2 GOOSE multicast (0x88B8) with TCP/IP client-server protocols (MMS 102, Modbus 502, IEC-104 2404, OPC UA 4840).',
      },
      {
        heading: '3. Advanced Level — Cross-Protocol Translation, Troubleshooting & FAT/SAT',
        explanationEn:
          '• End-to-End Trace: Field 52a/52b Contact → IED DI Ch.1 → XCBR1.Pos.stVal → IEC 61850 MMS (TCP/102) → SCADA / Station Gateway → IEC-104 IOA 1001 (TypeID 31, TCP/2404) → RCC HMI (and OPC UA ns=2 NodeId → Historian).\n• Troubleshooting Checklist:\n  1. MMS Disconnected: Check IP reachability, TCP Port 102, OSI-AP-Title, and BRCB RptEna state.\n  2. GOOSE Not Received: Check switch VLAN 20 trunking, Multicast MAC, APPID, confRev, and TAL expiration.\n  3. Modbus Exception 0x02: Check 0-based vs 1-based register offset and Unit ID.\n  4. IEC-104 No Data: Check STARTDT CON state, COA=132 match, and IOA mapping table.\n  5. OPC UA BadSecurityChecksFailed: Trust the X.509v3 certificate on both client and server.',
        explanationTe:
          '• బ్రేకర్ స్టేటస్ IED నుండి IEC 61850 MMS ద్వారా గేట్‌వేకి చేరి, అక్కడి నుండి IEC-104 IOA 1001 గా RCC కి మరియు OPC UA NodeId గా హిస్టోరియన్‌కి వెళ్తుంది.\n• ఏదైనా కమ్యూనికేషన్ ఫాల్ట్ వచ్చినప్పుడు Port నంబర్ (102, 502, 2404, 4840), VLAN 20, COA=132, మరియు X.509 సర్టిఫికేట్లను తనిఖీ చేయాలి.',
        technicalTakeaway: 'During FAT/SAT, always verify end-to-end timestamp preservation (CP56Time2a in IEC-104 and SourceTimestamp in OPC UA) from the originating IED.',
      },
    ],
    interactiveExercise: {
      prompt: 'Open Modbus TCP Lab (Port 502), IEC-104 Lab (Port 2404), and OPC UA Lab (Port 4840) to test live register polling, RCC remote breaker commands, and Historian subscriptions.',
      actionHint: 'Sidebar → Modbus TCP Lab / IEC-104 Lab / OPC UA Lab',
      targetTab: 'IEC104_LAB',
    },
    quizQuestions: [
      {
        question: 'Which protocol and port are used between the Station Gateway (COA 132) and the Remote Control Center (RCC / SLDC)?',
        options: [
          'IEC 61850 GOOSE (EtherType 0x88B8)',
          'IEC 60870-5-104 (TCP Port 2404)',
          'Modbus TCP (TCP Port 502)',
          'OPC UA (TCP Port 4840)',
        ],
        correctIndex: 1,
        explanationEn: 'IEC 60870-5-104 over TCP Port 2404 is the standard wide-area telecontrol protocol connecting the Station Gateway to the RCC.',
        explanationTe: 'సబ్‌స్టేషన్ గేట్‌వే (COA 132) మరియు RCC మధ్య IEC 60870-5-104 (TCP Port 2404) ఉపయోగిస్తారు.',
      },
      {
        question: 'Why is IEC 61850 GOOSE (0x88B8) mapped directly onto Layer-2 Ethernet rather than TCP/IP?',
        options: [
          'To achieve deterministic sub-3 ms protection trip delivery without TCP handshake/acknowledgment overhead',
          'To poll energy meter holding registers',
          'To encrypt historian databases',
          'To synchronize GPS satellites',
        ],
        correctIndex: 0,
        explanationEn: 'GOOSE bypasses TCP/IP network/transport layers and uses IEEE 802.1Q Priority 4 multicast to deliver protection trips in under 3–4 ms.',
        explanationTe: 'TCP/IP ఆలస్యం లేకుండా 3–4 ms లోపు ప్రొటెక్షన్ ట్రిప్ సంకేతాలను పంపడానికి GOOSE నేరుగా Layer-2 Ethernet పై పనిచేస్తుంది.',
      },
    ],
    interviewQuestions: [
      {
        q: 'Explain the complete path of a 132 kV breaker status change from the switchyard to both the local SCADA HMI and the Remote Control Center (RCC).',
        aEn: 'The 52a/52b auxiliary contacts wire to the bay IED DI card (debounced & PTP-timestamped). The IED maps the double-point status to XCBR1.Pos.stVal [ST, DPC] and transmits it via IEC 61850 MMS (TCP/102 BRCB) to SCADA Server A and the Station Gateway (and via Layer-2 GOOSE 0x88B8 to peer IEDs). The Station Gateway translates XCBR1.Pos.stVal to IEC 60870-5-104 TypeID 31 (M_DP_TB_1, COA=132, IOA=1001) and transmits a spontaneous I-Frame (COT=3) over TCP Port 2404 to the RCC, while SCADA Server A exposes the tag via OPC UA (opc.tcp://10.132.10.200:4840) to the Historian.',
        aTe: 'బ్రేకర్ 52a/52b కాంటాక్ట్‌లు IED DI కార్డుకు వెళ్తాయి. IED దానిని XCBR1.Pos.stVal గా మార్చి IEC 61850 MMS (TCP/102) ద్వారా SCADA మరియు గేట్‌వేకి పంపుతుంది. గేట్‌వే దానిని IEC-104 IOA 1001 (TypeID 31) గా మార్చి TCP Port 2404 ద్వారా RCC కి పంపుతుంది, మరియు SCADA సర్వర్ OPC UA (Port 4840) ద్వారా హిస్టోరియన్‌కి అందిస్తుంది.',
      },
    ],
  },
];


for (const m of LEARNING_MODULES as any[]) {
  m.titleTelugu = m.titleTelugu || m.title;
  m.englishSummary = m.englishSummary || m.summaryEn;
  m.teluguSummary = m.teluguSummary || m.summaryTe;
  m.quiz =
    m.quiz ||
    (m.quizQuestions || []).map((q: any) => ({
      ...q,
      explanation: q.explanation || q.explanationEn,
    }));
}
