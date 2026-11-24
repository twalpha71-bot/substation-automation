import type { BayEquipment, GooseControlBlock, InstantiatedSasSignal, MultiVendorIed } from '../types/substation';

export type SignalChainFaultMode = 'NONE' | 'DI_INPUT_FAIL' | 'WRONG_IEC_REF' | 'DATASET_MISSING'
  | 'REPORT_DISABLED' | 'GOOSE_TIMEOUT' | 'MMS_DISCONNECT' | 'BAD_QUALITY' | 'HMI_TAG_MISMATCH';

export interface FaultDataset { ref: string; members: Array<{ ref: string; fc: string }> }
export interface FaultReport { name: string; dataset: string; buffered: boolean }
export interface FaultConfiguration {
  source: string;
  datasets: FaultDataset[];
  reports: FaultReport[];
  // Imported SCL must explicitly contain a publisher and a bound subscriber.
  goose?: Array<{ name: string; dataset: string; sources: string[] }>;
}
export type TroubleshootingStage = 'Field I/O' | 'Input Module' | 'IED' | 'Station Bus' | 'Gateway' | 'SCADA / HMI';

export interface FaultTroubleshootingStep {
  step: number;
  stage: TroubleshootingStage;
  action: string;
  tool: string;
  expectedCheck: string;
}

export interface FaultTroubleshootingGuide {
  symptomSummary: string;
  probableCauses: string[];
  steps: FaultTroubleshootingStep[];
  verificationCheck: string;
}

export interface IedFaultScenario {
  id: string;
  mode: Exclude<SignalChainFaultMode, 'NONE'>;
  label: string;
  lcdText: string;
  ledBadge: string;
  tripsBreaker?: boolean;
  troubleshooting: FaultTroubleshootingGuide;
  targetId: string;
  affectedIds: string[];
  evidence: string;
  recovery: string;
  projectedValue?: InstantiatedSasSignal['value'];
  projectedQuality?: InstantiatedSasSignal['quality'];
  dataset?: string;
  reportName?: string;
  gooseBlockId?: string;
}
export interface IedFaultInjection {
  scenario: IedFaultScenario;
  injectedAt: string;
  snapshots: Record<string, { value: InstantiatedSasSignal['value']; timestamp: string }>;
}

const cleanRef = (ref: string) => ref.replace(/\[[^\]]*\]/g, '').replace(/\$(?:BR|RP|GO)\$/g, '.').replace(/\$/g, '.');
const datasetRef = (iedName: string, ld: string, name: string, ln = 'LLN0') => `${iedName}${ld}/${ln}.${name}`;
const ownsMember = (point: InstantiatedSasSignal, member: { ref: string; fc: string }) => {
  const pointRef = cleanRef(point.iec61850Ref);
  const ref = cleanRef(member.ref);
  return point.fc === member.fc && (pointRef === ref || pointRef.startsWith(`${ref}.`));
};
export const datasetPoints = (dataset: FaultDataset, points: InstantiatedSasSignal[]) =>
  points.filter(point => cleanRef(point.datasetRef) === cleanRef(dataset.ref) && dataset.members.some(member => ownsMember(point, member)));

export function runtimeFaultConfiguration(ied: MultiVendorIed): FaultConfiguration {
  const datasets = ied.datasets.map(ds => ({
    ref: datasetRef(ied.name, ds.ldInst, ds.name),
    members: ds.fcdas.map(f => ({
      ref: `${ied.name}${f.ldInst}/${f.lnClass}${f.lnInst}.${f.doName}${f.daName ? `.${f.daName}` : ''}`, fc: f.fc,
    })),
  }));
  return {
    source: 'Configured IED signals, DataSets, RCBs and GOOSE bindings', datasets,
    reports: ied.rcbs.flatMap(rcb => {
      // rptId contains the owning LD. Do not bind equal DataSet names in another LD.
      const owner = rcb.rptId.replace(`${ied.name}/`, ied.name).split('/')[0];
      const ds = datasets.find(candidate => candidate.ref === `${owner}/LLN0.${rcb.datSet}`);
      return ds ? [{ name: rcb.name, dataset: ds.ref, buffered: rcb.buffered }] : [];
    }),
  };
}

/** Read only exact named IEDs; ICD TEMPLATEs and unrelated SCL cannot add capabilities. */
export function readFaultScl(xml: string, fileName: string): Record<string, FaultConfiguration> {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  const all = (el: Document | Element, tag: string) => Array.from(el.getElementsByTagNameNS('*', tag));
  if (all(doc, 'parsererror').length || doc.documentElement.localName !== 'SCL') return {};
  const attr = (el: Element, name: string) => el.getAttribute(name) || '';
  const lnName = (el: Element) => el.localName === 'LN0' ? 'LLN0' : `${attr(el, 'prefix')}${attr(el, 'lnClass')}${attr(el, 'inst')}`;
  const result: Record<string, FaultConfiguration> = {};
  for (const ied of all(doc, 'IED')) {
    const name = attr(ied, 'name');
    if (!name || name === 'TEMPLATE') continue;
    const config: FaultConfiguration = { source: fileName, datasets: [], reports: [], goose: [] };
    // Duplicate names are ambiguous: fail closed for that IED.
    if (result[name]) { result[name] = { source: `${fileName} (duplicate IED name)`, datasets: [], reports: [], goose: [] }; continue; }
    for (const ld of all(ied, 'LDevice')) {
      const inst = attr(ld, 'inst');
      for (const ln of [...all(ld, 'LN0'), ...all(ld, 'LN')]) {
        const owner = lnName(ln);
        for (const ds of Array.from(ln.children).filter(el => el.localName === 'DataSet')) {
          config.datasets.push({ ref: datasetRef(name, inst, attr(ds, 'name'), owner), members: all(ds, 'FCDA').map(f => ({
            ref: `${name}${attr(f, 'ldInst') || inst}/${attr(f, 'prefix')}${attr(f, 'lnClass')}${attr(f, 'lnInst')}.${attr(f, 'doName')}${attr(f, 'daName') ? `.${attr(f, 'daName')}` : ''}`,
            fc: attr(f, 'fc'),
          })) });
        }
        const resolveDataset = (value: string) => value.includes('/') ? cleanRef(value) : datasetRef(name, inst, value, owner);
        for (const rc of Array.from(ln.children).filter(el => el.localName === 'ReportControl')) {
          config.reports.push({ name: attr(rc, 'name'), dataset: resolveDataset(attr(rc, 'datSet')), buffered: attr(rc, 'buffered') === 'true' });
        }
        for (const gc of Array.from(ln.children).filter(el => el.localName === 'GSEControl')) {
          const sources = all(doc, 'ExtRef').filter(ref => attr(ref, 'iedName') === name &&
            attr(ref, 'serviceType') === 'GOOSE' && attr(ref, 'srcLDInst') === inst &&
            attr(ref, 'srcCBName') === attr(gc, 'name') && !!attr(ref, 'intAddr')).map(ref =>
            `${name}${attr(ref, 'ldInst')}/${attr(ref, 'prefix')}${attr(ref, 'lnClass')}${attr(ref, 'lnInst')}.${attr(ref, 'doName')}${attr(ref, 'daName') ? `.${attr(ref, 'daName')}` : ''}`);
          config.goose!.push({ name: attr(gc, 'name'), dataset: resolveDataset(attr(gc, 'datSet')), sources });
        }
      }
    }
    result[name] = config;
  }
  return result;
}

interface IedFaultTemplate {
  id: string;
  catalogNumbers: number[];
  mode: Exclude<SignalChainFaultMode, 'NONE'>;
  title: string;
  lcdText: string;
  ledBadge: string;
  tripsBreaker?: boolean;
  projectedValue: InstantiatedSasSignal['value'];
  projectedQuality: InstantiatedSasSignal['quality'];
  recovery: string;
  affectAllMms?: boolean;
  useGooseBlock?: boolean;
}

const LINE_DISTANCE_FAULTS: IedFaultTemplate[] = [
  { id: '21_DIST_Z1', lcdText: '21 DIST Z1 TRIP', ledBadge: '21 DIST FAULT', tripsBreaker: true, catalogNumbers: [22], mode: 'BAD_QUALITY', title: '21 Distance Zone Trip (PDIS1.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Inspect line fault locator, clear Zone-1 trip, and reset 86 lockout.' },
  { id: '50_51_OC', lcdText: '50/51 O/C TRIP', ledBadge: 'OVERCURRENT FAULT', tripsBreaker: true, catalogNumbers: [17, 16], mode: 'BAD_QUALITY', title: '50/51 Overcurrent Backup Trip (PTOC1.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Verify phase fault currents (MMXU1.A), clear 50/51 trip, and reset relay.' },
  { id: '50N_51N_EF', lcdText: '50N/51N E/F TRIP', ledBadge: 'EARTH FAULT', tripsBreaker: true, catalogNumbers: [19, 18], mode: 'BAD_QUALITY', title: '50N/51N Earth Fault Trip (PTOC2.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Verify neutral/residual current, clear earth fault trip, and restore bay.' },
  { id: '50BF_GOOSE', lcdText: '50BF INTERTRIP', ledBadge: '50BF BKR FAIL', tripsBreaker: true, catalogNumbers: [26], mode: 'GOOSE_TIMEOUT', title: '50BF Breaker Failure Intertrip — GOOSE (RBRF1.OpEx)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Check breaker trip coil & busbar GOOSE subscribers; reset 50BF initiation.', useGooseBlock: true },
  { id: '79_AR_LOCKOUT', lcdText: '79 A/R LOCKOUT', ledBadge: '79 LOCKOUT', tripsBreaker: false, catalogNumbers: [27], mode: 'BAD_QUALITY', title: '79 Auto-Reclose Lockout (RREC1.AutoRecSt)', projectedValue: 'LOCKOUT (79)', projectedQuality: 'QUESTIONABLE', recovery: 'Verify permanent line fault clearance and reset ANSI 79 auto-reclose lockout.' },
  { id: '86_LOCKOUT', lcdText: '86 MASTER TRIP', ledBadge: '86 LATCHED', tripsBreaker: true, catalogNumbers: [4, 28], mode: 'DI_INPUT_FAIL', title: '86 Master Trip Lockout (PTRC1.Tr)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Reset ANSI 86 lockout relay after verifying protection trip cause.' },
  { id: 'TCS_ALARM', lcdText: 'TCS COIL FAIL', ledBadge: 'TCS ALARM', tripsBreaker: false, catalogNumbers: [9], mode: 'DI_INPUT_FAIL', title: 'TCS — Trip Circuit Supervision Fail (SPTR1.TcsAlm)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Check 110V DC trip coil continuity, fuses, and 52a/52b auxiliary contacts.' },
  { id: 'GOOSE_PRP_FAIL', lcdText: 'GOOSE/PRP FAIL', ledBadge: 'COMM TIMEOUT', tripsBreaker: false, catalogNumbers: [48, 47], mode: 'MMS_DISCONNECT', title: 'GOOSE / PRP Communication Timeout (LGOS1.St)', projectedValue: 'TIMEOUT / FAIL', projectedQuality: 'INVALID', recovery: 'Inspect PRP LAN A/B fiber links, switch ports, and GOOSE TAL supervision.', affectAllMms: true },
];

const TRANSFORMER_DIFF_FAULTS: IedFaultTemplate[] = [
  { id: '87T_DIFF', lcdText: '87T DIFF TRIP', ledBadge: '87T DIFF FAULT', tripsBreaker: true, catalogNumbers: [20], mode: 'BAD_QUALITY', title: '87T Transformer Differential Trip (PDIF1.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Perform transformer DGA & winding checks before resetting 87T differential trip.' },
  { id: '64REF_TRIP', lcdText: '64REF E/F TRIP', ledBadge: '64REF FAULT', tripsBreaker: true, catalogNumbers: [21], mode: 'BAD_QUALITY', title: '64REF Restricted Earth Fault Trip (PDIF2.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Check neutral CT circuit & HV/LV winding earth insulation before re-energizing.' },
  { id: 'BUCHHOLZ_TRIP', lcdText: 'BUCHHOLZ TRIP', ledBadge: 'BUCHHOLZ GAS', tripsBreaker: true, catalogNumbers: [44], mode: 'DI_INPUT_FAIL', title: 'Buchholz Gas Alarm / Trip (SIML1.GasInsAlm)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Inspect Buchholz relay gas chamber, oil level, and bleed/sample gas.' },
  { id: 'WTI_OTI_TRIP', lcdText: 'WTI/OTI HI-HI', ledBadge: 'THERMAL TRIP', tripsBreaker: true, catalogNumbers: [42, 41], mode: 'BAD_QUALITY', title: 'WTI / OTI High-High Temperature Trip (SPTR1.HPTmp)', projectedValue: 118, projectedQuality: 'QUESTIONABLE', recovery: 'Verify cooling fans/pumps (CCGR1) and RTD thermal sensor health.' },
  { id: 'PRV_TRIP', lcdText: 'PRV TANK TRIP', ledBadge: 'PRV OPERATED', tripsBreaker: true, catalogNumbers: [45], mode: 'DI_INPUT_FAIL', title: 'PRV — Pressure Relief Valve Trip (SPTR1.PresRelTrp)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Inspect transformer tank pressure relief microswitch and reset mechanical flag.' },
  { id: '86T_LOCKOUT', lcdText: '86T LOCKOUT', ledBadge: '86T LATCHED', tripsBreaker: true, catalogNumbers: [4, 28], mode: 'DI_INPUT_FAIL', title: '86T Master Trip Lockout (PTRC1.Tr)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Clear all transformer protection flags and manually reset 86T master lockout.' },
  { id: '50BF_TX', lcdText: '50BF TX TRIP', ledBadge: '50BF BKR FAIL', tripsBreaker: true, catalogNumbers: [26], mode: 'GOOSE_TIMEOUT', title: '50BF HV/LV Breaker Failure Intertrip (RBRF1.OpEx)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Verify HV & LV breaker opening via GOOSE intertrip and clear 50BF timer.', useGooseBlock: true },
  { id: 'OLTC_TAP_INVALID', lcdText: 'OLTC TAP ERR', ledBadge: 'OLTC OUT-OF-STEP', tripsBreaker: false, catalogNumbers: [43, 47], mode: 'WRONG_IEC_REF', title: 'OLTC Tap Position Invalid / Out-of-Step (YLTC1.TapPos)', projectedValue: 'OUT-OF-STEP', projectedQuality: 'INVALID', recovery: 'Verify OLTC BCD/mA tap transmitter wiring and AVR step-by-step control.' },
];

const FEEDER_PROTECTION_FAULTS: IedFaultTemplate[] = [
  { id: '50_51_OC', lcdText: '50/51 O/C TRIP', ledBadge: 'OVERCURRENT FAULT', tripsBreaker: true, catalogNumbers: [17, 16], mode: 'BAD_QUALITY', title: '50/51 Overcurrent Protection Trip (PTOC1.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Inspect feeder fault current record, clear 50/51 trip, and reset target.' },
  { id: '50N_51N_EF', lcdText: '50N/51N E/F TRIP', ledBadge: 'EARTH FAULT', tripsBreaker: true, catalogNumbers: [19, 18], mode: 'BAD_QUALITY', title: '50N/51N Earth Fault Protection Trip (PTOC2.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Check residual earth current and cable insulation before closing feeder CB.' },
  { id: '50BF_GOOSE', lcdText: '50BF INTERTRIP', ledBadge: '50BF BKR FAIL', tripsBreaker: true, catalogNumbers: [26], mode: 'GOOSE_TIMEOUT', title: '50BF Breaker Failure Intertrip — GOOSE (RBRF1.OpEx)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Verify upstream incomer/bus-coupler GOOSE Rx and breaker trip mechanism.', useGooseBlock: true },
  { id: '86_LOCKOUT', lcdText: '86 MASTER TRIP', ledBadge: '86 LATCHED', tripsBreaker: true, catalogNumbers: [4, 28], mode: 'DI_INPUT_FAIL', title: '86 Master Trip Lockout (PTRC1.Tr)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Verify protection fault cleared and reset ANSI 86 lockout indication.' },
  { id: '79_AR_LOCKOUT', lcdText: '79 A/R LOCKOUT', ledBadge: '79 LOCKOUT', tripsBreaker: false, catalogNumbers: [27], mode: 'BAD_QUALITY', title: '79 Auto-Reclose Lockout (RREC1.AutoRecSt)', projectedValue: 'LOCKOUT (79)', projectedQuality: 'QUESTIONABLE', recovery: 'Confirm permanent feeder fault isolation and reset ANSI 79 lockout.' },
  { id: 'TCS_ALARM', lcdText: 'TCS COIL FAIL', ledBadge: 'TCS ALARM', tripsBreaker: false, catalogNumbers: [9], mode: 'DI_INPUT_FAIL', title: 'TCS — Trip Circuit Supervision Fail (SPTR1.TcsAlm)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Check 110V DC trip circuit MCB, trip coil resistance, and 52a/52b wiring.' },
  { id: 'CB_POS_INVALID', lcdText: 'CB POS 00/11', ledBadge: '52a/52b INVALID', tripsBreaker: false, catalogNumbers: [1], mode: 'DI_INPUT_FAIL', title: '52a/52b CB Position Invalid 00/11 (XCBR1.Pos)', projectedValue: 'INVALID (11)', projectedQuality: 'INVALID', recovery: 'Check 52a/52b auxiliary switch contacts and DI module channel health.' },
  { id: 'PRP_GOOSE_FAIL', lcdText: 'PRP/GOOSE FAIL', ledBadge: 'COMM TIMEOUT', tripsBreaker: false, catalogNumbers: [48, 47], mode: 'MMS_DISCONNECT', title: 'PRP / GOOSE Subscription Timeout (LGOS1.St)', projectedValue: 'TIMEOUT / FAIL', projectedQuality: 'INVALID', recovery: 'Check Hirschmann PRP LAN A/B links, GOOSE AppID/VLAN 20, and MMS TCP:102.', affectAllMms: true },
];

const LV_INCOMER_FAULTS: IedFaultTemplate[] = [
  { id: '50_51_INC', lcdText: '50/51 O/C TRIP', ledBadge: 'OVERCURRENT FAULT', tripsBreaker: true, catalogNumbers: [17, 16], mode: 'BAD_QUALITY', title: '50/51 LV Incomer Overcurrent Trip (PTOC1.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Verify LV busbar/incomer fault current and reset 50/51 protection target.' },
  { id: '50N_51N_INC', lcdText: '50N/51N E/F TRIP', ledBadge: 'EARTH FAULT', tripsBreaker: true, catalogNumbers: [19, 18], mode: 'BAD_QUALITY', title: '50N/51N Earth Fault Trip (PTOC2.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Check neutral earthing current and clear earth fault trip before reclosing.' },
  { id: '27_UV_TRIP', lcdText: '27 U/V TRIP', ledBadge: 'UNDERVOLTAGE', tripsBreaker: true, catalogNumbers: [23, 24], mode: 'BAD_QUALITY', title: '27 Under Voltage Protection Trip (PTUV1.Op)', projectedValue: true, projectedQuality: 'QUESTIONABLE', recovery: 'Verify bus VT secondary voltage (MMXU1.PPV) and upstream transformer supply.' },
  { id: '50BF_INC', lcdText: '50BF INTERTRIP', ledBadge: '50BF BKR FAIL', tripsBreaker: true, catalogNumbers: [26], mode: 'GOOSE_TIMEOUT', title: '50BF Breaker Failure Intertrip — GOOSE (RBRF1.OpEx)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Check HV breaker intertrip GOOSE path and reset 50BF lockout.', useGooseBlock: true },
  { id: '86_INC_LOCKOUT', lcdText: '86 MASTER TRIP', ledBadge: '86 LATCHED', tripsBreaker: true, catalogNumbers: [4, 28], mode: 'DI_INPUT_FAIL', title: '86 Master Trip Lockout (PTRC1.Tr)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Reset ANSI 86 master trip lockout after clearing incomer protection trip.' },
  { id: 'TX_INTERTRIP', lcdText: 'TX INTERTRIP', ledBadge: 'BUCHHOLZ/WTI', tripsBreaker: true, catalogNumbers: [44, 42, 28], mode: 'DI_INPUT_FAIL', title: 'Buchholz / WTI Transformer Intertrip (SIML1.GasInsAlm)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Verify upstream power transformer mechanical trips (Buchholz/WTI/PRV).' },
  { id: 'CB_POS_INVALID', lcdText: 'CB POS 00/11', ledBadge: '52a/52b INVALID', tripsBreaker: false, catalogNumbers: [1], mode: 'DI_INPUT_FAIL', title: '52a/52b CB Position Invalid 00/11 (XCBR1.Pos)', projectedValue: 'INVALID (00)', projectedQuality: 'INVALID', recovery: 'Inspect 52a/52b breaker auxiliary contacts and 110V DC wetting supply.' },
  { id: 'MMS_COMM_LOSS', lcdText: 'MMS LINK LOSS', ledBadge: 'COMM FAILURE', tripsBreaker: false, catalogNumbers: [47, 48], mode: 'MMS_DISCONNECT', title: 'MMS / IED Communication Health Loss (LPHD1.PhyHealth)', projectedValue: 'COMM LOSS', projectedQuality: 'INVALID', recovery: 'Restore IEC 61850 MMS TCP:102 association and verify PRP LAN A/B uplinks.', affectAllMms: true },
];

const BUS_COUPLER_FAULTS: IedFaultTemplate[] = [
  { id: 'CILO_BLOCKED', lcdText: 'CILO BLOCKED', ledBadge: 'INTERLOCK ERR', tripsBreaker: false, catalogNumbers: [14], mode: 'HMI_TAG_MISMATCH', title: 'CILO Interlocking Permissive Violation (CILO1.EnaCls)', projectedValue: false, projectedQuality: 'QUESTIONABLE', recovery: 'Check busbar earth switch & disconnector GOOSE interlocking conditions.' },
  { id: 'CB_POS_DISC', lcdText: 'CB POS 00/11', ledBadge: '52a/52b INVALID', tripsBreaker: false, catalogNumbers: [1], mode: 'DI_INPUT_FAIL', title: '52a/52b CB Position Discrepancy 00/11 (XCBR1.Pos)', projectedValue: 'INVALID (11)', projectedQuality: 'INVALID', recovery: 'Inspect bus-coupler CB 52a/52b auxiliary contacts and DI debounce card.' },
  { id: 'SF6_LOCKOUT', lcdText: 'SF6 STG-2 LOCK', ledBadge: 'SF6 LOW PRESS', tripsBreaker: false, catalogNumbers: [8], mode: 'DI_INPUT_FAIL', title: 'SF6 Gas Pressure Stage-2 Lockout (SIMG1.PresAlm)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Check SF6 density monitor gauge; breaker open/close blocked until refilled.' },
  { id: 'LOC_REM_MISMATCH', lcdText: 'LOCAL MODE', ledBadge: 'REM BLOCKED', tripsBreaker: false, catalogNumbers: [11], mode: 'HMI_TAG_MISMATCH', title: 'Local / Remote Mode Mismatch (CSWI1.Loc)', projectedValue: 'LOCAL (BLOCKED)', projectedQuality: 'QUESTIONABLE', recovery: 'Switch bay selector key to REMOTE (CSWI1.Loc = FALSE) for SCADA SBO.' },
  { id: 'DC_SUP_FAIL', lcdText: '110V DC FAIL', ledBadge: 'DC SUPPLY LOSS', tripsBreaker: false, catalogNumbers: [10, 50], mode: 'DI_INPUT_FAIL', title: '110V DC Control Supply Failure (GGIO1.DcSupFail)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Check 110V DC distribution MCB, battery charger alarm (ZBAT1), and bus voltage.' },
  { id: '50BF_BC', lcdText: '50BF BUS TRIP', ledBadge: '50BF BKR FAIL', tripsBreaker: true, catalogNumbers: [26], mode: 'GOOSE_TIMEOUT', title: '50BF Bus-Zone Breaker Failure Intertrip (RBRF1.OpEx)', projectedValue: true, projectedQuality: 'INVALID', recovery: 'Verify bus-zone GOOSE trip distribution and reset 50BF protection.', useGooseBlock: true },
  { id: 'MMS_GTW_LOSS', lcdText: 'MMS/GTW LOSS', ledBadge: 'COMM FAILURE', tripsBreaker: false, catalogNumbers: [47], mode: 'MMS_DISCONNECT', title: 'MMS Association / Gateway Link Loss (LPHD1.PhyHealth)', projectedValue: 'COMM LOSS', projectedQuality: 'INVALID', recovery: 'Restore MMS TCP:102 link to SCADA/Gateway and verify BRCB RptEna.', affectAllMms: true },
  { id: 'PTP_SYNC_LOST', lcdText: 'PTP SYNC LOST', ledBadge: 'CLOCK UNSYNC', tripsBreaker: false, catalogNumbers: [49], mode: 'BAD_QUALITY', title: 'PTP / SNTP Time Synchronization Lost (LTMS1.TmSyn)', projectedValue: false, projectedQuality: 'QUESTIONABLE', recovery: 'Check Meinberg IEEE 1588v2 Grandmaster lock and VLAN 40 PTP multicast.' },
];

function selectTemplatesForIed(ied: MultiVendorIed, bayType?: BayEquipment['bayType']): IedFaultTemplate[] {
  if (bayType === 'LINE_INCOMER') return LINE_DISTANCE_FAULTS;
  if (bayType === 'TRANSFORMER_HV' || bayType === 'DIST_TX_FEEDER') return TRANSFORMER_DIFF_FAULTS;
  if (bayType === 'TRANSFORMER_LV_INCOMER') return LV_INCOMER_FAULTS;
  if (bayType === 'BUS_COUPLER') return BUS_COUPLER_FAULTS;
  if (bayType === 'OUTGOING_FEEDER' || bayType === 'SPARE_FEEDER') return FEEDER_PROTECTION_FAULTS;

  const sig = `${ied.name} ${ied.model} ${ied.role}`.toLowerCase();
  if (/7sa|d60|distance|line/.test(sig)) return LINE_DISTANCE_FAULTS;
  if (/7ut|ret615|t60|p633|diff|transformer/.test(sig)) return TRANSFORMER_DIFF_FAULTS;
  if (/c264|rec615|coupler|controller/.test(sig)) return BUS_COUPLER_FAULTS;
  if (/inc/.test(sig)) return LV_INCOMER_FAULTS;
  return FEEDER_PROTECTION_FAULTS;
}


function buildTroubleshootingGuide(
  tpl: IedFaultTemplate,
  ied: MultiVendorIed,
  point: InstantiatedSasSignal,
  dsRef?: string,
  reportName?: string,
  gooseRef?: string
): FaultTroubleshootingGuide {
  const ref = point.iec61850Ref;
  const iedLabel = `${ied.vendor} ${ied.model} (${ied.name})`;
  const dsLabel = dsRef || point.datasetRef;
  const rcbLabel = reportName || point.rcbOrGooseRef;

  const byId: Record<string, FaultTroubleshootingGuide> = {
    '21_DIST_Z1': {
      symptomSummary: `Zone-1 Distance Protection operated on ${iedLabel}; CB tripped and 86 lockout latched.`,
      probableCauses: ['Overhead line phase-to-phase or phase-to-earth fault within 80% line length', 'VT secondary fuse blown causing false impedance drop (check 60FL)', 'Incorrect Z1 reach / line angle setting in IED'],
      steps: [
        { step: 1, stage: 'IED', action: `Read IED LCD & Fault Record (COMTRADE) for faulted phase, impedance (Ω), and fault distance (km).`, tool: 'IED LCD / DIGSI 5', expectedCheck: `${ref} = TRUE; Z1 fault loop & distance logged` },
        { step: 2, stage: 'Field I/O', action: 'Confirm 132 kV CB actually opened (52a = OPEN, 52b = CLOSED) and check SF6 pressure.', tool: 'Field Marshalling / SLD', expectedCheck: 'CB pole discrepancy = 0; 52a=0, 52b=1' },
        { step: 3, stage: 'Input Module', action: 'Verify 3-phase CT & VT secondary signals (MMXU1.A & MMXU1.PPV) for VT fuse fail.', tool: 'IED Measurements / Multimeter', expectedCheck: 'Balanced healthy VT voltage (110V L-L) after isolation' },
        { step: 4, stage: 'Station Bus', action: `Check BRCB (${rcbLabel}) & GOOSE intertrip frames on PRP LAN A/B.`, tool: 'IEDScout / Wireshark', expectedCheck: `DataSet ${dsLabel} delivered with stNum incremented` },
        { step: 5, stage: 'SCADA / HMI', action: 'Inspect line patrol clearance, reset ANSI 86 lockout, and verify SCADA alarm clears.', tool: 'SCADA / HMI Alarm List', expectedCheck: 'PTRC1.Tr = FALSE; Quality = GOOD (0x0000)' },
      ],
      verificationCheck: 'Fault record archived, line cleared, 86 reset, and PDIS1.Op returns FALSE with Quality GOOD.',
    },
    '50_51_OC': {
      symptomSummary: `Phase Overcurrent (50/51) protection tripped ${iedLabel}; breaker opened and 86 latched.`,
      probableCauses: ['Downstream feeder short-circuit / overload exceeding I> pickup', 'Wrong CT ratio or relay pickup setting', 'Spurious current injection during secondary testing'],
      steps: [
        { step: 1, stage: 'IED', action: 'Check IED front-panel LEDs & SOE log for 50 (Inst) vs 51 (IDMT) pickup and peak fault current (Ia/Ib/Ic).', tool: 'IED LCD / DIGSI 5 / PCM600', expectedCheck: `${ref} = TRUE with peak fault kA recorded` },
        { step: 2, stage: 'Field I/O', action: 'Confirm CB opened cleanly (52a=0, 52b=1) and inspect feeder cable termination/switchgear.', tool: 'Field I/O / Visual Check', expectedCheck: 'CB OPEN; no arc/flashover in switchgear compartment' },
        { step: 3, stage: 'Input Module', action: 'Verify CT shorting links are closed/open properly and check live phase currents (MMXU1.A).', tool: 'Clamp Meter / IED Measurements', expectedCheck: 'Post-trip phase currents = 0.0 A' },
        { step: 4, stage: 'Station Bus', action: `Confirm MMS report (${rcbLabel}) & GOOSE trip status reached SCADA and peer IEDs.`, tool: 'IEDScout / Wireshark', expectedCheck: `${dsLabel} transmitted on LAN A & LAN B` },
        { step: 5, stage: 'SCADA / HMI', action: 'Acknowledge SOE alarm, reset 86 lockout after feeder clearance, and close CB via SBO.', tool: 'SCADA / HMI', expectedCheck: 'PTOC1.Op = FALSE; CB CLOSED; Quality GOOD' },
      ],
      verificationCheck: 'Downstream fault isolated, 86 reset, and PTOC1.Op returns FALSE with Quality GOOD (0x0000).',
    },
    '50N_51N_EF': {
      symptomSummary: `Earth Fault (50N/51N) operated on ${iedLabel}; residual current (3I0) exceeded threshold.`,
      probableCauses: ['Single-phase-to-earth cable/insulator fault', 'Unbalanced CT secondary / open neutral CT connection', 'Core-Balance CT (CBCT) polarity or shield earthing issue'],
      steps: [
        { step: 1, stage: 'IED', action: 'Inspect IED fault log for residual current 3I0 / IN magnitude and tripping curve time.', tool: 'IED LCD / Vendor Tool', expectedCheck: `${ref} = TRUE; 3I0 > pickup setting` },
        { step: 2, stage: 'Field I/O', action: 'Check CBCT / neutral CT earthing and test feeder cable insulation resistance (IR / Megger).', tool: 'Insulation Tester (Megger)', expectedCheck: 'Cable IR > 100 MΩ before re-energization' },
        { step: 3, stage: 'Input Module', action: 'Verify CT neutral star-point wiring at terminal block X1 for loose links.', tool: 'Multimeter / Terminal Block', expectedCheck: 'CT neutral continuity < 0.5 Ω' },
        { step: 4, stage: 'Station Bus', action: `Verify MMS BRCB (${rcbLabel}) report delivery on PRP LAN A & B.`, tool: 'IEDScout', expectedCheck: 'Event timestamped within ±1 ms (PTP synced)' },
        { step: 5, stage: 'SCADA / HMI', action: 'Clear earth fault cause, reset relay target & 86 lockout, and restore bay.', tool: 'SCADA / HMI', expectedCheck: 'PTOC2.Op = FALSE; Quality = GOOD' },
      ],
      verificationCheck: 'Insulation verified healthy, 3I0 = 0 A, and PTOC2.Op returns FALSE with Quality GOOD.',
    },
    '50BF_GOOSE': {
      symptomSummary: `50BF Breaker Failure initiated and GOOSE intertrip (${gooseRef || 'GOOSE'}) timed out / blocked.`,
      probableCauses: ['Breaker failed to open within 50BF timer (150–200 ms) due to stuck mechanism or trip coil open', 'GOOSE VLAN 20 / Multicast MAC / APPID mismatch on Hirschmann switch', 'GOOSE publisher disabled or TimeAllowedToLive (TAL) expired'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Verify primary CB mechanical state and 110V DC trip coil current draw.', tool: 'Multimeter / CB Panel', expectedCheck: 'CB must open; 110V DC available at trip coil' },
        { step: 2, stage: 'IED', action: `Verify 50BF initiation (${ref}) and GOOSE Control Block (${gooseRef || 'gcbTrip'}) ConfRev & GoEna.`, tool: 'IEDScout / SCL Viewer', expectedCheck: 'GoEna = TRUE; ConfRev matches subscriber CID' },
        { step: 3, stage: 'Station Bus', action: 'Capture Layer-2 Ethertype 0x88B8 frames on VLAN 20 (Priority 4) across LAN A & LAN B.', tool: 'Wireshark / Hirschmann HiOS', expectedCheck: 'GOOSE frames seen with incrementing stNum/sqNum & valid TAL' },
        { step: 4, stage: 'IED', action: 'Check subscriber IED LGOS1.St and ExtRef input binding for 50BF intertrip.', tool: 'IEDScout / Subscriber IED', expectedCheck: 'LGOS1.St = TRUE (Healthy); no TAL expiry' },
        { step: 5, stage: 'SCADA / HMI', action: 'Resolve breaker/GOOSE issue, reset 50BF & 86 lockouts, and confirm GOOSE RX HEALTHY.', tool: 'SCADA / HMI', expectedCheck: 'RBRF1.OpEx = FALSE; GOOSE RX = HEALTHY' },
      ],
      verificationCheck: 'GOOSE 0x88B8 frames received within TAL on both PRP LANs and 50BF/86 reset.',
    },
    '87T_DIFF': {
      symptomSummary: `87T Transformer Differential Protection operated on ${iedLabel}; HV & LV breakers tripped.`,
      probableCauses: ['Internal transformer winding/inter-turn fault', 'CT ratio / vector group (Yd11) phase compensation mismatch', 'Magnetizing inrush 2nd-harmonic restraint setting too high'],
      steps: [
        { step: 1, stage: 'IED', action: 'Inspect IED differential (Idiff) vs restraint (Ibias) currents and 2nd/5th harmonic % in fault record.', tool: 'DIGSI 5 / PCM600 / COMTRADE', expectedCheck: `${ref} = TRUE; check Idiff vs Ibias pickup` },
        { step: 2, stage: 'Field I/O', action: 'DO NOT re-energize immediately! Check Buchholz gas, PRV flag, and oil temperature on transformer.', tool: 'Transformer Local Panel', expectedCheck: 'No gas accumulation or tank overpressure' },
        { step: 3, stage: 'Input Module', action: 'Verify HV & LV CT polarity, star-point earthing, and secondary burden connections.', tool: 'CT Polarity Tester / Multimeter', expectedCheck: 'Correct HV/LV CT phase alignment' },
        { step: 4, stage: 'Station Bus', action: 'Confirm 87T GOOSE trip reached LV Incomer IED and both HV/LV CBs opened.', tool: 'IEDScout / Wireshark', expectedCheck: 'Both HV & LV CBs = OPEN; stNum incremented' },
        { step: 5, stage: 'SCADA / HMI', action: 'Complete transformer DGA/winding resistance test, then reset 86T lockout.', tool: 'SCADA / HMI', expectedCheck: 'PDIF1.Op = FALSE; 86T RESET' },
      ],
      verificationCheck: 'Transformer electrical tests passed, 86T reset, and PDIF1.Op = FALSE with Quality GOOD.',
    },
    '64REF_TRIP': {
      symptomSummary: `64REF Restricted Earth Fault tripped ${iedLabel} on transformer winding neutral zone.`,
      probableCauses: ['Earth fault inside transformer HV/LV star winding', 'Neutral CT polarity reversed relative to phase CTs', 'High-impedance stabilizing resistor / Metrosil open circuit'],
      steps: [
        { step: 1, stage: 'IED', action: 'Read 64REF differential vs stabilizing current in IED fault record.', tool: 'IED LCD / DIGSI 5 / PCM600', expectedCheck: `${ref} = TRUE; check I_neutral vs 3I0_phase` },
        { step: 2, stage: 'Field I/O', action: 'Inspect transformer neutral bushing CT box and earthing connection.', tool: 'Visual / Multimeter', expectedCheck: 'Neutral CT secondary intact, no open circuit' },
        { step: 3, stage: 'Input Module', action: 'Check CT polarity P1/P2 and S1/S2 wiring at marshalling kiosk.', tool: 'Polarity Check', expectedCheck: 'Zero spill current during through-fault check' },
        { step: 4, stage: 'Station Bus', action: `Verify MMS BRCB (${rcbLabel}) and HV/LV intertrip GOOSE logs.`, tool: 'IEDScout', expectedCheck: 'Trip event logged with synchronized timestamp' },
        { step: 5, stage: 'SCADA / HMI', action: 'After winding insulation/DGA clearance, reset 86T lockout and clear alarm.', tool: 'SCADA / HMI', expectedCheck: 'PDIF2.Op = FALSE; Quality = GOOD' },
      ],
      verificationCheck: 'Neutral CT & winding insulation verified; 64REF and 86T reset.',
    },
    'BUCHHOLZ_TRIP': {
      symptomSummary: `Buchholz Gas Alarm / Trip asserted via hardwired DI on ${iedLabel}.`,
      probableCauses: ['Internal arcing/oil decomposition generating gas in transformer tank', 'Low conservator oil level or air trapped after oil filtration', 'Moisture ingress / short circuit in Buchholz marshalling cable'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Inspect Buchholz relay sight glass at transformer conservator pipe for gas pocket or oil drop.', tool: 'Visual Inspection / Gas Sampler', expectedCheck: 'Confirm gas color/volume or verify clear oil' },
        { step: 2, stage: 'Input Module', action: `Measure 110V DC wetting voltage on Buchholz DI terminal (${point.scadaTag}).`, tool: 'Multimeter (110V DC)', expectedCheck: '0V = Normal open contact; 110V = Contact closed' },
        { step: 3, stage: 'IED', action: `Check IED binary input channel status & debounce filter for ${ref}.`, tool: 'IED LCD / DIGSI 5 / PCM600', expectedCheck: 'DI state matches physical contact' },
        { step: 4, stage: 'Station Bus', action: `Check MMS BRCB (${rcbLabel}) report delivery to SCADA Server.`, tool: 'IEDScout', expectedCheck: `${dsLabel} transmitted without quality error` },
        { step: 5, stage: 'SCADA / HMI', action: 'After oil/gas clearance & contact reset, clear 86T lockout and verify normal status.', tool: 'SCADA / HMI', expectedCheck: 'SIML1.GasInsAlm = FALSE; Quality GOOD' },
      ],
      verificationCheck: 'Buchholz chamber verified full of oil, DI contact open, and Quality GOOD (0x0000).',
    },
    'WTI_OTI_TRIP': {
      symptomSummary: `Transformer WTI / OTI High-High temperature threshold exceeded on ${iedLabel}.`,
      probableCauses: ['Cooling fans/oil pumps (CCGR1) failed or MCB tripped', 'Sustained transformer overload above rated MVA', 'Pt100 RTD sensor open/short or 4–20 mA transducer drift'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Compare local marshalling box OTI/WTI dial gauge reading against IED analog value.', tool: 'Local WTI/OTI Gauge', expectedCheck: 'Verify if real overheating (>95°C) or transducer error' },
        { step: 2, stage: 'Input Module', action: 'Measure 4–20 mA / Pt100 RTD loop at AI module terminals.', tool: 'mA Loop Calibrator / Multimeter', expectedCheck: 'Normal range 4–20 mA (0–150°C); no open loop (<3.5 mA)' },
        { step: 3, stage: 'IED', action: `Check analog scaling & alarm/trip thresholds for ${ref} in IED.`, tool: 'IED LCD / Engineering Tool', expectedCheck: 'Scaling matches transducer range' },
        { step: 4, stage: 'Field I/O', action: 'Check Cooling Control (CCGR1) fan/pump contactors and 415V AC auxiliary supply.', tool: 'Cooling Marshalling Box', expectedCheck: 'All cooling stages running when temp > 65°C' },
        { step: 5, stage: 'SCADA / HMI', action: 'Confirm temperature drops below reset deadband, reset 86T, and verify URCB analog value.', tool: 'SCADA / HMI', expectedCheck: 'Temp normal; Quality = GOOD' },
      ],
      verificationCheck: 'Cooling system operational, RTD loop healthy, and WTI/OTI reading normal.',
    },
    'PRV_TRIP': {
      symptomSummary: `Pressure Relief Valve (PRV) operated on transformer tank; hardwired trip sent to ${iedLabel}.`,
      probableCauses: ['Sudden internal pressure surge from transformer tank fault', 'Faulty PRV microswitch or water ingress in junction box'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Visually inspect PRV mechanical indicator pin on top of transformer tank for oil spray.', tool: 'Visual Inspection', expectedCheck: 'Verify if PRV mechanically lifted or false microswitch' },
        { step: 2, stage: 'Input Module', action: 'Check 110V DC continuity across PRV microswitch terminals at marshalling kiosk.', tool: 'Multimeter (110V DC)', expectedCheck: 'Contact open when mechanical flag is reset' },
        { step: 3, stage: 'IED', action: `Verify binary input status for ${ref} and 86T trip matrix.`, tool: 'IED LCD / Vendor Tool', expectedCheck: 'DI clears once PRV contact opens' },
        { step: 4, stage: 'Station Bus', action: `Verify BRCB (${rcbLabel}) report delivery on Station Bus.`, tool: 'IEDScout', expectedCheck: 'Event timestamped and archived' },
        { step: 5, stage: 'SCADA / HMI', action: 'Reset PRV mechanical flag & 86T lockout after transformer clearance.', tool: 'SCADA / HMI', expectedCheck: 'SPTR1.PresRelTrp = FALSE; Quality GOOD' },
      ],
      verificationCheck: 'PRV flag reset, microswitch dry & open, and 86T lockout cleared.',
    },
    'OLTC_TAP_INVALID': {
      symptomSummary: `OLTC Tap Position (YLTC1.TapPos) invalid / out-of-step on ${iedLabel}.`,
      probableCauses: ['BCD / 4–20 mA tap position transmitter wiring open or inverted bit', 'Wrong IEC 61850 LN/DO/DA reference in DataSet/SCADA mapping', 'OLTC drive motor stalled mid-tap'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Read mechanical tap position counter on OLTC drive cabinet (Taps 1–17).', tool: 'OLTC Drive Cabinet', expectedCheck: 'Mechanical tap matches expected bus voltage' },
        { step: 2, stage: 'Input Module', action: 'Check BCD binary inputs or 4–20 mA tap transducer loop at DI/AI card.', tool: 'Multimeter', expectedCheck: 'Valid BCD code or 4–20 mA signal present' },
        { step: 3, stage: 'IED', action: `Verify IEC 61850 mapping (${ref}) and DataSet (${dsLabel}) FCDA member.`, tool: 'SCL Viewer / IEDScout', expectedCheck: 'YLTC1.TapPos.valWTr matches configured FC=ST' },
        { step: 4, stage: 'Gateway', action: 'Check Station Gateway IEC 61850 → IEC-104 / SCADA scaling table.', tool: 'Gateway Configurator', expectedCheck: 'Tap integer maps 1:1 to SCADA tag' },
        { step: 5, stage: 'SCADA / HMI', action: 'Restore tap reference / transmitter and verify SCADA shows valid tap number.', tool: 'SCADA / HMI', expectedCheck: 'YLTC1.TapPos valid (1..17); Quality GOOD' },
      ],
      verificationCheck: 'Mechanical tap equals IED & SCADA tap display with Quality GOOD (0x0000).',
    },
    'TCS_ALARM': {
      symptomSummary: `Trip Circuit Supervision (TCS / ANSI 74) alarm active on ${iedLabel} — breaker cannot trip on fault!`,
      probableCauses: ['Trip circuit 110V DC MCB tripped or fuse blown', 'Open circuit in breaker trip coil or loose wire at TB X1', 'Faulty 52a/52b auxiliary contact in TCS supervision loop'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Check 110V DC Trip Circuit MCB (MCB-TC1/TC2) and measure 110V DC at breaker panel.', tool: 'Multimeter (DC Volts)', expectedCheck: '110V DC ±10% present across (+) and (-)' },
        { step: 2, stage: 'Field I/O', action: 'Measure trip coil continuity/resistance and check 52a/52b auxiliary switch wiring.', tool: 'Multimeter (Ohms)', expectedCheck: 'Trip coil resistance typically 50–150 Ω (not open)' },
        { step: 3, stage: 'Input Module', action: 'Check TCS relay / IED binary input channel voltage for healthy trickle current.', tool: 'Multimeter / DI Card', expectedCheck: 'TCS DI = HEALTHY (energized)' },
        { step: 4, stage: 'IED', action: `Verify ${ref} clears in IED SOE log and front-panel alarm LED resets.`, tool: 'IED LCD / IEDScout', expectedCheck: 'SPTR1.TcsAlm = FALSE' },
        { step: 5, stage: 'SCADA / HMI', action: 'Confirm TCS alarm clears on SCADA Alarm Summary with GOOD quality.', tool: 'SCADA / HMI', expectedCheck: 'Quality = GOOD (0x0000); Trip circuit healthy' },
      ],
      verificationCheck: '110V DC trip loop continuous, TCS healthy, and SPTR1.TcsAlm = FALSE.',
    },
    'CB_POS_INVALID': {
      symptomSummary: `Circuit Breaker 52a/52b Double-Point Position (${ref}) shows INVALID (00 or 11) on ${iedLabel}.`,
      probableCauses: ['110V DC wetting supply lost to breaker auxiliary contacts (00 = Intermediate)', 'One of 52a or 52b wires open/shorted causing both inputs HIGH (11 = Bad State)', 'DI module opto-coupler channel failed or debounce mismatch'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Check physical CB mechanical flag (OPEN/CLOSED) and measure 110V DC on TB X1:1 (52a) & X1:2 (52b).', tool: 'Multimeter (110V DC)', expectedCheck: 'Exactly ONE contact must have 110V DC (52a=1/52b=0 or 52a=0/52b=1)' },
        { step: 2, stage: 'Input Module', action: 'Inspect DI Card LEDs (DI1 & DI2) — both OFF (00) or both ON (11) confirms field/card fault.', tool: 'DI Module LEDs', expectedCheck: 'Complementary LEDs: DI1≠DI2' },
        { step: 3, stage: 'IED', action: `Check XCBR1.Pos.stVal & XCBR1.Pos.q in IED live diagnostics (${ref}).`, tool: 'IED LCD / IEDScout', expectedCheck: 'stVal = 10 (CLOSED) or 01 (OPEN); q = 0x0000' },
        { step: 4, stage: 'Station Bus', action: `Verify BRCB (${rcbLabel}) sends updated DPC state on PRP LAN A/B.`, tool: 'Wireshark / IEDScout', expectedCheck: 'MMS InformationReport shows valid DPC' },
        { step: 5, stage: 'SCADA / HMI', action: 'Verify SLD breaker symbol changes from purple/questionable to solid red/green.', tool: 'SCADA / HMI SLD', expectedCheck: 'XCBR1.Pos valid; Quality = GOOD' },
      ],
      verificationCheck: '52a/52b complementary (10 or 01), DI card healthy, and SCADA CB symbol valid.',
    },
    'CILO_BLOCKED': {
      symptomSummary: `CILO Interlocking Permissive (${ref}) is FALSE — Breaker Close command blocked on ${iedLabel}.`,
      probableCauses: ['Associated Earth Switch (XSWI2) is CLOSED or Bus Disconnector (XSWI1) in intermediate state', 'GOOSE interlocking input from adjacent bay IED timed out (LGOS1.St = FALSE)', 'Bay/Station interlocking override key or HMI tag mismatch'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Verify all bay Earth Switches are OPEN and Bus Disconnector is fully CLOSED/OPEN.', tool: 'Field Yard / SLD', expectedCheck: 'XSWI2 (Earth Sw) = OPEN; XSWI1 = valid end-position' },
        { step: 2, stage: 'IED', action: `Inspect CILO1.EnaCls & CILO1.EnaOpn logic equations inside ${iedLabel}.`, tool: 'IED LCD / DIGSI 5 / PCM600', expectedCheck: 'Identify which interlocking boolean input is FALSE' },
        { step: 3, stage: 'Station Bus', action: 'Verify peer bay GOOSE interlocking messages (VLAN 20) are healthy on PRP LAN A/B.', tool: 'IEDScout / Wireshark', expectedCheck: 'All subscribed GOOSE ExtRefs have Quality = GOOD' },
        { step: 4, stage: 'SCADA / HMI', action: `Verify SCADA tag mapping (${point.scadaTag}) matches IED CILO1.EnaCls.`, tool: 'SCADA Tag Database', expectedCheck: 'No HMI tag mismatch; SBO Select succeeds' },
        { step: 5, stage: 'SCADA / HMI', action: 'Retry SBO Select-Before-Operate once interlocking permissive turns TRUE.', tool: 'SCADA / HMI Control', expectedCheck: 'CILO1.EnaCls = TRUE; Quality = GOOD' },
      ],
      verificationCheck: 'Earth switches OPEN, GOOSE interlocks healthy, and CILO1.EnaCls = TRUE.',
    },
    'SF6_LOCKOUT': {
      symptomSummary: `SF6 Gas Pressure Stage-2 Lockout (${ref}) active — CB operation mechanically & electrically blocked.`,
      probableCauses: ['SF6 gas leak in breaker interrupter pole below Stage-2 density threshold', 'SF6 density switch contact stuck or marshalling cable fault'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Read temperature-compensated SF6 density gauge at breaker cabinet (Green/Yellow/Red zone).', tool: 'SF6 Density Gauge', expectedCheck: 'Pressure must be in Green zone (typically ≥ 6.0 bar abs)' },
        { step: 2, stage: 'Input Module', action: 'Check Stage-1 Alarm & Stage-2 Lockout 110V DC DI contacts at terminal block.', tool: 'Multimeter (110V DC)', expectedCheck: 'Confirm physical contact matches gauge reading' },
        { step: 3, stage: 'IED', action: `Verify ${ref} and check that CB Open/Close blocking coil is energized only when pressure is normal.`, tool: 'IED LCD / IEDScout', expectedCheck: 'SIMG1.PresAlm = FALSE after gas top-up' },
        { step: 4, stage: 'Station Bus', action: `Check BRCB (${rcbLabel}) alarm transmission to SCADA.`, tool: 'IEDScout', expectedCheck: 'Alarm cleared in SOE with valid timestamp' },
        { step: 5, stage: 'SCADA / HMI', action: 'Top up SF6 gas (if low), clear lockout, and confirm CB permissive restored.', tool: 'SCADA / HMI', expectedCheck: 'SIMG1.PresAlm = FALSE; Quality = GOOD' },
      ],
      verificationCheck: 'SF6 density in Green zone, Stage-2 contact open, and CB control permissive active.',
    },
    'LOC_REM_MISMATCH': {
      symptomSummary: `Bay Control is in LOCAL mode (${ref} = TRUE) — Remote SCADA SBO commands rejected.`,
      probableCauses: ['Bay Control Unit / Switchgear panel selector key left in LOCAL after maintenance', 'Local/Remote DI wiring open or inverted in IED'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Check physical Local/Remote selector switch on bay control panel and switchgear door.', tool: 'Visual Check', expectedCheck: 'Both switches must be in REMOTE position' },
        { step: 2, stage: 'Input Module', action: 'Measure 110V DC on Local/Remote DI terminal to confirm input polarity.', tool: 'Multimeter (110V DC)', expectedCheck: 'Remote DI energized; Local DI = 0V' },
        { step: 3, stage: 'IED', action: `Verify CSWI1.Loc.stVal (${ref}) reads FALSE (Remote) inside IED.`, tool: 'IED LCD / IEDScout', expectedCheck: 'CSWI1.Loc = FALSE' },
        { step: 4, stage: 'SCADA / HMI', action: `Verify SCADA tag (${point.scadaTag}) updates from LOCAL to REMOTE.`, tool: 'SCADA / HMI', expectedCheck: 'Control authority = REMOTE; SBO enabled' },
        { step: 5, stage: 'SCADA / HMI', action: 'Test SBO Select command (without Operate if live) to confirm AddCause = OK.', tool: 'SCADA / HMI', expectedCheck: 'No Blocked-by-switching-hierarchy error' },
      ],
      verificationCheck: 'Selector key in REMOTE, CSWI1.Loc = FALSE, and SCADA SBO permitted.',
    },
    'DC_SUP_FAIL': {
      symptomSummary: `110V DC Control Supply Failure (${ref}) detected — protection & breaker control at risk.`,
      probableCauses: ['Main 110V DC bay feeder MCB tripped', 'Station battery charger AC input fail or DC earth fault', 'Under-voltage supervision relay operated on DC bus'],
      steps: [
        { step: 1, stage: 'Field I/O', action: 'Check 110V DC Distribution Board (DCDB) bay MCB and battery charger output voltage.', tool: 'Multimeter (DC Volts)', expectedCheck: '110V DC ±10% (99–121V DC); zero DC earth fault' },
        { step: 2, stage: 'Input Module', action: 'Check DI card wetting power LED and measure 110V DC at bay marshalling terminal.', tool: 'Multimeter', expectedCheck: 'Wetting bus energized at 110V DC' },
        { step: 3, stage: 'IED', action: `Check IED power supply health LED and ${ref} status.`, tool: 'IED Front Panel', expectedCheck: 'PWR LED solid green; DcSupFail = FALSE' },
        { step: 4, stage: 'Station Bus', action: 'Verify Hirschmann switch redundant 24/110V DC power inputs (P1 & P2).', tool: 'Switch LEDs / HiOS', expectedCheck: 'Both P1 & P2 power LEDs green' },
        { step: 5, stage: 'SCADA / HMI', action: 'Reset DC fail alarm and confirm all bay DI signals recover from INVALID to GOOD.', tool: 'SCADA / HMI', expectedCheck: 'GGIO1.DcSupFail = FALSE; Quality = GOOD' },
      ],
      verificationCheck: '110V DC restored across DCDB, marshalling box, and IED; all DI qualities GOOD.',
    },
    'PTP_SYNC_LOST': {
      symptomSummary: `IEEE 1588v2 PTP / SNTP Time Synchronization Lost (${ref}) — SOE timestamps unsynchronized.`,
      probableCauses: ['Meinberg Grandmaster Clock lost GNSS/GPS antenna lock (Holdover)', 'VLAN 40 (Priority 6) PTP multicast 0x88F7 blocked on Hirschmann switch', 'Transparent Clock (TC) disabled on station bus switches'],
      steps: [
        { step: 1, stage: 'Station Bus', action: 'Check Meinberg LANTIME M400 Grandmaster GNSS satellite lock (≥ 4 satellites) & Sync LED.', tool: 'Meinberg Web UI / Front LCD', expectedCheck: 'Clock Class = 6 (Locked); Offset < ±100 ns' },
        { step: 2, stage: 'Station Bus', action: 'Verify IEEE 1588v2 Power Profile (C37.238 / 61850-9-3) & VLAN 40 allowed on RSP35 ports.', tool: 'Hirschmann HiOS / Wireshark', expectedCheck: 'PTP Sync/Follow_Up frames (0x88F7) forwarded on LAN A & B' },
        { step: 3, stage: 'IED', action: `Check IED time sync diagnostics (${ref}) for TimeQuality ClockNotSynchronized bit.`, tool: 'IED LCD / IEDScout', expectedCheck: 'LTMS1.TmSyn = TRUE; ClockFailure = FALSE' },
        { step: 4, stage: 'Gateway', action: 'Verify Station Gateway SNTP/PTP sync so IEC-104 CP56Time2a timestamps stay accurate.', tool: 'Gateway Diagnostics', expectedCheck: 'Time offset < 1 ms' },
        { step: 5, stage: 'SCADA / HMI', action: 'Confirm SOE timestamp quality flag clears on SCADA/HMI.', tool: 'SCADA / HMI SOE', expectedCheck: 'TimeQuality = Synced; Quality = GOOD' },
      ],
      verificationCheck: 'Grandmaster locked, PTP frames reaching IED, and LTMS1.TmSyn = TRUE.',
    },
  };

  if (byId[tpl.id]) return byId[tpl.id];

  // Fallback tailored guides for shared fault families (MMS loss, 79 AR, 86 Lockout, 27 UV, TX Intertrip, etc.)
  if (tpl.mode === 'MMS_DISCONNECT') {
    return {
      symptomSummary: `IEC 61850 MMS / PRP Communication Loss on ${iedLabel} (${ref}) — SCADA receiving stale/invalid data.`,
      probableCauses: ['PRP LAN A & LAN B fiber patch cords unplugged or SFP optical power low', 'IED IP address / VLAN 10 mismatch or TCP Port 102 firewall block', 'Max MMS client associations exceeded on IED (typically max 6–8 clients)'],
      steps: [
        { step: 1, stage: 'IED', action: `Check IED ETH-A & ETH-B link/activity LEDs and verify IP (${ied.ipAddressLanA} / ${ied.ipAddressLanB}).`, tool: 'IED Front Panel / LCD', expectedCheck: 'Both ETH-A & ETH-B link LEDs solid green' },
        { step: 2, stage: 'Station Bus', action: 'Inspect Hirschmann RSP35 LAN A & LAN B switch port status, SFP Rx optical power (dBm), and VLAN 10/20.', tool: 'Hirschmann HiOS Web/CLI', expectedCheck: 'Ports UP; SFP Rx > -20 dBm; VLAN 10 & 20 tagged' },
        { step: 3, stage: 'Station Bus', action: `Ping ${ied.ipAddressLanA} and capture TCP Port 102 (MMS Initiate) & GOOSE 0x88B8 traffic.`, tool: 'Wireshark / IEDScout', expectedCheck: 'Ping < 1 ms; MMS InitiateResponse = OK' },
        { step: 4, stage: 'Gateway', action: `Verify Station Gateway & SCADA MMS Client association count and BRCB (${rcbLabel}) RptEna = TRUE.`, tool: 'Gateway / IEDScout', expectedCheck: 'Association CONNECTED; General Interrogation (GI) succeeds' },
        { step: 5, stage: 'SCADA / HMI', action: 'Confirm all bay signals recover from INVALID/COMMUNICATION LOST to GOOD.', tool: 'SCADA / HMI', expectedCheck: 'LPHD1.PhyHealth = OK; Quality = GOOD (0x0000)' },
      ],
      verificationCheck: 'PRP LAN A & B links UP, MMS TCP:102 re-associated, and SCADA GI completed.',
    };
  }

  if (tpl.id.includes('79_AR')) {
    return {
      symptomSummary: `ANSI 79 Auto-Reclose Lockout active on ${iedLabel} (${ref}) after unsuccessful reclose cycle.`,
      probableCauses: ['Permanent fault persisted after dead-time reclose shot', 'CB spring not charged (SOPM1.SprChg = FALSE) or 86 lockout blocked reclose', 'Synchrocheck (25) permissive failed during reclose window'],
      steps: [
        { step: 1, stage: 'IED', action: 'Check IED SOE log for 79 shot counter, dead-time timer, and trip-reclose-trip sequence.', tool: 'IED LCD / DIGSI 5', expectedCheck: `${ref} = LOCKOUT; verify permanent fault cause` },
        { step: 2, stage: 'Field I/O', action: 'Inspect CB spring charge status (SOPM1.SprChg) and verify feeder/line fault is isolated.', tool: 'CB Panel / Line Patrol', expectedCheck: 'Spring CHARGED; line clear for re-energization' },
        { step: 3, stage: 'IED', action: 'Verify no active protection pickup or 86 master lockout blocking ANSI 79.', tool: 'IED LCD', expectedCheck: 'All protection trips reset' },
        { step: 4, stage: 'Station Bus', action: `Verify BRCB (${rcbLabel}) reports 79 status change to SCADA.`, tool: 'IEDScout', expectedCheck: `${dsLabel} updated with Quality GOOD` },
        { step: 5, stage: 'SCADA / HMI', action: 'Execute Reset 79 Lockout command and confirm ANSI 79 returns to READY.', tool: 'SCADA / HMI', expectedCheck: 'RREC1.AutoRecSt = READY; Quality GOOD' },
      ],
      verificationCheck: 'Permanent fault cleared, CB spring charged, and ANSI 79 status = READY.',
    };
  }

  return {
    symptomSummary: `${tpl.title} active on ${iedLabel} (${ref}); protection/control chain requires verification.`,
    probableCauses: [`Protection element ${point.logicalNodeClass}.${point.dataObject} operated due to bay fault`, 'Hardwired trip/lockout relay (86) latched awaiting manual reset', 'Upstream/downstream interlocking or GOOSE intertrip active'],
    steps: [
      { step: 1, stage: 'IED', action: `Inspect IED LCD, blinking red trip LEDs, and SOE fault record for ${ref}.`, tool: 'IED LCD / Vendor Tool', expectedCheck: `${ref} = TRUE; note exact fault timestamp & magnitude` },
      { step: 2, stage: 'Field I/O', action: 'Verify physical breaker state (52a/52b), 110V DC supply, and bay equipment safety.', tool: 'Field Panel / Multimeter', expectedCheck: 'Breaker safely OPEN (if tripped); 110V DC healthy' },
      { step: 3, stage: 'Input Module', action: 'Confirm DI/AI channels match actual field contact/sensor states.', tool: 'DI Module / IED Measurements', expectedCheck: 'No stuck DI channel or bad quality flag' },
      { step: 4, stage: 'Station Bus', action: `Verify DataSet (${dsLabel}) and BRCB/GOOSE (${rcbLabel}) delivery over PRP LAN A/B.`, tool: 'IEDScout / Wireshark', expectedCheck: 'Frames received with 0 ms PRP redundancy' },
      { step: 5, stage: 'SCADA / HMI', action: 'After physical fault clearance, reset ANSI 86 lockout and verify SCADA alarm clears.', tool: 'SCADA / HMI', expectedCheck: 'Quality = GOOD (0x0000); normal bay operation restored' },
    ],
    verificationCheck: `Physical cause cleared, ${point.logicalNodeClass}.${point.dataObject} reset, and SCADA Quality = GOOD.`,
  };
}

/** Eight IED-specific critical faults, each backed by actual configured signals/bindings of this IED. */
export function buildIedFaultScenarios(
  ied: MultiVendorIed | undefined,
  signals: InstantiatedSasSignal[],
  blocks: GooseControlBlock[],
  config?: FaultConfiguration,
  bayType?: BayEquipment['bayType']
): IedFaultScenario[] {
  if (!ied) return [];
  const points = signals.filter(p => p.iedId === ied.id && p.iedName === ied.name);
  if (!points.length) return [];

  const mapping = config ?? runtimeFaultConfiguration(ied);
  const members = mapping.datasets.flatMap(ds => datasetPoints(ds, points));
  const candidates = config ? points.filter(p => members.some(m => m.id === p.id)) : points;
  if (!candidates.length) return [];

  const templates = selectTemplatesForIed(ied, bayType);
  const mmsPoints = candidates.filter(p => p.transportType.includes('MMS'));
  const iedGoose = blocks.find(b => b.publisherIedId === ied.id);

  const scenarios: IedFaultScenario[] = [];
  const usedIds = new Set<string>();

  for (const tpl of templates) {
    const point =
      tpl.catalogNumbers.map(num => candidates.find(p => p.catalogNumber === num)).find(Boolean)
      ?? candidates.find(p => p.fc !== 'CO')
      ?? candidates[0];
    if (!point) continue;

    const ds = mapping.datasets.find(d => datasetPoints(d, [point]).length > 0);
    const report = ds ? mapping.reports.find(r => r.dataset === ds.ref) : undefined;
    const affected = tpl.affectAllMms && mmsPoints.length > 0 ? mmsPoints : [point];

    const evidence = tpl.useGooseBlock && iedGoose
      ? `${point.iec61850Ref} · GOOSE ${iedGoose.gocbRef} → ${iedGoose.subscriberIedIds.join(', ')} (TAL ${iedGoose.timeAllowedToLiveMs} ms)`
      : `${point.iec61850Ref}${ds ? ` · DataSet ${ds.ref}` : ''}${report ? ` · ${report.name}` : ''}`;

    usedIds.add(tpl.id);
    scenarios.push({
      id: tpl.id,
      mode: tpl.mode,
      label: tpl.title,
      lcdText: tpl.lcdText,
      ledBadge: tpl.ledBadge,
      tripsBreaker: tpl.tripsBreaker,
      troubleshooting: buildTroubleshootingGuide(tpl, ied, point, ds?.ref, report?.name, tpl.useGooseBlock ? iedGoose?.gocbRef : undefined),
      targetId: point.id,
      affectedIds: affected.map(p => p.id),
      evidence,
      recovery: tpl.recovery,
      projectedValue: tpl.projectedValue,
      projectedQuality: tpl.projectedQuality,
      dataset: ds?.ref,
      reportName: report?.name,
      gooseBlockId: tpl.useGooseBlock ? iedGoose?.id : undefined,
    });
  }

  return scenarios.slice(0, 8);
}

export function injectIedFault(scenario: IedFaultScenario, points: InstantiatedSasSignal[], now = new Date().toISOString()): IedFaultInjection {
  return {
    scenario,
    injectedAt: now,
    snapshots: Object.fromEntries(
      points.filter(p => scenario.affectedIds.includes(p.id))
        .map(p => [p.id, { value: p.value, timestamp: p.timestamp }])
    ),
  };
}

export function projectSignalFault(point: InstantiatedSasSignal, injection?: IedFaultInjection): InstantiatedSasSignal {
  if (!injection?.scenario.affectedIds.includes(point.id)) return point;
  const { scenario } = injection;
  const isTarget = point.id === scenario.targetId;
  const saved = injection.snapshots[point.id];

  if (isTarget && scenario.projectedValue !== undefined) {
    return {
      ...point,
      value: scenario.projectedValue,
      timestamp: injection.injectedAt,
      quality: scenario.projectedQuality ?? 'INVALID',
      isOverridden: true,
    };
  }

  if (scenario.mode === 'GOOSE_TIMEOUT') return point;
  if (scenario.mode === 'BAD_QUALITY') {
    return { ...point, quality: point.quality === 'GOOD' ? 'QUESTIONABLE' : point.quality };
  }
  return {
    ...point,
    value: saved?.value ?? point.value,
    timestamp: saved?.timestamp ?? point.timestamp,
    quality: 'INVALID',
    isOverridden: true,
  };
}

export function faultStageStates(mode: SignalChainFaultMode): ('OK' | 'WARN' | 'ERR')[] {
  switch (mode) {
    case 'DI_INPUT_FAIL': return ['OK', 'ERR', 'WARN', 'OK', 'OK', 'WARN'];
    case 'WRONG_IEC_REF': case 'DATASET_MISSING': return ['OK', 'OK', 'OK', 'ERR', 'WARN', 'ERR'];
    case 'REPORT_DISABLED': case 'MMS_DISCONNECT': return ['OK', 'OK', 'OK', 'OK', 'ERR', 'ERR'];
    case 'GOOSE_TIMEOUT': return ['OK', 'OK', 'OK', 'OK', 'WARN', 'OK'];
    case 'BAD_QUALITY': return ['OK', 'OK', 'WARN', 'OK', 'OK', 'WARN'];
    case 'HMI_TAG_MISMATCH': return ['OK', 'OK', 'OK', 'OK', 'OK', 'ERR'];
    default: return ['OK', 'OK', 'OK', 'OK', 'OK', 'OK'];
  }
}
