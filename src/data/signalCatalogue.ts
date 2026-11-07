import {
  BayEquipment,
  InstantiatedSasSignal,
  PowerTransformer,
  SasSignalTemplate,
  VendorName,
} from '../types/substation';

export const FIFTY_SAS_SIGNAL_TEMPLATES: SasSignalTemplate[] = [
  // ================= Circuit breaker and switchgear — 1–15 =================
  {
    catalogNumber: 1,
    signalName: 'Circuit Breaker Position',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_DP',
    logicalNodeClass: 'XCBR1',
    dataObject: 'Pos',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'DPC',
    dataType: 'Dbpos (00=Intermediate, 01=Open, 10=Closed, 11=Bad)',
    controlModel: 'sbo-with-enhanced-security',
    defaultDataset: 'dsStatus',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'CB.POS_DP',
    hmiObjectType: 'IEC_CB_Symbol_2Bit',
    testProcedureSummary: 'Verify 52a/52b auxiliary contacts wired to binary inputs BI1/BI2; validate Dbpos transitions and timestamp in SOE.',
    engineeringNote: 'Primary double-point status in XCBR1.Pos.stVal; Open/Closed single-point indications (#2, #3) are derived from this DPC or mapped to auxiliary contacts.',
  },
  {
    catalogNumber: 2,
    signalName: 'Circuit Breaker Open Indication',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'XCBR1',
    dataObject: 'Pos',
    dataAttribute: 'stVal[OPEN_52b]',
    fc: 'ST',
    cdc: 'SPS (Derived from DPC)',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsStatus',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'CB.OPEN_IND',
    hmiObjectType: 'Status_LED_Green',
    testProcedureSummary: 'Open breaker locally/remotely; confirm 52b contact high and XCBR1.Pos.stVal == 1 (off/open).',
    engineeringNote: 'Derived from XCBR1.Pos.stVal == off (01) or dedicated GGIO1.Ind01.stVal when 52b is separately marshalled.',
  },
  {
    catalogNumber: 3,
    signalName: 'Circuit Breaker Closed Indication',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'XCBR1',
    dataObject: 'Pos',
    dataAttribute: 'stVal[CLOSED_52a]',
    fc: 'ST',
    cdc: 'SPS (Derived from DPC)',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsStatus',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'CB.CLOSED_IND',
    hmiObjectType: 'Status_LED_Red',
    testProcedureSummary: 'Close breaker; confirm 52a contact high and XCBR1.Pos.stVal == 2 (on/closed).',
    engineeringNote: 'Derived from XCBR1.Pos.stVal == on (10) or dedicated GGIO1.Ind02.stVal.',
  },
  {
    catalogNumber: 4,
    signalName: 'Circuit Breaker Trip Indication',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PTRC1',
    dataObject: 'Tr',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'CB.TRIP_IND',
    hmiObjectType: 'Alarm_Banner_FlashingRed',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Inject secondary fault current or trigger protection trip; verify PTRC1.Tr.general asserts and latches Master Trip 86.',
    engineeringNote: 'Conditioned by protection trip conditioning node PTRC1 and/or 86 lockout relay supervision.',
  },
  {
    catalogNumber: 5,
    signalName: 'Circuit Breaker Close Command',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'CONTROL_DPC',
    logicalNodeClass: 'CSWI1',
    dataObject: 'Pos',
    dataAttribute: 'Oper.ctlVal[TRUE]',
    fc: 'CO',
    cdc: 'DPC',
    dataType: 'BOOLEAN (ctlVal=true)',
    controlModel: 'sbo-with-enhanced-security',
    defaultDataset: 'dsStatus',
    transportType: 'MMS_CONTROL',
    scadaTagSuffix: 'CB.CMD_CLOSE',
    hmiObjectType: 'SBO_PushButton_Close',
    testProcedureSummary: 'Execute MMS SelectWithValue(true) followed by Operate(true) on CSWI1.Pos; verify CILO1.EnaCls and CSWI25 synch check.',
    engineeringNote: 'Uses IEC 61850 Control Model 4 (SBO with enhanced security) with CommandTermination confirmation.',
  },
  {
    catalogNumber: 6,
    signalName: 'Circuit Breaker Open Command',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'CONTROL_DPC',
    logicalNodeClass: 'CSWI1',
    dataObject: 'Pos',
    dataAttribute: 'Oper.ctlVal[FALSE]',
    fc: 'CO',
    cdc: 'DPC',
    dataType: 'BOOLEAN (ctlVal=false)',
    controlModel: 'sbo-with-enhanced-security',
    defaultDataset: 'dsStatus',
    transportType: 'MMS_CONTROL',
    scadaTagSuffix: 'CB.CMD_OPEN',
    hmiObjectType: 'SBO_PushButton_Open',
    testProcedureSummary: 'Execute MMS SelectWithValue(false) followed by Operate(false) on CSWI1.Pos; verify shunt trip coil energization.',
    engineeringNote: 'Uses IEC 61850 Control Model 4 (SBO with enhanced security) on CSWI1.Pos.',
  },
  {
    catalogNumber: 7,
    signalName: 'Breaker Spring Charged Status',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'SOPM1',
    dataObject: 'SprChg',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsStatus',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'CB.SPR_CHG',
    hmiObjectType: 'Interlock_Badge',
    alarmSeverity: 'MINOR',
    testProcedureSummary: 'Simulate spring limit switch open after close cycle; verify SOPM1/GGIO1 spring discharged alarm after 15 s motor timer.',
    engineeringNote: 'Mapped to SOPM1 (Switchgear Operating Mechanism) or vendor GGIO1.Ind03.stVal.',
  },
  {
    catalogNumber: 8,
    signalName: 'Breaker SF6/Gas Pressure Alarm',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'SIMG1',
    dataObject: 'PresAlm',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsStatus',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'CB.SF6_ALM',
    hmiObjectType: 'Alarm_Indicator_Amber',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Bridge SF6 density monitor Stage-1 (Alarm) and Stage-2 (Lockout) contacts; verify SIMG1.PresAlm.stVal and CILO block.',
    engineeringNote: 'Insulation Medium Supervision Logical Node SIMG1 models gas density/pressure supervision.',
  },
  {
    catalogNumber: 9,
    signalName: 'Breaker Trip Circuit Supervision Alarm',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'SPTR1',
    dataObject: 'TcsAlm',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsDiag',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'CB.TCS_ALM',
    hmiObjectType: 'Alarm_Indicator_Red',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Open trip coil supervision loop (ANSI 74TC) in both CB Open and CB Closed states; confirm 400 ms delayed alarm.',
    engineeringNote: 'Monitors continuity of TC1 and TC2 across 52a/52b auxiliary contacts.',
  },
  {
    catalogNumber: 10,
    signalName: 'Breaker Control Supply Failure',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'GGIO1',
    dataObject: 'DcSupFail',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsDiag',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'CB.DC_FAIL',
    hmiObjectType: 'Alarm_Indicator_Amber',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Trip 110V DC MCB auxiliary contact in marshalling kiosk; verify immediate SCADA alarm and CILO close inhibit.',
    engineeringNote: 'Supervises bay 110V/220V DC control supply MCB auxiliary contact.',
  },
  {
    catalogNumber: 11,
    signalName: 'Local/Remote Selection',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'CSWI1',
    dataObject: 'Loc',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN (true=Local, false=Remote)',
    controlModel: 'status-only',
    defaultDataset: 'dsStatus',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'BAY.LOC_REM',
    hmiObjectType: 'Mode_Badge_Cyan',
    testProcedureSummary: 'Turn bay 43LR selector switch to LOCAL; verify CSWI1.Loc.stVal=true and confirm SCADA MMS Operate commands are rejected with Blocked-by-switching-hierarchy.',
    engineeringNote: 'Standardized in LLN0.Loc / CSWI1.Loc; blocks remote SCADA originators when true.',
  },
  {
    catalogNumber: 12,
    signalName: 'Disconnector Position',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_DP',
    logicalNodeClass: 'XSWI1',
    dataObject: 'Pos',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'DPC',
    dataType: 'Dbpos',
    controlModel: 'sbo-with-enhanced-security',
    defaultDataset: 'dsStatus',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'DS_Q1.POS',
    hmiObjectType: 'IEC_Isolator_Symbol',
    testProcedureSummary: 'Operate motorized isolator Q1/Q9 with CB OPEN; verify XSWI1.Pos.stVal GOOSE publication for station-wide interlocking.',
    engineeringNote: 'Published via GOOSE so bus-coupler and adjacent bays evaluate station-wide interlocking.',
  },
  {
    catalogNumber: 13,
    signalName: 'Earth Switch Position',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_DP',
    logicalNodeClass: 'XSWI2',
    dataObject: 'Pos',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'DPC',
    dataType: 'Dbpos',
    controlModel: 'sbo-with-enhanced-security',
    defaultDataset: 'dsStatus',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'ES_Q8.POS',
    hmiObjectType: 'IEC_EarthSwitch_Symbol',
    testProcedureSummary: 'Verify XSWI2.SwTyp=EarthingSwitch; confirm closing Q8 blocks Q1, Q9 and CB closing via CILO1.',
    engineeringNote: 'XSWI instance with SwTyp=EarthingSwitch (Q8).',
  },
  {
    catalogNumber: 14,
    signalName: 'Interlocking Permissive Status',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'CILO1',
    dataObject: 'EnaCls',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsStatus',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'BAY.CILO_OK',
    hmiObjectType: 'Interlock_Lock_Icon',
    testProcedureSummary: 'Test boolean interlocking equation in CILO1 (EnaCls & EnaOpn) across all invalid disconnector/earth-switch/coupler combinations.',
    engineeringNote: 'CILO1 evaluates local and GOOSE-subscribed apparatus positions before CSWI1 issues output.',
  },
  {
    catalogNumber: 15,
    signalName: 'Breaker Operation Counter',
    category: 'Circuit Breaker & Switchgear',
    signalKind: 'COUNTER_BCR',
    logicalNodeClass: 'XCBR1',
    dataObject: 'OpCnt',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'INS',
    dataType: 'INT32',
    controlModel: 'status-only',
    defaultDataset: 'dsDiag',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'CB.OP_CNT',
    hmiObjectType: 'Numeric_Counter_Display',
    testProcedureSummary: 'Cycle breaker Open-Close-Open; verify XCBR1.OpCnt.stVal increments by 1 on each opening operation.',
    engineeringNote: 'Used for condition-based maintenance (CBM) and I²t contact wear monitoring.',
  },

  // ================= Protection signals — 16–28 =================
  {
    catalogNumber: 16,
    signalName: 'Overcurrent Protection Pickup',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACD',
    logicalNodeClass: 'PTOC1',
    dataObject: 'Str',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACD',
    dataType: 'BOOLEAN (+dirGeneral)',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.51_STR',
    hmiObjectType: 'Protection_LED_Amber',
    alarmSeverity: 'WARNING',
    testProcedureSummary: 'Inject 1.15 × Ip secondary current; verify PTOC1.Str.general asserts immediately and resets on current drop-off.',
    engineeringNote: 'ANSI 50/51 Phase Overcurrent start/pickup (ACD includes phase and directionality attributes).',
  },
  {
    catalogNumber: 17,
    signalName: 'Overcurrent Protection Trip',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PTOC1',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.51_OP',
    hmiObjectType: 'Protection_LED_Red',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Inject 2.5 × Ip secondary current and measure IDMT operating time against IEC Standard Inverse curve.',
    engineeringNote: 'Feeds PTRC1.Tr.general to trip circuit breaker and publish GOOSE for breaker failure initiation.',
  },
  {
    catalogNumber: 18,
    signalName: 'Earth Fault Protection Pickup',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACD',
    logicalNodeClass: 'PTOC2',
    dataObject: 'Str',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACD',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.51N_STR',
    hmiObjectType: 'Protection_LED_Amber',
    alarmSeverity: 'WARNING',
    testProcedureSummary: 'Inject zero-sequence current 3I0 > I0p; verify PTOC2.Str.general asserts.',
    engineeringNote: 'ANSI 50N/51N Earth Fault protection start.',
  },
  {
    catalogNumber: 19,
    signalName: 'Earth Fault Protection Trip',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PTOC2',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.51N_OP',
    hmiObjectType: 'Protection_LED_Red',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Inject 3I0 = 2.0 × I0p; verify timed earth fault trip PTOC2.Op.general and CB trip.',
    engineeringNote: 'ANSI 50N/51N Earth Fault operate signal.',
  },
  {
    catalogNumber: 20,
    signalName: 'Transformer Differential Protection Trip',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PDIF1',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.87T_OP',
    hmiObjectType: 'Protection_LED_Red',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Perform dual-slope differential characteristic test with 2nd harmonic restraint check; verify HV + LV CB simultaneous trip.',
    engineeringNote: 'Available only on Transformer protection IEDs (7UT86, P633, RET615, T60).',
  },
  {
    catalogNumber: 21,
    signalName: 'Restricted Earth Fault Protection Trip',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PDIF2',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.64REF_OP',
    hmiObjectType: 'Protection_LED_Red',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Inject differential zero-sequence current between neutral CT and phase CTs; verify instantaneous 64REF operation.',
    engineeringNote: 'ANSI 64REF low-impedance or high-impedance restricted earth fault on transformer windings.',
  },
  {
    catalogNumber: 22,
    signalName: 'Distance Protection Zone Trip',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PDIS1',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.21_Z1_OP',
    hmiObjectType: 'Protection_LED_Red',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Inject fault impedance inside 80% Zone 1 Mho/Quad polygon on 132 kV Line IED; verify instantaneous trip < 25 ms.',
    engineeringNote: 'Instantiated on 132 kV transmission line protection IEDs (SIPROTEC 7SA87, Multilin D60).',
  },
  {
    catalogNumber: 23,
    signalName: 'Under Voltage Protection Alarm',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PTUV1',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'PROT.27_ALM',
    hmiObjectType: 'Alarm_Indicator_Amber',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Ramp secondary VT voltage below 0.85 pu; verify PTUV1 pickup and time-delayed operation.',
    engineeringNote: 'ANSI 27 Undervoltage supervision; blocked when VT MCB trips (60VTS).',
  },
  {
    catalogNumber: 24,
    signalName: 'Over Voltage Protection Alarm',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PTOV1',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'PROT.59_ALM',
    hmiObjectType: 'Alarm_Indicator_Amber',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Ramp secondary VT voltage above 1.12 pu; verify PTOV1 pickup and alarm generation.',
    engineeringNote: 'ANSI 59 Overvoltage protection.',
  },
  {
    catalogNumber: 25,
    signalName: 'Under Frequency Protection Alarm',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PTUF1',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsProtTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.81U_ALM',
    hmiObjectType: 'Alarm_Indicator_Amber',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Step frequency from 50.00 Hz to 49.10 Hz; verify PTUF1 stage-1 under-frequency load-shedding pickup.',
    engineeringNote: 'ANSI 81U Under-frequency protection used for automatic load shedding (UFLS).',
  },
  {
    catalogNumber: 26,
    signalName: 'Breaker Failure Protection Operation',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'RBRF1',
    dataObject: 'OpEx',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsGooseTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.50BF_OP',
    hmiObjectType: 'Alarm_Banner_FlashingRed',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Issue protection trip while keeping CB 52a contact forced CLOSED and current > I_BF; verify RBRF1.OpEx GOOSE trips adjacent bus section breakers after 150 ms.',
    engineeringNote: 'RBRF1.OpIn (retrip) at 60 ms, RBRF1.OpEx (external busbar trip via GOOSE) at 150 ms.',
  },
  {
    catalogNumber: 27,
    signalName: 'Auto Reclose Status',
    category: 'Protection Signals',
    signalKind: 'DIAGNOSTIC_ENS',
    logicalNodeClass: 'RREC1',
    dataObject: 'AutoRecSt',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'ENS',
    dataType: 'ENUM (1=Ready, 2=InProgress, 3=Successful, 4=Unsuccessful/Lockout)',
    controlModel: 'status-only',
    defaultDataset: 'dsStatus',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'PROT.79_STAT',
    hmiObjectType: 'Status_Pill_Text',
    testProcedureSummary: 'Simulate transient overhead line fault; verify dead-time timer, automatic reclose shot, and reclaim timer to Ready.',
    engineeringNote: 'ANSI 79 Auto-Recloser Logical Node RREC1.',
  },
  {
    catalogNumber: 28,
    signalName: 'Protection Relay General Trip',
    category: 'Protection Signals',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'PTRC1',
    dataObject: 'Op',
    dataAttribute: 'general',
    fc: 'ST',
    cdc: 'ACT',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsGooseTrip',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'PROT.GEN_TRIP',
    hmiObjectType: 'Alarm_Banner_FlashingRed',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Verify OR-gate aggregation of all enabled protection elements (PTOC, PDIS, PDIF) into PTRC1.Op.general.',
    engineeringNote: 'Master Protection Trip Conditioning Logical Node PTRC1.',
  },

  // ================= Electrical measurements — 29–40 =================
  {
    catalogNumber: 29,
    signalName: 'Phase A Current',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_CMV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'A.phsA',
    dataAttribute: 'cVal.mag.f',
    fc: 'MX',
    cdc: 'CMV',
    dataType: 'FLOAT32 (A)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.IA_AMP',
    hmiObjectType: 'Analog_Readout_Amps',
    testProcedureSummary: 'Inject 0.25A, 0.5A, 1.0A, 1.2A into CT Phase A; verify primary scaling and deadband reporting in MMXU1.A.phsA.',
    engineeringNote: 'Complex Measured Value (CMV) containing cVal.mag.f and cVal.ang.f.',
  },
  {
    catalogNumber: 30,
    signalName: 'Phase B Current',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_CMV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'A.phsB',
    dataAttribute: 'cVal.mag.f',
    fc: 'MX',
    cdc: 'CMV',
    dataType: 'FLOAT32 (A)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.IB_AMP',
    hmiObjectType: 'Analog_Readout_Amps',
    testProcedureSummary: 'Inject calibrated current into CT Phase B (-120°); verify accuracy within ±0.2%.',
    engineeringNote: 'Reported via Unbuffered or Buffered Report Control Block with deadband filtering.',
  },
  {
    catalogNumber: 31,
    signalName: 'Phase C Current',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_CMV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'A.phsC',
    dataAttribute: 'cVal.mag.f',
    fc: 'MX',
    cdc: 'CMV',
    dataType: 'FLOAT32 (A)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.IC_AMP',
    hmiObjectType: 'Analog_Readout_Amps',
    testProcedureSummary: 'Inject calibrated current into CT Phase C (+120°); verify accuracy within ±0.2%.',
    engineeringNote: 'MMXU1.A.phsC.cVal.mag.f.',
  },
  {
    catalogNumber: 32,
    signalName: 'Line Voltage Vab',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_CMV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'PPV.phsAB',
    dataAttribute: 'cVal.mag.f',
    fc: 'MX',
    cdc: 'CMV',
    dataType: 'FLOAT32 (kV)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.VAB_KV',
    hmiObjectType: 'Analog_Readout_kV',
    testProcedureSummary: 'Apply 110V L-L secondary voltage; confirm primary kV scaling matches VT ratio.',
    engineeringNote: 'Phase-to-phase voltage WYE/DEL object PPV.phsAB.',
  },
  {
    catalogNumber: 33,
    signalName: 'Line Voltage Vbc',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_CMV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'PPV.phsBC',
    dataAttribute: 'cVal.mag.f',
    fc: 'MX',
    cdc: 'CMV',
    dataType: 'FLOAT32 (kV)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.VBC_KV',
    hmiObjectType: 'Analog_Readout_kV',
    testProcedureSummary: 'Apply balanced 3-phase VT secondary voltage; verify MMXU1.PPV.phsBC.cVal.mag.f.',
    engineeringNote: 'Phase-to-phase voltage PPV.phsBC.',
  },
  {
    catalogNumber: 34,
    signalName: 'Line Voltage Vca',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_CMV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'PPV.phsCA',
    dataAttribute: 'cVal.mag.f',
    fc: 'MX',
    cdc: 'CMV',
    dataType: 'FLOAT32 (kV)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.VCA_KV',
    hmiObjectType: 'Analog_Readout_kV',
    testProcedureSummary: 'Apply balanced 3-phase VT secondary voltage; verify MMXU1.PPV.phsCA.cVal.mag.f.',
    engineeringNote: 'Phase-to-phase voltage PPV.phsCA.',
  },
  {
    catalogNumber: 35,
    signalName: 'Active Power MW',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_MV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'TotW',
    dataAttribute: 'mag.f',
    fc: 'MX',
    cdc: 'MV',
    dataType: 'FLOAT32 (MW)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.P_MW',
    hmiObjectType: 'Analog_Readout_MW',
    testProcedureSummary: 'Inject 3-phase V and I at cos(φ)=0.95; verify P = √3·V·I·cos(φ) in MMXU1.TotW.mag.f.',
    engineeringNote: 'Total 3-phase Active Power with unit multiplier (SIUnit=W, multiplier=M).',
  },
  {
    catalogNumber: 36,
    signalName: 'Reactive Power MVAr',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_MV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'TotVAr',
    dataAttribute: 'mag.f',
    fc: 'MX',
    cdc: 'MV',
    dataType: 'FLOAT32 (MVAr)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.Q_MVAR',
    hmiObjectType: 'Analog_Readout_MVAr',
    testProcedureSummary: 'Inject lagging phase angle +18.2°; verify Q = √3·V·I·sin(φ) in MMXU1.TotVAr.mag.f.',
    engineeringNote: 'Total 3-phase Reactive Power.',
  },
  {
    catalogNumber: 37,
    signalName: 'Apparent Power MVA',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_MV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'TotVA',
    dataAttribute: 'mag.f',
    fc: 'MX',
    cdc: 'MV',
    dataType: 'FLOAT32 (MVA)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.S_MVA',
    hmiObjectType: 'Analog_Readout_MVA',
    testProcedureSummary: 'Verify S = √(P² + Q²) in MMXU1.TotVA.mag.f.',
    engineeringNote: 'Total 3-phase Apparent Power.',
  },
  {
    catalogNumber: 38,
    signalName: 'Power Factor',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_MV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'TotPF',
    dataAttribute: 'mag.f',
    fc: 'MX',
    cdc: 'MV',
    dataType: 'FLOAT32',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.PF',
    hmiObjectType: 'Analog_Readout_PF',
    testProcedureSummary: 'Vary V-I phase angle across 4 quadrants; verify MMXU1.TotPF.mag.f.',
    engineeringNote: 'Total 3-phase Power Factor.',
  },
  {
    catalogNumber: 39,
    signalName: 'System Frequency',
    category: 'Electrical Measurements',
    signalKind: 'MEASUREMENT_MV',
    logicalNodeClass: 'MMXU1',
    dataObject: 'Hz',
    dataAttribute: 'mag.f',
    fc: 'MX',
    cdc: 'MV',
    dataType: 'FLOAT32 (Hz)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_URCB',
    scadaTagSuffix: 'MEAS.FREQ_HZ',
    hmiObjectType: 'Analog_Readout_Hz',
    testProcedureSummary: 'Sweep test set frequency 47.50 Hz to 52.50 Hz; verify resolution of ±0.005 Hz.',
    engineeringNote: 'System power frequency measured from VT secondary.',
  },
  {
    catalogNumber: 40,
    signalName: 'Energy Import MWh',
    category: 'Electrical Measurements',
    signalKind: 'COUNTER_BCR',
    logicalNodeClass: 'MMTR1',
    dataObject: 'SupWh',
    dataAttribute: 'actVal',
    fc: 'ST',
    cdc: 'BCR',
    dataType: 'INT64 (MWh)',
    controlModel: 'status-only',
    defaultDataset: 'dsMeas',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'METER.IMP_MWH',
    hmiObjectType: 'Energy_Counter_Register',
    testProcedureSummary: 'Run constant power injection for 15 minutes; compare integrated MWh against reference standard meter.',
    engineeringNote: 'Metering Logical Node MMTR1 Binary Counter Reading (BCR).',
  },

  // ================= Transformer and SAS system — 41–50 =================
  {
    catalogNumber: 41,
    signalName: 'Transformer Oil Temperature',
    category: 'Transformer & SAS System',
    signalKind: 'MEASUREMENT_MV',
    logicalNodeClass: 'SIML1',
    dataObject: 'Tmp',
    dataAttribute: 'mag.f',
    fc: 'MX',
    cdc: 'MV',
    dataType: 'FLOAT32 (°C)',
    controlModel: 'status-only',
    defaultDataset: 'dsTransformer',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'TX.OIL_TEMP_C',
    hmiObjectType: 'Gauge_Thermometer_Oil',
    alarmSeverity: 'WARNING',
    testProcedureSummary: 'Inject 4–20 mA RTD/transducer signal corresponding to 40°C, 85°C (Alarm), 95°C (Trip); verify SCADA scaling.',
    engineeringNote: 'Insulation Medium Liquid Supervision Logical Node SIML1.Tmp.mag.f.',
  },
  {
    catalogNumber: 42,
    signalName: 'Transformer Winding Temperature',
    category: 'Transformer & SAS System',
    signalKind: 'MEASUREMENT_MV',
    logicalNodeClass: 'SPTR1',
    dataObject: 'HPTmp',
    dataAttribute: 'mag.f',
    fc: 'MX',
    cdc: 'MV',
    dataType: 'FLOAT32 (°C)',
    controlModel: 'status-only',
    defaultDataset: 'dsTransformer',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'TX.WTI_TEMP_C',
    hmiObjectType: 'Gauge_Thermometer_Winding',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Inject 4–20 mA WTI loop current for 50°C, 95°C (Alarm), 105°C (Trip); verify cooler bank start and SCADA alarm.',
    engineeringNote: 'Power Transformer Supervision Logical Node SPTR1 Hot-Spot Winding Temperature.',
  },
  {
    catalogNumber: 43,
    signalName: 'Transformer OLTC Tap Position',
    category: 'Transformer & SAS System',
    signalKind: 'CONTROL_ISC',
    logicalNodeClass: 'YLTC1',
    dataObject: 'TapPos',
    dataAttribute: 'val.stVal',
    fc: 'ST',
    cdc: 'ISC',
    dataType: 'INT8 (Tap 1..17)',
    controlModel: 'sbo-with-enhanced-security',
    defaultDataset: 'dsTransformer',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'TX.OLTC_TAP',
    hmiObjectType: 'OLTC_Step_Controller',
    testProcedureSummary: 'Step OLTC through Taps 1 to 17 via BCD/resistor transducer; verify YLTC1.TapPos.val.stVal and TapChg Raise/Lower commands.',
    engineeringNote: 'Tap Changer Logical Node YLTC1 (Integer Step Controlled ISC) paired with ATCC1 voltage regulator.',
  },
  {
    catalogNumber: 44,
    signalName: 'Transformer Buchholz Alarm',
    category: 'Transformer & SAS System',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'SIML1',
    dataObject: 'GasInsAlm',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsTransformer',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'TX.BUCHHOLZ_ALM',
    hmiObjectType: 'Alarm_Banner_Amber',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Actuate Buchholz upper float test button on conservator pipe; confirm SIML1.GasInsAlm.stVal and SOE.',
    engineeringNote: 'Buchholz gas accumulation alarm (63B-A); lower flap is mapped to Buchholz Surge Trip (63B-T).',
  },
  {
    catalogNumber: 45,
    signalName: 'Transformer Pressure Relief Trip',
    category: 'Transformer & SAS System',
    signalKind: 'PROTECTION_ACT',
    logicalNodeClass: 'SPTR1',
    dataObject: 'PresRelTrp',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsTransformer',
    transportType: 'GOOSE_AND_MMS',
    scadaTagSuffix: 'TX.PRD_TRIP',
    hmiObjectType: 'Alarm_Banner_FlashingRed',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Operate PRD microswitch flag; verify direct lockout trip of both HV and LV circuit breakers via GOOSE and hardwired 86T.',
    engineeringNote: 'Sudden tank overpressure relief device (ANSI 63PRD) trip.',
  },
  {
    catalogNumber: 46,
    signalName: 'Transformer Cooling System Status',
    category: 'Transformer & SAS System',
    signalKind: 'DIAGNOSTIC_ENS',
    logicalNodeClass: 'CCGR1',
    dataObject: 'FanCtl',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'ENUM (ONAN / ONAF-1 / ONAF-2)',
    controlModel: 'direct-with-normal-security',
    defaultDataset: 'dsTransformer',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'TX.COOL_STAT',
    hmiObjectType: 'Cooling_Fan_Status_Widget',
    testProcedureSummary: 'Simulate WTI threshold > 60°C; verify Cooling Group Control CCGR1 starts Fan Bank 1 (ONAF-1).',
    engineeringNote: 'Cooling Group Control Logical Node CCGR1.',
  },
  {
    catalogNumber: 47,
    signalName: 'IED Communication Health',
    category: 'Transformer & SAS System',
    signalKind: 'DIAGNOSTIC_ENS',
    logicalNodeClass: 'LPHD1',
    dataObject: 'PhyHealth',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'ENS',
    dataType: 'ENUM (1=Ok, 2=Warning, 3=Alarm)',
    controlModel: 'status-only',
    defaultDataset: 'dsDiag',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'SAS.IED_HEALTH',
    hmiObjectType: 'Network_Node_Status',
    alarmSeverity: 'MAJOR',
    testProcedureSummary: 'Disconnect optical patch cord on Port A/B; verify PRP/HSR link supervision and MMS TCP:102 association watchdog.',
    engineeringNote: 'Combined LPHD1.PhyHealth, LLN0.Health, and SCADA MMS Association state.',
  },
  {
    catalogNumber: 48,
    signalName: 'GOOSE Subscription Health',
    category: 'Transformer & SAS System',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'LGOS1',
    dataObject: 'St',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN (true=Subscribed OK, false=TAL Timeout)',
    controlModel: 'status-only',
    defaultDataset: 'dsDiag',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'SAS.GOOSE_SUB_OK',
    hmiObjectType: 'GOOSE_Link_Pill',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Disable publisher GoCB or alter VLAN ID; confirm subscriber LGOS1.St.stVal drops to false after 2 × TimeAllowedToLive.',
    engineeringNote: 'GOOSE Subscription Supervision Logical Node LGOS1 (IEC 61850-7-4 Ed.2).',
  },
  {
    catalogNumber: 49,
    signalName: 'Time Synchronization Health',
    category: 'Transformer & SAS System',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'LTMS1',
    dataObject: 'TmSyn',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'ENS',
    dataType: 'ENUM (Locked_PTP / Holdover / Unsynchronized)',
    controlModel: 'status-only',
    defaultDataset: 'dsDiag',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'SAS.TIME_SYNC_OK',
    hmiObjectType: 'Clock_Sync_Badge',
    alarmSeverity: 'MINOR',
    testProcedureSummary: 'Disconnect GPS antenna on PTP Grandmaster; verify TimeQuality ClockNotSynchronized bit in IEC 61850 UTC timestamps.',
    engineeringNote: 'Time Master Supervision Logical Node LTMS1 and UTC timestamp TimeQuality byte.',
  },
  {
    catalogNumber: 50,
    signalName: 'Station DC Supply Failure Alarm',
    category: 'Transformer & SAS System',
    signalKind: 'STATUS_SP',
    logicalNodeClass: 'ZBAT1',
    dataObject: 'BatAlm',
    dataAttribute: 'stVal',
    fc: 'ST',
    cdc: 'SPS',
    dataType: 'BOOLEAN',
    controlModel: 'status-only',
    defaultDataset: 'dsDiag',
    transportType: 'MMS_BRCB',
    scadaTagSuffix: 'SAS.STN_DC_ALM',
    hmiObjectType: 'Station_Banner_Alarm',
    alarmSeverity: 'CRITICAL',
    testProcedureSummary: 'Simulate 110V DC Battery Charger 1 rectifier failure or earth fault; verify ZBAT1.BatAlm.stVal in Station BCU.',
    engineeringNote: 'Auxiliary Battery Supervision Logical Node ZBAT1.',
  },
];

// Helper to map vendor-specific Logical Device prefixes so we never fabricate a single universal path
export function getVendorLdPrefix(vendor: VendorName, category: SasSignalTemplate['category']): string {
  switch (vendor) {
    case 'Siemens':
      if (category === 'Circuit Breaker & Switchgear') return 'Application';
      if (category === 'Protection Signals') return 'FeedProt';
      if (category === 'Electrical Measurements') return 'Meas';
      return 'System';
    case 'Schneider Electric':
      if (category === 'Circuit Breaker & Switchgear') return 'Control';
      if (category === 'Protection Signals') return 'Protection';
      if (category === 'Electrical Measurements') return 'Measurements';
      return 'System';
    case 'ABB / Hitachi Energy':
      return 'LD0';
    case 'GE Vernova':
      if (category === 'Protection Signals') return 'Prot';
      if (category === 'Electrical Measurements') return 'Metering';
      return 'Master';
  }
}

export function getVendorForBay(bay: BayEquipment): { vendor: VendorName; iedModel: string } {
  if (bay.voltageKv === 132) {
    if (bay.bayType === 'LINE_INCOMER') {
      return bay.busSection === 'A'
        ? { vendor: 'Siemens', iedModel: 'SIPROTEC 5 7SA87' }
        : { vendor: 'GE Vernova', iedModel: 'Multilin D60' };
    }
    if (bay.bayType === 'TRANSFORMER_HV') {
      return bay.busSection === 'A'
        ? { vendor: 'Siemens', iedModel: 'SIPROTEC 5 7UT86' }
        : { vendor: 'Schneider Electric', iedModel: 'MiCOM P633' };
    }
    return { vendor: 'Schneider Electric', iedModel: 'MiCOM C264' };
  }
  if (bay.voltageKv === 33) {
    if (bay.bayType === 'DIST_TX_FEEDER') {
      return bay.busSection === 'A'
        ? { vendor: 'ABB / Hitachi Energy', iedModel: 'Relion RET615' }
        : { vendor: 'GE Vernova', iedModel: 'Multilin T60' };
    }
    if (bay.bayType === 'BUS_COUPLER') {
      return { vendor: 'ABB / Hitachi Energy', iedModel: 'Relion REC615' };
    }
    return bay.busSection === 'A'
      ? { vendor: 'Siemens', iedModel: 'SIPROTEC 5 7SJ85' }
      : { vendor: 'Schneider Electric', iedModel: 'MiCOM P143' };
  }
  // 11 kV
  if (bay.bayType === 'BUS_COUPLER') {
    return { vendor: 'ABB / Hitachi Energy', iedModel: 'Relion REC615' };
  }
  return bay.busSection === 'A'
    ? { vendor: 'ABB / Hitachi Energy', iedModel: 'Relion REF615' }
    : { vendor: 'GE Vernova', iedModel: 'Multilin 850' };
}

export function instantiateSignalsForSubstation(
  bays: BayEquipment[],
  transformers: PowerTransformer[]
): InstantiatedSasSignal[] {
  const results: InstantiatedSasSignal[] = [];

  for (const bay of bays) {
    const { vendor } = getVendorForBay(bay);
    const iedName = bay.iedId.replace(/-/g, '_');
    const tx = transformers.find((t) => t.id === bay.connectedTransformerId);

    for (const tpl of FIFTY_SAS_SIGNAL_TEMPLATES) {
      // Only instantiate protection/transformer signals on bays where those functions exist!
      if (
        (tpl.catalogNumber === 20 || tpl.catalogNumber === 21) &&
        bay.bayType !== 'TRANSFORMER_HV' &&
        bay.bayType !== 'DIST_TX_FEEDER'
      ) {
        continue;
      }
      if (tpl.catalogNumber === 22 && bay.bayType !== 'LINE_INCOMER') {
        continue;
      }
      if (
        tpl.catalogNumber >= 41 &&
        tpl.catalogNumber <= 46 &&
        !tx
      ) {
        continue;
      }

      const ldPrefix = getVendorLdPrefix(vendor, tpl.category);
      const iec61850Ref = `${iedName}${ldPrefix}/${tpl.logicalNodeClass}.${tpl.dataObject}.${tpl.dataAttribute}`;
      const datasetRef = `${iedName}${ldPrefix}/LLN0.${tpl.defaultDataset}`;
      const rcbOrGooseRef =
        tpl.transportType === 'GOOSE_AND_MMS'
          ? `${iedName}${ldPrefix}/LLN0$GO$gcbTrip + BRCB01`
          : tpl.transportType === 'MMS_URCB'
          ? `${iedName}${ldPrefix}/LLN0$RP$urcbMeas01`
          : tpl.transportType === 'MMS_CONTROL'
          ? `${iedName}${ldPrefix}/${tpl.logicalNodeClass}$CO$${tpl.dataObject}`
          : `${iedName}${ldPrefix}/LLN0$BR$brcbSt01`;

      let value: string | number | boolean = false;
      let unit: string | undefined;

      switch (tpl.catalogNumber) {
        case 1:
          value = bay.breakerState;
          break;
        case 2:
          value = bay.breakerState === 'OPEN';
          break;
        case 3:
          value = bay.breakerState === 'CLOSED';
          break;
        case 4:
        case 28:
          value = bay.protectionTripActive;
          break;
        case 5:
          value = 'READY (SBO)';
          break;
        case 6:
          value = 'READY (SBO)';
          break;
        case 7:
          value = bay.springCharged;
          break;
        case 8:
          value = !bay.sf6PressureNormal;
          break;
        case 9:
          value = !bay.tcsHealthy;
          break;
        case 10:
          value = !bay.dcSupplyHealthy;
          break;
        case 11:
          value = bay.localRemote;
          break;
        case 12:
          value = bay.busDisconnectorState;
          break;
        case 13:
          value = bay.earthSwitchState;
          break;
        case 14:
          value = bay.interlockPermissive;
          break;
        case 15:
          value = bay.opCounter;
          break;
        case 16:
        case 17:
          value = bay.activeTripFunctions.includes('50/51 Overcurrent');
          break;
        case 18:
        case 19:
          value = bay.activeTripFunctions.includes('50N/51N Earth Fault');
          break;
        case 20:
          value = tx ? tx.differentialTrip : false;
          break;
        case 21:
          value = tx ? tx.refTrip : false;
          break;
        case 22:
          value = bay.activeTripFunctions.includes('21 Distance Zone 1');
          break;
        case 23:
          value = bay.energized && bay.voltageAbKv < bay.voltageKv * 0.88;
          break;
        case 24:
          value = bay.voltageAbKv > bay.voltageKv * 1.1;
          break;
        case 25:
          value = bay.frequencyHz < 49.5;
          break;
        case 26:
          value = bay.activeTripFunctions.includes('50BF Breaker Failure');
          break;
        case 27:
          value = bay.autoRecloseStatus;
          break;
        case 29:
          value = bay.currentA;
          unit = 'A';
          break;
        case 30:
          value = bay.currentB;
          unit = 'A';
          break;
        case 31:
          value = bay.currentC;
          unit = 'A';
          break;
        case 32:
          value = bay.voltageAbKv;
          unit = 'kV';
          break;
        case 33:
          value = bay.voltageBcKv;
          unit = 'kV';
          break;
        case 34:
          value = bay.voltageCaKv;
          unit = 'kV';
          break;
        case 35:
          value = bay.activePowerMw;
          unit = 'MW';
          break;
        case 36:
          value = bay.reactivePowerMvar;
          unit = 'MVAr';
          break;
        case 37:
          value = bay.apparentPowerMva;
          unit = 'MVA';
          break;
        case 38:
          value = bay.powerFactor;
          break;
        case 39:
          value = bay.frequencyHz;
          unit = 'Hz';
          break;
        case 40:
          value = bay.energyImportMwh;
          unit = 'MWh';
          break;
        case 41:
          value = tx ? tx.oilTempC : 0;
          unit = '°C';
          break;
        case 42:
          value = tx ? tx.windingTempLvC : 0;
          unit = '°C';
          break;
        case 43:
          value = tx ? tx.oltcTapPosition : 9;
          break;
        case 44:
          value = tx ? tx.buchholzAlarm : false;
          break;
        case 45:
          value = tx ? tx.pressureReliefTrip : false;
          break;
        case 46:
          value = tx ? tx.coolingStage : 'ONAN';
          break;
        case 47:
          value = bay.quality === 'GOOD' ? 'OK (1)' : 'ALARM (3)';
          break;
        case 48:
          value = true;
          break;
        case 49:
          value = 'LOCKED_PTP';
          break;
        case 50:
          value = !bay.dcSupplyHealthy;
          break;
      }

      results.push({
        ...tpl,
        id: `SIG-${bay.bayCode}-${String(tpl.catalogNumber).padStart(2, '0')}`,
        bayId: bay.id,
        bayName: bay.name,
        voltageKv: bay.voltageKv,
        iedId: bay.iedId,
        iedName,
        vendor,
        iec61850Ref,
        datasetRef,
        rcbOrGooseRef,
        scadaTag: `SAS_${bay.bayCode.replace('-', '_')}_${tpl.scadaTagSuffix}`,
        value,
        unit,
        quality: bay.quality,
        timestamp: bay.lastUpdated,
      });
    }
  }

  return results;
}
