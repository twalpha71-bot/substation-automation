import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardCheck,
  Search,
  ChevronDown,
  CheckCircle2,
  ShieldAlert,
  BookOpen,
  Monitor,
} from 'lucide-react';
import { BreakerStatusVisualization } from './BreakerStatusVisualization';
import { Test2SboVisualization } from './Test2SboVisualization';
import { Test3InterlockingVisualization } from './Test3InterlockingVisualization';
import { Test4IedCommVisualization } from './Test4IedCommVisualization';
import { Test5SignalMappingVisualization } from './Test5SignalMappingVisualization';
import { Test6AnalogScalingVisualization } from './Test6AnalogScalingVisualization';
import { Test11Iec104Visualization } from './Test11Iec104Visualization';
import { Test12ModbusOpcUaVisualization } from './Test12ModbusOpcUaVisualization';
import { Test13TimeSyncVisualization } from './Test13TimeSyncVisualization';
import { Test14AlarmSoeVisualization } from './Test14AlarmSoeVisualization';
import { Test15FatSatVisualization } from './Test15FatSatVisualization';
import { Test10PrpHsrVisualization } from './Test10PrpHsrVisualization';
import { TestStepVisualization, TestingGuidanceTestDef } from './TestStepVisualization';

const tests: TestingGuidanceTestDef[] = [
  {
    group: 'SLD & Operation',
    title: 'SLD breaker status indication',
    purpose: 'Verify that field breaker auxiliary contacts and the HMI indication agree.',
    prerequisites: ['Approved drawing and signal list', 'Authorized simulation or isolated test circuit'],
    steps: [
      'Record breaker tag, bay and initial physical position.',
      'Verify the 52a and 52b contact wiring against the schematic.',
      'Change breaker position using an approved test method.',
      'Observe IED XCBR.Pos.stVal and quality/time stamp.',
      'Verify gateway mapping and HMI symbol/color.',
      'Repeat for OPEN, CLOSED and intermediate/invalid status.',
      'Record evidence and restore original state.',
    ],
    expected: 'Correct position and quality at IED, gateway, SLD and event log.',
    interview: 'Explain how 52a/52b become XCBR.Pos.stVal and an HMI indication.',
  },
  {
    group: 'SLD & Operation',
    title: 'Local / Remote and SBO command',
    purpose: 'Validate select-before-operate, command authority and feedback.',
    prerequisites: ['Approved switching permit and test mode', 'Interlock checklist and safe apparatus state'],
    steps: [
      'Confirm correct bay and current breaker state.',
      'Verify Local/Remote authority and all permissives.',
      'Attempt remote command in Local mode and confirm rejection.',
      'Switch to approved Remote test mode.',
      'Issue SBO Select for intended OPEN/CLOSE action.',
      'Check select acknowledgement and select timeout behavior.',
      'Issue Operate within the select window.',
      'Verify breaker response, 52a/52b, command termination and SOE.',
      'Test rejected command with a blocked permissive.',
      'Restore authority and original breaker state.',
    ],
    expected: 'Commands execute only with valid authority, select and permissives.',
    interview: 'Describe select, operate, timeout, interlocking and command feedback.',
  },
  {
    group: 'SLD & Operation',
    title: 'Interlocking and synch-check (25)',
    purpose: 'Ensure unsafe switching is blocked.',
    prerequisites: ['Approved logic diagram', 'Simulated voltage, frequency and phase-angle inputs'],
    steps: [
      'Identify CILO/EnaCls conditions from the approved logic.',
      'Set all required permissives true and verify enable status.',
      'Make one disconnector/earth-switch condition invalid.',
      'Attempt simulated close and verify command blocked.',
      'Restore the interlock, then violate synch-check voltage difference.',
      'Repeat with frequency difference and phase-angle difference.',
      'Verify RSYN result and CILO enable status each time.',
      'Restore normal test conditions and record results.',
    ],
    expected: 'Close is rejected when any required permissive fails.',
    interview: 'Differentiate electrical interlocking, mechanical interlocking and ANSI 25.',
  },
  {
    group: 'IED & Signals',
    title: 'IED communication and health',
    purpose: 'Confirm IED online state and diagnostic alarm handling.',
    prerequisites: ['Approved IED address and network diagram'],
    steps: [
      'Verify IED model, firmware and configured IP.',
      'Check link LEDs, switch port and VLAN.',
      'Test approved reachability and IEC 61850 MMS association.',
      'Verify LLN0/LPHD health and diagnostic data.',
      'Disconnect only a designated lab link or use simulation.',
      'Confirm communication-loss alarm and quality invalid/stale.',
      'Restore link and verify alarm clearance and recovery time.',
    ],
    expected: 'Stable communication and correct loss/recovery indications.',
    interview: 'Explain physical link, IP reachability, MMS association and data quality.',
  },
  {
    group: 'IED & Signals',
    title: 'Signal mapping end-to-end',
    purpose: 'Trace an input from field/IED to SCADA and RCC.',
    prerequisites: ['Signal list and point database', 'Approved test injection method'],
    steps: [
      'Identify field contact or analog source.',
      'Find IED logical device, logical node, data object and attribute.',
      'Check dataset and report-control-block inclusion.',
      'Check gateway point mapping and any scaling/inversion.',
      'Inject or simulate one input at a time.',
      'Verify IED value, report, gateway and HMI tag.',
      'Confirm alarm class, units, quality and timestamp.',
      'Repeat with reset/normal condition and save evidence.',
    ],
    expected: 'All point names, values, engineering units and quality match the signal list.',
    interview: 'Trace XCBR1.Pos.stVal through DataSet, RCB, gateway and HMI.',
  },
  {
    group: 'IED & Signals',
    title: 'Analog scaling and measurement quality',
    purpose: 'Validate CT/PT ratios, engineering units and invalid data.',
    prerequisites: ['CT/PT ratios and approved test equipment'],
    steps: [
      'Confirm source nominal values and configured scaling.',
      'Inject a known safe simulated current/voltage.',
      'Compare IED raw/primary value with HMI engineering value.',
      'Repeat at low, nominal and high test points.',
      'Verify units, decimal places and limits.',
      'Force invalid/questionable quality in the simulator.',
      'Check HMI stale/bad-quality indication and restore.',
    ],
    expected: 'Measurements are within project tolerance and bad quality is visible.',
    interview: 'Explain primary/secondary scaling and IEC 61850 quality flags.',
  },
  {
    group: 'IEC 61850',
    title: 'SCL configuration validation',
    purpose: 'Validate ICD/CID/SCD consistency before commissioning.',
    prerequisites: ['Approved SCD and vendor IED configuration'],
    steps: [
      'Back up existing project and IED settings.',
      'Validate SCD syntax with the approved engineering tool.',
      'Verify IED names, access points and IP addresses.',
      'Review DataSets, RCBs and GOOSE publisher/subscriber references.',
      'Check control model, functional constraints and dataset members.',
      'Compare configured CID with approved SCD.',
      'Document discrepancies; deploy only after approval.',
    ],
    expected: 'Approved SCL references and actual IED configuration are consistent.',
    interview: 'Differentiate ICD, CID, SCD and IID files.',
  },
  {
    group: 'IEC 61850',
    title: 'MMS reporting, GI and RCB',
    purpose: 'Check BRCB/URCB updates, integrity and general interrogation.',
    prerequisites: ['IED dataset and RCB list', 'Authorized MMS test client'],
    steps: [
      'Establish MMS association on TCP/102.',
      'Browse logical devices and data model.',
      'Verify dataset membership and report control block settings.',
      'Enable the approved RCB and confirm reservation/ownership.',
      'Change one simulated dataset value.',
      'Check report reason, sequence, timestamp and quality.',
      'Trigger GI and verify current values are reported.',
      'Test integrity period and buffered recovery where supported.',
      'Disable report and release the association cleanly.',
    ],
    expected: 'Reports match configured trigger options, dataset and buffering behavior.',
    interview: 'Compare BRCB and URCB, GI, integrity and data-change triggers.',
  },
  {
    group: 'IEC 61850',
    title: 'GOOSE publish/subscribe and timeout',
    purpose: 'Verify event transfer and subscriber supervision.',
    prerequisites: ['Approved GOOSE matrix and network design', 'Test VLAN and IED simulation'],
    steps: [
      'Confirm publisher dataset and GOOSE control block.',
      'Check APPID, multicast MAC, VLAN ID/priority and confRev.',
      'Verify subscriber input binding to publisher dataset.',
      'Trigger a simulated publisher state change.',
      'Observe stNum/sqNum and packet timing in capture.',
      'Confirm subscribed input and expected logic response.',
      'Simulate publisher loss or incorrect configuration in lab.',
      'Verify subscriber timeout/invalid indication and recovery.',
    ],
    expected: 'Correct GOOSE transfer, supervision and safe timeout response.',
    interview: 'Explain stNum, sqNum, confRev, multicast and retransmission.',
  },
  {
    group: 'Communication',
    title: 'PRP / HSR redundancy failover',
    purpose: 'Confirm communication survives a permitted single network failure.',
    prerequisites: ['Approved PRP LAN A/B or HSR ring topology', 'Controlled network test window'],
    steps: [
      'Document network topology and baseline latency/packet loss.',
      'Verify both PRP LANs or HSR ring connections.',
      'Confirm duplicate handling or ring supervision diagnostics.',
      'Disable one approved link in the test environment.',
      'Observe MMS/GOOSE continuity and alarms.',
      'Record recovery behavior and packet capture.',
      'Restore link and verify redundant healthy state.',
      'Repeat only for other approved failure scenarios.',
    ],
    expected: 'Required communication remains available under specified single-fault conditions.',
    interview: 'Explain PRP seamless redundancy versus HSR ring forwarding.',
  },
  {
    group: 'Communication',
    title: 'IEC 60870-5-104 gateway to RCC',
    purpose: 'Verify TCP/2404, STARTDT and telecontrol point exchange.',
    prerequisites: ['Approved IOA/COA list and RCC test endpoint'],
    steps: [
      'Verify IP routing, firewall rules and TCP/2404 reachability.',
      'Establish IEC-104 session and STARTDT exchange.',
      'Check common address (COA) and information object addresses (IOA).',
      'Perform general interrogation and compare monitored values.',
      'Test spontaneous indication and timestamp/quality.',
      'Issue an approved simulated select/execute command.',
      'Confirm command activation, termination and feedback.',
      'Simulate session loss and verify alarm/reconnect behavior.',
    ],
    expected: 'Telemetry and authorized commands map correctly between gateway and RCC.',
    interview: 'Explain STARTDT, GI, COA, IOA, cause of transmission and select/execute.',
  },
  {
    group: 'Communication',
    title: 'Modbus TCP and OPC UA',
    purpose: 'Validate gateway integration with register mapping and subscriptions.',
    prerequisites: ['Approved register map and OPC UA namespace'],
    steps: [
      'Verify endpoint address, TCP port and access permissions.',
      'For Modbus, confirm unit ID, function code and register offsets.',
      'Read known test registers and verify byte/word order and scaling.',
      'For OPC UA, establish approved secure endpoint/session.',
      'Browse nodes and verify namespace, data type and access level.',
      'Create a monitored-item subscription and change test value.',
      'Confirm timestamp, status code and reconnect behavior.',
    ],
    expected: 'Data types, scaling, quality and refresh match approved integration design.',
    interview: 'Explain Modbus register addressing versus OPC UA node/subscription model.',
  },
  {
    group: 'Time & Events',
    title: 'SNTP / PTP time synchronization and SOE',
    purpose: 'Verify device clock source and event ordering.',
    prerequisites: ['Approved time source and project accuracy requirement'],
    steps: [
      'Check configured NTP/SNTP/PTP source and network path.',
      'Record IED, gateway, HMI and time-server status.',
      'Generate two safe test events with known order.',
      'Compare SOE timestamps across IED, gateway and HMI.',
      'Verify timezone handling and UTC storage/display.',
      'Simulate time-source loss in a lab environment.',
      'Check loss-of-sync alarm and recovery after restoration.',
    ],
    expected: 'Time accuracy and event order meet the project specification.',
    interview: 'Explain why accurate timestamps matter for disturbance analysis.',
  },
  {
    group: 'FAT / SAT',
    title: 'Alarm, SOE and fault injection',
    purpose: 'Verify alarm generation, acknowledgement and restoration.',
    prerequisites: ['Approved alarm matrix and fault simulation plan'],
    steps: [
      'Identify alarm point, priority and expected text.',
      'Generate fault using simulator or approved test input.',
      'Check IED state, HMI alarm and SOE timestamp.',
      'Verify audible/visual indication and acknowledgement behavior.',
      'Check alarm remains active while the fault persists.',
      'Clear the simulated fault and verify return-to-normal event.',
      'Export evidence and record pass/fail against acceptance criteria.',
    ],
    expected: 'Alarm state, priority, text, timestamps and acknowledgement work as specified.',
    interview: 'Distinguish active, acknowledged, returned-to-normal and historical alarms.',
  },
  {
    group: 'FAT / SAT',
    title: 'FAT / SAT final acceptance and handover',
    purpose: 'Close test evidence and project punch points.',
    prerequisites: ['Approved test procedures and acceptance criteria'],
    steps: [
      'Review latest drawings, I/O list, SCD and configuration revisions.',
      'Confirm calibration, backups and approved test permits.',
      'Execute signed FAT/SAT test sheets with witness as required.',
      'Record measured result, expected result, screenshots and logs.',
      'Raise deviations and track punch-list owner and closure.',
      'Retest corrected items and obtain witness approval.',
      'Restore production settings and remove all test overrides.',
      'Archive as-built configurations, reports and sign-offs.',
    ],
    expected: 'All required tests are traceable, accepted and safely handed over.',
    interview: 'Explain the difference between FAT and SAT and how you document deviations.',
  },
];

export function TestingGuidancePage() {
  // Always open on the main Testing Guidance Dashboard (null = no test visualization selected)
  const [selectedVizTestIndex, setSelectedVizTestIndex] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState('All Tests');
  const [expanded, setExpanded] = useState<number[]>([]);
  const savedScrollY = useRef(0);
  const shouldRestoreScroll = useRef(false);

  const openVisualization = (index: number) => {
    savedScrollY.current = window.scrollY;
    shouldRestoreScroll.current = true;
    setSelectedVizTestIndex(index);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  useLayoutEffect(() => {
    if (selectedVizTestIndex !== null || !shouldRestoreScroll.current) return;
    shouldRestoreScroll.current = false;
    window.scrollTo({ top: savedScrollY.current, behavior: 'instant' });
  }, [selectedVizTestIndex]);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  const groups = ['All Tests', ...Array.from(new Set(tests.map((t) => t.group)))];
  const visible = useMemo(
    () =>
      tests
        .map((test, index) => ({ ...test, index }))
        .filter(
          (t) =>
            (group === 'All Tests' || t.group === group) &&
            `${t.title} ${t.purpose} ${t.group}`.toLowerCase().includes(query.toLowerCase())
        ),
    [group, query]
  );

  // If Test 10 (index 9) is selected, render Test10PrpHsrVisualization
  if (selectedVizTestIndex === 9) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test10PrpHsrVisualization
          initialDone={tests[9].steps.map((_, i) => !!checked[`9-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`9-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  if (selectedVizTestIndex === 14) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test15FatSatVisualization
          initialDone={tests[14].steps.map((_, i) => !!checked[`14-${i}`])}
          allChecked={checked}
          testSummaries={tests.slice(0, 14).map((t) => ({ title: t.title, stepCount: t.steps.length }))}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`14-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }
  if (selectedVizTestIndex === 13) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test14AlarmSoeVisualization
          initialDone={tests[13].steps.map((_, i) => !!checked[`13-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`13-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }
  if (selectedVizTestIndex === 12) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test13TimeSyncVisualization
          initialDone={tests[12].steps.map((_, i) => !!checked[`12-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`12-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }
  if (selectedVizTestIndex === 11) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test12ModbusOpcUaVisualization
          initialDone={tests[11].steps.map((_, i) => !!checked[`11-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`11-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }
  if (selectedVizTestIndex === 10) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test11Iec104Visualization
          initialDone={tests[10].steps.map((_, i) => !!checked[`10-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`10-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // If Test 6 (index 5) is selected, render Test6AnalogScalingVisualization
  if (selectedVizTestIndex === 5) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test6AnalogScalingVisualization
          initialDone={tests[5].steps.map((_, i) => !!checked[`5-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`5-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // If Test 5 (index 4) is selected, render Test5SignalMappingVisualization
  if (selectedVizTestIndex === 4) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test5SignalMappingVisualization
          initialDone={tests[4].steps.map((_, i) => !!checked[`4-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`4-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // If Test 4 (index 3) is selected, render Test4IedCommVisualization
  if (selectedVizTestIndex === 3) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test4IedCommVisualization
          initialDone={tests[3].steps.map((_, i) => !!checked[`3-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`3-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // If Test 3 (index 2) is selected, render Test3InterlockingVisualization
  if (selectedVizTestIndex === 2) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test3InterlockingVisualization
          initialDone={tests[2].steps.map((_, i) => !!checked[`2-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`2-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // If Test 2 (index 1) is selected, render the dedicated Test2SboVisualization
  if (selectedVizTestIndex === 1) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <Test2SboVisualization
          initialDone={tests[1].steps.map((_, i) => !!checked[`1-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`1-${i}`]: value }))}
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // If Test 1 (index 0) is selected, render the dedicated BreakerStatusVisualization
  if (selectedVizTestIndex === 0) {
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <BreakerStatusVisualization
          initialDone={tests[0].steps.map((_, i) => !!checked[`0-${i}`])}
          onStepChange={(i, value) => setChecked((v) => ({ ...v, [`0-${i}`]: value }))}
          onClose={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // If any other test (Tests 2..15) is selected, render its specific TestStepVisualization
  if (selectedVizTestIndex !== null && tests[selectedVizTestIndex]) {
    const activeTest = tests[selectedVizTestIndex];
    return (
      <div className="mx-auto max-w-[1600px] text-[#E9F3FF]">
        <TestStepVisualization
          test={activeTest}
          testIndex={selectedVizTestIndex}
          initialDone={activeTest.steps.map((_, i) => !!checked[`${selectedVizTestIndex}-${i}`])}
          onStepChange={(stepIdx, value) =>
            setChecked((v) => ({ ...v, [`${selectedVizTestIndex}-${stepIdx}`]: value }))
          }
          onBackToAllTests={() => setSelectedVizTestIndex(null)}
        />
      </div>
    );
  }

  // Default: Main Testing Guidance Dashboard showing all 15 searchable, expandable test cards
  return (
    <div className="mx-auto max-w-[1600px] space-y-5 text-[#E9F3FF]">
      <div className="rounded-2xl border border-[#00CFFF]/70 bg-gradient-to-r from-[#092B43] to-[#07182C] p-5 shadow-[0_0_24px_rgba(0,207,255,0.16)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ClipboardCheck className="h-8 w-8 text-[#00E5FF]" />
            <div>
              <h1 className="text-2xl font-bold">Testing Guidance</h1>
              <p className="text-sm text-[#A6C5D9]">
                Practical SAS testing • step-by-step procedures • FAT/SAT and interview preparation
              </p>
            </div>
          </div>
          <span className="rounded-xl border border-[#00CFFF]/50 bg-[#062238] px-3 py-1.5 text-xs font-bold text-[#00EAFF]">
            {tests.length} Interactive Procedures
          </span>
        </div>
        <p className="mt-3 text-xs text-[#FFCA78]">
          <ShieldAlert className="mr-1 inline h-4 w-4" />
          Training guidance only. Never operate energized equipment or bypass interlocks without
          site authorization, permits and approved procedures.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <label className="flex min-w-[230px] flex-1 items-center gap-2 rounded-xl border border-[#24516B] bg-[#071A2E] px-3">
          <Search className="h-4 w-4 text-[#00CFFF]" />
          <input
            aria-label="Search tests"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search test procedures..."
            className="w-full bg-transparent py-3 text-sm outline-none"
          />
        </label>
        <select
          aria-label="Filter test category"
          value={group}
          onChange={(e) => setGroup(e.target.value)}
          className="rounded-xl border border-[#24516B] bg-[#071A2E] px-3 text-sm"
        >
          {groups.map((g) => (
            <option key={g}>{g}</option>
          ))}
        </select>
        <div className="self-center text-xs text-[#9BC0DF]">{visible.length} tests</div>
      </div>

      {visible.map((test) => {
        const doneCount = test.steps.filter((_, i) => !!checked[`${test.index}-${i}`]).length;
        const isExpanded = expanded.includes(test.index);
        return (
          <article
            key={test.index}
            className="overflow-hidden rounded-xl border border-[#166A89] bg-[#071A2E] shadow-[0_0_14px_rgba(0,207,255,0.08)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-[#0B2A42]">
              <button
                type="button"
                className="flex flex-1 items-center justify-between gap-4 text-left"
                onClick={() =>
                  setExpanded((v) =>
                    v.includes(test.index)
                      ? v.filter((i) => i !== test.index)
                      : [...v, test.index]
                  )
                }
              >
                <span>
                  <span className="text-[11px] font-bold uppercase text-[#00CFFF]">
                    {test.group} · Test {test.index + 1}
                    {doneCount > 0 && (
                      <span className="ml-2 rounded-full border border-[#00FF4C]/50 bg-[#00FF4C]/15 px-2 py-0.5 text-[10px] text-[#00FF4C]">
                        {doneCount}/{test.steps.length} Done
                      </span>
                    )}
                  </span>
                  <span className="mt-1 block font-bold">{test.title}</span>
                  <span className="mt-1 block text-xs text-[#9BC0DF]">{test.purpose}</span>
                </span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openVisualization(test.index)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-[#00EAFF] bg-gradient-to-b from-[#0E3F60] to-[#072238] px-3 py-1.5 text-xs font-bold text-[#00EAFF] shadow-[0_0_10px_rgba(0,234,255,0.22)] hover:brightness-110"
                >
                  <Monitor className="h-3.5 w-3.5" />
                  Open Visualization
                </button>
                <button
                  type="button"
                  aria-label={isExpanded ? 'Collapse test card' : 'Expand test card'}
                  onClick={() =>
                    setExpanded((v) =>
                      v.includes(test.index)
                        ? v.filter((i) => i !== test.index)
                        : [...v, test.index]
                    )
                  }
                  className="rounded-lg p-1.5 hover:bg-[#103654]"
                >
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-[#00CFFF] transition-transform ${
                      isExpanded ? 'rotate-180' : ''
                    }`}
                  />
                </button>
              </div>
            </div>

            {isExpanded && (
              <div className="space-y-4 border-t border-[#21425C] p-4">
                <section>
                  <h3 className="mb-2 text-sm font-bold text-[#73E9FF]">Before you start</h3>
                  {test.prerequisites.map((x, i) => (
                    <p key={i} className="py-1 text-sm">
                      • {x}
                    </p>
                  ))}
                </section>

                <section>
                  <h3 className="mb-2 text-sm font-bold text-[#73E9FF]">
                    Step-by-step test process
                  </h3>
                  <div className="space-y-2">
                    {test.steps.map((step, i) => {
                      const id = `${test.index}-${i}`;
                      return (
                        <label
                          key={id}
                          className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-all ${
                            checked[id]
                              ? 'border-[#00D9F0] bg-[#07516A] shadow-[inset_3px_0_#00FF70]'
                              : 'border-[#183B55] bg-[#091F34]'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!!checked[id]}
                            onChange={(e) =>
                              setChecked((v) => ({ ...v, [id]: e.target.checked }))
                            }
                            className="sr-only"
                          />
                          <span
                            aria-hidden="true"
                            className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded border text-sm font-black ${
                              checked[id]
                                ? 'border-[#00FF70] bg-[#00F365] text-[#002318]'
                                : 'border-[#6C8DA4] bg-[#10283D]'
                            }`}
                          >
                            {checked[id] ? '✓' : ''}
                          </span>
                          <span className="text-sm">
                            <b className="mr-2 text-[#00CFFF]">{i + 1}.</b>
                            {step}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>

                <div className="rounded-lg border border-[#167A60] bg-[#07332D]/50 p-3 text-sm">
                  <CheckCircle2 className="mr-2 inline h-4 w-4 text-[#22C55E]" />
                  <b>Expected result:</b> {test.expected}
                </div>
                <div className="rounded-lg border border-[#24516B] p-3 text-sm">
                  <BookOpen className="mr-2 inline h-4 w-4 text-[#00CFFF]" />
                  <b>Interview focus:</b> {test.interview}
                </div>
              </div>
            )}
          </article>
        );
      })}

      {visible.length === 0 && (
        <p className="rounded-xl border border-[#24516B] p-6 text-center text-sm">
          No matching tests. Try another search or category.
        </p>
      )}
    </div>
  );
}

export default TestingGuidancePage;
