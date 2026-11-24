import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { getBayProtocolBreakdown } from '../data/protocolRegistry';
import { AlarmRecord, BayEquipment, SoeRecord } from '../types/substation';
import {
  Area,
  AreaChart,
  Line,
  LineChart,
  Legend,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  AlertTriangle,
  Bell,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Cpu,
  Eye,
  GitBranch,
  Info,
  Layers,
  Lock,
  Maximize2,
  Minimize2,
  Minus,
  Plus,
  Power,
  RefreshCw,
  Settings2,
  X,
  RotateCcw,
  Search,
  ShieldAlert,
  Trash2,
  Unlock,
  Zap,
} from 'lucide-react';

type ScadaPrimaryView = 'SLD' | 'BAY_MATRIX' | 'TRANSFORMERS' | 'ALARMS_SOE';
type InspectorTab =
  | 'All Sections'
  | 'Overview'
  | 'Measurements'
  | 'Controls'
  | 'IEC 61850'
  | 'Alarms'
  | 'SOE';

export const ScadaHmiPage: React.FC = () => {
  const {
    bays,
    busbars,
    transformers,
    ieds,
    signals,
    alarms,
    soeLog,
    trendHistory,
    selectedBayId,
    setSelectedBayId,
    setSelectedIedId,
    setActiveTab,
    simulationRunning,
    toggleSimulationRunning,
    commandBreaker,
    busTransferMode,
    busTransferStatus,
    busTransferMessage,
    setBusTransferMode,
    requestBusTransfer,
    commandDisconnector,
    setBayLocalRemote,
    triggerProtectionTrip,
    resetProtectionTrip,
    resetRecloseDemo86,
    feederProtection,
    stepTransformerOltc,
    acknowledgeAlarm,
    acknowledgeAllAlarms,
    clearClearedAlarms,
  } = useSubstationStore();

  // Operator View & Collapsible Workstation Panels State
  const [primaryView, setPrimaryView] = useState<ScadaPrimaryView>(() => {
    try { const saved = JSON.parse(sessionStorage.getItem('sas-scada-navigation-v1') || '{}'); return ['SLD','BAY_MATRIX','TRANSFORMERS','ALARMS_SOE'].includes(saved.primaryView) ? saved.primaryView : 'SLD'; } catch { return 'SLD'; }
  });
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('All Sections');
  const [protectionFunction, setProtectionFunction] = useState('50/51 Overcurrent');
  const [protectionConfirm, setProtectionConfirm] = useState(false);
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 132 | 33 | 11>('ALL');
  const [baySearch, setBaySearch] = useState<string>('');
  const [isOperatorFullScreen, setIsOperatorFullScreen] = useState<boolean>(false);
  const [leftDirectoryCollapsed, setLeftDirectoryCollapsed] = useState<boolean>(false);
  const [rightInspectorCollapsed, setRightInspectorCollapsed] = useState<boolean>(false);
  // Selection is local to the workstation; the shared store may have a bay selected by another module.
  const [operatorSelectedBayId, setOperatorSelectedBayId] = useState<string | null>(null);
  const [engineeringDetailsOpen, setEngineeringDetailsOpen] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('sas-scada-navigation-v1') || '{}').engineeringDetailsOpen === true; } catch { return false; }
  });
  const [runtimePanel, setRuntimePanel] = useState<'ALARMS' | 'SOE' | 'SYSTEM'>(() => {
    try { const saved = JSON.parse(sessionStorage.getItem('sas-scada-navigation-v1') || '{}'); return ['ALARMS','SOE','SYSTEM'].includes(saved.runtimePanel) ? saved.runtimePanel : 'ALARMS'; } catch { return 'ALARMS'; }
  });
  const [runtimeNavOpen, setRuntimeNavOpen] = useState(true);
  // Persist the operator's current screen across browser refreshes only.
  // App.tsx clears this snapshot when navigating away from SCADA/HMI,
  // so a later visit from another main page starts on the SLD.
  const scadaNavigationKey = 'sas-scada-navigation-v1';
  type RuntimeScreen = 'DASHBOARD' | 'SLD' | 'TRENDS' | 'REPORTS' | 'USER';
  const [restoredNavigation] = useState(() => {
    try {
      const raw = sessionStorage.getItem(scadaNavigationKey);
      const value = raw ? JSON.parse(raw) : null;
      return value && typeof value === 'object' ? value : {};
    } catch { return {}; }
  });
  const [runtimeScreen, setRuntimeScreen] = useState<RuntimeScreen>(() =>
    ['DASHBOARD', 'SLD', 'TRENDS', 'REPORTS', 'USER'].includes(restoredNavigation.runtimeScreen)
      ? restoredNavigation.runtimeScreen as RuntimeScreen : 'SLD');
  const [transferDirection, setTransferDirection] = useState<'FORWARD' | 'REVERSE'>('FORWARD');
  useEffect(() => {
    try {
      sessionStorage.setItem(scadaNavigationKey, JSON.stringify({
        runtimeScreen, primaryView, runtimePanel, engineeringDetailsOpen,
      }));
    } catch { /* Session storage can be unavailable; navigation still works. */ }
  }, [runtimeScreen, primaryView, runtimePanel, engineeringDetailsOpen]);
  const [reportRefreshedAt, setReportRefreshedAt] = useState<Date>(() => new Date());
  const [reportRefreshVersion, setReportRefreshVersion] = useState(0);
  const refreshSourceTransferReport = () => {
    // Read the current shared simulation store, rather than merely changing the displayed clock.
    setReportRefreshVersion(version => version + 1);
    setReportRefreshedAt(new Date());
  };
  const [trendPaused, setTrendPaused] = useState(false);
  const [trendRange, setTrendRange] = useState('20');
  const [trendEnabled, setTrendEnabled] = useState<string[]>(['v132Kv','v33Kv','v11Kv','totalLoadMw','freqHz']);
  const [trendSnapshot, setTrendSnapshot] = useState<typeof trendHistory>([]);
  const [bottomDrawerCollapsed, setBottomDrawerCollapsed] = useState<boolean>(false);

  // At 100%, fit the base SLD to the available operator viewport; extra bays extend horizontally.
  const [sldZoom, setSldZoom] = useState<number>(1.0);
  const sldViewportRef = useRef<HTMLDivElement>(null);
  const sldPanelRef = useRef<HTMLDivElement>(null);
  const [sldOnlyFullScreen, setSldOnlyFullScreen] = useState(false);
  const [sldPanX, setSldPanX] = useState<number>(0);
  const [sldPanY, setSldPanY] = useState<number>(0);

  // Alarm & SOE Management + Clickable Event Detail Inspector State
  const [alarmSeverityFilter, setAlarmSeverityFilter] = useState<string>('ALL');
  const [alarmCategoryFilter, setAlarmCategoryFilter] = useState<string>('ACTIVE');
  const [selectedAlarmId, setSelectedAlarmId] = useState<string>(alarms[0]?.id || '');
  const [soeSearch, setSoeSearch] = useState<string>('');
  const [inspectedSoeEvent, setInspectedSoeEvent] = useState<SoeRecord | null>(soeLog[0] || null);
  const [inspectedAlarmRecord, setInspectedAlarmRecord] = useState<AlarmRecord | null>(null);

  // Two-Step SBO Confirmation & Operator Feedback State
  const [pendingSboCommand, setPendingSboCommand] = useState<'OPEN' | 'CLOSED' | null>(null);
  const [operatorFeedback, setOperatorFeedback] = useState<{
    status: 'SUCCESS' | 'REJECTED' | 'INFO';
    title: string;
    detail: string;
    timestamp: string;
  } | null>(null);

  // Derived System Metrics from Shared Simulation Store
  const selectedBay = bays.find((b) => b.id === selectedBayId) || bays[0];
  const selectedIed = ieds.find((i) => i.id === selectedBay.iedId);
  const selectedTx = transformers.find(
    (t) =>
      t.hvBayId === selectedBay.id ||
      t.lvBayId === selectedBay.id ||
      t.id === selectedBay.connectedTransformerId
  );

  const totalImportMw =
    (bays.find((b) => b.id === 'BAY-132-L1')?.activePowerMw || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.activePowerMw || 0);
  const totalImportMvar =
    (bays.find((b) => b.id === 'BAY-132-L1')?.reactivePowerMvar || 0) +
    (bays.find((b) => b.id === 'BAY-132-L2')?.reactivePowerMvar || 0);
  const systemFreqHz = busbars.find((b) => b.energized)?.frequencyHz || 50.0;
  const onlineIedsCount = ieds.filter((i) => i.commHealthy).length;
  const trendRows = (trendPaused ? trendSnapshot : trendHistory).slice(-Number(trendRange));
  const trendChannels = [
    {key:'v132Kv',label:'132 kV Bus A Voltage',unit:'kV',color:'#00d8ff'},
    {key:'v33Kv',label:'33 kV Bus A Voltage',unit:'kV',color:'#22e879'},
    {key:'v11Kv',label:'11 kV Bus A Voltage',unit:'kV',color:'#e54cf5'},
    {key:'totalLoadMw',label:'Total Import Power',unit:'MW',color:'#ffd12a'},
    {key:'totalLoadMvar',label:'Reactive Power',unit:'MVAr',color:'#fb923c'},
    {key:'freqHz',label:'System Frequency',unit:'Hz',color:'#ff8a22'},
  ] as const;
  const exportTrendCsv = () => {
    const header = ['time',...trendChannels.map(c=>c.key)];
    const rows = trendRows.map(p=>header.map(k=>String(p[k as keyof typeof p] ?? '')).join(','));
    const blob = new Blob([[header.join(','),...rows].join('\n')],{type:'text/csv;charset=utf-8'});
    const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='substation-trends.csv'; a.click(); URL.revokeObjectURL(url);
  };

  // Direction-specific evidence. Events must belong to the same ordered transfer cycle.
  const transferReport = useMemo(() => {
    const latest = useSubstationStore.getState();
    const ordered = [...latest.soeLog].sort((a, b) => a.timestampMs.localeCompare(b.timestampMs));
    const from = transferDirection === 'FORWARD' ? '132-L2' : '132-L3';
    const to = transferDirection === 'FORWARD' ? '132-L3' : '132-L2';
    const prefix = transferDirection === 'FORWARD' ? 'ST' : 'RST';
    const belongs = (e: SoeRecord, code: string) => {
      const bay = latest.bays.find(b => b.bayCode === code);
      return e.bayId === `BAY-${code}` || (Boolean(bay) && e.bayId === bay?.id) ||
        Boolean(bay?.breakerId && e.eventDescription.includes(`— ${bay.breakerId} `));
    };
    const isCommand = (e: SoeRecord, code: string, state: string) =>
      belongs(e, code) && e.eventDescription.includes('command issued') && e.eventDescription.includes(state);
    const isFeedback = (e: SoeRecord, code: string, state: string) =>
      belongs(e, code) && e.eventDescription.includes('feedback confirmed') && e.eventDescription.includes(state);
    const isBusEvent = (e: SoeRecord, voltage: number, phrase: string) =>
      e.eventDescription.includes(`${voltage} kV Bus B`) && e.eventDescription.toLowerCase().includes(phrase);
    const isBlocked = (e: SoeRecord) => e.cause === 'INTERLOCK_BLOCK' && belongs(e, to);
    // Find the most recent COMPLETE ordered cycle; incomplete attempts are not promoted to observed.
    // A cycle begins with an interlock check (optional) or outgoing-source OPEN command.
    const cycles: Array<{ start: number; end: number; matches: Array<SoeRecord | undefined> }> = [];
    for (let i = 0; i < ordered.length; i++) {
      if (!isCommand(ordered[i], from, 'OPEN')) continue;
      const matches: Array<SoeRecord | undefined> = Array(11).fill(undefined);
      const block = [...ordered.slice(0, i)].reverse().find(e => isBlocked(e));
      // Only use a block event after the preceding successful transfer into the starting source.
      const precedingToClosed = [...ordered.slice(0, i)].reverse().find(e => isFeedback(e, to, 'CLOSED'));
      if (block && (!precedingToClosed || block.timestampMs > precedingToClosed.timestampMs)) matches[0] = block;
      matches[1] = ordered[i];
      let cursor = i + 1;
      const next = (test: (e: SoeRecord) => boolean) => {
        const found = ordered.findIndex((e, idx) => idx >= cursor && test(e));
        if (found < 0) return undefined;
        cursor = found + 1;
        return ordered[found];
      };
      matches[2] = next(e => isFeedback(e, from, 'OPEN'));
      if (matches[2]) {
        for (const [index, kv] of [132, 33, 11].entries()) matches[3 + index] = next(e => isBusEvent(e, kv, 'undervoltage'));
        matches[6] = next(e => isCommand(e, to, 'CLOSED'));
        if (matches[6]) matches[7] = next(e => isFeedback(e, to, 'CLOSED'));
        if (matches[7]) for (const [index, kv] of [132, 33, 11].entries()) matches[8 + index] = next(e => isBusEvent(e, kv, 'restored'));
      }
      const end = Math.max(i, cursor - 1);
      cycles.push({ start: i, end, matches });
    }
    const cycle = cycles.length ? cycles[cycles.length - 1] : undefined;
    const checks = [
      [`${prefix}-01`, `${to} close blocked while ${from} closed`],
      [`${prefix}-02`, `${from} OPEN command recorded`],
      [`${prefix}-03`, `${from} OPEN feedback confirmed`],
      [`${prefix}-04`, '132 kV Bus B voltage loss recorded'],
      [`${prefix}-05`, '33 kV Bus B voltage loss recorded'],
      [`${prefix}-06`, '11 kV Bus B voltage loss recorded'],
      [`${prefix}-07`, `${to} CLOSE command recorded`],
      [`${prefix}-08`, `${to} CLOSED feedback confirmed`],
      [`${prefix}-09`, '132 kV Bus B voltage restoration recorded'],
      [`${prefix}-10`, '33 kV Bus B voltage restoration recorded'],
      [`${prefix}-11`, '11 kV Bus B voltage restoration recorded'],
    ];
    const rows = checks.map(([id, title], index) => {
      const evidence = cycle?.matches[index];
      return { id, title, status: evidence ? 'OBSERVED' : 'NOT VERIFIED',
        evidence: evidence ? `${evidence.timestampMs} | ${evidence.eventDescription}` : 'No matching event in selected ordered transfer cycle' };
    });
    for (const voltage of [132, 33, 11]) {
      const alarm = latest.alarms.find(a => a.id === `ALM-ATS-BUS-${voltage}-B`);
      const lossIndex = [132, 33, 11].indexOf(voltage) + 3;
      const restoreIndex = lossIndex + 5;
      const loss = cycle?.matches[lossIndex];
      const restoration = cycle?.matches[restoreIndex];
      // A current CLEARED state alone is insufficient: it may belong to a prior transfer.
      // Require its recorded transition time to follow this cycle's voltage restoration.
      const clearTime = alarm?.timestamp ? Date.parse(alarm.timestamp) : NaN;
      const restorationTime = restoration ? Date.parse(restoration.timestampMs) : NaN;
      const verified = Boolean(loss && restoration && alarm?.state === 'CLEARED' &&
        Number.isFinite(clearTime) && Number.isFinite(restorationTime) && clearTime >= restorationTime);
      const reason = !loss || !restoration
        ? 'No matching voltage loss/restoration evidence in selected transfer cycle'
        : alarm?.state !== 'CLEARED'
          ? 'Alarm is not CLEARED in current alarm records'
          : !Number.isFinite(clearTime) || !Number.isFinite(restorationTime)
            ? 'Alarm clear/restoration timestamp missing or invalid'
            : 'Recorded alarm CLEARED timestamp precedes this transfer restoration; a fresh clear event is required';
      rows.push({ id: `${prefix}-${voltage}-ALM`, title: `${voltage} kV Bus B undervoltage alarm returned to normal`,
        status: verified ? 'OBSERVED' : 'NOT VERIFIED',
        evidence: verified && alarm ? `${alarm.timestamp} | ${alarm.signalName} | ${alarm.state} (after selected cycle restoration)` : reason });
    }
    const sequence = cycle ? ordered.slice(cycle.start, cycle.end + 1) : [];
    return { rows, sequence, from, to, direction: transferDirection };
  }, [soeLog, alarms, bays, reportRefreshVersion, transferDirection]);
  const sourceTransferCases = transferReport.rows;

  const exportSourceTransferPdf = () => {
    // Evidence-based training report: no inferred physical FAT/SAT pass results.
    const safe = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, ch =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch] || ch));
    const generatedAt = new Date().toLocaleString();
    const observed = sourceTransferCases.filter(r => r.status === 'OBSERVED').length;
    const pending = sourceTransferCases.length - observed;
    const activeAlarms = alarms.filter(a => a.state !== 'CLEARED');
    const results = sourceTransferCases.map(r => `<tr><td>${safe(r.id)}</td><td>${safe(r.title)}</td><td class="${r.status === 'OBSERVED' ? 'observed' : 'pending'}">${safe(r.status)}</td><td>${safe(r.evidence)}</td></tr>`).join('');
    const sequence = transferReport.sequence;
    const soeRows = sequence.map((e, i) => `<tr><td>${i + 1}</td><td>${safe(e.timestampMs)}</td><td>${safe(e.bayId)}</td><td>${safe(e.eventDescription)}</td><td>${safe(e.cause)}</td><td>${safe(e.quality)}</td></tr>`).join('');
    const alarmRows = [132,33,11].map(kv => {
      const a = alarms.find(x => x.id === `ALM-ATS-BUS-${kv}-B`);
      const check = sourceTransferCases.find(r => r.id === `${transferReport.direction === 'FORWARD' ? 'ST' : 'RST'}-${kv}-ALM`);
      return `<tr><td>${kv} kV Bus B undervoltage</td><td>${a ? safe(a.state) : 'NO RECORD'}</td><td>${a ? safe(a.timestamp) : '—'}</td><td>${check?.status === 'OBSERVED' ? 'VERIFIED AFTER RESTORATION' : 'NOT VERIFIED — ' + safe(check?.evidence)}</td></tr>`;
    }).join('');
    const conclusion = pending === 0 && activeAlarms.length === 0
      ? 'All listed simulator evidence checks are observed and no active alarms remain. This is a simulator evidence review only, not physical FAT/SAT acceptance.'
      : `${pending} of ${sourceTransferCases.length} evidence checks remain NOT VERIFIED; ${activeAlarms.length} active alarm(s) remain. Overall simulator evidence review: INCOMPLETE / PENDING VERIFICATION. Do not treat this as a passed physical FAT/SAT.`;
    const html = `<!doctype html><html><head><meta charset="utf-8"/><title>132 kV ${safe(transferReport.direction)} Source Transfer FAT SAT Report</title><style>
      @page { size: A4 portrait; margin: 13mm; }
      * { box-sizing: border-box; } body { font: 9px Arial, sans-serif; color: #182b40; margin: 0; }
      header { border-bottom: 3px solid #0088b7; padding-bottom: 12px; margin-bottom: 16px; }
      h1 { margin: 0 0 7px; font-size: 17px; color: #063b60; } h2 { font-size: 13px; color: #063b60; margin: 18px 0 8px; break-after: avoid; }
      p, li { line-height: 1.55; } .subtitle { color: #53677b; } .meta { display: flex; gap: 25px; margin: 12px 0; }
      .metric { display: inline-block; padding: 9px 13px; margin-right: 8px; background: #eaf4f8; border-radius: 4px; }
      .metric strong { font-size: 17px; } table { border-collapse: collapse; width: 100%; table-layout: fixed; font-size: 8px; }
      th { background: #0b3656; color: white; text-align: left; } th, td { border: 1px solid #c9d8e1; padding: 5px; vertical-align: top; overflow-wrap: anywhere; word-break: break-word; } thead { display: table-header-group; }
      tr:nth-child(even) { background: #f2f7fa; } tr { break-inside: avoid; }
      .results th:nth-child(1) { width: 11%; } .results th:nth-child(2) { width: 27%; } .results th:nth-child(3) { width: 17%; } .results th:nth-child(4) { width: 45%; }
      .soe th:nth-child(1) { width: 5%; } .soe th:nth-child(2) { width: 23%; } .soe th:nth-child(3) { width: 15%; } .soe th:nth-child(4) { width: 37%; } .soe th:nth-child(5) { width: 12%; } .soe th:nth-child(6) { width: 8%; }
      .observed { color: #06723b; font-weight: bold; } .pending { color: #a35b00; font-weight: bold; }
      .note { padding: 10px; border-left: 3px solid #0088b7; background: #edf6fa; line-height: 1.5; }
      .sign { display: flex; gap: 30px; margin-top: 28px; } .sign div { flex: 1; border-top: 1px solid #718096; padding-top: 6px; }
      @media screen { body { padding: 22px; max-width: 1200px; margin: auto; } }
    </style></head><body><header><h1>132 kV ${safe(transferReport.direction)} Source Transfer — FAT/SAT Test Report</h1>
      <div class="subtitle">132 / 33 / 11 kV Substation Automation System | SCADA/HMI Training Simulation</div>
      <div class="meta"><span><b>Scenario:</b> ${safe(transferReport.from)} to ${safe(transferReport.to)} incoming source transfer</span><span><b>Generated:</b> ${safe(generatedAt)}</span></div>
    </header><section><div class="metric"><strong>${sourceTransferCases.length}</strong><br/>Test checks</div>
      <div class="metric"><strong>${observed}</strong><br/>Evidence observed</div>
      <div class="metric"><strong>${pending}</strong><br/>Not verified</div>
      <div class="metric"><strong>${activeAlarms.length}</strong><br/>Active alarms</div></section>
    <h2>1. Test Objective</h2>
    <p>Evaluate the simulated transfer of the 132 kV Bus B incoming supply from ${safe(transferReport.from)} to ${safe(transferReport.to)}. Check same-bus source closing interlock, ${safe(transferReport.from)} OPEN command and breaker feedback, 132/33/11 kV Bus B voltage-loss indications, ${safe(transferReport.to)} CLOSE command and feedback, voltage restoration, and final undervoltage alarm states. All findings are based on recorded SCADA simulator SOE and alarm data.</p>
    <h2>2. Test Results</h2>
    <table class="results"><thead><tr><th>Test ID</th><th>Expected Verification</th><th>Evidence Status</th><th>Actual Recorded Evidence</th></tr></thead><tbody>${results}</tbody></table>
    <p><b>Evidence summary:</b> ${observed} observed; ${pending} not verified. OBSERVED indicates matching evidence within the selected ordered transfer cycle, not independent proof of correct electrical operation.</p>
    <h2>3. Recorded SOE Sequence</h2>
    <p>Recorded event sequence for the selected transfer cycle, sorted by millisecond timestamp. An empty sequence does not establish that an event occurred.</p>
    <table class="soe"><thead><tr><th>#</th><th>Timestamp (ms)</th><th>Bay / IED reference</th><th>Event</th><th>Cause</th><th>Quality</th></tr></thead><tbody>${soeRows || '<tr><td colspan="6">No SOE records available for this session.</td></tr>'}</tbody></table>
    <h2>4. Final Alarm Verification</h2>
    <table><thead><tr><th>Alarm</th><th>Current Recorded State</th><th>Record Timestamp</th><th>Verification</th></tr></thead><tbody>${alarmRows}</tbody></table>
    <p><b>All active alarms in current store:</b> ${activeAlarms.length}. ${activeAlarms.length ? safe(activeAlarms.map(a => `${a.signalName} (${a.state})`).join('; ')) : 'No active alarms recorded.'}</p>
    <h2>5. Test Conclusion</h2><div class="note">${safe(conclusion)}</div>
    <h2>Test Scope and Limitations</h2><div class="note">OBSERVED means matching simulator SOE/alarm evidence exists. It does not independently verify complete event ordering, physical relay behavior, breaker operation, site wiring, or time synchronization accuracy. NOT VERIFIED means no matching evidence was found. This report is for training simulation only, not a physical FAT/SAT acceptance certificate.</div>
    <div class="sign"><div>Prepared by / Date</div><div>Checked by / Date</div><div>Approved by / Date</div></div></body></html>`;
    const popup = window.open('', '_blank');
    if (!popup) { window.alert('Please allow pop-ups to generate the PDF report.'); return; }
    popup.document.open(); popup.document.write(html); popup.document.close();
    popup.focus();
    popup.addEventListener('load', () => popup.print(), { once: true });
  };

  const unackCount = alarms.filter((a) => a.state === 'ACTIVE_UNACK').length;
  const criticalCount = alarms.filter((a) => a.state !== 'CLEARED' && a.severity === 'CRITICAL').length;
  const majorCount = alarms.filter((a) => a.state !== 'CLEARED' && a.severity === 'MAJOR').length;
  const warningCount = alarms.filter(
    (a) => a.state !== 'CLEARED' && (a.severity === 'WARNING' || a.severity === 'MINOR')
  ).length;

  const filteredAlarms = useMemo(() => {
    return alarms.filter((a) => {
      if (alarmCategoryFilter === 'ACTIVE' && a.state === 'CLEARED') return false;
      if (alarmSeverityFilter !== 'ALL' && a.severity !== alarmSeverityFilter) return false;
      return true;
    });
  }, [alarms, alarmCategoryFilter, alarmSeverityFilter]);

  const filteredSoe = useMemo(() => {
    return soeLog.filter(
      (s) =>
        !soeSearch.trim() ||
        s.bayName.toLowerCase().includes(soeSearch.toLowerCase()) ||
        s.iedId.toLowerCase().includes(soeSearch.toLowerCase()) ||
        s.eventDescription.toLowerCase().includes(soeSearch.toLowerCase()) ||
        s.sourceRef.toLowerCase().includes(soeSearch.toLowerCase())
    );
  }, [soeLog, soeSearch]);

  const filteredDirectoryBays = useMemo(() => {
    return bays.filter((b) => {
      if (voltageFilter !== 'ALL' && b.voltageKv !== voltageFilter) return false;
      if (!baySearch.trim()) return true;
      const q = baySearch.toLowerCase();
      return (
        b.bayCode.toLowerCase().includes(q) ||
        b.name.toLowerCase().includes(q) ||
        b.breakerId.toLowerCase().includes(q) ||
        b.iedId.toLowerCase().includes(q)
      );
    });
  }, [bays, voltageFilter, baySearch]);

  const selectedBaySignals = useMemo(
    () => signals.filter((s) => s.bayId === selectedBay.id),
    [signals, selectedBay.id]
  );
  const selectedBayAlarms = useMemo(
    () => alarms.filter((a) => a.bayId === selectedBay.id),
    [alarms, selectedBay.id]
  );
  const selectedBaySoe = useMemo(
    () => soeLog.filter((s) => s.bayId === selectedBay.id),
    [soeLog, selectedBay.id]
  );

  // SBO Step 1: Select Before Operate
  const handleSelectSbo = (target: 'OPEN' | 'CLOSED') => {
    const ts = new Date().toISOString();
    setPendingSboCommand(target);
    setOperatorFeedback({
      status: 'INFO',
      title: `SBO SELECT CONFIRMED: ${selectedBay.breakerId} → ${target}`,
      detail: `MMS SelectWithValue(${target === 'CLOSED' ? 'true' : 'false'}) accepted on ${selectedBay.iedId.replace(/-/g, '_')}/CSWI1$CO$Pos$SBOw. Confirm operation within 15 seconds.`,
      timestamp: ts,
    });
  };

  // SBO Step 2: Confirmed Execute Operate
  const handleConfirmOperate = () => {
    if (!pendingSboCommand) return;
    const ts = new Date().toISOString();
    const target = pendingSboCommand;
    setPendingSboCommand(null);

    const success = commandBreaker(selectedBay.id, target, 'SCADA_SBO');
    if (success) {
      // The shared command handler already publishes the global success toast.
      // Do not render a second local success banner for the same operation.
      setOperatorFeedback(null);
    } else {
      const rejectReason =
        selectedBay.quality !== 'GOOD'
          ? `IED ${selectedBay.iedId} communication offline / quality=${selectedBay.quality}`
          : selectedBay.localRemote === 'LOCAL'
          ? 'Bay 43LR switch is in LOCAL mode (Blocked-by-switching-hierarchy)'
          : useSubstationStore.getState().lastCommandFeedback?.message || selectedBay.interlockReason;

      setOperatorFeedback({
        status: 'REJECTED',
        title: `COMMAND REJECTED: ${selectedBay.breakerId} (${selectedBay.bayCode}) → ${target}`,
        detail: `MMS CommandTermination- — ${rejectReason}`,
        timestamp: ts,
      });
    }
  };

  const handleAcknowledgeSelected = () => {
    const targetId =
      selectedAlarmId || filteredAlarms.find((a) => a.state === 'ACTIVE_UNACK')?.id;
    if (targetId) {
      acknowledgeAlarm(targetId);
    }
  };

  const handleFitToScreen = () => {
    const viewport = sldViewportRef.current;
    const availableWidth = (viewport?.clientWidth ?? 1100) - 18;
    const availableHeight = (viewport?.clientHeight ?? 680) - 18;
    setSldZoom(Math.max(0.3, Math.min(1.6, availableWidth / operatorCanvasWidth, availableHeight / 820)));
    setSldPanX(0);
    setSldPanY(0);
  };

  // Use the browser fullscreen API so the SLD fills the actual display,
  // rather than a CSS fixed element constrained by a transformed ancestor.
  const toggleSldFullScreen = async () => {
    const panel = sldPanelRef.current;
    if (!panel) return;
    if (document.fullscreenElement === panel) {
      await document.exitFullscreen().catch(() => {});
    } else if (document.fullscreenElement) {
      await document.exitFullscreen().catch(() => {});
    } else {
      try {
        await panel.requestFullscreen();
      } catch {
        // Some embedded browsers disallow native fullscreen: use CSS fallback.
        setSldOnlyFullScreen((value) => !value);
      }
    }
  };

  const handleResetView = () => {
    handleFitToScreen();
    setVoltageFilter('ALL');
    setPrimaryView('SLD');
  };

  // Group bays for the Main SCADA SLD
  const bay33BusA = bays.filter(
    (b) =>
      b.voltageKv === 33 &&
      b.busSection === 'A' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'DIST_TX_FEEDER')
  );
  const bay33BusB = bays.filter(
    (b) =>
      b.voltageKv === 33 &&
      b.busSection === 'B' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'DIST_TX_FEEDER')
  );
  const bay11BusA = bays.filter(
    (b) =>
      b.voltageKv === 11 &&
      b.busSection === 'A' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'SPARE_FEEDER')
  );
  const bay11BusB = bays.filter(
    (b) =>
      b.voltageKv === 11 &&
      b.busSection === 'B' &&
      (b.bayType === 'OUTGOING_FEEDER' || b.bayType === 'SPARE_FEEDER')
  );

  // Operator SLD consumes the same live bay list as Engineering Mode.
  // Extra bays extend outward rather than squeezing the fixed transformer/coupler columns.
  const incoming132A = bays.filter(b => b.voltageKv === 132 && b.busSection === 'A' &&
    (b.bayType === 'LINE_INCOMER' || String(b.bayType) === 'INCOMING_FEEDER' || b.id === 'BAY-132-L1'));
  const incoming132B = bays.filter(b => b.voltageKv === 132 && b.busSection === 'B' &&
    (b.bayType === 'LINE_INCOMER' || String(b.bayType) === 'INCOMING_FEEDER' || b.id === 'BAY-132-L2'));
  const extraLeft = Math.max(0, incoming132A.length - 2, bay33BusA.length - 3, bay11BusA.length - 4) * 110;
  const extraRight = Math.max(0, incoming132B.length - 2, bay33BusB.length - 3, bay11BusB.length - 4) * 110;
  const operatorCanvasWidth = 1200 + extraLeft + extraRight;
  const operatorBayX = (side: 'A' | 'B', index: number, level: 132 | 33 | 11) => {
    if (level === 132) return side === 'A' ? (index === 0 ? 300 : 175 - (index - 1) * 110) : (index === 0 ? 900 : 1020 + (index - 1) * 110);
    const slots = level === 33 ? (side === 'A' ? [105, 235, 345] : [855, 995, 1100]) :
      (side === 'A' ? [100, 205, 310, 385] : [815, 925, 1035, 1120]);
    return index < slots.length ? slots[index] : side === 'A'
      ? 15 - (index - slots.length) * 110
      : 1230 + (index - slots.length) * 110;
  };

  // Fit the complete drawing initially and whenever the number of bays changes.
  useEffect(() => {
    if (primaryView !== 'SLD') return;
    const viewport = sldViewportRef.current;
    if (!viewport) return;
    // Fullscreen changes and window resizes change both available dimensions.
    // Measure the real viewport instead of assuming a fixed 680px height.
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = Math.max(1, viewport.clientWidth - 12);
        const height = Math.max(1, viewport.clientHeight - 12);
        setSldZoom(Math.max(0.3, Math.min(1.6, width / operatorCanvasWidth, height / 820)));
        viewport.scrollLeft = 0;
        viewport.scrollTop = 0;
      });
    };
    const observer = new ResizeObserver(fit);
    observer.observe(viewport);
    fit();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); };
  }, [operatorCanvasWidth, sldOnlyFullScreen, primaryView]);

  useEffect(() => {
    const syncFullscreen = () => setSldOnlyFullScreen(document.fullscreenElement === sldPanelRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

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

  // Compute dynamic Center column width based on collapsible left/right drawers
  const centerColSpanClass =
    leftDirectoryCollapsed && rightInspectorCollapsed
      ? 'xl:col-span-12'
      : leftDirectoryCollapsed
      ? 'xl:col-span-9'
      : rightInspectorCollapsed
      ? 'xl:col-span-10'
      : 'xl:col-span-7';

  const selectBayInScada = (bayId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (operatorSelectedBayId === bayId) {
      setOperatorSelectedBayId(null);
      setRightInspectorCollapsed(true);
    } else {
      setOperatorSelectedBayId(bayId);
      setSelectedBayId(bayId);
      setRightInspectorCollapsed(false);
    }
    setPendingSboCommand(null);
  };

  /**
   * 3D Metallic Beveled Circuit Breaker Symbol ([X])
   * - CLOSED: Bright Crimson Red (#FF2A4B) inner cross & glowing red border
   * - OPEN: Bright Neon Green (#00E676) inner cross & glowing green border
   * Clicking selects the bay in the Right Inspector without auto-toggling.
   */
  const renderScadaCircuitBreakerBox = (bay: BayEquipment, cx: number, cy: number, size = 27) => {
    const isClosed = bay.breakerState === 'CLOSED';
    const isInvalidPos = bay.breakerState === 'INTERMEDIATE' || bay.breakerState === 'BAD';
    const stateColor = bay.protectionTripActive
      ? '#FF5C65'
      : isInvalidPos
      ? '#A855F7'
      : isClosed
      ? '#FF2A4B'
      : '#00E676';
    const innerBg = bay.protectionTripActive
      ? '#450A14'
      : isInvalidPos
      ? '#3B0764'
      : isClosed
      ? '#2B0912'
      : '#05291A';
    const half = size / 2;
    const innerHalf = half - 3.5;
    const crossHalf = innerHalf - 4.2;

    return (
      <g
        className="cursor-pointer"
        onClick={(e) => selectBayInScada(bay.id, e)}
      >
        <title>{`${bay.breakerId} (${bay.bayCode}): ${bay.breakerState} — Click to select bay in Inspector`}</title>
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
        <rect
          x={cx - half}
          y={cy - half}
          width={size}
          height={size}
          rx={5.5}
          fill="url(#scadaCbFrameGrad)"
          stroke="#566B84"
          strokeWidth={1.5}
        />
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
        {isInvalidPos ? (
          <text x={cx} y={cy + 3.5} textAnchor="middle" fill="#E9F3FF" fontSize={10} fontWeight="bold">
            ?
          </text>
        ) : (
          <>
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
          </>
        )}
      </g>
    );
  };

  /**
   * Two-dot hinge Isolator / Disconnector + CT Ring indicator
   */
  const renderScadaIsolatorAndCt = (
    bay: BayEquipment,
    x: number,
    yTop: number,
    yBottom: number,
    liveColor: string
  ) => {
    const isIsoClosed = bay.busDisconnectorState === 'CLOSED';
    const isEnergized = bay.energized && isIsoClosed && bay.breakerState === 'CLOSED';
    const strokeCol = isEnergized ? liveColor : '#334458';

    return (
      <g
        className="cursor-pointer"
        onClick={(e) => selectBayInScada(bay.id, e)}
      >
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
    );
  };

  /**
   * High-Readability Vertical Bay Renderer for SCADA SLD
   */
  const renderScadaVerticalBay = (
    bay: BayEquipment,
    x: number,
    yBus: number,
    yEnd: number,
    direction: 'DOWN_FROM_BUS' | 'INTO_BUS_FROM_TOP',
    tierColor: string,
    options?: {
      showTelemetryCard?: boolean;
      dashedHighlight?: boolean;
    }
  ) => {
    const isSelected = operatorSelectedBayId === bay.id;
    const isFilteredOut = voltageFilter !== 'ALL' && bay.voltageKv !== voltageFilter;
    const opacity = isFilteredOut ? 0.22 : 1.0;
    const isBadQuality = bay.quality !== 'GOOD';
    const isEnergized =
      bay.energized && bay.breakerState === 'CLOSED' && bay.busDisconnectorState === 'CLOSED';
    const lineCol = isEnergized ? tierColor : '#334458';
    const glowFilter = !isEnergized
      ? undefined
      : tierColor === '#00D2FF'
      ? 'url(#scadaGlowCyan)'
      : tierColor === '#00E676'
      ? 'url(#scadaGlowGreen)'
      : 'url(#scadaGlowAmber)';

    const topY = Math.min(yBus, yEnd);
    const botY = Math.max(yBus, yEnd);
    const cbY = direction === 'INTO_BUS_FROM_TOP' ? topY + 24 : topY + 30;
    const ctY = cbY + 21;
    const labelY = direction === 'INTO_BUS_FROM_TOP' ? topY + 4 : topY + 12;

    return (
      <g
        key={bay.id}
        opacity={opacity}
        onClick={(e) => selectBayInScada(bay.id, e)}
        className="cursor-pointer"
      >
        {isSelected && (
          <rect
            x={x - 36}
            y={topY - 8}
            width={72}
            height={botY - topY + (options?.showTelemetryCard ? 54 : 18)}
            rx={6}
            fill="rgba(0, 210, 255, 0.06)"
            stroke="#00D2FF"
            strokeWidth={isSelected ? 1.7 : 1.2}
            strokeDasharray="4 3"
          />
        )}

        <line
          x1={x}
          y1={direction === 'INTO_BUS_FROM_TOP' ? topY + 7 : yBus}
          x2={x}
          y2={cbY - 13}
          stroke={lineCol}
          strokeWidth={2.6}
          filter={glowFilter}
        />
        <line
          x1={x}
          y1={cbY + 13}
          x2={x}
          y2={botY}
          stroke={lineCol}
          strokeWidth={2.6}
          filter={glowFilter}
        />

        {renderScadaIsolatorAndCt(
          bay,
          x,
          direction === 'INTO_BUS_FROM_TOP' ? cbY + 15 : yBus + 4,
          ctY,
          tierColor
        )}

        {renderScadaCircuitBreakerBox(bay, x, cbY, 27)}

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
          {bay.bayCode}
        </text>

        {bay.protectionTripActive && (
          <g>
            <rect x={x - 30} y={cbY - 28} width={60} height={13} rx={2.5} fill="#FF5C65" />
            <text x={x} y={cbY - 19} textAnchor="middle" fill="#FFFFFF" fontSize={8.5} fontWeight="bold">
              86 TRIP
            </text>
          </g>
        )}

        {isBadQuality && !bay.protectionTripActive && (
          <g>
            <rect x={x - 32} y={cbY - 28} width={64} height={13} rx={2.5} fill="#FFB547" />
            <text x={x} y={cbY - 19} textAnchor="middle" fill="#050B14" fontSize={8.2} fontWeight="bold">
              Q:{bay.quality}
            </text>
          </g>
        )}

        {(bay.earthSwitchState === 'CLOSED' || bay.id === 'BAY-11-SP1') && (
          <g>
            <line x1={x} y1={ctY + 8} x2={x + 14} y2={ctY + 8} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 14} y1={ctY + 8} x2={x + 14} y2={ctY + 13} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 9} y1={ctY + 13} x2={x + 19} y2={ctY + 13} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 11} y1={ctY + 16} x2={x + 17} y2={ctY + 16} stroke="#FFAB00" strokeWidth={1.6} />
            <line x1={x + 13} y1={ctY + 19} x2={x + 15} y2={ctY + 19} stroke="#FFAB00" strokeWidth={1.6} />
          </g>
        )}

        {options?.showTelemetryCard && (
          <polygon
            points={`${x},${botY + 5} ${x - 4.5},${botY - 3} ${x + 4.5},${botY - 3}`}
            fill={lineCol}
          />
        )}

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
                  : isBadQuality
                  ? '#FFB547'
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
              fill={isBadQuality ? '#FFB547' : isEnergized ? '#7CE8A6' : '#64748B'}
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
   * Center Bus Coupler Renderer (CB-132, CB-33, CB-11)
   */
  const renderScadaCouplerSvg = (
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
      <g key={bay.id} onClick={(e) => selectBayInScada(bay.id, e)} className="cursor-pointer">
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

        {showOpenClosedPills && (
          <>
            <g transform={`translate(${cx - 128}, ${cy - 24})`}>
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

            <g transform={`translate(${cx + 56}, ${cy - 24})`}>
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

        {renderScadaCircuitBreakerBox(bay, cx, cy, 28)}

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
   * Interlocking Dual-Circle 50 MVA Power Transformer (TX-T1 & TX-T2) with Neon Core & Argon Telemetry Cards
   */
  const renderScadaMainPowerTransformer = (
    tx: typeof txT1,
    cx: number,
    cy: number,
    side: 'LEFT' | 'RIGHT',
    hvBayId: string
  ) => {
    const hvColor = tx.energized ? '#00D2FF' : '#334458';
    const lvColor = tx.energized ? '#00E676' : '#334458';
    const gaugeColor = side === 'LEFT' ? '#00D2FF' : '#FFAB00';
    const pct = Math.min(100, Math.max(0, tx.loadPercent));
    const dashLen = (pct / 100) * 88;

    return (
      <g
        key={tx.id}
        className="cursor-pointer"
        onClick={(e) => selectBayInScada(hvBayId, e)}
      >
        {tx.energized && (
          <circle
            cx={cx}
            cy={cy}
            r={34}
            fill="url(#scadaTxCoreAura)"
            pointerEvents="none"
          />
        )}

        <circle
          cx={cx}
          cy={cy - 9}
          r={15.5}
          fill="#091526"
          stroke={hvColor}
          strokeWidth={2.8}
          filter={tx.energized ? 'url(#scadaGlowCyan)' : undefined}
        />

        <circle
          cx={cx}
          cy={cy + 10}
          r={15.5}
          fill="#091526"
          stroke={lvColor}
          strokeWidth={2.8}
          filter={tx.energized ? 'url(#scadaGlowGreen)' : undefined}
        />

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

        {tx.energized && (
          <g pointerEvents="none">
            <line x1={cx - 28} y1={cy} x2={cx + 28} y2={cy} stroke="#E0F7FF" strokeWidth={1.2} opacity={0.75} />
            <circle cx={cx} cy={cy} r={3.5} fill="#FFFFFF" filter="url(#scadaGlowCyan)" />
          </g>
        )}

        {side === 'LEFT' ? (
          <g transform={`translate(48, ${cy - 34})`}>
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

            <g transform="translate(152, -2)">
              <rect
                x={0}
                y={0}
                width={158}
                height={70}
                rx={7}
                fill="#101E33"
                fillOpacity={0.94}
                stroke={tx.differentialTrip || tx.pressureReliefTrip ? '#FF5C65' : '#3B628B'}
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
            <g transform="translate(0, -2)">
              <rect
                x={0}
                y={0}
                width={158}
                height={70}
                rx={7}
                fill="#101E33"
                fillOpacity={0.94}
                stroke={tx.differentialTrip || tx.pressureReliefTrip ? '#FF5C65' : '#3B628B'}
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

  // Thin-line IEC-style switching schematic. Every bay retains its original selection handler.
  const renderReferenceBay = (bay: BayEquipment | undefined, x: number, busY: number, endY: number, color: string, direction: 'up' | 'down', showTelemetry = true) => {
    if (!bay) return null;
    const top = Math.min(busY, endY);
    const bottom = Math.max(busY, endY);
    const span = bottom - top;
    const cbY = top + span * 0.52;
    const dsY = top + span * 0.23;
    const earthY = top + span * 0.76;
    const closed = bay.breakerState === 'CLOSED';
    const dsClosed = bay.busDisconnectorState === 'CLOSED';
    const esClosed = bay.earthSwitchState === 'CLOSED';
    const selected = operatorSelectedBayId === bay.id;
    const wire = bay.quality === 'GOOD' && !bay.energized ? '#64748b' : color;
    return <g key={bay.id} role="button" tabIndex={0} aria-label={`Inspect ${bay.bayCode}`} onClick={() => selectBayInScada(bay.id)} onKeyDown={e => { if(e.key==='Enter'||e.key===' ') {e.preventDefault();selectBayInScada(bay.id);} }} style={{cursor:'pointer'}}>
      {selected && <rect x={x-20} y={top-5} width="40" height={span+10} rx="3" fill="#0c4261" fillOpacity="0.34" stroke="#22d3ee" strokeDasharray="4 4"/>}
      {/* Split conductors at DS and CB: open isolators show a real visible air gap. */}
      <path d={`M${x} ${top} V${dsY-7} M${x} ${dsY+7} V${cbY-10} M${x} ${cbY+10} V${bottom}`} stroke={wire} strokeWidth="1.8" fill="none"/>
      <rect x={x-14} y={dsY-13} width="28" height="26" fill="transparent" stroke="none"/>
      <circle cx={x} cy={dsY-7} r="2.5" fill={wire}/><circle cx={x} cy={dsY+7} r="2.5" fill={wire}/>
      <path d={dsClosed?`M${x} ${dsY-7} V${dsY+7}`:`M${x} ${dsY-7} L${x+11} ${dsY+1}`} stroke={wire} strokeWidth="2.2" fill="none"/>
      <rect x={x-9} y={cbY-10} width="18" height="20" fill={closed?wire:'#071b33'} stroke={wire} strokeWidth="1.8"/>
      {!closed && <path d={`M${x-5} ${cbY-6} L${x+5} ${cbY+6} M${x+5} ${cbY-6} L${x-5} ${cbY+6}`} stroke={wire} strokeWidth="1.3"/>}
      <circle cx={x} cy={earthY} r="2.5" fill={wire}/>
      <path d={`M${x} ${earthY} h22 m0 0 v${esClosed?11:7} m-9 5 h18 m-15 4 h12 m-9 4 h6`} stroke="#cbd5e1" strokeWidth="1.4" fill="none"/>
      <path d={esClosed?`M${x+11} ${earthY-6} L${x+22} ${earthY+7}`:`M${x+10} ${earthY-7} L${x+19} ${earthY-1}`} stroke="#cbd5e1" strokeWidth="1.5" fill="none"/>
      <text x={x+13} y={dsY-7} fontSize="8" fill="#d7e7f6">Q1</text>
      <text x={x+13} y={cbY+3} fontSize="8" fill="#d7e7f6">Q0</text>
      <text x={x+24} y={earthY+5} fontSize="8" fill="#d7e7f6">Q8</text>
      <text x={x} y={direction==='up'?top-9:bottom+13} fontSize="10" fill="#f1f7ff" fontWeight="600" textAnchor="middle">{bay.bayCode}</text>
      {direction==='up' && ((bay.voltageKv === 132 && (bay.bayType === 'LINE_INCOMER' || String(bay.bayType) === 'INCOMING_FEEDER')) || ['BAY-33-INC1', 'BAY-33-INC2', 'BAY-11-INC1', 'BAY-11-INC2'].includes(bay.id) ? (
        // Incoming source arrows (132 kV lines and 33/11 kV transformer incomers) point toward the busbar.
        <path d={`M${x-4} ${top+1} L${x} ${top+8} L${x+4} ${top+1}`} fill="none" stroke={wire} strokeWidth="1.6"/>
      ) : (
        <path d={`M${x-4} ${top+7} L${x} ${top} L${x+4} ${top+7}`} fill="none" stroke={wire} strokeWidth="1.6"/>
      ))}
      {direction==='down' && <path d={`M${x-5} ${bottom-8} L${x} ${bottom} L${x+5} ${bottom-8}`} fill="none" stroke={wire} strokeWidth="1.6"/>}
      {showTelemetry && direction==='down' && <g transform={`translate(${x-37},${bottom+18})`}><rect width="74" height="30" fill="#102b47" stroke="#577895" strokeWidth="0.8"/><text x="5" y="11" fontSize="9" fill="#e9f3ff">P [MW]</text><text x="69" y="11" fontSize="9" textAnchor="end" fill="#e9f3ff">{bay.activePowerMw.toFixed(1)}</text><path d="M4 15 H70" stroke="#577895"/><text x="69" y="26" fontSize="9" textAnchor="end" fill="#b8cde2">{bay.currentA.toFixed(0)} A</text></g>}
    </g>;
  };
  const renderReferenceCoupler = (bayId: string, x: number, y: number, color: string) => {
    const bay = bays.find(b=>b.id===bayId);
    const closed = bay?.breakerState === 'CLOSED';
    return <g key={bayId} role="button" tabIndex={0} aria-label={`Inspect bus coupler ${bay?.bayCode||bayId}`} onClick={()=>bay&&selectBayInScada(bay.id)} onKeyDown={e=>{if(e.key==='Enter'&&bay)selectBayInScada(bay.id);}} style={{cursor:'pointer'}}>
      <path d={`M${x-50} ${y} H${x-12} M${x+12} ${y} H${x+50}`} stroke={color} strokeWidth="1.8" fill="none"/>
      <circle cx={x-17} cy={y} r="2.5" fill={color}/><circle cx={x+17} cy={y} r="2.5" fill={color}/>
      <rect x={x-11} y={y-11} width="22" height="22" fill={closed?color:'#071b33'} stroke={color} strokeWidth="1.8"/>
      {!closed&&<path d={`M${x-7} ${y-7} l14 14 m0 -14 l-14 14`} stroke={color} strokeWidth="1.5"/>}
      <text x={x} y={y-17} fontSize="11" fontWeight="600" fill="#e9f3ff" textAnchor="middle">{bay?.bayCode||bayId}</text>
    </g>;
  };

  const showSection = (sec: InspectorTab) =>
    inspectorTab === 'All Sections' || inspectorTab === sec;

  return (
    <div
      className={
        isOperatorFullScreen
          ? 'sas-runtime-shell reference-sld fixed inset-0 z-50 text-[#E9F3FF] p-2 flex flex-col overflow-y-auto space-y-1'
          : 'sas-runtime-shell reference-sld text-[#E9F3FF] p-2 border space-y-1 overflow-x-hidden'
      }
    >
      {/* Industrial runtime shell: these controls use the existing simulation and operator views. */}
      <style>{`
        .sas-runtime-shell { background:linear-gradient(180deg,#061a34 0%,#071b33 40%,#041225 100%); font-family:Arial,system-ui,sans-serif; border-color:#315579; border-radius:5px; }
        .sas-runtime-shell button { border-radius:3px; }
        .sas-runtime-shell > div { border-radius:4px; }
        .sas-runtime-shell .runtime-nav button { min-height:55px; }
        .sas-runtime-shell .runtime-nav button[data-selected=true] { background:linear-gradient(#1973c5,#07529e);border-color:#4caaff; box-shadow:inset 0 1px 0 #75c6ff; }
        .sas-runtime-shell .runtime-panel { border:1px solid #315779; background:linear-gradient(180deg,#09213e,#06172c); }
        .sas-runtime-shell .runtime-status { background:#092542; border:1px solid #315779; }
        .sas-runtime-shell .runtime-tab { border:1px solid #315779;background:#102e4f;color:#d7e9fa; }
        .sas-runtime-shell .runtime-tab[data-selected=true] { background:#1767b4;color:white;border-color:#54b5ff; }
        .sas-runtime-shell .runtime-alarm-table { border-collapse:collapse;width:100%;font-size:11px; }
        .sas-runtime-shell .runtime-alarm-table th { background:#143451;text-align:left;padding:7px;border:1px solid #34516a; }
        .sas-runtime-shell .runtime-alarm-table td { padding:7px;border-bottom:1px solid #304a65; }
        /* Severity coloring applies only to active alarm rows, never to SOE. */
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=CRITICAL] { background:#a71925; color:#fff; border-left:4px solid #ff6874; }
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=MAJOR] { background:#ad5708; color:#fff; border-left:4px solid #ffb65e; }
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=MINOR],
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=WARNING] { background:#a58509; color:#fff; border-left:4px solid #ffe569; }
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=CRITICAL] td,
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=MAJOR] td,
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=MINOR] td,
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=true][data-severity=WARNING] td { color:#fff; border-bottom-color:rgba(255,255,255,.22); }
        .sas-runtime-shell .runtime-alarm-table tr[data-alarm-active=false] { background:#0b233c; color:#a9bacd; }

        .reference-sld .reference-hide-on-sld { display:none; }
        .reference-sld .reference-manager { position:relative; z-index:2; }
        .reference-sld .reference-manager button { padding:4px 8px; font-size:10px; box-shadow:none; border-width:1px; }
        .reference-sld .reference-directory-extra { display:none; }
        .reference-sld .runtime-nav button { min-height:60px; }
        .reference-sld .runtime-panel { border-radius:3px; }
        .reference-sld .reference-workstation-toolbar { display:none; }
        .reference-sld .reference-sld-workspace { grid-template-columns: 13% minmax(0,1fr) 22%; gap:6px; min-height:580px; }
        .reference-sld .reference-sld-workspace > div, .reference-sld .reference-sld-workspace > aside { grid-column:auto !important; min-width:0; max-height:650px; border-color:#477398; background:#061a31; }
        .reference-sld .reference-sld-workspace > aside { grid-column:3 !important; grid-row:1; width:100%; overflow-y:auto; }
        .reference-sld .reference-sld-workspace > div:nth-child(2) { grid-column:2 !important; grid-row:1; }
        .reference-sld .reference-sld-workspace > div:first-child { grid-column:1 !important; grid-row:1; }
        .reference-sld .reference-sld-workspace > div:nth-child(2) > div:first-child { justify-content:center; }
        .reference-sld .reference-sld-workspace > div:nth-child(2) > div:first-child span { font-size:14px; }
        /* Keep alternative view content visible; only the SLD legend is hidden by its own class. */
        .reference-sld .reference-sld-workspace .reference-iec-legend { display:none; }
        .reference-sld .reference-sld-workspace .sld-main-svg { min-width:600px; }
        .reference-sld .reference-sld-workspace aside svg { min-width:0 !important; max-width:100%; flex-shrink:0; }
        .reference-sld .reference-sld-workspace > aside { overflow-x:hidden; }
        .reference-sld .reference-sld-workspace > div:nth-child(2) > div:nth-child(3) { height:570px; padding:0; }
        .reference-sld .reference-sld-workspace > div:last-child { padding:8px; gap:6px; }
        @media(max-width:1100px){.reference-sld .reference-sld-workspace{grid-template-columns:180px minmax(650px,1fr) 285px;overflow-x:auto;}}
      `}</style>
      <div className="runtime-panel flex flex-wrap items-center justify-between gap-3 px-3 py-2">
        <div className="flex items-center gap-3"><div className="rounded border border-blue-500 bg-[#164b81] p-2"><GitBranch className="h-6 w-6 text-white"/></div>
          <div><div className="text-base font-bold text-white">Substation Automation System</div><div className="text-[11px] text-slate-300">132 / 33 / 11 kV Substation — SCADA / HMI Runtime</div></div></div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold">
          <span className="rounded bg-red-800 px-2 py-1 text-white">A {alarms.filter(a => a.severity === 'CRITICAL' && a.state !== 'CLEARED').length}</span>
          <span className="rounded bg-amber-600 px-2 py-1 text-white">W {alarms.filter(a => a.severity === 'MAJOR' && a.state !== 'CLEARED').length}</span>
          <span className="rounded bg-blue-600 px-2 py-1 text-white">I {alarms.filter(a => a.severity === 'MINOR' && a.state !== 'CLEARED').length}</span>
          <span className="border-l border-[#355777] pl-3 font-mono text-slate-200">{new Date().toLocaleString()}</span>
          <span className="border-l border-[#355777] pl-3 text-white">● Operator</span>
        </div>
      </div>
      <nav className="runtime-nav grid grid-cols-4 gap-1 sm:grid-cols-9" aria-label="Runtime navigation">
        {([
          ['Dashboard',Layers],['SLD',GitBranch],['Bay Control',Settings2],['Alarms',AlertTriangle],
          ['Events (SOE)',Bell],['Trends',Activity],['Reports',Layers],['Engineering',Cpu],['User',Eye]
        ] as const).map(([label,Icon])=><button key={label} type="button"
          data-selected={(runtimeScreen==='DASHBOARD' && label==='Dashboard') || (runtimeScreen==='TRENDS' && label==='Trends') || (runtimeScreen==='SLD' && ((label==='SLD' && primaryView==='SLD') || (label==='Bay Control' && primaryView==='BAY_MATRIX') || (label==='Alarms' && primaryView==='ALARMS_SOE' && runtimePanel==='ALARMS') || (label==='Events (SOE)' && primaryView==='ALARMS_SOE' && runtimePanel==='SOE'))) || (runtimeScreen==='REPORTS' && (engineeringDetailsOpen ? label==='Engineering' : label==='Reports')) || (runtimeScreen==='USER' && label==='User')}
          onClick={()=>{setEngineeringDetailsOpen(false);if(label==='Dashboard')setRuntimeScreen('DASHBOARD');else if(label==='Trends')setRuntimeScreen('TRENDS');else if(label==='Reports')setRuntimeScreen('REPORTS');else if(label==='User')setRuntimeScreen('USER');else {setRuntimeScreen('SLD');if(label==='Bay Control')setPrimaryView('BAY_MATRIX');else if(label==='Alarms'||label==='Events (SOE)'){setPrimaryView('ALARMS_SOE');setRuntimePanel(label==='Alarms'?'ALARMS':'SOE');}else setPrimaryView('SLD');}if(label==='Engineering'){setEngineeringDetailsOpen(true);setRuntimeScreen('REPORTS');}}}
          className="flex flex-col items-center justify-center gap-1 border border-[#355c7e] bg-[#102b4b] px-1 py-2 text-[11px] font-semibold text-slate-100 hover:bg-[#164674]">
          <Icon className="h-5 w-5"/><span>{label}</span></button>)}
      </nav>
      {runtimeScreen==='DASHBOARD' && <section className="runtime-panel p-4 md:p-5 space-y-4 min-h-[480px]" aria-label="Substation dashboard">
        <div className="flex flex-wrap justify-between items-center gap-3 border-b border-[#315779] pb-3"><div><h2 className="text-lg font-bold text-white">Substation Dashboard</h2><p className="text-xs text-slate-300">132 / 33 / 11 kV — Live training simulation overview</p></div><button type="button" className="runtime-tab px-4 py-2 text-xs font-bold" onClick={()=>{setRuntimeScreen('SLD');setPrimaryView('SLD');}}>Open Single Line Diagram</button></div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[['IEDs Online',`${onlineIedsCount} / ${ieds.length}`,'text-green-400'],['Station Import',`${totalImportMw.toFixed(1)} MW`,'text-cyan-300'],['Reactive Power',`${totalImportMvar.toFixed(1)} MVAr`,'text-blue-300'],['System Frequency',`${systemFreqHz.toFixed(2)} Hz`,'text-green-400']].map(([label,value,color])=><div key={label} className="rounded border border-[#315779] bg-[#0c2a49] p-4"><div className="text-xs text-slate-300">{label}</div><div className={`mt-2 text-xl font-bold ${color}`}>{value}</div></div>)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <div className="border border-[#315779] bg-[#09213b] rounded p-4 space-y-3"><h3 className="font-bold text-cyan-300">Station Equipment</h3><div className="flex justify-between text-sm border-b border-[#315779] pb-2"><span>Configured Bays</span><strong>{bays.length}</strong></div><div className="flex justify-between text-sm border-b border-[#315779] pb-2"><span>Closed Circuit Breakers</span><strong className="text-green-400">{bays.filter(b=>b.breakerState==='CLOSED').length}</strong></div><div className="flex justify-between text-sm"><span>Open Circuit Breakers</span><strong>{bays.filter(b=>b.breakerState==='OPEN').length}</strong></div><button type="button" className="runtime-tab px-3 py-2 text-xs" onClick={()=>{setRuntimeScreen('SLD');setPrimaryView('BAY_MATRIX');}}>View Bay Control</button></div>
          <div className="border border-[#315779] bg-[#09213b] rounded p-4 space-y-3"><h3 className="font-bold text-cyan-300">Alarms & Events</h3><div className="flex justify-between text-sm border-b border-[#315779] pb-2"><span>Active Critical</span><strong className="text-red-400">{alarms.filter(a=>a.severity==='CRITICAL' && a.state!=='CLEARED').length}</strong></div><div className="flex justify-between text-sm border-b border-[#315779] pb-2"><span>Active Major</span><strong className="text-amber-400">{alarms.filter(a=>a.severity==='MAJOR' && a.state!=='CLEARED').length}</strong></div><div className="flex justify-between text-sm"><span>Active Minor</span><strong className="text-yellow-300">{alarms.filter(a=>a.severity==='MINOR' && a.state!=='CLEARED').length}</strong></div><button type="button" className="runtime-tab px-3 py-2 text-xs" onClick={()=>{setRuntimeScreen('SLD');setPrimaryView('ALARMS_SOE');setRuntimePanel('ALARMS');}}>View Alarms</button></div>
        </div>
      </section>}
      {runtimeScreen==='USER' && <section className="runtime-panel p-6 min-h-[350px]"><h2 className="text-lg font-bold mb-3">Operator Session</h2><p className="text-sm text-slate-300">SCADA simulation operator workstation · use the website profile menu for account settings.</p></section>}
      {runtimeScreen==='TRENDS' && <section className="grid grid-cols-1 lg:grid-cols-[180px_minmax(0,1fr)_250px] gap-2 min-h-[570px]">
        <aside className="runtime-panel p-3 text-xs"><h3 className="font-bold border-b border-[#315779] pb-2">Project</h3><div className="mt-3 font-semibold">▾ 132_33_11kV_SAS</div>{['Overview','Single Line Diagram','Bay Control','Alarms','Events (SOE)','Trends','Reports'].map(label=><button key={label} type="button" onClick={()=>{setRuntimeScreen(label==='Trends'?'TRENDS':label==='Reports'?'REPORTS':'SLD');if(label==='Single Line Diagram')setPrimaryView('SLD');if(label==='Bay Control')setPrimaryView('BAY_MATRIX');if(label==='Alarms'||label==='Events (SOE)'){setPrimaryView('ALARMS_SOE');setRuntimePanel(label==='Alarms'?'ALARMS':'SOE');}}} className={`block w-full text-left px-2 py-2 mt-1 border ${label==='Trends'?'bg-[#1266b9] border-[#48b7ff]':'bg-[#09213b] border-transparent hover:bg-[#164674]'}`}>{label}</button>)}</aside>
        <div className="runtime-panel min-w-0 flex flex-col"><div className="px-4 py-2 bg-[#0c3157] border-b border-[#315779] font-bold text-center">132 / 33 / 11 kV — LIVE TRENDS</div>
          <div className="flex flex-wrap gap-2 items-center px-3 py-2 text-xs border-b border-[#315779]">
            <label>Samples <select className="bg-[#102b4b] border border-[#355c7e] p-1" value={trendRange} onChange={e=>setTrendRange(e.target.value)}><option value="10">Last 10</option><option value="20">Last 20</option></select></label>
            <button className="runtime-tab px-3 py-1" onClick={()=>{if(!trendPaused)setTrendSnapshot([...trendHistory]);setTrendPaused(!trendPaused);}}>{trendPaused?'▶ Resume Live':'Ⅱ Pause'}</button>
            <span className={trendPaused?'text-amber-300':'text-green-400'}>{trendPaused?'● PAUSED':'● LIVE'}</span>
            <button className="runtime-tab px-3 py-1 ml-auto" onClick={exportTrendCsv}>↓ Export CSV</button>
          </div>
          <div className="flex-1 min-h-[340px] p-3"><ResponsiveContainer width="100%" height="100%"><LineChart data={trendRows} margin={{top:15,right:15,left:0,bottom:5}}><CartesianGrid stroke="#1b4163" strokeDasharray="3 4"/><XAxis dataKey="time" stroke="#b9d6ee" tick={{fontSize:10}}/><YAxis yAxisId="voltage" stroke="#00d8ff" tick={{fontSize:10}} domain={[0,150]}/><YAxis yAxisId="other" orientation="right" stroke="#ffd12a" tick={{fontSize:10}}/><Tooltip contentStyle={{background:'#061a34',border:'1px solid #4aa7e0',color:'#fff'}}/><Legend wrapperStyle={{fontSize:11}}/>{trendChannels.filter(c=>trendEnabled.includes(c.key)).map(c=><Line key={c.key} yAxisId={c.key.startsWith('v')?'voltage':'other'} type="monotone" dataKey={c.key} name={c.label} stroke={c.color} strokeWidth={2} dot={false} isAnimationActive={false}/>)}</LineChart></ResponsiveContainer></div>
          <div className="overflow-x-auto border-t border-[#315779]"><table className="runtime-alarm-table"><thead><tr><th>Parameter</th><th>Current</th><th>Min</th><th>Max</th><th>Average</th></tr></thead><tbody>{trendChannels.filter(c=>trendEnabled.includes(c.key)).map(c=>{const vals=trendRows.map(p=>Number(p[c.key]));const current=vals[vals.length-1]??0;return <tr key={c.key}><td style={{color:c.color}}>{c.label}</td><td>{current.toFixed(2)} {c.unit}</td><td>{Math.min(...(vals.length?vals:[0])).toFixed(2)}</td><td>{Math.max(...(vals.length?vals:[0])).toFixed(2)}</td><td>{(vals.reduce((a,b)=>a+b,0)/(vals.length||1)).toFixed(2)}</td></tr>})}</tbody></table></div>
        </div>
        <aside className="runtime-panel p-3 text-xs"><h3 className="font-bold border-b border-[#315779] pb-2">Trend Variables</h3><div className="space-y-3 mt-3">{trendChannels.map(c=><label key={c.key} className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={trendEnabled.includes(c.key)} onChange={e=>setTrendEnabled(old=>e.target.checked?[...old,c.key]:old.filter(k=>k!==c.key))}/><span style={{color:c.color}}>━</span>{c.label}</label>)}</div><h3 className="font-bold border-b border-[#315779] pb-2 mt-8">Current Values</h3>{trendChannels.map(c=><div key={c.key} className="flex justify-between gap-2 py-2 border-b border-[#1b4163]"><span>{c.label}</span><b style={{color:c.color}}>{Number(trendHistory[trendHistory.length-1]?.[c.key]??0).toFixed(2)} {c.unit}</b></div>)}</aside>
      </section>}
      {runtimeScreen==='REPORTS' && !engineeringDetailsOpen && <section className="runtime-panel p-5 min-h-[350px] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="font-bold text-xl text-cyan-200">132 kV Source Transfer — FAT/SAT Report</h2>
            <p className="text-xs text-slate-300 mt-1">Training simulation only • Evidence from current SOE and alarm records • Not a physical site SAT certificate</p><p className="text-xs text-cyan-300 mt-1">Last report refresh: {reportRefreshedAt.toLocaleTimeString()} • Live SOE/alarm changes update automatically</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" className="runtime-tab px-3 py-2" onClick={refreshSourceTransferReport} title="Recheck current SOE and alarm evidence without leaving Reports">↻ Refresh Report</button>
            <button type="button" className="runtime-tab px-3 py-2" onClick={exportSourceTransferPdf}>Download {transferDirection === 'FORWARD' ? 'Forward' : 'Reverse'} FAT/SAT PDF</button>
            <button type="button" className="runtime-tab px-3 py-2" onClick={() => window.print()}>Print Report</button>
            <button type="button" className="runtime-tab px-3 py-2" onClick={exportTrendCsv}>Trend CSV</button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 rounded border border-[#315779] bg-[#09213b] p-3 text-sm">
          <span className="font-semibold text-cyan-200" id="transfer-direction-label">Source Transfer Scenario</span>
          <div role="group" aria-labelledby="transfer-direction-label" className="inline-flex flex-wrap gap-2">
            <button type="button" aria-pressed={transferDirection === 'FORWARD'} onClick={() => setTransferDirection('FORWARD')} className={`rounded border px-3 py-2 font-semibold transition-colors ${transferDirection === 'FORWARD' ? 'border-cyan-300 bg-[#1264a3] text-white' : 'border-[#355c7e] bg-[#102b4b] text-slate-200 hover:bg-[#19446c]'}`}>Forward — 132-L2 → 132-L3</button>
            <button type="button" aria-pressed={transferDirection === 'REVERSE'} onClick={() => setTransferDirection('REVERSE')} className={`rounded border px-3 py-2 font-semibold transition-colors ${transferDirection === 'REVERSE' ? 'border-cyan-300 bg-[#1264a3] text-white' : 'border-[#355c7e] bg-[#102b4b] text-slate-200 hover:bg-[#19446c]'}`}>Reverse — 132-L3 → 132-L2</button>
          </div>
          <span className="text-slate-300">Independent ordered SOE verification • {transferReport.from} → {transferReport.to}</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <div className="rounded border border-[#315779] p-3">Test cases <strong className="block text-xl">{sourceTransferCases.length}</strong></div>
          <div className="rounded border border-[#315779] p-3">Observed <strong className="block text-xl text-green-300">{sourceTransferCases.filter(r=>r.status==='OBSERVED').length}</strong></div>
          <div className="rounded border border-[#315779] p-3">Not verified <strong className="block text-xl text-amber-300">{sourceTransferCases.filter(r=>r.status==='NOT VERIFIED').length}</strong></div>
          <div className="rounded border border-[#315779] p-3">Active alarms <strong className="block text-xl">{alarms.filter(a=>a.state!=='CLEARED').length}</strong></div>
        </div>
        <div className="overflow-x-auto"><table className="runtime-alarm-table w-full">
          <thead><tr><th>Test ID</th><th>Expected verification</th><th>Evidence status</th><th>Actual SOE / Alarm evidence</th></tr></thead>
          <tbody>{sourceTransferCases.map(r=><tr key={r.id}>
            <td className="font-mono">{r.id}</td><td>{r.title}</td>
            <td className={r.status==='OBSERVED'?'text-green-300':'text-amber-300'}>{r.status}</td>
            <td className="text-xs font-mono">{r.evidence}</td>
          </tr>)}</tbody>
        </table></div>
        <p className="text-xs text-slate-400">OBSERVED means matching simulator evidence exists; it does not prove the full switching sequence, physical IED behavior, or independent time accuracy. Missing evidence is NOT VERIFIED, never automatically PASS.</p>
      </section>}
      <div style={{display:runtimeScreen==='SLD'?'contents':'none'}}>
      {/* ==================== 1. TOP SCADA SYSTEM STATUS & TELEMETRY HEADER (#081A30) ==================== */}
      <div className="px-3.5 py-2 rounded-lg bg-[#081A30] border border-[#142A3C] flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]" />
            <span className="text-xs font-extrabold tracking-wider uppercase text-[#E9F3FF]">
              SCADA / HMI OPERATOR WORKSTATION — 132/33/11 kV
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-[#0B1D30] border border-[#142A3C] text-[11px] font-mono text-[#00CFFF]">
            MMS: {onlineIedsCount}/{ieds.length} IEDs ONLINE
          </span>
          <span className="px-2 py-0.5 rounded bg-[#0B1D30] border border-[#142A3C] text-[11px] font-mono text-[#22C55E]">
            Import: {totalImportMw.toFixed(1)} MW | {totalImportMvar.toFixed(1)} MVAr | {systemFreqHz.toFixed(2)} Hz
          </span>
        </div>

        {/* Collapsible Drawer Controls & Operator Full Screen Button */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          <button
            type="button"
            onClick={() => setLeftDirectoryCollapsed((c) => !c)}
            className={`px-2 py-1 rounded border font-semibold flex items-center gap-1 ${
              !leftDirectoryCollapsed
                ? 'bg-[#142A3C] text-[#00CFFF] border-[#00CFFF]/40'
                : 'bg-[#050B14] text-slate-400 border-[#142A3C]'
            }`}
            title="Toggle Left Bay Directory"
          >
            <ChevronLeft className="w-3 h-3" />
            Bay Dir
          </button>

          <button
            type="button"
            onClick={() => {
              if (!operatorSelectedBayId) return;
              setRightInspectorCollapsed((c) => !c);
            }}
            className={`px-2 py-1 rounded border font-semibold flex items-center gap-1 ${
              !rightInspectorCollapsed
                ? 'bg-[#142A3C] text-[#00CFFF] border-[#00CFFF]/40'
                : 'bg-[#050B14] text-slate-400 border-[#142A3C]'
            }`}
            title="Toggle Right Equipment Inspector"
          >
            Inspector
            <ChevronRight className="w-3 h-3" />
          </button>

          <button
            type="button"
            onClick={toggleSimulationRunning}
            className={`px-2.5 py-1 rounded font-semibold border ${
              simulationRunning
                ? 'bg-[#22C55E]/15 text-[#22C55E] border-[#22C55E]/40'
                : 'bg-[#FFB547]/15 text-[#FFB547] border-[#FFB547]/40'
            }`}
          >
            {simulationRunning ? 'Sim: LIVE' : 'Sim: PAUSED'}
          </button>

          <button
            type="button"
            onClick={() => setIsOperatorFullScreen((f) => !f)}
            className="px-2.5 py-1 rounded bg-[#168BFF] hover:bg-[#00CFFF] hover:text-slate-950 text-white font-bold flex items-center gap-1 transition"
          >
            {isOperatorFullScreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5" /> Exit Operator Full Screen
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5" /> Operator Full Screen
              </>
            )}
          </button>
        </div>
      </div>

      {/* ==================== 2. DEDICATED INDUSTRIAL ALARM BANNER ==================== */}
      <div
        className={`reference-hide-on-sld px-3.5 py-2 rounded-lg border flex flex-wrap items-center justify-between gap-2 ${
          unackCount > 0
            ? 'bg-[#FF5C65]/15 border-[#FF5C65] text-[#E9F3FF]'
            : 'bg-[#0B1D30] border-[#142A3C] text-[#E9F3FF]'
        }`}
      >
        <div className="flex flex-wrap items-center gap-2.5">
          <div
            className={`p-1.5 rounded ${
              unackCount > 0 ? 'bg-[#FF5C65] text-white animate-pulse' : 'bg-[#22C55E]/20 text-[#22C55E]'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold uppercase tracking-wider">
              <span>ISA-18.2 ALARM BANNER</span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#FF5C65] text-[10px] font-mono border border-[#FF5C65]/40">
                CRITICAL: {criticalCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#FFB547] text-[10px] font-mono border border-[#FFB547]/40">
                MAJOR: {majorCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#00CFFF] text-[10px] font-mono border border-[#00CFFF]/40">
                WARN: {warningCount}
              </span>
              <span className="px-1.5 py-0.2 rounded bg-[#050B14] text-[#E9F3FF] text-[10px] font-mono">
                UNACK: {unackCount}
              </span>
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5 font-mono">
              {alarms[0]
                ? `[${alarms[0].timestamp.split('T')[1]}] [${alarms[0].severity}] ${alarms[0].bayName} — ${alarms[0].signalName}: ${alarms[0].valueText}`
                : 'System Normal — All 132/33/11 kV protection, transformer, and communication points healthy'}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={handleAcknowledgeSelected}
            className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] border border-[#00CFFF]/40 font-semibold text-xs"
          >
            Acknowledge Selected
          </button>
          <button
            type="button"
            onClick={acknowledgeAllAlarms}
            className="px-2.5 py-1 rounded bg-[#00CFFF] hover:bg-[#168BFF] text-slate-950 font-bold text-xs flex items-center gap-1"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            Acknowledge All ({unackCount})
          </button>
          <button
            type="button"
            onClick={clearClearedAlarms}
            className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-slate-800 text-[#E9F3FF] border border-slate-700 text-xs flex items-center gap-1"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Purge Cleared
          </button>
        </div>
      </div>

      {/* 132 kV Bus Transfer Controller — educational simulation only */}
      {primaryView === 'BAY_MATRIX' && <div className="rounded-lg border border-[#1E3A5F] bg-[#081A30] p-3 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-xs font-bold tracking-wider text-[#00CFFF]">132 kV BUS TRANSFER CONTROLLER · CB-132</div>
          <div className="flex gap-2 items-center">
            {(['AUTO', 'MANUAL'] as const).map((mode) => (
              <button key={mode} type="button" onClick={() => setBusTransferMode(mode)}
                className={`px-3 py-1.5 rounded text-xs font-bold border ${busTransferMode === mode ? 'bg-[#00CFFF] text-[#050B14] border-[#00CFFF]' : 'bg-[#050B14] text-slate-300 border-[#1E3A5F]'}`}>
                {mode}
              </button>
            ))}
            <button type="button" disabled={busTransferMode !== 'MANUAL'} onClick={() => requestBusTransfer()}
              className="px-3 py-1.5 rounded text-xs font-bold bg-[#142A3C] border border-[#1E3A5F] text-[#E9F3FF] disabled:opacity-40">
              Request Transfer
            </button>
          </div>
        </div>
        <div className={`text-xs font-mono ${busTransferStatus === 'SUCCESS' ? 'text-[#22C55E]' : busTransferStatus === 'BLOCKED' ? 'text-[#FFB547]' : 'text-slate-300'}`}>
          {busTransferStatus}: {busTransferMessage}
        </div>
        <div className="text-[10px] text-slate-400">Dead-bus transfer only · healthy alternate source · failed incomer OPEN · CILO1 / 43LR permissives · no automatic paralleling</div>
      </div>}


      {/* Operator Command Execution / Rejection Feedback Banner */}
      {operatorFeedback && (
        <div
          className={`px-3.5 py-2 rounded-lg border text-xs flex items-center justify-between gap-2 ${
            operatorFeedback.status === 'REJECTED'
              ? 'bg-[#FF5C65]/15 border-[#FF5C65] text-red-100'
              : operatorFeedback.status === 'SUCCESS'
              ? 'bg-[#22C55E]/15 border-[#22C55E] text-emerald-100'
              : 'bg-[#142A3C] border-[#00CFFF] text-cyan-100'
          }`}
        >
          <div>
            <span className="font-bold mr-2">[{operatorFeedback.title}]</span>
            <span className="font-mono text-[11px]">{operatorFeedback.detail}</span>
          </div>
          <button
            type="button"
            onClick={() => setOperatorFeedback(null)}
            className="px-2 py-0.5 rounded bg-black/30 hover:bg-black/50 text-[11px] font-bold"
          >
            Close
          </button>
        </div>
      )}

      {/* ==================== 3. MAIN THREE-COLUMN OPERATOR WORKSPACE (COLLAPSIBLE LEFT / CENTER / COLLAPSIBLE RIGHT) ==================== */}
      <div className="reference-sld-workspace grid grid-cols-1 xl:grid-cols-12 gap-1.5 flex-1 min-h-0 items-stretch">
        {/* COLLAPSIBLE LEFT COLUMN (2 Cols): View Navigation, Voltage-Level Filter & Bay Directory */}
        {!leftDirectoryCollapsed && (
          <div className="xl:col-span-2 min-w-0 bg-[#0B1D30] border border-[#142A3C] rounded-lg p-2.5 flex flex-col gap-2.5 xl:max-h-[710px] overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Project · 132_33_11kV_SAS
              </span>
              <button
                type="button"
                onClick={() => setLeftDirectoryCollapsed(true)}
                className="text-[10px] text-slate-400 hover:text-white"
                title="Collapse Bay Directory"
              >
                ◀ Hide
              </button>
            </div>

            <div className="space-y-1">
              {(
                [
                  ['SLD', 'Single Line Diagram'],
                  ['BAY_MATRIX', 'Bay Control'],
                  ['TRANSFORMERS', 'Transformer'],
                  ['ALARMS_SOE', 'Alarms & Events (SOE)'],
                ] as [ScadaPrimaryView, string][]
              ).map(([viewKey, label]) => (
                <button
                  key={viewKey}
                  type="button"
                  onClick={() => { setRuntimeScreen('SLD'); setPrimaryView(viewKey); }}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold border transition ${
                    primaryView === viewKey
                      ? 'bg-[#168BFF] text-white border-[#00CFFF]'
                      : 'bg-[#050B14] text-slate-300 border-[#142A3C] hover:bg-[#142A3C]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-1 border-t border-[#284866] pt-2" aria-label="Additional project screens">
              <button type="button" onClick={() => { setRuntimeScreen('TRENDS'); }} className="w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold border border-[#284866] bg-[#09213b] text-slate-200 hover:bg-[#164674]">Trends</button>
              <button type="button" onClick={() => { setRuntimeScreen('REPORTS'); setEngineeringDetailsOpen(false); }} className="w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold border border-[#284866] bg-[#09213b] text-slate-200 hover:bg-[#164674]">Reports</button>
              <button type="button" onClick={() => { setRuntimeScreen('REPORTS'); setEngineeringDetailsOpen(true); }} className="w-full text-left px-2.5 py-1.5 rounded text-xs font-semibold border border-[#284866] bg-[#09213b] text-slate-200 hover:bg-[#164674]">Engineering</button>
            </div>

            {/* Voltage-Level Selection */}
            <div className="reference-directory-extra space-y-1 pt-2 border-t border-[#142A3C]">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Voltage Filter
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {(['ALL', 132, 33, 11] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setVoltageFilter(v)}
                    className={`py-1 rounded font-semibold border ${
                      voltageFilter === v
                        ? 'bg-[#00CFFF] text-slate-950 border-[#00CFFF]'
                        : 'bg-[#050B14] text-slate-300 border-[#142A3C] hover:border-slate-600'
                    }`}
                  >
                    {v === 'ALL' ? 'All Levels' : `${v} kV`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Equipment Search & Bay List */}
            <div className="reference-directory-extra space-y-1.5 pt-2 border-t border-[#142A3C] flex-1 flex flex-col min-h-0">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Bay Directory ({filteredDirectoryBays.length})
              </div>
              <div className="relative">
                <Search className="w-3 h-3 text-slate-400 absolute left-2 top-2" />
                <input
                  type="text"
                  value={baySearch}
                  onChange={(e) => setBaySearch(e.target.value)}
                  placeholder="Filter bay/CB..."
                  className="w-full pl-6 pr-2 py-1 rounded bg-[#050B14] border border-[#142A3C] text-[11px] text-[#E9F3FF] focus:outline-none focus:border-[#00CFFF]"
                />
              </div>

              <div className="max-h-[350px] xl:max-h-[480px] overflow-y-auto space-y-1 pr-0.5">
                {filteredDirectoryBays.map((b) => {
                  const isSel = operatorSelectedBayId === b.id;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      onClick={() => {
                        selectBayInScada(b.id);
                      }}
                      className={`w-full text-left p-1.5 rounded border text-[11px] flex items-center justify-between transition ${
                        isSel
                          ? 'bg-[#142A3C] border-[#00CFFF] text-[#E9F3FF]'
                          : 'bg-[#050B14] border-[#142A3C]/70 text-slate-300 hover:bg-[#142A3C]/50'
                      }`}
                    >
                      <div className="truncate pr-1">
                        <div className="font-bold font-mono text-[11px] text-[#E9F3FF]">
                          {b.bayCode}
                        </div>
                        <div className="text-[9.5px] text-slate-400 font-mono">
                          {b.activePowerMw.toFixed(1)} MW • {b.currentA.toFixed(0)}A
                        </div>
                      </div>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[9px] font-bold font-mono ${
                          b.protectionTripActive
                            ? 'bg-[#FF5C65] text-white animate-pulse'
                            : b.breakerState === 'CLOSED'
                            ? 'bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/40'
                            : 'bg-[#22C55E]/20 text-[#22C55E] border border-[#22C55E]/40'
                        }`}
                      >
                        {b.breakerState === 'CLOSED' ? 'CLS' : 'OPN'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CENTER COLUMN: Main Interactive 132/33/11 kV SCADA Single-Line Diagram */}
        <div
          ref={sldPanelRef}
          className={`${sldOnlyFullScreen && primaryView === 'SLD' ? 'fixed inset-0 z-[100] !w-screen !h-[100dvh] !max-w-none shadow-[0_0_0_9999px_rgba(0,0,0,0.88)]' : centerColSpanClass} min-w-0 bg-[#0B1D30] border border-[#142A3C] rounded-lg flex flex-col overflow-hidden`}
          style={sldOnlyFullScreen && primaryView === 'SLD' ? { width: '100vw', height: '100dvh', maxHeight: '100dvh' } : undefined}
        >
          {/* Center Workspace Header & Fit-to-Screen / Zoom In / Zoom Out / Reset View Controls */}
          <div className="px-3 py-2 bg-[#081A30] border-b border-[#142A3C] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#00CFFF]" />
              <span className="text-xs font-bold uppercase tracking-wider text-[#E9F3FF]">
                {primaryView === 'SLD'
                  ? 'PRIMARY SCADA 132 / 33 / 11 kV SINGLE-LINE DIAGRAM'
                  : primaryView === 'BAY_MATRIX'
                  ? 'OPERATOR BAY STATUS MATRIX VIEW'
                  : primaryView === 'TRANSFORMERS'
                  ? 'TRANSFORMER MONITORING OVERVIEW (T1, T2, DT1, DT2)'
                  : 'DEDICATED ALARM & MILLISECOND SOE VIEW'}
              </span>
            </div>

            {primaryView === 'SLD' && (
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <button
                  type="button"
                  onClick={handleFitToScreen}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold"
                >
                  Fit to Screen
                </button>
                <button
                  type="button"
                  onClick={() => setSldZoom((z) => Math.min(1.6, Number((z + 0.12).toFixed(2))))}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold flex items-center gap-0.5"
                  title="Zoom In SLD"
                >
                  <Plus className="w-3 h-3" /> Zoom In
                </button>
                <span className="px-1.5 font-mono text-[11px] text-[#00CFFF]">
                  {Math.round(sldZoom * 100)}%
                </span>
                <button
                  type="button"
                  onClick={() => setSldZoom((z) => Math.max(0.68, Number((z - 0.12).toFixed(2))))}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold flex items-center gap-0.5"
                  title="Zoom Out SLD"
                >
                  <Minus className="w-3 h-3" /> Zoom Out
                </button>
                <button type="button" onClick={toggleSldFullScreen}
                  title={sldOnlyFullScreen ? 'Exit SLD full screen' : 'Full screen SLD only'}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold flex items-center gap-1">
                  {sldOnlyFullScreen ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  {sldOnlyFullScreen ? 'Exit Full Screen' : 'Full Screen'}
                </button>
                <button
                  type="button"
                  onClick={handleResetView}
                  className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] text-[11px] font-semibold"
                >
                  Reset View
                </button>
              </div>
            )}
          </div>

          {/* Compact IEC Symbol & Status Colour Legend Bar */}
          {primaryView === 'SLD' && (
            <div className="reference-iec-legend px-3 py-1.5 bg-[#050B14] border-b border-[#142A3C] flex flex-wrap items-center justify-between gap-2 text-[10.5px]">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-bold text-slate-400 uppercase">IEC Legend:</span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#EF4444] inline-block" /> CLOSED CB (52a)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm border-2 border-[#22C55E] bg-[#050B14] inline-block" /> OPEN CB (52b)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#FF5C65] inline-block" /> TRIPPED CB (86)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#A855F7] inline-block" /> Intermediate/Bad (00/11)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#00CFFF] inline-block" /> 132kV Live
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#22C55E] inline-block" /> 33/11kV Live
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-0.5 bg-[#475569] inline-block" /> De-energized
                </span>
                <span className="flex items-center gap-1">
                  <span className="px-1 rounded bg-[#FFB547] text-[#050B14] font-bold text-[9px]">Q:OLD</span> Bad/Old Quality
                </span>
              </div>
              <span className="text-slate-400 font-mono text-[10px]">
                Click any Breaker or Bay to inspect &amp; execute SBO controls
              </span>
            </div>
          )}

          {/* Primary Center View Content — Argon Dark-SCADA 132/33/11 kV Interactive SLD Structure */}
          {primaryView === 'SLD' && (
            <div
              ref={sldViewportRef}
              onWheel={(event) => { if (event.shiftKey && sldViewportRef.current) { sldViewportRef.current.scrollLeft += event.deltaY; event.preventDefault(); } }}
              className={`overflow-x-auto overflow-y-auto relative p-1.5 ${sldOnlyFullScreen ? 'flex-1 min-h-0' : 'h-[540px] sm:h-[620px] xl:h-[680px]'}`}
              style={{
                background: '#071b33',
              }}
            >
              <svg viewBox={`${-extraLeft} 0 ${operatorCanvasWidth} 820`} preserveAspectRatio="xMidYMin meet" className="select-none block" style={{ width: `${operatorCanvasWidth * sldZoom}px`, height: `${820 * sldZoom}px`, maxWidth: 'none', transform: `translate(${sldPanX}px, ${sldPanY}px)`, transformOrigin: 'top left' }}>
                <rect x={-extraLeft} width={operatorCanvasWidth} height="820" fill="#071b33" />
                <text x="600" y="32" fill="#e9f3ff" fontSize="22" fontWeight="bold" textAnchor="middle">132 / 33 / 11 kV SUBSTATION – SINGLE LINE DIAGRAM</text>
                <g fontFamily="Arial, sans-serif" fontSize="13" fill="#e9f3ff" fontWeight="bold">
                  <text x="32" y="153">132 kV</text><text x="88" y="219">132 kV BUS SECTION A</text><text x="965" y="219">132 kV BUS SECTION B</text>
                  <text x="88" y="234" fontSize="11">({bus132A.voltageKvLive.toFixed(1)} kV / 50.00 Hz)</text><text x="965" y="234" fontSize="11">({bus132B.voltageKvLive.toFixed(1)} kV / 50.00 Hz)</text>
                  <text x="88" y="392">33 kV BUS SECTION A</text><text x="965" y="392">33 kV BUS SECTION B</text>
                  <text x="88" y="407" fontSize="11">({bus33A.voltageKvLive.toFixed(2)} kV)</text><text x="965" y="407" fontSize="11">({bus33B.voltageKvLive.toFixed(2)} kV)</text>
                  <text x="88" y="652">11 kV SWITCHGEAR BUS A</text><text x="950" y="652">11 kV SWITCHGEAR BUS B</text>
                </g>
                <g strokeLinecap="round" strokeWidth="1.8" fill="none">
                  <path d={`M${65-extraLeft} 195 H550`} stroke={bus132A.energized ? '#ed3b42' : '#64748b'} />
                  <path d={`M650 195 H${1135+extraRight}`} stroke={bus132B.energized ? '#ed3b42' : '#64748b'} />
                  <path d={`M${65-extraLeft} 425 H550`} stroke={bus33A.energized ? '#18bd48' : '#64748b'} />
                  <path d={`M650 425 H${1135+extraRight}`} stroke={bus33B.energized ? '#18bd48' : '#64748b'} />
                  <path d={`M${65-extraLeft} 675 H550`} stroke={bus11A.energized ? '#d3aa00' : '#64748b'} />
                  <path d={`M650 675 H${1135+extraRight}`} stroke={bus11B.energized ? '#d3aa00' : '#64748b'} />
                </g>
                {renderReferenceCoupler('BAY-132-BC', 600, 195, '#ed3b42')}
                {renderReferenceCoupler('BAY-33-BC', 600, 425, '#18bd48')}
                {renderReferenceCoupler('BAY-11-BC', 600, 675, '#d3aa00')}
                {incoming132A.map((b,i)=>renderReferenceBay(b,operatorBayX('A',i,132),195,90,'#ed3b42','up'))}
                {incoming132B.map((b,i)=>renderReferenceBay(b,operatorBayX('B',i,132),195,90,'#ed3b42','up'))}
                {[{x:420,id:'BAY-132-T1',inc:'BAY-33-INC1',tx:txT1},{x:780,id:'BAY-132-T2',inc:'BAY-33-INC2',tx:txT2}].map((item,i) => <g key={item.id}>
                  {renderReferenceBay(bays.find(b=>b.id===item.id),item.x,195,260,'#ed3b42','down',false)}
                  <line x1={item.x} y1="260" x2={item.x} y2="425" stroke={item.tx?.energized ? '#18bd48' : '#64748b'} strokeWidth="1.8" />
                  <circle cx={item.x-9} cy="314" r="18" fill="none" stroke={item.tx?.energized ? "#e0b100" : "#64748b"} strokeWidth="3"/><circle cx={item.x+9} cy="314" r="18" fill="none" stroke={item.tx?.energized ? "#20a35e" : "#64748b"} strokeWidth="3"/>
                  <text x={item.x+33} y="309" fontSize="11" fill="#e9f3ff">{i===0?'T1':'T2'} · 132/33 kV</text>
                  <text x={item.x+33} y="325" fontSize="10" fill="#b8cde2">50 MVA · {item.tx?.loadPercent?.toFixed(1) || '0.0'}%</text>
                  {renderReferenceBay(bays.find(b=>b.id===item.inc),item.x,425,365,'#18bd48','up',false)}
                </g>)}
                {bay33BusA.map((b,i)=>renderReferenceBay(b,operatorBayX('A',i,33),425,505,'#18bd48','down',false))}
                {bay33BusB.map((b,i)=>renderReferenceBay(b,operatorBayX('B',i,33),425,505,'#18bd48','down',false))}
                {[{x:420,tx:txDt1,id:'BAY-11-INC1'},{x:780,tx:txDt2,id:'BAY-11-INC2'}].map((item,i)=><g key={item.id}>
                  <line x1={item.x} y1="425" x2={item.x} y2="675" stroke={item.tx?.energized ? "#d3aa00" : "#64748b"} strokeWidth="1.8"/>
                  <circle cx={item.x-8} cy="585" r="15" fill="none" stroke={item.tx?.energized ? "#d3aa00" : "#64748b"} strokeWidth="3"/><circle cx={item.x+8} cy="585" r="15" fill="none" stroke={item.tx?.energized ? "#20a35e" : "#64748b"} strokeWidth="3"/>
                  <text x={item.x+30} y="583" fontSize="10" fill="#e9f3ff">{i===0?'DT1':'DT2'} · 33/11 kV</text>
                  {renderReferenceBay(bays.find(b=>b.id===item.id),item.x,675,622,'#d3aa00','up',false)}
                </g>)}
                {bay11BusA.map((b,i)=>renderReferenceBay(b,operatorBayX('A',i,11),675,765,'#d3aa00','down',false))}
                {bay11BusB.map((b,i)=>renderReferenceBay(b,operatorBayX('B',i,11),675,765,'#d3aa00','down',false))}
              </svg>
            </div>
          )}

          {/* Retained Alternative View 2: Bay Status Matrix */}
          {primaryView === 'BAY_MATRIX' && (
            <div className="p-4 space-y-3 overflow-y-auto max-h-[680px]">
              <div className="grid grid-cols-2 sm:grid-cols-6 gap-2">
                {busbars.map((bus) => (
                  <div
                    key={bus.id}
                    className={`p-2 rounded border text-xs ${
                      bus.energized
                        ? 'bg-[#142A3C] border-[#22C55E]/50'
                        : 'bg-[#050B14] border-[#FF5C65]/60'
                    }`}
                  >
                    <div className="text-[10px] text-slate-400 truncate">{bus.id}</div>
                    <div className="font-bold text-[#E9F3FF] font-mono mt-0.5">
                      {bus.voltageKvLive.toFixed(2)} kV
                    </div>
                    <div
                      className={`text-[10px] font-semibold ${
                        bus.energized ? 'text-[#22C55E]' : 'text-[#FF5C65]'
                      }`}
                    >
                      {bus.energized ? 'LIVE' : 'DEAD'} • {bus.frequencyHz.toFixed(1)}Hz
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                {filteredDirectoryBays.map((bay) => {
                  const isSel = operatorSelectedBayId === bay.id;
                  return (
                    <button
                      key={bay.id}
                      type="button"
                      onClick={() => selectBayInScada(bay.id)}
                      className={`p-2.5 rounded border text-left transition ${
                        isSel
                          ? 'bg-[#142A3C] border-[#00CFFF] ring-1 ring-[#00CFFF]'
                          : 'bg-[#050B14] border-[#142A3C] hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#E9F3FF]">{bay.bayCode}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                            bay.breakerState === 'CLOSED'
                              ? 'bg-[#EF4444]/20 text-[#EF4444]'
                              : 'bg-[#22C55E]/20 text-[#22C55E]'
                          }`}
                        >
                          {bay.breakerState}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">{bay.name}</div>
                      <div className="text-[11px] font-mono text-[#00CFFF] mt-1">
                        {bay.activePowerMw.toFixed(1)} MW | {bay.currentA.toFixed(0)}A
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Alternative View 3: Dedicated T1, T2, DT1, DT2 Transformer Monitoring */}
          {primaryView === 'TRANSFORMERS' && (
            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto max-h-[680px]">
              {transformers.map((tx) => (
                <div
                  key={tx.id}
                  className="p-4 rounded-lg bg-[#050B14] border border-[#142A3C] space-y-2.5 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-[#142A3C] pb-2">
                    <div>
                      <div className="font-bold text-sm text-[#E9F3FF]">{tx.name}</div>
                      <div className="text-[11px] text-slate-400">
                        Rating: {tx.ratingMva} MVA • Vector: {tx.vectorGroup} • Z={tx.impedancePercent}%
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        tx.energized
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : 'bg-[#FF5C65]/20 text-[#FF5C65]'
                      }`}
                    >
                      {tx.energized ? 'ENERGIZED' : 'DE-ENERGIZED'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2 font-mono text-center bg-[#0B1D30] p-2.5 rounded border border-[#142A3C]">
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Active / Reactive</div>
                      <div className="text-[#00CFFF] font-bold">
                        {tx.activePowerMw.toFixed(1)} MW
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {tx.reactivePowerMvar.toFixed(1)} MVAr
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">Loading / Cooling</div>
                      <div className="text-[#22C55E] font-bold">{tx.loadPercent}%</div>
                      <div className="text-[10px] text-slate-300">{tx.coolingStage}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-400 font-sans">OTI / WTI Temp</div>
                      <div className="text-[#FFB547] font-bold">{tx.oilTempC}°C</div>
                      <div className="text-[10px] text-amber-300">WTI: {tx.windingTempLvC}°C</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-mono text-[11px]">
                      OLTC Tap: <strong className="text-[#00CFFF]">{tx.oltcTapPosition}</strong> ({tx.oltcMinTap}..{tx.oltcMaxTap})
                    </span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'LOWER')}
                        className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-[#168BFF] text-xs font-semibold"
                      >
                        OLTC Lower (-)
                      </button>
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'RAISE')}
                        className="px-2.5 py-1 rounded bg-[#142A3C] hover:bg-[#168BFF] text-xs font-semibold"
                      >
                        OLTC Raise (+)
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Alternative View 4: Full Alarm & SOE Console */}
          {primaryView === 'ALARMS_SOE' && (
            <div className="p-4 space-y-3 overflow-y-auto max-h-[680px] text-xs font-mono">
              <div className="text-xs font-bold text-[#00CFFF] uppercase font-sans">
                Complete Sequence of Events (SOE) — Millisecond Resolution ({filteredSoe.length} Records)
              </div>
              <div className="border border-[#142A3C] rounded overflow-hidden">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead className="bg-[#081A30] text-slate-300">
                    <tr>
                      <th className="p-2">Timestamp (ms)</th>
                      <th className="p-2">Bay / IED</th>
                      <th className="p-2">Event</th>
                      <th className="p-2">Cause</th>
                      <th className="p-2">Quality</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#142A3C] bg-[#050B14]">
                    {filteredSoe.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => setInspectedSoeEvent(s)}
                        className="hover:bg-[#142A3C]/50 cursor-pointer"
                      >
                        <td className="p-2 text-[#00CFFF]">{s.timestampMs}</td>
                        <td className="p-2 text-[#E9F3FF] font-sans">
                          {s.bayName} ({s.iedId})
                        </td>
                        <td className="p-2 text-slate-200 font-sans">{s.eventDescription}</td>
                        <td className="p-2 text-[#FFB547]">{s.cause}</td>
                        <td className="p-2 text-emerald-400">{s.quality}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Reference-style compact Bay Details inspector. All controls use the existing store and SBO confirmation. */}
        {!rightInspectorCollapsed && <aside className="xl:col-span-3 min-w-0 bg-[#071c35] border border-[#477398] rounded flex flex-col min-h-0 overflow-y-auto overflow-x-hidden h-[590px] text-[11px]">
          <div className="flex justify-between items-center bg-[#12385d] border-b border-[#497da8] px-2 py-1.5 shrink-0"><strong className="text-[13px] whitespace-nowrap min-w-0">Bay Details - {selectedBay.bayCode}</strong><button type="button" aria-label="Hide Bay Details" onClick={()=>setRightInspectorCollapsed(true)}><X className="w-4 h-4"/></button></div>
          <div className="grid grid-cols-4 gap-1 p-1 shrink-0">{(['Overview','Measurements','Controls','IEC 61850'] as InspectorTab[]).map(tab=><button type="button" key={tab} onClick={()=>setInspectorTab(tab)} className={`px-1 py-2 text-[10px] font-bold border border-[#436789] ${inspectorTab===tab?'bg-[#166bc4] text-white':'bg-[#0d2a49]'}`}>{tab==='IEC 61850'?'Interlocks':tab}</button>)}</div>
          {(inspectorTab==='All Sections'||inspectorTab==='Overview') && <div className="px-2 py-1.5 shrink-0">
            <div className="grid grid-cols-[minmax(0,1fr)_48px] gap-1 items-center"><div className="min-w-0 space-y-0.5">{[['Bay ID',selectedBay.bayCode],['Bay Name',selectedBay.name],['Bay Type',selectedBay.bayType.replace(/_/g,' ')],['Voltage',`${selectedBay.voltageKv} kV`],['Bus Section',selectedBay.busSection],['IED',selectedBay.iedId]].map(([label,value])=><div key={label} className="grid grid-cols-[62px_minmax(0,1fr)] gap-1 text-[10px] leading-4"><span className="text-slate-300">{label}</span><span className="font-semibold break-words min-w-0 leading-4">: {value}</span></div>)}</div><svg viewBox="0 0 65 95" className="w-[46px] h-[74px] block"><path d="M32 3V91" stroke="#2bf17c" strokeWidth="3"/><rect x="20" y="32" width="24" height="24" fill="#08233d" stroke="#2bf17c" strokeWidth="3"/><path d="M24 36L40 52M40 36L24 52" stroke="#2bf17c" strokeWidth="2"/><path d="M25 68L32 80L39 68" fill="none" stroke="#2bf17c" strokeWidth="3"/></svg></div>
          </div>}
          {(inspectorTab==='All Sections'||inspectorTab==='Overview'||inspectorTab==='Measurements') && <div className="mx-2 mb-1 border border-[#37658b] rounded overflow-hidden shrink-0"><div className="bg-[#123b62] px-2 py-1 font-bold text-[11px]">Live Measurements</div><div className="grid grid-cols-3 text-center">{[['I-A',`${selectedBay.currentA.toFixed(1)} A`],['I-B',`${selectedBay.currentA.toFixed(1)} A`],['I-C',`${selectedBay.currentA.toFixed(1)} A`],['P',`${selectedBay.activePowerMw.toFixed(1)} MW`],['Q',`${selectedBay.reactivePowerMvar.toFixed(1)} MVAr`],['PF',selectedBay.powerFactor.toFixed(2)]].map(([k,v])=><div key={k} className="bg-[#0a2542] border border-[#234765] px-1 py-0.5"><span className="block text-slate-300">{k}</span><strong className="text-[#45f583]">{v}</strong></div>)}</div></div>}
          {(inspectorTab==='All Sections'||inspectorTab==='Overview'||inspectorTab==='Controls') && <div className="mx-2 mb-1 border border-[#37658b] rounded overflow-hidden shrink-0"><div className="bg-[#123b62] px-2 py-1 font-bold text-[11px]">Equipment Status</div>{[['Circuit Breaker (CB)',selectedBay.breakerState],['Disconnector (DS-1)',selectedBay.busDisconnectorState],['Disconnector (DS-2)',selectedBay.lineDisconnectorState],['Earth Switch (ES)',selectedBay.earthSwitchState]].map(([k,v])=><div key={k} className="flex justify-between items-center px-2 py-0.5 border-b border-[#234765] leading-4"><span><span className={`inline-block w-2.5 h-2.5 rounded-full mr-2 ${v==='CLOSED'?'bg-green-400':'bg-slate-400'}`}/>{k}</span><strong className={`px-2 rounded ${v==='CLOSED'?'bg-green-800 text-green-100':'bg-slate-700'}`}>{v}</strong></div>)}</div>}
          {(inspectorTab==='All Sections'||inspectorTab==='Controls') && <div className="mx-2 mb-1 border border-[#37658b] rounded overflow-hidden shrink-0"><div className="bg-[#123b62] px-2 py-1 font-bold text-[11px]">Control (SBO)</div><div className="grid grid-cols-2 gap-1 p-1.5"><button type="button" onClick={()=>handleSelectSbo('CLOSED')} className="bg-green-700 border border-green-400 py-1 font-bold">CB CLOSE</button><button type="button" onClick={()=>handleSelectSbo('OPEN')} className="bg-red-700 border border-red-400 py-1 font-bold">CB OPEN</button>{pendingSboCommand && <><button type="button" onClick={handleConfirmOperate} className="col-span-2 bg-blue-600 border border-blue-300 py-2 font-bold">CONFIRM {pendingSboCommand} (SBO)</button><button type="button" onClick={()=>setPendingSboCommand(null)} className="col-span-2 bg-slate-700 py-1">Cancel Selection</button></>}{[['BUS_Q1','DS CLOSE','CLOSED'],['BUS_Q1','DS OPEN','OPEN'],['EARTH_Q8','ES CLOSE','CLOSED'],['EARTH_Q8','ES OPEN','OPEN']].map(([device,label,target])=><button key={`${device}${target}`} type="button" onClick={()=>commandDisconnector(selectedBay.id,device as 'BUS_Q1'|'EARTH_Q8',target as 'CLOSED'|'OPEN')} className="bg-[#244667] border border-[#6083a6] py-1 font-semibold">{label}</button>)}</div></div>}
          {(inspectorTab==='All Sections'||inspectorTab==='Controls') && <div className="mx-2 mb-2 border border-[#37658b] rounded overflow-hidden shrink-0" aria-label="Protection Testing Simulator">
            <div className="bg-[#123b62] px-2 py-1 font-bold text-[11px] flex items-center justify-between"><span>Protection Testing (Simulation)</span><span className={selectedBay.protectionTripActive?'text-red-300':'text-green-300'}>{selectedBay.protectionTripActive?'TRIP ACTIVE':'READY'}</span></div>
            <div className="p-2 space-y-2 text-[11px]">
              <label className="block text-slate-200" htmlFor="protection-function">Protection function</label>
              <select id="protection-function" value={protectionFunction} onChange={e=>{setProtectionFunction(e.target.value);setProtectionConfirm(false);}} className="w-full min-w-0 bg-[#092440] border border-[#6083a6] rounded px-2 py-1.5 text-white">
                <option value="50/51 Overcurrent">50/51 — Phase Overcurrent</option>
                <option value="50N/51N Earth Fault">50N/51N — Earth Fault</option>
                {(selectedBay.bayType.includes('TRANSFORMER') || Boolean(selectedBay.connectedTransformerId)) && <option value="87T Transformer Differential">87T — Transformer Differential</option>}
                <option value="50BF Breaker Failure">50BF — Breaker Failure (Trip Scenario)</option>
                <option value="86 Lockout">86 — Lockout (Trip Scenario)</option>
              </select>
              <div className="text-slate-300">Bay: <strong className="text-white">{selectedBay.bayCode}</strong> · CB: <strong className="text-white">{selectedBay.breakerState}</strong> · Lockout: <strong className="text-white">{selectedBay.autoRecloseStatus}</strong></div>
              {selectedBay.activeTripFunctions.length>0 && <div className="text-red-300 break-words">Active: {selectedBay.activeTripFunctions.join(', ')}</div>}
              {protectionConfirm && <div className="border border-amber-600 bg-amber-950/40 rounded p-2 space-y-2"><p>Confirm simulated protection trip for {selectedBay.bayCode}? This will open the CB and create Alarm/SOE records.</p><div className="grid grid-cols-2 gap-1"><button type="button" className="bg-red-700 border border-red-400 rounded py-1.5 font-bold" onClick={()=>{triggerProtectionTrip(selectedBay.id,protectionFunction);setProtectionConfirm(false);setRuntimePanel('ALARMS');}}>CONFIRM TRIP</button><button type="button" className="bg-[#244667] border border-[#6083a6] rounded py-1.5" onClick={()=>setProtectionConfirm(false)}>Cancel</button></div></div>}
              <div className="grid grid-cols-2 gap-1"><button type="button" disabled={selectedBay.protectionTripActive} className="bg-red-800 border border-red-500 rounded py-1.5 font-bold disabled:opacity-40" onClick={()=>setProtectionConfirm(true)}>Simulate Trip</button><button type="button" disabled={!selectedBay.protectionTripActive} className="bg-[#244667] border border-[#6083a6] rounded py-1.5 font-bold disabled:opacity-40" onClick={()=>{resetProtectionTrip(selectedBay.id);setProtectionConfirm(false);}}>{selectedBay.bayType === 'OUTGOING_FEEDER' ? 'Reset Trip Indication' : 'Reset Protection'}</button>
                {selectedBay.bayType === 'OUTGOING_FEEDER' && <button type="button" className="bg-[#244667] border border-[#6083a6] rounded py-1.5 font-bold disabled:opacity-40"
                  disabled={!(selectedBay.masterTripLockout ?? selectedBay.protectionTripActive) || !!feederProtection[selectedBay.id]?.faultActive || selectedBay.breakerState !== 'OPEN'}
                  onClick={() => resetRecloseDemo86(selectedBay.id)}>Reset 86 Lockout</button>}
              </div>
              <p className="text-[10px] text-slate-400">Training only. 50BF and 86 use the existing generic trip/lockout simulation, not a full breaker-failure timing sequence.</p>
            </div>
          </div>}
          {(inspectorTab==='IEC 61850') && <div className="m-2 p-3 bg-[#0b2b45] border border-[#3b6b90] space-y-2"><h3 className="font-bold">Control Interlocks</h3><p>43LR Mode: <strong>{selectedBay.localRemote}</strong></p><p>Quality: <strong>{selectedBay.quality}</strong></p><p className="text-green-300">{selectedBay.interlockReason || 'Check CSWI1 / CILO1 permissives before operating.'}</p><button type="button" onClick={()=>setBayLocalRemote(selectedBay.id,selectedBay.localRemote==='REMOTE'?'LOCAL':'REMOTE')} className="px-3 py-2 border border-[#6083a6] bg-[#244667]">Switch to {selectedBay.localRemote==='REMOTE'?'LOCAL':'REMOTE'}</button></div>}
        </aside>}

      </div>

      <section className="runtime-panel overflow-hidden" aria-label="Runtime alarms and events">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#355777] p-2">
          <div className="flex gap-1">{(['ALARMS','SOE','SYSTEM'] as const).map(tab=><button key={tab} type="button" data-selected={runtimePanel===tab} onClick={()=>setRuntimePanel(tab)} className="runtime-tab px-3 py-1.5 text-xs font-bold">{tab==='ALARMS'?`⚠ Alarms (${alarms.length})`:tab==='SOE'?'Events (SOE)':'System Messages'}</button>)}</div>
          <div className="flex gap-1"><button type="button" className="runtime-tab px-2 py-1 text-xs" onClick={acknowledgeAllAlarms}>✓ Acknowledge All</button><button type="button" className="runtime-tab px-2 py-1 text-xs" onClick={clearClearedAlarms}>Purge Cleared</button></div>
        </div>
        <div className="max-h-40 overflow-auto">
          {runtimePanel==='ALARMS' && <table className="runtime-alarm-table"><thead><tr><th>Time</th><th>Severity</th><th>State</th><th>Bay / Equipment</th><th>Description</th></tr></thead><tbody>{alarms.length ? alarms.slice(0,20).map((a,i)=><tr key={a.id || i} data-severity={a.severity} data-alarm-active={a.state !== 'CLEARED' && !String(a.state).startsWith('CLEARED_')}><td className="font-mono">{String(a.timestamp).slice(11,23)}</td><td>{a.severity}</td><td>{a.state}</td><td>{a.bayId}</td><td>{a.signalName}</td></tr>):<tr><td colSpan={5} className="text-center text-green-300">No active alarm records</td></tr>}</tbody></table>}
          {runtimePanel==='SOE' && <table className="runtime-alarm-table"><thead><tr><th>Time</th><th>Bay / IED</th><th>Event</th></tr></thead><tbody>{soeLog.slice(0,20).map((e,i)=><tr key={i}><td>{String(e.timestampMs).slice(11,23)}</td><td>{e.bayId}</td><td>{e.eventDescription}</td></tr>)}</tbody></table>}
          {runtimePanel==='SYSTEM' && <div className="p-3 text-xs text-green-300">System runtime online · {onlineIedsCount}/{ieds.length} IEDs online · Simulation only</div>}
        </div>
      </section>
      {/* ==================== 4. COLLAPSIBLE BOTTOM CONSOLE: TRANSFORMER MONITORING + ALARM/SOE CONSOLE WITH EVENT DETAIL INSPECTOR ==================== */}
      {false && !bottomDrawerCollapsed && (
        <div className="space-y-3 border-t border-[#1E3A5F] pt-3">
          <div className="reference-workstation-toolbar flex flex-wrap items-center justify-between gap-2 px-1"><h3 className="text-sm font-bold tracking-wide text-[#00CFFF]">OPERATIONS CONSOLE</h3><span className="text-[11px] text-slate-400">Transformer telemetry · Alarms · SOE · Trends</span></div>
          {/* Transformer Monitoring Panels (T1, T2, DT1, DT2) with Crisp Tabular Alignment */}
          <div className="bg-[#0B1D30] border border-[#142A3C] rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#E9F3FF]">
                Transformer Monitoring Panels (T1 — 50 MVA, T2 — 50 MVA, DT1 — 16 MVA, DT2 — 16 MVA)
              </span>
              <span className="text-[11px] font-mono text-[#00CFFF]">
                Live Simulation Telemetry &amp; OLTC Controls (YLTC1)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-2.5">
              {transformers.map((tx) => (
                <div
                  key={tx.id}
                  className="p-2.5 rounded-lg bg-[#050B14] border border-[#142A3C] flex flex-col justify-between gap-2 text-xs"
                >
                  <div className="flex items-center justify-between border-b border-[#142A3C] pb-1.5">
                    <div>
                      <span className="font-bold text-[#E9F3FF]">{tx.id}</span>
                      <span className="ml-1.5 text-[11px] text-slate-400 font-mono">
                        {tx.hvKv}/{tx.lvKv} kV • {tx.ratingMva} MVA
                      </span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[9.5px] font-bold font-mono ${
                        tx.energized
                          ? 'bg-[#22C55E]/20 text-[#22C55E]'
                          : 'bg-[#FF5C65]/20 text-[#FF5C65]'
                      }`}
                    >
                      {tx.energized ? 'ENERGIZED' : 'DEAD'}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 gap-1 text-center bg-[#0B1D30] p-1.5 rounded border border-[#142A3C] font-mono text-[10.5px]">
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">Active P</div>
                      <div className="font-bold text-[#00CFFF]">{tx.activePowerMw.toFixed(1)} MW</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">Load %</div>
                      <div className="font-bold text-[#22C55E]">{tx.loadPercent.toFixed(1)}%</div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">OTI / WTI</div>
                      <div className="font-bold text-[#FFB547]">
                        {tx.oilTempC}°/{tx.windingTempLvC}°C
                      </div>
                    </div>
                    <div>
                      <div className="text-[9px] text-slate-400 font-sans">OLTC Tap</div>
                      <div className="font-bold text-[#E9F3FF]">Tap {tx.oltcTapPosition}</div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-mono text-[10px]">
                      Cooling: <strong className="text-[#E9F3FF]">{tx.coolingStage}</strong> • Prot:{' '}
                      <strong
                        className={
                          tx.differentialTrip || tx.buchholzAlarm || tx.pressureReliefTrip
                            ? 'text-[#FF5C65]'
                            : 'text-[#22C55E]'
                        }
                      >
                        {tx.differentialTrip ? '87T TRIP' : tx.buchholzAlarm ? '63B ALM' : 'OK'}
                      </strong>
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'LOWER')}
                        className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] border border-slate-600 font-semibold text-[11px]"
                      >
                        Tap -
                      </button>
                      <button
                        type="button"
                        onClick={() => stepTransformerOltc(tx.id, 'RAISE')}
                        className="px-2 py-0.5 rounded bg-[#142A3C] hover:bg-[#168BFF] text-[#E9F3FF] border border-slate-600 font-semibold text-[11px]"
                      >
                        Tap +
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Alarm List, SOE Table (with Clickable Event Detail Inspector) & Live Trends */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3">
            {/* Active Alarms & Alarm History (4 Cols) */}
            <div className="xl:col-span-4 bg-[#0B1D30] border border-[#142A3C] rounded-lg p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold uppercase text-[#E9F3FF]">
                    Alarms ({filteredAlarms.length})
                  </span>
                  <div className="flex rounded bg-[#050B14] p-0.5 border border-[#142A3C] text-[10px]">
                    <button
                      type="button"
                      onClick={() => setAlarmCategoryFilter('ACTIVE')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        alarmCategoryFilter === 'ACTIVE'
                          ? 'bg-[#00CFFF] text-slate-950'
                          : 'text-slate-400'
                      }`}
                    >
                      Active
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlarmCategoryFilter('HISTORY')}
                      className={`px-2 py-0.5 rounded font-semibold ${
                        alarmCategoryFilter === 'HISTORY'
                          ? 'bg-[#00CFFF] text-slate-950'
                          : 'text-slate-400'
                      }`}
                    >
                      History
                    </button>
                  </div>
                </div>

                <select
                  value={alarmSeverityFilter}
                  onChange={(e) => setAlarmSeverityFilter(e.target.value)}
                  className="px-2 py-1 rounded bg-[#050B14] border border-[#142A3C] text-[11px] text-[#E9F3FF]"
                >
                  <option value="ALL">All Severities</option>
                  <option value="CRITICAL">Critical</option>
                  <option value="MAJOR">Major</option>
                  <option value="WARNING">Warning</option>
                  <option value="INFO">Info</option>
                </select>
              </div>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-0.5">
                {filteredAlarms.map((a) => {
                  const isSel = selectedAlarmId === a.id;
                  return (
                    <div
                      key={a.id}
                      onClick={() => {
                        setSelectedAlarmId(a.id);
                        setInspectedAlarmRecord(a);
                      }}
                      className={`p-2 rounded border text-xs cursor-pointer flex items-start justify-between gap-2 ${
                        isSel ? 'ring-1 ring-[#00CFFF]' : ''
                      } ${
                        a.state === 'ACTIVE_UNACK'
                          ? 'bg-[#FF5C65]/15 border-[#FF5C65]'
                          : a.state === 'ACTIVE_ACK'
                          ? 'bg-[#142A3C] border-[#FFB547]/40'
                          : 'bg-[#050B14] border-[#142A3C] opacity-65'
                      }`}
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-[#E9F3FF]">{a.bayName}</span>
                          <span className="text-[9.5px] px-1.5 py-0.2 rounded bg-[#050B14] text-[#00CFFF] font-mono">
                            {a.severity}
                          </span>
                          <span className="text-[9.5px] font-mono text-slate-400">
                            {a.timestamp.split('T')[1]}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-200">{a.signalName}</div>
                        <div className="text-[10px] font-mono text-slate-400 break-all">
                          {a.iec61850Ref} • {a.state}
                        </div>
                      </div>
                      {a.state === 'ACTIVE_UNACK' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            acknowledgeAlarm(a.id);
                          }}
                          className="px-2 py-1 rounded bg-[#00CFFF] text-slate-950 font-bold text-[10px] shrink-0"
                        >
                          ACK
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Millisecond Sequence of Events (SOE) Table + Clickable Event Detail Inspector (8 Cols) */}
            <div className="xl:col-span-8 bg-[#0B1D30] border border-[#142A3C] rounded-lg p-3 space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-bold uppercase text-[#E9F3FF]">
                    Sequence of Events (SOE) — 1 ms Resolution
                  </span>
                  <span className="ml-2 text-[10.5px] text-slate-400">
                    Click any event row to inspect untruncated IEC 61850 details below
                  </span>
                </div>
                <input
                  type="text"
                  value={soeSearch}
                  onChange={(e) => setSoeSearch(e.target.value)}
                  placeholder="Filter SOE by bay, IED, event..."
                  className="px-2.5 py-1 rounded bg-[#050B14] border border-[#142A3C] text-[11px] text-[#E9F3FF] w-52"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-2.5">
                {/* Readable 5-Column SOE Table (No Nested Horizontal Scroll) */}
                <div className="lg:col-span-8 max-h-56 overflow-y-auto border border-[#142A3C] rounded bg-[#050B14]">
                  <table className="w-full text-left border-collapse text-[10.5px] font-mono">
                    <thead className="bg-[#081A30] text-slate-300 sticky top-0">
                      <tr>
                        <th className="p-1.5">Timestamp (ms)</th>
                        <th className="p-1.5">Bay / IED</th>
                        <th className="p-1.5">Event</th>
                        <th className="p-1.5">Cause</th>
                        <th className="p-1.5">Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#142A3C]">
                      {filteredSoe.map((s) => {
                        const isInspected = inspectedSoeEvent?.id === s.id;
                        return (
                          <tr
                            key={s.id}
                            onClick={() => {
                              setInspectedSoeEvent(s);
                              setInspectedAlarmRecord(null);
                            }}
                            className={`cursor-pointer transition ${
                              isInspected
                                ? 'bg-[#142A3C] text-white'
                                : 'hover:bg-[#142A3C]/40'
                            }`}
                          >
                            <td className="p-1.5 text-[#00CFFF] whitespace-nowrap">
                              {s.timestampMs.split('T')[1] || s.timestampMs}
                            </td>
                            <td className="p-1.5">
                              <div className="text-[#E9F3FF] font-sans font-semibold">
                                {s.bayName}
                              </div>
                              <div className="text-[9.5px] text-slate-400">{s.iedId}</div>
                            </td>
                            <td className="p-1.5 font-sans text-slate-200">
                              {s.eventDescription}
                            </td>
                            <td className="p-1.5 text-[#FFB547] whitespace-nowrap">{s.cause}</td>
                            <td className="p-1.5 text-[#22C55E] whitespace-nowrap">{s.quality}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Clickable SOE / Alarm Complete Detail Inspector (Untruncated IEC 61850 Reference & State) */}
                <div className="lg:col-span-4 p-2.5 rounded bg-[#050B14] border border-[#142A3C] flex flex-col justify-between space-y-2 text-xs">
                  {inspectedAlarmRecord ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#142A3C] pb-1">
                        <span className="text-[10px] font-bold uppercase text-[#FF5C65]">
                          Selected Alarm Detail Inspector
                        </span>
                        <span className="font-mono text-[10px] text-slate-400">
                          {inspectedAlarmRecord.severity}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#E9F3FF]">
                        {inspectedAlarmRecord.bayName} ({inspectedAlarmRecord.iedId})
                      </div>
                      <div className="text-[11px] text-slate-200">
                        {inspectedAlarmRecord.signalName}
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] font-mono text-[10px] space-y-1 break-all">
                        <div>
                          <span className="text-slate-400">IEC 61850 Ref: </span>
                          <span className="text-[#00CFFF]">{inspectedAlarmRecord.iec61850Ref}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Value / State: </span>
                          <span className="text-[#FFB547]">{inspectedAlarmRecord.valueText}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">UTC Timestamp: </span>
                          <span className="text-slate-200">{inspectedAlarmRecord.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ) : inspectedSoeEvent ? (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between border-b border-[#142A3C] pb-1">
                        <span className="text-[10px] font-bold uppercase text-[#00CFFF]">
                          SOE Event Detail Inspector
                        </span>
                        <span className="font-mono text-[10px] text-[#22C55E]">
                          Q: {inspectedSoeEvent.quality}
                        </span>
                      </div>
                      <div className="text-[11px] font-bold text-[#E9F3FF]">
                        {inspectedSoeEvent.bayName} ({inspectedSoeEvent.iedId})
                      </div>
                      <div className="text-[11px] text-slate-200 leading-snug">
                        {inspectedSoeEvent.eventDescription}
                      </div>
                      <div className="p-1.5 rounded bg-[#0B1D30] border border-[#142A3C] font-mono text-[10px] space-y-1 break-all">
                        <div>
                          <span className="text-slate-400">Full IEC 61850 Ref: </span>
                          <span className="text-[#00CFFF]">{inspectedSoeEvent.sourceRef}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Old / New State: </span>
                          <span className="text-[#FFB547]">{inspectedSoeEvent.valueChange}</span>
                        </div>
                        <div>
                          <span className="text-slate-400">Cause &amp; UTC Time: </span>
                          <span className="text-slate-200">
                            {inspectedSoeEvent.cause} • {inspectedSoeEvent.timestampMs}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px]">
                      Select any SOE event or alarm row to inspect its complete IEC 61850 reference.
                    </div>
                  )}

                  {/* Compact Station Load Mini-Trend inside Inspector Footer */}
                  <div className="pt-1 border-t border-[#142A3C]">
                    <div className="text-[9.5px] font-bold uppercase text-slate-400 mb-1">
                      Station Load (MW) &amp; 33kV Bus Trend
                    </div>
                    <div className="relative h-20">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={trendHistory}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#142A3C" />
                          <XAxis dataKey="time" hide />
                          <YAxis hide />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#050B14',
                              borderColor: '#142A3C',
                              fontSize: 10,
                            }}
                          />
                          <Area
                            type="monotone"
                            dataKey="totalLoadMw"
                            name="Total MW"
                            stroke="#00CFFF"
                            fill="rgba(0, 207, 255, 0.2)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}


      </div>
      {runtimeScreen==='REPORTS' && engineeringDetailsOpen && <section className="runtime-panel p-3 space-y-3"><div className="flex justify-between items-center"><h2 className="text-sm font-bold text-[#00CFFF]">Engineering · Protocol Diagnostics & RCC Forwarding</h2></div>
      {/* SECTION 4: SCADA / HMI MULTI-PROTOCOL COMMUNICATION STATUS & SIGNAL SOURCE */}
      {(() => {
        const bayIdx = Math.max(0, bays.findIndex((b) => b.id === selectedBay.id));
        const proto = getBayProtocolBreakdown(selectedBay, bayIdx);
        const nowStr = new Date().toISOString().replace('T', ' ').slice(0, 23);
        return (
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1 text-xs">
            <div
              style={{ backgroundColor: '#061526', borderColor: '#1B4B72' }}
              className="xl:col-span-7 rounded-xl border p-3.5 space-y-2 shadow-lg"
            >
              <div className="flex items-center justify-between border-b border-[#163B5C] pb-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  SCADA Multi-Protocol Communication Status
                </h3>
                <span className="text-[10.5px] font-mono text-[#00CFFF]">
                  All 7 Device Classes Online
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead style={{ backgroundColor: '#0A2540' }} className="text-[#9BC0DF] font-bold">
                    <tr>
                      <th className="py-1.5 px-2.5">Device / Connection</th>
                      <th className="py-1.5 px-2.5">Active Protocol</th>
                      <th className="py-1.5 px-2.5">Port / Endpoint</th>
                      <th className="py-1.5 px-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#132E4A] font-mono">
                    {[
                      ['Siemens SIPROTEC 5 IED (7SA87 / 7UT86 / 7SJ85)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['ABB Relion IED (REF615 / RET615 / REC615)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['Schneider MiCOM IED (C264 / P633 / P143)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['GE Multilin IED (850 / D60 / T60)', 'IEC 61850 MMS + GOOSE', 'TCP/102 & L2 0x88B8', 'ONLINE (BRCB OK)'],
                      ['33 kV / 11 kV Feeder Energy Meter (PM8000)', 'Modbus TCP', 'TCP Port 502 (Unit ID 1–14)', 'POLLING OK (1000 ms)'],
                      ['Station Gateway to Remote Control Center (RCC)', 'IEC 60870-5-104 (IEC-104)', 'TCP Port 2404 (COA 132)', 'STARTDT ACTIVE'],
                      ['SCADA Server A to Enterprise Historian', 'OPC UA', 'opc.tcp://10.132.10.200:4840', 'SUBSCRIBED (ns=2)'],
                    ].map(([dev, pr, ep, st]) => (
                      <tr key={dev} className="hover:bg-[#0B2540]">
                        <td className="py-1.5 px-2.5 font-sans font-bold text-white">{dev}</td>
                        <td className="py-1.5 px-2.5 font-bold text-[#00CFFF]">{pr}</td>
                        <td className="py-1.5 px-2.5 text-slate-300">{ep}</td>
                        <td className="py-1.5 px-2.5 font-bold text-[#4ADE80]">● {st}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div
              style={{ backgroundColor: '#061526', borderColor: '#00CFFF' }}
              className="xl:col-span-5 rounded-xl border p-3.5 space-y-2 shadow-lg"
            >
              <div className="border-b border-[#163B5C] pb-2">
                <h3 className="text-xs sm:text-sm font-extrabold text-white uppercase tracking-wider">
                  Selected Equipment Protocol Source &amp; RCC Forwarding ({selectedBay.bayCode})
                </h3>
              </div>
              <div className="space-y-1.5 font-mono text-[11px]">
                <div className="p-2 rounded bg-[#04101E] border border-[#153452]">
                  <div className="text-[#00CFFF] font-sans font-bold">
                    1. Primary Station-Bus Acquisition — Circuit Breaker Position
                  </div>
                  <div className="text-white mt-0.5">
                    Protocol: <span className="text-[#4ADE80] font-bold">IEC 61850 MMS (TCP/102)</span> &amp;{' '}
                    <span className="text-[#4ADE80] font-bold">GOOSE (0x88B8)</span>
                  </div>
                  <div className="text-[#77E7FF]">IEC Reference: {proto.mms.statusRef}</div>
                  <div className="text-slate-300">
                    Value: <span className="text-white font-bold">{selectedBay.breakerState}</span> • Quality:{' '}
                    <span className="text-[#4ADE80] font-bold">{selectedBay.quality}</span> • Timestamp: {nowStr}
                  </div>
                </div>

                <div className="p-2 rounded bg-[#04101E] border border-[#153452]">
                  <div className="text-[#D8B4FE] font-sans font-bold">
                    2. Northbound RCC Telecontrol Forwarding (via Station Gateway)
                  </div>
                  <div className="text-white mt-0.5">
                    Protocol: <span className="text-[#D8B4FE] font-bold">IEC 60870-5-104 (TCP/2404 • COA 132)</span>
                  </div>
                  <div className="text-[#D8B4FE]">
                    Status Mapping: {proto.iec104.ioaStatus} • COT=3 (Spontaneous)
                  </div>
                  <div className="text-slate-300">
                    Analog Mapping: {proto.iec104.ioaMeas} ({selectedBay.activePowerMw.toFixed(2)} MW)
                  </div>
                </div>

                <div className="p-2 rounded bg-[#04101E] border border-[#153452]">
                  <div className="text-[#93C5FD] font-sans font-bold">
                    3. Historian &amp; Feeder Metering Integration
                  </div>
                  <div className="text-slate-300">
                    Metering: <span className="text-[#FDBA74] font-bold">Modbus TCP (Port 502)</span> ({proto.modbus.registers})
                  </div>
                  <div className="text-slate-300 break-all">
                    Historian: <span className="text-[#60A5FA] font-bold">OPC UA</span> ({proto.opcUa.nodeIdStatus})
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      </section>}
      <footer className="runtime-status flex flex-wrap items-center justify-between gap-3 px-3 py-2 text-[11px] font-semibold">
        <div className="flex flex-wrap gap-4"><span className="text-green-400">● System Healthy</span><span>IEDs Online: <b className="text-green-400">{onlineIedsCount}/{ieds.length}</b></span><span>Comms: <b className="text-green-400">OK</b></span><span>Import: <b className="text-green-400">{totalImportMw.toFixed(1)} MW</b></span><span>Frequency: <b className="text-green-400">{systemFreqHz.toFixed(2)} Hz</b></span></div>
        <span className="text-slate-300">Project: 132_33_11kV_SAS · Training simulation</span>
      </footer>
    </div>
  );
};
