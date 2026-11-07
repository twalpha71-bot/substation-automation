import {
  BayEquipment,
  FaultScenario,
  GooseControlBlock,
  MultiVendorIed,
} from '../types/substation';

export type SasProtocolId =
  | 'IEC_61850_MMS'
  | 'IEC_61850_GOOSE'
  | 'MODBUS_TCP'
  | 'IEC_104'
  | 'OPC_UA'
  | 'TIME_SYNC';

export interface ProtocolSummaryCardData {
  id: SasProtocolId;
  protocolName: string;
  shortLabel: string;
  transportBadge: string;
  architectureFlow: string;
  connectedDevicesText: string;
  endpointCount: number;
  activeSignalCount: number;
  colorHex: string;
  targetTab:
    | 'MMS'
    | 'GOOSE'
    | 'MODBUS_LAB'
    | 'IEC104_LAB'
    | 'OPCUA_LAB'
    | 'NETWORK';
  healthy: boolean;
  statusLabel: string;
  faultSummary: string;
  lastCommTimestamp: string;
}

export interface ModbusRegisterEntry {
  registerAddress: number;
  pduOffsetHex: string;
  functionCode: '03 (Holding Register)' | '04 (Input Register)' | '06 (Write Single Register)';
  parameterName: string;
  iec61850SourceRef: string;
  dataType: 'FLOAT32 (2x16-bit)' | 'UINT16' | 'UINT32';
  rawRegisterValue: number;
  scalingFactor: number;
  scaledEngineeringValue: string;
  unit: string;
  unitId: number;
  serverIp: string;
  pollIntervalMs: number;
  quality: 'GOOD' | 'EXCEPTION';
}

export interface Iec104IoaEntry {
  ioa: number;
  commonAddress: number;
  typeId: string;
  typeDescription: string;
  cot: string;
  bayCode: string;
  signalDescription: string;
  sourceProtocol: 'IEC 61850 MMS (TCP/102)' | 'Modbus TCP (TCP/502)';
  sourceReference: string;
  valueText: string;
  quality: string;
  timestamp: string;
}

export interface OpcUaNodeEntry {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: 'Object' | 'Variable';
  bayCode: string;
  dataType: 'Boolean' | 'Double' | 'Int32' | 'String';
  accessLevel: 'CurrentRead' | 'CurrentRead | CurrentWrite';
  sourceProtocol: string;
  sourceIecRef: string;
  valueText: string;
  statusCode: 'Good (0x00000000)' | 'Uncertain (0x40000000)' | 'Bad (0x80000000)';
  sourceTimestamp: string;
  serverTimestamp: string;
}

export const PROTOCOL_COLORS: Record<SasProtocolId, string> = {
  IEC_61850_MMS: '#00CFFF', // Cyan
  IEC_61850_GOOSE: '#22C55E', // Green
  MODBUS_TCP: '#F97316', // Orange
  IEC_104: '#A855F7', // Purple
  OPC_UA: '#3B82F6', // Blue
  TIME_SYNC: '#EAB308', // Yellow
};

export function buildProtocolSummaryCards(
  bays: BayEquipment[],
  ieds: MultiVendorIed[],
  gooseControlBlocks: GooseControlBlock[],
  faultScenarios: FaultScenario[]
): ProtocolSummaryCardData[] {
  const nowIso = new Date().toISOString().replace('T', ' ').slice(0, 23);

  const mmsFault = faultScenarios.find((f) => f.active && (f.id === 'FLT-06' || f.code.includes('MMS')));
  const gooseFault =
    faultScenarios.find((f) => f.active && (f.id === 'FLT-04' || f.code.includes('GOOSE'))) ||
    gooseControlBlocks.find((g) => g.mismatchFault !== 'NONE');
  const modbusFault = faultScenarios.find((f) => f.active && f.code.includes('MODBUS'));
  const iec104Fault = faultScenarios.find((f) => f.active && f.code.includes('104'));
  const opcUaFault = faultScenarios.find((f) => f.active && f.code.includes('OPCUA'));
  const timeFault = faultScenarios.find((f) => f.active && (f.id === 'FLT-10' || f.code.includes('PTP')));

  return [
    {
      id: 'IEC_61850_MMS',
      protocolName: 'IEC 61850 MMS — TCP Port 102',
      shortLabel: 'IEC 61850 MMS',
      transportBadge: 'TCP Port 102 (ISO/IEC 9506)',
      architectureFlow: 'IED ↔ Station Switch ↔ SCADA Server A',
      connectedDevicesText: `${ieds.length} Protection & Bay IEDs ↔ SCADA Server A (10.132.10.200)`,
      endpointCount: ieds.length + 2,
      activeSignalCount: 1206,
      colorHex: PROTOCOL_COLORS.IEC_61850_MMS,
      targetTab: 'MMS',
      healthy: !mmsFault,
      statusLabel: mmsFault ? 'DEGRADED / FAULT' : 'ONLINE (ASSOCIATED)',
      faultSummary: mmsFault ? mmsFault.title : '0 Active Faults • BRCB/URCB Reporting Active',
      lastCommTimestamp: nowIso,
    },
    {
      id: 'IEC_61850_GOOSE',
      protocolName: 'IEC 61850 GOOSE — EtherType 0x88B8',
      shortLabel: 'IEC 61850 GOOSE',
      transportBadge: 'L2 Multicast • 0x88B8 (VLAN 20/101)',
      architectureFlow: 'Publisher IED → Station Switch → Subscriber IED',
      connectedDevicesText: `${gooseControlBlocks.length} GOOSE Control Blocks across ${ieds.length} Bay IEDs`,
      endpointCount: gooseControlBlocks.length * 2,
      activeSignalCount: 168,
      colorHex: PROTOCOL_COLORS.IEC_61850_GOOSE,
      targetTab: 'GOOSE',
      healthy: !gooseFault,
      statusLabel: gooseFault ? 'SUBSCRIPTION FAULT' : 'HEALTHY (< 3 ms L2)',
      faultSummary: gooseFault
        ? 'title' in gooseFault
          ? gooseFault.title
          : `GOOSE Mismatch: ${gooseFault.mismatchFault}`
        : '0 Active Faults • Fast Horizontal Interlocking & Trip OK',
      lastCommTimestamp: nowIso,
    },
    {
      id: 'MODBUS_TCP',
      protocolName: 'Modbus TCP — TCP Port 502',
      shortLabel: 'Modbus TCP',
      transportBadge: 'TCP Port 502 • Unit ID 1–14',
      architectureFlow: 'Feeder Energy Meter / PLC ↔ SCADA / Gateway',
      connectedDevicesText: '14 Multifunction Feeder Meters (33 kV & 11 kV) + RTCC PLC ↔ Gateway',
      endpointCount: 15,
      activeSignalCount: 210,
      colorHex: PROTOCOL_COLORS.MODBUS_TCP,
      targetTab: 'MODBUS_LAB',
      healthy: !modbusFault,
      statusLabel: modbusFault ? 'POLL EXCEPTION' : 'POLLING OK (FC03/FC04)',
      faultSummary: modbusFault ? modbusFault.title : '0 Exceptions • 1000 ms Cyclic Register Poll OK',
      lastCommTimestamp: nowIso,
    },
    {
      id: 'IEC_104',
      protocolName: 'IEC 60870-5-104 (IEC-104) — TCP Port 2404',
      shortLabel: 'IEC-104',
      transportBadge: 'TCP Port 2404 • COA 132',
      architectureFlow: 'Station Gateway / RTU ↔ Remote Control Center (RCC)',
      connectedDevicesText: 'Moxa MGate 5216 / MiCOM C264 Gateway (10.132.10.190) ↔ SLDC / RCC Master',
      endpointCount: 4,
      activeSignalCount: 340,
      colorHex: PROTOCOL_COLORS.IEC_104,
      targetTab: 'IEC104_LAB',
      healthy: !iec104Fault,
      statusLabel: iec104Fault ? 'LINK / GI FAULT' : 'STARTDT ACTIVE (CON)',
      faultSummary: iec104Fault ? iec104Fault.title : '0 Active Faults • I/S/U APCI Frames & IOA Map OK',
      lastCommTimestamp: nowIso,
    },
    {
      id: 'OPC_UA',
      protocolName: 'OPC UA — opc.tcp://10.132.10.200:4840',
      shortLabel: 'OPC UA',
      transportBadge: 'TCP Port 4840 • Basic256Sha256',
      architectureFlow: 'SCADA OPC UA Server ↔ Historian / Analytics Client',
      connectedDevicesText: 'SCADA Server A (opc.tcp://10.132.10.200:4840) ↔ Enterprise Historian & AI Analytics',
      endpointCount: 3,
      activeSignalCount: 1206,
      colorHex: PROTOCOL_COLORS.OPC_UA,
      targetTab: 'OPCUA_LAB',
      healthy: !opcUaFault,
      statusLabel: opcUaFault ? 'SESSION / CERT FAULT' : 'SUBSCRIBED (ns=2)',
      faultSummary: opcUaFault ? opcUaFault.title : '0 Active Faults • X.509 Certificate Trusted • MonitoredItems OK',
      lastCommTimestamp: nowIso,
    },
    {
      id: 'TIME_SYNC',
      protocolName: 'SNTP / NTP / PTP — Time Synchronization',
      shortLabel: 'SNTP / NTP / PTP',
      transportBadge: 'IEEE 1588v2 PTP (0x88F7) + SNTP (UDP/123)',
      architectureFlow: 'Meinberg LANTIME M400 Time Server → All IEDs, Switches & Servers',
      connectedDevicesText: `Meinberg GPS/GLONASS GM (192.168.10.100) → ${ieds.length} IEDs, 2 RSP35 Switches, SCADA & Gateway`,
      endpointCount: ieds.length + 6,
      activeSignalCount: 56,
      colorHex: PROTOCOL_COLORS.TIME_SYNC,
      targetTab: 'NETWORK',
      healthy: !timeFault,
      statusLabel: timeFault ? 'HOLDOVER / UNSYNCED' : 'LOCKED (±38 ns PTP)',
      faultSummary: timeFault ? timeFault.title : '11 GNSS Satellites Locked • IEEE C37.238 Power Profile + SNTP OK',
      lastCommTimestamp: nowIso,
    },
  ];
}

export function buildModbusRegistersForBay(bay: BayEquipment, unitId = 1, scalingMultiplier = 1): ModbusRegisterEntry[] {
  const serverIp = `10.132.30.${50 + unitId}`;
  return [
    {
      registerAddress: 30001,
      pduOffsetHex: '0x0000',
      functionCode: '04 (Input Register)',
      parameterName: 'Phase-to-Phase Voltage V_AB',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.PPV.phsAB.cVal.mag.f`,
      dataType: 'FLOAT32 (2x16-bit)',
      rawRegisterValue: Math.round(bay.voltageAbKv * 100),
      scalingFactor: 0.01 * scalingMultiplier,
      scaledEngineeringValue: (bay.voltageAbKv * scalingMultiplier).toFixed(2),
      unit: 'kV',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 30003,
      pduOffsetHex: '0x0002',
      functionCode: '04 (Input Register)',
      parameterName: 'Phase A Line Current I_A',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.A.phsA.cVal.mag.f`,
      dataType: 'FLOAT32 (2x16-bit)',
      rawRegisterValue: Math.round(bay.currentA * 10),
      scalingFactor: 0.1 * scalingMultiplier,
      scaledEngineeringValue: (bay.currentA * scalingMultiplier).toFixed(1),
      unit: 'A',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 30005,
      pduOffsetHex: '0x0004',
      functionCode: '04 (Input Register)',
      parameterName: 'Phase B Line Current I_B',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.A.phsB.cVal.mag.f`,
      dataType: 'FLOAT32 (2x16-bit)',
      rawRegisterValue: Math.round(bay.currentB * 10),
      scalingFactor: 0.1 * scalingMultiplier,
      scaledEngineeringValue: (bay.currentB * scalingMultiplier).toFixed(1),
      unit: 'A',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 30007,
      pduOffsetHex: '0x0006',
      functionCode: '04 (Input Register)',
      parameterName: 'Phase C Line Current I_C',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.A.phsC.cVal.mag.f`,
      dataType: 'FLOAT32 (2x16-bit)',
      rawRegisterValue: Math.round(bay.currentC * 10),
      scalingFactor: 0.1 * scalingMultiplier,
      scaledEngineeringValue: (bay.currentC * scalingMultiplier).toFixed(1),
      unit: 'A',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 30009,
      pduOffsetHex: '0x0008',
      functionCode: '04 (Input Register)',
      parameterName: 'Three-Phase Active Power P',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.TotW.mag.f`,
      dataType: 'FLOAT32 (2x16-bit)',
      rawRegisterValue: Math.round(bay.activePowerMw * 100),
      scalingFactor: 0.01 * scalingMultiplier,
      scaledEngineeringValue: (bay.activePowerMw * scalingMultiplier).toFixed(2),
      unit: 'MW',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 30011,
      pduOffsetHex: '0x000A',
      functionCode: '04 (Input Register)',
      parameterName: 'Three-Phase Reactive Power Q',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.TotVAr.mag.f`,
      dataType: 'FLOAT32 (2x16-bit)',
      rawRegisterValue: Math.round(bay.reactivePowerMvar * 100),
      scalingFactor: 0.01 * scalingMultiplier,
      scaledEngineeringValue: (bay.reactivePowerMvar * scalingMultiplier).toFixed(2),
      unit: 'MVAr',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 30013,
      pduOffsetHex: '0x000C',
      functionCode: '04 (Input Register)',
      parameterName: 'Power Factor cos(φ)',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.TotPF.mag.f`,
      dataType: 'UINT16',
      rawRegisterValue: Math.round(bay.powerFactor * 1000),
      scalingFactor: 0.001 * scalingMultiplier,
      scaledEngineeringValue: (bay.powerFactor * scalingMultiplier).toFixed(3),
      unit: 'PF',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 30015,
      pduOffsetHex: '0x000E',
      functionCode: '04 (Input Register)',
      parameterName: 'System Frequency Hz',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMXU1.Hz.mag.f`,
      dataType: 'UINT16',
      rawRegisterValue: Math.round(bay.frequencyHz * 100),
      scalingFactor: 0.01 * scalingMultiplier,
      scaledEngineeringValue: (bay.frequencyHz * scalingMultiplier).toFixed(2),
      unit: 'Hz',
      unitId,
      serverIp,
      pollIntervalMs: 1000,
      quality: 'GOOD',
    },
    {
      registerAddress: 40001,
      pduOffsetHex: '0x0000',
      functionCode: '03 (Holding Register)',
      parameterName: 'Net Active Energy Import',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}Meas/MMTR1.TotWh.actVal`,
      dataType: 'UINT32',
      rawRegisterValue: Math.round(bay.energyImportMwh * 10),
      scalingFactor: 0.1 * scalingMultiplier,
      scaledEngineeringValue: (bay.energyImportMwh * scalingMultiplier).toFixed(1),
      unit: 'MWh',
      unitId,
      serverIp,
      pollIntervalMs: 2000,
      quality: 'GOOD',
    },
    {
      registerAddress: 40003,
      pduOffsetHex: '0x0002',
      functionCode: '03 (Holding Register)',
      parameterName: 'Meter Status & Demand Reset Word',
      iec61850SourceRef: `${bay.iedId.replace(/-/g, '_')}System/LPHD1.PhyHealth.stVal`,
      dataType: 'UINT16',
      rawRegisterValue: bay.breakerState === 'CLOSED' ? 1 : 0,
      scalingFactor: 1,
      scaledEngineeringValue: bay.breakerState === 'CLOSED' ? '1 (ENERGIZED)' : '0 (DE-ENERGIZED)',
      unit: 'Word',
      unitId,
      serverIp,
      pollIntervalMs: 2000,
      quality: 'GOOD',
    },
  ];
}

export function buildIec104TelecontrolTable(bays: BayEquipment[]): Iec104IoaEntry[] {
  const entries: Iec104IoaEntry[] = [];
  const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 23);

  bays.slice(0, 12).forEach((bay, idx) => {
    const iedPrefix = bay.iedId.replace(/-/g, '_');
    // 1. Double-Point Breaker Position (IOA 1001 + idx)
    entries.push({
      ioa: 1001 + idx,
      commonAddress: 132,
      typeId: '31 (M_DP_TB_1)',
      typeDescription: 'Double-Point Information with CP56Time2a',
      cot: '3 (Spontaneous) / 20 (Interrogated by GI)',
      bayCode: bay.bayCode,
      signalDescription: `${bay.name} — Circuit Breaker Position (52a/52b)`,
      sourceProtocol: 'IEC 61850 MMS (TCP/102)',
      sourceReference: `${iedPrefix}Application/XCBR1.Pos.stVal`,
      valueText: bay.breakerState === 'CLOSED' ? '2 (ON / CLOSED)' : '1 (OFF / OPEN)',
      quality: bay.quality === 'GOOD' ? '0x00 (IV=0, NT=0, SB=0, BL=0)' : '0x80 (IV=1 Invalid)',
      timestamp: nowStr,
    });

    // 2. Measured Value Short Float Active Power MW (IOA 3001 + idx)
    entries.push({
      ioa: 3001 + idx,
      commonAddress: 132,
      typeId: '36 (M_ME_TF_1)',
      typeDescription: 'Measured Value, Short Floating Point with CP56Time2a',
      cot: '3 (Spontaneous) / 1 (Periodic/Cyclic)',
      bayCode: bay.bayCode,
      signalDescription: `${bay.name} — Three-Phase Active Power (MW)`,
      sourceProtocol: bay.voltageKv === 33 ? 'Modbus TCP (TCP/502)' : 'IEC 61850 MMS (TCP/102)',
      sourceReference:
        bay.voltageKv === 33
          ? `Modbus Unit ${idx + 1} Reg 30009 → ${iedPrefix}Meas/MMXU1.TotW.mag.f`
          : `${iedPrefix}Meas/MMXU1.TotW.mag.f`,
      valueText: `${bay.activePowerMw.toFixed(2)} MW`,
      quality: '0x00 (GOOD / Overflow=0)',
      timestamp: nowStr,
    });

    // 3. Double Command Breaker Operate (IOA 6001 + idx)
    entries.push({
      ioa: 6001 + idx,
      commonAddress: 132,
      typeId: '46 (C_DC_NA_1)',
      typeDescription: 'Double Command (Select-Before-Operate / Execute)',
      cot: '6 (Activation) → 7 (Activation Confirm) → 10 (Termination)',
      bayCode: bay.bayCode,
      signalDescription: `${bay.name} — Remote RCC Breaker Trip/Close Command`,
      sourceProtocol: 'IEC 61850 MMS (TCP/102)',
      sourceReference: `${iedPrefix}Application/CSWI1.Pos.Oper.ctlVal`,
      valueText: bay.breakerState === 'CLOSED' ? 'READY (2=ON)' : 'READY (1=OFF)',
      quality: bay.localRemote === 'REMOTE' ? 'SBO ARMED (REMOTE)' : 'BLOCKED (LOCAL MODE)',
      timestamp: nowStr,
    });
  });

  return entries;
}

export function buildOpcUaAddressSpace(bays: BayEquipment[]): OpcUaNodeEntry[] {
  const nodes: OpcUaNodeEntry[] = [];
  const nowStr = new Date().toISOString();

  bays.slice(0, 12).forEach((bay) => {
    const iedPrefix = bay.iedId.replace(/-/g, '_');
    const baseNode = `ns=2;s=SAS.${bay.voltageKv}kV.${bay.bayCode.replace(/-/g, '_')}`;

    nodes.push({
      nodeId: `${baseNode}.XCBR1.Pos.stVal`,
      browseName: `2:XCBR1_Pos_stVal`,
      displayName: `${bay.bayCode} Breaker Position (XCBR1.Pos.stVal)`,
      nodeClass: 'Variable',
      bayCode: bay.bayCode,
      dataType: 'String',
      accessLevel: 'CurrentRead | CurrentWrite',
      sourceProtocol: 'IEC 61850 MMS (TCP/102)',
      sourceIecRef: `${iedPrefix}Application/XCBR1.Pos.stVal`,
      valueText: bay.breakerState,
      statusCode: bay.quality === 'GOOD' ? 'Good (0x00000000)' : 'Bad (0x80000000)',
      sourceTimestamp: nowStr,
      serverTimestamp: nowStr,
    });

    nodes.push({
      nodeId: `${baseNode}.MMXU1.TotW`,
      browseName: `2:MMXU1_TotW_mag_f`,
      displayName: `${bay.bayCode} Active Power MW (MMXU1.TotW)`,
      nodeClass: 'Variable',
      bayCode: bay.bayCode,
      dataType: 'Double',
      accessLevel: 'CurrentRead',
      sourceProtocol: bay.voltageKv === 33 ? 'Modbus TCP (TCP/502) & IEC 61850 MMS' : 'IEC 61850 MMS (TCP/102)',
      sourceIecRef: `${iedPrefix}Meas/MMXU1.TotW.mag.f`,
      valueText: `${bay.activePowerMw.toFixed(2)} MW`,
      statusCode: 'Good (0x00000000)',
      sourceTimestamp: nowStr,
      serverTimestamp: nowStr,
    });

    nodes.push({
      nodeId: `${baseNode}.MMXU1.PPV.phsAB`,
      browseName: `2:MMXU1_PPV_phsAB`,
      displayName: `${bay.bayCode} Bus/Line Voltage kV (MMXU1.PPV)`,
      nodeClass: 'Variable',
      bayCode: bay.bayCode,
      dataType: 'Double',
      accessLevel: 'CurrentRead',
      sourceProtocol: 'IEC 61850 MMS (TCP/102)',
      sourceIecRef: `${iedPrefix}Meas/MMXU1.PPV.phsAB.cVal.mag.f`,
      valueText: `${bay.voltageAbKv.toFixed(2)} kV`,
      statusCode: 'Good (0x00000000)',
      sourceTimestamp: nowStr,
      serverTimestamp: nowStr,
    });
  });

  return nodes;
}

export function getBayProtocolBreakdown(bay: BayEquipment, indexInList = 0) {
  const iedPrefix = bay.iedId.replace(/-/g, '_');
  const ioaBase = 1001 + indexInList;
  const modbusUnitId = (indexInList % 14) + 1;

  return {
    mms: {
      protocol: 'IEC 61850 MMS — TCP Port 102',
      role: 'IED MMS Server ↔ SCADA MMS Client (10.132.10.200)',
      statusRef: `${iedPrefix}Application/XCBR1.Pos.stVal`,
      measRef: `${iedPrefix}Meas/MMXU1.TotW.mag.f`,
      rcbRef: `${iedPrefix}Application/LLN0$BR$brcbSt01`,
    },
    goose: {
      protocol: 'IEC 61850 GOOSE — EtherType 0x88B8',
      role: 'L2 Multicast Publisher/Subscriber (VLAN 20/101)',
      gocbRef: `${iedPrefix}FeedProt/LLN0$GO$gcbTrip`,
      multicastMac: `01-0C-CD-01-00-${String(indexInList + 1).padStart(2, '0')}`,
      appId: `0x00${String(indexInList + 1).padStart(2, '0')}`,
    },
    modbus: {
      protocol: 'Modbus TCP — TCP Port 502',
      role: `Feeder Energy Meter (10.132.30.${50 + modbusUnitId} • Unit ID ${modbusUnitId}) ↔ SCADA / Gateway`,
      registers: 'Reg 30001 (kV), Reg 30003 (A), Reg 30009 (MW), Reg 40001 (MWh)',
    },
    iec104: {
      protocol: 'IEC 60870-5-104 (IEC-104) — TCP Port 2404',
      role: 'Station Gateway (10.132.10.190 • COA 132) ↔ Remote Control Center (RCC)',
      ioaStatus: `IOA ${ioaBase} (Type 31 M_DP_TB_1 — Breaker Pos)`,
      ioaMeas: `IOA ${3001 + indexInList} (Type 36 M_ME_TF_1 — Active Power MW)`,
      ioaCmd: `IOA ${6001 + indexInList} (Type 46 C_DC_NA_1 — Remote Command)`,
    },
    opcUa: {
      protocol: 'OPC UA — opc.tcp://10.132.10.200:4840',
      role: 'SCADA OPC UA Server ↔ Enterprise Historian / Analytics Client',
      nodeIdStatus: `ns=2;s=SAS.${bay.voltageKv}kV.${bay.bayCode.replace(/-/g, '_')}.XCBR1.Pos.stVal`,
      nodeIdMw: `ns=2;s=SAS.${bay.voltageKv}kV.${bay.bayCode.replace(/-/g, '_')}.MMXU1.TotW`,
    },
    timeSync: {
      protocol:
        bay.voltageKv === 132 || bay.voltageKv === 33
          ? 'IEEE 1588v2 PTP (L2 0x88F7) + SNTP (UDP/123)'
          : 'SNTP (UDP Port 123) + IEEE 1588v2 PTP',
      role: 'Meinberg LANTIME M400 Grandmaster (192.168.10.100) → Bay IED & Meter',
      accuracy: '±38 ns (PTP Power Profile C37.238) / ±0.5 ms (SNTP)',
    },
  };
}
