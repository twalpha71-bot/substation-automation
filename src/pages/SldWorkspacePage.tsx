import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { getBayProtocolBreakdown } from '../data/protocolRegistry';
import { BayEquipment, VendorName } from '../types/substation';
import { BreakerControlDrawer } from '../components/BreakerControlDrawer';
import { Substation3DScene } from '../components/Substation3DScene';
import { createPortal } from 'react-dom';
import {
  Filter,
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

export const SldWorkspacePage: React.FC = () => {
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
  } = useSubstationStore();

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

  const [compactView, setCompactView] = useState<boolean>(false);
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
        bus132Live: '#0284C7',
        bus33Live: '#16A34A',
        bus11Live: '#D97706',
        deadStroke: '#94A3B8',
      };
    }
    if (sldTheme === 'HIGH_CONTRAST_HMI') {
      return {
        canvasBg: '#05080F',
        gridMinor: '#111C2D',
        gridMajor: '#1B2D48',
        textPrimary: '#FFFFFF',
        textMuted: '#64748B',
        cardBg: '#0D1829',
        bus132Live: '#00E5FF',
        bus33Live: '#00FF66',
        bus11Live: '#FFC400',
        deadStroke: '#334155',
      };
    }
    return {
      canvasBg: '#09101C',
      gridMinor: '#101D30',
      gridMajor: '#162840',
      textPrimary: '#E8F3FF',
      textMuted: '#52667A',
      cardBg: '#101E33',
      bus132Live: '#00D2FF',
      bus33Live: '#00E676',
      bus11Live: '#FFAB00',
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
  const renderCircuitBreakerBox = (bay: BayEquipment, cx: number, cy: number, size = 28) => {
    const isClosed = bay.breakerState === 'CLOSED';
    const stateColor = isClosed ? '#FF2A4B' : '#00E676';
    const innerBg = isClosed ? '#2B0912' : '#05291A';
    const half = size / 2;
    const innerHalf = half - 3.5;
    const crossHalf = innerHalf - 4.2;

    return (
      <g
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setSelectedBayId(bay.id); }}
      >
        <title>{`${bay.breakerId} (${bay.bayCode}): ${bay.breakerState} — Click to select bay`}</title>
        {/* Outer soft state glow */}
        <rect
          x={cx - half - 2}
          y={cy - half - 2}
          width={size + 4}
          height={size + 4}
          rx={6.5}
          fill="none"
          stroke={stateColor}
          strokeWidth={1.6}
          opacity={0.45}
        />
        {/* Outer 3D metallic beveled housing */}
        <rect
          x={cx - half}
          y={cy - half}
          width={size}
          height={size}
          rx={5.5}
          fill="url(#cbFrameGrad)"
          stroke="#566B84"
          strokeWidth={1.5}
        />
        {/* Inner recessed breaker chamber */}
        <rect
          x={cx - innerHalf}
          y={cy - innerHalf}
          width={innerHalf * 2}
          height={innerHalf * 2}
          rx={3.5}
          fill={innerBg}
          stroke={stateColor}
          strokeWidth={1.8}
        />
        {/* Internal Cross [X] */}
        <line
          x1={cx - crossHalf}
          y1={cy - crossHalf}
          x2={cx + crossHalf}
          y2={cy + crossHalf}
          stroke={isClosed ? '#FF3B58' : '#E2FFF0'}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
        <line
          x1={cx + crossHalf}
          y1={cy - crossHalf}
          x2={cx - crossHalf}
          y2={cy + crossHalf}
          stroke={isClosed ? '#FF3B58' : '#E2FFF0'}
          strokeWidth={2.2}
          strokeLinecap="round"
        />
      </g>
    );
  };

  /**
   * Two-dot hinge Isolator / Disconnector + CT Ring + Ground Switch indicator
   */
  const renderIsolatorAndCt = (
    bay: BayEquipment,
    x: number,
    yTop: number,
    yBottom: number,
    liveColor: string,
    showCt = true
  ) => {
    const isIsoClosed = bay.busDisconnectorState === 'CLOSED';
    const isEnergized = bay.energized && isIsoClosed && bay.breakerState === 'CLOSED';
    const strokeCol = isEnergized ? liveColor : themeStyles.deadStroke;

    return (
      <g
        className="cursor-pointer"
        onClick={(e) => { e.stopPropagation(); setSelectedBayId(bay.id); }}
      >
        <title>{`Isolator ${bay.bayCode}-Q1: ${bay.busDisconnectorState} — Click to select bay`}</title>
        {/* Two-dot hinge isolator */}
        <circle cx={x} cy={yTop} r={2.4} fill={strokeCol} />
        <circle cx={x} cy={yTop + 10} r={2.4} fill={strokeCol} />
        <line
          x1={x}
          y1={yTop + 10}
          x2={isIsoClosed ? x : x - 7}
          y2={yTop + (isIsoClosed ? 0 : 2)}
          stroke={isIsoClosed ? strokeCol : '#00E676'}
          strokeWidth={2}
          strokeLinecap="round"
        />
        {/* CT circular ring with ground/fault indicator */}
        {showCt && (
          <g>
            <circle
              cx={x}
              cy={yBottom}
              r={5.5}
              fill="#091322"
              stroke={strokeCol}
              strokeWidth={1.7}
            />
            <circle cx={x} cy={yBottom - 1.5} r={1.3} fill={strokeCol} />
            <circle cx={x} cy={yBottom + 1.8} r={1.3} fill={strokeCol} />
          </g>
        )}
      </g>
    );
  };

  /**
   * Reusable Vertical Bay Renderer (Incomers, Transformer Bays, and Outgoing Feeders)
   */
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
    const isSelected = selectedBayId === bay.id;
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
    const cbY = direction === 'INTO_BUS_FROM_TOP' ? topY + 24 : topY + 30;
    const ctY = cbY + 21;
    const labelY = direction === 'INTO_BUS_FROM_TOP' ? topY + 4 : topY + 12;
    const displayCode = options?.customLabel || bay.bayCode;

    return (
      <g
        key={bay.id}
        opacity={opacity}
        onClick={() => setSelectedBayId(bay.id)}
        className="cursor-pointer"
      >
        {/* Dashed selection or supervision box (e.g. around 11-INC1 as in reference image) */}
        {(isSelected || options?.dashedHighlight) && (
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
          y1={direction === 'INTO_BUS_FROM_TOP' ? topY + 7 : yBus}
          x2={x}
          y2={cbY - 13}
          stroke={lineCol}
          strokeWidth={2.6}
          filter={glowFilter}
        />

        {/* Lower Conductor Segment */}
        <line
          x1={x}
          y1={cbY + 13}
          x2={x}
          y2={botY}
          stroke={lineCol}
          strokeWidth={2.6}
          filter={glowFilter}
        />

        {/* Isolator & CT Symbol */}
        {renderIsolatorAndCt(
          bay,
          x,
          direction === 'INTO_BUS_FROM_TOP' ? cbY + 15 : yBus + 4,
          ctY,
          tierColor,
          true
        )}

        {/* Circuit Breaker [X] Box */}
        {renderCircuitBreakerBox(bay, x, cbY, 27)}

        {/* Bay Code Label with clean dark backing pill */}
        <rect
          x={x - 21}
          y={labelY - 9.5}
          width={42}
          height={12}
          rx={2.5}
          fill="#080E18"
          fillOpacity={0.88}
        />
        <text
          x={x}
          y={labelY}
          textAnchor="middle"
          fill="#F1F8FF"
          fontSize="10"
          fontWeight="bold"
          fontFamily="Inter, ui-sans-serif, system-ui"
        >
          {displayCode}
        </text>

        {/* Earthing Switch Q8 Symbol (especially visible on 11-SP1 when OPEN/EARTHED) */}
        {(bay.earthSwitchState === 'CLOSED' || bay.id === 'BAY-11-SP1') && (
          <g
            onClick={(e) => {
              e.stopPropagation();
              setSelectedBayId(bay.id);
            }}
          >
            <line x1={x} y1={ctY + 8} x2={x + 14} y2={ctY + 8} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 14} y1={ctY + 8} x2={x + 14} y2={ctY + 13} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 9} y1={ctY + 13} x2={x + 19} y2={ctY + 13} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 11} y1={ctY + 16} x2={x + 17} y2={ctY + 16} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 13} y1={ctY + 19} x2={x + 15} y2={ctY + 19} stroke="#FFAB00" strokeWidth={1.6} />
          </g>
        )}

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
      <g key={bay.id}>
        {/* Horizontal Coupler Bus Links + Two-Dot Isolator Terminals */}
        <line
          x1={cx - 56}
          y1={cy}
          x2={cx - 15}
          y2={cy}
          stroke={isClosed ? tierColor : '#3A506B'}
          strokeWidth={3}
        />
        <line
          x1={cx + 15}
          y1={cy}
          x2={cx + 56}
          y2={cy}
          stroke={isClosed ? tierColor : '#3A506B'}
          strokeWidth={3}
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
              onClick={(e) => { e.stopPropagation(); setSelectedBayId(bay.id); }}
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
              onClick={(e) => { e.stopPropagation(); setSelectedBayId(bay.id); }}
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
        {renderCircuitBreakerBox(bay, cx, cy, 28)}

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
  const renderMainPowerTransformer = (
    tx: typeof txT1,
    cx: number,
    cy: number,
    side: 'LEFT' | 'RIGHT'
  ) => {
    const hvColor = tx.energized ? '#00D2FF' : themeStyles.deadStroke;
    const lvColor = tx.energized ? '#00E676' : themeStyles.deadStroke;
    const gaugeColor = side === 'LEFT' ? '#00D2FF' : '#FFAB00';
    const pct = Math.min(100, Math.max(0, tx.loadPercent));
    const dashLen = (pct / 100) * 88;

    return (
      <g key={tx.id}>
        {/* Soft Radial Neon Aura Behind Transformer Coils */}
        {tx.energized && (
          <circle
            cx={cx}
            cy={cy}
            r={34}
            fill="url(#txCoreAura)"
            pointerEvents="none"
          />
        )}

        {/* Upper HV Winding Circle (132 kV Cyan) */}
        <circle
          cx={cx}
          cy={cy - 9}
          r={15.5}
          fill="#091526"
          stroke={hvColor}
          strokeWidth={2.8}
          filter={tx.energized ? 'url(#glowCyan)' : undefined}
        />

        {/* Lower LV Winding Circle (33 kV Electric Lime Green) */}
        <circle
          cx={cx}
          cy={cy + 10}
          r={15.5}
          fill="#091526"
          stroke={lvColor}
          strokeWidth={2.8}
          filter={tx.energized ? 'url(#glowGreen)' : undefined}
        />

        {/* Diagonal OLTC Tap-Changer Arrow */}
        <line
          x1={cx - 18}
          y1={cy + 18}
          x2={cx + 18}
          y2={cy - 18}
          stroke="#FFAB00"
          strokeWidth={2}
        />
        <polygon
          points={`${cx + 20},${cy - 20} ${cx + 13},${cy - 18} ${cx + 18},${cy - 13}`}
          fill="#FFAB00"
        />

        {/* Glowing Lens-Flare Star at Winding Core Intersection */}
        {tx.energized && (
          <g pointerEvents="none">
            <line x1={cx - 28} y1={cy} x2={cx + 28} y2={cy} stroke="#E0F7FF" strokeWidth={1.2} opacity={0.75} />
            <circle cx={cx} cy={cy} r={3.5} fill="#FFFFFF" filter="url(#glowCyan)" />
          </g>
        )}

        {/* Argon Glassmorphic Telemetry Card + Radial Gauge + Mini Spectrum/Trend Widgets */}
        {side === 'LEFT' ? (
          <g transform={`translate(48, ${cy - 34})`}>
            {/* 1. Mini Spectrum Bar Widget */}
            <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
            <circle cx={18} cy={18} r={9} fill="none" stroke="#00D2FF" strokeWidth={2.2} strokeDasharray="36 18" />
            <rect x={34} y={10} width={24} height={3} rx={1.5} fill="#00D2FF" />
            <rect x={34} y={16} width={18} height={3} rx={1.5} fill="#38BDF8" opacity={0.7} />
            <rect x={34} y={22} width={21} height={3} rx={1.5} fill="#00E676" opacity={0.8} />
            {[10, 15, 22, 18, 25, 19, 14, 24, 20, 16, 12].map((bh, idx) => (
              <rect
                key={idx}
                x={8 + idx * 4.8}
                y={58 - bh * 0.85}
                width={3}
                height={bh * 0.85}
                rx={1}
                fill={idx % 3 === 0 ? '#00D2FF' : '#38BDF8'}
              />
            ))}

            {/* 2. Radial Load Gauge Widget */}
            <g transform="translate(76, 0)">
              <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
              <circle cx={34} cy={34} r={20} fill="none" stroke="#1E344E" strokeWidth={4.5} strokeDasharray="88 40" strokeDashoffset="-20" strokeLinecap="round" />
              <circle
                cx={34}
                cy={34}
                r={20}
                fill="none"
                stroke={gaugeColor}
                strokeWidth={4.5}
                strokeDasharray={`${dashLen} 120`}
                strokeDashoffset="-20"
                strokeLinecap="round"
              />
              <line x1={34} y1={34} x2={44} y2={24} stroke="#E2F2FF" strokeWidth={2} strokeLinecap="round" />
              <circle cx={34} cy={34} r={3} fill="#00D2FF" />
              <text x={34} y={58} textAnchor="middle" fill="#94B8D7" fontSize="8" fontFamily="monospace">
                {tx.loadPercent.toFixed(1)}%
              </text>
            </g>

            {/* 3. Main Transformer Telemetry Overlay Card */}
            <g transform="translate(152, -2)">
              <rect
                x={0}
                y={0}
                width={158}
                height={70}
                rx={7}
                fill="#101E33"
                fillOpacity={0.94}
                stroke="#3B628B"
                strokeWidth={1.4}
              />
              <text x={10} y={16} fill="#FFFFFF" fontSize="10" fontWeight="bold">
                {tx.id}: 132/33kV 50MVA
              </text>
              <text x={10} y={31} fill="#00D2FF" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                Load: {tx.loadPercent.toFixed(1)}% ({tx.activePowerMw.toFixed(1)} MW)
              </text>
              <text x={10} y={45} fill="#00E676" fontSize="9" fontFamily="monospace">
                OTI: {tx.oilTempC}°C  WTI: {tx.windingTempLvC}°C
              </text>
              <text x={10} y={59} fill="#FFAB00" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                OLTC Tap: {tx.oltcTapPosition} ({tx.coolingStage})
              </text>
              {/* Interactive OLTC Raise/Lower Mini Buttons */}
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'LOWER');
                }}
              >
                <rect x={122} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={129} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">-</text>
              </g>
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'RAISE');
                }}
              >
                <rect x={139} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={146} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">+</text>
              </g>
            </g>
          </g>
        ) : (
          <g transform={`translate(${cx + 32}, ${cy - 34})`}>
            {/* 1. Main Transformer Telemetry Overlay Card */}
            <g transform="translate(0, -2)">
              <rect
                x={0}
                y={0}
                width={158}
                height={70}
                rx={7}
                fill="#101E33"
                fillOpacity={0.94}
                stroke="#3B628B"
                strokeWidth={1.4}
              />
              <text x={10} y={16} fill="#FFFFFF" fontSize="10" fontWeight="bold">
                {tx.id}: 132/33kV 50MVA
              </text>
              <text x={10} y={31} fill="#00D2FF" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                Load: {tx.loadPercent.toFixed(0)}% ({tx.activePowerMw.toFixed(1)} MW)
              </text>
              <text x={10} y={45} fill="#00E676" fontSize="9" fontFamily="monospace">
                OTI: {tx.oilTempC}°C  WTI: {tx.windingTempLvC}°C
              </text>
              <text x={10} y={59} fill="#FFAB00" fontSize="9.5" fontWeight="bold" fontFamily="monospace">
                OLTC Tap: {tx.oltcTapPosition} ({tx.coolingStage})
              </text>
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'LOWER');
                }}
              >
                <rect x={122} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={129} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">-</text>
              </g>
              <g
                className="cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  stepTransformerOltc(tx.id, 'RAISE');
                }}
              >
                <rect x={139} y={48} width={14} height={14} rx={3} fill="#0B192C" stroke="#386186" />
                <text x={146} y={58} textAnchor="middle" fill="#E2F2FF" fontSize="10" fontWeight="bold">+</text>
              </g>
            </g>

            {/* 2. Radial Load Gauge Widget */}
            <g transform="translate(166, 0)">
              <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
              <circle cx={34} cy={34} r={20} fill="none" stroke="#1E344E" strokeWidth={4.5} strokeDasharray="88 40" strokeDashoffset="-20" strokeLinecap="round" />
              <circle
                cx={34}
                cy={34}
                r={20}
                fill="none"
                stroke={gaugeColor}
                strokeWidth={4.5}
                strokeDasharray={`${dashLen} 120`}
                strokeDashoffset="-20"
                strokeLinecap="round"
              />
              <line x1={34} y1={34} x2={43} y2={25} stroke="#FDE047" strokeWidth={2} strokeLinecap="round" />
              <circle cx={34} cy={34} r={3} fill="#FFAB00" />
              <text x={34} y={58} textAnchor="middle" fill="#FDE047" fontSize="8" fontFamily="monospace">
                {tx.loadPercent.toFixed(1)}%
              </text>
            </g>

            {/* 3. Mini Area-Trend Widget */}
            <g transform="translate(242, 0)">
              <rect x={0} y={0} width={68} height={66} rx={7} fill="#101E33" fillOpacity={0.9} stroke="#284666" strokeWidth={1.2} />
              <circle cx={18} cy={18} r={9} fill="none" stroke="#FFAB00" strokeWidth={2.2} strokeDasharray="34 18" />
              <rect x={34} y={10} width={24} height={3} rx={1.5} fill="#FFAB00" />
              <rect x={34} y={16} width={18} height={3} rx={1.5} fill="#FDE047" opacity={0.7} />
              <rect x={34} y={22} width={21} height={3} rx={1.5} fill="#00D2FF" opacity={0.8} />
              <path
                d="M 8 54 L 16 48 L 24 50 L 32 42 L 40 45 L 48 39 L 58 43 L 58 58 L 8 58 Z"
                fill="rgba(255, 171, 0, 0.25)"
              />
              <path
                d="M 8 54 L 16 48 L 24 50 L 32 42 L 40 45 L 48 39 L 58 43"
                fill="none"
                stroke="#FFAB00"
                strokeWidth={1.8}
              />
            </g>
          </g>
        )}
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
      {show3DModel && createPortal(
        <Substation3DScene
          initialFullscreen
          onCloseFullscreen={() => setShow3DModel(false)}
        />,
        document.body
      )}

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


      {/* ==================== HERO 132 / 33 / 11 kV INTERACTIVE SINGLE-LINE DIAGRAM ==================== */}
      <div
        className="w-full min-w-0 rounded-2xl border-2 border-[#1E3B5E] overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.85),inset_0_0_40px_rgba(0,210,255,0.05)] relative"
        style={{
          background: 'linear-gradient(180deg, #080E18 0%, #0D1625 50%, #080E18 100%)',
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
              <span>ALERTS { Math.max(1, criticalAlarmCount) }</span>
              <span className="px-1 rounded bg-[#FF2A4B]/25 text-[10px]">-1</span>
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
        <div
          className={`w-full overflow-x-auto overscroll-contain ${
            compactView ? 'max-h-[520px] overflow-y-auto' : ''
          }`}
        >
          <svg
            viewBox="0 0 1200 646"
            className="block w-full min-w-[960px] h-auto select-none"
            style={{
              transform: `scale(${zoom}) translate(${panX}px, ${panY}px)`,
              transformOrigin: 'center top',
            }}
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
            <rect width="1200" height="646" fill="url(#sldMajorGrid)" />

            {/* ==================== TIER 1: 132 kV TRANSMISSION SWITCHYARD ==================== */}
            <text
              x="28"
              y="26"
              fill="#00D2FF"
              fontSize="12.5"
              fontWeight="bold"
              letterSpacing="0.04em"
            >
              132 kV TRANSMISSION SWITCHYARD (DOUBLE-SECTION BUSBAR WITH BUS COUPLER CB-132)
            </text>

            {/* Incoming Line Bays: 132-L1 (X=215) & 132-L2 (X=985) */}
            {bays.find((b) => b.id === 'BAY-132-L1') &&
              renderVerticalBay(
                bays.find((b) => b.id === 'BAY-132-L1')!,
                215,
                116,
                28,
                'INTO_BUS_FROM_TOP',
                themeStyles.bus132Live
              )}
            {bays.find((b) => b.id === 'BAY-132-L2') &&
              renderVerticalBay(
                bays.find((b) => b.id === 'BAY-132-L2')!,
                985,
                116,
                28,
                'INTO_BUS_FROM_TOP',
                themeStyles.bus132Live
              )}

            {/* 132 kV BUS SECTION A (Cyan #00D2FF, 4.5px stroke + glow) */}
            {bus132A.energized && (
              <line
                x1="48"
                y1="116"
                x2="544"
                y2="116"
                stroke="#00D2FF"
                strokeWidth="9"
                opacity="0.22"
              />
            )}
            <line
              x1="48"
              y1="116"
              x2="544"
              y2="116"
              stroke={bus132A.energized ? themeStyles.bus132Live : themeStyles.deadStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              filter={bus132A.energized ? 'url(#glowCyan)' : undefined}
            />
            <text x="82" y="106" fill="#F1F8FF" fontSize="11" fontWeight="bold">
              132 kV BUS SECTION A ({bus132A.voltageKvLive.toFixed(1)} kV • {bus132A.frequencyHz.toFixed(2)} Hz)
            </text>

            {/* 132 kV BUS SECTION B (Cyan #00D2FF, 4.5px stroke + glow) */}
            {bus132B.energized && (
              <line
                x1="656"
                y1="116"
                x2="1152"
                y2="116"
                stroke="#00D2FF"
                strokeWidth="9"
                opacity="0.22"
              />
            )}
            <line
              x1="656"
              y1="116"
              x2="1152"
              y2="116"
              stroke={bus132B.energized ? themeStyles.bus132Live : themeStyles.deadStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              filter={bus132B.energized ? 'url(#glowCyan)' : undefined}
            />
            <text x="825" y="106" fill="#F1F8FF" fontSize="11" fontWeight="bold">
              132 kV BUS SECTION B ({bus132B.voltageKvLive.toFixed(1)} kV • {bus132B.frequencyHz.toFixed(2)} Hz)
            </text>

            {/* Center Bus Coupler CB-132 at (600, 148) with [OPEN | CLOSED] segmented pills */}
            {renderBusCoupler('BAY-132-BC', 600, 116, themeStyles.bus132Live, true)}

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
            {bus33A.energized && (
              <line
                x1="42"
                y1="314"
                x2="544"
                y2="314"
                stroke="#00E676"
                strokeWidth="9"
                opacity="0.20"
              />
            )}
            <line
              x1="42"
              y1="314"
              x2="544"
              y2="314"
              stroke={bus33A.energized ? themeStyles.bus33Live : themeStyles.deadStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              filter={bus33A.energized ? 'url(#glowGreen)' : undefined}
            />
            <text x="48" y="304" fill="#F1F8FF" fontSize="11" fontWeight="bold">
              33 kV BUS SECTION A ({bus33A.voltageKvLive.toFixed(2)} kV)
            </text>

            {/* 33 kV BUS SECTION B (Electric Lime Green #00E676, 4.5px stroke + glow) */}
            {bus33B.energized && (
              <line
                x1="656"
                y1="314"
                x2="1158"
                y2="314"
                stroke="#00E676"
                strokeWidth="9"
                opacity="0.20"
              />
            )}
            <line
              x1="656"
              y1="314"
              x2="1158"
              y2="314"
              stroke={bus33B.energized ? themeStyles.bus33Live : themeStyles.deadStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              filter={bus33B.energized ? 'url(#glowGreen)' : undefined}
            />
            <text x="892" y="304" fill="#F1F8FF" fontSize="11" fontWeight="bold">
              33 kV BUS SECTION B ({bus33B.voltageKvLive.toFixed(2)} kV)
            </text>

            {/* Center Bus Coupler CB-33 at (600, 372) */}
            {renderBusCoupler('BAY-33-BC', 600, 314, themeStyles.bus33Live, false)}

            {/* 33 kV Bus A Outgoing Feeders (33-F01, 33-F02, 33-F03, 33-TF1) */}
            {bay33BusA.map((bay, idx) => {
              const span = 355 / Math.max(1, bay33BusA.length - 1);
              const bx = 76 + idx * span;
              return renderVerticalBay(bay, bx, 314, 386, 'DOWN_FROM_BUS', themeStyles.bus33Live, {
                showTelemetryCard: true,
              });
            })}

            {/* 33 kV Bus B Outgoing Feeders (33-F04, 33-F05, 33-F06, 33-TF2) */}
            {bay33BusB.map((bay, idx) => {
              const span = 365 / Math.max(1, bay33BusB.length - 1);
              const bx = 685 + idx * span;
              return renderVerticalBay(bay, bx, 314, 386, 'DOWN_FROM_BUS', themeStyles.bus33Live, {
                showTelemetryCard: true,
              });
            })}

            {/* ==================== TIER 3: 33/11 kV STEP-DOWN TRANSFORMERS & 11 kV SWITCHGEAR BOARD ==================== */}
            {[
              { tx: txDt1, x: 431, y: 448, incId: 'BAY-11-INC1', dashed: true },
              { tx: txDt2, x: 769, y: 448, incId: 'BAY-11-INC2', dashed: false },
            ].map(({ tx, x, y, incId, dashed }) => {
              const hvCol = tx.energized ? themeStyles.bus33Live : themeStyles.deadStroke;
              const lvCol = tx.energized ? themeStyles.bus11Live : themeStyles.deadStroke;
              const incBay = bays.find((b) => b.id === incId);
              return (
                <g key={tx.id}>
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
                    x={x - 18}
                    y={y + 4}
                    textAnchor="end"
                    fill="#E8F3FF"
                    fontSize="10"
                    fontWeight="bold"
                  >
                    {tx.id} (33/11kV 16MVA - {tx.activePowerMw.toFixed(1)}MW)
                  </text>
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
            {bus11A.energized && (
              <line
                x1="42"
                y1="532"
                x2="544"
                y2="532"
                stroke="#FFAB00"
                strokeWidth="9"
                opacity="0.20"
              />
            )}
            <line
              x1="42"
              y1="532"
              x2="544"
              y2="532"
              stroke={bus11A.energized ? themeStyles.bus11Live : themeStyles.deadStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              filter={bus11A.energized ? 'url(#glowAmber)' : undefined}
            />
            <text x="48" y="522" fill="#F1F8FF" fontSize="11" fontWeight="bold">
              11 kV SWITCHGEAR BUS A ({bus11A.voltageKvLive.toFixed(2)} kV)
            </text>

            {/* 11 kV SWITCHGEAR BUS B (Warm Amber #FFAB00, 4.5px stroke + glow) */}
            {bus11B.energized && (
              <line
                x1="656"
                y1="532"
                x2="1158"
                y2="532"
                stroke="#FFAB00"
                strokeWidth="9"
                opacity="0.20"
              />
            )}
            <line
              x1="656"
              y1="532"
              x2="1158"
              y2="532"
              stroke={bus11B.energized ? themeStyles.bus11Live : themeStyles.deadStroke}
              strokeWidth="4.5"
              strokeLinecap="round"
              filter={bus11B.energized ? 'url(#glowAmber)' : undefined}
            />
            <text x="890" y="522" fill="#F1F8FF" fontSize="11" fontWeight="bold">
              11 kV SWITCHGEAR BUS B ({bus11B.voltageKvLive.toFixed(2)} kV)
            </text>

            {/* Center Bus Coupler CB-11 at (600, 642) */}
            {renderBusCoupler('BAY-11-BC', 600, 532, themeStyles.bus11Live, false)}

            {/* 11 kV Bus A Outgoing Feeders (11-F01, 11-F02, 11-F03, 11-F04, 11-SP1 + User Added) */}
            {bay11BusA.map((bay, idx) => {
              const span = 385 / Math.max(1, bay11BusA.length - 1);
              const bx = 66 + idx * span;
              return renderVerticalBay(bay, bx, 532, 598, 'DOWN_FROM_BUS', themeStyles.bus11Live, {
                showTelemetryCard: true,
              });
            })}

            {/* 11 kV Bus B Outgoing Feeders (11-F05, 11-F06, 11-F07, 11-F08 + User Added) */}
            {bay11BusB.map((bay, idx) => {
              const span = 365 / Math.max(1, bay11BusB.length - 1);
              const bx = 685 + idx * span;
              return renderVerticalBay(bay, bx, 532, 598, 'DOWN_FROM_BUS', themeStyles.bus11Live, {
                showTelemetryCard: true,
              });
            })}
          </svg>
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
  );
};
