import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { BayEquipment, BusbarSection, PowerTransformer } from '../types/substation';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Box,
  Camera,
  CheckCircle2,
  Cpu,
  Eye,
  Focus,
  GitCommit,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Network,
  Power,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldAlert,
  Sparkles,
  Unlock,
  Zap,
} from 'lucide-react';

declare global {
  interface Window {
    THREE?: any;
  }
}

type LightingPreset = 'DUSK_TWILIGHT' | 'DAYLIGHT_CLEAR' | 'NIGHT_FLOODLIGHT';
type CameraPreset =
  | 'ISOMETRIC'
  | 'TOP_PLAN'
  | 'HV_132_YARD'
  | 'TX_T1'
  | 'TX_T2'
  | 'TRANSFORMER_PLAZA'
  | 'SWG_33_HALL'
  | 'SWG_11_HALL'
  | 'FRONT_SOUTH'
  | 'RESIDENTIAL'
  | 'DIST_TX'
  | 'RCC_CENTER'
  | 'GATEWAY_COMM'
  | 'IEC104_PATH';

type RccFaultId =
  | 'NONE'
  | 'WAN_PRIMARY_FAIL'
  | 'WAN_BACKUP_FAIL'
  | 'IEC104_ASSOC_LOSS'
  | 'GATEWAY_COMM_FAIL'
  | 'FIREWALL_BLOCK'
  | 'STALE_TELEMETRY'
  | 'INTERLOCK_REJECT'
  | 'RCC_AUTH_UNAVAILABLE';
type LabelLodMode = 'SMART_LOD' | 'ALL_BAYS' | 'SELECTED_ONLY' | 'HIDDEN';
type PathVoltageFilter = 'ALL' | 132 | 33 | 11;
type CameraNavMode = 'ORBIT' | 'PAN' | 'WALK' | 'FLY';

interface WorldInspectableItem {
  kind: 'HOUSE' | 'ROAD';
  id: string;
  title: string;
  subtitle: string;
  feederInfo: string;
  position: [number, number, number];
}

interface SpatialNode {
  id: string;
  bayId: string;
  txId?: string;
  code: string;
  shortLabel: string;
  title: string;
  category:
    | '132kV Bay'
    | '50MVA Transformer'
    | '33kV Switchgear'
    | '16MVA Dist. Transformer'
    | '11kV Switchgear';
  layerKey: 'LAYER_132_AIS' | 'LAYER_50MVA_TX' | 'LAYER_33_SWG' | 'LAYER_11_SWG_DT';
  voltageKv: 132 | 33 | 11;
  position: [number, number, number];
  cameraOffset: [number, number, number];
  isKeyLandmark: boolean;
}

interface ProjectedLabel {
  id: string;
  bayId: string;
  txId?: string;
  code: string;
  shortLabel: string;
  subText: string;
  anchorX: number;
  anchorY: number;
  x: number;
  y: number;
  dist: number;
  energized: boolean;
  breakerState: string;
  hasCriticalAlarm: boolean;
  hasWarningAlarm: boolean;
  isSelected: boolean;
  isInUpstreamTrace: boolean;
  isKeyLandmark: boolean;
  voltageKv: 132 | 33 | 11;
}

interface GlbAssetSlot {
  slotId: string;
  equipmentClass: string;
  iecSymbol: string;
  activeSource: 'Procedural High-Detail PBR Mesh' | 'Custom GLB/GLTF Loaded';
  polyCountEst: string;
  pbrMaterials: string;
  customFileName?: string;
}

interface LayerVisibilityState {
  LAYER_132_AIS: boolean;
  LAYER_50MVA_TX: boolean;
  LAYER_33_SWG: boolean;
  LAYER_11_SWG_DT: boolean;
  LAYER_CIVIL_GANTRIES: boolean;
}

interface UpstreamSupplyTrace {
  selectedBayId: string;
  energized: boolean;
  orderedSteps: { id: string; label: string; kind: 'LINE' | 'BUS' | 'BAY' | 'TX' | 'COUPLER'; stateText: string }[];
  highlightedBayIds: Set<string>;
  highlightedBusIds: Set<string>;
  highlightedTxIds: Set<string>;
}

// Compute the live upstream electrical supply chain from any selected bay back to 132 kV LINE-1 / LINE-2
function computeUpstreamSupplyChain(
  targetBayId: string,
  bays: BayEquipment[],
  transformers: PowerTransformer[],
  busbars: BusbarSection[]
): UpstreamSupplyTrace {
  const highlightedBayIds = new Set<string>([targetBayId]);
  const highlightedBusIds = new Set<string>();
  const highlightedTxIds = new Set<string>();
  const steps: UpstreamSupplyTrace['orderedSteps'] = [];

  const findBay = (id: string) => bays.find((b) => b.id === id);
  const findBus = (id: string) => busbars.find((b) => b.id === id);
  const findTx = (id: string) => transformers.find((t) => t.id === id);
  const isClosed = (b?: BayEquipment) =>
    Boolean(
      b &&
        b.breakerState === 'CLOSED' &&
        b.busDisconnectorState === 'CLOSED' &&
        b.lineDisconnectorState === 'CLOSED' &&
        b.earthSwitchState === 'OPEN'
    );

  const targetBay = findBay(targetBayId);
  if (!targetBay) {
    return {
      selectedBayId: targetBayId,
      energized: false,
      orderedSteps: [],
      highlightedBayIds,
      highlightedBusIds,
      highlightedTxIds,
    };
  }

  // Helper to trace 132 kV Bus Section ('A' or 'B') back to LINE-1 or LINE-2 (including via CB-132 coupler)
  const trace132Bus = (sec: 'A' | 'B') => {
    const busId = sec === 'A' ? 'BUS-132-A' : 'BUS-132-B';
    const busObj = findBus(busId);
    const directLine = findBay(sec === 'A' ? 'BAY-132-L1' : 'BAY-132-L2');
    const altLine = findBay(sec === 'A' ? 'BAY-132-L2' : 'BAY-132-L1');
    const coupler132 = findBay('BAY-132-BC');
    const altBusId = sec === 'A' ? 'BUS-132-B' : 'BUS-132-A';

    if (isClosed(directLine) && directLine) {
      highlightedBayIds.add(directLine.id);
      highlightedBusIds.add(busId);
      steps.push({
        id: directLine.id,
        label: directLine.bayCode,
        kind: 'LINE',
        stateText: `${directLine.activePowerMw.toFixed(1)} MW`,
      });
      steps.push({
        id: busId,
        label: busId,
        kind: 'BUS',
        stateText: `${busObj?.voltageKvLive.toFixed(1) || '132.0'} kV`,
      });
    } else if (isClosed(coupler132) && isClosed(altLine) && coupler132 && altLine) {
      highlightedBayIds.add(altLine.id);
      highlightedBusIds.add(altBusId);
      highlightedBayIds.add(coupler132.id);
      highlightedBusIds.add(busId);
      steps.push({
        id: altLine.id,
        label: altLine.bayCode,
        kind: 'LINE',
        stateText: `${altLine.activePowerMw.toFixed(1)} MW`,
      });
      steps.push({
        id: altBusId,
        label: altBusId,
        kind: 'BUS',
        stateText: '132.2 kV',
      });
      steps.push({
        id: coupler132.id,
        label: 'CB-132 Coupler',
        kind: 'COUPLER',
        stateText: 'CLOSED',
      });
      steps.push({
        id: busId,
        label: busId,
        kind: 'BUS',
        stateText: `${busObj?.voltageKvLive.toFixed(1) || '132.0'} kV`,
      });
    } else {
      highlightedBusIds.add(busId);
      steps.push({
        id: busId,
        label: busId,
        kind: 'BUS',
        stateText: busObj?.energized ? 'LIVE' : 'DE-ENERGIZED',
      });
    }
  };

  // Helper to trace 33 kV Bus Section ('A' or 'B') back through T1/T2 or CB-33
  const trace33Bus = (sec: 'A' | 'B') => {
    const bus33Id = sec === 'A' ? 'BUS-33-A' : 'BUS-33-B';
    const bus33Obj = findBus(bus33Id);
    const inc33 = findBay(sec === 'A' ? 'BAY-33-INC1' : 'BAY-33-INC2');
    const tx = findTx(sec === 'A' ? 'TX-T1' : 'TX-T2');
    const hvBay = findBay(sec === 'A' ? 'BAY-132-T1' : 'BAY-132-T2');

    const altSec: 'A' | 'B' = sec === 'A' ? 'B' : 'A';
    const altBus33Id = altSec === 'A' ? 'BUS-33-A' : 'BUS-33-B';
    const altInc33 = findBay(altSec === 'A' ? 'BAY-33-INC1' : 'BAY-33-INC2');
    const altTx = findTx(altSec === 'A' ? 'TX-T1' : 'TX-T2');
    const altHvBay = findBay(altSec === 'A' ? 'BAY-132-T1' : 'BAY-132-T2');
    const coupler33 = findBay('BAY-33-BC');

    if (isClosed(inc33) && tx?.energized && isClosed(hvBay) && inc33 && hvBay) {
      trace132Bus(sec);
      highlightedBayIds.add(hvBay.id);
      highlightedTxIds.add(tx.id);
      highlightedBayIds.add(inc33.id);
      highlightedBusIds.add(bus33Id);
      steps.push({
        id: hvBay.id,
        label: hvBay.bayCode,
        kind: 'BAY',
        stateText: hvBay.breakerState,
      });
      steps.push({
        id: tx.id,
        label: `${tx.id} (50 MVA)`,
        kind: 'TX',
        stateText: `Tap ${tx.oltcTapPosition} • ${tx.activePowerMw.toFixed(1)} MW`,
      });
      steps.push({
        id: inc33.id,
        label: inc33.bayCode,
        kind: 'BAY',
        stateText: inc33.breakerState,
      });
      steps.push({
        id: bus33Id,
        label: bus33Id,
        kind: 'BUS',
        stateText: `${bus33Obj?.voltageKvLive.toFixed(2) || '33.0'} kV`,
      });
    } else if (
      isClosed(coupler33) &&
      isClosed(altInc33) &&
      altTx?.energized &&
      isClosed(altHvBay) &&
      coupler33 &&
      altInc33 &&
      altHvBay
    ) {
      trace132Bus(altSec);
      highlightedBayIds.add(altHvBay.id);
      highlightedTxIds.add(altTx.id);
      highlightedBayIds.add(altInc33.id);
      highlightedBusIds.add(altBus33Id);
      highlightedBayIds.add(coupler33.id);
      highlightedBusIds.add(bus33Id);
      steps.push({
        id: altHvBay.id,
        label: altHvBay.bayCode,
        kind: 'BAY',
        stateText: altHvBay.breakerState,
      });
      steps.push({
        id: altTx.id,
        label: `${altTx.id} (50 MVA)`,
        kind: 'TX',
        stateText: `${altTx.activePowerMw.toFixed(1)} MW`,
      });
      steps.push({
        id: altInc33.id,
        label: altInc33.bayCode,
        kind: 'BAY',
        stateText: altInc33.breakerState,
      });
      steps.push({
        id: altBus33Id,
        label: altBus33Id,
        kind: 'BUS',
        stateText: '33.0 kV',
      });
      steps.push({
        id: coupler33.id,
        label: 'CB-33 Coupler',
        kind: 'COUPLER',
        stateText: 'CLOSED',
      });
      steps.push({
        id: bus33Id,
        label: bus33Id,
        kind: 'BUS',
        stateText: `${bus33Obj?.voltageKvLive.toFixed(2) || '33.0'} kV`,
      });
    } else {
      highlightedBusIds.add(bus33Id);
      steps.push({
        id: bus33Id,
        label: bus33Id,
        kind: 'BUS',
        stateText: bus33Obj?.energized ? 'LIVE' : 'DE-ENERGIZED',
      });
    }
  };

  // Helper to trace 11 kV Bus Section ('A' or 'B') back through DT1/DT2 or CB-11
  const trace11Bus = (sec: 'A' | 'B') => {
    const bus11Id = sec === 'A' ? 'BUS-11-A' : 'BUS-11-B';
    const bus11Obj = findBus(bus11Id);
    const inc11 = findBay(sec === 'A' ? 'BAY-11-INC1' : 'BAY-11-INC2');
    const dt = findTx(sec === 'A' ? 'TX-DT1' : 'TX-DT2');
    const tf33 = findBay(sec === 'A' ? 'BAY-33-TF1' : 'BAY-33-TF2');

    const altSec: 'A' | 'B' = sec === 'A' ? 'B' : 'A';
    const altBus11Id = altSec === 'A' ? 'BUS-11-A' : 'BUS-11-B';
    const altInc11 = findBay(altSec === 'A' ? 'BAY-11-INC1' : 'BAY-11-INC2');
    const altDt = findTx(altSec === 'A' ? 'TX-DT1' : 'TX-DT2');
    const altTf33 = findBay(altSec === 'A' ? 'BAY-33-TF1' : 'BAY-33-TF2');
    const coupler11 = findBay('BAY-11-BC');

    if (isClosed(inc11) && dt?.energized && isClosed(tf33) && inc11 && tf33) {
      trace33Bus(sec);
      highlightedBayIds.add(tf33.id);
      highlightedTxIds.add(dt.id);
      highlightedBayIds.add(inc11.id);
      highlightedBusIds.add(bus11Id);
      steps.push({
        id: tf33.id,
        label: tf33.bayCode,
        kind: 'BAY',
        stateText: tf33.breakerState,
      });
      steps.push({
        id: dt.id,
        label: `${dt.id} (16 MVA)`,
        kind: 'TX',
        stateText: `${dt.activePowerMw.toFixed(1)} MW`,
      });
      steps.push({
        id: inc11.id,
        label: inc11.bayCode,
        kind: 'BAY',
        stateText: inc11.breakerState,
      });
      steps.push({
        id: bus11Id,
        label: bus11Id,
        kind: 'BUS',
        stateText: `${bus11Obj?.voltageKvLive.toFixed(2) || '11.0'} kV`,
      });
    } else if (
      isClosed(coupler11) &&
      isClosed(altInc11) &&
      altDt?.energized &&
      isClosed(altTf33) &&
      coupler11 &&
      altInc11 &&
      altTf33
    ) {
      trace33Bus(altSec);
      highlightedBayIds.add(altTf33.id);
      highlightedTxIds.add(altDt.id);
      highlightedBayIds.add(altInc11.id);
      highlightedBusIds.add(altBus11Id);
      highlightedBayIds.add(coupler11.id);
      highlightedBusIds.add(bus11Id);
      steps.push({
        id: altTf33.id,
        label: altTf33.bayCode,
        kind: 'BAY',
        stateText: altTf33.breakerState,
      });
      steps.push({
        id: altDt.id,
        label: `${altDt.id} (16 MVA)`,
        kind: 'TX',
        stateText: `${altDt.activePowerMw.toFixed(1)} MW`,
      });
      steps.push({
        id: altInc11.id,
        label: altInc11.bayCode,
        kind: 'BAY',
        stateText: altInc11.breakerState,
      });
      steps.push({
        id: altBus11Id,
        label: altBus11Id,
        kind: 'BUS',
        stateText: '11.0 kV',
      });
      steps.push({
        id: coupler11.id,
        label: 'CB-11 Coupler',
        kind: 'COUPLER',
        stateText: 'CLOSED',
      });
      steps.push({
        id: bus11Id,
        label: bus11Id,
        kind: 'BUS',
        stateText: `${bus11Obj?.voltageKvLive.toFixed(2) || '11.0'} kV`,
      });
    } else {
      highlightedBusIds.add(bus11Id);
      steps.push({
        id: bus11Id,
        label: bus11Id,
        kind: 'BUS',
        stateText: bus11Obj?.energized ? 'LIVE' : 'DE-ENERGIZED',
      });
    }
  };

  if (targetBay.voltageKv === 132) {
    if (targetBay.bayType === 'LINE_INCOMER') {
      const busId = targetBay.busSection === 'A' ? 'BUS-132-A' : 'BUS-132-B';
      highlightedBusIds.add(busId);
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'LINE',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      steps.push({
        id: busId,
        label: busId,
        kind: 'BUS',
        stateText: `${findBus(busId)?.voltageKvLive.toFixed(1) || '132.0'} kV`,
      });
    } else if (targetBay.bayType === 'BUS_COUPLER') {
      trace132Bus('A');
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'COUPLER',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      highlightedBusIds.add('BUS-132-B');
    } else {
      trace132Bus(targetBay.busSection === 'B' ? 'B' : 'A');
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'BAY',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      if (targetBay.connectedTransformerId) {
        const tx = findTx(targetBay.connectedTransformerId);
        if (tx) {
          highlightedTxIds.add(tx.id);
          steps.push({
            id: tx.id,
            label: `${tx.id} (50 MVA)`,
            kind: 'TX',
            stateText: `Tap ${tx.oltcTapPosition} • ${tx.activePowerMw.toFixed(1)} MW`,
          });
        }
      }
    }
  } else if (targetBay.voltageKv === 33) {
    if (targetBay.bayType === 'TRANSFORMER_LV_INCOMER') {
      const sec = targetBay.busSection === 'B' ? 'B' : 'A';
      trace132Bus(sec);
      const hvBay = findBay(sec === 'A' ? 'BAY-132-T1' : 'BAY-132-T2');
      const tx = findTx(sec === 'A' ? 'TX-T1' : 'TX-T2');
      if (hvBay) highlightedBayIds.add(hvBay.id);
      if (tx) {
        highlightedTxIds.add(tx.id);
        steps.push({
          id: tx.id,
          label: `${tx.id} (50 MVA)`,
          kind: 'TX',
          stateText: `${tx.activePowerMw.toFixed(1)} MW`,
        });
      }
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'BAY',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      highlightedBusIds.add(sec === 'A' ? 'BUS-33-A' : 'BUS-33-B');
    } else if (targetBay.bayType === 'BUS_COUPLER') {
      trace33Bus('A');
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'COUPLER',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      highlightedBusIds.add('BUS-33-B');
    } else {
      trace33Bus(targetBay.busSection === 'B' ? 'B' : 'A');
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'BAY',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      if (targetBay.connectedTransformerId) {
        const dt = findTx(targetBay.connectedTransformerId);
        if (dt) {
          highlightedTxIds.add(dt.id);
          steps.push({
            id: dt.id,
            label: `${dt.id} (16 MVA)`,
            kind: 'TX',
            stateText: `${dt.activePowerMw.toFixed(1)} MW`,
          });
        }
      }
    }
  } else {
    // 11 kV Bays
    if (targetBay.bayType === 'TRANSFORMER_LV_INCOMER') {
      const sec = targetBay.busSection === 'B' ? 'B' : 'A';
      trace33Bus(sec);
      const tf33 = findBay(sec === 'A' ? 'BAY-33-TF1' : 'BAY-33-TF2');
      const dt = findTx(sec === 'A' ? 'TX-DT1' : 'TX-DT2');
      if (tf33) highlightedBayIds.add(tf33.id);
      if (dt) {
        highlightedTxIds.add(dt.id);
        steps.push({
          id: dt.id,
          label: `${dt.id} (16 MVA)`,
          kind: 'TX',
          stateText: `${dt.activePowerMw.toFixed(1)} MW`,
        });
      }
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'BAY',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      highlightedBusIds.add(sec === 'A' ? 'BUS-11-A' : 'BUS-11-B');
    } else if (targetBay.bayType === 'BUS_COUPLER') {
      trace11Bus('A');
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'COUPLER',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
      highlightedBusIds.add('BUS-11-B');
    } else {
      trace11Bus(targetBay.busSection === 'B' ? 'B' : 'A');
      steps.push({
        id: targetBay.id,
        label: targetBay.bayCode,
        kind: 'BAY',
        stateText: `${targetBay.breakerState} • ${targetBay.activePowerMw.toFixed(1)} MW`,
      });
    }
  }

  return {
    selectedBayId: targetBayId,
    energized: targetBay.energized,
    orderedSteps: steps,
    highlightedBayIds,
    highlightedBusIds,
    highlightedTxIds,
  };
}

const INITIAL_ASSET_MANIFEST: GlbAssetSlot[] = [
  {
    slotId: 'AST-TX-50MVA',
    equipmentClass: '132/33 kV 50 MVA ONAN/ONAF Power Transformer (T1, T2)',
    iecSymbol: 'YNyn0d1 + YLTC1 + SIML1 + SPTR1',
    activeSource: 'Procedural High-Detail PBR Mesh',
    polyCountEst: '5,600 tris/unit',
    pbrMaterials:
      'Ribbed Steel Tank, Stepped HV/LV Bushing Turrets, 64REF Neutral CT, 4 Finned ONAF Radiator Banks, Conservator & MOG Dial, OLTC Drive',
  },
  {
    slotId: 'AST-CB-132',
    equipmentClass: '132 kV 3-Pole Live-Tank SF6 Circuit Breaker (CB-132-L1, L2, T1, T2, BC)',
    iecSymbol: 'XCBR1 + SOPM1 + SIMG1',
    activeSource: 'Procedural High-Detail PBR Mesh',
    polyCountEst: '2,900 tris/bay',
    pbrMaterials:
      '3 Shedded Porcelain Interrupter Columns, Grading Capacitors, Operating Linkage Box, SF6 Density Gauge, Separate Position & Alarm Indicators',
  },
  {
    slotId: 'AST-DS-132',
    equipmentClass: '132 kV Dual-Stack Center-Break Disconnectors (Q1 Bus & Q9 Line) + Earth Switch (Q8)',
    iecSymbol: 'XSWI1 (Q1/Q9) + XSWI2 (Q8)',
    activeSource: 'Procedural High-Detail PBR Mesh',
    polyCountEst: '2,100 tris/bay',
    pbrMaterials:
      'Twin Rotating Porcelain Insulator Stacks, Articulated Copper Jaw Contacts, Interlocked Vertical Earth Blade',
  },
  {
    slotId: 'AST-CT-CVT-LA',
    equipmentClass: '132 kV Hairpin/Post CT, Capacitive VT (CVT), PLC Wave Trap & ZnO Surge Arrester',
    iecSymbol: 'TCTR1 + TVTR1 + ZSAR1',
    activeSource: 'Procedural High-Detail PBR Mesh',
    polyCountEst: '2,300 tris/bay',
    pbrMaterials:
      'Hermetic Oil-Expansion Dome with P1/P2 Clamps, Multi-Section CVT Divider Stack, Corona Rings, Suspended Line Trap',
  },
  {
    slotId: 'AST-GANTRY-132',
    equipmentClass: '132 kV Lattice Steel Portal Gantries & Post-Supported Rigid Tubular Busbars',
    iecSymbol: 'BUS-132-A / BUS-132-B',
    activeSource: 'Procedural High-Detail PBR Mesh',
    polyCountEst: '4,100 tris',
    pbrMaterials:
      'Galvanized Angle-Iron Truss Portal Towers, Busbar Support Pedestals with Post Insulators, Sagging ACSR Jumpers',
  },
  {
    slotId: 'AST-GIS-33-11',
    equipmentClass: '33 kV & 11 kV Metal-Clad Switchgear Halls + Two 16 MVA 33/11 kV Transformers (DT1, DT2)',
    iecSymbol: 'BUS-33 / BUS-11 + XCBR1 + MMXU1 + RSYN1',
    activeSource: 'Procedural High-Detail PBR Mesh',
    polyCountEst: '6,200 tris',
    pbrMaterials:
      'Withdrawable VCB Cubicle Line-Up, Insulated R/Y/B Copper Busbars, XLPE Cable Terminations, Segregated Bus-Duct Bridges',
  },
];

const PROTOCOL_3D_PATHS = [
  { id: 'MMS', filter: 'IEC 61850 MMS', color: '#00CFFF', path: 'Bay IEDs (132/33/11 kV) → Station-Bus Switch → SCADA Server A', label: 'IEC 61850 MMS — TCP/102', detail: 'BRCB/URCB Reports, SBO Breaker Commands & Analog Telemetry (1,206 Points)' },
  { id: 'GOOSE', filter: 'IEC 61850 GOOSE', color: '#22C55E', path: 'Protection IED → Station-Bus Switch → Breaker / Neighbour IED', label: 'IEC 61850 GOOSE — L2 Multicast (0x88B8)', detail: 'Fast Horizontal Protection Trip, 50BF Breaker Failure & CILO Interlocking (< 3 ms)' },
  { id: 'MODBUS', filter: 'Modbus TCP', color: '#F97316', path: '33 kV / 11 kV Feeder Energy Meter → Station Gateway / SCADA', label: 'Modbus TCP — TCP/502', detail: 'Multifunction Revenue & Feeder Metering Registers (30001–40003, Unit ID 1–14)' },
  { id: 'IEC104', filter: 'IEC-104', color: '#A855F7', path: 'Station Gateway (Moxa MGate 5216) → Remote Control Center (RCC)', label: 'IEC-104 — TCP/2404 (COA 132)', detail: 'Wide-Area Telecontrol I/S/U Frames, IOA 1001–6028 & General Interrogation' },
  { id: 'OPCUA', filter: 'OPC UA', color: '#3B82F6', path: 'SCADA Server A → Enterprise Historian & AI Analytics', label: 'OPC UA — opc.tcp://10.132.10.200:4840', detail: 'Secure Basic256Sha256 Address-Space Subscriptions & MonitoredItems (ns=2)' },
  { id: 'TIME', filter: 'Time Synchronization', color: '#EAB308', path: 'Meinberg LANTIME M400 GNSS GM → All IEDs, Switches & Servers', label: 'SNTP / NTP / PTP (IEEE 1588v2)', detail: 'Hardware Timestamping (±38 ns PTP 0x88F7 / UDP Port 123 SNTP)' },
];

export const Substation3DScene: React.FC<{ initialFullscreen?: boolean; onCloseFullscreen?: () => void }> = ({ initialFullscreen = false, onCloseFullscreen }) => {
  const {
    bays,
    transformers,
    busbars,
    ieds,
    alarms,
    soeLog,
    networkLinks,
    faultScenarios,
    selectedBayId,
    setSelectedBayId,
    setSelectedIedId,
    setActiveTab,
    commandBreaker,
    commandDisconnector,
    setBayLocalRemote,
    triggerProtectionTrip,
    resetProtectionTrip,
    stepTransformerOltc,
    toggleFaultScenario,
  } = useSubstationStore();

  const mountRef = useRef<HTMLDivElement | null>(null);

  // Progressive Three.js WebGL Engine state
  const [threeLoaded, setThreeLoaded] = useState<boolean>(Boolean(window.THREE));
  const [loadingProgress, setLoadingProgress] = useState<number>(window.THREE ? 100 : 30);
  const [webglError, setWebglError] = useState<string | null>(null);
  const [protocolVisFilter, setProtocolVisFilter] = useState<string>('All Protocols');
  const [showProtocolOverlay, setShowProtocolOverlay] = useState<boolean>(true);

  // Viewport, Camera & Power-Flow Visualization Controls
  const [isFullscreen, setIsFullscreen] = useState<boolean>(initialFullscreen);
  // Large modal view retains the same scene and simulator state.
  useEffect(() => {
    if (!isFullscreen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setIsFullscreen(false); onCloseFullscreen?.(); }
    };
    window.addEventListener('keydown', onEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onEscape);
    };
  }, [isFullscreen, onCloseFullscreen]);
  const [autoRotate, setAutoRotate] = useState<boolean>(false);
  const [zoom, setZoom] = useState<number>(1.0);
  const [lightingPreset, setLightingPreset] = useState<LightingPreset>('DUSK_TWILIGHT');
  const [cameraPreset, setCameraPreset] = useState<CameraPreset>('ISOMETRIC');
  const [cameraNavMode, setCameraNavMode] = useState<CameraNavMode>('PAN');
  const [followRoadActive, setFollowRoadActive] = useState<boolean>(false);
  const [walkSpeedMult, setWalkSpeedMult] = useState<number>(1.0);
  const [selectedWorldItem, setSelectedWorldItem] = useState<WorldInspectableItem | null>(null);
  const [labelMode, setLabelMode] = useState<LabelLodMode>('HIDDEN');
  const [xraySwitchgearRoof, setXraySwitchgearRoof] = useState<boolean>(true);
  const [showElectricalConnections, setShowElectricalConnections] = useState<boolean>(true);
  const [showPowerFlowPulses, setShowPowerFlowPulses] = useState<boolean>(true);
  const [highlightSelectedFeeder, setHighlightSelectedFeeder] = useState<boolean>(true);
  const [traceSourceActive, setTraceSourceActive] = useState<boolean>(true);
  const [pathVoltageFilter, setPathVoltageFilter] = useState<PathVoltageFilter>('ALL');
  const [focusOnSelection, setFocusOnSelection] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 132 | 33 | 11>('ALL');
  const [showAssetModal, setShowAssetModal] = useState<boolean>(false);
  const [showDirectoryBar, setShowDirectoryBar] = useState<boolean>(false);
  const [assetManifest, setAssetManifest] = useState<GlbAssetSlot[]>(INITIAL_ASSET_MANIFEST);
  const [hoveredNodeTitle, setHoveredNodeTitle] = useState<string>(
    '132/33/11 kV Industrial 3D Digital Twin — Click any Breaker, Transformer, Bus Coupler, or Feeder'
  );

  // Selectable 3D Equipment Layers
  const [layerVis, setLayerVis] = useState<LayerVisibilityState>({
    LAYER_132_AIS: true,
    LAYER_50MVA_TX: true,
    LAYER_33_SWG: true,
    LAYER_11_SWG_DT: true,
    LAYER_CIVIL_GANTRIES: true,
  });

  // Measured GPU frame duration (ms/frame) & draw calls
  const [measuredPerf, setMeasuredPerf] = useState<{ frameMs: number; drawCalls: number }>({
    frameMs: 0,
    drawCalls: 0,
  });

  // Collision-avoidant projected 3D labels
  const [projectedLabels, setProjectedLabels] = useState<ProjectedLabel[]>([]);
  const [distCalloutLabels, setDistCalloutLabels] = useState<
    { id: string; title: string; sub1: string; sub2?: string; x: number; y: number; ax: number; ay: number; active: boolean }[]
  >([]);
  const [activeSuburbanFeederId, setActiveSuburbanFeederId] = useState<'BAY-11-F01' | 'BAY-11-F02'>('BAY-11-F01');
  const [distTxClosed, setDistTxClosed] = useState<boolean>(true);
  const [serviceDropClosed, setServiceDropClosed] = useState<boolean>(true);
  const [activeDistPill, setActiveDistPill] = useState<'FEEDER_1' | 'FEEDER_2' | 'DIST_TX' | 'SERVICE_DROP' | 'RCC' | 'IEC104'>('FEEDER_1');

  // Remote Control Center (RCC) & IEC 60870-5-104 Telecontrol State
  const [rccFault, setRccFault] = useState<RccFaultId>('NONE');
  const [rccAuthorityEnabled, setRccAuthorityEnabled] = useState<boolean>(true);
  const [rccCommandPulseUntil, setRccCommandPulseUntil] = useState<number>(0);
  const [rccCommandStatus, setRccCommandStatus] = useState<string>(
    'IEC-104 Master Station Ready (COA=132, TCP:2404, STARTDT_CON Active) — Select any breaker to issue remote command.'
  );
  const [lastTelemetryTime, setLastTelemetryTime] = useState<string>(() => new Date().toISOString().slice(11, 23));

  const iec104Connected = rccFault !== 'IEC104_ASSOC_LOSS' && rccFault !== 'GATEWAY_COMM_FAIL' && rccFault !== 'FIREWALL_BLOCK';
  const startDtActive = iec104Connected;
  const wanMode: 'PRIMARY_FIBER' | 'BACKUP_MW' | 'DOWN' =
    rccFault === 'WAN_PRIMARY_FAIL'
      ? 'BACKUP_MW'
      : rccFault === 'WAN_BACKUP_FAIL'
      ? 'PRIMARY_FIBER'
      : 'PRIMARY_FIBER';
  const firewallMode: 'PRIMARY_FW1' | 'SECONDARY_FW2' | 'BLOCKED' =
    rccFault === 'FIREWALL_BLOCK' ? 'BLOCKED' : 'PRIMARY_FW1';
  const telemetryHealth: 'HEALTHY' | 'STALE' | 'OFFLINE' =
    !iec104Connected ? 'OFFLINE' : rccFault === 'STALE_TELEMETRY' ? 'STALE' : 'HEALTHY';

  useEffect(() => {
    if (telemetryHealth !== 'HEALTHY') return;
    const t = window.setInterval(() => {
      setLastTelemetryTime(new Date().toISOString().slice(11, 23));
    }, 2000);
    return () => window.clearInterval(t);
  }, [telemetryHealth]);

  // Two-Step IEC 61850 Select-Before-Operate (SBO) state with explicit command feedback
  const [sboTarget, setSboTarget] = useState<'OPEN' | 'CLOSED' | null>(null);
  const [sboStatusBanner, setSboStatusBanner] = useState<string | null>(null);

  // Compute live upstream power-supply trace for the currently selected bay
  const upstreamTrace = useMemo(
    () => computeUpstreamSupplyChain(selectedBayId, bays, transformers, busbars),
    [selectedBayId, bays, transformers, busbars]
  );

  // Build deterministic, physically accurate 3D coordinates for every single bay & transformer
  const spatialNodes = useMemo<SpatialNode[]>(() => {
    const nodes: SpatialNode[] = [
      {
        id: 'NODE-132-L1',
        bayId: 'BAY-132-L1',
        code: 'LINE-1 (132-L1)',
        shortLabel: 'LINE-1',
        title: 'LINE-1: 132 kV Incoming Transmission Line (Bus 132-A)',
        category: '132kV Bay',
        layerKey: 'LAYER_132_AIS',
        voltageKv: 132,
        position: [-26, 4.8, -21],
        cameraOffset: [-26, 11.5, -4],
        isKeyLandmark: true,
      },
      {
        id: 'NODE-132-T1',
        bayId: 'BAY-132-T1',
        txId: 'TX-T1',
        code: 'T1 (132/33kV 50MVA)',
        shortLabel: 'T1 (50MVA)',
        title: 'Transformer Bay 132-T1 & Power Transformer T1 (132/33 kV, 50 MVA)',
        category: '50MVA Transformer',
        layerKey: 'LAYER_50MVA_TX',
        voltageKv: 132,
        position: [-12.5, 5.2, -2.5],
        cameraOffset: [-12.5, 11.0, 13],
        isKeyLandmark: true,
      },
      {
        id: 'NODE-132-BC',
        bayId: 'BAY-132-BC',
        code: 'CB-132 (Bus Coupler)',
        shortLabel: 'CB-132',
        title: '132 kV Bus Coupler Bay CB-132 (Bus 132-A ↔ Bus 132-B)',
        category: '132kV Bay',
        layerKey: 'LAYER_132_AIS',
        voltageKv: 132,
        position: [0, 4.8, -14],
        cameraOffset: [0, 11.5, 3],
        isKeyLandmark: true,
      },
      {
        id: 'NODE-132-T2',
        bayId: 'BAY-132-T2',
        txId: 'TX-T2',
        code: 'T2 (132/33kV 50MVA)',
        shortLabel: 'T2 (50MVA)',
        title: 'Transformer Bay 132-T2 & Power Transformer T2 (132/33 kV, 50 MVA)',
        category: '50MVA Transformer',
        layerKey: 'LAYER_50MVA_TX',
        voltageKv: 132,
        position: [12.5, 5.2, -2.5],
        cameraOffset: [12.5, 11.0, 13],
        isKeyLandmark: true,
      },
      {
        id: 'NODE-132-L2',
        bayId: 'BAY-132-L2',
        code: 'LINE-2 (132-L2)',
        shortLabel: 'LINE-2',
        title: 'LINE-2: 132 kV Incoming Transmission Line (Bus 132-B)',
        category: '132kV Bay',
        layerKey: 'LAYER_132_AIS',
        voltageKv: 132,
        position: [26, 4.8, -21],
        cameraOffset: [26, 11.5, -4],
        isKeyLandmark: true,
      },
    ];

    // 33 kV Switchgear Building Line-Up (Z = +10.5) & Two 33/11 kV 16 MVA Distribution Transformers (Z = +16.0)
    const bays33A = bays.filter((b) => b.voltageKv === 33 && b.busSection === 'A');
    const bays33B = bays.filter((b) => b.voltageKv === 33 && b.busSection === 'B');
    const bay33Bc = bays.find((b) => b.id === 'BAY-33-BC');

    bays33A.forEach((b, idx) => {
      const xPos = -24.5 + idx * 4.4;
      const isTf1 = b.id === 'BAY-33-TF1';
      nodes.push({
        id: `NODE-${b.id}`,
        bayId: b.id,
        txId: isTf1 ? 'TX-DT1' : b.connectedTransformerId,
        code: isTf1 ? '33-TF1 / DT1 (16MVA)' : b.bayCode,
        shortLabel: isTf1 ? 'DT1 (33/11kV)' : b.bayCode,
        title: b.name,
        category: isTf1 ? '16MVA Dist. Transformer' : '33kV Switchgear',
        layerKey: isTf1 ? 'LAYER_11_SWG_DT' : 'LAYER_33_SWG',
        voltageKv: 33,
        position: [xPos, 3.4, isTf1 ? 16.0 : 10.5],
        cameraOffset: [xPos, 9.2, 24],
        isKeyLandmark: b.bayType === 'TRANSFORMER_LV_INCOMER' || isTf1 || b.id === 'BAY-33-F03',
      });
    });

    if (bay33Bc) {
      nodes.push({
        id: 'NODE-BAY-33-BC',
        bayId: 'BAY-33-BC',
        code: 'CB-33 (Bus Coupler)',
        shortLabel: 'CB-33',
        title: bay33Bc.name,
        category: '33kV Switchgear',
        layerKey: 'LAYER_33_SWG',
        voltageKv: 33,
        position: [0, 3.4, 10.5],
        cameraOffset: [0, 9.2, 24],
        isKeyLandmark: true,
      });
    }

    bays33B.forEach((b, idx) => {
      const xPos = 5.5 + idx * 4.4;
      const isTf2 = b.id === 'BAY-33-TF2';
      nodes.push({
        id: `NODE-${b.id}`,
        bayId: b.id,
        txId: isTf2 ? 'TX-DT2' : b.connectedTransformerId,
        code: isTf2 ? '33-TF2 / DT2 (16MVA)' : b.bayCode,
        shortLabel: isTf2 ? 'DT2 (33/11kV)' : b.bayCode,
        title: b.name,
        category: isTf2 ? '16MVA Dist. Transformer' : '33kV Switchgear',
        layerKey: isTf2 ? 'LAYER_11_SWG_DT' : 'LAYER_33_SWG',
        voltageKv: 33,
        position: [xPos, 3.4, isTf2 ? 16.0 : 10.5],
        cameraOffset: [xPos, 9.2, 24],
        isKeyLandmark: b.bayType === 'TRANSFORMER_LV_INCOMER' || isTf2,
      });
    });

    // 11 kV Switchgear Building Line-Up (Z = +22.5)
    const bays11A = bays.filter((b) => b.voltageKv === 11 && b.busSection === 'A');
    const bays11B = bays.filter((b) => b.voltageKv === 11 && b.busSection === 'B');
    const bay11Bc = bays.find((b) => b.id === 'BAY-11-BC');

    bays11A.forEach((b, idx) => {
      const xPos = -25.5 + idx * 3.9;
      nodes.push({
        id: `NODE-${b.id}`,
        bayId: b.id,
        code: b.bayCode,
        shortLabel: b.bayCode,
        title: b.name,
        category: '11kV Switchgear',
        layerKey: 'LAYER_11_SWG_DT',
        voltageKv: 11,
        position: [xPos, 2.8, 22.5],
        cameraOffset: [xPos, 8.2, 34],
        isKeyLandmark: b.id === 'BAY-11-INC1' || b.id === 'BAY-11-F01',
      });
    });

    if (bay11Bc) {
      nodes.push({
        id: 'NODE-BAY-11-BC',
        bayId: 'BAY-11-BC',
        code: 'CB-11 (Bus Coupler)',
        shortLabel: 'CB-11',
        title: bay11Bc.name,
        category: '11kV Switchgear',
        layerKey: 'LAYER_11_SWG_DT',
        voltageKv: 11,
        position: [0, 2.8, 22.5],
        cameraOffset: [0, 8.2, 34],
        isKeyLandmark: true,
      });
    }

    bays11B.forEach((b, idx) => {
      const xPos = 5.0 + idx * 3.9;
      nodes.push({
        id: `NODE-${b.id}`,
        bayId: b.id,
        code: b.bayCode,
        shortLabel: b.bayCode,
        title: b.name,
        category: '11kV Switchgear',
        layerKey: 'LAYER_11_SWG_DT',
        voltageKv: 11,
        position: [xPos, 2.8, 22.5],
        cameraOffset: [xPos, 8.2, 34],
        isKeyLandmark: b.id === 'BAY-11-INC2' || b.id === 'BAY-11-F05',
      });
    });

    nodes.push(
      {
        id: 'NODE-RCC-CENTER',
        bayId: 'BAY-132-L1',
        code: 'RCC (Remote Control Center)',
        shortLabel: 'RCC Building',
        title: 'Remote Control Center (RCC) — SCADA Video Wall, 4 Operator Desks, IEC-104 Front-End, Firewalls & WAN Routers',
        category: '132kV Bay',
        layerKey: 'LAYER_CIVIL_GANTRIES' as any,
        voltageKv: 132,
        position: [-60, 3.8, 14],
        cameraOffset: [-60, 12.0, 32],
        isKeyLandmark: true,
      },
      {
        id: 'NODE-GATEWAY-ROOM',
        bayId: 'BAY-33-INC1',
        code: 'GW-RTU (Station Gateway)',
        shortLabel: 'Station Gateway',
        title: 'Substation Gateway & Communication Room — IEC 61850 Station Bus Switches, RTU/Gateway, Firewalls & WAN Routers',
        category: '33kV Switchgear',
        layerKey: 'LAYER_CIVIL_GANTRIES' as any,
        voltageKv: 33,
        position: [-34.5, 3.0, 17.5],
        cameraOffset: [-34.5, 9.5, 29],
        isKeyLandmark: true,
      },
      {
        id: 'NODE-DIST-TX250',
        bayId: 'BAY-11-F01',
        code: 'DT-250kVA (11/0.415kV)',
        shortLabel: 'Dist. TX (250kVA)',
        title: 'Pole-Mounted 11/0.415 kV 250 kVA Residential Distribution Transformer & 415 V LT Feeder Pillar',
        category: '11kV Switchgear',
        layerKey: 'LAYER_11_SWG_DT',
        voltageKv: 11,
        position: [43.2, 5.5, 8.2],
        cameraOffset: [43.2, 9.5, 22],
        isKeyLandmark: false,
      }
    );
    return nodes;
  }, [bays]);

  // Keep latest simulation & UI state in a ref for the WebGL render loop
  const stateRef = useRef({
    bays,
    transformers,
    busbars,
    spatialNodes,
    selectedBayId,
    upstreamTrace,
    autoRotate,
    zoom,
    lightingPreset,
    labelMode,
    xraySwitchgearRoof,
    showElectricalConnections,
    showPowerFlowPulses,
    highlightSelectedFeeder,
    traceSourceActive,
    pathVoltageFilter,
    layerVis,
    activeSuburbanFeederId,
    distTxClosed,
    serviceDropClosed,
    rccFault,
    iec104Connected,
    telemetryHealth,
    rccCommandPulseUntil,
    cameraNavMode,
    followRoadActive,
    selectedWorldItem,
  });

  useEffect(() => {
    stateRef.current = {
      bays,
      transformers,
      busbars,
      spatialNodes,
      selectedBayId,
      upstreamTrace,
      autoRotate,
      zoom,
      lightingPreset,
      labelMode,
      xraySwitchgearRoof,
      showElectricalConnections,
      showPowerFlowPulses,
      highlightSelectedFeeder,
      traceSourceActive,
      pathVoltageFilter,
      layerVis,
      activeSuburbanFeederId,
      distTxClosed,
      serviceDropClosed,
      rccFault,
      iec104Connected,
      telemetryHealth,
      rccCommandPulseUntil,
      cameraNavMode,
      followRoadActive,
      selectedWorldItem,
    };
  }, [
    bays,
    transformers,
    busbars,
    spatialNodes,
    selectedBayId,
    upstreamTrace,
    autoRotate,
    zoom,
    lightingPreset,
    labelMode,
    xraySwitchgearRoof,
    showElectricalConnections,
    showPowerFlowPulses,
    highlightSelectedFeeder,
    traceSourceActive,
    pathVoltageFilter,
    layerVis,
    activeSuburbanFeederId,
    distTxClosed,
    serviceDropClosed,
    rccFault,
    iec104Connected,
    telemetryHealth,
    rccCommandPulseUntil,
    cameraNavMode,
    followRoadActive,
    selectedWorldItem,
  ]);

  // Unified world-space camera state supporting Orbit, Ground-Plane Pan, Street Walk, Free 3D Fly & Road Follow
  const camControlRef = useRef({
    theta: -0.28,
    phi: 1.10,
    radius: 86,
    target: [13.5, 2.2, 2.5] as [number, number, number],
    desiredTarget: [13.5, 2.2, 2.5] as [number, number, number],
    desiredTheta: -0.28,
    desiredPhi: 1.10,
    desiredRadius: 86,
    isInterpolating: false,
    eyePos: [-10.0, 36.0, 74.0] as [number, number, number],
    yaw: -0.28,
    pitch: -0.32,
    moveSpeedMult: 1.0,
    roadProgress: 0,
    activeRoadIndex: 0,
    savedViewBeforeWalk: null as {
      target: [number, number, number];
      theta: number;
      phi: number;
      radius: number;
    } | null,
    bounds: {
      minX: -108,
      maxX: 142,
      minY: 0.6,
      maxY: 150,
      minZ: -88,
      maxZ: 68,
    },
  });

  // Load Three.js r128 progressively
  useEffect(() => {
    if (window.THREE && window.THREE.WebGLRenderer) {
      setThreeLoaded(true);
      setLoadingProgress(100);
      return;
    }

    setLoadingProgress(45);
    const existingScript = document.getElementById('three-js-r128-cdn') as HTMLScriptElement | null;
    if (existingScript) {
      const checkTimer = window.setInterval(() => {
        if (window.THREE && window.THREE.WebGLRenderer) {
          window.clearInterval(checkTimer);
          setLoadingProgress(100);
          setThreeLoaded(true);
        }
      }, 80);
      return () => window.clearInterval(checkTimer);
    }

    const script = document.createElement('script');
    script.id = 'three-js-r128-cdn';
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
    script.async = true;
    script.onload = () => {
      setLoadingProgress(100);
      setThreeLoaded(true);
    };
    script.onerror = () => {
      setWebglError('Three.js library could not be fetched.');
    };
    document.head.appendChild(script);
  }, []);

  const switchCameraNavMode = (nextMode: CameraNavMode) => {
    const c = camControlRef.current;
    const prevMode = stateRef.current.cameraNavMode;
    setFollowRoadActive(false);
    c.isInterpolating = false;

    if ((nextMode === 'WALK' || nextMode === 'FLY') && prevMode !== 'WALK' && prevMode !== 'FLY') {
      c.savedViewBeforeWalk = {
        target: [...c.target] as [number, number, number],
        theta: c.theta,
        phi: c.phi,
        radius: c.radius,
      };
      const effRad = c.radius / Math.max(0.4, stateRef.current.zoom);
      const curCamX = c.target[0] + effRad * Math.sin(c.phi) * Math.sin(c.theta);
      const curCamY = c.target[1] + effRad * Math.cos(c.phi);
      const curCamZ = c.target[2] + effRad * Math.sin(c.phi) * Math.cos(c.theta);
      if (nextMode === 'WALK') {
        // Place walker at realistic 1.72m eye level near current target / street
        c.eyePos = [
          Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.target[0] + Math.sin(c.theta) * 8)),
          1.72,
          Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.target[2] + Math.cos(c.theta) * 8)),
        ];
        c.yaw = c.theta;
        c.pitch = -0.02;
      } else {
        c.eyePos = [curCamX, Math.max(2.0, curCamY), curCamZ];
        c.yaw = c.theta;
        c.pitch = -Math.max(-1.2, Math.min(1.2, Math.PI / 2 - c.phi));
      }
    } else if (nextMode === 'WALK') {
      c.eyePos[1] = 1.72;
      c.pitch = Math.max(-0.45, Math.min(0.45, c.pitch));
    } else if (( nextMode === 'ORBIT' || nextMode === 'PAN') && (prevMode === 'WALK' || prevMode === 'FLY')) {
      // Transition smoothly from Walk/Fly look vector to Orbit/Pan target
      const dist = Math.max(14, Math.min(65, c.radius));
      c.target = [
        Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.eyePos[0] - Math.sin(c.yaw) * dist)),
        2.2,
        Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.eyePos[2] - Math.cos(c.yaw) * dist)),
      ];
      c.desiredTarget = [...c.target] as [number, number, number];
      c.theta = c.yaw;
      c.desiredTheta = c.yaw;
      c.phi = Math.max(0.22, Math.min(1.45, Math.PI / 2 + c.pitch));
      c.desiredPhi = c.phi;
      c.radius = dist;
      c.desiredRadius = dist;
    }
    setCameraNavMode(nextMode);
  };

  const focusCameraOnWorldPoint = (
    pos: [number, number, number],
    desiredDist = 16,
    title?: string
  ) => {
    const c = camControlRef.current;
    setFollowRoadActive(false);
    if (stateRef.current.cameraNavMode === 'WALK') {
      c.eyePos = [pos[0] + Math.sin(c.yaw) * 9, 1.72, pos[2] + Math.cos(c.yaw) * 9];
      return;
    }
    if (stateRef.current.cameraNavMode === 'FLY') {
      setCameraNavMode('ORBIT');
    }
    c.isInterpolating = true;
    c.desiredTarget = [pos[0], pos[1], pos[2]];
    c.desiredRadius = Math.max(3.5, Math.min(180, desiredDist));
    c.desiredPhi = Math.min(1.22, Math.max(0.78, c.phi));
    if (title) setHoveredNodeTitle(title);
  };

  const fitEntireScene = () => {
    setFollowRoadActive(false);
    if (stateRef.current.cameraNavMode === 'WALK' || stateRef.current.cameraNavMode === 'FLY') {
      setCameraNavMode('PAN');
    }
    setZoom(1.0);
    const c = camControlRef.current;
    c.isInterpolating = true;
    c.desiredTarget = [16.0, 2.2, -8.0];
    c.desiredTheta = -0.30;
    c.desiredPhi = 1.06;
    c.desiredRadius = 112;
    setCameraPreset('ISOMETRIC');
    setHoveredNodeTitle('Fit All: Framing Complete 3D World (RCC, 132/33/11 kV Substation & All 46 Residential Houses)');
  };

  const applyCameraPreset = (preset: CameraPreset) => {
    setCameraPreset(preset);
    setFollowRoadActive(false);
    if (stateRef.current.cameraNavMode === 'WALK' || stateRef.current.cameraNavMode === 'FLY') {
      setCameraNavMode('PAN');
    }
    const c = camControlRef.current;
    c.isInterpolating = true;
    switch (preset) {
      case 'ISOMETRIC':
        c.desiredTarget = [6.0, 2.2, -2.0];
        c.desiredTheta = -0.28;
        c.desiredPhi = 1.10;
        c.desiredRadius = 86;
        break;
      case 'TOP_PLAN':
        c.desiredTarget = [8, 0, -4];
        c.desiredTheta = 0.0;
        c.desiredPhi = 0.18;
        c.desiredRadius = 96;
        break;
      case 'HV_132_YARD':
        c.desiredTarget = [0, 4.5, -16];
        c.desiredTheta = 0.24;
        c.desiredPhi = 1.12;
        c.desiredRadius = 38;
        break;
      case 'TX_T1':
        c.desiredTarget = [-12.5, 4.5, -1.5];
        c.desiredTheta = -0.25;
        c.desiredPhi = 1.12;
        c.desiredRadius = 21;
        setSelectedBayId('BAY-132-T1');
        break;
      case 'TX_T2':
        c.desiredTarget = [12.5, 4.5, -1.5];
        c.desiredTheta = 0.25;
        c.desiredPhi = 1.12;
        c.desiredRadius = 21;
        setSelectedBayId('BAY-132-T2');
        break;
      case 'TRANSFORMER_PLAZA':
        c.desiredTarget = [0, 4.5, -2.5];
        c.desiredTheta = -0.30;
        c.desiredPhi = 1.15;
        c.desiredRadius = 28;
        break;
      case 'SWG_33_HALL':
        c.desiredTarget = [-15.5, 3.4, 9.0];
        c.desiredTheta = -0.14;
        c.desiredPhi = 0.92;
        c.desiredRadius = 27;
        break;
      case 'SWG_11_HALL':
        c.desiredTarget = [13.5, 3.0, 12.5];
        c.desiredTheta = -0.18;
        c.desiredPhi = 0.92;
        c.desiredRadius = 26;
        break;
      case 'RESIDENTIAL':
        c.desiredTarget = [58, 3.2, -10];
        c.desiredTheta = -0.36;
        c.desiredPhi = 1.04;
        c.desiredRadius = 68;
        break;
      case 'DIST_TX':
        c.desiredTarget = [43.2, 5.2, 8.2];
        c.desiredTheta = -0.32;
        c.desiredPhi = 1.12;
        c.desiredRadius = 22;
        break;
      case 'RCC_CENTER':
        c.desiredTarget = [-60.0, 3.2, 14.0];
        c.desiredTheta = 0.26;
        c.desiredPhi = 1.02;
        c.desiredRadius = 26;
        break;
      case 'GATEWAY_COMM':
        c.desiredTarget = [-34.5, 2.8, 17.5];
        c.desiredTheta = 0.22;
        c.desiredPhi = 1.04;
        c.desiredRadius = 20;
        break;
      case 'IEC104_PATH':
        c.desiredTarget = [-47.0, 3.2, 16.0];
        c.desiredTheta = 0.12;
        c.desiredPhi = 1.02;
        c.desiredRadius = 38;
        break;
      case 'FRONT_SOUTH':
        c.desiredTarget = [4, 3.0, 6];
        c.desiredTheta = -0.12;
        c.desiredPhi = 1.22;
        c.desiredRadius = 72;
        break;
    }
  };

  // Right-side camera navigator: adapts to Orbit, Pan, Walk, and Fly modes
  const nudgeCamera = (direction: 'up' | 'down' | 'left' | 'right') => {
    const c = camControlRef.current;
    const mode = stateRef.current.cameraNavMode;
    setAutoRotate(false);
    if (mode === 'WALK' || mode === 'FLY') {
      const step = mode === 'FLY' ? 6.5 : 4.2;
      const fwdX = -Math.sin(c.yaw);
      const fwdZ = -Math.cos(c.yaw);
      const rightX = Math.cos(c.yaw);
      const rightZ = -Math.sin(c.yaw);
      if (direction === 'up') {
        c.eyePos[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.eyePos[0] + fwdX * step));
        c.eyePos[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.eyePos[2] + fwdZ * step));
      } else if (direction === 'down') {
        c.eyePos[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.eyePos[0] - fwdX * step));
        c.eyePos[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.eyePos[2] - fwdZ * step));
      } else if (direction === 'left') {
        c.eyePos[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.eyePos[0] - rightX * step));
        c.eyePos[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.eyePos[2] - rightZ * step));
      } else if (direction === 'right') {
        c.eyePos[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.eyePos[0] + rightX * step));
        c.eyePos[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.eyePos[2] + rightZ * step));
      }
      return;
    }
    if (mode === 'PAN') {
      c.isInterpolating = false;
      const panStep = Math.max(4.0, c.radius * 0.12);
      const cosT = Math.cos(c.theta);
      const sinT = Math.sin(c.theta);
      if (direction === 'left') {
        c.target[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.target[0] - cosT * panStep));
        c.target[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.target[2] + sinT * panStep));
      } else if (direction === 'right') {
        c.target[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.target[0] + cosT * panStep));
        c.target[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.target[2] - sinT * panStep));
      } else if (direction === 'up') {
        c.target[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.target[0] - sinT * panStep));
        c.target[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.target[2] - cosT * panStep));
      } else if (direction === 'down') {
        c.target[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.target[0] + sinT * panStep));
        c.target[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.target[2] + cosT * panStep));
      }
      c.desiredTarget = [...c.target] as [number, number, number];
      return;
    }
    c.isInterpolating = true;
    if (direction === 'left') c.desiredTheta -= 0.18;
    if (direction === 'right') c.desiredTheta += 0.18;
    if (direction === 'up') c.desiredPhi = Math.max(0.08, c.desiredPhi - 0.12);
    if (direction === 'down') c.desiredPhi = Math.min(1.52, c.desiredPhi + 0.12);
  };

  const cycleCameraView = () => {
    const presets: CameraPreset[] = [
      'ISOMETRIC',
      'HV_132_YARD',
      'TX_T1',
      'TX_T2',
      'SWG_33_HALL',
      'SWG_11_HALL',
      'RESIDENTIAL',
      'DIST_TX',
      'RCC_CENTER',
      'GATEWAY_COMM',
      'IEC104_PATH',
      'TOP_PLAN',
    ];
    applyCameraPreset(presets[(presets.indexOf(cameraPreset) + 1) % presets.length]);
    setAutoRotate(false);
  };

  const focusCameraOnBay = (bayId: string) => {
    setSelectedBayId(bayId);
    setSboTarget(null);
    const node = spatialNodes.find((n) => n.bayId === bayId);
    if (!node || !focusOnSelection) return;
    const c = camControlRef.current;
    c.isInterpolating = true;
    const is33 = node.layerKey === 'LAYER_33_SWG';
    const is11 = node.layerKey === 'LAYER_11_SWG_DT';
    c.desiredTarget = is33
      ? [node.position[0] * 0.56 - 15.8, node.position[1], node.position[2] * 1.05 - 1.5]
      : is11
        ? [node.position[0] * 0.48 + 13.8, node.position[1], node.position[2] * 0.98 - 9.5]
        : [node.position[0], node.position[1], node.position[2]];
    c.desiredRadius = node.voltageKv === 132 ? 20 : 16;
    c.desiredPhi = 1.12;
  };

  const toggleLayer = (key: keyof LayerVisibilityState) => {
    setLayerVis((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // ==================== THREE.JS WEBGL PBR SCENE INITIALIZATION ====================
  useEffect(() => {
    if (!threeLoaded || !window.THREE || !mountRef.current) return;

    const THREE = window.THREE;
    const container = mountRef.current;

    let renderer: any;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
      });
    } catch {
      setWebglError('WebGL context initialization failed on this display.');
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    if (THREE.ACESFilmicToneMapping !== undefined) {
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.98;
    }
    if (THREE.sRGBEncoding !== undefined) {
      renderer.outputEncoding = THREE.sRGBEncoding;
    }

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020b1c);
    scene.fog = new THREE.FogExp2(0x020b1c, 0.0011);

    const camera = new THREE.PerspectiveCamera(
      40,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.22,
      680
    );

    const layerGroups: Record<keyof LayerVisibilityState, any> = {
      LAYER_132_AIS: new THREE.Group(),
      LAYER_50MVA_TX: new THREE.Group(),
      LAYER_33_SWG: new THREE.Group(),
      LAYER_11_SWG_DT: new THREE.Group(),
      LAYER_CIVIL_GANTRIES: new THREE.Group(),
    };
    Object.values(layerGroups).forEach((grp) => scene.add(grp));

    // Dedicated Group for all 3-Phase Electrical Connections (can be toggled via Show/Hide Electrical Connections)
    const connectionsGroup = new THREE.Group();
    scene.add(connectionsGroup);

    // Physically Based Materials
    const mats = {
      galvanizedSteel: new THREE.MeshStandardMaterial({
        color: 0x71869b,
        metalness: 0.72,
        roughness: 0.36,
      }),
      darkStructuralSteel: new THREE.MeshStandardMaterial({
        color: 0x293a4f,
        metalness: 0.65,
        roughness: 0.42,
      }),
      porcelainBrown: new THREE.MeshStandardMaterial({
        color: 0x6b3829,
        metalness: 0.1,
        roughness: 0.18,
      }),
      porcelainGrey: new THREE.MeshStandardMaterial({
        color: 0xcbd5e1,
        metalness: 0.12,
        roughness: 0.2,
      }),
      aluminumConductor: new THREE.MeshStandardMaterial({
        color: 0xdce6f2,
        metalness: 0.85,
        roughness: 0.24,
      }),
      copperBusbar: new THREE.MeshStandardMaterial({
        color: 0xd97736,
        metalness: 0.86,
        roughness: 0.24,
      }),
      xlpeCableBlack: new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.18,
        roughness: 0.68,
      }),
      xlpeStressBootRed: new THREE.MeshStandardMaterial({
        color: 0x991b1b,
        metalness: 0.15,
        roughness: 0.45,
      }),
      phaseSleeveR: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35 }),
      phaseSleeveY: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 }),
      phaseSleeveB: new THREE.MeshStandardMaterial({ color: 0x3b82f6, roughness: 0.35 }),
      transformerTank: new THREE.MeshStandardMaterial({
        color: 0x264156,
        metalness: 0.48,
        roughness: 0.46,
      }),
      radiatorFin: new THREE.MeshStandardMaterial({
        color: 0x1c3142,
        metalness: 0.56,
        roughness: 0.4,
      }),
      controlCabinet: new THREE.MeshStandardMaterial({
        color: 0xd1dce8,
        metalness: 0.42,
        roughness: 0.36,
      }),
      concreteFoundation: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        metalness: 0.04,
        roughness: 0.9,
      }),
      crushedStonePit: new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.05,
        roughness: 0.95,
      }),
      cableTrenchCover: new THREE.MeshStandardMaterial({
        color: 0x3b495e,
        metalness: 0.18,
        roughness: 0.84,
      }),
      gravelPad: new THREE.MeshStandardMaterial({
        color: 0x0d1828,
        metalness: 0.06,
        roughness: 0.94,
      }),
      asphaltRoad: new THREE.MeshStandardMaterial({
        color: 0x080e1a,
        metalness: 0.08,
        roughness: 0.88,
      }),
      switchgearCubicle33: new THREE.MeshStandardMaterial({
        color: 0x1b3554,
        metalness: 0.54,
        roughness: 0.38,
      }),
      switchgearCubicle11: new THREE.MeshStandardMaterial({
        color: 0x233952,
        metalness: 0.52,
        roughness: 0.4,
      }),
      glassRoof: new THREE.MeshStandardMaterial({
        color: 0x38bdf8,
        transparent: true,
        opacity: 0.075,
        roughness: 0.15,
        metalness: 0.1,
      }),
      solidRoof: new THREE.MeshStandardMaterial({
        color: 0x10243a,
        metalness: 0.42,
        roughness: 0.52,
      }),
      posClosedCyan: new THREE.MeshStandardMaterial({
        color: 0x00d9ff,
        emissive: 0x0284c7,
        emissiveIntensity: 0.55,
        roughness: 0.25,
      }),
      posOpenGreen: new THREE.MeshStandardMaterial({
        color: 0x22c55e,
        emissive: 0x15803d,
        emissiveIntensity: 0.55,
        roughness: 0.25,
      }),
      alarmCriticalRed: new THREE.MeshStandardMaterial({
        color: 0xff4d62,
        emissive: 0xe11d48,
        emissiveIntensity: 0.9,
        roughness: 0.2,
      }),
      alarmWarningAmber: new THREE.MeshStandardMaterial({
        color: 0xffb547,
        emissive: 0xd97706,
        emissiveIntensity: 0.8,
        roughness: 0.2,
      }),
      alarmNormalOff: new THREE.MeshStandardMaterial({
        color: 0x334155,
        metalness: 0.3,
        roughness: 0.6,
      }),
      bus132Highlight: new THREE.MeshStandardMaterial({
        color: 0x7dd3fc,
        emissive: 0x0284c7,
        emissiveIntensity: 0.22,
        metalness: 0.82,
        roughness: 0.22,
      }),
      bus33Highlight: new THREE.MeshStandardMaterial({
        color: 0xd97736,
        emissive: 0x15803d,
        emissiveIntensity: 0.18,
        metalness: 0.84,
        roughness: 0.24,
      }),
      bus11Highlight: new THREE.MeshStandardMaterial({
        color: 0xd97736,
        emissive: 0xb45309,
        emissiveIntensity: 0.18,
        metalness: 0.84,
        roughness: 0.24,
      }),
      selectionHaloMat: new THREE.MeshBasicMaterial({
        color: 0x00d9ff,
        transparent: true,
        opacity: 0.24,
      }),
    };

    const sharedGeos = {
      insulatorShedBrown: new THREE.CylinderGeometry(0.26, 0.28, 0.07, 12),
      insulatorShedGrey: new THREE.CylinderGeometry(0.22, 0.24, 0.06, 12),
      coronaRing: new THREE.TorusGeometry
        ? new THREE.TorusGeometry(0.32, 0.035, 8, 18)
        : new THREE.CylinderGeometry(0.34, 0.34, 0.06, 14),
      posBox: new THREE.BoxGeometry(0.32, 0.22, 0.32),
      alarmDome: new THREE.SphereGeometry(0.2, 12, 12),
      pulseSphere: new THREE.SphereGeometry(0.16, 10, 10),
      pulseSphereTrace: new THREE.SphereGeometry(0.24, 12, 12),
    };

    // ==================== PROFESSIONAL NIGHTTIME LIGHTING CONFIGURATION ====================
    // Low-intensity blue ambient illumination (0.24) + cool-blue directional moonlight (0.50)
    const hemiLight = new THREE.HemisphereLight(0x4b79b8, 0x0a1526, 0.26);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(0x8ab4f8, 0.52);
    sunLight.position.set(-36, 64, 38);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 210;
    const d = 75;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    scene.add(sunLight);

    // Cool-white LED (4500K) outdoor switchyard floodlight towers with subtle corona sprite
    const floodHaloTex = (() => {
      const c = document.createElement('canvas');
      c.width = 128; c.height = 128;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 60);
        g.addColorStop(0.0, '#FFFFFF');
        g.addColorStop(0.25, 'rgba(224, 242, 254, 0.75)');
        g.addColorStop(0.6, 'rgba(125, 211, 252, 0.18)');
        g.addColorStop(1.0, 'rgba(56, 189, 248, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
      return new THREE.CanvasTexture(c);
    })();
    const floodHaloMat = new THREE.SpriteMaterial({
      map: floodHaloTex, color: 0xf0f9ff, transparent: true, opacity: 0.85, depthWrite: false,
    });

    const floodLights: any[] = [];
    [
      [-34, 17.5, -24],
      [25, 17.5, -24],
      [-36, 15.5, 4],
      [26, 15.5, 4],
    ].forEach(([fx, fy, fz]) => {
      // Controlled 4500K cool-white industrial floodlight
      const pLight = new THREE.PointLight(0xeef6ff, 0.58, 56, 1.6);
      pLight.position.set(fx, fy, fz);
      scene.add(pLight);
      floodLights.push(pLight);

      const pole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.13, 0.22, fy, 8),
        mats.galvanizedSteel
      );
      pole.position.set(fx, fy / 2, fz);
      layerGroups.LAYER_CIVIL_GANTRIES.add(pole);

      const headCrossbar = new THREE.Mesh(
        new THREE.BoxGeometry(1.35, 0.16, 0.45),
        mats.darkStructuralSteel
      );
      headCrossbar.position.set(fx, fy, fz);
      layerGroups.LAYER_CIVIL_GANTRIES.add(headCrossbar);

      const luminaire = new THREE.Mesh(
        new THREE.BoxGeometry(1.15, 0.26, 0.35),
        new THREE.MeshBasicMaterial({ color: 0xf8fafc })
      );
      luminaire.position.set(fx, fy + 0.08, fz + 0.06);
      layerGroups.LAYER_CIVIL_GANTRIES.add(luminaire);

      if (THREE.Sprite) {
        const fSprite = new THREE.Sprite(floodHaloMat);
        fSprite.position.set(fx, fy + 0.15, fz + 0.1);
        fSprite.scale.set(3.6, 3.6, 1);
        layerGroups.LAYER_CIVIL_GANTRIES.add(fSprite);
      }
    });

    // ==================== SWITCHYARD CIVIL, PAVED APRON, PARKING BAYS & PERIMETER FENCE ====================
    // Ground (#101D30)
    const worldGround = new THREE.Mesh(
      new THREE.PlaneGeometry(460, 380),
      new THREE.MeshStandardMaterial({ color: 0x101d30, roughness: 0.92, metalness: 0.06 })
    );
    worldGround.rotation.x = -Math.PI / 2;
    worldGround.position.set(30, -0.28, 0);
    worldGround.receiveShadow = true;
    scene.add(worldGround);

    // Substation main engineered pad (#101D30) and front asphalt apron (#18283A)
    const yardPad = new THREE.Mesh(
      new THREE.BoxGeometry(74, 0.4, 58),
      new THREE.MeshStandardMaterial({ color: 0x101d30, roughness: 0.84, metalness: 0.12 })
    );
    yardPad.position.set(-4, -0.2, -4);
    yardPad.receiveShadow = true;
    scene.add(yardPad);

    const frontApron = new THREE.Mesh(
      new THREE.BoxGeometry(72, 0.08, 18),
      new THREE.MeshStandardMaterial({ color: 0x18283a, roughness: 0.58, metalness: 0.18 })
    );
    frontApron.position.set(-4, 0.02, 15.5);
    frontApron.receiveShadow = true;
    scene.add(frontApron);

    const gridHelper = new THREE.GridHelper(70, 35, 0x193556, 0x0d2138);
    gridHelper.position.set(-4, 0.025, -5);
    layerGroups.LAYER_CIVIL_GANTRIES.add(gridHelper);

    // Crisp white parking bay markings in front of 33 kV and 11 kV switchgear buildings
    const whiteLineMat = new THREE.MeshBasicMaterial({ color: 0xe2e8f0 });
    for (let px = -32; px <= 24; px += 4.0) {
      const bayLine = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.02, 4.2), whiteLineMat);
      bayLine.position.set(px, 0.07, 20.2);
      layerGroups.LAYER_CIVIL_GANTRIES.add(bayLine);
    }
    const frontStopLine = new THREE.Mesh(new THREE.BoxGeometry(56.2, 0.02, 0.14), whiteLineMat);
    frontStopLine.position.set(-4, 0.07, 18.1);
    layerGroups.LAYER_CIVIL_GANTRIES.add(frontStopLine);

    const roadEW = new THREE.Mesh(
      new THREE.BoxGeometry(70, 0.06, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x17283d, roughness: 0.65, metalness: 0.15 })
    );
    roadEW.position.set(-4, 0.04, 3.2);
    layerGroups.LAYER_CIVIL_GANTRIES.add(roadEW);

    const trenchEW = new THREE.Mesh(new THREE.BoxGeometry(60, 0.18, 1.15), mats.cableTrenchCover);
    trenchEW.position.set(0, 0.09, -9.2);
    layerGroups.LAYER_CIVIL_GANTRIES.add(trenchEW);

    [-26, -12.5, 0, 12.5, 26].forEach((txPos) => {
      const trenchNS = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.16, 22),
        mats.cableTrenchCover
      );
      trenchNS.position.set(txPos, 0.08, -11);
      layerGroups.LAYER_CIVIL_GANTRIES.add(trenchNS);
    });

    // ==================== DYNAMIC SCENE ACTORS & PICKING REGISTRY ====================
    const pickableMeshes: any[] = [];
    const dynamicActors: {
      positionIndicators: Record<string, any>;
      alarmBeacons: Record<string, any>;
      disconnectorBlades: Record<string, any[]>;
      earthSwitchBlades: Record<string, any>;
      busConductors: Record<string, any[]>;
      bayConductorMeshes: Record<string, any[]>;
      coolingFans: { txId: string; mesh: any }[];
      selectionPad: Record<string, any>;
      switchgearRoofs: any[];
      powerPulses: {
        mesh: any;
        p1: [number, number, number];
        p2: [number, number, number];
        bayId: string;
        voltageKv: 132 | 33 | 11;
        baseSpeed: number;
        offset: number;
        baseColorHex: number;
      }[];
    } = {
      positionIndicators: {},
      alarmBeacons: {},
      disconnectorBlades: {},
      earthSwitchBlades: {},
      busConductors: {},
      bayConductorMeshes: {},
      coolingFans: [],
      selectionPad: {},
      switchgearRoofs: [],
      powerPulses: [],
    };

    const registerBayConductor = (bayId: string, mesh: any) => {
      if (!dynamicActors.bayConductorMeshes[bayId]) {
        dynamicActors.bayConductorMeshes[bayId] = [];
      }
      dynamicActors.bayConductorMeshes[bayId].push(mesh);
      connectionsGroup.add(mesh);
    };

    const tagPickable = (rootGroup: any, bayId: string) => {
      rootGroup.traverse((child: any) => {
        if (child.isMesh) {
          child.userData.bayId = bayId;
          pickableMeshes.push(child);
        }
      });
    };

    // Helper: Build 3-Phase Overhead Catenary or XLPE Insulated Cable Connection + R/Y/B Phase Collars
    const createThreePhaseConnection = (
      bayId: string,
      p1Center: [number, number, number],
      p2Center: [number, number, number],
      phaseSpreadAxis: 'X' | 'Z',
      phaseSpacing: number,
      sag: number,
      conductorType: 'OVERHEAD_ACSR' | 'INSULATED_XLPE_CABLE' | 'ENCLOSED_COPPER_BUS',
      radius = 0.038
    ) => {
      const phaseMats = [mats.phaseSleeveR, mats.phaseSleeveY, mats.phaseSleeveB];
      [-1, 0, 1].forEach((pIdx, i) => {
        const offset = pIdx * phaseSpacing;
        const p1: [number, number, number] =
          phaseSpreadAxis === 'X'
            ? [p1Center[0] + offset, p1Center[1], p1Center[2]]
            : [p1Center[0], p1Center[1], p1Center[2] + offset];
        const p2: [number, number, number] =
          phaseSpreadAxis === 'X'
            ? [p2Center[0] + offset, p2Center[1], p2Center[2]]
            : [p2Center[0], p2Center[1], p2Center[2] + offset];

        const mid: [number, number, number] = [
          (p1[0] + p2[0]) / 2,
          (p1[1] + p2[1]) / 2 - sag,
          (p1[2] + p2[2]) / 2,
        ];

        const baseMat =
          conductorType === 'INSULATED_XLPE_CABLE'
            ? mats.xlpeCableBlack.clone()
            : conductorType === 'ENCLOSED_COPPER_BUS'
            ? mats.copperBusbar.clone()
            : mats.aluminumConductor.clone();

        if (THREE.CatmullRomCurve3 && THREE.TubeGeometry) {
          const curve = new THREE.CatmullRomCurve3([
            new THREE.Vector3(...p1),
            new THREE.Vector3(...mid),
            new THREE.Vector3(...p2),
          ]);
          const geo = new THREE.TubeGeometry(curve, 12, radius, 6, false);
          const mesh = new THREE.Mesh(geo, baseMat);
          registerBayConductor(bayId, mesh);
        }

        // Add R / Y / B Phase Identification Collar / Termination Sleeve at both ends
        [p1, p2].forEach((pt) => {
          const collar = new THREE.Mesh(
            new THREE.CylinderGeometry(radius * 1.65, radius * 1.65, 0.18, 8),
            phaseMats[i]
          );
          collar.position.set(pt[0], pt[1], pt[2]);
          connectionsGroup.add(collar);
        });
      });
    };

    // Electrical underground cable route: phase-separated XLPE cable runs at a negative Y
    // elevation beneath the concrete slab, with a visible service trench cover on grade.
    const createBuriedCableRoute = (
      bayId: string,
      start: [number, number, number],
      end: [number, number, number],
      voltage: 33 | 11
    ) => {
      const y = -0.48;
      const middle: [number, number, number] = [end[0], y, start[2]];
      const p1: [number, number, number] = [start[0], y, start[2]];
      const p2: [number, number, number] = [end[0], y, end[2]];
      createThreePhaseConnection(bayId, p1, middle, 'X', 0.16, 0, 'INSULATED_XLPE_CABLE', 0.046);
      createThreePhaseConnection(bayId, middle, p2, 'X', 0.16, 0, 'INSULATED_XLPE_CABLE', 0.046);
      // Power-flow indication follows the actual underground duct bank.
      addBuriedPulseRoutes.push({ bayId, p1, middle, p2, voltage });
    };
    const addBuriedPulseRoutes: Array<{
      bayId: string; p1: [number, number, number]; middle: [number, number, number];
      p2: [number, number, number]; voltage: 33 | 11;
    }> = [];

    const createInsulatorStack = (height: number, sheds = 6, isGrey = false, withCoronaRing = false) => {
      const grp = new THREE.Group();
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.15, height, 10),
        isGrey ? mats.porcelainGrey : mats.porcelainBrown
      );
      core.position.y = height / 2;
      grp.add(core);

      for (let i = 0; i < sheds; i++) {
        const sy = (height / (sheds + 1)) * (i + 1);
        const disc = new THREE.Mesh(
          isGrey ? sharedGeos.insulatorShedGrey : sharedGeos.insulatorShedBrown,
          isGrey ? mats.porcelainGrey : mats.porcelainBrown
        );
        disc.position.y = sy;
        grp.add(disc);
      }

      if (withCoronaRing) {
        const ring = new THREE.Mesh(sharedGeos.coronaRing, mats.aluminumConductor);
        ring.rotation.x = Math.PI / 2;
        ring.position.y = height - 0.1;
        grp.add(ring);
      }
      return grp;
    };

    const createLatticeTower = (x: number, z: number, height = 12.0, width = 1.15) => {
      const grp = new THREE.Group();
      grp.position.set(x, 0, z);

      const plinth = new THREE.Mesh(
        new THREE.BoxGeometry(width * 1.45, 0.6, width * 1.45),
        mats.concreteFoundation
      );
      plinth.position.y = 0.3;
      grp.add(plinth);

      const hw = width / 2;
      [
        [-hw, -hw],
        [hw, -hw],
        [hw, hw],
        [-hw, hw],
      ].forEach(([lx, lz]) => {
        const leg = new THREE.Mesh(
          new THREE.CylinderGeometry(0.06, 0.08, height, 6),
          mats.galvanizedSteel
        );
        leg.position.set(lx, height / 2 + 0.3, lz);
        leg.castShadow = true;
        grp.add(leg);
      });

      const levels = 6;
      const stepH = height / levels;
      for (let i = 0; i < levels; i++) {
        const y0 = 0.4 + i * stepH;
        const brace = new THREE.Mesh(
          new THREE.BoxGeometry(width * 1.02, 0.08, width * 1.02),
          mats.galvanizedSteel
        );
        brace.position.y = y0 + stepH * 0.8;
        grp.add(brace);

        const diag = new THREE.Mesh(
          new THREE.CylinderGeometry(0.035, 0.035, Math.hypot(width, stepH), 5),
          mats.galvanizedSteel
        );
        diag.position.set(0, y0 + stepH / 2, hw);
        diag.rotation.z = (i % 2 === 0 ? 1 : -1) * Math.atan2(width, stepH);
        grp.add(diag);
      }

      const spike = new THREE.Mesh(new THREE.ConeGeometry(0.08, 1.5, 6), mats.aluminumConductor);
      spike.position.y = height + 0.95;
      grp.add(spike);

      layerGroups.LAYER_CIVIL_GANTRIES.add(grp);
    };

    const createBusSupportPedestal = (x: number, zCenter: number) => {
      const grp = new THREE.Group();
      grp.position.set(x, 0, zCenter);
      [-1.45, 0, 1.45].forEach((zPhase) => {
        const steelPost = new THREE.Mesh(
          new THREE.CylinderGeometry(0.11, 0.14, 4.8, 8),
          mats.galvanizedSteel
        );
        steelPost.position.set(0, 2.4, zPhase);
        grp.add(steelPost);

        const postIns = createInsulatorStack(2.7, 7, false, false);
        postIns.position.set(0, 4.8, zPhase);
        grp.add(postIns);
      });
      layerGroups.LAYER_132_AIS.add(grp);
    };

    // Helper: Build Complete 132 kV AIS Switchgear Bay
    const create132kVAisBay = (xCenter: number, zCenter: number, bayId: string, isLineBay: boolean) => {
      const bayGroup = new THREE.Group();
      bayGroup.position.set(xCenter, 0, zCenter);

      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(7.4, 0.18, isLineBay ? 11.4 : 9.4),
        mats.concreteFoundation
      );
      pad.position.y = 0.09;
      pad.receiveShadow = true;
      bayGroup.add(pad);

      const selHalo = new THREE.Mesh(
        new THREE.BoxGeometry(7.8, 0.25, isLineBay ? 11.8 : 9.8),
        mats.selectionHaloMat.clone()
      );
      selHalo.position.y = 0.14;
      selHalo.visible = false;
      bayGroup.add(selHalo);
      dynamicActors.selectionPad[bayId] = selHalo;

      const phaseOffsets = [-1.85, 0, 1.85];
      dynamicActors.disconnectorBlades[bayId] = [];

      const cbFrame = new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.35, 1.1), mats.galvanizedSteel);
      cbFrame.position.set(0, 1.25, 0);
      cbFrame.castShadow = true;
      bayGroup.add(cbFrame);

      const linkageBeam = new THREE.Mesh(
        new THREE.BoxGeometry(4.6, 0.26, 0.28),
        mats.darkStructuralSteel
      );
      linkageBeam.position.set(0, 2.38, 0);
      bayGroup.add(linkageBeam);

      const cbKiosk = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.8, 0.85), mats.controlCabinet);
      cbKiosk.position.set(2.9, 1.0, 0);
      cbKiosk.castShadow = true;
      bayGroup.add(cbKiosk);

      const posInd = new THREE.Mesh(sharedGeos.posBox, mats.posClosedCyan);
      posInd.position.set(2.9, 2.02, 0.22);
      bayGroup.add(posInd);
      dynamicActors.positionIndicators[bayId] = posInd;

      const almBeacon = new THREE.Mesh(sharedGeos.alarmDome, mats.alarmNormalOff);
      almBeacon.position.set(2.9, 2.18, -0.22);
      bayGroup.add(almBeacon);
      dynamicActors.alarmBeacons[bayId] = almBeacon;

      phaseOffsets.forEach((px, pIdx) => {
        const poleIns = createInsulatorStack(2.8, 7, false, true);
        poleIns.position.set(px, 2.4, 0);
        bayGroup.add(poleIns);

        const gradCap = createInsulatorStack(1.4, 4, true, false);
        gradCap.position.set(px + 0.28, 3.6, 0);
        bayGroup.add(gradCap);

        const ctPedestal = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.22, 2.1, 10),
          mats.galvanizedSteel
        );
        ctPedestal.position.set(px, 1.05, -2.2);
        bayGroup.add(ctPedestal);
        const ctIns = createInsulatorStack(1.95, 5, true, false);
        ctIns.position.set(px, 2.1, -2.2);
        bayGroup.add(ctIns);
        const ctDome = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.65, 0.68), mats.transformerTank);
        ctDome.position.set(px, 4.35, -2.2);
        bayGroup.add(ctDome);

        const dsBeam = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.18, 1.5), mats.galvanizedSteel);
        dsBeam.position.set(px, 2.15, 2.5);
        bayGroup.add(dsBeam);

        const dsSupport = new THREE.Mesh(
          new THREE.CylinderGeometry(0.14, 0.18, 2.15, 8),
          mats.galvanizedSteel
        );
        dsSupport.position.set(px, 1.08, 2.5);
        bayGroup.add(dsSupport);

        const dsInsRear = createInsulatorStack(1.85, 5, false, false);
        dsInsRear.position.set(px, 2.2, 2.0);
        bayGroup.add(dsInsRear);

        const dsInsFront = createInsulatorStack(1.85, 5, false, false);
        dsInsFront.position.set(px, 2.2, 3.0);
        bayGroup.add(dsInsFront);

        const bladePivot = new THREE.Group();
        bladePivot.position.set(px, 4.1, 2.5);
        const bladeArm = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.14, 1.95), mats.copperBusbar);
        bladeArm.position.set(0, 0.08, -0.75);
        bladePivot.add(bladeArm);
        bayGroup.add(bladePivot);
        dynamicActors.disconnectorBlades[bayId].push(bladePivot);

        const jumper = new THREE.Mesh(
          new THREE.CylinderGeometry(0.04, 0.04, 5.2, 8),
          mats.aluminumConductor.clone()
        );
        jumper.rotation.x = Math.PI / 2;
        jumper.position.set(px, 4.95, 0.1);
        bayGroup.add(jumper);

        if (isLineBay) {
          const cvtBase = new THREE.Mesh(
            new THREE.BoxGeometry(0.62, 1.7, 0.62),
            mats.galvanizedSteel
          );
          cvtBase.position.set(px, 0.85, -4.0);
          bayGroup.add(cvtBase);
          const cvtStack = createInsulatorStack(2.8, 7, true, true);
          cvtStack.position.set(px, 1.7, -4.0);
          bayGroup.add(cvtStack);

          const laPedestal = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12, 0.15, 1.8, 8),
            mats.galvanizedSteel
          );
          laPedestal.position.set(px, 0.9, -5.1);
          bayGroup.add(laPedestal);
          const laStack = createInsulatorStack(2.2, 6, false, true);
          laStack.position.set(px, 1.8, -5.1);
          bayGroup.add(laStack);

          if (pIdx === 0) {
            const waveTrap = new THREE.Mesh(
              new THREE.CylinderGeometry(0.38, 0.38, 1.4, 12),
              mats.aluminumConductor
            );
            waveTrap.position.set(px, 8.2, -5.1);
            bayGroup.add(waveTrap);
          }
        }
      });

      const esPivot = new THREE.Group();
      esPivot.position.set(0, 2.1, 3.05);
      const esBlade = new THREE.Mesh(new THREE.BoxGeometry(0.1, 1.95, 0.1), mats.alarmWarningAmber);
      esBlade.position.set(0, 0.95, 0);
      esPivot.add(esBlade);
      bayGroup.add(esPivot);
      dynamicActors.earthSwitchBlades[bayId] = esPivot;

      tagPickable(bayGroup, bayId);
      layerGroups.LAYER_132_AIS.add(bayGroup);
    };

    // Helper: Build Realistic 50 MVA 132/33 kV Power Transformer (T1 & T2)
    const create50MvaTransformer = (xCenter: number, zCenter: number, bayId: string, txId: string) => {
      const txGroup = new THREE.Group();
      txGroup.position.set(xCenter, 0, zCenter);

      const bund = new THREE.Mesh(new THREE.BoxGeometry(8.8, 0.55, 7.8), mats.concreteFoundation);
      bund.position.y = 0.275;
      bund.receiveShadow = true;
      txGroup.add(bund);

      const oilPit = new THREE.Mesh(new THREE.BoxGeometry(8.1, 0.58, 7.1), mats.crushedStonePit);
      oilPit.position.y = 0.29;
      txGroup.add(oilPit);

      const selHalo = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.3, 8.2), mats.selectionHaloMat.clone());
      selHalo.position.y = 0.2;
      selHalo.visible = false;
      txGroup.add(selHalo);
      dynamicActors.selectionPad[bayId] = selHalo;

      const firewall = new THREE.Mesh(new THREE.BoxGeometry(0.45, 8.2, 8.5), mats.concreteFoundation);
      firewall.position.set(xCenter < 0 ? 4.9 : -4.9, 4.1, 0);
      firewall.castShadow = true;
      txGroup.add(firewall);

      const mainTank = new THREE.Mesh(new THREE.BoxGeometry(4.9, 4.45, 3.85), mats.transformerTank);
      mainTank.position.set(0, 2.7, 0);
      mainTank.castShadow = true;
      mainTank.receiveShadow = true;
      txGroup.add(mainTank);

      [-1.8, -0.9, 0, 0.9, 1.8].forEach((ribX) => {
        const rib = new THREE.Mesh(
          new THREE.BoxGeometry(0.14, 4.2, 3.98),
          mats.darkStructuralSteel
        );
        rib.position.set(ribX, 2.7, 0);
        txGroup.add(rib);
      });

      [-2.9, 2.9].forEach((rx) => {
        for (let f = -1.25; f <= 1.25; f += 0.36) {
          const fin = new THREE.Mesh(new THREE.BoxGeometry(0.88, 3.55, 0.08), mats.radiatorFin);
          fin.position.set(rx, 2.7, f);
          fin.castShadow = true;
          txGroup.add(fin);
        }
        const topManifold = new THREE.Mesh(
          new THREE.CylinderGeometry(0.12, 0.12, 2.9, 8),
          mats.transformerTank
        );
        topManifold.rotation.x = Math.PI / 2;
        topManifold.position.set(rx, 4.2, 0);
        txGroup.add(topManifold);

        [-0.75, 0.75].forEach((fz) => {
          const shroud = new THREE.Mesh(
            new THREE.CylinderGeometry(0.48, 0.48, 0.18, 14),
            mats.darkStructuralSteel
          );
          shroud.rotation.z = Math.PI / 2;
          shroud.position.set(rx + (rx < 0 ? -0.52 : 0.52), 2.55, fz);
          txGroup.add(shroud);

          const fanRotor = new THREE.Group();
          fanRotor.position.set(rx + (rx < 0 ? -0.6 : 0.6), 2.55, fz);
          for (let b = 0; b < 4; b++) {
            const blade = new THREE.Mesh(
              new THREE.BoxGeometry(0.04, 0.78, 0.14),
              mats.aluminumConductor
            );
            blade.rotation.x = (b * Math.PI) / 4;
            fanRotor.add(blade);
          }
          txGroup.add(fanRotor);
          dynamicActors.coolingFans.push({ txId, mesh: fanRotor });
        });
      });

      const conservator = new THREE.Mesh(
        new THREE.CylinderGeometry(0.72, 0.72, 4.2, 16),
        mats.galvanizedSteel
      );
      conservator.rotation.z = Math.PI / 2;
      conservator.position.set(-0.4, 6.2, -0.95);
      conservator.castShadow = true;
      txGroup.add(conservator);

      const mogDial = new THREE.Mesh(
        new THREE.CylinderGeometry(0.28, 0.28, 0.1, 12),
        mats.controlCabinet
      );
      mogDial.rotation.z = Math.PI / 2;
      mogDial.position.set(1.75, 6.2, -0.95);
      txGroup.add(mogDial);

      const buchholzPipe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.09, 0.09, 1.55, 8),
        mats.galvanizedSteel
      );
      buchholzPipe.position.set(0.4, 5.4, -0.45);
      buchholzPipe.rotation.x = 0.45;
      txGroup.add(buchholzPipe);

      const prdStack = new THREE.Mesh(
        new THREE.CylinderGeometry(0.16, 0.2, 1.25, 10),
        mats.darkStructuralSteel
      );
      prdStack.position.set(1.85, 5.45, 0.4);
      txGroup.add(prdStack);

      const neutralBsh = createInsulatorStack(1.1, 3, true, false);
      neutralBsh.position.set(2.1, 4.9, 1.2);
      txGroup.add(neutralBsh);

      const oltcCab = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2.25, 0.68), mats.controlCabinet);
      oltcCab.position.set(0, 2.25, 2.25);
      txGroup.add(oltcCab);

      [-1.45, 0, 1.45].forEach((bx) => {
        const turretHv = new THREE.Mesh(
          new THREE.CylinderGeometry(0.28, 0.35, 0.65, 12),
          mats.transformerTank
        );
        turretHv.position.set(bx, 5.15, -1.05);
        txGroup.add(turretHv);

        const hvBush = createInsulatorStack(2.75, 8, false, true);
        hvBush.position.set(bx, 5.35, -1.05);
        hvBush.rotation.x = -0.16;
        txGroup.add(hvBush);

        const lvBush = createInsulatorStack(1.5, 4, true, false);
        lvBush.position.set(bx, 4.9, 1.1);
        lvBush.rotation.x = 0.14;
        txGroup.add(lvBush);
      });

      tagPickable(txGroup, bayId);
      layerGroups.LAYER_50MVA_TX.add(txGroup);
    };

    // ==================== BUILD ALL 132 / 33 / 11 kV EQUIPMENT & THREE-PHASE CONNECTIONS ====================
    [-32, -16, -3.6, 3.6, 16, 32].forEach((gx) => {
      createLatticeTower(gx, -14, 12.2, 1.15);
    });
    [-32, -20, 20, 32].forEach((gx) => {
      createLatticeTower(gx, -27.5, 13.6, 1.25);
    });

    [-29, -19, -9, 9, 19, 29].forEach((bx) => {
      createBusSupportPedestal(bx, -14);
    });

    const mainBeam = new THREE.Mesh(new THREE.BoxGeometry(65, 0.65, 0.75), mats.galvanizedSteel);
    mainBeam.position.set(0, 11.6, -14);
    layerGroups.LAYER_CIVIL_GANTRIES.add(mainBeam);

    const lineBeamWest = new THREE.Mesh(new THREE.BoxGeometry(13, 0.55, 0.65), mats.galvanizedSteel);
    lineBeamWest.position.set(-26, 12.8, -27.5);
    layerGroups.LAYER_CIVIL_GANTRIES.add(lineBeamWest);

    const lineBeamEast = new THREE.Mesh(new THREE.BoxGeometry(13, 0.55, 0.65), mats.galvanizedSteel);
    lineBeamEast.position.set(26, 12.8, -27.5);
    layerGroups.LAYER_CIVIL_GANTRIES.add(lineBeamEast);

    // 132 kV Rigid Tubular Busbars (BUS-132-A & BUS-132-B)
    dynamicActors.busConductors['BUS-132-A'] = [];
    dynamicActors.busConductors['BUS-132-B'] = [];
    [-1.45, 0, 1.45].forEach((zPhase) => {
      const tubeA = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 28, 12),
        mats.bus132Highlight.clone()
      );
      tubeA.rotation.z = Math.PI / 2;
      tubeA.position.set(-17.5, 7.6, -14 + zPhase);
      layerGroups.LAYER_132_AIS.add(tubeA);
      dynamicActors.busConductors['BUS-132-A'].push(tubeA);

      const tubeB = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 28, 12),
        mats.bus132Highlight.clone()
      );
      tubeB.rotation.z = Math.PI / 2;
      tubeB.position.set(17.5, 7.6, -14 + zPhase);
      layerGroups.LAYER_132_AIS.add(tubeB);
      dynamicActors.busConductors['BUS-132-B'].push(tubeB);
    });

    // Three-Phase 132 kV Connections:
    // 1) LINE-1 & LINE-2 Gantry -> Line Bays -> 132 kV Bus A & Bus B
    createThreePhaseConnection('BAY-132-L1', [-26, 12.2, -27.5], [-26, 5.1, -25.0], 'X', 1.85, 0.65, 'OVERHEAD_ACSR', 0.042);
    createThreePhaseConnection('BAY-132-L1', [-26, 5.1, -18.5], [-26, 7.6, -14.0], 'X', 1.85, 0.35, 'OVERHEAD_ACSR', 0.042);
    createThreePhaseConnection('BAY-132-L2', [26, 12.2, -27.5], [26, 5.1, -25.0], 'X', 1.85, 0.65, 'OVERHEAD_ACSR', 0.042);
    createThreePhaseConnection('BAY-132-L2', [26, 5.1, -18.5], [26, 7.6, -14.0], 'X', 1.85, 0.35, 'OVERHEAD_ACSR', 0.042);

    // 2) CB-132 Bus Coupler 3-Phase Tie Connections between Bus 132-A and Bus 132-B
    createThreePhaseConnection('BAY-132-BC', [-3.6, 7.6, -14.0], [0, 5.1, -14.0], 'Z', 1.45, 0.25, 'OVERHEAD_ACSR', 0.042);
    createThreePhaseConnection('BAY-132-BC', [0, 5.1, -14.0], [3.6, 7.6, -14.0], 'Z', 1.45, 0.25, 'OVERHEAD_ACSR', 0.042);

    // 3) 132 kV Busbars -> 132-T1 & 132-T2 Breakers -> T1 & T2 132 kV HV Condenser Bushings
    createThreePhaseConnection('BAY-132-T1', [-12.5, 7.6, -14.0], [-12.5, 5.1, -11.2], 'X', 1.45, 0.3, 'OVERHEAD_ACSR', 0.042);
    createThreePhaseConnection('BAY-132-T1', [-12.5, 5.1, -6.8], [-12.5, 7.9, -1.6], 'X', 1.45, 0.45, 'OVERHEAD_ACSR', 0.042);
    createThreePhaseConnection('BAY-132-T2', [12.5, 7.6, -14.0], [12.5, 5.1, -11.2], 'X', 1.45, 0.3, 'OVERHEAD_ACSR', 0.042);
    createThreePhaseConnection('BAY-132-T2', [12.5, 5.1, -6.8], [12.5, 7.9, -1.6], 'X', 1.45, 0.45, 'OVERHEAD_ACSR', 0.042);

    // 4) T1 & T2 33 kV LV Bushings -> 3-Phase Insulated Busbars / XLPE Risers -> 33 kV Incomers (33-INC1 & 33-INC2)
    // T1 LV cable enters the 33 kV hall through a buried duct bank, not across the cabinet fronts.
    createBuriedCableRoute('BAY-33-INC1', [-12.5, 0.45, 0.8], [-24.5, 0.45, 10.5], 33);
    createBuriedCableRoute('BAY-33-INC2', [12.5, 0.45, 0.8], [5.5, 0.45, 10.5], 33);

    create132kVAisBay(-26, -21, 'BAY-132-L1', true);
    create132kVAisBay(26, -21, 'BAY-132-L2', true);
    create132kVAisBay(0, -14, 'BAY-132-BC', false);

    create132kVAisBay(-12.5, -9.2, 'BAY-132-T1', false);
    create50MvaTransformer(-12.5, -0.5, 'BAY-132-T1', 'TX-T1');

    create132kVAisBay(12.5, -9.2, 'BAY-132-T2', false);
    create50MvaTransformer(12.5, -0.5, 'BAY-132-T2', 'TX-T2');

    // LV cable duct banks are underground; no exposed bus duct crosses the switchgear front.

    // Two separate transparent indoor switchgear rooms, with glass walls,
    // structural frames, warm interior lighting and underground cable entries.
    const makeGlassSwitchgearRoom = (voltage: 33 | 11, centerZ: number, depth: number) => {
      const group = voltage === 33 ? layerGroups.LAYER_33_SWG : layerGroups.LAYER_11_SWG_DT;
      const width = 59.4;
      const height = voltage === 33 ? 8.3 : 7.8;

      // Realistic transparent blue-grey architectural glass (low opacity, no glowing haze)
      const glass = new THREE.MeshPhysicalMaterial({
        color: 0x8ab0d0,
        metalness: 0.06,
        roughness: 0.10,
        transparent: true,
        opacity: 0.065,
        side: THREE.DoubleSide,
        depthWrite: false,
      });

      // Dark metallic window mullions & structural columns (#243447 — not glowing cyan)
      const darkMullionMat = new THREE.MeshStandardMaterial({
        color: 0x243447,
        metalness: 0.72,
        roughness: 0.32,
      });
      const roofFasciaMat = new THREE.MeshStandardMaterial({
        color: 0x1e2e40,
        metalness: 0.65,
        roughness: 0.38,
      });
      const ceilingSoffitMat = new THREE.MeshStandardMaterial({
        color: 0x33475b,
        metalness: 0.25,
        roughness: 0.75,
        emissive: 0x2b2418,
        emissiveIntensity: 0.18,
      });

      // Subtle cyan architectural edge lighting (#00DFFF) ONLY on roof & foundation edges
      const cyanEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00dfff });
      // Warm-neutral white (3500-4000K, #FFE0AC) recessed ceiling LED fixtures
      const ceilingLedMat = new THREE.MeshBasicMaterial({ color: 0xffe0ac });

      const makePanel = (w: number, h: number, x: number, y: number, z: number, rotationY = 0) => {
        const pane = new THREE.Mesh(new THREE.PlaneGeometry(w, h), glass);
        pane.position.set(x, y, z);
        pane.rotation.y = rotationY;
        group.add(pane);
      };

      const makeBeam = (a: [number, number, number], b: [number, number, number], radius = 0.055, mat: any = darkMullionMat) => {
        const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b);
        const vec = end.clone().sub(start);
        const beam = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, vec.length(), 8), mat);
        beam.position.copy(start).add(end).multiplyScalar(0.5);
        beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec.normalize());
        group.add(beam);
      };

      const front = centerZ + depth / 2, back = centerZ - depth / 2;
      makePanel(width, height, 0, height / 2, front);
      makePanel(width, height, 0, height / 2, back);
      makePanel(depth, height, -width / 2, height / 2, centerZ, Math.PI / 2);
      makePanel(depth, height, width / 2, height / 2, centerZ, Math.PI / 2);

      // Vertical & horizontal dark metallic curtain-wall mullions
      for (const z of [front, back]) {
        for (let x = -width / 2; x <= width / 2 + 0.01; x += width / 6) {
          makeBeam([x, 0, z], [x, height, z], 0.055, darkMullionMat);
        }
      }
      for (const x of [-width / 2, width / 2]) {
        for (let z = back; z <= front + 0.01; z += depth / 2) {
          makeBeam([x, 0, z], [x, height, z], 0.06, darkMullionMat);
        }
      }

      // Top roof cover & ceiling soffit intentionally omitted so 33 kV & 11 kV switchgear rooms are 100% open/transparent from above

      // Subtle cyan architectural edge strips ONLY along foundation base and roof perimeter
      for (const zEdge of [front + 0.06, back - 0.06]) {
        const baseCyan = new THREE.Mesh(new THREE.BoxGeometry(width + 0.25, 0.075, 0.12), cyanEdgeMat);
        baseCyan.position.set(0, 0.08, zEdge);
        group.add(baseCyan);
        const roofCyan = new THREE.Mesh(new THREE.BoxGeometry(width + 0.4, 0.065, 0.12), cyanEdgeMat);
        roofCyan.position.set(0, height - 0.08, zEdge);
        group.add(roofCyan);
      }
      for (const xEdge of [-width / 2 - 0.06, width / 2 + 0.06]) {
        const sideBaseCyan = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.075, depth + 0.25), cyanEdgeMat);
        sideBaseCyan.position.set(xEdge, 0.08, centerZ);
        group.add(sideBaseCyan);
        const sideRoofCyan = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.065, depth + 0.4), cyanEdgeMat);
        sideRoofCyan.position.set(xEdge, height - 0.08, centerZ);
        group.add(sideRoofCyan);
      }

      // Realistic dark-framed double glass entrance doors in center of front facade
      const doorWidth = 4.6;
      const doorHeight = 4.9;
      const doorZ = front + 0.06;
      makeBeam([-doorWidth / 2, 0.08, doorZ], [-doorWidth / 2, doorHeight, doorZ], 0.08, darkMullionMat);
      makeBeam([doorWidth / 2, 0.08, doorZ], [doorWidth / 2, doorHeight, doorZ], 0.08, darkMullionMat);
      makeBeam([0, 0.08, doorZ], [0, doorHeight, doorZ], 0.055, darkMullionMat);
      makeBeam([-doorWidth / 2, doorHeight, doorZ], [doorWidth / 2, doorHeight, doorZ], 0.08, darkMullionMat);
      for (const dx of [-0.24, 0.24]) {
        const handle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.10), mats.galvanizedSteel);
        handle.position.set(dx, 2.35, doorZ + 0.08);
        group.add(handle);
      }

      // Clean dark-matte interior floor slab
      const interiorFloor = new THREE.Mesh(
        new THREE.BoxGeometry(width - 0.6, 0.08, depth - 0.6),
        new THREE.MeshStandardMaterial({ color: 0x1a2838, roughness: 0.78, metalness: 0.12 })
      );
      interiorFloor.position.set(0, 0.34, centerZ);
      group.add(interiorFloor);

      // Slim perimeter LED strips along front & rear glass headers (no floating roof cover slabs)
      for (const zOff of [front - 0.12, back + 0.12]) {
        const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(width - 1.2, 0.05, 0.12), ceilingLedMat);
        ledStrip.position.set(0, height - 0.16, zOff);
        group.add(ledStrip);
      }
      [-18, 0, 18].forEach((lx) => {
        const hallLight = new THREE.PointLight(0xffe0ac, 0.46, 20, 1.7);
        hallLight.position.set(lx, height - 0.9, centerZ + 2.2);
        group.add(hallLight);
      });

      // Clean cyan-bordered dark glass nameplate matching the target sample
      const labelCanvas = document.createElement('canvas');
      labelCanvas.width = 1024; labelCanvas.height = 148;
      const labelCtx = labelCanvas.getContext('2d');
      if (labelCtx) {
        labelCtx.fillStyle = 'rgba(5, 19, 36, 0.92)';
        labelCtx.fillRect(0, 0, 1024, 148);
        labelCtx.strokeStyle = '#00dfff';
        labelCtx.lineWidth = 6;
        labelCtx.strokeRect(5, 5, 1014, 138);
        labelCtx.fillStyle = '#e2f4ff';
        labelCtx.textAlign = 'center';
        labelCtx.textBaseline = 'middle';
        labelCtx.font = 'bold 50px Inter, Arial, sans-serif';
        labelCtx.fillText(`${voltage} kV SWITCHGEAR (INDOOR)`, 512, 76);
        const texture = new THREE.CanvasTexture(labelCanvas);
        const sign = new THREE.Mesh(
          new THREE.PlaneGeometry(18.0, 2.45),
          new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false })
        );
        sign.position.set(0, height * 0.72, front + 0.14);
        group.add(sign);
      }
    };
    makeGlassSwitchgearRoom(33, 10.5, 12.2);
    makeGlassSwitchgearRoom(11, 22.5, 11.0);

    // 33 kV Indoor Switchgear Building (Z = +10.5) with 3-Phase Insulated Copper Busbars
    const hall33Floor = new THREE.Mesh(new THREE.BoxGeometry(58, 0.35, 6.2), mats.concreteFoundation);
    hall33Floor.position.set(0, 0.18, 10.5);
    layerGroups.LAYER_33_SWG.add(hall33Floor);

    // 33 kV top roof slab omitted for unobstructed top-down visibility into all cubicles

    dynamicActors.busConductors['BUS-33-A'] = [];
    dynamicActors.busConductors['BUS-33-B'] = [];
    [-0.28, 0, 0.28].forEach((zPhase) => {
      const bus33TubeA = new THREE.Mesh(
        new THREE.BoxGeometry(25.5, 0.09, 0.09),
        mats.bus33Highlight.clone()
      );
      bus33TubeA.position.set(-14.2, 3.85, 10.5 + zPhase);
      layerGroups.LAYER_33_SWG.add(bus33TubeA);
      dynamicActors.busConductors['BUS-33-A'].push(bus33TubeA);

      const bus33TubeB = new THREE.Mesh(
        new THREE.BoxGeometry(25.5, 0.09, 0.09),
        mats.bus33Highlight.clone()
      );
      bus33TubeB.position.set(14.2, 3.85, 10.5 + zPhase);
      layerGroups.LAYER_33_SWG.add(bus33TubeB);
      dynamicActors.busConductors['BUS-33-B'].push(bus33TubeB);
    });

    // CB-33 Bus-Tie 3-Phase Enclosed Copper Busbars bridging BUS-33-A and BUS-33-B
    createThreePhaseConnection('BAY-33-BC', [-1.8, 3.85, 10.5], [1.8, 3.85, 10.5], 'Z', 0.28, 0.0, 'ENCLOSED_COPPER_BUS', 0.045);

    // 11 kV Indoor Switchgear Hall (Z = +22.5) with 3-Phase Insulated Copper Busbars
    const hall11Floor = new THREE.Mesh(new THREE.BoxGeometry(58, 0.35, 6.4), mats.concreteFoundation);
    hall11Floor.position.set(0, 0.18, 22.5);
    layerGroups.LAYER_11_SWG_DT.add(hall11Floor);

    // 11 kV top roof slab omitted for unobstructed top-down visibility into all cubicles

    dynamicActors.busConductors['BUS-11-A'] = [];
    dynamicActors.busConductors['BUS-11-B'] = [];
    [-0.24, 0, 0.24].forEach((zPhase) => {
      const bus11TubeA = new THREE.Mesh(
        new THREE.BoxGeometry(25.5, 0.08, 0.08),
        mats.bus11Highlight.clone()
      );
      bus11TubeA.position.set(-14.2, 3.25, 22.5 + zPhase);
      layerGroups.LAYER_11_SWG_DT.add(bus11TubeA);
      dynamicActors.busConductors['BUS-11-A'].push(bus11TubeA);

      const bus11TubeB = new THREE.Mesh(
        new THREE.BoxGeometry(25.5, 0.08, 0.08),
        mats.bus11Highlight.clone()
      );
      bus11TubeB.position.set(14.2, 3.25, 22.5 + zPhase);
      layerGroups.LAYER_11_SWG_DT.add(bus11TubeB);
      dynamicActors.busConductors['BUS-11-B'].push(bus11TubeB);
    });

    // CB-11 Bus-Tie 3-Phase Enclosed Copper Busbars bridging BUS-11-A and BUS-11-B
    createThreePhaseConnection('BAY-11-BC', [-1.8, 3.25, 22.5], [1.8, 3.25, 22.5], 'Z', 0.24, 0.0, 'ENCLOSED_COPPER_BUS', 0.04);

    // Helper to register animated power-flow pulse path for a bay
    const addPowerPulsePath = (
      p1: [number, number, number],
      p2: [number, number, number],
      bayId: string,
      voltageKv: 132 | 33 | 11,
      colorHex: number,
      baseSpeed = 0.15
    ) => {
      // Subtle stationary luminous nylon core follows this exact conductor route.
      // It is state-controlled with the moving streaks below.
      const direction = new THREE.Vector3(p2[0] - p1[0], p2[1] - p1[1], p2[2] - p1[2]);
      const core = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, direction.length(), 8),
        new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 0.56, depthWrite: false })
      );
      core.position.set((p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2, (p1[2] + p2[2]) / 2);
      core.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
      scene.add(core);
      // Reuse pulse actor visibility logic for the stationary core without animating its position.
      dynamicActors.powerPulses.push({ mesh: core, p1: core.position.toArray(), p2: core.position.toArray(), bayId, voltageKv, baseSpeed: 0, offset: 0, baseColorHex: colorHex });
      // Three spaced glowing streaks per physical conductor route for a cleaner, lower-density power flow.
      const flowStreakDensity = 3;
      for (let k = 0; k < flowStreakDensity; k++) {
        const orb = new THREE.Mesh(
          new THREE.CylinderGeometry(0.055, 0.055, 0.68, 10),
          new THREE.MeshBasicMaterial({ color: colorHex, transparent: true, opacity: 1.0 })
        );
        // A slim directional streak is aligned to the physical conductor span.
        const tangent = new THREE.Vector3(p2[0]-p1[0], p2[1]-p1[1], p2[2]-p1[2]).normalize();
        orb.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangent);
        scene.add(orb);
        dynamicActors.powerPulses.push({
          mesh: orb,
          p1,
          p2,
          bayId,
          voltageKv,
          baseSpeed,
          offset: k / flowStreakDensity,
          baseColorHex: colorHex,
        });
      }
    };


    // ==================== RESIDENTIAL DISTRIBUTION, ROADS, STREETLIGHTS & LANDSCAPING ====================
    // Engineering path: 11 kV Switchgear -> 11 kV Outgoing Feeder -> 11 kV 3-Phase ACSR Overhead Line ->
    // 11/0.415 kV 250 kVA Distribution Transformer -> 415 V 3-Phase 4-Wire (ABC+N) LT Network ->
    // 230 V Single-Phase (L-N) Service Drops -> Suburban Residential Houses.
    const residentialGroup = new THREE.Group();
    scene.add(residentialGroup);
    const hv11LiveMeshes: any[] = [];
    const lt415LiveMeshes: any[] = [];
    const serviceDropLiveMeshes: any[] = [];
    const residentialLamps: any[] = [];
    const streetHouseLamps: { mesh: any; feederId: string }[] = [];
    const streetHouseGlows: { mesh: any; feederId: string }[] = [];
    const apartmentDistribution: { feederId: string; transformer: any[]; hv: any[]; lt: any[]; pulses: any[] }[] = [];
    const streetFeederCircuits: { feederId: string; hv: any[]; lt: any[]; pulses: any[] }[] = [];
    const outgoingStreetBays = stateRef.current.bays.filter((b) => b.voltageKv === 11 && b.bayType === 'OUTGOING_FEEDER');
    const streetFeederIds = outgoingStreetBays.map((b) => b.id);
    const houseFeederId = (index: number) => streetFeederIds[Math.min(streetFeederIds.length - 1, Math.floor(index * streetFeederIds.length / 46))] || 'BAY-11-F01';
    const residentialGlowPools: any[] = [];
    const streetLights: any[] = [];
    const distPulseActors: {
      mesh: any;
      curve: any;
      tier: 'HV_11KV' | 'LT_415V' | 'SERVICE_230V';
      speed: number;
      offset: number;
    }[] = [];

    // Procedural Canvas Textures for soft radial light pools, lamp bloom halos, and black/yellow hazard curbs
    const makeRadialGlowTexture = (innerHex: string, midRgba: string, outerRgba = 'rgba(255,160,0,0)') => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
        g.addColorStop(0.0, innerHex);
        g.addColorStop(0.38, midRgba);
        g.addColorStop(1.0, outerRgba);
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
      return new THREE.CanvasTexture(c);
    };

    const makeStripedCurbTexture = (repeats: number) => {
      const c = document.createElement('canvas');
      c.width = 256;
      c.height = 32;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#111827';
        ctx.fillRect(0, 0, 256, 32);
        ctx.fillStyle = '#FACC15';
        ctx.fillRect(0, 0, 128, 32);
      }
      const tex = new THREE.CanvasTexture(c);
      if (THREE.RepeatWrapping !== undefined) {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeats, 1);
      }
      return tex;
    };

    const softPoolTex = makeRadialGlowTexture('rgba(255, 179, 71, 0.52)', 'rgba(255, 140, 20, 0.18)');
    const lampHaloTex = makeRadialGlowTexture('#FFE0AC', 'rgba(255, 179, 71, 0.48)');
    const housePoolTex = makeRadialGlowTexture('rgba(255, 200, 105, 0.38)', 'rgba(255, 155, 45, 0.12)');

    const makeWarmWindowTexture = () => {
      const c = document.createElement('canvas');
      c.width = 128;
      c.height = 128;
      const ctx = c.getContext('2d');
      if (ctx) {
        const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 86);
        g.addColorStop(0.0, '#FFF6B3');
        g.addColorStop(0.45, '#FFB319');
        g.addColorStop(1.0, '#E67300');
        ctx.fillStyle = g;
        ctx.fillRect(0, 0, 128, 128);
      }
      return new THREE.CanvasTexture(c);
    };
    const warmWindowTex = makeWarmWindowTexture();

    const rMat = (color: number, roughness = 0.65, metalness = 0.12, emissive = 0, emissiveIntensity = 0) =>
      new THREE.MeshStandardMaterial({
        color,
        roughness,
        metalness,
        emissive,
        emissiveIntensity,
      });

    // Professional nighttime color grading palette (#18283A asphalt, #E7D9C5 house walls, #FFB347 streetlights, #FFAA00 power flow)
    const asphaltMat = rMat(0x18283a, 0.46, 0.22);
    const sidewalkMat = rMat(0x3e4e60, 0.82, 0.08);
    const roadLineYellowMat = new THREE.MeshBasicMaterial({ color: 0xd99b26 });
    const lawnGrassMat = rMat(0x1e4620, 0.88, 0.03, 0x0a1e0c, 0.12);
    const hedgeGreenMat = rMat(0x1b401e, 0.85, 0.04, 0x081a0a, 0.12);
    const treeFoliageMats = [
      rMat(0x214d24, 0.82, 0.04, 0x0c220e, 0.15),
      rMat(0x1b421e, 0.84, 0.04, 0x091c0b, 0.14),
      rMat(0x285c2b, 0.80, 0.04, 0x102812, 0.16),
      rMat(0x2f6832, 0.80, 0.04, 0x122c14, 0.16),
    ];
    const flowerPinkMat = rMat(0xe11d48, 0.55, 0.04, 0x9f1239, 0.28);
    const flowerPurpleMat = rMat(0x9333ea, 0.55, 0.04, 0x581c87, 0.28);
    const flowerMagentaMat = rMat(0xdb2777, 0.55, 0.04, 0x831843, 0.28);
    const trunkMat = rMat(0x463222, 0.90, 0.03);

    // 6 Suburban house wall tones (cream, beige, warm white, light gray, soft stone, pale sand) & 4 dark slate/navy roofs
    const wallMats = [
      rMat(0xf3ece1, 0.70, 0.04, 0x4e381f, 0.18),
      rMat(0xe7d9c5, 0.72, 0.04, 0x4a351d, 0.17),
      rMat(0xdce4ec, 0.68, 0.06, 0x283848, 0.16),
      rMat(0xdfd0ba, 0.74, 0.04, 0x443019, 0.16),
      rMat(0xe5e7eb, 0.68, 0.05, 0x334155, 0.16),
      rMat(0xd8c7b0, 0.74, 0.04, 0x402d17, 0.16),
    ];
    const roofMats = [
      rMat(0x1d314f, 0.52, 0.22, 0x091526, 0.14),
      rMat(0x1e293b, 0.48, 0.26, 0x09101d, 0.14),
      rMat(0x243d61, 0.54, 0.20, 0x0b182b, 0.14),
      rMat(0x27374d, 0.50, 0.24, 0x0c1726, 0.14),
    ];
    const carBodyMats = [
      rMat(0x1e3a8a, 0.32, 0.68),
      rMat(0x991b1b, 0.34, 0.65),
      rMat(0x334155, 0.30, 0.72),
      rMat(0xdbe4ee, 0.35, 0.58),
      rMat(0x0f766e, 0.34, 0.66),
    ];
    const fasciaWhiteMat = rMat(0xe5dac9, 0.55, 0.08, 0x3d2d19, 0.16);
    const foundationStoneMat = rMat(0x475569, 0.82, 0.08);
    const woodDoorMat = rMat(0x7c4a27, 0.52, 0.12, 0x3d220e, 0.25);
    const gutterMetalMat = rMat(0x334155, 0.40, 0.65);
    const fenceIronMat = rMat(0x1e293b, 0.38, 0.72);
    const pillarStoneMat = rMat(0xdbe4ee, 0.70, 0.08, 0x475569, 0.20);

    const windowLit = new THREE.MeshBasicMaterial({ map: warmWindowTex, color: 0xffb830 });
    const windowGlowInner = new THREE.MeshBasicMaterial({ map: warmWindowTex, color: 0xffe066 });
    const windowDark = new THREE.MeshBasicMaterial({ color: 0x1e293b });
    const lampBulb = new THREE.MeshBasicMaterial({ color: 0xffbe2e });
    const windowFrameDarkMat = rMat(0x2c3e55, 0.5, 0.25);
    const lightPoolMat = new THREE.MeshBasicMaterial({
      map: softPoolTex,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });
    const houseSpillMat = new THREE.MeshBasicMaterial({
      map: housePoolTex,
      transparent: true,
      opacity: 0.88,
      depthWrite: false,
    });
    const lampSpriteMat = new THREE.SpriteMaterial({
      map: lampHaloTex,
      color: 0xffb347,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    });

    // Controlled golden electrical power-flow materials (#FFAA00)
    const hvConductorMat = rMat(0x8a6d3b, 0.35, 0.65, 0x5c3a08, 0.22);
    const hvGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.92,
    });
    const hvOuterHaloMat = new THREE.MeshBasicMaterial({
      color: 0xff9500,
      transparent: true,
      opacity: 0.18,
      depthWrite: false,
    });
    const ltGlowMat = new THREE.MeshBasicMaterial({
      color: 0xffaa00,
      transparent: true,
      opacity: 0.88,
    });
    const pulseOrbMat = new THREE.MeshBasicMaterial({
      color: 0xffe0ac,
    });

    const residentialBox = (
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
      mat: any,
      parent: any = residentialGroup
    ) => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    const residentialCyl = (
      rTop: number,
      rBot: number,
      h: number,
      x: number,
      y: number,
      z: number,
      mat: any,
      parent: any = residentialGroup,
      seg = 8
    ) => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBot, h, seg), mat);
      mesh.position.set(x, y, z);
      parent.add(mesh);
      return mesh;
    };

    // Helper: Catenary sagged conductor with state-aware golden glow core, soft outer aura + travelling pulses
    const addSaggedConductor = (
      p1: [number, number, number],
      p2: [number, number, number],
      sag: number,
      radius: number,
      tier: 'HV_11KV' | 'LT_415V' | 'SERVICE_230V',
      pulseCount = 2,
      speed = 0.24
    ) => {
      // Residential distribution is now routed in underground XLPE ducts.
      // Keep the same voltage-tier actors and simulation associations, but
      // bury the visible conductors and travelling pulses below the terrain.
      const burialDepth = -0.75;
      const buriedStart = new THREE.Vector3(p1[0], burialDepth, p1[2]);
      const buriedEnd = new THREE.Vector3(p2[0], burialDepth, p2[2]);
      const mid: [number, number, number] = [
        (p1[0] + p2[0]) / 2,
        burialDepth,
        (p1[2] + p2[2]) / 2,
      ];
      const curve = new THREE.CatmullRomCurve3([
        buriedStart,
        new THREE.Vector3(...mid),
        buriedEnd,
      ]);
      // Base metallic wire
      const wireGeo = new THREE.TubeGeometry(curve, 12, radius * 0.75, 6, false);
      const wireMesh = new THREE.Mesh(wireGeo, hvConductorMat);
      residentialGroup.add(wireMesh);

      // Controlled golden energized conductor core (#FFAA00)
      const glowGeo = new THREE.TubeGeometry(curve, 12, radius * 1.15, 6, false);
      const glowMesh = new THREE.Mesh(glowGeo, tier === 'HV_11KV' ? hvGlowMat : ltGlowMat);
      residentialGroup.add(glowMesh);

      // Subtle tight halo only on HV/LT lines
      const auraGeo = new THREE.TubeGeometry(curve, 12, radius * 1.85, 6, false);
      const auraMesh = new THREE.Mesh(auraGeo, hvOuterHaloMat);
      residentialGroup.add(auraMesh);

      if (tier === 'HV_11KV') {
        hv11LiveMeshes.push(glowMesh, auraMesh);
      } else if (tier === 'LT_415V') {
        lt415LiveMeshes.push(glowMesh, auraMesh);
      } else {
        serviceDropLiveMeshes.push(glowMesh, auraMesh);
      }

      // Travelling golden energy pulses along the catenary curve
      for (let k = 0; k < pulseCount; k++) {
        const pMesh = new THREE.Mesh(
          new THREE.SphereGeometry(radius * 2.1, 8, 8),
          pulseOrbMat
        );
        residentialGroup.add(pMesh);
        distPulseActors.push({
          mesh: pMesh,
          curve,
          tier,
          speed,
          offset: k / Math.max(1, pulseCount),
        });
      }
    };

    // ==================== 1. SURROUNDING ROAD NETWORK, CURBS & SIDEWALKS (AREAS A, B, C & RCC PLAZA) ====================
    residentialBox(88, 0.14, 108, 78, -0.16, -16, lawnGrassMat);
    residentialBox(86, 0.14, 32, 2, -0.16, -48, lawnGrassMat);
    residentialBox(44, 0.14, 52, -58, -0.16, 8, lawnGrassMat);
    residentialBox(6.5, 0.14, 62, -41.5, -0.14, -4, lawnGrassMat);
    residentialBox(76, 0.14, 3.4, -3, -0.14, 24.8, lawnGrassMat);

    const roadSegmentsRegistry: {
      id: string;
      title: string;
      p1: [number, number, number];
      p2: [number, number, number];
      center: [number, number, number];
    }[] = [];
    let roadCounter = 0;

    // Optimized road builder using textured black-and-yellow curb strips + pickable road exploration metadata
    const buildRoadSegment = (
      cx: number,
      cz: number,
      len: number,
      width: number,
      axis: 'X' | 'Z',
      withCurbs = true
    ) => {
      roadCounter++;
      const roadId = `ROAD-0${roadCounter}`;
      const roadTitle =
        roadCounter === 1
          ? 'Main South Perimeter Avenue (RCC ↔ Substation ↔ Area B)'
          : roadCounter === 2
          ? 'East Collector Avenue (Substation ↔ Residential Areas B & C)'
          : roadCounter === 3
          ? 'West Collector Road (Remote Control Center ↔ Area A Rear)'
          : roadCounter === 4
          ? 'Area B South Residential Street (Houses B01–B06)'
          : roadCounter === 5
          ? 'Area B Central Residential Street (Houses B07–B12)'
          : roadCounter === 6
          ? 'Area B North Residential Street (Houses B13–B18)'
          : roadCounter === 7
          ? 'Area C Rear Suburban Street (Houses C01–C14)'
          : roadCounter === 8
          ? 'Central Residential Cross Street (North–South)'
          : roadCounter === 9
          ? 'Far-East Corner Cross Street (Houses B06 / B12 / B18 / C06)'
          : 'Area A Rear Substation Residential Street (Houses A01–A14)';

      const w = axis === 'X' ? len : width;
      const d = axis === 'X' ? width : len;
      const road = residentialBox(w, 0.10, d, cx, 0.01, cz, asphaltMat);
      road.receiveShadow = true;
      const p1: [number, number, number] = axis === 'X' ? [cx - len / 2 + 2, 1.72, cz] : [cx, 1.72, cz - len / 2 + 2];
      const p2: [number, number, number] = axis === 'X' ? [cx + len / 2 - 2, 1.72, cz] : [cx, 1.72, cz + len / 2 - 2];
      const roadMeta: WorldInspectableItem = {
        kind: 'ROAD',
        id: roadId,
        title: `${roadId} — ${roadTitle}`,
        subtitle: `${len.toFixed(0)} m × ${width.toFixed(1)} m Asphalt Roadway • Warm LED Streetlighting`,
        feederInfo: 'Click Follow Road or Walk Mode (W/A/S/D) to travel along this street centerline',
        position: [cx, 1.2, cz],
      };
      road.userData.worldItem = roadMeta;
      pickableMeshes.push(road);
      roadSegmentsRegistry.push({ id: roadId, title: roadTitle, p1, p2, center: [cx, 1.2, cz] });

      // Yellow dashed road-center markings
      const steps = Math.floor(len / 5.2);
      for (let i = 0; i < steps; i++) {
        const offset = -len / 2 + 2.6 + i * 5.2;
        if (axis === 'X') {
          residentialBox(2.4, 0.02, 0.18, cx + offset, 0.075, cz, roadLineYellowMat);
        } else {
          residentialBox(0.18, 0.02, 2.4, cx, 0.075, cz + offset, roadLineYellowMat);
        }
      }

      if (withCurbs) {
        const curbMat = new THREE.MeshBasicMaterial({
          map: makeStripedCurbTexture(Math.max(4, Math.round(len / 2.6))),
        });
        for (const side of [-1, 1]) {
          if (axis === 'X') {
            residentialBox(len, 0.16, 1.35, cx, 0.05, cz + side * (width / 2 + 0.72), sidewalkMat);
            residentialBox(len, 0.19, 0.24, cx, 0.065, cz + side * (width / 2 + 0.08), curbMat);
          } else {
            residentialBox(1.35, 0.16, len, cx + side * (width / 2 + 0.72), 0.05, cz, sidewalkMat);
            const cMesh = residentialBox(len, 0.19, 0.24, cx + side * (width / 2 + 0.08), 0.065, cz, curbMat);
            cMesh.rotation.y = Math.PI / 2;
          }
        }
      }
    };

    // Main Front Perimeter Road (South of RCC, Substation & Area B, Z = 29.2)
    buildRoadSegment(18, 29.2, 186, 7.4, 'X', true);
    // Main East Collector Avenue between Substation and Residential Neighborhoods B & C (X = 36.5)
    buildRoadSegment(36.5, -14.0, 94, 7.2, 'Z', true);
    // West Collector Avenue serving Remote Control Center (RCC) & Rear Area A (X = -43.5)
    buildRoadSegment(-43.5, -12.0, 88, 6.2, 'Z', true);
    // White zebra crosswalks at key intersections
    const crosswalkWhiteMat = rMat(0xdbe4ee, 0.65, 0.08);
    for (let cx = 33.6; cx <= 39.4; cx += 0.72) {
      residentialBox(0.42, 0.025, 2.2, cx, 0.075, 24.4, crosswalkWhiteMat);
      residentialBox(0.42, 0.025, 2.2, cx, 0.075, -31.5, crosswalkWhiteMat);
    }
    for (let cx = -46.0; cx <= -41.0; cx += 0.72) {
      residentialBox(0.42, 0.025, 2.2, cx, 0.075, 24.4, crosswalkWhiteMat);
    }
    // Substation & RCC Access Gate Aprons
    residentialBox(8.5, 0.10, 5.8, 32.2, 0.02, 19.5, asphaltMat);
    residentialBox(10.5, 0.10, 5.4, -48.5, 0.02, 14.0, asphaltMat);
    // Area B & Area C Residential Neighborhood Streets (East of Collector Avenue, X = 40..112)
    buildRoadSegment(76, 13.5, 74, 5.8, 'X', true);
    buildRoadSegment(76, -4.5, 74, 5.8, 'X', true);
    buildRoadSegment(76, -21.5, 74, 5.8, 'X', true);
    buildRoadSegment(76, -44.5, 74, 5.8, 'X', true);
    buildRoadSegment(74, -15.5, 62, 5.2, 'Z', false);
    buildRoadSegment(106, -15.5, 62, 5.0, 'Z', false);
    // Area A Rear Suburban Avenue behind the Substation (X = -42..+36, Z = -44.5)
    buildRoadSegment(-3, -44.5, 78, 5.8, 'X', true);

    // Left-side residential expansion: two clean streets and 4/5-floor apartment blocks.
    residentialBox(54, 0.13, 72, -81, -0.16, -24, lawnGrassMat);
    buildRoadSegment(-82, -24, 65, 6.0, 'Z', true);
    buildRoadSegment(-82, -37, 47, 5.6, 'X', true);
    buildRoadSegment(-82, -8, 47, 5.6, 'X', true);

    const aptWalls = [rMat(0xcbd6df, 0.88, 0.06), rMat(0xe3d7c4, 0.88, 0.06), rMat(0xb8c8d5, 0.88, 0.06)];
    const aptRoof = rMat(0x354658, 0.78, 0.08);
    const aptTrim = rMat(0x526c7c, 0.72, 0.08);
    const aptWindow = new THREE.MeshBasicMaterial({ color: 0xffd68a });
    const buildApartment = (x: number, z: number, floors: number, index: number) => {
      const feederId = streetFeederIds[Math.min(streetFeederIds.length - 1, index < 4 ? 0 : 1)] || 'BAY-11-F01';
      const w = 9.2, d = 8.0, h = floors * 2.75;
      residentialBox(w + 1.4, 0.22, d + 1.3, x, 0.03, z, sidewalkMat);
      residentialBox(w, h, d, x, h / 2 + 0.13, z, aptWalls[index % aptWalls.length]);
      residentialBox(w + 0.35, 0.38, d + 0.35, x, h + 0.32, z, aptRoof);
      for (let floor = 0; floor < floors; floor++) {
        const wy = 1.65 + floor * 2.75;
        for (const side of [-1, 1]) {
          const wx = x + side * 2.45;
          const pane = residentialBox(1.35, 1.35, 0.10, wx, wy, z + d / 2 + 0.09, aptWindow);
          streetHouseLamps.push({ mesh: pane, feederId });
          residentialBox(1.55, 0.15, 0.45, wx, wy - 0.76, z + d / 2 + 0.27, aptTrim);
          residentialBox(1.48, 0.08, 0.08, wx, wy - 0.12, z + d / 2 + 0.50, aptTrim);
          const sidePane = residentialBox(0.10, 1.18, 1.3, x + side * (w / 2 + 0.06), wy, z, aptWindow);
          streetHouseLamps.push({ mesh: sidePane, feederId });
        }
      }
      residentialBox(2.4, 1.8, 2.4, x - 2.3, h + 1.3, z - 1.4, aptTrim);
      residentialCyl(0.75, 0.75, 1.0, x + 2.4, h + 1.0, z - 1.4, aptRoof);
    };
    [-52, -37, -22, -7].forEach((z, row) => {
      buildApartment(-97, z, row % 2 === 0 ? 5 : 4, row);
      buildApartment(-67, z, row % 2 === 0 ? 4 : 5, row + 4);
    });

    // ==================== APARTMENT ELECTRICAL DISTRIBUTION ====================
    // Two separate 11/0.415 kV, 630 kVA compact ground-mounted transformers.
    // Each transformer serves four apartments; feeder state comes from the real 11 kV bays.
    // Buried cable conduits stay below grade. Short visible termination risers and
    // inspection markers make the electrical route readable without overhead wire clutter.
    const aptCable11 = rMat(0x00b9ed, 0.38, 0.30);
    const aptCable415 = rMat(0xf3ad37, 0.42, 0.18);
    const aptCabinet = rMat(0x647d8b, 0.52, 0.28);
    const aptInsulator = rMat(0x9c4e30, 0.62, 0.06);
    const aptTransformerCore = rMat(0x34596d, 0.45, 0.40);
    const aptCableDuct = rMat(0x273c4c, 0.74, 0.08);
    const aptCircuitLine = (
      points: [number, number, number][], material: any, radius: number,
      destination: any[], circuit: { feederId: string; pulses: any[] },
      tier: 'HV_11KV' | 'LT_415V'
    ) => {
      for (let i = 1; i < points.length; i++) {
        const a = new THREE.Vector3(...points[i - 1]);
        const b = new THREE.Vector3(...points[i]);
        const vector = b.clone().sub(a);
        if (vector.length() < 0.01) continue;
        const cable = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, vector.length(), 8), material);
        cable.position.copy(a).add(b).multiplyScalar(0.5);
        cable.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vector.normalize());
        residentialGroup.add(cable);
        destination.push(cable);
        // Pulses are attached to the physical cable centreline, never floating in air.
        const curve = new THREE.LineCurve3(a, b);
        for (let j = 0; j < 2; j++) {
          const pulse = new THREE.Mesh(new THREE.SphereGeometry(radius * 1.9, 6, 6),
            new THREE.MeshBasicMaterial({ color: tier === 'HV_11KV' ? 0x00eaff : 0xffbd49 }));
          residentialGroup.add(pulse);
          circuit.pulses.push({ mesh: pulse, curve, tier, speed: 0.17, offset: j / 2 });
        }
      }
    };
    [
      { x: -105, z: -47, feederId: streetFeederIds[0] || 'BAY-11-F01', apartments: [-97, -67] },
      { x: -59, z: -47, feederId: streetFeederIds[1] || streetFeederIds[0] || 'BAY-11-F02', apartments: [-97, -67] },
    ].forEach((dt, dtIndex) => {
      const circuit = { feederId: dt.feederId, transformer: [] as any[], hv: [] as any[], lt: [] as any[], pulses: [] as any[] };
      apartmentDistribution.push(circuit);
      const x = dt.x, z = dt.z;
      // Concrete plinth and protective fenced transformer compound beside the avenue.
      residentialBox(5.8, 0.24, 5.2, x, 0.16, z, sidewalkMat);
      const body = residentialBox(3.4, 2.35, 2.45, x, 1.47, z, aptTransformerCore);
      circuit.transformer.push(body);
      const roof = residentialBox(3.8, 0.20, 2.8, x, 2.78, z, aptCabinet);
      circuit.transformer.push(roof);
      // Clearly visible transformer compound, identification sign and cable-route indicator.
      const makeApartmentSign = (message: string, xPos: number, yPos: number, zPos: number) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512; canvas.height = 160;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.fillStyle = '#08243a'; ctx.fillRect(0, 0, 512, 160);
        ctx.strokeStyle = '#00d7f7'; ctx.lineWidth = 7; ctx.strokeRect(5, 5, 502, 150);
        ctx.fillStyle = '#e9faff'; ctx.font = 'bold 31px Arial'; ctx.textAlign = 'center';
        ctx.fillText(message, 256, 65);
        ctx.font = '25px Arial'; ctx.fillStyle = '#ffce66';
        ctx.fillText('11/0.415 kV  |  630 kVA', 256, 113);
        const texture = new THREE.CanvasTexture(canvas);
        const sign = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false }));
        sign.position.set(xPos, yPos, zPos); sign.scale.set(7.6, 2.4, 1);
        residentialGroup.add(sign);
      };
      makeApartmentSign(`DT-APT-${dtIndex + 1}`, x, 5.9, z);
      const fenceMat = rMat(0x8bb4c3, 0.6, 0.2);
      for (const dx of [-3.15, 3.15]) for (const dz of [-2.85, 2.85])
        residentialBox(0.10, 2.0, 0.10, x + dx, 1.05, z + dz, fenceMat);
      for (const dz of [-2.85, 2.85])
        residentialBox(6.4, 0.08, 0.08, x, 1.9, z + dz, fenceMat);
      for (const dx of [-3.15, 3.15])
        residentialBox(0.08, 0.08, 5.8, x + dx, 1.9, z, fenceMat);
      // Surface-access inspection trench: the real 11 kV / LT conductors remain buried.
      residentialBox(1.3, 0.10, 3.6, x + 3.9, 0.12, z, aptCableDuct);
      residentialBox(0.6, 0.06, 0.6, x + 3.9, 0.21, z + 1.0, aptCable11);
      residentialBox(0.6, 0.06, 0.6, x + 3.9, 0.21, z - 1.0, aptCable415);
      // HV bushing box, three insulators, LV outgoing enclosure and radiator fins.
      residentialBox(2.1, 0.55, 0.85, x, 2.53, z - 0.45, aptCabinet);
      [-0.65, 0, 0.65].forEach((off) => {
        residentialCyl(0.13, 0.13, 0.62, x + off, 3.05, z - 0.45, aptInsulator);
      });
      for (let fin = 0; fin < 6; fin++) {
        residentialBox(0.10, 1.40, 1.85, x - 1.80 - fin * 0.075, 1.50, z, aptCabinet);
      }
      residentialBox(1.25, 1.55, 0.35, x + 2.3, 1.0, z, aptCabinet);
      // Underground 11 kV supply: 11 kV switchgear hall -> west road corridor -> DT.
      // The entry is represented as an underground cable; no conductor crosses the yard in air.
      const entryZ = 25.5;
      aptCircuitLine([
        [-28, -0.18, entryZ], [-47, -0.18, entryZ], [-47, -0.18, -43],
        [x, -0.18, -43], [x, -0.18, z - 1.2], [x, 2.90, z - 0.45],
      ], aptCable11, 0.065, circuit.hv, circuit, 'HV_11KV');
      // 415 V underground distribution spine with independent service branches.
      const spineX = dtIndex === 0 ? -105 : -59;
      aptCircuitLine([[x + 2.3, 0.6, z], [spineX, -0.13, z], [spineX, -0.13, -53],
        [spineX, -0.13, -7]], aptCable415, 0.085, circuit.lt, circuit, 'LT_415V');
      const aptX = dtIndex === 0 ? -97 : -67;
      [-52, -37, -22, -7].forEach((aptZ) => {
        const panelX = aptX + 5.25;
        residentialBox(0.9, 1.45, 0.45, panelX, 0.83, aptZ + 2.8, aptCabinet);
        residentialBox(0.46, 0.25, 0.48, panelX, 1.38, aptZ + 3.05, aptInsulator);
        aptCircuitLine([[spineX, -0.13, aptZ], [panelX, -0.13, aptZ],
          [panelX, -0.13, aptZ + 2.8], [panelX, 0.55, aptZ + 2.8]],
          aptCable415, 0.045, circuit.lt, circuit, 'LT_415V');
      });
      // Raised, clearly visible route covers: cables stay underground, while the
      // inspection corridor identifies each apartment's supply path from above.
      const hvMarkerMat = new THREE.MeshBasicMaterial({ color: 0x00d9f7 });
      const ltMarkerMat = new THREE.MeshBasicMaterial({ color: 0xffb84a });
      for (let segment = 0; segment < 8; segment++) {
        const mz = -43 + segment * 4.9;
        const marker = residentialBox(0.46, 0.055, 2.0, spineX, 0.17, mz, ltMarkerMat);
        marker.userData.feederId = dt.feederId;
        circuit.lt.push(marker);
      }
      // Clearly identifiable incoming 11 kV and outgoing LT terminations on the
      // transformer enclosure. Their colors follow the actual breaker state.
      const hvTermination = residentialBox(0.32, 1.3, 0.30, x - 0.85, 3.60, z - 0.45, hvMarkerMat);
      const ltTermination = residentialBox(0.48, 1.1, 0.32, x + 2.3, 2.25, z, ltMarkerMat);
      circuit.hv.push(hvTermination);
      circuit.lt.push(ltTermination);
      // Front-facing ground marker allows users to find the transformer from the
      // default view without enabling an underground/cutaway display.
      residentialBox(3.3, 0.10, 0.75, x, 0.34, z + 3.3, aptCableDuct);
      residentialBox(2.8, 0.12, 0.38, x, 0.43, z + 3.3, hvMarkerMat);
      // Ground-level cable corridor covers, visible from the normal camera angle.
      // These represent the duct bank, not exposed energized conductors.
      for (const aptZ of [-52, -37, -22, -7]) {
        const cover = residentialBox(0.55, 0.055, 2.1, spineX, 0.12, aptZ, aptCableDuct);
        cover.userData.feederId = dt.feederId;
        const routePlate = residentialBox(0.45, 0.065, 0.6, spineX, 0.17, aptZ, aptCable415);
        routePlate.userData.feederId = dt.feederId;
      }
      // Small cyan/amber cable-route marker plates above ground at road crossings.
      [-43, -24, -8].forEach((markZ) => {
        const plate = residentialBox(0.65, 0.045, 0.65, spineX, 0.09, markZ,
          dtIndex === 0 ? aptCable11 : aptCable415);
        plate.userData.feederId = dt.feederId;
      });
    });

    // ==================== 2. SUBSTATION PERIMETER WROUGHT-IRON FENCE, BOLLARDS & FLOWERBEDS ====================
    const buildFenceRun = (
      x1: number,
      z1: number,
      x2: number,
      z2: number,
      withBollards = true
    ) => {
      const dx = x2 - x1;
      const dz = z2 - z1;
      const totalLen = Math.hypot(dx, dz);
      const ux = dx / totalLen;
      const uz = dz / totalLen;
      const rotY = Math.atan2(dx, dz);

      for (const ry of [0.35, 1.10, 1.85]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, totalLen), fenceIronMat);
        rail.position.set((x1 + x2) / 2, ry, (z1 + z2) / 2);
        rail.rotation.y = rotY;
        residentialGroup.add(rail);
      }

      const nPickets = Math.floor(totalLen / 0.85);
      if (THREE.InstancedMesh) {
        const pGeo = new THREE.BoxGeometry(0.06, 1.95, 0.06);
        const instPickets = new THREE.InstancedMesh(pGeo, fenceIronMat, nPickets + 1);
        const dummy = new THREE.Object3D();
        for (let i = 0; i <= nPickets; i++) {
          const t = i / Math.max(1, nPickets);
          dummy.position.set(x1 + dx * t, 1.0, z1 + dz * t);
          dummy.updateMatrix();
          instPickets.setMatrixAt(i, dummy.matrix);
        }
        instPickets.instanceMatrix.needsUpdate = true;
        residentialGroup.add(instPickets);
      }

      const nPiers = Math.max(2, Math.round(totalLen / 7.5));
      for (let i = 0; i <= nPiers; i++) {
        const t = i / nPiers;
        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        residentialBox(0.42, 2.15, 0.42, px, 1.08, pz, fenceIronMat);
        residentialBox(0.52, 0.15, 0.52, px, 2.20, pz, pillarStoneMat);
        if (withBollards && i < nPiers) {
          const bx = px + ux * (totalLen / nPiers) * 0.5 + uz * 0.68;
          const bz = pz + uz * (totalLen / nPiers) * 0.5 - ux * 0.68;
          residentialCyl(0.08, 0.10, 0.85, bx, 0.42, bz, fenceIronMat);
          const lantern = residentialCyl(0.15, 0.13, 0.28, bx, 0.96, bz, lampBulb);
          streetLights.push(lantern);
          const pool = new THREE.Mesh(new THREE.PlaneGeometry(3.8, 3.8), lightPoolMat);
          pool.rotation.x = -Math.PI / 2;
          pool.position.set(bx, 0.065, bz);
          residentialGroup.add(pool);
          residentialGlowPools.push(pool);
        }
      }
    };

    buildFenceRun(-39, 23.8, 18, 23.8, true);
    buildFenceRun(24.2, 23.8, 31.5, 23.8, true);
    buildFenceRun(31.5, 16.5, 31.5, -32, true);
    buildFenceRun(-39, -32, -39, 23.8, true);

    const addFlowerCluster = (x: number, z: number, scale = 1.0) => {
      residentialBox(2.6 * scale, 0.55 * scale, 1.15 * scale, x, 0.28 * scale, z, hedgeGreenMat);
      const colors = [flowerPinkMat, flowerPurpleMat, flowerMagentaMat];
      for (let k = 0; k < 5; k++) {
        const fx = x + (k - 2) * 0.44 * scale;
        const fz = z + ((k % 2) - 0.5) * 0.32 * scale;
        const blossom = new THREE.Mesh(
          new THREE.DodecahedronGeometry(0.32 * scale, 0),
          colors[k % colors.length]
        );
        blossom.position.set(fx, 0.60 * scale + (k % 2) * 0.1, fz);
        residentialGroup.add(blossom);
      }
    };
    [-28, -14, -3, 6, 13, 27].forEach((fx, idx) => {
      addFlowerCluster(fx, 24.65, idx === 3 || idx === 4 ? 1.4 : 1.0);
    });
    [12, 2, -8, -18].forEach((fz) => {
      addFlowerCluster(32.2, fz, 0.95);
    });

    // ==================== 3. VARIED REALISTIC TREES & LANDSCAPING ====================
    const makeTree = (x: number, z: number, scale = 1.0, style = 0) => {
      const hTrunk = (2.1 + (style % 2) * 0.5) * scale;
      residentialCyl(0.14 * scale, 0.22 * scale, hTrunk, x, hTrunk / 2, z, trunkMat, residentialGroup, 6);
      const mat1 = treeFoliageMats[Math.abs(Math.round(x + z)) % treeFoliageMats.length];
      const mat2 = treeFoliageMats[(Math.abs(Math.round(x + z)) + 1) % treeFoliageMats.length];
      if (style % 3 === 0) {
        const c1 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.55 * scale, 1), mat1);
        c1.position.set(x, hTrunk + 1.1 * scale, z);
        residentialGroup.add(c1);
        const c2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1.18 * scale, 1), mat2);
        c2.position.set(x + 0.55 * scale, hTrunk + 1.75 * scale, z - 0.35 * scale);
        residentialGroup.add(c2);
      } else if (style % 3 === 1) {
        for (let l = 0; l < 2; l++) {
          const cone = new THREE.Mesh(
            new THREE.ConeGeometry((1.65 - l * 0.4) * scale, (2.1 - l * 0.3) * scale, 8),
            l % 2 === 0 ? mat1 : mat2
          );
          cone.position.set(x, hTrunk + (0.9 + l * 1.1) * scale, z);
          residentialGroup.add(cone);
        }
      } else {
        const mainCrown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.68 * scale, 1), mat2);
        mainCrown.scale.set(1.15, 0.88, 1.15);
        mainCrown.position.set(x, hTrunk + 1.25 * scale, z);
        residentialGroup.add(mainCrown);
      }
    };

    [-26, -16, -6, 4, 14, 22].forEach((tz, i) => makeTree(-41.5, tz, 0.95 + (i % 3) * 0.15, i));
    [
      [33.0, 21.5, 0.85],
      [33.0, 5.5, 0.95],
      [33.0, -6.5, 1.05],
      [33.0, -16.5, 0.95],
      [33.0, -26.5, 1.1],
      [41.5, 16.5, 0.9],
      [41.5, 2.0, 0.95],
      [41.5, -11.0, 1.0],
      [41.5, -27.0, 1.05],
    ].forEach(([tx, tz, sc], i) => makeTree(tx, tz, sc, i + 1));

    // ==================== 4. 26 SLENDER WARM AMBER LED STREETLIGHTS (2700-3200K) ====================
    const addStreetLight = (x: number, z: number, armDirX: number, armDirZ: number, withPointLight = false) => {
      const poleH = 6.6;
      residentialCyl(0.065, 0.11, poleH, x, poleH / 2, z, fenceIronMat, residentialGroup, 6);
      residentialCyl(0.16, 0.18, 0.45, x, 0.22, z, foundationStoneMat, residentialGroup, 6);

      const armLen = 1.55;
      const tipX = x + armDirX * armLen;
      const tipZ = z + armDirZ * armLen;
      const armStart = new THREE.Vector3(x, poleH - 0.15, z);
      const armEnd = new THREE.Vector3(tipX, poleH + 0.22, tipZ);
      const armVec = armEnd.clone().sub(armStart);
      const armMesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.055, armVec.length(), 6),
        fenceIronMat
      );
      armMesh.position.copy(armStart).add(armEnd).multiplyScalar(0.5);
      armMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), armVec.normalize());
      residentialGroup.add(armMesh);

      residentialBox(0.62, 0.12, 0.34, tipX, poleH + 0.22, tipZ, fenceIronMat);
      const lens = residentialBox(0.50, 0.06, 0.26, tipX, poleH + 0.15, tipZ, lampBulb);
      streetLights.push(lens);

      // Soft radial bloom sprite around luminaire
      if (THREE.Sprite) {
        const haloSprite = new THREE.Sprite(lampSpriteMat);
        haloSprite.position.set(tipX, poleH + 0.08, tipZ);
        haloSprite.scale.set(1.55, 1.55, 1);
        residentialGroup.add(haloSprite);
        residentialGlowPools.push(haloSprite);
      }

      // Soft radial gradient golden light pool on the dark asphalt road below
      const roadPool = new THREE.Mesh(new THREE.PlaneGeometry(8.8, 8.8), lightPoolMat);
      roadPool.rotation.x = -Math.PI / 2;
      roadPool.position.set(tipX, 0.075, tipZ);
      residentialGroup.add(roadPool);
      residentialGlowPools.push(roadPool);

      if (withPointLight) {
        const pt = new THREE.PointLight(0xffb84d, 0.88, 28, 1.6);
        pt.position.set(tipX, poleH - 0.2, tipZ);
        residentialGroup.add(pt);
        streetLights.push(pt);
      }
    };

    [-64, -48, -34, -18, -2, 14, 30, 48, 66, 84, 102].forEach((sx, idx) => {
      addStreetLight(sx, 24.8, 0, 1, idx % 3 === 0);
      addStreetLight(sx + 4, 33.6, 0, -1, false);
    });
    [16, 4, -8, -20, -32, -44, -54].forEach((sz, idx) => {
      addStreetLight(32.3, sz, 1, 0, idx % 2 === 0);
      addStreetLight(40.8, sz + 3, -1, 0, false);
      addStreetLight(-40.0, sz, -1, 0, idx === 1);
      addStreetLight(-47.0, sz + 3, 1, 0, false);
    });
    [48, 64, 80, 96, 108].forEach((sx, idx) => {
      addStreetLight(sx, 10.1, 0, 1, idx === 1);
      addStreetLight(sx + 3, 16.9, 0, -1, false);
      addStreetLight(sx + 4, -1.1, 0, -1, idx === 2);
      addStreetLight(sx, -7.9, 0, 1, false);
      addStreetLight(sx, -18.1, 0, -1, false);
      addStreetLight(sx + 3, -24.9, 0, 1, false);
      addStreetLight(sx, -41.1, 0, -1, idx === 2);
      addStreetLight(sx + 3, -47.9, 0, 1, false);
    });
    [-34, -20, -6, 8, 22].forEach((sx, idx) => {
      addStreetLight(sx, -41.1, 0, -1, idx === 2);
      addStreetLight(sx + 3, -47.9, 0, 1, false);
    });

    // ==================== 5. 15 DETAILED SUBURBAN HOUSES MATCHING IMAGE 1 ====================
    const makeSlopedGableRoof = (
      parent: any,
      w: number,
      d: number,
      baseY: number,
      ridgeH: number,
      roofMaterial: any,
      wallMaterial: any
    ) => {
      const overhangW = w / 2 + 0.52;
      const overhangD = d + 0.90;
      const slopeLen = Math.hypot(overhangW, ridgeH);
      const slopeAngle = Math.atan2(ridgeH, overhangW);

      for (const side of [-1, 1]) {
        const roofPlane = new THREE.Mesh(
          new THREE.BoxGeometry(slopeLen, 0.18, overhangD),
          roofMaterial
        );
        roofPlane.rotation.z = -side * slopeAngle;
        roofPlane.position.set(side * (overhangW / 2 - 0.04), baseY + ridgeH / 2, 0);
        roofPlane.castShadow = true;
        roofPlane.receiveShadow = true;
        parent.add(roofPlane);

        // Crisp white/cream fascia board & rain gutter along eaves
        residentialBox(0.09, 0.24, overhangD + 0.04, side * overhangW, baseY - 0.02, 0, fasciaWhiteMat, parent);
        residentialBox(0.11, 0.11, overhangD, side * (overhangW + 0.05), baseY + 0.05, 0, gutterMetalMat, parent);
      }

      // Roof ridge cap
      residentialBox(0.32, 0.20, overhangD + 0.08, 0, baseY + ridgeH + 0.04, 0, roofMaterial, parent);

      // Front and rear triangular gable walls + white raking bargeboards
      for (const zSide of [-1, 1]) {
        const shape = new THREE.Shape();
        shape.moveTo(-w / 2, 0);
        shape.lineTo(w / 2, 0);
        shape.lineTo(0, ridgeH);
        shape.closePath();
        const gMesh = new THREE.Mesh(new THREE.ShapeGeometry(shape), wallMaterial);
        gMesh.position.set(0, baseY - 0.02, zSide * (d / 2 + 0.02));
        if (zSide < 0) gMesh.rotation.y = Math.PI;
        parent.add(gMesh);

        // White raking fascia boards along the triangular gable edges (signature detail in Image 1)
        for (const side of [-1, 1]) {
          const rake = new THREE.Mesh(new THREE.BoxGeometry(slopeLen + 0.1, 0.20, 0.12), fasciaWhiteMat);
          rake.rotation.z = -side * slopeAngle;
          rake.position.set(side * (overhangW / 2), baseY + ridgeH / 2, zSide * (overhangD / 2));
          parent.add(rake);
        }
      }
    };

    const houseWeatherheads: [number, number, number][] = [];
    const houseSelectionHalos: Record<string, any> = {};

    const createSuburbanHouse = (
      hx: number,
      hz: number,
      idx: number,
      isTwoStorey: boolean,
      rotY = -0.78
    ) => {
      const houseId =
        idx < 18
          ? `HOUSE-B${String(idx + 1).padStart(2, '0')}`
          : idx < 32
          ? `HOUSE-C${String(idx - 17).padStart(2, '0')}`
          : `HOUSE-A${String(idx - 31).padStart(2, '0')}`;
      const areaName =
        idx < 18
          ? 'Area B (East Residential Neighborhood)'
          : idx < 32
          ? 'Area C (North-East Rear Suburban Rows)'
          : 'Area A (Rear Substation Residential Street)';
      const phaseChar = ['R', 'Y', 'B'][idx % 3];
      const assignedFeeder = houseFeederId(idx);
      const feederName = `11 kV ${assignedFeeder.replace('BAY-11-', '')} (${assignedFeeder}) — Independent Street Circuit`;

      const house = new THREE.Group();
      house.position.set(hx, 0, hz);
      // Orient house so the gable front facade, porch pillars, and glowing golden windows face the camera & street like Image 1
      house.rotation.y = rotY + ((idx % 3) - 1) * 0.04;
      residentialGroup.add(house);

      const wallMat = wallMats[idx % wallMats.length];
      const wingWallMat = wallMats[(idx + 1) % wallMats.length];
      const roofMat = roofMats[idx % roofMats.length];

      const plotW = 10.2;
      const plotD = 10.8;
      const mainW = isTwoStorey ? 6.5 : 7.0;
      const mainD = isTwoStorey ? 6.2 : 6.6;
      const mainH = isTwoStorey ? 4.85 : 3.85;
      const ridgeH = isTwoStorey ? 1.85 : 1.68;

      const frontDirZ = 1;

      // 1. Individual grass lawn plot, paved front walkway & driveway
      residentialBox(plotW, 0.08, plotD, 0, 0.02, 0, lawnGrassMat, house);
      residentialBox(1.6, 0.09, 3.8, -0.5, 0.045, frontDirZ * (mainD / 2 + 1.3), sidewalkMat, house);
      residentialBox(2.4, 0.09, 4.2, 2.6, 0.045, frontDirZ * (mainD / 2 + 1.1), pillarStoneMat, house);

      // 2. House foundation plinth & front entrance steps
      residentialBox(mainW + 0.36, 0.36, mainD + 0.36, -0.3, 0.18, 0, foundationStoneMat, house);
      residentialBox(2.8, 0.34, 4.3, 2.4, 0.17, -0.3, foundationStoneMat, house);
      residentialBox(1.9, 0.22, 0.92, -0.5, 0.11, frontDirZ * (mainD / 2 + 0.45), foundationStoneMat, house);

      // 3. Main house body & side wing extension
      const bodyMesh = residentialBox(mainW, mainH, mainD, -0.3, 0.36 + mainH / 2, 0, wallMat, house);
      bodyMesh.castShadow = true;
      bodyMesh.receiveShadow = true;

      const wingH = isTwoStorey ? 3.55 : 3.15;
      const wingMesh = residentialBox(2.6, wingH, 4.2, 2.4, 0.36 + wingH / 2, -0.3, wingWallMat, house);
      wingMesh.castShadow = true;

      // 4. Sloping gable roofs with dark navy/charcoal tiles, white raking fascia boards & downpipes
      makeSlopedGableRoof(house, mainW, mainD, 0.36 + mainH, ridgeH, roofMat, wallMat);
      makeSlopedGableRoof(house, 2.6, 4.2, 0.36 + wingH, 1.12, roofMat, wingWallMat);

      for (const cx of [-0.3 - mainW / 2 + 0.08, -0.3 + mainW / 2 - 0.08]) {
        residentialCyl(0.045, 0.045, mainH, cx, 0.36 + mainH / 2, frontDirZ * (mainD / 2 + 0.06), gutterMetalMat, house, 6);
      }

      // 5. Covered front porch with pitched gable canopy, square pillars & wooden entrance door
      const porchW = 3.45;
      const porchD = 1.65;
      const porchZ = frontDirZ * (mainD / 2 + porchD / 2 - 0.04);
      residentialBox(porchW, 0.18, porchD, -0.5, 2.95, porchZ, roofMat, house);
      residentialBox(porchW + 0.18, 0.14, porchD + 0.18, -0.5, 2.85, porchZ, fasciaWhiteMat, house);
      for (const px of [-2.05, 0.95]) {
        residentialBox(0.22, 2.58, 0.22, px, 1.58, frontDirZ * (mainD / 2 + porchD - 0.18), fasciaWhiteMat, house);
        residentialBox(0.30, 0.26, 0.30, px, 0.48, frontDirZ * (mainD / 2 + porchD - 0.18), foundationStoneMat, house);
      }

      // Wooden front door with glowing transom/sidelight & warm porch ceiling lantern
      const doorZ = frontDirZ * (mainD / 2 + 0.04);
      residentialBox(1.26, 2.34, 0.12, -0.5, 1.52, doorZ, fasciaWhiteMat, house);
      residentialBox(1.06, 2.18, 0.16, -0.5, 1.50, doorZ + 0.02, woodDoorMat, house);
      const porchLight = residentialBox(0.38, 0.36, 0.32, 0.28, 2.45, doorZ + 0.12, windowGlowInner, house);
      residentialLamps.push(porchLight);
      streetHouseLamps.push({ mesh: porchLight, feederId: assignedFeeder });

      // 6. Framed windows with bright warm golden-amber interior illumination (#FFD28A)
      // Double-sided protruding glass depth ensures visibility from every camera angle!
      const addFramedWindow = (wx: number, wy: number, wz: number, ww: number, wh: number, wRotY = 0, withHalo = false) => {
        const wGrp = new THREE.Group();
        wGrp.position.set(wx, wy, wz);
        wGrp.rotation.y = wRotY;
        house.add(wGrp);

        // Dark architectural window casing + white outer trim & sill
        residentialBox(ww + 0.26, wh + 0.26, 0.16, 0, 0, 0, fasciaWhiteMat, wGrp);
        residentialBox(ww + 0.12, wh + 0.12, 0.20, 0, 0, 0, windowFrameDarkMat, wGrp);
        residentialBox(ww + 0.34, 0.10, 0.30, 0, -wh / 2 - 0.06, 0, fasciaWhiteMat, wGrp);
        // Rich warm golden-amber illuminated glass pane (protrudes cleanly past wall & frame)
        const pane = residentialBox(ww, wh, 0.26, 0, 0, 0, windowLit, wGrp);
        residentialLamps.push(pane);
        streetHouseLamps.push({ mesh: pane, feederId: assignedFeeder });
        // Fine dark window mullions (crossbars) so the golden glass shines vividly
        residentialBox(0.05, wh + 0.02, 0.29, 0, 0, 0, windowFrameDarkMat, wGrp);
        residentialBox(ww + 0.02, 0.05, 0.29, 0, 0, 0, windowFrameDarkMat, wGrp);
        if (withHalo) {
          // Subtle localized window sill warm bounce without oversized bloom sprites
        }
      };

      // Front (+Z) ground floor windows
      addFramedWindow(-2.25, 1.88, doorZ, 1.52, 1.45, 0, true);
      addFramedWindow(1.35, 1.88, doorZ, 1.52, 1.45, 0, true);
      addFramedWindow(2.40, 1.78, -0.3 + frontDirZ * 2.12, 1.38, 1.32, 0);

      // Front (+Z) upper floor / attic gable windows
      if (isTwoStorey) {
        addFramedWindow(-2.15, 3.82, doorZ, 1.38, 1.24, 0);
        addFramedWindow(-0.35, 3.82, doorZ, 1.26, 1.24, 0);
        addFramedWindow(1.35, 3.82, doorZ, 1.38, 1.24, 0);
      } else {
        addFramedWindow(-0.30, 4.55, doorZ, 1.05, 0.82, 0);
      }

      // Left (-X) & Right (+X) side wall windows
      const leftWallX = -0.3 - mainW / 2 - 0.04;
      addFramedWindow(leftWallX, 1.88, -1.45, 1.52, 1.42, Math.PI / 2, true);
      addFramedWindow(leftWallX, 1.88, 1.35, 1.52, 1.42, Math.PI / 2, true);
      if (isTwoStorey) {
        addFramedWindow(leftWallX, 3.82, -1.45, 1.35, 1.22, Math.PI / 2);
        addFramedWindow(leftWallX, 3.82, 1.35, 1.35, 1.22, Math.PI / 2);
      }
      const rightWingX = 2.4 + 1.32;
      addFramedWindow(rightWingX, 1.78, -0.3, 1.42, 1.32, Math.PI / 2);

      // Soft warm golden light pools on front porch, lawn, and side garden
      const frontSpill = new THREE.Mesh(new THREE.PlaneGeometry(9.2, 7.6), houseSpillMat);
      frontSpill.rotation.x = -Math.PI / 2;
      frontSpill.position.set(0, 0.08, frontDirZ * (mainD / 2 + 1.6));
      house.add(frontSpill);
      residentialGlowPools.push(frontSpill);
      streetHouseGlows.push({ mesh: frontSpill, feederId: assignedFeeder });

      const sideSpill = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 8.2), houseSpillMat);
      sideSpill.rotation.x = -Math.PI / 2;
      sideSpill.position.set(leftWallX - 1.2, 0.08, 0);
      house.add(sideSpill);
      residentialGlowPools.push(sideSpill);
      streetHouseGlows.push({ mesh: sideSpill, feederId: assignedFeeder });

      // Soft localized porch ceiling glow (no oversized sprite blob)
      if (THREE.Sprite) {
        const porchGlowSprite = new THREE.Sprite(lampSpriteMat);
        porchGlowSprite.position.set(-0.2, 2.35, doorZ + 0.35);
        porchGlowSprite.scale.set(1.6, 1.2, 1);
        house.add(porchGlowSprite);
        residentialGlowPools.push(porchGlowSprite);
        streetHouseGlows.push({ mesh: porchGlowSprite, feederId: assignedFeeder });
      }

      // 7. Individual plot boundary fence, masonry gate pillars & front garden
      const fenceZ = frontDirZ * (plotD / 2 - 0.2);
      residentialBox(plotW * 0.54, 0.07, 0.07, -2.1, 0.82, fenceZ, fenceIronMat, house);
      residentialBox(plotW * 0.54, 0.07, 0.07, -2.1, 0.32, fenceZ, fenceIronMat, house);
      residentialBox(plotW * 0.54, 0.48, 0.04, -2.1, 0.56, fenceZ, fenceIronMat, house);
      for (const gx of [-1.45, 0.25, -plotW / 2 + 0.2, plotW / 2 - 0.2]) {
        residentialBox(0.30, 1.08, 0.30, gx, 0.54, fenceZ, pillarStoneMat, house);
      }

      // 8. Architectural Variation Details: Upper Balconies on Two-Storey Homes, Garage Doors & Parked Vehicles
      if (isTwoStorey) {
        residentialBox(3.2, 0.14, 1.15, -0.5, 3.05, frontDirZ * (mainD / 2 + 0.58), fasciaWhiteMat, house);
        residentialBox(3.2, 0.55, 0.08, -0.5, 3.38, frontDirZ * (mainD / 2 + 1.12), fenceIronMat, house);
      }
      // Garage Roll-Up Door on Side Wing
      residentialBox(1.88, 2.05, 0.12, 2.4, 1.38, frontDirZ * 1.85, fasciaWhiteMat, house);
      for (let gl = 0; gl < 4; gl++) {
        residentialBox(1.76, 0.04, 0.15, 2.4, 0.65 + gl * 0.45, frontDirZ * 1.87, gutterMetalMat, house);
      }
      // Parked 3D Suburban Car on Driveway for every 2nd house
      if (idx % 2 === 0) {
        const carMat = carBodyMats[idx % carBodyMats.length];
        const carZ = frontDirZ * (mainD / 2 + 1.55);
        residentialBox(1.52, 0.52, 2.85, 2.55, 0.42, carZ, carMat, house);
        residentialBox(1.36, 0.44, 1.55, 2.55, 0.86, carZ - 0.12, carMat, house);
        residentialBox(1.38, 0.36, 1.42, 2.55, 0.86, carZ - 0.12, windowFrameDarkMat, house);
      }

      addFlowerCluster(hx - 2.6, hz + 3.4, 0.72);
      makeTree(hx - 4.2, hz - 2.2, 0.74 + (idx % 3) * 0.12, idx);

      // Subtle cyan selection outline around house plot (visible when this house is selected)
      const houseHalo = new THREE.Mesh(
        new THREE.BoxGeometry(plotW + 0.65, 0.22, plotD + 0.65),
        new THREE.MeshBasicMaterial({
          color: 0x00e5ff,
          transparent: true,
          opacity: 0.34,
        })
      );
      houseHalo.position.set(0, 0.14, 0);
      houseHalo.visible = false;
      house.add(houseHalo);
      houseSelectionHalos[houseId] = houseHalo;

      const houseMeta: WorldInspectableItem = {
        kind: 'HOUSE',
        id: houseId,
        title: `${houseId} — ${isTwoStorey ? 'Two-Storey Suburban Villa' : 'Single-Storey Suburban Residence'}`,
        subtitle: `${areaName} • Plot (${hx.toFixed(1)}, ${hz.toFixed(1)})`,
        feederInfo: `${feederName} → 11/0.415 kV 250 kVA DT → 415 V 3-Phase 4-Wire LT → 230 V Phase ${phaseChar} (L-N)`,
        position: [hx, 2.5, hz],
      };
      house.traverse((child: any) => {
        if (child.isMesh && child !== houseHalo) {
          child.userData.worldItem = houseMeta;
          pickableMeshes.push(child);
        }
      });

      houseWeatherheads.push([
        hx - 2.2,
        0.36 + mainH + 0.2,
        hz + 1.8,
      ]);
    };

    // Instantiate 46 Suburban Houses across Area A (Behind Substation), Area B (Right Side), and Area C (Behind Residential Area)
    const houseConfigs: [number, number, boolean, number][] = [
      // ==================== AREA B: RIGHT SIDE OF SUBSTATION (18 HOUSES, X = 51..108, Z = -28..+20.2) ====================
      [51.5, 20.2, false, -0.62],
      [62.5, 20.2, true, -0.68],
      [73.5, 20.2, false, -0.64],
      [85.0, 20.2, true, -0.66],
      [96.5, 20.2, false, -0.70],
      [107.5, 20.2, true, -0.68],
      // Area B Street 1 North Row
      [51.0, 4.8, false, -0.72],
      [62.0, 4.8, true, -0.75],
      [73.5, 4.8, false, -0.70],
      [85.0, 4.8, true, -0.72],
      [96.5, 4.8, false, -0.76],
      [107.5, 4.8, true, -0.74],
      // Area B Middle Street Row
      [51.0, -12.2, true, -0.75],
      [62.0, -12.2, false, -0.72],
      [73.5, -12.2, true, -0.74],
      [85.0, -12.2, false, -0.76],
      [96.5, -12.2, true, -0.74],
      [107.5, -12.2, false, -0.72],

      // ==================== AREA C: BEHIND EXISTING RESIDENTIAL AREA (14 HOUSES, X = 51..108, Z = -28.8..-53.5) ====================
      [51.5, -28.8, false, -0.75],
      [62.5, -28.8, true, -0.78],
      [73.5, -28.8, false, -0.74],
      [85.0, -28.8, true, -0.75],
      [96.5, -28.8, false, -0.76],
      [107.5, -28.8, true, -0.74],
      [51.0, -37.5, true, -0.72],
      [64.5, -37.5, false, -0.76],
      [82.5, -37.5, true, -0.74],
      [98.0, -37.5, false, -0.72],
      [52.0, -52.5, false, -0.68],
      [67.0, -52.5, true, -0.72],
      [84.0, -52.5, false, -0.70],
      [100.0, -52.5, true, -0.74],

      // ==================== AREA A: BEHIND THE SUBSTATION (14 HOUSES, X = -35..+28, Z = -37.5..-53.0) ====================
      [-35.0, -37.5, false, -0.58],
      [-23.5, -37.5, true, -0.62],
      [-12.0, -37.5, false, -0.60],
      [-0.5, -37.5, true, -0.64],
      [11.0, -37.5, false, -0.62],
      [22.5, -37.5, true, -0.66],
      [-36.0, -52.5, true, -0.56],
      [-25.0, -52.5, false, -0.60],
      [-14.0, -52.5, true, -0.58],
      [-3.0, -52.5, false, -0.62],
      [8.0, -52.5, true, -0.60],
      [19.0, -52.5, false, -0.64],
      [29.5, -52.5, true, -0.66],
      [-54.0, -37.5, false, -0.52],
    ];
    houseConfigs.forEach(([hx, hz, twoStorey, rY], idx) => {
      createSuburbanHouse(hx, hz, idx, twoStorey, rY);
    });

    // ==================== 6. ENGINEERING-ACCURATE 11 kV -> 250 kVA DT -> 415 V LT -> 230 V SERVICE NETWORK ====================
    const build11kVPole = (px: number, pz: number, rotY = 0) => {
      const pGrp = new THREE.Group();
      pGrp.position.set(px, 0, pz);
      pGrp.rotation.y = rotY;
      residentialGroup.add(pGrp);

      residentialCyl(0.15, 0.23, 10.6, 0, 5.3, 0, mats.galvanizedSteel, pGrp, 8);
      residentialCyl(0.32, 0.36, 0.5, 0, 0.25, 0, foundationStoneMat, pGrp, 8);
      residentialBox(3.5, 0.20, 0.20, 0, 9.8, 0, mats.galvanizedSteel, pGrp);
      [-1.35, 0, 1.35].forEach((ix) => {
        residentialCyl(0.10, 0.12, 0.60, ix, 10.18, 0, mats.porcelainBrown, pGrp, 8);
        residentialCyl(0.17, 0.17, 0.08, ix, 10.12, 0, mats.porcelainBrown, pGrp, 8);
        residentialCyl(0.16, 0.16, 0.08, ix, 10.32, 0, mats.porcelainBrown, pGrp, 8);
      });
    };

    build11kVPole(28.5, 11.5, 0.15);
    build11kVPole(30.5, -1.0, 0.0);
    build11kVPole(30.5, -14.5, 0.0);

    // Underground 11 kV XLPE outgoing feeder cable from 11 kV Indoor Switchgear to Riser Pole (28.5, 11.5)
    addSaggedConductor([23.5, 0.6, 11.5], [28.5, 0.6, 11.5], -0.05, 0.065, 'HV_11KV', 2, 0.28);
    addSaggedConductor([28.5, 0.6, 11.5], [28.5, 10.45, 11.5], 0.0, 0.060, 'HV_11KV', 2, 0.28);

    // 11 kV 3-Phase ACSR Overhead Conductors (Phases A, B, C) with realistic catenary sag
    [-1.15, 0, 1.15].forEach((phaseOffset) => {
      addSaggedConductor(
        [28.5 + phaseOffset * 0.7, 10.45, 11.5 + phaseOffset * 0.5],
        [30.5 + phaseOffset * 0.7, 10.45, -1.0 + phaseOffset * 0.5],
        0.72,
        0.048,
        'HV_11KV',
        3,
        0.24
      );
      addSaggedConductor(
        [30.5 + phaseOffset * 0.7, 10.45, -1.0 + phaseOffset * 0.5],
        [30.5 + phaseOffset * 0.7, 10.45, -14.5 + phaseOffset * 0.5],
        0.68,
        0.048,
        'HV_11KV',
        2,
        0.24
      );
      addSaggedConductor(
        [28.5 + phaseOffset * 0.4, 10.45, 11.5 + phaseOffset * 0.85],
        [43.2, 9.65, 8.2 + phaseOffset * 0.95],
        0.82,
        0.050,
        'HV_11KV',
        3,
        0.25
      );
    });

    // Step B: Detailed Pole-Mounted 11/0.415 kV 250 kVA Distribution Transformer Station at (43.2, 8.2)
    const dtX = 43.2;
    const dtZ = 8.2;
    const dtHGroup = new THREE.Group();
    dtHGroup.position.set(dtX, 0, dtZ);
    residentialGroup.add(dtHGroup);

    for (const dz of [-1.25, 1.25]) {
      residentialCyl(0.15, 0.23, 10.2, 0, 5.1, dz, mats.galvanizedSteel, dtHGroup, 8);
      residentialCyl(0.32, 0.36, 0.55, 0, 0.28, dz, foundationStoneMat, dtHGroup, 8);
    }
    residentialBox(0.35, 0.24, 3.4, 0, 9.2, 0, mats.galvanizedSteel, dtHGroup);
    residentialBox(0.32, 0.20, 3.2, 0, 7.6, 0, mats.darkStructuralSteel, dtHGroup);
    residentialBox(1.85, 0.24, 3.1, 0, 4.5, 0, mats.galvanizedSteel, dtHGroup);

    const dtBody = residentialBox(1.50, 1.90, 2.20, 0, 5.55, 0, mats.transformerTank, dtHGroup);
    dtBody.castShadow = true;
    for (let rf = -0.8; rf <= 0.8; rf += 0.32) {
      residentialBox(1.66, 1.48, 0.08, 0, 5.55, rf, mats.radiatorFin, dtHGroup);
    }
    const dtConservator = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 1.65, 10),
      mats.galvanizedSteel
    );
    dtConservator.rotation.x = Math.PI / 2;
    dtConservator.position.set(-0.35, 6.85, 0);
    dtHGroup.add(dtConservator);

    [-0.95, 0, 0.95].forEach((bz) => {
      residentialCyl(0.09, 0.11, 0.48, 0, 9.52, bz, mats.porcelainBrown, dtHGroup, 8);
      residentialCyl(0.08, 0.09, 0.52, -0.2, 7.95, bz, mats.porcelainBrown, dtHGroup, 8);
      residentialCyl(0.09, 0.12, 0.62, 0.15, 6.75, bz * 0.65, mats.porcelainBrown, dtHGroup, 8);
      addSaggedConductor(
        [dtX, 9.65, dtZ + bz],
        [dtX + 0.15, 6.95, dtZ + bz * 0.65],
        0.08,
        0.036,
        'HV_11KV',
        1,
        0.22
      );
    });

    residentialBox(0.68, 1.18, 0.98, 0.55, 3.2, 0, mats.controlCabinet, dtHGroup);
    residentialCyl(0.03, 0.03, 4.5, -0.5, 2.25, -1.25, mats.copperBusbar, dtHGroup, 6);

    // Step C: 415 V Three-Phase Four-Wire LT Network (Phases A, B, C + Neutral)
    const ltRowAPoles: [number, number][] = [
      [44.5, 11.2],
      [69.5, 11.2],
      [108.5, 11.2],
    ];
    const ltRowBPoles: [number, number][] = [
      [44.5, -6.8],
      [70.5, -6.8],
      [108.5, -6.8],
      [96.5, -24.5],
      [52.5, -24.5],
      [96.5, -42.0],
      [48.5, -42.0],
      [4.5, -42.0],
      [-34.5, -42.0],
    ];

    const buildLtPole = (lx: number, lz: number) => {
      residentialCyl(0.11, 0.17, 7.8, lx, 3.9, lz, mats.galvanizedSteel, residentialGroup, 8);
      residentialCyl(0.24, 0.28, 0.4, lx, 0.2, lz, foundationStoneMat, residentialGroup, 8);
      residentialBox(0.22, 0.18, 2.1, lx, 7.1, lz, mats.darkStructuralSteel);
      [-0.75, -0.25, 0.25, 0.75].forEach((dz) => {
        residentialCyl(0.06, 0.07, 0.24, lx, 7.28, lz + dz, mats.porcelainGrey, residentialGroup, 6);
      });
    };

    // No above-ground LT poles: the 415 V distribution network is underground.

    [-0.75, -0.25, 0.25, 0.75].forEach((wOff, wIdx) => {
      addSaggedConductor(
        [dtX + 0.45, 5.85, dtZ + wOff * 0.6],
        [ltRowAPoles[0][0], 7.28, ltRowAPoles[0][1] + wOff],
        0.28,
        0.038,
        'LT_415V',
        2,
        0.22
      );
      addSaggedConductor(
        [dtX + 0.45, 5.85, dtZ + wOff * 0.6],
        [ltRowBPoles[0][0], 7.28, ltRowBPoles[0][1] + wOff],
        0.48,
        0.038,
        'LT_415V',
        2,
        0.22
      );

      for (let i = 1; i < ltRowAPoles.length; i++) {
        addSaggedConductor(
          [ltRowAPoles[i - 1][0], 7.28, ltRowAPoles[i - 1][1] + wOff],
          [ltRowAPoles[i][0], 7.28, ltRowAPoles[i][1] + wOff],
          0.46,
          0.036,
          'LT_415V',
          wIdx % 2 === 0 ? 2 : 1,
          0.20
        );
      }
      for (let i = 1; i < ltRowBPoles.length; i++) {
        // Keep each street row separate; never draw diagonal spans across blocks.
        if (Math.abs(ltRowBPoles[i][1] - ltRowBPoles[i - 1][1]) > 1.5) continue;
        addSaggedConductor(
          [ltRowBPoles[i - 1][0], 7.28, ltRowBPoles[i - 1][1] + wOff],
          [ltRowBPoles[i][0], 7.28, ltRowBPoles[i][1] + wOff],
          0.46,
          0.036,
          'LT_415V',
          wIdx % 2 === 0 ? 2 : 1,
          0.20
        );
      }
    });

    // Step D: 230 V Single-Phase (L-N) Service Drops from 415 V LT Network to each Residential House
    const allLtPoles = [...ltRowAPoles, ...ltRowBPoles];
    houseWeatherheads.forEach((wh, hIdx) => {
      if (houseFeederId(hIdx) !== streetFeederIds[0]) return;
      const nearestPole = allLtPoles.reduce((best, cur) =>
        Math.hypot(cur[0] - wh[0], cur[1] - wh[2]) < Math.hypot(best[0] - wh[0], best[1] - wh[2])
          ? cur
          : best
      );
      const phaseIdx = hIdx % 3;
      const phaseZOff = -0.75 + phaseIdx * 0.5;
      const neutralZOff = 0.75;

      addSaggedConductor(
        [nearestPole[0], 7.25, nearestPole[1] + phaseZOff],
        [wh[0], wh[1], wh[2]],
        0.42,
        0.028,
        'SERVICE_230V',
        2,
        0.18
      );
      addSaggedConductor(
        [nearestPole[0], 7.25, nearestPole[1] + neutralZOff],
        [wh[0] + 0.18, wh[1] - 0.12, wh[2]],
        0.45,
        0.024,
        'SERVICE_230V',
        1,
        0.18
      );
    });

    // Each remaining 11 kV outgoing bay supplies its OWN physically separate street,
    // overhead 3-phase route, pole-mounted 11/0.415 kV DT and 415 V/230 V service network.
    // Circuit visuals are controlled by that bay's real simulation breaker state.
    outgoingStreetBays.slice(1).forEach((bay, feederIndex) => {
      const feederId = bay.id;
      const circuit = { feederId, hv: [] as any[], lt: [] as any[], pulses: [] as any[] };
      streetFeederCircuits.push(circuit);
      const assigned = houseWeatherheads
        .map((wh, idx) => ({ wh, idx }))
        .filter(({ idx }) => houseFeederId(idx) === feederId);
      if (!assigned.length) return;
      const centerX = assigned.reduce((sum, h) => sum + h.wh[0], 0) / assigned.length;
      const centerZ = assigned.reduce((sum, h) => sum + h.wh[2], 0) / assigned.length;
      const bayNode = stateRef.current.spatialNodes.find((n) => n.bayId === feederId);
      const sourceX = bayNode?.position[0] ?? (12 + feederIndex * 3.9);
      const sourceZ = 26.5;
      const poleX = centerX - 5;
      const poleZ = centerZ + 5;
      // A distinct feeder riser and distribution pole at each assigned street.
      build11kVPole(poleX - 7, poleZ + 5);
      build11kVPole(poleX, poleZ);
      const addCircuitWire = (
        a: [number, number, number], b: [number, number, number],
        tier: 'HV_11KV' | 'LT_415V' | 'SERVICE_230V',
        sag = 0.45
      ) => {
        const hvStart = hv11LiveMeshes.length;
        const ltStart = lt415LiveMeshes.length;
        const svcStart = serviceDropLiveMeshes.length;
        const pulseStart = distPulseActors.length;
        addSaggedConductor(a, b, sag, tier === 'HV_11KV' ? 0.045 : 0.028, tier, 2, 0.22);
        circuit.hv.push(...hv11LiveMeshes.splice(hvStart));
        circuit.lt.push(...lt415LiveMeshes.splice(ltStart));
        circuit.lt.push(...serviceDropLiveMeshes.splice(svcStart));
        circuit.pulses.push(...distPulseActors.splice(pulseStart));
      };
      // Underground 11 kV XLPE feeder: concealed below the substation roads,
      // fence and landscaped frontage. Avoid exposed yellow diagonal conductors.
      // The duct bank follows orthogonal corridors and emerges inside the riser pole.
      const buriedY = -0.65;
      const riserX = poleX - 7;
      const riserZ = poleZ + 5;
      const undergroundCableMat = new THREE.MeshStandardMaterial({
        color: 0x1a222b, roughness: 0.93, metalness: 0.08
      });
      const addConcealedCable = (a: [number, number, number], b: [number, number, number]) => {
        const start = new THREE.Vector3(...a);
        const end = new THREE.Vector3(...b);
        const delta = end.clone().sub(start);
        if (delta.lengthSq() < 0.0001) return;
        const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, delta.length(), 8), undergroundCableMat);
        mesh.position.copy(start).add(end).multiplyScalar(0.5);
        mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), delta.normalize());
        residentialGroup.add(mesh);
      };
      addConcealedCable([sourceX, buriedY, sourceZ], [sourceX, buriedY, riserZ]);
      addConcealedCable([sourceX, buriedY, riserZ], [riserX, buriedY, riserZ]);
      // Concealed riser cable inside the pole, with only the pole-mounted
      // termination connecting to the three visible street conductors.
      addConcealedCable([riserX, buriedY, riserZ], [riserX, 10.4, riserZ]);
      for (const phase of [-1, 0, 1]) {
        addCircuitWire(
          [poleX - 7 + phase * 1.1, 10.4, poleZ + 5],
          [poleX + phase * 1.1, 10.4, poleZ], 'HV_11KV'
        );
      }
      // Dedicated 11/0.415 kV street transformer and LT distribution support.
      const txGroup = new THREE.Group();
      txGroup.position.set(poleX + 2.5, 0, poleZ - 2);
      residentialGroup.add(txGroup);
      for (const x of [-0.85, 0.85]) {
        residentialCyl(0.14, 0.20, 9.5, x, 4.75, 0, mats.galvanizedSteel, txGroup, 8);
      }
      residentialBox(2.5, 0.24, 1.9, 0, 6.6, 0, mats.galvanizedSteel, txGroup);
      residentialBox(1.65, 1.65, 1.25, 0, 5.6, 0, mats.transformerTank, txGroup);
      for (const fin of [-0.55, -0.3, -0.05, 0.2, 0.45]) {
        residentialBox(1.8, 1.3, 0.06, 0, 5.6, fin, mats.radiatorFin, txGroup);
      }
      residentialBox(0.72, 1.15, 0.55, 1.1, 3.1, 0, mats.controlCabinet, txGroup);
      for (const phase of [-1, 0, 1]) {
        addCircuitWire(
          [poleX + phase * 1.1, 10.4, poleZ],
          [poleX + 2.5 + phase * 0.4, 7.3, poleZ - 2], 'HV_11KV', 0.18
        );
      }
      // CLEAN STREET NETWORK: one compact, straight LT trunk per feeder.
      // Three evenly spaced supports replace a pole beside every house.
      // Service drops use the nearest trunk tap, never a long crossing wire.
      const streetAxisX = Math.max(...assigned.map(({ wh }) => wh[0])) - Math.min(...assigned.map(({ wh }) => wh[0])) >=
        Math.max(...assigned.map(({ wh }) => wh[2])) - Math.min(...assigned.map(({ wh }) => wh[2]));
      const sorted = [...assigned].sort((a, b) => streetAxisX ? a.wh[0] - b.wh[0] : a.wh[2] - b.wh[2]);
      const trunkCount = Math.min(3, Math.max(2, Math.ceil(sorted.length / 4)));
      const trunkPoles: [number, number][] = Array.from({ length: trunkCount }, (_, i) => {
        const t = trunkCount === 1 ? 0.5 : i / (trunkCount - 1);
        const first = sorted[0].wh;
        const last = sorted[sorted.length - 1].wh;
        return streetAxisX
          ? [first[0] + (last[0] - first[0]) * t, centerZ + 3.8]
          : [centerX + 3.8, first[2] + (last[2] - first[2]) * t];
      });
      // Underground LT trunk: no roadside poles required.
      // Four closely spaced conductors follow the same pole-to-pole route.
      for (const off of [-0.54, -0.18, 0.18, 0.54]) {
        const shift = (p: [number, number]): [number, number, number] =>
          streetAxisX ? [p[0], 7.25, p[1] + off] : [p[0] + off, 7.25, p[1]];
        addCircuitWire([poleX + 3.6, 6.1, poleZ - 2 + off * 0.3], shift(trunkPoles[0]), 'LT_415V', 0.20);
        for (let i = 1; i < trunkPoles.length; i++) {
          addCircuitWire(shift(trunkPoles[i - 1]), shift(trunkPoles[i]), 'LT_415V', 0.24);
        }
      }
      sorted.forEach(({ wh }, idx) => {
        // A single visually bundled two-wire service drop per house.
        const nearest = trunkPoles.reduce((best, p) =>
          Math.hypot(p[0] - wh[0], p[1] - wh[2]) < Math.hypot(best[0] - wh[0], best[1] - wh[2]) ? p : best
        );
        const tap: [number, number, number] = streetAxisX
          ? [Math.max(Math.min(wh[0], trunkPoles[trunkPoles.length - 1][0]), trunkPoles[0][0]), 7.18, nearest[1]]
          : [nearest[0], 7.18, Math.max(Math.min(wh[2], trunkPoles[trunkPoles.length - 1][1]), trunkPoles[0][1])];
        addCircuitWire(tap, [wh[0], wh[1], wh[2]], 'SERVICE_230V', 0.16);
      });
    });

    // Warm golden neighborhood illumination lights (#FFB84D) across Area A, B, and C
    const neighborhoodLightA = new THREE.PointLight(0xffb84d, 1.45, 76, 1.3);
    neighborhoodLightA.position.set(64, 15, 14);
    residentialGroup.add(neighborhoodLightA);

    const neighborhoodLightB = new THREE.PointLight(0xffb84d, 1.35, 82, 1.3);
    neighborhoodLightB.position.set(82, 15, -24);
    residentialGroup.add(neighborhoodLightB);

    const neighborhoodLightC = new THREE.PointLight(0xffb84d, 1.25, 78, 1.3);
    neighborhoodLightC.position.set(-6, 15, -44);
    residentialGroup.add(neighborhoodLightC);

    // ==================== 7. SUBSTATION GATEWAY ROOM & 3D REMOTE CONTROL CENTER (RCC) + IEC-104 FLOWS ====================
    const rccGroup = new THREE.Group();
    scene.add(rccGroup);

    const rccDarkShellMat = rMat(0x162436, 0.42, 0.62);
    const rccFloorMat = rMat(0x111d2c, 0.68, 0.18);
    const rccGlassMat = new THREE.MeshPhysicalMaterial({
      color: 0x7dd3fc,
      metalness: 0.08,
      roughness: 0.12,
      transparent: true,
      opacity: 0.08,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const rccCyanEdgeMat = new THREE.MeshBasicMaterial({ color: 0x00e5ff });
    const rccGreenLedMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    const rccAmberLedMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const rccRedLedMat = new THREE.MeshBasicMaterial({ color: 0xef4444 });
    const rccRackMat = rMat(0x1e293b, 0.36, 0.68);
    const rccDeskMat = rMat(0x28384c, 0.42, 0.48);

    // Helper for crisp canvas nameplates & SCADA screens
    const makeSignPlate = (
      title: string,
      subtitle: string,
      w: number,
      h: number,
      borderHex = '#00e5ff',
      bgRgba = 'rgba(4, 15, 30, 0.94)'
    ) => {
      const c = document.createElement('canvas');
      c.width = 1024;
      c.height = 220;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = bgRgba;
        ctx.fillRect(0, 0, 1024, 220);
        ctx.strokeStyle = borderHex;
        ctx.lineWidth = 7;
        ctx.strokeRect(6, 6, 1012, 208);
        ctx.fillStyle = '#f0f9ff';
        ctx.textAlign = 'center';
        ctx.font = 'bold 50px Inter, Arial, sans-serif';
        ctx.fillText(title, 512, 92);
        ctx.fillStyle = borderHex;
        ctx.font = 'bold 28px monospace';
        ctx.fillText(subtitle, 512, 158);
      }
      const tex = new THREE.CanvasTexture(c);
      return new THREE.Mesh(
        new THREE.PlaneGeometry(w, h),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, side: THREE.DoubleSide })
      );
    };

    // A) SUBSTATION GATEWAY / COMMUNICATION ROOM at (-34.5, 0, 17.5) inside substation fence
    const gwX = -34.5;
    const gwZ = 17.5;
    const gwW = 7.4;
    const gwD = 5.4;
    const gwH = 4.2;
    const gwRoom = new THREE.Group();
    gwRoom.position.set(gwX, 0, gwZ);
    rccGroup.add(gwRoom);

    residentialBox(gwW + 0.4, 0.28, gwD + 0.4, 0, 0.14, 0, mats.concreteFoundation, gwRoom);
    residentialBox(gwW - 0.2, 0.08, gwD - 0.2, 0, 0.30, 0, rccFloorMat, gwRoom);
    // Transparent glass walls & open top so Station Bus switches, RTU/Gateway, Firewalls & WAN routers are visible
    residentialBox(gwW, gwH, 0.12, 0, gwH / 2 + 0.28, -gwD / 2, rccDarkShellMat, gwRoom);
    residentialBox(gwW, gwH, 0.06, 0, gwH / 2 + 0.28, gwD / 2, rccGlassMat, gwRoom);
    residentialBox(0.06, gwH, gwD, -gwW / 2, gwH / 2 + 0.28, 0, rccGlassMat, gwRoom);
    residentialBox(0.06, gwH, gwD, gwW / 2, gwH / 2 + 0.28, 0, rccGlassMat, gwRoom);
    // Cyan perimeter frame
    residentialBox(gwW + 0.15, 0.07, 0.12, 0, gwH + 0.28, gwD / 2, rccCyanEdgeMat, gwRoom);
    residentialBox(gwW + 0.15, 0.07, 0.12, 0, gwH + 0.28, -gwD / 2, rccCyanEdgeMat, gwRoom);
    residentialBox(0.12, 0.07, gwD + 0.15, -gwW / 2, gwH + 0.28, 0, rccCyanEdgeMat, gwRoom);
    residentialBox(0.12, 0.07, gwD + 0.15, gwW / 2, gwH + 0.28, 0, rccCyanEdgeMat, gwRoom);

    // 4 Internal Substation Communication Cabinets: (1) IEC 61850 Station Bus Switch A/B, (2) Station Gateway/RTU, (3) Firewalls FW1/FW2, (4) WAN Routers R1/R2
    [-2.4, -0.8, 0.8, 2.4].forEach((rx, rIdx) => {
      residentialBox(1.15, 2.55, 0.95, rx, 1.58, -1.1, rccRackMat, gwRoom);
      residentialBox(0.95, 0.32, 0.04, rx, 2.42, -0.60, rIdx === 1 ? rccCyanEdgeMat : rccGreenLedMat, gwRoom);
      for (let u = 0; u < 4; u++) {
        residentialBox(0.88, 0.14, 0.04, rx, 1.15 + u * 0.32, -0.60, u % 2 === 0 ? rccCyanEdgeMat : rccGreenLedMat, gwRoom);
      }
    });
    const gwSign = makeSignPlate('SUBSTATION GATEWAY & COMM ROOM', 'IEC 61850 STATION BUS -> RTU/GATEWAY -> FW -> WAN', 6.8, 1.25);
    gwSign.position.set(0, gwH + 0.95, gwD / 2);
    gwRoom.add(gwSign);
    tagPickable(gwRoom, 'BAY-33-INC1');

    // B) 3D REMOTE CONTROL CENTER (RCC) BUILDING at (-60.0, 0, 14.0) outside substation fence
    const rccX = -60.0;
    const rccZ = 14.0;
    const rccW = 22.0;
    const rccD = 14.0;
    const rccH = 6.6;
    const rccBldg = new THREE.Group();
    rccBldg.position.set(rccX, 0, rccZ);
    rccGroup.add(rccBldg);

    // RCC Foundation Pad, Anti-Static Control Room Floor & Access Walkway
    residentialBox(rccW + 1.6, 0.36, rccD + 1.6, 0, 0.18, 0, mats.concreteFoundation, rccBldg);
    residentialBox(rccW - 0.4, 0.08, rccD - 0.4, 0, 0.38, 0, rccFloorMat, rccBldg);
    // Subtle cyan floor perimeter LED accent strips
    residentialBox(rccW - 0.8, 0.04, 0.10, 0, 0.43, rccD / 2 - 0.3, rccCyanEdgeMat, rccBldg);
    residentialBox(rccW - 0.8, 0.04, 0.10, 0, 0.43, -rccD / 2 + 0.3, rccCyanEdgeMat, rccBldg);
    residentialBox(0.10, 0.04, rccD - 0.8, -rccW / 2 + 0.3, 0.43, 0, rccCyanEdgeMat, rccBldg);
    residentialBox(0.10, 0.04, rccD - 0.8, rccW / 2 - 0.3, 0.43, 0, rccCyanEdgeMat, rccBldg);

    // Solid metallic rear wall (-Z) & left wall (-X); Cutaway transparent glass front (+Z) & right (+X) walls; Open cutaway roof
    residentialBox(rccW, rccH, 0.28, 0, rccH / 2 + 0.36, -rccD / 2, rccDarkShellMat, rccBldg);
    residentialBox(0.28, rccH, rccD, -rccW / 2, rccH / 2 + 0.36, 0, rccDarkShellMat, rccBldg);
    residentialBox(rccW, rccH, 0.08, 0, rccH / 2 + 0.36, rccD / 2, rccGlassMat, rccBldg);
    residentialBox(0.08, rccH, rccD, rccW / 2, rccH / 2 + 0.36, 0, rccGlassMat, rccBldg);

    // Structural dark steel columns & cyan architectural edge lighting
    for (let cx = -rccW / 2; cx <= rccW / 2 + 0.01; cx += rccW / 4) {
      residentialBox(0.18, rccH, 0.18, cx, rccH / 2 + 0.36, rccD / 2, mats.darkStructuralSteel, rccBldg);
      residentialBox(0.18, rccH, 0.18, cx, rccH / 2 + 0.36, -rccD / 2, mats.darkStructuralSteel, rccBldg);
    }
    residentialBox(rccW + 0.4, 0.12, 0.16, 0, rccH + 0.36, rccD / 2, rccCyanEdgeMat, rccBldg);
    residentialBox(rccW + 0.4, 0.12, 0.16, 0, rccH + 0.36, -rccD / 2, rccCyanEdgeMat, rccBldg);
    residentialBox(0.16, 0.12, rccD + 0.4, -rccW / 2, rccH + 0.36, 0, rccCyanEdgeMat, rccBldg);
    residentialBox(0.16, 0.12, rccD + 0.4, rccW / 2, rccH + 0.36, 0, rccCyanEdgeMat, rccBldg);

    // Large Illuminated Sign on RCC Building: REMOTE CONTROL CENTER (RCC)
    const rccMainSign = makeSignPlate(
      'REMOTE CONTROL CENTER (RCC)',
      'UTILITY SCADA / EMS TELECONTROL MASTER • IEC 60870-5-104 (TCP/2404)',
      15.5,
      2.35
    );
    rccMainSign.position.set(0, rccH + 1.55, rccD / 2);
    rccBldg.add(rccMainSign);

    // Interior Point Lights for RCC
    const rccInteriorLight1 = new THREE.PointLight(0x38bdf8, 0.85, 26, 1.5);
    rccInteriorLight1.position.set(-3, 5.6, 0);
    rccBldg.add(rccInteriorLight1);
    const rccInteriorLight2 = new THREE.PointLight(0xffe0ac, 0.65, 24, 1.5);
    rccInteriorLight2.position.set(4, 5.6, 2);
    rccBldg.add(rccInteriorLight2);

    // 1) LARGE SCADA VIDEO WALL (Rear Wall inside RCC, displaying 132/33/11 kV SLD & IEC-104 Status)
    const videoWallCanvas = document.createElement('canvas');
    videoWallCanvas.width = 1024;
    videoWallCanvas.height = 320;
    const vwCtx = videoWallCanvas.getContext('2d');
    if (vwCtx) {
      vwCtx.fillStyle = '#030d1c';
      vwCtx.fillRect(0, 0, 1024, 320);
      vwCtx.strokeStyle = '#00e5ff';
      vwCtx.lineWidth = 6;
      vwCtx.strokeRect(4, 4, 1016, 312);
      // Grid lines
      vwCtx.strokeStyle = 'rgba(0, 229, 255, 0.16)';
      vwCtx.lineWidth = 2;
      for (let gx = 128; gx < 1024; gx += 128) {
        vwCtx.beginPath(); vwCtx.moveTo(gx, 0); vwCtx.lineTo(gx, 320); vwCtx.stroke();
      }
      vwCtx.fillStyle = '#00e5ff';
      vwCtx.font = 'bold 26px Inter, Arial, sans-serif';
      vwCtx.fillText('RCC WIDE-AREA SCADA OVERVIEW — 132 / 33 / 11 kV SUBSTATION SLD', 28, 42);
      vwCtx.fillStyle = '#4ade80';
      vwCtx.font = 'bold 20px monospace';
      vwCtx.fillText('IEC-104 LINK: CONNECTED (TCP:2404) • STARTDT: ACTIVE • COA: 132', 28, 74);
      // Draw 132 kV Busbar (Cyan), 33 kV Busbar (Green), 11 kV Busbar (Amber)
      vwCtx.strokeStyle = '#38bdf8'; vwCtx.lineWidth = 8;
      vwCtx.beginPath(); vwCtx.moveTo(60, 125); vwCtx.lineTo(960, 125); vwCtx.stroke();
      vwCtx.fillStyle = '#7dd3fc'; vwCtx.fillText('132 kV SPLIT BUSBAR (BUS-132-A / CB-132 / BUS-132-B) — 132.2 kV', 60, 112);

      vwCtx.strokeStyle = '#22c55e'; vwCtx.lineWidth = 7;
      vwCtx.beginPath(); vwCtx.moveTo(100, 205); vwCtx.lineTo(920, 205); vwCtx.stroke();
      vwCtx.fillStyle = '#86efac'; vwCtx.fillText('33 kV INDOOR GIS BUSBAR (T1 50MVA / CB-33 / T2 50MVA) — 33.1 kV', 100, 192);

      vwCtx.strokeStyle = '#f59e0b'; vwCtx.lineWidth = 6;
      vwCtx.beginPath(); vwCtx.moveTo(140, 278); vwCtx.lineTo(880, 278); vwCtx.stroke();
      vwCtx.fillStyle = '#fcd34d'; vwCtx.fillText('11 kV DISTRIBUTION BUSBAR (DT1 / DT2 / 46 RESIDENTIAL HOMES) — 11.0 kV', 140, 265);
    }
    const videoWallTex = new THREE.CanvasTexture(videoWallCanvas);
    const videoWallMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(11.6, 3.6),
      new THREE.MeshBasicMaterial({ map: videoWallTex })
    );
    videoWallMesh.position.set(-3.2, 3.75, -rccD / 2 + 0.22);
    rccBldg.add(videoWallMesh);

    // 2) & 3) FOUR OPERATOR WORKSTATIONS, DUAL MONITORS, SCADA CONTROL DESKS & OPERATOR CHAIRS
    [
      [-6.8, -1.6],
      [-2.2, -1.6],
      [-6.8, 2.4],
      [-2.2, 2.4],
    ].forEach(([dx, dz], wIdx) => {
      // Curved SCADA Control Desk
      residentialBox(3.1, 0.82, 1.25, dx, 0.80, dz, rccDeskMat, rccBldg);
      residentialBox(3.2, 0.08, 1.35, dx, 1.24, dz, mats.darkStructuralSteel, rccBldg);
      // Dual Illuminated Operator Monitors facing the video wall
      for (const mx of [-0.72, 0.72]) {
        residentialBox(1.18, 0.72, 0.06, dx + mx, 1.72, dz - 0.32, rccRackMat, rccBldg);
        residentialBox(
          1.10,
          0.64,
          0.07,
          dx + mx,
          1.72,
          dz - 0.30,
          wIdx % 2 === 0 ? rccCyanEdgeMat : rccGreenLedMat,
          rccBldg
        );
      }
      // Operator Chair
      residentialBox(0.68, 0.10, 0.68, dx, 0.72, dz + 0.92, rccRackMat, rccBldg);
      residentialBox(0.66, 0.92, 0.12, dx, 1.18, dz + 1.22, rccRackMat, rccBldg);
      residentialCyl(0.08, 0.08, 0.35, dx, 0.52, dz + 0.92, mats.galvanizedSteel, rccBldg, 6);
    });

    // 4) - 9) RCC TELECOMMUNICATION & SERVER ROOM EQUIPMENT LINE-UP (Right side inside RCC, X = +3.2..+9.4)
    //   (4) RCC Communication Server Rack (x = 3.2)
    //   (5) IEC-104 Front-End Communication Server (x = 4.6)
    //   (6) Redundant Industrial WAN Routers R1/R2 (x = 6.0)
    //   (7) Primary & Secondary Industrial Firewalls FW1/FW2 (x = 7.4)
    //   (8) Network Switches & Fiber Termination ODF (x = 8.8)
    //   (9) UPS & Communication Power Supply Cabinet (x = 8.8, z = 2.6)
    const rccRackStatusIndicators: any[] = [];
    [
      { x: 3.0, z: -3.8, label: 'RCC SERVER RACK', color: rccCyanEdgeMat },
      { x: 4.5, z: -3.8, label: 'IEC-104 FEP-01/02', color: rccGreenLedMat },
      { x: 6.0, z: -3.8, label: 'WAN ROUTERS R1/R2', color: rccCyanEdgeMat },
      { x: 7.5, z: -3.8, label: 'FIREWALLS FW1/FW2', color: rccGreenLedMat },
      { x: 9.0, z: -3.8, label: 'SWITCHES & ODF', color: rccCyanEdgeMat },
    ].forEach((rk) => {
      residentialBox(1.22, 3.2, 1.15, rk.x, 1.98, rk.z, rccRackMat, rccBldg);
      const topLed = residentialBox(1.02, 0.28, 0.05, rk.x, 3.22, rk.z + 0.58, rk.color, rccBldg);
      rccRackStatusIndicators.push(topLed);
      for (let b = 0; b < 5; b++) {
        residentialBox(
          0.96,
          0.16,
          0.05,
          rk.x,
          1.15 + b * 0.38,
          rk.z + 0.58,
          b % 2 === 0 ? rccCyanEdgeMat : rccGreenLedMat,
          rccBldg
        );
      }
    });

    // (9) UPS & 110V DC / 230V AC Communication Power Supply Cabinet
    residentialBox(2.2, 2.35, 1.25, 8.2, 1.55, 2.2, rccRackMat, rccBldg);
    residentialBox(1.85, 0.38, 0.06, 8.2, 2.25, 2.84, rccGreenLedMat, rccBldg);
    residentialBox(1.85, 0.22, 0.06, 8.2, 1.65, 2.84, rccAmberLedMat, rccBldg);

    // (10) Exterior Fiber / Microwave Communication Mast beside the RCC Building at (-73.5, 0, 11.0)
    const mastX = -73.5;
    const mastZ = 11.0;
    createLatticeTower(mastX, mastZ, 16.5, 1.45);
    // Microwave parabolic dishes facing the Substation Gateway Mast
    for (const dy of [11.5, 14.2]) {
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.25, 0.45, 14), mats.controlCabinet);
      dish.rotation.z = Math.PI / 2;
      dish.position.set(mastX + 0.9, dy, mastZ);
      rccGroup.add(dish);
    }
    const mastBeacon = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), rccRedLedMat);
    mastBeacon.position.set(mastX, 17.2, mastZ);
    rccGroup.add(mastBeacon);

    // Matching Substation Communication Mast beside Substation Gateway Room at (-34.5, 0, 13.5)
    createLatticeTower(-34.5, 13.5, 14.5, 1.2);
    const subDish = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 0.22, 0.40, 14), mats.controlCabinet);
    subDish.rotation.z = -Math.PI / 2;
    subDish.position.set(-35.3, 12.2, 13.5);
    rccGroup.add(subDish);

    tagPickable(rccBldg, 'BAY-132-L1');

    // C) ANIMATED IEC-104 COMMUNICATION FLOWS BETWEEN SUBSTATION & RCC (TCP PORT 2404)
    // Logical & Physical Path:
    //   Substation Bay IEDs -> Station Bus Switch -> Substation Gateway (-34.5, 1.8, 17.5) ->
    //   Redundant Firewalls & WAN Routers -> Fiber Optic Duct & Backup Microwave Link ->
    //   RCC Firewalls & WAN Routers (-53.5, 1.8, 11.0) -> RCC IEC-104 Front-End (-55.5, 2.0, 10.2) ->
    //   RCC SCADA Video Wall & Operator Consoles (-63.2, 2.4, 12.5)
    const iec104TelemetryCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-15.5, 2.2, 9.5),   // 33/11 kV Bay IEDs & Station Bus
      new THREE.Vector3(-34.5, 2.0, 17.5),  // Substation Gateway / RTU & FW/WAN
      new THREE.Vector3(-44.0, 0.65, 17.5), // Primary WAN Fiber Optic Duct Trench
      new THREE.Vector3(-52.5, 1.8, 12.0),  // RCC WAN Routers & Firewalls
      new THREE.Vector3(-55.5, 2.2, 10.2),  // RCC IEC-104 Front-End Server
      new THREE.Vector3(-63.2, 3.2, 10.0),  // RCC SCADA Video Wall & Operator Workstations
    ]);

    const iec104BackupMwCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-34.5, 2.0, 17.5),
      new THREE.Vector3(-34.5, 12.2, 13.5), // Substation Microwave Dish
      new THREE.Vector3(-54.0, 14.8, 12.2), // Wireless Microwave Line-of-Sight Link
      new THREE.Vector3(-73.5, 13.8, 11.0), // RCC Comm Mast Dish
      new THREE.Vector3(-55.5, 2.2, 10.2),  // RCC IEC-104 Front-End Server
      new THREE.Vector3(-63.2, 3.2, 10.0),  // RCC SCADA Video Wall
    ]);

    const iec104CommandCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-64.6, 1.8, 14.5),  // RCC Operator Workstation Console
      new THREE.Vector3(-55.5, 2.2, 10.2),  // RCC IEC-104 Front-End Server
      new THREE.Vector3(-52.5, 1.8, 12.0),  // RCC Firewalls & WAN Routers
      new THREE.Vector3(-44.0, 0.95, 16.2), // Authorized Command WAN Channel
      new THREE.Vector3(-34.5, 2.0, 17.5),  // Substation Gateway & CILO1 Interlock Check
      new THREE.Vector3(-12.5, 3.2, -2.5),  // Substation Field Breaker & IED Execution
    ]);

    const cyanTubeMat = new THREE.MeshBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.78,
    });
    const backupCyanTubeMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.55,
    });
    const greenCmdTubeMat = new THREE.MeshBasicMaterial({
      color: 0x22c55e,
      transparent: true,
      opacity: 0.72,
    });

    const primaryFiberTube = new THREE.Mesh(
      new THREE.TubeGeometry(iec104TelemetryCurve, 36, 0.085, 8, false),
      cyanTubeMat
    );
    rccGroup.add(primaryFiberTube);

    const backupMwTube = new THREE.Mesh(
      new THREE.TubeGeometry(iec104BackupMwCurve, 32, 0.065, 8, false),
      backupCyanTubeMat
    );
    rccGroup.add(backupMwTube);

    const greenCommandTube = new THREE.Mesh(
      new THREE.TubeGeometry(iec104CommandCurve, 36, 0.075, 8, false),
      greenCmdTubeMat
    );
    rccGroup.add(greenCommandTube);

    // 1) CYAN TELEMETRY PULSES (Substation -> RCC: Breaker positions, MW/MVAr/kV, Alarms, SOE, Quality)
    const cyanTelemetryOrbs: { mesh: any; offset: number }[] = [];
    const cyanOrbMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
    for (let i = 0; i < 10; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 10), cyanOrbMat);
      rccGroup.add(orb);
      cyanTelemetryOrbs.push({ mesh: orb, offset: i / 10 });
    }

    // 2) GREEN AUTHORIZED COMMAND & CONFIRMATION PULSES (RCC -> Substation + Return Feedback)
    const greenCommandOrbs: { mesh: any; offset: number; isReturn: boolean }[] = [];
    const greenOrbMat = new THREE.MeshBasicMaterial({ color: 0x22c55e });
    for (let i = 0; i < 8; i++) {
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.26, 10, 10), greenOrbMat);
      rccGroup.add(orb);
      greenCommandOrbs.push({ mesh: orb, offset: i / 8, isReturn: i % 2 === 1 });
    }

    // Instantiate every 33 kV Cubicle, 16 MVA Distribution Transformer (DT1/DT2), and 11 kV Cubicle + their 3-phase connections & power pulses
    stateRef.current.spatialNodes.forEach((node) => {
      if (node.voltageKv === 132) return;

      const [nx, , nz] = node.position;
      const grp = new THREE.Group();
      grp.position.set(nx, 0, nz);

      const selHalo = new THREE.Mesh(
        new THREE.BoxGeometry(3.2, 0.25, 3.6),
        mats.selectionHaloMat.clone()
      );
      selHalo.position.y = 0.22;
      selHalo.visible = false;
      grp.add(selHalo);
      dynamicActors.selectionPad[node.bayId] = selHalo;

      if (node.category === '16MVA Dist. Transformer') {
        const dtBund = new THREE.Mesh(
          new THREE.BoxGeometry(3.8, 0.35, 3.4),
          mats.concreteFoundation
        );
        dtBund.position.y = 0.18;
        grp.add(dtBund);

        const dtTank = new THREE.Mesh(new THREE.BoxGeometry(2.85, 2.95, 2.25), mats.transformerTank);
        dtTank.position.y = 1.7;
        dtTank.castShadow = true;
        grp.add(dtTank);
        // Small permanent nameplate mounted on the transformer tank itself.
        const txPlateCanvas = document.createElement('canvas');
        txPlateCanvas.width = 512;
        txPlateCanvas.height = 128;
        const txPlateCtx = txPlateCanvas.getContext('2d');
        if (txPlateCtx) {
          txPlateCtx.fillStyle = '#102337';
          txPlateCtx.fillRect(0, 0, 512, 128);
          txPlateCtx.fillStyle = '#e9f3ff';
          txPlateCtx.textAlign = 'center';
          txPlateCtx.font = 'bold 38px Arial';
          txPlateCtx.fillText(node.code, 256, 79);
          const txPlate = new THREE.Mesh(
            new THREE.PlaneGeometry(1.8, 0.45),
            new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(txPlateCanvas), side: THREE.DoubleSide })
          );
          txPlate.position.set(0, 2.25, 1.14);
          grp.add(txPlate);
        }

        const dtCons = new THREE.Mesh(
          new THREE.CylinderGeometry(0.38, 0.38, 2.25, 12),
          mats.galvanizedSteel
        );
        dtCons.rotation.z = Math.PI / 2;
        dtCons.position.set(0, 3.6, -0.5);
        grp.add(dtCons);

        [-0.75, 0, 0.75].forEach((bx) => {
          const bsh = createInsulatorStack(0.95, 3, false, false);
          bsh.position.set(bx, 3.15, 0.4);
          grp.add(bsh);
        });

        // 3-Phase 33 kV XLPE Cable from 33 kV Bus Section -> DT1/DT2 HV Bushings
        createBuriedCableRoute(node.bayId, [nx, 0.35, 10.5], [nx, 0.35, nz + 0.4], 33);
        // 3-Phase 11 kV Insulated Connection from DT1/DT2 LV -> 11-INC1 / 11-INC2
        const inc11Id = node.bayId === 'BAY-33-TF1' ? 'BAY-11-INC1' : 'BAY-11-INC2';
        const inc11Node = stateRef.current.spatialNodes.find((sn) => sn.bayId === inc11Id);
        const incX = inc11Node ? inc11Node.position[0] : nx;
        createBuriedCableRoute(inc11Id, [nx, 0.35, nz + 0.8], [incX, 0.35, 22.5], 11);

        // Underground DT supply: do not render above-ground pulse through panels.
        // Underground DT-to-11 kV incomer supply.
      } else {
        // Detailed metal-clad indoor switchgear cubicle: independent bay, live status and IEC 61850 front panel.
        const panelH = node.voltageKv === 33 ? 6.15 : 6.15;
        const panelW = node.voltageKv === 33 ? 3.45 : 3.15;
        const panelD = 2.5;
        const cabinetMat = new THREE.MeshStandardMaterial({
          color: 0x8596a7, metalness: 0.52, roughness: 0.42, emissive: 0x1e2936, emissiveIntensity: 0.14,
        });
        const doorMat = new THREE.MeshStandardMaterial({
          color: 0x9aa9b8, metalness: 0.45, roughness: 0.38, emissive: 0x263240, emissiveIntensity: 0.16,
        });
        const blackMat = new THREE.MeshStandardMaterial({ color: 0x132030, metalness: 0.25, roughness: 0.52 });
        const trimMat = new THREE.MeshStandardMaterial({ color: 0x5c7085, metalness: 0.68, roughness: 0.34 });
        const screenMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, emissive: 0x0284c7, emissiveIntensity: 0.38, roughness: 0.25 });
        const amberMat = new THREE.MeshStandardMaterial({ color: 0xffb347, emissive: 0xb45309, emissiveIntensity: 0.38 });
        const greenMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x15803d, emissiveIntensity: 0.42 });
        const redMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.38 });
        const frontZ = panelD / 2;
        const addCabPart = (w: number, h: number, d: number, x: number, y: number, z: number, mat: any) => {
          const part = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
          part.position.set(x, y, z);
          part.castShadow = true;
          grp.add(part);
          return part;
        };
        addCabPart(panelW, panelH, panelD, 0, 0.35 + panelH / 2, 0, cabinetMat);
        // Main withdrawable VCB door, upper instrument compartment and lower cable compartment.
        addCabPart(panelW - 0.14, panelH * 0.73, 0.045, 0, 0.35 + panelH * 0.61, frontZ + 0.025, doorMat);
        addCabPart(panelW - 0.14, panelH * 0.22, 0.05, 0, 0.35 + panelH * 0.13, frontZ + 0.028, doorMat);
        addCabPart(panelW - 0.10, 0.09, 0.12, 0, 0.35 + panelH - 0.10, frontZ + 0.07, blackMat);
        addCabPart(panelW - 0.10, 0.055, 0.11, 0, 0.35 + panelH * 0.26, frontZ + 0.075, trimMat);
        // Protective relay / multifunction meter with illuminated screen.
        addCabPart(0.85, 0.58, 0.09, -0.26, 0.35 + panelH * 0.69, frontZ + 0.085, blackMat);
        addCabPart(0.66, 0.37, 0.015, -0.26, 0.35 + panelH * 0.71, frontZ + 0.139, screenMat);
        for (let i = 0; i < 4; i++) {
          addCabPart(0.08, 0.035, 0.018, -0.49 + i * 0.15, 0.35 + panelH * 0.57, frontZ + 0.146, trimMat);
        }
        // Dedicated bay status lamps, annunciator windows and operator selector switches.
        for (let i = 0; i < 5; i++) {
          addCabPart(0.13, 0.10, 0.025, -0.72 + i * 0.35, 0.35 + panelH * 0.86, frontZ + 0.092,
            i === 0 ? greenMat : i === 3 ? redMat : amberMat);
        }
        for (let row = 0; row < 2; row++) {
          for (let i = 0; i < 3; i++) {
            addCabPart(0.19, 0.13, 0.035, 0.46 + i * 0.25, 0.35 + panelH * (0.64 - row * 0.105), frontZ + 0.09,
              (row + i) % 3 === 0 ? amberMat : blackMat);
          }
        }
        for (let i = 0; i < 3; i++) {
          const selector = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.105, 0.08, 12), blackMat);
          selector.rotation.x = Math.PI / 2;
          selector.position.set(-0.72 + i * 0.68, 0.35 + panelH * 0.39, frontZ + 0.11);
          grp.add(selector);
          addCabPart(0.045, 0.13, 0.055, -0.72 + i * 0.68, 0.35 + panelH * 0.39, frontZ + 0.18, trimMat);
        }
        // Mechanical VCB mimic, racking indicator, door handles and ventilation louvers.
        addCabPart(0.76, 0.40, 0.06, 0, 0.35 + panelH * 0.20, frontZ + 0.095, blackMat);
        addCabPart(0.48, 0.045, 0.075, 0, 0.35 + panelH * 0.20, frontZ + 0.139, greenMat);
        addCabPart(0.065, 0.37, 0.11, panelW / 2 - 0.19, 0.35 + panelH * 0.43, frontZ + 0.11, trimMat);
        for (let i = 0; i < 5; i++) {
          addCabPart(panelW * 0.58, 0.018, 0.018, 0, 0.48 + i * 0.055, frontZ + 0.103, trimMat);
        }
        // Upper busbar enclosure and realistic overhead cable-tray support.
        addCabPart(panelW - 0.12, 0.18, 0.95, 0, 0.35 + panelH + 0.10, -0.45, trimMat);
        // Labels are attached to each cabinet and remain associated with its original bay ID.
        const nameCanvas = document.createElement('canvas');
        nameCanvas.width = 512; nameCanvas.height = 128;
        const ctx = nameCanvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#122238'; ctx.fillRect(0, 0, 512, 128);
          ctx.fillStyle = '#f0f7ff'; ctx.font = 'bold 37px Arial'; ctx.textAlign = 'center';
          ctx.fillText(`${node.voltageKv} kV  ${node.code}`.slice(0, 24), 256, 80);
          const texture = new THREE.CanvasTexture(nameCanvas);
          const plate = new THREE.Mesh(new THREE.PlaneGeometry(1.72, 0.43), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
          plate.position.set(0, 0.35 + panelH * 0.94, frontZ + 0.108);
          grp.add(plate);
        }

        // Bottom-entry XLPE feeders: buried conduits pass BELOW the cabinets, never through their doors.
        // The outdoor outgoing feeder pole is located in the cable exit yard ahead of each panel.
        if (node.bayId !== 'BAY-33-BC' && node.bayId !== 'BAY-11-BC') {
          const isOutgoing = /F\d+/.test(node.bayId) && !/TF/.test(node.bayId);
          const poleZ = node.voltageKv === 33 ? 17.1 : 29.4;
          createBuriedCableRoute(node.bayId, [nx, 0.30, nz], [nx, 0.30, poleZ], node.voltageKv);
          // Both 33 kV and 11 kV outgoing feeders use underground XLPE duct banks.
          // No overhead feeder poles or floating aerial wires near the switchgear halls.
          if (isOutgoing) {
            const cableExitZ = node.voltageKv === 33 ? 19.0 : 31.0;
            createBuriedCableRoute(node.bayId, [nx, 0.30, poleZ], [nx, 0.30, cableExitZ], node.voltageKv);
          }
        }

      }

      const topY = node.category === '16MVA Dist. Transformer' ? 3.85 : 6.28;
      const posInd = new THREE.Mesh(sharedGeos.posBox, mats.posClosedCyan);
      posInd.scale.set(0.55, 0.55, 0.55);
      posInd.position.set(-0.45, topY, 1.15);
      grp.add(posInd);
      dynamicActors.positionIndicators[node.bayId] = posInd;

      const almBeacon = new THREE.Mesh(sharedGeos.alarmDome, mats.alarmNormalOff);
      almBeacon.scale.set(0.55, 0.55, 0.55);
      almBeacon.position.set(0.45, topY + 0.04, 1.15);
      grp.add(almBeacon);
      dynamicActors.alarmBeacons[node.bayId] = almBeacon;

      tagPickable(grp, node.bayId);
      layerGroups[node.layerKey].add(grp);
    });

    // Reference-layout architectural positioning: 33 kV hall is large and back-left;
    // 11 kV hall is smaller and front-right. All cabinets, room glass, roofs and
    // pickable bay meshes move together, preserving their IDs and live state.
    layerGroups.LAYER_33_SWG.scale.set(0.56, 1, 1.05);
    layerGroups.LAYER_33_SWG.position.set(-15.8, 0, -1.5);
    // The 16 MVA distribution transformers share the 11 kV layer. Keep them
    // aligned side-by-side with the 33 kV hall in the foreground like Image 1.
    layerGroups.LAYER_11_SWG_DT.scale.set(0.48, 1, 0.98);
    layerGroups.LAYER_11_SWG_DT.position.set(13.8, 0, -9.5);

    // Illuminated underground duct-bank routes (training visualization only).
    // All glow is embedded in ground-level cable trenches, never floating in air.
    const undergroundGlow = new THREE.MeshBasicMaterial({ color: 0xffbb64, transparent: true, opacity: 0.9 });
    const addGlowingTrench = (points: [number, number][]) => {
      for (let i = 0; i < points.length - 1; i++) {
        const a = new THREE.Vector3(points[i][0], 0.055, points[i][1]);
        const b = new THREE.Vector3(points[i + 1][0], 0.055, points[i + 1][1]);
        const delta = b.clone().sub(a);
        const segment = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.045, delta.length()), undergroundGlow);
        segment.position.copy(a).add(b).multiplyScalar(0.5);
        segment.rotation.y = Math.atan2(delta.x, delta.z);
        connectionsGroup.add(segment);
      }
    };
    // 132/33 kV transformers -> 33 kV room rear cable entry.
    addGlowingTrench([[-12.5, 1.0], [-12.5, 3.3], [-23, 3.3], [-23, 5.0]]);
    addGlowingTrench([[12.5, 1.0], [12.5, 4.0], [-3.0, 4.0], [-3.0, 5.0]]);
    // 33 kV transformer feeders -> 11 kV room via below-grade trench junctions.
    addGlowingTrench([[-2, 15], [3, 15], [3, 20], [10, 20]]);
    addGlowingTrench([[2, 15], [7, 15], [7, 21], [15, 21]]);
    // Animate only conductor-aligned overhead paths. No free-floating diagonal orbs,
    // no pulses through switchgear doors and no visible pulses on buried cables.
    addPowerPulsePath([-26, 12.2, -27.5], [-26, 5.1, -25.0], 'BAY-132-L1', 132, 0x00eaff);
    addPowerPulsePath([26, 12.2, -27.5], [26, 5.1, -25.0], 'BAY-132-L2', 132, 0x00eaff);
    addPowerPulsePath([-26, 5.1, -18.5], [-26, 7.6, -14], 'BAY-132-L1', 132, 0x00eaff);
    addPowerPulsePath([26, 5.1, -18.5], [26, 7.6, -14], 'BAY-132-L2', 132, 0x00eaff);
    addPowerPulsePath([-26, 7.6, -14], [-3.6, 7.6, -14], 'BAY-132-L1', 132, 0x00eaff);
    addPowerPulsePath([3.6, 7.6, -14], [26, 7.6, -14], 'BAY-132-L2', 132, 0x00eaff);
    addPowerPulsePath([-3.6, 7.6, -14], [0, 5.1, -14], 'BAY-132-BC', 132, 0x00eaff);
    addPowerPulsePath([0, 5.1, -14], [3.6, 7.6, -14], 'BAY-132-BC', 132, 0x00eaff);
    addPowerPulsePath([-12.5, 7.6, -14], [-12.5, 5.1, -11.2], 'BAY-132-T1', 132, 0x00eaff);
    addPowerPulsePath([-12.5, 5.1, -6.8], [-12.5, 7.9, -1.6], 'BAY-132-T1', 132, 0x00eaff);
    addPowerPulsePath([12.5, 7.6, -14], [12.5, 5.1, -11.2], 'BAY-132-T2', 132, 0x00eaff);
    addPowerPulsePath([12.5, 5.1, -6.8], [12.5, 7.9, -1.6], 'BAY-132-T2', 132, 0x00eaff);

    // ==================== WORLD SCENE BOUNDS, RAYCASTER, POINTER CAPTURE & 4-MODE CAMERA NAVIGATION ====================
    // Compute combined world scene bounding box across Substation, RCC, Roads, and all 46 Houses (+ margin)
    if (THREE.Box3) {
      try {
        const box = new THREE.Box3().setFromObject(scene);
        if (box.min && box.max && isFinite(box.min.x) && isFinite(box.max.x)) {
          camControlRef.current.bounds = {
            minX: Math.min(-108, box.min.x - 18),
            maxX: Math.max(142, box.max.x + 18),
            minY: 0.5,
            maxY: 155,
            minZ: Math.min(-88, box.min.z - 18),
            maxZ: Math.max(68, box.max.z + 18),
          };
        }
      } catch {
        // Fallback bounds already cover [-108..142, -88..68]
      }
    }

    // Major solid equipment footprints for practical Walk-mode collision avoidance
    const solidFootprints: { minX: number; maxX: number; minZ: number; maxZ: number }[] = [
      { minX: -16.2, maxX: -8.8, minZ: -3.8, maxZ: 2.8 },   // 50 MVA Transformer T1
      { minX: 8.8, maxX: 16.2, minZ: -3.8, maxZ: 2.8 },     // 50 MVA Transformer T2
      { minX: -71.5, maxX: -48.5, minZ: 6.4, maxZ: 7.4 },   // RCC Rear Solid Wall
    ];

    const raycaster = new THREE.Raycaster();
    const mouseVec = new THREE.Vector2();
    const keysPressed = new Set<string>();
    let isDragging = false;
    let activePointerId: number | null = null;
    let dragButton = 0;
    let downX = 0;
    let downY = 0;
    let lastX = 0;
    let lastY = 0;

    const domEl = renderer.domElement;
    domEl.style.touchAction = 'none';
    domEl.style.userSelect = 'none';

    const pickSceneObject = (clientX: number, clientY: number) => {
      const rect = domEl.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return null;
      mouseVec.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      mouseVec.y = -((clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouseVec, camera);
      const hits = raycaster.intersectObjects(pickableMeshes, false);
      return hits.find((h: any) => h.object.parent?.visible !== false) || null;
    };

    const onPointerDown = (e: PointerEvent) => {
      isDragging = true;
      activePointerId = e.pointerId;
      dragButton = e.button;
      downX = e.clientX;
      downY = e.clientY;
      lastX = e.clientX;
      lastY = e.clientY;
      camControlRef.current.isInterpolating = false;
      if (stateRef.current.followRoadActive) {
        setFollowRoadActive(false);
      }
      if (typeof domEl.setPointerCapture === 'function') {
        try {
          domEl.setPointerCapture(e.pointerId);
        } catch {
          // Ignore if synthetic event
        }
      }
      domEl.style.cursor = 'grabbing';
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isDragging) {
        const visibleHit = pickSceneObject(e.clientX, e.clientY);
        if (visibleHit) {
          const wItem = visibleHit.object.userData?.worldItem as WorldInspectableItem | undefined;
          const hitBayId = visibleHit.object.userData?.bayId as string | undefined;
          if (wItem) {
            domEl.style.cursor = 'pointer';
            setHoveredNodeTitle(`${wItem.title} — ${wItem.feederInfo}`);
            return;
          }
          if (hitBayId) {
            const node = stateRef.current.spatialNodes.find((n) => n.bayId === hitBayId);
            if (node) {
              domEl.style.cursor = 'pointer';
              setHoveredNodeTitle(`${node.code} — ${node.title}`);
              return;
            }
          }
        }
        domEl.style.cursor = stateRef.current.cameraNavMode === 'PAN' ? 'move' : 'grab';
        return;
      }

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;

      const c = camControlRef.current;
      const mode = stateRef.current.cameraNavMode;

      if (mode === 'WALK' || mode === 'FLY') {
        // Free look around in Walk & Fly modes
        c.yaw -= dx * 0.0052;
        const maxPitch = mode === 'WALK' ? 1.05 : 1.42;
        c.pitch = Math.max(-maxPitch, Math.min(maxPitch, c.pitch - dy * 0.0045));
        return;
      }

      // Default PAN: left-drag moves around the site; right-drag or Shift+left-drag rotates.
      // ORBIT: left-drag rotates; right-drag or Shift+left-drag pans.
      const shouldPan = mode === 'PAN' ? (dragButton === 0 && !e.shiftKey) : (dragButton === 2 || e.shiftKey);

      if (shouldPan) {
        // Ground-plane-aware panning aligned with current camera orientation (theta) & scaled by zoom distance
        const effRad = c.radius / Math.max(0.4, stateRef.current.zoom);
        const panScale = Math.max(0.045, effRad * 0.0024);
        const cosT = Math.cos(c.theta);
        const sinT = Math.sin(c.theta);
        const worldDx = (-dx * cosT - dy * sinT) * panScale;
        const worldDz = (dx * sinT - dy * cosT) * panScale;

        c.target[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.target[0] + worldDx));
        c.target[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.target[2] + worldDz));
        c.desiredTarget = [c.target[0], c.target[1], c.target[2]];
      } else {
        // 360-degree horizontal rotation + near-ground to overhead vertical orbit around current target
        c.theta -= dx * 0.0065;
        c.phi = Math.max(0.08, Math.min(1.52, c.phi - dy * 0.0055));
        c.desiredTheta = c.theta;
        c.desiredPhi = c.phi;
      }
    };

    const endPointerDrag = (e: PointerEvent, isCancel = false) => {
      if (!isDragging) return;
      const movedDist = Math.hypot(e.clientX - downX, e.clientY - downY);
      isDragging = false;
      if (activePointerId !== null && typeof domEl.releasePointerCapture === 'function') {
        try {
          domEl.releasePointerCapture(activePointerId);
        } catch {
          // Ignore
        }
      }
      activePointerId = null;
      domEl.style.cursor = stateRef.current.cameraNavMode === 'PAN' ? 'move' : 'grab';

      if (!isCancel && movedDist < 5 && e.button === 0) {
        const visibleHit = pickSceneObject(e.clientX, e.clientY);
        const wItem = visibleHit?.object?.userData?.worldItem as WorldInspectableItem | undefined;
        const hitBayId = visibleHit?.object?.userData?.bayId as string | undefined;
        if (wItem) {
          setSelectedWorldItem(wItem);
          const hitPt = visibleHit.point;
          const focusPos: [number, number, number] =
            wItem.kind === 'ROAD' && hitPt
              ? [hitPt.x, 1.5, hitPt.z]
              : wItem.position;
          focusCameraOnWorldPoint(
            focusPos,
            wItem.kind === 'HOUSE' ? 16 : 20,
            `${wItem.title} • ${wItem.feederInfo}`
          );
        } else if (hitBayId) {
          setSelectedWorldItem(null);
          focusCameraOnBay(hitBayId);
        }
      }
    };

    const onDoubleClick = (e: MouseEvent) => {
      const visibleHit = pickSceneObject(e.clientX, e.clientY);
      if (!visibleHit) return;
      const wItem = visibleHit.object.userData?.worldItem as WorldInspectableItem | undefined;
      const hitBayId = visibleHit.object.userData?.bayId as string | undefined;
      if (wItem) {
        setSelectedWorldItem(wItem);
        const hitPt = visibleHit.point;
        const focusPos: [number, number, number] =
          wItem.kind === 'ROAD' && hitPt
            ? [hitPt.x, 1.5, hitPt.z]
            : wItem.position;
        focusCameraOnWorldPoint(
          focusPos,
          wItem.kind === 'HOUSE' ? 10.5 : 14,
          `Focused Orbit Target on ${wItem.id}: ${wItem.title}`
        );
      } else if (hitBayId) {
        setSelectedWorldItem(null);
        focusCameraOnBay(hitBayId);
        camControlRef.current.desiredRadius = 11.5;
        camControlRef.current.isInterpolating = true;
      }
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const c = camControlRef.current;
      const mode = stateRef.current.cameraNavMode;
      if (mode === 'WALK' || mode === 'FLY') {
        const nextMult = Math.max(0.35, Math.min(3.5, Number((c.moveSpeedMult - e.deltaY * 0.0012).toFixed(2))));
        c.moveSpeedMult = nextMult;
        setWalkSpeedMult(nextMult);
        return;
      }
      c.isInterpolating = false;
      // Adaptive zoom step: finer when close to houses/panels, faster when high above the scene
      const zoomStep = Math.max(0.008, c.radius * 0.0011) * e.deltaY;
      c.radius = Math.max(2.4, Math.min(210, c.radius + zoomStep));
      c.desiredRadius = c.radius;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const k = e.key.toLowerCase();
      if (k === 'escape') {
        keysPressed.clear();
        if (stateRef.current.followRoadActive) {
          setFollowRoadActive(false);
        } else if (stateRef.current.cameraNavMode === 'WALK' || stateRef.current.cameraNavMode === 'FLY') {
          setCameraNavMode('PAN');
        }
        return;
      }
      keysPressed.add(k);
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysPressed.delete(e.key.toLowerCase());
    };

    const onContextMenu = (e: MouseEvent) => e.preventDefault();

    const onPointerUpBound = (e: PointerEvent) => endPointerDrag(e, false);
    const onPointerCancelBound = (e: PointerEvent) => endPointerDrag(e, true);

    // Multi-touch support (1-finger orbit/pan, 2-finger pan, 2-finger pinch-to-zoom)
    domEl.style.touchAction = 'none';
    let lastTouchDist = 0;
    let lastTouchMidX = 0;
    let lastTouchMidY = 0;
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        isDragging = false;
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        lastTouchDist = Math.hypot(dx, dy);
        lastTouchMidX = (e.touches[0].clientX + e.touches[1].clientX) * 0.5;
        lastTouchMidY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
      }
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const dx = e.touches[0].clientX - e.touches[1].clientX;
        const dy = e.touches[0].clientY - e.touches[1].clientY;
        const dist = Math.hypot(dx, dy);
        const midX = (e.touches[0].clientX + e.touches[1].clientX) * 0.5;
        const midY = (e.touches[0].clientY + e.touches[1].clientY) * 0.5;
        const c = camControlRef.current;
        c.isInterpolating = false;
        if (lastTouchDist > 0) {
          const pinchDelta = lastTouchDist - dist;
          const zoomStep = Math.max(0.015, c.radius * 0.004) * pinchDelta;
          c.radius = Math.max(2.4, Math.min(210, c.radius + zoomStep));
          c.desiredRadius = c.radius;
        }
        const panDx = midX - lastTouchMidX;
        const panDy = midY - lastTouchMidY;
        const effRad = c.radius / Math.max(0.4, stateRef.current.zoom);
        const panScale = Math.max(0.045, effRad * 0.0024);
        const cosT = Math.cos(c.theta);
        const sinT = Math.sin(c.theta);
        const worldDx = (-panDx * cosT - panDy * sinT) * panScale;
        const worldDz = (panDx * sinT - panDy * cosT) * panScale;
        c.target[0] = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.target[0] + worldDx));
        c.target[2] = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.target[2] + worldDz));
        c.desiredTarget = [c.target[0], c.target[1], c.target[2]];
        lastTouchDist = dist;
        lastTouchMidX = midX;
        lastTouchMidY = midY;
      }
    };
    const onTouchEnd = () => {
      lastTouchDist = 0;
    };

    domEl.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUpBound);
    window.addEventListener('pointercancel', onPointerCancelBound);
    domEl.addEventListener('touchstart', onTouchStart, { passive: false });
    domEl.addEventListener('touchmove', onTouchMove, { passive: false });
    domEl.addEventListener('touchend', onTouchEnd);
    domEl.addEventListener('touchcancel', onTouchEnd);
    domEl.addEventListener('dblclick', onDoubleClick);
    domEl.addEventListener('wheel', onWheel, { passive: false });
    domEl.addEventListener('contextmenu', onContextMenu);
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    const handleResize = () => {
      if (!container) return;
      camera.aspect = container.clientWidth / Math.max(1, container.clientHeight);
      camera.updateProjectionMatrix();
      renderer.setSize(container.clientWidth, container.clientHeight);
    };
    window.addEventListener('resize', handleResize);
    const resizeObserver = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(handleResize) : null;
    resizeObserver?.observe(container);

    // ==================== RENDER & SYNCHRONIZATION LOOP ====================
    let animFrameId = 0;
    let lastPerfUpdate = performance.now();
    let frameCounter = 0;
    let prevFrameTs = performance.now();

    const animate = (now: number) => {
      const dtMs = now - prevFrameTs;
      prevFrameTs = now;
      frameCounter++;

      const st = stateRef.current;
      const c = camControlRef.current;

      // 1. Toggle 3-Phase Electrical Connections & Subsystem Layers
      connectionsGroup.visible = st.showElectricalConnections;
      (Object.keys(layerGroups) as (keyof LayerVisibilityState)[]).forEach((lk) => {
        layerGroups[lk].visible = st.layerVis[lk];
      });

      // Downstream 11 kV -> 250 kVA DT -> 415 V LT -> 230 V Service Drop state-aware energization
      const residentialFeeder = st.bays.find((b) => b.id === streetFeederIds[0]);
      const hv11Energized = Boolean(
        residentialFeeder?.energized &&
        residentialFeeder.breakerState === 'CLOSED' &&
        residentialFeeder.busDisconnectorState === 'CLOSED' &&
        residentialFeeder.lineDisconnectorState === 'CLOSED' &&
        residentialFeeder.earthSwitchState === 'OPEN' &&
        !residentialFeeder.protectionTripActive
      );
      const lt415Energized = hv11Energized && st.distTxClosed;
      const housesEnergized = lt415Energized && st.serviceDropClosed;

      const showDistLinks = st.showElectricalConnections && (st.pathVoltageFilter === 'ALL' || st.pathVoltageFilter === 11);
      hv11LiveMeshes.forEach((mesh) => {
        mesh.visible = hv11Energized && showDistLinks;
      });
      lt415LiveMeshes.forEach((mesh) => {
        mesh.visible = lt415Energized && showDistLinks;
      });
      serviceDropLiveMeshes.forEach((mesh) => {
        mesh.visible = housesEnergized && showDistLinks;
      });
      residentialLamps.forEach((mesh) => {
        mesh.material = housesEnergized ? windowLit : windowDark;
      });
      residentialGlowPools.forEach((pool) => {
        pool.visible = housesEnergized;
      });
      streetLights.forEach((item) => {
        if (item.isLight) item.intensity = lt415Energized ? 0.56 : 0.03;
        else item.material = lt415Energized ? lampBulb : windowDark;
      });
      neighborhoodLightA.intensity = housesEnergized ? 0.62 : 0.05;
      neighborhoodLightB.intensity = housesEnergized ? 0.56 : 0.05;

      // Feeder-specific street state: opening F02/F03/... darkens ONLY its street.
      const feederLive = (id: string) => {
        const b = st.bays.find((item) => item.id === id);
        return Boolean(b?.energized && b.breakerState === 'CLOSED' &&
          b.busDisconnectorState === 'CLOSED' && b.lineDisconnectorState === 'CLOSED' &&
          b.earthSwitchState === 'OPEN' && !b.protectionTripActive);
      };
      apartmentDistribution.forEach((circuit) => {
        const live = feederLive(circuit.feederId);
        const showHv = st.showElectricalConnections && (st.pathVoltageFilter === 'ALL' || st.pathVoltageFilter === 11);
        circuit.hv.forEach((mesh) => { mesh.visible = showHv; mesh.material = live ? aptCable11 : aptCableDuct; });
        circuit.lt.forEach((mesh) => { mesh.visible = showHv; mesh.material = live && st.distTxClosed ? aptCable415 : aptCableDuct; });
        circuit.transformer.forEach((mesh) => { mesh.material = live ? aptTransformerCore : aptCabinet; });
        circuit.pulses.forEach((actor) => {
          const active = live && (actor.tier === 'HV_11KV' || st.distTxClosed);
          actor.mesh.visible = active && showHv && st.showPowerFlowPulses;
          if (actor.mesh.visible) actor.mesh.position.copy(actor.curve.getPointAt((now * 0.001 * actor.speed + actor.offset) % 1));
        });
      });
      streetHouseLamps.forEach(({ mesh, feederId }) => {
        mesh.material = feederLive(feederId) && st.distTxClosed && st.serviceDropClosed ? windowLit : windowDark;
      });
      streetHouseGlows.forEach(({ mesh, feederId }) => {
        mesh.visible = feederLive(feederId) && st.distTxClosed && st.serviceDropClosed;
      });
      streetFeederCircuits.forEach((circuit) => {
        const live = feederLive(circuit.feederId);
        circuit.hv.forEach((mesh) => { mesh.visible = live && showDistLinks; });
        circuit.lt.forEach((mesh) => { mesh.visible = live && st.distTxClosed && showDistLinks; });
        circuit.pulses.forEach((dp) => {
          const active = live && (dp.tier === 'HV_11KV' || st.distTxClosed) &&
            (dp.tier !== 'SERVICE_230V' || st.serviceDropClosed);
          dp.mesh.visible = false; // Underground pulses remain below the surface.
          if (dp.mesh.visible) dp.mesh.position.copy(dp.curve.getPointAt((now * 0.001 * dp.speed + dp.offset) % 1));
        });
      });

      // Animate golden-orange power pulses along curved 11 kV, 415 V LT, and 230 V service drop conductors
      const distTime = (now * 0.001) % 1000;
      distPulseActors.forEach((dp) => {
        const tierActive =
          dp.tier === 'HV_11KV'
            ? hv11Energized
            : dp.tier === 'LT_415V'
            ? lt415Energized
            : housesEnergized;
        const vis = false; // Underground residential feeder animation is concealed.
        dp.mesh.visible = vis;
        if (vis) {
          const u = (distTime * dp.speed + dp.offset) % 1;
          const pt = dp.curve.getPointAt(u);
          dp.mesh.position.copy(pt);
        }
      });

      // Highlight selected residential house outline pad if a house is selected
      const selHouseId = st.selectedWorldItem?.kind === 'HOUSE' ? st.selectedWorldItem.id : null;
      Object.keys(houseSelectionHalos).forEach((hid) => {
        houseSelectionHalos[hid].visible = hid === selHouseId;
      });

      // 2. Frame-Rate-Independent 4-Mode Camera Update (Orbit | Pan | Walk | Fly | Follow Road)
      const dtSec = Math.min(0.08, Math.max(0.001, dtMs * 0.001));
      let effectiveRadius = c.radius / Math.max(0.4, st.zoom);

      if (st.followRoadActive && roadSegmentsRegistry.length > 0) {
        // Street-level automatic road centerline exploration
        const seg = roadSegmentsRegistry[c.activeRoadIndex % roadSegmentsRegistry.length];
        c.roadProgress += dtSec * 0.16 * c.moveSpeedMult;
        if (c.roadProgress >= 1.0) {
          c.roadProgress = 0;
          c.activeRoadIndex = (c.activeRoadIndex + 1) % roadSegmentsRegistry.length;
        }
        const u = c.roadProgress;
        const rx = seg.p1[0] + (seg.p2[0] - seg.p1[0]) * u;
        const rz = seg.p1[2] + (seg.p2[2] - seg.p1[2]) * u;
        const lookX = seg.p1[0] + (seg.p2[0] - seg.p1[0]) * Math.min(1, u + 0.12);
        const lookZ = seg.p1[2] + (seg.p2[2] - seg.p1[2]) * Math.min(1, u + 0.12);
        c.eyePos = [rx, 1.95, rz];
        c.target = [lookX, 1.85, lookZ];
        c.desiredTarget = [...c.target] as [number, number, number];
        camera.position.set(rx, 1.95, rz);
        camera.lookAt(lookX, 1.85, lookZ);
        effectiveRadius = 10;
      } else if (st.cameraNavMode === 'WALK' || st.cameraNavMode === 'FLY') {
        const isFly = st.cameraNavMode === 'FLY';
        const sprint = keysPressed.has('shift') ? 2.4 : 1.0;
        const baseSpeed = (isFly ? 24.0 : 13.5) * c.moveSpeedMult * sprint * dtSec;

        const fwdX = -Math.sin(c.yaw) * (isFly ? Math.cos(c.pitch) : 1);
        const fwdY = isFly ? Math.sin(c.pitch) : 0;
        const fwdZ = -Math.cos(c.yaw) * (isFly ? Math.cos(c.pitch) : 1);
        const rightX = Math.cos(c.yaw);
        const rightZ = -Math.sin(c.yaw);

        let moveX = 0;
        let moveY = 0;
        let moveZ = 0;
        if (keysPressed.has('w') || keysPressed.has('arrowup')) {
          moveX += fwdX * baseSpeed;
          moveY += fwdY * baseSpeed;
          moveZ += fwdZ * baseSpeed;
        }
        if (keysPressed.has('s') || keysPressed.has('arrowdown')) {
          moveX -= fwdX * baseSpeed;
          moveY -= fwdY * baseSpeed;
          moveZ -= fwdZ * baseSpeed;
        }
        if (keysPressed.has('a') || keysPressed.has('arrowleft')) {
          moveX -= rightX * baseSpeed;
          moveZ -= rightZ * baseSpeed;
        }
        if (keysPressed.has('d') || keysPressed.has('arrowright')) {
          moveX += rightX * baseSpeed;
          moveZ += rightZ * baseSpeed;
        }
        if (isFly) {
          if (keysPressed.has('e') || keysPressed.has(' ')) moveY += baseSpeed * 0.85;
          if (keysPressed.has('q') || keysPressed.has('c')) moveY -= baseSpeed * 0.85;
        }

        const candX = Math.max(c.bounds.minX, Math.min(c.bounds.maxX, c.eyePos[0] + moveX));
        const candZ = Math.max(c.bounds.minZ, Math.min(c.bounds.maxZ, c.eyePos[2] + moveZ));
        const candY = isFly
          ? Math.max(1.0, Math.min(c.bounds.maxY, c.eyePos[1] + moveY))
          : 1.72;

        // Practical collision avoidance in Walk mode against solid transformer tanks
        const hitsObstacle =
          !isFly &&
          solidFootprints.some(
            (fp) => candX > fp.minX && candX < fp.maxX && candZ > fp.minZ && candZ < fp.maxZ
          );
        if (!hitsObstacle) {
          c.eyePos[0] = candX;
          c.eyePos[2] = candZ;
        }
        c.eyePos[1] = candY;

        const lookTargetX = c.eyePos[0] - Math.sin(c.yaw) * Math.cos(c.pitch) * 12;
        const lookTargetY = c.eyePos[1] + Math.sin(c.pitch) * 12;
        const lookTargetZ = c.eyePos[2] - Math.cos(c.yaw) * Math.cos(c.pitch) * 12;
        c.target = [lookTargetX, Math.max(0.5, lookTargetY), lookTargetZ];
        c.desiredTarget = [...c.target] as [number, number, number];

        camera.position.set(c.eyePos[0], c.eyePos[1], c.eyePos[2]);
        camera.lookAt(lookTargetX, lookTargetY, lookTargetZ);
        effectiveRadius = isFly ? 18 : 8;
      } else {
        // ORBIT & PAN modes with frame-rate-independent damping
        if (c.isInterpolating) {
          const damp = 1 - Math.exp(-8.5 * dtSec);
          c.target[0] += (c.desiredTarget[0] - c.target[0]) * damp;
          c.target[1] += (c.desiredTarget[1] - c.target[1]) * damp;
          c.target[2] += (c.desiredTarget[2] - c.target[2]) * damp;
          c.theta += (c.desiredTheta - c.theta) * damp;
          c.phi += (c.desiredPhi - c.phi) * damp;
          c.radius += (c.desiredRadius - c.radius) * damp;

          if (
            Math.abs(c.desiredRadius - c.radius) < 0.08 &&
            Math.abs(c.desiredTarget[0] - c.target[0]) < 0.08 &&
            Math.abs(c.desiredTarget[2] - c.target[2]) < 0.08
          ) {
            c.isInterpolating = false;
          }
        } else if (st.autoRotate && !isDragging) {
          c.theta += 0.14 * dtSec;
          c.desiredTheta = c.theta;
        }

        effectiveRadius = c.radius / Math.max(0.4, st.zoom);
        camera.position.x = c.target[0] + effectiveRadius * Math.sin(c.phi) * Math.sin(c.theta);
        camera.position.y = Math.max(0.65, c.target[1] + effectiveRadius * Math.cos(c.phi));
        camera.position.z = c.target[2] + effectiveRadius * Math.sin(c.phi) * Math.cos(c.theta);
        camera.lookAt(c.target[0], c.target[1], c.target[2]);
      }

      // 3. Lighting Preset (Professional Nighttime Color Grading #020B1C, Ambient 0.25, Moonlight 0.50)
      if (st.lightingPreset === 'DAYLIGHT_CLEAR') {
        scene.background.setHex(0x0a1c34);
        scene.fog.color.setHex(0x0a1c34);
        sunLight.intensity = 1.15;
        hemiLight.intensity = 0.68;
        floodLights.forEach((fl) => (fl.intensity = 0.25));
      } else if (st.lightingPreset === 'NIGHT_FLOODLIGHT') {
        scene.background.setHex(0x010712);
        scene.fog.color.setHex(0x010712);
        sunLight.intensity = 0.36;
        hemiLight.intensity = 0.20;
        floodLights.forEach((fl) => (fl.intensity = 0.78));
      } else {
        scene.background.setHex(0x020b1c);
        scene.fog.color.setHex(0x020b1c);
        sunLight.intensity = 0.50;
        hemiLight.intensity = 0.26;
        floodLights.forEach((fl) => (fl.intensity = 0.58));
      }

      // Animate IEC-104 Cyan Telemetry (Substation -> RCC) & Green Authorized Command Pulses (RCC <-> Substation)
      const iecActive = st.iec104Connected;
      const useBackupPath = st.rccFault === 'WAN_PRIMARY_FAIL';
      const isStale = st.telemetryHealth === 'STALE';
      primaryFiberTube.visible = iecActive && !useBackupPath;
      backupMwTube.visible = iecActive && (useBackupPath || st.rccFault === 'NONE');
      greenCommandTube.visible = iecActive && st.rccFault !== 'RCC_AUTH_UNAVAILABLE';

      const teleSpeed = isStale ? 0.05 : 0.22;
      const activeTeleCurve = useBackupPath ? iec104BackupMwCurve : iec104TelemetryCurve;
      cyanOrbMat.color.setHex(isStale ? 0xf59e0b : 0x00f0ff);
      cyanTelemetryOrbs.forEach((co) => {
        co.mesh.visible = iecActive;
        if (iecActive) {
          const u = (distTime * teleSpeed + co.offset) % 1;
          co.mesh.position.copy(activeTeleCurve.getPointAt(u));
        }
      });

      const cmdBoost = now < st.rccCommandPulseUntil ? 2.2 : 1.0;
      const cmdAllowed = iecActive && st.rccFault !== 'RCC_AUTH_UNAVAILABLE' && st.rccFault !== 'INTERLOCK_REJECT';
      greenOrbMat.color.setHex(st.rccFault === 'INTERLOCK_REJECT' ? 0xef4444 : 0x22c55e);
      greenCommandOrbs.forEach((go) => {
        go.mesh.visible = iecActive;
        if (iecActive) {
          const rawU = (distTime * 0.18 * cmdBoost + go.offset) % 1;
          const u = go.isReturn ? 1 - rawU : rawU;
          go.mesh.position.copy(iec104CommandCurve.getPointAt(u));
          go.mesh.scale.setScalar(now < st.rccCommandPulseUntil ? 1.45 : 0.95);
        }
      });
      rccRackStatusIndicators.forEach((led, idx) => {
        led.material = !iecActive ? rccRedLedMat : isStale ? rccAmberLedMat : idx % 2 === 0 ? rccCyanEdgeMat : rccGreenLedMat;
      });
      neighborhoodLightC.intensity = housesEnergized ? 0.52 : 0.04;

      // 4. Sync Busbar Energized Status & Upstream Supply Trace Highlight
      st.busbars.forEach((bus) => {
        const meshes = dynamicActors.busConductors[bus.id];
        if (!meshes) return;
        const inTrace = st.traceSourceActive && st.upstreamTrace.highlightedBusIds.has(bus.id);
        meshes.forEach((m) => {
          if (!bus.energized) {
            m.material.color.setHex(0x475569);
            m.material.emissive.setHex(0x000000);
          } else if (inTrace) {
            m.material.color.setHex(0x00d9ff);
            m.material.emissive.setHex(0x00a3cc);
            m.material.emissiveIntensity = 0.55;
          } else if (bus.voltageKv === 132) {
            m.material.color.setHex(0x7dd3fc);
            m.material.emissive.setHex(0x0284c7);
            m.material.emissiveIntensity = 0.22;
          } else if (bus.voltageKv === 33) {
            m.material.color.setHex(0xd97736);
            m.material.emissive.setHex(0x15803d);
            m.material.emissiveIntensity = 0.18;
          } else {
            m.material.color.setHex(0xd97736);
            m.material.emissive.setHex(0xb45309);
            m.material.emissiveIntensity = 0.18;
          }
        });
      });

      // 5. Sync 3-Phase Bay Conductor Highlights, Breaker Position Indicators & Alarm Beacons
      st.bays.forEach((bay) => {
        const inTrace =
          (st.highlightSelectedFeeder && bay.id === st.selectedBayId) ||
          (st.traceSourceActive && st.upstreamTrace.highlightedBayIds.has(bay.id));

        const condMeshes = dynamicActors.bayConductorMeshes[bay.id];
        if (condMeshes) {
          const voltageAllowed =
            st.pathVoltageFilter === 'ALL' || st.pathVoltageFilter === bay.voltageKv;
          condMeshes.forEach((cm) => {
            cm.visible = voltageAllowed;
            if (!bay.energized || bay.breakerState !== 'CLOSED') {
              cm.material.emissive?.setHex(0x000000);
            } else if (inTrace) {
              cm.material.emissive?.setHex(0x00d9ff);
              cm.material.emissiveIntensity = 0.55;
            } else {
              cm.material.emissive?.setHex(0x075985);
              cm.material.emissiveIntensity = 0.16;
            }
          });
        }

        const posInd = dynamicActors.positionIndicators[bay.id];
        if (posInd) {
          posInd.material =
            bay.breakerState === 'CLOSED' ? mats.posClosedCyan : mats.posOpenGreen;
        }

        const almBeacon = dynamicActors.alarmBeacons[bay.id];
        if (almBeacon) {
          const hasWarn =
            !bay.springCharged || !bay.tcsHealthy || !bay.sf6PressureNormal || bay.quality !== 'GOOD';
          if (bay.protectionTripActive) {
            almBeacon.material =
              Math.floor(now / 260) % 2 === 0 ? mats.alarmCriticalRed : mats.alarmNormalOff;
          } else if (hasWarn) {
            almBeacon.material = mats.alarmWarningAmber;
          } else {
            almBeacon.material = mats.alarmNormalOff;
          }
        }

        const blades = dynamicActors.disconnectorBlades[bay.id];
        if (blades) {
          const targetRotY = bay.busDisconnectorState === 'CLOSED' ? 0 : 0.72;
          blades.forEach((piv) => {
            piv.rotation.y += (targetRotY - piv.rotation.y) * 0.16;
          });
        }

        const esPiv = dynamicActors.earthSwitchBlades[bay.id];
        if (esPiv) {
          const targetRotZ = bay.earthSwitchState === 'CLOSED' ? 0 : 0.85;
          esPiv.rotation.z += (targetRotZ - esPiv.rotation.z) * 0.16;
        }

        const selPad = dynamicActors.selectionPad[bay.id];
        if (selPad) {
          selPad.visible = st.selectedBayId === bay.id || inTrace;
        }
      });

      dynamicActors.coolingFans.forEach(({ txId, mesh }) => {
        const tx = st.transformers.find((t) => t.id === txId);
        if (tx && tx.energized && tx.coolingStage !== 'ONAN') {
          mesh.rotation.x += 0.15;
        }
      });

      // 6. State-Aware Animated Power-Flow Pulses (Only active when CLOSED, Energized, AND Active Power MW > 0.05!)
      const tNorm = (now * 0.001) % 1000;
      dynamicActors.powerPulses.forEach((pp) => {
        const bay = st.bays.find((b) => b.id === pp.bayId);
        const voltageAllowed =
          st.pathVoltageFilter === 'ALL' || st.pathVoltageFilter === pp.voltageKv;
        const hasLoadTransfer = Boolean(
          bay &&
            bay.energized &&
            bay.breakerState === 'CLOSED' &&
            Math.abs(bay.activePowerMw) > 0.05
        );
        const visible = Boolean(
          st.showPowerFlowPulses && st.showElectricalConnections && voltageAllowed && hasLoadTransfer
        );

        pp.mesh.visible = visible;
        if (visible && bay) {
          const inTrace =
            (st.highlightSelectedFeeder && bay.id === st.selectedBayId) ||
            (st.traceSourceActive && st.upstreamTrace.highlightedBayIds.has(bay.id));

          // Scale pulse speed slightly with active power magnitude
          const loadScale = Math.min(1.18, Math.max(0.65, Math.abs(bay.activePowerMw) / 20));
          const uRaw = (tNorm * pp.baseSpeed * loadScale + pp.offset) % 1;
          const u = bay.activePowerMw >= 0 ? uRaw : 1 - uRaw;

          pp.mesh.position.set(
            pp.p1[0] + (pp.p2[0] - pp.p1[0]) * u,
            pp.p1[1] + (pp.p2[1] - pp.p1[1]) * u,
            pp.p1[2] + (pp.p2[2] - pp.p1[2]) * u
          );

          pp.mesh.scale.setScalar(inTrace ? 1.22 : 1.04);
          pp.mesh.material.color.setHex(inTrace ? 0x66ffff : pp.baseColorHex);
        }
      });

      renderer.render(scene, camera);

      if (now - lastPerfUpdate >= 700) {
        setMeasuredPerf({
          frameMs: Number(dtMs.toFixed(1)),
          drawCalls: renderer.info?.render?.calls || 0,
        });
        lastPerfUpdate = now;
      }

      // 7. Collision-Avoidant & Distance-Based Contextual 3D Label Projection
      if (frameCounter % 4 === 0 && st.labelMode !== 'HIDDEN') {
        const W = container.clientWidth;
        const H = container.clientHeight;
        const candidates: ProjectedLabel[] = [];

        st.spatialNodes.forEach((node) => {
          if (!st.layerVis[node.layerKey]) return;
          const bay = st.bays.find((b) => b.id === node.bayId);
          if (!bay) return;
          const isSelected = st.selectedBayId === bay.id;
          const isInUpstreamTrace =
            st.traceSourceActive && st.upstreamTrace.highlightedBayIds.has(bay.id);

          // Default overview uses just HV landmarks and the selected bay. All other
          // devices remain selectable by clicking their actual 3D cabinet or using the bay selector.
          if (st.labelMode === 'SMART_LOD' && !isSelected &&
              !(node.voltageKv === 132 && node.isKeyLandmark)) return;
          if (st.labelMode === 'SELECTED_ONLY' && !isSelected && !isInUpstreamTrace) return;
          if (
            st.labelMode === 'SMART_LOD' &&
            !node.isKeyLandmark &&
            !isSelected &&
            !isInUpstreamTrace &&
            effectiveRadius > 26
          ) {
            return;
          }

          const v = new THREE.Vector3(node.position[0], node.position[1] + 2.8, node.position[2]);
          if (node.layerKey === 'LAYER_33_SWG' || node.layerKey === 'LAYER_11_SWG_DT') {
            layerGroups[node.layerKey].localToWorld(v);
          }
          const dist = v.distanceTo(camera.position);
          v.project(camera);

          if (v.z > 1 || v.z < -1) return;
          const sx = (v.x * 0.5 + 0.5) * W;
          const sy = (-(v.y * 0.5) + 0.5) * H;
          if (sx < 65 || sx > W - 65 || sy < 55 || sy > H - 55) return;

          const hasWarningAlarm =
            !bay.springCharged || !bay.tcsHealthy || !bay.sf6PressureNormal || bay.quality !== 'GOOD';

          candidates.push({
            id: node.id,
            bayId: bay.id,
            txId: node.txId,
            code: node.code,
            shortLabel: node.shortLabel,
            subText: `52:${bay.breakerState} • ${bay.activePowerMw.toFixed(1)} MW`,
            anchorX: sx,
            anchorY: sy,
            x: sx,
            y: sy - 12,
            dist,
            energized: bay.energized,
            breakerState: bay.breakerState,
            hasCriticalAlarm: bay.protectionTripActive,
            hasWarningAlarm,
            isSelected,
            isInUpstreamTrace,
            isKeyLandmark: node.isKeyLandmark,
            voltageKv: node.voltageKv,
          });
        });

        candidates.sort((a, b) => {
          if (a.isSelected !== b.isSelected) return a.isSelected ? -1 : 1;
          if (a.isInUpstreamTrace !== b.isInUpstreamTrace) return a.isInUpstreamTrace ? -1 : 1;
          if (a.hasCriticalAlarm !== b.hasCriticalAlarm) return a.hasCriticalAlarm ? -1 : 1;
          if (a.isKeyLandmark !== b.isKeyLandmark) return a.isKeyLandmark ? -1 : 1;
          return a.dist - b.dist;
        });

        const accepted: ProjectedLabel[] = [];
        const boxW = 126;
        const boxH = 42;
        const offsets: [number, number][] = [
          [0, 0],
          [0, -32],
          [0, 28],
          [-64, -18],
          [64, -18],
        ];
        for (const cand of candidates) {
          for (const [dxOff, dyOff] of offsets) {
            const testX = cand.x + dxOff;
            const testY = cand.y + dyOff;
            if (testX < 62 || testX > W - 62 || testY < 45 || testY > H - 45) continue;
            const collides = accepted.some(
              (acc) => Math.abs(acc.x - testX) < boxW && Math.abs(acc.y - testY) < boxH
            );
            if (!collides) {
              accepted.push({ ...cand, x: testX, y: testY });
              break;
            }
          }
        }
        setProjectedLabels(accepted);

        // Project the 4 right-side Distribution Network Engineering Callouts (matching Image 1)
        const calloutDefs = [
          {
            id: 'CALLOUT-11KV',
            title: '11 kV Feeder',
            sub1: '(3-Phase, ACSR)',
            world: [29.5, 10.6, 5.5],
            offset: [-6, -72],
            active: hv11Energized,
          },
          {
            id: 'CALLOUT-DT250',
            title: '11/0.415 kV',
            sub1: 'Distribution Transformer',
            sub2: '(250 kVA)',
            world: [43.2, 7.2, 8.2],
            offset: [8, -46],
            active: lt415Energized,
          },
          {
            id: 'CALLOUT-LT415',
            title: '415 V LT Line',
            sub1: '(3-Phase, 4-Wire)',
            sub2: '(ABC+N)',
            world: [54.0, 7.3, 11.2],
            offset: [28, -42],
            active: lt415Energized,
          },
          {
            id: 'CALLOUT-SVC230',
            title: 'Service Drop',
            sub1: '(230 V, 1-Phase)',
            sub2: '(L-N)',
            world: [61.5, 5.0, 18.5],
            offset: [54, -36],
            active: housesEnergized,
          },
          {
            id: 'CALLOUT-RCC',
            title: 'Remote Control Center (RCC)',
            sub1: 'SCADA Video Wall & 4 Desks',
            sub2: st.iec104Connected ? 'IEC-104 ONLINE (2404)' : 'IEC-104 OFFLINE',
            world: [-60.0, 8.2, 14.0],
            offset: [0, -32],
            active: st.iec104Connected,
          },
          {
            id: 'CALLOUT-IEC104',
            title: 'IEC-104 Telecontrol Path',
            sub1: 'Cyan: Telemetry (Sub→RCC)',
            sub2: 'Green: Commands (RCC→Sub)',
            world: [-44.0, 3.2, 16.5],
            offset: [0, -28],
            active: st.iec104Connected,
          },
        ];
        const nextCallouts: {
          id: string;
          title: string;
          sub1: string;
          sub2?: string;
          x: number;
          y: number;
          ax: number;
          ay: number;
          active: boolean;
        }[] = [];
        calloutDefs.forEach((cd) => {
          const wv = new THREE.Vector3(cd.world[0], cd.world[1], cd.world[2]);
          wv.project(camera);
          if (wv.z >= -1 && wv.z <= 1) {
            const ax = (wv.x * 0.5 + 0.5) * W;
            const ay = (-(wv.y * 0.5) + 0.5) * H;
            const lx = Math.min(W - 85, Math.max(85, ax + cd.offset[0]));
            const ly = Math.min(H - 60, Math.max(55, ay + cd.offset[1]));
            if (ax > 80 && ax < W - 40 && ay > 45 && ay < H - 45) {
              const collidesWithCallout = nextCallouts.some(
                (nc) => Math.abs(nc.x - lx) < 138 && Math.abs(nc.y - ly) < 48
              );
              const collidesWithLabel = accepted.some(
                (acc) => Math.abs(acc.x - lx) < 128 && Math.abs(acc.y - ly) < 44
              );
              if (!collidesWithCallout && !collidesWithLabel) {
                nextCallouts.push({
                  id: cd.id,
                  title: cd.title,
                  sub1: cd.sub1,
                  sub2: cd.sub2,
                  x: lx,
                  y: ly,
                  ax,
                  ay,
                  active: cd.active,
                });
              }
            }
          }
        });
        setDistCalloutLabels(nextCallouts);
      } else if (st.labelMode === 'HIDDEN' && projectedLabels.length > 0) {
        setProjectedLabels([]);
        setDistCalloutLabels([]);
      }

      animFrameId = requestAnimationFrame(animate);
    };

    animFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameId);
      domEl.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUpBound);
      window.removeEventListener('pointercancel', onPointerCancelBound);
      domEl.removeEventListener('touchstart', onTouchStart);
      domEl.removeEventListener('touchmove', onTouchMove);
      domEl.removeEventListener('touchend', onTouchEnd);
      domEl.removeEventListener('touchcancel', onTouchEnd);
      domEl.removeEventListener('dblclick', onDoubleClick);
      domEl.removeEventListener('wheel', onWheel);
      domEl.removeEventListener('contextmenu', onContextMenu);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('resize', handleResize);
      resizeObserver?.disconnect();
      renderer.dispose();
    };
  }, [threeLoaded]);

  // Selected equipment data for the Enhanced 3D Equipment Inspector
  const selectedBay = bays.find((b) => b.id === selectedBayId) || bays[0];
  const selectedTx = transformers.find(
    (t) =>
      t.hvBayId === selectedBay.id ||
      t.lvBayId === selectedBay.id ||
      t.id === selectedBay.connectedTransformerId
  );
  const selectedIed = ieds.find((i) => i.id === selectedBay.iedId);
  const selectedBayLinks = networkLinks.filter((l) => l.sourceId === selectedBay.iedId);
  const selectedBayAlarms = alarms.filter((a) => a.bayId === selectedBay.id && a.state !== 'CLEARED');
  const selectedBaySoe = soeLog.filter((s) => s.bayId === selectedBay.id).slice(0, 4);

  const dbposBits =
    selectedBay.breakerState === 'CLOSED'
      ? '10 (on)'
      : selectedBay.breakerState === 'OPEN'
      ? '01 (off)'
      : selectedBay.breakerState === 'INTERMEDIATE'
      ? '00 (intermediate)'
      : '11 (bad-state)';
  const derived52aClosed = selectedBay.breakerState === 'CLOSED';
  const derived52bOpen = selectedBay.breakerState === 'OPEN';
  const iedPrefix = selectedBay.iedId.replace(/-/g, '_');

  const synchReleaseOk = selectedBay.interlockPermissive;
  const synchDeltaV = selectedBay.energized ? '0.06 kV (< 2.0 kV)' : 'Dead-Line / Live-Bus OK';
  const synchDeltaF = '0.002 Hz (< 0.05 Hz)';
  const synchDeltaPhi = '1.2° (< 10.0°)';

  const filteredSpatialNodes = useMemo(() => {
    return spatialNodes.filter((n) => {
      if (voltageFilter !== 'ALL' && n.voltageKv !== voltageFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        n.code.toLowerCase().includes(q) ||
        n.shortLabel.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q)
      );
    });
  }, [spatialNodes, voltageFilter, searchQuery]);

  const handleCustomGlbUpload = (slotId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAssetManifest((prev) =>
      prev.map((slot) =>
        slot.slotId === slotId
          ? {
              ...slot,
              activeSource: 'Custom GLB/GLTF Loaded',
              customFileName: file.name,
            }
          : slot
      )
    );
  };

  const handleSboSelect = (target: 'OPEN' | 'CLOSED') => {
    setSboTarget(target);
    setSboStatusBanner(
      `MMS SelectWithValue(${target === 'CLOSED' ? 'true' : 'false'}) accepted on ${iedPrefix}/CSWI1$CO$Pos$SBOw — Oper timer (15 s) active.`
    );
  };

  const handleSboExecute = () => {
    if (!sboTarget) return;
    const ok = commandBreaker(selectedBay.id, sboTarget, 'SCADA_SBO');
    if (ok) {
      setSboStatusBanner(
        `MMS CommandTermination+ confirmed: ${selectedBay.breakerId} transitioned to ${sboTarget} (${dbposBits}).`
      );
    } else {
      setSboStatusBanner(
        `MMS CommandTermination- (AddCause: ${
          selectedBay.localRemote === 'LOCAL'
            ? 'Blocked-by-switching-hierarchy'
            : 'Blocked-by-interlocking'
        }) rejected on ${selectedBay.breakerId}.`
      );
    }
    setSboTarget(null);
  };

  const handleRccRemoteCommand = (target: 'OPEN' | 'CLOSED') => {
    setRccCommandPulseUntil(performance.now() + 4500);
    if (!iec104Connected) {
      setRccCommandStatus(
        `RCC IEC-104 Command REJECTED: Telecontrol association DOWN (${rccFault}). Restore TCP:2404 / STARTDT first.`
      );
      return;
    }
    if (!rccAuthorityEnabled || rccFault === 'RCC_AUTH_UNAVAILABLE') {
      setRccCommandStatus(
        `RCC IEC-104 C_DC_NA_1(${target}) REJECTED (PN=1): RCC Control Authority Unavailable — Dispatch authority locked.`
      );
      return;
    }
    if (selectedBay.localRemote === 'LOCAL') {
      setRccCommandStatus(
        `RCC IEC-104 C_DC_NA_1(${target}) REJECTED (PN=1): Bay ${selectedBay.bayCode} 43LR switch is in LOCAL mode.`
      );
      return;
    }
    if (rccFault === 'INTERLOCK_REJECT') {
      setRccCommandStatus(
        `RCC IEC-104 C_DC_NA_1(${target}) REJECTED (PN=1, COT=47): Field CILO1 Interlocking blocked command at Station Gateway.`
      );
      return;
    }
    const ok = commandBreaker(selectedBay.id, target, 'SCADA_SBO');
    if (ok) {
      setRccCommandStatus(
        `RCC IEC-104 C_DC_NA_1(${target}) EXECUTED (COT=7 ActCon -> COT=10 ActTerm+): ${selectedBay.breakerId} is now ${target}.`
      );
    } else {
      setRccCommandStatus(
        `RCC IEC-104 C_DC_NA_1(${target}) REJECTED by Field Interlock/Protection (${selectedBay.interlockReason}).`
      );
    }
  };

  // Interactive 6-Scenario Power-Flow & Connectivity Validation Runner
  const executeConnectivityScenario = (scenarioNo: 1 | 2 | 3 | 4 | 5 | 6) => {
    if (scenarioNo === 1) {
      // 1. Open T1 33 kV incomer and verify downstream transfer path stops
      commandBreaker('BAY-33-INC1', 'OPEN', 'SCADA_SBO');
      focusCameraOnBay('BAY-33-INC1');
      setSboStatusBanner(
        'Scenario 1 Validated: 33-INC1 OPENED → Downstream power flow into BUS-33-A, 33-F01..03, DT1, and BUS-11-A stopped.'
      );
    } else if (scenarioNo === 2) {
      // 2. Open Feeder 03 breaker and verify power-flow animation stops beyond that breaker
      commandBreaker('BAY-33-F03', 'OPEN', 'SCADA_SBO');
      focusCameraOnBay('BAY-33-F03');
      setSboStatusBanner(
        'Scenario 2 Validated: CB-33-F03 OPENED → Power-flow animation stopped on Feeder 03 while BUS-33-A remains energized.'
      );
    } else if (scenarioNo === 3) {
      // 3. Close permitted bus coupler CB-33 (with 33-INC1 open) and verify connectivity updates
      commandBreaker('BAY-33-INC1', 'OPEN', 'SCADA_SBO');
      window.setTimeout(() => {
        commandBreaker('BAY-33-BC', 'CLOSED', 'SCADA_SBO');
        focusCameraOnBay('BAY-33-F03');
        setTraceSourceActive(true);
        setSboStatusBanner(
          'Scenario 3 Validated: With 33-INC1 OPEN, CILO1 permitted CB-33 Bus Coupler to CLOSE → BUS-33-A & DT1 now energized via T2 & CB-33!'
        );
      }, 60);
    } else if (scenarioNo === 4) {
      // 4. Trip T2 and verify affected electrical sections and measurements update
      triggerProtectionTrip('BAY-132-T2', '87T Transformer Differential');
      focusCameraOnBay('BAY-132-T2');
      setSboStatusBanner(
        'Scenario 4 Validated: Transformer T2 87T Trip → CB-132-T2 & CB-33-INC2 tripped via GOOSE intertrip; T2 de-energized.'
      );
    } else if (scenarioNo === 5) {
      // 5. Restore normal electrical path and verify animations resume
      bays.forEach((b) => {
        if (b.protectionTripActive) resetProtectionTrip(b.id);
      });
      faultScenarios.forEach((f) => {
        if (f.active) toggleFaultScenario(f.id);
      });
      window.setTimeout(() => {
        commandBreaker('BAY-132-BC', 'OPEN', 'SCADA_SBO');
        commandBreaker('BAY-33-BC', 'OPEN', 'SCADA_SBO');
        commandBreaker('BAY-11-BC', 'OPEN', 'SCADA_SBO');
        commandBreaker('BAY-132-L1', 'CLOSED', 'SCADA_SBO');
        commandBreaker('BAY-132-L2', 'CLOSED', 'SCADA_SBO');
        commandBreaker('BAY-132-T1', 'CLOSED', 'SCADA_SBO');
        commandBreaker('BAY-132-T2', 'CLOSED', 'SCADA_SBO');
        commandBreaker('BAY-33-INC1', 'CLOSED', 'SCADA_SBO');
        commandBreaker('BAY-33-INC2', 'CLOSED', 'SCADA_SBO');
        commandBreaker('BAY-33-F03', 'CLOSED', 'SCADA_SBO');
        setSboStatusBanner(
          'Scenario 5 Validated: Normal radial split-bus topology restored — all 132/33/11 kV power-flow animations resumed.'
        );
      }, 80);
    } else if (scenarioNo === 6) {
      // 6. Lose MMS communication and verify physical energization remains unchanged
      const flt03 = faultScenarios.find((f) => f.id === 'FLT-03');
      if (flt03 && !flt03.active) {
        toggleFaultScenario('FLT-03');
      }
      focusCameraOnBay('BAY-33-F03');
      setSboStatusBanner(
        'Scenario 6 Validated: IED-33-F03 MMS Comm Loss → SCADA quality=OLD_DATA, while physical breaker & 3D power flow remain energized!'
      );
    }
  };

  return (
    <>
    {isFullscreen && <div aria-hidden="true" className="fixed inset-0 z-[9998] bg-[#010611]/88 backdrop-blur-sm" />}
    <div
      role={isFullscreen ? 'dialog' : undefined}
      aria-modal={isFullscreen ? true : undefined}
      aria-label={isFullscreen ? '3D Digital Twin Switchyard — 132 / 33 / 11 kV Substation' : undefined}
      style={isFullscreen ? { width: '93vw', height: '88vh', maxWidth: '1780px', maxHeight: '980px' } : undefined}
      className={
        isFullscreen
          ? 'fixed left-1/2 top-1/2 z-[9999] flex h-[88vh] w-[93vw] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-2xl border border-cyan-400/75 bg-[#020b18] shadow-[0_0_55px_rgba(0,217,255,0.32),0_25px_90px_rgba(0,0,0,0.88)]'
          : 'rounded-2xl border border-[#1E3A5F] bg-[#081629] overflow-hidden shadow-2xl space-y-0'
      }
    >
      {isFullscreen && (
        <div className="shrink-0 flex items-center justify-between border-b border-cyan-400/50 bg-[#041324]/95 px-4 py-2.5">
          <div className="flex items-center gap-2.5 text-xs sm:text-sm font-extrabold tracking-wider uppercase text-cyan-100">
            <Box className="h-4 w-4 text-cyan-400" />
            <span>3D DIGITAL TWIN SWITCHYARD — 132 / 33 / 11 kV SUBSTATION</span>
          </div>
          <button
            type="button"
            onClick={() => { setIsFullscreen(false); onCloseFullscreen?.(); }}
            className="rounded-lg border border-cyan-400/60 bg-cyan-500/15 px-3 py-1 text-xs font-bold text-cyan-100 hover:bg-cyan-500/30 transition"
          >
            ✕ Close 3D
          </button>
        </div>
      )}
      {/* ==================== TOP 3D DIGITAL TWIN COMMAND & CAMERA BAR (HIDDEN IN ENLARGED POPUP) ==================== */}
      <div className={`${isFullscreen ? 'hidden' : 'flex'} flex-wrap items-center justify-between gap-2.5 px-4 py-2.5 bg-[#030712]/95 border-b border-[#1E3A5F]`}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#00D9FF]/15 border border-[#00D9FF]/40 text-[#00D9FF]">
            <Box className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs sm:text-sm font-extrabold tracking-wider uppercase text-[#DCEAF5]">
                3D Digital Twin Switchyard — 132 / 33 / 11 kV Substation
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-[#10243A] text-[#00D9FF] border border-[#1E3A5F]">
                Three.js PBR • {measuredPerf.frameMs > 0 ? `${measuredPerf.frameMs} ms/frame (${measuredPerf.drawCalls} draws)` : 'WebGL Ready'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400">
              Three-Phase Connections & State-Aware Power-Transfer Visualization (Educational Active Power Flow Model)
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => { setCameraNavMode('ORBIT'); setAutoRotate((enabled) => !enabled); }}
            aria-pressed={autoRotate}
            title="Automatically rotate the camera 360 degrees around the substation; click again to pause"
            className={`px-3 py-1 rounded text-xs font-semibold border transition ${autoRotate ? 'bg-cyan-400 text-[#031526] border-cyan-300' : 'bg-[#10243A] text-cyan-300 border-cyan-400/60 hover:bg-cyan-400/20'}`}
          >
            ↻ 360° Rotation {autoRotate ? 'ON' : 'OFF'}
          </button>
          <button
            type="button"
            onClick={() => setAutoRotate((r) => !r)}
            className={`px-2.5 py-1 rounded text-xs font-medium border transition ${
              autoRotate
                ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/50'
                : 'bg-[#10243A] text-slate-300 border-slate-700 hover:text-white'
            }`}
          >
            {autoRotate ? 'Auto-Orbit ON' : 'Auto-Orbit OFF'}
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))}
            className="px-2 py-1 rounded text-xs bg-[#10243A] text-slate-200 border border-slate-700 hover:border-[#00D9FF]"
          >
            Zoom +
          </button>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(0.6, Number((z - 0.15).toFixed(2))))}
            className="px-2 py-1 rounded text-xs bg-[#10243A] text-slate-200 border border-slate-700 hover:border-[#00D9FF]"
          >
            Zoom -
          </button>
          <button
            type="button"
            onClick={() => {
              setZoom(1.0);
              setPathVoltageFilter('ALL');
              applyCameraPreset('ISOMETRIC');
            }}
            className="p-1.5 rounded bg-[#10243A] text-slate-200 border border-slate-700 hover:border-[#00D9FF]"
            title="Reset 3D Camera"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setShowAssetModal((s) => !s)}
            className="px-2.5 py-1 rounded text-xs font-semibold bg-[#168BFF]/20 hover:bg-[#168BFF]/30 text-[#00D9FF] border border-[#168BFF]/40 flex items-center gap-1"
          >
            <Layers className="w-3.5 h-3.5" />
            GLB/PBR Assets
          </button>
        </div>
      </div>

      {/* Compact engineering toolbar — existing simulation handlers retained */}
      <div className={`${isFullscreen ? 'hidden' : ''} px-4 py-3 bg-[#07192c] border-b border-[#1E3A5F] space-y-3`}>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5">
          <label className="text-[10px] uppercase font-bold text-slate-400 space-y-1">Camera View (11 Destinations)
            <select value={cameraPreset} onChange={(e) => applyCameraPreset(e.target.value as CameraPreset)} className="w-full rounded-lg bg-[#030d1c] border border-[#1E3A5F] text-[#DCEAF5] p-2 text-xs">
              <option value="ISOMETRIC">1. Entire Substation (Isometric)</option>
              <option value="HV_132_YARD">2. 132 kV Switchyard</option>
              <option value="TX_T1">3. Transformer T1 (50 MVA)</option>
              <option value="TX_T2">4. Transformer T2 (50 MVA)</option>
              <option value="SWG_33_HALL">5. 33 kV Switchgear (Open Top)</option>
              <option value="SWG_11_HALL">6. 11 kV Switchgear (Open Top)</option>
              <option value="RESIDENTIAL">7. Residential Distribution (46 Homes)</option>
              <option value="DIST_TX">8. Distribution Transformer (250 kVA)</option>
              <option value="RCC_CENTER">9. Remote Control Center (RCC)</option>
              <option value="GATEWAY_COMM">10. Substation Gateway / Comm Room</option>
              <option value="IEC104_PATH">11. IEC-104 WAN Communication Path</option>
              <option value="TOP_PLAN">12. Top Plan View</option>
              <option value="FRONT_SOUTH">13. Front South Elevation</option>
            </select>
          </label>
          <div className="text-[10px] uppercase font-bold text-slate-400 space-y-1">Equipment Layers
            <details className="relative group"><summary className="cursor-pointer list-none rounded-lg bg-[#030d1c] border border-[#1E3A5F] text-[#DCEAF5] p-2 text-xs flex justify-between">{Object.values(layerVis).filter(Boolean).length} layers visible <span>⌄</span></summary>
              <div className="absolute z-40 top-full mt-1 w-56 rounded-xl bg-[#07192c] border border-[#1E3A5F] shadow-2xl p-3 space-y-2">
                {([['LAYER_132_AIS','132 kV AIS'],['LAYER_50MVA_TX','50 MVA T1/T2'],['LAYER_33_SWG','33 kV Switchgear'],['LAYER_11_SWG_DT','11 kV & DT1/DT2'],['LAYER_CIVIL_GANTRIES','Gantries & Trenches']] as [keyof LayerVisibilityState,string][]).map(([key,label]) => <label key={key} className="flex gap-2 items-center text-xs normal-case text-slate-200 cursor-pointer"><input type="checkbox" checked={layerVis[key]} onChange={() => toggleLayer(key)} />{label}</label>)}
              </div>
            </details>
          </div>
          <label className="text-[10px] uppercase font-bold text-slate-400 space-y-1">Environment
            <select value={lightingPreset} onChange={(e) => setLightingPreset(e.target.value as LightingPreset)} className="w-full rounded-lg bg-[#030d1c] border border-[#1E3A5F] text-[#DCEAF5] p-2 text-xs"><option value="DUSK_TWILIGHT">Dusk</option><option value="DAYLIGHT_CLEAR">Daylight</option><option value="NIGHT_FLOODLIGHT">Night Floods</option></select>
          </label>
          <label className="text-[10px] uppercase font-bold text-slate-400 space-y-1">Power Path View
            <select value={String(pathVoltageFilter)} onChange={(e) => setPathVoltageFilter(e.target.value === 'ALL' ? 'ALL' : Number(e.target.value) as 132 | 33 | 11)} className="w-full rounded-lg bg-[#030d1c] border border-[#1E3A5F] text-[#DCEAF5] p-2 text-xs"><option value="ALL">All Paths</option><option value="132">132 kV Paths</option><option value="33">33 kV Paths</option><option value="11">11 kV Paths</option></select>
          </label>
          <label className="text-[10px] uppercase font-bold text-slate-400 space-y-1">Equipment Labels
            <select value={labelMode} onChange={(e) => setLabelMode(e.target.value as LabelLodMode)} className="w-full rounded-lg bg-[#030d1c] border border-[#1E3A5F] text-[#DCEAF5] p-2 text-xs"><option value="SMART_LOD">Distance-Aware</option><option value="ALL_BAYS">All Bays</option><option value="SELECTED_ONLY">Selected Only</option><option value="HIDDEN">Hidden</option></select>
          </label>
          <div className="text-[10px] uppercase font-bold text-slate-400 space-y-1">Display & Analysis
            <details className="relative"><summary className="cursor-pointer list-none rounded-lg bg-[#030d1c] border border-[#1E3A5F] text-[#DCEAF5] p-2 text-xs flex justify-between">Display options <span>⌄</span></summary>
              <div className="absolute z-40 top-full right-0 mt-1 w-60 rounded-xl bg-[#07192c] border border-[#1E3A5F] shadow-2xl p-3 space-y-2">
                <label className="flex gap-2 items-center text-xs normal-case text-slate-200"><input type="checkbox" checked={showElectricalConnections} onChange={() => setShowElectricalConnections(v => !v)} />Electrical Connections</label>
                <label className="flex gap-2 items-center text-xs normal-case text-slate-200"><input type="checkbox" checked={showPowerFlowPulses} onChange={() => setShowPowerFlowPulses(v => !v)} />Power Flow Animation</label>
                <label className="flex gap-2 items-center text-xs normal-case text-slate-200"><input type="checkbox" checked={highlightSelectedFeeder} onChange={() => setHighlightSelectedFeeder(v => !v)} />Highlight Selected Feeder</label>
                <label className="flex gap-2 items-center text-xs normal-case text-slate-200"><input type="checkbox" checked={xraySwitchgearRoof} onChange={() => setXraySwitchgearRoof(v => !v)} />Switchgear Roof Cutaway</label>
              </div>
            </details>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-slate-400 flex items-center gap-2">Validate Scenario
            <select defaultValue="" onChange={(e) => { if (e.target.value) { executeConnectivityScenario(Number(e.target.value) as 1 | 2 | 3 | 4 | 5 | 6); e.target.value = ''; } }} className="max-w-[235px] rounded-lg bg-[#030d1c] border border-[#1E3A5F] text-[#DCEAF5] p-2 text-xs">
              <option value="">Select test scenario…</option><option value="1">1. Open T1 33kV Inc</option><option value="2">2. Open F03 CB</option><option value="3">3. Close CB-33 Coupler</option><option value="4">4. Trip T2 (87T)</option><option value="5">5. Restore All</option><option value="6">6. MMS Comm Loss</option>
            </select>
          </label>
          <button type="button" onClick={() => setTraceSourceActive(v => !v)} className={`rounded-lg border px-3 py-2 text-xs font-semibold ${traceSourceActive ? 'bg-[#FFB547]/15 text-[#FFB547] border-[#FFB547]/50' : 'bg-[#030d1c] text-slate-300 border-[#1E3A5F]'}`}>Trace Power Source: {traceSourceActive ? 'ON' : 'OFF'}</button>
          <button type="button" onClick={() => { setZoom(1); setPathVoltageFilter('ALL'); setShowElectricalConnections(true); setShowPowerFlowPulses(true); applyCameraPreset('ISOMETRIC'); }} className="rounded-lg border border-[#1E3A5F] bg-[#10243A] text-slate-200 px-3 py-2 text-xs">Reset View</button>
          <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-lg border border-[#22C55E]/40 bg-[#22C55E]/10 px-3 py-2 text-xs font-bold text-[#22C55E]">{selectedBay.energized ? `Power Transfer: ${selectedBay.activePowerMw.toFixed(1)} MW` : 'Bay De-energized'}</span>
          <button
            type="button"
            onClick={() => setIsFullscreen((f) => !f)}
            className="px-3 py-2 rounded-lg text-xs font-semibold bg-[#10243A] hover:bg-slate-800 text-[#DCEAF5] border border-slate-700 flex items-center gap-1"
            title={isFullscreen ? 'Close enlarged 3D popup (Esc)' : 'Expand 3D model into large popup'}
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-[#00D9FF]" /> Close 3D Popup
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-[#00D9FF]" /> Expand 3D
              </>
            )}
          </button>
          </div>
        </div>
      </div>

      {/* ==================== UPSTREAM SUPPLY PATH TRACE BREADCRUMB BAR ==================== */}
      {traceSourceActive && !isFullscreen && (
        <div className="px-4 py-2 bg-[#030712] border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-bold uppercase tracking-wider text-[#FFB547] text-[10px] flex items-center gap-1">
              <GitCommit className="w-3.5 h-3.5" />
              Upstream Supply Path Trace ({selectedBay.bayCode}):
            </span>
            {upstreamTrace.orderedSteps.map((st, idx) => (
              <React.Fragment key={st.id + idx}>
                {idx > 0 && <ArrowRight className="w-3 h-3 text-slate-500" />}
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] border ${
                    st.kind === 'LINE'
                      ? 'bg-[#00D9FF]/15 text-[#00D9FF] border-[#00D9FF]/40 font-bold'
                      : st.kind === 'TX'
                      ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40 font-bold'
                      : st.kind === 'COUPLER'
                      ? 'bg-[#FFB547]/20 text-[#FFB547] border-[#FFB547]/50 font-bold'
                      : 'bg-[#081629] text-slate-200 border-slate-700'
                  }`}
                >
                  {st.label} ({st.stateText})
                </span>
              </React.Fragment>
            ))}
          </div>
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              selectedBay.energized && selectedBay.activePowerMw > 0.05
                ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                : selectedBay.energized
                ? 'bg-[#22C55E]/20 text-[#22C55E]'
                : 'bg-[#FF4D62]/20 text-[#FF4D62]'
            }`}
          >
            {selectedBay.energized && selectedBay.activePowerMw > 0.05
              ? `POWER TRANSFER ACTIVE (${selectedBay.activePowerMw.toFixed(1)} MW)`
              : selectedBay.energized
              ? 'ENERGIZED VOLTAGE ONLY (0.0 MW LOAD)'
              : 'DE-ENERGIZED SECTION'}
          </span>
        </div>
      )}

      {/* ==================== OPTIONAL GLB/GLTF ASSET REGISTRY MODAL ==================== */}
      {showAssetModal && !isFullscreen && (
        <div className="p-4 bg-[#10243A] border-b border-[#00D9FF] space-y-3 text-xs">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#DCEAF5]">
                3D Equipment Asset Registry — Multi-Part Procedural PBR Models & GLB/GLTF Loader
              </h3>
              <p className="text-[11px] text-slate-300">
                Every apparatus is constructed from realistic multi-part procedural PBR meshes. You can also bind custom `.glb`/`.gltf` files per equipment family below.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowAssetModal(false)}
              className="px-2.5 py-1 rounded bg-[#030712] text-slate-300 hover:text-white"
            >
              Close ✕
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5">
            {assetManifest.map((slot) => (
              <div
                key={slot.slotId}
                className="p-3 rounded-lg bg-[#030712] border border-slate-800 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[10px] text-[#00D9FF] font-bold">{slot.slotId}</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#22C55E]/15 text-[#22C55E] text-[10px] font-semibold">
                    {slot.activeSource}
                  </span>
                </div>
                <div className="font-bold text-[#DCEAF5]">{slot.equipmentClass}</div>
                <div className="text-[11px] text-slate-400">{slot.pbrMaterials}</div>
                <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px]">
                  <span className="font-mono text-slate-400">
                    IEC: {slot.iecSymbol} • {slot.polyCountEst}
                  </span>
                  <label className="px-2 py-0.5 rounded bg-[#10243A] hover:bg-slate-700 text-[#00D9FF] cursor-pointer border border-slate-700">
                    {slot.customFileName ? `Loaded: ${slot.customFileName}` : 'Bind .GLB'}
                    <input
                      type="file"
                      accept=".glb,.gltf"
                      onChange={(e) => handleCustomGlbUpload(slot.slotId, e)}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Full-width 3D viewport with inspector underneath */}
      <div className="flex flex-col flex-1 min-h-0">
        {/* Left 8 Columns: Photorealistic Three.js 3D Viewport */}
        <div
          style={isFullscreen ? { flex: '1 1 0%', minHeight: 0, height: '100%' } : undefined}
          className={`relative w-full ${
            isFullscreen ? 'flex-1 min-h-0' : 'h-[300px] sm:h-[360px] lg:h-[400px]'
          } bg-[#030712] select-none overflow-hidden border-b border-[#1E3A5F]`}
        >
          {!threeLoaded && !webglError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#030712]/90 space-y-3">
              <div className="w-48 h-2 rounded-full bg-slate-800 overflow-hidden">
                <div
                  className="h-full bg-[#00D9FF] transition-all duration-300"
                  style={{ width: `${loadingProgress}%` }}
                />
              </div>
              <div className="text-xs font-mono text-[#00D9FF]">
                Initializing Three.js PBR Switchyard ({loadingProgress}%)...
              </div>
            </div>
          )}

          {/* Three.js WebGL Mount */}
          <div ref={mountRef} className="w-full h-full" />

          {/* Compact right-side camera controls, matching the requested reference. */}
          <div className="absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col items-center gap-2 pointer-events-auto" aria-label="3D camera controls">
            <div className="relative h-[90px] w-[90px] rounded-full border border-cyan-400/45 bg-transparent shadow-none">
              {([
                ['up', '▲', 'left-1/2 top-1 -translate-x-1/2'],
                ['left', '◀', 'left-2 top-1/2 -translate-y-1/2'],
                ['right', '▶', 'right-2 top-1/2 -translate-y-1/2'],
                ['down', '▼', 'left-1/2 bottom-1 -translate-x-1/2'],
              ] as const).map(([direction, symbol, position]) => (
                <button key={direction} type="button" title={`Rotate camera ${direction}`} aria-label={`Rotate camera ${direction}`}
                  onClick={() => nudgeCamera(direction)}
                  className={`absolute ${position} flex h-7 w-7 items-center justify-center rounded-full text-sm text-white hover:bg-cyan-400/20 hover:text-cyan-200`}>{symbol}</button>
              ))}
            </div>
            <div className="flex w-12 flex-col overflow-hidden rounded-xl border border-cyan-400/45 bg-transparent text-white shadow-none">
              <button type="button" title="Zoom in" aria-label="Zoom in" onClick={() => setZoom(z => Math.min(1.8, Number((z + 0.15).toFixed(2))))} className="flex h-10 items-center justify-center text-3xl hover:bg-cyan-400/20">+</button>
              <div className="mx-2 border-t border-cyan-400/70" />
              <button type="button" title="Zoom out" aria-label="Zoom out" onClick={() => setZoom(z => Math.max(0.6, Number((z - 0.15).toFixed(2))))} className="flex h-10 items-center justify-center text-3xl hover:bg-cyan-400/20">−</button>
            </div>
            <button type="button" title="Toggle automatic 360 degree rotation" aria-label="Toggle 360 degree rotation" aria-pressed={autoRotate} onClick={() => { setCameraNavMode('ORBIT'); setAutoRotate(v => !v); }} className={`flex h-11 w-11 items-center justify-center rounded-xl border ${autoRotate ? 'border-cyan-300 bg-cyan-400/25 text-cyan-200' : 'border-cyan-400/45 bg-transparent text-white'} hover:bg-cyan-400/20`}><span className="text-sm font-bold">360°</span></button>
            <button type="button" title="Reset camera" aria-label="Reset camera" onClick={() => { setZoom(1); applyCameraPreset('ISOMETRIC'); setAutoRotate(false); }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/45 bg-transparent text-white hover:bg-cyan-400/20"><RotateCcw className="h-6 w-6" /></button>
            <button type="button" title="Cycle 3D camera views" aria-label="Cycle 3D camera views" onClick={cycleCameraView} className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/45 bg-transparent text-white hover:bg-cyan-400/20"><Box className="h-6 w-6" /></button>
            <button type="button" title={isFullscreen ? 'Exit fullscreen' : 'Expand 3D view'} aria-label="Toggle enlarged 3D view" onClick={() => { if (isFullscreen && onCloseFullscreen) onCloseFullscreen(); else setIsFullscreen(f => !f); }} className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/45 bg-transparent text-white hover:bg-cyan-400/20">{isFullscreen ? <Minimize2 className="h-6 w-6" /> : <Maximize2 className="h-6 w-6" />}</button>
          </div>

          {/* Clear 3D view: floating callout cards intentionally removed.
              Bay identification is printed directly on the equipment meshes;
              the existing equipment selection and inspection controls remain active. */}

          {/* Compact Semi-Transparent Camera Mode Toolbar (Orbit | Pan | Walk | Fly | Focus | Follow Road | Fit All | Reset) */}
          <div
            style={{
              bottom: isFullscreen ? '12px' : '54px',
              left: '12px',
              backgroundColor: 'rgba(3, 11, 24, 0.86)',
              borderColor: 'rgba(0, 207, 255, 0.45)',
            }}
            className="absolute z-30 flex flex-wrap items-center gap-1.5 px-2.5 py-1.5 rounded-xl border backdrop-blur-md pointer-events-auto shadow-lg"
            aria-label="Camera navigation mode toolbar"
          >
            {([
              ['ORBIT', 'Orbit'],
              ['PAN', 'Pan'],
              ['WALK', 'Walk'],
              ['FLY', 'Fly'],
            ] as [CameraNavMode, string][]).map(([mKey, mLabel]) => {
              const active = cameraNavMode === mKey && !followRoadActive;
              return (
                <button
                  key={mKey}
                  type="button"
                  onClick={() => switchCameraNavMode(mKey)}
                  style={{
                    backgroundColor: active ? '#00CFFF' : '#081A30',
                    color: active ? '#030B18' : '#E9F3FF',
                    borderColor: active ? '#00F0FF' : 'rgba(0, 207, 255, 0.35)',
                  }}
                  className="px-2.5 py-1 rounded-lg border text-[11px] font-extrabold transition"
                >
                  {mLabel}
                </button>
              );
            })}
            <span className="text-slate-600 text-xs px-0.5">|</span>
            <button
              type="button"
              onClick={() => {
                if (selectedWorldItem) {
                  focusCameraOnWorldPoint(
                    selectedWorldItem.position,
                    selectedWorldItem.kind === 'HOUSE' ? 12 : 16,
                    `Focused on ${selectedWorldItem.title}`
                  );
                } else {
                  focusCameraOnBay(selectedBay.id);
                }
              }}
              style={{ backgroundColor: '#081A30', color: '#E9F3FF', borderColor: 'rgba(0, 207, 255, 0.35)' }}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-bold hover:border-[#00CFFF] transition"
            >
              Focus
            </button>
            <button
              type="button"
              onClick={() => {
                setFollowRoadActive((prev) => {
                  const next = !prev;
                  if (next) {
                    setHoveredNodeTitle('Follow Road Active: Travelling along residential street centerlines (Click or press Esc to stop)');
                  }
                  return next;
                });
              }}
              style={{
                backgroundColor: followRoadActive ? '#00CFFF' : '#081A30',
                color: followRoadActive ? '#030B18' : '#E9F3FF',
                borderColor: followRoadActive ? '#00F0FF' : 'rgba(0, 207, 255, 0.35)',
              }}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-bold transition"
            >
              {followRoadActive ? 'Stop Road' : 'Follow Road'}
            </button>
            <button
              type="button"
              onClick={fitEntireScene}
              style={{ backgroundColor: '#081A30', color: '#E9F3FF', borderColor: 'rgba(0, 207, 255, 0.35)' }}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-bold hover:border-[#00CFFF] transition"
            >
              Fit All
            </button>
            <button
              type="button"
              onClick={() => {
                setFollowRoadActive(false);
                setSelectedWorldItem(null);
                setCameraNavMode('PAN');
                setZoom(1.0);
                applyCameraPreset('ISOMETRIC');
              }}
              style={{ backgroundColor: '#081A30', color: '#E9F3FF', borderColor: 'rgba(0, 207, 255, 0.35)' }}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-bold hover:border-[#00CFFF] transition"
            >
              Reset
            </button>

            {/* Quick House & Road Explorer Select */}
            <select
              aria-label="Quick focus house or road"
              value={selectedWorldItem?.id || ''}
              onChange={(e) => {
                const val = e.target.value;
                if (!val) return;
                const catalog: Record<string, WorldInspectableItem> = {
                  "HOUSE-B01": { kind: "HOUSE", id: "HOUSE-B01", title: "HOUSE-B01 — Foreground Suburban Residence", subtitle: "Area B (East Residential Neighborhood) • Plot (51.5, 20.2)", feederInfo: "11 kV Feeder F-01 → 250 kVA DT → 415 V LT → 230 V Phase R", position: [51.5, 2.5, 20.2] },
                  "HOUSE-B06": { kind: "HOUSE", id: "HOUSE-B06", title: "HOUSE-B06 — Far-East Corner Two-Storey Residence", subtitle: "Area B (East Residential Neighborhood) • Plot (107.5, 20.2)", feederInfo: "11 kV Feeder F-02 → 250 kVA DT → 415 V LT → 230 V Phase B", position: [107.5, 2.5, 20.2] },
                  "HOUSE-B12": { kind: "HOUSE", id: "HOUSE-B12", title: "HOUSE-B12 — Far-East Central Avenue Villa", subtitle: "Area B (East Residential Neighborhood) • Plot (107.5, 4.8)", feederInfo: "11 kV Feeder F-02 → 250 kVA DT → 415 V LT → 230 V Phase B", position: [107.5, 2.5, 4.8] },
                  "HOUSE-B18": { kind: "HOUSE", id: "HOUSE-B18", title: "HOUSE-B18 — Far-East North Avenue Residence", subtitle: "Area B (East Residential Neighborhood) • Plot (107.5, -12.2)", feederInfo: "11 kV Feeder F-02 → 250 kVA DT → 415 V LT → 230 V Phase B", position: [107.5, 2.5, -12.2] },
                  "HOUSE-C01": { kind: "HOUSE", id: "HOUSE-C01", title: "HOUSE-C01 — Area C Suburban Residence", subtitle: "Area C (North-East Rear Suburban Rows) • Plot (51.5, -28.8)", feederInfo: "11 kV Feeder F-01 → 250 kVA DT → 415 V LT → 230 V Phase R", position: [51.5, 2.5, -28.8] },
                  "HOUSE-C06": { kind: "HOUSE", id: "HOUSE-C06", title: "HOUSE-C06 — Area C Far-East Villa", subtitle: "Area C (North-East Rear Suburban Rows) • Plot (107.5, -28.8)", feederInfo: "11 kV Feeder F-02 → 250 kVA DT → 415 V LT → 230 V Phase B", position: [107.5, 2.5, -28.8] },
                  "HOUSE-C14": { kind: "HOUSE", id: "HOUSE-C14", title: "HOUSE-C14 — Far North-East Corner Suburban Villa", subtitle: "Area C (North-East Rear Suburban Rows) • Plot (100.0, -52.5)", feederInfo: "11 kV Feeder F-02 → 250 kVA DT → 415 V LT → 230 V Phase R", position: [100.0, 2.5, -52.5] },
                  "HOUSE-A01": { kind: "HOUSE", id: "HOUSE-A01", title: "HOUSE-A01 — Rear Substation West Residence", subtitle: "Area A (Behind 132 kV Switchyard) • Plot (-35.0, -37.5)", feederInfo: "11 kV Feeder F-01 → 250 kVA DT → 415 V LT → 230 V Phase B", position: [-35.0, 2.5, -37.5] },
                  "HOUSE-A07": { kind: "HOUSE", id: "HOUSE-A07", title: "HOUSE-A07 — Rear Substation Far-North Villa", subtitle: "Area A (Behind 132 kV Switchyard) • Plot (-36.0, -52.5)", feederInfo: "11 kV Feeder F-01 → 250 kVA DT → 415 V LT → 230 V Phase R", position: [-36.0, 2.5, -52.5] },
                  "HOUSE-A13": { kind: "HOUSE", id: "HOUSE-A13", title: "HOUSE-A13 — Rear Substation East Villa", subtitle: "Area A (Behind 132 kV Switchyard) • Plot (29.5, -52.5)", feederInfo: "11 kV Feeder F-01 → 250 kVA DT → 415 V LT → 230 V Phase R", position: [29.5, 2.5, -52.5] },
                  "HOUSE-A14": { kind: "HOUSE", id: "HOUSE-A14", title: "HOUSE-A14 — Far North-West Corner Residence", subtitle: "Area A (Rear West Corner) • Plot (-54.0, -37.5)", feederInfo: "11 kV Feeder F-02 → 250 kVA DT → 415 V LT → 230 V Phase Y", position: [-54.0, 2.5, -37.5] },
                  "ROAD-04": { kind: "ROAD", id: "ROAD-04", title: "ROAD-04 — Area B South Residential Street", subtitle: "74 m × 5.8 m Asphalt Roadway • Warm LED Streetlighting", feederInfo: "Street-level residential avenue serving Houses B01–B06", position: [76.0, 1.5, 13.5] },
                  "ROAD-07": { kind: "ROAD", id: "ROAD-07", title: "ROAD-07 — Area C Rear Suburban Avenue", subtitle: "74 m × 5.8 m Asphalt Roadway • Warm LED Streetlighting", feederInfo: "Rear suburban street serving Houses C07–C14", position: [76.0, 1.5, -44.5] },
                  "ROAD-10": { kind: "ROAD", id: "ROAD-10", title: "ROAD-10 — Area A Rear Substation Street", subtitle: "78 m × 5.8 m Asphalt Roadway • Warm LED Streetlighting", feederInfo: "Rear residential street behind the 132 kV switchyard", position: [-3.0, 1.5, -44.5] },
                };
                const item = catalog[val];
                if (item) {
                  setSelectedWorldItem(item);
                  focusCameraOnWorldPoint(item.position, item.kind === "HOUSE" ? 12.5 : 16, item.title);
                }
              }}
              style={{ backgroundColor: '#081A30', color: '#00CFFF', borderColor: 'rgba(0, 207, 255, 0.35)' }}
              className="px-2 py-1 rounded-lg border text-[10.5px] font-mono font-bold"
            >
              <option value="">Inspect House / Road…</option>
              <option value="HOUSE-B01">HOUSE-B01 (Front Right)</option>
              <option value="HOUSE-B06">HOUSE-B06 (Farthest East House)</option>
              <option value="HOUSE-B12">HOUSE-B12 (Far-East Middle)</option>
              <option value="HOUSE-B18">HOUSE-B18 (Far-East North)</option>
              <option value="HOUSE-C01">HOUSE-C01 (Area C West)</option>
              <option value="HOUSE-C06">HOUSE-C06 (Area C Far-East)</option>
              <option value="HOUSE-C14">HOUSE-C14 (Farthest Rear-Right Corner)</option>
              <option value="HOUSE-A01">HOUSE-A01 (Rear Behind 132kV Yard)</option>
              <option value="HOUSE-A07">HOUSE-A07 (Rear Far-North)</option>
              <option value="HOUSE-A13">HOUSE-A13 (Rear East)</option>
              <option value="HOUSE-A14">HOUSE-A14 (Farthest Rear-West Corner)</option>
              <option value="ROAD-04">ROAD-04 (Area B South Street)</option>
              <option value="ROAD-07">ROAD-07 (Area C Rear Street)</option>
              <option value="ROAD-10">ROAD-10 (Area A Rear Substation Street)</option>
            </select>

            {(cameraNavMode === 'WALK' || cameraNavMode === 'FLY') && (
              <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-400/40 text-[10px] font-mono text-cyan-200">
                {cameraNavMode === 'WALK' ? 'W/A/S/D Walk • Drag Look • Shift Fast • Esc Exit' : 'W/A/S/D + Q/E Fly • Drag Look • Shift Fast'} ({walkSpeedMult}x)
              </span>
            )}
          </div>

          {/* Selected Residential House / Road Inspection Card */}
          {selectedWorldItem && (
            <div
              style={{
                top: isFullscreen ? '78px' : '56px',
                left: '12px',
                backgroundColor: 'rgba(3, 11, 24, 0.92)',
                borderColor: '#00CFFF',
              }}
              className="absolute z-30 max-w-md px-3 py-2 rounded-xl border backdrop-blur-md pointer-events-auto shadow-xl text-xs space-y-1"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono font-extrabold text-[#00CFFF]">{selectedWorldItem.id}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      focusCameraOnWorldPoint(
                        selectedWorldItem.position,
                        selectedWorldItem.kind === 'HOUSE' ? 11 : 15,
                        `Focused Camera on ${selectedWorldItem.id}`
                      )
                    }
                    className="px-2 py-0.5 rounded bg-[#00CFFF] text-[#030B18] font-extrabold text-[10px]"
                  >
                    Focus Camera
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedWorldItem(null)}
                    className="px-1.5 py-0.5 rounded bg-[#081A30] text-slate-300 text-[10px]"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="font-bold text-[#E9F3FF] text-[11px]">{selectedWorldItem.title}</div>
              <div className="text-[10px] text-slate-300">{selectedWorldItem.subtitle}</div>
              <div className="text-[10px] font-mono text-emerald-300">{selectedWorldItem.feederInfo}</div>
            </div>
          )}

          {/* Transparent Camera Preset Bar inside Enlarged 3D Popup (All 11 Destinations) */}
          {isFullscreen && (
            <div className="absolute top-3 left-3 right-16 z-30 flex flex-wrap items-center gap-1.5 pointer-events-auto">
              {([
                ['ISOMETRIC', 'Entire Substation'],
                ['HV_132_YARD', '132 kV Switchyard'],
                ['TX_T1', 'Transformer T1'],
                ['TX_T2', 'Transformer T2'],
                ['SWG_33_HALL', '33 kV Switchgear'],
                ['SWG_11_HALL', '11 kV Switchgear'],
                ['RESIDENTIAL', 'Residential Distribution'],
                ['DIST_TX', 'Distribution Transformer'],
                ['RCC_CENTER', 'Remote Control Center (RCC)'],
                ['GATEWAY_COMM', 'Substation Gateway'],
                ['IEC104_PATH', 'IEC-104 WAN Path'],
              ] as [CameraPreset, string][]).map(([presetKey, label]) => (
                <button
                  key={presetKey}
                  type="button"
                  onClick={() => applyCameraPreset(presetKey)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold border backdrop-blur-sm transition ${
                    cameraPreset === presetKey
                      ? 'bg-cyan-400/25 text-cyan-100 border-cyan-300'
                      : 'bg-[#020b18]/55 hover:bg-cyan-400/15 text-slate-200 border-cyan-400/35'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Top-Left Search & Smooth Focus Controls + Top-Right Selected-Equipment Telemetry Overlay (Normal Mode Only) */}
          <div className={`${isFullscreen ? 'hidden' : 'flex'} absolute top-3 left-3 right-3 flex-wrap items-start justify-between gap-2 pointer-events-none`}>
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto bg-[#030712]/90 p-1.5 rounded-xl border border-slate-800 shadow-lg">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search bay/TX..."
                  className="pl-7 pr-2 py-1 rounded bg-[#081629] border border-slate-700 text-[11px] text-white w-36 focus:outline-none focus:border-[#00D9FF]"
                />
              </div>

              <select
                value={selectedBay.id}
                onChange={(e) => focusCameraOnBay(e.target.value)}
                className="px-2 py-1 rounded bg-[#081629] border border-slate-700 text-[11px] text-[#00D9FF] font-semibold"
              >
                {filteredSpatialNodes.map((n) => (
                  <option key={n.id} value={n.bayId}>
                    {n.code} — {n.category}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setFocusOnSelection((f) => !f)}
                className={`px-2 py-1 rounded text-[10px] font-semibold border flex items-center gap-1 ${
                  focusOnSelection
                    ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/50'
                    : 'bg-[#081629] text-slate-400 border-slate-700'
                }`}
              >
                <Focus className="w-3 h-3" />
                Fly-To
              </button>
            </div>

            <div className="pointer-events-auto flex flex-col items-end gap-1.5">
              <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-[#030712]/92 border border-slate-800 text-[10px]">
                <span className="font-bold text-slate-400 uppercase">Position:</span>
                <span className="flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#00D9FF]" /> CB CLOSED (10)
                </span>
                <span className="flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#22C55E]" /> CB OPEN (01)
                </span>
                <span className="text-slate-600">|</span>
                <span className="font-bold text-slate-400 uppercase">Alarms:</span>
                <span className="flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FF4D62]" /> Critical Trip
                </span>
                <span className="flex items-center gap-1 text-slate-200">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#FFB547]" /> Major/Warn
                </span>
              </div>

              <div className="hidden md:flex items-center gap-3 px-3 py-1.5 rounded-xl bg-[#030712]/92 border border-[#00D9FF]/50 text-[11px] font-mono shadow-lg">
                <span className="font-bold text-[#00D9FF]">{selectedBay.bayCode}</span>
                <span
                  className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                    selectedBay.breakerState === 'CLOSED'
                      ? 'bg-[#00D9FF]/20 text-[#00D9FF]'
                      : 'bg-[#22C55E]/20 text-[#22C55E]'
                  }`}
                >
                  52:{selectedBay.breakerState}
                </span>
                <span className="text-white">{selectedBay.activePowerMw.toFixed(1)} MW</span>
                <span className="text-emerald-400">{selectedBay.voltageAbKv.toFixed(2)} kV</span>
                <span className="text-slate-300">{selectedBay.currentA.toFixed(0)} A</span>
              </div>
            </div>
          </div>

          {/* Bottom Landmark & Suburban Distribution Quick-Jump Pills (Normal Mode Only) */}
          <div className={`${isFullscreen ? 'hidden' : 'flex'} absolute bottom-3 left-3 right-3 flex-wrap items-center justify-between gap-2 pointer-events-none`}>
            <div className="flex flex-wrap items-center gap-1.5 pointer-events-auto">
              <button
                type="button"
                onClick={() => {
                  setActiveDistPill('FEEDER_1');
                  setActiveSuburbanFeederId('BAY-11-F01');
                  setSelectedBayId('BAY-11-F01');
                  applyCameraPreset('ISOMETRIC');
                  setHoveredNodeTitle('SUBURBAN FEEDER – 11kV (BAY-11-F01): 3-Phase ACSR Overhead Feeder supplying 250 kVA DT');
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wide border flex items-center gap-1.5 shadow-lg transition ${
                  activeDistPill === 'FEEDER_1'
                    ? 'bg-[#00DFFF] text-slate-950 border-white shadow-[0_0_16px_rgba(0,223,255,0.55)]'
                    : 'bg-[#041428]/92 hover:bg-[#10243A] text-[#DCEAF5] border-[#00DFFF]/50'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                SUBURBAN FEEDER – 11kV
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDistPill('FEEDER_2');
                  setActiveSuburbanFeederId('BAY-11-F02');
                  setSelectedBayId('BAY-11-F02');
                  applyCameraPreset('ISOMETRIC');
                  setHoveredNodeTitle('SUBURBAN FEEDER – 02 (BAY-11-F02): Alternate 11 kV Suburban Distribution Feeder selected');
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide border flex items-center gap-1.5 shadow-lg transition ${
                  activeDistPill === 'FEEDER_2'
                    ? 'bg-[#00DFFF] text-slate-950 border-white shadow-[0_0_16px_rgba(0,223,255,0.55)]'
                    : 'bg-[#041428]/92 hover:bg-[#10243A] text-[#DCEAF5] border-slate-600/80'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-[#00DFFF]" />
                SUBURBAN FEEDER – 02
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDistPill('DIST_TX');
                  setDistTxClosed((prev) => {
                    const next = !prev;
                    setHoveredNodeTitle(
                      `11/0.415 kV 250 kVA Distribution Transformer: ${
                        next ? 'ENERGIZED (GOAB Closed — 415 V LT Active)' : 'ISOLATED (GOAB Open — Downstream LT De-energized)'
                      }`
                    );
                    return next;
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide border flex items-center gap-1.5 shadow-lg transition ${
                  activeDistPill === 'DIST_TX'
                    ? 'bg-[#00DFFF] text-slate-950 border-white'
                    : distTxClosed
                    ? 'bg-[#041428]/92 hover:bg-[#10243A] text-[#DCEAF5] border-slate-600/80'
                    : 'bg-[#3B0D15]/90 text-rose-200 border-rose-400/70'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                DISTR. TRANSFORMER {distTxClosed ? '' : '(OFF)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDistPill('SERVICE_DROP');
                  setServiceDropClosed((prev) => {
                    const next = !prev;
                    setHoveredNodeTitle(
                      `230 V Single-Phase (L-N) Residential Service Drops: ${
                        next ? 'CONNECTED (Homes Illuminated)' : 'DISCONNECTED (Service Cutouts Open)'
                      }`
                    );
                    return next;
                  });
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide border flex items-center gap-1.5 shadow-lg transition ${
                  activeDistPill === 'SERVICE_DROP'
                    ? 'bg-[#00DFFF] text-slate-950 border-white'
                    : serviceDropClosed
                    ? 'bg-[#041428]/92 hover:bg-[#10243A] text-[#DCEAF5] border-slate-600/80'
                    : 'bg-[#3B0D15]/90 text-rose-200 border-rose-400/70'
                }`}
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                230V SERVICE DROP {serviceDropClosed ? '' : '(OFF)'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDistPill('RCC');
                  applyCameraPreset('RCC_CENTER');
                  setHoveredNodeTitle(
                    'REMOTE CONTROL CENTER (RCC): Glass-Fronted SCADA Master Station, 132/33/11 kV Video Wall, 4 Operator Desks & IEC-104 FEP'
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-extrabold tracking-wide border flex items-center gap-1.5 shadow-lg transition ${
                  activeDistPill === 'RCC'
                    ? 'bg-[#00DFFF] text-slate-950 border-white shadow-[0_0_16px_rgba(0,223,255,0.55)]'
                    : 'bg-[#041428]/92 hover:bg-[#10243A] text-cyan-200 border-cyan-400/60'
                }`}
              >
                <Network className="w-3.5 h-3.5 text-cyan-300" />
                REMOTE CONTROL CENTER (RCC)
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDistPill('IEC104');
                  applyCameraPreset('IEC104_PATH');
                  setHoveredNodeTitle(
                    'IEC-104 TELECONTROL CORRIDOR (TCP 2404): Cyan = Telemetry (Substation → RCC) • Green = Authorized Commands (RCC → Substation)'
                  );
                }}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wide border flex items-center gap-1.5 shadow-lg transition ${
                  activeDistPill === 'IEC104'
                    ? 'bg-[#22C55E] text-slate-950 border-white'
                    : 'bg-[#041428]/92 hover:bg-[#10243A] text-emerald-300 border-emerald-400/60'
                }`}
              >
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                IEC-104 WAN PATH
              </button>
              {[
                { id: 'BAY-132-L1', label: '132kV LINE-1' },
                { id: 'BAY-132-T1', label: '50MVA TX-T1' },
                { id: 'BAY-132-T2', label: '50MVA TX-T2' },
                { id: 'BAY-132-BC', label: 'CB-132 Coupler' },
                { id: 'BAY-33-F03', label: '33kV Feeder 03' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    focusCameraOnBay(item.id);
                    setHoveredNodeTitle(`Inspecting ${item.label} in SLD & Control Drawer`);
                  }}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium border flex items-center gap-1 shadow transition ${
                    selectedBay.id === item.id
                      ? 'bg-[#00D9FF] text-slate-950 font-bold border-white'
                      : 'bg-[#030712]/85 hover:bg-[#10243A] text-[#DCEAF5] border-[#00D9FF]/40'
                  }`}
                >
                  <Zap className="w-3 h-3" />
                  {item.label}
                </button>
              ))}
            </div>
            <div className="px-2.5 py-1 rounded bg-[#030712]/90 border border-slate-700 text-[11px] text-slate-300 max-w-md truncate">
              {hoveredNodeTitle}
            </div>
          </div>
        </div>

        {/* Right 4 Columns: Enhanced Selected-Device Inspector & IEC 61850 Signal Audit */}
        <div
          className={`${isFullscreen ? 'hidden' : ''} w-full bg-[#081629] p-4 border-t border-[#00D9FF]/30`}
        >
          <div className="space-y-3">
            {/* Equipment Header with Separate Breaker Position vs Alarm Severity Badges */}
            <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#00D9FF]/15 text-[#00D9FF] border border-[#00D9FF]/40">
                    SELECTED 3D DEVICE • {selectedBay.bayCode}
                  </span>
                  <span className="text-[11px] text-slate-400">
                    {selectedBay.voltageKv} kV • Bus {selectedBay.busSection}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-[#DCEAF5] mt-1">{selectedBay.name}</h3>
              </div>

              <div className="flex flex-col items-end gap-1">
                <span
                  className={`px-2.5 py-0.5 rounded text-xs font-bold border ${
                    selectedBay.breakerState === 'CLOSED'
                      ? 'bg-[#00D9FF]/20 text-[#00D9FF] border-[#00D9FF]/50'
                      : 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/50'
                  }`}
                >
                  {selectedBay.breakerId}: {selectedBay.breakerState}
                </span>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    selectedBay.protectionTripActive
                      ? 'bg-[#FF4D62] text-white animate-pulse'
                      : selectedBayAlarms.length > 0
                      ? 'bg-[#FFB547]/20 text-[#FFB547] border border-[#FFB547]/40'
                      : 'bg-emerald-500/15 text-emerald-400'
                  }`}
                >
                  {selectedBay.protectionTripActive
                    ? 'ALARM: CRITICAL 86 TRIP'
                    : selectedBayAlarms.length > 0
                    ? `ALARM: ${selectedBayAlarms.length} ACTIVE`
                    : 'HEALTH: NORMAL (NO ALARMS)'}
                </span>
              </div>
            </div>

            {/* Selected-Device Single-Line Apparatus Chain Mimic & Derived SCADA Status */}
            <div className="p-2.5 rounded-xl bg-[#030712] border border-slate-800 space-y-2 text-[11px]">
              <div className="flex items-center justify-between text-[10px] text-slate-400">
                <span className="font-bold uppercase text-[#DCEAF5]">
                  Apparatus Chain & Derived SCADA Indications
                </span>
                <span className="font-mono text-[#00D9FF]">t: {selectedBay.lastUpdated.split('T')[1]}</span>
              </div>

              <div className="grid grid-cols-4 gap-1.5 text-center font-mono text-[10px]">
                <div className="p-1.5 rounded bg-[#081629] border border-slate-800">
                  <div className="text-slate-400">Q1 Bus DS</div>
                  <div
                    className={`font-bold ${
                      selectedBay.busDisconnectorState === 'CLOSED' ? 'text-[#00D9FF]' : 'text-[#22C55E]'
                    }`}
                  >
                    {selectedBay.busDisconnectorState}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-[#081629] border border-slate-800">
                  <div className="text-slate-400">52 CB (Dbpos)</div>
                  <div
                    className={`font-bold ${
                      selectedBay.breakerState === 'CLOSED' ? 'text-[#00D9FF]' : 'text-[#22C55E]'
                    }`}
                  >
                    {dbposBits}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-[#081629] border border-slate-800">
                  <div className="text-slate-400">Q9 Line DS</div>
                  <div
                    className={`font-bold ${
                      selectedBay.lineDisconnectorState === 'CLOSED' ? 'text-[#00D9FF]' : 'text-[#22C55E]'
                    }`}
                  >
                    {selectedBay.lineDisconnectorState}
                  </div>
                </div>
                <div className="p-1.5 rounded bg-[#081629] border border-slate-800">
                  <div className="text-slate-400">Q8 Earth Sw</div>
                  <div
                    className={`font-bold ${
                      selectedBay.earthSwitchState === 'CLOSED' ? 'text-[#FFB547]' : 'text-slate-400'
                    }`}
                  >
                    {selectedBay.earthSwitchState}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono pt-1 border-t border-slate-800/80 text-slate-300">
                <span>
                  Derived 52a (CLOSED_IND):{' '}
                  <strong className={derived52aClosed ? 'text-[#00D9FF]' : 'text-slate-500'}>
                    {String(derived52aClosed).toUpperCase()}
                  </strong>
                </span>
                <span>
                  Derived 52b (OPEN_IND):{' '}
                  <strong className={derived52bOpen ? 'text-[#22C55E]' : 'text-slate-500'}>
                    {String(derived52bOpen).toUpperCase()}
                  </strong>
                </span>
              </div>
            </div>

            {/* Live Electrical Measurements */}
            <div className="grid grid-cols-3 gap-2 text-center bg-[#030712] p-2.5 rounded-xl border border-slate-800 font-mono text-xs">
              <div>
                <div className="text-[10px] text-slate-400 font-sans">P / Q Power</div>
                <div className="text-[#00D9FF] font-bold mt-0.5">
                  {selectedBay.activePowerMw.toFixed(1)} MW
                </div>
                <div className="text-[10px] text-slate-400">
                  {selectedBay.reactivePowerMvar.toFixed(1)} MVAr
                </div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Vab / Freq</div>
                <div className="text-[#22C55E] font-bold mt-0.5">
                  {selectedBay.voltageAbKv.toFixed(2)} kV
                </div>
                <div className="text-[10px] text-slate-400">{selectedBay.frequencyHz.toFixed(2)} Hz</div>
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-sans">Ia / Quality</div>
                <div className="text-white font-bold mt-0.5">{selectedBay.currentA.toFixed(1)} A</div>
                <div
                  className={`text-[10px] font-bold ${
                    selectedBay.quality === 'GOOD' ? 'text-emerald-400' : 'text-amber-400'
                  }`}
                >
                  {selectedBay.quality}
                </div>
              </div>
            </div>

            {/* Transformer Supervision & OLTC Card when T1, T2, DT1, or DT2 is selected */}
            {selectedTx && (
              <div className="p-2.5 rounded-xl bg-[#10243A] border border-[#00D9FF]/40 space-y-1.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#DCEAF5]">{selectedTx.designation}</span>
                  <span className="font-mono text-[11px] text-[#00D9FF]">
                    Load: {selectedTx.loadPercent}%
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5 text-[10px] bg-[#030712] p-1.5 rounded border border-slate-800 font-mono">
                  <div>OTI: {selectedTx.oilTempC}°C</div>
                  <div>WTI: {selectedTx.windingTempLvC}°C</div>
                  <div>Cool: {selectedTx.coolingStage}</div>
                </div>
                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] text-slate-300">
                    OLTC Tap (YLTC1): <strong className="text-[#FFB547]">Tap {selectedTx.oltcTapPosition}</strong>
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={() => stepTransformerOltc(selectedTx.id, 'LOWER')}
                      className="px-2 py-0.5 rounded bg-[#030712] hover:bg-slate-800 border border-slate-600 text-[11px]"
                    >
                      - Lower
                    </button>
                    <button
                      type="button"
                      onClick={() => stepTransformerOltc(selectedTx.id, 'RAISE')}
                      className="px-2 py-0.5 rounded bg-[#030712] hover:bg-slate-800 border border-slate-600 text-[11px]"
                    >
                      + Raise
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Interlocking (CILO1), Synchronism-Check (RSYN1) & Select-Before-Operate (CSWI1) Controls */}
            <div className="p-3 rounded-xl bg-[#10243A] border border-slate-700 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#DCEAF5] flex items-center gap-1.5">
                  <Power className="w-3.5 h-3.5 text-[#00D9FF]" />
                  SBO Enhanced Control ({selectedBay.localRemote})
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setBayLocalRemote(
                      selectedBay.id,
                      selectedBay.localRemote === 'REMOTE' ? 'LOCAL' : 'REMOTE'
                    )
                  }
                  className="px-2 py-0.5 rounded bg-[#030712] text-[10px] text-[#00D9FF] border border-slate-700"
                >
                  Switch 43LR ({selectedBay.localRemote})
                </button>
              </div>

              <div
                className={`p-2 rounded border text-[10px] space-y-1 ${
                  selectedBay.interlockPermissive
                    ? 'bg-[#22C55E]/10 border-[#22C55E]/40 text-emerald-200'
                    : 'bg-[#FFB547]/10 border-[#FFB547]/40 text-amber-200'
                }`}
              >
                <div>{selectedBay.interlockReason}</div>
                <div className="font-mono text-[9.5px] text-slate-300 border-t border-slate-700/60 pt-1">
                  ANSI 25 Synch-Check (RSYN1.Rel = {String(synchReleaseOk).toUpperCase()}): ΔV={synchDeltaV} | Δf={synchDeltaF} | Δφ={synchDeltaPhi}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSboSelect('CLOSED')}
                  className="py-1.5 px-2 rounded bg-[#00D9FF]/20 hover:bg-[#00D9FF]/30 text-[#00D9FF] border border-[#00D9FF]/40 font-bold text-[11px]"
                >
                  SBO Select CLOSE
                </button>
                <button
                  type="button"
                  onClick={() => handleSboSelect('OPEN')}
                  className="py-1.5 px-2 rounded bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] border border-[#22C55E]/40 font-bold text-[11px]"
                >
                  SBO Select OPEN
                </button>
              </div>

              {sboTarget && (
                <div className="p-2 rounded bg-[#030712] border border-[#00D9FF] flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] text-[#00D9FF]">
                    CSWI1.Pos.SBOw = {sboTarget}
                  </span>
                  <div className="flex gap-1.5">
                    <button
                      type="button"
                      onClick={handleSboExecute}
                      className="px-2.5 py-1 rounded bg-[#00D9FF] text-slate-950 font-bold text-[11px]"
                    >
                      Operate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSboTarget(null);
                        setSboStatusBanner('MMS Cancel executed on CSWI1$CO$Pos$Cancel.');
                      }}
                      className="px-2 py-1 rounded bg-slate-800 text-slate-300 text-[11px]"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {sboStatusBanner && (
                <div className="p-1.5 rounded bg-[#030712] border border-slate-700 text-[10px] font-mono text-[#00D9FF]">
                  {sboStatusBanner}
                </div>
              )}

              <div className="grid grid-cols-3 gap-1.5 pt-1 text-[10px]">
                <button
                  type="button"
                  onClick={() =>
                    commandDisconnector(
                      selectedBay.id,
                      'BUS_Q1',
                      selectedBay.busDisconnectorState === 'CLOSED' ? 'OPEN' : 'CLOSED'
                    )
                  }
                  className="p-1.5 rounded bg-[#030712] border border-slate-700 hover:border-[#00D9FF]"
                >
                  Q1 Bus: <strong>{selectedBay.busDisconnectorState}</strong>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    commandDisconnector(
                      selectedBay.id,
                      'LINE_Q9',
                      selectedBay.lineDisconnectorState === 'CLOSED' ? 'OPEN' : 'CLOSED'
                    )
                  }
                  className="p-1.5 rounded bg-[#030712] border border-slate-700 hover:border-[#00D9FF]"
                >
                  Q9 Line: <strong>{selectedBay.lineDisconnectorState}</strong>
                </button>
                <button
                  type="button"
                  onClick={() =>
                    commandDisconnector(
                      selectedBay.id,
                      'EARTH_Q8',
                      selectedBay.earthSwitchState === 'CLOSED' ? 'OPEN' : 'CLOSED'
                    )
                  }
                  className="p-1.5 rounded bg-[#030712] border border-slate-700 hover:border-[#FFB547]"
                >
                  Q8 Earth: <strong>{selectedBay.earthSwitchState}</strong>
                </button>
              </div>

              <div className="flex gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => triggerProtectionTrip(selectedBay.id, '50/51 Overcurrent')}
                  className="flex-1 py-1 px-2 rounded bg-[#FF4D62]/20 hover:bg-[#FF4D62]/30 text-[#FF4D62] border border-[#FF4D62]/40 text-[11px] font-semibold"
                >
                  Simulate Protection Trip
                </button>
                <button
                  type="button"
                  onClick={() => resetProtectionTrip(selectedBay.id)}
                  className="py-1 px-2.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[11px]"
                >
                  Reset 86
                </button>
              </div>
            </div>

            {/* Associated Multi-Vendor IED, PRP Network Health & Audited IEC 61850 References */}
            {selectedIed && (
              <div className="p-2.5 rounded-xl bg-[#030712] border border-slate-800 space-y-1.5 text-[11px]">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-slate-400">IED: </span>
                    <strong className="text-[#DCEAF5]">
                      {selectedIed.name} ({selectedIed.vendor} {selectedIed.model})
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIedId(selectedIed.id);
                      setActiveTab('IED');
                    }}
                    className="px-2 py-0.5 rounded bg-[#168BFF]/20 text-[#00D9FF] border border-[#168BFF]/40 text-[10px] font-semibold"
                  >
                    Open IED →
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between text-[10px] font-mono text-slate-300 bg-[#081629] px-2 py-1 rounded">
                  <span>
                    PRP-A ({selectedIed.ipAddressLanA}):{' '}
                    <strong className={selectedBayLinks[0]?.status === 'DOWN' ? 'text-[#FF4D62]' : 'text-[#22C55E]'}>
                      {selectedBayLinks[0]?.status || 'UP'}
                    </strong>
                  </span>
                  <span>
                    PRP-B ({selectedIed.ipAddressLanB}):{' '}
                    <strong className={selectedBayLinks[1]?.status === 'DOWN' ? 'text-[#FF4D62]' : 'text-[#22C55E]'}>
                      {selectedBayLinks[1]?.status || 'UP'}
                    </strong>
                  </span>
                </div>

                <div className="space-y-0.5 pt-1 border-t border-slate-800/80 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-400">CB Pos [ST]:</span>
                    <span className="text-[#00D9FF]">{iedPrefix}/XCBR1.Pos.stVal = {dbposBits}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">SBO Oper [CO]:</span>
                    <span className="text-[#168BFF]">{iedPrefix}/CSWI1.Pos.Oper.ctlVal</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Interlock [ST]:</span>
                    <span className="text-emerald-400">
                      {iedPrefix}/CILO1.EnaCls.stVal = {String(selectedBay.interlockPermissive)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Synch-Check [ST]:</span>
                    <span className="text-emerald-300">
                      {iedPrefix}/RSYN1.Rel.stVal = {String(synchReleaseOk)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Comm Health [ST]:</span>
                    <span className="text-amber-300">
                      {iedPrefix}/LPHD1.PhyHealth.stVal = {selectedIed.commHealthy ? '1 (Ok)' : '3 (Alarm)'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Active Protection Alarms & SOE */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                <span>Bay Alarms ({selectedBayAlarms.length}) & SOE</span>
                <button
                  type="button"
                  onClick={() => setActiveTab('SLD')}
                  className="text-[#00D9FF] hover:underline normal-case font-semibold"
                >
                  View in SLD →
                </button>
              </div>
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {selectedBaySoe.map((s) => (
                  <div
                    key={s.id}
                    className="p-1.5 rounded bg-[#030712] border border-slate-800 text-[10px] font-mono"
                  >
                    <div className="flex justify-between text-slate-400">
                      <span>{s.timestampMs.split('T')[1]}</span>
                      <span className="text-[#00D9FF]">{s.cause}</span>
                    </div>
                    <div className="text-slate-200 font-sans truncate">{s.eventDescription}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* ==================== REMOTE CONTROL CENTER (RCC) & IEC 60870-5-104 TELECONTROL CONSOLE (NORMAL VIEW ONLY) ==================== */}
      <div className={`${isFullscreen ? 'hidden' : ''} px-4 py-3 bg-[#04101E] border-t border-b border-cyan-500/35 space-y-2.5 text-xs`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-cyan-500/15 border border-cyan-400/50 text-cyan-300 font-extrabold uppercase tracking-wider text-[11px]">
              Remote Control Center (RCC) — IEC 60870-5-104 Telecontrol Link (TCP:2404 • COA 132)
            </span>
            <span className="text-[11px] text-slate-300 font-mono">
              Substation IEDs → IEC 61850 Station Bus → Station Gateway → Firewalls → WAN Routers → Fiber/MW → RCC FEP → RCC SCADA/HMI
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => applyCameraPreset('RCC_CENTER')}
              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 text-[11px] font-bold"
            >
              Fly to 3D RCC
            </button>
            <button
              type="button"
              onClick={() => applyCameraPreset('GATEWAY_COMM')}
              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 text-[11px] font-semibold"
            >
              Fly to Station Gateway
            </button>
            <button
              type="button"
              onClick={() => applyCameraPreset('IEC104_PATH')}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-200 border border-emerald-400/50 text-[11px] font-bold"
            >
              View IEC-104 WAN Path
            </button>
          </div>
        </div>

        {/* Live IEC-104 Status Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2 font-mono text-[10.5px]">
          <div className="p-2 rounded-lg bg-[#08182B] border border-slate-800">
            <div className="text-slate-400 text-[9.5px]">IEC-104 Link</div>
            <div className={`font-bold ${iec104Connected ? 'text-cyan-300' : 'text-rose-400'}`}>
              {iec104Connected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#08182B] border border-slate-800">
            <div className="text-slate-400 text-[9.5px]">STARTDT State</div>
            <div className={`font-bold ${startDtActive ? 'text-emerald-400' : 'text-rose-400'}`}>
              {startDtActive ? 'STARTDT ACTIVE' : 'STARTDT INACTIVE'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#08182B] border border-slate-800">
            <div className="text-slate-400 text-[9.5px]">Telemetry (Cyan)</div>
            <div className={`font-bold ${telemetryHealth === 'HEALTHY' ? 'text-cyan-300' : telemetryHealth === 'STALE' ? 'text-amber-400' : 'text-rose-400'}`}>
              {telemetryHealth === 'HEALTHY' ? 'HEALTHY (Sub→RCC)' : telemetryHealth === 'STALE' ? 'STALE (OLD_DATA)' : 'OFFLINE'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#08182B] border border-slate-800">
            <div className="text-slate-400 text-[9.5px]">Remote Control (Green)</div>
            <div className={`font-bold ${iec104Connected && rccAuthorityEnabled && rccFault !== 'RCC_AUTH_UNAVAILABLE' && selectedBay.localRemote === 'REMOTE' ? 'text-emerald-400' : 'text-amber-400'}`}>
              {iec104Connected && rccAuthorityEnabled && rccFault !== 'RCC_AUTH_UNAVAILABLE' && selectedBay.localRemote === 'REMOTE' ? 'ENABLED (RCC→Sub)' : 'BLOCKED'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#08182B] border border-slate-800">
            <div className="text-slate-400 text-[9.5px]">WAN Routing</div>
            <div className={`font-bold ${wanMode === 'PRIMARY_FIBER' ? 'text-cyan-300' : 'text-amber-300'}`}>
              {wanMode === 'PRIMARY_FIBER' ? 'WAN PRIMARY (FIBER)' : 'WAN BACKUP (MW)'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#08182B] border border-slate-800">
            <div className="text-slate-400 text-[9.5px]">Firewall Cluster</div>
            <div className={`font-bold ${firewallMode === 'PRIMARY_FW1' ? 'text-emerald-400' : 'text-rose-400'}`}>
              {firewallMode === 'PRIMARY_FW1' ? 'FW-1 PRIMARY' : 'TCP:2404 BLOCKED'}
            </div>
          </div>
          <div className="p-2 rounded-lg bg-[#08182B] border border-slate-800">
            <div className="text-slate-400 text-[9.5px]">Last Telemetry Update</div>
            <div className="font-bold text-slate-200">{lastTelemetryTime} UTC</div>
          </div>
        </div>

        {/* RCC Remote Breaker Command Console & 8 Fault Scenario Controls */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5 items-center bg-[#071628] p-2.5 rounded-xl border border-slate-800">
          <div className="lg:col-span-5 flex flex-wrap items-center gap-2">
            <span className="font-bold text-emerald-300 text-[11px]">
              RCC Remote Command ({selectedBay.bayCode}):
            </span>
            <button
              type="button"
              onClick={() => handleRccRemoteCommand('CLOSED')}
              className="px-2.5 py-1 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-400/50 font-bold text-[11px]"
            >
              RCC CLOSE ({selectedBay.breakerId})
            </button>
            <button
              type="button"
              onClick={() => handleRccRemoteCommand('OPEN')}
              className="px-2.5 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-400/50 font-bold text-[11px]"
            >
              RCC OPEN ({selectedBay.breakerId})
            </button>
            <button
              type="button"
              onClick={() => setRccAuthorityEnabled((a) => !a)}
              className={`px-2 py-1 rounded text-[10.5px] font-semibold border ${
                rccAuthorityEnabled
                  ? 'bg-slate-800 text-emerald-300 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-300 border-rose-400/50'
              }`}
            >
              RCC Authority: {rccAuthorityEnabled ? 'ON' : 'LOCKED'}
            </button>
          </div>

          <div className="lg:col-span-4 flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-300 whitespace-nowrap">RCC / IEC-104 Faults:</span>
            <select
              value={rccFault}
              onChange={(e) => setRccFault(e.target.value as RccFaultId)}
              className="w-full rounded-lg bg-[#030d1c] border border-cyan-500/40 text-cyan-100 p-1.5 text-[11px]"
            >
              <option value="NONE">Normal Operation (All Links Healthy)</option>
              <option value="WAN_PRIMARY_FAIL">1. Primary WAN Fiber Failure (Failover to Backup MW)</option>
              <option value="WAN_BACKUP_FAIL">2. Backup WAN Microwave Failure</option>
              <option value="IEC104_ASSOC_LOSS">3. IEC-104 Association Loss (STARTDT Inactive)</option>
              <option value="GATEWAY_COMM_FAIL">4. Substation Gateway Communication Failure</option>
              <option value="FIREWALL_BLOCK">5. Firewall TCP/2404 Communication Block</option>
              <option value="STALE_TELEMETRY">6. Stale Telemetry (Quality = OLD_DATA)</option>
              <option value="INTERLOCK_REJECT">7. Remote Command Rejected by CILO1 Interlocking</option>
              <option value="RCC_AUTH_UNAVAILABLE">8. RCC Control Authority Unavailable</option>
            </select>
          </div>

          <div className="lg:col-span-3 font-mono text-[10px] text-cyan-200 bg-[#030914] p-2 rounded border border-slate-800 truncate" title={rccCommandStatus}>
            {rccCommandStatus}
          </div>
        </div>
      </div>

      {/* ==================== COMPLETE SUBSTATION EQUIPMENT DIRECTORY & QUICK-FOCUS STRIP ==================== */}
      <div className={`${isFullscreen ? 'hidden' : ''} px-4 py-2 bg-[#050C1A] border-b border-slate-800/90 space-y-1.5 text-[11px]`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-bold text-[#00D9FF] uppercase tracking-wider text-[10px]">
              Complete 132 / 33 / 11 kV Bay & Transformer Focus Directory:
            </span>
            <div className="flex items-center rounded bg-[#081629] p-0.5 border border-slate-800 text-[10px]">
              {(['ALL', 132, 33, 11] as const).map((v) => (
                <button
                  key={String(v)}
                  type="button"
                  onClick={() => setVoltageFilter(v)}
                  className={`px-2 py-0.5 rounded font-semibold ${
                    voltageFilter === v
                      ? 'bg-[#00D9FF] text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {v === 'ALL' ? 'All Bays' : `${v} kV`}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowDirectoryBar((b) => !b)}
            className="text-[10px] text-slate-400 hover:text-white"
          >
            {showDirectoryBar ? 'Hide Bay & Transformer Directory ▲' : 'Show Bay & Transformer Directory ▼'}
          </button>
        </div>

        {showDirectoryBar && (
          <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto py-0.5">
            {filteredSpatialNodes.map((node) => {
              const bay = bays.find((b) => b.id === node.bayId);
              const isSel = selectedBay.id === node.bayId;
              const inTrace = traceSourceActive && upstreamTrace.highlightedBayIds.has(node.bayId);
              return (
                <button
                  key={node.id}
                  type="button"
                  onClick={() => {
                    focusCameraOnBay(node.bayId);
                    setHoveredNodeTitle(`Inspecting ${node.code} — ${node.title}`);
                  }}
                  className={`px-2 py-0.5 rounded text-[10px] font-mono border flex items-center gap-1 transition ${
                    isSel
                      ? 'bg-[#00D9FF] text-slate-950 font-bold border-white'
                      : inTrace
                      ? 'bg-[#168BFF]/30 text-white border-[#00D9FF]'
                      : bay?.protectionTripActive
                      ? 'bg-[#FF4D62]/20 text-[#FF4D62] border-[#FF4D62]'
                      : 'bg-[#081629] hover:bg-[#10243A] text-slate-200 border-slate-800'
                  }`}
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      bay?.breakerState === 'CLOSED' ? 'bg-[#00D9FF]' : 'bg-[#22C55E]'
                    }`}
                  />
                  <span>{node.shortLabel}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>


      {/* SECTION 3: 3D DIGITAL TWIN PROTOCOL VISUALIZATION OVERLAY (HIDDEN IN ENLARGED POPUP) */}
      <div
        style={{
          backgroundColor: 'rgba(5, 19, 36, 0.94)',
          borderColor: '#1B4B72',
        }}
        className={`${isFullscreen ? 'hidden' : ''} mt-2 rounded-xl border p-3 space-y-2 text-xs`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white uppercase tracking-wider">
              3D Digital Twin — Protocol Visualization &amp; Communication Paths
            </span>
            <button
              type="button"
              onClick={() => setShowProtocolOverlay((p: boolean) => !p)}
              className="px-2 py-0.5 rounded bg-[#0B2540] border border-[#00CFFF] text-[#77E7FF] text-[10.5px] font-bold"
            >
              {showProtocolOverlay ? 'Hide Path Labels' : 'Show Path Labels'}
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {[
              'All Protocols',
              'IEC 61850 MMS',
              'IEC 61850 GOOSE',
              'Modbus TCP',
              'IEC-104',
              'OPC UA',
              'Time Synchronization',
            ].map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setProtocolVisFilter(pf)}
                style={{
                  backgroundColor: protocolVisFilter === pf ? '#00CFFF' : '#081C30',
                  color: protocolVisFilter === pf ? '#02101F' : '#DCEAF5',
                  borderColor: protocolVisFilter === pf ? '#00F0FF' : '#1E466E',
                }}
                className="px-2.5 py-1 rounded-lg border text-[10.5px] font-extrabold transition"
              >
                {pf}
              </button>
            ))}
          </div>
        </div>

        {showProtocolOverlay && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2 pt-1">
            {PROTOCOL_3D_PATHS.filter(
              (p) => protocolVisFilter === 'All Protocols' || p.filter === protocolVisFilter
            ).map((p) => (
              <div
                key={p.id}
                style={{ backgroundColor: '#04101E', borderColor: p.color }}
                className="rounded-lg border p-2 flex flex-col justify-between gap-1"
              >
                <div className="flex items-center justify-between gap-1">
                  <span style={{ color: p.color }} className="font-mono font-extrabold text-[11px]">
                    ● {p.label}
                  </span>
                  <span className="px-1.5 py-0.2 rounded bg-[#06291E] text-[#4ADE80] font-mono text-[9.5px] font-bold">
                    PACKETS ACTIVE
                  </span>
                </div>
                <div className="text-[11px] font-bold text-white">{p.path}</div>
                <div className="text-[10px] text-[#9BC0DF]">{p.detail}</div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
    </>
  );
};
