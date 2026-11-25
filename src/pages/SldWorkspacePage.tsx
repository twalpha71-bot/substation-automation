import { BayConfigurationManager } from './BayConfigurationManager';
import { MultifunctionMeter } from '../components/MultifunctionMeter';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { getBayProtocolBreakdown } from '../data/protocolRegistry';
import { BayEquipment, VendorName } from '../types/substation';
import { BreakerControlDrawer } from '../components/BreakerControlDrawer';
import { createPortal } from 'react-dom';
import {
  Filter,
  Settings2,
  Layers,
  Maximize2,
  Minus,
  Plus,
  PlusCircle,
  RotateCcw,
  Search,
  Sun,
  Trash2,
  Zap,
  Clock,
  Wifi,
  AlertTriangle,
   Minimize2,
  ShieldCheck,
  Box,
  X,
} from 'lucide-react';

const Substation3DScene = React.lazy(() => import('../components/Substation3DScene').then(module => ({ default: module.Substation3DScene })));

export const SldWorkspacePage: React.FC = () => {
  const [bayManagerOpen, setBayManagerOpen] = useState(false);
  useEffect(() => {
    if (!bayManagerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setBayManagerOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [bayManagerOpen]);

  const {
    bays,
    busbars,
    transformers,
    selectedBayId,
    sldTheme,
    setSelectedBayId,
    setSldTheme,
    stepTransformerOltc,
    addConfigurableFeederBay,
    removeConfigurableFeederBay,
    busTransferModes,
    busTransferStatus,
    busTransferMessage,
    soeLog,
    alarms,
    setVoltageBusTransferMode,
    requestBusTransfer,
    commandBreaker,
    commandDisconnector,
    setBayLocalRemote,
  } = useSubstationStore(useShallow(state => ({
    bays: state.bays,
    busbars: state.busbars,
    transformers: state.transformers,
    selectedBayId: state.selectedBayId,
    sldTheme: state.sldTheme,
    setSelectedBayId: state.setSelectedBayId,
    setSldTheme: state.setSldTheme,
    stepTransformerOltc: state.stepTransformerOltc,
    addConfigurableFeederBay: state.addConfigurableFeederBay,
    removeConfigurableFeederBay: state.removeConfigurableFeederBay,
    busTransferModes: state.busTransferModes,
    busTransferStatus: state.busTransferStatus,
    busTransferMessage: state.busTransferMessage,
    soeLog: state.soeLog,
    alarms: state.alarms,
    setVoltageBusTransferMode: state.setVoltageBusTransferMode,
    requestBusTransfer: state.requestBusTransfer,
    commandBreaker: state.commandBreaker,
    commandDisconnector: state.commandDisconnector,
    setBayLocalRemote: state.setBayLocalRemote,
  })));

  // SLD-only selection: no default highlight and no forced bay on initial render.
  const [inspectedBayId, setInspectedBayId] = useState<string | null>(null);
  const [deviceDetailsTab, setDeviceDetailsTab] = useState<'Overview' | 'Measurements' | 'Protection' | 'IEC 61850' | 'Controls' | 'SOE'>('Overview');
  // Training-only earthing arrangement metadata. This does not change store interlocks
  // or authorize an earth-switch operation on actual equipment.
  type EarthingArrangement = 'NOT_CONFIGURED' | 'FIXED_ES' | 'EARTHING_TRUCK' | 'PORTABLE_EARTHING';
  const [earthingArrangements, setEarthingArrangements] = useState<Record<string, EarthingArrangement>>({});
  const earthingFor = (bay: BayEquipment): EarthingArrangement =>
    earthingArrangements[bay.id] ?? 'NOT_CONFIGURED';
  const setEarthingFor = (id: string, arrangement: EarthingArrangement) =>
    setEarthingArrangements(previous => ({ ...previous, [id]: arrangement }));

  // Clear selection outside the SLD bay and Device Details inspector only.
  // Keep selection while using the inspector tabs and CB/DS/ES controls.
  useEffect(() => {
    const clearOnOutsideClick = (event: MouseEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest('[data-sld-bay], [data-sld-device-details]')) return;
      setInspectedBayId(null);
    };
    document.addEventListener('click', clearOnOutsideClick, true);
    return () => document.removeEventListener('click', clearOnOutsideClick, true);
  }, []);

  // Q2 is engineering-only visual metadata until the simulation store exposes
  // independent Q2 telemetry and interlocked switching commands.
  type Q2Setting = 'NOT_INSTALLED' | 'OPEN' | 'CLOSED';
  const [q2Settings, setQ2Settings] = useState<Record<string, Q2Setting>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('sas-sld-q2-settings-v1') || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      return Object.fromEntries(Object.entries(saved).filter((entry): entry is [string, Q2Setting] =>
        typeof entry[0] === 'string' && ['NOT_INSTALLED', 'OPEN', 'CLOSED'].includes(String(entry[1]))));
    } catch { return {}; }
  });
  useEffect(() => {
    try { localStorage.setItem('sas-sld-q2-settings-v1', JSON.stringify(q2Settings)); } catch { /* storage optional */ }
  }, [q2Settings]);
  const q2For = (bay: BayEquipment): Q2Setting => q2Settings[bay.id] ?? 'NOT_INSTALLED';

  const inspectedBay = bays.find(b => b.id === inspectedBayId);
  const inspectSldBay = (id: string) => {
    if (inspectedBayId === id) { setInspectedBayId(null); return; }
    setInspectedBayId(id);
    setDeviceDetailsTab('Overview');
    setSelectedBayId(id);
  };
  const [workspaceTab, setWorkspaceTab] = useState<'SLD' | 'MFM' | 'TRANSFER' | 'FAT' | 'ENGINEERING' | 'PROTOCOLS'>('SLD');
  const selectWorkspaceTab = (tab: typeof workspaceTab) => { setWorkspaceTab(tab); };
  const [zoom, setZoom] = useState<number>(1.0);
  const [expandedSld, setExpandedSld] = useState(false);
  const [show3DModel, setShow3DModel] = useState(false);
  useEffect(() => {
    if (!show3DModel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setShow3DModel(false);
    };
    window.addEventListener('keydown', handleEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [show3DModel]);
  const [panX, setPanX] = useState<number>(0);
  const [panY, setPanY] = useState<number>(0);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 132 | 33 | 11>('ALL');
  const [showBayEditor, setShowBayEditor] = useState<boolean>(false);


  // FAT/SAT bus-transfer evidence is captured per test session, never inferred from old SOE entries.
  const [fatLevel, setFatLevel] = useState<132 | 33 | 11>(132);
  const [fatPhase, setFatPhase] = useState<'TRANSFER' | 'RESTORE'>('TRANSFER');
  const [fatStarted, setFatStarted] = useState<number | null>(null);
  const [fatBaselineIds, setFatBaselineIds] = useState<string[]>([]);
  const [fatRemarks, setFatRemarks] = useState('');
  const [fatResults, setFatResults] = useState<Array<{
    id: string; level: number; phase: string; mode: string; started: number; finished: number;
    verdict: 'PASS' | 'FAIL'; expected: string; actual: string; evidence: string;
    caseNumber: string; remarks: string; interruptionMs: number | null;
    checkpoints: Array<{ label: string; passed: boolean }>;
  }>>([]);

  // Isolated negative-test bench: never writes fault states or operates live SLD breakers.
  const [negativeScenario, setNegativeScenario] = useState<'INTERLOCK' | 'NO_FEEDBACK' | 'DEAD_BUS' | 'SYNCH_CHECK'>('INTERLOCK');
  const [negativeFaultActive, setNegativeFaultActive] = useState(false);
  const [negativeEvents, setNegativeEvents] = useState<string[]>([]);
  // Training-only manual CLOSE interception. No store breaker command on injected failure.
  const [pendingFeedback, setPendingFeedback] = useState<number | null>(null);
  const [feedbackAlarm, setFeedbackAlarm] = useState('');
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recoveryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [recoveryMessage, setRecoveryMessage] = useState('');
  const [recoveryReset, setRecoveryReset] = useState<{ level: number; baseline: string[]; at: number } | null>(null);
  useEffect(() => () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    if (recoveryTimer.current) clearTimeout(recoveryTimer.current);
  }, []);
  const resetFeedbackFault = () => {
    if (feedbackTimer.current) clearTimeout(feedbackTimer.current);
    feedbackTimer.current = null;
    setPendingFeedback(null);
    setFeedbackAlarm('');
    setNegativeFaultActive(false);
    setRecoveryReset({ level: fatLevel, baseline: useSubstationStore.getState().soeLog.map(e => e.id), at: Date.now() });
    setRecoveryMessage('Fault reset recorded. Prepare one LIVE / one DEAD bus, MANUAL mode, then run recovery.');
    setNegativeEvents(prev => [`${new Date().toISOString()} [TRAINING] Fault reset and training alarm cleared`, ...prev].slice(0, 12));
  };
  const attemptManualCouplerClose = (level: 132 | 33 | 11) => {
    if (!(negativeFaultActive && negativeScenario === 'NO_FEEDBACK' && fatLevel === level)) {
      requestBusTransfer(level);
      return;
    }
    if (pendingFeedback !== null) return;
    const started = Date.now();
    setRecoveryReset(null);
    setRecoveryMessage('');
    setPendingFeedback(level);
    setFeedbackAlarm('');
    setNegativeEvents(prev => [`${new Date(started).toISOString()} [TRAINING] CB-${level} CLOSE requested; XCBR1 feedback suppressed`, ...prev].slice(0, 12));
    feedbackTimer.current = setTimeout(() => {
      const finished = Date.now();
      const coupler = useSubstationStore.getState().bays.find(b => b.id === `BAY-${level}-BC`);
      const unchanged = coupler?.breakerState === 'OPEN';
      const event = `${new Date(finished).toISOString()} [TRAINING ALARM] CB-${level} CLOSE COMMAND TIMEOUT: XCBR1.Pos.stVal=${coupler?.breakerState ?? 'UNKNOWN'} (${finished - started} ms)`;
      setFeedbackAlarm(event);
      setNegativeEvents(prev => [event, ...prev].slice(0, 12));
      setFatResults(prev => [{
        id: `TIMEOUT-${level}-${started}`, caseNumber: `BT-${String(prev.length + 1).padStart(3, '0')}`,
        level, phase: 'NEG-NO_FEEDBACK', mode: 'MANUAL CLOSE - TRAINING INTERCEPTOR',
        started, finished, verdict: unchanged ? 'PASS' : 'FAIL',
        expected: 'Simulated CLOSE request, absent CLOSED feedback, timeout alarm, unchanged breaker',
        actual: `Timeout ${finished - started} ms; coupler=${coupler?.breakerState ?? 'UNKNOWN'}`,
        evidence: event, remarks: fatRemarks, interruptionMs: null,
        checkpoints: [
          { label: 'Simulated command timeout generated', passed: true },
          { label: 'CLOSED feedback absent', passed: unchanged },
          { label: 'Training breaker state remained OPEN', passed: unchanged },
        ],
      }, ...prev]);
      setPendingFeedback(null);
      feedbackTimer.current = null;
    }, 2000);
  };
  // Recovery runs the EXISTING simulated bus-transfer controller; it does not bypass CILO.
  // Only new SOE entries after this recovery command can satisfy command/feedback checks.
  const runFeedbackRecovery = () => {
    const level = fatLevel;
    const state = useSubstationStore.getState();
    const coupler = state.bays.find(b => b.id === `BAY-${level}-BC`);
    const a = state.busbars.find(b => b.id === `BUS-${level}-A`);
    const b = state.busbars.find(b => b.id === `BUS-${level}-B`);
    const priorTimeout = fatResults.some(r => r.level === level && r.phase === 'NEG-NO_FEEDBACK' && r.mode === 'MANUAL CLOSE - TRAINING INTERCEPTOR');
    if (!priorTimeout) { setRecoveryMessage('BLOCKED: First run an integrated CLOSE feedback timeout test for this voltage.'); return; }
    if (!recoveryReset || recoveryReset.level !== level) { setRecoveryMessage('BLOCKED: Press Reset Fault / Clear Training Alarm after the timeout.'); return; }
    if (negativeFaultActive || feedbackAlarm || pendingFeedback !== null) { setRecoveryMessage('BLOCKED: Disable injected fault and clear the timeout alarm first.'); return; }
    if (busTransferModes[level] !== 'MANUAL' || coupler?.breakerState !== 'OPEN' || !a || !b || a.energized === b.energized) {
      setRecoveryMessage('BLOCKED: Set MANUAL, coupler OPEN, and exactly one bus LIVE before recovery.'); return;
    }
    if (fatStarted !== null || recoveryPending) { setRecoveryMessage('BLOCKED: Finish the active FAT/SAT session first.'); return; }
    const started = Date.now();
    const baseline = new Set(state.soeLog.map(e => e.id));
    const deadSection = a.energized ? 'B' : 'A';
    setRecoveryPending(true);
    setRecoveryMessage(`Recovery CLOSE requested for CB-${level}; awaiting new SOE and voltage feedback...`);
    setNegativeEvents(prev => [`${new Date(started).toISOString()} [RECOVERY] CB-${level} CLOSE requested after fault reset`, ...prev].slice(0, 12));
    requestBusTransfer(level);
    recoveryTimer.current = setTimeout(() => {
      const finished = Date.now();
      const current = useSubstationStore.getState();
      const cb = current.bays.find(x => x.id === `BAY-${level}-BC`);
      const busA = current.busbars.find(x => x.id === `BUS-${level}-A`);
      const busB = current.busbars.find(x => x.id === `BUS-${level}-B`);
      const events = current.soeLog.filter(e => !baseline.has(e.id) && (e.bayId === cb?.id || e.eventDescription.startsWith(`${level} kV `)))
        .sort((x, y) => new Date(x.timestampMs).getTime() - new Date(y.timestampMs).getTime());
      const cmdIndex = events.findIndex(e => e.eventDescription.includes(`SBO SCADA_SBO command issued — ${cb?.breakerId} CLOSED`));
      const fbIndex = events.findIndex((e, i) => i > cmdIndex && e.eventDescription.includes(`Breaker position feedback confirmed — ${cb?.breakerId} CLOSED`));
      const restored = Boolean(busA?.energized && busB?.energized);
      const checkpoints = [
        { label: 'Prior integrated timeout and subsequent fault reset recorded', passed: priorTimeout && Boolean(recoveryReset) },
        { label: 'Injected fault disabled and timeout alarm cleared', passed: !negativeFaultActive && !feedbackAlarm },
        { label: 'New CLOSE command present in recovery SOE', passed: cmdIndex >= 0 },
        { label: 'New CLOSED feedback follows CLOSE command', passed: cmdIndex >= 0 && fbIndex > cmdIndex },
        { label: 'CB CLOSED and both buses LIVE after recovery', passed: cb?.breakerState === 'CLOSED' && restored },
        { label: `Previously dead Bus ${deadSection} restored`, passed: deadSection === 'A' ? Boolean(busA?.energized) : Boolean(busB?.energized) },
      ];
      const verdict: 'PASS' | 'FAIL' = checkpoints.every(x => x.passed) ? 'PASS' : 'FAIL';
      const message = `${new Date(finished).toISOString()} [RECOVERY ${verdict}] CB-${level}=${cb?.breakerState ?? 'UNKNOWN'}; Bus A=${busA?.energized ? 'LIVE' : 'DEAD'}; Bus B=${busB?.energized ? 'LIVE' : 'DEAD'}; ordered SOE=${cmdIndex >= 0 && fbIndex > cmdIndex}`;
      setNegativeEvents(prev => [message, ...prev].slice(0, 12));
      setRecoveryMessage(message);
      setFatResults(prev => [{
        id: `RECOVERY-${level}-${started}`, caseNumber: `BT-${String(prev.length + 1).padStart(3, '0')}`,
        level, phase: 'RECOVERY-NO_FEEDBACK', mode: 'MANUAL CLOSE - RECOVERY', started, finished, verdict,
        expected: 'Fault reset; new CLOSE command then CLOSED feedback; previously dead bus restored; both buses LIVE',
        actual: `Coupler=${cb?.breakerState ?? 'UNKNOWN'}; Bus A=${busA?.energized ? 'LIVE' : 'DEAD'}; Bus B=${busB?.energized ? 'LIVE' : 'DEAD'}; recovery evaluation=${finished - started} ms`,
        evidence: [message, ...events.map(e => `${new Date(e.timestampMs).toISOString()} ${e.eventDescription}: ${e.valueChange}`)].join(' | '),
        remarks: fatRemarks, interruptionMs: null, checkpoints,
      }, ...prev]);
      setRecoveryPending(false);
      setRecoveryReset(null); // Each recovery requires a fresh timeout and reset sequence.
      recoveryTimer.current = null;
    }, 350);
  };

  const runNegativeTest = () => {
    const level = fatLevel;
    const coupler = bays.find(b => b.id === `BAY-${level}-BC`);
    const scenarioLabels = {
      INTERLOCK: 'Both incoming sources closed: anti-paralleling CILO blocks coupler CLOSE',
      NO_FEEDBACK: 'Coupler CLOSE requested but XCBR1.Pos.stVal remains OPEN: feedback timeout',
      DEAD_BUS: 'Dead-bus / live-bus voltage permissive absent: coupler CLOSE blocked',
      SYNCH_CHECK: 'ANSI 25 synch-check permissive absent: coupler CLOSE blocked',
    };
    const messages = {
      INTERLOCK: 'CILO1.EnaCls=FALSE; command REJECTED; no breaker operation',
      NO_FEEDBACK: 'CLOSE issued; XCBR1.Pos.stVal=OPEN; simulated timeout alarm asserted',
      DEAD_BUS: 'Voltage permissive=FALSE; CLOSE command REJECTED',
      SYNCH_CHECK: 'RSYN1.Rel.stVal=FALSE; CLOSE command REJECTED',
    };
    const start = Date.now();
    const faultInjected = negativeFaultActive;
    const checkpoints = [
      { label: 'Negative fault condition explicitly enabled', passed: faultInjected },
      { label: negativeScenario === 'NO_FEEDBACK' ? 'Simulated missing feedback timeout detected' : 'Simulated unsafe CLOSE command rejected', passed: faultInjected },
      { label: 'Real SLD breaker state not modified by isolated test', passed: true },
    ];
    const verdict: 'PASS' | 'FAIL' = checkpoints.every(c => c.passed) ? 'PASS' : 'FAIL';
    const event = `${new Date(start).toISOString()} [ISOLATED TEST] ${level} kV ${scenarioLabels[negativeScenario]} | ${faultInjected ? messages[negativeScenario] : 'FAULT NOT ENABLED: test cannot pass'}`;
    setNegativeEvents(prev => [event, ...prev].slice(0, 12));
    setFatResults(prev => [{
      id: `NEG-${negativeScenario}-${start}`, caseNumber: `BT-${String(prev.length + 1).padStart(3, '0')}`,
      level, phase: `NEG-${negativeScenario}`, mode: 'ISOLATED TEST BENCH', started: start, finished: Date.now(),
      verdict, expected: scenarioLabels[negativeScenario],
      actual: `${faultInjected ? messages[negativeScenario] : 'Fault injection disabled'}; real coupler=${coupler?.breakerState ?? 'N/A'} (unchanged)`,
      evidence: event, interruptionMs: null, remarks: fatRemarks, checkpoints,
    }, ...prev]);
    setFatRemarks('');
    setNegativeFaultActive(false);
  };

  const finishFatTest = () => {
    if (fatStarted === null) return;
    const finished = Date.now();
    const level = fatLevel;
    const coupler = bays.find(b => b.id === `BAY-${level}-BC`);
    const first = bays.find(b => b.id === (level === 132 ? 'BAY-132-L1' : `BAY-${level}-INC1`));
    const second = bays.find(b => b.id === (level === 132 ? 'BAY-132-L2' : `BAY-${level}-INC2`));
    const a = busbars.find(b => b.id === `BUS-${level}-A`);
    const b = busbars.find(b => b.id === `BUS-${level}-B`);
    const relevant = soeLog.filter(e => {
      return !fatBaselineIds.includes(e.id) &&
        (e.bayId === coupler?.id || e.bayId === first?.id || e.bayId === second?.id ||
         e.eventDescription.startsWith(`${level} kV Bus `) ||
         e.eventDescription.startsWith(`${level} kV `));
    }).sort((x, y) => new Date(x.timestampMs).getTime() - new Date(y.timestampMs).getTime());
    const findIndex = (needle: string, after = -1) =>
      relevant.findIndex((e, i) => i > after && e.eventDescription.includes(needle));
    const expected = fatPhase === 'TRANSFER'
      ? 'One source OPEN; coupler CLOSE command then CLOSED feedback; both buses LIVE'
      : 'Coupler OPEN command and feedback before source CLOSE command and feedback; both buses LIVE';
    let ordered = false;
    if (fatPhase === 'TRANSFER') {
      const cmd = findIndex(`SBO SCADA_SBO command issued — ${coupler?.breakerId} CLOSED`);
      const fb = findIndex(`Breaker position feedback confirmed — ${coupler?.breakerId} CLOSED`, cmd);
      ordered = cmd >= 0 && fb > cmd && [first, second].some(x => x?.breakerState === 'OPEN');
    } else {
      const cmdOpen = findIndex(`SBO SCADA_SBO command issued — ${coupler?.breakerId} OPEN`);
      const fbOpen = findIndex(`Breaker position feedback confirmed — ${coupler?.breakerId} OPEN`, cmdOpen);
      const sourceIds = [first?.breakerId, second?.breakerId].filter(Boolean);
      ordered = cmdOpen >= 0 && fbOpen > cmdOpen && sourceIds.some(id => {
        const cmdClose = findIndex(`SBO SCADA_SBO command issued — ${id} CLOSED`, fbOpen);
        const fbClose = findIndex(`Breaker position feedback confirmed — ${id} CLOSED`, cmdClose);
        return cmdClose > fbOpen && fbClose > cmdClose;
      });
    }
    const finalStateOk = fatPhase === 'TRANSFER'
      ? coupler?.breakerState === 'CLOSED' && a?.energized && b?.energized
      : coupler?.breakerState === 'OPEN' && first?.breakerState === 'CLOSED' &&
        second?.breakerState === 'CLOSED' && a?.energized && b?.energized;
    const voltageEvents = relevant.filter(e => e.eventDescription.includes(`${level} kV Bus `));
    const voltageTime = (e: typeof relevant[number]) => new Date(e.timestampMs).getTime();
    const intervals: number[] = [];
    for (const section of ['A', 'B']) {
      let lossAt: number | null = null;
      for (const e of voltageEvents.filter(e => e.eventDescription.includes(`Bus ${section} `))) {
        if (e.eventDescription.includes('undervoltage / dead bus')) lossAt = voltageTime(e);
        else if (e.eventDescription.includes('voltage restored') && lossAt !== null) {
          intervals.push(Math.max(0, voltageTime(e) - lossAt)); lossAt = null;
        }
      }
    }
    const interruptionMs = intervals.length ? Math.max(...intervals) : null;
    const checkpoints = [
      { label: 'Correct command and breaker feedback order', passed: ordered },
      { label: 'Final coupler position and both bus voltages correct', passed: Boolean(finalStateOk) },
      { label: 'New SOE evidence captured in this test', passed: relevant.length > 0 },
    ];
    const verdict = checkpoints.every(c => c.passed) ? 'PASS' : 'FAIL';
    const actual = `Coupler=${coupler?.breakerState ?? 'N/A'}, Source1=${first?.breakerState ?? 'N/A'}, Source2=${second?.breakerState ?? 'N/A'}, BusA=${a?.energized ? 'LIVE' : 'DEAD'}, BusB=${b?.energized ? 'LIVE' : 'DEAD'}, Ordered SOE=${ordered ? 'YES' : 'NO'}`;
    setFatResults(prev => [{
      id: `${level}-${fatPhase}-${finished}`, caseNumber: `BT-${String(prev.length + 1).padStart(3, '0')}`, remarks: fatRemarks, interruptionMs, checkpoints, level, phase: fatPhase,
      mode: busTransferModes[level], started: fatStarted, finished, verdict, expected, actual,
      evidence: relevant.map(e => `${new Date(e.timestampMs).toISOString()} ${e.eventDescription}: ${e.valueChange}`).join(' | '),
    }, ...prev]);
    setFatStarted(null);
    setFatRemarks('');
  };

  const exportFatCsv = () => {
    const columns = ['Case No', 'Test ID', 'Voltage kV', 'Test', 'Mode', 'Started ISO', 'Finished ISO', 'Interruption ms', 'Checkpoints', 'Operator Remarks', 'Expected', 'Actual', 'Result', 'SOE Evidence'];
    const quote = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = fatResults.map(r => [r.caseNumber, r.id, r.level, r.phase, r.mode,
      new Date(r.started).toISOString(), new Date(r.finished).toISOString(),
      r.interruptionMs ?? 'N/A', r.checkpoints.map(c => `${c.passed ? 'PASS' : 'FAIL'}: ${c.label}`).join('; '), r.remarks,
      r.expected, r.actual, r.verdict, r.evidence]);
    const csv = [columns, ...rows].map(row => row.map(quote).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url; link.download = 'Bus_Transfer_FAT_SAT_Report.csv'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Dependency-free PDF download. Builds a paginated, text-based PDF without opening a tab.
  const downloadFatPdf = () => {
    const ascii = (value: unknown) => String(value ?? '')
      .normalize('NFKD').replace(/[^\x20-\x7E]/g, '?');
    const pdfEscape = (value: string) => value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    const wrap = (value: unknown, limit = 93): string[] => {
      const output: string[] = [];
      for (const paragraph of ascii(value).split(/\r?\n/)) {
        let line = '';
        for (const word of paragraph.split(/\s+/)) {
          if (!word) continue;
          if (line && (line.length + word.length + 1 > limit)) {
            output.push(line);
            line = '';
          }
          if (word.length > limit) {
            if (line) { output.push(line); line = ''; }
            for (let i = 0; i < word.length; i += limit) output.push(word.slice(i, i + limit));
          } else {
            line += (line ? ' ' : '') + word;
          }
        }
        output.push(line);
      }
      return output;
    };
    const lines: Array<{ text: string; bold: boolean }> = [];
    const add = (value: unknown, bold = false) => {
      for (const text of wrap(value)) lines.push({ text, bold });
    };
    add('BUS TRANSFER FAT / SAT SIMULATION REPORT', true);
    add(`Generated: ${new Date().toISOString()}    Test cases: ${fatResults.length}`);
    add('TRAINING SIMULATION ONLY - NOT A FIELD COMMISSIONING CERTIFICATE', true);
    add('');
    for (const r of [...fatResults].reverse()) {
      add(`${r.caseNumber}  |  ${r.level} kV  |  ${r.phase}  |  ${r.mode}  |  ${r.verdict}`, true);
      add(`Started: ${new Date(r.started).toISOString()}`);
      add(`Finished: ${new Date(r.finished).toISOString()}`);
      add(`Simulated interruption: ${r.interruptionMs === null ? 'Not recorded' : `${r.interruptionMs} ms`}`);
      add(`Expected: ${r.expected}`);
      add(`Actual: ${r.actual}`);
      for (const c of r.checkpoints) add(`${c.passed ? 'PASS' : 'FAIL'} - ${c.label}`);
      add(`Operator remarks: ${r.remarks || 'None'}`);
      add('SOE evidence:', true);
      for (const event of r.evidence.split(' | ')) add(`  ${event}`);
      add('');
    }
    // Letter pages (612 x 792 pt), 10 pt Courier, 13 pt line height.
    const perPage = 51;
    const pageCount = Math.max(1, Math.ceil(lines.length / perPage));
    const objects: string[] = [];
    const reserve = () => { objects.push(''); return objects.length; };
    const catalogId = reserve();
    const pagesId = reserve();
    const regularFontId = reserve();
    const boldFontId = reserve();
    const pageIds: number[] = [];
    objects[regularFontId - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier /Encoding /WinAnsiEncoding >>';
    objects[boldFontId - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Courier-Bold /Encoding /WinAnsiEncoding >>';
    for (let page = 0; page < pageCount; page++) {
      const pageId = reserve();
      const contentId = reserve();
      pageIds.push(pageId);
      const pageLines = lines.slice(page * perPage, (page + 1) * perPage);
      const commands: string[] = [];
      pageLines.forEach((line, i) => {
        commands.push(`BT /${line.bold ? 'F2' : 'F1'} 9 Tf 42 ${748 - i * 13} Td (${pdfEscape(line.text)}) Tj ET`);
      });
      commands.push(`BT /F1 8 Tf 42 35 Td (Page ${page + 1} of ${pageCount}) Tj ET`);
      const stream = commands.join('\n') + '\n';
      objects[contentId - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
      objects[pageId - 1] = `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${regularFontId} 0 R /F2 ${boldFontId} 0 R >> >> /Contents ${contentId} 0 R >>`;
    }
    objects[pagesId - 1] = `<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageCount} >>`;
    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    let pdf = '%PDF-1.4\n';
    const offsets = [0];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (const offset of offsets.slice(1)) pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xref}\n%%EOF`;
    const url = URL.createObjectURL(new Blob([pdf], { type: 'application/pdf' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'Bus_Transfer_FAT_SAT_Report.pdf';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  // Bay Engineering Editor form state
  const [newBayVoltage, setNewBayVoltage] = useState<33 | 11>(11);
  const [newBayBus, setNewBayBus] = useState<'A' | 'B'>('A');
  const [newBayName, setNewBayName] = useState<string>('Industrial Feeder Extension');
  const [newBayMw, setNewBayMw] = useState<number>(2.5);
  const [newBayMvar, setNewBayMvar] = useState<number>(0.8);
  const [newBayVendor, setNewBayVendor] = useState<VendorName>('ABB / Hitachi Energy');

  const [compactView, setCompactView] = useState<boolean>(() => (typeof window !== 'undefined' ? window.innerWidth < 1200 : false));
  const [fullscreenSld, setFullscreenSld] = useState<boolean>(false);
  const [clockText, setClockText] = useState<string>('12:57:24');
  const [telemetryTimeText, setTelemetryTimeText] = useState<string>('11:30:05');

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const hh = String(now.getHours()).padStart(2, '0');
      const mm = String(now.getMinutes()).padStart(2, '0');
      const ss = String(now.getSeconds()).padStart(2, '0');
      setClockText(`${hh}:${mm}:${ss}`);
      setTelemetryTimeText(`${hh}:${mm}`);
    };
    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  // Theme colors — Argon Dark SCADA Palette (#080E18 to #0D1625)
  const themeStyles = useMemo(() => {
    if (sldTheme === 'LIGHT_DRAWING') {
      return {
        canvasBg: '#F8FAFC',
        gridMinor: '#E2E8F0',
        gridMajor: '#CBD5E1',
        textPrimary: '#0F172A',
        textMuted: '#475569',
        cardBg: '#FFFFFF',
        bus132Live: '#ed3b42',
        bus33Live: '#18bd48',
        bus11Live: '#d3aa00',
        deadStroke: '#94A3B8',
      };
    }
    if (sldTheme === 'HIGH_CONTRAST_HMI') {
      return {
        canvasBg: 'rgba(12, 46, 70, 0.72)',
        gridMinor: '#111C2D',
        gridMajor: '#1B2D48',
        textPrimary: '#FFFFFF',
        textMuted: '#64748B',
        cardBg: '#0D1829',
        bus132Live: '#ed3b42',
        bus33Live: '#18bd48',
        bus11Live: '#d3aa00',
        deadStroke: '#334155',
      };
    }
    return {
      canvasBg: 'rgba(12, 46, 70, 0.72)',
      gridMinor: '#101D30',
      gridMajor: '#162840',
      textPrimary: '#E8F3FF',
      textMuted: '#52667A',
      cardBg: '#101E33',
      bus132Live: '#ed3b42',
      bus33Live: '#18bd48',
      bus11Live: '#d3aa00',
      deadStroke: '#334458',
    };
  }, [sldTheme]);

  // Group bays by section for deterministic SVG coordinates
  const bay33BusA = bays.filter(
    (b) => b.voltageKv === 33 && b.busSection === 'A' && (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'DIST_TX_FEEDER')
  );
  const bay33BusB = bays.filter(
    (b) => b.voltageKv === 33 && b.busSection === 'B' && (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'DIST_TX_FEEDER')
  );
  const bay11BusA = bays.filter(
    (b) => b.voltageKv === 11 && b.busSection === 'A' && (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'SPARE_FEEDER')
  );
  const bay11BusB = bays.filter(
    (b) => b.voltageKv === 11 && b.busSection === 'B' && (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'SPARE_FEEDER')
  );

  // Render incoming 132 kV line bays from the live engineering store, not a
  // fixed list of L1/L2 IDs. Reserved transformer columns are kept clear.
  const bay132IncomingA = bays.filter(b => b.voltageKv === 132 && b.busSection === 'A' &&
    (b.bayType === 'LINE_INCOMER' || String(b.bayType) === 'INCOMING_FEEDER' || b.id === 'BAY-132-L1'));
  const bay132IncomingB = bays.filter(b => b.voltageKv === 132 && b.busSection === 'B' &&
    (b.bayType === 'LINE_INCOMER' || String(b.bayType) === 'INCOMING_FEEDER' || b.id === 'BAY-132-L2'));
  // Available slots avoid the 132/33 kV transformer drops and bus coupler.
  const incoming132SlotsA = [215, 130, 300, 65, 355];
  const incoming132SlotsB = [985, 1070, 900, 1135, 835];
  // Preserve all existing equipment coordinates. Extra Bus A bays extend left;
  // extra Bus B bays extend right. No bay is dropped or compressed as counts grow.
  const extra132A = Math.max(0, bay132IncomingA.length - incoming132SlotsA.length);
  const extra132B = Math.max(0, bay132IncomingB.length - incoming132SlotsB.length);
  const extra33A = Math.max(0, bay33BusA.filter(b => b.bayCode !== '33-TF1').length - 3);
  const extra33B = Math.max(0, bay33BusB.filter(b => b.bayCode !== '33-TF2').length - 3);
  const extra11A = Math.max(0, bay11BusA.length - 5);
  const extra11B = Math.max(0, bay11BusB.length - 4);
  const leftExtension = Math.max(extra132A, extra33A, extra11A) * 105;
  const rightExtension = Math.max(extra132B, extra33B, extra11B) * 105;
  const sldCanvasWidth = 1200 + leftExtension + rightExtension;
  const sldViewBoxX = -leftExtension;
  const sldScrollRef = useRef<HTMLDivElement>(null);
  const sldInitialScrollSet = useRef(false);
  useEffect(() => {
    const viewport = sldScrollRef.current;
    if (!viewport || sldInitialScrollSet.current) return;
    // Open at the familiar original SLD area even if Bus A has extensions.
    viewport.scrollLeft = leftExtension * zoom;
    sldInitialScrollSet.current = true;
  }, [leftExtension, zoom]);
  const scrollSld = (direction: number) => {
    sldScrollRef.current?.scrollBy({ left: direction * 340, behavior: 'smooth' });
  };

  const bus132A = busbars.find((b) => b.id === 'BUS-132-A')!;
  const bus132B = busbars.find((b) => b.id === 'BUS-132-B')!;
  const bus33A = busbars.find((b) => b.id === 'BUS-33-A')!;
  const bus33B = busbars.find((b) => b.id === 'BUS-33-B')!;
  const bus11A = busbars.find((b) => b.id === 'BUS-11-A')!;
  const bus11B = busbars.find((b) => b.id === 'BUS-11-B')!;

  const txT1 = transformers.find((t) => t.id === 'TX-T1')!;
  const txT2 = transformers.find((t) => t.id === 'TX-T2')!;
  const txDt1 = transformers.find((t) => t.id === 'TX-DT1')!;
  const txDt2 = transformers.find((t) => t.id === 'TX-DT2')!;

  const matchesSearch = (bay: BayEquipment) => {
    if (voltageFilter !== 'ALL' && bay.voltageKv !== voltageFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      bay.bayCode.toLowerCase().includes(q) ||
      bay.name.toLowerCase().includes(q) ||
      bay.breakerId.toLowerCase().includes(q) ||
      bay.iedId.toLowerCase().includes(q)
    );
  };

  const warningAlarmCount = alarms.filter((a) => a.state !== 'CLEARED' && (a.severity === 'WARNING' || a.severity === 'MINOR')).length;
  const criticalAlarmCount = alarms.filter((a) => a.state !== 'CLEARED' && (a.severity === 'CRITICAL' || a.severity === 'MAJOR')).length;

  /**
   * 3D Metallic Beveled Circuit Breaker Symbol ([X]) matching reference image:
   * - CLOSED: Bright Crimson Red (#FF2A4B) inner cross & glowing red border
   * - OPEN: Bright Neon Green (#00E676) inner cross & glowing green border
   */
  // Compact electrical schematic CB symbol, matching the SCADA/HMI operator SLD.
  const renderCircuitBreakerBox = (bay: BayEquipment, cx: number, cy: number, size = 18) => {
    const closed = bay.breakerState === 'CLOSED';
    const color = bay.protectionTripActive ? '#ff6871' : closed ? '#f04450' : '#20d775';
    return (
      <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); inspectSldBay(bay.id); }}>
        <title>{`${bay.breakerId}: ${bay.breakerState} — click for Bay Details`}</title>
        <rect x={cx - size / 2} y={cy - size / 2} width={size} height={size}
          fill={closed ? '#f04450' : '#09263a'} stroke={color} strokeWidth={1.6} />
        {!closed && <path d={`M${cx-size/2+3} ${cy-size/2+3} L${cx+size/2-3} ${cy+size/2-3} M${cx+size/2-3} ${cy-size/2+3} L${cx-size/2+3} ${cy+size/2-3}`}
          stroke={color} strokeWidth={1.5} fill="none" />}
        {bay.protectionTripActive && <circle cx={cx + size/2 + 4} cy={cy - size/2} r={3} fill="#ff6871" />}
      </g>
    );
  };

  /**
   * Two-dot hinge Isolator / Disconnector + CT Ring + Ground Switch indicator
   */
  // Q1 disconnector and Q8 earthing switch in the primary SCADA reference style.
  // All symbols retain their original bay selection and dynamic store states.
  const renderIsolatorAndCt = (
    bay: BayEquipment, x: number, yTop: number, yBottom: number,
    liveColor: string, showCt = true
  ) => {
    const closed = bay.busDisconnectorState === 'CLOSED';
    const earthClosed = bay.earthSwitchState === 'CLOSED';
    const hasFixedEs = earthingFor(bay) === 'FIXED_ES';
    const color = bay.energized ? liveColor : themeStyles.deadStroke;
    return (
      <g className="cursor-pointer" onClick={(e) => { e.stopPropagation(); inspectSldBay(bay.id); }}>
        <title>{`${bay.bayCode} Q1: ${bay.busDisconnectorState}; Earthing: ${earthingFor(bay)}${hasFixedEs ? `; Q8: ${bay.earthSwitchState}` : ''}`}</title>
        <circle cx={x} cy={yTop} r={2} fill={color} />
        <circle cx={x} cy={yTop + 9} r={2} fill={color} />
        <line x1={x} y1={yTop + 9} x2={closed ? x : x + 9} y2={yTop + (closed ? 0 : 1)} stroke={color} strokeWidth={1.5} />
        <text x={x + 10} y={yTop + 3} fill="#c6d8e9" fontSize="6.5">Q1</text>
        {showCt && hasFixedEs && <>
          <line x1={x} y1={yBottom - 5} x2={x + 11} y2={yBottom - 5} stroke="#c6d8e9" strokeWidth={1.1} />
          <line x1={x + 11} y1={yBottom - 5} x2={x + (earthClosed ? 11 : 17)} y2={yBottom + (earthClosed ? 3 : -1)} stroke="#c6d8e9" strokeWidth={1.1} />
          <line x1={x + 11} y1={yBottom + 4} x2={x + 23} y2={yBottom + 4} stroke="#c6d8e9" strokeWidth={1.1} />
          <line x1={x + 14} y1={yBottom + 7} x2={x + 20} y2={yBottom + 7} stroke="#c6d8e9" strokeWidth={1.1} />
          <line x1={x + 16} y1={yBottom + 10} x2={x + 18} y2={yBottom + 10} stroke="#c6d8e9" strokeWidth={1.1} />
          <text x={x + 23} y={yBottom - 8} fill="#c6d8e9" fontSize="6.5">Q8</text>
        </>}
      </g>
    );
  };

  /**
   * Reusable Vertical Bay Renderer (Incomers, Transformer Bays, and Outgoing Feeders)
   */
  // Direction indicators are based on the sign of the simulated bay MW reading.
  // They are hidden when the path is open/dead or the reading is effectively zero.
  // Positive MW is displayed from source to load (downward) for both incoming and outgoing vertical bays.
  // Negative MW reverses the arrow. This is a training-model sign convention, not metered direction verification.
  const renderPowerFlowArrow = (
    x: number, y: number, downward: boolean, color: string, key?: string
  ) => (
    <g key={key} pointerEvents="none" aria-hidden="true">
      <path
        d={downward
          ? `M ${x - 3.2} ${y - 3.5} L ${x} ${y + 2.5} L ${x + 3.2} ${y - 3.5}`
          : `M ${x - 3.2} ${y + 3.5} L ${x} ${y - 2.5} L ${x + 3.2} ${y + 3.5}`}
        fill="none" stroke={color} strokeWidth={1.8}
        strokeLinecap="round" strokeLinejoin="round"
      />
    </g>
  );

  // Boxed bus section nameplates matching the operator's SCADA reference.
  const renderBusNameplate = (x: number, y: number, width: number, label: string) => (
    <g pointerEvents="none">
      <rect x={x} y={y} width={width} height={28} rx={5}
        fill={themeStyles.canvasBg} fillOpacity={0.98}
        stroke={sldTheme === 'LIGHT_DRAWING' ? '#64748b' : '#9eb7d1'} strokeWidth={1} />
      <text x={x + width / 2} y={y + 17.5} textAnchor="middle"
        fill={themeStyles.textPrimary} fontSize={10} fontWeight="bold">{label}</text>
    </g>
  );

  const renderVerticalBay = (
    bay: BayEquipment,
    x: number,
    yBus: number,
    yEnd: number,
    direction: 'DOWN_FROM_BUS' | 'INTO_BUS_FROM_TOP',
    tierColor: string,
    options?: {
      showTelemetryCard?: boolean;
      dashedHighlight?: boolean;
      customLabel?: string;
    }
  ) => {
    const isSelected = inspectedBayId === bay.id;
    const isHighlighted = matchesSearch(bay);
    const opacity = isHighlighted ? 1 : 0.25;
    const isEnergized =
      bay.energized && bay.breakerState === 'CLOSED' && bay.busDisconnectorState === 'CLOSED';
    const lineCol = isEnergized ? tierColor : themeStyles.deadStroke;
    const glowFilter =
      !isEnergized
        ? undefined
        : tierColor === '#00D2FF'
        ? 'url(#glowCyan)'
        : tierColor === '#00E676'
        ? 'url(#glowGreen)'
        : 'url(#glowAmber)';

    const topY = Math.min(yBus, yEnd);
    const botY = Math.max(yBus, yEnd);
    // Keep the breaker close to its busbar; lengthen only the outgoing conductor.
    const cbY = direction === 'INTO_BUS_FROM_TOP' ? topY + 30 : topY + 30;
    const ctY = cbY + 23;
    // Outgoing feeder IDs sit ABOVE the busbar, not on top of CB/CT symbols.
    // Transformer-connected bay nameplates must not cover winding symbols or ratings.
    const is132TransformerBay = /^132-T[12]$/.test(bay.bayCode);
    const is33Incomer = /^33-INC[12]$/.test(bay.bayCode);
    const is11Incomer = /^11-INC[12]$/.test(bay.bayCode);
    const labelY = is132TransformerBay ? 175
      : is33Incomer ? 280
      : is11Incomer ? 464
      : direction === 'INTO_BUS_FROM_TOP' ? topY - 11
      : bay.bayCode.startsWith('33-TF') ? yBus - 9 : botY + 21;
    // Put transformer-bay tags beside the vertical conductor, leaving the windings clear.
    const labelX = (is132TransformerBay || is33Incomer || is11Incomer)
      ? x + (x < 600 ? -65 : 65)
      : x;
    const displayCode = options?.customLabel || bay.bayCode;

    return (
      <g
        key={bay.id}
        data-sld-bay={bay.id}
        opacity={opacity}
        onClick={() => inspectSldBay(bay.id)}
        className="cursor-pointer"
      >
        {/* Dashed selection or supervision box (e.g. around 11-INC1 as in reference image) */}
        {isSelected && (
          <rect
            x={x - 36}
            y={topY - 8}
            width={72}
            height={botY - topY + (options?.showTelemetryCard ? 54 : 18)}
            rx={6}
            fill="rgba(0, 210, 255, 0.05)"
            stroke="#00D2FF"
            strokeWidth={1.3}
            strokeDasharray="4 3"
          />
        )}

        {/* Upper Conductor Segment */}
        <line
          x1={x}
          y1={direction === 'INTO_BUS_FROM_TOP' ? topY + 9 : yBus}
          x2={x}
          y2={cbY - 8}
          stroke={lineCol}
          strokeWidth={1.8}
          
        />

        {/* Lower Conductor Segment */}
        <line
          x1={x}
          y1={cbY + 8}
          x2={x}
          y2={botY}
          stroke={lineCol}
          strokeWidth={1.8}
          
        />

        {/* Power-flow arrow at the line terminal. For 132 kV incoming bays,
            retain the conductor between the terminal arrow and Q0 breaker. */}
        {isEnergized && Math.abs(bay.activePowerMw) > 0.05 &&
          renderPowerFlowArrow(
            x,
            direction === 'INTO_BUS_FROM_TOP' ? topY + 6 : botY - 8,
            bay.activePowerMw > 0,
            tierColor
          )}

        {/* Isolator & CT Symbol */}
        {renderIsolatorAndCt(
          bay,
          x,
          direction === 'INTO_BUS_FROM_TOP' ? cbY + 11 : yBus + 5,
          ctY,
          tierColor,
          true
        )}

        {/* Optional Q2 line-side disconnector. This is a visual engineering
            symbol, not a controllable or verified live apparatus state. */}
        {q2For(bay) !== 'NOT_INSTALLED' && direction === 'DOWN_FROM_BUS' &&
          (bay.bayType === 'OUTGOING_FEEDER' || bay.bayType === 'SPARE_FEEDER') && (() => {
            const q2Y = cbY + 26;
            const q2Closed = q2For(bay) === 'CLOSED';
            return <g pointerEvents="none">
              <circle cx={x} cy={q2Y - 4} r={1.6} fill="#dbeafe" />
              <circle cx={x} cy={q2Y + 5} r={1.6} fill="#dbeafe" />
              <line x1={x} y1={q2Y - 4} x2={q2Closed ? x : x + 9}
                y2={q2Closed ? q2Y + 5 : q2Y + 1} stroke="#dbeafe" strokeWidth={1.5} />
              <text x={x - 10} y={q2Y + 3} fontSize="7" textAnchor="end" fill="#dbeafe">Q2</text>
            </g>;
          })()}

        {/* Circuit Breaker [X] Box */}
        {renderCircuitBreakerBox(bay, x, cbY, 16)}
        <text x={x + 11} y={cbY + 2} fontSize="6.5" fill="#c6d8e9">Q0</text>

        {/* Reference-style outlined terminal nameplate; no label over breaker symbols. */}
        <rect
          x={labelX - 27}
          y={labelY - 11}
          width={54}
          height={16}
          rx={3}
          fill={themeStyles.canvasBg}
          fillOpacity={0.98}
          stroke={sldTheme === 'LIGHT_DRAWING' ? '#64748b' : '#a7bacf'}
          strokeWidth={0.85}
        />
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fill="#F1F8FF"
          fontSize="9.5"
          fontWeight="bold"
          fontFamily="Inter, ui-sans-serif, system-ui"
        >
          {displayCode}
        </text>

        {/* Cable Termination Arrow at Feeder Bottom */}
        {options?.showTelemetryCard && (
          <polygon
            points={`${x},${botY + 5} ${x - 4.5},${botY - 3} ${x + 4.5},${botY - 3}`}
            fill={lineCol}
          />
        )}

        {/* Semi-Transparent Telemetry Badge (#101E33) */}
        {options?.showTelemetryCard && (
          <g transform={`translate(${x - 39}, ${botY + 8})`}>
            <rect
              width={78}
              height={34}
              rx={5}
              fill="#101E33"
              fillOpacity={0.92}
              stroke={
                isSelected
                  ? '#00D2FF'
                  : isEnergized
                  ? tierColor === '#00E676'
                    ? '#1C5D52'
                    : '#264B6E'
                  : '#223042'
              }
              strokeWidth={isSelected ? 1.6 : 1.1}
            />
            <text
              x={39}
              y={14}
              textAnchor="middle"
              fill={isEnergized ? '#00D2FF' : '#64748B'}
              fontSize="9.5"
              fontWeight="bold"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            >
              {bay.activePowerMw.toFixed(1)} MW
            </text>
            <text
              x={39}
              y={27}
              textAnchor="middle"
              fill={isEnergized ? '#7CE8A6' : '#64748B'}
              fontSize="8.5"
              fontWeight="bold"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
            >
              {bay.currentA.toFixed(0)}A • {bay.localRemote === 'REMOTE' ? 'REM' : 'LOC'}
            </text>
          </g>
        )}
      </g>
    );
  };

  /**
   * Center Bus Coupler Renderer (CB-132, CB-33, CB-11) with [OPEN | CLOSED] pills on 132 kV
   * and CILO: 2/3 LOCK indicator below
   */
  const renderBusCoupler = (
    bayId: string,
    cx: number,
    cy: number,
    tierColor: string,
    showOpenClosedPills = false
  ) => {
    const bay = bays.find((b) => b.id === bayId);
    if (!bay) return null;
    const isClosed = bay.breakerState === 'CLOSED';

    return (
      <g key={bay.id} data-sld-bay={bay.id}>
        {/* Horizontal Coupler Bus Links + Two-Dot Isolator Terminals */}
        <line
          x1={cx - 56}
          y1={cy}
          x2={cx - 15}
          y2={cy}
          stroke={isClosed ? tierColor : '#3A506B'}
          strokeWidth={1.8}
        />
        <line
          x1={cx + 15}
          y1={cy}
          x2={cx + 56}
          y2={cy}
          stroke={isClosed ? tierColor : '#3A506B'}
          strokeWidth={1.8}
        />
        <circle cx={cx - 32} cy={cy} r={2.3} fill={tierColor} />
        <circle cx={cx + 32} cy={cy} r={2.3} fill={tierColor} />

        {/* [OPEN | CLOSED] Segmented Control Pills on 132 kV Bus Ends */}
        {showOpenClosedPills && (
          <>
            {/* Left Pill */}
            <g
              className="cursor-pointer"
              transform={`translate(${cx - 128}, ${cy - 24})`}
              onClick={(e) => { e.stopPropagation(); inspectSldBay(bay.id); }}
            >
              <rect width={72} height={17} rx={3.5} fill="#091728" stroke="#1E496D" strokeWidth={1} />
              <rect
                x={isClosed ? 34 : 1}
                y={1}
                width={isClosed ? 37 : 33}
                height={15}
                rx={2.5}
                fill={isClosed ? '#3B0D18' : '#083826'}
                stroke={isClosed ? '#FF2A4B' : '#00E676'}
                strokeWidth={0.9}
              />
              <text x={17} y={11.5} textAnchor="middle" fill={!isClosed ? '#00E676' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                OPEN
              </text>
              <text x={52} y={11.5} textAnchor="middle" fill={isClosed ? '#FF4D62' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                CLOSED
              </text>
            </g>

            {/* Right Pill */}
            <g
              className="cursor-pointer"
              transform={`translate(${cx + 56}, ${cy - 24})`}
              onClick={(e) => { e.stopPropagation(); inspectSldBay(bay.id); }}
            >
              <rect width={72} height={17} rx={3.5} fill="#091728" stroke="#1E496D" strokeWidth={1} />
              <rect
                x={isClosed ? 34 : 1}
                y={1}
                width={isClosed ? 37 : 33}
                height={15}
                rx={2.5}
                fill={isClosed ? '#3B0D18' : '#083826'}
                stroke={isClosed ? '#FF2A4B' : '#00E676'}
                strokeWidth={0.9}
              />
              <text x={17} y={11.5} textAnchor="middle" fill={!isClosed ? '#00E676' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                OPEN
              </text>
              <text x={52} y={11.5} textAnchor="middle" fill={isClosed ? '#FF4D62' : '#7C99B4'} fontSize="7.5" fontWeight="bold" fontFamily="monospace">
                CLOSED
              </text>
            </g>
          </>
        )}

        {/* Center Breaker [X] Box */}
        {renderCircuitBreakerBox(bay, cx, cy, 18)}

        {/* Coupler Title Above */}
        <text
          x={cx}
          y={cy - 20}
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="10.5"
          fontWeight="bold"
        >
          {bay.bayCode} ({bay.breakerState})
        </text>

        {/* CILO Status Below */}
        <text
          x={cx}
          y={cy + 26}
          textAnchor="middle"
          fill={bay.interlockPermissive ? '#00E676' : '#FFAB00'}
          fontSize="8.5"
          fontWeight="bold"
          fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        >
          {bay.interlockPermissive ? 'CILO: OK' : 'CILO: 2/3 LOCK'}
        </text>
      </g>
    );
  };

  /**
   * Interlocking Dual-Circle Power Transformer (TX-T1 & TX-T2) with Neon Core & Argon Telemetry Cards
   */
  // Compact dual-winding transformer: no decorative gauges obstructing the SLD.
  const renderMainPowerTransformer = (tx: typeof txT1, cx: number, cy: number, side: 'LEFT' | 'RIGHT') => {
    const live = tx.energized;
    return (
      <g key={tx.id}>
        {live && Math.abs(tx.activePowerMw) > 0.05 &&
          renderPowerFlowArrow(cx, cy + 43, tx.activePowerMw > 0, '#18bd48')}
        <circle cx={cx - 8} cy={cy - 7} r={16} fill="none" stroke={live ? '#e2b900' : themeStyles.deadStroke} strokeWidth={2.3} />
        <circle cx={cx + 8} cy={cy + 7} r={16} fill="none" stroke={live ? '#18bd48' : themeStyles.deadStroke} strokeWidth={2.3} />
        <text x={cx + (side === 'LEFT' ? 30 : -30)} y={cy - 10} textAnchor={side === 'LEFT' ? 'start' : 'end'} fill="#e9f3ff" fontSize="10" fontWeight="bold">{tx.id} · 132/33 kV</text>
        <text x={cx + (side === 'LEFT' ? 30 : -30)} y={cy + 4} textAnchor={side === 'LEFT' ? 'start' : 'end'} fill="#b8cde2" fontSize="9">50 MVA · {tx.loadPercent.toFixed(1)}% · {tx.activePowerMw.toFixed(1)} MW</text>
      </g>
    );
  };

  const handleCreateBay = (e: React.FormEvent) => {
    e.preventDefault();
    addConfigurableFeederBay({
      voltageKv: newBayVoltage,
      busSection: newBayBus,
      name: newBayName,
      nominalLoadMw: newBayMw,
      nominalLoadMvar: newBayMvar,
      vendor: newBayVendor,
    });
    setShowBayEditor(false);
  };

  return (
    <div
      className={`space-y-4 ${
        fullscreenSld
          ? 'fixed inset-0 z-50 bg-[#060B14] overflow-y-auto p-3 sm:p-5'
          : ''
      }`}
    >
      {bayManagerOpen && createPortal(
        (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#010713]/85 p-3 backdrop-blur-[5px] sm:p-6"
          role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setBayManagerOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="bay-manager-dialog-title"
            className="flex max-h-[88vh] w-full max-w-[970px] flex-col overflow-hidden rounded-2xl border-2 border-[#00E5FF] bg-[#031423] shadow-[0_0_8px_#00E5FF,0_0_25px_rgba(0,229,255,0.65)]">
            <header className="flex shrink-0 items-center justify-between gap-3 border-b border-cyan-900/70 bg-[#071D32] px-5 py-3">
              <div className="flex items-center gap-3">
                <Settings2 className="h-7 w-7 rounded-full text-[#00E5FF]" />
                <div><h2 id="bay-manager-dialog-title" className="text-lg font-extrabold text-white">Bay Configuration Manager</h2>
                  <p className="text-xs text-slate-400">Create, edit, delete and manage substation bays in the current workspace.</p></div>
              </div>
              <span className="hidden rounded-md border border-[#16799b] px-3 py-1.5 text-xs font-bold text-[#44e9ff] sm:inline-flex"><Layers className="mr-1.5 h-4 w-4"/> Workspace: 132/33/11 kV Main</span>
              <button type="button" aria-label="Close Bay Configuration Manager" onClick={() => setBayManagerOpen(false)}
                className="rounded-lg border border-cyan-800 p-2 text-slate-200 hover:bg-[#12334C] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"><X className="h-5 w-5" /></button>
            </header>
            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4"><BayConfigurationManager /></div>
            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-cyan-900/70 bg-[#071D32] px-5 py-3">
              <span className="text-[11px] text-slate-400">Training simulation only — configuration changes may not appear in fixed-layout SLD/3D views</span>
              <button type="button" onClick={() => setBayManagerOpen(false)} className="rounded-lg border border-cyan-700 px-4 py-1.5 text-sm text-slate-100 hover:bg-[#12334C]">Close</button>
            </footer>
          </section>
        </div>
      )
        , document.body
      )}
      {show3DModel && createPortal(
        <React.Suspense fallback={
          <div role="dialog" aria-modal="true" aria-label="3D Digital Twin" className="fixed inset-0 z-[9999] grid place-items-center bg-[#010611]/90">
            <div className="rounded-xl border border-cyan-900 bg-[#061829] p-6 text-center text-cyan-100">
              <p role="status">Loading 3D view…</p>
              <button type="button" className="mt-4 rounded border border-cyan-600 px-3 py-1.5" onClick={() => setShow3DModel(false)}>Close</button>
            </div>
          </div>
        }>
          <Substation3DScene
            initialFullscreen
            onCloseFullscreen={() => setShow3DModel(false)}
          />
        </React.Suspense>,
        document.body
      )}

      {/* Compact operator workspace: existing simulation components remain mounted across tabs. */}
      <div className="sticky top-0 z-20 rounded-xl border border-cyan-700/60 bg-[#06192c]/95 p-2 shadow-lg backdrop-blur-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 px-2 pb-2">
          <h2 className="text-sm font-extrabold tracking-wide text-cyan-100">132 / 33 / 11 kV — SCADA / HMI Workspace</h2>
          <div className="flex gap-2 text-[11px]"><span className="rounded border border-green-700 bg-green-950/40 px-2 py-1 text-green-400">System Online</span><span className="rounded border border-amber-700 bg-amber-950/40 px-2 py-1 text-amber-300">Alarms: {alarms.length}</span></div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1" role="tablist" aria-label="SLD workspace modules">
          {([['SLD','Main SLD'],['MFM','MFM Metering'],['TRANSFER','Bus Transfer'],['FAT','FAT / SAT Tests'],['ENGINEERING','Engineering & Control'],['PROTOCOLS','Communication Profile']] as const).map(([tab,label]) => (
            <button key={tab} type="button" role="tab" aria-selected={workspaceTab === tab} onClick={() => selectWorkspaceTab(tab)} className={`shrink-0 rounded-lg border px-3 py-2 text-xs font-bold transition ${workspaceTab === tab ? 'border-cyan-300 bg-cyan-400 text-[#031321]' : 'border-cyan-800 bg-[#0b263e] text-cyan-100 hover:border-cyan-400'}`}>{label}</button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-cyan-500/70 bg-gradient-to-r from-[#062440] to-[#061326] px-3 py-2 shadow-[0_0_16px_rgba(0,207,255,0.12)]">
        <div className="flex items-center gap-2 font-bold text-cyan-100"><Zap className="text-cyan-400" size={20}/>132 / 33 / 11 kV Substation — SCADA / HMI</div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="rounded-md border border-green-600 bg-green-950/70 px-2 py-1 text-green-400"><ShieldCheck className="mr-1 inline" size={13}/>{busbars.every(bus => bus.energized) ? 'System Healthy' : 'Check Bus Status'}</span>
          <span className="rounded-md border border-red-700 bg-red-950/60 px-2 py-1 text-red-300"><AlertTriangle className="mr-1 inline" size={13}/>Active Alarms: {alarms.length}</span>
          <span className="text-cyan-300">Bus Transfer:</span>
          {(['AUTO','MANUAL'] as const).map(mode => <button type="button" key={mode} onClick={() => { ([132,33,11] as const).forEach(level => setVoltageBusTransferMode(level, mode)); }} className={`rounded border px-2 py-1 ${busTransferModes[132] === mode ? 'border-cyan-400 bg-cyan-500 text-slate-950' : 'border-cyan-800 bg-[#0b2038] text-cyan-200'}`}>{mode}</button>)}
          <button type="button" onClick={() => setWorkspaceTab('TRANSFER')} className="rounded border border-cyan-400 bg-[#0a3655] px-2 py-1 text-cyan-100">Request Transfer</button>
        </div>
      </div>
      <div className="grid min-w-0 grid-cols-1 items-start gap-3 xl:grid-cols-[210px_minmax(0,1fr)_255px] 2xl:grid-cols-[235px_minmax(0,1fr)_280px]">
        <aside className="space-y-3 xl:sticky xl:top-28" aria-label="SCADA navigation and substation summary">
          <section className="rounded-xl border border-cyan-500/70 bg-[#061a30] p-2.5 shadow-[0_0_12px_rgba(0,207,255,.10)]">
            <h3 className="mb-2 border-b border-cyan-800 pb-2 text-sm font-bold text-white">Navigation</h3>
            {([['SLD','Main SLD'],['ENGINEERING','Bay Status & Control'],['MFM','Transformer / MFM Monitoring'],['FAT','Alarm & Test Console'],['PROTOCOLS','Reports & Communication']] as const).map(([tab,label],i) => <button key={tab} type="button" onClick={() => setWorkspaceTab(tab)} className={`mb-1 block w-full rounded-md px-2 py-2 text-left text-xs font-semibold ${workspaceTab === tab ? 'bg-cyan-400 text-[#031321]' : 'text-cyan-100 hover:bg-[#10334c]'}`}>{i+1}. {label}</button>)}
          </section>
          <section className="rounded-xl border border-cyan-500/70 bg-[#061a30] p-2.5">
            <h3 className="mb-2 border-b border-cyan-800 pb-2 text-sm font-bold text-white">Substation Summary</h3>
            {([['132 kV Bus A',bus132A],['132 kV Bus B',bus132B],['33 kV Bus A',bus33A],['33 kV Bus B',bus33B],['11 kV Bus A',bus11A],['11 kV Bus B',bus11B]] as const).map(([name,bus]) => <div key={name} className="flex justify-between gap-1 border-b border-cyan-950 py-1.5 text-[11px]"><span className="text-slate-200">{name}</span><strong className={bus.energized ? 'text-green-400' : 'text-red-400'}>{bus.voltageKvLive.toFixed(2)} kV</strong></div>)}
          </section>
          <section className="rounded-xl border border-cyan-500/70 bg-[#061a30] p-2.5">
            <h3 className="mb-2 border-b border-cyan-800 pb-2 text-sm font-bold text-white">Key Status</h3>
            {([['In Service',bays.filter(b => b.quality === 'GOOD').length,'text-green-400'],['Closed CB',bays.filter(b => b.breakerState === 'CLOSED').length,'text-red-400'],['Open CB',bays.filter(b => b.breakerState === 'OPEN').length,'text-green-400'],['Active Alarms',alarms.length,'text-amber-400']] as const).map(([name,count,color]) => <div key={name} className="flex justify-between border-b border-cyan-950 py-1.5 text-xs"><span className="text-slate-200">{name}</span><strong className={color}>{count}</strong></div>)}
          </section>
        </aside>
        <main className="min-w-0 space-y-3" aria-label="Interactive SLD workspace">
      <div style={{display:workspaceTab === 'MFM' ? 'block' : 'none'}}>
        <MultifunctionMeter context="33 kV Incomer – SLD metering" />
      </div>
      <div style={{display:workspaceTab === 'SLD' ? 'block' : 'none'}} className="space-y-3">
      {/* SLD Engineering Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl bg-[#081629] border border-[#1E3A5F]">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bay, CB, or IED..."
              className="pl-8 pr-3 py-1.5 rounded-lg bg-[#030712] border border-slate-700 text-xs text-slate-200 focus:outline-none focus:border-[#00D9FF]"
            />
          </div>

          {/* Voltage Filter */}
          <div className="flex items-center rounded-lg bg-[#030712] p-0.5 border border-slate-800 text-xs">
            {(['ALL', 132, 33, 11] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                onClick={() => setVoltageFilter(v)}
                className={`px-2.5 py-1 rounded-md font-semibold transition ${
                  voltageFilter === v
                    ? 'bg-[#00D9FF] text-slate-950'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {v === 'ALL' ? 'All Levels' : `${v} kV`}
              </button>
            ))}
          </div>

          <button type="button" onClick={() => setBayManagerOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border-2 border-[#00E5FF] bg-[#05263c] px-3 py-1.5 text-xs font-bold text-white shadow-[0_0_12px_rgba(0,229,255,0.35)] transition hover:bg-[#07506A]">
            <Layers className="h-4 w-4" /> Bay Configuration Manager
          </button>

          {/* Configurable Bay Engineering Editor Button */}
          <button
            type="button"
            onClick={() => setShowBayEditor((s) => !s)}
            className="px-3 py-1.5 rounded-lg bg-[#22C55E]/20 hover:bg-[#22C55E]/30 text-[#22C55E] border border-[#22C55E]/40 text-xs font-bold flex items-center gap-1.5"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Bay Engineering Editor (+ Add / Remove Feeder)
          </button>
        </div>

        {/* Zoom, Pan & Drawing Mode Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg bg-[#030712] p-0.5 border border-slate-800 text-xs">
            {(
              [
                ['DARK_CINEMATIC', 'Dark Twin'],
                ['HIGH_CONTRAST_HMI', 'High-Contrast HMI'],
                ['LIGHT_DRAWING', 'CAD Drawing'],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                type="button"
                onClick={() => setSldTheme(mode)}
                className={`px-2.5 py-1 rounded-md font-medium transition ${
                  sldTheme === mode
                    ? 'bg-[#168BFF] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoom((z) => Math.min(1.6, Number((z + 0.12).toFixed(2))))}
              className="p-1.5 rounded bg-[#10243A] text-slate-200 border border-slate-700 hover:border-[#00D9FF]"
              title="Zoom In"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs font-mono text-slate-300 px-1.5">
              {Math.round(zoom * 100)}%
            </span>
            <button
              type="button"
              onClick={() => setZoom((z) => Math.max(0.65, Number((z - 0.12).toFixed(2))))}
              className="p-1.5 rounded bg-[#10243A] text-slate-200 border border-slate-700 hover:border-[#00D9FF]"
              title="Zoom Out"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                setZoom(1.0);
                setPanX(0);
                setPanY(0);
              }}
              className="px-2.5 py-1 rounded bg-[#10243A] text-xs text-slate-200 border border-slate-700 hover:border-[#00D9FF]"
            >
              Fit
            </button>
          </div>
        </div>
      </div>

      {/* Configurable Bay Engineering Editor Drawer */}
      {showBayEditor && (
        <div className="p-4 rounded-xl bg-[#10243A] border border-[#00D9FF] shadow-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#DCEAF5]">
                Configurable Substation Bay Engineering Editor
              </h3>
              <p className="text-xs text-slate-300">
                Commission a new 33 kV or 11 kV feeder bay — automatically instantiates a unique Circuit Breaker,
                Multi-Vendor Protection IED, PRP Network Links, and all 50 IEC 61850 SAS Signals.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowBayEditor(false)}
              className="text-xs text-slate-400 hover:text-white px-2 py-1"
            >
              Close ✕
            </button>
          </div>

          <form onSubmit={handleCreateBay} className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Voltage Level</label>
              <select
                value={newBayVoltage}
                onChange={(e) => setNewBayVoltage(Number(e.target.value) as 33 | 11)}
                className="w-full px-2.5 py-1.5 rounded bg-[#030712] border border-slate-700 text-xs text-white"
              >
                <option value={33}>33 kV Switchgear</option>
                <option value={11}>11 kV Switchgear</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Busbar Section</label>
              <select
                value={newBayBus}
                onChange={(e) => setNewBayBus(e.target.value as 'A' | 'B')}
                className="w-full px-2.5 py-1.5 rounded bg-[#030712] border border-slate-700 text-xs text-white"
              >
                <option value="A">Bus Section A</option>
                <option value="B">Bus Section B</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-[11px] text-slate-300 mb-1">Feeder Description</label>
              <input
                type="text"
                value={newBayName}
                onChange={(e) => setNewBayName(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded bg-[#030712] border border-slate-700 text-xs text-white"
              />
            </div>
            <div>
              <label className="block text-[11px] text-slate-300 mb-1">Load (MW / MVAr)</label>
              <div className="flex gap-1 rounded-lg bg-[#020b17]/70 p-1">
                <input
                  type="number"
                  step="0.1"
                  value={newBayMw}
                  onChange={(e) => setNewBayMw(Number(e.target.value))}
                  className="w-1/2 px-2 py-1.5 rounded bg-[#030712] border border-slate-700 text-xs text-white"
                />
                <input
                  type="number"
                  step="0.1"
                  value={newBayMvar}
                  onChange={(e) => setNewBayMvar(Number(e.target.value))}
                  className="w-1/2 px-2 py-1.5 rounded bg-[#030712] border border-slate-700 text-xs text-white"
                />
              </div>
            </div>
            <div>
              <button
                type="submit"
                className="w-full py-1.5 px-3 rounded bg-[#22C55E] hover:bg-emerald-400 text-slate-950 font-bold text-xs"
              >
                + Commission Bay
              </button>
            </div>
          </form>

          {/* List user-created or spare bays that can be removed */}
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-800">
            <span className="text-[11px] text-slate-400">Remove Feeder Bay:</span>
            {bays
              .filter((b) => b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'SPARE_FEEDER')
              .slice(-6)
              .map((b) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => removeConfigurableFeederBay(b.id)}
                  className="px-2 py-0.5 rounded bg-[#FF4D62]/15 hover:bg-[#FF4D62]/30 text-[#FF4D62] border border-[#FF4D62]/30 text-[11px] flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  {b.bayCode}
                </button>
              ))}
          </div>
        </div>
      )}

      </div>
      <div style={{display:workspaceTab === 'TRANSFER' ? 'block' : 'none'}} className="space-y-3">
      {/* Dead-bus bus-coupler transfer training panel: 132 / 33 / 11 kV */}
      <div className="rounded-2xl border border-cyan-700/50 bg-gradient-to-br from-[#071b30] via-[#081629] to-[#061322] p-4 space-y-3 shadow-[0_0_22px_rgba(0,207,255,0.05)]">
        <div className="flex flex-wrap justify-between items-center gap-2">
          <div>
            <h3 className="text-base font-bold text-cyan-200">Bus Coupler Auto / Manual Transfer — 132 / 33 / 11 kV</h3>
            <p className="text-[11px] text-slate-400">Training simulation: open the incoming source first. Coupler close is allowed only between one live bus and one dead bus, subject to CILO and SCADA permissives.</p>
          </div>
          <span className={`rounded-md border border-cyan-700/50 bg-[#031b2d] px-3 py-1 text-[11px] font-semibold ${busTransferStatus === 'SUCCESS' ? 'text-green-400' : busTransferStatus === 'BLOCKED' ? 'text-amber-400' : 'text-slate-400'}`}>
            {busTransferStatus}
          </span>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {([132, 33, 11] as const).map((level) => {
            const coupler = bays.find((bay) => bay.id === `BAY-${level}-BC`);
            const firstId = level === 132 ? 'BAY-132-L1' : `BAY-${level}-INC1`;
            const secondId = level === 132 ? 'BAY-132-L2' : `BAY-${level}-INC2`;
            const first = bays.find((bay) => bay.id === firstId);
            const second = bays.find((bay) => bay.id === secondId);
            const busA = busbars.find((bus) => bus.id === `BUS-${level}-A`);
            const busB = busbars.find((bus) => bus.id === `BUS-${level}-B`);
            const canTransfer = Boolean(busA && busB && busA.energized !== busB.energized && coupler?.breakerState === 'OPEN');
            return (
              <div key={level} className={`rounded-xl border p-3 space-y-3 shadow-inner ${level === 132 ? "border-cyan-600/60 bg-[#062038]" : level === 33 ? "border-teal-600/60 bg-[#06252c]" : "border-violet-600/50 bg-[#18132e]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-xs text-white">{level} kV • {coupler?.bayCode ?? 'Bus Coupler'}</span>
                  <span className={`text-[11px] font-bold ${coupler?.breakerState === 'CLOSED' ? 'text-green-400' : 'text-amber-400'}`}>
                    {coupler?.breakerState ?? 'UNKNOWN'}
                  </span>
                </div>
                <div className="flex gap-1 rounded-lg bg-[#020b17]/70 p-1">
                  {(['AUTO', 'MANUAL'] as const).map((mode) => (
                    <button key={mode} type="button" onClick={() => setVoltageBusTransferMode(level, mode)}
                      className={`flex-1 rounded px-2 py-1 text-[11px] font-bold border ${busTransferModes[level] === mode ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300' : 'border-slate-700 text-slate-400'}`}>
                      {mode}
                    </button>
                  ))}
                </div>
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span>Source 1: <b className={first?.breakerState === 'CLOSED' ? 'text-green-400' : 'text-amber-400'}>{first?.breakerState}</b></span>
                  <span>Source 2: <b className={second?.breakerState === 'CLOSED' ? 'text-green-400' : 'text-amber-400'}>{second?.breakerState}</b></span>
                </div>
                <div className="flex justify-between text-[10px] text-slate-300">
                  <span>Bus A: <b className={busA?.energized ? 'text-green-400' : 'text-red-400'}>{busA?.energized ? 'LIVE' : 'DEAD'}</b></span>
                  <span>Bus B: <b className={busB?.energized ? 'text-green-400' : 'text-red-400'}>{busB?.energized ? 'LIVE' : 'DEAD'}</b></span>
                </div>
                <div className="grid grid-cols-2 gap-1">
                  <button type="button" disabled={!first || first.breakerState === 'OPEN'}
                    onClick={() => commandBreaker(firstId, 'OPEN')}
                    className="rounded-md border border-slate-600 bg-[#092139] px-2 py-2 text-[11px] font-medium text-slate-100 hover:border-cyan-500 disabled:opacity-40">Open Source 1</button>
                  <button type="button" disabled={!second || second.breakerState === 'OPEN'}
                    onClick={() => commandBreaker(secondId, 'OPEN')}
                    className="rounded-md border border-slate-600 bg-[#092139] px-2 py-2 text-[11px] font-medium text-slate-100 hover:border-cyan-500 disabled:opacity-40">Open Source 2</button>
                  <button type="button" disabled={busTransferModes[level] !== 'MANUAL' || !canTransfer || pendingFeedback !== null}
                    onClick={() => attemptManualCouplerClose(level)}
                    className="rounded-md border border-cyan-500 bg-cyan-900/40 px-2 py-2 text-[11px] font-semibold text-cyan-200 hover:bg-cyan-800/40 disabled:opacity-40">Manual Close Coupler</button>
                  <button type="button" disabled={coupler?.breakerState !== 'CLOSED'}
                    onClick={() => commandBreaker(`BAY-${level}-BC`, 'OPEN')}
                    className="rounded-md border border-amber-600/60 bg-amber-900/20 px-2 py-2 text-[11px] font-semibold text-amber-300 hover:bg-amber-900/40 disabled:opacity-40">Open Coupler</button>
                </div>
                <p className="text-[10px] text-slate-500">{busTransferModes[level] === 'AUTO' ? 'Auto closes after a qualifying source loss.' : 'Operator initiates close after source loss.'}</p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-slate-300" role="status">{busTransferMessage}</p>
        {pendingFeedback !== null && <p role="status" className="text-amber-300 text-xs">Training CLOSE pending at {pendingFeedback} kV: awaiting simulated XCBR1 feedback (2 s timeout).</p>}
        {feedbackAlarm && <p role="alert" className="text-red-400 text-xs">{feedbackAlarm}</p>}
        <div className="rounded-xl border border-cyan-700/60 bg-[#03101e] p-3 space-y-1">
          <div className="flex justify-between items-center text-[11px] font-semibold text-cyan-300">
            <span>Bus Transfer SOE / Alarm Feed (ms resolution)</span>
            <span className="text-amber-300">{alarms.filter((a) => a.signalName.startsWith('ATS ') && a.state !== 'CLEARED').length} active bus-voltage alarms</span>
          </div>
          {negativeEvents.filter(e => e.includes('[TRAINING')).slice(0, 5).map((event, i) => <div key={`training-${i}`} className="text-[10px] font-mono text-amber-300 border-t border-slate-800 pt-1">{event}</div>)}
          {soeLog.filter((entry) => entry.id.startsWith('SOE-ATS-') || entry.id.startsWith('SOE-BT-') || entry.id.startsWith('SOE-CMD-') || entry.id.startsWith('SOE-FB-')).slice(0, 12).map((entry) => (
            <div key={entry.id} className="flex flex-wrap gap-x-2 text-[10px] font-mono text-slate-300 border-t border-slate-800/70 pt-1">
              <span className="text-cyan-400">{new Date(entry.timestampMs).toLocaleTimeString('en-GB', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit', fractionalSecondDigits: 3 } as Intl.DateTimeFormatOptions)}</span>
              <span>{entry.eventDescription}</span>
              <span className="text-slate-500">{entry.valueChange}</span>
            </div>
          ))}
          {!soeLog.some((entry) => entry.id.startsWith('SOE-ATS-') || entry.id.startsWith('SOE-BT-') || entry.id.startsWith('SOE-CMD-') || entry.id.startsWith('SOE-FB-')) && (
            <p className="text-[10px] text-slate-500">No transfer events yet. Open a source in AUTO or MANUAL mode to begin.</p>
          )}
        </div>
        <p className="text-[10px] text-amber-400">Illustrative dead-bus transfer only. Not a real protection relay, ATS controller, synch-check or field switching procedure.</p>
      </div>


      </div>
      <div style={{display:workspaceTab === 'FAT' ? 'block' : 'none'}} className="space-y-3">
      <div className="rounded-lg border border-cyan-800 bg-[#0b2338] px-3 py-2 text-xs text-slate-300">For manual switching during a FAT/SAT test, open <button type="button" onClick={() => setWorkspaceTab('TRANSFER')} className="font-bold text-cyan-300 underline">Bus Transfer</button>. Test state and recorded evidence are retained when switching tabs.</div>
      {/* FAT/SAT bus transfer evidence recorder: explicit start/finish avoids false passes from historic events. */}
      <div className="rounded-2xl border border-cyan-700/50 bg-gradient-to-br from-[#071b30] via-[#081629] to-[#061322] p-4 space-y-3 shadow-[0_0_22px_rgba(0,207,255,0.05)]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-base font-bold text-cyan-200">FAT / SAT — Bus Transfer Test Report</h3>
            <p className="text-[11px] text-slate-400">Start a test, operate the breakers above, then evaluate the captured SOE and final positions. Simulated evidence only.</p>
          </div>
          <button type="button" disabled={!fatResults.length} onClick={downloadFatPdf}
            className="rounded-lg border border-cyan-500/70 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 disabled:opacity-40">Download PDF Report</button>
          <button type="button" disabled={!fatResults.length} onClick={exportFatCsv}
            className="rounded-lg border border-cyan-500/70 bg-cyan-950/40 px-3 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/40 disabled:opacity-40">
            Export CSV Report ({fatResults.length})
          </button>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <select aria-label="Test voltage" disabled={fatStarted !== null} value={fatLevel}
            onChange={e => setFatLevel(Number(e.target.value) as 132 | 33 | 11)}
            className="rounded-lg border border-slate-600 bg-[#030d1d] px-3 py-2 text-xs text-white">
            <option value={132}>132 kV</option><option value={33}>33 kV</option><option value={11}>11 kV</option>
          </select>
          <select aria-label="Test type" disabled={fatStarted !== null} value={fatPhase}
            onChange={e => setFatPhase(e.target.value as 'TRANSFER' | 'RESTORE')}
            className="rounded-lg border border-slate-600 bg-[#030d1d] px-3 py-2 text-xs text-white">
            <option value="TRANSFER">AUTO / Manual Transfer</option>
            <option value="RESTORE">Return to Normal</option>
          </select>
          {fatStarted === null ? (
            <button type="button" onClick={() => { setFatBaselineIds(soeLog.map(e => e.id)); setFatStarted(Date.now()); }}
              className="rounded-lg border border-cyan-400/40 bg-cyan-600 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-500">Start Test &amp; Capture SOE</button>
          ) : (
            <button type="button" onClick={finishFatTest}
              className="rounded-lg border border-green-500 bg-green-700 px-3 py-2 text-xs font-bold text-white">Finish &amp; Evaluate</button>
          )}
          <input aria-label="Operator remarks" placeholder="Operator remarks / observations" value={fatRemarks} onChange={e => setFatRemarks(e.target.value)} className="rounded-lg border border-slate-600 bg-[#030d1d] px-3 py-2 text-xs text-white min-w-56" />
          {fatStarted !== null && <span className="text-xs text-amber-300">RECORDING — {fatLevel} kV {fatPhase}</span>}
        </div>
        <div className="overflow-x-auto rounded-lg border border-cyan-900/50">
          <table className="min-w-full text-[11px] text-left text-slate-300">
            <thead className="bg-[#06243b] text-cyan-300 border-b border-cyan-800/60">
              <tr><th className="p-2">Case</th><th className="p-2">Test</th><th className="p-2">Mode</th><th className="p-2">Expected</th><th className="p-2">Actual</th><th className="p-2">Interruption</th><th className="p-2">Checkpoints / Remarks</th><th className="p-2">Result</th></tr>
            </thead>
            <tbody>
              {fatResults.map(r => (
                <tr key={r.id} className="border-b border-slate-800 align-top">
                  <td className="p-2">{r.caseNumber}</td><td className="p-2 whitespace-nowrap">{r.level} kV {r.phase}</td>
                  <td className="p-2">{r.mode}</td>
                  <td className="p-2 max-w-56">{r.expected}</td>
                  <td className="p-2 max-w-64">{r.actual}</td>
                  <td className="p-2">{r.interruptionMs === null ? "N/A" : `${r.interruptionMs} ms`}</td>
                  <td className="p-2">{r.checkpoints.map(c => <div key={c.label} className={c.passed ? "text-green-400" : "text-red-400"}>{c.passed ? "PASS" : "FAIL"} — {c.label}</div>)}{r.remarks && <div className="text-slate-400">Remarks: {r.remarks}</div>}</td>
                  <td className={`p-2 font-bold ${r.verdict === 'PASS' ? 'text-green-400' : 'text-red-400'}`}>{r.verdict}</td>
                </tr>
              ))}
              {!fatResults.length && <tr><td colSpan={8} className="p-3 text-slate-500">No recorded tests yet. Select a test and press Start Test.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="text-[10px] text-amber-400">PASS verifies ordered simulated command/feedback events and final state only. It does not certify physical relay timing, protection settings, or commissioning acceptance.</p>
      </div>

      {/* Advanced FAT/SAT negative testing, deliberately isolated from operational SLD state. */}
      <div className="rounded-2xl border border-amber-600/60 bg-gradient-to-r from-[#171b23] to-[#091b27] p-4 space-y-3">
        <h3 className="text-base font-bold text-amber-300">Advanced FAT / SAT — Negative Interlocking &amp; Failure Tests</h3>
        <p className="text-[11px] text-slate-400">For NO_FEEDBACK: choose voltage, enable fault, set corresponding coupler to MANUAL, open one source, then click Manual Close Coupler above. A training timeout/alarm and FAT/SAT record are generated without changing the real simulation store. Other scenarios remain isolated.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-300">Voltage: {fatLevel} kV (select above)</span>
          <select aria-label="Negative test scenario" value={negativeScenario} onChange={e => { setNegativeScenario(e.target.value as typeof negativeScenario); setNegativeFaultActive(false); }}
            className="rounded-lg border border-slate-600 bg-[#030d1d] px-3 py-2 text-xs text-white">
            <option value="INTERLOCK">CILO anti-paralleling interlock</option>
            <option value="NO_FEEDBACK">Breaker CLOSE feedback timeout</option>
            <option value="DEAD_BUS">Dead-bus voltage permissive failure</option>
            <option value="SYNCH_CHECK">ANSI 25 synch-check failure</option>
          </select>
          <label className="flex items-center gap-2 text-xs text-amber-300">
            <input type="checkbox" checked={negativeFaultActive} onChange={e => setNegativeFaultActive(e.target.checked)} /> Enable simulated fault
          </label>
          <button type="button" onClick={resetFeedbackFault} className="rounded-lg border border-rose-500 bg-rose-950/30 px-3 py-2 text-xs text-rose-300 hover:bg-rose-900/30">Reset Fault / Clear Training Alarm</button>
          <button type="button" disabled={fatStarted !== null} onClick={runNegativeTest}
            className="rounded-lg border border-amber-500 bg-amber-900/30 px-3 py-2 text-xs font-semibold text-amber-200 hover:bg-amber-900/50 disabled:opacity-40">Run Isolated Negative Test &amp; Record</button>
          <button type="button" disabled={recoveryPending || fatStarted !== null || pendingFeedback !== null || negativeScenario !== 'NO_FEEDBACK'}
            onClick={runFeedbackRecovery}
            className="rounded-lg border border-green-500 bg-green-900/20 px-3 py-2 text-xs font-semibold text-green-300 hover:bg-green-900/40 disabled:opacity-40">
            {recoveryPending ? 'Evaluating Recovery...' : 'Run Recovery Test & Record'}
          </button>
        </div>
        {recoveryMessage && <p role="status" className="text-[11px] text-cyan-300">{recoveryMessage}</p>}
        {negativeEvents.length > 0 && <div className="rounded border border-slate-700 bg-[#030712] p-2 space-y-1">
          <div className="text-[11px] font-semibold text-cyan-300">Simulated Negative Test Evidence</div>
          {negativeEvents.slice(0, 5).map((entry, index) => <p key={index} className="text-[10px] font-mono text-slate-300 break-words">{entry}</p>)}
        </div>}
        <div className="flex flex-wrap gap-4 text-xs">
          <span className="text-green-400">PASS: {fatResults.filter(r => r.verdict === 'PASS').length}</span>
          <span className="text-red-400">FAIL: {fatResults.filter(r => r.verdict === 'FAIL').length}</span>
          <span className="text-slate-300">Recorded: {fatResults.length}</span>
        </div>
      </div>


      </div>
      <div style={{display:workspaceTab === 'SLD' ? 'block' : 'none'}} className="space-y-3">
      {/* ==================== HERO 132 / 33 / 11 kV INTERACTIVE SINGLE-LINE DIAGRAM ==================== */}
      <div
        className="w-full min-w-0 rounded-2xl border-2 border-[#1E3B5E] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(0,210,255,0.05)] relative"
        style={{
          background: 'radial-gradient(ellipse 62% 44% at 50% 38%, rgba(28, 92, 126, 0.74) 0%, rgba(14, 52, 78, 0.86) 58%, rgba(10, 38, 58, 0.92) 100%)',
        }}
      >
        {/* 1. TOP NAVIGATION & TELEMETRY HEADER BAR */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-b border-[#1C3654] bg-gradient-to-r from-[#091526] via-[#0D1F36] to-[#091526] px-4 py-2.5">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#00D2FF] shadow-[0_0_8px_#00D2FF]" />
            <h2 className="text-xs sm:text-sm md:text-[15px] font-extrabold tracking-wider text-[#E8F3FF] uppercase">
              132 / 33 / 11 kV — INTERACTIVE SINGLE-LINE DIAGRAM
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
            {/* TIME Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0A1729] border border-[#1E3A5A] text-[#9CC2E3]">
              <Clock className="w-3.5 h-3.5 text-[#00D2FF]" />
              <span>TIME {clockText.slice(0, 5)}</span>
            </div>

            {/* TELEMETRY Timestamp Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0A1729] border border-[#1E3A5A] text-[#9CC2E3]">
              <span>TELEMETRY {telemetryTimeText}</span>
            </div>

            {/* SYSTEM STATUS Healthy Pill Badge */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#062C1E] border border-[#00E676]/70 text-[#00E676] font-bold shadow-[0_0_10px_rgba(0,230,118,0.18)]">
              <Wifi className="w-3.5 h-3.5" />
              <span>STATUS {bus132A.energized && bus132B.energized ? '0' : '1'}</span>
            </div>

            {/* Amber ALERTS Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#2B1F08] border border-[#FFAB00]/60 text-[#FFAB00] font-bold">
              <span>☀ ALERTS {warningAlarmCount}</span>
            </div>

            {/* Crimson Red ALERTS Pill */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#330C17] border border-[#FF2A4B]/70 text-[#FF4D62] font-bold">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>ALERTS {criticalAlarmCount}</span>

            </div>

            {/* COMPACT VIEW / FULLSCREEN Toggle Button */}
            <button
              type="button"
              onClick={() => setCompactView((v) => !v)}
              className="px-3 py-1 rounded-md border border-[#00D2FF]/60 bg-[#0D2640] text-[11px] font-sans font-bold text-[#BCE6FF] hover:bg-[#133558] transition"
            >
              {compactView ? 'EXPANDED VIEW' : 'COMPACT VIEW'}
            </button>

            <button
              type="button"
              onClick={() => setFullscreenSld((f) => !f)}
              title={fullscreenSld ? 'Exit Fullscreen' : 'Fullscreen SLD'}
              className="p-1.5 rounded-md border border-[#1E3A5A] bg-[#0A1729] text-[#9CC2E3] hover:text-white hover:border-[#00D2FF]"
            >
              {fullscreenSld ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 2. INTERACTIVE THREE-TIER SVG SINGLE-LINE DIAGRAM CANVAS */}
        <div className="flex w-full min-w-0 items-stretch">
        <div
          ref={sldScrollRef}
          onWheel={(event) => {
            if (event.shiftKey && sldScrollRef.current) {
              event.preventDefault();
              sldScrollRef.current.scrollLeft += event.deltaY + event.deltaX;
            }
          }}
          className={`w-full min-w-0 overflow-x-auto overscroll-contain ${
            compactView ? 'max-h-[520px] overflow-y-auto' : ''
          }`}
        >
          <svg
            viewBox={`${sldViewBoxX} 0 ${sldCanvasWidth} 690`}
            className={`block h-auto select-none ${compactView && zoom <= 1 ? 'w-full max-w-full' : 'max-w-none'}`}
            style={
              compactView && zoom <= 1
                ? { width: '100%', minWidth: 0 }
                : { width: `${sldCanvasWidth * zoom}px`, minWidth: `${sldCanvasWidth * zoom}px` }
            }
          >
            <defs>
              {/* Engineering Millimeter Grid Pattern (20px minor + 100px major) */}
              <pattern id="sldMinorGrid" width="20" height="20" patternUnits="userSpaceOnUse">
                <path
                  d="M 20 0 L 0 0 0 20"
                  fill="none"
                  stroke={themeStyles.gridMinor}
                  strokeWidth="0.6"
                />
              </pattern>
              <pattern id="sldMajorGrid" width="100" height="100" patternUnits="userSpaceOnUse">
                <rect width="100" height="100" fill="url(#sldMinorGrid)" />
                <path
                  d="M 100 0 L 0 0 0 100"
                  fill="none"
                  stroke={themeStyles.gridMajor}
                  strokeWidth="1.0"
                />
              </pattern>

              {/* 3D Metallic Bevel Gradient for Circuit Breaker Housing */}
              <linearGradient id="cbFrameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B4D63" />
                <stop offset="50%" stopColor="#1E2B3C" />
                <stop offset="100%" stopColor="#0E1622" />
              </linearGradient>

              {/* Radial Core Aura for 50 MVA Transformers */}
              <radialGradient id="txCoreAura" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#00D2FF" stopOpacity="0.35" />
                <stop offset="55%" stopColor="#00E676" stopOpacity="0.14" />
                <stop offset="100%" stopColor="#080E18" stopOpacity="0" />
              </radialGradient>

              {/* Neon Glow Filters for 132 kV Cyan, 33 kV Green, and 11 kV Amber Busbars */}
              <filter id="glowCyan" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1300" height="900">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowGreen" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1300" height="900">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="glowAmber" filterUnits="userSpaceOnUse" x="-50" y="-50" width="1300" height="900">
                <feGaussianBlur stdDeviation="2.5" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Millimeter Grid Background */}
            <rect x={sldViewBoxX} width={sldCanvasWidth} height="690" fill={themeStyles.canvasBg} />

            {/* ==================== TIER 1: 132 kV TRANSMISSION SWITCHYARD ==================== */}
            <text
              x="600"
              y="24"
              textAnchor="middle"
              fill="#f1f8ff"
              fontSize="15"
              fontWeight="bold"
              letterSpacing="0.04em"
            >
              132 / 33 / 11 kV SUBSTATION — SINGLE LINE DIAGRAM
            </text>

            <g pointerEvents="none" aria-label="Power-flow arrow legend">
              {renderPowerFlowArrow(1060, 22, true, '#d9f8ff')}
              <text x="1072" y="25" fontSize="9" fill="#c7d9e8">MW FLOW</text>
            </g>

            {/* Dynamic 132 kV incoming line bays. Editing, adding or deleting
                a configured bay updates the SVG directly from store.bays. */}
            {bay132IncomingA.map((bay, index) =>
              renderVerticalBay(bay, index < incoming132SlotsA.length ? incoming132SlotsA[index] : -55 - (index - incoming132SlotsA.length) * 105, 116, 45,
                'INTO_BUS_FROM_TOP', themeStyles.bus132Live))}
            {bay132IncomingB.map((bay, index) =>
              renderVerticalBay(bay, index < incoming132SlotsB.length ? incoming132SlotsB[index] : 1255 + (index - incoming132SlotsB.length) * 105, 116, 45,
                'INTO_BUS_FROM_TOP', themeStyles.bus132Live))}


            {/* 132 kV BUS SECTION A (Cyan #00D2FF, 4.5px stroke + glow) */}
            <line
              x1={48 - leftExtension}
              y1="116"
              x2="544"
              y2="116"
              stroke={bus132A.energized ? themeStyles.bus132Live : themeStyles.deadStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {renderBusNameplate(48, 126, 245, `132 kV BUS SECTION A (${bus132A.voltageKvLive.toFixed(1)} kV / ${bus132A.frequencyHz.toFixed(2)} Hz)`)}

            {/* 132 kV BUS SECTION B (Cyan #00D2FF, 4.5px stroke + glow) */}
            <line
              x1="656"
              y1="116"
              x2={1152 + rightExtension}
              y2="116"
              stroke={bus132B.energized ? themeStyles.bus132Live : themeStyles.deadStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Center Bus Coupler CB-132 at (600, 148) with [OPEN | CLOSED] segmented pills */}
            {renderBusCoupler('BAY-132-BC', 600, 116, themeStyles.bus132Live, false)}

            {/* 132 kV Transformer Incomer Bays: 132-T1 (X=382) & 132-T2 (X=818) */}
            {bays.find((b) => b.id === 'BAY-132-T1') &&
              renderVerticalBay(
                bays.find((b) => b.id === 'BAY-132-T1')!,
                382,
                116,
                190,
                'DOWN_FROM_BUS',
                themeStyles.bus132Live
              )}
            {bays.find((b) => b.id === 'BAY-132-T2') &&
              renderVerticalBay(
                bays.find((b) => b.id === 'BAY-132-T2')!,
                818,
                116,
                190,
                'DOWN_FROM_BUS',
                themeStyles.bus132Live
              )}

            {/* Power Transformers TX-T1 (X=382, Y=262) & TX-T2 (X=818, Y=262) + Telemetry Overlay Cards */}
            {renderMainPowerTransformer(txT1, 382, 212, 'LEFT')}
            {renderMainPowerTransformer(txT2, 818, 212, 'RIGHT')}

            {/* ==================== TIER 2: 33 kV DISTRIBUTION SECTION ==================== */}
            {/* 33 kV Incomers: 33-INC1 (X=382) & 33-INC2 (X=818) */}
            {bays.find((b) => b.id === 'BAY-33-INC1') &&
              renderVerticalBay(
                bays.find((b) => b.id === 'BAY-33-INC1')!,
                382,
                314,
                238,
                'INTO_BUS_FROM_TOP',
                themeStyles.bus33Live
              )}
            {bays.find((b) => b.id === 'BAY-33-INC2') &&
              renderVerticalBay(
                bays.find((b) => b.id === 'BAY-33-INC2')!,
                818,
                314,
                238,
                'INTO_BUS_FROM_TOP',
                themeStyles.bus33Live
              )}

            {/* 33 kV BUS SECTION A (Electric Lime Green #00E676, 4.5px stroke + glow) */}
            <line
              x1={42 - leftExtension}
              y1="314"
              x2="544"
              y2="314"
              stroke={bus33A.energized ? themeStyles.bus33Live : themeStyles.deadStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {renderBusNameplate(48, 277, 210, `33 kV BUS SECTION A (${bus33A.voltageKvLive.toFixed(2)} kV)`)}

            {/* 33 kV BUS SECTION B (Electric Lime Green #00E676, 4.5px stroke + glow) */}
            <line
              x1="656"
              y1="314"
              x2={1158 + rightExtension}
              y2="314"
              stroke={bus33B.energized ? themeStyles.bus33Live : themeStyles.deadStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Center Bus Coupler CB-33 at (600, 372) */}
            {renderBusCoupler('BAY-33-BC', 600, 314, themeStyles.bus33Live, false)}

            {/* 33 kV Bus A Outgoing Feeders (33-F01, 33-F02, 33-F03, 33-TF1) */}
            {bay33BusA.map((bay, idx) => {
              const regular = bay33BusA.filter(b => b.bayCode !== '33-TF1');
              const bx = bay.bayCode === '33-TF1' ? 431 : regular.indexOf(bay) < 3 ? 75 + regular.indexOf(bay) * 145 : -55 - (regular.indexOf(bay) - 3) * 105;
              return renderVerticalBay(bay, bx, 314, bay.bayCode === '33-TF1' || bay.bayCode === '33-TF2' ? 400 : 370, 'DOWN_FROM_BUS', themeStyles.bus33Live, {
                showTelemetryCard: false,
              });
            })}

            {/* 33 kV Bus B Outgoing Feeders (33-F04, 33-F05, 33-F06, 33-TF2) */}
            {bay33BusB.map((bay, idx) => {
              const regular = bay33BusB.filter(b => b.bayCode !== '33-TF2');
              const bx = bay.bayCode === '33-TF2' ? 769 : regular.indexOf(bay) < 3 ? 865 + regular.indexOf(bay) * 130 : 1255 + (regular.indexOf(bay) - 3) * 105;
              return renderVerticalBay(bay, bx, 314, bay.bayCode === '33-TF1' || bay.bayCode === '33-TF2' ? 400 : 370, 'DOWN_FROM_BUS', themeStyles.bus33Live, {
                showTelemetryCard: false,
              });
            })}

            {/* ==================== TIER 3: 33/11 kV STEP-DOWN TRANSFORMERS & 11 kV SWITCHGEAR BOARD ==================== */}
            {[
              { tx: txDt1, x: 431, y: 427, incId: 'BAY-11-INC1', dashed: true },
              { tx: txDt2, x: 769, y: 427, incId: 'BAY-11-INC2', dashed: false },
            ].map(({ tx, x, y, incId, dashed }) => {
              const hvCol = tx.energized ? themeStyles.bus33Live : themeStyles.deadStroke;
              const lvCol = tx.energized ? themeStyles.bus11Live : themeStyles.deadStroke;
              const incBay = bays.find((b) => b.id === incId);
              return (
                <g key={tx.id}>
                  {/* Continuous HV connection from 33 kV transformer feeder to HV winding. */}
                  <line x1={x} y1={400} x2={x} y2={y - 18.5} stroke={hvCol} strokeWidth={1.8} />
                  {/* Interlocking Dual-Circle 33/11 kV Step-Down Transformer */}
                  <circle
                    cx={x}
                    cy={y - 7}
                    r={11.5}
                    fill="#091526"
                    stroke={hvCol}
                    strokeWidth={2.4}
                    filter={tx.energized ? 'url(#glowGreen)' : undefined}
                  />
                  <circle
                    cx={x}
                    cy={y + 7}
                    r={11.5}
                    fill="#091526"
                    stroke={lvCol}
                    strokeWidth={2.4}
                    filter={tx.energized ? 'url(#glowAmber)' : undefined}
                  />
                  <text
                    x={x + (x < 600 ? -24 : 24)}
                    y={y - 13}
                    textAnchor={x < 600 ? 'end' : 'start'}
                    fill="#E8F3FF"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {tx.id} · 33/11 kV · 16 MVA
                  </text>
                  {tx.energized && Math.abs(tx.activePowerMw) > 0.05 &&
                    renderPowerFlowArrow(x, y + 30, tx.activePowerMw > 0, themeStyles.bus11Live)}
                  {incBay &&
                    renderVerticalBay(
                      incBay,
                      x,
                      532,
                      y + 15,
                      'INTO_BUS_FROM_TOP',
                      themeStyles.bus11Live,
                      { dashedHighlight: dashed }
                    )}
                </g>
              );
            })}

            {/* 11 kV SWITCHGEAR BUS A (Warm Amber #FFAB00, 4.5px stroke + glow) */}
            <line
              x1={42 - leftExtension}
              y1="532"
              x2="544"
              y2="532"
              stroke={bus11A.energized ? themeStyles.bus11Live : themeStyles.deadStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />
            {renderBusNameplate(48, 492, 250, `11 kV SWITCHGEAR BUS A (${bus11A.voltageKvLive.toFixed(2)} kV)`)}

            {/* 11 kV SWITCHGEAR BUS B (Warm Amber #FFAB00, 4.5px stroke + glow) */}
            <line
              x1="656"
              y1="532"
              x2={1158 + rightExtension}
              y2="532"
              stroke={bus11B.energized ? themeStyles.bus11Live : themeStyles.deadStroke}
              strokeWidth="1.8"
              strokeLinecap="round"
            />

            {/* Center Bus Coupler CB-11 at (600, 642) */}
            {renderBusCoupler('BAY-11-BC', 600, 532, themeStyles.bus11Live, false)}

            {/* 11 kV Bus A Outgoing Feeders (11-F01, 11-F02, 11-F03, 11-F04, 11-SP1 + User Added) */}
            {bay11BusA.map((bay, idx) => {
              const bx = idx < 5 ? 66 + idx * (385 / 4) : -55 - (idx - 5) * 105;
              return renderVerticalBay(bay, bx, 532, 604, 'DOWN_FROM_BUS', themeStyles.bus11Live, {
                showTelemetryCard: false,
              });
            })}

            {/* 11 kV Bus B Outgoing Feeders (11-F05, 11-F06, 11-F07, 11-F08 + User Added) */}
            {bay11BusB.map((bay, idx) => {
              const bx = idx < 4 ? 685 + idx * (365 / 3) : 1255 + (idx - 4) * 105;
              return renderVerticalBay(bay, bx, 532, 604, 'DOWN_FROM_BUS', themeStyles.bus11Live, {
                showTelemetryCard: false,
              });
            })}
          </svg>
        </div>
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-1.5 border-t border-[#18324E] bg-[#071525] text-[11px] text-slate-300">
          <span>SLD horizontal scroll · Shift + mouse wheel · {Math.round(sldCanvasWidth)} canvas units</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => scrollSld(-1)} className="rounded border border-[#27516C] px-3 py-1 hover:bg-[#15334A]">← Left</button>
            <button type="button" onClick={() => scrollSld(1)} className="rounded border border-[#27516C] px-3 py-1 hover:bg-[#15334A]">Right →</button>
          </div>
        </div>

        {/* 3. SLD FOOTER & TRANSFORMER OLTC QUICK BAR */}
        <div className="px-4 py-2.5 bg-[#07111F] border-t border-[#18324E] flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-4">
            {transformers.slice(0, 2).map((tx) => (
              <div key={tx.id} className="flex items-center gap-2">
                <span className="font-bold text-[#DCEAF5]">{tx.id} OLTC (YLTC1):</span>
                <button
                  type="button"
                  onClick={() => stepTransformerOltc(tx.id, 'LOWER')}
                  className="px-2 py-0.5 rounded bg-[#10243A] hover:bg-slate-700 border border-slate-600 text-slate-200"
                >
                  - Lower
                </button>
                <span className="font-mono text-[#00D2FF] font-bold">Tap {tx.oltcTapPosition}</span>
                <button
                  type="button"
                  onClick={() => stepTransformerOltc(tx.id, 'RAISE')}
                  className="px-2 py-0.5 rounded bg-[#10243A] hover:bg-slate-700 border border-slate-600 text-slate-200"
                >
                  + Raise
                </button>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3 text-[11px] text-[#9CC2E3]">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#2B0912] border border-[#FF2A4B] inline-block" />
              <strong className="text-[#FF4D62]">CLOSED</strong>
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-[#05291A] border border-[#00E676] inline-block" />
              <strong className="text-[#00E676]">OPEN</strong>
            </span>
            <span className="text-slate-400">
              • Click any Breaker or Bay on the SLD to select &amp; operate via Selected Bay Control below
            </span>
          </div>
        </div>
      </div>

      </div>
      <div style={{display:workspaceTab === 'ENGINEERING' ? 'block' : 'none'}} className="space-y-3">
      {/* Compact full-width bay control area immediately below the SLD */}
      <section className="w-full min-w-0 rounded-xl border-2 border-cyan-400/80 bg-[#041627] p-2 sm:p-3 shadow-[0_0_18px_rgba(0,217,255,0.12)]">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 border-b border-cyan-900/70 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-cyan-300" />
            <h3 className="text-sm font-bold text-white">Selected Bay — Engineering &amp; Control</h3>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-cyan-700/60 bg-[#08334a] px-2 py-1 text-[10px] text-cyan-200">IEC 61850 • Bay Inspector</span>
            <button
              type="button"
              onClick={() => setShow3DModel(true)}
              className="inline-flex items-center gap-2 rounded-md border border-cyan-400 bg-[#062c45] px-3 py-1.5 text-xs font-bold text-cyan-100 shadow-[0_0_12px_rgba(0,207,255,0.2)] transition-colors hover:bg-[#095079] focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-300"
              aria-label="Open existing 3D substation model"
            >
              <Box className="h-4 w-4" /> Open 3D Model <Maximize2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="w-full min-w-0 [&>*]:!max-w-none [&>*]:!w-full">
          <BreakerControlDrawer />
        </div>
      </section>

      </div>
      <div style={{display:workspaceTab === 'PROTOCOLS' ? 'block' : 'none'}} className="space-y-3">
      {/* SECTION 2: SLD EQUIPMENT & BAY MULTI-PROTOCOL COMMUNICATION INSPECTOR */}
      {(() => {
        const selectedBay = bays.find((b) => b.id === selectedBayId) || bays[0];
        const bayIdx = Math.max(0, bays.findIndex((b) => b.id === selectedBay.id));
        const proto = getBayProtocolBreakdown(selectedBay, bayIdx);
        return (
          <div
            style={{ backgroundColor: '#061526', borderColor: '#1B4B72' }}
            className="rounded-xl border p-3.5 space-y-2.5 text-xs shadow-lg"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
              <div>
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  Selected SLD Bay Multi-Protocol Communication Profile — {selectedBay.bayCode} ({selectedBay.name})
                </h3>
                <p className="text-[11px] text-[#9BC0DF]">
                  Live protocol sources for breaker status, protection trips, energy metering, RCC telecontrol, and historian archiving on {selectedBay.bayCode}.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5 font-mono text-[10.5px]">
                <span className="px-2 py-0.5 rounded bg-[#08223C] border border-[#00CFFF] text-[#00CFFF] font-bold">
                  IEC 61850 MMS (TCP/102)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#06291E] border border-[#22C55E] text-[#4ADE80] font-bold">
                  GOOSE (0x88B8)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#2B1608] border border-[#F97316] text-[#FDBA74] font-bold">
                  Modbus TCP (502)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#241038] border border-[#A855F7] text-[#D8B4FE] font-bold">
                  IEC-104 (2404)
                </span>
                <span className="px-2 py-0.5 rounded bg-[#0A2246] border border-[#3B82F6] text-[#93C5FD] font-bold">
                  OPC UA (4840)
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-2 font-mono text-[10.5px]">
              <div className="p-2.5 rounded-lg bg-[#04101E] border border-[#00CFFF]/60 space-y-1">
                <div className="font-sans font-extrabold text-[#00CFFF]">{proto.mms.protocol}</div>
                <div className="text-white font-sans font-semibold">Breaker &amp; Bay Status / SBO</div>
                <div className="text-[#77E7FF] break-all">{proto.mms.statusRef}</div>
                <div className="text-[#4ADE80] font-bold">
                  Val: {selectedBay.breakerState} • Q: {selectedBay.quality}
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#04101E] border border-[#22C55E]/60 space-y-1">
                <div className="font-sans font-extrabold text-[#4ADE80]">{proto.goose.protocol}</div>
                <div className="text-white font-sans font-semibold">Protection Trip &amp; Interlock</div>
                <div className="text-[#4ADE80] break-all">{proto.goose.gocbRef}</div>
                <div className="text-slate-300">
                  MAC: {proto.goose.multicastMac} ({proto.goose.appId})
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#04101E] border border-[#F97316]/60 space-y-1">
                <div className="font-sans font-extrabold text-[#FDBA74]">{proto.modbus.protocol}</div>
                <div className="text-white font-sans font-semibold">Feeder Energy Meter</div>
                <div className="text-[#FDBA74]">{proto.modbus.registers}</div>
                <div className="text-[#4ADE80] font-bold">
                  {selectedBay.activePowerMw.toFixed(2)} MW • {selectedBay.voltageAbKv.toFixed(1)} kV
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#04101E] border border-[#A855F7]/60 space-y-1">
                <div className="font-sans font-extrabold text-[#D8B4FE]">{proto.iec104.protocol}</div>
                <div className="text-white font-sans font-semibold">Station Gateway → RCC</div>
                <div className="text-[#D8B4FE]">{proto.iec104.ioaStatus}</div>
                <div className="text-slate-300">{proto.iec104.ioaMeas}</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#04101E] border border-[#3B82F6]/60 space-y-1">
                <div className="font-sans font-extrabold text-[#93C5FD]">{proto.opcUa.protocol}</div>
                <div className="text-white font-sans font-semibold">SCADA → Historian</div>
                <div className="text-[#93C5FD] break-all">{proto.opcUa.nodeIdStatus}</div>
                <div className="text-[#4ADE80]">StatusCode: Good (0x0000)</div>
              </div>

              <div className="p-2.5 rounded-lg bg-[#04101E] border border-[#EAB308]/60 space-y-1">
                <div className="font-sans font-extrabold text-[#FDE047]">{proto.timeSync.protocol}</div>
                <div className="text-white font-sans font-semibold">Time Synchronization</div>
                <div className="text-[#FDE047]">{proto.timeSync.role}</div>
                <div className="text-[#4ADE80] font-bold">Sync: {proto.timeSync.accuracy}</div>
              </div>
            </div>
          </div>
        );
      })()}
      </div>
        </main>
        <aside className="min-w-0 rounded-xl border border-cyan-500/70 bg-[#061a30] p-3 shadow-[0_0_14px_rgba(0,207,255,.12)] xl:sticky xl:top-28" aria-label="Device details inspector" data-sld-device-details="true">
          <div className="mb-3 flex items-center justify-between border-b border-cyan-800 pb-2"><h3 className="font-bold text-cyan-100">Device Details</h3>{inspectedBay && <button type="button" onClick={() => setInspectedBayId(null)} aria-label="Clear selected breaker"><X size={17}/></button>}</div>
        {inspectedBay ? (
          <aside className="space-y-2 text-xs text-slate-100" aria-label="Selected breaker device details">

            <div className="my-3 rounded-lg border border-cyan-900 bg-[#0a253a] p-3">
              <div className="flex justify-between gap-2"><div><strong className="text-base">{inspectedBay.bayCode}</strong><div className="mt-1 text-slate-400">{inspectedBay.name}</div><div className="text-cyan-300">{inspectedBay.voltageKv} kV • Bus {inspectedBay.busSection}</div></div><span className="h-fit rounded border border-green-700 bg-green-950 px-2 py-1 text-green-400">{inspectedBay.quality}</span></div>
            </div>
            <div className="grid grid-cols-3 gap-1 mb-3">
              {(['Overview','Measurements','Protection','IEC 61850','Controls','SOE'] as const).map(tab => <button key={tab} type="button" onClick={() => setDeviceDetailsTab(tab)} className={`rounded border px-1 py-2 text-[10px] ${deviceDetailsTab === tab ? 'border-cyan-400 bg-cyan-500 text-slate-950 font-bold' : 'border-cyan-900 text-cyan-200'}`}>{tab}</button>)}
            </div>
            <div className="rounded-lg border border-cyan-800 bg-[#071728] p-3 space-y-2 max-h-[65vh] overflow-y-auto">
              {deviceDetailsTab === 'Overview' && <>
                <h4 className="font-bold text-cyan-300">Equipment Status</h4>
                {([['Circuit Breaker (Q0)',inspectedBay.breakerState],['Bus Disconnector (Q1)',inspectedBay.busDisconnectorState],['Earth Switch (Q8)',earthingFor(inspectedBay) === 'FIXED_ES' ? inspectedBay.earthSwitchState : 'NOT INSTALLED / UNVERIFIED']] as const).map(([label,value]) => <div key={label} className="flex justify-between gap-2 border-b border-slate-700 py-1"><span>{label}</span><strong className={value === 'CLOSED' ? 'text-green-300' : 'text-amber-300'}>{value}</strong></div>)}
                <div className="mt-3 rounded border border-cyan-800 bg-[#0b2033] p-2 space-y-2">
                  <label htmlFor="sld-earthing-type" className="block font-semibold text-cyan-200">Earthing Arrangement (Training Configuration)</label>
                  <select id="sld-earthing-type" value={earthingFor(inspectedBay)}
                    onChange={e => setEarthingFor(inspectedBay.id, e.target.value as EarthingArrangement)}
                    className="w-full rounded border border-cyan-800 bg-[#061727] p-2 text-xs text-white">
                    <option value="NOT_CONFIGURED">Not Configured / Unverified</option>
                    <option value="FIXED_ES">Fixed Earthing Switch (Q8)</option>
                    <option value="EARTHING_TRUCK">Earthing Truck</option>
                    <option value="PORTABLE_EARTHING">Portable Earthing</option>
                  </select>
                  <p className="text-[10px] text-slate-400">Q8 appears on the SLD only when Fixed ES is selected. This is visual training metadata, not a validated equipment design or switching permission.</p>
                  {earthingFor(inspectedBay) !== 'FIXED_ES' && inspectedBay.earthSwitchState === 'CLOSED' && <p className="text-amber-300">Warning: simulated ES is CLOSED but this bay is not configured with Fixed ES in this view. Verify the actual bay configuration.</p>}
                </div>
                <div className="mt-3 rounded border border-cyan-800 bg-[#0b2033] p-2 space-y-2">
                  <label htmlFor="sld-q2-setting" className="block font-semibold text-cyan-200">Line Disconnector (Q2) — Engineering Layout</label>
                  <select id="sld-q2-setting" value={q2For(inspectedBay)}
                    onChange={e => setQ2Settings(prev => ({ ...prev, [inspectedBay.id]: e.target.value as Q2Setting }))}
                    className="w-full rounded border border-cyan-800 bg-[#061727] p-2 text-xs text-white">
                    <option value="NOT_INSTALLED">Not Installed / Unverified</option>
                    <option value="OPEN">Installed — OPEN (visual only)</option>
                    <option value="CLOSED">Installed — CLOSED (visual only)</option>
                  </select>
                  <div className="flex justify-between gap-2"><span>Line Disconnector (Q2)</span><strong className={q2For(inspectedBay) === 'CLOSED' ? 'text-green-300' : 'text-amber-300'}>{q2For(inspectedBay) === 'NOT_INSTALLED' ? 'NOT INSTALLED / UNVERIFIED' : `${q2For(inspectedBay)} (UNVERIFIED)`}</strong></div>
                  <p className="text-[10px] text-amber-300">Q2 is drawing-only training metadata. It does not provide real telemetry, switching commands, or verified interlocks. Do not infer an electrical switching permission from this selection.</p>
                </div>
                <div>Control Mode: {inspectedBay.localRemote}</div>
                <div>Quality: {inspectedBay.quality}</div>
                <div>Interlock: <strong className={inspectedBay.interlockPermissive ? 'text-green-300' : 'text-amber-300'}>{inspectedBay.interlockPermissive ? 'PERMISSIVE' : 'BLOCKED'}</strong></div>
                <p className="text-slate-400">{inspectedBay.interlockReason || 'No active blocking reason reported.'}</p>
              </>}
              {deviceDetailsTab === 'Measurements' && <>
                <h4 className="font-bold text-cyan-300">Live Simulation Measurements</h4>
                {([['Voltage AB',`${inspectedBay.voltageAbKv.toFixed(2)} kV`],['Current (aggregate)',`${inspectedBay.currentA.toFixed(1)} A`],['Active Power',`${inspectedBay.activePowerMw.toFixed(2)} MW`]] as const).map(([label,value]) => <div key={label} className="flex justify-between gap-2 border-b border-slate-700 py-1"><span>{label}</span><strong>{value}</strong></div>)}
                <p className="text-amber-300">Individual IA/IB/IC, VBC/VCA, MVAr, PF and frequency are not available in this page's current Bay data. No synthetic readings are shown.</p>
                <div>Quality: {inspectedBay.quality}</div>
              </>}
              {deviceDetailsTab === 'Protection' && <>
                <h4 className="font-bold text-cyan-300">Protection Monitoring</h4>
                <div className="flex justify-between"><span>Trip indication</span><strong className={inspectedBay.protectionTripActive ? 'text-red-400' : 'text-green-400'}>{inspectedBay.protectionTripActive ? 'ACTIVE' : 'NOT ACTIVE'}</strong></div>
                <div className="flex justify-between"><span>86 Lockout</span><strong>{inspectedBay.protectionTripActive ? 'CHECK LOCKOUT' : 'READY / NO ACTIVE TRIP'}</strong></div>
                <h5 className="font-semibold text-slate-200 pt-2">Associated protection alarms</h5>
                {alarms.filter(a => a.bayId === inspectedBay.id && a.state !== 'CLEARED').slice(0,8).map(a => <div key={a.id} className="rounded border border-red-900/60 bg-red-950/30 p-2"><strong className="text-red-300">{a.severity}</strong> · {a.signalName} · {a.state}</div>)}
                {!alarms.some(a => a.bayId === inspectedBay.id && a.state !== 'CLEARED') && <p className="text-slate-400">No active bay protection alarms.</p>}
                <p className="text-amber-300">Individual 50/51, 50N/51N, 87T and 50BF states are not exposed by this page's current bay data. See the configured protection simulation for test operations.</p>
              </>}
              {deviceDetailsTab === 'IEC 61850' && <>
                <h4 className="font-bold text-cyan-300">IEC 61850 — Simulated Signals</h4>
                <div>IED: <strong>{inspectedBay.iedId}</strong></div>
                {([['XCBR1.Pos.stVal',inspectedBay.breakerState],['XSWI1.Pos.stVal',inspectedBay.busDisconnectorState],['XSWI (Earth Switch)',earthingFor(inspectedBay) === 'FIXED_ES' ? inspectedBay.earthSwitchState : 'NOT CONFIGURED'],['PTRC1.Tr.general',inspectedBay.protectionTripActive ? 'TRUE' : 'FALSE'],['MMXU1.A (aggregate)',`${inspectedBay.currentA.toFixed(1)} A`],['MMXU1.PPV.phsAB',`${inspectedBay.voltageAbKv.toFixed(2)} kV`]] as const).map(([label,value]) => <div key={label} className="flex justify-between gap-2 border-b border-slate-700 py-1"><span className="break-all">{label}</span><strong className="text-right">{value}</strong></div>)}
                <p>Quality: {inspectedBay.quality}</p>
                <p className="text-slate-400">Logical-node names are illustrative mappings of store fields, not verified CID/SCD object references. Individual timestamps are unavailable here.</p>
              </>}
              {deviceDetailsTab === 'Controls' && <>
                <h4 className="font-bold text-cyan-300">Equipment Controls (Training)</h4>
                <div>Authority: {inspectedBay.localRemote}</div>
                <div>Interlock: {inspectedBay.interlockPermissive ? 'PERMISSIVE' : `BLOCKED — ${inspectedBay.interlockReason || 'Check conditions'}`}</div>
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <button type="button" disabled={inspectedBay.localRemote !== 'REMOTE' || !inspectedBay.interlockPermissive || inspectedBay.protectionTripActive} onClick={() => commandBreaker(inspectedBay.id, 'CLOSED')} className="rounded border border-green-500 bg-green-950 px-2 py-2 font-bold text-green-300 disabled:opacity-40">CB CLOSE</button>
                  <button type="button" disabled={inspectedBay.localRemote !== 'REMOTE'} onClick={() => commandBreaker(inspectedBay.id, 'OPEN')} className="rounded border border-red-500 bg-red-950 px-2 py-2 font-bold text-red-300 disabled:opacity-40">CB OPEN</button>
                </div>
                <div className="rounded border border-amber-800 bg-amber-950/20 p-2 text-amber-200">
                  Earthing: {earthingFor(inspectedBay).replaceAll('_', ' ')}. {earthingFor(inspectedBay) === 'FIXED_ES' ? 'Fixed ES operation must be checked against the configured isolation, absence-of-voltage, backfeed and interlock conditions.' : 'No fixed ES command is offered here. Earthing truck/portable earthing is a procedural maintenance activity, not a remote SCADA command.'}
                </div>
                <p className="text-slate-400">Existing store command/interlock logic is preserved. For DS/ES switching and advanced SBO, use the existing Engineering/Bay Control interface; no unverified control actions were added.</p>
                <button type="button" onClick={() => setWorkspaceTab('ENGINEERING')} className="w-full rounded border border-cyan-700 px-2 py-2 text-cyan-200">Open Engineering Controls</button>
              </>}
              {deviceDetailsTab === 'SOE' && <>
                <h4 className="font-bold text-cyan-300">Bay SOE History</h4>
                {soeLog.filter(e => e.bayId === inspectedBay.id).slice(0,20).map(e => <div key={e.id} className="border-b border-slate-700 py-2"><div className="text-slate-400">{new Date(e.timestampMs).toLocaleString()}</div><div>{e.eventDescription}</div><div className="text-cyan-300">{e.valueChange}</div></div>)}
                {!soeLog.some(e => e.bayId === inspectedBay.id) && <p className="text-slate-400">No SOE events recorded for this bay.</p>}
              </>}
            </div>
          </aside>
        ) : (
          <div className="rounded-lg border border-dashed border-cyan-800/80 bg-[#061727] p-4 text-center text-xs text-slate-400">
            <Box className="mx-auto mb-2 text-cyan-500" size={30} />
            No breaker selected. Click a CB or bay on the diagram to inspect its live signals, interlocks and controls.
          </div>
        )}

          <div className="mt-3 rounded-lg border border-cyan-900 bg-[#071728] p-2.5 text-xs">
            <h4 className="mb-2 font-bold text-cyan-300">IED Information</h4>
            {inspectedBay ? <><div>IED: <strong>{inspectedBay.iedId}</strong></div><div>Protocol: IEC 61850</div><div>Bay: {inspectedBay.bayCode}</div><button type="button" onClick={() => setWorkspaceTab('ENGINEERING')} className="mt-2 w-full rounded border border-cyan-700 px-2 py-1 text-cyan-200 hover:bg-cyan-950">Advanced SBO / Engineering</button></> : <div className="text-slate-400">Select a breaker to view its assigned IED and control details.</div>}
          </div>
        </aside>
      </div>
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <button type="button" onClick={() => setWorkspaceTab('MFM')} className="rounded-xl border border-cyan-600 bg-[#08233a] p-3 text-left text-xs text-cyan-200 hover:bg-[#0c3451]"><strong className="block text-sm text-cyan-300">MFM Metering</strong>Voltage · Current · Power · Energy</button>
        <button type="button" onClick={() => setWorkspaceTab('TRANSFER')} className="rounded-xl border border-green-700 bg-[#092b28] p-3 text-left text-xs text-green-200 hover:bg-[#104338]"><strong className="block text-sm text-green-300">Bus Transfer</strong>132 / 33 / 11 kV · AUTO / MANUAL</button>
        <button type="button" onClick={() => setWorkspaceTab('FAT')} className="rounded-xl border border-amber-700 bg-[#292219] p-3 text-left text-xs text-amber-200 hover:bg-[#3d2b1b]"><strong className="block text-sm text-amber-300">FAT / SAT Tests</strong>SOE · Negative tests · PDF / CSV</button>
      </div>
    </div>
  );
};
