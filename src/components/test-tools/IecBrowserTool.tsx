import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

// ============================================================================
// Siemens IEC Browser V02.21 (2.21.4) — Authentic Real-Time MMS Client &
// Offline ICD/SCD/CID Station Browser integrated with live Substation Store
// ============================================================================

interface IecAttr {
  name: string;
  mmsType: string; // e.g. 'Bitstring(2)', 'Bitstring(13)', 'Float(32)', 'Boolean', 'UTCTime', 'VisibleString(65)'
  value: string;
  writable?: boolean;
  fc: string;
  daPath: string;
  enumOptions?: string[];
}

interface IecDoNode {
  name: string;
  cdc: string;
  desc: string;
  fc: string;
  attrs: IecAttr[];
}

interface IecLnNode {
  ldInst: string;
  name: string;
  lnClass: string;
  desc: string;
  fcs: Record<string, IecDoNode[]>; // keyed by FC: ST, MX, CO, CF, DC, BR, RP, DS, GO, SG
}

interface IecLdNode {
  inst: string;
  desc: string;
  lns: IecLnNode[];
}

interface IecServerModel {
  id: string;
  mode: 'ONLINE' | 'OFFLINE';
  name: string;
  ip: string;
  port: number;
  manufacturer: string;
  model: string;
  bayId?: string;
  storeIedId?: string;
  sourceLabel: string;
  lds: IecLdNode[];
  connectedAt?: string;
}

interface LogEntry {
  id: number;
  text: string;
  kind?: 'NORMAL' | 'OK' | 'WARN' | 'ERR' | 'REPORT';
}

type TreeSelection =
  | { kind: 'ONLINE_ROOT' }
  | { kind: 'OFFLINE_ROOT' }
  | { kind: 'IED'; mode: 'ONLINE' | 'OFFLINE'; iedId: string }
  | { kind: 'LD'; mode: 'ONLINE' | 'OFFLINE'; iedId: string; ldInst: string }
  | { kind: 'LN'; mode: 'ONLINE' | 'OFFLINE'; iedId: string; ldInst: string; lnName: string }
  | { kind: 'FC'; mode: 'ONLINE' | 'OFFLINE'; iedId: string; ldInst: string; lnName: string; fc: string }
  | { kind: 'DO'; mode: 'ONLINE' | 'OFFLINE'; iedId: string; ldInst: string; lnName: string; fc: string; doName: string }
  | {
      kind: 'DA';
      mode: 'ONLINE' | 'OFFLINE';
      iedId: string;
      ldInst: string;
      lnName: string;
      fc: string;
      doName: string;
      daName: string;
    };

interface GridRow {
  key: string;
  name: string;
  mmsType: string;
  value: string;
  writable: boolean;
  checked?: boolean;
  refPath?: string;
  enumOptions?: string[];
  actionKind?: 'ATTR' | 'RCB_ENA' | 'RCB_GI' | 'SG_ACT' | 'CTRL_VAL';
  meta?: {
    iedId: string;
    ldInst: string;
    lnName: string;
    fc: string;
    doName: string;
    daName: string;
  };
}

const IEC_VERSION_BANNER: LogEntry[] = [
  { id: 1, text: 'Iec_Browser Version:      2.21.4' },
  { id: 2, text: 'Mms2Iec Version:          2.21.4' },
  { id: 3, text: 'Iec2Mms Version:          2.21.4' },
  { id: 4, text: 'Report Client Version:    2.21.4' },
];

const FC_ORDER = ['ST', 'MX', 'CO', 'CF', 'DC', 'SP', 'SG', 'BR', 'RP', 'DS', 'GO'];

const FC_DESC: Record<string, string> = {
  ST: 'Status information',
  MX: 'Measurands (analog values)',
  CO: 'Control',
  CF: 'Configuration',
  DC: 'Description',
  SP: 'Setpoint',
  SG: 'Setting group',
  BR: 'Buffered report control block',
  RP: 'Unbuffered report control block',
  DS: 'DataSet',
  GO: 'GOOSE control block',
};

function fmtLogTs(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

function fmtUtcIec(d = new Date()): string {
  return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

function mapBTypeToMms(bType: string, daName: string): string {
  const b = (bType || '').toLowerCase();
  const n = (daName || '').toLowerCase();
  if (n === 'q' || b === 'quality') return 'Bitstring(13)';
  if (n === 't' || b === 'timestamp') return 'UTCTime';
  if (b === 'dbpos' || (n === 'stval' && b.includes('db'))) return 'Bitstring(2)';
  if (b === 'boolean') return 'Boolean';
  if (b.includes('float')) return 'Float(32)';
  if (b === 'int8' || b === 'enum') return 'Integer(8)';
  if (b === 'int16') return 'Integer(16)';
  if (b === 'int32') return 'Integer(32)';
  if (b === 'int8u' || b === 'int16u' || b === 'int32u') return 'Unsigned(32)';
  if (b === 'visstring64' || b === 'visstring65') return 'VisibleString(65)';
  if (b === 'visstring129') return 'VisibleString(129)';
  if (b === 'visstring255' || b === 'visstring') return 'VisibleString(255)';
  if (b === 'octet64' || b === 'octetstring') return 'OctetString(8)';
  if (b === 'struct') return 'Structure';
  if (b === 'check') return 'Bitstring(2)';
  return 'VisibleString(65)';
}

function dbposDisplay(state: string): string {
  const s = state.toUpperCase();
  if (s === 'CLOSED' || s === 'ON' || s === '2' || s === '10') return 'on (2) [10]';
  if (s === 'OPEN' || s === 'OFF' || s === '1' || s === '01') return 'off (1) [01]';
  if (s === 'INTERMEDIATE' || s === '0') return 'intermediate-state (0) [00]';
  if (s === 'BAD' || s === '3') return 'bad-state (3) [11]';
  return state;
}

// Parse real IEC 61850-6 SCL XML (.icd / .scd / .cid / .iid) for Offline Station browsing
function parseSclToOfflineModels(fileName: string, xmlText: string): IecServerModel[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const parseErr = doc.querySelector('parsererror');
  if (parseErr) {
    throw new Error(`XML Parse Error in ${fileName}: ${parseErr.textContent?.slice(0, 100) || 'Invalid XML'}`);
  }

  const doTypes = new Map<string, { cdc: string; das: Array<{ name: string; fc: string; bType: string }> }>();
  Array.from(doc.querySelectorAll('DataTypeTemplates > DOType')).forEach((dt) => {
    const id = dt.getAttribute('id') || '';
    const cdc = dt.getAttribute('cdc') || 'SPS';
    const das = Array.from(dt.querySelectorAll(':scope > DA')).map((da) => ({
      name: da.getAttribute('name') || '',
      fc: da.getAttribute('fc') || 'ST',
      bType: da.getAttribute('bType') || 'BOOLEAN',
    }));
    if (id) doTypes.set(id, { cdc, das });
  });

  const lNodeTypes = new Map<string, Array<{ name: string; type: string; desc: string }>>();
  Array.from(doc.querySelectorAll('DataTypeTemplates > LNodeType')).forEach((lnt) => {
    const id = lnt.getAttribute('id') || '';
    const dos = Array.from(lnt.querySelectorAll(':scope > DO')).map((d) => ({
      name: d.getAttribute('name') || '',
      type: d.getAttribute('type') || '',
      desc: d.getAttribute('desc') || '',
    }));
    if (id) lNodeTypes.set(id, dos);
  });

  const ipMap = new Map<string, string>();
  Array.from(doc.querySelectorAll('ConnectedAP')).forEach((cap) => {
    const iedName = cap.getAttribute('iedName') || '';
    const ip = cap.querySelector('Address > P[type="IP"]')?.textContent?.trim();
    if (iedName && ip && !ipMap.has(iedName)) ipMap.set(iedName, ip);
  });

  const models: IecServerModel[] = [];
  Array.from(doc.querySelectorAll('IED')).forEach((iedEl, idx) => {
    const iedName = iedEl.getAttribute('name') || `IED_${idx + 1}`;
    const manufacturer = iedEl.getAttribute('manufacturer') || 'Generic';
    const model = iedEl.getAttribute('type') || 'IEC61850 IED';
    const ip = ipMap.get(iedName) || '0.0.0.0';
    const lds: IecLdNode[] = [];

    Array.from(iedEl.querySelectorAll('LDevice')).forEach((ldEl) => {
      const ldInst = ldEl.getAttribute('inst') || 'LD0';
      const lns: IecLnNode[] = [];
      const lnEls = [
        ...Array.from(ldEl.querySelectorAll(':scope > LN0')),
        ...Array.from(ldEl.querySelectorAll(':scope > LN')),
      ];

      lnEls.forEach((lnEl) => {
        const lnClass = lnEl.getAttribute('lnClass') || (lnEl.tagName === 'LN0' ? 'LLN0' : 'GGIO');
        const prefix = lnEl.getAttribute('prefix') || '';
        const inst = lnEl.getAttribute('inst') || '';
        const lnName = `${prefix}${lnClass}${inst}`;
        const lnType = lnEl.getAttribute('lnType') || '';
        const lnDesc = lnEl.getAttribute('desc') || lnClass;
        const fcs: Record<string, IecDoNode[]> = {};

        const pushDo = (fc: string, node: IecDoNode) => {
          if (!fcs[fc]) fcs[fc] = [];
          fcs[fc].push(node);
        };

        // DataSets
        Array.from(lnEl.querySelectorAll(':scope > DataSet')).forEach((dsEl) => {
          const dsName = dsEl.getAttribute('name') || 'DataSet1';
          const fcdas = Array.from(dsEl.querySelectorAll('FCDA'));
          pushDo('DS', {
            name: dsName,
            cdc: 'DataSet',
            desc: dsEl.getAttribute('desc') || `${fcdas.length} member(s)`,
            fc: 'DS',
            attrs: fcdas.map((f, fIdx) => {
              const ref = `${f.getAttribute('ldInst') || ldInst}/${f.getAttribute('prefix') || ''}${f.getAttribute('lnClass') || ''}${f.getAttribute('lnInst') || ''}$${f.getAttribute('fc') || 'ST'}$${f.getAttribute('doName') || ''}${f.getAttribute('daName') ? '$' + f.getAttribute('daName') : ''}`;
              return {
                name: `Member[${fIdx + 1}]`,
                mmsType: 'ObjectReference',
                value: ref,
                writable: false,
                fc: 'DS',
                daPath: `${iedName}${ldInst}/${lnName}$DS$${dsName}[${fIdx + 1}]`,
              };
            }),
          });
        });

        // ReportControls
        Array.from(lnEl.querySelectorAll(':scope > ReportControl')).forEach((rcEl, rIdx) => {
          const rcName = rcEl.getAttribute('name') || `rcb${rIdx + 1}`;
          const buffered = rcEl.getAttribute('buffered') !== 'false';
          const fcKey = buffered ? 'BR' : 'RP';
          const base = `${iedName}${ldInst}/${lnName}$${fcKey}$${rcName}`;
          pushDo(fcKey, {
            name: rcName,
            cdc: buffered ? 'BRCB' : 'URCB',
            desc: rcEl.getAttribute('desc') || (buffered ? 'Buffered Report Control' : 'Unbuffered Report Control'),
            fc: fcKey,
            attrs: [
              { name: 'RptID', mmsType: 'VisibleString(129)', value: rcEl.getAttribute('rptID') || base, fc: fcKey, daPath: `${base}$RptID` },
              { name: 'RptEna', mmsType: 'Boolean', value: 'false', fc: fcKey, daPath: `${base}$RptEna` },
              { name: 'DatSet', mmsType: 'VisibleString(129)', value: rcEl.getAttribute('datSet') || '', fc: fcKey, daPath: `${base}$DatSet` },
              { name: 'ConfRev', mmsType: 'Unsigned(32)', value: rcEl.getAttribute('confRev') || '1', fc: fcKey, daPath: `${base}$ConfRev` },
              { name: 'OptFlds', mmsType: 'Bitstring(10)', value: '0111110100', fc: fcKey, daPath: `${base}$OptFlds` },
              { name: 'BufTm', mmsType: 'Unsigned(32)', value: rcEl.getAttribute('bufTime') || '100', fc: fcKey, daPath: `${base}$BufTm` },
              { name: 'TrgOps', mmsType: 'Bitstring(6)', value: '010110', fc: fcKey, daPath: `${base}$TrgOps` },
              { name: 'IntgPd', mmsType: 'Unsigned(32)', value: rcEl.getAttribute('intgPd') || '5000', fc: fcKey, daPath: `${base}$IntgPd` },
              { name: 'GI', mmsType: 'Boolean', value: 'false', fc: fcKey, daPath: `${base}$GI` },
            ],
          });
        });

        // GSEControls
        Array.from(lnEl.querySelectorAll(':scope > GSEControl')).forEach((gcEl, gIdx) => {
          const gcName = gcEl.getAttribute('name') || `gcb${gIdx + 1}`;
          const base = `${iedName}${ldInst}/${lnName}$GO$${gcName}`;
          pushDo('GO', {
            name: gcName,
            cdc: 'GoCB',
            desc: 'GOOSE Control Block',
            fc: 'GO',
            attrs: [
              { name: 'GoEna', mmsType: 'Boolean', value: 'true', fc: 'GO', daPath: `${base}$GoEna` },
              { name: 'GoID', mmsType: 'VisibleString(129)', value: gcEl.getAttribute('appID') || gcName, fc: 'GO', daPath: `${base}$GoID` },
              { name: 'DatSet', mmsType: 'VisibleString(129)', value: gcEl.getAttribute('datSet') || '', fc: 'GO', daPath: `${base}$DatSet` },
              { name: 'ConfRev', mmsType: 'Unsigned(32)', value: gcEl.getAttribute('confRev') || '1', fc: 'GO', daPath: `${base}$ConfRev` },
            ],
          });
        });

        // SettingControl
        const sgEl = lnEl.querySelector(':scope > SettingControl');
        if (sgEl) {
          const base = `${iedName}${ldInst}/${lnName}$SG$SGCB`;
          pushDo('SG', {
            name: 'SGCB',
            cdc: 'SGCB',
            desc: 'Setting Group Control Block',
            fc: 'SG',
            attrs: [
              { name: 'NumOfSG', mmsType: 'Unsigned(8)', value: sgEl.getAttribute('numOfSGs') || '4', fc: 'SG', daPath: `${base}$NumOfSG` },
              { name: 'ActSG', mmsType: 'Unsigned(8)', value: sgEl.getAttribute('actSG') || '1', fc: 'SG', daPath: `${base}$ActSG` },
              { name: 'EditSG', mmsType: 'Unsigned(8)', value: '0', fc: 'SG', daPath: `${base}$EditSG` },
              { name: 'CnfEdit', mmsType: 'Boolean', value: 'false', fc: 'SG', daPath: `${base}$CnfEdit` },
            ],
          });
        }

        // Data Objects from LNodeType + DOI
        const tplDos = lNodeTypes.get(lnType) || [];
        const doiMap = new Map<string, Element>();
        Array.from(lnEl.querySelectorAll(':scope > DOI')).forEach((d) => {
          const n = d.getAttribute('name') || '';
          if (n) doiMap.set(n, d);
        });
        const allDoNames = Array.from(new Set([...tplDos.map((d) => d.name), ...Array.from(doiMap.keys())]));

        allDoNames.forEach((doName) => {
          const tpl = tplDos.find((d) => d.name === doName);
          const doTypeInfo = tpl?.type ? doTypes.get(tpl.type) : undefined;
          const doiEl = doiMap.get(doName);
          const daiVals = new Map<string, string>();
          if (doiEl) {
            Array.from(doiEl.querySelectorAll('DAI')).forEach((dai) => {
              const dn = dai.getAttribute('name') || '';
              const v = dai.querySelector('Val')?.textContent?.trim() || '';
              if (dn && v) daiVals.set(dn, v);
            });
          }

          // Group DAs by FC
          const byFc = new Map<string, IecAttr[]>();
          if (doTypeInfo && doTypeInfo.das.length > 0) {
            doTypeInfo.das.forEach((da) => {
              const arr = byFc.get(da.fc) || [];
              arr.push({
                name: da.name,
                mmsType: mapBTypeToMms(da.bType, da.name),
                value: daiVals.get(da.name) || '',
                writable: false,
                fc: da.fc,
                daPath: `${iedName}${ldInst}/${lnName}$${da.fc}$${doName}$${da.name}`,
              });
              byFc.set(da.fc, arr);
            });
          } else if (daiVals.size > 0) {
            const arr: IecAttr[] = [];
            daiVals.forEach((v, k) => {
              arr.push({
                name: k,
                mmsType: 'VisibleString(65)',
                value: v,
                writable: false,
                fc: 'CF',
                daPath: `${iedName}${ldInst}/${lnName}$CF$${doName}$${k}`,
              });
            });
            byFc.set('CF', arr);
          }

          byFc.forEach((attrs, fc) => {
            pushDo(fc, {
              name: doName,
              cdc: doTypeInfo?.cdc || 'DO',
              desc: tpl?.desc || doiEl?.getAttribute('desc') || '',
              fc,
              attrs,
            });
          });
        });

        lns.push({ ldInst, name: lnName, lnClass, desc: lnDesc, fcs });
      });

      lds.push({ inst: ldInst, desc: ldEl.getAttribute('desc') || 'Logical Device', lns });
    });

    models.push({
      id: `OFF-${iedName}-${idx}`,
      mode: 'OFFLINE',
      name: iedName,
      ip,
      port: 102,
      manufacturer,
      model,
      sourceLabel: fileName,
      lds,
    });
  });

  if (models.length === 0) {
    throw new Error(`No <IED> elements found in "${fileName}".`);
  }
  return models;
}

// Module-level cache so SPA tab switches preserve active IEC Browser session
interface IecBrowserCache {
  onlineServers: IecServerModel[];
  offlineServers: IecServerModel[];
  offlineFileName: string;
  expanded: Record<string, boolean>;
  selection: TreeSelection;
  logs: LogEntry[];
  autoRefresh: boolean;
  attrOverrides: Record<string, string>;
  rcbEnabled: Record<string, boolean>;
  actSgMap: Record<string, number>;
}

const IEC_BROWSER_STORAGE_KEY = 'sas_iec_browser_state_v1';
let browserCache: IecBrowserCache | null = null;

function loadInitialBrowserCache(): Partial<IecBrowserCache> {
  if (browserCache) return browserCache;
  try {
    const raw = window.localStorage.getItem(IEC_BROWSER_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as IecBrowserCache;
      if (parsed && typeof parsed === 'object') {
        browserCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
}

function saveBrowserCache(state: IecBrowserCache) {
  browserCache = state;
  try {
    window.localStorage.setItem(IEC_BROWSER_STORAGE_KEY, JSON.stringify(state));
  } catch {
    try {
      const compact: IecBrowserCache = {
        ...state,
        logs: state.logs.slice(-40),
      };
      window.localStorage.setItem(IEC_BROWSER_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore quota errors
    }
  }
}

// Authentic miniature Win32 / Siemens IEC Browser SVG icons
const IecAppIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" className="shrink-0">
    <rect x="0.5" y="1.5" width="15" height="13" rx="1" fill="#ffffff" stroke="#b91c1c" strokeWidth="1.2" />
    <rect x="1.5" y="2.5" width="13" height="3" fill="#dc2626" />
    <text x="8" y="12.2" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#1e3a8a" fontFamily="Arial, sans-serif">
      IEC
    </text>
  </svg>
);

const OnlineClientIcon = ({ active }: { active: boolean }) => (
  <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0">
    <rect x="2" y="2" width="12" height="12" rx="1.5" fill={active ? '#facc15' : '#fef08a'} stroke={active ? '#15803d' : '#a16207'} strokeWidth="1.2" />
    <text x="8" y="11.5" textAnchor="middle" fontSize="9.5" fontWeight="800" fill={active ? '#14532d' : '#854d0e'} fontFamily="Arial, sans-serif">
      C
    </text>
  </svg>
);

const OfflineStationIcon = () => (
  <svg width="15" height="15" viewBox="0 0 16 16" className="shrink-0">
    <path d="M1.5 3.5 H6 L7.5 5 H14.5 V13 H1.5 Z" fill="#dbeafe" stroke="#2563eb" strokeWidth="1.1" />
    <text x="8" y="11.3" textAnchor="middle" fontSize="6.5" fontWeight="800" fill="#1e3a8a" fontFamily="Arial, sans-serif">
      SN
    </text>
  </svg>
);

const NodeIcon: React.FC<{ kind: 'IED' | 'LD' | 'LN' | 'FC' | 'DO' | 'DA' }> = ({ kind }) => {
  if (kind === 'IED') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
        <rect x="1.5" y="2.5" width="13" height="10.5" fill="#e2e8f0" stroke="#334155" strokeWidth="1.1" />
        <rect x="3" y="4.5" width="4" height="3" fill="#22c55e" />
        <line x1="8.5" y1="5.5" x2="12.5" y2="5.5" stroke="#475569" strokeWidth="1.2" />
        <line x1="8.5" y1="8" x2="12.5" y2="8" stroke="#475569" strokeWidth="1.2" />
        <line x1="3" y1="10.5" x2="12.5" y2="10.5" stroke="#64748b" strokeWidth="1" />
      </svg>
    );
  }
  if (kind === 'LD') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
        <path d="M1.5 3.5 H6.5 L8 5 H14.5 V12.5 H1.5 Z" fill="#fde68a" stroke="#b45309" strokeWidth="1.1" />
      </svg>
    );
  }
  if (kind === 'LN') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
        <rect x="2" y="2" width="12" height="12" rx="1" fill="#e0f2fe" stroke="#0369a1" strokeWidth="1.1" />
        <text x="8" y="10.8" textAnchor="middle" fontSize="6.5" fontWeight="700" fill="#0c4a6e" fontFamily="Arial, sans-serif">
          LN
        </text>
      </svg>
    );
  }
  if (kind === 'FC') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
        <rect x="2" y="3" width="12" height="10" rx="1" fill="#f3e8ff" stroke="#7e22ce" strokeWidth="1.1" />
        <text x="8" y="10.3" textAnchor="middle" fontSize="6" fontWeight="700" fill="#581c87" fontFamily="Arial, sans-serif">
          FC
        </text>
      </svg>
    );
  }
  if (kind === 'DO') {
    return (
      <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
        <rect x="2.5" y="2.5" width="11" height="11" fill="#dcfce7" stroke="#15803d" strokeWidth="1.1" />
        <circle cx="8" cy="8" r="2.3" fill="#16a34a" />
      </svg>
    );
  }
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" className="shrink-0">
      <rect x="3" y="3" width="10" height="10" fill="#ffffff" stroke="#64748b" strokeWidth="1" />
      <line x1="5" y1="8" x2="11" y2="8" stroke="#0f172a" strokeWidth="1.2" />
    </svg>
  );
};

export const IecBrowserTool: React.FC = () => {
  const initialCache = useMemo(() => loadInitialBrowserCache(), []);
  const {
    ieds: storeIeds,
    bays,
    gooseControlBlocks: storeGcbs,
    commandBreaker,
    triggerMmsGeneralInterrogation,
  } = useSubstationStore();

  const [onlineServers, setOnlineServers] = useState<IecServerModel[]>(() => initialCache.onlineServers || []);
  const [offlineServers, setOfflineServers] = useState<IecServerModel[]>(() => initialCache.offlineServers || []);
  const [offlineFileName, setOfflineFileName] = useState<string>(() => initialCache.offlineFileName || '');
  const [expanded, setExpanded] = useState<Record<string, boolean>>(
    () => initialCache.expanded || { ONLINE_ROOT: true, OFFLINE_ROOT: true }
  );
  const [selection, setSelection] = useState<TreeSelection>(
    () => initialCache.selection || { kind: 'OFFLINE_ROOT' }
  );
  const [logs, setLogs] = useState<LogEntry[]>(() =>
    initialCache.logs && initialCache.logs.length > 0 ? initialCache.logs : IEC_VERSION_BANNER
  );
  const [autoRefresh, setAutoRefresh] = useState<boolean>(() => Boolean(initialCache.autoRefresh));
  const [pollMs, setPollMs] = useState<number>(1500);
  const [attrOverrides, setAttrOverrides] = useState<Record<string, string>>(() => initialCache.attrOverrides || {});
  const [rcbEnabled, setRcbEnabled] = useState<Record<string, boolean>>(() => initialCache.rcbEnabled || {});
  const [actSgMap, setActSgMap] = useState<Record<string, number>>(() => initialCache.actSgMap || {});

  // Toolbar & Menus state
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [gotoQuery, setGotoQuery] = useState<string>('');
  const [connectOpen, setConnectOpen] = useState<boolean>(false);
  const [aboutOpen, setAboutOpen] = useState<boolean>(false);
  const [connectIp, setConnectIp] = useState<string>(() => storeIeds[0]?.ipAddressLanA || '10.132.10.11');
  const [connectPort, setConnectPort] = useState<string>('102');
  const [selectedConnectIedId, setSelectedConnectIedId] = useState<string>(() => storeIeds[0]?.id || '');

  // Inline attribute editing & SBO control state
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingVal, setEditingVal] = useState<string>('');
  const [sboSelectedRef, setSboSelectedRef] = useState<string | null>(null);
  const [sboTargetVal, setSboTargetVal] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [lastRefreshTick, setLastRefreshTick] = useState<number>(() => Date.now());
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; sel: TreeSelection } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const logPaneRef = useRef<HTMLDivElement | null>(null);
  const logSeqRef = useRef<number>(logs.length + 10);

  const appendLog = (text: string, kind: LogEntry['kind'] = 'NORMAL') => {
    logSeqRef.current += 1;
    const id = logSeqRef.current;
    setLogs((prev) => [...prev.slice(-220), { id, text: `${fmtLogTs()}  ${text}`, kind }]);
  };

  // Persist full session to module cache + localStorage so browser refresh keeps connected IEDs & state
  useEffect(() => {
    saveBrowserCache({
      onlineServers,
      offlineServers,
      offlineFileName,
      expanded,
      selection,
      logs,
      autoRefresh,
      attrOverrides,
      rcbEnabled,
      actSgMap,
    });
  }, [onlineServers, offlineServers, offlineFileName, expanded, selection, logs, autoRefresh, attrOverrides, rcbEnabled, actSgMap]);

  // Auto-scroll ONLY the internal log container (never scroll the outer browser page)
  useEffect(() => {
    if (logPaneRef.current) {
      logPaneRef.current.scrollTop = logPaneRef.current.scrollHeight;
    }
  }, [logs.length]);

  // Close menus on outside click
  useEffect(() => {
    const closeAll = () => {
      setOpenMenu(null);
      setContextMenu(null);
    };
    window.addEventListener('click', closeAll);
    return () => window.removeEventListener('click', closeAll);
  }, []);

  // Build an IecServerModel from a live Substation Store IED
  const buildModelFromStoreIed = (targetId: string, mode: 'ONLINE' | 'OFFLINE'): IecServerModel | null => {
    const target = storeIeds.find((i) => i.id === targetId);
    if (!target) return null;
    const bay = bays.find((b) => b.id === target.bayId);
    const nowStr = fmtUtcIec();

    const lds: IecLdNode[] = target.logicalDevices.map((ld, ldIdx) => {
      const lns: IecLnNode[] = ld.logicalNodes.map((ln) => {
        const lnName = `${ln.lnPrefix || ''}${ln.lnClass}${ln.lnInst}`;
        const fcs: Record<string, IecDoNode[]> = {};
        const pushDo = (fc: string, node: IecDoNode) => {
          if (!fcs[fc]) fcs[fc] = [];
          fcs[fc].push(node);
        };

        // Add LLN0 DataSets, RCBs, GCBs, SGCB on first LD
        if (ln.lnClass === 'LLN0' && ldIdx === 0) {
          target.datasets.forEach((ds) => {
            pushDo('DS', {
              name: ds.name,
              cdc: 'DataSet',
              desc: ds.description,
              fc: 'DS',
              attrs: ds.fcdas.map((f, idx) => {
                const ref = `${target.name}${f.ldInst}/${f.lnClass}${f.lnInst}$${f.fc}$${f.doName}${f.daName ? '$' + f.daName : ''}`;
                return {
                  name: `FCDA[${idx + 1}]`,
                  mmsType: 'ObjectReference',
                  value: ref,
                  writable: false,
                  fc: 'DS',
                  daPath: `${target.name}${ld.ldInst}/${lnName}$DS$${ds.name}[${idx + 1}]`,
                };
              }),
            });
          });

          target.rcbs.forEach((rcb) => {
            const fcKey = rcb.buffered ? 'BR' : 'RP';
            const base = `${target.name}${ld.ldInst}/${lnName}$${fcKey}$${rcb.name}`;
            pushDo(fcKey, {
              name: rcb.name,
              cdc: rcb.buffered ? 'BRCB' : 'URCB',
              desc: rcb.buffered ? 'Buffered Report Control Block' : 'Unbuffered Report Control Block',
              fc: fcKey,
              attrs: [
                { name: 'RptID', mmsType: 'VisibleString(129)', value: rcb.rptId, writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$RptID` },
                { name: 'RptEna', mmsType: 'Boolean', value: String(rcb.enabled), writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$RptEna`, enumOptions: ['false', 'true'] },
                ...(rcb.buffered
                  ? [{ name: 'Resv', mmsType: 'Boolean', value: String(rcb.enabled), writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$Resv`, enumOptions: ['false', 'true'] }]
                  : []),
                { name: 'DatSet', mmsType: 'VisibleString(129)', value: `${target.name}${ld.ldInst}/LLN0$${rcb.datSet}`, writable: false, fc: fcKey, daPath: `${base}$DatSet` },
                { name: 'ConfRev', mmsType: 'Unsigned(32)', value: String(rcb.confRev), writable: false, fc: fcKey, daPath: `${base}$ConfRev` },
                { name: 'OptFlds', mmsType: 'Bitstring(10)', value: '0111110100', writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$OptFlds` },
                { name: 'BufTm', mmsType: 'Unsigned(32)', value: '100', writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$BufTm` },
                { name: 'SqNum', mmsType: 'Unsigned(16)', value: '1', writable: false, fc: fcKey, daPath: `${base}$SqNum` },
                { name: 'TrgOps', mmsType: 'Bitstring(6)', value: '010110', writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$TrgOps` },
                { name: 'IntgPd', mmsType: 'Unsigned(32)', value: String(rcb.intgPdMs), writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$IntgPd` },
                { name: 'GI', mmsType: 'Boolean', value: 'false', writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$GI`, enumOptions: ['false', 'true'] },
                ...(rcb.buffered
                  ? [{ name: 'PurgeBuf', mmsType: 'Boolean', value: 'false', writable: mode === 'ONLINE', fc: fcKey, daPath: `${base}$PurgeBuf`, enumOptions: ['false', 'true'] }]
                  : []),
              ],
            });
          });

          storeGcbs
            .filter((g) => g.publisherIedId === target.id)
            .forEach((g) => {
              const base = `${target.name}${ld.ldInst}/${lnName}$GO$${g.gocbName}`;
              pushDo('GO', {
                name: g.gocbName,
                cdc: 'GoCB',
                desc: `GOOSE Publisher (${g.appId})`,
                fc: 'GO',
                attrs: [
                  { name: 'GoEna', mmsType: 'Boolean', value: 'true', writable: mode === 'ONLINE', fc: 'GO', daPath: `${base}$GoEna`, enumOptions: ['false', 'true'] },
                  { name: 'GoID', mmsType: 'VisibleString(129)', value: g.appId, writable: false, fc: 'GO', daPath: `${base}$GoID` },
                  { name: 'DatSet', mmsType: 'VisibleString(129)', value: `${target.name}${ld.ldInst}/LLN0$${g.datSet}`, writable: false, fc: 'GO', daPath: `${base}$DatSet` },
                  { name: 'ConfRev', mmsType: 'Unsigned(32)', value: String(g.confRev), writable: false, fc: 'GO', daPath: `${base}$ConfRev` },
                  { name: 'DstAddress.Addr', mmsType: 'OctetString(6)', value: g.multicastMac, writable: false, fc: 'GO', daPath: `${base}$DstAddress$Addr` },
                  { name: 'DstAddress.VLAN-ID', mmsType: 'Unsigned(16)', value: String(g.vlanId), writable: false, fc: 'GO', daPath: `${base}$DstAddress$VLAN-ID` },
                  { name: 'MinTime', mmsType: 'Unsigned(32)', value: `${g.minTimeMs} ms`, writable: false, fc: 'GO', daPath: `${base}$MinTime` },
                  { name: 'MaxTime', mmsType: 'Unsigned(32)', value: `${g.maxTimeMs} ms`, writable: false, fc: 'GO', daPath: `${base}$MaxTime` },
                ],
              });
            });

          // SGCB
          const sgBase = `${target.name}${ld.ldInst}/${lnName}$SG$SGCB`;
          pushDo('SG', {
            name: 'SGCB',
            cdc: 'SGCB',
            desc: 'Setting Group Control Block',
            fc: 'SG',
            attrs: [
              { name: 'NumOfSG', mmsType: 'Unsigned(8)', value: '4', writable: false, fc: 'SG', daPath: `${sgBase}$NumOfSG` },
              { name: 'ActSG', mmsType: 'Unsigned(8)', value: '1', writable: mode === 'ONLINE', fc: 'SG', daPath: `${sgBase}$ActSG`, enumOptions: ['1', '2', '3', '4'] },
              { name: 'EditSG', mmsType: 'Unsigned(8)', value: '0', writable: mode === 'ONLINE', fc: 'SG', daPath: `${sgBase}$EditSG` },
              { name: 'CnfEdit', mmsType: 'Boolean', value: 'false', writable: mode === 'ONLINE', fc: 'SG', daPath: `${sgBase}$CnfEdit`, enumOptions: ['false', 'true'] },
              { name: 'LActTm', mmsType: 'UTCTime', value: nowStr, writable: false, fc: 'SG', daPath: `${sgBase}$LActTm` },
            ],
          });

          // Standard LLN0 Mod / Beh / Health / NamPlt
          pushDo('ST', {
            name: 'Mod',
            cdc: 'ENC',
            desc: 'Mode',
            fc: 'ST',
            attrs: [
              { name: 'stVal', mmsType: 'Integer(8)', value: 'on (1)', writable: false, fc: 'ST', daPath: `${target.name}${ld.ldInst}/${lnName}$ST$Mod$stVal` },
              { name: 'q', mmsType: 'Bitstring(13)', value: '0000000000000', writable: false, fc: 'ST', daPath: `${target.name}${ld.ldInst}/${lnName}$ST$Mod$q` },
              { name: 't', mmsType: 'UTCTime', value: nowStr, writable: false, fc: 'ST', daPath: `${target.name}${ld.ldInst}/${lnName}$ST$Mod$t` },
            ],
          });
          pushDo('DC', {
            name: 'NamPlt',
            cdc: 'LPL',
            desc: 'Name plate',
            fc: 'DC',
            attrs: [
              { name: 'vendor', mmsType: 'VisibleString(255)', value: target.vendor, writable: false, fc: 'DC', daPath: `${target.name}${ld.ldInst}/${lnName}$DC$NamPlt$vendor` },
              { name: 'swRev', mmsType: 'VisibleString(255)', value: target.firmwareVersion || 'V07.80', writable: false, fc: 'DC', daPath: `${target.name}${ld.ldInst}/${lnName}$DC$NamPlt$swRev` },
              { name: 'd', mmsType: 'VisibleString(255)', value: `${target.model} (${target.role})`, writable: false, fc: 'DC', daPath: `${target.name}${ld.ldInst}/${lnName}$DC$NamPlt$d` },
              { name: 'configRev', mmsType: 'VisibleString(255)', value: '1.0', writable: false, fc: 'DC', daPath: `${target.name}${ld.ldInst}/${lnName}$DC$NamPlt$configRev` },
            ],
          });
        }

        // Map all Data Objects of the LN
        ln.dataObjects.forEach((d) => {
          const fc = d.fc || 'ST';
          const base = `${target.name}${ld.ldInst}/${lnName}$${fc}$${d.doName}`;
          const isMx = fc === 'MX';
          const isDpc = d.cdc === 'DPC' || d.doName === 'Pos';
          const valAttrName = isMx ? 'mag.f' : 'stVal';
          const valType = isMx ? 'Float(32)' : isDpc ? 'Bitstring(2)' : 'Boolean';

          const attrs: IecAttr[] = [
            {
              name: valAttrName,
              mmsType: valType,
              value: isDpc ? dbposDisplay(bay && d.doName === 'Pos' ? bay.breakerState : d.value) : d.value,
              writable: false,
              fc,
              daPath: `${base}$${valAttrName}`,
            },
            { name: 'q', mmsType: 'Bitstring(13)', value: '0000000000000', writable: false, fc, daPath: `${base}$q` },
            { name: 't', mmsType: 'UTCTime', value: nowStr, writable: false, fc, daPath: `${base}$t` },
          ];

          pushDo(fc, { name: d.doName, cdc: d.cdc, desc: `${d.cdc} Data Object`, fc, attrs });

          // Add Control (CO) & Configuration (CF) branches for Pos (XCBR/CSWI)
          if ((ln.lnClass === 'XCBR' || ln.lnClass === 'CSWI') && d.doName === 'Pos') {
            const coBase = `${target.name}${ld.ldInst}/${lnName}$CO$Pos`;
            pushDo('CO', {
              name: 'Pos',
              cdc: 'DPC',
              desc: 'Controllable Switch Position (SBOw)',
              fc: 'CO',
              attrs: [
                { name: 'SBOw.ctlVal', mmsType: 'Boolean', value: 'false', writable: mode === 'ONLINE', fc: 'CO', daPath: `${coBase}$SBOw$ctlVal`, enumOptions: ['false', 'true'] },
                { name: 'Oper.ctlVal', mmsType: 'Boolean', value: 'false', writable: mode === 'ONLINE', fc: 'CO', daPath: `${coBase}$Oper$ctlVal`, enumOptions: ['false', 'true'] },
                { name: 'Oper.origin.orCat', mmsType: 'Integer(8)', value: 'station-control (2)', writable: false, fc: 'CO', daPath: `${coBase}$Oper$origin$orCat` },
                { name: 'Oper.origin.orIdent', mmsType: 'OctetString(64)', value: 'IEC_Browser_2.21.4', writable: false, fc: 'CO', daPath: `${coBase}$Oper$origin$orIdent` },
                { name: 'Oper.ctlNum', mmsType: 'Unsigned(8)', value: '1', writable: false, fc: 'CO', daPath: `${coBase}$Oper$ctlNum` },
                { name: 'Oper.T', mmsType: 'UTCTime', value: nowStr, writable: false, fc: 'CO', daPath: `${coBase}$Oper$T` },
                { name: 'Oper.Test', mmsType: 'Boolean', value: 'false', writable: mode === 'ONLINE', fc: 'CO', daPath: `${coBase}$Oper$Test`, enumOptions: ['false', 'true'] },
                { name: 'Oper.Check', mmsType: 'Bitstring(2)', value: '11 (Synchro+Interlock)', writable: false, fc: 'CO', daPath: `${coBase}$Oper$Check` },
                { name: 'Cancel.ctlVal', mmsType: 'Boolean', value: 'false', writable: mode === 'ONLINE', fc: 'CO', daPath: `${coBase}$Cancel$ctlVal`, enumOptions: ['false', 'true'] },
              ],
            });
            const cfBase = `${target.name}${ld.ldInst}/${lnName}$CF$Pos`;
            pushDo('CF', {
              name: 'Pos',
              cdc: 'DPC',
              desc: 'Control Model Configuration',
              fc: 'CF',
              attrs: [
                { name: 'ctlModel', mmsType: 'Integer(8)', value: 'sbo-with-enhanced-security (4)', writable: false, fc: 'CF', daPath: `${cfBase}$ctlModel` },
                { name: 'sboTimeout', mmsType: 'Unsigned(32)', value: '30000', writable: false, fc: 'CF', daPath: `${cfBase}$sboTimeout` },
              ],
            });
          }
        });

        return { ldInst: ld.ldInst, name: lnName, lnClass: ln.lnClass, desc: ln.description, fcs };
      });

      return { inst: ld.ldInst, desc: ld.description || 'Logical Device', lns };
    });

    return {
      id: `${mode === 'ONLINE' ? 'ON' : 'OFF'}-${target.id}`,
      mode,
      name: target.name,
      ip: target.ipAddressLanA,
      port: Number(connectPort) || 102,
      manufacturer: target.vendor,
      model: target.model,
      bayId: target.bayId,
      storeIedId: target.id,
      sourceLabel: mode === 'ONLINE' ? `${target.ipAddressLanA}:${connectPort || '102'}` : `Substation_132kV.scd`,
      lds,
      connectedAt: mode === 'ONLINE' ? fmtLogTs() : undefined,
    };
  };

  // Resolve real-time value from useSubstationStore for Online IEDs
  const resolveLiveAttrValue = (
    server: IecServerModel,
    lnClass: string,
    fc: string,
    doName: string,
    attr: IecAttr
  ): string => {
    if (attrOverrides[attr.daPath] !== undefined) return attrOverrides[attr.daPath];
    if (fc === 'BR' || fc === 'RP') {
      const rcbKey = `${server.id}/${doName}`;
      if (attr.name === 'RptEna' || attr.name === 'Resv') {
        return rcbEnabled[rcbKey] !== undefined ? String(rcbEnabled[rcbKey]) : attr.value;
      }
    }
    if (fc === 'SG' && attr.name === 'ActSG') {
      return String(actSgMap[server.id] ?? 1);
    }
    if (server.mode !== 'ONLINE' || !server.bayId) return attr.value;

    const bay = bays.find((b) => b.id === server.bayId);
    if (!bay) return attr.value;

    if (attr.name === 'q') {
      return bay.quality === 'GOOD' ? '0000000000000 (Good)' : '0100000000000 (Invalid)';
    }
    if (attr.name === 't') {
      return fmtUtcIec(new Date(lastRefreshTick));
    }

    const cls = lnClass.toUpperCase();
    if ((cls.endsWith('XCBR') || cls.endsWith('CSWI')) && doName === 'Pos' && attr.name === 'stVal') {
      return dbposDisplay(bay.breakerState);
    }
    if (cls.endsWith('PTRC') && (doName === 'Tr' || doName === 'Op') && attr.name === 'stVal') {
      return bay.protectionTripActive ? 'true' : 'false';
    }
    if (
      (cls.endsWith('PTOC') || cls.endsWith('PIOC') || cls.endsWith('PDIF') || cls.endsWith('PDIS')) &&
      (doName === 'Str' || doName === 'Op') &&
      attr.name === 'stVal'
    ) {
      return bay.protectionTripActive ? 'true' : 'false';
    }
    if (cls.endsWith('CILO') && doName === 'EnaCls' && attr.name === 'stVal') {
      const locked = Boolean(bay.masterTripLockout ?? bay.protectionTripActive);
      return bay.interlockPermissive && !locked ? 'true' : 'false';
    }
    if (cls.endsWith('MMXU') && attr.name === 'mag.f') {
      const baseDo = doName.split('.')[0];
      if (baseDo === 'A') return bay.currentA.toFixed(2);
      if (baseDo === 'PhV' || baseDo === 'PPV') return bay.voltageAbKv.toFixed(2);
      if (baseDo === 'TotW') return bay.activePowerMw.toFixed(2);
      if (baseDo === 'TotVAr') return (bay.reactivePowerMvar ?? 0).toFixed(2);
      if (baseDo === 'Hz') return (bay.frequencyHz ?? 50).toFixed(3);
    }
    return attr.value;
  };

  // Auto-Refresh polling timer & active Report Client periodic integrity reports
  useEffect(() => {
    if (!autoRefresh || onlineServers.length === 0) return;
    const timer = window.setInterval(() => {
      setLastRefreshTick(Date.now());
      const firstSrv = onlineServers[0];
      if (firstSrv) {
        const bay = bays.find((b) => b.id === firstSrv.bayId);
        if (bay) {
          appendLog(
            `AutoRefresh Read [${firstSrv.name}]: Pos=${bay.breakerState}, I=${bay.currentA.toFixed(1)}A, V=${bay.voltageAbKv.toFixed(2)}kV, P=${bay.activePowerMw.toFixed(2)}MW`,
            'NORMAL'
          );
        }
      }
    }, pollMs);
    return () => window.clearInterval(timer);
  }, [autoRefresh, pollMs, onlineServers, bays]);

  // Periodic integrity report logs when any RCB has RptEna = true
  useEffect(() => {
    const enabledKeys = Object.entries(rcbEnabled)
      .filter(([, v]) => v)
      .map(([k]) => k);
    if (enabledKeys.length === 0 || onlineServers.length === 0) return;

    const timer = window.setInterval(() => {
      enabledKeys.forEach((k) => {
        const [srvId, rcbName] = k.split('/');
        const srv = onlineServers.find((s) => s.id === srvId);
        if (!srv) return;
        const bay = bays.find((b) => b.id === srv.bayId);
        appendLog(
          `[Report Client] InformationReport from ${srv.name} (${rcbName}) Reason=Integrity: Pos=${bay?.breakerState || 'CLOSED'}, Trip=${bay?.protectionTripActive ? 'TRUE' : 'FALSE'}, P=${bay ? bay.activePowerMw.toFixed(2) : '0.00'}MW`,
          'REPORT'
        );
      });
    }, 5000);
    return () => window.clearInterval(timer);
  }, [rcbEnabled, onlineServers, bays]);

  // Connect to Online IED Server
  const handleConnect = (overrideIedId?: string) => {
    const targetId = overrideIedId || selectedConnectIedId;
    const matched =
      storeIeds.find((i) => i.id === targetId) ||
      storeIeds.find((i) => i.ipAddressLanA === connectIp.trim() || i.ipAddressLanB === connectIp.trim()) ||
      storeIeds[0];

    if (!matched) {
      appendLog(`Connect failed: No reachable IEC 61850 MMS server at ${connectIp}:${connectPort}`, 'ERR');
      return;
    }

    const srv = buildModelFromStoreIed(matched.id, 'ONLINE');
    if (!srv) return;

    setOnlineServers((prev) => [srv, ...prev.filter((s) => s.id !== srv.id)]);
    const firstLd = srv.lds[0];
    setExpanded((prev) => ({
      ...prev,
      ONLINE_ROOT: true,
      [`IED:ONLINE:${srv.id}`]: true,
      ...(firstLd ? { [`LD:ONLINE:${srv.id}:${firstLd.inst}`]: true } : {}),
    }));
    setSelection({ kind: 'IED', mode: 'ONLINE', iedId: srv.id });
    setConnectOpen(false);

    appendLog(`TCP Connect ${srv.ip}:${srv.port} (ISO-TSAP / RFC1006)...`, 'NORMAL');
    appendLog(`MMS Initiate-Response(+) received from ${srv.name} (${srv.manufacturer} ${srv.model})`, 'OK');
    appendLog(
      `GetServerDirectory -> ${srv.lds.length} Logical Device(s), ${srv.lds.reduce((a, l) => a + l.lns.length, 0)} Logical Node(s) loaded.`,
      'OK'
    );
  };

  // Disconnect active Online server
  const handleDisconnect = () => {
    if (onlineServers.length === 0) return;
    const targetId =
      selection.kind !== 'ONLINE_ROOT' && selection.kind !== 'OFFLINE_ROOT' && selection.mode === 'ONLINE'
        ? selection.iedId
        : onlineServers[0].id;
    const target = onlineServers.find((s) => s.id === targetId);
    setOnlineServers((prev) => prev.filter((s) => s.id !== targetId));
    setAutoRefresh(false);
    setSboSelectedRef(null);
    setSelection({ kind: 'ONLINE_ROOT' });
    if (target) {
      appendLog(`MMS Conclude / Release: Disconnected from ${target.name} (${target.ip}:${target.port}).`, 'WARN');
    }
  };

  // Delete selected Online client or Offline station
  const handleDeleteSelected = () => {
    if (selection.kind === 'ONLINE_ROOT' || (selection.kind !== 'OFFLINE_ROOT' && selection.mode === 'ONLINE')) {
      handleDisconnect();
      return;
    }
    if (offlineServers.length > 0) {
      const fname = offlineFileName;
      setOfflineServers([]);
      setOfflineFileName('');
      setSelection({ kind: 'OFFLINE_ROOT' });
      appendLog(`Closed Offline station "${fname}".`, 'WARN');
    }
  };

  // Open local .icd / .scd / .cid XML file
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const xml = String(reader.result || '');
        const parsed = parseSclToOfflineModels(file.name, xml);
        setOfflineServers(parsed);
        setOfflineFileName(file.name);
        setExpanded((prev) => ({
          ...prev,
          OFFLINE_ROOT: true,
          ...(parsed[0] ? { [`IED:OFFLINE:${parsed[0].id}`]: true } : {}),
        }));
        setSelection(parsed[0] ? { kind: 'IED', mode: 'OFFLINE', iedId: parsed[0].id } : { kind: 'OFFLINE_ROOT' });
        appendLog(`Opened SCL file "${file.name}" -> ${parsed.length} IED(s) parsed in Offline mode.`, 'OK');
      } catch (err) {
        appendLog(err instanceof Error ? err.message : `Failed to parse ${file.name}`, 'ERR');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Load built-in Substation SCD offline
  const handleLoadBuiltInScd = () => {
    const models = storeIeds
      .map((i) => buildModelFromStoreIed(i.id, 'OFFLINE'))
      .filter((x): x is IecServerModel => Boolean(x));
    if (models.length === 0) return;
    setOfflineServers(models);
    setOfflineFileName('Substation_132kV_SAS.scd');
    setExpanded((prev) => ({
      ...prev,
      OFFLINE_ROOT: true,
      [`IED:OFFLINE:${models[0].id}`]: true,
    }));
    setSelection({ kind: 'IED', mode: 'OFFLINE', iedId: models[0].id });
    appendLog(`Opened Offline Station "Substation_132kV_SAS.scd" (${models.length} IEDs).`, 'OK');
  };

  // Toggle tree node expansion
  const toggleExpand = (nodeKey: string) => {
    setExpanded((prev) => ({ ...prev, [nodeKey]: !prev[nodeKey] }));
  };

  // Go to path / search jump
  const handleGoto = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const q = gotoQuery.trim().toLowerCase();
    if (!q) return;

    const allServers = [...onlineServers, ...offlineServers];
    for (const srv of allServers) {
      const m = srv.mode;
      const rootKey = m === 'ONLINE' ? 'ONLINE_ROOT' : 'OFFLINE_ROOT';
      for (const ld of srv.lds) {
        for (const ln of ld.lns) {
          if (ln.name.toLowerCase().includes(q)) {
            setExpanded((prev) => ({
              ...prev,
              [rootKey]: true,
              [`IED:${m}:${srv.id}`]: true,
              [`LD:${m}:${srv.id}:${ld.inst}`]: true,
            }));
            setSelection({ kind: 'LN', mode: m, iedId: srv.id, ldInst: ld.inst, lnName: ln.name });
            appendLog(`Go to: Navigated to ${srv.name}${ld.inst}/${ln.name}`, 'NORMAL');
            return;
          }
          for (const fc of Object.keys(ln.fcs)) {
            for (const d of ln.fcs[fc]) {
              const doRef = `${srv.name}${ld.inst}/${ln.name}$${fc}$${d.name}`.toLowerCase();
              if (d.name.toLowerCase().includes(q) || doRef.includes(q)) {
                setExpanded((prev) => ({
                  ...prev,
                  [rootKey]: true,
                  [`IED:${m}:${srv.id}`]: true,
                  [`LD:${m}:${srv.id}:${ld.inst}`]: true,
                  [`LN:${m}:${srv.id}:${ld.inst}:${ln.name}`]: true,
                  [`FC:${m}:${srv.id}:${ld.inst}:${ln.name}:${fc}`]: true,
                }));
                setSelection({ kind: 'DO', mode: m, iedId: srv.id, ldInst: ld.inst, lnName: ln.name, fc, doName: d.name });
                appendLog(`Go to: Navigated to ${srv.name}${ld.inst}/${ln.name}$${fc}$${d.name}`, 'NORMAL');
                return;
              }
              for (const a of d.attrs) {
                if (a.name.toLowerCase().includes(q) || a.daPath.toLowerCase().includes(q)) {
                  setExpanded((prev) => ({
                    ...prev,
                    [rootKey]: true,
                    [`IED:${m}:${srv.id}`]: true,
                    [`LD:${m}:${srv.id}:${ld.inst}`]: true,
                    [`LN:${m}:${srv.id}:${ld.inst}:${ln.name}`]: true,
                    [`FC:${m}:${srv.id}:${ld.inst}:${ln.name}:${fc}`]: true,
                    [`DO:${m}:${srv.id}:${ld.inst}:${ln.name}:${fc}:${d.name}`]: true,
                  }));
                  setSelection({
                    kind: 'DA',
                    mode: m,
                    iedId: srv.id,
                    ldInst: ld.inst,
                    lnName: ln.name,
                    fc,
                    doName: d.name,
                    daName: a.name,
                  });
                  appendLog(`Go to: Navigated to ${a.daPath}`, 'NORMAL');
                  return;
                }
              }
            }
          }
        }
      }
    }
    appendLog(`Go to: Reference "${gotoQuery}" not found in active tree.`, 'WARN');
  };

  // Write MMS Attribute handler
  const executeMmsWrite = (row: GridRow, newValue: string) => {
    if (!row.meta || !row.refPath) return;
    const { iedId, fc, doName, daName } = row.meta;
    const srv = onlineServers.find((s) => s.id === iedId);
    if (!srv) return;

    // 1. Report Enable (RptEna)
    if ((fc === 'BR' || fc === 'RP') && daName === 'RptEna') {
      const boolVal = newValue.toLowerCase() === 'true' || newValue === '1';
      setRcbEnabled((prev) => ({ ...prev, [`${srv.id}/${doName}`]: boolVal }));
      appendLog(`MMS Write: ${row.refPath} = ${boolVal} -> Success`, 'OK');
      if (boolVal) {
        appendLog(`[Report Client] Subscribed to ${doName} on ${srv.name}. Listening for spontaneous & integrity reports.`, 'REPORT');
      }
      return;
    }

    // 2. General Interrogation (GI) & PurgeBuf (momentary triggers: show checkmark visibly then auto-reset)
    if ((fc === 'BR' || fc === 'RP') && daName === 'GI') {
      const refKey = row.refPath;
      setAttrOverrides((prev) => ({ ...prev, [refKey]: 'true' }));
      if (srv.storeIedId) {
        triggerMmsGeneralInterrogation(srv.storeIedId);
      }
      const bay = bays.find((b) => b.id === srv.bayId);
      appendLog(`MMS Write: ${refKey} = true -> Success`, 'OK');
      appendLog(
        `[Report Client] GI InformationReport (${doName}) received: XCBR1$ST$Pos=${bay?.breakerState || 'CLOSED'}, PTRC1$ST$Tr=${bay?.protectionTripActive ? 'true' : 'false'}, MMXU1$MX$A=${bay ? bay.currentA.toFixed(1) : '0.0'}A, MMXU1$MX$PhV=${bay ? bay.voltageAbKv.toFixed(2) : '0.00'}kV`,
        'REPORT'
      );
      window.setTimeout(() => {
        setAttrOverrides((prev) => ({ ...prev, [refKey]: 'false' }));
      }, 1200);
      return;
    }

    if ((fc === 'BR' || fc === 'RP') && daName === 'PurgeBuf') {
      const refKey = row.refPath;
      setAttrOverrides((prev) => ({ ...prev, [refKey]: 'true' }));
      appendLog(`MMS Write: ${refKey} = true -> Buffer purged on ${doName}`, 'OK');
      window.setTimeout(() => {
        setAttrOverrides((prev) => ({ ...prev, [refKey]: 'false' }));
      }, 1200);
      return;
    }

    // 3. Active Setting Group (ActSG)
    if (fc === 'SG' && daName === 'ActSG') {
      const sgNum = Math.max(1, Math.min(4, Number(newValue) || 1));
      setActSgMap((prev) => ({ ...prev, [srv.id]: sgNum }));
      appendLog(`MMS SelectActiveSG: ${srv.name} ActSG = ${sgNum} -> Positive Response`, 'OK');
      return;
    }

    // 4. Control Object (CO) SBOw / Oper / Cancel
    if (fc === 'CO' && doName === 'Pos') {
      const boolVal = newValue.toLowerCase() === 'true' || newValue === '1';
      const targetState: 'CLOSED' | 'OPEN' = boolVal ? 'CLOSED' : 'OPEN';
      if (daName === 'SBOw.ctlVal') {
        setAttrOverrides((prev) => ({ ...prev, [row.refPath!]: String(boolVal) }));
        setSboSelectedRef(`${srv.id}/${doName}`);
        setSboTargetVal(targetState);
        appendLog(`MMS SelectWithValue (SBOw): ${row.refPath} = ${boolVal} (${targetState}) -> Positive Response`, 'OK');
        return;
      }
      if (daName === 'Oper.ctlVal') {
        setAttrOverrides((prev) => ({ ...prev, [row.refPath!]: String(boolVal) }));
        const ok = srv.bayId ? commandBreaker(srv.bayId, targetState, 'SCADA_SBO') : true;
        setSboSelectedRef(null);
        setLastRefreshTick(Date.now());
        if (ok) {
          appendLog(`MMS Operate: ${row.refPath} = ${boolVal} (${targetState}) -> CommandTermination+ (Breaker ${targetState})`, 'OK');
        } else {
          appendLog(`MMS Operate: ${row.refPath} = ${boolVal} -> AddCause: Blocked-by-interlocking / Local mode`, 'ERR');
        }
        return;
      }
      if (daName === 'Cancel.ctlVal') {
        setSboSelectedRef(null);
        appendLog(`MMS Cancel: ${row.refPath} -> Selection Released`, 'WARN');
        return;
      }
    }

    // 5. Generic writable attribute
    setAttrOverrides((prev) => ({ ...prev, [row.refPath!]: newValue }));
    appendLog(`MMS Write: ${row.refPath} = ${newValue} -> Success`, 'OK');
  };

  // Explicit SBOw Control Helper buttons when viewing CO$Pos
  const handleSboAction = (action: 'SELECT' | 'OPERATE' | 'CANCEL', srv: IecServerModel, ldInst: string, lnName: string) => {
    const refBase = `${srv.name}${ldInst}/${lnName}$CO$Pos`;
    const boolVal = sboTargetVal === 'CLOSED';
    if (action === 'SELECT') {
      setSboSelectedRef(`${srv.id}/Pos`);
      appendLog(`MMS SelectWithValue: ${refBase}$SBOw.ctlVal = ${boolVal} (${sboTargetVal}) -> Positive Response (Ready for Operate)`, 'OK');
    } else if (action === 'OPERATE') {
      if (sboSelectedRef !== `${srv.id}/Pos`) {
        appendLog(`MMS Operate Warning: Sending SBOw Select first for ${refBase}...`, 'WARN');
      }
      const ok = srv.bayId ? commandBreaker(srv.bayId, sboTargetVal, 'SCADA_SBO') : true;
      setSboSelectedRef(null);
      setLastRefreshTick(Date.now());
      if (ok) {
        appendLog(`MMS Operate: ${refBase}$Oper.ctlVal = ${boolVal} -> CommandTermination+ (Breaker ${sboTargetVal})`, 'OK');
      } else {
        appendLog(`MMS Operate Rejected: ${refBase} -> AddCause: Blocked-by-interlocking or Bay in LOCAL mode`, 'ERR');
      }
    } else {
      setSboSelectedRef(null);
      appendLog(`MMS Cancel: ${refBase}$Cancel -> SBO Selection cleared`, 'WARN');
    }
  };

  // Locate currently selected server / ld / ln / do
  const selectedContext = useMemo(() => {
    if (selection.kind === 'ONLINE_ROOT' || selection.kind === 'OFFLINE_ROOT') return null;
    const pool = selection.mode === 'ONLINE' ? onlineServers : offlineServers;
    const srv = pool.find((s) => s.id === selection.iedId);
    if (!srv) return null;
    const ld = 'ldInst' in selection ? srv.lds.find((l) => l.inst === selection.ldInst) : undefined;
    const ln = 'lnName' in selection && ld ? ld.lns.find((n) => n.name === selection.lnName) : undefined;
    const doNode =
      'doName' in selection && ln && 'fc' in selection
        ? (ln.fcs[selection.fc] || []).find((d) => d.name === selection.doName)
        : undefined;
    const attr = 'daName' in selection && doNode ? doNode.attrs.find((a) => a.name === selection.daName) : undefined;
    return { srv, ld, ln, doNode, attr };
  }, [selection, onlineServers, offlineServers]);

  // Build rows for Right Top Attribute Grid
  const gridRows: GridRow[] = useMemo(() => {
    if (selection.kind === 'OFFLINE_ROOT') {
      return [
        {
          key: 'off-name',
          name: 'Name',
          mmsType: '',
          value: offlineFileName ? `Offline: ${offlineFileName}` : 'Offline: No open station',
          writable: false,
        },
        { key: 'off-type', name: 'Type', mmsType: '', value: 'Station', writable: false },
        { key: 'off-path', name: 'Path', mmsType: '', value: offlineFileName || '', writable: false },
      ];
    }

    if (selection.kind === 'ONLINE_ROOT') {
      return [
        {
          key: 'on-name',
          name: 'Name',
          mmsType: '',
          value: onlineServers.length > 0 ? `Online: ${onlineServers.length} active client(s)` : 'Online: No active client',
          writable: false,
        },
        { key: 'on-type', name: 'Type', mmsType: '', value: 'MMS Client', writable: false },
        {
          key: 'on-path',
          name: 'Path',
          mmsType: '',
          value: onlineServers.map((s) => `${s.name} (${s.ip}:${s.port})`).join('; '),
          writable: false,
        },
      ];
    }

    if (!selectedContext) return [];
    const { srv, ld, ln, doNode, attr } = selectedContext;

    if (selection.kind === 'IED') {
      return [
        { key: 'ied-name', name: 'Name', mmsType: 'VisibleString', value: srv.name, writable: false },
        { key: 'ied-type', name: 'Type', mmsType: 'VisibleString', value: `${srv.manufacturer} ${srv.model}`, writable: false },
        { key: 'ied-ip', name: 'IP Address', mmsType: 'VisibleString', value: `${srv.ip}:${srv.port}`, writable: false },
        { key: 'ied-mode', name: 'Mode', mmsType: 'VisibleString', value: srv.mode === 'ONLINE' ? 'Online (MMS Associated)' : 'Offline (SCL Read-Only)', writable: false },
        { key: 'ied-lds', name: 'Logical Devices', mmsType: 'Unsigned(16)', value: String(srv.lds.length), writable: false },
        { key: 'ied-src', name: 'Path', mmsType: 'VisibleString', value: srv.sourceLabel, writable: false },
      ];
    }

    if (selection.kind === 'LD' && ld) {
      return [
        { key: 'ld-name', name: 'Name', mmsType: 'VisibleString', value: `${srv.name}${ld.inst}`, writable: false },
        { key: 'ld-type', name: 'Type', mmsType: 'VisibleString', value: 'Logical Device (MMS Domain)', writable: false },
        { key: 'ld-desc', name: 'Description', mmsType: 'VisibleString', value: ld.desc, writable: false },
        { key: 'ld-lns', name: 'Logical Nodes', mmsType: 'Unsigned(16)', value: String(ld.lns.length), writable: false },
      ];
    }

    if (selection.kind === 'LN' && ld && ln) {
      const rows: GridRow[] = [
        { key: 'ln-ref', name: 'Reference', mmsType: 'ObjectReference', value: `${srv.name}${ld.inst}/${ln.name}`, writable: false },
        { key: 'ln-cls', name: 'LN Class', mmsType: 'VisibleString(4)', value: ln.lnClass, writable: false },
        { key: 'ln-desc', name: 'Description', mmsType: 'VisibleString', value: ln.desc, writable: false },
      ];
      // Also summarize key live DOs of this LN
      FC_ORDER.forEach((fc) => {
        (ln.fcs[fc] || []).forEach((d) => {
          const primary = d.attrs[0];
          if (primary) {
            rows.push({
              key: `ln-do-${fc}-${d.name}`,
              name: `${fc}$${d.name}.${primary.name}`,
              mmsType: primary.mmsType,
              value: resolveLiveAttrValue(srv, ln.lnClass, fc, d.name, primary),
              writable: false,
            });
          }
        });
      });
      return rows;
    }

    if (selection.kind === 'FC' && ld && ln) {
      const dos = ln.fcs[selection.fc] || [];
      const rows: GridRow[] = [];
      dos.forEach((d) => {
        d.attrs.forEach((a) => {
          const val = resolveLiveAttrValue(srv, ln.lnClass, selection.fc, d.name, a);
          rows.push({
            key: a.daPath,
            name: `${d.name}.${a.name}`,
            mmsType: a.mmsType,
            value: val,
            writable: srv.mode === 'ONLINE' && Boolean(a.writable),
            checked: a.mmsType === 'Boolean' ? val.toLowerCase() === 'true' : undefined,
            refPath: a.daPath,
            enumOptions: a.enumOptions,
            meta: { iedId: srv.id, ldInst: ld.inst, lnName: ln.name, fc: selection.fc, doName: d.name, daName: a.name },
          });
        });
      });
      return rows;
    }

    if (selection.kind === 'DO' && ld && ln && doNode) {
      return doNode.attrs.map((a) => {
        const val = resolveLiveAttrValue(srv, ln.lnClass, doNode.fc, doNode.name, a);
        return {
          key: a.daPath,
          name: a.name,
          mmsType: a.mmsType,
          value: val,
          writable: srv.mode === 'ONLINE' && Boolean(a.writable),
          checked: a.mmsType === 'Boolean' ? val.toLowerCase() === 'true' : undefined,
          refPath: a.daPath,
          enumOptions: a.enumOptions,
          meta: { iedId: srv.id, ldInst: ld.inst, lnName: ln.name, fc: doNode.fc, doName: doNode.name, daName: a.name },
        };
      });
    }

    if (selection.kind === 'DA' && ld && ln && doNode && attr) {
      const val = resolveLiveAttrValue(srv, ln.lnClass, doNode.fc, doNode.name, attr);
      return [
        {
          key: attr.daPath,
          name: attr.name,
          mmsType: attr.mmsType,
          value: val,
          writable: srv.mode === 'ONLINE' && Boolean(attr.writable),
          checked: attr.mmsType === 'Boolean' ? val.toLowerCase() === 'true' : undefined,
          refPath: attr.daPath,
          enumOptions: attr.enumOptions,
          meta: { iedId: srv.id, ldInst: ld.inst, lnName: ln.name, fc: doNode.fc, doName: doNode.name, daName: attr.name },
        },
        { key: 'da-path', name: 'MMS Reference', mmsType: 'ObjectReference', value: attr.daPath, writable: false },
        { key: 'da-fc', name: 'Functional Constraint', mmsType: 'VisibleString(2)', value: `${doNode.fc} (${FC_DESC[doNode.fc] || doNode.fc})`, writable: false },
      ];
    }

    return [];
  }, [selection, selectedContext, onlineServers, offlineServers, offlineFileName, bays, attrOverrides, rcbEnabled, actSgMap, lastRefreshTick]);

  // Manual MMS Read on currently selected node
  const handleManualRead = () => {
    setLastRefreshTick(Date.now());
    if (!selectedContext || selectedContext.srv.mode !== 'ONLINE') {
      appendLog('Read: Select an Online server node to execute MMS GetDataValues.', 'WARN');
      return;
    }
    const { srv, ld, ln, doNode, attr } = selectedContext;
    const ref = attr
      ? attr.daPath
      : doNode && ld && ln
      ? `${srv.name}${ld.inst}/${ln.name}$${doNode.fc}$${doNode.name}`
      : ln && ld
      ? `${srv.name}${ld.inst}/${ln.name}`
      : srv.name;
    appendLog(`MMS Read (GetDataValues): ${ref} -> Success (${gridRows.length} attribute(s) refreshed)`, 'OK');
  };

  // Copy selected reference path
  const handleCopyRef = () => {
    let ref = '';
    if (selectedContext) {
      const { srv, ld, ln, doNode, attr } = selectedContext;
      ref = attr
        ? attr.daPath
        : doNode && ld && ln
        ? `${srv.name}${ld.inst}/${ln.name}$${doNode.fc}$${doNode.name}`
        : ln && ld
        ? `${srv.name}${ld.inst}/${ln.name}`
        : ld
        ? `${srv.name}${ld.inst}`
        : srv.name;
    }
    if (ref && navigator.clipboard) {
      navigator.clipboard.writeText(ref).catch(() => {});
      appendLog(`Copied reference to clipboard: ${ref}`, 'NORMAL');
    }
  };

  // Helper to check if a TreeSelection matches
  const isSel = (target: TreeSelection) => JSON.stringify(selection) === JSON.stringify(target);

  // Render Server subtree (used for both Online and Offline roots)
  const renderServerSubtree = (servers: IecServerModel[], mode: 'ONLINE' | 'OFFLINE') => {
    return servers.map((srv) => {
      const iedKey = `IED:${mode}:${srv.id}`;
      const iedOpen = Boolean(expanded[iedKey]);
      const iedSel: TreeSelection = { kind: 'IED', mode, iedId: srv.id };
      return (
        <div key={srv.id} className="pl-3.5">
          <div
            onClick={() => setSelection(iedSel)}
            onDoubleClick={() => toggleExpand(iedKey)}
            onContextMenu={(e) => {
              e.preventDefault();
              setSelection(iedSel);
              setContextMenu({ x: e.clientX, y: e.clientY, sel: iedSel });
            }}
            className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
              isSel(iedSel) ? 'iecb-tree-selected' : ''
            }`}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(iedKey);
              }}
              className="iecb-exp-btn"
            >
              {iedOpen ? '−' : '+'}
            </button>
            <NodeIcon kind="IED" />
            <span className="truncate">{srv.name}</span>
            <span className="ml-auto pl-2 text-[10.5px] opacity-65">{srv.ip}</span>
          </div>

          {iedOpen &&
            srv.lds.map((ld) => {
              const ldKey = `LD:${mode}:${srv.id}:${ld.inst}`;
              const ldOpen = Boolean(expanded[ldKey]);
              const ldSel: TreeSelection = { kind: 'LD', mode, iedId: srv.id, ldInst: ld.inst };
              return (
                <div key={ldKey} className="pl-3.5">
                  <div
                    onClick={() => setSelection(ldSel)}
                    onDoubleClick={() => toggleExpand(ldKey)}
                    className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
                      isSel(ldSel) ? 'iecb-tree-selected' : ''
                    }`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(ldKey);
                      }}
                      className="iecb-exp-btn"
                    >
                      {ldOpen ? '−' : '+'}
                    </button>
                    <NodeIcon kind="LD" />
                    <span className="truncate">{`${srv.name}${ld.inst}`}</span>
                  </div>

                  {ldOpen &&
                    ld.lns.map((ln) => {
                      const lnKey = `LN:${mode}:${srv.id}:${ld.inst}:${ln.name}`;
                      const lnOpen = Boolean(expanded[lnKey]);
                      const lnSel: TreeSelection = { kind: 'LN', mode, iedId: srv.id, ldInst: ld.inst, lnName: ln.name };
                      const orderedFcs = FC_ORDER.filter((f) => (ln.fcs[f] || []).length > 0);
                      return (
                        <div key={lnKey} className="pl-3.5">
                          <div
                            onClick={() => setSelection(lnSel)}
                            onDoubleClick={() => toggleExpand(lnKey)}
                            className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
                              isSel(lnSel) ? 'iecb-tree-selected' : ''
                            }`}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleExpand(lnKey);
                              }}
                              className="iecb-exp-btn"
                            >
                              {lnOpen ? '−' : '+'}
                            </button>
                            <NodeIcon kind="LN" />
                            <span className="truncate">{ln.name}</span>
                          </div>

                          {lnOpen &&
                            orderedFcs.map((fc) => {
                              const fcKey = `FC:${mode}:${srv.id}:${ld.inst}:${ln.name}:${fc}`;
                              const fcOpen = Boolean(expanded[fcKey]);
                              const fcSel: TreeSelection = {
                                kind: 'FC',
                                mode,
                                iedId: srv.id,
                                ldInst: ld.inst,
                                lnName: ln.name,
                                fc,
                              };
                              const dos = ln.fcs[fc] || [];
                              return (
                                <div key={fcKey} className="pl-3.5">
                                  <div
                                    onClick={() => setSelection(fcSel)}
                                    onDoubleClick={() => toggleExpand(fcKey)}
                                    className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
                                      isSel(fcSel) ? 'iecb-tree-selected' : ''
                                    }`}
                                  >
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        toggleExpand(fcKey);
                                      }}
                                      className="iecb-exp-btn"
                                    >
                                      {fcOpen ? '−' : '+'}
                                    </button>
                                    <NodeIcon kind="FC" />
                                    <span className="font-semibold">{fc}</span>
                                  </div>

                                  {fcOpen &&
                                    dos.map((d) => {
                                      const doKey = `DO:${mode}:${srv.id}:${ld.inst}:${ln.name}:${fc}:${d.name}`;
                                      const doOpen = Boolean(expanded[doKey]);
                                      const doSel: TreeSelection = {
                                        kind: 'DO',
                                        mode,
                                        iedId: srv.id,
                                        ldInst: ld.inst,
                                        lnName: ln.name,
                                        fc,
                                        doName: d.name,
                                      };
                                      return (
                                        <div key={doKey} className="pl-3.5">
                                          <div
                                            onClick={() => setSelection(doSel)}
                                            onDoubleClick={() => toggleExpand(doKey)}
                                            className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
                                              isSel(doSel) ? 'iecb-tree-selected' : ''
                                            }`}
                                          >
                                            <button
                                              type="button"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                toggleExpand(doKey);
                                              }}
                                              className="iecb-exp-btn"
                                            >
                                              {doOpen ? '−' : '+'}
                                            </button>
                                            <NodeIcon kind="DO" />
                                            <span className="truncate">{d.name}</span>
                                          </div>

                                          {doOpen &&
                                            d.attrs.map((a) => {
                                              const daSel: TreeSelection = {
                                                kind: 'DA',
                                                mode,
                                                iedId: srv.id,
                                                ldInst: ld.inst,
                                                lnName: ln.name,
                                                fc,
                                                doName: d.name,
                                                daName: a.name,
                                              };
                                              return (
                                                <div key={a.daPath} className="pl-6">
                                                  <div
                                                    onClick={() => setSelection(daSel)}
                                                    className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
                                                      isSel(daSel) ? 'iecb-tree-selected' : ''
                                                    }`}
                                                  >
                                                    <NodeIcon kind="DA" />
                                                    <span className="truncate">{a.name}</span>
                                                  </div>
                                                </div>
                                              );
                                            })}
                                        </div>
                                      );
                                    })}
                                </div>
                              );
                            })}
                        </div>
                      );
                    })}
                </div>
              );
            })}
        </div>
      );
    });
  };

  const hasOnline = onlineServers.length > 0;
  const hasDeletable =
    (selection.kind === 'ONLINE_ROOT' && hasOnline) ||
    (selection.kind !== 'ONLINE_ROOT' && selection.kind !== 'OFFLINE_ROOT' && selection.mode === 'ONLINE') ||
    offlineServers.length > 0;

  const showSboControlBar =
    selectedContext &&
    selectedContext.srv.mode === 'ONLINE' &&
    selectedContext.ld &&
    selectedContext.ln &&
    selectedContext.doNode &&
    selectedContext.doNode.fc === 'CO' &&
    selectedContext.doNode.name === 'Pos';

  return (
    <div className="iecbrowser-app -m-2.5 sm:-m-5 xl:-m-6 flex flex-col h-[calc(100vh-114px)] max-h-[calc(100vh-114px)] bg-[#f0f0f0] text-[#000000] border border-[#707070] shadow-lg overflow-hidden" style={{ userSelect: "none", colorScheme: "light" }}>
      {/* Scoped Win32 Light Desktop Theme overrides beating #root & luminous-cyan-theme.css */}
      <style>{`
        #root .iecbrowser-app,
        .iecbrowser-app {
          font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif !important;
          background: #f0f0f0 !important;
          background-color: #f0f0f0 !important;
          color: #000000 !important;
          color-scheme: light !important;
        }
        #root .iecbrowser-app *::-webkit-scrollbar {
          width: 12px !important;
          height: 12px !important;
        }
        #root .iecbrowser-app *::-webkit-scrollbar-track {
          background: #f0f0f0 !important;
        }
        #root .iecbrowser-app *::-webkit-scrollbar-thumb {
          background: #c1c1c1 !important;
          border: 2px solid #f0f0f0 !important;
          border-radius: 0 !important;
        }
        #root .iecbrowser-app *::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8 !important;
        }
        #root .iecbrowser-app button {
          color: #000000 !important;
          font-family: "Segoe UI", Tahoma, sans-serif !important;
          box-shadow: none !important;
        }
        #root .iecbrowser-app input:not([type="checkbox"]):not([type="radio"]),
        #root .sas-workspace-main .iecbrowser-app input:not([type="checkbox"]):not([type="radio"]),
        #root .iecbrowser-app select,
        #root .sas-workspace-main .iecbrowser-app select {
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          border: 1px solid #7a7a7a !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          font-family: "Segoe UI", Tahoma, sans-serif !important;
          color-scheme: light !important;
        }
        #root .iecbrowser-app input::placeholder {
          color: #666666 !important;
          opacity: 1 !important;
        }
        #root .iecbrowser-app input[type="checkbox"] {
          color-scheme: light !important;
          accent-color: #0078d7 !important;
          background-color: #ffffff !important;
          width: 13px !important;
          height: 13px !important;
        }
        #root .iecbrowser-app select option {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        #root .iecbrowser-app .iecb-menubar-btn {
          padding: 2px 7px !important;
          font-size: 12px !important;
          background: transparent !important;
          border: 1px solid transparent !important;
          color: #000000 !important;
          cursor: default;
        }
        #root .iecbrowser-app .iecb-menubar-btn:hover,
        #root .iecbrowser-app .iecb-menubar-btn.active {
          background-color: #cce8ff !important;
          border-color: #99d1ff !important;
        }
        #root .iecbrowser-app .iecb-menu-drop {
          background-color: #f2f2f2 !important;
          border: 1px solid #888888 !important;
          box-shadow: 2px 2px 6px rgba(0,0,0,0.22) !important;
          min-width: 210px;
          z-index: 60;
        }
        #root .iecbrowser-app .iecb-menu-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          text-align: left;
          padding: 4px 14px !important;
          font-size: 12px !important;
          color: #000000 !important;
          background: transparent !important;
          border: none !important;
        }
        #root .iecbrowser-app .iecb-menu-item:hover:not(:disabled) {
          background-color: #91c9f7 !important;
        }
        #root .iecbrowser-app .iecb-menu-item:disabled {
          color: #888888 !important;
        }
        #root .iecbrowser-app .iecb-tb-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-width: 48px;
          padding: 2px 6px !important;
          border: 1px solid transparent !important;
          background: transparent !important;
          font-size: 11px !important;
          line-height: 1.15;
          color: #000000 !important;
        }
        #root .iecbrowser-app .iecb-tb-btn:hover:not(:disabled) {
          background-color: #e5f1fb !important;
          border-color: #0078d7 !important;
        }
        #root .iecbrowser-app .iecb-tb-btn:disabled {
          color: #8c8c8c !important;
          opacity: 0.65;
          cursor: default;
        }
        #root .iecbrowser-app .iecb-win-btn {
          background: #e1e1e1 !important;
          background-color: #e1e1e1 !important;
          border: 1px solid #adadad !important;
          border-radius: 0 !important;
          color: #000000 !important;
          font-size: 11.5px !important;
          padding: 1px 11px !important;
          height: 22px;
        }
        #root .iecbrowser-app .iecb-win-btn:hover {
          background: #e5f1fb !important;
          background-color: #e5f1fb !important;
          border-color: #0078d7 !important;
        }
        #root .iecbrowser-app .iecb-win-btn.pushed {
          background: #cce4f7 !important;
          background-color: #cce4f7 !important;
          border-color: #005499 !important;
          box-shadow: inset 1px 1px 2px rgba(0,0,0,0.18) !important;
        }
        #root .iecbrowser-app .iecb-exp-btn {
          width: 11px !important;
          height: 11px !important;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border: 1px solid #8c8c8c !important;
          background: #ffffff !important;
          color: #222222 !important;
          font-size: 9px !important;
          line-height: 1;
          padding: 0 !important;
          flex-shrink: 0;
        }
        #root .iecbrowser-app .iecb-tree-row {
          color: #000000 !important;
          font-size: 12px;
          line-height: 18px;
        }
        #root .iecbrowser-app .iecb-tree-row:hover {
          background-color: #e5f3ff !important;
        }
        #root .iecbrowser-app .iecb-tree-selected {
          background-color: #99c9ef !important;
          color: #000000 !important;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table,
        #root .iecbrowser-app table {
          width: 100%;
          border-collapse: collapse !important;
          background: #ffffff !important;
          background-color: #ffffff !important;
          color: #000000 !important;
          font-size: 12px !important;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table thead tr,
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table thead th,
        #root .iecbrowser-app table thead th {
          background: #f4f4f4 !important;
          background-color: #f4f4f4 !important;
          color: #111111 !important;
          font-weight: 400 !important;
          text-align: left;
          padding: 2px 6px !important;
          border-bottom: 1px solid #b8b8b8 !important;
          border-right: 1px solid #d4d4d4 !important;
          position: sticky;
          top: 0;
          z-index: 5;
          font-size: 11.5px !important;
          text-transform: none !important;
          letter-spacing: normal !important;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table tbody tr,
        #root .iecbrowser-app table tbody tr {
          background: #ffffff !important;
          background-color: #ffffff !important;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table tbody td,
        #root .iecbrowser-app table tbody td {
          padding: 1px 6px !important;
          border-bottom: 1px solid #ececec !important;
          border-right: 1px solid #e2e2e2 !important;
          color: #000000 !important;
          background-color: #ffffff !important;
          height: 20px;
          vertical-align: middle;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table tbody td.iecb-cell-ro,
        #root .iecbrowser-app table tbody td.iecb-cell-ro {
          background-color: #d6d6d6 !important;
          color: #000000 !important;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table tbody td.iecb-cell-rw,
        #root .iecbrowser-app table tbody td.iecb-cell-rw {
          background-color: #ffffff !important;
          color: #000000 !important;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table tbody tr.iecb-picker-row:hover td,
        #root .iecbrowser-app table tbody tr.iecb-picker-row:hover td {
          background-color: #e5f3ff !important;
          color: #000000 !important;
        }
        #root .sas-app-shell .sas-workspace-main .iecbrowser-app table tbody tr.iecb-picker-active td,
        #root .iecbrowser-app table tbody tr.iecb-picker-active td {
          background-color: #0078d7 !important;
          color: #ffffff !important;
        }
        #root .iecbrowser-app label,
        #root .iecbrowser-app p,
        #root .iecbrowser-app span {
          text-shadow: none !important;
        }
      `}</style>

      {/* Hidden SCL File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".icd,.scd,.cid,.iid,.xml"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* 1. WINDOWS TITLE BAR */}
      <div className="h-[28px] bg-[#ffffff] border-b border-[#e5e5e5] px-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5 text-[12px] text-[#000000]">
          <IecAppIcon />
          <span>
            IEC Browser
            {onlineServers[0] ? ` - ${onlineServers[0].name} (${onlineServers[0].ip})` : ''}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px] text-[#333333] pr-1">
          <span className="px-1.5 hover:bg-[#e5e5e5] cursor-default">─</span>
          <span className="px-1.5 hover:bg-[#e5e5e5] cursor-default">□</span>
          <span className="px-1.5 hover:bg-[#e81123] hover:text-white cursor-default">✕</span>
        </div>
      </div>

      {/* 2. CLASSIC MENU BAR (Server | ICD/SCD | Edit | Action | Extras | Help) */}
      <div
        className="h-[23px] bg-[#ffffff] border-b border-[#dcdcdc] px-1 flex items-center gap-0.5 shrink-0 relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Server */}
        <div className="relative">
          <button
            type="button"
            className={`iecb-menubar-btn ${openMenu === 'Server' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'Server' ? null : 'Server')}
          >
            Server
          </button>
          {openMenu === 'Server' && (
            <div className="iecb-menu-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="iecb-menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  setConnectOpen(true);
                }}
              >
                <span>Connect...</span>
                <span className="text-[10.5px] opacity-60">Ctrl+K</span>
              </button>
              <button
                type="button"
                className="iecb-menu-item"
                disabled={!hasOnline}
                onClick={() => {
                  setOpenMenu(null);
                  handleDisconnect();
                }}
              >
                <span>Disconnect</span>
                <span className="text-[10.5px] opacity-60">Ctrl+D</span>
              </button>
              <button
                type="button"
                className="iecb-menu-item"
                disabled={!autoRefresh}
                onClick={() => {
                  setOpenMenu(null);
                  setAutoRefresh(false);
                  appendLog('Cancelled Auto Refresh.', 'WARN');
                }}
              >
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        {/* ICD/SCD */}
        <div className="relative">
          <button
            type="button"
            className={`iecb-menubar-btn ${openMenu === 'ICD/SCD' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'ICD/SCD' ? null : 'ICD/SCD')}
          >
            ICD/SCD
          </button>
          {openMenu === 'ICD/SCD' && (
            <div className="iecb-menu-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="iecb-menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  fileInputRef.current?.click();
                }}
              >
                <span>Open ICD/SCD/CID File...</span>
                <span className="text-[10.5px] opacity-60">Ctrl+O</span>
              </button>
              <button
                type="button"
                className="iecb-menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  handleLoadBuiltInScd();
                }}
              >
                <span>Load Live Substation SCD (Offline)</span>
              </button>
              <div className="my-0.5 border-t border-[#d4d4d4]" />
              <button
                type="button"
                className="iecb-menu-item"
                disabled={offlineServers.length === 0}
                onClick={() => {
                  setOpenMenu(null);
                  setOfflineServers([]);
                  setOfflineFileName('');
                  setSelection({ kind: 'OFFLINE_ROOT' });
                  appendLog('Closed Offline station.', 'WARN');
                }}
              >
                <span>Close Offline Station</span>
              </button>
            </div>
          )}
        </div>

        {/* Edit */}
        <div className="relative">
          <button
            type="button"
            className={`iecb-menubar-btn ${openMenu === 'Edit' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'Edit' ? null : 'Edit')}
          >
            Edit
          </button>
          {openMenu === 'Edit' && (
            <div className="iecb-menu-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="iecb-menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  handleCopyRef();
                }}
              >
                <span>Copy MMS Reference</span>
                <span className="text-[10.5px] opacity-60">Ctrl+C</span>
              </button>
              <button
                type="button"
                className="iecb-menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  setLogs(IEC_VERSION_BANNER);
                }}
              >
                <span>Clear Output Log</span>
              </button>
            </div>
          )}
        </div>

        {/* Action */}
        <div className="relative">
          <button
            type="button"
            className={`iecb-menubar-btn ${openMenu === 'Action' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'Action' ? null : 'Action')}
          >
            Action
          </button>
          {openMenu === 'Action' && (
            <div className="iecb-menu-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="iecb-menu-item"
                disabled={!hasOnline}
                onClick={() => {
                  setOpenMenu(null);
                  handleManualRead();
                }}
              >
                <span>Read (GetDataValues)</span>
                <span className="text-[10.5px] opacity-60">F5</span>
              </button>
              <button
                type="button"
                className="iecb-menu-item"
                disabled={!hasOnline}
                onClick={() => {
                  setOpenMenu(null);
                  const srv = onlineServers[0];
                  if (srv?.storeIedId) triggerMmsGeneralInterrogation(srv.storeIedId);
                  appendLog(`Action -> General Interrogation (GI) sent to ${srv?.name || 'active IED'}.`, 'REPORT');
                }}
              >
                <span>Trigger General Interrogation (GI)</span>
              </button>
            </div>
          )}
        </div>

        {/* Extras */}
        <div className="relative">
          <button
            type="button"
            className={`iecb-menubar-btn ${openMenu === 'Extras' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'Extras' ? null : 'Extras')}
          >
            Extras
          </button>
          {openMenu === 'Extras' && (
            <div className="iecb-menu-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="iecb-menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  setAutoRefresh((v) => !v);
                }}
              >
                <span>{autoRefresh ? '✓ Auto Refresh Enabled' : 'Enable Auto Refresh'}</span>
              </button>
              <div className="my-0.5 border-t border-[#d4d4d4]" />
              {[1000, 1500, 3000].map((ms) => (
                <button
                  key={ms}
                  type="button"
                  className="iecb-menu-item"
                  onClick={() => {
                    setOpenMenu(null);
                    setPollMs(ms);
                    appendLog(`Auto Refresh poll cycle set to ${ms} ms.`, 'NORMAL');
                  }}
                >
                  <span>{pollMs === ms ? `✓ Poll Interval: ${ms} ms` : `Poll Interval: ${ms} ms`}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Help */}
        <div className="relative">
          <button
            type="button"
            className={`iecb-menubar-btn ${openMenu === 'Help' ? 'active' : ''}`}
            onClick={() => setOpenMenu(openMenu === 'Help' ? null : 'Help')}
          >
            Help
          </button>
          {openMenu === 'Help' && (
            <div className="iecb-menu-drop absolute left-0 top-full py-0.5">
              <button
                type="button"
                className="iecb-menu-item"
                onClick={() => {
                  setOpenMenu(null);
                  setAboutOpen(true);
                }}
              >
                <span>About IEC Browser V02.21...</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 3. CLASSIC ICON TOOLBAR (Connect | Disconnect | Cancel | Delete | [Go to Input] | Go to | Auto Refresh) */}
      <div className="bg-[#f0f0f0] border-b border-[#a0a0a0] px-1.5 py-1 flex flex-wrap items-center gap-1 shrink-0">
        {/* Connect */}
        <button
          type="button"
          className="iecb-tb-btn"
          onClick={() => setConnectOpen(true)}
          title="Connect to IEC 61850 MMS Server (Port 102)"
        >
          <svg width="20" height="18" viewBox="0 0 20 18" className="mb-0.5">
            <rect x="4" y="1.5" width="12" height="10" rx="1" fill="#e2e8f0" stroke="#334155" strokeWidth="1.2" />
            <rect x="6" y="3.5" width="8" height="6" fill="#0ea5e9" />
            <path d="M10 11.5 V16 M6 16 H14" stroke="#15803d" strokeWidth="1.6" />
          </svg>
          <span>Connect</span>
        </button>

        {/* Disconnect */}
        <button
          type="button"
          className="iecb-tb-btn"
          disabled={!hasOnline}
          onClick={handleDisconnect}
          title="Disconnect active MMS client"
        >
          <svg width="20" height="18" viewBox="0 0 20 18" className="mb-0.5">
            <rect x="4" y="1.5" width="12" height="10" rx="1" fill="#e2e8f0" stroke="#64748b" strokeWidth="1.2" />
            <path d="M7 4.5 L13 9.5 M13 4.5 L7 9.5" stroke="#dc2626" strokeWidth="1.5" />
            <path d="M10 11.5 V16 M6 16 H14" stroke="#64748b" strokeWidth="1.4" />
          </svg>
          <span>Disconnect</span>
        </button>

        {/* Cancel */}
        <button
          type="button"
          className="iecb-tb-btn"
          disabled={!autoRefresh && !sboSelectedRef}
          onClick={() => {
            setAutoRefresh(false);
            setSboSelectedRef(null);
            appendLog('Operation / Auto Refresh cancelled.', 'WARN');
          }}
          title="Cancel active operation or Auto Refresh"
        >
          <svg width="20" height="18" viewBox="0 0 20 18" className="mb-0.5">
            <rect x="5" y="2" width="10" height="13" rx="1" fill="#e5e7eb" stroke="#6b7280" strokeWidth="1.2" />
            <line x1="10" y1="5" x2="10" y2="10" stroke="#4b5563" strokeWidth="1.8" />
            <circle cx="10" cy="12.5" r="1" fill="#4b5563" />
          </svg>
          <span>Cancel</span>
        </button>

        {/* Delete */}
        <button
          type="button"
          className="iecb-tb-btn"
          disabled={!hasDeletable}
          onClick={handleDeleteSelected}
          title="Remove selected Online client or close Offline station"
        >
          <svg width="20" height="18" viewBox="0 0 20 18" className="mb-0.5">
            <rect x="4" y="2" width="11" height="13" fill="#ffffff" stroke="#334155" strokeWidth="1.2" />
            <path d="M6 4.5 L13 12.5 M13 4.5 L6 12.5" stroke="#dc2626" strokeWidth="1.8" />
          </svg>
          <span>Delete</span>
        </button>

        <div className="w-[1px] h-7 bg-[#c8c8c8] mx-1" />

        {/* Go to Search Box */}
        <form onSubmit={handleGoto} className="flex items-center gap-1.5">
          <input
            type="text"
            value={gotoQuery}
            onChange={(e) => setGotoQuery(e.target.value)}
            placeholder="e.g. XCBR1, Pos, brcb01, MMXU1"
            className="h-[22px] w-[200px] sm:w-[270px] border border-[#7a7a7a] px-1.5 text-[12px] outline-none focus:border-[#0078d7]"
          />
          <button type="submit" className="iecb-win-btn">
            Go to
          </button>
        </form>

        {/* Auto Refresh */}
        <button
          type="button"
          className={`iecb-win-btn ml-1 ${autoRefresh ? 'pushed' : ''}`}
          onClick={() => {
            if (!hasOnline) {
              appendLog('Auto Refresh: Connect to an Online IED first.', 'WARN');
              return;
            }
            const next = !autoRefresh;
            setAutoRefresh(next);
            appendLog(next ? `Auto Refresh started (${pollMs} ms cycle).` : 'Auto Refresh stopped.', 'NORMAL');
          }}
        >
          Auto Refresh
        </button>
      </div>

      {/* 4. MAIN 3-PANE SPLIT WORKSPACE */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* LEFT PANE: IEC 61850 TREE */}
        <div className="w-[240px] sm:w-[295px] shrink-0 bg-[#ffffff] border-r-[3px] border-[#d0d0d0] flex flex-col overflow-hidden">
          {/* Tree Column Header */}
          <div className="h-[21px] bg-[#f4f4f4] border-b border-[#b8b8b8] flex items-center text-[11.5px] text-[#222222] shrink-0">
            <div className="flex-1 px-1.5 border-r border-[#d4d4d4] flex items-center justify-between">
              <span>Name</span>
              <span className="text-[9px] text-[#444444]">▲</span>
            </div>
            <div className="w-[34px] px-1 truncate" title="Description / Domain">
              D...
            </div>
          </div>

          {/* Tree Body */}
          <div className="flex-1 overflow-auto py-0.5 px-0.5 bg-[#ffffff]">
            {/* Root 1: Online */}
            <div>
              <div
                onClick={() => setSelection({ kind: 'ONLINE_ROOT' })}
                onDoubleClick={() => (hasOnline ? toggleExpand('ONLINE_ROOT') : setConnectOpen(true))}
                className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
                  isSel({ kind: 'ONLINE_ROOT' }) ? 'iecb-tree-selected' : ''
                }`}
              >
                {hasOnline ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand('ONLINE_ROOT');
                    }}
                    className="iecb-exp-btn"
                  >
                    {expanded.ONLINE_ROOT ? '−' : '+'}
                  </button>
                ) : (
                  <span className="w-[11px] inline-block shrink-0" />
                )}
                <OnlineClientIcon active={hasOnline} />
                <span className="truncate">
                  {hasOnline
                    ? `Online: ${onlineServers.length === 1 ? onlineServers[0].name : `${onlineServers.length} clients`}`
                    : 'Online: No active client'}
                </span>
              </div>
              {hasOnline && expanded.ONLINE_ROOT && renderServerSubtree(onlineServers, 'ONLINE')}
            </div>

            {/* Root 2: Offline */}
            <div className="mt-[1px]">
              <div
                onClick={() => setSelection({ kind: 'OFFLINE_ROOT' })}
                onDoubleClick={() => (offlineServers.length > 0 ? toggleExpand('OFFLINE_ROOT') : fileInputRef.current?.click())}
                className={`iecb-tree-row flex items-center gap-1 px-1 py-[1px] cursor-pointer whitespace-nowrap ${
                  isSel({ kind: 'OFFLINE_ROOT' }) ? 'iecb-tree-selected' : ''
                }`}
              >
                {offlineServers.length > 0 ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleExpand('OFFLINE_ROOT');
                    }}
                    className="iecb-exp-btn"
                  >
                    {expanded.OFFLINE_ROOT ? '−' : '+'}
                  </button>
                ) : (
                  <span className="w-[11px] inline-block shrink-0" />
                )}
                <OfflineStationIcon />
                <span className="truncate">
                  {offlineFileName ? `Offline: ${offlineFileName}` : 'Offline: No open station'}
                </span>
              </div>
              {offlineServers.length > 0 && expanded.OFFLINE_ROOT && renderServerSubtree(offlineServers, 'OFFLINE')}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: TOP ATTRIBUTE GRID + BOTTOM LOG PANE */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-[#ffffff]">
          {/* Optional SBO Control Bar when Online CO$Pos is selected */}
          {showSboControlBar && selectedContext?.srv && selectedContext.ld && selectedContext.ln && (
            <div className="bg-[#f4f7fb] border-b border-[#b8c4d4] px-2 py-1 flex flex-wrap items-center gap-2 text-[11.5px] shrink-0">
              <span className="font-semibold text-[#0f3d7a]">
                MMS Control ({selectedContext.srv.name}{selectedContext.ld.inst}/{selectedContext.ln.name}$CO$Pos):
              </span>
              <select
                value={sboTargetVal}
                onChange={(e) => setSboTargetVal(e.target.value as 'OPEN' | 'CLOSED')}
                className="h-[21px] border border-[#7a7a7a] px-1 text-[11.5px]"
              >
                <option value="OPEN">OPEN (ctlVal = false)</option>
                <option value="CLOSED">CLOSE (ctlVal = true)</option>
              </select>
              <button
                type="button"
                className="iecb-win-btn"
                onClick={() => handleSboAction('SELECT', selectedContext.srv, selectedContext.ld!.inst, selectedContext.ln!.name)}
              >
                1. Select (SBOw)
              </button>
              <button
                type="button"
                className="iecb-win-btn"
                onClick={() => handleSboAction('OPERATE', selectedContext.srv, selectedContext.ld!.inst, selectedContext.ln!.name)}
              >
                2. Operate
              </button>
              <button
                type="button"
                className="iecb-win-btn"
                onClick={() => handleSboAction('CANCEL', selectedContext.srv, selectedContext.ld!.inst, selectedContext.ln!.name)}
              >
                Cancel
              </button>
              {sboSelectedRef === `${selectedContext.srv.id}/Pos` && (
                <span className="text-[#15803d] font-semibold">● Selected ({sboTargetVal})</span>
              )}
            </div>
          )}

          {/* RIGHT TOP PANE: ATTRIBUTE / VALUE TABLE */}
          <div className="flex-1 overflow-auto bg-[#ffffff]">
            <table className="iecb-grid">
              <thead>
                <tr>
                  <th style={{ width: '24%' }}>Name</th>
                  <th style={{ width: '17%' }}>Type(Len[arr])</th>
                  <th style={{ width: '52%' }}>Value</th>
                  <th style={{ width: '7%', textAlign: 'center' }}>Write</th>
                </tr>
              </thead>
              <tbody>
                {gridRows.map((row) => {
                  const isEditing = editingKey === row.key;
                  const cellCls = row.writable ? 'iecb-cell-rw' : 'iecb-cell-ro';
                  return (
                    <tr key={row.key}>
                      <td className="bg-[#ffffff] font-normal">{row.name}</td>
                      <td className="bg-[#ffffff] text-[#333333]">{row.mmsType}</td>
                      <td
                        className={cellCls}
                        onDoubleClick={() => {
                          if (!row.writable) return;
                          setEditingKey(row.key);
                          setEditingVal(row.value);
                        }}
                      >
                        {isEditing ? (
                          <div className="flex items-center gap-1">
                            {row.enumOptions ? (
                              <select
                                autoFocus
                                value={editingVal}
                                onChange={(e) => setEditingVal(e.target.value)}
                                className="h-[19px] border border-[#0078d7] text-[11.5px] px-1"
                              >
                                {row.enumOptions.map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                autoFocus
                                type="text"
                                value={editingVal}
                                onChange={(e) => setEditingVal(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    executeMmsWrite(row, editingVal);
                                    setEditingKey(null);
                                  } else if (e.key === 'Escape') {
                                    setEditingKey(null);
                                  }
                                }}
                                className="h-[19px] flex-1 border border-[#0078d7] text-[11.5px] px-1"
                              />
                            )}
                            <button
                              type="button"
                              className="iecb-win-btn !h-[19px] !px-2 !text-[10.5px]"
                              onClick={() => {
                                executeMmsWrite(row, editingVal);
                                setEditingKey(null);
                              }}
                            >
                              Write
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate">{row.value}</span>
                            {row.writable && (
                              <span className="text-[10px] text-[#0369a1] opacity-75 shrink-0">
                                (double-click or tick Write)
                              </span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className={`${cellCls} text-center`}>
                        <input
                          type="checkbox"
                          disabled={!row.writable}
                          checked={row.mmsType === 'Boolean' ? Boolean(row.checked) : isEditing}
                          onChange={(e) => {
                            if (!row.writable) return;
                            if (row.mmsType === 'Boolean') {
                              executeMmsWrite(row, String(e.target.checked));
                            } else {
                              setEditingKey(row.key);
                              setEditingVal(row.value);
                            }
                          }}
                          className="align-middle cursor-pointer disabled:cursor-default"
                          title={row.writable ? 'Write value via MMS SetDataValues' : 'Read-only attribute'}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* RIGHT BOTTOM PANE: LOG / OUTPUT CONSOLE */}
          <div ref={logPaneRef} className="h-[155px] sm:h-[175px] shrink-0 bg-[#efefef] border-t-[3px] border-[#a0a0a0] overflow-auto px-1.5 py-1 font-mono text-[11.5px] leading-[1.35]">
            {logs.map((entry) => (
              <div
                key={entry.id}
                className="whitespace-pre-wrap break-words"
                style={{
                  color:
                    entry.kind === 'ERR'
                      ? '#b91c1c'
                      : entry.kind === 'WARN'
                      ? '#92400e'
                      : entry.kind === 'OK'
                      ? '#14532d'
                      : entry.kind === 'REPORT'
                      ? '#1d4ed8'
                      : '#111111',
                }}
              >
                {entry.text}
              </div>
            ))}

          </div>
        </div>
      </div>

      {/* CONTEXT MENU */}
      {contextMenu && (
        <div
          className="iecb-menu-drop fixed py-0.5"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            className="iecb-menu-item"
            onClick={() => {
              setContextMenu(null);
              handleManualRead();
            }}
          >
            <span>Read (GetDataValues)</span>
          </button>
          <button
            type="button"
            className="iecb-menu-item"
            onClick={() => {
              setContextMenu(null);
              handleCopyRef();
            }}
          >
            <span>Copy MMS Reference</span>
          </button>
          <button
            type="button"
            className="iecb-menu-item"
            onClick={() => {
              setContextMenu(null);
              handleDeleteSelected();
            }}
          >
            <span>Disconnect / Remove</span>
          </button>
        </div>
      )}

      {/* CONNECT TO SERVER DIALOG (Win32 Classic Modal) */}
      {connectOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[500px] bg-[#f0f0f0] border border-[#555555] shadow-xl text-[12px] text-[#000000]">
            <div className="h-[28px] bg-[#ffffff] border-b border-[#cccccc] px-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-normal">
                <IecAppIcon />
                <span>Connect to IEC 61850 Server</span>
              </div>
              <button
                type="button"
                onClick={() => setConnectOpen(false)}
                className="px-2 hover:bg-[#e81123] hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-3 space-y-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <label className="text-[12px]">Server IP Address:</label>
                <input
                  type="text"
                  value={connectIp}
                  onChange={(e) => setConnectIp(e.target.value)}
                  className="col-span-2 h-[22px] border border-[#7a7a7a] px-1.5 text-[12px]"
                />
                <label className="text-[12px]">MMS TCP Port:</label>
                <input
                  type="text"
                  value={connectPort}
                  onChange={(e) => setConnectPort(e.target.value)}
                  className="col-span-2 h-[22px] border border-[#7a7a7a] px-1.5 text-[12px]"
                />
              </div>

              <div className="border border-[#c0c0c0] bg-[#ffffff]">
                <div className="bg-[#f4f4f4] border-b border-[#c0c0c0] px-2 py-1 text-[11px] font-semibold">
                  Available Substation IEDs (Station Bus LAN-A)
                </div>
                <div className="max-h-[170px] overflow-auto">
                  <table className="w-full text-[11.5px] border-collapse">
                    <thead>
                      <tr className="bg-[#f9f9f9] border-b border-[#dcdcdc] text-left">
                        <th className="px-2 py-1 font-normal">IED Name</th>
                        <th className="px-2 py-1 font-normal">Vendor / Model</th>
                        <th className="px-2 py-1 font-normal">IP Address</th>
                      </tr>
                    </thead>
                    <tbody>
                      {storeIeds.map((ied) => {
                        const active = selectedConnectIedId === ied.id;
                        return (
                          <tr
                            key={ied.id}
                            onClick={() => {
                              setSelectedConnectIedId(ied.id);
                              setConnectIp(ied.ipAddressLanA);
                            }}
                            onDoubleClick={() => {
                              setSelectedConnectIedId(ied.id);
                              setConnectIp(ied.ipAddressLanA);
                              handleConnect(ied.id);
                            }}
                            className={`cursor-pointer border-b border-[#f0f0f0] iecb-picker-row ${
                              active ? 'iecb-picker-active' : ''
                            }`}
                          >
                            <td className="px-2 py-1 font-medium">{ied.name}</td>
                            <td className="px-2 py-1">{`${ied.vendor} ${ied.model}`}</td>
                            <td className="px-2 py-1 font-mono">{ied.ipAddressLanA}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" className="iecb-win-btn min-w-[76px]" onClick={() => handleConnect()}>
                  Connect
                </button>
                <button type="button" className="iecb-win-btn min-w-[76px]" onClick={() => setConnectOpen(false)}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ABOUT DIALOG */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 bg-black/35 flex items-center justify-center p-3">
          <div className="w-full max-w-[360px] bg-[#f0f0f0] border border-[#555555] shadow-xl text-[12px] text-[#000000]">
            <div className="h-[26px] bg-[#ffffff] border-b border-[#cccccc] px-2 flex items-center justify-between">
              <span>About IEC Browser</span>
              <button type="button" onClick={() => setAboutOpen(false)} className="px-1.5 hover:bg-[#e81123] hover:text-white">
                ✕
              </button>
            </div>
            <div className="p-3.5 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-[13px]">
                <IecAppIcon />
                <span>IEC Browser V02.21 (2.21.4)</span>
              </div>
              <div className="font-mono text-[11px] bg-[#ffffff] border border-[#c0c0c0] p-2 space-y-0.5">
                <div>Iec_Browser Version:      2.21.4</div>
                <div>Mms2Iec Version:          2.21.4</div>
                <div>Iec2Mms Version:          2.21.4</div>
                <div>Report Client Version:    2.21.4</div>
              </div>
              <p className="text-[11.5px] text-[#333333]">
                IEC 61850 MMS Client, Report Client (BRCB/URCB + GI), SBOw Control & Offline ICD/SCD/CID Station Browser.
              </p>
              <div className="flex justify-end">
                <button type="button" className="iecb-win-btn min-w-[70px]" onClick={() => setAboutOpen(false)}>
                  OK
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IecBrowserTool;
