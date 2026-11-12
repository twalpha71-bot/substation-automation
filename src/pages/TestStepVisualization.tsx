import React, { useEffect, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  ClipboardList,
  Cpu,
  Download,
  GraduationCap,
  ListChecks,
  Maximize2,
  Minimize2,
  Monitor,
  Network,
  PlayCircle,
  Radio,
  RotateCcw,
  Server,
  ShieldCheck,
} from 'lucide-react';

export interface TestingGuidanceTestDef {
  group: string;
  title: string;
  purpose: string;
  prerequisites: string[];
  steps: string[];
  expected: string;
  interview: string;
}

interface TestStepVisualizationProps {
  test: TestingGuidanceTestDef;
  testIndex: number; // 1-based index into tests[] (1..14 for Tests 2..15)
  initialDone: boolean[];
  onStepChange: (stepIndex: number, checked: boolean) => void;
  onBackToAllTests: () => void;
}

type VizTab = 'PROCEDURE' | 'VISUALIZATION' | 'SIGNALS' | 'LOGIC' | 'INTERVIEW';

interface TestSimProfile {
  badgeCode: string;
  leftNodeLabel: string;
  leftNodeSub: string;
  iedLabel: string;
  iedSub: string;
  link1Label: string;
  gatewayLabel: string;
  gatewaySub: string;
  link2Label: string;
  hmiLabel: string;
  hmiSub: string;
  protocolColor: string;
  controls: { id: string; label: string; activeLabel: string; inactiveLabel: string }[];
  buildSignals: (
    simState: Record<string, boolean>,
    faultActive: boolean,
    stamp: string
  ) => { param: string; value: string; healthy: boolean; quality: string; stamp: string }[];
  buildStepDetails: (stepIdx: number, stepText: string) => {
    focusArea: 'LEFT' | 'LINK1' | 'IED' | 'GATEWAY' | 'HMI' | 'ALL';
    explanation: string;
    verifyItems: string[];
  };
}

function formatTs(d: Date): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function getProfileForTest(testIndex: number): TestSimProfile {
  switch (testIndex) {
    case 1: // Test 2: Local / Remote and SBO command
      return {
        badgeCode: '43LR',
        leftNodeLabel: '43LR & SBO Panel',
        leftNodeSub: 'Authority & Permissives',
        iedLabel: 'SIEMENS SIPROTEC 5',
        iedSub: 'CSWI1 / XCBR1 (SBOw)',
        link1Label: 'IEC 61850 SBO',
        gatewayLabel: 'Station Gateway',
        gatewaySub: 'Command Router',
        link2Label: 'Select / Operate',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'SBO Dialog & SOE',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'remote', label: '43LR Mode', activeLabel: 'REMOTE', inactiveLabel: 'LOCAL' },
          { id: 'selected', label: 'SBO Select', activeLabel: 'SELECTED (30s)', inactiveLabel: 'IDLE' },
          { id: 'permissive', label: 'CILO Permissive', activeLabel: 'PERMITTED', inactiveLabel: 'BLOCKED' },
          { id: 'operated', label: 'Breaker Pos', activeLabel: 'CLOSED (2)', inactiveLabel: 'OPEN (1)' },
        ],
        buildSignals: (s, fault, stamp) => [
          {
            param: 'CSWI1.Loc.stVal',
            value: s.remote ? 'FALSE (Remote)' : 'TRUE (Local)',
            healthy: true,
            quality: 'Good (0x00)',
            stamp,
          },
          {
            param: 'CSWI1.Pos.ctlModel',
            value: 'sbo-with-enhanced-security (4)',
            healthy: !fault,
            quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)',
            stamp,
          },
          {
            param: 'CSWI1.Pos.SBOw',
            value: !s.remote || !s.permissive ? 'AddCause: Blocked' : s.selected ? 'Select Ack+' : 'Ready',
            healthy: s.remote && s.permissive && !fault,
            quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)',
            stamp,
          },
          {
            param: 'XCBR1.Pos.stVal',
            value: s.operated ? 'CLOSED (2)' : 'OPEN (1)',
            healthy: !fault,
            quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)',
            stamp,
          },
        ],
        buildStepDetails: (idx, text) => {
          const areas: ('LEFT' | 'LINK1' | 'IED' | 'GATEWAY' | 'HMI' | 'ALL')[] = [
            'HMI', 'LEFT', 'IED', 'LEFT', 'LINK1', 'IED', 'GATEWAY', 'HMI', 'IED', 'ALL',
          ];
          return {
            focusArea: areas[idx] || 'ALL',
            explanation: `Step ${idx + 1}: ${text} Verify 43LR authority and two-step Select-Before-Operate (SBOw) handshake before any breaker actuation.`,
            verifyItems: [
              'Confirm 43LR switch state (LOCAL blocks remote SCADA_SBO)',
              'Verify SBO Select acknowledgement & 30 s select timeout window',
              'Confirm CommandTermination+ and SOE 1 ms event record',
            ],
          };
        },
      };

    case 2: // Test 3: Interlocking and synch-check (25)
      return {
        badgeCode: '25',
        leftNodeLabel: 'Bus / Line VT & Q1/Q8',
        leftNodeSub: 'CILO & ANSI 25 Inputs',
        iedLabel: 'BAY CONTROLLER',
        iedSub: 'CILO1 + RSYN1 (25)',
        link1Label: 'GOOSE / Binary',
        gatewayLabel: 'Interlock Matrix',
        gatewaySub: 'EnaCls / EnaOpn',
        link2Label: 'MMS Permissive',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'Synchrocheck View',
        protocolColor: '#00FF4C',
        controls: [
          { id: 'cilo', label: 'CILO1 Interlock', activeLabel: 'Q1/Q9 OK, Q8 OPEN', inactiveLabel: 'Q8 EARTH CLOSED' },
          { id: 'dv', label: 'ΔV (< 5%)', activeLabel: 'ΔV = 1.2% OK', inactiveLabel: 'ΔV = 14% FAIL' },
          { id: 'df', label: 'Δf (< 0.2 Hz)', activeLabel: 'Δf = 0.04 Hz OK', inactiveLabel: 'Δf = 0.8 Hz FAIL' },
          { id: 'dphi', label: 'Δφ (< 10°)', activeLabel: 'Δφ = 3.1° OK', inactiveLabel: 'Δφ = 28° FAIL' },
        ],
        buildSignals: (s, fault, stamp) => {
          const synchOk = s.dv && s.df && s.dphi;
          return [
            {
              param: 'CILO1.EnaCls.stVal',
              value: s.cilo ? 'TRUE (Permitted)' : 'FALSE (Blocked)',
              healthy: s.cilo && !fault,
              quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)',
              stamp,
            },
            {
              param: 'RSYN1.Rel.stVal',
              value: synchOk ? 'TRUE (In-Sync)' : 'FALSE (Out-of-Sync)',
              healthy: synchOk && !fault,
              quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)',
              stamp,
            },
            {
              param: 'CSWI1.Pos.ClosePerm',
              value: s.cilo && synchOk && !fault ? 'ENABLED' : 'BLOCKED',
              healthy: s.cilo && synchOk && !fault,
              quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)',
              stamp,
            },
          ];
        },
        buildStepDetails: (idx, text) => ({
          focusArea: idx < 2 ? 'LEFT' : idx < 4 ? 'IED' : idx < 6 ? 'LINK1' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Both bay interlocking (CILO1) and ANSI 25 synchrocheck (RSYN1 ΔV, Δf, Δφ) must be satisfied to permit closing.`,
          verifyItems: [
            'Check Q8 Earth Switch = OPEN and Q1/Q9 valid in CILO1',
            'Verify ΔV, Δf, and Δφ thresholds inside RSYN1',
            'Confirm close command is rejected when any permissive fails',
          ],
        }),
      };

    case 3: // Test 4: IED communication and health
      return {
        badgeCode: 'IED',
        leftNodeLabel: 'Station Switch',
        leftNodeSub: 'VLAN 10 • Port 4',
        iedLabel: 'PROTECTION IED',
        iedSub: 'LLN0 / LPHD1 Health',
        link1Label: 'TCP/102 MMS',
        gatewayLabel: 'Station Gateway',
        gatewaySub: 'Association Monitor',
        link2Label: 'Diagnostic Alarm',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'IED Health Status',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'link', label: 'Physical Link', activeLabel: 'LINK UP (100M)', inactiveLabel: 'LINK DOWN' },
          { id: 'mms', label: 'MMS Assoc', activeLabel: 'ESTABLISHED', inactiveLabel: 'DISCONNECTED' },
          { id: 'health', label: 'LPHD1.PhyHealth', activeLabel: 'OK (1)', inactiveLabel: 'ALARM (3)' },
        ],
        buildSignals: (s, fault, stamp) => {
          const up = s.link && s.mms && !fault;
          return [
            { param: 'LLN0.Health.stVal', value: up ? 'OK (1)' : 'Alarm (3)', healthy: up, quality: up ? 'Good (0x00)' : 'Invalid (0x4000)', stamp },
            { param: 'LPHD1.PhyHealth.stVal', value: s.health && !fault ? 'OK (1)' : 'Warning (2)', healthy: s.health && !fault, quality: up ? 'Good (0x00)' : 'Invalid (0x4000)', stamp },
            { param: 'MMS.TCP102.State', value: up ? 'CONNECTED' : 'COMM LOSS', healthy: up, quality: up ? 'Good (0x00)' : 'Invalid (0x4000)', stamp },
          ];
        },
        buildStepDetails: (idx, text) => ({
          focusArea: idx < 2 ? 'LEFT' : idx < 4 ? 'IED' : idx === 4 ? 'LINK1' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Validate Layer-1 Ethernet link, IP reachability, TCP/102 MMS association, and LLN0/LPHD1 diagnostic alarms.`,
          verifyItems: [
            'Verify IED IP subnet, switch port LEDs, and VLAN assignment',
            'Confirm LLN0.Health = 1 (OK) during normal operation',
            'Verify Comm-Loss alarm and Invalid/Stale quality on disconnect',
          ],
        }),
      };

    case 4: // Test 5: Signal mapping end-to-end
      return {
        badgeCode: 'MAP',
        leftNodeLabel: 'Field Contact / DI',
        leftNodeSub: 'Terminal X1:11-12',
        iedLabel: 'IED DATA MODEL',
        iedSub: 'LD0/XCBR1.Pos.stVal',
        link1Label: 'DataSet → BRCB',
        gatewayLabel: 'Station Gateway',
        gatewaySub: 'Point Map / Scaling',
        link2Label: 'IEC-104 / OPC',
        hmiLabel: 'HMI & RCC',
        hmiSub: 'Tag & Event Log',
        protocolColor: '#00FF4C',
        controls: [
          { id: 'injected', label: 'Field Input', activeLabel: 'ACTIVE (1)', inactiveLabel: 'NORMAL (0)' },
          { id: 'rcb', label: 'BRCB RptEna', activeLabel: 'ENABLED', inactiveLabel: 'DISABLED' },
          { id: 'mapped', label: 'Gateway Map', activeLabel: 'ALIGNED', inactiveLabel: 'INVERTED' },
        ],
        buildSignals: (s, fault, stamp) => [
          { param: 'LD0/XCBR1.Pos.stVal', value: s.injected ? 'ACTIVE (2)' : 'NORMAL (1)', healthy: !fault, quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)', stamp },
          { param: 'DataSet.dsStat01', value: s.rcb ? 'Included (BRCB01)' : 'Unassigned', healthy: s.rcb && !fault, quality: 'Good (0x00)', stamp },
          { param: 'HMI.Tag.CB33F03', value: s.mapped ? (s.injected ? 'CLOSED' : 'OPEN') : 'INVERTED', healthy: s.mapped && !fault, quality: fault ? 'Invalid (0x4000)' : 'Good (0x00)', stamp },
        ],
        buildStepDetails: (idx, text) => ({
          focusArea: idx === 0 ? 'LEFT' : idx <= 2 ? 'IED' : idx === 3 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Trace the signal path from field binary/analog source through DataSet, RCB, and Gateway point database to HMI & RCC.`,
          verifyItems: [
            'Verify IED Logical Device, LN, DO, and Functional Constraint [ST]',
            'Confirm inclusion in DataSet and active BRCB/URCB',
            'Check Gateway point inversion/scaling and HMI alarm class',
          ],
        }),
      };

    case 5: // Test 6: Analog scaling and measurement quality
      return {
        badgeCode: 'CT/PT',
        leftNodeLabel: 'Secondary Injection',
        leftNodeSub: 'CT 400/1A • PT 33kV/110V',
        iedLabel: 'MEASUREMENT IED',
        iedSub: 'MMXU1.A / MMXU1.PhV',
        link1Label: 'MX Deadband Rpt',
        gatewayLabel: 'Station Gateway',
        gatewaySub: 'kV / A / MW Scaling',
        link2Label: 'SCADA Telemetry',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'Primary Engineering Units',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'nominal', label: 'Injection Level', activeLabel: 'NOMINAL (1.0 A / 63.5 V)', inactiveLabel: 'LOW (0.2 A)' },
          { id: 'scaleOk', label: 'CT/PT Ratio', activeLabel: '400:1 / 300:1 OK', inactiveLabel: 'RATIO MISMATCH' },
          { id: 'qGood', label: 'Quality Flag', activeLabel: 'Good (0x00)', inactiveLabel: 'Questionable (0x40)' },
        ],
        buildSignals: (s, fault, stamp) => {
          const good = s.qGood && !fault;
          return [
            { param: 'MMXU1.A.phsA.cVal', value: s.nominal ? (s.scaleOk ? '400.0 A' : '1.0 A (Unscaled)') : '80.0 A', healthy: s.scaleOk && good, quality: good ? 'Good (0x00)' : 'Questionable (0x40)', stamp },
            { param: 'MMXU1.PhV.phsA.cVal', value: s.nominal ? '19.05 kV (L-N)' : '6.35 kV', healthy: good, quality: good ? 'Good (0x00)' : 'Questionable (0x40)', stamp },
            { param: 'MMXU1.TotW.mag.f', value: s.nominal ? '22.8 MW' : '4.5 MW', healthy: good, quality: good ? 'Good (0x00)' : 'Invalid (0x4000)', stamp },
          ];
        },
        buildStepDetails: (idx, text) => ({
          focusArea: idx < 2 ? 'LEFT' : idx < 4 ? 'IED' : idx === 4 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Verify CT/PT primary-to-secondary scaling, engineering units, deadbands, and invalid/questionable quality display.`,
          verifyItems: [
            'Compare secondary injected value vs IED primary kV/A readout',
            'Verify low, nominal, and high test points within class tolerance',
            'Confirm Questionable/Invalid quality highlights on SCADA HMI',
          ],
        }),
      };

    case 6: // Test 7: SCL configuration validation
      return {
        badgeCode: 'SCL',
        leftNodeLabel: 'ICD & SSD Files',
        leftNodeSub: 'IED Capabilities + SLD',
        iedLabel: 'SCD SYSTEM FILE',
        iedSub: 'IEC 61850-6 XML',
        link1Label: 'CID Export',
        gatewayLabel: 'Vendor IED Tool',
        gatewaySub: 'DIGSI / PCM600 / Easergy',
        link2Label: 'Deploy & Verify',
        hmiLabel: 'IED & Gateway',
        hmiSub: 'As-Built CID Match',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'schemaOk', label: 'XSD Schema', activeLabel: 'VALIDATED', inactiveLabel: 'SYNTAX ERR' },
          { id: 'ipOk', label: 'SubNetwork IP', activeLabel: '10.33.10.11 OK', inactiveLabel: 'IP CONFLICT' },
          { id: 'cidMatch', label: 'CID vs SCD', activeLabel: '100% MATCH', inactiveLabel: 'MISMATCH' },
        ],
        buildSignals: (s, fault, stamp) => [
          { param: 'SCL.Header.version', value: s.schemaOk ? 'Ed 2.1 Valid' : 'Schema Error', healthy: s.schemaOk && !fault, quality: 'Verified', stamp },
          { param: 'SubNetwork.ConnectedAP', value: s.ipOk ? '10.33.10.11 /24' : 'Duplicate IP', healthy: s.ipOk && !fault, quality: 'Checked', stamp },
          { param: 'CID.DataSet_RCB_GOOSE', value: s.cidMatch ? 'Matches SCD' : 'confRev Drift', healthy: s.cidMatch && !fault, quality: s.cidMatch ? 'Good (0x00)' : 'Invalid', stamp },
        ],
        buildStepDetails: (idx, text) => ({
          focusArea: idx === 0 ? 'LEFT' : idx <= 3 ? 'IED' : idx <= 5 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Validate ICD/IID/SCD/CID consistency across IED names, Access Points, DataSets, RCBs, and GOOSE references.`,
          verifyItems: [
            'Validate SCD XML against IEC 61850-6 XSD schema',
            'Verify DataSet members, Functional Constraints, and ctlModel',
            'Compare deployed CID against approved project SCD',
          ],
        }),
      };

    case 7: // Test 8: MMS reporting, GI and RCB
      return {
        badgeCode: 'MMS',
        leftNodeLabel: 'IED DataSet',
        leftNodeSub: 'dsStatus / dsMeas',
        iedLabel: 'MMS SERVER (IED)',
        iedSub: 'BRCB01 / URCB01',
        link1Label: 'TCP/102 Reports',
        gatewayLabel: 'MMS Client (GTW)',
        gatewaySub: 'RptEna / GI / SqNum',
        link2Label: 'Buffered Events',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'SOE & Live Table',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'rptEna', label: 'BRCB01.RptEna', activeLabel: 'TRUE (Reserved)', inactiveLabel: 'FALSE' },
          { id: 'gi', label: 'General Interrogation', activeLabel: 'GI SENT (TrgOp=GI)', inactiveLabel: 'IDLE' },
          { id: 'dchg', label: 'Data Change', activeLabel: 'dchg BURST', inactiveLabel: 'STEADY' },
        ],
        buildSignals: (s, fault, stamp) => [
          { param: 'BRCB01.RptEna', value: s.rptEna && !fault ? 'TRUE (Owner: GTW1)' : 'FALSE', healthy: s.rptEna && !fault, quality: fault ? 'Invalid' : 'Good (0x00)', stamp },
          { param: 'BRCB01.TrgOps', value: s.gi ? 'dchg+qchg+gi+intg' : 'dchg+qchg', healthy: !fault, quality: 'Good (0x00)', stamp },
          { param: 'MMS.Report.Reason', value: s.dchg ? 'data-change (1)' : s.gi ? 'general-interrogation (4)' : 'integrity (3)', healthy: !fault, quality: fault ? 'Invalid' : 'Good (0x00)', stamp },
        ],
        buildStepDetails: (idx, text) => ({
          focusArea: idx <= 1 ? 'LEFT' : idx <= 4 ? 'IED' : idx <= 6 ? 'LINK1' : 'GATEWAY',
          explanation: `Step ${idx + 1}: ${text} Verify TCP/102 MMS association, BRCB reservation, data-change triggers, General Interrogation (GI), and integrity period.`,
          verifyItems: [
            'Check BRCB buffering vs URCB unbuffered behavior',
            'Verify TrgOps (dchg, qchg, dupd, integrity, GI)',
            'Confirm GI returns complete current DataSet snapshot',
          ],
        }),
      };

    case 8: // Test 9: GOOSE publish/subscribe and timeout
      return {
        badgeCode: 'GOOSE',
        leftNodeLabel: 'GOOSE Publisher',
        leftNodeSub: 'APPID 0x0001 • VLAN 20',
        iedLabel: 'LAYER-2 MULTICAST',
        iedSub: '01-0C-CD-01-00-01',
        link1Label: 'stNum / sqNum',
        gatewayLabel: 'GOOSE Subscriber',
        gatewaySub: 'GoCB Binding',
        link2Label: 'LGOS Supervision',
        hmiLabel: 'Protection Logic',
        hmiSub: 'Trip / Interlock',
        protocolColor: '#00FF4C',
        controls: [
          { id: 'pubOk', label: 'Publisher State', activeLabel: 'TRIP/CHANGE (stNum+1)', inactiveLabel: 'STEADY (Tmax=2s)' },
          { id: 'confOk', label: 'confRev Match', activeLabel: 'confRev=1 MATCH', inactiveLabel: 'confRev MISMATCH' },
          { id: 'talOk', label: 'TimeAllowedToLive', activeLabel: 'ACTIVE (< TAL)', inactiveLabel: 'TIMEOUT EXPIRED' },
        ],
        buildSignals: (s, fault, stamp) => {
          const healthy = s.confOk && s.talOk && !fault;
          return [
            { param: 'GoCB.stNum / sqNum', value: s.pubOk ? 'stNum=15 / sqNum=0' : 'stNum=14 / sqNum=42', healthy, quality: healthy ? 'Good (0x00)' : 'Invalid', stamp },
            { param: 'GoCB.confRev / APPID', value: s.confOk ? 'confRev=1 / 0x0001' : 'confRev MISMATCH', healthy: s.confOk && !fault, quality: s.confOk ? 'Good (0x00)' : 'Invalid', stamp },
            { param: 'LGOS1.St.stVal', value: s.talOk && !fault ? 'TRUE (Subscribed)' : 'FALSE (Timeout)', healthy, quality: healthy ? 'Good (0x00)' : 'Invalid (0x4000)', stamp },
          ];
        },
        buildStepDetails: (idx, text) => ({
          focusArea: idx <= 1 ? 'LEFT' : idx <= 4 ? 'LINK1' : idx === 5 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Verify Layer-2 GOOSE multicast MAC, APPID, VLAN priority, confRev matching, stNum/sqNum burst, and timeout supervision.`,
          verifyItems: [
            'Verify APPID, Multicast MAC (01-0C-CD-01-xx-xx), VLAN ID & priority',
            'Confirm stNum increments by 1 and sqNum resets to 0 on state change',
            'Verify subscriber flags Invalid/Timeout when TAL expires',
          ],
        }),
      };

    case 9: // Test 10: PRP / HSR redundancy failover
      return {
        badgeCode: 'PRP',
        leftNodeLabel: 'DANP IED (LAN A/B)',
        leftNodeSub: 'IEC 62439-3 Cl.4/5',
        iedLabel: 'SWITCH LAN A & B',
        iedSub: 'Dual Independent Paths',
        link1Label: '0 ms Failover',
        gatewayLabel: 'RedBox / Gateway',
        gatewaySub: 'Duplicate Discard',
        link2Label: 'Supervision Frame',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'LAN A/B Health',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'lanA', label: 'PRP LAN A', activeLabel: 'HEALTHY', inactiveLabel: 'FAULTED (DOWN)' },
          { id: 'lanB', label: 'PRP LAN B', activeLabel: 'HEALTHY', inactiveLabel: 'FAULTED (DOWN)' },
          { id: 'hsrMode', label: 'Topology Mode', activeLabel: 'PRP Dual-LAN', inactiveLabel: 'HSR Ring (0x892F)' },
        ],
        buildSignals: (s, fault, stamp) => {
          const bothDown = (!s.lanA && !s.lanB) || fault;
          return [
            { param: 'LPHD.PrpLanA.stVal', value: s.lanA && !fault ? 'UP (0 ms loss)' : 'DOWN (Alarm)', healthy: s.lanA && !fault, quality: s.lanA ? 'Good (0x00)' : 'Alarm', stamp },
            { param: 'LPHD.PrpLanB.stVal', value: s.lanB && !fault ? 'UP (0 ms loss)' : 'DOWN (Alarm)', healthy: s.lanB && !fault, quality: s.lanB ? 'Good (0x00)' : 'Alarm', stamp },
            { param: 'MMS_GOOSE.Continuity', value: bothDown ? 'LOST' : 'BUMPLESS (0 ms)', healthy: !bothDown, quality: bothDown ? 'Invalid' : 'Good (0x00)', stamp },
          ];
        },
        buildStepDetails: (idx, text) => ({
          focusArea: idx <= 2 ? 'LEFT' : idx <= 4 ? 'IED' : idx === 5 ? 'LINK1' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Confirm seamless 0 ms recovery during single-LAN or HSR ring link failure without dropping MMS or GOOSE frames.`,
          verifyItems: [
            'Verify LAN A and LAN B are physically isolated (no cross-connection)',
            'Fail one LAN and confirm 0 ms packet loss on the surviving path',
            'Verify supervision alarm raises on link loss and clears on restore',
          ],
        }),
      };

    case 10: // Test 11: IEC 60870-5-104 gateway to RCC
      return {
        badgeCode: '104',
        leftNodeLabel: 'Station Gateway',
        leftNodeSub: 'COA=1 • IOA Map',
        iedLabel: 'IEC-104 SERVER',
        iedSub: 'TCP Port 2404',
        link1Label: 'STARTDT / APCI',
        gatewayLabel: 'WAN / Firewall',
        gatewaySub: 'Routed Telecontrol',
        link2Label: 'ASDU (M_DP / C_DC)',
        hmiLabel: 'RCC SCADA',
        hmiSub: 'Remote Control Center',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'startdt', label: 'STARTDT', activeLabel: 'STARTDT CON (Active)', inactiveLabel: 'STOPPED' },
          { id: 'gi104', label: 'C_IC_NA_1 (GI)', activeLabel: 'GI ACTTERM', inactiveLabel: 'IDLE' },
          { id: 'sbo104', label: 'C_DC_NA_1 Cmd', activeLabel: 'SELECT/EXEC OK', inactiveLabel: 'STANDBY' },
        ],
        buildSignals: (s, fault, stamp) => [
          { param: 'IEC104.TCP2404.Session', value: s.startdt && !fault ? 'STARTED (k=12, w=8)' : 'DISCONNECTED', healthy: s.startdt && !fault, quality: fault ? 'Invalid' : 'Good', stamp },
          { param: 'ASDU.COA1.IOA1001', value: s.gi104 ? 'M_DP_TB_1 (COT=20 GI)' : 'M_DP_TB_1 (COT=3 Spont)', healthy: !fault, quality: fault ? 'IV (Invalid)' : 'Valid', stamp },
          { param: 'ASDU.C_DC_NA_1', value: s.sbo104 ? 'COT=7 ActCon / 10 ActTerm' : 'Ready', healthy: !fault, quality: 'Valid', stamp },
        ],
        buildStepDetails: (idx, text) => ({
          focusArea: idx <= 1 ? 'IED' : idx <= 4 ? 'LINK1' : idx <= 6 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Verify TCP/2404 reachability, STARTDT handshake, COA/IOA addressing, General Interrogation, and spontaneous CP56Time2a events.`,
          verifyItems: [
            'Verify STARTDT act/con and TESTFR keepalive frames',
            'Confirm COA and IOA point mapping matches RCC database',
            'Test Select/Execute telecontrol command and session-loss recovery',
          ],
        }),
      };

    case 11: // Test 12: Modbus TCP and OPC UA
      return {
        badgeCode: 'OPC/MB',
        leftNodeLabel: 'Field Device / PLC',
        leftNodeSub: 'Unit ID 1 • Registers',
        iedLabel: 'MODBUS / OPC UA',
        iedSub: 'TCP/502 & TCP/4840',
        link1Label: 'FC03 / Subscription',
        gatewayLabel: 'Station Gateway',
        gatewaySub: 'Scaling & Word Order',
        link2Label: 'Mapped Points',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'Live Values & Status',
        protocolColor: '#00FF4C',
        controls: [
          { id: 'mbConn', label: 'Modbus TCP/502', activeLabel: 'POLLING OK', inactiveLabel: 'TIMEOUT' },
          { id: 'endian', label: 'Word Order', activeLabel: 'BIG-ENDIAN OK', inactiveLabel: 'BYTE SWAP ERR' },
          { id: 'opcSub', label: 'OPC UA Sub', activeLabel: 'SUBSCRIBED', inactiveLabel: 'BAD STATUS' },
        ],
        buildSignals: (s, fault, stamp) => [
          { param: 'Modbus.40001 (FC03)', value: s.mbConn && !fault ? (s.endian ? '11.02 kV (0x044E)' : 'SWAP ERR') : 'No Response', healthy: s.mbConn && s.endian && !fault, quality: s.mbConn && !fault ? 'Good' : 'Bad', stamp },
          { param: 'OPCUA.ns=2;s=Bay52.Pos', value: s.opcSub && !fault ? 'CLOSED (Good 0x0)' : 'BadCommunication', healthy: s.opcSub && !fault, quality: s.opcSub && !fault ? 'Good' : 'Bad', stamp },
        ],
        buildStepDetails: (idx, text) => ({
          focusArea: idx <= 2 ? 'IED' : idx <= 5 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Validate Modbus TCP register offsets, byte/word order, and scaling alongside OPC UA secure session and monitored-item subscriptions.`,
          verifyItems: [
            'Verify Modbus Unit ID, Function Code (FC01-FC04), and 0/1-based offset',
            'Check 32-bit float/int word order (ABCD vs CDAB)',
            'Confirm OPC UA NodeId, DataType, and StatusCode updates',
          ],
        }),
      };

    case 12: // Test 13: SNTP / PTP time synchronization and SOE
      return {
        badgeCode: 'PTP',
        leftNodeLabel: 'GPS / PTP Grandmaster',
        leftNodeSub: 'IEEE 1588v2 / SNTP',
        iedLabel: 'IED CLOCK',
        iedSub: 'Sync < 1 ms (T4)',
        link1Label: 'UTC Timestamp',
        gatewayLabel: 'Station Gateway',
        gatewaySub: 'SOE Alignment',
        link2Label: 'Event Sequence',
        hmiLabel: 'SCADA SOE Log',
        hmiSub: 'Chronological Order',
        protocolColor: '#00EAFF',
        controls: [
          { id: 'ptpLock', label: 'GPS / PTP Lock', activeLabel: 'LOCKED (< 1 μs)', inactiveLabel: 'HOLDOVER / LOST' },
          { id: 'utcOk', label: 'UTC / Local TZ', activeLabel: 'UTC+05:30 OK', inactiveLabel: 'TZ OFFSET ERR' },
        ],
        buildSignals: (s, fault, stamp) => {
          const synced = s.ptpLock && !fault;
          return [
            { param: 'LTIM1.TmSyn.stVal', value: synced ? 'SYNCHRONIZED (T4)' : 'CLOCK_NOT_SYNC', healthy: synced, quality: synced ? 'Good (0x00)' : 'ClockNotSync (0x20)', stamp },
            { param: 'SOE.Event1 → Event2', value: s.utcOk ? 'Δt = 12 ms (Ordered)' : 'TZ Mismatch', healthy: synced && s.utcOk, quality: synced ? 'Valid' : 'TimeFault', stamp },
          ];
        },
        buildStepDetails: (idx, text) => ({
          focusArea: idx === 0 ? 'LEFT' : idx <= 3 ? 'IED' : idx === 4 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Verify SNTP/PTP clock lock across IED, Gateway, and HMI, chronological SOE ordering, and loss-of-sync alarm behavior.`,
          verifyItems: [
            'Confirm ClockNotSynchronized bit = 0 in IEC 61850 TimeQuality',
            'Generate two sequenced events and compare ms timestamps across devices',
            'Verify Loss-of-Sync alarm when grandmaster source is disconnected',
          ],
        }),
      };

    case 13: // Test 14: Alarm, SOE and fault injection
      return {
        badgeCode: 'ALM',
        leftNodeLabel: 'Fault Simulator',
        leftNodeSub: '50/51 Overcurrent',
        iedLabel: 'PROTECTION IED',
        iedSub: 'PTOC1.Op + PTRC1.Tr',
        link1Label: 'Spontaneous Alarm',
        gatewayLabel: 'Station Gateway',
        gatewaySub: 'Alarm Class & Priority',
        link2Label: 'HMI Alarm List',
        hmiLabel: 'SCADA / HMI',
        hmiSub: 'Unack → Ack → RTN',
        protocolColor: '#FF2525',
        controls: [
          { id: 'faultActive', label: 'Fault State', activeLabel: 'ACTIVE FAULT', inactiveLabel: 'NORMAL' },
          { id: 'acked', label: 'Operator Ack', activeLabel: 'ACKNOWLEDGED', inactiveLabel: 'UNACKNOWLEDGED' },
        ],
        buildSignals: (s, fault, stamp) => [
          { param: 'PTOC1.Op.general', value: s.faultActive ? 'TRUE (TRIP)' : 'FALSE (Normal)', healthy: !s.faultActive && !fault, quality: 'Good (0x00)', stamp },
          { param: 'HMI.AlarmState', value: s.faultActive ? (s.acked ? 'ACTIVE_ACK' : 'ACTIVE_UNACK (Flashing)') : (s.acked ? 'NORMAL / CLEARED' : 'RTN_UNACK'), healthy: !s.faultActive, quality: 'Valid', stamp },
        ],
        buildStepDetails: (idx, text) => ({
          focusArea: idx <= 1 ? 'LEFT' : idx === 2 ? 'IED' : idx <= 4 ? 'HMI' : 'ALL',
          explanation: `Step ${idx + 1}: ${text} Verify alarm generation, priority color, audible/visual unacknowledged state, acknowledgement, and return-to-normal clearing.`,
          verifyItems: [
            'Confirm ACTIVE_UNACK flashes until operator acknowledges',
            'Verify alarm remains ACTIVE_ACK while fault persists',
            'Clear fault and verify Return-To-Normal (RTN) SOE entry',
          ],
        }),
      };

    default: // Test 15 (index 14): FAT / SAT final acceptance and handover
      return {
        badgeCode: 'FAT',
        leftNodeLabel: 'Approved Drawings',
        leftNodeSub: 'SCD + I/O List + Permits',
        iedLabel: 'WITNESSED TEST',
        iedSub: 'FAT / SAT Execution',
        link1Label: 'Evidence Capture',
        gatewayLabel: 'Punch-List Tracker',
        gatewaySub: 'Deviations & Retest',
        link2Label: 'As-Built Archive',
        hmiLabel: 'CLIENT HANDOVER',
        hmiSub: 'Signed Acceptance',
        protocolColor: '#00FF4C',
        controls: [
          { id: 'backupsOk', label: 'SCD & Backups', activeLabel: 'VERIFIED', inactiveLabel: 'PENDING' },
          { id: 'overridesClr', label: 'Test Overrides', activeLabel: 'ALL REMOVED', inactiveLabel: 'OVERRIDE ACTIVE' },
          { id: 'signedOff', label: 'Witness Sign-Off', activeLabel: 'APPROVED', inactiveLabel: 'OPEN PUNCHES' },
        ],
        buildSignals: (s, fault, stamp) => [
          { param: 'FAT_SAT.Drawings_SCD', value: s.backupsOk ? 'As-Built Rev C' : 'Pending', healthy: s.backupsOk && !fault, quality: 'Verified', stamp },
          { param: 'FAT_SAT.TestOverrides', value: s.overridesClr ? '0 Overrides (Clean)' : 'WARNING: Forced', healthy: s.overridesClr && !fault, quality: s.overridesClr ? 'Safe' : 'Warning', stamp },
          { param: 'FAT_SAT.HandoverStatus', value: s.signedOff ? 'ACCEPTED' : 'IN PROGRESS', healthy: s.signedOff && !fault, quality: 'Signed', stamp },
        ],
        buildStepDetails: (idx, text) => ({
          focusArea: idx <= 1 ? 'LEFT' : idx <= 3 ? 'IED' : idx <= 5 ? 'GATEWAY' : 'HMI',
          explanation: `Step ${idx + 1}: ${text} Complete witnessed FAT/SAT verification, clear all test overrides/forces, close punch-list items, and archive as-built configurations.`,
          verifyItems: [
            'Confirm zero test overrides, simulation flags, or forced points remain',
            'Verify all deviations are documented, retested, and signed off',
            'Archive final SCD, CIDs, backups, and witness test sheets',
          ],
        }),
      };
  }
}

export function TestStepVisualization({
  test,
  testIndex,
  initialDone,
  onStepChange,
  onBackToAllTests,
}: TestStepVisualizationProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const profile = getProfileForTest(testIndex);

  const [activeTab, setActiveTab] = useState<VizTab>('VISUALIZATION');
  const [activeStep, setActiveStep] = useState<number>(0);
  const [done, setDone] = useState<boolean[]>(() =>
    Array.from({ length: test.steps.length }, (_, i) => !!initialDone?.[i])
  );
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [faultInjected, setFaultInjected] = useState<boolean>(false);
  const [pulseActive, setPulseActive] = useState<boolean>(false);
  const [stamp, setStamp] = useState<string>(() => formatTs(new Date()));

  // Initialize simulation control toggles to true by default
  const [simState, setSimState] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    profile.controls.forEach((c) => {
      init[c.id] = c.id !== 'faultActive';
    });
    return init;
  });

  useEffect(() => {
    setDone(Array.from({ length: test.steps.length }, (_, i) => !!initialDone?.[i]));
  }, [testIndex, initialDone?.join('|')]);

  useEffect(() => {
    const t = window.setInterval(() => {
      if (!faultInjected) {
        setStamp(formatTs(new Date()));
      }
    }, 1200);
    return () => window.clearInterval(t);
  }, [faultInjected]);

  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const triggerPulse = () => {
    setPulseActive(true);
    window.setTimeout(() => setPulseActive(false), 1200);
  };

  const handleToggleStep = (idx: number) => {
    setActiveStep(idx);
    setDone((prev) => {
      const next = prev.map((v, i) => (i === idx ? !v : v));
      onStepChange(idx, next[idx]);
      return next;
    });
    triggerPulse();
  };

  const handleMarkAllComplete = () => {
    const allDone = done.every(Boolean);
    const next = Array(test.steps.length).fill(!allDone);
    setDone(next);
    next.forEach((v, i) => onStepChange(i, v));
  };

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement && containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } else {
        setIsFullscreen((v) => !v);
      }
    } catch {
      setIsFullscreen((v) => !v);
    }
  };

  const stepDetail = profile.buildStepDetails(
    activeStep,
    test.steps[activeStep] || test.steps[0]
  );
  const liveSignals = profile.buildSignals(simState, faultInjected, stamp);
  const completedCount = done.filter(Boolean).length;

  return (
    <div
      ref={containerRef}
      style={{
        background:
          'radial-gradient(circle at 50% 0%, #092C48 0%, #041526 45%, #020B18 100%)',
        color: '#F2F8FF',
        border: '1.5px solid #00CFFF',
        borderRadius: isFullscreen ? 0 : 12,
        boxShadow:
          '0 0 28px rgba(0, 207, 255, 0.25), inset 0 0 32px rgba(0, 207, 255, 0.08)',
        padding: isFullscreen ? '14px 18px' : '12px 14px',
        fontFamily: "'Inter', 'Segoe UI', Roboto, Arial, sans-serif",
        width: '100%',
        minHeight: isFullscreen ? '100vh' : undefined,
        boxSizing: 'border-box',
        position: isFullscreen ? 'fixed' : 'relative',
        inset: isFullscreen ? 0 : undefined,
        zIndex: isFullscreen ? 9999 : 1,
        overflowY: isFullscreen ? 'auto' : 'visible',
        overflowX: 'hidden',
      }}
    >
      {/* 1. TOP HEADER BAR */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          paddingBottom: 8,
          marginBottom: 10,
          borderBottom: '1px solid rgba(0, 207, 255, 0.35)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 6,
              background: 'linear-gradient(180deg, #0A3756 0%, #051B2E 100%)',
              border: '1px solid #00EAFF',
              display: 'grid',
              placeItems: 'center',
              color: '#00EAFF',
            }}
          >
            <ClipboardCheck size={15} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14.5, fontWeight: 700 }}>
            <button
              type="button"
              onClick={onBackToAllTests}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#F2F8FF',
                fontWeight: 700,
                fontSize: 14.5,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              Testing Guidance
            </button>
            <span style={{ color: '#68A8C8', fontWeight: 400 }}>›</span>
            <span style={{ color: '#00EAFF', fontWeight: 800 }}>
              {test.group.toUpperCase()} – TEST {testIndex + 1}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={onBackToAllTests}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 6,
              border: '1px solid #00EAFF',
              background: 'linear-gradient(180deg, #0E3D60 0%, #072238 100%)',
              color: '#D6F2FF',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
            }}
          >
            <ArrowLeft size={13} style={{ color: '#00EAFF' }} />
            Back to All Tests
          </button>

          <button
            type="button"
            onClick={handleToggleFullscreen}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 6,
              border: '1px solid #1E6E91',
              background: 'linear-gradient(180deg, #0B2D48 0%, #061A2C 100%)',
              color: '#F2F8FF',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {isFullscreen ? (
              <Minimize2 size={13} style={{ color: '#00EAFF' }} />
            ) : (
              <Maximize2 size={13} style={{ color: '#00EAFF' }} />
            )}
            {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 11px',
              borderRadius: 6,
              border: '1px solid #1E6E91',
              background: 'linear-gradient(180deg, #0B2D48 0%, #061A2C 100%)',
              color: '#F2F8FF',
              fontSize: 11.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Download size={13} style={{ color: '#00EAFF' }} />
            Download PDF
          </button>

          <button
            type="button"
            onClick={handleMarkAllComplete}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              padding: '5px 13px',
              borderRadius: 6,
              border: '1.5px solid #00FF4C',
              background: done.every(Boolean)
                ? 'linear-gradient(180deg, #0B6E3B 0%, #064224 100%)'
                : 'linear-gradient(180deg, #09522C 0%, #05331B 100%)',
              color: '#F2F8FF',
              fontSize: 11.5,
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 0 12px rgba(0, 255, 76, 0.3)',
            }}
          >
            <CheckCircle2 size={13.5} style={{ color: '#00FF4C' }} />
            {done.every(Boolean)
              ? `Completed (${test.steps.length}/${test.steps.length})`
              : 'Mark as Complete'}
          </button>
        </div>
      </header>

      {/* 2. TEST TITLE & NAVIGATION TABS */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 10,
          marginBottom: 10,
          paddingBottom: 9,
          borderBottom: '1px solid rgba(0, 207, 255, 0.25)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 11 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 8,
              border: '1.5px solid #00EAFF',
              background: '#062238',
              display: 'grid',
              placeItems: 'center',
              color: '#00EAFF',
              fontSize: 11,
              fontWeight: 900,
              boxShadow: '0 0 10px rgba(0, 234, 255, 0.35)',
              flexShrink: 0,
            }}
          >
            {profile.badgeCode}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: '#F2F8FF' }}>
              Test {testIndex + 1}: {test.title}
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: 12, color: '#A8CBE0' }}>{test.purpose}</p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          {(
            [
              { id: 'PROCEDURE', label: 'Test Procedure', icon: ClipboardList },
              { id: 'VISUALIZATION', label: 'Visualization', icon: Monitor },
              { id: 'SIGNALS', label: 'Live Signals', icon: Activity },
              { id: 'LOGIC', label: 'Signal Flow', icon: Network },
              { id: 'INTERVIEW', label: 'Interview Focus', icon: GraduationCap },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const active = activeTab === t.id;
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => setActiveTab(t.id)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '6px 12px',
                  borderRadius: 7,
                  border: active ? '1.5px solid #80F5FF' : '1px solid #1C6588',
                  background: active
                    ? 'linear-gradient(180deg, #1CEBFF 0%, #00B8E6 100%)'
                    : 'linear-gradient(180deg, #09263E 0%, #051728 100%)',
                  color: active ? '#011627' : '#D8F3FF',
                  fontSize: 12,
                  fontWeight: active ? 800 : 600,
                  cursor: 'pointer',
                  boxShadow: active ? '0 0 14px rgba(0, 234, 255, 0.5)' : 'none',
                }}
              >
                <Icon size={13.5} style={{ color: active ? '#011627' : '#00EAFF' }} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. MAIN 2-COLUMN LAYOUT */}
      <div
        className="sas-tg-main-grid"
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(290px, 30%) minmax(0, 1fr)',
          gap: 10,
          alignItems: 'start',
        }}
      >
        {/* LEFT COLUMN: Prerequisites, Step-by-Step Checkboxes, Expected Result, Interview Focus */}
        <aside style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <section
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: '1px solid #00CFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '7px 11px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <ClipboardList size={14} style={{ color: '#00EAFF' }} />
              Before you start
            </div>
            <div style={{ padding: '8px 11px', display: 'grid', gap: 5, fontSize: 11.5 }}>
              {test.prerequisites.map((p, idx) => (
                <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span
                    style={{
                      width: 6.5,
                      height: 6.5,
                      borderRadius: '50%',
                      background: '#00FF4C',
                      boxShadow: '0 0 8px #00FF4C',
                      flexShrink: 0,
                    }}
                  />
                  <span>{p}</span>
                </div>
              ))}
            </div>
          </section>

          <section
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: '1px solid #00CFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 11px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <ListChecks size={14} style={{ color: '#00EAFF' }} />
                Step-by-step test process
              </span>
              <span
                style={{
                  fontSize: 10.5,
                  fontWeight: 700,
                  color: '#00FF4C',
                  background: 'rgba(0, 255, 76, 0.12)',
                  border: '1px solid rgba(0, 255, 76, 0.4)',
                  borderRadius: 12,
                  padding: '1px 7px',
                }}
              >
                {completedCount}/{test.steps.length}
              </span>
            </div>

            <div style={{ padding: '7px 8px', display: 'grid', gap: 4.5 }}>
              {test.steps.map((stepText, idx) => {
                const isChecked = done[idx];
                const isCurrent = activeStep === idx;
                return (
                  <div
                    key={idx}
                    onClick={() => handleToggleStep(idx)}
                    role="checkbox"
                    aria-checked={isChecked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleToggleStep(idx);
                      }
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '6px 8px',
                      borderRadius: 6,
                      border: isChecked
                        ? '1.5px solid #00EAFF'
                        : isCurrent
                        ? '1px solid #00CFFF'
                        : '1px solid rgba(30, 102, 138, 0.65)',
                      background: isChecked
                        ? 'linear-gradient(90deg, rgba(0, 185, 220, 0.28) 0%, rgba(7, 45, 70, 0.85) 100%)'
                        : isCurrent
                        ? 'linear-gradient(90deg, rgba(0, 150, 200, 0.2) 0%, rgba(6, 30, 50, 0.9) 100%)'
                        : '#071B2E',
                      cursor: 'pointer',
                      fontSize: 11.5,
                      lineHeight: 1.35,
                      color: '#F2F8FF',
                      userSelect: 'none',
                    }}
                  >
                    <span
                      aria-hidden="true"
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 3.5,
                        flexShrink: 0,
                        display: 'grid',
                        placeItems: 'center',
                        border: isChecked ? '1.5px solid #00FF4C' : '1.5px solid #4A7A96',
                        background: isChecked
                          ? 'linear-gradient(180deg, #00FF4C 0%, #00C838 100%)'
                          : '#051525',
                        color: '#01200B',
                        fontWeight: 900,
                        fontSize: 12,
                        boxShadow: isChecked ? '0 0 10px rgba(0, 255, 76, 0.65)' : 'none',
                      }}
                    >
                      {isChecked ? '✓' : ''}
                    </span>
                    <span style={{ flex: 1 }}>
                      <strong
                        style={{
                          color: isChecked ? '#00FF4C' : '#00EAFF',
                          marginRight: 4,
                        }}
                      >
                        {idx + 1}.
                      </strong>
                      {stepText}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>

          <section
            style={{
              background: 'linear-gradient(160deg, #062E22 0%, #041C16 100%)',
              border: '1.5px solid #00FF4C',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 11px',
                borderBottom: '1px solid rgba(0, 255, 76, 0.35)',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <CheckCircle2 size={14} style={{ color: '#00FF4C' }} />
              Expected result
            </div>
            <div style={{ padding: '7px 11px', fontSize: 11.5, color: '#E2F8EC' }}>
              {test.expected}
            </div>
          </section>

          <section
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: '1px solid #00CFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '6px 11px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <GraduationCap size={14} style={{ color: '#00EAFF' }} />
              Interview focus
            </div>
            <div style={{ padding: '7px 11px', fontSize: 11.5, color: '#E2F4FF' }}>
              {test.interview}
            </div>
          </section>
        </aside>

        {/* RIGHT COLUMN: Step Explanation Card + Interactive SVG Signal Flow + Live Signals */}
        <main style={{ display: 'flex', flexDirection: 'column', gap: 10, minWidth: 0 }}>
          {/* Step-Specific Explanation Banner */}
          <section
            style={{
              background: 'linear-gradient(160deg, #082742 0%, #051626 100%)',
              border: '1.5px solid #00EAFF',
              borderRadius: 9,
              padding: '10px 14px',
              boxShadow: '0 0 14px rgba(0, 234, 255, 0.16)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 6,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 800, color: '#00EAFF' }}>
                STEP {activeStep + 1} / {test.steps.length} — Active Focus:{' '}
                {stepDetail.focusArea}
              </span>
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  disabled={activeStep === 0}
                  onClick={() => setActiveStep((s) => Math.max(0, s - 1))}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 5,
                    border: '1px solid #1E6E91',
                    background: '#072238',
                    color: activeStep === 0 ? '#507892' : '#D8F3FF',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: activeStep === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  ← Prev Step
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!done[activeStep]) {
                      handleToggleStep(activeStep);
                    }
                    setActiveStep((s) => Math.min(test.steps.length - 1, s + 1));
                  }}
                  style={{
                    padding: '3px 9px',
                    borderRadius: 5,
                    border: '1px solid #00FF4C',
                    background: 'rgba(0, 255, 76, 0.14)',
                    color: '#00FF4C',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  ✓ Complete &amp; Next
                </button>
              </div>
            </div>
            <p style={{ margin: '0 0 6px', fontSize: 12, color: '#E8F6FF', lineHeight: 1.5 }}>
              {stepDetail.explanation}
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 11, color: '#A8CBE0' }}>
              {stepDetail.verifyItems.map((item, i) => (
                <span key={i}>
                  <strong style={{ color: '#00FF4C' }}>➜</strong> {item}
                </span>
              ))}
            </div>
          </section>

          {/* Interactive SVG Signal Flow & Equipment Architecture */}
          <section
            style={{
              background: 'linear-gradient(180deg, #072036 0%, #041322 100%)',
              border: '1.5px solid #00CFFF',
              borderRadius: 9,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 8,
                padding: '7px 12px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.15), transparent)',
              }}
            >
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 7,
                  fontSize: 13.5,
                  fontWeight: 800,
                }}
              >
                <Monitor size={15} style={{ color: '#00EAFF' }} />
                Step {activeStep + 1} Signal Flow &amp; Equipment Visualization
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => setFaultInjected((f) => !f)}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '3px 9px',
                    borderRadius: 5,
                    border: faultInjected ? '1px solid #FF2525' : '1px solid #1E6E91',
                    background: faultInjected ? 'rgba(255, 37, 37, 0.2)' : '#072238',
                    color: faultInjected ? '#FF8080' : '#D8F3FF',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                  }}
                >
                  {faultInjected ? <RotateCcw size={11.5} /> : <AlertTriangle size={11.5} />}
                  {faultInjected ? 'Reset Simulated Fault' : 'Inject Comm / Quality Fault'}
                </button>
              </div>
            </div>

            {/* Interactive Controls Row */}
            <div
              style={{
                padding: '7px 12px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.2)',
                background: 'rgba(3, 14, 26, 0.8)',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                flexWrap: 'wrap',
              }}
            >
              {profile.controls.map((ctrl) => {
                const isOn = !!simState[ctrl.id];
                return (
                  <button
                    key={ctrl.id}
                    type="button"
                    onClick={() => {
                      setSimState((prev) => ({ ...prev, [ctrl.id]: !prev[ctrl.id] }));
                      triggerPulse();
                    }}
                    style={{
                      padding: '4px 10px',
                      borderRadius: 5,
                      border: isOn ? '1px solid #00FF4C' : '1px solid #FF5555',
                      background: isOn ? 'rgba(0, 255, 76, 0.14)' : 'rgba(255, 37, 37, 0.14)',
                      color: isOn ? '#00FF4C' : '#FF8080',
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: 'pointer',
                    }}
                  >
                    {ctrl.label}: {isOn ? ctrl.activeLabel : ctrl.inactiveLabel}
                  </button>
                );
              })}
            </div>

            {/* Animated SVG Equipment & Signal Flow */}
            <div style={{ padding: '12px', overflowX: 'auto' }}>
              <svg
                viewBox="0 0 820 190"
                style={{ width: '100%', minWidth: 660, height: 185, display: 'block' }}
                role="img"
                aria-label={`${test.title} interactive signal flow`}
              >
                <defs>
                  <filter id="tsGlowCyan" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                  <filter id="tsGlowGreen" x="-30%" y="-30%" width="160%" height="160%">
                    <feGaussianBlur stdDeviation="3.5" result="b" />
                    <feMerge>
                      <feMergeNode in="b" />
                      <feMergeNode in="SourceGraphic" />
                    </feMerge>
                  </filter>
                </defs>

                {/* Node 1: Field / Source / Switch */}
                <g transform="translate(15, 32)">
                  <rect
                    x="0"
                    y="0"
                    width="155"
                    height="110"
                    rx="9"
                    fill="#061D2E"
                    stroke={
                      stepDetail.focusArea === 'LEFT' || stepDetail.focusArea === 'ALL'
                        ? '#00FF4C'
                        : '#00CFFF'
                    }
                    strokeWidth={stepDetail.focusArea === 'LEFT' ? '2.6' : '1.5'}
                    filter={stepDetail.focusArea === 'LEFT' ? 'url(#tsGlowGreen)' : undefined}
                  />
                  <text x="77" y="34" textAnchor="middle" fill="#00EAFF" fontSize="11.5" fontWeight="800">
                    {profile.leftNodeLabel}
                  </text>
                  <text x="77" y="54" textAnchor="middle" fill="#A8CBE0" fontSize="10">
                    {profile.leftNodeSub}
                  </text>
                  <rect
                    x="22"
                    y="70"
                    width="110"
                    height="24"
                    rx="5"
                    fill={faultInjected ? '#3B0C12' : '#063322'}
                    stroke={faultInjected ? '#FF2525' : '#00FF4C'}
                  />
                  <text
                    x="77"
                    y="86"
                    textAnchor="middle"
                    fill={faultInjected ? '#FF8080' : '#00FF4C'}
                    fontSize="10.5"
                    fontWeight="800"
                  >
                    {faultInjected ? 'FAULT ACTIVE' : 'SIGNAL ACTIVE'}
                  </text>
                </g>

                {/* Link 1 */}
                <line
                  x1="172"
                  y1="87"
                  x2="255"
                  y2="87"
                  stroke={faultInjected ? '#FF2525' : profile.protocolColor}
                  strokeWidth="3"
                  strokeDasharray={faultInjected ? '6 4' : undefined}
                />
                <polygon
                  points="250,81 262,87 250,93"
                  fill={faultInjected ? '#FF2525' : profile.protocolColor}
                />
                <text x="213" y="72" textAnchor="middle" fill="#D8F3FF" fontSize="10.5" fontWeight="700">
                  {profile.link1Label}
                </text>
                {!faultInjected && (
                  <circle r="4" fill="#80F8FF" filter="url(#tsGlowCyan)">
                    <animateMotion
                      dur={pulseActive ? '0.45s' : '1.15s'}
                      repeatCount="indefinite"
                      path="M 174 87 L 254 87"
                    />
                  </circle>
                )}

                {/* Node 2: IED / Server */}
                <g transform="translate(264, 24)">
                  <rect
                    x="0"
                    y="0"
                    width="165"
                    height="126"
                    rx="9"
                    fill="#16283B"
                    stroke={
                      stepDetail.focusArea === 'IED' || stepDetail.focusArea === 'ALL'
                        ? '#00EAFF'
                        : '#689AB8'
                    }
                    strokeWidth={stepDetail.focusArea === 'IED' ? '2.6' : '1.6'}
                    filter={stepDetail.focusArea === 'IED' ? 'url(#tsGlowCyan)' : undefined}
                  />
                  <rect x="12" y="14" width="141" height="44" rx="4" fill="#071525" stroke="#2C698A" />
                  <text x="82" y="33" textAnchor="middle" fill="#F2F8FF" fontSize="11" fontWeight="900">
                    {profile.iedLabel}
                  </text>
                  <text x="82" y="49" textAnchor="middle" fill="#00FF4C" fontSize="9.5" fontWeight="700">
                    {profile.iedSub}
                  </text>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <circle
                      key={i}
                      cx={32 + i * 24}
                      cy="82"
                      r="4"
                      fill={faultInjected && i === 4 ? '#FF2525' : i < 4 ? '#00FF4C' : '#00EAFF'}
                    />
                  ))}
                  <text x="82" y="109" textAnchor="middle" fill="#A8CBE0" fontSize="10" fontWeight="700">
                    Step {activeStep + 1} Processing
                  </text>
                </g>

                {/* Link 2 */}
                <line
                  x1="431"
                  y1="87"
                  x2="508"
                  y2="87"
                  stroke={faultInjected ? '#FF2525' : '#00EAFF'}
                  strokeWidth="3"
                  strokeDasharray={faultInjected ? '6 4' : undefined}
                />
                <polygon
                  points="503,81 515,87 503,93"
                  fill={faultInjected ? '#FF2525' : '#00EAFF'}
                />
                <text x="470" y="72" textAnchor="middle" fill="#D8F3FF" fontSize="10.5" fontWeight="700">
                  {profile.link2Label}
                </text>
                {!faultInjected && (
                  <circle r="4" fill="#00EAFF" filter="url(#tsGlowCyan)">
                    <animateMotion
                      dur={pulseActive ? '0.45s' : '1.15s'}
                      repeatCount="indefinite"
                      path="M 433 87 L 508 87"
                    />
                  </circle>
                )}

                {/* Node 3: Gateway / Logic */}
                <g transform="translate(517, 42)">
                  <rect
                    x="0"
                    y="0"
                    width="130"
                    height="90"
                    rx="8"
                    fill="#112538"
                    stroke={
                      stepDetail.focusArea === 'GATEWAY' || stepDetail.focusArea === 'ALL'
                        ? '#00EAFF'
                        : '#5E85A3'
                    }
                    strokeWidth={stepDetail.focusArea === 'GATEWAY' ? '2.6' : '1.6'}
                    filter={stepDetail.focusArea === 'GATEWAY' ? 'url(#tsGlowCyan)' : undefined}
                  />
                  <text x="65" y="34" textAnchor="middle" fill="#F2F8FF" fontSize="11.5" fontWeight="800">
                    {profile.gatewayLabel}
                  </text>
                  <text x="65" y="52" textAnchor="middle" fill="#00EAFF" fontSize="9.5">
                    {profile.gatewaySub}
                  </text>
                  {[0, 1, 2, 3].map((p) => (
                    <rect
                      key={p}
                      x={24 + p * 22}
                      y="64"
                      width="14"
                      height="11"
                      rx="2"
                      fill="#071828"
                      stroke={faultInjected ? '#FF2525' : '#00FF4C'}
                    />
                  ))}
                </g>

                {/* Link 3 */}
                <line
                  x1="649"
                  y1="87"
                  x2="684"
                  y2="87"
                  stroke={faultInjected ? '#FF2525' : '#00EAFF'}
                  strokeWidth="3"
                />
                <polygon
                  points="679,81 691,87 679,93"
                  fill={faultInjected ? '#FF2525' : '#00EAFF'}
                />

                {/* Node 4: HMI / Output */}
                <g transform="translate(693, 30)">
                  <rect
                    x="0"
                    y="0"
                    width="115"
                    height="100"
                    rx="7"
                    fill="#04111E"
                    stroke={
                      stepDetail.focusArea === 'HMI' || stepDetail.focusArea === 'ALL'
                        ? '#00EAFF'
                        : '#7B9AB5'
                    }
                    strokeWidth={stepDetail.focusArea === 'HMI' ? '2.6' : '1.8'}
                    filter={stepDetail.focusArea === 'HMI' ? 'url(#tsGlowCyan)' : undefined}
                  />
                  <rect x="6" y="6" width="103" height="16" rx="2" fill="#0A2842" />
                  <text x="57" y="17" textAnchor="middle" fill="#D4EEFF" fontSize="9" fontWeight="800">
                    {profile.hmiLabel}
                  </text>
                  <text
                    x="57"
                    y="52"
                    textAnchor="middle"
                    fill={faultInjected ? '#FF5555' : '#00FF4C'}
                    fontSize="11"
                    fontWeight="800"
                  >
                    {faultInjected ? 'ALARM / STALE' : 'VERIFIED'}
                  </text>
                  <text x="57" y="74" textAnchor="middle" fill="#A8CBE0" fontSize="9">
                    {profile.hmiSub}
                  </text>
                </g>
              </svg>
            </div>
          </section>

          {/* Live Signal Monitoring Table */}
          <section
            style={{
              background: 'linear-gradient(160deg, #072036 0%, #051626 100%)',
              border: '1px solid #00CFFF',
              borderRadius: 9,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '7px 12px',
                borderBottom: '1px solid rgba(0, 207, 255, 0.3)',
                background: 'linear-gradient(90deg, rgba(0, 207, 255, 0.14), transparent)',
                fontSize: 13.5,
                fontWeight: 800,
              }}
            >
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                <Activity size={15} style={{ color: '#00EAFF' }} />
                Live Simulated Signals — Test {testIndex + 1}
              </span>
              <span style={{ fontSize: 11, color: '#A8CBE0' }}>
                Tab View: <strong style={{ color: '#00EAFF' }}>{activeTab}</strong>
              </span>
            </div>

            <div style={{ padding: '10px 12px', overflowX: 'auto' }}>
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: 12,
                  border: '1px solid rgba(0, 207, 255, 0.35)',
                  borderRadius: 6,
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr style={{ background: '#0B3150', color: '#E2F4FF', textAlign: 'left' }}>
                    <th style={{ padding: '7px 10px', borderBottom: '1px solid #155273' }}>
                      Parameter / Point
                    </th>
                    <th style={{ padding: '7px 10px', borderBottom: '1px solid #155273' }}>
                      Simulated Value
                    </th>
                    <th style={{ padding: '7px 10px', borderBottom: '1px solid #155273' }}>
                      Quality / Status
                    </th>
                    <th style={{ padding: '7px 10px', borderBottom: '1px solid #155273' }}>
                      Time Stamp
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {liveSignals.map((sig, sIdx) => (
                    <tr
                      key={sig.param}
                      style={{
                        background:
                          sIdx % 2 === 0 ? 'rgba(6, 24, 42, 0.85)' : 'rgba(8, 30, 50, 0.85)',
                      }}
                    >
                      <td
                        style={{
                          padding: '7.5px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.55)',
                          fontWeight: 700,
                        }}
                      >
                        {sig.param}
                      </td>
                      <td
                        style={{
                          padding: '7.5px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.55)',
                        }}
                      >
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '2.5px 10px',
                            borderRadius: 12,
                            fontWeight: 800,
                            fontSize: 11,
                            background: sig.healthy
                              ? 'rgba(0, 255, 76, 0.18)'
                              : 'rgba(255, 37, 37, 0.22)',
                            border: sig.healthy ? '1px solid #00FF4C' : '1px solid #FF2525',
                            color: sig.healthy ? '#00FF4C' : '#FF8080',
                          }}
                        >
                          {sig.value}
                        </span>
                      </td>
                      <td
                        style={{
                          padding: '7.5px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.55)',
                          fontWeight: 700,
                          color: sig.healthy ? '#00FF4C' : '#FF5555',
                        }}
                      >
                        {sig.quality}
                      </td>
                      <td
                        style={{
                          padding: '7.5px 10px',
                          borderBottom: '1px solid rgba(21, 82, 115, 0.55)',
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: 11.5,
                          color: '#D8F3FF',
                        }}
                      >
                        {sig.stamp}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}

export default TestStepVisualization;
