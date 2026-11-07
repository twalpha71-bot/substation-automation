export type VoltageLevel = 132 | 33 | 11;

export type BreakerPosition = 'OPEN' | 'CLOSED' | 'INTERMEDIATE' | 'BAD';
export type SwitchPosition = 'OPEN' | 'CLOSED';
export type ControlMode = 'REMOTE' | 'LOCAL';
export type DataQuality = 'GOOD' | 'QUESTIONABLE' | 'INVALID' | 'OLD_DATA' | 'TEST';
export type AlarmSeverity = 'CRITICAL' | 'MAJOR' | 'MINOR' | 'WARNING' | 'INFO';
export type SldThemeMode = 'DARK_CINEMATIC' | 'HIGH_CONTRAST_HMI' | 'LIGHT_DRAWING';
export type NetworkRedundancyMode = 'PRP' | 'HSR' | 'DUAL_LAN' | 'SINGLE_LAN';

export type BayType =
  | 'LINE_INCOMER'
  | 'TRANSFORMER_HV'
  | 'TRANSFORMER_LV_INCOMER'
  | 'BUS_COUPLER'
  | 'OUTGOING_FEEDER'
  | 'DIST_TX_FEEDER'
  | 'SPARE_FEEDER';

export type VendorName = 'Siemens' | 'Schneider Electric' | 'ABB / Hitachi Energy' | 'GE Vernova';

export interface BayEquipment {
  id: string;
  bayCode: string;
  name: string;
  voltageKv: VoltageLevel;
  busSection: 'A' | 'B' | 'COUPLE';
  bayType: BayType;
  breakerId: string;
  breakerState: BreakerPosition;
  lineDisconnectorState: SwitchPosition; // Q9 / Line or Cable side
  busDisconnectorState: SwitchPosition;  // Q1 / Busbar side
  earthSwitchState: SwitchPosition;      // Q8 / Earthing switch
  localRemote: ControlMode;
  springCharged: boolean;
  sf6PressureNormal: boolean;
  tcsHealthy: boolean;
  dcSupplyHealthy: boolean;
  opCounter: number;
  interlockPermissive: boolean;
  interlockReason: string;
  protectionTripActive: boolean;
  activeTripFunctions: string[];
  autoRecloseStatus: 'READY' | 'IN_PROGRESS' | 'LOCKOUT' | 'DISABLED';
  iedId: string;
  secondaryIedId?: string;
  ctRatio: string;
  vtRatio: string;
  nominalLoadMw: number;
  nominalLoadMvar: number;
  // Live simulated telemetry
  currentA: number;
  currentB: number;
  currentC: number;
  voltageAbKv: number;
  voltageBcKv: number;
  voltageCaKv: number;
  activePowerMw: number;
  reactivePowerMvar: number;
  apparentPowerMva: number;
  powerFactor: number;
  frequencyHz: number;
  energyImportMwh: number;
  energized: boolean;
  quality: DataQuality;
  lastUpdated: string;
  isUserCreated?: boolean;
  connectedTransformerId?: string;
}

export interface PowerTransformer {
  id: string;
  name: string;
  designation: string;
  hvKv: VoltageLevel;
  lvKv: VoltageLevel;
  ratingMva: number;
  vectorGroup: string;
  impedancePercent: number;
  hvBayId: string;
  lvBayId: string;
  iedId: string;
  oltcTapPosition: number;
  oltcMinTap: number;
  oltcMaxTap: number;
  oltcStepPercent: number;
  oltcAutoMode: boolean;
  oilTempC: number;
  windingTempHvC: number;
  windingTempLvC: number;
  buchholzAlarm: boolean;
  buchholzTrip: boolean;
  pressureReliefTrip: boolean;
  coolingStage: 'ONAN' | 'ONAF-1' | 'ONAF-2';
  differentialTrip: boolean;
  refTrip: boolean;
  energized: boolean;
  loadPercent: number;
  activePowerMw: number;
  reactivePowerMvar: number;
}

export interface BusbarSection {
  id: string;
  name: string;
  voltageKv: VoltageLevel;
  section: 'A' | 'B';
  energized: boolean;
  voltageKvLive: number;
  frequencyHz: number;
  connectedSourceCount: number;
  vtHealthy: boolean;
}

export type SignalCategory =
  | 'Circuit Breaker & Switchgear'
  | 'Protection Signals'
  | 'Electrical Measurements'
  | 'Transformer & SAS System';

export type SignalKind =
  | 'STATUS_DP'
  | 'STATUS_SP'
  | 'CONTROL_DPC'
  | 'CONTROL_SPC'
  | 'CONTROL_ISC'
  | 'PROTECTION_ACD'
  | 'PROTECTION_ACT'
  | 'MEASUREMENT_MV'
  | 'MEASUREMENT_CMV'
  | 'COUNTER_BCR'
  | 'DIAGNOSTIC_ENS';

export interface SasSignalTemplate {
  catalogNumber: number; // 1 to 50
  signalName: string;
  category: SignalCategory;
  signalKind: SignalKind;
  logicalNodeClass: string;
  dataObject: string;
  dataAttribute: string;
  fc: 'ST' | 'MX' | 'CO' | 'CF' | 'DC' | 'SP';
  cdc: string; // Common Data Class: DPC, SPS, MV, CMV, ACT, ACD, INS, BCR, ISC
  dataType: string;
  controlModel?: 'status-only' | 'direct-with-normal-security' | 'sbo-with-enhanced-security';
  defaultDataset: 'dsStatus' | 'dsMeas' | 'dsProtTrip' | 'dsGooseTrip' | 'dsTransformer' | 'dsDiag';
  transportType: 'MMS_BRCB' | 'MMS_URCB' | 'GOOSE_AND_MMS' | 'MMS_CONTROL';
  scadaTagSuffix: string;
  hmiObjectType: string;
  alarmSeverity?: AlarmSeverity;
  testProcedureSummary: string;
  engineeringNote: string;
}

export interface InstantiatedSasSignal extends SasSignalTemplate {
  id: string;
  bayId: string;
  bayName: string;
  voltageKv: VoltageLevel;
  iedId: string;
  iedName: string;
  vendor: VendorName;
  iec61850Ref: string;
  datasetRef: string;
  rcbOrGooseRef: string;
  scadaTag: string;
  value: string | number | boolean;
  unit?: string;
  quality: DataQuality;
  timestamp: string;
  isOverridden?: boolean;
}

export interface LogicalNodeInstance {
  lnPrefix: string;
  lnClass: string;
  lnInst: string;
  description: string;
  dataObjects: {
    doName: string;
    cdc: string;
    fc: string;
    value: string;
    q: string;
    t: string;
    attributes: { daName: string; type: string; fc: string; val: string }[];
  }[];
}

export interface IedDataset {
  name: string;
  ldInst: string;
  description: string;
  fcdas: {
    ldInst: string;
    lnClass: string;
    lnInst: string;
    doName: string;
    daName?: string;
    fc: string;
  }[];
}

export interface IedRcb {
  name: string;
  rptId: string;
  buffered: boolean;
  datSet: string;
  confRev: number;
  trgOps: string[]; // dchg, qchg, dupd, period, gi
  intgPdMs: number;
  bufTimeMs: number;
  enabled: boolean;
  clientIp: string;
}

export interface GooseControlBlock {
  id: string;
  gocbName: string;
  appId: string; // e.g. 0x0001
  gocbRef: string;
  datSet: string;
  publisherIedId: string;
  publisherIedName: string;
  subscriberIedIds: string[];
  multicastMac: string;
  vlanId: number;
  vlanPriority: number;
  confRev: number;
  stNum: number;
  sqNum: number;
  timeAllowedToLiveMs: number;
  minTimeMs: number;
  maxTimeMs: number;
  ndsCom: boolean;
  testMode: boolean;
  healthy: boolean;
  mismatchFault: 'NONE' | 'VLAN_MISMATCH' | 'APPID_MISMATCH' | 'CONFREV_MISMATCH' | 'DATASET_MISSING' | 'TIMEOUT';
  lastTxTimestamp: string;
  extRefs: {
    subscriberIedId: string;
    intAddr: string;
    srcRef: string;
    bound: boolean;
  }[];
}

export interface MultiVendorIed {
  id: string;
  name: string;
  model: string;
  vendor: VendorName;
  role: 'Feeder Protection' | 'Transformer Differential' | 'Line Distance Protection' | 'Bay Control Unit';
  bayId: string;
  bayName: string;
  voltageKv: VoltageLevel;
  ipAddressLanA: string;
  ipAddressLanB: string;
  subnetMask: string;
  macAddress: string;
  redundancySupport: ('PRP' | 'HSR' | 'RSTP')[];
  nodeType: 'DANP' | 'SAN' | 'REDBOX_SAN';
  timeSyncProtocol: 'IEEE 1588 PTPv2' | 'SNTP';
  firmwareVersion: string;
  sclEdition: 'Edition 2.0' | 'Edition 2.1';
  commHealthy: boolean;
  mmsConnected: boolean;
  gooseHealthy: boolean;
  timeSyncLocked: boolean;
  cpuLoadPercent: number;
  caseTempC: number;
  logicalDevices: {
    ldInst: string;
    description: string;
    logicalNodes: LogicalNodeInstance[];
  }[];
  datasets: IedDataset[];
  rcbs: IedRcb[];
}

export interface InfrastructureDevice {
  id: string;
  name: string;
  model: string;
  vendor: string;
  category: 'Ethernet Switch' | 'Station Gateway' | 'SCADA Server' | 'HMI Workstation' | 'Engineering Workstation' | 'PTP Grandmaster Clock' | 'RedBox';
  ipAddress: string;
  redundancyRole: string;
  portsCount: number;
  status: 'ONLINE' | 'DEGRADED' | 'OFFLINE';
  ptpStatus: string;
  description: string;
}

export interface NetworkLink {
  id: string;
  sourceId: string;
  sourceName: string;
  sourcePort: string;
  targetId: string;
  targetName: string;
  targetPort: string;
  lanPlane: 'LAN_A' | 'LAN_B' | 'HSR_RING' | 'UPLINK';
  speedMbps: 100 | 1000;
  mediaType: '100BASE-FX Multimode LC' | '1000BASE-LX Singlemode LC' | '1000BASE-T RJ45';
  vlanList: number[];
  status: 'UP' | 'DOWN' | 'DEGRADED';
  trafficKbps: number;
  gooseFramesPerSec: number;
  mmsFramesPerSec: number;
}

export interface AlarmRecord {
  id: string;
  timestamp: string;
  bayId: string;
  bayName: string;
  iedId: string;
  signalName: string;
  iec61850Ref: string;
  severity: AlarmSeverity;
  state: 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'CLEARED';
  valueText: string;
}

export interface SoeRecord {
  id: string;
  timestampMs: string;
  bayId: string;
  bayName: string;
  iedId: string;
  sourceRef: string;
  eventDescription: string;
  valueChange: string;
  quality: DataQuality;
  cause: 'OPERATOR_CMD' | 'PROTECTION_TRIP' | 'INTERLOCK_BLOCK' | 'FAULT_INJECTION' | 'SYSTEM_DIAG' | 'GOOSE_RX';
}

export interface FaultScenario {
  id: string;
  code: string;
  title: string;
  category: 'Switchgear' | 'Protection & GOOSE' | 'MMS & SCADA' | 'Network & Sync';
  targetBayOrIed: string;
  active: boolean;
  symptoms: string[];
  possibleCauses: string[];
  diagnostics: string[];
  correctiveAction: string;
  validationCheck: string;
}

export interface FatSatTestCase {
  id: string;
  testCode: string;
  title: string;
  category: string;
  standardRef: string;
  preconditions: string[];
  steps: string[];
  expectedResult: string;
  actualSimulatedResult: string;
  status: 'NOT_RUN' | 'PASS' | 'FAIL';
  evidenceLog: string;
  lastExecuted?: string;
}

export interface LearningModule {
  id: string;
  moduleNumber: number;
  title: string;
  titleTelugu?: string;
  englishSummary?: string;
  teluguSummary?: string;
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  summaryEn: string;
  summaryTe: string;
  keyConcepts: {
    heading: string;
    explanationEn: string;
    explanationTe: string;
    technicalTakeaway: string;
  }[];
  interactiveExercise: {
    prompt: string;
    actionHint: string;
    targetTab: string;
  };
  quizQuestions: {
    question: string;
    options: string[];
    correctIndex: number;
    explanationEn: string;
    explanationTe: string;
    explanation?: string;
  }[];
  quiz?: {
    question: string;
    options: string[];
    correctIndex: number;
    explanationEn: string;
    explanationTe: string;
    explanation?: string;
  }[];
  interviewQuestions: {
    q: string;
    aEn: string;
    aTe: string;
  }[];
}
