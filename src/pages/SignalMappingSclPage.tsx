import React, { useEffect, useMemo, useRef, useState } from 'react';
import { hasConfiguredFeederReclose, initialRecloseDemo, useSubstationStore } from '../simulation/useSubstationStore';
import { FIFTY_SAS_SIGNAL_TEMPLATES, getVendorForBay } from '../data/signalCatalogue';
import { SignalChainDashboard } from '../components/SignalChainDashboard';
import { SCL_FILE_SAMPLES } from '../data/sclSamples';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cpu,
  Database,
  Download,
  FileCode2,
  Folder,
  FileText,
  Layers,
  Network,
  Radio,
  Search,
  ShieldCheck,
  Upload,
  Wrench,
  X,
} from 'lucide-react';

import {
  buildIedFaultScenarios, faultStageStates, injectIedFault, projectSignalFault,
  readFaultScl, runtimeFaultConfiguration, datasetPoints,
} from '../simulation/signalChainFaults';
import type { SignalChainFaultMode, IedFaultInjection } from '../simulation/signalChainFaults';

interface ParsedSclSummary {
  fileName: string;
  fileType: string;
  headerId: string;
  version: string;
  revision: string;
  subnetworks: Array<{ name: string; type: string; bitRate: string; connectedAps: string[] }>;
  ieds: Array<{
    name: string;
    manufacturer: string;
    type: string;
    configVersion: string;
    accessPoints: string[];
    logicalDevices: Array<{
      inst: string;
      logicalNodes: string[];
      datasets: Array<{ name: string; desc: string; fcdaCount: number; fcdas: string[] }>;
      reportControls: Array<{ name: string; rptID: string; datSet: string; buffered: string; intgPd: string }>;
      gseControls: Array<{ name: string; appID: string; datSet: string; type: string }>;
    }>;
  }>;
  validationIssues: Array<{ severity: 'ERROR' | 'WARNING' | 'PASS'; message: string; suggestion: string }>;
  rawXml: string;
}

function parseSclXmlString(fileName: string, fileType: string, xmlString: string): ParsedSclSummary {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const parserError = doc.querySelector('parsererror');

  if (parserError) {
    return {
      fileName,
      fileType,
      headerId: 'XML_PARSE_ERROR',
      version: '-',
      revision: '-',
      subnetworks: [],
      ieds: [],
      validationIssues: [
        {
          severity: 'ERROR',
          message: `Malformed XML syntax in ${fileName}: ${parserError.textContent?.slice(0, 120) || 'Invalid XML'}`,
          suggestion: 'Verify well-formed XML tags and UTF-8 encoding per IEC 61850-6 Edition 2.1.',
        },
      ],
      rawXml: xmlString,
    };
  }

  const headerEl = doc.querySelector('Header');
  const headerId = headerEl?.getAttribute('id') || 'SAS_SUBSTATION_SCL';
  const version = headerEl?.getAttribute('version') || '2007B4';
  const revision = headerEl?.getAttribute('revision') || 'A';

  const subnetworks = Array.from(doc.querySelectorAll('SubNetwork')).map((sn) => ({
    name: sn.getAttribute('name') || 'StationBus',
    type: sn.getAttribute('type') || '8-MMS',
    bitRate: sn.querySelector('BitRate')?.textContent?.trim() || '100 Mb/s',
    connectedAps: Array.from(sn.querySelectorAll('ConnectedAP')).map(
      (cap) => `${cap.getAttribute('iedName') || 'IED'} (${cap.getAttribute('apName') || 'S1'})`
    ),
  }));

  const iedEls = Array.from(doc.querySelectorAll('IED'));
  const seenIedNames = new Set<string>();
  const validationIssues: Array<{ severity: 'ERROR' | 'WARNING' | 'PASS'; message: string; suggestion: string }> = [];

  const ieds = iedEls.map((iedEl) => {
    const name = iedEl.getAttribute('name') || 'UNNAMED_IED';
    if (seenIedNames.has(name)) {
      validationIssues.push({
        severity: 'ERROR',
        message: `Duplicate IED identifier "${name}" detected in SCL document.`,
        suggestion: 'Assign a unique IED name per bay in accordance with IEC 61850-6.',
      });
    }
    seenIedNames.add(name);

    const manufacturer = iedEl.getAttribute('manufacturer') || 'Siemens / ABB / Schneider / GE';
    const type = iedEl.getAttribute('type') || 'ProtectionIED';
    const configVersion = iedEl.getAttribute('configVersion') || 'Ed2.1';
    const accessPoints = Array.from(iedEl.querySelectorAll('AccessPoint')).map(
      (ap) => ap.getAttribute('name') || 'S1'
    );

    const lDevices = Array.from(iedEl.querySelectorAll('LDevice')).map((ld) => {
      const inst = ld.getAttribute('inst') || 'LD0';
      const ln0 = ld.querySelector('LN0');
      const lns = Array.from(ld.querySelectorAll('LN')).map(
        (ln) => `${ln.getAttribute('prefix') || ''}${ln.getAttribute('lnClass') || 'GGIO'}${ln.getAttribute('inst') || '1'}`
      );
      const allNodes = ln0 ? ['LLN0', ...lns] : lns;

      const datasets = Array.from(ld.querySelectorAll('DataSet')).map((ds) => {
        const dsName = ds.getAttribute('name') || 'dsStatus';
        const dsDesc = ds.getAttribute('desc') || 'IEC 61850 DataSet';
        const fcdas = Array.from(ds.querySelectorAll('FCDA')).map((f) => {
          const ldInst = f.getAttribute('ldInst') || inst;
          const prefix = f.getAttribute('prefix') || '';
          const lnClass = f.getAttribute('lnClass') || '';
          const lnInst = f.getAttribute('lnInst') || '';
          const doName = f.getAttribute('doName') || '';
          const daName = f.getAttribute('daName') || '';
          const fc = f.getAttribute('fc') || 'ST';
          return `${ldInst}/${prefix}${lnClass}${lnInst}.${doName}${daName ? '.' + daName : ''} [${fc}]`;
        });
        return { name: dsName, desc: dsDesc, fcdaCount: fcdas.length, fcdas };
      });

      const dsNameSet = new Set(datasets.map((d) => d.name));

      const reportControls = Array.from(ld.querySelectorAll('ReportControl')).map((rc) => {
        const rcName = rc.getAttribute('name') || 'brcbSt01';
        const rptID = rc.getAttribute('rptID') || `${name}/${inst}/LLN0$${rcName}`;
        const datSet = rc.getAttribute('datSet') || '';
        const buffered = rc.getAttribute('buffered') || 'true';
        const intgPd = rc.getAttribute('intgPd') || '5000';
        if (datSet && !dsNameSet.has(datSet)) {
          validationIssues.push({
            severity: 'ERROR',
            message: `ReportControl "${rcName}" on ${name}/${inst} references unresolved DataSet "${datSet}".`,
            suggestion: `Create DataSet "${datSet}" under ${name}/${inst}/LLN0 or update @datSet.`,
          });
        }
        return { name: rcName, rptID, datSet, buffered, intgPd };
      });

      const gseControls = Array.from(ld.querySelectorAll('GSEControl')).map((gc) => {
        const gcName = gc.getAttribute('name') || 'gcbTrip01';
        const appID = gc.getAttribute('appID') || '0001';
        const datSet = gc.getAttribute('datSet') || '';
        const gcType = gc.getAttribute('type') || 'GOOSE';
        if (datSet && !dsNameSet.has(datSet)) {
          validationIssues.push({
            severity: 'ERROR',
            message: `GSEControl "${gcName}" on ${name}/${inst} references unresolved DataSet "${datSet}".`,
            suggestion: `Bind GSEControl "${gcName}" to an existing DataSet under LLN0.`,
          });
        }
        return { name: gcName, appID, datSet, type: gcType };
      });

      return { inst, logicalNodes: allNodes, datasets, reportControls, gseControls };
    });

    return { name, manufacturer, type, configVersion, accessPoints, logicalDevices: lDevices };
  });

  if (ieds.length === 0) {
    validationIssues.push({
      severity: 'WARNING',
      message: 'No <IED> elements found in SCL file.',
      suggestion: 'Ensure the SCL file contains at least one IED section with AccessPoint and LDevice definitions.',
    });
  }

  if (validationIssues.length === 0) {
    validationIssues.push({
      severity: 'PASS',
      message: `SCL Schema & Cross-Reference Audit Passed: ${ieds.length} IED(s), ${subnetworks.length} SubNetwork(s) verified with 0 unresolved DataSet or ControlBlock links.`,
      suggestion: 'Ready for CID export and IED commissioning.',
    });
  }

  return {
    fileName,
    fileType,
    headerId,
    version,
    revision,
    subnetworks,
    ieds,
    validationIssues,
    rawXml: xmlString,
  };
}

function RecloseTrainingPanel({ bayId, onAfterResetTrip }: { bayId: string; onAfterResetTrip?: () => void }) {
  const {
    bays, feederProtection, startRecloseDemo, clearRecloseDemoFault,
    cancelRecloseDemo, resetRecloseDemo79, resetRecloseDemo86, resetProtectionTrip,
  } = useSubstationStore();
  const [now, setNow] = useState(Date.now);
  const { deadline, faultActive, phase, reason, shots } = feederProtection[bayId] ?? initialRecloseDemo;

  useEffect(() => {
    if (deadline === null) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [deadline]);

  const bay = bays.find((entry) => entry.id === bayId);
  if (!bay) return null;

  const lockout86 = bay.masterTripLockout ?? bay.protectionTripActive;
  const recloseConfigured = hasConfiguredFeederReclose(bay);
  const canStart = bay.breakerState === 'CLOSED' && phase === 'READY' && !faultActive && !lockout86;
  const canReset = bay.breakerState === 'OPEN' && !faultActive;
  const buttonClass = 'rounded-md border border-[#26617A] bg-[#081F31] px-2.5 py-1.5 font-semibold text-[#B5ECFA] hover:border-cyan-400 disabled:opacity-40 disabled:hover:border-[#26617A]';
  const phaseLabel = { READY: 'READY', DEAD_TIME: 'DEAD TIME', RETRIP_PENDING: 'RETRIP PENDING', RECLAIM: 'RECLAIM', LOCKOUT: 'LOCKOUT' }[phase];

  return (
    <section aria-label={`${bay.bayCode} protection training`} className="sas-feeder-simulation rounded-xl border border-[#26617A] bg-[#0A263A] px-3 py-2.5 text-xs text-[#B5ECFA]">
      <h2 className="font-extrabold text-white">{bay.bayCode} Protection Simulation</h2>
      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 font-mono" data-testid="reclose-status">
        <span className={phase === 'LOCKOUT' ? 'text-rose-300' : 'text-cyan-300'}>ANSI 79 · {recloseConfigured ? phaseLabel : 'DISABLED'}</span>
        {deadline !== null && <span>{(Math.max(0, deadline - now) / 1000).toFixed(1)} s</span>}
        {recloseConfigured && <span>Shots {shots}/1</span>}
        <span className={lockout86 ? 'text-rose-300' : 'text-emerald-300'}>ANSI 86 · {lockout86 ? 'LATCHED' : 'RESET'}</span>
        <span>CB · {bay.breakerState}</span>
        <span className={faultActive ? 'text-amber-300' : ''}>Fault · {faultActive ? 'ACTIVE' : 'CLEAR'}</span>
      </div>
      <p className="mt-1.5 text-[11px]" aria-live="polite">{reason}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        <button type="button" className={buttonClass} disabled={!canStart} onClick={() => startRecloseDemo(bayId, 'TEMPORARY')}>Temporary fault</button>
        <button type="button" className={buttonClass} disabled={!canStart} onClick={() => startRecloseDemo(bayId, 'PERMANENT')}>Permanent fault</button>
        <button type="button" className={buttonClass} disabled={!canStart} onClick={() => startRecloseDemo(bayId, 'MASTER_TRIP')}>Master trip (86)</button>
        <button type="button" className={buttonClass} disabled={!faultActive} onClick={() => clearRecloseDemoFault(bayId)}>Clear fault</button>
        <button type="button" className={buttonClass} disabled={phase !== 'DEAD_TIME'} onClick={() => cancelRecloseDemo(bayId)}>Cancel 79</button>
        <button type="button" className={buttonClass} disabled={!canReset || phase !== 'LOCKOUT'} onClick={() => resetRecloseDemo79(bayId)}>Reset 79 lockout</button>
        <button type="button" className={buttonClass} disabled={!canReset || !lockout86} onClick={() => resetRecloseDemo86(bayId)}>Reset 86 lockout</button>
        <button type="button" className={buttonClass} disabled={faultActive || !bay.protectionTripActive} onClick={() => { resetProtectionTrip(bay.id); onAfterResetTrip?.(); }}>Reset trip indication</button>
      </div>
    </section>
  );
}

export const SignalMappingSclPage: React.FC = () => {
  const {
    signals,
    bays,
    ieds,
    networkLinks,
    gooseControlBlocks,
    networkRedundancyMode,
    selectedBayId,
    setSelectedBayId,
    setSelectedIedId,
    commandBreaker,
    triggerProtectionTrip,
    resetProtectionTrip,
    resetRecloseDemo86,
    clearRecloseDemoFault,
  } = useSubstationStore();

  // Top 3 Workspace Tabs
  const [viewMode, setViewMode] = useState<'CATALOGUE_50' | 'INSTANTIATED_BAY' | 'SCL_WORKSPACE'>('CATALOGUE_50');

  // Filters & Search
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [voltageFilter, setVoltageFilter] = useState<'ALL' | 132 | 33 | 11>('ALL');
  const [iedFilter, setIedFilter] = useState<string>('ALL');
  const [datasetFilter, setDatasetFilter] = useState<string>('ALL');
  const [qualityFilter, setQualityFilter] = useState<'ALL' | 'GOOD' | 'OTHER'>('ALL');

  // Selected Catalogue Signal (#1..50) & Selected Concrete Point
  const [selectedCatalogNo, setSelectedCatalogNo] = useState<number>(1);
  const [selectedPointId, setSelectedPointId] = useState<string>('SIG-132-L1-01');

  // Interactive Signal-Chain Fault Simulation (Section 11) — persisted in sessionStorage across page navigation
  const FAULTS_STORAGE_KEY = 'sas_signal_chain_faults_by_ied_v1';
  const [faultsByIed, setFaultsByIed] = useState<Record<string, IedFaultInjection>>(() => {
    try {
      const raw = window.sessionStorage.getItem(FAULTS_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') return parsed;
      }
    } catch {
      // Ignore storage access errors
    }
    return {};
  });
  const [selectedStageIndex, setSelectedStageIndex] = useState<number | null>(null);
  const [selectedProtocolMapMode, setSelectedProtocolMapMode] = useState<'MMS' | 'GOOSE' | 'MODBUS' | 'IEC104' | 'OPCUA'>('MMS');

  // Validation Modal / Banner State
  const [validationModalOpen, setValidationModalOpen] = useState<boolean>(false);

  // Live Timestamp Clock for Right-Side Details (Updates every second)
  const [liveClockStr, setLiveClockStr] = useState<string>(() => {
    const now = new Date();
    const pad = (n: number, w = 2) => String(n).padStart(w, '0');
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`;
  });

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      const pad = (n: number, w = 2) => String(n).padStart(w, '0');
      setLiveClockStr(
        `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}.${pad(now.getMilliseconds(), 3)}`
      );
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // SCL XML Engineering Workspace State (Tab 3)
  const [selectedSclId, setSelectedSclId] = useState<string>('SCL-SCD');
  const [uploadedSclFiles, setUploadedSclFiles] = useState<
    Array<{ id: string; fileType: string; fileName: string; title: string; iecClause: string; purpose: string; xmlContent: string }>
  >([]);
  const [sclSubTab, setSclSubTab] = useState<'TREE' | 'DATASETS_RCBS' | 'COMMUNICATION' | 'VALIDATOR' | 'RAW_XML'>('TREE');
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Ensure Selected Bay KPI defaults to 33-F03 (matching reference screenshot) while allowing full bay switching
  const kpiBay = useMemo(() => {
    return bays.find((b) => b.id === selectedBayId) || bays.find((b) => b.bayCode === '33-F03') || bays[0];
  }, [bays, selectedBayId]);

  // The IED selector owns the trace. A stale point selection must never select another bay.
  const traceBay = kpiBay;
  const selectedIed = ieds.find(ied => ied.id === traceBay.iedId);
  const allSclFiles = useMemo(() => [...SCL_FILE_SAMPLES, ...uploadedSclFiles], [uploadedSclFiles]);
  const currentSclFile = allSclFiles.find(file => file.id === selectedSclId) || allSclFiles[0];
  const parsedScl = useMemo(() => parseSclXmlString(currentSclFile.fileName, currentSclFile.fileType, currentSclFile.xmlContent), [currentSclFile]);
  const importedMappings = useMemo(() => selectedSclId.startsWith('SCL-USER-')
    ? readFaultScl(currentSclFile.xmlContent, currentSclFile.fileName) : {}, [currentSclFile, selectedSclId]);
  const scenariosByIed = useMemo(() => Object.fromEntries(ieds.map(ied => {
    const ownerBay = bays.find(b => b.iedId === ied.id);
    return [ied.id, buildIedFaultScenarios(ied, signals, gooseControlBlocks, importedMappings[ied.name], ownerBay?.bayType)];
  })), [ieds, bays, signals, gooseControlBlocks, importedMappings]);
  // Keep only injections whose scenario ID & target point exist for that IED (preserving object identity)
  const validFaults = useMemo(() => {
    const entries: Array<[string, IedFaultInjection]> = [];
    for (const [id, fault] of Object.entries(faultsByIed)) {
      const matched = scenariosByIed[id]?.find(
        scenario => scenario.id === fault.scenario.id && scenario.targetId === fault.scenario.targetId
      );
      if (matched) {
        entries.push([id, fault]);
      }
    }
    return Object.fromEntries(entries);
  }, [faultsByIed, scenariosByIed]);

  // Persist validFaults to sessionStorage without causing re-render loops
  useEffect(() => {
    const prevKeys = Object.keys(faultsByIed);
    const nextKeys = Object.keys(validFaults);
    if (prevKeys.length !== nextKeys.length) {
      setFaultsByIed(validFaults);
      return;
    }
    try {
      if (nextKeys.length > 0) {
        window.sessionStorage.setItem(FAULTS_STORAGE_KEY, JSON.stringify(validFaults));
      } else {
        window.sessionStorage.removeItem(FAULTS_STORAGE_KEY);
      }
    } catch {
      // Ignore storage write errors
    }
  }, [validFaults, faultsByIed]);

  // Edge-triggered sync with global store protectionTripActive (only on true<->false transitions; never oscillates)
  const prevTripByBayRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    const prevMap = prevTripByBayRef.current;
    const isInitialMount = Object.keys(prevMap).length === 0;
    let nextFaults: Record<string, IedFaultInjection> | null = null;

    for (const bay of bays) {
      const wasTripped = prevMap[bay.id] ?? false;
      const isTripped = Boolean(bay.protectionTripActive);
      prevMap[bay.id] = isTripped;

      if (isInitialMount) {
        // On mount, if store has an active trip with no stored fault, sync it once
        if (isTripped && !faultsByIed[bay.iedId]) {
          const activeFn = (bay.activeTripFunctions[0] || '').toLowerCase();
          const inferred =
            scenariosByIed[bay.iedId]?.find(s => activeFn && s.lcdText.toLowerCase() === activeFn) ||
            scenariosByIed[bay.iedId]?.find(s => s.tripsBreaker);
          if (inferred) {
            nextFaults = { ...(nextFaults ?? faultsByIed), [bay.iedId]: injectIedFault(inferred, signals) };
          }
        }
        continue;
      }

      if (wasTripped && !isTripped) {
        // Trip was cleared externally (SLD or Protection Simulation panel) -> clear matching trip fault
        const curFault = (nextFaults ?? faultsByIed)[bay.iedId];
        if (curFault?.scenario.tripsBreaker) {
          const copy = { ...(nextFaults ?? faultsByIed) };
          delete copy[bay.iedId];
          nextFaults = copy;
        }
      } else if (!wasTripped && isTripped) {
        // Trip was triggered externally (SLD or Protection Simulation panel) -> reflect in dropdown once
        const curFault = (nextFaults ?? faultsByIed)[bay.iedId];
        if (!curFault) {
          const activeFn = (bay.activeTripFunctions[0] || '').toLowerCase();
          const inferred =
            scenariosByIed[bay.iedId]?.find(s => activeFn && s.lcdText.toLowerCase() === activeFn) ||
            scenariosByIed[bay.iedId]?.find(s => s.tripsBreaker);
          if (inferred) {
            nextFaults = { ...(nextFaults ?? faultsByIed), [bay.iedId]: injectIedFault(inferred, signals) };
          }
        }
      }
    }

    if (nextFaults) {
      setFaultsByIed(nextFaults);
    }
  }, [bays, faultsByIed, scenariosByIed, signals]);
  const faultScenarios = scenariosByIed[traceBay.iedId] || [];
  const activeFault = validFaults[traceBay.iedId];
  const selectedFaultMode: SignalChainFaultMode = activeFault?.scenario.mode || 'NONE';
  const selectedFaultId: string = activeFault?.scenario.id || 'NONE';

  // Keep traced signal aligned with the active fault target across page navigation and bay switches
  useEffect(() => {
    if (!activeFault) return;
    const target = signals.find(point => point.id === activeFault.scenario.targetId);
    if (!target) return;
    if (selectedPointId !== target.id) setSelectedPointId(target.id);
    if (selectedCatalogNo !== target.catalogNumber) setSelectedCatalogNo(target.catalogNumber);
  }, [activeFault?.scenario.id, activeFault?.scenario.targetId, traceBay.iedId, signals]);
  const setChainFaultMode = (modeOrId: string) => {
    if (modeOrId === 'NONE') {
      const bayId = traceBay.id;
      const iedId = traceBay.iedId;
      const hadBreakerTrip = Boolean(activeFault?.scenario.tripsBreaker || traceBay.protectionTripActive || traceBay.masterTripLockout);
      setFaultsByIed(previous => {
        const next = { ...previous };
        delete next[iedId];
        return next;
      });
      try {
        const raw = window.sessionStorage.getItem(FAULTS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          delete parsed[iedId];
          if (Object.keys(parsed).length > 0) {
            window.sessionStorage.setItem(FAULTS_STORAGE_KEY, JSON.stringify(parsed));
          } else {
            window.sessionStorage.removeItem(FAULTS_STORAGE_KEY);
          }
        }
      } catch {
        // Ignore storage errors
      }
      clearRecloseDemoFault(bayId);
      resetProtectionTrip(bayId);
      resetRecloseDemo86(bayId);
      if (hadBreakerTrip) {
        window.setTimeout(() => {
          const st = useSubstationStore.getState();
          const latestBay = st.bays.find(b => b.id === bayId);
          if (latestBay?.protectionTripActive) st.resetProtectionTrip(bayId);
          if (latestBay?.masterTripLockout) st.resetRecloseDemo86(bayId);
          const refreshedBay = useSubstationStore.getState().bays.find(b => b.id === bayId);
          if (refreshedBay && refreshedBay.breakerState === 'OPEN') {
            st.commandBreaker(bayId, 'CLOSED', 'SCADA_SBO');
          }
        }, 10);
      }
      return;
    }
    const scenario =
      faultScenarios.find(candidate => candidate.id === modeOrId) ||
      faultScenarios.find(candidate => candidate.mode === modeOrId);
    if (!scenario) return;
    const target = signals.find(point => point.id === scenario.targetId);
    if (!target) return;
    setSelectedPointId(target.id);
    setSelectedCatalogNo(target.catalogNumber);
    setFaultsByIed(previous => ({ ...previous, [traceBay.iedId]: injectIedFault(scenario, signals) }));
    if (scenario.tripsBreaker) {
      triggerProtectionTrip(traceBay.id, scenario.lcdText);
    } else if (traceBay.protectionTripActive) {
      resetProtectionTrip(traceBay.id);
    }
  };
  const displayedSignals = useMemo(() => signals.map(point => projectSignalFault(point, validFaults[point.iedId])), [signals, validFaults]);
  const faultModeByBay: Record<string, SignalChainFaultMode> = Object.fromEntries(bays.map(bay => [bay.id, validFaults[bay.iedId]?.scenario.mode || 'NONE']));
  const mapping = selectedIed ? importedMappings[selectedIed.name] ?? runtimeFaultConfiguration(selectedIed) : undefined;

  const tracedPoint = useMemo(() => {
    const ownPoints = displayedSignals.filter(point => point.iedId === traceBay.iedId && point.bayId === traceBay.id);
    return (viewMode === 'INSTANTIATED_BAY' ? ownPoints.find(point => point.id === selectedPointId) : undefined)
      || ownPoints.find(point => point.catalogNumber === selectedCatalogNo) || ownPoints[0];
  }, [displayedSignals, traceBay.id, traceBay.iedId, viewMode, selectedPointId, selectedCatalogNo]);
  const chainFaultMode: SignalChainFaultMode = tracedPoint && activeFault?.scenario.affectedIds.includes(tracedPoint.id)
    ? activeFault.scenario.mode : 'NONE';

  const catalogueDisplayRows = useMemo(() => FIFTY_SAS_SIGNAL_TEMPLATES.map(tpl => ({
    ...tpl, categoryDisplay: tpl.category,
    lnDoDaDisplay: `${tpl.logicalNodeClass}.${tpl.dataObject}.${tpl.dataAttribute}`,
    fcCdcDisplay: `[${tpl.fc}] / ${tpl.cdc.split(' ')[0]}`,
    controlModelDisplay: tpl.controlModel,
    datasetTransportDisplay: `${tpl.defaultDataset} (${tpl.transportType})`,
    testNoteDisplay: `${tpl.testProcedureSummary} ${tpl.engineeringNote}`,
  })), []);

  const filteredCatalogueRows = useMemo(() => {
    return catalogueDisplayRows.filter((row) => {
      if (categoryFilter !== 'ALL' && row.category !== categoryFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        row.signalName.toLowerCase().includes(q) ||
        row.lnDoDaDisplay.toLowerCase().includes(q) ||
        row.datasetTransportDisplay.toLowerCase().includes(q) ||
        row.categoryDisplay.toLowerCase().includes(q) ||
        row.testNoteDisplay.toLowerCase().includes(q)
      );
    });
  }, [catalogueDisplayRows, categoryFilter, searchQuery]);

  // Filtered Live Per-Bay Signal Mapping points (Tab 2)
  const filteredBayPoints = useMemo(() => {
    return displayedSignals.filter((s) => {
      if (voltageFilter !== 'ALL' && s.voltageKv !== voltageFilter) return false;
      if (selectedBayId && selectedBayId !== 'ALL_BAYS' && viewMode === 'INSTANTIATED_BAY') {
        if (s.bayId !== selectedBayId) return false;
      }
      if (iedFilter !== 'ALL' && s.iedName !== iedFilter) return false;
      if (datasetFilter !== 'ALL' && !s.datasetRef.toLowerCase().includes(datasetFilter.toLowerCase())) return false;
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
      const effectiveQual = s.quality;
      if (qualityFilter === 'GOOD' && effectiveQual !== 'GOOD') return false;
      if (qualityFilter === 'OTHER' && effectiveQual === 'GOOD') return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        s.signalName.toLowerCase().includes(q) ||
        s.iec61850Ref.toLowerCase().includes(q) ||
        s.scadaTag.toLowerCase().includes(q) ||
        s.iedName.toLowerCase().includes(q) ||
        s.datasetRef.toLowerCase().includes(q)
      );
    });
  }, [
    displayedSignals,
    voltageFilter,
    selectedBayId,
    viewMode,
    iedFilter,
    datasetFilter,
    categoryFilter,
    qualityFilter,
    searchQuery,
    chainFaultMode,
    tracedPoint?.id,
  ]);

  // Derived 6-Stage Signal Chain Model for Selected Signal & Bay
  const activeChain = useMemo(() => {
    const row = catalogueDisplayRows.find(r => r.catalogNumber === tracedPoint?.catalogNumber) || catalogueDisplayRows[0];
    const bay = traceBay;
    const vendorInfo = getVendorForBay(bay);
    const iedName = tracedPoint?.iedName || selectedIed?.name || bay.iedId.replace(/-/g, '_');
    const lnPart = tracedPoint?.logicalNodeClass || row.logicalNodeClass;
    const doPart = tracedPoint?.dataObject || row.dataObject;
    const daPart = tracedPoint?.dataAttribute || row.dataAttribute;
    const fc = tracedPoint?.fc || row.fc;
    const cdcShort = (tracedPoint?.cdc || row.cdc).split(' ')[0];
    const resolvedDataset = mapping?.datasets.find(ds => tracedPoint && datasetPoints(ds, [tracedPoint]).length);
    const report = mapping?.reports.find(rc => rc.dataset === resolvedDataset?.ref);
    const gooseBlock = gooseControlBlocks.find(block => block.publisherIedId === bay.iedId &&
      block.datSet.replace(/\$/g, '.') === resolvedDataset?.ref);
    const gooseCbName = gooseBlock ? `${gooseBlock.gocbName} (${gooseBlock.appId})` : 'Not mapped for this signal';
    const reportCbName = report ? `${report.buffered ? 'BRCB' : 'URCB'} (${report.name})`
      : fc === 'CO' ? 'SBO / Direct CO' : 'No resolved report binding';
    const source = signals.find(point => point.id === tracedPoint?.id);
    const sourceDisplayVal = source ? `${String(source.value)}${source.unit ? ' ' + source.unit : ''}` : 'Not configured';
    const rawVal = tracedPoint?.value ?? 'Not configured';
    const displayVal = typeof rawVal === 'boolean' ? rawVal ? 'TRUE (ACTIVE)' : 'FALSE (NORMAL)'
      : `${String(rawVal)}${tracedPoint?.unit ? ' ' + tracedPoint.unit : ''}`;
    const scadaTag = tracedPoint?.scadaTag || 'Not configured';
    const quality = tracedPoint?.quality ?? bay.quality;
    const overallQuality = `${quality}${chainFaultMode === 'GOOSE_TIMEOUT' ? ' — MMS; GOOSE subscriber timeout' : ''}`;
    const fieldIoTitle = fc === 'MX' ? 'CT / VT / Analog Transducer' : fc === 'CO' ? 'Command Output'
      : /^(P|R)/.test(lnPart) ? 'Protection Logic' : `${row.signalName} — Field Contact`;
    const diModuleTitle = fc === 'MX' ? 'AI – Analog Acquisition' : fc === 'CO' ? 'BO – Command Relay'
      : /^(P|R)/.test(lnPart) ? 'Internal Protection Logic' : 'DI – Binary Input';
    const diChannelLabel = `${lnPart}.${doPart}.${daPart}`;

    return {
      row,
      bay,
      vendorName: `${vendorInfo.vendor} ${vendorInfo.iedModel}`,
      iedModel: vendorInfo.iedModel,
      iedName,
      lnPart,
      doPart,
      daPart,
      fc,
      cdcShort,
      gooseCbName,
      reportCbName,
      displayVal,
      sourceDisplayVal,
      scadaTag: chainFaultMode === 'HMI_TAG_MISMATCH' ? `${scadaTag}_UNMAPPED_ERR` : scadaTag,
      fieldIoTitle,
      diModuleTitle,
      diChannelLabel,
      stageStates: faultStageStates(chainFaultMode),
      overallQuality,
    };
  }, [catalogueDisplayRows, signals, traceBay, tracedPoint, chainFaultMode, gooseControlBlocks, selectedIed, mapping]);

  // Consistent KPI Counts (Section 5)
  const kpiStats = useMemo(() => {
    const totalMapped = signals.length; // 1206
    const goodCount = displayedSignals.filter((s) => s.quality === 'GOOD').length;
    const otherCount = totalMapped - goodCount;

    return {
      totalSignals: FIFTY_SAS_SIGNAL_TEMPLATES.length, // 50
      goodQuality: goodCount, // 1206 when healthy
      otherQuality: otherCount, // 0 when healthy
      selectedBayCode: kpiBay.bayCode, // 33-F03
      iedsInBay: ieds.filter(ied => ied.bayId === kpiBay.id).length,
      datasetsInBay: mapping?.datasets.length || 0,
      reportsAndGooseInBay: (mapping?.reports.length || 0) + gooseControlBlocks.filter(block => block.publisherIedId === kpiBay.iedId).length,
      mappedPoints: totalMapped, // 1206
    };
  }, [signals, displayedSignals, kpiBay, ieds, mapping, gooseControlBlocks]);

  // Report resolved evidence; partial sample SCL is not a station-wide validation pass.
  const validationResults = useMemo(() => {
    const point = tracedPoint;
    const ds = mapping?.datasets.find(candidate => point && datasetPoints(candidate, [point]).length);
    const rc = mapping?.reports.find(candidate => candidate.dataset === ds?.ref);
    return [
      { name: 'Selected IED signal', status: point?.iedId === traceBay.iedId ? 'PASS' : 'FAIL',
        detail: point?.iec61850Ref || 'No signal configured for this IED.', remedy: 'Select a configured IED signal.' },
      { name: 'DataSet FCDA binding', status: ds && chainFaultMode !== 'DATASET_MISSING' && chainFaultMode !== 'WRONG_IEC_REF' ? 'PASS' : 'FAIL',
        detail: ds?.ref || 'No matching LD/LN/DO/DA and FC in the selected mapping source.', remedy: 'Verify the signal reference, FC and DataSet member.' },
      { name: 'Report binding', status: rc && chainFaultMode !== 'REPORT_DISABLED' && chainFaultMode !== 'MMS_DISCONNECT' ? 'PASS' : 'FAIL',
        detail: rc ? `${rc.name} → ${rc.dataset}` : 'No resolved report binding for this signal.', remedy: 'Verify ReportControl DataSet and RptEna.' },
      { name: 'Signal-chain injection', status: selectedFaultMode === 'NONE' ? 'PASS' : 'FAIL',
        detail: activeFault ? `${activeFault.scenario.label}: ${activeFault.scenario.evidence}` : 'No injected fault on this IED.',
        remedy: activeFault?.scenario.recovery || 'None required.' },
      { name: 'Displayed SCADA quality', status: point?.quality === 'GOOD' ? 'PASS' : 'FAIL',
        detail: `${point?.quality || 'NOT CONFIGURED'}; mapping source: ${mapping?.source || 'none'}`,
        remedy: 'Clear the injected fault and resolve any underlying source/communication fault.' },
    ];
  }, [tracedPoint, mapping, chainFaultMode, selectedFaultMode, activeFault, traceBay.iedId]);

  // Export CSV (Section 12)
  const handleExportCsv = () => {
    if (viewMode === 'CATALOGUE_50') {
      const header = [
        'SignalNo',
        'SignalDescription',
        'Category',
        'IEC61850_LN_DO_DA',
        'FC_CDC',
        'ControlModel',
        'DataSet_And_Transport',
        'TestProcedure_And_EngineeringNote',
      ].join(',');
      const rows = filteredCatalogueRows.map((r) =>
        [
          r.catalogNumber,
          `"${r.signalName.replace(/"/g, '""')}"`,
          `"${r.categoryDisplay.replace(/"/g, '""')}"`,
          `"${r.lnDoDaDisplay}"`,
          `"${r.fcCdcDisplay}"`,
          `"${r.controlModelDisplay}"`,
          `"${r.datasetTransportDisplay}"`,
          `"${r.testNoteDisplay.replace(/"/g, '""')}"`,
        ].join(',')
      );
      const csv = [header, ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SAS_50_Master_Signals_Catalogue.csv`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const header = [
      'CatalogNo',
      'PointID',
      'Voltage_kV',
      'Bay',
      'IED_Name',
      'Vendor',
      'Category',
      'SignalDescription',
      'IEC61850_ObjectReference',
      'FC',
      'CDC',
      'DataSet',
      'ControlBlock_GOOSE_Or_RCB',
      'SCADA_Tag',
      'HMI_Object',
      'LiveValue',
      'Quality',
      'Timestamp',
    ].join(',');
    const rows = filteredBayPoints.map((s) =>
      [
        s.catalogNumber,
        s.id,
        s.voltageKv,
        `"${s.bayName.replace(/"/g, '""')}"`,
        s.iedName,
        `"${s.vendor.replace(/"/g, '""')}"`,
        `"${s.category.replace(/"/g, '""')}"`,
        `"${s.signalName.replace(/"/g, '""')}"`,
        s.iec61850Ref,
        s.fc,
        `"${s.cdc.replace(/"/g, '""')}"`,
        s.datasetRef,
        `"${s.rcbOrGooseRef.replace(/"/g, '""')}"`,
        s.scadaTag,
        s.hmiObjectType,
        `"${String(s.value).replace(/"/g, '""')}${s.unit ? ' ' + s.unit : ''}"`,
        s.quality,
        s.timestamp,
      ].join(',')
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `SAS_PerBay_Signal_Mapping_${filteredBayPoints.length}_Points.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleUploadSclFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toUpperCase() || 'SCL';
    const fileType = ['ICD', 'IID', 'SCD', 'CID'].includes(ext) ? ext : 'SCD';
    const reader = new FileReader();
    reader.onload = () => {
      const content = String(reader.result || '');
      const newId = `SCL-USER-${Date.now()}`;
      setUploadedSclFiles((prev) => [
        ...prev,
        {
          id: newId,
          fileType,
          fileName: file.name,
          title: `Imported ${fileType} Engineering File (${file.name})`,
          iecClause: 'IEC 61850-6 Ed2.1 Imported SCL',
          purpose: `User-uploaded ${fileType} XML configuration parsed live via DOMParser.`,
          xmlContent: content,
        },
      ]);
      setSelectedSclId(newId);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleExportSclXml = () => {
    const blob = new Blob([currentSclFile.xmlContent], { type: 'application/xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = currentSclFile.fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ backgroundColor: '#030B18', color: '#E9F3FF' }} className="sas-signal-workspace space-y-2.5 text-xs select-none">
      {/* 1. TOP WORKSPACE TABS & ACTION BAR (Matching Reference Screenshot) */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('CATALOGUE_50')}
            style={{
              backgroundColor: viewMode === 'CATALOGUE_50' ? '#00E5FF' : '#07182B',
              color: viewMode === 'CATALOGUE_50' ? '#02101F' : '#DCEAF5',
              borderColor: viewMode === 'CATALOGUE_50' ? '#00E5FF' : '#1E466E',
              boxShadow: viewMode === 'CATALOGUE_50' ? '0 0 18px rgba(0, 229, 255, 0.55)' : 'none',
            }}
            className="px-4 py-2 rounded-lg text-xs sm:text-[13px] font-extrabold border transition"
          >
            50 Common SAS Signals Master Catalogue
          </button>

          <button
            type="button"
            onClick={() => setViewMode('INSTANTIATED_BAY')}
            style={{
              backgroundColor: viewMode === 'INSTANTIATED_BAY' ? '#00E5FF' : '#07182B',
              color: viewMode === 'INSTANTIATED_BAY' ? '#02101F' : '#DCEAF5',
              borderColor: viewMode === 'INSTANTIATED_BAY' ? '#00E5FF' : '#1E466E',
              boxShadow: viewMode === 'INSTANTIATED_BAY' ? '0 0 18px rgba(0, 229, 255, 0.55)' : 'none',
            }}
            className="px-4 py-2 rounded-lg text-xs sm:text-[13px] font-bold border transition"
          >
            Live Per-Bay Signal Mapping ({signals.length} Total Points)
          </button>

          <button
            type="button"
            onClick={() => setViewMode('SCL_WORKSPACE')}
            style={{
              backgroundColor: viewMode === 'SCL_WORKSPACE' ? '#00E5FF' : '#07182B',
              color: viewMode === 'SCL_WORKSPACE' ? '#02101F' : '#DCEAF5',
              borderColor: viewMode === 'SCL_WORKSPACE' ? '#00E5FF' : '#1E466E',
              boxShadow: viewMode === 'SCL_WORKSPACE' ? '0 0 18px rgba(0, 229, 255, 0.55)' : 'none',
            }}
            className="px-4 py-2 rounded-lg text-xs sm:text-[13px] font-bold border transition"
          >
            SCL XML Engineering Workspace (ICD / IID / SCD / CID)
          </button>
        </div>

        {/* Action Buttons Row Below Top Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setValidationModalOpen(true)}
              style={{
                backgroundColor: '#06281E',
                borderColor: '#22C55E',
                color: '#4ADE80',
                boxShadow: '0 0 10px rgba(34, 197, 94, 0.25)',
              }}
              className="px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:brightness-110 transition"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E]" />
              Validate IEC 61850 Mapping
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              style={{
                backgroundColor: '#081C30',
                borderColor: '#285078',
                color: '#E9F3FF',
              }}
              className="px-3.5 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5 hover:border-[#00DFFF] transition"
            >
              <Download className="w-3.5 h-3.5 text-[#00DFFF]" />
              Export CSV
            </button>
          </div>

          {/* Interactive Signal-Chain Fault Simulator Selector (Section 11) */}
          <div className="sas-signal-fault-control flex flex-wrap items-center gap-2 min-w-0">
            <span className="text-[11px] text-[#8BB3D4] font-semibold flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-[#00DFFF]" /> Signal Chain Test / Fault Sim:
            </span>
            <select
              aria-label="IED fault scenario"
              disabled={!faultScenarios.length}
              value={selectedFaultId}
              onChange={(e) => setChainFaultMode(e.target.value)}
              style={{
                backgroundColor: selectedFaultId === 'NONE' ? '#07182B' : '#3B0D15',
                borderColor: selectedFaultId === 'NONE' ? '#1E466E' : '#FF5C65',
                color: selectedFaultId === 'NONE' ? '#E9F3FF' : '#FDA4AF',
              }}
              className="max-w-full sm:max-w-[460px] px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold"
            >
              <option value="NONE">Normal — Healthy Signal Chain (q=0x0000)</option>
              {faultScenarios.map((scenario, index) => (
                <option key={scenario.id} value={scenario.id}>{index + 1}. {scenario.label}</option>
              ))}
            </select>
            {selectedFaultMode !== 'NONE' && (
              <button
                type="button"
                onClick={() => setChainFaultMode('NONE')}
                className="px-2 py-1 rounded bg-[#093524] border border-[#22C55E] text-[#4ADE80] text-[10.5px] font-bold"
              >
                Restore Healthy
              </button>
            )}
          </div>
        </div>
      </div>

      <div role="status" aria-live="polite" className="rounded-lg border border-[#1E466E] bg-[#07182B] px-3 py-2 text-[11px] text-[#B5ECFA]">
        <strong>{selectedIed?.name || traceBay.iedId}</strong> · {faultScenarios.length}/8 supported faults · {mapping?.source || 'No mapping'}.
        {selectedSclId.startsWith('SCL-USER-') && !importedMappings[selectedIed?.name || ''] && ' Imported SCL has no matching IED; using configured runtime mappings.'}
        {activeFault && <><br />{activeFault.scenario.evidence}<br />Recovery: {activeFault.scenario.recovery}</>}
        {tracedPoint?.catalogNumber !== selectedCatalogNo && <><br />Catalogue #{selectedCatalogNo} is not configured here; tracing {tracedPoint?.signalName || 'no signal'}.</>}
      </div>

      {activeChain.bay.bayType === 'OUTGOING_FEEDER' && (
        <RecloseTrainingPanel
          key={activeChain.bay.id}
          bayId={activeChain.bay.id}
          onAfterResetTrip={() => {
            if (activeFault?.scenario.tripsBreaker) {
              setFaultsByIed(previous => { const next = { ...previous }; delete next[traceBay.iedId]; return next; });
            }
          }}
        />
      )}

      {/* 2. MAIN END-TO-END SAS SIGNAL CHAIN TRACE PANEL */}
      <SignalChainDashboard
        activeChain={activeChain}
        ied={ieds.find((x) => x.id === activeChain.bay.iedId)}
        ieds={ieds}
        bays={bays}
        onSelectBay={(bayId) => {
          setSelectedBayId(bayId);
          const matchedBay = bays.find((b) => b.id === bayId);
          if (matchedBay) {
            setSelectedIedId(matchedBay.iedId);
            const matchedSig = signals.find((s) => s.bayId === bayId && s.catalogNumber === selectedCatalogNo) || signals.find(s => s.bayId === bayId);
            if (matchedSig) setSelectedPointId(matchedSig.id);
          }
        }}
        networkLinks={networkLinks}
        gooseControlBlocks={gooseControlBlocks}
        networkRedundancyMode={networkRedundancyMode}
        tracedPoint={tracedPoint}
        chainFaultMode={chainFaultMode}
        faultModeByBay={faultModeByBay}
        faultScenarios={faultScenarios}
        activeFault={activeFault}
        faultsByIed={validFaults}
        setChainFaultMode={setChainFaultMode}
        selectedStageIndex={selectedStageIndex}
        setSelectedStageIndex={setSelectedStageIndex}
        liveClockStr={tracedPoint?.timestamp || liveClockStr}
        onToggleBreaker={(bayId, target) => commandBreaker(bayId, target, 'SCADA_SBO')}
        onTriggerTrip={triggerProtectionTrip}
        onResetTrip={resetProtectionTrip}
      />

      {/* SECTION 12: MULTI-PROTOCOL MAPPING SELECTOR & END-TO-END CROSS-PROTOCOL TRACE */}
      <div
        style={{ backgroundColor: '#051324', borderColor: '#1B4B72' }}
        className="rounded-xl border p-3 space-y-2.5 shadow-lg"
      >
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#163B5C] pb-2">
          <div>
            <span className="text-xs font-extrabold text-white uppercase tracking-wider">
              Protocol Mapping Selector &amp; Cross-Protocol Signal Trace (Signal #{activeChain.row.catalogNumber}: {activeChain.row.signalName})
            </span>
            <div className="text-[11px] text-[#77E7FF] font-mono mt-0.5">
              End-to-End Flow: Field Breaker ({activeChain.bay.bayCode}) → {activeChain.iedName} → IEC 61850 MMS (TCP/102) → SCADA → Gateway Mapping → IEC-104 (TCP/2404) → RCC (&amp; OPC UA TCP/4840 → Historian)
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[
              { id: 'MMS', label: 'IEC 61850 MMS (TCP/102)', color: '#00CFFF' },
              { id: 'GOOSE', label: 'IEC 61850 GOOSE (0x88B8)', color: '#22C55E' },
              { id: 'MODBUS', label: 'Modbus TCP (TCP/502)', color: '#F97316' },
              { id: 'IEC104', label: 'IEC-104 (TCP/2404)', color: '#A855F7' },
              { id: 'OPCUA', label: 'OPC UA (TCP/4840)', color: '#3B82F6' },
            ].map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setSelectedProtocolMapMode(pm.id as any)}
                style={{
                  backgroundColor: selectedProtocolMapMode === pm.id ? pm.color : '#071A2E',
                  color: selectedProtocolMapMode === pm.id ? '#02101F' : pm.color,
                  borderColor: pm.color,
                }}
                className="px-2.5 py-1 rounded-lg border text-[11px] font-extrabold transition"
              >
                {pm.label}
              </button>
            ))}
          </div>
        </div>

        {selectedProtocolMapMode === 'MMS' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2 font-mono text-[10.5px]">
            {[
              ['Protocol', 'IEC 61850 MMS (TCP/102)'],
              ['IED', activeChain.iedName],
              ['Logical Device (LD)', `${activeChain.iedName}Application`],
              ['Logical Node (LN)', activeChain.lnPart],
              ['Data Object (DO)', activeChain.doPart],
              ['Data Attribute (DA)', activeChain.daPart],
              ['FC / CDC', `[${activeChain.fc}] / ${activeChain.cdcShort}`],
              ['DataSet & RCB', `${activeChain.row.defaultDataset} • ${activeChain.reportCbName}`],
            ].map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-[#04101E] border border-[#00CFFF]/50">
                <div className="text-[9.5px] text-[#8BB3D4] font-sans">{k}</div>
                <div className="font-bold text-white break-all mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        )}

        {selectedProtocolMapMode === 'GOOSE' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 font-mono text-[10.5px]">
            {[
              ['Protocol', 'IEC 61850 GOOSE (0x88B8)'],
              ['Publisher IED', activeChain.iedName],
              ['GOOSE Control Block', activeChain.gooseCbName],
              ['DataSet', `${activeChain.iedName}/LLN0$${activeChain.row.defaultDataset}`],
              ['APPID / Multicast MAC', '0x0001 • 01-0C-CD-01-00-01 (VLAN 20 P4)'],
              ['Subscriber & ExtRef', `IED_132_BC • CILO1/PTRC1.In01_${activeChain.doPart}`],
            ].map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-[#04101E] border border-[#22C55E]/50">
                <div className="text-[9.5px] text-[#8BB3D4] font-sans">{k}</div>
                <div className="font-bold text-[#4ADE80] break-all mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        )}

        {selectedProtocolMapMode === 'MODBUS' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-2 font-mono text-[10.5px]">
            {[
              ['Protocol', 'Modbus TCP — Port 502'],
              ['Server IP', '10.132.30.51 (Feeder Meter)'],
              ['Unit ID (Slave)', 'Unit ID 1'],
              ['Register Type', activeChain.fc === 'CO' ? '06 Single Holding Register' : '04 Input Register / 03 Holding'],
              ['Register Address', `${30000 + activeChain.row.catalogNumber * 2 - 1} (PDU 0x${((activeChain.row.catalogNumber - 1) * 2).toString(16).padStart(4, '0').toUpperCase()})`],
              ['Data Type & Scaling', activeChain.row.category === 'Electrical Measurements' ? 'FLOAT32 • Scaling ×0.01' : 'UINT16 Bitmask • Scaling ×1'],
            ].map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-[#04101E] border border-[#F97316]/50">
                <div className="text-[9.5px] text-[#8BB3D4] font-sans">{k}</div>
                <div className="font-bold text-[#FDBA74] break-all mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        )}

        {selectedProtocolMapMode === 'IEC104' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 font-mono text-[10.5px]">
            {[
              ['Protocol', 'IEC 60870-5-104 (TCP/2404)'],
              ['Common Address (COA)', '132 (0x0084 — Station Gateway)'],
              ['Information Object Addr (IOA)', `IOA ${1000 + activeChain.row.catalogNumber}`],
              ['Type ID', activeChain.fc === 'MX' ? '36 (M_ME_TF_1 Short Float)' : activeChain.fc === 'CO' ? '46 (C_DC_NA_1 Double Cmd)' : '31 (M_DP_TB_1 Double-Point)'],
              ['Cause of Transmission (COT)', activeChain.fc === 'CO' ? '6 (Act) → 7 (ActCon) → 10 (Term)' : '3 (Spontaneous) / 20 (GI)'],
            ].map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-[#04101E] border border-[#A855F7]/50">
                <div className="text-[9.5px] text-[#8BB3D4] font-sans">{k}</div>
                <div className="font-bold text-[#D8B4FE] break-all mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        )}

        {selectedProtocolMapMode === 'OPCUA' && (
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2 font-mono text-[10.5px]">
            {[
              ['Protocol & Endpoint', 'OPC UA — opc.tcp://10.132.10.200:4840'],
              ['Namespace', 'ns=2 (urn:sas:iec61850:substation)'],
              ['NodeId', `ns=2;s=SAS.${activeChain.bay.bayCode.replace(/-/g, '_')}.${activeChain.row.lnDoDaDisplay}`],
              ['DataType', activeChain.fc === 'MX' ? 'Double (Float64)' : 'String / Int32'],
              ['StatusCode', tracedPoint?.quality === 'GOOD' ? 'Good (0x00000000)' : tracedPoint?.quality === 'QUESTIONABLE' ? 'Uncertain (0x40000000)' : 'Bad (0x80000000)'],
            ].map(([k, v]) => (
              <div key={k} className="p-2 rounded bg-[#04101E] border border-[#3B82F6]/50">
                <div className="text-[9.5px] text-[#8BB3D4] font-sans">{k}</div>
                <div className="font-bold text-[#93C5FD] break-all mt-0.5">{v}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {viewMode !== 'SCL_WORKSPACE' ? (
        <>
          {/* 3. SIGNAL CATEGORY FILTERS & SEARCH BAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
            <div className="flex flex-wrap items-center gap-1.5">
              {(
                [
                  ['ALL', 'All 50 Signals'],
                  ['Circuit Breaker & Switchgear', 'Circuit Breaker & Switchgear'],
                  ['Protection Signals', 'Protection Signals'],
                  ['Electrical Measurements', 'Electrical Measurements'],
                  ['Transformer & SAS System', 'Transformer & SAS System'],
                ] as const
              ).map(([catKey, label]) => {
                const active = categoryFilter === catKey;
                return (
                  <button
                    key={catKey}
                    type="button"
                    onClick={() => setCategoryFilter(catKey)}
                    style={{
                      backgroundColor: active ? '#168BFF' : '#061628',
                      borderColor: active ? '#38BDF8' : '#1B3E62',
                      color: active ? '#FFFFFF' : '#C8E0F4',
                    }}
                    className="px-3 py-1.5 rounded-lg border text-xs font-bold transition hover:border-[#00DFFF]"
                  >
                    {label}
                  </button>
                );
              })}
            </div>

            <div className="relative min-w-[250px] sm:min-w-[290px]">
              <Search className="w-3.5 h-3.5 text-[#77E7FF] absolute left-3 top-2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter signal, LN, DO, dataset..."
                style={{
                  backgroundColor: '#051324',
                  borderColor: '#1E466E',
                  color: '#E9F3FF',
                }}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border text-xs placeholder-[#6C92B4] focus:outline-none focus:border-[#00DFFF]"
              />
            </div>
          </div>

          {/* Additional Per-Bay Filters when in Tab 2 (Live Per-Bay Signal Mapping) */}
          {viewMode === 'INSTANTIATED_BAY' && (
            <div
              style={{ backgroundColor: '#06172A', borderColor: '#1B4369' }}
              className="p-2.5 rounded-xl border flex flex-wrap items-center gap-2.5 text-xs"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[#8BB3D4] font-semibold">Voltage:</span>
                {(['ALL', 132, 33, 11] as const).map((v) => (
                  <button
                    key={String(v)}
                    type="button"
                    onClick={() => setVoltageFilter(v)}
                    style={{
                      backgroundColor: voltageFilter === v ? '#00DFFF' : '#04101E',
                      color: voltageFilter === v ? '#02101F' : '#DCEAF5',
                      borderColor: '#1E466E',
                    }}
                    className="px-2 py-0.5 rounded border font-bold text-[11px]"
                  >
                    {v === 'ALL' ? 'All kV' : `${v} kV`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#8BB3D4] font-semibold">Bay:</span>
                <select
                  value={selectedBayId}
                  onChange={(e) => setSelectedBayId(e.target.value)}
                  style={{ backgroundColor: '#04101E', borderColor: '#1E466E', color: '#E9F3FF' }}
                  className="px-2 py-1 rounded border text-[11px] font-semibold"
                >
                  <option value="ALL_BAYS">All 28 Substation Bays ({signals.length} Points)</option>
                  {bays.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.bayCode} — {b.name} ({b.voltageKv} kV)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#8BB3D4] font-semibold">DataSet:</span>
                <select
                  value={datasetFilter}
                  onChange={(e) => setDatasetFilter(e.target.value)}
                  style={{ backgroundColor: '#04101E', borderColor: '#1E466E', color: '#E9F3FF' }}
                  className="px-2 py-1 rounded border text-[11px] font-mono"
                >
                  <option value="ALL">All DataSets</option>
                  <option value="dsStatus">dsStatus</option>
                  <option value="dsProtTrip">dsProtTrip</option>
                  <option value="dsMeas">dsMeas</option>
                  <option value="dsAlarm">dsAlarm</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-[#8BB3D4] font-semibold">Quality:</span>
                {(['ALL', 'GOOD', 'OTHER'] as const).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQualityFilter(q)}
                    style={{
                      backgroundColor: qualityFilter === q ? '#168BFF' : '#04101E',
                      color: '#FFFFFF',
                      borderColor: '#1E466E',
                    }}
                    className="px-2 py-0.5 rounded border font-bold text-[10.5px]"
                  >
                    {q}
                  </button>
                ))}
              </div>

              <span className="ml-auto font-mono text-[11px] text-[#00DFFF] font-bold">
                Showing {filteredBayPoints.length} of {signals.length} mapped points
              </span>
            </div>
          )}

          {/* 4. EIGHT KPI CARDS (Matching Reference Screenshot Order & Layout) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-2">
            {[
              {
                value: kpiStats.totalSignals,
                label: 'Total Signals',
                icon: <Activity className="w-5 h-5 text-[#00DFFF]" />,
              },
              {
                value: kpiStats.goodQuality,
                label: 'Good Quality',
                icon: <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />,
              },
              {
                value: kpiStats.otherQuality,
                label: 'Other Quality',
                icon: <AlertTriangle className="w-5 h-5 text-[#FFB547]" />,
              },
              {
                value: kpiStats.selectedBayCode,
                label: 'Selected Bay',
                icon: <ShieldCheck className="w-5 h-5 text-[#00DFFF]" />,
              },
              {
                value: kpiStats.iedsInBay,
                label: 'IEDs (Bay)',
                icon: <Cpu className="w-5 h-5 text-[#00DFFF]" />,
              },
              {
                value: kpiStats.datasetsInBay,
                label: 'DataSets (Bay)',
                icon: <Database className="w-5 h-5 text-[#00DFFF]" />,
              },
              {
                value: kpiStats.reportsAndGooseInBay,
                label: 'Reports / GOOSE',
                icon: <Network className="w-5 h-5 text-[#00DFFF]" />,
              },
              {
                value: kpiStats.mappedPoints,
                label: 'Mapped Points',
                icon: <Radio className="w-5 h-5 text-[#00DFFF]" />,
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                style={{
                  background: 'linear-gradient(180deg, #0A2942 0%, #061627 100%)',
                  borderColor: '#1E4B75',
                  boxShadow: 'inset 0 0 12px rgba(0, 223, 255, 0.07)',
                }}
                className="rounded-xl border px-3 py-2 flex items-center gap-2.5"
              >
                <div className="p-1.5 rounded-lg bg-[#041220] border border-[#193E63] shrink-0">{kpi.icon}</div>
                <div className="min-w-0">
                  <div className="text-base sm:text-lg font-extrabold text-white leading-tight truncate">
                    {kpi.value}
                  </div>
                  <div className="text-[10px] text-[#9BC0DF] font-medium truncate">{kpi.label}</div>
                </div>
              </div>
            ))}
          </div>

          {/* 5. MASTER CATALOGUE / BAY MAPPING TABLE (LEFT) + IED SIGNAL CHAIN DETAILS & SIGNAL PATH (RIGHT) */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 items-start">
            {/* LEFT 8 COLUMNS: ENGINEERING SIGNAL TABLE */}
            <div
              style={{
                backgroundColor: '#051324',
                borderColor: '#1E4B75',
                boxShadow: '0 4px 18px rgba(0,0,0,0.4)',
              }}
              className="xl:col-span-8 rounded-xl border overflow-hidden"
            >
              {viewMode === 'CATALOGUE_50' ? (
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full min-w-[780px] text-left border-collapse text-[11px]">
                    <thead
                      style={{ backgroundColor: '#09243E', borderBottom: '1.5px solid #00DFFF' }}
                      className="sticky top-0 z-10 text-white font-bold"
                    >
                      <tr>
                        <th className="py-1.5 px-2 w-8">#</th>
                        <th className="py-1.5 px-2">Signal Description</th>
                        <th className="py-1.5 px-2">Category</th>
                        <th className="py-1.5 px-2">IEC 61850 LN.DO.DA</th>
                        <th className="py-1.5 px-2">FC / CDC</th>
                        <th className="py-1.5 px-2">Control Model</th>
                        <th className="py-1.5 px-2">DataSet &amp; Transport</th>
                        <th className="py-1.5 px-2">Test Procedure / Engineering Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#122C46]">
                      {filteredCatalogueRows.map((row) => {
                        const isSelected = selectedCatalogNo === row.catalogNumber;
                        return (
                          <tr
                            key={row.catalogNumber}
                            onClick={() => setSelectedCatalogNo(row.catalogNumber)}
                            style={{
                              backgroundColor: isSelected
                                ? 'rgba(0, 180, 235, 0.16)'
                                : row.catalogNumber % 2 === 0
                                ? '#04101E'
                                : '#061628',
                              borderTop: isSelected ? '1px solid #00DFFF' : undefined,
                              borderBottom: isSelected ? '1px solid #00DFFF' : undefined,
                            }}
                            className="cursor-pointer hover:bg-[#0B2948] transition"
                          >
                            <td className="py-1.5 px-2 font-mono font-bold text-white">{row.catalogNumber}</td>
                            <td className="py-1.5 px-2 font-extrabold text-white">{row.signalName}</td>
                            <td className="py-1.5 px-2 text-[#B8D4EA]">{row.categoryDisplay}</td>
                            <td className="py-1.5 px-2 font-mono font-bold text-[#4ADE80]">
                              {row.lnDoDaDisplay}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[#FFB547] font-semibold">
                              {row.fcCdcDisplay}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[10.5px] text-[#DCEAF5]">
                              {row.controlModelDisplay}
                            </td>
                            <td className="py-1.5 px-2 font-mono text-[10.5px] text-[#00DFFF] font-semibold">
                              {row.datasetTransportDisplay}
                            </td>
                            <td className="py-1.5 px-2 text-[10.5px] text-[#DCEAF5] leading-snug max-w-[270px]">
                              {row.testNoteDisplay}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="overflow-x-auto max-h-[360px]">
                  <table className="w-full min-w-[860px] text-left border-collapse text-[11px]">
                    <thead
                      style={{ backgroundColor: '#09243E', borderBottom: '1.5px solid #00DFFF' }}
                      className="sticky top-0 z-10 text-white font-bold"
                    >
                      <tr>
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Bay &amp; Source Signal</th>
                        <th className="py-2 px-2">IED</th>
                        <th className="py-2 px-2">IEC 61850 Object Ref</th>
                        <th className="py-2 px-2">FC / CDC</th>
                        <th className="py-2 px-2">DataSet &amp; Control Block</th>
                        <th className="py-2 px-2">SCADA Tag / HMI</th>
                        <th className="py-2 px-2">Value / Quality</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#122C46]">
                      {filteredBayPoints.slice(0, 250).map((pt) => {
                        const isSel = tracedPoint?.id === pt.id;
                        return (
                          <tr
                            key={pt.id}
                            onClick={() => {
                              setSelectedPointId(pt.id);
                              setSelectedCatalogNo(pt.catalogNumber);
                            }}
                            style={{ backgroundColor: isSel ? 'rgba(0, 180, 235, 0.18)' : '#051324', }}
                            className="cursor-pointer hover:bg-[#0B2948] transition"
                          >
                            <td className="py-2 px-2 font-mono text-[#00DFFF] font-bold">{pt.catalogNumber}</td>
                            <td className="py-2 px-2">
                              <div className="font-bold text-white">{pt.signalName}</div>
                              <div className="text-[10px] text-[#8BB3D4]">{pt.bayName}</div>
                            </td>
                            <td className="py-2 px-2 font-mono text-white">
                              <div>{pt.iedName}</div>
                              <div className="text-[9.5px] text-[#8BB3D4]">{pt.vendor}</div>
                            </td>
                            <td className="py-2 px-2 font-mono text-[#4ADE80]">{pt.iec61850Ref}</td>
                            <td className="py-2 px-2 font-mono text-[#FFB547]">
                              [{pt.fc}] / {pt.cdc.split(' ')[0]}
                            </td>
                            <td className="py-2 px-2 font-mono text-[10px] text-[#00DFFF]">
                              <div>{pt.datasetRef}</div>
                              <div className="text-[#B8D4EA]">{pt.rcbOrGooseRef}</div>
                            </td>
                            <td className="py-2 px-2 font-mono text-[10px] text-white">
                              <div>{pt.scadaTag}</div>
                              <div className="text-[#8BB3D4]">{pt.hmiObjectType}</div>
                            </td>
                            <td className="py-2 px-2 font-mono">
                              <div className="font-bold text-[#22C55E]">
                                {String(pt.value)} {pt.unit || ''}
                              </div>
                              <div className="text-[9.5px] text-[#4ADE80]">
                                {pt.quality} • {pt.timestamp}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* RIGHT 4 COLUMNS: IED SIGNAL CHAIN DETAILS + VERTICAL SIGNAL PATH VALIDATION TRACKER */}
            <div
              style={{
                background: 'linear-gradient(180deg, #08233B 0%, #051324 100%)',
                borderColor: '#00DFFF',
                boxShadow: '0 0 18px rgba(0, 223, 255, 0.14)',
              }}
              className="xl:col-span-4 rounded-xl border p-3"
            >
              <div className="flex items-center gap-2 border-b border-[#194368] pb-2 mb-2.5">
                <Layers className="w-4 h-4 text-[#00DFFF]" />
                <h3 className="text-xs sm:text-[13px] font-extrabold text-white">IED Signal Chain Details</h3>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(0, 1fr) 168px",
                  gap: "10px",
                  alignItems: "stretch",
                }}
              >
                {/* Left Metadata List */}
                <div style={{ display: "flex", flexDirection: "column", gap: "3px", fontSize: "10.2px" }}>
                  {[
                    ['Signal No.', String(activeChain.row.catalogNumber)],
                    ['Signal Description', activeChain.row.signalName],
                    [
                      'Bay / Voltage',
                      activeChain.bay.id === 'BAY-132-L1'
                        ? '132 kV – Line-1 (BAY-132-L1)'
                        : `${activeChain.bay.voltageKv} kV – ${activeChain.bay.name} (${activeChain.bay.id})`,
                    ],
                    ['IED (Make/Model)', activeChain.vendorName],
                    ['IED Name', activeChain.iedName],
                    [
                      'Logical Node (LN)',
                      activeChain.lnPart === 'XCBR1'
                        ? 'XCBR1 (Circuit Breaker)'
                        : `${activeChain.lnPart} (${activeChain.row.categoryDisplay})`,
                    ],
                    ['Data Object (DO)', activeChain.doPart],
                    [
                      'Data Attribute (DA)',
                      `${activeChain.daPart} (CDC: ${activeChain.cdcShort}, FC: ${activeChain.fc})`,
                    ],
                    ['DataSet', activeChain.row.defaultDataset],
                    [
                      'Transport',
                      activeChain.row.transportType === 'GOOSE_AND_MMS'
                        ? `GOOSE (${activeChain.gooseCbName}), Report (${activeChain.reportCbName})`
                        : `Report (${activeChain.reportCbName})`,
                    ],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display: "grid", gridTemplateColumns: "106px 8px minmax(0, 1fr)", alignItems: "baseline", lineHeight: 1.28 }}>
                      <span className="text-[#9BC0DF]">{k}</span>
                      <span className="text-[#6C92B4]">:</span>
                      <span className="font-bold text-white break-words">{v}</span>
                    </div>
                  ))}

                  <div style={{ display: "grid", gridTemplateColumns: "106px 8px minmax(0, 1fr)", alignItems: "center", lineHeight: 1.28 }}>
                    <span className="text-[#9BC0DF]">Quality</span>
                    <span className="text-[#6C92B4]">:</span>
                    <span
                      className={`font-bold flex items-center gap-1 ${
                        tracedPoint?.quality === 'GOOD' ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {activeChain.overallQuality}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "106px 8px minmax(0, 1fr)", alignItems: "baseline", lineHeight: 1.28 }}>
                    <span className="text-[#9BC0DF]">Last Update</span>
                    <span className="text-[#6C92B4]">:</span>
                    <span className="font-mono text-[10px] text-[#DCEAF5]">{tracedPoint?.timestamp || liveClockStr}</span>
                  </div>
                </div>

                {/* Right Vertical Validation Tracker: Signal Path (IED Signal Chain) (5 cols) */}
                <div
                  style={{
                    backgroundColor: '#041222',
                    borderColor: '#1E5280',
                  }}
                  className="sm:col-span-5 rounded-xl border p-2.5 flex flex-col justify-between"
                >
                  <div className="text-[10.5px] font-extrabold text-white border-b border-[#163A5C] pb-1.5 mb-2 text-center">
                    Signal Path (IED Signal Chain)
                  </div>

                  <div className="relative pl-1 space-y-2.5 my-auto">
                    {/* Vertical Connector Line */}
                    <div
                      style={{
                        position: 'absolute',
                        left: '12px',
                        top: '10px',
                        bottom: '10px',
                        width: '2px',
                        backgroundColor: chainFaultMode === 'NONE' ? '#22C55E' : '#FFB547',
                      }}
                    />

                    {[
                      {
                        idx: 0,
                        title: activeChain.fieldIoTitle,
                        sub: null,
                      },
                      {
                        idx: 1,
                        title: activeChain.diModuleTitle,
                        sub: null,
                      },
                      {
                        idx: 2,
                        title: 'IED Processing',
                        sub: '(Filter + Debounce)',
                      },
                      {
                        idx: 3,
                        title: 'IEC 61850 Mapping',
                        sub: activeChain.row.lnDoDaDisplay,
                      },
                      {
                        idx: 4,
                        title: 'GOOSE / Report',
                        sub: `(${activeChain.reportCbName.split(' ')[0]})`,
                      },
                      {
                        idx: 5,
                        title: 'SCADA / HMI',
                        sub: `(${activeChain.displayVal})`,
                        highlightGreen: tracedPoint?.quality === 'GOOD',
                      },
                    ].map((step) => {
                      const st = activeChain.stageStates[step.idx];
                      return (
                        <div
                          key={step.idx}
                          onClick={() => setSelectedStageIndex(step.idx)}
                          className="relative z-10 flex items-start gap-2 cursor-pointer group"
                        >
                          <span
                            style={{
                              backgroundColor:
                                st === 'OK' ? '#22C55E' : st === 'WARN' ? '#FFB547' : '#FF5C65',
                              color: '#02101F',
                              boxShadow:
                                st === 'OK'
                                  ? '0 0 8px rgba(34, 197, 94, 0.6)'
                                  : '0 0 8px rgba(255, 92, 101, 0.6)',
                            }}
                            className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5"
                          >
                            {st === 'OK' ? '✓' : st === 'WARN' ? '!' : '✕'}
                          </span>
                          <div className="text-[10px] leading-tight">
                            <div className="font-bold text-white group-hover:text-[#00DFFF]">{step.title}</div>
                            {step.sub && (
                              <div
                                className={
                                  step.highlightGreen
                                    ? 'font-extrabold text-[#22C55E]'
                                    : 'font-mono text-[9.5px] text-[#9BC0DF]'
                                }
                              >
                                {step.sub}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* 6. TAB 3: SCL XML ENGINEERING WORKSPACE (ICD / IID / SCD / CID) */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-3 pt-1">
          <div className="xl:col-span-4 space-y-2.5">
            <div
              style={{ backgroundColor: '#06182C', borderColor: '#00DFFF' }}
              className="p-3 rounded-xl border space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-white uppercase">
                  Import / Inspect IEC 61850-6 SCL Files
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".icd,.iid,.scd,.cid,.xml"
                  onChange={handleUploadSclFile}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  style={{ backgroundColor: '#00E5FF', color: '#02101F' }}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-extrabold flex items-center gap-1"
                >
                  <Upload className="w-3.5 h-3.5" /> Import ICD/IID/SCD/CID
                </button>
              </div>
              <p className="text-[11px] text-[#8BB3D4]">
                Upload any real XML-based `.icd`, `.iid`, `.scd`, or `.cid` file to parse its IEDs, AccessPoints, LogicalDevices, DataSets, ReportControls, GSEControls, and SubNetworks live.
              </p>
            </div>

            {allSclFiles.map((scl) => (
              <button
                key={scl.id}
                type="button"
                onClick={() => setSelectedSclId(scl.id)}
                style={{
                  backgroundColor: selectedSclId === scl.id ? '#0B2742' : '#051324',
                  borderColor: selectedSclId === scl.id ? '#00DFFF' : '#1B3E62',
                }}
                className="w-full text-left p-3 rounded-xl border transition space-y-1"
              >
                <div className="flex items-center justify-between">
                  <span className="px-2 py-0.5 rounded bg-[#00DFFF]/20 text-[#00DFFF] font-bold text-[11px] font-mono">
                    .{scl.fileType}
                  </span>
                  <span className="text-[11px] font-mono text-[#8BB3D4]">{scl.fileName}</span>
                </div>
                <div className="text-xs font-extrabold text-white">{scl.title}</div>
                <div className="text-[10.5px] text-[#4ADE80] font-mono">{scl.iecClause}</div>
                <p className="text-[11px] text-[#B8D4EA] leading-snug">{scl.purpose}</p>
              </button>
            ))}
          </div>

          <div
            style={{ backgroundColor: '#051324', borderColor: '#1E4B75' }}
            className="xl:col-span-8 p-3.5 rounded-xl border space-y-3"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#193E63] pb-2.5">
              <div>
                <div className="text-sm font-extrabold text-white font-mono">
                  {parsedScl.fileName} — Header ID: {parsedScl.headerId} (Ver {parsedScl.version} / Rev {parsedScl.revision})
                </div>
                <div className="text-[11px] text-[#8BB3D4]">
                  Parsed {parsedScl.ieds.length} IED(s) • {parsedScl.subnetworks.length} SubNetwork(s) •{' '}
                  {parsedScl.validationIssues.filter((i) => i.severity === 'ERROR').length} Schema Errors
                </div>
              </div>
              <button
                type="button"
                onClick={handleExportSclXml}
                style={{ backgroundColor: '#08223A', borderColor: '#00DFFF', color: '#00DFFF' }}
                className="px-3 py-1.5 rounded-lg border text-xs font-bold flex items-center gap-1.5"
              >
                <Download className="w-3.5 h-3.5" /> Export XML ({currentSclFile.fileType})
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ['TREE', 'IED / AccessPoint / LDevice Tree'],
                  ['DATASETS_RCBS', 'DataSets, ReportControl & GSEControl'],
                  ['COMMUNICATION', 'Communication & SubNetworks'],
                  ['VALIDATOR', 'SCL Reference Validator'],
                  ['RAW_XML', 'Raw SCL XML Source'],
                ] as const
              ).map(([tabId, label]) => (
                <button
                  key={tabId}
                  type="button"
                  onClick={() => setSclSubTab(tabId)}
                  style={{
                    backgroundColor: sclSubTab === tabId ? '#168BFF' : '#081C30',
                    color: '#FFFFFF',
                    borderColor: sclSubTab === tabId ? '#00DFFF' : '#1E466E',
                  }}
                  className="px-3 py-1 rounded-lg border text-[11px] font-bold"
                >
                  {label}
                </button>
              ))}
            </div>

            {sclSubTab === 'TREE' && (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto">
                {parsedScl.ieds.map((ied) => (
                  <div
                    key={ied.name}
                    style={{ backgroundColor: '#071A2E', borderColor: '#1E466E' }}
                    className="p-3 rounded-lg border space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono font-extrabold text-[#00DFFF] text-xs">
                        IED: {ied.name} ({ied.manufacturer} • {ied.type})
                      </span>
                      <span className="text-[10.5px] font-mono text-[#4ADE80]">
                        AccessPoints: [{ied.accessPoints.join(', ')}] • Config: {ied.configVersion}
                      </span>
                    </div>
                    {ied.logicalDevices.map((ld) => (
                      <div
                        key={ld.inst}
                        style={{ backgroundColor: '#04101E', borderColor: '#153454' }}
                        className="p-2.5 rounded border space-y-1 font-mono text-[11px]"
                      >
                        <div className="text-[#FACC15] font-bold">LDevice inst=&quot;{ld.inst}&quot;</div>
                        <div className="text-[#DCEAF5]">
                          Logical Nodes ({ld.logicalNodes.length}): {ld.logicalNodes.join(', ')}
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            )}

            {sclSubTab === 'DATASETS_RCBS' && (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto font-mono text-[11px]">
                {parsedScl.ieds.flatMap((ied) =>
                  ied.logicalDevices.map((ld) => (
                    <div
                      key={`${ied.name}-${ld.inst}`}
                      style={{ backgroundColor: '#071A2E', borderColor: '#1E466E' }}
                      className="p-3 rounded-lg border space-y-2"
                    >
                      <div className="text-white font-bold">
                        {ied.name} / {ld.inst} — DataSets ({ld.datasets.length}), ReportControls ({ld.reportControls.length}), GSEControls ({ld.gseControls.length})
                      </div>
                      {ld.datasets.map((ds) => (
                        <div key={ds.name} className="p-2 rounded bg-[#04101E] border border-[#153454]">
                          <div className="text-[#00DFFF] font-bold">
                            DataSet name=&quot;{ds.name}&quot; ({ds.fcdaCount} FCDAs) — {ds.desc}
                          </div>
                          <div className="text-[10px] text-[#9BC0DF] mt-1">{ds.fcdas.join(' • ')}</div>
                        </div>
                      ))}
                      {ld.reportControls.map((rc) => (
                        <div key={rc.name} className="p-2 rounded bg-[#04101E] border border-[#153454] text-[#4ADE80]">
                          ReportControl name=&quot;{rc.name}&quot; rptID=&quot;{rc.rptID}&quot; datSet=&quot;{rc.datSet}&quot; buffered=&quot;{rc.buffered}&quot; intgPd=&quot;{rc.intgPd}&quot;
                        </div>
                      ))}
                      {ld.gseControls.map((gc) => (
                        <div key={gc.name} className="p-2 rounded bg-[#04101E] border border-[#153454] text-[#FACC15]">
                          GSEControl name=&quot;{gc.name}&quot; appID=&quot;{gc.appID}&quot; datSet=&quot;{gc.datSet}&quot; type=&quot;{gc.type}&quot;
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>
            )}

            {sclSubTab === 'COMMUNICATION' && (
              <div className="space-y-2.5 max-h-[380px] overflow-y-auto font-mono text-[11px]">
                {parsedScl.subnetworks.map((sn) => (
                  <div
                    key={sn.name}
                    style={{ backgroundColor: '#071A2E', borderColor: '#1E466E' }}
                    className="p-3 rounded-lg border space-y-1"
                  >
                    <div className="text-[#00DFFF] font-bold">
                      SubNetwork name=&quot;{sn.name}&quot; type=&quot;{sn.type}&quot; ({sn.bitRate})
                    </div>
                    <div className="text-[#DCEAF5]">
                      Connected AccessPoints: {sn.connectedAps.join(', ') || 'None'}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {sclSubTab === 'VALIDATOR' && (
              <div className="space-y-2 max-h-[380px] overflow-y-auto">
                {parsedScl.validationIssues.map((iss, idx) => (
                  <div
                    key={idx}
                    style={{
                      backgroundColor:
                        iss.severity === 'ERROR'
                          ? '#3B0D15'
                          : iss.severity === 'WARNING'
                          ? '#3B2609'
                          : '#06281E',
                      borderColor:
                        iss.severity === 'ERROR'
                          ? '#FF5C65'
                          : iss.severity === 'WARNING'
                          ? '#FFB547'
                          : '#22C55E',
                    }}
                    className="p-3 rounded-lg border space-y-1 text-xs"
                  >
                    <div className="font-extrabold text-white">[{iss.severity}] {iss.message}</div>
                    <div className="text-[11px] text-[#DCEAF5]">Recommendation: {iss.suggestion}</div>
                  </div>
                ))}
              </div>
            )}

            {sclSubTab === 'RAW_XML' && (
              <pre
                style={{ backgroundColor: '#030C18', borderColor: '#193E63' }}
                className="p-3.5 rounded-xl border font-mono text-[11px] text-[#4ADE80] overflow-x-auto max-h-[380px] leading-relaxed"
              >
                {parsedScl.rawXml}
              </pre>
            )}
          </div>
        </div>
      )}

      {/* 7. IEC 61850 MAPPING VALIDATION REPORT MODAL */}
      {validationModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div
            style={{ backgroundColor: '#051426', borderColor: '#00DFFF' }}
            className="w-full max-w-3xl rounded-2xl border-2 p-5 space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-[#193E63] pb-3">
              <div>
                <h3 className="text-base font-extrabold text-white">
                  IEC 61850 Signal Mapping &amp; End-to-End Verification Report
                </h3>
                <p className="text-xs text-[#8BB3D4]">
                  Audited 50 Master SAS Signals &amp; {signals.length} Per-Bay Instantiated Points across {bays.length} Bays
                </p>
              </div>
              <button
                type="button"
                onClick={() => setValidationModalOpen(false)}
                className="p-1.5 rounded-lg bg-[#09223A] text-white hover:text-[#00DFFF]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto">
              {validationResults.map((chk) => (
                <div
                  key={chk.name}
                  style={{
                    backgroundColor: chk.status === 'PASS' ? '#06211B' : '#3B0D15',
                    borderColor: chk.status === 'PASS' ? '#22C55E' : '#FF5C65',
                  }}
                  className="p-3 rounded-xl border space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-white text-xs">{chk.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        chk.status === 'PASS' ? 'bg-[#22C55E] text-slate-950' : 'bg-[#FF5C65] text-white'
                      }`}
                    >
                      {chk.status}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#DCEAF5]">{chk.detail}</p>
                  {chk.status !== 'PASS' && (
                    <p className="text-[11px] text-[#FACC15] font-mono">Suggested Fix: {chk.remedy}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-[#193E63]">
              {chainFaultMode !== 'NONE' && (
                <button
                  type="button"
                  onClick={() => setChainFaultMode('NONE')}
                  className="px-3.5 py-1.5 rounded-lg bg-[#22C55E] text-slate-950 font-extrabold text-xs"
                >
                  Auto-Fix &amp; Restore Healthy Chain
                </button>
              )}
              <button
                type="button"
                onClick={() => setValidationModalOpen(false)}
                className="px-4 py-1.5 rounded-lg bg-[#09243E] border border-[#00DFFF] text-white font-bold text-xs"
              >
                Close Report
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};