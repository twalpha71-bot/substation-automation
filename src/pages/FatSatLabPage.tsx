import React, { useEffect, useState } from 'react';
import { BookOpen, ChevronDown, ClipboardCheck, ShieldCheck, CheckCircle2 } from 'lucide-react';

type Step = { title: string; why: string; actions: string[]; evidence: string };
type Phase = { title: string; description: string; steps: Step[] };

type Practical = { example: string; tools: string; procedure: string; expected: string };
const practical: Practical[] = [
  {
    "example": "132/33 kV substation: two power transformers, 33 kV feeders, bus coupler, protection IEDs, station SCADA and RCC gateway.",
    "tools": "Approved SLD, architecture drawings, signal list, vendor manuals, document register.",
    "procedure": "Cross-check the bay count and equipment IDs on SLD against IED list; identify missing feeder or control-centre interface; log revision mismatches.",
    "expected": "Every in-scope bay, IED and interface is traceable to an approved drawing and test case."
  },
  {
    "example": "33 kV feeder breaker position originates at a bay IED and is required on both HMI and RCC.",
    "tools": "SCL viewer, PACiS SCE or project SCADA database tool, spreadsheet mapping register.",
    "procedure": "Locate XCBR.Pos.stVal, quality and timestamp; confirm DataSet/RCB; trace SCADA tag and IEC 104 IOA; verify status semantics and analog engineering units.",
    "expected": "One unique source and destination mapping exists per point, with documented quality, units and control semantics."
  },
  {
    "example": "Factory setup has two test IEDs, engineering laptop, managed switch and simulated breaker contacts.",
    "tools": "Vendor relay configuration tool, IEC 61850 browser, test switch, approved FAT checklist.",
    "procedure": "Record preconditions and test stimuli; isolate physical trip/close outputs; assign witness and evidence fields; perform a dry-run of the test plan.",
    "expected": "Every procedure states stimulus, expected indication, pass/fail criterion, safety condition and record location."
  },
  {
    "example": "An SCD revision is updated just before FAT; all devices must be checked against that revision.",
    "tools": "PACiS SCE, DIGSI, PCM600, EnerVista or device-specific engineering tools; version register.",
    "procedure": "Export/backup the approved IED and SCADA projects; compare firmware, CID/SCD revisions, IP and VLAN assignments; label the baseline.",
    "expected": "Restorable configuration backups and a consistent approved version baseline are available."
  },
  {
    "example": "33 kV bay control panel arrives with an IED, DC supply, terminal blocks and labelled contacts.",
    "tools": "Approved wiring diagram, multimeter used by authorized personnel, inspection checklist.",
    "procedure": "Inspect label/terminal correspondence; check wiring continuity with circuits safely isolated; energize via approved sequence; review relay self-diagnostics.",
    "expected": "No unresolved safety-critical wiring, power or self-diagnostic defects before functional FAT."
  },
  {
    "example": "Station SCADA server connects to feeder IEDs on station LAN; redundant LANs may be provided.",
    "tools": "Managed-switch diagnostics, ping, Wireshark, IEDScout, vendor communication logs.",
    "procedure": "Verify port link and VLAN; test MMS association on TCP 102; check configured IEC 104 connection separately; inspect PRP/HSR health if installed.",
    "expected": "Required sessions establish and recover; network redundancy works within approved acceptance limits."
  },
  {
    "example": "Feeder IED XCBR.Pos changes from Open to Closed using simulated contact inputs.",
    "tools": "IEDScout or IEC 61850 client, PACiS SCE/SCADA tag browser, Wireshark.",
    "procedure": "Confirm source stVal/q/t; trigger a safe simulated input; inspect RCB report and SCADA tag; repeat for both states and invalid quality.",
    "expected": "SCADA receives correct value and quality with acceptable update and timestamp behavior per project specification."
  },
  {
    "example": "Protection IED publishes an interlock permissive to a bay controller via GOOSE.",
    "tools": "Vendor IEC 61850 engineering tool, SCD viewer, Wireshark GOOSE filter.",
    "procedure": "Check GoCB/DataSet, APPID, VLAN and confRev; simulate publisher state; inspect stNum/sqNum; verify subscriber ExtRef and safe logic response.",
    "expected": "Subscriber receives intended data and supervision flags mismatched/lost communication; no unintended trip."
  },
  {
    "example": "33 kV feeder breaker Open/Closed, Local/Remote and current measurement appear on HMI.",
    "tools": "SCADA engineering tool, HMI runtime, approved analog/binary simulator.",
    "procedure": "Stimulate each source point; compare IED and HMI; test invalid quality and stale value display; check analog scaling and units.",
    "expected": "SLD symbols and analog values match the simulated source within project-approved tolerance."
  },
  {
    "example": "Transformer alarm and feeder trip are injected as two controlled events.",
    "tools": "SCADA alarm viewer, SOE export, IED event log, NTP/SNTP status tool.",
    "procedure": "Generate alarms in known sequence; inspect priorities and acknowledgement; compare source event time and HMI time; return alarms to normal.",
    "expected": "Alarm lifecycle, severity and SOE order match the approved alarm matrix and clock accuracy limits."
  },
  {
    "example": "Remote Close requested on a feeder while earthing switch permissive is not satisfied.",
    "tools": "HMI command dialog, IED control diagnostic logs, interlocking matrix, approved test simulator.",
    "procedure": "Verify control authority and Local/Remote; simulate unsafe condition and confirm rejection; restore safe approved conditions and test control feedback only in isolated setup.",
    "expected": "Unsafe Close is rejected; permitted command sequence gives correct confirmation and independent position feedback."
  },
  {
    "example": "Feeder position is forwarded from station gateway to RCC using IEC 104.",
    "tools": "Gateway engineering tool, IEC 104 test client, SCADA point list, network capture.",
    "procedure": "Confirm IOA/Type ID/COT mapping; perform approved GI; change source indication; compare gateway and RCC values; test authorized server/gateway recovery.",
    "expected": "RCC status, quality and timestamps agree with source; defined redundancy and recovery criteria are met."
  },
  {
    "example": "Three FAT defects remain: one wrong alarm priority, one analog scaling error, one missing HMI label.",
    "tools": "FAT punch-list spreadsheet, test evidence archive, configuration change log.",
    "procedure": "Assign defect IDs and severity; correct under revision control; retest each failed case plus dependent functions; obtain witness acceptance.",
    "expected": "All blocking defects closed or formally accepted as exceptions; signed FAT release is traceable."
  },
  {
    "example": "Installed panel at site differs from FAT network drawing: fibre patch port has changed.",
    "tools": "As-built wiring/network drawings, switch port diagnostics, SAT readiness checklist.",
    "procedure": "Confirm site permits; inspect installation and fibre routes; compare installed IP/VLAN/firmware and configurations with FAT baseline.",
    "expected": "Site installation and engineering revisions are approved and safe for energization/testing."
  },
  {
    "example": "Actual 33 kV feeder breaker auxiliary contacts must reach IED, SCADA and RCC.",
    "tools": "Field test sheets, approved secondary injection/contact test arrangement, IED browser, HMI, gateway logs.",
    "procedure": "Under authorized switching/test isolation, verify each field contact and analog source; follow value through IED→HMI→gateway→RCC.",
    "expected": "Every tested field point matches approved indication and engineering units end-to-end."
  },
  {
    "example": "Station operator tests remote control, while one PRP path is temporarily unavailable.",
    "tools": "Approved switching permit, interlock matrix, HMI logs, PRP diagnostics, time-sync monitoring.",
    "procedure": "Verify authority and safety boundaries; conduct supervised control checks; perform authorized single-path recovery and time-sync checks; restore normal topology.",
    "expected": "Control interlocks remain effective; communications recover without violating defined acceptance limits."
  },
  {
    "example": "SAT handover includes approved SCD, CID, SCADA backup, point list and punch-list closure.",
    "tools": "Document control system, FAT/SAT signed reports, engineering backup archive.",
    "procedure": "Resolve or formally accept defects; export final configuration; record versions; deliver operations training and handover checklist.",
    "expected": "Customer receives signed SAT results, as-built pack, recoverable backups and outstanding-issue register."
  },
  {
    "example": "After energization, a switch port intermittently flaps and causes a SCADA communication alarm.",
    "tools": "SNMP monitoring, switch logs, alarm/SOE history, controlled change register.",
    "procedure": "Trend port alarms; correlate events with communication loss; diagnose under maintenance authorization; update documentation and regression-test changes.",
    "expected": "Stabilization issues are logged, corrective actions verified and the final archive updated."
  }
];

const phases: Phase[] = [
  { title: 'Phase 1 — Engineering Preparation (Before FAT)', description: 'Factory testing start అయ్యే ముందు approved design, IED configuration, signal list and test plan ready చేస్తాం.', steps: [
    { title: '1. Project scope and approved documents review', why: 'ఏ equipment, signals, controls, interfaces test చేయాలో ముందుగా establish చేయాలి.', actions: ['Approved SLD, architecture, control philosophy, interlocking scheme, I/O list, alarm list, network diagram collect చేయండి.', 'IED list, relay model/firmware, SCADA/HMI, gateway, time server and switch details verify చేయండి.', 'FAT scope, exclusions, customer acceptance requirements and responsible engineers agree చేయండి.'], evidence: 'Approved document register, revision list, FAT scope and test matrix' },
    { title: '2. Prepare signal and protocol mapping', why: 'Source-to-destination mapping clear లేకపోతే test result reliable కాదు.', actions: ['Each status, analog, alarm, event and command కు unique tag and source reference identify చేయండి.', 'IEC 61850 LN/DO/DA, DataSet, RCB, GOOSE subscription and IEC 104/Modbus mappings check చేయండి.', 'Scaling, units, quality, timestamp, command type and alarm priority define చేయండి.'], evidence: 'Signed signal list, point mapping sheets and protocol interface matrix' },
    { title: '3. Prepare FAT procedure and safe test setup', why: 'Test ఎలా run చేయాలి, expected result ఏమిటి అన్నది beforehand documented ఉండాలి.', actions: ['Every test కు preconditions, input stimulus, expected result, pass/fail criteria, evidence fields prepare చేయండి.', 'Lab network, IED power supplies, isolated test contacts and simulation equipment arrange చేయండి.', 'No unintended trip/close: live outputs isolate చేసి approved test permissions confirm చేయండి.'], evidence: 'FAT procedure, test equipment list, safety checklist and test readiness approval' },
    { title: '4. Backup and baseline configuration', why: 'Testing లో change అయితే original state restore చేయగలగాలి.', actions: ['IED settings, SCL files, SCADA database, HMI project, gateway and switch configuration backup తీసుకోండి.', 'Firmware, IP addresses, VLANs, application versions and checksums/revisions record చేయండి.', 'Time synchronization source and network topology baseline verify చేయండి.'], evidence: 'Configuration backup index and baseline revision record' }
  ]},
  { title: 'Phase 2 — Factory Acceptance Testing (FAT)', description: 'Factory/lab environment లో engineered functions customer-approved test cases ప్రకారం verify చేస్తాం.', steps: [
    { title: '5. Visual, wiring and power-up checks', why: 'Basic hardware faults వల్ల subsequent tests fail కాకుండా చూడాలి.', actions: ['Panel labels, terminal drawings, power supply polarity, fuses and earthing inspect చేయండి.', 'Authorized lab power-up తరువాత IED healthy LEDs, diagnostics and self-test alarms check చేయండి.', 'Physical I/O simulation wiring against approved drawings verify చేయండి.'], evidence: 'Inspection checklist, punch list and equipment health screenshots' },
    { title: '6. Network and IED communication checks', why: 'Communication healthy ఉంటేనే SCADA and protection integration tests meaningful అవుతాయి.', actions: ['IP/subnet/VLAN, switch ports, fibre links and permitted management connectivity verify చేయండి.', 'IEC 61850 MMS association/TCP 102, IEC 104/TCP 2404 or other required protocol test చేయండి.', 'PRP/HSR topology, redundant paths and alarms approved test procedure ప్రకారం verify చేయండి.'], evidence: 'Connectivity logs, switch diagnostics and packet captures' },
    { title: '7. IED data model and MMS reporting test', why: 'IED లోని correct value SCADA కి quality/timestamp తో చేరాలి.', actions: ['IEC 61850 object references, DataSets and Report Control Blocks review చేయండి.', 'Approved simulated binary/analog changes generate చేసి reports verify చేయండి.', 'SCADA source value, quality, trigger and General Interrogation/report behavior compare చేయండి.'], evidence: 'IED browser snapshots, MMS captures and point-by-point report sheet' },
    { title: '8. GOOSE publisher/subscriber functional test', why: 'Fast IED-to-IED exchange correct mapping and logic తో పని చేయాలి.', actions: ['Publisher DataSet, GoCB, APPID, VLAN, confRev and subscriber ExtRef verify చేయండి.', 'Isolated test stimulus ఇచ్చి GOOSE state change and subscriber input verify చేయండి.', 'Communication loss/invalid quality response test చేయండి; actual trip outputs safe isolation లో ఉండాలి.'], evidence: 'GOOSE capture, subscription diagnostics and signed test results' },
    { title: '9. SCADA status, analog and HMI tests', why: 'Operator display physical/source condition ని accurately represent చేయాలి.', actions: ['Breaker Open/Closed, isolator, earth switch, Local/Remote status simulate చేసి HMI verify చేయండి.', 'Analog values, engineering units, CT/PT ratios, scaling and limits check చేయండి.', 'Single-line diagram colours, indication quality, stale data and invalid status handling verify చేయండి.'], evidence: 'Signal checklist, screenshots and analog injection records' },
    { title: '10. Alarm, event and SOE tests', why: 'Fault indication and sequence of events correct order లో record కావాలి.', actions: ['Alarm priority, annunciation, ACK behavior and alarm return-to-normal verify చేయండి.', 'IED and SCADA time source, time quality, event timestamp and time-zone display compare చేయండి.', 'Multiple controlled events generate చేసి SOE order and exported logs verify చేయండి.'], evidence: 'Alarm matrix, SOE log and time synchronization test sheet' },
    { title: '11. Remote control and interlocking tests', why: 'Commands authorized conditions లో మాత్రమే operate కావాలి.', actions: ['Approved isolated setup లో Local/Remote, authority, Select-Before-Operate/Direct Operate behavior verify చేయండి.', 'Breaker close/open feedback and positive/negative command confirmations test చేయండి.', 'Interlocks, synchrocheck and permissive failures safe test simulation ద్వారా verify చేయండి; bypass చేయవద్దు.'], evidence: 'Control test sheets, interlock matrix and rejection/feedback logs' },
    { title: '12. Gateway, RCC and redundancy integration', why: 'Station-level data remote control centre కి correct addresses and quality తో చేరాలి.', actions: ['IEC 61850 to IEC 104 or required protocol mapping, IOA, Type ID, COT and quality verify చేయండి.', 'Approved gateway failover/server redundancy test చేసి continuity and alarm behavior observe చేయండి.', 'Recovery, restart and re-subscription behavior verify చేసి final regression tests run చేయండి.'], evidence: 'Gateway mapping report, failover logs and regression checklist' },
    { title: '13. FAT defect closure and factory sign-off', why: 'Open defects documented లేకుండా factory acceptance complete అని చెప్పకూడదు.', actions: ['Every failure కు defect ID, severity, root cause, owner and corrective action log చేయండి.', 'Approved changes తరువాత affected test and related regression tests repeat చేయండి.', 'Customer witness results, exceptions, as-built revisions and FAT sign-off record చేయండి.'], evidence: 'FAT report, signed test sheets, punch list and release-for-shipment record' }
  ]},
  { title: 'Phase 3 — Site Acceptance Testing (SAT)', description: 'Site లో installed equipment, actual field wiring, communications and operational interfaces verify చేస్తాం.', steps: [
    { title: '14. Site readiness and installation inspection', why: 'Factory pass అయిన system site wiring/environment వల్ల fail కావచ్చు.', actions: ['Permits, switching restrictions, approved method statements and isolation boundaries confirm చేయండి.', 'Panel installation, terminal wiring, fibre patching, network links, labels and earthing check చేయండి.', 'Site hardware and software revisions FAT-approved baseline తో compare చేయండి.'], evidence: 'SAT readiness checklist, installation inspection and configuration comparison' },
    { title: '15. Field I/O and end-to-end indication checks', why: 'Actual contacts నుంచి HMI/RCC వరకు signal chain correct గా ఉందో prove చేయాలి.', actions: ['Authorized field test points నుంచి breaker/isolator status and alarms verify చేయండి.', 'IED, SCADA, HMI and gateway/RCC indication ను same event కి compare చేయండి.', 'Analog transducer/measurement scaling, phase identification and time stamps validate చేయండి.'], evidence: 'Point-to-point field checklist, end-to-end evidence and deviations' },
    { title: '16. Site control, interlocks and communications recovery', why: 'Operational safety and resilience site conditions లో verify చేయాలి.', actions: ['Approved commissioning procedure ప్రకారం remote control and Local/Remote tests perform చేయండి.', 'Interlocks, protection interface and breaker feedback verify చేయండి; unsafe operation చేయవద్దు.', 'Authorized PRP/HSR, server/gateway failover, loss/recovery and SOE tests execute చేయండి.'], evidence: 'Witnessed SAT control sheets, network logs and approved recovery records' },
    { title: '17. SAT punch-list closure and handover', why: 'Operational team కి validated configuration, documentation and known limitations handover కావాలి.', actions: ['All test results and outstanding deviations classify చేసి corrective action/retest record చేయండి.', 'Final as-built SLD, SCD/CID, signal list, IP plan, backups, licenses and manuals handover చేయండి.', 'Customer/operator training, maintenance procedures and acceptance signatures complete చేయండి.'], evidence: 'SAT report, punch-list closure, as-built document pack and handover certificate' }
  ]},
  { title: 'Phase 4 — After Acceptance', description: 'Commissioning ముగిసిన తరువాత కూడా controlled support and change management అవసరం.', steps: [
    { title: '18. Stabilization, support and future changes', why: 'Operational reliability maintain చేయడానికి follow-up monitoring and documentation అవసరం.', actions: ['Initial operation period లో communications, alarms, SOE and redundancy health monitor చేయండి.', 'Any new engineering change కు authorization, backup, impact review and regression test follow చేయండి.', 'Lessons learned, final backups and maintenance recommendations archive చేయండి.'], evidence: 'Stabilization log, change register and final engineering archive' }
  ]}
];

type LabCase = {
  id: string; title: string; topic: string; objective: string;
  setup: string; expected: string; diagnose: string;
  controls: { key: string; label: string; options: { value: string; label: string }[]; correct: string }[];
};
const labCases: LabCase[] = [
  { id: 'LAB-01', title: 'Breaker Status → SCADA HMI', topic: 'Status / HMI', objective: 'Simulated XCBR.Pos.stVal should match the SCADA indication with valid quality.', setup: 'Feeder IED sends an MMS report for XCBR.Pos. Operator expects breaker CLOSED.', expected: 'Source CLOSED, MMS report enabled, SCADA mapping correct, quality GOOD.', diagnose: 'Compare source XCBR.Pos, RCB enablement, quality and HMI tag mapping.', controls: [
    {key:'position',label:'IED breaker contact',correct:'closed',options:[{value:'open',label:'OPEN'},{value:'closed',label:'CLOSED'}]},
    {key:'report',label:'MMS Report Control Block',correct:'enabled',options:[{value:'disabled',label:'Disabled'},{value:'enabled',label:'Enabled'}]},
    {key:'mapping',label:'SCADA tag mapping',correct:'correct',options:[{value:'wrong',label:'Wrong tag'},{value:'correct',label:'Correct XCBR.Pos'}]},
    {key:'quality',label:'Data quality',correct:'good',options:[{value:'invalid',label:'INVALID'},{value:'good',label:'GOOD'}]}
  ]},
  { id:'LAB-02',title:'GOOSE Publisher → Subscriber',topic:'GOOSE',objective:'Subscriber accepts publisher dataset and updates the permissive input.',setup:'Protection IED publishes a simulated interlock permissive to bay controller.',expected:'GOOSE enabled, VLAN 100, confRev matched, subscriber ExtRef correct.',diagnose:'Check VLAN, APPID, confRev, dataset order, ExtRef and subscriber supervision.',controls:[
    {key:'publish',label:'GOOSE publisher',correct:'on',options:[{value:'off',label:'Disabled'},{value:'on',label:'Enabled'}]},
    {key:'vlan',label:'Subscriber VLAN',correct:'100',options:[{value:'200',label:'200 (mismatch)'},{value:'100',label:'100 (match)'}]},
    {key:'revision',label:'GOOSE confRev',correct:'match',options:[{value:'mismatch',label:'Mismatch'},{value:'match',label:'Match'}]},
    {key:'extref',label:'Subscriber ExtRef',correct:'mapped',options:[{value:'missing',label:'Not mapped'},{value:'mapped',label:'Mapped'}]}
  ]},
  { id:'LAB-03',title:'MMS Association & Reporting',topic:'MMS',objective:'SCADA client establishes MMS and receives the expected dataset updates.',setup:'IED IP 192.168.10.21; SCADA client uses TCP 102 and an enabled RCB.',expected:'Network reachable, TCP 102 available, MMS service running, RCB enabled.',diagnose:'Ping alone does not prove MMS; check TCP 102, server service, association and RCB.',controls:[
    {key:'network',label:'Station network',correct:'reachable',options:[{value:'down',label:'Disconnected'},{value:'reachable',label:'Reachable'}]},
    {key:'tcp',label:'TCP port 102',correct:'open',options:[{value:'blocked',label:'Blocked'},{value:'open',label:'Open'}]},
    {key:'service',label:'IED MMS service',correct:'on',options:[{value:'off',label:'Stopped'},{value:'on',label:'Running'}]},
    {key:'rcb',label:'SCADA report subscription',correct:'on',options:[{value:'off',label:'Not enabled'},{value:'on',label:'Enabled'}]}
  ]},
  { id:'LAB-04',title:'Remote Close Interlock Check',topic:'Controls',objective:'Verify a safe simulated CLOSE request is permitted only when all interlocks are satisfied.',setup:'Isolated training breaker; no physical output. Earth switch must be OPEN.',expected:'REMOTE selected, earth switch OPEN, permissive TRUE, control sequence valid.',diagnose:'Never bypass interlocks. Check Local/Remote, earthing switch, CILO and control model.',controls:[
    {key:'remote',label:'Local / Remote',correct:'remote',options:[{value:'local',label:'LOCAL'},{value:'remote',label:'REMOTE'}]},
    {key:'earth',label:'Earth switch',correct:'open',options:[{value:'closed',label:'CLOSED (blocks close)'},{value:'open',label:'OPEN'}]},
    {key:'permissive',label:'CILO close permissive',correct:'true',options:[{value:'false',label:'FALSE'},{value:'true',label:'TRUE'}]},
    {key:'control',label:'Control sequence',correct:'valid',options:[{value:'invalid',label:'Invalid select/operate'},{value:'valid',label:'Valid select/operate'}]}
  ]},
  { id:'LAB-05',title:'IEC 104 Gateway → RCC',topic:'Gateway',objective:'Confirm a mapped breaker indication reaches the control centre correctly.',setup:'IEC 61850 XCBR.Pos mapped to an approved IEC 104 IOA in the gateway.',expected:'Gateway online, IOA correct, GI completed, status quality valid.',diagnose:'Check source point, gateway mapping, IOA, Type ID, GI and IEC 104 link.',controls:[
    {key:'gateway',label:'Gateway IEC 104 connection',correct:'up',options:[{value:'down',label:'Disconnected'},{value:'up',label:'Connected'}]},
    {key:'ioa',label:'Information Object Address',correct:'correct',options:[{value:'wrong',label:'Wrong IOA'},{value:'correct',label:'Approved IOA'}]},
    {key:'gi',label:'General Interrogation',correct:'done',options:[{value:'pending',label:'Not completed'},{value:'done',label:'Completed'}]},
    {key:'q',label:'Source quality',correct:'good',options:[{value:'invalid',label:'INVALID'},{value:'good',label:'GOOD'}]}
  ]},
  { id:'LAB-06',title:'PRP LAN A / LAN B Redundancy',topic:'Networking',objective:'Verify redundancy health when one independent PRP path is unavailable.',setup:'Dual-attached IED communicates on independent PRP LAN A and LAN B.',expected:'At least one LAN operational; supervision correctly reports failed path. Both LANs preferred for healthy normal operation.',diagnose:'Inspect both independent LAN links and redundancy supervision. One failed LAN is degraded, not total failure.',controls:[
    {key:'lanA',label:'PRP LAN A',correct:'up',options:[{value:'down',label:'DOWN'},{value:'up',label:'UP'}]},
    {key:'lanB',label:'PRP LAN B',correct:'up',options:[{value:'down',label:'DOWN'},{value:'up',label:'UP'}]},
    {key:'supervision',label:'Redundancy supervision',correct:'on',options:[{value:'off',label:'Disabled'},{value:'on',label:'Enabled'}]}
  ]}
];

type LabLog = { time: string; caseId: string; result: 'PASS' | 'FAIL'; detail: string };
const FatSatInteractiveLab: React.FC = () => {
  const [showGuide, setShowGuide] = useState(false);
  const [selectedId,setSelectedId] = useState(labCases[0].id);
  const [values,setValues] = useState<Record<string,string>>({});
  const [logs,setLogs] = useState<LabLog[]>([]);
  const [feedback,setFeedback] = useState<{pass:boolean; text:string} | null>(null);
  const test = labCases.find(item => item.id === selectedId) ?? labCases[0];
  useEffect(() => {
    if (!showGuide) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setShowGuide(false); };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [showGuide]);
  const changeTest = (id:string) => {setSelectedId(id);setValues({});setFeedback(null);};
  const run = () => {
    const failures = test.controls.filter(c => (values[c.key] ?? c.options[0].value) !== c.correct);
    const prp = test.id === 'LAB-06';
    const a = values.lanA ?? 'down'; const b = values.lanB ?? 'down';
    const supervisor = values.supervision ?? 'off';
    const pass = prp ? (a === 'up' || b === 'up') && supervisor === 'on' : failures.length === 0;
    const detail = prp ? (!pass ? 'Communication unavailable or supervision disabled. Verify LAN A/B and supervision.' : a === 'up' && b === 'up' ? 'Both PRP paths healthy.' : 'Communication available via remaining LAN; redundancy DEGRADED and alarm expected.') : pass ? 'All simulated acceptance conditions satisfied.' : `Check: ${failures.map(c => c.label).join(', ')}.`;
    setFeedback({pass,text:detail});
    setLogs(old => [{time:new Date().toLocaleTimeString(),caseId:test.id,result:(pass?'PASS':'FAIL') as 'PASS' | 'FAIL',detail},...old].slice(0,40));
  };
  const reset = () => {setValues({});setFeedback(null);};
  const exportCsv = () => {
    const csv = [['Time','Test','Result','Evidence'],...logs.map(x=>[x.time,x.caseId,x.result,x.detail])].map(row=>row.map(cell=>'"'+cell.replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='fat-sat-training-evidence.csv';a.click();URL.revokeObjectURL(url);
  };
  return <section className="mt-8 rounded-2xl border border-cyan-700/70 bg-[#091f34] p-4 md:p-7" aria-label="Interactive FAT SAT Practical Lab">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-xl font-extrabold text-cyan-300 md:text-2xl">Interactive FAT / SAT Practical Lab</h2><p className="mt-2 text-sm leading-6 text-slate-300">Choose a test, configure simulated inputs, execute validation and inspect the evidence. No live hardware connection.</p></div><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={() => setShowGuide(true)} aria-haspopup="dialog" className="inline-flex items-center gap-2 rounded-full border border-cyan-400 bg-[#103c54] px-4 py-2 text-sm font-bold text-cyan-100 shadow-lg shadow-cyan-950/30 hover:bg-[#175371] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><BookOpen size={17}/> Lab ఎలా పనిచేస్తుంది? <span className="rounded-full bg-cyan-300 px-2 py-0.5 text-xs text-[#052238]">HOW TO</span></button><span className="rounded-lg border border-emerald-700 bg-[#0b2d2b] px-3 py-2 text-xs font-bold text-emerald-300">TRAINING SIMULATION</span></div></div>
    {showGuide && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 p-3 md:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowGuide(false); }} role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="fat-sat-howto-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-cyan-500 bg-[#071d30] p-5 text-slate-100 shadow-2xl md:p-7">
        <div className="flex items-start justify-between gap-4"><div><div className="text-xs font-bold uppercase tracking-widest text-cyan-400">Interactive lab • User guide</div><h3 id="fat-sat-howto-title" className="mt-2 text-xl font-extrabold text-white md:text-2xl">Lab ఎలా పనిచేస్తుంది? — Step-by-Step</h3><p className="mt-2 text-sm leading-6 text-slate-300">ప్రతి simulated FAT/SAT test ఎలా run చేయాలో ఇక్కడ తెలుసుకోండి.</p></div><button type="button" autoFocus onClick={() => setShowGuide(false)} aria-label="Close lab guide" className="shrink-0 rounded-lg border border-cyan-700 px-3 py-2 font-bold text-cyan-200 hover:bg-[#123a52]">✕</button></div>
        <ol className="mt-5 list-decimal space-y-3 rounded-xl border border-[#23506a] bg-[#0b2b42] p-5 pl-9 text-sm leading-7 text-slate-200">
          <li><strong className="text-white">Select Test:</strong> Left side నుంచి LAB-01 నుంచి LAB-06 వరకు ఏ test అయినా select చేయండి.</li>
          <li><strong className="text-white">Read Objective & Setup:</strong> Test purpose, simulated equipment, expected acceptance criteria చదవండి.</li>
          <li><strong className="text-white">Configure Inputs:</strong> Dropdowns లో breaker status, VLAN, MMS, interlock, gateway లేదా PRP settings select చేయండి. Default values fault conditions చూపించవచ్చు.</li>
          <li><strong className="text-white">Execute Simulated Test:</strong> Button click చేసి PASS లేదా FAIL result, fault reason చూడండి.</li>
          <li><strong className="text-white">Troubleshoot & Retest:</strong> FAIL వస్తే guidance ప్రకారం settings correct చేసి మళ్లీ Execute చేయండి.</li>
          <li><strong className="text-white">Evidence Log:</strong> ప్రతి run result కింద save అవుతుంది. Export CSV తో results download చేసుకోవచ్చు; Reset Inputs current settings reset చేస్తుంది.</li>
        </ol>
        <h4 className="mt-6 text-lg font-bold text-cyan-300">6 Practical Tests — ఏమి check చేయాలి?</h4>
        <div className="mt-3 grid gap-3 md:grid-cols-2">{[
          ['LAB-01 — Breaker Status', 'Breaker input → IED → MMS → SCADA. Correct source status, reporting and HMI mapping select చేయండి.'],
          ['LAB-02 — GOOSE', 'Publisher/Subscriber, VLAN and confRev values match అయ్యేలా configure చేయండి.'],
          ['LAB-03 — MMS', 'Network reachable, TCP 102 open, MMS service running and RCB enabled ఉంచండి.'],
          ['LAB-04 — Remote Close', 'REMOTE mode, earth switch OPEN, CILO permissive TRUE and valid control sequence check చేయండి.'],
          ['LAB-05 — IEC 104 Gateway', 'Gateway connected, correct IOA, GI completed and source quality GOOD verify చేయండి.'],
          ['LAB-06 — PRP Redundancy', 'LAN A/LAN B మరియు supervision test చేయండి. One LAN down అయితే communication PASS అయినా redundancy degraded అని result చూపిస్తుంది.']
        ].map(([name, description]) => <div key={name} className="rounded-lg border border-[#27516a] bg-[#0b2b42] p-3"><strong className="text-sm text-cyan-200">{name}</strong><p className="mt-1 text-sm leading-6 text-slate-300">{description}</p></div>)}</div>
        <p className="mt-5 rounded-lg border border-amber-800 bg-[#2c2415] p-3 text-sm leading-6 text-amber-100"><strong>Safety:</strong> ఇది browser-based simulation మాత్రమే. Live IED, breaker, protection trip outputs కి connect కాదు. Real FAT/SAT testing approved permits, isolation and authorized engineers తోనే చేయాలి.</p>
        <div className="mt-5 flex justify-end"><button type="button" onClick={() => setShowGuide(false)} className="rounded-lg bg-cyan-400 px-5 py-2.5 font-bold text-[#041b2a] hover:bg-cyan-300">Got it — Start Testing</button></div>
      </div>
    </div>}
    <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.7fr)]">
      <nav aria-label="Lab test cases" className="space-y-2">{labCases.map(item=><button type="button" key={item.id} onClick={()=>changeTest(item.id)} className={`w-full rounded-lg border p-3 text-left transition-colors ${selectedId===item.id?'border-cyan-400 bg-[#13425b] text-white':'border-[#23506a] bg-[#0a273b] text-slate-200 hover:bg-[#123a52]'}`}><span className="block text-xs font-bold text-cyan-300">{item.id} · {item.topic}</span><span className="mt-1 block text-sm font-semibold">{item.title}</span></button>)}</nav>
      <div className="rounded-xl border border-[#23506a] bg-[#061728] p-4 md:p-5">
        <h3 className="text-lg font-bold text-white">{test.title}</h3><p className="mt-2 text-sm leading-6 text-slate-300"><strong className="text-cyan-300">Objective:</strong> {test.objective}</p><p className="mt-2 text-sm leading-6 text-slate-300"><strong className="text-cyan-300">Setup:</strong> {test.setup}</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">{test.controls.map(c=><label key={c.key} className="block text-sm font-medium text-slate-200">{c.label}<select value={values[c.key]??c.options[0].value} onChange={e=>{setValues(old=>({...old,[c.key]:e.target.value}));setFeedback(null);}} className="mt-2 w-full rounded-lg border border-cyan-700 bg-[#10344a] p-3 text-white focus:outline-none focus:ring-2 focus:ring-cyan-400">{c.options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select></label>)}</div>
        <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={run} className="rounded-lg bg-cyan-400 px-5 py-3 font-bold text-[#031522] hover:bg-cyan-300">Execute Simulated Test</button><button type="button" onClick={reset} className="rounded-lg border border-cyan-700 px-5 py-3 text-cyan-200 hover:bg-[#123a52]">Reset Inputs</button></div>
        {feedback && <div role="status" className={`mt-4 rounded-lg border p-4 ${feedback.pass?'border-emerald-600 bg-[#0c302b] text-emerald-200':'border-rose-600 bg-[#351e2c] text-rose-200'}`}><strong>{feedback.pass?'PASS':'FAIL'} — Simulated result</strong><p className="mt-1 text-sm leading-6">{feedback.text}</p></div>}
        <div className="mt-5 space-y-2 rounded-lg border border-[#28536b] bg-[#0c2a3f] p-4 text-sm leading-6"><p><strong className="text-cyan-300">Expected acceptance criteria:</strong> {test.expected}</p><p><strong className="text-cyan-300">Troubleshooting guidance:</strong> {test.diagnose}</p></div>
      </div>
    </div>
    <div className="mt-6 rounded-xl border border-[#23506a] bg-[#071727] p-4 md:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-cyan-300">Test Results & Evidence Log ({logs.length})</h3><div className="flex gap-2"><button type="button" disabled={!logs.length} onClick={exportCsv} className="rounded-lg border border-cyan-700 px-3 py-2 text-sm text-cyan-200 disabled:opacity-40">Export CSV</button><button type="button" disabled={!logs.length} onClick={()=>setLogs([])} className="rounded-lg border border-cyan-700 px-3 py-2 text-sm text-cyan-200 disabled:opacity-40">Clear Log</button></div></div>{logs.length?<div className="mt-3 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-sm"><thead className="text-cyan-300"><tr><th className="p-2">Time</th><th className="p-2">Test</th><th className="p-2">Result</th><th className="p-2">Evidence / Diagnostic</th></tr></thead><tbody>{logs.map((log,i)=><tr key={`${log.time}-${i}`} className="border-t border-[#23435a]"><td className="p-2">{log.time}</td><td className="p-2">{log.caseId}</td><td className={`p-2 font-bold ${log.result==='PASS'?'text-emerald-300':'text-rose-300'}`}>{log.result}</td><td className="p-2">{log.detail}</td></tr>)}</tbody></table></div>:<p className="mt-3 text-sm text-slate-400">No tests executed yet. Choose inputs and click Execute Simulated Test.</p>}</div>
  </section>;
};



type SignalStage = { name: string; detail: string; healthy: string; fault: string };
const signalStages: SignalStage[] = [
  {name:'Field Breaker',detail:'52a/52b auxiliary contacts',healthy:'CLOSED contact simulated',fault:'Field contact / wiring mismatch'},
  {name:'Bay IED',detail:'XCBR.Pos.stVal + q + t',healthy:'CLOSED · GOOD quality',fault:'IED input mapping / quality invalid'},
  {name:'IEC 61850 MMS',detail:'DataSet / Report Control Block',healthy:'Report received by SCADA',fault:'RCB disabled / report unavailable'},
  {name:'SCADA / HMI',detail:'Point database + SLD indication',healthy:'Breaker CLOSED on HMI',fault:'Incorrect SCADA tag mapping'},
  {name:'Station Gateway',detail:'IEC 61850 → IEC 104 mapping',healthy:'Correct IOA and status',fault:'Incorrect gateway IOA'},
  {name:'RCC',detail:'IEC 104 indication at control centre',healthy:'CLOSED · GOOD quality',fault:'RCC cannot receive updated status'}
];
type SignalFault = 'none'|'field'|'ied'|'mms'|'scada'|'gateway'|'rcc';
const signalFaults: {value:SignalFault; label:string; help:string}[] = [
  {value:'none',label:'Healthy system (no fault)',help:'All six stages should pass'},
  {value:'field',label:'Field contact / wiring fault',help:'Source breaker status does not reach IED correctly'},
  {value:'ied',label:'IED input mapping / invalid quality',help:'IED data is invalid; downstream indications must not be trusted'},
  {value:'mms',label:'MMS reporting disabled (RCB)',help:'IED has correct value but SCADA receives no new report'},
  {value:'scada',label:'Wrong SCADA tag mapping',help:'MMS value arrives but HMI point does not update'},
  {value:'gateway',label:'Wrong IEC 104 IOA mapping',help:'Local HMI is correct but gateway forwards wrong point'},
  {value:'rcc',label:'RCC communication unavailable',help:'Gateway is correct but RCC has no updated indication'}
];
const faultIndex:Record<SignalFault,number> = {none:-1,field:0,ied:1,mms:2,scada:3,gateway:4,rcc:5};
const SignalEndToEndLab: React.FC = () => {
  const [fault,setFault] = useState<SignalFault>('none');
  const [position,setPosition] = useState<'OPEN'|'CLOSED'>('CLOSED');
  const [visited,setVisited] = useState<number>(-1);
  const [executed,setExecuted] = useState(false);
  const [history,setHistory] = useState<{time:string;position:string;fault:string;result:string;detail:string}[]>([]);
  const [showHelp,setShowHelp] = useState(false);
  const broken = faultIndex[fault];
  const reset = () => {setVisited(-1);setExecuted(false);};
  const inspect = (i:number) => {setVisited(i);setExecuted(true);};
  const run = () => {
    setVisited(5);setExecuted(true);
    const result = broken<0?'PASS':'FAIL';
    const detail = broken<0?'All six stages match the source with valid simulated quality.':`First failure at ${signalStages[broken].name}: ${signalStages[broken].fault}. Downstream indications may be stale or invalid.`;
    setHistory(h=>[{time:new Date().toLocaleString(),position,fault:signalFaults.find(f=>f.value===fault)?.label??fault,result,detail},...h].slice(0,30));
  };
  const exportLog = () => {
    const rows = [['Time','Breaker','Injected fault','Result','Diagnostic'],...history.map(h=>[h.time,h.position,h.fault,h.result,h.detail])];
    const csv = rows.map(row=>row.map(cell=>'"'+String(cell).replace(/"/g,'""')+'"').join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='fat-sat-end-to-end-evidence.csv';a.click();URL.revokeObjectURL(url);
  };
  return <section className="mt-8 rounded-2xl border border-cyan-700/60 bg-[#092137] p-4 md:p-6" aria-label="End-to-end signal testing laboratory">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="text-xs font-bold uppercase tracking-widest text-cyan-400">NEW PRACTICAL MODULE · E2E-01</div><h2 className="mt-2 text-xl font-extrabold text-white md:text-2xl">End-to-End Signal Testing Lab</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">Simulated breaker status journey: Field → IED → MMS → SCADA/HMI → Gateway → RCC. Inject one fault, run the test, identify the first failed stage, then troubleshoot.</p></div>
      <button type="button" onClick={()=>setShowHelp(true)} className="rounded-full border border-cyan-400 bg-[#103e55] px-4 py-2 text-sm font-bold text-cyan-100 hover:bg-[#15546d]">ⓘ How this lab works</button>
    </div>
    {showHelp&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setShowHelp(false)}} role="presentation"><div role="dialog" aria-modal="true" aria-label="End-to-end lab instructions" className="max-h-[85vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-cyan-600 bg-[#0b2439] p-6 text-slate-100"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold text-cyan-300">How to perform E2E testing</h3><button type="button" onClick={()=>setShowHelp(false)} aria-label="Close guide" className="rounded-lg border border-cyan-700 px-3 py-1">✕</button></div><ol className="mt-4 list-decimal space-y-3 pl-6 text-sm leading-7"><li>Select simulated breaker OPEN or CLOSED.</li><li>Choose Healthy or inject one specific fault.</li><li>Click <strong>Run End-to-End Test</strong> to check all six stages.</li><li>Click any stage card to inspect its expected data and status.</li><li>Find the <strong>first failed stage</strong>; later stages are blocked/stale rather than independently failed.</li><li>Change the fault back to Healthy and run again to verify recovery.</li><li>Download the evidence CSV for the simulated test history.</li></ol><p className="mt-4 text-sm text-amber-200">Training only: no physical breaker commands or real network connections.</p><button type="button" onClick={()=>setShowHelp(false)} className="mt-5 rounded-lg bg-cyan-400 px-5 py-2 font-bold text-[#041b2a]">Start Testing</button></div></div>}
    <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-semibold text-slate-200">Simulated breaker position<select value={position} onChange={e=>{setPosition(e.target.value as 'OPEN'|'CLOSED');reset()}} className="mt-2 w-full rounded-lg border border-cyan-700 bg-[#10344a] p-3 text-white"><option value="CLOSED">CLOSED</option><option value="OPEN">OPEN</option></select></label><label className="text-sm font-semibold text-slate-200">Inject a fault<select value={fault} onChange={e=>{setFault(e.target.value as SignalFault);reset()}} className="mt-2 w-full rounded-lg border border-cyan-700 bg-[#10344a] p-3 text-white">{signalFaults.map(f=><option key={f.value} value={f.value}>{f.label}</option>)}</select></label></div>
    <p className="mt-3 text-sm text-cyan-200">{signalFaults.find(f=>f.value===fault)?.help}</p>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{signalStages.map((stage,i)=>{const state=!executed?'READY':broken<0||i<broken?'PASS':i===broken?'FAIL':'BLOCKED';const selected=visited===i;return <button type="button" key={stage.name} onClick={()=>inspect(i)} className={`rounded-xl border p-4 text-left transition ${selected?'ring-2 ring-cyan-400':''} ${state==='PASS'?'border-emerald-600 bg-[#0b302e]':state==='FAIL'?'border-rose-500 bg-[#39212e]':state==='BLOCKED'?'border-amber-700 bg-[#312b20]':'border-[#2b5871] bg-[#0b2b41]'}`}><span className="text-xs font-bold text-cyan-300">STAGE {i+1} / 6</span><span className="mt-1 block font-bold text-white">{stage.name}</span><span className="mt-1 block text-xs text-slate-300">{stage.detail}</span><span className={`mt-3 inline-block rounded-md px-2 py-1 text-xs font-bold ${state==='PASS'?'bg-emerald-900 text-emerald-200':state==='FAIL'?'bg-rose-900 text-rose-200':state==='BLOCKED'?'bg-amber-900 text-amber-200':'bg-[#1a4960] text-cyan-200'}`}>{state}</span></button>})}</div>
    {executed&&visited>=0&&<div role="status" className="mt-4 rounded-xl border border-[#34617b] bg-[#061929] p-4 text-sm leading-7"><strong className="text-cyan-300">Stage inspection — {signalStages[visited].name}</strong><p className="text-slate-200">{broken<0||visited<broken?`${signalStages[visited].healthy}. Source breaker = ${position}.`:visited===broken?`FAULT: ${signalStages[visited].fault}. Check this stage first using engineering mapping, logs and approved test evidence.`:`BLOCKED: Upstream failure at ${signalStages[broken].name}; downstream value may be stale or invalid.`}</p></div>}
    <div className="mt-5 flex flex-wrap gap-3"><button type="button" onClick={run} className="rounded-lg bg-cyan-400 px-5 py-3 font-bold text-[#041b2a] hover:bg-cyan-300">Run End-to-End Test</button><button type="button" onClick={()=>{setFault('none');setPosition('CLOSED');reset()}} className="rounded-lg border border-cyan-700 px-5 py-3 text-cyan-200">Reset Simulation</button></div>
    {executed&&<div className={`mt-4 rounded-xl border p-4 ${broken<0?'border-emerald-600 bg-[#0d302a] text-emerald-200':'border-rose-600 bg-[#34202c] text-rose-200'}`}><strong>{broken<0?'PASS — End-to-end indication verified':'FAIL — End-to-end indication interrupted'}</strong><p className="mt-2 text-sm leading-6">{broken<0?`All six simulated stages deliver ${position} with GOOD quality.`:`First failed stage: ${signalStages[broken].name}. ${signalStages[broken].fault}. Check this stage and repeat the test after correction.`}</p></div>}
    <div className="mt-6 rounded-xl border border-[#2a516a] bg-[#061929] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-cyan-300">End-to-End Evidence Log ({history.length})</h3><div className="flex gap-2"><button type="button" disabled={!history.length} onClick={exportLog} className="rounded-lg border border-cyan-700 px-3 py-2 text-sm disabled:opacity-40">Export CSV</button><button type="button" disabled={!history.length} onClick={()=>setHistory([])} className="rounded-lg border border-cyan-700 px-3 py-2 text-sm disabled:opacity-40">Clear</button></div></div>{history.length?<div className="mt-3 overflow-x-auto"><table className="w-full min-w-[600px] text-left text-xs"><thead><tr className="text-cyan-300"><th className="p-2">Time</th><th className="p-2">Breaker</th><th className="p-2">Injected fault</th><th className="p-2">Result</th><th className="p-2">Diagnostic</th></tr></thead><tbody>{history.map((h,i)=><tr key={i} className="border-t border-[#2a516a]"><td className="p-2">{h.time}</td><td className="p-2">{h.position}</td><td className="p-2">{h.fault}</td><td className="p-2 font-bold">{h.result}</td><td className="p-2">{h.detail}</td></tr>)}</tbody></table></div>:<p className="mt-3 text-sm text-slate-400">Run a test to create evidence.</p>}</div>
  </section>;
};



type BenchDevice = { id: string; name: string; kind: string; ip: string; protocol: string; role: string; vendor: string };
const benchDevices: BenchDevice[] = [
  {id:'ied',name:'Feeder Protection IED',kind:'Protection Relay',ip:'192.168.10.21',protocol:'IEC 61850 MMS / GOOSE',role:'Breaker status, protection events, GOOSE publisher',vendor:'Schneider / Siemens / ABB / GE'},
  {id:'switchA',name:'Station Switch A',kind:'Ethernet Switch',ip:'192.168.10.2',protocol:'Ethernet / VLAN / PRP LAN A',role:'Independent LAN A transport',vendor:'Industrial managed switch'},
  {id:'switchB',name:'Station Switch B',kind:'Ethernet Switch',ip:'192.168.20.2',protocol:'Ethernet / VLAN / PRP LAN B',role:'Independent LAN B transport',vendor:'Industrial managed switch'},
  {id:'laptop',name:'Engineering Workstation',kind:'Engineering PC',ip:'192.168.10.50',protocol:'SCL / IEC 61850 client',role:'Engineering, diagnostics and packet inspection',vendor:'Multi-vendor tools'},
  {id:'scada',name:'SCADA / HMI Server',kind:'Station Server',ip:'192.168.10.100',protocol:'IEC 61850 MMS',role:'IED data acquisition and operator display',vendor:'SCADA software'},
  {id:'gateway',name:'Station Gateway',kind:'Protocol Gateway',ip:'192.168.10.110',protocol:'IEC 61850 / IEC 104',role:'Forward approved points to RCC',vendor:'Station gateway'},
  {id:'rcc',name:'Remote Control Centre',kind:'Remote System',ip:'10.20.0.10',protocol:'IEC 60870-5-104',role:'Remote supervision and authorized commands',vendor:'RCC simulation'},
];
type BenchFault = 'healthy'|'lanA'|'lanB'|'both'|'vlan'|'ied'|'mms'|'gateway';
const benchFaults: {id: BenchFault; title: string; cause: string; guidance: string}[] = [
  {id:'healthy',title:'Healthy network',cause:'No injected fault',guidance:'Verify both PRP paths, MMS reporting and IEC 104 delivery.'},
  {id:'lanA',title:'Disconnect LAN A fibre',cause:'LAN A path unavailable; LAN B remains available',guidance:'Inspect LAN A fibre, switch port and PRP counters. Confirm LAN B carries traffic.'},
  {id:'lanB',title:'Disconnect LAN B fibre',cause:'LAN B path unavailable; LAN A remains available',guidance:'Inspect LAN B fibre, switch port and PRP counters. Confirm LAN A carries traffic.'},
  {id:'both',title:'Disconnect both PRP LANs',cause:'No remaining IED station-bus path',guidance:'Restore at least one independent PRP path and verify IED reachability.'},
  {id:'vlan',title:'GOOSE VLAN mismatch',cause:'Subscriber filters the configured GOOSE VLAN',guidance:'Compare publisher/subscriber VLAN ID, priority, APPID and switch filtering. MMS may remain healthy.'},
  {id:'ied',title:'IED powered off',cause:'Protection IED unavailable',guidance:'Check IED supply, diagnostics and physical link before testing services.'},
  {id:'mms',title:'MMS reporting disabled',cause:'SCADA association may exist, but expected report is absent',guidance:'Verify DataSet, RCB enablement, trigger options, client reservation and SCADA point mapping.'},
  {id:'gateway',title:'Gateway IEC 104 offline',cause:'RCC does not receive station updates',guidance:'Check gateway service, TCP 2404 connectivity, point mapping and remote link.'},
];
type BenchResult = {id:number; test:string; outcome:string; detail:string};
const VirtualFatSatTestBench: React.FC = () => {
  const [fault,setFault] = useState<BenchFault>('healthy');
  const [selected,setSelected] = useState('ied');
  const [vendor,setVendor] = useState('Schneider MiCOM');
  const [help,setHelp] = useState(false);
  const [result,setResult] = useState<BenchResult|null>(null);
  const [history,setHistory] = useState<BenchResult[]>([]);
  const device=benchDevices.find(d=>d.id===selected) ?? benchDevices[0];
  const issue=benchFaults.find(f=>f.id===fault) ?? benchFaults[0];
  const available=fault!=='both'&&fault!=='ied';
  const mms=available&&fault!=='mms';
  const goose=available&&fault!=='vlan';
  const remote=mms&&fault!=='gateway';
  const pathA=!['lanA','both','ied'].includes(fault);
  const pathB=!['lanB','both','ied'].includes(fault);
  const run=(name:string)=>{
    const passed=name==='PRP Path Continuity'?available:name==='MMS Status Report'?mms:name==='GOOSE Subscriber'?goose:remote;
    const detail=name==='PRP Path Continuity'?(passed?'At least one independent PRP LAN is carrying simulated IED traffic.':'Both PRP paths or the IED are unavailable.'):
      name==='MMS Status Report'?(passed?'IED MMS report reaches the SCADA acquisition stage.':'MMS reporting or underlying connectivity is unavailable.'):
      name==='GOOSE Subscriber'?(passed?'Publisher and subscriber configuration is consistent.':'GOOSE subscription is blocked by injected fault or loss of connectivity.'):
      passed?'Gateway IEC 104 delivers station data to RCC.':'End-to-end RCC delivery is blocked by gateway, MMS or network fault.';
    const next={id:Date.now(),test:name,outcome:passed?'PASS':'FAIL',detail};
    setResult(next);setHistory(h=>[next,...h].slice(0,40));
  };
  const exportCsv=()=>{
    const quote=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
    const csv=[['Test','Result','Details'],...history.map(h=>[h.test,h.outcome,h.detail])].map(row=>row.map(quote).join(',')).join('\r\n');
    const blob=new Blob([csv],{type:'text/csv;charset=utf-8'});
    const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='virtual-fat-sat-bench-evidence.csv';a.click();URL.revokeObjectURL(url);
  };
  const tile=(id:string)=>{const d=benchDevices.find(x=>x.id===id)!;const active=selected===id;
    return <button type="button" key={id} onClick={()=>setSelected(id)} className={`min-w-0 rounded-xl border p-3 text-left transition-colors ${active?'border-cyan-300 bg-[#17425a]':'border-[#29516b] bg-[#0b253a] hover:border-cyan-500'}`} aria-pressed={active}>
      <div className="mb-2 flex items-center gap-2"><span className="rounded-md bg-[#173c53] px-2 py-1 text-xs text-cyan-200">{id==='ied'?'IED':id.startsWith('switch')?'SW':id==='laptop'?'ENG':id==='scada'?'HMI':id==='gateway'?'GW':'RCC'}</span><span className="text-xs text-slate-400">{d.kind}</span></div>
      <div className="text-sm font-semibold text-white">{d.name}</div><div className="mt-1 text-xs text-slate-400">{d.ip}</div>
      <div className={`mt-2 text-xs font-bold ${id==='ied'&&!available?'text-red-300':id==='switchA'&&!pathA?'text-red-300':id==='switchB'&&!pathB?'text-red-300':'text-emerald-300'}`}>{id==='ied'&&!available?'OFFLINE':id==='switchA'&&!pathA?'PATH DOWN':id==='switchB'&&!pathB?'PATH DOWN':'SIMULATED ONLINE'}</div>
    </button>};
  return <section className="mt-8 rounded-2xl border border-cyan-700/70 bg-[#091d31] p-4 md:p-6" aria-label="Virtual FAT SAT Test Bench">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold tracking-widest text-cyan-400">INTERACTIVE ENGINEERING SIMULATION</p><h2 className="mt-2 text-xl font-bold text-white md:text-2xl">Virtual FAT / SAT Test Bench</h2><p className="mt-2 text-sm leading-6 text-slate-300">Click equipment, inject a fault, run tests and inspect evidence. Independent PRP LAN A/B paths are simulated.</p></div><button type="button" onClick={()=>setHelp(true)} className="rounded-lg border border-cyan-500 bg-[#113c56] px-4 py-2 text-sm font-semibold text-cyan-100">? How This Lab Works</button></div>
    <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(270px,1fr)]">
      <div className="rounded-xl border border-[#28516b] bg-[#061725] p-4">
        <h3 className="mb-3 font-bold text-cyan-200">Station Network Topology</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{tile('ied')}{tile('laptop')}{tile('scada')}</div>
        <div className="my-3 grid grid-cols-2 gap-3"><div className={`rounded-lg border p-2 text-center text-xs ${pathA?'border-emerald-700 text-emerald-300':'border-red-700 text-red-300'}`}>↕ PRP LAN A — {pathA?'UP':'DOWN'}</div><div className={`rounded-lg border p-2 text-center text-xs ${pathB?'border-emerald-700 text-emerald-300':'border-red-700 text-red-300'}`}>↕ PRP LAN B — {pathB?'UP':'DOWN'}</div></div>
        <div className="grid grid-cols-2 gap-3">{tile('switchA')}{tile('switchB')}</div>
        <div className="my-3 text-center text-xs text-cyan-400">↓ Station data → Gateway → RCC</div>
        <div className="grid grid-cols-2 gap-3">{tile('gateway')}{tile('rcc')}</div>
        <p className="mt-3 text-xs leading-5 text-slate-400">Conceptual topology: actual PRP requires dual-attached nodes and two independent networks; workstation and RCC attachment depend on project design.</p>
      </div>
      <div className="space-y-4"><div className="rounded-xl border border-[#28516b] bg-[#0b253a] p-4"><h3 className="font-bold text-cyan-200">Selected Device Inspector</h3><p className="mt-2 text-base font-semibold">{device.name}</p><p className="mt-2 text-sm text-slate-300"><strong>IP:</strong> {device.ip}</p><p className="mt-1 text-sm text-slate-300"><strong>Protocol:</strong> {device.protocol}</p><p className="mt-1 text-sm text-slate-300"><strong>Role:</strong> {device.role}</p>{selected==='ied'&&<label className="mt-3 block text-sm text-slate-200">IED Vendor (training label)<select className="mt-1 w-full rounded-lg border border-[#3d6781] bg-[#061725] p-2 text-white" value={vendor} onChange={e=>setVendor(e.target.value)}>{['Schneider MiCOM','Siemens SIPROTEC','ABB Relion','GE Multilin'].map(v=><option key={v}>{v}</option>)}</select></label>}</div>
      <div className="rounded-xl border border-[#28516b] bg-[#0b253a] p-4"><h3 className="font-bold text-cyan-200">Fault Injection</h3><label className="mt-2 block text-sm text-slate-200" htmlFor="bench-fault">Choose simulated fault</label><select id="bench-fault" className="mt-2 w-full rounded-lg border border-[#3d6781] bg-[#061725] p-2 text-white" value={fault} onChange={e=>{setFault(e.target.value as BenchFault);setResult(null)}}>{benchFaults.map(f=><option value={f.id} key={f.id}>{f.title}</option>)}</select><p className="mt-3 text-sm leading-6 text-slate-300">{issue.cause}</p><button type="button" className="mt-3 rounded-lg border border-cyan-500 px-3 py-2 text-sm text-cyan-100" onClick={()=>{setFault('healthy');setResult(null)}}>Restore Healthy State</button></div></div>
    </div>
    <div className="mt-4 rounded-xl border border-[#28516b] bg-[#0b253a] p-4"><h3 className="font-bold text-cyan-200">Run FAT / SAT Simulation</h3><div className="mt-3 flex flex-wrap gap-2">{['PRP Path Continuity','MMS Status Report','GOOSE Subscriber','Gateway to RCC'].map(t=><button type="button" key={t} onClick={()=>run(t)} className="rounded-lg border border-cyan-600 bg-[#123d54] px-3 py-2 text-sm text-white hover:bg-[#185473]">Test: {t}</button>)}</div>{result&&<div role="status" className={`mt-4 rounded-lg border p-3 ${result.outcome==='PASS'?'border-emerald-700 bg-[#0b302c]':'border-red-700 bg-[#361b25]'}`}><strong>{result.outcome} — {result.test}</strong><p className="mt-1 text-sm">{result.detail}</p><p className="mt-2 text-sm text-slate-200"><strong>Troubleshooting:</strong> {issue.guidance}</p></div>}</div>
    <div className="mt-4 rounded-xl border border-[#28516b] bg-[#0b253a] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-cyan-200">Test Evidence Log ({history.length})</h3><div className="flex gap-2"><button type="button" disabled={!history.length} onClick={exportCsv} className="rounded-lg border border-cyan-600 px-3 py-2 text-sm disabled:opacity-40">Export CSV</button><button type="button" disabled={!history.length} onClick={()=>setHistory([])} className="rounded-lg border border-[#3d6781] px-3 py-2 text-sm disabled:opacity-40">Clear</button></div></div><div className="mt-3 space-y-2">{history.length?history.slice(0,8).map(h=><div key={h.id} className="flex flex-wrap justify-between gap-2 rounded-lg border border-[#254a62] p-3 text-sm"><span>{h.test}</span><strong className={h.outcome==='PASS'?'text-emerald-300':'text-red-300'}>{h.outcome}</strong></div>):<p className="text-sm text-slate-400">No tests executed yet. Select a fault and run a test.</p>}</div></div>
    {help&&<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false)}}><div role="dialog" aria-modal="true" aria-label="Virtual Test Bench Instructions" className="max-h-[85vh] w-full max-w-xl overflow-auto rounded-2xl border border-cyan-600 bg-[#0b253a] p-5 text-slate-100"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold text-cyan-300">How to Use the Virtual Test Bench</h3><button type="button" onClick={()=>setHelp(false)} aria-label="Close instructions" className="rounded-lg border border-cyan-600 px-3 py-1">✕</button></div><ol className="mt-4 list-decimal space-y-3 pl-6 text-sm leading-7"><li>Click any device to inspect its IP, protocol and engineering role.</li><li>Select an IED vendor label for training context.</li><li>Choose Healthy or inject LAN A, LAN B, VLAN, MMS, IED or gateway faults.</li><li>Run PRP, MMS, GOOSE or RCC delivery tests.</li><li>Review PASS/FAIL and the troubleshooting explanation.</li><li>Restore Healthy State, retest, and export your evidence log as CSV.</li></ol><p className="mt-4 rounded-lg border border-amber-700/50 p-3 text-sm text-amber-200">This is a conceptual browser simulation only. No real IED, protection trip, breaker control or network interface is operated.</p></div></div>}
  </section>;
};


type AdvancedFaultCase = {
 id: string; title: string; symptom: string; impact: string;
 rootCause: string; diagnosis: string; correction: string; expected: string;
 choices: { id: string; label: string }[];
};
const advancedFaultCases: AdvancedFaultCase[] = [
 {id:'AF-01',title:'MMS Report Control Block Disabled',symptom:'IED ping and MMS association succeed, but SCADA breaker indication remains stale.',impact:'Status reporting unavailable',rootCause:'rcb',diagnosis:'Read the source value and quality, then inspect the configured DataSet and RCB enabled/reservation state.',correction:'Restore the approved RCB configuration and verify fresh reports reach the SCADA tag.',expected:'Fresh XCBR.Pos report arrives and HMI matches the source.',choices:[{id:'vlan',label:'Change switch VLAN'},{id:'rcb',label:'Check RCB enablement and DataSet'},{id:'ioa',label:'Change IEC 104 IOA'}]},
 {id:'AF-02',title:'GOOSE VLAN Mismatch',symptom:'Publisher stNum increases, but subscriber does not receive the expected GOOSE message.',impact:'IED-to-IED subscription lost',rootCause:'vlan',diagnosis:'Compare publisher VLAN tagging, switch port VLAN handling and subscriber multicast reception.',correction:'Align approved VLAN engineering and switch configuration, then validate the subscriber.',expected:'Subscriber receives the matching GOOSE stream and updates the mapped input.',choices:[{id:'vlan',label:'Verify VLAN and multicast delivery'},{id:'clock',label:'Change NTP server'},{id:'ioa',label:'Edit IEC 104 IOA'}]},
 {id:'AF-03',title:'GOOSE confRev Mismatch',symptom:'GOOSE frames reach the subscriber, but its subscription is invalid after an SCD update.',impact:'Subscriber rejects configured message',rootCause:'confrev',diagnosis:'Compare transmitted confRev, DataSet structure and subscriber ExtRef against the approved SCD.',correction:'Reconcile publisher and subscriber configuration versions and repeat the isolated test.',expected:'Subscription supervision is healthy and data quality is accepted.',choices:[{id:'rcb',label:'Enable MMS RCB'},{id:'confrev',label:'Compare confRev and DataSet'},{id:'port',label:'Open TCP 2404'}]},
 {id:'AF-04',title:'Incorrect IEC 104 IOA Mapping',symptom:'Station HMI shows correct breaker status, while RCC displays the wrong feeder point.',impact:'Control-centre point mismatch',rootCause:'ioa',diagnosis:'Trace source tag through gateway database to IEC 104 common address and IOA.',correction:'Correct the approved gateway/RCC mapping and verify interrogation plus spontaneous updates.',expected:'RCC displays the intended breaker point and quality.',choices:[{id:'ioa',label:'Trace gateway IOA and point list'},{id:'vlan',label:'Change GOOSE VLAN'},{id:'clock',label:'Restart time server'}]},
 {id:'AF-05',title:'PRP LAN A Path Failure',symptom:'One PRP LAN is disconnected; communication continues but redundancy alarm appears.',impact:'Redundancy degraded, not necessarily data outage',rootCause:'prp',diagnosis:'Inspect LAN A/B link states and PRP duplicate/discard supervision counters.',correction:'Restore the failed independent path under approved procedure and verify both networks healthy.',expected:'Both PRP LANs healthy; communication continuous and alarm cleared.',choices:[{id:'prp',label:'Check both PRP LANs and counters'},{id:'rcb',label:'Reconfigure MMS reports'},{id:'ioa',label:'Change gateway IOA'}]},
 {id:'AF-06',title:'Breaker Close Rejected by Interlock',symptom:'Operator Close request returns negative confirmation while earthing switch permissive is absent.',impact:'Control rejected for safety',rootCause:'interlock',diagnosis:'Review Local/Remote, command authority, CILO/interlocking and device rejection code.',correction:'Keep interlock effective; correct the simulated unsafe condition using an approved isolated test setup.',expected:'Unsafe Close remains rejected; only authorized safe test conditions permit operation.',choices:[{id:'interlock',label:'Inspect interlock and permissives'},{id:'bypass',label:'Bypass interlock to force Close'},{id:'clock',label:'Change SNTP time zone'}]},
 {id:'AF-07',title:'SOE Timestamp Drift',symptom:'Two IED events appear in incorrect order on the SCADA SOE list.',impact:'Misleading event sequence',rootCause:'time',diagnosis:'Compare IED clock synchronization, time quality, UTC conversion and source event timestamps.',correction:'Restore the approved time source and validate source-time ordering.',expected:'Event timestamps are synchronized within project tolerance and display order is correct.',choices:[{id:'time',label:'Inspect time sync and source timestamps'},{id:'ioa',label:'Change IOA'},{id:'vlan',label:'Change GOOSE APPID'}]},
 {id:'AF-08',title:'Wrong SCADA Analog Scaling',symptom:'IED current is 120 A, while HMI displays 12 A with good quality.',impact:'Incorrect engineering-unit display',rootCause:'scale',diagnosis:'Compare raw measured value, CT ratio, scaling factor and SCADA engineering-unit conversion.',correction:'Correct the approved conversion configuration and regression-test the analog range.',expected:'HMI current matches source within the specified tolerance.',choices:[{id:'scale',label:'Verify CT ratio and analog scaling'},{id:'rcb',label:'Disable MMS reporting'},{id:'prp',label:'Disconnect PRP LAN B'}]}
];
type AdvancedFaultLog = { at: string; id: string; title: string; diagnosis: string; result: string; feedback: string };
const AdvancedFaultInjectionLab: React.FC = () => {
 const [selected,setSelected] = useState(advancedFaultCases[0].id);
 const [diagnosis,setDiagnosis] = useState('');
 const [fixed,setFixed] = useState(false);
 const [result,setResult] = useState<{pass:boolean;message:string}|null>(null);
 const [logs,setLogs] = useState<AdvancedFaultLog[]>([]);
 const [help,setHelp] = useState(false);
 const item = advancedFaultCases.find(x=>x.id===selected) ?? advancedFaultCases[0];
 const choose = (id:string) => {setSelected(id);setDiagnosis('');setFixed(false);setResult(null)};
 const execute = () => {
   const correct = diagnosis===item.rootCause;
   const pass = correct && fixed;
   const message = !diagnosis ? 'Select a root-cause diagnosis first.' : !correct ? 'Incorrect diagnosis. Inspect the symptom and review the troubleshooting hints.' : !fixed ? 'Correct diagnosis. Apply the simulated corrective action, then retest.' : 'PASS — correct diagnosis and approved simulated correction verified.';
   setResult({pass,message});
   setLogs(old=>[{at:new Date().toLocaleString(),id:item.id,title:item.title,diagnosis:diagnosis||'Not selected',result:(pass?'PASS':'FAIL') as 'PASS' | 'FAIL',feedback:message},...old].slice(0,60));
 };
 const csv = () => {
   const quote=(v:string)=>'"'+v.replace(/"/g,'""')+'"';
   const lines=[['Timestamp','Test ID','Scenario','Diagnosis','Result','Feedback'].join(','),...logs.map(l=>[l.at,l.id,l.title,l.diagnosis,l.result,l.feedback].map(quote).join(','))];
   const blob=new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8'});
   const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='sas-advanced-fault-injection-log.csv';a.click();URL.revokeObjectURL(url);
 };
 return <section className="mt-8 rounded-2xl border border-cyan-700/60 bg-[#091d31] p-4 md:p-6">
   <div className="flex flex-wrap items-start justify-between gap-3">
     <div><div className="text-xs font-bold uppercase tracking-widest text-cyan-400">FAT / SAT • Interactive Simulation</div><h2 className="mt-2 text-2xl font-extrabold text-white">Advanced Fault Injection & Troubleshooting Lab</h2><p className="mt-2 text-sm leading-6 text-slate-300">Diagnose realistic SAS faults, apply a simulated corrective action and run a validation test. No physical devices are controlled.</p></div>
     <button type="button" onClick={()=>setHelp(true)} className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-200 hover:bg-[#123a51]">? How to Use</button>
   </div>
   <div className="mt-5 grid gap-4 lg:grid-cols-[260px_minmax(0,1fr)]">
     <nav aria-label="Fault scenarios" className="space-y-2">{advancedFaultCases.map(x=><button key={x.id} type="button" onClick={()=>choose(x.id)} aria-pressed={x.id===selected} className={`w-full rounded-lg border p-3 text-left text-sm ${x.id===selected?'border-cyan-400 bg-[#123d52] text-white':'border-[#28516a] bg-[#071726] text-slate-300 hover:bg-[#103049]'}`}><span className="block text-xs font-bold text-cyan-300">{x.id}</span><span className="mt-1 block">{x.title}</span></button>)}</nav>
     <div className="min-w-0 space-y-4">
       <div className="rounded-xl border border-[#27516b] bg-[#071726] p-4"><h3 className="text-lg font-bold text-white">{item.title}</h3><p className="mt-3 leading-7 text-slate-200"><strong className="text-cyan-300">Observed symptom:</strong> {item.symptom}</p><p className="mt-2 text-sm text-amber-200"><strong>Impact:</strong> {item.impact}</p></div>
       <div className="rounded-xl border border-[#27516b] bg-[#071726] p-4"><h4 className="font-bold text-cyan-300">1. Select Root-Cause Diagnosis</h4><div className="mt-3 space-y-2">{item.choices.map(c=><label key={c.id} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#234760] p-3 text-sm text-slate-200 hover:bg-[#103049]"><input type="radio" name={'fault-diagnosis-'+item.id} checked={diagnosis===c.id} onChange={()=>{setDiagnosis(c.id);setResult(null);setFixed(false)}} className="mt-1"/><span>{c.label}</span></label>)}</div></div>
       <div className="rounded-xl border border-[#27516b] bg-[#071726] p-4"><h4 className="font-bold text-cyan-300">2. Simulated Corrective Action</h4><label className="mt-3 flex items-start gap-3 text-sm leading-6 text-slate-200"><input type="checkbox" checked={fixed} onChange={e=>{setFixed(e.target.checked);setResult(null)}} className="mt-1"/><span>Apply the approved correction in this simulation and verify its effect (training only).</span></label><button type="button" onClick={execute} className="mt-4 rounded-lg bg-cyan-500 px-5 py-2 font-bold text-[#052034] hover:bg-cyan-300">Execute Fault Test</button></div>
       {result&&<div role="status" className={`rounded-xl border p-4 ${result.pass?'border-emerald-600 bg-[#0c3029] text-emerald-200':'border-amber-700 bg-[#352710] text-amber-200'}`}><strong>{result.pass?'PASS':'FAIL / INCOMPLETE'}</strong><p className="mt-2">{result.message}</p>{!result.pass&&<p className="mt-2 text-sm">Troubleshooting hint: {item.diagnosis}</p>}{result.pass&&<><p className="mt-2 text-sm"><strong>Corrective action:</strong> {item.correction}</p><p className="mt-1 text-sm"><strong>Expected:</strong> {item.expected}</p></>}</div>}
     </div>
   </div>
   <div className="mt-6 rounded-xl border border-[#27516b] bg-[#071726] p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold text-white">Fault Test Evidence Log ({logs.length})</h3><div className="flex gap-2"><button type="button" disabled={!logs.length} onClick={csv} className="rounded-lg border border-cyan-600 px-3 py-2 text-sm text-cyan-200 disabled:opacity-40">Export CSV</button><button type="button" disabled={!logs.length} onClick={()=>setLogs([])} className="rounded-lg border border-[#45627a] px-3 py-2 text-sm text-slate-200 disabled:opacity-40">Clear Log</button></div></div><div className="mt-3 space-y-2">{logs.length?logs.slice(0,10).map((l,i)=><div key={i} className="flex flex-wrap justify-between gap-2 rounded-lg border border-[#234760] p-3 text-sm"><span className="text-slate-300">{l.at} • {l.id} • {l.title}</span><strong className={l.result==='PASS'?'text-emerald-300':'text-amber-300'}>{l.result}</strong></div>):<p className="text-sm text-slate-400">No test runs yet. Execute a scenario to create evidence.</p>}</div></div>
   {help&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setHelp(false)}} role="presentation"><div role="dialog" aria-modal="true" aria-label="Advanced Fault Injection Help" className="w-full max-w-xl rounded-xl border border-cyan-600 bg-[#0a2237] p-6 text-slate-100"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold">How to Run Fault Injection Lab</h3><button type="button" onClick={()=>setHelp(false)} aria-label="Close help" className="rounded-lg border border-cyan-700 px-3 py-1">✕</button></div><ol className="mt-4 list-decimal space-y-3 pl-5 leading-7 text-slate-200"><li>Select one of the 8 fault scenarios.</li><li>Read the observed symptom and select the most likely root cause.</li><li>Tick the simulated corrective action after choosing your diagnosis.</li><li>Click Execute Fault Test to receive PASS/FAIL and troubleshooting feedback.</li><li>Review the Evidence Log and export CSV for training records.</li></ol><p className="mt-4 text-sm text-amber-200">Training simulation only. Never bypass real protection interlocks or test live equipment without authorization.</p></div></div>}
 </section>;
};


type ReportRow = { id: string; title: string; expected: string; actual: string; status: 'PASS'|'FAIL'|'NOT TESTED'|'BLOCKED'; remarks: string; defect: string };
const reportInitialRows: ReportRow[] = [
 {id:'FAT-001',title:'Breaker Status MMS Indication',expected:'HMI indication and quality match simulated IED XCBR.Pos',actual:'',status:'NOT TESTED',remarks:'',defect:''},
 {id:'FAT-002',title:'GOOSE Publisher / Subscriber',expected:'Valid DataSet, VLAN and confRev; subscriber updates',actual:'',status:'NOT TESTED',remarks:'',defect:''},
 {id:'FAT-003',title:'MMS Report Control Block',expected:'RCB enabled and configured reports received',actual:'',status:'NOT TESTED',remarks:'',defect:''},
 {id:'FAT-004',title:'Remote Close Interlocking',expected:'Unsafe commands rejected; permitted controls acknowledged',actual:'',status:'NOT TESTED',remarks:'',defect:''},
 {id:'SAT-001',title:'IEC 104 Gateway to RCC',expected:'Approved IOA mapping and indication verified',actual:'',status:'NOT TESTED',remarks:'',defect:''},
 {id:'SAT-002',title:'PRP LAN A/B Redundancy',expected:'Single-path failure maintains communication and raises alarm',actual:'',status:'NOT TESTED',remarks:'',defect:''}
];
const FatSatProfessionalReport: React.FC = () => {
 const [project,setProject]=useState('33/11 kV Substation SAS Training');
 const [station,setStation]=useState('Training Substation');
 const [engineer,setEngineer]=useState('');
 const [date,setDate]=useState(()=>new Date().toISOString().slice(0,10));
 const [type,setType]=useState<'FAT'|'SAT'>('FAT');
 const [revision,setRevision]=useState('R0');
 const [rows,setRows]=useState<ReportRow[]>(reportInitialRows);
 const [guide,setGuide]=useState(false);
 const update=(id:string,key:keyof ReportRow,value:string)=>setRows(old=>old.map(row=>row.id===id?{...row,[key]:value}:row));
 const add=()=>setRows(old=>[...old,{id:`${type}-${String(old.length+1).padStart(3,'0')}`,title:'New test case',expected:'',actual:'',status:'NOT TESTED',remarks:'',defect:''}]);
 const counts={pass:rows.filter(r=>r.status==='PASS').length,fail:rows.filter(r=>r.status==='FAIL').length,blocked:rows.filter(r=>r.status==='BLOCKED').length,untested:rows.filter(r=>r.status==='NOT TESTED').length};
 const escapeCsv=(v:string)=>'"'+String(v).replace(/"/g,'""')+'"';
 const exportCsv=()=>{
  const header=['Project','Station','Engineer','Date','Test Type','Revision','Test ID','Test Description','Expected Result','Actual Result','Status','Remarks','Defect ID'];
  const data=rows.map(r=>[project,station,engineer,date,type,revision,r.id,r.title,r.expected,r.actual,r.status,r.remarks,r.defect]);
  const csv=[header,...data].map(line=>line.map(escapeCsv).join(',')).join('\r\n');
  const blob=new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'});const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`FAT-SAT-Report-${date}.csv`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 };
 const printReport=()=>{
  const safe=(v:string)=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>FAT/SAT Test Report</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,sans-serif;color:#172433;font-size:11px}h1{margin-bottom:5px}table{border-collapse:collapse;width:100%;table-layout:fixed}td,th{border:1px solid #8895a2;padding:6px;vertical-align:top;overflow-wrap:anywhere}th{background:#eaf2f8}.meta{margin:16px 0}.summary{margin:14px 0}.note{margin-top:16px;color:#52606d}</style></head><body><h1>${safe(type)} Test Report — ${safe(project)}</h1><div class="meta"><b>Station:</b> ${safe(station)} &nbsp; <b>Engineer:</b> ${safe(engineer||'Not specified')} &nbsp; <b>Date:</b> ${safe(date)} &nbsp; <b>Revision:</b> ${safe(revision)}</div><div class="summary"><b>Summary:</b> ${counts.pass} PASS | ${counts.fail} FAIL | ${counts.blocked} BLOCKED | ${counts.untested} NOT TESTED</div><table><thead><tr>${['Test ID','Description','Expected Result','Actual Result','Status','Remarks','Defect ID'].map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${[r.id,r.title,r.expected,r.actual,r.status,r.remarks,r.defect].map(v=>`<td>${safe(v)}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="note">Training report generated from browser-entered results. No live IED testing or automatic verification is implied. Review and approve evidence before using as a project record.</p></body></html>`;
  const w=window.open('','_blank');if(!w){window.alert('Allow popups to print this report.');return;}w.document.open();w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),250);
 };
 return <section className="mt-8 rounded-2xl border border-cyan-700/60 bg-[#091d31] p-4 md:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-widest text-cyan-400">FAT / SAT • Documentation</div><h2 className="mt-2 text-2xl font-extrabold text-white">Professional FAT/SAT Test Report Generator</h2><p className="mt-2 text-sm leading-6 text-slate-300">Record test cases, expected/actual results, PASS/FAIL, engineer remarks and defect references. Export CSV or print to PDF.</p></div><button type="button" onClick={()=>setGuide(true)} className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-200">? How to Use</button></div>
  <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
   {([['Project',project,setProject],['Station',station,setStation],['Engineer',engineer,setEngineer],['Date',date,setDate],['Revision',revision,setRevision]] as [string,string,(v:string)=>void][]).map(([label,value,set])=><label key={label} className="text-sm text-slate-200">{label}<input type={label==='Date'?'date':'text'} value={value} onChange={e=>set(e.target.value)} className="mt-1 block w-full rounded-lg border border-[#2a5873] bg-[#071726] p-2 text-white"/></label>)}
   <label className="text-sm text-slate-200">Report Type<select value={type} onChange={e=>setType(e.target.value as 'FAT'|'SAT')} className="mt-1 block w-full rounded-lg border border-[#2a5873] bg-[#071726] p-2 text-white"><option value="FAT">FAT</option><option value="SAT">SAT</option></select></label>
  </div>
  <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">{([['PASS',counts.pass,'text-emerald-300'],['FAIL',counts.fail,'text-rose-300'],['BLOCKED',counts.blocked,'text-amber-300'],['NOT TESTED',counts.untested,'text-slate-300']] as const).map(([label,count,color])=><div key={label} className="rounded-xl border border-[#2a5873] bg-[#071726] p-3"><div className={`text-2xl font-bold ${color}`}>{count}</div><div className="text-xs text-slate-300">{label}</div></div>)}</div>
  <div className="mt-5 space-y-3">{rows.map((r,i)=><article key={i} className="rounded-xl border border-[#2a5873] bg-[#071726] p-4"><div className="grid gap-3 md:grid-cols-[120px_minmax(0,1fr)_160px]"><label className="text-xs text-slate-300">Test ID<input value={r.id} onChange={e=>update(r.id,'id',e.target.value)} className="mt-1 w-full rounded border border-[#2a5873] bg-[#0b2539] p-2 text-sm text-white"/></label><label className="text-xs text-slate-300">Test Description<input value={r.title} onChange={e=>update(r.id,'title',e.target.value)} className="mt-1 w-full rounded border border-[#2a5873] bg-[#0b2539] p-2 text-sm text-white"/></label><label className="text-xs text-slate-300">Result<select value={r.status} onChange={e=>update(r.id,'status',e.target.value)} className="mt-1 w-full rounded border border-[#2a5873] bg-[#0b2539] p-2 text-sm text-white"><option>NOT TESTED</option><option>PASS</option><option>FAIL</option><option>BLOCKED</option></select></label></div><div className="mt-3 grid gap-3 md:grid-cols-2"><label className="text-xs text-slate-300">Expected Result<textarea rows={2} value={r.expected} onChange={e=>update(r.id,'expected',e.target.value)} className="mt-1 w-full rounded border border-[#2a5873] bg-[#0b2539] p-2 text-sm text-white"/></label><label className="text-xs text-slate-300">Actual Result<textarea rows={2} value={r.actual} onChange={e=>update(r.id,'actual',e.target.value)} className="mt-1 w-full rounded border border-[#2a5873] bg-[#0b2539] p-2 text-sm text-white"/></label><label className="text-xs text-slate-300">Engineer Remarks<input value={r.remarks} onChange={e=>update(r.id,'remarks',e.target.value)} className="mt-1 w-full rounded border border-[#2a5873] bg-[#0b2539] p-2 text-sm text-white"/></label><label className="text-xs text-slate-300">Defect / Punch List ID<input value={r.defect} onChange={e=>update(r.id,'defect',e.target.value)} className="mt-1 w-full rounded border border-[#2a5873] bg-[#0b2539] p-2 text-sm text-white"/></label></div><div className="mt-2 flex justify-end"><button type="button" onClick={()=>setRows(old=>old.filter((_,j)=>j!==i))} className="text-xs text-rose-300 hover:underline">Remove Test</button></div></article>)}</div>
  <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={add} className="rounded-lg border border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-200">+ Add Test Case</button><button type="button" onClick={exportCsv} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-[#052034]">Export CSV</button><button type="button" onClick={printReport} className="rounded-lg border border-cyan-500 px-4 py-2 text-sm font-semibold text-cyan-200">Print / Save as PDF</button></div>
  <p className="mt-3 text-xs text-amber-200">Entries are held in this page session; export before closing or refreshing. Results are manually entered, not automatically collected from live equipment.</p>
  {guide&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setGuide(false)}}><div role="dialog" aria-modal="true" aria-label="Report Generator Guide" className="w-full max-w-xl rounded-xl border border-cyan-600 bg-[#0a2237] p-6 text-slate-100"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold">How to Prepare FAT/SAT Report</h3><button type="button" onClick={()=>setGuide(false)} aria-label="Close" className="rounded-lg border border-cyan-700 px-3 py-1">✕</button></div><ol className="mt-4 list-decimal space-y-3 pl-5 leading-7"><li>Enter project, station, engineer, date and report revision.</li><li>Choose FAT or SAT report type.</li><li>Review each test's expected result and enter observed actual result.</li><li>Set PASS, FAIL, BLOCKED or NOT TESTED and record remarks/defect IDs.</li><li>Add or remove test cases as needed.</li><li>Export CSV, or use Print / Save as PDF in your browser.</li></ol><p className="mt-3 text-sm text-amber-200">Training documentation only. Validate and approve all project evidence separately.</p></div></div>}
 </section>;
};


type TrainingLevel = 'Beginner' | 'Intermediate' | 'Advanced';
type TrainingTask = {id:string;level:TrainingLevel;title:string;scenario:string;objective:string;choices:string[];correct:number;hint:string;explanation:string};
const commissioningTasks: TrainingTask[] = [
 {id:'TR-01',level:'Beginner',title:'IED Communication Check',scenario:'A protection IED is reachable on the station LAN, but SCADA cannot establish an MMS association.',objective:'Identify the first protocol-specific verification.',choices:['Check TCP port 102 and IEC 61850 MMS association settings','Change the IEC 104 IOA','Disable PRP LAN B'],correct:0,hint:'Ping confirms IP reachability, not application-layer MMS.',explanation:'Check MMS/TCP 102 connectivity, server configuration and association logs. Do not infer MMS health from ping alone.'},
 {id:'TR-02',level:'Beginner',title:'Breaker Indication Mapping',scenario:'The field breaker is OPEN, but SCADA indicates CLOSED. MMS communication is healthy.',objective:'Choose the correct signal tracing method.',choices:['Restart every switch','Trace XCBR.Pos source, quality and SCADA tag mapping','Bypass breaker interlocks'],correct:1,hint:'Start at the source value and follow the mapping chain.',explanation:'Verify source XCBR.Pos, quality, DataSet/RCB and HMI point mapping against the approved signal list.'},
 {id:'TR-03',level:'Beginner',title:'Time Synchronization',scenario:'IED events are displayed out of order in the SOE list.',objective:'Select the relevant commissioning check.',choices:['Check time source, sync status and event timestamps','Change CT ratio','Disable GOOSE'],correct:0,hint:'SOE depends on event source timestamps and clock quality.',explanation:'Validate IED synchronization, source timestamps, time zone/UTC handling and project tolerance.'},
 {id:'TR-04',level:'Intermediate',title:'GOOSE Subscription',scenario:'Publisher GOOSE packets are visible but the subscriber rejects the stream after a configuration update.',objective:'Find the likely configuration mismatch.',choices:['RCC IEC 104 common address','GOOSE confRev, DataSet and subscriber ExtRef','HMI analog scaling'],correct:1,hint:'A valid network frame can still be rejected by an IEC 61850 subscriber.',explanation:'Compare transmitted confRev and DataSet with the subscriber engineering configuration and approved SCD.'},
 {id:'TR-05',level:'Intermediate',title:'MMS Reporting',scenario:'IED data can be read on demand, but breaker changes do not update SCADA automatically.',objective:'Choose the most relevant reporting checks.',choices:['RCB enablement, DataSet, trigger options and SCADA subscription','Only the Ethernet cable colour','Gateway IEC 104 IOA only'],correct:0,hint:'Reads and unsolicited reports are different services.',explanation:'Inspect Report Control Block, trigger options, DataSet membership, reservation and client subscriptions.'},
 {id:'TR-06',level:'Intermediate',title:'PRP Redundancy',scenario:'LAN A is disconnected in a simulated test. Communication continues on LAN B and a redundancy alarm appears.',objective:'Evaluate the expected outcome.',choices:['FAIL because any PRP link loss must stop data','PASS for continuity, with degraded redundancy alarm and repair action','Disable supervision to clear the alarm'],correct:1,hint:'PRP aims for zero-time recovery on single-network failure.',explanation:'Single LAN failure should preserve communication through the remaining LAN; the loss must be alarmed and corrected.'},
 {id:'TR-07',level:'Advanced',title:'Remote Breaker Close',scenario:'An earth switch is CLOSED and the operator requests breaker CLOSE.',objective:'Choose the safe commissioning outcome.',choices:['Force Close by bypassing CILO','Approve Close because MMS is online','Reject Close and verify interlocking/permissive feedback'],correct:2,hint:'Communication availability does not override electrical interlocks.',explanation:'Unsafe CLOSE must remain blocked. Check control authority, interlock logic and command response in an authorized isolated simulation.'},
 {id:'TR-08',level:'Advanced',title:'IEC 104 RCC Mapping',scenario:'Station HMI shows the correct breaker but RCC displays the wrong feeder status.',objective:'Identify the trace path.',choices:['Source SCADA tag → gateway common address/IOA → RCC point list','Change GOOSE multicast MAC','Disable RCB on the IED'],correct:0,hint:'The station display is already correct; focus on the gateway-to-RCC mapping.',explanation:'Trace IEC 104 point mapping, common address, IOA, quality, interrogation and spontaneous updates using the approved point list.'},
 {id:'TR-09',level:'Advanced',title:'FAT/SAT Evidence Review',scenario:'A breaker command test has a PASS mark but no actual result, event timestamp or signed test record.',objective:'Determine the proper acceptance action.',choices:['Accept PASS without evidence','Record the missing evidence and hold acceptance pending review','Delete the test case'],correct:1,hint:'A status label alone is not sufficient engineering evidence.',explanation:'Document actual observations, SOE/command logs, witness details and defects before formal sign-off.'}
];
const GuidedCommissioningTraining: React.FC = () => {
 const [level,setLevel]=useState<TrainingLevel>('Beginner');
 const [index,setIndex]=useState(0);
 const [answers,setAnswers]=useState<Record<string,number>>({});
 const [hints,setHints]=useState<Record<string,boolean>>({});
 const [submitted,setSubmitted]=useState<Record<string,boolean>>({});
 const [engineer,setEngineer]=useState('');
 const [guide,setGuide]=useState(false);
 const [completed,setCompleted]=useState(false);
 useEffect(()=>{
  try {
   const saved=window.localStorage.getItem('sas-guided-training-v1');
   if(!saved)return;
   const data=JSON.parse(saved);
   if(data && typeof data==='object'){
    if(['Beginner','Intermediate','Advanced'].includes(data.level))setLevel(data.level);
    if(typeof data.index==='number'&&Number.isInteger(data.index))setIndex(Math.max(0,Math.min(2,data.index)));
    if(data.answers&&typeof data.answers==='object')setAnswers(data.answers);
    if(data.hints&&typeof data.hints==='object')setHints(data.hints);
    if(data.submitted&&typeof data.submitted==='object')setSubmitted(data.submitted);
    if(typeof data.engineer==='string')setEngineer(data.engineer);
   }
  }catch(_error){/* private browsing or invalid saved data */}
 },[]);
 const [trainingLoaded,setTrainingLoaded]=useState(false);
 useEffect(()=>{const handle=window.setTimeout(()=>setTrainingLoaded(true),0);return ()=>window.clearTimeout(handle)},[]);
 useEffect(()=>{
  if(!trainingLoaded)return;
  try{window.localStorage.setItem('sas-guided-training-v1',JSON.stringify({level,index,answers,hints,submitted,engineer}))}catch(_error){/* storage unavailable */}
 },[trainingLoaded,level,index,answers,hints,submitted,engineer]);
 const tasks=commissioningTasks.filter(t=>t.level===level);
 const task=tasks[Math.min(index,tasks.length-1)];
 const levelAnswered=tasks.filter(t=>submitted[t.id]).length;
 const levelCorrect=tasks.filter(t=>submitted[t.id]&&answers[t.id]===t.correct).length;
 const levelHints=tasks.filter(t=>hints[t.id]).length;
 const score=Math.max(0,Math.round((levelCorrect/tasks.length)*100)-(levelHints*5));
 const allCompleted=commissioningTasks.filter(t=>submitted[t.id]).length;
 const switchLevel=(next:TrainingLevel)=>{setLevel(next);setIndex(0);setCompleted(false)};
 const submit=()=>{if(answers[task.id]===undefined)return;setSubmitted(old=>({...old,[task.id]:true}));setCompleted(false)};
 const resetLevel=()=>{const ids=new Set(tasks.map(t=>t.id));setAnswers(old=>Object.fromEntries(Object.entries(old).filter(([k])=>!ids.has(k))));setHints(old=>Object.fromEntries(Object.entries(old).filter(([k])=>!ids.has(k))));setSubmitted(old=>Object.fromEntries(Object.entries(old).filter(([k])=>!ids.has(k))));setIndex(0);setCompleted(false)};
 const print=()=>{
  const safe=(v:string)=>String(v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  const rows=tasks.map(t=>`<tr><td>${safe(t.id)}</td><td>${safe(t.title)}</td><td>${submitted[t.id]?(answers[t.id]===t.correct?'Correct':'Incorrect'):'Not completed'}</td><td>${hints[t.id]?'Yes':'No'}</td></tr>`).join('');
  const html=`<!doctype html><html><head><meta charset="utf-8"><title>Commissioning Training Assessment</title><style>body{font:13px Arial,sans-serif;color:#15253a;margin:35px}table{width:100%;border-collapse:collapse}th,td{border:1px solid #9aaaba;padding:9px;text-align:left}th{background:#e8f1f7}h1{font-size:23px}.note{margin-top:24px;color:#58687a}</style></head><body><h1>SAS Guided Commissioning — Training Assessment</h1><p><b>Engineer:</b> ${safe(engineer||'Not specified')} &nbsp; <b>Level:</b> ${safe(level)} &nbsp; <b>Date:</b> ${safe(new Date().toLocaleDateString())}</p><p><b>Completed:</b> ${levelAnswered}/${tasks.length} &nbsp; <b>Correct:</b> ${levelCorrect} &nbsp; <b>Hints used:</b> ${levelHints} &nbsp; <b>Score:</b> ${score}%</p><table><tr><th>Task</th><th>Commissioning Scenario</th><th>Answer</th><th>Hint Used</th></tr>${rows}</table><p class="note">Browser-based knowledge assessment only. Not a formal qualification, site acceptance certificate or record of live equipment testing.</p></body></html>`;
  const w=window.open('','_blank');if(!w){window.alert('Please allow popups to print the training report.');return;}w.document.open();w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),250);
 };
 return <section className="mt-8 rounded-2xl border border-cyan-700/60 bg-[#091d31] p-4 md:p-6">
  <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-widest text-cyan-400">FAT / SAT • Guided Training</div><h2 className="mt-2 text-2xl font-extrabold text-white">Guided Commissioning Training & Assessment</h2><p className="mt-2 text-sm leading-6 text-slate-300">Practice commissioning decisions from beginner to advanced, review engineering explanations and track your assessment score.</p></div><button type="button" onClick={()=>setGuide(true)} className="rounded-lg border border-cyan-600 px-4 py-2 text-sm font-semibold text-cyan-200">? How to Use</button></div>
  <div className="mt-5 flex flex-wrap gap-2">{(['Beginner','Intermediate','Advanced'] as TrainingLevel[]).map(l=><button key={l} type="button" onClick={()=>switchLevel(l)} aria-pressed={level===l} className={`rounded-lg border px-4 py-2 text-sm font-bold ${level===l?'border-cyan-400 bg-[#13506a] text-white':'border-[#2a5873] bg-[#071726] text-slate-300'}`}>{l}</button>)}</div>
  <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4">{([['Level Progress',`${levelAnswered}/${tasks.length}`],['Correct Answers',String(levelCorrect)],['Hints Used',String(levelHints)],['Score',`${score}%`]] as const).map(([label,value])=><div key={label} className="rounded-lg border border-[#2a5873] bg-[#071726] p-3"><div className="text-xl font-bold text-cyan-200">{value}</div><div className="text-xs text-slate-400">{label}</div></div>)}</div>
  <div className="mt-4 h-2 overflow-hidden rounded-full bg-[#123247]"><div className="h-full bg-cyan-400 transition-all" style={{width:`${Math.round(levelAnswered/tasks.length*100)}%`}}/></div>
  <div className="mt-5 rounded-xl border border-[#2a5873] bg-[#071726] p-4 md:p-5"><div className="flex flex-wrap justify-between gap-2 text-sm text-cyan-300"><span>{task.id} · {level}</span><span>Task {index+1} of {tasks.length}</span></div><h3 className="mt-3 text-xl font-bold text-white">{task.title}</h3><p className="mt-3 leading-7 text-slate-200"><strong className="text-cyan-300">Scenario:</strong> {task.scenario}</p><p className="mt-2 leading-7 text-slate-200"><strong className="text-cyan-300">Your assignment:</strong> {task.objective}</p>
  <div className="mt-4 space-y-2">{task.choices.map((c,i)=><label key={i} className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm ${answers[task.id]===i?'border-cyan-400 bg-[#123d52] text-white':'border-[#2a5873] text-slate-200'} ${submitted[task.id]?'cursor-default':''}`}><input type="radio" name={`training-${task.id}`} className="mt-1" checked={answers[task.id]===i} disabled={!!submitted[task.id]} onChange={()=>setAnswers(old=>({...old,[task.id]:i}))}/><span>{c}</span></label>)}</div>
  <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={!!submitted[task.id]||answers[task.id]===undefined} onClick={submit} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-[#052034] disabled:opacity-40">Check Answer</button><button type="button" onClick={()=>setHints(old=>({...old,[task.id]:true}))} className="rounded-lg border border-amber-700 px-4 py-2 text-sm text-amber-200">Show Hint (-5 points)</button></div>
  {hints[task.id]&&<p className="mt-3 rounded-lg border border-amber-700/60 bg-[#332817] p-3 text-sm text-amber-100"><strong>Hint:</strong> {task.hint}</p>}
  {submitted[task.id]&&<div role="status" className={`mt-4 rounded-lg border p-4 ${answers[task.id]===task.correct?'border-emerald-700 bg-[#0d3029] text-emerald-100':'border-rose-700 bg-[#361c26] text-rose-100'}`}><strong>{answers[task.id]===task.correct?'CORRECT — PASS':'INCORRECT — REVIEW'}</strong><p className="mt-2 text-sm leading-6">{task.explanation}</p><p className="mt-2 text-sm">Correct answer: {task.choices[task.correct]}</p></div>}
  <div className="mt-5 flex flex-wrap items-center justify-between gap-2"><button type="button" disabled={index===0} onClick={()=>setIndex(i=>Math.max(0,i-1))} className="rounded-lg border border-[#2a5873] px-4 py-2 text-sm text-slate-200 disabled:opacity-40">← Previous</button><button type="button" disabled={index===tasks.length-1} onClick={()=>setIndex(i=>Math.min(tasks.length-1,i+1))} className="rounded-lg border border-cyan-600 px-4 py-2 text-sm text-cyan-200 disabled:opacity-40">Next Task →</button></div></div>
  <div className="mt-5 rounded-xl border border-[#2a5873] bg-[#071726] p-4"><h3 className="font-bold text-white">Assessment & Completion Report</h3><p className="mt-2 text-sm text-slate-300">Total completed across all levels: {allCompleted}/{commissioningTasks.length}. Level assessment is available after all {tasks.length} tasks are answered.</p><label className="mt-3 block max-w-sm text-sm text-slate-300">Engineer Name<input value={engineer} onChange={e=>setEngineer(e.target.value)} placeholder="Enter name for training report" className="mt-1 block w-full rounded-lg border border-[#2a5873] bg-[#0b2539] p-2 text-white"/></label><div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={levelAnswered!==tasks.length} onClick={()=>setCompleted(true)} className="rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-[#052034] disabled:opacity-40">Finish Level</button><button type="button" onClick={print} className="rounded-lg border border-cyan-600 px-4 py-2 text-sm text-cyan-200">Print / Save Assessment PDF</button><button type="button" onClick={resetLevel} className="rounded-lg border border-[#45627a] px-4 py-2 text-sm text-slate-300">Reset This Level</button></div>{completed&&<p role="status" className="mt-3 rounded-lg border border-emerald-700 bg-[#0d3029] p-3 text-sm text-emerald-200">{level} level complete: {levelCorrect}/{tasks.length} correct · Score {score}%. This is a training assessment, not an industry certification.</p>}</div>
  <p className="mt-3 text-xs text-amber-200">Training-only scenarios. Never bypass protection or interlocking on live equipment. Progress is held in page memory; print your assessment before refreshing.</p>
  {guide&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setGuide(false)}}><div role="dialog" aria-modal="true" aria-label="Guided Training Help" className="w-full max-w-xl rounded-xl border border-cyan-600 bg-[#0a2237] p-6 text-slate-100"><div className="flex items-center justify-between gap-3"><h3 className="text-xl font-bold">How to Use Guided Training</h3><button type="button" onClick={()=>setGuide(false)} aria-label="Close guide" className="rounded-lg border border-cyan-700 px-3 py-1">✕</button></div><ol className="mt-4 list-decimal space-y-2 pl-5 leading-7 text-slate-200"><li>Select Beginner, Intermediate or Advanced.</li><li>Read the commissioning scenario and assignment.</li><li>Select an answer and click Check Answer.</li><li>Use Show Hint if needed; each hinted task deducts 5 percentage points from the level score.</li><li>Complete all three tasks in the level, then click Finish Level.</li><li>Enter your name and Print / Save Assessment PDF.</li></ol><p className="mt-3 text-sm text-amber-200">No live device controls or actual site acceptance are performed.</p></div></div>}
 </section>;
};


type DiagnosticScenario = {id:string;title:string;fault:string;root:string;fix:string;protocol:'MMS'|'GOOSE'|'IEC104'|'PRP';symptom:string;choices:{id:string;label:string}[]};
const diagnosticScenarios:DiagnosticScenario[]=[
{id:'DC-01',title:'IED Offline',fault:'IED network interface unavailable',root:'link',fix:'Restore simulated IED link',protocol:'MMS',symptom:'IED ping fails and SCADA reports communication lost.',choices:[{id:'link',label:'Inspect IED link and port'},{id:'ioa',label:'Edit RCC IOA'},{id:'time',label:'Adjust clock'}]},
{id:'DC-02',title:'MMS RCB Disabled',fault:'Report Control Block not enabled',root:'rcb',fix:'Enable simulated RCB',protocol:'MMS',symptom:'MMS session established but breaker indications do not update.',choices:[{id:'rcb',label:'Verify DataSet / RCB state'},{id:'vlan',label:'Change GOOSE VLAN'},{id:'ioa',label:'Change IEC 104 IOA'}]},
{id:'DC-03',title:'GOOSE VLAN Mismatch',fault:'Publisher/subscriber VLAN mismatch',root:'vlan',fix:'Align simulated VLAN',protocol:'GOOSE',symptom:'Publisher sends GOOSE; subscriber misses updates.',choices:[{id:'time',label:'Check NTP'},{id:'vlan',label:'Check VLAN tagging and multicast'},{id:'rcb',label:'Enable MMS RCB'}]},
{id:'DC-04',title:'PRP LAN A Failure',fault:'LAN A fibre disconnected',root:'prp',fix:'Restore simulated LAN A',protocol:'PRP',symptom:'LAN A alarm active, LAN B carries communication; redundancy degraded.',choices:[{id:'prp',label:'Check independent PRP paths'},{id:'ioa',label:'Change RCC IOA'},{id:'rcb',label:'Disable MMS RCB'}]},
{id:'DC-05',title:'IEC 104 IOA Error',fault:'Gateway IOA mapped to wrong point',root:'ioa',fix:'Correct simulated IOA',protocol:'IEC104',symptom:'Local HMI is correct but RCC shows wrong feeder indication.',choices:[{id:'ioa',label:'Trace gateway IOA mapping'},{id:'vlan',label:'Change GOOSE VLAN'},{id:'link',label:'Restart IED'}]},
{id:'DC-06',title:'GOOSE confRev Mismatch',fault:'Subscriber expects older confRev',root:'confrev',fix:'Align simulated SCD configuration',protocol:'GOOSE',symptom:'GOOSE packets arrive but subscriber rejects the stream.',choices:[{id:'confrev',label:'Compare confRev, DataSet and ExtRef'},{id:'rcb',label:'Enable MMS RCB'},{id:'ioa',label:'Change IEC 104 IOA'}]}
];
type DiagnosticEvent={time:string;severity:string;message:string};
const CommissioningDiagnostics:React.FC=()=>{
 const [scenario,setScenario]=useState(diagnosticScenarios[0].id);
 const [answer,setAnswer]=useState('');
 const [corrected,setCorrected]=useState(false);
 const [checked,setChecked]=useState(false);
 const [runs,setRuns]=useState(0);
 const [success,setSuccess]=useState(0);
 const [history,setHistory]=useState<DiagnosticEvent[]>([]);
 const [filter,setFilter]=useState('ALL');
 const [guide,setGuide]=useState(false);
 const item=diagnosticScenarios.find(x=>x.id===scenario)??diagnosticScenarios[0];
 const resolved=corrected&&checked&&answer===item.root;
 const push=(severity:string,message:string)=>setHistory(old=>[{time:new Date().toLocaleTimeString(),severity,message},...old].slice(0,80));
 const choose=(id:string)=>{setScenario(id);setAnswer('');setCorrected(false);setChecked(false);push('ALARM',`${id} fault injected in browser simulation`)};
 const diagnose=()=>{setChecked(true);push(answer===item.root?'INFO':'WARNING',answer===item.root?'Correct root cause selected':'Diagnosis mismatch — inspect protocol evidence')};
 const retest=()=>{setRuns(v=>v+1);const pass=corrected&&answer===item.root&&checked;if(pass)setSuccess(v=>v+1);push(pass?'CLEAR':'ALARM',pass?`${item.id}: simulated fix validated, communication restored`:`${item.id}: retest failed; verify diagnosis and correction`)};
 const packet=item.protocol==='MMS'?['TCP 102 | MMS association: '+(item.id==='DC-01'&&!resolved?'DOWN':'UP'),'Report Control Block: '+(item.id==='DC-02'&&!resolved?'DISABLED':'ENABLED'),'Quality: '+(resolved?'GOOD':'SUSPECT / STALE')]:item.protocol==='GOOSE'?['EtherType 0x88B8 | Multicast GOOSE','VLAN / confRev: '+(resolved?'MATCH':'MISMATCH'),'Subscriber status: '+(resolved?'VALID':'INVALID')]:item.protocol==='IEC104'?['TCP 2404 | IEC 60870-5-104','IOA mapping: '+(resolved?'MATCH':'INCORRECT'),'RCC indication: '+(resolved?'UPDATED':'MISMATCH')]:['PRP LAN A: '+(resolved?'UP':'DOWN'),'PRP LAN B: UP','Redundancy: '+(resolved?'HEALTHY':'DEGRADED')];
 const visible=history.filter(x=>filter==='ALL'||x.severity===filter);
 const print=()=>{const safe=(v:string)=>v.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');const html=`<!doctype html><html><head><title>Commissioning Diagnostic Assessment</title><style>body{font:13px Arial;margin:30px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #999;padding:8px;text-align:left}</style></head><body><h1>SAS Commissioning Diagnostics — Training Report</h1><p>Scenario: ${safe(item.title)} | Retests: ${runs} | Passed: ${success} | Date: ${safe(new Date().toLocaleString())}</p><p>Training simulation only — no live field verification.</p><table><tr><th>Time</th><th>Severity</th><th>Event</th></tr>${history.map(e=>`<tr><td>${safe(e.time)}</td><td>${safe(e.severity)}</td><td>${safe(e.message)}</td></tr>`).join('')}</table></body></html>`;const w=window.open('','_blank');if(!w){window.alert('Allow popups to print.');return}w.document.write(html);w.document.close();w.focus();setTimeout(()=>w.print(),250)};
 return <section className="mt-8 rounded-2xl border border-cyan-700/60 bg-[#091d31] p-4 md:p-6">
 <div className="flex flex-wrap items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase tracking-widest text-cyan-400">Commissioning • Browser Simulation</div><h2 className="mt-2 text-2xl font-extrabold text-white">Real-Time Commissioning Troubleshooting Simulator</h2><p className="mt-2 text-sm text-slate-300">Interactive diagnostic states and generated protocol evidence. Not connected to live equipment.</p></div><button type="button" onClick={()=>setGuide(true)} className="rounded-lg border border-cyan-600 px-4 py-2 text-sm text-cyan-200">? How to Use</button></div>
 <div className="mt-5 grid gap-3 md:grid-cols-3">{[['IED / Station Bus',item.id==='DC-01'&&!resolved?'OFFLINE':'ONLINE'],['SCADA / MMS',item.protocol==='MMS'&&!resolved?'ALARM':'ONLINE'],['Gateway / RCC',item.id==='DC-05'&&!resolved?'POINT MISMATCH':'CONNECTED']].map(([name,status])=><div key={name} className="rounded-xl border border-[#28516a] bg-[#071726] p-4"><div className="text-xs text-slate-400">{name}</div><div className={`mt-2 font-bold ${status==='ONLINE'||status==='CONNECTED'?'text-emerald-300':'text-amber-300'}`}>{status}</div></div>)}</div>
 <div className="mt-5 grid gap-4 lg:grid-cols-2">
 <div className="space-y-4"><div className="rounded-xl border border-[#28516a] bg-[#071726] p-4"><label className="text-sm font-bold text-cyan-200">Fault Scenario<select value={scenario} onChange={e=>choose(e.target.value)} className="mt-2 block w-full rounded-lg border border-[#28516a] bg-[#0c293e] p-2 text-white">{diagnosticScenarios.map(x=><option key={x.id} value={x.id}>{x.id} — {x.title}</option>)}</select></label><p className="mt-3 text-sm text-slate-200"><strong>Symptom:</strong> {item.symptom}</p><p className="mt-2 text-xs text-amber-200">Fault injected: {item.fault}</p></div>
 <div className="rounded-xl border border-[#28516a] bg-[#071726] p-4"><h3 className="font-bold text-cyan-200">Troubleshooting Workflow</h3><p className="mt-2 text-xs text-slate-400">1. Diagnose → 2. Apply simulated correction → 3. Retest</p><div className="mt-3 space-y-2">{item.choices.map(c=><label key={c.id} className="flex items-center gap-2 text-sm text-slate-200"><input type="radio" checked={answer===c.id} onChange={()=>{setAnswer(c.id);setChecked(false);setCorrected(false)}} name={'diag-'+item.id}/>{c.label}</label>)}</div><button type="button" disabled={!answer} onClick={diagnose} className="mt-3 rounded-lg border border-cyan-500 px-3 py-2 text-sm text-cyan-200 disabled:opacity-40">Check Diagnosis</button>{checked&&<p role="status" className={`mt-2 text-sm ${answer===item.root?'text-emerald-300':'text-amber-300'}`}>{answer===item.root?'Correct diagnosis. Apply the simulated fix.':'Incorrect diagnosis. Review the symptom and protocol evidence.'}</p>}<label className="mt-3 flex items-center gap-2 text-sm text-slate-200"><input type="checkbox" disabled={!checked||answer!==item.root} checked={corrected} onChange={e=>setCorrected(e.target.checked)}/>Apply: {item.fix}</label><button type="button" onClick={retest} className="mt-4 rounded-lg bg-cyan-500 px-4 py-2 text-sm font-bold text-[#052034]">Run Retest</button></div></div>
 <div className="space-y-4"><div className="rounded-xl border border-[#28516a] bg-[#071726] p-4"><h3 className="font-bold text-cyan-200">Simulated {item.protocol} Protocol Analyzer</h3><div className="mt-3 space-y-2 font-mono text-xs text-slate-200">{packet.map((p,i)=><div key={i} className="rounded bg-[#0c293e] p-3">{p}</div>)}</div><p className="mt-3 text-xs text-slate-400">Illustrative protocol fields only; not captured network packets.</p></div><div className="rounded-xl border border-[#28516a] bg-[#071726] p-4"><h3 className="font-bold text-cyan-200">Performance</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center">{[['Retests',runs],['Passed',success],['Success Rate',runs?`${Math.round(success/runs*100)}%`:'—']].map(([label,val])=><div key={label} className="rounded bg-[#0c293e] p-2"><div className="text-xl font-bold text-white">{val}</div><div className="text-xs text-slate-400">{label}</div></div>)}</div><button type="button" onClick={print} className="mt-3 rounded-lg border border-cyan-500 px-3 py-2 text-sm text-cyan-200">Print Assessment / Save PDF</button></div></div></div>
 <div className="mt-5 rounded-xl border border-[#28516a] bg-[#071726] p-4"><div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold text-cyan-200">Event & SOE Viewer</h3><select aria-label="Filter event severity" value={filter} onChange={e=>setFilter(e.target.value)} className="rounded border border-[#28516a] bg-[#0c293e] p-2 text-sm text-white">{['ALL','ALARM','WARNING','INFO','CLEAR'].map(x=><option key={x}>{x}</option>)}</select></div><div className="mt-3 max-h-56 space-y-2 overflow-y-auto">{visible.length?visible.map((e,i)=><div key={i} className="flex flex-wrap gap-2 rounded bg-[#0c293e] p-2 text-xs text-slate-200"><span className="text-slate-400">{e.time}</span><strong className={e.severity==='ALARM'?'text-rose-300':'text-cyan-300'}>{e.severity}</strong><span>{e.message}</span></div>):<p className="text-sm text-slate-400">Select a fault or run a test to generate simulated events.</p>}</div></div>
 {guide&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setGuide(false)}}><div role="dialog" aria-modal="true" aria-label="Troubleshooting simulator help" className="w-full max-w-lg rounded-xl border border-cyan-600 bg-[#0a2237] p-6 text-slate-100"><div className="flex justify-between gap-3"><h3 className="text-xl font-bold">How to Use</h3><button type="button" onClick={()=>setGuide(false)} aria-label="Close" className="rounded border border-cyan-700 px-2">✕</button></div><ol className="mt-4 list-decimal space-y-2 pl-5 text-sm leading-7"><li>Select one of the six fault scenarios.</li><li>Inspect the device dashboard, symptom and protocol evidence.</li><li>Select a root cause and check the diagnosis.</li><li>Apply the simulated fix and run a retest.</li><li>Review SOE events and print the assessment report.</li></ol><p className="mt-3 text-xs text-amber-200">Simulation only; never bypass protection interlocks on live equipment.</p></div></div>}
 </section>;
};

export const FatSatLabPage: React.FC = () => {
  const [open, setOpen] = useState<number[]>([0]);
  const toggle = (index: number) => setOpen((current) => current.includes(index) ? current.filter((n) => n !== index) : [...current, index]);
  return (
    <div className="min-h-screen bg-[#050e1c] px-4 py-7 text-slate-100 md:px-8">
      <header className="mx-auto max-w-6xl rounded-2xl border border-cyan-800/60 bg-[#0a2237] p-6 md:p-9">
        <div className="flex items-center gap-2 text-sm font-bold tracking-widest text-cyan-400"><BookOpen size={19}/> SAS ENGINEERING HUB / FAT & SAT LEARNING</div>
        <h1 className="mt-4 text-2xl font-extrabold md:text-4xl">FAT / SAT — Complete Step-by-Step Guide</h1>
        <p className="mt-3 max-w-4xl text-slate-300">Substation Automation System commissioning ని starting నుంచి final handover వరకు, practical engineering sequence లో తెలుసుకుందాం. ఇది learning guide మాత్రమే; actual site tests approved procedures and qualified supervision లో చేయాలి.</p>
        <div className="mt-5 flex flex-wrap gap-3 text-sm">
          <span className="rounded-lg border border-cyan-700 bg-[#10334a] px-3 py-2">4 phases</span>
          <span className="rounded-lg border border-cyan-700 bg-[#10334a] px-3 py-2">18 sequential steps</span>
          <span className="rounded-lg border border-cyan-700 bg-[#10334a] px-3 py-2">Documents → FAT → SAT → Handover</span>
        </div>
      </header>
      <main className="mx-auto mt-6 max-w-6xl">
        <section className="mb-6 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-cyan-800/60 bg-[#0a2237] p-5"><h2 className="text-lg font-bold text-cyan-300">FAT అంటే ఏమిటి?</h2><p className="mt-2 leading-7 text-slate-300"><strong>Factory Acceptance Test:</strong> Panels, IED configuration, communications, SCADA, GOOSE, alarms, controls వంటి engineered functions ని factory/lab setup లో approved test cases తో verify చేస్తాం. Shipping/site installation కు ముందు design defects గుర్తించడం ప్రధాన purpose.</p></div>
          <div className="rounded-xl border border-cyan-800/60 bg-[#0a2237] p-5"><h2 className="text-lg font-bold text-cyan-300">SAT అంటే ఏమిటి?</h2><p className="mt-2 leading-7 text-slate-300"><strong>Site Acceptance Test:</strong> Equipment install చేసిన తరువాత actual field wiring, network, SCADA/RCC integration, control interlocks and end-to-end signals ని site లో safely verify చేస్తాం. FAT pass అయినా SAT తప్పనిసరిగా ఉండవచ్చు.</p></div>
        </section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-bold text-white"><ClipboardCheck className="text-cyan-400"/> Starting to Ending — Point by Point</h2>
          <div className="flex gap-2"><button type="button" className="rounded-lg border border-cyan-700 px-3 py-2 text-sm text-cyan-200 hover:bg-[#123a51]" onClick={() => setOpen(phases.map((_, i) => i))}>Expand All</button><button type="button" className="rounded-lg border border-cyan-700 px-3 py-2 text-sm text-cyan-200 hover:bg-[#123a51]" onClick={() => setOpen([])}>Collapse All</button></div>
        </div>
        <div className="space-y-4">
          {phases.map((phase, i) => <section key={phase.title} className="overflow-hidden rounded-xl border border-cyan-800/60 bg-[#091d31]">
            <button type="button" onClick={() => toggle(i)} aria-expanded={open.includes(i)} className="flex w-full items-center justify-between gap-4 p-5 text-left hover:bg-[#12344a]">
              <span><span className="block text-lg font-bold text-cyan-300">{phase.title}</span><span className="mt-1 block text-sm leading-6 text-slate-300">{phase.description}</span></span><ChevronDown className={`shrink-0 text-cyan-300 transition-transform ${open.includes(i) ? 'rotate-180' : ''}`}/>
            </button>
            {open.includes(i) && <div className="space-y-4 border-t border-cyan-900 p-4 md:p-6">
              {phase.steps.map((step) => <article key={step.title} className="rounded-xl border border-[#1b4863] bg-[#071726] p-4 md:p-5">
                <h3 className="text-base font-bold text-white md:text-lg">{step.title}</h3>
                <p className="mt-2 leading-7 text-slate-300"><span className="font-semibold text-cyan-300">Why:</span> {step.why}</p>
                <h4 className="mt-4 font-semibold text-cyan-300">What we do — step by step</h4>
                <ol className="mt-2 list-decimal space-y-2 pl-6 leading-7 text-slate-200">{step.actions.map((action, j) => <li key={j}>{action}</li>)}</ol>
                {(() => {
                  const stepNumber = Number(step.title.match(/^\d+/)?.[0] ?? '0');
                  const p = practical[stepNumber - 1];
                  return p ? <div className="mt-4 space-y-3 rounded-lg border border-cyan-800/70 bg-[#0b2539] p-4">
                    <h4 className="font-bold text-cyan-300">Practical Substation Example & Engineering Test</h4>
                    <p className="leading-7 text-slate-200"><strong className="text-white">Real-world example:</strong> {p.example}</p>
                    <p className="leading-7 text-slate-200"><strong className="text-white">Tools / Documents:</strong> {p.tools}</p>
                    <p className="leading-7 text-slate-200"><strong className="text-white">Test procedure:</strong> {p.procedure}</p>
                    <p className="leading-7 text-slate-200"><strong className="text-white">Expected result:</strong> {p.expected}</p>
                  </div> : null;
                })()}
                <p className="mt-4 flex items-start gap-2 rounded-lg border border-emerald-800/50 bg-[#092a2a] p-3 text-sm leading-6 text-emerald-200"><CheckCircle2 className="mt-1 shrink-0" size={16}/><span><strong>Evidence / Output:</strong> {step.evidence}</span></p>
              </article>)}
            </div>}
          </section>)}
        </div>
        <FatSatInteractiveLab />
        <SignalEndToEndLab />
        <VirtualFatSatTestBench />
        <AdvancedFaultInjectionLab />
        <FatSatProfessionalReport />
        <GuidedCommissioningTraining />
        <CommissioningDiagnostics />
        <aside className="mt-6 rounded-xl border border-amber-700/50 bg-[#251f13] p-5"><h2 className="flex items-center gap-2 font-bold text-amber-300"><ShieldCheck size={20}/> Important Safety & Interview Note</h2><p className="mt-2 leading-7 text-slate-200">FAT లో simulated inputs వాడవచ్చు; SAT లో actual field equipment interfaces verify చేస్తాం. Protection trip, breaker close/open, interlock and redundancy tests approved isolation, permits and authorized personnel తోనే perform చేయాలి. FAT/SAT scope project-to-project మారుతుంది. Interview లో మీరు personally చేసిన tests మరియు training-only tests వేరుగా చెప్పండి.</p></aside>
      </main>
    </div>
  );
};
