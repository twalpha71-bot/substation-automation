import { create } from 'zustand';
import {
  AlarmRecord,
  BayEquipment,
  BusbarSection,
  ControlMode,
  FatSatTestCase,
  FaultScenario,
  GooseControlBlock,
  InfrastructureDevice,
  InstantiatedSasSignal,
  MultiVendorIed,
  NetworkLink,
  NetworkRedundancyMode,
  PowerTransformer,
  SldThemeMode,
  SoeRecord,
  SwitchPosition,
  VendorName,
  VoltageLevel,
} from '../types/substation';
import {
  INITIAL_BAYS,
  INITIAL_BUSBARS,
  INITIAL_TRANSFORMERS,
} from '../data/substationData';
import { instantiateSignalsForSubstation } from '../data/signalCatalogue';
import {
  buildMultiVendorIeds,
  buildNetworkLinks,
  INFRASTRUCTURE_DEVICES,
  INITIAL_FAT_SAT_TESTS,
  INITIAL_FAULT_SCENARIOS,
  INITIAL_GOOSE_CONTROL_BLOCKS,
} from '../data/iedData';

// Training SOE clock: deterministic ordering within each simulated switching operation.
// Millisecond offsets represent illustrative event separation, not measured IED latency.
let lastTrainingSoeMs = 0;
const nextTrainingSoeTime = (minimumStepMs = 25): string => {
  lastTrainingSoeMs = Math.max(Date.now(), lastTrainingSoeMs + minimumStepMs);
  return new Date(lastTrainingSoeMs).toISOString();
};

export type ActiveWorkspaceTab =
  | 'HERO'
  | 'IEC61850_ACADEMY'
  | 'INTERVIEW_PREP'
  | 'CCNA_ACADEMY'
  | 'SLD'
  | 'SCADA'
  | 'IED'
  | 'IED_SIGNAL_CHAIN'
  | 'NETWORK'
  | 'GOOSE'
  | 'MMS'
  | 'MODBUS_LAB'
  | 'IEC104_LAB'
  | 'OPCUA_LAB'
  | 'SIGNALS'
  | 'FAULTS'
  | 'FATSAT'
  | 'LEARNING'
  | 'ADMIN_DASHBOARD'
  | 'USER_PROFILE'
  | 'AUTH_SIGNIN'
  | 'AUTH_SIGNUP'
  | 'AUTH_FORGOT';

export interface TrendPoint {
  time: string;
  totalLoadMw: number;
  totalLoadMvar: number;
  v132Kv: number;
  v33Kv: number;
  v11Kv: number;
  freqHz: number;
}

interface SubstationStoreState {
  activeTab: ActiveWorkspaceTab;
  selectedBayId: string;
  selectedIedId: string;
  sldTheme: SldThemeMode;
  networkRedundancyMode: NetworkRedundancyMode;
  bilingualTeluguEnabled: boolean;
  simulationRunning: boolean;
  simTickCount: number;
  lastCommandFeedback: { type: 'SUCCESS' | 'ERROR' | 'INFO'; message: string; timestamp: string } | null;

  busbars: BusbarSection[];
  transformers: PowerTransformer[];
  bays: BayEquipment[];
  ieds: MultiVendorIed[];
  infrastructure: InfrastructureDevice[];
  networkLinks: NetworkLink[];
  gooseControlBlocks: GooseControlBlock[];
  signals: InstantiatedSasSignal[];
  alarms: AlarmRecord[];
  soeLog: SoeRecord[];
  faultScenarios: FaultScenario[];
  fatSatTests: FatSatTestCase[];
  trendHistory: TrendPoint[];

  // Actions
  setActiveTab: (tab: ActiveWorkspaceTab) => void;
  setSelectedBayId: (bayId: string) => void;
  setSelectedIedId: (iedId: string) => void;
  setSldTheme: (theme: SldThemeMode) => void;
  setNetworkRedundancyMode: (mode: NetworkRedundancyMode) => void;
  toggleBilingualTelugu: () => void;
  toggleSimulationRunning: () => void;
  clearCommandFeedback: () => void;

  busTransferMode: 'AUTO' | 'MANUAL';
  busTransferModes: Record<132 | 33 | 11, 'AUTO' | 'MANUAL'>;
  setVoltageBusTransferMode: (level: 132 | 33 | 11, mode: 'AUTO' | 'MANUAL') => void;
  busTransferStatus: 'IDLE' | 'SUCCESS' | 'BLOCKED';
  busTransferMessage: string;
  setBusTransferMode: (mode: 'AUTO' | 'MANUAL') => void;
  requestBusTransfer: (level?: 132 | 33 | 11) => boolean;

  // Switching & Electrical Operations
  commandBreaker: (bayId: string, targetState: 'OPEN' | 'CLOSED', origin?: 'SCADA_SBO' | 'LOCAL_PANEL') => boolean;
  commandDisconnector: (bayId: string, which: 'BUS_Q1' | 'LINE_Q9' | 'EARTH_Q8', targetState: SwitchPosition) => boolean;
  setBayLocalRemote: (bayId: string, mode: ControlMode) => void;
  triggerProtectionTrip: (bayId: string, tripFunction?: string) => void;
  resetProtectionTrip: (bayId: string) => void;
  stepTransformerOltc: (txId: string, direction: 'RAISE' | 'LOWER') => void;

  // Dynamic Bay Engineering Editor
  addConfigurableFeederBay: (params: {
    voltageKv: 33 | 11;
    busSection: 'A' | 'B';
    name: string;
    nominalLoadMw: number;
    nominalLoadMvar: number;
    vendor: VendorName;
  }) => void;
  removeConfigurableFeederBay: (bayId: string) => void;

  // GOOSE & MMS Engineering Actions
  triggerGooseStateChangeBurst: (gocbId: string) => void;
  setGooseMismatchFault: (gocbId: string, fault: GooseControlBlock['mismatchFault']) => void;
  toggleRcbEnabled: (iedId: string, rcbName: string) => void;
  triggerMmsGeneralInterrogation: (iedId: string) => void;

  // Alarms & Faults & FAT/SAT
  acknowledgeAlarm: (alarmId: string) => void;
  acknowledgeAllAlarms: () => void;
  clearClearedAlarms: () => void;
  toggleFaultScenario: (faultId: string) => void;
  runFatSatTest: (testId: string) => void;
  runAllFatSatTests: () => void;
  stepSimulationTick: () => void;
}

function nowIso(): string {
  return new Date().toISOString();
}

function formatTimeShort(): string {
  const d = new Date();
  return d.toTimeString().split(' ')[0];
}

// Deterministic Electrical Connectivity & Power-Flow Solver
function solveSubstationElectricalGraph(
  baysInput: BayEquipment[],
  txInput: PowerTransformer[],
  busInput: BusbarSection[],
  faults: FaultScenario[]
): {
  bays: BayEquipment[];
  transformers: PowerTransformer[];
  busbars: BusbarSection[];
} {
  const bays = baysInput.map((b) => ({ ...b }));
  const transformers = txInput.map((t) => ({ ...t }));
  const busbars = busInput.map((bus) => ({ ...bus }));

  const findBay = (id: string) => bays.find((b) => b.id === id);
  const isClosedPath = (b?: BayEquipment) =>
    Boolean(
      b &&
        b.breakerState === 'CLOSED' &&
        b.busDisconnectorState === 'CLOSED' &&
        b.lineDisconnectorState === 'CLOSED' &&
        b.earthSwitchState === 'OPEN'
    );

  // 1. Evaluate 132 kV Busbars
  const l1 = findBay('BAY-132-L1');
  const l2 = findBay('BAY-132-L2');
  const bc132 = findBay('BAY-132-BC');

  const src132A = isClosedPath(l1);
  const src132B = isClosedPath(l2);
  const cpl132 = isClosedPath(bc132);

  const bus132ALive = src132A || (cpl132 && src132B);
  const bus132BLive = src132B || (cpl132 && src132A);
  const v132A = src132A ? 132.4 : (cpl132 && src132B ? 132.2 : 0);
  const v132B = src132B ? 132.2 : (cpl132 && src132A ? 132.4 : 0);

  // 2. Evaluate 132/33 kV Transformers T1 & T2
  const bay132T1 = findBay('BAY-132-T1');
  const bay132T2 = findBay('BAY-132-T2');
  const bay33Inc1 = findBay('BAY-33-INC1');
  const bay33Inc2 = findBay('BAY-33-INC2');
  const bc33 = findBay('BAY-33-BC');

  const txT1 = transformers.find((t) => t.id === 'TX-T1')!;
  const txT2 = transformers.find((t) => t.id === 'TX-T2')!;

  txT1.energized = bus132ALive && isClosedPath(bay132T1) && !txT1.differentialTrip && !txT1.pressureReliefTrip;
  txT2.energized = bus132BLive && isClosedPath(bay132T2) && !txT2.differentialTrip && !txT2.pressureReliefTrip;

  // OLTC voltage ratio adjustment
  const t1TapFactor = 1 + (txT1.oltcTapPosition - 9) * (txT1.oltcStepPercent / 100);
  const t2TapFactor = 1 + (txT2.oltcTapPosition - 9) * (txT2.oltcStepPercent / 100);

  const src33A = txT1.energized && isClosedPath(bay33Inc1);
  const src33B = txT2.energized && isClosedPath(bay33Inc2);
  const cpl33 = isClosedPath(bc33);

  const bus33ALive = src33A || (cpl33 && src33B);
  const bus33BLive = src33B || (cpl33 && src33A);
  const v33SourceA = src33A ? 33 * (v132A / 132) * t1TapFactor : 0;
  const v33SourceB = src33B ? 33 * (v132B / 132) * t2TapFactor : 0;
  const v33A = src33A ? v33SourceA : (cpl33 ? v33SourceB : 0);
  const v33B = src33B ? v33SourceB : (cpl33 ? v33SourceA : 0);

  // 3. Evaluate 33/11 kV Distribution Transformers DT1 & DT2
  const bay33Tf1 = findBay('BAY-33-TF1');
  const bay33Tf2 = findBay('BAY-33-TF2');
  const bay11Inc1 = findBay('BAY-11-INC1');
  const bay11Inc2 = findBay('BAY-11-INC2');
  const bc11 = findBay('BAY-11-BC');

  const txDt1 = transformers.find((t) => t.id === 'TX-DT1')!;
  const txDt2 = transformers.find((t) => t.id === 'TX-DT2')!;

  txDt1.energized = bus33ALive && isClosedPath(bay33Tf1) && !txDt1.differentialTrip && !txDt1.pressureReliefTrip;
  txDt2.energized = bus33BLive && isClosedPath(bay33Tf2) && !txDt2.differentialTrip && !txDt2.pressureReliefTrip;

  const dt1TapFactor = 1 + (txDt1.oltcTapPosition - 5) * (txDt1.oltcStepPercent / 100);
  const dt2TapFactor = 1 + (txDt2.oltcTapPosition - 5) * (txDt2.oltcStepPercent / 100);

  const src11A = txDt1.energized && isClosedPath(bay11Inc1);
  const src11B = txDt2.energized && isClosedPath(bay11Inc2);
  const cpl11 = isClosedPath(bc11);

  const bus11ALive = src11A || (cpl11 && src11B);
  const bus11BLive = src11B || (cpl11 && src11A);
  const v11SourceA = src11A ? 11 * (v33A / 33) * dt1TapFactor : 0;
  const v11SourceB = src11B ? 11 * (v33B / 33) * dt2TapFactor : 0;
  const v11A = src11A ? v11SourceA : (cpl11 ? v11SourceB : 0);
  const v11B = src11B ? v11SourceB : (cpl11 ? v11SourceA : 0);

  // Update Busbar objects
  for (const bus of busbars) {
    if (bus.id === 'BUS-132-A') {
      bus.energized = bus132ALive;
      bus.voltageKvLive = Number(v132A.toFixed(2));
      bus.connectedSourceCount = (src132A ? 1 : 0) + (cpl132 && src132B ? 1 : 0);
    } else if (bus.id === 'BUS-132-B') {
      bus.energized = bus132BLive;
      bus.voltageKvLive = Number(v132B.toFixed(2));
      bus.connectedSourceCount = (src132B ? 1 : 0) + (cpl132 && src132A ? 1 : 0);
    } else if (bus.id === 'BUS-33-A') {
      bus.energized = bus33ALive;
      bus.voltageKvLive = Number(v33A.toFixed(2));
      bus.connectedSourceCount = (src33A ? 1 : 0) + (cpl33 && src33B ? 1 : 0);
    } else if (bus.id === 'BUS-33-B') {
      bus.energized = bus33BLive;
      bus.voltageKvLive = Number(v33B.toFixed(2));
      bus.connectedSourceCount = (src33B ? 1 : 0) + (cpl33 && src33A ? 1 : 0);
    } else if (bus.id === 'BUS-11-A') {
      bus.energized = bus11ALive;
      bus.voltageKvLive = Number(v11A.toFixed(2));
      bus.connectedSourceCount = (src11A ? 1 : 0) + (cpl11 && src11B ? 1 : 0);
    } else if (bus.id === 'BUS-11-B') {
      bus.energized = bus11BLive;
      bus.voltageKvLive = Number(v11B.toFixed(2));
      bus.connectedSourceCount = (src11B ? 1 : 0) + (cpl11 && src11A ? 1 : 0);
    }
    bus.frequencyHz = bus.energized ? 50.0 : 0.0;
  }

  // 4. Calculate 11 kV Outgoing Feeder Loads first
  let bus11ALoadMw = 0;
  let bus11ALoadMvar = 0;
  let bus11BLoadMw = 0;
  let bus11BLoadMvar = 0;

  for (const bay of bays) {
    if (bay.voltageKv === 11 && (bay.bayType === 'OUTGOING_FEEDER' || bay.bayType === 'SPARE_FEEDER')) {
      const busLive = bay.busSection === 'A' ? bus11ALive : bus11BLive;
      const busV = bay.busSection === 'A' ? (bus11ALive ? 11.05 * dt1TapFactor : 0) : (bus11BLive ? 11.02 * dt2TapFactor : 0);
      if (busLive && isClosedPath(bay)) {
        bay.energized = true;
        bay.activePowerMw = Number(bay.nominalLoadMw.toFixed(2));
        bay.reactivePowerMvar = Number(bay.nominalLoadMvar.toFixed(2));
        bay.apparentPowerMva = Number(Math.hypot(bay.activePowerMw, bay.reactivePowerMvar).toFixed(2));
        bay.powerFactor = bay.apparentPowerMva > 0 ? Number((bay.activePowerMw / bay.apparentPowerMva).toFixed(3)) : 1.0;
        bay.voltageAbKv = Number(busV.toFixed(2));
        bay.voltageBcKv = Number((busV - 0.01).toFixed(2));
        bay.voltageCaKv = Number((busV + 0.01).toFixed(2));
        const amps = (bay.apparentPowerMva * 1000) / (Math.sqrt(3) * Math.max(busV, 1));
        bay.currentA = Number(amps.toFixed(1));
        bay.currentB = Number((amps * 0.997).toFixed(1));
        bay.currentC = Number((amps * 1.003).toFixed(1));
        bay.frequencyHz = 50.0;

        if (bay.busSection === 'A') {
          bus11ALoadMw += bay.activePowerMw;
          bus11ALoadMvar += bay.reactivePowerMvar;
        } else {
          bus11BLoadMw += bay.activePowerMw;
          bus11BLoadMvar += bay.reactivePowerMvar;
        }
      } else {
        bay.energized = false;
        bay.activePowerMw = 0;
        bay.reactivePowerMvar = 0;
        bay.apparentPowerMva = 0;
        bay.currentA = 0;
        bay.currentB = 0;
        bay.currentC = 0;
        bay.voltageAbKv = Number(busV.toFixed(2));
        bay.voltageBcKv = Number(busV.toFixed(2));
        bay.voltageCaKv = Number(busV.toFixed(2));
        bay.frequencyHz = busLive ? 50.0 : 0.0;
      }
    }
  }

  // 5. Distribute 11 kV Bus Load to 11-INC1, 11-INC2, and CB-11
  let dt1LoadMw = 0;
  let dt1LoadMvar = 0;
  let dt2LoadMw = 0;
  let dt2LoadMvar = 0;

  if (src11A && src11B) {
    dt1LoadMw = bus11ALoadMw;
    dt1LoadMvar = bus11ALoadMvar;
    dt2LoadMw = bus11BLoadMw;
    dt2LoadMvar = bus11BLoadMvar;
  } else if (src11A && !src11B && cpl11) {
    dt1LoadMw = bus11ALoadMw + bus11BLoadMw;
    dt1LoadMvar = bus11ALoadMvar + bus11BLoadMvar;
  } else if (!src11A && src11B && cpl11) {
    dt2LoadMw = bus11ALoadMw + bus11BLoadMw;
    dt2LoadMvar = bus11ALoadMvar + bus11BLoadMvar;
  } else {
    if (src11A) {
      dt1LoadMw = bus11ALoadMw;
      dt1LoadMvar = bus11ALoadMvar;
    }
    if (src11B) {
      dt2LoadMw = bus11BLoadMw;
      dt2LoadMvar = bus11BLoadMvar;
    }
  }

  const updateBayFromPower = (bay: BayEquipment | undefined, pMw: number, qMvar: number, vKv: number, isLive: boolean) => {
    if (!bay) return;
    bay.energized = isLive;
    bay.activePowerMw = Number(pMw.toFixed(2));
    bay.reactivePowerMvar = Number(qMvar.toFixed(2));
    bay.apparentPowerMva = Number(Math.hypot(pMw, qMvar).toFixed(2));
    bay.powerFactor = bay.apparentPowerMva > 0 ? Number((pMw / bay.apparentPowerMva).toFixed(3)) : 1.0;
    bay.voltageAbKv = Number(vKv.toFixed(2));
    bay.voltageBcKv = Number(vKv.toFixed(2));
    bay.voltageCaKv = Number(vKv.toFixed(2));
    const amps = vKv > 0 ? (bay.apparentPowerMva * 1000) / (Math.sqrt(3) * vKv) : 0;
    bay.currentA = Number(amps.toFixed(1));
    bay.currentB = Number((amps * 0.998).toFixed(1));
    bay.currentC = Number((amps * 1.002).toFixed(1));
    bay.frequencyHz = isLive ? 50.0 : 0.0;
  };

  updateBayFromPower(bay11Inc1, dt1LoadMw, dt1LoadMvar, bus11ALive ? 11.05 * dt1TapFactor : 0, src11A);
  updateBayFromPower(bay11Inc2, dt2LoadMw, dt2LoadMvar, bus11BLive ? 11.02 * dt2TapFactor : 0, src11B);
  const bc11Mw = cpl11 ? (src11A && !src11B ? bus11BLoadMw : !src11A && src11B ? bus11ALoadMw : 0) : 0;
  const bc11Mvar = cpl11 ? (src11A && !src11B ? bus11BLoadMvar : !src11A && src11B ? bus11ALoadMvar : 0) : 0;
  updateBayFromPower(bc11, bc11Mw, bc11Mvar, bus11ALive || bus11BLive ? 11.04 : 0, cpl11 && (bus11ALive || bus11BLive));

  txDt1.activePowerMw = Number(dt1LoadMw.toFixed(2));
  txDt1.reactivePowerMvar = Number(dt1LoadMvar.toFixed(2));
  txDt1.loadPercent = Number(((Math.hypot(dt1LoadMw, dt1LoadMvar) / txDt1.ratingMva) * 100).toFixed(1));

  txDt2.activePowerMw = Number(dt2LoadMw.toFixed(2));
  txDt2.reactivePowerMvar = Number(dt2LoadMvar.toFixed(2));
  txDt2.loadPercent = Number(((Math.hypot(dt2LoadMw, dt2LoadMvar) / txDt2.ratingMva) * 100).toFixed(1));

  // 6. Calculate 33 kV Outgoing Feeders + Dist TX Feeders
  let bus33ALoadMw = 0;
  let bus33ALoadMvar = 0;
  let bus33BLoadMw = 0;
  let bus33BLoadMvar = 0;

  for (const bay of bays) {
    if (bay.voltageKv === 33 && (bay.bayType === 'OUTGOING_FEEDER' || bay.bayType === 'DIST_TX_FEEDER')) {
      const busLive = bay.busSection === 'A' ? bus33ALive : bus33BLive;
      const busV = bay.busSection === 'A' ? (bus33ALive ? 33.0 * t1TapFactor : 0) : (bus33BLive ? 33.0 * t2TapFactor : 0);

      if (bay.id === 'BAY-33-TF1') {
        const p = txDt1.energized ? dt1LoadMw : 0;
        const q = txDt1.energized ? dt1LoadMvar : 0;
        updateBayFromPower(bay, p, q, busV, txDt1.energized);
        bus33ALoadMw += p;
        bus33ALoadMvar += q;
      } else if (bay.id === 'BAY-33-TF2') {
        const p = txDt2.energized ? dt2LoadMw : 0;
        const q = txDt2.energized ? dt2LoadMvar : 0;
        updateBayFromPower(bay, p, q, busV, txDt2.energized);
        bus33BLoadMw += p;
        bus33BLoadMvar += q;
      } else if (busLive && isClosedPath(bay)) {
        updateBayFromPower(bay, bay.nominalLoadMw, bay.nominalLoadMvar, busV, true);
        if (bay.busSection === 'A') {
          bus33ALoadMw += bay.nominalLoadMw;
          bus33ALoadMvar += bay.nominalLoadMvar;
        } else {
          bus33BLoadMw += bay.nominalLoadMw;
          bus33BLoadMvar += bay.nominalLoadMvar;
        }
      } else {
        updateBayFromPower(bay, 0, 0, busV, false);
      }
    }
  }

  // 7. Distribute 33 kV Bus Load to 33-INC1 (T1), 33-INC2 (T2), and CB-33
  let t1LoadMw = 0;
  let t1LoadMvar = 0;
  let t2LoadMw = 0;
  let t2LoadMvar = 0;

  if (src33A && src33B) {
    t1LoadMw = bus33ALoadMw;
    t1LoadMvar = bus33ALoadMvar;
    t2LoadMw = bus33BLoadMw;
    t2LoadMvar = bus33BLoadMvar;
  } else if (src33A && !src33B && cpl33) {
    t1LoadMw = bus33ALoadMw + bus33BLoadMw;
    t1LoadMvar = bus33ALoadMvar + bus33BLoadMvar;
  } else if (!src33A && src33B && cpl33) {
    t2LoadMw = bus33ALoadMw + bus33BLoadMw;
    t2LoadMvar = bus33ALoadMvar + bus33BLoadMvar;
  } else {
    if (src33A) {
      t1LoadMw = bus33ALoadMw;
      t1LoadMvar = bus33ALoadMvar;
    }
    if (src33B) {
      t2LoadMw = bus33BLoadMw;
      t2LoadMvar = bus33BLoadMvar;
    }
  }

  updateBayFromPower(bay33Inc1, t1LoadMw, t1LoadMvar, bus33ALive ? 33.0 * t1TapFactor : 0, src33A);
  updateBayFromPower(bay33Inc2, t2LoadMw, t2LoadMvar, bus33BLive ? 33.0 * t2TapFactor : 0, src33B);
  const bc33Mw = cpl33 ? (src33A && !src33B ? bus33BLoadMw : !src33A && src33B ? bus33ALoadMw : 0) : 0;
  const bc33Mvar = cpl33 ? (src33A && !src33B ? bus33BLoadMvar : !src33A && src33B ? bus33ALoadMvar : 0) : 0;
  updateBayFromPower(bc33, bc33Mw, bc33Mvar, bus33ALive || bus33BLive ? 33.05 : 0, cpl33 && (bus33ALive || bus33BLive));

  txT1.activePowerMw = Number(t1LoadMw.toFixed(2));
  txT1.reactivePowerMvar = Number(t1LoadMvar.toFixed(2));
  txT1.loadPercent = Number(((Math.hypot(t1LoadMw, t1LoadMvar) / txT1.ratingMva) * 100).toFixed(1));
  txT1.coolingStage = txT1.loadPercent > 75 ? 'ONAF-2' : txT1.loadPercent > 40 ? 'ONAF-1' : 'ONAN';

  txT2.activePowerMw = Number(t2LoadMw.toFixed(2));
  txT2.reactivePowerMvar = Number(t2LoadMvar.toFixed(2));
  txT2.loadPercent = Number(((Math.hypot(t2LoadMw, t2LoadMvar) / txT2.ratingMva) * 100).toFixed(1));
  txT2.coolingStage = txT2.loadPercent > 75 ? 'ONAF-2' : txT2.loadPercent > 40 ? 'ONAF-1' : 'ONAN';

  // 8. Update 132 kV Bays (132-T1, 132-T2, CB-132, 132-L1, 132-L2)
  updateBayFromPower(bay132T1, txT1.energized ? t1LoadMw : 0, txT1.energized ? t1LoadMvar : 0, Number(v132A.toFixed(2)), txT1.energized);
  updateBayFromPower(bay132T2, txT2.energized ? t2LoadMw : 0, txT2.energized ? t2LoadMvar : 0, Number(v132B.toFixed(2)), txT2.energized);

  let l1Mw = 0;
  let l1Mvar = 0;
  let l2Mw = 0;
  let l2Mvar = 0;

  if (src132A && src132B) {
    l1Mw = bay132T1?.activePowerMw || 0;
    l1Mvar = bay132T1?.reactivePowerMvar || 0;
    l2Mw = bay132T2?.activePowerMw || 0;
    l2Mvar = bay132T2?.reactivePowerMvar || 0;
  } else if (src132A && !src132B && cpl132) {
    l1Mw = (bay132T1?.activePowerMw || 0) + (bay132T2?.activePowerMw || 0);
    l1Mvar = (bay132T1?.reactivePowerMvar || 0) + (bay132T2?.reactivePowerMvar || 0);
  } else if (!src132A && src132B && cpl132) {
    l2Mw = (bay132T1?.activePowerMw || 0) + (bay132T2?.activePowerMw || 0);
    l2Mvar = (bay132T1?.reactivePowerMvar || 0) + (bay132T2?.reactivePowerMvar || 0);
  } else {
    if (src132A) {
      l1Mw = bay132T1?.activePowerMw || 0;
      l1Mvar = bay132T1?.reactivePowerMvar || 0;
    }
    if (src132B) {
      l2Mw = bay132T2?.activePowerMw || 0;
      l2Mvar = bay132T2?.reactivePowerMvar || 0;
    }
  }

  updateBayFromPower(l1, l1Mw, l1Mvar, src132A ? 132.4 : 0, src132A);
  updateBayFromPower(l2, l2Mw, l2Mvar, src132B ? 132.2 : 0, src132B);
  const bc132Mw = cpl132 ? (src132A && !src132B ? bay132T2?.activePowerMw || 0 : !src132A && src132B ? bay132T1?.activePowerMw || 0 : 0) : 0;
  const bc132Mvar = cpl132 ? (src132A && !src132B ? bay132T2?.reactivePowerMvar || 0 : !src132A && src132B ? bay132T1?.reactivePowerMvar || 0 : 0) : 0;
  updateBayFromPower(bc132, bc132Mw, bc132Mvar, bus132ALive || bus132BLive ? 132.3 : 0, cpl132 && (bus132ALive || bus132BLive));

  // 9. Evaluate CILO1 Interlocking Permissives for every bay
  const flt14Active = faults.some((f) => f.id === 'FLT-14' && f.active);

  for (const bay of bays) {
    const reasons: string[] = [];
    if (bay.earthSwitchState === 'CLOSED') {
      reasons.push('Earth Switch Q8 is CLOSED');
    }
    if (bay.busDisconnectorState === 'OPEN' || bay.lineDisconnectorState === 'OPEN') {
      reasons.push('Disconnector Q1/Q9 is OPEN');
    }
    if (!bay.springCharged) {
      reasons.push('Closing Spring Discharged (SOPM1.SprChg=FALSE)');
    }
    if (!bay.tcsHealthy) {
      reasons.push('Trip Circuit Supervision 74TC Alarm Active');
    }
    if (!bay.dcSupplyHealthy) {
      reasons.push('110V DC Control Supply Failed');
    }
    if (bay.protectionTripActive) {
      reasons.push(`Master Trip Lockout 86 Active (${bay.activeTripFunctions.join(', ')})`);
    }
    if (bay.bayType === 'BUS_COUPLER') {
      if (bay.id === 'BAY-132-BC' && l1?.breakerState === 'CLOSED' && l2?.breakerState === 'CLOSED') {
        reasons.push('Anti-paralleling 2-out-of-3 scheme: Both LINE-1 and LINE-2 CBs are CLOSED');
      }
      if (bay.id === 'BAY-33-BC' && bay33Inc1?.breakerState === 'CLOSED' && bay33Inc2?.breakerState === 'CLOSED') {
        reasons.push('Anti-paralleling 2-out-of-3 scheme: Both 33-INC1 and 33-INC2 CBs are CLOSED');
      }
      if (bay.id === 'BAY-33-BC' && flt14Active) {
        reasons.push('Fault F14 Active: Stale GOOSE Disconnector Q1 Intermediate status on 33-INC1');
      }
      if (bay.id === 'BAY-11-BC' && bay11Inc1?.breakerState === 'CLOSED' && bay11Inc2?.breakerState === 'CLOSED') {
        reasons.push('Anti-paralleling 2-out-of-3 scheme: Both 11-INC1 and 11-INC2 CBs are CLOSED');
      }
    }

    if (reasons.length === 0) {
      bay.interlockPermissive = true;
      bay.interlockReason = 'CILO1.EnaCls = TRUE (All apparatus & synch-check permissives satisfied)';
    } else {
      bay.interlockPermissive = false;
      bay.interlockReason = `INTERLOCK BLOCKED (CILO1.EnaCls = FALSE): ${reasons.join(' | ')}`;
    }
  }

  return { bays, transformers, busbars };
}

const initialSolved = solveSubstationElectricalGraph(
  INITIAL_BAYS,
  INITIAL_TRANSFORMERS,
  INITIAL_BUSBARS,
  INITIAL_FAULT_SCENARIOS
);

const INITIAL_TRENDS: TrendPoint[] = [
  { time: '14:30:00', totalLoadMw: 55.4, totalLoadMvar: 17.8, v132Kv: 132.3, v33Kv: 33.05, v11Kv: 11.03, freqHz: 50.01 },
  { time: '14:31:00', totalLoadMw: 56.1, totalLoadMvar: 18.0, v132Kv: 132.4, v33Kv: 33.08, v11Kv: 11.04, freqHz: 50.00 },
  { time: '14:32:00', totalLoadMw: 56.5, totalLoadMvar: 18.2, v132Kv: 132.3, v33Kv: 33.06, v11Kv: 11.04, freqHz: 49.99 },
  { time: '14:33:00', totalLoadMw: 56.8, totalLoadMvar: 18.3, v132Kv: 132.4, v33Kv: 33.10, v11Kv: 11.05, freqHz: 50.00 },
  { time: '14:34:00', totalLoadMw: 56.7, totalLoadMvar: 18.3, v132Kv: 132.4, v33Kv: 33.09, v11Kv: 11.04, freqHz: 50.01 },
  { time: '14:35:00', totalLoadMw: 56.8, totalLoadMvar: 18.3, v132Kv: 132.4, v33Kv: 33.10, v11Kv: 11.05, freqHz: 50.00 },
];

const INITIAL_SOE: SoeRecord[] = [
  {
    id: 'SOE-INIT-1',
    timestampMs: '2026-11-02T14:30:00.104Z',
    bayId: 'BAY-132-L1',
    bayName: 'LINE-1: 132 kV Incoming Line',
    iedId: 'IED-132-L1',
    sourceRef: 'IED_132_L1Application/LLN0$BR$brcbSt01',
    eventDescription: 'MMS Association Established & General Interrogation (GI) Complete',
    valueChange: 'GI = TRUE (All 50 SAS Points Synchronized)',
    quality: 'GOOD',
    cause: 'SYSTEM_DIAG',
  },
  {
    id: 'SOE-INIT-2',
    timestampMs: '2026-11-02T14:31:12.418Z',
    bayId: 'BAY-132-T1',
    bayName: 'Transformer Bay T1 HV',
    iedId: 'IED-132-T1',
    sourceRef: 'IED_132_T1System/YLTC1.TapPos.val.stVal',
    eventDescription: 'Transformer T1 OLTC Automatic Voltage Regulator Step Check',
    valueChange: 'Tap Position = 9 (Nominal 132/33 kV)',
    quality: 'GOOD',
    cause: 'SYSTEM_DIAG',
  },
  {
    id: 'SOE-INIT-3',
    timestampMs: '2026-11-02T14:32:45.002Z',
    bayId: 'BAY-11-SP1',
    bayName: '11 kV Spare Feeder Bay 09',
    iedId: 'IED-11-SP1',
    sourceRef: 'IED_11_SP1LD0/XSWI2.Pos.stVal',
    eventDescription: 'Feeder Earth Switch Q8 Confirmed CLOSED (Bay Isolated in LOCAL)',
    valueChange: 'Dbpos = 10 (CLOSED)',
    quality: 'GOOD',
    cause: 'SYSTEM_DIAG',
  },
];

const INITIAL_ALARMS: AlarmRecord[] = [
  {
    id: 'ALM-INIT-1',
    timestamp: '2026-11-02T14:32:45.002Z',
    bayId: 'BAY-11-SP1',
    bayName: '11 kV Spare Feeder Bay 09 (Bus 11-A)',
    iedId: 'IED-11-SP1',
    signalName: 'Local/Remote Selection & Earth Switch Q8 Closed',
    iec61850Ref: 'IED_11_SP1LD0/CSWI1.Loc.stVal',
    severity: 'INFO',
    state: 'ACTIVE_ACK',
    valueText: 'LOCAL Mode Active / Q8 Earthing Switch CLOSED',
  },
];

export const useSubstationStore = create<SubstationStoreState>((set, get) => ({
  activeTab: 'HERO',
  selectedBayId: 'BAY-33-F03',
  selectedIedId: 'IED-33-F03',
  sldTheme: 'DARK_CINEMATIC',
  networkRedundancyMode: 'PRP',
  bilingualTeluguEnabled: false,
  simulationRunning: true,
  simTickCount: 0,
  lastCommandFeedback: null,
  busTransferMode: 'MANUAL',
  busTransferModes: { 132: 'MANUAL', 33: 'MANUAL', 11: 'MANUAL' },
  busTransferStatus: 'IDLE',
  busTransferMessage: 'Manual transfer selected. CB-132 remains under operator control.',

  busbars: initialSolved.busbars,
  transformers: initialSolved.transformers,
  bays: initialSolved.bays,
  ieds: buildMultiVendorIeds(initialSolved.bays),
  infrastructure: INFRASTRUCTURE_DEVICES,
  networkLinks: buildNetworkLinks(initialSolved.bays),
  gooseControlBlocks: INITIAL_GOOSE_CONTROL_BLOCKS,
  signals: instantiateSignalsForSubstation(initialSolved.bays, initialSolved.transformers),
  alarms: INITIAL_ALARMS,
  soeLog: INITIAL_SOE,
  faultScenarios: INITIAL_FAULT_SCENARIOS,
  fatSatTests: INITIAL_FAT_SAT_TESTS,
  trendHistory: INITIAL_TRENDS,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSelectedBayId: (bayId) => {
    const bay = get().bays.find((b) => b.id === bayId);
    set({
      selectedBayId: bayId,
      selectedIedId: bay ? bay.iedId : get().selectedIedId,
    });
  },
  setSelectedIedId: (iedId) => {
    const bay = get().bays.find((b) => b.iedId === iedId);
    set({
      selectedIedId: iedId,
      selectedBayId: bay ? bay.id : get().selectedBayId,
    });
  },
  setSldTheme: (theme) => set({ sldTheme: theme }),
  setNetworkRedundancyMode: (mode) => set({ networkRedundancyMode: mode }),
  toggleBilingualTelugu: () => set((s) => ({ bilingualTeluguEnabled: !s.bilingualTeluguEnabled })),
  toggleSimulationRunning: () => set((s) => ({ simulationRunning: !s.simulationRunning })),
  clearCommandFeedback: () => set({ lastCommandFeedback: null }),

  setBusTransferMode: (mode) => get().setVoltageBusTransferMode(132, mode),
  setVoltageBusTransferMode: (level, mode) => {
    set((state) => ({
      busTransferModes: { ...state.busTransferModes, [level]: mode },
      ...(level === 132 ? { busTransferMode: mode } : {}),
      busTransferStatus: 'IDLE',
      busTransferMessage: `${level} kV bus transfer set to ${mode}.`,
    }));
    if (mode === 'AUTO') get().requestBusTransfer(level);
  },
  requestBusTransfer: (level = 132) => {
    const state = get();
    const config = {
      132: ['BAY-132-L1', 'BAY-132-L2', 'BAY-132-BC', 'BUS-132-A', 'BUS-132-B'],
      33: ['BAY-33-INC1', 'BAY-33-INC2', 'BAY-33-BC', 'BUS-33-A', 'BUS-33-B'],
      11: ['BAY-11-INC1', 'BAY-11-INC2', 'BAY-11-BC', 'BUS-11-A', 'BUS-11-B'],
    } as const;
    const [idA, idB, idCoupler, idBusA, idBusB] = config[level];
    const sourceA = state.bays.find((bay) => bay.id === idA);
    const sourceB = state.bays.find((bay) => bay.id === idB);
    const coupler = state.bays.find((bay) => bay.id === idCoupler);
    const busA = state.busbars.find((bus) => bus.id === idBusA);
    const busB = state.busbars.find((bus) => bus.id === idBusB);
    if (!sourceA || !sourceB || !coupler || !busA || !busB) return false;
    const deadA = !busA.energized && busB.energized;
    const deadB = !busB.energized && busA.energized;
    const failed = deadA ? sourceA : sourceB;
    const healthy = deadA ? sourceB : sourceA;
    const receiving = deadA ? busA : busB;
    const checks: string[] = [];
    if (!deadA && !deadB) checks.push('requires exactly one dead bus and one live bus');
    if (deadA || deadB) {
      if (failed.breakerState !== 'OPEN') checks.push('failed-side incomer breaker is not OPEN');
      if (healthy.breakerState !== 'CLOSED' || healthy.busDisconnectorState !== 'CLOSED' ||
          healthy.lineDisconnectorState !== 'CLOSED' || healthy.earthSwitchState !== 'OPEN' ||
          healthy.quality !== 'GOOD') checks.push('healthy source path unavailable');
      if (receiving.voltageKvLive >= level * 0.1) checks.push('receiving bus not confirmed dead');
    }
    if (coupler.breakerState !== 'OPEN') checks.push('bus coupler is not OPEN');
    if (coupler.localRemote !== 'REMOTE') checks.push('bus coupler is in LOCAL');
    if (coupler.quality !== 'GOOD') checks.push('bad IED quality');
    if (!coupler.interlockPermissive) checks.push(coupler.interlockReason);
    if (!state.simulationRunning) checks.push('simulation paused');
    if (checks.length) {
      set({ busTransferStatus: 'BLOCKED', busTransferMessage: `${level} kV transfer blocked: ${checks.join('; ')}` });
      return false;
    }
    // This is a dead-bus training transfer; no live-live paralleling or synch-close.
    const success = get().commandBreaker(idCoupler, 'CLOSED', 'SCADA_SBO');
    const message = success
      ? `${level} kV transfer completed: ${healthy.bayCode} feeds both bus sections through ${coupler.breakerId}.`
      : `${level} kV transfer rejected: ${get().lastCommandFeedback?.message ?? 'command failed'}`;
    const ts = nextTrainingSoeTime(50);
    set((current) => ({
      busTransferStatus: success ? 'SUCCESS' : 'BLOCKED',
      busTransferMessage: message,
      soeLog: [{
        id: `SOE-BT-${level}-${Date.now()}`,
        timestampMs: ts, bayId: coupler.id, bayName: coupler.name, iedId: coupler.iedId,
        sourceRef: `${coupler.iedId.replace(/-/g, '_')}/CILO1.EnaCls`,
        eventDescription: `${level} kV ${current.busTransferModes[level]} Bus Transfer ${success ? 'Completed' : 'Blocked'}`,
        valueChange: message, quality: coupler.quality,
        cause: success ? 'OPERATOR_CMD' : 'INTERLOCK_BLOCK',
      }, ...current.soeLog],
    }));
    return success;
  },

  commandBreaker: (bayId, targetState, origin = 'SCADA_SBO') => {
    let state = get();
    let bay = state.bays.find((b) => b.id === bayId);
    if (!bay) return false;

    let ts = nextTrainingSoeTime();
    // 1. Check communication health if origin is SCADA_SBO
    if (origin === 'SCADA_SBO' && bay.quality !== 'GOOD') {
      const msg = `SBO Command Rejected on ${bay.bayCode}: IED ${bay.iedId} communication is offline or data quality is ${bay.quality}.`;
      set({
        lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
        soeLog: [
          {
            id: `SOE-${Date.now()}`,
            timestampMs: ts,
            bayId: bay.id,
            bayName: bay.name,
            iedId: bay.iedId,
            sourceRef: `${bay.iedId.replace(/-/g, '_')}/CSWI1.Pos.Oper`,
            eventDescription: 'MMS SBO Command Rejected — AddCause: Communication-Loss / Invalid-Quality',
            valueChange: `Target=${targetState} ABORTED`,
            quality: bay.quality,
            cause: 'INTERLOCK_BLOCK',
          },
          ...state.soeLog,
        ],
      });
      return false;
    }

    // 2. Check Local/Remote hierarchy
    if (origin === 'SCADA_SBO' && bay.localRemote === 'LOCAL') {
      const msg = `SBO Command Rejected on ${bay.bayCode}: Bay selector switch 43LR is in LOCAL mode (CSWI1.Loc.stVal = true). Switch to REMOTE first.`;
      set({
        lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
        soeLog: [
          {
            id: `SOE-${Date.now()}`,
            timestampMs: ts,
            bayId: bay.id,
            bayName: bay.name,
            iedId: bay.iedId,
            sourceRef: `${bay.iedId.replace(/-/g, '_')}/CSWI1.Pos.Oper`,
            eventDescription: 'MMS CommandTermination- (AddCause: Blocked-by-switching-hierarchy)',
            valueChange: `CSWI1.Loc = LOCAL`,
            quality: bay.quality,
            cause: 'INTERLOCK_BLOCK',
          },
          ...state.soeLog,
        ],
      });
      return false;
    }

    // Open-transition return-to-normal: never reconnect an incoming source while
    // its bus sections remain tied through a closed bus coupler.
    // In AUTO, open and confirm the coupler before allowing the source close.
    // In MANUAL, require the operator to open the coupler first.
    if (targetState === 'CLOSED' && bay.breakerState === 'OPEN') {
      const sourceLevels: Record<string, 132 | 33 | 11> = {
        'BAY-132-L1': 132, 'BAY-132-L2': 132,
        'BAY-33-INC1': 33, 'BAY-33-INC2': 33,
        'BAY-11-INC1': 11, 'BAY-11-INC2': 11,
      };
      const level = sourceLevels[bayId];
      if (level) {
        const couplerId = `BAY-${level}-BC`;
        const coupler = state.bays.find((b) => b.id === couplerId);
        if (coupler?.breakerState === 'CLOSED') {
          if (state.busTransferModes[level] !== 'AUTO') {
            const msg = `${level} kV source close blocked: open ${coupler.breakerId} first (manual open-transition restoration).`;
            set({ lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
              busTransferStatus: 'BLOCKED', busTransferMessage: msg });
            return false;
          }
          const opened = get().commandBreaker(couplerId, 'OPEN', 'SCADA_SBO');
          if (!opened || get().bays.find((b) => b.id === couplerId)?.breakerState !== 'OPEN') {
            const msg = `${level} kV source close blocked: coupler opening/feedback confirmation failed.`;
            set({ lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
              busTransferStatus: 'BLOCKED', busTransferMessage: msg });
            return false;
          }
          state = get();
          bay = state.bays.find((b) => b.id === bayId)!;
          set({ busTransferStatus: 'SUCCESS',
            busTransferMessage: `${level} kV return to normal: ${coupler.breakerId} opened before closing ${bay.breakerId}.` });
        }
      }
    }

    // Bus coupler close is dead-bus transfer only in this training simulator.
    // Reject unsafe live-live and dead-dead attempts, including direct HMI commands.
    if (targetState === 'CLOSED' && bay.bayType === 'BUS_COUPLER') {
      const pair = bay.voltageKv === 132 ? ['BUS-132-A', 'BUS-132-B'] :
        bay.voltageKv === 33 ? ['BUS-33-A', 'BUS-33-B'] : ['BUS-11-A', 'BUS-11-B'];
      const first = state.busbars.find((bus) => bus.id === pair[0]);
      const second = state.busbars.find((bus) => bus.id === pair[1]);
      if (!first || !second || first.energized === second.energized) {
        const msg = `Coupler close blocked on ${bay.bayCode}: one bus must be dead and the other live. Live-live paralleling requires a separate engineered synch-check scheme.`;
        set({ lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts } });
        return false;
      }
    }

    // 3. If closing, check CILO1 interlocking permissive
    if (targetState === 'CLOSED' && !bay.interlockPermissive) {
      const msg = `SBO Close Command Blocked on ${bay.bayCode}: ${bay.interlockReason}`;
      set({
        lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
        soeLog: [
          {
            id: `SOE-${Date.now()}`,
            timestampMs: ts,
            bayId: bay.id,
            bayName: bay.name,
            iedId: bay.iedId,
            sourceRef: `${bay.iedId.replace(/-/g, '_')}/CILO1.EnaCls`,
            eventDescription: `MMS CommandTermination- (AddCause: Blocked-by-interlocking) — ${bay.interlockReason}`,
            valueChange: `CILO1.EnaCls = FALSE`,
            quality: bay.quality,
            cause: 'INTERLOCK_BLOCK',
          },
          ...state.soeLog,
        ],
      });
      return false;
    }

    // Issue the source CLOSE only after the AUTO coupler OPEN feedback is confirmed.
    ts = nextTrainingSoeTime();
    // Execute state transition
    const updatedBays = state.bays.map((b) =>
      b.id === bayId
        ? {
            ...b,
            breakerState: targetState,
            opCounter: b.opCounter + 1,
            lastUpdated: ts,
          }
        : b
    );

    const solved = solveSubstationElectricalGraph(
      updatedBays,
      state.transformers,
      state.busbars,
      state.faultScenarios
    );

    const commandSoe: SoeRecord = {
      id: `SOE-CMD-${bay.id}-${ts}`,
      timestampMs: ts,
      bayId: bay.id, bayName: bay.name, iedId: bay.iedId,
      sourceRef: `${bay.iedId.replace(/-/g, '_')}/CSWI1.Pos.Oper`,
      eventDescription: `SBO ${origin} command issued — ${bay.breakerId} ${targetState}`,
      valueChange: `Requested=${targetState}; awaiting XCBR1 feedback`,
      quality: bay.quality, cause: 'OPERATOR_CMD',
    };
    const feedbackTs = nextTrainingSoeTime(40);
    const newSoe: SoeRecord = {
      id: `SOE-FB-${bay.id}-${feedbackTs}`,
      timestampMs: feedbackTs,
      bayId: bay.id,
      bayName: bay.name,
      iedId: bay.iedId,
      sourceRef: `${bay.iedId.replace(/-/g, '_')}/XCBR1.Pos.stVal`,
      eventDescription: `Breaker position feedback confirmed — ${bay.breakerId} ${targetState}`,
      valueChange: `${bay.breakerState} → ${targetState} (Dbpos=${targetState === 'CLOSED' ? '10' : '01'})`,
      quality: bay.quality,
      cause: 'OPERATOR_CMD',
    };

    const updatedGoose = state.gooseControlBlocks.map((g) =>
      g.publisherIedId === bay.iedId
        ? { ...g, stNum: g.stNum + 1, sqNum: 0, lastTxTimestamp: ts }
        : g
    );

    // SOE / alarm transitions for source loss, bus undervoltage, restoration and
    // bus-coupler operation. These are simulated indications, not field protection.
    const transferLevels = [132, 33, 11] as const;
    const transferSoe: SoeRecord[] = [];
    const transferAlarms: AlarmRecord[] = [];
    let revisedAlarms = state.alarms;
    const appendTransferEvent = (refBay: BayEquipment, description: string, value: string, cause: SoeRecord['cause'] = 'SYSTEM_DIAG') => {
      transferSoe.push({
        id: `SOE-ATS-${ts}-${transferSoe.length}-${refBay.id}`,
        timestampMs: nextTrainingSoeTime(15), bayId: refBay.id, bayName: refBay.name, iedId: refBay.iedId,
        sourceRef: `${refBay.iedId.replace(/-/g, '_')}/MMXU1.PhV.phsA.cVal.mag.f`,
        eventDescription: description, valueChange: value, quality: refBay.quality, cause,
      });
    };
    for (const level of transferLevels) {
      for (const section of ['A', 'B'] as const) {
        const busId = `BUS-${level}-${section}`;
        const previous = state.busbars.find((b) => b.id === busId);
        const current = solved.busbars.find((b) => b.id === busId);
        if (!previous || !current || (previous.energized === current.energized && Math.abs(previous.voltageKvLive - current.voltageKvLive) < 0.1)) continue;
        const refBay = solved.bays.find((b) => b.id === `BAY-${level}-BC`) ?? bay;
        const alarmKey = `ALM-ATS-${busId}`;
        appendTransferEvent(refBay, `${level} kV Bus ${section} ${!current.energized ? 'undervoltage / dead bus' : !previous.energized ? 'voltage restored' : 'voltage changed (source / tap)'}`,
          `${previous.voltageKvLive.toFixed(2)} kV → ${current.voltageKvLive.toFixed(2)} kV`);
        if (previous.energized && current.energized) continue; // Live-to-live voltage change: no dead-bus alarm.
        if (!current.energized) {
          revisedAlarms = revisedAlarms.filter((a) => a.id !== alarmKey);
          transferAlarms.push({
            id: alarmKey, timestamp: ts, bayId: refBay.id, bayName: `${level} kV Bus ${section}`,
            iedId: refBay.iedId, signalName: `ATS ${level} kV Bus ${section} Undervoltage`,
            iec61850Ref: `${refBay.iedId.replace(/-/g, '_')}/ATCC1.Bus${section}Dead`,
            severity: 'CRITICAL', state: 'ACTIVE_UNACK',
            valueText: `Bus ${section} DEAD — ${current.voltageKvLive.toFixed(2)} kV; transfer permissives required`,
          });
        } else {
          revisedAlarms = revisedAlarms.map((a) => a.id === alarmKey ? { ...a, state: 'CLEARED' } : a);
        }
      }
    }

    set({
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      alarms: [...transferAlarms, ...revisedAlarms],
      ieds: buildMultiVendorIeds(solved.bays),
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      gooseControlBlocks: updatedGoose,
      soeLog: [...transferSoe.reverse(), newSoe, commandSoe, ...state.soeLog],
      lastCommandFeedback: {
        type: 'SUCCESS',
        message: `CommandTermination+: ${bay.breakerId} (${bay.bayCode}) successfully ${targetState} via SBO Enhanced Security.`,
        timestamp: ts,
      },
    });
    // Opening an incoming source may cause a dead bus at its own or downstream level.
    // Evaluate all enabled automatic transfers from upstream to downstream.
    if (targetState === 'OPEN' && ['BAY-132-L1', 'BAY-132-L2', 'BAY-33-INC1',
      'BAY-33-INC2', 'BAY-11-INC1', 'BAY-11-INC2'].includes(bayId)) {
      for (const level of [132, 33, 11] as const) {
        if (get().busTransferModes[level] !== 'AUTO') continue;
        const pair = get().busbars.filter((bus) => bus.id === `BUS-${level}-A` || bus.id === `BUS-${level}-B`);
        if (pair.length === 2 && pair[0].energized !== pair[1].energized) get().requestBusTransfer(level);
      }
    }
    return true;
  },

  commandDisconnector: (bayId, which, targetState) => {
    const state = get();
    const bay = state.bays.find((b) => b.id === bayId);
    if (!bay) return false;
    const ts = nowIso();

    // Off-load disconnector interlocking rule: CB must be OPEN before operating Q1, Q9, or Q8
    if (bay.breakerState === 'CLOSED') {
      const msg = `Interlock Blocked (CILO1): Cannot operate ${which} while Circuit Breaker ${bay.breakerId} is CLOSED (No-load switching rule).`;
      set({
        lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
        soeLog: [
          {
            id: `SOE-${Date.now()}`,
            timestampMs: ts,
            bayId: bay.id,
            bayName: bay.name,
            iedId: bay.iedId,
            sourceRef: `${bay.iedId.replace(/-/g, '_')}/XSWI1.Pos.Oper`,
            eventDescription: msg,
            valueChange: `Blocked while CB=CLOSED`,
            quality: bay.quality,
            cause: 'INTERLOCK_BLOCK',
          },
          ...state.soeLog,
        ],
      });
      return false;
    }

    // Cannot close Earth Switch Q8 if Q1 or Q9 is CLOSED
    if (
      which === 'EARTH_Q8' &&
      targetState === 'CLOSED' &&
      (bay.busDisconnectorState === 'CLOSED' || bay.lineDisconnectorState === 'CLOSED')
    ) {
      const msg = `Interlock Blocked (CILO1): Open both Bus Disconnector Q1 and Line Disconnector Q9 before closing Earth Switch Q8.`;
      set({
        lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
      });
      return false;
    }

    // Cannot close Q1 or Q9 if Earth Switch Q8 is CLOSED
    if (
      (which === 'BUS_Q1' || which === 'LINE_Q9') &&
      targetState === 'CLOSED' &&
      bay.earthSwitchState === 'CLOSED'
    ) {
      const msg = `Interlock Blocked (CILO1): Open Earth Switch Q8 before closing Disconnector ${which}.`;
      set({
        lastCommandFeedback: { type: 'ERROR', message: msg, timestamp: ts },
      });
      return false;
    }

    const updatedBays = state.bays.map((b) => {
      if (b.id !== bayId) return b;
      return {
        ...b,
        busDisconnectorState: which === 'BUS_Q1' ? targetState : b.busDisconnectorState,
        lineDisconnectorState: which === 'LINE_Q9' ? targetState : b.lineDisconnectorState,
        earthSwitchState: which === 'EARTH_Q8' ? targetState : b.earthSwitchState,
        lastUpdated: ts,
      };
    });

    const solved = solveSubstationElectricalGraph(
      updatedBays,
      state.transformers,
      state.busbars,
      state.faultScenarios
    );

    set({
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      ieds: buildMultiVendorIeds(solved.bays),
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      soeLog: [
        {
          id: `SOE-${Date.now()}`,
          timestampMs: ts,
          bayId: bay.id,
          bayName: bay.name,
          iedId: bay.iedId,
          sourceRef: `${bay.iedId.replace(/-/g, '_')}/${which === 'EARTH_Q8' ? 'XSWI2' : 'XSWI1'}.Pos.stVal`,
          eventDescription: `Switchgear Apparatus ${which} on ${bay.bayCode} set to ${targetState}`,
          valueChange: `Pos = ${targetState}`,
          quality: bay.quality,
          cause: 'OPERATOR_CMD',
        },
        ...state.soeLog,
      ],
      lastCommandFeedback: {
        type: 'SUCCESS',
        message: `${which} on ${bay.bayCode} successfully switched to ${targetState}.`,
        timestamp: ts,
      },
    });
    return true;
  },

  setBayLocalRemote: (bayId, mode) => {
    const state = get();
    const bay = state.bays.find((b) => b.id === bayId);
    if (!bay) return;
    const ts = nowIso();

    const updatedBays = state.bays.map((b) =>
      b.id === bayId ? { ...b, localRemote: mode, lastUpdated: ts } : b
    );
    const solved = solveSubstationElectricalGraph(
      updatedBays,
      state.transformers,
      state.busbars,
      state.faultScenarios
    );

    set({
      bays: solved.bays,
      ieds: buildMultiVendorIeds(solved.bays),
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      soeLog: [
        {
          id: `SOE-${Date.now()}`,
          timestampMs: ts,
          bayId: bay.id,
          bayName: bay.name,
          iedId: bay.iedId,
          sourceRef: `${bay.iedId.replace(/-/g, '_')}/CSWI1.Loc.stVal`,
          eventDescription: `Bay 43LR Selector Switch changed to ${mode}`,
          valueChange: `CSWI1.Loc.stVal = ${mode === 'LOCAL'}`,
          quality: bay.quality,
          cause: 'OPERATOR_CMD',
        },
        ...state.soeLog,
      ],
      lastCommandFeedback: {
        type: 'INFO',
        message: `${bay.bayCode} control authority switched to ${mode}.`,
        timestamp: ts,
      },
    });
  },

  triggerProtectionTrip: (bayId, tripFunction = '50/51 Overcurrent') => {
    const state = get();
    const bay = state.bays.find((b) => b.id === bayId);
    if (!bay) return;
    const ts = nowIso();

    // Cascade trip: if HV Transformer bay trips on 87T, also trip its LV incomer via GOOSE intertrip!
    const intertripBayIds = new Set<string>([bayId]);
    if (bay.id === 'BAY-132-T1') intertripBayIds.add('BAY-33-INC1');
    if (bay.id === 'BAY-132-T2') intertripBayIds.add('BAY-33-INC2');
    if (bay.id === 'BAY-33-TF1') intertripBayIds.add('BAY-11-INC1');
    if (bay.id === 'BAY-33-TF2') intertripBayIds.add('BAY-11-INC2');

    const updatedBays = state.bays.map((b) => {
      if (!intertripBayIds.has(b.id)) return b;
      const funcs = Array.from(new Set([...b.activeTripFunctions, b.id === bayId ? tripFunction : '87T GOOSE Intertrip']));
      return {
        ...b,
        breakerState: 'OPEN' as const,
        protectionTripActive: true,
        activeTripFunctions: funcs,
        autoRecloseStatus: b.autoRecloseStatus === 'DISABLED' ? ('DISABLED' as const) : ('LOCKOUT' as const),
        opCounter: b.opCounter + 1,
        lastUpdated: ts,
      };
    });

    const updatedTx = state.transformers.map((tx) => {
      if (tx.hvBayId === bayId) {
        return { ...tx, differentialTrip: tripFunction.includes('87T') || tripFunction.includes('Diff') };
      }
      return tx;
    });

    const solved = solveSubstationElectricalGraph(
      updatedBays,
      updatedTx,
      state.busbars,
      state.faultScenarios
    );

    const newAlarms: AlarmRecord[] = [
      {
        id: `ALM-${Date.now()}-1`,
        timestamp: ts,
        bayId: bay.id,
        bayName: bay.name,
        iedId: bay.iedId,
        signalName: `Protection Trip: ${tripFunction} (PTRC1.Tr.general)`,
        iec61850Ref: `${bay.iedId.replace(/-/g, '_')}/PTRC1.Tr.general`,
        severity: 'CRITICAL',
        state: 'ACTIVE_UNACK',
        valueText: `TRIPPED — ${bay.breakerId} OPEN (Lockout 86 Latched)`,
      },
      ...state.alarms,
    ];

    const newSoeEntries: SoeRecord[] = [
      {
        id: `SOE-${Date.now()}-3`,
        timestampMs: ts,
        bayId: bay.id,
        bayName: bay.name,
        iedId: bay.iedId,
        sourceRef: `${bay.iedId.replace(/-/g, '_')}/XCBR1.Pos.stVal`,
        eventDescription: `Circuit Breaker ${bay.breakerId} 52a/52b Transition → OPEN (Fault Cleared)`,
        valueChange: `Dbpos = 01 (OPEN)`,
        quality: bay.quality,
        cause: 'PROTECTION_TRIP',
      },
      {
        id: `SOE-${Date.now()}-2`,
        timestampMs: ts,
        bayId: bay.id,
        bayName: bay.name,
        iedId: bay.iedId,
        sourceRef: `${bay.iedId.replace(/-/g, '_')}/PTRC1.Tr.general`,
        eventDescription: `Master Protection Trip Conditioning Asserted (${tripFunction}) + GOOSE Burst Published`,
        valueChange: `PTRC1.Tr.general = TRUE`,
        quality: bay.quality,
        cause: 'PROTECTION_TRIP',
      },
      {
        id: `SOE-${Date.now()}-1`,
        timestampMs: ts,
        bayId: bay.id,
        bayName: bay.name,
        iedId: bay.iedId,
        sourceRef: `${bay.iedId.replace(/-/g, '_')}/PTOC1.Str.general`,
        eventDescription: `Protection Element Pickup (${tripFunction}) Detected Fault Current`,
        valueChange: `Str.general = TRUE (Forward)`,
        quality: bay.quality,
        cause: 'PROTECTION_TRIP',
      },
    ];

    const updatedGoose = state.gooseControlBlocks.map((g) => ({
      ...g,
      stNum: g.stNum + 1,
      sqNum: 0,
      lastTxTimestamp: ts,
    }));

    set({
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      ieds: buildMultiVendorIeds(solved.bays),
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      gooseControlBlocks: updatedGoose,
      alarms: newAlarms,
      soeLog: [...newSoeEntries, ...state.soeLog],
      lastCommandFeedback: {
        type: 'ERROR',
        message: `PROTECTION TRIP: ${bay.bayCode} (${bay.breakerId}) tripped on ${tripFunction}! SLD, HMI, Alarms, GOOSE, and SOE updated.`,
        timestamp: ts,
      },
    });
  },

  resetProtectionTrip: (bayId) => {
    const state = get();
    const bay = state.bays.find((b) => b.id === bayId);
    if (!bay) return;
    const ts = nowIso();

    const updatedBays = state.bays.map((b) =>
      b.id === bayId
        ? {
            ...b,
            protectionTripActive: false,
            activeTripFunctions: [],
            autoRecloseStatus: b.autoRecloseStatus === 'LOCKOUT' ? ('READY' as const) : b.autoRecloseStatus,
            lastUpdated: ts,
          }
        : b
    );

    const updatedTx = state.transformers.map((tx) =>
      tx.hvBayId === bayId || tx.lvBayId === bayId
        ? { ...tx, differentialTrip: false, refTrip: false, buchholzTrip: false, pressureReliefTrip: false }
        : tx
    );

    const solved = solveSubstationElectricalGraph(
      updatedBays,
      updatedTx,
      state.busbars,
      state.faultScenarios
    );

    const updatedAlarms = state.alarms.map((a) =>
      a.bayId === bayId && a.state !== 'CLEARED' ? { ...a, state: 'CLEARED' as const } : a
    );

    set({
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      ieds: buildMultiVendorIeds(solved.bays),
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      alarms: updatedAlarms,
      soeLog: [
        {
          id: `SOE-${Date.now()}`,
          timestampMs: ts,
          bayId: bay.id,
          bayName: bay.name,
          iedId: bay.iedId,
          sourceRef: `${bay.iedId.replace(/-/g, '_')}/PTRC1.Tr.general`,
          eventDescription: `Master Trip Lockout Relay (86) & LED Target Reset on ${bay.bayCode}`,
          valueChange: `PTRC1.Tr.general = FALSE`,
          quality: bay.quality,
          cause: 'OPERATOR_CMD',
        },
        ...state.soeLog,
      ],
      lastCommandFeedback: {
        type: 'SUCCESS',
        message: `Protection Trip Lockout (ANSI 86) reset on ${bay.bayCode}. Breaker is now ready for SBO Close.`,
        timestamp: ts,
      },
    });
  },

  stepTransformerOltc: (txId, direction) => {
    const state = get();
    const tx = state.transformers.find((t) => t.id === txId);
    if (!tx) return;
    const ts = nowIso();

    const nextTap =
      direction === 'RAISE'
        ? Math.min(tx.oltcMaxTap, tx.oltcTapPosition + 1)
        : Math.max(tx.oltcMinTap, tx.oltcTapPosition - 1);

    if (nextTap === tx.oltcTapPosition) return;

    const updatedTx = state.transformers.map((t) =>
      t.id === txId ? { ...t, oltcTapPosition: nextTap } : t
    );

    const solved = solveSubstationElectricalGraph(
      state.bays,
      updatedTx,
      state.busbars,
      state.faultScenarios
    );

    set({
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      soeLog: [
        {
          id: `SOE-${Date.now()}`,
          timestampMs: ts,
          bayId: tx.hvBayId,
          bayName: tx.name,
          iedId: tx.iedId,
          sourceRef: `${tx.iedId.replace(/-/g, '_')}/YLTC1.TapPos.val.stVal`,
          eventDescription: `OLTC Motor Drive Step ${direction} on ${tx.designation}`,
          valueChange: `Tap ${tx.oltcTapPosition} → Tap ${nextTap}`,
          quality: 'GOOD',
          cause: 'OPERATOR_CMD',
        },
        ...state.soeLog,
      ],
      lastCommandFeedback: {
        type: 'SUCCESS',
        message: `${tx.designation} OLTC stepped ${direction} to Tap ${nextTap}. Secondary bus voltage updated.`,
        timestamp: ts,
      },
    });
  },

  addConfigurableFeederBay: ({ voltageKv, busSection, name, nominalLoadMw, nominalLoadMvar, vendor }) => {
    const state = get();
    const ts = nowIso();
    const existingCount = state.bays.filter(
      (b) => b.voltageKv === voltageKv && b.bayType === 'OUTGOING_FEEDER'
    ).length;
    const numStr = String(existingCount + 1).padStart(2, '0');
    const bayCode = `${voltageKv}-F${numStr}`;
    const bayId = `BAY-${bayCode}`;
    const breakerId = `CB-${bayCode}`;
    const iedId = `IED-${bayCode}`;

    const newBay: BayEquipment = {
      id: bayId,
      bayCode,
      name: `${voltageKv} kV Outgoing Feeder ${numStr} (${name || 'Custom Engineered Load'})`,
      voltageKv: voltageKv as VoltageLevel,
      busSection,
      bayType: 'OUTGOING_FEEDER',
      breakerId,
      breakerState: 'CLOSED',
      lineDisconnectorState: 'CLOSED',
      busDisconnectorState: 'CLOSED',
      earthSwitchState: 'OPEN',
      localRemote: 'REMOTE',
      springCharged: true,
      sf6PressureNormal: true,
      tcsHealthy: true,
      dcSupplyHealthy: true,
      opCounter: 1,
      interlockPermissive: true,
      interlockReason: `Permissive OK: Earth switch OPEN, Bus ${voltageKv}-${busSection} live`,
      protectionTripActive: false,
      activeTripFunctions: [],
      autoRecloseStatus: 'READY',
      iedId,
      ctRatio: voltageKv === 33 ? '400/1 A' : '300/1 A',
      vtRatio: voltageKv === 33 ? '33000/110 V' : '11000/110 V',
      nominalLoadMw: Math.max(0.2, nominalLoadMw),
      nominalLoadMvar: Math.max(0.1, nominalLoadMvar),
      currentA: 0,
      currentB: 0,
      currentC: 0,
      voltageAbKv: voltageKv,
      voltageBcKv: voltageKv,
      voltageCaKv: voltageKv,
      activePowerMw: nominalLoadMw,
      reactivePowerMvar: nominalLoadMvar,
      apparentPowerMva: Math.hypot(nominalLoadMw, nominalLoadMvar),
      powerFactor: 0.95,
      frequencyHz: 50.0,
      energyImportMwh: 10.0,
      energized: true,
      quality: 'GOOD',
      lastUpdated: ts,
      isUserCreated: true,
    };

    const nextBays = [...state.bays, newBay];
    const solved = solveSubstationElectricalGraph(
      nextBays,
      state.transformers,
      state.busbars,
      state.faultScenarios
    );

    set({
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      ieds: buildMultiVendorIeds(solved.bays),
      networkLinks: buildNetworkLinks(solved.bays),
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      selectedBayId: bayId,
      selectedIedId: iedId,
      soeLog: [
        {
          id: `SOE-${Date.now()}`,
          timestampMs: ts,
          bayId,
          bayName: newBay.name,
          iedId,
          sourceRef: `${iedId.replace(/-/g, '_')}/LLN0`,
          eventDescription: `Bay Engineering Editor commissioned new ${voltageKv} kV feeder bay ${bayCode} (${vendor}) with full IEC 61850 signal set`,
          valueChange: `Commissioned on Bus ${voltageKv}-${busSection}`,
          quality: 'GOOD',
          cause: 'SYSTEM_DIAG',
        },
        ...state.soeLog,
      ],
      lastCommandFeedback: {
        type: 'SUCCESS',
        message: `Commissioned new feeder bay ${bayCode} on Bus ${voltageKv}-${busSection} with IED ${iedId} and complete IEC 61850 signals.`,
        timestamp: ts,
      },
    });
  },

  removeConfigurableFeederBay: (bayId) => {
    const state = get();
    const bay = state.bays.find((b) => b.id === bayId);
    if (!bay) return;
    const ts = nowIso();

    const nextBays = state.bays.filter((b) => b.id !== bayId);
    const solved = solveSubstationElectricalGraph(
      nextBays,
      state.transformers,
      state.busbars,
      state.faultScenarios
    );

    set({
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      ieds: buildMultiVendorIeds(solved.bays),
      networkLinks: buildNetworkLinks(solved.bays),
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      selectedBayId: solved.bays[0]?.id || 'BAY-132-L1',
      lastCommandFeedback: {
        type: 'INFO',
        message: `Decommissioned feeder bay ${bay.bayCode} and removed its IED/signals from SLD and SCADA.`,
        timestamp: ts,
      },
    });
  },

  triggerGooseStateChangeBurst: (gocbId) => {
    const state = get();
    const ts = nowIso();
    const gocb = state.gooseControlBlocks.find((g) => g.id === gocbId);
    if (!gocb) return;

    const updatedGoose = state.gooseControlBlocks.map((g) =>
      g.id === gocbId
        ? { ...g, stNum: g.stNum + 1, sqNum: 0, lastTxTimestamp: ts }
        : g
    );

    set({
      gooseControlBlocks: updatedGoose,
      soeLog: [
        {
          id: `SOE-${Date.now()}`,
          timestampMs: ts,
          bayId: state.selectedBayId,
          bayName: gocb.publisherIedName,
          iedId: gocb.publisherIedId,
          sourceRef: gocb.gocbRef,
          eventDescription: `GOOSE State Change Burst (MinTime=4ms → 8ms → 16ms → 1000ms) on ${gocb.gocbName}`,
          valueChange: `stNum=${gocb.stNum + 1}, sqNum=0, APPID=${gocb.appId}`,
          quality: 'GOOD',
          cause: 'GOOSE_RX',
        },
        ...state.soeLog,
      ],
    });
  },

  setGooseMismatchFault: (gocbId, fault) => {
    const state = get();
    const ts = nowIso();
    const updatedGoose = state.gooseControlBlocks.map((g) =>
      g.id === gocbId
        ? {
            ...g,
            mismatchFault: fault,
            healthy: fault === 'NONE',
            extRefs: g.extRefs.map((er) => ({ ...er, bound: fault === 'NONE' })),
          }
        : g
    );

    set({
      gooseControlBlocks: updatedGoose,
      lastCommandFeedback: {
        type: fault === 'NONE' ? 'SUCCESS' : 'ERROR',
        message:
          fault === 'NONE'
            ? `GOOSE Control Block ${gocbId} restored to healthy subscription.`
            : `Injected GOOSE fault ${fault} on ${gocbId} — Subscriber LGOS1.St.stVal set to FALSE.`,
        timestamp: ts,
      },
    });
  },

  toggleRcbEnabled: (iedId, rcbName) => {
    const state = get();
    const updatedIeds = state.ieds.map((ied) => {
      if (ied.id !== iedId) return ied;
      return {
        ...ied,
        rcbs: ied.rcbs.map((r) => (r.name === rcbName ? { ...r, enabled: !r.enabled } : r)),
      };
    });
    set({ ieds: updatedIeds });
  },

  triggerMmsGeneralInterrogation: (iedId) => {
    const state = get();
    const ied = state.ieds.find((i) => i.id === iedId);
    if (!ied) return;
    const ts = nowIso();

    set({
      soeLog: [
        {
          id: `SOE-${Date.now()}`,
          timestampMs: ts,
          bayId: ied.bayId,
          bayName: ied.bayName,
          iedId: ied.id,
          sourceRef: `${ied.name}/LLN0$BR$brcbSt01`,
          eventDescription: `MMS General Interrogation (GI = TRUE) Executed on ${ied.name} (${ied.model})`,
          valueChange: `ReasonForInclusion = general-interrogation (Bit 5)`,
          quality: 'GOOD',
          cause: 'OPERATOR_CMD',
        },
        ...state.soeLog,
      ],
      lastCommandFeedback: {
        type: 'SUCCESS',
        message: `MMS General Interrogation (GI) completed on ${ied.name} (${ied.ipAddressLanA}:102). All BRCB/URCB datasets refreshed.`,
        timestamp: ts,
      },
    });
  },

  acknowledgeAlarm: (alarmId) => {
    set((s) => ({
      alarms: s.alarms.map((a) =>
        a.id === alarmId && a.state === 'ACTIVE_UNACK'
          ? { ...a, state: 'ACTIVE_ACK' }
          : a
      ),
    }));
  },

  acknowledgeAllAlarms: () => {
    set((s) => ({
      alarms: s.alarms.map((a) =>
        a.state === 'ACTIVE_UNACK' ? { ...a, state: 'ACTIVE_ACK' } : a
      ),
    }));
  },

  clearClearedAlarms: () => {
    set((s) => ({
      alarms: s.alarms.filter((a) => a.state !== 'CLEARED'),
    }));
  },

  toggleFaultScenario: (faultId) => {
    const state = get();
    const targetFault = state.faultScenarios.find((f) => f.id === faultId);
    if (!targetFault) return;

    const activating = !targetFault.active;
    const ts = nowIso();
    const nextFaults = state.faultScenarios.map((f) =>
      f.id === faultId ? { ...f, active: activating } : f
    );

    let updatedBays = [...state.bays];
    let updatedTx = [...state.transformers];
    let updatedLinks = [...state.networkLinks];
    let updatedInfra = [...state.infrastructure];
    let updatedGoose = [...state.gooseControlBlocks];
    let newAlarms = [...state.alarms];

    // Apply or clear deterministic fault effects across all subsystems
    if (faultId === 'FLT-01') {
      // Breaker fails to close (Spring Discharged on BAY-33-F03)
      updatedBays = updatedBays.map((b) =>
        b.id === 'BAY-33-F03' ? { ...b, springCharged: !activating, breakerState: activating ? 'OPEN' : b.breakerState } : b
      );
    } else if (faultId === 'FLT-02') {
      // Breaker Trip Circuit Supervision Failure on BAY-33-F01
      updatedBays = updatedBays.map((b) =>
        b.id === 'BAY-33-F01' ? { ...b, tcsHealthy: !activating } : b
      );
    } else if (faultId === 'FLT-03') {
      // Protection Relay Communication Loss on IED-33-F03 (preserve physical breaker state, mark quality OLD_DATA!)
      updatedBays = updatedBays.map((b) =>
        b.id === 'BAY-33-F03' ? { ...b, quality: activating ? 'OLD_DATA' : 'GOOD' } : b
      );
      updatedLinks = updatedLinks.map((lnk) =>
        lnk.sourceId === 'IED-33-F03' ? { ...lnk, status: activating ? 'DOWN' : 'UP' } : lnk
      );
    } else if (faultId === 'FLT-04') {
      // GOOSE Timeout on GOCB-33-F03-CILO
      updatedGoose = updatedGoose.map((g) =>
        g.id === 'GOCB-33-F03-CILO'
          ? { ...g, healthy: !activating, mismatchFault: activating ? 'TIMEOUT' : 'NONE' }
          : g
      );
    } else if (faultId === 'FLT-05') {
      // VLAN mismatch on GOCB-132-L1-TRIP
      updatedGoose = updatedGoose.map((g) =>
        g.id === 'GOCB-132-L1-TRIP'
          ? {
              ...g,
              vlanId: activating ? 999 : 101,
              healthy: !activating,
              mismatchFault: activating ? 'VLAN_MISMATCH' : 'NONE',
            }
          : g
      );
    } else if (faultId === 'FLT-09') {
      // Bad data quality on BAY-11-F04
      updatedBays = updatedBays.map((b) =>
        b.id === 'BAY-11-F04' ? { ...b, quality: activating ? 'TEST' : 'GOOD' } : b
      );
    } else if (faultId === 'FLT-10') {
      // Time Sync Failure on CLK-PTP-GM
      updatedInfra = updatedInfra.map((inf) =>
        inf.id === 'CLK-PTP-GM'
          ? {
              ...inf,
              status: activating ? 'DEGRADED' : 'ONLINE',
              ptpStatus: activating ? 'HOLDOVER / GPS ANTENNA FAULT (ClockNotSynchronized)' : 'GM Locked to 11 GPS/GLONASS Satellites (±45 ns accuracy)',
            }
          : inf
      );
    } else if (faultId === 'FLT-11') {
      // PRP LAN A failure
      updatedLinks = updatedLinks.map((lnk) =>
        lnk.lanPlane === 'LAN_A' ? { ...lnk, status: activating ? 'DOWN' : 'UP' } : lnk
      );
      updatedInfra = updatedInfra.map((inf) =>
        inf.id === 'SW-LAN-A1' ? { ...inf, status: activating ? 'OFFLINE' : 'ONLINE' } : inf
      );
    } else if (faultId === 'FLT-12') {
      // PRP LAN B failure
      updatedLinks = updatedLinks.map((lnk) =>
        lnk.lanPlane === 'LAN_B' ? { ...lnk, status: activating ? 'DOWN' : 'UP' } : lnk
      );
      updatedInfra = updatedInfra.map((inf) =>
        inf.id === 'SW-LAN-B1' ? { ...inf, status: activating ? 'OFFLINE' : 'ONLINE' } : inf
      );
    } else if (faultId === 'FLT-13') {
      // Transformer T1 Differential 87T Trip
      updatedTx = updatedTx.map((t) =>
        t.id === 'TX-T1'
          ? { ...t, differentialTrip: activating, buchholzAlarm: activating }
          : t
      );
      updatedBays = updatedBays.map((b) => {
        if (b.id === 'BAY-132-T1' || b.id === 'BAY-33-INC1') {
          return {
            ...b,
            breakerState: activating ? 'OPEN' : 'CLOSED',
            protectionTripActive: activating,
            activeTripFunctions: activating ? ['87T Transformer Differential', '63B Buchholz Intertrip'] : [],
          };
        }
        return b;
      });
    }

    const solved = solveSubstationElectricalGraph(
      updatedBays,
      updatedTx,
      state.busbars,
      nextFaults
    );

    if (activating) {
      newAlarms = [
        {
          id: `ALM-FLT-${Date.now()}`,
          timestamp: ts,
          bayId: state.selectedBayId,
          bayName: targetFault.targetBayOrIed,
          iedId: 'SAS-FAULT-INJ',
          signalName: `Fault Scenario Active: ${targetFault.code} — ${targetFault.title}`,
          iec61850Ref: `SIM/${targetFault.code}`,
          severity: 'CRITICAL',
          state: 'ACTIVE_UNACK',
          valueText: targetFault.symptoms[0],
        },
        ...newAlarms,
      ];
    } else {
      newAlarms = newAlarms.map((a) =>
        a.signalName.includes(targetFault.code) ? { ...a, state: 'CLEARED' } : a
      );
    }

    set({
      faultScenarios: nextFaults,
      bays: solved.bays,
      transformers: solved.transformers,
      busbars: solved.busbars,
      ieds: buildMultiVendorIeds(solved.bays),
      networkLinks: updatedLinks,
      infrastructure: updatedInfra,
      gooseControlBlocks: updatedGoose,
      signals: instantiateSignalsForSubstation(solved.bays, solved.transformers),
      alarms: newAlarms,
      soeLog: [
        {
          id: `SOE-FLT-${Date.now()}`,
          timestampMs: ts,
          bayId: state.selectedBayId,
          bayName: targetFault.targetBayOrIed,
          iedId: 'SAS-SIM-ENGINE',
          sourceRef: `SIM/${targetFault.code}`,
          eventDescription: `${activating ? 'INJECTED' : 'CLEARED'} Fault Scenario: ${targetFault.title}`,
          valueChange: activating ? 'FAULT_ACTIVE = TRUE' : 'FAULT_CLEARED = TRUE',
          quality: 'GOOD',
          cause: 'FAULT_INJECTION',
        },
        ...state.soeLog,
      ],
      lastCommandFeedback: {
        type: activating ? 'ERROR' : 'SUCCESS',
        message: `${activating ? 'Activated' : 'Cleared and validated'} fault scenario ${targetFault.code}: ${targetFault.title}`,
        timestamp: ts,
      },
    });
  },

  runFatSatTest: (testId) => {
    const state = get();
    const ts = nowIso();
    const activeFaultCount = state.faultScenarios.filter((f) => f.active).length;
    const offlineBays = state.bays.filter((b) => b.quality !== 'GOOD');
    const gooseFaults = state.gooseControlBlocks.filter((g) => !g.healthy);

    const updatedTests = state.fatSatTests.map((tc) => {
      if (tc.id !== testId) return tc;

      let pass = true;
      let actual = '';
      let evidence = '';

      switch (tc.id) {
        case 'TST-01':
          pass = offlineBays.length === 0;
          actual = pass
            ? `All ${state.ieds.length} IEDs responded with LPHD1.PhyHealth = Ok (1).`
            : `Communication fault detected on ${offlineBays.map((b) => b.iedId).join(', ')}.`;
          evidence = `Checked ${state.networkLinks.length} optical links; active faults=${activeFaultCount}.`;
          break;
        case 'TST-02':
          pass = !state.faultScenarios.find((f) => f.id === 'FLT-06')?.active && offlineBays.length === 0;
          actual = pass
            ? `TCP:102 ISO COTP & MMS Initiate-Response verified across ${state.ieds.length} IED servers.`
            : `MMS Association rejected on one or more IEDs.`;
          evidence = `Client IP 10.132.10.200 → GetServerDirectory(LD) matched ${state.signals.length} mapped signals.`;
          break;
        case 'TST-03':
          pass = !state.faultScenarios.find((f) => f.id === 'FLT-08')?.active;
          actual = pass
            ? `Validated ${state.signals.length} instantiated SAS points across 50-signal template catalogue with 0 schema errors.`
            : `Mapping discrepancy detected by validator (FLT-08 active).`;
          evidence = `Audited FC, CDC, ControlModel, and SCADA Tags across 132/33/11 kV bays.`;
          break;
        case 'TST-07':
          pass = gooseFaults.length === 0;
          actual = pass
            ? `All ${state.gooseControlBlocks.length} GoCBs publishing on valid IEEE 802.1Q VLANs with bound ExtRefs.`
            : `GOOSE subscription fault active on ${gooseFaults.map((g) => g.gocbName).join(', ')}.`;
          evidence = `Verified Multicast MAC 01-0C-CD-01-xx-xx, Ethertype 0x88B8, stNum/sqNum state machine.`;
          break;
        default:
          pass = activeFaultCount === 0;
          actual = pass
            ? `Verified deterministic response matching ${tc.standardRef} acceptance criteria.`
            : `Test flagged active fault injection (${activeFaultCount} active fault scenario(s)) — clear faults and re-test.`;
          evidence = `Timestamp=${ts} | Signals Audited=${state.signals.length} | SOE Buffer=${state.soeLog.length} events.`;
      }

      return {
        ...tc,
        status: pass ? ('PASS' as const) : ('FAIL' as const),
        actualSimulatedResult: actual,
        evidenceLog: evidence,
        lastExecuted: ts,
      };
    });

    set({
      fatSatTests: updatedTests,
      lastCommandFeedback: {
        type: 'INFO',
        message: `Executed commissioning procedure ${testId}. Inspect results & evidence in FAT/SAT Lab.`,
        timestamp: ts,
      },
    });
  },

  runAllFatSatTests: () => {
    const state = get();
    state.fatSatTests.forEach((tc) => get().runFatSatTest(tc.id));
  },

  stepSimulationTick: () => {
    const state = get();
    if (!state.simulationRunning) return;
    for (const level of [132, 33, 11] as const) {
      if (state.busTransferModes[level] !== 'AUTO') continue;
      const a = state.busbars.find((b) => b.id === `BUS-${level}-A`);
      const b = state.busbars.find((b) => b.id === `BUS-${level}-B`);
      if (a && b && a.energized !== b.energized && get().requestBusTransfer(level)) return;
    }

    const tick = state.simTickCount + 1;
    // Small realistic micro-fluctuation on energized feeder loads (±0.8%)
    const wave = Math.sin(tick * 0.45) * 0.008;
    const freqJitter = Number((50.0 + Math.sin(tick * 0.3) * 0.015).toFixed(3));

    const jitteredBays = state.bays.map((b, idx) => {
      if (!b.energized || b.activePowerMw === 0) return { ...b, frequencyHz: b.energized ? freqJitter : 0 };
      const bayWave = 1 + wave * ((idx % 3) - 1 === 0 ? 0.5 : (idx % 2 === 0 ? 1 : -0.7));
      const p = Number((b.activePowerMw * bayWave).toFixed(2));
      const q = Number((b.reactivePowerMvar * bayWave).toFixed(2));
      const s = Number(Math.hypot(p, q).toFixed(2));
      const amps = b.voltageAbKv > 0 ? Number(((s * 1000) / (Math.sqrt(3) * b.voltageAbKv)).toFixed(1)) : 0;
      return {
        ...b,
        activePowerMw: p,
        reactivePowerMvar: q,
        apparentPowerMva: s,
        currentA: amps,
        currentB: Number((amps * 0.998).toFixed(1)),
        currentC: Number((amps * 1.002).toFixed(1)),
        frequencyHz: freqJitter,
        energyImportMwh: Number((b.energyImportMwh + p * 0.0005).toFixed(2)),
      };
    });

    const l1 = jitteredBays.find((b) => b.id === 'BAY-132-L1');
    const l2 = jitteredBays.find((b) => b.id === 'BAY-132-L2');
    const totalLoadMw = Number(((l1?.activePowerMw || 0) + (l2?.activePowerMw || 0)).toFixed(2));
    const totalLoadMvar = Number(((l1?.reactivePowerMvar || 0) + (l2?.reactivePowerMvar || 0)).toFixed(2));
    const bus132 = state.busbars.find((b) => b.id === 'BUS-132-A');
    const bus33 = state.busbars.find((b) => b.id === 'BUS-33-A');
    const bus11 = state.busbars.find((b) => b.id === 'BUS-11-A');

    const newPoint: TrendPoint = {
      time: formatTimeShort(),
      totalLoadMw,
      totalLoadMvar,
      v132Kv: bus132?.voltageKvLive || 0,
      v33Kv: bus33?.voltageKvLive || 0,
      v11Kv: bus11?.voltageKvLive || 0,
      freqHz: freqJitter,
    };

    const updatedGoose = state.gooseControlBlocks.map((g) =>
      g.healthy ? { ...g, sqNum: (g.sqNum + 1) % 65535 } : g
    );

    set({
      simTickCount: tick,
      bays: jitteredBays,
      gooseControlBlocks: updatedGoose,
      signals: instantiateSignalsForSubstation(jitteredBays, state.transformers),
      trendHistory: [...state.trendHistory.slice(-19), newPoint],
    });
  },
}));
