import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Database,
  Download,
  FileCode2,
  FolderOpen,
  HelpCircle,
  Info,
  Pause,
  Play,
  Plus,
  Radio,
  RefreshCw,
  Save,
  Search,
  Settings,
  Sliders,
  Square,
  Trash2,
  Wifi,
  X,
  Zap,
} from 'lucide-react';
import { useSubstationStore } from '../../simulation/useSubstationStore';

type MainTab = 'FILE' | 'BROWSER' | 'SIMULATOR' | 'SNIFFER';
type TreeSelection =
  | { kind: 'GOOSE'; ldInst: string; name: string }
  | { kind: 'REPORT'; ldInst: string; lnName: string; name?: string }
  | { kind: 'SG'; ldInst: string }
  | { kind: 'FILES' }
  | { kind: 'DATASET'; ldInst: string; lnName: string; name: string }
  | { kind: 'LN'; ldInst: string; lnName: string };

interface SclDaChild {
  name: string;
  value?: string;
  children?: SclDaChild[];
}

interface SclDa {
  name: string;
  fc: string;
  bType: string;
  value: string;
  children?: SclDaChild[];
}

const IEC_LN_CLASS_DESC: Record<string, string> = {
  LLN0: 'Logical node zero',
  LPHD: 'Physical device information',
  GGIO: 'Generic process I/O',
  XCBR: 'Circuit breaker',
  XSWI: 'Circuit switch',
  CSWI: 'Switch controller',
  CILO: 'Interlocking',
  PTRC: 'Protection trip conditioning',
  PTOC: 'Time overcurrent',
  PIOC: 'Instantaneous overcurrent',
  PDIF: 'Differential',
  PDIS: 'Distance',
  PTOV: 'Overvoltage',
  PTUV: 'Undervoltage',
  PTOF: 'Overfrequency',
  PTUF: 'Underfrequency',
  PTEF: 'Transient earth fault',
  PFRC: 'Rate of change of frequency',
  RBRF: 'Breaker failure',
  RREC: 'Autoreclosing',
  RSYN: 'Synchronism-check',
  RFLO: 'Fault locator',
  RDRE: 'Disturbance recorder function',
  MMXU: 'Measurement',
  MMTR: 'Metering',
  MSQI: 'Sequence and imbalance',
  MHAI: 'Harmonics or interharmonics',
  SIMG: 'Insulation medium supervision (gas)',
  SIML: 'Insulation medium supervision (liquid)',
  ATCC: 'Automatic tap changer controller',
  YLTC: 'Tap changer',
  YPTR: 'Power transformer',
  TCTR: 'Current transformer',
  TVTR: 'Voltage transformer',
  GAPC: 'Generic automatic process control',
  CALH: 'Alarm handling',
};

function buildQualityChildren(): SclDaChild[] {
  return [
    { name: 'Validity' },
    {
      name: 'Quality Details',
      children: [
        { name: 'Overflow' },
        { name: 'OutOfRange' },
        { name: 'BadReference' },
        { name: 'Oscillatory' },
        { name: 'Failure' },
        { name: 'OldData' },
        { name: 'Inconsistent' },
        { name: 'Inaccurate' },
      ],
    },
    { name: 'Source' },
    { name: 'Test' },
    { name: 'OperatorBlocked' },
  ];
}

function buildTimestampChildren(): SclDaChild[] {
  return [
    { name: 'LeapSecondsKnown' },
    { name: 'ClockFailure' },
    { name: 'ClockNotSynchronized' },
    { name: 'TimeAccuracy' },
  ];
}

interface SclDo {
  name: string;
  cdc: string;
  desc: string;
  value: string;
  das: SclDa[];
}

interface SclLn {
  ldInst: string;
  name: string; // e.g. LLN0, PSARGGIO1, XCBR1
  lnClass: string;
  desc: string;
  dos: SclDo[];
}

interface SclDataSet {
  ldInst: string;
  lnName: string;
  name: string;
  desc: string;
  fcdas: string[];
}

interface SclReport {
  ldInst: string;
  lnName: string;
  name: string;
  rptId: string;
  datSet: string;
  buffered: boolean;
  intgPd: number;
  confRev: number;
  enabled: boolean;
}

interface SclGoose {
  ldInst: string;
  lnName: string;
  name: string;
  appId: string;
  datSet: string;
  confRev: number;
  mac: string;
  vlanId: number;
  vlanPrio: number;
  minTime: number;
  maxTime: number;
  stNum: number;
  sqNum: number;
}

interface SclSettingGroup {
  ldInst: string;
  numOfSGs: number;
  actSG: number;
}

interface ParsedIedModel {
  id: string;
  name: string;
  manufacturer: string;
  type: string;
  ip: string;
  sclPath: string;
  bayId?: string;
  isFromStore?: boolean;
  lds: string[];
  lns: SclLn[];
  datasets: SclDataSet[];
  reports: SclReport[];
  gooses: SclGoose[];
  settingGroups: SclSettingGroup[];
  rawXml?: string;
}

interface MonitoredItem {
  key: string;
  ref: string;
  fc: string;
  value: string;
  quality: string;
  updatedAt: string;
}

interface SnifferMessage {
  id: number;
  time: string;
  relSec: string;
  source: string;
  destination: string;
  category: 'GOOSE' | 'RETRANS' | 'REPORT' | 'CS' | 'ERROR';
  description: string;
  details: string[];
}

interface StatusEntry {
  id: number;
  time: string;
  level: 'INFO' | 'WARN' | 'ERR';
  text: string;
}

function fmtTime(d = new Date()): string {
  const p = (n: number, w = 2) => String(n).padStart(w, '0');
  return `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}.${p(d.getMilliseconds(), 3)}`;
}

// Parse real IEC 61850-6 SCL XML (.cid / .icd / .scd / .iid) including DataTypeTemplates & DOI/SDI/DAI
function parseRealSclXml(fileName: string, xmlText: string): ParsedIedModel[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlText, 'application/xml');
  const err = doc.querySelector('parsererror');
  if (err) {
    throw new Error(`XML Parse Error in ${fileName}: ${err.textContent?.slice(0, 120) || 'Malformed XML'}`);
  }

  // 1. Index DataTypeTemplates (LNodeType -> DO -> DOType -> DA)
  const daTypes = new Map<string, Array<{ name: string; bType: string }>>();
  Array.from(doc.querySelectorAll('DataTypeTemplates > DAType')).forEach((dt) => {
    const id = dt.getAttribute('id') || '';
    const bdas = Array.from(dt.querySelectorAll(':scope > BDA')).map((b) => ({
      name: b.getAttribute('name') || '',
      bType: b.getAttribute('bType') || 'VisString',
    }));
    if (id) daTypes.set(id, bdas);
  });

  const doTypes = new Map<string, { cdc: string; das: Array<{ name: string; fc: string; bType: string; type: string }> }>();
  Array.from(doc.querySelectorAll('DataTypeTemplates > DOType')).forEach((dt) => {
    const id = dt.getAttribute('id') || '';
    const cdc = dt.getAttribute('cdc') || 'SPS';
    const das = Array.from(dt.querySelectorAll(':scope > DA')).map((da) => ({
      name: da.getAttribute('name') || '',
      fc: da.getAttribute('fc') || 'ST',
      bType: da.getAttribute('bType') || 'BOOLEAN',
      type: da.getAttribute('type') || '',
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

  // 2. Index Communication (ConnectedAP IP & GSE parameters)
  const ipMap = new Map<string, string>();
  const gseMap = new Map<string, { mac: string; appId: string; vlanId: number; vlanPrio: number; minTime: number; maxTime: number }>();

  Array.from(doc.querySelectorAll('ConnectedAP')).forEach((cap) => {
    const iedName = cap.getAttribute('iedName') || '';
    const ip = cap.querySelector('Address > P[type="IP"]')?.textContent?.trim();
    if (iedName && ip && !ipMap.has(iedName)) ipMap.set(iedName, ip);

    Array.from(cap.querySelectorAll('GSE')).forEach((gse) => {
      const ldInst = gse.getAttribute('ldInst') || '';
      const cbName = gse.getAttribute('cbName') || '';
      const mac = gse.querySelector('Address > P[type="MAC-Address"]')?.textContent?.trim() || '01-0C-CD-01-00-01';
      const rawApp = gse.querySelector('Address > P[type="APPID"]')?.textContent?.trim() || '0001';
      const appId = rawApp.toLowerCase().startsWith('0x') ? rawApp : `0x${rawApp.padStart(4, '0')}`;
      const rawVlan = gse.querySelector('Address > P[type="VLAN-ID"]')?.textContent?.trim() || '0';
      const vlanId = /^[0-9A-Fa-f]+$/.test(rawVlan) && rawVlan.length <= 3 ? parseInt(rawVlan, 16) || 0 : Number(rawVlan) || 0;
      const vlanPrio = Number(gse.querySelector('Address > P[type="VLAN-PRIORITY"]')?.textContent?.trim() || '4');
      const minTime = Number(gse.querySelector('MinTime')?.textContent?.trim() || '4');
      const maxTime = Number(gse.querySelector('MaxTime')?.textContent?.trim() || '1000');
      gseMap.set(`${iedName}/${ldInst}/${cbName}`, { mac, appId, vlanId, vlanPrio, minTime, maxTime });
    });
  });

  // 3. Parse every <IED>
  const result: ParsedIedModel[] = [];
  Array.from(doc.querySelectorAll('IED')).forEach((iedEl, iedIdx) => {
    const iedName = iedEl.getAttribute('name') || `IED_${iedIdx + 1}`;
    const manufacturer = iedEl.getAttribute('manufacturer') || '';
    const type = iedEl.getAttribute('type') || '';
    const ip = ipMap.get(iedName) || '0.0.0.0';

    const lds: string[] = [];
    const lns: SclLn[] = [];
    const datasets: SclDataSet[] = [];
    const reports: SclReport[] = [];
    const gooses: SclGoose[] = [];
    const settingGroups: SclSettingGroup[] = [];

    Array.from(iedEl.querySelectorAll('LDevice')).forEach((ldEl) => {
      const ldInst = ldEl.getAttribute('inst') || 'LD0';
      lds.push(ldInst);

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
        const lnDesc =
          lnEl.getAttribute('desc') ||
          IEC_LN_CLASS_DESC[lnClass.toUpperCase()] ||
          `${lnName} (${lnClass})`;

        // SettingControl inside LN0
        const sgEl = lnEl.querySelector(':scope > SettingControl');
        if (sgEl) {
          settingGroups.push({
            ldInst,
            numOfSGs: Number(sgEl.getAttribute('numOfSGs') || '4'),
            actSG: Number(sgEl.getAttribute('actSG') || '1'),
          });
        }

        // DataSets inside LN0/LN
        Array.from(lnEl.querySelectorAll(':scope > DataSet')).forEach((dsEl) => {
          const dsName = dsEl.getAttribute('name') || 'Dataset1';
          const fcdas = Array.from(dsEl.querySelectorAll('FCDA')).map((f) => {
            const fLd = f.getAttribute('ldInst') || ldInst;
            const fPre = f.getAttribute('prefix') || '';
            const fCls = f.getAttribute('lnClass') || '';
            const fInst = f.getAttribute('lnInst') || '';
            const fDo = f.getAttribute('doName') || '';
            const fDa = f.getAttribute('daName') || '';
            const fFc = f.getAttribute('fc') || 'ST';
            return `${fLd}/${fPre}${fCls}${fInst}.${fDo}${fDa ? '.' + fDa : ''} [${fFc}]`;
          });
          datasets.push({
            ldInst,
            lnName,
            name: dsName,
            desc: dsEl.getAttribute('desc') || '',
            fcdas,
          });
        });

        // ReportControls inside LN0/LN
        Array.from(lnEl.querySelectorAll(':scope > ReportControl')).forEach((rcEl, idx) => {
          const rcName = rcEl.getAttribute('name') || `rcb${idx + 1}`;
          reports.push({
            ldInst,
            lnName,
            name: rcName,
            rptId: rcEl.getAttribute('rptID') || `${iedName}${ldInst}/${lnName}$${rcName}`,
            datSet: rcEl.getAttribute('datSet') || '',
            buffered: rcEl.getAttribute('buffered') !== 'false',
            intgPd: Number(rcEl.getAttribute('intgPd') || '5000'),
            confRev: Number(rcEl.getAttribute('confRev') || '1'),
            enabled: false,
          });
        });

        // GSEControls inside LN0
        Array.from(lnEl.querySelectorAll(':scope > GSEControl')).forEach((gcEl, idx) => {
          const gcName = gcEl.getAttribute('name') || `gcb${idx + 1}`;
          const comm = gseMap.get(`${iedName}/${ldInst}/${gcName}`);
          const rawApp = gcEl.getAttribute('appID') || comm?.appId || `0x${(idx + 1).toString(16).padStart(4, '0')}`;
          const appId = rawApp.toLowerCase().startsWith('0x') ? rawApp : `0x${rawApp}`;
          gooses.push({
            ldInst,
            lnName,
            name: gcName,
            appId,
            datSet: gcEl.getAttribute('datSet') || '',
            confRev: Number(gcEl.getAttribute('confRev') || '1'),
            mac: comm?.mac || '01-0C-CD-01-00-01',
            vlanId: comm?.vlanId ?? 0,
            vlanPrio: comm?.vlanPrio ?? 4,
            minTime: comm?.minTime ?? 4,
            maxTime: comm?.maxTime ?? 1000,
            stNum: 1,
            sqNum: 0,
          });
        });

        // Build DOs from DataTypeTemplates + DOI/SDI/DAI values
        const templateDos = lNodeTypes.get(lnType) || [];
        const doiMap = new Map<string, Element>();
        Array.from(lnEl.querySelectorAll(':scope > DOI')).forEach((doi) => {
          const n = doi.getAttribute('name') || '';
          if (n) doiMap.set(n, doi);
        });

        const doNames = new Set<string>([...templateDos.map((d) => d.name), ...Array.from(doiMap.keys())]);
        const dos: SclDo[] = [];

        doNames.forEach((doName) => {
          const tpl = templateDos.find((d) => d.name === doName);
          const doTypeInfo = tpl?.type ? doTypes.get(tpl.type) : undefined;
          const doiEl = doiMap.get(doName);

          // Collect explicit DAI values inside this DOI
          const daiVals = new Map<string, string>();
          if (doiEl) {
            Array.from(doiEl.querySelectorAll('DAI')).forEach((dai) => {
              const dn = dai.getAttribute('name') || '';
              const v = dai.querySelector('Val')?.textContent?.trim() || '';
              if (dn && v) daiVals.set(dn, v);
            });
          }

          const das: SclDa[] = [];
          if (doTypeInfo && doTypeInfo.das.length > 0) {
            for (const da of doTypeInfo.das) {
              let children: SclDaChild[] | undefined;
              if (da.name === 'q' || da.bType === 'Quality') {
                children = buildQualityChildren();
              } else if (da.name === 't' || da.bType === 'Timestamp') {
                children = buildTimestampChildren();
              } else if (da.bType === 'Struct' && da.type && daTypes.has(da.type)) {
                children = (daTypes.get(da.type) || []).map((b) => ({
                  name: b.name,
                  value: daiVals.get(b.name) || '',
                }));
              }
              das.push({
                name: da.name,
                fc: da.fc,
                bType: da.bType,
                value: daiVals.get(da.name) || '',
                children,
              });
            }
          } else if (daiVals.size > 0) {
            daiVals.forEach((v, k) => {
              das.push({ name: k, fc: 'CF', bType: 'VisString', value: v });
            });
          }

          // Top-level DO Value: match real IEDScout (show NamPlt vendor or live stVal/general, NOT `d` description)
          const topValue =
            doName === 'NamPlt'
              ? daiVals.get('vendor') || manufacturer || ''
              : daiVals.get('stVal') || daiVals.get('general') || '';

          dos.push({
            name: doName,
            cdc: doTypeInfo?.cdc || 'DO',
            desc: tpl?.desc || doiEl?.getAttribute('desc') || '',
            value: topValue,
            das,
          });
        });

        lns.push({
          ldInst,
          name: lnName,
          lnClass,
          desc: lnDesc,
          dos,
        });
      });
    });

    result.push({
      id: `SCL-${iedName}-${iedIdx}`,
      name: iedName,
      manufacturer,
      type,
      ip,
      sclPath: fileName,
      lds,
      lns,
      datasets,
      reports,
      gooses,
      settingGroups,
      rawXml: xmlText,
    });
  });

  if (result.length === 0) {
    throw new Error(`No <IED> elements found in "${fileName}".`);
  }
  return result;
}

type SclSchemaVersion =
  | 'ED2_3_1'
  | 'ED1_1_6'
  | 'ED1_1_5'
  | 'ED1_1_4';

type SclExportFormat = 'cid' | 'icd' | 'iid' | 'scd';

const SCL_SCHEMA_META: Record<
  SclSchemaVersion,
  { label: string; versionAttr: string; revisionAttr: string; releaseAttr?: string; toolId: string }
> = {
  ED2_3_1: {
    label: 'Edition 2 (Schema V3.1)',
    versionAttr: '2007',
    revisionAttr: 'B',
    releaseAttr: '4',
    toolId: 'IEDScout 4.20 (Ed2 V3.1)',
  },
  ED1_1_6: {
    label: 'Edition 1 (Schema V1.6)',
    versionAttr: '1.6',
    revisionAttr: 'A',
    toolId: 'IEDScout 4.20 (Ed1 V1.6)',
  },
  ED1_1_5: {
    label: 'Edition 1 (Schema V1.5)',
    versionAttr: '1.5',
    revisionAttr: 'A',
    toolId: 'IEDScout 4.20 (Ed1 V1.5)',
  },
  ED1_1_4: {
    label: 'Edition 1 (Schema V1.4)',
    versionAttr: '1.4',
    revisionAttr: 'A',
    toolId: 'IEDScout 4.20 (Ed1 V1.4)',
  },
};

function generateFallbackSclXml(ied: ParsedIedModel, ver: SclSchemaVersion): string {
  const meta = SCL_SCHEMA_META[ver];
  const relPart = meta.releaseAttr ? ` release="${meta.releaseAttr}"` : '';
  const ldXml = ied.lds
    .map((ld) => {
      const lns = ied.lns.filter((l) => l.ldInst === ld);
      const ln0 = lns.find((l) => l.lnClass === 'LLN0');
      const otherLns = lns.filter((l) => l.lnClass !== 'LLN0');
      const dsXml = ied.datasets
        .filter((d) => d.ldInst === ld)
        .map(
          (d) =>
            `            <DataSet name="${d.name}">\n${d.fcdas
              .map((f) => `              <!-- ${f} -->`)
              .join('\n')}\n            </DataSet>`
        )
        .join('\n');
      const rcbXml = ied.reports
        .filter((r) => r.ldInst === ld)
        .map(
          (r) =>
            `            <ReportControl name="${r.name}" rptID="${r.rptId}" datSet="${r.datSet}" buffered="${r.buffered}" confRev="${r.confRev}" intgPd="${r.intgPd}"/>`
        )
        .join('\n');
      const gcbXml = ied.gooses
        .filter((g) => g.ldInst === ld)
        .map(
          (g) =>
            `            <GSEControl name="${g.name}" appID="${g.appId}" datSet="${g.datSet}" confRev="${g.confRev}" type="GOOSE"/>`
        )
        .join('\n');
      const otherXml = otherLns
        .map((l) => `          <LN lnClass="${l.lnClass}" inst="${l.name.replace(l.lnClass, '') || '1'}" desc="${l.desc}"/>`)
        .join('\n');
      return `        <LDevice inst="${ld}">
          <LN0 lnClass="LLN0" inst="" desc="${ln0?.desc || 'Logical node zero'}">
${[dsXml, rcbXml, gcbXml].filter(Boolean).join('\n')}
          </LN0>
${otherXml}
        </LDevice>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<SCL xmlns="http://www.iec.ch/61850/2003/SCL" version="${meta.versionAttr}" revision="${meta.revisionAttr}"${relPart}>
  <Header id="${ied.name}" version="1" revision="1" toolID="${meta.toolId}"/>
  <Communication>
    <SubNetwork name="StationBus" type="8-MMS">
      <ConnectedAP iedName="${ied.name}" apName="S1">
        <Address>
          <P type="IP">${ied.ip || '192.168.1.10'}</P>
          <P type="IP-SUBNET">255.255.255.0</P>
        </Address>
      </ConnectedAP>
    </SubNetwork>
  </Communication>
  <IED name="${ied.name}" manufacturer="${ied.manufacturer || 'Generic'}" type="${ied.type || 'ProtectionIED'}">
    <AccessPoint name="S1">
      <Server>
${ldXml}
      </Server>
    </AccessPoint>
  </IED>
</SCL>`;
}

function convertAndBuildSclXml(
  ied: ParsedIedModel,
  schemaVersion: SclSchemaVersion,
  exportFormat: SclExportFormat,
  targetIedName: string,
  targetIp: string
): string {
  const meta = SCL_SCHEMA_META[schemaVersion];
  const baseXml = ied.rawXml && ied.rawXml.trim().length > 0 ? ied.rawXml : generateFallbackSclXml(ied, schemaVersion);
  const parser = new DOMParser();
  const doc = parser.parseFromString(baseXml, 'application/xml');
  if (doc.querySelector('parsererror')) {
    return generateFallbackSclXml({ ...ied, name: targetIedName, ip: targetIp }, schemaVersion);
  }

  const sclEl = doc.querySelector('SCL');
  if (sclEl) {
    sclEl.setAttribute('version', meta.versionAttr);
    sclEl.setAttribute('revision', meta.revisionAttr);
    if (meta.releaseAttr) sclEl.setAttribute('release', meta.releaseAttr);
    else sclEl.removeAttribute('release');
  }

  const headerEl = doc.querySelector('Header');
  if (headerEl) {
    headerEl.setAttribute('toolID', meta.toolId);
    if (exportFormat === 'cid' || exportFormat === 'iid') {
      headerEl.setAttribute('id', targetIedName || ied.name);
    }
  }

  // Update IED name & Communication IP when converting ICD -> CID/IID
  const finalName = (targetIedName || ied.name).trim();
  const finalIp = (targetIp || ied.ip || '192.168.1.10').trim();

  if (exportFormat === 'cid' || exportFormat === 'iid') {
    const iedEl =
      Array.from(doc.querySelectorAll('IED')).find((el) => el.getAttribute('name') === ied.name) ||
      doc.querySelector('IED');
    if (iedEl && finalName) {
      iedEl.setAttribute('name', finalName);
    }

    let capEl =
      Array.from(doc.querySelectorAll('ConnectedAP')).find(
        (el) => el.getAttribute('iedName') === ied.name || el.getAttribute('iedName') === finalName
      ) || doc.querySelector('ConnectedAP');

    if (capEl) {
      capEl.setAttribute('iedName', finalName);
      const ipNode = capEl.querySelector('Address > P[type="IP"]');
      if (ipNode) {
        ipNode.textContent = finalIp;
      } else {
        const addrEl = capEl.querySelector('Address') || doc.createElementNS(sclEl?.namespaceURI || null, 'Address');
        if (!capEl.querySelector('Address')) capEl.prepend(addrEl);
        const pEl = doc.createElementNS(sclEl?.namespaceURI || null, 'P');
        pEl.setAttribute('type', 'IP');
        pEl.textContent = finalIp;
        addrEl.appendChild(pEl);
      }
    } else if (sclEl) {
      // ICD files often omit <Communication>; create it when converting ICD -> CID
      const ns = sclEl.namespaceURI;
      const commEl = doc.querySelector('Communication') || doc.createElementNS(ns, 'Communication');
      if (!doc.querySelector('Communication')) {
        const firstIed = doc.querySelector('IED');
        if (firstIed) sclEl.insertBefore(commEl, firstIed);
        else sclEl.appendChild(commEl);
      }
      const snEl = commEl.querySelector('SubNetwork') || doc.createElementNS(ns, 'SubNetwork');
      if (!commEl.querySelector('SubNetwork')) {
        snEl.setAttribute('name', 'StationBus');
        snEl.setAttribute('type', '8-MMS');
        commEl.appendChild(snEl);
      }
      const newCap = doc.createElementNS(ns, 'ConnectedAP');
      newCap.setAttribute('iedName', finalName);
      newCap.setAttribute('apName', 'S1');
      const addrEl = doc.createElementNS(ns, 'Address');
      const pIp = doc.createElementNS(ns, 'P');
      pIp.setAttribute('type', 'IP');
      pIp.textContent = finalIp;
      const pSub = doc.createElementNS(ns, 'P');
      pSub.setAttribute('type', 'IP-SUBNET');
      pSub.textContent = '255.255.255.0';
      addrEl.appendChild(pIp);
      addrEl.appendChild(pSub);
      newCap.appendChild(addrEl);
      snEl.appendChild(newCap);
    }
  }

  const serialized = new XMLSerializer().serializeToString(doc);
  return serialized.startsWith('<?xml') ? serialized : `<?xml version="1.0" encoding="UTF-8"?>\n${serialized}`;
}

const TowerWatermark: React.FC<{ darkBg?: boolean }> = ({ darkBg = false }) => (
  <svg
    viewBox="0 0 420 260"
    className="pointer-events-none select-none absolute right-2 bottom-0 w-[340px] sm:w-[420px] h-auto"
    style={{ opacity: darkBg ? 0.22 : 0.14 }}
    fill="none"
    stroke={darkBg ? '#7fb4e6' : '#6b7f94'}
    strokeWidth="1.2"
  >
    {[
      { x: 110, y: 55, s: 0.72 },
      { x: 225, y: 30, s: 0.92 },
      { x: 345, y: 12, s: 1.08 },
    ].map((t, idx) => (
      <g key={idx} transform={`translate(${t.x}, ${t.y}) scale(${t.s})`}>
        <path d="M 0 0 L -22 190 M 0 0 L 22 190" />
        <path d="M -52 38 L 52 38 L 12 24 L -12 24 Z" />
        <path d="M -62 78 L 62 78 L 15 62 L -15 62 Z" />
        <path d="M -50 118 L 50 118 L 18 102 L -18 102 Z" />
        <path d="M -10 40 L 13 78 M 10 40 L -13 78 M -14 78 L 17 118 M 14 78 L -17 118 M -17 118 L 20 165 M 17 118 L -20 165" />
      </g>
    ))}
  </svg>
);

const IEDSCOUT_STORAGE_KEY = 'sas_iedscout_state_v1';

interface IedScoutPersistedState {
  mainTab: MainTab;
  loadedIeds: ParsedIedModel[];
  selectedIedId: string;
  online: boolean;
  recentSclFiles: Array<{ name: string; xml: string }>;
  recentIeds: string[];
  selection: TreeSelection | null;
  expandedDo: Record<string, boolean>;
  expandedSub: Record<string, boolean>;
  liveOverrides: Record<string, string>;
  monitored: MonitoredItem[];
  snifferMsgs: SnifferMessage[];
  statusHistory: StatusEntry[];
  simRunning: boolean;
  simCbVal: 'OPEN' | 'CLOSED';
  simTripVal: boolean;
  simStNum: number;
  simSqNum: number;
}

// Module-level memory cache survives SPA page navigation with zero size limit
let iedScoutMemoryCache: IedScoutPersistedState | null = null;

function loadInitialIedScoutState(): Partial<IedScoutPersistedState> {
  if (iedScoutMemoryCache) return iedScoutMemoryCache;
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(IEDSCOUT_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        iedScoutMemoryCache = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return {};
}

function saveIedScoutState(state: IedScoutPersistedState) {
  iedScoutMemoryCache = state;
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(IEDSCOUT_STORAGE_KEY, JSON.stringify(state));
  } catch {
    // If a large SCL file exceeds localStorage quota, save parsed models without rawXml strings
    try {
      const compact: IedScoutPersistedState = {
        ...state,
        loadedIeds: state.loadedIeds.map((i) => ({ ...i, rawXml: undefined })),
        recentSclFiles: state.recentSclFiles.map((f) => ({ name: f.name, xml: '' })),
        snifferMsgs: state.snifferMsgs.slice(-100),
      };
      window.localStorage.setItem(IEDSCOUT_STORAGE_KEY, JSON.stringify(compact));
    } catch {
      // Ignore quota errors; module-level memory cache still preserves everything during SPA navigation
    }
  }
}

export const IedScoutTool: React.FC = () => {
  const initialCache = useMemo(() => loadInitialIedScoutState(), []);
  const {
    ieds: storeIeds,
    bays,
    gooseControlBlocks: storeGcbs,
    commandBreaker,
    triggerProtectionTrip,
    resetProtectionTrip,
    triggerMmsGeneralInterrogation,
  } = useSubstationStore();

  const [mainTab, setMainTab] = useState<MainTab>(() => initialCache.mainTab || 'FILE');

  // Start EMPTY like real IEDScout — user uploads CID/ICD/SCD or clicks Discover IED!
  const [loadedIeds, setLoadedIeds] = useState<ParsedIedModel[]>(() => initialCache.loadedIeds || []);
  const [selectedIedId, setSelectedIedId] = useState<string>(() => initialCache.selectedIedId || '');
  const [online, setOnline] = useState<boolean>(() => Boolean(initialCache.online));
  const [recentSclFiles, setRecentSclFiles] = useState<Array<{ name: string; xml: string }>>(() => initialCache.recentSclFiles || []);
  const [recentIeds, setRecentIeds] = useState<string[]>(() => initialCache.recentIeds || []);

  // Left navigation tree collapse state (matches IEDScout 6 categories)
  const [openCat, setOpenCat] = useState<Record<string, boolean>>({
    GOOSE: true,
    Reports: true,
    SettingGroups: true,
    DataSets: true,
    DataModel: true,
  });
  const [selection, setSelection] = useState<TreeSelection | null>(() => initialCache.selection ?? null);
  const [expandedDo, setExpandedDo] = useState<Record<string, boolean>>(() => initialCache.expandedDo || {});
  const [expandedSub, setExpandedSub] = useState<Record<string, boolean>>(() => initialCache.expandedSub || {});
  const [selectedDetailRow, setSelectedDetailRow] = useState<string>('');
  const [liveOverrides, setLiveOverrides] = useState<Record<string, string>>(() => initialCache.liveOverrides || {});

  // Show checkboxes
  const [showNav, setShowNav] = useState<boolean>(true);
  const [showDetails, setShowDetails] = useState<boolean>(true);
  const [showMonitor, setShowMonitor] = useState<boolean>(true);
  const [showDescriptions, setShowDescriptions] = useState<boolean>(false);
  const [pollingSec, setPollingSec] = useState<number>(1);
  const [zoomPct, setZoomPct] = useState<number>(100);

  // Activity Monitor
  const [monitored, setMonitored] = useState<MonitoredItem[]>(() => initialCache.monitored || []);
  const [dragOverMonitor, setDragOverMonitor] = useState<boolean>(false);

  // Modals
  const [discoverOpen, setDiscoverOpen] = useState<boolean>(false);
  const [discoverIp, setDiscoverIp] = useState<string>(() => storeIeds[0]?.ipAddressLanA || '10.132.10.11');
  const [controlOpen, setControlOpen] = useState<boolean>(false);
  const [writeOpen, setWriteOpen] = useState<boolean>(false);
  const [writeRef, setWriteRef] = useState<string>('');
  const [writeVal, setWriteVal] = useState<string>('');
  const [addDsOpen, setAddDsOpen] = useState<boolean>(false);
  const [newDsName, setNewDsName] = useState<string>('CustomDataSet1');
  const [newDsFcda, setNewDsFcda] = useState<string>('Relay/LLN0.Mod.stVal [ST]');
  const [saveSclOpen, setSaveSclOpen] = useState<boolean>(false);
  const [saveSclVersion, setSaveSclVersion] = useState<SclSchemaVersion>('ED2_3_1');
  const [saveSclFormat, setSaveSclFormat] = useState<SclExportFormat>('cid');
  const [saveSclIedName, setSaveSclIedName] = useState<string>('');
  const [propsOpen, setPropsOpen] = useState<boolean>(false);
  const [configOpen, setConfigOpen] = useState<boolean>(false);
  const [layoutMode, setLayoutMode] = useState<'DEFAULT' | 'BROWSE'>('DEFAULT');
  const [ctlModel, setCtlModel] = useState<'SBO' | 'DIRECT'>('SBO');
  const [ctlTarget, setCtlTarget] = useState<'OPEN' | 'CLOSED'>('OPEN');
  const [sboSelected, setSboSelected] = useState<boolean>(false);
  const [ctlMsg, setCtlMsg] = useState<string>('Select a control value and execute Select → Operate.');

  // Simulator state
  const [simRunning, setSimRunning] = useState<boolean>(() => Boolean(initialCache.simRunning));
  const [simCbVal, setSimCbVal] = useState<'OPEN' | 'CLOSED'>(() => initialCache.simCbVal || 'CLOSED');
  const [simTripVal, setSimTripVal] = useState<boolean>(() => Boolean(initialCache.simTripVal));
  const [simStNum, setSimStNum] = useState<number>(() => initialCache.simStNum ?? 1);
  const [simSqNum, setSimSqNum] = useState<number>(() => initialCache.simSqNum ?? 0);

  // Sniffer state
  const [snifferRunning, setSnifferRunning] = useState<boolean>(false);
  const [snifferPaused, setSnifferPaused] = useState<boolean>(false);
  const [snifferAutoScroll, setSnifferAutoScroll] = useState<boolean>(true);
  const [snifferSearch, setSnifferSearch] = useState<string>('');
  const [snifferStartTs, setSnifferStartTs] = useState<number>(() => Date.now());
  const [snifferFilters, setSnifferFilters] = useState({
    IED: true,
    GOOSE: true,
    RETRANS: false,
    REPORT: true,
    CS: true,
    ERROR: true,
  });
  const [snifferMsgs, setSnifferMsgs] = useState<SnifferMessage[]>(() => initialCache.snifferMsgs || []);
  const [selectedSniffId, setSelectedSniffId] = useState<number | null>(null);

  // Status History
  const [statusOpen, setStatusOpen] = useState<boolean>(false);
  const [statusHistory, setStatusHistory] = useState<StatusEntry[]>(() =>
    initialCache.statusHistory && initialCache.statusHistory.length > 0
      ? initialCache.statusHistory
      : [{ id: 1, time: fmtTime(), level: 'INFO', text: 'IEDScout 4.20 ready. Use Open SCL or Discover IED to load an IED.' }]
  );

  const sclInputRef = useRef<HTMLInputElement | null>(null);

  const selectedIed = useMemo(
    () => loadedIeds.find((i) => i.id === selectedIedId) || loadedIeds[0] || null,
    [loadedIeds, selectedIedId]
  );

  const addStatus = (text: string, level: StatusEntry['level'] = 'INFO') => {
    setStatusHistory((prev) => [{ id: Date.now() + Math.random(), time: fmtTime(), level, text }, ...prev].slice(0, 60));
  };

  const pushSniff = (
    source: string,
    destination: string,
    category: SnifferMessage['category'],
    description: string,
    details: string[]
  ) => {
    const now = Date.now();
    const relSec = ((now - snifferStartTs) / 1000).toFixed(3) + ' s';
    setSnifferMsgs((prev) =>
      [...prev, { id: now + Math.random(), time: fmtTime(new Date(now)), relSec, source, destination, category, description, details }].slice(-400)
    );
  };

  // Auto-select LLN0 only when switching to a different IED (never wipe restored selection on remount)
  const prevIedIdRef = useRef<string>(selectedIed?.id || '');
  useEffect(() => {
    if (!selectedIed) {
      setSelection(null);
      prevIedIdRef.current = '';
      return;
    }
    const iedChanged = prevIedIdRef.current !== selectedIed.id;
    prevIedIdRef.current = selectedIed.id;
    if (iedChanged || !selection) {
      const firstLn = selectedIed.lns.find((l) => l.lnClass === 'LLN0') || selectedIed.lns[0];
      if (firstLn) {
        setSelection({ kind: 'LN', ldInst: firstLn.ldInst, lnName: firstLn.name });
      }
      if (iedChanged) {
        setExpandedDo({});
        setExpandedSub({});
      }
    }
  }, [selectedIed?.id]);

  // Persist all IEDScout session state to module cache + localStorage automatically
  useEffect(() => {
    saveIedScoutState({
      mainTab,
      loadedIeds,
      selectedIedId,
      online,
      recentSclFiles,
      recentIeds,
      selection,
      expandedDo,
      expandedSub,
      liveOverrides,
      monitored,
      snifferMsgs,
      statusHistory,
      simRunning,
      simCbVal,
      simTripVal,
      simStNum,
      simSqNum,
    });
  }, [
    mainTab,
    loadedIeds,
    selectedIedId,
    online,
    recentSclFiles,
    recentIeds,
    selection,
    expandedDo,
    expandedSub,
    liveOverrides,
    monitored,
    snifferMsgs,
    statusHistory,
    simRunning,
    simCbVal,
    simTripVal,
    simStNum,
    simSqNum,
  ]);

  // Sniffer live capture loop
  useEffect(() => {
    if (!snifferRunning || snifferPaused) return;
    const timer = window.setInterval(() => {
      const gcbList = selectedIed?.gooses.length
        ? selectedIed.gooses.map((g) => ({
            pub: selectedIed.name,
            name: g.name,
            appId: g.appId,
            mac: g.mac,
            vlanId: g.vlanId,
            datSet: g.datSet,
            stNum: g.stNum,
            sqNum: g.sqNum,
          }))
        : storeGcbs.map((g) => ({
            pub: g.publisherIedName,
            name: g.gocbName,
            appId: g.appId,
            mac: g.multicastMac,
            vlanId: g.vlanId,
            datSet: g.datSet,
            stNum: g.stNum,
            sqNum: g.sqNum,
          }));

      const g = gcbList[Math.floor(Math.random() * Math.max(1, gcbList.length))];
      if (g) {
        const isRetrans = Math.random() > 0.3;
        pushSniff(
          g.pub,
          g.mac,
          isRetrans ? 'RETRANS' : 'GOOSE',
          `GOOSE ${g.name} (APPID ${g.appId}) stNum=${simStNum} sqNum=${simSqNum + (isRetrans ? 1 : 0)}`,
          [`Publisher: ${g.pub}`, `GoCB: ${g.name} · DataSet: ${g.datSet}`, `MAC: ${g.mac} · VLAN: ${g.vlanId}`]
        );
      }
    }, 1500);
    return () => window.clearInterval(timer);
  }, [snifferRunning, snifferPaused, selectedIed, storeGcbs, simStNum, simSqNum]);

  // Handle real user SCL file upload (.cid / .icd / .scd / .iid)
  const handleUploadScl = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const xmlText = String(reader.result || '');
        const parsed = parseRealSclXml(file.name, xmlText);
        setLoadedIeds((prev) => {
          const existingNames = new Set(parsed.map((p) => p.name));
          return [...parsed, ...prev.filter((x) => !existingNames.has(x.name))];
        });
        setSelectedIedId(parsed[0].id);
        setOnline(false); // Real IEDScout opens SCL offline until user clicks Online!
        setRecentSclFiles((prev) => [{ name: file.name, xml: xmlText }, ...prev.filter((x) => x.name !== file.name)].slice(0, 8));
        addStatus(
          `Opened SCL "${file.name}" — ${parsed.length} IED(s), ${parsed[0].lns.length} LNs, ${parsed[0].gooses.length} GOOSE, ${parsed[0].reports.length} Reports, ${parsed[0].datasets.length} DataSets.`
        );
        setMainTab('BROWSER');
      } catch (err) {
        addStatus(err instanceof Error ? err.message : `Failed to parse ${file.name}`, 'ERR');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Discover a live Substation IED from store
  const handleDiscoverStoreIed = (iedId?: string) => {
    const target =
      (iedId ? storeIeds.find((i) => i.id === iedId) : null) ||
      storeIeds.find((i) => i.ipAddressLanA === discoverIp.trim() || i.ipAddressLanB === discoverIp.trim()) ||
      storeIeds[0];
    if (!target) return;

    const bay = bays.find((b) => b.id === target.bayId);
    const model: ParsedIedModel = {
      id: `LIVE-${target.id}`,
      name: target.name,
      manufacturer: target.vendor,
      type: target.model,
      ip: target.ipAddressLanA,
      sclPath: `Discovered online (${target.ipAddressLanA}:102)`,
      bayId: target.bayId,
      isFromStore: true,
      lds: target.logicalDevices.map((ld) => ld.ldInst),
      lns: target.logicalDevices.flatMap((ld) =>
        ld.logicalNodes.map((ln) => ({
          ldInst: ld.ldInst,
          name: `${ln.lnClass}${ln.lnInst}`,
          lnClass: ln.lnClass,
          desc: ln.description,
          dos: ln.dataObjects.map((d) => ({
            name: d.doName,
            cdc: d.cdc,
            desc: '',
            value:
              bay && ln.lnClass === 'XCBR' && d.doName === 'Pos'
                ? bay.breakerState
                : bay && ln.lnClass === 'PTRC' && d.doName === 'Tr'
                ? String(bay.protectionTripActive)
                : d.value,
            das: [
              { name: d.fc === 'MX' ? 'mag.f' : 'stVal', fc: d.fc, bType: d.fc === 'MX' ? 'FLOAT32' : 'Dbpos', value: d.value },
              { name: 'q', fc: d.fc, bType: 'Quality', value: d.q, children: buildQualityChildren() },
              { name: 't', fc: d.fc, bType: 'Timestamp', value: d.t, children: buildTimestampChildren() },
            ],
          })),
        }))
      ),
      datasets: target.datasets.map((ds) => ({
        ldInst: target.logicalDevices[0]?.ldInst || 'LD0',
        lnName: 'LLN0',
        name: ds.name,
        desc: ds.description,
        fcdas: ds.fcdas.map((f) => `${f.ldInst}/${f.lnClass}${f.lnInst}.${f.doName}${f.daName ? '.' + f.daName : ''} [${f.fc}]`),
      })),
      reports: target.rcbs.map((r) => ({
        ldInst: target.logicalDevices[0]?.ldInst || 'LD0',
        lnName: 'LLN0',
        name: r.name,
        rptId: r.rptId,
        datSet: r.datSet,
        buffered: r.buffered,
        intgPd: r.intgPdMs,
        confRev: r.confRev,
        enabled: r.enabled,
      })),
      gooses: storeGcbs
        .filter((g) => g.publisherIedId === target.id)
        .map((g) => ({
          ldInst: target.logicalDevices[0]?.ldInst || 'LD0',
          lnName: 'LLN0',
          name: g.gocbName,
          appId: g.appId,
          datSet: g.datSet,
          confRev: g.confRev,
          mac: g.multicastMac,
          vlanId: g.vlanId,
          vlanPrio: g.vlanPriority,
          minTime: g.minTimeMs,
          maxTime: g.maxTimeMs,
          stNum: g.stNum,
          sqNum: g.sqNum,
        })),
      settingGroups: [{ ldInst: target.logicalDevices[0]?.ldInst || 'LD0', numOfSGs: 4, actSG: 1 }],
    };

    setLoadedIeds((prev) => [model, ...prev.filter((x) => x.id !== model.id)]);
    setSelectedIedId(model.id);
    setOnline(true);
    setRecentIeds((prev) => [`${target.name} (${target.ipAddressLanA})`, ...prev.filter((x) => !x.startsWith(target.name))].slice(0, 6));
    addStatus(`Discovered & connected online to ${target.name} (${target.ipAddressLanA}:102).`);
    setDiscoverOpen(false);
    setMainTab('BROWSER');
  };

  const handleCloseIed = () => {
    if (!selectedIed) return;
    const closedName = selectedIed.name;
    const remaining = loadedIeds.filter((i) => i.id !== selectedIed.id);
    setLoadedIeds(remaining);
    setSelectedIedId(remaining[0]?.id || '');
    if (remaining.length === 0) setOnline(false);
    addStatus(`Closed IED "${closedName}".`, 'WARN');
  };

  const addToMonitor = (item: MonitoredItem) => {
    setMonitored((prev) => (prev.some((x) => x.key === item.key) ? prev : [...prev, item]));
    addStatus(`Monitoring ${item.ref}`);
  };

  const resolveLiveBayDoValue = (
    bayId: string | undefined,
    lnClass: string,
    doName: string,
    fallback: string
  ): { val: string; q: string; t: string } => {
    const nowIso = new Date().toISOString();
    const st = useSubstationStore.getState();
    const bay = bayId ? st.bays.find((b) => b.id === bayId) : undefined;
    const q = bay ? (bay.quality === 'GOOD' ? '0x0000 (Good)' : '0x0100 (Invalid)') : '0x0000 (Good)';
    if (!bay) {
      if (fallback) return { val: fallback, q, t: nowIso };
      const def =
        doName === 'Mod' || doName === 'Beh'
          ? 'on (1)'
          : doName === 'Health'
          ? 'Ok (1)'
          : doName === 'Loc'
          ? 'FALSE'
          : doName === 'Pos'
          ? 'CLOSED'
          : 'FALSE';
      return { val: def, q, t: nowIso };
    }
    const cls = lnClass.toUpperCase();
    const baseDo = doName.split('.')[0];
    if ((cls.endsWith('XCBR') || cls.endsWith('CSWI')) && baseDo === 'Pos') {
      return { val: bay.breakerState, q, t: nowIso };
    }
    if (cls.endsWith('PTRC') && (baseDo === 'Tr' || baseDo === 'Op')) {
      return { val: bay.protectionTripActive ? 'TRUE (TRIP)' : 'FALSE', q, t: nowIso };
    }
    if ((cls.endsWith('PTOC') || cls.endsWith('PIOC') || cls.endsWith('PDIF') || cls.endsWith('PDIS')) && (baseDo === 'Str' || baseDo === 'Op')) {
      return { val: bay.protectionTripActive ? 'TRUE (ACTIVE)' : 'FALSE', q, t: nowIso };
    }
    if (cls.endsWith('CILO') && baseDo === 'EnaCls') {
      const locked = Boolean(bay.masterTripLockout ?? bay.protectionTripActive);
      return { val: bay.interlockPermissive && !locked ? 'TRUE' : 'FALSE (BLOCKED)', q, t: nowIso };
    }
    if (cls.endsWith('MMXU')) {
      if (baseDo === 'A') return { val: `${bay.currentA.toFixed(1)} A`, q, t: nowIso };
      if (baseDo === 'PhV' || baseDo === 'PPV') return { val: `${bay.voltageAbKv.toFixed(2)} kV`, q, t: nowIso };
      if (baseDo === 'TotW') return { val: `${bay.activePowerMw.toFixed(2)} MW`, q, t: nowIso };
      if (baseDo === 'TotVAr') return { val: `${(bay.reactivePowerMvar ?? 0).toFixed(2)} MVAr`, q, t: nowIso };
      if (baseDo === 'Hz') return { val: `${(bay.frequencyHz ?? 50).toFixed(2)} Hz`, q, t: nowIso };
    }
    return { val: fallback || 'FALSE', q, t: nowIso };
  };

  const refreshSelectedLnLive = (logToStatus: boolean) => {
    if (!selectedIed || !online || !selection || selection.kind !== 'LN') return;
    const ln = selectedIed.lns.find((l) => l.ldInst === selection.ldInst && l.name === selection.lnName);
    if (!ln) return;

    const patch: Record<string, string> = {};
    const readSummaries: string[] = [];
    const updatedDos = ln.dos.map((d) => {
      const k = `${selectedIed.id}/${ln.ldInst}/${ln.name}.${d.name}`;
      const live = resolveLiveBayDoValue(selectedIed.bayId, ln.lnClass, d.name, liveOverrides[k] ?? d.value);
      patch[k] = live.val;
      readSummaries.push(`${d.name}=${live.val}`);
      const updatedDas = d.das.map((da) => {
        if (da.name === 'stVal' || da.name === 'general' || da.name === 'mag.f') return { ...da, value: live.val };
        if (da.name === 'q') return { ...da, value: live.q };
        if (da.name === 't') return { ...da, value: live.t };
        return da;
      });
      return { ...d, value: live.val, das: updatedDas };
    });

    setLiveOverrides((prev) => ({ ...prev, ...patch }));
    setLoadedIeds((prev) =>
      prev.map((ied) =>
        ied.id !== selectedIed.id
          ? ied
          : {
              ...ied,
              lns: ied.lns.map((item) =>
                item.ldInst === ln.ldInst && item.name === ln.name ? { ...item, dos: updatedDos } : item
              ),
            }
      )
    );
    // Refresh ALL items in Activity Monitor (even from other LNs like XCBR1 / PTOC1 / MMXU1)
    setMonitored((prev) =>
      prev.map((m) => {
        if (patch[m.key]) {
          return { ...m, value: patch[m.key], quality: '0x0000 (Good)', updatedAt: fmtTime() };
        }
        // Parse key format: `${iedId}/${ldInst}/${lnName}.${doName}`
        const parts = m.key.split('/');
        if (parts.length >= 3) {
          const iedIdPart = parts[0];
          const lnAndDo = parts.slice(2).join('/');
          const dotIdx = lnAndDo.indexOf('.');
          if (dotIdx > 0) {
            const lnNamePart = lnAndDo.slice(0, dotIdx);
            const doNamePart = lnAndDo.slice(dotIdx + 1);
            const targetIed = loadedIeds.find((x) => x.id === iedIdPart);
            if (targetIed?.bayId) {
              const live = resolveLiveBayDoValue(targetIed.bayId, lnNamePart.replace(/[0-9]+$/, ''), doNamePart, m.value);
              return { ...m, value: live.val, quality: live.q, updatedAt: fmtTime() };
            }
          }
        }
        return m;
      })
    );

    if (logToStatus) {
      addStatus(
        `Read all ${selectedIed.name}/${ln.ldInst}/${ln.name}: ${readSummaries.slice(0, 4).join(', ')} (MMS GetDataValues OK).`
      );
      pushSniff(
        'IEDScout',
        selectedIed.ip,
        'CS',
        `GetDataValues ${selectedIed.name}${ln.ldInst}/${ln.name} → ${readSummaries.slice(0, 3).join(', ')}`,
        readSummaries
      );
    }
  };

  const handleReadAll = () => {
    refreshSelectedLnLive(true);
  };

  // Live 1s/2s/5s auto-polling when Online & connected to a live substation IED
  useEffect(() => {
    if (!online || !selectedIed?.bayId || pollingSec <= 0) return;
    const timer = window.setInterval(() => {
      refreshSelectedLnLive(false);
    }, pollingSec * 1000);
    return () => window.clearInterval(timer);
  }, [online, selectedIed?.id, selectedIed?.bayId, selection?.kind, (selection as any)?.ldInst, (selection as any)?.lnName, pollingSec]);

  const handleOperateControl = () => {
    if (!selectedIed || !online) return;
    if (ctlModel === 'SBO' && !sboSelected) {
      setCtlMsg('NEGATIVE · Object-not-selected (Click Select first)');
      return;
    }
    setSboSelected(false);
    if (selectedIed.bayId) {
      const ok = commandBreaker(selectedIed.bayId, ctlTarget, 'SCADA_SBO');
      setCtlMsg(ok ? `Operate POSITIVE → Breaker is now ${ctlTarget}` : 'Operate NEGATIVE · Blocked by interlock / ANSI 86');
      addStatus(`Control Operate ${selectedIed.name}/CSWI1.Pos → ${ctlTarget} (${ok ? 'OK' : 'BLOCKED'})`, ok ? 'INFO' : 'ERR');
    } else {
      const key = `${selectedIed.id}/${selectedIed.lds[0] || 'LD0'}/XCBR1.Pos`;
      setLiveOverrides((prev) => ({ ...prev, [key]: ctlTarget }));
      setCtlMsg(`Operate POSITIVE → ${selectedIed.name}/XCBR1.Pos = ${ctlTarget}`);
      addStatus(`Control Operate ${selectedIed.name} → ${ctlTarget}`);
    }
  };

  const selectedLn = useMemo(() => {
    if (!selectedIed || !selection || selection.kind !== 'LN') return null;
    return selectedIed.lns.find((l) => l.ldInst === selection.ldInst && l.name === selection.lnName) || null;
  }, [selectedIed, selection]);

  const filteredSnifferMsgs = useMemo(() => {
    return snifferMsgs.filter((m) => {
      if (m.category === 'GOOSE' && !snifferFilters.GOOSE) return false;
      if (m.category === 'RETRANS' && !snifferFilters.RETRANS) return false;
      if (m.category === 'REPORT' && !snifferFilters.REPORT) return false;
      if (m.category === 'CS' && !snifferFilters.CS) return false;
      if (m.category === 'ERROR' && !snifferFilters.ERROR) return false;
      if (snifferSearch.trim()) {
        const q = snifferSearch.toLowerCase();
        return `${m.source} ${m.destination} ${m.description}`.toLowerCase().includes(q);
      }
      return true;
    });
  }, [snifferMsgs, snifferFilters, snifferSearch]);

  const selectedSniffMsg =
    filteredSnifferMsgs.find((m) => m.id === selectedSniffId) || filteredSnifferMsgs[filteredSnifferMsgs.length - 1];

  const ribbonBtnCls =
    'flex flex-col items-center justify-center gap-0.5 px-2 py-1 rounded hover:bg-[#dce8f6] text-[#1c2b3a] disabled:opacity-35 disabled:hover:bg-transparent transition min-w-[46px] text-[10px] leading-tight font-medium';

  const badge = (text: string, bg = '#2b7cd3') => (
    <span
      style={{ backgroundColor: bg }}
      className="iedscout-badge inline-flex items-center justify-center rounded-[2px] px-1.5 py-[1px] text-[10.5px] font-bold text-white leading-tight shrink-0 mr-2"
    >
      {text}
    </span>
  );

  const middleHeaderTitle = useMemo(() => {
    if (!selectedIed || !selection) return '';
    if (selection.kind === 'LN') return `${selectedIed.name} • Data Model • ${selection.ldInst} • ${selection.lnName}`;
    if (selection.kind === 'GOOSE') return `${selectedIed.name} • GOOSE • ${selection.ldInst} • ${selection.name}`;
    if (selection.kind === 'REPORT') return `${selectedIed.name} • Reports • ${selection.ldInst} • ${selection.lnName}`;
    if (selection.kind === 'DATASET') return `${selectedIed.name} • DataSets • ${selection.ldInst} • ${selection.name}`;
    if (selection.kind === 'SG') return `${selectedIed.name} • Setting Groups • ${selection.ldInst}`;
    return `${selectedIed.name} • Files`;
  }, [selectedIed, selection]);

  return (
    <div className="iedscout-app -m-2.5 sm:-m-5 xl:-m-6 overflow-hidden border-0 flex flex-col min-h-[calc(100vh-114px)] bg-[#0e5397] text-[#1c2b3a] select-none font-sans">
      <style>{`
        .iedscout-light-pane { background-color: #ffffff !important; color: #1f2937 !important; }
        .iedscout-light-pane table { background-color: #ffffff !important; color: #1f2937 !important; border-collapse: collapse !important; }
        .iedscout-light-pane thead, .iedscout-light-pane thead tr, .iedscout-light-pane thead th {
          background: #f1f4f8 !important;
          background-color: #f1f4f8 !important;
          color: #1f2937 !important;
          border-bottom: 1px solid #c8d2dc !important;
        }
        .iedscout-light-pane tr.iedscout-row-do td { background-color: #dce2e8 !important; color: #1f2937 !important; border-bottom: 1px solid #ffffff !important; }
        .iedscout-light-pane tr.iedscout-row-da td { background-color: #e4e9ee !important; color: #1f2937 !important; border-bottom: 1px solid #ffffff !important; }
        .iedscout-light-pane tr.iedscout-row-sub td { background-color: #e4e9ee !important; color: #1f2937 !important; border-bottom: 1px solid #ffffff !important; }
        .iedscout-light-pane tr.iedscout-row-do:hover td,
        .iedscout-light-pane tr.iedscout-row-da:hover td,
        .iedscout-light-pane tr.iedscout-row-sub:hover td { background-color: #cfe0f2 !important; }
        .iedscout-light-pane tr.iedscout-row-selected td { background-color: #1e82e6 !important; color: #ffffff !important; }
        .iedscout-light-pane tr.iedscout-row-selected .iedscout-fc { color: #ffffff !important; }
        .iedscout-light-pane .iedscout-muted { color: #475569 !important; }
        .iedscout-light-pane .iedscout-fc { color: #1f2937 !important; }
        .iedscout-ribbon { background-color: #f2f4f8 !important; color: #1c2b3a !important; }
        .iedscout-ribbon button { color: #1c2b3a !important; }
        .iedscout-ribbon label, .iedscout-ribbon span { color: #1c2b3a !important; }
        .iedscout-ribbon .iedscout-grp-lbl { color: #5f7082 !important; }
        .iedscout-light-select, .iedscout-light-pane input.iedscout-light-select, .iedscout-light-pane select.iedscout-light-select { background: #ffffff !important; background-color: #ffffff !important; color: #111827 !important; border: 1px solid #94a3b8 !important; }
        .iedscout-light-pane tbody tr td { color: #111827 !important; }
        .iedscout-light-pane tbody tr.iedscout-sniff-selected td { background-color: #1e82e6 !important; color: #ffffff !important; }
        .iedscout-light-pane tbody tr.iedscout-sniff-row:hover td { background-color: #dbeafe !important; color: #111827 !important; }
      `}</style>
      <input
        ref={sclInputRef}
        type="file"
        accept=".cid,.icd,.scd,.iid,.xml"
        onChange={handleUploadScl}
        className="hidden"
      />

      {/* 1. OMICRON IEDSCOUT WINDOW TITLE BAR & 4 TOP TABS */}
      <div className="bg-[#0b4d90] text-white px-2 pt-1 flex flex-col">
        <div className="flex items-center justify-between text-[11px] pb-1 px-1">
          <div className="flex items-center gap-2 font-semibold">
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm bg-[#f6df00] text-[#0b4d90] font-black text-[10px]">
              IS
            </span>
            <span>IEDScout 4.20</span>
          </div>
          <div className="flex items-center gap-2.5 text-white/85">
            <button type="button" onClick={() => setPropsOpen(true)} disabled={!selectedIed} title="IED Properties" className="hover:text-white disabled:opacity-40">
              <Info className="w-3.5 h-3.5" />
            </button>
            <button type="button" onClick={() => setConfigOpen(true)} title="Configuration" className="hover:text-white">
              <HelpCircle className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-end gap-1 border-b-2 border-[#f6df00]">
          {(
            [
              { id: 'FILE', label: 'File' },
              { id: 'BROWSER', label: 'Browser' },
              { id: 'SIMULATOR', label: 'Simulator' },
              { id: 'SNIFFER', label: 'Sniffer' },
            ] as const
          ).map((tab) => {
            const isActive = mainTab === tab.id;
            const isFile = tab.id === 'FILE';
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMainTab(tab.id)}
                style={{
                  backgroundColor: isFile ? '#f6df00' : isActive ? '#ffffff' : '#3a84cc',
                  color: isFile || isActive ? '#112233' : '#ffffff',
                }}
                className={`px-5 py-1 text-xs font-semibold rounded-t-sm transition ${
                  isActive ? 'shadow-sm' : 'hover:brightness-110'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. TAB 1: FILE (START SCREEN — NO PRE-LOADED FAKE CID) */}
      {mainTab === 'FILE' && (
        <div className="relative flex-1 bg-[#0e5397] text-white p-6 sm:p-10 overflow-hidden flex flex-col justify-between">
          <TowerWatermark darkBg />
          <div
            className="pointer-events-none absolute right-0 bottom-0 w-44 h-44"
            style={{ background: 'linear-gradient(135deg, transparent 50%, #e01a22 50%)' }}
          />

          <div className="relative z-10 max-w-4xl space-y-8">
            <h1 className="text-3xl sm:text-4xl font-light tracking-tight">
              <span className="font-semibold text-white">IEDScout</span>{' '}
              <span className="text-[#f6df00] font-normal">4.20</span>
            </h1>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
              {[
                { label: 'Open SCL', icon: <FolderOpen className="w-11 h-11 stroke-[1.5]" />, onClick: () => sclInputRef.current?.click() },
                { label: 'Discover IED', icon: <Search className="w-11 h-11 stroke-[1.5]" />, onClick: () => setDiscoverOpen(true) },
                { label: 'Simulate IED', icon: <Play className="w-11 h-11 stroke-[1.5]" />, onClick: () => setMainTab('SIMULATOR') },
                { label: 'Sniffer', icon: <Radio className="w-11 h-11 stroke-[1.5]" />, onClick: () => setMainTab('SNIFFER') },
                { label: 'Configuration', icon: <Settings className="w-11 h-11 stroke-[1.5]" />, onClick: () => setConfigOpen(true) },
              ].map((tile) => (
                <button
                  key={tile.label}
                  type="button"
                  onClick={tile.onClick}
                  className="relative group h-32 sm:h-36 bg-[#0a417a] hover:bg-[#083566] border border-white/15 flex flex-col items-center justify-center gap-3 p-3 transition shadow-md"
                >
                  <span className="text-white group-hover:scale-105 transition-transform">{tile.icon}</span>
                  <span className="text-xs sm:text-sm font-medium text-white">{tile.label}</span>
                  <span
                    className="absolute right-0 bottom-0 w-4 h-4"
                    style={{ background: 'linear-gradient(135deg, transparent 50%, #f6df00 50%)' }}
                  />
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              <div className="space-y-2">
                <div className="text-sm font-normal text-white/95 border-b border-white/50 pb-1">
                  Recently opened SCL files
                </div>
                {recentSclFiles.length === 0 ? (
                  <p className="text-xs text-white/60">No SCL files opened yet. Click Open SCL to upload a .cid / .icd / .scd file.</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentSclFiles.map((f) => (
                      <button
                        key={f.name}
                        type="button"
                        onClick={() => {
                          try {
                            const parsed = parseRealSclXml(f.name, f.xml);
                            setLoadedIeds(parsed);
                            setSelectedIedId(parsed[0].id);
                            setOnline(false);
                            setMainTab('BROWSER');
                          } catch {
                            addStatus(`Could not re-open ${f.name}`, 'ERR');
                          }
                        }}
                        className="flex items-center gap-2 text-xs text-white/90 hover:text-[#f6df00] transition text-left"
                      >
                        <FileCode2 className="w-4 h-4 shrink-0" />
                        <span className="truncate">{f.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <div className="text-sm font-normal text-white/95 border-b border-white/50 pb-1">
                  Recently discovered IEDs
                </div>
                {recentIeds.length === 0 ? (
                  <p className="text-xs text-white/60">No IEDs discovered yet. Click Discover IED to connect.</p>
                ) : (
                  <div className="space-y-1.5">
                    {recentIeds.map((entry) => (
                      <button
                        key={entry}
                        type="button"
                        onClick={() => {
                          const matched = storeIeds.find((i) => entry.startsWith(i.name));
                          handleDiscoverStoreIed(matched?.id);
                        }}
                        className="flex items-center gap-2 text-xs text-white/90 hover:text-[#f6df00] transition text-left"
                      >
                        <Wifi className="w-4 h-4 shrink-0" />
                        <span className="truncate">{entry}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. TAB 2: BROWSER (EXACT REAL IEDSCOUT 3-PANE TREE & DETAILS) */}
      {mainTab === 'BROWSER' && (
        <div className="flex-1 flex flex-col bg-[#f5f7fa]">
          {/* Browser Ribbon — Exact OMICRON IEDScout 4.20 Symbols & Full Feature Set */}
          <div className="iedscout-ribbon bg-[#f2f4f8] border-b border-[#c5d0dc] px-2 py-1 flex flex-wrap items-stretch gap-1 overflow-x-auto">
            {/* Application */}
            <div className="flex flex-col justify-between border-r border-[#cdd6e0] pr-2">
              <div className="flex items-center gap-0.5">
                <button type="button" className={ribbonBtnCls} onClick={() => sclInputRef.current?.click()}>
                  <FolderOpen className="w-5 h-5 text-[#465565]" />
                  <span>Open<br />SCL</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedIed}
                  className={ribbonBtnCls}
                  onClick={() => {
                    if (!selectedIed) return;
                    const srcExt = selectedIed.sclPath.split('.').pop()?.toLowerCase();
                    // Default ICD -> CID conversion automatically when an ICD is loaded
                    setSaveSclFormat(srcExt === 'icd' ? 'cid' : (['cid', 'icd', 'iid', 'scd'].includes(srcExt || '') ? (srcExt as SclExportFormat) : 'cid'));
                    setSaveSclIedName(selectedIed.name);
                    setSaveSclOpen(true);
                  }}
                >
                  <Save className="w-5 h-5 text-[#465565]" />
                  <span>Save<br />SCL</span>
                </button>
                <button type="button" className={ribbonBtnCls} onClick={() => setDiscoverOpen(true)}>
                  <Search className="w-5 h-5 text-[#465565]" />
                  <span>Discover<br />IED</span>
                </button>
                <button type="button" disabled={!selectedIed} className={ribbonBtnCls} onClick={handleCloseIed}>
                  <X className="w-5 h-5 text-[#465565]" />
                  <span>Close<br />IED</span>
                </button>
              </div>
              <div className="iedscout-grp-lbl text-[9.5px] text-center">Application</div>
            </div>

            {/* IED */}
            <div className="flex flex-col justify-between border-r border-[#cdd6e0] pr-2">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={!selectedIed}
                  className={`${ribbonBtnCls} ${online ? 'bg-[#d8ecff] ring-1 ring-[#0e5397]' : ''}`}
                  onClick={() => {
                    const next = !online;
                    setOnline(next);
                    addStatus(`${selectedIed?.name} switched ${next ? 'ONLINE (MMS Associated)' : 'OFFLINE'}.`);
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke={online ? '#15803d' : '#465565'} strokeWidth="2">
                    <path d="M4 4l5 5M15 15l5 5M8 12l4-4 4 4-4 4-4-4z" />
                  </svg>
                  <span>Online</span>
                </button>
                <button type="button" disabled={!selectedIed} className={ribbonBtnCls} onClick={() => setPropsOpen(true)}>
                  <Info className="w-5 h-5 text-[#465565]" />
                  <span>IED<br />properties</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedIed || selectedIed.gooses.length === 0}
                  className={ribbonBtnCls}
                  onClick={() => {
                    const g = selectedIed?.gooses[0];
                    if (g && selectedIed) {
                      addToMonitor({
                        key: `G-${selectedIed.id}-${g.name}`,
                        ref: `${selectedIed.name}${g.ldInst}/${g.lnName}.${g.name} (${g.appId})`,
                        fc: 'GOOSE',
                        value: `stNum=${g.stNum}, sqNum=${g.sqNum}`,
                        quality: 'Healthy',
                        updatedAt: fmtTime(),
                      });
                    }
                  }}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-[#465565] text-white font-bold text-[11px]">G</span>
                  <span>Subscribe<br />GOOSE</span>
                </button>
                <button type="button" disabled={!selectedIed} className={ribbonBtnCls} onClick={() => setMainTab('SIMULATOR')}>
                  <Play className="w-5 h-5 text-[#465565]" />
                  <span>Simulate</span>
                </button>
              </div>
              <div className="iedscout-grp-lbl text-[9.5px] text-center">IED</div>
            </div>

            {/* Data */}
            <div className="flex flex-col justify-between border-r border-[#cdd6e0] pr-2">
              <div className="flex items-center gap-0.5">
                <button type="button" disabled={!online || !selectedLn} className={ribbonBtnCls} onClick={handleReadAll}>
                  <RefreshCw className="w-5 h-5 text-[#465565]" />
                  <span>Read</span>
                </button>
                <button type="button" disabled={!online || !selectedLn} className={ribbonBtnCls} onClick={handleReadAll}>
                  <Database className="w-5 h-5 text-[#465565]" />
                  <span>Read<br />all</span>
                </button>
                <button
                  type="button"
                  disabled={!online || !selectedLn}
                  className={ribbonBtnCls}
                  onClick={() => {
                    const firstDo = selectedLn?.dos[0];
                    if (selectedIed && selectedLn && firstDo) {
                      setWriteRef(`${selectedIed.name}${selectedLn.ldInst}/${selectedLn.name}.${firstDo.name}`);
                      setWriteVal(firstDo.value || 'TRUE');
                      setWriteOpen(true);
                    }
                  }}
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="#465565" strokeWidth="1.8">
                    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
                  </svg>
                  <span>Write</span>
                </button>
                <button type="button" disabled={!online || !selectedIed} className={ribbonBtnCls} onClick={() => setControlOpen(true)}>
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm border border-[#465565] text-[#465565] font-bold text-[9px]">DO</span>
                  <span>Control</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedIed}
                  className={ribbonBtnCls}
                  onClick={() => {
                    if (selectedIed?.bayId) {
                      const bayId = selectedIed.bayId;
                      resetProtectionTrip(bayId);
                      const st: any = useSubstationStore.getState();
                      if (typeof st.resetMasterTripLockout === 'function') st.resetMasterTripLockout(bayId);
                      else if (typeof st.resetLockout86 === 'function') st.resetLockout86(bayId);
                      // Ensure ANSI 86 masterTripLockout, interlockPermissive & active bay alarms are cleanly reset
                      useSubstationStore.setState((prev: any) => ({
                        bays: (prev.bays || []).map((b: any) =>
                          b.id === bayId
                            ? {
                                ...b,
                                protectionTripActive: false,
                                masterTripLockout: false,
                                lockout86Active: false,
                                interlockPermissive: true,
                              }
                            : b
                        ),
                        alarms: Array.isArray(prev.alarms)
                          ? prev.alarms.map((a: any) =>
                              a.bayId === bayId || (selectedIed?.name && String(a.source || '').includes(selectedIed.name))
                                ? { ...a, active: false, cleared: true, status: 'CLEARED', state: 'CLEARED' }
                                : a
                            )
                          : prev.alarms,
                      }));
                    }
                    addStatus(`Cleared indications & reset ANSI 86 Lockout on ${selectedIed?.name}.`);
                  }}
                >
                  <Trash2 className="w-5 h-5 text-[#465565]" />
                  <span>Clear<br />indications</span>
                </button>
                <div className="flex flex-col gap-1 pl-1">
                  <button
                    type="button"
                    disabled={!selectedLn}
                    title="Copy selected Logical Node reference"
                    onClick={() => {
                      if (selectedIed && selectedLn) {
                        navigator.clipboard?.writeText(`${selectedIed.name}${selectedLn.ldInst}/${selectedLn.name}`).catch(() => {});
                        addStatus(`Copied ${selectedIed.name}${selectedLn.ldInst}/${selectedLn.name}`);
                      }
                    }}
                    className="p-0.5 rounded hover:bg-[#dce8f6] disabled:opacity-35"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#465565]" />
                  </button>
                  <button
                    type="button"
                    disabled={!selectedLn || selectedLn.dos.length === 0}
                    title="Add first Data Object to Activity Monitor"
                    onClick={() => {
                      if (selectedIed && selectedLn && selectedLn.dos[0]) {
                        const d = selectedLn.dos[0];
                        addToMonitor({
                          key: `${selectedIed.id}/${selectedLn.ldInst}/${selectedLn.name}.${d.name}`,
                          ref: `${selectedIed.name}${selectedLn.ldInst}/${selectedLn.name}.${d.name}`,
                          fc: d.das[0]?.fc || 'ST',
                          value: d.value || '(offline)',
                          quality: online ? '0x0000 (Good)' : 'Offline',
                          updatedAt: fmtTime(),
                        });
                      }
                    }}
                    className="p-0.5 rounded hover:bg-[#dce8f6] disabled:opacity-35"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#465565]" />
                  </button>
                </div>
              </div>
              <div className="iedscout-grp-lbl text-[9.5px] text-center">Data</div>
            </div>

            {/* Services */}
            <div className="flex flex-col justify-between border-r border-[#cdd6e0] pr-2">
              <div className="flex items-center gap-0.5">
                <button
                  type="button"
                  disabled={!online || !selectedIed?.reports.length}
                  className={ribbonBtnCls}
                  onClick={() => addStatus(`Enabled ReportControl on ${selectedIed?.name}.`)}
                >
                  <Radio className="w-5 h-5 text-[#465565]" />
                  <span>Enable</span>
                </button>
                <button
                  type="button"
                  disabled={!online || !selectedIed}
                  className={ribbonBtnCls}
                  onClick={() => {
                    if (selectedIed?.isFromStore) triggerMmsGeneralInterrogation(selectedIed.id.replace(/^LIVE-/, ''));
                    addStatus(`General Interrogation (GI) sent to ${selectedIed?.name}.`);
                  }}
                >
                  <Zap className="w-5 h-5 text-[#465565]" />
                  <span>GI</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedIed}
                  className={ribbonBtnCls}
                  onClick={() => setAddDsOpen(true)}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-[#465565] text-white font-bold text-[9px]">DS+</span>
                  <span>Add<br />DataSet</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedIed?.settingGroups.length}
                  className={ribbonBtnCls}
                  onClick={() => {
                    if (selectedIed?.settingGroups[0]) {
                      setSelection({ kind: 'SG', ldInst: selectedIed.settingGroups[0].ldInst });
                    }
                  }}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm bg-[#465565] text-white font-bold text-[9px]">SG</span>
                  <span>Setting<br />Groups</span>
                </button>
                <button
                  type="button"
                  disabled={!selectedIed || selectedIed.gooses.length === 0}
                  className={ribbonBtnCls}
                  onClick={() => {
                    const g = selectedIed?.gooses[0];
                    if (g && selectedIed) {
                      navigator.clipboard?.writeText(`${selectedIed.name}${g.ldInst}/${g.lnName}$GO$${g.name} (${g.appId})`).catch(() => {});
                      addStatus(`Copied GOOSE control block: ${g.lnName}.${g.name} (${g.appId})`);
                    }
                  }}
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-sm border border-[#465565] text-[#465565] font-bold text-[9px]">GG</span>
                  <span>Copy<br />GOOSE</span>
                </button>
              </div>
              <div className="iedscout-grp-lbl text-[9.5px] text-center">Services</div>
            </div>

            {/* Show + Default / Browse layout */}
            <div className="flex flex-col justify-between pl-1">
              <div className="space-y-1">
                <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-[10.5px]">
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={showNav} onChange={(e) => setShowNav(e.target.checked)} />
                    <span>Navigation</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={showDetails} onChange={(e) => setShowDetails(e.target.checked)} />
                    <span>Details</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={showMonitor} onChange={(e) => setShowMonitor(e.target.checked)} />
                    <span>Monitor</span>
                  </label>
                  <label className="inline-flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={showDescriptions} onChange={(e) => setShowDescriptions(e.target.checked)} />
                    <span>Descriptions</span>
                  </label>
                </div>
                <div className="flex items-center gap-2 text-[10px] pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('DEFAULT');
                      setShowNav(true);
                      setShowDetails(true);
                      setShowMonitor(true);
                    }}
                    className={`px-1.5 py-0.5 rounded border ${
                      layoutMode === 'DEFAULT' ? 'bg-[#d8ecff] border-[#0e5397] font-bold' : 'border-transparent hover:bg-[#dce8f6]'
                    }`}
                  >
                    Default layout
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setLayoutMode('BROWSE');
                      setShowNav(true);
                      setShowDetails(true);
                      setShowMonitor(false);
                    }}
                    className={`px-1.5 py-0.5 rounded border ${
                      layoutMode === 'BROWSE' ? 'bg-[#d8ecff] border-[#0e5397] font-bold' : 'border-transparent hover:bg-[#dce8f6]'
                    }`}
                  >
                    Browse layout
                  </button>
                </div>
              </div>
              <div className="iedscout-grp-lbl text-[9.5px] text-center">Show</div>
            </div>
          </div>

          {/* 3-Pane Split Workspace */}
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-235px)]">
            {/* LEFT PANE: Dark Slate IEDs Tree (EXACT GOOSE / Reports / Setting Groups / Files / DataSets / Data Model) */}
            {showNav && (
              <div className="lg:col-span-3 bg-[#465565] text-white flex flex-col border-r border-[#b8c4d0]">
                <div className="p-3 space-y-2 border-b border-white/15">
                  <div className="text-sm font-bold tracking-wide">IEDs</div>
                  <select
                    aria-label="Selected IED"
                    value={selectedIed?.id || ''}
                    onChange={(e) => setSelectedIedId(e.target.value)}
                    className="w-full rounded-sm border border-white/30 bg-[#32404e] px-2.5 py-2 text-[13px] font-mono font-semibold text-white"
                  >
                    {loadedIeds.length === 0 ? (
                      <option value="">(No IED loaded — Open SCL or Discover IED)</option>
                    ) : (
                      loadedIeds.map((i) => (
                        <option key={i.id} value={i.id}>
                          {i.name}
                        </option>
                      ))
                    )}
                  </select>
                  {selectedIed && (
                    <div className="text-[12px] font-mono text-white/85 space-y-1 pt-1">
                      <div>IP address: <span className="text-white font-semibold">{selectedIed.ip}</span></div>
                      <div className="truncate" title={selectedIed.sclPath}>
                        SCL path: <span className="text-white font-semibold">{selectedIed.sclPath}</span>
                      </div>
                    </div>
                  )}
                </div>

                {selectedIed && (
                  <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 text-[13px] max-h-[calc(100vh-310px)]">
                    {/* 1. GOOSE */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenCat((p) => ({ ...p, GOOSE: !p.GOOSE }))}
                        className="w-full flex items-center gap-1.5 py-1 text-[13px] font-semibold text-white hover:text-white"
                      >
                        {openCat.GOOSE ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>GOOSE</span>
                      </button>
                      {openCat.GOOSE && (
                        <div className="pl-3 space-y-0.5">
                          {selectedIed.lds.map((ld) => {
                            const gList = selectedIed.gooses.filter((g) => g.ldInst === ld);
                            if (gList.length === 0) return null;
                            return (
                              <div key={`g-${ld}`}>
                                <div className="text-[12.5px] text-white/90 py-1 font-semibold">▾ LD {ld}</div>
                                <div className="pl-3 space-y-0.5">
                                  {gList.map((g) => {
                                    const active = selection?.kind === 'GOOSE' && selection.ldInst === ld && selection.name === g.name;
                                    return (
                                      <button
                                        key={g.name}
                                        type="button"
                                        onClick={() => setSelection({ kind: 'GOOSE', ldInst: ld, name: g.name })}
                                        className={`w-full text-left px-1.5 py-0.5 rounded-sm flex items-center font-mono text-[12.5px] py-1 ${
                                          active ? 'bg-[#1a73c9] text-white font-bold' : 'text-white/90 hover:bg-white/10'
                                        }`}
                                      >
                                        {badge('G')}
                                        <span className="truncate">{g.lnName}.{g.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 2. Reports */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenCat((p) => ({ ...p, Reports: !p.Reports }))}
                        className="w-full flex items-center gap-1.5 py-1 text-[13px] font-semibold text-white hover:text-white"
                      >
                        {openCat.Reports ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>Reports</span>
                      </button>
                      {openCat.Reports && (
                        <div className="pl-3 space-y-0.5">
                          {selectedIed.lds.map((ld) => {
                            const rList = selectedIed.reports.filter((r) => r.ldInst === ld);
                            if (rList.length === 0) return null;
                            return (
                              <div key={`r-${ld}`}>
                                <div className="text-[12.5px] text-white/90 py-1 font-semibold">▾ LD {ld}</div>
                                <div className="pl-3 space-y-0.5">
                                  <button
                                    type="button"
                                    onClick={() => setSelection({ kind: 'REPORT', ldInst: ld, lnName: 'LLN0' })}
                                    className={`w-full text-left px-1.5 py-0.5 rounded-sm flex items-center font-mono text-[12.5px] py-1 ${
                                      selection?.kind === 'REPORT' && selection.ldInst === ld
                                        ? 'bg-[#1a73c9] text-white font-bold'
                                        : 'text-white/90 hover:bg-white/10'
                                    }`}
                                  >
                                    {badge('LN')}
                                    <span>LLN0 ({rList.length})</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 3. Setting Groups */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenCat((p) => ({ ...p, SettingGroups: !p.SettingGroups }))}
                        className="w-full flex items-center gap-1.5 py-1 text-[13px] font-semibold text-white hover:text-white"
                      >
                        {openCat.SettingGroups ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>Setting Groups</span>
                      </button>
                      {openCat.SettingGroups && (
                        <div className="pl-4 space-y-0.5">
                          {(selectedIed.settingGroups.length > 0
                            ? selectedIed.settingGroups
                            : selectedIed.lds.slice(0, 1).map((ldInst) => ({ ldInst, numOfSGs: 4, actSG: 1 }))
                          ).map((sg) => (
                            <button
                              key={sg.ldInst}
                              type="button"
                              onClick={() => setSelection({ kind: 'SG', ldInst: sg.ldInst })}
                              className={`w-full text-left px-1.5 py-0.5 rounded-sm flex items-center font-mono text-[12.5px] py-1 ${
                                selection?.kind === 'SG' && selection.ldInst === sg.ldInst
                                  ? 'bg-[#1a73c9] text-white font-bold'
                                  : 'text-white/90 hover:bg-white/10'
                              }`}
                            >
                              {badge('SG')}
                              <span>{sg.ldInst}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 4. Files */}
                    <button
                      type="button"
                      onClick={() => setSelection({ kind: 'FILES' })}
                      className={`w-full text-left px-2 py-1 text-[13px] rounded-sm font-semibold ${
                        selection?.kind === 'FILES' ? 'bg-[#1a73c9] text-white' : 'text-white/90 hover:bg-white/10'
                      }`}
                    >
                      Files
                    </button>

                    {/* 5. DataSets */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenCat((p) => ({ ...p, DataSets: !p.DataSets }))}
                        className="w-full flex items-center gap-1.5 py-1 text-[13px] font-semibold text-white hover:text-white"
                      >
                        {openCat.DataSets ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>DataSets</span>
                      </button>
                      {openCat.DataSets && (
                        <div className="pl-3 space-y-0.5">
                          {selectedIed.lds.map((ld) => {
                            const dsList = selectedIed.datasets.filter((d) => d.ldInst === ld);
                            if (dsList.length === 0) return null;
                            return (
                              <div key={`ds-${ld}`}>
                                <div className="text-[12.5px] text-white/90 py-1 font-semibold">▾ LD {ld}</div>
                                <div className="pl-3 space-y-0.5">
                                  {dsList.map((ds) => {
                                    const active = selection?.kind === 'DATASET' && selection.ldInst === ld && selection.name === ds.name;
                                    return (
                                      <button
                                        key={ds.name}
                                        type="button"
                                        onClick={() => setSelection({ kind: 'DATASET', ldInst: ld, lnName: ds.lnName, name: ds.name })}
                                        className={`w-full text-left px-1.5 py-0.5 rounded-sm flex items-center font-mono text-[12.5px] py-1 ${
                                          active ? 'bg-[#1a73c9] text-white font-bold' : 'text-white/90 hover:bg-white/10'
                                        }`}
                                      >
                                        {badge('DS')}
                                        <span className="truncate">{ds.lnName}.{ds.name}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* 6. Data Model */}
                    <div>
                      <button
                        type="button"
                        onClick={() => setOpenCat((p) => ({ ...p, DataModel: !p.DataModel }))}
                        className="w-full flex items-center gap-1.5 py-1 text-[13px] font-semibold text-white hover:text-white"
                      >
                        {openCat.DataModel ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        <span>Data Model</span>
                      </button>
                      {openCat.DataModel && (
                        <div className="pl-3 space-y-0.5">
                          {selectedIed.lds.map((ld) => (
                            <div key={`dm-${ld}`}>
                              <div className="text-[12.5px] text-white/90 py-1 font-semibold">▾ LD {ld}</div>
                              <div className="pl-3 space-y-0.5">
                                {selectedIed.lns
                                  .filter((l) => l.ldInst === ld)
                                  .map((ln) => {
                                    const active = selection?.kind === 'LN' && selection.ldInst === ld && selection.lnName === ln.name;
                                    return (
                                      <button
                                        key={`${ld}-${ln.name}`}
                                        type="button"
                                        onClick={() => setSelection({ kind: 'LN', ldInst: ld, lnName: ln.name })}
                                        className={`w-full text-left px-1.5 py-0.5 rounded-sm flex items-center font-mono text-[12.5px] py-1 ${
                                          active ? 'bg-[#1a73c9] text-white font-bold' : 'text-white/90 hover:bg-white/10'
                                        }`}
                                      >
                                        {badge('LN')}
                                        <span className="truncate">{ln.name}</span>
                                      </button>
                                    );
                                  })}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* MIDDLE PANE: White Details View (Matches screenshot breadcrumb + Name / Value expandable DO rows) */}
            {showDetails && (
              <div
                className={`${
                  showNav && showMonitor ? 'lg:col-span-4' : showNav || showMonitor ? 'lg:col-span-7' : 'lg:col-span-12'
                } iedscout-light-pane bg-white border-r border-[#c5d0dc] flex flex-col`}
              >
                <div className="bg-[#465565] text-white px-2.5 py-1.5 text-[11px] font-semibold truncate min-h-[28px]">
                  {middleHeaderTitle}
                </div>

                {!selectedIed || !selection ? (
                  <div className="flex-1 bg-white" />
                ) : selection.kind === 'LN' && selectedLn ? (
                  <div className="flex-1 overflow-auto max-h-[calc(100vh-275px)]">
                    <div className="px-2.5 py-1.5 border-b border-[#cbd5e1] bg-[#f8fafc] flex items-center text-[11.5px] text-[#1e293b]">
                      {badge('LN')}
                      <span className="font-bold mr-2">{selectedLn.name}</span>
                      <span className="text-[#475569]">{selectedLn.desc}</span>
                    </div>
                    <table className="w-full text-left border-collapse text-[11.5px] font-sans">
                      <thead className="sticky top-0 z-10" style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }}>
                        <tr style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }}>
                          <th style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }} className="py-1 px-2.5 font-normal border-r border-[#c8d2dc] w-[58%]">Name</th>
                          <th style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }} className="py-1 px-2.5 font-normal">Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedLn.dos.map((d) => {
                          const doKey = `${selectedIed.id}/${selectedLn.ldInst}/${selectedLn.name}.${d.name}`;
                          const isOpen = Boolean(expandedDo[doKey]);
                          const displayVal = liveOverrides[doKey] ?? d.value;
                          const isDoSel = selectedDetailRow === doKey;
                          return (
                            <React.Fragment key={doKey}>
                              <tr
                                draggable
                                onDragStart={(e) =>
                                  e.dataTransfer.setData(
                                    'application/json',
                                    JSON.stringify({
                                      key: doKey,
                                      ref: `${selectedIed.name}${selectedLn.ldInst}/${selectedLn.name}.${d.name}`,
                                      fc: d.das[0]?.fc || 'ST',
                                      value: displayVal || '(offline)',
                                    })
                                  )
                                }
                                onClick={() => {
                                  setSelectedDetailRow(doKey);
                                  setExpandedDo((p) => ({ ...p, [doKey]: !isOpen }));
                                }}
                                className={`cursor-pointer ${isDoSel ? 'iedscout-row-selected' : 'iedscout-row-do'}`}
                              >
                                <td className="py-1 px-2 border-r border-white">
                                  <span className="inline-flex items-center">
                                    {isOpen ? (
                                      <ChevronDown className="w-3 h-3 mr-1 shrink-0" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 mr-1 shrink-0" />
                                    )}
                                    {badge('DO', '#2b7cd3')}
                                    <span>{d.name}</span>
                                  </span>
                                </td>
                                <td className="py-1 px-2.5">{displayVal}</td>
                              </tr>
                              {isOpen &&
                                d.das.map((da) => {
                                  const daKey = `${doKey}.${da.name}`;
                                  const hasChildren = Boolean(da.children && da.children.length > 0);
                                  const daOpen = Boolean(expandedSub[daKey]);
                                  const isDaSel = selectedDetailRow === daKey;
                                  return (
                                    <React.Fragment key={daKey}>
                                      <tr
                                        draggable
                                        onDragStart={(e) =>
                                          e.dataTransfer.setData(
                                            'application/json',
                                            JSON.stringify({
                                              key: daKey,
                                              ref: `${selectedIed.name}${selectedLn.ldInst}/${selectedLn.name}.${d.name}.${da.name}`,
                                              fc: da.fc,
                                              value: da.value || '(offline)',
                                            })
                                          )
                                        }
                                        onClick={() => {
                                          setSelectedDetailRow(daKey);
                                          if (hasChildren) setExpandedSub((p) => ({ ...p, [daKey]: !daOpen }));
                                        }}
                                        className={`cursor-pointer ${isDaSel ? 'iedscout-row-selected' : 'iedscout-row-da'}`}
                                      >
                                        <td className="py-1 pl-5 pr-2.5 border-r border-white">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="inline-flex items-center">
                                              {hasChildren ? (
                                                daOpen ? (
                                                  <ChevronDown className="w-3 h-3 mr-1 shrink-0" />
                                                ) : (
                                                  <ChevronRight className="w-3 h-3 mr-1 shrink-0" />
                                                )
                                              ) : (
                                                <span className="inline-block w-4 shrink-0" />
                                              )}
                                              {badge('DA', '#2b7cd3')}
                                              <span>{da.name}</span>
                                            </span>
                                            <span className="iedscout-fc text-[11px] shrink-0">[{da.fc}]</span>
                                          </div>
                                        </td>
                                        <td className="py-1 px-2.5">{da.value}</td>
                                      </tr>
                                      {hasChildren &&
                                        daOpen &&
                                        da.children!.map((sub) => {
                                          const subKey = `${daKey}.${sub.name}`;
                                          const subHasKids = Boolean(sub.children && sub.children.length > 0);
                                          const subOpen = Boolean(expandedSub[subKey]);
                                          const isSubSel = selectedDetailRow === subKey;
                                          return (
                                            <React.Fragment key={subKey}>
                                              <tr
                                                onClick={() => {
                                                  setSelectedDetailRow(subKey);
                                                  if (subHasKids) setExpandedSub((p) => ({ ...p, [subKey]: !subOpen }));
                                                }}
                                                className={`cursor-pointer ${isSubSel ? 'iedscout-row-selected' : 'iedscout-row-sub'}`}
                                              >
                                                <td className="py-1 pl-12 pr-2.5 border-r border-white">
                                                  <span className="inline-flex items-center">
                                                    {subHasKids ? (
                                                      subOpen ? (
                                                        <ChevronDown className="w-3 h-3 mr-1.5 shrink-0" />
                                                      ) : (
                                                        <ChevronRight className="w-3 h-3 mr-1.5 shrink-0" />
                                                      )
                                                    ) : (
                                                      <span className="inline-block w-4 shrink-0" />
                                                    )}
                                                    <span>{sub.name}</span>
                                                  </span>
                                                </td>
                                                <td className="py-1 px-2.5">{sub.value || ''}</td>
                                              </tr>
                                              {subHasKids &&
                                                subOpen &&
                                                sub.children!.map((leaf) => {
                                                  const leafKey = `${subKey}.${leaf.name}`;
                                                  const isLeafSel = selectedDetailRow === leafKey;
                                                  return (
                                                    <tr
                                                      key={leafKey}
                                                      onClick={() => setSelectedDetailRow(leafKey)}
                                                      className={`cursor-pointer ${isLeafSel ? 'iedscout-row-selected' : 'iedscout-row-sub'}`}
                                                    >
                                                      <td className="py-1 pl-20 pr-2.5 border-r border-white">{leaf.name}</td>
                                                      <td className="py-1 px-2.5">{leaf.value || ''}</td>
                                                    </tr>
                                                  );
                                                })}
                                            </React.Fragment>
                                          );
                                        })}
                                    </React.Fragment>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                        {selectedLn.dos.length === 0 && (
                          <tr>
                            <td colSpan={2} className="p-4 text-center iedscout-muted">
                              No Data Objects defined in this Logical Node.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : selection.kind === 'GOOSE' ? (
                  <div className="p-3 font-mono text-[11px] space-y-2">
                    {(() => {
                      const g = selectedIed.gooses.find((x) => x.ldInst === selection.ldInst && x.name === selection.name);
                      if (!g) return null;
                      return (
                        <table className="w-full border-collapse">
                          <tbody className="divide-y divide-[#e2e8f0]">
                            {[
                              ['GoCB Name', `${g.lnName}.${g.name}`],
                              ['DataSet', g.datSet || '(none)'],
                              ['APPID', g.appId],
                              ['Multicast MAC', g.mac],
                              ['VLAN-ID / Priority', `${g.vlanId} / ${g.vlanPrio}`],
                              ['confRev', String(g.confRev)],
                              ['MinTime / MaxTime', `${g.minTime} ms / ${g.maxTime} ms`],
                            ].map(([k, v]) => (
                              <tr key={k}>
                                <td className="py-1.5 pr-3 font-sans font-semibold text-[#475569]">{k}</td>
                                <td className="py-1.5 font-bold text-[#0f172a]">{v}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      );
                    })()}
                  </div>
                ) : selection.kind === 'DATASET' ? (
                  <div className="p-3 font-mono text-[11px] space-y-1.5 overflow-auto max-h-[calc(100vh-275px)]">
                    {(() => {
                      const ds = selectedIed.datasets.find((x) => x.ldInst === selection.ldInst && x.name === selection.name);
                      if (!ds) return null;
                      return (
                        <>
                          <div className="font-sans font-bold text-[#0e5397] pb-1 border-b border-[#cbd5e1]">
                            DataSet {ds.lnName}.{ds.name} ({ds.fcdas.length} FCDAs)
                          </div>
                          {ds.fcdas.map((f, i) => (
                            <div key={i} className="py-1 border-b border-[#e2e8f0] text-[#0f172a]">
                              {i + 1}. {f}
                            </div>
                          ))}
                        </>
                      );
                    })()}
                  </div>
                ) : selection.kind === 'REPORT' ? (
                  <div className="p-3 font-mono text-[11px] space-y-2 overflow-auto">
                    {selectedIed.reports
                      .filter((r) => r.ldInst === selection.ldInst)
                      .map((r) => (
                        <div key={r.name} className="rounded border border-[#cbd5e1] p-2 bg-[#f8fafc] space-y-0.5">
                          <div className="font-bold text-[#0e5397]">{r.name} ({r.buffered ? 'BRCB' : 'URCB'})</div>
                          <div>rptID: {r.rptId}</div>
                          <div>datSet: {r.datSet} · intgPd: {r.intgPd} ms · confRev: {r.confRev}</div>
                        </div>
                      ))}
                  </div>
                ) : selection.kind === 'SG' ? (
                  <div className="p-3 font-mono text-[11px] space-y-1.5">
                    {selectedIed.settingGroups
                      .filter((s) => s.ldInst === selection.ldInst)
                      .map((s) => (
                        <div key={s.ldInst} className="space-y-1">
                          <div>Logical Device: <b>{s.ldInst}</b></div>
                          <div>Active Setting Group (ActSG): <b>{s.actSG}</b></div>
                          <div>Number of Setting Groups (NumOfSG): <b>{s.numOfSGs}</b></div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="p-3 font-mono text-[11px] text-[#475569]">
                    Loaded SCL File: <b>{selectedIed.sclPath}</b>
                  </div>
                )}
              </div>
            )}

            {/* RIGHT PANE: Activity Monitor */}
            {showMonitor && (
              <div
                className={`${
                  showNav && showDetails ? 'lg:col-span-5' : showNav || showDetails ? 'lg:col-span-5' : 'lg:col-span-12'
                } iedscout-light-pane bg-white flex flex-col relative overflow-hidden`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverMonitor(true);
                }}
                onDragLeave={() => setDragOverMonitor(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverMonitor(false);
                  try {
                    const data = JSON.parse(e.dataTransfer.getData('application/json'));
                    if (data?.key) {
                      addToMonitor({
                        key: data.key,
                        ref: data.ref,
                        fc: data.fc || 'ST',
                        value: data.value || '',
                        quality: online ? '0x0000 (Good)' : 'Offline',
                        updatedAt: fmtTime(),
                      });
                    }
                  } catch {
                    // Ignore
                  }
                }}
              >
                <div className="bg-[#465565] text-white px-2.5 py-1.5 flex items-center justify-between text-[11px] font-semibold">
                  <span>Activity Monitor</span>
                  {monitored.length > 0 && (
                    <button type="button" onClick={() => setMonitored([])} className="text-[10px] text-white/80 hover:text-[#f6df00]">
                      Clear all
                    </button>
                  )}
                </div>

                <div
                  className={`relative flex-1 p-3 overflow-y-auto max-h-[calc(100vh-300px)] transition ${
                    dragOverMonitor ? 'bg-[#eff6ff] ring-2 ring-inset ring-[#0e5397]' : ''
                  }`}
                >
                  <TowerWatermark />
                  {monitored.length === 0 ? (
                    <div className="relative z-10 h-full min-h-[300px] flex items-center justify-center text-center px-6">
                      <p className="iedscout-muted text-xs sm:text-sm text-[#475569] max-w-xs">
                        Use &apos;drag and drop&apos; to monitor GOOSE, Reports, DataSets, Data Objects and Data Attributes.
                      </p>
                    </div>
                  ) : (
                    <div className="relative z-10 space-y-2" style={{ transform: `scale(${zoomPct / 100})`, transformOrigin: 'top left' }}>
                      {monitored.map((m) => (
                        <div key={m.key} className="rounded border border-[#cbd5e1] bg-white/95 p-2 shadow-sm flex items-center justify-between gap-2 font-mono text-[11px]">
                          <div className="min-w-0">
                            <div className="font-bold text-[#0e5397] truncate">{m.ref}</div>
                            <div className="text-[10px] text-[#64748b]">FC: {m.fc} · {m.quality} · {m.updatedAt}</div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="rounded bg-[#dcfce7] border border-[#86efac] px-2 py-0.5 font-extrabold text-[#166534]">{m.value}</span>
                            <button type="button" onClick={() => setMonitored((p) => p.filter((x) => x.key !== m.key))} className="text-[#94a3b8] hover:text-[#dc2626]">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="bg-[#f1f5f9] border-t border-[#cbd5e1] px-2.5 py-1 flex items-center justify-between text-[11px] text-[#334155]">
                  <label className="inline-flex items-center gap-1.5">
                    <span>Polling:</span>
                    <select value={pollingSec} onChange={(e) => setPollingSec(Number(e.target.value))} style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#94a3b8' }} className="iedscout-light-select rounded border px-1.5 py-0.5 text-[11px]">
                      <option value={1}>1 s</option>
                      <option value={2}>2 s</option>
                      <option value={5}>5 s</option>
                      <option value={0}>Off</option>
                    </select>
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span>{zoomPct}%</span>
                    <input type="range" min={80} max={120} step={10} value={zoomPct} onChange={(e) => setZoomPct(Number(e.target.value))} className="w-20 accent-[#0e5397]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. TAB 3: SIMULATOR */}
      {mainTab === 'SIMULATOR' && (
        <div className="flex-1 flex flex-col bg-[#f5f7fa]">
          <div className="bg-[#f2f4f8] border-b border-[#c5d0dc] px-2 py-1 flex flex-wrap items-stretch gap-1">
            <div className="flex flex-col justify-between border-r border-[#cdd6e0] pr-2">
              <div className="flex items-center gap-0.5">
                <button type="button" className={ribbonBtnCls} onClick={() => sclInputRef.current?.click()}>
                  <FolderOpen className="w-4 h-4 text-[#0e5397]" />
                  <span>Open SCL</span>
                </button>
                <button type="button" disabled={!selectedIed || simRunning} onClick={() => { setSimRunning(true); addStatus(`Started Simulator for ${selectedIed?.name}.`); }} className={`${ribbonBtnCls} ${simRunning ? 'bg-[#dcfce7]' : ''}`}>
                  <Play className="w-4 h-4 text-[#15803d]" />
                  <span>Start</span>
                </button>
                <button type="button" disabled={!simRunning} onClick={() => { setSimRunning(false); addStatus(`Stopped Simulator.`, 'WARN'); }} className={ribbonBtnCls}>
                  <Square className="w-4 h-4 text-[#b91c1c]" />
                  <span>Stop</span>
                </button>
              </div>
              <div className="text-[9.5px] text-center text-[#5f7082]">Application</div>
            </div>
            <div className="flex flex-col justify-between pl-1">
              <div className="flex items-center gap-2 pt-2 text-[11px] font-mono">
                <span className={`font-bold ${simRunning ? 'text-[#15803d]' : 'text-[#64748b]'}`}>
                  {simRunning ? `● SIMULATING ${selectedIed?.name}` : '■ STOPPED'}
                </span>
              </div>
              <div className="text-[9.5px] text-center text-[#5f7082]">Status</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-235px)]">
            <div className="lg:col-span-3 bg-[#0e5397] text-white p-3 space-y-3 border-r border-[#083868]">
              <div className="text-sm font-bold">IEDs</div>
              <select value={selectedIed?.id || ''} onChange={(e) => setSelectedIedId(e.target.value)} className="w-full rounded-sm border border-white/40 bg-[#093e74] px-2.5 py-2 text-[13px] font-mono font-semibold text-white">
                {loadedIeds.length === 0 ? <option value="">(Open SCL to simulate an IED)</option> : loadedIeds.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
            <div className="lg:col-span-4 iedscout-light-pane bg-white border-r border-[#c5d0dc] p-4 space-y-3">
              {selectedIed ? (
                <div className="space-y-2.5 font-mono text-[11px]">
                  <div className="font-sans text-xs font-bold text-[#0e5397]">Simulated Values ({selectedIed.name})</div>
                  <label className="flex items-center justify-between rounded border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2">
                    <span>XCBR1.Pos.stVal</span>
                    <select value={simCbVal} onChange={(e) => setSimCbVal(e.target.value as 'OPEN' | 'CLOSED')} className="rounded border border-[#94a3b8] bg-white px-2 py-0.5 font-bold">
                      <option value="CLOSED">10 (CLOSED)</option>
                      <option value="OPEN">01 (OPEN)</option>
                    </select>
                  </label>
                  <label className="flex items-center justify-between rounded border border-[#cbd5e1] bg-[#f8fafc] px-3 py-2 cursor-pointer">
                    <span>PTRC1.Tr.general</span>
                    <input type="checkbox" checked={simTripVal} onChange={(e) => setSimTripVal(e.target.checked)} />
                  </label>
                  <button
                    type="button"
                    disabled={!simRunning}
                    onClick={() => {
                      const nextSt = simStNum + 1;
                      setSimStNum(nextSt);
                      setSimSqNum(0);
                      if (selectedIed.bayId) {
                        if (simTripVal) triggerProtectionTrip(selectedIed.bayId, 'IEDScout Sim Trip');
                        else {
                          resetProtectionTrip(selectedIed.bayId);
                          commandBreaker(selectedIed.bayId, simCbVal, 'SCADA_SBO');
                        }
                      }
                      addStatus(`Simulator published stNum=${nextSt}, sqNum=0 (CB=${simCbVal}, Trip=${simTripVal}).`);
                    }}
                    className="w-full rounded bg-[#0e5397] disabled:opacity-40 text-white font-bold py-2"
                  >
                    Set values &amp; Publish GOOSE
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#64748b]">Open an SCL file to simulate an IED.</p>
              )}
            </div>
            <div className="lg:col-span-5 bg-white flex flex-col relative overflow-hidden">
              <div className="bg-[#0e5397] text-white px-2.5 py-1.5 text-[11px] font-semibold">Activity Monitor</div>
              <div className="relative flex-1 p-3">
                <TowerWatermark />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. TAB 4: SNIFFER */}
      {mainTab === 'SNIFFER' && (
        <div className="flex-1 flex flex-col bg-[#f5f7fa]">
          <div className="bg-[#f2f4f8] border-b border-[#c5d0dc] px-2 py-1 flex flex-wrap items-stretch gap-1 overflow-x-auto">
            <div className="flex flex-col justify-between border-r border-[#cdd6e0] pr-2">
              <div className="flex items-center gap-0.5">
                <button type="button" onClick={() => { setSnifferRunning(true); setSnifferPaused(false); setSnifferStartTs(Date.now()); }} className={`${ribbonBtnCls} ${snifferRunning && !snifferPaused ? 'bg-[#dcfce7]' : ''}`}>
                  <Play className="w-4 h-4 text-[#15803d]" />
                  <span>Start</span>
                </button>
                <button type="button" disabled={!snifferRunning} onClick={() => setSnifferPaused((p) => !p)} className={ribbonBtnCls}>
                  <Pause className="w-4 h-4 text-[#b45309]" />
                  <span>Pause</span>
                </button>
                <button type="button" disabled={!snifferRunning} onClick={() => { setSnifferRunning(false); setSnifferPaused(false); }} className={ribbonBtnCls}>
                  <Square className="w-4 h-4 text-[#b91c1c]" />
                  <span>Stop</span>
                </button>
                <button type="button" onClick={() => { setSnifferMsgs([]); setSelectedSniffId(null); }} className={ribbonBtnCls}>
                  <Trash2 className="w-4 h-4 text-[#64748b]" />
                  <span>Clear</span>
                </button>
                <button type="button" onClick={() => setSnifferAutoScroll((v) => !v)} className={`${ribbonBtnCls} ${snifferAutoScroll ? 'bg-[#93c5fd]/70 ring-1 ring-[#0e5397]' : ''}`}>
                  <Activity className="w-4 h-4 text-[#0e5397]" />
                  <span>Auto scroll</span>
                </button>
              </div>
              <div className="text-[9.5px] text-center text-[#5f7082]">Capture</div>
            </div>
            <div className="flex flex-col justify-between pl-1">
              <div className="flex items-center gap-1">
                {(['IED', 'GOOSE', 'RETRANS', 'REPORT', 'CS', 'ERROR'] as const).map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setSnifferFilters((p) => ({ ...p, [k]: !p[k] }))}
                    className={`px-2.5 py-2 rounded-sm text-[10.5px] font-semibold border ${
                      snifferFilters[k] ? 'bg-[#90c2f0] border-[#0e5397] text-[#0f172a]' : 'bg-[#e8edf3] border-[#cbd5e1] text-[#64748b]'
                    }`}
                  >
                    {k === 'RETRANS' ? 'Retrans.' : k === 'CS' ? 'C/S' : k === 'ERROR' ? 'Protocol error' : k}
                  </button>
                ))}
              </div>
              <div className="text-[9.5px] text-center text-[#5f7082]">Filter</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[calc(100vh-235px)]">
            <div className="lg:col-span-8 iedscout-light-pane bg-white border-r border-[#c5d0dc] flex flex-col">
              <div className="bg-[#465565] text-white px-2.5 py-1 text-[11px] font-semibold">Messages ({filteredSnifferMsgs.length})</div>
              <div className="p-1.5 border-b border-[#cbd5e1] bg-[#f8fafc] flex items-center gap-1.5">
                <input
                  value={snifferSearch}
                  onChange={(e) => setSnifferSearch(e.target.value)}
                  placeholder="Filter messages..."
                  style={{ backgroundColor: '#ffffff', color: '#111827', borderColor: '#94a3b8' }}
                  className="iedscout-light-select w-72 max-w-full rounded-sm border px-2 py-0.5 text-[11px]"
                />
                <Search className="w-3.5 h-3.5 text-[#475569]" />
              </div>
              <div className="flex-1 overflow-auto max-h-[calc(100vh-300px)]">
                <table className="w-full text-left border-collapse font-mono text-[11.5px]">
                  <thead className="sticky top-0 z-10" style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }}>
                    <tr style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }}>
                      <th style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }} className="py-1.5 px-2 font-semibold border-r border-[#cbd5e1]">Time</th>
                      <th style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }} className="py-1.5 px-2 font-semibold border-r border-[#cbd5e1]">Relative time</th>
                      <th style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }} className="py-1.5 px-2 font-semibold border-r border-[#cbd5e1]">Source</th>
                      <th style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }} className="py-1.5 px-2 font-semibold border-r border-[#cbd5e1]">Destination</th>
                      <th style={{ backgroundColor: '#f1f4f8', color: '#1f2937' }} className="py-1.5 px-2 font-semibold">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e2e8f0]">
                    {filteredSnifferMsgs.map((m) => {
                      const isSel = selectedSniffMsg?.id === m.id;
                      return (
                        <tr
                          key={m.id}
                          onClick={() => setSelectedSniffId(m.id)}
                          className={`cursor-pointer ${isSel ? 'iedscout-sniff-selected' : 'iedscout-sniff-row bg-white'}`}
                        >
                          <td className="py-1 px-2 whitespace-nowrap">{m.time}</td>
                          <td className="py-1 px-2 whitespace-nowrap">{m.relSec}</td>
                          <td className="py-1 px-2 whitespace-nowrap font-bold">{m.source}</td>
                          <td className="py-1 px-2 whitespace-nowrap">{m.destination}</td>
                          <td className="py-1 px-2">{m.description}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="lg:col-span-4 iedscout-light-pane bg-white flex flex-col">
              <div className="bg-[#465565] text-white px-2.5 py-1 text-[11px] font-semibold">Details</div>
              <div className="p-3 font-mono text-[11px] space-y-1.5 text-[#1e293b]">
                {selectedSniffMsg ? (
                  <>
                    <div className="font-bold text-[#0e5397]">{selectedSniffMsg.description}</div>
                    {selectedSniffMsg.details.map((d, i) => <div key={i}>• {d}</div>)}
                  </>
                ) : (
                  <div className="text-[#64748b]">Select a message to inspect details.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 6. BOTTOM STATUS HISTORY BAR */}
      <div className="bg-[#1e242b] text-white border-t border-[#0f172a]">
        <div className="px-2 py-1 flex items-center justify-between text-[11px]">
          <button type="button" onClick={() => setStatusOpen((v) => !v)} className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#2d3540] hover:bg-[#3b4554] font-semibold">
            <span>Status History</span>
            {statusOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
          <span className="font-mono text-[10.5px] text-white/75 truncate max-w-[70%]">
            {statusHistory[0]?.time} — {statusHistory[0]?.text}
          </span>
        </div>
        {statusOpen && (
          <div className="max-h-36 overflow-y-auto border-t border-white/10 bg-[#14191f] px-3 py-1.5 font-mono text-[10.5px] space-y-1">
            {statusHistory.map((s) => (
              <div key={s.id} className="flex gap-2">
                <span className="text-[#94a3b8] shrink-0">{s.time}</span>
                <span className={s.level === 'ERR' ? 'text-[#f87171]' : s.level === 'WARN' ? 'text-[#facc15]' : 'text-[#86efac]'}>[{s.level}]</span>
                <span className="text-white/90">{s.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: DISCOVER IED */}
      {discoverOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-[#0e5397] bg-white text-[#1e293b] shadow-2xl overflow-hidden">
            <div className="bg-[#0e5397] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>Discover IED — Connect via IEC 61850 MMS (TCP/102)</span>
              <button type="button" onClick={() => setDiscoverOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold">IP Address</span>
                <input value={discoverIp} onChange={(e) => setDiscoverIp(e.target.value)} className="w-full rounded border border-[#94a3b8] px-2.5 py-1.5 font-mono" />
              </label>
              <div className="max-h-40 overflow-y-auto border border-[#cbd5e1] rounded divide-y divide-[#e2e8f0]">
                {storeIeds.map((i) => (
                  <button key={i.id} type="button" onClick={() => handleDiscoverStoreIed(i.id)} className="w-full text-left px-2.5 py-1.5 hover:bg-[#eff6ff] flex justify-between font-mono text-[11px]">
                    <span className="font-bold text-[#0e5397]">{i.name}</span>
                    <span className="text-[#475569]">{i.ipAddressLanA}</span>
                  </button>
                ))}
              </div>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setDiscoverOpen(false)} className="px-3 py-1.5 rounded border border-[#cbd5e1]">Cancel</button>
                <button type="button" onClick={() => handleDiscoverStoreIed()} className="px-4 py-1.5 rounded bg-[#0e5397] text-white font-bold">Discover</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONTROL */}
      {controlOpen && selectedIed && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-[#0e5397] bg-white text-[#1e293b] shadow-2xl overflow-hidden">
            <div className="bg-[#0e5397] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>Control — {selectedIed.name}/CSWI1.Pos</span>
              <button type="button" onClick={() => setControlOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <select value={ctlModel} onChange={(e) => { setCtlModel(e.target.value as 'SBO' | 'DIRECT'); setSboSelected(false); }} className="rounded border border-[#94a3b8] px-2 py-1.5 font-mono">
                  <option value="SBO">4 — SBOw Enhanced</option>
                  <option value="DIRECT">1 — Direct Normal</option>
                </select>
                <select value={ctlTarget} onChange={(e) => { setCtlTarget(e.target.value as 'OPEN' | 'CLOSED'); setSboSelected(false); }} className="rounded border border-[#94a3b8] px-2 py-1.5 font-mono">
                  <option value="OPEN">FALSE (OPEN)</option>
                  <option value="CLOSED">TRUE (CLOSE)</option>
                </select>
              </div>
              <div className="rounded border border-[#bfdbfe] bg-[#eff6ff] p-2 font-mono text-[11px] text-[#1e3a8a]">{ctlMsg}</div>
              <div className="flex justify-end gap-2">
                {ctlModel === 'SBO' && (
                  <button type="button" onClick={() => { setSboSelected(true); setCtlMsg(`Selected ${ctlTarget}`); }} className="px-3.5 py-1.5 rounded bg-[#0e5397] text-white font-bold">Select</button>
                )}
                <button type="button" disabled={ctlModel === 'SBO' && !sboSelected} onClick={handleOperateControl} className="px-3.5 py-1.5 rounded bg-[#15803d] disabled:opacity-40 text-white font-bold">Operate</button>
                <button type="button" onClick={() => setControlOpen(false)} className="px-3 py-1.5 rounded border border-[#cbd5e1]">Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: WRITE DATA VALUE */}
      {writeOpen && selectedIed && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="iedscout-light-pane w-full max-w-md rounded-lg border border-[#0e5397] bg-white text-[#111827] shadow-2xl overflow-hidden">
            <div className="bg-[#0e5397] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>Write Value (MMS SetDataValues)</span>
              <button type="button" onClick={() => setWriteOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <div className="font-mono text-[11px] text-[#0e5397] break-all">{writeRef}</div>
              <label className="block space-y-1">
                <span className="font-semibold">New Value</span>
                <input
                  value={writeVal}
                  onChange={(e) => setWriteVal(e.target.value)}
                  className="iedscout-light-select w-full rounded border px-2.5 py-1.5 font-mono"
                />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setWriteOpen(false)} className="px-3 py-1.5 rounded border border-[#cbd5e1]">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    if (selectedLn && selectedLn.dos[0]) {
                      const k = `${selectedIed.id}/${selectedLn.ldInst}/${selectedLn.name}.${selectedLn.dos[0].name}`;
                      setLiveOverrides((p) => ({ ...p, [k]: writeVal }));
                    }
                    addStatus(`SetDataValues ${writeRef} = ${writeVal} (OK)`);
                    setWriteOpen(false);
                  }}
                  className="px-4 py-1.5 rounded bg-[#0e5397] text-white font-bold"
                >
                  Write
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD DATASET */}
      {addDsOpen && selectedIed && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="iedscout-light-pane w-full max-w-md rounded-lg border border-[#0e5397] bg-white text-[#111827] shadow-2xl overflow-hidden">
            <div className="bg-[#0e5397] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>Add Dynamic DataSet — {selectedIed.name}</span>
              <button type="button" onClick={() => setAddDsOpen(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-3 text-xs">
              <label className="block space-y-1">
                <span className="font-semibold">DataSet Name</span>
                <input value={newDsName} onChange={(e) => setNewDsName(e.target.value)} className="iedscout-light-select w-full rounded border px-2.5 py-1.5 font-mono" />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold">Initial FCDA Member</span>
                <input value={newDsFcda} onChange={(e) => setNewDsFcda(e.target.value)} className="iedscout-light-select w-full rounded border px-2.5 py-1.5 font-mono" />
              </label>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setAddDsOpen(false)} className="px-3 py-1.5 rounded border border-[#cbd5e1]">Cancel</button>
                <button
                  type="button"
                  onClick={() => {
                    const ld = selectedIed.lds[0] || 'LD0';
                    setLoadedIeds((prev) =>
                      prev.map((ied) =>
                        ied.id !== selectedIed.id
                          ? ied
                          : {
                              ...ied,
                              datasets: [
                                ...ied.datasets,
                                { ldInst: ld, lnName: 'LLN0', name: newDsName.trim() || 'CustomDS', desc: 'Created in IEDScout', fcdas: [newDsFcda] },
                              ],
                            }
                      )
                    );
                    addStatus(`Created DataSet ${selectedIed.name}${ld}/LLN0.${newDsName}`);
                    setAddDsOpen(false);
                  }}
                  className="px-4 py-1.5 rounded bg-[#0e5397] text-white font-bold"
                >
                  Create DataSet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SAVE SCL (EXACT OMICRON IEDSCOUT 4.20 DIALOG + ICD TO CID CONVERSION) */}
      {saveSclOpen && selectedIed && (
        <div className="fixed inset-0 z-50 bg-black/45 flex items-center justify-center p-4">
          <div className="iedscout-light-pane w-full max-w-[430px] rounded-sm border-2 border-[#0e5397] bg-white text-[#1f2937] shadow-2xl overflow-hidden font-sans">
            {/* OMICRON Blue Title Bar */}
            <div className="bg-[#0e5397] text-white px-3 py-2 flex items-center justify-between text-[13px] font-normal">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center rounded-[2px] bg-[#f6df00] text-[#0b4d90] font-black text-[9px]">
                  IS
                </span>
                <span>Save SCL</span>
              </div>
              <button type="button" onClick={() => setSaveSclOpen(false)} className="hover:text-[#f6df00]">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Dialog Body */}
            <div className="p-4 space-y-3 text-[12.5px] bg-white">
              <div className="grid grid-cols-[105px_minmax(0,1fr)] items-center gap-y-2.5 gap-x-2">
                <span className="text-[#374151]">IED:</span>
                <input
                  value={saveSclIedName}
                  onChange={(e) => setSaveSclIedName(e.target.value)}
                  className="iedscout-light-select w-full rounded-[2px] border px-2 py-1 text-[12.5px] font-mono"
                />

                <span className="text-[#374151]">Version:</span>
                <select
                  aria-label="SCL Schema Version"
                  value={saveSclVersion}
                  onChange={(e) => setSaveSclVersion(e.target.value as SclSchemaVersion)}
                  className="iedscout-light-select w-full rounded-[2px] border px-2 py-1 text-[12.5px]"
                >
                  {(Object.keys(SCL_SCHEMA_META) as SclSchemaVersion[]).map((k) => (
                    <option key={k} value={k}>
                      {SCL_SCHEMA_META[k].label}
                    </option>
                  ))}
                </select>

                <span className="text-[#374151]">Convert / Type:</span>
                <select
                  aria-label="SCL Output File Type"
                  value={saveSclFormat}
                  onChange={(e) => setSaveSclFormat(e.target.value as SclExportFormat)}
                  className="iedscout-light-select w-full rounded-[2px] border px-2 py-1 text-[12.5px]"
                >
                  <option value="cid">.cid — Configured IED Description (ICD → CID)</option>
                  <option value="icd">.icd — IED Capability Description</option>
                  <option value="iid">.iid — Instantiated IED Description</option>
                  <option value="scd">.scd — Substation Configuration Description</option>
                </select>

              </div>
            </div>

            {/* OMICRON Light Gray Footer Bar with Save / Cancel */}
            <div className="bg-[#f0f3f7] border-t border-[#cbd5e1] px-4 py-2.5 flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  const cleanName = (saveSclIedName || selectedIed.name).trim().replace(/[^a-zA-Z0-9._-]/g, '_') || 'IED';
                  const xmlOut = convertAndBuildSclXml(
                    selectedIed,
                    saveSclVersion,
                    saveSclFormat,
                    cleanName,
                    selectedIed.ip && selectedIed.ip !== '0.0.0.0' ? selectedIed.ip : '192.168.1.10'
                  );
                  const outFileName = `${cleanName}.${saveSclFormat}`;
                  const blob = new Blob([xmlOut], { type: 'application/xml;charset=utf-8' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = outFileName;
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  setTimeout(() => URL.revokeObjectURL(url), 1200);
                  addStatus(
                    `Saved ${outFileName} (${SCL_SCHEMA_META[saveSclVersion].label}) to Downloads.`
                  );
                  setSaveSclOpen(false);
                }}
                className="min-w-[96px] px-4 py-1.5 rounded-[2px] bg-[#1e73be] hover:bg-[#155a96] text-white font-semibold text-[12px] shadow-sm"
              >
                Save
              </button>
              <button
                type="button"
                onClick={() => setSaveSclOpen(false)}
                className="min-w-[96px] px-4 py-1.5 rounded-[2px] bg-white hover:bg-[#e5e9ef] border border-[#b6c2cf] text-[#1f2937] font-semibold text-[12px]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROPERTIES / CONFIG */}
      {(propsOpen || configOpen) && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-lg border border-[#0e5397] bg-white text-[#1e293b] shadow-2xl overflow-hidden">
            <div className="bg-[#0e5397] text-white px-4 py-2.5 flex items-center justify-between font-bold text-xs">
              <span>{configOpen ? 'IEDScout Configuration' : `IED Properties — ${selectedIed?.name || ''}`}</span>
              <button type="button" onClick={() => { setPropsOpen(false); setConfigOpen(false); }}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-4 space-y-2 text-xs font-mono">
              {configOpen ? (
                <div>IEC 61850 Edition 2.1 · MMS TCP Port 102 · Client Mode</div>
              ) : selectedIed ? (
                <>
                  <div>IED Name: {selectedIed.name}</div>
                  <div>Manufacturer: {selectedIed.manufacturer || '—'}</div>
                  <div>Type: {selectedIed.type || '—'}</div>
                  <div>IP Address: {selectedIed.ip}</div>
                  <div>SCL Path: {selectedIed.sclPath}</div>
                  <div>LDs: {selectedIed.lds.join(', ')}</div>
                </>
              ) : null}
              <div className="flex justify-end pt-2">
                <button type="button" onClick={() => { setPropsOpen(false); setConfigOpen(false); }} className="px-4 py-1.5 rounded bg-[#0e5397] text-white font-bold font-sans">OK</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
