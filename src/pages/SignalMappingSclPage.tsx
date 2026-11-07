import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../simulation/useSubstationStore';
import { FIFTY_SAS_SIGNAL_TEMPLATES, getVendorForBay } from '../data/signalCatalogue';
import { getIedImageByModel, iedImages } from '../data/iedImageRegistry';
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

const STAGE_IMAGES = {
  STAGE1_CB_AUX: "assets/substation/substation_hero_opt.jpg",
  STAGE2_DI_CARD: iedImages.SCHNEIDER_C264,
  STAGE3_SIPROTEC: iedImages.SIEMENS_7SJ85,
  STAGE5_SWITCH: iedImages.INDUSTRIAL_SWITCH,
  STAGE6_SCADA_HMI: iedImages.SCADA_WORKSTATION,
};

type SignalChainFaultMode =
  | 'NONE'
  | 'DI_INPUT_FAIL'
  | 'WRONG_IEC_REF'
  | 'DATASET_MISSING'
  | 'REPORT_DISABLED'
  | 'GOOSE_TIMEOUT'
  | 'MMS_DISCONNECT'
  | 'BAD_QUALITY'
  | 'HMI_TAG_MISMATCH';

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

export const SignalMappingSclPage: React.FC = () => {
  const { signals, bays, selectedBayId, setSelectedBayId } = useSubstationStore();

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

  // Interactive Signal-Chain Fault Simulation (Section 11)
  const [chainFaultMode, setChainFaultMode] = useState<SignalChainFaultMode>('NONE');
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

  // For Master Catalogue Trace: trace on BAY-132-L1 by default (matching screenshot "LINE-1 (132 kV) / IED_132_L1 / SAS_132_L1_CB_POS_DP") or the selected point's bay in Per-Bay mode
  const traceBay = useMemo(() => {
    if (viewMode === 'INSTANTIATED_BAY') {
      const pt = signals.find((s) => s.id === selectedPointId);
      if (pt) {
        const b = bays.find((x) => x.id === pt.bayId);
        if (b) return b;
      }
      return kpiBay;
    }
    return bays.find((b) => b.id === 'BAY-132-L1') || bays[0];
  }, [viewMode, selectedPointId, signals, bays, kpiBay]);

  const selectedTemplate = useMemo(() => {
    return FIFTY_SAS_SIGNAL_TEMPLATES.find((t) => t.catalogNumber === selectedCatalogNo) || FIFTY_SAS_SIGNAL_TEMPLATES[0];
  }, [selectedCatalogNo]);

  const tracedPoint = useMemo(() => {
    if (viewMode === 'INSTANTIATED_BAY') {
      const exact = signals.find((s) => s.id === selectedPointId);
      if (exact) return exact;
    }
    return (
      signals.find((s) => s.bayId === traceBay.id && s.catalogNumber === selectedCatalogNo) ||
      signals.find((s) => s.catalogNumber === selectedCatalogNo) ||
      signals[0]
    );
  }, [viewMode, selectedPointId, signals, traceBay.id, selectedCatalogNo]);

  // Align first 4 Catalogue display rows with reference screenshot while preserving full IEC 61850-7-4 validity & notes
  const catalogueDisplayRows = useMemo(() => {
    return FIFTY_SAS_SIGNAL_TEMPLATES.map((tpl) => {
      if (tpl.catalogNumber === 1) {
        return {
          ...tpl,
          signalName: 'Circuit Breaker Position',
          categoryDisplay: 'Circuit Breaker & Switchgear',
          lnDoDaDisplay: 'XCBR1.Pos.stVal',
          fcCdcDisplay: '[ST] / DPC',
          controlModelDisplay: 'sbo-with-enhanced-security',
          datasetTransportDisplay: 'dsStatus (GOOSE_AND_MMS)',
          testNoteDisplay:
            'Verify 52a/52b auxiliary contacts wired to DI Ch.1. Check stVal = TRUE (Closed) / FALSE (Open), q = 0, and timestamp.',
        };
      }
      if (tpl.catalogNumber === 2) {
        return {
          ...tpl,
          signalName: 'CB Trip Command',
          categoryDisplay: 'Control',
          lnDoDaDisplay: 'XCBR1.Trip.ctlVal',
          fcCdcDisplay: '[CO] / SPC',
          controlModelDisplay: 'direct-with-normal-security',
          datasetTransportDisplay: 'dsControl (MMS)',
          testNoteDisplay:
            'Issue Trip command, verify Operate > stVal transition to OPEN within specified time. (Standard IEC 61850-7-4 maps via XCBR1.Pos.Oper.ctlVal[OFF] / CSWI1.Pos).',
        };
      }
      if (tpl.catalogNumber === 3) {
        return {
          ...tpl,
          signalName: 'CB Close Command',
          categoryDisplay: 'Control',
          lnDoDaDisplay: 'XCBR1.Close.ctlVal',
          fcCdcDisplay: '[CO] / SPC',
          controlModelDisplay: 'direct-with-normal-security',
          datasetTransportDisplay: 'dsControl (MMS)',
          testNoteDisplay:
            'Issue Close command, verify stVal transition to CLOSED and no blocking interlocks (CILO1.EnaCls == TRUE; XCBR1.Pos.Oper.ctlVal[ON]).',
        };
      }
      if (tpl.catalogNumber === 4) {
        return {
          ...tpl,
          signalName: 'CB Trip Status (Protection)',
          categoryDisplay: 'Protection',
          lnDoDaDisplay: 'PTRC1.Tr.stVal',
          fcCdcDisplay: '[ST] / DPC',
          controlModelDisplay: 'status-only',
          datasetTransportDisplay: 'dsProt (GOOSE_AND_MMS)',
          testNoteDisplay:
            'Verify protection trip indication (PTRC1.Tr.general / stVal) and correlation with CB position.',
        };
      }
      return {
        ...tpl,
        categoryDisplay: tpl.category,
        lnDoDaDisplay: `${tpl.logicalNodeClass}.${tpl.dataObject}.${tpl.dataAttribute}`,
        fcCdcDisplay: `[${tpl.fc}] / ${tpl.cdc.split(' ')[0]}`,
        controlModelDisplay: tpl.controlModel,
        datasetTransportDisplay: `${tpl.defaultDataset} (${tpl.transportType})`,
        testNoteDisplay: `${tpl.testProcedureSummary} ${tpl.engineeringNote}`,
      };
    });
  }, []);

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
    return signals.filter((s) => {
      if (voltageFilter !== 'ALL' && s.voltageKv !== voltageFilter) return false;
      if (selectedBayId && selectedBayId !== 'ALL_BAYS' && viewMode === 'INSTANTIATED_BAY') {
        if (s.bayId !== selectedBayId) return false;
      }
      if (iedFilter !== 'ALL' && s.iedName !== iedFilter) return false;
      if (datasetFilter !== 'ALL' && !s.datasetRef.toLowerCase().includes(datasetFilter.toLowerCase())) return false;
      if (categoryFilter !== 'ALL' && s.category !== categoryFilter) return false;
      const effectiveQual = chainFaultMode !== 'NONE' && s.id === tracedPoint?.id ? 'BAD' : s.quality;
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
    signals,
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
    const row = catalogueDisplayRows.find((r) => r.catalogNumber === selectedCatalogNo) || catalogueDisplayRows[0];
    const bay = traceBay;
    const vendorInfo = getVendorForBay(bay);
    const iedName = bay.iedId.replace(/-/g, '_'); // e.g., IED_132_L1
    const bayCodeUnderscore = bay.bayCode.replace(/-/g, '_'); // e.g., 132_L1

    const [lnPart, doPart, daPart] = row.lnDoDaDisplay.split('.');
    const fc = row.fc;
    const cdcShort = row.cdc.split(' ')[0];

    // Engineering-accurate GOOSE Control Block vs Report Control Block separation (Section 3 Stage 5)
    const hasGoose = row.transportType === 'GOOSE_AND_MMS';
    const gooseCbName = hasGoose
      ? row.category === 'Protection Signals' || row.catalogNumber === 4
        ? 'GoCB_Trip01 (0x88B8)'
        : 'GoCB_St01 (0x88B8)'
      : 'None (MMS Only)';
    const reportCbName =
      row.transportType === 'MMS_URCB'
        ? 'URCB01 (urcbMeas01)'
        : row.transportType === 'MMS_CONTROL'
        ? 'SBO / Direct CO'
        : 'BRCB01 (brcbSt01)';

    // Live value & status formatting
    const rawVal = tracedPoint ? tracedPoint.value : bay.breakerState;
    const displayVal =
      row.catalogNumber === 1
        ? bay.breakerState
        : typeof rawVal === 'boolean'
        ? rawVal
          ? 'TRUE (ACTIVE)'
          : 'FALSE (NORMAL)'
        : `${String(rawVal)}${tracedPoint?.unit ? ' ' + tracedPoint.unit : ''}`;

    const scadaTag =
      row.catalogNumber === 1 && bay.bayCode === '132-L1'
        ? 'SAS_132_L1_CB_POS_DP'
        : `SAS_${bayCodeUnderscore}_${row.scadaTagSuffix.replace(/\./g, '_')}`;

    // Stage health based on chainFaultMode
    const stage1State: 'OK' | 'WARN' | 'ERR' = 'OK';
    const stage2State: 'OK' | 'WARN' | 'ERR' = chainFaultMode === 'DI_INPUT_FAIL' ? 'ERR' : 'OK';
    const stage3State: 'OK' | 'WARN' | 'ERR' =
      chainFaultMode === 'DI_INPUT_FAIL'
        ? 'WARN'
        : chainFaultMode === 'BAD_QUALITY'
        ? 'WARN'
        : 'OK';
    const stage4State: 'OK' | 'WARN' | 'ERR' =
      chainFaultMode === 'WRONG_IEC_REF' || chainFaultMode === 'DATASET_MISSING' ? 'ERR' : 'OK';
    const stage5State: 'OK' | 'WARN' | 'ERR' =
      chainFaultMode === 'REPORT_DISABLED' ||
      chainFaultMode === 'GOOSE_TIMEOUT' ||
      chainFaultMode === 'MMS_DISCONNECT'
        ? 'ERR'
        : chainFaultMode === 'DATASET_MISSING' || chainFaultMode === 'WRONG_IEC_REF'
        ? 'WARN'
        : 'OK';
    const stage6State: 'OK' | 'WARN' | 'ERR' =
      chainFaultMode !== 'NONE' ? (chainFaultMode === 'BAD_QUALITY' ? 'WARN' : 'ERR') : 'OK';

    const overallQuality =
      chainFaultMode === 'NONE' && bay.quality === 'GOOD'
        ? 'GOOD QUALITY'
        : chainFaultMode === 'BAD_QUALITY'
        ? 'QUESTIONABLE (0x0400)'
        : 'INVALID / FAULT (0x0100)';

    const fieldIoTitle =
      row.category === 'Electrical Measurements'
        ? 'CT / VT Secondary (1A / 110V)'
        : row.catalogNumber === 2 || row.catalogNumber === 3 || row.fc === 'CO'
        ? 'CB Trip / Close Coil (52TC/CC)'
        : 'CB Auxiliary Contact (52a/52b)';

    const diModuleTitle =
      row.category === 'Electrical Measurements'
        ? 'AI – 4xCT / 4xVT Merging Card'
        : row.fc === 'CO'
        ? 'BO – High-Speed Command Relay'
        : 'DI – 24/110/220 V DC';

    const diChannelLabel =
      row.catalogNumber === 1
        ? 'Ch.1 – CB_Pos'
        : `Ch.${(row.catalogNumber % 16) + 1} – ${doPart}_${daPart.slice(0, 6)}`;

    return {
      row,
      bay,
      vendorName: bay.id === 'BAY-132-L1' ? 'Siemens SIPROTEC 5' : `${vendorInfo.vendor} ${vendorInfo.iedModel}`,
      iedName,
      lnPart,
      doPart,
      daPart,
      fc,
      cdcShort,
      gooseCbName,
      reportCbName,
      displayVal,
      scadaTag: chainFaultMode === 'HMI_TAG_MISMATCH' ? `${scadaTag}_UNMAPPED_ERR` : scadaTag,
      fieldIoTitle,
      diModuleTitle,
      diChannelLabel,
      stageStates: [stage1State, stage2State, stage3State, stage4State, stage5State, stage6State],
      overallQuality,
    };
  }, [catalogueDisplayRows, selectedCatalogNo, traceBay, tracedPoint, chainFaultMode]);

  // Consistent KPI Counts (Section 5)
  const kpiStats = useMemo(() => {
    const totalMapped = signals.length; // 1206
    const baseGood = signals.filter((s) => s.quality === 'GOOD').length;
    const faultPenalty = chainFaultMode === 'NONE' ? 0 : 1;
    const goodCount = Math.max(0, baseGood - faultPenalty);
    const otherCount = totalMapped - goodCount;

    return {
      totalSignals: FIFTY_SAS_SIGNAL_TEMPLATES.length, // 50
      goodQuality: goodCount, // 1206 when healthy
      otherQuality: otherCount, // 0 when healthy
      selectedBayCode: kpiBay.bayCode, // 33-F03
      iedsInBay: 1,
      datasetsInBay: 8, // dsStatus, dsControl, dsProt, dsProtTrip, dsMeas, dsMetering, dsTransformer, dsSystem
      reportsAndGooseInBay: 8, // BRCB01..03, URCB01..02, GoCB01..03
      mappedPoints: totalMapped, // 1206
    };
  }, [signals, chainFaultMode, kpiBay.bayCode]);

  // Comprehensive IEC 61850 Mapping Validator (Section 12)
  const validationResults = useMemo(() => {
    const checks = [
      {
        name: 'LD / LN / DO / DA Object Reference Syntax (IEC 61850-7-4)',
        status: chainFaultMode === 'WRONG_IEC_REF' ? 'FAIL' : 'PASS',
        detail:
          chainFaultMode === 'WRONG_IEC_REF'
            ? `Unresolved LN/DO reference on ${activeChain.iedName}/${activeChain.row.lnDoDaDisplay}_INVALID.`
            : 'All 50 Master Signals & 1,206 Bay Points resolve to valid Edition 2.1 Logical Nodes (XCBR, XSWI, CSWI, PTRC, PTOC, PDIF, PDIS, MMXU, YPTR).',
        remedy: 'Restore standard IEC 61850-7-4 DO/DA path in IED ICD/CID configuration.',
      },
      {
        name: 'Functional Constraint (FC) & Common Data Class (CDC) Compatibility',
        status: 'PASS',
        detail: 'Verified [ST] DPC/SPS/ACT, [MX] MV/CMV, [CO] DPC/SPC, and [SP] ASG/ING constraints across all 1,206 points.',
        remedy: 'None required.',
      },
      {
        name: 'LLN0 DataSet Membership & FCDA Binding',
        status: chainFaultMode === 'DATASET_MISSING' ? 'FAIL' : 'PASS',
        detail:
          chainFaultMode === 'DATASET_MISSING'
            ? `Selected signal ${activeChain.row.lnDoDaDisplay} is missing from LLN0.${activeChain.row.defaultDataset}.`
            : 'All 8 per-bay DataSets (dsStatus, dsControl, dsProt, dsProtTrip, dsMeas, dsMetering, dsTransformer, dsSystem) contain complete FCDA entries.',
        remedy: 'Add FCDA entry to LLN0 DataSet before enabling ReportControl or GSEControl.',
      },
      {
        name: 'ReportControl (BRCB/URCB) & GSEControl (GoCB) Separation',
        status: chainFaultMode === 'REPORT_DISABLED' || chainFaultMode === 'GOOSE_TIMEOUT' ? 'FAIL' : 'PASS',
        detail:
          chainFaultMode === 'REPORT_DISABLED'
            ? 'Buffered Report Control Block BRCB01 (RptEna=FALSE) is disabled.'
            : chainFaultMode === 'GOOSE_TIMEOUT'
            ? 'GOOSE Publisher GoCB_St01 TimeAllowedToLive (TAL=2000ms) expired on subscriber.'
            : 'Strict separation verified: GOOSE uses GoCB (0x88B8 L2 Multicast) and MMS Reporting uses BRCB/URCB (TCP:102).',
        remedy: 'Enable RptEna=TRUE on BRCB01 and verify VLAN 20 GOOSE multicast reception.',
      },
      {
        name: 'SCADA / HMI Tag Uniqueness & Source-Destination Mapping',
        status: chainFaultMode === 'HMI_TAG_MISMATCH' ? 'FAIL' : 'PASS',
        detail:
          chainFaultMode === 'HMI_TAG_MISMATCH'
            ? `HMI Tag "${activeChain.scadaTag}" does not match SCADA database tag for ${activeChain.iedName}.`
            : 'All 1,206 SCADA tags (SAS_<BAY>_<SIGNAL>) are 100% unique with 0 collisions.',
        remedy: 'Re-synchronize HMI symbol tag binding with SCADA database.',
      },
      {
        name: 'Quality (q) & Timestamp (t) Propagation across PRP LAN A/B',
        status:
          chainFaultMode === 'DI_INPUT_FAIL' ||
          chainFaultMode === 'MMS_DISCONNECT' ||
          chainFaultMode === 'BAD_QUALITY'
            ? 'FAIL'
            : 'PASS',
        detail:
          chainFaultMode === 'NONE'
            ? `1,206 / 1,206 points reporting Quality = 0x0000 (GOOD) with IEEE 1588v2 PTP locked timestamps.`
            : `Active signal fault (${chainFaultMode}) degraded quality to ${activeChain.overallQuality}.`,
        remedy: 'Clear injected field/communication fault to restore q=0x0000.',
      },
    ];
    return checks;
  }, [chainFaultMode, activeChain]);

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
        liveClockStr,
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

  // SCL XML Workspace File List & Active Parsed Model (Section 10)
  const allSclFiles = useMemo(() => {
    return [...SCL_FILE_SAMPLES, ...uploadedSclFiles];
  }, [uploadedSclFiles]);

  const currentSclFile = useMemo(() => {
    return allSclFiles.find((f) => f.id === selectedSclId) || allSclFiles[0];
  }, [allSclFiles, selectedSclId]);

  const parsedScl = useMemo(() => {
    return parseSclXmlString(currentSclFile.fileName, currentSclFile.fileType, currentSclFile.xmlContent);
  }, [currentSclFile]);

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
    <div style={{ backgroundColor: '#030B18', color: '#E9F3FF' }} className="space-y-2.5 text-xs select-none">
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
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-[#8BB3D4] font-semibold flex items-center gap-1">
              <Wrench className="w-3.5 h-3.5 text-[#00DFFF]" /> Signal Chain Test / Fault Sim:
            </span>
            <select
              value={chainFaultMode}
              onChange={(e) => setChainFaultMode(e.target.value as SignalChainFaultMode)}
              style={{
                backgroundColor: chainFaultMode === 'NONE' ? '#07182B' : '#3B0D15',
                borderColor: chainFaultMode === 'NONE' ? '#1E466E' : '#FF5C65',
                color: chainFaultMode === 'NONE' ? '#E9F3FF' : '#FDA4AF',
              }}
              className="px-2.5 py-1 rounded-lg border text-[11px] font-mono font-bold"
            >
              <option value="NONE">Normal — Healthy Signal Chain (q=0x0000)</option>
              <option value="DI_INPUT_FAIL">Fault 1: Field DI Module Opto-Input Failure</option>
              <option value="WRONG_IEC_REF">Fault 2: Wrong IEC 61850 LN/DO Reference</option>
              <option value="DATASET_MISSING">Fault 3: FCDA Missing from LLN0 DataSet</option>
              <option value="REPORT_DISABLED">Fault 4: BRCB01 Report Disabled (RptEna=0)</option>
              <option value="GOOSE_TIMEOUT">Fault 5: GOOSE Subscription TAL Timeout</option>
              <option value="MMS_DISCONNECT">Fault 6: SCADA MMS Association Lost</option>
              <option value="BAD_QUALITY">Fault 7: Questionable / Oscillatory Quality (0x0400)</option>
              <option value="HMI_TAG_MISMATCH">Fault 8: Incorrect SCADA / HMI Tag Mapping</option>
            </select>
            {chainFaultMode !== 'NONE' && (
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

      {/* 2. MAIN END-TO-END SAS SIGNAL CHAIN TRACE PANEL */}
      <div
        style={{
          backgroundColor: '#051324',
          borderColor: '#1B4369',
          boxShadow: '0 6px 24px rgba(0, 0, 0, 0.45)',
        }}
        className="rounded-xl border p-3 space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs sm:text-sm font-extrabold tracking-wider text-white uppercase">
            END-TO-END SAS SIGNAL CHAIN TRACE — SIGNAL #{activeChain.row.catalogNumber}:{' '}
            {activeChain.row.signalName.toUpperCase()}
          </h2>
          <span
            style={{
              backgroundColor: chainFaultMode === 'NONE' ? '#072E22' : '#3B0D15',
              borderColor: chainFaultMode === 'NONE' ? '#22C55E' : '#FF5C65',
              color: chainFaultMode === 'NONE' ? '#4ADE80' : '#FDA4AF',
            }}
            className="px-3 py-1 rounded-full border text-[11px] font-extrabold tracking-wide"
          >
            ● {activeChain.overallQuality}
          </span>
        </div>

        {/* Outer Glowing Cyan Frame with Overlapping Center Header Badge */}
        <div
          style={{
            position: 'relative',
            marginTop: '12px',
            borderRadius: '14px',
            border: '1.5px solid #00DFFF',
            background: 'linear-gradient(180deg, rgba(6, 28, 48, 0.85) 0%, rgba(4, 15, 28, 0.95) 100%)',
            boxShadow: '0 0 18px rgba(0, 223, 255, 0.18), inset 0 0 18px rgba(0, 223, 255, 0.08)',
            padding: '20px 10px 12px 10px',
          }}
        >
          {/* Overlapping Center Pill */}
          <div
            style={{
              position: 'absolute',
              top: '-12px',
              left: '50%',
              transform: 'translateX(-50%)',
              backgroundColor: '#062138',
              border: '1.5px solid #00DFFF',
              boxShadow: '0 0 12px rgba(0, 223, 255, 0.35)',
              borderRadius: '9999px',
              padding: '2px 18px',
              color: '#E9F3FF',
              fontSize: '11px',
              fontWeight: 800,
              letterSpacing: '0.06em',
            }}
          >
            IEC 61850 IED SIGNAL CHAIN
          </div>

          {/* 6 Horizontal Equipment Stage Cards + Green Chevrons */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 22px 1fr 22px 1.22fr 22px 1.05fr 22px 1.15fr 22px 1fr',
              alignItems: 'stretch',
              gap: '4px',
            }}
            className="min-w-[880px] overflow-x-auto"
          >
            {/* STAGE 1: Field I/O (Hardwired) */}
            <div
              onClick={() => setSelectedStageIndex(selectedStageIndex === 0 ? null : 0)}
              style={{
                background: 'linear-gradient(180deg, #0A2E46 0%, #051628 100%)',
                border: selectedStageIndex === 0 ? '2px solid #FFFFFF' : '1.5px solid #00DFFF',
                borderRadius: '10px',
                padding: '8px',
              }}
              className="cursor-pointer flex flex-col items-center justify-between text-center transition hover:brightness-110"
            >
              <div>
                <div className="text-[11px] font-extrabold text-white">Field I/O</div>
                <div className="text-[10.5px] font-bold text-[#DCEAF5]">(Hardwired)</div>
              </div>
              <img
                src={STAGE_IMAGES.STAGE1_CB_AUX}
                alt="CB Auxiliary Contact 52a/52b"
                style={{ width: '136px', height: '82px', objectFit: 'contain' }}
                className="my-1 rounded"
              />
              <div className="space-y-0.5">
                <div className="text-[10.5px] font-bold text-white leading-tight">{activeChain.fieldIoTitle}</div>
                <div className="text-[9.5px] text-[#B8D4EA] font-mono">
                  {activeChain.bay.id === 'BAY-132-L1' ? 'LINE-1 (132 kV)' : `${activeChain.bay.bayCode} (${activeChain.bay.voltageKv} kV)`}
                </div>
                <div className="text-[9.5px] text-[#8BB3D4]">
                  {activeChain.bay.id === 'BAY-132-L1' ? 'Incoming Line' : activeChain.bay.name}
                </div>
              </div>
            </div>

            {/* Chevron 1 -> 2 */}
            <div className="flex items-center justify-center text-[#22C55E] font-black text-xl drop-shadow-[0_0_6px_#22C55E]">
              »
            </div>

            {/* STAGE 2: Input Module (DI Card) */}
            <div
              onClick={() => setSelectedStageIndex(selectedStageIndex === 1 ? null : 1)}
              style={{
                background: 'linear-gradient(180deg, #0A2E46 0%, #051628 100%)',
                border:
                  activeChain.stageStates[1] === 'ERR'
                    ? '2px solid #FF5C65'
                    : selectedStageIndex === 1
                    ? '2px solid #FFFFFF'
                    : '1.5px solid #00DFFF',
                borderRadius: '10px',
                padding: '8px',
              }}
              className="cursor-pointer flex flex-col items-center justify-between text-center transition hover:brightness-110"
            >
              <div>
                <div className="text-[11px] font-extrabold text-white">Input Module</div>
                <div className="text-[10.5px] font-bold text-[#DCEAF5]">(DI Card)</div>
              </div>
              <img
                src={STAGE_IMAGES.STAGE2_DI_CARD}
                alt="Digital Input Module"
                style={{ width: '136px', height: '82px', objectFit: 'contain' }}
                className="my-1 rounded"
              />
              <div className="space-y-0.5">
                <div className="text-[10px] font-bold text-white leading-tight">{activeChain.diModuleTitle}</div>
                <div className="text-[10px] text-[#DCEAF5] font-mono">{activeChain.diChannelLabel}</div>
              </div>
            </div>

            {/* Chevron 2 -> 3 */}
            <div className="flex items-center justify-center text-[#22C55E] font-black text-xl drop-shadow-[0_0_6px_#22C55E]">
              »
            </div>

            {/* STAGE 3: IED Signal Chain (Protection & Control IED) */}
            <div
              onClick={() => setSelectedStageIndex(selectedStageIndex === 2 ? null : 2)}
              style={{
                background: 'linear-gradient(180deg, #0A2E46 0%, #051628 100%)',
                border:
                  activeChain.stageStates[2] !== 'OK'
                    ? '2px solid #FFB547'
                    : selectedStageIndex === 2
                    ? '2px solid #FFFFFF'
                    : '1.5px solid #00DFFF',
                borderRadius: '10px',
                padding: '8px',
              }}
              className="cursor-pointer flex flex-col items-center justify-between text-center transition hover:brightness-110"
            >
              <div>
                <div className="text-[11px] font-extrabold text-white">IED Signal Chain</div>
                <div className="text-[10px] font-bold text-[#DCEAF5]">(Protection &amp; Control IED)</div>
              </div>
              <img
                src={getIedImageByModel(activeChain.vendorName, activeChain.vendorName)}
                alt="Protection & Control IED"
                style={{ width: '136px', height: '82px', objectFit: 'contain' }}
                className="my-1 rounded"
              />
              <div className="w-full space-y-1">
                <div className="text-[10.5px] font-extrabold text-white">{activeChain.vendorName}</div>
                <div className="text-[10px] font-mono font-bold text-[#DCEAF5]">{activeChain.iedName}</div>
                <div
                  style={{
                    backgroundColor: '#041322',
                    border: '1px solid #1E5A78',
                    borderRadius: '6px',
                    padding: '3px 5px',
                  }}
                  className="text-[8.8px] text-[#DCEAF5] leading-tight"
                >
                  <div>
                    Acquire <span className="text-[#22C55E] font-bold">›</span> Filter{' '}
                    <span className="text-[#22C55E] font-bold">›</span> Debounce{' '}
                    <span className="text-[#22C55E] font-bold">›</span> Time-stamp
                  </div>
                  <div className="font-bold text-[#77E7FF] mt-0.5">Map to IEC 61850 ({activeChain.fc})</div>
                </div>
              </div>
            </div>

            {/* Chevron 3 -> 4 */}
            <div className="flex items-center justify-center text-[#22C55E] font-black text-xl drop-shadow-[0_0_6px_#22C55E]">
              »
            </div>

            {/* STAGE 4: IEC 61850 Dataset & Logical Node */}
            <div
              onClick={() => setSelectedStageIndex(selectedStageIndex === 3 ? null : 3)}
              style={{
                background: 'linear-gradient(180deg, #0A2E46 0%, #051628 100%)',
                border:
                  activeChain.stageStates[3] === 'ERR'
                    ? '2px solid #FF5C65'
                    : selectedStageIndex === 3
                    ? '2px solid #FFFFFF'
                    : '1.5px solid #00DFFF',
                borderRadius: '10px',
                padding: '8px 10px',
              }}
              className="cursor-pointer flex flex-col justify-between transition hover:brightness-110"
            >
              <div className="text-center">
                <div className="text-[11px] font-extrabold text-white">IEC 61850 Dataset</div>
                <div className="text-[10.5px] font-bold text-[#DCEAF5]">&amp; Logical Node</div>
              </div>
              <div className="my-auto space-y-1 font-mono text-[10px] text-left pl-1">
                <div className="flex items-center gap-1.5 text-white font-bold">
                  <Folder className="w-3.5 h-3.5 text-[#FACC15] fill-[#FACC15]/30 shrink-0" />
                  <span>LD: {activeChain.iedName}</span>
                </div>
                <div className="pl-4 text-[#DCEAF5] font-bold">LN: {activeChain.lnPart}</div>
                <div className="pl-3 flex items-center gap-1.5 text-white font-bold">
                  <Folder className="w-3.5 h-3.5 text-[#FACC15] fill-[#FACC15]/30 shrink-0" />
                  <span>DO: {activeChain.doPart}</span>
                </div>
                <div className="pl-6 flex items-center gap-1 text-[#77E7FF]">
                  <FileText className="w-3 h-3 text-[#8BB3D4] shrink-0" />
                  <span>
                    DA: {activeChain.daPart} ({activeChain.fc})
                  </span>
                </div>
                <div className="pl-6 flex items-center gap-1 text-[#DCEAF5]">
                  <FileText className="w-3 h-3 text-[#8BB3D4] shrink-0" />
                  <span>DA: q</span>
                </div>
                <div className="pl-6 flex items-center gap-1 text-[#DCEAF5]">
                  <FileText className="w-3 h-3 text-[#8BB3D4] shrink-0" />
                  <span>DA: t</span>
                </div>
              </div>
            </div>

            {/* Chevron 4 -> 5 */}
            <div className="flex items-center justify-center text-[#22C55E] font-black text-xl drop-shadow-[0_0_6px_#22C55E]">
              »
            </div>

            {/* STAGE 5: Communication (Report / GOOSE) */}
            <div
              onClick={() => setSelectedStageIndex(selectedStageIndex === 4 ? null : 4)}
              style={{
                background: 'linear-gradient(180deg, #0A2E46 0%, #051628 100%)',
                border:
                  activeChain.stageStates[4] === 'ERR'
                    ? '2px solid #FF5C65'
                    : selectedStageIndex === 4
                    ? '2px solid #FFFFFF'
                    : '1.5px solid #00DFFF',
                borderRadius: '10px',
                padding: '8px',
              }}
              className="cursor-pointer flex flex-col items-center justify-between text-center transition hover:brightness-110"
            >
              <div>
                <div className="text-[11px] font-extrabold text-white">Communication</div>
                <div className="text-[10.5px] font-bold text-[#DCEAF5]">(Report / GOOSE)</div>
              </div>
              <img
                src={STAGE_IMAGES.STAGE5_SWITCH}
                alt="Industrial Ethernet Switch"
                style={{ width: '136px', height: '82px', objectFit: 'contain' }}
                className="my-1.5 rounded"
              />
              <div className="space-y-0.5 font-mono text-[9.5px]">
                <div className="text-white font-bold">GOOSE: {activeChain.gooseCbName}</div>
                <div className="text-[#77E7FF] font-bold">Report: {activeChain.reportCbName}</div>
                <div className="text-[#B8D4EA] font-sans text-[9.5px]">(Eth. LAN A/B – PRP)</div>
              </div>
            </div>

            {/* Chevron 5 -> 6 */}
            <div className="flex items-center justify-center text-[#22C55E] font-black text-xl drop-shadow-[0_0_6px_#22C55E]">
              »
            </div>

            {/* STAGE 6: SCADA / HMI */}
            <div
              onClick={() => setSelectedStageIndex(selectedStageIndex === 5 ? null : 5)}
              style={{
                background: 'linear-gradient(180deg, #0A2E46 0%, #051628 100%)',
                border:
                  activeChain.stageStates[5] !== 'OK'
                    ? '2px solid #FF5C65'
                    : selectedStageIndex === 5
                    ? '2px solid #FFFFFF'
                    : '1.5px solid #00DFFF',
                borderRadius: '10px',
                padding: '8px',
              }}
              className="cursor-pointer flex flex-col items-center justify-between text-center transition hover:brightness-110"
            >
              <div>
                <div className="text-[11px] font-extrabold text-white">SCADA / HMI</div>
              </div>
              <img
                src={STAGE_IMAGES.STAGE6_SCADA_HMI}
                alt="Dual-Monitor SCADA HMI"
                style={{ width: '136px', height: '82px', objectFit: 'contain' }}
                className="my-1 rounded"
              />
              <div className="space-y-0.5">
                <div className="text-[9.5px] font-mono font-bold text-white break-all">{activeChain.scadaTag}</div>
                <div className="text-[11px] font-bold text-[#DCEAF5]">
                  Status:{' '}
                  <span
                    style={{
                      color:
                        chainFaultMode !== 'NONE'
                          ? '#FF5C65'
                          : activeChain.displayVal === 'OPEN'
                          ? '#00E5FF'
                          : '#22C55E',
                    }}
                    className="font-extrabold uppercase"
                  >
                    {chainFaultMode !== 'NONE' ? 'INVALID / ALM' : activeChain.displayVal}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Stage Inspector Drawer when any of the 6 stages (or Signal Path steps) is clicked */}
          {selectedStageIndex !== null && (
            <div
              style={{ backgroundColor: '#03101F', borderColor: '#00DFFF' }}
              className="mt-2.5 p-2.5 rounded-lg border flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono"
            >
              <div>
                <span className="text-[#00DFFF] font-bold">
                  STAGE #{selectedStageIndex + 1} DIAGNOSTIC INSPECTOR:{' '}
                </span>
                <span className="text-white">
                  {selectedStageIndex === 0 &&
                    `Field Process Interface • ${activeChain.fieldIoTitle} on ${activeChain.bay.name} • Wetting Voltage: 110V DC Healthy`}
                  {selectedStageIndex === 1 &&
                    `IED Binary/Analog Input Card (${activeChain.diModuleTitle} • ${activeChain.diChannelLabel}) • Hardware Opto-Debounce: 3.0 ms • State: ${
                      activeChain.stageStates[1] === 'OK' ? 'ENERGIZED (OK)' : 'INPUT FAULT'
                    }`}
                  {selectedStageIndex === 2 &&
                    `Protection & Control IED (${activeChain.vendorName} • ${activeChain.iedName}) • Time-Stamp Source: IEEE 1588v2 PTP (±38 ns) • FC Mapping: [${activeChain.fc}]`}
                  {selectedStageIndex === 3 &&
                    `IEC 61850-7-4 Object Reference: ${activeChain.iedName}/${activeChain.lnPart}.${activeChain.doPart}.${activeChain.daPart} • CDC: ${activeChain.cdcShort} • DataSet: LLN0.${activeChain.row.defaultDataset}`}
                  {selectedStageIndex === 4 &&
                    `Station Bus Redundancy: IEC 62439-3 PRP Dual-LAN (LAN A 192.168.10.0/24 + LAN B 192.168.20.0/24) • GOOSE: ${activeChain.gooseCbName} • Report: ${activeChain.reportCbName}`}
                  {selectedStageIndex === 5 &&
                    `SCADA Server A (192.168.10.10) & Operator HMI WS (192.168.10.20) • Tag: ${activeChain.scadaTag} • Value: ${activeChain.displayVal} • Updated: ${liveClockStr}`}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStageIndex(null)}
                className="px-2 py-0.5 rounded bg-[#08223A] text-[#77E7FF] hover:text-white font-sans font-bold"
              >
                Close ✕
              </button>
            </div>
          )}
        </div>
      </div>


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
              ['StatusCode', chainFaultMode === 'NONE' ? 'Good (0x00000000)' : 'Bad (0x80000000)'],
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
                                {pt.quality} • {liveClockStr.split(' ')[1]}
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
                        ? 'GOOSE (GoCB01), Report (BRCB01)'
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
                        chainFaultMode === 'NONE' ? 'text-[#4ADE80]' : 'text-[#FF5C65]'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                      {chainFaultMode === 'NONE' ? 'Good (q = 0x00)' : activeChain.overallQuality}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "106px 8px minmax(0, 1fr)", alignItems: "baseline", lineHeight: 1.28 }}>
                    <span className="text-[#9BC0DF]">Last Update</span>
                    <span className="text-[#6C92B4]">:</span>
                    <span className="font-mono text-[10px] text-[#DCEAF5]">{liveClockStr}</span>
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
                        title: 'Field Contact (52a/52b)',
                        sub: null,
                      },
                      {
                        idx: 1,
                        title: `DI Module (${activeChain.diChannelLabel.split('–')[0].trim()})`,
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
                        sub: `(${chainFaultMode === 'NONE' ? activeChain.displayVal : 'FAULT'})`,
                        highlightGreen: chainFaultMode === 'NONE',
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